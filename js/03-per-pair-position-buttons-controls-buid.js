// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 03/10
// Contient : per-pair-position-buttons-controls-build-o, memoire-episodique-metaphores-feature-1, 5-lead-lag-inter-pair-correlations, bot-fleet-archives, v8-0-livraison-32-systeme-de-backup-import
// ════════════════════════════════════════════════════════════
// ============================================================
// PER-PAIR POSITION BUTTONS + CONTROLS (build once, hold-to-scroll)
// ============================================================
let _holdTimers = {}; // pair+dir → { interval, timeout }
let _scrollGuard = false;
let _scrollGuardTimer = null;
let _pointerMoved = false;

// Detect scroll gestures to prevent accidental button triggers
document.addEventListener('touchmove', () => {
  _pointerMoved = true;
  _scrollGuard = true;
  clearTimeout(_scrollGuardTimer);
  _scrollGuardTimer = setTimeout(() => { _scrollGuard = false; _pointerMoved = false; }, 300);
}, { passive: true });

function _startHold(pair, field, dir) {
  if(_scrollGuard || _pointerMoved) return;  // ignore if user is scrolling
  _stopHold(pair, field);
  const key = pair+'_'+field+'_'+dir;
  // Debounce: wait 160ms before first action — gives time to detect scroll
  _holdTimers[key] = { timeout: setTimeout(() => {
    if(_scrollGuard) return;  // abort if scroll detected during debounce
    if(field === 'stake') changePairStake(pair, dir);
    else if(field === 'lev') changePairLev(pair, dir);
    else changePairCycle(pair, Math.sign(dir));
    // Accelerate after first action
    let speed = 250;
    const accel = () => {
      if(_scrollGuard) return;
      if(field === 'stake') changePairStake(pair, dir * 3);
      else if(field === 'lev') changePairLev(pair, dir);
      else changePairCycle(pair, Math.sign(dir));
      speed = Math.max(100, speed - 25);
      _holdTimers[key] = { timeout: setTimeout(accel, speed) };
    };
    _holdTimers[key] = { timeout: setTimeout(accel, 500) };
  }, 160) };
}

function _stopHold(pair, field, dir) {
  _pointerMoved = false;
  const key = pair+'_'+field+'_'+(dir||'up');
  const key2= pair+'_'+field+'_'+(dir||-1);
  [key, key2, pair+'_'+field+'_1', pair+'_'+field+'_-1'].forEach(k => {
    if(_holdTimers[k]) { clearTimeout(_holdTimers[k].timeout); delete _holdTimers[k]; }
  });
}

// Legacy alias — now delegates to _makePosBtn
function makePairBtn(pair, field, dir, label) {
  return _makePosBtn(pair, field, dir, label);
}

function buildPairPosButtons() {
  const wrap = document.getElementById('pairPosButtons');
  if(!wrap) return;
  wrap.innerHTML = '';   // always rebuild fresh (supports pair price updates)

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const ps      = S.pairStates[pair];
    const row     = document.createElement('div');
    row.className = 'pair-ctrl-row';
    row.id        = 'pcrow_'+pairKey;

    // ── Header: paire + prix + 24h change ────────────────────
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
    hdr.innerHTML = `
      <div>
        <span class="pair-ctrl-label" style="color:${cfg.color}">${pair}</span>
        <span id="ppos_px_${pairKey}" style="font-size:9px;color:var(--t3);margin-left:6px;">—</span>
      </div>
      <span id="ppos_chg_${pairKey}" style="font-size:9px;font-weight:600;"></span>`;
    row.appendChild(hdr);

    // ── Analyse synthétique (AT + AF) ─────────────────────────
    const analysisDiv = document.createElement('div');
    analysisDiv.id    = 'panalysis_'+pairKey;
    analysisDiv.style.cssText = 'margin-bottom:6px;';
    row.appendChild(analysisDiv);

    // ── Proposition d'entrée pré-remplie ─────────────────────
    const proposalDiv = document.createElement('div');
    proposalDiv.id    = 'pproposal_'+pairKey;
    proposalDiv.style.cssText = 'margin-bottom:8px;';
    row.appendChild(proposalDiv);

    // ── Contrôles LONG / LEVIER / SHORT ──────────────────────
    const ctrlRow = document.createElement('div');
    ctrlRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;';

    const lBtn = document.createElement('button');
    lBtn.id        = 'pbtn_long_'+pairKey;
    lBtn.className = 'pair-pos-btn long';
    lBtn.innerHTML = '↑ LONG';
    lBtn.onclick   = () => _openProposedPosition(pair, 'long');

    const levDiv = document.createElement('div');
    levDiv.className = 'pair-lev-btn';
    levDiv.style.cssText = 'display:flex;align-items:center;gap:3px;';
    const levMinus = _makePosBtn(pair, 'lev', -1, '−');
    const levVal   = document.createElement('span');
    levVal.className  = 'pair-lev-val';
    levVal.id         = 'plev_'+pairKey;
    levVal.textContent= '×'+(ps.pairLeverage||1);
    const levPlus  = _makePosBtn(pair, 'lev', +1, '+');
    levDiv.appendChild(levMinus); levDiv.appendChild(levVal); levDiv.appendChild(levPlus);

    const sBtn = document.createElement('button');
    sBtn.id        = 'pbtn_short_'+pairKey;
    sBtn.className = 'pair-pos-btn short';
    sBtn.innerHTML = '↓ SHORT';
    sBtn.onclick   = () => _openProposedPosition(pair, 'short');

    ctrlRow.appendChild(lBtn); ctrlRow.appendChild(levDiv); ctrlRow.appendChild(sBtn);
    row.appendChild(ctrlRow);

    // ── Suggestion strip (post-entry) ────────────────────────
    const suggDiv  = document.createElement('div');
    suggDiv.id     = 'psugg_'+pairKey;
    suggDiv.style.cssText = 'margin-top:4px;';
    row.appendChild(suggDiv);

    wrap.appendChild(row);
  });
}

// Helper: create position control buttons with touch debounce
function _makePosBtn(pair, field, dir, label) {
  const b = document.createElement('button');
  b.className = 'step-btn';
  b.textContent = label;
  b.addEventListener('pointerdown',  e => { e.preventDefault(); e.stopPropagation(); _pointerMoved=false; _startHold(pair, field, dir); });
  b.addEventListener('pointerup',    () => _stopHold(pair, field, dir));
  b.addEventListener('pointerleave', () => _stopHold(pair, field, dir));
  b.addEventListener('pointercancel',() => _stopHold(pair, field, dir));
  return b;
}

// ── Pair detail bottom sheet ──────────────────────────────────

function showPairDetail(pair) {
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return;

  const sheet    = document.getElementById('pairDetailSheet');
  const backdrop = document.getElementById('pairDetailBackdrop');
  const title    = document.getElementById('pairDetailTitle');
  const content  = document.getElementById('pairDetailContent');
  if(!sheet) return;

  const comp = getCompositeSignal(pair);
  const tech = comp?.tech || {};
  const priceStr = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
  const prob = lmsrP(ps);
  const pct  = (prob*100).toFixed(1);
  const probCol = prob>.6?'var(--up)':prob<.4?'var(--down)':'var(--gold)';

  title.innerHTML = `<span style="color:${cfg.color}">${pair}</span>&nbsp;
    <span style="font-size:11px;color:var(--t3);font-weight:400;">${priceStr}</span>
    <span style="font-size:10px;color:${ps.pnl24h>=0?'var(--up)':'var(--down)'};margin-left:5px;">${ps.pnl24h>=0?'+':''}${ps.pnl24h.toFixed(2)}%</span>`;

  const sigs   = Object.entries(tech.signals||{});
  const atRows = sigs.map(([k, s]) => {
    if(!s) return '';
    const col  = s.signal==='bull'?'var(--up)':s.signal==='bear'?'var(--down)':'var(--gold)';
    const icon = s.signal==='bull'?'↑':s.signal==='bear'?'↓':'→';
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:10px;color:var(--t2);">${s.label||k}</span>
      <div style="display:flex;gap:6px;align-items:center;">
        <span style="font-size:9px;color:var(--t3);">${typeof s.value==='number'?s.value.toFixed(3):''}</span>
        <span style="font-size:11px;font-weight:700;color:${col};">${icon}</span>
      </div>
    </div>`;
  }).join('');

  const wr = ps.totalTrades > 0 ? (ps.winTrades/ps.totalTrades*100).toFixed(0) : '—';

  content.innerHTML = `
    <div style="background:var(--s2);border-radius:10px;padding:10px 13px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:8px;color:var(--t3);margin-bottom:2px;">Signal LMSR</div>
        <div style="font-size:20px;font-weight:800;color:${probCol};">${pct}%</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;color:${probCol};">${prob>.6?'↑ ACHAT':prob<.4?'↓ VENTE':'→ NEUTRE'}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:2px;">
          AT: ${comp?((comp.tech.atScore||0)*100).toFixed(0)+'%':'—'} &nbsp;·&nbsp;
          AF: ${comp?((comp.fund.fundScore||0)*100).toFixed(0)+'%':'—'}
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">
      <div style="background:var(--s2);border-radius:8px;padding:7px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">Trades</div>
        <div style="font-size:13px;font-weight:700;color:var(--ice);">${ps.totalTrades}</div>
      </div>
      <div style="background:var(--s2);border-radius:8px;padding:7px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">Win Rate</div>
        <div style="font-size:13px;font-weight:700;color:${parseFloat(wr)>=50?'var(--up)':'var(--down)'};">${wr}%</div>
      </div>
      <div style="background:var(--s2);border-radius:8px;padding:7px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">P&L</div>
        <div style="font-size:12px;font-weight:700;color:${ps.totalPnlUsd>=0?'var(--up)':'var(--down)'};">${ps.totalPnlUsd>=0?'+':''}$${ps.totalPnlUsd.toFixed(1)}</div>
      </div>
    </div>
    ${ps.bestTrade ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
      <div style="background:rgba(0,232,122,.07);border:1px solid rgba(0,232,122,.2);border-radius:8px;padding:7px;">
        <div style="font-size:7px;color:var(--up);">🏆 Meilleur</div>
        <div style="font-size:13px;font-weight:700;color:var(--up);">+${ps.bestTrade.pnl.toFixed(2)}%</div>
      </div>
      <div style="background:rgba(255,61,107,.07);border:1px solid rgba(255,61,107,.2);border-radius:8px;padding:7px;">
        <div style="font-size:7px;color:var(--down);">🔻 Pire</div>
        <div style="font-size:13px;font-weight:700;color:var(--down);">${(ps.worstTrade?.pnl||0).toFixed(2)}%</div>
      </div>
    </div>` : ''}
    ${sigs.length ? `
    <div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px;">📊 Indicateurs AT</div>
    <div style="background:var(--s2);border-radius:10px;padding:6px 10px;margin-bottom:16px;">${atRows}</div>` : ''}
    <button onclick="closePairDetail()" style="width:100%;padding:11px;background:var(--s2);border:1px solid var(--border);border-radius:10px;color:var(--t2);font-size:12px;font-weight:600;cursor:pointer;">Fermer</button>`;

  sheet.style.transform    = 'translateY(0)';
  backdrop.style.opacity   = '1';
  backdrop.style.pointerEvents = 'auto';
}

function closePairDetail() {
  const s = document.getElementById('pairDetailSheet');
  const b = document.getElementById('pairDetailBackdrop');
  if(s) s.style.transform    = 'translateY(105%)';
  if(b) { b.style.opacity = '0'; b.style.pointerEvents = 'none'; }
}

// ── Agent role filter ─────────────────────────────────────────
let _agentFilter = 'all';
function filterAgents(role, btn) {
  _agentFilter = role;
  // Update active button
  document.querySelectorAll('.agent-filter-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // Show/hide agent cards
  const list = document.getElementById('mobileAgentList');
  if(!list) return;
  list.querySelectorAll('[data-agent-role]').forEach(card => {
    const cardRole = card.dataset.agentRole || 'fundamental';
    if(role === 'all' || cardRole === role) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}


function _adjProp(pair, field, dir) {
  const k = pair.replace('/','_');
  if(field === 'lev') {
    const el = document.getElementById('pinput_lev_'+k);
    if(!el) return;
    const cur = parseInt(el.dataset.val) || 1;
    const nv  = Math.max(1, Math.min(20, cur + dir));
    el.dataset.val    = nv;
    el.textContent    = '×'+nv;
    el.style.color    = nv > 1 ? 'var(--gold)' : 'var(--up)';
    _recalcProposal(pair);
  }
}

function _adjPropPct(pair, field, pct) {
  const k   = pair.replace('/','_');
  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps || !cfg) return;
  const dec = cfg.dec >= 4 ? cfg.dec : 2;
  // Determine side from the proposal card
  const levEl  = document.getElementById('pinput_lev_'+k);
  const propCard = levEl?.closest('[id^="pcard_"]') || levEl?.parentElement?.parentElement?.parentElement;
  // Detect if LONG or SHORT from LMSR signal
  const comp = getCompositeSignal(pair);
  const isLong = comp?.signal === 'LONG';
  const cur  = ps.price;

  if(field === 'tp') {
    const price = isLong ? cur * (1 + pct/100) : cur * (1 - pct/100);
    const inp = document.getElementById('pinput_tp_'+k);
    if(inp) { inp.value = price.toFixed(dec); _recalcProposal(pair); }
  } else if(field === 'sl') {
    const price = isLong ? cur * (1 - pct/100) : cur * (1 + pct/100);
    const inp = document.getElementById('pinput_sl_'+k);
    if(inp) { inp.value = price.toFixed(dec); _recalcProposal(pair); }
  }
}

function _recalcProposal(pair) {
  const k      = pair.replace('/','_');
  const ps     = S.pairStates[pair];
  const fc     = S.feeConfig;
  const reg    = S.taxConfig.regions[S.taxConfig.region];
  if(!ps) return;

  const stakeEl = document.getElementById('pinput_stake_'+k);
  const levEl   = document.getElementById('pinput_lev_'+k);
  const tpEl    = document.getElementById('pinput_tp_'+k);
  const slEl    = document.getElementById('pinput_sl_'+k);
  const feeEl   = document.getElementById('pfee_'+k);
  const netEl   = document.getElementById('pnet_'+k);
  const notEl   = document.getElementById('pnotional_'+k);
  if(!stakeEl || !levEl) return;

  const stake = parseFloat(stakeEl.value) || 100;
  const lev   = parseInt(levEl.dataset.val) || 1;
  const tp    = tpEl ? parseFloat(tpEl.value) : null;
  const sl    = slEl ? parseFloat(slEl.value) : null;
  const notional = stake * lev;

  // Fee calc
  const feePct  = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
  const taxPct  = (reg?.inclusion||0) * (reg?.rate||0);
  const fees    = notional * feePct;

  // Expected gain from TP (if set)
  let gain = 0;
  if(tp && ps.price > 0) {
    const comp = getCompositeSignal(pair);
    const isLong = comp?.signal === 'LONG';
    gain = isLong
      ? notional * Math.max(0, (tp - ps.price) / ps.price)
      : notional * Math.max(0, (ps.price - tp) / ps.price);
    const taxAmount = gain > fees ? (gain - fees) * taxPct : 0;
    gain -= taxAmount;
  }
  const net = gain - fees;

  if(feeEl) { feeEl.textContent = '−$'+fees.toFixed(2); }
  if(netEl) {
    netEl.textContent = (net>=0?'+':'')+'$'+net.toFixed(2);
    netEl.style.color = net >= 0 ? 'var(--up)' : 'var(--down)';
  }
  if(notEl) notEl.textContent = '$'+notional.toFixed(0);

  // ── Capital bar: show how much of available capital this trade uses ──
  const cap       = getCapitalSummary();
  const afterStake= cap.staked + notional;
  const usedPct   = cap.maxAllowed > 0 ? Math.min(100, afterStake / cap.maxAllowed * 100) : 0;
  const free      = Math.max(0, cap.maxAllowed - cap.staked);
  const barColor  = usedPct > 90 ? 'var(--down)' : usedPct > 70 ? 'var(--gold)' : 'var(--up)';
  const capBarEl  = document.getElementById('pcapbar_'+k);
  const capFillEl = document.getElementById('pcapfill_'+k);
  const capLblEl  = document.getElementById('pcaplbl_left_'+k);
  const capFreeEl = document.getElementById('pcaplbl_right_'+k);
  if(capBarEl)  capBarEl.style.borderColor  = usedPct > 90 ? 'rgba(255,61,107,.3)' : 'rgba(255,255,255,.06)';
  if(capFillEl) { capFillEl.style.width = usedPct+'%'; capFillEl.style.background = barColor; }
  if(capLblEl)  capLblEl.textContent  = 'Engagé: $'+Math.round(afterStake);
  if(capFreeEl) { capFreeEl.textContent = 'Libre: $'+Math.round(free - notional); capFreeEl.style.color = free - notional < 0 ? 'var(--down)' : 'var(--t3)'; }

  // Store values for _openProposedPosition
  const propDiv = document.getElementById('pproposal_'+k);
  if(propDiv) {
    propDiv.dataset.suggestStake = stake;
    propDiv.dataset.suggestLev   = lev;
    propDiv.dataset.suggestTp    = tp || '';
    propDiv.dataset.suggestSl    = sl || '';
  }
}

// Open position using the edited proposal values (reads live inputs)
function _openProposedPosition(pair, side) {
  const pairKey = pair.replace('/','_');
  const ps      = S.pairStates[pair];
  if(!ps) return;

  // Read from editable inputs — user may have modified them
  const stakeEl = document.getElementById('pinput_stake_'+pairKey);
  const levEl   = document.getElementById('pinput_lev_'+pairKey);
  const tpEl    = document.getElementById('pinput_tp_'+pairKey);
  const slEl    = document.getElementById('pinput_sl_'+pairKey);
  const propDiv = document.getElementById('pproposal_'+pairKey);

  const stake = stakeEl ? Math.max(10, parseFloat(stakeEl.value)||100)
              : parseFloat(propDiv?.dataset.suggestStake||'100');
  const lev   = levEl   ? Math.max(1, parseInt(levEl.dataset.val)||1)
              : parseInt(propDiv?.dataset.suggestLev||'1');
  const tp    = tpEl    ? (parseFloat(tpEl.value)||null) : null;
  const sl    = slEl    ? (parseFloat(slEl.value)||null) : null;

  // ── VALIDATION CAPITAL avant ouverture manuelle ──────────────
  const leverageBonus = stake * (lev - 1);  // part empruntée
  const capCheck = validateTotalExposure(stake, leverageBonus);
  if(!capCheck.ok) {
    const free = Math.max(0, capCheck.available);
    // v7.1 P5: si bloqué par la règle spec utilisateur, on le précise
    if(capCheck.phase5) {
      const _src = capCheck.phase5Mode === 'leverage' ? 'levier emprunté' : 'trading';
      showToast(`⚠ Règle sizing · max investissable ${fmt$(free)} (${_src} − engagés)`, 3200, 'critical');
    } else {
      showToast(`⚠ Dépassement capital · max disponible: ${fmt$(free)} · réduire la mise ou le levier`);
    }
    return;
  }

  // Temporarily apply proposed leverage + stake
  const prevLev   = ps.pairLeverage;
  const prevStake = ps.stake;
  ps.pairLeverage = lev;
  ps.stake        = stake;

  openPosition(pair, side);

  // Restore
  ps.pairLeverage = prevLev;
  ps.stake        = prevStake;

  // Apply TP/SL to the newly opened position
  if(tp || sl) {
    setTimeout(() => {
      const newPos = S.openPositions.find(p => p.pair===pair && p.auto!==true);
      if(newPos) {
        if(tp && tp > 0) newPos.tp = tp;
        if(sl && sl > 0) newPos.sl = sl;
      }
    }, 50);
  }
}


// ── Update analysis + proposal for each pair (called every few ticks) ──────
function updatePairAnalysisPanels() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const ps      = S.pairStates[pair];
    if(!ps) return;

    // ── Price-change detection: only rebuild proposal if price moved >0.2% ──
    const lastBuiltPrice = ps._lastProposalPrice || 0;
    const priceDelta     = ps.price > 0 ? Math.abs(ps.price - lastBuiltPrice) / ps.price : 1;
    const needsRebuild   = priceDelta > 0.002 || !lastBuiltPrice;

    // Update price + 24h change header
    const pxEl  = document.getElementById('ppos_px_'+pairKey);
    const chgEl = document.getElementById('ppos_chg_'+pairKey);
    if(pxEl)  pxEl.textContent  = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
    if(chgEl) {
      chgEl.textContent  = (ps.pnl24h>=0?'+':'')+ps.pnl24h.toFixed(2)+'%';
      chgEl.style.color  = ps.pnl24h>=0?'var(--up)':'var(--down)';
    }

    // Only show full analysis if no manual position open (pre-entry guidance)
    const manualPos = S.openPositions.find(p => p.pair===pair && p.auto!==true);
    if(manualPos) {
      updateManualSuggestion(pair, pairKey);
      return;
    }

    // v7.6 · Mode AUTO : ne PAS pré-afficher de mise sur les paires où le bot n'est pas engagé.
    // Si aucune position ouverte sur cette paire, on affiche juste "Bot en veille" (pas de mise).
    const autoPos = S.openPositions.find(p => p.pair===pair && p.auto===true);
    if(S.botAutoMode === true && !autoPos) {
      const proposalEl = document.getElementById('pproposal_'+pairKey);
      if(proposalEl) {
        proposalEl.innerHTML = `
        <div style="background:rgba(120,130,150,.04);border:1px dashed rgba(120,130,150,.15);border-radius:8px;padding:7px 10px;text-align:center;font-size:8px;color:var(--t3);">
          🤖 Bot en veille sur ${pair} · aucune mise réservée
        </div>`;
        // Disable entry buttons in auto mode without position
        const lb = document.getElementById('pbtn_long_'+pairKey);
        const sb = document.getElementById('pbtn_short_'+pairKey);
        if(lb) lb.style.opacity='0.35';
        if(sb) sb.style.opacity='0.35';
      }
      return;
    }

    // Skip expensive proposal rebuild if price barely moved
    if(!needsRebuild) return;
    ps._lastProposalPrice = ps.price;

    const comp = getCompositeSignal(pair);
    if(!comp) return;

    const { composite, signal, col, strength, tech, fund } = comp;
    const sigs  = Object.values(tech?.signals||{}).filter(Boolean);
    const bulls = sigs.filter(s=>s.signal==='bull').length;
    const bears = sigs.filter(s=>s.signal==='bear').length;
    const neuts = sigs.length - bulls - bears;

    // ── Fee-aware optimal stake calculation ─────────────────
    const lev         = ps.pairLeverage || 1;
    const tradingCap  = Math.max(100, S.tradingAccount);
    const baseAlloc   = tradingCap * 0.05;  // 5% per pair base
    const conviction  = Math.abs(composite);
    const rawStake    = baseAlloc * (1 + conviction * 1.5);
    const fc          = S.feeConfig;
    const reg         = S.taxConfig.regions[S.taxConfig.region];
    // Rentabilité réelle : la taxe frappe le GAIN, pas la conviction. On estime le
    // gain visé (TP ~ conviction), on retire les frais (aller-retour) puis l'impôt
    // sur le gain restant, et on exige un gain NET minimum + un signal de qualité.
    const feePct      = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
    const taxPct      = (reg?.inclusion||0) * (reg?.rate||0);
    const minMoveNeeded = feePct + taxPct;   // conservé pour l'affichage break-even
    const _tpFrac        = Math.max(0.007, conviction * 0.032);          // gain visé (fraction)
    const _gainAfterFees = _tpFrac - feePct;
    const _gainNet       = _gainAfterFees - Math.max(0, _gainAfterFees) * taxPct;
    // On trade si le gain NET réel couvre un minimum (0.15%) ET le signal est de qualité.
    const shouldTrade = _gainNet > 0.0015 && Math.abs(composite) > 0.28;
    const suggestStake= Math.round(Math.min(
      rawStake,
      tradingCap * 0.15,
      Math.max(10, getCapitalSummary().free * 0.25)   // max 25% du capital libre
    ) / 10) * 10;
    const leverageSugg= conviction > 0.55 ? Math.min(3, Math.max(1, Math.round(conviction*4)))
                      : conviction > 0.35 ? 2 : 1;

    // Suggested TP/SL based on ATR
    const raw     = tech?.raw;
    const atr     = raw?.stddev?.atr || (ps.price * 0.015);
    const tpDist  = atr * (1.5 + conviction);
    const slDist  = atr * (0.8 + conviction * 0.5);
    const priceFormatted = cfg.dec>=4;
    const fmt     = v => priceFormatted ? v.toFixed(cfg.dec) : Math.round(v).toLocaleString();

    // ── Render analysis panel ────────────────────────────────
    const analysisEl = document.getElementById('panalysis_'+pairKey);
    if(analysisEl) {
      const atPct  = ((tech.atScore+1)*50).toFixed(0);
      const afPct  = ((fund.fundScore+1)*50).toFixed(0);
      const atCol  = tech.atScore>0.15?'var(--up)':tech.atScore<-0.15?'var(--down)':'var(--gold)';
      const afCol  = fund.fundScore>0.15?'var(--up)':fund.fundScore<-0.15?'var(--down)':'var(--gold)';
      // Top 2 confirming indicators
      const topAT  = sigs.filter(s=>s.signal===(signal==='LONG'?'bull':'bear')).slice(0,2).map(s=>s.label.replace(/[↑↓]/g,'').trim());

      analysisEl.innerHTML = `
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
          <span style="font-size:8px;color:var(--t3);font-weight:600;letter-spacing:.06em;">ANALYSE — ${pair}</span>
          <span style="font-size:10px;font-weight:800;color:${col};">${signal==='LONG'?'↑':signal==='SHORT'?'↓':'—'} ${signal} <span style="font-size:8px;color:var(--t3);">${strength}</span></span>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:5px;">
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:2px;">AT ${tech.atScore>=0?'+':''}${(tech.atScore*100).toFixed(0)}% (${bulls}↑ ${neuts}→ ${bears}↓)</div>
            <div style="height:4px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${atPct}%;background:${atCol};border-radius:2px;transition:width .4s;"></div>
            </div>
          </div>
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:2px;">AF ${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</div>
            <div style="height:4px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${afPct}%;background:${afCol};border-radius:2px;transition:width .4s;"></div>
            </div>
          </div>
        </div>
        ${topAT.length ? `<div style="font-size:7px;color:var(--t3);">Confirmé: <span style="color:${col};">${topAT.join(' · ')}</span></div>` : ''}
      </div>`;
    }

    // ── Render pre-filled proposal ────────────────────────────
    const proposalEl = document.getElementById('pproposal_'+pairKey);
    if(proposalEl) {
      proposalEl.dataset.suggestStake = suggestStake;

      if(!shouldTrade) {
        proposalEl.innerHTML = `
        <div style="background:rgba(245,200,66,.04);border:1px dashed rgba(245,200,66,.2);border-radius:8px;padding:7px 10px;text-align:center;font-size:8px;color:var(--t3);">
          Signal faible (${(conviction*100).toFixed(0)}%) — attendre confirmation · break-even: ${(minMoveNeeded*100).toFixed(2)}%
        </div>`;
        // Disable entry buttons
        const lb = document.getElementById('pbtn_long_'+pairKey);
        const sb = document.getElementById('pbtn_short_'+pairKey);
        if(lb) lb.style.opacity='0.4';
        if(sb) sb.style.opacity='0.4';
        return;
      }

      // Enable buttons
      const lb = document.getElementById('pbtn_long_'+pairKey);
      const sb = document.getElementById('pbtn_short_'+pairKey);
      if(lb) lb.style.opacity='1';
      if(sb) sb.style.opacity='1';

      const isLong   = signal === 'LONG';
      const isShort  = signal === 'SHORT';
      const propSide = isLong ? 'LONG ↑' : isShort ? 'SHORT ↓' : 'NEUTRE';
      const propCol  = isLong ? 'var(--up)' : isShort ? 'var(--down)' : 'var(--gold)';
      const tpLong   = ps.price + tpDist;
      const slLong   = ps.price - slDist;
      const tpShort  = ps.price - tpDist;
      const slShort  = ps.price + slDist;
      const tpVal    = isLong ? tpLong  : isShort ? tpShort : ps.price + tpDist;
      const slVal    = isLong ? slLong  : isShort ? slShort : ps.price - slDist;
      const netExpect= suggestStake * leverageSugg * (tpDist / ps.price) * conviction;
      const feesCost = suggestStake * leverageSugg * feePct;
      const netAfter = netExpect - feesCost;

      proposalEl.innerHTML = `
      <div id="pcard_${pairKey}" style="background:${isLong?'rgba(0,232,122,.05)':isShort?'rgba(255,61,107,.05)':'rgba(245,200,66,.04)'};
                  border:1px solid ${isLong?'rgba(0,232,122,.25)':isShort?'rgba(255,61,107,.25)':'rgba(245,200,66,.2)'};
                  border-radius:10px;padding:9px 11px;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
          <span style="font-size:8px;font-weight:700;color:var(--t2);">💡 PROPOSITION MODIFIABLE</span>
          <span style="font-size:10px;font-weight:800;color:${propCol};">${propSide}</span>
        </div>

        <!-- Row 1: Mise + Levier -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <div>
            <div style="font-size:7px;color:var(--t3);margin-bottom:3px;">💰 Mise (USDT)</div>
            <input id="pinput_stake_${pairKey}" type="number" min="10" step="10" value="${suggestStake}"
              oninput="_recalcProposal('${pair}')"
              style="width:100%;background:var(--s3);border:1px solid var(--border);border-radius:6px;
                     padding:5px 7px;color:var(--gold);font-family:var(--font-mono);font-size:11px;
                     font-weight:700;box-sizing:border-box;-webkit-appearance:none;">
          </div>
          <div>
            <div style="font-size:7px;color:var(--t3);margin-bottom:3px;">⚡ Levier</div>
            <div style="display:flex;align-items:center;gap:4px;height:32px;">
              <button onclick="_adjProp('${pair}','lev',-1)" style="background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--t2);width:26px;height:100%;font-size:13px;cursor:pointer;">−</button>
              <span id="pinput_lev_${pairKey}" data-val="${leverageSugg}"
                style="flex:1;text-align:center;font-family:var(--font-mono);font-size:12px;font-weight:700;
                       color:${leverageSugg>1?'var(--gold)':'var(--up)'};">×${leverageSugg}</span>
              <button onclick="_adjProp('${pair}','lev',+1)" style="background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--t2);width:26px;height:100%;font-size:13px;cursor:pointer;">+</button>
            </div>
          </div>
        </div>

        <!-- Row 2: TP + SL editable -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
          <div>
            <div style="font-size:7px;color:var(--up);margin-bottom:3px;">🎯 Take Profit</div>
            <input id="pinput_tp_${pairKey}" type="number" step="any" value="${tpVal.toFixed(cfg.dec>=4?cfg.dec:2)}"
              oninput="_recalcProposal('${pair}')"
              style="width:100%;background:var(--s3);border:1px solid rgba(0,232,122,.2);border-radius:6px;
                     padding:5px 7px;color:var(--up);font-family:var(--font-mono);font-size:10px;
                     font-weight:700;box-sizing:border-box;-webkit-appearance:none;">
            <div style="display:flex;gap:3px;margin-top:3px;">
              <button onclick="_adjPropPct('${pair}','tp',1)"  style="flex:1;background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:4px;color:var(--up);font-size:8px;padding:2px 0;cursor:pointer;">+1%</button>
              <button onclick="_adjPropPct('${pair}','tp',2)"  style="flex:1;background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:4px;color:var(--up);font-size:8px;padding:2px 0;cursor:pointer;">+2%</button>
              <button onclick="_adjPropPct('${pair}','tp',5)"  style="flex:1;background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:4px;color:var(--up);font-size:8px;padding:2px 0;cursor:pointer;">+5%</button>
            </div>
          </div>
          <div>
            <div style="font-size:7px;color:var(--down);margin-bottom:3px;">🛑 Stop Loss</div>
            <input id="pinput_sl_${pairKey}" type="number" step="any" value="${slVal.toFixed(cfg.dec>=4?cfg.dec:2)}"
              oninput="_recalcProposal('${pair}')"
              style="width:100%;background:var(--s3);border:1px solid rgba(255,61,107,.2);border-radius:6px;
                     padding:5px 7px;color:var(--down);font-family:var(--font-mono);font-size:10px;
                     font-weight:700;box-sizing:border-box;-webkit-appearance:none;">
            <div style="display:flex;gap:3px;margin-top:3px;">
              <button onclick="_adjPropPct('${pair}','sl',1)"  style="flex:1;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:4px;color:var(--down);font-size:8px;padding:2px 0;cursor:pointer;">−1%</button>
              <button onclick="_adjPropPct('${pair}','sl',2)"  style="flex:1;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:4px;color:var(--down);font-size:8px;padding:2px 0;cursor:pointer;">−2%</button>
              <button onclick="_adjPropPct('${pair}','sl',5)"  style="flex:1;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:4px;color:var(--down);font-size:8px;padding:2px 0;cursor:pointer;">−5%</button>
            </div>
          </div>
        </div>

        <!-- Live recap: fees + expected net + capital bar -->
        <div id="precap_${pairKey}" style="background:var(--s3);border-radius:6px;padding:7px 10px;font-size:9px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:var(--gold);font-weight:700;">💰 TOTAL ENGAGÉ</span>
            <span style="color:var(--gold);font-weight:800;font-family:var(--font-display);font-size:11px;" id="pnotional_${pairKey}">$${(suggestStake*leverageSugg).toFixed(0)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="color:var(--t3);">· Mise propre</span>
            <span style="color:var(--t2);">$${suggestStake}</span>
          </div>
          ${leverageSugg>1?`<div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="color:var(--t3);">· Levier ×${leverageSugg}</span>
            <span style="color:var(--gold);">+$${(suggestStake*(leverageSugg-1)).toFixed(0)}</span>
          </div>`:''}
          <div style="height:1px;background:var(--border);margin:5px 0;"></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="color:var(--t3);">Frais estimés</span>
            <span style="color:var(--down);" id="pfee_${pairKey}">−$${feesCost.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="color:var(--t3);">Gain net espéré</span>
            <span style="color:${netAfter>0?'var(--up)':'var(--down)'};" id="pnet_${pairKey}">${netAfter>=0?'+':''}$${netAfter.toFixed(2)}</span>
          </div>
          <!-- Capital bar -->
          <div class="cap-bar-wrap" id="pcapbar_${pairKey}" style="border:1px solid rgba(255,255,255,.06);border-radius:5px;padding:4px 6px;">
            <div class="cap-bar-track"><div class="cap-bar-fill" id="pcapfill_${pairKey}" style="width:0%;"></div></div>
            <div class="cap-bar-label">
              <span id="pcaplbl_left_${pairKey}">Engagé: —</span>
              <span id="pcaplbl_right_${pairKey}" style="color:var(--t3);">Libre: —</span>
            </div>
          </div>
        </div>
      </div>`;
    }
  });
}

function changePairLev(pair, delta) {
  const ps  = S.pairStates[pair];
  if(!ps) return;
  ps.pairLeverage = Math.max(1, Math.min(20, (ps.pairLeverage||1) + delta));
  const el = document.getElementById('plev_'+pair.replace('/','_'));
  if(el) {
    el.textContent = '×'+ps.pairLeverage;
    // Couleur selon levier : vert ×1, or ×2-5, orange ×6-10, rouge ×11+
    el.style.color = ps.pairLeverage === 1 ? 'var(--up)'
                   : ps.pairLeverage <= 5  ? 'var(--gold)'
                   : ps.pairLeverage <= 10 ? '#ff9500'
                   : 'var(--down)';
  }
  showToast('⚡ '+pair+' levier ×'+ps.pairLeverage+' — Mise: $'+Math.round((ps.stake||0)*ps.pairLeverage));
}

function changePairStake(pair, delta) {
  const ps  = S.pairStates[pair];
  if(!ps) return;
  ps.stake     = Math.max(10, Math.min(100000, ps.stake + delta));
  ps.userStake = true;   // l'utilisateur a pris la main — ne pas écraser
  const el  = document.getElementById('pstake_'+pair.replace('/','_'));
  if(el) el.textContent = '$'+ps.stake;
}

// ── Suggestion strip for manual positions — read-only, no bot action ──────
function updateManualSuggestion(pair, pairKey) {
  const el = document.getElementById('psugg_'+pairKey);
  if(!el) return;

  const pos = S.openPositions.find(p => p.pair === pair && p.auto !== true);
  if(!pos) { el.innerHTML = ''; return; }

  const comp = getCompositeSignal(pair);
  const ps   = S.pairStates[pair];
  const cfg  = PAIRS[pair];
  if(!comp || !ps) { el.innerHTML = ''; return; }

  const { composite, signal, col, strength, tech, fund } = comp;
  const sigs  = Object.values(tech?.signals||{}).filter(Boolean);
  const bulls = sigs.filter(s=>s.signal==='bull').length;
  const bears = sigs.filter(s=>s.signal==='bear').length;
  const neuts = sigs.length - bulls - bears;

  // Agreement
  const posDir   = pos.side === 'long' ? 'LONG' : 'SHORT';
  const agrees   = signal === posDir;
  const agreeCol = agrees ? 'var(--up)' : signal === 'NEUTRE' ? 'var(--gold)' : 'var(--down)';
  const agreeIcon= agrees ? '✓' : signal === 'NEUTRE' ? '→' : '⚠';
  const agreeMsg = agrees
    ? 'Signal confirme votre '+posDir
    : signal === 'NEUTRE' ? 'Signal neutre — surveiller'
    : 'Signal oppose votre '+posDir+' → '+signal;

  // Live P&L
  const pnlPct = pos.side==='long'
    ? ((ps.price - pos.entryPrice)/pos.entryPrice*100)
    : ((pos.entryPrice - ps.price)/pos.entryPrice*100);
  const pnlUsd = pos.stakeUsdt * (pnlPct/100);
  const pnlCol = pnlPct >= 0 ? 'var(--up)' : 'var(--down)';

  // Fee context
  const fc     = S.feeConfig;
  const reg    = S.taxConfig.regions[S.taxConfig.region];
  const feePct = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
  const fees   = pos.stakeUsdt * feePct;
  const taxPct = (reg?.inclusion||0)*(reg?.rate||0);
  const tax    = pnlUsd > fees ? (pnlUsd - fees) * taxPct : 0;
  const netPnl = pnlUsd - fees - tax;

  // TP/SL status
  const fmt = v => cfg.dec>=4 ? v.toFixed(cfg.dec) : '$'+Math.floor(v).toLocaleString();
  const tpSet = pos.tp != null;
  const slSet = pos.sl != null;
  const tpDist = tpSet
    ? (pos.side==='long' ? ((pos.tp-ps.price)/ps.price*100) : ((ps.price-pos.tp)/ps.price*100))
    : null;
  const slDist = slSet
    ? (pos.side==='long' ? ((ps.price-pos.sl)/ps.price*100) : ((pos.sl-ps.price)/ps.price*100))
    : null;

  // Time in trade
  const durStr = pos.entryTs ? fmtSince(pos.entryTs) : pos.entryTime || '—';

  // Top 2 key signals
  const keyDir  = signal === 'LONG' ? 'bull' : 'bear';
  const topSigs = sigs.filter(s=>s.signal===keyDir).slice(0,2)
                      .map(s=>s.label.replace(/[↑↓]/g,'').trim());

  // Risk/reward ratio
  const rrRatio = (tpDist && slDist && slDist > 0)
    ? (tpDist / slDist).toFixed(1) : null;

  el.innerHTML = `
  <div style="background:rgba(245,200,66,.04);border:1px solid rgba(245,200,66,.2);border-radius:10px;padding:9px 11px;">

    <!-- Header row -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="color:var(--gold);font-weight:700;font-size:9px;">🔒 ${pos.side.toUpperCase()} — ${pair}</span>
        <span style="font-size:7px;color:var(--t3);">⏱ ${durStr}</span>
      </div>
      <div style="display:flex;gap:5px;align-items:center;">
        <button onclick="openPosEdit('${pos.id}')"
          style="background:rgba(245,200,66,.1);color:var(--gold);border:1px solid rgba(245,200,66,.25);
                 border-radius:6px;padding:2px 7px;font-size:9px;cursor:pointer;">✏️</button>
        <button onclick="closePosition('${pos.id}',${pos.auto?'true':'false'})"
          style="background:rgba(255,61,107,.18);color:var(--down);border:1.5px solid rgba(255,61,107,.55);
                 border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;
                 min-width:44px;min-height:32px;display:flex;align-items:center;gap:4px;">
          ✕
        </button>
      </div>
    </div>

    <!-- P&L live row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:6px;">
      <div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">P&L brut</div>
        <div style="font-size:11px;font-weight:700;color:${pnlCol};">${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%</div>
        <div style="font-size:8px;color:${pnlCol};">${pnlUsd>=0?'+':''}$${Math.abs(pnlUsd).toFixed(2)}</div>
      </div>
      <div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">P&L net</div>
        <div style="font-size:11px;font-weight:700;color:${netPnl>=0?'var(--up)':'var(--down)'};">${netPnl>=0?'+':''}$${Math.abs(netPnl).toFixed(2)}</div>
        <div style="font-size:7px;color:var(--t3);">−$${fees.toFixed(2)} frais</div>
      </div>
      <div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">Entrée</div>
        <div style="font-size:9px;font-weight:600;color:var(--t2);font-family:var(--font-mono);">${fmt(pos.entryPrice)}</div>
        <div style="font-size:7px;color:var(--t3);">Actuel: ${fmt(ps.price)}</div>
      </div>
    </div>

    <!-- TP/SL status row -->
    <div style="display:flex;gap:5px;margin-bottom:6px;">
      ${tpSet ? `
      <div style="flex:1;background:rgba(0,232,122,.06);border:1px solid rgba(0,232,122,.2);border-radius:6px;padding:4px 6px;">
        <div style="font-size:7px;color:var(--up);">🎯 TP: ${fmt(pos.tp)}</div>
        <div style="font-size:8px;font-weight:600;color:var(--up);">+${Math.abs(tpDist).toFixed(2)}%</div>
      </div>` : `
      <div style="flex:1;background:var(--s3);border:1px dashed var(--border);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">🎯 TP non défini</div>
      </div>`}
      ${slSet ? `
      <div style="flex:1;background:rgba(255,61,107,.06);border:1px solid rgba(255,61,107,.2);border-radius:6px;padding:4px 6px;">
        <div style="font-size:7px;color:var(--down);">🛑 SL: ${fmt(pos.sl)}</div>
        <div style="font-size:8px;font-weight:600;color:var(--down);">−${Math.abs(slDist).toFixed(2)}%</div>
      </div>` : `
      <div style="flex:1;background:var(--s3);border:1px dashed var(--border);border-radius:6px;padding:4px 6px;text-align:center;">
        <div style="font-size:7px;color:var(--t3);">🛑 SL non défini</div>
      </div>`}
      ${rrRatio ? `<div style="background:var(--s3);border-radius:6px;padding:4px 6px;text-align:center;min-width:40px;">
        <div style="font-size:7px;color:var(--t3);">R/R</div>
        <div style="font-size:10px;font-weight:700;color:${parseFloat(rrRatio)>=1.5?'var(--up)':'var(--gold)'};">${rrRatio}×</div>
      </div>` : ''}
    </div>

    <!-- Signal agreement -->
    <div style="padding:4px 8px;border-radius:6px;margin-bottom:5px;
         background:${agreeCol}11;border:1px solid ${agreeCol}33;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;font-weight:600;color:${agreeCol};">${agreeIcon} ${agreeMsg}</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <span style="font-size:8px;font-weight:800;color:${col};">${signal==='LONG'?'↑':signal==='SHORT'?'↓':'—'} ${signal}</span>
          <span style="font-size:7px;color:var(--t3);">${strength}</span>
        </div>
      </div>
    </div>

    <!-- AT/AF compact -->
    <div style="display:flex;gap:6px;font-size:7px;color:var(--t3);align-items:center;">
      <span>AT <span style="color:${tech.atScore>=0?'var(--up)':'var(--down)'};">${tech.atScore>=0?'+':''}${(tech.atScore*100).toFixed(0)}%</span></span>
      <span>AF <span style="color:${fund.fundScore>=0?'var(--up)':'var(--down)'};">${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</span></span>
      <span>↑${bulls} →${neuts} ↓${bears}</span>
      ${topSigs.length ? `<span style="color:var(--t3);">${topSigs.join(' · ')}</span>` : ''}
    </div>

  </div>`;
}

// ── Sync ALL pair controls with live computed values ──────────
// Called: on price fetch, on init, and from updatePairAnalysisPanels
function syncPairPresets() {
  const fc  = S.feeConfig;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const tradingCap = Math.max(10, S.tradingAccount);  // v6.8: min $10

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps      = S.pairStates[pair];
    const pairKey = pair.replace('/','_');
    if(!ps) return;

    // ── 1. Live price ─────────────────────────────────────────
    const pxEl  = document.getElementById('ppos_px_'+pairKey);
    const chgEl = document.getElementById('ppos_chg_'+pairKey);
    const priceStr = cfg.dec>=4 ? ps.price.toFixed(cfg.dec)
                                : '$'+Math.floor(ps.price).toLocaleString();
    if(pxEl)  pxEl.textContent = priceStr;
    if(chgEl) {
      chgEl.textContent = (ps.pnl24h>=0?'+':'')+ps.pnl24h.toFixed(2)+'%';
      chgEl.style.color = ps.pnl24h>=0?'var(--up)':'var(--down)';
    }

    // ── 2. Optimal stake (fee-aware) ─────────────────────────
    if(!ps.userStake) {
      const prob       = lmsrP(ps);
      const conviction = Math.abs(prob - 0.5) * 2;
      const base       = tradingCap * 0.05;
      const max        = tradingCap * 0.15;
      const feePct     = (fc.takerRate + fc.slippage) * 2 + fc.fundingRate * 3;
      const taxPct     = (reg?.inclusion||0) * (reg?.rate||0);
      const minMove    = feePct + taxPct;
      // Mise proportionnelle à conviction, minimum rentable
      const raw = conviction > minMove * 2.5  // v7.3 OPT · was ×2 · mises réduites si conviction moyenne
        ? base + (max - base) * conviction
        : base * 0.5;  // mise réduite si signal faible
      ps.stake = Math.max(10, Math.round(raw / 10) * 10);
    }

    // ── 3. Optimal cycle (LMSR signal speed) ─────────────────
    if(!ps.userCycleSet) {
      const prob       = lmsrP(ps);
      const conviction = Math.abs(prob - 0.5) * 2;
      const raw        = ps.raw || {};
      const sigma      = raw?.stddev?.annualVol || 0;
      // High conviction + low vol → fast cycle; weak signal + high vol → slow
      let targetSec;
      if(conviction > 0.6 && sigma < 0.5)     targetSec = 30;   // fort signal, calme
      else if(conviction > 0.4)                targetSec = 60;
      else if(conviction > 0.25)               targetSec = 120;
      else if(sigma > 0.8)                     targetSec = 300;  // volatile → prudent
      else                                     targetSec = 180;
      // Snap to nearest CYCLE_STEPS value
      const CYCLE_STEPS = [10,30,60,120,300,600,900,1800,3600];
      const nearest = CYCLE_STEPS.reduce((prev,cur) =>
        Math.abs(cur - targetSec) < Math.abs(prev - targetSec) ? cur : prev
      );
      ps.cycleMax = nearest;
    }

    // ── 4. Lever suggestion (pre-fill display — user still controls) ─
    const lev = ps.pairLeverage || 1;

    // ── 5. Update UI controls ────────────────────────────────
    const stakeEl = document.getElementById('pstake_'+pairKey);
    const cycleEl = document.getElementById('pcycle_'+pairKey);
    const levEl   = document.getElementById('plev_'+pairKey);

    if(stakeEl) {
      stakeEl.textContent = '$'+ps.stake;
      stakeEl.style.color = ps.userStake ? 'var(--ice)' : 'var(--gold)';
    }
    if(cycleEl) {
      cycleEl.textContent = fmtDur(ps.cycleMax);
      cycleEl.style.color = ps.userCycleSet ? 'var(--ice)' : 'var(--up)';
    }
    if(levEl) {
      levEl.textContent = '×'+lev;
      levEl.style.color = lev===1?'var(--up)':lev<=5?'var(--gold)':lev<=10?'#ff9500':'var(--down)';
    }

    // Sync action card frequency label
    const freqEl = document.getElementById('ac2_freq_'+pairKey);
    if(freqEl) freqEl.textContent = fmtDur(ps.cycleMax);
    const thrLbl = document.getElementById('ac2_thrlbl_'+pairKey);
    if(thrLbl) thrLbl.textContent = ((ps.threshold||0.65)*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);
  });
}


function updateAllPairCtrlLabels() {
  Object.entries(S.pairStates).forEach(([pair, ps]) => {
    const key = pair.replace('/','_');
    const cfg = PAIRS[pair];
    const se   = document.getElementById('pstake_'+key);
    const ce   = document.getElementById('pcycle_'+key);
    const le   = document.getElementById('plev_'+key);
    const pxe  = document.getElementById('ppos_px_'+key);
    const freqEl = document.getElementById('ac2_freq_'+key);   // ← action card sync

    if(se) se.textContent = ps.stake > 0 ? '$'+ps.stake : 'auto';
    if(ce) ce.textContent = fmtDur(ps.cycleMax);
    if(freqEl) freqEl.textContent = fmtDur(ps.cycleMax);

    // Sync threshold+cycle label on action card
    const thrLbl = document.getElementById('ac2_thrlbl_'+key);
    if(thrLbl) thrLbl.textContent = ((ps.threshold||0.65)*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);

    if(le) {
      const lev = ps.pairLeverage || 1;
      le.textContent = '×'+lev;
      le.style.color = lev === 1 ? 'var(--up)'
                     : lev <= 5  ? 'var(--gold)'
                     : lev <= 10 ? '#ff9500'
                     : 'var(--down)';
    }
    if(pxe && cfg) {
      const priceStr = cfg.dec >= 4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
      pxe.textContent = priceStr;
    }

    // ── Suggestion strip for manual positions ──
    updateManualSuggestion(pair, key);
  });
}

// ============================================================
// MINI CHARTS (4 pairs grid on market page)
// ============================================================
function drawMiniCharts() {
  const grid = document.getElementById('miniChartsGrid');
  if(!grid) return;

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps = S.pairStates[pair];
    const pairKey = pair.replace('/','_');
    const cardId  = 'mci_'+pairKey;
    const canvasId= 'mcc_'+pairKey;

    let card = document.getElementById(cardId);
    if(!card) {
      card = document.createElement('div');
      card.id = cardId;
      card.className = 'mini-chart-card'+(pair===S.activePair?' selected':'');
      // Tap → pair detail sheet; also marks pair as active
      let _pt = null;
      card.addEventListener('pointerdown', () => {
        _pt = setTimeout(() => { _pt=null; showPairDetail(pair); }, 300);
      });
      card.addEventListener('pointerup', () => {
        if(_pt){ clearTimeout(_pt); _pt=null; selectPair(pair); showPairDetail(pair); }
      });
      card.addEventListener('pointerleave', () => { if(_pt){ clearTimeout(_pt); _pt=null; } });
      card.innerHTML = `
        <div class="mini-chart-header">
          <div>
            <div class="mini-chart-pair" style="color:${cfg.color}">${pair}</div>
            <div class="mini-chart-pnl" id="mc_pnl_${pairKey}">+0.00%</div>
          </div>
          <div style="text-align:right;">
            <div class="mini-chart-price" id="mc_px_${pairKey}">$0</div>
            <div id="mc_sig_${pairKey}" style="font-size:8px;font-weight:700;margin-top:1px;">—</div>
          </div>
        </div>
        <canvas id="${canvasId}" style="width:100%;height:54px;display:block;"></canvas>
        <div style="font-size:7px;color:var(--t4);text-align:center;margin-top:2px;opacity:.5;">Tap pour détails</div>`;
      grid.appendChild(card);
    } else {
      card.className = 'mini-chart-card'+(pair===S.activePair?' selected':'');
    }

    // Patch text
    const pnlEl = document.getElementById('mc_pnl_'+pairKey);
    const pxEl  = document.getElementById('mc_px_'+pairKey);
    if(pnlEl) {
      pnlEl.textContent = (ps.pnl24h>=0?'+':'')+ps.pnl24h.toFixed(2)+'%';
      pnlEl.style.color = ps.pnl24h>=0?'var(--up)':'var(--down)';
    }
    if(pxEl) pxEl.textContent = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
    const sigEl = document.getElementById('mc_sig_'+pairKey);
    if(sigEl) {
      const p = lmsrP(ps);
      if(p>.60)      { sigEl.textContent='↑ BUY';  sigEl.style.color='var(--up)'; }
      else if(p<.40) { sigEl.textContent='↓ SELL'; sigEl.style.color='var(--down)'; }
      else {
        // v6.5: show LONG/SHORT hint even on hold if signal is directional
        const hint = (ps.qYes||100) > (ps.qNo||100)+10 ? '↑ LONG?' : (ps.qNo||100) > (ps.qYes||100)+10 ? '↓ SHORT?' : '→ WAIT';
        const hColor = hint.includes('LONG') ? 'rgba(0,232,122,0.6)' : hint.includes('SHORT') ? 'rgba(255,61,107,0.6)' : 'var(--gold)';
        sigEl.textContent = hint; sigEl.style.color = hColor;
      }
    }

    // Draw mini candle chart
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const W = canvas.parentElement.offsetWidth || 160;
    const H = 56;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const data = ps.candles.slice(-30);
    if(data.length < 2) return;
    ctx.clearRect(0,0,W,H);

    const mn = Math.min(...data.map(c=>c.l)), mx = Math.max(...data.map(c=>c.h));
    const rng = mx-mn||1;
    const cw = W/data.length;
    const bw = Math.max(1.5, cw*.55);

    // Gradient fill area
    const last = data[data.length-1];
    const first= data[0];
    const lineUp = last.c >= first.c;
    const fillCol = lineUp ? 'rgba(0,232,122,' : 'rgba(255,61,107,';

    const pts = data.map((c,i)=>({ x: i*cw+cw/2, y: H-((c.c-mn)/rng)*(H-4)-2 }));
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, fillCol+'.15)');
    grad.addColorStop(1, fillCol+'0)');
    ctx.beginPath();
    ctx.moveTo(0, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(W, H);
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    pts.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.strokeStyle = lineUp ? '#00e87a' : '#ff3d6b';
    ctx.lineWidth = 1.5; ctx.stroke();

    // Last price dot
    const lp = pts[pts.length-1];
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 3, 0, Math.PI*2);
    ctx.fillStyle = lineUp ? '#00e87a' : '#ff3d6b';
    ctx.fill();
  });
}

// ============================================================
// ACTION CARD MINI CHARTS (inline sparklines in action cards)
// ============================================================
let _drawMiniPending = false;
function drawActionMiniCharts() {
  if(_drawMiniPending) return; _drawMiniPending = true;
  requestAnimationFrame(() => { _drawMiniPending = false; _drawActionMiniChartsInner(); });
}
function _drawActionMiniChartsInner() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const ps = S.pairStates[pair];
    const pairKey = pair.replace('/','_');
    const canvasId = 'ac2_chart_'+pairKey;
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;

    const W = canvas.offsetWidth || canvas.parentElement.offsetWidth || 130;
    const H = 36;
    if(canvas.width !== W) canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const data = ps.candles.slice(-20);
    if(data.length < 2) return;
    ctx.clearRect(0,0,W,H);

    const mn = Math.min(...data.map(c=>c.l)), mx = Math.max(...data.map(c=>c.h));
    const rng = mx-mn||1;
    const lineUp = data[data.length-1].c >= data[0].c;

    const pts = data.map((c,i)=>({ x:(i/(data.length-1))*W, y:H-((c.c-mn)/rng)*(H-4)-2 }));

    // Fill
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,(lineUp?'rgba(0,232,122,':'rgba(255,61,107,')+'.2)');
    grad.addColorStop(1,(lineUp?'rgba(0,232,122,':'rgba(255,61,107,')+'.0)');
    ctx.beginPath(); ctx.moveTo(0,H);
    pts.forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.lineTo(W,H);
    ctx.fillStyle=grad; ctx.fill();

    // Line
    ctx.beginPath();
    pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle = lineUp?'#00e87a':'#ff3d6b';
    ctx.lineWidth=1.5; ctx.stroke();
  });
}

// ============================================================
// LEARNING ENGINE — Central agent reward/punishment system
// ============================================================

// Called whenever a signal outcome is known (trade closed, cycle resolved, position closed)
// source: 'trade'|'position'|'cycle'
// outcome: 'profit'|'loss'  (profit = agents who predicted correctly should be rewarded)
// pnlPct: actual % P&L (signed)
// pair: which pair this was on
// ============================================================
// MOTEUR D'APPRENTISSAGE ADAPTATIF — Correction d'erreurs permanente
// ============================================================
function learnFromOutcome(source, pnlPct, pair) {

  // v7.0: Update per-regime fitness
  if(source === 'trade' && typeof detectMarketRegime === 'function' && pnlPct != null) {
    const _regime = detectMarketRegime();
    S.agents.forEach(a => {
      // Agent ayant un score actif dans ce trade
      if(Math.abs(a.score||0) > 0.05) updateRegimeFitness(a, _regime, pnlPct);
    });
    S._lastRegime = _regime;
  }
  const won   = pnlPct > 0;
  const mag   = Math.abs(pnlPct);
  const decay = source==='position' ? 1.3 : source==='trade' ? 1.0 : 0.7;

  const adjustments = [];

  S.agents.forEach(a => {
    // Bots d'exécution : leur score reste 0 (role neutre), mais leur fitness évolue
    if(a.isBot) {
      let botReward = won ? mag * 5 : -mag * 1.2;  // v7.3 OPT · récompense ×2.5, pénalité /1.25
      // Plafond souple : un gain près de 2000 rapporte de moins en moins, pour
      // qu'un bot performant ne reste pas collé au maximum. Les pertes restent pleines.
      if(won) { const _headroom = Math.max(0.05, (2000 - (a.fitness || 0)) / 2000); botReward *= _headroom; }
      a.fitness = Math.max(50, Math.min(2000, a.fitness + botReward));  // v8.0 LIVRAISON 30 · FIX #2 · borne min unifiée à 50
      a.totalReward = (a.totalReward || 0) + botReward;  // v7.3 OPT · affichage réel dans l'UI
      a.learningEvents = (a.learningEvents || 0) + 1;  // v7.3 OPT · compteur visible
      return;
    }
    if(a.isMeta) {
      const metaReward = won ? mag * 2 : -mag * 0.5;  // v7.3 OPT · calcul extrait
      a.fitness = Math.max(50, a.fitness + metaReward);  // v8.0 LIVRAISON 30 · FIX #2 · borne min unifiée à 50
      a.totalReward = (a.totalReward || 0) + metaReward;  // v7.3 OPT · affichage réel
      a.learningEvents = (a.learningEvents || 0) + 1;  // v7.3 OPT · compteur visible
      return;
    }

    const aligned       = (won && a.score > 0) || (!won && a.score < 0);
    const signalStrength= Math.abs(a.score);
    const prevFitness   = a.fitness;
    const prevScore     = a.score;
    const prevConf      = a.conf;

    if(aligned) {
      // ── Agent correct : récompense + renforcement ──────────────
      const reward = signalStrength * mag * decay * 42;  // v7.2 TURBO · ×3 (ex: 14)
      a.fitness    = Math.min(2000, a.fitness + reward);  // v8.0 LIVRAISON 27 FIX · borne max unifiée à 2000
      a.learningEvents = (a.learningEvents||0) + 1;
      a.totalReward    = (a.totalReward||0) + reward;
      a.streak         = (a.streak||0) + 1;
      a.errors         = a.errors || 0;
      a.lastPnl        = pnlPct;
      // Augmenter confiance et renforcer signal dans la bonne direction
      a.conf  = Math.min(0.99, a.conf + signalStrength * 0.054);  // v7.2 TURBO · ×3 (ex: 0.018)
      a.score = Math.max(-1, Math.min(1, a.score + (won?1:-1) * signalStrength * 0.030));  // v7.2 TURBO · ×3 (ex: 0.010)
      // Stocker dans mémoire positive
      if(!a.memory) a.memory = [];
      enrichMemory(a, true, pnlPct, pair);
      if(a.memory.length > 20) a.memory.shift();
    } else {
      // ── Agent incorrect : pénalité + correction automatique ────
      const penalty = signalStrength * mag * decay * 18;  // v7.2 TURBO · ×3 (ex: 6)
      a.fitness = Math.max(50, a.fitness - penalty);  // v8.0 LIVRAISON 27 FIX · borne min unifiée à 50
      a.learningEvents = (a.learningEvents||0) + 1;
      a.totalReward    = (a.totalReward||0) - penalty;
      a.errors         = (a.errors||0) + 1;
      a.streak         = 0;
      a.lastPnl        = pnlPct;
      // CORRECTION : réduire confiance + inverser partiellement le score (apprentissage par erreur)
      a.conf  = Math.max(0.35, a.conf - signalStrength * 0.045);  // v7.2 TURBO · ×3 (ex: 0.015)
      // La correction est proportionnelle au nombre d'erreurs consécutives — s'adapte plus vite si récidive
      const correctionFactor = Math.min(0.075, 0.024 + (a.errors * 0.006));  // v7.2 TURBO · ×3
      a.score = Math.max(-1, Math.min(1, a.score - (won?1:-1) * signalStrength * correctionFactor));
      a.corrections = (a.corrections||0) + 1;
      // Stocker dans mémoire d'erreurs pour éviter de répéter
      if(!a.memory) a.memory = [];
      enrichMemory(a, false, pnlPct, pair);
      if(a.memory.length > 20) a.memory.shift();
    }

    // ── Auto-régulation : si l'agent accumule trop d'erreurs → reset partiel ──
    // v7.3 OPT · Deux conditions : fitness basse OU trop d'erreurs (même avec fitness correcte)
    if((a.errors >= 5 && a.fitness < 120) || a.errors >= 15) {
      // Réinitialisation douce : score revient vers 0, conf stabilisée
      a.score  = a.score * 0.3;  // retour vers neutralité
      a.conf   = 0.50;
      const reason = a.errors >= 15 ? 'trop d\'erreurs' : 'fitness critique';
      a.errors = 0;
      a.corrections = (a.corrections||0) + 1;
      // Le recalibrage est fréquent en marché CALM (les agents accumulent vite 15
      // "erreurs" sur les petits mouvements). On ne journalise qu'1 fois sur 5 pour
      // ne pas noyer le journal ni alourdir la sim (le splice répété coûtait du temps).
      if (Math.random() < 0.2) {
        S.chainLog.push({ icon:'🔄', desc:`${a.name} auto-recalibré · ${reason}`, hash:rndHash(), time:nowStr() });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
    }

    // ── Streak bonus ──
    if(a.streak >= 5) {
      a.fitness = Math.min(2000, a.fitness + 5);  // v8.0 LIVRAISON 27 FIX · borne max unifiée à 2000
    }

    // ── Fitness history for sparkline ──
    if(!a.fitnessHistory) a.fitnessHistory = [a.fitness];
    else {
      // Push only every ~3 learn events to avoid excessive array growth
      if(S._learnCount % 3 === 0) {
        a.fitnessHistory.push(Math.round(a.fitness));
        if(a.fitnessHistory.length > 80) a.fitnessHistory.shift();
      }
    }

    adjustments.push({
      agentId:   a.id,
      agentName: a.name,
      aligned,
      fitnessDelta: a.fitness - prevFitness,
      scoreDelta:   a.score   - prevScore,
      confDelta:    a.conf    - prevConf
    });
  });

  // ── Enregistrement historique ──────────────────────────────
  S.learningHistory.push({
    cycle:  S.cycle, pair, source,
    pnlPct: +pnlPct.toFixed(3),
    won, time: nowStr(), adjustments
  });
  if(S.learningHistory.length > 200) S.learningHistory.shift();

  // ── v7.3 OPT · MÉMOIRE INTER-AGENTS (shared lessons) ──────
  // Quand un trade est significatif (|pnl| > 0.5%), on enregistre une leçon
  // que tous les agents peuvent consulter avant leurs prochaines décisions.
  if(source === 'trade' && Math.abs(pnlPct) > 0.5) {
    
    const _lessonsTarget = (typeof _getLessonsTarget === 'function') ? _getLessonsTarget() :
                           (S.tradingMode === 'real' ? 'agentLessonsReal' :
                            S.tradingMode === 'paperReal' ? 'agentLessonsPaperReal' : 'agentLessons');
    if(!S[_lessonsTarget]) S[_lessonsTarget] = [];
    if(!S.agentLessons) S.agentLessons = [];
    // Direction gagnante du marché : si won, même signe que score dominant; sinon inverse
    const avgScoreDir = adjustments.reduce((s, adj) => s + Math.sign(adj.scoreDelta || 0), 0);
    const winningDir = won
      ? (avgScoreDir > 0 ? 1 : avgScoreDir < 0 ? -1 : (pnlPct > 0 ? 1 : -1))
      : -Math.sign(avgScoreDir || pnlPct || 1);
    S[_lessonsTarget].push({
      cycle:     S.cycle,
      time:      nowStr(),
      pair,
      pnlPct:    +pnlPct.toFixed(2),
      won,
      direction: winningDir,              // direction qui aurait dû être prise
      severity:  Math.min(1, Math.abs(pnlPct) / 3)  // 3% = max
    });
    if(S[_lessonsTarget].length > 30) S[_lessonsTarget].shift();
  }

  // ── Log blockchain tous les 3 événements ──────────────────
  S._learnCount = (S._learnCount||0) + 1;
  if(S._learnCount % 3 === 0) {
    const best    = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>b.fitness-a.fitness)[0];
    const weakest = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness)[0];
    S.chainLog.push({
      icon: '🧠',
      desc: `Learn[${source}][${pair}] ${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}% → 🏆${best?.name}(${Math.floor(best?.fitness||0)}T$) ⚠️${weakest?.name}(${Math.floor(weakest?.fitness||0)}T$)`,
      hash: rndHash(), time: nowStr()
    });
  }

  // ── Déclenchement évolution si agent très faible ──────────
  const sorted = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness);
  // v6.8: évolution infinie & agressive — déclenchement permanent
  if(sorted[0] && sorted[0].fitness < 150) {
    triggerEvolution(sorted[0]);  // agent faible → remplacement immédiat
  } else if(sorted[0] && S.cycle % 15 === 0) {
    triggerEvolution(sorted[0]);  // évolution cyclique forcée (toutes les 15 décisions)
  } else if(sorted[0] && sorted[0].fitness < 300 && S.cycle % 8 === 0) {
    triggerEvolution(sorted[0]);  // amélioration continue des agents en retard
  }
}

// ============================================================
// MÉMOIRE ÉPISODIQUE & MÉTAPHORES — Feature #1
// ============================================================

const METAPHOR_TEMPLATES = {
  won: [
    (a,p,pnl) => `Sur ${p}, j'ai détecté une convergence de signaux ${a.domain} renforcée par un momentum inhabituel. La conviction était haute — j'ai maintenu cap. Résultat: +${pnl.toFixed(2)}%. Retenir: la cohérence cross-temporelle précède souvent la confirmation de prix.`,
    (a,p,pnl) => `${p} montrait une divergence classique ${a.type.split('·')[0].trim()}. J'ai amplifié mon score au bon moment. +${pnl.toFixed(2)}% — signe que mes paramètres ${a.domain} étaient bien calibrés pour ce régime de marché.`,
    (a,p,pnl) => `Signal ${a.domain} sur ${p} — bruit filtré, essence conservée. Le marché a confirmé en ${pnl.toFixed(2)}% ce que j'avais perçu avant la foule. Mémoire à renforcer: confiance dans les signaux faibles persistants.`,
    (a,p,pnl) => `Architecture favorable sur ${p}: ${a.source.split('/')[0].trim()} en alignement avec le consensus LMSR. J'ai pesé juste. +${pnl.toFixed(2)}% encode une leçon: quand les sources divergentes convergent, la probabilité réelle dépasse le bruit.`,
  ],
  lost: [
    (a,p,pnl) => `${p} a inversé contre ma prédiction ${a.domain}. Erreur d'analyse: j'ai surestimé la persistance du signal ${a.type.split('·')[0].trim()}. ${pnl.toFixed(2)}% perdu — mémoriser: ce contexte de marché nuit à mon modèle. Réduire exposition en régimes similaires.`,
    (a,p,pnl) => `Signal ${a.domain} trompeur sur ${p}. Les données ${a.source.split('/')[0].trim()} étaient correctes mais le timing décalé — le marché n'était pas encore prêt. ${pnl.toFixed(2)}%. Leçon: la vérité prématurée ressemble à une erreur.`,
    (a,p,pnl) => `Sur ${p}, j'ai confondu signal fort avec signal correct. Amplitude ${a.domain} maximale mais direction opposée. ${pnl.toFixed(2)}%. Correction: la magnitude du signal ne garantit pas sa fiabilité en régime de bruit élevé.`,
    (a,p,pnl) => `${p} — contre-tendance inattendue. Mon modèle ${a.type.split('·')[0].trim()} n'avait pas capturé le retournement micro-structurel. ${pnl.toFixed(2)}%. À retenir: les anomalies de liquidité court-terme peuvent invalider les signaux fondamentaux.`,
  ]
};

function generateMetaphor(agent, won, pnlPct, pair) {
  const templates = won ? METAPHOR_TEMPLATES.won : METAPHOR_TEMPLATES.lost;
  const idx = Math.floor(Math.random() * templates.length);
  return templates[idx](agent, pair, pnlPct);
}

function enrichMemory(agent, won, pnlPct, pair) {
  if(!agent.memory) agent.memory = [];
  const metaphor = generateMetaphor(agent, won, pnlPct, pair);
  const context  = {
    lmsrProb:  lmsrP(S.pairStates[pair]),
    agentScore: agent.score,
    agentConf:  agent.conf,
    fitness:    agent.fitness,
    pairTrend:  (() => {
      const ps = S.pairStates[pair];
      if(!ps || ps.candles.length < 5) return 'unknown';
      const last5 = ps.candles.slice(-5);
      return last5[last5.length-1].c > last5[0].c ? 'up' : 'down';
    })()
  };
  const episode = {
    id:       Date.now() + Math.random(),
    won,
    pnl:      +pnlPct.toFixed(3),
    pair,
    cycle:    S.cycle,
    time:     nowStr(),
    metaphor,
    context,
    recalled: 0,   // how many times this memory has been recalled
  };
  agent.memory.push(episode);
  if(agent.memory.length > 30) agent.memory.shift();

  // Add to global memory pool (cross-agent knowledge)
  S.globalMemoryPool.push({ agentId: agent.id, agentName: agent.name, episode });
  if(S.globalMemoryPool.length > 80) S.globalMemoryPool.splice(0, 20);

  return episode;
}

function recallMemory(agent, pair, currentSignal) {
  // Find most relevant past memory for current situation
  if(!agent.memory || agent.memory.length === 0) return null;
  const ps = S.pairStates[pair];
  if(!ps) return null;
  const curLmsr = lmsrP(ps);
  const curTrend = (() => {
    if(ps.candles.length < 5) return 'unknown';
    const l5 = ps.candles.slice(-5);
    return l5[l5.length-1].c > l5[0].c ? 'up' : 'down';
  })();

  // Score each memory by contextual similarity
  let best = null, bestScore = -Infinity;
  agent.memory.forEach(ep => {
    if(!ep.context) return;
    const lmsrSim = 1 - Math.abs(ep.context.lmsrProb - curLmsr);
    const trendSim = ep.context.pairTrend === curTrend ? 1 : 0;
    const signalSim = 1 - Math.abs(ep.context.agentScore - currentSignal) / 2;
    const recency = Math.min(1, ep.cycle / Math.max(1, S.cycle)) * 0.3 + 0.7; // recent = slightly better
    const sim = (lmsrSim * 0.4 + trendSim * 0.35 + signalSim * 0.25) * recency;
    if(sim > bestScore) { bestScore = sim; best = ep; }
  });

  if(best && bestScore > 0.5) {
    best.recalled = (best.recalled || 0) + 1;
    return { memory: best, strength: bestScore };
  }
  return null;
}

function showMemoryOverlay(agentId) {
  const agent = S.agents.find(a => a.id === agentId);
  if(!agent || !agent.memory || agent.memory.length === 0) {
    showToast('📭 Aucune mémoire pour cet agent encore'); return;
  }
  let overlay = document.getElementById('memoryOverlay');
  if(!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'memoryOverlay';
    overlay.className = 'memory-overlay';
    document.body.appendChild(overlay);
  }
  const episodes = [...agent.memory].reverse();
  overlay.innerHTML = `
    <div class="memory-overlay-header">
      <div class="memory-overlay-title">${agent.emoji} ${agent.name} · Mémoire</div>
      <div class="memory-overlay-close" onclick="document.getElementById('memoryOverlay').remove()">✕</div>
    </div>
    <div class="memory-overlay-body">
      <div style="font-size:9px;color:var(--t3);margin-bottom:10px;letter-spacing:.06em;">
        ${agent.memory.length} ÉPISODES · ${agent.memory.filter(e=>e.won).length} GAGNANTS · POOL GLOBAL: ${S.globalMemoryPool.length}
      </div>
      ${episodes.map(ep => `
        <div class="memory-episode ${ep.won?'won':'lost'}">
          <div class="memory-episode-top">
            <span class="memory-episode-pair">${ep.pair} · Cycle #${ep.cycle}</span>
            <span class="memory-episode-pnl" style="color:${ep.won?'var(--up)':'var(--down)'}">
              ${ep.pnl>=0?'+':''}${ep.pnl}%
            </span>
          </div>
          <div class="memory-episode-text">"${ep.metaphor}"</div>
          <div class="memory-episode-foot">
            <span>📡 LMSR: ${ep.context ? (ep.context.lmsrProb*100).toFixed(0)+'%' : '—'}</span>
            <span>📈 Trend: ${ep.context?.pairTrend||'—'}</span>
            <span>🔁 Rappels: ${ep.recalled||0}</span>
            <span>🕐 ${ep.time}</span>
          </div>
        </div>`).join('')}
    </div>`;
  overlay.style.display = 'flex';
}

// ============================================================
// VERSION AUTO-INCREMENT — incrémente à chaque event majeur
// ============================================================

// ════════════════════════════════════════════════════════════
// v5.0 — BRAIN NETWORK · Canvas agent visualization
// ════════════════════════════════════════════════════════════
let _brainRAF = null;
let _brainNodes = null;
let _brainPhase = 0;

function initBrainNodes() {
  const canvas = document.getElementById('brainCanvas');
  if(!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  canvas.width  = W * (window.devicePixelRatio || 1);
  canvas.height = H * (window.devicePixelRatio || 1);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const agents = S.agents || [];
  const n = agents.length;
  if(!n) return null;
  
  // v7.12 · DISPOSITION EN INFINI ANIMÉ (Lemniscate de Bernoulli)
  // Les agents sont répartis uniformément sur la courbe ∞
  // Chaque agent a sa position initiale (tParam) qui évoluera dans drawBrainNetwork
  // v7.12 · ∞ amplitudes sûres pour rotation 3D continue
  // On utilise la plus petite dimension comme référence pour que même en rotation,
  // l'∞ ne dépasse jamais les bords (horizontal ou vertical)
  const safeDim = Math.min(W, H);
  const lemA = safeDim * 0.42;    // amplitude horizontale (∞)
  const lemAy = safeDim * 0.24;   // amplitude verticale (lobe ∞)
  // Ces amplitudes garantissent qu'à n'importe quel angle de rotation,
  // la formation reste entièrement visible
  const nodes = agents.map((a, i) => {
    // Position initiale de l'agent sur la courbe (0 à 2π)
    const tParam = (i / n) * Math.PI * 2;
    return {
      a, i,
      tParam,
      baseX: W/2,
      baseY: H/2,
      angle: tParam,
      rOrbit: lemA,               // amplitude horizontale ∞
      rOrbitY: lemAy,             // amplitude verticale ∞
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.002
    };
  });
  return { canvas, ctx: canvas.getContext('2d'), nodes, W, H };
}

// Helper: calcule position (x,y) sur la lemniscate à paramètre t
// aX = amplitude horizontale, aY = amplitude verticale (peuvent différer)
function _lemniscatePoint(t, a, aY) {
  const denom = 1 + Math.sin(t) * Math.sin(t);
  const yAmp = aY != null ? aY : a * 0.55;  // ∞ plus étiré horizontalement par défaut
  return {
    x: (a * Math.cos(t)) / denom,
    y: (yAmp * Math.sin(t) * Math.cos(t)) / denom
  };
}

// v7.12 · Brain Network FUTURISTIC · Holo-AI style + 3D rotation
let _brainParticles = [];
let _brainLearnPulse = 0;
let _brainLastSpawn = 0;
let _brainScanLine = 0;
let _brainGlitchUntil = 0;
let _brainDataStreams = [];
let _brainLastGlitch = 0;

// v7.12 · PIVOT 3D · ∞ tourne sur lui-même en restant centré
// Rotation continue lente sur 3 axes, toujours centré à l'écran
let _brain3D = {
  rotX: -0.2,  // position de départ légèrement inclinée
  rotY:  0.3,
  rotZ:  0,
  // Vitesses lentes et non-synchronisées pour un mouvement hypnotique
  speedX: 0.0035 + Math.random() * 0.0015,  // ~30s/tour
  speedY: 0.0028 + Math.random() * 0.0014,  // ~35s/tour
  speedZ: 0.0020 + Math.random() * 0.0010   // ~45s/tour
};

// v7.12 · Halo central de sagesse collective + trace fantôme de rotation
let _brainWisdom = 0;           // lissage de la force collective (0-1)
let _brainPrevRot = [];         // historique des rotations récentes (trace fantôme)

// Helper: projette un point 3D (x, y, z) en 2D après rotation
// Utilise une projection perspective simple
function _project3D(x, y, z, W, H) {
  // Rotation autour X (pitch)
  let y1 = y * Math.cos(_brain3D.rotX) - z * Math.sin(_brain3D.rotX);
  let z1 = y * Math.sin(_brain3D.rotX) + z * Math.cos(_brain3D.rotX);
  // Rotation autour Y (yaw)
  let x2 = x * Math.cos(_brain3D.rotY) + z1 * Math.sin(_brain3D.rotY);
  let z2 = -x * Math.sin(_brain3D.rotY) + z1 * Math.cos(_brain3D.rotY);
  // Rotation autour Z (roll)
  let x3 = x2 * Math.cos(_brain3D.rotZ) - y1 * Math.sin(_brain3D.rotZ);
  let y3 = x2 * Math.sin(_brain3D.rotZ) + y1 * Math.cos(_brain3D.rotZ);
  // Projection perspective (distance caméra)
  const camZ = Math.max(W, H) * 1.6;  // distance caméra (plus loin = moins de distorsion de perspective)
  const scale = camZ / (camZ + z2);
  return {
    x: W/2 + x3 * scale,
    y: H/2 + y3 * scale,
    depth: scale,      // 1.0 = centre, < 1 = derrière, > 1 = devant
    z: z2
  };
}

function _spawnBrainParticle(fromNode, toX, toY, color, speed, isReverse) {
  _brainParticles.push({
    x: fromNode.x, y: fromNode.y,
    tx: toX, ty: toY,
    sx: fromNode.x, sy: fromNode.y,
    t: 0, speed: speed || 0.025,
    color: color,
    size: 1.5 + Math.random() * 1.5,
    life: 1.0,
    reverse: isReverse
  });
}

function drawBrainNetwork() {
  if(!_brainNodes) _brainNodes = initBrainNodes();
  if(!_brainNodes) return;

  const { canvas, ctx, nodes, W, H } = _brainNodes;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  _brainPhase += 0.012;
  _brainLearnPulse += 0.04;
  _brainScanLine = (_brainScanLine + 1.2) % (H + 80);

  const now = performance.now();
  
  // Grille hex arrière-plan
  ctx.strokeStyle = 'rgba(56,212,245,0.018)';  // v7.12 refinement : hex plus discret
  ctx.lineWidth = 0.4;
  const hexSize = 24;
  for (let row = 0; row * hexSize * 0.87 < H + hexSize; row++) {
    for (let col = 0; col * hexSize * 1.5 < W + hexSize; col++) {
      const cx = col * hexSize * 1.5 + (row % 2 ? hexSize * 0.75 : 0);
      const cy = row * hexSize * 0.87;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const x = cx + Math.cos(a) * hexSize * 0.5;
        const y = cy + Math.sin(a) * hexSize * 0.5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  // v7.12 · TRACÉ ∞ GUIDE (cohérent avec pivot 3D)
  const breathFactor = 1 + Math.sin(_brainLearnPulse * 0.3) * 0.03;
  const safeDim = Math.min(W, H);
  const lemAmpX = safeDim * 0.42 * breathFactor;
  const lemAmpY = safeDim * 0.24 * breathFactor;
  ctx.strokeStyle = 'rgba(167,139,250,0.12)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  const lemSteps = 90;
  for (let i = 0; i <= lemSteps; i++) {
    const t = (i / lemSteps) * Math.PI * 2;
    const pt = _lemniscatePoint(t, lemAmpX, lemAmpY);
    // Projection 3D
    const p = _project3D(pt.x, pt.y, 0, W, H);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  
  // Pointillés énergétiques (aussi en 3D)
  ctx.strokeStyle = 'rgba(167,139,250,0.25)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 8]);
  ctx.lineDashOffset = -_brainPhase * 40;
  ctx.beginPath();
  for (let i = 0; i <= lemSteps; i++) {
    const t = (i / lemSteps) * Math.PI * 2;
    const pt = _lemniscatePoint(t, lemAmpX, lemAmpY);
    const p = _project3D(pt.x, pt.y, 0, W, H);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  // v7.12 · TRACES FANTÔMES : dessine 3-4 ∞ très estompés aux rotations précédentes
  // Donne un effet de mouvement subtil, comme une photo longue exposition
  if (_brainPrevRot.length > 1) {
    const savedRot = { rotX: _brain3D.rotX, rotY: _brain3D.rotY, rotZ: _brain3D.rotZ };
    _brainPrevRot.forEach((prev, idx) => {
      if (idx === _brainPrevRot.length - 1) return;  // skip latest (c'est le courant)
      const ghostAlpha = 0.035 * (idx + 1) / _brainPrevRot.length;  // plus récent = plus opaque
      // Applique temporairement la rotation fantôme
      _brain3D.rotX = prev.rotX;
      _brain3D.rotY = prev.rotY;
      _brain3D.rotZ = prev.rotZ;
      ctx.strokeStyle = 'rgba(167,139,250,' + ghostAlpha + ')';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let i = 0; i <= lemSteps; i++) {
        const t = (i / lemSteps) * Math.PI * 2;
        const pt = _lemniscatePoint(t, lemAmpX, lemAmpY);
        const p = _project3D(pt.x, pt.y, 0, W, H);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    // Restaure la rotation courante
    _brain3D.rotX = savedRot.rotX;
    _brain3D.rotY = savedRot.rotY;
    _brain3D.rotZ = savedRot.rotZ;
  }

  // Ligne de scan
  const scanY = _brainScanLine;
  const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
  scanGrad.addColorStop(0, 'rgba(56,212,245,0)');
  scanGrad.addColorStop(0.5, 'rgba(56,212,245,0.065)');  // v7.12 refinement : scan plus doux
  scanGrad.addColorStop(1, 'rgba(56,212,245,0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 40, W, 80);
  ctx.strokeStyle = 'rgba(56,212,245,0.35)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(W, scanY);
  ctx.stroke();

  // Flux matrix
  if (Math.random() < 0.05 && _brainDataStreams.length < 3) {  // v7.12 refinement : matrix plus rare
    _brainDataStreams.push({
      x: Math.random() * W,
      y: -10,
      speed: 0.8 + Math.random() * 1.2
    });
  }
  _brainDataStreams = _brainDataStreams.filter(s => {
    s.y += s.speed;
    if (s.y > H + 20) return false;
    ctx.fillStyle = 'rgba(0,232,122,' + (0.15 * (1 - s.y/H)) + ')';
    ctx.font = '9px monospace';
    for (let i = 0; i < 8; i++) {
      const ch = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
      ctx.fillText(ch, s.x, s.y - i * 10);
    }
    return true;
  });

  // v7.12 · Disposition dynamique en ∞ : les agents circulent sur la courbe
  // _brainPhase fait avancer la position collective
  // v7.12 · PIVOT 3D · rotation continue du ∞ sur lui-même
  _brain3D.rotX += _brain3D.speedX;
  _brain3D.rotY += _brain3D.speedY;
  _brain3D.rotZ += _brain3D.speedZ;
  
  // v7.12 · TRACE FANTÔME : snapshot périodique des rotations pour dessin ultérieur
  if (nodes.length > 0 && (_brainParticles.length % 15 === 0 || _brainPrevRot.length === 0)) {
    _brainPrevRot.push({ rotX: _brain3D.rotX, rotY: _brain3D.rotY, rotZ: _brain3D.rotZ });
    if (_brainPrevRot.length > 4) _brainPrevRot.shift();  // garde 4 derniers
  }
  
  nodes.forEach(n => {
    n.tParam += n.speed;
    // Position 3D sur la lemniscate (z = 0 pour que ce soit planaire)
    const pt = _lemniscatePoint(n.tParam, n.rOrbit, n.rOrbitY);
    const wobble = Math.sin(_brainPhase + n.phase) * 2;
    // Coordonnées 3D locales de l'agent (z légèrement varié pour profondeur)
    const x3d = pt.x + Math.cos(n.phase * 2) * wobble;
    const y3d = pt.y + Math.sin(n.phase * 2) * wobble;
    const z3d = 0;  // plan ∞ à z=0
    // Projection 3D → 2D
    const proj = _project3D(x3d, y3d, z3d, W, H);
    n.x = proj.x;
    n.y = proj.y;
    n.depth = proj.depth;  // stocké pour z-ordering + scaling
    n.z3d = proj.z;
  });
  
  // v7.12 · Z-ordering : trier les nœuds pour dessiner les plus éloignés d'abord
  nodes.sort((a, b) => (b.z3d || 0) - (a.z3d || 0));

  const avgScore = nodes.reduce((s,n) => s + (n.a.score||0)*(n.a.fitness||1), 0)
                 / Math.max(.001, nodes.reduce((s,n) => s + (n.a.fitness||1), 0));
  const consColor = avgScore > 0.1 ? 'rgba(0,232,122,.9)'
                  : avgScore < -0.1 ? 'rgba(255,61,107,.9)'
                  : 'rgba(167,139,250,.7)';
  const consColorHex = avgScore > 0.1 ? '0,232,122' : avgScore < -0.1 ? '255,61,107' : '167,139,250';

  if (now - _brainLastGlitch > 3500 + Math.random() * 1500) {
    _brainGlitchUntil = now + 120 + Math.random() * 80;
    _brainLastGlitch = now;
  }
  const inGlitch = now < _brainGlitchUntil;

  // Mesh inter-agents
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const ni = nodes[i], nj = nodes[j];
      const aligned = (ni.a.score || 0) * (nj.a.score || 0) > 0.01;
      if (aligned && Math.random() < 0.25) {
        const pulseOpacity = 0.08 + Math.abs(Math.sin(_brainPhase * 1.5 + i + j)) * 0.08;
        ctx.strokeStyle = 'rgba(' + consColorHex + ',' + pulseOpacity + ')';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(ni.x, ni.y);
        ctx.lineTo(nj.x, nj.y);
        ctx.stroke();
      }
    }
  }

  // Lasers agents → centre
  nodes.forEach(n => {
    const sc = n.a.score || 0;
    const absSc = Math.min(1, Math.abs(sc));
    const col = sc > 0.05 ? '0,232,122' : sc < -0.05 ? '255,61,107' : '167,139,250';
    const pulse = 0.4 + Math.abs(Math.sin(_brainPhase * 2 + n.phase)) * 0.5;
    
    const grad = ctx.createLinearGradient(n.x, n.y, W/2, H/2);
    grad.addColorStop(0, 'rgba(' + col + ',' + (absSc * pulse * 0.25) + ')');
    grad.addColorStop(0.4, 'rgba(' + col + ',' + (absSc * pulse * 0.55) + ')');
    grad.addColorStop(1, 'rgba(' + col + ',' + (absSc * pulse * 0.85) + ')');
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(.5, absSc * 2.8);
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(W/2, H/2);
    ctx.stroke();
    
    if (absSc > 0.3) {
      ctx.strokeStyle = 'rgba(' + col + ',' + (absSc * 0.6) + ')';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(W/2, H/2);
      ctx.stroke();
    }
  });

  // Particules
  if (now - _brainLastSpawn > 80) {
    const activeNodes = nodes.filter(n => Math.abs(n.a.score || 0) > 0.06);
    if (activeNodes.length > 0) {
      const count = 1 + (Math.random() < 0.3 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const picked = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        const sc = picked.a.score || 0;
        const col = sc > 0 ? '0,232,122' : '255,61,107';
        if (Math.random() < 0.65) {
          _spawnBrainParticle(picked, W/2, H/2, col, 0.03 + Math.abs(sc) * 0.03, false);
        } else {
          _spawnBrainParticle({x: W/2, y: H/2}, picked.x, picked.y, '167,139,250', 0.025, true);
        }
      }
    }
    _brainLastSpawn = now;
  }

  _brainParticles = _brainParticles.filter(p => {
    p.t += p.speed;
    if (p.t >= 1) return false;
    const ease = p.t * p.t * (3 - 2 * p.t);
    p.x = p.sx + (p.tx - p.sx) * ease;
    p.y = p.sy + (p.ty - p.sy) * ease;
    const alpha = p.t < 0.15 ? p.t * 6.7 : p.t > 0.85 ? (1 - p.t) * 6.7 : 1;
    
    const haloGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    haloGrad.addColorStop(0, 'rgba(' + p.color + ',' + (alpha * 0.6) + ')');
    haloGrad.addColorStop(1, 'rgba(' + p.color + ',0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(' + p.color + ',' + (alpha * 0.95) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.7) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(' + p.color + ',' + (alpha * 0.4) + ')';
    ctx.lineWidth = p.size * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const backT = Math.max(0, p.t - 0.12);
    const backEase = backT * backT * (3 - 2 * backT);
    const bx = p.sx + (p.tx - p.sx) * backEase;
    const by = p.sy + (p.ty - p.sy) * backEase;
    ctx.moveTo(bx, by);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    
    return true;
  });

  // v7.12 · HALO CENTRAL DE SAGESSE COLLECTIVE (maintenant avgScore est défini)
  const convincedCount = nodes.filter(n => Math.abs(n.a.score || 0) > 0.2).length;
  const collectiveStrength = Math.min(1, convincedCount / 8);
  _brainWisdom += (collectiveStrength - _brainWisdom) * 0.04;
  if (_brainWisdom > 0.1) {
    const wisdomR = 35 + _brainWisdom * 40;
    const wisdomGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, wisdomR);
    wisdomGrad.addColorStop(0, 'rgba(' + consColorHex + ',' + (_brainWisdom * 0.14) + ')');
    wisdomGrad.addColorStop(0.5, 'rgba(' + consColorHex + ',' + (_brainWisdom * 0.06) + ')');
    wisdomGrad.addColorStop(1, 'rgba(' + consColorHex + ',0)');
    ctx.fillStyle = wisdomGrad;
    ctx.beginPath();
    ctx.arc(W/2, H/2, wisdomR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Centre AI Core
  const thinkPulse = 1 + Math.sin(_brainLearnPulse * 0.7) * 0.15;
  const haloR = (12 + Math.abs(avgScore) * 14) * thinkPulse;
  const haloGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, haloR + 18);
  haloGrad.addColorStop(0, consColor);
  haloGrad.addColorStop(0.3, 'rgba(' + consColorHex + ',0.30)');
  haloGrad.addColorStop(0.7, 'rgba(' + consColorHex + ',0.08)');
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(W/2, H/2, haloR + 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(' + consColorHex + ',0.45)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -_brainPhase * 35;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 16 + Math.sin(_brainLearnPulse) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(' + consColorHex + ',0.25)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 8]);
  ctx.lineDashOffset = _brainPhase * 25;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 22 + Math.sin(_brainLearnPulse * 0.8) * 2, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(167,139,250,0.20)';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([1, 4]);
  ctx.lineDashOffset = -_brainPhase * 45;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  // Crosshair
  ctx.strokeStyle = 'rgba(' + consColorHex + ',0.35)';
  ctx.lineWidth = 0.5;
  const crossR = 9;
  ctx.beginPath();
  ctx.moveTo(W/2 - crossR, H/2); ctx.lineTo(W/2 - 4, H/2);
  ctx.moveTo(W/2 + 4, H/2); ctx.lineTo(W/2 + crossR, H/2);
  ctx.moveTo(W/2, H/2 - crossR); ctx.lineTo(W/2, H/2 - 4);
  ctx.moveTo(W/2, H/2 + 4); ctx.lineTo(W/2, H/2 + crossR);
  ctx.stroke();

  ctx.fillStyle = consColor;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 4 + Math.sin(_brainLearnPulse * 2) * 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(W/2, H/2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Agents hexagonaux
  nodes.forEach(n => {
    const sc = n.a.score || 0;
    const fit = n.a.fitness || 1;
    const absSc = Math.min(1, Math.abs(sc));
    // v7.12 · Taille selon fitness + conviction + PROFONDEUR 3D
    const baseSize = 3 + Math.min(5, fit / 250);
    const convBoost = absSc > 0.4 ? 2 : absSc > 0.2 ? 1 : 0;
    const depthFactor = n.depth || 1;  // 3D depth scaling
    const size = (baseSize + convBoost) * depthFactor;
    // Opacité adaptée à la profondeur (plus loin = plus transparent)
    const depthAlpha = 0.4 + depthFactor * 0.6;  // 0.4 (loin) à 1.0 (proche)
    const col = sc > 0.1 ? 'rgba(0,232,122,1)'
              : sc < -0.1 ? 'rgba(255,61,107,1)'
              : 'rgba(180,190,210,1)';
    const colHex = sc > 0.1 ? '0,232,122' : sc < -0.1 ? '255,61,107' : '180,190,210';
    
    let dx = 0, dy = 0;
    if (inGlitch && Math.random() < 0.3) {
      dx = (Math.random() - 0.5) * 4;
      dy = (Math.random() - 0.5) * 4;
    }
    const nx = n.x + dx, ny = n.y + dy;
    
    const glowPulse = Math.abs(Math.sin(_brainLearnPulse + n.phase));
    const glowR = size + 8 + glowPulse * (4 + absSc * 8);
    const glowGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR);
    glowGrad.addColorStop(0, 'rgba(' + colHex + ',' + (0.35 + absSc * 0.45) + ')');
    glowGrad.addColorStop(0.5, 'rgba(' + colHex + ',' + (0.12 * absSc) + ')');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
    ctx.fill();
    
    if (absSc > 0.2) {
      ctx.strokeStyle = 'rgba(' + colHex + ',' + (0.45 + glowPulse * 0.35) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(nx, ny, size + 3 + glowPulse * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      
      if (absSc > 0.4) {
        ctx.strokeStyle = 'rgba(' + colHex + ',0.2)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 3]);
        ctx.lineDashOffset = -_brainPhase * 20;
        ctx.beginPath();
        ctx.arc(nx, ny, size + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
    }
    
    // === ORBITE EN INFINI (∞) — Lemniscate de Bernoulli ===
    // Core : cercle plein coloré
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(nx, ny, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Bordure cœur (fine ligne blanche)
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + absSc * 0.35) + ')';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    
    // === Tracé du chemin infini (∞) en fond ===
    // Formule lemniscate : x = a*cos(t) / (1+sin²(t)), y = a*sin(t)*cos(t) / (1+sin²(t))
    const infA = size + 4;  // demi-largeur de l'infini (adaptée à la nouvelle taille)
    // Chaque agent a son propre angle de rotation pour varier
    const infRot = n.phase * 0.3;  // orientation fixe par agent
    const cosR = Math.cos(infRot);
    const sinR = Math.sin(infRot);
    
    // Dessine le chemin infini (tracé complet subtil)
    ctx.strokeStyle = 'rgba(' + colHex + ',' + (0.35 + absSc * 0.3) + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const denom = 1 + Math.sin(t) * Math.sin(t);
      const lx = (infA * Math.cos(t)) / denom;
      const ly = (infA * Math.sin(t) * Math.cos(t)) / denom;
      // Rotation selon infRot
      const rx = lx * cosR - ly * sinR;
      const ry = lx * sinR + ly * cosR;
      if (i === 0) ctx.moveTo(nx + rx, ny + ry);
      else ctx.lineTo(nx + rx, ny + ry);
    }
    ctx.stroke();
    
    // === Électron qui parcourt l'infini ===
    const infT = (_brainPhase * 1.3 + n.phase * 2) % (Math.PI * 2);
    const infDenom = 1 + Math.sin(infT) * Math.sin(infT);
    const ilx = (infA * Math.cos(infT)) / infDenom;
    const ily = (infA * Math.sin(infT) * Math.cos(infT)) / infDenom;
    const ex = nx + (ilx * cosR - ily * sinR);
    const ey = ny + (ilx * sinR + ily * cosR);
    
    // Halo autour de l'électron
    const eHalo = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3.5);
    eHalo.addColorStop(0, 'rgba(' + colHex + ',0.8)');
    eHalo.addColorStop(1, 'rgba(' + colHex + ',0)');
    ctx.fillStyle = eHalo;
    ctx.beginPath();
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Traînée (3 points précédents sur la courbe)
    for (let tr = 1; tr <= 3; tr++) {
      const trT = (infT - tr * 0.08 + Math.PI * 2) % (Math.PI * 2);
      const trDenom = 1 + Math.sin(trT) * Math.sin(trT);
      const trLx = (infA * Math.cos(trT)) / trDenom;
      const trLy = (infA * Math.sin(trT) * Math.cos(trT)) / trDenom;
      const trX = nx + (trLx * cosR - trLy * sinR);
      const trY = ny + (trLx * sinR + trLy * cosR);
      ctx.fillStyle = 'rgba(' + colHex + ',' + (0.5 - tr * 0.15) + ')';
      ctx.beginPath();
      ctx.arc(trX, trY, 1.5 - tr * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Électron principal (point blanc brillant)
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.4, 0, Math.PI * 2);
    ctx.fill();
    
    if(n.a.emoji) {
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.a.emoji, nx, ny);
    }
  });

  // Scan-lines CRT
  ctx.fillStyle = 'rgba(56,212,245,0.008)';  // v7.12 refinement : CRT plus subtle
  for (let y = 0; y < H; y += 4) {  // espacement plus grand
    ctx.fillRect(0, y, W, 1);
  }

  const consLbl = document.getElementById('brainConsVal');
  if(consLbl) {
    const pct = Math.round(avgScore * 100);
    const txt = pct > 0 ? '+' + pct + '%' : pct + '%';
    if(consLbl.textContent !== txt) consLbl.textContent = txt;
    consLbl.style.color = pct > 5 ? 'var(--up)' : pct < -5 ? 'var(--down)' : 'var(--t2)';
  }

  _brainRAF = requestAnimationFrame(drawBrainNetwork);
}

// v7.12 · PACK RÉSILIENCE · Brain animation OFF par défaut (économie CPU)
let _brainAnimDisabled = true;  // true = animation désactivée (rendu 1 fois statique)
let _brainStaticDrawn = false;

function startBrainAnim() {
  if(_brainRAF) return;
  _brainNodes = null; // force re-init on size change
  
  // v7.12 · Si animation OFF, dessiner 1 seule fois (statique) et ne pas loop
  if (_brainAnimDisabled) {
    if (!_brainStaticDrawn) {
      // Patch : on laisse drawBrainNetwork dessiner, mais on bloque le requestAnimationFrame
      const origRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = function() { return 0; };  // ne rien faire
      try {
        drawBrainNetwork();  // dessine une frame
      } catch(e) {}
      window.requestAnimationFrame = origRAF;  // restaure
      _brainStaticDrawn = true;
    }
    return;
  }
  
  drawBrainNetwork();
  // v5.1 · wire tap handler once
  setTimeout(initBrainInteraction, 150);
}

// Toggle pour réactiver si besoin (dev console)
window.toggleBrainAnim = function() {
  _brainAnimDisabled = !_brainAnimDisabled;
  _brainStaticDrawn = false;
  if (_brainRAF) { cancelAnimationFrame(_brainRAF); _brainRAF = null; }
  startBrainAnim();
  if (typeof showToast === 'function') {
    showToast('🧠 Brain animation ' + (_brainAnimDisabled ? 'OFF (statique)' : 'ON'), 2500, 'user');
  }
  return !_brainAnimDisabled;
};
function stopBrainAnim() {
  if(_brainRAF) { cancelAnimationFrame(_brainRAF); _brainRAF = null; }
}

// Restart brain when window resizes
window.addEventListener('resize', () => {
  if(S.currentPage === 0) {
    stopBrainAnim();
    setTimeout(startBrainAnim, 120);
  }
});

// ════════════════════════════════════════════════════════════
// v5.0 — MARKET MOOD BAR · Live consensus indicator
// ════════════════════════════════════════════════════════════
function updateMarketMood() {
  // Aggregate LMSR probabilities across pairs weighted by volume
  let totalProb = 0, totalWeight = 0;
  Object.values(S.pairStates || {}).forEach(ps => {
    const p = lmsrP(ps);
    const w = (ps.totalTrades || 0) + 1;
    totalProb  += p * w;
    totalWeight += w;
  });
  const avgProb = totalWeight > 0 ? totalProb / totalWeight : 0.5;
  const pct = Math.round(avgProb * 100);

  const fill = document.getElementById('moodIndicatorFill');
  const lbl  = document.getElementById('moodLabel');
  const pctEl= document.getElementById('moodPct');

  if(fill) {
    fill.style.left = pct + '%';
    if(pct > 60) {
      fill.style.background = 'var(--up)';
      fill.style.boxShadow  = '0 0 14px var(--up)';
    } else if(pct < 40) {
      fill.style.background = 'var(--down)';
      fill.style.boxShadow  = '0 0 14px var(--down)';
    } else {
      fill.style.background = 'var(--gold)';
      fill.style.boxShadow  = '0 0 10px var(--gold)';
    }
  }
  if(lbl) {
    lbl.textContent = pct > 65 ? 'EUPHORIE'
                    : pct > 55 ? 'OPTIMISTE'
                    : pct > 45 ? 'NEUTRE'
                    : pct > 35 ? 'PRUDENT'
                    : 'PESSIMISTE';
  }
  if(pctEl) pctEl.textContent = pct + '%';
}

// ════════════════════════════════════════════════════════════
// v5.0 — BOT THOUGHTS TICKER · Live narration
// ════════════════════════════════════════════════════════════
function buildThoughtPhrase() {
  const agents = S.agents || [];
  if(!agents.length) return 'Initialisation...';
  const pairs = Object.keys(S.pairStates || {});
  if(!pairs.length) return 'Chargement des paires...';

  const parts = [];
  // Pick top agent by |score*fitness|
  const sorted = [...agents].sort((a,b) => Math.abs(b.score*b.fitness) - Math.abs(a.score*a.fitness));
  const top = sorted[0];
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const ps = S.pairStates[pair];

  const actionColor = top.score > 0.1 ? 'th-up' : top.score < -0.1 ? 'th-down' : '';
  const priceStr = ps && ps.price ? (ps.price < 10 ? ps.price.toFixed(4) : '$'+Math.floor(ps.price).toLocaleString()) : '—';

  // Templates (varied for richness)
  const templates = [
    `<span class="th-agent">${top.emoji||'•'} ${top.name}</span> <span class="th-sep">&middot;</span> score <span class="${actionColor}">${(top.score>=0?'+':'')}${top.score.toFixed(2)}</span> sur <span class="th-asset">${pair}</span> &agrave; ${priceStr}`,
    `<span class="th-asset">${pair}</span> &rarr; consensus agents <span class="${actionColor}">${top.score>0?'haussier':top.score<0?'baissier':'neutre'}</span> <span class="th-sep">&middot;</span> fitness <span class="th-agent">${(top.fitness||0).toFixed(0)} T$</span>`,
    `<span class="th-agent">${top.emoji||'•'} ${top.name}</span> d&eacute;tecte <span class="th-sep">&middot;</span> conv. ${Math.abs(top.score*100).toFixed(0)}% <span class="th-sep">&middot;</span> <span class="th-asset">${pair}</span>`,
    `Analyse r&eacute;gime <span class="th-asset">${pair}</span> <span class="th-sep">&middot;</span> volatilit&eacute; ${(Math.random()*3+.5).toFixed(2)}% <span class="th-sep">&middot;</span> ${S.openPositions.length} position${S.openPositions.length>1?'s':''} ouverte${S.openPositions.length>1?'s':''}`,
  ];
  return templates[Math.floor(Math.random()*templates.length)];
}

function updateBotThoughts() {
  const el = document.getElementById('thoughtsText');
  if(!el) return;
  // Only update when ~end of marquee cycle
  const now = Date.now();
  if(window._lastThoughtTs && (now - window._lastThoughtTs) < 11000) return;
  window._lastThoughtTs = now;
  el.innerHTML = buildThoughtPhrase() + '&nbsp;&nbsp;&nbsp;';
}

// ════════════════════════════════════════════════════════════
// v5.2 — FISCAL MINI · live tax projection on home
// ════════════════════════════════════════════════════════════
function updateFiscalMini() {
  const wrap = document.getElementById('fiscalMini');
  if(!wrap) return;

  // Only show if some activity has happened
  if(!S.fees || !S.fees.totalPnlGross) {
    wrap.style.display = 'none';
    return;
  }

  const tc = S.taxConfig;
  const region = tc.region || 'LU';
  const reg = tc.regions && tc.regions[region];
  if(!reg) { wrap.style.display = 'none'; return; }

  const gross = S.fees.totalPnlGross || 0;
  const taxableBase = gross * (reg.inclusion || 1);
  const estTax = Math.max(0, taxableBase * (reg.rate || 0));
  const netAfter = gross - estTax;

  // Hide if no real signal to show
  if(Math.abs(gross) < 0.5) { wrap.style.display = 'none'; return; }

  wrap.style.display = '';
  const detailEl = document.getElementById('fiscalMiniDetail');
  const valEl    = document.getElementById('fiscalMiniVal');
  if(detailEl) {
    const ratePct = Math.round((reg.rate || 0) * 100);
    detailEl.innerHTML = 'P&amp;L brut: <strong style="color:var(--t1);">' + (gross>=0?'+':'') + '$'+gross.toFixed(1) +
      '</strong> &middot; ' + region + ' ' + ratePct + '% &middot; net ~$' + netAfter.toFixed(0);
  }
  if(valEl) {
    valEl.textContent = '−$' + estTax.toFixed(1);
    valEl.className = 'fiscal-mini-val' + (estTax > 0 ? ' loss' : '');
  }
}

// ════════════════════════════════════════════════════════════
// v5.3 — INTELLIGENCE ANALYTICS (5 features)
// ════════════════════════════════════════════════════════════

// ── Global analytics state ──
let _analyticsTab = 'perf';

// ── Utility: Pearson correlation ──

// ════════════════════════════════════════════════════════════
// 1. ADVANCED PERFORMANCE METRICS (Sharpe, Sortino, Calmar, etc)
// ════════════════════════════════════════════════════════════
function computeAdvancedMetrics() {
  const allTrades = Object.values(S.pairStates).flatMap(ps => 
    (ps.trades||[]).filter(t => t.type === 'position' && t.pnlUsdt != null)
  );
  if(allTrades.length < 2) return null;

  const returnsUsd = allTrades.map(t => t.pnlUsdt || 0);
  const returnsPct = allTrades.map(t => t.pnl || 0);

  const avgUsd   = returnsUsd.reduce((a,b)=>a+b,0) / returnsUsd.length;
  const avgPct   = returnsPct.reduce((a,b)=>a+b,0) / returnsPct.length;
  const stdPct   = Math.sqrt(returnsPct.reduce((s,v)=>s+(v-avgPct)**2,0) / returnsPct.length) || 0.01;

  // Sharpe (annualized assuming 1 trade ~ 1 unit time)
  const sharpe = avgPct / stdPct * Math.sqrt(252);

  // Sortino (downside deviation only)
  const downside = returnsPct.filter(r => r < avgPct);
  const downStd  = downside.length > 0
    ? Math.sqrt(downside.reduce((s,v)=>s+(v-avgPct)**2,0) / downside.length) || 0.01
    : 0.01;
  const sortino = avgPct / downStd * Math.sqrt(252);

  // Max Drawdown — cumulative equity curve
  let peakUsd = 0, curUsd = 0, maxDDUsd = 0, maxDDPct = 0;
  returnsUsd.forEach(r => {
    curUsd += r;
    if(curUsd > peakUsd) peakUsd = curUsd;
    const ddUsd = curUsd - peakUsd;
    if(ddUsd < maxDDUsd) {
      maxDDUsd = ddUsd;
      maxDDPct = peakUsd > 0 ? (ddUsd / peakUsd * 100) : 0;
    }
  });

  // Calmar = annual return / |maxDD|
  const totalPnl    = returnsUsd.reduce((a,b)=>a+b,0);
  const annualRet   = avgPct * 252;
  const calmar      = Math.abs(maxDDPct) > 0.1 ? annualRet / Math.abs(maxDDPct) : 0;

  // Profit Factor
  const wins       = returnsPct.filter(r => r > 0);
  const losses     = returnsPct.filter(r => r < 0);
  const grossWin   = wins.reduce((a,b)=>a+b,0);
  const grossLoss  = Math.abs(losses.reduce((a,b)=>a+b,0));
  const profitFactor = grossLoss > 0.001 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0);

  // Expectancy
  const winRate    = wins.length / returnsPct.length;
  const avgWin     = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLossAbs = losses.length > 0 ? grossLoss / losses.length : 0;
  const expectancy = (winRate * avgWin) - ((1-winRate) * avgLossAbs);

  // Max consecutive losses
  let maxConsecLoss = 0, curConsec = 0;
  returnsPct.forEach(r => {
    if(r < 0) { curConsec++; maxConsecLoss = Math.max(maxConsecLoss, curConsec); }
    else curConsec = 0;
  });

  return {
    sharpe, sortino, calmar, maxDDPct, maxDDUsd,
    profitFactor, expectancy, winRate: winRate*100,
    avgWin, avgLoss: avgLossAbs, maxConsecLoss,
    tradesCount: returnsPct.length, totalPnl
  };
}

function renderPerfMetricsPanel() {
  const el = document.getElementById('apanel-perf');
  if(!el) return;
  const m = computeAdvancedMetrics();
  if(!m) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">En attente des premiers trades…</div>';
    return;
  }
  const fmtN  = (v, d=2) => isFinite(v) ? v.toFixed(d) : '—';
  const col   = v => v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--gold)';
  const rate  = (v, g, ok) => v >= g ? 'var(--up)' : v >= ok ? 'var(--gold)' : 'var(--down)';

  el.innerHTML = `
    <div class="perf-metrics-grid">
      <div class="perf-metric hl">
        <div class="perf-metric-name">SHARPE</div>
        <div class="perf-metric-val" style="color:${rate(m.sharpe, 1.5, 0.5)};">${fmtN(m.sharpe, 2)}</div>
        <div class="perf-metric-sub">${m.sharpe >= 2 ? 'Excellent' : m.sharpe >= 1 ? 'Bon' : m.sharpe >= 0 ? 'Modeste' : 'Faible'}</div>
      </div>
      <div class="perf-metric hl">
        <div class="perf-metric-name">SORTINO</div>
        <div class="perf-metric-val" style="color:${rate(m.sortino, 2, 1)};">${fmtN(m.sortino, 2)}</div>
        <div class="perf-metric-sub">Downside only</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">CALMAR</div>
        <div class="perf-metric-val" style="color:${rate(m.calmar, 3, 1)};">${fmtN(m.calmar, 2)}</div>
        <div class="perf-metric-sub">Ret/DD</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">PROFIT FACT.</div>
        <div class="perf-metric-val" style="color:${rate(m.profitFactor, 2, 1.2)};">${fmtN(m.profitFactor, 2)}</div>
        <div class="perf-metric-sub">Win/Loss</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">EXPECTANCY</div>
        <div class="perf-metric-val" style="color:${col(m.expectancy)};">${m.expectancy >= 0 ? '+' : ''}${fmtN(m.expectancy, 2)}%</div>
        <div class="perf-metric-sub">par trade</div>
      </div>
      <div class="perf-metric">
        <div class="perf-metric-name">MAX DD</div>
        <div class="perf-metric-val" style="color:var(--down);">${fmtN(m.maxDDPct, 1)}%</div>
        <div class="perf-metric-sub">$${fmtN(m.maxDDUsd, 0)}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;padding:6px 10px;background:var(--s2);border-radius:8px;font-size:9px;">
      <span style="color:var(--t3);">Trades: <strong style="color:var(--t1);">${m.tradesCount}</strong></span>
      <span style="color:var(--t3);">WR: <strong style="color:${m.winRate>=50?'var(--up)':'var(--down)'};">${fmtN(m.winRate, 0)}%</strong></span>
      <span style="color:var(--t3);">Avg W: <strong style="color:var(--up);">+${fmtN(m.avgWin, 2)}%</strong></span>
      <span style="color:var(--t3);">Avg L: <strong style="color:var(--down);">-${fmtN(m.avgLoss, 2)}%</strong></span>
      <span style="color:var(--t3);">Streak L: <strong style="color:var(--gold);">${m.maxConsecLoss}</strong></span>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 2. MULTI-HORIZON FORECAST (5m / 1h / 4h / 1d)
// ════════════════════════════════════════════════════════════
function getMultiHorizonForecast(pair) {
  const ps   = S.pairStates[pair];
  const tech = getTechSignals(pair);
  const fund = getFundamentalSignals(pair);
  if(!ps || !tech || !fund) return null;

  const composite = tech.atScore * 0.6 + fund.fundScore * 0.4;
  const lmsrProb  = lmsrP(ps);
  const atr       = tech.raw?.stddev?.atr || ps.price * 0.015;
  const trend     = tech.raw?.adx?.trend || 'ranging';
  const trendBoost= trend === 'ranging' ? 0.5 : 1.2;

  const mkHorizon = (score, magMult, confMult, priceMove) => {
    const direction = score > 0.15 ? 'up' : score < -0.15 ? 'down' : 'flat';
    return {
      direction,
      magnitude:   Math.min(1, Math.abs(score) * magMult),
      confidence:  Math.min(1, Math.abs(score) * confMult),
      priceTarget: ps.price + priceMove * Math.sign(score)
    };
  };

  return {
    h5m: mkHorizon(lmsrProb * 2 - 1, 0.5, 1.0,  ps.price * 0.003),   // mostly LMSR
    h1h: mkHorizon(composite,         1.5, 0.8, atr * 2),            // composite
    h4h: mkHorizon(composite,         3.0 * trendBoost, trend==='ranging'?0.5:1, atr * 6 * trendBoost),
    h1d: mkHorizon(fund.fundScore,    6.0, 0.7, ps.price * fund.fundScore * 0.05 || ps.price * 0.015)
  };
}

function renderHorizonPanel() {
  const el = document.getElementById('apanel-horizon');
  if(!el) return;

  const pairs = Object.keys(PAIRS);
  const rows = pairs.map(pair => {
    const cfg = PAIRS[pair];
    const ps  = S.pairStates[pair];
    const f   = getMultiHorizonForecast(pair);
    if(!f) return '';

    const horizons = [
      { k:'h5m', lbl:'5m' },
      { k:'h1h', lbl:'1h' },
      { k:'h4h', lbl:'4h' },
      { k:'h1d', lbl:'1j' }
    ];

    return `
    <div class="horizon-card">
      <div class="horizon-card-head">
        <span style="color:${cfg.color};font-weight:700;font-size:11px;">${pair}</span>
        <span style="font-size:8px;color:var(--t3);font-family:var(--font-mono);">${cfg.dec>=4?ps.price.toFixed(cfg.dec):'$'+Math.floor(ps.price).toLocaleString()}</span>
      </div>
      <div class="horizon-grid">
        ${horizons.map(h => {
          const d = f[h.k];
          const arrow = d.direction==='up'?'↑':d.direction==='down'?'↓':'→';
          const col   = d.direction==='up'?'var(--up)':d.direction==='down'?'var(--down)':'var(--gold)';
          return `<div class="horizon-cell ${d.direction}">
            <div class="horizon-label">${h.lbl}</div>
            <div class="horizon-dir" style="color:${col};">${arrow}</div>
            <div class="horizon-conf-bar"><div class="horizon-conf-fill" style="width:${(d.confidence*100).toFixed(0)}%;background:${col};"></div></div>
            <div style="font-size:7px;color:var(--t3);margin-top:2px;">${(d.confidence*100).toFixed(0)}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = rows || '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">Données en cours…</div>';
}

// ════════════════════════════════════════════════════════════
// 3. TEMPORAL HEATMAP (hour-of-day performance)
// ════════════════════════════════════════════════════════════
function recordTradeForHeatmap(pnlUsd, pair) {
  if(!S.heatmap) S.heatmap = { byHour:{}, byWeekday:{} };
  const d = new Date();
  const h  = d.getHours();
  const wd = d.getDay();
  if(!S.heatmap.byHour[h])     S.heatmap.byHour[h]     = {count:0,pnl:0,wins:0};
  if(!S.heatmap.byWeekday[wd]) S.heatmap.byWeekday[wd] = {count:0,pnl:0,wins:0};
  S.heatmap.byHour[h].count++;    S.heatmap.byHour[h].pnl += pnlUsd;
  if(pnlUsd>0) S.heatmap.byHour[h].wins++;
  S.heatmap.byWeekday[wd].count++; S.heatmap.byWeekday[wd].pnl += pnlUsd;
  if(pnlUsd>0) S.heatmap.byWeekday[wd].wins++;
  // v24 : matrice 7x24
  if(!S.heatmap.byDayHour) S.heatmap.byDayHour = {};
  const dk = wd+'_'+h;
  if(!S.heatmap.byDayHour[dk]) S.heatmap.byDayHour[dk]={count:0,pnl:0,wins:0};
  S.heatmap.byDayHour[dk].count++; S.heatmap.byDayHour[dk].pnl+=pnlUsd;
  if(pnlUsd>0) S.heatmap.byDayHour[dk].wins++;
  // v24 : par paire
  if(pair){
    if(!S.heatmap.byPair) S.heatmap.byPair={};
    if(!S.heatmap.byPair[pair]) S.heatmap.byPair[pair]={byHour:{},total:{count:0,pnl:0,wins:0}};
    if(!S.heatmap.byPair[pair].byHour[h]) S.heatmap.byPair[pair].byHour[h]={count:0,pnl:0,wins:0};
    S.heatmap.byPair[pair].byHour[h].count++; S.heatmap.byPair[pair].byHour[h].pnl+=pnlUsd;
    if(pnlUsd>0) S.heatmap.byPair[pair].byHour[h].wins++;
    S.heatmap.byPair[pair].total.count++; S.heatmap.byPair[pair].total.pnl+=pnlUsd;
    if(pnlUsd>0) S.heatmap.byPair[pair].total.wins++;
  }
}

function renderHeatmapPanel() {
  const el = document.getElementById('apanel-heatmap');
  if(!el) return;

  const hm = S.heatmap || { byHour: {}, byWeekday: {} };
  const hours = Array.from({length:24}, (_, i) => hm.byHour[i] || { count:0, pnl:0, wins:0 });
  const weekdayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  // Find max abs PnL for color scaling
  const maxAbs = Math.max(1, ...hours.map(h => Math.abs(h.pnl)));

  const hourCells = hours.map((h, i) => {
    let bg = 'rgba(255,255,255,.02)';
    if(h.count > 0) {
      const intensity = Math.min(1, Math.abs(h.pnl) / maxAbs);
      const c = h.pnl > 0 ? `0,232,122` : h.pnl < 0 ? `255,61,107` : `245,200,66`;
      bg = `rgba(${c},${(intensity*0.7+0.15).toFixed(2)})`;
    }
    const wr = h.count > 0 ? Math.round(h.wins/h.count*100) : 0;
    const tip = h.count > 0 
      ? `${i}h · ${h.count} tr · $${h.pnl.toFixed(0)} · ${wr}%WR`
      : `${i}h`;
    return `<div class="heat-cell" style="background:${bg};" title="${tip}" onclick="showToast('${tip}')"></div>`;
  }).join('');

  const hourLabels = Array.from({length:24}, (_, i) => 
    `<div>${i%3===0?i+'h':''}</div>`
  ).join('');

  // Best/worst hour
  const ranked = hours.map((h,i)=>({...h, hour:i}))
                      .filter(h=>h.count>0)
                      .sort((a,b)=>b.pnl-a.pnl);
  const bestH  = ranked[0];
  const worstH = ranked[ranked.length-1];

  // Weekday row
  const weekdayCells = [0,1,2,3,4,5,6].map(wd => {
    const d = hm.byWeekday[wd] || { count:0, pnl:0 };
    let bg = 'rgba(255,255,255,.02)';
    const maxWd = Math.max(1, ...Object.values(hm.byWeekday).map(x=>Math.abs(x.pnl)));
    if(d.count > 0) {
      const intensity = Math.min(1, Math.abs(d.pnl)/maxWd);
      const c = d.pnl > 0 ? `0,232,122` : `255,61,107`;
      bg = `rgba(${c},${(intensity*0.7+0.15).toFixed(2)})`;
    }
    return `<div style="background:${bg};border-radius:4px;padding:4px 2px;text-align:center;font-size:8px;">
      <div style="color:var(--t3);">${weekdayNames[wd]}</div>
      <div style="color:${d.pnl>=0?'var(--up)':'var(--down)'};font-weight:700;">${d.count>0?(d.pnl>=0?'+':'')+d.pnl.toFixed(0)+'$':'—'}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="heatmap-wrap">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:9px;color:var(--t2);font-weight:600;">P&L par heure (UTC local)</span>
        <span style="font-size:8px;color:var(--t3);">${ranked.length} heures actives</span>
      </div>
      <div class="heatmap-hours-grid">${hourCells}</div>
      <div class="heatmap-hours-labels">${hourLabels}</div>
      ${bestH || worstH ? `
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:5px;">
        ${bestH ? `<div style="background:rgba(0,232,122,.08);border:1px solid rgba(0,232,122,.2);border-radius:6px;padding:6px;">
          <div style="font-size:7px;color:var(--t3);">🏆 MEILLEURE HEURE</div>
          <div style="font-size:12px;font-weight:700;color:var(--up);">${bestH.hour}h · +$${bestH.pnl.toFixed(0)}</div>
        </div>` : ''}
        ${worstH && worstH.pnl < 0 ? `<div style="background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.2);border-radius:6px;padding:6px;">
          <div style="font-size:7px;color:var(--t3);">⚠ PIRE HEURE</div>
          <div style="font-size:12px;font-weight:700;color:var(--down);">${worstH.hour}h · $${worstH.pnl.toFixed(0)}</div>
        </div>` : ''}
      </div>` : ''}
      <div style="margin-top:8px;font-size:9px;color:var(--t2);margin-bottom:4px;">Par jour de la semaine</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${weekdayCells}</div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 4. WHAT-IF SCENARIOS
// ════════════════════════════════════════════════════════════
function computeWhatIfScenarios() {
  const out = { positions: [], session: {} };

  // Per-open-position: what if closed X candles ago?
  S.openPositions.forEach(pos => {
    const ps = S.pairStates[pos.pair];
    if(!ps || !ps.candles || ps.candles.length < 3) return;
    const candles = ps.candles;
    const getPnlAt = offset => {
      const idx = candles.length - 1 - offset;
      if(idx < 0) return null;
      const priceAt = candles[idx].c;
      const pct = pos.side === 'long'
        ? ((priceAt - pos.entryPrice) / pos.entryPrice * 100)
        : ((pos.entryPrice - priceAt) / pos.entryPrice * 100);
      return { pnlPct: pct, pnlUsd: pos.stakeUsdt * pct/100 };
    };
    out.positions.push({
      id: pos.id, pair: pos.pair, side: pos.side,
      now:     { pnlPct: pos.pnl || 0, pnlUsd: pos.pnlUsdt || 0 },
      ago5:    getPnlAt(5),
      ago15:   getPnlAt(15),
      ago30:   getPnlAt(30)
    });
  });

  // Session summary
  const sessionGain = (S._startPortfolio && S.portfolio) ? (S.portfolio - S._startPortfolio) : 0;
  const botTrades = Object.values(S.pairStates)
    .flatMap(ps => (ps.trades||[]).filter(t => t.type === 'position'))
    .length;
  out.session = {
    actualGain:  sessionGain,
    botTrades,
    compounded:  S._totalCompounded || 0,
    // Hypothetical: if never traded (cash baseline)
    noTradingGain: 0
  };
  return out;
}

function renderWhatIfPanel() {
  const el = document.getElementById('apanel-whatif');
  if(!el) return;

  const s = computeWhatIfScenarios();
  const posRows = s.positions.map(p => {
    const cfg = PAIRS[p.pair];
    const nowCol = p.now.pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const rows = [
      { lbl:'Maintenant',     d: p.now,   highlight:true },
      { lbl:'Il y a 5 cycles', d: p.ago5  },
      { lbl:'Il y a 15 cycles', d: p.ago15 },
      { lbl:'Il y a 30 cycles', d: p.ago30 }
    ].filter(r => r.d != null);
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:6px;">
      <div style="font-size:10px;font-weight:700;color:${cfg.color};margin-bottom:5px;">${p.pair} · ${p.side.toUpperCase()}</div>
      ${rows.map(r => {
        const c = r.d.pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
        return `<div style="display:flex;justify-content:space-between;padding:3px 0;${r.highlight?'border-bottom:1px dashed var(--border);margin-bottom:4px;':''}">
          <span style="font-size:9px;color:var(--t2);${r.highlight?'font-weight:700;':''}">${r.lbl}</span>
          <span style="font-size:11px;font-weight:700;color:${c};">${r.d.pnlUsd>=0?'+':''}$${r.d.pnlUsd.toFixed(2)}</span>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:9px;color:var(--t2);margin-bottom:8px;">
      Si vous aviez fermé aux moments passés :
    </div>
    ${posRows || '<div style="color:var(--t3);font-size:10px;text-align:center;padding:8px;">Aucune position ouverte</div>'}
    <div style="margin-top:10px;padding:8px 10px;background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.2);border-radius:8px;">
      <div style="font-size:9px;color:var(--pur);font-weight:700;margin-bottom:4px;">📊 SESSION</div>
      <div class="whatif-row" style="background:transparent;border:none;margin-bottom:3px;">
        <span class="whatif-label">Gain réel session</span>
        <span class="whatif-val" style="color:${s.session.actualGain>=0?'var(--up)':'var(--down)'};">${s.session.actualGain>=0?'+':''}$${s.session.actualGain.toFixed(2)}</span>
      </div>
      <div class="whatif-row" style="background:transparent;border:none;margin-bottom:3px;">
        <span class="whatif-label">Réinvesti (composé)</span>
        <span class="whatif-val" style="color:var(--up);">+$${s.session.compounded.toFixed(2)}</span>
      </div>
      <div class="whatif-row" style="background:transparent;border:none;margin-bottom:0;">
        <span class="whatif-label">Trades bot exécutés</span>
        <span class="whatif-val" style="color:var(--ice);">${s.session.botTrades}</span>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 5. LEAD-LAG INTER-PAIR CORRELATIONS
// ════════════════════════════════════════════════════════════
function detectLeadLagPatterns() {
  const pairs = Object.keys(PAIRS);
  const results = [];
  const lags = [0, 2, 5, 10];

  for(let i = 0; i < pairs.length; i++) {
    const pA = S.pairStates[pairs[i]];
    if(!pA?.candles || pA.candles.length < 25) continue;
    const retsA = [];
    for(let k = 1; k < 25; k++) {
      const idx = pA.candles.length - 25 + k;
      const prev = pA.candles[idx - 1];
      const cur  = pA.candles[idx];
      if(prev && cur && prev.c > 0) retsA.push((cur.c - prev.c) / prev.c);
    }

    for(let j = 0; j < pairs.length; j++) {
      if(i === j) continue;
      const pB = S.pairStates[pairs[j]];
      if(!pB?.candles || pB.candles.length < 25 + Math.max(...lags)) continue;

      let bestLag = 0, bestCorr = 0;
      for(const lag of lags) {
        const retsB = [];
        for(let k = 1; k < 25; k++) {
          const idx = pB.candles.length - 25 + k - lag;
          if(idx < 1) { retsB.length = 0; break; }
          const prev = pB.candles[idx - 1];
          const cur  = pB.candles[idx];
          if(prev && cur && prev.c > 0) retsB.push((cur.c - prev.c) / prev.c);
        }
        if(retsB.length !== retsA.length) continue;
        const corr = _pearson(retsA, retsB);
        if(Math.abs(corr) > Math.abs(bestCorr)) { bestCorr = corr; bestLag = lag; }
      }
      if(Math.abs(bestCorr) > 0.45) {
        results.push({
          leader:   pairs[i],
          follower: pairs[j],
          lag:      bestLag,
          corr:     bestCorr
        });
      }
    }
  }

  return results.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr)).slice(0, 6);
}

function renderLeadLagPanel() {
  const el = document.getElementById('apanel-leadlag');
  if(!el) return;

  const patterns = detectLeadLagPatterns();
  if(patterns.length === 0) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">Analyse des corrélations en cours…</div>';
    return;
  }

  const rows = patterns.map(p => {
    const cfgA = PAIRS[p.leader];
    const cfgB = PAIRS[p.follower];
    const absCorr = Math.abs(p.corr);
    const strong  = absCorr > 0.7 ? 'strong' : 'weak';
    const lagLbl  = p.lag === 0 ? 'simultané' : `lag +${p.lag} cycles`;
    const dirSign = p.corr > 0 ? '↑↑' : '↑↓';
    const dirLbl  = p.corr > 0 ? 'co-mouvement' : 'mouvement inverse';
    return `<div class="leadlag-row">
      <span class="leadlag-arrow">${dirSign}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;font-weight:700;">
          <span style="color:${cfgA.color};">${p.leader}</span>
          <span style="color:var(--t3);">→</span>
          <span style="color:${cfgB.color};">${p.follower}</span>
        </div>
        <div style="font-size:8px;color:var(--t3);">${dirLbl} · ${lagLbl}</div>
      </div>
      <span class="leadlag-corr ${strong}">${p.corr>=0?'+':''}${p.corr.toFixed(2)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:9px;color:var(--t2);margin-bottom:8px;">
      Corrélations détectées sur les 25 dernières bougies :
    </div>
    ${rows}
    <div style="font-size:8px;color:var(--t3);margin-top:6px;line-height:1.5;">
      ↑↑ = mouvement parallèle · ↑↓ = inverse · R &gt; 0.7 = corrélation forte
    </div>`;
}

// ════════════════════════════════════════════════════════════
// ANALYTICS TAB SWITCHER
// ════════════════════════════════════════════════════════════






// ════════════════════════════════════════════════════════════
// v5.4 — REVOLUTIONARY FEATURES (4 world-firsts)
// ════════════════════════════════════════════════════════════

// v5.8 FIX — AUTHORITATIVE tab declaration (hoisted at top to avoid TDZ)
const _V54_TABS = ['debate','swarm','fleet','mirror','resonance','cascade','dreams','perf','horizon','heatmap','whatif','leadlag'];


// Init persistent state for v5.4
if(typeof S !== 'undefined') {
  if(!S.shadow)           S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
  if(!S.decisionCascade)  S.decisionCascade = [];       // [{ts, pair, side, signals, topAgents, outcome}]
  if(!S.dreamJournal)     S.dreamJournal = [];          // [{ts, pair, text, sentiment}]
  if(!S.resonanceHistory) S.resonanceHistory = [];      // past events
}

// ════════════════════════════════════════════════════════════
// LIVE TRAINING — every real price fetch nudges agents toward momentum
// ════════════════════════════════════════════════════════════
function liveTrainAgents() {
  if(!S.agents || !Array.isArray(S.agents) || S.agents.length === 0) return;
  // v6.0 — Memory-driven learning + archives context
  const agentArchives = (S.archives?.snapshots || []).filter(s => s.domain === 'agents');
  const learningBoost = agentArchives.length > 0 ? 1.15 : 1.0;
  let nudged = 0;
  const pairs = Object.keys(PAIRS || {});
  pairs.forEach(pair => {
    const ps = S.pairStates?.[pair];
    if(!ps || !ps.candles || ps.candles.length < 3) return;
    const recent = ps.candles.slice(-5);
    if(recent.length < 2) return;
    // Compute normalized momentum from last 5 candles
    const first = recent[0].c, last = recent[recent.length-1].c;
    if(first <= 0) return;
    const momentum = (last - first) / first;      // raw pct change
    const normMom  = Math.max(-0.05, Math.min(0.05, momentum)) / 0.05;  // clamp to [-1, +1]
    // Only nudge agents whose style aligns; tiny amounts
    S.agents.forEach(a => {
      if(!a) return;
      const w = (a.conf || 0.5) * 0.015 * learningBoost; // max nudge ~1.5%, boosted post-reset
      a.score = (a.score || 0) * 0.985 + normMom * w;
      a.learningEvents = (a.learningEvents || 0) + 1;
      // Small fitness boost if agent was aligned with momentum direction
      if((a.score > 0 && normMom > 0.3) || (a.score < 0 && normMom < -0.3)) {
        a.fitness = Math.min(2000, Math.max(50, (a.fitness || 500) + 5));  // v8.0 LIVRAISON 30 · FIX #3 · échelle unifiée [50, 2000]
      }
    });
    nudged++;
  });
  if(nudged > 0) {
    // v6.5: write LEARN events to chainLog so Chain > Learn tab shows activity
    if(!S.chainLog) S.chainLog = [];
    const topAgents = [...S.agents]
      .filter(a => Math.abs(a.score||0) > 0.05)
      .sort((a,b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 3);
    if(topAgents.length && S.chainLog.filter(e => e.category==='learn').length < 200) {
      S.chainLog.push({
        icon: '🧠',
        desc: `Apprentissage · ${nudged} agents entraînés · Top: ${topAgents.map(a => a.emoji + (a.score>=0?'+':'')+a.score.toFixed(2)).join(', ')}`,
        hash: Math.random().toString(36).substr(2,8),
        time: new Date().toTimeString().slice(0,8),
        category: 'learn'
      });
      if(S.chainLog.length > 200) S.chainLog.splice(0, S.chainLog.length - 200);
    }
  }
}

// ════════════════════════════════════════════════════════════
// 1. INNER DIALOGUE — 5 Personas Debate Panel
// ════════════════════════════════════════════════════════════
const PERSONAS = [
  { id:'scalper',    emoji:'⚡', name:'Scalper',    style:'momentum court terme' },
  { id:'swing',      emoji:'🌊', name:'Swing',      style:'cycles 1h-4h MACD' },
  { id:'contrarian', emoji:'🔥', name:'Contrarian', style:'fade le consensus' },
  { id:'trend',      emoji:'📈', name:'Trend',      style:'ADX + EMA alignement' },
  { id:'hedge',      emoji:'🛡️', name:'Hedge',      style:'risk-off sur volatilité' }
];

function generateDebate(pair) {
  const ps = S.pairStates?.[pair];
  if(!ps) return null;
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;
  if(!tech || !fund) return null;

  const at    = tech.atScore || 0;
  const af    = fund.fundScore || 0;
  const lmsr  = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const rsi   = tech.raw?.rsi?.rsi || 50;
  const macd  = tech.raw?.macd?.hist || 0;
  const adx   = tech.raw?.adx?.adx || 20;
  const cv    = tech.raw?.stddev?.cv || 0.015;
  const trend = tech.raw?.adx?.trend || 'ranging';

  // Each persona votes based on its lens
  const votes = [];

  // Scalper — LMSR + short momentum
  {
    const bias = (lmsr - 0.5) * 2;
    let vote = bias > 0.15 ? 'long' : bias < -0.15 ? 'short' : 'hold';
    let quote;
    if(vote === 'long')      quote = `Le marché push, RSI à ${rsi.toFixed(0)}, LMSR à ${(lmsr*100).toFixed(0)}%. Long court terme.`;
    else if(vote === 'short') quote = `LMSR baisse (${(lmsr*100).toFixed(0)}%), pression vendeuse immédiate. Short rapide.`;
    else                      quote = `Pas de momentum clair. On attend la cassure.`;
    votes.push({ persona:PERSONAS[0], vote, quote, weight: 1.0 });
  }

  // Swing — MACD + trend
  {
    let vote = macd > 0 && at > 0.1 ? 'long' : macd < 0 && at < -0.1 ? 'short' : 'hold';
    let quote;
    if(vote === 'long')      quote = `MACD hist positif (${macd.toFixed(3)}), structure haussière 1h-4h. J'entre long.`;
    else if(vote === 'short') quote = `MACD négatif, rollover visible. Cycle baissier confirmé.`;
    else                      quote = `MACD proche de zéro, pas de signal swing propre.`;
    votes.push({ persona:PERSONAS[1], vote, quote, weight: 1.1 });
  }

  // Contrarian — fade extremes
  {
    let vote, quote;
    if(rsi > 72)      { vote = 'short'; quote = `RSI ${rsi.toFixed(0)} → surchauté. Tout le monde achète, je fade.`; }
    else if(rsi < 28) { vote = 'long';  quote = `RSI ${rsi.toFixed(0)} → capitulation. Le sang coule, j'achète.`; }
    else              { vote = 'hold';  quote = `Pas d'extrême à fader, je reste en embuscade.`; }
    votes.push({ persona:PERSONAS[2], vote, quote, weight: 0.9 });
  }

  // Trend — ADX + EMA
  {
    let vote, quote;
    if(adx > 25 && at > 0.15)       { vote = 'long';  quote = `ADX ${adx.toFixed(0)} fort, tendance propre. Long sans hésiter.`; }
    else if(adx > 25 && at < -0.15) { vote = 'short'; quote = `Tendance baissière confirmée (ADX ${adx.toFixed(0)}). Je suis le flow.`; }
    else                             { vote = 'hold';  quote = `ADX ${adx.toFixed(0)} faible, marché en range. No trade.`; }
    votes.push({ persona:PERSONAS[3], vote, quote, weight: 1.2 });
  }

  // Hedge — risk off si volatilité
  {
    const volBad = cv > 0.025;
    let vote, quote;
    if(volBad)                   { vote = 'hold';  quote = `Volatilité élevée (CV ${(cv*100).toFixed(1)}%). Je recommande d'attendre.`; }
    else if(af > 0.2 && at > 0)  { vote = 'long';  quote = `Fondamentaux alignés (${(af*100).toFixed(0)}), volatilité contenue. Entrée raisonnable.`; }
    else if(af < -0.2 && at < 0) { vote = 'short'; quote = `Contexte macro négatif, risk-off justifié.`; }
    else                         { vote = 'hold';  quote = `Pas de conviction assez forte pour justifier le risque.`; }
    votes.push({ persona:PERSONAS[4], vote, quote, weight: 0.8 });
  }

  // Weighted verdict
  let scoreLong = 0, scoreShort = 0, scoreHold = 0;
  votes.forEach(v => {
    if(v.vote === 'long')       scoreLong  += v.weight;
    else if(v.vote === 'short') scoreShort += v.weight;
    else                        scoreHold  += v.weight;
  });
  const maxScore = Math.max(scoreLong, scoreShort, scoreHold);
  const verdict = maxScore === scoreLong ? 'LONG' : maxScore === scoreShort ? 'SHORT' : 'HOLD';
  const totalW = scoreLong + scoreShort + scoreHold;
  const conviction = totalW > 0 ? maxScore / totalW : 0;

  return { pair, votes, verdict, conviction, at, af, lmsr };
}




// ════════════════════════════════════════════════════════════
// 2. ADVERSARIAL MIRROR — Shadow bot running opposite strategy
// ════════════════════════════════════════════════════════════
function updateShadowBot() {
  if(!S.shadow) S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
  // Shadow virtually takes OPPOSITE side of every actual bot trade
  // We update when a position closes (hook in closePosition)
}

function recordShadowFromClose(realPnlUsd, realPnlPct, pair, side) {
  if(!S.shadow) S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
  // Shadow takes opposite → pnl is inverted
  const shadowPnl = -realPnlUsd * 0.92;  // 0.92 accounts for slippage/fees on the shadow side
  S.shadow.virtualPnl += shadowPnl;
  S.shadow.virtualTrades.push({ ts: Date.now(), pair, realSide: side, shadowPnl, realPnl: realPnlUsd });
  if(S.shadow.virtualTrades.length > 50) S.shadow.virtualTrades.shift();
  if(shadowPnl > 0) S.shadow.wins++; else S.shadow.losses++;
}

function renderMirrorPanel() {
  const el = document.getElementById('apanel-mirror');
  if(!el) return;
  const mainPnl = (S._totalCompounded || 0) + (S.portfolio && S._startPortfolio ? (S.portfolio - S._startPortfolio) : 0);
  const shadow = S.shadow || { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0 };
  const recentN = Math.min(20, shadow.virtualTrades.length);
  const recent = shadow.virtualTrades.slice(-recentN);
  const recentShadowSum = recent.reduce((s,t) => s + t.shadowPnl, 0);
  const recentRealSum   = recent.reduce((s,t) => s + t.realPnl, 0);
  const delta = recentRealSum - recentShadowSum;
  const mainCol = mainPnl >= 0 ? 'var(--up)' : 'var(--down)';
  const shadowCol = shadow.virtualPnl >= 0 ? 'var(--up)' : 'var(--down)';
  let insight;
  if(recentN < 3) {
    insight = '⏳ Analyse du shadow en cours… (3+ trades nécessaires)';
  } else if(delta > 0) {
    insight = `✅ Stratégie principale supérieure de $${delta.toFixed(2)} sur les ${recentN} derniers trades. Cap maintenu.`;
  } else if(Math.abs(delta) < 2) {
    insight = `⚖️ Performance équivalente. Le shadow ne trouve pas de faille exploitable.`;
  } else {
    insight = `⚠️ Stratégie inverse plus performante de $${Math.abs(delta).toFixed(2)}. Recalibration recommandée.`;
    S.shadow.lastRetrain = Date.now();
  }

  el.innerHTML = `
    <div class="mirror-wrap">
      <div class="mirror-card main">
        <div class="mirror-label">🤖 BOT PRINCIPAL</div>
        <div class="mirror-val" style="color:${mainCol};">${mainPnl>=0?'+':''}$${mainPnl.toFixed(2)}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:3px;">P&L session total</div>
      </div>
      <div class="mirror-card shadow">
        <div class="mirror-label">🪞 SHADOW (opposé)</div>
        <div class="mirror-val" style="color:${shadowCol};">${shadow.virtualPnl>=0?'+':''}$${shadow.virtualPnl.toFixed(2)}</div>
        <div style="font-size:8px;color:var(--t3);margin-top:3px;">${shadow.wins}W · ${shadow.losses}L</div>
      </div>
    </div>
    <div class="mirror-delta">
      <div style="font-size:8px;color:var(--t3);letter-spacing:.06em;">Δ MAIN vs SHADOW (${recentN} derniers)</div>
      <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:${delta>=0?'var(--up)':'var(--down)'};margin-top:2px;">
        ${delta>=0?'+':''}$${delta.toFixed(2)}
      </div>
    </div>
    <div class="mirror-insight">${insight}</div>`;
}

// ════════════════════════════════════════════════════════════
// 3. HARMONIC RESONANCE — Rare multi-indicator alignment
// ════════════════════════════════════════════════════════════
function detectHarmonicResonance(pair) {
  const ps = S.pairStates?.[pair];
  if(!ps) return null;
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  if(!tech) return null;

  const rsi   = tech.raw?.rsi?.rsi || 50;
  const macd  = tech.raw?.macd?.hist || 0;
  const stoch = tech.raw?.stoch?.k || 50;
  const adx   = tech.raw?.adx?.adx || 20;
  const bb    = tech.raw?.boll?.position || 0.5;

  // Direction: +1 bullish, -1 bearish, 0 neutral
  const notes = [
    { name:'RSI',   val: rsi > 65 ? +1 : rsi < 35 ? -1 : 0, display: `RSI ${rsi.toFixed(0)}` },
    { name:'MACD',  val: macd > 0.002 ? +1 : macd < -0.002 ? -1 : 0, display: `MACD ${macd>=0?'+':''}${macd.toFixed(3)}` },
    { name:'STOCH', val: stoch > 75 ? +1 : stoch < 25 ? -1 : 0, display: `STO ${stoch.toFixed(0)}` },
    { name:'ADX',   val: adx > 30 ? (macd > 0 ? +1 : -1) : 0, display: `ADX ${adx.toFixed(0)}` },
    { name:'BOLL',  val: bb > 0.85 ? +1 : bb < 0.15 ? -1 : 0, display: `BB ${(bb*100).toFixed(0)}%` }
  ];

  const bullCount = notes.filter(n => n.val === +1).length;
  const bearCount = notes.filter(n => n.val === -1).length;
  const maxAligned = Math.max(bullCount, bearCount);
  const direction = bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral';
  const strength  = maxAligned / notes.length;
  const isResonance = maxAligned >= 4;

  if(isResonance && S.resonanceHistory) {
    const lastEvent = S.resonanceHistory[S.resonanceHistory.length - 1];
    if(!lastEvent || Date.now() - lastEvent.ts > 60000) {
      S.resonanceHistory.push({ ts: Date.now(), pair, direction, strength, aligned: maxAligned });
      if(S.resonanceHistory.length > 15) S.resonanceHistory.shift();
    }
  }
  return { notes, bullCount, bearCount, direction, strength, isResonance, pair };
}

function renderResonancePanel() {
  const el = document.getElementById('apanel-resonance');
  if(!el) return;
  const pair = S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  const r = detectHarmonicResonance(pair);
  if(!r) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">Analyse en cours…</div>';
    return;
  }
  const cfg = PAIRS[pair];
  const strPct = (r.strength * 100).toFixed(0);
  const dirCol = r.direction === 'bullish' ? 'var(--up)' : r.direction === 'bearish' ? 'var(--down)' : 'var(--gold)';

  const notesHtml = r.notes.map(n => {
    const active = n.val !== 0;
    const dot = n.val > 0 ? '↑' : n.val < 0 ? '↓' : '–';
    const col = n.val > 0 ? 'var(--up)' : n.val < 0 ? 'var(--down)' : 'var(--t3)';
    return `<span class="resonance-note${active?' active':''}" style="${active?`color:${col};`:''}">${dot} ${n.display}</span>`;
  }).join('');

  const history = (S.resonanceHistory || []).slice(-4).reverse().map(ev => {
    const mins = Math.floor((Date.now() - ev.ts) / 60000);
    const col = ev.direction === 'bullish' ? 'var(--up)' : 'var(--down)';
    return `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9px;border-bottom:1px dashed var(--border);">
      <span style="color:${col};">${ev.direction === 'bullish' ? '↑↑' : '↓↓'} ${ev.pair}</span>
      <span style="color:var(--t3);">${ev.aligned}/5 · il y a ${mins}m</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="resonance-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:9px;color:var(--t2);font-weight:600;">⚡ RÉSONANCE HARMONIQUE · ${pair}</span>
        <span style="font-size:10px;font-weight:700;color:${dirCol};">${strPct}%</span>
      </div>
      <div class="resonance-meter">
        <div class="resonance-fill" style="width:${strPct}%;"></div>
      </div>
      <div style="margin-top:8px;">${notesHtml}</div>
      ${r.isResonance ? `
        <div class="resonance-event">
          <span style="font-size:14px;">${r.direction === 'bullish' ? '🎵' : '🎼'}</span>
          <div style="flex:1;">
            <div style="font-size:10px;font-weight:700;color:var(--pur);">ÉVÉNEMENT DE RÉSONANCE</div>
            <div style="font-size:9px;color:var(--t2);">${r.bullCount >= 4 ? r.bullCount : r.bearCount}/5 indicateurs alignés · conviction élevée</div>
          </div>
        </div>
      ` : `
        <div style="margin-top:8px;padding:6px 10px;background:var(--s2);border-radius:8px;font-size:9px;color:var(--t3);text-align:center;">
          En attente d'alignement (4/5 minimum). Actuel : ${Math.max(r.bullCount, r.bearCount)}/5
        </div>
      `}
      ${history ? `<div style="margin-top:10px;"><div style="font-size:8px;color:var(--t3);margin-bottom:4px;letter-spacing:.06em;">HISTORIQUE</div>${history}</div>` : ''}
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 4. BUTTERFLY CASCADE — Decision traceability
// ════════════════════════════════════════════════════════════
function recordDecisionCascade(pair, side, stake, reason) {
  if(!S.decisionCascade) S.decisionCascade = [];
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;
  const ps = S.pairStates?.[pair];
  // v5.5 — Use live roster analysis for richer traceability
  let topAgents = [];
  try {
    if(typeof runRosterAnalysis === 'function') {
      const r = runRosterAnalysis(pair);
      // Top 3 council voters (non-hold) + strongest scout
      const councilContribs = Object.entries(r.councilResults)
        .filter(([k,v]) => v.vote !== 'hold')
        .sort((a,b) => Math.abs(b[1].score) - Math.abs(a[1].score))
        .slice(0, 2)
        .map(([id,v]) => {
          const a = (S.agents || []).find(x => x.id === id);
          return { name: a?.name || id, emoji: a?.emoji || '·', score: v.score, conf: 0.8, type:'council' };
        });
      const scoutContribs = Object.entries(r.scoutResults)
        .sort((a,b) => Math.abs(b[1].score) - Math.abs(a[1].score))
        .slice(0, 2)
        .map(([id,s]) => {
          const a = (S.agents || []).find(x => x.id === id);
          return { name: a?.name || id, emoji: a?.emoji || '·', score: s.score, conf: s.conf, type:'scout' };
        });
      topAgents = [...councilContribs, ...scoutContribs];
    }
  } catch(e) {}
  if(topAgents.length === 0) {
    topAgents = (S.agents || [])
      .filter(a => a && typeof a.score === 'number')
      .sort((a,b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 3)
      .map(a => ({ name: a.name || a.id, emoji: a.emoji || '·', score: a.score, conf: a.conf || 0.5, type:'legacy' }));
  }
  S.decisionCascade.push({
    ts: Date.now(),
    pair, side, stake,
    reason: reason || 'auto',
    at: tech?.atScore || 0,
    af: fund?.fundScore || 0,
    lmsr: typeof lmsrP === 'function' && ps ? lmsrP(ps) : 0.5,
    topAgents,
    entryPrice: ps?.price || 0,
    closed: false
  });
  if(S.decisionCascade.length > 15) S.decisionCascade.shift();
}

function closeDecisionCascade(pair, side, exitPrice, pnlUsd, pnlPct) {
  if(!S.decisionCascade) return;
  // Find most recent open entry for this pair+side
  for(let i = S.decisionCascade.length - 1; i >= 0; i--) {
    const d = S.decisionCascade[i];
    if(d.pair === pair && d.side === side && !d.closed) {
      d.closed = true;
      d.exitTs = Date.now();
      d.exitPrice = exitPrice;
      d.pnlUsd = pnlUsd;
      d.pnlPct = pnlPct;
      break;
    }
  }
}

function renderCascadePanel() {
  const el = document.getElementById('apanel-cascade');
  if(!el) return;
  const cascade = (S.decisionCascade || []).slice().reverse().slice(0, 5);
  if(cascade.length === 0) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">🦋 Le premier trade déclenchera la cascade…</div>';
    return;
  }
  const rows = cascade.map(d => {
    const cfg = PAIRS[d.pair];
    const closedStatus = d.closed
      ? (d.pnlUsd >= 0 ? `✅ +$${d.pnlUsd.toFixed(2)}` : `❌ $${d.pnlUsd.toFixed(2)}`)
      : '⏳ Ouvert';
    const closedCol = !d.closed ? 'var(--gold)' : (d.pnlUsd >= 0 ? 'var(--up)' : 'var(--down)');
    const agentList = d.topAgents.map(a => `${a.name}(${a.score.toFixed(2)})`).join(' · ');
    const mins = Math.floor((Date.now() - d.ts) / 60000);
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:9px;margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:10px;font-weight:700;color:${cfg?.color || 'var(--ice)'};">${d.pair} · ${d.side.toUpperCase()}</span>
        <span style="font-size:9px;font-weight:700;color:${closedCol};">${closedStatus}</span>
      </div>
      <div class="cascade-node">
        <div class="cascade-time">T-${mins}m</div>
        <div class="cascade-body">
          <div class="cascade-title">🎯 Signaux déclencheurs</div>
          <div class="cascade-detail">Tech ${d.at>=0?'+':''}${d.at.toFixed(2)} · Fund ${d.af>=0?'+':''}${d.af.toFixed(2)} · LMSR ${(d.lmsr*100).toFixed(0)}%</div>
        </div>
      </div>
      <div class="cascade-node">
        <div class="cascade-time">T-${mins}m</div>
        <div class="cascade-body">
          <div class="cascade-title">🧠 Agents dominants</div>
          <div class="cascade-detail">${agentList || 'n/a'}</div>
        </div>
      </div>
      <div class="cascade-node">
        <div class="cascade-time">T-${mins}m</div>
        <div class="cascade-body">
          <div class="cascade-title">💰 Entrée · $${d.entryPrice.toFixed(cfg?.dec || 2)}</div>
          <div class="cascade-detail">Mise $${d.stake.toFixed(2)} · ${d.reason}</div>
        </div>
      </div>
      ${d.closed ? `<div class="cascade-node">
        <div class="cascade-time">${Math.floor((d.exitTs-d.ts)/60000)}m</div>
        <div class="cascade-body">
          <div class="cascade-title">🏁 Sortie · $${d.exitPrice.toFixed(cfg?.dec || 2)}</div>
          <div class="cascade-detail">${d.pnlPct>=0?'+':''}${d.pnlPct.toFixed(2)}%</div>
        </div>
      </div>` : ''}
    </div>`;
  }).join('');
  el.innerHTML = `<div class="cascade-wrap">
    <div style="font-size:9px;color:var(--t2);margin-bottom:8px;">🦋 Traçabilité complète des 5 dernières décisions :</div>
    ${rows}
  </div>`;
}

// ════════════════════════════════════════════════════════════
// 5. DREAM JOURNAL — Post-trade narratives (bonus)
// ════════════════════════════════════════════════════════════
function generateDreamEntry(pair, side, pnlPct, pnlUsd) {
  const positive = pnlUsd >= 0;
  const strong = Math.abs(pnlPct) > 3;
  const insights = positive
    ? (strong
      ? [`J'ai bien lu le marché sur ${pair}. ${side.toUpperCase()} payant. Les signaux convergeaient déjà avant l'entrée.`,
         `Belle victoire ${pair}. +${pnlPct.toFixed(2)}%. Le timing était là, j'ai juste à écouter mes agents.`,
         `${pair} : la patience a payé. J'aurais pu tenir encore mais sortir en profit reste la règle d'or.`]
      : [`${pair} : petit gain. +${pnlPct.toFixed(2)}%. Conservateur mais cohérent avec le contexte.`,
         `Scalp réussi sur ${pair}. Rien de spectaculaire mais la méthode fonctionne.`,
         `${pair} fermé dans le vert. Discipline avant ego.`])
    : (strong
      ? [`${pair} : leçon coûteuse. ${pnlPct.toFixed(2)}%. J'ai ignoré la divergence MACD. À noter pour la prochaine fois.`,
         `Stop déclenché sur ${pair}. ${pnlPct.toFixed(2)}%. Le marché a fait un retournement brutal, les agents n'ont pas vu venir.`,
         `Erreur sur ${pair}. Surdimensionné la conviction. Réduire le stake quand CV > 2%.`]
      : [`${pair} : petite perte contrôlée. ${pnlPct.toFixed(2)}%. Le stop a bien joué son rôle.`,
         `${pair} fermé. ${pnlPct.toFixed(2)}%. Pas un drame, le risk management tient.`,
         `Perte minime sur ${pair}. La thèse était bonne mais le timing imparfait.`]);
  const text = insights[Math.floor(Math.random() * insights.length)];
  const sentiment = positive ? (strong ? 'joy' : 'content') : (strong ? 'remorse' : 'accepting');
  if(!S.dreamJournal) S.dreamJournal = [];

  // v17 · #1 JOURNAL ENRICHI : capturer agents + indicateurs + pos ouverte
  const pos = (S.openPositions || []).find(p => p.pair === pair) ||
              (S._lastClosedPos && S._lastClosedPos.pair === pair ? S._lastClosedPos : null);
  const ps  = S.pairStates[pair] || {};

  S.dreamJournal.push({
    ts:        Date.now(),
    pair, side, text, sentiment, pnlPct, pnlUsd,
    // v17 · données enrichies
    regime:    ps.regime || 'calm',
    rsi:       ps.rsi14  || null,
    openReason: pos ? (pos._openReason || null) : null,
    openAgents: pos ? (pos._openAgents || []) : [],
    stake:     pos ? (pos.stakeUsdt || 0) : 0,
    cycle:     S.cycle || 0,
  });
  if(S.dreamJournal.length > 80) S.dreamJournal.shift();  // v17 : 80 entrées (était 40)
  // v17 : rafraîchir le journal visible
  try { if(typeof renderJournal === 'function') renderJournal(); } catch(e) {}
}

function renderDreamsPanel() {
  const el = document.getElementById('apanel-dreams');
  if(!el) return;
  const dreams = (S.dreamJournal || []).slice().reverse().slice(0, 8);
  if(dreams.length === 0) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">💭 Le bot n\'a pas encore rêvé… (journal rempli après chaque trade)</div>';
    return;
  }
  const entries = dreams.map(d => {
    const mins = Math.floor((Date.now() - d.ts) / 60000);
    const timeLbl = mins < 60 ? `il y a ${mins}m` : `il y a ${Math.floor(mins/60)}h`;
    const sentCol = d.sentiment === 'joy' ? 'var(--up)' : d.sentiment === 'remorse' ? 'var(--down)' : d.sentiment === 'content' ? 'var(--ice)' : 'var(--gold)';
    const sentEmo = d.sentiment === 'joy' ? '😊' : d.sentiment === 'remorse' ? '😔' : d.sentiment === 'content' ? '🙂' : '😐';
    return `<div class="dream-entry">
      <div class="dream-quote">${d.text}</div>
      <div class="dream-meta">
        <span style="color:${sentCol};">${sentEmo} ${d.sentiment}</span>
        <span>${timeLbl}</span>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `<div style="font-size:9px;color:var(--t2);margin-bottom:8px;">💭 Journal de bord du bot — ${dreams.length} réflexions récentes :</div>${entries}`;
}

// ═══════════════════════════════════════════════════════════════════
// v17 · #1 JOURNAL DE BORD AUTO — Rendu enrichi sur la page HOME
// ═══════════════════════════════════════════════════════════════════
function renderJournal() {
  const entriesEl = document.getElementById('journalEntries');
  const statsEl   = document.getElementById('journalStats');
  const emptyEl   = document.getElementById('journalEmpty');
  const filterPair = document.getElementById('journalFilterPair');
  const filterResult = document.getElementById('journalFilterResult');
  if(!entriesEl) return;

  const journal = (S.dreamJournal || []).slice().reverse(); // plus récent en premier

  // Mettre à jour le filtre paires
  if(filterPair) {
    const pairs = [...new Set(journal.map(e => e.pair))];
    const currentVal = filterPair.value;
    filterPair.innerHTML = '<option value="all">Toutes paires</option>' +
      pairs.map(p => `<option value="${p}" ${currentVal===p?'selected':''}>${p}</option>`).join('');
  }

  // Filtrer
  const pairFilter   = filterPair ? filterPair.value : 'all';
  const resultFilter = filterResult ? filterResult.value : 'all';
  const filtered = journal.filter(e => {
    if(pairFilter !== 'all' && e.pair !== pairFilter) return false;
    if(resultFilter === 'win'  && e.pnlUsd < 0) return false;
    if(resultFilter === 'loss' && e.pnlUsd >= 0) return false;
    return true;
  });

  // Stats
  if(statsEl && journal.length > 0) {
    const totalTrades = journal.length;
    const wins  = journal.filter(e => e.pnlUsd >= 0).length;
    const totalPnl = journal.reduce((s,e) => s + (e.pnlUsd||0), 0);
    const wr = (wins/totalTrades*100).toFixed(0);
    statsEl.innerHTML = `
      <div class="journal-stat-card">
        <span class="journal-stat-val">${totalTrades}</span>
        <span class="journal-stat-lbl">Trades</span>
      </div>
      <div class="journal-stat-card">
        <span class="journal-stat-val" style="color:${parseInt(wr)>=50?'var(--up)':'var(--down)'}">${wr}%</span>
        <span class="journal-stat-lbl">Win Rate</span>
      </div>
      <div class="journal-stat-card">
        <span class="journal-stat-val" style="color:${totalPnl>=0?'var(--up)':'var(--down)'}">
          ${totalPnl>=0?'+':''}$${Math.abs(totalPnl).toFixed(2)}
        </span>
        <span class="journal-stat-lbl">P&L total</span>
      </div>
    `;
    statsEl.style.display = 'grid';
  } else if(statsEl) {
    statsEl.style.display = 'none';
  }

  // Vide
  if(filtered.length === 0) {
    entriesEl.innerHTML = '';
    if(emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';

  // Rendu des entrées (max 20 affichées)
  const displayed = filtered.slice(0, 20);
  entriesEl.innerHTML = displayed.map(e => {
    const win = e.pnlUsd >= 0;
    const pnlStr = (win?'+':'') + '$' + Math.abs(e.pnlUsd||0).toFixed(2)
                 + ' (' + (win?'+':'') + (e.pnlPct||0).toFixed(2) + '%)';
    const ago = Date.now() - e.ts;
    const agoStr = ago < 3600000 ? Math.floor(ago/60000)+'m'
                 : ago < 86400000 ? Math.floor(ago/3600000)+'h'
                 : Math.floor(ago/86400000)+'j';
    const sentEmo = e.sentiment === 'joy'      ? '😊'
                  : e.sentiment === 'remorse'   ? '😔'
                  : e.sentiment === 'content'   ? '🙂'
                  : '😐';
    const regimeLbl = (e.regime||'').toUpperCase();
    const agents = (e.openAgents||[]).slice(0,4);
    const rsiStr = e.rsi ? 'RSI '+Math.round(e.rsi) : '';

    return `
      <div class="journal-entry ${win?'win':'loss'}">
        <div class="journal-entry-header">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="journal-entry-pair">${e.pair}</span>
            <span style="font-size:9px;color:${e.side==='long'?'var(--up)':'var(--down)'};">${e.side==='long'?'↑ LONG':'↓ SHORT'}</span>
          </div>
          <span class="journal-entry-pnl ${win?'win':'loss'}">${pnlStr}</span>
        </div>
        <div class="journal-entry-meta">
          <span>${sentEmo} ${e.sentiment||''}</span>
          ${regimeLbl ? `<span>📊 ${regimeLbl}</span>` : ''}
          ${rsiStr ? `<span>${rsiStr}</span>` : ''}
          ${e.stake ? `<span>💰 $${e.stake}</span>` : ''}
          <span style="margin-left:auto;">il y a ${agoStr}</span>
        </div>
        <div class="journal-entry-text">${e.text||''}</div>
        ${e.openReason ? `<div style="font-size:9px;color:var(--t3);margin-bottom:4px;">🧠 ${e.openReason}</div>` : ''}
        ${agents.length > 0 ? `
          <div class="journal-entry-agents">
            ${agents.map(a => `<span class="journal-agent-tag">${a.emoji||''} ${a.name||''} ${(a.score>=0?'+':'')}${(a.score||0).toFixed(2)}</span>`).join('')}
          </div>` : ''}
      </div>`;
  }).join('');

  // Lien "voir plus" si > 20
  if(filtered.length > 20) {
    entriesEl.innerHTML += `<div style="text-align:center;font-size:10px;color:var(--t3);padding:8px;">
      … ${filtered.length - 20} autres entrées (filtre pour voir plus)
    </div>`;
  }
}
window.renderJournal = renderJournal;
// Tier 1 (Council, 7): scalper/swing/contrarian/trend/hedge/momentum/mean_rev
// Tier 2 (Scouts, 11): macro/fundamental/nlp/sentiment/volume/volatility/corr/
//                     geopolitic/onchain/whale/breakout/harmonic/flow
// Tier 3 (Guardians, 3): risk/security/evolver
// Support Bots (4, non-voting): exec_bot/risk_bot/arb_bot/scalper_bot
//
// Flow: Scouts analyze → Council consults scouts + votes → Guardians veto
// ════════════════════════════════════════════════════════════

const ROSTER_TIERS = {
  council:   ['scalper_v2','swing_v2','contrarian_v2','trend_v2','hedge_v2','momentum_v1','mean_rev_v1'],
  scouts:    ['macro_v1','fundamental_v1','nlp_v1','sentiment_v2','volume_v1','volatility_v1',
              'corr_v1','geopolitic_v1','onchain_v1','whale_v1','breakout_v1','harmonic_v1','flow_v1'],
  guardians: ['risk_bot_v1','security_v1','evolver_v1']
};

// Map council persona IDs to their preferred scouts (who advises whom)
const COUNCIL_ADVISORS = {
  scalper_v2:    ['volume_v1','breakout_v1','flow_v1'],       // fast momentum needs volume
  swing_v2:      ['macro_v1','harmonic_v1','corr_v1'],         // cycles need macro context
  contrarian_v2: ['sentiment_v2','nlp_v1','volatility_v1'],   // fade needs sentiment
  trend_v2:      ['onchain_v1','whale_v1','corr_v1'],         // trend needs structural
  hedge_v2:      ['volatility_v1','geopolitic_v1','macro_v1'],// hedge needs risk signals
  momentum_v1:   ['volume_v1','flow_v1','breakout_v1'],       // momentum core
  mean_rev_v1:   ['volatility_v1','harmonic_v1','corr_v1']    // mean reversion
};

// ── SCOUT ANALYZERS (13) ──
function scoutAnalysis(agentId, pair) {
  const ps   = S.pairStates?.[pair];
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(pair) : null;
  if(!ps) return { score:0, conf:0.3, reasoning:'Pas de données' };

  const candles = ps.candles || [];
  const price   = ps.price || 0;

  switch(agentId) {
    case 'macro_v1': {
      const af = fund?.fundScore || 0;
      return {
        score: Math.max(-1, Math.min(1, af * 1.5)),
        conf: 0.7,
        reasoning: af > 0.2 ? 'Macro favorable (Fed/liquidité)' : af < -0.2 ? 'Macro défavorable (risk-off global)' : 'Macro neutre'
      };
    }
    case 'fundamental_v1': {
      const af = fund?.fundScore || 0;
      const bonus = fund?.raw?.btcDom ? (fund.raw.btcDom - 50) * -0.02 : 0;
      return {
        score: Math.max(-1, Math.min(1, af + bonus)),
        conf: 0.65,
        reasoning: af > 0.15 ? 'Fondamentaux alignés' : af < -0.15 ? 'Rotation en cours' : 'Équilibre fondamental'
      };
    }
    case 'nlp_v1': {
      const af = fund?.fundScore || 0;
      return {
        score: af * 0.8,
        conf: 0.72,
        reasoning: af > 0.2 ? 'Narrative haussière dominante' : af < -0.2 ? 'Narrative baissière' : 'Pas de consensus narratif'
      };
    }
    case 'sentiment_v2': {
      // v6.7: Real sentiment — price momentum + RSI bias as social proxy
      const candles2 = ps?.candles || [];
      if(candles2.length < 5) return { score:0, conf:0.4, reasoning:'Données insuffisantes' };
      const closes = candles2.slice(-8).map(x=>x.c);
      const momentum = closes.length > 1 ? (closes[closes.length-1] - closes[0]) / closes[0] : 0;
      const rsi = tech?.raw?.rsi?.rsi || 50;
      // RSI>65 = euphorie, RSI<35 = panique
      const rsiSent = rsi > 65 ? (rsi-65)/35 : rsi < 35 ? -(35-rsi)/35 : 0;
      const rawScore = Math.max(-1, Math.min(1, momentum*10 + rsiSent*0.5 + (tech?.atScore||0)*0.3));
      return {
        score: rawScore,
        conf: 0.72,
        reasoning: rawScore > 0.4 ? `Euphorie (RSI ${rsi.toFixed(0)}, mom+)` : rawScore < -0.4 ? `Panique (RSI ${rsi.toFixed(0)})` : `Sentiment neutre (RSI ${rsi.toFixed(0)})`
      };
    }
    case 'volume_v1': {
      // v6.7: Use candle range as volume proxy (no real volume data available)
      if(candles.length < 10) return { score:0, conf:0.3, reasoning:'Données insuffisantes' };
      // Range spike = volume spike proxy
      const recentRange = candles.slice(-5).map(cd => (cd.h - cd.l) / Math.max(0.0001, cd.c));
      const avgRange    = candles.slice(-20,-5).map(cd => (cd.h - cd.l) / Math.max(0.0001, cd.c));
      const recentAvg   = recentRange.reduce((s,v)=>s+v,0) / recentRange.length;
      const historicAvg = avgRange.reduce((s,v)=>s+v,0) / Math.max(1, avgRange.length);
      const ratio = recentAvg / Math.max(0.0001, historicAvg);
      const priceUp = candles[candles.length-1].c > candles[candles.length-5].c;
      // High range with up price = bullish volume, high range with down = bearish
      if(ratio > 1.5) {
        return { score: priceUp ? +0.6 : -0.6, conf:0.75, reasoning:`Volume spike ×${ratio.toFixed(1)} ${priceUp?'(haussier)':'(baissier)'}` };
      } else if(ratio < 0.6) {
        return { score: 0, conf: 0.5, reasoning:`Volume faible (×${ratio.toFixed(1)}) · distribution` };
      }
      const score = priceUp ? Math.min(0.4, (ratio-1)*0.5) : -Math.min(0.4, (ratio-1)*0.5);
      return { score, conf:0.6, reasoning:`Volume ×${ratio.toFixed(1)} ${priceUp?'haussier':'baissier'}` };
    }
        case 'volatility_v1': {
      // v6.7: Volatility regime → directional bias
      const cv  = tech?.raw?.stddev?.cv || 0.015;
      const adx = tech?.raw?.adx?.adx || 20;
      const at  = tech?.atScore || 0;
      // High ADX + trending = follow the trend
      if(adx > 30) return { score: at * 0.8, conf:0.80, reasoning:`Tendance forte (ADX ${adx.toFixed(0)}) · ${at>0?'haussier':'baissier'}` };
      if(cv > 0.03) return { score: at * 0.5, conf:0.70, reasoning:`Vol élevée (${(cv*100).toFixed(1)}%) — suivre AT` };
      if(cv < 0.008) {
        // Compression = breakout imminent, bias toward last price action
        return { score: at * 0.6, conf:0.60, reasoning:`Compression vol · breakout probable` };
      }
      // Normal regime — moderate confidence in AT signal
      return { score: at * 0.6, conf:0.65, reasoning:`Régime normal (cv${(cv*100).toFixed(1)}%, ADX${adx.toFixed(0)})` };
    }

    case 'corr_v1': {
      // Detect divergence from market leaders
      const leaderScore = (S.pairStates['BTC/USDT']?.candles?.slice(-5).reduce((s,c,i,a)=>i>0?s+Math.sign(c.c-a[i-1].c):s,0)) || 0;
      return {
        score: Math.max(-1, Math.min(1, leaderScore * 0.15)),
        conf: 0.6,
        reasoning: leaderScore > 2 ? 'BTC mène la hausse (corrélation +)' : leaderScore < -2 ? 'BTC mène la baisse' : 'Découplage en cours'
      };
    }
    case 'geopolitic_v1': {
      // v6.7: Geopolitical risk proxy — volatility spike + macro
      const cv = tech?.raw?.stddev?.cv || 0.015;
      const af = fund?.fundScore || 0;
      const riskScore = cv > 0.03 ? -0.6 : cv > 0.02 ? -0.3 : cv < 0.008 ? 0.2 : 0.05;
      const rawScore  = Math.max(-1, Math.min(1, riskScore + af * 0.35));
      return {
        score: rawScore,
        conf: 0.60,
        reasoning: rawScore < -0.3 ? `Risque géopolitique élevé (vol ${(cv*100).toFixed(1)}%)` : rawScore > 0.2 ? 'Contexte favorable' : 'Contexte stable'
      };
    }
    case 'onchain_v1': {
      // v6.7: On-chain proxy via candle efficiency (body/range ratio)
      const candles2 = ps?.candles || [];
      if(candles2.length < 10) return { score:0, conf:0.4, reasoning:'Données insuffisantes' };
      let accum = 0;
      candles2.slice(-12).forEach(cd => {
        const body  = Math.abs(cd.c - cd.o);
        const range = (cd.h - cd.l) || 0.0001;
        accum += (cd.c > cd.o ? 1 : -1) * (body / range);
      });
      const rawScore = Math.max(-1, Math.min(1, accum / 12));
      return {
        score: rawScore,
        conf: 0.70,
        reasoning: rawScore > 0.15 ? 'Accumulation on-chain (corps haussiers)' : rawScore < -0.15 ? 'Distribution (corps baissiers)' : 'Flux on-chain neutres'
      };
    }
    case 'whale_v1': {
      // v6.7: Whale detection via large candle bodies (no volume data available)
      if(candles.length < 10) return { score:0, conf:0.3, reasoning:'En observation' };
      const last = candles[candles.length-1];
      // Body size relative to recent average body
      const lastBody = Math.abs(last.c - last.o);
      const avgBody  = candles.slice(-10,-1).reduce((s,cd)=>s+Math.abs(cd.c-cd.o),0) / 9;
      const ratio    = lastBody / Math.max(0.0001, avgBody);
      const bullish  = last.c > last.o;
      if(ratio > 2.5) {
        return { score: bullish ? +0.7 : -0.7, conf:0.80, reasoning:`Grosse bougie (×${ratio.toFixed(1)} moy.) · ${bullish?'achat massif':'vente massive'}` };
      } else if(ratio > 1.5) {
        return { score: bullish ? +0.35 : -0.35, conf:0.65, reasoning:`Bougie significative (×${ratio.toFixed(1)})` };
      }
      return { score:0, conf:0.45, reasoning:`Activité normale (×${ratio.toFixed(1)})` };
    }

    case 'breakout_v1': {
      if(candles.length < 20) return { score:0, conf:0.3, reasoning:'Structure en construction' };
      const recent20 = candles.slice(-20);
      const high = Math.max(...recent20.slice(0,-2).map(c=>c.h||c.c));
      const low  = Math.min(...recent20.slice(0,-2).map(c=>c.l||c.c));
      if(price > high * 1.002) return { score:+0.7, conf:0.78, reasoning:`Breakout haut cassé (${high.toFixed(2)})` };
      if(price < low  * 0.998) return { score:-0.7, conf:0.78, reasoning:`Breakout bas cassé (${low.toFixed(2)})` };
      const range = (price - low) / Math.max(0.001, high - low);
      return { score: 0, conf: 0.5, reasoning: `Dans la range (${(range*100).toFixed(0)}%)` };
    }
    case 'harmonic_v1': {
      const r = typeof detectHarmonicResonance === 'function' ? detectHarmonicResonance(pair) : null;
      if(!r) return { score:0, conf:0.3, reasoning:'Analyse en cours' };
      const dir = r.direction === 'bullish' ? +1 : r.direction === 'bearish' ? -1 : 0;
      return {
        score: dir * r.strength,
        conf: r.strength,
        reasoning: r.isResonance ? `${r.bullCount > r.bearCount ? r.bullCount : r.bearCount}/5 indicateurs alignés` : `Alignement ${(r.strength*100).toFixed(0)}%`
      };
    }
    case 'flow_v1': {
      // Approximate order flow from candle body direction
      if(candles.length < 5) return { score:0, conf:0.3, reasoning:'Données insuffisantes' };
      const last5 = candles.slice(-5);
      const bullBodies = last5.filter(c => c.c > c.o).length;
      const bearBodies = 5 - bullBodies;
      const netFlow = (bullBodies - bearBodies) / 5;
      return {
        score: netFlow * 0.7,
        conf: Math.abs(netFlow) * 0.7 + 0.3,
        reasoning: netFlow > 0.3 ? `Flux acheteur dominant (${bullBodies}/5)` : netFlow < -0.3 ? `Flux vendeur dominant (${bearBodies}/5)` : 'Flux équilibré'
      };
    }
  }
  return { score: 0, conf: 0.3, reasoning: 'Agent en veille' };
}

// ── COUNCIL ANALYZERS (7 voters, consult scouts) ──
function councilVote(councilId, pair, scoutResults) {
  const advisors = COUNCIL_ADVISORS[councilId] || [];
  // Gather scout inputs
  const advice = advisors.map(sId => scoutResults[sId]).filter(Boolean);
  const adviceScore = advice.length > 0
    ? advice.reduce((s,a) => s + a.score * a.conf, 0) / advice.reduce((s,a) => s + a.conf, 0)
    : 0;

  const ps = S.pairStates?.[pair];
  const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
  const lmsr = ps && typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const at   = tech?.atScore || 0;
  const rsi  = tech?.raw?.rsi?.rsi || 50;
  const macd = tech?.raw?.macd?.hist || 0;
  const adx  = tech?.raw?.adx?.adx || 20;

  let ownScore = 0, ownQuote = '';

  switch(councilId) {
    case 'scalper_v2':
      ownScore = (lmsr - 0.5) * 2;
      ownQuote = ownScore > 0.2 ? `Push court, LMSR ${(lmsr*100).toFixed(0)}%. Long scalp.` : ownScore < -0.2 ? `Pression vendeuse. Short rapide.` : `Pas de momentum net.`;
      break;
    case 'swing_v2':
      ownScore = macd > 0 && at > 0.1 ? 0.6 : macd < 0 && at < -0.1 ? -0.6 : 0;
      ownQuote = ownScore > 0 ? `MACD+${macd.toFixed(3)}, structure 1h-4h haussière.` : ownScore < 0 ? `MACD négatif, cycle baissier.` : `MACD neutre, j'attends.`;
      break;
    case 'contrarian_v2':
      if(rsi > 72)      { ownScore = -0.7; ownQuote = `RSI ${rsi.toFixed(0)} surchauffe. Je fade.`; }
      else if(rsi < 28) { ownScore = +0.7; ownQuote = `RSI ${rsi.toFixed(0)} capitulation. J'achète.`; }
      else              { ownScore = 0; ownQuote = `Pas d'extrême à fader.`; }
      break;
    case 'trend_v2':
      if(adx > 25 && at > 0.15)       { ownScore = +0.8; ownQuote = `ADX ${adx.toFixed(0)}, tendance claire. Long.`; }
      else if(adx > 25 && at < -0.15) { ownScore = -0.8; ownQuote = `Tendance baissière confirmée.`; }
      else                             { ownScore = 0;   ownQuote = `Pas de tendance (ADX ${adx.toFixed(0)}).`; }
      break;
    case 'hedge_v2':
      const cv = tech?.raw?.stddev?.cv || 0.015;
      if(cv > 0.025)               { ownScore = 0; ownQuote = `Volatilité élevée (${(cv*100).toFixed(1)}%). On attend.`; }
      else if(adviceScore > 0.3)   { ownScore = 0.5; ownQuote = `Signaux alignés, vol contenue. Entrée raisonnable.`; }
      else if(adviceScore < -0.3)  { ownScore = -0.5; ownQuote = `Signaux baissiers + macro. Short prudent.`; }
      else                         { ownScore = 0; ownQuote = `Conviction insuffisante.`; }
      break;
    case 'momentum_v1':
      ownScore = at * 0.9;
      ownQuote = at > 0.2 ? `Momentum positif fort (AT ${at.toFixed(2)}).` : at < -0.2 ? `Momentum négatif (AT ${at.toFixed(2)}).` : `Momentum faible.`;
      break;
    case 'mean_rev_v1':
      const bb = tech?.raw?.boll?.position || 0.5;
      if(bb > 0.9)      { ownScore = -0.6; ownQuote = `Sur la borne haute Boll, retour à la moyenne.`; }
      else if(bb < 0.1) { ownScore = +0.6; ownQuote = `Sur la borne basse, rebond probable.`; }
      else              { ownScore = 0;    ownQuote = `Proche de la moyenne, pas d'edge.`; }
      break;
  }

  // Blend own analysis (60%) with advisors (40%)
  const finalScore = ownScore * 0.6 + adviceScore * 0.4;
  const vote = finalScore > 0.18 ? 'long' : finalScore < -0.18 ? 'short' : 'hold';

  return {
    vote,
    score: finalScore,
    quote: ownQuote,
    advisors: advisors.map(sId => ({
      id: sId,
      score: scoutResults[sId]?.score || 0,
      emoji: (S.agents || []).find(a => a.id === sId)?.emoji || '·'
    }))
  };
}

// ── GUARDIAN CHECKS (3 vetoers) ──
function guardianCheck(guardianId, verdict, pair, stake) {
  switch(guardianId) {
    case 'risk_bot_v1': {
      const totalExp = (S.openPositions || []).reduce((s,p) => s + (p.stakeUsdt || 0), 0);
      const portfolio = S.portfolio || 1;
      const expPct = (totalExp + (stake || 0)) / portfolio * 100;
      if(expPct > 65) return { status:'veto', reasoning:`Exposition ${expPct.toFixed(0)}% > 65%. Trade refusé.` };
      if(expPct > 50) return { status:'warn', reasoning:`Exposition élevée (${expPct.toFixed(0)}%). Attention.` };
      return { status:'approve', reasoning:`Exposition OK (${expPct.toFixed(0)}%).` };
    }
    case 'security_v1': {
      const ps = S.pairStates?.[pair];
      const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
      const cv = tech?.raw?.stddev?.cv || 0.015;
      if(cv > 0.04) return { status:'veto', reasoning:`Volatilité anormale (${(cv*100).toFixed(1)}%). Pause.` };
      if(cv > 0.03) return { status:'warn', reasoning:'Volatilité élevée.' };
      return { status:'approve', reasoning:'Marché stable.' };
    }
    case 'evolver_v1': {
      // v5.9 — Learning from archives + groupthink detection
      const archiveCount = (S.archives?.snapshots || []).length;
      const recentTradesPnl = Object.values(S.pairStates || {})
        .flatMap(p => (p.trades || []).slice(-5).filter(t => t.type === 'position' && t.pnlUsdt != null))
        .map(t => t.pnlUsdt);
      const recentLosses = recentTradesPnl.filter(p => p < 0).length;
      if(recentLosses >= 4 && recentTradesPnl.length >= 5) {
        return { status:'warn', reasoning:`${recentLosses}/5 derniers trades perdants. ${archiveCount > 0 ? archiveCount + ' archives consultées. ' : ''}Recalibration suggérée.` };
      }
      return { status:'approve', reasoning: archiveCount > 0 ? `Système en bonne santé · ${archiveCount} archives en mémoire` : 'Système en bonne santé' };
    }
  }
  return { status:'approve', reasoning:'OK' };
}

// ── ORCHESTRATOR ──
function runRosterAnalysis(pair) {
  pair = pair || S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  // Run all scouts
  const scoutResults = {};
  ROSTER_TIERS.scouts.forEach(sId => {
    scoutResults[sId] = scoutAnalysis(sId, pair);
  });
  // Run all council members
  const councilResults = {};
  ROSTER_TIERS.council.forEach(cId => {
    councilResults[cId] = councilVote(cId, pair, scoutResults);
  });
  // Tally votes — v7.12 MOD 7 : pondération par fitness
  // Les agents historiquement bons pèsent plus lourd. Les mauvais chroniques pèsent moins.
  let longVotes = 0, shortVotes = 0, holdVotes = 0;
  let longConv = 0, shortConv = 0;
  let longWeighted = 0, shortWeighted = 0, holdWeighted = 0;  // MOD 7
  let totalWeight = 0;
  
  Object.entries(councilResults).forEach(([cId, v]) => {
    // Compute weight from fitness: fitness 500 = weight 1.0, 1000 = 1.5, 1500 = 2.0, 1900+ = 2.5
    let weight = 1.0;
    const agent = (S.agents || []).find(a => a.id === cId);
    if (agent && typeof agent.fitness === 'number') {
      weight = 0.5 + (Math.max(50, Math.min(2000, agent.fitness)) / 1000);
      // Penalize agents on a bad losing streak (3+ consecutive errors)
      if (agent.streak !== undefined && agent.streak <= -3) {
        weight *= 0.5;  // losing streak = half weight
      }
      // Bonus for agents with high correction count (proven right often)
      const hits = agent.corrections || 0;
      const misses = agent.errors || 0;
      if (hits + misses >= 10) {
        const hitRate = hits / (hits + misses);
        if (hitRate > 0.60) weight *= 1.3;
        else if (hitRate < 0.40) weight *= 0.6;
      }
    }
    totalWeight += weight;
    
    if(v.vote === 'long')       { longVotes++;  longConv  += Math.abs(v.score); longWeighted  += weight; }
    else if(v.vote === 'short') { shortVotes++; shortConv += Math.abs(v.score); shortWeighted += weight; }
    else                        { holdVotes++;                                  holdWeighted  += weight; }
  });
  const totalVotes = ROSTER_TIERS.council.length;
  
  // v7.12 MOD 7 : décision basée sur votes PONDÉRÉS (pas juste majorité simple)
  const verdict = longWeighted > shortWeighted && longWeighted > holdWeighted ? 'LONG'
                : shortWeighted > longWeighted && shortWeighted > holdWeighted ? 'SHORT'
                : 'HOLD';
  const winWeighted = Math.max(longWeighted, shortWeighted, holdWeighted);
  const consensus = totalWeight > 0 ? winWeighted / totalWeight : 0;
  // Coalition : 4+ votes ET consensus pondéré > 55%
  const coalition = ((longVotes >= 4 || shortVotes >= 4) && consensus >= 0.55);
  // Run guardians
  const guardianResults = {};
  let anyVeto = false;
  ROSTER_TIERS.guardians.forEach(gId => {
    guardianResults[gId] = guardianCheck(gId, verdict, pair, (S.tradingAccount || 100) * 0.1);
    if(guardianResults[gId].status === 'veto') anyVeto = true;
  });
  // v6.3 · Sync computed scores back to S.agents so the UI shows live values
  if(S.agents) {
    // Scouts — direct score
    Object.entries(scoutResults).forEach(([id, res]) => {
      const agent = S.agents.find(a => a.id === id);
      if(agent && res && typeof res.score === 'number') {
        agent.score = res.score;
        agent.conf  = res.conf || agent.conf;
      }
    });
    // Council — vote → score
    Object.entries(councilResults).forEach(([id, res]) => {
      const agent = S.agents.find(a => a.id === id);
      if(agent && res) {
        const magnitude = Math.abs(res.score || 0.3);
        agent.score = res.vote === 'long'  ?  magnitude
                    : res.vote === 'short' ? -magnitude : 0;
      }
    });
    // Fleet bots — score reflects their current status
    if(S.botFleet) {
      Object.entries(S.botFleet).forEach(([id, b]) => {
        const agent = S.agents.find(a => a.id === id);
        if(agent) {
          // Active status → positive score, alert → negative, idle → ~0
          agent.score = b.status === 'executing' ?  0.3
                      : b.status === 'active'    ?  0.15
                      : b.status === 'alert'     ? -0.4
                      : b.status === 'scanning'  ?  0.05
                      : 0.0;
        }
      });
    }
    // Guardians — status → score
    Object.entries(guardianResults).forEach(([id, res]) => {
      const agent = S.agents.find(a => a.id === id);
      if(agent) {
        agent.score = res.status === 'veto' ? -0.5 : res.status === 'warn' ? -0.2 : 0.05;
      }
    });
  }

  return {
    pair,
    scoutResults,
    councilResults,
    guardianResults,
    verdict,
    votes: { long:longVotes, short:shortVotes, hold:holdVotes, total:totalVotes },
    consensus,
    coalition,
    finalDecision: anyVeto ? 'VETO' : verdict,
    anyVeto
  };
}

// ════════════════════════════════════════════════════════════
// ENHANCED RENDER — Debate + Swarm panels using full roster
// ════════════════════════════════════════════════════════════
function renderDebatePanel() {
  const el = document.getElementById('apanel-debate');
  if(!el) return;
  const pair = S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  const r = runRosterAnalysis(pair);
  if(!r) {
    el.innerHTML = '<div style="color:var(--t3);font-size:10px;text-align:center;padding:12px;">En attente de signaux…</div>';
    return;
  }
  const cfg = PAIRS[pair];

  // Coalition banner
  const coalitionHtml = r.coalition ? `
    <div class="coalition-banner">
      <span class="icon">🤝</span>
      <div class="text">
        <strong>Coalition formée</strong><br>
        <span style="font-size:8px;color:var(--t3);">${r.votes.long >= 4 ? r.votes.long : r.votes.short}/${r.votes.total} du conseil aligné · conviction élevée</span>
      </div>
      <span class="conv">${(r.consensus * 100).toFixed(0)}%</span>
    </div>` : '';

  // Council voters with their advisors (v6.5: fully defensive)
  const councilHtml = ROSTER_TIERS.council.map(cId => {
    const v = r.councilResults?.[cId];
    if(!v) return `<div style="color:var(--t3);font-size:10px;padding:4px;">⏳ ${cId} en attente…</div>`;
    const agent = (S.agents || []).find(a => a.id === cId);
    const name = agent?.name || cId;
    const emoji = agent?.emoji || '·';
    const advisorChips = (v?.advisors || []).map(adv => {
      const cls = adv.score > 0.15 ? 'bullish' : adv.score < -0.15 ? 'bearish' : '';
      return `<span class="advisor-chip ${cls}">${adv.emoji} ${(adv.score>=0?'+':'')}${adv.score.toFixed(1)}</span>`;
    }).join('');
    if(!v) return ''; // v6.5: skip if councilVote failed
    return `
    <div class="persona-row vote-${v?.vote||'hold'}">
      <div class="persona-avatar">${emoji}</div>
      <div class="persona-body">
        <div class="persona-name">${name.toUpperCase()}</div>
        <div class="persona-quote">« ${v.quote} »</div>
        <div class="advisors">${advisorChips}</div>
      </div>
      <div class="persona-vote ${v.vote}">${v.vote === 'long' ? 'LONG' : v.vote === 'short' ? 'SHORT' : 'HOLD'}</div>
    </div>`;
  }).join('');

  // Guardians summary
  const guardianHtml = ROSTER_TIERS.guardians.map(gId => {
    const g = r.guardianResults[gId];
    const agent = (S.agents || []).find(a => a.id === gId);
    const icon = g.status === 'veto' ? '🚫' : g.status === 'warn' ? '⚠️' : '✅';
    const col  = g.status === 'veto' ? 'var(--down)' : g.status === 'warn' ? 'var(--gold)' : 'var(--up)';
    return `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--s2);border-radius:6px;margin-bottom:3px;font-size:9px;">
      <span style="flex-shrink:0;">${agent?.emoji || '·'}</span>
      <span style="color:var(--t2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${agent?.name || gId}</span>
      <span style="color:${col};font-size:9px;">${icon} ${g.status.toUpperCase()}</span>
    </div>`;
  }).join('');

  const verdictCol = r.finalDecision === 'LONG' ? 'var(--up)' : r.finalDecision === 'SHORT' ? 'var(--down)' : r.finalDecision === 'VETO' ? 'var(--down)' : 'var(--gold)';

  el.innerHTML = `
    <div class="dialogue-wrap council-enhanced">
      <div class="dialogue-header">
        <span style="font-size:9px;color:var(--t2);font-weight:600;">🎭 CONSEIL · ${ROSTER_TIERS.council.length} voteurs · ${ROSTER_TIERS.scouts.length} scouts</span>
        <span style="font-size:9px;color:${cfg?.color || 'var(--pur)'};font-weight:700;">${pair}</span>
      </div>
      ${coalitionHtml}
      ${councilHtml}
      <div style="margin-top:10px;padding:7px 9px;background:rgba(245,200,66,.05);border:1px solid rgba(245,200,66,.15);border-radius:9px;">
        <div style="font-size:8px;color:var(--t3);letter-spacing:.07em;margin-bottom:4px;">⚖️ GARDIENS</div>
        ${guardianHtml}
      </div>
      <div class="dialogue-verdict">
        <div class="dialogue-verdict-label">DÉCISION FINALE</div>
        <div class="dialogue-verdict-val" style="color:${verdictCol};">
          ${r.finalDecision} · ${r.votes.long}L/${r.votes.short}S/${r.votes.hold}H${r.anyVeto ? ' 🚫' : ''}
        </div>
      </div>
      <div class="force-bar">
        <button class="force-btn long"  onclick="forceTrade('long')">⚡ FORCER LONG</button>
        <button class="force-btn short" onclick="forceTrade('short')">⚡ FORCER SHORT</button>
        <button class="force-btn skip"  onclick="forceTrade('skip')">❌ SKIP</button>
      </div>
    </div>
    ${typeof renderBrainLog === 'function' ? renderBrainLog() : ''}`;
}

// ── SWARM PANEL — Show all 21 agents in their tiers ──
function renderSwarmPanel() {
  const el = document.getElementById('apanel-swarm');
  if(!el) return;
  const pair = S.activePair || (Object.keys(S.pairStates || {})[0]) || 'BTC/USDT';
  const r = runRosterAnalysis(pair);

  const renderAgent = (id, tier, data) => {
    const agent = (S.agents || []).find(a => a.id === id) || {};
    const name = agent.name || id;
    const emoji = agent.emoji || '·';
    let signal, reason, cls;
    if(tier === 1) {
      // Council member
      const v = data;
      const vote = v?.vote || 'hold';
      signal = vote === 'long' ? 'LONG' : vote === 'short' ? 'SHORT' : 'HOLD';
      reason = v?.quote || 'En attente';
      cls = vote === 'long' ? 'bullish' : vote === 'short' ? 'bearish' : 'neutral';
    } else if(tier === 2) {
      const s = data;
      signal = s?.score >= 0 ? `+${(s?.score||0).toFixed(2)}` : `${(s?.score||0).toFixed(2)}`;
      reason = s?.reasoning || 'En analyse';
      cls = (s?.score||0) > 0.15 ? 'bullish' : (s?.score||0) < -0.15 ? 'bearish' : 'neutral';
    } else {
      const g = data;
      signal = g?.status === 'approve' ? '✓ OK' : g?.status === 'warn' ? '⚠ WARN' : '🚫 VETO';
      reason = g?.reasoning || 'En veille';
      cls = g?.status === 'approve' ? 'approve' : 'veto';
    }
    const firing = (tier === 1 && data?.vote !== 'hold') ||
                   (tier === 2 && Math.abs(data?.score || 0) > 0.4) ||
                   (tier === 3 && data?.status !== 'approve');
    const muted = (S.mutedAgents || []).includes(id);
    return `<div class="swarm-agent tier-${tier}${firing ? ' firing' : ''}${muted ? ' muted' : ''}">
      <div class="swarm-avatar">${emoji}</div>
      <div class="swarm-body">
        <div class="swarm-name">${name}</div>
        <div class="swarm-reason">${reason}</div>
      </div>
      <div class="swarm-signal ${cls}">${signal}</div>
      <button class="agent-mute-btn${muted ? ' muted' : ''}" onclick="event.stopPropagation();toggleAgentMute('${id}')" title="${muted ? 'Réactiver' : 'Rendre muet'}">${muted ? '✕' : '·'}</button>
    </div>`;
  };

  const tier1 = ROSTER_TIERS.council.map(id => renderAgent(id, 1, r.councilResults[id])).join('');
  const tier2 = ROSTER_TIERS.scouts.map(id => renderAgent(id, 2, r.scoutResults[id])).join('');
  const tier3 = ROSTER_TIERS.guardians.map(id => renderAgent(id, 3, r.guardianResults[id])).join('');

  // Summary stats
  const activeScouts = Object.values(r.scoutResults).filter(s => Math.abs(s.score) > 0.15).length;
  const firingCouncil = Object.values(r.councilResults).filter(v => v.vote !== 'hold').length;
  const guardianAlerts = Object.values(r.guardianResults).filter(g => g.status !== 'approve').length;

  el.innerHTML = `
    <div class="swarm-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:10px;color:var(--pur);font-weight:700;">🐝 21 AGENTS · ${r.pair}</span>
        <span style="font-size:8px;color:var(--t3);">${firingCouncil + activeScouts}/21 actifs</span>
      </div>

      <div class="swarm-tier">
        <div class="swarm-tier-head">
          <span class="swarm-tier-name" style="color:var(--pur);">👑 CONSEIL · voteurs</span>
          <span class="swarm-tier-count">${firingCouncil}/${ROSTER_TIERS.council.length}</span>
        </div>
        ${tier1}
      </div>

      <div class="swarm-tier">
        <div class="swarm-tier-head">
          <span class="swarm-tier-name" style="color:var(--ice);">🔭 SCOUTS · analystes</span>
          <span class="swarm-tier-count">${activeScouts}/${ROSTER_TIERS.scouts.length}</span>
        </div>
        ${tier2}
      </div>

      <div class="swarm-tier">
        <div class="swarm-tier-head">
          <span class="swarm-tier-name" style="color:var(--gold);">⚖️ GARDIENS · veto</span>
          <span class="swarm-tier-count">${guardianAlerts === 0 ? 'tous OK' : guardianAlerts + ' alerte' + (guardianAlerts > 1 ? 's' : '')}</span>
        </div>
        ${tier3}
      </div>

      <div style="margin-top:8px;padding:8px 10px;background:var(--s2);border-radius:9px;text-align:center;">
        <div style="font-size:8px;color:var(--t3);letter-spacing:.08em;">VERDICT ORCHESTRÉ</div>
        <div style="font-family:var(--font-display);font-size:16px;font-weight:700;margin-top:3px;color:${r.finalDecision === 'LONG' ? 'var(--up)' : r.finalDecision === 'SHORT' ? 'var(--down)' : r.finalDecision === 'VETO' ? 'var(--down)' : 'var(--gold)'};">
          ${r.finalDecision} · ${(r.consensus*100).toFixed(0)}%${r.coalition ? ' 🤝' : ''}
        </div>
      </div>
    </div>`;
}

// v5.8 FIX — _V54_TABS now declared ONCE at top of v5.4 section with all tabs included (no TDZ)
// Replace switchAnalyticsTab + renderAnalyticsPanel with v5.5 versions





// Expose orchestrator for bot decision consumption
window._runRosterAnalysis = runRosterAnalysis;

// ════════════════════════════════════════════════════════════
// v5.6 — ACTIVE BOT FLEET (8 specialized execution bots)
// ════════════════════════════════════════════════════════════
// Each bot has: status (idle/scanning/active/executing/alert), lastAction,
// lastActionTs, contributions (count), pnlContrib ($)
// Triggered on events: 'tick', 'pre_trade', 'post_trade'
// ════════════════════════════════════════════════════════════

const BOT_FLEET_IDS = [
  'exec_bot_v1',       // ⚡ TWAP/VWAP splits large trades
  'arb_bot_v1',        // ⚖️ Scans for strongest cross-pair opportunity
  'scalper_bot_v1',    // 🎯 Micro-scalps during idle
  'fiscal_bot_v1',     // 💎 Tax-loss harvest timing
  'dca_bot_v1',        // 🧲 DCA in low volatility regimes
  'rescue_bot_v1',     // 🛟 Emergency flatten on critical drawdown
  'rebalance_bot_v1',  // 🔀 Fix portfolio skew
  'smart_sizer_v1'     // 📊 Kelly/VaR-based sizing multiplier
];

// Init fleet state
function initBotFleet() {
  if(!S.botFleet) S.botFleet = {};
  BOT_FLEET_IDS.forEach(id => {
    if(!S.botFleet[id]) S.botFleet[id] = {
      status: 'idle',
      lastAction: 'Prêt',
      lastActionTs: 0,
      contributions: 0,
      pnlContrib: 0
    };
  });
}
if(typeof S !== 'undefined') initBotFleet();

// Helper
function _setBot(id, status, action) {
  if(!S.botFleet?.[id]) return;
  S.botFleet[id].status = status;
  S.botFleet[id].lastAction = action;
  S.botFleet[id].lastActionTs = Date.now();
}

// ── 1. EXEC BOT · TWAP/VWAP splitting ──
function botExec(stakeUsd) {
  if(!stakeUsd || stakeUsd < 10) {
    _setBot('exec_bot_v1', 'idle', `Taille ${stakeUsd?.toFixed(0) || 0}$ — exécution directe`);
    return { chunks: 1, savings: 0 };
  }
  const chunks = stakeUsd > 200 ? 3 : stakeUsd > 100 ? 2 : 1;
  const savings = stakeUsd * 0.0012 * chunks;  // slippage saved
  _setBot('exec_bot_v1', 'executing', `TWAP ${chunks}x sur ${stakeUsd.toFixed(0)}$ · économie ~${savings.toFixed(2)}$`);
  S.botFleet.exec_bot_v1.contributions++;
  S.botFleet.exec_bot_v1.pnlContrib += savings;
  return { chunks, savings };
}

// ── 2. ARB BOT · cross-pair scanner (v6.0 · proposition actionnable) ──
function botArb() {
  const pairs = Object.keys(PAIRS || {});
  let best = null;
  pairs.forEach(p => {
    const ps = S.pairStates?.[p];
    const tech = typeof getTechSignals === 'function' ? getTechSignals(p) : null;
    const fund = typeof getFundamentalSignals === 'function' ? getFundamentalSignals(p) : null;
    if(!tech || !fund) return;
    const composite = Math.abs((tech.atScore || 0) * 0.6 + (fund.fundScore || 0) * 0.4);
    const hasPosition = (S.openPositions || []).some(pos => pos.pair === p);
    if(composite > 0.45 && !hasPosition) {
      if(!best || composite > best.score) best = { pair: p, score: composite, direction: (tech.atScore > 0 ? 'long' : 'short') };
    }
  });
  if(best) {
    _setBot('arb_bot_v1', 'active', `${best.pair} ${best.direction.toUpperCase()} · conviction ${(best.score*100).toFixed(0)}%`);
    // v6.0 · Publie une proposition de trade
    if(!S.pendingActions) S.pendingActions = [];
    const already = S.pendingActions.find(a => a.type === 'arb' && a.pair === best.pair && a.side === best.direction);
    if(!already) {
      // Clear other arb proposals first (one opportunity at a time)
      S.pendingActions = S.pendingActions.filter(a => a.type !== 'arb');
      S.pendingActions.unshift({
        id: 'ab' + Date.now().toString(36),
        type: 'arb',
        pair: best.pair,
        side: best.direction,
        ts: Date.now(),
        source: 'arb_bot_v1',
        title: `Opportunité ${best.pair}`,
        detail: `${best.direction.toUpperCase()} · conviction ${(best.score*100).toFixed(0)}%`,
        action: 'open_trade',
        payload: { pair: best.pair, side: best.direction }
      });
      if(S.pendingActions.length > 10) S.pendingActions.length = 10;
    }
  } else {
    _setBot('arb_bot_v1', 'scanning', 'Balayage cross-pair · rien au-dessus du seuil 45%');
    if(S.pendingActions) S.pendingActions = S.pendingActions.filter(a => a.type !== 'arb');
  }
  return best;
}

// ── 3. SCALPER BOT · micro-trades during idle ──
function botScalper() {
  const hasPositions = (S.openPositions || []).length > 0;
  if(hasPositions) {
    _setBot('scalper_bot_v1', 'idle', `${(S.openPositions || []).length} position(s) ouverte(s), scalper en pause`);
    return;
  }
  
  if(Math.random() < 0.3) {
    const pairs = Object.keys(PAIRS || {});
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const ps = S.pairStates?.[pair];
    const tech = typeof getTechSignals === 'function' ? getTechSignals(pair) : null;
    if(!ps || !tech) return;
    const cv = tech.raw?.stddev?.cv || 0.015;
    // Micro-scalp: +/- 0.1-0.3% random with skew toward lmsrP direction
    const lmsr = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const skew = (lmsr - 0.5) * 0.3;
    const pnlPct = (Math.random() - 0.5 + skew) * 0.4;
    const pnlUsd = pnlPct * 2;  // virtual $2 stake
    _setBot('scalper_bot_v1', 'executing', `Micro-scalp ${pair} · ${pnlUsd>=0?'+':''}$${pnlUsd.toFixed(2)}`);
    S.botFleet.scalper_bot_v1.contributions++;
    S.botFleet.scalper_bot_v1.pnlContrib += pnlUsd;
  } else {
    _setBot('scalper_bot_v1', 'scanning', `Surveillance L2·Order Flow`);
  }
}

// ── 4. FISCAL BOT · Tax-loss harvest (v6.0 · proposition actionnable) ──
function botFiscal() {
  const realizedGain = S.fees?.totalPnlGross || 0;
  const openLosers = (S.openPositions || []).filter(p => (p.pnlUsdt || 0) < -3);
  if(realizedGain > 40 && openLosers.length > 0) {
    const worst = openLosers.sort((a,b) => (a.pnlUsdt || 0) - (b.pnlUsdt || 0))[0];
    const harvestSavings = Math.abs(worst.pnlUsdt || 0) * 0.30;
    // v6.0 · Publie une proposition actionnable
    if(!S.pendingActions) S.pendingActions = [];
    const already = S.pendingActions.find(a => a.type === 'harvest' && a.posId === worst.id);
    if(!already) {
      S.pendingActions.unshift({
        id: 'fh' + Date.now().toString(36),
        type: 'harvest',
        pair: worst.pair,
        posId: worst.id,
        ts: Date.now(),
        source: 'fiscal_bot_v1',
        title: `Harvest ${worst.pair}`,
        detail: `Perte $${worst.pnlUsdt.toFixed(2)} · économie ~$${harvestSavings.toFixed(2)}`,
        action: 'close_position',
        payload: { posId: worst.id }
      });
      if(S.pendingActions.length > 10) S.pendingActions.length = 10;
    }
    _setBot('fiscal_bot_v1', 'active', `Proposition harvest ${worst.pair} · économie ~${harvestSavings.toFixed(2)}$`);
    return { pos: worst, savings: harvestSavings };
  }
  if(realizedGain > 40) {
    _setBot('fiscal_bot_v1', 'scanning', `Gain réalisé +${realizedGain.toFixed(0)}$ · en recherche de perte à récolter`);
  } else {
    _setBot('fiscal_bot_v1', 'idle', `Gain insuffisant pour harvest (+${realizedGain.toFixed(0)}$)`);
  }
  // Clear stale proposals
  if(S.pendingActions) {
    S.pendingActions = S.pendingActions.filter(a => a.type !== 'harvest' || (a.posId && S.openPositions.find(p => p.id === a.posId)));
  }
  return null;
}

// ── 5. DCA BOT · Grid in low volatility ──
function botDCA() {
  const pairs = Object.keys(PAIRS || {});
  let lowVolCount = 0, flatTrendCount = 0, activePairs = [];
  pairs.forEach(p => {
    const tech = typeof getTechSignals === 'function' ? getTechSignals(p) : null;
    const cv = tech?.raw?.stddev?.cv || 0.02;
    const adx = tech?.raw?.adx?.adx || 20;
    if(cv < 0.012) lowVolCount++;
    if(adx < 18) flatTrendCount++;
    if(cv < 0.012 && adx < 20) activePairs.push(p);
  });
  if(activePairs.length >= 2) {
    _setBot('dca_bot_v1', 'active', `Mode DCA · ${activePairs.length} paires (${activePairs.slice(0,2).join(', ')}) en range`);
    return { pairs: activePairs };
  }
  _setBot('dca_bot_v1', 'idle', `Marchés tendanciels · DCA inactif (${lowVolCount} vol faible, ${flatTrendCount} flat)`);
  return null;
}

// ── 6. RESCUE BOT · Emergency drawdown (v6.0 · vraie action) ──
function botRescue() {
  const startP = S._startPortfolio || S.portfolio || 1;
  const curP = S.portfolio || 1;
  const ddPct = startP > 0 ? (startP - curP) / startP * 100 : 0;
  const hasPositions = (S.openPositions || []).length > 0;

  if(ddPct > 12 && hasPositions) {
    // v6.0 · VRAIE ACTION — flatten all positions
    const countBefore = S.openPositions.length;
    const snapshot = S.openPositions.map(p => ({ id: p.id, pair: p.pair, side: p.side }));
    snapshot.forEach(p => {
      try {
        if(typeof closePosition === 'function') closePosition(p.id, true);
      } catch(e) { console.warn('rescue flatten:', e); }
    });
    S.botFleet.rescue_bot_v1.contributions++;
    _setBot('rescue_bot_v1', 'alert', `🚨 FLATTEN EXÉCUTÉ · ${countBefore} position(s) fermée(s) · DD ${ddPct.toFixed(1)}%`);
    if(typeof showToast === 'function') showToast(`🛟 Rescue · ${countBefore} position(s) fermée(s) (DD ${ddPct.toFixed(1)}%)`);
    if(!S.brainLog) S.brainLog = [];
    S.brainLog.unshift({ ts: Date.now(), pair: 'ALL', event:'RESCUE', side:'flatten', reason:`DD ${ddPct.toFixed(1)}% > seuil 12%` });
    return { action: 'flatten_all_executed', dd: ddPct, count: countBefore };
  }
  if(ddPct > 8) {
    _setBot('rescue_bot_v1', 'active', `⚠ Alerte DD ${ddPct.toFixed(1)}% · flatten à 12%`);
    return { action: 'warning', dd: ddPct };
  }
  if(ddPct > 5) {
    _setBot('rescue_bot_v1', 'scanning', `Surveillance · DD ${ddPct.toFixed(1)}%`);
  } else {
    _setBot('rescue_bot_v1', 'idle', `Portfolio sain · DD ${ddPct>=0 ? ddPct.toFixed(1) : '0.0'}%`);
  }
  return null;
}

// ── 7. REBALANCE BOT · portfolio skew (v6.0 · proposition actionnable) ──
function botRebalance() {
  const positions = S.openPositions || [];
  if(positions.length === 0) {
    _setBot('rebalance_bot_v1', 'idle', `Aucune position · rien à rééquilibrer`);
    return null;
  }
  const byPair = {};
  positions.forEach(p => {
    byPair[p.pair] = (byPair[p.pair] || 0) + (p.stakeUsdt || 0);
  });
  const totalExp = Object.values(byPair).reduce((s,v) => s+v, 0);
  let skewed = null;
  Object.entries(byPair).forEach(([p, v]) => {
    const share = totalExp > 0 ? v / totalExp : 0;
    if(share > 0.60) skewed = { pair: p, share, value: v };
  });
  if(skewed) {
    // v6.0 · Publie une proposition actionnable
    if(!S.pendingActions) S.pendingActions = [];
    const already = S.pendingActions.find(a => a.type === 'rebalance' && a.pair === skewed.pair);
    if(!already) {
      S.pendingActions.unshift({
        id: 'rb' + Date.now().toString(36),
        type: 'rebalance',
        pair: skewed.pair,
        ts: Date.now(),
        source: 'rebalance_bot_v1',
        title: `Rééquilibrer ${skewed.pair}`,
        detail: `${(skewed.share*100).toFixed(0)}% du portfolio · fermer pour diversifier`,
        action: 'close_skewed',
        payload: { pair: skewed.pair }
      });
      if(S.pendingActions.length > 10) S.pendingActions.length = 10;
    }
    _setBot('rebalance_bot_v1', 'active', `Skew ${skewed.pair} ${(skewed.share*100).toFixed(0)}% · proposition créée`);
    return skewed;
  }
  // Clear old rebalance proposals if no longer skewed
  if(S.pendingActions) {
    S.pendingActions = S.pendingActions.filter(a => a.type !== 'rebalance');
  }
  const npairs = Object.keys(byPair).length;
  _setBot('rebalance_bot_v1', 'scanning', `Allocation équilibrée sur ${npairs} paire(s)`);
  return null;
}

// ── 8. SMART SIZER · Kelly-inspired position sizing ──
function botSmartSizer() {
  const recent = Object.values(S.pairStates || {})
    .flatMap(p => (p.trades || []))
    .filter(t => t.type === 'position' && t.pnlUsdt != null)
    .slice(-10);
  if(recent.length < 4) {
    _setBot('smart_sizer_v1', 'scanning', `${recent.length}/10 trades · collecte données`);
    return { mult: 1.0, wr: null };
  }
  const wins = recent.filter(t => t.pnlUsdt > 0).length;
  const wr = wins / recent.length;
  let mult, action;
  if(wr >= 0.7) {
    mult = 1.25;
    action = `WR ${(wr*100).toFixed(0)}% · size boost +25% · streak chaud 🔥`;
    _setBot('smart_sizer_v1', 'active', action);
  } else if(wr <= 0.3) {
    mult = 0.55;
    action = `WR ${(wr*100).toFixed(0)}% · size réduit -45% · protection ❄️`;
    _setBot('smart_sizer_v1', 'alert', action);
  } else if(wr >= 0.55) {
    mult = 1.1;
    action = `WR ${(wr*100).toFixed(0)}% · size légèrement + (${recent.length} trades)`;
    _setBot('smart_sizer_v1', 'active', action);
  } else {
    mult = 1.0;
    action = `WR ${(wr*100).toFixed(0)}% · size normal (neutre)`;
    _setBot('smart_sizer_v1', 'idle', action);
  }
  S.botFleet.smart_sizer_v1.contributions = recent.length;
  return { mult, wr };
}

// ── ORCHESTRATOR ──
function runBotFleet(event, context) {
  initBotFleet();
  context = context || {};
  switch(event) {
    case 'tick':
      try { botExec(S.tradingAccount * 0.1); } catch(e) {}  // keep exec status updated
      try { botArb();        } catch(e) {}
      try { botScalper();    } catch(e) {}
      try { botFiscal();     } catch(e) {}
      try { botDCA();        } catch(e) {}
      try { botRescue();     } catch(e) {}
      try { botRebalance();  } catch(e) {}
      try { botSmartSizer(); } catch(e) {}
      break;
    case 'pre_trade': {
      const sizer = botSmartSizer();
      const exec = botExec(context.stake || 0);
      return { sizer, exec };
    }
    case 'post_trade':
      // Update contribution counter
      if(context.pnlUsd > 0 && S.botFleet.smart_sizer_v1) {
        S.botFleet.smart_sizer_v1.pnlContrib += context.pnlUsd * 0.05;  // claim partial credit
      }
      break;
  }
}

// ── RENDER FLEET PANEL ──
function renderFleetPanel() {
  const el = document.getElementById('apanel-fleet');
  if(!el) return;
  initBotFleet();
  // Refresh fleet states
  try { runBotFleet('tick'); } catch(e) {}

  const stats = {
    active:    0,
    executing: 0,
    alert:     0,
    contribs:  0,
    pnlTotal:  0
  };
  BOT_FLEET_IDS.forEach(id => {
    const b = S.botFleet[id];
    if(b.status === 'active')    stats.active++;
    if(b.status === 'executing') stats.executing++;
    if(b.status === 'alert')     stats.alert++;
    stats.contribs += b.contributions;
    stats.pnlTotal += b.pnlContrib;
  });

  const rows = BOT_FLEET_IDS.map(id => {
    const b = S.botFleet[id];
    const agent = (S.agents || []).find(a => a.id === id) || {};
    const name = agent.name || id;
    const emoji = agent.emoji || '🤖';
    const role = agent.type || agent.domain || '';
    const statusLabel = {
      idle: 'IDLE',
      scanning: 'SCAN',
      active: 'ACTIF',
      executing: 'EXEC',
      alert: 'ALERT'
    }[b.status] || b.status.toUpperCase();
    const elapsed = b.lastActionTs ? Math.floor((Date.now() - b.lastActionTs) / 1000) : 0;
    const elapsedLbl = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed/60)}m`;
    return `<div class="fleet-bot status-${b.status}">
      <div class="fleet-avatar">${emoji}</div>
      <div class="fleet-body">
        <div class="fleet-name">${name} <span class="fleet-name-role">· ${role}</span></div>
        <div class="fleet-action">${b.lastAction}</div>
        ${b.contributions > 0 ? `<div class="fleet-contrib">${b.contributions} contrib · ${b.pnlContrib>=0?'+':''}$${b.pnlContrib.toFixed(2)} · ${elapsedLbl} ago</div>` : ''}
      </div>
      <div class="fleet-status-chip ${b.status}">${statusLabel}</div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="fleet-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:10px;color:var(--gold);font-weight:700;">🤖 FLOTTE · 8 BOTS</span>
      <span style="font-size:8px;color:var(--t3);">${stats.active + stats.executing + stats.alert}/8 actifs</span>
    </div>
    <div class="fleet-summary">
      <div class="fleet-stat">
        <div class="fleet-stat-label">ACTIFS</div>
        <div class="fleet-stat-val" style="color:var(--up);">${stats.active + stats.executing}</div>
      </div>
      <div class="fleet-stat">
        <div class="fleet-stat-label">CONTRIBS</div>
        <div class="fleet-stat-val" style="color:var(--ice);">${stats.contribs}</div>
      </div>
      <div class="fleet-stat">
        <div class="fleet-stat-label">ÉCONOMIES</div>
        <div class="fleet-stat-val" style="color:${stats.pnlTotal>=0?'var(--up)':'var(--down)'};">${stats.pnlTotal>=0?'+':''}$${stats.pnlTotal.toFixed(2)}</div>
      </div>
    </div>
    ${rows}
    <div style="margin-top:8px;font-size:8px;color:var(--t3);line-height:1.5;text-align:center;">
      La flotte travaille en continu : exécution optimisée, surveillance DD, harvest fiscal, sizing Kelly.
    </div>
  </div>`;
}

// v5.8 FIX — fleet tab already in authoritative _V54_TABS declaration

// Override router to include fleet



// Expose
window._runBotFleet = runBotFleet;

// ════════════════════════════════════════════════════════════
// v5.9 — RESET COUNTERS + PERMANENT ARCHIVES
// ════════════════════════════════════════════════════════════
// Each reset button archives current state, then resets counters.
// Archives are preserved in S.archives.snapshots[] and queryable.
// Agents/bots retain learning context via archive references.
// ════════════════════════════════════════════════════════════

// Init archive state
if(typeof S !== 'undefined' && !S.archives) {
  S.archives = { snapshots: [], totalResets: 0 };
}

// UI state
let _settingsTab = 'reset';           // 'reset' or 'archives'
let _pendingReset = null;             // domain id awaiting confirmation
let _expandedArchiveIdx = null;

// ── DOMAIN DEFINITIONS ──
const RESET_DOMAINS = [
  {
    id: 'agents',
    icon: '🧠',
    name: 'Agents',
    metric: () => {
      const count = (S.agents || []).length;
      const totalLearning = (S.agents || []).reduce((s,a) => s + (a.learningEvents || 0), 0);
      return `${count} agents · ${totalLearning} cycles d'apprentissage`;
    },
    snapshot: () => ({
      agents: (S.agents || []).map(a => ({
        id: a.id, name: a.name, score: a.score, fitness: a.fitness,
        errors: a.errors, corrections: a.corrections, streak: a.streak,
        lastPnl: a.lastPnl, learningEvents: a.learningEvents || 0,
        memoryCount: (a.memory || []).length
      }))
    }),
    reset: () => {
      (S.agents || []).forEach(a => {
        a.score = 0;
        a.streak = 0;
        a.errors = 0;
        a.corrections = 0;
        a.lastPnl = 0;
        a.learningEvents = 0;
        a.memory = [];
      });
    }
  },
  {
    id: 'fleet',
    icon: '🤖',
    name: 'Flotte de Bots',
    metric: () => {
      if(!S.botFleet) return '8 bots · en attente';
      const tot = Object.values(S.botFleet).reduce((s,b) => s + (b.contributions || 0), 0);
      const pnl = Object.values(S.botFleet).reduce((s,b) => s + (b.pnlContrib || 0), 0);
      return `${tot} contribs · ${pnl>=0?'+':''}$${pnl.toFixed(2)} économisés`;
    },
    snapshot: () => ({ fleet: { ...(S.botFleet || {}) } }),
    reset: () => {
      if(!S.botFleet) return;
      Object.values(S.botFleet).forEach(b => {
        b.contributions = 0;
        b.pnlContrib = 0;
        b.lastAction = 'Prêt';
        b.lastActionTs = 0;
        b.status = 'idle';
      });
    }
  },
  {
    id: 'trading',
    icon: '📊',
    name: 'Historique trading',
    metric: () => {
      const tot = (S.totalTrades || 0);
      const won = (S.winTrades || 0);
      return `${tot} trades · ${won} gagnants`;
    },
    snapshot: () => ({
      totalTrades: S.totalTrades,
      winTrades: S.winTrades,
      byPair: Object.fromEntries(
        Object.entries(S.pairStates || {}).map(([p, ps]) => [p, {
          totalTrades: ps.totalTrades,
          winTrades: ps.winTrades,
          tradesCount: (ps.trades || []).length
        }])
      )
    }),
    reset: () => {
      S.totalTrades = 0;
      S.winTrades = 0;
      Object.values(S.pairStates || {}).forEach(ps => {
        ps.totalTrades = 0;
        ps.winTrades = 0;
        ps.trades = [];
      });
    }
  },
  {
    id: 'fiscal',
    icon: '💰',
    name: 'Compteurs fiscaux',
    metric: () => {
      const pnl = S.fees?.totalPnlGross || 0;
      const fees = S.fees?.totalFees || 0;
      return `P&L brut $${pnl.toFixed(0)} · frais $${fees.toFixed(0)}`;
    },
    snapshot: () => ({ fees: { ...(S.fees || {}) } }),
    reset: () => {
      if(S.fees) {
        Object.keys(S.fees).forEach(k => {
          if(typeof S.fees[k] === 'number') S.fees[k] = 0;
          else if(Array.isArray(S.fees[k])) S.fees[k] = [];
        });
      }
    }
  },
  {
    id: 'shadow',
    icon: '🪞',
    name: 'Shadow Bot',
    metric: () => {
      const s = S.shadow || {};
      return `${(s.virtualTrades || []).length} trades virtuels · ${s.virtualPnl>=0?'+':''}$${(s.virtualPnl || 0).toFixed(2)}`;
    },
    snapshot: () => ({ shadow: { ...(S.shadow || {}) } }),
    reset: () => {
      S.shadow = { virtualPnl: 0, virtualTrades: [], wins: 0, losses: 0, lastRetrain: 0 };
    }
  },
  {
    id: 'dreams',
    icon: '💭',
    name: 'Journal de Rêves',
    metric: () => `${(S.dreamJournal || []).length} réflexions`,
    snapshot: () => ({ dreamJournal: [...(S.dreamJournal || [])] }),
    reset: () => { S.dreamJournal = []; }
  },
  {
    id: 'cascade',
    icon: '🦋',
    name: 'Cascade Décisions',
    metric: () => `${(S.decisionCascade || []).length} décisions tracées`,
    snapshot: () => ({ decisionCascade: [...(S.decisionCascade || [])] }),
    reset: () => { S.decisionCascade = []; }
  },
  {
    id: 'resonance',
    icon: '⚡',
    name: 'Événements Résonance',
    metric: () => `${(S.resonanceHistory || []).length} alignements détectés`,
    snapshot: () => ({ resonanceHistory: [...(S.resonanceHistory || [])] }),
    reset: () => { S.resonanceHistory = []; }
  },
  {
    id: 'heatmap',
    icon: '⏰',
    name: 'Heatmap Temporel',
    metric: () => {
      const h = S.heatmap || {};
      const hours = Object.keys(h.byHour || {}).length;
      const days = Object.keys(h.byWeekday || {}).length;
      return `${hours} heures · ${days} jours analysés`;
    },
    snapshot: () => ({ heatmap: JSON.parse(JSON.stringify(S.heatmap || {})) }),
    reset: () => { S.heatmap = { byHour: {}, byWeekday: {} }; }
  }
];

// ── ARCHIVE + RESET CORE ──
function archiveAndReset(domainId) {
  const domain = RESET_DOMAINS.find(d => d.id === domainId);
  if(!domain) return;
  if(!S.archives) S.archives = { snapshots: [], totalResets: 0 };

  // Snapshot current state
  const snapshot = {
    ts: Date.now(),
    domain: domain.id,
    domainName: domain.name,
    icon: domain.icon,
    data: domain.snapshot(),
    metricAtReset: domain.metric()
  };
  S.archives.snapshots.unshift(snapshot);
  S.archives.totalResets++;
  // Cap at 50 archives (FIFO to avoid memory bloat)
  if(S.archives.snapshots.length > 50) S.archives.snapshots.length = 50;

  // Reset the live counters
  domain.reset();

  if(typeof showToast === 'function') {
    showToast(`✓ ${domain.name} · archivé et réinitialisé`);
  }
  try { if(typeof saveState === 'function') saveState(true); } catch(e) {}
  renderSettingsPanel();
}

function archiveAndResetAll() {
  const totalBefore = S.archives?.snapshots?.length || 0;
  RESET_DOMAINS.forEach(d => archiveAndReset(d.id));
  if(typeof showToast === 'function') {
    showToast(`✓ Système entièrement réinitialisé · ${RESET_DOMAINS.length} domaines archivés`);
  }
}

// v7.5 · RESET COMPLET PREMIER LANCEMENT (version robuste)
// Efface IndexedDB + localStorage + état mémoire. L'app redémarre comme à l'installation.
async function factoryReset() {
  try {
    // 1. Flag global pour bloquer TOUTES les sauvegardes en cours (saveState, visibilitychange, etc.)
    window._resetInProgress = true;
    // v11quinquies · BUG FIX : poser le flag sessionStorage IMMÉDIATEMENT
    // pour bloquer le pagehide/freeze qui arrivera pendant le reload
    try { sessionStorage.setItem('nexus_factory_reset', '1'); } catch(e) {}
    
    try { if(typeof stopSim === 'function' && RT._simRunning) stopSim(); } catch(e) {}
    try { if(RT._simInterval) { clearInterval(RT._simInterval); RT._simInterval = null; } } catch(e) {}
    // 3. (autoSaveInterval géré désormais par 09b2 — pas besoin ici)
    // 4. (la connexion IDB n'est plus mise en cache — chaque openDB ouvre une nouvelle co)
    // 5. Effacer localStorage (toutes les clés NEXUS possibles)
    try {
      localStorage.removeItem(RT.SAVE_KEY);
      Object.keys(localStorage).forEach(k => {
        if(k && (k.toLowerCase().startsWith('nexus') || k === RT.SAVE_KEY)) localStorage.removeItem(k);
      });
    } catch(e) { console.warn('localStorage clear:', e); }
    // 6. Flag déjà posé en étape 1 — on ne le repose pas ici pour ne pas l'écraser
    // 7. Supprimer IndexedDB — avec timeout pour garantir la suite même si bloquée
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if(!done) { done = true; resolve(); } };
      try {
        const req = indexedDB.deleteDatabase(RT.DB_NAME);
        req.onsuccess = finish;
        req.onerror   = finish;
        req.onblocked = () => {
          console.warn('IndexedDB deletion blocked — on continue quand même');
          finish();
        };
        setTimeout(finish, 1500);  // garde-fou
      } catch(e) { finish(); }
    });
    // 8. Recharger la page — au prochain chargement, loadState verra le flag et ne restaurera rien
    if(typeof showToast === 'function') showToast('🔄 Reset complet · rechargement...');
    setTimeout(() => { try { location.reload(); } catch(e) { location.href = location.href; } }, 500);
  } catch(err) {
    console.error('factoryReset error:', err);
    window._resetInProgress = false;
    if(typeof showToast === 'function') showToast('⚠ Erreur reset · rechargez manuellement');
  }
}

window.factoryReset = factoryReset;

// ── MODAL CONTROL ──
function openSettingsModal() {
  const bd = document.getElementById('settingsBackdrop');
  if(!bd) return;
  bd.classList.add('active');
  _pendingReset = null;
  _expandedArchiveIdx = null;
  renderSettingsPanel();
  // Lock body scroll
  document.body.style.overflow = 'hidden';
}


// ═══ v7.12 · Q3:C · Long-press 2s pour confirmer reset ═══
// Remplace les sliders · maintenir appuyé 2 secondes pour exécuter le reset
const _LP_DURATION = 2000;  // 2 secondes
let _lpState = {};  // {id: {startTs, rafId, triggered}}

function _longPressStart(e, accId) {
  if (e && e.cancelable) e.preventDefault();
  // Nettoyer tout état précédent pour cet accId
  _longPressEnd(null, accId);
  _lpState[accId] = { startTs: Date.now(), intervalId: null, triggered: false };
  // Tick toutes les 50ms (plus fiable que RAF quand Brain anim est off)
  _lpState[accId].intervalId = setInterval(() => _lpTick(accId), 50);
  _lpTick(accId);  // premier tick immédiat
}

function _lpTick(accId) {
  const st = _lpState[accId];
  if (!st) return;
  const elapsed = Date.now() - st.startTs;
  const pct = Math.min(100, (elapsed / _LP_DURATION) * 100);
  
  const fill = document.getElementById('lpFill_' + accId);
  const label = document.getElementById('lpLabel_' + accId);
  if (fill) fill.style.width = pct + '%';
  if (label) {
    const remaining = Math.max(0, _LP_DURATION - elapsed);
    if (pct < 100) {
      label.textContent = '... ' + (remaining/1000).toFixed(1) + 's';
      label.style.color = '#f5a623';
    } else {
      label.textContent = '✓ RESET';
      label.style.color = 'var(--down)';
    }
  }
  
  if (pct >= 100 && !st.triggered) {
    st.triggered = true;
    // Stopper l'interval
    if (st.intervalId) { clearInterval(st.intervalId); st.intervalId = null; }
    _executeAccountReset(accId);
    // Reset visuel progressif
    setTimeout(() => {
      if (fill) fill.style.width = '0%';
      if (label) {
        label.textContent = '✓ FAIT';
        label.style.color = 'var(--up)';
      }
      setTimeout(() => {
        if (label) {
          label.textContent = 'MAINTENIR 2s';
          label.style.color = 'var(--t3)';
        }
      }, 1500);
    }, 200);
  }
}

function _longPressEnd(e, accId) {
  const st = _lpState[accId];
  if (!st) return;
  if (st.intervalId) { clearInterval(st.intervalId); st.intervalId = null; }
  if (!st.triggered) {
    // Annulation : retour à 0 doux
    const fill = document.getElementById('lpFill_' + accId);
    const label = document.getElementById('lpLabel_' + accId);
    if (fill) fill.style.width = '0%';
    if (label) {
      label.textContent = 'MAINTENIR 2s';
      label.style.color = 'var(--t3)';
    }
  }
  delete _lpState[accId];
}

window._longPressStart = _longPressStart;
window._longPressEnd = _longPressEnd;

// ═══ Fonctions de reset par compte ═══

function _executeAccountReset(accId) {
  if (typeof S === 'undefined' || !S) return;
  let msg = '';
  switch (accId) {
    case 'caisse':
      S.cashAccount = 0;
      msg = 'Caisse remise à 0';
      break;
    case 'trading':
      S.tradingAccount = 0;
      msg = 'Compte trading remis à 0';
      break;
    case 'fondsPropres':
      S.ownFundsInjected = 0;
      msg = 'Fonds propres remis à 0';
      break;
    case 'reserveFiscale':
      S.fiscalReserveAccount = 0;
      S.fiscalReserveLog = [];
      msg = 'Réserve fiscale remise à 0';
      break;
    case 'dette':
      // Reset ciblé de la dette levier · v7.12 amélioré : nettoyage complet
      S.leverageBorrowed = 0;
      S._autoLevBorrowed = 0;
      S._autoLevBase = 0;
      S._orphanDebtSince = 0;
      // Nettoyer aussi levBorrowed sur les positions ouvertes (cohérence)
      (S.openPositions || []).forEach(p => { p.levBorrowed = 0; });
      // Resync la réserve levier
      if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
      msg = 'Dette levier remise à 0 (positions nettoyées)';
      break;
  }
  // Recalculer portfolio
  S.portfolio = (S.cashAccount || 0) + (S.tradingAccount || 0);
  if (typeof syncLeverageReserve === 'function') syncLeverageReserve();
  
  // Log dans chain
  S.chainLog.push({
    icon: '🔄',
    desc: 'Reset par compte · ' + msg,
    hash: rndHash(), time: nowStr()
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  
  // Feedback visible clair
  if (typeof showToast === 'function') showToast('✅ ' + msg, 3500, 'user');
  
  // Vibration tactile (Android Chrome uniquement)
  try { if (navigator.vibrate) navigator.vibrate([80, 40, 80]); } catch(e) {}
  
  // Refresh UI
  if (typeof renderHome === 'function') { try { renderHome(); } catch(e) {} }
  if (typeof saveState === 'function') { try { saveState(true); } catch(e) {} }
}



// ═══ v7.12 · Q2:A+C · Revigorer agents cassés (manuel + auto) ═══

/**
 * Remet les agents cassés (fitness ≤ 80) à une fitness saine (400)
 * Ne touche pas aux agents sains (fitness > 80)
 * @param {boolean} silent - si true, pas de toast
 */
// v7.12 LIVRAISON 7 · Affiche le détail des agents cassés
// Distingue les bots stratégiques (protégés) des agents apprenants (revigorables)
function _showBrokenAgentsDetail() {
  if (!S.agents) return;
  const broken = S.agents.filter(a => (a.fitness || 0) <= 80);
  if (broken.length === 0) {
    if (typeof showToast === 'function') showToast('Aucun agent cassé', 2500, 'user');
    return;
  }
  // Séparer bots vs agents apprenants
  const bots = broken.filter(a => a.isBot);
  const learners = broken.filter(a => !a.isBot);

  const fmtAgent = (a) => {
    const dom = a.domain || a.role || '?';
    const fit = (a.fitness || 0).toFixed(0);
    const err = a.errors || 0;
    const streak = a.streak || 0;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(20,25,35,.5);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;font-size:10px;font-family:ui-monospace,monospace;">
      <span style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
        <span style="font-size:14px;">${a.emoji || '🤖'}</span>
        <span style="color:var(--t1);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.name || dom}</span>
      </span>
      <span style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
        <span style="color:var(--down);font-weight:700;">fit ${fit}</span>
        ${streak < 0 ? `<span style="color:var(--down);font-size:9px;">−${Math.abs(streak)}</span>` : ''}
        ${err > 0 ? `<span style="color:var(--gold);font-size:9px;">${err} err</span>` : ''}
      </span>
    </div>`;
  };

  const botsHTML = bots.length > 0
    ? `<div style="font-size:10px;color:var(--gold);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px;display:flex;justify-content:space-between;align-items:center;">
         <span>🛡 ${bots.length} bot(s) stratégique(s) cassé(s)</span>
         <span style="font-size:9px;opacity:.7;font-weight:600;letter-spacing:0;text-transform:none;">protégés</span>
       </div>
       <div style="font-size:9px;color:var(--t3);line-height:1.4;margin-bottom:6px;">
         Ces bots (orders, risk, arbitrage, scalping, fiscal, dca, rescue, rebalance, sizing) ne sont pas revigorés automatiquement pour préserver leur stratégie.
       </div>
       ${bots.map(fmtAgent).join('')}
       <button onclick="_revigorBots(); document.getElementById('brokenAgentsDetail')?.remove();" style="width:100%;background:rgba(245,200,66,.10);color:var(--gold);border:1px solid rgba(245,200,66,.35);border-radius:8px;padding:8px;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:.04em;margin-top:8px;">
         🛡 Revigoration forcée des ${bots.length} bot(s) (avancé ⚠)
       </button>`
    : '';

  const learnersHTML = learners.length > 0
    ? `<div style="font-size:10px;color:var(--down);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px;display:flex;justify-content:space-between;align-items:center;">
         <span>📉 ${learners.length} agent(s) apprenant(s) cassé(s)</span>
         <span style="font-size:9px;opacity:.7;font-weight:600;letter-spacing:0;text-transform:none;">revigorables</span>
       </div>
       ${learners.map(fmtAgent).join('')}
       <button onclick="_revigorBrokenAgents(); document.getElementById('brokenAgentsDetail')?.remove();" style="width:100%;background:rgba(167,139,250,.15);color:var(--pur);border:1px solid rgba(167,139,250,.4);border-radius:8px;padding:10px;font-size:10.5px;font-weight:700;cursor:pointer;letter-spacing:.04em;margin-top:10px;">
         🔄 Revigorer les ${learners.length} agent(s)
       </button>`
    : (bots.length > 0 ? '<div style="font-size:9.5px;color:var(--t2);line-height:1.5;margin-top:14px;padding:10px;background:rgba(245,200,66,.05);border:1px solid rgba(245,200,66,.2);border-radius:8px;">💡 Tous les agents cassés sont des bots stratégiques. La revigoration manuelle ne s\'applique pas à eux.</div>' : '');

  const old = document.getElementById('brokenAgentsDetail');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'brokenAgentsDetail';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.92);z-index:99999;padding:20px;overflow:auto;backdrop-filter:blur(8px);';
  overlay.innerHTML = `
    <div style="max-width:500px;margin:auto;background:#0f1420;border:1px solid var(--down);border-radius:14px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:800;color:var(--down);">🩹 Agents cassés · ${broken.length}</div>
        <button onclick="document.getElementById('brokenAgentsDetail').remove()" style="background:var(--s2);border:1px solid var(--border);color:var(--t1);width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;">✕</button>
      </div>
      ${botsHTML}
      ${learnersHTML}
    </div>
  `;
  document.body.appendChild(overlay);
}
window._showBrokenAgentsDetail = _showBrokenAgentsDetail;

// v7.12 LIVRAISON 13 · Revigoration FORCÉE des bots stratégiques cassés
// Action manuelle uniquement, à utiliser quand les bots restent bloqués à fitness 1
// après un rollback ou un état très ancien.
// v7.12 LIVRAISON 14 · AUTO-REVIGORATION des agents apprenants
// Règle : si plus de 3 agents apprenants sont cassés (fitness <=80),
// les revigorer automatiquement. Cooldown 30min entre 2 déclenchements.
// Les BOTS STRATÉGIQUES restent manuels (bouton "Revigoration forcée").
function _autoRevigorCheck() {
  if (!S.agents) return;
  const now = Date.now();
  const cooldownMs = 30 * 60 * 1000; // 30 minutes
  const lastAuto = S._lastAutoRevigorTs || 0;
  // Skip si cooldown actif
  if (lastAuto > 0 && (now - lastAuto) < cooldownMs) return;
  // Compter les agents apprenants cassés (pas les bots)
  const brokenLearners = S.agents.filter(a => !a.isBot && (a.fitness || 0) <= 80);
  // Seuil : plus de 3 (donc 4 ou plus)
  if (brokenLearners.length <= 3) return;
  // Déclencher la revigoration
  const count = brokenLearners.length;
  brokenLearners.forEach(a => {
    a.fitness = 400;
    a.errors = 0;
    a.streak = 0;
  });
  // Marquer le moment pour le cooldown
  S._lastAutoRevigorTs = now;
  // Logger dans la blockchain
  try {
    if (!S.chainLog) S.chainLog = [];
    S.chainLog.push({
      icon: '🔄',
      desc: 'Auto-revigoration · ' + count + ' agent(s) apprenant(s) restaurés (seuil >3)',
      hash: typeof rndHash==='function' ? rndHash() : '',
      time: typeof nowStr==='function' ? nowStr() : ''
    });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  } catch(e) {}
  // Toast notification
  try {
    if (typeof showToast === 'function') {
      showToast('🔄 Auto-revigoration · ' + count + ' agent(s) restaurés', 4000, 'win');
    }
  } catch(e) {}
}
window._autoRevigorCheck = _autoRevigorCheck;
// Vérifier toutes les 60 secondes (suffisant : c'est rare et pas urgent)
setInterval(_autoRevigorCheck, 60000);

function _revigorBots() {
  if (!S.agents) return;
  const brokenBots = S.agents.filter(a => a.isBot && (a.fitness || 0) <= 80);
  if (brokenBots.length === 0) {
    if (typeof showToast === 'function') showToast('Aucun bot stratégique cassé', 2500, 'user');
    return;
  }
  if (!confirm('🛡 REVIGORATION FORCÉE\n\n' + brokenBots.length + ' bot(s) stratégique(s) cassé(s) seront réinitialisés à fitness 400.\n\n⚠ Cette action contourne la protection normale et peut perturber les stratégies.\n\nÀ utiliser SEULEMENT si les bots restent bloqués après un rollback.\n\nContinuer ?')) {
    return;
  }
  let revigorated = 0;
  brokenBots.forEach(a => {
    a.fitness = 400;
    a.streak = 0;
    a.errors = 0;
    a.lastPnl = 0;
    revigorated++;
  });
  // Logger dans la blockchain
  if (!S.chainLog) S.chainLog = [];
  S.chainLog.push({
    icon: '🛡',
    desc: 'Revigoration forcée · ' + revigorated + ' bot(s) stratégique(s)',
    hash: typeof rndHash==='function' ? rndHash() : '',
    time: typeof nowStr==='function' ? nowStr() : ''
  });
  if (typeof showToast === 'function') {
    showToast('🛡 ' + revigorated + ' bot(s) revigoré(s)', 3500, 'win');
  }
  // Refresh UI
  document.getElementById('brokenAgentsDetail')?.remove();
}
window._revigorBots = _revigorBots;

function _revigorBrokenAgents(silent) {
  if (typeof S === 'undefined' || !S.agents) {
    if (!silent) alert('⚠ S.agents introuvable — état non initialisé ?');
    return 0;
  }
  // Comptage et revigoration en deux passes pour pouvoir afficher l'état avant/après
  const before = S.agents.filter(a => !a.isBot && (a.fitness || 0) <= 80).length;
  let count = 0;
  S.agents.forEach(a => {
    if ((a.fitness || 0) <= 80 && !a.isBot) {
      a.fitness = 400;
      a.errors = 0;
      a.streak = 0;
      count++;
    }
  });
  // Log dans chain (protégé par try/catch pour ne JAMAIS bloquer le toast)
  if (count > 0) {
    try {
      if (!S.chainLog) S.chainLog = [];
      S.chainLog.push({
        icon: '🔄',
        desc: `Revigoration · ${count} agent(s) cassé(s) remis à fitness 400`,
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch(e) { /* silent — ne bloque pas le toast */ }
  }
  // Feedback utilisateur
  if (!silent) {
    let msg;
    if (count > 0) {
      msg = '✅ ' + count + ' agent(s) revigoré(s) (fitness ≤80 → 400)';
    } else {
      // Diagnostiquer pourquoi rien n'a été fait
      const allCount = S.agents.length;
      const botBroken = S.agents.filter(a => a.isBot && (a.fitness || 0) <= 80).length;
      const nonBotBroken = S.agents.filter(a => !a.isBot && (a.fitness || 0) <= 80).length;
      if (botBroken > 0 && nonBotBroken === 0) {
        msg = `⚠ ${botBroken} bot(s) cassé(s) trouvé(s) mais ils sont protégés (non revigorables manuellement)`;
      } else if (allCount === 0) {
        msg = '⚠ Aucun agent dans S.agents';
      } else {
        msg = `Aucun agent cassé · ${allCount} total · ${botBroken} bot(s) cassé(s) protégé(s)`;
      }
    }
    // Toast principal
    let toastShown = false;
    try {
      if (typeof showToast === 'function') {
        showToast(msg, 4000, count > 0 ? 'win' : 'user');
        toastShown = true;
      }
    } catch(e) { /* fallthrough */ }
    // Fallback si showToast a échoué
    if (!toastShown) alert(msg);
  }
  // Refresh le panneau Réglages pour MAJ visuelle
  if (!silent) {
    try { if (typeof renderSettingsPanel === 'function') renderSettingsPanel(); } catch(e) {}
    try { if (typeof renderAgents === 'function') renderAgents(); } catch(e) {}
  }
  return count;
}

// v8.0 LIVRAISON 30 · FIX #4+#5 · Doublon supprimé
// La 2e définition de _autoRevigorCheck (critère ≥8 cassés) écrasait la 1ère
// (critère >3 cassés + cooldown 30min). On garde la définition #1 plus protectrice.
// Le 2e setInterval (qui aurait fait tourner la fonction 2× par minute) est aussi supprimé.

window._revigorBrokenAgents = _revigorBrokenAgents;

// v7.12 · Reset blacklist paires (LIVRAISON 5 · feedback amélioré)
window._resetPairBlacklists = function() {
  if (typeof S === 'undefined') return;
  if (!S._lossStreaks || Object.keys(S._lossStreaks).length === 0) {
    if (typeof showToast === 'function') showToast('Aucune paire blacklistée à réactiver', 2500, 'user');
    return;
  }
  // Compter AVANT le reset
  const now = Date.now();
  let count = 0;
  Object.values(S._lossStreaks).forEach(s => {
    if (s.blacklistedUntil && s.blacklistedUntil > now) count++;
  });
  if (count === 0) {
    if (typeof showToast === 'function') showToast('Aucune paire blacklistée à réactiver', 2500, 'user');
    return;
  }
  // Reset
  Object.keys(S._lossStreaks).forEach(pair => {
    const s = S._lossStreaks[pair];
    s.blacklistedUntil = 0;
    s.recentTrades = [];
  });
  if (typeof showToast === 'function') showToast('✅ ' + count + ' paire(s) réactivée(s)', 3000, 'win');
  if (!S.chainLog) S.chainLog = [];
  S.chainLog.push({
    icon: '🔓',
    desc: `Blacklist reset · ${count} paire(s) réactivée(s)`,
    hash: typeof rndHash==='function'?rndHash():'', time: typeof nowStr==='function'?nowStr():''
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  // Refresh le panneau Réglages pour MAJ compteurs
  if (typeof renderSettingsPanel === 'function') { try { renderSettingsPanel(); } catch(e) {} }
};

// v7.12 · Reset loss streaks (LIVRAISON 5 · feedback amélioré)
window._resetLossStreaks = function() {
  if (typeof S === 'undefined') return;
  // Compter avant
  let count = 0;
  if (S._lossStreaks) {
    Object.values(S._lossStreaks).forEach(s => {
      if ((s.count || 0) > 0) count++;
    });
  }
  if (count === 0) {
    if (typeof showToast === 'function') showToast('Aucun streak de pertes actif', 2500, 'user');
    return;
  }
  // Reset
  if (S._lossStreaks) {
    Object.keys(S._lossStreaks).forEach(pair => {
      S._lossStreaks[pair].count = 0;
      S._lossStreaks[pair].pausedAt = 0;
    });
  }
  if (typeof showToast === 'function') showToast('✅ ' + count + ' streak(s) de pertes effacé(s)', 3000, 'win');
  if (!S.chainLog) S.chainLog = [];
  S.chainLog.push({
    icon: '🔄',
    desc: 'Streaks de pertes reset · ' + count + ' paire(s)',
    hash: typeof rndHash==='function'?rndHash():'', time: typeof nowStr==='function'?nowStr():''
  });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  // Refresh le panneau Réglages pour MAJ compteurs
  if (typeof renderSettingsPanel === 'function') { try { renderSettingsPanel(); } catch(e) {} }
  if (typeof renderHome === 'function') { try { renderHome(); } catch(e) {} }
};

// v7.12 · exports slider remplacés par long-press (Q3:C)
// window._slideResetStart/Move/End · supprimés

function closeSettingsModal() {
  const bd = document.getElementById('settingsBackdrop');
  if(!bd) return;
  bd.classList.remove('active');
  _pendingReset = null;
  document.body.style.overflow = '';
}

function requestReset(domainId) {
  _pendingReset = domainId;
  renderSettingsPanel();
}

function cancelReset() {
  _pendingReset = null;
  renderSettingsPanel();
}

function toggleArchiveDetail(idx) {
  _expandedArchiveIdx = _expandedArchiveIdx === idx ? null : idx;
  renderSettingsPanel();
}

// ── RENDER ──
// v8.0 LIVRAISON 31 · JS thèmes RETIRÉ


// ═══════════════════════════════════════════════════════════════════════════
// v8.0 LIVRAISON 32 · SYSTÈME DE BACKUP / IMPORT / RESTORE
// ═══════════════════════════════════════════════════════════════════════════

const AURA_BACKUP_DB = 'aura_backups';
const AURA_BACKUP_STORE = 'backups';
const AURA_LAST_AUTO_KEY = 'aura_last_auto_backup_date';
const AURA_VERSION = 'v8.0';

// Configuration des champs autorisés à l'IMPORT (Q1=B : config seulement)
// IMPORTANT : Cette liste est la sécurité absolue. Tout ce qui n'est pas ici
// ne peut PAS être écrasé par un import. Tes trades, ton capital, ton historique
// sont totalement protégés.
const AURA_IMPORT_ALLOWED_FIELDS = [
  // ─── Règles de trading globales ───
  'paperRealConfig',           // 41 paramètres du mode Réel
  'paperRealTimeframe',        // timeframe (5m, 15m, 1h, 4h, 1j)
  'paperRealActivePairs',      // ON/OFF par paire en mode Réel
  'realActivePairs',           // ON/OFF par paire en mode réel
  'realTimeframe',             // timeframe mode réel
  'tradingMode',               
  'autoTradeEnabled',
  'currentInterval',
  'tf',                        // timeframe
  'leverage',
  'leverageMaxMult',
  'slAtrMultiplier',
  'tpAtrMultiplier',
  'maxOpenPositions',
  'cooldownMinutes',
  'stakePercent',
  'autoPauseAfterLosses',
  'maxLossesBeforeStop',
  'profitSplitCaissePct',      // % de profit allant en caisse
  'fiatConvFeePct',            // frais de conversion fiat
  // ─── Configurations par paire ───
  'pairConfigs',
  'enabledPairs',
  // ─── Préférences UI ───
  'toastVerbose',
  'silentMode',
  'mode',                      // auto, manuel
  'botAutoMode',
  // ─── Calibrations et paramètres bots ───
  'calibrations',
  'agentParams',
  'feeConfig',                 // configuration des frais
  'taxConfig',                 // configuration fiscale
  // ─── Phases d'intelligence (toggles) ───
  'phase1Enabled',
  'phase2Enabled',
  'phase3Enabled',
  'phase4Enabled',
  'phase5Enabled',
  'phase6Enabled',
  // ─── Fitness des agents (overrides ciblés) ───
  '_agentFitnessOverrides'
];

// Initialiser IndexedDB
function _openBackupDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AURA_BACKUP_DB, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(AURA_BACKUP_STORE)) {
        const store = db.createObjectStore(AURA_BACKUP_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

// Construire un backup complet de l'état AURA
function _buildFullBackup(label, type) {
  // v8.0 LIVRAISON 35 · Journal des modifications préservé
  let priorLog = [];
  try {
    // Récupérer le journal du backup le plus récent (s'il existe)
    if (_cachedBackupsList && _cachedBackupsList.length > 0) {
      const last = _cachedBackupsList[0];
      if (last.meta && Array.isArray(last.meta._modifications_log)) {
        priorLog = JSON.parse(JSON.stringify(last.meta._modifications_log));
      }
    }
  } catch(e) {}
  
  const backup = {
    meta: {
      version: AURA_VERSION,
      date: Date.now(),
      label: label || 'Backup',
      type: type || 'manual',
      app: 'AURA',
      hash: '',
      _modifications_log: priorLog  // Journal historique
    },
    state: {}
  };
  // Copie défensive de toutes les propriétés de S
  try {
    backup.state = JSON.parse(JSON.stringify(S));
  } catch(e) {
    console.error('Erreur sérialisation S:', e);
    backup.state = {};
  }
  // Hash simple pour vérifier intégrité
  try {
    const str = JSON.stringify(backup.state);
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    backup.meta.hash = String(h);
    backup.meta.sizeChars = str.length;
  } catch(e) {}
  return backup;
}

// Sauvegarder un backup en IndexedDB avec rotation
async function _saveBackupToDB(backup) {
  try {
    const db = await _openBackupDB();
    const tx = db.transaction([AURA_BACKUP_STORE], 'readwrite');
    const store = tx.objectStore(AURA_BACKUP_STORE);
    
    // Ajouter le nouveau backup
    await new Promise((resolve, reject) => {
      const req = store.add(backup);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    
    // Rotation : récupérer tous les backups et trier
    const allBackups = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    
    // Séparer auto et manuel
    const autos = allBackups.filter(b => b.meta.type === 'auto').sort((a, b) => b.meta.date - a.meta.date);
    const manuels = allBackups.filter(b => b.meta.type === 'manual').sort((a, b) => b.meta.date - a.meta.date);
    const preImports = allBackups.filter(b => b.meta.type === 'pre-import').sort((a, b) => b.meta.date - a.meta.date);
    
    // Garder 7 autos, 5 manuels, 3 pre-import
    const toDelete = [
      ...autos.slice(7),
      ...manuels.slice(5),
      ...preImports.slice(3)
    ];
    
    for (const old of toDelete) {
      await new Promise((resolve) => {
        const req = store.delete(old.id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    }
    
    db.close();
    return true;
  } catch(e) {
    console.error('Erreur sauvegarde backup:', e);
    return false;
  }
}

// Récupérer tous les backups triés par date desc
async function _loadAllBackups() {
  try {
    const db = await _openBackupDB();
    const tx = db.transaction([AURA_BACKUP_STORE], 'readonly');
    const store = tx.objectStore(AURA_BACKUP_STORE);
    const backups = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return backups.sort((a, b) => b.meta.date - a.meta.date);
  } catch(e) {
    console.error('Erreur chargement backups:', e);
    return [];
  }
}

// Supprimer un backup par id
async function _deleteBackup(id) {
  try {
    const db = await _openBackupDB();
    const tx = db.transaction([AURA_BACKUP_STORE], 'readwrite');
    const store = tx.objectStore(AURA_BACKUP_STORE);
    await new Promise((resolve) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
    db.close();
    return true;
  } catch(e) {
    return false;
  }
}

// Backup auto à la 1ère ouverture de la journée (option Y)
async function _checkAutoBackup() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastAutoDate = localStorage.getItem(AURA_LAST_AUTO_KEY);
    if (lastAutoDate === today) {
      return; // Déjà fait aujourd'hui
    }
    // Créer le backup auto
    const backup = _buildFullBackup('Auto · ' + new Date().toLocaleString('fr-FR'), 'auto');
    const ok = await _saveBackupToDB(backup);
    if (ok) {
      localStorage.setItem(AURA_LAST_AUTO_KEY, today);
      if (typeof showToast === 'function') {
        showToast('💾 Backup auto créé', 1500);
      }
    }
  } catch(e) {
    console.error('Erreur backup auto:', e);
  }
}

// Export téléchargeable
function exportBackup(format) {
  try {
    const backup = _buildFullBackup('Manuel · ' + new Date().toLocaleString('fr-FR'), 'manual');
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = 'aura_backup_' + dateStr + '.' + (format || 'json');
    const content = JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    // Sauvegarder aussi en IndexedDB (manuel)
    _saveBackupToDB(backup).then(() => {
      if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
    });
    
    if (typeof showToast === 'function') {
      showToast('📦 Backup exporté · ' + (backup.meta.sizeChars / 1024 | 0) + ' Ko', 3000, 'win');
    }
  } catch(e) {
    console.error('Erreur export backup:', e);
    if (typeof showToast === 'function') showToast('❌ Erreur export : ' + e.message, 4000, 'loss');
  }
}
window.exportBackup = exportBackup;

// Import sélectif (Q1=B : config seulement, pas de données)

