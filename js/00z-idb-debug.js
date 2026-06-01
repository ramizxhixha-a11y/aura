// ============================================================
// AURA8 - 00z-idb-debug.js - TEMPORARY DEBUG MODULE - 2026-06-01
// ============================================================
// DO NOT TRANSLATE - this is JavaScript source code.
// Wraps window.openDB and window.saveState to trace IDB writes.
// Writes events to localStorage key 'aura_idb_debug'.
// Remove from HTML after diagnostic complete.
// ============================================================

(function() {
  'use strict';
  var DEBUG_KEY = 'aura_idb_debug';
  var MAX_EVENTS = 30;

  function log(event) {
    try {
      var raw = localStorage.getItem(DEBUG_KEY);
      var events = [];
      if (raw) {
        try { events = JSON.parse(raw); } catch(e) { events = []; }
      }
      if (!Array.isArray(events)) events = [];
      event.ts = new Date().toISOString();
      events.push(event);
      if (events.length > MAX_EVENTS) {
        events = events.slice(-MAX_EVENTS);
      }
      localStorage.setItem(DEBUG_KEY, JSON.stringify(events));
    } catch(e) {
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

  function waitFor(name, callback, attempts) {
    attempts = attempts || 0;
    if (typeof window[name] === 'function') {
      callback();
      return;
    }
    if (attempts > 100) {
      log({ type: 'ERROR', msg: 'window.' + name + ' never defined after 5s' });
      return;
    }
    setTimeout(function() { waitFor(name, callback, attempts + 1); }, 50);
  }

  log({ type: 'INIT', msg: '00z-idb-debug loaded' });

  waitFor('openDB', function() {
    var origOpenDB = window.openDB;
    log({
      type: 'WRAP_OPENDB',
      msg: 'window.openDB wrapped',
      origFn: origOpenDB.name || '(anon)',
      origLength: String(origOpenDB).length
    });

    window.openDB = function() {
      var callId = Math.random().toString(36).substring(2, 8);
      log({ type: 'OPENDB_CALL', callId: callId });

      var promise;
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
          returned: typeof promise
        });
        return promise;
      }

      return promise.then(
        function(db) {
          var storeKeyPath = '(unknown)';
          var storesList = '(unknown)';
          try {
            storesList = Array.from(db.objectStoreNames).join(',');
            if (db.objectStoreNames.contains('state')) {
              var tx = db.transaction('state', 'readonly');
              var store = tx.objectStore('state');
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

  waitFor('saveState', function() {
    var origSaveState = window.saveState;
    log({
      type: 'WRAP_SAVESTATE',
      msg: 'window.saveState wrapped',
      origFn: origSaveState.name || '(anon)',
      origLength: String(origSaveState).length
    });

    window.saveState = function(silent) {
      var callId = Math.random().toString(36).substring(2, 8);
      var stateReady = (typeof window._stateReady !== 'undefined') ? window._stateReady : '(undefined)';
      log({
        type: 'SAVESTATE_CALL',
        callId: callId,
        silent: !!silent,
        stateReady: String(stateReady),
        cycle: (typeof S !== 'undefined' && S && typeof S.cycle === 'number') ? S.cycle : '?'
      });

      var result;
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
          var idbCheckPromise;
          try {
            var cdb = indexedDB.open('NEXUS_DB');
            idbCheckPromise = new Promise(function(resolve) {
              cdb.onsuccess = function(e) {
                try {
                  var db = e.target.result;
                  if (!db.objectStoreNames.contains('state')) {
                    db.close();
                    resolve({ stateExists: false });
                    return;
                  }
                  var tx = db.transaction('state', 'readonly');
                  var req = tx.objectStore('state').get('nexus_state_v2');
                  req.onsuccess = function(e2) {
                    var snap = e2.target.result;
                    db.close();
                    resolve({
                      stateExists: true,
                      hasKey: !!snap,
                      cycle: snap ? snap.cycle : null
                    });
                  };
                  req.onerror = function() { db.close(); resolve({ readError: true }); };
                } catch(err) {
                  resolve({ checkErr: err.message });
                }
              };
              cdb.onerror = function() { resolve({ openErr: true }); };
              setTimeout(function() { resolve({ timeout: true }); }, 2000);
            });
          } catch(e) {
            idbCheckPromise = Promise.resolve({ wrapErr: e.message });
          }

          idbCheckPromise.then(function(check) {
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

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('unhandledrejection', function(e) {
      if (e.reason && e.reason.message &&
          (e.reason.message.indexOf('IDB') >= 0 ||
           e.reason.message.indexOf('IndexedDB') >= 0 ||
           e.reason.message.indexOf('transaction') >= 0)) {
        log({
          type: 'UNHANDLED_IDB_REJECTION',
          error: serializeError(e.reason)
        });
      }
    });
  }

  console.log('[00z-idb-debug] loaded - trace in localStorage.aura_idb_debug');
})();
