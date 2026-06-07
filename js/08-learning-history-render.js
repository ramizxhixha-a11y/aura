// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 08/10
// Contient : learning-history-render, lmsr-threshold-drag-yellow-marker-on-actio, simulation-tick-multi-pair
// ════════════════════════════════════════════════════════════
// ============================================================
// LEARNING HISTORY RENDER
// ============================================================
function renderLearningHistory() {
  const feed  = document.getElementById('learnFeed');
  const stats = document.getElementById('learnStats');
  const count = document.getElementById('learnCount');
  if(!feed) return;

  const hist = S.learningHistory;
  if(count) count.textContent = hist.length;

  // Stats summary
  const won    = hist.filter(h=>h.won).length;
  const lost   = hist.length - won;
  const avgPnl = hist.length > 0
    ? (hist.reduce((s,h)=>s+h.pnlPct,0)/hist.length).toFixed(2)
    : '0.00';
  const wr = hist.length > 0 ? Math.round(won/hist.length*100) : 0;

  if(stats) stats.innerHTML = `
    <div class="learn-stat-card">
      <div class="learn-stat-val" style="color:var(--up)">${wr}%</div>
      <div class="learn-stat-lbl">Win Rate</div>
    </div>
    <div class="learn-stat-card">
      <div class="learn-stat-val">${hist.length}</div>
      <div class="learn-stat-lbl">Évènements</div>
    </div>
    <div class="learn-stat-card">
      <div class="learn-stat-val" style="color:${parseFloat(avgPnl)>=0?'var(--up)':'var(--down)'}">${parseFloat(avgPnl)>=0?'+':''}${avgPnl}%</div>
      <div class="learn-stat-lbl">PnL Moyen</div>
    </div>`;

  // Feed — last 30 events newest first
  const recent = hist.slice(-30).reverse();
  if(recent.length === 0) {
    feed.innerHTML = '<div style="padding:16px;text-align:center;color:var(--t3);font-size:11px;">En attente des premiers apprentissages…</div>';
    return;
  }

  feed.innerHTML = recent.map(h => {
    const up      = h.won;
    const dotCol  = up ? 'var(--up)' : 'var(--down)';
    const pnlStr  = (h.pnlPct>=0?'+':'')+h.pnlPct.toFixed(2)+'%';
    const srcIcon = h.source==='position' ? '📈' : h.source==='trade' ? '⚡' : '🔄';
    const adj     = h.adjustments || [];
    const topAgent= adj.length>0
      ? adj.sort((a,b)=>b.fitnessDelta-a.fitnessDelta)[0]
      : null;
    const adjStr  = topAgent
      ? (topAgent.aligned?'↑ ':'↓ ')+topAgent.agentName.split(' ')[0]
      : '';
    return `
    <div class="learn-item">
      <div class="learn-dot" style="background:${dotCol};box-shadow:0 0 5px ${dotCol}66;"></div>
      <div class="learn-body">
        <div class="learn-pair">${h.pair} <span style="color:var(--t3);font-size:9px;">${srcIcon} ${h.source}</span></div>
        <div class="learn-src">${adjStr ? 'Meilleur: '+adjStr : 'Cycle #'+h.cycle}</div>
      </div>
      <div class="learn-right">
        <div class="learn-pnl" style="color:${up?'var(--up)':'var(--down)'}">${pnlStr}</div>
        <div class="learn-time">${h.time}</div>
      </div>
    </div>`;
  }).join('');
}

function renderAgents() {
  const list = document.getElementById('mobileAgentList');
  if(list && list.children.length !== S.agents.length) buildAgentCards();
  patchAgentCards();
  // Only render active tab
  const evoPanel = document.getElementById('agentPanel-evo');
  if(evoPanel && evoPanel.style.display !== 'none') renderAgentsEvo();
}

function renderMarket() {
  const ps=AP(), cfg=ACFG();
  const priceStr = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : ('$'+Math.floor(ps.price).toLocaleString());
  const mktEl = document.getElementById('mktPrice');
  if(mktEl) {
    const prevPrice = parseFloat(mktEl.dataset.prev || ps.price);
    const delta = ps.price - prevPrice;
    mktEl.textContent = priceStr;
    mktEl.style.color = cfg.color;
    mktEl.dataset.prev = ps.price;
    if(Math.abs(delta) > cfg.vol * 0.1) {
      mktEl.style.textShadow = delta>0 ? '0 0 12px rgba(0,232,122,.6)' : '0 0 12px rgba(255,61,107,.6)';
      setTimeout(()=>{ if(mktEl) mktEl.style.textShadow=''; }, 600);
    }
  }
  const lbl = document.getElementById('mktPairLabel');
  if(lbl) lbl.textContent = cfg.sym+' / USDT';

  const p24 = ps.pnl24h;
  const p24El = document.getElementById('mktPnl24h');
  if(p24El){
    p24El.textContent = (p24>=0?'↑ +':'↓ ')+Math.abs(p24).toFixed(2)+'%';
    p24El.style.color = p24>=0?'var(--up)':'var(--down)';
  }

  // ── Pair selector (build once) ──
  if(!document.getElementById('pairSelWrap')){
    const wrap = document.getElementById('candle-wrap-top');
    if(wrap){
      const sel = document.createElement('div');
      sel.id='pairSelWrap';
      sel.style.cssText='display:flex;gap:6px;padding:10px 16px 0;overflow-x:auto;scrollbar-width:none;flex-shrink:0;';
      Object.keys(PAIRS).forEach(pair=>{
        const btn=document.createElement('div');
        btn.className='pair-pill'+(pair===S.activePair?' active':'');
        btn.id='ppill_'+pair.replace('/','_');
        btn.setAttribute('data-pair',pair);
        btn.onclick=()=>selectPair(pair);
        const c=PAIRS[pair];
        btn.innerHTML=`<span style="color:${c.color};margin-right:3px">●</span>${pair}`;
        sel.appendChild(btn);
      });
      wrap.insertAdjacentElement('afterend',sel);
    }
  }
  Object.keys(PAIRS).forEach(pair=>{
    const el=document.getElementById('ppill_'+pair.replace('/','_'));
    if(el) el.className='pair-pill'+(pair===S.activePair?' active':'');
  });

  // ── LMSR bars removed in v6.6 — consensus strip takes their place ──
  const _mktLmsr = document.getElementById('mktAllLmsr');
  if(_mktLmsr) _mktLmsr.remove(); // clean up if lingering from old state
  // v6.6: Agent consensus strip
  const _consMkt = document.getElementById('agentConsensusMkt');
  if(_consMkt) {
    const _topA = [...S.agents].filter(a=>Math.abs(a.score||0)>0.03&&!a.isBot).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)).slice(0,8);
    const _bull=_topA.filter(a=>(a.score||0)>0.05).length, _bear=_topA.filter(a=>(a.score||0)<-0.05).length;
    const _dir=_bull>_bear?'↑ HAUSSIER':_bear>_bull?'↓ BAISSIER':'→ NEUTRE';
    const _col=_bull>_bear?'var(--up)':_bear>_bull?'var(--down)':'var(--gold)';
    const _chips=_topA.map(a=>{const cc=(a.score||0)>0.05?'var(--up)':(a.score||0)<-0.05?'var(--down)':'var(--gold)';return `<span style="background:var(--s2);border:1px solid ${cc}33;border-radius:6px;padding:3px 7px;font-size:9px;color:${cc};">${a.emoji} ${((a.score||0)>=0?'+':'')+((a.score||0).toFixed(2))}</span>`;}).join('');
    _consMkt.innerHTML=`<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:4px 0;"><span style="font-size:9px;font-weight:700;color:${_col};background:${_col}22;padding:3px 8px;border-radius:6px;white-space:nowrap;">${_dir}</span>${_chips}</div>`;
  }
}

function selectPair(pair) {
  S.activePair = pair;
  renderMarket();
  drawMobileChart();
  renderAnalysis();
  showToast('Paire: '+pair);
}

function buildGovCards() {
  if(!S.proposals) S.proposals = [];
  if(!S.totalTFlows) S.totalTFlows = 0;
  const gl = document.getElementById('mobileGovList');
  gl.innerHTML = S.proposals.map(p=>`
    <div class="gov-card" id="gc_${p.id}" style="margin:10px 16px 0;">
      <div class="gov-id">Proposition #${p.id}</div>
      <div class="gov-desc">${p.desc}</div>
      <div class="vote-progress">
        <div class="vote-for-fill"  id="vf_${p.id}" style="width:0%"></div>
        <div class="vote-against-fill" id="va_${p.id}" style="width:0%"></div>
      </div>
      <div class="vote-stat-row">
        <span class="vote-stat-for"    id="vs_for_${p.id}">↑ Pour: 0 G$ (0%)</span>
        <span class="vote-stat-against" id="vs_ag_${p.id}">↓ Contre: 0 G$ (0%)</span>
      </div>
      <div id="vbtns_${p.id}" style="text-align:center;padding:6px 0;font-size:10px;color:var(--pur);">🤖 Décision bot · vote automatique</div>
    </div>`).join('');

  // Wallet scoreboard — sorted by fitness desc, with bar
  const wl = document.getElementById('mobileWallets');
  const sorted = [...S.agents].sort((a,b)=>b.fitness-a.fitness);
  const maxFit = Math.max(1, sorted[0]?.fitness || 1);
  const medals = ['🥇','🥈','🥉','4','5'];
  wl.innerHTML = `<div style="background:var(--s1);border:1px solid var(--border);border-radius:14px;overflow:hidden;">
  ${sorted.map((a,i)=>{
    const pct = Math.round(a.fitness/maxFit*100);
    const trend = (a.totalReward||0) >= 0 ? '↑' : '↓';
    const trendCol = (a.totalReward||0) >= 0 ? 'var(--up)' : 'var(--down)';
    return `<div style="padding:11px 14px;border-bottom:1px solid var(--border);${i===sorted.length-1?'border-bottom:none;':''}"
      id="wrow_${a.id}">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:16px;flex-shrink:0;">${medals[i]||i+1}</div>
        <div style="font-size:14px;flex-shrink:0;">${a.emoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;font-weight:600;color:var(--t1);" id="wn_${a.id}">${a.name}</span>
            <span style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--gold);">
              <span id="wv_${a.id}">${Math.floor(a.fitness)}</span>
              <span style="font-size:9px;color:var(--t3);"> T$</span>
            </span>
          </div>
          <div style="margin-top:5px;height:4px;background:var(--s3);border-radius:100px;overflow:hidden;">
            <div id="wbar_${a.id}" style="height:100%;width:${pct}%;background:${a.color};border-radius:100px;transition:width .6s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:3px;">
            <span style="font-size:8px;color:var(--t3);">${a.type}</span>
            <span style="font-size:8px;color:${trendCol};">${trend} ${Math.abs(a.totalReward||0).toFixed(0)} reward</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('')}
  </div>`;
}

function patchGovCards() {
  S.proposals.forEach(p=>{
    const total = p.forVotes+p.againstVotes;
    const fp = (p.forVotes/total*100);
    const ap = (p.againstVotes/total*100);
    const elFor  = document.getElementById('vf_'+p.id);
    const elAg   = document.getElementById('va_'+p.id);
    const elSFor = document.getElementById('vs_for_'+p.id);
    const elSAg  = document.getElementById('vs_ag_'+p.id);
    const elBtns = document.getElementById('vbtns_'+p.id);
    if(!elFor) return;
    elFor.style.width = fp+'%';
    if(elAg)   elAg.style.width   = ap+'%';
    if(elSFor) elSFor.textContent = `↑ Pour: ${p.forVotes.toLocaleString()} G$ (${fp.toFixed(0)}%)`;
    if(elSAg)  elSAg.textContent  = `↓ Contre: ${p.againstVotes.toLocaleString()} G$ (${ap.toFixed(0)}%)`;
    // Bot auto-execution check — execute when consensus reached
    if(p.status === 'active' && !p.isPairProposal) {
      const total = p.forVotes + p.againstVotes;
      const forPct = total > 0 ? p.forVotes / total : 0;
      if(forPct >= 0.65 && total > 500 && !p._executed) {
        p._executed = true;
        p.status = 'executed';
        if(elBtns) elBtns.innerHTML = '<div style="text-align:center;font-size:10px;color:var(--up);padding:5px 0;">✅ Décision bot exécutée on-chain</div>';
        S.chainLog.push({ icon:'✅', desc:`DAO #${p.id}: "${p.desc.slice(0,40)}" exécuté · ${(forPct*100).toFixed(0)}% consensus`, hash:rndHash(), time:nowStr() });
        bumpVersion('DAO #'+p.id+' exécuté');
      } else if(p.status !== 'executed' && elBtns) {
        const pct = total > 0 ? (forPct*100).toFixed(0) : 0;
        const eta = total > 0 && forPct < 0.65 ? Math.ceil((0.65*total - p.forVotes) / Math.max(1, p.forVotes/Math.max(1,S.cycle))) : 0;
        elBtns.textContent = `🤖 Bot · ${pct}% · ${forPct>=0.65?'prêt à exécuter':eta>0?'~'+eta+' cycles':'en attente'}`;
        elBtns.style.color = forPct>=0.65?'var(--up)':forPct>0.5?'var(--gold)':'var(--pur)';
      }
    } else if(p._executed || p.status === 'executed') {
      if(elBtns && !elBtns.textContent.includes('Exécuté') && !elBtns.innerHTML.includes('✅')) {
        elBtns.innerHTML = '<div style="text-align:center;font-size:10px;color:var(--up);padding:5px 0;">✅ Exécuté on-chain</div>';
      }
    }
  });

  // Patch wallet scoreboard values
  const sorted2 = [...S.agents].sort((a,b)=>b.fitness-a.fitness);
  const maxFit2 = Math.max(1, sorted2[0]?.fitness || 1);
  S.agents.forEach(a=>{
    const wv   = document.getElementById('wv_'+a.id);
    const wn   = document.getElementById('wn_'+a.id);
    const wbar = document.getElementById('wbar_'+a.id);
    if(!wv) return;
    wv.textContent   = Math.floor(a.fitness);
    if(wn) wn.textContent = a.name;
    if(wbar) wbar.style.width = Math.round(a.fitness/maxFit2*100)+'%';
  });
}

function renderDAO() {
  const gl = document.getElementById('mobileGovList');
  if(!gl) return;
  // v6.5 FIX: always call buildGovCards on first render OR when proposals change
  // Previously: never called when S.proposals.length===0 → mobileWallets empty
  const wl = document.getElementById('mobileWallets');
  if(gl.children.length !== (S.proposals||[]).length || (wl && !wl.children.length)) {
    buildGovCards();
  }

  // Agents vote automatically every 10 ticks based on fitness×score
  if(tick % 10 === 0) {
    S.proposals.filter(p => p.status==='active' && !p._executed).forEach(p => {
      S.agents.forEach(a => {
        const weight = Math.floor(Math.abs(a.score) * (a.fitness * 0.004));
        if(weight < 1) return;
        if(a.score > 0.15)       p.forVotes     += weight;
        else if(a.score < -0.15) p.againstVotes += weight;
      });
    });
  }

  // ── Dynamic Pair Proposal Card (Feature #3) ───────────────
  let pairProposalEl = document.getElementById('daoNewPairCard');
  const pairProp = S.proposals.find(p => p.isPairProposal && p.status === 'active');
  if(pairProp) {
    if(!pairProposalEl) {
      pairProposalEl = document.createElement('div');
      pairProposalEl.id = 'daoNewPairCard';
      gl.parentNode.insertBefore(pairProposalEl, gl);
    }
    const cfg = pairProp.pairCfg || {};
    const totalVotes = (pairProp.forVotes + pairProp.againstVotes) || 1;
    const forPct = Math.round(pairProp.forVotes / totalVotes * 100);
    const remaining = Math.max(0, (pairProp.autoPassAt || 0) - S.cycle);
    pairProposalEl.innerHTML = `
      <div class="pair-proposal-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="font-size:28px;">${cfg.emoji||'🌐'}</div>
          <div>
            <div class="pair-proposal-sym">${pairProp.pairSym}/USDT</div>
            <div class="pair-proposal-name">${cfg.name||''} · Corrélation: <span style="color:${cfg.corr==='LOW'?'var(--up)':cfg.corr==='MED'?'var(--gold)':'var(--down)'};">${cfg.corr||'?'}</span></div>
          </div>
        </div>
        <div class="pair-proposal-rationale">"${pairProp.rationale||''}"</div>
        <div class="pair-proposal-stats">
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val" style="color:var(--up)">${pairProp.forVotes.toLocaleString()}</div>
            <div class="pair-proposal-stat-lbl">G$ Pour</div>
          </div>
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val" style="color:var(--down)">${pairProp.againstVotes.toLocaleString()}</div>
            <div class="pair-proposal-stat-lbl">G$ Contre</div>
          </div>
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val">${forPct}%</div>
            <div class="pair-proposal-stat-lbl">Consensus</div>
          </div>
          <div class="pair-proposal-stat">
            <div class="pair-proposal-stat-val" style="color:var(--gold)">${remaining}</div>
            <div class="pair-proposal-stat-lbl">Cycles</div>
          </div>
        </div>
        <div style="height:4px;border-radius:100px;background:var(--s3);margin-top:10px;overflow:hidden;">
          <div style="width:${forPct}%;height:100%;background:linear-gradient(90deg,var(--up),var(--ice));border-radius:100px;transition:width 1s;"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px;">
          <button class="pair-activate-btn" onclick="activateDynamicPair('${pairProp.pairSym}')" style="margin-top:0;">
            ✅ Activer ${pairProp.pairSym}/USDT
          </button>
          <button onclick="rejectPairProposal('${pairProp.pairSym}')" style="
            padding:10px 14px;background:rgba(255,61,107,.08);border:1px solid rgba(255,61,107,.25);
            border-radius:10px;color:var(--down);font-size:11px;font-weight:600;font-family:var(--font-display);cursor:pointer;">
            ✕ Passer
          </button>
        </div>
      </div>`;
  } else if(pairProposalEl) {
    pairProposalEl.remove();
  }

  patchGovCards();
}

let _chainFilter = 'all';

function filterChain(filter, el) {
  _chainFilter = filter;
  document.querySelectorAll('[id^="chaintab-"]').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  renderChain();
}

function renderChain() {
  const cl = document.getElementById('mobileChainList');
  if(!cl) return;

  // Update nav badge with unread count
  const nav4badge = document.getElementById('chainCountBadge');
  if(nav4badge) {
    const cnt = Math.min(99, S.chainLog.length);
    nav4badge.textContent = cnt > 0 ? (cnt > 9 ? '9+' : cnt) : '';
    nav4badge.style.display = cnt > 0 && S.currentPage !== 4 ? '' : 'none';
  }

  if(S.chainLog.length===0){
    cl.innerHTML='<div style="color:var(--t3);font-size:11px;padding:16px;text-align:center;">En attente des premières transactions…</div>';
    return;
  }

  // Category icon sets
  const TRADE_ICONS = ['💚','🔴','✅','❌','💸','🟢','⚡','💰','📈','📉','⬆','⬇','🎯','⊗'];
  const LEARN_ICONS = ['🧠','🧬','⛓','💭','🪞','🦋','🌀','✏️','📝','🎓'];
  const DAO_ICONS   = ['🏛','🔑','🪙','🗳','▶','⏸','🌐','📡','⚖️','⚠️','🌍','☁️','🤖','🚨','↺'];
  const isTrade = t => TRADE_ICONS.includes(t.icon);
  const isLearn = t => LEARN_ICONS.includes(t.icon) || t.category === 'learn';
  const isDao   = t => DAO_ICONS.includes(t.icon);

  const allReversed = S.chainLog.slice().reverse();

  // B. Count per category (for badges)
  const counts = {
    all: allReversed.length,
    trade: allReversed.filter(isTrade).length,
    learn: allReversed.filter(isLearn).length,
    dao: allReversed.filter(isDao).length,
  };
  // Update tab labels with counts
  const tabs = {all:'chaintab-all', trade:'chaintab-trade', learn:'chaintab-learn', dao:'chaintab-dao'};
  const labels = {all:'Tout', trade:'⚡ Trades', learn:'🧠 Learn', dao:'🏛 DAO'};
  Object.keys(tabs).forEach(key => {
    const btn = document.getElementById(tabs[key]);
    if (btn) {
      const n = counts[key];
      btn.innerHTML = labels[key] + (n > 0 ? ' <span style="opacity:.6;font-size:9px;font-weight:600;">('+n+')</span>' : '');
    }
  });

  // A. Filter full log first, then take 30 most recent matches
  let logs = allReversed;
  if(_chainFilter === 'trade')      logs = logs.filter(isTrade);
  else if(_chainFilter === 'learn') logs = logs.filter(isLearn);
  else if(_chainFilter === 'dao')   logs = logs.filter(isDao);

  const visible = logs.slice(0, 30);

  // Color map for icons
  const iconColor = {
    '💚':'var(--up)','🟢':'var(--up)','✅':'var(--up)','▶':'var(--up)',
    '🔴':'var(--down)','❌':'var(--down)','⏸':'var(--down)',
    '🧬':'var(--pur)','🧠':'var(--ice)',
    '💸':'var(--gold)','🗳':'var(--gold)','🪙':'var(--gold)',
    '⛓':'var(--t3)','🏛':'var(--t2)','🔑':'var(--t2)',
  };

  cl.innerHTML = visible.map(tx => {
    const col = iconColor[tx.icon] || 'var(--t2)';
    const shortHash = tx.hash ? tx.hash.slice(0,8)+'…'+tx.hash.slice(-4) : '';
    return `
    <div class="chain-row" style="border-left:2px solid ${col}22;">
      <div class="chain-icon-wrap" style="color:${col}">${tx.icon}</div>
      <div class="chain-content">
        <div class="chain-desc" style="color:var(--t1);">${tx.desc}</div>
        <div style="display:flex;justify-content:space-between;margin-top:3px;">
          <div class="chain-hash" style="color:${col}88;">${shortHash}</div>
          <div class="chain-time">${tx.time}</div>
        </div>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--t3);font-size:11px;padding:16px;text-align:center;">Aucune transaction dans cette catégorie.</div>';
}

// ============================================================
// PAGE 5 — FISCAL
// ============================================================
function switchFiscalTab(tab, el) {
  ['global','pairs','tax','export','settings'].forEach(t => {
    const p = document.getElementById('fpanel-'+t);
    const b = document.getElementById('ftab-'+t);
    if(p) p.style.display = t===tab ? '' : 'none';
    if(b) b.classList.toggle('active', t===tab);
  });
  if(tab==='global')   renderFiscalGlobal();
  else if(tab==='pairs')    renderFiscalPairs();
  else if(tab==='tax')      renderFiscalTax();
  else if(tab==='export')   renderFiscalExport();
  else if(tab==='settings') renderFiscalSettings();
}

function renderFiscal(tab) {
  tab = tab || 'global';
  if(tab==='global')   renderFiscalGlobal();
  else if(tab==='pairs')    renderFiscalPairs();
  else if(tab==='tax')      renderFiscalTax();
  else if(tab==='export')   renderFiscalExport();
  else if(tab==='settings') renderFiscalSettings();
}

// ── Unrealized P&L banner for open manual positions ────────
function renderOpenPnlBanner() {
  const el = document.getElementById('openPnlBanner');
  if(!el) return;

  const manualPos = S.openPositions.filter(p => p.auto !== true);
  if(manualPos.length === 0) { el.innerHTML = ''; return; }

  // Compute total unrealized
  let totalUnreal = 0, totalInvested = 0;
  const rows = manualPos.map(pos => {
    const ps  = S.pairStates[pos.pair];
    const cfg = PAIRS[pos.pair];
    if(!ps) return null;
    const pnlPct = pos.side==='long'
      ? ((ps.price - pos.entryPrice)/pos.entryPrice*100)
      : ((pos.entryPrice - ps.price)/pos.entryPrice*100);
    const pnlUsd = pos.stakeUsdt * (pnlPct/100);
    const lev    = pos.stakeUsdt / (pos.amount * pos.entryPrice || pos.stakeUsdt || 1) || 1;
    totalUnreal   += pnlUsd;
    totalInvested += pos.stakeUsdt;
    const col   = pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const arrow = pos.side === 'long' ? '↑' : '↓';
    const priceStr = cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;
                 border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:10px;color:${pos.side==='long'?'var(--up)':'var(--down)'};">${arrow}</span>
        <span style="font-size:10px;font-weight:600;color:var(--t1);">${pos.pair}</span>
        <span style="font-size:8px;color:var(--t3);">@${priceStr}</span>
      </div>
      <div style="text-align:right;">
        <span style="font-size:11px;font-weight:700;color:${col};">${pnlUsd>=0?'+':''}$${pnlUsd.toFixed(2)}</span>
        <span style="font-size:8px;color:var(--t3);margin-left:4px;">(${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}%)</span>
      </div>
    </div>`;
  }).filter(Boolean).join('');

  const totCol   = totalUnreal >= 0 ? 'var(--up)' : 'var(--down)';
  const totPct   = totalInvested > 0 ? (totalUnreal/totalInvested*100) : 0;

  el.innerHTML = `
  <div style="background:var(--s1);border:1px solid ${totalUnreal>=0?'rgba(0,232,122,.2)':'rgba(255,61,107,.2)'};
              border-radius:12px;padding:10px 13px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
      <span style="font-size:9px;font-weight:700;color:var(--t2);">📂 Positions ouvertes (${manualPos.length})</span>
      <div style="text-align:right;">
        <span style="font-size:13px;font-weight:800;color:${totCol};">${totalUnreal>=0?'+':''}$${totalUnreal.toFixed(2)}</span>
        <span style="font-size:8px;color:var(--t3);margin-left:4px;">${totPct>=0?'+':''}${totPct.toFixed(2)}%</span>
      </div>
    </div>
    <div style="font-size:9px;">${rows}</div>
  </div>`;
}

function renderFiscalMini() {
  const el = document.getElementById('fiscalMiniBar');
  if(!el) return;
  const f   = S.fees;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const tax = calcTaxProvision();
  const res = f.feeReserveAccount;
  const eff = f.totalPnlGross > 0
    ? ((f.totalGross + tax) / f.totalPnlGross * 100).toFixed(1) : '0.0';
  const taxNote = reg && reg.rate === 0
    ? '<span style="color:var(--up);font-size:9px;">✓ Exonéré</span>'
    : `<span class="fiscal-mini-val" style="color:var(--gold);font-size:10px;">−$${tax.toFixed(2)} impôt</span>`;

  el.innerHTML = `<div class="fiscal-mini-bar" onclick="goPage(5,null,document.getElementById('nav5'))">
    <div class="fiscal-mini-icon">🏦</div>
    <div class="fiscal-mini-body">
      <div class="fiscal-mini-title">Réserve Fiscale · ${reg ? reg.label : S.taxConfig.region}</div>
      <div class="fiscal-mini-vals">
        <span class="fiscal-mini-val" style="color:var(--gold);">$${res.toFixed(2)}</span>
        <span class="fiscal-mini-sep">·</span>
        <span class="fiscal-mini-val" style="color:var(--down);font-size:10px;">−$${f.totalGross.toFixed(2)} frais</span>
        ${S.leverageTotalFees > 0 ? `<span class="fiscal-mini-sep">·</span><span class="fiscal-mini-val" style="color:var(--down);font-size:10px;">−$${S.leverageTotalFees.toFixed(3)} lev</span>` : ''}
        <span class="fiscal-mini-sep">·</span>
        ${taxNote}
        <span class="fiscal-mini-sep">·</span>
        <span class="fiscal-mini-val" style="color:var(--t3);font-size:9px;">${eff}% eff.</span>
      </div>
    </div>
    <div class="fiscal-mini-arrow">›</div>
  </div>`;
}

function fmtFee$(v) { return '$'+Math.abs(v).toFixed(2); }

function renderFiscalGlobal() {
  const f   = S.fees;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const taxLive  = calcTaxProvision();
  const netPnl   = f.totalPnlGross - f.totalGross - taxLive;
  const netCol   = netPnl >= 0 ? 'var(--up)' : 'var(--down)';
  const effRate  = f.totalPnlGross > 0
    ? ((f.totalGross + taxLive) / f.totalPnlGross * 100).toFixed(1)
    : '0.0';
  const reserve  = f.feeReserveAccount;
  const fiscalRes = S.fiscalReserveAccount || 0;  // v7.1 P4': compte séparé taxes + intérêts levier
  const totalReserve = reserve + fiscalRes;       // vue combinée
  const reservePct = f.totalPnlGross > 0
    ? (totalReserve / f.totalPnlGross * 100).toFixed(1)
    : '0.0';

  const sumEl = document.getElementById('fiscalSummary');
  if(!sumEl) return;

  // v7.1 P4': Historique des 10 derniers dépôts fiscaux
  const _flog = (S.fiscalReserveLog || []).slice(0, 10);
  const _logHtml = _flog.length === 0
    ? `<div style="font-size:10px;color:var(--t3);padding:8px 2px;">Aucun dépôt fiscal pour l'instant.</div>`
    : _flog.map(e => {
        const _src = e.source === 'tax_trade_close' ? `Taxe · ${e.pair||''}`
                   : e.source === 'leverage_interest' ? `Intérêt levier`
                   : (e.source || 'autre');
        const _col = e.source === 'leverage_interest' ? 'var(--ice)' : 'var(--gold)';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;">
          <span style="color:${_col};">${_src}</span>
          <span><span style="color:var(--t2);font-size:9px;margin-right:6px;">${e.time||''}</span><span style="color:var(--gold);font-weight:600;">+$${(e.amount||0).toFixed(3)}</span></span>
        </div>`;
      }).join('');

  sumEl.innerHTML = `
    <!-- COMPTE RÉSERVE SÉPARÉ -->
    <div class="fee-reserve-card">
      <div class="fee-reserve-top">
        <div>
          <div class="fee-reserve-label">🏦 Compte Réserve Fiscal</div>
          <div class="fee-reserve-val">$${totalReserve.toFixed(2)}</div>
          <div class="fee-reserve-sub">${reservePct}% du P&L brut · dont fisc. séparée $${fiscalRes.toFixed(2)}</div>
        </div>
        <div style="text-align:right;">
          <div class="fee-reserve-badge">${reg.label}</div>
          <div style="font-size:9px;color:var(--t3);margin-top:3px;">${f.tradeCount} trades · ${reg.method}</div>
        </div>
      </div>
      <div class="fee-reserve-breakdown">
        <div class="fee-reserve-item">
          <span class="fee-reserve-item-label">Exchange</span>
          <span class="fee-reserve-item-val" style="color:var(--down);">$${f.totalTradingFees.toFixed(2)}</span>
        </div>
        <div class="fee-reserve-item">
          <span class="fee-reserve-item-label">Slippage</span>
          <span class="fee-reserve-item-val" style="color:var(--pur);">$${f.totalSlippage.toFixed(2)}</span>
        </div>
        <div class="fee-reserve-item">
          <span class="fee-reserve-item-label">Funding</span>
          <span class="fee-reserve-item-val" style="color:var(--ice);">$${f.totalFunding.toFixed(2)}</span>
        </div>
        <div class="fee-reserve-item">
          <span class="fee-reserve-item-label">Prov. impôt</span>
          <span class="fee-reserve-item-val" style="color:var(--gold);">$${taxLive.toFixed(2)}</span>
        </div>
        <div class="fee-reserve-item">
          <span class="fee-reserve-item-label">Frais levier</span>
          <span class="fee-reserve-item-val" style="color:var(--gold);">$${(S.leverageTotalFees||0).toFixed(3)}</span>
        </div>
        <div class="fee-reserve-item" style="border-top:1px solid rgba(255,255,255,.08);margin-top:4px;padding-top:5px;">
          <span class="fee-reserve-item-label" style="font-weight:600;">Réserve fisc. dédiée</span>
          <span class="fee-reserve-item-val" style="color:var(--gold);font-weight:700;">$${fiscalRes.toFixed(2)}</span>
        </div>
        <!-- v7.1 P8: Fonds propres injectés (exonérés) -->
        <div class="fee-reserve-item">
          <span class="fee-reserve-item-label">Fonds propres injectés <span style="font-size:9px;color:var(--up);">· exonérés</span></span>
          <span class="fee-reserve-item-val" style="color:var(--up);">$${(S.ownFundsInjected||0).toFixed(2)}</span>
        </div>
      </div>
      <!-- v7.1 P4': Historique dépôts fiscaux -->
      <details style="margin-top:10px;border-top:1px solid rgba(255,255,255,.06);padding-top:8px;">
        <summary style="cursor:pointer;font-size:11px;color:var(--t2);user-select:none;">📜 Historique dépôts fiscaux (${(S.fiscalReserveLog||[]).length})</summary>
        <div style="margin-top:6px;max-height:180px;overflow-y:auto;">${_logHtml}</div>
      </details>
    </div>

    <!-- SYNTHÈSE NET -->
    <div class="fiscal-grid">
      <div class="fiscal-item">
        <div class="fiscal-item-label">P&L Brut</div>
        <div class="fiscal-item-val" style="color:${f.totalPnlGross>=0?'var(--up)':'var(--down)'}">
          ${f.totalPnlGross>=0?'+':''}${fmtFee$(f.totalPnlGross)}
        </div>
        <div class="fiscal-item-sub">${f.tradeCount} trades</div>
      </div>
      <div class="fiscal-item">
        <div class="fiscal-item-label">P&L Net</div>
        <div class="fiscal-item-val" style="color:${netCol}">
          ${netPnl>=0?'+':'−'}${fmtFee$(Math.abs(netPnl))}
        </div>
        <div class="fiscal-item-sub">Après frais &amp; impôts</div>
      </div>
      <div class="fiscal-item">
        <div class="fiscal-item-label">Total frais</div>
        <div class="fiscal-item-val" style="color:var(--down)">−${fmtFee$(f.totalGross)}</div>
        <div class="fiscal-item-sub">Taux eff. ${effRate}%</div>
      </div>
      <div class="fiscal-item">
        <div class="fiscal-item-label">Provision impôt</div>
        <div class="fiscal-item-val" style="color:var(--gold)">−${fmtFee$(taxLive)}</div>
        <div class="fiscal-item-sub">${(reg.rate*100*reg.inclusion).toFixed(1)}% eff.</div>
      </div>
    </div>`;

  const tcEl = document.getElementById('fTradeCount');
  if(tcEl) tcEl.textContent = f.tradeCount + ' trades';

  // ── Fiscal threshold alerts ──────────────────────────────────
  const alertEl = document.getElementById('fiscalAlertZone');
  if(alertEl) {
    const alerts = [];
    const gross  = f.totalPnlGross;
    const tc     = S.taxConfig;
    const region = tc.region;

    // Belgium specific: 33% day-trader threshold
    if(region === 'BE') {
      if(gross > 37500 && gross <= 40000)
        alerts.push({ icon:'⚠️', col:'var(--gold)', msg:`Proche du seuil déclaratif (37 500 €) — P&L: $${gross.toFixed(0)}` });
      else if(gross > 40000)
        alerts.push({ icon:'🚨', col:'var(--down)', msg:`Seuil 40 000 € dépassé — vérifier avec comptable` });
    }
    // France: PFU 30%
    if(region === 'FR') {
      if(gross > 9000 && gross <= 10000)
        alerts.push({ icon:'⚠️', col:'var(--gold)', msg:`Proche du seuil abattement (10 000 €)` });
    }
    // Reserve coverage
    // v7.1 P2: la couverture impôts utilise fiscalReserveAccount (dédié au fisc)
    const reserveNeeded = taxLive * 1.1;
    const _fiscalRes = S.fiscalReserveAccount || 0;
    if(_fiscalRes < reserveNeeded && taxLive > 5)
      alerts.push({ icon:'💰', col:'#ff9500', msg:`Réserve fiscale ($${_fiscalRes.toFixed(0)}) insuffisante pour couvrir impôts ($${taxLive.toFixed(0)})` });
    // High fees ratio
    if(f.totalPnlGross > 0 && f.totalGross / f.totalPnlGross > 0.25)
      alerts.push({ icon:'📊', col:'var(--pur)', msg:`Frais élevés: ${(f.totalGross/f.totalPnlGross*100).toFixed(1)}% du P&L brut` });
    // Net loss
    const netLoss = f.totalPnlGross - f.totalGross - taxLive;
    if(netLoss < -200)
      alerts.push({ icon:'📉', col:'var(--down)', msg:`P&L net négatif: $${netLoss.toFixed(0)} — optimiser la stratégie` });

    if(alerts.length === 0) {
      alertEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,232,122,.06);border:1px solid rgba(0,232,122,.2);border-radius:10px;">
        <span style="font-size:16px;">✅</span>
        <span style="font-size:11px;color:var(--up);">Aucune alerte fiscale · situation saine</span>
      </div>`;
    } else {
      alertEl.innerHTML = alerts.map(a => `
        <div style="display:flex;align-items:flex-start;gap:8px;padding:9px 12px;margin-bottom:6px;
             background:${a.col}11;border:1px solid ${a.col}44;border-radius:10px;">
          <span style="font-size:15px;flex-shrink:0;">${a.icon}</span>
          <span style="font-size:11px;color:${a.col};line-height:1.4;">${a.msg}</span>
        </div>`).join('');
    }
  }

  // ── Détail par type (barres) ──
  const bdEl = document.getElementById('fiscalBreakdown');
  if(bdEl) {
    const total = Math.max(0.01, f.totalGross + taxLive);
    const items = [
      { label:`Frais trading (maker ${(S.feeConfig.makerRate*100).toFixed(2)}% / taker ${(S.feeConfig.takerRate*100).toFixed(2)}%)`, val:f.totalTradingFees, col:'var(--down)', sub:'Maker si conviction ≥80%, taker sinon' },
      { label:`Slippage estimé (${(S.feeConfig.slippage*100).toFixed(2)}%)`, val:f.totalSlippage, col:'var(--pur)', sub:'Glissement de prix à l\'exécution' },
      { label:'Frais de financement',         val:f.totalFunding,     col:'var(--ice)',   sub:'0.01% par cycle sur positions ouvertes' },
      { label:'Provision fiscale',            val:taxLive,            col:'var(--gold)',  sub:reg.method+' — '+reg.label },
    ];
    bdEl.innerHTML = `<div style="background:var(--s1);border:1px solid var(--border);border-radius:14px;overflow:hidden;">
    ${items.map((it,i)=>{
      const pct = Math.min(100,(it.val/total*100));
      return `<div style="padding:10px 14px;${i<items.length-1?'border-bottom:1px solid var(--border);':''}">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:11px;color:var(--t2);">${it.label}</span>
          <span style="font-size:12px;font-weight:700;color:${it.col};">−$${it.val.toFixed(2)}</span>
        </div>
        <div style="height:5px;background:var(--s3);border-radius:100px;overflow:hidden;">
          <div style="height:100%;width:${pct.toFixed(1)}%;background:${it.col};border-radius:100px;transition:width .5s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:3px;">
          <span style="font-size:8px;color:var(--t3);">${it.sub}</span>
          <span style="font-size:8px;color:var(--t3);">${pct.toFixed(1)}%</span>
        </div>
      </div>`;
    }).join('')}
    </div>`;
  }

  // ── Log des derniers frais ──
  const flEl = document.getElementById('feeLog');
  if(flEl) {
    if(f.feeLog.length === 0) {
      flEl.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:12px 0;text-align:center;">En attente des premiers trades…</div>';
      return;
    }
    flEl.innerHTML = f.feeLog.slice(0,15).map(e=>{
      const pnlUp = parseFloat(e.pnlGross) >= 0;
      const netUp = parseFloat(e.pnlNet)   >= 0;
      const tf    = parseFloat(e.tradingFee).toFixed(2);
      const sf    = parseFloat(e.slipFee).toFixed(2);
      const tx    = parseFloat(e.taxAmount).toFixed(2);
      const tot   = parseFloat(e.totalFee).toFixed(2);
      const pnlN  = parseFloat(e.pnlNet).toFixed(2);
      return `<div class="fee-log-item">
        <div class="fee-log-icon">${pnlUp?'💚':'🔴'}</div>
        <div class="fee-log-body">
          <div class="fee-log-title">
            <span style="color:var(--ice);font-weight:600;">${e.pair}</span>
            <span style="color:var(--t3);"> · $${parseFloat(e.notional).toFixed(0)} USDT</span>
          </div>
          <div class="fee-log-detail">
            <span style="color:var(--down);">Exch: −$${tf}</span>
            <span style="color:var(--pur);"> · Slip: −$${sf}</span>
            <span style="color:var(--gold);"> · Impôt: −$${tx}</span>
          </div>
          <div style="font-size:8px;color:var(--t3);margin-top:1px;">${e.time} · ${e.region||'—'}</div>
        </div>
        <div class="fee-log-right">
          <div class="fee-log-total" style="color:var(--down);">−$${tot}</div>
          <div style="font-size:9px;font-weight:700;margin-top:2px;color:${netUp?'var(--up)':'var(--down)'};">
            Net: ${netUp?'+':'-'}$${Math.abs(pnlN)}
          </div>
        </div>
      </div>`;
    }).join('');
  }
}

function renderFiscalPairs() {
  const el = document.getElementById('feesByPair');
  if(!el) return;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  el.innerHTML = Object.keys(PAIRS).map(pair => {
    const cfg = PAIRS[pair];
    const bp  = S.fees.byPair[pair] || {
      tradingFees:0, slippage:0, gross:0, tax:0, pnlGross:0, pnlNet:0, trades:0, netPct:0
    };
    const pnlNetUp  = bp.pnlNet >= 0;
    const pnlGrossUp= bp.pnlGross >= 0;
    const totalCost = bp.gross + bp.tax;
    const estFeeNext= (S.pairStates[pair]?.stake||0) * (S.feeConfig.takerRate + S.feeConfig.slippage);
    const estTaxNext= (S.pairStates[pair]?.stake||0) * S.feeConfig.takerRate * reg.rate * reg.inclusion;
    // Ratio frais/P&L brut (plus bas = plus efficace)
    const costRatio = bp.pnlGross !== 0 ? (totalCost / Math.abs(bp.pnlGross) * 100) : 0;
    const effBadge  = costRatio < 5 ? {col:'var(--up)', lbl:'Efficace'} :
                      costRatio < 15? {col:'var(--gold)', lbl:'Moyen'} :
                                      {col:'var(--down)', lbl:'Coûteux'};

    return `<div class="pair-fee-card">
      <div class="pair-fee-header">
        <span style="font-size:13px;font-weight:700;color:${cfg.color};">${pair}</span>
        <div style="display:flex;gap:5px;align-items:center;">
          <span class="pill" style="font-size:8px;background:rgba(255,255,255,.05);color:${effBadge.col};border:1px solid ${effBadge.col}33;">${effBadge.lbl}</span>
          <span class="pill ${bp.trades>0?'pill-ice':'pill-gold'}" style="font-size:9px;">${bp.trades} tr.</span>
        </div>
      </div>

      <!-- Grille détail -->
      <div class="pair-fee-grid">
        <div class="pair-fee-cell">
          <div class="pair-fee-cell-label">Frais exch.</div>
          <div class="pair-fee-cell-val" style="color:var(--down);">−$${bp.tradingFees.toFixed(2)}</div>
          <div class="pair-fee-cell-sub">${(S.feeConfig.takerRate*100).toFixed(2)}% taker</div>
        </div>
        <div class="pair-fee-cell">
          <div class="pair-fee-cell-label">Slippage</div>
          <div class="pair-fee-cell-val" style="color:var(--pur);">−$${bp.slippage.toFixed(2)}</div>
          <div class="pair-fee-cell-sub">${(S.feeConfig.slippage*100).toFixed(2)}% slip</div>
        </div>
        <div class="pair-fee-cell">
          <div class="pair-fee-cell-label">Prov. impôt</div>
          <div class="pair-fee-cell-val" style="color:var(--gold);">−$${bp.tax.toFixed(2)}</div>
          <div class="pair-fee-cell-sub">${reg.method}</div>
        </div>
        <div class="pair-fee-cell">
          <div class="pair-fee-cell-label">Total coût</div>
          <div class="pair-fee-cell-val" style="color:var(--down);">−$${totalCost.toFixed(2)}</div>
          <div class="pair-fee-cell-sub">${costRatio.toFixed(1)}% du P&L</div>
        </div>
      </div>

      <!-- Séparateur P&L -->
      <div style="height:1px;background:var(--border);margin:8px 0;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:9px;color:var(--t3);">P&L Brut</div>
          <div style="font-size:13px;font-weight:700;color:${pnlGrossUp?'var(--up)':'var(--down)'};">
            ${pnlGrossUp?'+':''}$${bp.pnlGross.toFixed(2)}
          </div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:9px;color:var(--t3);">→</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;color:var(--t3);">P&L Net</div>
          <div style="font-size:13px;font-weight:700;color:${pnlNetUp?'var(--up)':'var(--down)'};">
            ${pnlNetUp?'+':''}$${bp.pnlNet.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Prochain trade estimé -->
      <div style="margin-top:8px;background:var(--s3);border-radius:9px;padding:8px 10px;">
        <div style="font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;">Prochain trade estimé</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;">
          <span style="color:var(--t2);">Mise bot: <strong style="color:var(--gold);">$${Math.round(Math.min(S.pairStates[pair]?.stake||0, S.tradingAccount*0.10))}</strong></span>
          <span style="color:var(--down);">Frais: −$${estFeeNext.toFixed(2)}</span>
          <span style="color:var(--gold);">Tax: −$${estTaxNext.toFixed(2)}</span>
        </div>
      </div>

      <!-- Optimisation -->
      ${costRatio > 10 ? `
      <div style="margin-top:6px;background:rgba(0,232,122,.05);border:1px solid rgba(0,232,122,.15);border-radius:9px;padding:8px 10px;">
        <div style="font-size:8px;color:var(--up);font-weight:600;text-transform:uppercase;letter-spacing:.06em;">💡 Optimisation</div>
        <div style="font-size:9px;color:var(--t2);margin-top:3px;line-height:1.5;">
          ${costRatio > 20 ? '• Réduire la fréquence des trades sur cette paire' : ''}
          ${bp.slippage > bp.tradingFees ? '• Utiliser des ordres limites (maker)' : ''}
          ${bp.pnlGross < 0 && bp.tax > 0 ? '• Compenser avec gains d\'autres paires' : ''}
          • Seuil de rentabilité: signal LMSR &gt; ${(60 + costRatio*.2).toFixed(0)}%
        </div>
      </div>` : ''}
    </div>`;
  }).join('');
}

function renderFiscalTax() {
  const el  = document.getElementById('taxPanel');
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const f   = S.fees;
  if(!el) return;

  const taxLive     = calcTaxProvision();
  const netGain     = Math.max(0, f.totalPnlGross - f.totalGross);
  const taxBase     = netGain * reg.inclusion;
  const netAfterTax = netGain - taxLive;
  const isZero      = reg.rate === 0;

  const badge = document.getElementById('fRegionBadge');
  if(badge) badge.textContent = reg.label;

  el.innerHTML = `
    <div class="tax-region-card">
      <div class="tax-region-header">
        <div>
          <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;">Provision fiscale estimée</div>
          <div class="tax-big ${isZero?'zero':''}">${isZero ? '✓ $0.00' : '−$'+taxLive.toFixed(2)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:24px;font-weight:700;color:${isZero?'var(--up)':'var(--gold)'};">${(reg.rate*100*reg.inclusion).toFixed(1)}%</div>
          <div style="font-size:9px;color:var(--t3);">taux effectif</div>
        </div>
      </div>
      <div class="tax-note">${reg.note}</div>
      ${(function(){
        if (typeof detectFiscalRegime !== 'function') return '';
        const _fr = detectFiscalRegime();
        const _col = _fr.isSpec ? 'var(--down)' : 'var(--up)';
        const _bg  = _fr.isSpec ? 'rgba(255,61,107,.08)' : 'rgba(0,232,122,.06)';
        const _ltNote = _fr.longTermMonths > 0
          ? ` · Détention >${_fr.longTermMonths} mois = régime allégé/exonéré dans ce pays`
          : '';
        const _frNote = _fr.franchise > 0
          ? ` · Franchise annuelle ${_fr.franchise.toLocaleString('fr-FR')}€`
          : '';
        return `<div style="margin-top:6px;padding:6px 10px;background:${_bg};border-radius:8px;font-size:9px;color:${_col};">
          ${_fr.isSpec ? '⚠ Régime SPÉCULATIF détecté' : '✅ Gestion normale'} (${_fr.reason}) · taux appliqué ${(_fr.rate*100).toFixed(_fr.rate*100%1===0?0:1)}%${_frNote}${_ltNote}</div>`;
      })()}
    </div>

    <div style="background:var(--s1);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:10px;">
      <div class="tax-breakdown-row">
        <span style="color:var(--t3);">P&L brut total</span>
        <span style="font-weight:600;color:${f.totalPnlGross>=0?'var(--up)':'var(--down)'};">
          ${f.totalPnlGross>=0?'+':''}$${f.totalPnlGross.toFixed(2)}
        </span>
      </div>
      <div class="tax-breakdown-row">
        <span style="color:var(--t3);">− Frais &amp; slippage</span>
        <span style="font-weight:600;color:var(--down);">−$${f.totalGross.toFixed(2)}</span>
      </div>
      <div class="tax-breakdown-row">
        <span style="color:var(--t3);">= Gain imposable</span>
        <span style="font-weight:600;color:var(--t1);">$${netGain.toFixed(2)}</span>
      </div>
      <div class="tax-breakdown-row">
        <span style="color:var(--t3);">× Inclusion (${(reg.inclusion*100).toFixed(0)}%)</span>
        <span style="font-weight:600;color:var(--t1);">$${taxBase.toFixed(2)}</span>
      </div>
      <div class="tax-breakdown-row">
        <span style="color:var(--t3);">× Taux (${(reg.rate*100).toFixed(1)}%)</span>
        <span style="font-weight:600;color:${isZero?'var(--up)':'var(--gold)'};">${isZero?'$0.00':'−$'+taxLive.toFixed(2)}</span>
      </div>
      <div class="tax-breakdown-row" style="background:var(--s2);">
        <span style="color:var(--t1);font-weight:700;">P&L Net après impôt</span>
        <span style="font-weight:700;font-size:13px;color:${netAfterTax>=0?'var(--up)':'var(--down)'};">
          ${netAfterTax>=0?'+':''}$${netAfterTax.toFixed(2)}
        </span>
      </div>
    </div>

    <div style="background:rgba(0,232,122,.06);border:1px solid rgba(0,232,122,.2);border-radius:14px;padding:14px;">
      <div style="font-size:10px;font-weight:700;color:var(--up);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;">💡 Optimisation fiscale</div>
      ${netGain > 0 ? `
        <div style="font-size:11px;color:var(--t2);line-height:1.7;">
          • Différer les trades rentables en fin d'année si possible<br>
          • Compenser avec des pertes latentes d'autres paires<br>
          • Méthode FIFO ou coût moyen selon avantage régional<br>
          ${S.taxConfig.region==='BE' ? '• Rester sous la franchise de 10 000€/an de plus-values nettes maintient l’exonération<br>• Éviter le levier et la haute fréquence pour rester en régime normal (10% au lieu de 33%)' : ''}
          ${(S.taxConfig.region==='DE'||S.taxConfig.region==='PT') ? '• Conserver >1 an exonère totalement la plus-value dans ce pays' : ''}
          ${S.taxConfig.region==='CA' ? '• Utiliser le CELI/REER pour abri fiscal' : ''}
          • Seuil de déclaration approx.: <span style="color:var(--gold);">${S.taxConfig.region==='CA'?'pas de seuil min.':S.taxConfig.region==='US'?'>$600':'vérifier localement'}</span>
        </div>
      ` : `<div style="font-size:11px;color:var(--t3);">Pas de gains nets à provisionner pour l'instant.</div>`}
    </div>`;
}

function renderFiscalExport() {
  const el = document.getElementById('exportPanel');
  if(!el) return;
  const f   = S.fees;
  const reg = S.taxConfig.regions[S.taxConfig.region];
  const tax = calcTaxProvision();
  const d   = new Date().toISOString().slice(0,10);

  el.innerHTML = `
  <!-- Statut stockage -->
  <div style="background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:700;color:var(--t1);">💾 Stockage Local (IndexedDB)</span>
      <span class="pill pill-up" style="font-size:9px;">ACTIF</span>
    </div>
    <div style="font-size:10px;color:var(--t3);line-height:1.6;">
      ${f.tradeCount} trades · ${f.feeLog.length} entrées frais<br>
      Région: ${reg ? reg.label : S.taxConfig.region} · Session: ${d}
    </div>
  </div>

  <!-- Boutons export -->
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">

    <button onclick="exportTradesCSV()" style="
      width:100%;padding:14px;border-radius:12px;border:1px solid rgba(0,232,122,.3);
      background:rgba(0,232,122,.06);color:var(--up);font-family:var(--font-mono);
      font-size:11px;font-weight:600;cursor:pointer;text-align:left;-webkit-user-select:none;">
      📥 Trades complets (CSV)
      <span style="float:right;font-size:9px;color:var(--t3);">${f.tradeCount} trades · ${d}</span>
    </button>

    <button onclick="exportFeesCSV()" style="
      width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,61,107,.3);
      background:rgba(255,61,107,.06);color:var(--down);font-family:var(--font-mono);
      font-size:11px;font-weight:600;cursor:pointer;text-align:left;-webkit-user-select:none;">
      📥 Journal des frais (CSV)
      <span style="float:right;font-size:9px;color:var(--t3);">${f.feeLog.length} entrées</span>
    </button>

    <button onclick="exportSummaryCSV()" style="
      width:100%;padding:14px;border-radius:12px;border:1px solid rgba(247,200,26,.3);
      background:rgba(247,200,26,.06);color:var(--gold);font-family:var(--font-mono);
      font-size:11px;font-weight:600;cursor:pointer;text-align:left;-webkit-user-select:none;">
      📥 Résumé fiscal (CSV)
      <span style="float:right;font-size:9px;color:var(--t3);">par paire + total</span>
    </button>

    <button onclick="exportFullJSON()" style="
      width:100%;padding:14px;border-radius:12px;border:1px solid rgba(167,139,250,.3);
      background:rgba(167,139,250,.06);color:var(--pur);font-family:var(--font-mono);
      font-size:11px;font-weight:600;cursor:pointer;text-align:left;-webkit-user-select:none;">
      📦 Backup complet (JSON)
      <span style="float:right;font-size:9px;color:var(--t3);">Toutes données</span>
    </button>
  </div>

  <!-- Résumé fiscal rapide -->
  <div style="background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:var(--t1);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;">📋 Données à exporter</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      ${[
        ['Frais exchange',  '-$'+f.totalTradingFees.toFixed(2),  'var(--down)'],
        ['Slippage',        '-$'+f.totalSlippage.toFixed(2),     'var(--pur)'],
        ['Funding',         '-$'+f.totalFunding.toFixed(2),      'var(--ice)'],
        ['Prov. impôt',     '-$'+tax.toFixed(2),                 'var(--gold)'],
        ['Réserve totale',  '$'+(f.feeReserveAccount + (S.fiscalReserveAccount||0)).toFixed(2),  'var(--gold)'],
        ['P&L Net',         (f.totalPnlNet>=0?'+':'')+f.totalPnlNet.toFixed(2)+'$', f.totalPnlNet>=0?'var(--up)':'var(--down)'],
      ].map(([l,v,c])=>`
        <div style="background:var(--s3);border-radius:9px;padding:8px;">
          <div style="font-size:8px;color:var(--t3);text-transform:uppercase;">${l}</div>
          <div style="font-size:13px;font-weight:700;color:${c};margin-top:2px;">${v}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:9px;color:var(--t3);margin-top:10px;line-height:1.5;">
      ⚠️ Estimations indicatives. Les fichiers CSV peuvent être importés dans Excel, Google Sheets ou un logiciel comptable.
    </div>
  </div>`;
}

function renderFiscalSettings() {
  const el = document.getElementById('taxSettings');
  if(!el) return;
  const regions = S.taxConfig.regions;
  const fc = S.feeConfig;

  el.innerHTML = `
    <!-- Fee rate editor -->
    <div style="background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:10px;">⚙️ Configuration des frais</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${[
          { key:'makerRate', label:'Maker %', hint:'Ordre limite', mul:100 },
          { key:'takerRate', label:'Taker %', hint:'Ordre marché', mul:100 },
          { key:'slippage',  label:'Slippage %', hint:'Glissement prix', mul:100 },
          { key:'fundingRate',label:'Funding %', hint:'Par cycle ouvert', mul:100 },
        ].map(f => `
          <div>
            <div style="font-size:8px;color:var(--t3);margin-bottom:3px;">${f.label} <span style="color:var(--t4);">(${f.hint})</span></div>
            <div style="display:flex;align-items:center;gap:4px;">
              <input type="number" id="fee_${f.key}" step="0.001" min="0" max="5"
                value="${(fc[f.key]*f.mul).toFixed(3)}"
                oninput="saveFeeSettings()"
                style="flex:1;background:var(--s3);border:1px solid var(--border);border-radius:6px;
                       padding:5px 7px;color:var(--gold);font-family:var(--font-mono);font-size:11px;
                       font-weight:700;box-sizing:border-box;-webkit-appearance:none;">
              <span style="font-size:9px;color:var(--t3);">%</span>
            </div>
          </div>`).join('')}
      </div>
      <div style="font-size:8px;color:var(--t3);margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
        Frais totaux aller-retour estimés: <span style="color:var(--down);font-weight:700;">
        ${((fc.makerRate + fc.takerRate + fc.slippage*2 + fc.fundingRate)*100).toFixed(3)}%</span>
      </div>
    </div>

    <!-- Region selector -->
    <div style="font-size:11px;font-weight:700;color:var(--t2);margin-bottom:8px;">🌍 Région fiscale</div>
    ${Object.entries(regions).map(([key, r])=>{
      const isZero = r.rate === 0;
      const rateStr = isZero ? '0%' : (r.rate*100*r.inclusion).toFixed(1)+'%';
      return `
      <div class="region-btn ${S.taxConfig.region===key?'active':''}"
           onclick="selectRegion('${key}')">
        <div class="region-btn-flag">${r.label.split(' ')[0]}</div>
        <div class="region-btn-info">
          <div class="region-btn-name">${r.label.split(' ').slice(1).join(' ')}</div>
          <div class="region-btn-note">${r.method} · ${r.note.substring(0,52)}${r.note.length>52?'…':''}</div>
        </div>
        <div class="region-btn-rate ${isZero?'zero':'nonzero'}">${rateStr}</div>
      </div>`;
    }).join('')}

    <div style="font-size:10px;color:var(--t3);margin-top:12px;line-height:1.7;padding:12px 14px;
         background:var(--s1);border-radius:12px;border:1px solid var(--border);">
      ⚠️ <strong style="color:var(--t2);">Belgique (BE)</strong> : exonération si gestion normale.
      33% si spéculation jugée professionnelle. NEXUS estime 0% par défaut.<br><br>
      Ces estimations sont indicatives. Consultez un comptable agréé.
    </div>`;
}

function saveFeeSettings() {
  const get = id => parseFloat(document.getElementById(id)?.value || 0) / 100;
  S.feeConfig.makerRate   = Math.max(0, Math.min(0.05, get('fee_makerRate')));
  S.feeConfig.takerRate   = Math.max(0, Math.min(0.05, get('fee_takerRate')));
  S.feeConfig.slippage    = Math.max(0, Math.min(0.05, get('fee_slippage')));
  S.feeConfig.fundingRate = Math.max(0, Math.min(0.05, get('fee_fundingRate')));
  // Re-render the summary line live
  const sumEl = document.querySelector('#taxSettings .fee-total-sum');
  if(sumEl) sumEl.textContent =
    ((S.feeConfig.makerRate + S.feeConfig.takerRate + S.feeConfig.slippage*2 + S.feeConfig.fundingRate)*100).toFixed(3)+'%';
  showToast('⚙️ Frais mis à jour', 2800, 'user');
}

function selectRegion(key) {
  S.taxConfig.region = key;
  renderFiscalSettings();  // rebuild selection
  renderFiscalTax();       // update tax panel
  const badge = document.getElementById('fRegionBadge');
  if(badge) badge.textContent = S.taxConfig.regions[key].label;
  showToast('🌍 Région: '+S.taxConfig.regions[key].label, 2800, 'user');
}

// ============================================================
// v3.1 — INTELLIGENCE BANNER
// ============================================================
function updateIntelBanner() {
  const iconEl  = document.getElementById('intelIcon');
  const textEl  = document.getElementById('intelText');
  const badgeEl = document.getElementById('intelBadge');
  if(!iconEl || !textEl || !badgeEl) return;

  const pairs   = Object.keys(S.pairStates);
  const avgProb = pairs.reduce((s,k) => s + lmsrP(S.pairStates[k]), 0) / pairs.length;
  const topAgent= [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>b.fitness-a.fitness)[0];
  const totalMem= S.agents.reduce((s,a)=>s+(a.memory?a.memory.length:0),0);
  const openPos = S.openPositions.length;
  const wonMem  = S.globalMemoryPool.filter(e=>e.episode&&e.episode.won).length;
  const memWR   = S.globalMemoryPool.length > 0 ? Math.round(wonMem/S.globalMemoryPool.length*100) : 0;

  let icon, text, badge, bannerBorder;

  if(S.dreamActive && S.currentDream) {
    icon   = '💤';
    text   = `<strong>Dream Cycle #${S.currentDream.id}</strong> — stress-test ${S.dreamProgress}% · agents recalibrés en temps réel`;
    badge  = 'DREAM';
    bannerBorder = 'rgba(167,139,250,.3)';
  } else if(openPos > 0) {
    const dir = avgProb > 0.5 ? '↑' : '↓';
    const col = avgProb > 0.5 ? '#00e87a' : '#ff3d6b';
    icon = avgProb > 0.55 ? '🟢' : avgProb < 0.45 ? '🔴' : '🟡';
    text = `<strong>${openPos} position(s) ouverte(s)</strong> · LMSR <span style="color:${col}">${dir} ${(avgProb*100).toFixed(0)}%</span> · Meilleur: <strong>${topAgent?.name||'—'}</strong> (${Math.floor(topAgent?.fitness||0)} T$)`;
    badge = avgProb > 0.55 ? 'LONG' : avgProb < 0.45 ? 'SHORT' : 'NEUTRE';
    bannerBorder = avgProb > 0.55 ? 'rgba(0,232,122,.25)' : avgProb < 0.45 ? 'rgba(255,61,107,.25)' : 'rgba(245,200,66,.2)';
  } else if(totalMem > 20) {
    icon = '💭';
    text = `<strong>Mémoire collective</strong> · ${totalMem} épisodes · ${memWR}% win rate · Pool: ${S.globalMemoryPool.length} · Rappels actifs`;
    badge = 'MÉMOIRE';
    bannerBorder = 'rgba(56,212,245,.2)';
  } else if(S.activePairProposal) {
    icon = '🌐';
    const prop = S.proposals.find(p=>p.isPairProposal&&p.status==='active');
    const forPct = prop ? Math.round(prop.forVotes/(prop.forVotes+prop.againstVotes)*100) : 0;
    text = `<strong>DAO vote en cours</strong> · Proposition ${S.activePairProposal}/USDT · <span style="color:var(--up)">${forPct}% pour</span> · vote auto dans ${Math.max(0,(prop?.autoPassAt||0)-S.cycle)} cycles`;
    badge = 'DAO VOTE';
    bannerBorder = 'rgba(245,200,66,.25)';
  } else {
    const dir = avgProb > 0.5 ? 'haussier' : avgProb < 0.5 ? 'baissier' : 'neutre';
    const col = avgProb > 0.52 ? '#00e87a' : avgProb < 0.48 ? '#ff3d6b' : '#f5c842';
    icon = S.botAutoMode === false ? '🎛️' : '🧠';
    const levInfo = S.leverageBorrowed > 0 ? ` · ⚡ $${Math.floor(S.leverageBorrowed)} lev actif` : '';
    const modeChip = S.botAutoMode === false
      ? ` · <span class="mode-indicator-chip manual">🎛️ MAN</span>`
      : ` · <span class="mode-indicator-chip auto">🤖 AUTO</span>`;
    text = `Consensus <span style="color:${col}"><strong>${dir}</strong></span> · LMSR ${(avgProb*100).toFixed(0)}% · <strong>${topAgent?.name||'—'}</strong>${levInfo}${modeChip}`;
    badge = 'INTELLIGENCE';
    bannerBorder = 'rgba(167,139,250,.15)';
  }

  iconEl.innerHTML   = icon;
  textEl.innerHTML   = text;
  badgeEl.textContent= badge;
  const banner = document.getElementById('intelBanner');
  if(banner) banner.style.borderColor = bannerBorder;
}

// ============================================================
// v3.1 — STREAK COUNTER
// ============================================================
function updateStreakBadge() {
  const el = document.getElementById('streakBadge');
  if(!el) return;

  // Count streak from learningHistory (most recent outcomes)
  const hist = S.learningHistory.filter(h => h.source === 'trade' || h.source === 'position');
  if(hist.length === 0) { el.textContent = '— streak'; el.className = 'streak-badge neu'; return; }

  let streak = 0;
  const last = hist[hist.length-1].won;
  for(let i = hist.length-1; i >= 0; i--) {
    if(hist[i].won === last) streak++;
    else break;
  }

  if(last) {
    el.textContent = `🔥 ${streak}W`;
    el.className = 'streak-badge win';
  } else {
    el.textContent = `${streak}L ↓`;
    el.className = 'streak-badge loss';
  }
}

// ============================================================
// v3.1 — AGENT HEATMAP GRID
// ============================================================
function renderAgentHeatmap() {
  const grid = document.getElementById('agentHeatmapGrid');
  if(!grid) return;

  const analysisAgents = S.agents.filter(a => !a.isBot);
  const maxFit = Math.max(1, ...analysisAgents.map(a=>a.fitness));

  // Rebuild only if count changed
  if(grid.children.length !== analysisAgents.length) {
    grid.style.gridTemplateColumns = `repeat(${Math.min(5, analysisAgents.length)}, 1fr)`;
    grid.innerHTML = analysisAgents.map(a => `
      <div class="heatmap-cell" id="hc_${a.id}" onclick="showMemoryOverlay('${a.id}')" title="${a.name}">
        <div class="hc-emoji">${a.emoji}</div>
        <div class="hc-score" id="hcs_${a.id}">+0.00</div>
        <div class="hc-fit"  id="hcf_${a.id}">0T$</div>
      </div>`).join('');
  }

  analysisAgents.forEach(a => {
    const cell  = document.getElementById('hc_'+a.id);
    const score = document.getElementById('hcs_'+a.id);
    const fit   = document.getElementById('hcf_'+a.id);
    if(!cell) return;

    const s = a.score;
    const fitNorm = Math.min(1, a.fitness / maxFit);
    const alpha   = 0.08 + Math.abs(s) * 0.45;

    // Background color: green if positive, red if negative, slate if neutral
    let bg, borderCol, textCol;
    if(s > 0.12) {
      bg = `rgba(0,232,122,${alpha})`; borderCol = `rgba(0,232,122,${alpha+.1})`; textCol = '#00e87a';
    } else if(s < -0.12) {
      bg = `rgba(255,61,107,${alpha})`; borderCol = `rgba(255,61,107,${alpha+.1})`; textCol = '#ff3d6b';
    } else {
      bg = `rgba(56,212,245,0.05)`; borderCol = 'rgba(56,212,245,.1)'; textCol = '#8899bb';
    }

    cell.style.background   = bg;
    cell.style.border       = `1px solid ${borderCol}`;
    cell.style.boxShadow    = Math.abs(s) > 0.5 ? `0 0 8px ${borderCol}` : 'none';

    if(score) { score.textContent = (s>=0?'+':'')+s.toFixed(2); score.style.color = textCol; }
    if(fit)   { fit.textContent   = a.fitness >= 1000 ? (a.fitness/1000).toFixed(1)+'k' : Math.floor(a.fitness)+'T$'; }

    // Pulse on high conviction
    if(Math.abs(s) > 0.7 && tick % 6 === 0) {
      cell.style.transform = 'scale(1.05)';
      setTimeout(()=>{ if(cell) cell.style.transform=''; }, 300);
    }
  });
}

// ============================================================
// v3.1 — AGENT CORRELATION MATRIX (Canvas)
// ============================================================
let _corrLastTick = -1;

function renderCorrMatrix() {
  const canvas = document.getElementById('corrMatrixCanvas');
  if(!canvas) return;
  if(tick - _corrLastTick < 5) return;
  _corrLastTick = tick;

  const agents = S.agents.filter(a => !a.isBot && !a.isMeta).slice(0, 8);
  const n = agents.length;
  if(n < 2) return;

  const dpr = window.devicePixelRatio || 1;
  let W = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 0;
  if(W < 10) { _corrLastTick=-1; requestAnimationFrame(()=>{_corrLastTick=-10;}); W=300; }
  const cellSize = Math.floor(W / n);
  const H = cellSize * n;
  canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.height=H+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Pearson correlation using fitnessHistory (real time series)
  function pearson(xs, ys) {
    const len = Math.min(xs.length, ys.length);
    if(len < 4) return 0;
    const ax = xs.slice(-len).reduce((a,b)=>a+b,0)/len;
    const ay = ys.slice(-len).reduce((a,b)=>a+b,0)/len;
    let num=0, dx2=0, dy2=0;
    for(let k=0;k<len;k++){
      const dx=xs[xs.length-len+k]-ax, dy=ys[ys.length-len+k]-ay;
      num+=dx*dy; dx2+=dx*dx; dy2+=dy*dy;
    }
    const denom = Math.sqrt(dx2*dy2);
    return denom < 1e-10 ? 0 : Math.max(-1, Math.min(1, num/denom));
  }

  for(let i=0;i<n;i++) {
    for(let j=0;j<n;j++) {
      const ai=agents[i], aj=agents[j];
      let corr;
      if(i===j) {
        corr = 1.0;
      } else {
        const hi = ai.fitnessHistory || [ai.fitness];
        const hj = aj.fitnessHistory || [aj.fitness];
        if(hi.length >= 4 && hj.length >= 4) {
          corr = pearson(hi, hj);
        } else {
          // Fallback: score direction agreement weighted by magnitude
          const si=ai.score||0, sj=aj.score||0;
          if(Math.abs(si)<0.02||Math.abs(sj)<0.02) { corr=0; }
          else {
            const sameDir=(si>0&&sj>0)||(si<0&&sj<0);
            corr = sameDir ? Math.min(0.8,Math.abs(si)*Math.abs(sj)*6) : -Math.min(0.8,Math.abs(si)*Math.abs(sj)*6);
          }
        }
      }

      // Color: green=aligned, red=opposed, dark=neutral
      let r,g,b,a;
      if(i===j) { r=0;g=200;b=120;a=0.65; }
      else if(corr>0.3) { const t=corr; r=0;g=Math.round(t*230);b=Math.round(t*80);a=0.15+t*0.6; }
      else if(corr<-0.3) { const t=Math.abs(corr); r=Math.round(t*255);g=30;b=60;a=0.15+t*0.6; }
      else { r=136;g=153;b=187;a=0.07+Math.abs(corr)*0.15; }

      ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
      ctx.fillRect(j*cellSize, i*cellSize, cellSize-1, cellSize-1);

      // Cell content
      if(i===j) {
        // Diagonal: agent emoji
        ctx.font=`${Math.round(cellSize*0.45)}px serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(ai.emoji||'·', j*cellSize+cellSize/2, i*cellSize+cellSize/2);
      } else if(Math.abs(corr) > 0.25) {
        // Off-diagonal: show correlation value
        ctx.fillStyle=corr>0?'rgba(0,232,122,0.9)':'rgba(255,61,107,0.9)';
        ctx.font=`bold ${Math.round(cellSize*0.28)}px monospace`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText((corr>=0?'+':'')+corr.toFixed(1), j*cellSize+cellSize/2, i*cellSize+cellSize/2);
      }
    }
  }

  // Right-side labels
  for(let i=0;i<n;i++) {
    ctx.font=`500 ${Math.round(cellSize*0.19)}px monospace`;
    ctx.textAlign='left'; ctx.fillStyle='rgba(136,153,187,.6)';
    const shortName=agents[i].name.split('·')[0].trim().slice(0,7);
    ctx.fillText(shortName, n*cellSize+3, i*cellSize+cellSize/2+3);
  }
  ctx.font='500 9px monospace'; ctx.textAlign='center'; ctx.fillStyle='rgba(136,153,187,.3)';
  ctx.fillText('ACCORD INTER-AGENTS', W/2, H+12);
}

function renderAll() {
  renderHome();
  renderPairPnl();
  // Build static scaffolding once, then patch
  buildAgentCards();
  patchAgentCards();
  buildGovCards();
  patchGovCards();
  renderMarket();
  renderChain();
  // v3.1 new renders
  updateIntelBanner();
  updateStreakBadge();
  renderAgentHeatmap();
  // v7.2 Phase 16b · renderOpenPosSummary retiré : DOM éléments n'existent plus depuis v6.8,
  // la fonction bail immédiatement — nettoyage dead code.
  setTimeout(renderCorrMatrix, 80);   // slight delay — canvas needs layout first
}

// ============================================================
// LMSR THRESHOLD DRAG — yellow marker on action card bar
// ============================================================
let _thrDrag = null;   // { pair, trackEl }

function startThresholdDrag(e, pair) {
  e.preventDefault();
  e.stopPropagation();
  const pairKey = pair.replace('/','_');
  const track   = document.getElementById('ac2_track_'+pairKey);
  if(!track) return;
  _thrDrag = { pair, pairKey, track };
  track.setPointerCapture(e.pointerId);
  track.addEventListener('pointermove',  _onThrDragMove, { passive:false });
  track.addEventListener('pointerup',    _onThrDragEnd);
  track.addEventListener('pointercancel',_onThrDragEnd);
  _applyThresholdFromEvent(e);
}

function _onThrDragMove(e) {
  if(!_thrDrag) return;
  e.preventDefault();
  _applyThresholdFromEvent(e);
}

function _onThrDragEnd(e) {
  if(!_thrDrag) return;
  const track = _thrDrag.track;
  track.removeEventListener('pointermove',  _onThrDragMove);
  track.removeEventListener('pointerup',    _onThrDragEnd);
  track.removeEventListener('pointercancel',_onThrDragEnd);
  _applyThresholdFromEvent(e);
  const { pair } = _thrDrag;
  const ps = S.pairStates[pair];
  showToast('⚡ '+pair+' seuil: '+(ps.threshold*100).toFixed(0)+'% · cycle: '+fmtDur(ps.cycleMax));
  _thrDrag = null;
}

function _applyThresholdFromEvent(e) {
  if(!_thrDrag) return;
  const { pair, pairKey, track } = _thrDrag;
  const rect  = track.getBoundingClientRect();
  const rawX  = (e.clientX - rect.left) / rect.width;    // 0..1
  const clamped = Math.max(0.52, Math.min(0.95, rawX));  // 52–95%

  const ps = S.pairStates[pair];
  if(!ps) return;
  ps.threshold = clamped;

  // Live DOM update (no full re-render needed)
  const thrPct  = clamped * 100;
  const lthrPct = (1 - clamped) * 100;
  const thrL  = document.getElementById('ac2_thr_l_'+pairKey);
  const thrR  = document.getElementById('ac2_thr_r_'+pairKey);
  const zone  = document.getElementById('ac2_zone_'+pairKey);
  const lbl   = document.getElementById('ac2_thrlbl_'+pairKey);
  if(thrL) thrL.style.left  = lthrPct+'%';
  if(thrR) thrR.style.left  = thrPct+'%';
  if(zone) { zone.style.left = lthrPct+'%'; zone.style.width = (thrPct - lthrPct)+'%'; }
  if(lbl)  lbl.textContent  = thrPct.toFixed(0)+'% · '+fmtDur(ps.cycleMax);
}


// ============================================================
// POSITION EDIT — entry price, TP, SL, flip, stake
// ============================================================
let _editModal = null;  // current edit modal state

function openPosEdit(posId) {
  const pos = S.openPositions.find(p => p.id === posId);
  if(!pos) return;
  const cfg = PAIRS[pos.pair];
  const ps  = S.pairStates[pos.pair];
  if(!cfg || !ps) return;

  const fmt = v => cfg.dec>=4 ? parseFloat(v).toFixed(cfg.dec) : Math.floor(v).toLocaleString();
  const fmtInput = v => cfg.dec>=4 ? parseFloat(v).toFixed(cfg.dec) : Math.floor(v);

  // TP/SL distance hints
  const curPrice = ps.price;
  const tpHint   = pos.side==='long'
    ? (curPrice * 1.02).toFixed(cfg.dec>=4?cfg.dec:0)
    : (curPrice * 0.98).toFixed(cfg.dec>=4?cfg.dec:0);
  const slHint   = pos.side==='long'
    ? (curPrice * 0.98).toFixed(cfg.dec>=4?cfg.dec:0)
    : (curPrice * 1.02).toFixed(cfg.dec>=4?cfg.dec:0);

  const modal = document.getElementById('posEditModal');
  if(!modal) return;

  _editModal = { posId, cfg, ps };

  document.getElementById('peModalTitle').textContent  = pos.pair+' — '+pos.side.toUpperCase();
  document.getElementById('peEntryInput').value        = fmtInput(pos.entryPrice);
  document.getElementById('peTpInput').value           = pos.tp  ? fmtInput(pos.tp)  : '';
  document.getElementById('peSlInput').value           = pos.sl  ? fmtInput(pos.sl)  : '';
  document.getElementById('peStakeInput').value        = pos.stakeUsdt;
  document.getElementById('peTpHint').textContent      = '+2%: '+tpHint;
  document.getElementById('peSlHint').textContent      = '−2%: '+slHint;
  document.getElementById('peTpInput').placeholder     = tpHint;
  document.getElementById('peSlInput').placeholder     = slHint;
  document.getElementById('peFlipBtn').textContent     = pos.side==='long' ? '↓ Convertir en SHORT' : '↑ Convertir en LONG';
  document.getElementById('peFlipBtn').style.background= pos.side==='long' ? 'rgba(255,61,107,.12)' : 'rgba(0,232,122,.12)';
  document.getElementById('peFlipBtn').style.color     = pos.side==='long' ? 'var(--down)' : 'var(--up)';

  modal.classList.add('show');
}

function closePosEditModal() {
  const modal = document.getElementById('posEditModal');
  if(modal) modal.classList.remove('show');
  _editModal = null;
}
// Alias for backdrop click
const closeEditModal = closePosEditModal;

function applyPosEdit() {
  if(!_editModal) return;
  const pos = S.openPositions.find(p => p.id === _editModal.posId);
  if(!pos) { closePosEditModal(); return; }

  const entry = parseFloat(document.getElementById('peEntryInput').value);
  const tp    = parseFloat(document.getElementById('peTpInput').value);
  const sl    = parseFloat(document.getElementById('peSlInput').value);
  const stake = parseFloat(document.getElementById('peStakeInput').value);

  let changed = [];

  if(!isNaN(entry) && entry > 0 && entry !== pos.entryPrice) {
    pos.entryPrice = entry;
    changed.push('Entrée→'+entry.toFixed(_editModal.cfg.dec>=4?_editModal.cfg.dec:2));
  }
  if(!isNaN(tp) && tp > 0) {
    pos.tp = tp;
    changed.push('TP→'+tp.toFixed(_editModal.cfg.dec>=4?_editModal.cfg.dec:2));
  } else if(document.getElementById('peTpInput').value === '') {
    pos.tp = null; changed.push('TP effacé');
  }
  if(!isNaN(sl) && sl > 0) {
    pos.sl = sl;
    changed.push('SL→'+sl.toFixed(_editModal.cfg.dec>=4?_editModal.cfg.dec:2));
  } else if(document.getElementById('peSlInput').value === '') {
    pos.sl = null; changed.push('SL effacé');
  }
  if(!isNaN(stake) && stake >= 10 && stake !== pos.stakeUsdt) {
    pos.stakeUsdt = stake;
    changed.push('Mise→$'+stake);
  }

  if(changed.length) {
    showToast('✓ '+pos.pair+': '+changed.join(' · '));
    S.chainLog.push({ icon:'✏️', desc:'Edit '+pos.pair+' '+pos.side.toUpperCase()+': '+changed.join(', '), hash:rndHash(), time:nowStr() });
  }
  closePosEditModal();
}

function flipPosition(posId) {
  const resolvedId = posId || _editModal?.posId;
  const pos = S.openPositions.find(p => p.id === resolvedId);
  if(!pos || pos.auto === true) return;
  const newSide = pos.side === 'long' ? 'short' : 'long';
  const ps = S.pairStates[pos.pair];
  pos.side       = newSide;
  pos.entryPrice = ps ? ps.price : pos.entryPrice;
  pos.entryTs    = Date.now();
  pos.pnl        = 0; pos.pnlUsdt = 0;
  // Swap TP and SL when flipping
  const oldTp = pos.tp; pos.tp = pos.sl; pos.sl = oldTp;
  showToast('🔄 '+pos.pair+' → '+newSide.toUpperCase()+' @'+pos.entryPrice.toFixed(2));
  S.chainLog.push({ icon:'🔄', desc:`Flip ${pos.pair} → ${newSide.toUpperCase()} @${pos.entryPrice.toFixed(2)}`, hash:rndHash(), time:nowStr() });
  closePosEditModal();
}

function setTpSl(posId, type, pct) {
  // Quick TP/SL setter via percentage buttons in modal
  if(!_editModal) return;
  const pos = S.openPositions.find(p=>p.id===_editModal.posId);
  if(!pos) return;
  const ps = S.pairStates[pos.pair];
  if(!ps) return;
  const cur = ps.price;
  const cfg = _editModal.cfg;
  let price;
  if(type==='tp') {
    price = pos.side==='long' ? cur*(1+pct/100) : cur*(1-pct/100);
    const inp = document.getElementById('peTpInput');
    if(inp) inp.value = price.toFixed(cfg.dec>=4?cfg.dec:2);
  } else {
    price = pos.side==='long' ? cur*(1-pct/100) : cur*(1+pct/100);
    const inp = document.getElementById('peSlInput');
    if(inp) inp.value = price.toFixed(cfg.dec>=4?cfg.dec:2);
  }
}

// ============================================================

// ============================================================
// INDICATEURS TECHNIQUES — 10 indicateurs complets
// ============================================================

// ── Utilitaires de base ──────────────────────────────────────
function _closes(candles){ return candles.map(c=>c.c); }
function _highs(candles) { return candles.map(c=>c.h); }
function _lows(candles)  { return candles.map(c=>c.l); }
function _tp(candles)    { return candles.map(c=>(c.h+c.l+c.c)/3); } // typical price
function _mean(arr)      { return arr.reduce((a,b)=>a+b,0)/arr.length; }

// ── 1. MM — Moyenne Mobile Simple ───────────────────────────
function calcSMA(closes, period) {
  if(closes.length < period) return null;
  return _mean(closes.slice(-period));
}

// ── 2. MME — Moyenne Mobile Exponentielle ───────────────────
function calcEMA(closes, period) {
  if(closes.length < period) return null;
  const k = 2/(period+1);
  let ema = _mean(closes.slice(0,period));
  for(let i=period; i<closes.length; i++) ema = closes[i]*k + ema*(1-k);
  return ema;
}

// Returns full EMA series (array, same length as closes from period onward)
function calcEMASeries(closes, period) {
  if(closes.length < period) return [];
  const k = 2/(period+1);
  const out = [_mean(closes.slice(0,period))];
  for(let i=period; i<closes.length; i++)
    out.push(closes[i]*k + out[out.length-1]*(1-k));
  return out;
}

// ── 3. Oscillateur Stochastique (%K / %D) ───────────────────
function calcStochastic(candles, kPeriod=14, dPeriod=3, smoothK=3) {
  if(candles.length < kPeriod) return null;
  const rawK = [];
  for(let i=kPeriod-1; i<candles.length; i++) {
    const slice = candles.slice(i-kPeriod+1, i+1);
    const hiH   = Math.max(...slice.map(c=>c.h));
    const loL   = Math.min(...slice.map(c=>c.l));
    rawK.push(hiH===loL ? 50 : ((candles[i].c-loL)/(hiH-loL))*100);
  }
  // Smooth %K
  const smK = rawK.length >= smoothK
    ? rawK.slice(-Math.max(smoothK, rawK.length - 30 + smoothK))
    : rawK;
  const kVal = _mean(smK.slice(-smoothK));
  // %D = SMA(smoothK) of %K
  const dSrc = rawK.slice(-dPeriod);
  const dVal = _mean(dSrc);
  const prev = rawK.length >= 2 ? rawK[rawK.length-2] : kVal;
  return { k:kVal, d:dVal, prev, cross: (kVal>dVal && prev<=dVal) ? 'bull' : (kVal<dVal && prev>=dVal) ? 'bear' : null };
}

// ── 4. MACD (12/26/9) ────────────────────────────────────────
function calcMACD(candles) {
  if(candles.length < 26) return null;
  const closes = _closes(candles);
  const ema12  = calcEMA(closes, 12);
  const ema26  = calcEMA(closes, 26);
  if(!ema12 || !ema26) return null;
  const macdVal = ema12 - ema26;
  // Signal: EMA(9) of rolling MACD values
  const macdSeries = [];
  for(let i=26; i<=closes.length; i++) {
    const e12 = calcEMA(closes.slice(0,i), 12);
    const e26 = calcEMA(closes.slice(0,i), 26);
    if(e12 && e26) macdSeries.push(e12-e26);
  }
  const signalVal = calcEMA(macdSeries, Math.min(9, macdSeries.length));
  const hist      = macdVal - (signalVal||0);
  const prevHist  = macdSeries.length >= 2 ? macdSeries[macdSeries.length-2] - (signalVal||0) : hist;
  return {
    macd:    macdVal,
    signal:  signalVal||0,
    hist,
    prevHist,
    cross:   (hist>0 && prevHist<=0) ? 'bull' : (hist<0 && prevHist>=0) ? 'bear' : null
  };
}

// ── 5. Bandes de Bollinger ───────────────────────────────────
function calcBollinger(candles, period=20, mult=2) {
  const n = Math.min(period, candles.length);
  if(n < 5) return null;
  const closes = candles.slice(-n).map(c=>c.c);
  const mean   = _mean(closes);
  const std    = Math.sqrt(_mean(closes.map(c=>(c-mean)**2)));
  const cur    = closes[closes.length-1];
  const upper  = mean + mult*std;
  const lower  = mean - mult*std;
  const bw     = std > 0 ? (upper-lower)/mean : 0;     // bandwidth %
  const pct    = std > 0 ? (cur-lower)/(upper-lower) : 0.5;
  // Squeeze: bandwidth in lower 20% of recent range → compression
  const squeeze = bw < 0.02;
  return { upper, lower, middle:mean, std, pct, cur, bw, squeeze };
}

// ── 6. RSI (14) avec divergence ─────────────────────────────
function calcRSI(candles, period=14) {
  if(candles.length < period+2) return null;
  const closes = _closes(candles);
  // Wilder smoothing (proper RSI)
  let avgGain=0, avgLoss=0;
  for(let i=1; i<=period; i++){
    const d=closes[i]-closes[i-1];
    if(d>0) avgGain+=d; else avgLoss+=Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  for(let i=period+1; i<closes.length; i++){
    const d=closes[i]-closes[i-1];
    avgGain = (avgGain*(period-1)+(d>0?d:0))/period;
    avgLoss = (avgLoss*(period-1)+(d<0?Math.abs(d):0))/period;
  }
  const rsi = avgLoss===0 ? 100 : 100-(100/(1+avgGain/avgLoss));

  // Divergence: price new high but RSI lower high (bearish div) or inverse
  let divergence = null;
  if(candles.length >= period+6) {
    const recentC = closes.slice(-6);
    const priceUp = recentC[5] > recentC[0];
    // approx prev RSI using slice
    const prevCandles = candles.slice(0,-3);
    const prevRsiRaw  = calcRSI(prevCandles, period);
    if(prevRsiRaw !== null) {
      if(priceUp && rsi < prevRsiRaw - 5)    divergence = 'bear'; // bearish div
      if(!priceUp && rsi > prevRsiRaw + 5)   divergence = 'bull'; // bullish div
    }
  }
  return { value:rsi, divergence };
}

// ── 7. Fibonacci Retracements ────────────────────────────────
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
function calcFibonacci(candles) {
  if(candles.length < 5) return null;
  const n      = Math.min(50, candles.length);
  const recent = candles.slice(-n);
  const swing_h = Math.max(...recent.map(c=>c.h));
  const swing_l = Math.min(...recent.map(c=>c.l));
  const range   = swing_h - swing_l;
  const cur     = recent[recent.length-1].c;
  const trend   = recent[recent.length-1].c > recent[0].c ? 'up' : 'down';
  // Retracement levels from swing high (down-trend correction) or swing low (up-trend)
  const levels = FIB_LEVELS.map(f => ({
    ratio: f,
    price: trend==='up' ? swing_h - f*range : swing_l + f*range,
    label: (f*100).toFixed(1)+'%'
  }));
  // Find nearest support/resistance from fib levels
  const dists = levels.map(l => ({ ...l, dist: Math.abs(cur - l.price)/cur*100 }));
  const nearest = dists.reduce((a,b)=>a.dist<b.dist?a:b);
  const below   = dists.filter(l=>l.price<=cur).sort((a,b)=>b.price-a.price)[0];
  const above   = dists.filter(l=>l.price> cur).sort((a,b)=>a.price-b.price)[0];
  return { levels, nearest, below, above, swing_h, swing_l, trend, cur };
}

// ── 8. Ichimoku Cloud ────────────────────────────────────────
function calcIchimoku(candles) {
  const n = candles.length;
  if(n < 52) return null;
  const hi = _highs(candles), lo = _lows(candles), cl = _closes(candles);

  const midN = (arr, i, p) => {
    const sl = arr.slice(Math.max(0,i-p+1), i+1);
    return (Math.max(...sl)+Math.min(...sl))/2;
  };

  // Current (last bar) values
  const i = n-1;
  const tenkan  = midN(candles.map(c=>c.h), i, 9)===midN(candles.map(c=>c.l), i, 9)
    ? (Math.max(...candles.slice(-9).map(c=>c.h))+Math.min(...candles.slice(-9).map(c=>c.l)))/2
    : (Math.max(...candles.slice(-9).map(c=>c.h))+Math.min(...candles.slice(-9).map(c=>c.l)))/2;
  const kijun   = (Math.max(...candles.slice(-26).map(c=>c.h))+Math.min(...candles.slice(-26).map(c=>c.l)))/2;
  const senkouA = (tenkan+kijun)/2;                      // displaced +26
  // Senkou B (52-period midline, displaced +26)
  const senkouB = (Math.max(...candles.slice(-52).map(c=>c.h))+Math.min(...candles.slice(-52).map(c=>c.l)))/2;
  const chikou  = cl[i];   // current close, displaced -26

  // Use 26-bar-ago cloud as current cloud (approximation without forward shift)
  const cloudRef  = candles.slice(-52, -26);
  const cloudA26  = cloudRef.length >= 2
    ? ((Math.max(...cloudRef.map(c=>c.h))+Math.min(...cloudRef.map(c=>c.l)))/2
      + (Math.max(...candles.slice(-78,-52).map(c=>c.h))||0+Math.min(...candles.slice(-78,-52).map(c=>c.l))||0)/2) / 2
    : senkouA;
  const cloudB26  = cloudRef.length >= 2
    ? (Math.max(...cloudRef.slice(-52).map(c=>c.h))+Math.min(...cloudRef.slice(-52).map(c=>c.l)))/2
    : senkouB;

  const cur    = cl[i];
  const cloudTop    = Math.max(cloudA26, cloudB26);
  const cloudBottom = Math.min(cloudA26, cloudB26);
  const aboveCloud  = cur > cloudTop;
  const belowCloud  = cur < cloudBottom;
  const tkCross     = tenkan > kijun ? 'bull' : tenkan < kijun ? 'bear' : null;

  return { tenkan, kijun, senkouA, senkouB, chikou,
           cloudTop, cloudBottom, aboveCloud, belowCloud, tkCross, cur };
}

// ── 9. Écart-type (Volatilité σ) ────────────────────────────
function calcStdDev(candles, period=20) {
  const n = Math.min(period, candles.length);
  if(n < 3) return null;
  const closes = candles.slice(-n).map(c=>c.c);
  const mu     = _mean(closes);
  const sigma  = Math.sqrt(_mean(closes.map(c=>(c-mu)**2)));
  const cv     = mu > 0 ? sigma/mu : 0;  // coefficient of variation
  const atr    = _mean(candles.slice(-n).map((c,i,arr)=>{
    if(i===0) return c.h-c.l;
    const prev = arr[i-1];
    return Math.max(c.h-c.l, Math.abs(c.h-prev.c), Math.abs(c.l-prev.c));
  }));
  // Annualized vol approximation (daily candle assumption)
  const annualVol = cv * Math.sqrt(252) * 100;
  const regime    = cv < 0.01 ? 'faible' : cv < 0.025 ? 'normal' : 'élevé';
  return { sigma, cv, atr, annualVol, regime };
}

// ── 10. ADX — Indice du Mouvement Directionnel ──────────────
function calcADX(candles, period=14) {
  if(candles.length < period+1) return null;
  const n = candles.length;

  // True Range + DM arrays
  const tr=[], pdm=[], ndm=[];
  for(let i=1; i<n; i++){
    const cur=candles[i], prev=candles[i-1];
    tr.push(Math.max(cur.h-cur.l, Math.abs(cur.h-prev.c), Math.abs(cur.l-prev.c)));
    const upMove   = cur.h-prev.h;
    const downMove = prev.l-cur.l;
    pdm.push(upMove>downMove && upMove>0 ? upMove : 0);
    ndm.push(downMove>upMove && downMove>0 ? downMove : 0);
  }

  // Wilder smoothing
  const smooth = (arr, p) => {
    let s = arr.slice(0,p).reduce((a,b)=>a+b,0);
    const out = [s];
    for(let i=p; i<arr.length; i++){ s = s - s/p + arr[i]; out.push(s); }
    return out;
  };

  const sTR  = smooth(tr,  period);
  const sPDM = smooth(pdm, period);
  const sNDM = smooth(ndm, period);

  const diP  = sTR.map((t,i)=>t>0?sPDM[i]/t*100:0);
  const diN  = sTR.map((t,i)=>t>0?sNDM[i]/t*100:0);
  const dx   = diP.map((p,i)=>{
    const sum=Math.abs(p+diN[i]);
    return sum>0?Math.abs(p-diN[i])/sum*100:0;
  });
  // ADX = smoothed DX
  const adxSeries = smooth(dx, period);
  const adx  = adxSeries[adxSeries.length-1];
  const diPl = diP[diP.length-1];
  const diNl = diN[diN.length-1];
  const trend = adx > 25 ? (diPl > diNl ? 'bull' : 'bear') : 'ranging';
  const strength = adx > 50 ? 'très fort' : adx > 25 ? 'fort' : adx > 20 ? 'modéré' : 'faible';
  return { adx, diPlus:diPl, diMinus:diNl, trend, strength };
}

// ── Agrégation complète des signaux techniques ───────────────
// Memoization cache: recompute AT signals at most every 5 ticks
const _techCache = {};
function getTechSignals(pair) {
  const ps = S.pairStates[pair];
  if(!ps || !ps.candles || ps.candles.length < 5) return null;
  const ckey = pair + '_' + ps.candles.length + '_' + ps.price.toFixed(2);
  if(_techCache[pair] && _techCache[pair].key === ckey) return _techCache[pair].val;
  const candles = ps.candles;
  const closes  = _closes(candles);
  const highs   = _highs(candles);
  const lows    = _lows(candles);

  // Compute all 10 indicators
  const sma10   = calcSMA(closes, Math.min(10, closes.length));
  const sma20   = calcSMA(closes, Math.min(20, closes.length));
  const sma50   = calcSMA(closes, Math.min(50, closes.length));
  const ema9    = calcEMA(closes, Math.min(9,  closes.length));
  const ema21   = calcEMA(closes, Math.min(21, closes.length));
  const ema50   = calcEMA(closes, Math.min(50, closes.length));
  const stoch   = calcStochastic(candles, Math.min(14, candles.length-1));
  const macd    = calcMACD(candles);
  const boll    = calcBollinger(candles);
  const rsiData = calcRSI(candles, Math.min(14, candles.length-2));
  const fib     = calcFibonacci(candles);
  const ichi    = candles.length >= 52 ? calcIchimoku(candles) : null;
  const stddev  = calcStdDev(candles);
  const adx     = calcADX(candles, Math.min(14, candles.length-2));

  const cur = ps.price;

  // Build signal objects with weight for each indicator
  const signals = {};

  // 1. MM
  if(sma10 && sma20) {
    signals.mm = {
      signal: sma10>sma20 ? 'bull' : 'bear',
      label:  sma10>sma20 ? 'SMA10>SMA20 ↑' : 'SMA10<SMA20 ↓',
      detail: `SMA10:${sma10.toFixed(2)} SMA20:${sma20.toFixed(2)}${sma50?` SMA50:${sma50.toFixed(2)}`:''}`,
      weight: 1
    };
  }

  // 2. MME
  if(ema9 && ema21) {
    signals.mme = {
      signal: ema9>ema21 ? 'bull' : 'bear',
      label:  ema9>ema21 ? 'EMA9>EMA21 ↑' : 'EMA9<EMA21 ↓',
      detail: `EMA9:${ema9.toFixed(2)} EMA21:${ema21.toFixed(2)}${ema50?` EMA50:${ema50.toFixed(2)}`:''}`,
      weight: 1.2
    };
  }

  // 3. Stochastique
  if(stoch) {
    const overbought = stoch.k > 80;
    const oversold   = stoch.k < 20;
    signals.stoch = {
      signal: oversold?'bull':overbought?'bear': stoch.cross==='bull'?'bull':stoch.cross==='bear'?'bear':'neut',
      label:  oversold?`Survendu %K:${stoch.k.toFixed(0)}`:overbought?`Suracheté %K:${stoch.k.toFixed(0)}`:stoch.cross?`Croisement ${stoch.cross==='bull'?'↑':'↓'}`:`%K:${stoch.k.toFixed(0)} %D:${stoch.d.toFixed(0)}`,
      detail: `%K:${stoch.k.toFixed(1)} %D:${stoch.d.toFixed(1)}${stoch.cross?' '+stoch.cross:''}`,
      weight: 1.2
    };
  }

  // 4. MACD
  if(macd) {
    signals.macd = {
      signal: macd.hist>0?'bull':'bear',
      label:  macd.cross?`Croix MACD ${macd.cross==='bull'?'↑':'↓'}`:macd.hist>0?'MACD ↑':'MACD ↓',
      detail: `MACD:${macd.macd.toFixed(3)} Sig:${macd.signal.toFixed(3)} Hist:${macd.hist.toFixed(3)}`,
      weight: 1.3
    };
  }

  // 5. Bollinger
  if(boll) {
    signals.boll = {
      signal: boll.pct>0.85?'bear':boll.pct<0.15?'bull':'neut',
      label:  boll.squeeze?'⚡ Squeeze':boll.pct>0.85?'Bande sup. ↓':boll.pct<0.15?'Bande inf. ↑':'Milieu',
      detail: `%B:${(boll.pct*100).toFixed(0)}% σ:${boll.std.toFixed(2)} BW:${(boll.bw*100).toFixed(1)}%`,
      weight: 1
    };
  }

  // 6. RSI
  if(rsiData) {
    const rsi = rsiData.value;
    signals.rsi = {
      signal: rsi<30?'bull':rsi>70?'bear': rsiData.divergence==='bull'?'bull':rsiData.divergence==='bear'?'bear':'neut',
      label:  rsi<30?`Survendu ${rsi.toFixed(0)}`:rsi>70?`Suracheté ${rsi.toFixed(0)}`:rsiData.divergence?`Div. ${rsiData.divergence==='bull'?'haussière':'baissière'}`:`RSI:${rsi.toFixed(0)}`,
      detail: `RSI:${rsi.toFixed(1)}${rsiData.divergence?' div:'+rsiData.divergence:''}`,
      weight: 1.3
    };
  }

  // 7. Fibonacci
  if(fib) {
    const near = fib.nearest;
    signals.fib = {
      signal: near.dist<1.0?(fib.trend==='up'&&near.ratio>0.5?'bull':fib.trend==='down'&&near.ratio<0.5?'bear':'neut'):'neut',
      label:  near.dist<1.0?`Fib ${near.label} proche`:`Fib ${fib.trend==='up'?'↑':'↓'} swing`,
      detail: `Niv:${near.label}@${near.price.toFixed(2)} (${near.dist.toFixed(1)}% dist) ${fib.trend}`,
      weight: 0.8
    };
  }

  // 8. Ichimoku
  if(ichi) {
    signals.ichi = {
      signal: ichi.aboveCloud?'bull':ichi.belowCloud?'bear':'neut',
      label:  ichi.aboveCloud?'Au-dessus nuage ↑':ichi.belowCloud?'Sous nuage ↓':'Dans le nuage',
      detail: `T:${ichi.tenkan.toFixed(2)} K:${ichi.kijun.toFixed(2)} Cross:${ichi.tkCross||'none'}`,
      weight: 1.2
    };
  }

  // 9. Écart-type
  if(stddev) {
    signals.sigma = {
      signal: stddev.regime==='faible'?'neut':stddev.cv>0.03?'bear':'neut',
      label:  `Vol. ${stddev.regime} (σ:${stddev.sigma.toFixed(2)})`,
      detail: `ATR:${stddev.atr.toFixed(2)} CV:${(stddev.cv*100).toFixed(1)}% AnnVol:${stddev.annualVol.toFixed(0)}%`,
      weight: 0.7
    };
  }

  // 10. ADX
  if(adx) {
    signals.adx = {
      signal: adx.trend==='bull'?'bull':adx.trend==='bear'?'bear':'neut',
      label:  adx.trend==='ranging'?`ADX:${adx.adx.toFixed(0)} range`:adx.trend==='bull'?`ADX:${adx.adx.toFixed(0)} ↑ fort`:`ADX:${adx.adx.toFixed(0)} ↓ fort`,
      detail: `ADX:${adx.adx.toFixed(1)} DI+:${adx.diPlus.toFixed(1)} DI-:${adx.diMinus.toFixed(1)} [${adx.strength}]`,
      weight: 1.1
    };
  }

  // ── Score pondéré ──────────────────────────────────────────
  let scoreSum=0, weightSum=0;
  Object.values(signals).forEach(s => {
    if(!s) return;
    scoreSum  += (s.signal==='bull'?1:s.signal==='bear'?-1:0) * (s.weight||1);
    weightSum += s.weight||1;
  });
  const atScore = weightSum>0 ? scoreSum/weightSum : 0;

  // ── Indicateurs bruts accessibles par le bot ──────────────
  const raw = { sma10, sma20, sma50, ema9, ema21, ema50, stoch, macd, boll,
                rsi:rsiData, fib, ichi, stddev, adx };

  const result = { signals, atScore, raw };
  _techCache[pair] = { key: pair + '_' + ps.candles.length + '_' + ps.price.toFixed(2), val: result };
  return result;
}

const _fundCache = {};
function getFundamentalSignals(pair) {
  const ps = S.pairStates[pair];
  if(!ps) return null;
  const tick5 = Math.floor(S.cycle / 5);
  if(_fundCache[pair] && _fundCache[pair].tick === tick5) return _fundCache[pair].val;

  const agentById = id => S.agents.find(a=>a.id===id)||{score:0,conf:0.5};
  const macro  = agentById('macro_v1');
  const sent   = agentById('sentiment_v2');
  const geo    = agentById('geopolitic_v1');
  const sec    = agentById('security_v1');
  const nlp    = agentById('nlp_v1');
  const fund   = agentById('fundamental_v1');
  const vol    = agentById('volume_v1');
  const corr   = agentById('corr_v1');
  const vola   = agentById('volatility_v1');
  const onchain= agentById('onchain_v1');

  // ── Prix actif et tendances simulées (seront remplacées par vraies APIs) ──
  const cur     = ps.price;
  const ch24    = ps.pnl24h || 0;
  const volAvg  = ps.candles && ps.candles.length>1
    ? ps.candles.slice(-20).reduce((s,c)=>s+c.v,0)/20 : 1;

  
  // Dans une vraie intégration : fetch FRED, Bloomberg, Alpha Vantage, etc.
  // Ici chaque indicateur est calculé/estimé à partir des données disponibles

  // 1. EPS — Bénéfice par Action (crypto: proxy via market cap / supply)
  const epsScore = ch24 > 1 ? 0.5 : ch24 < -1 ? -0.5 : ch24 * 0.4;

  // 2. P/E — Ratio Cours/Bénéfice (crypto: NVT ratio proxy)
  const peScore  = volAvg > 0 ? Math.max(-1, Math.min(1, (cur / volAvg - 1) * 0.3)) : 0;

  // 3. Taux banques centrales (macro agent — composante taux)
  const rateScore = macro.score * 0.8;

  // 4. CPI / Inflation (macro agent — composante inflation)
  const cpiScore  = macro.score * -0.6;  // hausse CPI → bearish crypto

  // 5. NFP — Rapport Emploi (macro agent — proxy emploi US)
  const nfpScore  = macro.score * 0.5;

  // 6. EV/EBITDA — Valorisation relative (prix/volume proxy)
  const evScore   = ch24 > 0 ? Math.min(1, ch24 * 0.15) : Math.max(-1, ch24 * 0.15);

  // 7. Marge bénéficiaire nette (volatilité spread proxy)
  const marginScore = ps.candles && ps.candles.length > 0
    ? Math.max(-1, Math.min(1, (ps.candles[ps.candles.length-1].c - ps.candles[ps.candles.length-1].o)
        / (ps.candles[ps.candles.length-1].c || 1) * 10)) : 0;

  // 8. Ratio Endettement Debt/Equity (sécurité on-chain proxy)
  const debtScore = sec.score * 0.7;

  // 9. Sentiment NLP (agent sentiment enrichi)
  const nlpScore  = sent.score;

  // 10. Croissance CA (volume 24h vs moyenne 7j)
  const recentVol  = ps.candles ? ps.candles.slice(-4).reduce((s,c)=>s+c.v,0)/4 : 1;
  const avgVol7    = ps.candles ? ps.candles.slice(-28).reduce((s,c)=>s+c.v,0)/28 : 1;
  const growthScore = avgVol7 > 0 ? Math.max(-1, Math.min(1, (recentVol/avgVol7-1)*2)) : 0;

  // ── LMSR + corrélation BTC ─────────────────────────────────────────────
  // v6.5: LMSR score enriched with live agent consensus (not just qYes/qNo ratio)
  const _totalFit2 = S.agents.reduce((s,a) => s+(a.fitness||1), 0) || 1;
  const _agCons2   = S.agents.reduce((s,a) => {
    const sig = Math.abs(a.score||0) > 0.005 ? (a.score||0) : 0;  // v6.9: threshold réduit
    return s + sig * (a.fitness||1) / _totalFit2;
  }, 0);
  const lmsrRaw2   = (lmsrP(ps)-0.5)*2;
  const lmsrScore  = (lmsrRaw2 * 0.5 + _agCons2 * 0.5);  // blend LMSR + agents
  const btcPs     = S.pairStates['BTC/USDT'];
  const btcTrend  = (btcPs && pair!=='BTC/USDT') ? (btcPs.pnl24h>0?1:-1)*0.6 : 0;

  // ── Score fondamental pondéré — 10 indicateurs + 8 agents spécialisés ──
  const fundScore = Math.max(-1, Math.min(1,
    epsScore    * 0.05 +   // 1. EPS
    peScore     * 0.04 +   // 2. P/E
    rateScore   * 0.07 +   // 3. Taux BC (macro agent)
    cpiScore    * 0.06 +   // 4. CPI (macro agent)
    nfpScore    * 0.04 +   // 5. NFP (macro agent)
    evScore     * 0.04 +   // 6. EV/EBITDA (fundamental agent)
    marginScore * 0.04 +   // 7. Marge nette
    debtScore   * 0.04 +   // 8. Debt/Equity (security agent)
    nlpScore    * 0.09 +   // 9. NLP sentiment (nlp agent)
    growthScore * 0.05 +   // 10. Croissance CA (volume agent)
    lmsrScore   * 0.14 +   // LMSR consensus interne
    sent.score  * 0.07 +   // Sentiment social (sentiment agent)
    geo.score   * 0.05 +   // Géopolitique
    onchain.score * 0.05 + // On-Chain analytics
    sec.score   * 0.03 +   // Sécurité
    vol.score   * 0.04 +   // Volume/Flux
    corr.score  * 0.04 +   // Corrélation cross-asset
    vola.score * -0.03 +   // Volatilité inverse (haute vol → prudence)
    btcTrend    * 0.06     // Corrélation BTC
  ));

  const result = {
    // 10 indicateurs fondamentaux officiels
    eps:     { score:epsScore,       conf:0.65,         label:'EPS',             detail:'Bénéfice par Action · proxy mkt cap/supply' },
    pe:      { score:peScore,        conf:0.60,         label:'P/E Ratio',       detail:'NVT ratio (proxy crypto)' },
    rates:   { score:rateScore,      conf:macro.conf,   label:'Taux BC',         detail:'Fed / BCE · taux directeurs' },
    cpi:     { score:cpiScore,       conf:macro.conf,   label:'CPI / Inflation', detail:'Inflation → crypto hedge' },
    nfp:     { score:nfpScore,       conf:macro.conf,   label:'NFP Emploi',      detail:'Rapport emploi US (NFP)' },
    ev:      { score:evScore,        conf:fund.conf,    label:'EV/EBITDA',       detail:'Valorisation relative · '+fund.name },
    margin:  { score:marginScore,    conf:0.55,         label:'Marge Nette',     detail:'Rentabilité intrinsèque spreads' },
    debt:    { score:debtScore,      conf:sec.conf,     label:'Debt/Equity',     detail:'Ratio endettement · '+sec.name },
    nlp:     { score:nlpScore,       conf:nlp.conf,     label:'Sentiment NLP',   detail:'Analyse NLP news & earnings · '+nlp.name },
    growth:  { score:growthScore,    conf:vol.conf,     label:'Croissance CA',   detail:'Volume 24h vs moy. 7j · '+vol.name },
    // Facteurs contextuels agents
    lmsr:    { score:lmsrScore,      conf:1.0,          label:'LMSR marché',     detail:'Consensus agents interne ×'+S.agents.length },
    sentiment:{ score:sent.score,   conf:sent.conf,    label:'Sentiment Social', detail:'Twitter/Reddit · '+sent.name },
    geo:     { score:geo.score,      conf:geo.conf,     label:'Géopolitique',    detail:'Risques macros globaux · '+geo.name },
    onchain: { score:onchain.score,  conf:onchain.conf, label:'On-Chain',        detail:'Analytics blockchain · '+onchain.name },
    security:{ score:sec.score,      conf:sec.conf,     label:'Sécurité',        detail:'Risques protocoles · '+sec.name },
    volume:  { score:vol.score,      conf:vol.conf,     label:'Volume·Flux',     detail:'OBV/OrderBook · '+vol.name },
    corr:    { score:btcTrend,       conf:0.70,         label:'Correl. BTC',     detail:pair==='BTC/USDT'?'Référence':'+60% suivi BTC' },
    // Score global
    fundScore
  };
  _fundCache[pair] = { tick: Math.floor(S.cycle / 5), val: result };
  return result;
}

// Single-pair composite signal
function getCompositeSignal(pair) {
  const tech = getTechSignals(pair);
  const fund = getFundamentalSignals(pair);
  if(!tech||!fund) return null;
  const composite = Math.max(-1, Math.min(1, tech.atScore*0.60 + fund.fundScore*0.40));
  const pct       = Math.round((composite+1)*50);
  const signal    = composite > 0.2 ? 'LONG' : composite < -0.2 ? 'SHORT' : 'NEUTRE';
  const col       = composite > 0.2 ? 'var(--up)' : composite < -0.2 ? 'var(--down)' : 'var(--gold)';
  const strength  = Math.abs(composite)>0.6?'FORT':Math.abs(composite)>0.3?'MODÉRÉ':'FAIBLE';
  return { composite, pct, signal, col, strength, tech, fund };
}

// All-pairs composite signals map — used by bot + composite panel
function getAllCompositeSignals() {
  const map = {};
  Object.keys(PAIRS).forEach(pair => {
    map[pair] = getCompositeSignal(pair);
  });
  return map;
}

function renderTechnicalPanel() {
  const el = document.getElementById('technicalPanel'); if(!el) return;
  const tech = getTechSignals(S.activePair);
  if(!tech){ el.innerHTML='<div style="color:var(--t3);font-size:11px;padding:12px;">Données en cours…</div>'; return; }
  const { signals, atScore, raw } = tech;
  const atCol = atScore>0.2?'var(--up)':atScore<-0.2?'var(--down)':'var(--gold)';
  const atLbl = atScore>0.2?'↑ HAUSSIER':atScore<-0.2?'↓ BAISSIER':'→ NEUTRE';
  const atPct = ((atScore+1)*50).toFixed(0);

  const rows = [
    { icon:'📉', name:'1. Moyenne Mobile (MM)',                   sig: signals.mm    },
    { icon:'📈', name:'2. Moy. Mobile Exponentielle (MME)',       sig: signals.mme   },
    { icon:'🎲', name:'3. Oscillateur Stochastique (%K/%D)',      sig: signals.stoch },
    { icon:'⚡', name:'4. MACD (Conv./Div. MM)',                   sig: signals.macd  },
    { icon:'🎯', name:'5. Bandes de Bollinger',                   sig: signals.boll  },
    { icon:'💪', name:'6. RSI — Force Relative',                  sig: signals.rsi   },
    { icon:'🌀', name:'7. Retracements de Fibonacci',             sig: signals.fib   },
    { icon:'☁️', name:'8. Nuage d\'Ichimoku',                     sig: signals.ichi  },
    { icon:'📐', name:'9. Écart-type (σ / ATR)',                  sig: signals.sigma },
    { icon:'📡', name:'10. ADX — Mouvement Directionnel Moyen',   sig: signals.adx   },
  ].filter(r => r.sig);

  el.innerHTML = `<div class="signal-card">
    <div class="signal-card-header">
      <div class="signal-card-title">Analyse Technique — ${S.activePair}</div>
      <div class="signal-card-val" style="color:${atCol}">${atLbl}</div>
    </div>
    <div style="padding:6px 14px 4px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:8px;color:var(--t3);">Score pondéré — 10 indicateurs techniques</span>
        <span style="font-size:9px;font-weight:700;color:${atCol};">${atScore>=0?'+':''}${(atScore*100).toFixed(0)}%</span>
      </div>
      <div class="composite-bar-track">
        <div class="composite-bar-fill" style="width:${atPct}%;background:${atCol};box-shadow:0 0 6px ${atCol}44;"></div>
        <div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:rgba(255,255,255,.2);"></div>
      </div>
    </div>
    ${rows.map(r => {
      const cls  = r.sig.signal==='bull'?'badge-bull':r.sig.signal==='bear'?'badge-bear':'badge-neut';
      const wBar = `<div style="height:1px;background:var(--s3);margin-top:2px;width:44px;"><div style="height:100%;width:${Math.min(100,(r.sig.weight||1)/1.5*100).toFixed(0)}%;background:${r.sig.signal==='bull'?'var(--up)':r.sig.signal==='bear'?'var(--down)':'var(--gold)'};"></div></div>`;
      return `<div class="signal-row-item">
        <div>
          <div class="signal-row-label">${r.icon} ${r.name}</div>
          <div class="signal-row-detail">${r.sig.detail||''}</div>
          ${wBar}
        </div>
        <span class="signal-row-badge ${cls}">${r.sig.label}</span>
      </div>`;
    }).join('')}
  </div>`;
}

function renderFundamentalPanel() {
  const el = document.getElementById('fundamentalPanel'); if(!el) return;
  const fund = getFundamentalSignals(S.activePair); if(!fund) return;
  const fundCol = fund.fundScore>0.2?'var(--up)':fund.fundScore<-0.2?'var(--down)':'var(--gold)';
  const fundLbl = fund.fundScore>0.2?'↑ POSITIF':fund.fundScore<-0.2?'↓ NÉGATIF':'→ NEUTRE';
  const fundPct = ((fund.fundScore+1)*50).toFixed(0);

  // 10 indicateurs fondamentaux officiels + 4 contextuels
  const officialItems = [
    {icon:'💹', key:'eps'},
    {icon:'📊', key:'pe'},
    {icon:'🏦', key:'rates'},
    {icon:'🌡️', key:'cpi'},
    {icon:'👷', key:'nfp'},
    {icon:'🏢', key:'ev'},
    {icon:'📈', key:'margin'},
    {icon:'⚖️', key:'debt'},
    {icon:'🧠', key:'nlp'},
    {icon:'📦', key:'growth'},
  ];
  const contextItems = [
    {icon:'📡', key:'lmsr'},
    {icon:'🌍', key:'geo'},
    {icon:'🔒', key:'security'},
    {icon:'🔗', key:'corr'},
  ];

  function renderItem(icon, d) {
    if(!d) return '';
    const cls  = d.score>0.1?'badge-bull':d.score<-0.1?'badge-bear':'badge-neut';
    const lbl  = d.score>0.1?`↑ ${(d.score*100).toFixed(0)}%`:d.score<-0.1?`↓ ${(Math.abs(d.score)*100).toFixed(0)}%`:'→ 0%';
    const col  = d.score>=0?'var(--up)':'var(--down)';
    return `<div class="signal-row-item">
      <div style="flex:1;min-width:0;">
        <div class="signal-row-label">${icon} ${d.label}</div>
        <div class="signal-row-detail">${d.detail}</div>
        <div style="height:2px;background:var(--s3);border-radius:2px;margin-top:3px;width:55px;">
          <div style="height:100%;width:${(d.conf*100).toFixed(0)}%;background:${col};border-radius:2px;transition:width .4s;"></div>
        </div>
      </div>
      <span class="signal-row-badge ${cls}">${lbl}</span>
    </div>`;
  }

  el.innerHTML = `<div class="signal-card">
    <div class="signal-card-header">
      <div class="signal-card-title">Analyse Fondamentale — ${S.activePair}</div>
      <div class="signal-card-val" style="color:${fundCol}">${fundLbl}</div>
    </div>
    <div style="padding:6px 14px 4px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="font-size:8px;color:var(--t3);">Score pondéré (14 facteurs)</span>
        <span style="font-size:9px;font-weight:700;color:${fundCol};">${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</span>
      </div>
      <div class="composite-bar-track">
        <div class="composite-bar-fill" style="width:${fundPct}%;background:${fundCol};box-shadow:0 0 6px ${fundCol}44;"></div>
        <div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:rgba(255,255,255,.2);"></div>
      </div>
    </div>
    <div style="padding:4px 14px 2px;">
      <div style="font-size:7px;font-weight:700;color:var(--ice);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;padding-top:4px;border-top:1px solid var(--border);">
        📋 10 Indicateurs Fondamentaux
      </div>
      ${officialItems.map(({icon,key}) => renderItem(icon, fund[key])).join('')}
    </div>
    <div style="padding:4px 14px 8px;">
      <div style="font-size:7px;font-weight:700;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;padding-top:6px;border-top:1px solid var(--border);">
        🧩 Contexte Marché
      </div>
      ${contextItems.map(({icon,key}) => renderItem(icon, fund[key])).join('')}
    </div>
  </div>`;
}

// Cache composite signals across pages
let _compSigsCache = null, _compSigsTick = -1;
function getCachedCompositeSignals() {
  if(_compSigsTick === S.cycle) return _compSigsCache;
  _compSigsCache = getAllCompositeSignals();
  _compSigsTick = S.cycle;
  return _compSigsCache;
}

function renderCompositePanel() {
  const el = document.getElementById('compositePanel');
  if(!el) return;

  const allSigs = getCachedCompositeSignals();
  const pairs   = Object.keys(PAIRS);

  // ── Inject composite into LMSR + nudge agents for ALL pairs ──
  pairs.forEach(pair => {
    const comp = allSigs[pair];
    const ps   = S.pairStates[pair];
    if(!comp || !ps) return;

    // Target probability from composite: map [-1,+1] → [0.15, 0.85]
    const targetProb = 0.5 + comp.composite * 0.35;
    const curProb    = lmsrP(ps);
    const diff       = targetProb - curProb;

    // Soft nudge toward target — proportional to signal strength + confidence
    const strength   = Math.abs(comp.composite) * (comp.tech?.confidence || 0.5);
    const nudge      = diff * strength * 4;   // max ~±2 per tick

    if(nudge > 0)      ps.qYes = Math.max(10, ps.qYes + nudge);
    else if(nudge < 0) ps.qNo  = Math.max(10, ps.qNo  - nudge);

    // Mean-revert total volume toward 100+100 baseline to prevent unbounded growth
    const total    = ps.qYes + ps.qNo;
    if(total > 800) {
      const ratio  = 200 / total;
      ps.qYes      = Math.max(10, ps.qYes * ratio);
      ps.qNo       = Math.max(10, ps.qNo  * ratio);
    }
  });

  // Agent score drift toward composite consensus (every 15 ticks)
  if(tick % 15 === 0) {
    pairs.forEach(pair => {
      const comp = allSigs[pair];
      if(!comp) return;
      S.agents.filter(a => !a.isBot && !a.isMeta).forEach(a => {
        const pull = comp.composite * 0.005 * a.conf;
        a.score    = Math.max(-1, Math.min(1, a.score + pull + (Math.random()-0.5)*0.002));
      });
    });
  }

  // ── Render per-pair grid ──
  el.innerHTML = `
  <div class="signal-card" style="overflow:hidden;">
    <div class="signal-card-header">
      <div class="signal-card-title">Signal Composite — toutes paires</div>
      <div class="pill pill-pur" style="font-size:8px;">BOT ACTIF</div>
    </div>
    ${pairs.map(pair => {
      const comp = allSigs[pair];
      const cfg  = PAIRS[pair];
      if(!comp) return `<div class="signal-row-item" style="opacity:.4;"><div>${pair}</div><span style="color:var(--t3);font-size:9px;">—</span></div>`;

      const { composite, signal, col, strength, tech, fund } = comp;
      const pct    = Math.round((composite+1)*50);
      const tCol   = tech.atScore  >= 0 ? 'var(--up)' : 'var(--down)';
      const fCol   = fund.fundScore >= 0 ? 'var(--up)' : 'var(--down)';
      const sigs   = Object.values(tech.signals||{}).filter(Boolean);
      const bulls  = sigs.filter(s=>s.signal==='bull').length;
      const bears  = sigs.filter(s=>s.signal==='bear').length;
      const neuts  = sigs.filter(s=>s.signal==='neut').length;
      const actionIcon = signal==='LONG'?'↑':signal==='SHORT'?'↓':'—';
      const actionBg   = signal==='LONG'?'rgba(0,232,122,.1)':signal==='SHORT'?'rgba(255,61,107,.1)':'rgba(245,200,66,.07)';

      // Top 2 confirming indicators
      const topSigs = sigs
        .filter(s => (signal==='LONG'&&s.signal==='bull')||(signal==='SHORT'&&s.signal==='bear'))
        .slice(0,2)
        .map(s => s.label.replace(/[↑↓]/g,'').trim())
        .join(' · ');

      return `
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);">
        <!-- Header row: pair + action badge -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;font-weight:700;color:${cfg.color};">${pair}</span>
            <span style="font-size:8px;color:var(--t3);">${(composite*100>=0?'+':'')+  (composite*100).toFixed(0)}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:8px;color:var(--t3);">${strength}</span>
            <span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:8px;background:${actionBg};color:${col};border:1px solid ${col}33;">${actionIcon} ${signal}</span>
          </div>
        </div>
        <!-- Global bar -->
        <div class="composite-bar-track" style="height:5px;margin-bottom:5px;">
          <div class="composite-bar-fill" style="width:${pct}%;background:${col};box-shadow:0 0 5px ${col}44;height:100%;"></div>
          <div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:rgba(255,255,255,.15);"></div>
        </div>
        <!-- AT / AF sub-bars -->
        <div style="display:flex;gap:6px;margin-bottom:5px;">
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:1px;">AT ${tech.atScore>=0?'+':''}${(tech.atScore*100).toFixed(0)}%</div>
            <div style="height:3px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${Math.round((tech.atScore+1)*50)}%;background:${tCol};border-radius:2px;"></div>
            </div>
          </div>
          <div style="flex:1;">
            <div style="font-size:7px;color:var(--t3);margin-bottom:1px;">AF ${fund.fundScore>=0?'+':''}${(fund.fundScore*100).toFixed(0)}%</div>
            <div style="height:3px;background:var(--s3);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${Math.round((fund.fundScore+1)*50)}%;background:${fCol};border-radius:2px;"></div>
            </div>
          </div>
        </div>
        <!-- Consensus pills + top indicators -->
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
          <span style="font-size:8px;color:var(--up);">↑${bulls}</span>
          <div style="width:40px;height:4px;background:var(--s3);border-radius:2px;overflow:hidden;display:flex;">
            <div style="flex:${bulls};background:var(--up);"></div>
            <div style="flex:${neuts};background:var(--gold);opacity:.4;"></div>
            <div style="flex:${bears};background:var(--down);"></div>
          </div>
          <span style="font-size:8px;color:var(--down);">${bears}↓</span>
          ${topSigs ? `<span style="font-size:7px;color:var(--t3);margin-left:2px;">${topSigs}</span>` : ''}
        </div>
      </div>`;
    }).join('')}
    <div style="padding:8px 14px;font-size:8px;color:var(--t3);line-height:1.6;">
      ↑ 10 indicateurs AT + 14 facteurs AF injectés dans le LMSR de chaque paire · Signal composite indépendant par paire
    </div>
  </div>`;
}


function renderAnalysis() {
  renderTechnicalPanel();
  renderFundamentalPanel();
  renderCompositePanel();
}

function mVote(id, support) {
  const p = S.proposals.find(x=>x.id===id);
  if(!p||p.userVoted) return;
  if(support) p.forVotes += 500;
  else p.againstVotes += 500;
  p.userVoted = true;
  S.chainLog.push({ icon:'🗳', desc:`Vote humain #${id}: ${support?'POUR':'CONTRE'}`, hash:rndHash(), time:nowStr() });
  showToast(support?'✓ Vote POUR enregistré on-chain':'✓ Vote CONTRE enregistré on-chain');
  patchGovCards();
  renderChain();
}

function setMobileTf(tf, el) {
  S.tf = tf;
  document.querySelectorAll('.tf-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  drawMobileChart();
}

// ============================================================
// ENHANCED TOAST STACK — v3.1
// ============================================================
const _toastQueue = [];
let   _toastCount = 0;

const TOAST_ICONS = {
  '🧬': { color: 'var(--up)',   bar: '#00e87a' },
  '💤': { color: 'var(--pur)',  bar: '#a78bfa' },
  '🌐': { color: 'var(--gold)', bar: '#f5c842' },
  '✅': { color: 'var(--up)',   bar: '#00e87a' },
  '💰': { color: 'var(--up)',   bar: '#00e87a' },
  '📉': { color: 'var(--down)', bar: '#ff3d6b' },
  '⚠':  { color: 'var(--gold)', bar: '#f5c842' },
  '❌': { color: 'var(--down)', bar: '#ff3d6b' },
  '▶':  { color: 'var(--ice)',  bar: '#38d4f5' },
  '⏸':  { color: 'var(--gold)', bar: '#f5c842' },
  '🔄': { color: 'var(--ice)',  bar: '#38d4f5' },
  '🔖': { color: 'var(--pur)',  bar: '#a78bfa' },
  'default': { color: 'var(--t2)', bar: '#38d4f5' },
};

// v7.0: Toast filtering par niveau
// 'critical' = toujours visible (erreurs)
// 'user'     = toujours visible (actions user)
// 'info'     = silencieux par défaut (bot trades, evolutions)
// Mode verbeux: S.toastVerbose = true pour tout voir
function showToast(msg, duration = 2800, level = 'info') {
  // Level 'info' masqué par défaut — visibles seulement si mode verbeux
  if(level === 'info' && S.toastVerbose !== true) {
    // v7.12 fix: toasts info ne polluent plus chainLog (icon cassée + truncate destructif)
    // Seulement incrémenter le compteur silencé pour badge
    S._silencedCount = (S._silencedCount || 0) + 1;
    return;
  }
  // Dedupe: skip if same message shown in last 1.5s
  const now = Date.now();
  if(window._lastToastMsg === msg && (now - (window._lastToastTs||0)) < 1500) return;
  window._lastToastMsg = msg;
  window._lastToastTs  = now;
  _showToast_orig(msg, duration);
}
function _showToast_orig(msg, duration = 2800) {
  const stack = document.getElementById('toastStack');
  if(!stack) return;

  // Parse: extract leading emoji as icon
  const emojiMatch = msg.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  const icon  = emojiMatch ? emojiMatch[0] : '◆';
  const body  = emojiMatch ? msg.slice(icon.length).trim() : msg;

  // Split on · for title/sub
  const parts = body.split(' · ');
  const title = parts[0] || body;
  const sub   = parts.slice(1).join(' · ');

  const theme = TOAST_ICONS[icon] || TOAST_ICONS['default'];

  const id   = 'ti_' + (++_toastCount);
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.id = id;
  item.style.borderColor = `rgba(${hexToRgb(theme.bar) || '56,212,245'},.15)`;
  item.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-title" style="color:${theme.color}">${escHtml(title)}</div>
      ${sub ? `<div class="toast-sub">${escHtml(sub)}</div>` : ''}
    </div>
    <div class="toast-bar" style="background:${theme.bar};animation-duration:${duration}ms"></div>`;
  stack.appendChild(item);

  // Limit visible toasts to 4
  const items = stack.querySelectorAll('.toast-item:not(.removing)');
  if(items.length > 4) {
    dismissToast(items[0].id);
  }

  setTimeout(() => dismissToast(id), duration);
}

function dismissToast(id) {
  const el = document.getElementById(id);
  if(!el || el.classList.contains('removing')) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 380);
}

function hexToRgb(hex) {
  if(!hex || !hex.startsWith('#')) return '56,212,245';
  const h = hex.replace('#','');
  const full = h.length === 3 ? h.split('').map(x=>x+x).join('') : h;
  const m = full.match(/.{2}/g);
  if(!m || m.length < 3) return '56,212,245';
  return m.slice(0,3).map(x => parseInt(x,16)).join(',');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// SIMULATION TICK — multi-pair
// ============================================================
let tick = 0;

function simTick() {
  // v7.12 LIVRAISON 8 · Appliquer SL/TP Réel si applicable
  if (S.tradingMode === 'paperReal') {
    try { _applyPaperRealProtection(); } catch(e) {}
  }
  // v7.2 Phase 18 · Perf monitoring (rolling window, sans impact perceptible)
  const _perfStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  tick++;

  // ── Per-pair independent cycle timers ──────────────────────
  // Each pair has its own cycleMax/cycleTimer — they fire independently
  Object.entries(S.pairStates).forEach(([pair, ps]) => {
    ps.cycleTimer--;
    if(ps.cycleTimer <= 0) {
      ps.cycleTimer = ps.cycleMax;
      S.cycle++;         // global cycle counter increments per any pair resolution
      resolvePairCycle(pair, ps);
    }
  });

  // ── Global ring timer (display only — BTC/USDT reference) ──
  // S.cycleMax is the user-chosen global display reference — DO NOT overwrite it from per-pair
  const refPs = S.pairStates['BTC/USDT'] || Object.values(S.pairStates)[0];
  if(refPs) {
    S.cycleTimer = refPs.cycleTimer;
    // Only sync cycleMax to display label, not to S.cycleMax (which is user-controlled)
  }

  // ── Funding fees: once every 30 ticks (≈ 30s) per open position ──
  if(tick % 30 === 0) { applyFundingFees(); applyLeverageBorrowFees(); }

  // ── v7.1 PHASE 1 · Fetch USD/EUR rate (tick 1 puis toutes les 60 ticks ≈ 60s) ──
  if(tick === 1 || tick % 60 === 0) { try { fetchUsdEurRate(); } catch(e) {} }

  // Phase display (page 1 agents tab only — home no longer has it)
  const phasePct = 1 - S.cycleTimer/S.cycleMax;
  let phase = 'COLLECTE';
  if(phasePct > .2 && phasePct < .6) phase = 'MARCHÉ';
  else if(phasePct >= .6) phase = 'RÉSOLUTION';
  const phaseEl = document.getElementById('cyclePhase');
  if(phaseEl) phaseEl.textContent = phase;

  // Agent score nudge toward composite consensus every 4 ticks (no random drift)
  if(tick % 4 === 0) {
    const allSigs2 = getCachedCompositeSignals();
    const avgComp2 = Object.values(allSigs2).reduce((s,c)=>s+(c?c.composite:0),0) / Object.keys(PAIRS).length;
    S.agents.forEach(a => {
      // v7.3 OPT · Bots & Meta : score verrouillé à 0 (role neutre par design, évite dérive)
      if(a.isBot || a.isMeta) { a.score = 0; return; }
      // v7.3 OPT · Mean-reversion SEULEMENT sur signaux faibles — préserve les fortes convictions
      if(Math.abs(a.score || 0) < 0.30) {
        const pull = avgComp2 * 0.004 * (a.conf || 0.5);
        a.score = Math.max(-1, Math.min(1, a.score + pull));
      }
      // v7.3 OPT · Conf auto-recovery supprimée — la conf doit refléter la perf réelle
      // v7.3 OPT · MÉMOIRE INTER-AGENTS : les agents consultent les leçons récentes
      // Leçons de < 50 cycles et pertinentes (sévérité > 0.15) → légère influence sur le score
      if(S.agentLessons && S.agentLessons.length > 0) {
        const recentLessons = S.agentLessons.filter(l => (S.cycle - l.cycle) < 50 && l.severity > 0.15);
        if(recentLessons.length > 0) {
          // Moyenne pondérée des directions gagnantes récentes, poids = sévérité × récence
          const lessonNudge = recentLessons.reduce((sum, l) => {
            const recency = Math.max(0, 1 - (S.cycle - l.cycle) / 50);
            return sum + l.direction * l.severity * recency;
          }, 0) / recentLessons.length;
          // Nudge très léger (×0.008) pour ne pas dominer les propres convictions
          a.score = Math.max(-1, Math.min(1, a.score + lessonNudge * 0.008));
        }
      }
    });
  }

  // LMSR orders — agents votent sur toutes les paires (toutes les 6s)
  if(tick % 6 === 0) {
    const pairList  = Object.keys(PAIRS);
    const nPairs    = pairList.length;

    S.agents.forEach(a => {
      const sig        = a.score;
      // Budget total divisé par le nb de paires pour éviter la sur-exposition
      const budgetPerPair = (a.fitness * .08) / nPairs;
      if(budgetPerPair <= 0) return;

      pairList.forEach(pair => {
        const ps = S.pairStates[pair];
        if(!ps) return;

        // Légère variation par paire (±20%) pour diversifier les signaux
        const pairBias = 0.8 + Math.random() * 0.4;
        const budget   = budgetPerPair * pairBias;

        if(sig > .1) {
          const d = Math.floor(budget * sig * 1.8);
          if(d > 0 && a.fitness > d * .5) {
            const cost = lmsrBuyYes(ps, d);
            a.fitness -= cost;
          }
        } else if(sig < -.1) {
          const d = Math.floor(budget * Math.abs(sig) * 1.8);
          if(d > 0 && a.fitness > d * .4) {
            const cost = lmsrBuyNo(ps, d);
            a.fitness -= cost;
          }
        }
      });
    });
  }

  // v7.3 OPT · Soft learning plus rapide (5→3 ticks, ~1.5s à 500ms/tick)
  if(tick % 3 === 0) {
    learnFromOpenPositions();
    estimateStakes();            // Bot recalcule les mises optimales
    updateAllPairCtrlLabels();   // Sync affichage steppers
  }

  // ── DREAM TRIGGER (Feature #2) — check after every pair resolution ──
  if(tick % 8 === 0 && !S.dreamActive) {
    Object.keys(S.pairStates).forEach(pair => {
      const ps = S.pairStates[pair];
      if(ps.lastAction === 'hold') {
        S._holdConsecutive[pair] = (S._holdConsecutive[pair] || 0) + 1;
        if(shouldTriggerDream(pair)) {
          S._holdConsecutive[pair] = 0;
          setTimeout(triggerDreamCycle, 400);
        }
      } else {
        S._holdConsecutive[pair] = 0;
      }
    });
  }

  // ── DYNAMIC PAIR PROPOSAL (Feature #3) — check every 60 ticks ──
  if(tick % 60 === 0) {
    proposeDynamicPair();
    checkPairProposalAutoPass();
  }

  // v6.9: AUTO-DIAGNOSTIC — boost convGate si bot stagne
  if(!S._lastTradeCount) S._lastTradeCount = S.totalTrades || 0;
  if(!S._tradeStagnationTicks) S._tradeStagnationTicks = 0;
  const _currentTrades = S.totalTrades || 0;
  if(_currentTrades > S._lastTradeCount) {
    S._lastTradeCount = _currentTrades;
    S._tradeStagnationTicks = 0;
    S._convBoost = 0; // reset boost
  } else {
    S._tradeStagnationTicks = (S._tradeStagnationTicks || 0) + 1;
    // Après 150 ticks sans trade → boost progressif de 0 à 0.06 sur les 30 ticks suivants
    if(S._tradeStagnationTicks > 150 && S._tradeStagnationTicks < 300) {
      S._convBoost = Math.min(0.06, (S._tradeStagnationTicks - 150) / 30 * 0.06);
    } else if(S._tradeStagnationTicks >= 300) {
      // Cap maximum: -0.06 sur les seuils (convGate descend de 0.18 à 0.12)
      S._convBoost = 0.06;
    }
  }

  // v7.0: Update regime badge chaque tick (léger)
  if(typeof detectMarketRegime === 'function') {
    const _r = detectMarketRegime();
    const _rb = document.getElementById('regimeBadge');
    const _rbOld = document.getElementById('regimeBadgeOld'); // v15 · doublon Brain Network
    if(_rb && _r) {
      const labels = {
        bull:          { t:'▲ BULL',     c:'var(--up)',    bg:'rgba(0,232,122,.12)', br:'rgba(0,232,122,.3)' },
        bear:          { t:'▼ BEAR',     c:'var(--down)',  bg:'rgba(255,61,107,.12)', br:'rgba(255,61,107,.3)' },
        volatile_bull: { t:'▲▲ VOL+',    c:'var(--up)',    bg:'rgba(0,232,122,.15)', br:'rgba(0,232,122,.4)' },
        volatile_bear: { t:'▼▼ VOL−',    c:'var(--down)',  bg:'rgba(255,61,107,.15)', br:'rgba(255,61,107,.4)' },
        volatile:      { t:'◈ VOLATILE', c:'var(--gold)',  bg:'rgba(245,200,66,.12)', br:'rgba(245,200,66,.3)' },
        calm:          { t:'◌ CALM',     c:'var(--t2)',    bg:'rgba(120,130,150,.1)', br:'rgba(120,130,150,.3)' }
      };
      const lb = labels[_r] || labels.calm;
      [_rb, _rbOld].forEach(el => {
        if(!el) return;
        el.style.display = '';
        el.textContent = lb.t;
        el.style.color = lb.c;
        el.style.background = lb.bg;
        el.style.borderColor = lb.br;
      });
    }
  }

  // Blend real prices smoothly every tick
  blendRealPrices();

  // New candle for ALL pairs every 3 ticks — GBM with agent signal bias
  if(tick % 3 === 0) {
    // Fetch live prices every ~30s (async, non-blocking)
    if(tick % 15 === 1) fetchLivePrices();  // v7.12: 15s interval (avoid rate limit)
  if(tick % 4 === 0 && typeof _fpEmergencyCheck === 'function') _fpEmergencyCheck();  // v7.12 P1: watchdog FP
  if(tick % 2 === 0 && typeof updatePairBricks === 'function' && S.currentPage === 0) updatePairBricks();  // v7.12 P2: briques
  if(tick % 2 === 0 && typeof updateActionBricks === 'function' && S.currentPage === 0) updateActionBricks();  // v7.12 P2: briques actions
  if(tick % 2 === 0 && typeof updateManBricks === 'function' && S.currentPage === 0) updateManBricks();  // v7.12 P2: briques man
  if(tick % 4 === 0 && typeof _manConsignesWatchdog === 'function') _manConsignesWatchdog();  // v7.12 P2: watchdog man
  if(tick % 2 === 0 && typeof _updateAutoBarCounters === 'function' && S.currentPage === 0) _updateAutoBarCounters();  // v7.12 auto-bar counters
  if(tick % 30 === 0 && typeof _evaluatePairPerformance === 'function') _evaluatePairPerformance();  // v7.12 P2: eval win rate
  if(_priceSource === 2 && tick % 2 === 0) _simulationTickAll();  // v7.12: keep SIM moving

    Object.entries(S.pairStates).forEach(([pair, ps]) => {
      const cfg  = PAIRS[pair];
      const last = ps.candles[ps.candles.length - 1] || { c: ps.price };

      // Agent-driven bias (LMSR signal)
      const lmsrBias     = (lmsrP(ps) - 0.5) * cfg.vol * 0.7;
      // Mean-reversion component: gently pull toward a recent moving avg
      const closes       = ps.candles.slice(-20).map(c => c.c);
      const ma20         = closes.length > 3 ? closes.reduce((a,b)=>a+b,0)/closes.length : last.c;
      const reversionPull= (ma20 - last.c) * 0.015;  // gentle, realistic
      // Random walk (GBM-like)
      const noise        = (Math.random() - 0.5) * cfg.vol * 1.4;
      // Occasional larger moves (fat tails — realistic crypto)
      const fatTail      = Math.random() < 0.04 ? (Math.random()-0.5)*cfg.vol*4 : 0;

      const ch = lmsrBias + reversionPull + noise + fatTail;
      const o  = last.c;
      const c  = o + ch;
      const h  = Math.max(o, c) + Math.abs(ch)*0.3 + Math.random()*cfg.vol*0.3;
      const l  = Math.min(o, c) - Math.abs(ch)*0.3 - Math.random()*cfg.vol*0.3;
      const v  = Math.abs(ch) / cfg.vol * 1000 + Math.random() * 500;

      ps.candles.push({ o, h, l, c, v });
      if(ps.candles.length > 60) ps.candles.shift();

      // Apply price — no hard min/max clamp when real prices are live (they set the range)
      // Always use live price — no clamp when real data available
      ps.price = _pricesFetched ? c : Math.max(cfg.minP, Math.min(cfg.maxP, c));
      ps.pnl24h = Math.max(-40, Math.min(40, ps.pnl24h + (Math.random()-0.5)*0.06));
    });
  }

  // Portfolio drift — realistic: tiny % of total portfolio, not flat $
  // v7.5 FIX · la dérive ne s'applique QUE si le trading est déjà > 0
  // (empêche la création de fonds à partir de rien après un reset)
  if(tick % 5 === 0 && S.tradingAccount > 0) {
    const drift = S.tradingAccount * (Math.random() - 0.485) * 0.0008;  // ±0.08% per 5s
    S.tradingAccount = Math.max(0, S.tradingAccount + drift);
    S.portfolio      = S.cashAccount + S.tradingAccount;
    // Real intraday P&L from portfolio history (not random)
    if(!S._startPortfolio) S._startPortfolio = S.portfolio;
    const sessionGain = S.portfolio - S._startPortfolio;
    S.pnl24h = S._startPortfolio > 0
      ? (sessionGain / S._startPortfolio * 100)
      : 0;
  }
  if(tick % 5 === 0) {
    S.pnlHistory.push(S.portfolio);
    if(S.pnlHistory.length > 80) S.pnlHistory.shift();
  }

  // ── Render active page (throttled for performance) ──
  if(S.currentPage === 0) {
    // Home: tiered rendering — price display every tick, heavy work throttled
    renderHomePrices();                          // prices + cycle timers only (fast)
    updateMarketMood();                          // v5 · mood bar (light)
    if(tick % 2 === 0) { renderPositions(); renderActionsGrid(); renderPairPnl();  if(typeof _updateCloseAllBadge==="function") _updateCloseAllBadge();}
    // v6.8: roster analysis chaque tick sur TOUTES les paires — consensus max
    if(tick % 1 === 0) {
      try {
        if(typeof window.runRosterAnalysis === 'function') {
          const _pairList = Object.keys(S.pairStates||{});
          if(_pairList.length) {
            const _idx = tick % _pairList.length;
            window.runRosterAnalysis(_pairList[_idx]);  // rotation 1 paire/tick
          }
        }
      } catch(e) {}
    }
    if(tick % 3 === 0) { drawActionMiniCharts(); updatePairBtnStates(); updateAllPairCtrlLabels(); updateBotThoughts(); }
    if(tick % 4 === 0) { updatePairAnalysisPanels(); try{Object.keys(PAIRS).forEach(ac2UpdateXInd);}catch(e){} syncPairPresets(); updateIntelBanner(); updateStreakBadge(); try { renderHome(); updateFiscalMini(); renderAnalyticsPanel(); if(typeof renderPendingActions === 'function') renderPendingActions(); } catch(e) { console.warn('tick render:', e); }

    // v6.9: Évolution continue — vérification chaque 15 ticks
    if(tick % 8 === 0) {
      try {
        const _agents2 = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness);
        if(_agents2[0] && _agents2[0].fitness < 300) triggerEvolution(_agents2[0]);  // v7.2 TURBO · seuil relevé
        // Forcer aussi évolution des agents avec score plat (stagnation)
        const _stagnant = _agents2.find(a => Math.abs(a.score||0) < 0.03 && a.fitness < 400);
        if(_stagnant && tick % 24 === 0) triggerEvolution(_stagnant);
      } catch(_e) {}
    }
  // v6.3 · Refresh roster scores every 4 ticks so agent panel shows live scores
  try {
    if(typeof runRosterAnalysis === 'function' && typeof window.runRosterAnalysis === 'function') {
      const activePair = S.activePair || (Object.keys(S.pairStates||{})[0]) || 'BTC/USDT';
      window.runRosterAnalysis(activePair);
    }
  } catch(e) {} }
    if(tick % 5 === 0) drawSparkline();
  }
  else if(S.currentPage === 1) {
    // Agents: patch every tick, sparklines every 5
    patchAgentCards();
    if(tick % 3 === 0) renderAgentHeatmap();
    if(tick % 5 === 0) renderAgents();
    // Dream dot badge
    const dd = document.getElementById('dreamDotBadge');
    if(dd) dd.style.display = S.dreamActive ? 'inline-block' : 'none';
  }
  else if(S.currentPage === 2) {
    renderMarket();
    if(tick % 3 === 0) { drawMiniCharts(); drawMobileChart(); }
    if(tick % 4 === 0) renderCorrMatrix();
    if(tick % 5 === 0) renderAnalysis();   // AT + AF + composite
  }
  else if(S.currentPage === 3) {
    if(tick % 2 === 0) patchGovCards();
    if(tick % 5 === 0) renderDAO();
  }
  else if(S.currentPage === 4) {
    if(tick % 2 === 0) renderChain();
  }
  else if(S.currentPage === 5) {
    if(tick % 3 === 0) {
      const tab = document.querySelector('[id^="ftab-"].active')?.id?.replace('ftab-','') || 'global';
      renderFiscal(tab);
    }
  }
  // v7.2 Phase 18 · Fin instrumentation perf (rolling 20 ticks)
  try {
    const _perfEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const _dur = _perfEnd - _perfStart;
    if(!S.perf) S.perf = { tickDurations: [], avgMs: 0, maxMs: 0, samples: 0 };
    S.perf.tickDurations.push(_dur);
    if(S.perf.tickDurations.length > 20) S.perf.tickDurations.shift();
    S.perf.samples = S.perf.tickDurations.length;
    S.perf.avgMs = S.perf.tickDurations.reduce((a,b)=>a+b,0) / S.perf.samples;
    S.perf.maxMs = Math.max(...S.perf.tickDurations);
    S.perf.lastMs = _dur;
  } catch(e) {}
}

// ── Seuils de trading optimisés pour réduire les frais ──────
// Frais aller-retour estimé: takerRate×2 + slippage×2 = ~0.30%
// On ne trade que si la conviction justifie au moins 3× les frais
// v7.3 OPT · constantes obsolètes supprimées (CONV_THRESHOLD, DIR_THRESHOLD, TRADE_THRESHOLD,
// STOP_LOSS_X, BREAKEVEN_PCT) — elles n'étaient jamais lues. Les vrais seuils sont inline :
//   - Entrée trade : ligne ~8568 (shouldTrade = conviction > minMoveNeeded * 2.0 && |composite| > 0.24)
//   - TP/SL bot :    ligne ~17910-17911 (tpPct/slPct dérivés de conviction et volCV)

// Résoudre UN cycle pour UNE paire — appelé par simTick quand ps.cycleTimer atteint 0
// ════════════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 4 · WRAPPER MODE TRADING (sim/real)
// ════════════════════════════════════════════════════════════════════
// Décide si le bot fait son cycle : sim → toujours, real → uniquement
// quand une nouvelle bougie de la paire+timeframe choisi vient de se fermer
// ET que la paire est active ET que le kill switch n'est pas en pause.
// ════════════════════════════════════════════════════════════════════

// Fonction resolvePairCycle stubbed (originale tronquée à l'upload)
// ═══ Sections reconstruites (renderXxx → initXxx) ═══

// Backtest : init existe déjà, render = appeler init
function renderBacktestSection() {
  if (typeof initBacktestSection === 'function') initBacktestSection();
}
window.renderBacktestSection = renderBacktestSection;

// Replay : init existe, render = appeler init
function renderReplaySection() {
  if (typeof initReplaySection === 'function') initReplaySection();
}
window.renderReplaySection = renderReplaySection;

// What-if : reconstruction complète (init était tronqué)
function initWhatifSection() {
  var el = document.getElementById('whatifSection');
  if (!el) return;
  // Valeurs par défaut basées sur la perf actuelle si dispo
  var defWr   = (S && S.totalTrades>0) ? Math.round((S.winTrades||0)/S.totalTrades*100) : 55;
  var defAvgW = 1.5, defAvgL = 1.0;
  var defFees = 0.1, defStake = 50, defTrades = 100;
  el.innerHTML =
    '<div style="background:var(--s1,#0d0d1a);border:1px solid rgba(56,212,245,.15);border-radius:12px;padding:14px;margin-bottom:10px;">'
    + '<div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ice,#38d4f5);margin-bottom:10px;">🔮 What-if · Simulateur</div>'
    + '<div style="font-size:9px;color:var(--t3,#888);line-height:1.5;margin-bottom:10px;">Simule l\'impact de différents paramètres sur ton P&L théorique.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'
    + _wifInput('Win Rate (%)', 'wifWr', defWr, 30, 90, 1)
    + _wifInput('Trades', 'wifTrades', defTrades, 10, 1000, 10)
    + _wifInput('Avg Win (%)', 'wifAvgW', defAvgW, 0.1, 10, 0.1)
    + _wifInput('Avg Loss (%)', 'wifAvgL', defAvgL, 0.1, 10, 0.1)
    + _wifInput('Mise ($)', 'wifStake', defStake, 1, 1000, 5)
    + _wifInput('Frais (%)', 'wifFees', defFees, 0, 1, 0.05)
    + '</div>'
    + '<button onclick="runWhatif()" style="width:100%;padding:9px;border-radius:8px;background:rgba(56,212,245,.12);border:1px solid rgba(56,212,245,.3);color:var(--ice,#38d4f5);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">🔮 Calculer</button>'
    + '<div id="wifResults" style="margin-top:10px;display:none;"></div>'
    + '</div>';
}
function _wifInput(lbl, id, val, mn, mx, step) {
  return '<div><label style="font-size:8px;color:var(--t3,#888);text-transform:uppercase;letter-spacing:.06em;">' + lbl + '</label>'
       + '<input type="number" id="' + id + '" value="' + val + '" min="' + mn + '" max="' + mx + '" step="' + step + '" '
       + 'style="width:100%;padding:6px 8px;border-radius:6px;background:var(--s2,#111);border:1px solid var(--border,#222);color:var(--t1,#fff);font-size:11px;font-family:var(--font-mono,monospace);"></div>';
}
function runWhatif() {
  var wr     = parseFloat(document.getElementById('wifWr').value)     || 55;
  var trades = parseInt  (document.getElementById('wifTrades').value) || 100;
  var avgW   = parseFloat(document.getElementById('wifAvgW').value)   || 1.5;
  var avgL   = parseFloat(document.getElementById('wifAvgL').value)   || 1.0;
  var stake  = parseFloat(document.getElementById('wifStake').value)  || 50;
  var fees   = parseFloat(document.getElementById('wifFees').value)   || 0.1;
  var r = _simulateWhatIf({wr:wr, trades:trades, avgWin:avgW, avgLoss:avgL, stake:stake, fees:fees});
  var col = function(v){ return v>=0?'var(--up,#00e87a)':'var(--down,#ff3d6b)'; };
  var html = '<div style="background:var(--s2,#111);border-radius:10px;padding:12px;font-size:10px;line-height:1.8;">'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Wins / Loss</span><span style="font-weight:700;">' + r.nWins + ' / ' + r.nLoss + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Gain brut</span><span style="color:var(--up,#00e87a);font-weight:700;">+$' + r.grossWin.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Perte brute</span><span style="color:var(--down,#ff3d6b);font-weight:700;">-$' + r.grossLoss.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Frais totaux</span><span style="font-weight:700;">$' + r.totalFees.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--border,#222);margin-top:6px;padding-top:6px;"><span style="color:var(--t1,#fff);font-weight:800;">P&L NET</span><span style="color:' + col(r.netPnl) + ';font-weight:900;font-size:13px;">' + (r.netPnl>=0?'+':'') + '$' + r.netPnl.toFixed(2) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Expectancy</span><span style="color:' + col(r.expectancy) + ';font-weight:700;">' + (r.expectancy>=0?'+':'') + (r.expectancy*100).toFixed(2) + '%</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">ROI</span><span style="color:' + col(r.roi) + ';font-weight:700;">' + (r.roi>=0?'+':'') + r.roi.toFixed(1) + '%</span></div>'
    + '<div style="display:flex;justify-content:space-between;"><span style="color:var(--t3,#888);">Drawdown estimé</span><span style="color:var(--gold,#f5c842);font-weight:700;">$' + r.estMaxDD.toFixed(2) + ' (' + r.maxConsecLoss + ' pertes)</span></div>'
    + '</div>';
  var rd = document.getElementById('wifResults');
  if (rd) { rd.innerHTML = html; rd.style.display = 'block'; }
}
function renderWhatifSection() { initWhatifSection(); }
window.initWhatifSection = initWhatifSection;
window.runWhatif = runWhatif;
window.renderWhatifSection = renderWhatifSection;
window._wifInput = _wifInput;

// resolvePairCycle RESTAURÉE de v39 (la version dans v108/93+v94 était cassée — signature et logique fausses)
function resolvePairCycle(pair, ps) {
  // MODE SIM (par défaut) : comportement original
  if (!_isRealLike()) {
    return _resolvePairCycleCore(pair, ps);
  }

  // v7.12 LIVRAISON 8 · MODE PAPIER RÉEL : règles strictes
  if (S.tradingMode === 'paperReal') {
    return _resolvePaperRealCycle(pair, ps);
  }

  // ── MODE REAL (existant) ──
  // Paire active ?
  if (!(S.realActivePairs && S.realActivePairs[pair])) return;

  // Kill switch en pause ?
  const ks = (S.realKillSwitch && S.realKillSwitch[pair]) || null;
  if (ks && ks.paused) return;

  const tf = S.realTimeframe || '15m';
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf]) || [];

  // Pas assez de données ? pause
  if (arr.length < 30) return;

  // Dernière bougie (live) — on déclenche le cycle quand une bougie se FERME
  // Une bougie se ferme quand sa ts change (la dernière bougie de arr est la nouvelle bougie en cours)
  // On retient le ts de la dernière bougie close (avant-dernière, car la dernière est en cours)
  if (arr.length < 2) return;
  const closedTs = arr[arr.length - 2].ts;   // ts de la dernière bougie complète
  const lastSeenTs = (S.realPairCycle && S.realPairCycle[pair]) || 0;
  if (closedTs <= lastSeenTs) return;        // pas de nouvelle bougie fermée
  if (!S.realPairCycle) S.realPairCycle = {};
  S.realPairCycle[pair] = closedTs;

  // Vérifier la fraîcheur du WS / des bougies (sécurité 6 du plan)
  // v7.12 LIVRAISON 9 · TOLÉRANCE 2 MIN MIN pour éviter les pauses sur micro-glitches
  const tfMs = { '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1j': 86400000 }[tf] || 900000;
  const dataAge = Date.now() - arr[arr.length - 1].ts;  // âge de la bougie EN COURS
  // On prend le MAX entre 2.5x tf et 2 min (pour 5m: 2.5x = 12.5min, donc 12.5min ; pour 1m hypothétique: 2min)
  // L'idée : sur 5m/15m/1h, c'est déjà très tolérant ; on garantit au moins 2 min de tolérance
  const stalenessThreshold = Math.max(tfMs * 2.5, 120000);
  if (dataAge > stalenessThreshold) {
    // v118 FIX · Données obsolètes → fetch REST au lieu de pauser définitivement
    // Les bougies anciennes (session précédente) sont remplacées par des données fraîches Binance
    if (typeof _fetchAndBootstrapRealCandles === 'function') {
      _fetchAndBootstrapRealCandles(pair, tf);
    }
    return;  // Attendre les données fraîches — pas de kill switch
  }

  // Tout va bien → exécuter le cycle bot sur ce signal de bougie fermée
  return _resolvePairCycleCore(pair, ps);
}
if(typeof resolvePairCycle==='function') window.resolvePairCycle = resolvePairCycle;


// ════════════════════════════════════════════════════════════════════════
// AURA8 v93 · DÉBUT BLOC RESTAURATION
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// AURA8 v93 · BLOC RESTAURATION AUTO-INJECTÉ
// 59 fonctions reconstruites + variables module-level
// Sources : v69/v91
// 12 stubs vides de v92 remplacés par vraies versions
// 47 fonctions absentes restaurées
