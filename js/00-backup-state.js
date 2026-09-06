// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 126 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
//
// PRELOAD PERSISTANCE — patche version=2 dans les snaps existants
//
// Rôle minimal : au chargement de la page, vérifier que les snaps présents
// dans LS et IDB ont bien le champ version=2. Si absent ou < 2, l'ajouter
// (sinon l'ancien importState v105 refusait le snap comme "trop ancien").
//
// Aucune autre logique. La persistance complète (saveState/loadState/
// importState/autosave) est gérée par 00b-persistance-override.js v121
// qui s'exécute après tous les autres modules.
//
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const SAVE_KEY = 'nexus_state_v2';
  const DB_NAME  = 'NEXUS_DB';
  const STORE    = 'state';

  // ──────────────────────────────────────────────────────────────
  // Patch version=2 dans localStorage
  // ──────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const snap = JSON.parse(raw);
      if (snap && typeof snap === 'object' && typeof snap.cycle === 'number') {
        if (typeof snap.version !== 'number' || snap.version < 2) {
          snap.version = 2;
          if (!snap.savedAt) snap.savedAt = new Date().toISOString();
          localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
          console.log('[backup-state v126] patch version=2 LS · cycle=' + snap.cycle);
        }
      }
    }
  } catch(e) {
    console.warn('[backup-state v126] LS patch error:', e && e.message);
  }

  // ──────────────────────────────────────────────────────────────
  // Patch version=2 dans IndexedDB
  // ──────────────────────────────────────────────────────────────
  try {
    const req = indexedDB.open(DB_NAME);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) { db.close(); return; }
      try {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const getReq = store.get(SAVE_KEY);
        getReq.onsuccess = () => {
          const snap = getReq.result;
          if (snap && typeof snap === 'object' && typeof snap.cycle === 'number') {
            if (typeof snap.version !== 'number' || snap.version < 2) {
              snap.version = 2;
              if (!snap.savedAt) snap.savedAt = new Date().toISOString();
              store.put(snap, SAVE_KEY);
              console.log('[backup-state v126] patch version=2 IDB · cycle=' + snap.cycle);
            }
          }
          db.close();
        };
        getReq.onerror = () => { db.close(); };
      } catch(e) {
        console.warn('[backup-state v126] IDB tx error:', e && e.message);
        db.close();
      }
    };
    req.onerror = () => {};
  } catch(e) {
    console.warn('[backup-state v126] IDB open error:', e && e.message);
  }

  console.log('[backup-state v126] preload terminé');

})();

// ════════════════════════════════════════════════════════════════════════
// [CHRONO TIMERS GLOBAL · 08/08/2026] La sonde longtask a confirmé un vrai
// blocage JS (7,1 s en UN SEUL longtask) sans opération marquée : le fautif
// est un rappel de timer non instrumenté. Ce wrapper, chargé AVANT tous les
// autres modules, enveloppe setTimeout / setInterval / requestAnimationFrame :
// le SITE d'enregistrement (fichier:ligne) est capturé à l'inscription, et
// tout rappel qui bloque > 1 s est journalisé « ⏱ LENT: timer fichier:ligne »
// + nommé dans window._auraLastOp (repris par la ligne de gel de 08).
// Coût nominal : négligeable (un chrono par rappel). Aucune logique modifiée :
// les rappels s'exécutent à l'identique, les ids restent ceux d'origine.
// ════════════════════════════════════════════════════════════════════════
(function _auraTimerChrono() {
  try {
    if (typeof window === 'undefined' || window._auraTimerChronoOn) return;
    window._auraTimerChronoOn = true;
    var _now = function () {
      return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    };
    function _site() {
      try {
        var frames = String(new Error().stack || '').split('\n');
        for (var i = 0; i < frames.length; i++) {
          var m = frames[i].match(/\/([\w.\-]+\.(?:js|html))(?:\?[^:)\s]*)?:(\d+):\d+/);
          if (m && m[1].indexOf('00-backup-state') === -1) return m[1] + ':' + m[2];
        }
      } catch (e) {}
      return 'site inconnu';
    }
    function _report(name, dur) {
      try {
        window._auraLastOp = { name: name, at: _now() };
        window._auraSlowTimers = window._auraSlowTimers || [];
        window._auraSlowTimers.push({ name: name, dur: Math.round(dur), at: Date.now() });
        if (window._auraSlowTimers.length > 20) window._auraSlowTimers.splice(0, window._auraSlowTimers.length - 20);
        var S0 = null;
        try { S0 = (0, eval)('S'); } catch (e) {}
        if (S0 && S0.chainLog) {
          S0.chainLog.push({
            icon: '⏱',
            desc: 'LENT: timer ' + name + ' ' + (dur / 1000).toFixed(1) + 's'
              + ((S0.perf && S0.perf.slowest && S0.perf.slowest.ms > 300) ? ' \u00B7 phase ' + S0.perf.slowest.name + ' ' + (S0.perf.slowest.ms / 1000).toFixed(1) + 's' : ''),   // [06/09] phase la plus lente du tick (08)
            hash: Math.random().toString(36).slice(2, 8),
            time: new Date().toLocaleTimeString()
          });
          if (S0.chainLog.length > 100) S0.chainLog.splice(0, S0.chainLog.length - 100);
        }
      } catch (e) {}
    }
    function _wrapFn(fn, name) {
      if (typeof fn !== 'function') return fn;   // timers « chaîne » : inchangés
      return function () {
        var t0 = _now();
        try { return fn.apply(this, arguments); }
        finally {
          var d = _now() - t0;
          if (d > 1000) _report(name, d);
        }
      };
    }
    var _oST = window.setTimeout, _oSI = window.setInterval, _oRAF = window.requestAnimationFrame;
    window.setTimeout = function (fn) {
      var args = Array.prototype.slice.call(arguments);
      args[0] = _wrapFn(fn, 'setTimeout@' + _site());
      return _oST.apply(window, args);
    };
    window.setInterval = function (fn) {
      var args = Array.prototype.slice.call(arguments);
      args[0] = _wrapFn(fn, 'setInterval@' + _site());
      return _oSI.apply(window, args);
    };
    if (typeof _oRAF === 'function') {
      window.requestAnimationFrame = function (fn) {
        return _oRAF.call(window, _wrapFn(fn, 'rAF@' + _site()));
      };
    }
  } catch (e) {}
})();

// ════════════════════════════════════════════════════════════════════════
// [COLLECTEUR D'ERREURS AVALÉES · 09/08/2026] Les chemins de décision (09c, 10)
// contiennent des catch vides : une erreur répétée y meurt en silence — c'est le
// mécanisme qui a caché le crash potentiel du brain gate. Chaque catch critique
// appelle désormais _decErr(e) : compteur par message dans S._errStats, la PREMIÈRE
// occurrence de chaque message est journalisée ⚠ au chainLog, les suivantes comptent
// sans spammer. Zéro comportement modifié : les erreurs restent avalées (l'app ne
// casse pas), mais elles ne sont plus INVISIBLES.
// ════════════════════════════════════════════════════════════════════════
(function _auraDecErrCollector() {
  try {
    if (typeof window === 'undefined' || window._decErr) return;
    window._decErr = function (e) {
      try {
        var msg = String((e && e.message) || e || 'erreur inconnue').slice(0, 90);
        var S0 = null;
        try { S0 = (0, eval)('S'); } catch (err) {}
        if (!S0) return;
        if (!S0._errStats) S0._errStats = {};
        var first = !S0._errStats[msg];
        S0._errStats[msg] = (S0._errStats[msg] || 0) + 1;
        if (first && S0.chainLog) {
          S0.chainLog.push({
            icon: '⚠',
            desc: 'Erreur avalée (1re occurrence) : ' + msg,
            hash: Math.random().toString(36).slice(2, 8),
            time: new Date().toLocaleTimeString()
          });
          if (S0.chainLog.length > 100) S0.chainLog.splice(0, S0.chainLog.length - 100);
        }
      } catch (err) {}
    };
  } catch (e) {}
})();

// ════════════════════════════════════════════════════════════════════════
// [ANTI-THROTTLING WEBVIEW · 16/08/2026, signalé par Rams] Le renderer WebView se
// throttle après inactivité TACTILE même écran allumé et batterie exclue (Chromium).
// (1) KEEPALIVE : oscillateur audio inaudible (gain 0.001) démarré au premier toucher
//     — un renderer « audible » n'est jamais throttlé. Coût batterie négligeable.
// (2) SONDE HORS-ROTATION : battement 5s ; tout trou >20s est horodaté dans
//     localStorage 'aura_throttle_log' (50 max) — la rotation du journal ne peut plus
//     effacer les nuits de blocage. Relu et affiché au journal à chaque réveil.
// ════════════════════════════════════════════════════════════════════════
(function _antiThrottle() {
  try {
    if (typeof window === 'undefined') return;
    var _ac = null;
    function _startAudio() {
      try {
        if (_ac) return;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        _ac = new AC();
        var osc = _ac.createOscillator(), g = _ac.createGain();
        g.gain.value = 0.001; osc.frequency.value = 30;
        osc.connect(g); g.connect(_ac.destination); osc.start();
      } catch (e) {}
    }
    document.addEventListener('touchstart', _startAudio, { once: true, passive: true });
    document.addEventListener('click', _startAudio, { once: true });

    var _last = Date.now();
    setInterval(function () {
      var now = Date.now(), gap = now - _last;
      _last = now;
      if (gap > 20000) {
        try {
          var log = JSON.parse(localStorage.getItem('aura_throttle_log') || '[]');
          log.unshift({ t: new Date(now - gap).toLocaleString(), gapS: Math.round(gap / 1000) });
          if (log.length > 50) log.length = 50;
          localStorage.setItem('aura_throttle_log', JSON.stringify(log));
          var S0 = null; try { S0 = (0, eval)('S'); } catch (e) {}
          if (S0 && S0.chainLog) {
            S0.chainLog.push({ icon: '🧊', desc: 'WebView throttlée ' + Math.round(gap / 1000) + 's (écran inactif) · journal permanent: aura_throttle_log', hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
            if (S0.chainLog.length > 100) S0.chainLog.splice(0, S0.chainLog.length - 100);
          }
        } catch (e) {}
      }
    }, 5000);
  } catch (e) {}
})();
