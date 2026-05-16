/* ═══════════════════════════════════════════════════════════
   AURA8 v126 · js/01-chrono-network.js
   LIVRAISON — Chrono multi-mode + Détection réseau + Auto-pause
   + Shim startSim/stopSim/pauseSim/resumeSim
   + Override toggleSim autonome
   + Filet de sécurité bouton play
   + NOUVEAU v126 : Cycle de mode trading (AA / EV / RE)

   v126 = v125 + bloc TRADE-MODE en fin de fichier.
   Aucune autre modification : la logique v125 reste IDENTIQUE.

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

  // ─── SHIM startSim / stopSim (v125, inchangé) ───────
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

  // ─── Chrono (v125, inchangé) ─────────────────────────
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

  // ─── Détection réseau (v125, inchangé) ──────────────
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
      // On garde les classes mode-XX en plus de chrono-display et running/paused-auto
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
  // ═══ NOUVEAU v126 — CYCLE MODE TRADING (AA / EV / RE) ═══
  // ═══════════════════════════════════════════════════════════

  // Mapping interne ↔ libellé visible
  const TRADE_LABEL = { sim: 'AA', paperReal: 'EV', real: 'RE' };
  const TRADE_CLASS = { sim: 'mode-AA', paperReal: 'mode-EV', real: 'mode-RE' };
  const TRADE_ORDER = ['sim', 'paperReal', 'real'];
  const K_TRADE_MODE = 'aura_trade_mode_v126';

  // Lecture du mode actif (priorité : S.tradingMode > localStorage > sim)
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

  // Application des classes CSS sur tous les éléments cibles
  function applyTradeModeUI(mode) {
    const cls = TRADE_CLASS[mode] || 'mode-AA';
    const label = TRADE_LABEL[mode] || 'AA';
    const allClasses = 'mode-AA mode-EV mode-RE';

    // 1. Logo (cercle extérieur)
    const logo = document.querySelector('.aura-circular-wrap');
    if (logo) {
      allClasses.split(' ').forEach(c => logo.classList.remove(c));
      logo.classList.add(cls);
    }

    // 2. Bouton AUTO/MANU
    const autoBtn = document.querySelector('.btn-mode-toggle')
                 || document.getElementById('modeToggleBtn');
    if (autoBtn) {
      allClasses.split(' ').forEach(c => autoBtn.classList.remove(c));
      autoBtn.classList.add(cls);
    }

    // 3. Chrono
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      allClasses.split(' ').forEach(c => chronoEl.classList.remove(c));
      chronoEl.classList.add(cls);
    }

    // 4. Badge sous le chrono
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

    // 5. Bordure du header (#statusBar)
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      allClasses.split(' ').forEach(c => statusBar.classList.remove(c));
      statusBar.classList.add(cls);
    }

    // 6. Le bouton de cycle lui-même
    const tradeBtn = document.getElementById('tradeModeBtn');
    if (tradeBtn) {
      allClasses.split(' ').forEach(c => tradeBtn.classList.remove(c));
      tradeBtn.classList.add('btn-trade-mode', cls);
      tradeBtn.textContent = label;
    }
  }

  // Cycle : sim → paperReal → real → sim
  window.cycleTradingMode = function() {
    const current = getTradeMode();
    const idx = TRADE_ORDER.indexOf(current);
    const next = TRADE_ORDER[(idx + 1) % TRADE_ORDER.length];

    // Écriture dans S si présent (source de vérité de l'app)
    try {
      if (window.S) window.S.tradingMode = next;
    } catch(e) {}
    // Sauvegarde localStorage en parallèle (filet de sécurité)
    try { localStorage.setItem(K_TRADE_MODE, next); } catch(e) {}

    applyTradeModeUI(next);

    // Notifier le reste de l'app (si elle écoute)
    try {
      window.dispatchEvent(new CustomEvent('aura-trade-mode-changed', {
        detail: { mode: next, label: TRADE_LABEL[next] }
      }));
    } catch(e) {}
  };

  // Init au démarrage : applique le mode déjà actif
  function initTradeMode() {
    const tradeBtn = document.getElementById('tradeModeBtn');
    if (!tradeBtn) {
      // Bouton pas encore là, on retente bientôt
      setTimeout(initTradeMode, 500);
      return;
    }
    // Branche le click si pas encore branché
    if (!tradeBtn._auraCycleAttached) {
      tradeBtn._auraCycleAttached = true;
      tradeBtn.addEventListener('click', window.cycleTradingMode, false);
    }
    applyTradeModeUI(getTradeMode());
  }

  // Re-synchronise toutes les 2 secondes au cas où S.tradingMode aurait changé
  // ailleurs (par le code existant de l'app, par exemple via les Réglages)
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
