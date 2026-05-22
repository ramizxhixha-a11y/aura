// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 · 00b-persistance-override.js · VERSION 121 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// FIX RACINE — accès à S/openDB/buildSnapshot/renderAll via (0, eval)
//
// Pourquoi : S est déclaré "const S = ..." dans 02-state-init.js, donc
// accessible dans le scope global du script principal MAIS PAS via window.S.
// Idem pour openDB, buildSnapshot, renderAll qui peuvent être const.
//
// Ancien 00b v120.3 : utilisait window.S partout → modifications jamais
// appliquées (window.S = undefined). loadState retournait true mais
// laissait S à son état initial (cycle=42, portfolio=0).
//
// v121 : helper _resolve(name) qui essaie window[name] puis (0, eval)(name).
// Renvoie la vraie référence si elle existe, null sinon.
//
// + Restauration COMPLÈTE : boucle sur toutes les clés du snap, plus
// d'_applySnapMinimal qui oubliait 60% des champs.
//
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  if (typeof window === 'undefined') return;

  const TAG = '[persistance v121]';
  const SAVE_KEY    = 'nexus_state_v2';
  const STORE_STATE = 'state';

  // Champs meta du snap qu'on ne doit PAS copier sur S
  const META_KEYS = new Set(['key', 'savedAt', 'version']);

  // ─────────────────────────────────────────────────────────────
  // Helpers — résolution de noms globaux (const ou window)
  // ─────────────────────────────────────────────────────────────

  // Résoudre un nom global : essaie window[name] puis (0, eval)(name).
  // Marche pour const, let, var, function déclarées au scope global du script.
  function _resolve(name) {
    try {
      if (typeof window[name] !== 'undefined' && window[name] !== null) {
        return window[name];
      }
    } catch(e) {}
    try {
      return (0, eval)('typeof ' + name + ' !== "undefined" ? ' + name + ' : null');
    } catch(e) {
      return null;
    }
  }

  function _getS()              { return _resolve('S'); }
  function _getOpenDB()         { return _resolve('openDB'); }
  function _getBuildSnapshot()  { return _resolve('buildSnapshot'); }
  function _getRenderAll()      { return _resolve('renderAll'); }
  function _getShowToast()      { return _resolve('showToast'); }
  function _getStopSim()        { return _resolve('stopSim'); }
  function _getStartSim()       { return _resolve('startSim'); }

  function _hasS()             { return _getS() !== null && typeof _getS() === 'object'; }
  function _hasOpenDB()        { return typeof _getOpenDB() === 'function'; }
  function _hasBuildSnapshot() { return typeof _getBuildSnapshot() === 'function'; }

  // ─────────────────────────────────────────────────────────────
  // I/O storage
  // ─────────────────────────────────────────────────────────────

  async function _readIDB() {
    const openDB = _getOpenDB();
    if (typeof openDB !== 'function') return null;
    let db;
    try { db = await openDB(); }
    catch(e) { console.warn(TAG, 'readIDB openDB:', e && e.message); return null; }
    if (!db) return null;
    if (!db.objectStoreNames || !db.objectStoreNames.contains(STORE_STATE)) {
      console.warn(TAG, 'readIDB: store introuvable');
      return null;
    }
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_STATE, 'readonly');
        const store = tx.objectStore(STORE_STATE);
        const req = store.get(SAVE_KEY);
        req.onsuccess = () => {
          if (req.result) { resolve(req.result); return; }
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
        console.warn(TAG, 'readIDB:', e && e.message);
        resolve(null);
      }
    });
  }

  function _readLS() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) {
      console.warn(TAG, 'readLS:', e);
      return null;
    }
  }

  async function _writeIDB(snap) {
    const openDB = _getOpenDB();
    if (typeof openDB !== 'function') {
      console.warn(TAG, 'writeIDB: openDB manquant');
      return false;
    }
    let db;
    try { db = await openDB(); }
    catch(e) { console.warn(TAG, 'writeIDB openDB:', e && e.message); return false; }
    if (!db) return false;
    if (!db.objectStoreNames || !db.objectStoreNames.contains(STORE_STATE)) {
      console.warn(TAG, 'writeIDB: store introuvable');
      return false;
    }
    return await new Promise((resolve) => {
      let tx;
      try { tx = db.transaction(STORE_STATE, 'readwrite'); }
      catch(e) { console.warn(TAG, 'writeIDB tx:', e && e.message); return resolve(false); }
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
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
        console.warn(TAG, 'writeIDB put:', e && e.message);
        return resolve(false);
      }
      req.onsuccess = () => resolve(true);
      req.onerror   = () => resolve(false);
    });
  }

  function _writeLS(snap) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      return true;
    } catch(e) {
      console.warn(TAG, 'writeLS:', e);
      return false;
    }
  }

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
  // saveState : dual-write parallèle
  // ─────────────────────────────────────────────────────────────

  async function saveState(silent) {
    const buildSnapshot = _getBuildSnapshot();
    if (typeof buildSnapshot !== 'function') {
      console.warn(TAG, 'saveState: buildSnapshot manquant');
      return false;
    }

    let snap;
    try { snap = buildSnapshot(); }
    catch(e) { console.error(TAG, 'saveState buildSnapshot:', e); return false; }

    if (!snap) return false;
    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    if (!snap.key) snap.key = SAVE_KEY;

    // Garde-fou anti-régression : refuser d'écrire un cycle bas si le storage
    // actuel a un cycle haut (anti-overwrite #42 sur #16520)
    if (typeof snap.cycle === 'number' && snap.cycle < 1000) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const existing = JSON.parse(raw);
          if (existing && typeof existing.cycle === 'number' && existing.cycle > snap.cycle + 5) {
            console.warn(TAG, 'saveState BLOQUÉ: tentative écriture cycle=' + snap.cycle +
                              ' alors que storage a cycle=' + existing.cycle);
            return false;
          }
        }
      } catch(e) {}
    }

    const [idbOk, lsOk] = await Promise.all([
      _writeIDB(snap),
      Promise.resolve(_writeLS(snap))
    ]);

    const anyOk = idbOk || lsOk;

    if (anyOk && !silent) {
      const upd = _resolve('updateSaveIndicator');
      if (typeof upd === 'function') { try { upd('saved'); } catch(e) {} }
    }

    return anyOk;
  }

  // ─────────────────────────────────────────────────────────────
  // loadState : lit les 2 storages, garde le plus récent, applique TOUT
  // ─────────────────────────────────────────────────────────────

  async function loadState() {
    // Bypass factoryReset
    try {
      if (sessionStorage.getItem('nexus_factory_reset') === '1') {
        sessionStorage.removeItem('nexus_factory_reset');
        console.log(TAG, 'factoryReset — démarrage à blanc');
        const S = _getS();
        if (S) {
          S.tradingAccount       = 0;
          S.cashAccount          = 0;
          S.portfolio            = 0;
          S.portfolioTotal       = 0;
          S.fiscalReserveAccount = 0;
        }
        return false;
      }
    } catch(e) {}

    const [snapIDB, snapLS] = await Promise.all([
      _readIDB(),
      Promise.resolve(_readLS())
    ]);

    const cIDB = snapIDB ? snapIDB.cycle : '∅';
    const cLS  = snapLS  ? snapLS.cycle  : '∅';
    console.log(TAG, 'loadState · cycle IDB=' + cIDB + ' LS=' + cLS);

    const snap = _pickFreshest(snapIDB, snapLS);
    if (!snap) {
      console.log(TAG, 'aucun snapshot trouvé');
      return false;
    }

    try {
      _applyFullSnap(snap);
    } catch(e) {
      console.error(TAG, 'application snap:', e);
      return false;
    }

    // Resync storages divergents
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

    // Render UI après chargement
    const renderAll = _getRenderAll();
    if (typeof renderAll === 'function') {
      try { renderAll(); } catch(e) {}
    }

    return true;
  }

  // Application COMPLÈTE du snap sur S — toutes les clés sauf meta
  function _applyFullSnap(snap) {
    const S = _getS();
    if (!S || !snap) return;

    let applied = 0;
    let errors = 0;

    for (const k in snap) {
      if (!snap.hasOwnProperty(k)) continue;
      if (META_KEYS.has(k)) continue;
      try {
        S[k] = snap[k];
        applied++;
      } catch(e) {
        errors++;
      }
    }

    console.log(TAG, '_applyFullSnap · ' + applied + ' champs appliqués · ' + errors + ' erreurs');
  }

  // ─────────────────────────────────────────────────────────────
  // importState : sans blob hardcodé
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
          const t = _getShowToast();
          if (typeof t === 'function') t('❌ Fichier invalide ou trop ancien', 4000, 'user');
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
        if (wasRunning) {
          const stop = _getStopSim();
          if (typeof stop === 'function') stop();
        }

        // Écrire dans les 2 storages
        await Promise.all([
          _writeIDB(snap),
          Promise.resolve(_writeLS(snap))
        ]);

        // Recharger
        await loadState();

        const t = _getShowToast();
        if (typeof t === 'function') t('✅ Sauvegarde restaurée · cycle #' + (snap.cycle || '?'), 3500, 'user');

        if (wasRunning) {
          const start = _getStartSim();
          if (typeof start === 'function') start();
        }

        const renderAll = _getRenderAll();
        if (typeof renderAll === 'function') {
          try { renderAll(); } catch(e) {}
        }
      } catch(err) {
        console.error(TAG, 'import:', err);
        const t = _getShowToast();
        if (typeof t === 'function') t('❌ Import échoué : ' + err.message, 4000, 'user');
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
    version: '121',
    readIDB: _readIDB,
    readLS: _readLS,
    writeIDB: _writeIDB,
    writeLS: _writeLS,
    pickFreshest: _pickFreshest,
    saveState: saveState,
    loadState: loadState,
    resolve: _resolve
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
    try { await saveState(true); }
    catch(e) { console.warn(TAG, 'autosave tick:', e); }
    finally { _saveInFlight = false; }
  }

  function _startAutoSave() {
    if (_autoSaveTimer) return;
    _autoSaveTimer = setInterval(_autoSaveTick, 5000);
    console.log(TAG, '⏱ autosave 5s actif');
  }

  function _flushSyncOnExit(reason) {
    try {
      const buildSnapshot = _getBuildSnapshot();
      if (typeof buildSnapshot !== 'function') return;
      const snap = buildSnapshot();
      if (!snap) return;
      if (!snap.savedAt) snap.savedAt = new Date().toISOString();
      if (!snap.key) snap.key = SAVE_KEY;

      // Garde-fou anti-régression aussi en flush
      if (typeof snap.cycle === 'number' && snap.cycle < 1000) {
        try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (raw) {
            const existing = JSON.parse(raw);
            if (existing && typeof existing.cycle === 'number' && existing.cycle > snap.cycle + 5) {
              console.warn(TAG, 'flush ' + reason + ' BLOQUÉ cycle=' + snap.cycle);
              return;
            }
          }
        } catch(e) {}
      }

      _writeLS(snap);
      _writeIDB(snap).catch(() => {});
      console.log(TAG, 'flush ' + reason + ' · cycle ' + (snap.cycle || '?'));
    } catch(e) {
      console.warn(TAG, 'flush ' + reason + ':', e);
    }
  }

  window.addEventListener('pagehide',     () => _flushSyncOnExit('pagehide'));
  window.addEventListener('beforeunload', () => _flushSyncOnExit('beforeunload'));
  window.addEventListener('freeze',       () => _flushSyncOnExit('freeze'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flushSyncOnExit('visibility-hidden');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _startAutoSave);
  } else {
    _startAutoSave();
  }

  window._persistance.startAutoSave = _startAutoSave;
  window._persistance.flushSync     = _flushSyncOnExit;

})();
