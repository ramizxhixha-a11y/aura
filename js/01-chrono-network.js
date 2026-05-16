/* ═══════════════════════════════════════════════════════════
   AURA8 v108 · js/01-chrono-network.js
   LIVRAISON 1 — Chrono multi-mode + Détection réseau + Auto-pause
   + PATCH v118 : FIX RENDER HOME AT STARTUP (en bas du fichier)

   COEXISTENCE avec le code existant :
   - Les boutons header ont des onclick natifs (toggleSim, toggleMode, toggleWakeLock, etc.)
     qui appellent les fonctions JS existantes du HTML.
   - Ce module N'ATTACHE PAS de listener sur ces boutons : il ne fait que
     OBSERVER les changements et METTRE À JOUR le chrono + l'indicateur réseau.
   - Le code existant peut appeler window.AuraChrono.* pour synchroniser.
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── Clés localStorage ──────────────────────────────
  const K_AUTO_SEC = 'aura_chrono_auto_seconds';
  const K_MANU_SEC = 'aura_chrono_manu_seconds';
  const K_RUNNING  = 'aura_system_running';
  const K_MODE     = 'aura_current_mode';
  const K_NET_PAUSE = 'aura_paused_by_network';
  const K_QUIT_OFF  = 'aura_quit_while_offline';

  // ─── État ───────────────────────────────────────────
  const state = {
    chronoSeconds: {
      AUTO: parseInt(localStorage.getItem(K_AUTO_SEC) || '0', 10),
      MANU: parseInt(localStorage.getItem(K_MANU_SEC) || '0', 10),
    },
    mode: localStorage.getItem(K_MODE) || 'AUTO',
    running: false,
    pausedByNetwork: false,
    netStatus: 'online',
  };

  // À l'install : si on a quitté l'app offline, on ne reprend pas auto
  const quitOffline = localStorage.getItem(K_QUIT_OFF) === 'true';

  // ─── Formatage adaptatif (MM:SS → HH:MM:SS → Xd HH:MM) ───
  function formatChrono(s) {
    s = Math.max(0, Math.floor(s));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

  // ─── Persistance ────────────────────────────────────
  function save() {
    localStorage.setItem(K_AUTO_SEC, state.chronoSeconds.AUTO);
    localStorage.setItem(K_MANU_SEC, state.chronoSeconds.MANU);
    localStorage.setItem(K_MODE, state.mode);
    localStorage.setItem(K_RUNNING, state.running);
  }

  // ─── Détection réseau ───────────────────────────────
  function evaluateNetwork() {
    if (!navigator.onLine) return 'offline';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.effectiveType) {
      const t = conn.effectiveType;
      if (t === '4g') return 'online';
      if (t === '3g') return 'unstable';
      if (t === '2g' || t === 'slow-2g') return 'unstable';
    }
    return 'online';
  }

  function onNetworkChange() {
    const prev = state.netStatus;
    state.netStatus = evaluateNetwork();

    if (state.netStatus === 'offline') {
      if (state.running) {
        state.pausedByNetwork = true;
        state.running = false;
        localStorage.setItem(K_NET_PAUSE, 'true');
        save();
        // Notifier le code legacy qu'on a forcé la pause
        if (typeof window.simulationPaused !== 'undefined') {
          window.simulationPaused = true;
        }
      }
    } else if (prev === 'offline' && state.pausedByNetwork && !quitOffline) {
      // Reprise auto si pas quit-offline
      state.pausedByNetwork = false;
      state.running = true;
      localStorage.setItem(K_NET_PAUSE, 'false');
      save();
      if (typeof window.simulationPaused !== 'undefined') {
        window.simulationPaused = false;
      }
    }
    render();
  }

  // À l'init : si on était offline et pause-réseau → marquer quit-offline
  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  // ─── Détecter l'état du système depuis le code existant ───
  // Le bouton #simToggleBtn affiche ⏸ quand running, ▶ quand pause
  function syncRunningFromUI() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    // On lit le texte pour savoir si système est en marche
    const text = btn.textContent.trim();
    const isRunning = text === '⏸';
    if (state.running !== isRunning && !state.pausedByNetwork) {
      state.running = isRunning;
      save();
    }
  }

  function syncModeFromUI() {
    const lbl = document.getElementById('modeLabelText');
    if (!lbl) return;
    const m = (lbl.textContent || '').trim().toUpperCase();
    if ((m === 'AUTO' || m === 'MANU') && state.mode !== m) {
      state.mode = m;
      save();
    }
  }

  // ─── Tick 1 seconde ─────────────────────────────────
  function tick() {
    syncRunningFromUI();
    syncModeFromUI();
    if (state.running && state.netStatus !== 'offline') {
      state.chronoSeconds[state.mode]++;
      if (state.chronoSeconds[state.mode] % 10 === 0) save();
    }
    render();
  }

  // ─── Rendu UI ───────────────────────────────────────
  function render() {
    // Chrono
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = formatChrono(state.chronoSeconds[state.mode]);
      chronoEl.className = 'chrono-display';
      if (state.running) chronoEl.classList.add('running');
      if (state.pausedByNetwork) chronoEl.classList.add('paused-auto');
    }

    // Indicateur réseau
    const netEl = document.getElementById('netIndicator');
    if (netEl) {
      netEl.className = 'net-indicator ' + state.netStatus;
    }

    // Bouton play/pause : seulement si on a forcé la pause par réseau
    // (sinon laisser le code existant gérer son état)
    const btn = document.getElementById('simToggleBtn');
    if (btn && state.pausedByNetwork) {
      btn.className = 'btn-icon btn-play-pause network-lost';
      btn.textContent = '▶';
    }
  }

  // ─── API publique ───────────────────────────────────
  window.AuraChrono = {
    state: state,
    formatChrono: formatChrono,
    resetChrono: function(mode) {
      if (state.chronoSeconds[mode] !== undefined) {
        state.chronoSeconds[mode] = 0;
        save();
        render();
      }
    },
    getChrono: function(mode) {
      return state.chronoSeconds[mode || state.mode];
    }
  };

  // ─── Init ───────────────────────────────────────────
  function init() {
    // Écouter les événements réseau
    window.addEventListener('online', onNetworkChange);
    window.addEventListener('offline', onNetworkChange);
    if (navigator.connection) {
      navigator.connection.addEventListener('change', onNetworkChange);
    }

    // Sauver l'état "quit while offline" à la fermeture
    window.addEventListener('beforeunload', () => {
      if (!navigator.onLine) {
        localStorage.setItem(K_QUIT_OFF, 'true');
      } else {
        localStorage.setItem(K_QUIT_OFF, 'false');
      }
      save();
    });

    // Démarrer le tick et l'évaluation réseau initiale
    onNetworkChange();
    setInterval(tick, 1000);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ═══════════════════════════════════════════════════════════
   ░░ PATCH v118 · FIX RENDER HOME AT STARTUP ░░
   
   PROBLÈME RÉSOLU :
   Au chargement initial de l'app, les cards Caisse et Trading
   sur le dashboard HOME affichent $0 / $0 alors que S.cashAccount
   et S.tradingAccount contiennent bien les vraies valeurs
   (visibles dans le modal Transfert).
   
   CAUSE :
   La fonction de render du dashboard est appelée AVANT que
   loadState() ait fini de restaurer les valeurs depuis IndexedDB.
   Résultat : le render se fait avec des 0 par défaut.
   
   FIX :
   Ce patch attend que loadState() ait fini (2-8 secondes),
   puis force un re-render manuellement en appelant toutes les
   fonctions de render globales connues. Idempotent et low-risk :
   ne fait rien si S.cashAccount et S.tradingAccount sont déjà à 0.
   
   USAGE MANUEL (debug) :
   Appeler window._auraForceRender() depuis la console
   pour forcer un re-render à n'importe quel moment.
   ═══════════════════════════════════════════════════════════ */

(function _auraForceRenderFix() {
  'use strict';

  let _lastRenderTs = 0;
  let _renderCount = 0;

  function _auraTryRender() {
    if (typeof window.S === 'undefined') {
      return false;
    }
    
    // Vérifie si on a des fonds dans le state
    const cash    = window.S.cashAccount    || 0;
    const trading = window.S.tradingAccount || 0;
    const cycle   = window.S.cycle          || 0;
    
    if (cash < 0.01 && trading < 0.01 && cycle === 0) {
      // Vraiment vide (premier démarrage légitime) → rien à forcer
      return false;
    }
    
    // Tente toutes les fonctions de render globales connues
    const renderFns = [
      'renderHome', 'render', 'refreshAll',
      'updateHomeUI', 'renderWallet', 'renderDashboard',
      'updateWalletCards', 'refreshDashboard',
      'renderPortfolio', 'updatePortfolio',
      'rerenderHome', 'forceRender'
    ];
    
    let calledAny = false;
    const calledList = [];
    
    renderFns.forEach(function(fnName) {
      if (typeof window[fnName] === 'function') {
        try {
          window[fnName]();
          calledAny = true;
          calledList.push(fnName);
        } catch(e) {
          console.warn('[AURA fix] ' + fnName + ' threw:', e);
        }
      }
    });
    
    // Trigger un événement custom au cas où quelque chose écoute
    try {
      window.dispatchEvent(new CustomEvent('aura:state-loaded', {
        detail: { S: window.S }
      }));
    } catch(e) {}
    
    _renderCount++;
    _lastRenderTs = Date.now();
    
    if (calledAny) {
      console.log('[AURA fix] Force render #' + _renderCount +
                  ' · cash=$' + cash.toFixed(2) +
                  ' trading=$' + trading.toFixed(2) +
                  ' cycle=#' + cycle +
                  ' · called: ' + calledList.join(', '));
    } else if (_renderCount === 1) {
      console.warn('[AURA fix] Aucune fonction de render trouvée. ' +
                   'Les cards Caisse/Trading pourraient rester à $0. ' +
                   'État interne: cash=$' + cash.toFixed(2) +
                   ' trading=$' + trading.toFixed(2));
    }
    
    return calledAny;
  }
  
  // Exécution à plusieurs délais (loadState peut être long)
  setTimeout(_auraTryRender, 1500);
  setTimeout(_auraTryRender, 3000);
  setTimeout(_auraTryRender, 5000);
  setTimeout(_auraTryRender, 8000);
  
  // Expose globalement pour debug manuel
  window._auraForceRender = _auraTryRender;
  
  console.log('[AURA fix v118] Render fix module loaded · sera exécuté à 1.5s, 3s, 5s, 8s');
})();
