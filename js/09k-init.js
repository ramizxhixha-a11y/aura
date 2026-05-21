// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09k-init.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Init — démarrage de l'application.
// Doit être le DERNIER sous-module chargé (appelle init() à la fin).
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION Init
// Fonction de démarrage de l'application. Orchestre :
//  1. Restauration de l'état sauvegardé (loadState)
//  2. Seed du chain log si nouvelle session
//  3. Render initial des cartes, paires, graphiques
//  4. Affichage du bouton SIM (pause/play)
//  5. Prix live au démarrage (cache + fetch + watchdog)
//  6. Auto-save scheduling
//  7. Sync de l'affichage de version
//  8. Init de la réserve levier
//  9. Renders d'intel (banner, streak, heatmap, matrice corrélation)
// 10. Listener resize
//
// L'appel init() en bas de fichier déclenche le démarrage au chargement.
// ════════════════════════════════════════════════════════════════════════


async function init() {

  // Affichage dynamique de la version + sync du bouton mode AUTO/MAN
  try {
    const vd = document.getElementById('versionDisplay');
    if (vd && typeof S !== 'undefined') {
      vd.textContent = 'v' + (S.vMajor || 7) + '.' + (S.vMinor || '?');
    }
    if (typeof updateModeButton === 'function') updateModeButton();
  } catch (e) {}

  // ── 1. Tenter de restaurer l'état sauvegardé ──
  const restored = await loadState();

  // ── 2. Seed chain log si nouvelle session ──
  if (!restored || S.chainLog.length === 0) {
    S.chainLog = [
      { icon: '🏛', desc: 'DAO Contract déployé sur Polygon',                                hash: rndHash(), time: nowStr() },
      { icon: '🔑', desc: 'Gnosis Safe trésorerie initialisée',                              hash: rndHash(), time: nowStr() },
      { icon: '🪙', desc: 'GovernanceToken G$ mintés (5 agents)',                            hash: rndHash(), time: nowStr() },
      { icon: '💭', desc: 'Mémoire épisodique vectorielle initialisée · 15 agents actifs',   hash: rndHash(), time: nowStr() },
      { icon: '💤', desc: 'Dream Engine prêt · 6 scénarios de stress disponibles',           hash: rndHash(), time: nowStr() },
      { icon: '🌐', desc: '3 paires candidates en file d\'attente DAO',                      hash: rndHash(), time: nowStr() }
    ];

    S.evoLog = [
      { type: 'new',   title: '🧬 hybrid_v1 créé',           desc: 'Parents: Macro × Sentiment | Gen-1',                       time: nowStr() },
      { type: 'dream', title: '💤 Dream #1 — Initialisation', desc: 'Système calibré sur 6 scénarios historiques.',             time: nowStr(), dreamId: null }
    ];

    // Seed d'un dream de démonstration dans l'historique
    S.dreams = [{
      id: 1,
      startCycle: 0,
      time: nowStr(),
      complete: true,
      scenarios: [
        { ...DREAM_SCENARIOS[0], agentVotes: 8540, agentAgainst: 2100, outcome: { priceDelta: -0.14, survived: true },  calibration: { type: 'tighten_sl',  reason: 'Flash Crash'   } },
        { ...DREAM_SCENARIOS[4], agentVotes: 6200, agentAgainst: 3800, outcome: { priceDelta:  0.11, survived: true },  calibration: null },
        { ...DREAM_SCENARIOS[5], agentVotes: 4100, agentAgainst: 1200, outcome: { priceDelta: -0.002, survived: true }, calibration: { type: 'widen_cycles', reason: 'Consolidation' } }
      ],
      insight: 'Système résilient sur les 3 scénarios testés. Seuils TP/SL légèrement recalibrés après Flash Crash.'
    }];
  } else {
    S.chainLog.push({
      icon: '✅',
      desc: `Session restaurée · cycle #${S.cycle} · ${S.totalTrades} trades`,
      hash: rndHash(),
      time: nowStr()
    });
  }

  // ── 3. Init du bouton mode AUTO/MAN + chip header ──
  const _mBtn       = document.getElementById('modeToggleBtn');
  const _mLbl       = document.getElementById('modeLabelText');
  const _isAutoInit = S.botAutoMode !== false;
  if (_mBtn) _mBtn.className     = _isAutoInit ? 'auto' : 'manual';
  if (_mLbl) _mLbl.textContent   = _isAutoInit ? 'AUTO' : 'MAN';

  const _chip = document.getElementById('heroModeChip');
  if (_chip) {
    _chip.className = 'mode-indicator-chip ' + (S.botAutoMode !== false ? 'auto' : 'manual');
    _chip.innerHTML = S.botAutoMode !== false ? '🤖 AUTO' : '🎛️ MAN';
  }

  // ── 4. Render initial ──
  renderAll();

  // Animation du cerveau + bandeaux d'analyse (page principale uniquement)
  if (S.currentPage === 0) {
    setTimeout(() => {
      try {
        startBrainAnim();
        updateMarketMood();
        updateBotThoughts();
        updateFiscalMini();
        renderAnalyticsPanel();
        if (typeof renderPendingActions === 'function') renderPendingActions();
      } catch (e) {
        console.warn('init render:', e);
      }
    }, 300);
  }

  renderActionsGrid();          // rendu immédiat — pas d'attente sur tick%2
  renderPositions();
  drawMobileChart();
  buildPairPosButtons();
  syncPairPresets();
  updateCycleDurLabel();
  estimateStakes();
  updateAllPairCtrlLabels();
  updatePairBtnStates();
  drawSparkline();
  setTimeout(updatePairAnalysisPanels, 300);   // attendre les premières données prix

  if (restored) {
    // Reconstruction des cartes agents avec les données restaurées
    buildAgentCards();
    patchAgentCards();
    renderAll();
    showToast('✅ Session restaurée · cycle #' + S.cycle);
  }

  // L'utilisateur doit appuyer sur ▶ Démarrage pour lancer la simulation.
  // RT._simEverStarted reste false jusqu'au 1er clic → libellé "DÉMARRAGE" dans le header.
  updateSimBtn();

  // ── 5. Prix live au démarrage ──

  // 5a. Restauration depuis cache localStorage (prix < 10 min considérés frais)
  try {
    const cached = localStorage.getItem('nexus_price_cache');
    if (cached) {
      const pc  = JSON.parse(cached);
      const now = Date.now();
      Object.entries(pc).forEach(([pair, d]) => {
        if (S.pairStates[pair] && d.price && (now - (d.ts || 0)) < 600000) {
          S.pairStates[pair].price  = d.price;
          S.pairStates[pair].pnl24h = d.pnl24h || 0;
        }
      });
    }
  } catch (e) {}

  // 5b. Premier fetch
  fetchLivePrices(true);

  // 5c. Watchdog : vérifie toutes les 10s que les prix sont à jour
  setInterval(_priceWatchdog, 10000);

  // 5d. Second fetch 3s plus tard pour capturer les valeurs les plus récentes
  setTimeout(() => fetchLivePrices(true), 3000);

  // ── 6. Auto-save et événements de page ──
  scheduleAutoSave();

  // ── 7. Sync de l'affichage de version ──
  const verEl = document.getElementById('versionDisplay');
  if (verEl) verEl.textContent = `v${S.vMajor}.${S.vMinor}`;
  const gBtn = document.getElementById('installGlobeBtn');
  if (gBtn) gBtn.title = `NEXUS v${S.vMajor}.${S.vMinor} · Installer`;

  // ── 8. Init de la réserve levier ──
  if (!S._sessionStart) S._sessionStart = Date.now();
  if (!S.leverageReserve || S.leverageReserve === 0) initLeverageReserve();
  syncLeverageReserve();

  // ── 9. Renders initiaux d'intel ──
  updateIntelBanner();
  updateStreakBadge();

  setTimeout(() => {
    // Init fitnessHistory avant renderCorrMatrix (besoin de données historiques)
    S.agents.forEach(a => { if (!a.fitnessHistory) a.fitnessHistory = [a.fitness, a.fitness]; });
    renderAgentHeatmap();
    renderCorrMatrix();

    // ResizeObserver : redessine la matrice de corrélation si le conteneur change de taille
    const corrWrap = document.getElementById('corrMatrixWrap');
    if (corrWrap && window.ResizeObserver) {
      new ResizeObserver(() => {
        _corrLastTick = -1;
        renderCorrMatrix();
      }).observe(corrWrap);
    }
  }, 150);

  // ── 10. Listener resize global ──
  window.addEventListener('resize', () => {
    drawSparkline();
    drawMobileChart();
    _corrLastTick = -1;
    renderCorrMatrix();
  });
}
window.init = init;

// ════════════════════════════════════════════════════════════════════════
// Démarrage de l'application
// ════════════════════════════════════════════════════════════════════════
// L'appel init() est délégué à 00b-persistance-override.js, qui doit
// d'abord installer son override de loadState/saveState (cycle #16520
// dual-storage) AVANT que init() ne lise les storages au démarrage.
// Sans ce délai, init() utiliserait l'ancien loadState pré-override
// et l'app démarrerait avec un état figé du 06/05.
