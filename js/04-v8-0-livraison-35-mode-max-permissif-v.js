// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 04/10
// Contient : v8-0-livraison-35-mode-max-permissif-valid, v6-0-user-controls-pending-actions-agent-m, v29-26-coach-ia-integre
// ── 07/06/2026 : 3 ecritures corrigees — sauvegardaient dans la cle morte
//    'nexus_state' (jamais relue) au lieu de nexus_state_v2 ; remplacees par
//    saveState() (cle correcte, allegee, + IndexedDB). Anti-saturation + coherence.
// ════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// v8.0 LIVRAISON 35 · MODE MAX PERMISSIF + VALIDATEUR DE COHÉRENCE
// ═══════════════════════════════════════════════════════════════════════════

// Liste des champs JAMAIS écrasables (même en max permissif)
// Données historiques critiques + capital
const AURA_PROTECTED_FIELDS = [
  'portfolio',
  'tradingAccount',
  'cashAccount',
  'fondsPropres',
  'dette',
  'totalGross',
  'totalNet',
  'winTrades',
  'totalTrades',
  'archives',
  'pnlHistory',
  '_startPortfolio',
  '_sessionStart',
  '_totalCompounded',
  '_genCount',
  'cycle',
  'ownFundsInjected',
  'ownFundsLog'
];

// Note : pairStates (qui contient les trades fermés) est protégé champ par champ
// dans la fonction importBackupMaxPermissive (les trades historiques sont préservés)

// Validateur de cohérence : retourne {ok, warnings}
function _validateBackupCoherence(state) {
  const warnings = [];

  // Levier dangereux
  const lev = state.leverage || 0;
  if (lev > 5) warnings.push('⚠ Levier élevé : ×' + lev + ' (max 10)');

  // Stake max élevé
  const prc = state.paperRealConfig || {};
  if (prc.maxStakePct && prc.maxStakePct > 20) {
    warnings.push('⚠ maxStakePct élevé : ' + prc.maxStakePct + '% (>20% risqué)');
  }

  // maxOpenPositions excessif
  if (prc.maxConcurrentPos && prc.maxConcurrentPos > 10) {
    warnings.push('⚠ Trop de positions concurrentes : ' + prc.maxConcurrentPos);
  }

  // Mode REAL activé sans confirmation
  if (state.tradingMode === 'real') {
    warnings.push('🔴 MODE RÉEL ACTIVÉ - argent réel en jeu');
  }

  // Phase 5 active mais pas Phase 4 (cohérence dépendances)
  if (state.phase5Enabled && !state.phase4Enabled) {
    warnings.push('⚠ Phase 5 active sans Phase 4 (incohérence dépendance)');
  }

  // Bonus multiplier excessif
  if (prc.bonusMultiplierMax && prc.bonusMultiplierMax > 3) {
    warnings.push('⚠ bonusMultiplierMax élevé : ×' + prc.bonusMultiplierMax);
  }

  // Cooldown très court (risque overtrading)
  if (prc.cooldownMs && prc.cooldownMs < 5 * 60 * 1000) {
    warnings.push('⚠ Cooldown très court : ' + Math.round(prc.cooldownMs/60000) + 'min');
  }

  return { ok: warnings.length === 0, warnings: warnings };
}

// Compter les changements entre l'état actuel et le backup
function _countBackupChanges(currentState, newState, allowedFields) {
  let changes = 0;
  let fields = [];
  for (const f of allowedFields) {
    if (newState.hasOwnProperty(f)) {
      try {
        const cur = JSON.stringify(currentState[f]);
        const nw = JSON.stringify(newState[f]);
        if (cur !== nw) {
          changes++;
          fields.push(f);
        }
      } catch(e) {}
    }
  }
  return { changes, fields };
}

// IMPORT MAX PERMISSIF : modifie tout sauf les champs protégés
async function importBackupMaxPermissive(file) {
  try {
    const text = await file.text();
    let backup;
    try {
      backup = JSON.parse(text);
    } catch(e) {
      throw new Error('Fichier JSON invalide');
    }

    if (!backup || !backup.meta || !backup.state) {
      throw new Error('Format de backup non reconnu');
    }
    if (backup.meta.app !== 'AURA') {
      throw new Error('Ce fichier n\'est pas un backup AURA');
    }

    // Construire la liste des champs à appliquer (tout sauf protégés)
    const allFields = Object.keys(backup.state);
    const fieldsToApply = allFields.filter(f => !AURA_PROTECTED_FIELDS.includes(f));

    // Compter les changements
    const changeInfo = _countBackupChanges(S, backup.state, fieldsToApply);

    // Validateur de cohérence
    const validation = _validateBackupCoherence(backup.state);

    // Lecture du journal de modifications
    let modLog = '';
    if (backup.meta._modifications_log && Array.isArray(backup.meta._modifications_log)) {
      modLog = '\n\n📋 JOURNAL DES MODIFICATIONS :\n';
      backup.meta._modifications_log.slice(-5).forEach((mod, i) => {
        modLog += '  ' + (i+1) + '. ' + (mod.label || 'Modification') + ' · ' + (new Date(mod.date)).toLocaleString('fr-FR') + '\n';
      });
    }

    // Construire le message de confirmation
    let confirmMsg = '🔴 IMPORT MAX PERMISSIF\n\n';
    confirmMsg += 'Date backup : ' + new Date(backup.meta.date).toLocaleString('fr-FR') + '\n';
    confirmMsg += 'Label       : ' + (backup.meta.label || '?') + '\n\n';
    confirmMsg += 'Champs à modifier : ' + changeInfo.changes + '\n';

    if (changeInfo.changes > 30) {
      confirmMsg += '⚠ Beaucoup de changements (>30) - vérifie bien la source\n';
    }

    if (validation.warnings.length > 0) {
      confirmMsg += '\n⚠ AVERTISSEMENTS DE COHÉRENCE :\n';
      validation.warnings.forEach(w => {
        confirmMsg += '  ' + w + '\n';
      });
    }

    confirmMsg += modLog;

    confirmMsg += '\n\nLes données HISTORIQUES (capital, trades, archives) sont protégées.\n';
    confirmMsg += 'Un backup auto sera créé avant l\'import.\n\n';
    confirmMsg += 'Continuer l\'import MAX PERMISSIF ?';

    if (!confirm(confirmMsg)) return;

    // Backup auto AVANT import
    const safetyBackup = _buildFullBackup('Avant import MAX · ' + new Date().toLocaleString('fr-FR'), 'pre-import');
    await _saveBackupToDB(safetyBackup);

    // Appliquer TOUS les champs autorisés
    let applied = 0;
    let skipped = 0;
    let protectedSkipped = 0;

    for (const field of allFields) {
      if (AURA_PROTECTED_FIELDS.includes(field)) {
        protectedSkipped++;
        continue;
      }
      // Cas spécial pairStates : préserver les trades historiques
      if (field === 'pairStates') {
        try {
          const newPS = backup.state[field];
          if (newPS && typeof newPS === 'object') {
            for (const pair of Object.keys(newPS)) {
              if (S.pairStates[pair]) {
                // Préserver l'historique des trades existants
                const oldTrades = S.pairStates[pair].trades || [];
                S.pairStates[pair] = JSON.parse(JSON.stringify(newPS[pair]));
                // Restaurer les trades si le backup les a écrasés
                S.pairStates[pair].trades = oldTrades;
              } else {
                S.pairStates[pair] = JSON.parse(JSON.stringify(newPS[pair]));
              }
            }
            applied++;
          }
        } catch(e) { skipped++; }
        continue;
      }
      // Cas spécial fees : préserver feeLog historique
      if (field === 'fees') {
        try {
          const newFees = backup.state[field];
          if (newFees && typeof newFees === 'object') {
            const oldFeeLog = (S.fees && S.fees.feeLog) || [];
            S.fees = JSON.parse(JSON.stringify(newFees));
            S.fees.feeLog = oldFeeLog;
            applied++;
          }
        } catch(e) { skipped++; }
        continue;
      }
      // Cas général
      try {
        S[field] = JSON.parse(JSON.stringify(backup.state[field]));
        applied++;
      } catch(e) {
        skipped++;
      }
    }

    // Sauvegarder le nouvel état
    try {
      // Sauvegarde via la fonction officielle (ecrit nexus_state_v2 allege + IDB).
      if (typeof saveState === 'function') saveState();
      else { const snap = buildSnapshot(); localStorage.setItem('nexus_state_v2', JSON.stringify(snap)); }
    } catch(e) {}

    // Refresh UI
    if (typeof renderSettingsPanel === 'function') {
      try { renderSettingsPanel(); } catch(e) {}
    }

    if (typeof showToast === 'function') {
      showToast('✅ Import MAX terminé · ' + applied + ' champs appliqués', 4000, 'win');
    }

    alert(
      '✅ Import MAX PERMISSIF réussi\n\n' +
      '• ' + applied + ' champs appliqués\n' +
      '• ' + protectedSkipped + ' champs protégés (intouchés)\n' +
      (skipped > 0 ? '• ' + skipped + ' erreurs ignorées\n' : '') +
      '\nDonnées historiques (capital, trades, archives) intactes.\n' +
      'Backup "Avant import MAX" créé pour rollback.'
    );
  } catch(e) {
    console.error('Erreur import MAX:', e);
    alert('❌ Erreur import MAX : ' + e.message);
  }
}
window.importBackupMaxPermissive = importBackupMaxPermissive;

// Handler pour le bouton MAX PERMISSIF
function handleBackupImportMaxFile(input) {
  if (!input.files || input.files.length === 0) return;
  importBackupMaxPermissive(input.files[0]);
  input.value = '';
}
window.handleBackupImportMaxFile = handleBackupImportMaxFile;

async function importBackup(file) {
  try {
    const text = await file.text();
    let backup;
    try {
      backup = JSON.parse(text);
    } catch(e) {
      throw new Error('Fichier JSON invalide');
    }

    // Validation du format
    if (!backup || !backup.meta || !backup.state) {
      throw new Error('Format de backup non reconnu');
    }
    if (backup.meta.app !== 'AURA') {
      throw new Error('Ce fichier n\'est pas un backup AURA');
    }

    // Confirmer
    const ok = confirm(
      'Importer ce backup ?\n\n' +
      '• Date : ' + new Date(backup.meta.date).toLocaleString('fr-FR') + '\n' +
      '• Version : ' + (backup.meta.version || '?') + '\n' +
      '• Label : ' + (backup.meta.label || '?') + '\n\n' +
      'Seules les CONFIGURATIONS seront appliquées.\n' +
      'Tes trades, ton capital et ton historique sont protégés.\n\n' +
      'Un backup auto sera créé avant l\'import (sécurité).'
    );
    if (!ok) return;

    // Backup auto AVANT import (Q3=A)
    const safetyBackup = _buildFullBackup('Avant import · ' + new Date().toLocaleString('fr-FR'), 'pre-import');
    await _saveBackupToDB(safetyBackup);

    // Appliquer SEULEMENT les champs autorisés
    let applied = 0;
    let skipped = 0;
    for (const field of AURA_IMPORT_ALLOWED_FIELDS) {
      if (backup.state.hasOwnProperty(field)) {
        try {
          // Deep clone pour éviter pollution
          S[field] = JSON.parse(JSON.stringify(backup.state[field]));
          applied++;
        } catch(e) {
          skipped++;
        }
      }
    }

    // Sauvegarder le nouvel état
    if (typeof saveState === 'function') {
      try { saveState(); } catch(e) {}
    } else if (typeof buildSnapshot === 'function') {
      try {
        const snap = buildSnapshot();
        localStorage.setItem('nexus_state_v2', JSON.stringify(snap));
      } catch(e) {}
    }

    // Refresh UI
    if (typeof renderSettingsPanel === 'function') {
      try { renderSettingsPanel(); } catch(e) {}
    }

    if (typeof showToast === 'function') {
      showToast('✅ Import terminé · ' + applied + ' configs appliquées', 4000, 'win');
    }

    alert(
      '✅ Import réussi\n\n' +
      '• ' + applied + ' configurations appliquées\n' +
      (skipped > 0 ? '• ' + skipped + ' ignorées (erreur)\n' : '') +
      '\nTes trades et ton capital sont intacts.\n' +
      'Le backup "Avant import" est dans l\'historique si besoin de revenir.'
    );
  } catch(e) {
    console.error('Erreur import backup:', e);
    alert('❌ Erreur import : ' + e.message);
  }
}
window.importBackup = importBackup;

// Restaurer un backup historique (depuis IndexedDB)
async function restoreBackup(id) {
  try {
    const backups = await _loadAllBackups();
    const backup = backups.find(b => b.id === id);
    if (!backup) {
      alert('Backup introuvable');
      return;
    }

    const ok = confirm(
      '⚠ RESTAURATION COMPLÈTE\n\n' +
      '• Date : ' + new Date(backup.meta.date).toLocaleString('fr-FR') + '\n' +
      '• Type : ' + backup.meta.type + '\n' +
      '• Label : ' + backup.meta.label + '\n\n' +
      'Tout l\'état actuel sera REMPLACÉ par celui de ce backup.\n' +
      'Cela inclut : trades, capital, agents, historique, etc.\n\n' +
      'Un backup de sécurité sera créé d\'abord.\n\n' +
      'Continuer ?'
    );
    if (!ok) return;

    // Backup de sécurité avant restauration
    const safetyBackup = _buildFullBackup('Avant restore · ' + new Date().toLocaleString('fr-FR'), 'pre-import');
    await _saveBackupToDB(safetyBackup);

    // Restaurer TOUT l'état (différent de l'import qui est sélectif)
    try {
      const restored = backup.state;
      Object.keys(restored).forEach(key => {
        try {
          S[key] = JSON.parse(JSON.stringify(restored[key]));
        } catch(e) {}
      });
    } catch(e) {
      console.error('Erreur restauration:', e);
      alert('❌ Erreur lors de la restauration : ' + e.message);
      return;
    }

    // Sauvegarder l'état restauré
    try {
      // Sauvegarde via la fonction officielle (ecrit nexus_state_v2 allege + IDB).
      if (typeof saveState === 'function') saveState();
      else { const snap = buildSnapshot(); localStorage.setItem('nexus_state_v2', JSON.stringify(snap)); }
    } catch(e) {}

    if (typeof showToast === 'function') {
      showToast('✅ Backup restauré', 3000, 'win');
    }

    alert('✅ Backup restauré.\nL\'application va se recharger.');
    setTimeout(() => location.reload(), 800);
  } catch(e) {
    alert('❌ Erreur restauration : ' + e.message);
  }
}
window.restoreBackup = restoreBackup;

// Suppression d'un backup
async function deleteBackup(id) {
  if (!confirm('Supprimer ce backup ?')) return;
  await _deleteBackup(id);
  // v15 · BUG FIX : recharger le cache AVANT de re-render
  // (sinon l'ancien cache est utilisé et le backup semble toujours présent)
  await new Promise(resolve => {
    _loadAllBackups().then(list => {
      _cachedBackupsList = list;
      resolve();
    }).catch(() => resolve());
  });
  if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
  if (typeof showToast === 'function') showToast('🗑 Backup supprimé', 1500, 'user');
}
window.deleteBackup = deleteBackup;

// Handler pour input file
function handleBackupImportFile(input) {
  if (!input.files || input.files.length === 0) return;
  importBackup(input.files[0]);
  input.value = '';
}
window.handleBackupImportFile = handleBackupImportFile;

// Récupérer les backups pour le rendu
let _cachedBackupsList = [];
function _refreshBackupsCache() {
  _loadAllBackups().then(list => {
    _cachedBackupsList = list;
    if (typeof renderSettingsPanel === 'function') {
      try { renderSettingsPanel(); } catch(e) {}
    }
  });
}
window._refreshBackupsCache = _refreshBackupsCache;

// Démarrage : backup auto + cache initial
setTimeout(() => {
  _checkAutoBackup();
  _refreshBackupsCache();
}, 3000);

function renderSettingsPanel() {
  const el = document.getElementById('settingsContent');
  if(!el) return;

  // v8.0 LIVRAISON 31 · Sélecteur de thème RETIRÉ du panneau Réglages

  const archives = (S.archives && S.archives.snapshots) || [];
  const totalResets = (S.archives && S.archives.totalResets) || 0;

  // Reset rows
  const rows = RESET_DOMAINS.map(d => {
    let metric = '';
    try { metric = d.metric(); } catch(e) { metric = '…'; }

    if(_pendingReset === d.id) {
      return `<div class="confirm-bar">
        <div class="confirm-text">Archiver puis remettre à 0 <strong>${d.name}</strong> ?</div>
        <div class="confirm-action">
          <button class="confirm-no"  onclick="cancelReset()">Non</button>
          <button class="confirm-yes" onclick="archiveAndReset('${d.id}')">Oui, reset</button>
        </div>
      </div>`;
    }

    return `<div class="domain-row">
      <div class="domain-icon">${d.icon}</div>
      <div class="domain-body">
        <div class="domain-name">${d.name}</div>
        <div class="domain-meta">${metric}</div>
      </div>
      <button class="domain-reset-btn" onclick="requestReset('${d.id}')">RESET</button>
    </div>`;
  }).join('');

  // Full reset block
  const fullResetBlock = _pendingReset === '__all__' ? `
    <div class="confirm-bar">
      <div class="confirm-text"><strong>Reset complet</strong> de tous les domaines ? ${RESET_DOMAINS.length} snapshots créés.</div>
      <div class="confirm-action">
        <button class="confirm-no"  onclick="cancelReset()">Non</button>
        <button class="confirm-yes" onclick="archiveAndResetAll();cancelReset()">Oui, tout reset</button>
      </div>
    </div>` : `
    <div class="full-reset-row">
      <div class="full-reset-icon">🔄</div>
      <div class="full-reset-body">
        <div class="full-reset-title">Reset complet</div>
        <div class="full-reset-desc">Archive les 9 domaines puis remet tous les compteurs à 0. Les snapshots restent consultables.</div>
      </div>
      <button class="full-reset-btn" onclick="requestReset('__all__')">TOUT RESET</button>
    </div>`;

  // Archives
  let archivesHtml;
  if(archives.length === 0) {
    archivesHtml = `<div class="empty-archives">Aucune archive pour l'instant.<br>Les snapshots apparaîtront ici après chaque reset.</div>`;
  } else {
    archivesHtml = archives.slice(0, 20).map((snap, i) => {
      const d = new Date(snap.ts);
      const mm = String(d.getMonth()+1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mn = String(d.getMinutes()).padStart(2, '0');
      const dateStr = `${dd}/${mm}`;
      const timeStr = `${hh}:${mn}`;

      let detail = '';
      if(_expandedArchiveIdx === i) {
        const dataStr = JSON.stringify(snap.data, null, 2);
        const trimmed = dataStr.length > 1400 ? dataStr.slice(0, 1400) + '\n\n… (' + (dataStr.length - 1400) + ' car. supplémentaires)' : dataStr;
        detail = `<div class="archive-detail">${trimmed.replace(/</g, '&lt;')}</div>`;
      }

      return `<div>
        <div class="archive-row" onclick="toggleArchiveDetail(${i})">
          <div class="archive-date">${dateStr}<br>${timeStr}</div>
          <div class="archive-body">
            <div class="archive-domain">${snap.icon} ${snap.domainName}</div>
            <div class="archive-summary">${snap.metricAtReset || ''}</div>
          </div>
          <span class="archive-chevron">${_expandedArchiveIdx === i ? '▾' : '›'}</span>
        </div>
        ${detail}
      </div>`;
    }).join('');
  }

  // v8.0 LIVRAISON 33 · Helpers HTML pour la nouvelle organisation

  // Helper : historique des backups (Q2=B : par catégorie avec séparateurs)
  let HISTORIQUE_HTML = '';
  if (!_cachedBackupsList || _cachedBackupsList.length === 0) {
    HISTORIQUE_HTML = '<div style="text-align:center;padding:14px;color:var(--t3);font-size:10px;">Aucun backup pour l\'instant.<br>Le 1er backup auto sera créé sous peu.</div>';
  } else {
    const autos = _cachedBackupsList.filter(b => b.meta.type === 'auto');
    const manuels = _cachedBackupsList.filter(b => b.meta.type === 'manual');
    const preImports = _cachedBackupsList.filter(b => b.meta.type === 'pre-import');
    const renderBackup = (b) => {
      const d = new Date(b.meta.date);
      const dateStr = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      const sizeKo = b.meta.sizeChars ? Math.round(b.meta.sizeChars / 1024) : '?';
      return '<div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;padding:6px 8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:6px;font-size:10px;margin-bottom:4px;">' +
        '<div style="color:var(--t1);font-family:var(--font-mono);font-size:9.5px;">' + dateStr + ' · ' + sizeKo + 'Ko</div>' +
        '<button onclick="restoreBackup(' + b.id + ')" style="padding:3px 7px;background:rgba(0,232,122,.15);border:1px solid rgba(0,232,122,.3);border-radius:4px;color:var(--up);font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;">RESTAURER</button>' +
        '<button onclick="deleteBackup(' + b.id + ')" style="padding:3px 5px;background:rgba(255,61,107,.10);border:1px solid rgba(255,61,107,.20);border-radius:4px;color:var(--down);font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;">✕</button>' +
      '</div>';
    };
    let html = '<div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;">';
    if (autos.length > 0) {
      html += '<div style="font-size:9px;color:var(--ice);font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 0 2px;">🤖 AUTO (' + autos.length + ')</div>';
      html += autos.map(renderBackup).join('');
    }
    if (manuels.length > 0) {
      html += '<div style="font-size:9px;color:var(--gold);font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:6px 0 2px;">✋ MANUELS (' + manuels.length + ')</div>';
      html += manuels.map(renderBackup).join('');
    }
    if (preImports.length > 0) {
      html += '<div style="font-size:9px;color:var(--down);font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:6px 0 2px;">🛡 PRÉ-IMPORTS (' + preImports.length + ')</div>';
      html += preImports.map(renderBackup).join('');
    }
    html += '</div>';
    HISTORIQUE_HTML = html;
  }

  // Helper : déblocages (compteurs live)
  let DEBLOCAGES_HTML = '';
  {
    let blacklisted = 0, withStreak = 0, broken = 0;
    try {
      if (S._lossStreaks) {
        const now = Date.now();
        Object.values(S._lossStreaks).forEach(s => {
          if (s.blacklistedUntil && s.blacklistedUntil > now) blacklisted++;
          if ((s.count || 0) > 0) withStreak++;
        });
      }
      if (S.agents) broken = S.agents.filter(a => !a.isBot && (a.fitness || 0) <= 80).length;
    } catch(e) {}
    const btnStyle = (active) => 'background:' + (active ? 'rgba(167,139,250,.18)' : 'rgba(167,139,250,.05)') + ';color:' + (active ? 'var(--pur)' : 'rgba(167,139,250,.55)') + ';border:1px solid ' + (active ? 'rgba(167,139,250,.5)' : 'rgba(167,139,250,.2)') + ';border-radius:8px;padding:10px 12px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.05em;text-align:left;display:flex;justify-content:space-between;align-items:center;width:100%;';
    const badge = (n, active) => '<span style="background:' + (active ? 'rgba(167,139,250,.3)' : 'rgba(120,130,150,.15)') + ';color:' + (active ? '#fff' : 'var(--t3)') + ';font-size:10px;font-weight:800;padding:2px 8px;border-radius:8px;letter-spacing:0;">' + n + '</span>';
    DEBLOCAGES_HTML = '<div style="display:flex;flex-direction:column;gap:6px;">' +
      '<button onclick="window._resetPairBlacklists()" style="' + btnStyle(blacklisted>0) + '"><span>🔓 Réactiver paires blacklistées</span>' + badge(blacklisted, blacklisted>0) + '</button>' +
      '<button onclick="window._resetLossStreaks()" style="' + btnStyle(withStreak>0) + '"><span>🔄 Reset streaks de pertes</span>' + badge(withStreak, withStreak>0) + '</button>' +
      '<button onclick="window._revigorBrokenAgents()" style="' + btnStyle(broken>0) + '"><span>🔄 Revigorer agents cassés</span>' + badge(broken, broken>0) + '</button>' +
    '</div>';
  }

  // Helper : long-press buttons (5 comptes)
  const _longpressAccounts = [
    { id:'caisse', label:'Caisse (USDT)', color:'var(--ice)' },
    { id:'trading', label:'Compte trading (USDT)', color:'var(--up)' },
    { id:'fondsPropres', label:'Fonds propres (€)', color:'#a78bfa' },
    { id:'reserveFiscale', label:'Réserve fiscale (USDT)', color:'#f5c542' },
    { id:'dette', label:'Dette levier', color:'var(--down)' }
  ];
  // v8.0 LIVRAISON 36 · Boutons long-press avec les IDs requis par _lpTick (FIX)
  const LONGPRESS_HTML = '<div style="display:flex;flex-direction:column;gap:6px;">' +
    _longpressAccounts.map(acc =>
      '<button class="nexus-longpress-btn" data-acc="' + acc.id + '"' +
      ' ontouchstart="_longPressStart(event,\'' + acc.id + '\')"' +
      ' ontouchend="_longPressEnd(event,\'' + acc.id + '\')"' +
      ' ontouchcancel="_longPressEnd(event,\'' + acc.id + '\')"' +
      ' onmousedown="_longPressStart(event,\'' + acc.id + '\')"' +
      ' onmouseup="_longPressEnd(event,\'' + acc.id + '\')"' +
      ' onmouseleave="_longPressEnd(event,\'' + acc.id + '\')"' +
      ' style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.05em;text-align:left;color:' + acc.color + ';font-family:inherit;width:100%;position:relative;overflow:hidden;">' +
      '<div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;">' +
      '  <span>⚠ ' + acc.label + '</span>' +
      '  <span id="lpLabel_' + acc.id + '" style="font-size:9px;font-weight:600;color:var(--t3);letter-spacing:.05em;">MAINTENIR 2s</span>' +
      '</div>' +
      '<div id="lpFill_' + acc.id + '" style="position:absolute;left:0;top:0;height:100%;width:0;background:' + acc.color + ';opacity:.22;transition:width 0.05s linear;z-index:1;"></div>' +
      '</button>'
    ).join('') + '</div>';


  el.innerHTML = `
    <!-- Section Sauvegarde : téléchargement auto hors-navigateur + récupération -->
    <div class="pref-section" style="margin:0 0 14px 0;padding:12px;background:var(--s1);border:1px solid var(--border);border-radius:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">💾 Sauvegarde hors-navigateur</div>
      <div style="font-size:9px;color:var(--t3);line-height:1.5;margin-bottom:10px;">Télécharge un fichier de l'état dans tes Téléchargements, en rotation sur 3 fichiers (A/B/C) qui s'écrasent. Survit au vidage du cache. Une synchro Android peut l'envoyer sur Drive.</div>
      ${(() => {
        const ad = (window.autoDownload ? window.autoDownload.getMeta() : { enabled:false, everyMin:180, last:0 });
        const freqLabel = ad.everyMin < 60 ? ad.everyMin + ' min' : (ad.everyMin/60) + 'h';
        let countdown = '—';
        if (ad.enabled) {
          if (!ad.last) countdown = 'au prochain cycle';
          else { let r = ad.last + ad.everyMin*60000 - Date.now(); if (r<=0) countdown='imminent…'; else { const h=Math.floor(r/3600000),mn=Math.floor((r%3600000)/60000),s=Math.floor((r%60000)/1000); countdown=(h>0?h+'h ':'')+mn+'min '+(s<10?'0':'')+s+'s'; } }
        }
        const mkBtn = (min,lbl) => `<button onclick="if(window.autoDownload){window.autoDownload.enable(${min});renderSettingsPanel();}" style="flex:1;min-width:52px;height:30px;border-radius:8px;border:1px solid ${ad.enabled&&ad.everyMin===min?'rgba(0,232,122,.5)':'var(--border)'};background:${ad.enabled&&ad.everyMin===min?'rgba(0,232,122,.15)':'var(--s2)'};color:${ad.enabled&&ad.everyMin===min?'var(--up)':'var(--t2)'};font-size:10px;font-weight:700;cursor:pointer;">${lbl}</button>`;
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:600;color:var(--t1);">Téléchargement auto ${ad.enabled?'· '+freqLabel:''}</div>
            <div style="font-size:9px;color:var(--t3);margin-top:2px;">${ad.enabled?'⏳ Prochain dans : <b id="savCountdown" style="color:var(--up)">'+countdown+'</b>':'désactivé'}</div>
          </div>
          <button onclick="if(window.autoDownload){if(${ad.enabled}){window.autoDownload.disable();}else{window.autoDownload.enable(180);}renderSettingsPanel();}" style="min-width:54px;height:28px;border-radius:14px;border:1px solid ${ad.enabled?'rgba(0,232,122,.4)':'var(--border)'};background:${ad.enabled?'rgba(0,232,122,.15)':'var(--s2)'};color:${ad.enabled?'var(--up)':'var(--t3)'};font-size:10px;font-weight:700;cursor:pointer;">${ad.enabled?'ON':'OFF'}</button>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:10px;">${mkBtn(5,'5min')}${mkBtn(180,'3h')}${mkBtn(360,'6h')}${mkBtn(720,'12h')}</div>
        <div style="display:flex;gap:6px;">
          <button onclick="if(window.autoDownload)window.autoDownload.now();" style="flex:1;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--s2);color:var(--t1);font-size:11px;font-weight:700;cursor:pointer;">⬇ Télécharger maintenant</button>
          <button onclick="if(window.recoverFromFiles)window.recoverFromFiles();" style="flex:1;height:32px;border-radius:8px;border:1px solid rgba(0,232,122,.4);background:rgba(0,232,122,.12);color:var(--up);font-size:11px;font-weight:700;cursor:pointer;">📂 Récupérer un backup</button>
        </div>`;
      })()}
    </div>

    <!-- v7.0: Préférences utilisateur -->
    <div class="pref-section" style="margin:0 0 14px 0;padding:12px;background:var(--s1);border:1px solid var(--border);border-radius:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">🔔 Préférences</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:600;color:var(--t1);">Notifications verbeuses</div>
          <div style="font-size:9px;color:var(--t3);margin-top:2px;line-height:1.4;">${S.toastVerbose ? 'Toutes les actions bot visibles' : 'Silencieux — seuls les événements critiques et vos actions'}${S._silencedCount ? ` · <span style="color:var(--gold);">${S._silencedCount} silenciées</span>` : ''}</div>
        </div>
        <button onclick="S.toastVerbose=!S.toastVerbose;S._silencedCount=0;renderSettingsPanel();" style="min-width:54px;height:28px;border-radius:14px;border:1px solid ${S.toastVerbose?'rgba(0,232,122,.4)':'var(--border)'};background:${S.toastVerbose?'rgba(0,232,122,.15)':'var(--s2)'};color:${S.toastVerbose?'var(--up)':'var(--t3)'};font-size:10px;font-weight:700;cursor:pointer;transition:all .2s;">${S.toastVerbose?'ON':'OFF'}</button>
      </div>
    </div>

    <!-- v7.2 Phase 18 · Performance monitoring -->
    ${(() => {
      const p = S.perf || { avgMs: 0, maxMs: 0, samples: 0, lastMs: 0 };
      if(!p.samples) return '';
      const avgCol = p.avgMs < 50 ? 'var(--up)' : p.avgMs < 150 ? 'var(--gold)' : 'var(--down)';
      const health = p.avgMs < 50 ? 'EXCELLENT' : p.avgMs < 150 ? 'CORRECT' : 'LENT';
      return `<div style="margin:0 0 14px 0;padding:12px;background:var(--s1);border:1px solid var(--border);border-radius:12px;">
        <div style="font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">⚡ Performance · ${p.samples} ticks</div>
        <div style="display:flex;gap:12px;font-family:var(--font-mono);font-size:11px;">
          <div style="flex:1;"><div style="color:var(--t3);font-size:8px;">MOY</div><div style="color:${avgCol};font-weight:700;">${p.avgMs.toFixed(1)}ms</div></div>
          <div style="flex:1;"><div style="color:var(--t3);font-size:8px;">MAX</div><div style="color:var(--t1);">${p.maxMs.toFixed(1)}ms</div></div>
          <div style="flex:1;"><div style="color:var(--t3);font-size:8px;">DERNIER</div><div style="color:var(--t1);">${(p.lastMs||0).toFixed(1)}ms</div></div>
          <div style="flex:1;text-align:right;"><div style="color:var(--t3);font-size:8px;">ÉTAT</div><div style="color:${avgCol};font-weight:700;font-size:9px;">${health}</div></div>
        </div>
      </div>`;
    })()}


    <!-- ════════════════════════════════════════════════ -->
    <!-- v7.12 LIVRAISON 8 · MODE Réel (entre sim et real) -->
    <!-- ════════════════════════════════════════════════ -->
    ${(function(){
      const isPaperReal = S.tradingMode === 'paperReal';
      const tf = S.paperRealTimeframe || '15m';
      const activePairs = S.paperRealActivePairs || {};
      const killSwitch = S.paperRealKillSwitch || {};
      const cfg = S.paperRealConfig || {};
      const now = Date.now();
      const globalPaused = (S.paperRealGlobalPauseUntil || 0) > now;
      const remainingMs = globalPaused ? S.paperRealGlobalPauseUntil - now : 0;
      const remainingMin = Math.ceil(remainingMs / 60000);

      // Liste des paires
      const pairsHTML = Object.keys(PAIRS || {}).map(pair => {
        const isActive = !!activePairs[pair];
        const ks = killSwitch[pair] || {};
        const isPaused = !!ks.paused;
        const eligibility = (typeof _isPairRealEligible === 'function') ? _isPairRealEligible(pair, tf) : { ok:false, reason:'init' };
        const eligible = eligibility.ok;
        const lastClose = (S.paperRealLastClose || {})[pair] || 0;
        const cooldownMs = cfg.cooldownMs || 30 * 60 * 1000;
        const inCooldown = lastClose > 0 && (now - lastClose) < cooldownMs;
        const cooldownLeft = inCooldown ? Math.ceil((cooldownMs - (now - lastClose))/60000) : 0;
        let stateLbl = '';
        let stateCol = 'var(--t3)';
        if (isPaused) { stateLbl = '⏸ ' + (ks.reason||'Pause'); stateCol = 'var(--gold)'; }
        else if (inCooldown) { stateLbl = '⏱ Cooldown · ' + cooldownLeft + 'min'; stateCol = 'var(--gold)'; }
        else if (!eligible) { stateLbl = '⚠ ' + eligibility.reason; stateCol = 'var(--gold)'; }
        else if (isActive) { stateLbl = '● Actif'; stateCol = 'var(--up)'; }
        else { stateLbl = '○ Inactif'; stateCol = 'var(--t3)'; }
        const cfgPair = PAIRS[pair] || {};
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(20,25,35,.6);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:${cfgPair.color || 'var(--t1)'};font-weight:800;font-size:11px;font-family:ui-monospace,monospace;">${pair.split('/')[0]}</span>
              <span style="color:${stateCol};font-size:9px;font-weight:600;">${stateLbl}</span>
            </div>

          </div>
        `;
      }).join('');

      // Sélecteur timeframe
      const tfButtons = ['5m','15m','1h','4h','1j'].map(t => {
        const sel = (t === tf);
        return ``;
      }).join('');

      // Bouton master
      const masterBtn = isPaperReal ? `
        ` : (S.tradingMode === 'real' ? `
        <button disabled style="background:var(--s2);color:var(--t3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:11px;font-weight:700;cursor:not-allowed;letter-spacing:.05em;width:100%;display:flex;justify-content:space-between;align-items:center;opacity:.5;">
          <span>Mode RÉEL actif · désactive-le d'abord</span>
        </button>` : `
        `);

      const headerCol = isPaperReal ? 'var(--gold)' : 'var(--t2)';
      const headerBg = isPaperReal ? 'rgba(245,166,35,.07)' : 'rgba(245,166,35,.02)';
      const headerBorder = isPaperReal ? 'rgba(245,166,35,.35)' : 'rgba(245,166,35,.15)';


      const stats = S.paperRealStats || {};
      const tradedPairs = Object.keys(stats).filter(p => stats[p].trades > 0);
      const statsHTML = tradedPairs.length > 0 ? `
        <div style="font-size:9px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
          <span>📊 Performance Réel</span>
          <span style="font-size:8.5px;letter-spacing:0;text-transform:none;color:var(--t3);font-weight:600;opacity:.7;">WR récent · global</span>
        </div>
        <div style="margin-bottom:14px;">${tradedPairs.map(pair => {
          const s = stats[pair];
          const tot = s.wins + s.losses;
          const wrAll = tot > 0 ? Math.round(s.wins / tot * 100) : 0;
          const recent = s.lastTrades || [];
          const recentWins = recent.filter(v => v > 0).length;
          const wrRecent = recent.length > 0 ? Math.round(recentWins / recent.length * 100) : null;
          const wrRef = wrRecent != null ? wrRecent : wrAll;
          let dotCol = 'var(--t3)';
          if (wrRef >= 60) dotCol = 'var(--up)';
          else if (wrRef >= 45) dotCol = 'var(--gold)';
          else dotCol = 'var(--down)';
          const cfgP = PAIRS[pair] || {};
          const sym = pair.split('/')[0];
          const pnlCol = s.pnlNet >= 0 ? 'var(--up)' : 'var(--down)';
          const pnlSign = s.pnlNet >= 0 ? '+' : '';
          const wrTxt = wrRecent != null ? wrRecent + '%·' + wrAll + '%' : wrAll + '%';
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:8px;margin-bottom:5px;font-size:10px;">
              <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dotCol};flex-shrink:0;"></span>
                <span style="color:${cfgP.color||'var(--t1)'};font-weight:800;font-family:ui-monospace,monospace;min-width:36px;">${sym}</span>
                <span style="color:var(--t2);font-family:ui-monospace,monospace;font-size:9.5px;">${s.wins}W·${s.losses}L</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;font-family:ui-monospace,monospace;">
                <span style="color:${dotCol};font-weight:700;font-size:10px;">${wrTxt}</span>
                <span style="color:${pnlCol};font-weight:800;font-size:10px;min-width:60px;text-align:right;">${pnlSign}$${s.pnlNet.toFixed(2)}</span>
              </div>
            </div>
          `;
        }).join('')}</div>` : '';

      // Bandeau pause globale si actif
      const globalPauseBanner = globalPaused ? `
        <div style="background:rgba(255,61,107,.1);border:1px solid rgba(255,61,107,.4);border-radius:8px;padding:8px 10px;margin-bottom:12px;font-size:10px;color:var(--down);font-weight:700;text-align:center;">
          🛑 Pause globale active · ${remainingMin} min restantes (3 pertes consécutives)
        </div>` : '';

      return `
      <div style="margin:16px 0 8px;padding:14px;background:${headerBg};border:1px solid ${headerBorder};border-radius:12px;">
        <div style="font-size:12px;font-weight:700;color:${headerCol};text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <span>${isPaperReal?'📋':'🧪'} Mode Réel · ${isPaperReal?'ACTIF':'inactif'}</span>
          <span style="font-size:9px;font-weight:600;opacity:.7;letter-spacing:0;text-transform:none;">${isPaperReal?'test sécurisé':'option intermédiaire'}</span>
        </div>
        <div style="font-size:9.5px;color:var(--t2);line-height:1.5;margin-bottom:12px;">
          ${isPaperReal
            ? '<b style="color:var(--gold)">Mode Réel actif.</b> Vraies bougies Binance · règles strictes : 1 position max, arrêt -3%, gain +2%, pause 30min après perte, arrêt global après 3 pertes.'
            : 'Mode trading réel. Utilise vraies bougies Binance avec règles de protection strictes pour tester la stratégie sans gros risque.'}
        </div>
        ${globalPauseBanner}

        ${statsHTML}

        <!-- Règles affichées -->
        <div style="font-size:9px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Règles actives</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;font-size:9.5px;font-family:ui-monospace,monospace;color:var(--t2);">
          <div style="padding:5px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;">Pos max : <b style="color:var(--gold);">${cfg.maxConcurrentPos||1}</b></div>
          <div style="padding:5px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;">Stake max : <b style="color:var(--gold);">${cfg.maxStakePct||5}%</b></div>
          <div style="padding:5px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;">Arrêt perte : <b style="color:var(--down);">-${cfg.stopLossPct||3}%</b></div>
          <div style="padding:5px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;">Gain cible : <b style="color:var(--up);">+${cfg.takeProfitPct||2}%</b></div>
          <div style="padding:5px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;">Cooldown : <b style="color:var(--gold);">${Math.round((cfg.cooldownMs||1800000)/60000)}min</b></div>
          <div style="padding:5px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;">Stop : <b style="color:var(--down);">${cfg.maxConsecLosses||3} pertes</b></div>
        </div>

        <!-- Timeframe -->
        <div style="font-size:9px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Timeframe décisions bot</div>
        <div style="display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap;">${tfButtons}</div>

        <!-- Paires -->
        <div style="font-size:9px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Paires actives en Réel</div>
        <div style="margin-bottom:14px;">${pairsHTML}</div>

        <!-- Bouton master -->
        ${masterBtn}
      </div>
      `;
    })()}

    <!-- v7.12 LIVRAISON 17 · PHASE 1 · PANNEAU DIAGNOSTIC INTELLIGENCE -->
    <!-- ════════════════════════════════════════════════════════════════ -->
    ${(function(){
      // Affiché uniquement si mode Réel (sinon non pertinent)
      if (S.tradingMode !== 'paperReal') return '';
      const adapt = S.adaptiveState || {};
      const cfg = S.paperRealConfig || {};
      const wr = adapt.lastEffectiveWR;
      const wrLabel = wr === null || wr === undefined ? '— (pas assez de trades)' : (Math.round(wr * 100) + '%');
      const wrColor = wr === null || wr === undefined ? 'var(--t3)' : (wr >= 0.55 ? 'var(--up)' : wr >= 0.45 ? 'var(--gold)' : 'var(--down)');
      const consecThresh = adapt.lastConsecLossThresh || cfg.maxConsecLosses || 3;
      const cooldownMs = adapt.lastCooldownMs || cfg.cooldownMs || 30*60*1000;
      const cooldownMin = Math.round(cooldownMs / 60000);
      const median = adapt.lastMarketVolatility;
      const medianLabel = median === null || median === undefined ? '—' : (median.toFixed(2) + '%');
      const tpUsed = adapt.lastTpUsed || '—';
      const slUsed = adapt.lastSlUsed || '—';
      const bonuses = adapt.lastBonusMultipliers || {};
      const bonusKeys = Object.keys(bonuses).filter(k => bonuses[k] > 1.0);
      const bonusHTML = bonusKeys.length > 0 ? bonusKeys.map(p => {
        const sym = p.split('/')[0];
        const m = bonuses[p];
        return `<span style="display:inline-block;background:rgba(0,232,122,.10);color:var(--up);border:1px solid rgba(0,232,122,.3);border-radius:6px;padding:3px 8px;font-size:9px;font-weight:700;font-family:ui-monospace,monospace;margin:2px;">${sym} × ${m.toFixed(2)}</span>`;
      }).join('') : '<span style="color:var(--t3);font-size:9.5px;">Aucun bonus actif · paires en cours d&apos;évaluation</span>';

      return `
      <!-- v8.0 LIVRAISON 25 · PANNEAU P&L PAR PÉRIODE + BOUTON RESET -->
      ${(function(){
        const periods = (typeof _computePnlByPeriod === 'function') ? _computePnlByPeriod() : null;
        if (!periods) return '';

        const formatPnl = function(p) {
          if (!p.hasData) return '<span style="color:var(--t3);">— pas de donnée</span>';
          const cls = p.pct >= 0 ? 'var(--up)' : 'var(--down)';
          const sign = p.pct >= 0 ? '+' : '';
          return '<span style="color:' + cls + ';font-weight:700;">' + sign + p.pct.toFixed(2) + '% · ' + sign + '$' + p.usd.toFixed(2) + '</span>';
        };

        // Stats sur l'historique (jours suivis)
        const history = (S.pnlPeriod && S.pnlPeriod.history) || [];
        const winDays = history.filter(h => h.pnlPct > 0).length;
        const totalDays = history.length;
        const winRate = totalDays > 0 ? Math.round((winDays / totalDays) * 100) : 0;
        const totalPnl = history.reduce((sum, h) => sum + (h.pnlUsd || 0), 0);

        return '' +
        '<div style="margin:16px 0 8px;padding:14px;background:rgba(245,200,66,.04);border:1px solid rgba(245,200,66,.2);border-radius:12px;">' +
          '<div style="font-size:12px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">' +
            '<span>📊 P&L par période</span>' +
            '<span style="font-size:9px;font-weight:600;opacity:.7;letter-spacing:0;text-transform:none;">recalibrage auto</span>' +
          '</div>' +
          '<div style="font-size:9.5px;color:var(--t2);line-height:1.5;margin-bottom:12px;">' +
            'Reset automatique tous les jours à minuit. Tu vois ce qui se passe vraiment, pas un cumul absurde.' +
          '</div>' +

          '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;font-size:10.5px;font-family:ui-monospace,monospace;">' +
            '<span style="color:var(--t2);font-weight:700;">📅 Aujourd&apos;hui</span>' +
            formatPnl(periods.today) +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;font-size:10.5px;font-family:ui-monospace,monospace;">' +
            '<span style="color:var(--t2);font-weight:700;">📆 Semaine en cours</span>' +
            formatPnl(periods.week) +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;font-size:10.5px;font-family:ui-monospace,monospace;">' +
            '<span style="color:var(--t2);font-weight:700;">🗓️ Mois en cours</span>' +
            formatPnl(periods.month) +
          '</div>' +

          (totalDays > 0 ?
            '<div style="padding:8px 12px;background:rgba(167,139,250,.04);border:1px solid rgba(167,139,250,.2);border-radius:8px;margin-bottom:10px;font-size:9.5px;font-family:ui-monospace,monospace;">' +
              '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
                '<span style="color:var(--t2);">Historique cumulé</span>' +
                '<span style="color:var(--pur);font-weight:700;">' + totalDays + ' jours</span>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;font-size:9px;">' +
                '<span style="color:var(--t3);">Jours gagnants : <b style="color:' + (winRate >= 55 ? 'var(--up)' : winRate >= 45 ? 'var(--gold)' : 'var(--down)') + ';">' + winRate + '%</b></span>' +
                '<span style="color:var(--t3);">Total : <b style="color:' + (totalPnl >= 0 ? 'var(--up)' : 'var(--down)') + ';">' + (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toFixed(2) + '</b></span>' +
              '</div>' +
            '</div>' : '') +

          '<button onclick="resetPnlSession()" style="width:100%;padding:10px 14px;background:rgba(245,200,66,.10);border:1px solid rgba(245,200,66,.4);color:var(--gold);border-radius:8px;font-weight:700;font-size:11px;letter-spacing:.04em;cursor:pointer;-webkit-user-select:none;font-family:inherit;">🔄 Recalibrer la session manuellement</button>' +

          '<div style="font-size:8.5px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.4;">' +
            'Apprentissage du bot, mémoire, agents : <b>tout est préservé</b>. Seuls les compteurs P&L sont remis à zéro.' +
          '</div>' +
        '</div>';
      })()}

      <div style="margin:16px 0 8px;padding:14px;background:rgba(167,139,250,.04);border:1px solid rgba(167,139,250,.2);border-radius:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--pur);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <span>🧠 Diagnostic intelligence · Phase 1</span>
          <span style="font-size:9px;font-weight:600;opacity:.7;letter-spacing:0;text-transform:none;">auto-réglage</span>
        </div>
        <div style="font-size:9.5px;color:var(--t2);line-height:1.5;margin-bottom:12px;">
          Le bot ajuste ces paramètres en temps réel selon ses observations. Bornes de sécurité actives.
        </div>

        <!-- 1.1 Seuil pertes consécutives -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;">
          <span style="color:var(--t2);">1.1 · Pause après pertes consécutives</span>
          <span style="color:var(--gold);font-weight:700;">${consecThresh} pertes</span>
        </div>
        <div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:8px;">
          WR effectif : <span style="color:${wrColor};font-weight:700;">${wrLabel}</span> · borné [3, 6]
        </div>

        <!-- 1.2 Cooldown -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;">
          <span style="color:var(--t2);">1.2 · Cooldown après perte</span>
          <span style="color:var(--gold);font-weight:700;">${cooldownMin} min</span>
        </div>
        <div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:8px;">
          Volatilité médiane marché : <span style="color:var(--t1);font-weight:700;">${medianLabel}</span> · borné [15, 90] min
        </div>

        <!-- 1.3 TP/SL utilisés -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;">
          <span style="color:var(--t2);">1.3 · TP / SL méthode</span>
          <span style="color:var(--up);font-weight:700;">${tpUsed} / ${slUsed}</span>
        </div>
        <div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:8px;">
          Multiple ATR par défaut : SL=${cfg.slAtrMultiplier || 2}× · TP=${cfg.tpAtrMultiplier || 1.5}×
        </div>

        <!-- 1.4 Bonus paires gagnantes -->
        <div style="padding:7px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="color:var(--t2);">1.4 · Bonus paires gagnantes</span>
            <span style="color:var(--up);font-weight:700;font-size:9px;">${bonusKeys.length} active(s)</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;">${bonusHTML}</div>
        </div>
        <div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">
          Activé sur paires WR>60% & P&L>0 (10+ trades) · borné [1.0, 1.5]×
        </div>

        <!-- v8.0 PHASE 2 · MÉMOIRE DES CONTEXTES -->
        ${(function(){
          const mem = S.tradeContextMemory || [];
          const closed = mem.filter(c => c.closedAt !== null);
          const total = mem.length;
          const enriched = closed.length;
          const pendingClose = total - enriched;
          // Stats résumées
          let wins = 0, losses = 0, totalPnl = 0;
          const byHour = {};      // performance par heure
          const byRegime = {};    // performance par régime
          closed.forEach(c => {
            if (c.won) wins++; else losses++;
            totalPnl += c.pnlUsd || 0;
            // Par heure
            if (!byHour[c.hour]) byHour[c.hour] = {w:0, l:0};
            if (c.won) byHour[c.hour].w++; else byHour[c.hour].l++;
            // Par régime
            const r = c.regime || 'unknown';
            if (!byRegime[r]) byRegime[r] = {w:0, l:0};
            if (c.won) byRegime[r].w++; else byRegime[r].l++;
          });
          const wr = enriched > 0 ? Math.round((wins / enriched) * 100) : 0;
          // Top régime (le plus rentable)
          const regimeStats = Object.entries(byRegime).map(([r, s]) => {
            const tot = s.w + s.l;
            return { regime: r, wr: tot > 0 ? Math.round(s.w/tot*100) : 0, n: tot };
          }).filter(r => r.n >= 3).sort((a,b) => b.wr - a.wr);

          const regimeHTML = regimeStats.length > 0 ? regimeStats.slice(0, 4).map(r => {
            const cls = r.wr >= 60 ? 'var(--up)' : r.wr >= 45 ? 'var(--gold)' : 'var(--down)';
            return `<span style="display:inline-block;background:rgba(20,25,35,.7);color:${cls};border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:9px;font-weight:700;font-family:ui-monospace,monospace;margin:2px;">${r.regime} ${r.wr}% (${r.n})</span>`;
          }).join('') : '<span style="color:var(--t3);font-size:9.5px;">Pas encore assez de données</span>';

          return `
          <div style="padding:7px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;margin-top:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="color:var(--t2);">2.1 · Mémoire des contextes</span>
              <span style="color:var(--pur);font-weight:700;font-size:9px;">${total} / 500</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--t2);margin-bottom:6px;font-family:ui-monospace,monospace;">
              <span>Trades enrichis : <b style="color:var(--t1);">${enriched}</b></span>
              <span>WR mémoire : <b style="color:${wr >= 55 ? 'var(--up)' : wr >= 45 ? 'var(--gold)' : 'var(--down)'};">${wr}%</b></span>
              <span>P&L cumulé : <b style="color:${totalPnl >= 0 ? 'var(--up)' : 'var(--down)'};">${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}</b></span>
            </div>
            <div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Performance par régime (3+ trades)</div>
            <div style="display:flex;flex-wrap:wrap;">${regimeHTML}</div>
          </div>
          <div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">
            Le bot mémorise contexte + résultat de chaque trade. Phase 3 utilise cette mémoire.
          </div>

          <!-- v8.0 PHASE 3 · APPRENTISSAGE ACTIF -->
          ${(function(){
            const refusalCount = (S.adaptiveState || {}).lastContextRefusalCount || 0;
            const refusalReason = (S.adaptiveState || {}).lastContextRefusalReason;
            const agentBoosts = (S.adaptiveState || {}).lastAgentBoosts || {};
            const boostKeys = Object.keys(agentBoosts);

            // Identifier les contextes refusés (signature + stats)
            const refusedContexts = [];
            const seenSigs = new Set();
            if (S.tradeContextMemory && typeof _getContextStats === 'function' && typeof _getContextSignature === 'function' && typeof _getPairTierFromContext === 'function') {
              for (const c of S.tradeContextMemory) {
                if (c.closedAt === null) continue;
                const sig = _getContextSignature(c.regime, c.hour, _getPairTierFromContext(c));
                if (seenSigs.has(sig)) continue;
                seenSigs.add(sig);
                const stats = _getContextStats(sig);
                if (stats.refused) refusedContexts.push({ sig, ...stats });
              }
            }

            const refusedHTML = refusedContexts.length > 0 ? refusedContexts.slice(0, 5).map(r => {
              return '<div style="background:rgba(255,61,107,.06);color:var(--down);border:1px solid rgba(255,61,107,.25);border-radius:6px;padding:5px 8px;font-size:9px;font-family:ui-monospace,monospace;margin-bottom:4px;display:flex;justify-content:space-between;">' +
                '<span>' + r.sig + '</span>' +
                '<span style="font-weight:700;">' + Math.round(r.wr * 100) + '% (' + r.trades + ')</span>' +
              '</div>';
            }).join('') : '<span style="color:var(--t3);font-size:9.5px;">Aucun contexte bloqué actuellement</span>';

            // Top boosts agents (positifs et négatifs)
            const sortedBoosts = boostKeys.map(name => ({ name, mult: agentBoosts[name] }))
              .sort((a, b) => Math.abs(b.mult - 1) - Math.abs(a.mult - 1));
            const boostsHTML = sortedBoosts.length > 0 ? sortedBoosts.slice(0, 6).map(b => {
              const isPositive = b.mult > 1.0;
              const cls = isPositive ? 'var(--up)' : 'var(--down)';
              const bg = isPositive ? 'rgba(0,232,122,.06)' : 'rgba(255,61,107,.06)';
              const border = isPositive ? 'rgba(0,232,122,.25)' : 'rgba(255,61,107,.25)';
              return '<span style="display:inline-block;background:' + bg + ';color:' + cls + ';border:1px solid ' + border + ';border-radius:6px;padding:3px 8px;font-size:9px;font-weight:700;font-family:ui-monospace,monospace;margin:2px;">' + b.name + ' × ' + b.mult.toFixed(2) + '</span>';
            }).join('') : '<span style="color:var(--t3);font-size:9.5px;">En cours d&apos;analyse (5+ trades requis par agent)</span>';

            return '' +
            '<div style="padding:7px 10px;background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.25);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;margin-top:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
                '<span style="color:var(--pur);font-weight:700;">⚡ Phase 3 · Apprentissage actif</span>' +
                '<span style="color:var(--t3);font-size:8.5px;">' + refusalCount + ' refus historiques</span>' +
              '</div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">2.3 · Contextes bloqués (<30% WR sur 20+ trades)</div>' +
              '<div style="margin-bottom:8px;">' + refusedHTML + '</div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">2.2 · Pondération votes agents</div>' +
              '<div style="display:flex;flex-wrap:wrap;">' + boostsHTML + '</div>' +
            '</div>' +
            '<div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">' +
              'Le bot refuse les contextes systématiquement perdants et amplifie les agents qui prédisent bien.' +
            '</div>';
          })()}

          <!-- v8.0 PHASE 4a · A/B TESTING AUTOMATIQUE -->
          ${(function(){
            const ab = S.abTesting;
            if (!ab) return '';
            const cfg = S.paperRealConfig || {};
            const threshold = cfg.abTestingTradesPerArm || 50;
            const A = ab.armA || {};
            const B = ab.armB || {};
            const wrA = A.trades > 0 ? Math.round((A.wins / A.trades) * 100) : 0;
            const wrB = B.trades > 0 ? Math.round((B.wins / B.trades) * 100) : 0;
            const progressA = Math.min(100, Math.round((A.trades / threshold) * 100));
            const progressB = Math.min(100, Math.round((B.trades / threshold) * 100));
            const lastV = ab.lastVerdict;

            const verdictHTML = lastV ?
              '<div style="background:rgba(0,232,122,.06);color:var(--up);border:1px solid rgba(0,232,122,.25);border-radius:6px;padding:6px 8px;font-size:9px;font-family:ui-monospace,monospace;margin-bottom:8px;">' +
                '<div style="font-weight:700;margin-bottom:3px;">Gen ' + lastV.generation + ' · ' + lastV.winner + ' a gagné</div>' +
                '<div style="color:var(--t2);">WR ' + lastV.winnerWR + '% · P&L $' + lastV.winnerPnl + '</div>' +
              '</div>' :
              '<div style="font-size:9px;color:var(--t3);margin-bottom:8px;">Aucun verdict encore (premier cycle en cours)</div>';

            const armHTML = function(arm, label, color, progress, wr) {
              const winsLabel = arm.wins || 0;
              const lossesLabel = arm.losses || 0;
              const tradesLabel = arm.trades || 0;
              const pnlLabel = (arm.pnl || 0).toFixed(2);
              const pnlColor = (arm.pnl || 0) >= 0 ? 'var(--up)' : 'var(--down)';
              const params = arm.params || {};
              return '<div style="padding:6px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:9px;font-family:ui-monospace,monospace;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                  '<span style="color:' + color + ';font-weight:700;">' + label + '</span>' +
                  '<span style="color:var(--t2);">' + tradesLabel + '/' + threshold + '</span>' +
                '</div>' +
                '<div style="height:3px;background:var(--s3);border-radius:100px;overflow:hidden;margin-bottom:5px;">' +
                  '<div style="height:100%;width:' + progress + '%;background:' + color + ';border-radius:100px;"></div>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;font-size:9px;">' +
                  '<span style="color:var(--t2);">SL ×' + (params.slAtrMult || '?').toFixed(2) + '</span>' +
                  '<span style="color:var(--t2);">TP ×' + (params.tpAtrMult || '?').toFixed(2) + '</span>' +
                  '<span style="color:' + (wr >= 55 ? 'var(--up)' : wr >= 45 ? 'var(--gold)' : 'var(--down)') + ';font-weight:700;">' + wr + '% WR</span>' +
                  '<span style="color:' + pnlColor + ';font-weight:700;">$' + pnlLabel + '</span>' +
                '</div>' +
              '</div>';
            };

            return '' +
            '<div style="padding:7px 10px;background:rgba(56,212,245,.05);border:1px solid rgba(56,212,245,.25);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;margin-top:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<span style="color:#38d4f5;font-weight:700;">🧬 Phase 4a · A/B testing</span>' +
                '<span style="color:var(--t3);font-size:8.5px;">Gen ' + (ab.generation || 0) + '</span>' +
              '</div>' +
              verdictHTML +
              armHTML(A, A.label || 'A', '#38d4f5', progressA, wrA) +
              armHTML(B, B.label || 'B', 'var(--pur)', progressB, wrB) +
            '</div>' +
            '<div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">' +
              '2 variantes testées en parallèle. Au bout de ' + threshold + ' trades chacune, le gagnant devient référence et le perdant est muté.' +
            '</div>';
          })()}

          <!-- v8.0 PHASE 6b · ALLOCATION DYNAMIQUE + HEDGING -->
          ${(function(){
            const adapt = S.adaptiveState || {};
            const cfg = S.paperRealConfig || {};
            const sharpes = adapt.sharpeByPair || {};
            const allocs = adapt.sharpeAllocations || {};
            const bearStreak = adapt.bearStreak || 0;
            const hedgingEnabled = cfg.hedgingEnabled || false;
            const lastHedge = adapt.lastHedgeAction;

            // Top 5 paires par Sharpe
            const sharpeList = Object.entries(sharpes)
              .map(([pair, s]) => ({ pair: pair.split('/')[0], sharpe: s, alloc: allocs[pair] || 1.0 }))
              .sort((a, b) => b.sharpe - a.sharpe)
              .slice(0, 6);

            const sharpeHTML = sharpeList.length > 0 ? sharpeList.map(s => {
              const cls = s.sharpe > 0.5 ? 'var(--up)' : s.sharpe > 0 ? 'var(--gold)' : 'var(--down)';
              const allocCls = s.alloc > 1.1 ? 'var(--up)' : s.alloc < 0.9 ? 'var(--down)' : 'var(--t2)';
              return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:3px;font-size:9px;font-family:ui-monospace,monospace;">' +
                '<span style="color:var(--t2);font-weight:700;">' + s.pair + '</span>' +
                '<span style="display:flex;gap:8px;">' +
                  '<span style="color:' + cls + ';font-weight:700;">Sharpe ' + s.sharpe.toFixed(2) + '</span>' +
                  '<span style="color:' + allocCls + ';font-weight:700;">×' + s.alloc.toFixed(2) + '</span>' +
                '</span>' +
              '</div>';
            }).join('') : '<span style="color:var(--t3);font-size:9.5px;">Pas encore de Sharpe (5+ trades par paire requis)</span>';

            const hedgeStatus = hedgingEnabled ?
              '<span style="color:var(--up);font-weight:700;">Activé</span>' :
              '<span style="color:var(--t3);font-weight:700;">Désactivé (opt-in)</span>';

            const hedgeStreakColor = bearStreak >= 3 ? 'var(--down)' : bearStreak >= 1 ? 'var(--gold)' : 'var(--t2)';

            const hedgeActionHTML = lastHedge ?
              '<div style="background:rgba(245,200,66,.06);color:var(--gold);border:1px solid rgba(245,200,66,.25);border-radius:6px;padding:6px 8px;font-size:9px;font-family:ui-monospace,monospace;margin-bottom:6px;">' +
                '<div style="font-weight:700;margin-bottom:2px;">🛡️ ' + lastHedge.candidate.split("/")[0] + ' SHORT · $' + lastHedge.stake + '</div>' +
                '<div style="color:var(--t2);">' + lastHedge.reason + ' · régime ' + lastHedge.regime + '</div>' +
              '</div>' :
              '<div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Aucune action récente</div>';

            return '' +
            '<div style="padding:7px 10px;background:rgba(0,232,122,.04);border:1px solid rgba(0,232,122,.2);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;margin-top:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<span style="color:var(--up);font-weight:700;">⚖️ Phase 6b · Allocation + Hedging</span>' +
              '</div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">5.2 · Allocation par Sharpe</div>' +
              sharpeHTML +
              '<div style="font-size:9px;color:var(--t3);margin:8px 0 5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">5.3 · Hedging défensif</div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:9px;font-family:ui-monospace,monospace;">' +
                '<span style="color:var(--t2);">État</span>' +
                hedgeStatus +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:5px;font-size:9px;font-family:ui-monospace,monospace;">' +
                '<span style="color:var(--t2);">BEAR streak</span>' +
                '<span style="color:' + hedgeStreakColor + ';font-weight:700;">' + bearStreak + ' / 3</span>' +
              '</div>' +
              hedgeActionHTML +
            '</div>' +
            '<div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">' +
              'Capital alloué proportionnellement au Sharpe de chaque paire (×0.4 → ×1.5). Hedging suggéré si 3 régimes BEAR consécutifs.' +
            '</div>';
          })()}

          <!-- v8.0 PHASE 6a · CORRÉLATION ENTRE PAIRES -->
          ${(function(){
            const adapt = S.adaptiveState || {};
            const matrix = adapt.correlationMatrix || {};
            const lastDecision = adapt.lastCorrelationDecision;
            const limitActions = adapt.correlationLimitActions || 0;

            // Top 5 corrélations les plus fortes (en valeur absolue)
            const corrList = Object.entries(matrix)
              .map(([key, val]) => {
                const [p1, p2] = key.split('|');
                return { p1: p1.split('/')[0], p2: p2.split('/')[0], val: val };
              })
              .sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
              .slice(0, 6);

            const corrHTML = corrList.length > 0 ? corrList.map(c => {
              const absVal = Math.abs(c.val);
              const cls = absVal > 0.7 ? 'var(--down)' : absVal > 0.4 ? 'var(--gold)' : 'var(--t2)';
              const sign = c.val >= 0 ? '+' : '';
              return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:3px;font-size:9px;font-family:ui-monospace,monospace;">' +
                '<span style="color:var(--t2);font-weight:700;">' + c.p1 + ' ↔ ' + c.p2 + '</span>' +
                '<span style="color:' + cls + ';font-weight:700;">' + sign + c.val.toFixed(2) + '</span>' +
              '</div>';
            }).join('') : '<span style="color:var(--t3);font-size:9.5px;">Pas encore de matrice (30+ bougies par paire requises)</span>';

            const decisionHTML = lastDecision ?
              '<div style="background:rgba(245,200,66,.06);color:var(--gold);border:1px solid rgba(245,200,66,.25);border-radius:6px;padding:6px 8px;font-size:9px;font-family:ui-monospace,monospace;margin-bottom:6px;">' +
                '<div style="font-weight:700;margin-bottom:2px;">' + lastDecision.pair.split("/")[0] + ' ↔ ' + lastDecision.correlatedWith.split("/")[0] + ' · corr ' + (lastDecision.value >= 0 ? '+' : '') + lastDecision.value.toFixed(2) + '</div>' +
                '<div style="color:var(--t2);">Mise réduite à 50% (cumul de risque évité)</div>' +
              '</div>' :
              '<div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Aucune réduction récente</div>';

            return '' +
            '<div style="padding:7px 10px;background:rgba(56,212,245,.04);border:1px solid rgba(56,212,245,.2);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;margin-top:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<span style="color:#38d4f5;font-weight:700;">🌐 Phase 6a · Corrélation entre paires</span>' +
                '<span style="color:var(--t3);font-size:8.5px;">' + Object.keys(matrix).length + ' pairs</span>' +
              '</div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">5.1 · Top corrélations</div>' +
              corrHTML +
              '<div style="font-size:9px;color:var(--t3);margin:8px 0 5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Dernière décision</div>' +
              decisionHTML +
              '<div style="font-size:8.5px;color:var(--t3);">Mises réduites par corrélation : <b style="color:var(--gold);">' + limitActions + '</b></div>' +
            '</div>' +
            '<div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">' +
              'Si corrélation > 0.7 entre 2 paires et même direction → mise réduite à 50% pour éviter la fausse diversification.' +
            '</div>';
          })()}

          <!-- v8.0 PHASE 5 · INTELLIGENCE PRÉDICTIVE -->
          ${(function(){
            const adapt = S.adaptiveState || {};
            const lastVF = adapt.lastVolForecast;
            const lastRev = adapt.lastReversalDetection;
            const blocks = adapt.volForecastBlocks || 0;
            const earlyCloses = adapt.reversalEarlyCloses || 0;

            const vfHTML = lastVF ?
              '<div style="background:rgba(245,200,66,.06);color:var(--gold);border:1px solid rgba(245,200,66,.25);border-radius:6px;padding:6px 8px;font-size:9px;font-family:ui-monospace,monospace;margin-bottom:6px;">' +
                '<div style="font-weight:700;margin-bottom:2px;">' + (lastVF.blocked ? '⚠ Pic prévu · ' : '') + lastVF.pair.split("/")[0] + '</div>' +
                '<div style="color:var(--t2);">' + lastVF.currentVol + '% → <b style="color:var(--down);">' + lastVF.forecastVol + '%</b> (×' + lastVF.ratio + ')</div>' +
              '</div>' :
              '<div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Aucune prévision récente</div>';

            const revHTML = lastRev ?
              '<div style="background:rgba(167,139,250,.06);color:var(--pur);border:1px solid rgba(167,139,250,.25);border-radius:6px;padding:6px 8px;font-size:9px;font-family:ui-monospace,monospace;margin-bottom:6px;">' +
                '<div style="font-weight:700;margin-bottom:2px;">' + lastRev.pair.split("/")[0] + ' · ' + lastRev.type + '</div>' +
                '<div style="color:var(--t2);">' + (lastRev.action === "early_close" ? "Fermé en profit +" + lastRev.pnlPct + "%" : lastRev.action) + ' · confiance ' + lastRev.confidence + '</div>' +
              '</div>' :
              '<div style="font-size:9px;color:var(--t3);margin-bottom:6px;">Aucun retournement détecté récemment</div>';

            return '' +
            '<div style="padding:7px 10px;background:rgba(245,200,66,.04);border:1px solid rgba(245,200,66,.2);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;margin-top:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<span style="color:var(--gold);font-weight:700;">🔮 Phase 5 · Intelligence prédictive</span>' +
              '</div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">4.1 · Prévision de volatilité (GARCH)</div>' +
              vfHTML +
              '<div style="font-size:8.5px;color:var(--t3);margin-bottom:8px;">Trades bloqués par pic prévu : <b style="color:var(--gold);">' + blocks + '</b></div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">4.2 · Détection retournements</div>' +
              revHTML +
              '<div style="font-size:8.5px;color:var(--t3);">Fermetures préventives en profit : <b style="color:var(--up);">' + earlyCloses + '</b></div>' +
            '</div>' +
            '<div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">' +
              'Le bot anticipe les pics de volatilité (refus d&apos;ouverture) et les retournements (fermeture préventive en profit).' +
            '</div>';
          })()}

          <!-- v8.0 PHASE 4b · ÉVOLUTION GÉNÉTIQUE & TRANSFER LEARNING -->
          ${(function(){
            // Évolution génétique : compter les Hybrid Gen et la dernière génération
            const agents = S.agents || [];
            const hybrids = agents.filter(a => !a.isBot && !a.isMeta && (a.name || '').includes('Hybrid Gen'));
            let maxGen = 0;
            hybrids.forEach(a => {
              const m = (a.name || '').match(/Hybrid Gen-(\d+)/);
              if (m) {
                const g = parseInt(m[1]);
                if (g > maxGen) maxGen = g;
              }
            });
            const currentGenCount = S._genCount || 0;

            // Top 3 hybrid les plus performants
            const topHybrids = hybrids
              .filter(a => (a.fitness || 0) > 200)
              .sort((a, b) => (b.fitness || 0) - (a.fitness || 0))
              .slice(0, 3);
            const topHybridsHTML = topHybrids.length > 0 ? topHybrids.map(a => {
              const fit = Math.round(a.fitness || 0);
              const cls = fit >= 1000 ? 'var(--up)' : fit >= 500 ? 'var(--gold)' : 'var(--t2)';
              return '<span style="display:inline-block;background:rgba(20,25,35,.7);color:' + cls + ';border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:9px;font-weight:700;font-family:ui-monospace,monospace;margin:2px;">' + (a.name || '?').replace('Hybrid Gen-', 'G') + ' · fit ' + fit + '</span>';
            }).join('') : '<span style="color:var(--t3);font-size:9.5px;">Pas encore d&apos;hybrides matures</span>';

            // Transfer learning : stats par mode
            const memStats = (typeof _getMultiModeMemoryStats === 'function') ? _getMultiModeMemoryStats() : null;
            const memCombined = memStats && (typeof _combineMultiModeStats === 'function') ? _combineMultiModeStats(memStats) : null;
            const currentMode = S.tradingMode || 'sim';

            const modeRowHTML = function(mode, label, color) {
              const s = memStats ? memStats[mode] : null;
              const total = s ? (s.wins + s.losses) : 0;
              const wr = total > 0 ? Math.round((s.wins / total) * 100) : 0;
              const weight = (typeof _getMemorySourceWeight === 'function') ? _getMemorySourceWeight(mode, currentMode) : 0;
              const weightPct = Math.round(weight * 100);
              const isCurrent = mode === currentMode;
              const wrColor = wr >= 55 ? 'var(--up)' : wr >= 45 ? 'var(--gold)' : 'var(--down)';
              return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:' + (isCurrent ? 'rgba(167,139,250,.08)' : 'rgba(20,25,35,.5)') + ';border:1px solid ' + (isCurrent ? 'rgba(167,139,250,.4)' : 'var(--border)') + ';border-radius:6px;margin-bottom:4px;font-size:9px;font-family:ui-monospace,monospace;">' +
                '<span style="display:flex;align-items:center;gap:6px;">' +
                  '<span style="color:' + color + ';font-weight:700;">' + label + '</span>' +
                  (isCurrent ? '<span style="background:rgba(167,139,250,.2);color:var(--pur);font-size:8px;padding:1px 5px;border-radius:3px;font-weight:700;">ACTIF</span>' : '') +
                '</span>' +
                '<span style="display:flex;gap:8px;align-items:center;">' +
                  '<span style="color:var(--t2);">' + total + ' trades</span>' +
                  '<span style="color:' + wrColor + ';font-weight:700;">' + wr + '%</span>' +
                  '<span style="color:var(--t3);font-size:8.5px;">poids ' + weightPct + '%</span>' +
                '</span>' +
              '</div>';
            };

            return '' +
            '<div style="padding:7px 10px;background:rgba(0,232,122,.04);border:1px solid rgba(0,232,122,.2);border-radius:6px;margin-bottom:5px;font-size:10px;font-family:ui-monospace,monospace;margin-top:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<span style="color:var(--up);font-weight:700;">🧬 Phase 4b · Évolution & Transfer learning</span>' +
                '<span style="color:var(--t3);font-size:8.5px;">Gen actuelle : ' + currentGenCount + '</span>' +
              '</div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">3.2 · Top hybrides survivants</div>' +
              '<div style="display:flex;flex-wrap:wrap;margin-bottom:10px;">' + topHybridsHTML + '</div>' +
              '<div style="font-size:9px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">3.3 · Mémoire multi-modes</div>' +

              modeRowHTML('real', 'Mode Réel', 'var(--down)') +
              (memCombined && memCombined.wr !== null ?
                '<div style="font-size:9px;color:var(--t3);margin-top:6px;text-align:center;">' +
                  'WR consolidé : <b style="color:' + (memCombined.wr >= 0.55 ? 'var(--up)' : memCombined.wr >= 0.45 ? 'var(--gold)' : 'var(--down)') + ';">' + Math.round(memCombined.wr * 100) + '%</b>' +
                  ' · ' + memCombined.sourcesUsed + ' source(s) actives' +
                '</div>' : '') +
            '</div>' +
            '<div style="font-size:8.5px;color:var(--t3);padding:0 10px;margin-bottom:4px;">' +
              'Mémoires combinées avec poids dégressifs : sim 30% · Réel 70% · real 100%. Hybrides évoluent par croisement génétique.' +
            '</div>';
          })()}
          `;
        })()}
      </div>
      `;
    })()}

    <!-- v7.12 LIVRAISON 4 · MODE TRADING (sim/real) -->
    <!-- ════════════════════════════════════════════════ -->
    ${(function(){
      const isReal = S.tradingMode === 'real';
      const tf = S.realTimeframe || '15m';
      const activePairs = S.realActivePairs || {};
      const killSwitch = S.realKillSwitch || {};
      // Liste des paires
      const pairsHTML = Object.keys(PAIRS || {}).map(pair => {
        const isActive = !!activePairs[pair];
        const ks = killSwitch[pair] || {};
        const isPaused = !!ks.paused;
        const eligibility = (typeof _isPairRealEligible === 'function') ? _isPairRealEligible(pair, tf) : { ok:false, reason:'init' };
        const eligible = eligibility.ok;
        let stateLbl = '';
        let stateCol = 'var(--t3)';
        if (isPaused) { stateLbl = '⏸ Pause auto · ' + (ks.reason||''); stateCol = 'var(--gold)'; }
        else if (!eligible) { stateLbl = '⚠ ' + eligibility.reason; stateCol = 'var(--gold)'; }
        else if (isActive) { stateLbl = '● Actif'; stateCol = 'var(--up)'; }
        else { stateLbl = '○ Inactif'; stateCol = 'var(--t3)'; }
        const cfg = PAIRS[pair] || {};
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(20,25,35,.6);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:${cfg.color || 'var(--t1)'};font-weight:800;font-size:11px;font-family:ui-monospace,monospace;">${pair.split('/')[0]}</span>
              <span style="color:${stateCol};font-size:9px;font-weight:600;">${stateLbl}</span>
            </div>
            <button onclick="toggleRealPair('${pair}')" style="padding:4px 10px;font-size:9px;font-weight:700;border-radius:6px;cursor:pointer;background:${isActive?'rgba(0,232,122,.15)':'var(--s2)'};color:${isActive?'var(--up)':'var(--t2)'};border:1px solid ${isActive?'rgba(0,232,122,.4)':'var(--border)'};">
              ${isActive?'ON':'OFF'}
            </button>
          </div>
        `;
      }).join('');

      // Sélecteur timeframe
      const tfButtons = ['5m','15m','1h','4h','1j'].map(t => {
        const sel = (t === tf);
        return `<button onclick="setRealTimeframe('${t}')" style="padding:6px 10px;font-size:9.5px;font-weight:700;border-radius:6px;cursor:pointer;background:${sel?'rgba(56,212,245,.15)':'var(--s2)'};color:${sel?'var(--ice)':'var(--t2)'};border:1px solid ${sel?'rgba(56,212,245,.4)':'var(--border)'};">${t.toUpperCase()}</button>`;
      }).join('');

      // Bouton master sim ↔ real
      const masterBtn = isReal ? `
        <button onclick="confirmSwitchMode()" style="background:rgba(0,232,122,.10);color:var(--up);border:1px solid rgba(0,232,122,.4);border-radius:10px;padding:12px 14px;font-size:12px;font-weight:800;cursor:pointer;letter-spacing:.05em;width:100%;display:flex;justify-content:space-between;align-items:center;">
          <span>↩ Repasser en mode SIMULATION</span>
          <span style="opacity:.6;font-size:10px;">⚠</span>
        </button>` : `
        <button onclick="confirmSwitchToReal()" style="background:rgba(255,61,107,.10);color:var(--down);border:1px solid rgba(255,61,107,.4);border-radius:10px;padding:12px 14px;font-size:12px;font-weight:800;cursor:pointer;letter-spacing:.05em;width:100%;display:flex;justify-content:space-between;align-items:center;">
          <span>⚠ Activer le MODE RÉEL</span>
          <span style="opacity:.6;font-size:10px;">→ Binance live</span>
        </button>`;

      const headerCol = isReal ? 'var(--down)' : 'var(--ice)';
      const headerBg  = isReal ? 'rgba(255,61,107,.05)' : 'rgba(56,212,245,.05)';
      const headerBorder = isReal ? 'rgba(255,61,107,.2)' : 'rgba(56,212,245,.2)';

      return `
      <div style="margin:16px 0 8px;padding:14px;background:${headerBg};border:1px solid ${headerBorder};border-radius:12px;">
        <div style="font-size:12px;font-weight:700;color:${headerCol};text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <span>${isReal?'⚠':'🎯'} Mode trading · ${isReal?'RÉEL':'Mode Auto-apprentissage'}</span>
          <span style="font-size:9px;font-weight:600;opacity:.7;letter-spacing:0;text-transform:none;">${isReal?'live Binance':'simulé'}</span>
        </div>
        <div style="font-size:9.5px;color:var(--t2);line-height:1.5;margin-bottom:12px;">
          ${isReal
            ? '<b style="color:var(--down)">Mode réel actif.</b> Le bot prend ses décisions sur les bougies Binance live de la paire/timeframe sélectionnés. Les agents apprennent dans une mémoire séparée. Trades restent simulés (trading).'
            : 'Mode trading. Le bot tourne sur le moteur GBM rapide. Avant d\'activer le mode réel, choisis les paires et le timeframe ci-dessous.'}
        </div>

        <!-- Timeframe -->
        <div style="font-size:9px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Timeframe décisions bot</div>
        <div style="display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap;">${tfButtons}</div>

        <!-- v7.12 LIVRAISON 6 · Stats par paire en mode real -->
        ${(function() {
          const stats = S.realStatsByPair || {};
          const tradedPairs = Object.keys(stats).filter(p => stats[p].trades > 0);
          if (tradedPairs.length === 0) return '';
          const rows = tradedPairs.map(pair => {
            const s = stats[pair];
            const tot = s.wins + s.losses;
            const wrAll = tot > 0 ? Math.round(s.wins / tot * 100) : 0;
            // WR récent (10 derniers trades)
            const recent = s.lastTrades || [];
            const recentWins = recent.filter(v => v > 0).length;
            const wrRecent = recent.length > 0 ? Math.round(recentWins / recent.length * 100) : null;
            // Couleur selon WR récent ou global
            const wrRef = wrRecent != null ? wrRecent : wrAll;
            let dotCol = 'var(--t3)';
            if (wrRef >= 60) dotCol = 'var(--up)';
            else if (wrRef >= 45) dotCol = 'var(--gold)';
            else dotCol = 'var(--down)';
            const cfg = PAIRS[pair] || {};
            const sym = pair.split('/')[0];
            const pnlCol = s.pnlNet >= 0 ? 'var(--up)' : 'var(--down)';
            const pnlSign = s.pnlNet >= 0 ? '+' : '';
            const wrTxt = wrRecent != null ? wrRecent + '%·' + wrAll + '%' : wrAll + '%';
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:8px;margin-bottom:5px;font-size:10px;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dotCol};flex-shrink:0;"></span>
                  <span style="color:${cfg.color||'var(--t1)'};font-weight:800;font-family:ui-monospace,monospace;min-width:36px;">${sym}</span>
                  <span style="color:var(--t2);font-family:ui-monospace,monospace;font-size:9.5px;">${s.wins}W·${s.losses}L</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;font-family:ui-monospace,monospace;">
                  <span style="color:${dotCol};font-weight:700;font-size:10px;">${wrTxt}</span>
                  <span style="color:${pnlCol};font-weight:800;font-size:10px;min-width:60px;text-align:right;">${pnlSign}$${s.pnlNet.toFixed(2)}</span>
                </div>
              </div>
            `;
          }).join('');
          return `
            <div style="font-size:9px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
              <span>📊 Performance par paire (réel)</span>
              <span style="font-size:8.5px;letter-spacing:0;text-transform:none;color:var(--t3);font-weight:600;opacity:.7;">WR récent · global</span>
            </div>
            <div style="margin-bottom:14px;">${rows}</div>
          `;
        })()}

        <!-- Paires -->
        <div style="font-size:9px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Paires actives en réel</div>
        <div style="margin-bottom:14px;">${pairsHTML}</div>

        <!-- v7.12 LIVRAISON 6 · Bouton rollback si snapshot disponible -->
        ${(function(){
          const ps = S.preRealSnapshot;
          if (!ps || !ps.takenAt) return '';
          const ageMin = Math.floor((Date.now() - ps.takenAt) / 60000);
          let ageStr;
          if (ageMin < 60) ageStr = ageMin + ' min';
          else if (ageMin < 1440) ageStr = Math.floor(ageMin/60) + 'h';
          else ageStr = Math.floor(ageMin/1440) + 'j';
          const dollarStr = '$' + (ps.meta?.totalUsd || 0).toFixed(0);
          return `
            <button onclick="confirmRollbackPreReal()" style="background:rgba(245,200,66,.06);color:var(--gold);border:1px solid rgba(245,200,66,.35);border-radius:10px;padding:9px 14px;font-size:10.5px;font-weight:700;cursor:pointer;letter-spacing:.04em;width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span>↶ Restaurer état pré-réel · ${dollarStr}</span>
              <span style="opacity:.7;font-size:9px;font-weight:600;letter-spacing:0;">il y a ${ageStr}</span>
            </button>
          `;
        })()}

        <!-- Switch master -->
        ${masterBtn}
      </div>
      `;
    })()}

    <!-- ════════════════════════════════════════════════════════════════ -->
    <!-- v19 · #38 NOTIFICATIONS PUSH ANDROID                           -->
    <!-- ════════════════════════════════════════════════════════════════ -->
    <div id="notifSettingsSection" style="margin:16px 0 8px;"></div>

    <!-- ════════════════════════════════════════════════════════════════ -->
    <!-- v8.0 LIVRAISON 33 · BLOC OUTILS RAPIDES -->
    <!-- ════════════════════════════════════════════════════════════════ -->
    <div style="margin:16px 0 8px;padding:14px;background:rgba(0,232,122,.05);border:1px solid rgba(0,232,122,.2);border-radius:12px;">
      <div style="font-size:12px;font-weight:700;color:var(--up);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">🛠 Outils</div>
      <button onclick="openRealCandlesModal();closeSettingsModal();" style="background:rgba(0,232,122,.10);color:var(--up);border:1px solid rgba(0,232,122,.4);border-radius:10px;padding:12px 14px;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.05em;text-align:left;width:100%;display:flex;justify-content:space-between;align-items:center;">
        <span>📊 Bougies temps réel</span>
        <span style="opacity:.6;font-size:10px;">5m·15m·1h</span>
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════ -->
    <!-- v8.0 LIVRAISON 33 · BLOC 1 : SAUVEGARDES -->
    <!-- ════════════════════════════════════════════════════════════════ -->
    <div style="margin:16px 0 8px;padding:14px;background:rgba(56,212,245,.05);border:1px solid rgba(56,212,245,.2);border-radius:12px;">
      <div style="font-size:12px;font-weight:700;color:var(--ice);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">📦 Sauvegardes & Restauration</div>

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.05em;">⬇ EXPORTER UN FICHIER</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Télécharge un backup complet (état + agents + trades + configs). Tu peux l'envoyer pour analyse.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;">
        <button onclick="exportBackup('json')" style="padding:10px;background:rgba(56,212,245,.15);border:1px solid rgba(56,212,245,.4);border-radius:8px;color:var(--ice);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">📦 .json</button>
        <button onclick="exportBackup('txt')" style="padding:10px;background:rgba(56,212,245,.08);border:1px solid rgba(56,212,245,.25);border-radius:8px;color:var(--ice);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">📄 .txt</button>
      </div>

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.05em;">⬆ IMPORTER UN FICHIER</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">2 modes selon le bouton choisi.</div>
      <input type="file" id="backupImportFile" accept=".json,.txt" onchange="handleBackupImportFile(this)" style="display:none;" />
      <input type="file" id="backupImportMaxFile" accept=".json,.txt" onchange="handleBackupImportMaxFile(this)" style="display:none;" />
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
        <button onclick="document.getElementById('backupImportFile').click()" style="padding:10px;background:rgba(245,200,66,.15);border:1px solid rgba(245,200,66,.4);border-radius:8px;color:var(--gold);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;">
          ⬆ Importer SÉCURISÉ <span style="font-size:9px;font-weight:500;color:var(--t3);">· configs whitelist (Q1=B/sécurisé)</span>
        </button>
        <button onclick="document.getElementById('backupImportMaxFile').click()" style="padding:10px;background:rgba(255,61,107,.15);border:1px solid rgba(255,61,107,.5);border-radius:8px;color:var(--down);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;">
          🔴 Importer MAX PERMISSIF <span style="font-size:9px;font-weight:500;color:var(--t3);">· tout sauf historique (à utiliser avec prudence)</span>
        </button>
      </div>

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.05em;">🔄 SAUVEGARDE & CONTINUITÉ (AURA v43)</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Format v43 (snapshot léger) · à utiliser si tu changes d'appareil ou re-télécharges le HTML.</div>
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        <button onclick="exportState()" style="flex:1;padding:10px;background:rgba(0,232,122,.10);border:1px solid rgba(0,232,122,.35);border-radius:8px;color:var(--up);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">⬇ Exporter backup</button>
        <button onclick="importState()" style="flex:1;padding:10px;background:rgba(56,212,245,.10);border:1px solid rgba(56,212,245,.35);border-radius:8px;color:var(--ice);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">⬆ Importer backup</button>
      </div>

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.05em;">📸 SNAPSHOTS INTERNES</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Auto toutes les 30 min + après chaque trade · 5 conservés en rotation.</div>
      <button onclick="openSnapshotsModal();closeSettingsModal();" style="width:100%;padding:10px;background:rgba(245,200,66,.10);border:1px solid rgba(245,200,66,.3);border-radius:8px;color:#f5c542;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;margin-bottom:14px;">📸 Voir et restaurer (1 tap)</button>

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.05em;">📜 HISTORIQUE DES BACKUPS</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Auto : 1/jour pendant 7 jours · Manuel : 5 derniers · Pré-import : 3 derniers</div>
      ${HISTORIQUE_HTML}
      <button onclick="_refreshBackupsCache()" style="margin-top:8px;width:100%;padding:7px;background:transparent;border:1px solid rgba(255,255,255,.08);border-radius:6px;color:var(--t3);font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;">🔄 Rafraîchir la liste</button>

      <!-- v8.0 LIVRAISON v11bis · Bouton Backup rapide manuel (déclenche un export immédiat .json) -->
      <div style="font-size:10px;font-weight:700;color:var(--t2);margin:14px 0 6px;letter-spacing:.05em;">⚡ BACKUP RAPIDE</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Génère et télécharge un backup .json maintenant (utile avant un changement risqué).</div>
      <button onclick="exportBackup('json')" style="width:100%;padding:10px;background:rgba(0,232,122,.12);border:1px solid rgba(0,232,122,.4);border-radius:8px;color:var(--up);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;">
        💾 Backup maintenant (.json)
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════ -->
    <!-- v8.0 LIVRAISON v11bis · BLOC DIAGNOSTICS (raccourcis Réglages) -->
    <!-- ════════════════════════════════════════════════════════════════ -->
    <div style="margin:16px 0 8px;padding:14px;background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.25);border-radius:12px;">
      <div style="font-size:12px;font-weight:700;color:var(--pur);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">🩺 Diagnostics</div>

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;letter-spacing:.05em;">SANTÉ DU SYSTÈME</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Vue d'ensemble : trades, P&amp;L, marché, agents, capital, répartition.</div>
      <button onclick="openDiagnostic()" style="width:100%;padding:10px;background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.4);border-radius:8px;color:var(--pur);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;margin-bottom:10px;">
        🩺 Ouvrir le diagnostic santé
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════ -->
    <!-- v8.0 LIVRAISON 33 · BLOC 2 : RESETS -->
    <!-- ════════════════════════════════════════════════════════════════ -->
    <div style="margin:16px 0 8px;padding:14px;background:rgba(245,166,35,.05);border:1px solid rgba(245,166,35,.25);border-radius:12px;">
      <div style="font-size:12px;font-weight:700;color:#f5a623;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">🔄 Resets & Déblocages</div>

      <div style="font-size:10px;font-weight:700;color:var(--pur);margin-bottom:6px;letter-spacing:.05em;">🔓 DÉBLOCAGES</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Les paires blacklistées et streaks de pertes sont pausées auto. Utilise pour donner une chance de reprendre.</div>
      ${DEBLOCAGES_HTML}

      <!-- v8.0 LIVRAISON 37 · Bouton Reset P&L · onclick simplifié -->
      <div style="font-size:10px;font-weight:700;color:var(--ice);margin:14px 0 6px;letter-spacing:.05em;">📊 RESET P&amp;L CUMULÉ</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Remet à zéro le P&amp;L cumulé de toutes les paires affiché sur l'écran d'accueil.</div>
      <button onclick="_confirmResetPnlCumule()" style="width:100%;padding:10px;background:rgba(56,212,245,.10);border:1px solid rgba(56,212,245,.30);border-radius:8px;color:var(--ice);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;">
        ↺ Reset P&amp;L cumulé toutes paires
      </button>

      <!-- v8.0 LIVRAISON 41 · Reset complet cohérent (fix corruption paperRealStats) -->
      <div style="font-size:10px;font-weight:700;color:var(--mag);margin:14px 0 6px;letter-spacing:.05em;">🧹 RESET COMPLET COHÉRENT</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Synchronise et remet à zéro TOUS les compteurs liés (paperRealStats, heatmap, mémoire contexte, fees par paire). Utile en cas de chiffres incohérents entre les écrans.</div>
      <button onclick="_confirmFullCoherentReset()" style="width:100%;padding:10px;background:rgba(255,77,191,.10);border:1px solid rgba(255,77,191,.30);border-radius:8px;color:var(--mag);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;">
        🧹 Reset complet cohérent (fix incohérences)
      </button>

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin:12px 0 6px;letter-spacing:.05em;">💰 RESET PAR COMPTE</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;"><strong>Maintenir 2 secondes</strong> sur un bouton pour confirmer.</div>
      ${LONGPRESS_HTML}

      <div style="font-size:10px;font-weight:700;color:var(--t2);margin:12px 0 6px;letter-spacing:.05em;">🧠 RESET PAR DOMAINE</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:8px;line-height:1.5;">Archive automatiquement avant de réinitialiser ${RESET_DOMAINS.length} domaines distincts.</div>
      <div class="domain-grid">${rows}</div>
      ${fullResetBlock}

      <div style="font-size:10px;font-weight:700;color:var(--down);margin:14px 0 6px;letter-spacing:.05em;">⚠️ FACTORY RESET</div>
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:rgba(255,61,107,.05);border:1px solid rgba(255,61,107,.2);border-radius:8px;">
        <div style="font-size:18px;">⚠️</div>
        <div style="flex:1;">
          <div style="font-size:10.5px;font-weight:700;color:var(--down);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Reset complet · premier lancement</div>
          <div style="font-size:9px;color:var(--t2);line-height:1.5;margin-bottom:8px;">
            Efface <strong>TOUT</strong> : comptes, trades, positions, agents évolués, archives. L'application redémarre comme à la 1ère installation.<br>
            <strong style="color:var(--down);">Action irréversible.</strong>
          </div>
          <button onclick="_confirmFactoryReset()" style="background:var(--down);color:#fff;border:none;border-radius:7px;padding:7px 12px;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:.05em;text-transform:uppercase;">🔄 Reset complet</button>
        </div>
      </div>
    </div>

    <div class="archives-section">
      <div class="archives-header">
        <span class="archives-title">📚 Archives · Mémoire permanente</span>
        <span class="archives-count">${archives.length}/50 · ${totalResets} reset(s)</span>
      </div>
      ${archivesHtml}
      <div style="margin-top:10px;font-size:8px;color:var(--t3);line-height:1.5;text-align:center;">
        Les archives sont conservées pour que le système apprenne<br>de ses trajectoires passées · max 50 entrées · FIFO
      </div>
    </div>`;
  // v19 · #38 Notifications push
  try { if(typeof renderNotifSettings === 'function') renderNotifSettings(); } catch(e) {}

  // Compte à rebours vivant de la sauvegarde auto (tant que la modal est ouverte)
  try {
    if (window._savCountdownTimer) clearInterval(window._savCountdownTimer);
    window._savCountdownTimer = setInterval(() => {
      const cd = document.getElementById('savCountdown');
      if (!cd || !window.autoDownload) { if (window._savCountdownTimer) clearInterval(window._savCountdownTimer); return; }
      const ad = window.autoDownload.getMeta();
      if (!ad.enabled) { cd.textContent = 'désactivé'; return; }
      if (!ad.last) { cd.textContent = 'au prochain cycle'; return; }
      let r = ad.last + ad.everyMin*60000 - Date.now();
      if (r <= 0) { cd.textContent = 'imminent…'; return; }
      const h = Math.floor(r/3600000), mn = Math.floor((r%3600000)/60000), s = Math.floor((r%60000)/1000);
      cd.textContent = (h>0?h+'h ':'') + mn + 'min ' + (s<10?'0':'') + s + 's';
    }, 1000);
  } catch(e) {}
}

// Expose globally
window.openSettingsModal    = openSettingsModal;
window.closeSettingsModal   = closeSettingsModal;
window.requestReset         = requestReset;
window.cancelReset          = cancelReset;
window.archiveAndReset      = archiveAndReset;
window.archiveAndResetAll   = archiveAndResetAll;
window.toggleArchiveDetail  = toggleArchiveDetail;

// Agents/bots can consult archives for learning
window._getArchivesForDomain = function(domainId) {
  return (S.archives?.snapshots || []).filter(s => s.domain === domainId);
};


// ════════════════════════════════════════════════════════════
// v6.0 — USER CONTROLS · Pending Actions + Agent Mutes + Force Trade
// ════════════════════════════════════════════════════════════

// Init state
if(typeof S !== 'undefined') {
  if(!S.pendingActions) S.pendingActions = [];
  if(!S.mutedAgents)    S.mutedAgents = [];  // array of agent IDs muted by user
  if(!S.brainLog)       S.brainLog = [];
}

// ── RENDER pending actions banner on home ──
function renderPendingActions() {
  const banner = document.getElementById('pendingBanner');
  const list = document.getElementById('pendingActionsList');
  const badge = document.getElementById('pendingCountBadge');
  if(!banner || !list) return;
  const actions = (S.pendingActions || []).slice(0, 5);
  if(actions.length === 0) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = '';
  if(badge) badge.textContent = S.pendingActions.length;

  list.innerHTML = actions.map(a => {
    const icon = a.type === 'arb' ? '🎯' : a.type === 'harvest' ? '💎' : a.type === 'rebalance' ? '🔀' : '⚡';
    const cls = a.type;
    const mins = Math.floor((Date.now() - a.ts) / 60000);
    const timeLbl = mins < 1 ? 'maintenant' : `il y a ${mins}m`;
    return `<div class="pending-action-card">
      <div class="pending-icon ${cls}">${icon}</div>
      <div class="pending-body">
        <div class="pending-title-txt">${a.title}</div>
        <div class="pending-detail-txt">${a.detail}</div>
        <div class="pending-source">${a.source.replace('_',' ').replace('_',' ')} · ${timeLbl}</div>
      </div>
      <div class="pending-btns">
        <button class="pending-btn yes" onclick="executePending('${a.id}')">✓</button>
        <button class="pending-btn no"  onclick="dismissPending('${a.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ── EXECUTE pending action ──
// v7.12 LIVRAISON 9 · AUTO-VALIDATION des actions proposées
// Règle : auto-valide tout SAUF les actions de fermeture de positions ouvertes
// (close_position, close_skewed) qui restent manuelles pour la sécurité
function _autoValidatePendingActions() {
  if (!S.pendingActions || S.pendingActions.length === 0) return;
  // Seul close_position reste manuel (fermeture d'une position spécifique).
  // close_skewed = rééquilibrage de diversification, doit être auto-validé.
  const NON_AUTO_ACTIONS = ['close_position'];
  // Cooldown : ne pas valider une action qui vient d'être créée (laisser 5s pour voir)
  const minAge = 5000;
  const now = Date.now();
  // Parcourir les actions auto-validables
  for (let i = S.pendingActions.length - 1; i >= 0; i--) {
    const action = S.pendingActions[i];
    if (!action || !action.action) continue;
    // Skip si action de fermeture (manuelle)
    if (NON_AUTO_ACTIONS.includes(action.action)) continue;
    // Skip si trop récente
    if (action.ts && (now - action.ts) < minAge) continue;
    // Skip si déjà marquée auto-validée
    if (action._autoValidated) continue;
    // Marquer pour auto-exécution (pour éviter double exécution)
    action._autoValidated = true;
    // Logger dans le journal Chain
    try {
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({
        icon: '🤖',
        desc: `Auto-validé · ${action.title || action.type}`,
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch(e) {}
    // Toast notification
    try {
      if (typeof showToast === 'function') {
        showToast(`🤖 Auto-validé · ${action.title || action.type}`, 4000, 'win');
      }
    } catch(e) {}
    // Exécuter via la fonction standard
    try {
      executePending(action.id);
    } catch(e) {}
  }
}
window._autoValidatePendingActions = _autoValidatePendingActions;
// Appel régulier (toutes les 3s suffit, car les actions arrivent rarement)
setInterval(_autoValidatePendingActions, 3000);

function executePending(actionId) {
  const idx = (S.pendingActions || []).findIndex(a => a.id === actionId);
  if(idx === -1) return;
  const action = S.pendingActions[idx];
  try {
    switch(action.action) {
      case 'open_trade': {
        // Open trade on a pair/side with default stake
        const ps = S.pairStates[action.payload.pair];
        const stake = Math.max(10, Math.min(S.tradingAccount * 0.15, ps?.stake || 20));
        if(typeof autoOpenPosition === 'function') {
          autoOpenPosition(action.payload.pair, action.payload.side, stake);
          if(typeof showToast === 'function') showToast(`✓ Trade ${action.payload.pair} ${action.payload.side.toUpperCase()} exécuté`);
        }
        break;
      }
      case 'close_position': {
        if(typeof closePosition === 'function') {
          closePosition(action.payload.posId, false);
          if(typeof showToast === 'function') showToast(`✓ Position fermée`);
        }
        break;
      }
      case 'close_skewed': {
        // Close the largest position of the skewed pair
        const positions = (S.openPositions || []).filter(p => p.pair === action.payload.pair);
        if(positions.length > 0) {
          const largest = positions.sort((a,b) => (b.stakeUsdt||0) - (a.stakeUsdt||0))[0];
          if(typeof closePosition === 'function') {
            closePosition(largest.id, false);
            if(typeof showToast === 'function') showToast(`✓ Position ${action.payload.pair} fermée (rééquilibrage)`);
          }
        }
        break;
      }
    }
  } catch(e) { console.warn('executePending:', e); }
  // Remove from queue
  S.pendingActions.splice(idx, 1);
  renderPendingActions();
  try { if(typeof saveState === 'function') saveState(true); } catch(e) {}
}

function dismissPending(actionId) {
  const idx = (S.pendingActions || []).findIndex(a => a.id === actionId);
  if(idx === -1) return;
  S.pendingActions.splice(idx, 1);
  renderPendingActions();
}

// ── AGENT MUTING (user can disable an agent's voice) ──
function toggleAgentMute(agentId) {
  if(!S.mutedAgents) S.mutedAgents = [];
  const idx = S.mutedAgents.indexOf(agentId);
  if(idx === -1) {
    S.mutedAgents.push(agentId);
    const agent = (S.agents || []).find(a => a.id === agentId);
    if(typeof showToast === 'function') showToast(`🔇 ${agent?.name || agentId} · muet`);
  } else {
    S.mutedAgents.splice(idx, 1);
    const agent = (S.agents || []).find(a => a.id === agentId);
    if(typeof showToast === 'function') showToast(`🔊 ${agent?.name || agentId} · actif`);
  }
  // Re-render swarm and debate
  try { renderAnalyticsPanel(); } catch(e) {}
  try { if(typeof saveState === 'function') saveState(true); } catch(e) {}
}

// Patch scoutAnalysis + councilVote + guardianCheck to respect mutes
// We do this by wrapping at call site in runRosterAnalysis
const _origRunRosterAnalysis = typeof runRosterAnalysis === 'function' ? runRosterAnalysis : null;
window.runRosterAnalysis = function(pair) {
  if(!_origRunRosterAnalysis) return null;
  const result = _origRunRosterAnalysis(pair);
  if(!result) return null;
  const muted = new Set(S.mutedAgents || []);
  if(muted.size === 0) return result;

  // Zero out muted scouts' scores
  Object.keys(result.scoutResults || {}).forEach(id => {
    if(muted.has(id)) {
      result.scoutResults[id].score = 0;
      result.scoutResults[id].conf  = 0;
      result.scoutResults[id].reasoning = '🔇 Agent muet';
      result.scoutResults[id].muted = true;
    }
  });

  // Zero out muted council votes
  let longVotes = 0, shortVotes = 0, holdVotes = 0;
  Object.keys(result.councilResults || {}).forEach(id => {
    if(muted.has(id)) {
      result.councilResults[id].vote = 'hold';
      result.councilResults[id].quote = '🔇 Agent muet';
      result.councilResults[id].muted = true;
    }
    const v = result.councilResults[id];
    if(v.vote === 'long')       longVotes++;
    else if(v.vote === 'short') shortVotes++;
    else                        holdVotes++;
  });
  const total = longVotes + shortVotes + holdVotes;
  const winVotes = Math.max(longVotes, shortVotes, holdVotes);
  result.votes = { long:longVotes, short:shortVotes, hold:holdVotes, total };
  result.consensus = total > 0 ? winVotes / total : 0;
  result.coalition = (longVotes >= 4 || shortVotes >= 4);
  result.verdict = longVotes > shortVotes && longVotes > holdVotes ? 'LONG'
                 : shortVotes > longVotes && shortVotes > holdVotes ? 'SHORT'
                 : 'HOLD';

  // Zero out muted guardian vetoes
  let anyVeto = false;
  Object.keys(result.guardianResults || {}).forEach(id => {
    if(muted.has(id)) {
      result.guardianResults[id].status = 'approve';
      result.guardianResults[id].reasoning = '🔇 Gardien muet';
      result.guardianResults[id].muted = true;
    }
    if(result.guardianResults[id].status === 'veto') anyVeto = true;
  });
  result.anyVeto = anyVeto;
  result.finalDecision = anyVeto ? 'VETO' : result.verdict;
  return result;
};

// ── FORCE TRADE buttons on debate panel ──
function forceTrade(direction) {
  const pair = S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  if(direction === 'skip') {
    if(typeof showToast === 'function') showToast('⏸ Trade ignoré', 2800, 'user');
    return;
  }
  // Execute trade with default stake
  try {
    const ps = S.pairStates[pair];
    const stake = Math.max(10, Math.min(S.tradingAccount * 0.15, ps?.stake || 20));
    if(typeof autoOpenPosition === 'function') {
      // Temporarily set botAutoMode true so the trade goes through (respecting user intent)
      const wasAuto = S.botAutoMode;
      if(S.botAutoMode === false) S.botAutoMode = true;
      autoOpenPosition(pair, direction, stake);
      S.botAutoMode = wasAuto;
      if(typeof showToast === 'function') showToast(`🎯 Trade forcé · ${pair} ${direction.toUpperCase()}`);
      if(!S.brainLog) S.brainLog = [];
      S.brainLog.unshift({ ts: Date.now(), pair, event:'FORCE', side:direction, reason:'Décision utilisateur' });
      if(S.brainLog.length > 30) S.brainLog.length = 30;
    }
  } catch(e) { console.warn('forceTrade:', e); }
  try { renderAnalyticsPanel(); } catch(e) {}
}

// ── BRAIN LOG panel (under debate) ──
function renderBrainLog() {
  const entries = (S.brainLog || []).slice(0, 6);
  if(entries.length === 0) return '';
  return `<div style="margin-top:10px;padding:8px 10px;background:var(--s2);border-radius:9px;">
    <div style="font-size:8px;color:var(--t3);letter-spacing:.08em;margin-bottom:6px;">🧠 DÉCISIONS DU CERVEAU · ${entries.length} récentes</div>
    ${entries.map(e => {
      const d = new Date(e.ts);
      const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const cls = e.event.toLowerCase();
      const label = e.event;
      return `<div class="brainlog-entry ${cls}">
        <span class="brainlog-time">${timeStr}</span>
        <span class="brainlog-event ${cls}">${label}</span>
        <span class="brainlog-reason">${e.pair} · ${e.reason}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// Expose
window.renderPendingActions = renderPendingActions;
window.executePending       = executePending;
window.dismissPending       = dismissPending;
window.toggleAgentMute      = toggleAgentMute;
window.forceTrade           = forceTrade;
window.renderBrainLog       = renderBrainLog;

// ════════════════════════════════════════════════════════════
// v6.2 — MODE TOGGLE (AUTO / MAN) — uses existing setBotMode()
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// v8.0 · WAKE LOCK · Empêche l'écran de s'éteindre
// ════════════════════════════════════════════════════════════
// Utilise l'API Wake Lock standard du navigateur.
// Sur Chrome/Samsung Internet : marche bien. Sur navigateurs anciens : fallback (rien).
// Auto-ré-activation si l'écran se rallume (l'API se libère sur visibilitychange).

let _wakeLockSentinel = null;
let _wakeLockEnabled = false;

async function _requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      _wakeLockSentinel = await navigator.wakeLock.request('screen');
      _wakeLockSentinel.addEventListener('release', () => {
        _wakeLockSentinel = null;
        _updateWakeLockButton();
      });
      return true;
    }
    return false;
  } catch(err) {
    console.warn('[WakeLock] Échec :', err.name, err.message);
    return false;
  }
}

async function _releaseWakeLock() {
  try {
    if (_wakeLockSentinel) {
      await _wakeLockSentinel.release();
      _wakeLockSentinel = null;
    }
  } catch(err) {
    console.warn('[WakeLock] Échec libération :', err);
  }
}

function _updateWakeLockButton() {
  const btn = document.getElementById('wakeLockBtn');
  if (!btn) return;
  // v8.0 FIX FINAL · lit l'état depuis localStorage (source de vérité)
  let storedState = '0';
  try { storedState = localStorage.getItem('aura_wakelock') || '0'; } catch(e) {}
  const isOn = (storedState === '1') || (_wakeLockEnabled && _wakeLockSentinel);

  if (isOn) {
    // ACTIF : SOLEIL ☀ - cercle 28px (comme ⚙)
    btn.textContent = '';
    btn.innerHTML = '☀';
    btn.setAttribute('data-state', 'active');
    btn.style.cssText = "width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,183,0,.35);background:rgba(255,183,0,.08);color:#f5a01a;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;-webkit-user-select:none;transition:background .15s,border-color .15s;text-align:center;line-height:1;padding:0 0 1px 1px;";
    btn.title = 'Wake Lock ON · cliquer pour désactiver';
  } else {
    // INACTIF : LUNE ☾ blanche inclinée - cercle 28px (comme ⚙)
    btn.innerHTML = '<span style="display:inline-block;transform:rotate(-25deg);">☾</span>';
    btn.setAttribute('data-state', 'inactive');
    btn.style.cssText = "width:28px;height:28px;border-radius:50%;border:1px solid rgba(230,235,245,.35);background:rgba(230,235,245,.08);color:#e6ebf5;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;-webkit-user-select:none;transition:background .15s,border-color .15s;text-align:center;line-height:1;padding:0;";
    btn.title = 'Wake Lock OFF · cliquer pour empêcher l\'écran de s\'éteindre';
  }
}

async function toggleWakeLock() {
  // v8.0 FIX FINAL · lire l'état depuis localStorage à chaque clic (source de vérité)
  // Permet de gérer correctement les rechargements/reprise de la PWA
  let storedState = '0';
  try { storedState = localStorage.getItem('aura_wakelock') || '0'; } catch(e) {}
  const isCurrentlyOn = (storedState === '1') || (_wakeLockEnabled && _wakeLockSentinel);

  if (isCurrentlyOn) {
    // ── DÉSACTIVER ──
    _wakeLockEnabled = false;
    await _releaseWakeLock();
    try { localStorage.setItem('aura_wakelock', '0'); } catch(e) {}
    _updateWakeLockButton();
    if (typeof showToast === 'function') {
      showToast('☾ Wake Lock OFF · l\'écran peut s\'éteindre normalement', 4000, 'info');
    }
  } else {
    // ── ACTIVER ──
    const success = await _requestWakeLock();
    if (success) {
      _wakeLockEnabled = true;
      try { localStorage.setItem('aura_wakelock', '1'); } catch(e) {}
      _updateWakeLockButton();
      if (typeof showToast === 'function') {
        showToast('☼ Wake Lock ON · écran maintenu allumé · AURA ∞ tourne en continu', 4000, 'win');
      }
    } else {
      if (typeof showToast === 'function') {
        showToast('Wake Lock non supporté · utilise "Rester actif" dans Options développeur', 6000, 'warn');
      }
    }
  }
}
window.toggleWakeLock = toggleWakeLock;

// Réacquérir le wake lock quand l'écran redevient visible
// (l'API libère automatiquement quand l'onglet passe en arrière-plan)
document.addEventListener('visibilitychange', async () => {
  // Source de vérité = localStorage (la variable mémoire _wakeLockEnabled se perd
  // au rechargement/reprise PWA). On ré-acquiert le verrou dès que la page redevient
  // visible si l'utilisateur l'avait activé.
  let want = '0';
  try { want = localStorage.getItem('aura_wakelock') || '0'; } catch(e) {}
  if (want === '1' && document.visibilityState === 'visible' && !_wakeLockSentinel) {
    _wakeLockEnabled = true;
    await _requestWakeLock();
    _updateWakeLockButton();
  }
});

// Restaurer l'état au chargement (depuis localStorage). On n'utilise PAS window.load
// seul : en PWA/reprise, le script peut tourner alors que la page est déjà chargée,
// et l'event 'load' ne se déclenche jamais. On lance donc l'init immédiatement si le
// document est déjà prêt, sinon on attend 'load'.
async function _initWakeLockFromStorage() {
  try {
    const saved = localStorage.getItem('aura_wakelock');
    if (saved === '1') {
      _wakeLockEnabled = true;
      const success = await _requestWakeLock();
      if (success) _updateWakeLockButton();
    } else {
      _updateWakeLockButton();
    }
  } catch(e) {}
}
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  _initWakeLockFromStorage();
} else {
  window.addEventListener('load', _initWakeLockFromStorage);
}

// ════════════════════════════════════════════════════════════
function toggleMode() {
  if(typeof S === 'undefined' || S === null) return;
  // setBotMode already handles haptic, sound, toast, state
  if(typeof setBotMode === 'function') {
    setBotMode(S.botAutoMode === false);  // flip current state
  } else {
    S.botAutoMode = (S.botAutoMode === false);
  }
  updateModeButton();
  try { if(typeof renderPendingActions === 'function') renderPendingActions(); } catch(e) {}
}

function updateModeButton() {
  const btn   = document.getElementById('modeToggleBtn');
  const label = document.getElementById('modeLabelText');
  if(!btn || !label) return;
  const isAuto = typeof S !== 'undefined' ? (S.botAutoMode !== false) : true;
  btn.className = '';           // reset all classes
  btn.classList.add(isAuto ? 'auto' : 'manual');
  label.textContent = isAuto ? 'AUTO' : 'MAN';
  btn.title = isAuto
    ? 'Mode AUTO · bot actif · cliquer pour MANUEL'
    : 'Mode MANUEL · bot suspendu · cliquer pour AUTO';
}

window.toggleMode       = toggleMode;
window.updateModeButton = updateModeButton;

// ═══════════════════════════════════════════════════════════════════
// v23 · #5 ALERTES SEUILS P&L — Notifications automatiques
// ═══════════════════════════════════════════════════════════════════

function _initAlerts() {
  if(!S.pnlAlerts) S.pnlAlerts = {
    sessionGain:  { enabled: true,  value: 10,   triggered: false },  // +$10 session
    sessionLoss:  { enabled: true,  value: -5,   triggered: false },  // -$5 session
    dailyGain:    { enabled: true,  value: 50,   triggered: false },  // +$50 jour
    dailyLoss:    { enabled: true,  value: -20,  triggered: false },  // -$20 jour
    drawdown:     { enabled: true,  value: 5,    triggered: false },  // 5% drawdown
    winStreak:    { enabled: true,  value: 5,    triggered: false },  // 5 wins de suite
    tradeCount:   { enabled: false, value: 100,  triggered: false },  // 100 trades
  };
}

// Vérifier toutes les alertes (appelé après chaque trade et dans renderHome)
function checkPnlAlerts() {
  _initAlerts();
  const a = S.pnlAlerts;
  // FIX P&L session : meme source que le hero badge et les quick-stats —
  // la periode recalibree a minuit (today.usd), et non le _startPortfolio
  // fige d'il y a longtemps qui donnait de fausses alertes (-$14.67 sur un
  // portefeuille pourtant plat).
  let pnlSession = 0;
  if (typeof _computePnlByPeriod === 'function') {
    const _pp = _computePnlByPeriod();
    if (_pp && _pp.today && _pp.today.hasData) pnlSession = _pp.today.usd;
  }
  const dd = S.perf?.maxDrawdown || 0;
  const totalT = S.totalTrades || 0;

  // Gain session
  if(a.sessionGain.enabled && !a.sessionGain.triggered && pnlSession >= a.sessionGain.value) {
    a.sessionGain.triggered = true;
    showMilestone('🎯', `Objectif session atteint ! +$${pnlSession.toFixed(2)}`, false, 4000);
    try { sendNotif('🎯 AURA — Objectif session !', `+$${pnlSession.toFixed(2)} en session`, '🎯'); } catch(e) {}
  }
  // Perte session
  if(a.sessionLoss.enabled && !a.sessionLoss.triggered && pnlSession <= a.sessionLoss.value) {
    a.sessionLoss.triggered = true;
    showMilestone('⚠', `Alerte perte session : $${pnlSession.toFixed(2)}`, true, 4000);
    try { sendNotif('⚠️ AURA — Perte session', `$${pnlSession.toFixed(2)} — surveille tes positions`, '⚠️'); } catch(e) {}
  }
  // Gain journalier
  const pnl24h = (S.pnl24h || 0);
  if(a.dailyGain.enabled && !a.dailyGain.triggered && pnl24h >= a.dailyGain.value) {
    a.dailyGain.triggered = true;
    showMilestone('💰', `Excellent ! +$${pnl24h.toFixed(2)} aujourd'hui !`, false, 4000);
    try { sendNotif('💰 AURA — Grande journée !', `+$${pnl24h.toFixed(2)} en 24h`, '💰'); } catch(e) {}
  }
  // Perte journalière
  if(a.dailyLoss.enabled && !a.dailyLoss.triggered && pnl24h <= a.dailyLoss.value) {
    a.dailyLoss.triggered = true;
    showMilestone('🚨', `Alerte : -$${Math.abs(pnl24h).toFixed(2)} aujourd'hui`, true, 4000);
    try { sendNotif('🚨 AURA — Pertes importantes', `-$${Math.abs(pnl24h).toFixed(2)} en 24h`, '🚨'); } catch(e) {}
  }
  // Drawdown
  if(a.drawdown.enabled && !a.drawdown.triggered && Math.abs(dd*100) >= a.drawdown.value) {
    a.drawdown.triggered = true;
    showMilestone('📉', `Drawdown ${(dd*100).toFixed(1)}% — attention`, true, 4000);
    try { notifDrawdown(dd*100); } catch(e) {}
  }
  // Win streak
  const ws = Object.values(S.pairStates || {}).reduce((max, ps) => {
    const streak = ps.streak || 0;
    return streak > max ? streak : max;
  }, 0);
  if(a.winStreak.enabled && !a.winStreak.triggered && ws >= a.winStreak.value) {
    a.winStreak.triggered = true;
    showMilestone('🔥', `Série de ${ws} victoires ! En feu !`, false, 4000);
  }
  // Trades count
  if(a.tradeCount.enabled && !a.tradeCount.triggered && totalT >= a.tradeCount.value) {
    a.tradeCount.triggered = true;
    showMilestone('📊', `${totalT} trades atteints ! Expérimenté !`, false, 4000);
  }

  // Reset triggers quotidien (si nouvelle session)
  if(S._lastAlertReset && (Date.now() - S._lastAlertReset) > 86400000) {
    ['sessionGain','sessionLoss','dailyGain','dailyLoss','drawdown'].forEach(k => {
      if(a[k]) a[k].triggered = false;
    });
    S._lastAlertReset = Date.now();
  }
  if(!S._lastAlertReset) S._lastAlertReset = Date.now();
}
window.checkPnlAlerts = checkPnlAlerts;

// Modifier un seuil d'alerte
function editAlertValue(key) {
  _initAlerts();
  const a = S.pnlAlerts[key];
  if(!a) return;
  const labels = {
    sessionGain:  'Gain session minimum ($)',
    sessionLoss:  'Perte session maximum ($, négatif)',
    dailyGain:    'Gain journalier minimum ($)',
    dailyLoss:    'Perte journalière maximum ($, négatif)',
    drawdown:     'Drawdown maximum (%)',
    winStreak:    'Série de victoires minimum',
    tradeCount:   'Nombre de trades cible',
  };
  const val = prompt(`${labels[key] || key}\nValeur actuelle: ${a.value}`, a.value);
  if(val === null) return;
  const n = parseFloat(val);
  if(!isFinite(n)) { showToast('⚠ Valeur invalide', 1500, 'warn'); return; }
  a.value = n;
  a.triggered = false; // reset trigger
  renderAlertsSection();
  showToast('✅ Seuil mis à jour', 1500, 'win');
}
window.editAlertValue = editAlertValue;

function toggleAlert(key) {
  _initAlerts();
  if(S.pnlAlerts[key]) {
    S.pnlAlerts[key].enabled = !S.pnlAlerts[key].enabled;
    S.pnlAlerts[key].triggered = false;
  }
  renderAlertsSection();
}
window.toggleAlert = toggleAlert;

// ═══════════════════════════════════════════════════════════════════
// v23 · #20 OBJECTIFS ET JALONS
// ═══════════════════════════════════════════════════════════════════

function _getGoals() {
  const portfolio = S.portfolio || 0;
  const startPortfolio = S._startPortfolio || portfolio;
  const totalGain = portfolio - (S.ownFundsInjected || startPortfolio);
  const wr = S.totalTrades > 0 ? S.winTrades / S.totalTrades * 100 : 0;
  const totalT = S.totalTrades || 0;
  const sharpe = S.perf?.sharpe || 0;

  return [
    {
      icon: '🥚', name: 'Premier trade',
      desc: 'Ouvrir votre premier trade',
      current: Math.min(1, totalT), target: 1,
      unit: 'trade', done: totalT >= 1
    },
    {
      icon: '🎯', name: 'Trader actif',
      desc: '10 trades complétés',
      current: Math.min(10, totalT), target: 10,
      unit: 'trades', done: totalT >= 10
    },
    {
      icon: '📊', name: 'Expérimenté',
      desc: '100 trades complétés',
      current: Math.min(100, totalT), target: 100,
      unit: 'trades', done: totalT >= 100
    },
    {
      icon: '🏆', name: 'Win Rate 70%',
      desc: 'Maintenir 70%+ sur 20 trades min',
      current: totalT >= 20 ? Math.min(70, wr) : 0,
      target: 70, unit: '%',
      done: wr >= 70 && totalT >= 20
    },
    {
      icon: '💰', name: 'Premier +$10',
      desc: 'Gagner $10 en P&L net',
      current: Math.min(10, Math.max(0, totalGain)),
      target: 10, unit: '$',
      done: totalGain >= 10
    },
    {
      icon: '💎', name: 'Premier +$100',
      desc: 'Gagner $100 en P&L net',
      current: Math.min(100, Math.max(0, totalGain)),
      target: 100, unit: '$',
      done: totalGain >= 100
    },
    {
      icon: '🚀', name: 'Premier +$1000',
      desc: 'Gagner $1000 en P&L net',
      current: Math.min(1000, Math.max(0, totalGain)),
      target: 1000, unit: '$',
      done: totalGain >= 1000
    },
    {
      icon: '⚡', name: 'Sharpe positif',
      desc: 'Sharpe ratio > 0.5',
      current: Math.min(0.5, Math.max(0, sharpe)),
      target: 0.5, unit: '',
      done: sharpe >= 0.5
    },
    {
      icon: '🔥', name: 'Série de 5',
      desc: '5 trades gagnants de suite',
      current: Math.min(5, Object.values(S.pairStates||{}).reduce((m,ps)=>Math.max(m,ps.streak||0),0)),
      target: 5, unit: 'wins',
      done: Object.values(S.pairStates||{}).some(ps=>(ps.streak||0)>=5)
    },
    {
      icon: '🌟', name: 'Maître du Twin',
      desc: 'Twin Live actif avec 10+ trades',
      current: Math.min(10, (S.twin?.trades?.length||0)),
      target: 10, unit: 'trades twin',
      done: (S.twin?.trades?.length||0) >= 10
    },
  ];
}

// Rendu de la section Alertes + Objectifs dans le Home
function renderAlertsSection() {
  const el = document.getElementById('alertsSection');
  if(!el) return;
  _initAlerts();
  const a = S.pnlAlerts;
  const goals = _getGoals();
  const doneCount = goals.filter(g => g.done).length;

  const alertDefs = [
    { key:'sessionGain', emoji:'🎯', label:'Gain session',    sub:'Alerte quand P&L session ≥ seuil', loss:false },
    { key:'sessionLoss', emoji:'🚨', label:'Perte session',   sub:'Alerte quand P&L session ≤ seuil', loss:true  },
    { key:'dailyGain',   emoji:'💰', label:'Gain journalier', sub:'Alerte quand P&L 24h ≥ seuil',     loss:false },
    { key:'dailyLoss',   emoji:'📉', label:'Perte journalière',sub:'Alerte quand P&L 24h ≤ seuil',    loss:true  },
    { key:'drawdown',    emoji:'⚠️', label:'Drawdown (%)',    sub:'Alerte si drawdown ≥ seuil',        loss:true  },
    { key:'winStreak',   emoji:'🔥', label:'Win Streak',      sub:'Alerte à N victoires consécutives', loss:false },
    { key:'tradeCount',  emoji:'📊', label:'Nb Trades',       sub:'Alerte à N trades complétés',       loss:false },
  ];

  el.innerHTML = `
    <!-- Alertes P&L -->
    <div class="alert-card">
      <div class="alert-card-title">🔔 Alertes Seuils P&L</div>
      ${alertDefs.map(d => {
        const cfg = a[d.key] || { enabled:false, value:0, triggered:false };
        return `
        <div class="alert-row">
          <div class="alert-row-left">
            <span>${d.emoji}</span>
            <div>
              <span class="alert-row-label">${d.label}</span>
              <span class="alert-row-sub">${d.sub}${cfg.triggered?' · ✅ Déclenchée':''}</span>
            </div>
          </div>
          <div class="alert-row-right">
            <span class="alert-val" onclick="editAlertValue('${d.key}')" title="Cliquer pour modifier">
              ${d.key==='drawdown'||d.key==='winStreak'||d.key==='tradeCount' ? cfg.value : (cfg.value>=0?'+':'')+'$'+Math.abs(cfg.value)}
            </span>
            <button class="alert-toggle ${cfg.enabled?'on':''} ${d.loss?'loss':''}"
              onclick="toggleAlert('${d.key}')"
              title="${cfg.enabled?'Désactiver':'Activer'}"></button>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Objectifs et jalons -->
    <div class="alert-card">
      <div class="alert-card-title">
        🏆 Objectifs & Jalons
        <span style="margin-left:auto;font-size:9px;color:var(--t3);font-weight:400;">${doneCount}/${goals.length} atteints</span>
      </div>
      ${goals.map(g => {
        const pct = Math.min(100, g.target > 0 ? (g.current / g.target * 100) : 0);
        const barColor = g.done ? 'var(--up)' : pct > 50 ? 'var(--ice)' : 'var(--gold)';
        const status = g.done ? 'done' : pct > 0 ? 'progress' : 'pending';
        const statusLabel = g.done ? '✅ Atteint' : pct > 0 ? `${pct.toFixed(0)}%` : '⏳';
        return `
        <div class="goal-item">
          <div class="goal-icon">${g.icon}</div>
          <div class="goal-info">
            <div class="goal-name">${g.name}</div>
            <div class="goal-progress-wrap">
              <div class="goal-bar">
                <div class="goal-bar-fill" style="width:${pct}%;background:${barColor};"></div>
              </div>
              <div class="goal-meta">
                <span>${g.desc}</span>
                <span style="color:${barColor};">${g.unit ? g.current.toFixed(g.unit==='$'?2:0)+' / '+g.target+' '+g.unit : ''}</span>
              </div>
            </div>
          </div>
          <div class="goal-status ${status}">${statusLabel}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}
window.renderAlertsSection = renderAlertsSection;
// ═══ v24 · #2 HEATMAP TEMPORELLE ENRICHIE ═══
function renderHeatmapSection() {
  const el = document.getElementById('heatmapSection');
  if(!el) return;
  const hm = S.heatmap || {byHour:{},byWeekday:{},byDayHour:{},byPair:{}};
  const totalTrades = S.totalTrades || 0;
  if(totalTrades === 0) {
    el.innerHTML = '<div class="hm-section"><div class="hm-title">⏰ Heatmap Temporelle</div><div style="text-align:center;padding:20px;font-size:10px;color:var(--t3);">📊 Se remplit après chaque trade clôturé.</div></div>';
    return;
  }
  const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const byDH = hm.byDayHour || {};
  const allVals = Object.values(byDH).map(v=>Math.abs(v.pnl));
  const maxPnl = Math.max(1,...allVals);

  // Grille 7x24
  let g = '<div class="hm-grid">';
  g += '<div class="hm-lbl-d"></div>';
  for(let h=0;h<24;h++) g += '<div class="hm-lbl-h">'+(h%6===0?h+'h':'')+'</div>';
  for(let wd=0;wd<7;wd++){
    g += '<div class="hm-lbl-d">'+days[wd]+'</div>';
    for(let h=0;h<24;h++){
      const k=wd+'_'+h, cell=byDH[k]||{count:0,pnl:0,wins:0};
      let bg='rgba(255,255,255,.03)';
      if(cell.count>0){
        const inten=Math.min(1,Math.abs(cell.pnl)/maxPnl);
        const rgb=cell.pnl>0?'0,232,122':'255,61,107';
        bg='rgba('+rgb+','+(inten*0.75+0.1).toFixed(2)+')';
      }
      const wr=cell.count>0?Math.round(cell.wins/cell.count*100):0;
      const tip=cell.count>0?days[wd]+' '+h+'h · '+cell.count+' trades · '+(cell.pnl>=0?'+':'')+'$'+cell.pnl.toFixed(2)+' · '+wr+'%WR':days[wd]+' '+h+'h — aucun trade';
      g += '<div class="hm-cell" style="background:'+bg+';" onclick="showToast(\''+tip.replace(/'/g,"\\'")+'\')" title="'+tip+'"></div>';
    }
  }
  g += '</div>';

  // Recommandations
  const hrRanked = Array.from({length:24},(_,h)=>({h,...(hm.byHour[h]||{count:0,pnl:0,wins:0})})).filter(x=>x.count>=2).sort((a,b)=>b.pnl-a.pnl);
  const dayRanked = [0,1,2,3,4,5,6].map(wd=>({wd,...(hm.byWeekday[wd]||{count:0,pnl:0,wins:0})})).filter(x=>x.count>=2).sort((a,b)=>b.pnl-a.pnl);
  let recos = '';
  if(hrRanked.length>0){
    const b=hrRanked[0];
    recos += '<div class="hm-reco"><span style="font-size:14px;">✅</span><span style="color:var(--t2);">Meilleure heure : <strong style="color:var(--t1);">'+b.h+'h</strong> · '+b.count+' trades · <strong style="color:var(--up);">+$'+b.pnl.toFixed(2)+'</strong> · '+Math.round(b.wins/b.count*100)+'%WR</span></div>';
  }
  if(hrRanked.length>1){
    const w=hrRanked[hrRanked.length-1];
    if(w.pnl<0) recos += '<div class="hm-reco"><span style="font-size:14px;">⚠️</span><span style="color:var(--t2);">Éviter <strong style="color:var(--t1);">'+w.h+'h</strong> · '+w.count+' trades · <strong style="color:var(--down);">$'+w.pnl.toFixed(2)+'</strong></span></div>';
  }
  if(dayRanked.length>0){
    const b=dayRanked[0];
    recos += '<div class="hm-reco"><span style="font-size:14px;">📅</span><span style="color:var(--t2);">Meilleur jour : <strong style="color:var(--t1);">'+days[b.wd]+'</strong> · <strong style="color:var(--up);">+$'+b.pnl.toFixed(2)+'</strong></span></div>';
  }

  // Par paire
  const byPair = hm.byPair || {};
  const pairRows = Object.entries(byPair).map(([pair,data])=>({pair,...data.total, bestH:Object.entries(data.byHour||{}).sort((a,b)=>b[1].pnl-a[1].pnl)[0]})).filter(p=>p.count>=2).sort((a,b)=>b.pnl-a.pnl).slice(0,6);
  let pairHTML = '';
  pairRows.forEach(p=>{
    const wr=p.count>0?Math.round(p.wins/p.count*100):0;
    const bh=p.bestH?(' · '+p.bestH[0]+'h best'):'';
    pairHTML+='<div class="hm-pair-row"><div><span style="font-weight:700;color:var(--t1);">'+p.pair.replace('/USDT','')+'</span><span style="font-size:8px;color:var(--t3);margin-left:6px;">'+p.count+' trades · '+wr+'%WR'+bh+'</span></div><span style="font-family:var(--font-mono);font-weight:700;color:'+(p.pnl>=0?'var(--up)':'var(--down)')+';">'+(p.pnl>=0?'+':'')+'$'+p.pnl.toFixed(2)+'</span></div>';
  });

  el.innerHTML =
    '<div class="hm-section"><div class="hm-title">⏰ Heatmap Temporelle <span style="font-size:8px;color:var(--t3);font-weight:400;">'+totalTrades+' trades · clic = détails</span></div>'+g+'<div style="display:flex;gap:10px;margin-top:5px;font-size:8px;color:var(--t3);"><span>🟢 Gain</span><span>🔴 Perte</span><span>⬛ Aucun</span></div></div>'
    +(recos?'<div class="hm-section"><div class="hm-title">💡 Recommandations</div>'+recos+'</div>':'')
    +(pairHTML?'<div class="hm-section"><div class="hm-title">₿ Par paire</div>'+pairHTML+'</div>':'');
}
window.renderHeatmapSection = renderHeatmapSection;
// ═══ v25 · #36 ANALYSE DRAWDOWN AVANCÉE ═══
function renderDrawdownSection() {
  const el = document.getElementById('drawdownSection');
  if(!el) return;

  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );

  if(allTrades.length < 3) {
    el.innerHTML='<div class="dd-section"><div class="dd-title">📉 Analyse Drawdown</div><div style="text-align:center;padding:20px;font-size:10px;color:var(--t3);">Minimum 3 trades nécessaires.</div></div>';
    return;
  }

  const returnsUsd = allTrades.map(t=>t.pnlUsdt||0);
  const returnsPct = allTrades.map(t=>t.pnl||0);

  // ── Courbe equity cumulée ──
  let cum=0, peak=0, curDD=0, maxDD=0, maxDDPct=0;
  const equity=[], ddCurve=[];
  const episodes=[];
  let inDD=false, ddStart=0, ddPeak=0;

  returnsUsd.forEach((r,i)=>{
    cum+=r;
    equity.push(cum);
    if(cum>peak){ peak=cum; if(inDD){ episodes.push({depth:ddPeak-cum,pct:peak>0?(ddPeak-cum)/ddPeak*100:0,duration:i-ddStart}); inDD=false; } }
    const dd=peak>0?(cum-peak)/peak*100:0;
    ddCurve.push(dd);
    if(dd<curDD) curDD=dd;
    if(dd<maxDD){ maxDD=dd; maxDDPct=dd; }
    if(dd<-0.5&&!inDD){ inDD=true; ddStart=i; ddPeak=peak; }
  });

  // Drawdown actuel
  const lastEquity=equity[equity.length-1]||0;
  const peakEquity=Math.max(...equity);
  const currentDD=peakEquity>0?(lastEquity-peakEquity)/peakEquity*100:0;

  // Métriques avancées
  const m=typeof computeAdvancedMetrics==='function'?computeAdvancedMetrics():null;

  // Pertes consécutives max
  let maxConsec=0,curConsec=0;
  const consecDist={};
  returnsPct.forEach(r=>{
    if(r<0){curConsec++;maxConsec=Math.max(maxConsec,curConsec);}
    else{if(curConsec>0){consecDist[curConsec]=(consecDist[curConsec]||0)+1;}curConsec=0;}
  });

  // Pires épisodes de drawdown
  const sortedEp=episodes.sort((a,b)=>b.depth-a.depth).slice(0,5);

  // Canvas equity curve simplifié (SVG)
  const W=300,H=60;
  const minE=Math.min(...equity)||0;
  const maxE=Math.max(...equity)||1;
  const pts=equity.map((v,i)=>{
    const x=(i/(equity.length-1))*W;
    const y=H-((v-minE)/(maxE-minE||1))*H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const ddPts=ddCurve.map((v,i)=>{
    const x=(i/(ddCurve.length-1))*W;
    const y=H-((v-Math.min(...ddCurve))/(Math.max(...ddCurve)-Math.min(...ddCurve)||1))*H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Barres pertes consécutives
  const maxConsecCount=Math.max(1,...Object.values(consecDist));
  const consecBars=Object.entries(consecDist).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([k,v])=>{
    const h=Math.max(2,Math.round(v/maxConsecCount*32));
    const col=parseInt(k)>=4?'var(--down)':parseInt(k)>=2?'var(--gold)':'var(--up)';
    return '<div class="dd-streak-col" style="height:'+h+'px;background:'+col+';flex:1;" title="'+k+' pertes cons: '+v+'x" onclick="showToast(this.title)"></div>';
  }).join('');

  el.innerHTML=
    '<div class="dd-section">'
      +'<div class="dd-title">📉 Analyse Drawdown Avancée <span style="font-size:8px;color:var(--t3);font-weight:400;">'+allTrades.length+' trades</span></div>'

      // Métriques clés
      +'<div class="dd-metric-grid">'
        +'<div class="dd-metric"><span class="dd-metric-val" style="color:'+(Math.abs(currentDD)<3?'var(--up)':Math.abs(currentDD)<10?'var(--gold)':'var(--down)')+';">'+currentDD.toFixed(2)+'%</span><span class="dd-metric-lbl">DD Actuel</span></div>'
        +'<div class="dd-metric"><span class="dd-metric-val" style="color:var(--down);">'+maxDDPct.toFixed(2)+'%</span><span class="dd-metric-lbl">DD Maximum</span></div>'
        +'<div class="dd-metric"><span class="dd-metric-val">'+maxConsec+'</span><span class="dd-metric-lbl">Pertes consécutives max</span></div>'
        +'<div class="dd-metric"><span class="dd-metric-val" style="color:'+(episodes.length===0?'var(--up)':'var(--t1)')+';">'+episodes.length+'</span><span class="dd-metric-lbl">Épisodes de DD</span></div>'
      +'</div>'

      // Courbe equity SVG
      +'<div style="margin-bottom:8px;">'
        +'<div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Courbe equity cumulée</div>'
        +'<svg width="100%" viewBox="0 0 '+W+' '+H+'" style="display:block;border-radius:6px;background:var(--s2);">'
          +'<polyline points="'+pts+'" fill="none" stroke="'+(lastEquity>=0?'#00e87a':'#ff3d6b')+'" stroke-width="1.5"/>'
          +'<line x1="0" y1="'+(H-((0-minE)/(maxE-minE||1))*H).toFixed(1)+'" x2="'+W+'" y2="'+(H-((0-minE)/(maxE-minE||1))*H).toFixed(1)+'" stroke="rgba(255,255,255,.15)" stroke-width="0.5" stroke-dasharray="4,4"/>'
        +'</svg>'
      +'</div>'

      // Métriques avancées si dispo
      +(m?'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">'
          +'<div class="dd-metric"><span class="dd-metric-val" style="color:'+(m.sharpe>=1?'var(--up)':m.sharpe>=0?'var(--gold)':'var(--down)')+';">'+m.sharpe.toFixed(2)+'</span><span class="dd-metric-lbl">Sharpe</span></div>'
          +'<div class="dd-metric"><span class="dd-metric-val" style="color:'+(m.calmar>=1?'var(--up)':m.calmar>=0?'var(--gold)':'var(--down)')+';">'+m.calmar.toFixed(2)+'</span><span class="dd-metric-lbl">Calmar</span></div>'
          +'<div class="dd-metric"><span class="dd-metric-val" style="color:'+(m.profitFactor>=1.5?'var(--up)':m.profitFactor>=1?'var(--gold)':'var(--down)')+';">'+m.profitFactor.toFixed(2)+'</span><span class="dd-metric-lbl">Profit Factor</span></div>'
        +'</div>':'')

      // Pires épisodes
      +(sortedEp.length>0?'<div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Pires épisodes de drawdown</div>'
        +sortedEp.map((ep,i)=>'<div class="dd-episode"><span class="dd-episode-rank">'+['🥇','🥈','🥉','4️⃣','5️⃣'][i]+'</span><div class="dd-episode-info"><span style="color:var(--t2);font-size:10px;">Durée ~'+ep.duration+' trades · Profondeur $'+ep.depth.toFixed(2)+'</span></div><span class="dd-episode-pct">'+ep.pct.toFixed(1)+'%</span></div>').join(''):'')

      // Distribution pertes consécutives
      +(consecBars?'<div style="margin-top:10px;"><div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Distribution pertes consécutives (clic = détails)</div><div class="dd-streak-bar">'+consecBars+'</div><div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-top:2px;"><span>1 perte</span><span>'+Math.max(...Object.keys(consecDist).map(Number))+' pertes</span></div></div>':'')

    +'</div>';
}
window.renderDrawdownSection = renderDrawdownSection;
// ═══ v26 · #7 SIMULATION WHAT-IF INTERACTIVE ═══
const _WI_PARAMS = {
  stake:    50,    // $ par trade
  wr:       65,    // win rate %
  avgWin:   2.0,   // % gain moyen
  avgLoss:  1.2,   // % perte moyenne
  trades:   50,    // nombre de trades simulés
  fees:     0.1,   // frais % par trade (aller)
};

function initWhatIfSection() {
  const el = document.getElementById('whatifSection');
  if(!el) return;

  // Lire valeurs actuelles depuis S pour pré-remplir
  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );
  if(allTrades.length >= 5) {
    const wins  = allTrades.filter(t=>(t.pnlUsdt||0)>0);
    const loses = allTrades.filter(t=>(t.pnlUsdt||0)<0);
    _WI_PARAMS.wr     = Math.round(wins.length/allTrades.length*100);
    _WI_PARAMS.trades = Math.min(200, Math.max(10, allTrades.length*2));
    if(wins.length>0)  _WI_PARAMS.avgWin  = parseFloat((wins.reduce((s,t)=>s+(t.pnl||0),0)/wins.length).toFixed(2));
    if(loses.length>0) _WI_PARAMS.avgLoss = parseFloat((Math.abs(loses.reduce((s,t)=>s+(t.pnl||0),0)/loses.length)).toFixed(2));
    if(S.pairStates) {
      const stakes = Object.values(S.pairStates).map(ps=>ps.stake||0).filter(s=>s>0);
      if(stakes.length>0) _WI_PARAMS.stake = Math.round(stakes.reduce((a,b)=>a+b,0)/stakes.length);
    }
  }

  el.innerHTML = `
    <div class="wi-section">
      <div class="wi-title">🔮 Simulation What-If</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:10px;">Modifie les paramètres pour voir l'impact sur tes profits.</div>

      <div class="wi-slider-row">
        <span class="wi-slider-lbl">💰 Stake / trade</span>
        <input type="range" class="wi-slider" min="10" max="500" step="10" value="${_WI_PARAMS.stake}"
          oninput="_WI_PARAMS.stake=parseInt(this.value);document.getElementById('wiStakeVal').textContent='$'+this.value;updateWhatIf()">
        <span class="wi-slider-val" id="wiStakeVal">$${_WI_PARAMS.stake}</span>
      </div>
      <div class="wi-slider-row">
        <span class="wi-slider-lbl">🎯 Win Rate</span>
        <input type="range" class="wi-slider" min="30" max="90" step="1" value="${_WI_PARAMS.wr}"
          oninput="_WI_PARAMS.wr=parseInt(this.value);document.getElementById('wiWrVal').textContent=this.value+'%';updateWhatIf()">
        <span class="wi-slider-val" id="wiWrVal">${_WI_PARAMS.wr}%</span>
      </div>
      <div class="wi-slider-row">
        <span class="wi-slider-lbl">📈 Gain moyen</span>
        <input type="range" class="wi-slider" min="0.5" max="10" step="0.1" value="${_WI_PARAMS.avgWin}"
          oninput="_WI_PARAMS.avgWin=parseFloat(this.value);document.getElementById('wiWinVal').textContent='+'+this.value+'%';updateWhatIf()">
        <span class="wi-slider-val" id="wiWinVal">+${_WI_PARAMS.avgWin}%</span>
      </div>
      <div class="wi-slider-row">
        <span class="wi-slider-lbl">📉 Perte moyenne</span>
        <input type="range" class="wi-slider" min="0.3" max="8" step="0.1" value="${_WI_PARAMS.avgLoss}"
          oninput="_WI_PARAMS.avgLoss=parseFloat(this.value);document.getElementById('wiLossVal').textContent='-'+this.value+'%';updateWhatIf()">
        <span class="wi-slider-val" id="wiLossVal">-${_WI_PARAMS.avgLoss}%</span>
      </div>
      <div class="wi-slider-row">
        <span class="wi-slider-lbl">🔄 Nb trades simulés</span>
        <input type="range" class="wi-slider" min="10" max="500" step="10" value="${_WI_PARAMS.trades}"
          oninput="_WI_PARAMS.trades=parseInt(this.value);document.getElementById('wiTradesVal').textContent=this.value;updateWhatIf()">
        <span class="wi-slider-val" id="wiTradesVal">${_WI_PARAMS.trades}</span>
      </div>
      <div class="wi-slider-row">
        <span class="wi-slider-lbl">💸 Frais (% aller)</span>
        <input type="range" class="wi-slider" min="0" max="0.5" step="0.01" value="${_WI_PARAMS.fees}"
          oninput="_WI_PARAMS.fees=parseFloat(this.value);document.getElementById('wiFeesVal').textContent=this.value+'%';updateWhatIf()">
        <span class="wi-slider-val" id="wiFeesVal">${_WI_PARAMS.fees}%</span>
      </div>

      <!-- Résultats -->
      <div id="wiResults"></div>

      <!-- Comparaison avec réel -->
      <div id="wiCompare" style="margin-top:10px;"></div>
    </div>`;

  updateWhatIf();
}
window.initWhatIfSection = initWhatIfSection;

function _simulateWhatIf(p) {
  const wr     = p.wr / 100;
  const nWins  = Math.round(p.trades * wr);
  const nLoss  = p.trades - nWins;
  const feeRt  = p.fees / 100;

  const grossWin  = nWins  * p.stake * (p.avgWin  / 100);
  const grossLoss = nLoss  * p.stake * (p.avgLoss / 100);
  const totalFees = p.trades * p.stake * feeRt * 2; // aller-retour
  const netPnl    = grossWin - grossLoss - totalFees;

  const expectancy = (wr * p.avgWin/100) - ((1-wr) * p.avgLoss/100) - feeRt*2;
  const roi        = p.stake > 0 ? netPnl / p.stake * 100 : 0;

  // Simuler le pire drawdown probable (formule simplifiée)
  const maxConsecLoss = Math.ceil(Math.log(0.05) / Math.log(1-wr));
  const estMaxDD = maxConsecLoss * p.stake * p.avgLoss/100;

  return { grossWin, grossLoss, totalFees, netPnl, expectancy, roi, maxConsecLoss, estMaxDD, nWins, nLoss };
}

function updateWhatIf() {
  const res = _simulateWhatIf(_WI_PARAMS);
  const resEl  = document.getElementById('wiResults');
  const cmpEl  = document.getElementById('wiCompare');
  if(!resEl) return;

  const pnlCol = res.netPnl >= 0 ? 'var(--up)' : 'var(--down)';
  const expCol = res.expectancy >= 0 ? 'var(--up)' : 'var(--down)';

  resEl.innerHTML = `
    <div class="wi-result-grid">
      <div class="wi-result-card">
        <span class="wi-result-val" style="color:${pnlCol};">${res.netPnl>=0?'+':''}$${res.netPnl.toFixed(2)}</span>
        <span class="wi-result-lbl">P&L Net estimé</span>
      </div>
      <div class="wi-result-card">
        <span class="wi-result-val" style="color:${expCol};">${(res.expectancy*100).toFixed(3)}%</span>
        <span class="wi-result-lbl">Espérance / trade</span>
      </div>
      <div class="wi-result-card">
        <span class="wi-result-val" style="color:var(--down);">-$${res.estMaxDD.toFixed(2)}</span>
        <span class="wi-result-lbl">DD max estimé</span>
      </div>
      <div class="wi-result-card">
        <span class="wi-result-val" style="color:var(--gold);">-$${res.totalFees.toFixed(2)}</span>
        <span class="wi-result-lbl">Frais totaux</span>
      </div>
    </div>
    <div style="margin-top:8px;padding:6px 10px;background:rgba(255,255,255,.03);border-radius:8px;font-size:9px;color:var(--t3);">
      ${res.nWins} gains (+$${res.grossWin.toFixed(2)}) · ${res.nLoss} pertes (-$${res.grossLoss.toFixed(2)}) · Pire série: ~${res.maxConsecLoss} pertes cons.
      ${res.expectancy < 0 ? '<br><span style="color:var(--down);font-weight:700;">⚠ Espérance négative — stratégie non rentable à ces paramètres</span>' : ''}
    </div>`;

  // Comparaison avec les données réelles
  if(cmpEl) {
    const allT = Object.values(S.pairStates||{}).flatMap(ps=>(ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null));
    if(allT.length >= 5) {
      const realPnl = allT.reduce((s,t)=>s+(t.pnlUsdt||0),0);
      const realWR  = allT.filter(t=>(t.pnlUsdt||0)>0).length/allT.length*100;
      const diff    = res.netPnl - realPnl;
      cmpEl.innerHTML = `
        <div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;">Comparaison avec tes vrais trades</div>
        <div class="wi-compare-row">
          <span style="color:var(--t2);">P&L réel (${allT.length} trades)</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:${realPnl>=0?'var(--up)':'var(--down)'};">${realPnl>=0?'+':''}$${realPnl.toFixed(2)}</span>
        </div>
        <div class="wi-compare-row">
          <span style="color:var(--t2);">P&L simulé (${_WI_PARAMS.trades} trades)</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:${res.netPnl>=0?'var(--up)':'var(--down)'};">${res.netPnl>=0?'+':''}$${res.netPnl.toFixed(2)}</span>
        </div>
        <div class="wi-compare-row">
          <span style="color:var(--t2);">Différence</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:${diff>=0?'var(--up)':'var(--down)'};">${diff>=0?'+':''}$${diff.toFixed(2)}</span>
        </div>
        <div class="wi-compare-row">
          <span style="color:var(--t2);">WR réel vs simulé</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:var(--t1);">${realWR.toFixed(0)}% → ${_WI_PARAMS.wr}%</span>
        </div>`;
    } else {
      cmpEl.innerHTML = '';
    }
  }
}
window.updateWhatIf = updateWhatIf;
// ═══ v27 · #15 BACKTESTING RAPIDE ═══
function initBacktestSection() {
  const el = document.getElementById('backtestSection');
  if(!el) return;
  const pairs = Object.keys(PAIRS||{});
  const pairOpts = pairs.map(p=>`<option value="${p}">${p}</option>`).join('');
  el.innerHTML = `
    <div class="bt-section">
      <div class="bt-title">📊 Backtesting Rapide <span style="font-size:8px;color:var(--t3);font-weight:400;">Données Binance réelles</span></div>
      <div class="bt-controls">
        <div class="bt-control">
          <label>Paire</label>
          <select id="btPair">${pairOpts}</select>
        </div>
        <div class="bt-control">
          <label>Timeframe</label>
          <select id="btTf">
            <option value="5m">5m (~1.7j)</option>
            <option value="15m" selected>15m (~5.2j)</option>
            <option value="1h">1h (~20j)</option>
            <option value="4h">4h (~83j)</option>
          </select>
        </div>
        <div class="bt-control">
          <label>Seuil signal (%)</label>
          <input type="number" id="btThresh" value="60" min="51" max="90" step="1">
        </div>
        <div class="bt-control">
          <label>Stake ($)</label>
          <input type="number" id="btStake" value="50" min="10" max="1000" step="10">
        </div>
      </div>
      <button class="bt-run-btn" id="btRunBtn" onclick="runBacktest()">▶ Lancer le Backtest</button>
      <div id="btResults" style="display:none;"></div>
    </div>`;
}
window.initBacktestSection = initBacktestSection;

async function runBacktest() {
  const btn = document.getElementById('btRunBtn');
  const res = document.getElementById('btResults');
  if(!btn || !res) return;

  const pair   = document.getElementById('btPair')?.value || 'BTC/USDT';
  const tf     = document.getElementById('btTf')?.value   || '15m';
  const thresh = parseFloat(document.getElementById('btThresh')?.value||60)/100;
  const stake  = parseFloat(document.getElementById('btStake')?.value||50);

  btn.disabled = true;
  btn.textContent = '⏳ Fetch Binance…';
  res.style.display = 'none';

  try {
    // Fetch 500 bougies Binance
    const symbol = pair.replace('/','');
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=500`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const data = await resp.json();
    if(!Array.isArray(data)||data.length<20) throw new Error('Données insuffisantes');

    btn.textContent = '⚙️ Calcul…';

    // Convertir en bougies
    const candles = data.map(k=>({
      ts:  parseInt(k[0]),
      o:   parseFloat(k[1]),
      h:   parseFloat(k[2]),
      l:   parseFloat(k[3]),
      c:   parseFloat(k[4]),
      v:   parseFloat(k[5])
    }));

    // ── Stratégie simplifiée : EMA croisement + seuil conviction ──
    // EMA rapide (9) / lente (21) — signal LONG si ema9 > ema21 + seuil
    function ema(closes, period) {
      const k = 2/(period+1);
      let e = closes[0];
      const out = [e];
      for(let i=1;i<closes.length;i++){
        e = closes[i]*k + e*(1-k);
        out.push(e);
      }
      return out;
    }

    const closes  = candles.map(c=>c.c);
    const ema9    = ema(closes, 9);
    const ema21   = ema(closes, 21);
    const feeRate = 0.001; // 0.1% taker Binance

    // Replay
    const trades = [];
    let inPos = false, posPrice = 0, posSide = '';
    const equity = [0];
    let cumPnl = 0;

    for(let i=22; i<candles.length-1; i++) {
      const e9 = ema9[i], e21 = ema21[i];
      const prevE9 = ema9[i-1], prevE21 = ema21[i-1];
      const price  = candles[i].c;
      const next   = candles[i+1].c;

      // Conviction = ratio ema9/ema21
      const conv = e9/e21;

      if(!inPos) {
        // Signal LONG : ema9 croise ema21 à la hausse avec conviction
        if(prevE9 <= prevE21 && e9 > e21 && conv > (1+(thresh-0.5)*0.01)) {
          inPos = true; posPrice = price; posSide = 'long';
        }
        // Signal SHORT : ema9 croise ema21 à la baisse
        else if(prevE9 >= prevE21 && e9 < e21 && (1/conv) > (1+(thresh-0.5)*0.01)) {
          inPos = true; posPrice = price; posSide = 'short';
        }
      } else {
        // Sortie : croisement inverse
        const shouldExit = (posSide==='long' && e9 < e21) || (posSide==='short' && e9 > e21);
        // TP/SL : 3% / 2%
        const pnlPct = posSide==='long' ? (price-posPrice)/posPrice*100 : (posPrice-price)/posPrice*100;
        const hitTP = pnlPct >= 3.0;
        const hitSL = pnlPct <= -2.0;

        if(shouldExit || hitTP || hitSL) {
          const rawPnl = stake * pnlPct/100;
          const fee    = stake * feeRate * 2;
          const netPnl = rawPnl - fee;
          cumPnl += netPnl;
          trades.push({
            side: posSide, entry: posPrice, exit: price,
            pnlPct, netPnl, reason: hitTP?'TP':hitSL?'SL':'Signal'
          });
          equity.push(cumPnl);
          inPos = false;
        }
      }
    }

    if(trades.length === 0) {
      res.style.display='block';
      res.innerHTML='<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Aucun signal détecté sur cette période. Essaie un timeframe ou seuil différent.</div>';
      return;
    }

    // Stats
    const wins    = trades.filter(t=>t.netPnl>0);
    const losses  = trades.filter(t=>t.netPnl<=0);
    const wr      = (wins.length/trades.length*100).toFixed(1);
    const netPnl  = trades.reduce((s,t)=>s+t.netPnl,0);
    const avgWin  = wins.length>0 ? wins.reduce((s,t)=>s+t.pnlPct,0)/wins.length : 0;
    const avgLoss = losses.length>0 ? Math.abs(losses.reduce((s,t)=>s+t.pnlPct,0)/losses.length) : 0;
    const pf      = avgLoss>0 ? (avgWin*(wins.length/trades.length))/(avgLoss*(losses.length/trades.length)) : 0;

    // Equity SVG mini
    const W=280, H=50;
    const minE=Math.min(0,...equity), maxE=Math.max(1,...equity);
    const epts=equity.map((v,i)=>{
      const x=(i/(equity.length-1||1))*W;
      const y=H-((v-minE)/(maxE-minE||1))*H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    // 5 derniers trades
    const last5 = trades.slice(-5).reverse();

    res.style.display='block';
    res.innerHTML=`
      <div class="bt-metric-grid">
        <div class="bt-metric"><span class="bt-metric-val" style="color:${parseFloat(wr)>=55?'var(--up)':'var(--down)'};">${wr}%</span><span class="bt-metric-lbl">Win Rate</span></div>
        <div class="bt-metric"><span class="bt-metric-val" style="color:${netPnl>=0?'var(--up)':'var(--down)'};">${netPnl>=0?'+':''}$${netPnl.toFixed(2)}</span><span class="bt-metric-lbl">P&L Net</span></div>
        <div class="bt-metric"><span class="bt-metric-val" style="color:var(--t1);">${trades.length}</span><span class="bt-metric-lbl">Trades</span></div>
        <div class="bt-metric"><span class="bt-metric-val" style="color:var(--up);">+${avgWin.toFixed(2)}%</span><span class="bt-metric-lbl">Gain moy.</span></div>
        <div class="bt-metric"><span class="bt-metric-val" style="color:var(--down);">-${avgLoss.toFixed(2)}%</span><span class="bt-metric-lbl">Perte moy.</span></div>
        <div class="bt-metric"><span class="bt-metric-val" style="color:${pf>=1.5?'var(--up)':pf>=1?'var(--gold)':'var(--down)'};">${pf.toFixed(2)}</span><span class="bt-metric-lbl">Profit Factor</span></div>
      </div>
      <div style="margin-bottom:8px;">
        <div style="font-size:8px;color:var(--t3);margin-bottom:3px;">Equity curve backtest (${candles.length} bougies ${tf})</div>
        <svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;background:var(--s2);border-radius:6px;">
          <line x1="0" y1="${(H-((0-minE)/(maxE-minE||1))*H).toFixed(1)}" x2="${W}" y2="${(H-((0-minE)/(maxE-minE||1))*H).toFixed(1)}" stroke="rgba(255,255,255,.15)" stroke-width="0.5" stroke-dasharray="3,3"/>
          <polyline points="${epts}" fill="none" stroke="${netPnl>=0?'#00e87a':'#ff3d6b'}" stroke-width="1.5"/>
        </svg>
      </div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">5 derniers trades</div>
      <div class="bt-log">
        ${last5.map(t=>`<div class="bt-trade-row">
          <span style="color:${t.side==='long'?'var(--up)':'var(--down)'};">${t.side==='long'?'↑':'↓'} ${t.reason}</span>
          <span style="color:var(--t3);">${t.entry.toFixed(2)} → ${t.exit.toFixed(2)}</span>
          <span style="font-weight:700;color:${t.netPnl>=0?'var(--up)':'var(--down)'};">${t.netPnl>=0?'+':''}$${t.netPnl.toFixed(2)}</span>
        </div>`).join('')}
      </div>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">Stratégie EMA 9/21 · TP 3% / SL 2% · frais 0.1% · données ${pair}</div>`;

  } catch(e) {
    res.style.display='block';
    res.innerHTML=`<div style="text-align:center;padding:12px;font-size:10px;color:var(--down);">⚠ Erreur : ${e.message}<br><span style="color:var(--t3);">Vérifie ta connexion internet</span></div>`;
  } finally {
    btn.disabled=false;
    btn.textContent='▶ Lancer le Backtest';
  }
}
window.runBacktest = runBacktest;
// ═══ v28 · #18 REPLAY DE SESSION ═══
const _RP = {
  events:   [],   // liste triée par ts
  idx:      0,    // index actuel dans la lecture
  timer:    null,
  speed:    1,    // 1=normal 2=rapide 5=turbo
  playing:  false,
};

function initReplaySection() {
  const el = document.getElementById('replaySection');
  if(!el) return;
  el.innerHTML = `
    <div class="rp-section">
      <div class="rp-title">⏪ Replay de Session <span style="font-size:8px;color:var(--t3);font-weight:400;" id="rpEventCount">—</span></div>
      <div class="rp-controls">
        <button class="rp-btn play" id="rpPlayBtn" onclick="replayPlay()">▶ Play</button>
        <button class="rp-btn reset" onclick="replayReset()">↺ Reset</button>
        <select class="rp-speed" id="rpSpeed" onchange="_RP.speed=parseFloat(this.value);">
          <option value="1">×1</option>
          <option value="2">×2</option>
          <option value="5">×5</option>
          <option value="10">×10</option>
        </select>
        <span style="font-size:9px;color:var(--t3);" id="rpClock">—</span>
      </div>
      <div class="rp-progress-wrap">
        <div class="rp-progress-bar"><div class="rp-progress-fill" id="rpFill" style="width:0%"></div></div>
        <div class="rp-progress-lbl"><span id="rpPosLbl">0 / 0</span><span id="rpPnlLbl" style="color:var(--t1);">P&L: $0.00</span></div>
      </div>
      <!-- Stats en temps réel -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;" id="rpStats"></div>
      <!-- Stream d'événements -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:4px;">Événements</div>
      <div class="rp-stream" id="rpStream"></div>
    </div>`;

  _buildReplayEvents();
}
window.initReplaySection = initReplaySection;

function _buildReplayEvents() {
  const events = [];

  // 1. Trades depuis pairStates
  Object.entries(S.pairStates||{}).forEach(([pair, ps]) => {
    (ps.trades||[]).filter(t=>t.type==='position'&&t.ts).forEach(t=>{
      events.push({
        ts:    t.ts,
        type:  t.pnlUsdt>=0 ? 'trade-win' : 'trade-loss',
        icon:  t.pnlUsdt>=0 ? '✅' : '❌',
        pair,
        text:  `${pair} ${t.side==='buy'?'↑ LONG':'↓ SHORT'} · ${t.pnlUsdt>=0?'+':''}$${(t.pnlUsdt||0).toFixed(2)} (${(t.pnl||0).toFixed(2)}%) · Prix: ${(t.price||0).toFixed(2)}`,
        pnlUsd: t.pnlUsdt||0,
        time:  t.time||'—'
      });
    });
  });

  // 2. Journal de rêves
  (S.dreamJournal||[]).forEach(d=>{
    events.push({
      ts:   d.ts,
      type: 'dream',
      icon: d.sentiment==='joy'?'😊':d.sentiment==='remorse'?'😔':'💭',
      pair: d.pair,
      text: d.text||'',
      pnlUsd: 0,
      time: new Date(d.ts).toLocaleTimeString()
    });
  });

  // 3. Chain log (blocages, alertes)
  (S.chainLog||[]).filter(e=>e.desc&&e.icon).slice(-50).forEach(e=>{
    events.push({
      ts:    e.ts||Date.now(),
      type:  'chain',
      icon:  e.icon||'📡',
      pair:  '',
      text:  e.desc||'',
      pnlUsd: 0,
      time:  e.time||'—'
    });
  });

  // Trier par ts croissant
  events.sort((a,b)=>a.ts-b.ts);

  _RP.events  = events;
  _RP.idx     = 0;
  _RP.playing = false;

  const el = document.getElementById('rpEventCount');
  if(el) el.textContent = events.length+' événements';
  _updateReplayUI();
}

function replayPlay() {
  if(_RP.events.length===0) { showToast('Aucun événement à rejouer — lance des trades !',2000,'warn'); return; }
  if(_RP.playing) {
    // Pause
    _RP.playing = false;
    clearInterval(_RP.timer);
    const btn = document.getElementById('rpPlayBtn');
    if(btn) { btn.textContent='▶ Play'; btn.className='rp-btn play'; }
    return;
  }
  _RP.playing = true;
  const btn = document.getElementById('rpPlayBtn');
  if(btn) { btn.textContent='⏸ Pause'; btn.className='rp-btn pause'; }

  _RP.timer = setInterval(()=>{
    if(_RP.idx >= _RP.events.length) {
      replayPause();
      showToast('✅ Replay terminé !',2000,'win');
      return;
    }
    _showReplayEvent(_RP.events[_RP.idx]);
    _RP.idx++;
    _updateReplayUI();
  }, Math.max(150, 800/_RP.speed));
}
window.replayPlay = replayPlay;

function replayPause() {
  _RP.playing = false;
  clearInterval(_RP.timer);
  const btn = document.getElementById('rpPlayBtn');
  if(btn) { btn.textContent='▶ Play'; btn.className='rp-btn play'; }
}

function replayReset() {
  replayPause();
  _RP.idx = 0;
  const stream = document.getElementById('rpStream');
  if(stream) stream.innerHTML='';
  _updateReplayUI();
}
window.replayReset = replayReset;
// ═══ v29 · #26 COACH IA INTÉGRÉ ═══
// Analyse les données réelles et génère des conseils personnalisés

function generateCoachTips() {
  const tips = [];
  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );
  const n = allTrades.length;
  if(n === 0) return [{ type:'info', icon:'🤖', title:'Pas encore de données', text:'Lance quelques trades pour que le Coach puisse analyser tes performances.', action:null }];

  const wins   = allTrades.filter(t=>(t.pnlUsdt||0)>0);
  const losses = allTrades.filter(t=>(t.pnlUsdt||0)<=0);
  const wr     = wins.length/n;
  const avgWin = wins.length>0 ? wins.reduce((s,t)=>s+(t.pnl||0),0)/wins.length : 0;
  const avgLoss= losses.length>0 ? Math.abs(losses.reduce((s,t)=>s+(t.pnl||0),0)/losses.length) : 0;
  const totalPnl = allTrades.reduce((s,t)=>s+(t.pnlUsdt||0),0);
  const hm = S.heatmap || {};
  const m  = typeof computeAdvancedMetrics==='function' ? computeAdvancedMetrics() : null;

  // ── Analyse 1 : Win Rate ──
  if(wr < 0.40 && n >= 10) {
    tips.push({ type:'critical', icon:'🚨', title:'Win Rate critique ('+Math.round(wr*100)+'%)',
      text:'Moins de 40% de trades gagnants. Ta stratégie perd plus souvent qu\'elle ne gagne. Revois tes seuils d\'entrée ou augmente le seuil LMSR.',
      action:'→ Relever le seuil signal à 65%+' });
  } else if(wr < 0.55 && n >= 10) {
    tips.push({ type:'warn', icon:'⚠️', title:'Win Rate à améliorer ('+Math.round(wr*100)+'%)',
      text:'Un Win Rate de 55%+ est recommandé pour couvrir les frais. Concentre-toi sur les meilleures heures de trading identifiées par la heatmap.',
      action:'→ Consulter la Heatmap pour les créneaux optimaux' });
  } else if(wr >= 0.70 && n >= 10) {
    tips.push({ type:'good', icon:'🏆', title:'Excellent Win Rate ('+Math.round(wr*100)+'%)',
      text:'Ton taux de réussite est très solide. Continue avec cette discipline et envisage d\'augmenter légèrement les mises.',
      action:'→ Considérer +10-20% sur le stake' });
  }

  // ── Analyse 2 : Risk/Reward ratio ──
  if(avgLoss > 0 && n >= 10) {
    const rr = avgWin/avgLoss;
    if(rr < 0.8) {
      tips.push({ type:'critical', icon:'⚖️', title:'Risk/Reward défavorable ('+rr.toFixed(2)+')',
        text:'Tes gains moyens ('+avgWin.toFixed(2)+'%) sont inférieurs à tes pertes moyennes ('+avgLoss.toFixed(2)+'%). Même avec un bon WR, ce ratio détruit le compte.',
        action:'→ Viser TP 3×SL minimum' });
    } else if(rr < 1.2) {
      tips.push({ type:'warn', icon:'📐', title:'Risk/Reward à améliorer ('+rr.toFixed(2)+')',
        text:'Gain moyen : +'+avgWin.toFixed(2)+'% / Perte moyenne : -'+avgLoss.toFixed(2)+'%. Cible un ratio d\'au moins 1.5.',
        action:'→ Élargir le TP ou réduire le SL' });
    } else {
      tips.push({ type:'good', icon:'📐', title:'Bon Risk/Reward ('+rr.toFixed(2)+')',
        text:'Gain moyen '+avgWin.toFixed(2)+'% pour perte moyenne '+avgLoss.toFixed(2)+'%. Continue.',
        action:null });
    }
  }

  // ── Analyse 3 : Heatmap — heures à éviter ──
  if(hm.byHour) {
    const hourRanked = Array.from({length:24},(_,h)=>({h,...(hm.byHour[h]||{count:0,pnl:0,wins:0})}))
      .filter(x=>x.count>=3).sort((a,b)=>a.pnl-b.pnl);
    if(hourRanked.length>0 && hourRanked[0].pnl<-2) {
      const worst=hourRanked[0];
      tips.push({ type:'warn', icon:'🕐', title:'Évite de trader à '+worst.h+'h',
        text:worst.count+' trades à cette heure · $'+worst.pnl.toFixed(2)+' de pertes. C\'est ton pire créneau horaire.',
        action:'→ Pause trading à '+worst.h+'h' });
    }
    const bestH = [...hourRanked].sort((a,b)=>b.pnl-a.pnl)[0];
    if(bestH && bestH.pnl>2) {
      tips.push({ type:'good', icon:'⭐', title:'Ton heure en or : '+bestH.h+'h',
        text:bestH.count+' trades · +$'+bestH.pnl.toFixed(2)+' · '+Math.round(bestH.wins/bestH.count*100)+'% WR. Concentre tes meilleures décisions sur ce créneau.',
        action:'→ Priorité aux trades vers '+bestH.h+'h' });
    }
  }

  // ── Analyse 4 : Drawdown ──
  if(m && Math.abs(m.maxDDPct) > 15) {
    tips.push({ type:'critical', icon:'📉', title:'Drawdown sévère ('+m.maxDDPct.toFixed(1)+'%)',
      text:'Tu as subi un drawdown de plus de 15%. Le Rescue Bot doit être actif. Réduis le stake pendant les séries de pertes.',
      action:'→ Activer le mode conservateur (stake −30%)' });
  } else if(m && Math.abs(m.maxDDPct) > 8) {
    tips.push({ type:'warn', icon:'📉', title:'Drawdown modéré ('+m.maxDDPct.toFixed(1)+'%)',
      text:'Le drawdown est gérable mais surveille-le. Si tu atteins 15%, le Rescue Bot fermera tout automatiquement.',
      action:'→ Surveiller les positions ouvertes' });
  }

  // ── Analyse 5 : Pertes consécutives ──
  if(m && m.maxConsecLoss >= 5) {
    tips.push({ type:'warn', icon:'🔴', title:'Série de '+m.maxConsecLoss+' pertes consécutives',
      text:'Tu as connu une série de '+m.maxConsecLoss+' trades perdants de suite. Après 3 pertes consécutives, il est conseillé de faire une pause de 30 min.',
      action:'→ Règle : pause après 3 pertes consécutives' });
  }

  // ── Analyse 6 : Sharpe ──
  if(m && m.sharpe < 0 && n >= 15) {
    tips.push({ type:'warn', icon:'📊', title:'Sharpe négatif ('+m.sharpe.toFixed(2)+')',
      text:'La volatilité de tes résultats est trop élevée par rapport à tes gains. Les résultats sont très irréguliers.',
      action:'→ Réduire la taille des positions pour stabiliser' });
  } else if(m && m.sharpe >= 1.5) {
    tips.push({ type:'good', icon:'📊', title:'Sharpe excellent ('+m.sharpe.toFixed(2)+')',
      text:'Tes gains sont réguliers et bien supérieurs à la volatilité. Stratégie solide.',
      action:null });
  }

  // ── Analyse 7 : Meilleure paire ──
  const pairPerf = Object.entries(S.pairStates||{}).map(([pair,ps])=>({
    pair, pnl:ps.totalPnlUsd||0, trades:ps.totalTrades||0, wins:ps.winTrades||0
  })).filter(p=>p.trades>=3).sort((a,b)=>b.pnl-a.pnl);
  if(pairPerf.length>1) {
    const best=pairPerf[0], worst=pairPerf[pairPerf.length-1];
    if(best.pnl>0) tips.push({ type:'info', icon:'₿', title:'Ta meilleure paire : '+best.pair.replace('/USDT',''),
      text:best.trades+' trades · +$'+best.pnl.toFixed(2)+' · '+Math.round(best.wins/best.trades*100)+'% WR. Alloue-y plus de capital.',
      action:'→ Augmenter le stake sur '+best.pair.replace('/USDT','') });
    if(worst.pnl<-1) tips.push({ type:'warn', icon:'⚠️', title:'Paire problématique : '+worst.pair.replace('/USDT',''),
      text:worst.trades+' trades · $'+worst.pnl.toFixed(2)+'. Cette paire plombe tes performances.',
      action:'→ Réduire ou désactiver '+worst.pair.replace('/USDT','') });
  }

  // ── Analyse 8 : Frais ──
  const fees = S.fees?.totalFees || 0;
  if(fees > Math.abs(totalPnl)*0.3 && fees > 5) {
    tips.push({ type:'warn', icon:'💸', title:'Frais trop élevés ($'+fees.toFixed(2)+')',
      text:'Les frais représentent plus de 30% de tes gains bruts. Trop de petits trades ou stake trop faible.',
      action:'→ Augmenter le stake minimum à $30+' });
  }

  // Limiter à 6 conseils les plus importants
  const order = {critical:0, warn:1, good:2, info:3};
  return tips.sort((a,b)=>order[a.type]-order[b.type]).slice(0,6);
}

function renderCoachSection() {
  const el = document.getElementById('coachSection');
  if(!el) return;

  const tips = generateCoachTips();
  const n = S.totalTrades||0;

  // Score global coach 0-100
  const ts = typeof computeTrustScore==='function' ? computeTrustScore() : { score:50 };
  const score = ts.score;
  const scoreCol = score>=75?'var(--up)':score>=50?'var(--gold)':'var(--down)';

  el.innerHTML = `
    <div class="coach-section">
      <div class="coach-title">
        🎓 Coach IA
        <span style="font-size:9px;color:var(--t3);font-weight:400;">${n} trades analysés</span>
      </div>

      <!-- Score global -->
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:9px;color:var(--t3);">Score de performance global</span>
          <span style="font-size:16px;font-weight:800;font-family:var(--font-mono);color:${scoreCol};">${score}/100</span>
        </div>
        <div class="coach-score-bar">
          <div class="coach-score-fill" style="width:${score}%;background:${scoreCol};"></div>
        </div>
        <div style="font-size:9px;color:${scoreCol};text-align:right;">${score>=75?'✅ Excellent':score>=60?'🟡 Bon':score>=40?'🟠 À améliorer':'🔴 Attention'}</div>
      </div>

      <!-- Conseils -->
      ${tips.map(t=>`
        <div class="coach-tip ${t.type}">
          <div class="coach-tip-icon">${t.icon}</div>
          <div class="coach-tip-body">
            <div class="coach-tip-title">${t.title}</div>
            <div class="coach-tip-text">${t.text}</div>
            ${t.action?`<div class="coach-tip-action">${t.action}</div>`:''}
          </div>
        </div>`).join('')}
    </div>`;
}
window.renderCoachSection = renderCoachSection;
window.generateCoachTips  = generateCoachTips;
// ═══ v30 · #8 SCORE DE CONFIANCE PAR PAIRE ═══
// Score 0-100 combinant : WR paire, P&L, Sharpe paire, LMSR actuel,
// régime marché, streak, activité récente

function computePairConfidenceScore(pair) {
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return { score:0, label:'N/A', color:'var(--t3)', details:[] };

  let score = 50; // base neutre
  const details = [];

  // 1. Win Rate paire (max ±20)
  const totalT = ps.totalTrades || 0;
  if(totalT >= 3) {
    const wr = (ps.winTrades||0) / totalT;
    const wrBonus = (wr - 0.5) * 40; // -20 à +20
    score += wrBonus;
    details.push({ lbl:'WR', val:Math.round(wr*100)+'%', delta:wrBonus });
  }

  // 2. P&L net paire (max ±15)
  const pnl = ps.totalPnlUsd || 0;
  if(totalT > 0) {
    const pnlPerTrade = pnl / totalT;
    const pnlBonus = Math.max(-15, Math.min(15, pnlPerTrade * 3));
    score += pnlBonus;
    details.push({ lbl:'P&L/trade', val:(pnlPerTrade>=0?'+':'')+'$'+pnlPerTrade.toFixed(2), delta:pnlBonus });
  }

  // 3. LMSR conviction actuelle (max ±15)
  const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const conv = (prob - 0.5) * 30; // -15 à +15
  score += conv;
  details.push({ lbl:'LMSR', val:(prob*100).toFixed(0)+'%', delta:conv });

  // 4. Régime marché (max ±10)
  const regime = ps.regime || (typeof detectMarketRegime==='function' ? detectMarketRegime() : 'calm');
  const regimeBonus = {bull:10, volatile_bull:5, calm:0, volatile:-5, volatile_bear:-8, bear:-10}[regime] || 0;
  score += regimeBonus;
  details.push({ lbl:'Régime', val:regime.toUpperCase(), delta:regimeBonus });

  // 5. Streak actuel (max ±10)
  const streak = ps.streak || 0;
  const streakBonus = Math.max(-10, Math.min(10, streak * 3));
  score += streakBonus;
  if(streak !== 0) details.push({ lbl:'Streak', val:(streak>0?'W':'L')+Math.abs(streak), delta:streakBonus });

  // 6. Sharpe paire si disponible (max ±10)
  const sharpeMap = S.adapt?.sharpeByPair || {};
  const sharpe = sharpeMap[pair] || null;
  if(sharpe !== null) {
    const sharpeBonus = Math.max(-10, Math.min(10, sharpe * 5));
    score += sharpeBonus;
    details.push({ lbl:'Sharpe', val:sharpe.toFixed(2), delta:sharpeBonus });
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Label et couleur
  const label = score >= 75 ? 'FORT'
              : score >= 60 ? 'BON'
              : score >= 45 ? 'NEUTRE'
              : score >= 30 ? 'FAIBLE'
              : 'ÉVITER';
  const color = score >= 75 ? 'var(--up)'
              : score >= 60 ? '#84cc16'
              : score >= 45 ? 'var(--gold)'
              : score >= 30 ? '#f97316'
              : 'var(--down)';

  // Signal
  const signal = prob > 0.60 ? 'bull' : prob < 0.40 ? 'bear' : 'neut';
  const signalTxt = signal==='bull' ? '↑ Signal LONG actuel'
                  : signal==='bear' ? '↓ Signal SHORT actuel'
                  : '— Signal neutre';

  return { score, label, color, details, signal, signalTxt, wr: totalT>0?(ps.winTrades||0)/totalT:null, totalT, pnl, prob, regime, streak };
}
window.computePairConfidenceScore = computePairConfidenceScore;

function renderPairScoreSection() {
  const el = document.getElementById('pairScoreSection');
  if(!el) return;

  const pairs = Object.keys(PAIRS||{});
  const scores = pairs.map(p=>({ pair:p, ...computePairConfidenceScore(p) }))
    .sort((a,b)=>b.score-a.score);

  el.innerHTML = `
    <div class="sc-section">
      <div class="sc-title">
        🎯 Score de Confiance par Paire
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Mis à jour en temps réel</span>
      </div>
      ${scores.map(s=>{
        const ps = S.pairStates[s.pair]||{};
        const labelBg = s.score>=75?'rgba(0,232,122,.12)':s.score>=60?'rgba(132,204,22,.12)':s.score>=45?'rgba(245,200,66,.12)':s.score>=30?'rgba(249,115,22,.12)':'rgba(255,61,107,.12)';
        const hasPos = S.openPositions?.some(p=>p.pair===s.pair);
        return `
        <div class="sc-pair-card" style="border-color:${s.color}22;">
          <div class="sc-pair-header">
            <div>
              <span class="sc-pair-name" style="color:${PAIRS[s.pair]?.color||'var(--t1)'};">${s.pair.replace('/USDT','')}</span>
              ${hasPos?`<span style="font-size:8px;background:rgba(167,139,250,.15);color:var(--pur);padding:1px 5px;border-radius:4px;margin-left:6px;">POS</span>`:''}
            </div>
            <div style="text-align:right;">
              <span class="sc-pair-score" style="color:${s.color};">${s.score}</span>
              <span class="sc-pair-label" style="background:${labelBg};color:${s.color};display:block;margin-top:2px;">${s.label}</span>
            </div>
          </div>
          <div class="sc-bar-wrap">
            <div class="sc-bar"><div class="sc-bar-fill" style="width:${s.score}%;background:${s.color};"></div></div>
          </div>
          <div class="sc-metrics">
            <div class="sc-metric">
              <span class="sc-metric-val" style="color:${s.wr!==null?(s.wr>=0.55?'var(--up)':'var(--down)'):'var(--t3)'};">${s.wr!==null?Math.round(s.wr*100)+'%':'—'}</span>
              <span class="sc-metric-lbl">WR (${s.totalT})</span>
            </div>
            <div class="sc-metric">
              <span class="sc-metric-val" style="color:${s.pnl>=0?'var(--up)':'var(--down)'};">${s.pnl>=0?'+':''}$${s.pnl.toFixed(1)}</span>
              <span class="sc-metric-lbl">P&L</span>
            </div>
            <div class="sc-metric">
              <span class="sc-metric-val" style="color:var(--t1);">${(s.prob*100).toFixed(0)}%</span>
              <span class="sc-metric-lbl">LMSR</span>
            </div>
            <div class="sc-metric">
              <span class="sc-metric-val" style="color:${s.streak>0?'var(--up)':s.streak<0?'var(--down)':'var(--t3)'};">${s.streak===0?'—':(s.streak>0?'W':'L')+Math.abs(s.streak)}</span>
              <span class="sc-metric-lbl">Streak</span>
            </div>
          </div>
          <div class="sc-signal ${s.signal}">
            <span>${s.signalTxt}</span>
            <span style="margin-left:auto;opacity:.7;">${s.regime.toUpperCase()}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
window.renderPairScoreSection = renderPairScoreSection;
// ═══ v31 · #23 SENTIMENT NEWS & SOCIAL ═══
// Sources : CryptoCompare News (gratuit, no key) + NLP mots-clés
// + enrichissement de la Veille Marché

const _SN_CACHE = { articles:[], score:50, label:'NEUTRE', lastFetch:0 };
const _SN_TTL   = 8 * 60 * 1000; // 8 min cache

// Dictionnaire NLP mots-clés bullish/bearish
const _NLP_BULL = ['bull','bullish','surge','rally','pump','gain','rise','ath','record','adoption','approval','launch','partnership','growth','positive','buy','long','moon','breakout','recovery','support','accumulate','upgrade','listing'];
const _NLP_BEAR = ['bear','bearish','crash','dump','drop','fall','decline','hack','scam','fraud','ban','regulatory','sec','lawsuit','fear','sell','short','panic','correction','resistance','liquidation','exploit','vulnerability','delisting'];

function _nlpScore(text) {
  const t = (text||'').toLowerCase();
  let bull=0, bear=0;
  _NLP_BULL.forEach(w=>{ if(t.includes(w)) bull++; });
  _NLP_BEAR.forEach(w=>{ if(t.includes(w)) bear++; });
  const total = bull+bear;
  if(total===0) return { score:0, bull, bear, words:[] };
  const score = (bull-bear)/total; // -1 à +1
  const words = [
    ..._NLP_BULL.filter(w=>t.includes(w)).slice(0,3).map(w=>({w,type:'bull'})),
    ..._NLP_BEAR.filter(w=>t.includes(w)).slice(0,3).map(w=>({w,type:'bear'})),
  ];
  return { score, bull, bear, words };
}

// Fetch CryptoCompare News (gratuit, CORS OK)
async function _fetchCryptoNews() {
  try {
    const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=20', {
      signal: AbortSignal.timeout(10000)
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    return data.Data || [];
  } catch(e) {
    console.warn('[SentimentNews] fetch error:', e.message);
    return null;
  }
}

// Calculer le score global de sentiment des news
function _computeNewsScore(articles) {
  if(!articles||articles.length===0) return 50;
  let totalScore=0, count=0;
  articles.forEach(a=>{
    const text  = (a.title||'')+(a.body||'').slice(0,200);
    const nlp   = _nlpScore(text);
    if(nlp.bull+nlp.bear > 0) {
      totalScore += nlp.score;
      count++;
    }
  });
  if(count===0) return 50;
  // Normaliser -1..+1 → 0..100
  const avg = totalScore/count;
  return Math.round((avg+1)/2*100);
}

async function refreshSentimentNews(force) {
  const now = Date.now();
  if(!force && _SN_CACHE.lastFetch>0 && (now-_SN_CACHE.lastFetch)<_SN_TTL) {
    renderSentimentNewsSection();
    return;
  }

  // Afficher loading
  const el = document.getElementById('sentimentNewsSection');
  if(el) el.innerHTML='<div class="sn-section"><div class="sn-title">📰 Sentiment News</div><div style="text-align:center;padding:20px;font-size:10px;color:var(--t3);">⏳ Chargement des news…</div></div>';

  const articles = await _fetchCryptoNews();
  if(Array.isArray(articles) && articles.length) {
    _SN_CACHE.articles  = articles;
    _SN_CACHE.score     = _computeNewsScore(articles);
    _SN_CACHE.lastFetch = Date.now();
    // Label
    const s = _SN_CACHE.score;
    _SN_CACHE.label = s>=70?'TRÈS HAUSSIER':s>=60?'HAUSSIER':s>=45?'NEUTRE':s>=35?'BAISSIER':'TRÈS BAISSIER';
    _SN_CACHE.color = s>=70?'var(--up)':s>=60?'#84cc16':s>=45?'var(--gold)':s>=35?'#f97316':'var(--down)';

    // Stocker dans S.veilleData pour les bots
    if(!S.veilleData) S.veilleData={};
    S.veilleData.newsSentimentScore = _SN_CACHE.score;
    S.veilleData.newsSentimentLabel = _SN_CACHE.label;
    S.veilleData.newsSentimentTs    = Date.now();
  }
  renderSentimentNewsSection();
}
window.refreshSentimentNews = refreshSentimentNews;

function renderSentimentNewsSection() {
  const el = document.getElementById('sentimentNewsSection');
  if(!el) return;

  const hasData = _SN_CACHE.lastFetch > 0 && _SN_CACHE.articles.length > 0;

  if(!hasData) {
    el.innerHTML = `
      <div class="sn-section">
        <div class="sn-title">📰 Sentiment News & Social</div>
        <div style="text-align:center;padding:16px;">
          <div style="font-size:10px;color:var(--t3);margin-bottom:10px;">Analyse NLP des dernières actualités crypto (CryptoCompare)</div>
          <button onclick="refreshSentimentNews(true)" style="background:rgba(56,212,245,.12);border:1px solid rgba(56,212,245,.3);border-radius:8px;color:var(--ice);font-size:11px;font-weight:700;padding:8px 20px;cursor:pointer;font-family:inherit;">📡 Charger les news</button>
        </div>
      </div>`;
    return;
  }

  const s = _SN_CACHE.score;
  const col = _SN_CACHE.color;
  const pct = ((s/100)*100).toFixed(1);

  // Analyser les articles avec NLP
  const analyzed = (Array.isArray(_SN_CACHE.articles)?_SN_CACHE.articles:[]).slice(0,15).map(a=>{
    const text = (a.title||'')+(a.body||'').slice(0,300);
    const nlp  = _nlpScore(text);
    return { ...a, nlp, sentiment: nlp.score>0.2?'bull':nlp.score<-0.2?'bear':'neut' };
  }).sort((a,b)=>Math.abs(b.nlp.score)-Math.abs(a.nlp.score));

  // Score par catégorie/paire
  const pairMentions = {};
  Object.keys(PAIRS||{}).forEach(pair=>{
    const sym = pair.replace('/USDT','').toLowerCase();
    const name = {btc:'bitcoin',eth:'ethereum',xrp:'ripple',sol:'solana',doge:'dogecoin',ada:'cardano',avax:'avalanche',link:'chainlink'}[sym]||sym;
    let bull=0,bear=0,count=0;
    (Array.isArray(_SN_CACHE.articles)?_SN_CACHE.articles:[]).forEach(a=>{
      const t=(a.title||a.body||'').toLowerCase();
      if(t.includes(sym)||t.includes(name)){
        count++;
        const n=_nlpScore(t);
        bull+=n.bull; bear+=n.bear;
      }
    });
    if(count>0) pairMentions[pair]={count,bull,bear,score:bull+bear>0?(bull-bear)/(bull+bear):0};
  });

  const ago = _SN_CACHE.lastFetch>0 ? Math.floor((Date.now()-_SN_CACHE.lastFetch)/60000)+'min' : '—';

  el.innerHTML = `
    <div class="sn-section">
      <div class="sn-title">
        📰 Sentiment News & Social
        <button onclick="refreshSentimentNews(true)" style="font-size:8px;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:5px;color:var(--t3);padding:2px 7px;cursor:pointer;font-family:inherit;">🔄 ${ago}</button>
      </div>

      <!-- Score global -->
      <div class="sn-score-wrap">
        <div class="sn-score-num" style="color:${col};">${s}</div>
        <div class="sn-score-lbl" style="color:${col};">${_SN_CACHE.label}</div>
      </div>
      <div class="sn-gauge">
        <div class="sn-gauge-cursor" style="left:${pct}%;color:${col};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-bottom:10px;">
        <span>0 — Très baissier</span><span>50 — Neutre</span><span>100 — Très haussier</span>
      </div>

      <!-- Mentions par paire -->
      ${Object.keys(pairMentions).length>0?`
        <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Mentions par paire dans les news</div>
        ${Object.entries(pairMentions).sort((a,b)=>b[1].count-a[1].count).slice(0,5).map(([pair,d])=>{
          const sentCol = d.score>0.2?'var(--up)':d.score<-0.2?'var(--down)':'var(--t3)';
          const sentLbl = d.score>0.2?'📈':d.score<-0.2?'📉':'➡️';
          return `<div class="sn-pair-row">
            <span style="font-weight:700;color:${PAIRS[pair]?.color||'var(--t1)'};">${pair.replace('/USDT','')}</span>
            <span style="color:var(--t3);">${d.count} articles</span>
            <span style="color:${sentCol};font-weight:700;">${sentLbl} ${(d.score*100>0?'+':'')}${(d.score*100).toFixed(0)}%</span>
          </div>`;
        }).join('')}
        <div style="margin-bottom:8px;"></div>
      `:''}

      <!-- Articles récents analysés -->
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Dernières actualités analysées (${analyzed.length})</div>
      ${analyzed.slice(0,8).map(a=>{
        const sentCol = a.sentiment==='bull'?'var(--up)':a.sentiment==='bear'?'var(--down)':'var(--t3)';
        const ago2 = a.published_on ? Math.floor((Date.now()/1000-a.published_on)/3600)+'h' : '—';
        return `<div class="sn-article">
          <div style="display:flex;align-items:flex-start;gap:6px;">
            <span class="sn-article-badge ${a.sentiment}">${a.sentiment==='bull'?'↑ BULL':a.sentiment==='bear'?'↓ BEAR':'→ NEUT'}</span>
            <div>
              <div class="sn-article-title">${(a.title||'').slice(0,80)}${(a.title||'').length>80?'…':''}</div>
              <div class="sn-article-meta">
                <span>${a.source_info?.name||a.source||'—'}</span>
                <span>il y a ${ago2}</span>
                <span style="color:${sentCol};">bull:${a.nlp.bull} bear:${a.nlp.bear}</span>
              </div>
              ${a.nlp.words.length>0?`<div style="margin-top:3px;">${a.nlp.words.map(w=>`<span class="sn-keyword ${w.type}">${w.w}</span>`).join('')}</div>`:''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
window.renderSentimentNewsSection = renderSentimentNewsSection;
// ═══ v32 · #33 PRÉDICTION PROCHAINE BOUGIE ML ═══
// Ensemble de 4 modèles légers (sans dépendance externe) :
// 1. Régression linéaire (tendance)  2. RSI momentum
// 3. Bollinger Bands position         4. MACD signal

let _mlSelectedPair = null;

// ── Modèle 1 : Régression linéaire sur les N dernières clôtures ──
function _mlLinearRegression(closes, horizon) {
  const n = closes.length;
  if(n < 5) return { dir:0, conf:0.5, slope:0 };
  const x = Array.from({length:n},(_,i)=>i);
  const sumX  = x.reduce((a,b)=>a+b,0);
  const sumY  = closes.reduce((a,b)=>a+b,0);
  const sumXY = x.reduce((s,xi,i)=>s+xi*closes[i],0);
  const sumX2 = x.reduce((s,xi)=>s+xi*xi,0);
  const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
  const intercept = (sumY - slope*sumX) / n;
  const predicted = intercept + slope*(n+horizon-1);
  const current   = closes[n-1];
  const changePct = (predicted-current)/current*100;
  const dir = changePct > 0 ? 1 : -1;
  const conf = Math.min(0.95, 0.5 + Math.abs(changePct)*2);
  return { dir, conf, slope, changePct, predicted };
}

// ── Modèle 2 : RSI momentum ──
function _mlRsiMomentum(closes) {
  if(closes.length < 15) return { dir:0, conf:0.5, rsi:50 };
  // Calculer RSI 14
  const gains=[], losses=[];
  for(let i=1;i<closes.length;i++){
    const d=closes[i]-closes[i-1];
    gains.push(d>0?d:0); losses.push(d<0?Math.abs(d):0);
  }
  const avgGain = gains.slice(-14).reduce((a,b)=>a+b,0)/14;
  const avgLoss = losses.slice(-14).reduce((a,b)=>a+b,0)/14||0.0001;
  const rs = avgGain/avgLoss;
  const rsi = 100 - 100/(1+rs);
  // Signal
  let dir=0, conf=0.5;
  if(rsi < 30)      { dir=1;  conf=0.75+Math.max(0,(30-rsi)/100); }  // survente
  else if(rsi > 70) { dir=-1; conf=0.75+Math.max(0,(rsi-70)/100); }  // surachat
  else if(rsi < 45) { dir=1;  conf=0.55; }
  else if(rsi > 55) { dir=-1; conf=0.55; }
  return { dir, conf, rsi };
}

// ── Modèle 3 : Bollinger Bands position ──
function _mlBollinger(closes, period) {
  period = period||20;
  if(closes.length < period) return { dir:0, conf:0.5, pos:0.5 };
  const slice = closes.slice(-period);
  const mean  = slice.reduce((a,b)=>a+b,0)/period;
  const std   = Math.sqrt(slice.reduce((s,v)=>s+(v-mean)**2,0)/period);
  const upper = mean + 2*std, lower = mean - 2*std;
  const cur   = closes[closes.length-1];
  const pos   = std>0 ? (cur-lower)/(upper-lower) : 0.5; // 0=lower, 1=upper
  let dir=0, conf=0.5;
  if(pos < 0.1)      { dir=1;  conf=0.80; }  // proche lower → rebond haussier
  else if(pos > 0.9) { dir=-1; conf=0.80; }  // proche upper → retournement
  else if(pos < 0.35){ dir=1;  conf=0.58; }
  else if(pos > 0.65){ dir=-1; conf=0.58; }
  return { dir, conf, pos, mean, upper, lower, cur };
}

// ── Modèle 4 : MACD ──
function _mlMacd(closes) {
  if(closes.length < 26) return { dir:0, conf:0.5, hist:0 };
  function ema(arr, p) {
    const k=2/(p+1); let e=arr[0];
    for(let i=1;i<arr.length;i++) e=arr[i]*k+e*(1-k);
    return e;
  }
  const ema12 = ema(closes.slice(-12),12);
  const ema26 = ema(closes.slice(-26),26);
  const macd  = ema12-ema26;
  const prev12= ema(closes.slice(-13,-1),12);
  const prev26= ema(closes.slice(-27,-1),26);
  const prevMacd = prev12-prev26;
  const hist  = macd-prevMacd;
  const dir   = hist>0?1:-1;
  const conf  = 0.5+Math.min(0.35, Math.abs(hist)/closes[closes.length-1]*200);
  return { dir, conf, hist, macd };
}

// ── Ensemble : vote pondéré ──
function predictNextCandle(pair) {
  const ps = S.pairStates[pair];
  if(!ps) return null;

  // Récupérer closes depuis ps.candles ou price history
  let closes = [];
  if(ps.candles && ps.candles.length >= 10) {
    closes = ps.candles.slice(-50).map(c=>c.c);
  } else if(ps.priceHistory && ps.priceHistory.length >= 10) {
    closes = ps.priceHistory.slice(-50);
  } else {
    // Génèrer depuis le prix actuel + atr
    const p = ps.price||1;
    closes = Array.from({length:20},(_,i)=>p*(1+(Math.random()-0.5)*0.005));
    closes.push(p);
  }

  const cur = closes[closes.length-1] || ps.price || 0;
  const cfg = PAIRS[pair];
  const dec = cfg?.dec >= 4 ? cfg.dec : 2;

  // Run les 4 modèles
  const lr   = _mlLinearRegression(closes, 1);
  const rsi  = _mlRsiMomentum(closes);
  const bb   = _mlBollinger(closes, 20);
  const macd = _mlMacd(closes);

  const models = [
    { name:'Régression linéaire', ...lr,   weight:0.30, icon:'📈' },
    { name:'RSI Momentum',        ...rsi,  weight:0.25, icon:'⚡' },
    { name:'Bollinger Bands',     ...bb,   weight:0.25, icon:'🎯' },
    { name:'MACD Signal',         ...macd, weight:0.20, icon:'🌊' },
  ];

  // Vote pondéré : direction et confidence combinées
  let weightedDir=0, totalWeight=0;
  models.forEach(m=>{
    if(m.dir!==0) {
      weightedDir += m.dir * m.conf * m.weight;
      totalWeight += m.weight;
    }
  });

  const rawScore  = totalWeight>0 ? weightedDir/totalWeight : 0;
  const direction = rawScore > 0 ? 'HAUSSE' : rawScore < 0 ? 'BAISSE' : 'NEUTRE';
  const confidence= Math.min(99, Math.round(Math.abs(rawScore)*100));
  const dirColor  = direction==='HAUSSE'?'var(--up)':direction==='BAISSE'?'var(--down)':'var(--gold)';
  const dirIcon   = direction==='HAUSSE'?'↑':direction==='BAISSE'?'↓':'→';

  // Cibles prix
  const atr = ps.atr || (cur*0.008);
  const tpTarget = direction==='HAUSSE' ? cur+atr*1.5 : cur-atr*1.5;
  const slTarget = direction==='HAUSSE' ? cur-atr     : cur+atr;
  const midTarget= direction==='HAUSSE' ? cur+atr*0.7 : cur-atr*0.7;

  return { pair, direction, confidence, dirColor, dirIcon, models, cur, tpTarget, slTarget, midTarget, dec };
}
window.predictNextCandle = predictNextCandle;

function renderMlPredSection() {
  const el = document.getElementById('mlPredSection');
  if(!el) return;

  const pairs = Object.keys(PAIRS||{});
  if(!_mlSelectedPair || !pairs.includes(_mlSelectedPair)) _mlSelectedPair = pairs[0];

  const pred = predictNextCandle(_mlSelectedPair);

  el.innerHTML = `
    <div class="ml-section">
      <div class="ml-title">
        🔮 Prédiction ML — Prochaine Bougie
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Ensemble 4 modèles</span>
      </div>

      <!-- Sélecteur paire -->
      <div class="ml-pair-select">
        ${pairs.map(p=>`<button class="ml-pair-btn ${p===_mlSelectedPair?'active':''}"
          onclick="_mlSelectedPair='${p}';renderMlPredSection();">${p.replace('/USDT','')}</button>`).join('')}
      </div>

      ${pred ? `
      <!-- Prédiction principale -->
      <div class="ml-pred-card" style="border-color:${pred.dirColor}33;">
        <div class="ml-pred-main">
          <div class="ml-pred-dir" style="color:${pred.dirColor};">
            ${pred.dirIcon} ${pred.direction}
          </div>
          <div class="ml-pred-conf">
            <span class="ml-pred-conf-val" style="color:${pred.dirColor};">${pred.confidence}%</span>
            <span class="ml-pred-conf-lbl">Confiance</span>
          </div>
        </div>

        <!-- Modèles individuels -->
        <div style="font-size:8px;color:var(--t3);margin-bottom:5px;">Votes des modèles</div>
        ${pred.models.map(m=>{
          const mc = m.dir>0?'var(--up)':m.dir<0?'var(--down)':'var(--t3)';
          const pct= Math.round(m.conf*100);
          return `<div class="ml-model-row">
            <span style="font-size:11px;">${m.icon}</span>
            <span style="color:var(--t2);min-width:110px;font-size:9px;">${m.name}</span>
            <div class="ml-model-bar-wrap">
              <div class="ml-model-bar">
                <div class="ml-model-fill" style="width:${pct}%;background:${mc};"></div>
              </div>
            </div>
            <span style="color:${mc};font-weight:700;font-size:10px;min-width:36px;text-align:right;">
              ${m.dir>0?'↑':m.dir<0?'↓':'→'} ${pct}%
            </span>
          </div>`;
        }).join('')}

        <!-- Cibles prix -->
        <div class="ml-target">
          <div class="ml-target-card">
            <span class="ml-target-val" style="color:var(--up);">${pred.tpTarget.toFixed(pred.dec)}</span>
            <span class="ml-target-lbl">🎯 TP estimé</span>
          </div>
          <div class="ml-target-card">
            <span class="ml-target-val" style="color:var(--t1);">${pred.cur.toFixed(pred.dec)}</span>
            <span class="ml-target-lbl">Prix actuel</span>
          </div>
          <div class="ml-target-card">
            <span class="ml-target-val" style="color:var(--down);">${pred.slTarget.toFixed(pred.dec)}</span>
            <span class="ml-target-lbl">🛑 SL estimé</span>
          </div>
        </div>

        <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">
          ⚠️ Prédiction indicative · pas un conseil financier · ${pred.confidence<50?'signal faible':''}
        </div>
      </div>

      <!-- Note méthodologique -->
      <div style="font-size:8px;color:var(--t3);line-height:1.5;padding:6px;background:rgba(255,255,255,.02);border-radius:6px;">
        Ensemble de 4 modèles ML légers : Régression linéaire (30%) · RSI Momentum (25%) · Bollinger (25%) · MACD (20%). Données : ${Object.keys(PAIRS||{}).length*0||(S.pairStates?.[_mlSelectedPair]?.candles?.length||0)} bougies.
      </div>
      ` : '<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Données insuffisantes pour la prédiction.</div>'}
    </div>`;
}
window.renderMlPredSection = renderMlPredSection;
// ═══ v33 · #9 HISTORIQUE DES AGENTS ═══
let _ahTab = 'evolution'; // 'evolution' | 'top' | 'stats'

function renderAgentHistorySection() {
  const el = document.getElementById('agentHistorySection');
  if(!el) return;

  const agents  = S.agents || [];
  const evoLog  = (S.evoLog || []).slice().reverse();

  el.innerHTML = `
    <div class="ah-section">
      <div class="ah-title">
        🤖 Historique des Agents
        <span style="font-size:8px;color:var(--t3);font-weight:400;">${agents.length} agents · Gen ${S._genCount||1}</span>
      </div>
      <div class="ah-tabs">
        <button class="ah-tab ${_ahTab==='evolution'?'active':''}" onclick="_ahTab='evolution';renderAgentHistorySection();">📜 Évolution</button>
        <button class="ah-tab ${_ahTab==='top'?'active':''}" onclick="_ahTab='top';renderAgentHistorySection();">🏆 Top agents</button>
        <button class="ah-tab ${_ahTab==='stats'?'active':''}" onclick="_ahTab='stats';renderAgentHistorySection();">📊 Stats globales</button>
      </div>
      <div id="ahContent"></div>
    </div>`;

  const content = document.getElementById('ahContent');
  if(!content) return;

  if(_ahTab === 'evolution') {
    // Journal d'évolution
    if(evoLog.length === 0) {
      content.innerHTML = '<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Aucune évolution enregistrée — les agents évoluent après les trades.</div>';
      return;
    }
    content.innerHTML = evoLog.slice(0,20).map(e=>{
      const col = e.type==='new'?'var(--up)':e.type==='removed'?'var(--down)':e.type==='evolved'?'var(--pur)':e.type==='pair'?'var(--ice)':'var(--gold)';
      return `<div class="ah-event">
        <div class="ah-event-icon">${e.title?.split(' ')[0]||'🤖'}</div>
        <div class="ah-event-body">
          <div class="ah-event-title" style="color:${col};">${(e.title||'').replace(/^[^\s]+ /,'')}</div>
          <div class="ah-event-desc">${e.desc||''}</div>
          <div class="ah-event-time">${e.time||'—'}</div>
        </div>
      </div>`;
    }).join('');
  }

  else if(_ahTab === 'top') {
    // Top agents par fitness
    const sorted = [...agents].sort((a,b)=>(b.fitness||0)-(a.fitness||0));
    const top = sorted.slice(0,10);
    const maxFit = Math.max(1,...top.map(a=>a.fitness||0));
    content.innerHTML = top.map(a=>{
      const fit    = a.fitness||0;
      const score  = a.score||0;
      const streak = a.streak||0;
      const wr     = a.trades>0 ? Math.round((a.wins||0)/a.trades*100) : null;
      const fitCol = fit>=1500?'var(--up)':fit>=800?'var(--ice)':fit>=400?'var(--gold)':'var(--down)';
      const fitPct = Math.min(100, fit/maxFit*100);
      return `<div class="ah-agent-card">
        <div class="ah-agent-header">
          <span style="font-size:18px;">${a.emoji||'🤖'}</span>
          <div style="flex:1;">
            <div class="ah-agent-name">${a.name||'Agent'}</div>
            <div style="font-size:8px;color:var(--t3);">${a.type||''} · ${a.role||''}</div>
          </div>
          <div style="text-align:right;">
            <span class="ah-agent-fit" style="color:${fitCol};">${Math.floor(fit)} T$</span>
            <div style="font-size:8px;color:${score>=0?'var(--up)':'var(--down)'};">${score>=0?'+':''}${score.toFixed(3)}</div>
          </div>
        </div>
        <div class="ah-fit-bar">
          <div class="ah-fit-fill" style="width:${fitPct}%;background:${fitCol};"></div>
        </div>
        <div class="ah-agent-metrics">
          <div>
            <span class="ah-metric-val" style="color:${wr!==null?(wr>=55?'var(--up)':'var(--down)'):'var(--t3)'};">${wr!==null?wr+'%':'—'}</span>
            <span class="ah-metric-lbl">WR</span>
          </div>
          <div>
            <span class="ah-metric-val">${a.trades||0}</span>
            <span class="ah-metric-lbl">Trades</span>
          </div>
          <div>
            <span class="ah-metric-val" style="color:${streak>0?'var(--up)':streak<0?'var(--down)':'var(--t3)'};">${streak===0?'—':(streak>0?'W':'L')+Math.abs(streak)}</span>
            <span class="ah-metric-lbl">Streak</span>
          </div>
          <div>
            <span class="ah-metric-val">${a.errors||0}</span>
            <span class="ah-metric-lbl">Erreurs</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  else if(_ahTab === 'stats') {
    // Stats globales de la flotte
    const totalFit  = agents.reduce((s,a)=>s+(a.fitness||0),0);
    const avgFit    = agents.length>0 ? totalFit/agents.length : 0;
    const avgScore  = agents.length>0 ? agents.reduce((s,a)=>s+(a.score||0),0)/agents.length : 0;
    const hybrids   = agents.filter(a=>(a.role||'')===('hybrid')||(a.name||'').includes('Hybrid')).length;
    const elites    = agents.filter(a=>(a.fitness||0)>=1500).length;
    const broken    = agents.filter(a=>(a.fitness||0)<100).length;
    const totalTrades= agents.reduce((s,a)=>s+(a.trades||0),0);
    const totalWins  = agents.reduce((s,a)=>s+(a.wins||0),0);
    const globalWR   = totalTrades>0 ? Math.round(totalWins/totalTrades*100) : 0;

    // Distribution fitness
    const dist = {elite:0,bon:0,moyen:0,faible:0};
    agents.forEach(a=>{
      const f=a.fitness||0;
      if(f>=1500)     dist.elite++;
      else if(f>=800) dist.bon++;
      else if(f>=300) dist.moyen++;
      else            dist.faible++;
    });
    const distMax = Math.max(1,...Object.values(dist));

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        ${[
          {v:agents.length, l:'Agents actifs', c:'var(--t1)'},
          {v:S._genCount||1, l:'Générations', c:'var(--ice)'},
          {v:Math.round(avgFit)+' T$', l:'Fitness moy.', c:avgFit>=800?'var(--up)':'var(--gold)'},
          {v:(avgScore>=0?'+':'')+avgScore.toFixed(3), l:'Score moyen', c:avgScore>=0?'var(--up)':'var(--down)'},
          {v:elites, l:'Élites (≥1500)', c:'var(--up)'},
          {v:hybrids, l:'Hybrides', c:'var(--pur)'},
          {v:broken, l:'Cassés (<100)', c:broken>0?'var(--down)':'var(--t3)'},
          {v:globalWR+'%', l:'WR global agents', c:globalWR>=55?'var(--up)':'var(--down)'},
        ].map(m=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:7px;text-align:center;">
          <span style="font-size:14px;font-weight:800;font-family:var(--font-mono);color:${m.c};display:block;">${m.v}</span>
          <span style="font-size:8px;color:var(--t3);">${m.l}</span>
        </div>`).join('')}
      </div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:5px;">Distribution fitness</div>
      ${[
        {lbl:'⭐ Élites ≥1500',n:dist.elite,col:'var(--up)'},
        {lbl:'✅ Bons 800-1499',n:dist.bon,col:'var(--ice)'},
        {lbl:'⚡ Moyens 300-799',n:dist.moyen,col:'var(--gold)'},
        {lbl:'⚠ Faibles <300',n:dist.faible,col:'var(--down)'},
      ].map(d=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:10px;">
        <span style="min-width:110px;color:var(--t2);">${d.lbl}</span>
        <div style="flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden;">
          <div style="height:100%;width:${Math.round(d.n/distMax*100)}%;background:${d.col};border-radius:100px;"></div>
        </div>
        <span style="font-weight:700;color:${d.col};min-width:20px;text-align:right;">${d.n}</span>
      </div>`).join('')}
      <div style="font-size:9px;color:var(--t3);margin-top:8px;margin-bottom:5px;">Agents par rôle</div>
      ${Object.entries(agents.reduce((m,a)=>{const r=a.role||a.type||'?';m[r]=(m[r]||0)+1;return m;},{}))
        .sort((a,b)=>b[1]-a[1]).slice(0,6).map(([role,n])=>`
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:9px;border-bottom:1px solid rgba(255,255,255,.04);">
          <span style="color:var(--t2);">${role}</span>
          <span style="font-family:var(--font-mono);font-weight:700;color:var(--t1);">${n}</span>
        </div>`).join('')}`;
  }
}
window.renderAgentHistorySection = renderAgentHistorySection;
// ═══ v34 · #10 MODE APPRENTISSAGE ACCÉLÉRÉ ═══
// 3 modes : Normal · Accéléré · Intensif
// Multiplie les gains/pertes de fitness des agents après chaque trade


if(!window._LA_MODE) window._LA_MODE = 'normal';
if(!window._LA_SESSION_RUNNING) window._LA_SESSION_RUNNING = false;
if(!window._LA_SESSION_STATS) window._LA_SESSION_STATS = { trades:0, wins:0, fitnessGained:0, startTs:0 };

const _LA_MODES = {
  normal:    { label:'Normal',    emoji:'🐢', mult:1,  badge:'×1',  badgeBg:'rgba(255,255,255,.08)',  badgeCol:'var(--t3)',  desc:'Apprentissage standard. Les agents gagnent/perdent de la fitness normalement après chaque trade.' },
  accel:     { label:'Accéléré', emoji:'⚡', mult:3,  badge:'×3',  badgeBg:'rgba(56,212,245,.12)',  badgeCol:'var(--ice)', desc:'Fitness ×3 par trade. Idéal pour entraîner rapidement une nouvelle génération d\'agents.' },
  intensif:  { label:'Intensif',  emoji:'🔥', mult:8,  badge:'×8',  badgeBg:'rgba(167,139,250,.15)', badgeCol:'var(--pur)', desc:'Fitness ×8 par trade. Les agents évoluent très vite mais risquent une sur-adaptation. À utiliser avec prudence.' },
};

// Activer un mode
function setLearningMode(mode) {
  if(!_LA_MODES[mode]) return;
  window._LA_MODE = mode;
  // Stocker dans S pour persistence
  if(typeof S !== 'undefined') {
    if(!S.learningAccel) S.learningAccel = {};
    S.learningAccel.mode = mode;
    S.learningAccel.activatedAt = Date.now();
  }
  showToast(_LA_MODES[mode].emoji + ' Mode apprentissage : '+_LA_MODES[mode].label, 2000, 'win');
  renderLearningAccelSection();
}
window.setLearningMode = setLearningMode;

// Lancer une session d'entraînement synthétique
// Rejoue les trades historiques du journal pour entraîner les agents plus vite
function startLearningSession() {
  if(window._LA_SESSION_RUNNING) {
    window._LA_SESSION_RUNNING = false;
    showToast('⏸ Session d\'entraînement arrêtée', 1500, 'user');
    renderLearningAccelSection();
    return;
  }

  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null)
  );
  if(allTrades.length < 5) {
    showToast('⚠ Minimum 5 trades nécessaires pour entraîner', 2000, 'warn');
    return;
  }

  window._LA_SESSION_RUNNING = true;
  window._LA_SESSION_STATS = { trades:0, wins:0, fitnessGained:0, startTs:Date.now() };
  const mult = _LA_MODES[window._LA_MODE]?.mult || 1;

  showToast('🏋️ Session d\'entraînement démarrée (mode '+_LA_MODES[window._LA_MODE].label+')', 2000, 'win');

  let idx = 0;
  const agents = S.agents || [];
  const totalTrades = Math.min(allTrades.length, 30);

  const step = () => {
    if(!window._LA_SESSION_RUNNING || idx >= totalTrades) {
      window._LA_SESSION_RUNNING = false;
      showToast('✅ Session terminée · '+window._LA_SESSION_STATS.trades+' trades rejoués · +'+Math.round(window._LA_SESSION_STATS.fitnessGained)+' T$ distribués', 3000, 'win');
      renderLearningAccelSection();
      return;
    }

    const trade = allTrades[idx];
    const won   = (trade.pnlUsdt||0) > 0;
    window._LA_SESSION_STATS.trades++;
    if(won) window._LA_SESSION_STATS.wins++;

    // Distribuer l'apprentissage accéléré aux agents
    agents.forEach(agent => {
      if(!agent) return;
      const fitDelta = won
        ? Math.min(2000 - (agent.fitness||0), 5 * mult)
        : -Math.min((agent.fitness||0) - 50, 3 * mult);
      agent.fitness = Math.max(50, Math.min(2000, (agent.fitness||0) + fitDelta));
      agent.learningEvents = (agent.learningEvents||0) + 1;
      window._LA_SESSION_STATS.fitnessGained += Math.max(0, fitDelta);
    });

    // Enregistrer dans learningHistory
    if(S.learningHistory) {
      S.learningHistory.push({
        ts: Date.now(), pair: trade.pair||'?',
        side: trade.side||'?', pnl: trade.pnlUsdt||0,
        mode: window._LA_MODE, mult
      });
      if(S.learningHistory.length > 200) S.learningHistory.shift();
    }

    idx++;
    renderLearningAccelSection();
    setTimeout(step, 150); // 150ms entre chaque trade simulé
  };
  step();
}
window.startLearningSession = startLearningSession;

// Boost manuel — injecter directement de la fitness aux agents
function boostAllAgents(amount) {
  const agents = S.agents || [];
  let total = 0;
  agents.forEach(a => {
    const gain = Math.min(2000 - (a.fitness||0), amount);
    if(gain > 0) { a.fitness = (a.fitness||0) + gain; total += gain; }
  });
  showToast('💉 +'+Math.round(total)+' T$ distribués à '+agents.length+' agents', 2000, 'win');
  renderLearningAccelSection();
  renderAgentHistorySection();
}
window.boostAllAgents = boostAllAgents;

function renderLearningAccelSection() {
  const el = document.getElementById('learningAccelSection');
  if(!el) return;

  // Restaurer mode depuis S si disponible
  if(S.learningAccel?.mode && _LA_MODES[S.learningAccel.mode]) {
    window._LA_MODE = S.learningAccel.mode;
  }

  const agents = S.agents || [];
  const totalFit = agents.reduce((s,a)=>s+(a.fitness||0),0);
  const avgFit   = agents.length>0 ? totalFit/agents.length : 0;
  const totalEvents = agents.reduce((s,a)=>s+(a.learningEvents||0),0);
  const allTrades = Object.values(S.pairStates||{}).flatMap(ps=>
    (ps.trades||[]).filter(t=>t.type==='position')
  ).length;
  const sess = window._LA_SESSION_STATS;
  const sessWR = sess.trades>0 ? Math.round(sess.wins/sess.trades*100) : 0;
  const sessDur = sess.startTs>0 ? Math.round((Date.now()-sess.startTs)/1000) : 0;

  el.innerHTML = `
    <div class="la-section">
      <div class="la-title">
        🏋️ Apprentissage Accéléré
        <span style="font-size:8px;color:var(--t3);font-weight:400;">Mode actif : ${_LA_MODES[window._LA_MODE]?.label||'Normal'}</span>
      </div>

      <!-- Modes -->
      ${Object.entries(_LA_MODES).map(([key,m])=>{
        const isActive = window._LA_MODE === key;
        return `<div class="la-mode-card ${isActive?'active':''}" onclick="setLearningMode('${key}')">
          <div class="la-mode-header">
            <span class="la-mode-name">${m.emoji} ${m.label}</span>
            <span class="la-mode-badge" style="background:${m.badgeBg};color:${m.badgeCol};">${m.badge} fitness/trade</span>
          </div>
          <div class="la-mode-desc">${m.desc}</div>
        </div>`;
      }).join('')}

      <!-- Stats apprentissage -->
      <div class="la-stat-grid">
        <div class="la-stat">
          <span class="la-stat-val" style="color:var(--pur);">${Math.round(avgFit)}</span>
          <span class="la-stat-lbl">Fitness moy.</span>
        </div>
        <div class="la-stat">
          <span class="la-stat-val" style="color:var(--ice);">${totalEvents}</span>
          <span class="la-stat-lbl">Événements</span>
        </div>
        <div class="la-stat">
          <span class="la-stat-val" style="color:var(--t1);">${allTrades}</span>
          <span class="la-stat-lbl">Trades base</span>
        </div>
      </div>

      <!-- Session en cours -->
      ${window._LA_SESSION_RUNNING || sess.trades>0 ? `
        <div style="background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.2);border-radius:8px;padding:8px 10px;margin-bottom:8px;">
          <div style="font-size:9px;font-weight:700;color:var(--pur);margin-bottom:5px;">
            ${window._LA_SESSION_RUNNING ? '⚡ Session en cours…' : '✅ Dernière session'}
          </div>
          ${window._LA_SESSION_RUNNING ? `<div class="la-progress"><div class="la-progress-fill" style="width:${Math.min(100,sess.trades/30*100).toFixed(0)}%;background:var(--pur);animation:none;"></div></div>` : ''}
          <div class="la-session-row"><span style="color:var(--t2);">Trades rejoués</span><span style="font-weight:700;">${sess.trades}/30</span></div>
          <div class="la-session-row"><span style="color:var(--t2);">Win Rate session</span><span style="font-weight:700;color:${sessWR>=55?'var(--up)':'var(--down)'};">${sessWR}%</span></div>
          <div class="la-session-row"><span style="color:var(--t2);">Fitness distribuée</span><span style="font-weight:700;color:var(--up);">+${Math.round(sess.fitnessGained)} T$</span></div>
          ${sessDur>0?`<div class="la-session-row"><span style="color:var(--t2);">Durée</span><span style="font-weight:700;">${sessDur}s</span></div>`:''}
        </div>` : ''}

      <!-- Boutons actions -->
      <button class="la-boost-btn" onclick="startLearningSession()"
        style="background:${window._LA_SESSION_RUNNING?'rgba(245,200,66,.12)':'rgba(167,139,250,.12)'};
               border-color:${window._LA_SESSION_RUNNING?'rgba(245,200,66,.3)':'rgba(167,139,250,.3)'};
               color:${window._LA_SESSION_RUNNING?'var(--gold)':'var(--pur)'};">
        ${window._LA_SESSION_RUNNING ? '⏸ Arrêter la session' : '▶ Lancer session d\'entraînement'}
      </button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
        <button onclick="boostAllAgents(50)" style="padding:7px;border-radius:7px;background:rgba(0,232,122,.1);border:1px solid rgba(0,232,122,.25);color:var(--up);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">💉 +50 T$ tous</button>
        <button onclick="boostAllAgents(200)" style="padding:7px;border-radius:7px;background:rgba(56,212,245,.1);border:1px solid rgba(56,212,245,.25);color:var(--ice);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">💉 +200 T$ tous</button>
      </div>
      <div style="font-size:8px;color:var(--t3);margin-top:6px;text-align:center;">Le mode accéléré s'applique automatiquement à chaque trade réel.</div>
    </div>`;
}
window.renderLearningAccelSection = renderLearningAccelSection;
// ═══ v35 · #11 COMPARATEUR DE STRATÉGIES ═══
// Visualise et contrôle le système A/B testing intégré
// Permet de modifier les paramètres de la stratégie B (challenger)
// et de voir les résultats en temps réel

let _csTab = 'live'; // 'live' | 'params' | 'history'

function updateStratBParam(param, value) {
  if(!S.abTesting?.armB?.params) return;
  S.abTesting.armB.params[param] = parseFloat(value) || 0;
  renderStratCompSection();
}
window.updateStratBParam = updateStratBParam;

function resetAbTesting() {
  if(!S.abTesting) return;
  if(!confirm('Remettre à zéro les compteurs A/B ?')) return;
  S.abTesting.armA.trades = 0; S.abTesting.armA.wins = 0; S.abTesting.armA.losses = 0; S.abTesting.armA.pnl = 0;
  S.abTesting.armB.trades = 0; S.abTesting.armB.wins = 0; S.abTesting.armB.losses = 0; S.abTesting.armB.pnl = 0;
  S.abTesting.nextAssign = 'A';
  showToast('↺ A/B testing remis à zéro', 1500, 'user');
  renderStratCompSection();
}
window.resetAbTesting = resetAbTesting;

function toggleAbTesting() {
  if(!S.paperRealConfig) S.paperRealConfig = {};
  S.paperRealConfig.abTestingEnabled = !S.paperRealConfig.abTestingEnabled;
  showToast(S.paperRealConfig.abTestingEnabled ? '✅ A/B Testing activé' : '⏸ A/B Testing désactivé', 1800, 'win');
  renderStratCompSection();
}
window.toggleAbTesting = toggleAbTesting;

function renderStratCompSection() {
  const el = document.getElementById('stratCompSection');
  if(!el) return;

  const ab   = S.abTesting || {};
  const armA = ab.armA || { trades:0, wins:0, losses:0, pnl:0, label:'A (référence)', params:{} };
  const armB = ab.armB || { trades:0, wins:0, losses:0, pnl:0, label:'B (challenger)', params:{} };
  const enabled = S.paperRealConfig?.abTestingEnabled || false;
  const history = (ab.history || []).slice().reverse().slice(0, 8);
  const lv = ab.lastVerdict;

  const wrA = armA.trades>0 ? Math.round(armA.wins/armA.trades*100) : null;
  const wrB = armB.trades>0 ? Math.round(armB.wins/armB.trades*100) : null;

  // Déterminer le leader actuel
  const aScore = (armA.pnl||0) * 0.7 + (wrA||50) * 0.3;
  const bScore = (armB.pnl||0) * 0.7 + (wrB||50) * 0.3;
  const leader = armA.trades===0&&armB.trades===0 ? null
               : aScore > bScore ? 'A' : bScore > aScore ? 'B' : 'TIE';

  // Paramètres de chaque stratégie
  const paramsA = armA.params || {};
  const paramsB = armB.params || {};

  const paramDefs = [
    { key:'slAtrMult',   label:'SL (×ATR)',     min:0.5, max:5.0,  step:0.1 },
    { key:'tpAtrMult',   label:'TP (×ATR)',     min:0.5, max:8.0,  step:0.1 },
    { key:'stakeFactor', label:'Stake ×',       min:0.3, max:2.0,  step:0.1 },
  ];

  el.innerHTML = `
    <div class="cs-section">
      <div class="cs-title">
        ⚔️ Comparateur de Stratégies
        <span style="font-size:8px;color:${enabled?'var(--up)':'var(--t3)'};font-weight:400;">${enabled?'🟢 A/B Actif':'⚫ Inactif'}</span>
      </div>

      <!-- Onglets -->
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        ${['live','params','history'].map(t=>`<button style="padding:4px 10px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;border:1px solid;font-family:inherit;background:${_csTab===t?'rgba(167,139,250,.15)':'var(--s2)'};border-color:${_csTab===t?'rgba(167,139,250,.4)':'var(--border)'};color:${_csTab===t?'var(--pur)':'var(--t2)'};" onclick="_csTab='${t}';renderStratCompSection();">${t==='live'?'📊 Live':t==='params'?'⚙️ Params':'📜 Historique'}</button>`).join('')}
        <button onclick="toggleAbTesting()" style="margin-left:auto;padding:4px 10px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;background:${enabled?'rgba(0,232,122,.1)':'rgba(255,255,255,.06)'};border:1px solid ${enabled?'rgba(0,232,122,.3)':'var(--border)'};color:${enabled?'var(--up)':'var(--t3)'};">${enabled?'✓ Actif':'Activer'}</button>
      </div>

      ${_csTab === 'live' ? `
        <!-- Résultats en temps réel -->
        ${leader ? `
        <div class="cs-verdict ${leader==='A'?'a-wins':leader==='B'?'b-wins':'tie'}">
          <div style="font-size:14px;font-weight:800;color:${leader==='A'?'var(--ice)':leader==='B'?'var(--pur)':'var(--gold)'};">
            ${leader==='TIE'?'⚖️ Égalité':'🏆 Stratégie '+leader+' en tête'}
          </div>
          <div style="font-size:9px;color:var(--t3);margin-top:3px;">
            ${leader!=='TIE'?(leader==='A'?armA.label:armB.label)+' · '+(leader==='A'?armA.trades:armB.trades)+' trades':'Performances équivalentes'}
          </div>
        </div>` : ''}

        <div class="cs-ab-grid">
          ${[{arm:'A',d:armA,col:'var(--ice)',cls:'arm-a',wr:wrA},{arm:'B',d:armB,col:'var(--pur)',cls:'arm-b',wr:wrB}].map(({arm,d,col,cls,wr})=>`
          <div class="cs-arm-card ${cls}">
            <div class="cs-arm-label">${arm === leader ? '🏆 ' : ''}${d.label||arm}</div>
            <div class="cs-arm-metric">
              <span style="color:var(--t3);">Trades</span>
              <span style="font-weight:700;color:${col};">${d.trades||0}</span>
            </div>
            <div class="cs-arm-metric">
              <span style="color:var(--t3);">WR</span>
              <span style="font-weight:700;color:${wr!==null?(wr>=55?'var(--up)':'var(--down)'):'var(--t3)'};">${wr!==null?wr+'%':'—'}</span>
            </div>
            <div class="cs-arm-metric">
              <span style="color:var(--t3);">P&L</span>
              <span style="font-weight:700;color:${(d.pnl||0)>=0?'var(--up)':'var(--down)'};">${(d.pnl||0)>=0?'+':''}$${(d.pnl||0).toFixed(2)}</span>
            </div>
          </div>`).join('')}
        </div>

        <div style="font-size:9px;color:var(--t3);text-align:center;margin-top:4px;">
          Prochain trade : Stratégie <strong style="color:var(--t1);">${ab.nextAssign||'A'}</strong> · Génération ${ab.generation||0}
        </div>
        <button onclick="resetAbTesting()" style="width:100%;margin-top:8px;padding:7px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--t3);font-size:10px;cursor:pointer;font-family:inherit;">↺ Remettre à zéro les compteurs</button>
      ` : _csTab === 'params' ? `
        <!-- Paramètres des stratégies -->
        <div style="font-size:9px;color:var(--t3);margin-bottom:8px;">
          Stratégie A est fixe (référence). Modifie la stratégie B (challenger) :
        </div>
        ${paramDefs.map(p=>`
          <div class="cs-param-row">
            <span class="cs-param-lbl">${p.label}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:9px;color:var(--ice);min-width:36px;text-align:center;">${paramsA[p.key]||'—'}</span>
              <span style="font-size:9px;color:var(--t3);">→</span>
              <input type="number" class="cs-param-input" value="${paramsB[p.key]||''}" min="${p.min}" max="${p.max}" step="${p.step}"
                onchange="updateStratBParam('${p.key}',this.value)" style="color:var(--pur);">
            </div>
          </div>`).join('')}
        <div style="font-size:8px;color:var(--t3);margin-top:8px;line-height:1.5;">
          SL/TP en multiple d'ATR · Stake factor multiplie la mise (0.5 = moitié, 1.5 = +50%)
        </div>
      ` : `
        <!-- Historique des verdicts -->
        ${history.length===0 ? `<div style="text-align:center;padding:16px;font-size:10px;color:var(--t3);">Aucun verdict encore — le verdict se déclenche après 50 trades par stratégie.</div>` :
        history.map(v=>`
          <div class="cs-history-item">
            <span style="color:${v.winner==='A'?'var(--ice)':'var(--pur)'};">🏆 Stratégie ${v.winner||'?'} gagne</span>
            <span style="color:var(--t3);">Gén. ${v.generation||'?'}</span>
            <span style="color:${v.delta>=0?'var(--up)':'var(--down)'};">${v.delta>=0?'+':''}$${(v.delta||0).toFixed(2)}</span>
          </div>`).join('')}
      `}
    </div>`;
}
window.renderStratCompSection = renderStratCompSection;
// ═══ v36 · #12 DÉTECTEUR D'ANOMALIES ═══
// Analyse en temps réel les comportements anormaux :
// prix, volumes, agents, positions, frais, réseau

function detectAnomalies() {
  const alerts = [];
  const ps     = S.pairStates || {};
  const pairs  = Object.keys(PAIRS || {});
  const agents = S.agents || [];
  const openPos= S.openPositions || [];
  const allTrades = Object.values(ps).flatMap(p=>(p.trades||[]).filter(t=>t.type==='position'&&t.pnlUsdt!=null));
  const n = allTrades.length;

  // ── 1. Prix : variation brutale (pump/dump) ──
  pairs.forEach(pair=>{
    const pstate = ps[pair];
    if(!pstate?.candles || pstate.candles.length < 5) return;
    const closes = pstate.candles.slice(-5).map(c=>c.c);
    const last   = closes[closes.length-1];
    const prev   = closes[0];
    const chgPct = prev>0 ? Math.abs(last-prev)/prev*100 : 0;
    if(chgPct > 8) {
      alerts.push({ level:'critical', icon:'🚨', title:`${pair} : Mouvement extrême +${chgPct.toFixed(1)}%`,
        desc:`Variation de ${chgPct.toFixed(2)}% sur 5 bougies. Possible pump/dump. Les positions ouvertes sont à risque.`,
        val:`Prix : ${last.toFixed(PAIRS[pair]?.dec>=4?PAIRS[pair].dec:2)}` });
    } else if(chgPct > 4) {
      alerts.push({ level:'warn', icon:'⚡', title:`${pair} : Forte volatilité (${chgPct.toFixed(1)}%)`,
        desc:`Mouvement inhabituel sur 5 bougies. Surveille les positions.`, val:'' });
    }
  });

  // ── 2. Agents : score extrême ou cassés ──
  const brokenAgents = agents.filter(a=>(a.fitness||0)<80);
  if(brokenAgents.length > agents.length * 0.3) {
    alerts.push({ level:'warn', icon:'🤖', title:`${brokenAgents.length} agents en détresse`,
      desc:`Plus de 30% des agents ont une fitness <80 T$. L'intelligence collective est dégradée. Lance une session d'apprentissage accéléré.`,
      val:`Fitness moy : ${Math.round(agents.reduce((s,a)=>s+(a.fitness||0),0)/Math.max(1,agents.length))} T$` });
  }
  const highScoreAgents = agents.filter(a=>Math.abs(a.score||0)>0.95);
  if(highScoreAgents.length > 0) {
    alerts.push({ level:'info', icon:'⚡', title:`${highScoreAgents.length} agent(s) en conviction extrême`,
      desc:`Score >0.95 : signal très fort. ${highScoreAgents.map(a=>a.emoji+a.name).join(', ')}`,
      val:`Direction : ${(highScoreAgents[0].score||0)>0?'↑ HAUSSIER':'↓ BAISSIER'}` });
  }

  // ── 3. Positions : durée excessive ──
  const now = Date.now();
  openPos.forEach(pos=>{
    if(!pos.entryTs) return;
    const ageMins = (now-pos.entryTs)/60000;
    if(ageMins > 240) {
      alerts.push({ level:'warn', icon:'⏰', title:`${pos.pair} : Position ouverte depuis ${Math.round(ageMins)}min`,
        desc:`Position ${pos.side.toUpperCase()} ouverte depuis plus de 4h. Vérifier si le bot ne l'a pas oubliée.`,
        val:`P&L : ${(pos.pnlUsdt||0)>=0?'+':''}$${(pos.pnlUsdt||0).toFixed(2)}` });
    }
  });

  // ── 4. Frais : ratio anormal ──
  const totalFees = S.fees?.totalFees || 0;
  const totalPnlGross = S.fees?.totalPnlGross || 0;
  if(totalPnlGross > 0 && totalFees/totalPnlGross > 0.5 && totalFees > 10) {
    alerts.push({ level:'critical', icon:'💸', title:`Ratio frais critique (${Math.round(totalFees/totalPnlGross*100)}%)`,
      desc:`Les frais représentent plus de 50% des gains bruts. Ton P&L net en souffre fortement. Augmente le stake minimum.`,
      val:`Frais : -$${totalFees.toFixed(2)} | Brut : +$${totalPnlGross.toFixed(2)}` });
  } else if(totalPnlGross > 0 && totalFees/totalPnlGross > 0.25) {
    alerts.push({ level:'warn', icon:'💸', title:`Frais élevés (${Math.round(totalFees/totalPnlGross*100)}% des gains)`,
      desc:`Frais = ${Math.round(totalFees/totalPnlGross*100)}% des gains bruts. Vise <15%.`, val:'' });
  }

  // ── 5. Win Rate : chute soudaine ──
  if(n >= 10) {
    const recentTrades = allTrades.slice(-10);
    const recentWR = recentTrades.filter(t=>t.pnlUsdt>0).length/10;
    const globalWR  = allTrades.filter(t=>t.pnlUsdt>0).length/n;
    if(recentWR < globalWR - 0.2 && globalWR >= 0.5) {
      alerts.push({ level:'warn', icon:'📉', title:`Chute du WR sur les 10 derniers trades`,
        desc:`WR récent : ${Math.round(recentWR*100)}% vs global ${Math.round(globalWR*100)}%. Dégradation de -${Math.round((globalWR-recentWR)*100)}pts. Possible changement de régime.`,
        val:`WR récent : ${Math.round(recentWR*100)}%` });
    }
  }

  // ── 6. Drawdown actuel ──
  const dd = typeof computeAdvancedMetrics==='function' ? computeAdvancedMetrics()?.maxDDPct : null;
  if(dd !== null && dd < -12) {
    alerts.push({ level:'critical', icon:'📉', title:`Drawdown maximum critique : ${dd.toFixed(1)}%`,
      desc:'Drawdown dépassé 12%. Le Rescue Bot devrait intervenir automatiquement. Vérifie les positions ouvertes.',
      val:`DD max : ${dd.toFixed(2)}%` });
  }

  // ── 7. Connexion réseau ──
  if(S._netPaused === true) {
    alerts.push({ level:'critical', icon:'🔴', title:'Connexion internet coupée',
      desc:'Le bot est en pause automatique. Les prix ne sont plus mis à jour. Les positions ouvertes ne peuvent pas être fermées automatiquement.',
      val:'Mode dégradé actif' });
  }

  // ── 8. Tout va bien ──
  if(alerts.length === 0) {
    alerts.push({ level:'ok', icon:'✅', title:'Aucune anomalie détectée',
      desc:'Tous les systèmes fonctionnent normalement. Prix stables, agents sains, positions dans les limites.', val:'' });
  }

  return alerts.sort((a,b)=>{ const o={critical:0,warn:1,info:2,ok:3}; return o[a.level]-o[b.level]; });
}
window.detectAnomalies = detectAnomalies;

function renderAnomalySection() {
  const el = document.getElementById('anomalySection');
  if(!el) return;

  const alerts = detectAnomalies();
  const critCount = alerts.filter(a=>a.level==='critical').length;
  const warnCount = alerts.filter(a=>a.level==='warn').length;
  const isOk = alerts.length===1 && alerts[0].level==='ok';

  el.innerHTML = `
    <div class="da-section">
      <div class="da-title">
        🔍 Détecteur d'Anomalies
        <span style="font-size:9px;font-weight:700;color:${isOk?'var(--up)':critCount>0?'var(--down)':'var(--gold)'};">
          ${isOk?'✅ OK':critCount>0?'🔴 '+critCount+' critique(s)':'🟡 '+warnCount+' alerte(s)'}
        </span>
      </div>

      <!-- Stats rapides -->
      ${!isOk ? `
      <div class="da-stat-grid">
        <div class="da-stat">
          <span class="da-stat-val" style="color:${critCount>0?'var(--down)':'var(--t3)'};">${critCount}</span>
          <span class="da-stat-lbl">🔴 Critiques</span>
        </div>
        <div class="da-stat">
          <span class="da-stat-val" style="color:${warnCount>0?'var(--gold)':'var(--t3)'};">${warnCount}</span>
          <span class="da-stat-lbl">🟡 Alertes</span>
        </div>
      </div>` : ''}

      <!-- Liste des alertes -->
      ${alerts.map(a=>`
        <div class="da-alert ${a.level}">
          <div class="da-alert-icon">${a.icon}</div>
          <div class="da-alert-body">
            <div class="da-alert-title">${a.title}</div>
            <div class="da-alert-desc">${a.desc}</div>
            ${a.val?`<div class="da-alert-val">${a.val}</div>`:''}
          </div>
        </div>`).join('')}

      <div style="font-size:8px;color:var(--t3);margin-top:8px;text-align:center;">
        Analyse en temps réel · ${new Date().toLocaleTimeString()}
      </div>
    </div>`;
}
window.renderAnomalySection = renderAnomalySection;
