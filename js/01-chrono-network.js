/* ═══════════════════════════════════════════════════════════
   AURA8 v123 · js/01-chrono-network.js
   LIVRAISON — Chrono multi-mode + Détection réseau + Auto-pause
   + FILET DE SÉCURITÉ bouton play (v119)
   + DIAGNOSTIC visible (v120/v121)
   + SHIM startSim/stopSim (v122)
   + OVERRIDE toggleSim qui alterne vraiment start↔stop (v123)

   v123 corrige le deuxième bug : le toggleSim() inline du HTML
   appelait toujours startSim, jamais stopSim — donc impossible
   de mettre le bot en pause. Cette version remplace window.toggleSim
   par une implémentation qui se base sur window.simulationPaused
   (maintenu par les shims) comme source de vérité unique.

   Tout le reste est identique à v122.
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── Clés localStorage ──────────────────────────────
  const K_AUTO_SEC = 'aura_chrono_auto_seconds';
  const K_MANU_SEC = 'aura_chrono_manu_seconds';
  const K_RUNNING  = 'aura_system_running';
  const K_MODE     = 'aura_current_mode';
  const K_NET_PAUSE = 'aura_paused_by_network';
  const K_QUIT_OFF  = 'aura_quit_while_offline';

  // ─── État ───────────────────────────────────────────
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

  // ─── DIAGNOSTIC PANEL ───────────────────────────────
  function dbgEnsurePanel() {
    let wrap = document.getElementById('auraDebugWrap');
    if (wrap) return wrap;
    if (!document.body) return null;

    wrap = document.createElement('div');
    wrap.id = 'auraDebugWrap';
    wrap.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0',
      'background:rgba(0,0,0,0.93)', 'color:#0ff',
      'font:10px/1.35 monospace',
      'z-index:99999999', 'pointer-events:auto',
      'border-top:2px solid #f0f',
      'max-height:45vh', 'display:flex', 'flex-direction:column'
    ].join(';');

    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:4px;padding:4px 6px;background:#222;align-items:center;flex-wrap:wrap';
    bar.innerHTML = '<span style="color:#f0f;font-weight:bold;margin-right:4px">AURA-DBG v123</span>';

    function mkBtn(label, color, fn) {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'background:' + color + ';color:#000;border:none;padding:4px 6px;font:bold 9px monospace;cursor:pointer';
      b.addEventListener('click', function(ev) {
        ev.stopPropagation();
        fn();
      });
      bar.appendChild(b);
      return b;
    }

    mkBtn('TEST toggleSim()', '#0ff', function() {
      const btn = document.getElementById('simToggleBtn');
      const before = btn ? btn.textContent.trim() : '(no btn)';
      dbg('TEST-TOGGLE before="' + before + '"');
      try {
        if (typeof window.toggleSim === 'function') {
          window.toggleSim();
          setTimeout(function() {
            const after = btn ? btn.textContent.trim() : '(no btn)';
            dbg('TEST-TOGGLE after="' + after + '" changed=' + (before !== after));
          }, 100);
        } else {
          dbg('TEST-TOGGLE · toggleSim absent');
        }
      } catch (err) {
        dbg('TEST-TOGGLE · ERROR ' + (err.message || err));
      }
    });

    mkBtn('TEST startSim()', '#0f0', function() {
      try {
        if (typeof window.startSim === 'function') {
          window.startSim();
          dbg('TEST-START OK · simulationPaused=' + window.simulationPaused);
        } else {
          dbg('TEST-START · startSim absent');
        }
      } catch (err) {
        dbg('TEST-START · ERROR ' + (err.message || err));
      }
    });

    mkBtn('TEST stopSim()', '#fa0', function() {
      try {
        if (typeof window.stopSim === 'function') {
          window.stopSim();
          dbg('TEST-STOP OK · simulationPaused=' + window.simulationPaused);
        } else {
          dbg('TEST-STOP · stopSim absent');
        }
      } catch (err) {
        dbg('TEST-STOP · ERROR ' + (err.message || err));
      }
    });

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'CLEAR';
    clearBtn.style.cssText = 'background:#444;color:#fff;border:none;padding:4px 6px;font:bold 9px monospace;cursor:pointer';
    clearBtn.addEventListener('click', function(ev) {
      ev.stopPropagation();
      const log = document.getElementById('auraDebugLog');
      if (log) log.textContent = '';
    });
    bar.appendChild(clearBtn);

    const hideBtn = document.createElement('button');
    hideBtn.textContent = '✕';
    hideBtn.style.cssText = 'background:#900;color:#fff;border:none;padding:4px 8px;font:bold 10px monospace;cursor:pointer;margin-left:auto';
    hideBtn.addEventListener('click', function(ev) {
      ev.stopPropagation();
      wrap.style.display = 'none';
    });
    bar.appendChild(hideBtn);

    wrap.appendChild(bar);

    const log = document.createElement('div');
    log.id = 'auraDebugLog';
    log.style.cssText = 'padding:6px 8px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;flex:1';
    wrap.appendChild(log);

    document.body.appendChild(wrap);
    return wrap;
  }

  function dbg(msg) {
    try {
      const wrap = dbgEnsurePanel();
      if (!wrap) {
        setTimeout(function(){ dbg(msg); }, 200);
        return;
      }
      const log = document.getElementById('auraDebugLog');
      const time = new Date().toTimeString().slice(0,8);
      const prev = (log.textContent || '').split('\n').slice(0, 20).join('\n');
      log.textContent = '[' + time + '] ' + msg + '\n' + prev;
    } catch (err) { /* silencieux */ }
  }

  // ─── SHIM startSim / stopSim (v122) ─────────────────
  // Ces fonctions manquaient au scope global depuis la modularisation v118.
  // toggleSim() les appelle de l'inline HTML, donc elles DOIVENT exister sur window.
  function installSimShims() {
    let installed = [];

    if (typeof window.startSim !== 'function') {
      window.startSim = function() {
        window.simulationPaused = false;
        const btn = document.getElementById('simToggleBtn');
        if (btn) {
          btn.classList.remove('paused');
          btn.classList.add('running');
          // ne pas forcer le texte ici, on laisse toggleSim/HTML inline le gérer s'il le fait
        }
        try { window.dispatchEvent(new CustomEvent('aura-sim-start')); } catch(e){}
        dbg('SHIM startSim() exécuté · simulationPaused=false');
      };
      installed.push('startSim');
    }

    if (typeof window.stopSim !== 'function') {
      window.stopSim = function() {
        window.simulationPaused = true;
        const btn = document.getElementById('simToggleBtn');
        if (btn) {
          btn.classList.remove('running');
          btn.classList.add('paused');
        }
        try { window.dispatchEvent(new CustomEvent('aura-sim-stop')); } catch(e){}
        dbg('SHIM stopSim() exécuté · simulationPaused=true');
      };
      installed.push('stopSim');
    }

    // Aliases couramment utilisés au cas où l'inline appelle d'autres noms
    if (typeof window.pauseSim !== 'function') {
      window.pauseSim = function() { window.stopSim(); };
    }
    if (typeof window.resumeSim !== 'function') {
      window.resumeSim = function() { window.startSim(); };
    }

    if (installed.length) {
      dbg('SHIMS installés: ' + installed.join(', '));
    } else {
      dbg('SHIMS déjà présents (rien à installer)');
    }

    // v123 : REMPLACER window.toggleSim par une version qui alterne vraiment
    // L'original (inline HTML) appelle toujours startSim, jamais stopSim.
    // Notre version utilise window.simulationPaused comme source de vérité.
    window.toggleSim = function() {
      const currentlyRunning = (window.simulationPaused === false);
      dbg('TOGGLE-SIM override · running=' + currentlyRunning);
      if (currentlyRunning) {
        // En marche → mettre en pause
        window.stopSim();
        const btn = document.getElementById('simToggleBtn');
        if (btn) btn.textContent = '►';
      } else {
        // En pause (ou inconnu) → démarrer
        window.startSim();
        const btn = document.getElementById('simToggleBtn');
        if (btn) btn.textContent = '❚❚';
      }
    };
    dbg('OVERRIDE toggleSim installée (utilise simulationPaused comme source de vérité)');
  }

  // ─── Reste du module (identique v121) ───────────────
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
        window.simulationPaused = true;
      }
    } else if (prev === 'offline' && state.pausedByNetwork && !quitOffline) {
      state.pausedByNetwork = false;
      state.running = true;
      localStorage.setItem(K_NET_PAUSE, 'false');
      save();
      window.simulationPaused = false;
    }
    render();
  }

  if (!navigator.onLine && localStorage.getItem(K_NET_PAUSE) === 'true') {
    localStorage.setItem(K_QUIT_OFF, 'true');
  } else {
    localStorage.setItem(K_QUIT_OFF, 'false');
  }

  function syncRunningFromUI() {
    // v123 : si simulationPaused est défini (par les shims), c'est la source de vérité
    if (typeof window.simulationPaused === 'boolean') {
      const isRunning = (window.simulationPaused === false);
      if (state.running !== isRunning && !state.pausedByNetwork) {
        state.running = isRunning;
        save();
      }
      return;
    }
    // Sinon : fallback historique sur le texte du bouton
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

  // ─── Diagnostic + filet de sécurité ────────────────
  function describeEl(el) {
    if (!el) return 'null';
    const id = el.id ? '#' + el.id : '';
    const cls = (el.className && typeof el.className === 'string')
                  ? '.' + el.className.split(' ').filter(Boolean).slice(0,2).join('.')
                  : '';
    const txt = (el.textContent || '').trim().slice(0, 4);
    return el.tagName.toLowerCase() + id + cls + (txt ? '="' + txt + '"' : '');
  }

  function diagnosticInit() {
    dbgEnsurePanel();
    installSimShims(); // ← v122 : installer les shims AVANT toute autre chose

    const btn = document.getElementById('simToggleBtn');
    try {
      const allBtns = document.querySelectorAll('button, [role="button"]');
      dbg('DOC ' + allBtns.length + ' btns total');
    } catch(e) {}
    if (btn) {
      dbg('simToggleBtn ' + describeEl(btn) + ' onclick=' + (typeof btn.onclick));
    } else {
      dbg('simToggleBtn ABSENT');
    }
    dbg('toggleSim=' + typeof window.toggleSim +
        ' startSim=' + typeof window.startSim +
        ' stopSim=' + typeof window.stopSim +
        ' simulationPaused=' + typeof window.simulationPaused);

    document.addEventListener('click', function(e) {
      const t = e.target;
      const inDebug = t.closest && t.closest('#auraDebugWrap');
      if (inDebug) return;
      dbg('CLICK ' + describeEl(t));
    }, true);
  }

  function attachDefensivePlayHandler() {
    const btn = document.getElementById('simToggleBtn');
    if (!btn) {
      setTimeout(attachDefensivePlayHandler, 500);
      return;
    }
    if (btn._auraDefensiveAttached) return;
    btn._auraDefensiveAttached = true;

    btn.addEventListener('click', function(e) {
      const textBefore = btn.textContent.trim();
      dbg('BTN-CLICK before="' + textBefore + '"');
      setTimeout(function() {
        const textAfter = btn.textContent.trim();
        const stateChanged = (textBefore !== textAfter);
        dbg('BTN-AFTER after="' + textAfter + '" changed=' + stateChanged);
        if (stateChanged) return;
        // v123 : utiliser simulationPaused comme source de vérité (plus fiable que Unicode)
        const paused = (window.simulationPaused !== false);
        dbg('FALLBACK · simulationPaused=' + window.simulationPaused + ' → paused=' + paused);
        if (paused) {
          // Réellement pausé → afficher l'icône lecture
          btn.textContent = '►';
          state.running = false;
        } else {
          // Réellement en marche → afficher l'icône pause
          btn.textContent = '❚❚';
          state.running = true;
        }
        state.pausedByNetwork = false;
        localStorage.setItem(K_NET_PAUSE, 'false');
        save();
        render();
      }, 50);
    }, false);
  }

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
    // v122 : installer les shims TOUT DE SUITE, avant tout clic possible
    installSimShims();
    attachDefensivePlayHandler();
    setTimeout(diagnosticInit, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
