// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 · 00b-persistance-override.js · VERSION 120.5 · 21/05/2026 ▓▓▓
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
// CHARGEMENT : doit être inclus dans le HTML APRÈS le runtime 09a→09k.
//
// NE TOUCHE PAS AUX FICHIERS 09. Override pur via window.saveState/loadState.
//
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Garde-fou : ne s'installe que si l'environnement AURA8 est prêt
  if (typeof window === 'undefined') return;

  const TAG = '[persistance v120.1]';

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

  function _applySnapMinimal(snap) {
    if (!_hasS() || !snap) return;
    const S = window.S;

    if (typeof snap.portfolio        === 'number') S.portfolio        = snap.portfolio;
    if (typeof snap.cashAccount      === 'number') S.cashAccount      = snap.cashAccount;
    if (typeof snap.tradingAccount   === 'number') S.tradingAccount   = snap.tradingAccount;
    if (typeof snap.leverage         === 'number') S.leverage         = snap.leverage;
    if (typeof snap.botAutoMode      === 'boolean')S.botAutoMode      = snap.botAutoMode;
    if (typeof snap.cycle            === 'number') S.cycle            = snap.cycle;
    if (typeof snap.cycleMax         === 'number') S.cycleMax         = snap.cycleMax;
    if (typeof snap.fiscalReserveAccount === 'number') S.fiscalReserveAccount = snap.fiscalReserveAccount;
    if (typeof snap.ownFundsInjected === 'number') S.ownFundsInjected = snap.ownFundsInjected;
    if (typeof snap.leverageReserve  === 'number') S.leverageReserve  = snap.leverageReserve;
    if (typeof snap.leverageBorrowed === 'number') S.leverageBorrowed = snap.leverageBorrowed;

    if (snap.tradingMode)      S.tradingMode      = snap.tradingMode;
    if (snap.realTimeframe)    S.realTimeframe    = snap.realTimeframe;
    if (snap.paperRealTimeframe) S.paperRealTimeframe = snap.paperRealTimeframe;

    if (typeof snap.totalTrades === 'number') S.totalTrades = snap.totalTrades;
    if (typeof snap.winTrades   === 'number') S.winTrades   = snap.winTrades;
    if (typeof snap.pnl24h      === 'number') S.pnl24h      = snap.pnl24h;
    if (Array.isArray(snap.pnlHistory)) S.pnlHistory = snap.pnlHistory.slice();

    if (Array.isArray(snap.openPositions))   S.openPositions   = snap.openPositions.slice();
    if (Array.isArray(snap.chainLog))        S.chainLog        = snap.chainLog.slice();
    if (Array.isArray(snap.learningHistory)) S.learningHistory = snap.learningHistory.slice();
    if (Array.isArray(snap.evoLog))          S.evoLog          = snap.evoLog.slice();
    if (Array.isArray(snap.agentLessons))    S.agentLessons    = snap.agentLessons.slice();

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
      });
    }

    if (snap.pairStates && S.pairStates) {
      Object.entries(snap.pairStates).forEach(([pair, ps]) => {
        if (!S.pairStates[pair]) return;
        const live = S.pairStates[pair];
        if (typeof ps.price === 'number')  live.price = ps.price;
        if (typeof ps.qYes === 'number')   live.qYes = ps.qYes;
        if (typeof ps.qNo === 'number')    live.qNo = ps.qNo;
        if (typeof ps.stake === 'number')  live.stake = ps.stake;
        if (typeof ps.capital === 'number')live.capital = ps.capital;
        if (typeof ps.totalTrades === 'number') live.totalTrades = ps.totalTrades;
        if (typeof ps.winTrades === 'number')   live.winTrades = ps.winTrades;
        if (typeof ps.totalPnlPct === 'number') live.totalPnlPct = ps.totalPnlPct;
        if (typeof ps.totalPnlUsd === 'number') live.totalPnlUsd = ps.totalPnlUsd;
        if (typeof ps.pnl24h === 'number')      live.pnl24h = ps.pnl24h;
        if (Array.isArray(ps.trades))  live.trades  = ps.trades.slice();
        if (Array.isArray(ps.candles)) live.candles = ps.candles.slice();
      });
    }

    if (snap.fees)      S.fees      = snap.fees;
    if (snap.feeConfig) S.feeConfig = snap.feeConfig;
    if (snap.taxConfig) S.taxConfig = snap.taxConfig;
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
    version: '120.3',
    readIDB: _readIDB,
    readLS: _readLS,
    writeIDB: _writeIDB,
    writeLS: _writeLS,
    pickFreshest: _pickFreshest,
    saveState: saveState,
    loadState: loadState
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
