// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09f2-bricks-man.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// UI Bricks Man — buildManBricks + updateManBricks (vue manuelle).
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


function buildManBricks() {
  const grid = document.getElementById('manBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.createElement('div');
    brick.className = 'man-brick';
    brick.id        = 'manbrick_' + pairKey;
    brick.setAttribute('data-pair', pair);
    brick.style.setProperty('--accent', cfg.color);
    brick.onclick = () => openManDetail(pair);

    brick.innerHTML = `
      <canvas class="pb-spark-bg" id="mbspark_${pairKey}" width="140" height="44"></canvas>
      <span class="mb-badge" id="mbbadge_${pairKey}">PRÉT</span>
      <div>
        <div class="mb-head">
          <span class="mb-sym">${cfg.sym}</span>
          <span class="mb-dot"></span>
        </div>
        <div class="mb-price" id="mbpx_${pairKey}">—</div>
      </div>
      <div>
        <div class="mb-suggest" id="mbsug_${pairKey}">
          <span class="mb-suggest-side hold">—</span> · mise $—
        </div>
        <div class="mb-pnl" id="mbpnl_${pairKey}">
          <span class="mb-idle">Prêt à trader</span>
        </div>
      </div>
    `;
    grid.appendChild(brick);
  });
}
window.buildManBricks = buildManBricks;


// ──────────────────────────────────────────────────────────────────────
// Rafraîchissement des briques "Manuel"
// Affiche soit la position manuelle active, soit la suggestion du bot
// ──────────────────────────────────────────────────────────────────────
function updateManBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.getElementById('manbrick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl    = document.getElementById('mbpx_'    + pairKey);
    const sugEl   = document.getElementById('mbsug_'   + pairKey);
    const pnlEl   = document.getElementById('mbpnl_'   + pairKey);
    const badgeEl = document.getElementById('mbbadge_' + pairKey);

    // État pause
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'man-brick paused';
      return;
    }

    // Prix + %24h
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24    = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // Sparkline de fond
    if (ps.candles && ps.candles.length >= 2) {
      _drawSparkline('mbspark_' + pairKey, ps.candles, cfg.color, true);
    }

    // Suggestion du bot basée sur LMSR
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    let suggestedSide      = 'hold';
    let suggestedSideLabel = 'HOLD';
    if      (prob > 0.55) { suggestedSide = 'bull'; suggestedSideLabel = '↑ LONG'; }
    else if (prob < 0.45) { suggestedSide = 'bear'; suggestedSideLabel = '↓ SHORT'; }

    // Position manuelle sur cette paire ?
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);

    if (manualPos) {
      // Position manuelle active
      const pnlUsd  = manualPos.pnlUsdt || 0;
      const pnlPct  = manualPos.pnl     || 0;
      const isWin   = pnlUsd >= 0;
      const side    = manualPos.side === 'long' ? '↑ LONG' : '↓ SHORT';
      const sideCls = manualPos.side === 'long' ? 'has-pos-long' : 'has-pos-short';
      brick.className = 'man-brick ' + sideCls;

      if (badgeEl) badgeEl.textContent = side;

      if (sugEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign   = pnlUsd >= 0 ? '+' : '';
        sugEl.innerHTML = `<span style="color:var(--t2);">Mise $${(manualPos.stakeUsdt || 0).toFixed(0)}</span> · <span style="color:${pnlCol};font-weight:700;">${sign}${pnlPct.toFixed(2)}%</span>`;
      }

      if (pnlEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign   = pnlUsd >= 0 ? '+' : '';
        pnlEl.innerHTML = `<span style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)}</span>`;
      }
    } else {
      // En veille — suggestion du bot
      brick.className = 'man-brick';
      if (badgeEl) badgeEl.textContent = 'PRÉT';

      // Calcul de la mise suggérée selon conviction + ATR
      const atr        = ps.atr || 0.01;
      const conviction = Math.abs(prob - 0.5) * 2;
      const baseStake  = Math.max(10, Math.round((S.tradingAccount || 100) * 0.05));   // 5% par défaut
      const suggStake  = Math.min(baseStake * (1 + conviction), (S.tradingAccount || 100) * 0.15);

      if (sugEl) {
        const sideClass = suggestedSide;
        sugEl.innerHTML = `<span class="mb-suggest-side ${sideClass}">${suggestedSideLabel}</span> · mise $${suggStake.toFixed(0)}`;
      }

      if (pnlEl) {
        const convPct = (conviction * 100).toFixed(0);
        pnlEl.innerHTML = `<span style="font-size:9px;color:var(--t3);">Conviction ${convPct}%</span>`;
      }
    }
  });
}
window.updateManBricks = updateManBricks;


// ──────────────────────────────────────────────────────────────────────
// Construction initiale des briques "Paires" (vue détaillée avec TP bar)
// ──────────────────────────────────────────────────────────────────────
