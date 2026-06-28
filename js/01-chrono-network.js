/* ═══════════════════════════════════════════════════════════
   AURA8 · js/01-chrono-network.js
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ▓                   VERSION  v118.17                      ▓
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

   v118.17 : AUTO-REPRISE EN ARRIÈRE-PLAN
   - La sim mémorise son état (clé localStorage 'aura_sim_running').
   - Au retour d'arrière-plan / reload, elle se relance toute seule.
   - Le bouton ▶ ne réapparaît plus jamais pour bloquer l'utilisateur.
   - Respecte une pause volontaire (ne redémarre que si elle tournait).

   v118.16 : BUG CRITIQUE RÉSOLU
   - Type 'info' est MASQUÉ par défaut dans showToast() de l'app !
   - C'est pour ça que les notifs AA n'apparaissaient pas
   - Nouveau mapping :
     • sim       → 'ice'  (bleu cyan, var(--ice), visible)
     • paperReal → 'win'  (vert)
     • real      → 'loss' (rouge)
   - Appliqué à cycleTradeMode et startSim/stopSim
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
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    // Heures cumulées (pas de format "jours" : 39:53:42 est plus lisible que 1d 15:53,
    // qui obligerait à calculer 1×24+15. Les heures s'accumulent au-delà de 24).
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
      chronoEl.className = 'chrono-display';
      if (state.running) chronoEl.classList.add('running');
      const _mc = state.currentMode === 'real' ? '#ff3d6b' : (state.currentMode === 'paperReal' ? '#00e87a' : '#38d4f5');
      chronoEl.style.color = _mc;
      const _hdr = document.getElementById('statusBar');
      if (_hdr) _hdr.style.borderColor = _mc;
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
   ░░ CONTRÔLE DE SIMULATION · startSim / stopSim / toggleSim ░░
   Pilote le setInterval de simTick (1000ms) et synchronise l'état
   _auraSimState avec le système _simRunning des autres modules.
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
    try { localStorage.setItem('aura_sim_running','1'); } catch(e) {}
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
    try { localStorage.setItem('aura_sim_running','0'); } catch(e) {}
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
   ░░ BOUTON MODE DE TRADING · AA / EV / RE ░░
   Gère l'affichage et le cycle du mode de trading (sim/paperReal/real)
   avec sa couleur. Ne touche jamais botAutoMode (axe utilisateur seul).
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
    const btn = document.getElementById('tradeModeBtn');
    if (!btn) return;
    const cfg = MODES[mode] || MODES['sim'];
    btn.textContent = cfg.label;
    btn.classList.remove('mode-AA', 'mode-EV', 'mode-RE');
    btn.classList.add(cfg.cssClass);
    btn.title = 'Mode: ' + cfg.name + ' (tape pour cycler)';
    // Colorer l'EN-TÊTE selon le mode (bordure + logo + halo via CSS hdr-*)
    const hdr = document.getElementById('statusBar');
    if (hdr) {
      hdr.classList.remove('hdr-sim', 'hdr-paper', 'hdr-real');
      const hdrClass = mode === 'real' ? 'hdr-real' : (mode === 'paperReal' ? 'hdr-paper' : 'hdr-sim');
      hdr.classList.add(hdrClass);
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


/* ═══════════════════════════════════════════════════════════
   ░░ AUTO-REPRISE DE LA SIMULATION · arrière-plan / reload ░░
   AURA mémorise dans localStorage si la sim tournait (clé
   'aura_sim_running'). Au boot ET au retour d'arrière-plan, si elle
   tournait, elle se relance toute seule : le bouton ▶ ne bloque plus
   jamais l'utilisateur, et aucune progression n'est perdue. Une pause
   volontaire est respectée (pas de redémarrage intempestif).
   ═══════════════════════════════════════════════════════════ */
(function _auraSimAutoResume() {
  'use strict';
  function _wantsRun() {
    try { return localStorage.getItem('aura_sim_running') === '1'; } catch (e) { return false; }
  }
  function _isRunning() {
    return !!(window._auraSimState && window._auraSimState.running && window._auraSimState.interval);
  }
  function _hasSimTick() {
    if (typeof window.simTick === 'function') return true;
    try { return !!(new Function('try{return typeof simTick==="function"}catch(e){return false}'))(); }
    catch (e) { return false; }
  }
  function _resume() {
    if (!window._stateReady) return;          // attendre que l'état soit restauré
    if (!_wantsRun() || _isRunning()) return;
    if (typeof window.startSim !== 'function' || !_hasSimTick()) return;
    window.startSim();
  }
  // Boot : attendre la fin de loadState, puis relancer si besoin.
  var _tries = 0;
  var _bootIv = setInterval(function () {
    _tries++;
    if (window._stateReady) {
      _resume();
      if (_isRunning() || !_wantsRun()) { clearInterval(_bootIv); return; }
    }
    if (_tries > 40) clearInterval(_bootIv);  // ~20 s de sécurité
  }, 500);
  // Retour d'arrière-plan / page restaurée.
  window.addEventListener('pageshow', function () { setTimeout(_resume, 300); });
  document.addEventListener('resume', function () { setTimeout(_resume, 300); }, false);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') setTimeout(_resume, 300);
  });
})();
