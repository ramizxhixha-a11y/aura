// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   AURA8 — 09a-persistence.js — VERSION v119.2                ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   MODULE DE PERSISTANCE PROPRE (étape 1 du découpage)        ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   Ce module remplace 3 fonctions de 09-bloc-restauration :   ▓▓▓
// ▓▓▓     - saveState   → dual-write systématique                  ▓▓▓
// ▓▓▓     - loadState   → lit les 2 storages, garde le plus récent ▓▓▓
// ▓▓▓     - importState → sans le backup hardcoded _F (code mort)  ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   ════ BUG ORIGINAL ════                                     ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   saveState() écrit IndexedDB en premier, fallback           ▓▓▓
// ▓▓▓   localStorage SEULEMENT si IndexedDB plante.                ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   loadState() lit IndexedDB en premier, localStorage         ▓▓▓
// ▓▓▓   SEULEMENT si IndexedDB est vide.                           ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   → Si IndexedDB plante 1 fois sur une save, la sauvegarde   ▓▓▓
// ▓▓▓     part dans localStorage. Au reload, on relit IndexedDB    ▓▓▓
// ▓▓▓     (plus ancien) → RÉGRESSION du cycle.                     ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   ════ FIX APPLIQUÉ ════                                     ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   saveState : écrit TOUJOURS dans les 2 storages             ▓▓▓
// ▓▓▓   loadState : lit les 2, garde celui dont savedAt est le     ▓▓▓
// ▓▓▓                plus récent, sync l'autre si besoin           ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   ════ CHARGEMENT ════                                       ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   Ce fichier DOIT être chargé APRÈS :                        ▓▓▓
// ▓▓▓     - 09-bloc-restauration-v93.js (qui définit buildSnapshot)▓▓▓
// ▓▓▓     - 10-fin-bloc-restauration-v93.js (qui définit openDB)   ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
  'use strict';
  
  // ── Constantes (mêmes valeurs que dans 09 et 10) ──
  const SAVE_KEY    = 'nexus_state_v2';
  const STORE_STATE = 'state';
  const DB_NAME     = 'NEXUS_DB';
  
  const TAG = '[09a-PERSISTENCE]';
  
  
  // ════════════════════════════════════════════════════════════
  //  saveState — dual-write systématique
  // ════════════════════════════════════════════════════════════
  
  async function saveState(silent) {
    if (typeof buildSnapshot !== 'function') {
      console.warn(TAG, 'buildSnapshot indisponible — save annulée');
      return false;
    }
    
    const snap = buildSnapshot();
    // buildSnapshot inclut déjà snap.savedAt = new Date().toISOString()
    
    let idbOk = false;
    let lsOk  = false;
    
    // 1. IndexedDB
    try {
      if (typeof openDB === 'function') {
        const db = await openDB();
        idbOk = await new Promise(res => {
          const tx  = db.transaction(STORE_STATE, 'readwrite');
          const req = tx.objectStore(STORE_STATE).put(snap);
          req.onsuccess = () => res(true);
          req.onerror   = () => res(false);
        });
      }
    } catch(e) {
      console.warn(TAG, 'IndexedDB save failed:', e);
    }
    
    // 2. localStorage (SYSTÉMATIQUE — pas un fallback)
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      lsOk = true;
    } catch(e) {
      console.warn(TAG, 'localStorage save failed (quota?):', e);
    }
    
    // Indicateur visuel
    if (!silent && (idbOk || lsOk) && typeof updateSaveIndicator === 'function') {
      try { updateSaveIndicator('saved'); } catch(e) {}
    }
    
    // Retourne true si AU MOINS un storage a réussi
    return idbOk || lsOk;
  }
  
  
  // ════════════════════════════════════════════════════════════
  //  loadState — lit les 2 storages, garde le plus récent
  // ════════════════════════════════════════════════════════════
  
  async function loadState() {
    // ── factoryReset (logique identique à l'original) ──
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
            ps.totalTrades  = 0;
            ps.winTrades    = 0;
            ps.totalPnlUsd  = 0;
            ps.trades       = [];
            ps.openPosition = null;
          }
        });
        try { indexedDB.deleteDatabase(DB_NAME); } catch(e) {}
        return false;
      }
    } catch(e) {}
    
    // ── LECTURE DES 2 STORAGES EN PARALLÈLE ──
    let idbSnap = null;
    let lsSnap  = null;
    
    // IndexedDB
    try {
      if (typeof openDB === 'function') {
        const db = await openDB();
        idbSnap = await new Promise(res => {
          const req = db.transaction(STORE_STATE, 'readonly')
                        .objectStore(STORE_STATE).get(SAVE_KEY);
          req.onsuccess = e => res(e.target.result || null);
          req.onerror   = () => res(null);
        });
      }
    } catch(e) { /* IndexedDB indisponible */ }
    
    // localStorage
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) lsSnap = JSON.parse(raw);
    } catch(e) { /* corrompu */ }
    
    // ── SÉLECTION DU PLUS RÉCENT (par savedAt) ──
    const idbTs = (idbSnap && idbSnap.savedAt) ? new Date(idbSnap.savedAt).getTime() : 0;
    const lsTs  = (lsSnap  && lsSnap.savedAt)  ? new Date(lsSnap.savedAt).getTime()  : 0;
    
    let snap   = null;
    let source = '';
    
    if (idbTs >= lsTs && idbSnap) {
      snap = idbSnap;
      source = 'IndexedDB';
    } else if (lsSnap) {
      snap = lsSnap;
      source = 'localStorage';
    } else if (idbSnap) {
      snap = idbSnap;
      source = 'IndexedDB';
    }
    
    // Log discret pour suivre ce qui se passe
    if (snap) {
      const tsStr = snap.savedAt ? new Date(snap.savedAt).toLocaleString() : 'inconnu';
      console.log(TAG, 'Chargement depuis', source, '· savedAt:', tsStr, '· cycle:', snap.cycle || '?');
      
      // Si localStorage est plus récent que IndexedDB, sync silencieusement
      // (comme ça la prochaine fois, IndexedDB est à jour)
      if (source === 'localStorage' && idbSnap && lsTs > idbTs) {
        console.log(TAG, 'IndexedDB en retard de', Math.round((lsTs - idbTs) / 1000), 's → sync vers IndexedDB');
        try {
          if (typeof openDB === 'function') {
            const db = await openDB();
            const tx = db.transaction(STORE_STATE, 'readwrite');
            tx.objectStore(STORE_STATE).put(lsSnap);
          }
        } catch(e) {}
      }
    }
    
    if (!snap || snap.version < 2) return false;
    
    // ════════════════════════════════════════════════════════════
    //  RESTAURATION DU STATE — logique identique à l'original 09
    // ════════════════════════════════════════════════════════════
    
    const safeNum = (val, fallback) => (typeof val === 'number' && val > 0) ? val : fallback;
    
    S.portfolio      = safeNum(snap.portfolio,     S.portfolio);
    S.cashAccount    = safeNum(snap.cashAccount,    S.cashAccount);
    S.tradingAccount = safeNum(snap.tradingAccount, S.tradingAccount);
    S.leverage       = (typeof snap.leverage === 'number') ? snap.leverage : 0;
    S.botAutoMode    = snap.botAutoMode !== undefined ? snap.botAutoMode : false;
    
    // v5.4-v6 fields
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
    
    // v7.12 · Mode trading
    if (typeof snap.tradingMode === 'string')                              S.tradingMode = snap.tradingMode;
    if (typeof snap.realTimeframe === 'string')                            S.realTimeframe = snap.realTimeframe;
    if (snap.realActivePairs && typeof snap.realActivePairs === 'object')  S.realActivePairs = snap.realActivePairs;
    if (Array.isArray(snap.agentLessonsReal))                              S.agentLessonsReal = snap.agentLessonsReal;
    if (snap.realKillSwitch && typeof snap.realKillSwitch === 'object')    S.realKillSwitch = snap.realKillSwitch;
    if (typeof snap.realModeStartedAt === 'number')                        S.realModeStartedAt = snap.realModeStartedAt;
    if (snap.realStatsByPair && typeof snap.realStatsByPair === 'object')  S.realStatsByPair = snap.realStatsByPair;
    if (snap.preRealSnapshot && typeof snap.preRealSnapshot === 'object')  S.preRealSnapshot = snap.preRealSnapshot;
    
    if (Array.isArray(snap.agentLessonsPaperReal))                                S.agentLessonsPaperReal = snap.agentLessonsPaperReal;
    if (snap.paperRealStats && typeof snap.paperRealStats === 'object')           S.paperRealStats = snap.paperRealStats;
    if (snap.paperRealActivePairs && typeof snap.paperRealActivePairs==='object') S.paperRealActivePairs = snap.paperRealActivePairs;
    if (typeof snap.paperRealTimeframe === 'string')                              S.paperRealTimeframe = snap.paperRealTimeframe;
    if (typeof snap.paperRealStartedAt === 'number')                              S.paperRealStartedAt = snap.paperRealStartedAt;
    if (snap.paperRealKillSwitch && typeof snap.paperRealKillSwitch==='object')   S.paperRealKillSwitch = snap.paperRealKillSwitch;
    if (snap.paperRealLastClose && typeof snap.paperRealLastClose==='object')     S.paperRealLastClose = snap.paperRealLastClose;
    if (typeof snap.paperRealConsecLosses === 'number')                           S.paperRealConsecLosses = snap.paperRealConsecLosses;
    if (typeof snap.paperRealGlobalPauseUntil === 'number')                       S.paperRealGlobalPauseUntil = snap.paperRealGlobalPauseUntil;
    if (snap.paperRealConfig && typeof snap.paperRealConfig === 'object')         S.paperRealConfig = Object.assign(S.paperRealConfig||{}, snap.paperRealConfig);
    if (snap.adaptiveState && typeof snap.adaptiveState === 'object')             S.adaptiveState = Object.assign(S.adaptiveState||{}, snap.adaptiveState);
    if (Array.isArray(snap.tradeContextMemory))                                   S.tradeContextMemory = snap.tradeContextMemory.slice(-500);
    if (snap.abTesting && typeof snap.abTesting === 'object')                     S.abTesting = Object.assign(S.abTesting||{}, snap.abTesting);
    if (snap.pnlPeriod && typeof snap.pnlPeriod === 'object')                     S.pnlPeriod = Object.assign(S.pnlPeriod||{}, snap.pnlPeriod);
    
    if (typeof snap._totalCompounded === 'number' && snap._totalCompounded > 0)   S._totalCompounded = snap._totalCompounded;
    if (typeof snap._genCount === 'number' && snap._genCount > 0)                 S._genCount = snap._genCount;
    if (snap.preRealSnapshotPaperReal && typeof snap.preRealSnapshotPaperReal==='object') S.preRealSnapshotPaperReal = snap.preRealSnapshotPaperReal;
    
    // v7.12 · Bougies temps réel
    if (snap.realCandles && typeof snap.realCandles === 'object') {
      S.realCandles = snap.realCandles;
      try { if (typeof _ensureRealCandlesStruct === 'function') _ensureRealCandlesStruct(); } catch(e) {}
    }
    
    try { if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner(); } catch(e) {}
    setTimeout(() => { try { if (typeof updateModeButton === 'function') updateModeButton(); } catch(e) {} }, 50);
    
    S.cycle           = snap.cycle           || 0;
    S.cycleMax        = snap.cycleMax        || 30;
    S.pnl24h          = snap.pnl24h          || 0;
    S.pnlHistory      = snap.pnlHistory      || [];
    S.totalTrades     = snap.totalTrades     || 0;
    S.winTrades       = snap.winTrades       || 0;
    S.chainLog        = snap.chainLog        || [];
    S.learningHistory = snap.learningHistory || [];
    S.evoLog          = snap.evoLog          || [];
    S.openPositions   = snap.openPositions   || [];
    
    // _startPortfolio (avec recalibrage)
    if (snap._startPortfolio) {
      S._startPortfolio = snap._startPortfolio;
      const _current = (S.cashAccount || 0) + (S.tradingAccount || 0);
      if (S._startPortfolio > 0 && _current > 0) {
        const _impliedPct = (_current - S._startPortfolio) / S._startPortfolio * 100;
        if (Math.abs(_impliedPct) > 500) {
          console.warn('[v43] _startPortfolio recalibré : ' + _impliedPct.toFixed(0) + '% → base recalée sur valeur actuelle');
          S._startPortfolio = _current;
          if (S.pnlPeriod) {
            S.pnlPeriod.todayStartPortfolio = _current;
            S.pnlPeriod.weekStartPortfolio  = _current;
          }
        }
      }
    }
    
    // Positions fantômes > 2h
    if (Array.isArray(S.openPositions) && S.openPositions.length > 0) {
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      const stale = S.openPositions.filter(p => (now - (p.entryTs || now)) > TWO_HOURS);
      if (stale.length > 0) {
        console.log('[AURA] ' + stale.length + ' position(s) fantôme(s) fermée(s) au démarrage (> 2h)');
        S.openPositions = S.openPositions.filter(p => (now - (p.entryTs || now)) <= TWO_HOURS);
      }
    }
    
    // v8.0 LIVRAISON 25 · ONE-SHOT RESET P&L
    try {
      const RESET_FLAG = 'aura_v8_pnl_reset_done';
      if (!localStorage.getItem(RESET_FLAG)) {
        const current = (S.cashAccount || 0) + (S.tradingAccount || 0);
        S._startPortfolio = current;
        S.pnl24h = 0;
        S.portfolio = current;
        if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
        S.pnlPeriod.todayStartPortfolio = current;
        S.pnlPeriod.todayDate = (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'));
        S.pnlPeriod.weekStartPortfolio  = current;
        S.pnlPeriod.monthStartPortfolio = current;
        localStorage.setItem(RESET_FLAG, '1');
        console.log('[AURA] One-shot P&L reset done · base ' + current.toFixed(2));
      }
    } catch(e) { console.warn('[AURA] One-shot reset échoué :', e); }
    
    // fees + taxConfig
    if (snap.fees) {
      Object.assign(S.fees, snap.fees);
      S.fees.feeLog = snap.fees.feeLog || [];
      S.fees.byPair = snap.fees.byPair || {};
    }
    if (snap.taxConfig) {
      S.taxConfig.region = snap.taxConfig.region || S.taxConfig.region;
      if (snap.taxConfig.regions) {
        Object.assign(S.taxConfig.regions, snap.taxConfig.regions);
      }
    }
    
    // Agents
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
    
    // pairStates (avec gestion prix stale)
    const _snapAge = snap.savedAt ? (Date.now() - new Date(snap.savedAt).getTime()) : 0;
    const _priceStale = _snapAge > 600000; // 10 min
    if (snap.pairStates) {
      Object.entries(snap.pairStates).forEach(([pair, saved]) => {
        const ps = S.pairStates[pair];
        if (!ps) return;
        if (!_priceStale)         ps.price        = saved.price        || ps.price;
        ps.qYes                                   = saved.qYes         || ps.qYes;
        ps.qNo                                    = saved.qNo          || ps.qNo;
        ps.stake                                  = saved.stake        || ps.stake;
        ps.userStake                              = saved.userStake    || false;
        ps.pairLeverage                           = saved.pairLeverage || 1;
        ps.threshold                              = saved.threshold    || 0.65;
        ps.userCycleSet                           = saved.userCycleSet || false;
        ps.lastAction                             = saved.lastAction   || 'hold';
        ps.holdStartTs                            = saved.holdStartTs  || 0;
        ps.capital                                = saved.capital      || ps.capital;
        ps.cycleMax                               = saved.cycleMax     || ps.cycleMax;
        ps.cycleTimer                             = saved.cycleTimer   || ps.cycleTimer;
        ps.totalTrades                            = saved.totalTrades  || 0;
        ps.winTrades                              = saved.winTrades    || 0;
        ps.totalPnlPct                            = saved.totalPnlPct  || 0;
        ps.totalPnlUsd                            = saved.totalPnlUsd  || 0;
        ps.pnl24h                                 = saved.pnl24h       || 0;
        ps.trades                                 = saved.trades       || [];
        if (saved.candles && saved.candles.length) ps.candles          = saved.candles;
        if (snap.pairBestWorst && snap.pairBestWorst[pair]) {
          ps.bestTrade  = snap.pairBestWorst[pair].bestTrade  || null;
          ps.worstTrade = snap.pairBestWorst[pair].worstTrade || null;
        }
      });
    }
    
    // Feature #1 — Agent Memories
    if (snap.agentMemories) {
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
    
    // Feature #2 — Dreams
    if (snap.dreams && snap.dreams.length) S.dreams = snap.dreams;
    
    // Versions
    if (snap.vMajor != null) S.vMajor = snap.vMajor;
    // NE PAS restaurer vMinor (toujours valeur compilée)
    
    // Levier
    if (snap.leverageReserve   != null) S.leverageReserve   = snap.leverageReserve;
    if (snap.leverageBorrowed  != null) S.leverageBorrowed  = snap.leverageBorrowed;
    if (snap.leverageTotalFees != null) S.leverageTotalFees = snap.leverageTotalFees;
    
    // Phase 2/8/9 (fiscalReserve, ownFunds)
    if (snap.fiscalReserveAccount != null)         S.fiscalReserveAccount = snap.fiscalReserveAccount;
    if (Array.isArray(snap.fiscalReserveLog))      S.fiscalReserveLog     = snap.fiscalReserveLog;
    if (snap.ownFundsInjected != null)             S.ownFundsInjected     = snap.ownFundsInjected;
    if (Array.isArray(snap.ownFundsLog))           S.ownFundsLog          = snap.ownFundsLog;
    if (typeof snap.fiatConvFeePct === 'number')   S.fiatConvFeePct       = snap.fiatConvFeePct;
    if (snap._autoLevBase     != null)             S._autoLevBase         = snap._autoLevBase;
    if (snap._autoLevBorrowed != null)             S._autoLevBorrowed     = snap._autoLevBorrowed;
    
    // Feature #3 — Dynamic pairs & proposals
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
  
  
  // ════════════════════════════════════════════════════════════
  //  importState — SANS le backup hardcoded _F
  // ════════════════════════════════════════════════════════════
  
  function importState() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const snap = JSON.parse(text);
        if (!snap || snap.version < 2) {
          if (typeof showToast === 'function') showToast('❌ Fichier invalide ou trop ancien', 4000, 'user');
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
        
        const wasRunning = (typeof _simRunning !== 'undefined' && _simRunning);
        if (wasRunning && typeof stopSim === 'function') stopSim();
        
        // Écrire dans LES 2 storages
        try {
          if (typeof openDB === 'function') {
            const db = await openDB();
            await new Promise(res => {
              const tx = db.transaction(STORE_STATE, 'readwrite');
              tx.objectStore(STORE_STATE).put(snap);
              tx.oncomplete = res;
              tx.onerror    = res;
            });
          }
        } catch(dbErr) {}
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch(lsErr) {}
        
        // Recharger
        const ok = await loadState();
        
        // ⚠ ANCIEN CODE RETIRÉ : le backup _F hardcoded (cycle=344) qui
        // s'activait si tradingAccount + cashAccount = 0 est SUPPRIMÉ.
        // Ce code mort dangereux causait des restaurations vers un état
        // ancien quand l'import écrasait le state actuel à 0.
        
        if (ok && typeof showToast === 'function') {
          showToast('✅ Sauvegarde restaurée · cycle #' + (snap.cycle || '?'), 4000, 'user');
        } else if (!ok && typeof showToast === 'function') {
          showToast('⚠ Restauration partielle — vérifie le state', 4000, 'warn');
        }
        
        // Refresh UI
        if (typeof renderAll === 'function') {
          try { renderAll(); } catch(e) {}
        }
        if (wasRunning && typeof startSim === 'function') {
          setTimeout(() => { try { startSim(); } catch(e) {} }, 500);
        }
      } catch(err) {
        console.error(TAG, 'Import failed:', err);
        if (typeof showToast === 'function') showToast('❌ Import échoué : ' + err.message, 4000, 'user');
      }
    };
    input.click();
  }
  
  
  // ════════════════════════════════════════════════════════════
  //  SURCHARGE — exposer les nouvelles fonctions sur window
  // ════════════════════════════════════════════════════════════
  
  window.saveState   = saveState;
  window.loadState   = loadState;
  window.importState = importState;
  
  
  // ════════════════════════════════════════════════════════════
  //  RE-LOAD INITIAL — corrige ce qu'init() a chargé avec l'ancienne loadState
  // ════════════════════════════════════════════════════════════
  
  // À ce stade, init() a déjà été appelé par 09 et a utilisé l'ANCIENNE
  // loadState (qui peut avoir lu un IndexedDB plus ancien que localStorage).
  // On re-charge avec la nouvelle loadState pour écraser ça.
  
  setTimeout(async () => {
    try {
      const ok = await loadState();
      if (ok) {
        if (typeof renderAll === 'function') {
          try { renderAll(); } catch(e) {}
        }
        console.log(TAG, '✅ Re-load initial appliqué (fix régression actif)');
      }
    } catch(e) {
      console.warn(TAG, 'Re-load initial échoué:', e);
    }
  }, 200);
  
  console.log(TAG, 'Module chargé · saveState / loadState / importState surchargées');
})();
