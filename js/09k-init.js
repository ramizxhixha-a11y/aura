// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09k-init.js · VERSION 122 · 01/06/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Init — démarrage de l'application.
// v121.1 — Fix affichage wallet cards ($0) + fix modale transfert clavier
// v122   — Suppression bannière debug visuelle (à reprendre par Guardian v2)
// ════════════════════════════════════════════════════════════════════════

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

    // Réserve anti-négatif (carte home)
    setEl('antiNegReserveVal', '$' + (S.antiNegReserve || 0).toFixed(2));
    const anSub = document.getElementById('antiNegReserveSub');
    if (anSub) {
      const _cov = (S.openPositions||[]).filter(p => p._reservedAmount > 0).length;
      anSub.textContent = _cov + ' trade' + (_cov > 1 ? 's' : '') + ' couvert' + (_cov > 1 ? 's' : '');
    }

    // Régime fiscal appliqué (carte home) — taux réel via detectFiscalRegime
    if (typeof detectFiscalRegime === 'function') {
      const _fr = detectFiscalRegime();
      const frVal = document.getElementById('fiscalRegimeVal');
      const frSub = document.getElementById('fiscalRegimeSub');
      const _pct = (_fr.rate * 100).toFixed(_fr.rate*100 % 1 === 0 ? 0 : 1) + '%';
      if (frVal) {
        frVal.textContent = _pct;
        frVal.style.color = _fr.isSpec ? 'var(--down)' : 'var(--up)';
      }
      if (frSub) frSub.textContent = (_fr.isSpec ? '⚠ Spéculatif · ' : '✓ Normal · ') + _fr.reason;
    }

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
  try {
    const vd = document.getElementById('versionDisplay');
    if (vd && typeof S !== 'undefined') vd.textContent = 'v' + (S.vMajor || 7) + '.' + (S.vMinor || '?');
    if (typeof updateModeButton === 'function') updateModeButton();
  } catch (e) {}

  let restored = false;
  try {
    restored = await loadState();
  } catch (e) {}

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
  } catch (e) {}

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
  } catch (e) {}

  try { if (typeof renderAll === 'function') renderAll(); } catch(e) {}

  // ── Fix wallet cards directement ──
  try { _renderWalletCards(); } catch(e) {}

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
}
window.init = init;


// ════════════════════════════════════════════════════════════════════════
// _bootApp() — démarrage de l'application au chargement du script
// ════════════════════════════════════════════════════════════════════════
// Remplace l'ancien appel à init() qui était dans 00b-persistance-override.js
// (supprimé du HTML le 24/05). Sans cet IIFE, init() n'est jamais appelée
// et S reste aux valeurs par défaut → cycle 42, portfolio 0.
// ════════════════════════════════════════════════════════════════════════
(function _bootApp() {
  function start() {
    try {
      if (typeof window.init === 'function') {
        window.init().catch(e => console.error('[bootApp] init() failed:', e));
      } else {
        console.error('[bootApp] window.init not defined');
      }
    } catch (e) {
      console.error('[bootApp] start() exception:', e);
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(start, 0);
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
