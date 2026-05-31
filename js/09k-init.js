// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09k-init.js · VERSION 121.1 · 23/05/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Init — démarrage de l'application.
// v121.1 — Fix affichage wallet cards ($0) + fix modale transfert clavier
// ════════════════════════════════════════════════════════════════════════

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

// ── Fix direct des IDs wallet cards ──────────────────────────────────
function _renderWalletCards() {
  try {
    const fmt2 = (n) => '$' + (n||0).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});
    const fmtEUR = (n) => (n||0).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
    const setEl = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };

    // Caisse
    setEl('cashVal', fmt2(S.cashAccount || 0));
    setEl('cashPct', (S.portfolio > 0 ? ((S.cashAccount||0) / S.portfolio * 100) : 0).toFixed(0) + '%');

    // Trading
    setEl('tradVal', fmt2(S.tradingAccount || 0));
    setEl('tradPct', (S.portfolio > 0 ? ((S.tradingAccount||0) / S.portfolio * 100) : 0).toFixed(0) + '%');

    // Réserve levier
    setEl('levReserveVal', fmt2(S.leverageReserve || 0));
    const levBorSub = document.getElementById('levBorrowedSub');
    if (levBorSub) levBorSub.textContent = 'Emprunté: $' + Math.floor(S.leverageBorrowed||0);

    // Réserve fiscale
    setEl('fiscalResVal', fmt2(S.fiscalReserveAccount || 0));
    const fiscalSub = document.getElementById('fiscalResSub');
    if (fiscalSub) fiscalSub.textContent = (S.fiscalReserveLog||[]).length + ' dépôts';

    // Fonds propres
    const ownEUR = ((S.ownFundsInjected||0) * (S.usdEurRate||0.92));
    setEl('ownFundsVal', fmtEUR(ownEUR));
    const ownSub = document.getElementById('ownFundsSub');
    if (ownSub) ownSub.textContent = (S.ownFundsLog||[]).length + ' injection' + ((S.ownFundsLog||[]).length > 1 ? 's' : '');

    // Portefeuille total
    const totalEUR = ((S.cashAccount||0) + (S.tradingAccount||0) + (S.fiscalReserveAccount||0)) * (S.usdEurRate||0.92);
    const ptEl = document.querySelector('.portfolio-total-value, #portfolioTotalVal, [data-portfolio-total]');
    if (ptEl) ptEl.textContent = fmtEUR(totalEUR);
  } catch(e) {
    console.warn('[renderWalletCards]', e);
  }
}

// ── Fix modale transfert : résiste au clavier Android ────────────────
function _fixTransferModal() {
  try {
    const modal = document.getElementById('transferModal');
    if (!modal) return;

    // Intercepter l'ouverture de la modale
    const origOpen = window.openTransferModal;
    window.openTransferModal = function() {
      if (typeof origOpen === 'function') origOpen.apply(this, arguments);
      // Forcer le positionnement après ouverture
      setTimeout(() => {
        const m = document.getElementById('transferModal');
        if (!m) return;
        m.style.position = 'fixed';
        m.style.top = '0';
        m.style.left = '0';
        m.style.right = '0';
        m.style.bottom = '0';
        m.style.display = 'flex';
        m.style.alignItems = 'flex-start';
        m.style.justifyContent = 'center';
        m.style.overflowY = 'auto';
        m.style.padding = '16px';
        m.style.boxSizing = 'border-box';
        const sheet = m.querySelector('.settings-sheet');
        if (sheet) {
          sheet.style.borderRadius = '20px';
          sheet.style.maxHeight = 'none';
          sheet.style.transform = 'none';
          sheet.style.paddingBottom = '32px';
          sheet.style.width = '100%';
          sheet.style.boxSizing = 'border-box';
          sheet.style.position = 'relative';
        }
      }, 50);
    };
  } catch(e) {}
}


async function init() {
  const sections = [];

  try {
    const vd = document.getElementById('versionDisplay');
    if (vd && typeof S !== 'undefined') vd.textContent = 'v' + (S.vMajor || 7) + '.' + (S.vMinor || '?');
    if (typeof updateModeButton === 'function') updateModeButton();
    sections.push('v0');
  } catch (e) { sections.push('v0:err'); }

  let restored = false;
  try {
    restored = await loadState();
    sections.push('load:' + (restored ? 'OK' : 'vide'));
  } catch (e) {
    sections.push('load:THROW=' + e.message.slice(0, 30));
  }

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

  try {
    const _mBtn = document.getElementById('modeToggleBtn');
    const _mLbl = document.getElementById('modeLabelText');
    const _isAutoInit = S.botAutoMode !== false;
    if (_mBtn) _mBtn.className = _isAutoInit ? 'auto' : 'manual';
    if (_mLbl) _mLbl.textContent = _isAutoInit ? 'AUTO' : 'MAN';
    const _chip = document.getElementById('heroModeChip');
    if (_chip) {
      _chip.className = 'mode-indicator-chip ' + (_isAutoInit ? 'auto' : 'manual');
      _chip.innerHTML = _isAutoInit ? '🤖 AUTO' : '🎛️ MAN';
    }
    sections.push('btn:OK');
  } catch (e) { sections.push('btn:err'); }

  try { if (typeof renderAll === 'function') renderAll(); sections.push('rA:OK'); }
  catch(e) { sections.push('rA:err'); }

  // ── Fix wallet cards directement ──
  try { _renderWalletCards(); sections.push('wallet:OK'); }
  catch(e) { sections.push('wallet:err'); }

  // ── Fix modale transfert ──
  try { _fixTransferModal(); } catch(e) {}

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

  if (restored) {
    try { if (typeof buildAgentCards === 'function') buildAgentCards(); } catch(e){}
    try { if (typeof patchAgentCards === 'function') patchAgentCards(); } catch(e){}
    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
    try { _renderWalletCards(); } catch(e){}
    try { if (typeof showToast === 'function') showToast('✅ Session restaurée · cycle #' + S.cycle); } catch(e){}
    sections.push('agents:OK');
  }

  try { if (typeof updateSimBtn === 'function') updateSimBtn(); } catch(e){}

  try {
    const cached = localStorage.getItem('nexus_price_cache');
    if (cached) {
      const pc = JSON.parse(cached);
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
  try { if (typeof scheduleAutoSave === 'function') scheduleAutoSave(); } catch(e){}

  try {
    const verEl = document.getElementById('versionDisplay');
    if (verEl) verEl.textContent = 'v' + S.vMajor + '.' + S.vMinor;
  } catch(e) {}

  try {
    if (!S._sessionStart) S._sessionStart = Date.now();
    if ((!S.leverageReserve || S.leverageReserve === 0) && typeof initLeverageReserve === 'function') initLeverageReserve();
    if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
  } catch(e){}

  try { if (typeof updateIntelBanner === 'function') updateIntelBanner(); } catch(e){}
  try { if (typeof updateStreakBadge === 'function') updateStreakBadge(); } catch(e){}

  setTimeout(() => {
    try {
      if (S.agents) S.agents.forEach(a => { if (!a.fitnessHistory) a.fitnessHistory = [a.fitness, a.fitness]; });
      if (typeof renderAgentHeatmap === 'function') renderAgentHeatmap();
      if (typeof renderCorrMatrix === 'function') renderCorrMatrix();
    } catch(e){}
  }, 150);

  try {
    window.addEventListener('resize', () => {
      try { if (typeof drawSparkline === 'function') drawSparkline(); } catch(e){}
      try { if (typeof drawMobileChart === 'function') drawMobileChart(); } catch(e){}
      try { window._corrLastTick = -1; if (typeof renderCorrMatrix === 'function') renderCorrMatrix(); } catch(e){}
    });
  } catch(e){}

  // ── Final render garanti avec wallet cards ──
  setTimeout(() => {
    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
    try { _renderWalletCards(); } catch(e){}
  }, 500);

  _showInitDebug(
    'init OK · #' + (S && S.cycle) +
    ' · portfolio=' + (S && S.portfolio ? S.portfolio.toFixed(2) : '?') +
    ' · sections: ' + sections.join(' '),
    '#0a4d2a'
  );
}
window.init = init;
