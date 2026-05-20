// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 · 00b-persistance-override.js · VERSION 120.2 · 20/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// OBJECTIF : remplacer saveState/loadState/importState par des versions
// fiables qui :
//   1. Écrivent EN PARALLÈLE dans IndexedDB ET localStorage (plus de fallback)
//   2. Lisent les DEUX storages au load, et gardent le plus récent
//      (priorité au cycle le plus élevé, anti-régression)
//   3. Suppriment le blob v105 hardcodé qui polluait importState
//   4. Installent un autosave 5s autonome + hooks de fermeture
//      (pas besoin du 11-persistance.js)
//
// CHARGEMENT : doit être inclus dans le HTML APRÈS 10-fin-bloc-restauration.
//
// NE TOUCHE PAS AU FICHIER 09. Override pur via window.saveState/loadState.
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
    try {
      const db = await window.openDB();
      return await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_STATE, 'readonly');
          const req = tx.objectStore(STORE_STATE).get(SAVE_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch(e) { resolve(null); }
      });
    } catch(e) {
      console.warn(TAG, 'readIDB error:', e);
      return null;
    }
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
    if (!_hasOpenDB()) return false;
    try {
      const db = await window.openDB();
      return await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_STATE, 'readwrite');
          const req = tx.objectStore(STORE_STATE).put(snap);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch(e) { resolve(false); }
      });
    } catch(e) {
      console.warn(TAG, 'writeIDB error:', e);
      return false;
    }
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

  // Choisir entre 2 snaps : le plus récent (cycle prioritaire, savedAt secondaire)
  function _pickFreshest(snapA, snapB) {
    if (!snapA && !snapB) return null;
    if (!snapA) return snapB;
    if (!snapB) return snapA;
    // Comparer cycles d'abord (anti-régression)
    const cA = (typeof snapA.cycle === 'number') ? snapA.cycle : -1;
    const cB = (typeof snapB.cycle === 'number') ? snapB.cycle : -1;
    if (cA !== cB) return (cA > cB) ? snapA : snapB;
    // Égalité de cycle : départager par savedAt
    const tA = snapA.savedAt ? Date.parse(snapA.savedAt) : 0;
    const tB = snapB.savedAt ? Date.parse(snapB.savedAt) : 0;
    if (tA !== tB) return (tA > tB) ? snapA : snapB;
    // Égalité totale : prendre A (IDB par convention)
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

    // S'assurer que savedAt est présent et frais (au cas où buildSnapshot l'oublierait)
    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    if (!snap.key) snap.key = SAVE_KEY;

    // Écriture PARALLÈLE — pas de fallback, les deux écrivent simultanément
    const [idbOk, lsOk] = await Promise.all([
      _writeIDB(snap),
      Promise.resolve(_writeLS(snap))
    ]);

    const anyOk = idbOk || lsOk;

    // Indicateur visuel
    if (anyOk && !silent && typeof window.updateSaveIndicator === 'function') {
      try { window.updateSaveIndicator('saved'); } catch(e) {}
    } else if (!anyOk && typeof window.updateSaveIndicator === 'function') {
      try { window.updateSaveIndicator('error'); } catch(e) {}
    }

    // Log discret en cas de divergence (utile pour debug futur)
    if (idbOk !== lsOk) {
      console.warn(TAG, 'saveState divergence: IDB=' + idbOk + ' LS=' + lsOk);
    }

    return anyOk;
  }

  // ─────────────────────────────────────────────────────────────
  // NOUVEAU loadState : lit les 2 storages, garde le plus récent
  // ─────────────────────────────────────────────────────────────

  async function loadState() {
    // Bypass factoryReset (même logique que l'ancien)
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

    // Lecture parallèle des 2 storages
    const [snapIDB, snapLS] = await Promise.all([
      _readIDB(),
      Promise.resolve(_readLS())
    ]);

    // Diagnostic léger (visible côté Guardian/console)
    const cIDB = snapIDB ? snapIDB.cycle : '∅';
    const cLS = snapLS ? snapLS.cycle : '∅';
    console.log(TAG, 'loadState · cycle IDB=' + cIDB + ' LS=' + cLS);

    const snap = _pickFreshest(snapIDB, snapLS);

    if (!snap) {
      console.log(TAG, 'aucun snapshot trouvé — démarrage neuf');
      return false;
    }

    // Appliquer le snap à S — on délègue à _applySnapToState
    // (réutilise la logique existante du 09 si elle est exposée, sinon fallback minimal)
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

    // Re-synchroniser les 2 storages avec le snap gagnant
    // (si IDB et LS divergeaient, on les remet d'accord)
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

    // Rendu UI après chargement (fix bug cards à $0 au démarrage)
    if (typeof window.renderAll === 'function') {
      try { window.renderAll(); } catch(e) {}
    }

    return true;
  }

  // Application minimale d'un snap si _applySnapshot n'existe pas
  // (copie des champs essentiels sur S — l'ancien loadState du 09
  // s'occupera des détails s'il est appelé après)
  function _applySnapMinimal(snap) {
    if (!_hasS() || !snap) return;
    const S = window.S;

    // Comptes principaux
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

    // Mode trading
    if (snap.tradingMode)      S.tradingMode      = snap.tradingMode;
    if (snap.realTimeframe)    S.realTimeframe    = snap.realTimeframe;
    if (snap.paperRealTimeframe) S.paperRealTimeframe = snap.paperRealTimeframe;

    // Stats globales
    if (typeof snap.totalTrades === 'number') S.totalTrades = snap.totalTrades;
    if (typeof snap.winTrades   === 'number') S.winTrades   = snap.winTrades;
    if (typeof snap.pnl24h      === 'number') S.pnl24h      = snap.pnl24h;
    if (Array.isArray(snap.pnlHistory)) S.pnlHistory = snap.pnlHistory.slice();

    // Collections (copies défensives)
    if (Array.isArray(snap.openPositions))   S.openPositions   = snap.openPositions.slice();
    if (Array.isArray(snap.chainLog))        S.chainLog        = snap.chainLog.slice();
    if (Array.isArray(snap.learningHistory)) S.learningHistory = snap.learningHistory.slice();
    if (Array.isArray(snap.evoLog))          S.evoLog          = snap.evoLog.slice();
    if (Array.isArray(snap.agentLessons))    S.agentLessons    = snap.agentLessons.slice();

    // Agents : préserver structure runtime, restaurer fitness/score/conf
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

    // PairStates : copie des champs critiques
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

    // Fees & taxes
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

        // Stopper la sim si elle tourne
        const wasRunning = (typeof window._simRunning !== 'undefined') ? window._simRunning : false;
        if (wasRunning && typeof window.stopSim === 'function') {
          window.stopSim();
        }

        // Écrire le snap importé dans les 2 storages
        await Promise.all([
          _writeIDB(snap),
          Promise.resolve(_writeLS(snap))
        ]);

        // Recharger l'état (utilise le nouveau loadState)
        await loadState();

        if (typeof window.showToast === 'function') {
          window.showToast('✅ Sauvegarde restaurée · cycle #' + (snap.cycle || '?'), 3500, 'user');
        }

        // Reprendre la sim si elle tournait
        if (wasRunning && typeof window.startSim === 'function') {
          window.startSim();
        }

        // Render UI
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

  // On installe maintenant (les fonctions du 09 ont déjà été assignées à window
  // car ce fichier se charge APRÈS 09 et 10)
  window.saveState   = saveState;
  window.loadState   = loadState;
  window.importState = importState;

  // Exposer aussi des helpers utilitaires (utiles pour Guardian + debug)
  window._persistance = {
    version: '120.2',
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
  // Autosave 5s + hooks de fermeture (autonome, sans le 11)
  // ─────────────────────────────────────────────────────────────

  let _autoSaveTimer = null;
  let _saveInFlight = false;

  async function _autoSaveTick() {
    // Skip si une save est déjà en cours (évite empilement sur tab gelé)
    if (_saveInFlight) return;
    // Skip si pas de S ou pas de buildSnapshot (app pas encore prête)
    if (!_hasS() || !_hasBuildSnapshot()) return;
    _saveInFlight = true;
    try {
      await saveState(true); // silent
    } catch(e) {
      console.warn(TAG, 'autosave tick error:', e);
    } finally {
      _saveInFlight = false;
    }
  }

  function _startAutoSave() {
    if (_autoSaveTimer) return; // déjà actif
    _autoSaveTimer = setInterval(_autoSaveTick, 5000);
    console.log(TAG, '⏱ autosave 5s actif');
  }

  function _stopAutoSave() {
    if (_autoSaveTimer) {
      clearInterval(_autoSaveTimer);
      _autoSaveTimer = null;
    }
  }

  // Save synchrone forcée sur fermeture (localStorage uniquement, car IDB
  // est asynchrone et peut être tuée avant flush par le navigateur)
  function _flushSyncOnExit(reason) {
    try {
      if (!_hasBuildSnapshot()) return;
      const snap = window.buildSnapshot();
      if (!snap) return;
      if (!snap.savedAt) snap.savedAt = new Date().toISOString();
      if (!snap.key) snap.key = SAVE_KEY;
      _writeLS(snap); // synchrone, garanti
      // Tenter IDB aussi (best-effort, peut être interrompu)
      _writeIDB(snap).catch(() => {});
      console.log(TAG, 'flush sur ' + reason + ' · cycle ' + (snap.cycle || '?'));
    } catch(e) {
      console.warn(TAG, 'flush ' + reason + ' a planté:', e);
    }
  }

  // Hooks navigateur — capter tous les moments de fermeture/mise en arrière-plan
  window.addEventListener('pagehide',      () => _flushSyncOnExit('pagehide'));
  window.addEventListener('beforeunload',  () => _flushSyncOnExit('beforeunload'));
  window.addEventListener('freeze',        () => _flushSyncOnExit('freeze'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flushSyncOnExit('visibility-hidden');
  });

  // Démarrer l'autosave dès que possible
  // (l'app peut ne pas être complètement initialisée tout de suite,
  // mais _autoSaveTick gère lui-même les pré-requis manquants)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _startAutoSave);
  } else {
    _startAutoSave();
  }

  // Exposer les contrôles autosave (utile pour debug ou désactivation temporaire)
  window._persistance.startAutoSave = _startAutoSave;
  window._persistance.stopAutoSave  = _stopAutoSave;
  window._persistance.flushSync     = _flushSyncOnExit;

})();
