// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b2-save-load.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// saveState + loadState — écriture/lecture IndexedDB + localStorage.
// Override v120.3 dans 00b-persistance-override.js prend le relais.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════




async function saveState(silent = false) {
  const snap = buildSnapshot();

  // 1. IndexedDB (principal)
  try {
    const db = await openDB();
    return new Promise(res => {
      const tx  = db.transaction(RT.STORE_STATE, 'readwrite');
      const req = tx.objectStore(RT.STORE_STATE).put(snap);
      req.onsuccess = () => {
        if (!silent) updateSaveIndicator('saved');
        res(true);
      };
      req.onerror = () => res(false);
    });
  } catch (e) {
    // 2. localStorage fallback
    try {
      localStorage.setItem(RT.SAVE_KEY, JSON.stringify(snap));
      if (!silent) updateSaveIndicator('saved');
    } catch (le) {
      // Quota localStorage dépassé — on ne peut plus sauvegarder
      console.warn('[saveState] localStorage quota exceeded:', le);
    }
    return false;
  }
}
window.saveState = saveState;


async function loadState() {
  // Si un factoryReset vient d'avoir lieu, on ignore toute restauration.
  // Le flag est dans sessionStorage → persiste entre reloads d'une même session.
  try {
    if (sessionStorage.getItem('nexus_factory_reset') === '1') {
      sessionStorage.removeItem('nexus_factory_reset');

      // Nettoyer explicitement S au cas où des valeurs résiduelles seraient en mémoire
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

      // Nettoyer aussi toute DB résiduelle (au cas où deleteDatabase aurait échoué)
      try { indexedDB.deleteDatabase(RT.DB_NAME); } catch (e) {}

      return false;
    }
  } catch (e) {}

  let snap = null;

  // Essayer IndexedDB d'abord
  try {
    const db = await openDB();
    snap = await new Promise(res => {
      const req = db.transaction(RT.STORE_STATE, 'readonly')
                    .objectStore(RT.STORE_STATE).get(RT.SAVE_KEY);
      req.onsuccess = e => res(e.target.result || null);
      req.onerror   = () => res(null);
    });
  } catch (e) {
    // IndexedDB indisponible
  }

  // Fallback localStorage
  if (!snap) {
    try {
      const raw = localStorage.getItem(RT.SAVE_KEY);
      if (raw) snap = JSON.parse(raw);
    } catch (e) {
      // localStorage corrompu
    }
  }

  if (!snap || snap.version < 2) return false;

  // Guard : ne jamais restaurer des valeurs financières nulles ou négatives
  const safeNum = (val, fallback) => (typeof val === 'number' && val > 0) ? val : fallback;

  // === RESTAURATION ===

  // Portefeuille
  S.portfolio      = safeNum(snap.portfolio,      S.portfolio);
  S.cashAccount    = safeNum(snap.cashAccount,    S.cashAccount);
  S.tradingAccount = safeNum(snap.tradingAccount, S.tradingAccount);
  S.leverage       = (typeof snap.leverage === 'number') ? snap.leverage : 0;
  S.botAutoMode    = snap.botAutoMode !== undefined ? snap.botAutoMode : false;

  // Intelligence + contrôle
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

  // Mode trading
  if (typeof snap.tradingMode === 'string')        S.tradingMode       = snap.tradingMode;
  if (typeof snap.realTimeframe === 'string')      S.realTimeframe     = snap.realTimeframe;
  if (snap.realActivePairs   && typeof snap.realActivePairs   === 'object') S.realActivePairs   = snap.realActivePairs;
  if (Array.isArray(snap.agentLessonsReal))        S.agentLessonsReal  = snap.agentLessonsReal;
  if (snap.realKillSwitch    && typeof snap.realKillSwitch    === 'object') S.realKillSwitch    = snap.realKillSwitch;
  if (typeof snap.realModeStartedAt === 'number')  S.realModeStartedAt = snap.realModeStartedAt;
  if (snap.realStatsByPair   && typeof snap.realStatsByPair   === 'object') S.realStatsByPair   = snap.realStatsByPair;
  if (snap.preRealSnapshot   && typeof snap.preRealSnapshot   === 'object') S.preRealSnapshot   = snap.preRealSnapshot;

  // PaperReal
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
  if (typeof snap._totalCompounded === 'number' && snap._totalCompounded > 0)    S._totalCompounded           = snap._totalCompounded;
  if (typeof snap._genCount        === 'number' && snap._genCount        > 0)    S._genCount                  = snap._genCount;
  if (snap.preRealSnapshotPaperReal   && typeof snap.preRealSnapshotPaperReal   === 'object') S.preRealSnapshotPaperReal   = snap.preRealSnapshotPaperReal;

  // Bougies temps réel
  if (snap.realCandles && typeof snap.realCandles === 'object') {
    S.realCandles = snap.realCandles;
    try { _ensureRealCandlesStruct(); } catch (e) {}
  }

  // Mise à jour du bandeau visuel selon le mode persisté
  try { _updateRealModeBanner(); } catch (e) {}

  // Sync mode button après restore
  setTimeout(() => {
    try { if (typeof updateModeButton === 'function') updateModeButton(); } catch (e) {}
  }, 50);

  // Cycle, P&L, historiques
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

  // Restore session start portfolio pour P&L intraday
  if (snap._startPortfolio) {
    S._startPortfolio = snap._startPortfolio;
  }

  // Fees
  if (snap.fees) {
    Object.assign(S.fees, snap.fees);
    S.fees.feeLog = snap.fees.feeLog || [];
    S.fees.byPair = snap.fees.byPair || {};
  }

  // TaxConfig
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

  // Paires : on ne restaure ps.price que si le snapshot est frais (<10 min).
  // Sinon on laisse fetchLivePrices() gérer pour éviter de partir sur un prix mort.
  const _snapAge     = snap.savedAt ? (Date.now() - new Date(snap.savedAt).getTime()) : 0;
  const _priceStale  = _snapAge > 600000; // 10 min

  if (snap.pairStates) {
    Object.entries(snap.pairStates).forEach(([pair, saved]) => {
      const ps = S.pairStates[pair];
      if (!ps) return;

      if (!_priceStale) ps.price = saved.price || ps.price;
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

      // Best/worst trade
      if (snap.pairBestWorst && snap.pairBestWorst[pair]) {
        ps.bestTrade  = snap.pairBestWorst[pair].bestTrade  || null;
        ps.worstTrade = snap.pairBestWorst[pair].worstTrade || null;
      }
    });
  }

  // Mémoires agents
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

  // Dreams
  if (snap.dreams && snap.dreams.length) S.dreams = snap.dreams;

  // Version (vMajor seulement — vMinor reste compilé pour refléter la version courante du code)
  if (snap.vMajor != null) S.vMajor = snap.vMajor;

  // Levier
  if (snap.leverageReserve   != null) S.leverageReserve   = snap.leverageReserve;
  if (snap.leverageBorrowed  != null) S.leverageBorrowed  = snap.leverageBorrowed;
  if (snap.leverageTotalFees != null) S.leverageTotalFees = snap.leverageTotalFees;

  // Comptes Fiat / fiscal / fonds propres
  if (snap.fiscalReserveAccount != null) S.fiscalReserveAccount = snap.fiscalReserveAccount;
  if (Array.isArray(snap.fiscalReserveLog)) S.fiscalReserveLog  = snap.fiscalReserveLog;
  if (snap.ownFundsInjected     != null) S.ownFundsInjected     = snap.ownFundsInjected;
  if (Array.isArray(snap.ownFundsLog))    S.ownFundsLog         = snap.ownFundsLog;
  if (typeof snap.fiatConvFeePct === 'number') S.fiatConvFeePct = snap.fiatConvFeePct;

  // Emprunt auto levier
  if (snap._autoLevBase     != null) S._autoLevBase     = snap._autoLevBase;
  if (snap._autoLevBorrowed != null) S._autoLevBorrowed = snap._autoLevBorrowed;

  // Paires dynamiques (créées via DAO)
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

  // Proposals (DAO + paires)
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
