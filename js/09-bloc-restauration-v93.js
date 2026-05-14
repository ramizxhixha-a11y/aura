// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 09/10
// Contient : bloc-restauration-v93
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════

// ── Variables module-level restaurées ──
const BARS_KEY = 'nexus_bars_state';  // 'auto' | 'man' | 'closed'
const DB_NAME      = 'NEXUS_DB';
const LONG_PRESS_MS = 600;
const SAVE_KEY    = 'nexus_state_v2';   // localStorage fallback key
const STORE_FEES   = 'fees';
const STORE_STATE  = 'state';     // snapshot complet pour reprise
let _freshPricesInRow   = 0;           // compteur pour reprise après retour
let _lastRealPriceTs    = Date.now();  // dernier tick prix RÉEL reçu (CG ou Binance, pas sim)
let _longPressPair = null;
let _longPressTimer = null;
let _net10sSaveTriggered = false;      // pour trigger save une fois à 10s offline
let _netOfflineSinceTs  = 0;           // moment du début de la coupure
let _netwatchPausedBot  = false;       // true si on a pausé le bot nous-mêmes
let _netwatchState      = 'online';    // 'online' | 'offline' | 'recovering'
let _simEverStarted = false;  // v7.1 P7: vrai après le 1er startSim() → affiche PAUSE au lieu de DÉMARRAGE
let _simInterval  = null;
let _simRunning   = false;

// ── 58 fonction(s) depuis v69 ──

function _abRecordResult(arm, pnlPct, pnlUsd) {
  if (!S.abTesting) return;
  const target = (arm === 'B') ? S.abTesting.armB : S.abTesting.armA;
  if (!target) return;
  target.trades = (target.trades || 0) + 1;
  target.pnl = (target.pnl || 0) + pnlUsd;
  if (pnlPct >= 0) target.wins = (target.wins || 0) + 1;
  else target.losses = (target.losses || 0) + 1;
  
  // Vérifier si on doit lancer le verdict
  const cfg = S.paperRealConfig || {};
  const threshold = cfg.abTestingTradesPerArm || 50;
  if (S.abTesting.armA.trades >= threshold && S.abTesting.armB.trades >= threshold) {
    _abComputeVerdict();
  }
}
window._abRecordResult = _abRecordResult;
if(typeof _abRecordResult==='function') window._abRecordResult = _abRecordResult;

function _applyPaperRealProtection() {
  if (S.tradingMode !== 'paperReal' || !S.openPositions) return;
  const cfg = S.paperRealConfig || {};
  
  S.openPositions.forEach(pos => {
    if (!pos.auto || !pos._paperRealMode) return;
    if (!isFinite(pos.entryPrice) || pos.entryPrice <= 0) return;
    
    const isLong = pos.side === 'long';
    let slPrice = null;
    let usedAtr = false;
    
    // v8.0 PHASE 4a · Récupérer les params A/B si applicable
    let slMult = cfg.slAtrMultiplier || 2.0;
    let tpMult = cfg.tpAtrMultiplier || 1.5;
    if (pos._abArm && typeof _abGetParams === 'function') {
      const abParams = _abGetParams(pos._abArm);
      if (abParams) {
        slMult = abParams.slAtrMult || slMult;
        tpMult = abParams.tpAtrMult || tpMult;
      }
    }
    
    // Tenter d'utiliser l'ATR si disponible (méthode pro universelle)
    if (pos.pair && typeof _getPairAdaptiveProfile === 'function') {
      const profile = _getPairAdaptiveProfile(pos.pair);
      if (profile && profile.slAbsoluteAtr && isFinite(profile.slAbsoluteAtr) && profile.slAbsoluteAtr > 0) {
        const slDistance = slMult * profile.slAbsoluteAtr;
        const tpDistance = tpMult * profile.slAbsoluteAtr;
        slPrice = isLong ? pos.entryPrice - slDistance : pos.entryPrice + slDistance;
        const tpPriceAtr = isLong ? pos.entryPrice + tpDistance : pos.entryPrice - tpDistance;
        usedAtr = true;
        // Mémoriser pour traçabilité
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
    
    // Fallback : SL en %
    const slPct = cfg.stopLossPct || 3.0;
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
if(typeof _applyPaperRealProtection==='function') window._applyPaperRealProtection = _applyPaperRealProtection;

function _attachLongPressToBricks() {
  document.querySelectorAll('.action-brick, .pair-brick').forEach(brick => {
    if (brick.dataset.lpAttached === '1') return;
    brick.dataset.lpAttached = '1';
    
    const pair = brick.getAttribute('data-pair');
    if (!pair) return;
    
    const startFn = (e) => {
      // Only trigger long-press if there's an active position on this pair
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
    
    brick.addEventListener('touchstart', startFn, { passive: true });
    brick.addEventListener('touchend', cancelFn);
    brick.addEventListener('touchmove', cancelFn);
    brick.addEventListener('touchcancel', cancelFn);
    brick.addEventListener('mousedown', startFn);
    brick.addEventListener('mouseup', cancelFn);
    brick.addEventListener('mouseleave', cancelFn);
    // Override click when long-press fires
    brick.addEventListener('click', (e) => {
      if (_longPressTimer === null && _longPressPair === pair) {
        // Was long-pressed, don't open detail
        _longPressPair = null;
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  });
}
window._attachLongPressToBricks = _attachLongPressToBricks;
if(typeof _attachLongPressToBricks==='function') window._attachLongPressToBricks = _attachLongPressToBricks;

window._autoSnapshotBeforeLeverage = function() { _maybeCreateAutoSnapshot('leverage'); };
if(typeof _autoSnapshotBeforeLeverage==='function') window._autoSnapshotBeforeLeverage = _autoSnapshotBeforeLeverage;

window._autoSnapshotOnTradeClose = function() { _maybeCreateAutoSnapshot('trade_close'); };
if(typeof _autoSnapshotOnTradeClose==='function') window._autoSnapshotOnTradeClose = _autoSnapshotOnTradeClose;

function _checkContextAllowance(pair, side) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.contextRefusalEnabled) return { allow: true };
  if (S.tradingMode !== 'paperReal') return { allow: true };
  
  // Construire le contexte courant
  const regime = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : 'calm';
  const hour = new Date().getHours();
  let pairTier = 'unknown';
  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile && profile.relRatio !== null) {
      const ratio = profile.relRatio;
      if (ratio < 0.7) pairTier = 'calm';
      else if (ratio < 1.4) pairTier = 'mid';
      else pairTier = 'volatile';
    }
  }
  const sig = _getContextSignature(regime, hour, pairTier);
  const stats = _getContextStats(sig);
  
  if (stats.refused) {
    // Mémoriser pour le panneau de diagnostic
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
if(typeof _checkContextAllowance==='function') window._checkContextAllowance = _checkContextAllowance;

function _checkCorrelationLimit(pair, side) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.correlationLimitEnabled) return { allow: true, decimate: 1.0 };
  if (!S.openPositions || S.openPositions.length === 0) return { allow: true, decimate: 1.0 };
  
  const threshold = cfg.correlationThreshold || 0.7;
  const decimateFactor = cfg.correlationDecimateFactor || 0.5;
  
  // Pour chaque position ouverte, vérifier la corrélation
  for (const openPos of S.openPositions) {
    if (!openPos.auto || !openPos.pair) continue;
    if (openPos.pair === pair) continue; // même paire, pas concerné
    
    const corr = _getPairCorrelation(pair, openPos.pair);
    if (corr === null) continue;
    
    // Si même direction (long+long ou short+short) ET corrélation positive forte → cumul de risque
    const sameDirection = openPos.side === side;
    if (sameDirection && corr > threshold) {
      // Mémoriser
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastCorrelationDecision = {
        pair: pair,
        correlatedWith: openPos.pair,
        value: corr,
        action: 'decimate',
        ts: Date.now()
      };
      S.adaptiveState.correlationLimitActions = (S.adaptiveState.correlationLimitActions || 0) + 1;
      return {
        allow: true,
        decimate: decimateFactor,
        correlatedWith: openPos.pair,
        value: corr
      };
    }
    
    // Direction opposée ET forte corrélation négative → aussi cumul (anti-corrélation forte = mêmes mouvements inversés)
    if (!sameDirection && corr < -threshold) {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastCorrelationDecision = {
        pair: pair,
        correlatedWith: openPos.pair,
        value: corr,
        action: 'decimate',
        ts: Date.now()
      };
      S.adaptiveState.correlationLimitActions = (S.adaptiveState.correlationLimitActions || 0) + 1;
      return {
        allow: true,
        decimate: decimateFactor,
        correlatedWith: openPos.pair,
        value: corr
      };
    }
  }
  
  return { allow: true, decimate: 1.0 };
}
window._checkCorrelationLimit = _checkCorrelationLimit;
if(typeof _checkCorrelationLimit==='function') window._checkCorrelationLimit = _checkCorrelationLimit;

function _combineMultiModeStats(stats) {
  
  const currentMode = S.tradingMode || 'sim';
  let totalWeightedWins = 0;
  let totalWeightedLosses = 0;
  let totalRawTrades = 0;
  let sourcesUsed = 0;
  
  Object.keys(stats).forEach(mode => {
    const s = stats[mode] || {};
    const wins = s.wins || 0;
    const losses = s.losses || 0;
    if (wins + losses === 0) return;
    const weight = _getMemorySourceWeight(mode, currentMode);
    if (weight === 0) return;
    totalWeightedWins += wins * weight;
    totalWeightedLosses += losses * weight;
    totalRawTrades += wins + losses;
    sourcesUsed++;
  });
  
  const totalWeighted = totalWeightedWins + totalWeightedLosses;
  return {
    wr: totalWeighted > 0 ? totalWeightedWins / totalWeighted : null,
    weightedTrades: totalWeighted,
    rawTrades: totalRawTrades,
    sourcesUsed: sourcesUsed
  };
}
window._combineMultiModeStats = _combineMultiModeStats;
if(typeof _combineMultiModeStats==='function') window._combineMultiModeStats = _combineMultiModeStats;

function _computePnlByPeriod() {
  _checkAndRotatePeriods();
  const current = S.portfolio || 0;
  const period = S.pnlPeriod || {};
  
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
    week: compute(period.weekStartPortfolio),
    month: compute(period.monthStartPortfolio)
  };
}
window._computePnlByPeriod = _computePnlByPeriod;
if(typeof _computePnlByPeriod==='function') window._computePnlByPeriod = _computePnlByPeriod;

function _detectSystemicBearStress() {
  
  const regime = S._paperRealCurrentRegime || (typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm');
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
if(typeof _detectSystemicBearStress==='function') window._detectSystemicBearStress = _detectSystemicBearStress;

function _enrichTradeContextOnClose(contextId, pnlPct, pnlUsd, holdMs) {
  if (!contextId || !S.tradeContextMemory) return;
  // Trouver le contexte (parcours arrière car le plus récent est en fin)
  for (let i = S.tradeContextMemory.length - 1; i >= 0; i--) {
    if (S.tradeContextMemory[i].contextId === contextId) {
      S.tradeContextMemory[i].closedAt = Date.now();
      S.tradeContextMemory[i].pnlPct = +pnlPct.toFixed(3);
      S.tradeContextMemory[i].pnlUsd = +pnlUsd.toFixed(3);
      S.tradeContextMemory[i].holdMinutes = Math.round(holdMs / 60000);
      S.tradeContextMemory[i].won = pnlPct >= 0;
      return;
    }
  }
}
window._enrichTradeContextOnClose = _enrichTradeContextOnClose;
if(typeof _enrichTradeContextOnClose==='function') window._enrichTradeContextOnClose = _enrichTradeContextOnClose;

function _evaluatePairPerformance() {
  if (!S._pausedPairs) S._pausedPairs = {};
  if (!S._pairLastEvalCount) S._pairLastEvalCount = {};
  
  Object.keys(PAIRS).forEach(pair => {
    const ps = S.pairStates[pair];
    if (!ps) return;
    
    const closedTrades = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
    const count = closedTrades.length;
    const lastEvalCount = S._pairLastEvalCount[pair] || 0;
    
    // Evaluate every 50 closed trades
    if (count >= lastEvalCount + 50) {
      // Use last 50 trades
      const recent = closedTrades.slice(-50);
      const wins = recent.filter(t => t.pnlUsdt > 0).length;
      const winRate = wins / recent.length * 100;
      
      if (winRate < 40 && !S._pausedPairs[pair]) {
        // Pause
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
        // Resume
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
if(typeof _evaluatePairPerformance==='function') window._evaluatePairPerformance = _evaluatePairPerformance;

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
if(typeof _findMostVolatilePair==='function') window._findMostVolatilePair = _findMostVolatilePair;

function _forecastVolatility(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;
  
  // Récupérer les bougies (priorité Binance WS)
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 20) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 20) {
    candles = ps.candles;
  }
  if (!candles || candles.length < 20) return null;
  
  // Calculer les rendements log des 20 dernières bougies
  const closes = candles.slice(-20).map(c => c.c).filter(c => isFinite(c) && c > 0);
  if (closes.length < 20) return null;
  
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i-1]));
  }
  
  // Variance moyenne (sigma² long terme)
  const meanReturn = returns.reduce((a,b) => a+b, 0) / returns.length;
  const longTermVar = returns.reduce((a,b) => a + (b - meanReturn) ** 2, 0) / returns.length;
  
  // Variance récente (5 dernières bougies)
  const recentReturns = returns.slice(-5);
  const recentMean = recentReturns.reduce((a,b) => a+b, 0) / recentReturns.length;
  const recentVar = recentReturns.reduce((a,b) => a + (b - recentMean) ** 2, 0) / recentReturns.length;
  
  // GARCH(1,1) simplifié : 
  // forecast_var = omega + alpha * (last_return²) + beta * recent_var
  // Avec : omega = 0.1 × longTermVar, alpha = 0.1, beta = 0.85 (paramètres standard)
  const omega = 0.1 * longTermVar;
  const lastReturnSq = returns[returns.length - 1] ** 2;
  const forecastVar = omega + 0.1 * lastReturnSq + 0.85 * recentVar;
  const forecastVol = Math.sqrt(forecastVar);
  const longTermVol = Math.sqrt(longTermVar);
  
  // Ratio prévision / volatilité long terme
  const ratio = longTermVol > 0 ? forecastVol / longTermVol : 1.0;
  
  return {
    longTermVolPct: +(longTermVol * 100).toFixed(3),
    forecastVolPct: +(forecastVol * 100).toFixed(3),
    ratio: +ratio.toFixed(2),
    isSpike: ratio > (S.paperRealConfig?.volatilitySpikeMultiplier || 1.8)
  };
}
window._forecastVolatility = _forecastVolatility;
if(typeof _forecastVolatility==='function') window._forecastVolatility = _forecastVolatility;

function _fpEmergencyCheck() {
  if (!S.fullPowerMode || !S._fpInitialCapital || S._fpStopTriggered) return;
  const curCap = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  const latentPnl = (S.openPositions || []).reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const effectiveCap = curCap + latentPnl;
  const drawdown = (S._fpInitialCapital - effectiveCap) / S._fpInitialCapital;
  
  if (drawdown >= 0.05) {  // −5% → STOP
    S._fpStopTriggered = true;
    
    // 1. Désactiver Plein régime
    if (typeof disableFullPowerMode === 'function') disableFullPowerMode();
    const fpBtn = document.getElementById('fpBtn');
    if (fpBtn) {
      fpBtn.classList.remove('active');
      const span = fpBtn.querySelector('span:last-child');
      if (span) span.textContent = 'Plein régime';
    }
    
    // 2. Fermer toutes les positions ouvertes
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
if(typeof _fpEmergencyCheck==='function') window._fpEmergencyCheck = _fpEmergencyCheck;

function _getAdaptiveConsecLossThreshold() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.adaptiveStopLosses) return cfg.maxConsecLosses || 3;
  const wr = _getEffectiveWR();
  if (wr === null) return cfg.maxConsecLosses || 3;  // pas assez de données
  // Formule : seuil = 3 + (1 - wr) × 6, borné [3, 6]
  // wr=0.7 → 3 + 0.3*6 = 4.8 → 4
  // wr=0.5 → 3 + 0.5*6 = 6 → 6
  // wr=0.3 → 3 + 0.7*6 = 7.2 → 6 (cappé)
  let thresh = Math.round(3 + (1 - wr) * 6);
  thresh = Math.max(3, Math.min(6, thresh));
  // Mémoriser pour le panneau de diagnostic
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastConsecLossThresh = thresh;
  S.adaptiveState.lastEffectiveWR = wr;
  return thresh;
}
window._getAdaptiveConsecLossThreshold = _getAdaptiveConsecLossThreshold;
if(typeof _getAdaptiveConsecLossThreshold==='function') window._getAdaptiveConsecLossThreshold = _getAdaptiveConsecLossThreshold;

function _getContextSignature(regime, hour, pairTier) {
  const r = regime || 'unknown';
  const h = _getHourBucket(hour || 0);
  const t = pairTier || 'unknown';
  return r + '·' + h + '·' + t;
}
window._getContextSignature = _getContextSignature;
if(typeof _getContextSignature==='function') window._getContextSignature = _getContextSignature;

function _getContextStats(signature) {
  if (!S.tradeContextMemory) return { wr: null, trades: 0, refused: false };
  let wins = 0, losses = 0;
  for (const c of S.tradeContextMemory) {
    if (c.closedAt === null) continue; // pas encore fermé
    const sig = _getContextSignature(c.regime, c.hour, _getPairTierFromContext(c));
    if (sig !== signature) continue;
    if (c.won) wins++; else losses++;
  }
  const total = wins + losses;
  if (total === 0) return { wr: null, trades: 0, refused: false };
  const wr = wins / total;
  const cfg = S.paperRealConfig || {};
  const minTrades = cfg.contextRefusalMinTrades || 20;
  const maxWR = cfg.contextRefusalMaxWR || 0.30;
  const refused = total >= minTrades && wr < maxWR;
  return { wr: wr, trades: total, refused: refused };
}
window._getContextStats = _getContextStats;
if(typeof _getContextStats==='function') window._getContextStats = _getContextStats;

function _getMemorySourceWeight(memoryMode, currentMode) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.transferLearningEnabled) {
    // Sans transfert : on n'utilise QUE la mémoire du mode courant
    return memoryMode === currentMode ? 1.0 : 0.0;
  }
  
  // Si on est dans le même mode → poids plein
  if (memoryMode === currentMode) return 1.0;
  
  
  // Une mémoire d'un mode "moins fiable" que le courant est dévaluée
  const weights = {
    real:      cfg.transferWeightReal || 1.0
  };
  
  
  
  const memReliability = weights[memoryMode] || 0.5;
  const curReliability = weights[currentMode] || 0.5;
  
  if (memReliability >= curReliability) {
    return 1.0;  // mémoire d'un mode plus fiable → 100%
  } else {
    return memReliability / curReliability;  // dévaluation proportionnelle
  }
}
window._getMemorySourceWeight = _getMemorySourceWeight;
if(typeof _getMemorySourceWeight==='function') window._getMemorySourceWeight = _getMemorySourceWeight;

function _getMultiModeMemoryStats() {
  const stats = {
    real: { wins: 0, losses: 0 }
  };
  
  
  if (Array.isArray(S.agentLessons)) {
    S.agentLessons.forEach(l => {
      if (l && typeof l.outcome === 'number') {
        if (l.outcome > 0) stats.sim.wins++;
        else if (l.outcome < 0) stats.sim.losses++;
      }
    });
  }
  
  
  if (S.paperRealStats) {
    }
  
  // Stats réel : depuis realStatsByPair (existant)
  if (S.realStatsByPair) {
    Object.values(S.realStatsByPair).forEach(s => {
      stats.real.wins += (s.wins || 0);
      stats.real.losses += (s.losses || 0);
    });
  }
  
  return stats;
}
window._getMultiModeMemoryStats = _getMultiModeMemoryStats;
if(typeof _getMultiModeMemoryStats==='function') window._getMultiModeMemoryStats = _getMultiModeMemoryStats;

function _getPairTierFromContext(ctx) {
  if (!ctx) return 'unknown';
  const ratio = ctx.pairRelRatio;
  if (ratio === null || ratio === undefined) return 'unknown';
  if (ratio < 0.7) return 'calm';
  if (ratio < 1.4) return 'mid';
  return 'volatile';
}
if(typeof _getPairTierFromContext==='function') window._getPairTierFromContext = _getPairTierFromContext;

function _getSharpeAllocMult(pair) {
  const allocs = _computeSharpeAllocations();
  return allocs[pair] || 1.0;
}
window._getSharpeAllocMult = _getSharpeAllocMult;
if(typeof _getSharpeAllocMult==='function') window._getSharpeAllocMult = _getSharpeAllocMult;

function _manConsignesWatchdog() {
  const positions = (S.openPositions || []).filter(p => p.auto !== true);
  positions.forEach(pos => {
    const pnlPct = pos.pnl || 0;
    const pnlUsd = pos.pnlUsdt || 0;
    const openedAt = pos._manOpenedAt || pos.openedAt || pos.entryTs || Date.now();
    const elapsedMin = (Date.now() - openedAt) / 60000;
    
    const maxLossPct = pos._manMaxLossPct || 2.0;
    const timeoutMin = pos._manTimeoutMin || 60;
    
    // Check: perte max dépassée (% du trading account)
    const tradingCap = S.tradingAccount || 1;
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
if(typeof _manConsignesWatchdog==='function') window._manConsignesWatchdog = _manConsignesWatchdog;

function _notifyTradeForExport() { /* désactivé · Q1:B */ }
window._notifyTradeForExport = _notifyTradeForExport;
if(typeof _notifyTradeForExport==='function') window._notifyTradeForExport = _notifyTradeForExport;

function _p5PreActionSave(action) {
  try {
    _p5MultiStorageSave();
    if (S && S.chainLog) {
      // Log silencieux, pas spammy
    }
  } catch(e) { console.warn('[P5 preAction]', e); }
}
if(typeof _p5PreActionSave==='function') window._p5PreActionSave = _p5PreActionSave;

function _restoreAutoBarState() {
  const autoBar = document.getElementById('autoBar');
  const manBar = document.getElementById('manBar');
  const paramBar = document.getElementById('paramBar');
  if (!autoBar || !manBar) return;
  let saved = 'auto';
  try { saved = localStorage.getItem(BARS_KEY) || 'auto'; } catch(e) {}
  autoBar.classList.remove('open');
  manBar.classList.remove('open');
  if (paramBar) paramBar.classList.remove('open');
  if (saved === 'auto') autoBar.classList.add('open');
  else if (saved === 'man') manBar.classList.add('open');
  else if (saved === 'param' && paramBar) paramBar.classList.add('open');
}
if(typeof _restoreAutoBarState==='function') window._restoreAutoBarState = _restoreAutoBarState;

function _updateAutoBarCounters() {
  const autoBar = document.getElementById('autoBar');
  const manBar = document.getElementById('manBar');
  const autoCounter = document.getElementById('autoBarCounter');
  const manCounter = document.getElementById('manBarCounter');
  const autoPaircount = document.getElementById('autoBarPairCount');
  const manPaircount = document.getElementById('manBarPairCount');
  
  const autoPositions = (S.openPositions || []).filter(p => p.auto === true).length;
  const manPositions = (S.openPositions || []).filter(p => p.auto !== true).length;
  
  // Auto bar
  if (autoBar && autoCounter) {
    if (autoPositions > 0) {
      autoBar.classList.add('has-active');
      autoCounter.textContent = autoPositions + ' active' + (autoPositions > 1 ? 's' : '');
    } else {
      autoBar.classList.remove('has-active');
      autoCounter.textContent = 'En veille';
    }
  }
  
  // Man bar
  if (manBar && manCounter) {
    if (manPositions > 0) {
      manBar.classList.add('has-active');
      manCounter.textContent = manPositions + ' active' + (manPositions > 1 ? 's' : '');
    } else {
      manBar.classList.remove('has-active');
      manCounter.textContent = 'En veille';
    }
  }
  
  // Paires count
  const totalPairs = Object.keys(PAIRS).length;
  const pausedPairs = Object.keys(S._pausedPairs || {}).length;
  const pairText = pausedPairs > 0 ? (totalPairs - pausedPairs) + '/' + totalPairs + ' paires' : totalPairs + ' paires';
  if (autoPaircount) autoPaircount.textContent = pairText;
  if (manPaircount) manPaircount.textContent = pairText;
}
window._updateAutoBarCounters = _updateAutoBarCounters;
if(typeof _updateAutoBarCounters==='function') window._updateAutoBarCounters = _updateAutoBarCounters;

function ac2UpdateXInd(pair) {
  const k = pair.replace('/','_');
  const ps = S.pairStates[pair]; if (!ps) return;
  // Extract closes from candles (real NEXUS data source)
  const closes = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');

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

  const volVal = document.getElementById('ac2_volval_'+k);
  const volFill = document.getElementById('ac2_volfill_'+k);
  if (volVal && volFill) {
    const recentCandles = (ps.candles||[]).slice(-24);
    const vSum = recentCandles.reduce((s,c) => s + (c.v||0), 0);
    const v = vSum > 0 ? vSum * (ps.price||1) : ((ps.price||1) * 1000 * (0.5 + Math.random()));
    const display = v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v.toFixed(0);
    volVal.textContent = '$' + display;
    const pct = Math.min(100, Math.max(15, (v / ((ps.price||1) * 1e5)) * 100));
    volFill.style.width = pct + '%';
  }

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

  const momEl = document.getElementById('ac2_mom_'+k);
  if (momEl && closes.length >= 10) {
    const ph2 = closes;
    const recent = ph2.slice(-5).reduce((a,b)=>a+b,0)/5;
    const older = ph2.slice(-10,-5).reduce((a,b)=>a+b,0)/5;
    const momPct = ((recent-older)/older)*100;
    const arr = momPct > 0.3 ? '↗' : momPct < -0.3 ? '↘' : '→';
    momEl.textContent = arr + ' ' + (momPct>=0?'+':'') + momPct.toFixed(2) + '%';
    momEl.style.color = momPct > 0.3 ? 'var(--up)' : momPct < -0.3 ? 'var(--down)' : 'var(--t3)';
  }

  const regEl = document.getElementById('ac2_regmini_'+k);
  if (regEl) {
    const reg = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
    const map = {bull:{txt:'BULL',c:'var(--up)'}, bear:{txt:'BEAR',c:'var(--down)'}, calm:{txt:'CALM',c:'var(--ice)'}, volatile:{txt:'VOL',c:'var(--gold)'}, volatile_bull:{txt:'V.BULL',c:'var(--up)'}, volatile_bear:{txt:'V.BEAR',c:'var(--down)'}};
    const m = map[reg] || map.calm;
    regEl.textContent = m.txt;
    regEl.style.color = m.c;
  }

  const streakEl = document.getElementById('ac2_streak_'+k);
  if (streakEl) {
    const closedTrades = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
    if (!closedTrades.length) { streakEl.textContent = '—'; streakEl.style.color = 'var(--t3)'; }
    else {
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
if(typeof ac2UpdateXInd==='function') window.ac2UpdateXInd = ac2UpdateXInd;

function autoOpenPosition(pair, side, stakeOverride) {
  // v4.1 — Global mode gate: bot only acts if AUTO is on
  if(S.botAutoMode === false) return;
  // v7.12 · PACK RÉSILIENCE · sauvegarde avant action bot
  try { if (typeof _p5PreActionSave === 'function') _p5PreActionSave('open_bot'); } catch(e) {}
  // v7.12 · PACK RÉSILIENCE · Q3:B · pas d'ouverture pendant coupure Internet
  if(S._netPaused === true) {
    if (Math.random() < 0.05) {  // log discret
      S.chainLog.push({
        icon: '🔴',
        desc: `Ouverture bloquée · connexion coupée · ${pair} ${side.toUpperCase()}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return;
  }

  // ═══════════════════════════════════════════════════════
  // v22 · VEILLE MARCHÉ — Intégration bots (Phase 3)
  // (B) Consultation avant chaque trade : ajuster la mise
  // (C) Blocage si sentiment critique (< -60)
  // ═══════════════════════════════════════════════════════
  if(S.veilleData && typeof S.veilleData.sentimentScore === 'number') {
    const sentTs    = S.veilleData.sentimentTs || 0;
    const sentFresh = (Date.now() - sentTs) < 30 * 60 * 1000; // données < 30 min
    if(sentFresh) {
      const sent = S.veilleData.sentimentScore;

      // (C) Blocage si sentiment TRÈS baissier (< -60)
      if(sent <= -60 && side === 'long') {
        S.chainLog.push({
          icon: '📡',
          desc: `Veille Marché : LONG bloqué sur ${pair} · Sentiment ${sent} (< -60) — conditions défavorables`,
          hash: rndHash(), time: nowStr()
        });
        if(S.chainLog.length > 100) S.chainLog.splice(0, 50);
        return;
      }
      if(sent >= 60 && side === 'short') {
        S.chainLog.push({
          icon: '📡',
          desc: `Veille Marché : SHORT bloqué sur ${pair} · Sentiment ${sent} (> +60) — marché haussier`,
          hash: rndHash(), time: nowStr()
        });
        if(S.chainLog.length > 100) S.chainLog.splice(0, 50);
        return;
      }

      // (B) Ajuster la mise selon le sentiment (±30%)
      if(!stakeOverride && S.pairStates[pair]) {
        const ps = S.pairStates[pair];
        const baseMise = ps.stake || 10;
        let mult = 1.0;
        if(sent >= 50)       mult = 1.3;   // Très haussier → +30%
        else if(sent >= 20)  mult = 1.1;   // Haussier → +10%
        else if(sent <= -50) mult = 0.6;   // Très baissier → -40%
        else if(sent <= -20) mult = 0.8;   // Baissier → -20%
        if(mult !== 1.0) {
          stakeOverride = Math.max(10, Math.round(baseMise * mult / 10) * 10);
          if(Math.random() < 0.2) {  // log discret
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
  // ═══════════════════════════════════════════════════════
  // v7.12 · Guard: skip if pair is auto-paused (sous-performance)
  if(typeof _isPairPaused === 'function' && _isPairPaused(pair)) return;
  // v7.12 · Guard: skip if pair is under manual control
  if(typeof _isPairManual === 'function' && _isPairManual(pair)) return;
  // Guard: never open if ANY position already exists on this pair
  const already = S.openPositions.find(p => p.pair === pair);
  if(already) return;
  
  // v7.12 · MOD 2 · MAX 3 POSITIONS SIMULTANÉES (qualité > quantité)
  const autoPositionsCount = S.openPositions.filter(p => p.auto === true).length;
  if (autoPositionsCount >= 3) {
    // Log seulement 1 fois sur 10 pour éviter le spam
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
  
  // v7.12 · MOD 5 · FILTRE SÉRIE DE PERTES (3 pertes consécutives = pause 30min)
  if (!S._lossStreaks) S._lossStreaks = {};
  const streak = S._lossStreaks[pair];
  
  // v7.12 · BLACKLIST DYNAMIQUE check
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
  if(!ps || !cfg) return;

  // v6.8 FIX: tech doit être déclaré ici pour le brain gate (ReferenceError sinon)
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;

  // ═══════════════════════════════════════════════════════════════
  // v7.12 · FIX A — FILTRE RSI ANTI-SUICIDE
  // Bloque les SHORT si RSI extrêmement survendu (rebond probable)
  // Bloque les LONG si RSI extrêmement suracheté (correction probable)
  // ═══════════════════════════════════════════════════════════════
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
      // Block irrational trades
      if (side === 'short' && rsi < 25) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto RSI · ${pair} SHORT bloqué · RSI ${rsi.toFixed(0)} (survendu — rebond probable)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
      if (side === 'long' && rsi > 75) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto RSI · ${pair} LONG bloqué · RSI ${rsi.toFixed(0)} (suracheté — correction probable)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch(e) { /* Fail-safe: ne bloque pas si le calcul échoue */ }

  // ═══════════════════════════════════════════════════════════════
  // v7.12 · FIX C — COHÉRENCE RÉGIME/SIDE
  // Bloque les trades contraires au régime global sauf signal RSI fort
  // BEAR + LONG → veto sauf si RSI < 35 (vrai rebond probable)
  // BULL + SHORT → veto sauf si RSI > 65 (vrai surachat probable)
  // Volatile = no veto (les retournements sont fréquents)
  // CALM = no veto
  // ═══════════════════════════════════════════════════════════════
  try {
    const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
    // Only apply to pure bull/bear regimes (volatile_* and calm allow all trades)
    if (regime === 'bear' || regime === 'bull') {
      // Recompute RSI (cheap, already done above but scope isolated)
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
      // BEAR market + LONG trade: need strong oversold signal (RSI < 35) to allow
      if (regime === 'bear' && side === 'long' && rsiC >= 35) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto régime · ${pair} LONG bloqué · marché BEAR + RSI ${rsiC.toFixed(0)} (pas de signal rebond)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
      // BULL market + SHORT trade: need strong overbought signal (RSI > 65) to allow
      if (regime === 'bull' && side === 'short' && rsiC <= 65) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto régime · ${pair} SHORT bloqué · marché BULL + RSI ${rsiC.toFixed(0)} (pas de signal correction)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch(e) { /* Fail-safe: ne bloque pas si le calcul échoue */ }

  // ═══════════════════════════════════════════════════════════════
  // v7.12 · FIX D — FILTRE VOLUME ANORMALEMENT BAS
  // Skip trade si le volume est inférieur à 40% de la moyenne récente
  // (évite les marchés morts où les signaux sont faussés par le manque de liquidité)
  // ═══════════════════════════════════════════════════════════════
  try {
    const vols = (ps.candles || []).slice(-20).map(c => c.v).filter(v => typeof v === 'number' && v > 0);
    if (vols.length >= 10) {
      const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
      const recentVol = vols.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (recentVol < avgVol * 0.40) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto volume · ${pair} ${side.toUpperCase()} bloqué · volume ${Math.round(recentVol/avgVol*100)}% de la moyenne (<40%)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
    }
  } catch(e) { /* Fail-safe */ }

  // ═══════════════════════════════════════════════════════════════
  // v7.12 · FIX E — FILTRE VOLATILITÉ EXCESSIVE
  // Skip trade si ATR > 2.5× la moyenne ATR des 20 dernières bougies
  // (évite les pics de volatilité pièges — news, flash crashes, etc.)
  // ═══════════════════════════════════════════════════════════════
  try {
    const candles = (ps.candles || []).slice(-20);
    if (candles.length >= 15) {
      const atrs = candles.map(c => (c.h && c.l) ? (c.h - c.l) : 0).filter(v => v > 0);
      if (atrs.length >= 10) {
        const avgATR = atrs.reduce((a, b) => a + b, 0) / atrs.length;
        const currATR = atrs.slice(-3).reduce((a, b) => a + b, 0) / 3;
        if (currATR > avgATR * 2.5) {
          S.chainLog.push({
            icon: '⊗',
            desc: `Veto volatilité · ${pair} ${side.toUpperCase()} bloqué · ATR ${(currATR/avgATR).toFixed(1)}× moyenne (pic anormal)`,
            hash: rndHash(), time: nowStr()
          });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
          return;
        }
      }
    }
  } catch(e) { /* Fail-safe */ }

  // 🔒 RÈGLE ABSOLUE: le bot utilise SEULEMENT tradingAccount — jamais cashAccount
  let baseStake = stakeOverride != null
    ? Math.max(10, Math.round(stakeOverride * 10) / 10)
    : Math.max(10, ps.stake || 10);

  // ═══════════════════════════════════════════════════════════════
  // v6.0 · BRAIN GATE — roster analysis gates the trade
  // ═══════════════════════════════════════════════════════════════
  let _brainVeto = false, _brainReason = '', _brainMult = 1.0, _brainSideFlip = false;
  if(typeof runRosterAnalysis === 'function') {
    try {
      const roster = runRosterAnalysis(pair);
      S._lastBrainAnalysis = roster;  // expose for UI

      // 1. HARD VETO — any guardian says veto → block trade
      if(roster.anyVeto) {
        const vetoers = Object.entries(roster.guardianResults)
          .filter(([,g]) => g.status === 'veto')
          .map(([id, g]) => {
            const a = (S.agents||[]).find(x => x.id === id);
            return (a?.emoji || '') + ' ' + (a?.name || id) + ' : ' + g.reasoning;
          });
        _brainVeto = true;
        _brainReason = vetoers.join(' · ');
        // Record veto event for traceability
        if(!S.brainLog) S.brainLog = [];
        S.brainLog.unshift({ ts: Date.now(), pair, event:'VETO', side, reason: _brainReason });
        if(S.brainLog.length > 30) S.brainLog.length = 30;
      }

      // 2. SIDE FLIP — if roster verdict opposes proposed side with strong conviction → flip
      if(!_brainVeto && roster.coalition) {
        const rosterSide = roster.verdict === 'LONG' ? 'long' : roster.verdict === 'SHORT' ? 'short' : null;
        if(rosterSide && rosterSide !== side && roster.consensus >= 0.6) {
          _brainSideFlip = true;
          side = rosterSide;
          _brainReason = `Coalition ${roster.verdict} renversé · consensus ${(roster.consensus*100).toFixed(0)}%`;
          if(!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event:'FLIP', side, reason: _brainReason });
          if(S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }

      // 3. STAKE MODULATION based on consensus (v6.3 · balanced thresholds)
      if(!_brainVeto) {
        if(roster.coalition && roster.consensus >= 0.7) {
          _brainMult = 1.25;  // strong coalition → boost
        } else if(roster.coalition) {
          _brainMult = 1.10;  // any coalition → mild boost
        } else if(roster.consensus < 0.30) {
          _brainMult = 0.70;  // very divided → reduce (was 0.55)
        }
        // No shrink on HOLD majority — LMSR may still give a valid signal
        if(_brainMult !== 1.0) {
          baseStake = Math.max(10, Math.round(baseStake * _brainMult * 10) / 10);
        }
      }

      // 4. SKIP only if ALL council votes HOLD AND LMSR neutral AND conviction faible
      // v6.5: si AT très fort (conviction externe forte), ignorer conseil unanime HOLD
      const externalConvStrong = (tech?.atScore && Math.abs(tech.atScore) >= 0.35);
      if(!_brainVeto && roster.votes.hold === roster.votes.total && !externalConvStrong) {
        const lmsrNeutral = Math.abs(lmsrP(ps) - 0.5) < 0.08;
        if(lmsrNeutral) {
          _brainVeto = true;
          _brainReason = 'Conseil HOLD + LMSR neutre · pas de signal';
          if(!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event:'SKIP', side, reason: _brainReason });
          if(S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }
    } catch(e) {
      console.warn('brain gate error:', e);
    }
  }

  // VETO → bail out early
  if(_brainVeto) {
    if(typeof showToast === 'function') {
      showToast('🧠 Brain Gate · ' + (_brainReason.length > 60 ? _brainReason.slice(0,57)+'…' : _brainReason));
    }
    return;
  }

  // v5.7 · Smart Sizer applies Kelly multiplier BEFORE exposure checks
  if(typeof runBotFleet === 'function') {
    try {
      const fleetResult = runBotFleet('pre_trade', { stake: baseStake });
      if(fleetResult?.sizer?.mult && Math.abs(fleetResult.sizer.mult - 1) > 0.01) {
        const adjusted = baseStake * fleetResult.sizer.mult;
        baseStake = Math.max(10, Math.round(adjusted * 10) / 10);
      }
    } catch(e) { /* fail-safe: keep original baseStake */ }
  }

  // v7.1: Fallback sur levier si compte trading vide
  if(S.tradingAccount < 20) {
    const levAvail = S.leverageReserve || 0;
    if(levAvail >= 20) {
      // Utiliser le levier pour continuer à trader
      baseStake = Math.max(10, Math.min(50, Math.floor(levAvail * 0.10 / 10) * 10));
      // marquer pour déduire du levier au lieu du trading
      var _useLeverageForStake = true;
    } else {
      showToast('⚠ Compte trading et levier insuffisants · bot suspendu', 2800, 'critical');
      return;
    }
  } else {
    if(baseStake > S.tradingAccount * 0.95) {
      baseStake = Math.max(10, Math.floor(S.tradingAccount * 0.25 / 10) * 10);
    }
  }

  // Levier bonus (emprunté de leverageReserve si conviction élevée)
  const bonusAvailable = ps._leverageBonus || 0;
  const levBorrowed    = bonusAvailable > 0 ? borrowLeverage(bonusAvailable, pair) : 0;

  // ── VALIDATION CAPITAL GLOBAL ─────────────────────────────────
  // v7.12 · passe la conviction pour permettre 100% si signal fort
  const _convForValidate = (typeof effectiveConviction === 'number' ? effectiveConviction : null)
                           ?? (typeof lmsrP === 'function' && ps ? lmsrP(ps) : 0.5);
  let capCheck = validateTotalExposure(baseStake, levBorrowed, _convForValidate);
  if(!capCheck.ok) {
    // v7.11 · ANTICIPATION LEVIER : en mode auto, avant de suspendre le bot,
    // tenter de monter l'index levier (dans la limite de ×10) pour libérer du capital.
    if(S.botAutoMode === true && (S.leverage || 0) < (S.leverageMaxMult || 10)) {
      const prevIdx = S.leverage || 0;
      // Essayer jusqu'à +3 crans (pas tout de suite ×10, progressif)
      const tryIndexes = [prevIdx + 1, prevIdx + 2, prevIdx + 3].filter(i => i <= (S.leverageMaxMult || 10));
      for(const newIdx of tryIndexes) {
        try {
          if(typeof setLeverageByBot === 'function') {
            setLeverageByBot(newIdx, `anticipation capital pour ${pair}`);
          }
          capCheck = validateTotalExposure(baseStake, levBorrowed);
          if(capCheck.ok) {
            S.chainLog.push({
              icon:'🤖⚡', desc:`Bot anticipation: levier ${prevIdx}→${newIdx} pour ouvrir ${pair}`,
              hash:rndHash(), time:nowStr()
            });
            break;
          }
        } catch(e) { console.warn('bot leverage anticipation:', e); }
      }
    }
    if(!capCheck.ok) {
      const scaleFactor = capCheck.available / Math.max(1, baseStake + levBorrowed);
      if(scaleFactor < 0.15) {
        showToast('⚠ Capital max atteint · bot ' + pair + ' suspendu', 2800, 'critical');
        if(levBorrowed > 0) repayLeverage(levBorrowed);
        return;
      }
      baseStake = Math.max(10, Math.floor(baseStake * scaleFactor / 10) * 10);
    }
  }

  const stakeUsdt = baseStake + levBorrowed;

  const amount = (stakeUsdt / Math.max(0.0001, ps.price)).toFixed(cfg.dec>=4 ? 4 : 6);
  const id     = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);

  // Déduire — v7.1: source selon _useLeverageForStake
  let _jitBorrowed = 0;  // v7.12 · P7 · track JIT borrow for this trade
  if(typeof _useLeverageForStake !== 'undefined' && _useLeverageForStake) {
    // ═══ v7.12 · P11 · Garde-fou : pas d'emprunt si levier ×0 ═══
    if ((S.leverage || 0) === 0) {
      // Skip ce trade : on ne peut pas emprunter sans levier
      return;
    }
    // Emprunter au levier
    S.leverageBorrowed = (S.leverageBorrowed || 0) + baseStake;
    // v7.12 · P10 · Tracker aussi _autoLevBorrowed
    S._autoLevBorrowed = (S._autoLevBorrowed || 0) + baseStake;
    S.leverageReserve  = Math.max(0, (S.leverageReserve || 0) - baseStake);
    _jitBorrowed = baseStake;  // tracker pour pos.levBorrowed
  } else {
    // v7.2 Phase 14c-revised · Emprunt JIT si bot a besoin de plus que trading dispo
    try {
      if((S.leverage || 0) >= 1 && baseStake > (S.tradingAccount || 0)) {
        const res = ensureLeverageCoverForTrade(baseStake, pair);
        if (res && res.ok && res.borrowed > 0) {
          _jitBorrowed = res.borrowed;  // v7.12 · P7 · mémoriser
        }
      }
    } catch(e) { console.warn('bot auto-leverage:', e); }
    S.tradingAccount = Math.max(0, S.tradingAccount - baseStake);
  }
  S.portfolio      = S.cashAccount + S.tradingAccount;
  // v7.12 · P7 · Consommer le pending pour qu'il ne reste pas
  if (S._pendingPositionBorrow) {
    _jitBorrowed = Math.max(_jitBorrowed, S._pendingPositionBorrow);
    S._pendingPositionBorrow = 0;
  }

  S.openPositions.push({
    id, pair, side,
    entryPrice:    ps.price, openedAt:Date.now(),
    amount:        parseFloat(amount),
    stakeUsdt:     baseStake,      // mise propre (sans levier)
    levBorrowed:   (levBorrowed || 0) + _jitBorrowed,  // v7.12 · P7 · inclure l'emprunt JIT
    totalExposure: stakeUsdt,      // exposition totale (stake + levier)
    entryTime:     nowStr(),
    entryTs:       Date.now(),
    pnl:           0, pnlUsdt: 0,
    currentVal:    stakeUsdt,
    auto:          true,
    tp:            null, sl: null,
    _paperRealMode: (S.tradingMode === 'paperReal'),  // marqueur pour traitement post-création
    _holdCycles:   0,
    conviction:    (typeof effectiveConviction !== 'undefined' ? effectiveConviction : lmsrP(ps)) || 0,
    _peakPnl:      0,
    // v8.0 PHASE 2 · Capture du contexte pour mémoire
    _contextId:    (function(){
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
    // v8.0 PHASE 4a · A/B testing : assigner une variante
    _abArm: (function(){
      if (S.tradingMode !== 'paperReal') return null;
      try {
        return _abAssignArm();
      } catch(e) {}
      return null;
    })(),
    _openReason:   `${_brainSideFlip ? '🔄 FLIP · ' : ''}${_brainMult !== 1.0 ? '×' + _brainMult.toFixed(2) + ' · ' : ''}LMSR ${(lmsrP(ps)*100).toFixed(0)}% · ${side==='long'?'↑ LONG':'↓ SHORT'}${(S._lastBrainAnalysis?.coalition) ? ' · 🤝 Coalition' : ''}`,
    _openAgents:   [...S.agents].filter(a => !a.isBot && !a.isMeta && Math.abs(a.score||0) > 0.1)
                     .sort((a,b) => Math.abs(b.score||0)*b.fitness - Math.abs(a.score||0)*a.fitness)
                     .slice(0,5)
                     .map(a => ({ emoji:a.emoji, name:a.name.split(' ')[0].split('·')[0].trim(), score:a.score||0 }))
  });
    // v5.7 FIX — Cascade uses baseStake (the actual trade size)
    if(typeof recordDecisionCascade === 'function') recordDecisionCascade(pair, side, baseStake, 'auto');

  ps.trades.push({ side: side==='long'?'buy':'sell', type:'open',
    amount: String(amount), price: ps.price, pnl: 0, stakeUsdt: baseStake,
    levBorrowed, totalExposure: stakeUsdt,
    pnlUsdt: null, fee: null, ts: Date.now(), time: nowStr() });
  if(ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);

  updatePairBtnStates();
}
if(typeof autoOpenPosition==='function') window.autoOpenPosition = autoOpenPosition;

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
if(typeof buildActionBricks==='function') window.buildActionBricks = buildActionBricks;

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
if(typeof buildManBricks==='function') window.buildManBricks = buildManBricks;

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
if(typeof buildPairBricks==='function') window.buildPairBricks = buildPairBricks;

function buildSnapshot() {
  const snap = {
    key:          SAVE_KEY,
    savedAt:      new Date().toISOString(),
    version:      2,
    // Portefeuille
    portfolio:    S.portfolio,
    cashAccount:  S.cashAccount,
    tradingAccount: S.tradingAccount,
    leverage:     S.leverage,
    botAutoMode:  S.botAutoMode,
    // Cycle
    cycle:        S.cycle,
    cycleMax:     S.cycleMax,
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
      // v6.2 · learning fields
      errors:         a.errors          || 0,
      corrections:    a.corrections     || 0,
      streak:         a.streak          || 0,
      lastPnl:        a.lastPnl         || 0,
      memory:         (a.memory         || []).slice(-20),
      regimeFitness:  a.regimeFitness  || {}   // v7.0: per-regime performance
    })),
    // Apprentissage
    // v115 OPT · learningHistory : 200 entrées max (cohérent runtime), adjustments
    //           gardé seulement sur les 30 dernières (seules lues par le feed) — gain ~450 KB
    learningHistory: S.learningHistory.slice(-200).map((h, i, arr) =>
      i >= arr.length - 30 ? h : { ...h, adjustments: [] }
    ),
    evoLog:          S.evoLog.slice(-50),
    // Paires — prix, candles, P&L cumulés, trades
    pairStates: Object.fromEntries(
      Object.entries(S.pairStates).map(([pair, ps]) => [pair, {
        price:      ps.price,
        qYes:       ps.qYes,
        qNo:        ps.qNo,
        stake:      ps.stake,
        pairLeverage: ps.pairLeverage || 1,
        threshold:  ps.threshold || 0.65,
        userStake:  ps.userStake || false,
        userCycleSet: ps.userCycleSet || false,
        lastAction: ps.lastAction || 'hold',
        holdStartTs: ps.holdStartTs || 0,
        capital:    ps.capital,
        cycleMax:   ps.cycleMax,
        cycleTimer: ps.cycleTimer,
        totalTrades: ps.totalTrades,
        winTrades:   ps.winTrades,
        totalPnlPct: ps.totalPnlPct,
        totalPnlUsd: ps.totalPnlUsd,
        pnl24h:      ps.pnl24h,
        trades:      ps.trades.slice(-30),
        candles:     ps.candles.slice(-60)
      }])
    ),
    // Positions ouvertes
    openPositions: S.openPositions,
    // Frais & taxes
    fees:       S.fees,
    feeConfig:  S.feeConfig,
    taxConfig: {
      region:  S.taxConfig.region,
      regions: S.taxConfig.regions
    },
    // Chain log (50 dernières)
    chainLog:  S.chainLog.slice(-50),
    // Stats
    totalTrades: S.totalTrades,
    winTrades:   S.winTrades,
    pnl24h:      S.pnl24h,
    pnlHistory:  S.pnlHistory.slice(-80),
    _startPortfolio: S._startPortfolio || S.portfolio,
    // Version
    vMajor: S.vMajor,
    vMinor: S.vMinor,
    // Leverage reserve
    leverageReserve:   S.leverageReserve   || 0,
    leverageBorrowed:  S.leverageBorrowed  || 0,
    leverageTotalFees: S.leverageTotalFees || 0,
    // v7.1 Phase 10 · Persistance des comptes Phase 2/8/9
    // (sans quoi fiscalReserve et fonds propres injectés seraient perdus au refresh)
    fiscalReserveAccount: S.fiscalReserveAccount || 0,
    fiscalReserveLog:     (S.fiscalReserveLog || []).slice(0, 200),
    ownFundsInjected:     S.ownFundsInjected || 0,  // v7.4 · défaut 0 (était 50)
    ownFundsLog:          (S.ownFundsLog || []).slice(0, 200),
    fiatConvFeePct:       (typeof S.fiatConvFeePct === 'number') ? S.fiatConvFeePct : 0.002,
    // v7.2 Phase 14c · Persistance emprunt auto levier
    _autoLevBase:         S._autoLevBase || 0,
    _autoLevBorrowed:     S._autoLevBorrowed || 0,
    // Note: fiatRates et usdEurRate = caches volontairement non persistés (refetch auto au démarrage)
    // Per-pair best/worst trade (for display in pair P&L)
    pairBestWorst: Object.fromEntries(
      Object.entries(S.pairStates).map(([p, ps]) => [p, {
        bestTrade:  ps.bestTrade  || null,
        worstTrade: ps.worstTrade || null
      }])
    ),
    // ── Feature #1 — Agent Memories ──────────────────────────
    agentMemories: Object.fromEntries(
      S.agents.map(a => [a.id, (a.memory || []).slice(-30)])
    ),
    globalMemoryPool: S.globalMemoryPool.slice(-50),
    // ── Feature #2 — Dreams ──────────────────────────────────
    dreams:           S.dreams.slice(-10),
    // ── Feature #3 — Dynamic Pairs ───────────────────────────
    dynamicPairKeys:  Object.keys(PAIRS).filter(k => !['BTC/USDT','ETH/USDT','XRP/USDT','SOL/USDT'].includes(k)),
    pairCandidates:   S.pairCandidates,
    proposals:        S.proposals.slice(-20),
    // ── v5.4-v6 — Intelligence + Control fields ───────────────
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
    // v7.4 FIX · Mémoire inter-agents persistée (sinon perdue au refresh)
    agentLessons:     (S.agentLessons   || []).slice(-30),
    // v7.12 LIVRAISON 4 · Mode trading persisté
    tradingMode:       S.tradingMode || 'sim',
    realTimeframe:     S.realTimeframe || '15m',
    realActivePairs:   S.realActivePairs || {},
    agentLessonsReal:  (S.agentLessonsReal || []).slice(-30),
    realKillSwitch:    S.realKillSwitch || {},
    realModeStartedAt: S.realModeStartedAt || 0,
    realStatsByPair:   S.realStatsByPair   || {},
    preRealSnapshot:   S.preRealSnapshot   || null,
    
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
    preRealSnapshotPaperReal: S.preRealSnapshotPaperReal || null,
    // v8.0 LIVRAISON 30 · FIX #8 · Doublon supprimé (était écrit 2× chacun)
    _totalCompounded: S._totalCompounded || 0,
    _genCount:        S._genCount || 0,
    // v7.12 LIVRAISON 2 · Bougies temps réel persistées
    // (limité à 100 par couple paire/intervalle pour borner la taille du snapshot)
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
  return snap;
}
if(typeof buildSnapshot==='function') window.buildSnapshot = buildSnapshot;

function exportFeesCSV() {
  downloadFile(buildFeeLogCSV(), `nexus_fees_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('📥 Frais exportés', 2800, 'user');
}
if(typeof exportFeesCSV==='function') window.exportFeesCSV = exportFeesCSV;

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
if(typeof exportFullJSON==='function') window.exportFullJSON = exportFullJSON;

function exportState(silent) {
  try {
    const snap = buildSnapshot();
    // Ajouter métadonnées lisibles
    snap._export = {
      version: '7.12',
      exportedAt: new Date().toISOString(),
      portfolio: S.portfolio,
      cycle: S.cycle,
      totalTrades: S.totalTrades,
      winRate: S.totalTrades > 0 ? Math.round(S.winTrades / S.totalTrades * 100) : 0
    };
    const json = JSON.stringify(snap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
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
if(typeof exportState==='function') window.exportState = exportState;

function exportSummaryCSV() {
  downloadFile(buildSummaryCSV(), `nexus_resume_fiscal_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('📥 Résumé fiscal exporté', 2800, 'user');
}
if(typeof exportSummaryCSV==='function') window.exportSummaryCSV = exportSummaryCSV;

async function exportTradesCSV() {
  const trades = await loadAllTrades();
  const all = [...trades, ...S.fees.feeLog.map(e=>({...e}))];
  downloadFile(buildTradeCSV(all), `nexus_trades_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  showToast('📥 Trades exportés — '+all.length+' lignes', 2800, 'user');
}
if(typeof exportTradesCSV==='function') window.exportTradesCSV = exportTradesCSV;

function getCapitalSummary() {
  const staked    = S.openPositions.reduce((s,p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  const maxAllowed= S.tradingAccount + (S.leverageReserve || 0);
  const usedPct   = maxAllowed > 0 ? Math.min(100, staked / maxAllowed * 100) : 0;
  return { staked, maxAllowed, usedPct, free: Math.max(0, maxAllowed - staked) };
}
if(typeof getCapitalSummary==='function') window.getCapitalSummary = getCapitalSummary;

function importState() {
  // Crée un input file temporaire
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
      // Confirmation
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
      
      // Écrire le snap dans IndexedDB/localStorage puis loadState()
      try {
        const db = await openDB();
        await new Promise(res => {
          const tx = db.transaction(STORE_STATE, 'readwrite');
          tx.objectStore(STORE_STATE).put(snap);
          tx.oncomplete = res;
          tx.onerror = res;
        });
      } catch(dbErr) {
        // Fallback localStorage
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch(lsErr) {}
      }
      
      // Recharger l'état
      const ok = await loadState();

  // v105: Auto-restore si capital vide
  if(!S.tradingAccount && !S.cashAccount) {
    try {
      const _F={
        "cycle": 344,
        "cycleTimer": 50,
        "cycleMax": 30,
        "portfolio": 2033.3460651506693,
        "pnl24h": 73.38879776659196,
        "cashAccount": 0.7090165812594478,
        "tradingAccount": 2032.63704856941,
        "leverage": 0,
        "portfolioTotal": 1730.420201710588,
        "usdEurRate": 0.851021,
        "_usdEurLastFetch": 1778309238877,
        "fiatRates": {
          "EUR": 0.851021,
          "GBP": 0.735331,
          "CHF": 0.779245,
          "CAD": 1.362022,
          "AUD": 1.381747,
          "JPY": 156.310805,
          "CNY": 6.824762
        },
        "fiatConvFeePct": 0.002,
        "fiscalReserveAccount": 0,
        "fiscalReserveLog": [],
        "ownFundsInjected": 1172.7090165812594,
        "ownFundsLog": [
          {
            "amount": 1172.7090165812594,
            "fiatType": "EUR",
            "fiatAmount": 1000,
            "rate": 0.851021,
            "fee": 2.3501182697019227,
            "feePct": 0.002,
            "ts": 1778277278585,
            "time": "23:54:38"
          }
        ],
        "leverageReserve": 203263.704856941,
        "leverageMaxMult": 10,
        "leverageBorrowRate": 0,
        "leverageBorrowed": 0,
        "leverageTotalFees": 0,
        "_autoLevBase": 0,
        "_autoLevBorrowed": 0,
        "_marginCallFired": false,
        "perf": {
          "tickDurations": [
            173.30000001192093,
            8.5,
            16.099999994039536,
            1.7000000178813934,
            51.900000005960464,
            4.4000000059604645,
            29.099999994039536,
            2.0999999940395355,
            277.10000002384186,
            2.5,
            8.400000005960464,
            31.30000001192093,
            60.29999998211861,
            1.7000000178813934,
            15.299999982118607,
            2.199999988079071,
            154.90000000596046,
            4.199999988079071,
            8.100000023841858,
            3.4000000059604645
          ],
          "avgMs": 42.82500000298023,
          "maxMs": 277.10000002384186,
          "samples": 20,
          "lastMs": 3.4000000059604645
        },
        "totalTrades": 0,
        "winTrades": 0,
        "botAutoMode": true,
        "toastVerbose": false,
        "pnlHistory": [
          2037.4314500111964,
          2037.1603362469257,
          2037.8191365621074,
          2037.5946585538848,
          2036.9954129787627,
          2037.3207559799337,
          2037.0938444234853,
          2037.8690932014038,
          2037.423120724227,
          2037.5439068617309,
          2038.0611715162634,
          2037.7125921635907,
          2037.0309578356603,
          2037.8081062010012,
          2037.8476248565987,
          2037.5292562865243,
          2036.7863516632683,
          2036.0067172766987,
          2035.5774541993362,
          2036.287036012033,
          2035.6157396732167,
          2036.4054970554253,
          2036.5829441496523,
          2036.827836802643,
          2036.1777874347658,
          2036.4826139943277,
          2035.942355975077,
          2036.1394226799696,
          2035.54496171789,
          2034.8422394339073,
          2035.5269132805347,
          2036.1340529570632,
          2036.2530205174992,
          2036.0386235536855,
          2035.45424558764,
          2035.5709972580726,
          2035.0793484894616,
          2035.478167324492,
          2036.2014488500263,
          2036.7216888762414,
          2036.7817792456615,
          2036.460400755522,
          2036.7901222521762,
          2036.4841756736307,
          2036.1416160210065,
          2035.876013927948,
          2035.3735350233767,
          2034.6250686264523,
          2033.8804413626854,
          2033.3151155025942,
          2032.6300132147303,
          2033.2955182089067,
          2032.5785683030613,
          2032.7635146495431,
          2032.3323466103757,
          2033.146977737111,
          2032.9027364729034,
          2033.6064128824707,
          2034.407064725684,
          2035.0522390480178,
          2035.3078992585977,
          2035.2658667122248,
          2034.5631295932146,
          2034.35519650197,
          2035.1766287078083,
          2034.8929586941883,
          2034.34630297838,
          2034.191215254741,
          2034.1342098827822,
          2033.7415206035598,
          2034.491879295778,
          2034.555588761005,
          2034.454109940608,
          2033.8386092788624,
          2033.7053344305252,
          2033.6329545705094,
          2033.2045842276564,
          2033.2479522945596,
          2033.6845638100824,
          2033.3460651506693
        ],
        "b": 100,
        "chainLog": [
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36580 remplace Hybrid Gen-36574 | fitness cible: 300 T$",
            "hash": "0x034f439068...",
            "time": "08:07:30"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36581 remplace Hybrid Gen-36579 | fitness cible: 300 T$",
            "hash": "0x7748139bc4...",
            "time": "08:07:31"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36582 remplace Hybrid Gen-36581 | fitness cible: 300 T$",
            "hash": "0xaa0607e3ba...",
            "time": "08:07:31"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36583 remplace Hybrid Gen-36578 | fitness cible: 300 T$",
            "hash": "0xcdf5abb52b...",
            "time": "08:07:31"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36584 remplace Hybrid Gen-36559 | fitness cible: 300 T$",
            "hash": "0x0b6acdfeb8...",
            "time": "08:07:32"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36585 remplace Hybrid Gen-36582 | fitness cible: 300 T$",
            "hash": "0x237876c9ea...",
            "time": "08:07:33"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36586 remplace Hybrid Gen-36585 | fitness cible: 300 T$",
            "hash": "0x1a3dddb7e7...",
            "time": "08:07:33"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x00b5b54b38...",
            "time": "08:07:33"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36587 remplace Hybrid Gen-36558 | fitness cible: 300 T$",
            "hash": "0xdffad085f2...",
            "time": "08:07:34"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36588 remplace Hybrid Gen-36576 | fitness cible: 300 T$",
            "hash": "0xfff282f650...",
            "time": "08:07:35"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36589 remplace Hybrid Gen-36586 | fitness cible: 300 T$",
            "hash": "0x37620b951a...",
            "time": "08:07:36"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36590 remplace Hybrid Gen-36589 | fitness cible: 300 T$",
            "hash": "0xef107f242d...",
            "time": "08:07:36"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36591 remplace Hybrid Gen-36572 | fitness cible: 300 T$",
            "hash": "0x9a4f060165...",
            "time": "08:07:36"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0xf3b2e0f52a...",
            "time": "08:07:37"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36592 remplace Hybrid Gen-36590 | fitness cible: 300 T$",
            "hash": "0x60febbebe8...",
            "time": "08:07:37"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36593 remplace Hybrid Gen-36591 | fitness cible: 300 T$",
            "hash": "0x35b39113ca...",
            "time": "08:07:38"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36594 remplace Hybrid Gen-36593 | fitness cible: 300 T$",
            "hash": "0xd34b348207...",
            "time": "08:07:38"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36595 remplace Hybrid Gen-36556 | fitness cible: 300 T$",
            "hash": "0xd64c54ef64...",
            "time": "08:07:39"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36596 remplace Hybrid Gen-36580 | fitness cible: 300 T$",
            "hash": "0x5e290ad6e4...",
            "time": "08:07:40"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36597 remplace Hybrid Gen-36584 | fitness cible: 300 T$",
            "hash": "0x1c6983df86...",
            "time": "08:07:41"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36598 remplace Hybrid Gen-36587 | fitness cible: 300 T$",
            "hash": "0x80c594f223...",
            "time": "08:07:41"
          },
          {
            "icon": "🎛️",
            "desc": "🎛️ Mode MANUEL activé · bot en observation · vos actions uniquement",
            "hash": "0x1e43c002c1...",
            "time": "08:07:41"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x72938b54ec...",
            "time": "08:07:41"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36599 remplace Hybrid Gen-36592 | fitness cible: 300 T$",
            "hash": "0xc2a713c0e1...",
            "time": "08:07:42"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36600 remplace Hybrid Gen-36597 | fitness cible: 300 T$",
            "hash": "0x84503a67f1...",
            "time": "08:07:42"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36601 remplace Hybrid Gen-36598 | fitness cible: 300 T$",
            "hash": "0xfda69849fc...",
            "time": "08:07:43"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36602 remplace Hybrid Gen-36601 | fitness cible: 300 T$",
            "hash": "0xbd7c378e1d...",
            "time": "08:07:43"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36603 remplace Hybrid Gen-36599 | fitness cible: 300 T$",
            "hash": "0x674754fc75...",
            "time": "08:07:44"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0xc2d8975c5c...",
            "time": "08:07:45"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36604 remplace Hybrid Gen-36588 | fitness cible: 300 T$",
            "hash": "0x9c98b00399...",
            "time": "08:07:45"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36605 remplace Hybrid Gen-36603 | fitness cible: 300 T$",
            "hash": "0x86a992327e...",
            "time": "08:07:46"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36606 remplace Hybrid Gen-36605 | fitness cible: 300 T$",
            "hash": "0xa2fd201b28...",
            "time": "08:07:46"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36607 remplace Hybrid Gen-36606 | fitness cible: 300 T$",
            "hash": "0x7e0b90523c...",
            "time": "08:07:47"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36608 remplace Hybrid Gen-36596 | fitness cible: 300 T$",
            "hash": "0xcbb1dc92aa...",
            "time": "08:07:47"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36609 remplace Hybrid Gen-36602 | fitness cible: 300 T$",
            "hash": "0xaa8217e832...",
            "time": "08:07:48"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36610 remplace Hybrid Gen-36609 | fitness cible: 300 T$",
            "hash": "0x2cb9fd38ea...",
            "time": "08:07:48"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0xdd281e1436...",
            "time": "08:07:49"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36611 remplace Hybrid Gen-36607 | fitness cible: 300 T$",
            "hash": "0x8644f170b7...",
            "time": "08:07:49"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36612 remplace Hybrid Gen-36600 | fitness cible: 300 T$",
            "hash": "0x8f5dd2d9a6...",
            "time": "08:07:50"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36613 remplace Hybrid Gen-36611 | fitness cible: 300 T$",
            "hash": "0x15676c0f3c...",
            "time": "08:07:51"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36614 remplace Hybrid Gen-36613 | fitness cible: 300 T$",
            "hash": "0x4d06889176...",
            "time": "08:07:51"
          },
          {
            "icon": "🤖",
            "desc": "🤖 Mode AUTO activé · bot autorisé à trader",
            "hash": "0x78705b1e8f...",
            "time": "08:07:51"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36615 remplace Hybrid Gen-36604 | fitness cible: 300 T$",
            "hash": "0x40ff2b253d...",
            "time": "08:07:52"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x9fc28f0461...",
            "time": "08:07:52"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36616 remplace Hybrid Gen-36614 | fitness cible: 300 T$",
            "hash": "0xf7139fd169...",
            "time": "08:07:53"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36617 remplace Hybrid Gen-36594 | fitness cible: 300 T$",
            "hash": "0x982271359b...",
            "time": "08:07:53"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36618 remplace Hybrid Gen-36617 | fitness cible: 300 T$",
            "hash": "0xbbf3abd2ae...",
            "time": "08:07:53"
          },
          {
            "icon": "🎛️",
            "desc": "🎛️ Mode MANUEL activé · bot en observation · vos actions uniquement",
            "hash": "0x258be2aa77...",
            "time": "08:07:54"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36619 remplace Hybrid Gen-36612 | fitness cible: 300 T$",
            "hash": "0x2afed3a34c...",
            "time": "08:07:54"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36620 remplace Hybrid Gen-36615 | fitness cible: 300 T$",
            "hash": "0x89fb8107ec...",
            "time": "08:07:55"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36621 remplace Hybrid Gen-36616 | fitness cible: 300 T$",
            "hash": "0xff9ea6e461...",
            "time": "08:07:56"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36622 remplace Hybrid Gen-36583 | fitness cible: 300 T$",
            "hash": "0xcb97f3b9fa...",
            "time": "08:07:56"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x70d250b433...",
            "time": "08:07:56"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36623 remplace Hybrid Gen-36595 | fitness cible: 300 T$",
            "hash": "0x10b08a3832...",
            "time": "08:07:57"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36624 remplace Hybrid Gen-36608 | fitness cible: 300 T$",
            "hash": "0x86be42c58f...",
            "time": "08:07:58"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36625 remplace Hybrid Gen-36621 | fitness cible: 300 T$",
            "hash": "0xe69bd894f3...",
            "time": "08:07:58"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36626 remplace Hybrid Gen-36086 | fitness cible: 300 T$",
            "hash": "0x48f076771d...",
            "time": "08:07:58"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36627 remplace Hybrid Gen-36564 | fitness cible: 300 T$",
            "hash": "0x9bf0dd3dd0...",
            "time": "08:07:59"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x66177b916a...",
            "time": "08:08:00"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36628 remplace Hybrid Gen-36620 | fitness cible: 300 T$",
            "hash": "0x33356a8192...",
            "time": "08:08:00"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36629 remplace Hybrid Gen-36625 | fitness cible: 300 T$",
            "hash": "0xc7b948c674...",
            "time": "08:08:01"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36630 remplace Hybrid Gen-36629 | fitness cible: 300 T$",
            "hash": "0x2c29e6bc2e...",
            "time": "08:08:01"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36631 remplace Hybrid Gen-36624 | fitness cible: 300 T$",
            "hash": "0x5b67ee92f0...",
            "time": "08:08:02"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36632 remplace Hybrid Gen-36630 | fitness cible: 300 T$",
            "hash": "0x7755326e87...",
            "time": "08:08:03"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36633 remplace Hybrid Gen-36628 | fitness cible: 300 T$",
            "hash": "0xff60694488...",
            "time": "08:08:04"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36634 remplace Hybrid Gen-36633 | fitness cible: 300 T$",
            "hash": "0x87ee56a65e...",
            "time": "08:08:04"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x571605dac2...",
            "time": "08:08:04"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36635 remplace Hybrid Gen-36619 | fitness cible: 300 T$",
            "hash": "0xfb31ba4199...",
            "time": "08:08:05"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36636 remplace Hybrid Gen-36623 | fitness cible: 300 T$",
            "hash": "0xb4c83386ee...",
            "time": "08:08:05"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36637 remplace Hybrid Gen-36618 | fitness cible: 300 T$",
            "hash": "0x6b3f03aeb9...",
            "time": "08:08:06"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36638 remplace Hybrid Gen-36637 | fitness cible: 300 T$",
            "hash": "0x0df8a0a4cb...",
            "time": "08:08:06"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36639 remplace Hybrid Gen-36638 | fitness cible: 300 T$",
            "hash": "0x6154b357e7...",
            "time": "08:08:07"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x4161d07522...",
            "time": "08:08:08"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36640 remplace Hybrid Gen-36639 | fitness cible: 300 T$",
            "hash": "0x4474a7fbaf...",
            "time": "08:08:08"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36641 remplace Hybrid Gen-36632 | fitness cible: 300 T$",
            "hash": "0xd123c647d5...",
            "time": "08:08:09"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36642 remplace Hybrid Gen-36641 | fitness cible: 300 T$",
            "hash": "0x54ecabd934...",
            "time": "08:08:09"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36643 remplace Hybrid Gen-36636 | fitness cible: 300 T$",
            "hash": "0xabec32b8c4...",
            "time": "08:08:10"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36644 remplace Hybrid Gen-36631 | fitness cible: 300 T$",
            "hash": "0xad5f3d233e...",
            "time": "08:08:10"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36645 remplace Hybrid Gen-36642 | fitness cible: 300 T$",
            "hash": "0x3ce2a29993...",
            "time": "08:08:11"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36646 remplace Hybrid Gen-36526 | fitness cible: 300 T$",
            "hash": "0xb58d79fa91...",
            "time": "08:08:11"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0xc4450c3c9b...",
            "time": "08:08:12"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36647 remplace Hybrid Gen-36627 | fitness cible: 300 T$",
            "hash": "0x6e4efa1fbb...",
            "time": "08:08:12"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36648 remplace Hybrid Gen-36635 | fitness cible: 300 T$",
            "hash": "0xe23b2a5184...",
            "time": "08:08:13"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36649 remplace Hybrid Gen-36645 | fitness cible: 300 T$",
            "hash": "0x172e19cf6f...",
            "time": "08:08:14"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36650 remplace Hybrid Gen-36649 | fitness cible: 300 T$",
            "hash": "0xbbbcbdcbee...",
            "time": "08:08:14"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36651 remplace Hybrid Gen-36640 | fitness cible: 300 T$",
            "hash": "0xd35a2df8b4...",
            "time": "08:08:15"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x9c059b49af...",
            "time": "08:08:15"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36652 remplace Hybrid Gen-36643 | fitness cible: 300 T$",
            "hash": "0xbb58fbf960...",
            "time": "08:08:15"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36653 remplace Hybrid Gen-36648 | fitness cible: 300 T$",
            "hash": "0xbca866e2a7...",
            "time": "08:08:16"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36654 remplace Hybrid Gen-36653 | fitness cible: 300 T$",
            "hash": "0x665bedc999...",
            "time": "08:08:16"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36655 remplace Hybrid Gen-36650 | fitness cible: 300 T$",
            "hash": "0x4336a43828...",
            "time": "08:08:17"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36656 remplace Hybrid Gen-36644 | fitness cible: 300 T$",
            "hash": "0xdb9539820d...",
            "time": "08:08:18"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36657 remplace Hybrid Gen-36652 | fitness cible: 300 T$",
            "hash": "0x33406d97e2...",
            "time": "08:08:19"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36658 remplace Hybrid Gen-36657 | fitness cible: 300 T$",
            "hash": "0xa23d76ce97...",
            "time": "08:08:19"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x77378f1311...",
            "time": "08:08:19"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36659 remplace Hybrid Gen-35796 | fitness cible: 300 T$",
            "hash": "0x1678faa999...",
            "time": "08:08:20"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36660 remplace Hybrid Gen-36655 | fitness cible: 300 T$",
            "hash": "0xed2e843059...",
            "time": "08:08:21"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36661 remplace Hybrid Gen-36654 | fitness cible: 300 T$",
            "hash": "0x87f7f31ee6...",
            "time": "08:08:21"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36662 remplace Hybrid Gen-36661 | fitness cible: 300 T$",
            "hash": "0x42450d448b...",
            "time": "08:08:22"
          },
          {
            "icon": "🤖",
            "desc": "🤖 Mode AUTO activé · bot autorisé à trader",
            "hash": "0xbfbd023055...",
            "time": "08:08:22"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36663 remplace Hybrid Gen-36660 | fitness cible: 300 T$",
            "hash": "0x8e4a7f0f77...",
            "time": "08:08:22"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x484e02933d...",
            "time": "08:08:23"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36664 remplace Hybrid Gen-36634 | fitness cible: 300 T$",
            "hash": "0x96818ff4ce...",
            "time": "08:08:23"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36665 remplace Hybrid Gen-36663 | fitness cible: 300 T$",
            "hash": "0x72dde12b4f...",
            "time": "08:08:24"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36666 remplace Hybrid Gen-36665 | fitness cible: 300 T$",
            "hash": "0x41738c4e08...",
            "time": "08:08:24"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36667 remplace Hybrid Gen-36658 | fitness cible: 300 T$",
            "hash": "0x16dea64ff1...",
            "time": "08:08:25"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36668 remplace Hybrid Gen-36664 | fitness cible: 300 T$",
            "hash": "0xae4bb9aae6...",
            "time": "08:08:26"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36669 remplace Hybrid Gen-36610 | fitness cible: 300 T$",
            "hash": "0x63f5fab8dd...",
            "time": "08:08:26"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36670 remplace Hybrid Gen-36667 | fitness cible: 300 T$",
            "hash": "0x5b6a404a14...",
            "time": "08:08:27"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x8e1fce37c3...",
            "time": "08:08:27"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36671 remplace Hybrid Gen-36666 | fitness cible: 300 T$",
            "hash": "0x925788a21a...",
            "time": "08:08:27"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36672 remplace Hybrid Gen-36668 | fitness cible: 300 T$",
            "hash": "0x3de891b6c4...",
            "time": "08:08:28"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x98aec9976a...",
            "time": "08:08:30"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x6e417b80ec...",
            "time": "08:08:34"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0xe0f7d0b9a2...",
            "time": "08:08:38"
          },
          {
            "icon": "📡",
            "desc": "Prix réels mis à jour: 8 paires via CoinGecko",
            "hash": "0x32d6b95d11...",
            "time": "08:46:19"
          },
          {
            "icon": "🧠",
            "desc": "Apprentissage · 8 agents entraînés · Top: 🧬+0.41, 🧬-0.34, 🧬+0.20",
            "hash": "2rwr290s",
            "time": "08:46:19",
            "category": "learn"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x353d5397a2...",
            "time": "08:46:20"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0xd392105a08...",
            "time": "08:46:23"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36673 remplace Hybrid Gen-36671 | fitness cible: 300 T$",
            "hash": "0x5afe92288b...",
            "time": "08:46:27"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36674 remplace Hybrid Gen-36647 | fitness cible: 300 T$",
            "hash": "0x1a49dbe12b...",
            "time": "08:46:28"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0xe83e0d7681...",
            "time": "08:46:28"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36675 remplace Hybrid Gen-36672 | fitness cible: 300 T$",
            "hash": "0x2ff90e6559...",
            "time": "08:46:29"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36676 remplace Hybrid Gen-36675 | fitness cible: 300 T$",
            "hash": "0x81171ae123...",
            "time": "08:46:29"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36677 remplace Hybrid Gen-36673 | fitness cible: 300 T$",
            "hash": "0x104fe191fd...",
            "time": "08:46:30"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36678 remplace Hybrid Gen-36560 | fitness cible: 300 T$",
            "hash": "0x7e84b93376...",
            "time": "08:46:31"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36679 remplace Hybrid Gen-36677 | fitness cible: 300 T$",
            "hash": "0x86b7bfd716...",
            "time": "08:46:32"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36680 remplace Hybrid Gen-36679 | fitness cible: 300 T$",
            "hash": "0xb23d331884...",
            "time": "08:46:32"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x6823251451...",
            "time": "08:46:32"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36681 remplace Hybrid Gen-36651 | fitness cible: 300 T$",
            "hash": "0x5b741f650f...",
            "time": "08:46:33"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36682 remplace Hybrid Gen-36662 | fitness cible: 300 T$",
            "hash": "0x78a1219dc0...",
            "time": "08:46:34"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36683 remplace Hybrid Gen-36682 | fitness cible: 300 T$",
            "hash": "0x6f128040d9...",
            "time": "08:46:35"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36684 remplace Hybrid Gen-36683 | fitness cible: 300 T$",
            "hash": "0xe07792f3ca...",
            "time": "08:46:35"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36685 remplace Hybrid Gen-36676 | fitness cible: 300 T$",
            "hash": "0xe5562f7fc1...",
            "time": "08:46:36"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36686 remplace Hybrid Gen-36680 | fitness cible: 300 T$",
            "hash": "0x9aeea7e8f8...",
            "time": "08:46:36"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0xdaac8670db...",
            "time": "08:46:37"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36687 remplace Hybrid Gen-36684 | fitness cible: 300 T$",
            "hash": "0x41544a6066...",
            "time": "08:46:37"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36688 remplace Hybrid Gen-36687 | fitness cible: 300 T$",
            "hash": "0x499ddcf6af...",
            "time": "08:46:37"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36689 remplace Hybrid Gen-36685 | fitness cible: 300 T$",
            "hash": "0xe9efa83cfd...",
            "time": "08:46:38"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36690 remplace Hybrid Gen-36670 | fitness cible: 300 T$",
            "hash": "0x231e99b8e3...",
            "time": "08:46:39"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36691 remplace Hybrid Gen-36686 | fitness cible: 300 T$",
            "hash": "0x2c86446ff7...",
            "time": "08:46:40"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36692 remplace Hybrid Gen-36691 | fitness cible: 300 T$",
            "hash": "0x1dac88b805...",
            "time": "08:46:40"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x64b61f5d8d...",
            "time": "08:46:41"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36693 remplace Hybrid Gen-36689 | fitness cible: 300 T$",
            "hash": "0x69dc792f68...",
            "time": "08:46:41"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36694 remplace Hybrid Gen-36681 | fitness cible: 300 T$",
            "hash": "0x6879bb5d3c...",
            "time": "08:46:42"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36695 remplace Hybrid Gen-36674 | fitness cible: 300 T$",
            "hash": "0xb90619f041...",
            "time": "08:46:43"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36696 remplace Hybrid Gen-36690 | fitness cible: 300 T$",
            "hash": "0x4984d605d6...",
            "time": "08:46:43"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36697 remplace Hybrid Gen-36688 | fitness cible: 300 T$",
            "hash": "0x640c61f60b...",
            "time": "08:46:44"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36698 remplace Hybrid Gen-36656 | fitness cible: 300 T$",
            "hash": "0x7b1d0c64ad...",
            "time": "08:46:45"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x6c4af5f4cb...",
            "time": "08:46:45"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36699 remplace Hybrid Gen-36698 | fitness cible: 300 T$",
            "hash": "0x8c79f764ca...",
            "time": "08:46:46"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36700 remplace Hybrid Gen-36692 | fitness cible: 300 T$",
            "hash": "0xb9d002d7dc...",
            "time": "08:46:46"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36701 remplace Hybrid Gen-36699 | fitness cible: 300 T$",
            "hash": "0xf7e18659b6...",
            "time": "08:46:47"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36702 remplace Hybrid Gen-36700 | fitness cible: 300 T$",
            "hash": "0xcb055fed94...",
            "time": "08:46:48"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36703 remplace Hybrid Gen-36669 | fitness cible: 300 T$",
            "hash": "0x26d7add72b...",
            "time": "08:46:48"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36704 remplace Hybrid Gen-36703 | fitness cible: 300 T$",
            "hash": "0x118921df9b...",
            "time": "08:46:49"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0xadf5165e80...",
            "time": "08:46:49"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36705 remplace Hybrid Gen-36701 | fitness cible: 300 T$",
            "hash": "0x0abc40b8ba...",
            "time": "08:46:49"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36706 remplace Hybrid Gen-36702 | fitness cible: 300 T$",
            "hash": "0x81030f6ab9...",
            "time": "08:46:50"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36707 remplace Hybrid Gen-36693 | fitness cible: 300 T$",
            "hash": "0x7d7f2035e4...",
            "time": "08:46:51"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36708 remplace Hybrid Gen-36707 | fitness cible: 300 T$",
            "hash": "0xc058c0ab6e...",
            "time": "08:46:51"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36709 remplace Hybrid Gen-36706 | fitness cible: 300 T$",
            "hash": "0x63bca32d54...",
            "time": "08:46:52"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36710 remplace Hybrid Gen-36697 | fitness cible: 300 T$",
            "hash": "0xd090a277bb...",
            "time": "08:46:53"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x9ce95b5244...",
            "time": "08:46:53"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36711 remplace Hybrid Gen-36696 | fitness cible: 300 T$",
            "hash": "0x239a0f0685...",
            "time": "08:46:54"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36712 remplace Hybrid Gen-36709 | fitness cible: 300 T$",
            "hash": "0xdee6a45781...",
            "time": "08:46:54"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36713 remplace Hybrid Gen-36695 | fitness cible: 300 T$",
            "hash": "0x346b5ba074...",
            "time": "08:46:55"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36714 remplace Hybrid Gen-36708 | fitness cible: 300 T$",
            "hash": "0x728324b37e...",
            "time": "08:46:56"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36715 remplace Hybrid Gen-36714 | fitness cible: 300 T$",
            "hash": "0x64f9c6f9c5...",
            "time": "08:46:57"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36716 remplace Hybrid Gen-36715 | fitness cible: 300 T$",
            "hash": "0x4a06f165fd...",
            "time": "08:46:57"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0xcf65b7fcb0...",
            "time": "08:46:57"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36717 remplace Hybrid Gen-36712 | fitness cible: 300 T$",
            "hash": "0x2ca4ccd2a8...",
            "time": "08:46:57"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36718 remplace Hybrid Gen-36717 | fitness cible: 300 T$",
            "hash": "0x3554e41c29...",
            "time": "08:46:58"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36719 remplace Hybrid Gen-36705 | fitness cible: 300 T$",
            "hash": "0xe3ab22f196...",
            "time": "08:46:59"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36720 remplace Hybrid Gen-36716 | fitness cible: 300 T$",
            "hash": "0x852ead1900...",
            "time": "08:46:59"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36721 remplace Hybrid Gen-36718 | fitness cible: 300 T$",
            "hash": "0x70d7d5bd25...",
            "time": "08:47:00"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36722 remplace Hybrid Gen-36710 | fitness cible: 300 T$",
            "hash": "0xc4bd10478c...",
            "time": "08:47:01"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x195961f0b0...",
            "time": "08:47:01"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36723 remplace Hybrid Gen-36711 | fitness cible: 300 T$",
            "hash": "0x98a21ef9a9...",
            "time": "08:47:02"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36724 remplace Hybrid Gen-36723 | fitness cible: 300 T$",
            "hash": "0xefa35ecde0...",
            "time": "08:47:02"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36725 remplace Hybrid Gen-36713 | fitness cible: 300 T$",
            "hash": "0x8ea6b8f1d1...",
            "time": "08:47:03"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36726 remplace Hybrid Gen-36721 | fitness cible: 300 T$",
            "hash": "0x752de0924f...",
            "time": "08:47:04"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36727 remplace Hybrid Gen-36704 | fitness cible: 300 T$",
            "hash": "0x7ea405f1c7...",
            "time": "08:47:05"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36728 remplace Hybrid Gen-36622 | fitness cible: 300 T$",
            "hash": "0xb7dbd0ad73...",
            "time": "08:47:05"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0xc6d20e0258...",
            "time": "08:47:06"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36729 remplace Hybrid Gen-36722 | fitness cible: 300 T$",
            "hash": "0x77053c5314...",
            "time": "08:47:06"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36730 remplace Hybrid Gen-36726 | fitness cible: 300 T$",
            "hash": "0x626037932b...",
            "time": "08:47:07"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36731 remplace Hybrid Gen-36720 | fitness cible: 300 T$",
            "hash": "0xc3f4adb781...",
            "time": "08:47:08"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36732 remplace Hybrid Gen-36727 | fitness cible: 300 T$",
            "hash": "0xded31e850e...",
            "time": "08:47:08"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36733 remplace Hybrid Gen-36719 | fitness cible: 300 T$",
            "hash": "0xc27735a1e0...",
            "time": "08:47:09"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36734 remplace Hybrid Gen-36730 | fitness cible: 300 T$",
            "hash": "0xc8fc71a869...",
            "time": "08:47:10"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x32a90a5369...",
            "time": "08:47:11"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36735 remplace Hybrid Gen-36733 | fitness cible: 300 T$",
            "hash": "0x675c9bbff7...",
            "time": "08:47:11"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36736 remplace Hybrid Gen-36731 | fitness cible: 300 T$",
            "hash": "0x39a1ce5a10...",
            "time": "08:47:11"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36737 remplace Hybrid Gen-36729 | fitness cible: 300 T$",
            "hash": "0xac1da848ed...",
            "time": "08:47:12"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36738 remplace Hybrid Gen-36735 | fitness cible: 300 T$",
            "hash": "0xfdaeeaa930...",
            "time": "08:47:13"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36739 remplace Hybrid Gen-36736 | fitness cible: 300 T$",
            "hash": "0xaea595928d...",
            "time": "08:47:14"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36740 remplace Hybrid Gen-36626 | fitness cible: 300 T$",
            "hash": "0xaf7b0d1a8f...",
            "time": "08:47:14"
          },
          {
            "icon": "💤",
            "desc": "Dream #11 · Système résilient sur les 3 scénarios testés. Paramètres de ",
            "hash": "0x48630d46f5...",
            "time": "08:47:14"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36741 remplace Hybrid Gen-36734 | fitness cible: 300 T$",
            "hash": "0x54036dd36e...",
            "time": "08:47:15"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36742 remplace Hybrid Gen-36737 | fitness cible: 300 T$",
            "hash": "0x1ea9b52946...",
            "time": "08:47:16"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36743 remplace Hybrid Gen-36739 | fitness cible: 300 T$",
            "hash": "0xecfc38788c...",
            "time": "08:47:17"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36744 remplace Hybrid Gen-36732 | fitness cible: 300 T$",
            "hash": "0x4fa6fc67e7...",
            "time": "08:47:17"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36745 remplace Hybrid Gen-36694 | fitness cible: 300 T$",
            "hash": "0x85ff84816f...",
            "time": "08:47:18"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36746 remplace Hybrid Gen-36741 | fitness cible: 300 T$",
            "hash": "0x987d8479db...",
            "time": "08:47:19"
          },
          {
            "icon": "💤",
            "desc": "Évolueur déclenche Dream Cycle #11 · 3 scénarios",
            "hash": "0x98f52ffc05...",
            "time": "08:47:19"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36747 remplace Hybrid Gen-36724 | fitness cible: 300 T$",
            "hash": "0xfb815a2799...",
            "time": "08:47:20"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36748 remplace Hybrid Gen-36747 | fitness cible: 300 T$",
            "hash": "0xf1ed416a05...",
            "time": "08:47:20"
          },
          {
            "icon": "🧬",
            "desc": "Évolueur: Hybrid Gen-36749 remplace Hybrid Gen-36738 | fitness cible: 300 T$",
            "hash": "0x7ceb5b83c3...",
            "time": "08:47:21"
          }
        ],
        "evoLog": [
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36725 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36725",
            "time": "08:47:03"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36721 retraité",
            "desc": "Fitness: 111 T$ · 0 erreurs",
            "time": "08:47:04"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36726 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36726",
            "time": "08:47:04"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36704 retraité",
            "desc": "Fitness: 112 T$ · 0 erreurs",
            "time": "08:47:05"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36727 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36727",
            "time": "08:47:05"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36622 retraité",
            "desc": "Fitness: 116 T$ · 0 erreurs",
            "time": "08:47:05"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36728 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36728",
            "time": "08:47:05"
          },
          {
            "type": "dream",
            "title": "💤 Dream #11 terminé",
            "desc": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables.",
            "time": "08:47:06",
            "dreamId": 11
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36722 retraité",
            "desc": "Fitness: 117 T$ · 0 erreurs",
            "time": "08:47:06"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36729 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36729",
            "time": "08:47:06"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36726 retraité",
            "desc": "Fitness: 111 T$ · 0 erreurs",
            "time": "08:47:07"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36730 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36730",
            "time": "08:47:07"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36720 retraité",
            "desc": "Fitness: 112 T$ · 0 erreurs",
            "time": "08:47:08"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36731 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36731",
            "time": "08:47:08"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36727 retraité",
            "desc": "Fitness: 120 T$ · 0 erreurs",
            "time": "08:47:08"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36732 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36732",
            "time": "08:47:08"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36719 retraité",
            "desc": "Fitness: 116 T$ · 0 erreurs",
            "time": "08:47:09"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36733 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36733",
            "time": "08:47:09"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36730 retraité",
            "desc": "Fitness: 115 T$ · 0 erreurs",
            "time": "08:47:10"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36734 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36734",
            "time": "08:47:10"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36733 retraité",
            "desc": "Fitness: 117 T$ · 0 erreurs",
            "time": "08:47:11"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36735 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36735",
            "time": "08:47:11"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36731 retraité",
            "desc": "Fitness: 120 T$ · 0 erreurs",
            "time": "08:47:11"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36736 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36736",
            "time": "08:47:11"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36729 retraité",
            "desc": "Fitness: 118 T$ · 0 erreurs",
            "time": "08:47:12"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36737 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36737",
            "time": "08:47:12"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36735 retraité",
            "desc": "Fitness: 112 T$ · 0 erreurs",
            "time": "08:47:13"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36738 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36738",
            "time": "08:47:13"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36736 retraité",
            "desc": "Fitness: 112 T$ · 0 erreurs",
            "time": "08:47:14"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36739 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36739",
            "time": "08:47:14"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36626 retraité",
            "desc": "Fitness: 120 T$ · 0 erreurs",
            "time": "08:47:14"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36740 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36740",
            "time": "08:47:14"
          },
          {
            "type": "dream",
            "title": "💤 Dream #11 terminé",
            "desc": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables.",
            "time": "08:47:14",
            "dreamId": 11
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36734 retraité",
            "desc": "Fitness: 112 T$ · 0 erreurs",
            "time": "08:47:15"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36741 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36741",
            "time": "08:47:15"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36737 retraité",
            "desc": "Fitness: 110 T$ · 0 erreurs",
            "time": "08:47:16"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36742 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36742",
            "time": "08:47:16"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36739 retraité",
            "desc": "Fitness: 104 T$ · 0 erreurs",
            "time": "08:47:17"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36743 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36743",
            "time": "08:47:17"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36732 retraité",
            "desc": "Fitness: 112 T$ · 0 erreurs",
            "time": "08:47:17"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36744 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36744",
            "time": "08:47:17"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36694 retraité",
            "desc": "Fitness: 111 T$ · 0 erreurs",
            "time": "08:47:18"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36745 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36745",
            "time": "08:47:18"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36741 retraité",
            "desc": "Fitness: 110 T$ · 0 erreurs",
            "time": "08:47:19"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36746 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36746",
            "time": "08:47:19"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36724 retraité",
            "desc": "Fitness: 113 T$ · 0 erreurs",
            "time": "08:47:20"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36747 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36747",
            "time": "08:47:20"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36747 retraité",
            "desc": "Fitness: 120 T$ · 0 erreurs",
            "time": "08:47:20"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36748 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36748",
            "time": "08:47:20"
          },
          {
            "type": "removed",
            "title": "⚰ Hybrid Gen-36738 retraité",
            "desc": "Fitness: 116 T$ · 0 erreurs",
            "time": "08:47:21"
          },
          {
            "type": "new",
            "title": "🧬 Hybrid Gen-36749 déployé",
            "desc": "Parents: Contrarian·Council × Mean Reversion | Gen-36749",
            "time": "08:47:21"
          }
        ],
        "alerts": [],
        "learningHistory": [],
        "agentLessons": [],
        "tradingMode": "real",
        "realTimeframe": "15m",
        "realActivePairs": {
          "BTC/USDT": true,
          "ETH/USDT": true,
          "XRP/USDT": true,
          "SOL/USDT": true,
          "DOGE/USDT": true,
          "ADA/USDT": true,
          "AVAX/USDT": true,
          "LINK/USDT": true
        },
        "agentLessonsReal": [],
        "realPairCycle": {},
        "realKillSwitch": {},
        "realModeStartedAt": 0,
        "realStatsByPair": {},
        "preRealSnapshot": null,
        "agentLessonsPaperReal": [],
        "paperRealStats": {},
        "paperRealActivePairs": {
          "BTC/USDT": true,
          "ETH/USDT": true,
          "XRP/USDT": true,
          "SOL/USDT": true,
          "DOGE/USDT": true,
          "ADA/USDT": true,
          "AVAX/USDT": true,
          "LINK/USDT": true
        },
        "paperRealTimeframe": "15m",
        "paperRealStartedAt": 1778347918360,
        "paperRealKillSwitch": {},
        "paperRealLastClose": {},
        "paperRealConsecLosses": 0,
        "paperRealGlobalPauseUntil": 0,
        "paperRealConfig": {
          "maxConcurrentPos": 3,
          "stopLossPct": 3,
          "takeProfitPct": 2,
          "cooldownMs": 600000,
          "maxConsecLosses": 3,
          "globalPauseMs": 7200000,
          "maxStakePct": 5,
          "maxRecentMovePct": 3,
          "slAtrMultiplier": 2,
          "tpAtrMultiplier": 1.5,
          "bonusMultiplierMax": 1.5,
          "adaptiveCooldown": true,
          "adaptiveStopLosses": true,
          "contextRefusalEnabled": true,
          "contextRefusalMinTrades": 20,
          "contextRefusalMaxWR": 0.3,
          "agentVotingAdaptive": true,
          "agentVoteBoostMax": 1.6,
          "agentVoteReduceMin": 0.4,
          "abTestingEnabled": true,
          "abTestingTradesPerArm": 50,
          "abTestingMutationStrength": 0.3,
          "transferLearningEnabled": true,
          "transferWeightSim": 0.3,
          "transferWeightPaperReal": 0.7,
          "transferWeightReal": 1,
          "volatilityForecastEnabled": true,
          "volatilityForecastBlockSpike": true,
          "volatilitySpikeMultiplier": 1.8,
          "reversalDetectionEnabled": true,
          "reversalRsiDivergenceThreshold": 8,
          "reversalEarlyCloseProfit": 0.5,
          "correlationLimitEnabled": true,
          "correlationThreshold": 0.7,
          "correlationDecimateFactor": 0.5,
          "sharpeAllocationEnabled": true,
          "sharpeAllocationMaxBoost": 1.5,
          "sharpeAllocationMinReduce": 0.4,
          "hedgingEnabled": false,
          "hedgingTriggerBearStreak": 3,
          "hedgingMaxAllocPct": 2
        },
        "pnlPeriod": {
          "todayStartPortfolio": 1176.0933648642945,
          "todayDate": "2026-05-09",
          "weekStartPortfolio": 1172.7090165812594,
          "weekStart": "2026-W19",
          "monthStartPortfolio": 1172.7090165812594,
          "monthStart": "2026-05",
          "history": [
            {
              "date": "2026-05-08",
              "start": 1172.71,
              "end": 1176.09,
              "pnlUsd": 3.38,
              "pnlPct": 0.29
            }
          ]
        },
        "abTesting": {
          "armA": {
            "params": {
              "slAtrMult": 2,
              "tpAtrMult": 1.5,
              "stakeFactor": 1
            },
            "trades": 0,
            "wins": 0,
            "losses": 0,
            "pnl": 0,
            "label": "A (référence)"
          },
          "armB": {
            "params": {
              "slAtrMult": 2.5,
              "tpAtrMult": 1.8,
              "stakeFactor": 1
            },
            "trades": 0,
            "wins": 0,
            "losses": 0,
            "pnl": 0,
            "label": "B (challenger)"
          },
          "nextAssign": "A",
          "generation": 0,
          "history": [],
          "lastVerdict": null
        },
        "tradeContextMemory": [],
        "adaptiveState": {
          "lastTpUsed": null,
          "lastSlUsed": null,
          "lastCooldownMs": null,
          "lastConsecLossThresh": null,
          "lastEffectiveWR": null,
          "lastMarketVolatility": null,
          "lastBonusMultipliers": {},
          "lastContextRefusalCount": 0,
          "lastContextRefusalReason": null,
          "lastAgentBoosts": {},
          "lastTransferLearning": null,
          "lastEvolutionGen": 0,
          "lastVolForecast": null,
          "lastReversalDetection": null,
          "volForecastBlocks": 0,
          "reversalEarlyCloses": 0,
          "correlationMatrix": {},
          "correlationMatrixTs": 0,
          "correlationLimitActions": 0,
          "lastCorrelationDecision": null,
          "sharpeByPair": {},
          "sharpeAllocations": {},
          "sharpeAllocTs": 0,
          "hedgeActive": false,
          "hedgeOpenedAt": 0,
          "hedgePositionId": null,
          "bearStreak": 0,
          "lastHedgeAction": null
        },
        "preRealSnapshotPaperReal": null,
        "currentPage": 0,
        "tf": "5m",
        "activePair": "BTC/USDT",
        "pairStates": {
          "BTC/USDT": {
            "price": 79987.06849536757,
            "candles": [
              {
                "o": 80360.02469877037,
                "h": 80498.30988326143,
                "l": 80300.41393209384,
                "c": 80448.32072088245,
                "v": 805.0420613328048
              },
              {
                "o": 80448.32072088245,
                "h": 80502.4214479399,
                "l": 80333.42154161823,
                "c": 80366.48626569292,
                "v": 1112.8961469804906
              },
              {
                "o": 80366.48626569292,
                "h": 80396.66924154056,
                "l": 80263.95216947177,
                "c": 80311.1551183608,
                "v": 447.8617570965705
              },
              {
                "o": 80311.1551183608,
                "h": 80340.41075028354,
                "l": 80255.22990168448,
                "c": 80293.61581694963,
                "v": 328.9931843138947
              },
              {
                "o": 80293.61581694963,
                "h": 80413.83469399065,
                "l": 79907.33212437059,
                "c": 80023.3854123856,
                "v": 2409.7730674566205
              },
              {
                "o": 80023.3854123856,
                "h": 80059.7160163421,
                "l": 79982.57845143793,
                "c": 80051.0706638782,
                "v": 535.2905351777591
              },
              {
                "o": 80051.0706638782,
                "h": 80080.08394166392,
                "l": 79971.12783754751,
                "c": 80006.41468890134,
                "v": 379.7613440317571
              },
              {
                "o": 80006.41468890134,
                "h": 80027.7213024876,
                "l": 79982.37382496858,
                "c": 80021.35462231757,
                "v": 130.9557363179764
              },
              {
                "o": 80021.35462231757,
                "h": 80143.53459139752,
                "l": 79970.15930960469,
                "c": 80101.78989243456,
                "v": 953.267276153348
              },
              {
                "o": 80101.78989243456,
                "h": 80124.45629871957,
                "l": 80021.37589915225,
                "c": 80048.37031212957,
                "v": 844.960462841593
              },
              {
                "o": 80048.37031212957,
                "h": 80173.82575655654,
                "l": 80014.89091007132,
                "c": 80139.96012507558,
                "v": 950.7951516137044
              },
              {
                "o": 80139.96012507558,
                "h": 80168.7867764236,
                "l": 80100.80235580335,
                "c": 80111.35011895522,
                "v": 667.0224588021727
              },
              {
                "o": 80111.35011895522,
                "h": 80142.51207369623,
                "l": 80056.7777419551,
                "c": 80090.84405718761,
                "v": 167.26692496818666
              },
              {
                "o": 80090.84405718761,
                "h": 80122.42020478341,
                "l": 80007.3298738522,
                "c": 80053.30959451295,
                "v": 417.01214198527566
              },
              {
                "o": 80053.30959451295,
                "h": 80150.75504816206,
                "l": 80001.26101152395,
                "c": 80123.66786292837,
                "v": 865.2989022873205
              },
              {
                "o": 80123.66786292837,
                "h": 80278.07152244964,
                "l": 80071.92002652184,
                "c": 80213.69130947512,
                "v": 690.0834851458847
              },
              {
                "o": 80213.69130947512,
                "h": 80284.1888608613,
                "l": 80197.6437996703,
                "c": 80267.18069560069,
                "v": 478.34909251278526
              },
              {
                "o": 80267.18069560069,
                "h": 80305.0760187842,
                "l": 80254.29058024134,
                "c": 80257.36167146066,
                "v": 388.0878519802166
              },
              {
                "o": 80257.36167146066,
                "h": 80336.06126759216,
                "l": 80217.14249244767,
                "c": 80289.54886747822,
                "v": 534.9392800628875
              },
              {
                "o": 80289.54886747822,
                "h": 80329.7129335618,
                "l": 80250.35198763043,
                "c": 80261.1951659984,
                "v": 373.52492731637506
              },
              {
                "o": 80261.1951659984,
                "h": 80290.33884856405,
                "l": 80176.45045379542,
                "c": 80210.68871656008,
                "v": 570.4623922859987
              },
              {
                "o": 80210.68871656008,
                "h": 80246.33008575861,
                "l": 80177.27440625893,
                "c": 80223.89625805485,
                "v": 170.64766223117488
              },
              {
                "o": 80223.89625805485,
                "h": 80239.34458677185,
                "l": 80144.16957514279,
                "c": 80184.27330799337,
                "v": 652.9743892411916
              },
              {
                "o": 80184.27330799337,
                "h": 80215.34804132569,
                "l": 80040.65886852707,
                "c": 80094.76358805016,
                "v": 969.7065418264065
              },
              {
                "o": 80094.76358805016,
                "h": 80129.95778636151,
                "l": 80016.0811288171,
                "c": 80038.71247588101,
                "v": 538.9249599857778
              },
              {
                "o": 80038.71247588101,
                "h": 80077.83439338669,
                "l": 79914.38279402899,
                "c": 79951.94957794715,
                "v": 836.3081567277387
              },
              {
                "o": 79951.94957794715,
                "h": 79967.65778533825,
                "l": 79917.62302992125,
                "c": 79933.9274222729,
                "v": 184.62742992839551
              },
              {
                "o": 79933.9274222729,
                "h": 79985.28310710279,
                "l": 79920.28011502721,
                "c": 79967.2912601369,
                "v": 615.2556992424235
              },
              {
                "o": 79967.2912601369,
                "h": 80000.12947372104,
                "l": 79903.82168431279,
                "c": 79922.05344331857,
                "v": 475.0856071967544
              },
              {
                "o": 79922.05344331857,
                "h": 79952.0092437818,
                "l": 79910.73224355462,
                "c": 79926.83486191263,
                "v": 476.713235863841
              },
              {
                "o": 79926.83486191263,
                "h": 79989.21246260674,
                "l": 79890.11197634184,
                "c": 79966.53945145111,
                "v": 312.5149545546118
              },
              {
                "o": 79966.53945145111,
                "h": 80004.39064466431,
                "l": 79911.50343918352,
                "c": 79936.56554315411,
                "v": 712.9509196037229
              },
              {
                "o": 79936.56554315411,
                "h": 80199.11591489952,
                "l": 79867.4435157194,
                "c": 80118.33551693536,
                "v": 1836.3873345893298
              },
              {
                "o": 80118.33551693536,
                "h": 80130.45629620456,
                "l": 80084.2073108796,
                "c": 80122.45382429055,
                "v": 451.75154448275595
              },
              {
                "o": 80122.45382429055,
                "h": 80141.69255297334,
                "l": 80037.15991614466,
                "c": 80064.15204658308,
                "v": 537.7320505141577
              },
              {
                "o": 80064.15204658308,
                "h": 80117.98033305108,
                "l": 80036.87999092965,
                "c": 80094.38342124422,
                "v": 633.0153154478859
              },
              {
                "o": 80094.38342124422,
                "h": 80120.10516125566,
                "l": 79987.43636759756,
                "c": 80017.27860515327,
                "v": 716.8255006953323
              },
              {
                "o": 80017.27860515327,
                "h": 80055.99334537555,
                "l": 79979.07823375388,
                "c": 80029.49458074593,
                "v": 358.0173601915125
              },
              {
                "o": 80029.49458074593,
                "h": 80118.92537477489,
                "l": 79982.79294662151,
                "c": 80078.43573887474,
                "v": 672.6887780859252
              },
              {
                "o": 80078.43573887474,
                "h": 80199.35014197591,
                "l": 80025.78510535053,
                "c": 80143.64209321192,
                "v": 694.6208566422374
              },
              {
                "o": 80143.64209321192,
                "h": 80223.78578959616,
                "l": 80109.76001955828,
                "c": 80181.81054242422,
                "v": 764.9179414884586
              },
              {
                "o": 80181.81054242422,
                "h": 80215.74479232552,
                "l": 80053.10487946162,
                "c": 80089.79542854062,
                "v": 964.633122185612
              },
              {
                "o": 80089.79542854062,
                "h": 80100.16086106966,
                "l": 80076.17762725228,
                "c": 80080.49981927806,
                "v": 171.4871932661135
              },
              {
                "o": 80080.49981927806,
                "h": 80089.2837868793,
                "l": 80065.80356464314,
                "c": 80079.25358424462,
                "v": 188.55962274294623
              },
              {
                "o": 80079.25358424462,
                "h": 80116.04946036848,
                "l": 80054.27713875327,
                "c": 80089.87157416606,
                "v": 152.45436246469123
              },
              {
                "o": 80089.87157416606,
                "h": 80200.76399334936,
                "l": 80028.30233664603,
                "c": 80167.10758021593,
                "v": 751.877935105887
              },
              {
                "o": 80167.10758021593,
                "h": 80178.87352726638,
                "l": 80165.3844944683,
                "c": 80169.13130839601,
                "v": 68.07101876025928
              },
              {
                "o": 80169.13130839601,
                "h": 80297.8928448656,
                "l": 80110.907371225,
                "c": 80258.995774714,
                "v": 694.8493295022719
              },
              {
                "o": 80258.995774714,
                "h": 80287.23558346058,
                "l": 80156.05253094019,
                "c": 80186.20878730976,
                "v": 631.2830805685554
              },
              {
                "o": 80186.20878730976,
                "h": 80242.42658009454,
                "l": 80154.41978241358,
                "c": 80220.02715062648,
                "v": 461.58247471499834
              },
              {
                "o": 80220.02715062648,
                "h": 80316.79842193815,
                "l": 80190.11373458282,
                "c": 80283.07175016246,
                "v": 649.9956898101711
              },
              {
                "o": 80283.07175016246,
                "h": 80342.3239499774,
                "l": 80152.46773936706,
                "c": 80201.1239542491,
                "v": 871.1998157767375
              },
              {
                "o": 80201.1239542491,
                "h": 80229.65684722537,
                "l": 80163.69894580285,
                "c": 80179.91280425413,
                "v": 506.9958321609147
              },
              {
                "o": 80179.91280425413,
                "h": 80321.75227896523,
                "l": 80141.22629285467,
                "c": 80262.23673828553,
                "v": 657.9918001309287
              },
              {
                "o": 80262.23673828553,
                "h": 80292.27904436324,
                "l": 80221.79829607114,
                "c": 80236.38247064981,
                "v": 446.56042089324785
              },
              {
                "o": 80236.38247064981,
                "h": 80245.88186569582,
                "l": 80192.26275221464,
                "c": 80211.42904073786,
                "v": 570.687517452584
              },
              {
                "o": 80211.42904073786,
                "h": 80238.24424325254,
                "l": 80084.2937557834,
                "c": 80131.62606589055,
                "v": 651.5541374761848
              },
              {
                "o": 80131.62606589055,
                "h": 80195.74454826557,
                "l": 80091.35501055582,
                "c": 80159.12768719318,
                "v": 449.49511992266525
              },
              {
                "o": 80159.12768719318,
                "h": 80205.49835910856,
                "l": 80018.09582149934,
                "c": 80075.25758966985,
                "v": 838.6706520506463
              },
              {
                "o": 80075.25758966985,
                "h": 80137.8218817037,
                "l": 79948.52527079503,
                "c": 79987.06849536757,
                "v": 694.3354195640997
              }
            ],
            "pnl24h": -1.5398904707069925,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 80635.39981738433,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          },
          "ETH/USDT": {
            "price": 2227.791170763417,
            "candles": [
              {
                "o": 2243.1869750455176,
                "h": 2244.3983632423215,
                "l": 2238.2181031054306,
                "c": 2240.0139062517524,
                "v": 1076.0765920012323
              },
              {
                "o": 2240.0139062517524,
                "h": 2241.3702438210858,
                "l": 2236.092734717258,
                "c": 2237.2560374857585,
                "v": 937.932828843772
              },
              {
                "o": 2237.2560374857585,
                "h": 2239.671239557546,
                "l": 2236.642583052191,
                "c": 2238.5643551712046,
                "v": 606.4211939809292
              },
              {
                "o": 2238.5643551712046,
                "h": 2239.7763390890746,
                "l": 2236.5318072702626,
                "c": 2237.207971291362,
                "v": 672.2579673570078
              },
              {
                "o": 2237.207971291362,
                "h": 2237.5814817491487,
                "l": 2235.2496720569475,
                "c": 2236.4324786435795,
                "v": 431.8464783613835
              },
              {
                "o": 2236.4324786435795,
                "h": 2237.257233255678,
                "l": 2232.8185562339527,
                "c": 2233.765332842184,
                "v": 645.0212852832091
              },
              {
                "o": 2233.765332842184,
                "h": 2235.2971789885337,
                "l": 2226.5364515854158,
                "c": 2229.176078821957,
                "v": 1259.0396478512437
              },
              {
                "o": 2229.176078821957,
                "h": 2234.7184169255625,
                "l": 2227.089656112083,
                "c": 2232.565567692761,
                "v": 1100.9485345191129
              },
              {
                "o": 2232.565567692761,
                "h": 2233.625802931597,
                "l": 2232.4219507011567,
                "c": 2232.8695117735947,
                "v": 447.23696730738845
              },
              {
                "o": 2232.8695117735947,
                "h": 2233.535728480259,
                "l": 2232.622925165782,
                "c": 2232.732366008708,
                "v": 257.14077873187523
              },
              {
                "o": 2232.732366008708,
                "h": 2235.4960618241917,
                "l": 2231.0787784291233,
                "c": 2234.7843990679776,
                "v": 618.9717938477213
              },
              {
                "o": 2234.7843990679776,
                "h": 2236.1345582915947,
                "l": 2233.342171195036,
                "c": 2233.787444145755,
                "v": 693.072211612395
              },
              {
                "o": 2233.787444145755,
                "h": 2237.5894397882525,
                "l": 2232.0348412975673,
                "c": 2236.5255357512633,
                "v": 946.4806660926607
              },
              {
                "o": 2236.5255357512633,
                "h": 2238.130279236655,
                "l": 2232.3577164858734,
                "c": 2234.1879467014646,
                "v": 983.1332649157278
              },
              {
                "o": 2234.1879467014646,
                "h": 2236.000253786005,
                "l": 2229.5884427267483,
                "c": 2231.14838996287,
                "v": 939.9140523192691
              },
              {
                "o": 2231.14838996287,
                "h": 2232.3456970420884,
                "l": 2227.6765799684154,
                "c": 2229.52310846485,
                "v": 528.0586357997206
              },
              {
                "o": 2229.52310846485,
                "h": 2230.5151036316106,
                "l": 2228.2924231414004,
                "c": 2229.276039740676,
                "v": 544.9835533381181
              },
              {
                "o": 2229.276039740676,
                "h": 2232.665640340889,
                "l": 2228.5837252182496,
                "c": 2231.0831776406435,
                "v": 687.3348666176526
              },
              {
                "o": 2231.0831776406435,
                "h": 2233.210394113023,
                "l": 2229.577211277125,
                "c": 2231.895349271817,
                "v": 278.7704851890568
              },
              {
                "o": 2231.895349271817,
                "h": 2233.181215362559,
                "l": 2231.204173240687,
                "c": 2232.3709684965875,
                "v": 590.818561847509
              },
              {
                "o": 2232.3709684965875,
                "h": 2237.2975461863457,
                "l": 2230.7400936457825,
                "c": 2235.193063066209,
                "v": 793.6627450708938
              },
              {
                "o": 2235.193063066209,
                "h": 2236.131213679757,
                "l": 2230.002296501022,
                "c": 2232.1451753692954,
                "v": 841.5247070684659
              },
              {
                "o": 2232.1451753692954,
                "h": 2233.874434416754,
                "l": 2229.895159261159,
                "c": 2230.8223807995228,
                "v": 727.9250421473264
              },
              {
                "o": 2230.8223807995228,
                "h": 2232.622838721066,
                "l": 2226.7754551110825,
                "c": 2228.3264054989604,
                "v": 557.9819165511062
              },
              {
                "o": 2228.3264054989604,
                "h": 2229.6844277905525,
                "l": 2225.402471116762,
                "c": 2226.820262101506,
                "v": 644.4218320137277
              },
              {
                "o": 2226.820262101506,
                "h": 2230.039768733841,
                "l": 2218.003425749461,
                "c": 2220.290660679569,
                "v": 1423.5567482233714
              },
              {
                "o": 2220.290660679569,
                "h": 2222.986757610541,
                "l": 2218.622764196326,
                "c": 2222.070115395293,
                "v": 752.8630998239577
              },
              {
                "o": 2222.070115395293,
                "h": 2224.733998392426,
                "l": 2220.1856302538927,
                "c": 2223.868160667427,
                "v": 497.66753064089255
              },
              {
                "o": 2223.868160667427,
                "h": 2224.9112571389724,
                "l": 2223.476666040223,
                "c": 2224.36098820067,
                "v": 527.7274027770319
              },
              {
                "o": 2224.36098820067,
                "h": 2228.666965342067,
                "l": 2223.0381864855194,
                "c": 2227.420882343379,
                "v": 844.4502660012652
              },
              {
                "o": 2227.420882343379,
                "h": 2229.249877030758,
                "l": 2226.6826182047052,
                "c": 2228.1320722683395,
                "v": 437.953314194242
              },
              {
                "o": 2228.1320722683395,
                "h": 2230.3861559860175,
                "l": 2227.290806240165,
                "c": 2229.057966166178,
                "v": 231.56723158389525
              },
              {
                "o": 2229.057966166178,
                "h": 2232.980282047963,
                "l": 2227.1462272827293,
                "c": 2231.2967436474164,
                "v": 627.8350361348625
              },
              {
                "o": 2231.2967436474164,
                "h": 2232.1403699863217,
                "l": 2229.0570591385003,
                "c": 2230.53226468109,
                "v": 243.06947804585317
              },
              {
                "o": 2230.53226468109,
                "h": 2234.187099204114,
                "l": 2229.3671961271234,
                "c": 2232.314153957272,
                "v": 431.6501851914504
              },
              {
                "o": 2232.314153957272,
                "h": 2233.7037869183637,
                "l": 2228.313684778057,
                "c": 2229.399532586149,
                "v": 670.2796027794733
              },
              {
                "o": 2229.399532586149,
                "h": 2230.631333242759,
                "l": 2227.9926539322264,
                "c": 2228.4577767649744,
                "v": 571.3644618753372
              },
              {
                "o": 2228.4577767649744,
                "h": 2230.879766099473,
                "l": 2226.8105943011437,
                "c": 2229.909135382107,
                "v": 777.8038954029444
              },
              {
                "o": 2229.909135382107,
                "h": 2234.130023494069,
                "l": 2227.6620702889236,
                "c": 2232.8348967617176,
                "v": 808.4468517729229
              },
              {
                "o": 2232.8348967617176,
                "h": 2235.76526623547,
                "l": 2232.2238665056643,
                "c": 2234.8180370805476,
                "v": 912.8154143704421
              },
              {
                "o": 2234.8180370805476,
                "h": 2235.8932661342883,
                "l": 2233.328121384647,
                "c": 2234.197464152438,
                "v": 488.26466902477364
              },
              {
                "o": 2234.197464152438,
                "h": 2236.116301852037,
                "l": 2229.5171469504944,
                "c": 2231.309902170803,
                "v": 916.1045542541499
              },
              {
                "o": 2231.309902170803,
                "h": 2234.0578899290426,
                "l": 2230.104687117988,
                "c": 2232.4469391721072,
                "v": 258.31795934898526
              },
              {
                "o": 2232.4469391721072,
                "h": 2235.1026415368656,
                "l": 2230.94389788761,
                "c": 2233.690257062353,
                "v": 273.6121441758527
              },
              {
                "o": 2233.690257062353,
                "h": 2234.8866725524726,
                "l": 2229.5919298542826,
                "c": 2231.135246874014,
                "v": 713.4117701313855
              },
              {
                "o": 2231.135246874014,
                "h": 2233.2891792284017,
                "l": 2225.8393562732344,
                "c": 2227.981979618141,
                "v": 1179.2848578764392
              },
              {
                "o": 2227.981979618141,
                "h": 2229.427546191942,
                "l": 2227.2647867650912,
                "c": 2227.5081647424618,
                "v": 427.31199013984536
              },
              {
                "o": 2227.5081647424618,
                "h": 2229.3751131335957,
                "l": 2224.06305792347,
                "c": 2225.126105613216,
                "v": 981.1800155700271
              },
              {
                "o": 2225.126105613216,
                "h": 2227.73696656105,
                "l": 2224.2703302879704,
                "c": 2226.5165933705002,
                "v": 719.9279727794193
              },
              {
                "o": 2226.5165933705002,
                "h": 2228.734789316508,
                "l": 2225.612368659463,
                "c": 2227.9161433060895,
                "v": 759.3041178441647
              },
              {
                "o": 2227.9161433060895,
                "h": 2228.85589859696,
                "l": 2227.0744540483875,
                "c": 2228.434704120748,
                "v": 195.54047557767527
              },
              {
                "o": 2228.434704120748,
                "h": 2230.1795326494284,
                "l": 2224.8297892081937,
                "c": 2226.453126637983,
                "v": 772.7132745916753
              },
              {
                "o": 2226.453126637983,
                "h": 2227.5240816724536,
                "l": 2223.099254154477,
                "c": 2224.0574952708375,
                "v": 1002.0570232853182
              },
              {
                "o": 2224.0574952708375,
                "h": 2224.8946877551643,
                "l": 2223.7308180901136,
                "c": 2224.5933384012424,
                "v": 139.61677778586386
              },
              {
                "o": 2224.5933384012424,
                "h": 2225.04625199595,
                "l": 2223.3115760570995,
                "c": 2224.3832773184777,
                "v": 454.22634955102944
              },
              {
                "o": 2224.3832773184777,
                "h": 2228.370369380666,
                "l": 2223.0210387779193,
                "c": 2226.4315547771225,
                "v": 664.8072025198281
              },
              {
                "o": 2226.4315547771225,
                "h": 2229.275006546662,
                "l": 2225.779038781937,
                "c": 2227.8151755496106,
                "v": 769.5710839650878
              },
              {
                "o": 2227.8151755496106,
                "h": 2229.478235671554,
                "l": 2223.8596997941213,
                "c": 2225.117780072314,
                "v": 736.9482028449721
              },
              {
                "o": 2225.117780072314,
                "h": 2226.533239577944,
                "l": 2224.239787241217,
                "c": 2226.145955263147,
                "v": 568.139580091048
              },
              {
                "o": 2226.145955263147,
                "h": 2228.3197104108417,
                "l": 2225.0353172239356,
                "c": 2227.791170763417,
                "v": 477.50094652873145
              }
            ],
            "pnl24h": -1.6679604129322336,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 2268.6084789566144,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          },
          "XRP/USDT": {
            "price": 1.3913714086468347,
            "candles": [
              {
                "o": 1.371889693938699,
                "h": 1.3737155335540396,
                "l": 1.3713857254441781,
                "c": 1.3730898413413282,
                "v": 891.1689139848172
              },
              {
                "o": 1.3730898413413282,
                "h": 1.3753323232668575,
                "l": 1.3725272428450874,
                "c": 1.3744998406123814,
                "v": 957.6166285716488
              },
              {
                "o": 1.3744998406123814,
                "h": 1.3752666865067635,
                "l": 1.3730424518916313,
                "c": 1.3736948278281365,
                "v": 829.0435904180601
              },
              {
                "o": 1.3736948278281365,
                "h": 1.3749698590787298,
                "l": 1.3735037481054526,
                "c": 1.3741492747585033,
                "v": 529.2414293730722
              },
              {
                "o": 1.3741492747585033,
                "h": 1.3742511945480143,
                "l": 1.3731171519449068,
                "c": 1.3738708620606617,
                "v": 428.09810208824535
              },
              {
                "o": 1.3738708620606617,
                "h": 1.375863608434769,
                "l": 1.3734827948723685,
                "c": 1.3751260084991974,
                "v": 668.7903684542059
              },
              {
                "o": 1.3751260084991974,
                "h": 1.3758062437077971,
                "l": 1.3731054266848823,
                "c": 1.3740256912426911,
                "v": 494.9783836089736
              },
              {
                "o": 1.3740256912426911,
                "h": 1.3751614378193224,
                "l": 1.3734870898224558,
                "c": 1.3748748533917865,
                "v": 643.5252056452812
              },
              {
                "o": 1.3748748533917865,
                "h": 1.3755622763047086,
                "l": 1.3737689811278546,
                "c": 1.374059230966212,
                "v": 422.1902050159613
              },
              {
                "o": 1.374059230966212,
                "h": 1.3801927870418285,
                "l": 1.3721080730966084,
                "c": 1.3786583892403865,
                "v": 2192.7841266669816
              },
              {
                "o": 1.3786583892403865,
                "h": 1.3809724267708294,
                "l": 1.3782001229491296,
                "c": 1.3801515124958146,
                "v": 641.7976544562217
              },
              {
                "o": 1.3801515124958146,
                "h": 1.380201737591884,
                "l": 1.3800645393059838,
                "c": 1.3801565453368672,
                "v": 308.4373194050105
              },
              {
                "o": 1.3801565453368672,
                "h": 1.3819492962269528,
                "l": 1.379500301096595,
                "c": 1.3810659810851351,
                "v": 873.6101219370494
              },
              {
                "o": 1.3810659810851351,
                "h": 1.3829206572753487,
                "l": 1.3806349881306514,
                "c": 1.3823076826746796,
                "v": 595.698437555174
              },
              {
                "o": 1.3823076826746796,
                "h": 1.383364755970912,
                "l": 1.3816130866839875,
                "c": 1.3826618608236827,
                "v": 398.8471100060606
              },
              {
                "o": 1.3826618608236827,
                "h": 1.3844590413760662,
                "l": 1.3822239509233676,
                "c": 1.3838957182158682,
                "v": 613.9800867217762
              },
              {
                "o": 1.3838957182158682,
                "h": 1.3860581450877096,
                "l": 1.3828787280493673,
                "c": 1.3851393436384398,
                "v": 763.2721039340895
              },
              {
                "o": 1.3851393436384398,
                "h": 1.3856197701340232,
                "l": 1.3849910309494176,
                "c": 1.3852487074301125,
                "v": 381.5467153551482
              },
              {
                "o": 1.3852487074301125,
                "h": 1.3860337337912279,
                "l": 1.3839402888462813,
                "c": 1.3846948656829416,
                "v": 258.44264594433423
              },
              {
                "o": 1.3846948656829416,
                "h": 1.3865328309259946,
                "l": 1.3843785878987793,
                "c": 1.3856874044077778,
                "v": 561.4571158975508
              },
              {
                "o": 1.3856874044077778,
                "h": 1.387641972754369,
                "l": 1.385080318056405,
                "c": 1.3868384535529237,
                "v": 809.4752746424915
              },
              {
                "o": 1.3868384535529237,
                "h": 1.3888279717808414,
                "l": 1.386005190081809,
                "c": 1.3879453925304281,
                "v": 488.7051060880304
              },
              {
                "o": 1.3879453925304281,
                "h": 1.3888180489035775,
                "l": 1.3853971899366875,
                "c": 1.386268802770968,
                "v": 763.3951151618221
              },
              {
                "o": 1.386268802770968,
                "h": 1.387209729940613,
                "l": 1.3845854498121999,
                "c": 1.3853947095329768,
                "v": 398.4125703464925
              },
              {
                "o": 1.3853947095329768,
                "h": 1.3863013875229413,
                "l": 1.383417368718724,
                "c": 1.384395843152918,
                "v": 634.507101909647
              },
              {
                "o": 1.384395843152918,
                "h": 1.3846403089898451,
                "l": 1.384193036734897,
                "c": 1.3845542086159994,
                "v": 263.2775094081402
              },
              {
                "o": 1.3845542086159994,
                "h": 1.3852547619569349,
                "l": 1.3841315252065076,
                "c": 1.3848734042498856,
                "v": 360.7351073581644
              },
              {
                "o": 1.3848734042498856,
                "h": 1.3860284268811724,
                "l": 1.3845344316541952,
                "c": 1.3853354197277437,
                "v": 542.9100333024197
              },
              {
                "o": 1.3853354197277437,
                "h": 1.3864039756685989,
                "l": 1.383484564303366,
                "c": 1.3839962779753965,
                "v": 759.3790104239592
              },
              {
                "o": 1.3839962779753965,
                "h": 1.384984664574605,
                "l": 1.3833389552367996,
                "c": 1.384525220603487,
                "v": 550.4238521692265
              },
              {
                "o": 1.384525220603487,
                "h": 1.386449391013034,
                "l": 1.3838047824187054,
                "c": 1.3858520992194248,
                "v": 802.6030250182946
              },
              {
                "o": 1.3858520992194248,
                "h": 1.3865153356222815,
                "l": 1.3845023817027877,
                "c": 1.385016167819607,
                "v": 497.6170856840569
              },
              {
                "o": 1.385016167819607,
                "h": 1.391857826691021,
                "l": 1.3831536292619693,
                "c": 1.3898762378432268,
                "v": 2396.848094386579
              },
              {
                "o": 1.3898762378432268,
                "h": 1.3909584025621091,
                "l": 1.38912116202405,
                "c": 1.3903172301010769,
                "v": 597.8554805570449
              },
              {
                "o": 1.3903172301010769,
                "h": 1.3909853728693413,
                "l": 1.389673269013445,
                "c": 1.3901920934228258,
                "v": 436.3544015306431
              },
              {
                "o": 1.3901920934228258,
                "h": 1.3909096745601883,
                "l": 1.3888439960602585,
                "c": 1.3892140608915666,
                "v": 831.8156088260318
              },
              {
                "o": 1.3892140608915666,
                "h": 1.3902051830509734,
                "l": 1.388984525496451,
                "c": 1.3898458694919467,
                "v": 739.6306145154656
              },
              {
                "o": 1.3898458694919467,
                "h": 1.390828992110469,
                "l": 1.3871678022092615,
                "c": 1.3881741519668342,
                "v": 926.4377646771608
              },
              {
                "o": 1.3881741519668342,
                "h": 1.389969980631559,
                "l": 1.3876293055840065,
                "c": 1.3892494180464445,
                "v": 888.5463413632376
              },
              {
                "o": 1.3892494180464445,
                "h": 1.390006630259501,
                "l": 1.3889944814839568,
                "c": 1.389657223753039,
                "v": 595.4575821501538
              },
              {
                "o": 1.389657223753039,
                "h": 1.3916607931958656,
                "l": 1.3886296351442076,
                "c": 1.3908654758146708,
                "v": 1003.6228433437149
              },
              {
                "o": 1.3908654758146708,
                "h": 1.3920314852342517,
                "l": 1.3902681913194248,
                "c": 1.3917040257603075,
                "v": 746.8614855575933
              },
              {
                "o": 1.3917040257603075,
                "h": 1.3934994837487895,
                "l": 1.3913212837513314,
                "c": 1.3929694622881776,
                "v": 739.4819693576287
              },
              {
                "o": 1.3929694622881776,
                "h": 1.3938006944983,
                "l": 1.3926030267448655,
                "c": 1.393407438247295,
                "v": 365.0559531066878
              },
              {
                "o": 1.393407438247295,
                "h": 1.393593222987299,
                "l": 1.392859496240345,
                "c": 1.393522664683134,
                "v": 537.8094925674604
              },
              {
                "o": 1.393522664683134,
                "h": 1.3938813849181115,
                "l": 1.3923219139067171,
                "c": 1.3930988661733932,
                "v": 366.48153320769325
              },
              {
                "o": 1.3930988661733932,
                "h": 1.393736845831406,
                "l": 1.3919003139008965,
                "c": 1.3924256689318861,
                "v": 322.2434398504042
              },
              {
                "o": 1.3924256689318861,
                "h": 1.3925852548827449,
                "l": 1.3921592781356615,
                "c": 1.3922303626116974,
                "v": 419.27964935805267
              },
              {
                "o": 1.3922303626116974,
                "h": 1.3932576768938454,
                "l": 1.3919158149808812,
                "c": 1.3924840429786898,
                "v": 109.08600835493165
              },
              {
                "o": 1.3924840429786898,
                "h": 1.3946355807024182,
                "l": 1.3913680124874088,
                "c": 1.3940219426374336,
                "v": 665.1932438462841
              },
              {
                "o": 1.3940219426374336,
                "h": 1.3949993222251806,
                "l": 1.392007843033909,
                "c": 1.392530320901118,
                "v": 1061.6927577495464
              },
              {
                "o": 1.392530320901118,
                "h": 1.394191233315515,
                "l": 1.392179653640738,
                "c": 1.393288217978433,
                "v": 471.01423589584806
              },
              {
                "o": 1.393288217978433,
                "h": 1.3945073995292194,
                "l": 1.3928381531683207,
                "c": 1.3941940797214323,
                "v": 454.0859896188458
              },
              {
                "o": 1.3941940797214323,
                "h": 1.3952621310210789,
                "l": 1.3921497373035314,
                "c": 1.3927857982409757,
                "v": 1101.1954717587569
              },
              {
                "o": 1.3927857982409757,
                "h": 1.3931212653560052,
                "l": 1.3923260615541633,
                "c": 1.392962583323836,
                "v": 419.6414767290222
              },
              {
                "o": 1.392962583323836,
                "h": 1.3947111622527917,
                "l": 1.392273328304289,
                "c": 1.394150614210357,
                "v": 611.8903929666296
              },
              {
                "o": 1.394150614210357,
                "h": 1.39445445024396,
                "l": 1.3930492294788812,
                "c": 1.3935920355394902,
                "v": 696.0693437893882
              },
              {
                "o": 1.3935920355394902,
                "h": 1.3936849936506963,
                "l": 1.3933181969659296,
                "c": 1.393560458768386,
                "v": 205.52694014622384
              },
              {
                "o": 1.393560458768386,
                "h": 1.394013081717285,
                "l": 1.392284128524441,
                "c": 1.3927235386172696,
                "v": 812.8033126866893
              },
              {
                "o": 1.3927235386172696,
                "h": 1.3935007563683623,
                "l": 1.3903449969436992,
                "c": 1.3913714086468347,
                "v": 972.6666728799709
              }
            ],
            "pnl24h": -1.0541013655948128,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 1.373959145210748,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          },
          "SOL/USDT": {
            "price": 88.24870483545712,
            "candles": [
              {
                "o": 88.16501688578909,
                "h": 88.16953310192869,
                "l": 88.16364492377598,
                "c": 88.16817383590111,
                "v": 691.883935697822
              },
              {
                "o": 88.16817383590111,
                "h": 88.17181646766124,
                "l": 88.15520938816013,
                "c": 88.16047640847749,
                "v": 826.5347232787576
              },
              {
                "o": 88.16047640847749,
                "h": 88.16165061218555,
                "l": 88.16007755191474,
                "c": 88.16038594206138,
                "v": 274.2414064426177
              },
              {
                "o": 88.16038594206138,
                "h": 88.16660516726307,
                "l": 88.15932450401822,
                "c": 88.16261040101377,
                "v": 606.7158394853088
              },
              {
                "o": 88.16261040101377,
                "h": 88.16561775022264,
                "l": 88.15488760596786,
                "c": 88.1588578049837,
                "v": 691.8539233274252
              },
              {
                "o": 88.1588578049837,
                "h": 88.16478140784672,
                "l": 88.15769177017809,
                "c": 88.16131390391573,
                "v": 657.1451850783923
              },
              {
                "o": 88.16131390391573,
                "h": 88.16392368415632,
                "l": 88.15759712188988,
                "c": 88.16106230415043,
                "v": 336.6257132487747
              },
              {
                "o": 88.16106230415043,
                "h": 88.16951141723038,
                "l": 88.15897598621525,
                "c": 88.16751441803426,
                "v": 576.8015773243837
              },
              {
                "o": 88.16751441803426,
                "h": 88.17038406930031,
                "l": 88.16141143376855,
                "c": 88.1645848290271,
                "v": 637.027150868474
              },
              {
                "o": 88.1645848290271,
                "h": 88.17441690683594,
                "l": 88.16179374539313,
                "c": 88.17013836726348,
                "v": 520.6178365583095
              },
              {
                "o": 88.17013836726348,
                "h": 88.17271068005834,
                "l": 88.16881155638796,
                "c": 88.17049908114656,
                "v": 159.18633765809057
              },
              {
                "o": 88.17049908114656,
                "h": 88.18215744955106,
                "l": 88.16664265514476,
                "c": 88.17819993157411,
                "v": 1039.4191331343907
              },
              {
                "o": 88.17819993157411,
                "h": 88.18064359696567,
                "l": 88.17718940972144,
                "c": 88.1783206749089,
                "v": 198.65219584080612
              },
              {
                "o": 88.1783206749089,
                "h": 88.18782936261773,
                "l": 88.17531076303253,
                "c": 88.1832350375447,
                "v": 446.6976743511574
              },
              {
                "o": 88.1832350375447,
                "h": 88.18671452597053,
                "l": 88.17727568568635,
                "c": 88.18008463396355,
                "v": 416.8380755586878
              },
              {
                "o": 88.18008463396355,
                "h": 88.18433163455897,
                "l": 88.17832429807105,
                "c": 88.18166577018718,
                "v": 488.0171492294977
              },
              {
                "o": 88.18166577018718,
                "h": 88.1868991224146,
                "l": 88.1809826038048,
                "c": 88.18368666069762,
                "v": 395.9264004641178
              },
              {
                "o": 88.18368666069762,
                "h": 88.18604340259847,
                "l": 88.18142712944949,
                "c": 88.18198491910175,
                "v": 258.10371614949634
              },
              {
                "o": 88.18198491910175,
                "h": 88.18363088005876,
                "l": 88.17969144110629,
                "c": 88.18310493018816,
                "v": 134.7595358307622
              },
              {
                "o": 88.18310493018816,
                "h": 88.19208733996989,
                "l": 88.17932009848818,
                "c": 88.18866275972763,
                "v": 480.24860521829464
              },
              {
                "o": 88.18866275972763,
                "h": 88.19929229003998,
                "l": 88.18427997835181,
                "c": 88.1964253727929,
                "v": 1035.4665543169835
              },
              {
                "o": 88.1964253727929,
                "h": 88.19858766309059,
                "l": 88.18517953466832,
                "c": 88.189639374214,
                "v": 760.4348072991845
              },
              {
                "o": 88.189639374214,
                "h": 88.19862897102784,
                "l": 88.18698768905232,
                "c": 88.19520237324939,
                "v": 757.7744758969047
              },
              {
                "o": 88.19520237324939,
                "h": 88.20122413543596,
                "l": 88.19220726978519,
                "c": 88.19733025819401,
                "v": 395.8076796328186
              },
              {
                "o": 88.19733025819401,
                "h": 88.19938840429616,
                "l": 88.1946179980852,
                "c": 88.19715558399447,
                "v": 352.47399597219174
              },
              {
                "o": 88.19715558399447,
                "h": 88.20056941510003,
                "l": 88.18626423851262,
                "c": 88.19029351245062,
                "v": 905.804943866649
              },
              {
                "o": 88.19029351245062,
                "h": 88.19918342345484,
                "l": 88.18669595665887,
                "c": 88.19480294150175,
                "v": 780.4543420392115
              },
              {
                "o": 88.19480294150175,
                "h": 88.19775507003348,
                "l": 88.19303661288464,
                "c": 88.19575181151335,
                "v": 114.12418603591907
              },
              {
                "o": 88.19575181151335,
                "h": 88.19824224450608,
                "l": 88.18953130848153,
                "c": 88.19148151073635,
                "v": 619.2403427482054
              },
              {
                "o": 88.19148151073635,
                "h": 88.19936346448728,
                "l": 88.18773066758592,
                "c": 88.1962929162627,
                "v": 452.7925959570741
              },
              {
                "o": 88.1962929162627,
                "h": 88.19746947052073,
                "l": 88.19133725761941,
                "c": 88.19435074828523,
                "v": 230.65021543900264
              },
              {
                "o": 88.19435074828523,
                "h": 88.20113366523513,
                "l": 88.19290121229982,
                "c": 88.19731665945979,
                "v": 476.56328969068056
              },
              {
                "o": 88.19731665945979,
                "h": 88.2002816076927,
                "l": 88.19411500818325,
                "c": 88.19751934684905,
                "v": 375.32862827476237
              },
              {
                "o": 88.19751934684905,
                "h": 88.20976356314354,
                "l": 88.19269140697081,
                "c": 88.20476199293692,
                "v": 821.6518641845171
              },
              {
                "o": 88.20476199293692,
                "h": 88.2068338411014,
                "l": 88.2024216171568,
                "c": 88.20624757402861,
                "v": 131.33628668019355
              },
              {
                "o": 88.20624757402861,
                "h": 88.20880956981786,
                "l": 88.20528562053347,
                "c": 88.20718519927382,
                "v": 374.482947224025
              },
              {
                "o": 88.20718519927382,
                "h": 88.21199762378026,
                "l": 88.19673211577468,
                "c": 88.2009582194504,
                "v": 593.7948399997276
              },
              {
                "o": 88.2009582194504,
                "h": 88.20387307157375,
                "l": 88.1889133810162,
                "c": 88.19281602933385,
                "v": 1126.6600209902458
              },
              {
                "o": 88.19281602933385,
                "h": 88.19761413515181,
                "l": 88.18332971901825,
                "c": 88.18709521159556,
                "v": 901.6916176442742
              },
              {
                "o": 88.18709521159556,
                "h": 88.19760357796595,
                "l": 88.18469991702054,
                "c": 88.19352219871087,
                "v": 824.8143672810036
              },
              {
                "o": 88.19352219871087,
                "h": 88.20649541295973,
                "l": 88.18875367388851,
                "c": 88.20148793516195,
                "v": 1033.0262209755701
              },
              {
                "o": 88.20148793516195,
                "h": 88.23767664258322,
                "l": 88.19220590311882,
                "c": 88.22897762640098,
                "v": 2481.9503685044083
              },
              {
                "o": 88.22897762640098,
                "h": 88.23471554273516,
                "l": 88.22575103318927,
                "c": 88.23239327985556,
                "v": 670.9498684741504
              },
              {
                "o": 88.23239327985556,
                "h": 88.23668020370589,
                "l": 88.22674806164456,
                "c": 88.22844131515497,
                "v": 580.2401357142062
              },
              {
                "o": 88.22844131515497,
                "h": 88.2349108139404,
                "l": 88.22710424910551,
                "c": 88.23278765830226,
                "v": 542.7375435802671
              },
              {
                "o": 88.23278765830226,
                "h": 88.24196018555062,
                "l": 88.22882340064122,
                "c": 88.23872023891188,
                "v": 849.1616907954628
              },
              {
                "o": 88.23872023891188,
                "h": 88.24385457066892,
                "l": 88.22829181511673,
                "c": 88.23145516240193,
                "v": 838.6304268892081
              },
              {
                "o": 88.23145516240193,
                "h": 88.23644141893365,
                "l": 88.23040482886114,
                "c": 88.23417694938807,
                "v": 277.19939049640254
              },
              {
                "o": 88.23417694938807,
                "h": 88.23782681535086,
                "l": 88.22851259005863,
                "c": 88.23196987957071,
                "v": 303.9443944281122
              },
              {
                "o": 88.23196987957071,
                "h": 88.2424970065541,
                "l": 88.22775331586298,
                "c": 88.23975324987258,
                "v": 1058.2024857130614
              },
              {
                "o": 88.23975324987258,
                "h": 88.24851769622992,
                "l": 88.2351615480735,
                "c": 88.2453741764876,
                "v": 744.8003074027245
              },
              {
                "o": 88.2453741764876,
                "h": 88.24907888616038,
                "l": 88.2373526986048,
                "c": 88.23968622505193,
                "v": 651.1358914538946
              },
              {
                "o": 88.23968622505193,
                "h": 88.24248994985534,
                "l": 88.23748993463676,
                "c": 88.23894659588372,
                "v": 204.46253156448023
              },
              {
                "o": 88.23894659588372,
                "h": 88.2443388007736,
                "l": 88.23805933656959,
                "c": 88.24082554185792,
                "v": 342.6879372112852
              },
              {
                "o": 88.24082554185792,
                "h": 88.24919554273038,
                "l": 88.23882068222512,
                "c": 88.2448744788982,
                "v": 623.148258098144
              },
              {
                "o": 88.2448744788982,
                "h": 88.25031457154101,
                "l": 88.22498259293863,
                "c": 88.23092394121602,
                "v": 1329.2901388804141
              },
              {
                "o": 88.23092394121602,
                "h": 88.23467821245809,
                "l": 88.2240553838725,
                "c": 88.22669084828604,
                "v": 752.8675355971461
              },
              {
                "o": 88.22669084828604,
                "h": 88.23112176591485,
                "l": 88.22453181554992,
                "c": 88.22765152575147,
                "v": 128.96495579578445
              },
              {
                "o": 88.22765152575147,
                "h": 88.234514065112,
                "l": 88.22479243097538,
                "c": 88.23150265489706,
                "v": 492.8312873053832
              },
              {
                "o": 88.23150265489706,
                "h": 88.25723009675026,
                "l": 88.22399182975413,
                "c": 88.24870483545712,
                "v": 1651.3226410116501
              }
            ],
            "pnl24h": 0.12686901752744806,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 88.27340709406408,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          },
          "DOGE/USDT": {
            "price": 0.10521294895525238,
            "candles": [
              {
                "o": 0.10467908790802255,
                "h": 0.10499010199937629,
                "l": 0.10455587734382589,
                "c": 0.10486821580565014,
                "v": 896.4103385051778
              },
              {
                "o": 0.10486821580565014,
                "h": 0.10503754627605533,
                "l": 0.10459029364353672,
                "c": 0.10469462509817552,
                "v": 688.7353580663696
              },
              {
                "o": 0.10469462509817552,
                "h": 0.10485306972631654,
                "l": 0.10431264095349806,
                "c": 0.10449714864497907,
                "v": 720.1731225813951
              },
              {
                "o": 0.10449714864497907,
                "h": 0.1048929004813852,
                "l": 0.10432734687369562,
                "c": 0.10473107969431203,
                "v": 1009.936811116759
              },
              {
                "o": 0.10473107969431203,
                "h": 0.10487424495906733,
                "l": 0.10448661923861798,
                "c": 0.10457869526019722,
                "v": 639.8462056678311
              },
              {
                "o": 0.10457869526019722,
                "h": 0.10464133663494919,
                "l": 0.10442649505666908,
                "c": 0.10451840452383573,
                "v": 422.32041394450954
              },
              {
                "o": 0.10451840452383573,
                "h": 0.10490604862817826,
                "l": 0.10436926276765437,
                "c": 0.10477448536767847,
                "v": 957.1568335077087
              },
              {
                "o": 0.10477448536767847,
                "h": 0.10482511471536383,
                "l": 0.10454658336205244,
                "c": 0.10462934090846591,
                "v": 532.8225402738002
              },
              {
                "o": 0.10462934090846591,
                "h": 0.10476164451446766,
                "l": 0.10444016981393801,
                "c": 0.10453605460261683,
                "v": 573.7209299508525
              },
              {
                "o": 0.10453605460261683,
                "h": 0.10466276092591704,
                "l": 0.10441189117908897,
                "c": 0.10452573817162979,
                "v": 243.4917577366602
              },
              {
                "o": 0.10452573817162979,
                "h": 0.10468383981113578,
                "l": 0.1044199671091453,
                "c": 0.10461223666499801,
                "v": 697.1809802297558
              },
              {
                "o": 0.10461223666499801,
                "h": 0.1050700794352108,
                "l": 0.10442959648065263,
                "c": 0.10487082207315507,
                "v": 810.4592111693398
              },
              {
                "o": 0.10487082207315507,
                "h": 0.10524378879425814,
                "l": 0.10478115035007116,
                "c": 0.10514967753304888,
                "v": 890.3766160092373
              },
              {
                "o": 0.10514967753304888,
                "h": 0.10517122032605537,
                "l": 0.10504890717961896,
                "c": 0.10515440920281363,
                "v": 342.67249255298015
              },
              {
                "o": 0.10515440920281363,
                "h": 0.10535029971548422,
                "l": 0.10504679420001374,
                "c": 0.10526157116745521,
                "v": 490.5871476348741
              },
              {
                "o": 0.10526157116745521,
                "h": 0.10552052841545619,
                "l": 0.10520548225464033,
                "c": 0.10542266455211773,
                "v": 577.627429389818
              },
              {
                "o": 0.10542266455211773,
                "h": 0.10576400712594301,
                "l": 0.10533262316608305,
                "c": 0.10561518503475188,
                "v": 744.4369526594473
              },
              {
                "o": 0.10561518503475188,
                "h": 0.10571998406098629,
                "l": 0.10516310505927465,
                "c": 0.10531219104762027,
                "v": 975.3456711261496
              },
              {
                "o": 0.10531219104762027,
                "h": 0.10567716096130736,
                "l": 0.10516826769472185,
                "c": 0.1055758586559165,
                "v": 1038.596688508168
              },
              {
                "o": 0.1055758586559165,
                "h": 0.10569439598472738,
                "l": 0.10520994488749691,
                "c": 0.10536117892763867,
                "v": 621.1123330387819
              },
              {
                "o": 0.10536117892763867,
                "h": 0.10545965079905897,
                "l": 0.10506608295736099,
                "c": 0.10515221066006832,
                "v": 636.3993081930502
              },
              {
                "o": 0.10515221066006832,
                "h": 0.10545845287786207,
                "l": 0.10502100558917206,
                "c": 0.10532076263207042,
                "v": 576.6196407936975
              },
              {
                "o": 0.10532076263207042,
                "h": 0.10541341079119775,
                "l": 0.10513715189055547,
                "c": 0.10518095729678074,
                "v": 641.1521365731342
              },
              {
                "o": 0.10518095729678074,
                "h": 0.10532825609769524,
                "l": 0.10487403983293798,
                "c": 0.10495556307736315,
                "v": 876.4963686502722
              },
              {
                "o": 0.10495556307736315,
                "h": 0.10504172848594225,
                "l": 0.10488325007255318,
                "c": 0.10492387701790068,
                "v": 506.20465686314895
              },
              {
                "o": 0.10492387701790068,
                "h": 0.10505075673379063,
                "l": 0.1048708791808135,
                "c": 0.10490362386019851,
                "v": 267.4948947844697
              },
              {
                "o": 0.10490362386019851,
                "h": 0.10494634495980301,
                "l": 0.10479361564262878,
                "c": 0.10484888905905801,
                "v": 354.2881151597892
              },
              {
                "o": 0.10484888905905801,
                "h": 0.10494985124151118,
                "l": 0.10476011664241593,
                "c": 0.10478562357863845,
                "v": 330.28224440650627
              },
              {
                "o": 0.10478562357863845,
                "h": 0.10488844119655275,
                "l": 0.10466443275426021,
                "c": 0.10475168195995399,
                "v": 229.78783565437817
              },
              {
                "o": 0.10475168195995399,
                "h": 0.1050935702615417,
                "l": 0.10455692881547207,
                "c": 0.10498634645804776,
                "v": 962.5457942249968
              },
              {
                "o": 0.10498634645804776,
                "h": 0.10499604861826355,
                "l": 0.10486469596259547,
                "c": 0.1049794119910464,
                "v": 459.23421736166176
              },
              {
                "o": 0.1049794119910464,
                "h": 0.10502518892117788,
                "l": 0.10481747924584928,
                "c": 0.10492085512241532,
                "v": 255.72846091022814
              },
              {
                "o": 0.10492085512241532,
                "h": 0.1050117830174132,
                "l": 0.10482669223601228,
                "c": 0.10489274361117072,
                "v": 434.39025286796846
              },
              {
                "o": 0.10489274361117072,
                "h": 0.10491825395072317,
                "l": 0.10487261200400207,
                "c": 0.1049005786154501,
                "v": 54.069636936295055
              },
              {
                "o": 0.1049005786154501,
                "h": 0.10532728802468848,
                "l": 0.10473520842707143,
                "c": 0.10514753110429322,
                "v": 831.0808343485829
              },
              {
                "o": 0.10514753110429322,
                "h": 0.10531357980076257,
                "l": 0.10503127098706994,
                "c": 0.1051932860269576,
                "v": 362.85836324459405
              },
              {
                "o": 0.1051932860269576,
                "h": 0.10528932312305284,
                "l": 0.10516630765809327,
                "c": 0.10520357235546068,
                "v": 105.34115025800975
              },
              {
                "o": 0.10520357235546068,
                "h": 0.1053268100554318,
                "l": 0.10510027845080874,
                "c": 0.10521128475450392,
                "v": 286.67827752210684
              },
              {
                "o": 0.10521128475450392,
                "h": 0.10568926661411944,
                "l": 0.10503125932388015,
                "c": 0.10549027242751031,
                "v": 1143.5791783802808
              },
              {
                "o": 0.10549027242751031,
                "h": 0.10557181957621223,
                "l": 0.10523809384770168,
                "c": 0.10536355986169028,
                "v": 501.8343667142511
              },
              {
                "o": 0.10536355986169028,
                "h": 0.10555147804333001,
                "l": 0.10496030802620405,
                "c": 0.10513019446664856,
                "v": 570.3675963691977
              },
              {
                "o": 0.10513019446664856,
                "h": 0.10526032580652744,
                "l": 0.10480523087566468,
                "c": 0.10495969039321817,
                "v": 747.0760227795257
              },
              {
                "o": 0.10495969039321817,
                "h": 0.10508980531699388,
                "l": 0.10468093217762432,
                "c": 0.1048391266274324,
                "v": 546.4326792792915
              },
              {
                "o": 0.1048391266274324,
                "h": 0.10489283101170038,
                "l": 0.10458434001934379,
                "c": 0.10466678826179832,
                "v": 659.4015822169691
              },
              {
                "o": 0.10466678826179832,
                "h": 0.10500263755979822,
                "l": 0.1045871651499648,
                "c": 0.104897015746264,
                "v": 906.7388506193122
              },
              {
                "o": 0.104897015746264,
                "h": 0.10495908449282276,
                "l": 0.10466748260169946,
                "c": 0.10481670905995276,
                "v": 574.2158555042397
              },
              {
                "o": 0.10481670905995276,
                "h": 0.10519378458457371,
                "l": 0.10469072470263667,
                "c": 0.10504305073725484,
                "v": 1011.4836449129876
              },
              {
                "o": 0.10504305073725484,
                "h": 0.10516884199325052,
                "l": 0.10467293121392487,
                "c": 0.10480923843348326,
                "v": 869.6615526382775
              },
              {
                "o": 0.10480923843348326,
                "h": 0.1052130540152868,
                "l": 0.10467739853368313,
                "c": 0.10504872703174858,
                "v": 749.1868730287656
              },
              {
                "o": 0.10504872703174858,
                "h": 0.10513854175142733,
                "l": 0.10465788895405714,
                "c": 0.10481742977769154,
                "v": 589.6335361293613
              },
              {
                "o": 0.10481742977769154,
                "h": 0.10511285680471244,
                "l": 0.10472292841453418,
                "c": 0.10500677167623541,
                "v": 639.2218039166892
              },
              {
                "o": 0.10500677167623541,
                "h": 0.10510629076952857,
                "l": 0.10457400945987007,
                "c": 0.10474672960827422,
                "v": 686.3924577362403
              },
              {
                "o": 0.10474672960827422,
                "h": 0.1048410535912306,
                "l": 0.1047007540047212,
                "c": 0.1047389096982191,
                "v": 402.1347486927814
              },
              {
                "o": 0.1047389096982191,
                "h": 0.10482358303290777,
                "l": 0.10471256107789836,
                "c": 0.10475188567046023,
                "v": 110.30963763992601
              },
              {
                "o": 0.10475188567046023,
                "h": 0.10488504297050683,
                "l": 0.10453710876503529,
                "c": 0.10462531260541642,
                "v": 624.8367818669808
              },
              {
                "o": 0.10462531260541642,
                "h": 0.10473192877437826,
                "l": 0.10444437479178194,
                "c": 0.10448809516977232,
                "v": 372.54762766024646
              },
              {
                "o": 0.10448809516977232,
                "h": 0.10454550503590582,
                "l": 0.1042854971213468,
                "c": 0.10433539594343426,
                "v": 634.7960365731847
              },
              {
                "o": 0.10433539594343426,
                "h": 0.104439544577389,
                "l": 0.10416140274402352,
                "c": 0.10420461499152456,
                "v": 514.543899616684
              },
              {
                "o": 0.10420461499152456,
                "h": 0.10548598449091208,
                "l": 0.10385578528758532,
                "c": 0.10514660341172352,
                "v": 2586.1651752316916
              },
              {
                "o": 0.10514660341172352,
                "h": 0.1053371673212561,
                "l": 0.1051256619369746,
                "c": 0.10521294895525238,
                "v": 322.7450466446113
              }
            ],
            "pnl24h": -3.6579941295667213,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 0.10643611028063851,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          },
          "ADA/USDT": {
            "price": 0.2641002604101817,
            "candles": [
              {
                "o": 0.2633572329197989,
                "h": 0.2634422265525254,
                "l": 0.26328341806633204,
                "c": 0.2633069742839734,
                "v": 408.1730409665231
              },
              {
                "o": 0.2633069742839734,
                "h": 0.2633370756692417,
                "l": 0.26320259778921234,
                "c": 0.2632602875122656,
                "v": 603.49650837046
              },
              {
                "o": 0.2632602875122656,
                "h": 0.2633243935452012,
                "l": 0.2631740336621073,
                "c": 0.26330210803515935,
                "v": 501.0946462952106
              },
              {
                "o": 0.26330210803515935,
                "h": 0.26340196754808354,
                "l": 0.2632859283167548,
                "c": 0.26334174316990405,
                "v": 118.89059806325227
              },
              {
                "o": 0.26334174316990405,
                "h": 0.2637030974430518,
                "l": 0.26320531685579296,
                "c": 0.26356077376625925,
                "v": 1122.144908160287
              },
              {
                "o": 0.26356077376625925,
                "h": 0.26382198942128626,
                "l": 0.26350536163411925,
                "c": 0.2637089876579979,
                "v": 926.865440662403
              },
              {
                "o": 0.2637089876579979,
                "h": 0.26401794967099873,
                "l": 0.26355600202265095,
                "c": 0.2639288685902737,
                "v": 1080.4280549428058
              },
              {
                "o": 0.2639288685902737,
                "h": 0.2640064651234197,
                "l": 0.2636991125030347,
                "c": 0.26378933148797035,
                "v": 850.9234696578774
              },
              {
                "o": 0.26378933148797035,
                "h": 0.263943855324909,
                "l": 0.26345913993880116,
                "c": 0.26358496972412104,
                "v": 895.9851974088888
              },
              {
                "o": 0.26358496972412104,
                "h": 0.26364466991959973,
                "l": 0.26330845302618505,
                "c": 0.26340207292443024,
                "v": 893.362115729585
              },
              {
                "o": 0.26340207292443024,
                "h": 0.2636194024793579,
                "l": 0.26327060281406006,
                "c": 0.2635180911659031,
                "v": 407.41000179372594
              },
              {
                "o": 0.2635180911659031,
                "h": 0.26379445283705827,
                "l": 0.2634210632018944,
                "c": 0.26368781241152733,
                "v": 531.9044545514935
              },
              {
                "o": 0.26368781241152733,
                "h": 0.26376101408690916,
                "l": 0.26340868506088355,
                "c": 0.2634835948530667,
                "v": 864.6001899042155
              },
              {
                "o": 0.2634835948530667,
                "h": 0.2635750825551976,
                "l": 0.26315005274266073,
                "c": 0.2632884002104656,
                "v": 899.4168877055713
              },
              {
                "o": 0.2632884002104656,
                "h": 0.26348243123543164,
                "l": 0.26317611987625666,
                "c": 0.26336435875267206,
                "v": 673.4068217849957
              },
              {
                "o": 0.26336435875267206,
                "h": 0.2634941114041051,
                "l": 0.26302425780889926,
                "c": 0.2631340455328666,
                "v": 685.8629959586605
              },
              {
                "o": 0.2631340455328666,
                "h": 0.26344177464388563,
                "l": 0.26305043851261284,
                "c": 0.26336119011891623,
                "v": 681.5957187447764
              },
              {
                "o": 0.26336119011891623,
                "h": 0.2634657684301514,
                "l": 0.2629921863367872,
                "c": 0.2631366312467671,
                "v": 1099.5282169673424
              },
              {
                "o": 0.2631366312467671,
                "h": 0.26326272066295214,
                "l": 0.2628293668628855,
                "c": 0.26295935402765486,
                "v": 639.4108336537078
              },
              {
                "o": 0.26295935402765486,
                "h": 0.2632492466726127,
                "l": 0.2628554207908989,
                "c": 0.26316055047803794,
                "v": 729.685547043159
              },
              {
                "o": 0.26316055047803794,
                "h": 0.2632324652091526,
                "l": 0.2630444593094155,
                "c": 0.2631127703470544,
                "v": 412.59860133936184
              },
              {
                "o": 0.2631127703470544,
                "h": 0.26345790902144006,
                "l": 0.2629718434765637,
                "c": 0.2633455349080865,
                "v": 802.480725453373
              },
              {
                "o": 0.2633455349080865,
                "h": 0.26338829383213025,
                "l": 0.2631826060248937,
                "c": 0.2632351402726821,
                "v": 447.57421849878983
              },
              {
                "o": 0.2632351402726821,
                "h": 0.2643828112187293,
                "l": 0.26298534246606414,
                "c": 0.26405269156294964,
                "v": 2763.9781639841235
              },
              {
                "o": 0.26405269156294964,
                "h": 0.26413599713892416,
                "l": 0.26376887136504923,
                "c": 0.26385648622545244,
                "v": 819.6867818500259
              },
              {
                "o": 0.26385648622545244,
                "h": 0.26391901877079343,
                "l": 0.2636372761573318,
                "c": 0.26372498992069665,
                "v": 573.3990861790184
              },
              {
                "o": 0.26372498992069665,
                "h": 0.2638086653765317,
                "l": 0.263457947059911,
                "c": 0.26355035476459143,
                "v": 553.918505150193
              },
              {
                "o": 0.26355035476459143,
                "h": 0.26362433956065545,
                "l": 0.26343480584332285,
                "c": 0.26353903184616057,
                "v": 247.13380082527848
              },
              {
                "o": 0.26353903184616057,
                "h": 0.26366543856336033,
                "l": 0.26326406508494604,
                "c": 0.2633591063298067,
                "v": 716.8470210424534
              },
              {
                "o": 0.2633591063298067,
                "h": 0.2635079482803221,
                "l": 0.26325174500546317,
                "c": 0.2634650668894553,
                "v": 592.0868214832199
              },
              {
                "o": 0.2634650668894553,
                "h": 0.26360213805598426,
                "l": 0.2633743873678016,
                "c": 0.26354380123114507,
                "v": 426.6929438754496
              },
              {
                "o": 0.26354380123114507,
                "h": 0.2635829294098357,
                "l": 0.26341644099997646,
                "c": 0.2634675297534401,
                "v": 595.2482674535233
              },
              {
                "o": 0.2634675297534401,
                "h": 0.2635611561052919,
                "l": 0.2633799371501336,
                "c": 0.2635226980606856,
                "v": 194.32522245271298
              },
              {
                "o": 0.2635226980606856,
                "h": 0.2636533024821828,
                "l": 0.2631994701740287,
                "c": 0.2632882881532308,
                "v": 855.1358538348654
              },
              {
                "o": 0.2632882881532308,
                "h": 0.263540547913622,
                "l": 0.26323384716428333,
                "c": 0.26340778233728157,
                "v": 592.9520300620062
              },
              {
                "o": 0.26340778233728157,
                "h": 0.2637061510680537,
                "l": 0.26333101199117187,
                "c": 0.26361906524931894,
                "v": 952.8523401232148
              },
              {
                "o": 0.26361906524931894,
                "h": 0.2638978728574255,
                "l": 0.26352067721164946,
                "c": 0.2637674265352169,
                "v": 626.4565150498464
              },
              {
                "o": 0.2637674265352169,
                "h": 0.26388024201014076,
                "l": 0.26370976399111457,
                "c": 0.26385004929234296,
                "v": 537.2700348082843
              },
              {
                "o": 0.26385004929234296,
                "h": 0.26392600251526704,
                "l": 0.2635563147070112,
                "c": 0.26363529550054143,
                "v": 939.0811527498065
              },
              {
                "o": 0.26363529550054143,
                "h": 0.2638513798469553,
                "l": 0.26354187458301964,
                "c": 0.26373548918540196,
                "v": 523.4759264334801
              },
              {
                "o": 0.26373548918540196,
                "h": 0.26403127073925264,
                "l": 0.263611132091028,
                "c": 0.2639257197957423,
                "v": 658.6773541430741
              },
              {
                "o": 0.2639257197957423,
                "h": 0.2641265842092762,
                "l": 0.2637943602251011,
                "c": 0.26407953625047,
                "v": 611.7759307288593
              },
              {
                "o": 0.26407953625047,
                "h": 0.264953892165773,
                "l": 0.2638104112539675,
                "c": 0.264725580997593,
                "v": 2193.6730001653623
              },
              {
                "o": 0.264725580997593,
                "h": 0.26486426269329866,
                "l": 0.2646937109513078,
                "c": 0.2648151222582965,
                "v": 434.26721900389896
              },
              {
                "o": 0.2648151222582965,
                "h": 0.26511601374214727,
                "l": 0.26469413744658044,
                "c": 0.2649990420440994,
                "v": 655.7224213879288
              },
              {
                "o": 0.2649990420440994,
                "h": 0.265112187974055,
                "l": 0.26460478703254453,
                "c": 0.26475767063945105,
                "v": 920.911074651611
              },
              {
                "o": 0.26475767063945105,
                "h": 0.2648052642368049,
                "l": 0.26470266142539983,
                "c": 0.2647186241312983,
                "v": 478.01097449919513
              },
              {
                "o": 0.2647186241312983,
                "h": 0.2649690333103761,
                "l": 0.2639207495613592,
                "c": 0.2641700167527375,
                "v": 2102.955373432956
              },
              {
                "o": 0.2641700167527375,
                "h": 0.26424364719496135,
                "l": 0.26413630373127783,
                "c": 0.2642096315312398,
                "v": 329.38631402217305
              },
              {
                "o": 0.2642096315312398,
                "h": 0.26433099937364724,
                "l": 0.26414830273917245,
                "c": 0.26423739048467476,
                "v": 83.8626811477401
              },
              {
                "o": 0.26423739048467476,
                "h": 0.26452916357895395,
                "l": 0.26407754747065026,
                "c": 0.2644582393510018,
                "v": 878.2640355578869
              },
              {
                "o": 0.2644582393510018,
                "h": 0.26464923169017623,
                "l": 0.2643645706796562,
                "c": 0.2645442841042657,
                "v": 300.8684496614698
              },
              {
                "o": 0.2645442841042657,
                "h": 0.2646396895120406,
                "l": 0.26448950140894684,
                "c": 0.2645808981910041,
                "v": 386.15299126574394
              },
              {
                "o": 0.2645808981910041,
                "h": 0.26464288300736527,
                "l": 0.26435698501636373,
                "c": 0.26440975399328986,
                "v": 727.305007494527
              },
              {
                "o": 0.26440975399328986,
                "h": 0.26446911736142276,
                "l": 0.26411558285114944,
                "c": 0.26422048062301323,
                "v": 995.4551043044692
              },
              {
                "o": 0.26422048062301323,
                "h": 0.26435623391626506,
                "l": 0.2641408273510666,
                "c": 0.26430214583450046,
                "v": 303.9220173697622
              },
              {
                "o": 0.26430214583450046,
                "h": 0.2643455471874618,
                "l": 0.2640814411609121,
                "c": 0.26419977272335043,
                "v": 623.3570025688853
              },
              {
                "o": 0.26419977272335043,
                "h": 0.264263922308681,
                "l": 0.26411020021429926,
                "c": 0.26423914471653764,
                "v": 581.9488320156557
              },
              {
                "o": 0.26423914471653764,
                "h": 0.2643438294744437,
                "l": 0.2641941834426241,
                "c": 0.26430430124221316,
                "v": 495.2024482387794
              },
              {
                "o": 0.26430430124221316,
                "h": 0.26443675195400435,
                "l": 0.2639986061334603,
                "c": 0.2641002604101817,
                "v": 651.923504423653
              }
            ],
            "pnl24h": -1.341667774262598,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 0.26056153759032075,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          },
          "AVAX/USDT": {
            "price": 9.509827278812606,
            "candles": [
              {
                "o": 9.499977753434335,
                "h": 9.503776070228929,
                "l": 9.498658620998333,
                "c": 9.502877167544547,
                "v": 907.6935129465605
              },
              {
                "o": 9.502877167544547,
                "h": 9.503324571446637,
                "l": 9.502765600632996,
                "c": 9.502951928434822,
                "v": 241.09262260775554
              },
              {
                "o": 9.502951928434822,
                "h": 9.50542910853919,
                "l": 9.502054389320767,
                "c": 9.50401540649703,
                "v": 268.5582460125365
              },
              {
                "o": 9.50401540649703,
                "h": 9.506560661065011,
                "l": 9.50334267979736,
                "c": 9.50549607998251,
                "v": 332.0497056855652
              },
              {
                "o": 9.50549607998251,
                "h": 9.506924240079801,
                "l": 9.504441434266917,
                "c": 9.504947371564496,
                "v": 306.33183634764555
              },
              {
                "o": 9.504947371564496,
                "h": 9.506712457110693,
                "l": 9.501382175255946,
                "c": 9.50285645516898,
                "v": 638.5698437725428
              },
              {
                "o": 9.50285645516898,
                "h": 9.504847352739773,
                "l": 9.502363112785016,
                "c": 9.503640783878735,
                "v": 647.3043078479942
              },
              {
                "o": 9.503640783878735,
                "h": 9.5043338404327,
                "l": 9.501293605674926,
                "c": 9.502402607066651,
                "v": 472.0506640151382
              },
              {
                "o": 9.502402607066651,
                "h": 9.502865082718396,
                "l": 9.502126407653593,
                "c": 9.502508824738362,
                "v": 278.5091802076281
              },
              {
                "o": 9.502508824738362,
                "h": 9.505282559050947,
                "l": 9.50171318356593,
                "c": 9.503917658985083,
                "v": 606.4493161324001
              },
              {
                "o": 9.503917658985083,
                "h": 9.505715826674727,
                "l": 9.499701673007337,
                "c": 9.500924309637314,
                "v": 924.0117975560397
              },
              {
                "o": 9.500924309637314,
                "h": 9.504735668560508,
                "l": 9.49910896593007,
                "c": 9.5029399811351,
                "v": 726.2970936517156
              },
              {
                "o": 9.5029399811351,
                "h": 9.50458747521492,
                "l": 9.500198949192077,
                "c": 9.501043885012148,
                "v": 479.14149902879194
              },
              {
                "o": 9.501043885012148,
                "h": 9.502626055902688,
                "l": 9.499090024211146,
                "c": 9.499916904518,
                "v": 705.0768149355573
              },
              {
                "o": 9.499916904518,
                "h": 9.50438052433931,
                "l": 9.49816505663949,
                "c": 9.502412265994623,
                "v": 812.8866353265787
              },
              {
                "o": 9.502412265994623,
                "h": 9.503096361961287,
                "l": 9.50166283531892,
                "c": 9.502338454675368,
                "v": 506.9623298386309
              },
              {
                "o": 9.502338454675368,
                "h": 9.503993162805056,
                "l": 9.501760712141436,
                "c": 9.503188786732755,
                "v": 652.9384374475242
              },
              {
                "o": 9.503188786732755,
                "h": 9.504898350562675,
                "l": 9.502819315811522,
                "c": 9.50359165790045,
                "v": 97.43841222021929
              },
              {
                "o": 9.50359165790045,
                "h": 9.506605436883953,
                "l": 9.50285859197091,
                "c": 9.505768221508797,
                "v": 825.196525380484
              },
              {
                "o": 9.505768221508797,
                "h": 9.507452642813687,
                "l": 9.50302304180338,
                "c": 9.50378899295119,
                "v": 472.2116090753441
              },
              {
                "o": 9.50378899295119,
                "h": 9.50460439719223,
                "l": 9.502419962401785,
                "c": 9.502781038887836,
                "v": 631.3480967112064
              },
              {
                "o": 9.502781038887836,
                "h": 9.503575072239297,
                "l": 9.501409136751416,
                "c": 9.502594170549454,
                "v": 226.05933002518805
              },
              {
                "o": 9.502594170549454,
                "h": 9.503834352876334,
                "l": 9.501534388514125,
                "c": 9.502918724852433,
                "v": 107.36216721153932
              },
              {
                "o": 9.502918724852433,
                "h": 9.507614355855123,
                "l": 9.50156705723424,
                "c": 9.50594611508441,
                "v": 757.4787347138249
              },
              {
                "o": 9.50594611508441,
                "h": 9.50779122710105,
                "l": 9.50542608813056,
                "c": 9.507267784527155,
                "v": 401.07941114978934
              },
              {
                "o": 9.507267784527155,
                "h": 9.508160645049287,
                "l": 9.50313887298379,
                "c": 9.504984957057765,
                "v": 662.1012371142887
              },
              {
                "o": 9.504984957057765,
                "h": 9.507160555885436,
                "l": 9.504180555426942,
                "c": 9.506160038544003,
                "v": 362.9790493064303
              },
              {
                "o": 9.506160038544003,
                "h": 9.508143174142964,
                "l": 9.504916403577084,
                "c": 9.507501993249127,
                "v": 752.9100247751919
              },
              {
                "o": 9.507501993249127,
                "h": 9.50970712657193,
                "l": 9.50301919001003,
                "c": 9.504417738669993,
                "v": 1133.424950200314
              },
              {
                "o": 9.504417738669993,
                "h": 9.505133010164272,
                "l": 9.503312412334425,
                "c": 9.50404653213761,
                "v": 350.4724940001249
              },
              {
                "o": 9.50404653213761,
                "h": 9.507790463328655,
                "l": 9.502762620857693,
                "c": 9.506542036303935,
                "v": 890.9200730363027
              },
              {
                "o": 9.506542036303935,
                "h": 9.508035593469591,
                "l": 9.50534282051247,
                "c": 9.506029658521758,
                "v": 538.102500408138
              },
              {
                "o": 9.506029658521758,
                "h": 9.506279719172836,
                "l": 9.504245543595383,
                "c": 9.505433302482775,
                "v": 452.570158653564
              },
              {
                "o": 9.505433302482775,
                "h": 9.507232259902159,
                "l": 9.500805556164408,
                "c": 9.502735054994922,
                "v": 841.1271052914104
              },
              {
                "o": 9.502735054994922,
                "h": 9.506583700266907,
                "l": 9.500936342253693,
                "c": 9.505382925570991,
                "v": 652.6794683920662
              },
              {
                "o": 9.505382925570991,
                "h": 9.506910405131995,
                "l": 9.505129664566992,
                "c": 9.506132363181734,
                "v": 237.81289655218444
              },
              {
                "o": 9.506132363181734,
                "h": 9.506492754195579,
                "l": 9.505377361629852,
                "c": 9.506238726181552,
                "v": 89.609028802099
              },
              {
                "o": 9.506238726181552,
                "h": 9.508695383585188,
                "l": 9.505447025914984,
                "c": 9.507171796317097,
                "v": 543.5590436665697
              },
              {
                "o": 9.507171796317097,
                "h": 9.511293167453452,
                "l": 9.505287561144526,
                "c": 9.50969528694246,
                "v": 841.8288977816334
              },
              {
                "o": 9.50969528694246,
                "h": 9.510513729340687,
                "l": 9.506210722855483,
                "c": 9.507261712249958,
                "v": 1026.094538431818
              },
              {
                "o": 9.507261712249958,
                "h": 9.510852503732028,
                "l": 9.505069764374454,
                "c": 9.50999858644403,
                "v": 994.9349000305954
              },
              {
                "o": 9.50999858644403,
                "h": 9.51162057431021,
                "l": 9.506484747783944,
                "c": 9.507681710251896,
                "v": 809.8255436839836
              },
              {
                "o": 9.507681710251896,
                "h": 9.50873217213059,
                "l": 9.50393358173175,
                "c": 9.505159824664144,
                "v": 859.3927793149483
              },
              {
                "o": 9.505159824664144,
                "h": 9.506368525816958,
                "l": 9.504256737620127,
                "c": 9.505712897113046,
                "v": 284.55033057436015
              },
              {
                "o": 9.505712897113046,
                "h": 9.507532460824013,
                "l": 9.501419177240747,
                "c": 9.503299605528925,
                "v": 923.1464405339227
              },
              {
                "o": 9.503299605528925,
                "h": 9.504130228894136,
                "l": 9.502636545302465,
                "c": 9.503453653727934,
                "v": 260.8781894603072
              },
              {
                "o": 9.503453653727934,
                "h": 9.503861727059098,
                "l": 9.502985588662117,
                "c": 9.503299842060152,
                "v": 378.79403217201695
              },
              {
                "o": 9.503299842060152,
                "h": 9.504737491288557,
                "l": 9.50177381222717,
                "c": 9.50307596323081,
                "v": 288.1378387686954
              },
              {
                "o": 9.50307596323081,
                "h": 9.505899772755456,
                "l": 9.501528042174753,
                "c": 9.504296611588362,
                "v": 484.4189673801235
              },
              {
                "o": 9.504296611588362,
                "h": 9.508113068377877,
                "l": 9.503496271124776,
                "c": 9.506599578410382,
                "v": 510.3078481708592
              },
              {
                "o": 9.506599578410382,
                "h": 9.50971397926844,
                "l": 9.505876723844182,
                "c": 9.508845056112726,
                "v": 543.9727655167146
              },
              {
                "o": 9.508845056112726,
                "h": 9.51207474495622,
                "l": 9.507929504097078,
                "c": 9.510501100118505,
                "v": 548.3920640212925
              },
              {
                "o": 9.510501100118505,
                "h": 9.512175388419546,
                "l": 9.506606846468475,
                "c": 9.50827738983653,
                "v": 974.1639817343996
              },
              {
                "o": 9.50827738983653,
                "h": 9.512058601036042,
                "l": 9.50691361381556,
                "c": 9.510504121463592,
                "v": 927.8913823825872
              },
              {
                "o": 9.510504121463592,
                "h": 9.512072410256573,
                "l": 9.507653014837084,
                "c": 9.508712747862763,
                "v": 880.8827524556411
              },
              {
                "o": 9.508712747862763,
                "h": 9.510449040441799,
                "l": 9.504920774302859,
                "c": 9.506648864418226,
                "v": 930.571795855484
              },
              {
                "o": 9.506648864418226,
                "h": 9.508437508806013,
                "l": 9.506018206830237,
                "c": 9.507487844992356,
                "v": 204.0441049807254
              },
              {
                "o": 9.507487844992356,
                "h": 9.508903634454951,
                "l": 9.50629791653693,
                "c": 9.506722076788158,
                "v": 518.7366577788493
              },
              {
                "o": 9.506722076788158,
                "h": 9.509707712233766,
                "l": 9.50512922450276,
                "c": 9.508470667635663,
                "v": 564.6463870215504
              },
              {
                "o": 9.508470667635663,
                "h": 9.510999273323646,
                "l": 9.506739690302496,
                "c": 9.509827278812606,
                "v": 510.56402590875695
              }
            ],
            "pnl24h": -0.7043682917091085,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 9.51016518123985,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          },
          "LINK/USDT": {
            "price": 9.843171833907721,
            "candles": [
              {
                "o": 9.849392461990373,
                "h": 9.851181344074506,
                "l": 9.847901756202535,
                "c": 9.84838590632337,
                "v": 256.3736520686012
              },
              {
                "o": 9.84838590632337,
                "h": 9.85394749034345,
                "l": 9.846407914699014,
                "c": 9.852287382145075,
                "v": 520.3311281589982
              },
              {
                "o": 9.852287382145075,
                "h": 9.854723300377351,
                "l": 9.848661150839401,
                "c": 9.85113528130544,
                "v": 494.2128879671354
              },
              {
                "o": 9.85113528130544,
                "h": 9.852531619001708,
                "l": 9.846586434091556,
                "c": 9.847763042303844,
                "v": 784.542920681828
              },
              {
                "o": 9.847763042303844,
                "h": 9.848886588082287,
                "l": 9.842217543880427,
                "c": 9.845260424992105,
                "v": 314.25303975245697
              },
              {
                "o": 9.845260424992105,
                "h": 9.84805562741232,
                "l": 9.841188340682898,
                "c": 9.842211241421293,
                "v": 374.2666149407575
              },
              {
                "o": 9.842211241421293,
                "h": 9.845085672279618,
                "l": 9.840985916455123,
                "c": 9.843937524409597,
                "v": 345.59739179455863
              },
              {
                "o": 9.843937524409597,
                "h": 9.846613282282373,
                "l": 9.835447763979289,
                "c": 9.83926178439321,
                "v": 1023.5960394803801
              },
              {
                "o": 9.83926178439321,
                "h": 9.840036777280698,
                "l": 9.836958880365993,
                "c": 9.83970239872621,
                "v": 146.05125803988128
              },
              {
                "o": 9.83970239872621,
                "h": 9.844596353864452,
                "l": 9.83699095705747,
                "c": 9.84214609405984,
                "v": 611.9223474793603
              },
              {
                "o": 9.84214609405984,
                "h": 9.84524258013665,
                "l": 9.835594637761716,
                "c": 9.837790612305524,
                "v": 940.8504869409044
              },
              {
                "o": 9.837790612305524,
                "h": 9.840230305680596,
                "l": 9.829321008829922,
                "c": 9.832891500417857,
                "v": 682.2483510219648
              },
              {
                "o": 9.832891500417857,
                "h": 9.835553690182282,
                "l": 9.831730152046262,
                "c": 9.83385413206339,
                "v": 408.9166333621067
              },
              {
                "o": 9.83385413206339,
                "h": 9.835946148342337,
                "l": 9.829299408834407,
                "c": 9.831401614834688,
                "v": 385.8983778005092
              },
              {
                "o": 9.831401614834688,
                "h": 9.849159444633921,
                "l": 9.826020273476727,
                "c": 9.843554541743984,
                "v": 1875.2316903408137
              },
              {
                "o": 9.843554541743984,
                "h": 9.847191473985228,
                "l": 9.836875271222855,
                "c": 9.838515203834246,
                "v": 1056.7387706597515
              },
              {
                "o": 9.838515203834246,
                "h": 9.845916253311247,
                "l": 9.835196666185611,
                "c": 9.842599347590404,
                "v": 966.3568655442383
              },
              {
                "o": 9.842599347590404,
                "h": 9.8434571248013,
                "l": 9.842027455654714,
                "c": 9.842760188639168,
                "v": 316.64226794420966
              },
              {
                "o": 9.842760188639168,
                "h": 9.844016321080897,
                "l": 9.838812348714812,
                "c": 9.839851229189616,
                "v": 796.4399579389554
              },
              {
                "o": 9.839851229189616,
                "h": 9.84040418876913,
                "l": 9.837175529963234,
                "c": 9.839150328767317,
                "v": 215.98442008847087
              },
              {
                "o": 9.839150328767317,
                "h": 9.841755468227628,
                "l": 9.834657558636213,
                "c": 9.83748960311885,
                "v": 401.52587287520964
              },
              {
                "o": 9.83748960311885,
                "h": 9.839688168361304,
                "l": 9.832313620082855,
                "c": 9.834441731965406,
                "v": 473.8916577986887
              },
              {
                "o": 9.834441731965406,
                "h": 9.836257446275113,
                "l": 9.833008258871006,
                "c": 9.834047201145456,
                "v": 141.65243636147966
              },
              {
                "o": 9.834047201145456,
                "h": 9.834773800615155,
                "l": 9.83031528040953,
                "c": 9.831664601497042,
                "v": 559.2168484372335
              },
              {
                "o": 9.831664601497042,
                "h": 9.8344528267466,
                "l": 9.829410954143349,
                "c": 9.832437032679396,
                "v": 353.06174839925234
              },
              {
                "o": 9.832437032679396,
                "h": 9.834305373142069,
                "l": 9.830028292527684,
                "c": 9.83250584804842,
                "v": 92.00145532607101
              },
              {
                "o": 9.83250584804842,
                "h": 9.835024207975419,
                "l": 9.823567971301902,
                "c": 9.826839582803036,
                "v": 775.9164413119868
              },
              {
                "o": 9.826839582803036,
                "h": 9.835013423475697,
                "l": 9.825010282434272,
                "c": 9.832340062205665,
                "v": 694.9883377062409
              },
              {
                "o": 9.832340062205665,
                "h": 9.835890021720553,
                "l": 9.826348779984082,
                "c": 9.828693930593012,
                "v": 528.0567977097047
              },
              {
                "o": 9.828693930593012,
                "h": 9.830608240068301,
                "l": 9.821727380108664,
                "c": 9.824999260341881,
                "v": 796.371949797807
              },
              {
                "o": 9.824999260341881,
                "h": 9.826176997788576,
                "l": 9.822918097151746,
                "c": 9.824751925049426,
                "v": 301.24682243417413
              },
              {
                "o": 9.824751925049426,
                "h": 9.825644575802254,
                "l": 9.820182284767116,
                "c": 9.822218623009885,
                "v": 378.05799461217146
              },
              {
                "o": 9.822218623009885,
                "h": 9.824611079708262,
                "l": 9.818714213296404,
                "c": 9.820029967525146,
                "v": 756.6729680809151
              },
              {
                "o": 9.820029967525146,
                "h": 9.824753204622786,
                "l": 9.81759562226512,
                "c": 9.823442541203585,
                "v": 902.8823140300981
              },
              {
                "o": 9.823442541203585,
                "h": 9.825767404779297,
                "l": 9.820593962309438,
                "c": 9.821900559374651,
                "v": 448.5362389302706
              },
              {
                "o": 9.821900559374651,
                "h": 9.827565708465855,
                "l": 9.820014686189356,
                "c": 9.824970263806215,
                "v": 511.8616157286509
              },
              {
                "o": 9.824970263806215,
                "h": 9.828599834878041,
                "l": 9.823508996187906,
                "c": 9.827126173438243,
                "v": 271.4710602987806
              },
              {
                "o": 9.827126173438243,
                "h": 9.828602730930504,
                "l": 9.821052343163887,
                "c": 9.823417185991454,
                "v": 456.90867451582807
              },
              {
                "o": 9.823417185991454,
                "h": 9.831001513888255,
                "l": 9.819716964394958,
                "c": 9.82912064616344,
                "v": 778.7770670411999
              },
              {
                "o": 9.82912064616344,
                "h": 9.836606717573982,
                "l": 9.826063601570942,
                "c": 9.83361327426393,
                "v": 963.8003743887122
              },
              {
                "o": 9.83361327426393,
                "h": 9.835717233987145,
                "l": 9.832054650964933,
                "c": 9.834051404156861,
                "v": 290.3567241431712
              },
              {
                "o": 9.834051404156861,
                "h": 9.842263495514576,
                "l": 9.831881006251018,
                "c": 9.83939041413221,
                "v": 860.8300899677048
              },
              {
                "o": 9.83939041413221,
                "h": 9.84100447212748,
                "l": 9.8366001326878,
                "c": 9.838676960367058,
                "v": 456.8723473456321
              },
              {
                "o": 9.838676960367058,
                "h": 9.839794067365801,
                "l": 9.837432615396024,
                "c": 9.838718549285401,
                "v": 178.52199429959177
              },
              {
                "o": 9.838718549285401,
                "h": 9.839879350438322,
                "l": 9.833292976782447,
                "c": 9.835408856517194,
                "v": 463.2186808304529
              },
              {
                "o": 9.835408856517194,
                "h": 9.838296734371566,
                "l": 9.82892523340956,
                "c": 9.832067957595918,
                "v": 591.9919048962184
              },
              {
                "o": 9.832067957595918,
                "h": 9.837403268996274,
                "l": 9.828980372720778,
                "c": 9.834305726133167,
                "v": 677.5085067511409
              },
              {
                "o": 9.834305726133167,
                "h": 9.83565888249007,
                "l": 9.829218506632357,
                "c": 9.832042996688166,
                "v": 526.6140053879983
              },
              {
                "o": 9.832042996688166,
                "h": 9.833764244202344,
                "l": 9.827734011257242,
                "c": 9.830219583496662,
                "v": 548.0650336481922
              },
              {
                "o": 9.830219583496662,
                "h": 9.832543068152889,
                "l": 9.822740968029029,
                "c": 9.824635549168502,
                "v": 1123.5067231611188
              },
              {
                "o": 9.824635549168502,
                "h": 9.831151302266049,
                "l": 9.821994365484283,
                "c": 9.829557913585088,
                "v": 791.2400767382435
              },
              {
                "o": 9.829557913585088,
                "h": 9.831897752822465,
                "l": 9.828048608062307,
                "c": 9.830584917915626,
                "v": 214.95910747096238
              },
              {
                "o": 9.830584917915626,
                "h": 9.83540603909988,
                "l": 9.82968751621257,
                "c": 9.832721586018119,
                "v": 634.2462635212487
              },
              {
                "o": 9.832721586018119,
                "h": 9.834452824084725,
                "l": 9.83180468798665,
                "c": 9.833559827268376,
                "v": 516.6495163620882
              },
              {
                "o": 9.833559827268376,
                "h": 9.834649387539926,
                "l": 9.829737733708905,
                "c": 9.830695820921111,
                "v": 507.14494987437484
              },
              {
                "o": 9.830695820921111,
                "h": 9.839061266161638,
                "l": 9.828225791466682,
                "c": 9.835600936067623,
                "v": 1009.6963782969634
              },
              {
                "o": 9.835600936067623,
                "h": 9.839516213072395,
                "l": 9.833611909438714,
                "c": 9.837429937167968,
                "v": 344.10584208643377
              },
              {
                "o": 9.837429937167968,
                "h": 9.84260244096409,
                "l": 9.83582999974002,
                "c": 9.840387615205898,
                "v": 627.0712162499615
              },
              {
                "o": 9.840387615205898,
                "h": 9.845900872678625,
                "l": 9.838222273907343,
                "c": 9.84343073441982,
                "v": 848.7719683079903
              },
              {
                "o": 9.84343073441982,
                "h": 9.84417745397952,
                "l": 9.842828551320837,
                "c": 9.843171833907721,
                "v": 426.4023651692192
              }
            ],
            "pnl24h": -0.74592761427157,
            "qYes": 53000,
            "qNo": 47000,
            "trades": [],
            "totalTrades": 0,
            "winTrades": 0,
            "totalPnlPct": 0,
            "totalPnlUsd": 0,
            "bestTrade": null,
            "worstTrade": null,
            "capital": 10000,
            "stake": 0,
            "pairLeverage": 1,
            "threshold": 0.6,
            "cycleMax": 60,
            "cycleTimer": 0,
            "userCycleSet": false,
            "holdStartTs": 0,
            "lastAction": "hold",
            "userStake": false,
            "_leverageBonus": 0,
            "_lastProposalPrice": 9.912801512495419,
            "killSwitch": false,
            "killSwitchTs": 0,
            "consecutiveLosses": 0,
            "_targetPrice": null
          }
        },
        "openPositions": [],
        "proposals": [
          {
            "id": 42,
            "desc": "Augmenter taille position BTC 0.01→0.02",
            "forVotes": 1850,
            "againstVotes": 1094,
            "status": "active",
            "userVoted": false
          },
          {
            "id": 43,
            "desc": "Ouvrir position SOL/USDT 5% du capital",
            "forVotes": 980,
            "againstVotes": 410,
            "status": "active",
            "userVoted": false
          }
        ],
        "globalMemoryPool": [],
        "dreams": [
          {
            "id": 11,
            "startCycle": 336,
            "time": "08:47:11",
            "scenarios": [
              {
                "id": "sideways_grind",
                "icon": "😴",
                "name": "Consolidation",
                "sub": "±0.3% pendant 2h",
                "direction": 0,
                "magnitude": 0.003,
                "vol": 0.3,
                "duration": 15,
                "agentVotes": 1964,
                "agentAgainst": 0,
                "outcome": {
                  "priceDelta": -0.000217927643143788,
                  "shadowCandles": 15,
                  "survived": true
                },
                "calibration": {
                  "type": "widen_cycles",
                  "factor": 1.2,
                  "reason": "Consolidation"
                }
              },
              {
                "id": "regulatory_ban",
                "icon": "⚖️",
                "name": "Choc Réglementaire",
                "sub": "-28% ouverture gap",
                "direction": -1,
                "magnitude": 0.28,
                "vol": 4.2,
                "duration": 5,
                "agentVotes": 456,
                "agentAgainst": 1557,
                "outcome": {
                  "priceDelta": -0.16957513206822106,
                  "shadowCandles": 5,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Choc Réglementaire"
                }
              },
              {
                "id": "flash_crash",
                "icon": "💥",
                "name": "Flash Crash",
                "sub": "-18% en 4 minutes",
                "direction": -1,
                "magnitude": 0.18,
                "vol": 3.5,
                "duration": 8,
                "agentVotes": 167,
                "agentAgainst": 1817,
                "outcome": {
                  "priceDelta": -0.095375621172159,
                  "shadowCandles": 8,
                  "survived": true
                },
                "calibration": null
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 333,
            "time": "08:47:01",
            "scenarios": [
              {
                "id": "regulatory_ban",
                "icon": "⚖️",
                "name": "Choc Réglementaire",
                "sub": "-28% ouverture gap",
                "direction": -1,
                "magnitude": 0.28,
                "vol": 4.2,
                "duration": 5,
                "agentVotes": 466,
                "agentAgainst": 1489,
                "outcome": {
                  "priceDelta": -0.17267058076673752,
                  "shadowCandles": 5,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Choc Réglementaire"
                }
              },
              {
                "id": "liquidity_void",
                "icon": "🌑",
                "name": "Void de Liquidité",
                "sub": "Spread ×8, order book vide",
                "direction": -1,
                "magnitude": 0.09,
                "vol": 5,
                "duration": 6,
                "agentVotes": 596,
                "agentAgainst": 1397,
                "outcome": {
                  "priceDelta": -0.056377113116589106,
                  "shadowCandles": 6,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "parabolic_run",
                "icon": "🚀",
                "name": "Parabolic Run",
                "sub": "+22% en 6 minutes",
                "direction": 1,
                "magnitude": 0.22,
                "vol": 2.8,
                "duration": 10,
                "agentVotes": 90,
                "agentAgainst": 1934,
                "outcome": {
                  "priceDelta": 0.1184071020674211,
                  "shadowCandles": 10,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Parabolic Run"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 328,
            "time": "08:46:53",
            "scenarios": [
              {
                "id": "liquidity_void",
                "icon": "🌑",
                "name": "Void de Liquidité",
                "sub": "Spread ×8, order book vide",
                "direction": -1,
                "magnitude": 0.09,
                "vol": 5,
                "duration": 6,
                "agentVotes": 497,
                "agentAgainst": 1517,
                "outcome": {
                  "priceDelta": -0.04842269408244441,
                  "shadowCandles": 6,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "flash_crash",
                "icon": "💥",
                "name": "Flash Crash",
                "sub": "-18% en 4 minutes",
                "direction": -1,
                "magnitude": 0.18,
                "vol": 3.5,
                "duration": 8,
                "agentVotes": 505,
                "agentAgainst": 1487,
                "outcome": {
                  "priceDelta": -0.09386634763372805,
                  "shadowCandles": 8,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "regulatory_ban",
                "icon": "⚖️",
                "name": "Choc Réglementaire",
                "sub": "-28% ouverture gap",
                "direction": -1,
                "magnitude": 0.28,
                "vol": 4.2,
                "duration": 5,
                "agentVotes": 221,
                "agentAgainst": 1803,
                "outcome": {
                  "priceDelta": -0.17439745604798831,
                  "shadowCandles": 5,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Choc Réglementaire"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 325,
            "time": "08:46:45",
            "scenarios": [
              {
                "id": "flash_crash",
                "icon": "💥",
                "name": "Flash Crash",
                "sub": "-18% en 4 minutes",
                "direction": -1,
                "magnitude": 0.18,
                "vol": 3.5,
                "duration": 8,
                "agentVotes": 123,
                "agentAgainst": 1848,
                "outcome": {
                  "priceDelta": -0.10493355589579294,
                  "shadowCandles": 8,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Flash Crash"
                }
              },
              {
                "id": "liquidity_void",
                "icon": "🌑",
                "name": "Void de Liquidité",
                "sub": "Spread ×8, order book vide",
                "direction": -1,
                "magnitude": 0.09,
                "vol": 5,
                "duration": 6,
                "agentVotes": 296,
                "agentAgainst": 1788,
                "outcome": {
                  "priceDelta": -0.054399210703799085,
                  "shadowCandles": 6,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "regulatory_ban",
                "icon": "⚖️",
                "name": "Choc Réglementaire",
                "sub": "-28% ouverture gap",
                "direction": -1,
                "magnitude": 0.28,
                "vol": 4.2,
                "duration": 5,
                "agentVotes": 691,
                "agentAgainst": 1360,
                "outcome": {
                  "priceDelta": -0.16530006243611345,
                  "shadowCandles": 5,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Choc Réglementaire"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 317,
            "time": "08:46:37",
            "scenarios": [
              {
                "id": "flash_crash",
                "icon": "💥",
                "name": "Flash Crash",
                "sub": "-18% en 4 minutes",
                "direction": -1,
                "magnitude": 0.18,
                "vol": 3.5,
                "duration": 8,
                "agentVotes": 52,
                "agentAgainst": 2013,
                "outcome": {
                  "priceDelta": -0.09473958488875282,
                  "shadowCandles": 8,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "whale_pump",
                "icon": "🐋",
                "name": "Whale Pump",
                "sub": "+14% en 2 minutes",
                "direction": 1,
                "magnitude": 0.14,
                "vol": 2.2,
                "duration": 7,
                "agentVotes": 779,
                "agentAgainst": 1241,
                "outcome": {
                  "priceDelta": 0.08351785383657648,
                  "shadowCandles": 7,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "sideways_grind",
                "icon": "😴",
                "name": "Consolidation",
                "sub": "±0.3% pendant 2h",
                "direction": 0,
                "magnitude": 0.003,
                "vol": 0.3,
                "duration": 15,
                "agentVotes": 2050,
                "agentAgainst": 0,
                "outcome": {
                  "priceDelta": -0.0015151705684241885,
                  "shadowCandles": 15,
                  "survived": true
                },
                "calibration": {
                  "type": "widen_cycles",
                  "factor": 1.2,
                  "reason": "Consolidation"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 312,
            "time": "08:46:28",
            "scenarios": [
              {
                "id": "parabolic_run",
                "icon": "🚀",
                "name": "Parabolic Run",
                "sub": "+22% en 6 minutes",
                "direction": 1,
                "magnitude": 0.22,
                "vol": 2.8,
                "duration": 10,
                "agentVotes": 192,
                "agentAgainst": 1811,
                "outcome": {
                  "priceDelta": 0.12473833793992592,
                  "shadowCandles": 10,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Parabolic Run"
                }
              },
              {
                "id": "liquidity_void",
                "icon": "🌑",
                "name": "Void de Liquidité",
                "sub": "Spread ×8, order book vide",
                "direction": -1,
                "magnitude": 0.09,
                "vol": 5,
                "duration": 6,
                "agentVotes": 373,
                "agentAgainst": 1656,
                "outcome": {
                  "priceDelta": -0.05305003498187737,
                  "shadowCandles": 6,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "sideways_grind",
                "icon": "😴",
                "name": "Consolidation",
                "sub": "±0.3% pendant 2h",
                "direction": 0,
                "magnitude": 0.003,
                "vol": 0.3,
                "duration": 15,
                "agentVotes": 2016,
                "agentAgainst": 0,
                "outcome": {
                  "priceDelta": 0.00015489440442135945,
                  "shadowCandles": 15,
                  "survived": true
                },
                "calibration": {
                  "type": "widen_cycles",
                  "factor": 1.2,
                  "reason": "Consolidation"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 309,
            "time": "08:46:20",
            "scenarios": [
              {
                "id": "regulatory_ban",
                "icon": "⚖️",
                "name": "Choc Réglementaire",
                "sub": "-28% ouverture gap",
                "direction": -1,
                "magnitude": 0.28,
                "vol": 4.2,
                "duration": 5,
                "agentVotes": 177,
                "agentAgainst": 1812,
                "outcome": {
                  "priceDelta": -0.16837678571382844,
                  "shadowCandles": 5,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Choc Réglementaire"
                }
              },
              {
                "id": "liquidity_void",
                "icon": "🌑",
                "name": "Void de Liquidité",
                "sub": "Spread ×8, order book vide",
                "direction": -1,
                "magnitude": 0.09,
                "vol": 5,
                "duration": 6,
                "agentVotes": 177,
                "agentAgainst": 1810,
                "outcome": {
                  "priceDelta": -0.04953277161066353,
                  "shadowCandles": 6,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "flash_crash",
                "icon": "💥",
                "name": "Flash Crash",
                "sub": "-18% en 4 minutes",
                "direction": -1,
                "magnitude": 0.18,
                "vol": 3.5,
                "duration": 8,
                "agentVotes": 177,
                "agentAgainst": 1807,
                "outcome": {
                  "priceDelta": -0.10361546213647523,
                  "shadowCandles": 8,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Flash Crash"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 304,
            "time": "08:08:34",
            "scenarios": [
              {
                "id": "sideways_grind",
                "icon": "😴",
                "name": "Consolidation",
                "sub": "±0.3% pendant 2h",
                "direction": 0,
                "magnitude": 0.003,
                "vol": 0.3,
                "duration": 15,
                "agentVotes": 1959,
                "agentAgainst": 0,
                "outcome": {
                  "priceDelta": -0.0007452140791854887,
                  "shadowCandles": 15,
                  "survived": true
                },
                "calibration": {
                  "type": "widen_cycles",
                  "factor": 1.2,
                  "reason": "Consolidation"
                }
              },
              {
                "id": "whale_pump",
                "icon": "🐋",
                "name": "Whale Pump",
                "sub": "+14% en 2 minutes",
                "direction": 1,
                "magnitude": 0.14,
                "vol": 2.2,
                "duration": 7,
                "agentVotes": 243,
                "agentAgainst": 1716,
                "outcome": {
                  "priceDelta": 0.08427504081626169,
                  "shadowCandles": 7,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "flash_crash",
                "icon": "💥",
                "name": "Flash Crash",
                "sub": "-18% en 4 minutes",
                "direction": -1,
                "magnitude": 0.18,
                "vol": 3.5,
                "duration": 8,
                "agentVotes": 170,
                "agentAgainst": 1788,
                "outcome": {
                  "priceDelta": -0.1093825297299046,
                  "shadowCandles": 8,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Flash Crash"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 296,
            "time": "08:08:27",
            "scenarios": [
              {
                "id": "regulatory_ban",
                "icon": "⚖️",
                "name": "Choc Réglementaire",
                "sub": "-28% ouverture gap",
                "direction": -1,
                "magnitude": 0.28,
                "vol": 4.2,
                "duration": 5,
                "agentVotes": 592,
                "agentAgainst": 1425,
                "outcome": {
                  "priceDelta": -0.16639731230358612,
                  "shadowCandles": 5,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Choc Réglementaire"
                }
              },
              {
                "id": "sideways_grind",
                "icon": "😴",
                "name": "Consolidation",
                "sub": "±0.3% pendant 2h",
                "direction": 0,
                "magnitude": 0.003,
                "vol": 0.3,
                "duration": 15,
                "agentVotes": 1970,
                "agentAgainst": 0,
                "outcome": {
                  "priceDelta": -0.00029637997500618396,
                  "shadowCandles": 15,
                  "survived": true
                },
                "calibration": {
                  "type": "widen_cycles",
                  "factor": 1.2,
                  "reason": "Consolidation"
                }
              },
              {
                "id": "parabolic_run",
                "icon": "🚀",
                "name": "Parabolic Run",
                "sub": "+22% en 6 minutes",
                "direction": 1,
                "magnitude": 0.22,
                "vol": 2.8,
                "duration": 10,
                "agentVotes": 251,
                "agentAgainst": 1717,
                "outcome": {
                  "priceDelta": 0.1204501611033274,
                  "shadowCandles": 10,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Parabolic Run"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          },
          {
            "id": 11,
            "startCycle": 293,
            "time": "08:08:19",
            "scenarios": [
              {
                "id": "whale_pump",
                "icon": "🐋",
                "name": "Whale Pump",
                "sub": "+14% en 2 minutes",
                "direction": 1,
                "magnitude": 0.14,
                "vol": 2.2,
                "duration": 7,
                "agentVotes": 645,
                "agentAgainst": 1389,
                "outcome": {
                  "priceDelta": 0.07923743367868433,
                  "shadowCandles": 7,
                  "survived": true
                },
                "calibration": null
              },
              {
                "id": "parabolic_run",
                "icon": "🚀",
                "name": "Parabolic Run",
                "sub": "+22% en 6 minutes",
                "direction": 1,
                "magnitude": 0.22,
                "vol": 2.8,
                "duration": 10,
                "agentVotes": 698,
                "agentAgainst": 1303,
                "outcome": {
                  "priceDelta": 0.12217610277794982,
                  "shadowCandles": 10,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Parabolic Run"
                }
              },
              {
                "id": "regulatory_ban",
                "icon": "⚖️",
                "name": "Choc Réglementaire",
                "sub": "-28% ouverture gap",
                "direction": -1,
                "magnitude": 0.28,
                "vol": 4.2,
                "duration": 5,
                "agentVotes": 164,
                "agentAgainst": 1834,
                "outcome": {
                  "priceDelta": -0.16652489864030698,
                  "shadowCandles": 5,
                  "survived": true
                },
                "calibration": {
                  "type": "tighten_sl",
                  "factor": 0.85,
                  "reason": "Choc Réglementaire"
                }
              }
            ],
            "complete": true,
            "insight": "Système résilient sur les 3 scénarios testés. Paramètres de risque stables."
          }
        ],
        "dreamActive": true,
        "dreamProgress": 67,
        "currentDream": {
          "id": 11,
          "startCycle": 341,
          "time": "08:47:19",
          "scenarios": [
            {
              "id": "liquidity_void",
              "icon": "🌑",
              "name": "Void de Liquidité",
              "sub": "Spread ×8, order book vide",
              "direction": -1,
              "magnitude": 0.09,
              "vol": 5,
              "duration": 6,
              "agentVotes": 72,
              "agentAgainst": 1911,
              "outcome": {
                "priceDelta": -0.04818860513554448,
                "shadowCandles": 6,
                "survived": true
              },
              "calibration": null
            },
            {
              "id": "flash_crash",
              "icon": "💥",
              "name": "Flash Crash",
              "sub": "-18% en 4 minutes",
              "direction": -1,
              "magnitude": 0.18,
              "vol": 3.5,
              "duration": 8,
              "agentVotes": 522,
              "agentAgainst": 1464,
              "outcome": {
                "priceDelta": -0.10603784439023167,
                "shadowCandles": 8,
                "survived": true
              },
              "calibration": {
                "type": "tighten_sl",
                "factor": 0.85,
                "reason": "Flash Crash"
              }
            },
            {
              "id": "sideways_grind",
              "icon": "😴",
              "name": "Consolidation",
              "sub": "±0.3% pendant 2h",
              "direction": 0,
              "magnitude": 0.003,
              "vol": 0.3,
              "duration": 15,
              "agentVotes": 0,
              "agentAgainst": 0,
              "outcome": null,
              "calibration": null
            }
          ],
          "complete": false,
          "insight": ""
        },
        "_holdConsecutive": {
          "BTC/USDT": 0,
          "ETH/USDT": 0,
          "XRP/USDT": 0,
          "SOL/USDT": 0,
          "DOGE/USDT": 0,
          "ADA/USDT": 0,
          "AVAX/USDT": 0,
          "LINK/USDT": 0
        },
        "vMajor": 8,
        "vMinor": 92,
        "mode": "auto",
        "pairCandidates": [
          {
            "sym": "DOGE",
            "name": "Dogecoin",
            "color": "#c3a634",
            "startPrice": 0.165,
            "vol": 0.004,
            "minP": 0.05,
            "maxP": 0.8,
            "dec": 4,
            "emoji": "🐕",
            "corr": "LOW",
            "rationale": "Capitalisation top-10, corrélation BTC ~0.72, fort signal sentiment communautaire. Diversifie l'exposition meme-coin."
          },
          {
            "sym": "AVAX",
            "name": "Avalanche",
            "color": "#e84142",
            "startPrice": 28.5,
            "vol": 0.9,
            "minP": 10,
            "maxP": 120,
            "dec": 2,
            "emoji": "🔺",
            "corr": "MED",
            "rationale": "Écosystème DeFi croissant, corrélation ETH ~0.81. Agent On-Chain détecte activité smart-contract en hausse."
          },
          {
            "sym": "LINK",
            "name": "Chainlink",
            "color": "#375bd2",
            "startPrice": 14.2,
            "vol": 0.4,
            "minP": 5,
            "maxP": 50,
            "dec": 2,
            "emoji": "⛓",
            "corr": "LOW",
            "rationale": "Infrastructure oracle critique, décorrélé des majeurs. Signal fondamental très fort — adoption institutionnelle."
          },
          {
            "sym": "ADA",
            "name": "Cardano",
            "color": "#0033ad",
            "startPrice": 0.44,
            "vol": 0.012,
            "minP": 0.15,
            "maxP": 2.5,
            "dec": 4,
            "emoji": "🔵",
            "corr": "MED",
            "rationale": "Volume trading élevé, forte activité on-chain. Complète l'exposition smart-contract sans doublon ETH."
          },
          {
            "sym": "BNB",
            "name": "BNB Chain",
            "color": "#f3ba2f",
            "startPrice": 580,
            "vol": 12,
            "minP": 200,
            "maxP": 1200,
            "dec": 0,
            "emoji": "🟡",
            "corr": "HIGH",
            "rationale": "Liquidité maximale exchange natif, frais réduits. Corrélation BTC utilisable comme couverture implicite."
          },
          {
            "sym": "DOT",
            "name": "Polkadot",
            "color": "#e6007a",
            "startPrice": 6.8,
            "vol": 0.25,
            "minP": 3,
            "maxP": 30,
            "dec": 2,
            "emoji": "🔴",
            "corr": "LOW",
            "rationale": "Interopérabilité parachain — exposition future Web3 orthogonale aux assets actuels du portefeuille."
          }
        ],
        "activePairProposal": null,
        "feeConfig": {
          "makerRate": 0.0002,
          "takerRate": 0.0005,
          "fundingRate": 5e-05,
          "slippage": 0.0003
        },
        "taxConfig": {
          "region": "BE",
          "regions": {
            "BE": {
              "label": "🇧🇪 Belgique",
              "rate": 0,
              "inclusion": 0,
              "method": "Exonéré*",
              "note": "Gains en capital exonérés si gestion \"normale\" du patrimoine. Spéculation taxée 33%"
            },
            "CA": {
              "label": "🇨🇦 Canada",
              "rate": 0.267,
              "inclusion": 0.5,
              "method": "Inclusion 50%",
              "note": "Gains en capital: 50% inclus dans revenus, ~26.7% effectif"
            },
            "FR": {
              "label": "🇫🇷 France",
              "rate": 0.3,
              "inclusion": 1,
              "method": "Flat Tax 30%",
              "note": "PFU 30% (12.8% IR + 17.2% PS) sur gains nets"
            },
            "US": {
              "label": "🇺🇸 États-Unis",
              "rate": 0.2,
              "inclusion": 1,
              "method": "Capital Gains",
              "note": "20% long-terme / 37% court-terme sur gains nets"
            },
            "CH": {
              "label": "🇨🇭 Suisse",
              "rate": 0,
              "inclusion": 0,
              "method": "Exonéré",
              "note": "Gains en capital exonérés si non-professionnel"
            },
            "SG": {
              "label": "🇸🇬 Singapour",
              "rate": 0,
              "inclusion": 0,
              "method": "Exonéré",
              "note": "Pas d'impôt sur gains en capital crypto"
            },
            "EU": {
              "label": "🇪🇺 Europe (moy)",
              "rate": 0.2,
              "inclusion": 1,
              "method": "Variable",
              "note": "Taux moyen orientatif ~20%, varie par pays"
            }
          }
        },
        "fees": {
          "totalTradingFees": 0,
          "totalFunding": 0,
          "totalSlippage": 0,
          "totalGross": 0,
          "totalTaxProvision": 0,
          "totalPnlGross": 0,
          "totalPnlNet": 0,
          "tradeCount": 0,
          "feeReserveAccount": 0,
          "feeLog": [],
          "byPair": {}
        },
        "agents": [
          {
            "id": "rescue_bot_v1",
            "name": "Bot Sauvetage",
            "emoji": "🛟",
            "type": "Emergency·Flat",
            "source": "Drawdown·VaR",
            "score": 0.12,
            "conf": 0.92,
            "fitness": 955,
            "color": "var(--down)",
            "role": "execution",
            "domain": "rescue",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "isFleet": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              954.788157508002,
              954.935527691935,
              954.7918458797774,
              955.1874498256162,
              955.2258184048894,
              955.0520662047493,
              954.9815447968805,
              955.0149965874081,
              955.2249200783284,
              955.0538239725047,
              955.2460049424004,
              954.7527494930492,
              955.1571408147046,
              955.1241720720776,
              955.115011923046,
              954.9829100079444,
              955.2077642726184,
              955.060742957973,
              955.1865713368626,
              955.0517716012347,
              954.8213783587055,
              954.9394660914471,
              955.0615720040543,
              954.9224929514534,
              954.825670133038,
              954.8762949599301,
              955.1900787321657,
              955.210355644929,
              954.781803051717,
              955.1573776033118,
              955.0133840120492,
              954.9429786597528,
              955.024783205445,
              955.0137979654633,
              954.8498751467628,
              954.9329717075359,
              955.0248978985331,
              955.1492097359833,
              954.7546303121931,
              955.0015496398299,
              955.0540466881781,
              955.1863130815651,
              954.8296963719646,
              955.2303324443807,
              955.1727565400848,
              955.155333491357,
              955.0837189118383,
              955.1424898437765,
              955.1470180733188,
              955.235652978766,
              954.8148960912565,
              955.04031353319,
              954.8970326909821,
              954.9917655101868,
              954.8329514530865,
              955.0425070498858,
              955.1568292428983,
              955.1942191700459,
              955.213467816311,
              954.9386504263254
            ],
            "learningEvents": 8
          },
          {
            "id": "risk_bot_v1",
            "name": "Bot Gestion Risque",
            "emoji": "🛡️",
            "type": "VaR·Kelly",
            "source": "Portfolio·VaR",
            "score": 0.12,
            "conf": 0.9,
            "fitness": 905,
            "color": "var(--down)",
            "role": "execution",
            "domain": "risk_mgmt",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              904.9972796664231,
              904.8395749456788,
              904.8860063918942,
              904.9938593575484,
              905.1737882111685,
              904.9773046389506,
              905.0816904587907,
              904.7637388220413,
              905.0341669029063,
              904.7736432633938,
              904.8494306224602,
              905.0880312861193,
              905.2430652928299,
              904.9186388961,
              905.0920511403197,
              904.8700858685098,
              904.9096422186476,
              905.2254667676657,
              905.1175034887418,
              905.1004978221404,
              904.8940456613293,
              905.0194881873153,
              904.9890800612533,
              905.0411168605971,
              905.1243183861463,
              904.9114043482858,
              905.2039191642509,
              905.1980896348665,
              904.8854186633779,
              904.8606738395931,
              904.9345244357327,
              905.1830310197158,
              905.0800901108121,
              904.8158129277404,
              905.0405531735028,
              904.9458293855652,
              905.1588349932746,
              904.8717550913448,
              904.9237613927313,
              904.8486028331198,
              904.7663961117273,
              905.0955472501004,
              904.9859794434907,
              905.1713054228319,
              905.1158445186138,
              905.192437975881,
              904.9747928314006,
              905.1948082401292,
              905.2449841619982,
              904.9251675708159,
              905.2048382467939,
              905.2090803235077,
              904.7966864280511,
              904.9026428688436,
              905.1155625308353,
              905.1813316176443,
              905.185724248502,
              905.0009012851707,
              904.9519835879743,
              904.9963474089114
            ],
            "learningEvents": 8
          },
          {
            "id": "fiscal_bot_v1",
            "name": "Bot Optimiseur Fiscal",
            "emoji": "💎",
            "type": "Tax·Harvest",
            "source": "Portfolio·Fees",
            "score": 0.12,
            "conf": 0.88,
            "fitness": 815,
            "color": "var(--gold)",
            "role": "execution",
            "domain": "fiscal",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "isFleet": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              814.8273372809696,
              814.8692534822197,
              815.179177991163,
              815.1957344259941,
              814.874036634787,
              814.953468527306,
              814.8955095650757,
              815.2069412695897,
              815.2053635313207,
              815.1529735238888,
              815.1122219626565,
              814.8178705850208,
              814.8185041586555,
              814.9417836786188,
              814.9312548250191,
              815.0154926037263,
              815.0286570880129,
              814.8821128046433,
              814.8490383406006,
              814.8910181940872,
              815.0201383314314,
              814.8775998259866,
              814.9255482854801,
              815.048134767486,
              815.0052403858793,
              815.0291813316223,
              815.1527028286574,
              815.2467123276072,
              814.9838173539194,
              815.0539879359551,
              814.8370238188775,
              814.8514273331438,
              815.0709864776503,
              815.1040639362094,
              815.2286532257108,
              815.1768435733339,
              815.1886185361064,
              814.9925892004418,
              815.0227083026041,
              815.165488474295,
              815.0466112912724,
              815.0184127781184,
              814.7521536757832,
              814.7983159555682,
              815.2067219002683,
              814.9929184656654,
              814.8384582186559,
              815.115079589161,
              814.7914708343042,
              814.8365835408503,
              815.1707386338336,
              814.8015771964566,
              815.0057052134696,
              815.0203679632532,
              814.917833426214,
              815.2323955781542,
              814.9389043705926,
              815.1290863666379,
              815.2204695032574,
              814.8602542827937
            ],
            "learningEvents": 8
          },
          {
            "id": "smart_sizer_v1",
            "name": "Bot Smart Sizer",
            "emoji": "📊",
            "type": "Kelly·VaR",
            "source": "Win-rate·Streak",
            "score": 0.12,
            "conf": 0.85,
            "fitness": 775,
            "color": "var(--up)",
            "role": "execution",
            "domain": "sizing",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "isFleet": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              775.0376412092667,
              775.063807214733,
              774.9239123922451,
              774.8026426889919,
              775.1545774688548,
              774.8855526637254,
              775.1609067775516,
              775.1297115749919,
              774.8773827050876,
              775.2157321675322,
              775.1582262680091,
              774.8113745799649,
              775.1099422072252,
              775.1387427586452,
              775.1000033629858,
              775.0004393891933,
              774.8995454198721,
              775.1970959792907,
              774.7738108527018,
              775.246231442211,
              774.890818001606,
              775.2177713383173,
              775.1389344837748,
              774.75254988614,
              775.0454611825422,
              775.1083640685957,
              775.1634212839099,
              774.8513734254466,
              774.7786515994685,
              775.0337027949942,
              774.8130817305719,
              775.0625428720509,
              775.0555931045966,
              775.1038790572404,
              774.9116545276537,
              774.8948416048856,
              775.1529760507577,
              775.1802781433938,
              774.8071546549093,
              775.1355040750619,
              774.9112213954642,
              775.1664327392743,
              774.7808413781477,
              774.8731406363712,
              774.9258430703778,
              775.1926128103465,
              775.2335872206363,
              775.2258405754002,
              775.0045756391236,
              775.0205398257522,
              775.1085959545004,
              775.1565568675402,
              774.8063054871026,
              774.95260583783,
              775.1578280753708,
              774.9390896426462,
              774.9400092284845,
              775.0273121697007,
              774.9903435078876,
              775.0667018388154
            ],
            "learningEvents": 8
          },
          {
            "id": "arb_bot_v1",
            "name": "Bot Arbitrage",
            "emoji": "⚖️",
            "type": "Stat·Arb",
            "source": "Multi-Exchange",
            "score": 0.12,
            "conf": 0.8,
            "fitness": 755,
            "color": "var(--gold)",
            "role": "execution",
            "domain": "arbitrage",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              754.8351663499031,
              754.7708359121003,
              754.9621024013712,
              755.0217641395063,
              755.0633890072247,
              754.8349150532733,
              754.7728509617581,
              754.8833377129453,
              754.9543668293481,
              754.9556873270575,
              754.9878142396566,
              754.822461491557,
              755.215816868302,
              755.0530708561823,
              754.8228227085447,
              754.8670547445395,
              755.194298791121,
              755.0159361006416,
              754.9288007286522,
              755.2362894260182,
              754.8959133334916,
              755.2065212827706,
              754.9648184778104,
              755.1154151902438,
              755.1888753595013,
              755.1206129064582,
              755.0037687710272,
              754.7559419745336,
              754.8631449423347,
              754.8999555426012,
              755.1225828651841,
              754.7567778323728,
              754.9481106891013,
              755.0814667293041,
              754.9965538304584,
              755.2221815879635,
              755.1036722192845,
              755.0358465346668,
              754.987881472414,
              755.0471639869502,
              755.070744084531,
              755.0579172852142,
              755.2471005880765,
              755.2337919880267,
              754.9475691185879,
              755.1070639501692,
              755.0919417691738,
              754.9354527971572,
              754.9812170838067,
              754.9168701222504,
              755.0518362937368,
              755.1517427582016,
              754.9731306491976,
              754.8807332428103,
              755.1848681205549,
              755.2286929163937,
              755.1211137039187,
              754.7710797044209,
              754.9099434185273,
              754.8644023348745
            ],
            "learningEvents": 8
          },
          {
            "id": "rebalance_bot_v1",
            "name": "Bot Rééquilibrage",
            "emoji": "🔀",
            "type": "Portfolio·Skew",
            "source": "Allocation",
            "score": 0.12,
            "conf": 0.8,
            "fitness": 705,
            "color": "var(--pur)",
            "role": "execution",
            "domain": "rebalance",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "isFleet": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              705.1698033658568,
              704.9731129948598,
              705.0489930831026,
              705.2251996104853,
              705.0764320442288,
              705.0151465903376,
              705.1535715696663,
              704.7625756573186,
              705.0811688606951,
              705.1549082313533,
              704.7899589801314,
              704.7773030432122,
              705.0168779982644,
              705.093333116764,
              705.0115798163673,
              705.0661571384026,
              705.1460883068179,
              705.111852757158,
              705.2088740532209,
              705.0484645585844,
              705.1238830581585,
              704.8948270790477,
              705.1491578907047,
              704.9149011884251,
              704.8008172024054,
              705.2226084423776,
              704.9700966629435,
              704.9846956974441,
              705.0893560395535,
              704.811192841199,
              705.0268752614973,
              704.8814807606708,
              705.2153761491228,
              704.842049912747,
              705.174439252626,
              704.9442128101591,
              705.2056131369063,
              705.1274369850424,
              705.1495532132486,
              704.9803307905927,
              704.9310354620792,
              704.9581917296535,
              704.8963383221824,
              704.9205247390129,
              704.7936716048831,
              704.8617219502113,
              705.2419494528949,
              704.8153876117212,
              705.1252724686939,
              705.0964813592193,
              705.0807496473349,
              704.7535692463977,
              705.168926269031,
              704.9805903367561,
              705.2069746787025,
              704.8973667167928,
              705.124749132633,
              704.8470646267115,
              705.0628326727476,
              705.1330427627961
            ],
            "learningEvents": 8
          },
          {
            "id": "dca_bot_v1",
            "name": "Bot DCA·Grid",
            "emoji": "🧲",
            "type": "Accumulation",
            "source": "Vol·Trend",
            "score": 0.12,
            "conf": 0.75,
            "fitness": 625,
            "color": "var(--ice)",
            "role": "execution",
            "domain": "dca",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "isFleet": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              625.1183923521975,
              624.9205686563404,
              625.1083595992507,
              624.9523281453681,
              624.8407370504615,
              625.0868010335489,
              624.7866574115857,
              625.1978966523535,
              625.238025761018,
              624.9014487933808,
              625.0247482615465,
              625.01270141601,
              625.1005746664872,
              625.1593032934572,
              625.0858027211418,
              624.9145023110805,
              625.1562364496438,
              624.916087823933,
              624.880535081829,
              625.0767455677072,
              624.8935677308264,
              625.2141975470022,
              624.8727625085801,
              624.9438309765758,
              625.1548766694127,
              625.20067937335,
              625.1047002800681,
              625.2476815334112,
              624.7790616411702,
              624.9708897251523,
              625.058216143099,
              625.1148749317583,
              625.2100421480762,
              625.0400561134218,
              624.809889640487,
              624.9947396638739,
              624.7896385713484,
              625.2101071333313,
              625.1979407268368,
              625.0349972685553,
              624.9414000840688,
              625.219650546448,
              624.9572062114399,
              624.8886483854427,
              624.7883558670084,
              625.0586161696993,
              624.9518126795248,
              625.2251486816097,
              624.9830885721911,
              625.2107825018519,
              624.7678516418038,
              625.2251150163645,
              624.7914754191922,
              624.9436093531546,
              625.0422066565692,
              624.9741286659744,
              625.041354562345,
              625.0200003452102,
              624.9288354035455,
              624.9335343063146
            ],
            "learningEvents": 8
          },
          {
            "id": "evolver_v1",
            "name": "Évolueur·Méta-IA",
            "emoji": "🧬",
            "type": "GenAlgo·LLM",
            "source": "All·Agents",
            "score": 0.12,
            "conf": 0.7,
            "fitness": 505,
            "color": "var(--pur)",
            "role": "meta",
            "domain": "evolution",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isMeta": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              505.0037543541418,
              504.94706467228815,
              504.79059860449695,
              504.91014133832135,
              504.7542701649759,
              504.9840029077305,
              505.0479695674842,
              505.1594978019741,
              504.8560230056712,
              505.1084348207183,
              505.11271361995097,
              504.82775117892874,
              504.8805335220033,
              505.2080556948789,
              505.128934658126,
              504.92200412839014,
              504.95103848684505,
              504.9078342655969,
              505.0701205907433,
              504.84615773979135,
              504.88996045790253,
              505.07133114314536,
              505.23048803106036,
              504.8440592062278,
              504.8144790953338,
              504.9441771912002,
              504.96783704436933,
              505.0283439737514,
              505.1152447779625,
              505.1373156652759,
              505.08885649532147,
              505.08851672564737,
              504.8822859140183,
              505.16485973611026,
              505.04610906209723,
              504.9803470773782,
              504.9098840829788,
              505.11592349755705,
              504.9837339741296,
              504.80066764307065,
              505.0102717578519,
              504.8225374894121,
              505.1334260494674,
              505.0012728835072,
              505.0847733873237,
              505.19631108648423,
              504.7940806343988,
              504.8311154450677,
              505.10256362105576,
              504.8972690736692,
              505.15219983764064,
              504.9079091324392,
              505.05769576753363,
              504.98462548646796,
              505.19947083165795,
              504.8883053733693,
              504.84959856183315,
              505.232523284964,
              505.14705143495894,
              504.98807435483
            ],
            "learningEvents": 8
          },
          {
            "id": "mean_rev_v1",
            "name": "Mean Reversion",
            "emoji": "🔄",
            "type": "Z-Score·Bands",
            "source": "Price·Variance",
            "score": 0,
            "conf": 0.5399999999999999,
            "fitness": 450.13906077146726,
            "color": "var(--gold)",
            "role": "council",
            "domain": "mean_rev",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isCouncil": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              457.8049372089484,
              449.9722091082051,
              450.054481723128,
              450.26101969871263,
              450.1831781293708,
              449.9071157788818,
              450.0699774446897,
              450.08501744307694,
              450.30676055715116,
              450.10448703872976,
              450.222980789082,
              450.37256728528484,
              450.08425402278004,
              450.3415588529496,
              450.29438563347264,
              449.9787626004853,
              450.0478050306582,
              450.19730713769843,
              450.36238474594404,
              450.3086637199719,
              450.06296159803793,
              450.2306429970822,
              450.2309242304737,
              450.3262609110187,
              450.3388958682793,
              450.28797033642894,
              450.12138452095616,
              449.9411871462628,
              450.30864339761973,
              449.9038171367469,
              450.241151948926,
              450.1666904012599,
              450.0057394052841,
              450.2674301972958,
              449.89999580663056,
              450.1673528011315,
              450.20133490777863,
              450.1216413047858,
              449.9992533892981,
              450.0767116820156,
              450.2835961581089,
              450.11021279283244,
              450.04548637737497,
              450.31562868794737,
              450.3247880525371,
              450.18486078983494,
              450.1897821761286,
              450.10209761556507,
              450.2408610630232,
              450.29760627653536,
              449.91914867114065,
              450.28980094411787,
              450.2503065415121,
              450.15575182584837,
              450.19410235014664,
              450.04871172255343,
              449.89535295642196,
              450.23936247148873,
              449.89118618913164,
              450.02462270206127
            ],
            "learningEvents": 8
          },
          {
            "id": "contrarian_v2",
            "name": "Contrarian·Council",
            "emoji": "🔥",
            "type": "Fade·Extremes",
            "source": "RSI·Sentiment",
            "score": 0,
            "conf": 0.7,
            "fitness": 453.0344932958103,
            "color": "var(--down)",
            "role": "council",
            "domain": "contrarian",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isCouncil": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              452.85219005301735,
              453.05150188285216,
              452.9879074063346,
              453.1460363364086,
              452.88173327259705,
              453.07138605532083,
              452.91759586208843,
              453.1389060068148,
              453.0580358248474,
              452.9622573587513,
              453.1614067435596,
              452.88430636522736,
              452.90718900372013,
              453.23155132359955,
              452.99223833474593,
              452.9652227142393,
              452.88567833949304,
              453.28089773156665,
              453.27014703563367,
              452.81018865856913,
              453.16649986597736,
              453.0154504061842,
              452.8836626409758,
              453.09942278454935,
              453.1154886709138,
              452.8018553465071,
              452.849500589361,
              453.16086212883806,
              453.11122435633246,
              452.9973503457332,
              452.997266598884,
              453.23253586536475,
              453.1840130157891,
              453.03260370498805,
              453.28169273025856,
              453.1303017069488,
              453.04811200511205,
              453.169925118808,
              453.2266782714525,
              452.93969473307124,
              453.2311888247447,
              452.9706117826878,
              453.22830224824025,
              452.8422853814011,
              452.9851737330312,
              453.1018073877505,
              452.95657553911883,
              453.0640878263036,
              453.09035398588634,
              453.19150112867857,
              453.18206375357437,
              452.9903698210877,
              453.0978606358326,
              453.2224881445888,
              452.9201960658384,
              452.921685256675,
              453.26936121691455,
              453.25964651640794,
              453.15679520050793,
              452.95355075698444
            ],
            "learningEvents": 8
          },
          {
            "id": "fundamental_v1",
            "name": "EPS·P/E·EV",
            "emoji": "💹",
            "type": "Quant·Alpha",
            "source": "Bloomberg/AlphaV",
            "score": 0.0,
            "conf": 0.65,
            "fitness": 150.4186691269864,
            "color": "var(--up)",
            "role": "fundamental",
            "domain": "corporate",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              150.61338161778025,
              150.4759945402668,
              150.30326196893904,
              150.62832507142784,
              150.23105316538036,
              150.40584034849522,
              150.36967580850512,
              150.66463584069257,
              150.5018334658412,
              150.3124365650906,
              150.27908535294154,
              150.59517484989027,
              150.5785876166199,
              150.34264196364927,
              150.43707408405126,
              150.22707511133984,
              150.3441153151316,
              150.4470132919788,
              150.26650277246654,
              150.1692305566324,
              150.2922835099706,
              150.35955330365786,
              150.40151773852477,
              150.41893347329383,
              150.63367954138303,
              150.28447052814835,
              150.3497961875773,
              150.4384250334017,
              150.42026228844523,
              150.2262370381613,
              150.30832302184524,
              150.37496617311413,
              150.58108953820988,
              150.19079220812588,
              150.24624998460183,
              150.56216329880203,
              150.4885747199261,
              150.3786297746573,
              150.5903548398414,
              150.23676029864328,
              150.50785273800028,
              150.37091254668957,
              150.17586898285225,
              150.27971890137633,
              150.62879864424985,
              150.64596369695602,
              150.45786925272773,
              150.45652836169927,
              150.27309231769001,
              150.52466066401604,
              150.62115503376398,
              150.63326745912087,
              150.39800379103806,
              150.62563388363375,
              150.5965638781303,
              150.3295670745133,
              150.3376150724422,
              150.51902018947015,
              150.297509690472,
              150.26282411838397
            ],
            "learningEvents": 8
          },
          {
            "id": "volatility_v1",
            "name": "Hybrid Gen-36725",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.162962962962963,
            "conf": 0.8,
            "fitness": 500,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "risk",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              120.09490171661606,
              119.79730910136198,
              120.03079777895218,
              120.19547748968537,
              119.98613532388099,
              119.82999218255334,
              120.16509138868724,
              119.87242210523019,
              119.84134513081484,
              119.21626997209229,
              119.17741758607878,
              118.78817209311647,
              119.16565721936863,
              118.84685400791474,
              119.15701350585373,
              119.00014084646179,
              118.97053359319088,
              119.12773226420667,
              118.96251106357236,
              119.02671418173499,
              119.00980574311178,
              118.9168088785283,
              118.89954329436772,
              119.22606870873605,
              119.12354460487026
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "nlp_v1",
            "name": "Hybrid Gen-36740",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.0,
            "conf": 0.72,
            "fitness": 120,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "nlp",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              119.82149561908163,
              120.09947339952774,
              119.8212874886921,
              119.81973366930049,
              120.08084863142338,
              120.19021721444471,
              120.02625000726259,
              119.87990142791581,
              119.94528140319449,
              120.11245704811428
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "sentiment_v2",
            "name": "Hybrid Gen-36659",
            "emoji": "🧬",
            "type": "Z-Score·Fade",
            "source": "Price·Variance/RSI·Sentiment",
            "score": 0.06221699915146722,
            "conf": 0.72,
            "fitness": 120,
            "color": "var(--gold)",
            "role": "hybrid",
            "domain": "social",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0.65,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              120.12541663850082,
              120.1964508202417,
              120.08581951176234,
              119.9860488430803,
              119.79167160818194,
              119.79167866422716,
              120.07560891842877,
              119.84233041307732,
              120.18621861155553,
              119.92404525201528,
              120.23835959834267,
              119.95117472523133,
              119.96973268614163,
              120.24411393566548,
              120.07698741970297,
              120.19175653847678,
              120.09524334627648,
              120.11517332406818,
              119.80262361591856,
              120.02310541745717,
              119.80025913571076,
              120.02344030153735,
              120.11866268275365,
              119.9447742581541,
              119.84907672892928,
              120.0466835058451,
              120.10389488477634,
              120.22687754404446,
              120.18746799976188,
              119.77701084063803,
              119.7698579540586,
              120.239755507129,
              119.90952895392317,
              119.91649081601342,
              120.20742544623342,
              119.92619428508158,
              119.80641277150109,
              119.76224810560218,
              120.23931287842677,
              120.0859598107877,
              119.84797689650426,
              119.81664607569972,
              120.16434703012662,
              119.84648127175907,
              120.14821320381549,
              119.79634856319892,
              120.2006191573749,
              120.11882683733967,
              119.82625804983013,
              119.89982094085535,
              119.93199243992201,
              120.16910997347563,
              120.10408970244784,
              119.9580376690704,
              119.81186979966068,
              120.21518858783513,
              120.21428487831113,
              120.16228536723294,
              120.04497995023455,
              120.23935049639613
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "onchain_v1",
            "name": "Hybrid Gen-36678",
            "emoji": "🧬",
            "type": "Z-Score·Fade",
            "source": "Price·Variance/RSI·Sentiment",
            "score": 0.07321349870587483,
            "conf": 0.7,
            "fitness": 120,
            "color": "var(--gold)",
            "role": "hybrid",
            "domain": "onchain",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              120.1345099216628,
              120.15857975912286,
              120.22088132695303,
              119.76004672319354,
              120.00789301139086,
              119.85867789010348,
              119.95089526640177,
              120.08395222782866,
              120.13012297663406,
              120.1290690884993,
              120.06986068595992,
              120.1071391388595,
              119.82615295664066,
              119.82637755256286,
              119.89189537186598,
              119.88478441583452,
              120.20559521256952,
              119.91107653325322,
              119.99885483647358,
              119.92618444851416,
              119.82811219091178,
              119.80076587962171,
              119.78489061805134,
              119.80145007527275,
              120.05607222615929,
              120.05475717784232,
              120.12147106158784,
              119.76224091351648,
              120.1779606947812,
              119.97182424471944,
              119.75254882903683,
              119.81323412834682,
              119.94280956863425,
              119.99430557094914,
              120.09246147980971,
              120.00173989063128,
              119.9544573261529,
              120.13491311476504,
              120.04440589547404,
              119.98861301803409,
              120.06420798753535,
              120.20249278919528,
              120.08282419477796,
              119.98620925584393,
              119.955142095566,
              120.01749475622049,
              119.89729711623495,
              120.0000408112367,
              119.91249035549997,
              120.1436629223465,
              119.89283830877422,
              119.82047605485229,
              120.15751989187922,
              120.20715997385463,
              120.19884716343097,
              119.80411464369887,
              120.1645835889557,
              120.2386905305004,
              120.0754170148425,
              119.81682234333267
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "momentum_v1",
            "name": "Hybrid Gen-36646",
            "emoji": "🧬",
            "type": "Z-Score·Fade",
            "source": "Price·Variance/RSI·Sentiment",
            "score": 0,
            "conf": 0.5799999999999998,
            "fitness": 119.06952685671422,
            "color": "var(--gold)",
            "role": "hybrid",
            "domain": "momentum",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isCouncil": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              125.23613852338143,
              121.28269384349774,
              120.83570664702542,
              121.28003146776767,
              120.96170592144315,
              121.03128233412814,
              120.85566130252161,
              120.97256009339469,
              121.08943490025776,
              121.18599224010268,
              121.00927922974485,
              121.17145219053333,
              120.99880788844351,
              121.00770295471838,
              121.03063104178648,
              121.05841563354602,
              121.18761296193219,
              121.13605445032948,
              120.87337893852352,
              121.02719595505907,
              121.01140655557529,
              121.15639018003266,
              120.93555246505335,
              121.00783637667185,
              120.81934331236087,
              121.23079939298947,
              121.12410150476143,
              120.90395628218306,
              121.00606956706059,
              121.24416061525184,
              121.15117884391327,
              121.27655420039335,
              120.81286215210905,
              121.0462059096668,
              121.08293291498039,
              120.92107616489078,
              121.08349956755866,
              120.86349966210892,
              121.24357022594937,
              121.05403095971008,
              121.03729880236827,
              121.0428534202739,
              121.11236385524491,
              120.89180569474028,
              121.05278183663542,
              121.23399208817196,
              121.14494906045984,
              121.00572203231557,
              121.233104859368,
              121.0564635374658,
              120.93798077032073,
              121.08677119946762,
              118.82478454363992,
              118.98522126173822,
              118.87357600181515,
              119.10210347104432,
              118.96614601702818,
              119.1147513407785,
              119.22215866093056,
              119.24659250229354
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "scalper_v2",
            "name": "Hybrid Gen-36514",
            "emoji": "🧬",
            "type": "Z-Score·Fade",
            "source": "Price·Variance/RSI·Sentiment",
            "score": 0,
            "conf": 0.6039999999999999,
            "fitness": 125,
            "color": "var(--gold)",
            "role": "hybrid",
            "domain": "scalping",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isCouncil": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              124.81303113029671,
              124.81441372826863,
              125.03546580320011,
              125.21305423740844,
              125.04098604529449,
              124.82725591387792,
              124.9287543512117,
              125.07135229341402,
              124.7516745666122,
              124.92974794886088,
              124.9816523308698,
              125.10755192153752,
              125.22838618516725,
              124.86489897715533,
              125.14066848734909,
              124.95725625202239,
              125.19238388515988,
              125.01494053455669,
              124.75705287473524,
              125.13421555032562,
              125.0936011246956,
              124.86543350875854,
              124.85727232671653,
              124.89664233444813,
              124.98508268983478,
              125.04127147369206,
              124.80343193916976,
              125.0882764170242,
              125.24665204679295,
              125.03220993900781,
              124.88151344969216,
              124.75931226112057,
              125.10580676420172,
              125.0190183206953,
              124.9066407335222,
              125.13088715069392,
              125.17478118518929,
              125.21237964559376,
              124.89343929157346,
              124.87481336514415,
              125.20898925885875,
              124.81124076056923,
              125.20626847881876,
              124.80872996818296,
              125.0264427412256,
              124.78180866111417,
              125.1093985777082,
              124.91194818019763,
              125.01494890574646,
              124.88584938818511,
              124.99704596367843,
              125.07008383859586,
              125.22947396190555,
              124.8372986181377,
              125.05883852584999,
              124.92169483633587,
              125.2288327509618,
              125.22540091545115,
              124.7664716236268,
              124.7812053997843
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "hedge_v2",
            "name": "Hybrid Gen-36182",
            "emoji": "🧬",
            "type": "Z-Score·Fade",
            "source": "Price·Variance/RSI·Sentiment",
            "score": 0,
            "conf": 0.6075999999999999,
            "fitness": 125,
            "color": "var(--gold)",
            "role": "hybrid",
            "domain": "hedge",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isCouncil": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              124.79181121709682,
              124.85742956039684,
              124.86957748251508,
              125.01488492203653,
              125.1887049435518,
              125.1033065342617,
              124.85195332987631,
              124.9267416559631,
              125.06880204214751,
              124.91903464437816,
              125.03572061821396,
              124.81216757943842,
              124.79923007204798,
              125.08089078280013,
              125.13143527798111,
              125.22694564220771,
              125.24743384797934,
              124.89597270207086,
              124.88247422848335,
              124.87460678485111,
              124.87889772640129,
              124.75391917496322,
              125.00845435964203,
              125.05241953474761,
              124.85947556695163,
              124.84868028694814,
              125.18137474688369,
              124.79769214307908,
              125.1562945688804,
              124.85656908623356,
              124.83635836305997,
              124.94575414569857,
              124.87954298291021,
              124.90641121723087,
              124.86605933345668,
              125.0973923986855,
              125.05963977905061,
              125.11909669343407,
              125.13139789535312,
              124.86699375497554,
              125.04093247144249,
              124.95781256019883,
              124.99767152720777,
              125.10990409473239,
              124.77426087801375,
              125.13718798254297,
              124.78670795686375,
              125.14273790319957,
              125.00781836465319,
              124.90728875374586,
              124.91754101977983,
              125.0626592967571,
              124.90252496924303,
              124.82241399147223,
              124.95279223527145,
              124.91478046842849,
              125.00257911235714,
              125.21589908487482,
              124.78036039084151,
              125.01360997898702
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "macro_v1",
            "name": "Hybrid Gen-35461",
            "emoji": "🧬",
            "type": "Fade·Quant",
            "source": "RSI·Sentiment/Bloomberg",
            "score": 0.0,
            "conf": 0.7,
            "fitness": 149.57095769580337,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "macro",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              149.42340361107094,
              149.3440893658105,
              149.39990544970232,
              149.7614053110241,
              149.56531249576972,
              149.35686964534057,
              149.43941752493927,
              149.6002812790236,
              149.39938998982197,
              149.6749923227178,
              149.36828080254412,
              149.74991030352632,
              149.40878108869978,
              149.501443492418,
              149.47750739660253,
              149.40847255197357,
              149.40139362675933,
              149.5447734534651,
              149.53946127904842,
              149.33058691316367,
              149.38319814974594,
              149.48144798809574,
              149.70035303651068,
              149.3894711977879,
              149.69003937244307,
              149.8003517833554,
              149.6420492198417,
              149.3522049638186,
              149.64975795903229,
              149.70215454603922,
              149.74983404055516,
              149.69371983186505,
              149.61957828016452,
              149.32807683064024,
              149.74706892154637,
              149.49276707694517,
              149.7262238153278,
              149.70356745486097,
              149.49959198857906,
              149.49318252563293,
              149.57494690619137,
              149.50724206928243,
              149.64716723589112,
              149.68969094829603,
              149.38496845605937,
              149.3750262125766,
              149.38803931009903,
              149.55345628218512,
              149.37295703417678,
              149.4044908115219,
              149.74897298473516,
              149.45101692159525,
              149.6664051931387,
              149.73439963119617,
              149.33228728983556,
              149.35244563844253,
              149.81743712094095,
              149.68521442042874,
              149.47831207061625,
              149.7562303018625
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "volume_v1",
            "name": "Hybrid Gen-36744",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.15618753657447781,
            "conf": 0.6,
            "fitness": 500,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "volume",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              119.77818909663539,
              119.98781122313896,
              120.1719599721772,
              119.9288344642598,
              119.90271321333671,
              120.16918733658927
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "corr_v1",
            "name": "Hybrid Gen-36745",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.0,
            "conf": 0.6,
            "fitness": 120,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "correlation",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              119.97386902453998,
              120.04061169670753,
              120.16580206622491,
              119.98897298489736,
              119.95047429515338
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "geopolitic_v1",
            "name": "Hybrid Gen-34184",
            "emoji": "🧬",
            "type": "Z-Score·Fade",
            "source": "Price·Variance/RSI·Sentiment",
            "score": 0.18392146254792388,
            "conf": 0.6,
            "fitness": 500,
            "color": "var(--gold)",
            "role": "hybrid",
            "domain": "geopolitics",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              149.78227288649728,
              149.70702236625692,
              149.84288064201039,
              149.9542523626216,
              149.92504986116512,
              149.76845617033658,
              149.91161710876594,
              149.9038266652461,
              149.91835369869415,
              149.83141457288576,
              149.8099042378077,
              149.9877106503421,
              149.6957019811003,
              150.11725440926372,
              149.99406004406381,
              149.90363115817814,
              149.96454801722015,
              149.73190538720525,
              150.11004494343445,
              149.67827490450074,
              149.7108123937413,
              149.77726666787515,
              150.05166314796097,
              149.8571162790289,
              149.92181095255813,
              149.88383595180278,
              149.71316165883098,
              150.09589386898128,
              149.92126517865046,
              149.99390274896032,
              149.75108379436622,
              149.89045831590025,
              150.0140991841438,
              149.8568964480524,
              149.73141627264883,
              150.08189700557188,
              149.9485535945925,
              149.63763744832895,
              149.8463812594155,
              150.06182732517397,
              150.0612667605156,
              149.7653437882566,
              149.7696410765496,
              150.08004311938794,
              149.68454554908334,
              149.91694037725892,
              149.69051877480925,
              149.79105254243805,
              149.83911133044813,
              149.76105757619402,
              150.01263486808577,
              149.71076541813215,
              150.0884850031388,
              149.9100701697282,
              149.9927282617447,
              150.12088532132887,
              150.07925082099985,
              149.79543073370283,
              149.77995435837303,
              150.0111307986629
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "security_v1",
            "name": "Hybrid Gen-34190",
            "emoji": "🧬",
            "type": "Z-Score·Fade",
            "source": "Price·Variance/RSI·Sentiment",
            "score": 0.05,
            "conf": 0.35,
            "fitness": 149.88565560254938,
            "color": "var(--gold)",
            "role": "hybrid",
            "domain": "security",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "_bunkerPaused": true,
            "fitnessHistory": [
              149.9431745333793,
              149.84099499561424,
              149.83110963205962,
              149.83020525810537,
              149.70452208499,
              149.8844802082496,
              149.6538570329264,
              149.65379029578762,
              150.08479595762145,
              149.9106074624654,
              150.04942913935292,
              149.77084544800928,
              149.91235555547087,
              149.71193881990465,
              149.73875946939782,
              150.04048289315568,
              149.97517521927364,
              149.6881575221077,
              149.9242578124991,
              150.05641629576164,
              149.98533564217658,
              149.639260769662,
              150.0335129310562,
              149.89215138879524,
              149.76136595208732,
              149.73732947740584,
              149.85997411059344,
              149.71484314763117,
              149.64175614995662,
              149.8500205309905,
              150.01127688105132,
              149.7058257088979,
              149.7197865768899,
              149.86929514644874,
              149.8944593639748,
              149.64054795942022,
              149.82893549297702,
              149.94617583351197,
              149.6894260325836,
              149.92328951733583,
              149.79529828563662,
              149.87590918495394,
              149.77897212598776,
              149.9078880644037,
              149.6941532256409,
              149.7577521093355,
              149.90005917777617,
              149.92666934172496,
              149.79176795241162,
              149.89444732633814,
              149.93835552952834,
              149.8850764902582,
              149.97778583152194,
              149.7035677030546,
              149.67416251205088,
              149.89541658018152,
              149.88172203295164,
              150.12462585138059,
              150.0563792189264,
              149.87817939627735
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "exec_bot_v1",
            "name": "Bot Exécution",
            "emoji": "⚡",
            "type": "TWAP·VWAP",
            "source": "Exchange·CCXT",
            "score": 0.3,
            "conf": 0.95,
            "fitness": 154.01030267168244,
            "color": "var(--up)",
            "role": "execution",
            "domain": "orders",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              153.82524112546423,
              153.93238653407343,
              154.13540256418776,
              153.7740581983828,
              153.859443504455,
              154.19856956491074,
              154.10764657865997,
              154.04065938180386,
              153.7977374114818,
              154.2443678975727,
              153.85709767966122,
              153.86669128307807,
              154.1458054044517,
              153.88738395301027,
              154.11723607185633,
              154.00449290211483,
              153.85051859672328,
              153.85615765771306,
              154.13929020565104,
              153.76905868940128,
              153.95075913193386,
              153.8413249666169,
              153.8459832896455,
              154.09733900694042,
              154.1758256237283,
              154.06098432146905,
              154.23250647341877,
              154.0931699726563,
              153.85924550507596,
              153.7805097175475,
              153.82839912209488,
              153.79927907624221,
              154.19026658654337,
              153.8003974668966,
              154.0135165399368,
              153.85468799080007,
              154.20470182554706,
              154.11547078359686,
              154.1039553970905,
              154.24772392507754,
              153.89117773350316,
              154.09376154442805,
              153.94001947439244,
              153.9820056833513,
              153.9407134957757,
              154.14460799117072,
              154.0457852466909,
              153.8097237030008,
              154.08436440700615,
              153.91045922541406,
              154.25925137179718,
              154.06564205044648,
              154.11432380614926,
              153.8767031103227,
              153.7773227530096,
              154.06469887672188,
              153.7609829720069,
              153.9891330211959,
              154.00135101021107,
              153.87057170514132
            ],
            "learningEvents": 8
          },
          {
            "id": "scalper_bot_v1",
            "name": "Bot Scalper·HF",
            "emoji": "🎯",
            "type": "HFT·OrderFlow",
            "source": "L2·OrderBook",
            "score": 0.12,
            "conf": 0.85,
            "fitness": 155,
            "color": "var(--pur)",
            "role": "execution",
            "domain": "scalping",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isBot": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              155.07227838837352,
              155.0598527529036,
              155.0881476511635,
              155.0480891523623,
              155.00696292238774,
              154.98580540151536,
              154.78731879070108,
              154.96989454086355,
              155.07365092088043,
              155.24868681568222,
              155.0738973486894,
              154.93403324972718,
              155.1756620347098,
              155.22780191499405,
              154.87667746867604,
              155.23066465363834,
              154.907059270908,
              154.8609965512048,
              155.19810323624836,
              155.1114797284697,
              155.20915572632987,
              155.19017211923776,
              154.90076082642028,
              154.98615561802882,
              155.1232030491359,
              155.04967373996237,
              155.1518956154378,
              155.10638558015316,
              155.12604710855516,
              154.98372109079756,
              155.23058725416647,
              155.0378190662546,
              155.18109515609777,
              154.8970430752783,
              155.1444637302373,
              154.94266169769855,
              155.1582030915624,
              155.03079614212774,
              154.96313525891034,
              154.80915696343374,
              155.0868116604777,
              154.7862409919528,
              155.07421348351957,
              154.9675320723912,
              154.76962643386008,
              155.09402170175198,
              154.8590404798827,
              154.9687375602518,
              155.14632006245193,
              155.15166854514288,
              154.81770993820092,
              154.9577176167445,
              155.16286276031687,
              155.1515624939123,
              155.04610229547617,
              154.76984809601436,
              154.81429382429715,
              154.92778629840916,
              155.06709623155703,
              155.24708093652626
            ],
            "learningEvents": 8
          },
          {
            "id": "whale_v1",
            "name": "Hybrid Gen-36728",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.7,
            "conf": 0.8,
            "fitness": 500,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "whale",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isScout": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              120.18002212769488,
              120.1813843866509,
              119.96306235139701,
              119.86639998569963,
              119.98717733857845,
              120.00484749502897,
              119.87733778461038,
              120.22618753266525,
              119.93355875283868,
              120.17999539397393,
              120.24010132018817,
              119.89086962999691,
              119.78494708582,
              119.77012538081436,
              119.92761199061671,
              119.91063918155612,
              119.95335607784067,
              120.17330565533811,
              120.21915685768496,
              120.20082104230407,
              120.12857905837672,
              119.88605931433767
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "breakout_v1",
            "name": "Hybrid Gen-36743",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0,
            "conf": 0.5,
            "fitness": 120,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "breakout",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isScout": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              120.02241897796472,
              120.01465262311005,
              119.90341165660892,
              119.7788616268613,
              120.08735934666501,
              119.8700545071015,
              120.09920320364365
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "harmonic_v1",
            "name": "Hybrid Gen-36742",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.0,
            "conf": 0.2,
            "fitness": 117.92480120548134,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "harmonic",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isScout": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              119.8954883469441,
              117.92810142887569,
              118.12686799906245,
              117.85334130502476,
              117.85251240708337,
              118.09285265154831,
              118.1003105677301,
              117.70066871980552
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "flow_v1",
            "name": "Hybrid Gen-36749",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.13999999999999999,
            "conf": 0.43999999999999995,
            "fitness": 500,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "flow",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isScout": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              119.76738433203262
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "swing_v2",
            "name": "Hybrid Gen-36748",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0,
            "conf": 0.6359999999999999,
            "fitness": 119.94464968868124,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "swing",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isCouncil": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              120.20529832722549,
              119.82287598612201
            ],
            "regimeFitness": {},
            "learningEvents": 8
          },
          {
            "id": "trend_v2",
            "name": "Hybrid Gen-36746",
            "emoji": "🧬",
            "type": "Fade·Z-Score",
            "source": "RSI·Sentiment/Price·Variance",
            "score": 0.5621427522084024,
            "conf": 0.6299999999999999,
            "fitness": 500,
            "color": "var(--down)",
            "role": "hybrid",
            "domain": "trend",
            "errors": 0,
            "corrections": 0,
            "streak": 0,
            "lastPnl": 0,
            "memory": [],
            "isCouncil": true,
            "_bunkerPaused": true,
            "fitnessHistory": [
              120,
              120.00366963512872,
              119.8711919887873,
              119.76675926648954,
              119.92645005353808
            ],
            "regimeFitness": {},
            "learningEvents": 8
          }
        ],
        "shadow": {
          "virtualPnl": 0,
          "virtualTrades": [],
          "wins": 0,
          "losses": 0,
          "lastRetrain": 0
        },
        "decisionCascade": [],
        "dreamJournal": [],
        "resonanceHistory": [],
        "botFleet": {
          "exec_bot_v1": {
            "status": "executing",
            "lastAction": "TWAP 3x sur 204$ · économie ~0.73$",
            "lastActionTs": 1778309187750,
            "contributions": 2,
            "pnlContrib": 1.209391015188996
          },
          "arb_bot_v1": {
            "status": "scanning",
            "lastAction": "Balayage cross-pair · rien au-dessus du seuil 45%",
            "lastActionTs": 1778309187754,
            "contributions": 0,
            "pnlContrib": 0
          },
          "scalper_bot_v1": {
            "status": "scanning",
            "lastAction": "Surveillance L2·Order Flow",
            "lastActionTs": 1778309187754,
            "contributions": 1,
            "pnlContrib": 0.16423014997252794
          },
          "fiscal_bot_v1": {
            "status": "idle",
            "lastAction": "Gain insuffisant pour harvest (+0$)",
            "lastActionTs": 1778309187755,
            "contributions": 0,
            "pnlContrib": 0
          },
          "dca_bot_v1": {
            "status": "idle",
            "lastAction": "Marchés tendanciels · DCA inactif (8 vol faible, 0 flat)",
            "lastActionTs": 1778309187755,
            "contributions": 0,
            "pnlContrib": 0
          },
          "rescue_bot_v1": {
            "status": "idle",
            "lastAction": "Portfolio sain · DD 0.0%",
            "lastActionTs": 1778309187755,
            "contributions": 0,
            "pnlContrib": 0
          },
          "rebalance_bot_v1": {
            "status": "idle",
            "lastAction": "Aucune position · rien à rééquilibrer",
            "lastActionTs": 1778309187755,
            "contributions": 0,
            "pnlContrib": 0
          },
          "smart_sizer_v1": {
            "status": "scanning",
            "lastAction": "0/10 trades · collecte données",
            "lastActionTs": 1778309187756,
            "contributions": 0,
            "pnlContrib": 0
          }
        },
        "archives": {
          "snapshots": [],
          "totalResets": 0
        },
        "pendingActions": [],
        "mutedAgents": [],
        "brainLog": [],
        "priceAlerts": [],
        "autoBackup": {
          "enabled": true,
          "hour": 3,
          "lastRun": "Fri May 08 2026",
          "runCount": 1,
          "lastSize": 59
        },
        "vacancesCfg": {
          "active": false,
          "stakePct": 10,
          "maxDailyLoss": 50,
          "startDate": null,
          "endDate": null,
          "daysLeft": 0,
          "prevStake": null,
          "prevBotMode": null,
          "startPortfolio": null,
          "allowAuto": false
        },
        "realCandles": {
          "BTC/USDT": {
            "5m": [
              {
                "ts": 1778277000000,
                "o": 80219.96,
                "h": 80232.82,
                "l": 80200,
                "c": 80232.82,
                "v": 1650,
                "n": 1650
              },
              {
                "ts": 1778277300000,
                "o": 80232.81,
                "h": 80264,
                "l": 80195.15,
                "c": 80263.99,
                "v": 3971,
                "n": 3971
              },
              {
                "ts": 1778277600000,
                "o": 80264,
                "h": 80366.95,
                "l": 80238.42,
                "c": 80310.31,
                "v": 11096,
                "n": 11096
              },
              {
                "ts": 1778277900000,
                "o": 80310.31,
                "h": 80338.12,
                "l": 80295.45,
                "c": 80295.45,
                "v": 4517,
                "n": 4517
              },
              {
                "ts": 1778278200000,
                "o": 80295.46,
                "h": 80399.98,
                "l": 80295.45,
                "c": 80390.74,
                "v": 5615,
                "n": 5615
              },
              {
                "ts": 1778278500000,
                "o": 80390.74,
                "h": 80409.09,
                "l": 80332.58,
                "c": 80343.69,
                "v": 4972,
                "n": 4972
              },
              {
                "ts": 1778278800000,
                "o": 80343.69,
                "h": 80359.22,
                "l": 80295.44,
                "c": 80350.98,
                "v": 4592,
                "n": 4592
              },
              {
                "ts": 1778279100000,
                "o": 80350.98,
                "h": 80359.18,
                "l": 80326.54,
                "c": 80348.96,
                "v": 3902,
                "n": 3902
              },
              {
                "ts": 1778279400000,
                "o": 80348.96,
                "h": 80369.03,
                "l": 80327.43,
                "c": 80336.73,
                "v": 4465,
                "n": 4465
              },
              {
                "ts": 1778279700000,
                "o": 80336.73,
                "h": 80352.27,
                "l": 80295.08,
                "c": 80295.09,
                "v": 3178,
                "n": 3178
              },
              {
                "ts": 1778280000000,
                "o": 80295.09,
                "h": 80317.21,
                "l": 80295.09,
                "c": 80311.98,
                "v": 2904,
                "n": 2904
              },
              {
                "ts": 1778280300000,
                "o": 80311.97,
                "h": 80342.86,
                "l": 80311.97,
                "c": 80342.86,
                "v": 2075,
                "n": 2075
              },
              {
                "ts": 1778280600000,
                "o": 80342.86,
                "h": 80342.86,
                "l": 80280.01,
                "c": 80289.7,
                "v": 2714,
                "n": 2714
              },
              {
                "ts": 1778280900000,
                "o": 80289.7,
                "h": 80289.71,
                "l": 80262,
                "c": 80262,
                "v": 2321,
                "n": 2321
              },
              {
                "ts": 1778281200000,
                "o": 80262,
                "h": 80299.27,
                "l": 80262,
                "c": 80265.54,
                "v": 5202,
                "n": 5202
              },
              {
                "ts": 1778281500000,
                "o": 80265.54,
                "h": 80265.55,
                "l": 80226.36,
                "c": 80240.21,
                "v": 2193,
                "n": 2193
              },
              {
                "ts": 1778281800000,
                "o": 80240.22,
                "h": 80249.25,
                "l": 80213.52,
                "c": 80213.52,
                "v": 2354,
                "n": 2354
              },
              {
                "ts": 1778282100000,
                "o": 80213.53,
                "h": 80236.24,
                "l": 80158.32,
                "c": 80236.23,
                "v": 5410,
                "n": 5410
              },
              {
                "ts": 1778282400000,
                "o": 80236.24,
                "h": 80245.43,
                "l": 80189.43,
                "c": 80189.43,
                "v": 2591,
                "n": 2591
              },
              {
                "ts": 1778282700000,
                "o": 80189.43,
                "h": 80209.08,
                "l": 80189.43,
                "c": 80198.01,
                "v": 1901,
                "n": 1901
              },
              {
                "ts": 1778283000000,
                "o": 80198.01,
                "h": 80198.01,
                "l": 80148.26,
                "c": 80182,
                "v": 5459,
                "n": 5459
              },
              {
                "ts": 1778283300000,
                "o": 80182,
                "h": 80182,
                "l": 80111.02,
                "c": 80137.84,
                "v": 4102,
                "n": 4102
              },
              {
                "ts": 1778283600000,
                "o": 80137.83,
                "h": 80190.29,
                "l": 80137.83,
                "c": 80139.01,
                "v": 5639,
                "n": 5639
              },
              {
                "ts": 1778283900000,
                "o": 80139.01,
                "h": 80192.83,
                "l": 80139,
                "c": 80177.8,
                "v": 2637,
                "n": 2637
              },
              {
                "ts": 1778284200000,
                "o": 80177.81,
                "h": 80197.83,
                "l": 80177,
                "c": 80177,
                "v": 3200,
                "n": 3200
              },
              {
                "ts": 1778284500000,
                "o": 80177.01,
                "h": 80198,
                "l": 80177,
                "c": 80193.17,
                "v": 1781,
                "n": 1781
              },
              {
                "ts": 1778284800000,
                "o": 80193.18,
                "h": 80205.74,
                "l": 80160,
                "c": 80160,
                "v": 3739,
                "n": 3739
              },
              {
                "ts": 1778285100000,
                "o": 80160.01,
                "h": 80160.01,
                "l": 80134.28,
                "c": 80134.29,
                "v": 3026,
                "n": 3026
              },
              {
                "ts": 1778285400000,
                "o": 80134.28,
                "h": 80162.08,
                "l": 80133.08,
                "c": 80161.45,
                "v": 4536,
                "n": 4536
              },
              {
                "ts": 1778285700000,
                "o": 80161.44,
                "h": 80161.45,
                "l": 80129.85,
                "c": 80131.26,
                "v": 2802,
                "n": 2802
              },
              {
                "ts": 1778286000000,
                "o": 80131.26,
                "h": 80208.66,
                "l": 80131.24,
                "c": 80175.31,
                "v": 4695,
                "n": 4695
              },
              {
                "ts": 1778286300000,
                "o": 80175.31,
                "h": 80178.01,
                "l": 80155.7,
                "c": 80155.7,
                "v": 1832,
                "n": 1832
              },
              {
                "ts": 1778286600000,
                "o": 80155.71,
                "h": 80218,
                "l": 80155.71,
                "c": 80218,
                "v": 3952,
                "n": 3952
              },
              {
                "ts": 1778286900000,
                "o": 80217.99,
                "h": 80218,
                "l": 80197.47,
                "c": 80197.48,
                "v": 1735,
                "n": 1735
              },
              {
                "ts": 1778287200000,
                "o": 80197.47,
                "h": 80212.58,
                "l": 80183.22,
                "c": 80195.09,
                "v": 2504,
                "n": 2504
              },
              {
                "ts": 1778287500000,
                "o": 80195.1,
                "h": 80233.3,
                "l": 80195.09,
                "c": 80211.82,
                "v": 3998,
                "n": 3998
              },
              {
                "ts": 1778287800000,
                "o": 80211.82,
                "h": 80237.11,
                "l": 80191.02,
                "c": 80235.43,
                "v": 3915,
                "n": 3915
              },
              {
                "ts": 1778288100000,
                "o": 80235.42,
                "h": 80240.87,
                "l": 80220.31,
                "c": 80238.76,
                "v": 2015,
                "n": 2015
              },
              {
                "ts": 1778288400000,
                "o": 80238.75,
                "h": 80249.15,
                "l": 80217.46,
                "c": 80241.13,
                "v": 4272,
                "n": 4272
              },
              {
                "ts": 1778288700000,
                "o": 80241.13,
                "h": 80263.41,
                "l": 80237.75,
                "c": 80263.41,
                "v": 3331,
                "n": 3331
              },
              {
                "ts": 1778289000000,
                "o": 80263.4,
                "h": 80320.56,
                "l": 80263.4,
                "c": 80320.56,
                "v": 2376,
                "n": 2376
              },
              {
                "ts": 1778289300000,
                "o": 80320.56,
                "h": 80349.99,
                "l": 80296,
                "c": 80296,
                "v": 3102,
                "n": 3102
              },
              {
                "ts": 1778289600000,
                "o": 80296,
                "h": 80296.01,
                "l": 80252.42,
                "c": 80252.42,
                "v": 2508,
                "n": 2508
              },
              {
                "ts": 1778289900000,
                "o": 80252.42,
                "h": 80297.65,
                "l": 80252.42,
                "c": 80274.87,
                "v": 2864,
                "n": 2864
              },
              {
                "ts": 1778290200000,
                "o": 80274.87,
                "h": 80385.06,
                "l": 80274.86,
                "c": 80372.19,
                "v": 5302,
                "n": 5302
              },
              {
                "ts": 1778290500000,
                "o": 80372.19,
                "h": 80399.93,
                "l": 80348.97,
                "c": 80352.39,
                "v": 3976,
                "n": 3976
              },
              {
                "ts": 1778290800000,
                "o": 80352.4,
                "h": 80392.55,
                "l": 80347.12,
                "c": 80381.15,
                "v": 3730,
                "n": 3730
              },
              {
                "ts": 1778291100000,
                "o": 80381.15,
                "h": 80400,
                "l": 80372.3,
                "c": 80399.99,
                "v": 2174,
                "n": 2174
              },
              {
                "ts": 1778291400000,
                "o": 80399.99,
                "h": 80446.58,
                "l": 80391.5,
                "c": 80424.43,
                "v": 6760,
                "n": 6760
              },
              {
                "ts": 1778291700000,
                "o": 80424.44,
                "h": 80424.44,
                "l": 80327.75,
                "c": 80327.75,
                "v": 4032,
                "n": 4032
              },
              {
                "ts": 1778292000000,
                "o": 80327.75,
                "h": 80421.23,
                "l": 80327.75,
                "c": 80421.22,
                "v": 6278,
                "n": 6278
              },
              {
                "ts": 1778292300000,
                "o": 80421.23,
                "h": 80457.63,
                "l": 80392.35,
                "c": 80454.01,
                "v": 4985,
                "n": 4985
              },
              {
                "ts": 1778292600000,
                "o": 80454.01,
                "h": 80465.93,
                "l": 80413.43,
                "c": 80436.01,
                "v": 4196,
                "n": 4196
              },
              {
                "ts": 1778292900000,
                "o": 80436,
                "h": 80458.78,
                "l": 80415.99,
                "c": 80416.44,
                "v": 3977,
                "n": 3977
              },
              {
                "ts": 1778293200000,
                "o": 80416.44,
                "h": 80434.64,
                "l": 80395.92,
                "c": 80402.49,
                "v": 4347,
                "n": 4347
              },
              {
                "ts": 1778293500000,
                "o": 80402.49,
                "h": 80434.65,
                "l": 80390,
                "c": 80428.65,
                "v": 3757,
                "n": 3757
              },
              {
                "ts": 1778293800000,
                "o": 80428.66,
                "h": 80477.47,
                "l": 80428.65,
                "c": 80431.94,
                "v": 4247,
                "n": 4247
              },
              {
                "ts": 1778294100000,
                "o": 80431.94,
                "h": 80431.94,
                "l": 80398.52,
                "c": 80406.36,
                "v": 2880,
                "n": 2880
              },
              {
                "ts": 1778294400000,
                "o": 80406.35,
                "h": 80412.02,
                "l": 80385,
                "c": 80394.57,
                "v": 3910,
                "n": 3910
              },
              {
                "ts": 1778294700000,
                "o": 80394.58,
                "h": 80405.37,
                "l": 80372.3,
                "c": 80405.37,
                "v": 3062,
                "n": 3062
              },
              {
                "ts": 1778295000000,
                "o": 80405.37,
                "h": 80437.96,
                "l": 80393.14,
                "c": 80429.71,
                "v": 2745,
                "n": 2745
              },
              {
                "ts": 1778295300000,
                "o": 80429.7,
                "h": 80429.71,
                "l": 80408.62,
                "c": 80417.87,
                "v": 1971,
                "n": 1971
              },
              {
                "ts": 1778295600000,
                "o": 80417.88,
                "h": 80420.01,
                "l": 80372.3,
                "c": 80420.01,
                "v": 3341,
                "n": 3341
              },
              {
                "ts": 1778295900000,
                "o": 80420,
                "h": 80457.69,
                "l": 80420,
                "c": 80422.43,
                "v": 2893,
                "n": 2893
              },
              {
                "ts": 1778296200000,
                "o": 80422.44,
                "h": 80477.47,
                "l": 80414.71,
                "c": 80427.99,
                "v": 4486,
                "n": 4486
              },
              {
                "ts": 1778296500000,
                "o": 80428,
                "h": 80492.69,
                "l": 80428,
                "c": 80492.67,
                "v": 3215,
                "n": 3215
              },
              {
                "ts": 1778296800000,
                "o": 80492.67,
                "h": 80550.67,
                "l": 80480.6,
                "c": 80480.61,
                "v": 6620,
                "n": 6620
              },
              {
                "ts": 1778297100000,
                "o": 80480.6,
                "h": 80480.61,
                "l": 80400.27,
                "c": 80433.4,
                "v": 4403,
                "n": 4403
              },
              {
                "ts": 1778297400000,
                "o": 80433.39,
                "h": 80433.4,
                "l": 80372.3,
                "c": 80372.3,
                "v": 2527,
                "n": 2527
              },
              {
                "ts": 1778297700000,
                "o": 80372.3,
                "h": 80376.31,
                "l": 80337.37,
                "c": 80339.3,
                "v": 3040,
                "n": 3040
              },
              {
                "ts": 1778298000000,
                "o": 80339.29,
                "h": 80351.67,
                "l": 80307.76,
                "c": 80347.61,
                "v": 3432,
                "n": 3432
              },
              {
                "ts": 1778298300000,
                "o": 80347.61,
                "h": 80365.23,
                "l": 80346.15,
                "c": 80346.15,
                "v": 1886,
                "n": 1886
              },
              {
                "ts": 1778298600000,
                "o": 80346.16,
                "h": 80387.44,
                "l": 80332.02,
                "c": 80387.43,
                "v": 2609,
                "n": 2609
              },
              {
                "ts": 1778298900000,
                "o": 80387.44,
                "h": 80395.85,
                "l": 80382.5,
                "c": 80383.95,
                "v": 1597,
                "n": 1597
              },
              {
                "ts": 1778299200000,
                "o": 80383.96,
                "h": 80462.61,
                "l": 80383.95,
                "c": 80462.61,
                "v": 2369,
                "n": 2369
              },
              {
                "ts": 1778299500000,
                "o": 80462.61,
                "h": 80666.66,
                "l": 80462.6,
                "c": 80600.01,
                "v": 15799,
                "n": 15799
              },
              {
                "ts": 1778299800000,
                "o": 80600.01,
                "h": 80611.32,
                "l": 80568,
                "c": 80572.94,
                "v": 5348,
                "n": 5348
              },
              {
                "ts": 1778300100000,
                "o": 80572.93,
                "h": 80572.94,
                "l": 80491.91,
                "c": 80517.02,
                "v": 5434,
                "n": 5434
              },
              {
                "ts": 1778300400000,
                "o": 80517.01,
                "h": 80532.61,
                "l": 80480.6,
                "c": 80516.22,
                "v": 3380,
                "n": 3380
              },
              {
                "ts": 1778300700000,
                "o": 80516.22,
                "h": 80516.22,
                "l": 80442,
                "c": 80476.66,
                "v": 3967,
                "n": 3967
              },
              {
                "ts": 1778301000000,
                "o": 80476.66,
                "h": 80476.67,
                "l": 80450,
                "c": 80468.41,
                "v": 2412,
                "n": 2412
              },
              {
                "ts": 1778301300000,
                "o": 80468.41,
                "h": 80468.41,
                "l": 80427.2,
                "c": 80441.18,
                "v": 2996,
                "n": 2996
              },
              {
                "ts": 1778301600000,
                "o": 80441.17,
                "h": 80441.18,
                "l": 80400,
                "c": 80409.99,
                "v": 2577,
                "n": 2577
              },
              {
                "ts": 1778301900000,
                "o": 80409.99,
                "h": 80461.99,
                "l": 80397.12,
                "c": 80443.16,
                "v": 4591,
                "n": 4591
              },
              {
                "ts": 1778302200000,
                "o": 80443.17,
                "h": 80471.17,
                "l": 80378.07,
                "c": 80379.99,
                "v": 4347,
                "n": 4347
              },
              {
                "ts": 1778302500000,
                "o": 80380,
                "h": 80417.96,
                "l": 80373.55,
                "c": 80379.9,
                "v": 5140,
                "n": 5140
              },
              {
                "ts": 1778302800000,
                "o": 80379.9,
                "h": 80401.41,
                "l": 80343,
                "c": 80365.54,
                "v": 8307,
                "n": 8307
              },
              {
                "ts": 1778303100000,
                "o": 80365.53,
                "h": 80374.31,
                "l": 80349.41,
                "c": 80374.31,
                "v": 1716,
                "n": 1716
              },
              {
                "ts": 1778303400000,
                "o": 80374.31,
                "h": 80408.23,
                "l": 80370.94,
                "c": 80371.87,
                "v": 3564,
                "n": 3564
              },
              {
                "ts": 1778303700000,
                "o": 80371.88,
                "h": 80425.71,
                "l": 80364.29,
                "c": 80423.28,
                "v": 2473,
                "n": 2473
              },
              {
                "ts": 1778304000000,
                "o": 80423.29,
                "h": 80442.94,
                "l": 80423.28,
                "c": 80441.69,
                "v": 1144,
                "n": 1144
              },
              {
                "ts": 1778304300000,
                "o": 80441.69,
                "h": 80441.69,
                "l": 80441.69,
                "c": 80441.69,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778304600000,
                "o": 80441.69,
                "h": 80441.69,
                "l": 80441.69,
                "c": 80441.69,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778304900000,
                "o": 80441.69,
                "h": 80441.69,
                "l": 80441.69,
                "c": 80441.69,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778305200000,
                "o": 80475.52,
                "h": 80478.68,
                "l": 80475.51,
                "c": 80478.67,
                "v": 749,
                "n": 749
              },
              {
                "ts": 1778305500000,
                "o": 80478.67,
                "h": 80478.68,
                "l": 80400.68,
                "c": 80400.69,
                "v": 2748,
                "n": 2748
              },
              {
                "ts": 1778305800000,
                "o": 80400.68,
                "h": 80400.69,
                "l": 80400.68,
                "c": 80400.68,
                "v": 74,
                "n": 74
              },
              {
                "ts": 1778306100000,
                "o": 80400.68,
                "h": 80400.68,
                "l": 80400.68,
                "c": 80400.68,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 80400.68,
                "h": 80400.68,
                "l": 80400.68,
                "c": 80400.68,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 79595,
                "h": 80428.01,
                "l": 79595,
                "c": 80423.65,
                "v": 3827,
                "n": 3827
              },
              {
                "ts": 1778307000000,
                "o": 80423.65,
                "h": 80428.01,
                "l": 80423.64,
                "c": 80428,
                "v": 153,
                "n": 153
              },
              {
                "ts": 1778307300000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 79595,
                "h": 80219.65,
                "l": 79595,
                "c": 80219.65,
                "v": 1650,
                "n": 1650
              }
            ],
            "15m": [
              {
                "ts": 1778276700000,
                "o": 80219.96,
                "h": 80264,
                "l": 80195.15,
                "c": 80263.99,
                "v": 5621,
                "n": 5621
              },
              {
                "ts": 1778277600000,
                "o": 80264,
                "h": 80399.98,
                "l": 80238.42,
                "c": 80390.74,
                "v": 21228,
                "n": 21228
              },
              {
                "ts": 1778278500000,
                "o": 80390.74,
                "h": 80409.09,
                "l": 80295.44,
                "c": 80348.96,
                "v": 13466,
                "n": 13466
              },
              {
                "ts": 1778279400000,
                "o": 80348.96,
                "h": 80369.03,
                "l": 80295.08,
                "c": 80311.98,
                "v": 10547,
                "n": 10547
              },
              {
                "ts": 1778280300000,
                "o": 80311.97,
                "h": 80342.86,
                "l": 80262,
                "c": 80262,
                "v": 7110,
                "n": 7110
              },
              {
                "ts": 1778281200000,
                "o": 80262,
                "h": 80299.27,
                "l": 80213.52,
                "c": 80213.52,
                "v": 9749,
                "n": 9749
              },
              {
                "ts": 1778282100000,
                "o": 80213.53,
                "h": 80245.43,
                "l": 80158.32,
                "c": 80198.01,
                "v": 9902,
                "n": 9902
              },
              {
                "ts": 1778283000000,
                "o": 80198.01,
                "h": 80198.01,
                "l": 80111.02,
                "c": 80139.01,
                "v": 15200,
                "n": 15200
              },
              {
                "ts": 1778283900000,
                "o": 80139.01,
                "h": 80198,
                "l": 80139,
                "c": 80193.17,
                "v": 7618,
                "n": 7618
              },
              {
                "ts": 1778284800000,
                "o": 80193.18,
                "h": 80205.74,
                "l": 80133.08,
                "c": 80161.45,
                "v": 11301,
                "n": 11301
              },
              {
                "ts": 1778285700000,
                "o": 80161.44,
                "h": 80208.66,
                "l": 80129.85,
                "c": 80155.7,
                "v": 9329,
                "n": 9329
              },
              {
                "ts": 1778286600000,
                "o": 80155.71,
                "h": 80218,
                "l": 80155.71,
                "c": 80195.09,
                "v": 8191,
                "n": 8191
              },
              {
                "ts": 1778287500000,
                "o": 80195.1,
                "h": 80240.87,
                "l": 80191.02,
                "c": 80238.76,
                "v": 9928,
                "n": 9928
              },
              {
                "ts": 1778288400000,
                "o": 80238.75,
                "h": 80320.56,
                "l": 80217.46,
                "c": 80320.56,
                "v": 9979,
                "n": 9979
              },
              {
                "ts": 1778289300000,
                "o": 80320.56,
                "h": 80349.99,
                "l": 80252.42,
                "c": 80274.87,
                "v": 8474,
                "n": 8474
              },
              {
                "ts": 1778290200000,
                "o": 80274.87,
                "h": 80399.93,
                "l": 80274.86,
                "c": 80381.15,
                "v": 13008,
                "n": 13008
              },
              {
                "ts": 1778291100000,
                "o": 80381.15,
                "h": 80446.58,
                "l": 80327.75,
                "c": 80327.75,
                "v": 12966,
                "n": 12966
              },
              {
                "ts": 1778292000000,
                "o": 80327.75,
                "h": 80465.93,
                "l": 80327.75,
                "c": 80436.01,
                "v": 15459,
                "n": 15459
              },
              {
                "ts": 1778292900000,
                "o": 80436,
                "h": 80458.78,
                "l": 80390,
                "c": 80428.65,
                "v": 12081,
                "n": 12081
              },
              {
                "ts": 1778293800000,
                "o": 80428.66,
                "h": 80477.47,
                "l": 80385,
                "c": 80394.57,
                "v": 11037,
                "n": 11037
              },
              {
                "ts": 1778294700000,
                "o": 80394.58,
                "h": 80437.96,
                "l": 80372.3,
                "c": 80417.87,
                "v": 7778,
                "n": 7778
              },
              {
                "ts": 1778295600000,
                "o": 80417.88,
                "h": 80477.47,
                "l": 80372.3,
                "c": 80427.99,
                "v": 10720,
                "n": 10720
              },
              {
                "ts": 1778296500000,
                "o": 80428,
                "h": 80550.67,
                "l": 80400.27,
                "c": 80433.4,
                "v": 14238,
                "n": 14238
              },
              {
                "ts": 1778297400000,
                "o": 80433.39,
                "h": 80433.4,
                "l": 80307.76,
                "c": 80347.61,
                "v": 8999,
                "n": 8999
              },
              {
                "ts": 1778298300000,
                "o": 80347.61,
                "h": 80395.85,
                "l": 80332.02,
                "c": 80383.95,
                "v": 6092,
                "n": 6092
              },
              {
                "ts": 1778299200000,
                "o": 80383.96,
                "h": 80666.66,
                "l": 80383.95,
                "c": 80572.94,
                "v": 23516,
                "n": 23516
              },
              {
                "ts": 1778300100000,
                "o": 80572.93,
                "h": 80572.94,
                "l": 80442,
                "c": 80476.66,
                "v": 12781,
                "n": 12781
              },
              {
                "ts": 1778301000000,
                "o": 80476.66,
                "h": 80476.67,
                "l": 80400,
                "c": 80409.99,
                "v": 7985,
                "n": 7985
              },
              {
                "ts": 1778301900000,
                "o": 80409.99,
                "h": 80471.17,
                "l": 80373.55,
                "c": 80379.9,
                "v": 14078,
                "n": 14078
              },
              {
                "ts": 1778302800000,
                "o": 80379.9,
                "h": 80408.23,
                "l": 80343,
                "c": 80371.87,
                "v": 13587,
                "n": 13587
              },
              {
                "ts": 1778303700000,
                "o": 80371.88,
                "h": 80442.94,
                "l": 80364.29,
                "c": 80441.69,
                "v": 3617,
                "n": 3617
              },
              {
                "ts": 1778304600000,
                "o": 80475.52,
                "h": 80478.68,
                "l": 80475.51,
                "c": 80478.67,
                "v": 749,
                "n": 749
              },
              {
                "ts": 1778305500000,
                "o": 80478.67,
                "h": 80478.68,
                "l": 80400.68,
                "c": 80400.68,
                "v": 2822,
                "n": 2822
              },
              {
                "ts": 1778306400000,
                "o": 79595,
                "h": 80428.01,
                "l": 79595,
                "c": 80428,
                "v": 3980,
                "n": 3980
              },
              {
                "ts": 1778307300000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 80428,
                "h": 80428,
                "l": 80428,
                "c": 80428,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 79595,
                "h": 80219.65,
                "l": 79595,
                "c": 80219.65,
                "v": 1650,
                "n": 1650
              }
            ],
            "1h": [
              {
                "ts": 1778274000000,
                "o": 80219.96,
                "h": 80264,
                "l": 80195.15,
                "c": 80263.99,
                "v": 5621,
                "n": 5621
              },
              {
                "ts": 1778277600000,
                "o": 80264,
                "h": 80409.09,
                "l": 80238.42,
                "c": 80262,
                "v": 52351,
                "n": 52351
              },
              {
                "ts": 1778281200000,
                "o": 80262,
                "h": 80299.27,
                "l": 80111.02,
                "c": 80193.17,
                "v": 42469,
                "n": 42469
              },
              {
                "ts": 1778284800000,
                "o": 80193.18,
                "h": 80240.87,
                "l": 80129.85,
                "c": 80238.76,
                "v": 38749,
                "n": 38749
              },
              {
                "ts": 1778288400000,
                "o": 80238.75,
                "h": 80446.58,
                "l": 80217.46,
                "c": 80327.75,
                "v": 44427,
                "n": 44427
              },
              {
                "ts": 1778292000000,
                "o": 80327.75,
                "h": 80477.47,
                "l": 80327.75,
                "c": 80417.87,
                "v": 46355,
                "n": 46355
              },
              {
                "ts": 1778295600000,
                "o": 80417.88,
                "h": 80550.67,
                "l": 80307.76,
                "c": 80383.95,
                "v": 40049,
                "n": 40049
              },
              {
                "ts": 1778299200000,
                "o": 80383.96,
                "h": 80666.66,
                "l": 80373.55,
                "c": 80379.9,
                "v": 58360,
                "n": 58360
              },
              {
                "ts": 1778302800000,
                "o": 80379.9,
                "h": 80478.68,
                "l": 80343,
                "c": 80400.68,
                "v": 20775,
                "n": 20775
              },
              {
                "ts": 1778306400000,
                "o": 79595,
                "h": 80428.01,
                "l": 79595,
                "c": 80219.65,
                "v": 5630,
                "n": 5630
              }
            ],
            "4h": [
              {
                "ts": 1778270400000,
                "o": 80219.96,
                "h": 80409.09,
                "l": 80111.02,
                "c": 80193.17,
                "v": 100441,
                "n": 100441
              },
              {
                "ts": 1778284800000,
                "o": 80193.18,
                "h": 80550.67,
                "l": 80129.85,
                "c": 80383.95,
                "v": 169580,
                "n": 169580
              },
              {
                "ts": 1778299200000,
                "o": 80383.96,
                "h": 80666.66,
                "l": 79595,
                "c": 80219.65,
                "v": 84765,
                "n": 84765
              }
            ],
            "1j": [
              {
                "ts": 1778198400000,
                "o": 80219.96,
                "h": 80409.09,
                "l": 80111.02,
                "c": 80193.17,
                "v": 100441,
                "n": 100441
              },
              {
                "ts": 1778284800000,
                "o": 80193.18,
                "h": 80666.66,
                "l": 79595,
                "c": 80219.65,
                "v": 254345,
                "n": 254345
              }
            ]
          },
          "ETH/USDT": {
            "5m": [
              {
                "ts": 1778305200000,
                "o": 2317.05,
                "h": 2317.34,
                "l": 2317,
                "c": 2317.15,
                "v": 746,
                "n": 746
              },
              {
                "ts": 1778305500000,
                "o": 2317.15,
                "h": 2317.15,
                "l": 2315.21,
                "c": 2315.21,
                "v": 2428,
                "n": 2428
              },
              {
                "ts": 1778305800000,
                "o": 2315.21,
                "h": 2315.22,
                "l": 2315.21,
                "c": 2315.22,
                "v": 58,
                "n": 58
              },
              {
                "ts": 1778306100000,
                "o": 2315.22,
                "h": 2315.22,
                "l": 2315.22,
                "c": 2315.22,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 2315.22,
                "h": 2315.22,
                "l": 2315.22,
                "c": 2315.22,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 2279.07,
                "h": 2318.58,
                "l": 2279.07,
                "c": 2318.51,
                "v": 3514,
                "n": 3514
              },
              {
                "ts": 1778307000000,
                "o": 2318.51,
                "h": 2318.67,
                "l": 2318.51,
                "c": 2318.67,
                "v": 239,
                "n": 239
              },
              {
                "ts": 1778307300000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 2279.07,
                "h": 2314.29,
                "l": 2279.07,
                "c": 2314.28,
                "v": 1889,
                "n": 1889
              }
            ],
            "15m": [
              {
                "ts": 1778304600000,
                "o": 2317.05,
                "h": 2317.34,
                "l": 2317,
                "c": 2317.15,
                "v": 746,
                "n": 746
              },
              {
                "ts": 1778305500000,
                "o": 2317.15,
                "h": 2317.15,
                "l": 2315.21,
                "c": 2315.22,
                "v": 2486,
                "n": 2486
              },
              {
                "ts": 1778306400000,
                "o": 2279.07,
                "h": 2318.67,
                "l": 2279.07,
                "c": 2318.67,
                "v": 3753,
                "n": 3753
              },
              {
                "ts": 1778307300000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 2318.67,
                "h": 2318.67,
                "l": 2318.67,
                "c": 2318.67,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 2279.07,
                "h": 2314.29,
                "l": 2279.07,
                "c": 2314.28,
                "v": 1889,
                "n": 1889
              }
            ],
            "1h": [
              {
                "ts": 1778302800000,
                "o": 2317.05,
                "h": 2317.34,
                "l": 2315.21,
                "c": 2315.22,
                "v": 3232,
                "n": 3232
              },
              {
                "ts": 1778306400000,
                "o": 2279.07,
                "h": 2318.67,
                "l": 2279.07,
                "c": 2314.28,
                "v": 5642,
                "n": 5642
              }
            ],
            "4h": [
              {
                "ts": 1778299200000,
                "o": 2317.05,
                "h": 2318.67,
                "l": 2279.07,
                "c": 2314.28,
                "v": 8874,
                "n": 8874
              }
            ],
            "1j": [
              {
                "ts": 1778284800000,
                "o": 2317.05,
                "h": 2318.67,
                "l": 2279.07,
                "c": 2314.28,
                "v": 8874,
                "n": 8874
              }
            ]
          },
          "XRP/USDT": {
            "5m": [
              {
                "ts": 1778305200000,
                "o": 1.4293,
                "h": 1.4298,
                "l": 1.4283,
                "c": 1.429,
                "v": 497,
                "n": 497
              },
              {
                "ts": 1778305500000,
                "o": 1.4289,
                "h": 1.4294,
                "l": 1.4268,
                "c": 1.4272,
                "v": 1507,
                "n": 1507
              },
              {
                "ts": 1778305800000,
                "o": 1.4272,
                "h": 1.4272,
                "l": 1.427,
                "c": 1.4272,
                "v": 164,
                "n": 164
              },
              {
                "ts": 1778306100000,
                "o": 1.4272,
                "h": 1.4272,
                "l": 1.4272,
                "c": 1.4272,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 1.4272,
                "h": 1.4272,
                "l": 1.4272,
                "c": 1.4272,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 1.427,
                "h": 1.4271,
                "l": 1.4257,
                "c": 1.4259,
                "v": 1322,
                "n": 1322
              },
              {
                "ts": 1778307000000,
                "o": 1.4258,
                "h": 1.4264,
                "l": 1.4258,
                "c": 1.4263,
                "v": 84,
                "n": 84
              },
              {
                "ts": 1778307300000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 1.4247,
                "h": 1.4251,
                "l": 1.4246,
                "c": 1.425,
                "v": 637,
                "n": 637
              }
            ],
            "15m": [
              {
                "ts": 1778304600000,
                "o": 1.4293,
                "h": 1.4298,
                "l": 1.4283,
                "c": 1.429,
                "v": 497,
                "n": 497
              },
              {
                "ts": 1778305500000,
                "o": 1.4289,
                "h": 1.4294,
                "l": 1.4268,
                "c": 1.4272,
                "v": 1671,
                "n": 1671
              },
              {
                "ts": 1778306400000,
                "o": 1.427,
                "h": 1.4271,
                "l": 1.4257,
                "c": 1.4263,
                "v": 1406,
                "n": 1406
              },
              {
                "ts": 1778307300000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 1.4263,
                "h": 1.4263,
                "l": 1.4263,
                "c": 1.4263,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 1.4247,
                "h": 1.4251,
                "l": 1.4246,
                "c": 1.425,
                "v": 637,
                "n": 637
              }
            ],
            "1h": [
              {
                "ts": 1778302800000,
                "o": 1.4293,
                "h": 1.4298,
                "l": 1.4268,
                "c": 1.4272,
                "v": 2168,
                "n": 2168
              },
              {
                "ts": 1778306400000,
                "o": 1.427,
                "h": 1.4271,
                "l": 1.4246,
                "c": 1.425,
                "v": 2043,
                "n": 2043
              }
            ],
            "4h": [
              {
                "ts": 1778299200000,
                "o": 1.4293,
                "h": 1.4298,
                "l": 1.4246,
                "c": 1.425,
                "v": 4211,
                "n": 4211
              }
            ],
            "1j": [
              {
                "ts": 1778284800000,
                "o": 1.4293,
                "h": 1.4298,
                "l": 1.4246,
                "c": 1.425,
                "v": 4211,
                "n": 4211
              }
            ]
          },
          "SOL/USDT": {
            "5m": [
              {
                "ts": 1778305200000,
                "o": 93.66,
                "h": 93.74,
                "l": 93.64,
                "c": 93.71,
                "v": 1124,
                "n": 1124
              },
              {
                "ts": 1778305500000,
                "o": 93.7,
                "h": 93.75,
                "l": 93.6,
                "c": 93.67,
                "v": 2661,
                "n": 2661
              },
              {
                "ts": 1778305800000,
                "o": 93.67,
                "h": 93.69,
                "l": 93.67,
                "c": 93.69,
                "v": 183,
                "n": 183
              },
              {
                "ts": 1778306100000,
                "o": 93.69,
                "h": 93.69,
                "l": 93.69,
                "c": 93.69,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 93.69,
                "h": 93.69,
                "l": 93.69,
                "c": 93.69,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 93.97,
                "h": 93.98,
                "l": 93.9,
                "c": 93.94,
                "v": 1901,
                "n": 1901
              },
              {
                "ts": 1778307000000,
                "o": 93.94,
                "h": 93.98,
                "l": 93.91,
                "c": 93.98,
                "v": 271,
                "n": 271
              },
              {
                "ts": 1778307300000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 93.39,
                "h": 93.46,
                "l": 93.38,
                "c": 93.44,
                "v": 907,
                "n": 907
              }
            ],
            "15m": [
              {
                "ts": 1778304600000,
                "o": 93.66,
                "h": 93.74,
                "l": 93.64,
                "c": 93.71,
                "v": 1124,
                "n": 1124
              },
              {
                "ts": 1778305500000,
                "o": 93.7,
                "h": 93.75,
                "l": 93.6,
                "c": 93.69,
                "v": 2844,
                "n": 2844
              },
              {
                "ts": 1778306400000,
                "o": 93.97,
                "h": 93.98,
                "l": 93.9,
                "c": 93.98,
                "v": 2172,
                "n": 2172
              },
              {
                "ts": 1778307300000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 93.98,
                "h": 93.98,
                "l": 93.98,
                "c": 93.98,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 93.39,
                "h": 93.46,
                "l": 93.38,
                "c": 93.44,
                "v": 907,
                "n": 907
              }
            ],
            "1h": [
              {
                "ts": 1778302800000,
                "o": 93.66,
                "h": 93.75,
                "l": 93.6,
                "c": 93.69,
                "v": 3968,
                "n": 3968
              },
              {
                "ts": 1778306400000,
                "o": 93.97,
                "h": 93.98,
                "l": 93.38,
                "c": 93.44,
                "v": 3079,
                "n": 3079
              }
            ],
            "4h": [
              {
                "ts": 1778299200000,
                "o": 93.66,
                "h": 93.98,
                "l": 93.38,
                "c": 93.44,
                "v": 7047,
                "n": 7047
              }
            ],
            "1j": [
              {
                "ts": 1778284800000,
                "o": 93.66,
                "h": 93.98,
                "l": 93.38,
                "c": 93.44,
                "v": 7047,
                "n": 7047
              }
            ]
          },
          "DOGE/USDT": {
            "5m": [
              {
                "ts": 1778305200000,
                "o": 0.11064,
                "h": 0.11078,
                "l": 0.11063,
                "c": 0.11076,
                "v": 1010,
                "n": 1010
              },
              {
                "ts": 1778305500000,
                "o": 0.11075,
                "h": 0.11079,
                "l": 0.11064,
                "c": 0.11073,
                "v": 1886,
                "n": 1886
              },
              {
                "ts": 1778305800000,
                "o": 0.11074,
                "h": 0.11075,
                "l": 0.11074,
                "c": 0.11075,
                "v": 23,
                "n": 23
              },
              {
                "ts": 1778306100000,
                "o": 0.11075,
                "h": 0.11075,
                "l": 0.11075,
                "c": 0.11075,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 0.11075,
                "h": 0.11075,
                "l": 0.11075,
                "c": 0.11075,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 0.11101,
                "h": 0.11105,
                "l": 0.11097,
                "c": 0.11104,
                "v": 1519,
                "n": 1519
              },
              {
                "ts": 1778307000000,
                "o": 0.11104,
                "h": 0.1112,
                "l": 0.11103,
                "c": 0.11118,
                "v": 538,
                "n": 538
              },
              {
                "ts": 1778307300000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 0.11056,
                "h": 0.11057,
                "l": 0.11049,
                "c": 0.11049,
                "v": 766,
                "n": 766
              }
            ],
            "15m": [
              {
                "ts": 1778304600000,
                "o": 0.11064,
                "h": 0.11078,
                "l": 0.11063,
                "c": 0.11076,
                "v": 1010,
                "n": 1010
              },
              {
                "ts": 1778305500000,
                "o": 0.11075,
                "h": 0.11079,
                "l": 0.11064,
                "c": 0.11075,
                "v": 1909,
                "n": 1909
              },
              {
                "ts": 1778306400000,
                "o": 0.11101,
                "h": 0.1112,
                "l": 0.11097,
                "c": 0.11118,
                "v": 2057,
                "n": 2057
              },
              {
                "ts": 1778307300000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 0.11118,
                "h": 0.11118,
                "l": 0.11118,
                "c": 0.11118,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 0.11056,
                "h": 0.11057,
                "l": 0.11049,
                "c": 0.11049,
                "v": 766,
                "n": 766
              }
            ],
            "1h": [
              {
                "ts": 1778302800000,
                "o": 0.11064,
                "h": 0.11079,
                "l": 0.11063,
                "c": 0.11075,
                "v": 2919,
                "n": 2919
              },
              {
                "ts": 1778306400000,
                "o": 0.11101,
                "h": 0.1112,
                "l": 0.11049,
                "c": 0.11049,
                "v": 2823,
                "n": 2823
              }
            ],
            "4h": [
              {
                "ts": 1778299200000,
                "o": 0.11064,
                "h": 0.1112,
                "l": 0.11049,
                "c": 0.11049,
                "v": 5742,
                "n": 5742
              }
            ],
            "1j": [
              {
                "ts": 1778284800000,
                "o": 0.11064,
                "h": 0.1112,
                "l": 0.11049,
                "c": 0.11049,
                "v": 5742,
                "n": 5742
              }
            ]
          },
          "ADA/USDT": {
            "5m": [
              {
                "ts": 1778305200000,
                "o": 0.2765,
                "h": 0.2768,
                "l": 0.2765,
                "c": 0.2765,
                "v": 97,
                "n": 97
              },
              {
                "ts": 1778305500000,
                "o": 0.2766,
                "h": 0.2769,
                "l": 0.276,
                "c": 0.2761,
                "v": 321,
                "n": 321
              },
              {
                "ts": 1778305800000,
                "o": 0.2761,
                "h": 0.2762,
                "l": 0.2761,
                "c": 0.2761,
                "v": 12,
                "n": 12
              },
              {
                "ts": 1778306100000,
                "o": 0.2761,
                "h": 0.2761,
                "l": 0.2761,
                "c": 0.2761,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 0.2761,
                "h": 0.2761,
                "l": 0.2761,
                "c": 0.2761,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 0.2762,
                "h": 0.2763,
                "l": 0.2761,
                "c": 0.2761,
                "v": 151,
                "n": 151
              },
              {
                "ts": 1778307000000,
                "o": 0.2761,
                "h": 0.2764,
                "l": 0.2761,
                "c": 0.2764,
                "v": 32,
                "n": 32
              },
              {
                "ts": 1778307300000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 0.2746,
                "h": 0.2747,
                "l": 0.2746,
                "c": 0.2746,
                "v": 63,
                "n": 63
              }
            ],
            "15m": [
              {
                "ts": 1778304600000,
                "o": 0.2765,
                "h": 0.2768,
                "l": 0.2765,
                "c": 0.2765,
                "v": 97,
                "n": 97
              },
              {
                "ts": 1778305500000,
                "o": 0.2766,
                "h": 0.2769,
                "l": 0.276,
                "c": 0.2761,
                "v": 333,
                "n": 333
              },
              {
                "ts": 1778306400000,
                "o": 0.2762,
                "h": 0.2764,
                "l": 0.2761,
                "c": 0.2764,
                "v": 183,
                "n": 183
              },
              {
                "ts": 1778307300000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 0.2764,
                "h": 0.2764,
                "l": 0.2764,
                "c": 0.2764,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 0.2746,
                "h": 0.2747,
                "l": 0.2746,
                "c": 0.2746,
                "v": 63,
                "n": 63
              }
            ],
            "1h": [
              {
                "ts": 1778302800000,
                "o": 0.2765,
                "h": 0.2769,
                "l": 0.276,
                "c": 0.2761,
                "v": 430,
                "n": 430
              },
              {
                "ts": 1778306400000,
                "o": 0.2762,
                "h": 0.2764,
                "l": 0.2746,
                "c": 0.2746,
                "v": 246,
                "n": 246
              }
            ],
            "4h": [
              {
                "ts": 1778299200000,
                "o": 0.2765,
                "h": 0.2769,
                "l": 0.2746,
                "c": 0.2746,
                "v": 676,
                "n": 676
              }
            ],
            "1j": [
              {
                "ts": 1778284800000,
                "o": 0.2765,
                "h": 0.2769,
                "l": 0.2746,
                "c": 0.2746,
                "v": 676,
                "n": 676
              }
            ]
          },
          "AVAX/USDT": {
            "5m": [
              {
                "ts": 1778305200000,
                "o": 10.01,
                "h": 10.02,
                "l": 10,
                "c": 10.01,
                "v": 74,
                "n": 74
              },
              {
                "ts": 1778305500000,
                "o": 10.01,
                "h": 10.02,
                "l": 10,
                "c": 10.01,
                "v": 200,
                "n": 200
              },
              {
                "ts": 1778305800000,
                "o": 10,
                "h": 10.01,
                "l": 10,
                "c": 10.01,
                "v": 2,
                "n": 2
              },
              {
                "ts": 1778306100000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 10.01,
                "h": 10.01,
                "l": 10,
                "c": 10.01,
                "v": 38,
                "n": 38
              },
              {
                "ts": 1778307000000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307300000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 9.94,
                "h": 9.96,
                "l": 9.94,
                "c": 9.95,
                "v": 105,
                "n": 105
              }
            ],
            "15m": [
              {
                "ts": 1778304600000,
                "o": 10.01,
                "h": 10.02,
                "l": 10,
                "c": 10.01,
                "v": 74,
                "n": 74
              },
              {
                "ts": 1778305500000,
                "o": 10.01,
                "h": 10.02,
                "l": 10,
                "c": 10.01,
                "v": 202,
                "n": 202
              },
              {
                "ts": 1778306400000,
                "o": 10.01,
                "h": 10.01,
                "l": 10,
                "c": 10.01,
                "v": 38,
                "n": 38
              },
              {
                "ts": 1778307300000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 10.01,
                "h": 10.01,
                "l": 10.01,
                "c": 10.01,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 9.94,
                "h": 9.96,
                "l": 9.94,
                "c": 9.95,
                "v": 105,
                "n": 105
              }
            ],
            "1h": [
              {
                "ts": 1778302800000,
                "o": 10.01,
                "h": 10.02,
                "l": 10,
                "c": 10.01,
                "v": 276,
                "n": 276
              },
              {
                "ts": 1778306400000,
                "o": 10.01,
                "h": 10.01,
                "l": 9.94,
                "c": 9.95,
                "v": 143,
                "n": 143
              }
            ],
            "4h": [
              {
                "ts": 1778299200000,
                "o": 10.01,
                "h": 10.02,
                "l": 9.94,
                "c": 9.95,
                "v": 419,
                "n": 419
              }
            ],
            "1j": [
              {
                "ts": 1778284800000,
                "o": 10.01,
                "h": 10.02,
                "l": 9.94,
                "c": 9.95,
                "v": 419,
                "n": 419
              }
            ]
          },
          "LINK/USDT": {
            "5m": [
              {
                "ts": 1778305200000,
                "o": 10.56,
                "h": 10.58,
                "l": 10.56,
                "c": 10.57,
                "v": 47,
                "n": 47
              },
              {
                "ts": 1778305500000,
                "o": 10.56,
                "h": 10.57,
                "l": 10.54,
                "c": 10.55,
                "v": 125,
                "n": 125
              },
              {
                "ts": 1778305800000,
                "o": 10.54,
                "h": 10.55,
                "l": 10.54,
                "c": 10.54,
                "v": 7,
                "n": 7
              },
              {
                "ts": 1778306100000,
                "o": 10.54,
                "h": 10.54,
                "l": 10.54,
                "c": 10.54,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306400000,
                "o": 10.54,
                "h": 10.54,
                "l": 10.54,
                "c": 10.54,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778306700000,
                "o": 10.54,
                "h": 10.55,
                "l": 10.53,
                "c": 10.54,
                "v": 239,
                "n": 239
              },
              {
                "ts": 1778307000000,
                "o": 10.53,
                "h": 10.53,
                "l": 10.52,
                "c": 10.52,
                "v": 49,
                "n": 49
              },
              {
                "ts": 1778307300000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307600000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778307900000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308500000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308800000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 10.47,
                "h": 10.48,
                "l": 10.46,
                "c": 10.47,
                "v": 31,
                "n": 31
              }
            ],
            "15m": [
              {
                "ts": 1778304600000,
                "o": 10.56,
                "h": 10.58,
                "l": 10.56,
                "c": 10.57,
                "v": 47,
                "n": 47
              },
              {
                "ts": 1778305500000,
                "o": 10.56,
                "h": 10.57,
                "l": 10.54,
                "c": 10.54,
                "v": 132,
                "n": 132
              },
              {
                "ts": 1778306400000,
                "o": 10.54,
                "h": 10.55,
                "l": 10.52,
                "c": 10.52,
                "v": 288,
                "n": 288
              },
              {
                "ts": 1778307300000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778308200000,
                "o": 10.52,
                "h": 10.52,
                "l": 10.52,
                "c": 10.52,
                "v": 0,
                "n": 0,
                "_gap": true
              },
              {
                "ts": 1778309100000,
                "o": 10.47,
                "h": 10.48,
                "l": 10.46,
                "c": 10.47,
                "v": 31,
                "n": 31
              }
            ],
            "1h": [
              {
                "ts": 1778302800000,
                "o": 10.56,
                "h": 10.58,
                "l": 10.54,
                "c": 10.54,
                "v": 179,
                "n": 179
              },
              {
                "ts": 1778306400000,
                "o": 10.54,
                "h": 10.55,
                "l": 10.46,
                "c": 10.47,
                "v": 319,
                "n": 319
              }
            ],
            "4h": [
              {
                "ts": 1778299200000,
                "o": 10.56,
                "h": 10.58,
                "l": 10.46,
                "c": 10.47,
                "v": 498,
                "n": 498
              }
            ],
            "1j": [
              {
                "ts": 1778284800000,
                "o": 10.56,
                "h": 10.58,
                "l": 10.46,
                "c": 10.47,
                "v": 498,
                "n": 498
              }
            ]
          }
        },
        "bunkerCfg": {
          "enabled": true,
          "triggerDropPct": 10,
          "active": true,
          "startCapital": 0,
          "triggerTs": 1778277278610,
          "actions": {
            "pauseBot": true,
            "reduceMises": true,
            "closePositions": false,
            "sendTelegram": true,
            "saveBackup": true
          },
          "minStakePct": 5,
          "recoveryPct": 3
        },
        "notifConfig": {
          "enabled": false,
          "tradeOpen": true,
          "tradeClose": true,
          "tpSl": true,
          "drawdownAlert": true,
          "twinAlert": true,
          "regimeChange": false,
          "lastNotifTs": 0
        },
        "_startPortfolio": 1172.7090165812594,
        "twin": {
          "active": false,
          "virtualPnl": 0,
          "wins": 0,
          "losses": 0,
          "trades": [],
          "openPos": {},
          "lmsrThreshold": 0.55,
          "stakeMultiplier": 0.6,
          "maxConcurrent": 3
        },
        "stakeUsdt": 1,
        "telegramCfg": {
          "botToken": "",
          "chatId": "",
          "enabled": false,
          "onTrade": true,
          "onAlert": true,
          "onHebdo": false,
          "onUrgence": true,
          "onPnlGoal": false,
          "log": []
        },
        "soundCfg": {
          "enabled": true,
          "preset": "retro",
          "volume": 0.6,
          "onWin": true,
          "onLoss": true,
          "onAlert": true,
          "onBadge": true,
          "onUrgence": true,
          "onTick": false
        },
        "pnlAlerts": {
          "sessionGain": {
            "enabled": true,
            "value": 10,
            "triggered": true
          },
          "sessionLoss": {
            "enabled": true,
            "value": -5,
            "triggered": false
          },
          "dailyGain": {
            "enabled": true,
            "value": 50,
            "triggered": true
          },
          "dailyLoss": {
            "enabled": true,
            "value": -20,
            "triggered": false
          },
          "drawdown": {
            "enabled": true,
            "value": 5,
            "triggered": false
          },
          "winStreak": {
            "enabled": true,
            "value": 5,
            "triggered": false
          },
          "tradeCount": {
            "enabled": false,
            "value": 100,
            "triggered": false
          }
        },
        "_lastAlertReset": 1778277278645,
        "unlockedBadges": [
          "gen_10"
        ],
        "_silencedCount": 0,
        "_lastTradeCount": 0,
        "_tradeStagnationTicks": 0,
        "_pausedPairs": {},
        "_pairLastEvalCount": {},
        "_genCount": 36749,
        "_convBoost": 0.1,
        "_lastAutoRevigorTs": 1778304248027,
        "avatar": {
          "emoji": "🧠",
          "color": "#38d4f5",
          "pseudo": "AURA Trader",
          "showInHeader": true
        },
        "dashPublic": {
          "showPortfolio": false,
          "showWR": true,
          "showTrades": true,
          "showPnlPct": true,
          "showPnlUsd": false,
          "showAgents": true,
          "showPairs": true,
          "showSharpe": true,
          "nickname": "AURA Trader"
        },
        "fundManager": {
          "fundName": "AURA Fund",
          "managementFee": 2,
          "performanceFee": 20,
          "investors": [
            {
              "id": 1,
              "name": "Investisseur A",
              "emoji": "👤",
              "allocation": 5000,
              "since": 1775712118762
            },
            {
              "id": 2,
              "name": "Investisseur B",
              "emoji": "👥",
              "allocation": 3000,
              "since": 1777008118762
            }
          ],
          "nextId": 3
        },
        "uiSettings": {
          "themeAuto": false,
          "theme": "nuit",
          "themesUsed": [
            "jour",
            "nuit"
          ]
        },
        "antiRevengeCfg": {
          "enabled": true,
          "cooldownMin": 15,
          "triggerLoss": 10,
          "triggerPct": 1,
          "triggerStreak": 2,
          "blockCount": 0,
          "savedPnl": 0
        },
        "paperRealisticConfig": {
          "enabled": true,
          "slippagePct": 0.08,
          "spreadPct": 0.05,
          "latencyMs": 120,
          "mktImpactPct": 0.02,
          "minOrderUsdt": 10,
          "maxOrderUsdt": 5000,
          "fillRatePct": 92,
          "partialFill": true,
          "nightSpreadMult": 1.5
        },
        "totalTFlows": 0,
        "version": 2,
        "savedAt": "2026-05-09T08:47:21.000Z",
        "key": "nexus_state_v2"
      };
      Object.entries(_F).forEach(([k,v])=>{try{S[k]=JSON.parse(JSON.stringify(v));}catch(e){}});
      S.botAutoMode=false; S.mode='manual';
      try{saveState();}catch(e){}
      console.log('[v105] ✅ Auto-restore $'+S.tradingAccount.toFixed(2));
    } catch(e){console.warn('[v105]',e);}
  }
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
if(typeof importState==='function') window.importState = importState;

async function init() {
  // v5.7 · Dynamic version display + defensive header cleanup
  try {
    const vd = document.getElementById('versionDisplay');
    if(vd && typeof S !== 'undefined') vd.textContent = 'v' + (S.vMajor || 7) + '.' + (S.vMinor || 11);  // v7.11 · fallback aligné
    // v6.1 · Sync mode toggle button with current state
    if(typeof updateModeButton === 'function') updateModeButton();
  } catch(e) {}

  // ── 1. Tenter de restaurer l'état sauvegardé ──
  const restored = await loadState();

  // ── 2. Seed chain log si nouvelle session ──
  if(!restored || S.chainLog.length === 0) {
    S.chainLog = [
      { icon:'🏛', desc:'DAO Contract déployé sur Polygon', hash:rndHash(), time:nowStr() },
      { icon:'🔑', desc:'Gnosis Safe trésorerie initialisée', hash:rndHash(), time:nowStr() },
      { icon:'🪙', desc:'GovernanceToken G$ mintés (5 agents)', hash:rndHash(), time:nowStr() },
      { icon:'💭', desc:'Mémoire épisodique vectorielle initialisée · 15 agents actifs', hash:rndHash(), time:nowStr() },
      { icon:'💤', desc:'Dream Engine prêt · 6 scénarios de stress disponibles', hash:rndHash(), time:nowStr() },
      { icon:'🌐', desc:'3 paires candidates en file d\'attente DAO', hash:rndHash(), time:nowStr() }
    ];
    S.evoLog = [
      { type:'new',   title:'🧬 hybrid_v1 créé',              desc:'Parents: Macro × Sentiment | Gen-1',                      time:nowStr() },
      { type:'dream', title:'💤 Dream #1 — Initialisation',   desc:'Système calibré sur 6 scénarios historiques.',            time:nowStr(), dreamId:null }
    ];
    // Seed one demo dream in history
    S.dreams = [{
      id:1, startCycle:0, time:nowStr(), complete:true,
      scenarios:[
        { ...DREAM_SCENARIOS[0], agentVotes:8540, agentAgainst:2100, outcome:{ priceDelta:-0.14, survived:true },  calibration:{ type:'tighten_sl', reason:'Flash Crash' } },
        { ...DREAM_SCENARIOS[4], agentVotes:6200, agentAgainst:3800, outcome:{ priceDelta: 0.11, survived:true },  calibration:null },
        { ...DREAM_SCENARIOS[5], agentVotes:4100, agentAgainst:1200, outcome:{ priceDelta:-0.002,survived:true }, calibration:{ type:'widen_cycles', reason:'Consolidation' } }
      ],
      insight:'Système résilient sur les 3 scénarios testés. Seuils TP/SL légèrement recalibrés après Flash Crash.'
    }];
  } else {
    S.chainLog.push({ icon:'✅', desc:`Session restaurée · cycle #${S.cycle} · ${S.totalTrades} trades`, hash:rndHash(), time:nowStr() });
  }

  // ── 3. Render ──
  // v8.0 LIVRAISON 40 · FIX BUG #1 : Init du modeToggleBtn (vrai élément)
  const _mBtn = document.getElementById('modeToggleBtn');
  const _mLbl = document.getElementById('modeLabelText');
  const _isAutoInit = S.botAutoMode !== false;
  if(_mBtn) _mBtn.className = _isAutoInit ? 'auto' : 'manual';
  if(_mLbl) _mLbl.textContent = _isAutoInit ? 'AUTO' : 'MAN';
  const _chip = document.getElementById('heroModeChip');
  if(_chip) {
    _chip.className = 'mode-indicator-chip ' + (S.botAutoMode !== false ? 'auto' : 'manual');
    _chip.innerHTML = S.botAutoMode !== false ? '🤖 AUTO' : '🎛️ MAN';
  }

  renderAll();
  // v5 · Kick off brain animation
  if(S.currentPage === 0) {
    setTimeout(() => { try { startBrainAnim(); updateMarketMood(); updateBotThoughts(); updateFiscalMini(); renderAnalyticsPanel(); if(typeof renderPendingActions === 'function') renderPendingActions(); } catch(e) { console.warn('init render:', e); } }, 300);
  }
  renderActionsGrid();       // force immediate — don't wait for tick%2
  renderPositions();
  drawMobileChart();
  buildPairPosButtons();
  syncPairPresets();
  updateCycleDurLabel();
  estimateStakes();
  updateAllPairCtrlLabels();
  updatePairBtnStates();
  drawSparkline();
  setTimeout(updatePairAnalysisPanels, 300);  // wait for price data

  if(restored) {
    // Reconstruire les cartes agents avec les données restaurées
    buildAgentCards();
    patchAgentCards();
    renderAll();
    showToast('✅ Session restaurée · cycle #'+S.cycle);
  }

  
  // L'utilisateur doit appuyer sur ▶ Démarrage pour lancer. Marquage _simEverStarted
  // reste false jusqu'au 1er clic → libellé "DÉMARRAGE" dans le header.
  updateSimBtn();

  // ── 5. v7.0: Prix live BULLETPROOF au démarrage ──
  // 5a. Restore from localStorage cache (prix frais si récents)
  try {
    const cached = localStorage.getItem('nexus_price_cache');
    if(cached) {
      const pc = JSON.parse(cached);
      const now = Date.now();
      Object.entries(pc).forEach(([pair, d]) => {
        if(S.pairStates[pair] && d.price && (now - (d.ts||0)) < 600000) {
          // Cache < 10 min → restore
          S.pairStates[pair].price = d.price;
          S.pairStates[pair].pnl24h = d.pnl24h || 0;
        }
      });
    }
  } catch(e) {}
  // 5b. Fetch immédiat
  fetchLivePrices(true);
  // 5c. Watchdog: vérifier toutes les 10s si les prix sont à jour
  setInterval(_priceWatchdog, 10000);
  // 5d. Second fetch 3s après pour capturer les valeurs les plus récentes
  setTimeout(() => fetchLivePrices(true), 3000);

  // ── 6. Auto-save et événements de page ──
  scheduleAutoSave();

  // ── 7. Sync version display ──
  const verEl = document.getElementById('versionDisplay');
  if(verEl) verEl.textContent = `v${S.vMajor}.${S.vMinor}`;
  const gBtn = document.getElementById('installGlobeBtn');
  if(gBtn) gBtn.title = `NEXUS v${S.vMajor}.${S.vMinor} · Installer`;

  // ── 8. Init leverage reserve (if not restored) ──
  // v7.4 FIX · La version compilée (vMajor/vMinor) est maintenant unique source de vérité.
  // Suppression de l'override hardcodé "v7.1" qui faisait vaciller l'affichage entre v7.4 et v7.1.

  if(!S._sessionStart) S._sessionStart = Date.now();
  if(!S.leverageReserve || S.leverageReserve === 0) initLeverageReserve();
  syncLeverageReserve();

  // ── 8. v3.1 initial renders ──
  updateIntelBanner();
  updateStreakBadge();
  setTimeout(() => {
    // v6.8: init fitnessHistory before renderCorrMatrix (needs historical data)
    S.agents.forEach(a => { if(!a.fitnessHistory) a.fitnessHistory = [a.fitness, a.fitness]; });
    renderAgentHeatmap();
    renderCorrMatrix();
    // ResizeObserver — redraw corr matrix if container resizes
    const corrWrap = document.getElementById('corrMatrixWrap');
    if(corrWrap && window.ResizeObserver) {
      new ResizeObserver(() => { _corrLastTick = -1; renderCorrMatrix(); }).observe(corrWrap);
    }
  }, 150);

  // ── 9. Resize ──
  window.addEventListener('resize', () => { drawSparkline(); drawMobileChart(); _corrLastTick = -1; renderCorrMatrix(); });
}
if(typeof init==='function') window.init = init;

// v111 BUG FIX CRITIQUE · L'appel init() avait disparu — restauration du chargement initial !
if(typeof init==='function') { init(); }

async function loadState() {
  // v7.5 · Si un factoryReset vient d'avoir lieu, on ignore TOUTE restauration
  // (le flag est dans sessionStorage → persiste entre reloads d'une même session)
  try {
    if(sessionStorage.getItem('nexus_factory_reset') === '1') {
      sessionStorage.removeItem('nexus_factory_reset');
      console.log('[NEXUS] factoryReset détecté — restauration ignorée, démarrage à blanc');
      // v11quinquies · BUG FIX : Nettoyer EXPLICITEMENT les comptes dans S
      // (au cas où des valeurs résiduelles seraient en mémoire)
      S.tradingAccount    = 0;
      S.cashAccount       = 0;
      S.portfolio         = 0;
      S.portfolioTotal    = 0;
      S.fiscalReserveAccount = 0;
      S.ownFundsInjected  = 0;
      S.ownFundsLog       = [];
      S.openPositions     = [];
      S.totalTrades       = 0;
      S.winTrades         = 0;
      S.pnl24h            = 0;
      S.pnlHistory        = [];
      S._startPortfolio   = 0;
      S.b                 = 0;
      S.fees              = { totalFees:0, totalPnlGross:0, totalPnlNet:0, byPair:{} };
      S.paperRealStats    = {};
      S.chainLog          = [];
      Object.keys(S.pairStates || {}).forEach(pair => {
        const ps = S.pairStates[pair];
        if(ps) {
          ps.totalTrades = 0;
          ps.winTrades   = 0;
          ps.totalPnlUsd = 0;
          ps.trades      = [];
          ps.openPosition = null;
        }
      });
      // Nettoyer aussi toute DB résiduelle (au cas où deleteDatabase aurait échoué)
      try {
        const delReq = indexedDB.deleteDatabase(DB_NAME);
        // fire-and-forget
      } catch(e) {}
      return false;
    }
  } catch(e) {}

  let snap = null;

  // Essayer IndexedDB d'abord
  try {
    const db = await openDB();
    snap = await new Promise(res => {
      const req = db.transaction(STORE_STATE, 'readonly')
                    .objectStore(STORE_STATE).get(SAVE_KEY);
      req.onsuccess = e => res(e.target.result || null);
      req.onerror   = () => res(null);
    });
  } catch(e) { /* IndexedDB indisponible */ }

  // Fallback localStorage
  if(!snap) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if(raw) snap = JSON.parse(raw);
    } catch(e) { /* corrompu */ }
  }

  if(!snap || snap.version < 2) return false;

  // ── Guard: never restore zero/negative financial values ──
  const safeNum = (val, fallback) => (typeof val === 'number' && val > 0) ? val : fallback;

  // ── Restaurer ──
  S.portfolio      = safeNum(snap.portfolio,     S.portfolio);
  S.cashAccount    = safeNum(snap.cashAccount,    S.cashAccount);
  S.tradingAccount = safeNum(snap.tradingAccount, S.tradingAccount);
  S.leverage       = (typeof snap.leverage === 'number') ? snap.leverage : 0;  // v7.5 FIX · préserve 0 (levier désactivé)
  S.botAutoMode    = snap.botAutoMode !== undefined ? snap.botAutoMode: false;
  // ── v5.4-v6 fields restore ────────────────────────────────────
  if(snap.heatmap)          S.heatmap          = snap.heatmap;
  if(snap.shadow)           S.shadow           = snap.shadow;
  if(snap.dreamJournal)     S.dreamJournal     = snap.dreamJournal;
  if(snap.decisionCascade)  S.decisionCascade  = snap.decisionCascade;
  if(snap.resonanceHistory) S.resonanceHistory = snap.resonanceHistory;
  if(snap.archives)         S.archives         = snap.archives;
  if(snap.brainLog)         S.brainLog         = snap.brainLog;
  if(snap.pendingActions)   S.pendingActions   = snap.pendingActions;
  if(snap.mutedAgents)      S.mutedAgents      = snap.mutedAgents;
  if(snap.botFleet)         Object.assign(S.botFleet || {}, snap.botFleet);
  if(Array.isArray(snap.agentLessons)) S.agentLessons = snap.agentLessons;  // v7.4 FIX · restore mémoire inter-agents
  // v7.12 LIVRAISON 4 · restore mode trading
  if (typeof snap.tradingMode === 'string')        S.tradingMode = snap.tradingMode;
  if (typeof snap.realTimeframe === 'string')      S.realTimeframe = snap.realTimeframe;
  if (snap.realActivePairs && typeof snap.realActivePairs === 'object') S.realActivePairs = snap.realActivePairs;
  if (Array.isArray(snap.agentLessonsReal))        S.agentLessonsReal = snap.agentLessonsReal;
  if (snap.realKillSwitch && typeof snap.realKillSwitch === 'object')   S.realKillSwitch = snap.realKillSwitch;
  if (typeof snap.realModeStartedAt === 'number')  S.realModeStartedAt = snap.realModeStartedAt;
  if (snap.realStatsByPair && typeof snap.realStatsByPair === 'object') S.realStatsByPair = snap.realStatsByPair;
  if (snap.preRealSnapshot && typeof snap.preRealSnapshot === 'object') S.preRealSnapshot = snap.preRealSnapshot;
  
  if (Array.isArray(snap.agentLessonsPaperReal))                S.agentLessonsPaperReal = snap.agentLessonsPaperReal;
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
  // v8.0 LIVRAISON 30 · FIX #9 · Doublon restauration supprimé (était écrit 2× chacun)
  if (typeof snap._totalCompounded === 'number' && snap._totalCompounded > 0)   S._totalCompounded = snap._totalCompounded;
  if (typeof snap._genCount === 'number' && snap._genCount > 0)                  S._genCount = snap._genCount;
  if (snap.preRealSnapshotPaperReal && typeof snap.preRealSnapshotPaperReal==='object') S.preRealSnapshotPaperReal = snap.preRealSnapshotPaperReal;
  // v7.12 LIVRAISON 2 · restore bougies temps réel
  if (snap.realCandles && typeof snap.realCandles === 'object') {
    S.realCandles = snap.realCandles;
    try { _ensureRealCandlesStruct(); } catch(e) {}
  }
  // v7.12 LIVRAISON 4 · MAJ visuelle du bandeau si mode real persisté
  try { _updateRealModeBanner(); } catch(e) {}
  // v6.2 · sync mode button after state restore
  setTimeout(() => { try { if(typeof updateModeButton === 'function') updateModeButton(); } catch(e){} }, 50);
  S.cycle          = snap.cycle        || 0;
  S.cycleMax       = snap.cycleMax     || 30;
  S.pnl24h         = snap.pnl24h       || 0;
  S.pnlHistory     = snap.pnlHistory   || [];
  S.totalTrades    = snap.totalTrades  || 0;
  S.winTrades      = snap.winTrades    || 0;
  S.chainLog       = snap.chainLog     || [];
  S.learningHistory = snap.learningHistory || [];
  S.evoLog         = snap.evoLog        || [];
  S.openPositions  = snap.openPositions || [];
  // Restore session start portfolio for intraday P&L
  if(snap._startPortfolio) {
    S._startPortfolio = snap._startPortfolio;
    // v11quinquies · BUG FIX : si le % calculé serait > 500%, c'est une ancienne base → recalibrer
    const _current = (S.cashAccount || 0) + (S.tradingAccount || 0);
    if(S._startPortfolio > 0 && _current > 0) {
      const _impliedPct = (_current - S._startPortfolio) / S._startPortfolio * 100;
      if(Math.abs(_impliedPct) > 500) {
        console.warn('[v43] _startPortfolio recalibré : %' + _impliedPct.toFixed(0) + '% → base recalée sur valeur actuelle');
        S._startPortfolio = _current;
        if(S.pnlPeriod) {
          S.pnlPeriod.todayStartPortfolio = _current;
          S.pnlPeriod.weekStartPortfolio  = _current;
        }
      }
    }
  }
  
  // v8.0 FIX · Fermer les positions orphelines au redémarrage (> 2h sans mise à jour)
  // Ces positions "fantômes" persistent dans le snapshot mais ne correspondent plus à rien
  if (Array.isArray(S.openPositions) && S.openPositions.length > 0) {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const stale = S.openPositions.filter(p => (now - (p.entryTs || now)) > TWO_HOURS);
    if (stale.length > 0) {
      console.log('[AURA] ' + stale.length + ' position(s) fantôme(s) fermée(s) au démarrage (> 2h)');
      S.openPositions = S.openPositions.filter(p => (now - (p.entryTs || now)) <= TWO_HOURS);
    }
  }

  // v8.0 LIVRAISON 25 · ONE-SHOT RESET du P&L cumulé au premier chargement après mise à jour
  // Demande utilisateur : repartir sur une base propre. Apprentissage préservé.
  try {
    const RESET_FLAG = 'aura_v8_pnl_reset_done';
    if (!localStorage.getItem(RESET_FLAG)) {
      // Recalibrer maintenant
      const current = (S.cashAccount || 0) + (S.tradingAccount || 0);
      S._startPortfolio = current;
      S.pnl24h = 0;
      S.portfolio = current;
      // Reset les périodes pour ce qui sera affiché
      if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
      S.pnlPeriod.todayStartPortfolio = current;
      S.pnlPeriod.todayDate = (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'));
      S.pnlPeriod.weekStartPortfolio = current;
      S.pnlPeriod.monthStartPortfolio = current;
      // Marquer comme fait
      localStorage.setItem(RESET_FLAG, '1');
      console.log('[AURA] One-shot P&L reset done · base ' + current.toFixed(2));
    }
  } catch(e) { console.warn('[AURA] One-shot reset échoué :', e); }
  if(snap.fees) {
    Object.assign(S.fees, snap.fees);
    S.fees.feeLog = snap.fees.feeLog || [];
    S.fees.byPair = snap.fees.byPair || {};
  }
  if(snap.taxConfig) {
    S.taxConfig.region  = snap.taxConfig.region  || S.taxConfig.region;
    // Merge saved regions (preserves user edits) but keep built-in as base
    if(snap.taxConfig.regions) {
      Object.assign(S.taxConfig.regions, snap.taxConfig.regions);
    }
  }
  // Restaurer agents
  if(snap.agents && snap.agents.length) {
    snap.agents.forEach(sa => {
      const a = S.agents.find(x => x.id === sa.id);
      if(a) {
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
        // v7.0: restaurer la mémoire par régime
        a.regimeFitness  = sa.regimeFitness  || {};
        // v6.2: restaurer les champs d'apprentissage
        a.errors         = sa.errors         || 0;
        a.corrections    = sa.corrections    || 0;
        a.streak         = sa.streak         || 0;
        a.lastPnl        = sa.lastPnl        || 0;
        a.memory         = sa.memory         || [];
      }
    });
  }
  // v7.0: Restaurer pairStates — mais SKIP ps.price si snapshot vieux (>10 min)
  // Les prix seront rechargés via fetchLivePrices immédiatement
  const _snapAge = snap.savedAt ? (Date.now() - new Date(snap.savedAt).getTime()) : 0;
  const _priceStale = _snapAge > 600000; // 10 min
  if(snap.pairStates) {
    Object.entries(snap.pairStates).forEach(([pair, saved]) => {
      const ps = S.pairStates[pair];
      if(!ps) return;
      // v7.0: ne restaure le prix QUE si frais (<10 min) — sinon laisse fetchLivePrices gérer
      if(!_priceStale) ps.price = saved.price || ps.price;
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
      if(saved.candles && saved.candles.length) ps.candles = saved.candles;
      // Restore best/worst trade
      if(snap.pairBestWorst && snap.pairBestWorst[pair]) {
        ps.bestTrade  = snap.pairBestWorst[pair].bestTrade  || null;
        ps.worstTrade = snap.pairBestWorst[pair].worstTrade || null;
      }
    });
  }

  // ── Feature #1 — Restore agent memories ─────────────────
  if(snap.agentMemories) {
    S.agents.forEach(a => {
      if(snap.agentMemories[a.id]) a.memory = snap.agentMemories[a.id];
      // v6.2 · restore learning fields
      const saved = snap.agents ? snap.agents.find(sa => sa.id === a.id) : null;
      if(saved) {
        if(saved.errors      != null) a.errors      = saved.errors;
        if(saved.corrections != null) a.corrections = saved.corrections;
        if(saved.streak      != null) a.streak      = saved.streak;
        if(saved.lastPnl     != null) a.lastPnl     = saved.lastPnl;
        if(saved.learningEvents != null) a.learningEvents = saved.learningEvents;
      }
    });
  }
  if(snap.globalMemoryPool) S.globalMemoryPool = snap.globalMemoryPool;

  // ── Feature #2 — Restore dreams ─────────────────────────
  if(snap.dreams && snap.dreams.length) S.dreams = snap.dreams;

  // Restore version
  if(snap.vMajor != null) S.vMajor = snap.vMajor;
  // v6.8: NE PAS restaurer vMinor — toujours garder la valeur compilée (6.8)
  // if(snap.vMinor != null) S.vMinor = snap.vMinor;
  // Restore leverage
  if(snap.leverageReserve   != null) S.leverageReserve   = snap.leverageReserve;
  if(snap.leverageBorrowed  != null) S.leverageBorrowed  = snap.leverageBorrowed;
  if(snap.leverageTotalFees != null) S.leverageTotalFees = snap.leverageTotalFees;

  // ── v7.1 Phase 10 · Restauration comptes Phase 2/8/9 ──────────────────
  // Sans ces restores, toute injection Fiat ou accumulation fiscale serait perdue au refresh.
  if(snap.fiscalReserveAccount != null) S.fiscalReserveAccount = snap.fiscalReserveAccount;
  if(Array.isArray(snap.fiscalReserveLog)) S.fiscalReserveLog = snap.fiscalReserveLog;
  if(snap.ownFundsInjected != null) S.ownFundsInjected = snap.ownFundsInjected;
  if(Array.isArray(snap.ownFundsLog)) S.ownFundsLog = snap.ownFundsLog;
  if(typeof snap.fiatConvFeePct === 'number') S.fiatConvFeePct = snap.fiatConvFeePct;
  // v7.2 Phase 14c · Restauration snapshot emprunt auto levier
  if(snap._autoLevBase     != null) S._autoLevBase     = snap._autoLevBase;
  if(snap._autoLevBorrowed != null) S._autoLevBorrowed = snap._autoLevBorrowed;

  // ── Feature #3 — Restore dynamic pairs & proposals ──────
  if(snap.dynamicPairKeys && snap.dynamicPairKeys.length) {
    snap.dynamicPairKeys.forEach(pairKey => {
      if(!PAIRS[pairKey]) {
        const sym = pairKey.split('/')[0];
        const candidate = (snap.pairCandidates || S.pairCandidates).find(c => c.sym === sym);
        if(candidate) {
          PAIRS[pairKey] = {
            sym: candidate.sym, color: candidate.color,
            startPrice: candidate.startPrice, vol: candidate.vol,
            minP: candidate.minP, maxP: candidate.maxP, dec: candidate.dec
          };
          if(!S.pairStates[pairKey]) S.pairStates[pairKey] = makePairState(PAIRS[pairKey]);
        }
      }
    });
  }
  if(snap.pairCandidates) S.pairCandidates = snap.pairCandidates;
  if(snap.proposals && snap.proposals.length) {
    // Merge saved proposals — keep DAO proposals, preserve pair proposals
    const savedPairProps = snap.proposals.filter(p => p.isPairProposal);
    savedPairProps.forEach(sp => {
      if(!S.proposals.find(p => p.id === sp.id)) S.proposals.unshift(sp);
    });
    // Restore active pair proposal tracker
    const activePP = savedPairProps.find(p => p.status === 'active');
    if(activePP) S.activePairProposal = activePP.pairSym;
  }

  return true;
}
if(typeof loadState==='function') window.loadState = loadState;

function markRealPriceReceived() {
  _lastRealPriceTs = Date.now();
  if (_netwatchState === 'offline') {
    _freshPricesInRow++;
    if (_freshPricesInRow >= 3) {
      // Reprise : 3 prix frais consécutifs
      _netwatchState = 'online';
      _net10sSaveTriggered = false;
      _netOfflineSinceTs = 0;
      // v7.12 BUG FIX · DÉBLOQUER le bot (le flag S._netPaused empêchait les ouvertures)
      if (typeof S !== 'undefined' && S) {
        S._netPaused = false;
        S._netToastShown = false;
      }
      _updateNetIndicator();
      if (_netwatchPausedBot && !_simRunning) {
        // On a pausé le bot, on le redémarre
        _netwatchPausedBot = false;
        if (typeof startSim === 'function') {
          try { startSim(); } catch(e) {}
        }
        // v7.12 · UI discrète · pas de toast pour reprise (c'est normal)
        S.chainLog.push({
          icon: '🟢',
          desc: 'Connexion rétablie · bot reprend',
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      // Reset le flag de toast quand on revient online
      _netwatchPausedBot = false;
    }
  } else {
    _freshPricesInRow = 0;
  }
}
if(typeof markRealPriceReceived==='function') window.markRealPriceReceived = markRealPriceReceived;

function openDiagnostic() {
  const body = document.getElementById('diagBody');
  const overlay = document.getElementById('diagOverlay');
  if (!body || !overlay) return;

  const now = Date.now();
  const positions = S.openPositions || [];
  const agents = S.agents || [];
  const pairStates = S.pairStates || {};
  
  // ── TRADES SECTION ──
  // Clôturées = dans ps.trades avec type 'position' et pnlUsdt numérique
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
  const oldCls = oldestPosAge > 3600000 ? 'crit' : oldestPosAge > 600000 ? 'warn' : 'ok';
  const noTpSlCls = noTpSl > 0 ? 'warn' : 'ok';

  // ── P&L SECTION ──
  const pnlRealised = Object.values(pairStates).reduce((s, ps) => s + (ps.totalPnlUsd || 0), 0);
  const pnlLatent = positions.reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const ratio = pnlRealised !== 0 ? Math.abs(pnlLatent / pnlRealised) : (pnlLatent !== 0 ? 999 : 0);
  const ratioCls = ratio > 2 ? 'crit' : ratio > 1 ? 'warn' : 'ok';
  const fmt$ = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);
  
  // ── MARKET SECTION ──
  // v110 FIX: en mode RÉEL, les prix viennent du WebSocket, pas du HTTP fetch.
  // Utiliser _lastRealPriceTs (WS) en mode réel, _lastPriceFetch (HTTP) en mode sim.
  let lastFetch;
  if (typeof _isRealLike === 'function' && _isRealLike()) {
    // Mode réel : utiliser le timestamp du dernier prix WS reçu
    lastFetch = (typeof _lastRealPriceTs !== 'undefined' && _lastRealPriceTs) ? _lastRealPriceTs : 0;
  } else {
    // Mode sim : utiliser le timestamp du dernier fetch HTTP
    lastFetch = (typeof _lastPriceFetch !== 'undefined' && _lastPriceFetch) ? _lastPriceFetch : 0;
  }
  const staleThreshold = 60000; // 1 min
  const isGloballyStale = lastFetch === 0 || (now - lastFetch) > staleThreshold;
  // If globally stale, all pairs are stale; otherwise count individuals
  let staleCount = 0;
  if (isGloballyStale) {
    staleCount = Object.keys(pairStates).length;
  } else {
    // All pairs share the same fetch, so either all or none are stale
    staleCount = 0;
  }
  const ageSinceUpdate = lastFetch ? Math.floor((now - lastFetch)/1000) : -1;
  // v7.12 LIVRAISON 7 · Source prix intelligente : détecter Binance WS si actif
  const srcMap = {0:'CoinGecko', 1:'Binance', 2:'Mode Auto-apprentissage'};
  let currentSource = (typeof _priceSource !== 'undefined') ? (srcMap[_priceSource] || '—') : '—';
  // Compteur WS connectés
  let wsConnectedCount = 0;
  let wsActiveTotal = 0;
  try {
    if (typeof _bgCollectorWSMap === 'object' && _bgCollectorWSMap) {
      Object.entries(_bgCollectorWSMap).forEach(([p, ws]) => {
        wsActiveTotal++;
        if (ws && ws.readyState === 1) wsConnectedCount++;
      });
    }
    // Le WS foreground du modal compte aussi
    if (typeof _realCandlesState !== 'undefined' && _realCandlesState.wsConnected) {
      wsConnectedCount++;
      wsActiveTotal++;
    }
  } catch(e) {}
  // Si en mode real OU Réel et au moins 1 WS connecté → Binance WS
  if (_isRealLike() && wsConnectedCount > 0) {
    currentSource = 'Binance WS · live';
  }
  const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : '—';
  const staleCls = staleCount === 0 ? 'ok' : staleCount < Object.keys(pairStates).length ? 'warn' : 'crit';
  const updateCls = ageSinceUpdate < 0 ? 'crit' : ageSinceUpdate > 120 ? 'crit' : ageSinceUpdate > 30 ? 'warn' : 'ok';

  // ── AGENTS SECTION ──
  const pureAgents = agents.filter(a => !a.isBot && !a.isMeta);
  const saturated = agents.filter(a => (a.fitness || 0) >= 1900).length;
  const broken = agents.filter(a => (a.fitness || 0) <= 80).length;
  const totalAg = agents.length;
  const satCls = saturated > totalAg * 0.5 ? 'warn' : 'ok';
  const brokenCls = broken > 3 ? 'crit' : broken > 0 ? 'warn' : 'ok';
  const fpMode = S.fullPowerMode ? 'ACTIF' : 'off';
  const fpCls = S.fullPowerMode ? 'warn' : 'ok';

  // ── CAPITAL SECTION ──
  const trading = S.tradingAccount || 0;
  const cash = S.cashAccount || 0;
  const borrowed = S.leverageBorrowed || 0;
  const maxCapacity = (S._autoLevBase || trading) * (S.leverageMaxMult || 10);
  const usagePct = maxCapacity > 0 ? (borrowed / maxCapacity) * 100 : 0;
  const usageCls = usagePct > 90 ? 'crit' : usagePct > 70 ? 'warn' : 'ok';
  const engagedPct = (trading + borrowed) > 0 ? (borrowed / (trading + borrowed)) * 100 : 0;

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
      <div class="diag-line"><span class="diag-label">Dernier fetch</span><span class="diag-val ${updateCls}">il y a ${ageSinceUpdate<0?'—':ageSinceUpdate+'s'}</span></div>
      ${_isRealLike() ? `<div class="diag-line"><span class="diag-label">WS connectés (${S.tradingMode})</span><span class="diag-val ${wsConnectedCount === wsActiveTotal && wsActiveTotal>0 ? 'ok' : wsConnectedCount > 0 ? 'warn' : 'crit'}">${wsConnectedCount} / ${wsActiveTotal}</span></div>` : ''}
      ${_isRealLike() ? (function(){
        const upPct = (typeof _getWsUptimePct === 'function') ? _getWsUptimePct() : 100;
        const discCount = _wsStability.disconnects ? _wsStability.disconnects.length : 0;
        const cls = upPct >= 95 ? 'ok' : upPct >= 80 ? 'warn' : 'crit';
        return `<div class="diag-line"><span class="diag-label">Stabilité (1h)</span><span class="diag-val ${cls}">${upPct}% · ${discCount} coupure(s)</span></div>`;
      })() : ''}
      <div class="diag-line"><span class="diag-label">Régime détecté</span><span class="diag-val neu">${regime.toUpperCase()}</span></div>
      <div class="diag-line"><span class="diag-label">Paires figées (STALE)</span><span class="diag-val ${staleCls}">${staleCount} / ${Object.keys(pairStates).length}</span></div>
      ${staleCount > 0 ? '<div class="diag-note">⚠ Des paires n\'ont pas reçu de nouvelles bougies depuis 2+ min</div>' : ''}
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
if(typeof openDiagnostic==='function') window.openDiagnostic = openDiagnostic;

function openSnapshotsModal() {
  const snaps = listInternalSnapshots();
  const modal = document.getElementById('snapshotsModal');
  if (!modal) {
    // Créer le modal
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
if(typeof openSnapshotsModal==='function') window.openSnapshotsModal = openSnapshotsModal;

function openWhyModal(posId) {
  const pos = (S.openPositions || []).find(p => p.id === posId);
  if(!pos) { showToast('Position introuvable', 1500, 'warn'); return; }

  const ps  = S.pairStates[pos.pair];
  const cfg = PAIRS[pos.pair] || {};
  const body = document.getElementById('whyBody');
  const overlay = document.getElementById('whyOverlay');
  if(!body || !overlay) return;

  // ── Durée de la position ──
  const since = pos.entryTs ? Math.round((Date.now() - pos.entryTs) / 1000) : 0;
  const sinceStr = since > 3600 ? Math.floor(since/3600)+'h '+Math.floor((since%3600)/60)+'m'
                 : since > 60   ? Math.floor(since/60)+'m '+since%60+'s'
                 : since+'s';

  // ── Prix entrée et P&L actuel ──
  const curPrice  = ps ? ps.price : 0;
  const entryPrice = pos.entryPrice || 0;
  const dec = cfg.dec >= 4 ? cfg.dec : 2;
  const pnlPct = entryPrice > 0
    ? (pos.side==='long' ? (curPrice-entryPrice)/entryPrice*100 : (entryPrice-curPrice)/entryPrice*100)
    : 0;
  const pnlUsd = pos.stakeUsdt * pnlPct / 100;
  const pnlCol = pnlPct >= 0 ? 'var(--up)' : 'var(--down)';

  // ── Régime et indicateurs au moment de l'ouverture ──
  const regime = ps ? (ps.regime || 'calm') : 'calm';
  const rsi    = ps ? (ps.rsi14 || '—') : '—';
  const mom    = ps ? ((ps.momentum||0)*100).toFixed(2)+'%' : '—';
  const lmsr   = ps ? (lmsrP(ps)*100).toFixed(0)+'%' : '—';

  // ── Agents qui ont voté ──
  const agents = pos._openAgents || [];
  const bullAgents = agents.filter(a => (a.score||0) > 0);
  const bearAgents = agents.filter(a => (a.score||0) < 0);

  // ── Raison principale ──
  const reason = pos._openReason || (pos.auto ? 'Consensus agents + LMSR' : 'Ouverture manuelle');

  body.innerHTML = `
    <!-- Paire + statut -->
    <div class="why-section">
      <div class="why-section-title">📍 Position</div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Paire</span>
        <span class="why-metric-val">${pos.pair}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Direction</span>
        <span class="why-metric-val" style="color:${pos.side==='long'?'var(--up)':'var(--down)'}">
          ${pos.side==='long'?'↑ LONG':'↓ SHORT'}
        </span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Ouverte depuis</span>
        <span class="why-metric-val">${sinceStr}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">P&L actuel</span>
        <span class="why-metric-val" style="color:${pnlCol}">
          ${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}% (${pnlUsd>=0?'+':''}$${pnlUsd.toFixed(2)})
        </span>
      </div>
    </div>

    <!-- Raison principale -->
    <div class="why-section">
      <div class="why-section-title">🧠 Raison d'ouverture</div>
      <div class="why-reason">${reason}</div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Mode</span>
        <span class="why-metric-val">${pos.auto ? '🤖 Bot automatique' : '🎛️ Manuel'}</span>
      </div>
    </div>

    <!-- Indicateurs au moment de l'ouverture -->
    <div class="why-section">
      <div class="why-section-title">📊 Indicateurs du marché</div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Régime</span>
        <span class="why-metric-val">${regime.toUpperCase()}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">RSI 14</span>
        <span class="why-metric-val">${rsi}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Momentum</span>
        <span class="why-metric-val">${mom}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">LMSR (conviction)</span>
        <span class="why-metric-val">${lmsr}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Prix entrée</span>
        <span class="why-metric-val">${entryPrice.toFixed(dec)}</span>
      </div>
    </div>

    <!-- Agents qui ont voté -->
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

    <!-- TP/SL si définis -->
    ${(pos.tp || pos.sl) ? `
    <div class="why-section">
      <div class="why-section-title">🎯 Objectifs</div>
      ${pos.tp ? `<div class="why-metric-row">
        <span class="why-metric-lbl">Take Profit</span>
        <span class="why-metric-val" style="color:var(--up)">${pos.tp.toFixed(dec)}</span>
      </div>` : ''}
      ${pos.sl ? `<div class="why-metric-row">
        <span class="why-metric-lbl">Stop Loss</span>
        <span class="why-metric-val" style="color:var(--down)">${pos.sl.toFixed(dec)}</span>
      </div>` : ''}
    </div>` : ''}
  `;

  overlay.classList.add('open');
}
window.openWhyModal = openWhyModal;
if(typeof openWhyModal==='function') window.openWhyModal = openWhyModal;

function resetPnlSession() {
  if (!confirm('Recalibrer les compteurs de P&L ? L\'apprentissage du bot ne sera PAS perdu.')) return;
  const current = S.portfolio || 0;
  // Reset session display (heroPnlBadge)
  S._startPortfolio = current;
  S.pnl24h = 0;
  // Reset journalier
  if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
  S.pnlPeriod.todayStartPortfolio = current;
  S.pnlPeriod.todayDate = _getTodayKey();
  // Toast
  if (typeof showToast === 'function') {
    showToast('🔄 Compteurs P&L recalibrés · Apprentissage préservé', 4000, 'win');
  }
  // Save
  try { if (typeof saveState === 'function') saveState(); } catch(e) {}
  // Refresh affichage
  try { if (typeof renderHome === 'function') renderHome(); } catch(e) {}
}
window.resetPnlSession = resetPnlSession;
if(typeof resetPnlSession==='function') window.resetPnlSession = resetPnlSession;

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
if(typeof saveFeeRecord==='function') window.saveFeeRecord = saveFeeRecord;

async function saveState(silent = false) {
  const snap = buildSnapshot();
  // 1. IndexedDB (principal)
  try {
    const db = await openDB();
    return new Promise(res => {
      const tx  = db.transaction(STORE_STATE, 'readwrite');
      const req = tx.objectStore(STORE_STATE).put(snap);
      req.onsuccess = () => {
        if(!silent) updateSaveIndicator('saved');
        res(true);
      };
      req.onerror = () => res(false);
    });
  } catch(e) {
    // 2. localStorage fallback
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      if(!silent) updateSaveIndicator('saved');
    } catch(le) { /* quota exceeded — silencieux */ }
    return false;
  }
}
if(typeof saveState==='function') window.saveState = saveState;

function stopSim() {
  if(!_simRunning) return;
  _simRunning = false;
  clearInterval(_simInterval);
  _simInterval = null;
  updateSimBtn();
  // v7.12 · Libère le Wake Lock · écran peut s'éteindre
  _releaseWakeLock();
  updateSaveIndicator('saving');
  saveState(false).then(() => showToast('⏸ Auto-apprentissage en pause · données sauvegardées', 2800, 'user'));
  S.chainLog.push({ icon:'⏸', desc:'Auto-apprentissage en pause · cycle #'+S.cycle, hash:rndHash(), time:nowStr() });
}
if(typeof stopSim==='function') window.stopSim = stopSim;

function toggleBar(barName) {
  const autoBar = document.getElementById('autoBar');
  const manBar = document.getElementById('manBar');
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
if(typeof toggleBar==='function') window.toggleBar = toggleBar;




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
if(typeof toggleFullPower==='function') window.toggleFullPower = toggleFullPower;

function toggleSim() {
  if(_simRunning) stopSim(); else startSim();
}
if(typeof toggleSim==='function') window.toggleSim = toggleSim;

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
    
    // ── État PAUSED ──
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'action-brick sig-hold paused';
      if (pxEl) {
        const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
        pxEl.textContent = priceStr;
      }
      if (sigEl) sigEl.textContent = '⏸ PAUSE';
      if (lmsrEl) lmsrEl.textContent = '—';
      if (wrEl) { wrEl.textContent = '—'; wrEl.className = 'ab-wr'; }
      if (trEl) trEl.textContent = '';
      return;
    }
    
    // Prix + %24h
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24 = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }
    
    // LMSR probability
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const pct = prob * 100;
    
    // Positions (manual + bot)
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    const botPos    = (S.openPositions || []).find(p => p.pair === pair && p.auto === true);
    
    // Determine signal + classes
    let sigText, brickCls;
    if (manualPos) {
      sigText = (manualPos.side === 'long' ? '🔒 LONG' : '🔒 SHORT');
      brickCls = manualPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (botPos) {
      sigText = (botPos.side === 'long' ? '🟢 LONG' : '🔴 SHORT');
      brickCls = botPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (prob > 0.6) {
      sigText = '🤖 BUY';
      brickCls = 'action-brick sig-buy';
    } else if (prob < 0.4) {
      sigText = '🤖 SELL';
      brickCls = 'action-brick sig-sell';
    } else {
      sigText = 'HOLD';
      brickCls = 'action-brick sig-hold';
    }
    brick.className = brickCls;
    
    if (sigEl) sigEl.textContent = sigText;
    
    // LMSR conviction display
    if (lmsrEl) {
      const arrow = pct >= 50 ? '↑' : '↓';
      lmsrEl.textContent = arrow + pct.toFixed(0) + '%';
    }
    
    // Win rate
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
    
    // Trade count
    if (trEl) {
      trEl.textContent = (ps.totalTrades || 0) + ' tr';
      trEl.style.color = 'var(--t3)';
    }
    
    // ── Sparkline de fond ──
    if (ps.candles && ps.candles.length >= 2) {
      let sparkColor = cfg.color;
      if (prob > 0.6) sparkColor = '#00e87a';
      else if (prob < 0.4) sparkColor = '#ff3d6b';
      _drawSparkline('abspark_' + pairKey, ps.candles, sparkColor, prob >= 0.5);
    }
    
    // ── RSI dot adaptatif ──
    const rsiDot = document.getElementById('abrsi_' + pairKey);
    if (rsiDot) {
      const rsi = _computeRSI14(ps.candles);
      if (rsi !== null) {
        let rsiCls = 'neutral';
        if (rsi < 30) rsiCls = 'oversold';      // signal LONG potentiel
        else if (rsi > 70) rsiCls = 'overbought'; // signal SHORT potentiel
        rsiDot.className = 'ab-rsi-dot ' + rsiCls;
        rsiDot.title = 'RSI ' + rsi.toFixed(0);
      }
    }
    
    // ── Intensité adaptative selon conviction ──
    const convStrength = Math.abs(prob - 0.5) * 2;  // 0 à 1
    if (convStrength > 0.6) {
      brick.setAttribute('data-conv', 'strong');
    } else {
      brick.removeAttribute('data-conv');
    }
    
    // ── Marqueur visuel mode manuel ──
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
if(typeof updateActionBricks==='function') window.updateActionBricks = updateActionBricks;

function updateManBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const brick = document.getElementById('manbrick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;
    
    const pxEl   = document.getElementById('mbpx_' + pairKey);
    const sugEl  = document.getElementById('mbsug_' + pairKey);
    const pnlEl  = document.getElementById('mbpnl_' + pairKey);
    const badgeEl = document.getElementById('mbbadge_' + pairKey);
    
    // Paused state
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'man-brick paused';
      return;
    }
    
    // Price + 24h
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
    
    // Compute bot suggestion
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    let suggestedSide = 'hold';
    let suggestedSideLabel = 'HOLD';
    if (prob > 0.55) { suggestedSide = 'bull'; suggestedSideLabel = '↑ LONG'; }
    else if (prob < 0.45) { suggestedSide = 'bear'; suggestedSideLabel = '↓ SHORT'; }
    
    // Manual position on this pair?
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    
    if (manualPos) {
      // Active manual position
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
      // Idle — show bot suggestion
      brick.className = 'man-brick';
      if (badgeEl) badgeEl.textContent = 'PRÉT';
      
      // Compute suggested stake + leverage based on conviction + ATR
      const atr = ps.atr || 0.01;
      const conviction = Math.abs(prob - 0.5) * 2;
      const baseStake = Math.max(10, Math.round((S.tradingAccount || 100) * 0.05));  // 5% default
      const suggStake = Math.min(baseStake * (1 + conviction), (S.tradingAccount || 100) * 0.15);
      
      if (sugEl) {
        const sideClass = suggestedSide;
        sugEl.innerHTML = `<span class="mb-suggest-side ${sideClass}">${suggestedSideLabel}</span> · mise $${suggStake.toFixed(0)}`;
      }
      
      if (pnlEl) {
        const convPct = (conviction * 100).toFixed(0);
        pnlEl.innerHTML = `<span style="font-size:9px;color:var(--t3);">Conviction ${convPct}%</span>`;
      }
    }
  });
}
window.updateManBricks = updateManBricks;
if(typeof updateManBricks==='function') window.updateManBricks = updateManBricks;

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
    
    // Prix (toujours affiché)
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24 = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }
    
    // État paused (priorité sur le reste)
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'pair-brick brick-paused';
      if (stEl) stEl.innerHTML = '<span style="color:var(--t3);">Sous-performance</span>';
      if (pnlEl) pnlEl.innerHTML = '<span class="pb-idle-pnl">Désactivée auto</span>';
      if (cdEl) cdEl.textContent = '';
      return;
    }
    
    // Find open position
    const pos = (S.openPositions || []).find(p => p.pair === pair);
    
    if (pos) {
      // ── Position active ──
      const sideLabel = pos.side === 'long' ? 'LONG' : 'SHORT';
      const sideArrow = pos.side === 'long' ? '↑' : '↓';
      const sideCol = pos.side === 'long' ? 'var(--up)' : 'var(--down)';
      const stakeStr = '$' + (pos.stakeUsdt || 0).toFixed(0);
      const pnlUsd = pos.pnlUsdt || 0;
      const pnlPct = pos.pnl || 0;
      const isWin = pnlUsd >= 0;
      
      // Classe d'état pour pulsation
      let stateCls = 'brick-idle';
      if (pos.side === 'long' && isWin)      stateCls = 'brick-long-win';
      else if (pos.side === 'long' && !isWin) stateCls = 'brick-long-loss';
      else if (pos.side === 'short' && isWin) stateCls = 'brick-short-win';
      else                                     stateCls = 'brick-short-loss';
      brick.className = 'pair-brick ' + stateCls;
      
      // Status
      if (stEl) {
        stEl.innerHTML = `<span class="pb-side" style="color:${sideCol};">${sideArrow}${sideLabel}</span><span class="pb-sep">·</span><span class="pb-stake">${stakeStr}</span>`;
      }
      
      // P&L
      if (pnlEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign = pnlUsd >= 0 ? '+' : '';
        pnlEl.innerHTML = `
          <span style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)}</span>
          <span class="pb-pnl-pct">${sign}${pnlPct.toFixed(2)}%</span>
        `;
      }
      
      // Countdown : temps écoulé + temps restant estimé
      if (cdEl) {
        const elapsedMs = Date.now() - (pos.openedAt || pos.entryTs || Date.now());
        const elapsedMin = Math.floor(elapsedMs / 60000);
        const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
        const elapsedStr = elapsedMin + ':' + String(elapsedSec).padStart(2, '0');
        
        const conv = pos.conviction || 0.4;
        const maxCycles = Math.ceil(8 / Math.max(0.1, conv));
        const cyclesUsed = pos._holdCycles || 0;
        const cyclesLeft = Math.max(0, maxCycles - cyclesUsed);
        const remainingMs = cyclesLeft * 160000;
        const remMin = Math.floor(remainingMs / 60000);
        
        cdEl.innerHTML = `⏱ ${elapsedStr} <span style="color:var(--t3);opacity:.5;">·</span> ~${remMin}m`;
      }
    } else {
      // ── En veille ──
      brick.className = 'pair-brick brick-idle';
      if (stEl) {
        stEl.innerHTML = '<span style="color:var(--t3);">En veille</span>';
      }
      if (pnlEl) {
        pnlEl.innerHTML = '<span class="pb-idle-pnl">Aucune position</span>';
      }
      if (cdEl) cdEl.textContent = '';
    }
    
    // ── Sparkline de fond (toutes briques) ──
    if (ps.candles && ps.candles.length >= 2) {
      const sparkColor = pos 
        ? (pos.pnlUsdt >= 0 
           ? (pos.side === 'long' ? '#00e87a' : '#ff3d6b')
           : '#f5c842')
        : cfg.color;
      _drawSparkline('pbspark_' + pairKey, ps.candles, sparkColor, pos ? pos.pnlUsdt >= 0 : true);
    }
    
    // ── Barre de progression TP (si position active) ──
    const tpBar = document.getElementById('pbtpbar_' + pairKey);
    const tpFill = document.getElementById('pbtpfill_' + pairKey);
    if (pos && tpBar && tpFill) {
      const pnlPct = pos.pnl || 0;
      // Estimate TP distance based on conviction (approx 2-4%)
      const conv = pos.conviction || 0.4;
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
if(typeof updatePairBricks==='function') window.updatePairBricks = updatePairBricks;

function validateInvestmentCapProvisioned(proposedStake) {
  if(!proposedStake || proposedStake <= 0) return { ok: true, cap: Infinity, mode: 'noop' };
  const engaged = (S.openPositions || []).reduce((s,p) => s + (p.stakeUsdt || 0), 0);
  const maxLossesOpen = engaged;  // worst-case: 100% loss per open position
  const borrowed = S.leverageBorrowed || 0;
  if(borrowed > 0) {
    // Mode levier actif: cap = levier emprunté − pertes max prévues
    const cap = Math.max(0, borrowed - maxLossesOpen);
    return { ok: proposedStake <= cap, cap, mode: 'leverage',
             engaged, maxLossesOpen, borrowed };
  }
  // Mode sans levier: cap = tradingAccount (courant) − sommes engagées
  const cap = Math.max(0, (S.tradingAccount || 0) - engaged);
  return { ok: proposedStake <= cap, cap, mode: 'no_leverage',
           engaged, tradingAccount: S.tradingAccount };
}
if(typeof validateInvestmentCapProvisioned==='function') window.validateInvestmentCapProvisioned = validateInvestmentCapProvisioned;

function validateTotalExposure(proposedStake, proposedLevBonus, proposedConviction) {
  // Capital total déjà engagé dans les positions ouvertes
  const alreadyStaked  = S.openPositions.reduce((s,p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  // Levier déjà emprunté
  const alreadyBorrowed= S.leverageBorrowed || 0;
  // Plafond total autorisé = trading disponible + levier max encore disponible
  const maxAllowed     = S.tradingAccount + (S.leverageReserve || 0);
  // Nouvel engagement proposé
  const newExposure    = (proposedStake || 0) + (proposedLevBonus || 0);
  // Vérification
  const totalAfter     = alreadyStaked + newExposure;
  if(totalAfter > maxAllowed * 1.02) {  // marge de 2% pour les arrondis
    const available = Math.max(0, maxAllowed - alreadyStaked);
    return { ok: false, available, maxAllowed, alreadyStaked, totalAfter };
  }
  
  // ═══ v7.12 · PRIORITÉ 1 · AUTO-LIMITE LEVIER INTELLIGENTE ═══
  // Le bot s'auto-limite à 80% pour garder 20% de marge de sécurité
  // Exception: si conviction > 0.75 (signal fort), il peut monter à 100%
  // Cette règle s'applique TOUJOURS (pas seulement en Plein régime)
  // Ainsi le bot apprend à garder de la marge même en mode normal
  const _convForCap = (typeof proposedConviction === 'number' && !isNaN(proposedConviction)) 
                      ? proposedConviction 
                      : 0.5;  // défaut prudent
  const _useFullCap = _convForCap > 0.75;  // signal très fort autorise 100%
  const _cap = _useFullCap ? 1.00 : 0.80;
  const leverageCap = maxAllowed * _cap;
  if (totalAfter > leverageCap) {
    const available = Math.max(0, leverageCap - alreadyStaked);
    return { ok: false, available, maxAllowed: leverageCap, alreadyStaked, totalAfter,
             autoCap: true, capLevel: _cap, convictionUsed: _convForCap };
  }
  // v7.1 PHASE 5 · Gate supplémentaire: règle sizing conforme spec utilisateur
  const _p5 = validateInvestmentCapProvisioned(proposedStake || 0);
  if(!_p5.ok) {
    return { ok: false, available: _p5.cap, maxAllowed, alreadyStaked, totalAfter,
             phase5: true, phase5Mode: _p5.mode, phase5Cap: _p5.cap };
  }
  return { ok: true, available: maxAllowed - alreadyStaked };
}
if(typeof validateTotalExposure==='function') window.validateTotalExposure = validateTotalExposure;

