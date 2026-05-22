// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 125 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// FIX RACINE — accès à S via eval() au lieu de window.S
//
// Découverte v124 : window.S n'existe JAMAIS. S est déclaré en const dans
// 02-state-init.js, donc accessible par son nom dans le scope global du
// script principal mais PAS comme window.S.
//
// Solution : (0, eval)('S') exécute eval dans le scope global et retourne
// la référence vers l'objet S réel, qu'on peut ensuite muter directement.
//
// 1. Lire storage, patcher version=2
// 2. Bloquer écriture cycle<1000 pendant 30s
// 3. Toutes les 200ms pendant 30s :
//    - Récupérer S via (0, eval)('S')
//    - Si S.cycle == 42 ET storage cycle > 42 → restaurer S
// 4. Quand restauration faite, forcer renderAll
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
      // (0, eval)(...) force l'exécution en mode global, accède aux const/let du script
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
          console.log('[killer v125] patch version=2 LS, cycle=' + snap.cycle);
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
                console.log('[killer v125] patch version=2 IDB, cycle=' + snap.cycle);
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
          console.warn('[killer v125] BLOQUÉ écriture cycle=' + parsed.cycle + ' (' + blockedWrites + ')');
          return; // refuser l'écriture
        }
      }
    } catch(e) {}
    return _origSetItem.call(this, key, value);
  };

  setTimeout(() => {
    Storage.prototype.setItem = _origSetItem;
    console.log('[killer v125] protection storage expirée · ' + blockedWrites + ' bloqué(s)');
  }, PROTECT_MS);

  // ──────────────────────────────────────────────────────────────
  // ÉTAPE 4 — Restaurer S depuis storage (accès via eval)
  // ──────────────────────────────────────────────────────────────
  function _restoreS() {
    const S = _getS();
    if (!S) return false; // S pas encore défini

    // Si on n'a pas de storage valide, on ne peut rien faire
    if (!storedSnap || !storedCycle || storedCycle <= 42) return false;

    // Si S.cycle est déjà bon, OK
    if (S.cycle && S.cycle >= storedCycle) {
      if (!restored) {
        restored = true;
        _toast('🔒 S déjà OK · #' + S.cycle, '#1a3d5c');
      }
      return true;
    }

    // Restaurer tous les champs critiques
    const fields = [
      'cycle','cycleMax','cycleTimer','portfolio','cashAccount','tradingAccount',
      'leverage','leverageReserve','leverageBorrowed','leverageTotalFees','leverageMaxMult',
      'fiscalReserveAccount','fiscalReserveLog','ownFundsInjected','ownFundsLog',
      'pnl24h','pnlHistory','totalTrades','winTrades','botAutoMode',
      '_startPortfolio','vMajor','vMinor','agents','learningHistory','evoLog',
      'pairStates','openPositions','fees','feeConfig','taxConfig','chainLog',
      'tradingMode','realTimeframe','realActivePairs','realPairCycle',
      'paperRealStats','paperRealActivePairs','paperRealTimeframe',
      'usdEurRate','fiatRates','agentLessons','agentLessonsReal','agentLessonsPaperReal'
    ];

    let applied = 0;
    for (const k of fields) {
      if (storedSnap[k] !== undefined) {
        try {
          S[k] = storedSnap[k];
          applied++;
        } catch(e) {}
      }
    }

    console.log('[killer v125] S restauré · cycle=' + S.cycle + ' · ' + applied + ' champs');
    restored = true;
    _toast('✅ S restauré · #' + S.cycle + ' · ' + applied + ' champs', '#0a4d2a');

    // Forcer un render après restauration
    setTimeout(() => {
      try {
        if (typeof window.renderAll === 'function') window.renderAll();
        else {
          const renderAll_ref = (0, eval)('typeof renderAll !== "undefined" ? renderAll : null');
          if (renderAll_ref) renderAll_ref();
        }
      } catch(e) {}
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
      console.log('[killer v125] S détecté à tick ' + watchAttempts + ' (' + (watchAttempts * 200) + 'ms)');
      _toast('🎯 S détecté #' + (S.cycle || '?'), '#444');
    }

    // Tenter restauration si nécessaire
    if (S && (!S.cycle || S.cycle < 1000) && storedCycle && storedCycle > 1000) {
      _restoreS();
      cycle42Caught++;
    }

    if (watchAttempts >= 150) { // 30 secondes
      clearInterval(watchInterval);
      if (!sLastSeen) {
        _toast('❌ S jamais détecté en 30s', '#5a1217');
      }
      console.log('[killer v125] watch terminé · S vu=' + sLastSeen + ' · restoré=' + restored);
    }
  }, 200);

  console.log('[killer v125] actif · storedCycle=' + storedCycle + ' protection ' + PROTECT_MS + 'ms');

})();
