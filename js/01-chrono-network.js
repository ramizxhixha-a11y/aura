/* ═══════════════════════════════════════════════════════════
   AURA8 v119 · js/01-chrono-network.js
   - Chrono 3 compteurs séparés par mode trading
   - Couleurs par mode sur chrono, badge, bouton AUTO, bordure header
   - Nouveau bouton 🩺 santé (remplace ✓ diagnostic)
   - Nouveau bouton "trades en cours" (juste le chiffre)
   - Nouveau bouton AA/EV/RE pour changer de mode
   - Bouton play/pause INCHANGÉ (sauf pause réseau)

   Couleurs définitives :
     sim       → Auto-apprentissage  🔵 Cyan  #38d4f5
     paperReal → Évaluation          🟢 Vert  #00e87a
     real      → Réel                🔴 Rouge #ff3d6b
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Clés localStorage ──────────────────────────────
  const K_SIM_SEC   = 'aura_chrono_sim_seconds';
  const K_PAPER_SEC = 'aura_chrono_paper_seconds';
  const K_REAL_SEC  = 'aura_chrono_real_seconds';
  const K_NET_PAUSE = 'aura_paused_by_network';
  const K_QUIT_OFF  = 'aura_quit_while_offline';

  // ─── Config couleurs/labels par mode ────────────────
  const MODE_CFG = {
    sim:       { color:'#38d4f5', label:'AUTO-APPR',  full:'Auto-apprentissage', abbr:'AA', cls:'mode-sim',   border:'rgba(56,212,245,.15)' },
    paperReal: { color:'#00e87a', label:'ÉVALUATION', full:'Évaluation',         abbr:'EV', cls:'mode-paper', border:'rgba(0,232,122,.18)'  },
    real:      { color:'#ff3d6b', label:'RÉEL',       full:'Réel',               abbr:'RE', cls:'mode-real',  border:'rgba(255,61,107,.30)' },
  };
  const MODE_ORDER = ['sim', 'paperReal', 'real'];

  // ─── État interne ───────────────────────────────────
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

  // ─── Formatage chrono ───────────────────────────────
  function fmtChrono(s) {
    s = Math.max(0, Math.floor(s));
    const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60), sec = s%60;
    const pad = n => String(n).padStart(2,'0');
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

  // ─── Persistance ────────────────────────────────────
  let _tickCount = 0;
  function save() {
    localStorage.setItem(K_SIM_SEC,   _st.chrono.sim);
    localStorage.setItem(K_PAPER_SEC, _st.chrono.paperReal);
    localStorage.setItem(K_REAL_SEC,  _st.chrono.real);
  }

  // ─── Compter les trades en cours ────────────────────
  function countOpenTrades() {
    if (typeof window.S === 'undefined') return 0;
    let count = 0;
    try {
      // Compter dans pairStates les positions ouvertes
      if (window.S.pairStates) {
        for (const pair in window.S.pairStates) {
          const ps = window.S.pairStates[pair];
          if (ps && ps.position && ps.position.isOpen) count++;
        }
      }
    } catch(e) {}
    return count;
  }

  // ─── Changement de mode trading ─────────────────────
  function setTradingMode(newMode) {
    if (!MODE_CFG[newMode]) return;
    if (typeof window.S === 'undefined') return;
    const oldMode = window.S.tradingMode;
    if (oldMode === newMode) return;

    if (newMode === 'real') {
      const ok = confirm(
        '🔴 PASSAGE EN MODE RÉEL\n\n' +
        'Ce mode utilise de vraies données Binance.\n' +
        'Confirmer le changement ?'
      );
      if (!ok) return;
    }

    window.S.tradingMode = newMode;

    try {
      if (typeof window.showToast === 'function') {
        window.showToast('Mode → ' + MODE_CFG[newMode].full, 2500, newMode === 'real' ? 'warn' : 'win');
      }
    } catch(e) {}

    render();
  }
  window.auraSetTradingMode = setTradingMode;

  // ─── Création / mise à jour des boutons ─────────────
  function ensureButtons() {
    const headerBtns = document.querySelector('.header-buttons');
    if (!headerBtns) return;
    const settingsBtn = document.getElementById('settingsBtn');

    // 1. Bouton santé 🩺 (remplace ✓ diagnostic si présent)
    if (!document.getElementById('healthBtn')) {
      // chercher l'ancien bouton diagnostic ✓
      const oldDiag = headerBtns.querySelector('.btn-diag');
      if (oldDiag && oldDiag.textContent.trim() === '✓') {
        // remplacer son contenu et son ID
        oldDiag.id = 'healthBtn';
        oldDiag.className = 'btn-icon btn-health';
        oldDiag.textContent = '🩺';
        oldDiag.title = 'Diagnostic santé';
      } else {
        // créer un nouveau
        const b = document.createElement('button');
        b.id = 'healthBtn';
        b.className = 'btn-icon btn-health';
        b.textContent = '🩺';
        b.title = 'Diagnostic santé';
        // insérer après le bouton régime (⚡)
        const regBtn = headerBtns.querySelector('.btn-regime');
        if (regBtn && regBtn.nextSibling) {
          headerBtns.insertBefore(b, regBtn.nextSibling);
        } else {
          headerBtns.appendChild(b);
        }
      }
    }

    // 2. Bouton trades en cours
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
      if (healthBtn && healthBtn.nextSibling) {
        headerBtns.insertBefore(b, healthBtn.nextSibling);
      } else {
        headerBtns.appendChild(b);
      }
    }

    // 3. Bouton de mode AA/EV/RE
    if (!document.getElementById('auraModeBtn')) {
      const b = document.createElement('button');
      b.id = 'auraModeBtn';
      b.className = 'btn-mode-trading';
      b.title = 'Changer le mode trading';
      b.onclick = function() {
        const cur = currentMode();
        const idx = MODE_ORDER.indexOf(cur);
        const next = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
        setTradingMode(next);
      };
      // insérer avant le bouton settings
      if (settingsBtn) {
        headerBtns.insertBefore(b, settingsBtn);
      } else {
        headerBtns.appendChild(b);
      }
    }

    // 4. Badge mode sous le chrono
    if (!document.getElementById('modeBadgeEl')) {
      const headerRight = document.querySelector('.header-right');
      const chronoEl = document.getElementById('chronoEl');
      if (headerRight && chronoEl) {
        const badge = document.createElement('div');
        badge.id = 'modeBadgeEl';
        badge.className = 'mode-badge mode-sim';
        badge.textContent = 'AUTO-APPR';
        // insérer après le chrono
        if (chronoEl.nextSibling) {
          headerRight.insertBefore(badge, chronoEl.nextSibling);
        } else {
          headerRight.appendChild(badge);
        }
      }
    }
  }

  // ─── Détection réseau ───────────────────────────────
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

  // ─── Sync running depuis simToggleBtn (lecture seule) ─
  function syncRunning() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) return;
    const isRun = btn.textContent.trim() === '⏸';
    if (_st.running !== isRun && !_st.pausedByNetwork) {
      _st.running = isRun;
      save();
    }
  }

  // ─── Tick 1 seconde ─────────────────────────────────
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

  // ─── Rendu UI ───────────────────────────────────────
  function render() {
    ensureButtons();
    const mode = currentMode();
    const cfg  = MODE_CFG[mode];

    // Chrono : compteur du mode + couleur
    const chronoEl = document.getElementById('chronoEl');
    if (chronoEl) {
      chronoEl.textContent = fmtChrono(_st.chrono[mode]);
      chronoEl.className = 'chrono-display';
      if (_st.pausedByNetwork) {
        chronoEl.classList.add('paused-auto');
      } else {
        chronoEl.classList.add(cfg.cls);
        if (_st.running) chronoEl.classList.add('running');
      }
    }

    // Badge mode
    const badge = document.getElementById('modeBadgeEl');
    if (badge) {
      badge.textContent = cfg.label;
      badge.className = 'mode-badge ' + cfg.cls;
    }

    // Bouton AUTO/MANU : colorer selon mode trading (sauf MANU)
    const modeLbl = document.getElementById('modeLabelText');
    if (modeLbl) {
      const modeBtn = modeLbl.closest('button') || modeLbl.parentElement;
      if (modeBtn) {
        const isManu = (modeLbl.textContent || '').trim().toUpperCase() === 'MANU';
        if (!isManu) {
          modeBtn.style.borderColor = cfg.color;
          modeBtn.style.background  = cfg.color + '20';
          modeBtn.style.color       = cfg.color;
        } else {
          // MANU : on retire nos styles inline pour laisser le CSS d'origine
          modeBtn.style.borderColor = '';
          modeBtn.style.background  = '';
          modeBtn.style.color       = '';
        }
      }
    }

    // Bouton trades : nombre + couleur du mode
    const tradesBtn = document.getElementById('tradesCountBtn');
    if (tradesBtn) {
      tradesBtn.textContent = String(countOpenTrades());
      tradesBtn.className = 'btn-icon btn-trades ' + cfg.cls;
    }

    // Bouton mode AA/EV/RE
    const modeBtn = document.getElementById('auraModeBtn');
    if (modeBtn) {
      modeBtn.textContent = cfg.abbr;
      modeBtn.style.borderColor = cfg.color;
      modeBtn.style.color       = cfg.color;
      modeBtn.style.background  = cfg.color + '1a';
    }

    // Indicateur réseau
    const netEl = document.getElementById('netIndicator');
    if (netEl) netEl.className = 'net-indicator ' + _st.netStatus;

    // Play/pause : seulement si pause réseau
    const simBtn = document.getElementById('simToggleBtn');
    if (simBtn && _st.pausedByNetwork) {
      simBtn.className = 'btn-icon btn-play-pause network-lost';
      simBtn.textContent = '▶';
    }

    // Bordure header
    const bar = document.getElementById('statusBar');
    if (bar) bar.style.borderBottomColor = cfg.border;
  }

  // ─── API publique ───────────────────────────────────
  window.AuraChrono = {
    fmtChrono,
    refresh: function() { render(); },
    resetChrono: function(m) {
      const mm = m || currentMode();
      if (_st.chrono[mm] !== undefined) {
        _st.chrono[mm] = 0;
        save();
        render();
      }
    },
    getChrono: function(m) { return _st.chrono[m || currentMode()]; },
    getAllChronos: function() { return { ..._st.chrono }; },
  };

  // ─── Init ───────────────────────────────────────────
  function init() {
    window.addEventListener('online',  onNetChange);
    window.addEventListener('offline', onNetChange);
    if (navigator.connection) navigator.connection.addEventListener('change', onNetChange);
    window.addEventListener('beforeunload', () => {
      localStorage.setItem(K_QUIT_OFF, !navigator.onLine ? 'true' : 'false');
      save();
    });
    onNetChange();
    setInterval(tick, 1000);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
