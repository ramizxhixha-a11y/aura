/* ═══════════════════════════════════════════════════════════
   AURA8 v125 · js/01-chrono-network.js
   LIVRAISON — Chrono multi-mode + Détection réseau + Auto-pause
   + Shim startSim/stopSim/pauseSim/resumeSim
   + Override toggleSim autonome (bascule simulationPaused)
   + Filet de sécurité bouton play

   v125 = v124 nettoyée :
   - Panneau diagnostic noir SUPPRIMÉ
   - Boutons TEST SUPPRIMÉS
   - Tous les dbg(...) remplacés par no-op silencieux
   - Listener "CLICK ..." global SUPPRIMÉ
   La logique fonctionnelle reste IDENTIQUE à v124.
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

  const quitOffline = localStorage.getItem(K_QUIT_OFF) === 'true';

  // ─── dbg() = no-op silencieux (le panneau visible est supprimé en v125) ──
  // On garde la fonction pour ne pas casser les appels existants dans le code.
  function dbg(_msg) { /* silencieux */ }

  // ─── SHIM startSim / stopSim (FORCE-INSTALL) ────────
  // On écrase systématiquement les versions existantes — un autre code peut
  // les avoir définies sans qu'elles fassent ce qu'il faut.
  function installSimShims() {
    window.startSim = function() {
      window.simulationPaused = false;
      const btn = document.getElementById('simToggleBtn');
      if (btn) {
        btn.classList.remove('paused');
        btn.classList.add('running');
      }
      try { window.dispatchEvent(new CustomEvent('aura-sim-start')); } catch(e){}
    };

    window.stopSim = function() {
      window.simulationPaused = true;
      const btn = document.getElementById('simToggleBtn');
      if (btn) {
        btn.classList.remove('running');
        btn.classList.add('paused');
      }
      try { window.dispatchEvent(new CustomEvent('aura-sim-stop')); } catch(e){}
    };

    window.pauseSim = function() { window.stopSim(); };
    window.resumeSim = function() { window.startSim(); };

    // OVERRIDE autonome de toggleSim — bascule simulationPaused directement,
    // ne dépend pas du fait que startSim/stopSim fassent quoi que ce soit d'utile.
    window.toggleSim = function() {
      const currentlyRunning = (window.simulationPaused === false);
      const btn = document.getElementById('simToggleBtn');
      if (currentlyRunning) {
        // En marche → mettre en pause
        window.simulationPaused = true;
        try { window.stopSim(); } catch(e) {}
        if (btn) btn.textContent = '►';
      } else {
        // En pause (ou inconnu) → démarrer
        window.simulationPaused = false;
        try { window.startSim(); } catch(e) {}
        if (btn) btn.textContent = '❚❚';
      }
    };
  }

  // ─── Chrono ─────────────────────────────────────────
  function formatChrono(s) {
    s = Math.max(0, Math.floor(s));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (d > 0) return `${d}j ${pad(h)}:${pad(m)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

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
        window.simulationPaused = true;
      }
    } else if (prev === 'offline' && state.pausedByNetwork && !quitOffline) {
      state.pausedByNetwork = false;
      state.running = true;
      localStorage.setItem(K_NET_PAUSE, 'false');
      save();
      window.simulationPaused = false;
    }
    render();
  }

  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  // ─── Synchro UI ←→ état chrono ──────────────────────
  function syncRunningFromUI() {
    // Si simulationPaused est défini (par les shims), c'est la source de vérité
    if (typeof window.simulationPaused === 'boolean') {
      const isRunning = (window.simulationPaused === false);
      if (state.running !== isRunning && !state.pausedByNetwork) {
        state.running = isRunning;
        save();
      }
      return;
    }
    // Sinon : fallback sur le texte du bouton
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
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

  function tick() {
    syncRunningFromUI();
    syncModeFromUI();
    if (state.running && state.netStatus !== 'offline') {
      state.chronoSeconds[state.mode]++;
      if (state.chronoSeconds[state.mode] % 10 === 0) save();
    }
    render();
  }

  function render() {
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = formatChrono(state.chronoSeconds[state.mode]);
      chronoEl.className = 'chrono-display';
      if (state.running) chronoEl.classList.add('running');
      if (state.pausedByNetwork) chronoEl.classList.add('paused-auto');
    }
    const netEl = document.getElementById('netIndicator');
    if (netEl) {
      netEl.className = 'net-indicator ' + state.netStatus;
    }
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

  // ─── Filet de sécurité bouton play ──────────────────
  // Si après un clic le texte du bouton n'a pas changé (= un autre handler
  // n'a rien fait), on bascule manuellement sur la base de simulationPaused.
  function attachDefensivePlayHandler() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) {
      setTimeout(attachDefensivePlayHandler, 500);
      return;
    }
    if (btn._auraDefensiveAttached) return;
    btn._auraDefensiveAttached = true;

    btn.addEventListener('click', function() {
      const textBefore = btn.textContent.trim();
      setTimeout(function() {
        const textAfter = btn.textContent.trim();
        const stateChanged = (textBefore !== textAfter);
        if (stateChanged) return;
        // Utiliser simulationPaused comme source de vérité (plus fiable que Unicode)
        const paused = (window.simulationPaused !== false);
        if (paused) {
          btn.textContent = '►';
          state.running = false;
        } else {
          btn.textContent = '❚❚';
          state.running = true;
        }
        state.pausedByNetwork = false;
        localStorage.setItem(K_NET_PAUSE, 'false');
        save();
        render();
      }, 50);
    }, false);
  }

  // ─── Init ───────────────────────────────────────────
  function init() {
    window.addEventListener('online', onNetworkChange);
    window.addEventListener('offline', onNetworkChange);
    if (navigator.connection) {
      navigator.connection.addEventListener('change', onNetworkChange);
    }
    window.addEventListener('beforeunload', () => {
      if (!navigator.onLine) {
        localStorage.setItem(K_QUIT_OFF, 'true');
      } else {
        localStorage.setItem(K_QUIT_OFF, 'false');
      }
      save();
    });
    onNetworkChange();
    setInterval(tick, 1000);
    render();
    // Installer les shims TOUT DE SUITE, avant tout clic possible
    installSimShims();
    attachDefensivePlayHandler();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
