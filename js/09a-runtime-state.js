// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09a-runtime-state.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// État partagé entre les sous-modules du runtime (09b → 09k).
//
// Toutes les constantes et variables qui étaient module-level dans l'ancien
// monolithe 09-core-runtime.js vivent maintenant sur window.RT pour qu'un
// seul exemplaire soit partagé entre les fichiers découpés.
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
