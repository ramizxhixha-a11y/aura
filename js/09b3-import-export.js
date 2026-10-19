// [ENREGISTREMENT · 04/10/2026] VERSION 20261004a · restaurations (importState, recoverFromFiles) : enveloppe aura_guardian_full dépliée comme la bannière de 09b2 ; tout fichier sans cycle numérique (enregistrement aura_guardian_full_rec-*, autre JSON) refusé — avant, il était écrit tel quel comme état
// [GEL BOOT · 11/09/2026] VERSION 20260911c · _buildFullBackup() (backup FULL fichier) renommé _buildFullBackupFile : il écrasait _buildFullBackup(label, type) de 03 (cause racine du store aura_backups sans meta et des 2 gels de boot)
// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b3-import-export.js · VERSION 132 · 28/06/2026 ▓▓▓
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
      let snap = JSON.parse(text);
      // [ENREGISTREMENT · 04/10/2026] backup FULL = enveloppe { _type:'aura_guardian_full', aura:{état} } ; sans cycle numérique : refusé
      if (snap && snap._type === 'aura_guardian_full' && snap.aura) snap = snap.aura;
      if (snap && typeof snap.cycle !== 'number') {
        if (typeof showToast === 'function') showToast('❌ Pas une sauvegarde AURA' + (snap._type === 'aura_rec' ? ' (enregistrement du marché)' : ''), 5000, 'user');
        return;
      }

      if (!snap) {
        if (typeof showToast === 'function') showToast('❌ Fichier invalide', 4000, 'user');
        return;
      }

      // [GO RÉGLAGES · 14/10/2026] ETAT n° 12 · la confirmation dit ce qui change (3 portefeuilles et leur play / pause, AUTO / MANU, cycle, Bunker,
      // Anti-Revenge, Mode Vacances — 09b2 _chosenStateText) ; l'écriture passe par _writeChosenState (09b2) : IDB d'abord, LS allégé, repère de cycle AU
      // CYCLE DU FICHIER ; puis l'app RECHARGE (comme « RESTAURER »). Avant, le repère restait au cycle d'avant : un fichier de plus de 2 000 cycles en
      // retard était remplacé au chargement suivant par le backup Guardian le plus haut, sans rien demander ; plus près, chaque sauvegarde était refusée
      // jusqu'à ce que le cycle rattrape. Appliqué en place (loadState), l'import laissait l'écran sur un mode et l'argent sur celui du fichier, et les
      // paires de l'état d'avant dans PAIRS (relecture adverse du 14/10). Un état d'avant juillet (sans les 3 portefeuilles) est refusé.
      const refus = (typeof _chosenStateRefus === 'function') ? _chosenStateRefus(snap) : null;
      if (refus) { if (typeof showToast === 'function') showToast('❌ Refusé : ' + refus + ' · rien n\'est changé', 7000, 'critical'); return; }
      const confirmed = confirm(
        'Restaurer cette sauvegarde ?\n\n' +
        'Sauvegardé : '    + (snap.savedAt ? new Date(snap.savedAt).toLocaleString('fr-FR') : '?') + '\n\n' +
        "L'état actuel est REMPLACÉ par celui du fichier :\n" +
        (typeof _chosenStateText === 'function' ? _chosenStateText(snap) : ('Cycle : #' + snap.cycle)) + '\n\nL\'application se recharge ensuite. Continuer ?'
      );
      if (!confirmed) return;

      try {
        if (!Array.isArray(snap.chainLog)) snap.chainLog = [];
        snap.chainLog.push({ icon: '📥', desc: 'Session importée depuis fichier · cycle #' + snap.cycle, hash: (typeof rndHash === 'function') ? rndHash() : '0x' + Date.now().toString(16), time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
      } catch(e) {}
      const w = await _writeChosenState(snap);
      if (!w.idb) {
        if (typeof showToast === 'function') showToast('❌ Import NON écrit : le stockage de l\'appareil a refusé · rien n\'est changé', 6000, 'critical');
        return;
      }
      if (typeof showToast === 'function') showToast('✅ Sauvegarde écrite · cycle #' + w.cycle + ' · rechargement…', 3000, 'user');
      setTimeout(() => location.reload(), 600);   // _auraChosenStateWriting reste posé : rien ne réécrit l'état d'avant d'ici là
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
// -- Backup FULL : etat complet AURA (buildSnapshot) + donnees Guardian --
// [GEL BOOT · 11/09/2026 · c] RENOMMÉ _buildFullBackupFile. L'ancien nom `_buildFullBackup` (fonction globale de script
// classique) ÉCRASAIT `_buildFullBackup(label, type)` de 03 (chargé avant) : le backup auto quotidien de 03 recevait
// alors cet objet SANS `meta` → enregistrement inexploitable dans aura_backups, rotation plantée, un de plus par boot
// depuis le 28/06 → 2 × 6 s de désérialisation à chaque démarrage. Aucun autre fichier n'utilisait window._buildFullBackup.
function _grabGuardianData() {
  try {
    var G = window.GuardianCore;
    if (!G) return null;
    return { history: G.history || [], lastResults: G.results || [], lastRun: G.lastRun || null };
  } catch (e) { return null; }
}
function _buildFullBackupFile() {
  var snap = (typeof buildSnapshot === 'function') ? buildSnapshot() : null;
  if (!snap) return null;
  if (!snap.savedAt) snap.savedAt = new Date().toISOString();
  return {
    _type: 'aura_guardian_full',
    savedAt: new Date().toISOString(),
    auraCycle: (typeof snap.cycle === 'number') ? snap.cycle : null,
    aura: snap,
    guardian: _grabGuardianData()
  };
}
function _fullBackupName() {
  var d = new Date(); var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var stamp = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  return 'aura_guardian_full_' + stamp + '.json';
}
window._buildFullBackupFile = _buildFullBackupFile;

async function _fsWriteBackup(json, filename) {
  window._fsLastDiag = '';
  var FS = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) || null;
  if (!FS) {
    window._fsLastDiag = 'Plugin Filesystem indisponible.\n'
      + 'window.Capacitor = ' + (window.Capacitor ? 'present' : 'ABSENT') + '\n'
      + 'Plugins.Filesystem = absent\n'
      + "(soit l'app n'est pas l'APK natif, soit le plugin n'est pas charge)";
    return null;
  }
  // CIBLE : le vrai dossier Telechargements (Download/AURA). On tente la racine
  // du stockage partage d'abord, puis des replis. La pop-up dira ou ca a atterri.
  var combos = [
    { dir: 'EXTERNAL_STORAGE', path: 'Download/AURA/' + filename },
    { dir: 'EXTERNAL',         path: 'Download/AURA/' + filename },
    { dir: 'DOCUMENTS',        path: 'AURA_Backups/' + filename }
  ];
  var errors = [];
  for (var i = 0; i < combos.length; i++) {
    try {
      var r = await FS.writeFile({
        path: combos[i].path,
        data: json,
        directory: combos[i].dir,
        encoding: 'utf8',
        recursive: true
      });
      window._fsLastDir = combos[i].dir;
      window._fsLastUri = (r && r.uri) ? r.uri : '';
      window._fsLastDiag = 'Dossier : ' + combos[i].dir + '\n'
        + 'Chemin : ' + (window._fsLastUri || '(non renvoye)');
      return 'fs-written';
    } catch (e) {
      errors.push('- ' + combos[i].dir + ' (' + combos[i].path + ') : ' + ((e && (e.message || e.errorMessage)) || 'refuse'));
    }
  }
  window._fsLastDiag = 'Ecriture refusee partout :\n' + errors.join('\n');
  return null;
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

    // [GO NETTOYAGE · 18/10/2026] (ETAT n° 38) app Android : écriture native par le chemin des backups Guardian (05 _outilsSaveText → _fsWriteBackup, comme
    // l'Urgence de GO OUTILS), toast selon le résultat RÉEL et le vrai dossier — avant : _shareOrDownloadJSON, écriture refusée, retombait sur un lien blob
    // qui n'écrit rien et le toast disait « 💾 Sauvegarde exportée » ; une écriture réussie était dite « Documents/AURA_Backups » quel que soit le dossier.
    if (window.Capacitor || window.cordova) {
      const _w = (typeof _outilsSaveText === 'function') ? _outilsSaveText(json, fname, 'application/json')
        : Promise.resolve({ ok: false, diag: 'écriture native indisponible (05 _outilsSaveText absent)' });
      Promise.resolve(_w).then(r => {
        if (typeof showToast !== 'function') return;
        if (r && r.ok) showToast('💾 Sauvegarde écrite : ' + r.where, 5000, 'win');
        else showToast('❌ Sauvegarde non écrite : ' + String((r && r.diag) || 'écriture native refusée').split('\n')[0], 6000, 'warn');
      }).catch(e => { if (typeof showToast === 'function') showToast('❌ Sauvegarde non écrite : ' + ((e && e.message) || e), 6000, 'warn'); });
      return true;
    }
    // Navigateur : partage natif ou telechargement (inchangé).
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
    const full = _buildFullBackupFile();
    if (!full) return false;
    const json = JSON.stringify(full);
    const fname = _fullBackupName();
    // Ecriture native silencieuse dans Telechargements -> APK Capacitor
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
      const full = _buildFullBackupFile();
      if (!full) { try{alert('Sauvegarde indisponible : etat non pret.');}catch(e){} return false; }
      const json = JSON.stringify(full);
      const fname = _fullBackupName();
      var gOk = full.guardian ? 'oui' : 'non (Guardian non charge)';
      // DIAGNOSTIC VISIBLE : on ecrit le backup FULL et on AFFICHE l'emplacement exact.
      Promise.resolve(_fsWriteBackup(json, fname)).then(function (res) {
        var diag = window._fsLastDiag || '(pas de diagnostic)';
        if (res === 'fs-written') {
          try { alert('BACKUP FULL ENREGISTRE\n\nFichier : ' + fname + '\nDonnees Guardian : ' + gOk + '\nCycle AURA : ' + (full.auraCycle != null ? full.auraCycle : '?') + '\n\n' + diag); } catch(e){}
          if (typeof showToast === 'function') showToast('💾 Backup FULL enregistre', 4000, 'user');
        } else {
          try { alert('LE BACKUP A ECHOUE\n\n' + diag + '\n\n>> Recopie ce texte a Claude <<'); } catch(e){}
        }
      });
      return true;
    } catch (e) { try{alert('Erreur sauvegarde : ' + (e && e.message));}catch(_){} return false; }
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
          let snap = JSON.parse(txt);
          if (snap && snap._type === 'aura_guardian_full' && snap.aura) snap = snap.aura;   // [ENREGISTREMENT · 04/10/2026] enveloppe du backup FULL
          if (!snap || typeof snap.cycle !== 'number') continue;                             // enregistrement ou JSON sans état : ignoré
          const cyc = snap.cycle;
          if (!best || cyc > best.cycle) { best = snap; bestName = f.name; }
        } catch(e){}
      }
      if (!best) { if (typeof showToast === 'function') showToast('❌ Aucune sauvegarde AURA dans ce choix', 4000, 'critical'); return; }
      // [GO RÉGLAGES · 14/10/2026] même écriture et même confirmation que « Importer backup » (09b2 _writeChosenState, _chosenStateText) : IDB d'abord,
      // LS allégé (le snapshot complet dans le LS pouvait dépasser le quota et laisser l'ancien LS gagner au chargement), repère au cycle du fichier.
      const refus = (typeof _chosenStateRefus === 'function') ? _chosenStateRefus(best) : null;
      if (refus) { if (typeof showToast === 'function') showToast('❌ Refusé : ' + refus + ' · rien n\'est changé', 7000, 'critical'); return; }
      const ok = confirm('Récupérer ce backup ?\n\nFichier : ' + bestName + '\n\nL\'état actuel est REMPLACÉ par celui du fichier :\n'
        + (typeof _chosenStateText === 'function' ? _chosenStateText(best) : ('Cycle : #' + best.cycle)) + '\n\nL\'application se recharge ensuite. Continuer ?');
      if (!ok) return;
      try {
        const w = await _writeChosenState(best);
        if (!w.idb) { if (typeof showToast === 'function') showToast('❌ Récupération NON écrite : le stockage de l\'appareil a refusé · rien n\'est changé', 6000, 'critical'); return; }
        if (typeof showToast === 'function') showToast('✅ Backup récupéré : cycle ' + best.cycle + ' · rechargement…', 3000, 'user');
        setTimeout(() => location.reload(), 600);
      } catch(e) {
        try { window._auraChosenStateWriting = false; } catch(_e) {}
        try { if (typeof showToast === 'function') showToast('⚠ Récupération : ' + String(e && e.message || e).slice(0, 80), 6000, 'critical'); } catch(_e) {}
      }
    };
    input.click();
  } catch (e) {}
}
window.recoverFromFiles = recoverFromFiles;
