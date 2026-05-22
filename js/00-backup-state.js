// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00-backup-state.js · VERSION 121 · 22/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// CE FICHIER NE FAIT PLUS DE SEED. IL EST DEVENU UN KILLER.
//
// HISTORIQUE :
//   Ancien : seed automatique du _BACKUP_STATE figé 06/05 (cycle=12383)
//   qui écrasait le storage à chaque démarrage.
//   Nouveau : détecte si quelqu'un d'autre (PRELOAD inline du HTML par
//   exemple) a déjà écrit ce _BACKUP_STATE, et l'efface immédiatement.
//
// MÉCANISME :
//   1. Au chargement, lit localStorage[nexus_state_v2]
//   2. Si signature _BACKUP_STATE détectée (cycle=12383, savedAt=undefined,
//      tradingAccount~1513.58), efface l'entrée
//   3. Override localStorage.setItem pendant 5 secondes pour intercepter
//      toute nouvelle tentative d'écriture du _BACKUP_STATE
//   4. Après 5 secondes, restaure setItem normal
//
// CHARGEMENT : déjà inclus dans le HTML comme premier <script src> après
// le PRELOAD inline. Ne pas déplacer.
// ════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const SAVE_KEY = 'nexus_state_v2';
  const BLOCK_DURATION_MS = 5000;
  const startTime = Date.now();
  let blockedCount = 0;
  let purgedAtStart = false;

  // ── Détection signature _BACKUP_STATE ────────────────────────────────
  function _isBackupSignature(parsed, rawLen) {
    if (!parsed) return false;
    // Signature 1 : cycle exactement 12383
    if (parsed.cycle === 12383) return true;
    // Signature 2 : pas de savedAt + valeur très grosse
    if (!parsed.savedAt && rawLen > 500000) return true;
    // Signature 3 : tradingAccount très spécifique du backup
    if (parsed.tradingAccount && Math.abs(parsed.tradingAccount - 1513.58) < 0.1) return true;
    return false;
  }

  // ── Toast visuel (notification) ─────────────────────────────────────
  function _toast(msg, color) {
    try {
      const inject = () => {
        let el = document.getElementById('_backupKillerToast');
        if (el) { el.textContent = msg; return; }
        el = document.createElement('div');
        el.id = '_backupKillerToast';
        el.style.cssText = [
          'position:fixed','top:60px','right:8px',
          'z-index:999997','padding:6px 10px',
          'font:bold 10px ui-monospace,monospace',
          'background:' + (color || '#5a1217'),
          'color:#fff','border-radius:6px','cursor:pointer',
          'opacity:0.9','line-height:1.3',
          'max-width:260px','word-break:break-all'
        ].join(';');
        el.textContent = msg;
        el.onclick = () => el.remove();
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch(e){} }, 10000);
      };
      if (document.body) inject();
      else document.addEventListener('DOMContentLoaded', inject);
    } catch(e) {}
  }

  // ── ÉTAPE 1 : Purger le storage s'il contient déjà le _BACKUP_STATE ──
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw && raw.length > 0) {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch(e) {}
      if (_isBackupSignature(parsed, raw.length)) {
        localStorage.removeItem(SAVE_KEY);
        purgedAtStart = true;
        console.warn('[backup-killer] PURGÉ _BACKUP_STATE écrit par le PRELOAD inline (cycle=' +
          (parsed && parsed.cycle) + ', taille=' + (raw.length/1024).toFixed(0) + 'KB)');
        _toast('🛡 _BACKUP purgé au démarrage', '#5a1217');
      }
    }
  } catch(e) {
    console.warn('[backup-killer] purge initiale erreur:', e);
  }

  // ── ÉTAPE 2 : Si purge effectuée, tenter de restaurer depuis nexusSnap_A ─
  if (purgedAtStart) {
    try {
      const backupRaw = localStorage.getItem('nexusSnap_A');
      if (backupRaw && backupRaw.length > 0) {
        const backup = JSON.parse(backupRaw);
        if (backup && backup.cycle && !_isBackupSignature(backup, backupRaw.length)) {
          // nexusSnap_A est sain → restaurer
          localStorage.setItem(SAVE_KEY, backupRaw);
          console.log('[backup-killer] ✅ restauré depuis nexusSnap_A · cycle ' + backup.cycle);
          _toast('✅ Restauré depuis backup secondaire · #' + backup.cycle, '#0a4d2a');
        }
      }
    } catch(e) {}
  }

  // ── ÉTAPE 3 : Intercepter les écritures pendant 5 secondes ──────────
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
          console.warn('[backup-killer] BLOQUÉ écriture _BACKUP #' + blockedCount +
            ' (cycle=' + (parsed && parsed.cycle) + ', taille=' + (value.length/1024).toFixed(0) + 'KB)');
          _toast('🛡 ' + blockedCount + ' écrasement(s) _BACKUP bloqué(s)', '#5a1217');
          return; // NE PAS écrire
        }
      }
    } catch(e) {}

    return _origSetItem.call(this, key, value);
  };

  console.log('[backup-killer] ✅ actif · fenêtre ' + BLOCK_DURATION_MS + 'ms · purge initiale: ' +
    (purgedAtStart ? 'oui' : 'non'));

  // Après la fenêtre, restaurer setItem natif
  setTimeout(() => {
    Storage.prototype.setItem = _origSetItem;
    if (blockedCount > 0) {
      console.log('[backup-killer] ✅ ' + blockedCount + ' écrasement(s) bloqué(s) · setItem restauré');
      _toast('🛡 ' + blockedCount + ' bloqué(s) · setItem libre', '#0a4d2a');
    } else {
      console.log('[backup-killer] fenêtre fermée · 0 écrasement détecté');
    }
  }, BLOCK_DURATION_MS);

})();
