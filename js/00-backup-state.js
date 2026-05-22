// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 123 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// CE FICHIER EST : KILLER + VERSION-PATCHER + FIXER #42
//
// CAUSE RACINE TROUVÉE :
//   loadState() ligne 347 du 09-core-runtime.js fait :
//     if (!snap || snap.version < 2) return false;
//   Le snapshot #16520 restauré via force-restore n'a PAS de champ "version".
//   Donc loadState renvoie FALSE sans rien restaurer.
//   Résultat : S.cycle reste à 42 (hardcodé dans 02-state-init.js).
//
// FIX :
//   1. Au démarrage, lire le storage (LS + IDB)
//   2. Si le snap n'a pas version OU version < 2 → INJECTER version: 2
//   3. Réécrire dans LS + IDB
//   4. loadState peut maintenant le restaurer correctement
//
// EN PLUS :
//   - Détecte et purge le _BACKUP_STATE figé (#12383)
//   - Bloque toute écriture de _BACKUP_STATE pendant 5 secondes
//   - Surveille S.cycle après init et corrige le #42 si nécessaire
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const SAVE_KEY = 'nexus_state_v2';
  const DB_NAME  = 'NEXUS_DB';
  const STORE    = 'state';
  const BLOCK_DURATION_MS = 5000;
  const startTime = Date.now();
  let blockedCount = 0;
  let patchedVersion = false;

  // ── Détection signature _BACKUP_STATE figé ───────────────────────────
  function _isBackupSignature(parsed, rawLen) {
    if (!parsed) return false;
    if (parsed.cycle === 12383) return true;
    if (!parsed.savedAt && rawLen > 500000) return true;
    if (parsed.tradingAccount && Math.abs(parsed.tradingAccount - 1513.58) < 0.1) return true;
    return false;
  }

  // ── Toast ────────────────────────────────────────────────────────────
  function _toast(msg, color) {
    try {
      const inject = () => {
        const el = document.createElement('div');
        el.style.cssText = [
          'position:fixed','right:8px',
          'z-index:999997','padding:6px 10px',
          'font:bold 10px ui-monospace,monospace',
          'background:' + (color || '#5a1217'),
          'color:#fff','border-radius:6px','cursor:pointer',
          'opacity:0.95','line-height:1.3',
          'max-width:280px','word-break:break-all',
          'box-shadow:0 2px 8px rgba(0,0,0,0.5)'
        ].join(';');
        el.textContent = msg;
        el.onclick = () => el.remove();
        const existing = document.querySelectorAll('[data-killer-toast]');
        el.setAttribute('data-killer-toast', '1');
        el.style.top = (60 + existing.length * 36) + 'px';
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch(e){} }, 15000);
      };
      if (document.body) inject();
      else document.addEventListener('DOMContentLoaded', inject);
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 — Lire ce qu'il y a dans LocalStorage
  // ══════════════════════════════════════════════════════════════════════
  let lsSnap = null;
  let lsRaw = null;
  try {
    lsRaw = localStorage.getItem(SAVE_KEY);
    if (lsRaw) lsSnap = JSON.parse(lsRaw);
  } catch(e) {}

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 — Purger si _BACKUP_STATE détecté
  // ══════════════════════════════════════════════════════════════════════
  if (lsSnap && _isBackupSignature(lsSnap, lsRaw.length)) {
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
    _toast('🛡 _BACKUP purgé (cycle=' + lsSnap.cycle + ')', '#5a1217');
    // Restaurer depuis nexusSnap_A si possible
    try {
      const backupRaw = localStorage.getItem('nexusSnap_A');
      if (backupRaw) {
        const backup = JSON.parse(backupRaw);
        if (backup && backup.cycle && !_isBackupSignature(backup, backupRaw.length)) {
          localStorage.setItem(SAVE_KEY, backupRaw);
          lsSnap = backup;
          lsRaw = backupRaw;
          _toast('✅ Restauré nexusSnap_A · #' + backup.cycle, '#0a4d2a');
        }
      }
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 3 — PATCH VERSION : si le snap existe mais n'a pas version: 2,
  //           on lui ajoute version: 2 pour que loadState le restaure.
  // ══════════════════════════════════════════════════════════════════════
  // Re-lire après purge éventuelle
  try {
    lsRaw = localStorage.getItem(SAVE_KEY);
    if (lsRaw) lsSnap = JSON.parse(lsRaw);
  } catch(e) {}

  if (lsSnap && (typeof lsSnap.version !== 'number' || lsSnap.version < 2)) {
    lsSnap.version = 2;
    // Ajouter savedAt si absent (anti-régression bridge)
    if (!lsSnap.savedAt) lsSnap.savedAt = new Date().toISOString();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(lsSnap));
      patchedVersion = true;
      console.log('[killer] PATCH version=2 sur snap LS (cycle=' + lsSnap.cycle + ')');
      _toast('🔧 version=2 patché · #' + lsSnap.cycle, '#1a3d5c');
    } catch(e) {
      console.warn('[killer] patch LS échoué:', e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 4 — Faire pareil sur IndexedDB
  // ══════════════════════════════════════════════════════════════════════
  function _patchIDB() {
    return new Promise((resolve) => {
      let req;
      try {
        req = indexedDB.open(DB_NAME);
      } catch(e) {
        resolve(false);
        return;
      }

      req.onerror = () => resolve(false);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.close();
          resolve(false);
          return;
        }
        try {
          const tx = db.transaction(STORE, 'readwrite');
          const store = tx.objectStore(STORE);
          const getReq = store.get(SAVE_KEY);
          getReq.onsuccess = () => {
            const snap = getReq.result;
            if (snap && typeof snap === 'object') {
              // Purger _BACKUP_STATE si détecté
              const rawLen = JSON.stringify(snap).length;
              if (_isBackupSignature(snap, rawLen)) {
                store.delete(SAVE_KEY);
                _toast('🛡 IDB _BACKUP purgé', '#5a1217');
                db.close();
                resolve(true);
                return;
              }
              // Patch version
              if (typeof snap.version !== 'number' || snap.version < 2) {
                snap.version = 2;
                if (!snap.savedAt) snap.savedAt = new Date().toISOString();
                store.put(snap, SAVE_KEY);
                console.log('[killer] PATCH version=2 sur snap IDB (cycle=' + snap.cycle + ')');
                _toast('🔧 IDB version=2 · #' + snap.cycle, '#1a3d5c');
              }
            }
            db.close();
            resolve(true);
          };
          getReq.onerror = () => { db.close(); resolve(false); };
        } catch(e) {
          db.close();
          resolve(false);
        }
      };
    });
  }

  _patchIDB().catch(() => {});

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 5 — Intercepter écritures _BACKUP_STATE pendant 5s
  // ══════════════════════════════════════════════════════════════════════
  const _origSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function(key, value) {
    try {
      const now = Date.now();
      const inBlockWindow = (now - startTime) < BLOCK_DURATION_MS;

      if (inBlockWindow && key === SAVE_KEY && typeof value === 'string') {
        let parsed = null;
        try { parsed = JSON.parse(value); } catch(e) {}

        if (_isBackupSignature(parsed, value.length)) {
          blockedCount++;
          console.warn('[killer] BLOQUÉ _BACKUP #' + blockedCount);
          _toast('🛡 ' + blockedCount + ' _BACKUP bloqué', '#5a1217');
          return;
        }
      }
    } catch(e) {}

    return _origSetItem.call(this, key, value);
  };

  setTimeout(() => {
    Storage.prototype.setItem = _origSetItem;
  }, BLOCK_DURATION_MS);

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 6 — FIX #42 surveillance pendant 10 secondes
  // ══════════════════════════════════════════════════════════════════════
  let fixAttempts = 0;
  const fixInterval = setInterval(() => {
    fixAttempts++;
    if (typeof window.S !== 'object' || !window.S) {
      if (fixAttempts >= 20) clearInterval(fixInterval);
      return;
    }

    if (window.S.cycle === 42) {
      // Lire le storage pour trouver le vrai cycle
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.cycle === 'number' && parsed.cycle > 42) {
            // Forcer la restauration manuelle
            window.S.cycle = parsed.cycle;
            if (typeof parsed.portfolio === 'number' && parsed.portfolio > 0) window.S.portfolio = parsed.portfolio;
            if (typeof parsed.cashAccount === 'number' && parsed.cashAccount > 0) window.S.cashAccount = parsed.cashAccount;
            if (typeof parsed.tradingAccount === 'number' && parsed.tradingAccount > 0) window.S.tradingAccount = parsed.tradingAccount;
            if (typeof parsed.totalTrades === 'number') window.S.totalTrades = parsed.totalTrades;
            if (typeof parsed.winTrades === 'number') window.S.winTrades = parsed.winTrades;
            if (Array.isArray(parsed.agents)) window.S.agents = parsed.agents;
            if (Array.isArray(parsed.pnlHistory)) window.S.pnlHistory = parsed.pnlHistory;
            console.log('[killer] FIX #42 → #' + parsed.cycle + ' (force restore)');
            _toast('🔧 #42 → #' + parsed.cycle, '#1a3d5c');
            try { if (typeof window.renderAll === 'function') window.renderAll(); } catch(e) {}
            clearInterval(fixInterval);
            return;
          }
        }
      } catch(e) {}
    } else if (window.S.cycle > 42) {
      console.log('[killer] cycle légitime #' + window.S.cycle);
      clearInterval(fixInterval);
    }

    if (fixAttempts >= 20) clearInterval(fixInterval);
  }, 500);

  console.log('[killer v123] actif · patchedVersion=' + patchedVersion);

})();
