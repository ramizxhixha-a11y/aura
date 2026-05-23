// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09g-modals.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Modals — openDiagnostic, openSnapshotsModal, openWhyModal.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION Modals
// Trois fenêtres modales avec rendu HTML détaillé :
//  - openDiagnostic       : diagnostic complet (trades, P&L, marché, agents, capital, slider répartition)
//  - openSnapshotsModal   : gestion des snapshots
//  - openWhyModal(posId)  : explication "pourquoi cette position a été ouverte"
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Modal de diagnostic complet
// Cinq sections : Trades, P&L, Marché, Agents, Capital, Répartition bénéfices
// Indicateur d'alerte rouge sur le bouton diag si une métrique est critique
// ──────────────────────────────────────────────────────────────────────
function openDiagnostic() {
  const body    = document.getElementById('diagBody');
  const overlay = document.getElementById('diagOverlay');
  if (!body || !overlay) return;

  const now        = Date.now();
  const positions  = S.openPositions || [];
  const agents     = S.agents        || [];
  const pairStates = S.pairStates    || {};

  // ── TRADES ──
  // Clôturées = dans ps.trades avec type 'position' et pnlUsdt numérique
  let closedWin = 0, closedLoss = 0, closedTotal = 0, noTpSl = 0;
  let oldestPosAge   = 0;
  let oldestPosLabel = '—';

  Object.entries(pairStates).forEach(([pair, ps]) => {
    (ps.trades || []).forEach(t => {
      if (t.type === 'position' && typeof t.pnlUsdt === 'number') {
        closedTotal++;
        if      (t.pnlUsdt > 0) closedWin++;
        else if (t.pnlUsdt < 0) closedLoss++;
      }
    });
  });

  positions.forEach(p => {
    if (!p.tp && !p.sl) noTpSl++;
    const age = now - (p.openedAt || p.entryTs || now);
    if (age > oldestPosAge) {
      oldestPosAge   = age;
      oldestPosLabel = p.pair + ' ' + (p.side || '').toUpperCase();
    }
  });

  const fmtAge = ms => {
    const m = Math.floor(ms / 60000);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    return h + 'h' + String(m % 60).padStart(2, '0');
  };

  const oldCls    = oldestPosAge > 3600000 ? 'crit' : oldestPosAge > 600000 ? 'warn' : 'ok';
  const noTpSlCls = noTpSl > 0 ? 'warn' : 'ok';

  // ── P&L ──
  const pnlRealised = Object.values(pairStates).reduce((s, ps) => s + (ps.totalPnlUsd || 0), 0);
  const pnlLatent   = positions.reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const ratio       = pnlRealised !== 0 ? Math.abs(pnlLatent / pnlRealised) : (pnlLatent !== 0 ? 999 : 0);
  const ratioCls    = ratio > 2 ? 'crit' : ratio > 1 ? 'warn' : 'ok';
  const fmt$        = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);

  // ── MARCHÉ ──
  // En mode RÉEL, les prix viennent du WebSocket Binance (RT._lastRealPriceTs).
  // En mode sim, ils viennent du HTTP fetch (_lastPriceFetch).
  // En sim pur ("Auto-apprentissage"), les prix sont SIMULÉS : aucun fetch ni WS,
  // donc "Dernier fetch" et "Paires figées" n'ont pas de sens (afficher N/A).
  const _diagSimMode = !(typeof _isRealLike === 'function' && _isRealLike());
  let lastFetch;
  if (!_diagSimMode) {
    lastFetch = (typeof RT._lastRealPriceTs !== 'undefined' && RT._lastRealPriceTs) ? RT._lastRealPriceTs : 0;
  } else {
    lastFetch = (typeof _lastPriceFetch !== 'undefined' && _lastPriceFetch) ? _lastPriceFetch : 0;
  }

  const staleThreshold = 60000;
  const isGloballyStale = lastFetch === 0 || (now - lastFetch) > staleThreshold;
  let staleCount = 0;
  if (!_diagSimMode && isGloballyStale) {
    staleCount = Object.keys(pairStates).length;
  }

  const ageSinceUpdate = lastFetch ? Math.floor((now - lastFetch) / 1000) : -1;

  // Source de prix : détection intelligente WS Binance actif
  const srcMap = { 0: 'CoinGecko', 1: 'Binance', 2: 'Mode Auto-apprentissage' };
  let currentSource = (typeof _priceSource !== 'undefined') ? (srcMap[_priceSource] || '—') : '—';

  // Compteur WS connectés (background collector + foreground modal)
  let wsConnectedCount = 0;
  let wsActiveTotal    = 0;
  try {
    if (typeof _bgCollectorWSMap === 'object' && _bgCollectorWSMap) {
      Object.entries(_bgCollectorWSMap).forEach(([p, ws]) => {
        wsActiveTotal++;
        if (ws && ws.readyState === 1) wsConnectedCount++;
      });
    }
    if (typeof _realCandlesState !== 'undefined' && _realCandlesState.wsConnected) {
      wsConnectedCount++;
      wsActiveTotal++;
    }
  } catch (e) {}

  // Si en mode real ou paperReal avec au moins 1 WS connecté → "Binance WS · live"
  if (_isRealLike() && wsConnectedCount > 0) {
    currentSource = 'Binance WS · live';
  }

  const regime = typeof detectMarketRegime === 'function' ? detectMarketRegime() : '—';

  // En sim, la source de prix réelle n'a pas de sens
  if (_diagSimMode) currentSource = 'Mode Auto-apprentissage';

  const staleCls  = staleCount === 0 ? 'ok' : staleCount < Object.keys(pairStates).length ? 'warn' : 'crit';
  const updateCls = _diagSimMode ? 'neu' : (ageSinceUpdate < 0 ? 'crit' : ageSinceUpdate > 120 ? 'crit' : ageSinceUpdate > 30 ? 'warn' : 'ok');

  // ── AGENTS ──
  const pureAgents = agents.filter(a => !a.isBot && !a.isMeta);
  const saturated  = agents.filter(a => (a.fitness || 0) >= 1900).length;
  const broken     = agents.filter(a => (a.fitness || 0) <=   80).length;
  const totalAg    = agents.length;
  const satCls     = saturated > totalAg * 0.5 ? 'warn' : 'ok';
  const brokenCls  = broken    > 3 ? 'crit' : broken > 0 ? 'warn' : 'ok';
  const fpMode     = S.fullPowerMode ? 'ACTIF' : 'off';
  const fpCls      = S.fullPowerMode ? 'warn' : 'ok';

  // ── CAPITAL ──
  const trading     = S.tradingAccount   || 0;
  const cash        = S.cashAccount      || 0;
  const borrowed    = S.leverageBorrowed || 0;
  const maxCapacity = (S._autoLevBase || trading) * (S.leverageMaxMult || 10);
  const usagePct    = maxCapacity > 0 ? (borrowed / maxCapacity) * 100 : 0;
  const usageCls    = usagePct > 90 ? 'crit' : usagePct > 70 ? 'warn' : 'ok';
  const engagedPct  = (trading + borrowed) > 0 ? (borrowed / (trading + borrowed)) * 100 : 0;

  // ── INDICATEUR D'ALERTE GLOBAL ──
  const hasAlert = oldCls === 'crit' || staleCls === 'crit' || ratioCls === 'crit' || usageCls === 'crit' || brokenCls === 'crit';
  const diagBtn  = document.getElementById('diagBtn');
  if (diagBtn) diagBtn.classList.toggle('alert', hasAlert);

  // ── RENDU HTML ──
  body.innerHTML = `
    <div class="diag-section">
      <div class="diag-sec-title">📊 TRADES</div>
      <div class="diag-line"><span class="diag-label">Clôturées</span><span class="diag-val neu">${closedWin}W / ${closedLoss}L <span style="color:var(--t3);">(${closedTotal})</span></span></div>
      <div class="diag-line"><span class="diag-label">Positions ouvertes</span><span class="diag-val neu">${positions.length}</span></div>
      <div class="diag-line"><span class="diag-label">Plus ancienne ouverte</span><span class="diag-val ${oldCls}">${oldestPosLabel} · ${oldestPosAge>0?fmtAge(oldestPosAge):'—'}</span></div>
      <div class="diag-line"><span class="diag-label">Sans TP/SL</span><span class="diag-val ${noTpSlCls}">${noTpSl} / ${positions.length}</span></div>
      ${oldestPosAge > 3600000 ? '<div class="diag-note">⚠ Position ouverte depuis +1h : vérifie TP/SL ou ferme manuellement</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">💰 P&L</div>
      <div class="diag-line"><span class="diag-label">Réalisé cumulé</span><span class="diag-val ${pnlRealised>=0?'ok':'crit'}">${fmt$(pnlRealised)}</span></div>
      <div class="diag-line"><span class="diag-label">Latent (ouvert)</span><span class="diag-val ${pnlLatent>=0?'ok':'crit'}">${fmt$(pnlLatent)}</span></div>
      <div class="diag-line"><span class="diag-label">Ratio latent/réalisé</span><span class="diag-val ${ratioCls}">${ratio>=999?'∞':ratio.toFixed(2)}×</span></div>
      ${ratio > 2 ? '<div class="diag-note">⚠ Trop de P&L latent vs réalisé : le wipeout est possible si retournement</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">📡 MARCHÉ</div>
      <div class="diag-line"><span class="diag-label">Source prix</span><span class="diag-val ${_isRealLike() && wsConnectedCount>0 ? 'ok' : 'neu'}">${currentSource}</span></div>
      <div class="diag-line"><span class="diag-label">Dernier fetch</span><span class="diag-val ${updateCls}">${_diagSimMode ? 'prix simulés · sim' : 'il y a '+(ageSinceUpdate<0?'—':ageSinceUpdate+'s')}</span></div>
      ${_isRealLike() ? `<div class="diag-line"><span class="diag-label">WS connectés (${S.tradingMode})</span><span class="diag-val ${wsConnectedCount === wsActiveTotal && wsActiveTotal>0 ? 'ok' : wsConnectedCount > 0 ? 'warn' : 'crit'}">${wsConnectedCount} / ${wsActiveTotal}</span></div>` : ''}
      ${_isRealLike() ? (function(){
        const upPct     = (typeof _getWsUptimePct === 'function') ? _getWsUptimePct() : 100;
        const discCount = _wsStability.disconnects ? _wsStability.disconnects.length : 0;
        const cls       = upPct >= 95 ? 'ok' : upPct >= 80 ? 'warn' : 'crit';
        return `<div class="diag-line"><span class="diag-label">Stabilité (1h)</span><span class="diag-val ${cls}">${upPct}% · ${discCount} coupure(s)</span></div>`;
      })() : ''}
      <div class="diag-line"><span class="diag-label">Régime détecté</span><span class="diag-val neu">${regime.toUpperCase()}</span></div>
      <div class="diag-line"><span class="diag-label">Paires figées (STALE)</span><span class="diag-val ${staleCls}">${_diagSimMode ? 'N/A · simulation' : staleCount + ' / ' + Object.keys(pairStates).length}</span></div>
      ${(!_diagSimMode && staleCount > 0) ? '<div class="diag-note">⚠ Des paires n\'ont pas reçu de nouvelles bougies depuis 2+ min</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">🤖 AGENTS</div>
      <div class="diag-line"><span class="diag-label">Total actifs</span><span class="diag-val neu">${totalAg}</span></div>
      <div class="diag-line"><span class="diag-label">Saturés (fitness ≥1900)</span><span class="diag-val ${satCls}">${saturated}</span></div>
      <div class="diag-line" onclick="_showBrokenAgentsDetail()" style="cursor:pointer;" title="Voir le détail"><span class="diag-label">Cassés (fitness ≤80) <span style="font-size:9px;opacity:.6;">(détail →)</span></span><span class="diag-val ${brokenCls}">${broken}</span></div>
      <div class="diag-line"><span class="diag-label">Plein régime</span><span class="diag-val ${fpCls}">${fpMode}</span></div>
      ${saturated > totalAg * 0.5 ? '<div class="diag-note">⚠ Trop d\'agents saturés : la sélection ne discrimine plus</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">💎 CAPITAL</div>
      <div class="diag-line"><span class="diag-label">Trading actif</span><span class="diag-val neu">$${trading.toFixed(2)}</span></div>
      <div class="diag-line"><span class="diag-label">Emprunté (levier)</span><span class="diag-val ${usageCls}">$${borrowed.toFixed(2)}</span></div>
      <div class="diag-line"><span class="diag-label">% capacité levier</span><span class="diag-val ${usageCls}">${usagePct.toFixed(0)}%</span></div>
      <div class="diag-line"><span class="diag-label">Caisse libre</span><span class="diag-val ok">$${cash.toFixed(2)}</span></div>
      <div class="diag-line"><span class="diag-label">Réserve fiscale</span><span class="diag-val neu">$${(S.fiscalReserveAccount||0).toFixed(2)}</span></div>
      ${usagePct > 80 ? '<div class="diag-note">⚠ Levier proche du max : risque de liquidation si marché contre toi</div>' : ''}
    </div>

    <div class="diag-section">
      <div class="diag-sec-title">⚙️ RÉPARTITION BÉNÉFICES</div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.4;">
        Après chaque trade gagnant, le bénéfice net (après frais + taxes) est réparti :
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="font-size:10px;color:var(--ice);font-weight:700;min-width:55px;">Caisse</span>
        <input type="range" id="splitSlider" min="0" max="100" step="5" value="${S.profitSplitCaissePct || 30}"
               oninput="_updateSplitPct(this.value)"
               style="flex:1;height:6px;accent-color:var(--ice);">
        <span id="splitVal" style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--ice);min-width:40px;text-align:right;">${S.profitSplitCaissePct || 30}%</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--t3);">
        <span>→ Caisse (sécurisé) : <span id="splitCaissePreview" style="color:var(--up);font-weight:700;">${S.profitSplitCaissePct || 30}%</span></span>
        <span>→ Trading (re-investi) : <span id="splitTradingPreview" style="color:var(--gold);font-weight:700;">${100 - (S.profitSplitCaissePct || 30)}%</span></span>
      </div>
      <div class="diag-note" style="margin-top:6px;">Les taxes sont toujours envoyées vers la réserve fiscale (comptabilité propre). Les pertes restent dans Trading.</div>
    </div>
  `;

  overlay.classList.add('open');
}
window.openDiagnostic = openDiagnostic;


// ──────────────────────────────────────────────────────────────────────
// Modal de gestion des snapshots
// Création auto du DOM au premier appel, puis simple rafraîchissement
// ──────────────────────────────────────────────────────────────────────
function openSnapshotsModal() {
  const snaps = listInternalSnapshots();
  const modal = document.getElementById('snapshotsModal');

  if (!modal) {
    // Création initiale du modal
    const m = document.createElement('div');
    m.id = 'snapshotsModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid rgba(56,212,245,.3);border-radius:16px;padding:20px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--ice);">📸 SNAPSHOTS</div>
          <button onclick="document.getElementById('snapshotsModal').remove()" style="background:none;border:none;color:var(--t2);font-size:22px;cursor:pointer;padding:0 8px;">×</button>
        </div>
        <button onclick="window._snapshotActionCreate()" style="width:100%;padding:14px;background:rgba(56,212,245,.12);border:1px solid rgba(56,212,245,.4);border-radius:10px;color:var(--ice);font-family:var(--font-mono);font-weight:700;font-size:13px;cursor:pointer;margin-bottom:12px;">
          📸 CRÉER UN SNAPSHOT MAINTENANT
        </button>
        <div id="snapshotsList" style="display:flex;flex-direction:column;gap:10px;"></div>
        <div style="margin-top:14px;font-size:10px;color:var(--t3);line-height:1.5;">
          💡 Les snapshots sont conservés sur l'appareil. Max 3 emplacements (le plus ancien est remplacé).
        </div>
      </div>
    `;
    document.body.appendChild(m);
  }

  _refreshSnapshotsList();
}
window.openSnapshotsModal = openSnapshotsModal;


// ──────────────────────────────────────────────────────────────────────
// Modal "Pourquoi cette position ?"
// Affiche la raison d'ouverture, les indicateurs du marché au moment du
// trade, les agents qui ont voté et les objectifs TP/SL.
// ──────────────────────────────────────────────────────────────────────
function openWhyModal(posId) {
  const pos = (S.openPositions || []).find(p => p.id === posId);
  if (!pos) {
    showToast('Position introuvable', 1500, 'warn');
    return;
  }

  const ps      = S.pairStates[pos.pair];
  const cfg     = PAIRS[pos.pair] || {};
  const body    = document.getElementById('whyBody');
  const overlay = document.getElementById('whyOverlay');
  if (!body || !overlay) return;

  // ── Durée de la position ──
  const since    = pos.entryTs ? Math.round((Date.now() - pos.entryTs) / 1000) : 0;
  const sinceStr = since > 3600 ? Math.floor(since/3600) + 'h ' + Math.floor((since%3600)/60) + 'm'
                 : since > 60   ? Math.floor(since/60)   + 'm ' + (since%60) + 's'
                 : since + 's';

  // ── Prix entrée et P&L actuel ──
  const curPrice    = ps ? ps.price : 0;
  const entryPrice  = pos.entryPrice || 0;
  const dec         = cfg.dec >= 4 ? cfg.dec : 2;
  const pnlPct      = entryPrice > 0
    ? (pos.side === 'long' ? (curPrice - entryPrice) / entryPrice * 100 : (entryPrice - curPrice) / entryPrice * 100)
    : 0;
  const pnlUsd      = pos.stakeUsdt * pnlPct / 100;
  const pnlCol      = pnlPct >= 0 ? 'var(--up)' : 'var(--down)';

  // ── Régime et indicateurs au moment de l'ouverture ──
  const regime = ps ? (ps.regime    || 'calm') : 'calm';
  const rsi    = ps ? (ps.rsi14     || '—')   : '—';
  const mom    = ps ? ((ps.momentum || 0) * 100).toFixed(2) + '%' : '—';
  const lmsr   = ps ? (lmsrP(ps) * 100).toFixed(0) + '%' : '—';

  // ── Agents qui ont voté ──
  const agents     = pos._openAgents || [];
  const bullAgents = agents.filter(a => (a.score || 0) > 0);
  const bearAgents = agents.filter(a => (a.score || 0) < 0);

  // ── Raison principale ──
  const reason = pos._openReason || (pos.auto ? 'Consensus agents + LMSR' : 'Ouverture manuelle');

  body.innerHTML = `
    <!-- Paire + statut -->
    <div class="why-section">
      <div class="why-section-title">📍 Position</div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Paire</span>
        <span class="why-metric-val">${pos.pair}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Direction</span>
        <span class="why-metric-val" style="color:${pos.side==='long'?'var(--up)':'var(--down)'}">
          ${pos.side==='long'?'↑ LONG':'↓ SHORT'}
        </span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Ouverte depuis</span>
        <span class="why-metric-val">${sinceStr}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">P&L actuel</span>
        <span class="why-metric-val" style="color:${pnlCol}">
          ${pnlPct>=0?'+':''}${pnlPct.toFixed(2)}% (${pnlUsd>=0?'+':''}$${pnlUsd.toFixed(2)})
        </span>
      </div>
    </div>

    <!-- Raison principale -->
    <div class="why-section">
      <div class="why-section-title">🧠 Raison d'ouverture</div>
      <div class="why-reason">${reason}</div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Mode</span>
        <span class="why-metric-val">${pos.auto ? '🤖 Bot automatique' : '🎛️ Manuel'}</span>
      </div>
    </div>

    <!-- Indicateurs du marché au moment de l'ouverture -->
    <div class="why-section">
      <div class="why-section-title">📊 Indicateurs du marché</div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Régime</span>
        <span class="why-metric-val">${regime.toUpperCase()}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">RSI 14</span>
        <span class="why-metric-val">${rsi}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Momentum</span>
        <span class="why-metric-val">${mom}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">LMSR (conviction)</span>
        <span class="why-metric-val">${lmsr}</span>
      </div>
      <div class="why-metric-row">
        <span class="why-metric-lbl">Prix entrée</span>
        <span class="why-metric-val">${entryPrice.toFixed(dec)}</span>
      </div>
    </div>

    <!-- Agents qui ont voté -->
    ${agents.length > 0 ? `
    <div class="why-section">
      <div class="why-section-title">🤝 Agents ayant voté (${agents.length})</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:6px;">
        ${bullAgents.length} haussiers · ${bearAgents.length} baissiers
      </div>
      <div class="why-agent-list">
        ${agents.map(a => `
          <span class="why-agent ${(a.score||0)>0?'bull':'bear'}">
            ${a.emoji||''} ${a.name} ${(a.score>=0?'+':'')}${(a.score||0).toFixed(2)}
          </span>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- TP/SL si définis -->
    ${(pos.tp || pos.sl) ? `
    <div class="why-section">
      <div class="why-section-title">🎯 Objectifs</div>
      ${pos.tp ? `<div class="why-metric-row">
        <span class="why-metric-lbl">Take Profit</span>
        <span class="why-metric-val" style="color:var(--up)">${pos.tp.toFixed(dec)}</span>
      </div>` : ''}
      ${pos.sl ? `<div class="why-metric-row">
        <span class="why-metric-lbl">Stop Loss</span>
        <span class="why-metric-val" style="color:var(--down)">${pos.sl.toFixed(dec)}</span>
      </div>` : ''}
    </div>` : ''}
  `;

  overlay.classList.add('open');
}
window.openWhyModal = openWhyModal;
