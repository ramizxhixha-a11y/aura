// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09f1-bricks-action.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// UI Bricks Action — buildActionBricks + updateActionBricks (vue principale).
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION UI Bricks
// Rendu des cartes (briques) du home : Action, Manuel, Paires.
// Chaque type a un build* (création initiale) et un update* (rafraîchissement).
//  - buildActionBricks / updateActionBricks   : vue principale "Actions"
//  - buildManBricks    / updateManBricks      : vue "Manuel"
//  - buildPairBricks   / updatePairBricks     : vue "Paires" (avec TP/SL)
//  - ac2UpdateXInd(pair)       : RSI/momentum/régime/streak pour brique Action
//  - _attachLongPressToBricks  : long-press pour fermer une position
//  - _updateAutoBarCounters    : compteurs des barres auto/man
//  - _restoreAutoBarState      : restaure l'état ouvert/fermé des barres
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Construction initiale des briques "Action" (vue principale)
// ──────────────────────────────────────────────────────────────────────
function buildActionBricks() {
  const grid = document.getElementById('actionBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.createElement('div');
    brick.className = 'action-brick sig-hold';
    brick.id        = 'actbrick_' + pairKey;
    brick.setAttribute('data-pair', pair);
    brick.style.setProperty('--accent', cfg.color);
    brick.onclick = () => openPairDetail(pair);

    brick.innerHTML = `
      <canvas class="ab-spark-bg" id="abspark_${pairKey}" width="140" height="44"></canvas>
      <div>
        <div class="ab-head">
          <span class="ab-sym">${cfg.sym}</span>
          <span class="ab-dot"></span>
        </div>
        <div class="ab-price" id="abpx_${pairKey}">—</div>
      </div>
      <div>
        <div class="ab-signal" id="absig_${pairKey}">HOLD</div>
        <div class="ab-stats">
          <span class="ab-rsi-dot neutral" id="abrsi_${pairKey}"></span>
          <span class="ab-lmsr" id="ablmsr_${pairKey}">—</span>
          <span class="ab-sep">·</span>
          <span class="ab-wr neutral" id="abwr_${pairKey}">— WR</span>
          <span class="ab-sep">·</span>
          <span id="abtr_${pairKey}" style="color:var(--t3);">0 tr</span>
        </div>
      </div>
    `;
    grid.appendChild(brick);
  });
}
window.buildActionBricks = buildActionBricks;


// ──────────────────────────────────────────────────────────────────────
// Rafraîchissement des briques "Action" à chaque tick
// Met à jour prix, signal, LMSR, WR, RSI dot, sparkline, conviction.
// ──────────────────────────────────────────────────────────────────────
function updateActionBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.getElementById('actbrick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl   = document.getElementById('abpx_'   + pairKey);
    const sigEl  = document.getElementById('absig_'  + pairKey);
    const lmsrEl = document.getElementById('ablmsr_' + pairKey);
    const wrEl   = document.getElementById('abwr_'   + pairKey);
    const trEl   = document.getElementById('abtr_'   + pairKey);

    // ── État PAUSED ──
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'action-brick sig-hold paused';
      if (pxEl) {
        const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
        pxEl.textContent = priceStr;
      }
      if (sigEl)  sigEl.textContent  = '⏸ PAUSE';
      if (lmsrEl) lmsrEl.textContent = '—';
      if (wrEl)   { wrEl.textContent = '—'; wrEl.className = 'ab-wr'; }
      if (trEl)   trEl.textContent   = '';
      return;
    }

    // Prix + %24h
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24    = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // Probabilité LMSR (conviction du marché de prédiction interne)
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const pct  = prob * 100;

    // Positions ouvertes sur cette paire (manuel ou bot)
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    const botPos    = (S.openPositions || []).find(p => p.pair === pair && p.auto === true);

    // Détermination du signal et de la classe visuelle
    let sigText, brickCls;
    if (manualPos) {
      sigText  = (manualPos.side === 'long' ? '🔒 LONG' : '🔒 SHORT');
      brickCls = manualPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (botPos) {
      sigText  = (botPos.side === 'long' ? '🟢 LONG' : '🔴 SHORT');
      brickCls = botPos.side === 'long' ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
    } else if (prob > 0.6) {
      sigText  = '🤖 BUY';
      brickCls = 'action-brick sig-buy';
    } else if (prob < 0.4) {
      sigText  = '🤖 SELL';
      brickCls = 'action-brick sig-sell';
    } else {
      sigText  = 'HOLD';
      brickCls = 'action-brick sig-hold';
    }
    brick.className = brickCls;

    if (sigEl) sigEl.textContent = sigText;

    // Affichage LMSR conviction
    if (lmsrEl) {
      const arrow = pct >= 50 ? '↑' : '↓';
      lmsrEl.textContent = arrow + pct.toFixed(0) + '%';
    }

    // Win rate
    if (wrEl) {
      const pWin = ps.totalTrades > 0 ? Math.round(ps.winTrades / ps.totalTrades * 100) : null;
      if (pWin !== null) {
        wrEl.textContent = pWin + '% WR';
        wrEl.className   = 'ab-wr ' + (pWin >= 60 ? 'good' : pWin >= 40 ? 'mid' : 'bad');
      } else {
        wrEl.textContent = '— WR';
        wrEl.className   = 'ab-wr';
      }
    }

    // Compteur de trades
    if (trEl) {
      trEl.textContent = (ps.totalTrades || 0) + ' tr';
      trEl.style.color = 'var(--t3)';
    }

    // ── Sparkline de fond ──
    if (ps.candles && ps.candles.length >= 2) {
      let sparkColor = cfg.color;
      if      (prob > 0.6) sparkColor = '#00e87a';
      else if (prob < 0.4) sparkColor = '#ff3d6b';
      _drawSparkline('abspark_' + pairKey, ps.candles, sparkColor, prob >= 0.5);
    }

    // ── RSI dot adaptatif ──
    const rsiDot = document.getElementById('abrsi_' + pairKey);
    if (rsiDot) {
      const rsi = _computeRSI14(ps.candles);
      if (rsi !== null) {
        let rsiCls = 'neutral';
        if      (rsi < 30) rsiCls = 'oversold';    // signal LONG potentiel
        else if (rsi > 70) rsiCls = 'overbought';  // signal SHORT potentiel
        rsiDot.className = 'ab-rsi-dot ' + rsiCls;
        rsiDot.title     = 'RSI ' + rsi.toFixed(0);
      }
    }

    // ── Intensité adaptative selon conviction ──
    const convStrength = Math.abs(prob - 0.5) * 2;  // 0 à 1
    if (convStrength > 0.6) {
      brick.setAttribute('data-conv', 'strong');
    } else {
      brick.removeAttribute('data-conv');
    }

    // ── Marqueur visuel mode manuel ──
    if (_isPairManual(pair)) {
      brick.setAttribute('data-manual', '1');
      brick.style.setProperty('--accent', 'var(--ice)');
    } else {
      brick.removeAttribute('data-manual');
      brick.style.setProperty('--accent', cfg.color);
    }
  });
}
window.updateActionBricks = updateActionBricks;


// ──────────────────────────────────────────────────────────────────────
// Construction initiale des briques "Manuel"
// ──────────────────────────────────────────────────────────────────────
