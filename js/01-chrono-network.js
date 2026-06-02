/* ═══════════════════════════════════════════════════════════
   AURA8 · js/01-chrono-network.js
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ▓                   VERSION  v118.16                      ▓
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   
   v118.16 : BUG CRITIQUE RÉSOLU
   - Type 'info' est MASQUÉ par défaut dans showToast() de l'app !
   - C'est pour ça que les notifs AA n'apparaissaient pas
   - Nouveau mapping :
     • sim       → 'ice'  (bleu cyan, var(--ice), visible)
     • paperReal → 'win'  (vert)
     • real      → 'loss' (rouge)
   - Appliqué aux 2 endroits : cycleTradeMode + startSim/stopSim
   ═══════════════════════════════════════════════════════════ */

function _auraGetGlobalS() {
  try { if (typeof window !== 'undefined' && window.S) return window.S; } catch(e) {}
  try {
    const fn = new Function('try { return typeof S !== "undefined" ? S : null; } catch(e) { return null; }');
    return fn();
  } catch(e) {}
  return null;
}
window._auraGetGlobalS = _auraGetGlobalS;

(function _auraChrono() {
  'use strict';

  const K_SIM_SEC   = 'aura_chrono_sim_seconds';
  const K_PAPER_SEC = 'aura_chrono_paperReal_seconds';
  const K_REAL_SEC  = 'aura_chrono_real_seconds';
  const K_MODE      = 'aura_current_trade_mode';
  const K_RUNNING   = 'aura_system_running';
  
  const K_OLD_AUTO  = 'aura_chrono_auto_seconds';
  const K_OLD_MANU  = 'aura_chrono_manu_seconds';

  function _readCounter(key, fallbackKeys) {
    const v = parseInt(localStorage.getItem(key) || '', 10);
    if (!isNaN(v) && v > 0) return v;
    if (fallbackKeys && fallbackKeys.length) {
      for (const k of fallbackKeys) {
        const old = parseInt(localStorage.getItem(k) || '', 10);
        if (!isNaN(old) && old > 0) {
          localStorage.setItem(key, old);
          localStorage.removeItem(k);
          return old;
        }
      }
    }
    return 0;
  }

  function _getInitialMode() {
    const stored = localStorage.getItem(K_MODE);
    if (stored && ['sim', 'paperReal', 'real'].includes(stored)) return stored;
    
    const S = window._auraGetGlobalS();
    if (S && S.tradingMode && ['sim', 'paperReal', 'real'].includes(S.tradingMode)) {
      return S.tradingMode;
    }
    return 'sim';
  }

  const state = {
    chronoSeconds: {
      sim:       _readCounter(K_SIM_SEC, [K_OLD_AUTO]),
      paperReal: _readCounter(K_PAPER_SEC, [K_OLD_MANU]),
      real:      _readCounter(K_REAL_SEC, []),
    },
    currentMode: _getInitialMode(),
    running: false,
    netStatus: 'online',
  };

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

  function save() {
    localStorage.setItem(K_SIM_SEC,   state.chronoSeconds.sim);
    localStorage.setItem(K_PAPER_SEC, state.chronoSeconds.paperReal);
    localStorage.setItem(K_REAL_SEC,  state.chronoSeconds.real);
    localStorage.setItem(K_MODE,      state.currentMode);
    localStorage.setItem(K_RUNNING,   state.running);
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
    state.netStatus = evaluateNetwork();
    render();
  }

  function syncRunningFromUI() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    const text = btn.textContent.trim();
    const isRunning = text === '⏸';
    if (state.running !== isRunning) {
      state.running = isRunning;
      save();
    }
  }

  function tick() {
    syncRunningFromUI();
    if (state.running && state.netStatus !== 'offline') {
      state.chronoSeconds[state.currentMode]++;
      if (state.chronoSeconds[state.currentMode] % 10 === 0) save();
    }
    render();
  }

  function render() {
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = formatChrono(state.chronoSeconds[state.currentMode]);
      chronoEl.className = 'chrono-display mode-' + state.currentMode;
      if (state.running) chronoEl.classList.add('running');
    }

    const netEl = document.getElementById('netIndicator');
    if (netEl) {
      netEl.className = 'net-indicator ' + state.netStatus;
    }
  }

  window.AuraChrono = {
    state: state,
    formatChrono: formatChrono,
    getCurrentMode: function() { return state.currentMode; },
    setMode: function(newMode) {
      if (!['sim', 'paperReal', 'real'].includes(newMode)) return;
      state.currentMode = newMode;
      save();
      render();
    },
    resetChrono: function(mode) {
      if (state.chronoSeconds[mode] !== undefined) {
        state.chronoSeconds[mode] = 0;
        save();
        render();
      }
    },
    resetAll: function() {
      state.chronoSeconds.sim = 0;
      state.chronoSeconds.paperReal = 0;
      state.chronoSeconds.real = 0;
      save();
      render();
    },
    getChrono: function(mode) {
      const m = mode || state.currentMode;
      return state.chronoSeconds[m] || 0;
    },
    refresh: function() { render(); }
  };

  function init() {
    window.addEventListener('online', onNetworkChange);
    window.addEventListener('offline', onNetworkChange);
    if (navigator.connection) {
      navigator.connection.addEventListener('change', onNetworkChange);
    }
    window.addEventListener('beforeunload', () => { save(); });
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
   ░░ PATCH v118.6 · FIX RENDER HOME ░░
   ═══════════════════════════════════════════════════════════ */
(function _auraRenderFixV6() {
  'use strict';
  function _callRenderAll() {
    try {
      if (typeof window !== 'undefined' && typeof window.renderAll === 'function') { window.renderAll(); return true; }
    } catch(e) {}
    try {
      const fn = new Function('try{return typeof renderAll==="function"?(renderAll(),true):false}catch(e){return false}');
      return fn();
    } catch(e) {}
    return false;
  }
  let _attempts = 0, _stableTicks = 0, _intervalId = null, _lastSig = '';
  function _fmtUsd(v) {
    if (Math.abs(v) < 100)   return '$' + v.toFixed(2);
    if (Math.abs(v) < 10000) return '$' + v.toFixed(2);
    return '$' + Math.round(v).toLocaleString();
  }
  function _fmtEur(v) {
    return (Math.round((v || 0) * 100) / 100).toLocaleString('fr-FR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' €';
  }
  function _setIfChanged(id, value) {
    const el = document.getElementById(id);
    if (!el) return false;
    if (el.textContent !== value) { el.textContent = value; return true; }
    return false;
  }
  function _fix() {
    _attempts++;
    const S = window._auraGetGlobalS ? window._auraGetGlobalS() : null;
    if (!S) return false;
    const cash = S.cashAccount || 0, trading = S.tradingAccount || 0, cycle = S.cycle || 0;
    if (cash < 0.01 && trading < 0.01 && cycle === 0) {
      if (_attempts > 8 && _intervalId) { clearInterval(_intervalId); _intervalId = null; }
      return false;
    }
    _callRenderAll();
    const total = cash + trading;
    const cashPct = total > 0 ? Math.round(cash / total * 1000) / 10 : 0;
    const tradingPct = total > 0 ? Math.round(trading / total * 1000) / 10 : 0;
    let directFixed = 0;
    if (_setIfChanged('cashVal', _fmtUsd(cash))) directFixed++;
    if (_setIfChanged('cashPct', cashPct + '%')) directFixed++;
    if (_setIfChanged('tradVal', _fmtUsd(trading))) directFixed++;
    if (_setIfChanged('tradPct', tradingPct + '%')) directFixed++;
    const ownFunds = S.ownFundsInjected || 0;
    const rate = S.usdEurRate || 0.92;
    const ownFundsEUR = ownFunds * rate;
    if (ownFundsEUR > 0.01) {
      if (_setIfChanged('ownFundsVal', _fmtEur(ownFundsEUR))) directFixed++;
      const injCount = (S.ownFundsLog || []).length;
      if (_setIfChanged('ownFundsSub', injCount + ' injection' + (injCount > 1 ? 's' : ''))) directFixed++;
    }
    const fiscal = S.fiscalReserveAccount || 0;
    if (fiscal > 0.01) {
      if (_setIfChanged('fiscalResVal', _fmtUsd(fiscal))) directFixed++;
      const fiscalCount = (S.fiscalReserveLog || []).length;
      if (_setIfChanged('fiscalResSub', fiscalCount + ' dépôts')) directFixed++;
    }
    const levRes = S.leverageReserve || 0;
    if (levRes > 0.01) {
      if (_setIfChanged('levReserveVal', _fmtUsd(levRes))) directFixed++;
    }
    const levBorrowed = S.leverageBorrowed || 0;
    if (levBorrowed > 0.01) {
      _setIfChanged('levBorrowedSub', 'Emprunté: ' + _fmtUsd(levBorrowed));
    }
    const sig = _fmtUsd(cash) + '|' + _fmtUsd(trading) + '|' + cycle;
    if (sig === _lastSig && directFixed === 0) {
      _stableTicks++;
      if (_stableTicks >= 4 && _intervalId) { clearInterval(_intervalId); _intervalId = null; }
    } else { _stableTicks = 0; }
    _lastSig = sig;
    return directFixed > 0;
  }
  setTimeout(function() { _fix(); _intervalId = setInterval(_fix, 2000); }, 1500);
})();

/* ═══════════════════════════════════════════════════════════
   ░░ PATCH v118.7 · FIX startSim() MANQUANTE ░░
   ═══════════════════════════════════════════════════════════ */
(function _auraStartSimFix() {
  'use strict';
  window._auraSimState = window._auraSimState || { interval: null, running: false };
  function _getSimTick() {
    if (typeof window.simTick === 'function') return window.simTick;
    try {
      const fn = new Function('try{return typeof simTick==="function"?simTick:null}catch(e){return null}');
      return fn();
    } catch(e) {}
    return null;
  }
  function _updateBtn(running) {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    btn.textContent = running ? '⏸' : '▶';
    btn.classList.toggle('idle', !running);
    btn.classList.toggle('running', running);
  }
  function _toast(msg, type) {
    try {
      if (typeof window.showToast === 'function') window.showToast(msg, 2500, type || 'win');
    } catch(e) {}
  }
  // v118.16 : mapping mode → label + type pour notifications adaptatives
  // ATTENTION : 'info' est MASQUÉ par défaut dans showToast() → utiliser 'ice' pour AA
  function _getModeInfo() {
    const MAP = {
      'sim':       { name: 'Auto-apprentissage', type: 'ice'  },
      'paperReal': { name: 'Évaluation',         type: 'win'  },
      'real':      { name: 'Trading Réel',       type: 'loss' }
    };
    const mode = (window.AuraChrono && window.AuraChrono.getCurrentMode)
      ? window.AuraChrono.getCurrentMode() : 'sim';
    return MAP[mode] || MAP['sim'];
  }
  window.startSim = function startSim() {
    if (window._auraSimState.running && window._auraSimState.interval) return;
    const simTick = _getSimTick();
    if (!simTick) { _toast('⚠ simTick introuvable', 'warn'); return; }
    window._auraSimState.interval = setInterval(function() {
      try { simTick(); } catch(e) { console.warn('[AURA simTick]', e); }
    }, 1000);
    window._auraSimState.running = true;
    try {
      const setFn = new Function('try{_simRunning=true;_simEverStarted=true;_simInterval=window._auraSimState.interval}catch(e){}');
      setFn();
    } catch(e) {}
    _updateBtn(true);
    // v118.15 : message + couleur adaptés au mode trading actif
    const modeInfo = _getModeInfo();
    try {
      const S = window._auraGetGlobalS();
      if (S && S.chainLog) {
        S.chainLog.push({ icon:'▶', desc: modeInfo.name + ' démarré · cycle #' + (S.cycle || 0),
          hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    } catch(e) {}
    _toast('▶ ' + modeInfo.name + ' démarré', modeInfo.type);
  };
  window.stopSim = function stopSim() {
    if (!window._auraSimState.running) return;
    if (window._auraSimState.interval) { clearInterval(window._auraSimState.interval); window._auraSimState.interval = null; }
    window._auraSimState.running = false;
    try {
      const setFn = new Function('try{_simRunning=false;_simInterval=null}catch(e){}');
      setFn();
    } catch(e) {}
    _updateBtn(false);
    // v118.15 : message + couleur adaptés au mode trading actif
    const modeInfo = _getModeInfo();
    try {
      const S = window._auraGetGlobalS();
      if (S && S.chainLog) {
        S.chainLog.push({ icon:'⏸', desc: modeInfo.name + ' en pause · cycle #' + (S.cycle || 0),
          hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    } catch(e) {}
    _toast('⏸ ' + modeInfo.name + ' en pause', modeInfo.type);
  };
  window.toggleSim = function toggleSim() {
    if (window._auraSimState.running) window.stopSim();
    else window.startSim();
  };
})();

/* ═══════════════════════════════════════════════════════════
   ░░ PATCH v118.14 · MAQUETTE v119 PHASE 1 · BOUTON AA/EV/RE ░░
   ═══════════════════════════════════════════════════════════ */
(function _auraTradeModeFix() {
  'use strict';

  const MODES = {
    'sim':       { label: 'AA', cssClass: 'mode-AA', color: '#38d4f5', name: 'Auto-apprentissage' },
    'paperReal': { label: 'EV', cssClass: 'mode-EV', color: '#00e87a', name: 'Évaluation' },
    'real':      { label: 'RE', cssClass: 'mode-RE', color: '#ff3d6b', name: 'Réel' }
  };
  const CYCLE_ORDER = ['sim', 'paperReal', 'real'];

  function injectCSS() {
    if (document.getElementById('aura-trademode-css')) return;
    const css = `
      .btn-trade-mode {
        padding: 4px 9px; border-radius: 8px; font-weight: 700;
        font-size: 11px; letter-spacing: 0.5px; border: 1.5px solid;
        cursor: pointer; background: transparent;
        font-family: var(--font-mono, 'SF Mono', monospace);
        transition: all 0.25s ease; line-height: 1;
        user-select: none; margin-right: 4px;
      }
      .btn-trade-mode:active { transform: scale(0.94); }
      .btn-trade-mode.mode-AA { color:#38d4f5; border-color:rgba(56,212,245,.55); background:rgba(56,212,245,.08); box-shadow:0 0 0 1px rgba(56,212,245,.15); }
      .btn-trade-mode.mode-AA:hover { background:rgba(56,212,245,.15); box-shadow:0 0 12px rgba(56,212,245,.3); }
      .btn-trade-mode.mode-EV { color:#00e87a; border-color:rgba(0,232,122,.55); background:rgba(0,232,122,.08); box-shadow:0 0 0 1px rgba(0,232,122,.15); }
      .btn-trade-mode.mode-EV:hover { background:rgba(0,232,122,.15); box-shadow:0 0 12px rgba(0,232,122,.3); }
      .btn-trade-mode.mode-RE { color:#ff3d6b; border-color:rgba(255,61,107,.6); background:rgba(255,61,107,.10); box-shadow:0 0 0 1px rgba(255,61,107,.2); }
      .btn-trade-mode.mode-RE:hover { background:rgba(255,61,107,.18); box-shadow:0 0 14px rgba(255,61,107,.4); }
    `;
    const style = document.createElement('style');
    style.id = 'aura-trademode-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function fixNestedButton() {
    const inner = document.getElementById('tradeModeBtn');
    if (!inner) return false;
    const parent = inner.parentElement;
    if (!parent || parent.id !== 'modeToggleBtn') return true;
    const grandParent = parent.parentElement;
    if (!grandParent) return false;
    grandParent.insertBefore(inner, parent);
    return true;
  }

  function updateButtonVisual(mode) {
    const cfg = MODES[mode] || MODES['sim'];
    const btn = document.getElementById('tradeModeBtn');
    if (btn) {
      btn.textContent = cfg.label;
      btn.classList.remove('mode-AA', 'mode-EV', 'mode-RE');
      btn.classList.add(cfg.cssClass);
      btn.title = 'Mode: ' + cfg.name + ' (tape pour cycler)';
    }
    // Badge sous le chrono
    const badge = document.getElementById('modeBadge');
    if (badge) {
      badge.textContent = cfg.label;
      badge.classList.remove('mode-sim', 'mode-paper', 'mode-real');
      badge.classList.add('mode-' + mode);
    }
    // Couleur du mode appliquée au header entier (logo, bordure, AUTO, chrono)
    const bar = document.getElementById('statusBar');
    if (bar) {
      bar.classList.remove('hdr-sim', 'hdr-paper', 'hdr-real');
      bar.classList.add('hdr-' + mode);
    }
    const chrono = document.getElementById('chronoEl');
    if (chrono) {
      chrono.classList.remove('mode-sim', 'mode-paper', 'mode-real');
      chrono.classList.add('mode-' + mode);
    }
  }

  window.cycleTradeMode = function cycleTradeMode() {
    const currentMode = (window.AuraChrono && window.AuraChrono.getCurrentMode) 
      ? window.AuraChrono.getCurrentMode() : 'sim';
    
    const currentIdx = CYCLE_ORDER.indexOf(currentMode);
    const nextIdx = (currentIdx + 1) % CYCLE_ORDER.length;
    const nextMode = CYCLE_ORDER[nextIdx];
    
    // 1. Chrono interne
    if (window.AuraChrono && window.AuraChrono.setMode) {
      window.AuraChrono.setMode(nextMode);
    }
    
    // 2. S.tradingMode pour le reste de l'app
    const S = window._auraGetGlobalS();
    if (S) { S.tradingMode = nextMode; }
    try {
      const setFn = new Function('mode', 'try{S.tradingMode=mode}catch(e){}');
      setFn(nextMode);
    } catch(e) {}
    
    // 3. Mise à jour visuelle bouton
    updateButtonVisual(nextMode);
    
    // 4. ★ NOTIFICATION v118.16 : type natif de showToast pour vraie couleur app ★
    //    ATTENTION : 'info' est MASQUÉ par défaut → utiliser 'ice' pour AA
    //    sim → 'ice' (bleu cyan) · paperReal → 'win' (vert) · real → 'loss' (rouge)
    try {
      const TYPE_MAP = { 'sim': 'ice', 'paperReal': 'win', 'real': 'loss' };
      const msg = 'Activation Mode ' + MODES[nextMode].name;
      const type = TYPE_MAP[nextMode] || 'ice';
      if (typeof window.showToast === 'function') {
        window.showToast(msg, 2500, type);
      }
    } catch(e) {}
    
    // 5. Save app state
    try { if (typeof window.saveState === 'function') window.saveState(false); } catch(e) {}
  };

  function initTradeMode() {
    injectCSS();
    if (!fixNestedButton()) { setTimeout(initTradeMode, 1500); return; }
    const btn = document.getElementById('tradeModeBtn');
    if (!btn) return;
    btn.onclick = window.cycleTradeMode;
    
    const initMode = (window.AuraChrono && window.AuraChrono.getCurrentMode) 
      ? window.AuraChrono.getCurrentMode() : 'sim';
    updateButtonVisual(initMode);
    
    const S = window._auraGetGlobalS();
    if (S && S.tradingMode !== initMode) {
      S.tradingMode = initMode;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initTradeMode, 500));
  } else {
    setTimeout(initTradeMode, 500);
  }
})();
