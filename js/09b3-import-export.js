// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b3-import-export.js · VERSION 130 · 26/06/2026 ▓▓▓
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


// ── Sauvegarde compatible WebView natif (Capacitor) ─────────────────────────
// Un WebView Android ne declenche PAS le telechargement d'un lien blob (a.click).
// On passe par le PARTAGE natif (navigator.share avec fichier) : ca ouvre le
// selecteur Android (Drive, Fichiers, Gmail...) ou l'utilisateur choisit ou
// enregistrer. Repli sur le telechargement blob classique pour les navigateurs.
// DOIT etre appele dans un geste utilisateur (clic) pour que share() soit permis.
// -- Ecriture fichier native (plugin Capacitor Filesystem, present dans l'APK) --
// Ecrit le backup dans Documents/AURA_Backups/ SANS aucun geste ni popup. C'est
// la VRAIE sauvegarde fichier : un WebView seul ne peut pas ecrire de fichier.
// FolderSync synchronise ensuite ce dossier vers Drive. Retourne 'fs-written' si
// l'ecriture native a reussi, sinon null (les replis share/blob prennent le relais).
async function _fsWriteBackup(json, filename) {
  try {
    var FS = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) || null;
    if (!FS) return null;
    await FS.writeFile({
      path: 'AURA_Backups/' + filename,
      data: json,
      directory: 'DOCUMENTS',
      encoding: 'utf8',
      recursive: true
    });
    return 'fs-written';
  } catch (e) {
    try { console.warn('[AURA] Filesystem write failed', e && e.message); } catch (_) {}
    return null;
  }
}
window._fsWriteBackup = _fsWriteBackup;

async function _shareOrDownloadJSON(json, filename) {
  // 0) Ecriture native silencieuse via le plugin Capacitor Filesystem (APK)
  try { const fsRes = await _fsWriteBackup(json, filename); if (fsRes) return fsRes; } catch (e) {}
  // 1) Partage natif de fichier (WebView Capacitor + navigateurs mobiles recents)
  try {
    if (navigator.canShare && typeof File !== 'undefined') {
      const file = new File([json], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';   // l'utilisateur a annule
    // sinon : on tombe sur le repli telechargement ci-dessous
  }
  // 2) Repli navigateur classique (Chrome desktop/mobile)
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch(_){} try { URL.revokeObjectURL(url); } catch(_){} }, 100);
    return 'downloaded';
  } catch (e) { return 'failed'; }
}
window._shareOrDownloadJSON = _shareOrDownloadJSON;


// ── Diagnostic compact (sans fichier, sans plugin) ──────────────────────────
// Un WebView Capacitor sans plugin ne peut ni telecharger ni partager de fichier.
// On copie donc un JSON COMPACT (~3 Ko : funding + stats/paire + mises recentes)
// dans le presse-papier ; l'utilisateur le colle dans le chat pour analyse.
// Repli : si clipboard refuse, on ouvre une fenetre avec le texte selectionnable.
// ── Moniteur de bridage (detection ralentissement ecran eteint / Doze) ───────
// Un timer 1s qui mesure l'ecart REEL entre deux battements. Ecran allume : ~1s.
// Si Android bride/suspend l'app (ecran eteint, Doze), l'ecart explose (ex: 600s
// d'un coup au reveil). maxGap = plus longue suspension depuis l'ouverture de
// l'app ; overs3s = nb de fois ou un tic a eu >3s de retard. Se reinitialise a
// chaque ouverture de l'app -> ouvrir le soir, NE PAS rouvrir avant le matin.
(function () {
  if (window._tickMon) return;
  var last = Date.now();
  window._tickMon = { maxGapS: 0, lastGapS: 0, overs3s: 0, sinceMin: 0, _start: Date.now() };
  setInterval(function () {
    var now = Date.now(), gap = (now - last) / 1000; last = now;
    var m = window._tickMon;
    m.lastGapS = +gap.toFixed(1);
    if (gap > m.maxGapS) m.maxGapS = +gap.toFixed(1);
    if (gap > 3) m.overs3s++;
    m.sinceMin = +((now - m._start) / 60000).toFixed(1);
  }, 1000);
})();

function _buildDiag() {
  // FIX : même cause que autoDlTick — S n'est pas sur window (const de portée
  // script), donc eval('S') échouait et _buildDiag() plantait → le bouton
  // « Copier diagnostic pour Claude » ne produisait rien. Accesseur exposé.
  let St = null;
  try { if (typeof window._auraGetGlobalS === 'function') St = window._auraGetGlobalS(); } catch(e){}
  if (!St && typeof window !== 'undefined' && window.S) St = window.S;
  if (!St) { try { St = buildSnapshot(); } catch(e){ St = {}; } }
  St = St || {};
  const f = St.fees || {};
  const pairs = {};
  Object.entries(St.pairStates || {}).forEach(([p, ps]) => {
    const tr = (ps.trades || []).slice(-20);
    const avgStake = tr.length ? tr.reduce((a, t) => a + (t.stakeUsdt || 0), 0) / tr.length : 0;
    pairs[p] = {
      tt: ps.totalTrades || 0,
      wt: ps.winTrades || 0,
      pnlPct: +(+(ps.totalPnlPct || 0)).toFixed(2),
      pnlUsd: +(+(ps.totalPnlUsd || 0)).toFixed(2),
      avgStake: +avgStake.toFixed(2),
      recentStakes: tr.slice(-6).map(t => +(+(t.stakeUsdt || 0)).toFixed(1))
    };
  });
  return JSON.stringify({
    cycle: St.cycle,
    ts: Date.now(),
    tsStr: new Date().toString().slice(0, 24),
    tickMon: window._tickMon || null,
    portfolio: +(+(St.portfolio || 0)).toFixed(2),
    trading: +(+(St.tradingAccount || 0)).toFixed(2),
    fees: {
      funding:     +(+(f.totalFunding || 0)).toFixed(2),
      tradingFees: +(+(f.totalTradingFees || 0)).toFixed(2),
      slippage:    +(+(f.totalSlippage || 0)).toFixed(2),
      gross:       +(+(f.totalGross || 0)).toFixed(2),
      pnlGross:    +(+(f.totalPnlGross || 0)).toFixed(2)
    },
    pairs
  });
}

function _showDiagModal(txt) {
  try {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;padding:16px;gap:10px;';
    const ta = document.createElement('textarea');
    ta.value = txt; ta.readOnly = true;
    ta.style.cssText = 'flex:1;width:100%;font-size:11px;font-family:monospace;background:#0d1117;color:#7ee0ff;border:1px solid #38d4f5;border-radius:8px;padding:10px;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';
    const bCopy = document.createElement('button');
    bCopy.textContent = '📋 Tout sélectionner';
    bCopy.style.cssText = 'flex:1;height:42px;border-radius:8px;border:1px solid #00e87a;background:rgba(0,232,122,.15);color:#00e87a;font-weight:700;';
    bCopy.onclick = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); } catch(e){} };
    const bClose = document.createElement('button');
    bClose.textContent = '✕ Fermer';
    bClose.style.cssText = 'flex:1;height:42px;border-radius:8px;border:1px solid #ff4d6e;background:rgba(255,77,110,.15);color:#ff4d6e;font-weight:700;';
    bClose.onclick = () => { try { document.body.removeChild(ov); } catch(e){} };
    const hint = document.createElement('div');
    hint.textContent = 'Tape dans la zone → Tout sélectionner → Copier → colle dans le chat Claude.';
    hint.style.cssText = 'font-size:11px;color:#9fb0c0;';
    row.appendChild(bCopy); row.appendChild(bClose);
    ov.appendChild(hint); ov.appendChild(ta); ov.appendChild(row);
    document.body.appendChild(ov);
  } catch (e) {}
}

async function auraDiag() {
  let txt;
  try { txt = _buildDiag(); }
  catch (e) {
    if (typeof showToast === 'function') showToast('❌ État pas prêt', 3000, 'user');
    return;
  }
  try {
    await navigator.clipboard.writeText(txt);
    if (typeof showToast === 'function') showToast('✅ Diagnostic copié — colle-le dans le chat Claude', 5000, 'user');
  } catch (e) {
    _showDiagModal(txt);   // repli : fenetre selectionnable
  }
}
window.auraDiag = auraDiag;


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
    const d    = new Date();
    const stamp = d.getFullYear() + '-' +
                  String(d.getMonth() + 1).padStart(2, '0') + '-' +
                  String(d.getDate()).padStart(2, '0')     + '_' +
                  String(d.getHours()).padStart(2, '0')    +
                  String(d.getMinutes()).padStart(2, '0');
    const fname = 'nexus_save_' + stamp + '_cycle' + S.cycle + '.json';

    // Partage natif (WebView Android) ou telechargement (navigateur).
    _shareOrDownloadJSON(json, fname).then(res => {
      if (typeof showToast !== 'function') return;
      if (res === 'fs-written')      showToast('💾 Sauvegardé dans Documents/AURA_Backups', 4000, 'user');
      else if (res === 'shared')     showToast('💾 Choisis où enregistrer (Drive, Fichiers…)', 4000, 'user');
      else if (res === 'downloaded') showToast('💾 Sauvegarde exportée : ' + fname, 4000, 'user');
      else if (res === 'cancelled')  showToast('Partage annulé', 2500, 'user');
      else                            showToast('❌ Export échoué', 4000, 'user');
    });
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
   Réglage localStorage : aura_autodl_meta {enabled, everyMin, last}
   ════════════════════════════════════════════════════════════════════ */
const AUTODL_KEY  = 'aura_autodl_meta';

function autoDlGetMeta() {
  try { const m = JSON.parse(localStorage.getItem(AUTODL_KEY)); if (m) return m; } catch(e){}
  return { enabled: false, everyMin: 180, last: 0 };   // défaut : 3h, désactivé
}
function autoDlSetMeta(m) { try { localStorage.setItem(AUTODL_KEY, JSON.stringify(m)); } catch(e){} }

// Télécharge l'état avec un nom unique (cycle + horodatage → jamais de conflit).
async function autoDlDownload() {
  try {
    if (typeof buildSnapshot !== 'function') return false;
    const snap = buildSnapshot();
    if (!snap) return false;
    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    const json = JSON.stringify(snap, null, 2);
    const d = new Date();
    const pad = n => (n<10?'0':'')+n;
    const stamp = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    const cyc = (snap && typeof snap.cycle === 'number') ? snap.cycle : 0;
    const fname = 'aura_backup_c' + cyc + '_' + stamp + '.json';
    // Ecriture native silencieuse (aucun geste utilisateur requis) -> APK Capacitor
    const fsRes = await _fsWriteBackup(json, fname);
    if (fsRes) return true;
    // Repli navigateur (Chrome) : telechargement blob
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fname;
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
    // garde-fou : ne jamais télécharger un état vide/neuf.
    // FIX : S est un `const` de portée script (02-state-init.js), donc INVISIBLE
    // à un eval('S') exécuté en scope global → l'ancien code récupérait toujours
    // cyc=-1, le garde-fou bloquait CHAQUE tick, le backup ne partait jamais et le
    // compteur restait figé sur « imminent… ». On lit le cycle via l'accesseur
    // exposé window._auraGetGlobalS(), avec repli sur buildSnapshot().
    let cyc = -1;
    try {
      const St = (typeof window._auraGetGlobalS === 'function') ? window._auraGetGlobalS() : null;
      if (St && typeof St.cycle === 'number') cyc = St.cycle;
    } catch(e){}
    if (cyc < 0) {
      try {
        if (typeof buildSnapshot === 'function') {
          const snap = buildSnapshot();
          if (snap && typeof snap.cycle === 'number') cyc = snap.cycle;
        }
      } catch(e){}
    }
    if (cyc <= 100) return;
    Promise.resolve(autoDlDownload()).then(function (ok) {
      if (ok) { m.last = now; autoDlSetMeta(m); }
    });
  } catch (e) {}
}

// Vérifie toutes les 60s si un téléchargement est dû.
if (window._autoDlTimer) clearInterval(window._autoDlTimer);
window._autoDlTimer = setInterval(autoDlTick, 60000);

// Activation auto par defaut SI le plugin natif Filesystem est present (1ere fois
// seulement -- ne touche jamais a un reglage deja choisi par l'utilisateur).
(function () {
  try {
    if (localStorage.getItem(AUTODL_KEY)) return;
    var hasFS = !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem);
    if (hasFS) autoDlSetMeta({ enabled: true, everyMin: 180, last: 0 });
  } catch (e) {}
})();

window.autoDownload = {
  getMeta: autoDlGetMeta,
  setMeta: autoDlSetMeta,
  tick:    autoDlTick,
  // active avec fréquence en minutes (5=test, 180=3h, 360=6h, 720=12h)
  enable:  (everyMin) => { const m = autoDlGetMeta(); m.enabled = true; m.everyMin = everyMin || 180; autoDlSetMeta(m); },
  disable: () => { const m = autoDlGetMeta(); m.enabled = false; autoDlSetMeta(m); },
  // telechargement immediat (nom unique) — via partage natif (WebView) ou download
  now:     () => {
    try {
      if (typeof buildSnapshot !== 'function') return false;
      const snap = buildSnapshot();
      if (!snap) return false;
      if (!snap.savedAt) snap.savedAt = new Date().toISOString();
      const json = JSON.stringify(snap, null, 2);
      const d = new Date(); const pad = n => (n<10?'0':'')+n;
      const stamp = d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
      const cyc = (snap && typeof snap.cycle === 'number') ? snap.cycle : 0;
      const fname = 'aura_backup_c'+cyc+'_'+stamp+'.json';
      if (typeof _shareOrDownloadJSON === 'function') {
        _shareOrDownloadJSON(json, fname).then(res => {
          if (typeof showToast !== 'function') return;
          if (res === 'fs-written')      showToast('💾 Backup enregistré (Documents/AURA_Backups)', 4000, 'user');
          else if (res === 'shared')     showToast('💾 Choisis où enregistrer (Drive, Fichiers…)', 4000, 'user');
          else if (res === 'downloaded') showToast('💾 Backup téléchargé : ' + fname, 4000, 'user');
          else if (res === 'cancelled')  showToast('Partage annulé', 2500, 'user');
          else                            showToast('❌ Sauvegarde échouée', 4000, 'user');
        });
        return true;
      }
      return autoDlDownload();
    } catch (e) { return false; }
  }
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
