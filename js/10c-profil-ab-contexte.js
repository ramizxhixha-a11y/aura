// ▓▓▓ VERSION 20260809k ▓▓▓
// 10c-profil-ab-contexte.js — Profil adaptatif par paire, A/B testing, contexte de trade, rotation des périodes
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 443-702 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.


// ── 1 fonctions v91 récupérées via v69 (fallback NULL) ──

function _getPairAdaptiveProfile(pair) {
  const cfg = S.paperRealConfig || {};
  const baseStakePct = cfg.maxStakePct || 5.0;
  const slAtrMult = cfg.slAtrMultiplier || 2.0;
  
  const volResult = _computeVolatilityScore(pair);
  if (!volResult || volResult.score === null) {
    return {
      stakePct: baseStakePct * 0.6,
      slAtrMultiplier: slAtrMult,
      slAbsoluteAtr: null,
      score: null,
      relRatio: null,
      perfMult: 1.0
    };
  }
  
  const median = _getMarketVolatilityMedian();
  const ratio = volResult.score / median;
  
  let adaptedStakePct = baseStakePct / Math.max(0.5, ratio);
  adaptedStakePct = Math.min(baseStakePct, adaptedStakePct);
  adaptedStakePct = Math.max(0.5, adaptedStakePct);
  
  const perfMult = _getPairPerformanceMultiplier(pair);
  adaptedStakePct *= perfMult;
  
  let bonusMult = 1.0;
  if (typeof _getPairBonusMultiplier === 'function') {
    bonusMult = _getPairBonusMultiplier(pair);
    adaptedStakePct *= bonusMult;
  }
  
  return {
    stakePct: adaptedStakePct,
    slAtrMultiplier: slAtrMult,
    slAbsoluteAtr: volResult.atrAbs,
    score: volResult.score,
    relRatio: ratio,
    perfMult: perfMult,
    bonusMult: bonusMult,
    median: median
  };
}
window._getPairAdaptiveProfile = _getPairAdaptiveProfile;
if(typeof _getPairAdaptiveProfile==='function') window._getPairAdaptiveProfile = _getPairAdaptiveProfile;

// ── 83 fonctions depuis v69 ──

function _abAssignArm() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.abTestingEnabled) return 'A';
  if (!S.abTesting) return 'A';
  const arm = S.abTesting.nextAssign || 'A';
  S.abTesting.nextAssign = (arm === 'A') ? 'B' : 'A';
  return arm;
}
window._abAssignArm = _abAssignArm;
if(typeof _abAssignArm==='function') window._abAssignArm = _abAssignArm;

function _abComputeVerdict() {
  if (!S.abTesting) return;
  const A = S.abTesting.armA;
  const B = S.abTesting.armB;
  
  const wrA = A.trades > 0 ? A.wins / A.trades : 0;
  const wrB = B.trades > 0 ? B.wins / B.trades : 0;
  const totalPnl = Math.abs(A.pnl) + Math.abs(B.pnl) || 1;
  const pnlScoreA = (A.pnl + Math.abs(Math.min(A.pnl, B.pnl))) / totalPnl;
  const pnlScoreB = (B.pnl + Math.abs(Math.min(A.pnl, B.pnl))) / totalPnl;
  const scoreA = 0.6 * wrA + 0.4 * pnlScoreA;
  const scoreB = 0.6 * wrB + 0.4 * pnlScoreB;
  
  const aWins = scoreA >= scoreB;
  const winner = aWins ? 'A' : 'B';
  const winnerArm = aWins ? A : B;
  
  const newRefParams = JSON.parse(JSON.stringify(winnerArm.params));
  
  const cfg = S.paperRealConfig || {};
  const strength = cfg.abTestingMutationStrength || 0.3;
  const newChallengerParams = {
    slAtrMult: _mutateValue(newRefParams.slAtrMult, strength, 1.0, 4.0),
    tpAtrMult: _mutateValue(newRefParams.tpAtrMult, strength, 0.8, 3.0),
    stakeFactor: _mutateValue(newRefParams.stakeFactor, strength * 0.5, 0.6, 1.4)
  };
  
  const verdict = {
    ts: Date.now(),
    generation: (S.abTesting.generation || 0) + 1,
    winner: winner,
    winnerScore: aWins ? +scoreA.toFixed(3) : +scoreB.toFixed(3),
    winnerWR: aWins ? +(wrA * 100).toFixed(1) : +(wrB * 100).toFixed(1),
    winnerPnl: aWins ? +A.pnl.toFixed(2) : +B.pnl.toFixed(2),
    loserScore: aWins ? +scoreB.toFixed(3) : +scoreA.toFixed(3),
    loserWR: aWins ? +(wrB * 100).toFixed(1) : +(wrA * 100).toFixed(1),
    loserPnl: aWins ? +B.pnl.toFixed(2) : +A.pnl.toFixed(2),
    newParams: JSON.parse(JSON.stringify(newRefParams)),
    newChallenger: JSON.parse(JSON.stringify(newChallengerParams))
  };
  
  S.abTesting.armA = { params: newRefParams, trades: 0, wins: 0, losses: 0, pnl: 0, label: 'A (référence)' };
  S.abTesting.armB = { params: newChallengerParams, trades: 0, wins: 0, losses: 0, pnl: 0, label: 'B (challenger)' };
  S.abTesting.generation = (S.abTesting.generation || 0) + 1;
  S.abTesting.lastVerdict = verdict;
  if (!S.abTesting.history) S.abTesting.history = [];
  S.abTesting.history.push(verdict);
  if (S.abTesting.history.length > 20) S.abTesting.history.shift();
  
  try {
    if (!S.chainLog) S.chainLog = [];
    S.chainLog.push({
      icon: '🧬',
      desc: 'A/B testing · Génération ' + verdict.generation + ' · Gagnant ' + winner + ' (' + verdict.winnerWR + '% WR · $' + verdict.winnerPnl + ')',
      hash: typeof rndHash==='function' ? rndHash() : '',
      time: typeof nowStr==='function' ? nowStr() : ''
    });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  
  try {
    if (typeof showToast === 'function') {
      showToast('🧬 A/B Gen ' + verdict.generation + ' · ' + winner + ' gagne (' + verdict.winnerWR + '%)', 5000, 'win');
    }
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
}
window._abComputeVerdict = _abComputeVerdict;
if(typeof _abComputeVerdict==='function') window._abComputeVerdict = _abComputeVerdict;

function _abGetParams(arm) {
  if (!S.abTesting) return null;
  if (arm === 'B' && S.abTesting.armB && S.abTesting.armB.params) {
    return S.abTesting.armB.params;
  }
  return (S.abTesting.armA && S.abTesting.armA.params) ? S.abTesting.armA.params : null;
}
window._abGetParams = _abGetParams;
if(typeof _abGetParams==='function') window._abGetParams = _abGetParams;

function _addTradeContextToMemory(ctx) {
  if (!ctx) return;
  if (!S.tradeContextMemory) S.tradeContextMemory = [];
  S.tradeContextMemory.push(ctx);
  if (S.tradeContextMemory.length > 500) {
    S.tradeContextMemory.shift();
  }
}
window._addTradeContextToMemory = _addTradeContextToMemory;
if(typeof _addTradeContextToMemory==='function') window._addTradeContextToMemory = _addTradeContextToMemory;

function _cancelForceClose() {
  _pendingClosePair = null;
  const overlay = document.getElementById('closeConfirmOverlay');
  if (overlay) overlay.classList.remove('open');
}
window._cancelForceClose = _cancelForceClose;
if(typeof _cancelForceClose==='function') window._cancelForceClose = _cancelForceClose;

function _captureTradeContext(pair, side, stakeUsdt) {
  if (S.tradingMode !== 'paperReal') return null;
  
  const now = Date.now();
  const date = new Date(now);
  
  const ctx = {
    contextId: 'ctx_' + now + '_' + Math.random().toString(36).slice(2, 8),
    pair: pair,
    side: side,
    stakeUsdt: stakeUsdt,
    openedAt: now,
    closedAt: null,
    pnlPct: null,
    pnlUsd: null,
    holdMinutes: null,
    won: null,
    hour: date.getHours(),
    dayOfWeek: date.getDay(),
    regime: (typeof detectMarketRegime === 'function') ? detectMarketRegime() : null,
    marketVolatilityMedian: (typeof _getMarketVolatilityMedian === 'function') ? _getMarketVolatilityMedian() : null,
    pairVolatility: null,
    pairRelRatio: null,
    pairPerfMult: 1.0,
    pairBonusMult: 1.0,
    indicators: _computeIndicatorsForContext(pair),
    topAgents: []
  };
  
  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile) {
      ctx.pairVolatility = profile.score;
      ctx.pairRelRatio = profile.relRatio;
      ctx.pairPerfMult = profile.perfMult || 1.0;
      ctx.pairBonusMult = profile.bonusMult || 1.0;
    }
  }
  
  try {
    if (S.agents) {
      ctx.topAgents = [...S.agents]
        .filter(a => !a.isBot && !a.isMeta && Math.abs(a.score || 0) > 0.05)
        .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0))
        .slice(0, 5)
        .map(a => ({
          name: (a.name || '').split(' ')[0].slice(0, 20),
          score: +(a.score || 0).toFixed(2),
          fitness: a.fitness || 0
        }));
    }
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  
  return ctx;
}
window._captureTradeContext = _captureTradeContext;
if(typeof _captureTradeContext==='function') window._captureTradeContext = _captureTradeContext;

function _checkAndRotatePeriods() {
  if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
  if (!S.pnlPeriod.history) S.pnlPeriod.history = [];
  
  const todayKey = _getTodayKey();
  const weekKey = _getWeekKey();
  const monthKey = _getMonthKey();
  const currentPortfolio = S.portfolio || 0;
  
  if (S.pnlPeriod.todayDate !== todayKey) {
    if (S.pnlPeriod.todayDate && S.pnlPeriod.todayStartPortfolio !== null) {
      const startVal = S.pnlPeriod.todayStartPortfolio;
      const pnlUsd = currentPortfolio - startVal;
      const pnlPct = startVal > 0 ? (pnlUsd / startVal) * 100 : 0;
      S.pnlPeriod.history.push({
        date: S.pnlPeriod.todayDate,
        start: +startVal.toFixed(2),
        end: +currentPortfolio.toFixed(2),
        pnlUsd: +pnlUsd.toFixed(2),
        pnlPct: +pnlPct.toFixed(2)
      });
      if (S.pnlPeriod.history.length > 90) {
        S.pnlPeriod.history = S.pnlPeriod.history.slice(-90);
      }
    }
    S.pnlPeriod.todayDate = todayKey;
    S.pnlPeriod.todayStartPortfolio = currentPortfolio;
  }
  
  if (S.pnlPeriod.weekStart !== weekKey) {
    S.pnlPeriod.weekStart = weekKey;
    S.pnlPeriod.weekStartPortfolio = currentPortfolio;
  }
  
  if (S.pnlPeriod.monthStart !== monthKey) {
    S.pnlPeriod.monthStart = monthKey;
    S.pnlPeriod.monthStartPortfolio = currentPortfolio;
  }
}
window._checkAndRotatePeriods = _checkAndRotatePeriods;
if(typeof _checkAndRotatePeriods==='function') window._checkAndRotatePeriods = _checkAndRotatePeriods;