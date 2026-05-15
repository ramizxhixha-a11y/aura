/* ═══════════════════════════════════════════════════════════
   AURA8 v121 · js/01-chrono-network.js
   LIVRAISON — Chrono multi-mode + Détection réseau + Auto-pause
   + FILET DE SÉCURITÉ bouton play (v119)
   + DIAGNOSTIC visible v120, corrigé en v121 :
       · panneau désormais en BAS (ne couvre plus le header)
       · bouton TEST qui force toggleSim() avec try/catch
       · log de TOUS les clics (sans filtre heuristique)
       · panneau non-dismissable par tap (✕ explicite pour le masquer)

   Tout le reste est strictement identique à v120.
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

  // ─── DIAGNOSTIC PANEL (v121, en bas, avec bouton TEST) ──
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
      'max-height:40vh', 'display:flex', 'flex-direction:column'
    ].join(';');

    // Barre du haut avec bouton TEST et ✕
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;padding:4px 6px;background:#222;align-items:center';
    bar.innerHTML = '<span style="color:#f0f;font-weight:bold">AURA-DBG v121</span>';

    const testBtn = document.createElement('button');
    testBtn.textContent = 'TEST toggleSim()';
    testBtn.style.cssText = 'background:#0ff;color:#000;border:none;padding:4px 8px;font:bold 10px monospace;cursor:pointer';
    testBtn.addEventListener('click', function(ev) {
      ev.stopPropagation();
      const btn = document.getElementById('simToggleBtn');
      const before = btn ? btn.textContent.trim() : '(no btn)';
      dbg('TEST · before="' + before + '"');
      try {
        if (typeof window.toggleSim === 'function') {
          window.toggleSim();
          setTimeout(function() {
            const after = btn ? btn.textContent.trim() : '(no btn)';
            dbg('TEST · after="' + after + '" changed=' + (before !== after));
          }, 100);
        } else {
          dbg('TEST · toggleSim absent');
        }
      } catch (err) {
        dbg('TEST · ERROR ' + (err.message || err));
      }
    });
    bar.appendChild(testBtn);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'CLEAR';
    clearBtn.style.cssText = 'background:#444;color:#fff;border:none;padding:4px 8px;font:bold 10px monospace;cursor:pointer';
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
      const prev = (log.textContent || '').split('\n').slice(0, 18).join('\n');
      log.textContent = '[' + time + '] ' + msg + '\n' + prev;
    } catch (err) {
      // ne jamais casser le module à cause du debug
    }
  }

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

  // ─── DIAGNOSTIC + FILET DE SÉCURITÉ (v121) ──────────
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
    const btn = document.getElementById('simToggleBtn');

    try {
      const allBtns = document.querySelectorAll('button, [role="button"]');
      dbg('DOC ' + allBtns.length + ' btns total');
    } catch(e) {}

    if (btn) {
      dbg('simToggleBtn TROUVÉ ' + describeEl(btn) + ' onclick=' + (typeof btn.onclick));
    } else {
      dbg('simToggleBtn ABSENT du DOM');
    }
    dbg('toggleSim=' + typeof window.toggleSim + ' simulationPaused=' + typeof window.simulationPaused);
    dbg('Utilise le bouton TEST ci-dessus pour appeler toggleSim() directement');

    // Capture phase : LOG TOUS LES CLICS (sans filtre)
    document.addEventListener('click', function(e) {
      const t = e.target;
      const inDebug = t.closest && t.closest('#auraDebugWrap');
      if (inDebug) return; // ignore clics dans le panneau lui-même
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
        dbg('FALLBACK déclenché');
        if (textBefore === '⏸') {
          btn.textContent = '▶';
          if (typeof window.simulationPaused !== 'undefined') {
            window.simulationPaused = true;
          }
          state.running = false;
          state.pausedByNetwork = false;
          localStorage.setItem(K_NET_PAUSE, 'false');
        } else {
          btn.textContent = '⏸';
          if (typeof window.simulationPaused !== 'undefined') {
            window.simulationPaused = false;
          }
          state.running = true;
          state.pausedByNetwork = false;
          localStorage.setItem(K_NET_PAUSE, 'false');
        }
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
    attachDefensivePlayHandler();
    setTimeout(diagnosticInit, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
