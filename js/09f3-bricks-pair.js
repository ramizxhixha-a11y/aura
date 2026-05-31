// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09f3-bricks-pair.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// UI Bricks Pair — buildPairBricks + updatePairBricks + ac2UpdateXInd
// (vue par paire avec TP/SL et indicateurs).
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


function buildPairBricks() {
  const grid = document.getElementById('pairBrickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.createElement('div');
    brick.className = 'pair-brick brick-idle';
    brick.id        = 'brick_' + pairKey;
    brick.setAttribute('data-pair', pair);
    brick.style.setProperty('--accent', cfg.color);
    brick.onclick = () => openPairDetail(pair);

    brick.innerHTML = `
      <canvas class="pb-spark-bg" id="pbspark_${pairKey}" width="140" height="44"></canvas>
      <div>
        <div class="pb-head">
          <span class="pb-sym">${cfg.sym}</span>
          <span class="pb-dot"></span>
        </div>
        <div class="pb-price" id="pbpx_${pairKey}">—</div>
      </div>
      <div>
        <div class="pb-status" id="pbst_${pairKey}"></div>
        <div class="pb-pnl" id="pbpnl_${pairKey}"></div>
        <div class="pb-countdown" id="pbcd_${pairKey}"></div>
      </div>
      <div class="pb-tp-bar" style="display:none;" id="pbtpbar_${pairKey}">
        <div class="pb-tp-fill" id="pbtpfill_${pairKey}" style="width:0%;"></div>
      </div>
    `;
    grid.appendChild(brick);
  });
}
window.buildPairBricks = buildPairBricks;


// ──────────────────────────────────────────────────────────────────────
// Rafraîchissement des briques "Paires"
// Affichage différencié selon état : position active / en veille / paused
// ──────────────────────────────────────────────────────────────────────
function updatePairBricks() {
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/', '_');
    const brick   = document.getElementById('brick_' + pairKey);
    if (!brick) return;
    const ps = S.pairStates[pair];
    if (!ps) return;

    const pxEl  = document.getElementById('pbpx_'  + pairKey);
    const stEl  = document.getElementById('pbst_'  + pairKey);
    const pnlEl = document.getElementById('pbpnl_' + pairKey);
    const cdEl  = document.getElementById('pbcd_'  + pairKey);

    // Prix (toujours affiché)
    if (pxEl) {
      const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : Math.floor(ps.price).toLocaleString();
      const pnl24    = ps.pnl24h || 0;
      const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${priceStr} <span style="color:${pnl24Col};margin-left:3px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>`;
    }

    // État paused (priorité absolue)
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'pair-brick brick-paused';
      if (stEl)  stEl.innerHTML  = '<span style="color:var(--t3);">Sous-performance</span>';
      if (pnlEl) pnlEl.innerHTML = '<span class="pb-idle-pnl">Désactivée auto</span>';
      if (cdEl)  cdEl.textContent = '';
      return;
    }

    // Position ouverte sur cette paire ?
    const pos = (S.openPositions || []).find(p => p.pair === pair);

    if (pos) {
      // ── Position active ──
      const sideLabel = pos.side === 'long' ? 'LONG' : 'SHORT';
      const sideArrow = pos.side === 'long' ? '↑' : '↓';
      const sideCol   = pos.side === 'long' ? 'var(--up)' : 'var(--down)';
      const stakeStr  = '$' + (pos.stakeUsdt || 0).toFixed(0);
      const pnlUsd    = pos.pnlUsdt || 0;
      const pnlPct    = pos.pnl     || 0;
      const isWin     = pnlUsd >= 0;

      // Classe d'état pour pulsation visuelle
      let stateCls = 'brick-idle';
      if      (pos.side === 'long'  && isWin)  stateCls = 'brick-long-win';
      else if (pos.side === 'long'  && !isWin) stateCls = 'brick-long-loss';
      else if (pos.side === 'short' && isWin)  stateCls = 'brick-short-win';
      else                                      stateCls = 'brick-short-loss';
      brick.className = 'pair-brick ' + stateCls;

      // Statut
      if (stEl) {
        stEl.innerHTML = `<span class="pb-side" style="color:${sideCol};">${sideArrow}${sideLabel}</span><span class="pb-sep">·</span><span class="pb-stake">${stakeStr}</span>`;
      }

      // P&L
      if (pnlEl) {
        const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
        const sign   = pnlUsd >= 0 ? '+' : '';
        pnlEl.innerHTML = `
          <span style="color:${pnlCol};">${sign}$${pnlUsd.toFixed(2)}</span>
          <span class="pb-pnl-pct">${sign}${pnlPct.toFixed(2)}%</span>
        `;
      }

      // Countdown : temps écoulé + temps restant estimé selon conviction
      if (cdEl) {
        const elapsedMs  = Date.now() - (pos.openedAt || pos.entryTs || Date.now());
        const elapsedMin = Math.floor(elapsedMs / 60000);
        const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
        const elapsedStr = elapsedMin + ':' + String(elapsedSec).padStart(2, '0');

        const conv       = pos.conviction || 0.4;
        const maxCycles  = Math.ceil(8 / Math.max(0.1, conv));
        const cyclesUsed = pos._holdCycles || 0;
        const cyclesLeft = Math.max(0, maxCycles - cyclesUsed);
        const remainingMs= cyclesLeft * 160000;
        const remMin     = Math.floor(remainingMs / 60000);

        cdEl.innerHTML = `⏱ ${elapsedStr} <span style="color:var(--t3);opacity:.5;">·</span> ~${remMin}m`;
      }
    } else {
      // ── En veille ──
      brick.className = 'pair-brick brick-idle';
      if (stEl)  stEl.innerHTML  = '<span style="color:var(--t3);">En veille</span>';
      if (pnlEl) pnlEl.innerHTML = '<span class="pb-idle-pnl">Aucune position</span>';
      if (cdEl)  cdEl.textContent = '';
    }

    // ── Sparkline de fond ──
    if (ps.candles && ps.candles.length >= 2) {
      const sparkColor = pos
        ? (pos.pnlUsdt >= 0
            ? (pos.side === 'long' ? '#00e87a' : '#ff3d6b')
            : '#f5c842')
        : cfg.color;
      _drawSparkline('pbspark_' + pairKey, ps.candles, sparkColor, pos ? pos.pnlUsdt >= 0 : true);
    }

    // ── Barre de progression TP (si position active) ──
    const tpBar  = document.getElementById('pbtpbar_'  + pairKey);
    const tpFill = document.getElementById('pbtpfill_' + pairKey);
    if (pos && tpBar && tpFill) {
      const pnlPct   = pos.pnl || 0;
      // Estimation de la distance TP selon conviction (approx 2-4%)
      const conv     = pos.conviction || 0.4;
      const tpTarget = Math.max(1.5, conv * 4);
      const progress = Math.max(-100, Math.min(100, (pnlPct / tpTarget) * 100));
      tpBar.style.display = 'block';
      tpFill.style.width  = Math.abs(progress) + '%';
      tpFill.classList.toggle('negative', progress < 0);
    } else if (tpBar) {
      tpBar.style.display = 'none';
    }
  });
}
window.updatePairBricks = updatePairBricks;


// ──────────────────────────────────────────────────────────────────────
// Mise à jour des indicateurs détaillés d'une brique Action
// Sparkline, RSI, momentum, régime, streak, volume.
// Appelée quand l'utilisateur ouvre la vue détaillée d'une paire.
// ──────────────────────────────────────────────────────────────────────
function ac2UpdateXInd(pair) {
  const k  = pair.replace('/', '_');
  const ps = S.pairStates[pair];
  if (!ps) return;

  // Extraction des closes depuis les bougies (source de données NEXUS)
  const closes = (ps.candles || []).map(c => c.c).filter(v => typeof v === 'number');

  // ── Sparkline ──
  const spark = document.getElementById('ac2_spark_' + k);
  if (spark && closes.length >= 5) {
    const ph  = closes.slice(-20);
    const W   = spark.clientWidth  || 300;
    const H   = spark.clientHeight || 28;
    const DPR = window.devicePixelRatio || 1;
    spark.width  = W * DPR;
    spark.height = H * DPR;

    const x = spark.getContext('2d');
    x.scale(DPR, DPR);
    x.clearRect(0, 0, W, H);

    const mn  = Math.min(...ph);
    const mx  = Math.max(...ph);
    const rng = mx - mn || 1;
    const cfg = PAIRS[pair] || { color: '#38d4f5' };

    const grad = x.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, cfg.color + '40');
    grad.addColorStop(1, cfg.color + '00');

    // Remplissage dégradé
    x.beginPath();
    ph.forEach((p, i) => {
      const px = (i / (ph.length - 1)) * W;
      const py = H - ((p - mn) / rng) * (H - 2) - 1;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    });
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.closePath();
    x.fillStyle = grad;
    x.fill();

    // Ligne supérieure avec glow
    x.beginPath();
    ph.forEach((p, i) => {
      const px = (i / (ph.length - 1)) * W;
      const py = H - ((p - mn) / rng) * (H - 2) - 1;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    });
    x.strokeStyle  = cfg.color;
    x.lineWidth    = 1.5;
    x.shadowColor  = cfg.color;
    x.shadowBlur   = 6;
    x.stroke();
    x.shadowBlur   = 0;
  }

  // ── Volume ──
  const volVal  = document.getElementById('ac2_volval_'  + k);
  const volFill = document.getElementById('ac2_volfill_' + k);
  if (volVal && volFill) {
    const recentCandles = (ps.candles || []).slice(-24);
    const vSum          = recentCandles.reduce((s, c) => s + (c.v || 0), 0);
    const v             = vSum > 0 ? vSum * (ps.price || 1) : ((ps.price || 1) * 1000 * (0.5 + Math.random()));
    const display       = v >= 1e9 ? (v/1e9).toFixed(1) + 'B'
                        : v >= 1e6 ? (v/1e6).toFixed(1) + 'M'
                        : v >= 1e3 ? (v/1e3).toFixed(0) + 'K'
                        : v.toFixed(0);
    volVal.textContent = '$' + display;
    const pct = Math.min(100, Math.max(15, (v / ((ps.price || 1) * 1e5)) * 100));
    volFill.style.width = pct + '%';
  }

  // ── RSI 14 (calcul Wilder avec lissage exponentiel) ──
  const rsiEl = document.getElementById('ac2_rsi_' + k);
  if (rsiEl && closes.length >= 15) {
    const cl = closes.slice(-20);
    let g = 0, l = 0;
    for (let i = 1; i <= 14; i++) {
      const d = cl[i] - cl[i-1];
      d > 0 ? g += d : l -= d;
    }
    let ag = g / 14, al = l / 14;
    for (let i = 15; i < cl.length; i++) {
      const d = cl[i] - cl[i-1];
      ag = (ag * 13 + (d > 0 ?  d : 0)) / 14;
      al = (al * 13 + (d < 0 ? -d : 0)) / 14;
    }
    const rsi = al ? 100 - (100 / (1 + ag / al)) : 100;
    rsiEl.textContent  = rsi.toFixed(0);
    rsiEl.style.color  = rsi > 70 ? 'var(--down)'
                       : rsi < 30 ? 'var(--up)'
                       : rsi > 55 ? 'var(--gold)'
                       : rsi < 45 ? 'var(--ice)'
                       : 'var(--t2)';
  }

  // ── Momentum (variation des 5 dernières bougies vs les 5 précédentes) ──
  const momEl = document.getElementById('ac2_mom_' + k);
  if (momEl && closes.length >= 10) {
    const ph2    = closes;
    const recent = ph2.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older  = ph2.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    const momPct = ((recent - older) / older) * 100;
    const arr    = momPct > 0.3 ? '↗' : momPct < -0.3 ? '↘' : '→';
    momEl.textContent = arr + ' ' + (momPct >= 0 ? '+' : '') + momPct.toFixed(2) + '%';
    momEl.style.color = momPct > 0.3  ? 'var(--up)'
                      : momPct < -0.3 ? 'var(--down)'
                      : 'var(--t3)';
  }

  // ── Régime de marché ──
  const regEl = document.getElementById('ac2_regmini_' + k);
  if (regEl) {
    const reg = typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm';
    const map = {
      bull:          { txt: 'BULL',   c: 'var(--up)' },
      bear:          { txt: 'BEAR',   c: 'var(--down)' },
      calm:          { txt: 'CALM',   c: 'var(--ice)' },
      volatile:      { txt: 'VOL',    c: 'var(--gold)' },
      volatile_bull: { txt: 'V.BULL', c: 'var(--up)' },
      volatile_bear: { txt: 'V.BEAR', c: 'var(--down)' }
    };
    const m = map[reg] || map.calm;
    regEl.textContent = m.txt;
    regEl.style.color = m.c;
  }

  // ── Streak de wins/losses sur les trades clôturés ──
  const streakEl = document.getElementById('ac2_streak_' + k);
  if (streakEl) {
    const closedTrades = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
    if (!closedTrades.length) {
      streakEl.textContent = '—';
      streakEl.style.color = 'var(--t3)';
    } else {
      let cur = 0, dir = null;
      for (let i = closedTrades.length - 1; i >= 0; i--) {
        const win = closedTrades[i].pnlUsdt > 0;
        if (dir === null)   { dir = win; cur = 1; }
        else if (dir === win) cur++;
        else break;
      }
      streakEl.textContent = (dir ? 'W' : 'L') + cur;
      streakEl.style.color = dir ? 'var(--up)' : 'var(--down)';
    }
  }
}
window.ac2UpdateXInd = ac2UpdateXInd;


// ──────────────────────────────────────────────────────────────────────
// Long-press sur une brique active → confirmation de fermeture forcée
// Délai 600ms, uniquement sur les briques avec position ouverte
// ──────────────────────────────────────────────────────────────────────
