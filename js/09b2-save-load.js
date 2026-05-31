// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b2-save-load.js · VERSION 121 · 21/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// saveState + loadState — écriture/lecture IndexedDB + localStorage.
//
// v121 — Refonte complète :
//   • saveState : put avec CLÉ EXPLICITE (RT.SAVE_KEY) — sans cela, IDB
//     échoue silencieusement (store sans keyPath).
//   • loadState : try/catch global + par section, accepte cycle=0 valide,
//     ne bloque plus sur version absente, appel renderAll() à la fin,
//     bannière debug visuelle visible à l'écran (pas besoin de console).
//
// Override v120.5 dans 00b-persistance-override.js prend le relais après.
//
// Dépend de 09a-runtime-state.js (window.RT + window.openDB).
// ════════════════════════════════════════════════════════════════════════


// ── Bannière debug visuelle ─────────────────────────────────────────────
// Affiche un toast en haut de l'écran avec le résultat de loadState.
// Disparaît après 15 secondes. Tap dessus pour fermer.
function _showLoadDebug(msg, bgColor) {
  try {
    const inject = () => {
      let el = document.getElementById('_loadDebug');
      if (el) el.remove();
      el = document.createElement('div');
      el.id = '_loadDebug';
      el.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0',
        'z-index:999999', 'padding:10px 14px',
        'font:bold 11px ui-monospace,monospace',
        'text-align:center', 'color:#fff', 'cursor:pointer',
        'line-height:1.4', 'white-space:pre-wrap', 'word-break:break-all'
      ].join(';');
      el.style.background = bgColor || '#1d3756';
      el.textContent = msg;
      el.onclick = () => el.remove();
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch(e){} }, 15000);
    };
    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  } catch(e) {}
}


// ════════════════════════════════════════════════════════════════════════
// saveState — écrit dans IDB ET localStorage en parallèle
// ════════════════════════════════════════════════════════════════════════
async function saveState(silent = false) {
  let snap;
  try {
    snap = buildSnapshot();
  } catch (e) {
    console.warn('[saveState] buildSnapshot a planté:', e);
    return false;
  }
  if (!snap) return false;

  if (!snap.savedAt) snap.savedAt = new Date().toISOString();
  if (!snap.key)     snap.key = RT.SAVE_KEY;

  let idbOk = false;
  let lsOk  = false;

  // IndexedDB — PUT AVEC CLÉ EXPLICITE (store sans keyPath)
  try {
    const db = await openDB();
    idbOk = await new Promise(res => {
      try {
        const tx  = db.transaction(RT.STORE_STATE, 'readwrite');
        const req = tx.objectStore(RT.STORE_STATE).put(snap, RT.SAVE_KEY);
        req.onsuccess = () => res(true);
        req.onerror   = () => res(false);
        tx.onerror    = () => res(false);
        tx.onabort    = () => res(false);
      } catch(e) { res(false); }
    });
  } catch (e) {}

  // localStorage en parallèle (pas en fallback)
  try {
    localStorage.setItem(RT.SAVE_KEY, JSON.stringify(snap));
    lsOk = true;
  } catch (e) {
    console.warn('[saveState] localStorage error:', e.message);
  }

  if ((idbOk || lsOk) && !silent && typeof updateSaveIndicator === 'function') {
    try { updateSaveIndicator('saved'); } catch(e) {}
  }
  return idbOk || lsOk;
}
window.saveState = saveState;


// ════════════════════════════════════════════════════════════════════════
// loadState — lit IDB + LS, garde le cycle le plus élevé, applique à S
// ════════════════════════════════════════════════════════════════════════
async function loadState() {
  const dbg = [];
  let snapIDB = null;
  let snapLS  = null;

  // ── factoryReset bypass ─────────────────────────────────────────────
  try {
    if (sessionStorage.getItem('nexus_factory_reset') === '1') {
      sessionStorage.removeItem('nexus_factory_reset');
      try { indexedDB.deleteDatabase(RT.DB_NAME); } catch (e) {}
      _showLoadDebug('factoryReset · démarrage à blanc', '#5a1217');
      return false;
    }
  } catch (e) {}

  // ── Lecture IDB ─────────────────────────────────────────────────────
  try {
    const db = await openDB();
    snapIDB = await new Promise(res => {
      try {
        const req = db.transaction(RT.STORE_STATE, 'readonly')
                      .objectStore(RT.STORE_STATE).get(RT.SAVE_KEY);
        req.onsuccess = e => res(e.target.result || null);
        req.onerror   = () => res(null);
      } catch(e) { res(null); }
    });
    dbg.push('IDB:' + (snapIDB ? '#' + snapIDB.cycle : 'vide'));
  } catch (e) {
    dbg.push('IDB:err=' + e.message);
  }

  // ── Lecture LS ──────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(RT.SAVE_KEY);
    if (raw) {
      snapLS = JSON.parse(raw);
      dbg.push('LS:#' + (snapLS && snapLS.cycle));
    } else {
      dbg.push('LS:vide');
    }
  } catch (e) {
    dbg.push('LS:err=' + e.message);
  }

  // ── Choisir le plus récent (cycle prioritaire, savedAt secondaire) ──
  let snap = null;
  const cIDB = snapIDB && typeof snapIDB.cycle === 'number' ? snapIDB.cycle : -1;
  const cLS  = snapLS  && typeof snapLS.cycle  === 'number' ? snapLS.cycle  : -1;
  if (cIDB === -1 && cLS === -1) {
    _showLoadDebug('loadState: aucun snapshot · ' + dbg.join(' | '), '#5a1217');
    return false;
  }
  snap = (cIDB >= cLS) ? snapIDB : snapLS;
  dbg.push('→ choix: #' + snap.cycle);

  // ── Restauration section par section (try/catch indépendants) ───────
  // safeNum corrigé : accepte zéro et nombres positifs/négatifs
  const safeNum = (val, fallback) => (typeof val === 'number' && isFinite(val)) ? val : fallback;

  try { S.portfolio       = safeNum(snap.portfolio,       S.portfolio); } catch(e){}
  try { S.cashAccount     = safeNum(snap.cashAccount,     S.cashAccount); } catch(e){}
  try { S.tradingAccount  = safeNum(snap.tradingAccount,  S.tradingAccount); } catch(e){}
  try { S.leverage        = safeNum(snap.leverage,        0); } catch(e){}
  try { S.botAutoMode     = snap.botAutoMode !== undefined ? snap.botAutoMode : false; } catch(e){}

  // Intelligence + contrôle
  try {
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
  } catch(e) { dbg.push('intel:err'); }

  // Mode trading
  try {
    if (typeof snap.tradingMode === 'string')        S.tradingMode       = snap.tradingMode;
    if (typeof snap.realTimeframe === 'string')      S.realTimeframe     = snap.realTimeframe;
    if (snap.realActivePairs   && typeof snap.realActivePairs   === 'object') S.realActivePairs   = snap.realActivePairs;
    if (Array.isArray(snap.agentLessonsReal))        S.agentLessonsReal  = snap.agentLessonsReal;
    if (snap.realKillSwitch    && typeof snap.realKillSwitch    === 'object') S.realKillSwitch    = snap.realKillSwitch;
    if (typeof snap.realModeStartedAt === 'number')  S.realModeStartedAt = snap.realModeStartedAt;
    if (snap.realStatsByPair   && typeof snap.realStatsByPair   === 'object') S.realStatsByPair   = snap.realStatsByPair;
    if (snap.preRealSnapshot   && typeof snap.preRealSnapshot   === 'object') S.preRealSnapshot   = snap.preRealSnapshot;
  } catch(e) { dbg.push('mode:err'); }

  // PaperReal
  try {
    if (Array.isArray(snap.agentLessonsPaperReal))                                 S.agentLessonsPaperReal     = snap.agentLessonsPaperReal;
    if (snap.paperRealStats             && typeof snap.paperRealStats             === 'object') S.paperRealStats             = snap.paperRealStats;
    if (snap.paperRealActivePairs       && typeof snap.paperRealActivePairs       === 'object') S.paperRealActivePairs       = snap.paperRealActivePairs;
    if (typeof snap.paperRealTimeframe === 'string')                               S.paperRealTimeframe         = snap.paperRealTimeframe;
    if (typeof snap.paperRealStartedAt === 'number')                               S.paperRealStartedAt         = snap.paperRealStartedAt;
    if (snap.paperRealKillSwitch        && typeof snap.paperRealKillSwitch        === 'object') S.paperRealKillSwitch        = snap.paperRealKillSwitch;
    if (snap.paperRealLastClose         && typeof snap.paperRealLastClose         === 'object') S.paperRealLastClose         = snap.paperRealLastClose;
    if (typeof snap.paperRealConsecLosses === 'number')                            S.paperRealConsecLosses      = snap.paperRealConsecLosses;
    if (typeof snap.paperRealGlobalPauseUntil === 'number')                        S.paperRealGlobalPauseUntil  = snap.paperRealGlobalPauseUntil;
    if (snap.paperRealConfig            && typeof snap.paperRealConfig            === 'object') S.paperRealConfig            = Object.assign(S.paperRealConfig || {}, snap.paperRealConfig);
    if (snap.adaptiveState              && typeof snap.adaptiveState              === 'object') S.adaptiveState              = Object.assign(S.adaptiveState   || {}, snap.adaptiveState);
    if (Array.isArray(snap.tradeContextMemory))                                    S.tradeContextMemory         = snap.tradeContextMemory.slice(-500);
    if (snap.abTesting                  && typeof snap.abTesting                  === 'object') S.abTesting                  = Object.assign(S.abTesting       || {}, snap.abTesting);
    if (snap.pnlPeriod                  && typeof snap.pnlPeriod                  === 'object') S.pnlPeriod                  = Object.assign(S.pnlPeriod       || {}, snap.pnlPeriod);
    if (typeof snap._totalCompounded === 'number') S._totalCompounded = snap._totalCompounded;
    if (typeof snap._genCount        === 'number') S._genCount        = snap._genCount;
    if (snap.preRealSnapshotPaperReal   && typeof snap.preRealSnapshotPaperReal   === 'object') S.preRealSnapshotPaperReal   = snap.preRealSnapshotPaperReal;
  } catch(e) { dbg.push('paperReal:err'); }

  // Bougies temps réel
  try {
    if (snap.realCandles && typeof snap.realCandles === 'object') {
      S.realCandles = snap.realCandles;
      if (typeof _ensureRealCandlesStruct === 'function') _ensureRealCandlesStruct();
    }
  } catch(e) { dbg.push('candles:err'); }

  // Bandeau mode + bouton mode (différé pour laisser l'UI se construire)
  setTimeout(() => {
    try { if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner(); } catch(e){}
    try { if (typeof updateModeButton === 'function') updateModeButton(); } catch(e){}
  }, 100);

  // Cycle, P&L, historiques
  try {
    S.cycle           = typeof snap.cycle === 'number' ? snap.cycle : 0;
    S.cycleMax        = snap.cycleMax        || 30;
    S.pnl24h          = snap.pnl24h          || 0;
    S.pnlHistory      = snap.pnlHistory      || [];
    S.totalTrades     = snap.totalTrades     || 0;
    S.winTrades       = snap.winTrades       || 0;
    S.chainLog        = snap.chainLog        || [];
    S.learningHistory = snap.learningHistory || [];
    S.evoLog          = snap.evoLog          || [];
    S.openPositions   = snap.openPositions   || [];
    if (snap._startPortfolio) S._startPortfolio = snap._startPortfolio;
  } catch(e) { dbg.push('cycle:err'); }

  // Fees
  try {
    if (snap.fees) {
      Object.assign(S.fees, snap.fees);
      S.fees.feeLog = snap.fees.feeLog || [];
      S.fees.byPair = snap.fees.byPair || {};
    }
  } catch(e) { dbg.push('fees:err'); }

  // TaxConfig
  try {
    if (snap.taxConfig) {
      S.taxConfig.region = snap.taxConfig.region || S.taxConfig.region;
      if (snap.taxConfig.regions) {
        Object.assign(S.taxConfig.regions, snap.taxConfig.regions);
      }
    }
  } catch(e) { dbg.push('tax:err'); }

  // Agents
  try {
    if (snap.agents && snap.agents.length && S.agents) {
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
  } catch(e) { dbg.push('agents:err'); }

  // Paires
  try {
    const snapAge    = snap.savedAt ? (Date.now() - new Date(snap.savedAt).getTime()) : 0;
    const priceStale = snapAge > 600000;
    if (snap.pairStates) {
      Object.entries(snap.pairStates).forEach(([pair, saved]) => {
        const ps = S.pairStates && S.pairStates[pair];
        if (!ps) return;
        if (!priceStale) ps.price = saved.price || ps.price;
        ps.qYes         = saved.qYes         || ps.qYes;
        ps.qNo          = saved.qNo          || ps.qNo;
        ps.stake        = saved.stake        || ps.stake;
        ps.userStake    = saved.userStake    || false;
        ps.pairLeverage = saved.pairLeverage || 1;
        ps.threshold    = saved.threshold    || 0.65;
        ps.userCycleSet = saved.userCycleSet || false;
        ps.lastAction   = saved.lastAction   || 'hold';
        ps.holdStartTs  = saved.holdStartTs  || 0;
        ps.capital      = saved.capital      || ps.capital;
        ps.cycleMax     = saved.cycleMax     || ps.cycleMax;
        ps.cycleTimer   = saved.cycleTimer   || ps.cycleTimer;
        ps.totalTrades  = saved.totalTrades  || 0;
        ps.winTrades    = saved.winTrades    || 0;
        ps.totalPnlPct  = saved.totalPnlPct  || 0;
        ps.totalPnlUsd  = saved.totalPnlUsd  || 0;
        ps.pnl24h       = saved.pnl24h       || 0;
        ps.trades       = saved.trades       || [];
        if (saved.candles && saved.candles.length) ps.candles = saved.candles;
        if (snap.pairBestWorst && snap.pairBestWorst[pair]) {
          ps.bestTrade  = snap.pairBestWorst[pair].bestTrade  || null;
          ps.worstTrade = snap.pairBestWorst[pair].worstTrade || null;
        }
      });
    }
  } catch(e) { dbg.push('pairs:err'); }

  // Mémoires agents
  try {
    if (snap.agentMemories && S.agents) {
      S.agents.forEach(a => {
        if (snap.agentMemories[a.id]) a.memory = snap.agentMemories[a.id];
        const saved = snap.agents ? snap.agents.find(sa => sa.id === a.id) : null;
        if (saved) {
          if (saved.errors         != null) a.errors         = saved.errors;
          if (saved.corrections    != null) a.corrections    = saved.corrections;
          if (saved.streak         != null) a.streak         = saved.streak;
          if (saved.lastPnl        != null) a.lastPnl        = saved.lastPnl;
          if (saved.learningEvents != null) a.learningEvents = saved.learningEvents;
        }
      });
    }
    if (snap.globalMemoryPool) S.globalMemoryPool = snap.globalMemoryPool;
  } catch(e) { dbg.push('memories:err'); }

  // Dreams
  try { if (snap.dreams && snap.dreams.length) S.dreams = snap.dreams; } catch(e){}

  // Version
  try { if (snap.vMajor != null) S.vMajor = snap.vMajor; } catch(e){}

  // Levier
  try {
    if (snap.leverageReserve   != null) S.leverageReserve   = snap.leverageReserve;
    if (snap.leverageBorrowed  != null) S.leverageBorrowed  = snap.leverageBorrowed;
    if (snap.leverageTotalFees != null) S.leverageTotalFees = snap.leverageTotalFees;
  } catch(e) { dbg.push('lev:err'); }

  // Fiat / fiscal / fonds propres
  try {
    if (snap.fiscalReserveAccount != null) S.fiscalReserveAccount = snap.fiscalReserveAccount;
    if (Array.isArray(snap.fiscalReserveLog)) S.fiscalReserveLog  = snap.fiscalReserveLog;
    if (snap.ownFundsInjected     != null) S.ownFundsInjected     = snap.ownFundsInjected;
    if (Array.isArray(snap.ownFundsLog))    S.ownFundsLog         = snap.ownFundsLog;
    if (typeof snap.fiatConvFeePct === 'number') S.fiatConvFeePct = snap.fiatConvFeePct;
  } catch(e) { dbg.push('fiat:err'); }

  // Emprunt auto levier
  try {
    if (snap._autoLevBase     != null) S._autoLevBase     = snap._autoLevBase;
    if (snap._autoLevBorrowed != null) S._autoLevBorrowed = snap._autoLevBorrowed;
  } catch(e) {}

  // Paires dynamiques
  try {
    if (snap.dynamicPairKeys && snap.dynamicPairKeys.length && typeof PAIRS !== 'undefined') {
      snap.dynamicPairKeys.forEach(pairKey => {
        if (!PAIRS[pairKey]) {
          const sym = pairKey.split('/')[0];
          const candidate = (snap.pairCandidates || S.pairCandidates || []).find(c => c.sym === sym);
          if (candidate) {
            PAIRS[pairKey] = {
              sym: candidate.sym, color: candidate.color,
              startPrice: candidate.startPrice, vol: candidate.vol,
              minP: candidate.minP, maxP: candidate.maxP, dec: candidate.dec
            };
            if (S.pairStates && !S.pairStates[pairKey] && typeof makePairState === 'function') {
              S.pairStates[pairKey] = makePairState(PAIRS[pairKey]);
            }
          }
        }
      });
    }
    if (snap.pairCandidates) S.pairCandidates = snap.pairCandidates;
  } catch(e) { dbg.push('dynPairs:err'); }

  // Proposals
  try {
    if (snap.proposals && snap.proposals.length && S.proposals) {
      const savedPairProps = snap.proposals.filter(p => p.isPairProposal);
      savedPairProps.forEach(sp => {
        if (!S.proposals.find(p => p.id === sp.id)) S.proposals.unshift(sp);
      });
      const activePP = savedPairProps.find(p => p.status === 'active');
      if (activePP) S.activePairProposal = activePP.pairSym;
    }
  } catch(e) { dbg.push('props:err'); }

  // ── Render UI après restauration ────────────────────────────────────
  setTimeout(() => {
    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
  }, 50);

  // ── Bannière succès ─────────────────────────────────────────────────
  _showLoadDebug(
    '✅ loadState OK · #' + S.cycle +
    ' · portfolio=' + (S.portfolio||0).toFixed(2) +
    ' · ' + dbg.join(' | '),
    '#0a4d2a'
  );

  return true;
}
window.loadState = loadState;
