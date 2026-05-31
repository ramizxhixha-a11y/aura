// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 · 00b-persistance-override.js · VERSION 120.6 · 31/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// OBJECTIF : remplacer saveState/loadState/importState par des versions
// fiables qui :
//   1. Écrivent EN PARALLÈLE dans IndexedDB ET localStorage (plus de fallback)
//   2. Lisent les DEUX storages au load, et gardent le plus récent
//      (priorité au cycle le plus élevé, anti-régression)
//   3. Suppriment le blob v105 hardcodé qui polluait importState
//   4. Installent un autosave 5s autonome + hooks de fermeture
//   5. Appellent init() en fin de fichier — APRÈS installation des overrides
//
// ★ NOUVEAU v120.5 : GARDE-FOU ANTI-RÉGRESSION
//   saveState et flushSyncOnExit refusent d'écrire un cycle inférieur de
//   plus de 5 à celui déjà dans le storage. Protège contre le bug où
//   l'app démarre avec un cycle=0 et écrase un cycle plus élevé sauvegardé.
//
// ★★ NOUVEAU v120.6 (31/05/2026) : _applySnapMinimal COMPLÈTE
//    Avant cette version, 49 champs étaient sauvegardés par buildSnapshot()
//    mais ignorés par _applySnapMinimal() à la restauration. Conséquences :
//      - Compteur de générations (_genCount) toujours à 0 au reload
//      - Mémoires d'agents perdues (agentMemories, globalMemoryPool)
//      - Rêves perdus (dreams, dreamJournal)
//      - Heatmap, cascades, résonances, archives perdus
//      - Tout l'état des modes paperReal/real perdu
//      - Bougies temps réel perdues
//    Cette version restaure TOUS les champs présents dans le snapshot.
//
// CHARGEMENT : doit être inclus dans le HTML APRÈS le runtime 09a→09k.
// REQUIERT : 09l-window-bridge.js doit être chargé AVANT pour exposer
//            window.S, window.openDB, window.buildSnapshot, etc.
//
// NE TOUCHE PAS AUX FICHIERS 09. Override pur via window.saveState/loadState.
//
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Garde-fou : ne s'installe que si l'environnement AURA8 est prêt
  if (typeof window === 'undefined') return;

  const TAG = '[persistance v120.6]';

  // Constantes locales (mêmes valeurs que dans 09)
  const SAVE_KEY    = 'nexus_state_v2';
  const STORE_STATE = 'state';

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  function _hasOpenDB() {
    return typeof window.openDB === 'function';
  }

  function _hasBuildSnapshot() {
    return typeof window.buildSnapshot === 'function';
  }

  function _hasS() {
    return typeof window.S === 'object' && window.S !== null;
  }

  // Lire IndexedDB → snap | null
  async function _readIDB() {
    if (!_hasOpenDB()) return null;
    let db;
    try {
      db = await window.openDB();
    } catch(e) {
      console.warn(TAG, 'readIDB: openDB() a planté:', e && e.message);
      return null;
    }
    if (!db) return null;
    if (!db.objectStoreNames || !db.objectStoreNames.contains(STORE_STATE)) {
      console.warn(TAG, 'readIDB: store "' + STORE_STATE + '" introuvable');
      return null;
    }
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_STATE, 'readonly');
        const store = tx.objectStore(STORE_STATE);
        const req = store.get(SAVE_KEY);
        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result);
            return;
          }
          const reqAll = store.getAll();
          reqAll.onsuccess = () => {
            const arr = reqAll.result || [];
            if (arr.length === 0) { resolve(null); return; }
            arr.sort((a, b) => {
              const tA = a && a.savedAt ? Date.parse(a.savedAt) : 0;
              const tB = b && b.savedAt ? Date.parse(b.savedAt) : 0;
              return tB - tA;
            });
            resolve(arr[0]);
          };
          reqAll.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      } catch(e) {
        console.warn(TAG, 'readIDB error:', e && e.message);
        resolve(null);
      }
    });
  }

  // Lire localStorage → snap | null
  function _readLS() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) {
      console.warn(TAG, 'readLS error:', e);
      return null;
    }
  }

  // Écrire IndexedDB → bool
  async function _writeIDB(snap) {
    if (!_hasOpenDB()) {
      console.warn(TAG, 'writeIDB: window.openDB manquant');
      return false;
    }
    let db;
    try {
      db = await window.openDB();
    } catch(e) {
      console.warn(TAG, 'writeIDB: openDB() a planté:', e && e.message);
      return false;
    }
    if (!db) {
      console.warn(TAG, 'writeIDB: openDB() a retourné null/undefined');
      return false;
    }
    if (!db.objectStoreNames || !db.objectStoreNames.contains(STORE_STATE)) {
      console.warn(TAG, 'writeIDB: store "' + STORE_STATE + '" introuvable. Stores existants: ' +
        (db.objectStoreNames ? Array.from(db.objectStoreNames).join(',') : 'aucun'));
      return false;
    }
    return await new Promise((resolve) => {
      let tx;
      try {
        tx = db.transaction(STORE_STATE, 'readwrite');
      } catch(e) {
        console.warn(TAG, 'writeIDB: transaction() a planté:', e && e.message);
        return resolve(false);
      }
      tx.onerror   = () => {
        console.warn(TAG, 'writeIDB: tx.onerror:', tx.error && tx.error.message);
        resolve(false);
      };
      tx.onabort   = () => {
        console.warn(TAG, 'writeIDB: tx.onabort:', tx.error && tx.error.message);
        resolve(false);
      };
      let req;
      try {
        const store = tx.objectStore(STORE_STATE);
        if (store.keyPath) {
          if (!snap.key) snap.key = SAVE_KEY;
          req = store.put(snap);
        } else {
          req = store.put(snap, SAVE_KEY);
        }
      } catch(e) {
        console.warn(TAG, 'writeIDB: put() a planté:', e && e.message);
        return resolve(false);
      }
      req.onsuccess = () => resolve(true);
      req.onerror   = () => {
        console.warn(TAG, 'writeIDB: req.onerror:', req.error && req.error.message);
        resolve(false);
      };
    });
  }

  // Écrire localStorage → bool
  function _writeLS(snap) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      return true;
    } catch(e) {
      console.warn(TAG, 'writeLS error:', e);
      return false;
    }
  }

  // Choisir entre 2 snaps : le plus récent
  function _pickFreshest(snapA, snapB) {
    if (!snapA && !snapB) return null;
    if (!snapA) return snapB;
    if (!snapB) return snapA;
    const cA = (typeof snapA.cycle === 'number') ? snapA.cycle : -1;
    const cB = (typeof snapB.cycle === 'number') ? snapB.cycle : -1;
    if (cA !== cB) return (cA > cB) ? snapA : snapB;
    const tA = snapA.savedAt ? Date.parse(snapA.savedAt) : 0;
    const tB = snapB.savedAt ? Date.parse(snapB.savedAt) : 0;
    if (tA !== tB) return (tA > tB) ? snapA : snapB;
    return snapA;
  }

  // ─────────────────────────────────────────────────────────────
  // NOUVEAU saveState : dual-write parallèle
  // ─────────────────────────────────────────────────────────────

  async function saveState(silent = false) {
    if (!_hasBuildSnapshot()) {
      console.warn(TAG, 'saveState: buildSnapshot manquant — abandon');
      return false;
    }

    let snap;
    try {
      snap = window.buildSnapshot();
    } catch(e) {
      console.error(TAG, 'saveState: buildSnapshot a planté:', e);
      return false;
    }

    if (!snap) return false;

    // GARDE-FOU ANTI-RÉGRESSION
    try {
      const currentLS = _readLS();
      const lsCycle = currentLS && typeof currentLS.cycle === 'number' ? currentLS.cycle : -1;
      const snapCycle = typeof snap.cycle === 'number' ? snap.cycle : -1;
      if (lsCycle > snapCycle + 5) {
        if (!silent) {
          console.warn(TAG, 'saveState BLOQUÉ : tentative d\'écrire cycle #' + snapCycle +
            ' alors que le storage a #' + lsCycle + ' (anti-régression)');
        }
        return false;
      }
    } catch(e) {}

    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    if (!snap.key) snap.key = SAVE_KEY;

    const [idbOk, lsOk] = await Promise.all([
      _writeIDB(snap),
      Promise.resolve(_writeLS(snap))
    ]);

    const anyOk = idbOk || lsOk;

    if (anyOk && !silent && typeof window.updateSaveIndicator === 'function') {
      try { window.updateSaveIndicator('saved'); } catch(e) {}
    } else if (!anyOk && typeof window.updateSaveIndicator === 'function') {
      try { window.updateSaveIndicator('error'); } catch(e) {}
    }

    if (idbOk !== lsOk) {
      console.warn(TAG, 'saveState divergence: IDB=' + idbOk + ' LS=' + lsOk);
    }

    return anyOk;
  }

  // ─────────────────────────────────────────────────────────────
  // NOUVEAU loadState : lit les 2 storages, garde le plus récent
  // ─────────────────────────────────────────────────────────────

  async function loadState() {
    try {
      if (sessionStorage.getItem('nexus_factory_reset') === '1') {
        sessionStorage.removeItem('nexus_factory_reset');
        console.log(TAG, 'factoryReset détecté — démarrage à blanc');
        if (_hasS()) {
          window.S.tradingAccount       = 0;
          window.S.cashAccount          = 0;
          window.S.portfolio            = 0;
          window.S.portfolioTotal       = 0;
          window.S.fiscalReserveAccount = 0;
        }
        return false;
      }
    } catch(e) {}

    const [snapIDB, snapLS] = await Promise.all([
      _readIDB(),
      Promise.resolve(_readLS())
    ]);

    const cIDB = snapIDB ? snapIDB.cycle : '∅';
    const cLS = snapLS ? snapLS.cycle : '∅';
    console.log(TAG, 'loadState · cycle IDB=' + cIDB + ' LS=' + cLS);

    const snap = _pickFreshest(snapIDB, snapLS);

    if (!snap) {
      console.log(TAG, 'aucun snapshot trouvé — démarrage neuf');
      return false;
    }

    try {
      if (typeof window._applySnapshot === 'function') {
        window._applySnapshot(snap);
      } else {
        _applySnapMinimal(snap);
      }
    } catch(e) {
      console.error(TAG, 'application du snap a planté:', e);
      return false;
    }

    if (snapIDB && snapLS) {
      const winnerIsIDB = (snap === snapIDB);
      if (winnerIsIDB && snapLS.cycle !== snapIDB.cycle) {
        _writeLS(snap);
        console.log(TAG, 'resync LS ← IDB (cycle ' + snap.cycle + ')');
      } else if (!winnerIsIDB && snapLS.cycle !== snapIDB.cycle) {
        _writeIDB(snap);
        console.log(TAG, 'resync IDB ← LS (cycle ' + snap.cycle + ')');
      }
    } else if (snapIDB && !snapLS) {
      _writeLS(snap);
    } else if (snapLS && !snapIDB) {
      _writeIDB(snap);
    }

    if (typeof window.renderAll === 'function') {
      try { window.renderAll(); } catch(e) {}
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // _applySnapMinimal v120.6 — RESTAURATION COMPLÈTE
  // ─────────────────────────────────────────────────────────────
  // Restaure TOUS les champs sauvegardés par buildSnapshot() (09b1).
  // Synchronisé avec 09b1-build-snapshot.js v121.
  // ─────────────────────────────────────────────────────────────

  function _applySnapMinimal(snap) {
    if (!_hasS() || !snap) return;
    const S = window.S;

    // ── Helpers internes ─────────────────────────────────
    const setNum   = k => { if (typeof snap[k] === 'number')  S[k] = snap[k]; };
    const setBool  = k => { if (typeof snap[k] === 'boolean') S[k] = snap[k]; };
    const setStr   = k => { if (typeof snap[k] === 'string')  S[k] = snap[k]; };
    const setObj   = k => { if (snap[k] && typeof snap[k] === 'object' && !Array.isArray(snap[k])) S[k] = snap[k]; };
    const setArr   = k => { if (Array.isArray(snap[k]))       S[k] = snap[k].slice(); };
    const setAny   = k => { if (snap[k] !== undefined && snap[k] !== null) S[k] = snap[k]; };

    // ─── PORTEFEUILLE ──────────────────────────────────────────
    setNum('portfolio');
    setNum('cashAccount');
    setNum('tradingAccount');
    setNum('leverage');
    setBool('botAutoMode');
    setNum('_startPortfolio');

    // ─── CYCLE ─────────────────────────────────────────────────
    setNum('cycle');
    setNum('cycleMax');

    // ─── VERSION ───────────────────────────────────────────────
    setAny('vMajor');
    setAny('vMinor');

    // ─── COMPOUNDING & GÉNÉRATIONS ─────────────────────────────
    setNum('_totalCompounded');
    setNum('_genCount');

    // ─── STATS GLOBALES ────────────────────────────────────────
    setNum('totalTrades');
    setNum('winTrades');
    setNum('pnl24h');
    setArr('pnlHistory');

    // ─── MODE TRADING ──────────────────────────────────────────
    setStr('tradingMode');
    setStr('realTimeframe');
    setStr('paperRealTimeframe');

    // ─── RÉSERVE LEVIER ────────────────────────────────────────
    setNum('leverageReserve');
    setNum('leverageBorrowed');
    setNum('leverageTotalFees');
    setNum('_autoLevBase');
    setNum('_autoLevBorrowed');

    // ─── COMPTES FIAT / FISCAL / FONDS PROPRES ─────────────────
    setNum('fiscalReserveAccount');
    setArr('fiscalReserveLog');
    setNum('ownFundsInjected');
    setArr('ownFundsLog');
    setNum('fiatConvFeePct');

    // ─── HISTORIQUES & LOGS ────────────────────────────────────
    setArr('openPositions');
    setArr('chainLog');
    setArr('learningHistory');
    setArr('evoLog');
    setArr('agentLessons');
    setArr('agentLessonsReal');
    setArr('agentLessonsPaperReal');
    setArr('brainLog');
    setArr('pendingActions');
    setArr('dreams');
    setArr('dreamJournal');
    setArr('decisionCascade');
    setArr('resonanceHistory');
    setArr('globalMemoryPool');
    setArr('tradeContextMemory');
    setArr('pairCandidates');
    setArr('proposals');
    setArr('mutedAgents');
    setArr('dynamicPairKeys');

    // ─── FRAIS & TAXES ─────────────────────────────────────────
    setObj('fees');
    setObj('feeConfig');
    setObj('taxConfig');

    // ─── INTELLIGENCE & ANALYTICS ──────────────────────────────
    setObj('heatmap');
    setObj('shadow');
    setObj('archives');
    setObj('botFleet');
    setObj('pnlPeriod');
    setObj('abTesting');
    setObj('adaptiveState');

    // ─── MODE RÉEL ─────────────────────────────────────────────
    setObj('realActivePairs');
    setObj('realKillSwitch');
    setNum('realModeStartedAt');
    setObj('realStatsByPair');
    setAny('preRealSnapshot');
    setObj('realCandles');

    // ─── MODE PAPER-REAL ───────────────────────────────────────
    setObj('paperRealStats');
    setObj('paperRealActivePairs');
    setNum('paperRealStartedAt');
    setObj('paperRealKillSwitch');
    setObj('paperRealLastClose');
    setNum('paperRealConsecLosses');
    setNum('paperRealGlobalPauseUntil');
    setObj('paperRealConfig');
    setAny('preRealSnapshotPaperReal');

    // ─── AGENTS : merge granulaire (ne pas écraser les .think etc.) ──
    if (Array.isArray(snap.agents) && Array.isArray(S.agents)) {
      snap.agents.forEach(savedAg => {
        const live = S.agents.find(a => a.id === savedAg.id);
        if (!live) return;
        if (typeof savedAg.fitness === 'number') live.fitness = savedAg.fitness;
        if (typeof savedAg.score   === 'number') live.score   = savedAg.score;
        if (typeof savedAg.conf    === 'number') live.conf    = savedAg.conf;
        if (Array.isArray(savedAg.fitnessHistory)) live.fitnessHistory = savedAg.fitnessHistory.slice();
        if (Array.isArray(savedAg.memory)) live.memory = savedAg.memory.slice();
        if (savedAg.regimeFitness) live.regimeFitness = savedAg.regimeFitness;
        if (typeof savedAg.learningEvents === 'number') live.learningEvents = savedAg.learningEvents;
        if (typeof savedAg.totalReward    === 'number') live.totalReward    = savedAg.totalReward;
        if (typeof savedAg.errors      === 'number') live.errors      = savedAg.errors;
        if (typeof savedAg.corrections === 'number') live.corrections = savedAg.corrections;
        if (typeof savedAg.streak      === 'number') live.streak      = savedAg.streak;
        if (typeof savedAg.lastPnl     === 'number') live.lastPnl     = savedAg.lastPnl;
      });
    }

    // ─── AGENT MEMORIES (snap.agentMemories : { agentId: [...] }) ──
    if (snap.agentMemories && typeof snap.agentMemories === 'object' && Array.isArray(S.agents)) {
      Object.entries(snap.agentMemories).forEach(([agentId, mem]) => {
        const live = S.agents.find(a => a.id === agentId);
        if (live && Array.isArray(mem)) {
          live.memory = mem.slice();
        }
      });
    }

    // ─── PAIRSTATES : merge granulaire ─────────────────────────
    if (snap.pairStates && S.pairStates) {
      Object.entries(snap.pairStates).forEach(([pair, ps]) => {
        if (!S.pairStates[pair]) return;
        const live = S.pairStates[pair];
        if (typeof ps.price === 'number')  live.price = ps.price;
        if (typeof ps.qYes === 'number')   live.qYes = ps.qYes;
        if (typeof ps.qNo === 'number')    live.qNo = ps.qNo;
        if (typeof ps.stake === 'number')  live.stake = ps.stake;
        if (typeof ps.capital === 'number')live.capital = ps.capital;
        if (typeof ps.cycleMax === 'number')   live.cycleMax = ps.cycleMax;
        if (typeof ps.cycleTimer === 'number') live.cycleTimer = ps.cycleTimer;
        if (typeof ps.totalTrades === 'number') live.totalTrades = ps.totalTrades;
        if (typeof ps.winTrades === 'number')   live.winTrades = ps.winTrades;
        if (typeof ps.totalPnlPct === 'number') live.totalPnlPct = ps.totalPnlPct;
        if (typeof ps.totalPnlUsd === 'number') live.totalPnlUsd = ps.totalPnlUsd;
        if (typeof ps.pnl24h === 'number')      live.pnl24h = ps.pnl24h;
        if (typeof ps.pairLeverage === 'number') live.pairLeverage = ps.pairLeverage;
        if (typeof ps.threshold === 'number')   live.threshold = ps.threshold;
        if (typeof ps.userStake === 'boolean')  live.userStake = ps.userStake;
        if (typeof ps.userCycleSet === 'boolean') live.userCycleSet = ps.userCycleSet;
        if (typeof ps.lastAction === 'string')  live.lastAction = ps.lastAction;
        if (typeof ps.holdStartTs === 'number') live.holdStartTs = ps.holdStartTs;
        if (Array.isArray(ps.trades))  live.trades  = ps.trades.slice();
        if (Array.isArray(ps.candles)) live.candles = ps.candles.slice();
      });
    }

    // ─── PAIRSTATES BEST/WORST (snap.pairBestWorst) ────────────
    if (snap.pairBestWorst && S.pairStates) {
      Object.entries(snap.pairBestWorst).forEach(([pair, bw]) => {
        if (!S.pairStates[pair]) return;
        if (bw.bestTrade)  S.pairStates[pair].bestTrade  = bw.bestTrade;
        if (bw.worstTrade) S.pairStates[pair].worstTrade = bw.worstTrade;
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NOUVEAU importState : sans blob v105 hardcodé
  // ─────────────────────────────────────────────────────────────

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
        if (!snap || (snap.version != null && snap.version < 2)) {
          if (typeof window.showToast === 'function') {
            window.showToast('❌ Fichier invalide ou trop ancien', 4000, 'user');
          }
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

        const wasRunning = (typeof window._simRunning !== 'undefined') ? window._simRunning : false;
        if (wasRunning && typeof window.stopSim === 'function') {
          window.stopSim();
        }

        await Promise.all([
          _writeIDB(snap),
          Promise.resolve(_writeLS(snap))
        ]);

        await loadState();

        if (typeof window.showToast === 'function') {
          window.showToast('✅ Sauvegarde restaurée · cycle #' + (snap.cycle || '?'), 3500, 'user');
        }

        if (wasRunning && typeof window.startSim === 'function') {
          window.startSim();
        }

        if (typeof window.renderAll === 'function') {
          try { window.renderAll(); } catch(e) {}
        }
      } catch(err) {
        console.error(TAG, 'import failed:', err);
        if (typeof window.showToast === 'function') {
          window.showToast('❌ Import échoué : ' + err.message, 4000, 'user');
        }
      }
    };
    input.click();
  }

  // ─────────────────────────────────────────────────────────────
  // Installation des overrides
  // ─────────────────────────────────────────────────────────────

  window.saveState   = saveState;
  window.loadState   = loadState;
  window.importState = importState;

  window._persistance = {
    version: '120.6',
    readIDB: _readIDB,
    readLS: _readLS,
    writeIDB: _writeIDB,
    writeLS: _writeLS,
    pickFreshest: _pickFreshest,
    saveState: saveState,
    loadState: loadState,
    applySnapMinimal: _applySnapMinimal
  };

  console.log(TAG, '✅ overrides installés · saveState/loadState/importState');

  // ─────────────────────────────────────────────────────────────
  // Autosave 5s + hooks de fermeture
  // ─────────────────────────────────────────────────────────────

  let _autoSaveTimer = null;
  let _saveInFlight = false;

  async function _autoSaveTick() {
    if (_saveInFlight) return;
    if (!_hasS() || !_hasBuildSnapshot()) return;
    _saveInFlight = true;
    try {
      await saveState(true);
    } catch(e) {
      console.warn(TAG, 'autosave tick error:', e);
    } finally {
      _saveInFlight = false;
    }
  }

  function _startAutoSave() {
    if (_autoSaveTimer) return;
    _autoSaveTimer = setInterval(_autoSaveTick, 5000);
    console.log(TAG, '⏱ autosave 5s actif');
  }

  function _stopAutoSave() {
    if (_autoSaveTimer) {
      clearInterval(_autoSaveTimer);
      _autoSaveTimer = null;
    }
  }

  function _flushSyncOnExit(reason) {
    try {
      if (!_hasBuildSnapshot()) return;
      const snap = window.buildSnapshot();
      if (!snap) return;

      try {
        const currentLS = _readLS();
        const lsCycle = currentLS && typeof currentLS.cycle === 'number' ? currentLS.cycle : -1;
        const snapCycle = typeof snap.cycle === 'number' ? snap.cycle : -1;
        if (lsCycle > snapCycle + 5) {
          console.warn(TAG, 'flush ' + reason + ' BLOQUÉ : cycle #' + snapCycle +
            ' < #' + lsCycle + ' (anti-régression)');
          return;
        }
      } catch(e) {}

      if (!snap.savedAt) snap.savedAt = new Date().toISOString();
      if (!snap.key) snap.key = SAVE_KEY;
      _writeLS(snap);
      _writeIDB(snap).catch(() => {});
      console.log(TAG, 'flush sur ' + reason + ' · cycle ' + (snap.cycle || '?'));
    } catch(e) {
      console.warn(TAG, 'flush ' + reason + ' a planté:', e);
    }
  }

  window.addEventListener('pagehide',      () => _flushSyncOnExit('pagehide'));
  window.addEventListener('beforeunload',  () => _flushSyncOnExit('beforeunload'));
  window.addEventListener('freeze',        () => _flushSyncOnExit('freeze'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flushSyncOnExit('visibility-hidden');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _startAutoSave);
  } else {
    _startAutoSave();
  }

  window._persistance.startAutoSave = _startAutoSave;
  window._persistance.stopAutoSave  = _stopAutoSave;
  window._persistance.flushSync     = _flushSyncOnExit;

  function _bootApp() {
    if (typeof window.init !== 'function') {
      console.warn(TAG, 'init() non disponible — démarrage différé de 50ms');
      setTimeout(_bootApp, 50);
      return;
    }
    try {
      window.init();
    } catch(e) {
      console.error(TAG, 'init() a planté:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootApp);
  } else {
    _bootApp();
  }

})();
