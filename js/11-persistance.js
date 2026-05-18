// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   AURA8 — 11-persistance.js — VERSION v119.1                 ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   MODULE DÉDIÉ À LA PERSISTANCE                              ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   ════ CE QUE FAIT CE MODULE ════                            ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   1) Autosave toutes les 5 secondes                          ▓▓▓
// ▓▓▓   2) Sauve à la fermeture (pagehide + beforeunload)          ▓▓▓
// ▓▓▓   3) Sauve si l'onglet gèle (freeze - Chrome Android)        ▓▓▓
// ▓▓▓   4) Sauve quand l'onglet est caché (visibilitychange)       ▓▓▓
// ▓▓▓   5) S'auto-active dès que tout est chargé                   ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   ════ FIX v119.1 ════                                       ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   v119.0 ne marchait pas : tentait d'accéder à               ▓▓▓
// ▓▓▓   _autoSaveInterval (let global du fichier 10) qui n'est PAS ▓▓▓
// ▓▓▓   accessible depuis un autre script en JavaScript.           ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   v119.1 utilise sa propre variable interne, indépendante.   ▓▓▓
// ▓▓▓   Plus simple, plus propre, fonctionne.                      ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   ════ CHARGEMENT ════                                       ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   À placer dans le HTML APRÈS le fichier 10.                 ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
  'use strict';
  
  const TAG = '[PERSISTANCE]';
  const AUTOSAVE_MS = 5000;
  
  // Variable INTERNE — pas de conflit avec _autoSaveInterval du fichier 10
  let myInterval = null;
  let installed = false;
  
  function install() {
    if (installed) return true;
    
    // Vérifier que tout est prêt
    if (typeof window.S === 'undefined') return false;
    if (typeof window.saveState !== 'function') return false;
    
    installed = true;
    
    // ── 1. Autosave 5 secondes (variable interne propre) ──
    if (myInterval) {
      try { clearInterval(myInterval); } catch(e) {}
    }
    
    myInterval = setInterval(function() {
      if (window._resetInProgress) return;
      try {
        if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      } catch(e) {}
      try { window.saveState(true); } catch(e) {}
    }, AUTOSAVE_MS);
    
    // Exposer sur window pour debug / factoryReset éventuel
    window._persistanceInterval = myInterval;
    
    // ── 2. Hook pagehide (le plus fiable mobile) ──
    window.addEventListener('pagehide', function() {
      if (window._resetInProgress) return;
      try {
        if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      } catch(e) {}
      try { window.saveState(true); } catch(e) {}
    });
    
    // ── 3. Hook freeze (Chrome Android avant kill) ──
    document.addEventListener('freeze', function() {
      if (window._resetInProgress) return;
      try {
        if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      } catch(e) {}
      try { window.saveState(true); } catch(e) {}
    });
    
    // ── 4. Hook beforeunload (desktop) ──
    window.addEventListener('beforeunload', function() {
      if (window._resetInProgress) return;
      try {
        if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      } catch(e) {}
      try { window.saveState(true); } catch(e) {}
    });
    
    // ── 5. Hook visibilitychange ──
    document.addEventListener('visibilitychange', function() {
      if (window._resetInProgress) return;
      try {
        if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      } catch(e) {}
      if (document.hidden) {
        try { window.saveState(true); } catch(e) {}
      }
    });
    
    // Indicateur visible dans le DOM pour confirmation visuelle (Guardian peut le voir)
    try {
      window._persistanceActiveAt = Date.now();
    } catch(e) {}
    
    console.log(TAG, '✅ ACTIF · autosave ' + (AUTOSAVE_MS/1000) + 's + 4 hooks');
    return true;
  }
  
  function waitForReady() {
    let attempts = 0;
    function tryInstall() {
      attempts++;
      if (install()) return;
      if (attempts < 50) {
        setTimeout(tryInstall, 200);
      } else {
        console.error(TAG, '❌ Abandon après 10s · S=' + (typeof window.S) + ' saveState=' + (typeof window.saveState));
        try { window._persistanceFailed = true; } catch(e) {}
      }
    }
    tryInstall();
  }
  
  // Démarrage avec délai pour laisser init() async finir
  if (document.readyState === 'complete') {
    setTimeout(waitForReady, 1500);
  } else {
    window.addEventListener('load', function() { setTimeout(waitForReady, 1500); });
  }
  
  console.log(TAG, 'Module chargé (v119.1)');
})();
