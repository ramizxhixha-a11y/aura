// banc-n94.js — [GO N° 94 · 20/11/2026] (ETAT n° 94) retirer la paire À L'ÉCRAN (S.activePair) la laissait là : 02 ACFG() rendait undefined, 08 renderMarket
// (cfg.color) et 02 drawMobileChart levaient à chaque battement de l'écran Marché, renderAll s'arrêtait à renderMarket, 04 forceTrade (« ⚡ FORCER ») visait la
// paire retirée. Même panne au lancement si BTC/USDT est retirée (S.activePair n'est pas sauvé : il repart de 'BTC/USDT', 02) et par la carte du marché d'une
// paire retirée (03 drawMiniCharts ne l'enlève pas ; son appui appelle 08 selectPair). Remède : 11 _activePairKeepLive (removePair, _replayPairChanges) ;
// 08 selectPair refuse une paire hors PAIRS.
// Chaque essai R fait tourner le VRAI texte de l'app en vm (02 AP, ACFG, drawMobileChart, pxTxt ; 04 forceTrade ; 08 renderMarket, selectPair, renderAll ;
// 11 removePair, _replayPairChanges, _pairLog, _activePairKeepLive) et le compare au code d'AVANT, rendu par banc-fixtures/sans-n94.js : sur le code d'avant,
// R1 et R3 à R7 ÉCHOUENT (témoin : `node banc-n94.js --temoin` les rejoue sur le code d'avant ; R7 parce que _activePairKeepLive n'y existe pas).
// Données (app) : backup du pont du 20/11 22:30 — 12 paires vivantes (GBP/USDT retirée), EV à l'écran avec 11 positions de la voix sur 11 paires : la seule
// paire qu'on peut retirer aujourd'hui est EUR/USDT (aucune position, aucun mode) ; BTC 58 678,54 (−5,44 % sur 24 h), EUR 1,0973, ETH 1 610,36.
//   R1  EUR/USDT à l'écran, VRAI removePair('EUR/USDT') → BTC/USDT (1re paire vivante) à l'écran ; renderAll va jusqu'au bout (renderChain appelé) ;
//       le journal dit « à l'écran : BTC/USDT » ; 5 battements de l'écran Marché (VRAI renderMarket) sans exception, prix et libellé de BTC, puce BTC active
//   R2  retirer une paire qui n'est PAS à l'écran : S.activePair inchangé, journal sans « à l'écran », et l'état (PAIRS, removedPairs, EV actives, 3 portefeuilles)
//       IDENTIQUE au code d'avant ; refus (position ouverte, paire déjà retirée, 2 paires) : identiques au code d'avant, rien ne bouge
//   R3  lancement : S.activePair = 'BTC/USDT' (02), BTC/USDT dans S.removedPairs → VRAI _replayPairChanges → ETH/USDT à l'écran, renderMarket sans exception ;
//       BTC/USDT non retirée (le cas de l'app aujourd'hui) → BTC/USDT reste
//   R4  carte d'une paire retirée (VRAI selectPair('EUR/USDT') après le retrait) → refusé : la paire à l'écran ne change pas, ni rendu, ni toast ;
//       une paire vivante → comme avant (paire posée, rendus, toast « Paire: … »)
//   R5  VRAI 02 drawMobileChart après le retrait de la paire à l'écran : sans exception, dessine BTC/USDT
//   R6  VRAI 04 forceTrade('long') après le retrait de la paire à l'écran → l'ouverture vise BTC/USDT, jamais EUR/USDT (la paire retirée)
//   R7  remplaçante : la 1re paire de PAIRS qui a son état dans le portefeuille à l'écran ; aucune → la 1re de PAIRS ; paire vivante à l'écran → rien ne change
//   G   garde : banc-fixtures/n94-retours.json redonne 08 et 11 du commit 121562e au caractère près ; les autres fichiers js/ et le HTML (au jeton près) au texte
//       de 121562e (empreintes : banc-fixtures/n94-gardes.json)
//   C   écrivains de S.activePair (tous les scripts chargés + HTML en ligne + native-bridge) : 02 (valeur de départ), 08 selectPair, 11 _activePairKeepLive ;
//       S.activePair n'est toujours pas sauvé (09b1, manifeste de 09b2)
// Ce qui se voit sur la vraie page (backup chargé, écran Marché, EUR/USDT retirée) : node rejeu/sonde_n94.js --root . --avant <copie> --backup <b>
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const TEMOIN = process.argv.includes('--temoin');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sansN94 = require('./banc-fixtures/sans-n94.js');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); if (!m) return null;
  const start = m.index + m[1].length, st = [];
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
const need = (src, n) => { const t = fnSrc(src, n); assert.ok(t, 'fonction absente : ' + n); return t; };
const F = { s02: 'js/02-state-init.js', s04: 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', s08: 'js/08-learning-history-render.js', s11: 'js/11-gestion-paires.js' };
const NEW = {}; Object.keys(F).forEach(k => { NEW[k] = rd(F[k]); });
const OLD = {}; Object.keys(F).forEach(k => { OLD[k] = sansN94(NEW[k], F[k]); });   // le code d'avant (sur BANC_ROOT = copie d'avant : identique au code lu)
const CODE = TEMOIN ? OLD : NEW;

// ── DOM minimal (getElementById ne trouve que ce qui est accroché) ──
function mkDom() {
  const els = {};
  const reg = e => (function w(x) { if (x.id) els[x.id] = x; x.children.forEach(w); })(e);
  const unreg = e => (function w(x) { if (x.id && els[x.id] === x) delete els[x.id]; x.children.forEach(w); })(e);
  function mk(tag) {
    const e = { tagName: tag || 'div', id: '', style: {}, dataset: {}, className: '', children: [], parent: null, textContent: '', _h: '', attrs: {}, onclick: null,
      setAttribute(k, v) { this.attrs[k] = String(v); },
      get innerHTML() { return this._h; }, set innerHTML(v) { this._h = String(v); },
      get firstChild() { return this.children[0] || null; },
      appendChild(c) { c.parent = this; this.children.push(c); if (this._on) on(c); return c; },
      insertBefore(c, ref) { c.parent = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); if (this._on) on(c); return c; },
      insertAdjacentElement(p, c) { const par = this.parent || root; c.parent = par; par.children.push(c); on(c); return c; },
      remove() { if (this.parent) { const i = this.parent.children.indexOf(this); if (i >= 0) this.parent.children.splice(i, 1); } unreg(this); (function off(x) { x._on = false; x.children.forEach(off); })(this); } };
    return e;
  }
  const on = e => { (function w(x) { x._on = true; x.children.forEach(w); })(e); reg(e); };
  const root = mk('body'); root._on = true;
  ['mktPrice', 'mktPairLabel', 'mktPnl24h', 'candle-wrap-top', 'mkPairBar', 'agentConsensusMkt'].forEach(id => { const e = mk(); e.id = id; root.appendChild(e); });
  const draws = [];
  const g2d = new Proxy({ fillText: (t) => draws.push(String(t)) }, { get: (o, k) => (k in o ? o[k] : () => {}), set: () => true });
  const cv = mk('canvas'); cv.id = 'mobileChart'; cv.getContext = () => g2d; const par = mk(); par.offsetWidth = 360; par.appendChild(cv); root.appendChild(par);
  return { els, root, mk, draws, doc: { getElementById: id => els[id] || null, createElement: t => mk(t) } };
}

// ── (app) backup du pont du 20/11 22:30 ──
const ORDRE = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'PEPE/USDT', 'EUR/USDT', 'BNB/USDT'];
const PX = { 'BTC/USDT': [58678.54, -5.440520587772249], 'ETH/USDT': [1610.36, -7.982583454281571], 'EUR/USDT': [1.0973, -0.17285298398835636] };
const COL = { 'BTC/USDT': ['#f7931a', 0], 'ETH/USDT': ['#627eea', 0], 'XRP/USDT': ['#00aae4', 4], 'SOL/USDT': ['#9945ff', 2], 'DOGE/USDT': ['#c3a634', 4], 'ADA/USDT': ['#0033ad', 4],
  'AVAX/USDT': ['#e84142', 2], 'LINK/USDT': ['#2a5ada', 2], 'DOT/USDT': ['#e6007a', 3], 'PEPE/USDT': ['#b48cff', 6], 'EUR/USDT': ['#6fa8ff', 3], 'BNB/USDT': ['#b48cff', 2], 'GBP/USDT': ['#5cd6c0', 3] };
const cfgOf = p => ({ sym: p.split('/')[0], color: COL[p][0], dec: COL[p][1], startPrice: 1, vol: (PX[p] ? PX[p][0] : 1) * 0.01, minP: 0, maxP: 1e9 });
function psOf(p) {
  const [px, d24] = PX[p] || [1 + ORDRE.indexOf(p), 0];
  const candles = []; for (let i = 0; i < 60; i++) { const c = px * (1 + Math.sin(i / 5) * 0.01); candles.push({ o: c, h: c * 1.002, l: c * 0.998, c: c * 1.001 }); }
  return { price: px, pnl24h: d24, candles, stake: 10, qYes: 130, qNo: 130, trades: [], totalTrades: 0 };
}
const VOIX = ['ADA', 'AVAX', 'BNB', 'BTC', 'DOGE', 'DOT', 'ETH', 'LINK', 'SOL', 'XRP', 'PEPE'].map((s, i) => ({ id: 'pv' + i, pair: s + '/USDT', side: 'short', auto: false, _voix: 'tendance', stakeUsdt: 18 }));
function wallets(o) {
  const all = ORDRE.concat(['GBP/USDT']);
  const mk = (pairs, pos, trading) => ({ tradingAccount: trading, openPositions: pos, pairStates: Object.fromEntries(pairs.map(p => [p, psOf(p)])) });
  return { sim: mk(all, o.posSim || [], 117.45), paperReal: mk(o.evPairs || all, o.posEV || VOIX.slice(), 2158.62), real: mk(all.filter(p => p !== 'GBP/USDT'), [], 1145.42) };
}
function world(code, o) {
  o = o || {};
  const D = mkDom();
  const calls = { toast: [], chain: 0, save: 0, open: [], analysis: 0, chart: 0, decErr: [] };
  const PAIRS = {}; (o.pairs || ORDRE).forEach(p => { PAIRS[p] = cfgOf(p); });
  const S = { tradingMode: o.mode || 'paperReal', activePair: o.active || 'BTC/USDT', tf: '15m', botAutoMode: true, agents: [], chainLog: [], brainLog: [],
    customPairs: { 'PEPE/USDT': cfgOf('PEPE/USDT'), 'EUR/USDT': cfgOf('EUR/USDT'), 'GBP/USDT': cfgOf('GBP/USDT'), 'BNB/USDT': cfgOf('BNB/USDT') },
    removedPairs: (o.removed || ['GBP/USDT']).slice(), paperRealActivePairs: Object.fromEntries(ORDRE.map(p => [p, true])), walletStore: wallets(o) };
  ['pairStates', 'openPositions', 'tradingAccount'].forEach(k => Object.defineProperty(S, k, { get() { return S.walletStore[S.tradingMode][k]; }, set(v) { S.walletStore[S.tradingMode][k] = v; }, enumerable: false }));
  const ctx = { S, PAIRS, Math, Number, Object, Array, String, JSON, Date, isFinite, parseFloat, parseInt, isNaN, Error, Set, Map, Intl, console: { log() {}, warn() {} },
    document: D.doc, window: {},
    showToast: (m) => calls.toast.push(String(m)), saveState: () => { calls.save++; }, setTimeout: () => 0,
    makePairState: (cfg) => psOf('BTC/USDT'),
    renderHome() {}, renderPairPnl() {}, buildAgentCards() {}, patchAgentCards() {}, buildGovCards() {}, patchGovCards() {},
    renderChain() { calls.chain++; }, updateIntelBanner() {}, updateStreakBadge() {}, renderAgentHeatmap() {}, renderCorrMatrix() {},
    renderAnalysis() { calls.analysis++; }, renderAnalyticsPanel() {},
    autoOpenPosition: (pair, side, stake) => { calls.open.push({ pair, side, stake }); }, _stakeFloor: () => 10 };
  ctx.window = ctx; ctx.window._decErr = (e) => calls.decErr.push(String(e && e.message || e));
  vm.createContext(ctx);
  require('./banc-fixtures/px-vm.js')(ctx, ROOT);
  const src = [need(code.s02, 'AP'), need(code.s02, 'ACFG'), need(code.s02, 'drawMobileChart'), need(code.s04, 'forceTrade'),
    need(code.s08, 'renderMarket'), need(code.s08, 'selectPair'), need(code.s08, 'renderAll'),
    need(code.s11, '_replayPairChanges'), need(code.s11, 'removePair'), need(code.s11, '_pairLog')];
  const keep = fnSrc(code.s11, '_activePairKeepLive'); if (keep) src.push(keep);
  vm.runInContext(src.join('\n'), ctx, { filename: 'n94' });
  ctx.drawMobileChart = vm.runInContext('drawMobileChart', ctx);   // 08 selectPair l'appelle
  const run = (expr) => vm.runInContext(expr, ctx);
  // un battement de l'écran Marché (08 simTick, S.currentPage === 2) : renderMarket, puis tous les 3 drawMobileChart, tous les 5 renderAnalysis
  const tick = (n) => { const errs = []; for (let k = 1; k <= n; k++) { try { run('renderMarket()'); if (k % 3 === 0) run('drawMobileChart()'); } catch (e) { errs.push(e.constructor.name + ': ' + e.message); } } return errs; };
  return { ctx, S, PAIRS, D, calls, run, tick };
}
const snapOf = w => JSON.stringify({ pairs: Object.keys(w.PAIRS), removed: w.S.removedPairs, ev: w.S.paperRealActivePairs, ws: w.S.walletStore, active: w.S.activePair });
const pillActive = w => { const b = w.D.els.pairSelWrap; return b ? b.children.filter(c => /\bactive\b/.test(c.className)).map(c => c.attrs['data-pair']) : null; };

console.log('banc-n94 — ' + (TEMOIN ? 'TÉMOIN : code d\'AVANT (banc-fixtures/sans-n94.js)' : 'code livré') + ' · racine ' + ROOT);

T('R1 · EUR/USDT à l\'écran, VRAI removePair → BTC/USDT à l\'écran, renderAll jusqu\'au bout, journal « à l\'écran : BTC/USDT », 5 battements sans exception', () => {
  const w = world(CODE, { active: 'EUR/USDT' });
  assert.deepStrictEqual(w.tick(3), [], 'avant le retrait, EUR/USDT à l\'écran se rend sans exception');
  const r = w.run('removePair("EUR/USDT")');
  assert.strictEqual(r.ok, true, 'retrait accepté (EUR/USDT n\'a aucune position)');
  assert.ok(!w.PAIRS['EUR/USDT'] && w.S.removedPairs.includes('EUR/USDT'), 'EUR/USDT retirée');
  assert.strictEqual(w.S.activePair, 'BTC/USDT', 'la paire à l\'écran est restée ' + w.S.activePair);
  assert.strictEqual(w.calls.chain, 1, 'renderAll s\'est arrêté avant renderChain (renderMarket a levé)');
  assert.ok(w.S.chainLog.some(l => /Paire retirée : EUR\/USDT .*à l’écran : BTC\/USDT$/.test(l.desc)), 'journal : ' + JSON.stringify(w.S.chainLog.map(l => l.desc)));
  const errs = w.tick(5);
  assert.deepStrictEqual(errs, [], 'battements de l\'écran Marché : ' + errs.join(' | '));
  assert.strictEqual(w.D.els.mktPairLabel.textContent, 'BTC / USDT');
  assert.strictEqual(w.D.els.mktPrice.textContent, w.run('pxTxt("BTC/USDT", 58678.54)'));
  assert.deepStrictEqual(pillActive(w), ['BTC/USDT'], 'puce active');
  assert.ok(!w.D.els.pairSelWrap.children.some(c => c.attrs['data-pair'] === 'EUR/USDT'), 'puce EUR/USDT encore là');
});

T('R2 · retrait d\'une paire PAS à l\'écran et refus : état identique au code d\'avant, paire à l\'écran inchangée', () => {
  const cas = [
    { o: { active: 'ETH/USDT' }, p: 'EUR/USDT', ok: true },
    { o: { active: 'EUR/USDT' }, p: 'BTC/USDT', ok: false },                                   // position de la voix sur BTC (EV)
    { o: { active: 'EUR/USDT', posSim: [{ id: 's1', pair: 'EUR/USDT', side: 'long' }] }, p: 'EUR/USDT', ok: false },   // position en AA : refus (n'importe quel mode)
    { o: { active: 'EUR/USDT' }, p: 'GBP/USDT', ok: false },                                   // déjà retirée
    { o: { active: 'EUR/USDT', pairs: ['BTC/USDT', 'EUR/USDT'], posEV: [] }, p: 'EUR/USDT', ok: false },   // minimum 2 paires
  ];
  cas.forEach((c, i) => {
    const a = world(CODE, c.o), b = world(OLD, c.o);
    const ra = JSON.stringify(a.run('removePair(' + JSON.stringify(c.p) + ')')), rb = JSON.stringify(b.run('removePair(' + JSON.stringify(c.p) + ')'));
    assert.strictEqual(JSON.parse(ra).ok, c.ok, 'cas ' + i + ' : ' + ra);
    assert.strictEqual(ra, rb, 'cas ' + i + ' : réponse différente du code d\'avant');
    assert.strictEqual(snapOf(a), snapOf(b), 'cas ' + i + ' : état différent du code d\'avant');
    assert.strictEqual(a.S.activePair, c.o.active, 'cas ' + i + ' : paire à l\'écran changée');
    assert.deepStrictEqual(a.S.chainLog.map(l => l.desc), b.S.chainLog.map(l => l.desc), 'cas ' + i + ' : journal');
    assert.ok(!a.S.chainLog.some(l => /à l’écran/.test(l.desc)), 'cas ' + i + ' : « à l\'écran » sans changement');
    assert.deepStrictEqual(a.tick(3), [], 'cas ' + i + ' : battements');
  });
});

T('R3 · lancement : BTC/USDT retirée → VRAI _replayPairChanges met ETH/USDT à l\'écran, renderMarket sans exception ; sinon BTC/USDT reste', () => {
  const w = world(CODE, { removed: ['GBP/USDT', 'BTC/USDT'], posEV: [] });
  w.PAIRS['GBP/USDT'] = cfgOf('GBP/USDT');   // au lancement PAIRS repart de la constante (02) et des ajouts (11) : le rejeu retire
  assert.strictEqual(w.S.activePair, 'BTC/USDT', 'départ (02)');
  w.run('_replayPairChanges()');
  assert.ok(!w.PAIRS['BTC/USDT'] && !w.PAIRS['GBP/USDT'], 'paires retirées au rejeu');
  assert.strictEqual(w.S.activePair, 'ETH/USDT', 'paire à l\'écran après le rejeu : ' + w.S.activePair);
  assert.deepStrictEqual(w.tick(5), [], 'battements');
  assert.strictEqual(w.D.els.mktPairLabel.textContent, 'ETH / USDT');
  assert.deepStrictEqual(w.calls.decErr, [], 'erreurs avalées');
  const v = world(CODE, {}); v.PAIRS['GBP/USDT'] = cfgOf('GBP/USDT');   // l'app aujourd'hui : GBP seule retirée
  v.run('_replayPairChanges()');
  assert.strictEqual(v.S.activePair, 'BTC/USDT');
  const vb = world(OLD, {}); vb.PAIRS['GBP/USDT'] = cfgOf('GBP/USDT'); vb.run('_replayPairChanges()');
  assert.strictEqual(snapOf(v), snapOf(vb), 'rejeu sans paire à l\'écran retirée : identique au code d\'avant');
});

T('R4 · carte d\'une paire retirée : VRAI selectPair refuse (ni paire, ni rendu, ni toast) ; une paire vivante comme avant', () => {
  const w = world(CODE, { active: 'ETH/USDT' });
  w.run('removePair("EUR/USDT")');
  const t0 = w.calls.toast.length, a0 = w.calls.analysis;
  let err = null; try { w.run('selectPair("EUR/USDT")'); } catch (e) { err = e; }
  assert.strictEqual(err, null, 'selectPair a levé : ' + (err && err.message));
  assert.strictEqual(w.S.activePair, 'ETH/USDT', 'la paire retirée est revenue à l\'écran');
  assert.strictEqual(w.calls.toast.length, t0, 'toast'); assert.strictEqual(w.calls.analysis, a0, 'rendu');
  assert.deepStrictEqual(w.tick(5), [], 'battements');
  const b = world(OLD, { active: 'ETH/USDT' }), n = world(CODE, { active: 'ETH/USDT' });
  b.run('selectPair("SOL/USDT")'); n.run('selectPair("SOL/USDT")');
  assert.strictEqual(n.S.activePair, 'SOL/USDT');
  assert.deepStrictEqual(n.calls.toast, b.calls.toast); assert.deepStrictEqual(n.calls.toast, ['Paire: SOL/USDT']);   // (tableaux du banc, même royaume)
  assert.strictEqual(n.calls.analysis, 1); assert.deepStrictEqual(pillActive(n), ['SOL/USDT']); assert.strictEqual(snapOf(n), snapOf(b));
});

T('R5 · VRAI 02 drawMobileChart après le retrait de la paire à l\'écran : sans exception, dessine BTC/USDT', () => {
  const w = world(CODE, { active: 'EUR/USDT' });
  w.run('removePair("EUR/USDT")');
  w.D.draws.length = 0;
  let err = null; try { w.run('drawMobileChart()'); } catch (e) { err = e; }
  assert.strictEqual(err, null, 'drawMobileChart a levé : ' + (err && err.message));
  assert.ok(w.D.draws.includes('BTC/USDT · 15m'), 'libellé : ' + w.D.draws.slice(-2).join(' | '));
});

T('R6 · VRAI 04 forceTrade(« long ») après le retrait de la paire à l\'écran : l\'ouverture vise BTC/USDT, jamais EUR/USDT', () => {
  const w = world(CODE, { active: 'EUR/USDT', mode: 'sim' });
  w.run('removePair("EUR/USDT")');
  w.run('forceTrade("long")');
  assert.deepStrictEqual(w.calls.open.map(c => c.pair), ['BTC/USDT'], 'paire visée : ' + JSON.stringify(w.calls.open));
});

T('R7 · remplaçante : 1re paire de PAIRS avec son état dans le portefeuille à l\'écran ; aucune → 1re de PAIRS ; paire vivante → rien', () => {
  const w = world(CODE, { active: 'EUR/USDT', evPairs: ORDRE.filter(p => p !== 'BTC/USDT'), posEV: [] });
  w.run('removePair("EUR/USDT")');
  assert.strictEqual(w.S.activePair, 'ETH/USDT', 'BTC/USDT n\'a pas d\'état dans l\'EV : ' + w.S.activePair);
  assert.deepStrictEqual(w.tick(3), []);
  const k = world(CODE, { active: 'EUR/USDT', evPairs: [], posEV: [] });
  k.run('delete PAIRS["EUR/USDT"]');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(k.run('_activePairKeepLive()'))), { from: 'EUR/USDT', to: 'BTC/USDT' });
  const v = world(CODE, { active: 'SOL/USDT' });
  assert.strictEqual(v.run('_activePairKeepLive()'), null); assert.strictEqual(v.S.activePair, 'SOL/USDT');
  const s = world(CODE, { active: 'EUR/USDT' }); delete s.ctx.S; assert.strictEqual(s.run('typeof S'), 'undefined'); assert.strictEqual(s.run('_activePairKeepLive()'), null);
});

T('G · garde : n94-retours redonne 08 et 11 de 121562e au caractère près ; les autres fichiers js/ et le HTML au texte de 121562e', () => {
  const A = { 'js/08-learning-history-render.js': 'dad75731357decaf', 'js/11-gestion-paires.js': '9c5179b84cae2ea3' };
  Object.keys(A).forEach(f => { const s = rd(f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sansN94(s, f)), A[f], f + ' : autre chose a bougé'); });
  const H = require('./banc-fixtures/n94-gardes.json');   // empreintes de 121562e : tous les js/ sauf 08 et 11 ; le HTML au jeton près (DOC_V et ses ?v=)
  Object.keys(H).forEach(f => {
    if (f === 'AURA8_v118.html#jeton') { const h = rd('AURA8_v118.html').replace(/\n<script src="js\/18-fibonacci-lecture\.js\?v=[0-9a-z]+"><\/script><!-- \[GO FIBONACCI[^\n]*-->/, '').replace(/\n<script src="js\/18b-liberer\.js\?v=[0-9a-z]+"><\/script><!-- \[GO LIBÉRER[^\n]*-->/, '').replace(/\n<script src="js\/18c-gains-paires\.js\?v=[0-9a-z]+"><\/script><!-- \[GO LIBÉRER[^\n]*-->/, ''), j = /var DOC_V = '([^']+)'/.exec(h)[1]; assert.strictEqual(h16(h.split(j).join('JETON')), H[f], 'HTML : autre chose que le jeton a changé'); }
    else assert.strictEqual(h16(rd(f)), H[f], f + ' a changé');
  });
  assert.ok(Object.keys(H).length >= 55, 'gardes : ' + Object.keys(H).length);
});

T('C · écrivains de S.activePair : 02 (départ), 08 selectPair, 11 _activePairKeepLive ; toujours pas sauvé (09b1, manifeste 09b2)', () => {
  const html = rd('AURA8_v118.html');
  const files = [...html.matchAll(/<script[^>]*src="(js\/[^"?]+)/g)].map(m => m[1]).concat(['js/native-bridge.js']).filter((f, i, a) => a.indexOf(f) === i && fs.existsSync(path.join(ROOT, f)) && /\.js$/.test(f));
  const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const hits = [];
  files.map(f => [f, rd(f)]).concat([['HTML (en ligne)', inline]]).forEach(([f, s]) => s.split('\n').forEach((l, i) => {
    const code = l.replace(/\/\/.*$/, '');
    if (/\bactivePair\s*=(?!=)/.test(code) || /\bactivePair\s*:/.test(code)) hits.push(f + ':' + (i + 1));
  }));
  const where = hits.map(h => h.replace(/:\d+$/, ''));
  assert.deepStrictEqual(where.sort(), ['js/02-state-init.js', 'js/08-learning-history-render.js', 'js/11-gestion-paires.js'], 'écrivains : ' + hits.join(', '));
  assert.ok(files.length >= 55, 'scripts lus : ' + files.length);
  assert.ok(!/\bactivePair\b/.test(rd('js/09b1-build-snapshot.js')), '09b1 sauve activePair');
  const man = /window\._APPLYSNAP_MANIFEST = (\[[^\]]*\])/.exec(rd('js/09b2-save-load.js'));
  assert.ok(man && !JSON.parse(man[1].replace(/'/g, '"')).includes('activePair'), 'manifeste');
});

console.log('\n' + (fail ? '❌ ' + pass + '/' + (pass + fail) + ' tests passés — ' + fail + ' ÉCHEC(S)' : '✅ ' + pass + '/' + pass + ' tests passés'));
if (TEMOIN) { console.log('(témoin : R1 et R3 à R7 doivent échouer sur le code d\'avant ; R2, G et C passent : ils lisent le dépôt ou comparent au code d\'avant)'); process.exit(0); }
process.exit(fail ? 1 : 0);
