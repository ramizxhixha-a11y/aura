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
        <div class="ab-pos" id="abpos_${pairKey}" style="display:none;"></div>
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
// Rafraîchissement des briques "Action" à chaque battement (1 s)
// [CARTES · 05/10/2026] remarques de Rams (capture du 05/10 00:35) : les cartes « n'affichent pas le réel en pourcentages, du moins pas
// assez vite en live », « n'affichent pas si trade auto ou manu » (DOT : une position MANUELLE montrée « 🔒 LONG », comme une carte bot),
// « pas le prix misé non plus ». Ce qui était faux :
//  · le % à côté du prix = ps.pnl24h, écrit par DEUX sources de sens différents : le 24 h de CoinGecko (~8 s) et, en EV / RE, la variation
//    des 60 bougies du mode (08, 15 h en 15 min) à chaque passage → le chiffre sautait entre deux mesures ; désormais : le vrai 24 h, recalculé
//    EN DIRECT sur ps.price à chaque battement (02 _ref24Pct : prix d'il y a 24 h, Binance ou CoinGecko) — AA garde son ps.pnl24h (prix simulés) ;
//  · prix tronqués à l'entier (DOT « 1 », EUR « 1 », AVAX « 11 ») : un mouvement de 4 % ne se voyait pas → chiffres significatifs (_abFmtPx) ;
//  · une position ouverte : ni MAN / AUTO lisible, ni mise, ni P&L → « 👤 MAN ↑ LONG » / « 🤖 AUTO ↑ LONG », ligne « mise », P&L % et $ en direct
//    (même calcul que renderPositions 02 : exposition × variation, perte bornée à la mise comme closePosition) ;
//  · sans position : « 🤖 BUY / SELL » sortaient du LMSR seul (> 0,6 / < 0,4, seuils à la main) alors que les bots décident sur la décision
//    commune → la carte dit HOLD (aucune action en cours) et montre la force de la DÉCISION COMMUNE (10f ps._dc, comme la fiche MAN) ;
//  · rafraîchie 1 battement sur 2 → à chaque battement (08) ; fond (courbe) et point RSI gardent leur rythme (1 sur 2).
// ──────────────────────────────────────────────────────────────────────
function _abFmtPx(pair, px) {
  px = Number(px);
  if (!isFinite(px) || px <= 0) return '—';
  if (px >= 1000) return Math.round(px).toLocaleString();
  if (px >= 10) return px.toFixed(2);
  if (px >= 1) return px.toFixed(4);
  return px.toFixed(Math.min(10, Math.max(4, 3 - Math.floor(Math.log10(px)))));
}
window._abFmtPx = _abFmtPx;
// % de la carte : le vrai 24 h en direct (EV / RE) ; AA (prix simulés) : la variation simulée d'avant
function _abChg24(pair, ps) {
  if (S.tradingMode !== 'sim' && typeof _ref24Pct === 'function') { const v = _ref24Pct(pair, ps.price); if (v !== null && isFinite(v)) return { v: v, real: true }; }
  return { v: Number(ps.pnl24h) || 0, real: false };
}
// P&L en direct d'une position (exposition × variation ; perte bornée à la mise propre, comme closePosition)
function _abPosPnl(pos, px) {
  const e = Number(pos.entryPrice); px = Number(px);
  if (!(e > 0) || !(px > 0)) return { pct: 0, usd: 0 };
  const pct = (pos.side === 'long' ? (px - e) / e : (e - px) / e) * 100;
  const exp = Number(pos.totalExposure) || Number(pos.stakeUsdt) || 0;
  return { pct: pct, usd: Math.max(-(Number(pos.stakeUsdt) || 0), exp * pct / 100) };
}
let _abSlowTurn = 0;
function updateActionBricks() {
  const slow = (_abSlowTurn++ % 2) === 0;   // courbe de fond + point RSI : 1 passage sur 2 (même coût qu'avant)
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
    const posEl  = document.getElementById('abpos_'  + pairKey);

    // ── État PAUSED ──
    if (S._pausedPairs && S._pausedPairs[pair]) {
      brick.className = 'action-brick sig-hold paused';
      brick.removeAttribute('data-pos');
      if (posEl) { posEl.textContent = ''; posEl.style.display = 'none'; }
      if (pxEl)   pxEl.textContent   = _abFmtPx(pair, ps.price);
      if (sigEl)  sigEl.textContent  = '⏸ PAUSE';
      if (lmsrEl) lmsrEl.textContent = '—';
      if (wrEl)   { wrEl.textContent = '—'; wrEl.className = 'ab-wr'; }
      if (trEl)   trEl.textContent   = '';
      return;
    }

    // Prix + vraie variation 24 h, en direct
    if (pxEl) {
      const ch  = _abChg24(pair, ps);
      const col = ch.v >= 0 ? 'var(--up)' : 'var(--down)';
      pxEl.innerHTML = `${_abFmtPx(pair, ps.price)} <span style="color:${col};margin-left:3px;">${ch.v >= 0 ? '+' : ''}${ch.v.toFixed(2)}%</span>`;
      pxEl.title = ch.real ? 'Variation réelle sur 24 h, en direct' : 'Variation sur la fenêtre de bougies (prix simulés)';
    }

    // Décision commune de la paire (10f ps._dc) ; le LMSR seulement si elle n'a jamais été calculée (comme la fiche MAN)
    const _dc = (ps._dc && typeof ps._dc.C === 'number' && isFinite(ps._dc.C)) ? ps._dc.C : null;
    const C   = _dc !== null ? Math.max(-1, Math.min(1, _dc)) : (((typeof lmsrP === 'function' ? lmsrP(ps) : 0.5) - 0.5) * 2);

    // Position ouverte sur cette paire (une par paire) : la tienne (👤 MAN) ou celle d'un bot (🤖 AUTO)
    const pos = (S.openPositions || []).find(p => p && p.pair === pair) || null;

    if (pos) {
      const isMan = pos.auto !== true;
      const long  = pos.side === 'long';
      brick.className = long ? 'action-brick sig-buy has-pos-long' : 'action-brick sig-sell has-pos-short';
      brick.setAttribute('data-pos', isMan ? 'man' : 'auto');
      if (sigEl) sigEl.textContent = (isMan ? '👤 MAN ' : '🤖 AUTO ') + (long ? '↑ LONG' : '↓ SHORT');
      const pl = _abPosPnl(pos, ps.price), up = pl.usd >= 0, stk = Number(pos.stakeUsdt) || 0, xp = Number(pos.totalExposure) || 0;
      if (posEl) {
        posEl.textContent = 'mise $' + stk.toFixed(2) + (xp > stk + 0.005 ? ' · levier ×' + (xp / stk).toFixed(1) : '');
        posEl.title = 'Entrée ' + _abFmtPx(pair, pos.entryPrice) + (xp > stk + 0.005 ? ' · exposition $' + xp.toFixed(2) : '');
        posEl.style.display = '';
      }
      if (lmsrEl) { lmsrEl.textContent = (pl.pct >= 0 ? '+' : '') + pl.pct.toFixed(2) + '%'; lmsrEl.style.color = up ? 'var(--up)' : 'var(--down)'; lmsrEl.title = 'P&L de la position, en direct'; }
      if (wrEl)   { wrEl.textContent = (up ? '+' : '−') + '$' + Math.abs(pl.usd).toFixed(2); wrEl.className = 'ab-wr ' + (up ? 'good' : 'bad'); }
      if (trEl)   { trEl.textContent = ''; }
    } else {
      brick.className = 'action-brick sig-hold';
      brick.removeAttribute('data-pos');
      if (posEl) { posEl.textContent = ''; posEl.style.display = 'none'; }
      if (sigEl) sigEl.textContent = 'HOLD';
      if (lmsrEl) {
        lmsrEl.style.color = '';
        lmsrEl.textContent = (C > 0 ? '↑' : C < 0 ? '↓' : '·') + (Math.abs(C) * 100).toFixed(0) + '%';
        lmsrEl.title = _dc !== null ? 'Force de la décision commune' : 'LMSR (décision commune pas encore calculée)';
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
    }

    // ── Sparkline de fond (couleur : sens de la position, sinon de la décision commune) ──
    if (slow && ps.candles && ps.candles.length >= 2) {
      const d = pos ? (pos.side === 'long' ? 1 : -1) : Math.sign(C);
      _drawSparkline('abspark_' + pairKey, ps.candles, d > 0 ? '#00e87a' : d < 0 ? '#ff3d6b' : cfg.color, d >= 0);
    }

    // ── RSI dot adaptatif ──
    const rsiDot = slow ? document.getElementById('abrsi_' + pairKey) : null;
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

    // ── Intensité selon la force de la décision commune ──
    if (Math.abs(C) > 0.6) brick.setAttribute('data-conv', 'strong');
    else brick.removeAttribute('data-conv');

    // ── Marqueur visuel paire sous contrôle manuel ──
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
