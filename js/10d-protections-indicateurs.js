// ▓▓▓ VERSION 20260809k ▓▓▓
// 10d-protections-indicateurs.js — Hedging, reversals, TP adaptatif, indicateurs, Sharpe, force-close, sparkline, cooldown adaptatif
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 703-1151 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.


function _checkHedgingTrigger() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.hedgingEnabled) return;
  if (S.tradingMode !== 'paperReal') return;
  
  if (S.adaptiveState && S.adaptiveState.hedgeActive) {
    const hedgeId = S.adaptiveState.hedgePositionId;
    const exists = (S.openPositions || []).some(p => p.id === hedgeId);
    if (!exists) {
      S.adaptiveState.hedgeActive = false;
      S.adaptiveState.hedgePositionId = null;
    }
    return;
  }
  
  const stress = _detectSystemicBearStress();
  const triggerStreak = cfg.hedgingTriggerBearStreak || 3;
  
  if (stress.streak >= triggerStreak) {
    const candidate = _findMostVolatilePair();
    if (!candidate) return;
    
    const totalCapital = S.b || 0;
    const hedgeStake = Math.max(10, totalCapital * (cfg.hedgingMaxAllocPct || 2.0) / 100);
    
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.lastHedgeAction = {
      ts: Date.now(),
      action: 'trigger',
      candidate: candidate,
      stake: +hedgeStake.toFixed(2),
      reason: 'BEAR streak ' + stress.streak,
      regime: stress.regime
    };
    
    try {
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({
        icon: '🛡️',
        desc: 'Hedge défensif suggéré · ' + candidate + ' SHORT · stake $' + hedgeStake.toFixed(2) + ' · ' + stress.streak + ' bougies BEAR',
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
    
    try {
      if (typeof showToast === 'function') {
        showToast('🛡️ Hedge suggéré sur ' + candidate.split('/')[0] + ' SHORT', 5000, 'warn');
      }
    } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  }
}
window._checkHedgingTrigger = _checkHedgingTrigger;
if(typeof _checkHedgingTrigger==='function') window._checkHedgingTrigger = _checkHedgingTrigger;

function _checkReversalsAndClose() {
  if (S.tradingMode !== 'paperReal' || !S.openPositions) return;
  const cfg = S.paperRealConfig || {};
  if (!cfg.reversalDetectionEnabled) return;
  const minProfit = cfg.reversalEarlyCloseProfit || 0.5;
  
  S.openPositions.forEach(pos => {
    if (!pos.auto || !pos._paperRealMode) return;
    if (!pos.pair) return;
    const ps = S.pairStates ? S.pairStates[pos.pair] : null;
    if (!ps || !isFinite(ps.price)) return;
    const isLong = pos.side === 'long';
    const pnlPct = isLong 
      ? ((ps.price - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - ps.price) / pos.entryPrice) * 100;
    if (pnlPct < minProfit) return;
    const reversal = _detectReversal(pos.pair, pos.side);
    if (!reversal || !reversal.reversalDetected) return;
    if (reversal.confidence !== 'high' && pnlPct < 1.0) return;
    try {
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastReversalDetection = {
        pair: pos.pair,
        type: reversal.type,
        confidence: reversal.confidence,
        action: 'early_close',
        pnlPct: +pnlPct.toFixed(2),
        ts: Date.now()
      };
      S.adaptiveState.reversalEarlyCloses = (S.adaptiveState.reversalEarlyCloses || 0) + 1;
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({
        icon: '🔮',
        desc: 'Retournement détecté · ' + pos.pair + ' · fermeture préventive (+' + pnlPct.toFixed(2) + '%)',
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') {
        showToast('🔮 ' + pos.pair + ' fermé · retournement détecté (+' + pnlPct.toFixed(2) + '%)', 4000, 'win');
      }
      if (typeof closePosition === 'function') {
        closePosition(pos.id, true);
      }
    } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  });
}
window._checkReversalsAndClose = _checkReversalsAndClose;
if(typeof _checkReversalsAndClose==='function') window._checkReversalsAndClose = _checkReversalsAndClose;

function _computeAdaptiveTP(pair, entryPrice, isLong) {
  const cfg = S.paperRealConfig || {};
  const tpMult = cfg.tpAtrMultiplier || 1.5;
  let tpPrice = null;
  if (typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    if (profile && profile.slAbsoluteAtr && profile.slAbsoluteAtr > 0) {
      const tpDistance = tpMult * profile.slAbsoluteAtr;
      tpPrice = isLong ? entryPrice + tpDistance : entryPrice - tpDistance;
      if (!S.adaptiveState) S.adaptiveState = {};
      S.adaptiveState.lastTpUsed = 'ATR×' + tpMult;
      return tpPrice;
    }
  }
  const tpPct = cfg.takeProfitPct || 2.0;
  tpPrice = isLong ? entryPrice * (1 + tpPct/100) : entryPrice * (1 - tpPct/100);
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastTpUsed = 'pct ' + tpPct + '%';
  return tpPrice;
}
window._computeAdaptiveTP = _computeAdaptiveTP;
if(typeof _computeAdaptiveTP==='function') window._computeAdaptiveTP = _computeAdaptiveTP;

function _computeIndicatorsForContext(pair) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return {};
  
  const result = {};
  
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 14) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 14) {
    candles = ps.candles;
  }
  
  if (!candles || candles.length < 14) {
    return { lastClose: ps.price || 0 };
  }
  
  const closes = candles.slice(-30).map(c => c.c).filter(c => isFinite(c) && c > 0);
  
  if (closes.length >= 15) {
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i-1];
      if (diff >= 0) gains += diff;
      else losses += -diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) result.rsi = 100;
    else {
      const rs = avgGain / avgLoss;
      result.rsi = Math.round(100 - (100 / (1 + rs)));
    }
  }
  
  if (closes.length >= 26) {
    function ema(values, period) {
      const k = 2 / (period + 1);
      let e = values[0];
      for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
      return e;
    }
    const ema12 = ema(closes.slice(-26), 12);
    const ema26 = ema(closes.slice(-26), 26);
    result.macd = +(ema12 - ema26).toFixed(4);
  }
  
  if (closes.length >= 4) {
    const recentMove = ((closes[closes.length - 1] - closes[closes.length - 4]) / closes[closes.length - 4]) * 100;
    result.recentMove3 = +recentMove.toFixed(2);
  }
  
  if (closes.length >= 20) {
    const last20 = closes.slice(-20);
    const min20 = Math.min(...last20);
    const max20 = Math.max(...last20);
    if (max20 > min20) {
      result.rangePos = +((closes[closes.length - 1] - min20) / (max20 - min20)).toFixed(2);
    }
  }
  
  result.lastClose = closes[closes.length - 1];
  return result;
}
window._computeIndicatorsForContext = _computeIndicatorsForContext;
if(typeof _computeIndicatorsForContext==='function') window._computeIndicatorsForContext = _computeIndicatorsForContext;

function _computePairSharpe(pair) {
  if (!S.tradeContextMemory) return null;
  const trades = S.tradeContextMemory.filter(c => c.pair === pair && c.closedAt !== null && typeof c.pnlPct === 'number');
  if (trades.length < 5) return null;
  const returns = trades.map(t => t.pnlPct);
  const mean = returns.reduce((a,b) => a+b, 0) / returns.length;
  const variance = returns.reduce((a,b) => a + (b - mean) ** 2, 0) / returns.length;
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return null;
  return +(mean / stdev).toFixed(3);
}
window._computePairSharpe = _computePairSharpe;
if(typeof _computePairSharpe==='function') window._computePairSharpe = _computePairSharpe;

function _computeRSI14(candles) {
  if (!candles || candles.length < 15) return null;
  const cl = candles.slice(-15).map(c => c.c).filter(v => typeof v === 'number');
  if (cl.length < 15) return null;
  let g = 0, l = 0;
  for (let i = 1; i < cl.length; i++) {
    const d = cl[i] - cl[i-1];
    if (d > 0) g += d; else l -= d;
  }
  const ag = g / 14, al = l / 14;
  return al ? 100 - (100 / (1 + ag / al)) : 100;
}
if(typeof _computeRSI14==='function') window._computeRSI14 = _computeRSI14;

function _computeSharpeAllocations() {
  const now = Date.now();
  if (S.adaptiveState && S.adaptiveState.sharpeAllocTs && (now - S.adaptiveState.sharpeAllocTs) < 10*60*1000) {
    return S.adaptiveState.sharpeAllocations || {};
  }
  
  const cfg = S.paperRealConfig || {};
  if (!cfg.sharpeAllocationEnabled) return {};
  
  const maxBoost = cfg.sharpeAllocationMaxBoost || 1.5;
  const minReduce = cfg.sharpeAllocationMinReduce || 0.4;
  
  const sharpeByPair = {};
  const allPairs = Object.keys(PAIRS || {});
  allPairs.forEach(p => {
    const s = _computePairSharpe(p);
    if (s !== null) sharpeByPair[p] = s;
  });
  
  const validSharpes = Object.values(sharpeByPair);
  if (validSharpes.length < 2) {
    if (!S.adaptiveState) S.adaptiveState = {};
    S.adaptiveState.sharpeByPair = sharpeByPair;
    S.adaptiveState.sharpeAllocations = {};
    S.adaptiveState.sharpeAllocTs = now;
    return {};
  }
  
  const minS = Math.min(...validSharpes);
  const maxS = Math.max(...validSharpes);
  const allocations = {};
  Object.keys(sharpeByPair).forEach(p => {
    const s = sharpeByPair[p];
    if (maxS === minS) {
      allocations[p] = 1.0;
    } else {
      const normalized = (s - minS) / (maxS - minS);
      allocations[p] = minReduce + normalized * (maxBoost - minReduce);
      allocations[p] = +allocations[p].toFixed(3);
    }
  });
  
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.sharpeByPair = sharpeByPair;
  S.adaptiveState.sharpeAllocations = allocations;
  S.adaptiveState.sharpeAllocTs = now;
  return allocations;
}
window._computeSharpeAllocations = _computeSharpeAllocations;
if(typeof _computeSharpeAllocations==='function') window._computeSharpeAllocations = _computeSharpeAllocations;

function _confirmForceClose() {
  if (!_pendingClosePair) return;
  const pair = _pendingClosePair;
  const pos = (S.openPositions || []).find(p => p.pair === pair);
  if (pos && typeof closePosition === 'function') {
    try {
      closePosition(pos.id, false);
      S.chainLog.push({
        icon: '✕',
        desc: `Position ${pair} ${pos.side.toUpperCase()} fermée manuellement · forcée utilisateur`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') {
        showToast('✕ ' + pair + ' ' + pos.side.toUpperCase() + ' fermée', 2500);
      }
    } catch(e) { console.warn('force close:', e); }
  }
  _cancelForceClose();
}
window._confirmForceClose = _confirmForceClose;
if(typeof _confirmForceClose==='function') window._confirmForceClose = _confirmForceClose;

function _detectReversal(pair, side) {
  const ps = (S.pairStates && S.pairStates[pair]) || null;
  if (!ps) return null;
  
  let candles = null;
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= 20) {
    candles = S.realCandles[pair][tf];
  } else if (ps.candles && ps.candles.length >= 20) {
    candles = ps.candles;
  }
  if (!candles || candles.length < 20) return null;
  
  const recent = candles.slice(-15);
  const closes = recent.map(c => c.c).filter(c => isFinite(c) && c > 0);
  const volumes = recent.map(c => c.v || 0).filter(v => isFinite(v) && v >= 0);
  if (closes.length < 14) return null;
  
  function rsi14(arr) {
    if (arr.length < 15) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - 14; i < arr.length; i++) {
      const diff = arr[i] - arr[i-1];
      if (diff >= 0) gains += diff;
      else losses += -diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  const rsiNow = rsi14(closes);
  const rsiBefore = rsi14(closes.slice(0, -7));
  if (rsiNow === null || rsiBefore === null) return null;
  
  const priceNow = closes[closes.length - 1];
  const priceBefore = closes[closes.length - 8] || closes[closes.length - 1];
  if (!isFinite(priceNow) || !isFinite(priceBefore)) return null;
  
  const cfg = S.paperRealConfig || {};
  const divThresh = cfg.reversalRsiDivergenceThreshold || 8;
  
  if (side === 'long' && priceNow > priceBefore && rsiBefore - rsiNow > divThresh) {
    let volConfirm = false;
    if (volumes.length >= 14) {
      const vNow = volumes.slice(-3).reduce((a,b)=>a+b,0) / 3;
      const vBefore = volumes.slice(0, -3).reduce((a,b)=>a+b,0) / Math.max(1, volumes.length - 3);
      if (vBefore > 0 && vNow < vBefore * 0.7) volConfirm = true;
    }
    return { reversalDetected: true, type: 'bearish_divergence', confidence: volConfirm ? 'high' : 'medium', rsiNow: Math.round(rsiNow), rsiBefore: Math.round(rsiBefore), volConfirm: volConfirm };
  }
  
  if (side === 'short' && priceNow < priceBefore && rsiNow - rsiBefore > divThresh) {
    let volConfirm = false;
    if (volumes.length >= 14) {
      const vNow = volumes.slice(-3).reduce((a,b)=>a+b,0) / 3;
      const vBefore = volumes.slice(0, -3).reduce((a,b)=>a+b,0) / Math.max(1, volumes.length - 3);
      if (vBefore > 0 && vNow < vBefore * 0.7) volConfirm = true;
    }
    return { reversalDetected: true, type: 'bullish_divergence', confidence: volConfirm ? 'high' : 'medium', rsiNow: Math.round(rsiNow), rsiBefore: Math.round(rsiBefore), volConfirm: volConfirm };
  }
  
  return { reversalDetected: false };
}
window._detectReversal = _detectReversal;
if(typeof _detectReversal==='function') window._detectReversal = _detectReversal;

function _drawSparkline(canvasId, candles, color, positive) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !candles || candles.length < 2) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  
  const closes = candles.slice(-20).map(c => c.c).filter(v => typeof v === 'number');
  if (closes.length < 2) return;
  
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  closes.forEach((c, i) => {
    const x = (i / (closes.length - 1)) * w;
    const y = h - ((c - min) / range) * (h - 2) - 1;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.globalAlpha = 1;
}
if(typeof _drawSparkline==='function') window._drawSparkline = _drawSparkline;

function _ensurePulseCSS() {
  if (document.getElementById('nexus-pulse-css')) return;
  const style = document.createElement('style');
  style.id = 'nexus-pulse-css';
  style.textContent = `
    @keyframes nexusSavePulse {
      0%   { box-shadow: 0 0 0 0 rgba(167,139,250,0.7); border-color: rgba(167,139,250,.35); }
      50%  { box-shadow: 0 0 0 8px rgba(167,139,250,0); border-color: rgba(167,139,250,.9); }
      100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); border-color: rgba(167,139,250,.35); }
    }
    .nexus-save-pulse { animation: nexusSavePulse 1s ease-out 2; }
  `;
  document.head.appendChild(style);
}
if(typeof _ensurePulseCSS==='function') window._ensurePulseCSS = _ensurePulseCSS;

function _getAdaptiveCooldownMs() {
  const cfg = S.paperRealConfig || {};
  if (!cfg.adaptiveCooldown) return cfg.cooldownMs || 30*60*1000;
  let median = null;
  if (typeof _getMarketVolatilityMedian === 'function') {
    median = _getMarketVolatilityMedian();
  }
  if (median === null || !isFinite(median)) return cfg.cooldownMs || 30*60*1000;
  let multiplier;
  if (median < 1.0)      multiplier = 0.5;
  else if (median < 2.0) multiplier = 0.75;
  else if (median < 3.0) multiplier = 1.0;
  else if (median < 4.5) multiplier = 1.5;
  else if (median < 6.0) multiplier = 2.0;
  else                   multiplier = 3.0;
  const baseMs = 30 * 60 * 1000;
  let ms = baseMs * multiplier;
  ms = Math.max(15*60*1000, Math.min(90*60*1000, ms));
  if (!S.adaptiveState) S.adaptiveState = {};
  S.adaptiveState.lastCooldownMs = ms;
  S.adaptiveState.lastMarketVolatility = median;
  return ms;
}
window._getAdaptiveCooldownMs = _getAdaptiveCooldownMs;
if(typeof _getAdaptiveCooldownMs==='function') window._getAdaptiveCooldownMs = _getAdaptiveCooldownMs;