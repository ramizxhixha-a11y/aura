// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09a-runtime-state.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// État partagé entre les sous-modules du runtime (09b → 09k).
//
// Toutes les constantes et variables qui étaient module-level dans l'ancien
// monolithe 09-core-runtime.js vivent maintenant sur window.RT pour qu'un
// seul exemplaire soit partagé entre les fichiers découpés.
//
// Ce fichier expose également window.openDB(), helper d'ouverture
// d'IndexedDB qui était auparavant dans l'ancien 10-fin-bloc-restauration
// (supprimé lors du découpage). Utilisé par saveState, loadState,
// saveFeeRecord et par 00b-persistance-override.
//
// ⚠ Ce fichier DOIT être chargé en premier (avant 09b, 09c, ...).
// ════════════════════════════════════════════════════════════════════════

window.RT = window.RT || {};

// ── Constantes ────────────────────────────────────────────────────────
RT.BARS_KEY      = 'nexus_bars_state';   // 'auto' | 'man' | 'param' | 'closed'
RT.DB_NAME       = 'NEXUS_DB';
RT.LONG_PRESS_MS = 600;
RT.SAVE_KEY      = 'nexus_state_v2';     // clé localStorage / IndexedDB
RT.STORE_FEES    = 'fees';
RT.STORE_STATE   = 'state';              // snapshot complet pour reprise

// ── Variables mutables ────────────────────────────────────────────────
RT._freshPricesInRow    = 0;             // compteur pour reprise après retour réseau
RT._lastRealPriceTs     = Date.now();    // dernier tick de prix RÉEL reçu (CG ou Binance)
RT._longPressPair       = null;
RT._longPressTimer      = null;
RT._net10sSaveTriggered = false;         // sauvegarde déclenchée une fois à 10s offline
RT._netOfflineSinceTs   = 0;             // moment du début de la coupure
RT._netwatchPausedBot   = false;         // true si on a pausé le bot nous-mêmes
RT._netwatchState       = 'online';      // 'online' | 'offline' | 'recovering'
RT._simEverStarted      = false;         // vrai après le 1er startSim() → affiche PAUSE
RT._simInterval         = null;
RT._simRunning          = false;


// ════════════════════════════════════════════════════════════════════════
// openDB() — helper IndexedDB partagé
// ════════════════════════════════════════════════════════════════════════
// Ouvre NEXUS_DB en version 3, crée les stores 'state' et 'fees'
// s'ils n'existent pas (sans keyPath → on passe la clé en 2e arg du put).
// Renvoie une Promise<IDBDatabase>.
//
// Cette fonction était dans l'ancien 10-fin-bloc-restauration-v93.js.
// Elle est ré-exposée ici via window.openDB pour que tous les modules
// du runtime (09b2, 09b3) et 00b-persistance-override y aient accès.
// ════════════════════════════════════════════════════════════════════════

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }

    const req = indexedDB.open(RT.DB_NAME, 3);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // Store 'state' — un seul snapshot complet, clé externe = SAVE_KEY
      if (!db.objectStoreNames.contains(RT.STORE_STATE)) {
        db.createObjectStore(RT.STORE_STATE);
      }
      // Store 'fees' — autoIncrement pour append-only
      if (!db.objectStoreNames.contains(RT.STORE_FEES)) {
        db.createObjectStore(RT.STORE_FEES, { autoIncrement: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error || new Error('openDB failed'));
    req.onblocked = () => reject(new Error('openDB blocked'));
  });
}

window.openDB = openDB;
