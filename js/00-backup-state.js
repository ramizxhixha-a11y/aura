// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 126 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// PRELOAD PERSISTANCE — patche version=2 dans les snaps existants
//
// Rôle minimal : au chargement de la page, vérifier que les snaps présents
// dans LS et IDB ont bien le champ version=2. Si absent ou < 2, l'ajouter
// (sinon l'ancien importState v105 refusait le snap comme "trop ancien").
//
// Aucune autre logique. La persistance complète (saveState/loadState/
// importState/autosave) est gérée par 00b-persistance-override.js v121
// qui s'exécute après tous les autres modules.
//
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const SAVE_KEY = 'nexus_state_v2';
  const DB_NAME  = 'NEXUS_DB';
  const STORE    = 'state';

  // ──────────────────────────────────────────────────────────────
  // Patch version=2 dans localStorage
  // ──────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const snap = JSON.parse(raw);
      if (snap && typeof snap === 'object' && typeof snap.cycle === 'number') {
        if (typeof snap.version !== 'number' || snap.version < 2) {
          snap.version = 2;
          if (!snap.savedAt) snap.savedAt = new Date().toISOString();
          localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
          console.log('[backup-state v126] patch version=2 LS · cycle=' + snap.cycle);
        }
      }
    }
  } catch(e) {
    console.warn('[backup-state v126] LS patch error:', e && e.message);
  }

  // ──────────────────────────────────────────────────────────────
  // Patch version=2 dans IndexedDB
  // ──────────────────────────────────────────────────────────────
  try {
    const req = indexedDB.open(DB_NAME);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) { db.close(); return; }
      try {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const getReq = store.get(SAVE_KEY);
        getReq.onsuccess = () => {
          const snap = getReq.result;
          if (snap && typeof snap === 'object' && typeof snap.cycle === 'number') {
            if (typeof snap.version !== 'number' || snap.version < 2) {
              snap.version = 2;
              if (!snap.savedAt) snap.savedAt = new Date().toISOString();
              store.put(snap, SAVE_KEY);
              console.log('[backup-state v126] patch version=2 IDB · cycle=' + snap.cycle);
            }
          }
          db.close();
        };
        getReq.onerror = () => { db.close(); };
      } catch(e) {
        console.warn('[backup-state v126] IDB tx error:', e && e.message);
        db.close();
      }
    };
    req.onerror = () => {};
  } catch(e) {
    console.warn('[backup-state v126] IDB open error:', e && e.message);
  }

  console.log('[backup-state v126] preload terminé');

})();
