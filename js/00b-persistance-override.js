// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 · 00b-persistance-override.js · VERSION 121 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// FIX RACINE — accès à S via (0, eval)('S') au lieu de window.S
//
// S est déclaré "const S = ..." dans 02-state-init.js → pas sur window.S.
// _resolve(name) essaie window[name] puis (0, eval)(name) pour accéder
// aux const/function déclarées au scope global du script principal.
//
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  if (typeof window === 'undefined') return;

  const TAG = '[persistance v121]';
  const SAVE_KEY    = 'nexus_state_v2';
  const STORE_STATE = 'state';
  const META_KEYS = new Set(['key', 'savedAt', 'version']);

  // Résoudre un nom global via window OU (0, eval)
  function _resolve(name) {
    try {
      if (typeof window[name] !== 'undefined' && window[name] !== null) return window[name];
    } catch(e) {}
    try {
      return (0, eval)('typeof ' + name + ' !== "undefined" ? ' + name + ' : null');
    } catch(e) { return null; }
  }

  function _getS()             { return _resolve('S'); }
  function _getOpenDB()        { return _resolve('openDB'); }
  function _getBuildSnapshot() { return _resolve('buildSnapshot'); }
  function _getRenderAll()     { return _resolve('renderAll'); }
  function _getShowToast()     { return _resolve('showToast'); }

  function _hasS()             { const s = _getS(); return s !== null && typeof s === 'object'; }
  function _hasOpenDB()        { return typeof _getOpenDB() === 'function'; }
  function _hasBuildSnapshot() { return typeof _getBuildSnapshot() === 'function'; }

  async function _readIDB() {
    const openDB = _getOpenDB();
    if (typeof openDB !== 'function') return null;
    let db;
    try { db = await openDB(); } catch(e) { return null; }
    if (!db || !db.objectStoreNames || !db.objectStoreNames.contains(STORE_STATE)) return null;
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
            if (!arr.length) { resolve(null); return; }
            arr.sort((a, b) => (b && b.savedAt ? Date.parse(b.savedAt) : 0) - (a && a.savedAt ? Date.parse(a.savedAt) : 0));
            resolve(arr[0]);
          };
          reqAll.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      } catch(e) { resolve(null); }
    });
  }

  function _readLS() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  async function _writeIDB(snap) {
    const openDB = _getOpenDB();
    if (typeof openDB !== 'function') return false;
    let db;
    try { db = await openDB(); } catch(e) { return false; }
    if (!db || !db.objectStoreNames || !db.objectStoreNames.contains(STORE_STATE)) return false;
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_STATE, 'readwrite');
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
        const store = tx.objectStore(STORE_STATE);
        const req = store.keyPath ? store.put(snap) : store.put(snap, SAVE_KEY);
        if (!snap.key) snap.key = SAVE_KEY;
        req.onsuccess = () => resolve(true);
        req.onerror   = () => resolve(false);
      } catch(e) { resolve(false); }
    });
  }

  function _writeLS(snap) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); return true; }
    catch(e) { return false; }
  }

  function _pickFreshest(a, b) {
    if (!a && !b) return null;
    if (!a) return b;
    if (!b) return a;
    const cA = typeof a.cycle === 'number' ? a.cycle : -1;
    const cB = typeof b.cycle === 'number' ? b.cycle : -1;
    if (cA !== cB) return cA > cB ? a : b;
    const tA = a.savedAt ? Date.parse(a.savedAt) : 0;
    const tB = b.savedAt ? Date.parse(b.savedAt) : 0;
    return tA >= tB ? a : b;
  }

  async function saveState(silent) {
    const buildSnapshot = _getBuildSnapshot();
    if (typeof buildSnapshot !== 'function') return false;
    let snap;
    try { snap = buildSnapshot(); } catch(e) { return false; }
    if (!snap) return false;
    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    if (!snap.key) snap.key = SAVE_KEY;

    // Garde-fou anti-régression
    if (typeof snap.cycle === 'number' && snap.cycle < 1000) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const ex = JSON.parse(raw);
          if (ex && typeof ex.cycle === 'number' && ex.cycle > snap.cycle + 5) return false;
        }
      } catch(e) {}
    }

    const [idbOk, lsOk] = await Promise.all([_writeIDB(snap), Promise.resolve(_writeLS(snap))]);
    const anyOk = idbOk || lsOk;
    if (anyOk && !silent) {
      const upd = _resolve('updateSaveIndicator');
      if (typeof upd === 'function') { try { upd('saved'); } catch(e) {} }
    }
    return anyOk;
  }

  async function loadState() {
    try {
      if (sessionStorage.getItem('nexus_factory_reset') === '1') {
        sessionStorage.removeItem('nexus_factory_reset');
        const S = _getS();
        if (S) {
          S.tradingAccount = 0; S.cashAccount = 0;
          S.portfolio = 0; S.portfolioTotal = 0; S.fiscalReserveAccount = 0;
        }
        return false;
      }
    } catch(e) {}

    const [snapIDB, snapLS] = await Promise.all([_readIDB(), Promise.resolve(_readLS())]);
    console.log(TAG, 'loadState · IDB=' + (snapIDB ? snapIDB.cycle : '∅') + ' LS=' + (snapLS ? snapLS.cycle : '∅'));
    const snap = _pickFreshest(snapIDB, snapLS);
    if (!snap) return false;

    try { _applyFullSnap(snap); } catch(e) { console.error(TAG, e); return false; }

    // Resync
    if (snapIDB && snapLS && snapIDB.cycle !== snapLS.cycle) {
      if (snap === snapIDB) _writeLS(snap);
      else _writeIDB(snap);
    } else if (snapIDB && !snapLS) { _writeLS(snap); }
    else if (snapLS && !snapIDB) { _writeIDB(snap); }

    // Render
    const renderAll = _getRenderAll();
    if (typeof renderAll === 'function') { try { renderAll(); } catch(e) {} }

    return true;
  }

  function _applyFullSnap(snap) {
    const S = _getS();
    if (!S || !snap) return;
    let applied = 0;
    for (const k in snap) {
      if (!snap.hasOwnProperty(k) || META_KEYS.has(k)) continue;
      try { S[k] = snap[k]; applied++; } catch(e) {}
    }
    console.log(TAG, '_applyFullSnap · ' + applied + ' champs');
  }

  function importState() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const snap = JSON.parse(await file.text());
        if (!snap || (snap.version != null && snap.version < 2)) {
          const t = _getShowToast();
          if (typeof t === 'function') t('❌ Fichier invalide ou trop ancien', 4000, 'user');
          return;
        }
        if (!confirm('Restaurer cycle #' + (snap.cycle || '?') + ' · ' + (snap.totalTrades || 0) + ' trades ?')) return;
        await Promise.all([_writeIDB(snap), Promise.resolve(_writeLS(snap))]);
        await loadState();
        const t = _getShowToast();
        if (typeof t === 'function') t('✅ Restauré · cycle #' + (snap.cycle || '?'), 3500, 'user');
        const renderAll = _getRenderAll();
        if (typeof renderAll === 'function') { try { renderAll(); } catch(e) {} }
      } catch(err) {
        const t = _getShowToast();
        if (typeof t === 'function') t('❌ Import échoué : ' + err.message, 4000, 'user');
      }
    };
    input.click();
  }

  window.saveState   = saveState;
  window.loadState   = loadState;
  window.importState = importState;

  window._persistance = {
    version: '121', readIDB: _readIDB, readLS: _readLS,
    writeIDB: _writeIDB, writeLS: _writeLS, saveState, loadState
  };

  console.log(TAG, '✅ overrides installés');

  // Autosave 5s
  let _timer = null, _inFlight = false;
  async function _tick() {
    if (_inFlight || !_hasS() || !_hasBuildSnapshot()) return;
    _inFlight = true;
    try { await saveState(true); } catch(e) {} finally { _inFlight = false; }
  }
  function _start() { if (!_timer) { _timer = setInterval(_tick, 5000); console.log(TAG, '⏱ autosave 5s'); } }

  function _flush(reason) {
    try {
      const buildSnapshot = _getBuildSnapshot();
      if (typeof buildSnapshot !== 'function') return;
      const snap = buildSnapshot();
      if (!snap) return;
      if (!snap.savedAt) snap.savedAt = new Date().toISOString();
      if (!snap.key) snap.key = SAVE_KEY;
      if (typeof snap.cycle === 'number' && snap.cycle < 1000) {
        try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (raw) { const ex = JSON.parse(raw); if (ex && typeof ex.cycle === 'number' && ex.cycle > snap.cycle + 5) return; }
        } catch(e) {}
      }
      _writeLS(snap);
      _writeIDB(snap).catch(() => {});
    } catch(e) {}
  }

  window.addEventListener('pagehide',     () => _flush('pagehide'));
  window.addEventListener('beforeunload', () => _flush('beforeunload'));
  window.addEventListener('freeze',       () => _flush('freeze'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') _flush('hidden'); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _start);
  else _start();

})();
