/* ═══════════════════════════════════════════════════════════
   AURA8 v119 · js/01-chrono-network.js
   LIVRAISON — Chrono multi-mode + Détection réseau + Auto-pause
   + FILET DE SÉCURITÉ bouton play (livraison v119)

   COEXISTENCE avec le code existant :
   - Les boutons header ont des onclick natifs (toggleSim, toggleMode, toggleWakeLock, etc.)
     qui appellent les fonctions JS existantes du HTML.
   - Ce module N'ATTACHE PAS de listener sur ces boutons : il ne fait que
     OBSERVER les changements et METTRE À JOUR le chrono + l'indicateur réseau.
   - Le code existant peut appeler window.AuraChrono.* pour synchroniser.
   - AJOUT v119 : un click handler DÉFENSIF en phase bubbling sur #simToggleBtn
     qui détecte si le clic a eu effet ; si non, applique un fallback visuel
     et synchronise window.simulationPaused. Ne s'active QUE si toggleSim est cassé.
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

  // ─── FILET DE SÉCURITÉ bouton play (v119) ───────────
  // Attache un listener en phase bubbling sur #simToggleBtn.
  // Le listener mesure si le clic a réellement changé l'état du bouton.
  // - Si oui (toggleSim a fonctionné) → ne fait RIEN, transparent.
  // - Si non (toggleSim cassé/absent) → applique un fallback :
  //     bascule le texte ▶/⏸ et synchronise window.simulationPaused.
  function attachDefensivePlayHandler() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) {
      // Le bouton n'est pas encore dans le DOM → réessayer dans 500ms
      setTimeout(attachDefensivePlayHandler, 500);
      return;
    }
    if (btn._auraDefensiveAttached) return; // pas deux fois
    btn._auraDefensiveAttached = true;

    btn.addEventListener('click', function(e) {
      const textBefore = btn.textContent.trim();
      const disabledBefore = btn.disabled;

      // Laisse 50ms aux handlers natifs (onclick="toggleSim()") pour s'exécuter
      setTimeout(function() {
        const textAfter = btn.textContent.trim();
        const stateChanged = (textBefore !== textAfter);

        if (stateChanged) return; // toggleSim a fait son boulot, on ne touche à rien

        // Fallback : toggleSim absente, cassée, ou n'a pas modifié le bouton
        console.warn('[AuraChrono] Bouton play sans effet — fallback v119 activé');

        if (textBefore === '⏸' || textBefore === '⏸') {
          // Était en marche → mettre en pause
          btn.textContent = '▶';
          if (typeof window.simulationPaused !== 'undefined') {
            window.simulationPaused = true;
          }
          state.running = false;
          state.pausedByNetwork = false;
          localStorage.setItem(K_NET_PAUSE, 'false');
        } else {
          // Était en pause → démarrer
          btn.textContent = '⏸';
          if (typeof window.simulationPaused !== 'undefined') {
            window.simulationPaused = false;
          }
          state.running = true;
          state.pausedByNetwork = false;
          localStorage.setItem(K_NET_PAUSE, 'false');
        }
        save();
        render();
      }, 50);
    }, false); // bubbling phase, après le onclick natif
  }

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

    // Attacher le filet de sécurité du bouton play (v119)
    attachDefensivePlayHandler();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
