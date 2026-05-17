/* ═══════════════════════════════════════════════════════════
   AURA8 v108 · js/01-chrono-network.js
   LIVRAISON 1 — Chrono multi-mode + Détection réseau + Auto-pause
   + PATCH v118.3 : FIX RENDER HOME (renderAll + setter direct IDs)

   COEXISTENCE avec le code existant :
   - Les boutons header ont des onclick natifs (toggleSim, toggleMode, toggleWakeLock, etc.)
     qui appellent les fonctions JS existantes du HTML.
   - Ce module N'ATTACHE PAS de listener sur ces boutons : il ne fait que
     OBSERVER les changements et METTRE À JOUR le chrono + l'indicateur réseau.
   - Le code existant peut appeler window.AuraChrono.* pour synchroniser.
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
   ░░ PATCH v118.3 · FIX RENDER HOME — renderAll() + IDs ░░
   
   DÉCOUVERTE :
   La fonction qui rafraîchit le dashboard est renderAll(),
   pas renderHome(). Trouvée à la ligne 5668 de 02-state-init.js :
     try { renderAll(); } catch(e) {}
   
   APPROCHE :
   1. Appelle renderAll() à plusieurs délais après le chargement
   2. EN PLUS, set directement les IDs des cards (filet de sécurité) :
      - #cashVal / #cashPct (Caisse)
      - #tradVal / #tradPct (Trading)
      - #ownFundsVal / #ownFundsSub (Fonds Propres en EUR)
      - #fiscalResVal (Réserve Fiscale)
      - #levReserveVal (Réserve Levier)
   
   FORMATAGE :
   - USD : fmt$(v) aligné avec fmt$2 de l'app
   - EUR : Math.round(*100)/100 + toLocaleString('fr-FR')
   ═══════════════════════════════════════════════════════════ */

(function _auraRenderFix() {
  'use strict';

  let _attempts = 0;
  let _stableTicks = 0;
  let _intervalId = null;
  let _lastSig = '';

  // Formatage USD aligné avec fmt$2 de l'app
  function _fmtUsd(v) {
    if (Math.abs(v) < 100) return '$' + v.toFixed(2);
    if (Math.abs(v) < 10000) return '$' + v.toFixed(2);
    return '$' + Math.round(v).toLocaleString();
  }

  // Formatage EUR aligné avec fmtEUR de l'app
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
    if (!window.S) return false;
    
    const cash    = window.S.cashAccount    || 0;
    const trading = window.S.tradingAccount || 0;
    const cycle   = window.S.cycle          || 0;
    
    // Si vraiment vide (premier démarrage légitime) → rien à forcer
    if (cash < 0.01 && trading < 0.01 && cycle === 0) {
      _attempts++;
      if (_attempts > 8 && _intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
        console.log('[AURA fix v118.3] Stopped — état vide légitime');
      }
      return false;
    }
    
    _attempts++;
    let didSomething = false;
    
    // 1. Appeler la vraie fonction de render
    if (typeof window.renderAll === 'function') {
      try {
        window.renderAll();
        didSomething = true;
      } catch(e) {
        console.warn('[AURA fix v118.3] renderAll error:', e);
      }
    }
    
    // 2. Setter direct des cards (filet de sécurité)
    const total = cash + trading;
    const cashPct = total > 0 ? Math.round(cash / total * 1000) / 10 : 0;
    const tradingPct = total > 0 ? Math.round(trading / total * 1000) / 10 : 0;
    
    let directFixed = 0;
    if (_setIfChanged('cashVal', _fmtUsd(cash))) directFixed++;
    if (_setIfChanged('cashPct', cashPct + '%')) directFixed++;
    if (_setIfChanged('tradVal', _fmtUsd(trading))) directFixed++;
    if (_setIfChanged('tradPct', tradingPct + '%')) directFixed++;
    
    // 3. Fonds Propres (en EUR)
    const ownFunds = window.S.ownFundsInjected || 0;
    const rate = window.S.usdEurRate || 0.92;
    const ownFundsEUR = ownFunds * rate;
    if (ownFundsEUR > 0.01) {
      if (_setIfChanged('ownFundsVal', _fmtEur(ownFundsEUR))) directFixed++;
      const injCount = (window.S.ownFundsLog || []).length;
      const subText = injCount + ' injection' + (injCount > 1 ? 's' : '');
      if (_setIfChanged('ownFundsSub', subText)) directFixed++;
    }
    
    // 4. Réserve fiscale
    const fiscal = window.S.fiscalReserveAccount || 0;
    if (fiscal > 0.01) {
      if (_setIfChanged('fiscalResVal', _fmtUsd(fiscal))) directFixed++;
      const fiscalCount = (window.S.fiscalReserveLog || []).length;
      if (_setIfChanged('fiscalResSub', fiscalCount + ' dépôts')) directFixed++;
    }
    
    // 5. Réserve levier
    const levRes = window.S.leverageReserve || 0;
    if (levRes > 0.01) {
      if (_setIfChanged('levReserveVal', _fmtUsd(levRes))) directFixed++;
    }
    const levBorrowed = window.S.leverageBorrowed || 0;
    if (levBorrowed > 0.01) {
      _setIfChanged('levBorrowedSub', 'Emprunté: ' + _fmtUsd(levBorrowed));
    }
    
    // Tracker la stabilité
    const sig = _fmtUsd(cash) + '|' + _fmtUsd(trading) + '|' + cycle;
    if (sig === _lastSig && directFixed === 0) {
      _stableTicks++;
      // Si stable depuis 4 ticks ET on a déjà fixé des choses → on peut arrêter
      if (_stableTicks >= 4 && _intervalId && (_attempts > 3 || didSomething)) {
        clearInterval(_intervalId);
        _intervalId = null;
        console.log('[AURA fix v118.3] Display stable — monitoring stopped after ' + _attempts + ' attempts');
      }
    } else {
      _stableTicks = 0;
    }
    _lastSig = sig;
    
    if (didSomething || directFixed > 0) {
      console.log('[AURA fix v118.3] #' + _attempts + 
                  ' · renderAll=' + (typeof window.renderAll === 'function') + 
                  ' · directFixed=' + directFixed + 
                  ' · cash=' + _fmtUsd(cash) + ' trading=' + _fmtUsd(trading));
    }
    
    return didSomething || directFixed > 0;
  }
  
  // Démarrer le scan : 1.5s puis toutes les 2s
  setTimeout(function() {
    _fix();
    _intervalId = setInterval(_fix, 2000);
  }, 1500);

  // Expose globalement pour debug manuel
  window._auraFixRender = _fix;
  
  console.log('[AURA fix v118.3] Patch loaded — scan starts in 1.5s');
})();
