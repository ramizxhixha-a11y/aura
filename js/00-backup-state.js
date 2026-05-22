// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 124 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// VERROU ULTIME ANTI-#42
//
// Stratégie : on ne cherche plus QUI remet #42, on EMPÊCHE TOUT écriture
// de #42 sur S.cycle, et on EMPÊCHE TOUT écriture cycle<1000 dans storage
// pendant les 30 premières secondes (largement assez pour init complet).
//
// 1. Au démarrage, lire et patcher version=2 si manquant
// 2. Bloquer setItem(SAVE_KEY) pendant 30s si snap.cycle < 1000
// 3. Surveiller S.cycle toutes les 200ms pendant 30s ; si == 42, restaurer
// 4. Object.defineProperty(S, 'cycle') refuse 42 et journalise l'appelant
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const SAVE_KEY = 'nexus_state_v2';
  const DB_NAME  = 'NEXUS_DB';
  const STORE    = 'state';
  const PROTECT_MS = 30000;
  const startTime = Date.now();
  let blockedWrites = 0;
  let cycle42Caught = 0;
  let storedCycle = null;
  let storedSnap = null;

  function _toast(msg, color) {
    try {
      const inject = () => {
        const el = document.createElement('div');
        el.style.cssText = [
          'position:fixed','right:8px',
          'z-index:999997','padding:6px 10px',
          'font:bold 10px ui-monospace,monospace',
          'background:' + (color || '#5a1217'),
          'color:#fff','border-radius:6px','cursor:pointer',
          'opacity:0.95','line-height:1.3',
          'max-width:280px','word-break:break-all',
          'box-shadow:0 2px 8px rgba(0,0,0,0.5)'
        ].join(';');
        el.textContent = msg;
        el.onclick = () => el.remove();
        const existing = document.querySelectorAll('[data-killer-toast]');
        el.setAttribute('data-killer-toast', '1');
        el.style.top = (60 + existing.length * 36) + 'px';
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch(e){} }, 20000);
      };
      if (document.body) inject();
      else document.addEventListener('DOMContentLoaded', inject);
    } catch(e) {}
  }

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 1 — Lire ce qu'il y a dans LS et patcher version=2
  // ──────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const snap = JSON.parse(raw);
      if (snap && typeof snap.cycle === 'number') {
        storedCycle = snap.cycle;
        storedSnap = snap;
        if (typeof snap.version !== 'number' || snap.version < 2) {
          snap.version = 2;
          if (!snap.savedAt) snap.savedAt = new Date().toISOString();
          localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
          console.log('[killer v124] patch version=2 LS, cycle=' + snap.cycle);
        }
      }
    }
  } catch(e) {}

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 2 — Patch IDB version
  // ──────────────────────────────────────────────────────────────
  function _patchIDB() {
    return new Promise((resolve) => {
      let req;
      try { req = indexedDB.open(DB_NAME); }
      catch(e) { resolve(); return; }
      req.onerror = () => resolve();
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) { db.close(); resolve(); return; }
        try {
          const tx = db.transaction(STORE, 'readwrite');
          const store = tx.objectStore(STORE);
          const getReq = store.get(SAVE_KEY);
          getReq.onsuccess = () => {
            const snap = getReq.result;
            if (snap && typeof snap === 'object' && typeof snap.cycle === 'number') {
              if (snap.cycle > (storedCycle || 0)) {
                storedCycle = snap.cycle;
                storedSnap = snap;
              }
              if (typeof snap.version !== 'number' || snap.version < 2) {
                snap.version = 2;
                if (!snap.savedAt) snap.savedAt = new Date().toISOString();
                store.put(snap, SAVE_KEY);
                console.log('[killer v124] patch version=2 IDB, cycle=' + snap.cycle);
              }
            }
            db.close();
            resolve();
          };
          getReq.onerror = () => { db.close(); resolve(); };
        } catch(e) { db.close(); resolve(); }
      };
    });
  }

  _patchIDB().then(() => {
    if (storedCycle && storedCycle > 1000) {
      _toast('🛡 storage trouvé · #' + storedCycle, '#0a4d2a');
    }
  });

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 3 — Bloquer toute écriture cycle<1000 pendant 30s
  // ──────────────────────────────────────────────────────────────
  const _origSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function(key, value) {
    try {
      const now = Date.now();
      if ((now - startTime) < PROTECT_MS && key === SAVE_KEY && typeof value === 'string') {
        let parsed = null;
        try { parsed = JSON.parse(value); } catch(e) {}
        if (parsed && typeof parsed.cycle === 'number' && parsed.cycle < 1000) {
          blockedWrites++;
          console.warn('[killer v124] BLOQUÉ écriture cycle=' + parsed.cycle + ' (' + blockedWrites + ')');
          _toast('🛡 cycle=' + parsed.cycle + ' bloqué (' + blockedWrites + ')', '#5a1217');
          return; // refuser l'écriture
        }
      }
    } catch(e) {}
    return _origSetItem.call(this, key, value);
  };

  setTimeout(() => {
    Storage.prototype.setItem = _origSetItem;
    console.log('[killer v124] protection storage expirée · ' + blockedWrites + ' bloqué(s)');
  }, PROTECT_MS);

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 4 — Verrou sur S.cycle : interdit valeur 42, force depuis storage
  // ──────────────────────────────────────────────────────────────
  function _installCycleLock() {
    if (!window.S || typeof window.S !== 'object') return false;
    if (window.S._cycleLockInstalled) return true;

    let _cycleValue = (typeof window.S.cycle === 'number') ? window.S.cycle : 0;

    // Si S.cycle est déjà 42 et storage a cycle>42, restaurer
    if (_cycleValue === 42 && storedCycle && storedCycle > 42) {
      _cycleValue = storedCycle;
      cycle42Caught++;
      console.log('[killer v124] init lock : S.cycle 42 → ' + storedCycle);
    }

    try {
      Object.defineProperty(window.S, 'cycle', {
        configurable: true,
        enumerable: true,
        get() { return _cycleValue; },
        set(val) {
          // Refuser 42 absolu
          if (val === 42) {
            cycle42Caught++;
            const realCycle = storedCycle && storedCycle > 42 ? storedCycle : 0;
            console.warn('[killer v124] BLOQUÉ S.cycle=42 #' + cycle42Caught + ', force=' + realCycle);
            _cycleValue = realCycle;
            return;
          }
          _cycleValue = val;
        }
      });
      window.S._cycleLockInstalled = true;
      console.log('[killer v124] cycle lock installé · valeur=' + _cycleValue);

      // Forcer la restauration des autres champs critiques si on a un storedSnap
      if (storedSnap && _cycleValue > 42) {
        if (typeof storedSnap.portfolio === 'number' && storedSnap.portfolio > 0 && (!window.S.portfolio || window.S.portfolio < 1)) {
          window.S.portfolio = storedSnap.portfolio;
        }
        if (typeof storedSnap.cashAccount === 'number' && (!window.S.cashAccount || window.S.cashAccount < 0.01)) {
          window.S.cashAccount = storedSnap.cashAccount;
        }
        if (typeof storedSnap.tradingAccount === 'number' && (!window.S.tradingAccount || window.S.tradingAccount < 0.01)) {
          window.S.tradingAccount = storedSnap.tradingAccount;
        }
        if (typeof storedSnap.totalTrades === 'number') window.S.totalTrades = storedSnap.totalTrades;
        if (typeof storedSnap.winTrades === 'number') window.S.winTrades = storedSnap.winTrades;
      }

      return true;
    } catch(e) {
      console.warn('[killer v124] cycle lock failed:', e.message);
      return false;
    }
  }

  // Tenter l'install à chaque tick jusqu'à ce que S existe
  let installAttempts = 0;
  const installInterval = setInterval(() => {
    installAttempts++;
    if (_installCycleLock()) {
      clearInterval(installInterval);
      _toast('🔒 cycle lock #' + window.S.cycle, '#1a3d5c');
      // Forcer un render
      setTimeout(() => {
        try { if (typeof window.renderAll === 'function') window.renderAll(); } catch(e) {}
      }, 200);
    }
    if (installAttempts >= 100) { // 20 secondes max
      clearInterval(installInterval);
    }
  }, 200);

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 5 — Surveillance continue pendant 30s
  // ──────────────────────────────────────────────────────────────
  let watchAttempts = 0;
  const watchInterval = setInterval(() => {
    watchAttempts++;
    if (window.S && typeof window.S.cycle === 'number' && window.S.cycle === 42) {
      if (storedCycle && storedCycle > 42) {
        window.S.cycle = storedCycle;
        cycle42Caught++;
        console.warn('[killer v124] watch corrigé S.cycle 42 → ' + storedCycle);
      }
    }
    if (watchAttempts >= 150) { // 30 secondes
      clearInterval(watchInterval);
      if (cycle42Caught > 0) {
        _toast('🛡 ' + cycle42Caught + '× #42 bloqué', '#5a1217');
      }
    }
  }, 200);

  console.log('[killer v124] actif · storedCycle=' + storedCycle + ' protection ' + PROTECT_MS + 'ms');

})();
