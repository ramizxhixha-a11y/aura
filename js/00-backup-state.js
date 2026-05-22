// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 122 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// CE FICHIER EST UN KILLER + FIXER.
//
// HISTORIQUE :
//   v118 : seed automatique du _BACKUP_STATE figé 06/05 (cycle=12383)
//   v121 : killer du PRELOAD inline HTML qui réinjectait #12383
//   v122 : ajoute le fix du #42 (S.cycle hardcodé dans 02-state-init.js)
//
// PROBLÈMES RÉSOLUS :
//
//   1️⃣ _BACKUP_STATE (#12383) du PRELOAD inline ou du seed historique
//      → DÉTECTÉ et PURGÉ au démarrage
//      → Restauration auto depuis nexusSnap_A si présent
//
//   2️⃣ S.cycle=42 hardcodé dans 02-state-init.js (Hitchhiker's Guide)
//      → DÉTECTÉ après init et REMIS À 0
//      → Mais SEULEMENT si aucun loadState n'a déjà restauré un cycle > 0
//      → Sinon le storage légitime gagne (anti-régression respectée)
//
// CHARGEMENT : dans le HTML comme premier <script src> du body.
//
// PROCÉDURE UTILISATEUR :
//   1. Upload ce fichier en /js/ (remplace l'existant)
//   2. Re-restaure le snapshot #16520 via force-restore.html
//   3. Ouvre AURA → tu dois voir #16520 (pas #42, pas #12383)
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const SAVE_KEY = 'nexus_state_v2';
  const BLOCK_DURATION_MS = 5000;
  const startTime = Date.now();
  let blockedCount = 0;
  let purgedAtStart = false;
  let restoredCycle = null;

  // ── Détection signature _BACKUP_STATE figé ────────────────────────────
  function _isBackupSignature(parsed, rawLen) {
    if (!parsed) return false;
    if (parsed.cycle === 12383) return true;
    if (!parsed.savedAt && rawLen > 500000) return true;
    if (parsed.tradingAccount && Math.abs(parsed.tradingAccount - 1513.58) < 0.1) return true;
    return false;
  }

  // ── Toast visuel ─────────────────────────────────────────────────────
  function _toast(msg, color) {
    try {
      const inject = () => {
        const id = '_killerToast_' + Date.now();
        const el = document.createElement('div');
        el.id = id;
        el.style.cssText = [
          'position:fixed','top:60px','right:8px',
          'z-index:999997','padding:6px 10px',
          'font:bold 10px ui-monospace,monospace',
          'background:' + (color || '#5a1217'),
          'color:#fff','border-radius:6px','cursor:pointer',
          'opacity:0.9','line-height:1.3',
          'max-width:260px','word-break:break-all',
          'box-shadow:0 2px 8px rgba(0,0,0,0.4)'
        ].join(';');
        el.textContent = msg;
        el.onclick = () => el.remove();
        // Empiler les toasts si plusieurs
        const existing = document.querySelectorAll('[id^="_killerToast_"]');
        el.style.top = (60 + existing.length * 32) + 'px';
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch(e){} }, 10000);
      };
      if (document.body) inject();
      else document.addEventListener('DOMContentLoaded', inject);
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 — Purge du _BACKUP_STATE si présent au démarrage
  // ══════════════════════════════════════════════════════════════════════
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw && raw.length > 0) {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch(e) {}
      if (_isBackupSignature(parsed, raw.length)) {
        localStorage.removeItem(SAVE_KEY);
        purgedAtStart = true;
        console.warn('[killer] PURGÉ _BACKUP_STATE (cycle=' +
          (parsed && parsed.cycle) + ', taille=' + (raw.length/1024).toFixed(0) + 'KB)');
        _toast('🛡 _BACKUP purgé au démarrage', '#5a1217');
      }
    }
  } catch(e) {}

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 — Restaurer depuis nexusSnap_A si la purge a effacé le state
  // ══════════════════════════════════════════════════════════════════════
  if (purgedAtStart) {
    try {
      const backupRaw = localStorage.getItem('nexusSnap_A');
      if (backupRaw && backupRaw.length > 0) {
        const backup = JSON.parse(backupRaw);
        if (backup && backup.cycle && !_isBackupSignature(backup, backupRaw.length)) {
          localStorage.setItem(SAVE_KEY, backupRaw);
          restoredCycle = backup.cycle;
          console.log('[killer] ✅ restauré depuis nexusSnap_A · cycle ' + backup.cycle);
          _toast('✅ Restauré depuis backup · #' + backup.cycle, '#0a4d2a');
        }
      }
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 3 — Intercepter les écritures pendant 5 secondes
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
          console.warn('[killer] BLOQUÉ écriture _BACKUP #' + blockedCount +
            ' (cycle=' + (parsed && parsed.cycle) + ')');
          _toast('🛡 ' + blockedCount + ' _BACKUP bloqué(s)', '#5a1217');
          return; // NE PAS écrire
        }
      }
    } catch(e) {}

    return _origSetItem.call(this, key, value);
  };

  console.log('[killer] ✅ actif · purge initiale: ' + (purgedAtStart ? 'oui' : 'non') +
    (restoredCycle ? ' · restauré: #' + restoredCycle : ''));

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 4 — FIX #42 : corriger S.cycle hardcodé après l'init
  // ══════════════════════════════════════════════════════════════════════
  // S est créé par 02-state-init.js avec cycle=42 hardcodé.
  // Si loadState restaure un cycle > 42 (depuis storage), pas de souci.
  // Si loadState plante OU ne trouve rien, S.cycle reste à 42 = problème.
  //
  // On surveille S.cycle pendant 10 secondes après le DOM ready :
  // - Si S.cycle === 42 ET le storage contient un cycle > 42 → on force la valeur
  // - Si S.cycle === 42 ET aucun storage → on force à 0 (neutre, anti-régression)
  // - Si S.cycle > 42 (légitime) → on ne touche pas

  function _fix42() {
    if (typeof window.S !== 'object' || !window.S) return false;
    if (window.S.cycle !== 42) return false; // pas le bug ou déjà corrigé

    // Vérifier ce qu'il y a dans le storage
    let storageCycle = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.cycle === 'number') storageCycle = parsed.cycle;
      }
    } catch(e) {}

    if (storageCycle !== null && storageCycle > 42) {
      // Le storage a un cycle plus haut → loadState n'a pas appliqué
      window.S.cycle = storageCycle;
      console.log('[killer] FIX #42 → #' + storageCycle + ' (depuis storage)');
      _toast('🔧 cycle #42 corrigé · #' + storageCycle, '#1a3d5c');
      // Forcer un render pour rafraîchir l'UI
      try { if (typeof window.renderAll === 'function') window.renderAll(); } catch(e) {}
      return true;
    } else if (storageCycle === null || storageCycle === 0) {
      // Aucun storage légitime → on met cycle=0 pour neutraliser
      window.S.cycle = 0;
      console.log('[killer] FIX #42 → #0 (storage vide)');
      _toast('🔧 cycle #42 → #0 (neutre)', '#3a3a5c');
      try { if (typeof window.renderAll === 'function') window.renderAll(); } catch(e) {}
      return true;
    }
    return false;
  }

  // Surveillance : tenter le fix toutes les 500ms pendant 10s
  let fixAttempts = 0;
  const fixInterval = setInterval(() => {
    fixAttempts++;
    if (_fix42()) {
      clearInterval(fixInterval);
      return;
    }
    if (fixAttempts >= 20) { // 10 secondes
      clearInterval(fixInterval);
      // Si S.cycle est toujours > 42 (légitime), c'est bon
      if (window.S && window.S.cycle > 42) {
        console.log('[killer] cycle légitime · #' + window.S.cycle);
      }
    }
  }, 500);

  // ══════════════════════════════════════════════════════════════════════
  // ÉTAPE 5 — Restaurer setItem natif après 5s
  // ══════════════════════════════════════════════════════════════════════
  setTimeout(() => {
    Storage.prototype.setItem = _origSetItem;
    if (blockedCount > 0) {
      console.log('[killer] ✅ ' + blockedCount + ' bloqué(s) · setItem libre');
    }
  }, BLOCK_DURATION_MS);

})();
