// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 · 09l-window-bridge.js · VERSION 1 · 31/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// PROBLÈME RÉSOLU :
//
//   Plusieurs modules de AURA8 sont écrits dans une IIFE en mode strict
//   (notamment 00b-persistance-override.js v120.5). Dans ce scope isolé,
//   les variables et fonctions globales déclarées avec `const` ou
//   `function` dans les autres modules ne sont accessibles QUE via
//   l'objet `window`.
//
//   Or `02-state-init.js` déclare `const S = {...}`, `09b1-build-snapshot.js`
//   déclare `function buildSnapshot()`, etc. — toutes accessibles en scope
//   global script, MAIS PAS sur `window`.
//
//   Conséquence : `00b-persistance-override.js` ne pouvait jamais accéder
//   à `window.S`, `window.buildSnapshot`, `window.openDB`, `window.init`,
//   `window.renderAll`. Donc :
//     - `saveState()` retournait immédiatement sans rien sauvegarder
//     - `loadState()` retournait false sans rien restaurer
//     - L'app redémarrait à zéro à chaque rechargement
//
// SOLUTION :
//
//   Ce module fait le pont entre le scope global script et l'objet window.
//   Il copie les références des variables/fonctions critiques sur window
//   pour que les modules en IIFE strict puissent les utiliser normalement.
//
// CHARGEMENT : OBLIGATOIREMENT après 09k-init.js (qui définit init) et
//              AVANT 00b-persistance-override.js (qui consomme ces refs).
//
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const TAG = '[09l-window-bridge v1]';
  let exposed = [];
  let missing = [];

  function _expose(name) {
    try {
      // (0, eval) force l'évaluation en scope global, retourne la vraie référence
      const ref = (0, eval)(name);
      if (typeof ref !== 'undefined' && ref !== null) {
        window[name] = ref;
        exposed.push(name);
        return true;
      }
    } catch(e) {
      // Variable/fonction non définie dans le scope global
    }
    missing.push(name);
    return false;
  }

  // ─── Variables critiques d'état ──────────────────────────────
  _expose('S');
  _expose('PAIRS');

  // ─── Fonctions de rendu ──────────────────────────────────────
  _expose('renderAll');
  _expose('renderHome');
  _expose('renderAgents');
  _expose('renderMarket');

  // ─── Fonctions de persistance (consommées par 00b) ───────────
  _expose('openDB');
  _expose('buildSnapshot');
  _expose('init');

  // ─── Fonctions de contrôle de simulation ─────────────────────
  _expose('startSim');
  _expose('stopSim');
  _expose('_simRunning');

  // ─── Helpers UI ──────────────────────────────────────────────
  _expose('showToast');
  _expose('updateSaveIndicator');
  _expose('_applySnapshot');

  // ─── Helpers state ───────────────────────────────────────────
  _expose('makePairState');
  _expose('genCandlesFor');

  console.log(TAG, '✅ exposé sur window:', exposed.length, '/', exposed.length + missing.length);
  console.log(TAG, '  Disponibles:', exposed.join(', '));
  if (missing.length > 0) {
    console.log(TAG, '  Manquants (peut-être pas critiques):', missing.join(', '));
  }

})();
