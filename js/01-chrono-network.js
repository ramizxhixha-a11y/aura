/* ═══════════════════════════════════════════════════════════
   AURA8 · js/01-chrono-network.js
   v118.6 — FIX RENDER + RETRAIT window.simulationPaused

   v118.5 cassait le play/pause à cause de window.simulationPaused.
   v118.6 : retire toutes les références à cette variable.
            L'auto-pause réseau devient purement visuelle (indicateur).
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const K_AUTO_SEC = 'aura_chrono_auto_seconds';
  const K_MANU_SEC = 'aura_chrono_manu_seconds';
  const K_RUNNING  = 'aura_system_running';
  const K_MODE     = 'aura_current_mode';

  const state = {
    chronoSeconds: {
      AUTO: parseInt(localStorage.getItem(K_AUTO_SEC) || '0', 10),
      MANU: parseInt(localStorage.getItem(K_MANU_SEC) || '0', 10),
    },
    mode: localStorage.getItem(K_MODE) || 'AUTO',
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
    }

    const netEl = document.getElementById('netIndicator');
    if (netEl) {
      netEl.className = 'net-indicator ' + state.netStatus;
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
   ░░ PATCH v118.6 · FIX RENDER HOME ░░
   
   Identique à v118.5 (qui fonctionne) — multi-fallback scope
   pour accéder à S et appeler renderAll() au chargement.
   ═══════════════════════════════════════════════════════════ */

(function _auraRenderFixV6() {
  'use strict';

  function _getS() {
    try { if (typeof window !== 'undefined' && window.S) return window.S; } catch(e) {}
    try { if (typeof globalThis !== 'undefined' && globalThis.S) return globalThis.S; } catch(e) {}
    try {
      // eslint-disable-next-line no-eval
      const v = eval('typeof S !== "undefined" ? S : null');
      if (v) return v;
    } catch(e) {}
    return null;
  }

  function _callRenderAll() {
    try {
      if (typeof window !== 'undefined' && typeof window.renderAll === 'function') {
        window.renderAll();
        return true;
      }
    } catch(e) {}
    try {
      // eslint-disable-next-line no-eval
      return eval('typeof renderAll === "function" ? (renderAll(), true) : false');
    } catch(e) {}
    return false;
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
    if (!S) return false;
    
    const cash    = S.cashAccount    || 0;
    const trading = S.tradingAccount || 0;
    const cycle   = S.cycle          || 0;
    
    if (cash < 0.01 && trading < 0.01 && cycle === 0) {
      if (_attempts > 8 && _intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
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
    
    const sig = _fmtUsd(cash) + '|' + _fmtUsd(trading) + '|' + cycle;
    if (sig === _lastSig && directFixed === 0) {
      _stableTicks++;
      if (_stableTicks >= 4 && _intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
    } else {
      _stableTicks = 0;
    }
    _lastSig = sig;
    
    return directFixed > 0;
  }
  
  setTimeout(function() {
    _fix();
    _intervalId = setInterval(_fix, 2000);
  }, 1500);
})();
