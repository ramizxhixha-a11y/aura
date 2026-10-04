// banc-cartes.js — [CARTES · 05/10/2026] VERSION 20261005b
// Cartes « Actions en cours » sur le CODE RÉEL (fonctions extraites de 02, 08, 09f1 et exécutées en vm) : vrai 24 h en direct,
// position 👤 MAN / 🤖 AUTO avec mise et P&L en direct, prix lisibles, plus de BUY / SELL sortis du LMSR seul, rafraîchies à chaque battement.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
// Extrait « function name(...) { ... } » (niveau 0) en sautant chaînes, gabarits ${…} et commentaires (même outil que banc-manu).
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length;
  const st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return src.slice(start, i + 1); }
  }
  throw new Error('fin introuvable : ' + name);
}
const s02 = rd('js/02-state-init.js'), s08 = rd('js/08-learning-history-render.js'), s09f1 = rd('js/09f1-bricks-action.js'), css = rd('css/21b-v712-luminous-cards.css');

const PAIRS = { 'BTC/USDT': { sym: 'BTC', color: '#f7931a', dec: 0 }, 'DOT/USDT': { sym: 'DOT', color: '#e6007a', dec: 3 }, 'ETH/USDT': { sym: 'ETH', color: '#627eea', dec: 0 }, 'PEPE/USDT': { sym: 'PEPE', color: '#b48cff', dec: 6 } };
function mkEl(id) { const attrs = {}; return { id, style: { setProperty() {} }, textContent: '', innerHTML: '', title: '', className: '', setAttribute(k, v) { attrs[k] = String(v); }, removeAttribute(k) { delete attrs[k]; }, getAttribute(k) { return k in attrs ? attrs[k] : null; } }; }
function mkCtx(over) {
  const els = {};
  Object.keys(PAIRS).forEach(p => { const k = p.replace('/', '_'); ['actbrick_', 'abpx_', 'absig_', 'ablmsr_', 'abwr_', 'abtr_', 'abpos_', 'abrsi_'].forEach(x => { els[x + k] = mkEl(x + k); }); });
  els.openPnlBanner = mkEl('openPnlBanner');
  const calls = { spark: 0 };
  const S = Object.assign({
    tradingMode: 'paperReal', openPositions: [], _pausedPairs: {},
    pairStates: {
      'BTC/USDT': { price: 86223, pnl24h: 3.9, _dc: { C: 0.08, n: 10, ts: 0 }, totalTrades: 28, winTrades: 14, candles: [{ c: 1 }, { c: 2 }] },
      'DOT/USDT': { price: 1.2311, pnl24h: 2.37, _dc: { C: -0.2, n: 7, ts: 0 }, totalTrades: 35, winTrades: 18, candles: [{ c: 1 }, { c: 2 }] },
      'ETH/USDT': { price: 2702, pnl24h: 0.33, _dc: null, qYes: 30, qNo: 70, totalTrades: 0, winTrades: 0, candles: [] },
      'PEPE/USDT': { price: 0.00000428, pnl24h: 1.33, _dc: { C: 0, n: 3, ts: 0 }, totalTrades: 28, winTrades: 11, candles: [] }
    }
  }, over || {});
  const ctx = { S, PAIRS, Math, Number, Object, Array, String, JSON, Date, isFinite, console,
    document: { getElementById: id => els[id] || null },
    lmsrP: ps => ps.qYes / (ps.qYes + ps.qNo), _drawSparkline: () => { calls.spark++; }, _computeRSI14: () => 50, _isPairManual: () => false };
  ctx.window = ctx; ctx.els = els; ctx.calls = calls;
  vm.createContext(ctx);
  const ref = s02.match(/\nconst _ref24 = \{\};\n/); assert.ok(ref, 'const _ref24 dans 02');
  const slow = s09f1.match(/\nlet _abSlowTurn = 0;\n/); assert.ok(slow);
  vm.runInContext(ref[0] + slow[0] + [fnSrc(s02, '_ref24Set'), fnSrc(s02, '_ref24Pct'), fnSrc(s09f1, '_abFmtPx'), fnSrc(s09f1, '_abChg24'), fnSrc(s09f1, '_abPosPnl'),
    fnSrc(s09f1, 'updateActionBricks'), fnSrc(s08, 'renderOpenPnlBanner')].join('\n'), ctx);
  return ctx;
}
const run = (c, code) => vm.runInContext(code, c);
const E = (c, id) => c.els[id];

console.log('▶ banc-cartes');

T('K1 · vrai 24 h EN DIRECT : prix d\'il y a 24 h (Binance openPrice / CoinGecko) → variation recalculée sur ps.price à chaque passage ; périmée après 15 min', () => {
  const c = mkCtx();
  run(c, '_ref24Set("BTC/USDT", 86223 / 1.017, "coingecko")');
  run(c, 'updateActionBricks()');
  assert.ok(E(c, 'abpx_BTC_USDT').innerHTML.startsWith('86,223 <span') && E(c, 'abpx_BTC_USDT').innerHTML.includes('+1.70%</span>'), E(c, 'abpx_BTC_USDT').innerHTML);
  c.S.pairStates['BTC/USDT'].price = 86223 * 1.01; run(c, 'updateActionBricks()');
  assert.ok(E(c, 'abpx_BTC_USDT').innerHTML.includes('+2.72%'), 'le prix bouge, le % suit au passage suivant : ' + E(c, 'abpx_BTC_USDT').innerHTML);
  assert.strictEqual(E(c, 'abpx_BTC_USDT').title, 'Variation réelle sur 24 h, en direct');
  // sans référence (DOT) : repli sur ps.pnl24h, dit dans le titre
  assert.ok(E(c, 'abpx_DOT_USDT').innerHTML.includes('+2.37%') && /simulés|fenêtre/.test(E(c, 'abpx_DOT_USDT').title));
  // référence de plus de 15 min : plus lue ; AA (prix simulés) : jamais
  run(c, '_ref24["BTC/USDT"].t = Date.now() - 16 * 60000'); assert.strictEqual(run(c, '_ref24Pct("BTC/USDT", 86223)'), null);
  const a = mkCtx({ tradingMode: 'sim' }); run(a, '_ref24Set("BTC/USDT", 80000, "coingecko"); updateActionBricks()');
  assert.ok(E(a, 'abpx_BTC_USDT').innerHTML.includes('+3.90%'), 'AA : variation simulée');
  // 02 : les deux écrivains du 24 h posent la référence, ps.pnl24h (lu par le régime) inchangé
  assert.ok(s02.includes("      ps.pnl24h = change24h;\n      if (typeof _ref24Set === 'function') _ref24Set(pair, parseFloat(item.openPrice), 'binance');"), 'Binance');
  assert.ok(s02.includes("      ps.pnl24h         = change24h;\n      if (typeof _ref24Set === 'function' && isFinite(change24h) && change24h > -99 && realPrice > 0) _ref24Set(pair, realPrice / (1 + change24h / 100), 'coingecko');"), 'CoinGecko');
});

T('K2 · position : 👤 MAN ou 🤖 AUTO, mise, P&L % et $ en direct (exposition × variation, perte bornée à la mise)', () => {
  const c = mkCtx();
  c.S.openPositions = [
    { id: 'm', pair: 'DOT/USDT', side: 'long', auto: false, entryPrice: 1.2070, stakeUsdt: 82.1, totalExposure: 82.1 },
    { id: 'b', pair: 'BTC/USDT', side: 'short', auto: true, entryPrice: 85369, stakeUsdt: 40, totalExposure: 80 }];
  run(c, 'updateActionBricks()');
  assert.strictEqual(E(c, 'absig_DOT_USDT').textContent, '👤 MAN ↑ LONG');
  assert.strictEqual(E(c, 'actbrick_DOT_USDT').getAttribute('data-pos'), 'man');
  assert.strictEqual(E(c, 'abpos_DOT_USDT').textContent, 'mise $82.10'); assert.strictEqual(E(c, 'abpos_DOT_USDT').style.display, '');
  assert.strictEqual(E(c, 'abpos_DOT_USDT').title, 'Entrée 1.2070');
  assert.strictEqual(E(c, 'ablmsr_DOT_USDT').textContent, '+2.00%'); assert.strictEqual(E(c, 'abwr_DOT_USDT').textContent, '+$1.64');
  assert.strictEqual(E(c, 'absig_BTC_USDT').textContent, '🤖 AUTO ↓ SHORT');
  assert.strictEqual(E(c, 'actbrick_BTC_USDT').getAttribute('data-pos'), 'auto');
  assert.strictEqual(E(c, 'abpos_BTC_USDT').textContent, 'mise $40.00 · levier ×2.0');
  assert.strictEqual(E(c, 'ablmsr_BTC_USDT').textContent, '-1.00%'); assert.strictEqual(E(c, 'abwr_BTC_USDT').textContent, '−$0.80');
  // perte bornée à la mise (comme closePosition)
  c.S.pairStates['BTC/USDT'].price = 85369 * 2; run(c, 'updateActionBricks()'); assert.strictEqual(E(c, 'abwr_BTC_USDT').textContent, '−$40.00');
  // la position se ferme : la carte redevient une carte sans position
  c.S.openPositions = []; run(c, 'updateActionBricks()');
  assert.strictEqual(E(c, 'absig_DOT_USDT').textContent, 'HOLD'); assert.strictEqual(E(c, 'abpos_DOT_USDT').style.display, 'none');
  assert.strictEqual(E(c, 'actbrick_DOT_USDT').getAttribute('data-pos'), null);
  assert.ok(css.includes('.action-brick[data-pos="man"].has-pos-long, .action-brick[data-pos="man"].has-pos-short { border-color: rgba(56,212,245,0.6); }'), 'bord glace pour la tienne');
});

T('K3 · sans position : HOLD + force de la DÉCISION COMMUNE (plus de « 🤖 BUY / SELL » sortis du LMSR seul) ; LMSR seulement si elle manque, dit', () => {
  const c = mkCtx(); run(c, 'updateActionBricks()');
  assert.strictEqual(E(c, 'absig_DOT_USDT').textContent, 'HOLD');
  assert.strictEqual(E(c, 'ablmsr_DOT_USDT').textContent, '↓20%'); assert.strictEqual(E(c, 'ablmsr_DOT_USDT').title, 'Force de la décision commune');
  assert.strictEqual(E(c, 'absig_ETH_USDT').textContent, 'HOLD', 'LMSR 30 % : avant « 🤖 SELL »');
  assert.strictEqual(E(c, 'ablmsr_ETH_USDT').textContent, '↓40%'); assert.ok(/LMSR/.test(E(c, 'ablmsr_ETH_USDT').title));
  assert.strictEqual(E(c, 'ablmsr_PEPE_USDT').textContent, '·0%');
  assert.strictEqual(/BUY|SELL/.test(codeStrict(fnSrc(s09f1, 'updateActionBricks'))), false);
});

T('K4 · prix lisibles (plus d\'arrondi à l\'entier : DOT « 1 », EUR « 1 », AVAX « 11 »)', () => {
  const c = mkCtx(); run(c, 'updateActionBricks()');
  assert.ok(E(c, 'abpx_DOT_USDT').innerHTML.startsWith('1.2311 '));
  assert.ok(E(c, 'abpx_PEPE_USDT').innerHTML.startsWith('0.000004280 '), E(c, 'abpx_PEPE_USDT').innerHTML);
  assert.strictEqual(run(c, '_abFmtPx("X", 11.0912)'), '11.09'); assert.strictEqual(run(c, '_abFmtPx("X", 1.15983)'), '1.1598');
  assert.strictEqual(run(c, '_abFmtPx("X", 0.09535)'), '0.09535'); assert.strictEqual(run(c, '_abFmtPx("X", 0.2646)'), '0.2646');
});

T('K5 · à chaque battement (08) ; courbe et point RSI 1 passage sur 2 (même coût qu\'avant)', () => {
  assert.ok(codeStrict(s08).includes("  if(typeof updateActionBricks === 'function' && S.currentPage === 0) updateActionBricks();"));
  assert.strictEqual(codeStrict(s08).includes("tick % 2 === 0 && typeof updateActionBricks"), false);
  const c = mkCtx(); run(c, 'updateActionBricks(); updateActionBricks(); updateActionBricks(); updateActionBricks();');
  assert.strictEqual(c.calls.spark, 2 * 2, '2 paires avec bougies × 2 passages sur 4');
});

T('K6 · bandeau des positions ouvertes : 👤 MAN, mise et entrée (plus « @$1 » = prix tronqué lu comme la mise), P&L du même calcul que les cartes', () => {
  const c = mkCtx(); c.S.openPositions = [{ id: 'm', pair: 'DOT/USDT', side: 'long', auto: false, entryPrice: 1.2070, stakeUsdt: 82.1, totalExposure: 82.1, amount: 68 }];
  run(c, 'renderOpenPnlBanner()');
  const h = E(c, 'openPnlBanner').innerHTML;
  assert.ok(h.includes('👤 MAN') && h.includes('mise $82.10 · entrée 1.2070') && h.includes('+$1.64') && h.includes('(+2.00%)'), h.replace(/\s+/g, ' ').slice(0, 600));
  assert.strictEqual(h.includes('@$1'), false);
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
