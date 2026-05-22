// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 125.1 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// RESTAURATION COMPLÈTE — tous les champs du snapshot
//
// v125 ne restaurait que 39 champs sur 80 → totalTrades=0, _genCount=0,
// _totalCompounded=0 manquaient à l'affichage.
//
// v125.1 boucle sur TOUTES les clés du snap (sauf meta : key, savedAt,
// version) et les applique sur S. Aucun champ oublié.
//
// Accès à S via (0, eval)('S') car S est const dans 02-state-init.js.
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const SAVE_KEY = 'nexus_state_v2';
  const DB_NAME  = 'NEXUS_DB';
  const STORE    = 'state';
  const PROTECT_MS = 30000;
  const startTime = Date.now();

  // Champs meta du snap qu'on ne doit PAS copier sur S
  const SKIP_META = new Set(['key', 'savedAt', 'version']);

  let blockedWrites = 0;
  let storedCycle = null;
  let storedSnap = null;
  let restored = false;

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
        setTimeout(() => { try { el.remove(); } catch(e){} }, 30000);
      };
      if (document.body) inject();
      else document.addEventListener('DOMContentLoaded', inject);
    } catch(e) {}
  }

  // Accès à S via eval indirect (s'exécute dans le scope global)
  function _getS() {
    try {
      return (0, eval)('typeof S !== "undefined" ? S : null');
    } catch(e) {
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 1 — Lire LS et patcher version=2
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
          console.log('[killer v125.1] patch version=2 LS, cycle=' + snap.cycle);
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
              if (!storedCycle || snap.cycle > storedCycle) {
                storedCycle = snap.cycle;
                storedSnap = snap;
              }
              if (typeof snap.version !== 'number' || snap.version < 2) {
                snap.version = 2;
                if (!snap.savedAt) snap.savedAt = new Date().toISOString();
                store.put(snap, SAVE_KEY);
                console.log('[killer v125.1] patch version=2 IDB, cycle=' + snap.cycle);
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
          console.warn('[killer v125.1] BLOQUÉ écriture cycle=' + parsed.cycle + ' (' + blockedWrites + ')');
          return; // refuser l'écriture
        }
      }
    } catch(e) {}
    return _origSetItem.call(this, key, value);
  };

  setTimeout(() => {
    Storage.prototype.setItem = _origSetItem;
    console.log('[killer v125.1] protection storage expirée · ' + blockedWrites + ' bloqué(s)');
  }, PROTECT_MS);

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 4 — Restauration COMPLÈTE de tous les champs
  // ──────────────────────────────────────────────────────────────
  function _restoreS() {
    const S = _getS();
    if (!S) return false;

    if (!storedSnap || !storedCycle || storedCycle <= 42) return false;

    // Déjà restauré et cycle OK ?
    if (S.cycle && S.cycle >= storedCycle && S.totalTrades >= (storedSnap.totalTrades || 0)) {
      if (!restored) {
        restored = true;
        _toast('🔒 S déjà OK · #' + S.cycle, '#1a3d5c');
      }
      return true;
    }

    // BOUCLE COMPLÈTE : tous les champs du snap → S
    let applied = 0;
    let skipped = 0;
    const errors = [];

    for (const k in storedSnap) {
      if (!storedSnap.hasOwnProperty(k)) continue;
      if (SKIP_META.has(k)) { skipped++; continue; }
      try {
        S[k] = storedSnap[k];
        applied++;
      } catch(e) {
        errors.push(k);
      }
    }

    console.log('[killer v125.1] S restauré · cycle=' + S.cycle + ' · ' + applied + ' champs · ' + skipped + ' meta · ' + errors.length + ' erreurs');
    if (errors.length > 0) {
      console.warn('[killer v125.1] champs en erreur:', errors);
    }

    restored = true;
    _toast('✅ S restauré · #' + S.cycle + ' · ' + applied + '/' + (applied + skipped + errors.length) + ' champs', '#0a4d2a');

    // Forcer un render après restauration
    setTimeout(() => {
      try {
        const renderAll_ref = (0, eval)('typeof renderAll !== "undefined" ? renderAll : null');
        if (renderAll_ref) {
          renderAll_ref();
          console.log('[killer v125.1] renderAll appelé');
        }
      } catch(e) {
        console.warn('[killer v125.1] renderAll échoué:', e.message);
      }
    }, 100);

    return true;
  }

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 5 — Surveillance continue pendant 30s
  // ──────────────────────────────────────────────────────────────
  let watchAttempts = 0;
  let sLastSeen = false;
  const watchInterval = setInterval(() => {
    watchAttempts++;

    const S = _getS();
    if (S && !sLastSeen) {
      sLastSeen = true;
      console.log('[killer v125.1] S détecté à tick ' + watchAttempts);
      _toast('🎯 S détecté #' + (S.cycle || '?'), '#444');
    }

    // Tenter restauration si nécessaire
    if (S && !restored && storedCycle && storedCycle > 1000) {
      // Restaurer si cycle bas OU si totalTrades manque
      const needsRestore = (!S.cycle || S.cycle < 1000) ||
                           (typeof storedSnap.totalTrades === 'number' &&
                            (!S.totalTrades || S.totalTrades < storedSnap.totalTrades));
      if (needsRestore) {
        _restoreS();
      }
    }

    if (watchAttempts >= 150) {
      clearInterval(watchInterval);
      if (!sLastSeen) {
        _toast('❌ S jamais détecté en 30s', '#5a1217');
      }
      console.log('[killer v125.1] watch terminé · S vu=' + sLastSeen + ' · restoré=' + restored);
    }
  }, 200);

  console.log('[killer v125.1] actif · storedCycle=' + storedCycle + ' protection ' + PROTECT_MS + 'ms');

})();
