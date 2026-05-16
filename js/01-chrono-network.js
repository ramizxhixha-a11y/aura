/* ═══════════════════════════════════════════════════════════
   AURA8 v128.1 · js/01-chrono-network.js

   CORRECTIFS depuis v127 :
   - SUPPRIMÉ : shims startSim/stopSim/toggleSim qui forçaient
     window.simulationPaused = true (cause du bot dormant)
   - SUPPRIMÉ : touche au bouton AUTO/MANU (cause du bouton cassé)
   - REFAIT : chrono compte par mode trading (sim/paperReal/real)
     au lieu de AUTO/MANU
   - SETTRADE : tente d'appeler la fonction de l'app avant fallback
     direct (pour rester cohérent avec l'app)
   - RENDER : utilise classList.toggle au lieu de réécrire className
     (n'écrase plus les classes ajoutées par d'autres scripts)

   Auto-injection CSS + bouton de cycle. Aucune modif HTML requise.
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const TRADE_LABEL = { sim: 'AA', paperReal: 'EV', real: 'RE' };
  const TRADE_CLASS = { sim: 'mode-AA', paperReal: 'mode-EV', real: 'mode-RE' };
  const TRADE_ORDER = ['sim', 'paperReal', 'real'];

  const K_CHRONO = {
    sim:       'aura_chrono_sim',
    paperReal: 'aura_chrono_paper',
    real:      'aura_chrono_real',
  };
  const K_NET_PAUSE  = 'aura_paused_by_network';
  const K_QUIT_OFF   = 'aura_quit_while_offline';
  const K_TRADE_MODE = 'aura_trade_mode';

  const state = {
    chronos: {
      sim:       parseInt(localStorage.getItem(K_CHRONO.sim)       || '0', 10),
      paperReal: parseInt(localStorage.getItem(K_CHRONO.paperReal) || '0', 10),
      real:      parseInt(localStorage.getItem(K_CHRONO.real)      || '0', 10),
    },
    running: false,
    pausedByNetwork: false,
    netStatus: 'online',
  };

  const quitOffline = localStorage.getItem(K_QUIT_OFF) === 'true';

  // ─── Auto-injection CSS ──────────────────────────────
  function injectCSS() {
    if (document.querySelector('link[href*="25-mode-trading"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/25-mode-trading.css';
    (document.head || document.documentElement).appendChild(link);
  }

  // ─── Auto-injection bouton mode (après bouton AUTO) ──
  function injectTradeBtn() {
    if (document.getElementById('tradeModeBtn')) return true;
    const autoBtn = document.querySelector('.btn-mode-toggle')
                 || document.getElementById('modeToggleBtn');
    if (!autoBtn) return false;
    const btn = document.createElement('button');
    btn.id = 'tradeModeBtn';
    btn.className = 'btn-trade-mode';
    btn.title = 'Mode trading (tap pour cycler)';
    btn.textContent = 'AA';
    btn.addEventListener('click', cycleTradeMode, false);
    autoBtn.parentNode.insertBefore(btn, autoBtn.nextSibling);
    return true;
  }

  // ─── Format chrono ──────────────────────────────────
  function formatChrono(s) {
    s = Math.max(0, Math.floor(s));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = n => String(n).padStart(2, '0');
    if (d > 0) return `${d}j ${pad(h)}:${pad(m)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

  // ─── Mode trading ───────────────────────────────────
  function getTradeMode() {
    try {
      if (window.S && window.S.tradingMode &&
          TRADE_ORDER.indexOf(window.S.tradingMode) !== -1) {
        return window.S.tradingMode;
      }
    } catch(e) {}
    const saved = localStorage.getItem(K_TRADE_MODE);
    if (saved && TRADE_ORDER.indexOf(saved) !== -1) return saved;
    return 'sim';
  }

  // Tente d'appeler une fonction de l'app pour changer le mode
  // (qui gère les effets de bord : feeds, positions, UI). Si aucune
  // fonction trouvée, fallback en écrivant directement la variable.
  function setTradeMode(mode) {
    const appFns = [
      'setTradingMode', 'changeTradingMode', 'applyTradingMode',
      'switchTradingMode', 'switchMode', 'changeMode', 'setMode'
    ];
    for (let i = 0; i < appFns.length; i++) {
      const fn = window[appFns[i]];
      if (typeof fn === 'function') {
        try { fn(mode); break; } catch(e) {}
      }
    }
    // Fallback / parallèle : écriture directe
    try { if (window.S) window.S.tradingMode = mode; } catch(e) {}
    try { localStorage.setItem(K_TRADE_MODE, mode); } catch(e) {}
  }

  function cycleTradeMode() {
    const cur = getTradeMode();
    const next = TRADE_ORDER[(TRADE_ORDER.indexOf(cur) + 1) % TRADE_ORDER.length];
    setTradeMode(next);
    applyTradeUI();
    try {
      window.dispatchEvent(new CustomEvent('aura-trade-mode-changed', {
        detail: { mode: next, label: TRADE_LABEL[next] }
      }));
    } catch(e) {}
  }

  // ⚠️ Ne touche JAMAIS au bouton AUTO/MANU.
  // Utilise classList add/remove pour ne pas écraser les autres classes.
  function applyTradeUI() {
    const mode = getTradeMode();
    const cls = TRADE_CLASS[mode];
    const label = TRADE_LABEL[mode];
    const allCls = ['mode-AA', 'mode-EV', 'mode-RE'];

    function setMode(el) {
      if (!el) return;
      allCls.forEach(c => el.classList.remove(c));
      el.classList.add(cls);
    }

    setMode(document.querySelector('.aura-circular-wrap'));
    setMode(document.getElementById('chronoEl'));
    setMode(document.getElementById('statusBar'));

    // Badge sous le chrono (créé si absent)
    let badge = document.getElementById('chronoModeBadge');
    const chronoEl = document.getElementById('chronoEl');
    if (!badge && chronoEl && chronoEl.parentNode) {
      badge = document.createElement('div');
      badge.id = 'chronoModeBadge';
      badge.className = 'chrono-mode-badge';
      chronoEl.parentNode.appendChild(badge);
    }
    if (badge) {
      setMode(badge);
      badge.textContent = label;
    }

    // Bouton de cycle
    const tradeBtn = document.getElementById('tradeModeBtn');
    if (tradeBtn) {
      setMode(tradeBtn);
      tradeBtn.textContent = label;
    }
    // ❌ Aucune modif sur .btn-mode-toggle / #modeToggleBtn
  }

  // ─── Détection réseau ───────────────────────────────
  function evaluateNetwork() {
    if (!navigator.onLine) return 'offline';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.effectiveType) {
      const t = conn.effectiveType;
      if (t === '4g') return 'online';
      if (t === '3g' || t === '2g' || t === 'slow-2g') return 'unstable';
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
        // ⚠️ window.simulationPaused N'EST PAS TOUCHÉ (cassait le bot)
      }
    } else if (prev === 'offline' && state.pausedByNetwork && !quitOffline) {
      state.pausedByNetwork = false;
      state.running = true;
      localStorage.setItem(K_NET_PAUSE, 'false');
    }
    renderNet();
  }

  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  // ─── Lecture passive du bouton play ──────────────────
  function syncRunningFromBtn() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    const text = btn.textContent.trim();
    const isRunning = (text === '⏸' || text === '❚❚');
    if (state.running !== isRunning && !state.pausedByNetwork) {
      state.running = isRunning;
    }
  }

  // ─── Tick 1 seconde ─────────────────────────────────
  function tick() {
    syncRunningFromBtn();
    if (state.running && state.netStatus !== 'offline') {
      const tm = getTradeMode();
      state.chronos[tm]++;
      if (state.chronos[tm] % 10 === 0) {
        try { localStorage.setItem(K_CHRONO[tm], state.chronos[tm]); } catch(e) {}
      }
    }
    render();
  }

  // Render utilise classList.toggle (non-destructif) au lieu de className=
  function render() {
    const tm = getTradeMode();
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = formatChrono(state.chronos[tm]);
      chronoEl.classList.add('chrono-display');
      chronoEl.classList.toggle('running', state.running);
      chronoEl.classList.toggle('paused-auto', state.pausedByNetwork);
      // Les classes mode-XX restent en place (gérées par applyTradeUI)
    }
  }

  function renderNet() {
    const netEl = document.getElementById('netIndicator');
    if (!netEl) return;
    netEl.classList.remove('online', 'unstable', 'offline');
    netEl.classList.add('net-indicator', state.netStatus);
  }

  // ─── Re-sync mode trading si modifié ailleurs ────────
  let _lastMode = null;
  function watchTradeMode() {
    const cur = getTradeMode();
    if (cur !== _lastMode) {
      _lastMode = cur;
      applyTradeUI();
    }
  }

  // ─── API publique ───────────────────────────────────
  window.AuraChrono = {
    state: state,
    formatChrono: formatChrono,
    resetChrono: function(mode) {
      if (state.chronos[mode] !== undefined) {
        state.chronos[mode] = 0;
        try { localStorage.setItem(K_CHRONO[mode], 0); } catch(e) {}
        render();
      }
    },
    getChrono: function(mode) {
      return state.chronos[mode || getTradeMode()];
    }
  };
  window.cycleTradingMode = cycleTradeMode;

  // ─── Init ───────────────────────────────────────────
  function tryInjectBtn() {
    if (!injectTradeBtn()) {
      setTimeout(tryInjectBtn, 500);
      return;
    }
    applyTradeUI();
  }

  function init() {
    injectCSS();
    window.addEventListener('online', onNetworkChange);
    window.addEventListener('offline', onNetworkChange);
    if (navigator.connection) {
      navigator.connection.addEventListener('change', onNetworkChange);
    }
    window.addEventListener('beforeunload', () => {
      if (!navigator.onLine) localStorage.setItem(K_QUIT_OFF, 'true');
      else localStorage.setItem(K_QUIT_OFF, 'false');
      try {
        Object.keys(K_CHRONO).forEach(m => {
          localStorage.setItem(K_CHRONO[m], state.chronos[m]);
        });
      } catch(e) {}
    });
    onNetworkChange();
    setInterval(tick, 1000);
    setInterval(watchTradeMode, 2000);
    render();
    tryInjectBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
