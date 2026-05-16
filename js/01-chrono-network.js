/* ═══════════════════════════════════════════════════════════
   AURA8 v127 · js/01-chrono-network.js
   LIVRAISON — Chrono multi-mode + Détection réseau + Auto-pause
   + Shim startSim/stopSim/pauseSim/resumeSim
   + Override toggleSim autonome
   + Filet de sécurité bouton play
   + Cycle de mode trading (AA / EV / RE)
   + NOUVEAU v127 : AUTO-INJECTION du CSS et du bouton dans le DOM
     → AUCUNE modification HTML requise. Tout est dans ce fichier JS.

   IMPORTANT : les valeurs INTERNES restent 'sim' / 'paperReal' / 'real'.
   Seuls les LIBELLÉS visibles changent (AA / EV / RE).
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

  function dbg(_msg) { /* silencieux */ }

  // ═══ AUTO-INJECTION DU CSS ══════════════════════════
  // Ajoute automatiquement le link vers 25-mode-trading.css
  // si l'utilisateur n'a pas ajouté la ligne dans le HTML.
  function injectModeTradingCSS() {
    if (document.querySelector('link[href*="25-mode-trading"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/25-mode-trading.css';
    (document.head || document.documentElement).appendChild(link);
  }

  // ═══ AUTO-INJECTION DU BOUTON DE MODE ══════════════
  function injectTradeModeButton() {
    if (document.getElementById('tradeModeBtn')) return true;
    const autoBtn = document.querySelector('.btn-mode-toggle')
                 || document.getElementById('modeToggleBtn');
    if (!autoBtn) return false;
    const btn = document.createElement('button');
    btn.id = 'tradeModeBtn';
    btn.className = 'btn-trade-mode mode-AA';
    btn.title = 'Mode trading : tap pour cycler';
    btn.textContent = 'AA';
    autoBtn.parentNode.insertBefore(btn, autoBtn.nextSibling);
    return true;
  }

  // ─── SHIM startSim / stopSim (inchangé) ─────────────
  function installSimShims() {
    window.startSim = function() {
      window.simulationPaused = false;
      const btn = document.getElementById('simToggleBtn');
      if (btn) { btn.classList.remove('paused'); btn.classList.add('running'); }
      try { window.dispatchEvent(new CustomEvent('aura-sim-start')); } catch(e){}
    };
    window.stopSim = function() {
      window.simulationPaused = true;
      const btn = document.getElementById('simToggleBtn');
      if (btn) { btn.classList.remove('running'); btn.classList.add('paused'); }
      try { window.dispatchEvent(new CustomEvent('aura-sim-stop')); } catch(e){}
    };
    window.pauseSim = function() { window.stopSim(); };
    window.resumeSim = function() { window.startSim(); };
    window.toggleSim = function() {
      const currentlyRunning = (window.simulationPaused === false);
      const btn = document.getElementById('simToggleBtn');
      if (currentlyRunning) {
        window.simulationPaused = true;
        try { window.stopSim(); } catch(e) {}
        if (btn) btn.textContent = '►';
      } else {
        window.simulationPaused = false;
        try { window.startSim(); } catch(e) {}
        if (btn) btn.textContent = '❚❚';
      }
    };
  }

  // ─── Chrono (inchangé) ─────────────────────────────
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

  function syncRunningFromUI() {
    if (typeof window.simulationPaused === 'boolean') {
      const isRunning = (window.simulationPaused === false);
      if (state.running !== isRunning && !state.pausedByNetwork) {
        state.running = isRunning;
        save();
      }
      return;
    }
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
      const tradeMode = chronoEl.className.match(/mode-(AA|EV|RE)/);
      chronoEl.className = 'chrono-display';
      if (tradeMode) chronoEl.classList.add(tradeMode[0]);
      if (state.running) chronoEl.classList.add('running');
      if (state.pausedByNetwork) chronoEl.classList.add('paused-auto');
    }
    const netEl = document.getElementById('netIndicator');
    if (netEl) netEl.className = 'net-indicator ' + state.netStatus;
    const btn = document.getElementById('simToggleBtn');
    if (btn && state.pausedByNetwork) {
      btn.className = 'btn-icon btn-play-pause network-lost';
      btn.textContent = '▶';
    }
  }

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

  function attachDefensivePlayHandler() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) { setTimeout(attachDefensivePlayHandler, 500); return; }
    if (btn._auraDefensiveAttached) return;
    btn._auraDefensiveAttached = true;
    btn.addEventListener('click', function() {
      const textBefore = btn.textContent.trim();
      setTimeout(function() {
        const textAfter = btn.textContent.trim();
        if (textBefore !== textAfter) return;
        const paused = (window.simulationPaused !== false);
        if (paused) { btn.textContent = '►'; state.running = false; }
        else { btn.textContent = '❚❚'; state.running = true; }
        state.pausedByNetwork = false;
        localStorage.setItem(K_NET_PAUSE, 'false');
        save();
        render();
      }, 50);
    }, false);
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ CYCLE MODE TRADING (AA / EV / RE) ═══
  // ═══════════════════════════════════════════════════════════

  const TRADE_LABEL = { sim: 'AA', paperReal: 'EV', real: 'RE' };
  const TRADE_CLASS = { sim: 'mode-AA', paperReal: 'mode-EV', real: 'mode-RE' };
  const TRADE_ORDER = ['sim', 'paperReal', 'real'];
  const K_TRADE_MODE = 'aura_trade_mode_v126';

  function getTradeMode() {
    try {
      if (window.S && window.S.tradingMode &&
          ['sim','paperReal','real'].indexOf(window.S.tradingMode) !== -1) {
        return window.S.tradingMode;
      }
    } catch(e) {}
    const saved = localStorage.getItem(K_TRADE_MODE);
    if (saved && ['sim','paperReal','real'].indexOf(saved) !== -1) return saved;
    return 'sim';
  }

  function applyTradeModeUI(mode) {
    const cls = TRADE_CLASS[mode] || 'mode-AA';
    const label = TRADE_LABEL[mode] || 'AA';
    const allClasses = 'mode-AA mode-EV mode-RE';

    const logo = document.querySelector('.aura-circular-wrap');
    if (logo) {
      allClasses.split(' ').forEach(c => logo.classList.remove(c));
      logo.classList.add(cls);
    }

    const autoBtn = document.querySelector('.btn-mode-toggle')
                 || document.getElementById('modeToggleBtn');
    if (autoBtn) {
      allClasses.split(' ').forEach(c => autoBtn.classList.remove(c));
      autoBtn.classList.add(cls);
    }

    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      allClasses.split(' ').forEach(c => chronoEl.classList.remove(c));
      chronoEl.classList.add(cls);
    }

    let badge = document.getElementById('chronoModeBadge');
    if (!badge && chronoEl && chronoEl.parentNode) {
      badge = document.createElement('div');
      badge.id = 'chronoModeBadge';
      badge.className = 'chrono-mode-badge';
      chronoEl.parentNode.appendChild(badge);
    }
    if (badge) {
      allClasses.split(' ').forEach(c => badge.classList.remove(c));
      badge.classList.add('chrono-mode-badge', cls);
      badge.textContent = label;
    }

    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      allClasses.split(' ').forEach(c => statusBar.classList.remove(c));
      statusBar.classList.add(cls);
    }

    const tradeBtn = document.getElementById('tradeModeBtn');
    if (tradeBtn) {
      allClasses.split(' ').forEach(c => tradeBtn.classList.remove(c));
      tradeBtn.classList.add('btn-trade-mode', cls);
      tradeBtn.textContent = label;
    }
  }

  window.cycleTradingMode = function() {
    const current = getTradeMode();
    const idx = TRADE_ORDER.indexOf(current);
    const next = TRADE_ORDER[(idx + 1) % TRADE_ORDER.length];

    try { if (window.S) window.S.tradingMode = next; } catch(e) {}
    try { localStorage.setItem(K_TRADE_MODE, next); } catch(e) {}

    applyTradeModeUI(next);

    try {
      window.dispatchEvent(new CustomEvent('aura-trade-mode-changed', {
        detail: { mode: next, label: TRADE_LABEL[next] }
      }));
    } catch(e) {}
  };

  // Init du bouton — réessaie jusqu'à ce que le header soit chargé
  function initTradeMode() {
    const ok = injectTradeModeButton();
    if (!ok) {
      setTimeout(initTradeMode, 500);
      return;
    }
    const tradeBtn = document.getElementById('tradeModeBtn');
    if (tradeBtn && !tradeBtn._auraCycleAttached) {
      tradeBtn._auraCycleAttached = true;
      tradeBtn.addEventListener('click', window.cycleTradingMode, false);
    }
    applyTradeModeUI(getTradeMode());
  }

  let _lastSeenTradeMode = null;
  function watchTradeMode() {
    const current = getTradeMode();
    if (current !== _lastSeenTradeMode) {
      _lastSeenTradeMode = current;
      applyTradeModeUI(current);
    }
  }

  // ─── Init ───────────────────────────────────────────
  function init() {
    // AUTO-INJECT le CSS d'abord
    injectModeTradingCSS();

    window.addEventListener('online', onNetworkChange);
    window.addEventListener('offline', onNetworkChange);
    if (navigator.connection) {
      navigator.connection.addEventListener('change', onNetworkChange);
    }
    window.addEventListener('beforeunload', () => {
      if (!navigator.onLine) localStorage.setItem(K_QUIT_OFF, 'true');
      else localStorage.setItem(K_QUIT_OFF, 'false');
      save();
    });
    onNetworkChange();
    setInterval(tick, 1000);
    setInterval(watchTradeMode, 2000);
    render();
    installSimShims();
    attachDefensivePlayHandler();
    initTradeMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
