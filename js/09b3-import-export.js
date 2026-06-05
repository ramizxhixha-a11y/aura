// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b3-import-export.js · VERSION 121 · 21/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// importState + exportState + saveFeeRecord — import/export utilisateur.
//
// v121 — Fixes :
//   • importState : put avec CLÉ EXPLICITE (RT.SAVE_KEY)
//   • importState : try/catch sur stopSim
//   • saveFeeRecord : défensif sur S.taxConfig
//
// Dépend de 09a-runtime-state.js (accès via window.RT + window.openDB).
// ════════════════════════════════════════════════════════════════════════


function importState() {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = '.json,application/json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const snap = JSON.parse(text);

      if (!snap) {
        if (typeof showToast === 'function') showToast('❌ Fichier invalide', 4000, 'user');
        return;
      }

      const confirmed = confirm(
        'Restaurer cette sauvegarde ?\n\n' +
        'Cycle : #'        + (snap.cycle || '?') + '\n' +
        'Trades : '        + (snap.totalTrades || 0) + '\n' +
        'Portefeuille : '  + (snap.portfolio ? snap.portfolio.toFixed(2) : 0) + ' USDT\n' +
        'Sauvegardé : '    + (snap.savedAt ? new Date(snap.savedAt).toLocaleString() : '?') + '\n\n' +
        "L'état actuel sera remplacé."
      );
      if (!confirmed) return;

      // Stop sim si elle tourne (avec try/catch)
      const wasRunning = RT._simRunning;
      if (wasRunning) {
        try { if (typeof stopSim === 'function') stopSim(); } catch(e) {}
      }

      // Écrire dans IDB + LS en parallèle
      if (!snap.savedAt) snap.savedAt = new Date().toISOString();
      if (!snap.key) snap.key = RT.SAVE_KEY;

      try {
        const db = await openDB();
        await new Promise(res => {
          try {
            const tx  = db.transaction(RT.STORE_STATE, 'readwrite');
            const req = tx.objectStore(RT.STORE_STATE).put(snap, RT.SAVE_KEY);
            req.onsuccess = () => res(true);
            req.onerror   = () => res(false);
            tx.oncomplete = () => res(true);
            tx.onerror    = () => res(false);
          } catch(e) { res(false); }
        });
      } catch (dbErr) {}

      try {
        localStorage.setItem(RT.SAVE_KEY, JSON.stringify(snap));
      } catch (lsErr) {}

      const ok = await loadState();

      if (ok) {
        try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
        if (typeof showToast === 'function') {
          showToast('✅ Session restaurée depuis fichier · cycle #' + S.cycle, 5000, 'user');
        }
        try {
          if (S.chainLog) {
            S.chainLog.push({
              icon: '📥',
              desc: 'Session importée depuis fichier · cycle #' + S.cycle,
              hash: (typeof rndHash === 'function') ? rndHash() : '0x' + Date.now().toString(16),
              time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString()
            });
          }
        } catch(e) {}
      } else {
        if (typeof showToast === 'function') {
          showToast('⚠ Restauration partielle', 4000, 'user');
        }
      }
    } catch (err) {
      console.error('Import failed', err);
      if (typeof showToast === 'function') {
        showToast('❌ Import échoué : fichier illisible', 4000, 'user');
      }
    }
  };

  input.click();
}
window.importState = importState;


function exportState(silent) {
  try {
    const snap = buildSnapshot();
    if (!snap) {
      if (typeof showToast === 'function') {
        showToast('❌ Export impossible : état pas prêt', 3000, 'user');
      }
      return false;
    }

    snap._export = {
      version:     S.vMajor + '.' + S.vMinor,
      exportedAt:  new Date().toISOString(),
      portfolio:   S.portfolio,
      cycle:       S.cycle,
      totalTrades: S.totalTrades,
      winRate:     S.totalTrades > 0 ? Math.round(S.winTrades / S.totalTrades * 100) : 0
    };

    const json = JSON.stringify(snap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const d    = new Date();
    const stamp = d.getFullYear() + '-' +
                  String(d.getMonth() + 1).padStart(2, '0') + '-' +
                  String(d.getDate()).padStart(2, '0')     + '_' +
                  String(d.getHours()).padStart(2, '0')    +
                  String(d.getMinutes()).padStart(2, '0');

    a.href     = url;
    a.download = 'nexus_save_' + stamp + '_cycle' + S.cycle + '.json';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try { document.body.removeChild(a); } catch(e){}
      try { URL.revokeObjectURL(url); } catch(e){}
    }, 100);

    if (typeof showToast === 'function') {
      showToast('💾 Sauvegarde exportée : ' + a.download, 4000, 'user');
    }
    return true;
  } catch (e) {
    console.error('Export failed', e);
    if (typeof showToast === 'function') {
      showToast('❌ Export échoué : ' + e.message, 4000, 'user');
    }
    return false;
  }
}
window.exportState = exportState;


async function saveFeeRecord(feeRecord) {
  try {
    const db = await openDB();
    const tx = db.transaction(RT.STORE_FEES, 'readwrite');
    tx.objectStore(RT.STORE_FEES).add({
      ...feeRecord,
      savedAt: new Date().toISOString(),
      region:  (S && S.taxConfig) ? S.taxConfig.region : null
    });
  } catch (e) {}
}
window.saveFeeRecord = saveFeeRecord;


/* ════════════════════════════════════════════════════════════════════
   TÉLÉCHARGEMENT AUTO HORS-NAVIGATEUR — ROTATION 3 FICHIERS
   AURA télécharge un fichier .json de l'état dans le dossier Téléchargements
   de la tablette, à la fréquence choisie. Rotation sur 3 noms fixes
   (aura_backup_A/B/C.json) → s'écrasent en boucle, pas d'accumulation.
   Ces fichiers vivent HORS du navigateur → survivent au vidage du cache.
   Une synchro Android (Autosync/FolderSync) peut les envoyer sur Drive.
   Réglage localStorage : aura_autodl_meta {enabled, everyMin, last, slot}
   ════════════════════════════════════════════════════════════════════ */
const AUTODL_KEY  = 'aura_autodl_meta';
const AUTODL_SLOTS = ['A', 'B', 'C'];   // rotation sur 3 fichiers

function autoDlGetMeta() {
  try { const m = JSON.parse(localStorage.getItem(AUTODL_KEY)); if (m) return m; } catch(e){}
  return { enabled: false, everyMin: 180, last: 0, slot: 0 };   // défaut : 3h, désactivé
}
function autoDlSetMeta(m) { try { localStorage.setItem(AUTODL_KEY, JSON.stringify(m)); } catch(e){} }

// Télécharge l'état dans le slot de rotation courant (nom fixe → s'écrase).
function autoDlDownload(slotIndex) {
  try {
    if (typeof buildSnapshot !== 'function') return false;
    const snap = buildSnapshot();
    if (!snap) return false;
    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    const json = JSON.stringify(snap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'aura_backup_' + AUTODL_SLOTS[slotIndex] + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch(e){} try { URL.revokeObjectURL(url); } catch(e){} }, 100);
    return true;
  } catch (e) { return false; }
}

// Déclenche un téléchargement si l'intervalle est écoulé ET si l'état est sain.
function autoDlTick() {
  try {
    const m = autoDlGetMeta();
    if (!m.enabled) return;
    const now = Date.now();
    if (m.last && (now - m.last) < m.everyMin * 60000) return;
    // garde-fou : ne jamais télécharger un état vide/neuf
    let cyc = -1;
    try { const St = (0, eval)('S'); if (St && typeof St.cycle === 'number') cyc = St.cycle; } catch(e){}
    if (cyc <= 100) return;
    const slot = m.slot || 0;
    if (autoDlDownload(slot)) {
      m.slot = (slot + 1) % AUTODL_SLOTS.length;   // rotation A→B→C→A
      m.last = now;
      autoDlSetMeta(m);
    }
  } catch (e) {}
}

// Vérifie toutes les 60s si un téléchargement est dû.
if (window._autoDlTimer) clearInterval(window._autoDlTimer);
window._autoDlTimer = setInterval(autoDlTick, 60000);

window.autoDownload = {
  getMeta: autoDlGetMeta,
  setMeta: autoDlSetMeta,
  tick:    autoDlTick,
  // active avec fréquence en minutes (5=test, 180=3h, 360=6h, 720=12h)
  enable:  (everyMin) => { const m = autoDlGetMeta(); m.enabled = true; m.everyMin = everyMin || 180; autoDlSetMeta(m); },
  disable: () => { const m = autoDlGetMeta(); m.enabled = false; autoDlSetMeta(m); },
  // téléchargement immédiat dans le slot courant
  now:     () => { const m = autoDlGetMeta(); return autoDlDownload(m.slot || 0); }
};

/* ════════════════════════════════════════════════════════════════════
   RÉCUPÉRATION INTELLIGENTE — l'utilisateur choisit son/ses fichier(s)
   de backup ; AURA lit chacun, garde celui au cycle le plus élevé, et le
   recharge. Sert quand le navigateur a été vidé (état perdu).
   Le navigateur ne pouvant pas lire un fichier seul, ça part d'un clic user.
   ════════════════════════════════════════════════════════════════════ */
function recoverFromFiles() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.multiple = true;   // peut en choisir plusieurs → on prend le meilleur
    input.onchange = async (ev) => {
      const files = Array.from(ev.target.files || []);
      if (!files.length) return;
      let best = null, bestName = '';
      for (const f of files) {
        try {
          const txt = await f.text();
          const snap = JSON.parse(txt);
          const cyc = (snap && typeof snap.cycle === 'number') ? snap.cycle : -1;
          if (!best || cyc > best.cycle) { best = snap; bestName = f.name; }
        } catch(e){}
      }
      if (!best) { if (typeof showToast === 'function') showToast('❌ Fichier illisible', 4000, 'critical'); return; }
      const pf = typeof best.portfolio === 'number' ? Math.round(best.portfolio) : '?';
      const ok = confirm('Récupérer ce backup ?\n\nFichier : ' + bestName + '\nCycle : ' + best.cycle + '\nPortefeuille : ' + pf + '\n\nCela remplacera l\'état actuel.');
      if (!ok) return;
      // Appliquer le snapshot : même logique qu'importState (IDB + LS), puis loadState.
      try {
        if (!best.key) best.key = RT.SAVE_KEY;
        try {
          const db = await openDB();
          await new Promise((res) => {
            const tx = db.transaction(RT.STORE_STATE, 'readwrite');
            const store = tx.objectStore(RT.STORE_STATE);
            const req = store.keyPath ? store.put(best) : store.put(best, RT.SAVE_KEY);
            req.onsuccess = () => res(); req.onerror = () => res();
          });
        } catch(e){}
        try { localStorage.setItem(RT.SAVE_KEY, JSON.stringify(best)); } catch(e){}
        try { localStorage.setItem('aura_highwater_cycle', String(best.cycle)); } catch(e){}
        if (typeof loadState === 'function') { await loadState(); if (typeof renderAll === 'function') renderAll(); }
        else location.reload();
        if (typeof showToast === 'function') showToast('✅ Backup récupéré : cycle ' + best.cycle, 5000, 'user');
      } catch(e) {
        try { localStorage.setItem(RT.SAVE_KEY, JSON.stringify(best)); location.reload(); } catch(e2){}
      }
    };
    input.click();
  } catch (e) {}
}
window.recoverFromFiles = recoverFromFiles;
