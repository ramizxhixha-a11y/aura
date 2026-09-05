// ▓▓▓ VERSION 20260905b ▓▓▓
// 10e-helpers-adaptatifs.js — Seuils adaptatifs, multiplicateurs de vote, WR effectif, clés temporelles, corrélations, netwatch, trade MAN, watchdogs P4/P5
// [P1 · 05/09/2026] BRIQUE 1 DU PONT ANALYTICS→DÉCISION : _getPairCorrelation réparée
// (source unique = Pearson des log-retours, cache 5 min au format prévu par 02 et lu par 04)
// + _corrGateForOpen (anti-doublon > 0.80 / bonus de diversification < −0.80).
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 1152-1515 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.


function _getAdaptiveThreshold() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return 3000;
    const type = c.effectiveType;
    const downlink = c.downlink || 10;
    if (c.type === 'wifi') return 2000;
    if (type === '4g' && downlink >= 10) return 3000;
    if (type === '4g') return 4000;
    if (type === '3g') return 6000;
    return 5000;
  } catch(e) {
    return 3000;
  }
}
if(typeof _getAdaptiveThreshold==='function') window._getAdaptiveThreshold = _getAdaptiveThreshold;

function _getAgentVoteMultiplier(agentName) {
  const cfg = S.paperRealConfig || {};
  if (!cfg.agentVotingAdaptive) return 1.0;
  if (!S.tradeContextMemory) return 1.0;
  
  let wins = 0, losses = 0;
  for (const c of S.tradeContextMemory) {
    if (c.closedAt === null) continue;
    if (!c.topAgents || c.topAgents.length === 0) continue;
    const found = c.topAgents.find(a => (a.name || '').startsWith(agentName.slice(0, 20)));
    if (!found) continue;
    if (c.won) wins++; else losses++;
  }
  const total = wins + losses;
  if (total < 5) return 1.0;
  const wr = wins / total;
  const boostMax = cfg.agentVoteBoostMax || 1.6;
  const reduceMin = cfg.agentVoteReduceMin || 0.4;
  let mult = 1.0 + (wr - 0.5) * 1.5;
  mult = Math.max(reduceMin, Math.min(boostMax, mult));
  return mult;
}
window._getAgentVoteMultiplier = _getAgentVoteMultiplier;
if(typeof _getAgentVoteMultiplier==='function') window._getAgentVoteMultiplier = _getAgentVoteMultiplier;

function _getEffectiveWR() {
  const stats = S.paperRealStats || {};
  let wins = 0, losses = 0;
  Object.values(stats).forEach(s => {
    wins += (s.wins || 0);
    losses += (s.losses || 0);
  });
  const total = wins + losses;
  if (total < 10) return null;
  return wins / total;
}
window._getEffectiveWR = _getEffectiveWR;
if(typeof _getEffectiveWR==='function') window._getEffectiveWR = _getEffectiveWR;

function _getHourBucket(hour) {
  if (hour >= 0 && hour < 6) return 'night';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
if(typeof _getHourBucket==='function') window._getHourBucket = _getHourBucket;

function _getMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
if(typeof _getMonthKey==='function') window._getMonthKey = _getMonthKey;

function _getNetwatchThreshold() {
  return _getAdaptiveThreshold();
}
window._getNetwatchThreshold = _getNetwatchThreshold;
if(typeof _getNetwatchThreshold==='function') window._getNetwatchThreshold = _getNetwatchThreshold;

// ══════════════════════════════════════════════════════════════════════════
// [P1 · 05/09/2026] CORRÉLATION DE DÉCISION — SOURCE UNIQUE
// L'ancienne _getPairCorrelation lisait _computeCorrelationMatrix() (05), qui renvoie
// { matrix, pairs, hasTrades } avec une matrice IMBRIQUÉE matrix[p1][p2] fondée sur le
// P&L des trades par tranche de 6 h : la clé plate 'A|B' n'y existait pas → null à
// CHAQUE appel depuis la reconstruction. Trois consommateurs étaient morts sans le
// savoir : la trace « corr max » (09c), la garde EV _checkCorrelationLimit (09d1) et
// le bot Stat·Arb (03). Le panneau 04 affichait « Pas encore de matrice » à vie.
// Désormais : Pearson des LOG-RETOURS des 30 dernières bougies (réelles Binance sur la
// timeframe active si disponibles, sinon bougies de la paire — _getPairReturns), calculé
// pour tout l'univers PAIRS en un passage, mis en cache 5 min dans
// S.adaptiveState.correlationMatrix (clé 'A|B' triée + correlationMatrixTs/Tf) — le
// format prévu par 02 (v8.0 phase 6a) et lu par le panneau 04. Le P&L par tranche de
// 6 h (05) reste l'affichage Outils : il mesure la co-variation des RÉSULTATS, pas des
// marchés — sur le backup, DOGE/AVAX y valait −0.97 quand les prix valaient +0.97.
// Ce que mesure le retour des prix, c'est « le même pari » : c'est lui qui décide.
// ══════════════════════════════════════════════════════════════════════════
const CORR_CACHE_TTL_MS = 5 * 60 * 1000;

function _refreshCorrelationMatrix() {
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (!S.adaptiveState) S.adaptiveState = {};
  const a = S.adaptiveState;
  const now = Date.now();
  if (a.correlationMatrix && a.correlationMatrixTs && a.correlationMatrixTf === tf &&
      (now - a.correlationMatrixTs) < CORR_CACHE_TTL_MS) {
    return a.correlationMatrix;
  }
  const pairs = Object.keys(PAIRS || {});
  const rets = {};
  pairs.forEach(p => { rets[p] = _getPairReturns(p); });
  const m = {};
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const ra = rets[pairs[i]], rb = rets[pairs[j]];
      if (!ra || !rb) continue;
      const c = _pearsonCorrelation(ra, rb);
      if (c === null) continue;
      const key = (pairs[i] < pairs[j]) ? pairs[i] + '|' + pairs[j] : pairs[j] + '|' + pairs[i];
      m[key] = Math.round(c * 1000) / 1000;
    }
  }
  a.correlationMatrix   = m;
  a.correlationMatrixTs = now;
  a.correlationMatrixTf = tf;
  return m;
}
window._refreshCorrelationMatrix = _refreshCorrelationMatrix;

function _getPairCorrelation(pairA, pairB) {
  if (pairA === pairB) return 1.0;
  const matrix = _refreshCorrelationMatrix();
  const key = (pairA < pairB) ? pairA + '|' + pairB : pairB + '|' + pairA;
  return (typeof matrix[key] === 'number') ? matrix[key] : null;
}
window._getPairCorrelation = _getPairCorrelation;

// ══════════════════════════════════════════════════════════════════════════
// [P1 · 05/09/2026] BRIQUE 1 DU PONT — ANTI-DOUBLON + BONUS DE DIVERSIFICATION
// Corrélation EFFECTIVE entre le pari candidat (pair, side) et chaque position ouverte
// (bot ou manuelle : le livre est le livre) = Pearson des retours × (même sens ? +1 : −1).
//   > +0.80 → c'est le même pari deux fois (LONG SOL + LONG AVAX à 0.93, ou LONG DOGE +
//             SHORT AVAX à −0.97) → veto, appliqué dans l'entonnoir unique 09c.
//   < −0.80 → le pari diversifie le livre (LONG DOGE + LONG AVAX à −0.97, ou LONG SOL +
//             SHORT AVAX à 0.93) → conviction requise abaissée de 0.03 dans les portes 10f.
// Le veto prime sur le bonus. Paire sans corrélation mesurable (bougies insuffisantes)
// = neutre. Brique autonome : ses deux seuls appels sont en 09c (veto) et 10f (bonus).
// ══════════════════════════════════════════════════════════════════════════
const CORR_DOUBLON_MIN     = 0.80;
const CORR_DIVERSIFY_BONUS = 0.03;

function _isLongSide(side) {
  const s = String(side || '').toLowerCase();
  return s.indexOf('long') === 0 || s === 'buy';
}

function _corrGateForOpen(pair, side) {
  const out = { veto: false, bonus: 0, corr: null, eff: null, withPair: null, withSide: null };
  const positions = S.openPositions || [];
  if (!positions.length) return out;
  const wantLong = _isLongSide(side);
  let maxEff = null, maxRef = null, minEff = null, minRef = null;
  positions.forEach(op => {
    if (!op || !op.pair || op.pair === pair) return;
    const c = _getPairCorrelation(pair, op.pair);
    if (typeof c !== 'number') return;
    const eff = (_isLongSide(op.side) === wantLong) ? c : -c;
    if (maxEff === null || eff > maxEff) { maxEff = eff; maxRef = { c, op }; }
    if (minEff === null || eff < minEff) { minEff = eff; minRef = { c, op }; }
  });
  if (maxEff !== null && maxEff > CORR_DOUBLON_MIN) {
    out.veto = true; out.eff = maxEff; out.corr = maxRef.c; out.withPair = maxRef.op.pair; out.withSide = maxRef.op.side;
    return out;
  }
  if (minEff !== null && minEff < -CORR_DOUBLON_MIN) {
    out.bonus = CORR_DIVERSIFY_BONUS; out.eff = minEff; out.corr = minRef.c; out.withPair = minRef.op.pair; out.withSide = minRef.op.side;
  }
  return out;
}
window._corrGateForOpen = _corrGateForOpen;

function _getPairReturns(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 30) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 30) {
    candles = ps.candles;
  }
  if (!candles || candles.length < 30) return null;
  const closes = candles.slice(-30).map(c => c.c).filter(c => isFinite(c) && c > 0);
  if (closes.length < 30) return null;
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i-1]));
  }
  return returns;
}
if(typeof _getPairReturns==='function') window._getPairReturns = _getPairReturns;

function _getTodayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
if(typeof _getTodayKey==='function') window._getTodayKey = _getTodayKey;

function _getWeekKey() {
  const d = new Date();
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((d - start) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return year + '-W' + String(week).padStart(2, '0');
}
if(typeof _getWeekKey==='function') window._getWeekKey = _getWeekKey;

function _giveBackToBot(pair) {
  if (S._manualPairs) delete S._manualPairs[pair];
  S.chainLog.push({ icon: '🤖', desc: `Contrôle rendu au bot · ${pair}`, hash: rndHash(), time: nowStr() });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  if (typeof showToast === 'function') { showToast('🤖 Bot réactivé · ' + pair, 2500); }
  if (_currentDetailPair === pair) { closePairDetail(); setTimeout(() => openPairDetail(pair), 100); }
}
window._giveBackToBot = _giveBackToBot;
if(typeof _giveBackToBot==='function') window._giveBackToBot = _giveBackToBot;

function _initNetIndicator() {
  try { _updateNetIndicator(); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
}
if(typeof _initNetIndicator==='function') window._initNetIndicator = _initNetIndicator;

// v123 : la fonction _installPackContinuite a été supprimée d'ici.
// Elle n'était jamais appelée (confirmé par multi-search sur tout le repo).
// Les hooks de continuité (pagehide/freeze/beforeunload/visibilitychange)
// sont désormais dans 09b2-save-load.js v123, avec écriture SYNCHRONE
// (vs async ici qui ne finissait pas avant que le browser gèle).

function _isPairManual(pair) {
  return !!(S._manualPairs && S._manualPairs[pair]);
}
window._isPairManual = _isPairManual;
if(typeof _isPairManual==='function') window._isPairManual = _isPairManual;

function _isPairPaused(pair) {
  return !!(S._pausedPairs && S._pausedPairs[pair]);
}
window._isPairPaused = _isPairPaused;
if(typeof _isPairPaused==='function') window._isPairPaused = _isPairPaused;

function _maybeAskNotifPermission() { /* désactivé · Q3 */ }
if(typeof _maybeAskNotifPermission==='function') window._maybeAskNotifPermission = _maybeAskNotifPermission;

function _maybeAutoExport() { /* désactivé · Q1:B */ }
if(typeof _maybeAutoExport==='function') window._maybeAutoExport = _maybeAutoExport;

function _mutateValue(value, strength, min, max) {
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
  const delta = value * strength * gaussian * 0.5;
  let mutated = value + delta;
  mutated = Math.max(min, Math.min(max, mutated));
  return +mutated.toFixed(3);
}
window._mutateValue = _mutateValue;
if(typeof _mutateValue==='function') window._mutateValue = _mutateValue;

function _netwatchTick() {
  const now = Date.now();
  const elapsed = now - _lastRealPriceTs;
  
  if (_netwatchState === 'online' && elapsed > _getNetwatchThreshold()) {
    _netwatchState = 'offline';
    _netOfflineSinceTs = now;
    _freshPricesInRow = 0;
    _updateNetIndicator();
    
    if (_simRunning && typeof _simRunning !== 'undefined') {
      _netwatchPausedBot = true;
      S._netPaused = true;
    }
  }
  
  if (_netwatchState === 'offline' && !S._netToastShown && elapsed > _getNetwatchThreshold() * 2) {
    S._netToastShown = true;
    S.chainLog.push({ icon: '🔴', desc: 'Coupure connexion détectée · bot en pause (ouverture bloquée, SL/TP actif)', hash: rndHash(), time: nowStr() });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    if (typeof showToast === 'function') { showToast('Connexion instable · bot en pause', 3000, 'user'); }
  }
  if (_netwatchState === 'online') S._netToastShown = false;
  
  if (_netwatchState === 'offline' && !_net10sSaveTriggered && elapsed > _getNetwatchThreshold() * 3) {
    _net10sSaveTriggered = true;
    try {
      if (typeof saveState === 'function') saveState(true);
      S.chainLog.push({ icon: '💾', desc: 'Coupure > 10s · sauvegarde forcée', hash: rndHash(), time: nowStr() });
    } catch(e) { console.warn('netwatch 10s save failed:', e); }
  }
  
  if (_netwatchState === 'online') _updateNetIndicator();
}
if(typeof _netwatchTick==='function') window._netwatchTick = _netwatchTick;

function _notifIfRare() { /* désactivé · Q3 */ }
if(typeof _notifIfRare==='function') window._notifIfRare = _notifIfRare;

function _openManTrade(pair, side) {
  const pairKey = pair.replace('/','_');
  const stake = parseFloat(document.getElementById('manIn_stake_' + pairKey)?.value) || 10;
  const lev = parseInt(document.getElementById('manIn_lev_' + pairKey)?.value) || 1;
  const tp = parseFloat(document.getElementById('manIn_tp_' + pairKey)?.value) || null;
  const sl = parseFloat(document.getElementById('manIn_sl_' + pairKey)?.value) || null;
  
  const ps = S.pairStates[pair];
  if (!ps) { if (typeof showToast === 'function') showToast('⚠ Paire invalide'); return; }
  
  ps.stake = stake;
  ps.pairLeverage = lev;
  
  if (typeof openPosition === 'function') {
    try {
      openPosition(pair, side);
      setTimeout(() => {
        const newPos = S.openPositions.find(p => p.pair === pair && p.auto !== true);
        if (newPos) {
          if (tp && tp > 0) newPos.tp = tp;
          if (sl && sl > 0) newPos.sl = sl;
          newPos._manOpenedAt = Date.now();
          newPos._manMaxLossPct = S._manConsignes?.[pair]?.maxLossPct || 2.0;
          newPos._manTimeoutMin = S._manConsignes?.[pair]?.timeoutMin || 60;
        }
      }, 50);
      
      S.chainLog.push({ icon: '🎛️', desc: `Trade MANUEL ${pair} ${side.toUpperCase()} · mise $${stake} · levier ×${lev}`, hash: rndHash(), time: nowStr() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') { showToast('🎛️ ' + pair + ' ' + side.toUpperCase() + ' ouvert · $' + stake, 2500); }
      closePairDetail();
    } catch(e) { console.warn('manual open:', e); }
  }
}
window._openManTrade = _openManTrade;
if(typeof _openManTrade==='function') window._openManTrade = _openManTrade;

function _p4AntiDetteWatchdog() {
  if (typeof S === 'undefined' || !S) return;
  
  const leverage = S.leverage || 0;
  const debtAuto = S._autoLevBorrowed || 0;
  const debtTotal = S.leverageBorrowed || 0;
  const trading  = S.tradingAccount || 0;
  
  const debtInPositions = (S.openPositions || []).reduce((s, p) => s + (p.levBorrowed || 0), 0);
  const orphanDebt = Math.max(0, debtTotal - debtInPositions);
  
  if (leverage === 0 && orphanDebt > 0 && trading > 0) {
    const committedInPositions = (S.openPositions || []).reduce((s, p) => s + (p.stakeUsdt || 0), 0);
    const freeInTrading = Math.max(0, trading - committedInPositions);
    const repay = Math.min(orphanDebt, freeInTrading);
    
    if (repay > 0) {
      S.tradingAccount   = Math.max(0, trading - repay);
      S.leverageBorrowed = Math.max(0, debtTotal - repay);
      S._autoLevBorrowed = Math.max(0, debtAuto - repay);
      S.portfolio        = (S.cashAccount || 0) + (S.tradingAccount || 0);
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      S.chainLog.push({ icon: '🔧', desc: `P12 Watchdog · remboursement dette orpheline $${repay.toFixed(2)} (reste $${(S.leverageBorrowed||0).toFixed(2)})`, hash: (typeof rndHash === 'function' ? rndHash() : Math.random().toString(36).slice(2,10)), time: (typeof nowStr === 'function' ? nowStr() : new Date().toLocaleTimeString()) });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  }
  
  if ((S.openPositions || []).length === 0 && debtTotal > 0 && trading > 0) {
    const repay = Math.min(debtTotal, trading);
    if (repay > 0) {
      S.tradingAccount   = Math.max(0, trading - repay);
      S.leverageBorrowed = Math.max(0, debtTotal - repay);
      S._autoLevBorrowed = Math.max(0, debtAuto - repay);
      S.portfolio        = (S.cashAccount || 0) + (S.tradingAccount || 0);
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      S.chainLog.push({ icon: '🔧', desc: `P12 · Aucune position ouverte · remboursement total $${repay.toFixed(2)}`, hash: rndHash(), time: nowStr() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
  }
}
if(typeof _p4AntiDetteWatchdog==='function') window._p4AntiDetteWatchdog = _p4AntiDetteWatchdog;

function _p5InvariantCheck() {
  if (typeof S === 'undefined' || !S) return;
  
  const posLevSum = (S.openPositions || []).reduce((s, p) => s + (p.levBorrowed || 0), 0);
  const totalBorrow = S.leverageBorrowed || 0;
  const autoBorrow = S._autoLevBorrowed || 0;
  
  if ((S.leverage || 0) === 0 && autoBorrow > 0 && posLevSum === 0) {
    if (!S._p5LastWarn || Date.now() - S._p5LastWarn > 5 * 60 * 1000) {
      S._p5LastWarn = Date.now();
      console.warn('[P5 INVARIANT] Dette orpheline détectée: $' + autoBorrow.toFixed(2) + ' sans position · P4 sera déclenché');
    }
    _p4AntiDetteWatchdog();
  }
  
  if (totalBorrow < posLevSum - 0.01) {
    console.error('[P5 INVARIANT] leverageBorrowed (' + totalBorrow.toFixed(2) + ') < somme pos.levBorrowed (' + posLevSum.toFixed(2) + ')');
    S.leverageBorrowed = posLevSum;
  }
}
if(typeof _p5InvariantCheck==='function') window._p5InvariantCheck = _p5InvariantCheck;

function _pearsonCorrelation(returnsA, returnsB) {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < 10) return null;
  const a = returnsA.slice(-n);
  const b = returnsB.slice(-n);
  const meanA = a.reduce((x,y) => x+y, 0) / n;
  const meanB = b.reduce((x,y) => x+y, 0) / n;
  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    num += dA * dB;
    denomA += dA * dA;
    denomB += dB * dB;
  }
  const denom = Math.sqrt(denomA * denomB);
  if (denom === 0) return null;
  return num / denom;
}
if(typeof _pearsonCorrelation==='function') window._pearsonCorrelation = _pearsonCorrelation;

function _pulseSettingsBtn() {
  const btn = document.getElementById('settingsBtn');
  if (!btn) return;
  btn.classList.add('nexus-save-pulse');
  if (_settingsPulseTimer) clearTimeout(_settingsPulseTimer);
  _settingsPulseTimer = setTimeout(() => {
    btn.classList.remove('nexus-save-pulse');
    _settingsPulseTimer = null;
  }, 2000);
}
if(typeof _pulseSettingsBtn==='function') window._pulseSettingsBtn = _pulseSettingsBtn;

function _recomputeAllAgentBoosts() {
  if (!S.agents) return;
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastAgentBoosts = {};
  S.agents.forEach(a => {
    if (a.isBot || a.isMeta) return;
    const name = (a.name || '').split(' ')[0].slice(0, 20);
    if (!name) return;
    const mult = _getAgentVoteMultiplier(name);
    if (mult !== 1.0) { S.adaptiveState.lastAgentBoosts[name] = mult; }
  });
}
window._recomputeAllAgentBoosts = _recomputeAllAgentBoosts;
if(typeof _recomputeAllAgentBoosts==='function') window._recomputeAllAgentBoosts = _recomputeAllAgentBoosts;

function _requestNotifPermission() { return Promise.resolve(false); }
if(typeof _requestNotifPermission==='function') window._requestNotifPermission = _requestNotifPermission;