// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09-core-runtime.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Module central du runtime AURA8. Contient le cœur de l'exécution :
//   - Démarrage de l'app (init)
//   - Persistance d'état (load/save/buildSnapshot/import/export)
//   - Ouverture des positions bot (autoOpenPosition)
//   - Moteur PaperReal (TP/SL ATR, refus contextuel, corrélation, GARCH)
//   - Garde-fous (stop urgence Plein régime, watchdog manuel, perf paires)
//   - Rendu UI des cartes home (Action, Manuel, Paires)
//   - Modals (diagnostic, snapshots, "pourquoi cette position")
//   - Exports CSV/JSON
//   - Contrôle de la simulation
//   - Helpers (A/B testing, snapshots auto, validation exposition)
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Variables module-level
// ──────────────────────────────────────────────────────────────────────
const BARS_KEY      = 'nexus_bars_state';   // 'auto' | 'man' | 'param' | 'closed'
const DB_NAME       = 'NEXUS_DB';
const LONG_PRESS_MS = 600;
const SAVE_KEY      = 'nexus_state_v2';     // clé localStorage / IndexedDB
const STORE_FEES    = 'fees';
const STORE_STATE   = 'state';              // snapshot complet pour reprise

let _freshPricesInRow    = 0;               // compteur pour reprise après retour réseau
let _lastRealPriceTs     = Date.now();      // dernier tick de prix RÉEL reçu (CG ou Binance)
let _longPressPair       = null;
let _longPressTimer      = null;
let _net10sSaveTriggered = false;           // sauvegarde déclenchée une fois à 10s offline
let _netOfflineSinceTs   = 0;               // moment du début de la coupure
let _netwatchPausedBot   = false;           // true si on a pausé le bot nous-mêmes
let _netwatchState       = 'online';        // 'online' | 'offline' | 'recovering'
let _simEverStarted      = false;           // vrai après le 1er startSim() → affiche PAUSE au lieu de DÉMARRAGE
let _simInterval         = null;
let _simRunning          = false;


// ════════════════════════════════════════════════════════════════════════
// SECTION PERSISTANCE — refactor propre
// Fonctions : loadState, saveState, buildSnapshot, importState, exportState,
//             saveFeeRecord
// ════════════════════════════════════════════════════════════════════════

function buildSnapshot() {
  const snap = {
    key:          SAVE_KEY,
    savedAt:      new Date().toISOString(),
    version:      2,

    // Portefeuille
    portfolio:       S.portfolio,
    cashAccount:     S.cashAccount,
    tradingAccount:  S.tradingAccount,
    leverage:        S.leverage,
    botAutoMode:     S.botAutoMode,

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

    // Paires — prix, candles, P&L cumulés, trades
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

    // Chain log (50 dernières)
    chainLog: S.chainLog.slice(-50),

    // Stats globales
    totalTrades:     S.totalTrades,
    winTrades:       S.winTrades,
    pnl24h:          S.pnl24h,
    pnlHistory:      S.pnlHistory.slice(-80),
    _startPortfolio: S._startPortfolio || S.portfolio,

    // Version
    vMajor: S.vMajor,
    vMinor: S.vMinor,

    // Réserve levier
    leverageReserve:   S.leverageReserve   || 0,
    leverageBorrowed:  S.leverageBorrowed  || 0,
    leverageTotalFees: S.leverageTotalFees || 0,

    // Comptes Fiat / fiscal / fonds propres
    fiscalReserveAccount: S.fiscalReserveAccount || 0,
    fiscalReserveLog:     (S.fiscalReserveLog || []).slice(0, 200),
    ownFundsInjected:     S.ownFundsInjected || 0,
    ownFundsLog:          (S.ownFundsLog || []).slice(0, 200),
    fiatConvFeePct:       (typeof S.fiatConvFeePct === 'number') ? S.fiatConvFeePct : 0.002,

    // Emprunt auto levier
    _autoLevBase:     S._autoLevBase     || 0,
    _autoLevBorrowed: S._autoLevBorrowed || 0,

    // Best/worst trade par paire
    pairBestWorst: Object.fromEntries(
      Object.entries(S.pairStates).map(([p, ps]) => [p, {
        bestTrade:  ps.bestTrade  || null,
        worstTrade: ps.worstTrade || null
      }])
    ),

    // Mémoires agents
    agentMemories: Object.fromEntries(
      S.agents.map(a => [a.id, (a.memory || []).slice(-30)])
    ),
    globalMemoryPool: S.globalMemoryPool.slice(-50),

    // Dreams
    dreams: S.dreams.slice(-10),

    // Paires dynamiques
    dynamicPairKeys: Object.keys(PAIRS).filter(k => !['BTC/USDT','ETH/USDT','XRP/USDT','SOL/USDT'].includes(k)),
    pairCandidates:  S.pairCandidates,
    proposals:       S.proposals.slice(-20),

    // Intelligence + contrôle
    heatmap:          S.heatmap          || { byHour:{}, byWeekday:{} },
    shadow:           S.shadow           || {},
    dreamJournal:     (S.dreamJournal    || []).slice(-40),
    decisionCascade:  (S.decisionCascade || []).slice(-15),
    resonanceHistory: (S.resonanceHistory|| []).slice(-15),
    archives:         S.archives         || { snapshots:[], totalResets:0 },
    brainLog:         (S.brainLog        || []).slice(-30),
    pendingActions:   (S.pendingActions  || []).slice(-10),
    mutedAgents:      S.mutedAgents      || [],
    botFleet:         S.botFleet         || {},
    agentLessons:     (S.agentLessons    || []).slice(-30),

    // Mode trading
    tradingMode:       S.tradingMode       || 'sim',
    realTimeframe:     S.realTimeframe     || '15m',
    realActivePairs:   S.realActivePairs   || {},
    agentLessonsReal:  (S.agentLessonsReal || []).slice(-30),
    realKillSwitch:    S.realKillSwitch    || {},
    realModeStartedAt: S.realModeStartedAt || 0,
    realStatsByPair:   S.realStatsByPair   || {},

    // Snapshot pré-réel : persisté uniquement quand le mode est actif (sa cible de rollback)
    preRealSnapshot: (S.tradingMode === 'real') ? (S.preRealSnapshot || null) : null,

    // PaperReal
    agentLessonsPaperReal:     (S.agentLessonsPaperReal || []).slice(-30),
    paperRealStats:            S.paperRealStats || {},
    paperRealActivePairs:      S.paperRealActivePairs || {},
    paperRealTimeframe:        S.paperRealTimeframe || '15m',
    paperRealStartedAt:        S.paperRealStartedAt || 0,
    paperRealKillSwitch:       S.paperRealKillSwitch || {},
    paperRealLastClose:        S.paperRealLastClose || {},
    paperRealConsecLosses:     S.paperRealConsecLosses || 0,
    paperRealGlobalPauseUntil: S.paperRealGlobalPauseUntil || 0,
    paperRealConfig:           S.paperRealConfig || {},
    adaptiveState:             S.adaptiveState || {},
    tradeContextMemory:        (S.tradeContextMemory || []).slice(-500),
    abTesting:                 S.abTesting || null,
    pnlPeriod:                 S.pnlPeriod || null,

    // Snapshot pré-réel jumeau paperReal : persisté uniquement en mode paperReal
    preRealSnapshotPaperReal: (S.tradingMode === 'paperReal') ? (S.preRealSnapshotPaperReal || null) : null,

    // Compounding et générations
    _totalCompounded: S._totalCompounded || 0,
    _genCount:        S._genCount        || 0,

    // Bougies temps réel — limité à 100 par paire/intervalle pour borner la taille
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
window.buildSnapshot = buildSnapshot;


async function saveState(silent = false) {
  const snap = buildSnapshot();

  // 1. IndexedDB (principal)
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
  } catch (e) {
    // 2. localStorage fallback
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
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
      try { indexedDB.deleteDatabase(DB_NAME); } catch (e) {}

      return false;
    }
  } catch (e) {}

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
  } catch (e) {
    // IndexedDB indisponible
  }

  // Fallback localStorage
  if (!snap) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
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
        showToast('❌ Fichier invalide ou trop ancien', 4000, 'user');
        return;
      }

      const confirmed = confirm(
        'Restaurer cette sauvegarde ?\n\n' +
        'Cycle : #'        + (snap.cycle || '?') + '\n' +
        'Trades : '        + (snap.totalTrades || 0) + '\n' +
        'Portefeuille : '  + (snap.portfolio ? snap.portfolio.toFixed(2) : 0) + ' USDT\n' +
        'Sauvegardé : '    + (snap.savedAt ? new Date(snap.savedAt).toLocaleString() : '?') + '\n\n' +
        "L'état actuel sera remplacé."
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
          tx.onerror    = res;
        });
      } catch (dbErr) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch (lsErr) {}
      }

      const ok = await loadState();

      if (ok) {
        if (typeof renderAll === 'function') renderAll();
        showToast('✅ Session restaurée depuis fichier · cycle #' + S.cycle, 5000, 'user');
        S.chainLog.push({
          icon: '📥',
          desc: 'Session importée depuis fichier · cycle #' + S.cycle,
          hash: rndHash(),
          time: nowStr()
        });
      } else {
        showToast('⚠ Restauration partielle', 4000, 'user');
      }
    } catch (err) {
      console.error('Import failed', err);
      showToast('❌ Import échoué : fichier illisible', 4000, 'user');
    }
  };

  input.click();
}
window.importState = importState;


function exportState(silent) {
  try {
    const snap = buildSnapshot();

    // Métadonnées lisibles ajoutées à la racine du fichier exporté
    snap._export = {
      version:     S.vMajor + '.' + S.vMinor,
      exportedAt:  new Date().toISOString(),
      portfolio:   S.portfolio,
      cycle:       S.cycle,
      totalTrades: S.totalTrades,
      winRate:     S.totalTrades > 0 ? Math.round(S.winTrades / S.totalTrades * 100) : 0
    };

    const json = JSON.stringify(snap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const d    = new Date();
    const stamp = d.getFullYear() + '-' +
                  String(d.getMonth() + 1).padStart(2, '0') + '-' +
                  String(d.getDate()).padStart(2, '0')     + '_' +
                  String(d.getHours()).padStart(2, '0')    +
                  String(d.getMinutes()).padStart(2, '0');

    a.href     = url;
    a.download = 'nexus_save_' + stamp + '_cycle' + S.cycle + '.json';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showToast('💾 Sauvegarde exportée : ' + a.download, 4000, 'user');
    return true;
  } catch (e) {
    console.error('Export failed', e);
    showToast('❌ Export échoué : ' + e.message, 4000, 'user');
    return false;
  }
}
window.exportState = exportState;


async function saveFeeRecord(feeRecord) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FEES, 'readwrite');
    tx.objectStore(STORE_FEES).add({
      ...feeRecord,
      savedAt: new Date().toISOString(),
      region:  S.taxConfig.region
    });
  } catch (e) {
    // IndexedDB indisponible — on ne logge pas chaque fee individuel pour éviter le spam
  }
}
window.saveFeeRecord = saveFeeRecord;
// ════════════════════════════════════════════════════════════════════════
// SECTION autoOpenPosition — ouverture position en mode bot
// ════════════════════════════════════════════════════════════════════════

function autoOpenPosition(pair, side, stakeOverride) {

  // Gate global : le bot n'agit que si AUTO est activé
  if (S.botAutoMode === false) return;

  // Sauvegarde de sécurité avant action bot
  try {
    if (typeof _p5PreActionSave === 'function') _p5PreActionSave('open_bot');
  } catch (e) {}

  // Gate réseau : pas d'ouverture pendant une coupure Internet
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

  // ──────────────────────────────────────────────────────────────
  // Veille Marché — ajustement et blocage selon sentiment global
  // ──────────────────────────────────────────────────────────────
  if (S.veilleData && typeof S.veilleData.sentimentScore === 'number') {
    const sentTs    = S.veilleData.sentimentTs || 0;
    const sentFresh = (Date.now() - sentTs) < 30 * 60 * 1000;

    if (sentFresh) {
      const sent = S.veilleData.sentimentScore;

      // Blocage sur sentiment extrême contraire au trade
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

      // Ajustement de la mise selon le sentiment (±30%)
      if (!stakeOverride && S.pairStates[pair]) {
        const ps = S.pairStates[pair];
        const baseMise = ps.stake || 10;
        let mult = 1.0;
        if      (sent >= 50)  mult = 1.3;
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

  // Gates paire : pause auto / contrôle manuel / position déjà ouverte
  if (typeof _isPairPaused === 'function' && _isPairPaused(pair)) return;
  if (typeof _isPairManual === 'function' && _isPairManual(pair)) return;

  const already = S.openPositions.find(p => p.pair === pair);
  if (already) return;

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

  // Filtre série de pertes : 3 pertes consécutives → pause 30 min
  if (!S._lossStreaks) S._lossStreaks = {};
  const streak = S._lossStreaks[pair];

  // Blacklist dynamique : WR insuffisant
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

  // Signaux techniques et fondamentaux — pré-calculés pour les vétos et le brain gate
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;

  // ──────────────────────────────────────────────────────────────
  // Veto RSI anti-suicide : éviter les trades à contre-courant des
  // extrêmes (rebond probable en sur-vente, correction en sur-achat)
  // ──────────────────────────────────────────────────────────────
  try {
    const closes = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');
    if (closes.length >= 15) {
      const cl = closes.slice(-20);
      let g = 0, l = 0;
      for (let i = 1; i <= 14; i++) { const d = cl[i] - cl[i-1]; d > 0 ? g += d : l -= d; }
      let ag = g / 14, al = l / 14;
      for (let i = 15; i < cl.length; i++) {
        const d = cl[i] - cl[i-1];
        ag = (ag * 13 + (d > 0 ? d : 0)) / 14;
        al = (al * 13 + (d < 0 ? -d : 0)) / 14;
      }
      const rsi = al ? 100 - (100 / (1 + ag / al)) : 100;

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
  } catch (e) {}

  // ──────────────────────────────────────────────────────────────
  // Veto cohérence régime / side : bloque les trades contraires au
  // régime global sauf signal RSI fort confirmant le retournement
  // ──────────────────────────────────────────────────────────────
  try {
    const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';

    // Vétos uniquement sur régimes purs (volatile_* et calm autorisent tout)
    if (regime === 'bear' || regime === 'bull') {
      const closesC = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');
      let rsiC = 50;
      if (closesC.length >= 15) {
        const clC = closesC.slice(-20);
        let gC = 0, lC = 0;
        for (let i = 1; i <= 14; i++) { const d = clC[i] - clC[i-1]; d > 0 ? gC += d : lC -= d; }
        let agC = gC / 14, alC = lC / 14;
        for (let i = 15; i < clC.length; i++) {
          const d = clC[i] - clC[i-1];
          agC = (agC * 13 + (d > 0 ? d : 0)) / 14;
          alC = (alC * 13 + (d < 0 ? -d : 0)) / 14;
        }
        rsiC = alC ? 100 - (100 / (1 + agC / alC)) : 100;
      }

      // BEAR + LONG : requiert un signal fort de sur-vente (RSI < 35)
      if (regime === 'bear' && side === 'long' && rsiC >= 35) {
        S.chainLog.push({
          icon: '⊗',
          desc: `Veto régime · ${pair} LONG bloqué · marché BEAR + RSI ${rsiC.toFixed(0)} (pas de signal rebond)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;
      }
      // BULL + SHORT : requiert un signal fort de sur-achat (RSI > 65)
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
  } catch (e) {}

  // ──────────────────────────────────────────────────────────────
  // Veto volume anormalement bas : évite les marchés morts où les
  // signaux sont faussés par le manque de liquidité
  // ──────────────────────────────────────────────────────────────
  try {
    const vols = (ps.candles || []).slice(-20).map(c => c.v).filter(v => typeof v === 'number' && v > 0);
    if (vols.length >= 10) {
      const avgVol    = vols.reduce((a, b) => a + b, 0) / vols.length;
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
  } catch (e) {}

  // ──────────────────────────────────────────────────────────────
  // Veto volatilité excessive : évite les pics de volatilité pièges
  // (news, flash crashes) où l'ATR récent dépasse 2.5× la moyenne
  // ──────────────────────────────────────────────────────────────
  try {
    const candles = (ps.candles || []).slice(-20);
    if (candles.length >= 15) {
      const atrs = candles.map(c => (c.h && c.l) ? (c.h - c.l) : 0).filter(v => v > 0);
      if (atrs.length >= 10) {
        const avgATR  = atrs.reduce((a, b) => a + b, 0) / atrs.length;
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
  } catch (e) {}

  // Règle métier absolue : le bot utilise SEULEMENT tradingAccount — jamais cashAccount
  let baseStake = stakeOverride != null
    ? Math.max(10, Math.round(stakeOverride * 10) / 10)
    : Math.max(10, ps.stake || 10);

  // ──────────────────────────────────────────────────────────────
  // Brain Gate — analyse du roster d'agents qui filtre le trade
  // ──────────────────────────────────────────────────────────────
  let _brainVeto = false, _brainReason = '', _brainMult = 1.0, _brainSideFlip = false;

  if (typeof runRosterAnalysis === 'function') {
    try {
      const roster = runRosterAnalysis(pair);
      S._lastBrainAnalysis = roster;

      // 1. HARD VETO — n'importe quel guardian peut bloquer le trade
      if (roster.anyVeto) {
        const vetoers = Object.entries(roster.guardianResults)
          .filter(([, g]) => g.status === 'veto')
          .map(([id, g]) => {
            const a = (S.agents || []).find(x => x.id === id);
            return (a?.emoji || '') + ' ' + (a?.name || id) + ' : ' + g.reasoning;
          });
        _brainVeto   = true;
        _brainReason = vetoers.join(' · ');
        if (!S.brainLog) S.brainLog = [];
        S.brainLog.unshift({ ts: Date.now(), pair, event: 'VETO', side, reason: _brainReason });
        if (S.brainLog.length > 30) S.brainLog.length = 30;
      }

      // 2. SIDE FLIP — coalition oppose avec forte conviction → inverse le side
      if (!_brainVeto && roster.coalition) {
        const rosterSide = roster.verdict === 'LONG' ? 'long'
                         : roster.verdict === 'SHORT' ? 'short'
                         : null;
        if (rosterSide && rosterSide !== side && roster.consensus >= 0.6) {
          _brainSideFlip = true;
          side = rosterSide;
          _brainReason = `Coalition ${roster.verdict} renversé · consensus ${(roster.consensus * 100).toFixed(0)}%`;
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event: 'FLIP', side, reason: _brainReason });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }

      // 3. Modulation du stake selon le consensus
      if (!_brainVeto) {
        if (roster.coalition && roster.consensus >= 0.7)      _brainMult = 1.25;
        else if (roster.coalition)                             _brainMult = 1.10;
        else if (roster.consensus < 0.30)                      _brainMult = 0.70;
        // Pas de réduction sur HOLD majority — LMSR peut encore donner un signal valable

        if (_brainMult !== 1.0) {
          baseStake = Math.max(10, Math.round(baseStake * _brainMult * 10) / 10);
        }
      }

      // 4. SKIP si tout le conseil vote HOLD ET LMSR neutre ET pas de conviction externe forte
      const externalConvStrong = (tech?.atScore && Math.abs(tech.atScore) >= 0.35);
      if (!_brainVeto && roster.votes.hold === roster.votes.total && !externalConvStrong) {
        const lmsrNeutral = Math.abs(lmsrP(ps) - 0.5) < 0.08;
        if (lmsrNeutral) {
          _brainVeto   = true;
          _brainReason = 'Conseil HOLD + LMSR neutre · pas de signal';
          if (!S.brainLog) S.brainLog = [];
          S.brainLog.unshift({ ts: Date.now(), pair, event: 'SKIP', side, reason: _brainReason });
          if (S.brainLog.length > 30) S.brainLog.length = 30;
        }
      }
    } catch (e) {
      console.warn('brain gate error:', e);
    }
  }

  // Veto déclenché → on abandonne
  if (_brainVeto) {
    if (typeof showToast === 'function') {
      showToast('🧠 Brain Gate · ' + (_brainReason.length > 60 ? _brainReason.slice(0, 57) + '…' : _brainReason));
    }
    return;
  }

  // Smart Sizer applique le multiplicateur Kelly AVANT les checks d'exposition
  if (typeof runBotFleet === 'function') {
    try {
      const fleetResult = runBotFleet('pre_trade', { stake: baseStake });
      if (fleetResult?.sizer?.mult && Math.abs(fleetResult.sizer.mult - 1) > 0.01) {
        const adjusted = baseStake * fleetResult.sizer.mult;
        baseStake = Math.max(10, Math.round(adjusted * 10) / 10);
      }
    } catch (e) {}
  }

  // Fallback levier si compte trading vide
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
  } else {
    if (baseStake > S.tradingAccount * 0.95) {
      baseStake = Math.max(10, Math.floor(S.tradingAccount * 0.25 / 10) * 10);
    }
  }

  // Levier bonus : emprunté de leverageReserve si conviction élevée
  const bonusAvailable = ps._leverageBonus || 0;
  const levBorrowed    = bonusAvailable > 0 ? borrowLeverage(bonusAvailable, pair) : 0;

  // ──────────────────────────────────────────────────────────────
  // Validation capital global avec anticipation levier
  // ──────────────────────────────────────────────────────────────
  const _convForValidate = (typeof effectiveConviction === 'number' ? effectiveConviction : null)
                           ?? (typeof lmsrP === 'function' && ps ? lmsrP(ps) : 0.5);
  let capCheck = validateTotalExposure(baseStake, levBorrowed, _convForValidate);

  if (!capCheck.ok) {
    // En mode auto, avant de suspendre, tenter de monter l'index levier
    if (S.botAutoMode === true && (S.leverage || 0) < (S.leverageMaxMult || 10)) {
      const prevIdx    = S.leverage || 0;
      const tryIndexes = [prevIdx + 1, prevIdx + 2, prevIdx + 3].filter(i => i <= (S.leverageMaxMult || 10));

      for (const newIdx of tryIndexes) {
        try {
          if (typeof setLeverageByBot === 'function') {
            setLeverageByBot(newIdx, `anticipation capital pour ${pair}`);
          }
          capCheck = validateTotalExposure(baseStake, levBorrowed);
          if (capCheck.ok) {
            S.chainLog.push({
              icon: '🤖⚡',
              desc: `Bot anticipation: levier ${prevIdx}→${newIdx} pour ouvrir ${pair}`,
              hash: rndHash(), time: nowStr()
            });
            break;
          }
        } catch (e) {
          console.warn('bot leverage anticipation:', e);
        }
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
  const amount    = (stakeUsdt / Math.max(0.0001, ps.price)).toFixed(cfg.dec >= 4 ? 4 : 6);
  const id        = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // ──────────────────────────────────────────────────────────────
  // Déduction des comptes : trading OU levier emprunté
  // ──────────────────────────────────────────────────────────────
  let _jitBorrowed = 0;

  if (_useLeverageForStake) {
    // Garde-fou : pas d'emprunt si levier ×0
    if ((S.leverage || 0) === 0) return;

    S.leverageBorrowed = (S.leverageBorrowed || 0) + baseStake;
    S._autoLevBorrowed = (S._autoLevBorrowed || 0) + baseStake;
    S.leverageReserve  = Math.max(0, (S.leverageReserve || 0) - baseStake);
    _jitBorrowed       = baseStake;
  } else {
    // Emprunt JIT si le bot a besoin de plus que ce qui est dispo en trading
    try {
      if ((S.leverage || 0) >= 1 && baseStake > (S.tradingAccount || 0)) {
        const res = ensureLeverageCoverForTrade(baseStake, pair);
        if (res && res.ok && res.borrowed > 0) {
          _jitBorrowed = res.borrowed;
        }
      }
    } catch (e) {
      console.warn('bot auto-leverage:', e);
    }
    S.tradingAccount = Math.max(0, S.tradingAccount - baseStake);
  }

  S.portfolio = S.cashAccount + S.tradingAccount;

  // Consommer le pending de borrow pour qu'il ne reste pas en suspens
  if (S._pendingPositionBorrow) {
    _jitBorrowed = Math.max(_jitBorrowed, S._pendingPositionBorrow);
    S._pendingPositionBorrow = 0;
  }

  // ──────────────────────────────────────────────────────────────
  // Création de la position
  // ──────────────────────────────────────────────────────────────
  S.openPositions.push({
    id, pair, side,
    entryPrice:    ps.price,
    openedAt:      Date.now(),
    amount:        parseFloat(amount),
    stakeUsdt:     baseStake,                       // mise propre (sans levier)
    levBorrowed:   (levBorrowed || 0) + _jitBorrowed,
    totalExposure: stakeUsdt,                       // exposition totale (stake + levier)
    entryTime:     nowStr(),
    entryTs:       Date.now(),
    pnl:           0,
    pnlUsdt:       0,
    currentVal:    stakeUsdt,
    auto:          true,
    tp:            null,
    sl:            null,
    _paperRealMode: (S.tradingMode === 'paperReal'),
    _holdCycles:   0,
    conviction:    (typeof effectiveConviction !== 'undefined' ? effectiveConviction : lmsrP(ps)) || 0,
    _peakPnl:      0,

    // Capture du contexte pour la mémoire (mode paperReal uniquement)
    _contextId: (function() {
      if (S.tradingMode !== 'paperReal') return null;
      try {
        const ctx = _captureTradeContext(pair, side, baseStake);
        if (ctx) {
          _addTradeContextToMemory(ctx);
          return ctx.contextId;
        }
      } catch (e) {}
      return null;
    })(),

    // A/B testing : assigner une variante
    _abArm: (function() {
      if (S.tradingMode !== 'paperReal') return null;
      try {
        return _abAssignArm();
      } catch (e) {}
      return null;
    })(),

    _openReason:
      `${_brainSideFlip ? '🔄 FLIP · ' : ''}${_brainMult !== 1.0 ? '×' + _brainMult.toFixed(2) + ' · ' : ''}` +
      `LMSR ${(lmsrP(ps) * 100).toFixed(0)}% · ${side === 'long' ? '↑ LONG' : '↓ SHORT'}` +
      `${(S._lastBrainAnalysis?.coalition) ? ' · 🤝 Coalition' : ''}`,

    _openAgents:
      [...S.agents]
        .filter(a => !a.isBot && !a.isMeta && Math.abs(a.score || 0) > 0.1)
        .sort((a, b) => Math.abs(b.score || 0) * b.fitness - Math.abs(a.score || 0) * a.fitness)
        .slice(0, 5)
        .map(a => ({
          emoji: a.emoji,
          name:  a.name.split(' ')[0].split('·')[0].trim(),
          score: a.score || 0
        }))
  });

  // Enregistrement de la cascade de décision (utilise baseStake, la mise réelle)
  if (typeof recordDecisionCascade === 'function') {
    recordDecisionCascade(pair, side, baseStake, 'auto');
  }

  // Trace dans l'historique de la paire
  ps.trades.push({
    side:          side === 'long' ? 'buy' : 'sell',
    type:          'open',
    amount:        String(amount),
    price:         ps.price,
    pnl:           0,
    stakeUsdt:     baseStake,
    levBorrowed,
    totalExposure: stakeUsdt,
    pnlUsdt:       null,
    fee:           null,
    ts:            Date.now(),
    time:          nowStr()
  });
  if (ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);

  updatePairBtnStates();
}
window.autoOpenPosition = autoOpenPosition;
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
// ════════════════════════════════════════════════════════════════════════
// SECTION Garde-fous
// Trois protections qui tournent en boucle pour automatiser des fermetures
// ou pauses quand certaines limites sont atteintes :
//  - _fpEmergencyCheck         : stop d'urgence Plein Régime sur drawdown
//  - _manConsignesWatchdog     : garde-fou positions manuelles (perte/timeout)
//  - _evaluatePairPerformance  : pause/reprise auto d'une paire selon WR
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Stop d'urgence Plein Régime
// Si le drawdown depuis l'activation atteint -5%, on coupe tout :
// désactivation du mode, fermeture de toutes les positions ouvertes,
// reset du snapshot pour permettre une réactivation manuelle propre.
// ──────────────────────────────────────────────────────────────────────
function _fpEmergencyCheck() {
  if (!S.fullPowerMode || !S._fpInitialCapital || S._fpStopTriggered) return;

  const curCap       = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  const latentPnl    = (S.openPositions || []).reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const effectiveCap = curCap + latentPnl;
  const drawdown     = (S._fpInitialCapital - effectiveCap) / S._fpInitialCapital;

  if (drawdown >= 0.05) {  // seuil critique : -5%
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
      } catch (e) {
        console.warn('FP emergency close:', e);
      }
    });

    // 3. Log + toast
    S.chainLog.push({
      icon: '🚨',
      desc: `STOP D'URGENCE · Plein régime désactivé · drawdown ${(drawdown*100).toFixed(1)}% · ${positionsToClose.length} position(s) fermée(s)`,
      hash: rndHash(), time: nowStr()
    });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);

    if (typeof showToast === 'function') {
      showToast(
        '🚨 STOP URGENCE · −' + (drawdown*100).toFixed(1) + '% · Plein régime OFF + ' + positionsToClose.length + ' position(s) fermée(s)',
        5000, 'critical'
      );
    }

    // Reset du snapshot pour réactivation manuelle propre
    S._fpInitialCapital = null;
  }
}
window._fpEmergencyCheck = _fpEmergencyCheck;


// ──────────────────────────────────────────────────────────────────────
// Garde-fou positions manuelles
// Surveille les positions ouvertes en mode manuel et les ferme si :
//  - la perte dépasse le % max configuré (par défaut 2% du trading account)
//  - OU la durée dépasse le timeout configuré (par défaut 60 min)
// ──────────────────────────────────────────────────────────────────────
function _manConsignesWatchdog() {
  const positions = (S.openPositions || []).filter(p => p.auto !== true);

  positions.forEach(pos => {
    const pnlUsd     = pos.pnlUsdt || 0;
    const openedAt   = pos._manOpenedAt || pos.openedAt || pos.entryTs || Date.now();
    const elapsedMin = (Date.now() - openedAt) / 60000;

    const maxLossPct = pos._manMaxLossPct || 2.0;
    const timeoutMin = pos._manTimeoutMin || 60;

    // Perte exprimée en % du trading account
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
      } catch (e) {
        console.warn('man watchdog:', e);
      }
    }
  });
}
window._manConsignesWatchdog = _manConsignesWatchdog;


// ──────────────────────────────────────────────────────────────────────
// Évaluation périodique des performances par paire
// Tous les 50 trades clôturés sur une paire, on calcule le WR :
//  - WR < 40% → pause auto de la paire (signalée dans chainLog)
//  - WR >= 50% → reprise de la paire si elle était en pause
// Entre 40% et 50% : on ne change rien (zone neutre, évite oscillations).
// ──────────────────────────────────────────────────────────────────────
function _evaluatePairPerformance() {
  if (!S._pausedPairs)        S._pausedPairs        = {};
  if (!S._pairLastEvalCount)  S._pairLastEvalCount  = {};

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

      // Pause si WR insuffisant
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
      }
      // Reprise si WR remonté
      else if (winRate >= 50 && S._pausedPairs[pair]) {
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
// ════════════════════════════════════════════════════════════════════════
// SECTION UI Bricks
// Rendu des cartes (briques) du home : Action, Manuel, Paires.
// Chaque type a un build* (création initiale) et un update* (rafraîchissement).
//  - buildActionBricks / updateActionBricks   : vue principale "Actions"
//  - buildManBricks    / updateManBricks      : vue "Manuel"
//  - buildPairBricks   / updatePairBricks     : vue "Paires" (avec TP/SL)
//  - ac2UpdateXInd(pair)       : RSI/momentum/régime/streak pour brique Action
//  - _attachLongPressToBricks  : long-press pour fermer une position
//  - _updateAutoBarCounters    : compteurs des barres auto/man
//  - _restoreAutoBarState      : restaure l'état ouvert/fermé des barres
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Construction initiale des briques "Action" (vue principale)
// ──────────────────────────────────────────────────────────────────────
function buildActionBricks() {
  const grid = document.getElementById('actionBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.createElement('div');
    brick.className = 'action-brick sig-hold';
    brick.id        = 'actbrick_' + pairKey;
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


// ──────────────────────────────────────────────────────────────────────
// Rafraîchissement des briques "Action" à chaque tick
// Met à jour prix, signal, LMSR, WR, RSI dot, sparkline, conviction.
// ──────────────────────────────────────────────────────────────────────
function updateActionBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.getElementById('actbrick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl   = document.getElementById('abpx_'   + pairKey);
    const sigEl  = document.getElementById('absig_'  + pairKey);
    const lmsrEl = document.getElementById('ablmsr_' + pairKey);
    const wrEl   = document.getElementById('abwr_'   + pairKey);
    const trEl   = document.getElementById('abtr_'   + pairKey);

    // ── État PAUSED ──
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'action-brick sig-hold paused';
      if (pxEl) {
        const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
        pxEl.textContent = priceStr;
      }
      if (sigEl)  sigEl.textContent  = '⏸ PAUSE';
      if (lmsrEl) lmsrEl.textContent = '—';
      if (wrEl)   { wrEl.textContent = '—'; wrEl.className = 'ab-wr'; }
      if (trEl)   trEl.textContent   = '';
      return;
    }

    // Prix + %24h
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24    = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // Probabilité LMSR (conviction du marché de prédiction interne)
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const pct  = prob * 100;

    // Positions ouvertes sur cette paire (manuel ou bot)
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    const botPos    = (S.openPositions || []).find(p => p.pair === pair && p.auto === true);

    // Détermination du signal et de la classe visuelle
    let sigText, brickCls;
    if (manualPos) {
      sigText  = (manualPos.side === 'long' ? '🔒 LONG' : '🔒 SHORT');
      brickCls = manualPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (botPos) {
      sigText  = (botPos.side === 'long' ? '🟢 LONG' : '🔴 SHORT');
      brickCls = botPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (prob > 0.6) {
      sigText  = '🤖 BUY';
      brickCls = 'action-brick sig-buy';
    } else if (prob < 0.4) {
      sigText  = '🤖 SELL';
      brickCls = 'action-brick sig-sell';
    } else {
      sigText  = 'HOLD';
      brickCls = 'action-brick sig-hold';
    }
    brick.className = brickCls;

    if (sigEl) sigEl.textContent = sigText;

    // Affichage LMSR conviction
    if (lmsrEl) {
      const arrow = pct >= 50 ? '↑' : '↓';
      lmsrEl.textContent = arrow + pct.toFixed(0) + '%';
    }

    // Win rate
    if (wrEl) {
      const pWin = ps.totalTrades > 0 ? Math.round(ps.winTrades / ps.totalTrades * 100) : null;
      if (pWin !== null) {
        wrEl.textContent = pWin + '% WR';
        wrEl.className   = 'ab-wr ' + (pWin >= 60 ? 'good' : pWin >= 40 ? 'mid' : 'bad');
      } else {
        wrEl.textContent = '— WR';
        wrEl.className   = 'ab-wr';
      }
    }

    // Compteur de trades
    if (trEl) {
      trEl.textContent = (ps.totalTrades || 0) + ' tr';
      trEl.style.color = 'var(--t3)';
    }

    // ── Sparkline de fond ──
    if (ps.candles && ps.candles.length >= 2) {
      let sparkColor = cfg.color;
      if      (prob > 0.6) sparkColor = '#00e87a';
      else if (prob < 0.4) sparkColor = '#ff3d6b';
      _drawSparkline('abspark_' + pairKey, ps.candles, sparkColor, prob >= 0.5);
    }

    // ── RSI dot adaptatif ──
    const rsiDot = document.getElementById('abrsi_' + pairKey);
    if (rsiDot) {
      const rsi = _computeRSI14(ps.candles);
      if (rsi !== null) {
        let rsiCls = 'neutral';
        if      (rsi < 30) rsiCls = 'oversold';    // signal LONG potentiel
        else if (rsi > 70) rsiCls = 'overbought';  // signal SHORT potentiel
        rsiDot.className = 'ab-rsi-dot ' + rsiCls;
        rsiDot.title     = 'RSI ' + rsi.toFixed(0);
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


// ──────────────────────────────────────────────────────────────────────
// Construction initiale des briques "Manuel"
// ──────────────────────────────────────────────────────────────────────
function buildManBricks() {
  const grid = document.getElementById('manBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.createElement('div');
    brick.className = 'man-brick';
    brick.id        = 'manbrick_' + pairKey;
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


// ──────────────────────────────────────────────────────────────────────
// Rafraîchissement des briques "Manuel"
// Affiche soit la position manuelle active, soit la suggestion du bot
// ──────────────────────────────────────────────────────────────────────
function updateManBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.getElementById('manbrick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl    = document.getElementById('mbpx_'    + pairKey);
    const sugEl   = document.getElementById('mbsug_'   + pairKey);
    const pnlEl   = document.getElementById('mbpnl_'   + pairKey);
    const badgeEl = document.getElementById('mbbadge_' + pairKey);

    // État pause
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'man-brick paused';
      return;
    }

    // Prix + %24h
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24    = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // Sparkline de fond
    if (ps.candles && ps.candles.length >= 2) {
      _drawSparkline('mbspark_' + pairKey, ps.candles, cfg.color, true);
    }

    // Suggestion du bot basée sur LMSR
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    let suggestedSide      = 'hold';
    let suggestedSideLabel = 'HOLD';
    if      (prob > 0.55) { suggestedSide = 'bull'; suggestedSideLabel = '↑ LONG'; }
    else if (prob < 0.45) { suggestedSide = 'bear'; suggestedSideLabel = '↓ SHORT'; }

    // Position manuelle sur cette paire ?
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);

    if (manualPos) {
      // Position manuelle active
      const pnlUsd  = manualPos.pnlUsdt || 0;
      const pnlPct  = manualPos.pnl     || 0;
      const isWin   = pnlUsd >= 0;
      const side    = manualPos.side === 'long' ? '↑ LONG' : '↓ SHORT';
      const sideCls = manualPos.side === 'long' ? 'has-pos-long' : 'has-pos-short';
      brick.className = 'man-brick ' + sideCls;

      if (badgeEl) badgeEl.textContent = side;

      if (sugEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign   = pnlUsd >= 0 ? '+' : '';
        sugEl.innerHTML = `<span style="color:var(--t2);">Mise $${(manualPos.stakeUsdt || 0).toFixed(0)}</span> · <span style="color:${pnlCol};font-weight:700;">${sign}${pnlPct.toFixed(2)}%</span>`;
      }

      if (pnlEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign   = pnlUsd >= 0 ? '+' : '';
        pnlEl.innerHTML = `<span style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)}</span>`;
      }
    } else {
      // En veille — suggestion du bot
      brick.className = 'man-brick';
      if (badgeEl) badgeEl.textContent = 'PRÉT';

      // Calcul de la mise suggérée selon conviction + ATR
      const atr        = ps.atr || 0.01;
      const conviction = Math.abs(prob - 0.5) * 2;
      const baseStake  = Math.max(10, Math.round((S.tradingAccount || 100) * 0.05));   // 5% par défaut
      const suggStake  = Math.min(baseStake * (1 + conviction), (S.tradingAccount || 100) * 0.15);

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


// ──────────────────────────────────────────────────────────────────────
// Construction initiale des briques "Paires" (vue détaillée avec TP bar)
// ──────────────────────────────────────────────────────────────────────
function buildPairBricks() {
  const grid = document.getElementById('pairBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.createElement('div');
    brick.className = 'pair-brick brick-idle';
    brick.id        = 'brick_' + pairKey;
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


// ──────────────────────────────────────────────────────────────────────
// Rafraîchissement des briques "Paires"
// Affichage différencié selon état : position active / en veille / paused
// ──────────────────────────────────────────────────────────────────────
function updatePairBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.getElementById('brick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl  = document.getElementById('pbpx_'  + pairKey);
    const stEl  = document.getElementById('pbst_'  + pairKey);
    const pnlEl = document.getElementById('pbpnl_' + pairKey);
    const cdEl  = document.getElementById('pbcd_'  + pairKey);

    // Prix (toujours affiché)
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24    = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // État paused (priorité absolue)
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'pair-brick brick-paused';
      if (stEl)  stEl.innerHTML  = '<span style="color:var(--t3);">Sous-performance</span>';
      if (pnlEl) pnlEl.innerHTML = '<span class="pb-idle-pnl">Désactivée auto</span>';
      if (cdEl)  cdEl.textContent = '';
      return;
    }

    // Position ouverte sur cette paire ?
    const pos = (S.openPositions || []).find(p => p.pair === pair);

    if (pos) {
      // ── Position active ──
      const sideLabel = pos.side === 'long' ? 'LONG' : 'SHORT';
      const sideArrow = pos.side === 'long' ? '↑' : '↓';
      const sideCol   = pos.side === 'long' ? 'var(--up)' : 'var(--down)';
      const stakeStr  = '$' + (pos.stakeUsdt || 0).toFixed(0);
      const pnlUsd    = pos.pnlUsdt || 0;
      const pnlPct    = pos.pnl     || 0;
      const isWin     = pnlUsd >= 0;

      // Classe d'état pour pulsation visuelle
      let stateCls = 'brick-idle';
      if      (pos.side === 'long'  && isWin)  stateCls = 'brick-long-win';
      else if (pos.side === 'long'  && !isWin) stateCls = 'brick-long-loss';
      else if (pos.side === 'short' && isWin)  stateCls = 'brick-short-win';
      else                                      stateCls = 'brick-short-loss';
      brick.className = 'pair-brick ' + stateCls;

      // Statut
      if (stEl) {
        stEl.innerHTML = `<span class="pb-side" style="color:${sideCol};">${sideArrow}${sideLabel}</span><span class="pb-sep">·</span><span class="pb-stake">${stakeStr}</span>`;
      }

      // P&L
      if (pnlEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign   = pnlUsd >= 0 ? '+' : '';
        pnlEl.innerHTML = `
          <span style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)}</span>
          <span class="pb-pnl-pct">${sign}${pnlPct.toFixed(2)}%</span>
        `;
      }

      // Countdown : temps écoulé + temps restant estimé selon conviction
      if (cdEl) {
        const elapsedMs  = Date.now() - (pos.openedAt || pos.entryTs || Date.now());
        const elapsedMin = Math.floor(elapsedMs / 60000);
        const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
        const elapsedStr = elapsedMin + ':' + String(elapsedSec).padStart(2, '0');

        const conv       = pos.conviction || 0.4;
        const maxCycles  = Math.ceil(8 / Math.max(0.1, conv));
        const cyclesUsed = pos._holdCycles || 0;
        const cyclesLeft = Math.max(0, maxCycles - cyclesUsed);
        const remainingMs= cyclesLeft * 160000;
        const remMin     = Math.floor(remainingMs / 60000);

        cdEl.innerHTML = `⏱ ${elapsedStr} <span style="color:var(--t3);opacity:.5;">·</span> ~${remMin}m`;
      }
    } else {
      // ── En veille ──
      brick.className = 'pair-brick brick-idle';
      if (stEl)  stEl.innerHTML  = '<span style="color:var(--t3);">En veille</span>';
      if (pnlEl) pnlEl.innerHTML = '<span class="pb-idle-pnl">Aucune position</span>';
      if (cdEl)  cdEl.textContent = '';
    }

    // ── Sparkline de fond ──
    if (ps.candles && ps.candles.length >= 2) {
      const sparkColor = pos
        ? (pos.pnlUsdt >= 0
            ? (pos.side === 'long' ? '#00e87a' : '#ff3d6b')
            : '#f5c842')
        : cfg.color;
      _drawSparkline('pbspark_' + pairKey, ps.candles, sparkColor, pos ? pos.pnlUsdt >= 0 : true);
    }

    // ── Barre de progression TP (si position active) ──
    const tpBar  = document.getElementById('pbtpbar_'  + pairKey);
    const tpFill = document.getElementById('pbtpfill_' + pairKey);
    if (pos && tpBar && tpFill) {
      const pnlPct   = pos.pnl || 0;
      // Estimation de la distance TP selon conviction (approx 2-4%)
      const conv     = pos.conviction || 0.4;
      const tpTarget = Math.max(1.5, conv * 4);
      const progress = Math.max(-100, Math.min(100, (pnlPct / tpTarget) * 100));
      tpBar.style.display = 'block';
      tpFill.style.width  = Math.abs(progress) + '%';
      tpFill.classList.toggle('negative', progress < 0);
    } else if (tpBar) {
      tpBar.style.display = 'none';
    }
  });
}
window.updatePairBricks = updatePairBricks;


// ──────────────────────────────────────────────────────────────────────
// Mise à jour des indicateurs détaillés d'une brique Action
// Sparkline, RSI, momentum, régime, streak, volume.
// Appelée quand l'utilisateur ouvre la vue détaillée d'une paire.
// ──────────────────────────────────────────────────────────────────────
function ac2UpdateXInd(pair) {
  const k  = pair.replace('/', '_');
  const ps = S.pairStates[pair];
  if (!ps) return;

  // Extraction des closes depuis les bougies (source de données NEXUS)
  const closes = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');

  // ── Sparkline ──
  const spark = document.getElementById('ac2_spark_' + k);
  if (spark && closes.length >= 5) {
    const ph  = closes.slice(-20);
    const W   = spark.clientWidth  || 300;
    const H   = spark.clientHeight || 28;
    const DPR = window.devicePixelRatio || 1;
    spark.width  = W * DPR;
    spark.height = H * DPR;

    const x = spark.getContext('2d');
    x.scale(DPR, DPR);
    x.clearRect(0, 0, W, H);

    const mn  = Math.min(...ph);
    const mx  = Math.max(...ph);
    const rng = mx - mn || 1;
    const cfg = PAIRS[pair] || { color: '#38d4f5' };

    const grad = x.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, cfg.color + '40');
    grad.addColorStop(1, cfg.color + '00');

    // Remplissage dégradé
    x.beginPath();
    ph.forEach((p, i) => {
      const px = (i / (ph.length - 1)) * W;
      const py = H - ((p - mn) / rng) * (H - 2) - 1;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    });
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.closePath();
    x.fillStyle = grad;
    x.fill();

    // Ligne supérieure avec glow
    x.beginPath();
    ph.forEach((p, i) => {
      const px = (i / (ph.length - 1)) * W;
      const py = H - ((p - mn) / rng) * (H - 2) - 1;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    });
    x.strokeStyle  = cfg.color;
    x.lineWidth    = 1.5;
    x.shadowColor  = cfg.color;
    x.shadowBlur   = 6;
    x.stroke();
    x.shadowBlur   = 0;
  }

  // ── Volume ──
  const volVal  = document.getElementById('ac2_volval_'  + k);
  const volFill = document.getElementById('ac2_volfill_' + k);
  if (volVal && volFill) {
    const recentCandles = (ps.candles || []).slice(-24);
    const vSum          = recentCandles.reduce((s, c) => s + (c.v || 0), 0);
    const v             = vSum > 0 ? vSum * (ps.price || 1) : ((ps.price || 1) * 1000 * (0.5 + Math.random()));
    const display       = v >= 1e9 ? (v/1e9).toFixed(1) + 'B'
                        : v >= 1e6 ? (v/1e6).toFixed(1) + 'M'
                        : v >= 1e3 ? (v/1e3).toFixed(0) + 'K'
                        : v.toFixed(0);
    volVal.textContent = '$' + display;
    const pct = Math.min(100, Math.max(15, (v / ((ps.price || 1) * 1e5)) * 100));
    volFill.style.width = pct + '%';
  }

  // ── RSI 14 (calcul Wilder avec lissage exponentiel) ──
  const rsiEl = document.getElementById('ac2_rsi_' + k);
  if (rsiEl && closes.length >= 15) {
    const cl = closes.slice(-20);
    let g = 0, l = 0;
    for (let i = 1; i <= 14; i++) {
      const d = cl[i] - cl[i-1];
      d > 0 ? g += d : l -= d;
    }
    let ag = g / 14, al = l / 14;
    for (let i = 15; i < cl.length; i++) {
      const d = cl[i] - cl[i-1];
      ag = (ag * 13 + (d > 0 ?  d : 0)) / 14;
      al = (al * 13 + (d < 0 ? -d : 0)) / 14;
    }
    const rsi = al ? 100 - (100 / (1 + ag / al)) : 100;
    rsiEl.textContent  = rsi.toFixed(0);
    rsiEl.style.color  = rsi > 70 ? 'var(--down)'
                       : rsi < 30 ? 'var(--up)'
                       : rsi > 55 ? 'var(--gold)'
                       : rsi < 45 ? 'var(--ice)'
                       : 'var(--t2)';
  }

  // ── Momentum (variation des 5 dernières bougies vs les 5 précédentes) ──
  const momEl = document.getElementById('ac2_mom_' + k);
  if (momEl && closes.length >= 10) {
    const ph2    = closes;
    const recent = ph2.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older  = ph2.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    const momPct = ((recent - older) / older) * 100;
    const arr    = momPct > 0.3 ? '↗' : momPct < -0.3 ? '↘' : '→';
    momEl.textContent = arr + ' ' + (momPct >= 0 ? '+' : '') + momPct.toFixed(2) + '%';
    momEl.style.color = momPct > 0.3  ? 'var(--up)'
                      : momPct < -0.3 ? 'var(--down)'
                      : 'var(--t3)';
  }

  // ── Régime de marché ──
  const regEl = document.getElementById('ac2_regmini_' + k);
  if (regEl) {
    const reg = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
    const map = {
      bull:          { txt: 'BULL',   c: 'var(--up)' },
      bear:          { txt: 'BEAR',   c: 'var(--down)' },
      calm:          { txt: 'CALM',   c: 'var(--ice)' },
      volatile:      { txt: 'VOL',    c: 'var(--gold)' },
      volatile_bull: { txt: 'V.BULL', c: 'var(--up)' },
      volatile_bear: { txt: 'V.BEAR', c: 'var(--down)' }
    };
    const m = map[reg] || map.calm;
    regEl.textContent = m.txt;
    regEl.style.color = m.c;
  }

  // ── Streak de wins/losses sur les trades clôturés ──
  const streakEl = document.getElementById('ac2_streak_' + k);
  if (streakEl) {
    const closedTrades = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
    if (!closedTrades.length) {
      streakEl.textContent = '—';
      streakEl.style.color = 'var(--t3)';
    } else {
      let cur = 0, dir = null;
      for (let i = closedTrades.length - 1; i >= 0; i--) {
        const win = closedTrades[i].pnlUsdt > 0;
        if (dir === null)   { dir = win; cur = 1; }
        else if (dir === win) cur++;
        else break;
      }
      streakEl.textContent = (dir ? 'W' : 'L') + cur;
      streakEl.style.color = dir ? 'var(--up)' : 'var(--down)';
    }
  }
}
window.ac2UpdateXInd = ac2UpdateXInd;


// ──────────────────────────────────────────────────────────────────────
// Long-press sur une brique active → confirmation de fermeture forcée
// Délai 600ms, uniquement sur les briques avec position ouverte
// ──────────────────────────────────────────────────────────────────────
function _attachLongPressToBricks() {
  document.querySelectorAll('.action-brick, .pair-brick').forEach(brick => {
    if (brick.dataset.lpAttached === '1') return;
    brick.dataset.lpAttached = '1';

    const pair = brick.getAttribute('data-pair');
    if (!pair) return;

    const startFn = (e) => {
      // Long-press uniquement si une position est active sur la paire
      const pos = (S.openPositions || []).find(p => p.pair === pair);
      if (!pos) return;

      _longPressPair  = pair;
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

    // Si le long-press s'est déclenché, intercepter le click pour ne pas ouvrir le détail
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


// ──────────────────────────────────────────────────────────────────────
// Mise à jour des compteurs des barres auto / man
// Nombre de positions actives + nombre de paires (hors paused)
// ──────────────────────────────────────────────────────────────────────
function _updateAutoBarCounters() {
  const autoBar      = document.getElementById('autoBar');
  const manBar       = document.getElementById('manBar');
  const autoCounter  = document.getElementById('autoBarCounter');
  const manCounter   = document.getElementById('manBarCounter');
  const autoPaircount = document.getElementById('autoBarPairCount');
  const manPaircount  = document.getElementById('manBarPairCount');

  const autoPositions = (S.openPositions || []).filter(p => p.auto === true).length;
  const manPositions  = (S.openPositions || []).filter(p => p.auto !== true).length;

  // Barre auto
  if (autoBar && autoCounter) {
    if (autoPositions > 0) {
      autoBar.classList.add('has-active');
      autoCounter.textContent = autoPositions + ' active' + (autoPositions > 1 ? 's' : '');
    } else {
      autoBar.classList.remove('has-active');
      autoCounter.textContent = 'En veille';
    }
  }

  // Barre manuel
  if (manBar && manCounter) {
    if (manPositions > 0) {
      manBar.classList.add('has-active');
      manCounter.textContent = manPositions + ' active' + (manPositions > 1 ? 's' : '');
    } else {
      manBar.classList.remove('has-active');
      manCounter.textContent = 'En veille';
    }
  }

  // Nombre de paires actives (total - paused)
  const totalPairs  = Object.keys(PAIRS).length;
  const pausedPairs = Object.keys(S._pausedPairs || {}).length;
  const pairText    = pausedPairs > 0
    ? (totalPairs - pausedPairs) + '/' + totalPairs + ' paires'
    : totalPairs + ' paires';
  if (autoPaircount) autoPaircount.textContent = pairText;
  if (manPaircount)  manPaircount.textContent  = pairText;
}
window._updateAutoBarCounters = _updateAutoBarCounters;


// ──────────────────────────────────────────────────────────────────────
// Restauration de l'état (ouverte/fermée) des barres au démarrage
// Lit la préférence stockée dans localStorage sous BARS_KEY
// ──────────────────────────────────────────────────────────────────────
function _restoreAutoBarState() {
  const autoBar  = document.getElementById('autoBar');
  const manBar   = document.getElementById('manBar');
  const paramBar = document.getElementById('paramBar');
  if (!autoBar || !manBar) return;

  let saved = 'auto';
  try { saved = localStorage.getItem(BARS_KEY) || 'auto'; } catch (e) {}

  autoBar.classList.remove('open');
  manBar.classList.remove('open');
  if (paramBar) paramBar.classList.remove('open');

  if      (saved === 'auto')                 autoBar.classList.add('open');
  else if (saved === 'man')                  manBar.classList.add('open');
  else if (saved === 'param' && paramBar)    paramBar.classList.add('open');
}
window._restoreAutoBarState = _restoreAutoBarState;
// ════════════════════════════════════════════════════════════════════════
// SECTION Modals
// Trois fenêtres modales avec rendu HTML détaillé :
//  - openDiagnostic       : diagnostic complet (trades, P&L, marché, agents, capital, slider répartition)
//  - openSnapshotsModal   : gestion des snapshots
//  - openWhyModal(posId)  : explication "pourquoi cette position a été ouverte"
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Modal de diagnostic complet
// Cinq sections : Trades, P&L, Marché, Agents, Capital, Répartition bénéfices
// Indicateur d'alerte rouge sur le bouton diag si une métrique est critique
// ──────────────────────────────────────────────────────────────────────
function openDiagnostic() {
  const body    = document.getElementById('diagBody');
  const overlay = document.getElementById('diagOverlay');
  if (!body || !overlay) return;

  const now        = Date.now();
  const positions  = S.openPositions || [];
  const agents     = S.agents        || [];
  const pairStates = S.pairStates    || {};

  // ── TRADES ──
  // Clôturées = dans ps.trades avec type 'position' et pnlUsdt numérique
  let closedWin = 0, closedLoss = 0, closedTotal = 0, noTpSl = 0;
  let oldestPosAge   = 0;
  let oldestPosLabel = '—';

  Object.entries(pairStates).forEach(([pair, ps]) => {
    (ps.trades || []).forEach(t => {
      if (t.type === 'position' && typeof t.pnlUsdt === 'number') {
        closedTotal++;
        if      (t.pnlUsdt > 0) closedWin++;
        else if (t.pnlUsdt < 0) closedLoss++;
      }
    });
  });

  positions.forEach(p => {
    if (!p.tp && !p.sl) noTpSl++;
    const age = now - (p.openedAt || p.entryTs || now);
    if (age > oldestPosAge) {
      oldestPosAge   = age;
      oldestPosLabel = p.pair + ' ' + (p.side || '').toUpperCase();
    }
  });

  const fmtAge = ms => {
    const m = Math.floor(ms / 60000);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    return h + 'h' + String(m % 60).padStart(2, '0');
  };

  const oldCls    = oldestPosAge > 3600000 ? 'crit' : oldestPosAge > 600000 ? 'warn' : 'ok';
  const noTpSlCls = noTpSl > 0 ? 'warn' : 'ok';

  // ── P&L ──
  const pnlRealised = Object.values(pairStates).reduce((s, ps) => s + (ps.totalPnlUsd || 0), 0);
  const pnlLatent   = positions.reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const ratio       = pnlRealised !== 0 ? Math.abs(pnlLatent / pnlRealised) : (pnlLatent !== 0 ? 999 : 0);
  const ratioCls    = ratio > 2 ? 'crit' : ratio > 1 ? 'warn' : 'ok';
  const fmt$        = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);

  // ── MARCHÉ ──
  // En mode RÉEL, les prix viennent du WebSocket Binance (_lastRealPriceTs).
  // En mode sim, ils viennent du HTTP fetch (_lastPriceFetch).
  // En sim pur ("Auto-apprentissage"), les prix sont SIMULÉS : aucun fetch ni WS,
  // donc "Dernier fetch" et "Paires figées" n'ont pas de sens (afficher N/A).
  const _diagSimMode = !(typeof _isRealLike === 'function' && _isRealLike());
  let lastFetch;
  if (!_diagSimMode) {
    lastFetch = (typeof _lastRealPriceTs !== 'undefined' && _lastRealPriceTs) ? _lastRealPriceTs : 0;
  } else {
    lastFetch = (typeof _lastPriceFetch !== 'undefined' && _lastPriceFetch) ? _lastPriceFetch : 0;
  }

  const staleThreshold = 60000;
  const isGloballyStale = lastFetch === 0 || (now - lastFetch) > staleThreshold;
  let staleCount = 0;
  if (!_diagSimMode && isGloballyStale) {
    staleCount = Object.keys(pairStates).length;
  }

  const ageSinceUpdate = lastFetch ? Math.floor((now - lastFetch) / 1000) : -1;

  // Source de prix : détection intelligente WS Binance actif
  const srcMap = { 0: 'CoinGecko', 1: 'Binance', 2: 'Mode Auto-apprentissage' };
  let currentSource = (typeof _priceSource !== 'undefined') ? (srcMap[_priceSource] || '—') : '—';

  // Compteur WS connectés (background collector + foreground modal)
  let wsConnectedCount = 0;
  let wsActiveTotal    = 0;
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
  } catch (e) {}

  // Si en mode real ou paperReal avec au moins 1 WS connecté → "Binance WS · live"
  if (_isRealLike() && wsConnectedCount > 0) {
    currentSource = 'Binance WS · live';
  }

  const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : '—';

  // En sim, la source de prix réelle n'a pas de sens
  if (_diagSimMode) currentSource = 'Mode Auto-apprentissage';

  const staleCls  = staleCount === 0 ? 'ok' : staleCount < Object.keys(pairStates).length ? 'warn' : 'crit';
  const updateCls = _diagSimMode ? 'neu' : (ageSinceUpdate < 0 ? 'crit' : ageSinceUpdate > 120 ? 'crit' : ageSinceUpdate > 30 ? 'warn' : 'ok');

  // ── AGENTS ──
  const pureAgents = agents.filter(a => !a.isBot && !a.isMeta);
  const saturated  = agents.filter(a => (a.fitness || 0) >= 1900).length;
  const broken     = agents.filter(a => (a.fitness || 0) <=   80).length;
  const totalAg    = agents.length;
  const satCls     = saturated > totalAg * 0.5 ? 'warn' : 'ok';
  const brokenCls  = broken    > 3 ? 'crit' : broken > 0 ? 'warn' : 'ok';
  const fpMode     = S.fullPowerMode ? 'ACTIF' : 'off';
  const fpCls      = S.fullPowerMode ? 'warn' : 'ok';

  // ── CAPITAL ──
  const trading     = S.tradingAccount   || 0;
  const cash        = S.cashAccount      || 0;
  const borrowed    = S.leverageBorrowed || 0;
  const maxCapacity = (S._autoLevBase || trading) * (S.leverageMaxMult || 10);
  const usagePct    = maxCapacity > 0 ? (borrowed / maxCapacity) * 100 : 0;
  const usageCls    = usagePct > 90 ? 'crit' : usagePct > 70 ? 'warn' : 'ok';
  const engagedPct  = (trading + borrowed) > 0 ? (borrowed / (trading + borrowed)) * 100 : 0;

  // ── INDICATEUR D'ALERTE GLOBAL ──
  const hasAlert = oldCls === 'crit' || staleCls === 'crit' || ratioCls === 'crit' || usageCls === 'crit' || brokenCls === 'crit';
  const diagBtn  = document.getElementById('diagBtn');
  if (diagBtn) diagBtn.classList.toggle('alert', hasAlert);

  // ── RENDU HTML ──
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
        const upPct     = (typeof _getWsUptimePct === 'function') ? _getWsUptimePct() : 100;
        const discCount = _wsStability.disconnects ? _wsStability.disconnects.length : 0;
        const cls       = upPct >= 95 ? 'ok' : upPct >= 80 ? 'warn' : 'crit';
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


// ──────────────────────────────────────────────────────────────────────
// Modal de gestion des snapshots
// Création auto du DOM au premier appel, puis simple rafraîchissement
// ──────────────────────────────────────────────────────────────────────
function openSnapshotsModal() {
  const snaps = listInternalSnapshots();
  const modal = document.getElementById('snapshotsModal');

  if (!modal) {
    // Création initiale du modal
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


// ──────────────────────────────────────────────────────────────────────
// Modal "Pourquoi cette position ?"
// Affiche la raison d'ouverture, les indicateurs du marché au moment du
// trade, les agents qui ont voté et les objectifs TP/SL.
// ──────────────────────────────────────────────────────────────────────
function openWhyModal(posId) {
  const pos = (S.openPositions || []).find(p => p.id === posId);
  if (!pos) {
    showToast('Position introuvable', 1500, 'warn');
    return;
  }

  const ps      = S.pairStates[pos.pair];
  const cfg     = PAIRS[pos.pair] || {};
  const body    = document.getElementById('whyBody');
  const overlay = document.getElementById('whyOverlay');
  if (!body || !overlay) return;

  // ── Durée de la position ──
  const since    = pos.entryTs ? Math.round((Date.now() - pos.entryTs) / 1000) : 0;
  const sinceStr = since > 3600 ? Math.floor(since/3600) + 'h ' + Math.floor((since%3600)/60) + 'm'
                 : since > 60   ? Math.floor(since/60)   + 'm ' + (since%60) + 's'
                 : since + 's';

  // ── Prix entrée et P&L actuel ──
  const curPrice    = ps ? ps.price : 0;
  const entryPrice  = pos.entryPrice || 0;
  const dec         = cfg.dec >= 4 ? cfg.dec : 2;
  const pnlPct      = entryPrice > 0
    ? (pos.side === 'long' ? (curPrice - entryPrice) / entryPrice * 100 : (entryPrice - curPrice) / entryPrice * 100)
    : 0;
  const pnlUsd      = pos.stakeUsdt * pnlPct / 100;
  const pnlCol      = pnlPct >= 0 ? 'var(--up)' : 'var(--down)';

  // ── Régime et indicateurs au moment de l'ouverture ──
  const regime = ps ? (ps.regime    || 'calm') : 'calm';
  const rsi    = ps ? (ps.rsi14     || '—')   : '—';
  const mom    = ps ? ((ps.momentum || 0) * 100).toFixed(2) + '%' : '—';
  const lmsr   = ps ? (lmsrP(ps) * 100).toFixed(0) + '%' : '—';

  // ── Agents qui ont voté ──
  const agents     = pos._openAgents || [];
  const bullAgents = agents.filter(a => (a.score || 0) > 0);
  const bearAgents = agents.filter(a => (a.score || 0) < 0);

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

    <!-- Indicateurs du marché au moment de l'ouverture -->
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
// ════════════════════════════════════════════════════════════════════════
// SECTION Exports
// Quatre exports vers fichiers téléchargeables :
//  - exportFeesCSV       : log des frais par trade (CSV)
//  - exportTradesCSV     : tous les trades clôturés + frais (CSV, async)
//  - exportSummaryCSV    : résumé fiscal par paire (CSV)
//  - exportFullJSON      : backup fiscal complet (JSON)
//
// Note : exportFullJSON est un export à finalité FISCALE, distinct de
// exportState() (section persistance) qui produit le snapshot complet.
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Export des frais en CSV
// ──────────────────────────────────────────────────────────────────────
function exportFeesCSV() {
  downloadFile(
    buildFeeLogCSV(),
    `nexus_fees_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
  showToast('📥 Frais exportés', 2800, 'user');
}
window.exportFeesCSV = exportFeesCSV;


// ──────────────────────────────────────────────────────────────────────
// Export complet des trades : combine ce qui est en IndexedDB
// (loadAllTrades) avec le feeLog en mémoire
// ──────────────────────────────────────────────────────────────────────
async function exportTradesCSV() {
  const trades = await loadAllTrades();
  const all    = [...trades, ...S.fees.feeLog.map(e => ({ ...e }))];
  downloadFile(
    buildTradeCSV(all),
    `nexus_trades_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
  showToast('📥 Trades exportés — ' + all.length + ' lignes', 2800, 'user');
}
window.exportTradesCSV = exportTradesCSV;


// ──────────────────────────────────────────────────────────────────────
// Export du résumé fiscal en CSV
// ──────────────────────────────────────────────────────────────────────
function exportSummaryCSV() {
  downloadFile(
    buildSummaryCSV(),
    `nexus_resume_fiscal_${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv'
  );
  showToast('📥 Résumé fiscal exporté', 2800, 'user');
}
window.exportSummaryCSV = exportSummaryCSV;


// ──────────────────────────────────────────────────────────────────────
// Export backup JSON à finalité fiscale
// Contient : frais, config frais, config taxe, trades, portefeuille.
// Distinct de exportState() qui produit le snapshot complet de l'app.
// ──────────────────────────────────────────────────────────────────────
function exportFullJSON() {
  const data = {
    exportDate:  new Date().toISOString(),
    region:      S.taxConfig.region,
    regionLabel: S.taxConfig.regions[S.taxConfig.region]?.label,
    fees:        S.fees,
    feeConfig:   S.feeConfig,
    taxConfig:   S.taxConfig,
    trades:      S.fees.feeLog,
    portfolio: {
      total:   S.portfolio,
      cash:    S.cashAccount,
      trading: S.tradingAccount,
      cycle:   S.cycle
    }
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `nexus_backup_${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  );
  showToast('📥 Backup JSON exporté');
}
window.exportFullJSON = exportFullJSON;
// ════════════════════════════════════════════════════════════════════════
// SECTION Sim Control
// Contrôle de la simulation et des barres UI :
//  - toggleSim          : bascule démarrage/arrêt de la sim
//  - stopSim            : arrête la sim, sauvegarde, libère le Wake Lock
//  - toggleFullPower    : bascule le mode "Plein régime"
//  - toggleBar(barName) : ouvre/ferme les barres auto/man/param
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Bascule démarrage / arrêt de la simulation
// ──────────────────────────────────────────────────────────────────────
function toggleSim() {
  if (_simRunning) stopSim();
  else             startSim();
}
window.toggleSim = toggleSim;


// ──────────────────────────────────────────────────────────────────────
// Arrêt de la simulation
// Libère le Wake Lock (l'écran peut s'éteindre), sauvegarde l'état,
// affiche un toast de confirmation et trace l'événement dans chainLog.
// ──────────────────────────────────────────────────────────────────────
function stopSim() {
  if (!_simRunning) return;

  _simRunning = false;
  clearInterval(_simInterval);
  _simInterval = null;

  updateSimBtn();

  // Libération du Wake Lock — l'écran peut s'éteindre
  _releaseWakeLock();

  updateSaveIndicator('saving');
  saveState(false).then(() =>
    showToast('⏸ Auto-apprentissage en pause · données sauvegardées', 2800, 'user')
  );

  S.chainLog.push({
    icon: '⏸',
    desc: 'Auto-apprentissage en pause · cycle #' + S.cycle,
    hash: rndHash(),
    time: nowStr()
  });
}
window.stopSim = stopSim;


// ──────────────────────────────────────────────────────────────────────
// Bascule du mode "Plein régime"
// Mise à jour synchronisée du bouton header (label + nombre de positions)
// ──────────────────────────────────────────────────────────────────────
window.toggleFullPower = function () {
  const btn = document.getElementById('fpBtn');

  if (S.fullPowerMode) {
    disableFullPowerMode();
    if (btn) {
      btn.classList.remove('active');
      btn.querySelector('span:last-child').textContent = 'Plein régime';
    }
  } else {
    const n = enableFullPowerMode();
    if (btn) {
      btn.classList.add('active');
      btn.querySelector('span:last-child').textContent = '100% · ' + n;
    }
  }
};


// ──────────────────────────────────────────────────────────────────────
// Gestion de l'ouverture / fermeture des 3 barres (auto / man / param)
// Comportement : si la barre demandée est ouverte → on la ferme.
//                Sinon on ferme les autres et on ouvre celle demandée.
// L'état est persisté dans localStorage sous BARS_KEY.
// ──────────────────────────────────────────────────────────────────────
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
      try { localStorage.setItem(BARS_KEY, 'closed'); } catch (e) {}
    } else {
      closeAll();
      autoBar.classList.add('open');
      try { localStorage.setItem(BARS_KEY, 'auto'); } catch (e) {}
    }
  } else if (barName === 'man') {
    if (manBar.classList.contains('open')) {
      manBar.classList.remove('open');
      try { localStorage.setItem(BARS_KEY, 'closed'); } catch (e) {}
    } else {
      closeAll();
      manBar.classList.add('open');
      try { localStorage.setItem(BARS_KEY, 'man'); } catch (e) {}
    }
  } else if (barName === 'param') {
    if (paramBar && paramBar.classList.contains('open')) {
      paramBar.classList.remove('open');
      try { localStorage.setItem(BARS_KEY, 'closed'); } catch (e) {}
    } else if (paramBar) {
      closeAll();
      paramBar.classList.add('open');
      try { localStorage.setItem(BARS_KEY, 'param'); } catch (e) {}
    }
  }
}
window.toggleBar = toggleBar;
// ════════════════════════════════════════════════════════════════════════
// SECTION Helpers divers
// Fonctions utilitaires pour A/B testing, snapshots auto, sauvegarde
// pré-action, résumé capital, marqueur réseau, reset P&L, validation
// d'exposition. Petites fonctions à responsabilité unique.
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// A/B testing : enregistrement du résultat d'un trade
// Met à jour les compteurs trades/wins/losses/pnl de l'arm choisi,
// puis vérifie si le seuil de comparaison est atteint pour produire un verdict.
// ──────────────────────────────────────────────────────────────────────
function _abRecordResult(arm, pnlPct, pnlUsd) {
  if (!S.abTesting) return;

  const target = (arm === 'B') ? S.abTesting.armB : S.abTesting.armA;
  if (!target) return;

  target.trades = (target.trades || 0) + 1;
  target.pnl    = (target.pnl    || 0) + pnlUsd;
  if (pnlPct >= 0) target.wins   = (target.wins   || 0) + 1;
  else             target.losses = (target.losses || 0) + 1;

  // Lancement du verdict quand chaque arm a accumulé assez de trades
  const cfg       = S.paperRealConfig || {};
  const threshold = cfg.abTestingTradesPerArm || 50;
  if (S.abTesting.armA.trades >= threshold && S.abTesting.armB.trades >= threshold) {
    _abComputeVerdict();
  }
}
window._abRecordResult = _abRecordResult;


// ──────────────────────────────────────────────────────────────────────
// Snapshots automatiques avant action sensible / après fermeture de trade
// ──────────────────────────────────────────────────────────────────────
function _autoSnapshotBeforeLeverage() { _maybeCreateAutoSnapshot('leverage'); }
window._autoSnapshotBeforeLeverage = _autoSnapshotBeforeLeverage;

function _autoSnapshotOnTradeClose() { _maybeCreateAutoSnapshot('trade_close'); }
window._autoSnapshotOnTradeClose = _autoSnapshotOnTradeClose;


// ──────────────────────────────────────────────────────────────────────
// Sauvegarde multi-storage avant action critique du bot
// Filet de sécurité : si l'action plante, on a un point de retour récent
// ──────────────────────────────────────────────────────────────────────
function _p5PreActionSave(action) {
  try {
    _p5MultiStorageSave();
  } catch (e) {
    console.warn('preAction save failed:', e);
  }
}
window._p5PreActionSave = _p5PreActionSave;


// ──────────────────────────────────────────────────────────────────────
// Résumé de l'exposition capital
// Retourne { staked, maxAllowed, usedPct, free }
// ──────────────────────────────────────────────────────────────────────
function getCapitalSummary() {
  const staked     = S.openPositions.reduce((s, p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  const maxAllowed = S.tradingAccount + (S.leverageReserve || 0);
  const usedPct    = maxAllowed > 0 ? Math.min(100, staked / maxAllowed * 100) : 0;
  return {
    staked,
    maxAllowed,
    usedPct,
    free: Math.max(0, maxAllowed - staked)
  };
}
window.getCapitalSummary = getCapitalSummary;


// ──────────────────────────────────────────────────────────────────────
// Marqueur de réception d'un prix réel (CG ou Binance, pas sim)
// Gère la reprise après coupure réseau : 3 prix frais consécutifs requis
// pour considérer la connexion rétablie. Redémarre le bot si on l'avait pausé.
// ──────────────────────────────────────────────────────────────────────
function markRealPriceReceived() {
  _lastRealPriceTs = Date.now();

  if (_netwatchState === 'offline') {
    _freshPricesInRow++;
    if (_freshPricesInRow >= 3) {
      // Reprise confirmée
      _netwatchState        = 'online';
      _net10sSaveTriggered  = false;
      _netOfflineSinceTs    = 0;

      // Déblocage du bot : le flag S._netPaused empêchait les ouvertures
      if (typeof S !== 'undefined' && S) {
        S._netPaused      = false;
        S._netToastShown  = false;
      }

      _updateNetIndicator();

      // Si on avait pausé le bot, on le redémarre
      if (_netwatchPausedBot && !_simRunning) {
        _netwatchPausedBot = false;
        if (typeof startSim === 'function') {
          try { startSim(); } catch (e) {}
        }
        // Trace dans chainLog (pas de toast, c'est normal)
        S.chainLog.push({
          icon: '🟢',
          desc: 'Connexion rétablie · bot reprend',
          hash: rndHash(),
          time: nowStr()
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


// ──────────────────────────────────────────────────────────────────────
// Reset des compteurs de P&L (session + journalier)
// L'apprentissage du bot (fitness agents, génération, leçons) est préservé.
// ──────────────────────────────────────────────────────────────────────
function resetPnlSession() {
  if (!confirm('Recalibrer les compteurs de P&L ? L\'apprentissage du bot ne sera PAS perdu.')) return;

  const current = S.portfolio || 0;

  // Reset session (affichage heroPnlBadge)
  S._startPortfolio = current;
  S.pnl24h          = 0;

  // Reset journalier
  if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
  S.pnlPeriod.todayStartPortfolio = current;
  S.pnlPeriod.todayDate           = _getTodayKey();

  if (typeof showToast === 'function') {
    showToast('🔄 Compteurs P&L recalibrés · Apprentissage préservé', 4000, 'win');
  }

  try { if (typeof saveState === 'function') saveState(); } catch (e) {}
  try { if (typeof renderHome === 'function') renderHome(); } catch (e) {}
}
window.resetPnlSession = resetPnlSession;


// ──────────────────────────────────────────────────────────────────────
// Validation du plafond d'investissement provisionné
// Deux modes :
//  - Avec levier emprunté : cap = levier emprunté − pertes max prévues
//  - Sans levier         : cap = tradingAccount − sommes engagées
// ──────────────────────────────────────────────────────────────────────
function validateInvestmentCapProvisioned(proposedStake) {
  if (!proposedStake || proposedStake <= 0) {
    return { ok: true, cap: Infinity, mode: 'noop' };
  }

  const engaged        = (S.openPositions || []).reduce((s, p) => s + (p.stakeUsdt || 0), 0);
  const maxLossesOpen  = engaged;  // worst-case : 100% loss par position ouverte
  const borrowed       = S.leverageBorrowed || 0;

  if (borrowed > 0) {
    // Mode levier actif : cap = levier emprunté − pertes max prévues
    const cap = Math.max(0, borrowed - maxLossesOpen);
    return {
      ok:             proposedStake <= cap,
      cap,
      mode:           'leverage',
      engaged,
      maxLossesOpen,
      borrowed
    };
  }

  // Mode sans levier : cap = tradingAccount − sommes engagées
  const cap = Math.max(0, (S.tradingAccount || 0) - engaged);
  return {
    ok:             proposedStake <= cap,
    cap,
    mode:           'no_leverage',
    engaged,
    tradingAccount: S.tradingAccount
  };
}
window.validateInvestmentCapProvisioned = validateInvestmentCapProvisioned;


// ──────────────────────────────────────────────────────────────────────
// Validation de l'exposition totale avec auto-limitation par conviction
//
// Le bot s'auto-limite à 80% du capital max pour garder une marge de sécurité.
// Exception : si la conviction du trade est > 0.75 (signal très fort), il peut
// monter à 100%. Cette règle s'applique TOUJOURS, même hors Plein régime,
// pour que le bot apprenne à garder de la marge même en mode normal.
//
// Validations en cascade :
//  1. Plafond brut : maxAllowed × 1.02 (2% de marge pour arrondis)
//  2. Auto-cap conviction : maxAllowed × 0.80 (ou 1.00 si conviction > 0.75)
//  3. Phase 5 : règle sizing conforme à validateInvestmentCapProvisioned
// ──────────────────────────────────────────────────────────────────────
function validateTotalExposure(proposedStake, proposedLevBonus, proposedConviction) {
  const alreadyStaked   = S.openPositions.reduce((s, p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  const alreadyBorrowed = S.leverageBorrowed || 0;
  const maxAllowed      = S.tradingAccount + (S.leverageReserve || 0);
  const newExposure     = (proposedStake || 0) + (proposedLevBonus || 0);
  const totalAfter      = alreadyStaked + newExposure;

  // 1. Plafond brut absolu
  if (totalAfter > maxAllowed * 1.02) {
    const available = Math.max(0, maxAllowed - alreadyStaked);
    return { ok: false, available, maxAllowed, alreadyStaked, totalAfter };
  }

  // 2. Auto-cap conviction : 80% par défaut, 100% si signal très fort
  const _convForCap = (typeof proposedConviction === 'number' && !isNaN(proposedConviction))
                      ? proposedConviction
                      : 0.5;
  const _useFullCap = _convForCap > 0.75;
  const _cap        = _useFullCap ? 1.00 : 0.80;
  const leverageCap = maxAllowed * _cap;

  if (totalAfter > leverageCap) {
    const available = Math.max(0, leverageCap - alreadyStaked);
    return {
      ok:             false,
      available,
      maxAllowed:     leverageCap,
      alreadyStaked,
      totalAfter,
      autoCap:        true,
      capLevel:       _cap,
      convictionUsed: _convForCap
    };
  }

  // 3. Validation Phase 5 (cap selon mode levier/non-levier)
  const _p5 = validateInvestmentCapProvisioned(proposedStake || 0);
  if (!_p5.ok) {
    return {
      ok:         false,
      available:  _p5.cap,
      maxAllowed,
      alreadyStaked,
      totalAfter,
      phase5:     true,
      phase5Mode: _p5.mode,
      phase5Cap:  _p5.cap
    };
  }

  return { ok: true, available: maxAllowed - alreadyStaked };
}
window.validateTotalExposure = validateTotalExposure;
// ════════════════════════════════════════════════════════════════════════
// SECTION Init
// Fonction de démarrage de l'application. Orchestre :
//  1. Restauration de l'état sauvegardé (loadState)
//  2. Seed du chain log si nouvelle session
//  3. Render initial des cartes, paires, graphiques
//  4. Affichage du bouton SIM (pause/play)
//  5. Prix live au démarrage (cache + fetch + watchdog)
//  6. Auto-save scheduling
//  7. Sync de l'affichage de version
//  8. Init de la réserve levier
//  9. Renders d'intel (banner, streak, heatmap, matrice corrélation)
// 10. Listener resize
//
// L'appel init() en bas de fichier déclenche le démarrage au chargement.
// ════════════════════════════════════════════════════════════════════════


async function init() {

  // Affichage dynamique de la version + sync du bouton mode AUTO/MAN
  try {
    const vd = document.getElementById('versionDisplay');
    if (vd && typeof S !== 'undefined') {
      vd.textContent = 'v' + (S.vMajor || 7) + '.' + (S.vMinor || '?');
    }
    if (typeof updateModeButton === 'function') updateModeButton();
  } catch (e) {}

  // ── 1. Tenter de restaurer l'état sauvegardé ──
  const restored = await loadState();

  // ── 2. Seed chain log si nouvelle session ──
  if (!restored || S.chainLog.length === 0) {
    S.chainLog = [
      { icon: '🏛', desc: 'DAO Contract déployé sur Polygon',                                hash: rndHash(), time: nowStr() },
      { icon: '🔑', desc: 'Gnosis Safe trésorerie initialisée',                              hash: rndHash(), time: nowStr() },
      { icon: '🪙', desc: 'GovernanceToken G$ mintés (5 agents)',                            hash: rndHash(), time: nowStr() },
      { icon: '💭', desc: 'Mémoire épisodique vectorielle initialisée · 15 agents actifs',   hash: rndHash(), time: nowStr() },
      { icon: '💤', desc: 'Dream Engine prêt · 6 scénarios de stress disponibles',           hash: rndHash(), time: nowStr() },
      { icon: '🌐', desc: '3 paires candidates en file d\'attente DAO',                      hash: rndHash(), time: nowStr() }
    ];

    S.evoLog = [
      { type: 'new',   title: '🧬 hybrid_v1 créé',           desc: 'Parents: Macro × Sentiment | Gen-1',                       time: nowStr() },
      { type: 'dream', title: '💤 Dream #1 — Initialisation', desc: 'Système calibré sur 6 scénarios historiques.',             time: nowStr(), dreamId: null }
    ];

    // Seed d'un dream de démonstration dans l'historique
    S.dreams = [{
      id: 1,
      startCycle: 0,
      time: nowStr(),
      complete: true,
      scenarios: [
        { ...DREAM_SCENARIOS[0], agentVotes: 8540, agentAgainst: 2100, outcome: { priceDelta: -0.14, survived: true },  calibration: { type: 'tighten_sl',  reason: 'Flash Crash'   } },
        { ...DREAM_SCENARIOS[4], agentVotes: 6200, agentAgainst: 3800, outcome: { priceDelta:  0.11, survived: true },  calibration: null },
        { ...DREAM_SCENARIOS[5], agentVotes: 4100, agentAgainst: 1200, outcome: { priceDelta: -0.002, survived: true }, calibration: { type: 'widen_cycles', reason: 'Consolidation' } }
      ],
      insight: 'Système résilient sur les 3 scénarios testés. Seuils TP/SL légèrement recalibrés après Flash Crash.'
    }];
  } else {
    S.chainLog.push({
      icon: '✅',
      desc: `Session restaurée · cycle #${S.cycle} · ${S.totalTrades} trades`,
      hash: rndHash(),
      time: nowStr()
    });
  }

  // ── 3. Init du bouton mode AUTO/MAN + chip header ──
  const _mBtn       = document.getElementById('modeToggleBtn');
  const _mLbl       = document.getElementById('modeLabelText');
  const _isAutoInit = S.botAutoMode !== false;
  if (_mBtn) _mBtn.className     = _isAutoInit ? 'auto' : 'manual';
  if (_mLbl) _mLbl.textContent   = _isAutoInit ? 'AUTO' : 'MAN';

  const _chip = document.getElementById('heroModeChip');
  if (_chip) {
    _chip.className = 'mode-indicator-chip ' + (S.botAutoMode !== false ? 'auto' : 'manual');
    _chip.innerHTML = S.botAutoMode !== false ? '🤖 AUTO' : '🎛️ MAN';
  }

  // ── 4. Render initial ──
  renderAll();

  // Animation du cerveau + bandeaux d'analyse (page principale uniquement)
  if (S.currentPage === 0) {
    setTimeout(() => {
      try {
        startBrainAnim();
        updateMarketMood();
        updateBotThoughts();
        updateFiscalMini();
        renderAnalyticsPanel();
        if (typeof renderPendingActions === 'function') renderPendingActions();
      } catch (e) {
        console.warn('init render:', e);
      }
    }, 300);
  }

  renderActionsGrid();          // rendu immédiat — pas d'attente sur tick%2
  renderPositions();
  drawMobileChart();
  buildPairPosButtons();
  syncPairPresets();
  updateCycleDurLabel();
  estimateStakes();
  updateAllPairCtrlLabels();
  updatePairBtnStates();
  drawSparkline();
  setTimeout(updatePairAnalysisPanels, 300);   // attendre les premières données prix

  if (restored) {
    // Reconstruction des cartes agents avec les données restaurées
    buildAgentCards();
    patchAgentCards();
    renderAll();
    showToast('✅ Session restaurée · cycle #' + S.cycle);
  }

  // L'utilisateur doit appuyer sur ▶ Démarrage pour lancer la simulation.
  // _simEverStarted reste false jusqu'au 1er clic → libellé "DÉMARRAGE" dans le header.
  updateSimBtn();

  // ── 5. Prix live au démarrage ──

  // 5a. Restauration depuis cache localStorage (prix < 10 min considérés frais)
  try {
    const cached = localStorage.getItem('nexus_price_cache');
    if (cached) {
      const pc  = JSON.parse(cached);
      const now = Date.now();
      Object.entries(pc).forEach(([pair, d]) => {
        if (S.pairStates[pair] && d.price && (now - (d.ts || 0)) < 600000) {
          S.pairStates[pair].price  = d.price;
          S.pairStates[pair].pnl24h = d.pnl24h || 0;
        }
      });
    }
  } catch (e) {}

  // 5b. Premier fetch
  fetchLivePrices(true);

  // 5c. Watchdog : vérifie toutes les 10s que les prix sont à jour
  setInterval(_priceWatchdog, 10000);

  // 5d. Second fetch 3s plus tard pour capturer les valeurs les plus récentes
  setTimeout(() => fetchLivePrices(true), 3000);

  // ── 6. Auto-save et événements de page ──
  scheduleAutoSave();

  // ── 7. Sync de l'affichage de version ──
  const verEl = document.getElementById('versionDisplay');
  if (verEl) verEl.textContent = `v${S.vMajor}.${S.vMinor}`;
  const gBtn = document.getElementById('installGlobeBtn');
  if (gBtn) gBtn.title = `NEXUS v${S.vMajor}.${S.vMinor} · Installer`;

  // ── 8. Init de la réserve levier ──
  if (!S._sessionStart) S._sessionStart = Date.now();
  if (!S.leverageReserve || S.leverageReserve === 0) initLeverageReserve();
  syncLeverageReserve();

  // ── 9. Renders initiaux d'intel ──
  updateIntelBanner();
  updateStreakBadge();

  setTimeout(() => {
    // Init fitnessHistory avant renderCorrMatrix (besoin de données historiques)
    S.agents.forEach(a => { if (!a.fitnessHistory) a.fitnessHistory = [a.fitness, a.fitness]; });
    renderAgentHeatmap();
    renderCorrMatrix();

    // ResizeObserver : redessine la matrice de corrélation si le conteneur change de taille
    const corrWrap = document.getElementById('corrMatrixWrap');
    if (corrWrap && window.ResizeObserver) {
      new ResizeObserver(() => {
        _corrLastTick = -1;
        renderCorrMatrix();
      }).observe(corrWrap);
    }
  }, 150);

  // ── 10. Listener resize global ──
  window.addEventListener('resize', () => {
    drawSparkline();
    drawMobileChart();
    _corrLastTick = -1;
    renderCorrMatrix();
  });
}
window.init = init;


// ════════════════════════════════════════════════════════════════════════
// Démarrage de l'application
// ════════════════════════════════════════════════════════════════════════
init();
