/* ═══════════════════════════════════════════════════════════
   AURA8 v108 · js/01-chrono-network.js
   + PATCH v118.5 : FIX RENDER HOME (multi-fallback scope)

   Chrono multi-mode + Détection réseau + Auto-pause
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const K_AUTO_SEC = 'aura_chrono_auto_seconds';
  const K_MANU_SEC = 'aura_chrono_manu_seconds';
  const K_RUNNING  = 'aura_system_running';
  const K_MODE     = 'aura_current_mode';
  const K_NET_PAUSE = 'aura_paused_by_network';
  const K_QUIT_OFF  = 'aura_quit_while_offline';

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
        if (typeof window.simulationPaused !== 'undefined') {
          window.simulationPaused = true;
        }
      }
    } else if (prev === 'offline' && state.pausedByNetwork && !quitOffline) {
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

  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  function syncRunningFromUI() {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ═══════════════════════════════════════════════════════════
   ░░ PATCH v118.5 · FIX RENDER HOME (multi-fallback) ░░
   
   v118.3 a échoué : window.S undefined
   v118.4 a échoué : new Function crée scope global, voit pas S
   
   v118.5 : essaie 4 approches en cascade pour trouver S et renderAll
            1. window.S (au cas où exposé)
            2. globalThis.S
            3. eval('S') dans le scope local de l'IIFE (voit script scope)
            4. document title indicator (ultime debug visible utilisateur)
   ═══════════════════════════════════════════════════════════ */

(function _auraRenderFixV5() {
  'use strict';

  // ─── Approche multi-fallback pour trouver S ─────────────
  function _getS() {
    // 1. window.S
    try { if (typeof window !== 'undefined' && window.S) return window.S; } catch(e) {}
    // 2. globalThis.S
    try { if (typeof globalThis !== 'undefined' && globalThis.S) return globalThis.S; } catch(e) {}
    // 3. eval dans le scope local (voit le script scope englobant)
    try {
      // eslint-disable-next-line no-eval
      const v = eval('typeof S !== "undefined" ? S : null');
      if (v) return v;
    } catch(e) {}
    return null;
  }

  function _callRenderAll() {
    // 1. window.renderAll
    try {
      if (typeof window !== 'undefined' && typeof window.renderAll === 'function') {
        window.renderAll();
        return true;
      }
    } catch(e) {}
    // 2. eval dans le scope local
    try {
      // eslint-disable-next-line no-eval
      return eval('typeof renderAll === "function" ? (renderAll(), true) : false');
    } catch(e) {}
    return false;
  }

  // ─── Indicateur visuel debug (titre de la page) ─────────
  // Permet à l'utilisateur de voir si le patch tourne SANS DevTools
  let _origTitle = '';
  function _showDebugInTitle(text) {
    try {
      if (!_origTitle) _origTitle = document.title;
      document.title = '[AURA fix] ' + text + ' · ' + _origTitle;
    } catch(e) {}
  }

  let _attempts = 0;
  let _stableTicks = 0;
  let _intervalId = null;
  let _lastSig = '';

  function _fmtUsd(v) {
    if (Math.abs(v) < 100)   return '$' + v.toFixed(2);
    if (Math.abs(v) < 10000) return '$' + v.toFixed(2);
    return '$' + Math.round(v).toLocaleString();
  }

  function _fmtEur(v) {
    return (Math.round((v || 0) * 100) / 100).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €';
  }

  function _setIfChanged(id, value) {
    const el = document.getElementById(id);
    if (!el) return false;
    if (el.textContent !== value) {
      el.textContent = value;
      return true;
    }
    return false;
  }

  function _fix() {
    _attempts++;
    
    const S = _getS();
    if (!S) {
      if (_attempts <= 3) {
        _showDebugInTitle('S not found · #' + _attempts);
      } else if (_attempts === 4) {
        _showDebugInTitle('❌ S inaccessible');
      }
      return false;
    }
    
    const cash    = S.cashAccount    || 0;
    const trading = S.tradingAccount || 0;
    const cycle   = S.cycle          || 0;
    
    if (cash < 0.01 && trading < 0.01 && cycle === 0) {
      if (_attempts > 8 && _intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
        _showDebugInTitle('⚠ État vide');
      }
      return false;
    }
    
    // S trouvée et a des valeurs → tentons le fix
    const renderAllCalled = _callRenderAll();
    
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
      const subText = injCount + ' injection' + (injCount > 1 ? 's' : '');
      if (_setIfChanged('ownFundsSub', subText)) directFixed++;
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
    
    // Indicateur visuel dans le titre
    if (directFixed > 0 || renderAllCalled) {
      _showDebugInTitle('✅ ' + directFixed + ' fixed · cash=' + _fmtUsd(cash));
    } else {
      _showDebugInTitle('🔄 S OK · pas de fix nécessaire');
    }
    
    // Tracker la stabilité
    const sig = _fmtUsd(cash) + '|' + _fmtUsd(trading) + '|' + cycle;
    if (sig === _lastSig && directFixed === 0) {
      _stableTicks++;
      if (_stableTicks >= 4 && _intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
        // Restaurer le titre original
        try { if (_origTitle) document.title = _origTitle; } catch(e) {}
      }
    } else {
      _stableTicks = 0;
    }
    _lastSig = sig;
    
    return directFixed > 0 || renderAllCalled;
  }
  
  // Démarrer le scan : 1.5s puis toutes les 2s
  setTimeout(function() {
    _fix();
    _intervalId = setInterval(_fix, 2000);
  }, 1500);

  // Exposer pour debug
  try { window._auraFixRender = _fix; } catch(e) {}
})();
