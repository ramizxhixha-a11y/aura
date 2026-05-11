/* ═══════════════════════════════════════════════════════════
   AURA8 v109 · js/02-settings-redesign.js
   LIVRAISON 2 — Modale réglages refondue style iOS
   
   Stratégie : remplace le contenu de #settingsBackdrop par
   un nouveau panneau à navigation menu → sous-pages.
   Les fonctions existantes (toggleSim, toggleAutoBackup, etc.)
   sont appelées comme avant — pas de modification de leur logique.
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── Cartes du menu principal ──────────────────────────
  const CARDS = [
    { id:'systeme',    icon:'📊', title:'Système',    sub:'Perf · Chrono · Stockage' },
    { id:'trading',    icon:'💹', title:'Trading',    sub:'Mode réel · Stratégies' },
    { id:'save',       icon:'💾', title:'Sauvegardes', sub:'Backup · Export · Import' },
    { id:'notifs',     icon:'🔔', title:'Notifications', sub:'Push · Sons · Telegram' },
    { id:'resets',     icon:'🔄', title:'Resets',     sub:'Déblocages · Compteurs' },
    { id:'agents',     icon:'🤖', title:'Agents',     sub:'31 agents · Rêves', new:true },
    { id:'analytics',  icon:'📈', title:'Analytics',  sub:'Heatmap · Rapports', new:true },
    { id:'mcompte',    icon:'👤', title:'Mon Compte', sub:'Profil · Niveau · Thèmes', new:true },
    { id:'debug',      icon:'🐛', title:'Debug',      sub:'Logs · État · SW', new:true, fullwidth:true },
    { id:'danger',     icon:'⚠️', title:'Zone Danger', sub:'Factory Reset', fullwidth:true },
  ];

  // ─── État de navigation ────────────────────────────────
  let currentPage = 'menu';
  const pageHistory = ['menu'];

  // ─── Utilitaires ───────────────────────────────────────
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function getChronoFormatted(mode) {
    if (window.AuraChrono && window.AuraChrono.formatChrono) {
      const s = window.AuraChrono.getChrono ? window.AuraChrono.getChrono(mode) : 0;
      return window.AuraChrono.formatChrono(s);
    }
    return '00:00';
  }

  function getStorageUsage() {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        total += (localStorage.getItem(key) || '').length + key.length;
      }
      const mb = (total / 1024 / 1024).toFixed(2);
      const pct = Math.min(100, Math.round((total / (5 * 1024 * 1024)) * 100));
      return { mb, pct, total };
    } catch(e) {
      return { mb: '?', pct: 0, total: 0 };
    }
  }

  function getSwStatus() {
    if (!('serviceWorker' in navigator)) return 'Non supporté';
    return navigator.serviceWorker.controller ? 'Actif ✓' : 'Inactif';
  }

  // ─── Rendu de chaque page ──────────────────────────────
  function renderMenu() {
    const cards = CARDS.map(c => `
      <div class="aura-ss-card cat-${c.id}${c.fullwidth ? ' fullwidth' : ''}" data-goto="${c.id}">
        ${c.new ? '<span class="aura-ss-card-badge">NEW</span>' : ''}
        <span class="aura-ss-card-icon">${c.icon}</span>
        <div class="aura-ss-card-title">${c.title}</div>
        <div class="aura-ss-card-sub">${c.sub}</div>
      </div>
    `).join('');
    return `
      <div class="aura-ss-grid">${cards}</div>
      <div class="aura-ss-version">AURA ∞ v109 · Build ${new Date().toISOString().slice(0,10)}</div>
    `;
  }

  function renderSysteme() {
    const storage = getStorageUsage();
    return `
      <div class="aura-ss-section">
        <div class="aura-ss-section-title">⚡ Performance</div>
        <div class="aura-ss-perf-grid" id="auraSsPerf">
          <div class="aura-ss-perf-cell"><div class="perf-label">MOY</div><div class="perf-value" id="ssPerfMoy">—</div></div>
          <div class="aura-ss-perf-cell"><div class="perf-label">MAX</div><div class="perf-value" id="ssPerfMax">—</div></div>
          <div class="aura-ss-perf-cell"><div class="perf-label">DERNIER</div><div class="perf-value" id="ssPerfLast">—</div></div>
          <div class="aura-ss-perf-cell"><div class="perf-label">ÉTAT</div><div class="perf-value" id="ssPerfState">—</div></div>
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title" style="color:var(--pur);">🩺 Diagnostic santé</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">Santé du système</div>
            <div class="aura-ss-row-sub">Trades · P&L · agents · capital</div>
          </div>
          <button class="aura-ss-btn purple" onclick="if(typeof openDiagnostic==='function')openDiagnostic();">Ouvrir</button>
        </div>
      </div>

      <div class="aura-ss-section cat-save">
        <div class="aura-ss-section-title">⏱️ Chronomètres</div>
        <div class="aura-ss-chrono-row">
          <div class="aura-ss-chrono-left">
            <span class="aura-ss-chrono-tag auto">AUTO</span>
            <span class="aura-ss-chrono-val" id="ssChronoAuto">${getChronoFormatted('AUTO')}</span>
          </div>
          <button class="aura-ss-chrono-reset" data-reset-chrono="AUTO">RESET</button>
        </div>
        <div class="aura-ss-chrono-row">
          <div class="aura-ss-chrono-left">
            <span class="aura-ss-chrono-tag manu">MANU</span>
            <span class="aura-ss-chrono-val" id="ssChronoManu">${getChronoFormatted('MANU')}</span>
          </div>
          <button class="aura-ss-chrono-reset" data-reset-chrono="MANU">RESET</button>
        </div>
        <div style="font-size:8px;color:var(--t3);margin-top:6px;line-height:1.4;">
          Le chrono du mode actif compte automatiquement.
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">💾 Stockage local</div>
        <div class="aura-ss-row" style="border-bottom:none;padding-bottom:0;">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">${storage.mb} MB utilisés</div>
            <div class="aura-ss-row-sub">${storage.pct}% de l'espace localStorage</div>
          </div>
        </div>
        <div class="aura-ss-storage-bar">
          <div class="aura-ss-storage-fill" style="width:${storage.pct}%;"></div>
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">🔄 Service Worker</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">État : ${getSwStatus()}</div>
            <div class="aura-ss-row-sub">Cache PWA</div>
          </div>
          <button class="aura-ss-btn" id="ssBtnSwUpdate">Forcer MAJ</button>
        </div>
      </div>
    `;
  }

  function renderTrading() {
    return `
      <div class="aura-ss-section cat-trading">
        <div class="aura-ss-section-title">✏️ Mode Réel</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">Mode trading réel</div>
            <div class="aura-ss-row-sub">Vraies bougies Binance · règles strictes</div>
          </div>
          <button class="aura-ss-btn green" onclick="if(typeof toggleRealMode==='function')toggleRealMode();">Configurer</button>
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">🔬 Stratégies avancées</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">A/B Testing</div>
            <div class="aura-ss-row-sub">Comparer 2 stratégies en parallèle</div>
          </div>
          <button class="aura-ss-btn" onclick="if(typeof toggleAbTesting==='function')toggleAbTesting();">Ouvrir</button>
        </div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">🛡️ Hedging automatique</div>
            <div class="aura-ss-row-sub">Couverture auto en cas de DD critique</div>
          </div>
          <button class="aura-ss-btn" onclick="if(typeof toggleHedging==='function')toggleHedging();">Configurer</button>
        </div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">👯 Twin Live</div>
            <div class="aura-ss-row-sub">Bot fantôme parallèle · stratégie alternative</div>
          </div>
          <button class="aura-ss-btn" onclick="if(typeof toggleTwinLive==='function')toggleTwinLive();">Activer</button>
        </div>
      </div>

      <div class="aura-ss-section cat-save">
        <div class="aura-ss-section-title">💰 Réglages fiscaux</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">Configuration des frais</div>
            <div class="aura-ss-row-sub">Maker · Taker · Slippage · Région</div>
          </div>
          <button class="aura-ss-btn gold" onclick="if(typeof closeSettingsModal==='function')closeSettingsModal();if(typeof goToPage==='function')goToPage(5);">→ Page Fiscale</button>
        </div>
      </div>
    `;
  }

  function renderSauvegardes() {
    return `
      <div class="aura-ss-section cat-save">
        <div class="aura-ss-section-title">⚡ Backup rapide</div>
        <div style="font-size:9px;color:var(--t3);margin-bottom:10px;line-height:1.5;">
          Génère un backup .json maintenant (utile avant changement risqué).
        </div>
        <button class="aura-ss-btn gold fullwidth" onclick="if(typeof exportJsonQuick==='function')exportJsonQuick();else if(typeof exportBackup==='function')exportBackup('quick');">💾 Backup maintenant (.json)</button>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">📤 Export complet</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button class="aura-ss-btn" onclick="if(typeof exportJson==='function')exportJson();">📦 .json</button>
          <button class="aura-ss-btn" onclick="if(typeof exportTxt==='function')exportTxt();">📄 .txt</button>
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">📥 Import</div>
        <button class="aura-ss-btn gold fullwidth" style="margin-bottom:6px;" onclick="if(typeof importSecure==='function')importSecure();">↑ Importer SÉCURISÉ</button>
        <button class="aura-ss-btn danger fullwidth" onclick="if(typeof importPermissive==='function')importPermissive();">🔴 Importer MAX PERMISSIF</button>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">🔄 Backup automatique</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">Activer auto-backup</div>
            <div class="aura-ss-row-sub">1/jour pendant 7 jours</div>
          </div>
          <button class="aura-ss-btn" onclick="if(typeof toggleAutoBackup==='function')toggleAutoBackup();">Configurer</button>
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">📸 Snapshots internes</div>
        <button class="aura-ss-btn gold fullwidth" onclick="if(typeof openSnapshotModal==='function')openSnapshotModal();">📸 Voir et restaurer</button>
      </div>
    `;
  }

  function renderNotifs() {
    return `
      <div class="aura-ss-section cat-notifs">
        <div class="aura-ss-section-title">🔔 Préférences</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">Notifications verbeuses</div>
            <div class="aura-ss-row-sub">Silencieux — seuls les événements critiques</div>
          </div>
          <button class="aura-ss-btn" onclick="if(typeof toggleVerbose==='function')toggleVerbose();">Toggle</button>
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">📱 Notifications push</div>
        <div style="font-size:9px;color:var(--t3);margin-bottom:10px;line-height:1.5;">
          Permission navigateur requise.
        </div>
        <button class="aura-ss-btn green fullwidth" onclick="if(typeof requestNotifPermission==='function')requestNotifPermission();">✓ Configurer notifications push</button>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">🔊 Sons personnalisés</div>
        <button class="aura-ss-btn fullwidth" onclick="if(typeof toggleSoundEnabled==='function')toggleSoundEnabled();">🎵 Configurer les sons</button>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">💬 Telegram</div>
        <button class="aura-ss-btn fullwidth" onclick="if(typeof toggleTgEnabled==='function')toggleTgEnabled();">⚙️ Configurer Telegram</button>
      </div>
    `;
  }

  function renderResets() {
    const counts = [
      { key:'caisse',  label:'Caisse (USDT)',         color:'rgba(56,212,245,.3)' },
      { key:'trading', label:'Compte trading (USDT)', color:'rgba(0,232,122,.3)' },
      { key:'fonds',   label:'Fonds propres (€)',     color:'rgba(167,139,250,.3)' },
      { key:'fiscale', label:'Réserve fiscale (USDT)',color:'rgba(245,200,66,.3)' },
      { key:'dette',   label:'Dette levier',          color:'rgba(255,61,107,.3)' },
    ];
    const holdBtns = counts.map(c => `
      <button class="aura-ss-hold" data-hold-target="${c.key}" style="border-color:${c.color};">
        <span class="aura-ss-hold-bar"></span>
        <span class="aura-ss-hold-text">⚠️ ${c.label}</span>
        <span class="aura-ss-hold-action">MAINTENIR 2s</span>
      </button>
    `).join('');

    return `
      <div class="aura-ss-section cat-notifs">
        <div class="aura-ss-section-title">🔓 Déblocages</div>
        <button class="aura-ss-btn purple fullwidth" style="margin-bottom:6px;" onclick="if(typeof reactivateBlacklisted==='function')reactivateBlacklisted();">🔓 Réactiver paires blacklistées</button>
        <button class="aura-ss-btn purple fullwidth" style="margin-bottom:6px;" onclick="if(typeof resetLossStreaks==='function')resetLossStreaks();">🔄 Reset streaks de pertes</button>
        <button class="aura-ss-btn purple fullwidth" onclick="if(typeof reviveAgents==='function')reviveAgents();">🔄 Revigorer agents cassés</button>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">💰 Reset par compte</div>
        <div style="font-size:9px;color:var(--t3);margin-bottom:10px;line-height:1.5;">
          Maintiens 2 secondes pour confirmer. Scroll vertical autorisé.
        </div>
        ${holdBtns}
      </div>

      <div class="aura-ss-section cat-resets">
        <div class="aura-ss-section-title">🔄 Reset complet</div>
        <div style="font-size:9px;color:var(--t3);margin-bottom:10px;line-height:1.5;">
          Archive les domaines puis remet tous les compteurs à 0.
        </div>
        <button class="aura-ss-btn danger fullwidth" onclick="if(typeof resetAll==='function')resetAll();">🔄 TOUT RESET</button>
      </div>
    `;
  }

  function renderAgents() {
    return `
      <div class="aura-ss-section cat-agents">
        <div class="aura-ss-section-title">🤖 Vue d'ensemble</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
          <div>
            <div style="font-size:9px;color:var(--t3);">AGENTS</div>
            <div style="font-size:16px;font-weight:800;color:#38bdf8;" id="ssAgentsCount">${(window.S && window.S.agents) ? window.S.agents.length : '—'}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--t3);">CYCLES</div>
            <div style="font-size:16px;font-weight:800;color:var(--t1);" id="ssAgentsCycles">${(window.S && window.S.agentCycles) ? window.S.agentCycles : '—'}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--t3);">WR</div>
            <div style="font-size:16px;font-weight:800;color:var(--up);" id="ssAgentsWR">${(window.S && window.S.totalTrades) ? Math.round((window.S.winTrades||0)/window.S.totalTrades*100)+'%' : '—'}</div>
          </div>
        </div>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">⚙️ Configuration</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">Voir la page Agents</div>
            <div class="aura-ss-row-sub">Détails complets · champions · cassés</div>
          </div>
          <button class="aura-ss-btn" onclick="if(typeof closeSettingsModal==='function')closeSettingsModal();if(typeof goToPage==='function')goToPage(1);">→ Page Agents</button>
        </div>
      </div>
    `;
  }

  function renderAnalytics() {
    return `
      <div class="aura-ss-section cat-analytics">
        <div class="aura-ss-section-title">📊 Stats globales</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text"><div class="aura-ss-row-label">Win Rate</div></div>
          <div style="color:var(--up);font-weight:800;font-size:14px;" id="ssAnaWR">—</div>
        </div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text"><div class="aura-ss-row-label">P&L total</div></div>
          <div style="font-weight:800;font-size:14px;" id="ssAnaPnl">—</div>
        </div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text"><div class="aura-ss-row-label">Trades total</div></div>
          <div style="font-weight:800;font-size:14px;" id="ssAnaTrades">—</div>
        </div>
      </div>

      <div class="aura-ss-section cat-notifs">
        <div class="aura-ss-section-title">📜 Rapports</div>
        <button class="aura-ss-btn purple fullwidth" style="margin-bottom:6px;" onclick="if(typeof openWeeklyReport==='function')openWeeklyReport();">📊 Rapport hebdomadaire</button>
        <button class="aura-ss-btn purple fullwidth" onclick="if(typeof exportPdfReport==='function')exportPdfReport();">📄 Export PDF</button>
      </div>
    `;
  }

  function renderMonCompte() {
    const trust = (window.S && typeof window.S.trustScore === 'number') ? Math.round(window.S.trustScore) : 75;
    const levelLabel = trust >= 90 ? '🏆 Expert' : trust >= 71 ? '🎯 Avancé' : trust >= 51 ? '🟡 Intermédiaire' : trust >= 26 ? '🟠 Apprenti' : '🔴 Critique';

    return `
      <div class="aura-ss-tabs">
        <button class="aura-ss-tab cat-profil active" data-inner-tab="profil">🏆 Profil</button>
        <button class="aura-ss-tab cat-ambiance" data-inner-tab="ambiance">🎨 Ambiance</button>
      </div>

      <div class="aura-ss-tab-content active" id="ssTabProfil">
        <div class="aura-ss-section" style="border-color:rgba(245,200,66,.35);">
          <div class="aura-ss-section-title cat-mcompte">🏆 Niveau actuel</div>
          <div style="text-align:center;margin:14px 0;">
            <div style="font-size:42px;font-weight:900;color:var(--up);font-family:var(--font-mono);">${trust}</div>
            <div style="font-size:10px;color:var(--t3);letter-spacing:.2em;margin-top:2px;">/100</div>
            <div style="margin-top:8px;font-size:14px;font-weight:800;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;">${levelLabel}</div>
          </div>
          <div style="position:relative;height:10px;background:var(--s2);border-radius:5px;overflow:hidden;">
            <div style="height:100%;width:${trust}%;background:linear-gradient(to right,var(--ice),var(--up),var(--gold));border-radius:5px;"></div>
          </div>
        </div>

        <div class="aura-ss-section cat-notifs">
          <div class="aura-ss-section-title">🎭 Mode Démo</div>
          <div style="font-size:9px;color:var(--t3);margin-bottom:12px;line-height:1.5;">
            Prévisualise l'app dans 3 contextes. Aucun impact sur tes vraies données.
          </div>
          <button class="aura-ss-btn green fullwidth" style="margin-bottom:6px;text-align:left;" onclick="if(typeof enterDemoMode==='function')enterDemoMode('debutant');">🌱 Débutant · $500 · 15 trades</button>
          <button class="aura-ss-btn gold fullwidth" style="margin-bottom:6px;text-align:left;" onclick="if(typeof enterDemoMode==='function')enterDemoMode('pro');">🏆 Trader Pro · $8500 · 284 trades</button>
          <button class="aura-ss-btn danger fullwidth" style="text-align:left;" onclick="if(typeof enterDemoMode==='function')enterDemoMode('crise');">📉 Gestion de Crise</button>
          <button class="aura-ss-btn fullwidth" style="margin-top:8px;" onclick="if(typeof exitDemoMode==='function')exitDemoMode();">↩ Revenir au mode normal</button>
        </div>
      </div>

      <div class="aura-ss-tab-content" id="ssTabAmbiance">
        <div class="aura-ss-section">
          <div class="aura-ss-section-title" style="color:#f472b6;">🎨 Choisir un thème</div>
          <div class="aura-ss-theme-grid">
            <div class="aura-ss-theme-card" data-theme="nuit" style="background:#050709;">
              <div class="aura-ss-theme-card-icon">🌙</div>
              <div class="aura-ss-theme-card-name" style="color:var(--up);">NUIT</div>
              <div class="aura-ss-theme-card-desc">Sombre classique</div>
            </div>
            <div class="aura-ss-theme-card" data-theme="aube" style="background:#08060f;">
              <div class="aura-ss-theme-card-icon">🌆</div>
              <div class="aura-ss-theme-card-name" style="color:#c084fc;">AUBE</div>
              <div class="aura-ss-theme-card-desc">Violet doux</div>
            </div>
            <div class="aura-ss-theme-card" data-theme="jour" style="background:#f0f4f8;">
              <div class="aura-ss-theme-card-icon">☀️</div>
              <div class="aura-ss-theme-card-name" style="color:#16a34a;">JOUR</div>
              <div class="aura-ss-theme-card-desc" style="color:#666;">Lisible soleil</div>
            </div>
            <div class="aura-ss-theme-card" data-theme="deep" style="background:#000;">
              <div class="aura-ss-theme-card-icon">🌑</div>
              <div class="aura-ss-theme-card-name" style="color:var(--ice);">DEEP</div>
              <div class="aura-ss-theme-card-desc">Ultra-sombre</div>
            </div>
          </div>
        </div>

        <div class="aura-ss-section">
          <div class="aura-ss-section-title">🤖 Mode automatique</div>
          <div class="aura-ss-row">
            <div class="aura-ss-row-text">
              <div class="aura-ss-row-label">🌓 Changement automatique</div>
              <div class="aura-ss-row-sub">Selon l'heure de la journée</div>
            </div>
            <button class="aura-ss-btn" onclick="if(typeof toggleThemeAuto==='function')toggleThemeAuto();">Toggle</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderDebug() {
    return `
      <div class="aura-ss-section">
        <div class="aura-ss-section-title">📋 Logs récents</div>
        <div style="font-size:9px;color:var(--t3);margin-bottom:10px;line-height:1.5;">
          Copie les derniers logs (utile pour signaler un bug).
        </div>
        <button class="aura-ss-btn fullwidth" id="ssBtnCopyLogs">📋 Copier les logs récents</button>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">🔬 État système</div>
        <button class="aura-ss-btn fullwidth" id="ssBtnDumpState">📦 Voir dump état (S)</button>
      </div>

      <div class="aura-ss-section">
        <div class="aura-ss-section-title">🌐 Connecteurs</div>
        <div class="aura-ss-row">
          <div class="aura-ss-row-text">
            <div class="aura-ss-row-label">🔶 Binance</div>
            <div class="aura-ss-row-sub" id="ssBinanceState">—</div>
          </div>
          <span style="color:var(--up);font-size:14px;">●</span>
        </div>
      </div>

      <div class="aura-ss-section cat-danger">
        <div class="aura-ss-section-title">⚙️ Service Worker (avancé)</div>
        <button class="aura-ss-btn danger fullwidth" id="ssBtnUnregisterSw">🗑️ Désinscrire SW</button>
      </div>

      <div style="text-align:center;padding:10px;font-size:9px;color:var(--t3);">
        AURA v109 · ${new Date().toISOString().slice(0,10)}
      </div>
    `;
  }

  function renderDanger() {
    return `
      <div class="aura-ss-section cat-danger">
        <div class="aura-ss-section-title">⚠️ Factory Reset</div>
        <div style="font-size:10px;color:var(--t2);line-height:1.6;margin-bottom:14px;">
          Efface <strong style="color:var(--down);">TOUT</strong> : comptes, trades, positions, agents.<br>
          L'application redémarre comme à la 1ère installation.<br><br>
          <strong style="color:var(--down);">Action irréversible.</strong>
        </div>
        <button class="aura-ss-btn danger fullwidth" style="padding:14px;font-weight:800;" id="ssBtnFactoryReset">
          🔄 RESET COMPLET · PREMIER LANCEMENT
        </button>
      </div>
    `;
  }

  // Map des renderers
  const RENDERERS = {
    menu: renderMenu,
    systeme: renderSysteme,
    trading: renderTrading,
    save: renderSauvegardes,
    notifs: renderNotifs,
    resets: renderResets,
    agents: renderAgents,
    analytics: renderAnalytics,
    mcompte: renderMonCompte,
    debug: renderDebug,
    danger: renderDanger,
  };

  const TITLES = {
    menu:      ['Réglages', 'Menu principal'],
    systeme:   ['Système', 'Performance · Chrono · Stockage'],
    trading:   ['Trading', 'Mode réel · Stratégies'],
    save:      ['Sauvegardes', 'Backup · Export · Import'],
    notifs:    ['Notifications', 'Push · Sons · Telegram'],
    resets:    ['Resets', 'Déblocages · Compteurs'],
    agents:    ['Agents', 'IA · Champions · Rêves'],
    analytics: ['Analytics', 'Heatmap · Rapports'],
    mcompte:   ['Mon Compte', 'Profil · Ambiance'],
    debug:     ['Debug', 'Logs · État · SW'],
    danger:    ['Zone Danger', 'Factory Reset'],
  };

  // ─── Navigation ────────────────────────────────────────
  function navigateTo(pageId, addHistory) {
    currentPage = pageId;
    if (addHistory !== false) pageHistory.push(pageId);

    const renderer = RENDERERS[pageId];
    if (!renderer) return;

    const body = $('#auraSsBody');
    const title = $('#auraSsTitle');
    const sub = $('#auraSsSub');
    const back = $('#auraSsBack');
    if (!body || !title) return;

    body.innerHTML = renderer();
    title.textContent = TITLES[pageId][0];
    sub.textContent = TITLES[pageId][1];
    back.classList.toggle('hidden', pageHistory.length <= 1);

    // Re-attacher les handlers spécifiques à cette page
    attachPageHandlers(pageId);

    // Scroll top
    $('#auraSsScroll').scrollTop = 0;
  }

  function goBack() {
    if (pageHistory.length <= 1) return;
    pageHistory.pop();
    const prev = pageHistory[pageHistory.length - 1];
    navigateTo(prev, false);
  }

  function attachPageHandlers(pageId) {
    // Cartes du menu
    $$('[data-goto]').forEach(el => {
      el.addEventListener('click', () => navigateTo(el.dataset.goto));
    });

    // Reset chrono
    $$('[data-reset-chrono]').forEach(el => {
      el.addEventListener('click', () => {
        const mode = el.dataset.resetChrono;
        if (window.AuraChrono && window.AuraChrono.resetChrono) {
          if (confirm(`Réinitialiser le chrono ${mode} à 00:00 ?`)) {
            window.AuraChrono.resetChrono(mode);
            updateChronoDisplay();
          }
        }
      });
    });

    // Onglets internes Mon Compte
    $$('[data-inner-tab]').forEach(el => {
      el.addEventListener('click', () => {
        const tab = el.dataset.innerTab;
        $$('.aura-ss-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        $$('.aura-ss-tab-content').forEach(c => c.classList.remove('active'));
        const target = $('#ssTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
        if (target) target.classList.add('active');
      });
    });

    // Theme cards
    $$('[data-theme]').forEach(el => {
      el.addEventListener('click', () => {
        const theme = el.dataset.theme;
        if (typeof window.applyTheme === 'function') {
          window.applyTheme(theme, true);
        }
        $$('[data-theme]').forEach(c => {
          c.classList.remove('active');
          const check = c.querySelector('.aura-ss-theme-card-check');
          if (check) check.remove();
        });
        el.classList.add('active');
        const check = document.createElement('div');
        check.className = 'aura-ss-theme-card-check';
        check.textContent = '✓';
        el.appendChild(check);
      });
    });

    // Marquer le thème actif au rendu
    const currentTheme = (window.S && window.S.uiSettings && window.S.uiSettings.theme) || 'nuit';
    const activeCard = $('[data-theme="' + currentTheme + '"]');
    if (activeCard && !activeCard.classList.contains('active')) {
      activeCard.classList.add('active');
      const check = document.createElement('div');
      check.className = 'aura-ss-theme-card-check';
      check.textContent = '✓';
      activeCard.appendChild(check);
    }

    // Hold buttons (reset par compte)
    attachHoldButtons();

    // Page spécifiques
    if (pageId === 'debug') {
      const btnCopyLogs = $('#ssBtnCopyLogs');
      if (btnCopyLogs) btnCopyLogs.addEventListener('click', copyRecentLogs);
      const btnDumpState = $('#ssBtnDumpState');
      if (btnDumpState) btnDumpState.addEventListener('click', showDumpState);
      const btnUnregSw = $('#ssBtnUnregisterSw');
      if (btnUnregSw) btnUnregSw.addEventListener('click', unregisterSw);
    }
    if (pageId === 'systeme') {
      const btnSwUpdate = $('#ssBtnSwUpdate');
      if (btnSwUpdate) btnSwUpdate.addEventListener('click', updateSw);
      updatePerfDisplay();
    }
    if (pageId === 'danger') {
      const btnFR = $('#ssBtnFactoryReset');
      if (btnFR) btnFR.addEventListener('click', () => {
        if (typeof window.factoryReset === 'function') window.factoryReset();
        else if (typeof window.resetAll === 'function') window.resetAll();
      });
    }
    if (pageId === 'analytics') {
      updateAnalyticsDisplay();
    }
  }

  function attachHoldButtons() {
    $$('.aura-ss-hold').forEach(btn => {
      if (btn._auraHoldAttached) return;
      btn._auraHoldAttached = true;
      const bar = btn.querySelector('.aura-ss-hold-bar');
      let holdStart = null;
      let rafId = null;
      let startY = null;
      let cancelled = false;
      const HOLD_DURATION = 2000;

      function startHold(e) {
        cancelled = false;
        holdStart = Date.now();
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        rafId = requestAnimationFrame(tickHold);
      }
      function tickHold() {
        if (cancelled || !holdStart) return;
        const elapsed = Date.now() - holdStart;
        const pct = Math.min(100, (elapsed / HOLD_DURATION) * 100);
        bar.style.width = pct + '%';
        if (elapsed >= HOLD_DURATION) {
          const target = btn.dataset.holdTarget;
          if (typeof window.requestReset === 'function') {
            window.requestReset(target);
          } else {
            alert('Reset confirmé : ' + target);
          }
          resetHold();
          return;
        }
        rafId = requestAnimationFrame(tickHold);
      }
      function resetHold() {
        holdStart = null;
        if (rafId) cancelAnimationFrame(rafId);
        bar.style.width = '0%';
        cancelled = false;
      }
      function checkCancel(e) {
        if (!holdStart || startY === null) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        if (Math.abs(y - startY) > 10) {
          cancelled = true;
          resetHold();
        }
      }
      btn.addEventListener('touchstart', startHold, { passive: true });
      btn.addEventListener('touchmove', checkCancel, { passive: true });
      btn.addEventListener('touchend', resetHold);
      btn.addEventListener('touchcancel', resetHold);
      btn.addEventListener('mousedown', startHold);
      btn.addEventListener('mousemove', checkCancel);
      btn.addEventListener('mouseup', resetHold);
      btn.addEventListener('mouseleave', resetHold);
    });
  }

  // ─── Helpers spécifiques ───────────────────────────────
  function updateChronoDisplay() {
    const a = $('#ssChronoAuto');
    const m = $('#ssChronoManu');
    if (a) a.textContent = getChronoFormatted('AUTO');
    if (m) m.textContent = getChronoFormatted('MANU');
  }

  function updatePerfDisplay() {
    if (!window.S) return;
    const perf = window.S._perfTicks || [];
    if (perf.length === 0) return;
    const moy = perf.reduce((a,b)=>a+b,0) / perf.length;
    const max = Math.max(...perf);
    const last = perf[perf.length-1];
    const state = moy > 200 ? 'LENT' : moy > 100 ? 'OK' : 'RAPIDE';
    const elMoy = $('#ssPerfMoy'); if (elMoy) { elMoy.textContent = moy.toFixed(1)+'ms'; elMoy.style.color = moy>200?'var(--down)':moy>100?'var(--gold)':'var(--up)'; }
    const elMax = $('#ssPerfMax'); if (elMax) elMax.textContent = max.toFixed(0)+'ms';
    const elLast = $('#ssPerfLast'); if (elLast) elLast.textContent = last.toFixed(1)+'ms';
    const elState = $('#ssPerfState'); if (elState) { elState.textContent = state; elState.style.color = state==='LENT'?'var(--down)':state==='OK'?'var(--gold)':'var(--up)'; }
  }

  function updateAnalyticsDisplay() {
    if (!window.S) return;
    const wr = window.S.totalTrades > 0 ? Math.round(window.S.winTrades/window.S.totalTrades*100) : 0;
    const elWR = $('#ssAnaWR'); if (elWR) elWR.textContent = wr+'%';
    const pnl = window.S.pnl24h || 0;
    const elPnl = $('#ssAnaPnl'); if (elPnl) { elPnl.textContent = (pnl>=0?'+':'')+'$'+pnl.toFixed(2); elPnl.style.color = pnl>=0?'var(--up)':'var(--down)'; }
    const elT = $('#ssAnaTrades'); if (elT) elT.textContent = window.S.totalTrades || 0;
  }

  // Logs capture
  const _logBuffer = [];
  const _logMax = 100;
  ['log','warn','error'].forEach(level => {
    const orig = console[level];
    console[level] = function(...args) {
      _logBuffer.push('[' + level.toUpperCase() + '] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      if (_logBuffer.length > _logMax) _logBuffer.shift();
      orig.apply(console, args);
    };
  });

  function copyRecentLogs() {
    const text = _logBuffer.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('✓ ' + _logBuffer.length + ' logs copiés dans le presse-papier');
      }).catch(() => {
        prompt('Copie ces logs :', text);
      });
    } else {
      prompt('Copie ces logs :', text);
    }
  }

  function showDumpState() {
    const dump = JSON.stringify(window.S || {}, (k,v) => {
      if (k.startsWith('_') && k !== '_paperRealCurrentRegime') return undefined;
      return v;
    }, 2);
    const w = window.open('', '_blank', 'width=600,height=400');
    if (w) w.document.write('<pre style="font-size:11px;color:#0f0;background:#000;padding:14px;">' + dump.replace(/</g,'&lt;') + '</pre>');
  }

  function updateSw() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.update());
        alert('✓ Mise à jour du Service Worker forcée');
      });
    }
  }

  function unregisterSw() {
    if (!confirm('Désinscrire le Service Worker ? La PWA peut nécessiter une réinstallation.')) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        return Promise.all(regs.map(r => r.unregister()));
      }).then(() => {
        alert('✓ Service Worker désinscrit. Recharge la page.');
      });
    }
  }

  // ─── Initialisation : remplacer le contenu de #settingsBackdrop ───
  function mount() {
    const backdrop = document.getElementById('settingsBackdrop');
    if (!backdrop) {
      console.warn('[settings-redesign] #settingsBackdrop introuvable, retry plus tard');
      return false;
    }

    // Créer le nouveau panneau
    const oldPanel = backdrop.querySelector('.settings-panel') || backdrop.firstElementChild;
    const newPanel = document.createElement('div');
    newPanel.className = 'settings-panel aura-ss-panel';
    newPanel.innerHTML = `
      <div class="aura-ss-root">
        <div class="aura-ss-topbar">
          <button class="aura-ss-back hidden" id="auraSsBack">←</button>
          <div class="aura-ss-title-wrap">
            <div class="aura-ss-title" id="auraSsTitle">Réglages</div>
            <div class="aura-ss-subtitle" id="auraSsSub">Menu principal</div>
          </div>
          <button class="aura-ss-back" id="auraSsClose" style="color:var(--t2);">✕</button>
        </div>
        <div class="aura-ss-content" id="auraSsScroll">
          <div id="auraSsBody"></div>
        </div>
      </div>
    `;

    if (oldPanel) {
      oldPanel.style.display = 'none'; // garde l'ancien en backup mais caché
      oldPanel.parentNode.insertBefore(newPanel, oldPanel);
    } else {
      backdrop.appendChild(newPanel);
    }

    // Wire le back / close
    $('#auraSsBack').addEventListener('click', goBack);
    $('#auraSsClose').addEventListener('click', () => {
      if (typeof window.closeSettingsModal === 'function') window.closeSettingsModal();
      else backdrop.classList.remove('show');
    });

    // Render initial
    navigateTo('menu');

    // Ré-init de la modale quand on l'ouvre
    const origOpen = window.openSettingsModal;
    window.openSettingsModal = function() {
      // Reset à la page menu à chaque ouverture
      pageHistory.length = 0;
      pageHistory.push('menu');
      navigateTo('menu', false);
      if (typeof origOpen === 'function') {
        origOpen.apply(this, arguments);
      } else {
        backdrop.classList.add('show');
      }
    };

    // Refresh chrono toutes les secondes si la modale est ouverte
    setInterval(() => {
      if (backdrop.classList.contains('show') && currentPage === 'systeme') {
        updateChronoDisplay();
      }
    }, 1000);

    console.log('[settings-redesign] Nouvelle modale montée avec succès');
    return true;
  }

  // Tenter le mount au load et retry si le DOM n'est pas prêt
  function tryMount() {
    if (mount()) return;
    setTimeout(tryMount, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount);
  } else {
    tryMount();
  }
})();
