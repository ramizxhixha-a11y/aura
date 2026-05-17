/* ═══════════════════════════════════════════════════════════
   AURA8 · js/01-chrono-network.js
   v118.8 — FIX RENDER + FIX startSim + MAQUETTE v119 PHASE 1
   
   v118.8 ajouts :
   - Patch HTML : sort tradeModeBtn du bouton imbriqué (cassé)
   - cycleTradeMode() : cycle AA → EV → RE → AA
   - Mise à jour de S.tradingMode (sim/paperReal/real)
   - Injection CSS pour les 3 couleurs (bleu/vert/rouge)
   - Restauration du mode au chargement depuis S.tradingMode
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
  function _getS() {
    try { if (typeof window !== 'undefined' && window.S) return window.S; } catch(e) {}
    try { if (typeof globalThis !== 'undefined' && globalThis.S) return globalThis.S; } catch(e) {}
    try { const v = eval('typeof S !== "undefined" ? S : null'); if (v) return v; } catch(e) {}
    return null;
  }
  function _callRenderAll() {
    try {
      if (typeof window !== 'undefined' && typeof window.renderAll === 'function') {
        window.renderAll(); return true;
      }
    } catch(e) {}
    try { return eval('typeof renderAll === "function" ? (renderAll(), true) : false'); } catch(e) {}
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
    const S = _getS();
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
  setTimeout(function() {
    _fix();
    _intervalId = setInterval(_fix, 2000);
  }, 1500);
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
      const fn = eval('typeof simTick === "function" ? simTick : null');
      if (fn) return fn;
    } catch(e) {}
    return null;
  }
  function _getS() {
    try { if (window.S) return window.S; } catch(e) {}
    try { return eval('typeof S !== "undefined" ? S : null'); } catch(e) {}
    return null;
  }
  function _updateBtn(running) {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    btn.textContent = running ? '⏸' : '▶';
    btn.classList.toggle('idle', !running);
    btn.classList.toggle('running', running);
  }
  function _toast(msg) {
    try {
      if (typeof window.showToast === 'function') window.showToast(msg, 2500, 'win');
      else console.log('[AURA]', msg);
    } catch(e) {}
  }
  window.startSim = function startSim() {
    if (window._auraSimState.running && window._auraSimState.interval) return;
    const simTick = _getSimTick();
    if (!simTick) { console.warn('[AURA startSim] simTick introuvable'); _toast('⚠ simTick introuvable'); return; }
    window._auraSimState.interval = setInterval(function() {
      try { simTick(); } catch(e) { console.warn('[AURA simTick]', e); }
    }, 1000);
    window._auraSimState.running = true;
    try { eval('try{_simRunning=true;_simEverStarted=true;_simInterval=window._auraSimState.interval}catch(e){}'); } catch(e) {}
    _updateBtn(true);
    try {
      const S = _getS();
      if (S && S.chainLog) {
        S.chainLog.push({ icon:'▶', desc:'Auto-apprentissage démarré · cycle #' + (S.cycle || 0), 
          hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    } catch(e) {}
    _toast('▶ Auto-apprentissage démarré');
  };
  window.stopSim = function stopSim() {
    if (!window._auraSimState.running) return;
    if (window._auraSimState.interval) { clearInterval(window._auraSimState.interval); window._auraSimState.interval = null; }
    window._auraSimState.running = false;
    try { eval('try{_simRunning=false;_simInterval=null}catch(e){}'); } catch(e) {}
    _updateBtn(false);
    try {
      const S = _getS();
      if (S && S.chainLog) {
        S.chainLog.push({ icon:'⏸', desc:'Auto-apprentissage en pause · cycle #' + (S.cycle || 0),
          hash:Math.random().toString(36).slice(2,8), time:new Date().toLocaleTimeString() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    } catch(e) {}
    _toast('⏸ Auto-apprentissage en pause');
  };
  window.toggleSim = function toggleSim() {
    if (window._auraSimState.running) window.stopSim();
    else window.startSim();
  };
})();

/* ═══════════════════════════════════════════════════════════
   ░░ PATCH v118.8 · MAQUETTE v119 PHASE 1 · BOUTON AA/EV/RE ░░
   
   FIX :
   - Le bouton tradeModeBtn est imbriqué dans modeToggleBtn (HTML invalide)
   - À l'exécution, on le sort du parent et le remet juste avant
   - On lui attache cycleTradeMode() pour cycler AA → EV → RE
   - On injecte le CSS pour les 3 couleurs (bleu/vert/rouge)
   - On restaure l'état visuel selon S.tradingMode au démarrage
   
   VALEURS INTERNES PRÉSERVÉES :
   - 'sim'       ↔ label "AA" (Auto-apprentissage) · couleur bleu cyan
   - 'paperReal' ↔ label "EV" (Évaluation)         · couleur vert
   - 'real'      ↔ label "RE" (Réel)               · couleur rouge
   ═══════════════════════════════════════════════════════════ */
(function _auraTradeModeFix() {
  'use strict';

  // ─── Configuration des modes ─────────────────────────────
  const MODES = {
    'sim':       { label: 'AA', cssClass: 'mode-AA', color: '#38d4f5', name: 'Auto-apprentissage' },
    'paperReal': { label: 'EV', cssClass: 'mode-EV', color: '#00e87a', name: 'Évaluation' },
    'real':      { label: 'RE', cssClass: 'mode-RE', color: '#ff3d6b', name: 'Réel' }
  };
  const CYCLE_ORDER = ['sim', 'paperReal', 'real'];

  // ─── Injection CSS ───────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('aura-trademode-css')) return;
    const css = `
      /* v118.8 · Bouton AA/EV/RE - 3 modes trading */
      .btn-trade-mode {
        padding: 4px 9px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.5px;
        border: 1.5px solid;
        cursor: pointer;
        background: transparent;
        font-family: var(--font-mono, 'SF Mono', monospace);
        transition: all 0.25s ease;
        line-height: 1;
        user-select: none;
        margin-right: 4px;
      }
      .btn-trade-mode:active { transform: scale(0.94); }
      
      .btn-trade-mode.mode-AA {
        color: #38d4f5;
        border-color: rgba(56, 212, 245, 0.55);
        background: rgba(56, 212, 245, 0.08);
        box-shadow: 0 0 0 1px rgba(56, 212, 245, 0.15);
      }
      .btn-trade-mode.mode-AA:hover {
        background: rgba(56, 212, 245, 0.15);
        box-shadow: 0 0 12px rgba(56, 212, 245, 0.3);
      }
      
      .btn-trade-mode.mode-EV {
        color: #00e87a;
        border-color: rgba(0, 232, 122, 0.55);
        background: rgba(0, 232, 122, 0.08);
        box-shadow: 0 0 0 1px rgba(0, 232, 122, 0.15);
      }
      .btn-trade-mode.mode-EV:hover {
        background: rgba(0, 232, 122, 0.15);
        box-shadow: 0 0 12px rgba(0, 232, 122, 0.3);
      }
      
      .btn-trade-mode.mode-RE {
        color: #ff3d6b;
        border-color: rgba(255, 61, 107, 0.6);
        background: rgba(255, 61, 107, 0.10);
        box-shadow: 0 0 0 1px rgba(255, 61, 107, 0.2);
      }
      .btn-trade-mode.mode-RE:hover {
        background: rgba(255, 61, 107, 0.18);
        box-shadow: 0 0 14px rgba(255, 61, 107, 0.4);
      }
    `;
    const style = document.createElement('style');
    style.id = 'aura-trademode-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── Réparation HTML : sortir le bouton imbriqué ─────────
  function fixNestedButton() {
    const inner = document.getElementById('tradeModeBtn');
    if (!inner) return false;
    
    const parent = inner.parentElement;
    if (!parent || parent.id !== 'modeToggleBtn') {
      // Déjà sorti, OK
      return true;
    }
    
    // Sortir le bouton et le placer juste avant modeToggleBtn
    const grandParent = parent.parentElement;
    if (!grandParent) return false;
    
    grandParent.insertBefore(inner, parent);
    return true;
  }

  // ─── Helper : récupérer S ────────────────────────────────
  function _getS() {
    try { if (window.S) return window.S; } catch(e) {}
    try { return eval('typeof S !== "undefined" ? S : null'); } catch(e) {}
    return null;
  }

  // ─── Mise à jour visuelle du bouton selon le mode ────────
  function updateButtonVisual(mode) {
    const btn = document.getElementById('tradeModeBtn');
    if (!btn) return;
    const cfg = MODES[mode] || MODES['sim'];
    
    btn.textContent = cfg.label;
    btn.classList.remove('mode-AA', 'mode-EV', 'mode-RE');
    btn.classList.add(cfg.cssClass);
    btn.title = 'Mode: ' + cfg.name + ' (tape pour cycler)';
  }

  // ─── cycleTradeMode : la fonction principale ─────────────
  window.cycleTradeMode = function cycleTradeMode() {
    const S = _getS();
    if (!S) {
      console.warn('[AURA cycleTradeMode] S introuvable');
      return;
    }
    
    const currentMode = S.tradingMode || 'sim';
    const currentIdx = CYCLE_ORDER.indexOf(currentMode);
    const nextIdx = (currentIdx + 1) % CYCLE_ORDER.length;
    const nextMode = CYCLE_ORDER[nextIdx];
    
    // Update S.tradingMode (la vraie variable interne)
    S.tradingMode = nextMode;
    try { eval('try{S.tradingMode="' + nextMode + '"}catch(e){}'); } catch(e) {}
    
    // Update visuel
    updateButtonVisual(nextMode);
    
    // Toast
    try {
      if (typeof window.showToast === 'function') {
        window.showToast('Mode: ' + MODES[nextMode].name + ' (' + MODES[nextMode].label + ')', 2500);
      }
    } catch(e) {}
    
    // Save state
    try {
      if (typeof window.saveState === 'function') window.saveState(false);
    } catch(e) {}
    
    console.log('[AURA tradeMode] ' + currentMode + ' → ' + nextMode);
  };

  // ─── Init : appliquer le fix et restaurer l'état ─────────
  function initTradeMode() {
    injectCSS();
    
    if (!fixNestedButton()) {
      // Pas trouvé, on réessaye plus tard
      setTimeout(initTradeMode, 1500);
      return;
    }
    
    const btn = document.getElementById('tradeModeBtn');
    if (!btn) return;
    
    // Attacher onclick (au cas où il n'en a pas)
    btn.onclick = window.cycleTradeMode;
    
    // Restaurer l'état visuel depuis S.tradingMode
    const S = _getS();
    if (S) {
      const mode = S.tradingMode || 'sim';
      updateButtonVisual(mode);
    } else {
      // S pas encore chargé, retenter
      setTimeout(() => {
        const S2 = _getS();
        if (S2) updateButtonVisual(S2.tradingMode || 'sim');
      }, 2000);
    }
    
    console.log('[AURA v118.8] Bouton AA/EV/RE installé · ' + 
                'mode actuel: ' + ((S && S.tradingMode) || 'sim'));
  }

  // Lancer après le chargement complet
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initTradeMode, 500));
  } else {
    setTimeout(initTradeMode, 500);
  }
})();
