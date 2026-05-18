// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   AURA8 — 11-persistance.js — VERSION v119                   ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   MODULE DÉDIÉ À LA PERSISTANCE                              ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   Remplace 2 fonctions zombies du fichier 10 :               ▓▓▓
// ▓▓▓     - _installPackContinuite (jamais appelée, autosave 15s)  ▓▓▓
// ▓▓▓     - scheduleAutoSave (jamais appelée, autosave 30s)        ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   Ce module fait CE QUE LES 2 FAISAIENT, mais en mieux :     ▓▓▓
// ▓▓▓     - Autosave 5s (équilibre idéal)                          ▓▓▓
// ▓▓▓     - Hooks pagehide + freeze + beforeunload + visibility    ▓▓▓
// ▓▓▓     - S'auto-active                                          ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   COMPATIBILITÉ : utilise _autoSaveInterval (variable du     ▓▓▓
// ▓▓▓   fichier 10) → factoryReset peut toujours clearInterval     ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓   CHARGEMENT : à placer dans le HTML APRÈS le fichier 10.    ▓▓▓
// ▓▓▓                                                              ▓▓▓
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

(function() {
  'use strict';
  
  const TAG = '[PERSISTANCE]';
  const AUTOSAVE_MS = 5000;
  let installed = false;
  
  function install() {
    if (installed) return true;
    
    // Vérifier que tout est prêt
    if (typeof window.S === 'undefined') return false;
    if (typeof window.saveState !== 'function') return false;
    
    installed = true;
    
    // ── 1. Autosave 5 secondes ──
    if (typeof _autoSaveInterval !== 'undefined' && _autoSaveInterval) {
      try { clearInterval(_autoSaveInterval); } catch(e) {}
    }
    
    _autoSaveInterval = setInterval(function() {
      if (window._resetInProgress) return;
      if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      try { window.saveState(true); } catch(e) {}
    }, AUTOSAVE_MS);
    
    // ── 2. Hook pagehide (le plus fiable mobile) ──
    window.addEventListener('pagehide', function() {
      if (window._resetInProgress) return;
      if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      try {
        if (typeof window.buildSnapshot === 'function' && typeof SAVE_KEY !== 'undefined') {
          const snap = window.buildSnapshot();
          try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch(e) {}
        }
        window.saveState(true);
      } catch(e) {}
    });
    
    // ── 3. Hook freeze (Chrome Android) ──
    document.addEventListener('freeze', function() {
      if (window._resetInProgress) return;
      if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      try { window.saveState(true); } catch(e) {}
    });
    
    // ── 4. Hook beforeunload (desktop) ──
    window.addEventListener('beforeunload', function() {
      if (window._resetInProgress) return;
      if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      try { window.saveState(true); } catch(e) {}
    });
    
    // ── 5. Hook visibilitychange ──
    document.addEventListener('visibilitychange', function() {
      if (window._resetInProgress) return;
      if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
      if (document.hidden) {
        try { window.saveState(true); } catch(e) {}
      } else {
        try {
          if (typeof window.renderAll === 'function') window.renderAll();
          if (typeof window.updateSimBtn === 'function') window.updateSimBtn();
        } catch(e) {}
      }
    });
    
    console.log(TAG, '✅ Persistance active · autosave ' + (AUTOSAVE_MS/1000) + 's + 4 hooks');
    return true;
  }
  
  function waitForReady() {
    let attempts = 0;
    function tryInstall() {
      attempts++;
      if (install()) return;
      if (attempts < 50) setTimeout(tryInstall, 200);
      else console.error(TAG, '❌ Abandon après 10s');
    }
    tryInstall();
  }
  
  if (document.readyState === 'complete') {
    setTimeout(waitForReady, 1000);
  } else {
    window.addEventListener('load', function() { setTimeout(waitForReady, 1000); });
  }
  
  console.log(TAG, 'Module chargé');
})();
