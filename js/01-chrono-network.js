/* ═══════════════════════════════════════════════════════════
   AURA8 v119 · js/01-chrono-network.js
   Chrono 3 modes indépendants + couleurs dédiées + réseau

   Modes internes (JAMAIS renommer) :
     'sim'       → "Mode Auto-apprentissage"  🔵 cyan  #38d4f5
     'paperReal' → "Mode Évaluation"          🟡 ambre #f5a623
     'real'      → "Mode Réel"                🟢 vert  #00e87a

   Source de vérité : window.S.tradingMode  (02-state-init.js)
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Clés localStorage ─────────────────────────────────── */
  const K_SIM_SEC   = 'aura_chrono_sim_seconds';
  const K_PAPER_SEC = 'aura_chrono_paper_seconds';
  const K_REAL_SEC  = 'aura_chrono_real_seconds';
  const K_RUNNING   = 'aura_system_running';
  const K_NET_PAUSE = 'aura_paused_by_network';
  const K_QUIT_OFF  = 'aura_quit_while_offline';

  /* ── Config couleurs/labels par mode ───────────────────── */
  const MODE_CFG = {
    sim:       { color: '#38d4f5', label: 'AUTO-APPR',  cssClass: 'mode-sim'   },
    paperReal: { color: '#f5a623', label: 'ÉVALUATION', cssClass: 'mode-paper' },
    real:      { color: '#00e87a', label: 'RÉEL',       cssClass: 'mode-real'  },
  };

  /* ── État interne ──────────────────────────────────────── */
  const _state = {
    chronoSeconds: {
      sim:       parseInt(localStorage.getItem(K_SIM_SEC)   || '0', 10),
      paperReal: parseInt(localStorage.getItem(K_PAPER_SEC) || '0', 10),
      real:      parseInt(localStorage.getItem(K_REAL_SEC)  || '0', 10),
    },
    running:         false,
    pausedByNetwork: false,
    netStatus:       'online',
  };

  /* Lit le mode courant DIRECTEMENT depuis S.tradingMode */
  function currentMode() {
    const m = (typeof window.S !== 'undefined') ? window.S.tradingMode : null;
    return (m && MODE_CFG[m]) ? m : 'sim';
  }

  const quitOffline = localStorage.getItem(K_QUIT_OFF) === 'true';

  /* ── Formatage MM:SS → HH:MM:SS → Xd HH:MM ───────────── */
  function formatChrono(s) {
    s = Math.max(0, Math.floor(s));
    const d   = Math.floor(s / 86400);
    const h   = Math.floor((s % 86400) / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = n => String(n).padStart(2, '0');
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

  /* ── Persistance (toutes les 10s) ─────────────────────── */
  function save() {
    localStorage.setItem(K_SIM_SEC,   _state.chronoSeconds.sim);
    localStorage.setItem(K_PAPER_SEC, _state.chronoSeconds.paperReal);
    localStorage.setItem(K_REAL_SEC,  _state.chronoSeconds.real);
    localStorage.setItem(K_RUNNING,   _state.running);
  }

  /* ── Détection réseau ──────────────────────────────────── */
  function evaluateNetwork() {
    if (!navigator.onLine) return 'offline';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.effectiveType) {
      const t = conn.effectiveType;
      if (t === '3g' || t === '2g' || t === 'slow-2g') return 'unstable';
    }
    return 'online';
  }

  function onNetworkChange() {
    const prev = _state.netStatus;
    _state.netStatus = evaluateNetwork();

    if (_state.netStatus === 'offline') {
      if (_state.running) {
        _state.pausedByNetwork = true;
        _state.running = false;
        localStorage.setItem(K_NET_PAUSE, 'true');
        save();
        if (typeof window.simulationPaused !== 'undefined') window.simulationPaused = true;
      }
    } else if (prev === 'offline' && _state.pausedByNetwork && !quitOffline) {
      _state.pausedByNetwork = false;
      _state.running = true;
      localStorage.setItem(K_NET_PAUSE, 'false');
      save();
      if (typeof window.simulationPaused !== 'undefined') window.simulationPaused = false;
    }
    render();
  }

  /* Init quit-offline */
  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  /* ── Sync état running depuis bouton UI ────────────────── */
  function syncRunningFromUI() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    const isRunning = btn.textContent.trim() === '⏸';
    if (_state.running !== isRunning && !_state.pausedByNetwork) {
      _state.running = isRunning;
      save();
    }
  }

  /* ── Tick 1 seconde ────────────────────────────────────── */
  let _tickCount = 0;
  function tick() {
    syncRunningFromUI();
    const mode = currentMode();
    if (_state.running && _state.netStatus !== 'offline') {
      _state.chronoSeconds[mode]++;
      _tickCount++;
      if (_tickCount % 10 === 0) save();
    }
    render();
  }

  /* ── Rendu UI ──────────────────────────────────────────── */
  function render() {
    const mode = currentMode();
    const cfg  = MODE_CFG[mode];

    /* — Chrono — */
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = formatChrono(_state.chronoSeconds[mode]);
      chronoEl.className   = 'chrono-display';
      if (_state.running)         chronoEl.classList.add('running');
      if (_state.pausedByNetwork) chronoEl.classList.add('paused-auto');
      else                        chronoEl.classList.add(cfg.cssClass);
    }

    /* — Badge mode sous le chrono — */
    const badgeEl = document.getElementById('modeBadgeEl');
    if (badgeEl) {
      badgeEl.textContent = cfg.label;
      badgeEl.className   = 'mode-badge ' + cfg.cssClass;
    }

    /* — Indicateur réseau — */
    const netEl = document.getElementById('netIndicator');
    if (netEl) netEl.className = 'net-indicator ' + _state.netStatus;

    /* — Bouton play/pause si pause réseau — */
    const btn = document.getElementById('simToggleBtn');
    if (btn && _state.pausedByNetwork) {
      btn.className   = 'btn-icon btn-play-pause network-lost';
      btn.textContent = '▶';
    }

    /* — Bordure colorée du header selon mode — */
    const bar = document.getElementById('statusBar');
    if (bar) {
      if (mode === 'real')           bar.style.borderBottomColor = 'rgba(0,232,122,.25)';
      else if (mode === 'paperReal') bar.style.borderBottomColor = 'rgba(245,166,35,.20)';
      else                           bar.style.borderBottomColor = 'rgba(56,212,245,.07)';
    }
  }

  /* ── API publique window.AuraChrono ────────────────────── */
  window.AuraChrono = {
    formatChrono,
    /** Appelé après chaque changement de S.tradingMode */
    refresh: function () { render(); },
    resetChrono: function (mode) {
      const m = mode || currentMode();
      if (_state.chronoSeconds[m] !== undefined) {
        _state.chronoSeconds[m] = 0;
        save();
        render();
      }
    },
    getChrono: function (mode) {
      return _state.chronoSeconds[mode || currentMode()];
    },
    getAllChronos: function () {
      return { ..._state.chronoSeconds };
    },
  };

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    window.addEventListener('online',  onNetworkChange);
    window.addEventListener('offline', onNetworkChange);
    if (navigator.connection) {
      navigator.connection.addEventListener('change', onNetworkChange);
    }
    window.addEventListener('beforeunload', () => {
      localStorage.setItem(K_QUIT_OFF, !navigator.onLine ? 'true' : 'false');
      save();
    });

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
