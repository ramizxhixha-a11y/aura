// ════════════════════════════════════════════════════════════
// AURA8 · MODULE RESTAURATION + PERSISTANCE
// ════════════════════════════════════════════════════════════
// Ce module contient :
//   • Auto-save 5s + 4 hooks (pagehide, freeze, beforeunload, visibilitychange)
//   • Snapshot builder (buildSnapshot) + load/save/import/export
//   • Boucle de jeu (startSim/stopSim/simTick)
//   • Bricks UI (action / man / pair) — rendu + update + sparklines
//   • Garde-fous (plein régime stop d'urgence, watchdog manuel)
//   • Diagnostic modal + snapshots internes + "pourquoi cette position ?"
//   • Init + démarrage de l'application
// ════════════════════════════════════════════════════════════
// Règle architecture : ce fichier est la couche RESTAURATION & SESSION.
//   - dépend de S, PAIRS, et des fonctions du module 10 (moteur trading)
//   - intégration v11-persistance : ce qui était dans /js/11-persistance.js
//     est désormais en tête de ce fichier (IIFE).
// ════════════════════════════════════════════════════════════


// ────────────────────────────────────────────────────────────
// PERSISTANCE AUTOMATIQUE
// Auto-save toutes les 5s + 4 hooks de sortie d'application.
// Conditions : S existe, fonction saveState disponible, pas de reset en cours.
// ────────────────────────────────────────────────────────────
(function persistanceInit() {
  'use strict';

  let _autosaveTimer = null;

  function _canSave() {
    return typeof S !== 'undefined'
        && typeof saveState === 'function'
        && !window._resetInProgress
        && sessionStorage.getItem('nexus_factory_reset') !== '1';
  }

  function _doSave() {
    if (!_canSave()) return;
    try { saveState(true); } catch(e) { /* silencieux */ }
  }

  // Autosave périodique (5s)
  _autosaveTimer = setInterval(_doSave, 5000);

  // Hooks de sortie — ces 4 événements couvrent toutes les sorties mobile/desktop
  window.addEventListener('pagehide',         _doSave);
  window.addEventListener('beforeunload',     _doSave);
  document.addEventListener('freeze',         _doSave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _doSave();
  });

  // Expose pour debug
  window._auraPersistance = { save: _doSave };
})();


// ────────────────────────────────────────────────────────────
// VARIABLES MODULE-LEVEL
// ────────────────────────────────────────────────────────────
const BARS_KEY      = 'nexus_bars_state';   // 'auto' | 'man' | 'param' | 'closed'
const DB_NAME       = 'NEXUS_DB';
const LONG_PRESS_MS = 600;
const SAVE_KEY      = 'nexus_state_v2';     // localStorage fallback key
const STORE_FEES    = 'fees';
const STORE_STATE   = 'state';              // snapshot complet pour reprise

let _freshPricesInRow    = 0;            // compteur pour reprise après retour réseau
let _lastRealPriceTs     = Date.now();   // dernier tick prix RÉEL reçu (CG ou Binance)
let _longPressPair       = null;
let _longPressTimer      = null;
let _net10sSaveTriggered = false;        // pour trigger save une fois à 10s offline
let _netOfflineSinceTs   = 0;            // moment du début de la coupure
let _netwatchPausedBot   = false;        // true si on a pausé le bot nous-mêmes
let _netwatchState       = 'online';     // 'online' | 'offline' | 'recovering'
let _simEverStarted      = false;        // vrai après le 1er startSim() — pour libellé header
let _simInterval         = null;
let _simRunning          = false;


// ════════════════════════════════════════════════════════════
// FONCTIONS — A/B testing & apprentissage par contexte
// ════════════════════════════════════════════════════════════

function _abRecordResult(arm, pnlPct, pnlUsd) {
  if (!S.abTesting) return;
  const target = (arm === 'B') ? S.abTesting.armB : S.abTesting.armA;
  if (!target) return;
  target.trades = (target.trades || 0) + 1;
  target.pnl    = (target.pnl    || 0) + pnlUsd;
  if (pnlPct >= 0) target.wins   = (target.wins   || 0) + 1;
  else             target.losses = (target.losses || 0) + 1;

  // Verdict automatique quand les 2 bras ont atteint le seuil
  const threshold = (S.paperRealConfig || {}).abTestingTradesPerArm || 50;
  if (S.abTesting.armA.trades >= threshold && S.abTesting.armB.trades >= threshold) {
    _abComputeVerdict();
  }
}
window._abRecordResult = _abRecordResult;


function _applyPaperRealProtection() {
  if (S.tradingMode !== 'paperReal' || !S.openPositions) return;
  const cfg = S.paperRealConfig || {};

  S.openPositions.forEach(pos => {
    if (!pos.auto || !pos._paperRealMode) return;
    if (!isFinite(pos.entryPrice) || pos.entryPrice <= 0) return;

    const isLong = pos.side === 'long';
    let slPrice = null;

    // Paramètres A/B si applicable
    let slMult = cfg.slAtrMultiplier || 2.0;
    let tpMult = cfg.tpAtrMultiplier || 1.5;
    if (pos._abArm && typeof _abGetParams === 'function') {
      const abParams = _abGetParams(pos._abArm);
      if (abParams) {
        slMult = abParams.slAtrMult || slMult;
        tpMult = abParams.tpAtrMult || tpMult;
      }
    }

    // Méthode pro universelle : SL/TP basés sur l'ATR
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

    // Fallback : SL/TP en %
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


function _attachLongPressToBricks() {
  document.querySelectorAll('.action-brick, .pair-brick').forEach(brick => {
    if (brick.dataset.lpAttached === '1') return;
    brick.dataset.lpAttached = '1';

    const pair = brick.getAttribute('data-pair');
    if (!pair) return;

    const startFn = () => {
      const pos = (S.openPositions || []).find(p => p.pair === pair);
      if (!pos) return;
      _longPressPair = pair;
      _longPressTimer = setTimeout(() => {
        _showForceCloseConfirm(pair);
        _longPressTimer = null;
      }, LONG_PRESS_MS);
    };

    const cancelFn = () => {
      if (_longPressTimer) {
        clearTimeout(_longPressTimer);
        _longPressTimer = null;
      }
    };

    brick.addEventListener('touchstart',  startFn, { passive: true });
    brick.addEventListener('touchend',    cancelFn);
    brick.addEventListener('touchmove',   cancelFn);
    brick.addEventListener('touchcancel', cancelFn);
    brick.addEventListener('mousedown',   startFn);
    brick.addEventListener('mouseup',     cancelFn);
    brick.addEventListener('mouseleave',  cancelFn);
    brick.addEventListener('click', (e) => {
      if (_longPressTimer === null && _longPressPair === pair) {
        _longPressPair = null;
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  });
}
window._attachLongPressToBricks = _attachLongPressToBricks;


window._autoSnapshotBeforeLeverage = function() { _maybeCreateAutoSnapshot('leverage'); };
window._autoSnapshotOnTradeClose   = function() { _maybeCreateAutoSnapshot('trade_close'); };


function _checkContextAllowance(pair, side) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.contextRefusalEnabled)   return { allow: true };
  if (S.tradingMode !== 'paperReal') return { allow: true };

  const regime = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : 'calm';
  const hour = new Date().getHours();
  let pairTier = 'unknown';
  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile && profile.relRatio !== null) {
      const ratio = profile.relRatio;
      if (ratio < 0.7)      pairTier = 'calm';
      else if (ratio < 1.4) pairTier = 'mid';
      else                  pairTier = 'volatile';
    }
  }
  const sig   = _getContextSignature(regime, hour, pairTier);
  const stats = _getContextStats(sig);

  if (stats.refused) {
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.lastContextRefusalCount = (S.adaptiveState.lastContextRefusalCount || 0) + 1;
    S.adaptiveState.lastContextRefusalReason = sig + ' (' + Math.round(stats.wr * 100) + '% sur ' + stats.trades + ')';
    return {
      allow: false,
      reason: 'Contexte ' + sig + ' historique : ' + Math.round(stats.wr * 100) + '% WR sur ' + stats.trades + ' trades',
      stats: stats,
      signature: sig
    };
  }
  return { allow: true, signature: sig, stats: stats };
}
window._checkContextAllowance = _checkContextAllowance;


function _checkCorrelationLimit(pair, side) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.correlationLimitEnabled) return { allow: true, decimate: 1.0 };
  if (!S.openPositions || S.openPositions.length === 0) return { allow: true, decimate: 1.0 };

  const threshold      = cfg.correlationThreshold      || 0.7;
  const decimateFactor = cfg.correlationDecimateFactor || 0.5;

  for (const openPos of S.openPositions) {
    if (!openPos.auto || !openPos.pair) continue;
    if (openPos.pair === pair)         continue;

    const corr = _getPairCorrelation(pair, openPos.pair);
    if (corr === null) continue;

    const sameDirection = openPos.side === side;
    // Même direction + corrélation positive forte = cumul de risque
    if (sameDirection && corr > threshold) {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastCorrelationDecision = {
        pair, correlatedWith: openPos.pair, value: corr, action: 'decimate', ts: Date.now()
      };
      S.adaptiveState.correlationLimitActions = (S.adaptiveState.correlationLimitActions || 0) + 1;
      return { allow: true, decimate: decimateFactor, correlatedWith: openPos.pair, value: corr };
    }

    // Direction opposée + corrélation négative forte = aussi cumul
    if (!sameDirection && corr < -threshold) {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastCorrelationDecision = {
        pair, correlatedWith: openPos.pair, value: corr, action: 'decimate', ts: Date.now()
      };
      S.adaptiveState.correlationLimitActions = (S.adaptiveState.correlationLimitActions || 0) + 1;
      return { allow: true, decimate: decimateFactor, correlatedWith: openPos.pair, value: corr };
    }
  }

  return { allow: true, decimate: 1.0 };
}
window._checkCorrelationLimit = _checkCorrelationLimit;


function _combineMultiModeStats(stats) {
  const currentMode = S.tradingMode || 'sim';
  let totalWeightedWins = 0;
  let totalWeightedLosses = 0;
  let totalRawTrades = 0;
  let sourcesUsed = 0;

  Object.keys(stats).forEach(mode => {
    const s = stats[mode] || {};
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
    wr: totalWeighted > 0 ? totalWeightedWins / totalWeighted : null,
    weightedTrades: totalWeighted,
    rawTrades: totalRawTrades,
    sourcesUsed
  };
}
window._combineMultiModeStats = _combineMultiModeStats;


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
    return { usd, pct, hasData: true };
  }

  return {
    today: compute(period.todayStartPortfolio),
    week:  compute(period.weekStartPortfolio),
    month: compute(period.monthStartPortfolio)
  };
}
window._computePnlByPeriod = _computePnlByPeriod;


function _detectSystemicBearStress() {
  const regime = S._paperRealCurrentRegime
              || (typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm');
  const isBear = regime === 'bear' || regime === 'volatile_bear';

  if (isBear) {
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.bearStreak = (S.adaptiveState.bearStreak || 0) + 1;
  } else if (S.adaptiveState) {
    S.adaptiveState.bearStreak = 0;
  }

  return {
    isBear,
    regime,
    streak: (S.adaptiveState || {}).bearStreak || 0
  };
}
window._detectSystemicBearStress = _detectSystemicBearStress;


function _enrichTradeContextOnClose(contextId, pnlPct, pnlUsd, holdMs) {
  if (!contextId || !S.tradeContextMemory) return;
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


function _evaluatePairPerformance() {
  if (!S._pausedPairs)        S._pausedPairs = {};
  if (!S._pairLastEvalCount)  S._pairLastEvalCount = {};

  Object.keys(PAIRS).forEach(pair => {
    const ps = S.pairStates[pair];
    if (!ps) return;

    const closedTrades  = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
    const count         = closedTrades.length;
    const lastEvalCount = S._pairLastEvalCount[pair] || 0;

    // Évaluation tous les 50 trades clôturés
    if (count >= lastEvalCount + 50) {
      const recent  = closedTrades.slice(-50);
      const wins    = recent.filter(t => t.pnlUsdt > 0).length;
      const winRate = wins / recent.length * 100;

      if (winRate < 40 && !S._pausedPairs[pair]) {
        S._pausedPairs[pair] = { pausedAt: Date.now(), winRateAtPause: winRate };
        S.chainLog.push({
          icon: '⏸',
          desc: `Paire ${pair} désactivée · win rate ${winRate.toFixed(1)}% sur 50 derniers trades (seuil 40%)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        if (typeof showToast === 'function') {
          showToast(`⏸ ${pair} mise en pause (win rate ${winRate.toFixed(0)}%)`, 3500, 'warn');
        }
      } else if (winRate >= 50 && S._pausedPairs[pair]) {
        delete S._pausedPairs[pair];
        S.chainLog.push({
          icon: '▶',
          desc: `Paire ${pair} réactivée · win rate remonté à ${winRate.toFixed(1)}%`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }

      S._pairLastEvalCount[pair] = count;
    }
  });
}
window._evaluatePairPerformance = _evaluatePairPerformance;


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


function _forecastVolatility(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;

  // Récupère les bougies (priorité Binance WS)
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 20) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 20) {
    candles = ps.candles;
  }
  if (!candles || candles.length < 20) return null;

  // Rendements log des 20 dernières bougies
  const closes = candles.slice(-20).map(c => c.c).filter(c => isFinite(c) && c > 0);
  if (closes.length < 20) return null;

  const returns = [];
  for (let i = 1; i < closes.length; i++) returns.push(Math.log(closes[i] / closes[i-1]));

  // Variance long terme et récente
  const meanReturn  = returns.reduce((a,b) => a+b, 0) / returns.length;
  const longTermVar = returns.reduce((a,b) => a + (b - meanReturn) ** 2, 0) / returns.length;

  const recentReturns = returns.slice(-5);
  const recentMean    = recentReturns.reduce((a,b) => a+b, 0) / recentReturns.length;
  const recentVar     = recentReturns.reduce((a,b) => a + (b - recentMean) ** 2, 0) / recentReturns.length;

  // GARCH(1,1) simplifié : forecast = omega + alpha·last² + beta·recentVar
  const omega        = 0.1 * longTermVar;
  const lastReturnSq = returns[returns.length - 1] ** 2;
  const forecastVar  = omega + 0.1 * lastReturnSq + 0.85 * recentVar;
  const forecastVol  = Math.sqrt(forecastVar);
  const longTermVol  = Math.sqrt(longTermVar);
  const ratio        = longTermVol > 0 ? forecastVol / longTermVol : 1.0;

  return {
    longTermVolPct: +(longTermVol * 100).toFixed(3),
    forecastVolPct: +(forecastVol * 100).toFixed(3),
    ratio: +ratio.toFixed(2),
    isSpike: ratio > (S.paperRealConfig?.volatilitySpikeMultiplier || 1.8)
  };
}
window._forecastVolatility = _forecastVolatility;


// ════════════════════════════════════════════════════════════
// GARDE-FOU "PLEIN RÉGIME" — Stop d'urgence à −5% du capital initial
// ════════════════════════════════════════════════════════════
function _fpEmergencyCheck() {
  if (!S.fullPowerMode || !S._fpInitialCapital || S._fpStopTriggered) return;
  const curCap      = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  const latentPnl   = (S.openPositions || []).reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const effectiveCap = curCap + latentPnl;
  const drawdown    = (S._fpInitialCapital - effectiveCap) / S._fpInitialCapital;

  if (drawdown >= 0.05) {  // −5% → STOP D'URGENCE
    S._fpStopTriggered = true;

    // 1. Désactive Plein régime
    if (typeof disableFullPowerMode === 'function') disableFullPowerMode();
    const fpBtn = document.getElementById('fpBtn');
    if (fpBtn) {
      fpBtn.classList.remove('active');
      const span = fpBtn.querySelector('span:last-child');
      if (span) span.textContent = 'Plein régime';
    }

    // 2. Ferme toutes les positions ouvertes
    const positionsToClose = [...(S.openPositions || [])];
    positionsToClose.forEach(pos => {
      try {
        if (typeof closePosition === 'function') closePosition(pos.id, true);
      } catch(e) { console.warn('FP emergency close:', e); }
    });

    // 3. Log + toast
    S.chainLog.push({
      icon: '🚨',
      desc: `STOP D'URGENCE · Plein régime désactivé · drawdown ${(drawdown*100).toFixed(1)}% · ${positionsToClose.length} position(s) fermée(s)`,
      hash: rndHash(), time: nowStr()
    });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);

    if (typeof showToast === 'function') {
      showToast('🚨 STOP URGENCE · −' + (drawdown*100).toFixed(1) + '% · Plein régime OFF + ' + positionsToClose.length + ' position(s) fermée(s)', 5000, 'critical');
    }

    // Reset snapshot pour réactivation manuelle propre
    S._fpInitialCapital = null;
  }
}
window._fpEmergencyCheck = _fpEmergencyCheck;


// ════════════════════════════════════════════════════════════
// SEUILS ADAPTATIFS — Apprentissage par contexte
// ════════════════════════════════════════════════════════════
function _getAdaptiveConsecLossThreshold() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.adaptiveStopLosses) return cfg.maxConsecLosses || 3;
  const wr = _getEffectiveWR();
  if (wr === null) return cfg.maxConsecLosses || 3;

  // Formule : seuil = 3 + (1 − wr) × 6, borné [3, 6]
  let thresh = Math.round(3 + (1 - wr) * 6);
  thresh = Math.max(3, Math.min(6, thresh));

  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastConsecLossThresh = thresh;
  S.adaptiveState.lastEffectiveWR = wr;
  return thresh;
}
window._getAdaptiveConsecLossThreshold = _getAdaptiveConsecLossThreshold;


function _getContextSignature(regime, hour, pairTier) {
  return (regime || 'unknown') + '·' + _getHourBucket(hour || 0) + '·' + (pairTier || 'unknown');
}
window._getContextSignature = _getContextSignature;


function _getContextStats(signature) {
  if (!S.tradeContextMemory) return { wr: null, trades: 0, refused: false };
  let wins = 0, losses = 0;
  for (const c of S.tradeContextMemory) {
    if (c.closedAt === null) continue;
    const sig = _getContextSignature(c.regime, c.hour, _getPairTierFromContext(c));
    if (sig !== signature) continue;
    if (c.won) wins++; else losses++;
  }
  const total = wins + losses;
  if (total === 0) return { wr: null, trades: 0, refused: false };
  const wr = wins / total;
  const cfg = S.paperRealConfig || {};
  const minTrades = cfg.contextRefusalMinTrades || 20;
  const maxWR     = cfg.contextRefusalMaxWR     || 0.30;
  return { wr, trades: total, refused: total >= minTrades && wr < maxWR };
}
window._getContextStats = _getContextStats;


function _getMemorySourceWeight(memoryMode, currentMode) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.transferLearningEnabled) {
    return memoryMode === currentMode ? 1.0 : 0.0;
  }
  if (memoryMode === currentMode) return 1.0;

  // Une mémoire d'un mode "moins fiable" que le courant est dévaluée
  const weights = { real: cfg.transferWeightReal || 1.0 };
  const memReliability = weights[memoryMode] || 0.5;
  const curReliability = weights[currentMode] || 0.5;

  return memReliability >= curReliability ? 1.0 : memReliability / curReliability;
}
window._getMemorySourceWeight = _getMemorySourceWeight;


function _getMultiModeMemoryStats() {
  const stats = { real: { wins: 0, losses: 0 } };

  if (Array.isArray(S.agentLessons)) {
    S.agentLessons.forEach(l => {
      if (l && typeof l.outcome === 'number') {
        if (l.outcome > 0)      stats.sim.wins++;
        else if (l.outcome < 0) stats.sim.losses++;
      }
    });
  }

  if (S.realStatsByPair) {
    Object.values(S.realStatsByPair).forEach(s => {
      stats.real.wins   += (s.wins   || 0);
      stats.real.losses += (s.losses || 0);
    });
  }

  return stats;
}
window._getMultiModeMemoryStats = _getMultiModeMemoryStats;


function _getPairTierFromContext(ctx) {
  if (!ctx) return 'unknown';
  const ratio = ctx.pairRelRatio;
  if (ratio === null || ratio === undefined) return 'unknown';
  if (ratio < 0.7) return 'calm';
  if (ratio < 1.4) return 'mid';
  return 'volatile';
}
window._getPairTierFromContext = _getPairTierFromContext;


function _getSharpeAllocMult(pair) {
  const allocs = _computeSharpeAllocations();
  return allocs[pair] || 1.0;
}
window._getSharpeAllocMult = _getSharpeAllocMult;


// ════════════════════════════════════════════════════════════
// WATCHDOG MANUEL — surveille les positions manuelles et applique les garde-fous user
// ════════════════════════════════════════════════════════════
function _manConsignesWatchdog() {
  const positions = (S.openPositions || []).filter(p => p.auto !== true);
  positions.forEach(pos => {
    const pnlUsd     = pos.pnlUsdt || 0;
    const openedAt   = pos._manOpenedAt || pos.openedAt || pos.entryTs || Date.now();
    const elapsedMin = (Date.now() - openedAt) / 60000;

    const maxLossPct = pos._manMaxLossPct || 2.0;
    const timeoutMin = pos._manTimeoutMin || 60;

    const tradingCap     = S.tradingAccount || 1;
    const lossAsPctOfCap = Math.abs(Math.min(0, pnlUsd)) / tradingCap * 100;

    let reason = null;
    if (lossAsPctOfCap >= maxLossPct) {
      reason = `Perte max dépassée (${lossAsPctOfCap.toFixed(1)}% ≥ ${maxLossPct}%)`;
    } else if (elapsedMin >= timeoutMin) {
      reason = `Timeout atteint (${elapsedMin.toFixed(0)}min ≥ ${timeoutMin}min)`;
    }

    if (reason && typeof closePosition === 'function') {
      try {
        closePosition(pos.id, true);
        S.chainLog.push({
          icon: '🛡️',
          desc: `Garde-fou MAN · ${pos.pair} ${pos.side.toUpperCase()} fermé · ${reason}`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        if (typeof showToast === 'function') {
          showToast('🛡️ ' + pos.pair + ' fermé · ' + reason, 3500, 'warn');
        }
      } catch(e) { console.warn('man watchdog:', e); }
    }
  });
}
window._manConsignesWatchdog = _manConsignesWatchdog;


function _notifyTradeForExport() { /* désactivé — pas d'export auto */ }
window._notifyTradeForExport = _notifyTradeForExport;


function _p5PreActionSave(action) {
  try {
    _p5MultiStorageSave();
  } catch(e) { console.warn('[P5 preAction]', e); }
}
window._p5PreActionSave = _p5PreActionSave;


function _restoreAutoBarState() {
  const autoBar  = document.getElementById('autoBar');
  const manBar   = document.getElementById('manBar');
  const paramBar = document.getElementById('paramBar');
  if (!autoBar || !manBar) return;
  let saved = 'auto';
  try { saved = localStorage.getItem(BARS_KEY) || 'auto'; } catch(e) {}
  autoBar.classList.remove('open');
  manBar.classList.remove('open');
  if (paramBar) paramBar.classList.remove('open');
  if (saved === 'auto')             autoBar.classList.add('open');
  else if (saved === 'man')         manBar.classList.add('open');
  else if (saved === 'param' && paramBar) paramBar.classList.add('open');
}
window._restoreAutoBarState = _restoreAutoBarState;


function _updateAutoBarCounters() {
  const autoBar      = document.getElementById('autoBar');
  const manBar       = document.getElementById('manBar');
  const autoCounter  = document.getElementById('autoBarCounter');
  const manCounter   = document.getElementById('manBarCounter');
  const autoPaircount = document.getElementById('autoBarPairCount');
  const manPaircount  = document.getElementById('manBarPairCount');

  const autoPositions = (S.openPositions || []).filter(p => p.auto === true).length;
  const manPositions  = (S.openPositions || []).filter(p => p.auto !== true).length;

  if (autoBar && autoCounter) {
    if (autoPositions > 0) {
      autoBar.classList.add('has-active');
      autoCounter.textContent = autoPositions + ' active' + (autoPositions > 1 ? 's' : '');
    } else {
      autoBar.classList.remove('has-active');
      autoCounter.textContent = 'En veille';
    }
  }

  if (manBar && manCounter) {
    if (manPositions > 0) {
      manBar.classList.add('has-active');
      manCounter.textContent = manPositions + ' active' + (manPositions > 1 ? 's' : '');
    } else {
      manBar.classList.remove('has-active');
      manCounter.textContent = 'En veille';
    }
  }

  const totalPairs   = Object.keys(PAIRS).length;
  const pausedPairs  = Object.keys(S._pausedPairs || {}).length;
  const pairText     = pausedPairs > 0
    ? (totalPairs - pausedPairs) + '/' + totalPairs + ' paires'
    : totalPairs + ' paires';
  if (autoPaircount) autoPaircount.textContent = pairText;
  if (manPaircount)  manPaircount.textContent  = pairText;
}
window._updateAutoBarCounters = _updateAutoBarCounters;


// ════════════════════════════════════════════════════════════
// INDICATEURS DE PAIRE — sparkline + RSI + momentum + volume
// ════════════════════════════════════════════════════════════
function ac2UpdateXInd(pair) {
  const k = pair.replace('/','_');
  const ps = S.pairStates[pair]; if (!ps) return;
  const closes = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');

  // Sparkline
  const spark = document.getElementById('ac2_spark_'+k);
  if (spark && closes.length >= 5) {
    const ph = closes.slice(-20);
    const W = spark.clientWidth || 300, H = spark.clientHeight || 28;
    const DPR = window.devicePixelRatio || 1;
    spark.width = W*DPR; spark.height = H*DPR;
    const x = spark.getContext('2d'); x.scale(DPR, DPR); x.clearRect(0,0,W,H);
    const mn = Math.min(...ph), mx = Math.max(...ph), rng = mx-mn || 1;
    const cfg = PAIRS[pair] || {color:'#38d4f5'};
    const grad = x.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, cfg.color + '40');
    grad.addColorStop(1, cfg.color + '00');
    x.beginPath();
    ph.forEach((p,i) => {
      const px = (i/(ph.length-1))*W, py = H - ((p-mn)/rng)*(H-2) - 1;
      if (i===0) x.moveTo(px, py); else x.lineTo(px, py);
    });
    x.lineTo(W, H); x.lineTo(0, H); x.closePath();
    x.fillStyle = grad; x.fill();
    x.beginPath();
    ph.forEach((p,i) => {
      const px = (i/(ph.length-1))*W, py = H - ((p-mn)/rng)*(H-2) - 1;
      if (i===0) x.moveTo(px, py); else x.lineTo(px, py);
    });
    x.strokeStyle = cfg.color; x.lineWidth = 1.5;
    x.shadowColor = cfg.color; x.shadowBlur = 6;
    x.stroke(); x.shadowBlur = 0;
  }

  // Volume
  const volVal  = document.getElementById('ac2_volval_'+k);
  const volFill = document.getElementById('ac2_volfill_'+k);
  if (volVal && volFill) {
    const recentCandles = (ps.candles||[]).slice(-24);
    const vSum = recentCandles.reduce((s,c) => s + (c.v||0), 0);
    const v = vSum > 0 ? vSum * (ps.price||1) : ((ps.price||1) * 1000 * (0.5 + Math.random()));
    const display = v >= 1e9 ? (v/1e9).toFixed(1)+'B'
                  : v >= 1e6 ? (v/1e6).toFixed(1)+'M'
                  : v >= 1e3 ? (v/1e3).toFixed(0)+'K'
                  : v.toFixed(0);
    volVal.textContent = '$' + display;
    const pct = Math.min(100, Math.max(15, (v / ((ps.price||1) * 1e5)) * 100));
    volFill.style.width = pct + '%';
  }

  // RSI
  const rsiEl = document.getElementById('ac2_rsi_'+k);
  if (rsiEl && closes.length >= 15) {
    const cl = closes.slice(-20);
    let g=0, l=0;
    for (let i=1; i<=14; i++) { const d=cl[i]-cl[i-1]; d>0?g+=d:l-=d; }
    let ag=g/14, al=l/14;
    for (let i=15; i<cl.length; i++) { const d=cl[i]-cl[i-1]; ag=(ag*13+(d>0?d:0))/14; al=(al*13+(d<0?-d:0))/14; }
    const rsi = al ? 100-(100/(1+ag/al)) : 100;
    rsiEl.textContent = rsi.toFixed(0);
    rsiEl.style.color = rsi > 70 ? 'var(--down)' : rsi < 30 ? 'var(--up)' : rsi > 55 ? 'var(--gold)' : rsi < 45 ? 'var(--ice)' : 'var(--t2)';
  }

  // Momentum
  const momEl = document.getElementById('ac2_mom_'+k);
  if (momEl && closes.length >= 10) {
    const ph2 = closes;
    const recent = ph2.slice(-5).reduce((a,b)=>a+b,0)/5;
    const older  = ph2.slice(-10,-5).reduce((a,b)=>a+b,0)/5;
    const momPct = ((recent-older)/older)*100;
    const arr = momPct > 0.3 ? '↗' : momPct < -0.3 ? '↘' : '→';
    momEl.textContent = arr + ' ' + (momPct>=0?'+':'') + momPct.toFixed(2) + '%';
    momEl.style.color = momPct > 0.3 ? 'var(--up)' : momPct < -0.3 ? 'var(--down)' : 'var(--t3)';
  }

  // Régime
  const regEl = document.getElementById('ac2_regmini_'+k);
  if (regEl) {
    const reg = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
    const map = {
      bull:           {txt:'BULL',   c:'var(--up)'},
      bear:           {txt:'BEAR',   c:'var(--down)'},
      calm:           {txt:'CALM',   c:'var(--ice)'},
      volatile:       {txt:'VOL',    c:'var(--gold)'},
      volatile_bull:  {txt:'V.BULL', c:'var(--up)'},
      volatile_bear:  {txt:'V.BEAR', c:'var(--down)'}
    };
    const m = map[reg] || map.calm;
    regEl.textContent = m.txt;
    regEl.style.color = m.c;
  }

  // Streak
  const streakEl = document.getElementById('ac2_streak_'+k);
  if (streakEl) {
    const closedTrades = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
    if (!closedTrades.length) {
      streakEl.textContent = '—';
      streakEl.style.color = 'var(--t3)';
    } else {
      let cur = 0, dir = null;
      for (let i = closedTrades.length-1; i >= 0; i--) {
        const win = closedTrades[i].pnlUsdt > 0;
        if (dir === null) { dir = win; cur = 1; }
        else if (dir === win) cur++;
        else break;
      }
      streakEl.textContent = (dir ? 'W' : 'L') + cur;
      streakEl.style.color = dir ? 'var(--up)' : 'var(--down)';
    }
  }
}
window.ac2UpdateXInd = ac2UpdateXInd;


// ════════════════════════════════════════════════════════════
// AUTO-OPEN BOT — Ouverture automatique par le bot avec garde-fous
// ════════════════════════════════════════════════════════════
function autoOpenPosition(pair, side, stakeOverride) {
  // Mode AUTO obligatoire
  if (S.botAutoMode === false) return;
  try { _p5PreActionSave('open_bot'); } catch(e) {}

  // Pas d'ouverture pendant coupure Internet
  if (S._netPaused === true) {
    if (Math.random() < 0.05) {
      S.chainLog.push({
        icon: '🔴',
        desc: `Ouverture bloquée · connexion coupée · ${pair} ${side.toUpperCase()}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  // ── VEILLE MARCHÉ — Consultation sentiment global
  if (S.veilleData && typeof S.veilleData.sentimentScore === 'number') {
    const sentTs    = S.veilleData.sentimentTs || 0;
    const sentFresh = (Date.now() - sentTs) < 30 * 60 * 1000;
    if (sentFresh) {
      const sent = S.veilleData.sentimentScore;

      // Blocage si sentiment très baissier sur LONG
      if (sent <= -60 && side === 'long') {
        S.chainLog.push({
          icon: '📡',
          desc: `Veille Marché : LONG bloqué sur ${pair} · Sentiment ${sent} (< -60) — conditions défavorables`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, 50);
        return;
      }
      if (sent >= 60 && side === 'short') {
        S.chainLog.push({
          icon: '📡',
          desc: `Veille Marché : SHORT bloqué sur ${pair} · Sentiment ${sent} (> +60) — marché haussier`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, 50);
        return;
      }

      // Modulation de la mise selon sentiment ±30%
      if (!stakeOverride && S.pairStates[pair]) {
        const ps = S.pairStates[pair];
        const baseMise = ps.stake || 10;
        let mult = 1.0;
        if (sent >= 50)       mult = 1.3;
        else if (sent >= 20)  mult = 1.1;
        else if (sent <= -50) mult = 0.6;
        else if (sent <= -20) mult = 0.8;
        if (mult !== 1.0) {
          stakeOverride = Math.max(10, Math.round(baseMise * mult / 10) * 10);
          if (Math.random() < 0.2) {
            S.chainLog.push({
              icon: '📡',
              desc: `Veille: mise ${pair} ajustée ×${mult} (sentiment ${sent}) → $${stakeOverride}`,
              hash: rndHash(), time: nowStr()
            });
          }
        }
      }
    }
  }

  // Skip si paire en pause auto (sous-perf) ou contrôle manuel
  if (typeof _isPairPaused === 'function' && _isPairPaused(pair)) return;
  if (typeof _isPairManual === 'function' && _isPairManual(pair)) return;

  // Pas d'ouverture si déjà une position sur la paire
  if (S.openPositions.find(p => p.pair === pair)) return;

  // Max 3 positions auto simultanées (qualité > quantité)
  const autoPositionsCount = S.openPositions.filter(p => p.auto === true).length;
  if (autoPositionsCount >= 3) {
    if (Math.random() < 0.1) {
      S.chainLog.push({
        icon: '⊗',
        desc: `Limite 3 positions · ${pair} ${side.toUpperCase()} ignoré · ${autoPositionsCount}/3 ouvertes`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  // Filtre série de pertes + blacklist dynamique
  if (!S._lossStreaks) S._lossStreaks = {};
  const streak = S._lossStreaks[pair];

  if (streak && streak.blacklistedUntil && streak.blacklistedUntil > Date.now()) {
    const remainMin = Math.ceil((streak.blacklistedUntil - Date.now()) / 60000);
    if (Math.random() < 0.1) {
      S.chainLog.push({
        icon: '🚫',
        desc: `BLACKLIST · ${pair} ${side.toUpperCase()} bloqué · WR insuffisant · reprise dans ~${remainMin}min`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  if (streak && streak.count >= 3 && (Date.now() - streak.pausedAt) < 30 * 60 * 1000) {
    const remainMin = Math.ceil((30 * 60 * 1000 - (Date.now() - streak.pausedAt)) / 60000);
    if (Math.random() < 0.15) {
      S.chainLog.push({
        icon: '⏸',
        desc: `Pause streak · ${pair} ${side.toUpperCase()} bloqué · 3 pertes consécutives · reprise dans ~${remainMin}min`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if (!ps || !cfg) return;

  const tech = typeof getTechSignals        === 'function' ? getTechSignals(pair)        : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;

  // ── VETO RSI · anti-suicide ──
  try {
    const closes = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');
    if (closes.length >= 15) {
      const cl = closes.slice(-20);
      let g = 0, l = 0;
      for (let i = 1; i <= 14; i++) { const d = cl[i] - cl[i-1]; d > 0 ? g += d : l -= d; }
      let ag = g/14, al = l/14;
      for (let i = 15; i < cl.length; i++) {
        const d = cl[i] - cl[i-1];
        ag = (ag*13 + (d > 0 ? d : 0)) / 14;
        al = (al*13 + (d < 0 ? -d : 0)) / 14;
      }
      const rsi = al ? 100 - (100/(1 + ag/al)) : 100;
      if (side === 'short' && rsi < 25) {
        S.chainLog.push({ icon:'⊗', desc:`Veto RSI · ${pair} SHORT bloqué · RSI ${rsi.toFixed(0)} (survendu — rebond probable)`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
      if (side === 'long' && rsi > 75) {
        S.chainLog.push({ icon:'⊗', desc:`Veto RSI · ${pair} LONG bloqué · RSI ${rsi.toFixed(0)} (suracheté — correction probable)`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch(e) { /* Fail-safe */ }

  // ── VETO RÉGIME · cohérence régime/side ──
  try {
    const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
    if (regime === 'bear' || regime === 'bull') {
      const closesC = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');
      let rsiC = 50;
      if (closesC.length >= 15) {
        const clC = closesC.slice(-20);
        let gC = 0, lC = 0;
        for (let i = 1; i <= 14; i++) { const d = clC[i] - clC[i-1]; d > 0 ? gC += d : lC -= d; }
        let agC = gC/14, alC = lC/14;
        for (let i = 15; i < clC.length; i++) {
          const d = clC[i] - clC[i-1];
          agC = (agC*13 + (d > 0 ? d : 0)) / 14;
          alC = (alC*13 + (d < 0 ? -d : 0)) / 14;
        }
        rsiC = alC ? 100 - (100/(1 + agC/alC)) : 100;
      }
      if (regime === 'bear' && side === 'long' && rsiC >= 35) {
        S.chainLog.push({ icon:'⊗', desc:`Veto régime · ${pair} LONG bloqué · marché BEAR + RSI ${rsiC.toFixed(0)} (pas de signal rebond)`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
      if (regime === 'bull' && side === 'short' && rsiC <= 65) {
        S.chainLog.push({ icon:'⊗', desc:`Veto régime · ${pair} SHORT bloqué · marché BULL + RSI ${rsiC.toFixed(0)} (pas de signal correction)`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch(e) { /* Fail-safe */ }

  // ── VETO VOLUME · refuse si liquidité < 40% de la moyenne ──
  try {
    const vols = (ps.candles || []).slice(-20).map(c => c.v).filter(v => typeof v === 'number' && v > 0);
    if (vols.length >= 10) {
      const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
      const recentVol = vols.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (recentVol < avgVol * 0.40) {
        S.chainLog.push({ icon:'⊗', desc:`Veto volume · ${pair} ${side.toUpperCase()} bloqué · volume ${Math.round(recentVol/avgVol*100)}% de la moyenne (<40%)`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch(e) { /* Fail-safe */ }

  // ── VETO VOLATILITÉ · refuse pics anormaux (news, flash crash) ──
  try {
    const candles = (ps.candles || []).slice(-20);
    if (candles.length >= 15) {
      const atrs = candles.map(c => (c.h && c.l) ? (c.h - c.l) : 0).filter(v => v > 0);
      if (atrs.length >= 10) {
        const avgATR  = atrs.reduce((a, b) => a + b, 0) / atrs.length;
        const currATR = atrs.slice(-3).reduce((a, b) => a + b, 0) / 3;
        if (currATR > avgATR * 2.5) {
          S.chainLog.push({ icon:'⊗', desc:`Veto volatilité · ${pair} ${side.toUpperCase()} bloqué · ATR ${(currATR/avgATR).toFixed(1)}× moyenne (pic anormal)`, hash:rndHash(), time:nowStr() });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
          return;
        }
      }
    }
  } catch(e) { /* Fail-safe */ }

  // ── DIMENSIONNEMENT INITIAL ──
  // Le bot utilise SEULEMENT tradingAccount (jamais cashAccount)
  let baseStake = stakeOverride != null
    ? Math.max(10, Math.round(stakeOverride * 10) / 10)
    : Math.max(10, ps.stake || 10);

  // ── BRAIN GATE · analyse coalition d'agents ──
  let _brainVeto = false, _brainReason = '', _brainMult = 1.0, _brainSideFlip = false;
  if (typeof runRosterAnalysis === 'function') {
    try {
      const roster = runRosterAnalysis(pair);
      S._lastBrainAnalysis = roster;

      // 1. HARD VETO — un gardien refuse → on bloque
      if (roster.anyVeto) {
        const vetoers = Object.entries(roster.guardianResults)
          .filter(([,g]) => g.status === 'veto')
          .map(([id, g]) => {
            const a = (S.agents||[]).find(x => x.id === id);
            return (a?.emoji || '') + ' ' + (a?.name || id) + ' : ' + g.reasoning;
          });
        _brainVeto = true;
        _brainReason = vetoers.join(' · ');
        if (!S.brainLog) S.brainLog = [];
        S.brainLog.unshift({ ts: Date.now(), pair, event:'VETO', side, reason: _brainReason });
        if (S.brainLog.length > 30) S.brainLog.length = 30;
      }

      // 2. SIDE FLIP — coalition opposée avec consensus fort
      if (!_brainVeto && roster.coalition) {
        const rosterSide = roster.verdict === 'LONG' ? 'long' : roster.verdict === 'SHORT' ? 'short' : null;
        if (rosterSide && rosterSide !== side && roster.consensus >= 0.6) {
          _brainSideFlip = true;
          side = rosterSide;
          _brainReason = `Coalition ${roster.verdict} renversé · consensus ${(roster.consensus*100).toFixed(0)}%`;
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event:'FLIP', side, reason: _brainReason });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }

      // 3. MODULATION MISE basée sur consensus
      if (!_brainVeto) {
        if      (roster.coalition && roster.consensus >= 0.7) _brainMult = 1.25;
        else if (roster.coalition)                            _brainMult = 1.10;
        else if (roster.consensus < 0.30)                     _brainMult = 0.70;
        if (_brainMult !== 1.0) {
          baseStake = Math.max(10, Math.round(baseStake * _brainMult * 10) / 10);
        }
      }

      // 4. SKIP si tout le monde dit HOLD + LMSR neutre + pas de signal AT fort
      const externalConvStrong = (tech?.atScore && Math.abs(tech.atScore) >= 0.35);
      if (!_brainVeto && roster.votes.hold === roster.votes.total && !externalConvStrong) {
        const lmsrNeutral = Math.abs(lmsrP(ps) - 0.5) < 0.08;
        if (lmsrNeutral) {
          _brainVeto = true;
          _brainReason = 'Conseil HOLD + LMSR neutre · pas de signal';
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event:'SKIP', side, reason: _brainReason });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }
    } catch(e) {
      console.warn('brain gate error:', e);
    }
  }

  if (_brainVeto) {
    if (typeof showToast === 'function') {
      showToast('🧠 Brain Gate · ' + (_brainReason.length > 60 ? _brainReason.slice(0,57)+'…' : _brainReason));
    }
    return;
  }

  // ── SMART SIZER · multiplicateur Kelly ──
  if (typeof runBotFleet === 'function') {
    try {
      const fleetResult = runBotFleet('pre_trade', { stake: baseStake });
      if (fleetResult?.sizer?.mult && Math.abs(fleetResult.sizer.mult - 1) > 0.01) {
        baseStake = Math.max(10, Math.round(baseStake * fleetResult.sizer.mult * 10) / 10);
      }
    } catch(e) { /* fail-safe */ }
  }

  // ── FALLBACK LEVIER si compte trading vide ──
  let _useLeverageForStake = false;
  if (S.tradingAccount < 20) {
    const levAvail = S.leverageReserve || 0;
    if (levAvail >= 20) {
      baseStake = Math.max(10, Math.min(50, Math.floor(levAvail * 0.10 / 10) * 10));
      _useLeverageForStake = true;
    } else {
      showToast('⚠ Compte trading et levier insuffisants · bot suspendu', 2800, 'critical');
      return;
    }
  } else if (baseStake > S.tradingAccount * 0.95) {
    baseStake = Math.max(10, Math.floor(S.tradingAccount * 0.25 / 10) * 10);
  }

  // Levier bonus emprunté de leverageReserve si conviction élevée
  const bonusAvailable = ps._leverageBonus || 0;
  const levBorrowed    = bonusAvailable > 0 ? borrowLeverage(bonusAvailable, pair) : 0;

  // ── VALIDATION CAPITAL GLOBAL ──
  const _convForValidate = (typeof effectiveConviction === 'number' ? effectiveConviction : null)
                           ?? (typeof lmsrP === 'function' && ps ? lmsrP(ps) : 0.5);
  let capCheck = validateTotalExposure(baseStake, levBorrowed, _convForValidate);
  if (!capCheck.ok) {
    // Anticipation levier : tente de monter le levier avant suspension
    if (S.botAutoMode === true && (S.leverage || 0) < (S.leverageMaxMult || 10)) {
      const prevIdx = S.leverage || 0;
      const tryIndexes = [prevIdx + 1, prevIdx + 2, prevIdx + 3].filter(i => i <= (S.leverageMaxMult || 10));
      for (const newIdx of tryIndexes) {
        try {
          if (typeof setLeverageByBot === 'function') {
            setLeverageByBot(newIdx, `anticipation capital pour ${pair}`);
          }
          capCheck = validateTotalExposure(baseStake, levBorrowed);
          if (capCheck.ok) {
            S.chainLog.push({
              icon:'🤖⚡', desc:`Bot anticipation: levier ${prevIdx}→${newIdx} pour ouvrir ${pair}`,
              hash:rndHash(), time:nowStr()
            });
            break;
          }
        } catch(e) { console.warn('bot leverage anticipation:', e); }
      }
    }
    if (!capCheck.ok) {
      const scaleFactor = capCheck.available / Math.max(1, baseStake + levBorrowed);
      if (scaleFactor < 0.15) {
        showToast('⚠ Capital max atteint · bot ' + pair + ' suspendu', 2800, 'critical');
        if (levBorrowed > 0) repayLeverage(levBorrowed);
        return;
      }
      baseStake = Math.max(10, Math.floor(baseStake * scaleFactor / 10) * 10);
    }
  }

  const stakeUsdt = baseStake + levBorrowed;
  const amount    = (stakeUsdt / Math.max(0.0001, ps.price)).toFixed(cfg.dec>=4 ? 4 : 6);
  const id        = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);

  // ── DÉDUIRE CAPITAL · selon source ──
  let _jitBorrowed = 0;
  if (_useLeverageForStake) {
    // Garde-fou : pas d'emprunt si levier × 0
    if ((S.leverage || 0) === 0) return;
    S.leverageBorrowed = (S.leverageBorrowed || 0) + baseStake;
    S._autoLevBorrowed = (S._autoLevBorrowed || 0) + baseStake;
    S.leverageReserve  = Math.max(0, (S.leverageReserve || 0) - baseStake);
    _jitBorrowed = baseStake;
  } else {
    // Emprunt JIT si bot a besoin de plus que trading dispo
    try {
      if ((S.leverage || 0) >= 1 && baseStake > (S.tradingAccount || 0)) {
        const res = ensureLeverageCoverForTrade(baseStake, pair);
        if (res && res.ok && res.borrowed > 0) {
          _jitBorrowed = res.borrowed;
        }
      }
    } catch(e) { console.warn('bot auto-leverage:', e); }
    S.tradingAccount = Math.max(0, S.tradingAccount - baseStake);
  }
  S.portfolio = S.cashAccount + S.tradingAccount;
  if (S._pendingPositionBorrow) {
    _jitBorrowed = Math.max(_jitBorrowed, S._pendingPositionBorrow);
    S._pendingPositionBorrow = 0;
  }

  // ── CRÉATION POSITION ──
  S.openPositions.push({
    id, pair, side,
    entryPrice:    ps.price, openedAt: Date.now(),
    amount:        parseFloat(amount),
    stakeUsdt:     baseStake,
    levBorrowed:   (levBorrowed || 0) + _jitBorrowed,
    totalExposure: stakeUsdt,
    entryTime:     nowStr(),
    entryTs:       Date.now(),
    pnl:           0, pnlUsdt: 0,
    currentVal:    stakeUsdt,
    auto:          true,
    tp:            null, sl: null,
    _paperRealMode: (S.tradingMode === 'paperReal'),
    _holdCycles:   0,
    conviction:    (typeof effectiveConviction !== 'undefined' ? effectiveConviction : lmsrP(ps)) || 0,
    _peakPnl:      0,
    _contextId: (function(){
      if (S.tradingMode !== 'paperReal') return null;
      try {
        const ctx = _captureTradeContext(pair, side, baseStake);
        if (ctx) {
          _addTradeContextToMemory(ctx);
          return ctx.contextId;
        }
      } catch(e) {}
      return null;
    })(),
    _abArm: (function(){
      if (S.tradingMode !== 'paperReal') return null;
      try { return _abAssignArm(); } catch(e) {}
      return null;
    })(),
    _openReason: `${_brainSideFlip ? '🔄 FLIP · ' : ''}${_brainMult !== 1.0 ? '×' + _brainMult.toFixed(2) + ' · ' : ''}LMSR ${(lmsrP(ps)*100).toFixed(0)}% · ${side==='long'?'↑ LONG':'↓ SHORT'}${(S._lastBrainAnalysis?.coalition) ? ' · 🤝 Coalition' : ''}`,
    _openAgents: [...S.agents].filter(a => !a.isBot && !a.isMeta && Math.abs(a.score||0) > 0.1)
                   .sort((a,b) => Math.abs(b.score||0)*b.fitness - Math.abs(a.score||0)*a.fitness)
                   .slice(0,5)
                   .map(a => ({ emoji:a.emoji, name:a.name.split(' ')[0].split('·')[0].trim(), score:a.score||0 }))
  });

  if (typeof recordDecisionCascade === 'function') recordDecisionCascade(pair, side, baseStake, 'auto');

  ps.trades.push({
    side: side==='long'?'buy':'sell', type:'open',
    amount: String(amount), price: ps.price, pnl: 0, stakeUsdt: baseStake,
    levBorrowed, totalExposure: stakeUsdt,
    pnlUsdt: null, fee: null, ts: Date.now(), time: nowStr()
  });
  if (ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);

  updatePairBtnStates();
}
window.autoOpenPosition = autoOpenPosition;


// ════════════════════════════════════════════════════════════
// BUILD BRICKS — Construction initiale des grilles UI
// ════════════════════════════════════════════════════════════
function buildActionBricks() {
  const grid = document.getElementById('actionBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const brick = document.createElement('div');
    brick.className = 'action-brick sig-hold';
    brick.id = 'actbrick_' + pairKey;
    brick.setAttribute('data-pair', pair);
    brick.style.setProperty('--accent', cfg.color);
    brick.onclick = () => openPairDetail(pair);

    brick.innerHTML = `
      <canvas class="ab-spark-bg" id="abspark_${pairKey}" width="140" height="44"></canvas>
      <div>
        <div class="ab-head">
          <span class="ab-sym">${cfg.sym}</span>
          <span class="ab-dot"></span>
        </div>
        <div class="ab-price" id="abpx_${pairKey}">—</div>
      </div>
      <div>
        <div class="ab-signal" id="absig_${pairKey}">HOLD</div>
        <div class="ab-stats">
          <span class="ab-rsi-dot neutral" id="abrsi_${pairKey}"></span>
          <span class="ab-lmsr" id="ablmsr_${pairKey}">—</span>
          <span class="ab-sep">·</span>
          <span class="ab-wr neutral" id="abwr_${pairKey}">— WR</span>
          <span class="ab-sep">·</span>
          <span id="abtr_${pairKey}" style="color:var(--t3);">0 tr</span>
        </div>
      </div>
    `;
    grid.appendChild(brick);
  });
}
window.buildActionBricks = buildActionBricks;


function buildManBricks() {
  const grid = document.getElementById('manBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const brick = document.createElement('div');
    brick.className = 'man-brick';
    brick.id = 'manbrick_' + pairKey;
    brick.setAttribute('data-pair', pair);
    brick.style.setProperty('--accent', cfg.color);
    brick.onclick = () => openManDetail(pair);

    brick.innerHTML = `
      <canvas class="pb-spark-bg" id="mbspark_${pairKey}" width="140" height="44"></canvas>
      <span class="mb-badge" id="mbbadge_${pairKey}">PRÉT</span>
      <div>
        <div class="mb-head">
          <span class="mb-sym">${cfg.sym}</span>
          <span class="mb-dot"></span>
        </div>
        <div class="mb-price" id="mbpx_${pairKey}">—</div>
      </div>
      <div>
        <div class="mb-suggest" id="mbsug_${pairKey}">
          <span class="mb-suggest-side hold">—</span> · mise $—
        </div>
        <div class="mb-pnl" id="mbpnl_${pairKey}">
          <span class="mb-idle">Prêt à trader</span>
        </div>
      </div>
    `;
    grid.appendChild(brick);
  });
}
window.buildManBricks = buildManBricks;


function buildPairBricks() {
  const grid = document.getElementById('pairBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const brick = document.createElement('div');
    brick.className = 'pair-brick brick-idle';
    brick.id = 'brick_' + pairKey;
    brick.setAttribute('data-pair', pair);
    brick.style.setProperty('--accent', cfg.color);
    brick.onclick = () => openPairDetail(pair);

    brick.innerHTML = `
      <canvas class="pb-spark-bg" id="pbspark_${pairKey}" width="140" height="44"></canvas>
      <div>
        <div class="pb-head">
          <span class="pb-sym">${cfg.sym}</span>
          <span class="pb-dot"></span>
        </div>
        <div class="pb-price" id="pbpx_${pairKey}">—</div>
      </div>
      <div>
        <div class="pb-status" id="pbst_${pairKey}"></div>
        <div class="pb-pnl" id="pbpnl_${pairKey}"></div>
        <div class="pb-countdown" id="pbcd_${pairKey}"></div>
      </div>
      <div class="pb-tp-bar" style="display:none;" id="pbtpbar_${pairKey}">
        <div class="pb-tp-fill" id="pbtpfill_${pairKey}" style="width:0%;"></div>
      </div>
    `;
    grid.appendChild(brick);
  });
}
window.buildPairBricks = buildPairBricks;


// ════════════════════════════════════════════════════════════
// SNAPSHOT BUILDER — Construit l'état complet à persister
// ════════════════════════════════════════════════════════════
function buildSnapshot() {
  return {
    key:          SAVE_KEY,
    savedAt:      new Date().toISOString(),
    version:      2,
    // Portefeuille
    portfolio:      S.portfolio,
    cashAccount:    S.cashAccount,
    tradingAccount: S.tradingAccount,
    leverage:       S.leverage,
    botAutoMode:    S.botAutoMode,
    // Cycle
    cycle:    S.cycle,
    cycleMax: S.cycleMax,
    // Agents — fitness, score, conf, historique
    agents: S.agents.map(a => ({
      id:             a.id,
      name:           a.name,
      emoji:          a.emoji,
      type:           a.type,
      source:         a.source,
      score:          a.score,
      conf:           a.conf,
      fitness:        a.fitness,
      color:          a.color,
      learningEvents: a.learningEvents  || 0,
      totalReward:    a.totalReward     || 0,
      fitnessHistory: (a.fitnessHistory || []).slice(-50),
      errors:         a.errors          || 0,
      corrections:    a.corrections     || 0,
      streak:         a.streak          || 0,
      lastPnl:        a.lastPnl         || 0,
      memory:         (a.memory         || []).slice(-20),
      regimeFitness:  a.regimeFitness   || {}
    })),
    // Apprentissage — 200 entrées max, adjustments seulement sur les 30 dernières
    learningHistory: S.learningHistory.slice(-200).map((h, i, arr) =>
      i >= arr.length - 30 ? h : { ...h, adjustments: [] }
    ),
    evoLog: S.evoLog.slice(-50),
    // Paires
    pairStates: Object.fromEntries(
      Object.entries(S.pairStates).map(([pair, ps]) => [pair, {
        price:        ps.price,
        qYes:         ps.qYes,
        qNo:          ps.qNo,
        stake:        ps.stake,
        pairLeverage: ps.pairLeverage || 1,
        threshold:    ps.threshold    || 0.65,
        userStake:    ps.userStake    || false,
        userCycleSet: ps.userCycleSet || false,
        lastAction:   ps.lastAction   || 'hold',
        holdStartTs:  ps.holdStartTs  || 0,
        capital:      ps.capital,
        cycleMax:     ps.cycleMax,
        cycleTimer:   ps.cycleTimer,
        totalTrades:  ps.totalTrades,
        winTrades:    ps.winTrades,
        totalPnlPct:  ps.totalPnlPct,
        totalPnlUsd:  ps.totalPnlUsd,
        pnl24h:       ps.pnl24h,
        trades:       ps.trades.slice(-30),
        candles:      ps.candles.slice(-60)
      }])
    ),
    // Positions ouvertes
    openPositions: S.openPositions,
    // Frais & taxes
    fees:      S.fees,
    feeConfig: S.feeConfig,
    taxConfig: {
      region:  S.taxConfig.region,
      regions: S.taxConfig.regions
    },
    chainLog:    S.chainLog.slice(-50),
    totalTrades: S.totalTrades,
    winTrades:   S.winTrades,
    pnl24h:      S.pnl24h,
    pnlHistory:  S.pnlHistory.slice(-80),
    _startPortfolio: S._startPortfolio || S.portfolio,
    vMajor: S.vMajor,
    vMinor: S.vMinor,
    // Levier
    leverageReserve:   S.leverageReserve   || 0,
    leverageBorrowed:  S.leverageBorrowed  || 0,
    leverageTotalFees: S.leverageTotalFees || 0,
    // Comptes Phase 2/8/9
    fiscalReserveAccount: S.fiscalReserveAccount || 0,
    fiscalReserveLog:     (S.fiscalReserveLog || []).slice(0, 200),
    ownFundsInjected:     S.ownFundsInjected || 0,
    ownFundsLog:          (S.ownFundsLog || []).slice(0, 200),
    fiatConvFeePct:       (typeof S.fiatConvFeePct === 'number') ? S.fiatConvFeePct : 0.002,
    _autoLevBase:         S._autoLevBase || 0,
    _autoLevBorrowed:     S._autoLevBorrowed || 0,
    // Best/worst trade par paire
    pairBestWorst: Object.fromEntries(
      Object.entries(S.pairStates).map(([p, ps]) => [p, {
        bestTrade:  ps.bestTrade  || null,
        worstTrade: ps.worstTrade || null
      }])
    ),
    // Mémoires
    agentMemories: Object.fromEntries(
      S.agents.map(a => [a.id, (a.memory || []).slice(-30)])
    ),
    globalMemoryPool: S.globalMemoryPool.slice(-50),
    dreams:           S.dreams.slice(-10),
    dynamicPairKeys:  Object.keys(PAIRS).filter(k => !['BTC/USDT','ETH/USDT','XRP/USDT','SOL/USDT'].includes(k)),
    pairCandidates:   S.pairCandidates,
    proposals:        S.proposals.slice(-20),
    heatmap:          S.heatmap         || { byHour:{}, byWeekday:{} },
    shadow:           S.shadow          || {},
    dreamJournal:     (S.dreamJournal   || []).slice(-40),
    decisionCascade:  (S.decisionCascade|| []).slice(-15),
    resonanceHistory: (S.resonanceHistory||[]).slice(-15),
    archives:         S.archives        || { snapshots:[], totalResets:0 },
    brainLog:         (S.brainLog       || []).slice(-30),
    pendingActions:   (S.pendingActions || []).slice(-10),
    mutedAgents:      S.mutedAgents     || [],
    botFleet:         S.botFleet        || {},
    agentLessons:     (S.agentLessons   || []).slice(-30),
    // Mode trading + paperReal
    tradingMode:       S.tradingMode || 'sim',
    realTimeframe:     S.realTimeframe || '15m',
    realActivePairs:   S.realActivePairs || {},
    agentLessonsReal:  (S.agentLessonsReal || []).slice(-30),
    realKillSwitch:    S.realKillSwitch || {},
    realModeStartedAt: S.realModeStartedAt || 0,
    realStatsByPair:   S.realStatsByPair   || {},
    // preRealSnapshot uniquement persisté pendant mode 'real'
    preRealSnapshot:   (S.tradingMode === 'real') ? (S.preRealSnapshot || null) : null,
    agentLessonsPaperReal:    (S.agentLessonsPaperReal || []).slice(-30),
    paperRealStats:           S.paperRealStats || {},
    paperRealActivePairs:     S.paperRealActivePairs || {},
    paperRealTimeframe:       S.paperRealTimeframe || '15m',
    paperRealStartedAt:       S.paperRealStartedAt || 0,
    paperRealKillSwitch:      S.paperRealKillSwitch || {},
    paperRealLastClose:       S.paperRealLastClose || {},
    paperRealConsecLosses:    S.paperRealConsecLosses || 0,
    paperRealGlobalPauseUntil:S.paperRealGlobalPauseUntil || 0,
    paperRealConfig:          S.paperRealConfig || {},
    adaptiveState:            S.adaptiveState || {},
    tradeContextMemory:       (S.tradeContextMemory || []).slice(-500),
    abTesting:                S.abTesting || null,
    pnlPeriod:                S.pnlPeriod || null,
    preRealSnapshotPaperReal: (S.tradingMode === 'paperReal') ? (S.preRealSnapshotPaperReal || null) : null,
    _totalCompounded: S._totalCompounded || 0,
    _genCount:        S._genCount || 0,
    // Bougies temps réel (100 max par couple paire/intervalle)
    realCandles: (function() {
      if (!S.realCandles) return {};
      const out = {};
      Object.entries(S.realCandles).forEach(([pair, intervals]) => {
        out[pair] = {};
        Object.entries(intervals).forEach(([iv, arr]) => {
          out[pair][iv] = (arr || []).slice(-100);
        });
      });
      return out;
    })()
  };
}
window.buildSnapshot = buildSnapshot;


// ════════════════════════════════════════════════════════════
// EXPORT — Fichiers téléchargeables
// ════════════════════════════════════════════════════════════
function exportFeesCSV() {
  downloadFile(buildFeeLogCSV(), `nexus_fees_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('📥 Frais exportés', 2800, 'user');
}
window.exportFeesCSV = exportFeesCSV;

function exportFullJSON() {
  const data = {
    exportDate: new Date().toISOString(),
    region: S.taxConfig.region,
    regionLabel: S.taxConfig.regions[S.taxConfig.region]?.label,
    fees: S.fees, feeConfig: S.feeConfig, taxConfig: S.taxConfig,
    trades: S.fees.feeLog,
    portfolio: { total:S.portfolio, cash:S.cashAccount, trading:S.tradingAccount, cycle:S.cycle }
  };
  downloadFile(JSON.stringify(data,null,2), `nexus_backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
  showToast('📥 Backup JSON exporté');
}
window.exportFullJSON = exportFullJSON;

function exportState(silent) {
  try {
    const snap = buildSnapshot();
    snap._export = {
      version: '8.0',
      exportedAt: new Date().toISOString(),
      portfolio: S.portfolio,
      cycle: S.cycle,
      totalTrades: S.totalTrades,
      winRate: S.totalTrades > 0 ? Math.round(S.winTrades / S.totalTrades * 100) : 0
    };
    const json = JSON.stringify(snap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const d    = new Date();
    const stamp = d.getFullYear() + '-' +
                  String(d.getMonth()+1).padStart(2,'0') + '-' +
                  String(d.getDate()).padStart(2,'0') + '_' +
                  String(d.getHours()).padStart(2,'0') +
                  String(d.getMinutes()).padStart(2,'0');
    a.href = url;
    a.download = 'nexus_save_' + stamp + '_cycle' + S.cycle + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    showToast('💾 Sauvegarde exportée : ' + a.download, 4000, 'user');
    return true;
  } catch(e) {
    console.error('Export failed', e);
    showToast('❌ Export échoué : ' + e.message, 4000, 'user');
    return false;
  }
}
window.exportState = exportState;

function exportSummaryCSV() {
  downloadFile(buildSummaryCSV(), `nexus_resume_fiscal_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('📥 Résumé fiscal exporté', 2800, 'user');
}
window.exportSummaryCSV = exportSummaryCSV;

async function exportTradesCSV() {
  const trades = await loadAllTrades();
  const all = [...trades, ...S.fees.feeLog.map(e=>({...e}))];
  downloadFile(buildTradeCSV(all), `nexus_trades_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('📥 Trades exportés — '+all.length+' lignes', 2800, 'user');
}
window.exportTradesCSV = exportTradesCSV;


function getCapitalSummary() {
  const staked    = S.openPositions.reduce((s,p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  const maxAllowed = S.tradingAccount + (S.leverageReserve || 0);
  const usedPct   = maxAllowed > 0 ? Math.min(100, staked / maxAllowed * 100) : 0;
  return { staked, maxAllowed, usedPct, free: Math.max(0, maxAllowed - staked) };
}
window.getCapitalSummary = getCapitalSummary;


// ════════════════════════════════════════════════════════════
// IMPORT — Restauration depuis fichier JSON utilisateur
// ════════════════════════════════════════════════════════════
function importState() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const snap = JSON.parse(text);
      if (!snap || snap.version < 2) {
        showToast('❌ Fichier invalide ou trop ancien', 4000, 'user');
        return;
      }
      const confirmed = confirm(
        'Restaurer cette sauvegarde ?\n\n' +
        'Cycle : #' + (snap.cycle || '?') + '\n' +
        'Trades : ' + (snap.totalTrades || 0) + '\n' +
        'Portefeuille : ' + (snap.portfolio ? snap.portfolio.toFixed(2) : 0) + ' USDT\n' +
        'Sauvegardé : ' + (snap.savedAt ? new Date(snap.savedAt).toLocaleString() : '?') + '\n\n' +
        'L\'état actuel sera remplacé.'
      );
      if (!confirmed) return;

      const wasRunning = _simRunning;
      if (wasRunning) stopSim();

      // Écrit le snap dans IndexedDB/localStorage puis loadState()
      try {
        const db = await openDB();
        await new Promise(res => {
          const tx = db.transaction(STORE_STATE, 'readwrite');
          tx.objectStore(STORE_STATE).put(snap);
          tx.oncomplete = res;
          tx.onerror = res;
        });
      } catch(dbErr) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch(lsErr) {}
      }

      const ok = await loadState();
      if (ok) {
        if (typeof renderAll === 'function') renderAll();
        showToast('✅ Session restaurée depuis fichier · cycle #' + S.cycle, 5000, 'user');
        S.chainLog.push({ icon:'📥', desc:'Session importée depuis fichier · cycle #'+S.cycle, hash:rndHash(), time:nowStr() });
      } else {
        showToast('⚠ Restauration partielle', 4000, 'user');
      }
    } catch(err) {
      console.error('Import failed', err);
      showToast('❌ Import échoué : fichier illisible', 4000, 'user');
    }
  };
  input.click();
}
window.importState = importState;


// ════════════════════════════════════════════════════════════
// INIT — Démarrage de l'application
// ════════════════════════════════════════════════════════════
async function init() {
  // Display version + sync mode button
  try {
    const vd = document.getElementById('versionDisplay');
    if (vd && typeof S !== 'undefined') vd.textContent = 'v' + (S.vMajor || 8) + '.' + (S.vMinor || 0);
    if (typeof updateModeButton === 'function') updateModeButton();
  } catch(e) {}

  // 1. Restaure l'état sauvegardé
  const restored = await loadState();

  // 2. Seed chain log si nouvelle session
  if (!restored || S.chainLog.length === 0) {
    S.chainLog = [
      { icon:'🏛', desc:'DAO Contract déployé sur Polygon',              hash:rndHash(), time:nowStr() },
      { icon:'🔑', desc:'Gnosis Safe trésorerie initialisée',             hash:rndHash(), time:nowStr() },
      { icon:'🪙', desc:'GovernanceToken G$ mintés (5 agents)',           hash:rndHash(), time:nowStr() },
      { icon:'💭', desc:'Mémoire épisodique vectorielle initialisée · 15 agents actifs', hash:rndHash(), time:nowStr() },
      { icon:'💤', desc:'Dream Engine prêt · 6 scénarios de stress disponibles',         hash:rndHash(), time:nowStr() },
      { icon:'🌐', desc:'3 paires candidates en file d\'attente DAO',     hash:rndHash(), time:nowStr() }
    ];
    S.evoLog = [
      { type:'new',   title:'🧬 hybrid_v1 créé',            desc:'Parents: Macro × Sentiment | Gen-1',           time:nowStr() },
      { type:'dream', title:'💤 Dream #1 — Initialisation', desc:'Système calibré sur 6 scénarios historiques.', time:nowStr(), dreamId:null }
    ];
    S.dreams = [{
      id:1, startCycle:0, time:nowStr(), complete:true,
      scenarios:[
        { ...DREAM_SCENARIOS[0], agentVotes:8540, agentAgainst:2100, outcome:{ priceDelta:-0.14, survived:true }, calibration:{ type:'tighten_sl', reason:'Flash Crash' } },
        { ...DREAM_SCENARIOS[4], agentVotes:6200, agentAgainst:3800, outcome:{ priceDelta: 0.11, survived:true }, calibration:null },
        { ...DREAM_SCENARIOS[5], agentVotes:4100, agentAgainst:1200, outcome:{ priceDelta:-0.002,survived:true }, calibration:{ type:'widen_cycles', reason:'Consolidation' } }
      ],
      insight:'Système résilient sur les 3 scénarios testés. Seuils TP/SL légèrement recalibrés après Flash Crash.'
    }];
  } else {
    S.chainLog.push({ icon:'✅', desc:`Session restaurée · cycle #${S.cycle} · ${S.totalTrades} trades`, hash:rndHash(), time:nowStr() });
  }

  // 3. Init mode toggle button
  const _mBtn = document.getElementById('modeToggleBtn');
  const _mLbl = document.getElementById('modeLabelText');
  const _isAutoInit = S.botAutoMode !== false;
  if (_mBtn) _mBtn.className = _isAutoInit ? 'auto' : 'manual';
  if (_mLbl) _mLbl.textContent = _isAutoInit ? 'AUTO' : 'MAN';
  const _chip = document.getElementById('heroModeChip');
  if (_chip) {
    _chip.className = 'mode-indicator-chip ' + (_isAutoInit ? 'auto' : 'manual');
    _chip.innerHTML = _isAutoInit ? '🤖 AUTO' : '🎛️ MAN';
  }

  // 4. Rendu initial
  renderAll();
  if (S.currentPage === 0) {
    setTimeout(() => {
      try {
        startBrainAnim();
        updateMarketMood();
        updateBotThoughts();
        updateFiscalMini();
        renderAnalyticsPanel();
        if (typeof renderPendingActions === 'function') renderPendingActions();
      } catch(e) { console.warn('init render:', e); }
    }, 300);
  }
  renderActionsGrid();
  renderPositions();
  drawMobileChart();
  buildPairPosButtons();
  syncPairPresets();
  updateCycleDurLabel();
  estimateStakes();
  updateAllPairCtrlLabels();
  updatePairBtnStates();
  drawSparkline();
  setTimeout(updatePairAnalysisPanels, 300);

  if (restored) {
    buildAgentCards();
    patchAgentCards();
    renderAll();
    showToast('✅ Session restaurée · cycle #'+S.cycle);
  }

  // 5. Prix live
  updateSimBtn();

  // Restore prix depuis cache localStorage (< 10 min)
  try {
    const cached = localStorage.getItem('nexus_price_cache');
    if (cached) {
      const pc = JSON.parse(cached);
      const now = Date.now();
      Object.entries(pc).forEach(([pair, d]) => {
        if (S.pairStates[pair] && d.price && (now - (d.ts||0)) < 600000) {
          S.pairStates[pair].price = d.price;
          S.pairStates[pair].pnl24h = d.pnl24h || 0;
        }
      });
    }
  } catch(e) {}

  fetchLivePrices(true);
  setInterval(_priceWatchdog, 10000);
  setTimeout(() => fetchLivePrices(true), 3000);

  // 6. Sync version display + globe button
  const verEl = document.getElementById('versionDisplay');
  if (verEl) verEl.textContent = `v${S.vMajor}.${S.vMinor}`;
  const gBtn = document.getElementById('installGlobeBtn');
  if (gBtn) gBtn.title = `NEXUS v${S.vMajor}.${S.vMinor} · Installer`;

  // 7. Init réserve levier
  if (!S._sessionStart) S._sessionStart = Date.now();
  if (!S.leverageReserve || S.leverageReserve === 0) initLeverageReserve();
  syncLeverageReserve();

  // 8. Renders pour bannières + agents
  updateIntelBanner();
  updateStreakBadge();
  setTimeout(() => {
    S.agents.forEach(a => { if (!a.fitnessHistory) a.fitnessHistory = [a.fitness, a.fitness]; });
    renderAgentHeatmap();
    renderCorrMatrix();
    const corrWrap = document.getElementById('corrMatrixWrap');
    if (corrWrap && window.ResizeObserver) {
      new ResizeObserver(() => { _corrLastTick = -1; renderCorrMatrix(); }).observe(corrWrap);
    }
  }, 150);

  // 9. Resize
  window.addEventListener('resize', () => {
    drawSparkline();
    drawMobileChart();
    _corrLastTick = -1;
    renderCorrMatrix();
  });
}
window.init = init;

// Lancement automatique
if (typeof init === 'function') { init(); }


// ════════════════════════════════════════════════════════════
// LOAD STATE — Restaure le snapshot depuis IndexedDB ou localStorage
// ════════════════════════════════════════════════════════════
async function loadState() {
  // Bypass complet si factoryReset en cours
  try {
    if (sessionStorage.getItem('nexus_factory_reset') === '1') {
      sessionStorage.removeItem('nexus_factory_reset');
      console.log('[NEXUS] factoryReset détecté — restauration ignorée, démarrage à blanc');
      S.tradingAccount       = 0;
      S.cashAccount          = 0;
      S.portfolio            = 0;
      S.portfolioTotal       = 0;
      S.fiscalReserveAccount = 0;
      S.ownFundsInjected     = 0;
      S.ownFundsLog          = [];
      S.openPositions        = [];
      S.totalTrades          = 0;
      S.winTrades            = 0;
      S.pnl24h               = 0;
      S.pnlHistory           = [];
      S._startPortfolio      = 0;
      S.b                    = 0;
      S.fees                 = { totalFees:0, totalPnlGross:0, totalPnlNet:0, byPair:{} };
      S.paperRealStats       = {};
      S.chainLog             = [];
      Object.keys(S.pairStates || {}).forEach(pair => {
        const ps = S.pairStates[pair];
        if (ps) {
          ps.totalTrades = 0;
          ps.winTrades   = 0;
          ps.totalPnlUsd = 0;
          ps.trades      = [];
          ps.openPosition = null;
        }
      });
      try { indexedDB.deleteDatabase(DB_NAME); } catch(e) {}
      return false;
    }
  } catch(e) {}

  let snap = null;

  // 1. IndexedDB (principal)
  try {
    const db = await openDB();
    snap = await new Promise(res => {
      const req = db.transaction(STORE_STATE, 'readonly')
                    .objectStore(STORE_STATE).get(SAVE_KEY);
      req.onsuccess = e => res(e.target.result || null);
      req.onerror   = () => res(null);
    });
  } catch(e) { /* IndexedDB indisponible */ }

  // 2. Fallback localStorage
  if (!snap) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) snap = JSON.parse(raw);
    } catch(e) { /* corrompu */ }
  }

  if (!snap || snap.version < 2) return false;

  // Guard : ne jamais restaurer des valeurs financières à 0 ou négatives
  const safeNum = (val, fallback) => (typeof val === 'number' && val > 0) ? val : fallback;

  // ── Portefeuille ──
  S.portfolio      = safeNum(snap.portfolio,      S.portfolio);
  S.cashAccount    = safeNum(snap.cashAccount,    S.cashAccount);
  S.tradingAccount = safeNum(snap.tradingAccount, S.tradingAccount);
  S.leverage       = (typeof snap.leverage === 'number') ? snap.leverage : 0;
  S.botAutoMode    = snap.botAutoMode !== undefined ? snap.botAutoMode : false;

  // ── Intelligence & control ──
  if (snap.heatmap)          S.heatmap          = snap.heatmap;
  if (snap.shadow)           S.shadow           = snap.shadow;
  if (snap.dreamJournal)     S.dreamJournal     = snap.dreamJournal;
  if (snap.decisionCascade)  S.decisionCascade  = snap.decisionCascade;
  if (snap.resonanceHistory) S.resonanceHistory = snap.resonanceHistory;
  if (snap.archives)         S.archives         = snap.archives;
  if (snap.brainLog)         S.brainLog         = snap.brainLog;
  if (snap.pendingActions)   S.pendingActions   = snap.pendingActions;
  if (snap.mutedAgents)      S.mutedAgents      = snap.mutedAgents;
  if (snap.botFleet)         Object.assign(S.botFleet || {}, snap.botFleet);
  if (Array.isArray(snap.agentLessons)) S.agentLessons = snap.agentLessons;

  // ── Mode trading + paperReal ──
  if (typeof snap.tradingMode === 'string')        S.tradingMode = snap.tradingMode;
  if (typeof snap.realTimeframe === 'string')      S.realTimeframe = snap.realTimeframe;
  if (snap.realActivePairs && typeof snap.realActivePairs === 'object') S.realActivePairs = snap.realActivePairs;
  if (Array.isArray(snap.agentLessonsReal))        S.agentLessonsReal = snap.agentLessonsReal;
  if (snap.realKillSwitch && typeof snap.realKillSwitch === 'object')   S.realKillSwitch = snap.realKillSwitch;
  if (typeof snap.realModeStartedAt === 'number')  S.realModeStartedAt = snap.realModeStartedAt;
  if (snap.realStatsByPair && typeof snap.realStatsByPair === 'object') S.realStatsByPair = snap.realStatsByPair;
  if (snap.preRealSnapshot && typeof snap.preRealSnapshot === 'object') S.preRealSnapshot = snap.preRealSnapshot;

  if (Array.isArray(snap.agentLessonsPaperReal))                              S.agentLessonsPaperReal = snap.agentLessonsPaperReal;
  if (snap.paperRealStats && typeof snap.paperRealStats === 'object')         S.paperRealStats = snap.paperRealStats;
  if (snap.paperRealActivePairs && typeof snap.paperRealActivePairs==='object') S.paperRealActivePairs = snap.paperRealActivePairs;
  if (typeof snap.paperRealTimeframe === 'string')              S.paperRealTimeframe = snap.paperRealTimeframe;
  if (typeof snap.paperRealStartedAt === 'number')              S.paperRealStartedAt = snap.paperRealStartedAt;
  if (snap.paperRealKillSwitch && typeof snap.paperRealKillSwitch==='object') S.paperRealKillSwitch = snap.paperRealKillSwitch;
  if (snap.paperRealLastClose && typeof snap.paperRealLastClose==='object')   S.paperRealLastClose = snap.paperRealLastClose;
  if (typeof snap.paperRealConsecLosses === 'number')           S.paperRealConsecLosses = snap.paperRealConsecLosses;
  if (typeof snap.paperRealGlobalPauseUntil === 'number')       S.paperRealGlobalPauseUntil = snap.paperRealGlobalPauseUntil;
  if (snap.paperRealConfig && typeof snap.paperRealConfig === 'object')       S.paperRealConfig = Object.assign(S.paperRealConfig||{}, snap.paperRealConfig);
  if (snap.adaptiveState && typeof snap.adaptiveState === 'object')           S.adaptiveState = Object.assign(S.adaptiveState||{}, snap.adaptiveState);
  if (Array.isArray(snap.tradeContextMemory))                                  S.tradeContextMemory = snap.tradeContextMemory.slice(-500);
  if (snap.abTesting && typeof snap.abTesting === 'object')                    S.abTesting = Object.assign(S.abTesting||{}, snap.abTesting);
  if (snap.pnlPeriod && typeof snap.pnlPeriod === 'object')                    S.pnlPeriod = Object.assign(S.pnlPeriod||{}, snap.pnlPeriod);

  if (typeof snap._totalCompounded === 'number' && snap._totalCompounded > 0)   S._totalCompounded = snap._totalCompounded;
  if (typeof snap._genCount === 'number' && snap._genCount > 0)                  S._genCount = snap._genCount;
  if (snap.preRealSnapshotPaperReal && typeof snap.preRealSnapshotPaperReal==='object') S.preRealSnapshotPaperReal = snap.preRealSnapshotPaperReal;

  if (snap.realCandles && typeof snap.realCandles === 'object') {
    S.realCandles = snap.realCandles;
    try { _ensureRealCandlesStruct(); } catch(e) {}
  }
  try { _updateRealModeBanner(); } catch(e) {}
  setTimeout(() => { try { if (typeof updateModeButton === 'function') updateModeButton(); } catch(e){} }, 50);

  // ── Cycle, PnL, trades ──
  S.cycle           = snap.cycle        || 0;
  S.cycleMax        = snap.cycleMax     || 30;
  S.pnl24h          = snap.pnl24h       || 0;
  S.pnlHistory      = snap.pnlHistory   || [];
  S.totalTrades     = snap.totalTrades  || 0;
  S.winTrades       = snap.winTrades    || 0;
  S.chainLog        = snap.chainLog     || [];
  S.learningHistory = snap.learningHistory || [];
  S.evoLog          = snap.evoLog        || [];
  S.openPositions   = snap.openPositions || [];

  // Restore start portfolio + auto-recalibrage si % implicite > 500% (ancienne base)
  if (snap._startPortfolio) {
    S._startPortfolio = snap._startPortfolio;
    const _current = (S.cashAccount || 0) + (S.tradingAccount || 0);
    if (S._startPortfolio > 0 && _current > 0) {
      const _impliedPct = (_current - S._startPortfolio) / S._startPortfolio * 100;
      if (Math.abs(_impliedPct) > 500) {
        console.warn('[loadState] _startPortfolio recalibré : ' + _impliedPct.toFixed(0) + '% → base recalée sur valeur actuelle');
        S._startPortfolio = _current;
        if (S.pnlPeriod) {
          S.pnlPeriod.todayStartPortfolio = _current;
          S.pnlPeriod.weekStartPortfolio  = _current;
        }
      }
    }
  }

  // ── Fermer les positions fantômes (>2h sans mise à jour) ──
  if (Array.isArray(S.openPositions) && S.openPositions.length > 0) {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const stale = S.openPositions.filter(p => (now - (p.entryTs || now)) > TWO_HOURS);
    if (stale.length > 0) {
      console.log('[AURA] ' + stale.length + ' position(s) fantôme(s) fermée(s) au démarrage (> 2h)');
      S.openPositions = S.openPositions.filter(p => (now - (p.entryTs || now)) <= TWO_HOURS);
    }
  }

  // ── One-shot reset P&L cumulé pour AURA v8 ──
  try {
    const RESET_FLAG = 'aura_v8_pnl_reset_done';
    if (!localStorage.getItem(RESET_FLAG)) {
      const current = (S.cashAccount || 0) + (S.tradingAccount || 0);
      S._startPortfolio = current;
      S.pnl24h          = 0;
      S.portfolio       = current;
      if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
      S.pnlPeriod.todayStartPortfolio  = current;
      const _d = new Date();
      S.pnlPeriod.todayDate            = _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');
      S.pnlPeriod.weekStartPortfolio   = current;
      S.pnlPeriod.monthStartPortfolio  = current;
      localStorage.setItem(RESET_FLAG, '1');
      console.log('[AURA] One-shot P&L reset done · base ' + current.toFixed(2));
    }
  } catch(e) { console.warn('[AURA] One-shot reset échoué :', e); }

  // ── Frais ──
  if (snap.fees) {
    Object.assign(S.fees, snap.fees);
    S.fees.feeLog = snap.fees.feeLog || [];
    S.fees.byPair = snap.fees.byPair || {};
  }
  if (snap.taxConfig) {
    S.taxConfig.region = snap.taxConfig.region || S.taxConfig.region;
    if (snap.taxConfig.regions) Object.assign(S.taxConfig.regions, snap.taxConfig.regions);
  }

  // ── Agents ──
  if (snap.agents && snap.agents.length) {
    snap.agents.forEach(sa => {
      const a = S.agents.find(x => x.id === sa.id);
      if (a) {
        a.name           = sa.name;
        a.emoji          = sa.emoji;
        a.type           = sa.type;
        a.source         = sa.source;
        a.score          = sa.score;
        a.conf           = sa.conf;
        a.fitness        = sa.fitness;
        a.learningEvents = sa.learningEvents;
        a.totalReward    = sa.totalReward;
        a.fitnessHistory = sa.fitnessHistory || [];
        a.regimeFitness  = sa.regimeFitness  || {};
        a.errors         = sa.errors         || 0;
        a.corrections    = sa.corrections    || 0;
        a.streak         = sa.streak         || 0;
        a.lastPnl        = sa.lastPnl        || 0;
        a.memory         = sa.memory         || [];
      }
    });
  }

  // ── Restaure pairStates (skip prix si snapshot vieux > 10 min) ──
  const _snapAge = snap.savedAt ? (Date.now() - new Date(snap.savedAt).getTime()) : 0;
  const _priceStale = _snapAge > 600000;
  if (snap.pairStates) {
    Object.entries(snap.pairStates).forEach(([pair, saved]) => {
      const ps = S.pairStates[pair];
      if (!ps) return;
      if (!_priceStale)     ps.price = saved.price || ps.price;
      ps.qYes        = saved.qYes        || ps.qYes;
      ps.qNo         = saved.qNo         || ps.qNo;
      ps.stake       = saved.stake       || ps.stake;
      ps.userStake   = saved.userStake   || false;
      ps.pairLeverage= saved.pairLeverage || 1;
      ps.threshold   = saved.threshold   || 0.65;
      ps.userCycleSet= saved.userCycleSet || false;
      ps.lastAction  = saved.lastAction  || 'hold';
      ps.holdStartTs = saved.holdStartTs || 0;
      ps.capital     = saved.capital     || ps.capital;
      ps.cycleMax    = saved.cycleMax    || ps.cycleMax;
      ps.cycleTimer  = saved.cycleTimer  || ps.cycleTimer;
      ps.totalTrades = saved.totalTrades || 0;
      ps.winTrades   = saved.winTrades   || 0;
      ps.totalPnlPct = saved.totalPnlPct || 0;
      ps.totalPnlUsd = saved.totalPnlUsd || 0;
      ps.pnl24h      = saved.pnl24h      || 0;
      ps.trades      = saved.trades      || [];
      if (saved.candles && saved.candles.length) ps.candles = saved.candles;
      if (snap.pairBestWorst && snap.pairBestWorst[pair]) {
        ps.bestTrade  = snap.pairBestWorst[pair].bestTrade  || null;
        ps.worstTrade = snap.pairBestWorst[pair].worstTrade || null;
      }
    });
  }

  // ── Mémoires agents ──
  if (snap.agentMemories) {
    S.agents.forEach(a => {
      if (snap.agentMemories[a.id]) a.memory = snap.agentMemories[a.id];
      const saved = snap.agents ? snap.agents.find(sa => sa.id === a.id) : null;
      if (saved) {
        if (saved.errors          != null) a.errors          = saved.errors;
        if (saved.corrections     != null) a.corrections     = saved.corrections;
        if (saved.streak          != null) a.streak          = saved.streak;
        if (saved.lastPnl         != null) a.lastPnl         = saved.lastPnl;
        if (saved.learningEvents  != null) a.learningEvents  = saved.learningEvents;
      }
    });
  }
  if (snap.globalMemoryPool) S.globalMemoryPool = snap.globalMemoryPool;
  if (snap.dreams && snap.dreams.length) S.dreams = snap.dreams;

  // ── Version ──
  if (snap.vMajor != null) S.vMajor = snap.vMajor;
  // vMinor non restauré — toujours la version compilée

  // ── Levier ──
  if (snap.leverageReserve   != null) S.leverageReserve   = snap.leverageReserve;
  if (snap.leverageBorrowed  != null) S.leverageBorrowed  = snap.leverageBorrowed;
  if (snap.leverageTotalFees != null) S.leverageTotalFees = snap.leverageTotalFees;

  // ── Comptes Phase 2/8/9 ──
  if (snap.fiscalReserveAccount != null) S.fiscalReserveAccount = snap.fiscalReserveAccount;
  if (Array.isArray(snap.fiscalReserveLog)) S.fiscalReserveLog = snap.fiscalReserveLog;
  if (snap.ownFundsInjected != null) S.ownFundsInjected = snap.ownFundsInjected;
  if (Array.isArray(snap.ownFundsLog)) S.ownFundsLog = snap.ownFundsLog;
  if (typeof snap.fiatConvFeePct === 'number') S.fiatConvFeePct = snap.fiatConvFeePct;
  if (snap._autoLevBase     != null) S._autoLevBase     = snap._autoLevBase;
  if (snap._autoLevBorrowed != null) S._autoLevBorrowed = snap._autoLevBorrowed;

  // ── Paires dynamiques ──
  if (snap.dynamicPairKeys && snap.dynamicPairKeys.length) {
    snap.dynamicPairKeys.forEach(pairKey => {
      if (!PAIRS[pairKey]) {
        const sym = pairKey.split('/')[0];
        const candidate = (snap.pairCandidates || S.pairCandidates).find(c => c.sym === sym);
        if (candidate) {
          PAIRS[pairKey] = {
            sym: candidate.sym, color: candidate.color,
            startPrice: candidate.startPrice, vol: candidate.vol,
            minP: candidate.minP, maxP: candidate.maxP, dec: candidate.dec
          };
          if (!S.pairStates[pairKey]) S.pairStates[pairKey] = makePairState(PAIRS[pairKey]);
        }
      }
    });
  }
  if (snap.pairCandidates) S.pairCandidates = snap.pairCandidates;
  if (snap.proposals && snap.proposals.length) {
    const savedPairProps = snap.proposals.filter(p => p.isPairProposal);
    savedPairProps.forEach(sp => {
      if (!S.proposals.find(p => p.id === sp.id)) S.proposals.unshift(sp);
    });
    const activePP = savedPairProps.find(p => p.status === 'active');
    if (activePP) S.activePairProposal = activePP.pairSym;
  }

  return true;
}
window.loadState = loadState;


// ════════════════════════════════════════════════════════════
// MARK REAL PRICE — Confirmation de réception d'un prix réel
// ════════════════════════════════════════════════════════════
function markRealPriceReceived() {
  _lastRealPriceTs = Date.now();
  if (_netwatchState === 'offline') {
    _freshPricesInRow++;
    if (_freshPricesInRow >= 3) {
      // Reprise après 3 prix frais consécutifs
      _netwatchState = 'online';
      _net10sSaveTriggered = false;
      _netOfflineSinceTs = 0;
      if (typeof S !== 'undefined' && S) {
        S._netPaused = false;
        S._netToastShown = false;
      }
      _updateNetIndicator();
      if (_netwatchPausedBot && !_simRunning) {
        _netwatchPausedBot = false;
        if (typeof startSim === 'function') {
          try { startSim(); } catch(e) {}
        }
        S.chainLog.push({
          icon: '🟢',
          desc: 'Connexion rétablie · bot reprend',
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      _netwatchPausedBot = false;
    }
  } else {
    _freshPricesInRow = 0;
  }
}
window.markRealPriceReceived = markRealPriceReceived;


// ════════════════════════════════════════════════════════════
// DIAGNOSTIC — Modal de santé du système (trades / P&L / marché / agents / capital)
// ════════════════════════════════════════════════════════════
function openDiagnostic() {
  const body    = document.getElementById('diagBody');
  const overlay = document.getElementById('diagOverlay');
  if (!body || !overlay) return;

  const now        = Date.now();
  const positions  = S.openPositions || [];
  const agents     = S.agents        || [];
  const pairStates = S.pairStates    || {};

  // ── TRADES ──
  let closedWin = 0, closedLoss = 0, closedTotal = 0, noTpSl = 0;
  let oldestPosAge = 0;
  let oldestPosLabel = '—';
  Object.entries(pairStates).forEach(([pair, ps]) => {
    (ps.trades || []).forEach(t => {
      if (t.type === 'position' && typeof t.pnlUsdt === 'number') {
        closedTotal++;
        if (t.pnlUsdt > 0) closedWin++;
        else if (t.pnlUsdt < 0) closedLoss++;
      }
    });
  });
  positions.forEach(p => {
    if (!p.tp && !p.sl) noTpSl++;
    const age = now - (p.openedAt || p.entryTs || now);
    if (age > oldestPosAge) {
      oldestPosAge = age;
      oldestPosLabel = p.pair + ' ' + (p.side||'').toUpperCase();
    }
  });
  const fmtAge = ms => {
    const m = Math.floor(ms/60000);
    if (m < 60) return m + ' min';
    const h = Math.floor(m/60);
    return h + 'h' + String(m%60).padStart(2,'0');
  };
  const oldCls    = oldestPosAge > 3600000 ? 'crit' : oldestPosAge > 600000 ? 'warn' : 'ok';
  const noTpSlCls = noTpSl > 0 ? 'warn' : 'ok';

  // ── P&L ──
  const pnlRealised = Object.values(pairStates).reduce((s, ps) => s + (ps.totalPnlUsd || 0), 0);
  const pnlLatent   = positions.reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const ratio       = pnlRealised !== 0 ? Math.abs(pnlLatent / pnlRealised) : (pnlLatent !== 0 ? 999 : 0);
  const ratioCls    = ratio > 2 ? 'crit' : ratio > 1 ? 'warn' : 'ok';
  const fmt$        = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);

  // ── MARCHÉ — Source prix, fraîcheur, régime ──
  // En sim, les prix sont SIMULÉS : pas de fetch HTTP, pas de WebSocket.
  // "Stale" et "dernier fetch" n'ont aucun sens en sim — on neutralise l'affichage.
  const _diagSimMode = !(typeof _isRealLike === 'function' && _isRealLike());
  let lastFetch;
  if (!_diagSimMode) {
    lastFetch = (typeof _lastRealPriceTs !== 'undefined' && _lastRealPriceTs) ? _lastRealPriceTs : 0;
  } else {
    lastFetch = (typeof _lastPriceFetch !== 'undefined' && _lastPriceFetch) ? _lastPriceFetch : 0;
  }
  const staleThreshold  = 60000;
  const isGloballyStale = lastFetch === 0 || (now - lastFetch) > staleThreshold;
  let staleCount = 0;
  if (!_diagSimMode && isGloballyStale) staleCount = Object.keys(pairStates).length;
  const ageSinceUpdate = lastFetch ? Math.floor((now - lastFetch)/1000) : -1;

  const srcMap = {0:'CoinGecko', 1:'Binance', 2:'Mode Auto-apprentissage'};
  let currentSource = (typeof _priceSource !== 'undefined') ? (srcMap[_priceSource] || '—') : '—';
  let wsConnectedCount = 0;
  let wsActiveTotal = 0;
  try {
    if (typeof _bgCollectorWSMap === 'object' && _bgCollectorWSMap) {
      Object.entries(_bgCollectorWSMap).forEach(([p, ws]) => {
        wsActiveTotal++;
        if (ws && ws.readyState === 1) wsConnectedCount++;
      });
    }
    if (typeof _realCandlesState !== 'undefined' && _realCandlesState.wsConnected) {
      wsConnectedCount++;
      wsActiveTotal++;
    }
  } catch(e) {}
  if (_isRealLike() && wsConnectedCount > 0) currentSource = 'Binance WS · live';
  if (_diagSimMode) currentSource = 'Mode Auto-apprentissage';

  const regime    = typeof detectMarketRegime === 'function' ? detectMarketRegime() : '—';
  const staleCls  = staleCount === 0 ? 'ok' : staleCount < Object.keys(pairStates).length ? 'warn' : 'crit';
  const updateCls = _diagSimMode ? 'neu'
                  : (ageSinceUpdate < 0 ? 'crit'
                  : ageSinceUpdate > 120 ? 'crit'
                  : ageSinceUpdate > 30  ? 'warn'
                  : 'ok');

  // ── AGENTS ──
  const saturated = agents.filter(a => (a.fitness || 0) >= 1900).length;
  const broken    = agents.filter(a => (a.fitness || 0) <= 80).length;
  const totalAg   = agents.length;
  const satCls    = saturated > totalAg * 0.5 ? 'warn' : 'ok';
  const brokenCls = broken > 3 ? 'crit' : broken > 0 ? 'warn' : 'ok';
  const fpMode    = S.fullPowerMode ? 'ACTIF' : 'off';
  const fpCls     = S.fullPowerMode ? 'warn' : 'ok';

  // ── CAPITAL ──
  const trading      = S.tradingAccount || 0;
  const cash         = S.cashAccount    || 0;
  const borrowed     = S.leverageBorrowed || 0;
  const maxCapacity  = (S._autoLevBase || trading) * (S.leverageMaxMult || 10);
  const usagePct     = maxCapacity > 0 ? (borrowed / maxCapacity) * 100 : 0;
  const usageCls     = usagePct > 90 ? 'crit' : usagePct > 70 ? 'warn' : 'ok';

  // ── ALERT INDICATOR ──
  const hasAlert = oldCls === 'crit' || staleCls === 'crit' || ratioCls === 'crit' || usageCls === 'crit' || brokenCls === 'crit';
  const diagBtn = document.getElementById('diagBtn');
  if (diagBtn) diagBtn.classList.toggle('alert', hasAlert);

  body.innerHTML = `
    <div class="diag-section">
      <div class="diag-sec-title">📊 TRADES</div>
      <div class="diag-line"><span class="diag-label">Clôturées</span><span class="diag-val neu">${closedWin}W / ${closedLoss}L <span style="color:var(--t3);">(${closedTotal})</span></span></div>
      <div class="diag-line"><span class="diag-label">Positions ouvertes</span><span class="diag-val neu">${positions.length}</span></div>
      <div class="diag-line"><span class="diag-label">Plus ancienne ouverte</span><span class="diag-val ${oldCls}">${oldestPosLabel} · ${oldestPosAge>0?fmtAge(oldestPosAge):'—'}</span></div>
      <div class="diag-line"><span class="diag-label">Sans TP/SL</span><span class="diag-val ${noTpSlCls}">${noTpSl} / ${positions.length}</span></div>
      ${oldestPosAge > 3600000 ? '<div class="diag-note">⚠ Position ouverte depuis +1h : vérifie TP/SL ou ferme manuellement</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">💰 P&L</div>
      <div class="diag-line"><span class="diag-label">Réalisé cumulé</span><span class="diag-val ${pnlRealised>=0?'ok':'crit'}">${fmt$(pnlRealised)}</span></div>
      <div class="diag-line"><span class="diag-label">Latent (ouvert)</span><span class="diag-val ${pnlLatent>=0?'ok':'crit'}">${fmt$(pnlLatent)}</span></div>
      <div class="diag-line"><span class="diag-label">Ratio latent/réalisé</span><span class="diag-val ${ratioCls}">${ratio>=999?'∞':ratio.toFixed(2)}×</span></div>
      ${ratio > 2 ? '<div class="diag-note">⚠ Trop de P&L latent vs réalisé : le wipeout est possible si retournement</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">📡 MARCHÉ</div>
      <div class="diag-line"><span class="diag-label">Source prix</span><span class="diag-val ${_isRealLike() && wsConnectedCount>0 ? 'ok' : 'neu'}">${currentSource}</span></div>
      <div class="diag-line"><span class="diag-label">Dernier fetch</span><span class="diag-val ${updateCls}">${_diagSimMode ? 'prix simulés · sim' : 'il y a '+(ageSinceUpdate<0?'—':ageSinceUpdate+'s')}</span></div>
      ${_isRealLike() ? `<div class="diag-line"><span class="diag-label">WS connectés (${S.tradingMode})</span><span class="diag-val ${wsConnectedCount === wsActiveTotal && wsActiveTotal>0 ? 'ok' : wsConnectedCount > 0 ? 'warn' : 'crit'}">${wsConnectedCount} / ${wsActiveTotal}</span></div>` : ''}
      ${_isRealLike() ? (function(){
        const upPct = (typeof _getWsUptimePct === 'function') ? _getWsUptimePct() : 100;
        const discCount = _wsStability.disconnects ? _wsStability.disconnects.length : 0;
        const cls = upPct >= 95 ? 'ok' : upPct >= 80 ? 'warn' : 'crit';
        return `<div class="diag-line"><span class="diag-label">Stabilité (1h)</span><span class="diag-val ${cls}">${upPct}% · ${discCount} coupure(s)</span></div>`;
      })() : ''}
      <div class="diag-line"><span class="diag-label">Régime détecté</span><span class="diag-val neu">${regime.toUpperCase()}</span></div>
      <div class="diag-line"><span class="diag-label">Paires figées (STALE)</span><span class="diag-val ${staleCls}">${_diagSimMode ? 'N/A · simulation' : staleCount + ' / ' + Object.keys(pairStates).length}</span></div>
      ${(!_diagSimMode && staleCount > 0) ? '<div class="diag-note">⚠ Des paires n\'ont pas reçu de nouvelles bougies depuis 2+ min</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">🤖 AGENTS</div>
      <div class="diag-line"><span class="diag-label">Total actifs</span><span class="diag-val neu">${totalAg}</span></div>
      <div class="diag-line"><span class="diag-label">Saturés (fitness ≥1900)</span><span class="diag-val ${satCls}">${saturated}</span></div>
      <div class="diag-line" onclick="_showBrokenAgentsDetail()" style="cursor:pointer;" title="Voir le détail"><span class="diag-label">Cassés (fitness ≤80) <span style="font-size:9px;opacity:.6;">(détail →)</span></span><span class="diag-val ${brokenCls}">${broken}</span></div>
      <div class="diag-line"><span class="diag-label">Plein régime</span><span class="diag-val ${fpCls}">${fpMode}</span></div>
      ${saturated > totalAg * 0.5 ? '<div class="diag-note">⚠ Trop d\'agents saturés : la sélection ne discrimine plus</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">💎 CAPITAL</div>
      <div class="diag-line"><span class="diag-label">Trading actif</span><span class="diag-val neu">$${trading.toFixed(2)}</span></div>
      <div class="diag-line"><span class="diag-label">Emprunté (levier)</span><span class="diag-val ${usageCls}">$${borrowed.toFixed(2)}</span></div>
      <div class="diag-line"><span class="diag-label">% capacité levier</span><span class="diag-val ${usageCls}">${usagePct.toFixed(0)}%</span></div>
      <div class="diag-line"><span class="diag-label">Caisse libre</span><span class="diag-val ok">$${cash.toFixed(2)}</span></div>
      <div class="diag-line"><span class="diag-label">Réserve fiscale</span><span class="diag-val neu">$${(S.fiscalReserveAccount||0).toFixed(2)}</span></div>
      ${usagePct > 80 ? '<div class="diag-note">⚠ Levier proche du max : risque de liquidation si marché contre toi</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">⚙️ RÉPARTITION BÉNÉFICES</div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.4;">
        Après chaque trade gagnant, le bénéfice net (après frais + taxes) est réparti :
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="font-size:10px;color:var(--ice);font-weight:700;min-width:55px;">Caisse</span>
        <input type="range" id="splitSlider" min="0" max="100" step="5" value="${S.profitSplitCaissePct || 30}"
               oninput="_updateSplitPct(this.value)"
               style="flex:1;height:6px;accent-color:var(--ice);">
        <span id="splitVal" style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--ice);min-width:40px;text-align:right;">${S.profitSplitCaissePct || 30}%</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--t3);">
        <span>→ Caisse (sécurisé) : <span id="splitCaissePreview" style="color:var(--up);font-weight:700;">${S.profitSplitCaissePct || 30}%</span></span>
        <span>→ Trading (re-investi) : <span id="splitTradingPreview" style="color:var(--gold);font-weight:700;">${100 - (S.profitSplitCaissePct || 30)}%</span></span>
      </div>
      <div class="diag-note" style="margin-top:6px;">Les taxes sont toujours envoyées vers la réserve fiscale (comptabilité propre). Les pertes restent dans Trading.</div>
    </div>
  `;
  overlay.classList.add('open');
}
window.openDiagnostic = openDiagnostic;


// ════════════════════════════════════════════════════════════
// SNAPSHOTS INTERNES — Modal de gestion (création + restauration)
// ════════════════════════════════════════════════════════════
function openSnapshotsModal() {
  let modal = document.getElementById('snapshotsModal');
  if (!modal) {
    const m = document.createElement('div');
    m.id = 'snapshotsModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid rgba(56,212,245,.3);border-radius:16px;padding:20px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--ice);">📸 SNAPSHOTS</div>
          <button onclick="document.getElementById('snapshotsModal').remove()" style="background:none;border:none;color:var(--t2);font-size:22px;cursor:pointer;padding:0 8px;">×</button>
        </div>
        <button onclick="window._snapshotActionCreate()" style="width:100%;padding:14px;background:rgba(56,212,245,.12);border:1px solid rgba(56,212,245,.4);border-radius:10px;color:var(--ice);font-family:var(--font-mono);font-weight:700;font-size:13px;cursor:pointer;margin-bottom:12px;">
          📸 CRÉER UN SNAPSHOT MAINTENANT
        </button>
        <div id="snapshotsList" style="display:flex;flex-direction:column;gap:10px;"></div>
        <div style="margin-top:14px;font-size:10px;color:var(--t3);line-height:1.5;">
          💡 Les snapshots sont conservés sur l'appareil. Max 3 emplacements (le plus ancien est remplacé).
        </div>
      </div>
    `;
    document.body.appendChild(m);
  }
  _refreshSnapshotsList();
}
window.openSnapshotsModal = openSnapshotsModal;


// ════════════════════════════════════════════════════════════
// POURQUOI CETTE POSITION ? — Modal explicative
// ════════════════════════════════════════════════════════════
function openWhyModal(posId) {
  const pos = (S.openPositions || []).find(p => p.id === posId);
  if (!pos) { showToast('Position introuvable', 1500, 'warn'); return; }

  const ps  = S.pairStates[pos.pair];
  const cfg = PAIRS[pos.pair] || {};
  const body    = document.getElementById('whyBody');
  const overlay = document.getElementById('whyOverlay');
  if (!body || !overlay) return;

  // Durée
  const since = pos.entryTs ? Math.round((Date.now() - pos.entryTs) / 1000) : 0;
  const sinceStr = since > 3600 ? Math.floor(since/3600)+'h '+Math.floor((since%3600)/60)+'m'
                 : since > 60   ? Math.floor(since/60)+'m '+since%60+'s'
                 : since+'s';

  // P&L
  const curPrice   = ps ? ps.price : 0;
  const entryPrice = pos.entryPrice || 0;
  const dec        = cfg.dec >= 4 ? cfg.dec : 2;
  const pnlPct     = entryPrice > 0
    ? (pos.side==='long' ? (curPrice-entryPrice)/entryPrice*100 : (entryPrice-curPrice)/entryPrice*100)
    : 0;
  const pnlUsd = pos.stakeUsdt * pnlPct / 100;
  const pnlCol = pnlPct >= 0 ? 'var(--up)' : 'var(--down)';

  // Indicateurs à l'ouverture
  const regime = ps ? (ps.regime || 'calm') : 'calm';
  const rsi    = ps ? (ps.rsi14 || '—') : '—';
  const mom    = ps ? ((ps.momentum||0)*100).toFixed(2)+'%' : '—';
  const lmsr   = ps ? (lmsrP(ps)*100).toFixed(0)+'%' : '—';

  // Agents
  const agents = pos._openAgents || [];
  const bullAgents = agents.filter(a => (a.score||0) > 0);
  const bearAgents = agents.filter(a => (a.score||0) < 0);

  const reason = pos._openReason || (pos.auto ? 'Consensus agents + LMSR' : 'Ouverture manuelle');

  body.innerHTML = `
    <div class="why-section">
      <div class="why-section-title">📍 Position</div>
      <div class="why-metric-row"><span class="why-metric-lbl">Paire</span><span class="why-metric-val">${pos.pair}</span></div>
      <div class="why-metric-row"><span class="why-metric-lbl">Direction</span><span class="why-metric-val" style="color:${pos.side==='long'?'var(--up)':'var(--down)'}">${pos.side==='long'?'↑ LONG':'↓ SHORT'}</span></div>
      <div class="why-metric-row"><span class="why-metric-lbl">Ouverte depuis</span><span class="why-metric-val">${sinceStr}</span></div>
      <div class="why-metric-row"><span class="why-metric-lbl">P&L actuel</span><span class="why-metric-val" style="color:${pnlCol}">${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}% (${pnlUsd>=0?'+':''}$${pnlUsd.toFixed(2)})</span></div>
    </div>

    <div class="why-section">
      <div class="why-section-title">🧠 Raison d'ouverture</div>
      <div class="why-reason">${reason}</div>
      <div class="why-metric-row"><span class="why-metric-lbl">Mode</span><span class="why-metric-val">${pos.auto ? '🤖 Bot automatique' : '🎛️ Manuel'}</span></div>
    </div>

    <div class="why-section">
      <div class="why-section-title">📊 Indicateurs du marché</div>
      <div class="why-metric-row"><span class="why-metric-lbl">Régime</span><span class="why-metric-val">${regime.toUpperCase()}</span></div>
      <div class="why-metric-row"><span class="why-metric-lbl">RSI 14</span><span class="why-metric-val">${rsi}</span></div>
      <div class="why-metric-row"><span class="why-metric-lbl">Momentum</span><span class="why-metric-val">${mom}</span></div>
      <div class="why-metric-row"><span class="why-metric-lbl">LMSR (conviction)</span><span class="why-metric-val">${lmsr}</span></div>
      <div class="why-metric-row"><span class="why-metric-lbl">Prix entrée</span><span class="why-metric-val">${entryPrice.toFixed(dec)}</span></div>
    </div>

    ${agents.length > 0 ? `
    <div class="why-section">
      <div class="why-section-title">🤝 Agents ayant voté (${agents.length})</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">
        ${bullAgents.length} haussiers · ${bearAgents.length} baissiers
      </div>
      <div class="why-agent-list">
        ${agents.map(a => `
          <span class="why-agent ${(a.score||0)>0?'bull':'bear'}">
            ${a.emoji||''} ${a.name} ${(a.score>=0?'+':'')}${(a.score||0).toFixed(2)}
          </span>
        `).join('')}
      </div>
    </div>` : ''}

    ${(pos.tp || pos.sl) ? `
    <div class="why-section">
      <div class="why-section-title">🎯 Objectifs</div>
      ${pos.tp ? `<div class="why-metric-row"><span class="why-metric-lbl">Take Profit</span><span class="why-metric-val" style="color:var(--up)">${pos.tp.toFixed(dec)}</span></div>` : ''}
      ${pos.sl ? `<div class="why-metric-row"><span class="why-metric-lbl">Stop Loss</span><span class="why-metric-val" style="color:var(--down)">${pos.sl.toFixed(dec)}</span></div>` : ''}
    </div>` : ''}
  `;

  overlay.classList.add('open');
}
window.openWhyModal = openWhyModal;


// ════════════════════════════════════════════════════════════
// RESET P&L SESSION — Recalibrer les compteurs sans perdre l'apprentissage
// ════════════════════════════════════════════════════════════
function resetPnlSession() {
  if (!confirm('Recalibrer les compteurs de P&L ? L\'apprentissage du bot ne sera PAS perdu.')) return;
  const current = S.portfolio || 0;
  S._startPortfolio = current;
  S.pnl24h = 0;
  if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
  S.pnlPeriod.todayStartPortfolio = current;
  S.pnlPeriod.todayDate           = _getTodayKey();
  if (typeof showToast === 'function') {
    showToast('🔄 Compteurs P&L recalibrés · Apprentissage préservé', 4000, 'win');
  }
  try { if (typeof saveState === 'function') saveState(); } catch(e) {}
  try { if (typeof renderHome === 'function') renderHome(); } catch(e) {}
}
window.resetPnlSession = resetPnlSession;


// ════════════════════════════════════════════════════════════
// SAVE FEE — Persistance d'un enregistrement de frais dans IndexedDB
// ════════════════════════════════════════════════════════════
async function saveFeeRecord(feeRecord) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FEES, 'readwrite');
    tx.objectStore(STORE_FEES).add({
      ...feeRecord,
      savedAt: new Date().toISOString(),
      region:  S.taxConfig.region
    });
  } catch(e) { /* Silencieux */ }
}
window.saveFeeRecord = saveFeeRecord;


// ════════════════════════════════════════════════════════════
// SAVE STATE — Persistance principale (IndexedDB → localStorage fallback)
// ════════════════════════════════════════════════════════════
async function saveState(silent = false) {
  const snap = buildSnapshot();
  // 1. IndexedDB principal
  try {
    const db = await openDB();
    return new Promise(res => {
      const tx  = db.transaction(STORE_STATE, 'readwrite');
      const req = tx.objectStore(STORE_STATE).put(snap);
      req.onsuccess = () => {
        if (!silent) updateSaveIndicator('saved');
        res(true);
      };
      req.onerror = () => res(false);
    });
  } catch(e) {
    // 2. Fallback localStorage
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      if (!silent) updateSaveIndicator('saved');
    } catch(le) { /* quota — silencieux */ }
    return false;
  }
}
window.saveState = saveState;


// ════════════════════════════════════════════════════════════
// STOP SIM — Arrêt de la boucle de jeu
// ════════════════════════════════════════════════════════════
function stopSim() {
  if (!_simRunning) return;
  _simRunning = false;
  clearInterval(_simInterval);
  _simInterval = null;
  updateSimBtn();
  _releaseWakeLock();
  updateSaveIndicator('saving');
  saveState(false).then(() => showToast('⏸ Auto-apprentissage en pause · données sauvegardées', 2800, 'user'));
  S.chainLog.push({ icon:'⏸', desc:'Auto-apprentissage en pause · cycle #'+S.cycle, hash:rndHash(), time:nowStr() });
}
window.stopSim = stopSim;


// ════════════════════════════════════════════════════════════
// TOGGLE BAR — Bascule entre les barres (auto / man / param)
// ════════════════════════════════════════════════════════════
function toggleBar(barName) {
  const autoBar  = document.getElementById('autoBar');
  const manBar   = document.getElementById('manBar');
  const paramBar = document.getElementById('paramBar');
  if (!autoBar || !manBar) return;

  const closeAll = () => {
    autoBar.classList.remove('open');
    manBar.classList.remove('open');
    if (paramBar) paramBar.classList.remove('open');
  };

  if (barName === 'auto') {
    if (autoBar.classList.contains('open')) {
      autoBar.classList.remove('open');
      try { localStorage.setItem(BARS_KEY, 'closed'); } catch(e) {}
    } else {
      closeAll();
      autoBar.classList.add('open');
      try { localStorage.setItem(BARS_KEY, 'auto'); } catch(e) {}
    }
  } else if (barName === 'man') {
    if (manBar.classList.contains('open')) {
      manBar.classList.remove('open');
      try { localStorage.setItem(BARS_KEY, 'closed'); } catch(e) {}
    } else {
      closeAll();
      manBar.classList.add('open');
      try { localStorage.setItem(BARS_KEY, 'man'); } catch(e) {}
    }
  } else if (barName === 'param') {
    if (paramBar && paramBar.classList.contains('open')) {
      paramBar.classList.remove('open');
      try { localStorage.setItem(BARS_KEY, 'closed'); } catch(e) {}
    } else if (paramBar) {
      closeAll();
      paramBar.classList.add('open');
      try { localStorage.setItem(BARS_KEY, 'param'); } catch(e) {}
    }
  }
}
window.toggleBar = toggleBar;


window.toggleFullPower = function() {
  const btn = document.getElementById('fpBtn');
  if (S.fullPowerMode) {
    disableFullPowerMode();
    if (btn) { btn.classList.remove('active'); btn.querySelector('span:last-child').textContent = 'Plein régime'; }
  } else {
    const n = enableFullPowerMode();
    if (btn) { btn.classList.add('active'); btn.querySelector('span:last-child').textContent = '100% · '+n; }
  }
};


function toggleSim() {
  if (_simRunning) stopSim(); else startSim();
}
window.toggleSim = toggleSim;


// ════════════════════════════════════════════════════════════
// UPDATE ACTION BRICKS — Refresh des cartes "ACTIONS"
// ════════════════════════════════════════════════════════════
function updateActionBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const brick = document.getElementById('actbrick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl   = document.getElementById('abpx_' + pairKey);
    const sigEl  = document.getElementById('absig_' + pairKey);
    const lmsrEl = document.getElementById('ablmsr_' + pairKey);
    const wrEl   = document.getElementById('abwr_' + pairKey);
    const trEl   = document.getElementById('abtr_' + pairKey);

    // Paire en pause
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'action-brick sig-hold paused';
      if (pxEl) {
        const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
        pxEl.textContent = priceStr;
      }
      if (sigEl)  sigEl.textContent  = '⏸ PAUSE';
      if (lmsrEl) lmsrEl.textContent = '—';
      if (wrEl)   { wrEl.textContent = '—'; wrEl.className = 'ab-wr'; }
      if (trEl)   trEl.textContent  = '';
      return;
    }

    // Prix + %24h
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24    = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // LMSR + signal
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const pct  = prob * 100;
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    const botPos    = (S.openPositions || []).find(p => p.pair === pair && p.auto === true);

    let sigText, brickCls;
    if (manualPos) {
      sigText  = (manualPos.side === 'long' ? '🔒 LONG' : '🔒 SHORT');
      brickCls = manualPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (botPos) {
      sigText  = (botPos.side === 'long' ? '🟢 LONG' : '🔴 SHORT');
      brickCls = botPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (prob > 0.6) {
      sigText = '🤖 BUY';   brickCls = 'action-brick sig-buy';
    } else if (prob < 0.4) {
      sigText = '🤖 SELL';  brickCls = 'action-brick sig-sell';
    } else {
      sigText = 'HOLD';     brickCls = 'action-brick sig-hold';
    }
    brick.className = brickCls;

    if (sigEl) sigEl.textContent = sigText;

    if (lmsrEl) {
      const arrow = pct >= 50 ? '↑' : '↓';
      lmsrEl.textContent = arrow + pct.toFixed(0) + '%';
    }

    if (wrEl) {
      const pWin = ps.totalTrades > 0 ? Math.round(ps.winTrades / ps.totalTrades * 100) : null;
      if (pWin !== null) {
        wrEl.textContent = pWin + '% WR';
        wrEl.className = 'ab-wr ' + (pWin >= 60 ? 'good' : pWin >= 40 ? 'mid' : 'bad');
      } else {
        wrEl.textContent = '— WR';
        wrEl.className = 'ab-wr';
      }
    }

    if (trEl) {
      trEl.textContent = (ps.totalTrades || 0) + ' tr';
      trEl.style.color = 'var(--t3)';
    }

    // Sparkline de fond
    if (ps.candles && ps.candles.length >= 2) {
      let sparkColor = cfg.color;
      if (prob > 0.6) sparkColor = '#00e87a';
      else if (prob < 0.4) sparkColor = '#ff3d6b';
      _drawSparkline('abspark_' + pairKey, ps.candles, sparkColor, prob >= 0.5);
    }

    // RSI dot
    const rsiDot = document.getElementById('abrsi_' + pairKey);
    if (rsiDot) {
      const rsi = _computeRSI14(ps.candles);
      if (rsi !== null) {
        let rsiCls = 'neutral';
        if (rsi < 30)      rsiCls = 'oversold';
        else if (rsi > 70) rsiCls = 'overbought';
        rsiDot.className = 'ab-rsi-dot ' + rsiCls;
        rsiDot.title = 'RSI ' + rsi.toFixed(0);
      }
    }

    // Intensité conviction
    const convStrength = Math.abs(prob - 0.5) * 2;
    if (convStrength > 0.6) brick.setAttribute('data-conv', 'strong');
    else                    brick.removeAttribute('data-conv');

    // Marqueur mode manuel
    if (_isPairManual(pair)) {
      brick.setAttribute('data-manual', '1');
      brick.style.setProperty('--accent', 'var(--ice)');
    } else {
      brick.removeAttribute('data-manual');
      brick.style.setProperty('--accent', cfg.color);
    }
  });
}
window.updateActionBricks = updateActionBricks;


// ════════════════════════════════════════════════════════════
// UPDATE MAN BRICKS — Refresh des cartes manuelles
// ════════════════════════════════════════════════════════════
function updateManBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const brick = document.getElementById('manbrick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl    = document.getElementById('mbpx_' + pairKey);
    const sugEl   = document.getElementById('mbsug_' + pairKey);
    const pnlEl   = document.getElementById('mbpnl_' + pairKey);
    const badgeEl = document.getElementById('mbbadge_' + pairKey);

    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'man-brick paused';
      return;
    }

    // Prix
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24 = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // Sparkline
    if (ps.candles && ps.candles.length >= 2) {
      _drawSparkline('mbspark_' + pairKey, ps.candles, cfg.color, true);
    }

    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    let suggestedSide = 'hold';
    let suggestedSideLabel = 'HOLD';
    if (prob > 0.55)      { suggestedSide = 'bull'; suggestedSideLabel = '↑ LONG'; }
    else if (prob < 0.45) { suggestedSide = 'bear'; suggestedSideLabel = '↓ SHORT'; }

    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);

    if (manualPos) {
      const pnlUsd = manualPos.pnlUsdt || 0;
      const pnlPct = manualPos.pnl || 0;
      const isWin = pnlUsd >= 0;
      const side = manualPos.side === 'long' ? '↑ LONG' : '↓ SHORT';
      const sideCls = manualPos.side === 'long' ? 'has-pos-long' : 'has-pos-short';
      brick.className = 'man-brick ' + sideCls;

      if (badgeEl) badgeEl.textContent = side;

      if (sugEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign = pnlUsd >= 0 ? '+' : '';
        sugEl.innerHTML = `<span style="color:var(--t2);">Mise $${(manualPos.stakeUsdt || 0).toFixed(0)}</span> · <span style="color:${pnlCol};font-weight:700;">${sign}${pnlPct.toFixed(2)}%</span>`;
      }

      if (pnlEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign = pnlUsd >= 0 ? '+' : '';
        pnlEl.innerHTML = `<span style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)}</span>`;
      }
    } else {
      brick.className = 'man-brick';
      if (badgeEl) badgeEl.textContent = 'PRÉT';

      const conviction = Math.abs(prob - 0.5) * 2;
      const baseStake  = Math.max(10, Math.round((S.tradingAccount || 100) * 0.05));
      const suggStake  = Math.min(baseStake * (1 + conviction), (S.tradingAccount || 100) * 0.15);

      if (sugEl) {
        sugEl.innerHTML = `<span class="mb-suggest-side ${suggestedSide}">${suggestedSideLabel}</span> · mise $${suggStake.toFixed(0)}`;
      }

      if (pnlEl) {
        const convPct = (conviction * 100).toFixed(0);
        pnlEl.innerHTML = `<span style="font-size:9px;color:var(--t3);">Conviction ${convPct}%</span>`;
      }
    }
  });
}
window.updateManBricks = updateManBricks;


// ════════════════════════════════════════════════════════════
// UPDATE PAIR BRICKS — Refresh des cartes paires (avec position)
// ════════════════════════════════════════════════════════════
function updatePairBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const brick = document.getElementById('brick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl  = document.getElementById('pbpx_' + pairKey);
    const stEl  = document.getElementById('pbst_' + pairKey);
    const pnlEl = document.getElementById('pbpnl_' + pairKey);
    const cdEl  = document.getElementById('pbcd_' + pairKey);

    // Prix
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24 = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'pair-brick brick-paused';
      if (stEl)  stEl.innerHTML  = '<span style="color:var(--t3);">Sous-performance</span>';
      if (pnlEl) pnlEl.innerHTML = '<span class="pb-idle-pnl">Désactivée auto</span>';
      if (cdEl)  cdEl.textContent = '';
      return;
    }

    const pos = (S.openPositions || []).find(p => p.pair === pair);

    if (pos) {
      const sideLabel = pos.side === 'long' ? 'LONG' : 'SHORT';
      const sideArrow = pos.side === 'long' ? '↑' : '↓';
      const sideCol   = pos.side === 'long' ? 'var(--up)' : 'var(--down)';
      const stakeStr  = '$' + (pos.stakeUsdt || 0).toFixed(0);
      const pnlUsd    = pos.pnlUsdt || 0;
      const pnlPct    = pos.pnl || 0;
      const isWin     = pnlUsd >= 0;

      let stateCls = 'brick-idle';
      if      (pos.side === 'long'  && isWin)  stateCls = 'brick-long-win';
      else if (pos.side === 'long'  && !isWin) stateCls = 'brick-long-loss';
      else if (pos.side === 'short' && isWin)  stateCls = 'brick-short-win';
      else                                      stateCls = 'brick-short-loss';
      brick.className = 'pair-brick ' + stateCls;

      if (stEl) {
        stEl.innerHTML = `<span class="pb-side" style="color:${sideCol};">${sideArrow}${sideLabel}</span><span class="pb-sep">·</span><span class="pb-stake">${stakeStr}</span>`;
      }

      if (pnlEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign = pnlUsd >= 0 ? '+' : '';
        pnlEl.innerHTML = `
          <span style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)}</span>
          <span class="pb-pnl-pct">${sign}${pnlPct.toFixed(2)}%</span>
        `;
      }

      if (cdEl) {
        const elapsedMs  = Date.now() - (pos.openedAt || pos.entryTs || Date.now());
        const elapsedMin = Math.floor(elapsedMs / 60000);
        const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
        const elapsedStr = elapsedMin + ':' + String(elapsedSec).padStart(2, '0');

        const conv = pos.conviction || 0.4;
        const maxCycles  = Math.ceil(8 / Math.max(0.1, conv));
        const cyclesUsed = pos._holdCycles || 0;
        const cyclesLeft = Math.max(0, maxCycles - cyclesUsed);
        const remainingMs = cyclesLeft * 160000;
        const remMin = Math.floor(remainingMs / 60000);

        cdEl.innerHTML = `⏱ ${elapsedStr} <span style="color:var(--t3);opacity:.5;">·</span> ~${remMin}m`;
      }
    } else {
      brick.className = 'pair-brick brick-idle';
      if (stEl)  stEl.innerHTML  = '<span style="color:var(--t3);">En veille</span>';
      if (pnlEl) pnlEl.innerHTML = '<span class="pb-idle-pnl">Aucune position</span>';
      if (cdEl)  cdEl.textContent = '';
    }

    if (ps.candles && ps.candles.length >= 2) {
      const sparkColor = pos
        ? (pos.pnlUsdt >= 0
           ? (pos.side === 'long' ? '#00e87a' : '#ff3d6b')
           : '#f5c842')
        : cfg.color;
      _drawSparkline('pbspark_' + pairKey, ps.candles, sparkColor, pos ? pos.pnlUsdt >= 0 : true);
    }

    const tpBar  = document.getElementById('pbtpbar_'  + pairKey);
    const tpFill = document.getElementById('pbtpfill_' + pairKey);
    if (pos && tpBar && tpFill) {
      const pnlPct  = pos.pnl || 0;
      const conv    = pos.conviction || 0.4;
      const tpTarget = Math.max(1.5, conv * 4);
      const progress = Math.max(-100, Math.min(100, (pnlPct / tpTarget) * 100));
      tpBar.style.display = 'block';
      tpFill.style.width = Math.abs(progress) + '%';
      tpFill.classList.toggle('negative', progress < 0);
    } else if (tpBar) {
      tpBar.style.display = 'none';
    }
  });
}
window.updatePairBricks = updatePairBricks;


// ════════════════════════════════════════════════════════════
// VALIDATION CAPITAL — Garde-fous d'exposition
// ════════════════════════════════════════════════════════════
function validateInvestmentCapProvisioned(proposedStake) {
  if (!proposedStake || proposedStake <= 0) return { ok: true, cap: Infinity, mode: 'noop' };
  const engaged  = (S.openPositions || []).reduce((s,p) => s + (p.stakeUsdt || 0), 0);
  const maxLossesOpen = engaged;  // worst-case : 100% loss per open position
  const borrowed = S.leverageBorrowed || 0;
  if (borrowed > 0) {
    // Levier actif : cap = levier emprunté − pertes max prévues
    const cap = Math.max(0, borrowed - maxLossesOpen);
    return { ok: proposedStake <= cap, cap, mode: 'leverage', engaged, maxLossesOpen, borrowed };
  }
  // Sans levier : cap = tradingAccount − sommes engagées
  const cap = Math.max(0, (S.tradingAccount || 0) - engaged);
  return { ok: proposedStake <= cap, cap, mode: 'no_leverage', engaged, tradingAccount: S.tradingAccount };
}
window.validateInvestmentCapProvisioned = validateInvestmentCapProvisioned;


function validateTotalExposure(proposedStake, proposedLevBonus, proposedConviction) {
  const alreadyStaked   = S.openPositions.reduce((s,p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  const alreadyBorrowed = S.leverageBorrowed || 0;
  const maxAllowed      = S.tradingAccount + (S.leverageReserve || 0);
  const newExposure     = (proposedStake || 0) + (proposedLevBonus || 0);
  const totalAfter      = alreadyStaked + newExposure;

  // Marge de 2% pour les arrondis
  if (totalAfter > maxAllowed * 1.02) {
    const available = Math.max(0, maxAllowed - alreadyStaked);
    return { ok: false, available, maxAllowed, alreadyStaked, totalAfter };
  }

  // ── AUTO-LIMITE LEVIER 80% (100% si conviction > 0.75) ──
  // Garde toujours 20% de marge de sécurité, sauf signal très fort
  const _convForCap = (typeof proposedConviction === 'number' && !isNaN(proposedConviction))
                      ? proposedConviction
                      : 0.5;
  const _useFullCap = _convForCap > 0.75;
  const _cap        = _useFullCap ? 1.00 : 0.80;
  const leverageCap = maxAllowed * _cap;
  if (totalAfter > leverageCap) {
    const available = Math.max(0, leverageCap - alreadyStaked);
    return { ok: false, available, maxAllowed: leverageCap, alreadyStaked, totalAfter,
             autoCap: true, capLevel: _cap, convictionUsed: _convForCap };
  }

  // Validation supplémentaire : sizing conforme spec utilisateur
  const _p5 = validateInvestmentCapProvisioned(proposedStake || 0);
  if (!_p5.ok) {
    return { ok: false, available: _p5.cap, maxAllowed, alreadyStaked, totalAfter,
             phase5: true, phase5Mode: _p5.mode, phase5Cap: _p5.cap };
  }
  return { ok: true, available: maxAllowed - alreadyStaked };
}
window.validateTotalExposure = validateTotalExposure;
