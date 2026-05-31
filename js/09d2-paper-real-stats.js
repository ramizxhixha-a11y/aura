// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09d2-paper-real-stats.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// PaperReal stats — volatile pair, GARCH, adaptive consec loss,
// context signatures, memory source weights, sharpe alloc mult.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Prévision de volatilité : GARCH(1,1) simplifié sur les 20 dernières
// bougies. Retourne le ratio prévision/longue-durée et flag spike.
// Formule : forecast_var = omega + alpha*last_return² + beta*recent_var
//           avec omega = 0.1×longTermVar, alpha = 0.1, beta = 0.85
// ──────────────────────────────────────────────────────────────────────
function _forecastVolatility(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;

  // Récupération des bougies (priorité Binance WS si disponible)
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
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i-1]));
  }

  // Variance moyenne (sigma² long terme)
  const meanReturn  = returns.reduce((a, b) => a + b, 0) / returns.length;
  const longTermVar = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;

  // Variance récente (5 dernières bougies)
  const recentReturns = returns.slice(-5);
  const recentMean    = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const recentVar     = recentReturns.reduce((a, b) => a + (b - recentMean) ** 2, 0) / recentReturns.length;

  // GARCH(1,1) simplifié
  const omega        = 0.1 * longTermVar;
  const lastReturnSq = returns[returns.length - 1] ** 2;
  const forecastVar  = omega + 0.1 * lastReturnSq + 0.85 * recentVar;
  const forecastVol  = Math.sqrt(forecastVar);
  const longTermVol  = Math.sqrt(longTermVar);

  const ratio = longTermVol > 0 ? forecastVol / longTermVol : 1.0;

  return {
    longTermVolPct: +(longTermVol * 100).toFixed(3),
    forecastVolPct: +(forecastVol * 100).toFixed(3),
    ratio:          +ratio.toFixed(2),
    isSpike:        ratio > (S.paperRealConfig?.volatilitySpikeMultiplier || 1.8)
  };
}
window._forecastVolatility = _forecastVolatility;


// ──────────────────────────────────────────────────────────────────────
// Seuil adaptatif de pertes consécutives selon le win rate effectif
// Formule : seuil = 3 + (1 - wr) × 6, borné [3, 6]
//   wr=0.7 → 4  (joueur fort tolère moins de pertes)
//   wr=0.5 → 6  (joueur médian tolère plus avant pause)
//   wr=0.3 → 6  (joueur faible cappé)
// ──────────────────────────────────────────────────────────────────────
function _getAdaptiveConsecLossThreshold() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.adaptiveStopLosses) return cfg.maxConsecLosses || 3;

  const wr = _getEffectiveWR();
  if (wr === null) return cfg.maxConsecLosses || 3;

  let thresh = Math.round(3 + (1 - wr) * 6);
  thresh = Math.max(3, Math.min(6, thresh));

  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastConsecLossThresh = thresh;
  S.adaptiveState.lastEffectiveWR      = wr;
  return thresh;
}
window._getAdaptiveConsecLossThreshold = _getAdaptiveConsecLossThreshold;


// ──────────────────────────────────────────────────────────────────────
// Signature d'un contexte de trade : "régime · plage horaire · tier paire"
// Exemple : "bull · 14-18h · volatile"
// ──────────────────────────────────────────────────────────────────────
function _getContextSignature(regime, hour, pairTier) {
  const r = regime || 'unknown';
  const h = _getHourBucket(hour || 0);
  const t = pairTier || 'unknown';
  return r + '·' + h + '·' + t;
}
window._getContextSignature = _getContextSignature;


// ──────────────────────────────────────────────────────────────────────
// Statistiques par signature contextuelle : winrate + flag de refus
// Refus déclenché si trades >= minTrades ET wr < maxWR
// ──────────────────────────────────────────────────────────────────────
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

  const wr        = wins / total;
  const cfg       = S.paperRealConfig || {};
  const minTrades = cfg.contextRefusalMinTrades || 20;
  const maxWR     = cfg.contextRefusalMaxWR     || 0.30;
  const refused   = total >= minTrades && wr < maxWR;

  return { wr: wr, trades: total, refused: refused };
}
window._getContextStats = _getContextStats;


// ──────────────────────────────────────────────────────────────────────
// Poids d'une source de mémoire pour le transfer learning
// Le mode courant = poids plein. Les autres = pondération selon fiabilité.
// Une mémoire d'un mode "plus fiable" que le courant garde son poids plein.
// Une mémoire d'un mode "moins fiable" est dévaluée proportionnellement.
// ──────────────────────────────────────────────────────────────────────
function _getMemorySourceWeight(memoryMode, currentMode) {
  const cfg = S.paperRealConfig || {};

  // Sans transfert : on n'utilise QUE la mémoire du mode courant
  if (!cfg.transferLearningEnabled) {
    return memoryMode === currentMode ? 1.0 : 0.0;
  }

  // Même mode → poids plein
  if (memoryMode === currentMode) return 1.0;

  // Fiabilité décroissante : sim (simulation) < paperReal (prix réels papier) < real (vrai argent)
  const weights = {
    sim:       cfg.transferWeightSim       || 0.3,
    paperReal: cfg.transferWeightPaperReal || 0.7,
    real:      cfg.transferWeightReal      || 1.0
  };

  const memReliability = weights[memoryMode]  || 0.5;
  const curReliability = weights[currentMode] || 0.5;

  if (memReliability >= curReliability) {
    return 1.0;
  } else {
    return memReliability / curReliability;
  }
}
window._getMemorySourceWeight = _getMemorySourceWeight;


// ──────────────────────────────────────────────────────────────────────
// Agrégation des stats wins/losses sur tous les modes (sim/paperReal/real)
// Utilisé par _combineMultiModeStats pour le transfer learning.
// ──────────────────────────────────────────────────────────────────────
function _getMultiModeMemoryStats() {
  const stats = {
    sim:       { wins: 0, losses: 0 },
    paperReal: { wins: 0, losses: 0 },
    real:      { wins: 0, losses: 0 }
  };

  // Mode sim : depuis agentLessons (mémoire inter-agents)
  if (Array.isArray(S.agentLessons)) {
    S.agentLessons.forEach(l => {
      if (l && typeof l.outcome === 'number') {
        if      (l.outcome > 0) stats.sim.wins++;
        else if (l.outcome < 0) stats.sim.losses++;
      }
    });
  }

  // Mode paperReal : depuis paperRealStats (à compléter selon structure réelle)
  // La structure de paperRealStats varie ; agrégation à implémenter quand
  // le format sera stabilisé.

  // Mode real : depuis realStatsByPair (existant)
  if (S.realStatsByPair) {
    Object.values(S.realStatsByPair).forEach(s => {
      stats.real.wins   += (s.wins   || 0);
      stats.real.losses += (s.losses || 0);
    });
  }

  return stats;
}
window._getMultiModeMemoryStats = _getMultiModeMemoryStats;


// ──────────────────────────────────────────────────────────────────────
// Extraction du tier de paire (calm/mid/volatile) depuis un contexte stocké
// ──────────────────────────────────────────────────────────────────────
function _getPairTierFromContext(ctx) {
  if (!ctx) return 'unknown';
  const ratio = ctx.pairRelRatio;
  if (ratio === null || ratio === undefined) return 'unknown';
  if (ratio < 0.7) return 'calm';
  if (ratio < 1.4) return 'mid';
  return 'volatile';
}
window._getPairTierFromContext = _getPairTierFromContext;


// ──────────────────────────────────────────────────────────────────────
// Multiplicateur d'allocation Sharpe pour une paire
// ──────────────────────────────────────────────────────────────────────
function _getSharpeAllocMult(pair) {
  const allocs = _computeSharpeAllocations();
  return allocs[pair] || 1.0;
}
window._getSharpeAllocMult = _getSharpeAllocMult;
