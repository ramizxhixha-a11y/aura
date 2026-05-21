// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b3-import-export.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// importState + exportState + saveFeeRecord — import/export utilisateur.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
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

      if (!snap || snap.version < 2) {
        showToast('❌ Fichier invalide ou trop ancien', 4000, 'user');
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

      const wasRunning = RT._simRunning;
      if (wasRunning) stopSim();

      // Écrire le snap dans IndexedDB/localStorage puis loadState()
      try {
        const db = await openDB();
        await new Promise(res => {
          const tx = db.transaction(RT.STORE_STATE, 'readwrite');
          tx.objectStore(RT.STORE_STATE).put(snap);
          tx.oncomplete = res;
          tx.onerror    = res;
        });
      } catch (dbErr) {
        try { localStorage.setItem(RT.SAVE_KEY, JSON.stringify(snap)); } catch (lsErr) {}
      }

      const ok = await loadState();

      if (ok) {
        if (typeof renderAll === 'function') renderAll();
        showToast('✅ Session restaurée depuis fichier · cycle #' + S.cycle, 5000, 'user');
        S.chainLog.push({
          icon: '📥',
          desc: 'Session importée depuis fichier · cycle #' + S.cycle,
          hash: rndHash(),
          time: nowStr()
        });
      } else {
        showToast('⚠ Restauration partielle', 4000, 'user');
      }
    } catch (err) {
      console.error('Import failed', err);
      showToast('❌ Import échoué : fichier illisible', 4000, 'user');
    }
  };

  input.click();
}
window.importState = importState;


function exportState(silent) {
  try {
    const snap = buildSnapshot();

    // Métadonnées lisibles ajoutées à la racine du fichier exporté
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
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showToast('💾 Sauvegarde exportée : ' + a.download, 4000, 'user');
    return true;
  } catch (e) {
    console.error('Export failed', e);
    showToast('❌ Export échoué : ' + e.message, 4000, 'user');
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
      region:  S.taxConfig.region
    });
  } catch (e) {
    // IndexedDB indisponible — on ne logge pas chaque fee individuel pour éviter le spam
  }
}
window.saveFeeRecord = saveFeeRecord;
