// ▓▓▓ VERSION 20260809k ▓▓▓
// 10g-resolveur-ev-csv.js — Résolveur EV (_resolvePaperRealCycle), consignes MAN, force-close UI, indicateur réseau, profit split, exports CSV, modales, disable FP
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 2004-2316 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.


function _resolvePaperRealCycle(pair, ps) {
  if (!(S.paperRealActivePairs && S.paperRealActivePairs[pair])) return;

  const now = Date.now();
  if (S.paperRealGlobalPauseUntil && now < S.paperRealGlobalPauseUntil) return;

  const ks = (S.paperRealKillSwitch && S.paperRealKillSwitch[pair]) || null;
  if (ks && ks.paused) return;

  const cfg = S.paperRealConfig || {};
  let cooldownMs;
  if (typeof _getAdaptiveCooldownMs === 'function') {
    cooldownMs = _getAdaptiveCooldownMs();
  } else {
    cooldownMs = cfg.cooldownMs || 30 * 60 * 1000;
  }
  // [PLEIN RÉGIME · 08/08/2026] FP PLAFONNE le cooldown à 15 min (30 min nominal, adaptatif
  // inclus) : plus d'opportunités par heure. Math.min : FP ne rallonge jamais un cooldown
  // adaptatif déjà court. Toutes les autres portes (movePct, fraîcheur, maxConcurrentPos,
  // killswitch, pause globale) restent INTOUCHÉES.
  if (S.fullPowerMode === true) cooldownMs = Math.min(cooldownMs, 15 * 60 * 1000);
  const lastClose = (S.paperRealLastClose || {})[pair] || 0;
  if (lastClose > 0 && (now - lastClose) < cooldownMs) return;

  const tf = S.paperRealTimeframe || '15m';
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];
  if (arr.length < 30) return;

  if (arr.length < 2) return;
  const closedTs = arr[arr.length - 2].ts;
  const lastSeenTs = (S.realPairCycle && S.realPairCycle[pair]) || 0;
  if (closedTs <= lastSeenTs) return;
  if (!S.realPairCycle) S.realPairCycle = {};
  S.realPairCycle[pair] = closedTs;

  const tfMs = { '5m':300000, '15m':900000, '1h':3600000, '4h':14400000, '1j':86400000 }[tf] || 900000;
  const dataAge = now - arr[arr.length - 1].ts;
  const stalenessThreshold = Math.max(tfMs * 2.5, 120000);
  if (dataAge > stalenessThreshold) {
    if (typeof _fetchAndBootstrapRealCandles === 'function') {
      _fetchAndBootstrapRealCandles(pair, tf);
    }
    return;
  }

  const lastCandle = arr[arr.length - 1];
  if (lastCandle && isFinite(lastCandle.o) && lastCandle.o > 0) {
    const movePct = Math.abs(lastCandle.c - lastCandle.o) / lastCandle.o * 100;
    const maxMove = cfg.maxRecentMovePct || 3.0;
    if (movePct > maxMove) return;
  }

  // [ÉTAGE 1 · 09/08/2026] RE verrouillé à 1 position EN DUR — le passage à 3 slots ne
  // concerne que AA/EV jusqu'à validation sur données (décision Rams : « garde à l'œil »).
  const maxConcurrent = (S.tradingMode === 'real') ? 1 : (cfg.maxConcurrentPos || 1);
  const openPositions = (S.openPositions || []).filter(p => p.auto === true);
  if (openPositions.length >= maxConcurrent) return;

  const _regime = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : 'calm';
  S._paperRealCurrentRegime = _regime;

  return _resolvePairCycleCore(pair, ps);
}
window._resolvePaperRealCycle = _resolvePaperRealCycle;
if(typeof _resolvePaperRealCycle==='function') window._resolvePaperRealCycle = _resolvePaperRealCycle;

function _saveManConsigne(pair, field, value) {
  if (!S._manConsignes) S._manConsignes = {};
  if (!S._manConsignes[pair]) S._manConsignes[pair] = { maxLossPct: 2.0, timeoutMin: 60 };
  const n = parseFloat(value);
  if (!isNaN(n) && n > 0) { S._manConsignes[pair][field] = n; }
}
window._saveManConsigne = _saveManConsigne;
if(typeof _saveManConsigne==='function') window._saveManConsigne = _saveManConsigne;

function _showForceCloseConfirm(pair) {
  const pos = (S.openPositions || []).find(p => p.pair === pair);
  if (!pos) return;
  
  _pendingClosePair = pair;
  
  const title = document.getElementById('closeConfirmTitle');
  const body = document.getElementById('closeConfirmBody');
  const overlay = document.getElementById('closeConfirmOverlay');
  
  if (title) {
    const sideLabel = pos.side === 'long' ? 'LONG' : 'SHORT';
    const sideCol = pos.side === 'long' ? 'var(--up)' : 'var(--down)';
    title.innerHTML = `Fermer <span style="color:${sideCol};">${sideLabel}</span> ${pair} ?`;
  }
  if (body) {
    const pnlUsd = pos.pnlUsdt || 0;
    const pnlPct = pos.pnl || 0;
    const pnlCol = pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const sign = pnlUsd >= 0 ? '+' : '';
    body.innerHTML = `
      Mise: <strong style="color:var(--t1);">$${(pos.stakeUsdt || 0).toFixed(0)}</strong><br>
      P&L actuel: <strong style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)} (${sign}${pnlPct.toFixed(2)}%)</strong><br>
      <span style="color:var(--t3);font-size:10px;">Action immédiate, non annulable.</span>
    `;
  }
  if (overlay) overlay.classList.add('open');
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(20); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  }
}
window._showForceCloseConfirm = _showForceCloseConfirm;
if(typeof _showForceCloseConfirm==='function') window._showForceCloseConfirm = _showForceCloseConfirm;

function _takeControl(pair) {
  if (!S._manualPairs) S._manualPairs = {};
  S._manualPairs[pair] = true;
  S.chainLog.push({ icon: '🎛️', desc: `Prise de contrôle manuel · ${pair} · bot désactivé sur cette paire`, hash: rndHash(), time: nowStr() });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  if (typeof showToast === 'function') { showToast('🎛️ Contrôle manuel · ' + pair, 2500); }
  if (_currentDetailPair === pair) { closePairDetail(); setTimeout(() => openPairDetail(pair), 100); }
}
window._takeControl = _takeControl;
if(typeof _takeControl==='function') window._takeControl = _takeControl;

function _updateBotPauseBadge(isOffline) {
  let badge = document.getElementById('botPauseBadge');
  if (!badge) {
    const portTotal = document.getElementById('qPortfolio') || document.querySelector('[id^="qPortfolio"]') || document.querySelector('.portfolio-total');
    if (portTotal) {
      const parent = portTotal.closest('.portfolio-card') || portTotal.parentElement;
      if (parent) {
        badge = document.createElement('div');
        badge.id = 'botPauseBadge';
        badge.style.cssText = 'display:none;background:rgba(255,61,107,.15);border:1px solid rgba(255,61,107,.5);border-radius:10px;padding:10px 14px;margin:10px 0;font-size:12px;font-weight:700;color:var(--down);text-align:center;letter-spacing:.05em;font-family:var(--font-mono);';
        badge.innerHTML = '⏸ BOT EN PAUSE · connexion instable';
        parent.insertBefore(badge, portTotal.nextSibling);
      }
    }
  }
  if (!badge) return;
  badge.style.display = isOffline ? 'block' : 'none';
}
if(typeof _updateBotPauseBadge==='function') window._updateBotPauseBadge = _updateBotPauseBadge;

function _updateNetIndicator() {
  const green  = document.getElementById('netDotGreen');
  const orange = document.getElementById('netDotOrange');
  const red    = document.getElementById('netDotRed');
  if (!green || !orange || !red) return;
  
  const elapsed = Date.now() - _lastRealPriceTs;
  let effectiveState = _netwatchState;
  if (_netwatchState === 'offline' && elapsed < _getNetwatchThreshold() * 2) {
    effectiveState = 'unstable';
  }
  
  const dimGreen  = 'rgba(0,232,122,.20)';
  const dimOrange = 'rgba(245,166,35,.18)';
  const dimRed    = 'rgba(255,61,107,.18)';
  
  if (effectiveState === 'online') {
    green.style.background  = 'var(--up)';
    green.style.boxShadow   = '0 0 6px rgba(0,232,122,.7)';
    orange.style.background = dimOrange;
    orange.style.boxShadow  = 'none';
    red.style.background    = dimRed;
    red.style.boxShadow     = 'none';
    document.getElementById('netDots').title = 'Connexion OK';
  } else if (effectiveState === 'unstable') {
    green.style.background  = dimGreen;
    green.style.boxShadow   = 'none';
    orange.style.background = '#f5a623';
    orange.style.boxShadow  = '0 0 6px rgba(245,166,35,.7)';
    red.style.background    = dimRed;
    red.style.boxShadow     = 'none';
    document.getElementById('netDots').title = 'Connexion instable';
  } else {
    green.style.background  = dimGreen;
    green.style.boxShadow   = 'none';
    orange.style.background = dimOrange;
    orange.style.boxShadow  = 'none';
    red.style.background    = 'var(--down)';
    red.style.boxShadow     = '0 0 8px rgba(255,61,107,.8)';
    document.getElementById('netDots').title = 'Connexion coupée · bot en pause';
  }
  
  _updateBotPauseBadge(effectiveState === 'offline');
}
if(typeof _updateNetIndicator==='function') window._updateNetIndicator = _updateNetIndicator;

// v123 · Répartition bénéfices déplacée dans le Portefeuille (boutons ± type levier)
function changeProfitSplit(delta) {
  const cur = (typeof S.profitSplitCaissePct === 'number' ? S.profitSplitCaissePct : 30);
  let n = cur + (delta || 0);
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  S.profitSplitCaissePct = n;
  _syncSplitDisp();
  try { if (typeof saveState === 'function') saveState(true); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
}
function _syncSplitDisp() {
  const n = (typeof S.profitSplitCaissePct === 'number' ? S.profitSplitCaissePct : 30);
  const d = document.getElementById('splitDisp'); if (d) d.textContent = n + '%';
  const s = document.getElementById('splitSub');  if (s) s.textContent = 'Trading ' + (100 - n) + '%';
}
window.changeProfitSplit = changeProfitSplit;
window._syncSplitDisp = _syncSplitDisp;

function buildFeeLogCSV() {
  const log = S.fees.feeLog;
  if(!log.length) return 'Aucun frais enregistré';
  const h = ['Date','Paire','Notionnel $','Frais Exchange','Slippage','Total Frais','Provision Impôt','P&L Brut','P&L Net','Région'];
  const rows = log.map(e => [
    e.time, e.pair,
    parseFloat(e.notional||0).toFixed(2),
    parseFloat(e.tradingFee||0).toFixed(4),
    parseFloat(e.slipFee||0).toFixed(4),
    parseFloat(e.totalFee||0).toFixed(4),
    parseFloat(e.taxAmount||0).toFixed(4),
    parseFloat(e.pnlGross||0).toFixed(2),
    parseFloat(e.pnlNet||0).toFixed(2),
    e.region || S.taxConfig.region
  ]);
  return [h, ...rows].map(r => r.join(',')).join('\n');
}
if(typeof buildFeeLogCSV==='function') window.buildFeeLogCSV = buildFeeLogCSV;

function buildSummaryCSV() {
  const f   = S.fees;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const tax = calcTaxProvision();
  const lines = [
    ['=== RÉSUMÉ FISCAL NEXUS ==='],
    ['Région', reg ? reg.label : S.taxConfig.region],
    ['Méthode', reg ? reg.method : ''],
    ['Taux effectif', reg ? (reg.rate*100*reg.inclusion).toFixed(1)+'%' : ''],
    [''],
    ['=== TOTAUX SESSION ==='],
    ['Trades total', f.tradeCount],
    ['P&L Brut total', f.totalPnlGross.toFixed(2)+'$'],
    ['Frais Exchange',  '-$'+f.totalTradingFees.toFixed(4)],
    ['Slippage total',  '-$'+f.totalSlippage.toFixed(4)],
    ['Funding total',   '-$'+f.totalFunding.toFixed(4)],
    ['Total Frais',     '-$'+f.totalGross.toFixed(4)],
    ['Provision Impôt', '-$'+tax.toFixed(4)],
    ['P&L Net',         f.totalPnlNet.toFixed(2)+'$'],
    ['Réserve Fiscale', '$'+(S.fiscalReserveAccount||0).toFixed(2)],
    [''],
    ['=== PAR PAIRE ==='],
    ['Paire','Trades','P&L Brut','Frais','Impôt','P&L Net'],
    ...Object.entries(f.byPair).map(([p,bp])=>[
      p, bp.trades,
      bp.pnlGross.toFixed(2)+'$',
      '-$'+bp.gross.toFixed(4),
      '-$'+bp.tax.toFixed(4),
      bp.pnlNet.toFixed(2)+'$'
    ])
  ];
  return lines.map(r => Array.isArray(r) ? r.join(',') : r).join('\n');
}
if(typeof buildSummaryCSV==='function') window.buildSummaryCSV = buildSummaryCSV;

function buildTradeCSV(trades) {
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const headers = [
    'Date','Paire','Côté','Mise USDT','Montant','Prix Entrée','Prix Sortie',
    'P&L Brut $','P&L Brut %','Frais Exchange $','Slippage $','Funding $',
    'Total Frais $','Base Imposable $','Provision Impôt $','P&L Net $',
    'Région','Méthode Fiscale','Cycle'
  ];
  const rows = trades.map(t => [
    t.time || '', t.pair || '', t.side || '',
    (t.stakeUsdt || 0).toFixed(2), (t.amount || 0),
    (t.entryPrice || t.price || 0).toFixed ? (t.entryPrice||t.price||0).toFixed(4) : '',
    (t.exitPrice || 0).toFixed ? (t.exitPrice||0).toFixed(4) : '',
    (t.pnlUsd || 0).toFixed(2), (t.pnl || 0).toFixed(3),
    (t.tradingFee || 0).toFixed(4), (t.slipFee || 0).toFixed(4), (t.fundingFee || 0).toFixed(4),
    (t.totalFee || 0).toFixed(4), (t.taxBase || 0).toFixed(4), (t.taxAmount || 0).toFixed(4),
    (t.pnlNet || 0).toFixed(2), t.region || S.taxConfig.region,
    reg ? reg.method : '', (t.cycle || S.cycle)
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}
if(typeof buildTradeCSV==='function') window.buildTradeCSV = buildTradeCSV;

function closeDiagnostic() {
  const overlay = document.getElementById('diagOverlay');
  if (overlay) overlay.classList.remove('open');
}
window.closeDiagnostic = closeDiagnostic;
if(typeof closeDiagnostic==='function') window.closeDiagnostic = closeDiagnostic;

function closeWhyModal() {
  const overlay = document.getElementById('whyOverlay');
  if(overlay) overlay.classList.remove('open');
}
window.closeWhyModal = closeWhyModal;
if(typeof closeWhyModal==='function') window.closeWhyModal = closeWhyModal;

function disableFullPowerMode() {
  if (!S) return;
  S.fullPowerMode = false;
  S.fullPowerSince = 0;
  if (typeof showToast === 'function') showToast('Régime standard restauré', 'ice');
}
window.disableFullPowerMode = disableFullPowerMode;
if(typeof disableFullPowerMode==='function') window.disableFullPowerMode = disableFullPowerMode;

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
if(typeof downloadFile==='function') window.downloadFile = downloadFile;