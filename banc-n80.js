// banc-n80.js — [GO N° 80 · 15/11/2026] VERSION 20261115l · la poche tendance liquidée ferme l'EV AU PRIX DE LA LIQUIDATION (registre G2 n° 80)
// Le défaut (15b sync (b), 85e18ca) : quand la poche (js/15) liquide un SHORT (prix ×2 de SON entrée, x1 = 2 × x0 dans t.hist), 15b fermait la
// position EV tout de suite — `if (!liq && !fresh(pos.pair)) return;` laissait passer une liquidation sans prix frais — par closePosition, donc au
// ps.price de l'EV : le prix SAUVEGARDÉ quand le prix réel a plus de 5 min (tablette réveillée, app relancée), un prix de retour sinon.
// Le remède (15b seul) : une liquidation de la poche qui porte son prix (h.x1 > 0) ferme la position EV tout de suite AU PRIX DE LA LIQUIDATION
// (pos._forcedExitPx, la convention de 10f « stop côté exchange simulé », décision Rams du 26/09 : au stop, pas au prix de retour), effacé si la
// fermeture n'aboutit pas ; une ligne sans prix (d'avant) attend un prix frais, comme toute autre fermeture de la voix.
// Chaque essai fait tourner le VRAI texte de l'app en vm : 02 (openPosition, closePosition, recordFees, _posLatent…) et 15b entier.
// ÉCHOUE sur le code d'avant      BANC_ROOT=<copie du commit 85e18ca> node banc-n80.js       (N1, N2, N3, N4, N6, N7b)
//   N1  prix réel périmé (> 5 min), ps.price de l'EV sauvegardé : fermée au prix de la liquidation — même ligne, même argent qu'une fermeture
//       à ce prix (jumeau) ; 💥 au journal, réalisé compté, pas rouverte cette semaine
//   N2  prix frais, liquidation trouvée des heures après (prix revenu) : fermée au prix de la liquidation, pas au prix de retour
//   N3  EV en pause, prix périmé : fermée au prix de la liquidation (les liquidations passent en pause), rien n'est ouvert
//   N4  ligne de liquidation SANS prix (d'avant) : gardée tant que le prix est périmé, fermée au prix frais ensuite
//   N5  fermeture qui n'aboutit pas : aucun prix imposé laissé sur la position (ton ✕ suivant ferme au prix du moment)
//   N6  entrée de l'EV sous celle de la poche (2 × x0 au-delà de 2 × son entrée) : −100 % de sa mise, comme la poche
//   N7  témoin : sans liquidation (ouverture, retournement frais / périmé, ✕, ×2 de l'EV, paire retirée, MANU, pause), l'état = celui du code
//       d'avant au caractère près ; et le banc VOIT la différence sur une liquidation (règle 10)
//   N8  garde : 15b ne change que dans le bloc (b) et l'en-tête ; banc-fixtures/tendance-reelle-avant-n80.js = 15b de 85e18ca (empreinte)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, 'fonction absente : ' + name);
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
const has = (src, name) => new RegExp('(^|\\n)(async )?function ' + name + '\\s*\\(').test(src);
const near = (a, b, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const s02 = rd('js/02-state-init.js');
const s15b = rd('js/15b-tendance-reelle.js');
const AVANT15b = fs.readFileSync(path.join(__dirname, 'banc-fixtures/tendance-reelle-avant-n80.js'), 'utf8');

// ─── le monde (même harnais que banc-tendance-reelle.js) : un mode EV à plat, VRAIS 02 openPosition / closePosition / recordFees… ───
const FEE = { takerRate: 0.001, makerRate: 0.0008, slippage: 0.0003, fundingRate: 0 };
const PAIRS11 = ['ADA', 'AVAX', 'BNB', 'BTC', 'DOGE', 'DOT', 'ETH', 'LINK', 'PEPE', 'SOL', 'XRP'].map(x => x + '/USDT');
const T0 = Date.UTC(2026, 10, 12, 19, 0, 0);   // jeudi 12/11/2026 19:00 UTC
const HOUR = 3600000;
function world(o) {
  o = o || {};
  const seen = { toasts: [], judges: 0, saves: 0 };
  let clock = o.t || T0;
  class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } static now() { return clock; } }
  const S = { tradingMode: 'paperReal', botAutoMode: o.auto !== false, cashAccount: 6.58, tradingAccount: 1055.91, openPositions: [],
    pnlHistory: [1000], chainLog: [], cashLog: [], totalTrades: 0, winTrades: 0, leverage: 0, leverageReserve: 0, leverageBorrowed: 0, leverageMaxMult: 10,
    _autoLevBorrowed: 0, antiNegReserve: 0, antiNegReserveLog: [], profitSplitCaissePct: 0, feeConfig: Object.assign({}, FEE), taxConfig: { region: 'BE' },
    paperRealStats: {}, agents: [], botFleet: {}, currentPage: 0,
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {}, walletStore: { paperReal: { running: o.running !== false } } };
  PAIRS11.forEach((p, i) => { S.pairStates[p] = { price: 10 + i, stake: 30, pairLeverage: 1, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const ages = {};
  const c = { S, PAIRS: Object.fromEntries(PAIRS11.map(p => [p, { dec: 4 }])), Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN, parseFloat, Error,
    console: { log() {}, warn() {}, error() {} }, showToast: (m) => seen.toasts.push(String(m)), rndHash: () => 'h', nowStr: () => '12:00:00',
    syncLeverageReserve() {}, recordTradeForHeatmap() {}, learnFromOutcome: () => { seen.judges++; }, emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {},
    checkPnlAlerts() {}, checkBadges() {}, _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderPositions() {}, renderChain() {}, renderHome() {}, renderPyramideSection() {},
    renderActionsGrid() {}, renderOpenPosSummary() {}, _urgAppendLog() {}, saveFeeRecord() {}, addAnnualNetRealised() {}, _fiscOnClose: () => ({ movedUsd: 0, regime: 'spec', gainEur: 0 }),
    checkAntiRevenge: () => { seen.judges++; }, closeDecisionCascade: () => { seen.judges++; }, runBotFleet: () => { seen.judges++; },
    lmsrP: () => 0.5, fmt$: (x) => '$' + x, fmt$2: (x) => '$' + x, validateTotalExposure: () => ({ ok: true, available: 1e9 }), borrowLeverage: (x) => x,
    ensureLeverageCoverForTrade: (x) => ({ ok: true, borrowed: x }), notifTradeOpen() {}, notifTradeClose() {}, tgOnTrade() {},
    _manOpenWarnings: () => [], _manConsigneOf: () => ({ maxLossPct: 2, timeoutMin: 60 }), _calcBotTpSl: () => ({ tp: 1, sl: 2 }), _modeBehind: () => false,
    _rcPriceAge: (p) => (ages[p] != null ? ages[p] : 1000), _rcLastPrice: (p) => S.pairStates[p].price,
    setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, document: { getElementById: () => null } };
  c.window = c; c._walletFor = () => ({ openPositions: S.openPositions, pairStates: S.pairStates, tradingAccount: S.tradingAccount });
  c._isModeRunning = () => !!S.walletStore.paperReal.running; c.saveState = () => { seen.saves++; };
  vm.createContext(c); require('./banc-fixtures/px-vm.js')(c, ROOT);
  vm.runInContext('function validateManualExposure(a, b) { return validateTotalExposure(a, b); }', c);
  const names = ['_computePortfolio', '_computePortfolioSans', 'repayLeverage', 'releaseTradeReserve', 'recordFees', '_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto'].filter(n => has(s02, n));
  vm.runInContext(names.map(n => fnSrc(s02, n)).join('\n') + '\n' + fnSrc(s02, 'openPosition') + '\n' + fnSrc(s02, 'closePosition') + '\nvar S = this.S;', c);
  if (o.f15b !== false) vm.runInContext(o.src15b || s15b, c);
  return { c, S, seen, ages, run: code => vm.runInContext(code, c), tick: (ms) => { clock += ms; } };
}
const mondayOf = t => 4 * 86400000 + Math.floor((t - 4 * 86400000) / (7 * 86400000)) * 7 * 86400000;
function poche(W, sides, x0) {   // la poche de js/15 (S.tendance) : une position par paire, la semaine en cours décidée
  const pos = {}, w = mondayOf(W.run('Date.now()'));
  Object.keys(sides).forEach(p => { pos[p] = { side: sides[p], w: 0, pW: 1, pL: 1, x0: x0 || 10, t0: 5, n: 11, cIn: 0.0013, liqChk: 0 }; });
  const dec = Object.fromEntries(Object.keys(sides).map(p => [p, { w, s: sides[p] === 'long' ? 1 : -1, why: 'tenue' }]));
  W.S.tendance = { v: 1, depuis: 1, pos, dec, hist: [], tot: { net: 0, netL: 0, n: 0, win: 0, liq: 0 } };
}
const all11 = (side) => Object.fromEntries(PAIRS11.map(p => [p, p === 'PEPE/USDT' ? 'long' : side]));
const voix = W => W.S.openPositions.filter(p => p._voix === 'tendance');
// la poche liquide un SHORT (js/15 closePos(t, pair, 2 * p.x0, ts, 'liquidation : le prix a doublé', true)) : position retirée, ligne d'historique
function liquide(W, pair, x1, ts) {
  const t = W.S.tendance, p = t.pos[pair];
  const h = { p: pair, s: -1, w0: p.w, t0: p.t0, x0: p.x0, t1: ts || W.run('Date.now()'), x1: x1, r: -1, c: 0, net: -1, n: p.n, why: 'liquidation : le prix a doublé' };
  if (x1 === undefined) delete h.x1;
  t.hist.push(h); t.tot.n++; t.tot.liq++; delete t.pos[pair];
}
const lastTrade = (W, pair) => W.S.pairStates[pair].trades.filter(x => x.type === 'tendance').slice(-1)[0];
// jumeau : la même position fermée par la voix au prix x (closePosition { voix }, ps.price = x) — l'argent et la ligne attendus
function jumeau(setup, pair, x) {
  const W = setup(); const pos = voix(W).find(p => p.pair === pair);
  W.S.pairStates[pair].price = x; W.run("closePosition('" + pos.id + "', false, { voix: true })");
  assert.ok(!voix(W).some(p => p.pair === pair), 'jumeau fermé');
  return { tr: lastTrade(W, pair), trading: W.S.tradingAccount, cash: W.S.cashAccount, fees: W.S.fees.totalTradingFees };
}

console.log('▶ banc-n80 · token ' + ((rd('AURA8_v118.html').match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]));
console.log('▶ N. Liquidation de la poche → la position EV fermée au prix de la liquidation');

const ouvert = (o) => () => { const W = world(o); poche(W, all11('short'), (o && o.x0) || 10); W.run('_tlr.sync()'); assert.strictEqual(voix(W).length, 11, '11 positions de la voix'); return W; };

T('N1 · prix réel périmé (> 5 min), ps.price de l\'EV sauvegardé : fermée au prix de la liquidation (20 = 2 × 10), même ligne et même argent que le jumeau fermé à 20 ; 💥 au journal, réalisé compté, pas rouverte cette semaine', () => {
  const setup = ouvert(); const W = setup();
  const pos = voix(W).find(p => p.pair === 'BTC/USDT'); assert.strictEqual(pos.entryPrice, 13);
  W.tick(9 * HOUR); W.ages['BTC/USDT'] = 9 * HOUR; W.S.pairStates['BTC/USDT'].price = 12.4;   // prix sauvegardé avant la nuit
  liquide(W, 'BTC/USDT', 20, W.run('Date.now()') - 5 * HOUR);
  W.run('_tlr.sync()');
  assert.ok(!voix(W).some(p => p.pair === 'BTC/USDT'), 'fermée');
  const tr = lastTrade(W, 'BTC/USDT'), J = jumeau(setup, 'BTC/USDT', 20);
  assert.strictEqual(tr.price, 20, 'prix de sortie = prix de la liquidation (avant : ' + tr.price + ')');
  near(tr.pnlUsdt, J.tr.pnlUsdt, 'résultat'); near(W.S.tradingAccount, J.trading, 'trading'); near(W.S.fees.totalTradingFees, J.fees, 'frais');
  assert.ok(tr.pnlUsdt < 0 && Math.abs(tr.pnlUsdt / pos.stakeUsdt + (20 / 13 - 1)) < 1e-9, 'perte = 20 / 13 − 1 de la mise');
  near(W.S.tendance.reel.real, tr.pnlUsdt, 'réalisé de la voix');
  assert.ok(W.S.chainLog.some(x => x.icon === '💥' && /BTC\/USDT SHORT fermé \(liquidation/.test(x.desc)), 'journal 💥');
  const at = W.S.tendance.reel.attente['BTC/USDT']; assert.ok(at && at.w === mondayOf(W.run('Date.now()')), 'marquée « pas rouverte cette semaine »');
  W.ages['BTC/USDT'] = 1000; W.run('_tlr.sync()'); assert.ok(!voix(W).some(p => p.pair === 'BTC/USDT'), 'pas rouverte (la poche ne la tient plus)');
  assert.ok(!('_forcedExitPx' in pos), 'prix imposé consommé');
});

T('N2 · prix frais, liquidation trouvée des heures après (prix revenu à 15) : fermée au prix de la liquidation (20), pas au prix de retour', () => {
  const setup = ouvert(); const W = setup();
  W.tick(6 * HOUR); W.S.pairStates['BTC/USDT'].price = 15; liquide(W, 'BTC/USDT', 20, W.run('Date.now()') - 4 * HOUR);
  W.run('_tlr.sync()');
  const tr = lastTrade(W, 'BTC/USDT'), J = jumeau(setup, 'BTC/USDT', 20);
  assert.strictEqual(tr.price, 20, 'au prix de la liquidation (avant : ' + tr.price + ')'); near(tr.pnlUsdt, J.tr.pnlUsdt, 'résultat'); near(W.S.tradingAccount, J.trading, 'trading');
});

T('N3 · EV en pause, prix périmé : fermée au prix de la liquidation (les liquidations passent en pause) ; rien n\'est ouvert', () => {
  const setup = ouvert(); const W = setup();
  W.S.walletStore.paperReal.running = false; W.tick(9 * HOUR); PAIRS11.forEach(p => { W.ages[p] = 9 * HOUR; });
  W.S.pairStates['BTC/USDT'].price = 11; liquide(W, 'BTC/USDT', 20);
  const n0 = W.S.openPositions.length; W.run('_tlr.sync()');
  assert.strictEqual(W.S.openPositions.length, n0 - 1, 'seule la liquidée part, rien ne s\'ouvre');
  assert.strictEqual(lastTrade(W, 'BTC/USDT').price, 20, 'au prix de la liquidation');
});

T('N4 · ligne de liquidation SANS prix (d\'avant) : gardée tant que le prix est périmé (jamais au prix sauvegardé), fermée au prix frais ensuite, pas rouverte cette semaine', () => {
  const W = ouvert()();
  W.ages['BTC/USDT'] = 400000; W.S.pairStates['BTC/USDT'].price = 12; liquide(W, 'BTC/USDT', undefined);
  W.run('_tlr.sync()'); W.run('_tlr.sync()');
  assert.ok(voix(W).some(p => p.pair === 'BTC/USDT'), 'gardée tant que le prix est périmé');
  W.ages['BTC/USDT'] = 1000; W.S.pairStates['BTC/USDT'].price = 16; W.run('_tlr.sync()');
  assert.ok(!voix(W).some(p => p.pair === 'BTC/USDT'), 'fermée au prix frais'); assert.strictEqual(lastTrade(W, 'BTC/USDT').price, 16);
  assert.ok(W.S.tendance.reel.attente['BTC/USDT'], 'pas rouverte cette semaine');
});

T('N5 · fermeture qui n\'aboutit pas : aucun prix imposé laissé sur la position ; ton ✕ suivant ferme au prix du moment (17), pas à 20', () => {
  const W = ouvert()();
  W.ages['BTC/USDT'] = 400000; liquide(W, 'BTC/USDT', 20);
  const vrai = W.c.closePosition; W.c.closePosition = function () { /* refus muet */ };
  W.run('_tlr.sync()'); W.c.closePosition = vrai;
  const pos = voix(W).find(p => p.pair === 'BTC/USDT'); assert.ok(pos, 'toujours ouverte');
  assert.ok(!('_forcedExitPx' in pos), 'prix imposé retiré');
  W.S.pairStates['BTC/USDT'].price = 17; W.run("closePosition('" + pos.id + "', false, { main: true })");
  assert.strictEqual(lastTrade(W, 'BTC/USDT').price, 17, 'ton ✕ : au prix du moment');
});

T('N6 · entrée de l\'EV (13) sous celle de la poche (14) : la poche liquide à 28, au-delà de 2 × 13 → −100 % de la mise de l\'EV, comme la poche (avant, au prix sauvegardé 12 : un gain)', () => {
  const W = ouvert({ x0: 14 })();
  const pos = voix(W).find(p => p.pair === 'BTC/USDT');
  W.ages['BTC/USDT'] = 9 * HOUR; W.S.pairStates['BTC/USDT'].price = 12; liquide(W, 'BTC/USDT', 28);
  W.run('_tlr.sync()');
  const tr = lastTrade(W, 'BTC/USDT'); assert.strictEqual(tr.price, 28); near(tr.pnlUsdt, -pos.stakeUsdt, 'perte = toute la mise');
});

console.log('▶ N7. Témoin : sans liquidation, état identique au code d\'avant ; le banc voit la différence sur une liquidation');
function scenario(src, liq) {
  const W = world({ src15b: src }); poche(W, all11('short')); const out = [];
  const snap = (k) => out.push(k + ' ' + JSON.stringify({ S: W.S, toasts: W.seen.toasts, judges: W.seen.judges, saves: W.seen.saves }));
  W.run('_tlr.sync()'); snap('ouverture');
  W.tick(60000); W.S.tendance.pos['ETH/USDT'] = { side: 'long', w: 0, pW: 1, pL: 1, x0: 16, t0: 9, n: 11, cIn: 0, liqChk: 0 }; W.S.pairStates['ETH/USDT'].price = 16.5;
  W.run('_tlr.sync()'); snap('retournement frais');
  W.tick(60000); W.ages['SOL/USDT'] = 400000; W.S.tendance.pos['SOL/USDT'] = { side: 'long', w: 0, pW: 1, pL: 1, x0: 19, t0: 10, n: 11, cIn: 0, liqChk: 0 };
  W.run('_tlr.sync()'); snap('retournement périmé'); W.ages['SOL/USDT'] = 1000; W.run('_tlr.sync()'); snap('retournement redevenu frais');
  W.tick(60000); const d = voix(W).find(p => p.pair === 'DOGE/USDT'); W.S.pairStates['DOGE/USDT'].price = 2 * d.entryPrice; W.run('_tlr.sync()'); snap('×2 de l\'EV');
  W.tick(60000); delete W.S.tendance.pos['XRP/USDT']; W.run('_tlr.sync()'); snap('paire retirée');
  W.tick(60000); const a = voix(W).find(p => p.pair === 'ADA/USDT'); W.run("closePosition('" + a.id + "', false, { main: true })"); W.run('_tlr.sync()'); snap('ton ✕');
  W.tick(60000); W.S.botAutoMode = false; W.S.tendance.pos['LINK/USDT'] = { side: 'long', w: 0, pW: 1, pL: 1, x0: 17, t0: 11, n: 11, cIn: 0, liqChk: 0 }; W.run('_tlr.sync()'); snap('MANU');
  W.tick(60000); W.S.walletStore.paperReal.running = false; W.run('_tlr.sync()'); snap('pause');
  if (liq) { W.tick(9 * HOUR); W.ages['BTC/USDT'] = 9 * HOUR; W.S.pairStates['BTC/USDT'].price = 12.4; liquide(W, 'BTC/USDT', 20); W.run('_tlr.sync()'); snap('liquidation'); }
  return out;
}
T('N7a · sans liquidation : 9 étapes, l\'état (comptes, positions, historiques, journal, suivi), les toasts, les juges et les sauvegardes = ceux du code d\'avant au caractère près', () => {
  const a = scenario(AVANT15b, false), b = scenario(s15b, false);
  assert.strictEqual(a.length, 9);
  a.forEach((x, i) => assert.strictEqual(b[i], x, 'étape « ' + x.split(' ')[0] + ' » différente'));
});
T('N7b · le banc VOIT la différence : la même suite terminée par une liquidation à prix périmé diffère du code d\'avant (prix de sortie 20 contre 12,4)', () => {
  const a = scenario(AVANT15b, true), b = scenario(s15b, true);
  assert.strictEqual(a.slice(0, 9).join('\n'), b.slice(0, 9).join('\n'), 'mêmes 9 premières étapes');
  assert.notStrictEqual(a[9], b[9], 'la liquidation diffère');
  const px = (s) => JSON.parse(s.slice(s.indexOf(' ') + 1)).S.pairStates['BTC/USDT'].trades.filter(x => x.type === 'tendance').slice(-1)[0].price;
  assert.strictEqual(px(a[9]), 12.4, 'avant : au prix sauvegardé'); assert.strictEqual(px(b[9]), 20, 'après : au prix de la liquidation');
});

console.log('▶ N8. Garde');
T('N8 · 15b ne change que dans le bloc (b) de sync et l\'en-tête ; le témoin banc-fixtures/tendance-reelle-avant-n80.js est le 15b de 85e18ca (empreinte)', () => {
  assert.strictEqual(crypto.createHash('sha256').update(AVANT15b).digest('hex').slice(0, 16), '08582a20cd8f495a', 'empreinte du témoin');
  const bloc = (s) => { const i = s.indexOf('        // (b) la poche ne la tient plus'), j = s.indexOf('        // (c) SHORT de l\'EV'); assert.ok(i > 0 && j > i, 'bloc (b)'); return [s.slice(0, i), s.slice(j)]; };
  const corps = (s) => s.slice(s.indexOf('(function () {'));
  const A = bloc(corps(AVANT15b)), B = bloc(corps(s15b));
  assert.strictEqual(B[0], A[0], 'avant le bloc (b) : identique'); assert.strictEqual(B[1], A[1], 'après le bloc (b) : identique');
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
