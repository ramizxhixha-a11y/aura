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
