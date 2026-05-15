/* ═══════════════════════════════════════════════════════════
   AURA8 v119 · js/01-chrono-network.js
   Chrono 3 compteurs séparés + couleurs correctes + réseau
   + Bouton de changement de mode dans le header

   Couleurs validées définitives :
     'sim'       → Auto-apprentissage  🔵 Cyan  #38d4f5
     'paperReal' → Évaluation          🟢 Vert  #00e87a
     'real'      → Réel                🔴 Rouge #ff3d6b

   Source de vérité : window.S.tradingMode
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Clés localStorage ─────────────────────────────────── */
  const K_SIM_SEC   = 'aura_chrono_sim_seconds';
  const K_PAPER_SEC = 'aura_chrono_paper_seconds';
  const K_REAL_SEC  = 'aura_chrono_real_seconds';
  const K_NET_PAUSE = 'aura_paused_by_network';
  const K_QUIT_OFF  = 'aura_quit_while_offline';

  /* ── Config couleurs/labels par mode ───────────────────── */
  const MODE_CFG = {
    sim: {
      color:        '#38d4f5',
      label:        'AUTO-APPR',
      labelFull:    'Auto-apprentissage',
      abbr:         'AA',
      chronoClass:  'mode-sim',
      headerBorder: 'rgba(56,212,245,.12)',
    },
    paperReal: {
      color:        '#00e87a',
      label:        'ÉVALUATION',
      labelFull:    'Évaluation',
      abbr:         'EV',
      chronoClass:  'mode-paper',
      headerBorder: 'rgba(0,232,122,.15)',
    },
    real: {
      color:        '#ff3d6b',
      label:        'RÉEL',
      labelFull:    'Réel',
      abbr:         'RE',
      chronoClass:  'mode-real',
      headerBorder: 'rgba(255,61,107,.20)',
    },
  };

  /* ── Ordre de cycling des modes ────────────────────────── */
  const MODE_ORDER = ['sim', 'paperReal', 'real'];

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

  /* Lit le mode depuis S.tradingMode */
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

  /* ── Persistance ───────────────────────────────────────── */
  let _tickCount = 0;
  function save() {
    localStorage.setItem(K_SIM_SEC,   _state.chronoSeconds.sim);
    localStorage.setItem(K_PAPER_SEC, _state.chronoSeconds.paperReal);
    localStorage.setItem(K_REAL_SEC,  _state.chronoSeconds.real);
  }

  /* ── Changement de mode trading ────────────────────────── */
  function auraSetTradingMode(newMode) {
    if (!MODE_CFG[newMode]) return;
    if (typeof window.S === 'undefined') return;

    const oldMode = window.S.tradingMode;
    if (oldMode === newMode) return;

    // Confirmation si on passe en mode Réel
    if (newMode === 'real') {
      const ok = confirm(
        '🔴 PASSAGE EN MODE RÉEL\n\n' +
        'Ce mode utilise de vraies données Binance.\n' +
        'Confirmer le changement ?'
      );
      if (!ok) return;
    }

    window.S.tradingMode = newMode;

    // Log dans la blockchain si disponible
    try {
      const cfg = MODE_CFG[newMode];
      if (window.S.chainLog) {
        window.S.chainLog.push({
          icon: newMode === 'real' ? '🔴' : newMode === 'paperReal' ? '🟢' : '🔵',
          desc: 'Mode changé → ' + cfg.labelFull,
          hash: Math.random().toString(36).slice(2, 10),
          time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
        });
        if (window.S.chainLog.length > 100) window.S.chainLog.splice(0, window.S.chainLog.length - 100);
      }
    } catch(e) {}

    // Toast
    try {
      if (typeof window.showToast === 'function') {
        const cfg = MODE_CFG[newMode];
        window.showToast('Mode → ' + cfg.labelFull, 2500, newMode === 'real' ? 'warn' : 'win');
      }
    } catch(e) {}

    // Forcer un re-render immédiat
    render();

    // Appeler window.AuraChrono.refresh si disponible
    if (window.AuraChrono && window.AuraChrono.refresh) {
      window.AuraChrono.refresh();
    }
  }
  window.auraSetTradingMode = auraSetTradingMode;

  /* ── Créer le bouton de mode dans le header ────────────── */
  function _createModeButton() {
    if (document.getElementById('auraModeBtn')) return; // déjà créé

    const btn = document.createElement('button');
    btn.id        = 'auraModeBtn';
    btn.className = 'btn-mode-trading';
    btn.title     = 'Changer le mode trading';
    btn.onclick   = function () {
      const cur   = currentMode();
      const idx   = MODE_ORDER.indexOf(cur);
      const next  = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
      auraSetTradingMode(next);
    };

    // Insérer dans .header-buttons
    const headerBtns = document.querySelector('.header-buttons');
    if (headerBtns) {
      // Insérer avant le dernier bouton (⚙)
      const settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) {
        headerBtns.insertBefore(btn, settingsBtn);
      } else {
        headerBtns.appendChild(btn);
      }
    }

    _updateModeButton();
  }

  /* ── Mettre à jour le bouton de mode ───────────────────── */
  function _updateModeButton() {
    const btn = document.getElementById('auraModeBtn');
    if (!btn) return;
    const mode = currentMode();
    const cfg  = MODE_CFG[mode];
    btn.textContent = cfg.abbr;
    btn.style.borderColor = cfg.color;
    btn.style.color       = cfg.color;
    btn.style.background  = cfg.color + '1a'; // ~10% opacité
    btn.style.boxShadow   = mode === 'real'
      ? `0 0 8px ${cfg.color}66`
      : `0 0 4px ${cfg.color}33`;
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

  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  /* ── Sync running depuis simToggleBtn ──────────────────── */
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

  /* ── Rendu UI complet ──────────────────────────────────── */
  function render() {
    const mode = currentMode();
    const cfg  = MODE_CFG[mode];

    /* Chrono */
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = formatChrono(_state.chronoSeconds[mode]);
      chronoEl.className   = 'chrono-display';
      if (_state.pausedByNetwork) {
        chronoEl.classList.add('paused-auto');
      } else {
        chronoEl.classList.add(cfg.chronoClass);
        if (_state.running) chronoEl.classList.add('running');
      }
    }

    /* Badge mode sous le chrono */
    const badgeEl = document.getElementById('modeBadgeEl');
    if (badgeEl) {
      badgeEl.textContent = cfg.label;
      badgeEl.className   = 'mode-badge ' + cfg.chronoClass;
    }

    /* Bouton AUTO/MANU — colorer selon mode trading */
    const modeLbl = document.getElementById('modeLabelText');
    if (modeLbl) {
      const modeBtn = modeLbl.closest('button') || modeLbl.parentElement;
      if (modeBtn) {
        const isManu = (modeLbl.textContent || '').trim().toUpperCase() === 'MANU';
        if (!isManu) {
          modeBtn.style.borderColor = cfg.color;
          modeBtn.style.background  = cfg.color + '1f';
          modeBtn.style.color       = cfg.color;
        }
      }
    }

    /* Bouton de changement de mode */
    _updateModeButton();

    /* Indicateur réseau */
    const netEl = document.getElementById('netIndicator');
    if (netEl) netEl.className = 'net-indicator ' + _state.netStatus;

    /* Play/pause seulement si pause réseau */
    const simBtn = document.getElementById('simToggleBtn');
    if (simBtn && _state.pausedByNetwork) {
      simBtn.className   = 'btn-icon btn-play-pause network-lost';
      simBtn.textContent = '▶';
    }

    /* Bordure header */
    const bar = document.getElementById('statusBar');
    if (bar) bar.style.borderBottomColor = cfg.headerBorder;
  }

  /* ── API publique ──────────────────────────────────────── */
  window.AuraChrono = {
    formatChrono,
    refresh: function () { render(); },
    resetChrono: function (mode) {
      const m = mode || currentMode();
      if (_state.chronoSeconds[m] !== undefined) {
        _state.chronoSeconds[m] = 0;
        save();
        render();
      }
    },
    getChrono:    function (mode) { return _state.chronoSeconds[mode || currentMode()]; },
    getAllChronos: function () { return { ..._state.chronoSeconds }; },
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

    // Créer le bouton de mode dans le header
    _createModeButton();

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
