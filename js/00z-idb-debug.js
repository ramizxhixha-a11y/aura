// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00z-idb-debug.js · DEBUG TEMPORAIRE · 01/06/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// MODULE DE DIAGNOSTIC PONCTUEL — À RETIRER APRÈS USAGE
//
// Intercepte saveState() pour tracer pourquoi l'écriture IndexedDB
// ne fonctionne pas (alors que les tests isolés montrent qu'elle marche).
//
// USAGE :
//   1. Charger ce fichier dans AURA8_v118.html EN DERNIER (après 10-...)
//   2. Attendre 30s qu'un saveState se déclenche
//   3. Lire la clé localStorage 'aura_idb_debug' avec inspect-idb.html
//      ou n'importe quel outil qui liste les clés LS
//   4. RETIRER ce script du HTML après diagnostic
//
// CE QUE LE MODULE FAIT :
//   - Au chargement, wrap window.openDB pour tracer chaque appel
//   - Wrap saveState pour tracer chaque tentative d'écriture IDB
//   - Écrit les 20 dernières tentatives dans localStorage.aura_idb_debug
//   - N'AFFECTE PAS le comportement d'AURA (juste de l'observation)
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';
  const DEBUG_KEY = 'aura_idb_debug';
  const MAX_EVENTS = 30;

  function log(event) {
    try {
      const raw = localStorage.getItem(DEBUG_KEY);
      let events = [];
      if (raw) {
        try { events = JSON.parse(raw); } catch(e) { events = []; }
      }
      if (!Array.isArray(events)) events = [];
      event.ts = new Date().toISOString();
      events.push(event);
      // Garder uniquement les MAX_EVENTS derniers
      if (events.length > MAX_EVENTS) {
        events = events.slice(-MAX_EVENTS);
      }
      localStorage.setItem(DEBUG_KEY, JSON.stringify(events));
    } catch(e) {
      // Si LS plein, on ne peut pas tracer
    }
  }

  function serializeError(e) {
    if (!e) return null;
    return {
      name: e.name || 'Error',
      message: e.message || String(e),
      stack: e.stack ? String(e.stack).split('\n').slice(0, 5).join(' | ') : null
    };
  }

  // Attendre que window.openDB et window.saveState soient définis
  function waitFor(name, callback, attempts) {
    attempts = attempts || 0;
    if (typeof window[name] === 'function') {
      callback();
      return;
    }
    if (attempts > 100) {
      log({ type: 'ERROR', msg: 'window.' + name + ' jamais défini après 5s' });
      return;
    }
    setTimeout(() => waitFor(name, callback, attempts + 1), 50);
  }

  log({ type: 'INIT', msg: '00z-idb-debug chargé' });

  // ─── Wrap window.openDB ───
  waitFor('openDB', () => {
    const origOpenDB = window.openDB;
    log({
      type: 'WRAP_OPENDB',
      msg: 'window.openDB wrappé',
      origFn: origOpenDB.name || '(anonyme)',
      origLength: String(origOpenDB).length
    });

    window.openDB = function() {
      const callId = Math.random().toString(36).substring(2, 8);
      log({ type: 'OPENDB_CALL', callId: callId, msg: 'appel openDB()' });

      let promise;
      try {
        promise = origOpenDB.apply(this, arguments);
      } catch(e) {
        log({ type: 'OPENDB_THROW', callId: callId, error: serializeError(e) });
        throw e;
      }

      if (!promise || typeof promise.then !== 'function') {
        log({
          type: 'OPENDB_BAD_RETURN',
          callId: callId,
          msg: 'openDB n\'a pas retourné une Promise',
          returned: typeof promise
        });
        return promise;
      }

      return promise.then(
        function(db) {
          let storeKeyPath = '(unknown)';
          let storesList = '(unknown)';
          try {
            storesList = Array.from(db.objectStoreNames).join(',');
            if (db.objectStoreNames.contains('state')) {
              const tx = db.transaction('state', 'readonly');
              const store = tx.objectStore('state');
              storeKeyPath = store.keyPath === null ? '(null)' : ('"' + store.keyPath + '"');
            }
          } catch(e) {}
          log({
            type: 'OPENDB_OK',
            callId: callId,
            version: db ? db.version : '?',
            stores: storesList,
            stateKeyPath: storeKeyPath
          });
          return db;
        },
        function(err) {
          log({
            type: 'OPENDB_REJECT',
            callId: callId,
            error: serializeError(err)
          });
          throw err;
        }
      );
    };
  });

  // ─── Wrap window.saveState ───
  waitFor('saveState', () => {
    const origSaveState = window.saveState;
    log({
      type: 'WRAP_SAVESTATE',
      msg: 'window.saveState wrappé',
      origFn: origSaveState.name || '(anonyme)',
      origLength: String(origSaveState).length
    });

    window.saveState = function(silent) {
      const callId = Math.random().toString(36).substring(2, 8);
      const stateReady = (typeof window._stateReady !== 'undefined') ? window._stateReady : '(undefined)';
      log({
        type: 'SAVESTATE_CALL',
        callId: callId,
        silent: !!silent,
        stateReady: String(stateReady),
        cycle: (typeof S !== 'undefined' && S && typeof S.cycle === 'number') ? S.cycle : '?'
      });

      let result;
      try {
        result = origSaveState.apply(this, arguments);
      } catch(e) {
        log({ type: 'SAVESTATE_THROW', callId: callId, error: serializeError(e) });
        throw e;
      }

      if (!result || typeof result.then !== 'function') {
        log({
          type: 'SAVESTATE_NOT_ASYNC',
          callId: callId,
          returned: typeof result,
          value: String(result)
        });
        return result;
      }

      return result.then(
        function(ok) {
          // Lire l'état IDB juste après pour vérifier si l'écriture a pris
          let idbCheckPromise;
          try {
            const cdb = indexedDB.open('NEXUS_DB');
            idbCheckPromise = new Promise((resolve) => {
              cdb.onsuccess = (e) => {
                try {
                  const db = e.target.result;
                  if (!db.objectStoreNames.contains('state')) {
                    db.close();
                    resolve({ stateExists: false });
                    return;
                  }
                  const tx = db.transaction('state', 'readonly');
                  const req = tx.objectStore('state').get('nexus_state_v2');
                  req.onsuccess = (e2) => {
                    const snap = e2.target.result;
                    db.close();
                    resolve({
                      stateExists: true,
                      hasKey: !!snap,
                      cycle: snap ? snap.cycle : null
                    });
                  };
                  req.onerror = () => { db.close(); resolve({ readError: true }); };
                } catch(err) {
                  resolve({ checkErr: err.message });
                }
              };
              cdb.onerror = () => resolve({ openErr: true });
              setTimeout(() => resolve({ timeout: true }), 2000);
            });
          } catch(e) {
            idbCheckPromise = Promise.resolve({ wrapErr: e.message });
          }

          idbCheckPromise.then(check => {
            log({
              type: 'SAVESTATE_RESOLVED',
              callId: callId,
              returned: String(ok),
              idbCheck: check
            });
          });

          return ok;
        },
        function(err) {
          log({
            type: 'SAVESTATE_REJECT',
            callId: callId,
            error: serializeError(err)
          });
          throw err;
        }
      );
    };
  });

  // ─── Listener supplémentaire : transactions IDB qui plantent globalement ───
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason && e.reason.message &&
          (e.reason.message.includes('IDB') ||
           e.reason.message.includes('IndexedDB') ||
           e.reason.message.includes('transaction'))) {
        log({
          type: 'UNHANDLED_IDB_REJECTION',
          error: serializeError(e.reason)
        });
      }
    });
  }

  console.log('[00z-idb-debug] Module chargé · trace écrite dans localStorage.aura_idb_debug');
})();
