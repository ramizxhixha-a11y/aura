/* ═══════════════════════════════════════════════════════════
   AURA8 v120 · js/01-chrono-network.js
   LIVRAISON — Chrono multi-mode + Détection réseau + Auto-pause
   + FILET DE SÉCURITÉ bouton play (v119)
   + MODE DIAGNOSTIC visible à l'écran (v120)

   v120 ajoute un panneau noir fixé en haut de l'écran qui affiche
   en temps réel ce qui se passe sur #simToggleBtn :
   - À l'init : bouton trouvé ? toggleSim existe ? autres boutons header ?
   - À chaque clic : élément cible, texte avant/après, fallback déclenché ?
   - Le panneau est tappable pour le masquer.

   Tout le reste du code est strictement identique à v119.
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

  // ─── DIAGNOSTIC PANEL (v120) ────────────────────────
  function dbg(msg) {
    try {
      let p = document.getElementById('auraDebugPanel');
      if (!p) {
        p = document.createElement('div');
        p.id = 'auraDebugPanel';
        p.style.cssText = [
          'position:fixed', 'top:0', 'left:0', 'right:0',
          'background:rgba(0,0,0,0.92)', 'color:#0ff',
          'font:10px/1.35 monospace', 'padding:6px 8px',
          'z-index:99999999', 'white-space:pre-wrap',
          'max-height:38vh', 'overflow-y:auto',
          'border-bottom:2px solid #f0f', 'pointer-events:auto',
          'word-break:break-all'
        ].join(';');
        p.title = 'Tap to hide';
        p.addEventListener('click', function(ev) {
          ev.stopPropagation();
          p.style.display = (p.style.display === 'none') ? 'block' : 'none';
        });
        if (document.body) {
          document.body.appendChild(p);
        } else {
          setTimeout(function(){ dbg(msg); }, 200);
          return;
        }
      }
      const time = new Date().toTimeString().slice(0,8);
      const prev = (p.textContent || '').split('\n').slice(0, 12).join('\n');
      p.textContent = '[' + time + '] ' + msg + '\n' + prev;
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

  // ─── FILET DE SÉCURITÉ + DIAGNOSTIC bouton play (v120) ───
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
    const btn = document.getElementById('simToggleBtn');

    // Liste les boutons de l'en-tête pour repérer un éventuel ID différent
    try {
      const header = document.querySelector('header') ||
                     document.querySelector('.header-l1') ||
                     document.querySelector('[class*="header"]') ||
                     document.body;
      const btns = header.querySelectorAll('button, [role="button"]');
      const headerBtns = Array.from(btns).slice(0, 6).map(describeEl).join(' | ');
      dbg('HEADER ' + btns.length + ' btns: ' + (headerBtns || 'AUCUN'));
    } catch(e) {
      dbg('header scan err: ' + e.message);
    }

    if (btn) {
      dbg('simToggleBtn TROUVÉ ' + describeEl(btn) + ' onclick=' + (typeof btn.onclick));
    } else {
      dbg('simToggleBtn ABSENT du DOM');
    }
    dbg('toggleSim=' + typeof window.toggleSim + ' simulationPaused=' + typeof window.simulationPaused);

    // Listener de capture global — voit TOUT clic, même si simToggleBtn n'est pas là
    document.addEventListener('click', function(e) {
      const t = e.target;
      const txt = (t.textContent || '').trim();
      const isPlayLike = (t.id === 'simToggleBtn') ||
                        (t.closest && t.closest('#simToggleBtn')) ||
                        /[▶⏸▷⏵]/.test(txt) ||
                        /play|pause|sim/i.test(t.className || '') ||
                        /play|pause|sim/i.test((t.parentElement && t.parentElement.className) || '');
      if (isPlayLike) {
        dbg('CLICK ' + describeEl(t) + ' phase=capture');
      }
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
      dbg('BTN-CLICK before="' + textBefore + '" onclick=' + (typeof btn.onclick));
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
