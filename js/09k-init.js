// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09k-init.js · VERSION 121 · 21/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Init — démarrage de l'application.
// Doit être le DERNIER sous-module chargé.
//
// v121 — Refonte complète :
//   • CHAQUE section wrapper dans try/catch indépendant
//   • Si loadState() throw, on continue quand même
//   • renderAll() appelé en fin de toutes les sections
//   • Bannière debug visuelle pour identifier où ça plante
//   • Tous les appels de fonctions vérifient typeof === 'function'
//
// L'appel init() est délégué à 00b-persistance-override.js (en fin de
// fichier de 00b, après installation des overrides loadState/saveState).
// ════════════════════════════════════════════════════════════════════════


// ── Bannière debug init ────────────────────────────────────────────────
function _showInitDebug(msg, bgColor) {
  try {
    const inject = () => {
      let el = document.getElementById('_initDebug');
      if (el) el.remove();
      el = document.createElement('div');
      el.id = '_initDebug';
      el.style.cssText = [
        'position:fixed','top:30px','left:0','right:0',
        'z-index:999998','padding:10px 14px',
        'font:bold 11px ui-monospace,monospace',
        'text-align:center','color:#fff','cursor:pointer',
        'line-height:1.4','white-space:pre-wrap','word-break:break-all'
      ].join(';');
      el.style.background = bgColor || '#3a2a4d';
      el.textContent = msg;
      el.onclick = () => el.remove();
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch(e){} }, 15000);
    };
    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);
  } catch(e) {}
}


async function init() {
  const sections = [];

  // ── 0. Sync version + bouton mode ──
  try {
    const vd = document.getElementById('versionDisplay');
    if (vd && typeof S !== 'undefined') {
      vd.textContent = 'v' + (S.vMajor || 7) + '.' + (S.vMinor || '?');
    }
    if (typeof updateModeButton === 'function') updateModeButton();
    sections.push('v0');
  } catch (e) { sections.push('v0:err'); }

  // ── 1. loadState ──
  let restored = false;
  try {
    restored = await loadState();
    sections.push('load:' + (restored ? 'OK' : 'vide'));
  } catch (e) {
    sections.push('load:THROW=' + e.message.slice(0, 30));
  }

  // ── 2. Seed chain log si nouvelle session ──
  try {
    if (!restored || !S.chainLog || S.chainLog.length === 0) {
      S.chainLog = S.chainLog || [];
      S.chainLog.push(
        { icon: '🏛', desc: 'DAO Contract déployé sur Polygon', hash: (typeof rndHash==='function'?rndHash():'init'), time: (typeof nowStr==='function'?nowStr():'') },
        { icon: '🔑', desc: 'Gnosis Safe trésorerie initialisée', hash: (typeof rndHash==='function'?rndHash():'init'), time: (typeof nowStr==='function'?nowStr():'') }
      );
      S.evoLog = S.evoLog || [];
      S.dreams = S.dreams || [];
    } else if (S.chainLog) {
      S.chainLog.push({
        icon: '✅',
        desc: 'Session restaurée · cycle #' + S.cycle + ' · ' + (S.totalTrades || 0) + ' trades',
        hash: (typeof rndHash==='function'?rndHash():'init'),
        time: (typeof nowStr==='function'?nowStr():'')
      });
    }
    sections.push('seed:OK');
  } catch (e) { sections.push('seed:err'); }

  // ── 3. Boutons mode AUTO/MAN ──
  try {
    const _mBtn       = document.getElementById('modeToggleBtn');
    const _mLbl       = document.getElementById('modeLabelText');
    const _isAutoInit = S.botAutoMode !== false;
    if (_mBtn) _mBtn.className   = _isAutoInit ? 'auto' : 'manual';
    if (_mLbl) _mLbl.textContent = _isAutoInit ? 'AUTO' : 'MAN';
    const _chip = document.getElementById('heroModeChip');
    if (_chip) {
      _chip.className = 'mode-indicator-chip ' + (_isAutoInit ? 'auto' : 'manual');
      _chip.innerHTML = _isAutoInit ? '🤖 AUTO' : '🎛️ MAN';
    }
    sections.push('btn:OK');
  } catch (e) { sections.push('btn:err'); }

  // ── 4. Render initial — CHACUN dans son try/catch ──
  try { if (typeof renderAll === 'function') renderAll(); sections.push('rA:OK'); }
  catch(e) { sections.push('rA:err'); }

  try {
    if (typeof S !== 'undefined' && S.currentPage === 0) {
      setTimeout(() => {
        try { if (typeof startBrainAnim === 'function') startBrainAnim(); } catch(e){}
        try { if (typeof updateMarketMood === 'function') updateMarketMood(); } catch(e){}
        try { if (typeof updateBotThoughts === 'function') updateBotThoughts(); } catch(e){}
        try { if (typeof updateFiscalMini === 'function') updateFiscalMini(); } catch(e){}
        try { if (typeof renderAnalyticsPanel === 'function') renderAnalyticsPanel(); } catch(e){}
        try { if (typeof renderPendingActions === 'function') renderPendingActions(); } catch(e){}
      }, 300);
    }
  } catch (e) {}

  try { if (typeof renderActionsGrid === 'function') renderActionsGrid(); } catch(e){}
  try { if (typeof renderPositions === 'function') renderPositions(); } catch(e){}
  try { if (typeof drawMobileChart === 'function') drawMobileChart(); } catch(e){}
  try { if (typeof buildPairPosButtons === 'function') buildPairPosButtons(); } catch(e){}
  try { if (typeof syncPairPresets === 'function') syncPairPresets(); } catch(e){}
  try { if (typeof updateCycleDurLabel === 'function') updateCycleDurLabel(); } catch(e){}
  try { if (typeof estimateStakes === 'function') estimateStakes(); } catch(e){}
  try { if (typeof updateAllPairCtrlLabels === 'function') updateAllPairCtrlLabels(); } catch(e){}
  try { if (typeof updatePairBtnStates === 'function') updatePairBtnStates(); } catch(e){}
  try { if (typeof drawSparkline === 'function') drawSparkline(); } catch(e){}
  try { setTimeout(() => { try { if (typeof updatePairAnalysisPanels === 'function') updatePairAnalysisPanels(); } catch(e){} }, 300); } catch(e){}

  // ── 5. Reconstruction agents si restored ──
  if (restored) {
    try { if (typeof buildAgentCards === 'function') buildAgentCards(); } catch(e){}
    try { if (typeof patchAgentCards === 'function') patchAgentCards(); } catch(e){}
    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
    try { if (typeof showToast === 'function') showToast('✅ Session restaurée · cycle #' + S.cycle); } catch(e){}
    sections.push('agents:OK');
  }

  // ── 6. Sim button ──
  try { if (typeof updateSimBtn === 'function') updateSimBtn(); } catch(e){}

  // ── 7. Prix live au démarrage ──
  try {
    const cached = localStorage.getItem('nexus_price_cache');
    if (cached) {
      const pc  = JSON.parse(cached);
      const now = Date.now();
      Object.entries(pc).forEach(([pair, d]) => {
        if (S.pairStates && S.pairStates[pair] && d.price && (now - (d.ts || 0)) < 600000) {
          S.pairStates[pair].price  = d.price;
          S.pairStates[pair].pnl24h = d.pnl24h || 0;
        }
      });
    }
  } catch (e) {}

  try { if (typeof fetchLivePrices === 'function') fetchLivePrices(true); } catch(e){}
  try { if (typeof _priceWatchdog === 'function') setInterval(_priceWatchdog, 10000); } catch(e){}
  try { setTimeout(() => { try { if (typeof fetchLivePrices === 'function') fetchLivePrices(true); } catch(e){} }, 3000); } catch(e){}

  // ── 8. Auto-save scheduling ──
  try { if (typeof scheduleAutoSave === 'function') scheduleAutoSave(); } catch(e){}

  // ── 9. Sync version ──
  try {
    const verEl = document.getElementById('versionDisplay');
    if (verEl) verEl.textContent = 'v' + S.vMajor + '.' + S.vMinor;
    const gBtn = document.getElementById('installGlobeBtn');
    if (gBtn) gBtn.title = 'NEXUS v' + S.vMajor + '.' + S.vMinor + ' · Installer';
  } catch(e) {}

  // ── 10. Réserve levier ──
  try {
    if (!S._sessionStart) S._sessionStart = Date.now();
    if ((!S.leverageReserve || S.leverageReserve === 0) && typeof initLeverageReserve === 'function') {
      initLeverageReserve();
    }
    if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
  } catch(e){}

  // ── 11. Renders intel ──
  try { if (typeof updateIntelBanner === 'function') updateIntelBanner(); } catch(e){}
  try { if (typeof updateStreakBadge === 'function') updateStreakBadge(); } catch(e){}

  setTimeout(() => {
    try {
      if (S.agents) {
        S.agents.forEach(a => { if (!a.fitnessHistory) a.fitnessHistory = [a.fitness, a.fitness]; });
      }
      if (typeof renderAgentHeatmap === 'function') renderAgentHeatmap();
      if (typeof renderCorrMatrix === 'function') renderCorrMatrix();

      const corrWrap = document.getElementById('corrMatrixWrap');
      if (corrWrap && window.ResizeObserver) {
        new ResizeObserver(() => {
          try { window._corrLastTick = -1; if (typeof renderCorrMatrix === 'function') renderCorrMatrix(); } catch(e){}
        }).observe(corrWrap);
      }
    } catch(e){}
  }, 150);

  // ── 12. Resize global ──
  try {
    window.addEventListener('resize', () => {
      try { if (typeof drawSparkline === 'function') drawSparkline(); } catch(e){}
      try { if (typeof drawMobileChart === 'function') drawMobileChart(); } catch(e){}
      try { window._corrLastTick = -1; if (typeof renderCorrMatrix === 'function') renderCorrMatrix(); } catch(e){}
    });
  } catch(e){}

  // ── Final render garanti ──
  setTimeout(() => {
    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
  }, 500);

  // ── Bannière debug succès ──
  _showInitDebug(
    'init OK · #' + (S && S.cycle) +
    ' · portfolio=' + (S && S.portfolio ? S.portfolio.toFixed(2) : '?') +
    ' · sections: ' + sections.join(' '),
    '#0a4d2a'
  );
}
window.init = init;
