/* ═══════════════════════════════════════════════════════════
   AURA8 · js/01-chrono-network.js
   v118.7 — FIX RENDER + FIX startSim() MANQUANTE

   Découverte v118.7 :
   La fonction startSim() avait disparu du code source !
   toggleSim() l'appelle (ligne 14830 de 09-bloc-restauration-v93.js)
   mais aucune définition existait, d'où le play qui ne fonctionnait pas.
   
   Patch : on définit window.startSim et window.stopSim qui appellent
   simTick() (trouvée dans 08-learning-history-render.js ligne 2548)
   via setInterval(1000ms).
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
      minimumFractionDigits: 2, maximumFractionDigits: 2
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

/* ═══════════════════════════════════════════════════════════
   ░░ PATCH v118.7 · FIX startSim() MANQUANTE ░░
   
   CAUSE :
   La fonction startSim() avait disparu du code source.
   - toggleSim() (09-bloc-restauration-v93.js ligne 14829) appelle startSim()
   - Mais aucune définition existait → ReferenceError silencieux → rien ne démarre
   - simTick() (la vraie fonction tick) existe dans 08-learning-history-render.js ligne 2548
   
   PATCH :
   - On définit window.startSim() qui lance setInterval(simTick, 1000)
   - window.stopSim() qui clearInterval et reset l'état
   - L'état est stocké dans window._auraSimState pour éviter conflits
   - Le tick s'exécute toutes les 1000ms (1 seconde par tick)
   ═══════════════════════════════════════════════════════════ */

(function _auraStartSimFix() {
  'use strict';

  // État partagé via window (notre propre namespace)
  window._auraSimState = window._auraSimState || {
    interval: null,
    running: false
  };

  // Helper : récupérer simTick (la vraie fonction tick du bot)
  function _getSimTick() {
    if (typeof window.simTick === 'function') return window.simTick;
    try {
      // eslint-disable-next-line no-eval
      const fn = eval('typeof simTick === "function" ? simTick : null');
      if (fn) return fn;
    } catch(e) {}
    return null;
  }

  function _getS() {
    try { if (window.S) return window.S; } catch(e) {}
    try {
      // eslint-disable-next-line no-eval
      return eval('typeof S !== "undefined" ? S : null');
    } catch(e) {}
    return null;
  }

  // Helper : update visual du bouton play/pause
  function _updateBtn(running) {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    btn.textContent = running ? '⏸' : '▶';
    btn.classList.toggle('idle', !running);
    btn.classList.toggle('running', running);
  }

  // Mini toast simple (au cas où showToast n'est pas dispo)
  function _toast(msg) {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, 2500, 'win');
      } else {
        console.log('[AURA]', msg);
      }
    } catch(e) {}
  }

  // ─── startSim() ────────────────────────────────────────────
  window.startSim = function startSim() {
    // Déjà running → no-op
    if (window._auraSimState.running && window._auraSimState.interval) {
      return;
    }
    
    const simTick = _getSimTick();
    if (!simTick) {
      console.warn('[AURA startSim] simTick introuvable — bot non démarré');
      _toast('⚠ simTick introuvable');
      return;
    }
    
    // Lance le tick principal (1 tick par seconde, comme cycleMax=30 → 30s par cycle)
    window._auraSimState.interval = setInterval(function() {
      try {
        simTick();
      } catch(e) {
        console.warn('[AURA simTick] erreur:', e);
      }
    }, 1000);
    window._auraSimState.running = true;
    
    // Sync avec l'état interne du fichier 09 (best-effort via eval)
    try {
      // eslint-disable-next-line no-eval
      eval('try{_simRunning=true;_simEverStarted=true;_simInterval=window._auraSimState.interval}catch(e){}');
    } catch(e) {}
    
    _updateBtn(true);
    
    // Log dans la chainLog
    try {
      const S = _getS();
      if (S && S.chainLog) {
        S.chainLog.push({
          icon: '▶',
          desc: 'Auto-apprentissage démarré · cycle #' + (S.cycle || 0),
          hash: Math.random().toString(36).slice(2, 8),
          time: new Date().toLocaleTimeString()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    } catch(e) {}
    
    _toast('▶ Auto-apprentissage démarré');
    console.log('[AURA startSim v118.7] Bot démarré · tick toutes les 1000ms');
  };

  // ─── stopSim() ─────────────────────────────────────────────
  window.stopSim = function stopSim() {
    if (!window._auraSimState.running) return;
    
    if (window._auraSimState.interval) {
      clearInterval(window._auraSimState.interval);
      window._auraSimState.interval = null;
    }
    window._auraSimState.running = false;
    
    // Sync avec l'état interne du fichier 09
    try {
      // eslint-disable-next-line no-eval
      eval('try{_simRunning=false;_simInterval=null}catch(e){}');
    } catch(e) {}
    
    _updateBtn(false);
    
    // Log
    try {
      const S = _getS();
      if (S && S.chainLog) {
        S.chainLog.push({
          icon: '⏸',
          desc: 'Auto-apprentissage en pause · cycle #' + (S.cycle || 0),
          hash: Math.random().toString(36).slice(2, 8),
          time: new Date().toLocaleTimeString()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    } catch(e) {}
    
    _toast('⏸ Auto-apprentissage en pause');
    console.log('[AURA stopSim v118.7] Bot arrêté');
  };

  // ─── toggleSim() ──────────────────────────────────────────
  // On le remplace aussi pour être sûr que l'état est cohérent
  window.toggleSim = function toggleSim() {
    if (window._auraSimState.running) {
      window.stopSim();
    } else {
      window.startSim();
    }
  };

  console.log('[AURA v118.7] startSim/stopSim/toggleSim installées sur window');
})();
