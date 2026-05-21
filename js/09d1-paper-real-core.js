// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09d1-paper-real-core.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// PaperReal — protection TP/SL ATR, refus contextuel, limite corrélation,
// combine multi-mode stats, P&L par période, stress bear, enrich close.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION PaperReal Engine
// Fonctions pour le mode paperReal (prix réels Binance, argent fictif).
// Protection TP/SL, refus contextuel, limite corrélation, transfer learning,
// prévision volatilité GARCH, allocation Sharpe, détection stress bear.
// ════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
// Application TP/SL automatique aux positions paperReal
// Utilise l'ATR si disponible (méthode pro), sinon fallback en %
// ──────────────────────────────────────────────────────────────────────
function _applyPaperRealProtection() {
  if (S.tradingMode !== 'paperReal' || !S.openPositions) return;
  const cfg = S.paperRealConfig || {};

  S.openPositions.forEach(pos => {
    if (!pos.auto || !pos._paperRealMode) return;
    if (!isFinite(pos.entryPrice) || pos.entryPrice <= 0) return;

    const isLong = pos.side === 'long';
    let slPrice  = null;

    // Récupération des paramètres A/B si applicable
    let slMult = cfg.slAtrMultiplier || 2.0;
    let tpMult = cfg.tpAtrMultiplier || 1.5;
    if (pos._abArm && typeof _abGetParams === 'function') {
      const abParams = _abGetParams(pos._abArm);
      if (abParams) {
        slMult = abParams.slAtrMult || slMult;
        tpMult = abParams.tpAtrMult || tpMult;
      }
    }

    // Méthode prioritaire : ATR (volatilité adaptative)
    if (pos.pair && typeof _getPairAdaptiveProfile === 'function') {
      const profile = _getPairAdaptiveProfile(pos.pair);
      if (profile && profile.slAbsoluteAtr && isFinite(profile.slAbsoluteAtr) && profile.slAbsoluteAtr > 0) {
        const slDistance = slMult * profile.slAbsoluteAtr;
        const tpDistance = tpMult * profile.slAbsoluteAtr;
        slPrice = isLong ? pos.entryPrice - slDistance : pos.entryPrice + slDistance;
        const tpPriceAtr = isLong ? pos.entryPrice + tpDistance : pos.entryPrice - tpDistance;

        pos._volScore = profile.score;
        pos._relRatio = profile.relRatio;
        pos._perfMult = profile.perfMult;
        pos._slMethod = 'ATR×' + slMult.toFixed(2) + (pos._abArm ? ' [' + pos._abArm + ']' : '');

        if (pos.sl == null) pos.sl = slPrice;
        if (pos.tp == null) pos.tp = tpPriceAtr;

        if (slPrice != null) {
          if (!S.adaptiveState) S.adaptiveState = {};
          S.adaptiveState.lastSlUsed = pos._slMethod;
        }
        return;
      }
    }

    // Fallback : SL/TP en pourcentage
    const slPct = cfg.stopLossPct   || 3.0;
    const tpPct = cfg.takeProfitPct || 2.0;
    slPrice = isLong ? pos.entryPrice * (1 - slPct/100) : pos.entryPrice * (1 + slPct/100);
    const tpPriceFb = isLong ? pos.entryPrice * (1 + tpPct/100) : pos.entryPrice * (1 - tpPct/100);
    pos._slMethod = 'pct ' + slPct + '%';

    if (pos.sl == null) pos.sl = slPrice;
    if (pos.tp == null) pos.tp = tpPriceFb;

    if (slPrice != null) {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastSlUsed = pos._slMethod || '?';
    }
  });
}
window._applyPaperRealProtection = _applyPaperRealProtection;


// ──────────────────────────────────────────────────────────────────────
// Refus contextuel : bloque les trades dans les contextes (régime × heure ×
// volatilité de la paire) historiquement perdants au-delà d'un seuil
// ──────────────────────────────────────────────────────────────────────
function _checkContextAllowance(pair, side) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.contextRefusalEnabled) return { allow: true };
  if (S.tradingMode !== 'paperReal')  return { allow: true };

  const regime = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : 'calm';
  const hour   = new Date().getHours();
  let pairTier = 'unknown';

  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile && profile.relRatio !== null) {
      const ratio = profile.relRatio;
      if      (ratio < 0.7) pairTier = 'calm';
      else if (ratio < 1.4) pairTier = 'mid';
      else                  pairTier = 'volatile';
    }
  }

  const sig   = _getContextSignature(regime, hour, pairTier);
  const stats = _getContextStats(sig);

  if (stats.refused) {
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.lastContextRefusalCount  = (S.adaptiveState.lastContextRefusalCount || 0) + 1;
    S.adaptiveState.lastContextRefusalReason = sig + ' (' + Math.round(stats.wr * 100) + '% sur ' + stats.trades + ')';
    return {
      allow:     false,
      reason:    'Contexte ' + sig + ' historique : ' + Math.round(stats.wr * 100) + '% WR sur ' + stats.trades + ' trades',
      stats:     stats,
      signature: sig
    };
  }
  return { allow: true, signature: sig, stats: stats };
}
window._checkContextAllowance = _checkContextAllowance;


// ──────────────────────────────────────────────────────────────────────
// Limite de corrélation : décime la mise si une position corrélée est
// déjà ouverte (évite le cumul de risque sur des paires qui bougent ensemble)
// ──────────────────────────────────────────────────────────────────────
function _checkCorrelationLimit(pair, side) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.correlationLimitEnabled) return { allow: true, decimate: 1.0 };
  if (!S.openPositions || S.openPositions.length === 0) return { allow: true, decimate: 1.0 };

  const threshold      = cfg.correlationThreshold      || 0.7;
  const decimateFactor = cfg.correlationDecimateFactor || 0.5;

  for (const openPos of S.openPositions) {
    if (!openPos.auto || !openPos.pair) continue;
    if (openPos.pair === pair) continue;

    const corr = _getPairCorrelation(pair, openPos.pair);
    if (corr === null) continue;

    const sameDirection = openPos.side === side;

    // Même direction + forte corrélation positive → cumul de risque
    if (sameDirection && corr > threshold) {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastCorrelationDecision = {
        pair:           pair,
        correlatedWith: openPos.pair,
        value:          corr,
        action:         'decimate',
        ts:             Date.now()
      };
      S.adaptiveState.correlationLimitActions = (S.adaptiveState.correlationLimitActions || 0) + 1;
      return {
        allow:          true,
        decimate:       decimateFactor,
        correlatedWith: openPos.pair,
        value:          corr
      };
    }

    // Direction opposée + forte corrélation négative → aussi cumul (anti-corrélation = mouvements inversés)
    if (!sameDirection && corr < -threshold) {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastCorrelationDecision = {
        pair:           pair,
        correlatedWith: openPos.pair,
        value:          corr,
        action:         'decimate',
        ts:             Date.now()
      };
      S.adaptiveState.correlationLimitActions = (S.adaptiveState.correlationLimitActions || 0) + 1;
      return {
        allow:          true,
        decimate:       decimateFactor,
        correlatedWith: openPos.pair,
        value:          corr
      };
    }
  }

  return { allow: true, decimate: 1.0 };
}
window._checkCorrelationLimit = _checkCorrelationLimit;


// ──────────────────────────────────────────────────────────────────────
// Combinaison pondérée des stats multi-modes (transfer learning)
// ──────────────────────────────────────────────────────────────────────
function _combineMultiModeStats(stats) {
  const currentMode = S.tradingMode || 'sim';
  let totalWeightedWins   = 0;
  let totalWeightedLosses = 0;
  let totalRawTrades      = 0;
  let sourcesUsed         = 0;

  Object.keys(stats).forEach(mode => {
    const s      = stats[mode] || {};
    const wins   = s.wins   || 0;
    const losses = s.losses || 0;
    if (wins + losses === 0) return;

    const weight = _getMemorySourceWeight(mode, currentMode);
    if (weight === 0) return;

    totalWeightedWins   += wins   * weight;
    totalWeightedLosses += losses * weight;
    totalRawTrades      += wins + losses;
    sourcesUsed++;
  });

  const totalWeighted = totalWeightedWins + totalWeightedLosses;
  return {
    wr:             totalWeighted > 0 ? totalWeightedWins / totalWeighted : null,
    weightedTrades: totalWeighted,
    rawTrades:      totalRawTrades,
    sourcesUsed:    sourcesUsed
  };
}
window._combineMultiModeStats = _combineMultiModeStats;


// ──────────────────────────────────────────────────────────────────────
// Calcul du P&L par période (today, week, month)
// ──────────────────────────────────────────────────────────────────────
function _computePnlByPeriod() {
  _checkAndRotatePeriods();
  const current = S.portfolio || 0;
  const period  = S.pnlPeriod || {};

  function compute(startVal) {
    if (startVal === null || startVal === undefined || startVal <= 0) {
      return { usd: 0, pct: 0, hasData: false };
    }
    const usd = current - startVal;
    const pct = (usd / startVal) * 100;
    return { usd: usd, pct: pct, hasData: true };
  }

  return {
    today: compute(period.todayStartPortfolio),
    week:  compute(period.weekStartPortfolio),
    month: compute(period.monthStartPortfolio)
  };
}
window._computePnlByPeriod = _computePnlByPeriod;


// ──────────────────────────────────────────────────────────────────────
// Détection de stress bear systémique (streak de cycles bear consécutifs)
// ──────────────────────────────────────────────────────────────────────
function _detectSystemicBearStress() {
  const regime = S._paperRealCurrentRegime
              || (typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm');
  const isBear = regime === 'bear' || regime === 'volatile_bear';

  if (isBear) {
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.bearStreak = (S.adaptiveState.bearStreak || 0) + 1;
  } else {
    if (S.adaptiveState) S.adaptiveState.bearStreak = 0;
  }

  return {
    isBear: isBear,
    regime: regime,
    streak: (S.adaptiveState || {}).bearStreak || 0
  };
}
window._detectSystemicBearStress = _detectSystemicBearStress;


// ──────────────────────────────────────────────────────────────────────
// Enrichissement d'un contexte de trade au moment du close (pour mémoire)
// ──────────────────────────────────────────────────────────────────────
function _enrichTradeContextOnClose(contextId, pnlPct, pnlUsd, holdMs) {
  if (!contextId || !S.tradeContextMemory) return;

  // Parcours arrière car le plus récent est en fin
  for (let i = S.tradeContextMemory.length - 1; i >= 0; i--) {
    if (S.tradeContextMemory[i].contextId === contextId) {
      S.tradeContextMemory[i].closedAt     = Date.now();
      S.tradeContextMemory[i].pnlPct       = +pnlPct.toFixed(3);
      S.tradeContextMemory[i].pnlUsd       = +pnlUsd.toFixed(3);
      S.tradeContextMemory[i].holdMinutes  = Math.round(holdMs / 60000);
      S.tradeContextMemory[i].won          = pnlPct >= 0;
      return;
    }
  }
}
window._enrichTradeContextOnClose = _enrichTradeContextOnClose;


// ──────────────────────────────────────────────────────────────────────
// Recherche de la paire la plus volatile (pour hedging notamment)
// ──────────────────────────────────────────────────────────────────────
function _findMostVolatilePair() {
  if (typeof _getActiveRealPairs !== 'function') return null;

  const activePairs = _getActiveRealPairs();
  if (!activePairs || activePairs.length === 0) return null;

  let maxVol = -Infinity;
  let chosen = null;

  activePairs.forEach(p => {
    if (typeof _computeVolatilityScore === 'function') {
      const vol = _computeVolatilityScore(p);
      if (vol && vol.score > maxVol) {
        maxVol = vol.score;
        chosen = p;
      }
    }
  });

  return chosen;
}
window._findMostVolatilePair = _findMostVolatilePair;


