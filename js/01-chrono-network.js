/* ═══════════════════════════════════════════════════════════
   AURA8 v119 · js/01-chrono-network.js

   FIX 1 : Détection des 🩺 par CONTENU (pas par ID)
           → supprime tous les 🩺 sauf le premier
   FIX 2 : simToggleBtn JAMAIS modifié sauf pause réseau
   FIX 3 : Bouton AA/EV/RE — listener fiable, 1 tap = mode suivant
   FIX 4 : Bouton AUTO/MANU — AUCUN style inline appliqué
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const K_SIM_SEC   = 'aura_chrono_sim_seconds';
  const K_PAPER_SEC = 'aura_chrono_paper_seconds';
  const K_REAL_SEC  = 'aura_chrono_real_seconds';
  const K_NET_PAUSE = 'aura_paused_by_network';
  const K_QUIT_OFF  = 'aura_quit_while_offline';

  const MODE_CFG = {
    sim:       { color:'#38d4f5', label:'AUTO-APPR',  full:'Auto-apprentissage', abbr:'AA', cls:'mode-sim',   border:'rgba(56,212,245,.15)' },
    paperReal: { color:'#00e87a', label:'ÉVALUATION', full:'Évaluation',         abbr:'EV', cls:'mode-paper', border:'rgba(0,232,122,.18)'  },
    real:      { color:'#ff3d6b', label:'RÉEL',       full:'Réel',               abbr:'RE', cls:'mode-real',  border:'rgba(255,61,107,.30)' },
  };
  const MODE_ORDER = ['sim', 'paperReal', 'real'];

  const _st = {
    chrono: {
      sim:       parseInt(localStorage.getItem(K_SIM_SEC)   || '0', 10),
      paperReal: parseInt(localStorage.getItem(K_PAPER_SEC) || '0', 10),
      real:      parseInt(localStorage.getItem(K_REAL_SEC)  || '0', 10),
    },
    running:         false,
    pausedByNetwork: false,
    netStatus:       'online',
  };

  function currentMode() {
    const m = (typeof window.S !== 'undefined') ? window.S.tradingMode : null;
    return (m && MODE_CFG[m]) ? m : 'sim';
  }

  const quitOffline = localStorage.getItem(K_QUIT_OFF) === 'true';

  function fmtChrono(s) {
    s = Math.max(0, Math.floor(s));
    const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60), sec = s%60;
    const pad = n => String(n).padStart(2,'0');
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

  let _tickCount = 0;
  function save() {
    localStorage.setItem(K_SIM_SEC,   _st.chrono.sim);
    localStorage.setItem(K_PAPER_SEC, _st.chrono.paperReal);
    localStorage.setItem(K_REAL_SEC,  _st.chrono.real);
  }

  function countOpenTrades() {
    if (typeof window.S === 'undefined') return 0;
    let count = 0;
    try {
      if (window.S.pairStates) {
        for (const pair in window.S.pairStates) {
          const ps = window.S.pairStates[pair];
          if (ps && ps.position && ps.position.isOpen) count++;
        }
      }
    } catch(e) {}
    return count;
  }

  function setTradingMode(newMode) {
    if (!MODE_CFG[newMode]) return;
    if (typeof window.S === 'undefined') return;
    const oldMode = window.S.tradingMode;
    if (oldMode === newMode) return;
    if (newMode === 'real') {
      const ok = confirm('🔴 PASSAGE EN MODE RÉEL\n\nCe mode utilise de vraies données Binance.\nConfirmer le changement ?');
      if (!ok) return;
    }
    window.S.tradingMode = newMode;
    try {
      if (typeof window.buildSnapshot === 'function') {
        const snap = window.buildSnapshot();
        localStorage.setItem('nexus_state', JSON.stringify(snap));
      }
    } catch(e) {}
    try {
      if (typeof window.showToast === 'function') {
        window.showToast('Mode → ' + MODE_CFG[newMode].full, 2500, newMode === 'real' ? 'warn' : 'win');
      }
    } catch(e) {}
    render();
  }
  window.auraSetTradingMode = setTradingMode;

  // ─── FIX 1 : Nettoyer doublons par CONTENU et par ID ────
  function cleanDuplicates() {
    const headerBtns = document.querySelector('.header-buttons');
    if (!headerBtns) return;

    // Trouver TOUS les boutons contenant 🩺 (peu importe l'ID)
    const allButtons = headerBtns.querySelectorAll('button');
    const stethoscopeBtns = [];
    allButtons.forEach(b => {
      if (b.textContent && b.textContent.trim() === '🩺') {
        stethoscopeBtns.push(b);
      }
    });
    // Garder le premier, supprimer les autres
    for (let i = 1; i < stethoscopeBtns.length; i++) {
      stethoscopeBtns[i].remove();
    }
    // S'assurer que le premier a bien l'ID #healthBtn
    if (stethoscopeBtns[0] && !stethoscopeBtns[0].id) {
      stethoscopeBtns[0].id = 'healthBtn';
      stethoscopeBtns[0].className = 'btn-icon btn-health';
    }

    // Doublons d'IDs (au cas où)
    ['modeBadgeEl', 'tradesCountBtn', 'auraModeBtn'].forEach(id => {
      const els = document.querySelectorAll('#' + id);
      for (let i = 1; i < els.length; i++) els[i].remove();
    });
  }

  function ensureButtons() {
    cleanDuplicates();
    const headerBtns = document.querySelector('.header-buttons');
    if (!headerBtns) return;
    const settingsBtn = document.getElementById('settingsBtn');

    // 1. Bouton santé 🩺 — ne créer que si AUCUN 🩺 n'existe
    const existingHealth = Array.from(headerBtns.querySelectorAll('button')).find(
      b => b.textContent && b.textContent.trim() === '🩺'
    );
    if (!existingHealth) {
      // Renommer l'ancien diagnostic ✓ s'il existe
      const oldDiag = headerBtns.querySelector('.btn-diag');
      if (oldDiag && oldDiag.textContent.trim() === '✓') {
        oldDiag.id = 'healthBtn';
        oldDiag.className = 'btn-icon btn-health';
        oldDiag.textContent = '🩺';
        oldDiag.title = 'Diagnostic santé';
      } else {
        // Créer un nouveau seulement si rien
        const b = document.createElement('button');
        b.id = 'healthBtn';
        b.className = 'btn-icon btn-health';
        b.textContent = '🩺';
        b.title = 'Diagnostic santé';
        const regBtn = headerBtns.querySelector('.btn-regime');
        if (regBtn && regBtn.nextSibling) headerBtns.insertBefore(b, regBtn.nextSibling);
        else headerBtns.appendChild(b);
      }
    }

    // 2. Bouton trades
    if (!document.getElementById('tradesCountBtn')) {
      const b = document.createElement('button');
      b.id = 'tradesCountBtn';
      b.className = 'btn-icon btn-trades';
      b.textContent = '0';
      b.title = 'Trades en cours';
      b.onclick = function() {
        try { if (typeof window.switchPage === 'function') window.switchPage('positions'); } catch(e) {}
      };
      const healthBtn = document.getElementById('healthBtn');
      if (healthBtn && healthBtn.nextSibling) headerBtns.insertBefore(b, healthBtn.nextSibling);
      else headerBtns.appendChild(b);
    }

    // 3. FIX 3 : Bouton AA/EV/RE — onclick au lieu d'addEventListener
    if (!document.getElementById('auraModeBtn')) {
      const b = document.createElement('button');
      b.id = 'auraModeBtn';
      b.className = 'btn-mode-trading';
      b.title = 'Changer le mode trading';
      b.onclick = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const cur = currentMode();
        const idx = MODE_ORDER.indexOf(cur);
        const next = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
        setTradingMode(next);
      };
      if (settingsBtn) headerBtns.insertBefore(b, settingsBtn);
      else headerBtns.appendChild(b);
    }

    // 4. Badge mode
    if (!document.getElementById('modeBadgeEl')) {
      const headerRight = document.querySelector('.header-right');
      const chronoEl = document.getElementById('chronoEl');
      if (headerRight && chronoEl) {
        const badge = document.createElement('div');
        badge.id = 'modeBadgeEl';
        badge.className = 'mode-badge mode-sim';
        badge.textContent = 'AUTO-APPR';
        if (chronoEl.nextSibling) headerRight.insertBefore(badge, chronoEl.nextSibling);
        else headerRight.appendChild(badge);
      }
    }
  }

  function evalNet() {
    if (!navigator.onLine) return 'offline';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.effectiveType) {
      const t = conn.effectiveType;
      if (t === '3g' || t === '2g' || t === 'slow-2g') return 'unstable';
    }
    return 'online';
  }

  function onNetChange() {
    const prev = _st.netStatus;
    _st.netStatus = evalNet();
    if (_st.netStatus === 'offline') {
      if (_st.running) {
        _st.pausedByNetwork = true;
        _st.running = false;
        localStorage.setItem(K_NET_PAUSE, 'true');
        save();
        if (typeof window.simulationPaused !== 'undefined') window.simulationPaused = true;
      }
    } else if (prev === 'offline' && _st.pausedByNetwork && !quitOffline) {
      _st.pausedByNetwork = false;
      _st.running = true;
      localStorage.setItem(K_NET_PAUSE, 'false');
      save();
      if (typeof window.simulationPaused !== 'undefined') window.simulationPaused = false;
    }
    render();
  }

  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  // FIX 2 : Lecture seule du bouton play
  function syncRunning() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    const isRun = btn.textContent.trim() === '⏸';
    if (_st.running !== isRun && !_st.pausedByNetwork) {
      _st.running = isRun;
      save();
    }
  }

  function tick() {
    syncRunning();
    const mode = currentMode();
    if (_st.running && _st.netStatus !== 'offline') {
      _st.chrono[mode]++;
      _tickCount++;
      if (_tickCount % 10 === 0) save();
    }
    render();
  }

  function render() {
    ensureButtons();
    const mode = currentMode();
    const cfg  = MODE_CFG[mode];

    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = fmtChrono(_st.chrono[mode]);
      chronoEl.className = 'chrono-display';
      if (_st.pausedByNetwork) chronoEl.classList.add('paused-auto');
      else {
        chronoEl.classList.add(cfg.cls);
        if (_st.running) chronoEl.classList.add('running');
      }
    }

    const badge = document.getElementById('modeBadgeEl');
    if (badge) {
      badge.textContent = cfg.label;
      badge.className = 'mode-badge ' + cfg.cls;
    }

    // FIX 4 : NE TOUCHER À RIEN sur le bouton AUTO/MANU
    // (pas de style inline, le CSS d'origine gère tout)

    const tradesBtn = document.getElementById('tradesCountBtn');
    if (tradesBtn) {
      tradesBtn.textContent = String(countOpenTrades());
      tradesBtn.className = 'btn-icon btn-trades ' + cfg.cls;
    }

    const modeBtn = document.getElementById('auraModeBtn');
    if (modeBtn) {
      modeBtn.textContent = cfg.abbr;
      modeBtn.style.borderColor = cfg.color;
      modeBtn.style.color       = cfg.color;
      modeBtn.style.background  = cfg.color + '1a';
    }

    const netEl = document.getElementById('netIndicator');
    if (netEl) netEl.className = 'net-indicator ' + _st.netStatus;

    // FIX 2 : Play/pause SEULEMENT en pause réseau
    const simBtn = document.getElementById('simToggleBtn');
    if (simBtn && _st.pausedByNetwork) {
      simBtn.className = 'btn-icon btn-play-pause network-lost';
      simBtn.textContent = '▶';
    }

    const bar = document.getElementById('statusBar');
    if (bar) bar.style.borderBottomColor = cfg.border;
  }

  window.AuraChrono = {
    fmtChrono,
    refresh: function() { render(); },
    resetChrono: function(m) {
      const mm = m || currentMode();
      if (_st.chrono[mm] !== undefined) { _st.chrono[mm] = 0; save(); render(); }
    },
    getChrono: function(m) { return _st.chrono[m || currentMode()]; },
    getAllChronos: function() { return { ..._st.chrono }; },
  };

  function init() {
    window.addEventListener('online',  onNetChange);
    window.addEventListener('offline', onNetChange);
    if (navigator.connection) navigator.connection.addEventListener('change', onNetChange);
    window.addEventListener('beforeunload', () => {
      localStorage.setItem(K_QUIT_OFF, !navigator.onLine ? 'true' : 'false');
      save();
    });
    cleanDuplicates();
    onNetChange();
    setInterval(tick, 1000);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
