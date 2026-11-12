// banc-tendance-reelle.js — [GO TENDANCE RÉELLE · 12/11/2026] VERSION 20261112a
// « Go tendances réelle tout » (Rams 12/11) : l'argent de l'EV suit la voix tendance longue (js/15b) avec de vraies positions. Chaque essai fait
// tourner le VRAI texte de l'app en vm (02 openPosition / closePosition / recordFees…, 15b entier, 16 _fiscRegimeOf) ; le reste est simulé.
//   A  closePosition : une position de la voix n'est fermée que par { voix | main | urgence | solvabilite }, sans juge ; sans la marque, état
//      identique au témoin d'avant (400 fermetures) — et le banc VOIT la différence sur une position de la voix (règle 10).
//   B  openPosition { voix } : mise donnée, sans levier, ni TP / SL, ni consignes ; sans { voix }, identique au témoin (300 ouvertures).
//   C  15b : 11 positions à 1/11 de l'EV, retournement, MANU, pause, ton ✕ → lundi suivant, paire occupée, SHORT ×2, prix périmé, sauvegarde.
//   D  ailleurs : bots hors EV (09c), perte max / sorties de 07 / consignes / rescue sautent la voix, fiscal spéculatif, rapports, HTML.
// Échoue sur le code d'avant : BANC_ROOT=<copie du commit dcbd4ad> node banc-tendance-reelle.js
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
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
const J = o => JSON.parse(JSON.stringify(o));
const near = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const s02 = rd('js/02-state-init.js'), s16 = rd('js/16-fiscal.js');
const s15b = fs.existsSync(path.join(ROOT, 'js/15b-tendance-reelle.js')) ? rd('js/15b-tendance-reelle.js') : '';
const AVANT = fs.readFileSync(path.join(__dirname, 'banc-fixtures/tendance-reelle-avant-20261027b.js'), 'utf8').replace(/^\/\/.*\n/gm, '');

// ─── le monde : comptes d'un mode à plat, VRAIS openPosition / closePosition / recordFees / _posLatent… de 02 ; juges et écran = témoins ───
const FEE = { takerRate: 0.001, makerRate: 0.0008, slippage: 0.0003, fundingRate: 0 };
const PAIRS11 = ['ADA', 'AVAX', 'BNB', 'BTC', 'DOGE', 'DOT', 'ETH', 'LINK', 'PEPE', 'SOL', 'XRP'].map(x => x + '/USDT');
const T0 = Date.UTC(2026, 10, 12, 19, 0, 0);   // jeudi 12/11/2026 19:00 UTC
function world(o) {
  o = o || {};
  const seen = { learn: [], toasts: [], judges: 0, saves: 0 };
  let clock = o.t || T0, idn = 0;
  class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } static now() { return clock + (idn++ % 1); } }
  const S = { tradingMode: 'paperReal', botAutoMode: o.auto !== false, cashAccount: 6.58, tradingAccount: o.trading != null ? o.trading : 1055.91, openPositions: [],
    pnlHistory: [1000], chainLog: [], cashLog: [], totalTrades: 0, winTrades: 0, leverage: o.leverage || 0, leverageReserve: 0, leverageBorrowed: 0, leverageMaxMult: 10,
    _autoLevBorrowed: 0, antiNegReserve: 0, antiNegReserveLog: [], profitSplitCaissePct: 0, feeConfig: Object.assign({}, FEE), taxConfig: { region: 'BE' },
    paperRealStats: {}, agents: [], botFleet: {}, currentPage: 0,
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {}, walletStore: { paperReal: { running: o.running !== false } } };
  PAIRS11.forEach((p, i) => { S.pairStates[p] = { price: 10 + i, stake: 30, pairLeverage: o.pairLev || 1, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const ages = {};
  const c = { S, PAIRS: Object.fromEntries(PAIRS11.map(p => [p, { dec: 4 }])), Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN, parseFloat, Error,
    console: { log() {}, warn() {}, error() {} }, showToast: (m) => seen.toasts.push(String(m)), rndHash: () => 'h', nowStr: () => '12:00:00',
    syncLeverageReserve() {}, recordTradeForHeatmap() {}, learnFromOutcome: (k, pct, pair) => seen.learn.push([pair, pct]), emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {},
    checkPnlAlerts() {}, checkBadges() {}, _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderPositions() {}, renderChain() {}, renderHome() {}, renderPyramideSection() {},
    renderActionsGrid() {}, renderOpenPosSummary() {}, _urgAppendLog() {}, saveFeeRecord() {}, addAnnualNetRealised() {}, _fiscOnClose: () => ({ movedUsd: 0, regime: 'spec', gainEur: 0 }),
    checkAntiRevenge: () => { seen.judges++; }, closeDecisionCascade: () => { seen.judges++; }, runBotFleet: () => { seen.judges++; },
    lmsrP: () => 0.5, fmt$: (x) => '$' + x, fmt$2: (x) => '$' + x, validateTotalExposure: () => ({ ok: true, available: 1e9 }), borrowLeverage: (x) => x,
    ensureLeverageCoverForTrade: (x) => ({ ok: true, borrowed: x }), notifTradeOpen() {}, notifTradeClose() {}, tgOnTrade: (i) => { seen.tg = i; },
    _manOpenWarnings: () => [], _manConsigneOf: () => ({ maxLossPct: 2, timeoutMin: 60 }), _calcBotTpSl: (p, s) => ({ tp: 1, sl: 2 }), _modeBehind: () => false,
    _rcPriceAge: (p) => (ages[p] != null ? ages[p] : 1000), _rcLastPrice: (p) => S.pairStates[p].price,
    setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, document: { getElementById: () => null } };
  c.window = c; c._walletFor = (m) => ({ openPositions: S.openPositions, pairStates: S.pairStates, tradingAccount: S.tradingAccount });
  c._isModeRunning = (m) => !!S.walletStore.paperReal.running; c.saveState = () => { seen.saves++; };
  vm.createContext(c);
  const names = ['_computePortfolio', '_computePortfolioSans', 'repayLeverage', 'releaseTradeReserve', 'recordFees', '_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto'].filter(n => has(s02, n));
  vm.runInContext(names.map(n => fnSrc(s02, n)).join('\n') + '\n' + (o.code || (fnSrc(s02, 'openPosition') + '\n' + fnSrc(s02, 'closePosition'))) + '\nvar S = this.S;', c);
  if (o.f15b !== false && s15b) vm.runInContext(s15b, c);
  return { c, S, seen, ages, run: code => vm.runInContext(code, c), tick: (ms) => { clock += ms; }, setT: (t) => { clock = t; } };
}
const vpos = (o) => Object.assign({ id: 'pV', pair: 'BTC/USDT', side: 'short', entryPrice: 13, stakeUsdt: 96, totalExposure: 96, levBorrowed: 0, auto: false, openedAt: 1, entryTs: 1, _voix: 'tendance', _voixT0: 5 }, o);
function poche(W, sides, t0) {   // la poche de js/15 (S.tendance) : une position par paire
  const pos = {};
  Object.keys(sides).forEach(p => { pos[p] = { side: sides[p], w: 0, pW: 1, pL: 1, x0: 1, t0: t0 || 5, n: 11, cIn: 0.0013, liqChk: 0 }; });
  const w = 4 * 86400000 + Math.floor((W.run('Date.now()') - 4 * 86400000) / (7 * 86400000)) * 7 * 86400000;   // la poche a décidé la semaine en cours
  const dec = Object.fromEntries(Object.keys(sides).map(p => [p, { w, s: sides[p] === 'long' ? 1 : -1, why: 'tenue' }]));
  W.S.tendance = { v: 1, depuis: 1, pos, dec, hist: [], tot: { net: 0, netL: 0, n: 0, win: 0, liq: 0 } };
}
const decideSemaine = (W) => { const w = 4 * 86400000 + Math.floor((W.run('Date.now()') - 4 * 86400000) / (7 * 86400000)) * 7 * 86400000; Object.values(W.S.tendance.dec).forEach(d => { d.w = w; }); };
const all11 = (side) => Object.fromEntries(PAIRS11.map(p => [p, p === 'PEPE/USDT' ? 'long' : side]));
const voix = W => W.S.openPositions.filter(p => p._voix === 'tendance');

(async () => {
console.log('▶ banc-tendance-reelle · token ' + ((rd('AURA8_v118.html').match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]));

console.log('▶ A. closePosition — la voix n\'est fermée que par la voix, toi, l\'urgence, la solvabilité');
await T('A1 · une position de la voix : refusée sans option (bot ou non) ; { voix } la ferme, ligne « tendance », AUCUN juge (apprentissage, anti-revenge, cascade, flotte)', () => {
  const W = world({ f15b: false }); W.S.openPositions.push(vpos()); W.S.tradingAccount -= 96;
  W.run("closePosition('pV')"); W.run("closePosition('pV', true)"); W.run("closePosition('pV', false, { sortie: { k: 'sl', why: 'perte max' } })");
  assert.strictEqual(W.S.openPositions.length, 1, 'toujours ouverte');
  W.S.pairStates['BTC/USDT'].price = 12; W.run("closePosition('pV', false, { voix: true })");
  assert.strictEqual(W.S.openPositions.length, 0, 'fermée par la voix');
  const t = W.S.pairStates['BTC/USDT'].trades.slice(-1)[0]; assert.strictEqual(t.type, 'tendance');
  near(t.pnlUsdt, 96 * (13 - 12) / 13, 1e-9, 'gain du SHORT');
  assert.deepStrictEqual(W.seen.learn, [], 'aucun apprentissage'); assert.strictEqual(W.seen.judges, 0, 'aucun juge');
  assert.strictEqual(W.seen.tg.voix, true, 'Telegram : « tendance longue »'); assert.ok(!W.seen.tg.urgence, 'pas « urgence »');
});
await T('A2 · ton ✕ ({ main }), l\'urgence et « jamais sous zéro » ({ solvabilite }) la ferment', () => {
  ['main', 'urgence', 'solvabilite'].forEach(k => {
    const W = world({ f15b: false }); W.S.openPositions.push(vpos()); W.run("closePosition('pV', false, { " + k + ": true })");
    assert.strictEqual(W.S.openPositions.length, 0, k);
  });
});
let seed = 20261112; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
await T('A3 · SANS la marque de la voix : le nouveau closePosition écrit le MÊME état que celui d\'avant (témoin dcbd4ad), au bit près — 400 fermetures (LONG / SHORT, bot / main, urgence, levier)', () => {
  for (let k = 0; k < 400; k++) {
    const st = Math.round(5 + rnd() * 200), e = 5 + rnd() * 20, cur = e * (0.7 + rnd() * 0.6), side = rnd() < 0.5 ? 'long' : 'short', auto = rnd() < 0.5, lev = rnd() < 0.3 ? 1 + Math.floor(rnd() * 4) : 1;
    const opt = rnd() < 0.2 ? ", false, { urgence: true }" : rnd() < 0.2 ? ", false, { main: true }" : (auto && rnd() < 0.5 ? ', true' : '');
    const s0 = seed;
    const mk = (code) => { seed = s0; const W = world({ f15b: false, code });
      W.S.openPositions.push({ id: 'pA', pair: 'ETH/USDT', side, entryPrice: e, stakeUsdt: st, totalExposure: st * lev, levBorrowed: st * (lev - 1), auto, openedAt: 1, entryTs: 1 });
      W.S.leverageBorrowed = st * (lev - 1); W.S.tradingAccount -= st; W.S.pairStates['ETH/USDT'].price = cur; W.run("closePosition('pA'" + opt + ")"); return W; };
    const A = mk(null), B = mk(AVANT);
    // J : l'information passée à Telegram porte « voix: undefined » de plus — lue nulle part ailleurs, absente une fois sérialisée, même valeur lue
    assert.deepStrictEqual(J(A.S), J(B.S), 'fermeture ' + k + opt); assert.deepStrictEqual(J(A.seen), J(B.seen), 'témoins ' + k);
  }
});
await T('A4 · le banc VOIT la différence : la même position MARQUÉE voix, fermée par une sortie automatique — fermée (et jugée) par l\'ancien code, refusée par le nouveau', () => {
  const mk = (code) => { const W = world({ f15b: false, code }); W.S.openPositions.push(vpos()); W.S.pairStates['BTC/USDT'].price = 14; W.run("closePosition('pV', false, { sortie: { k: 'sl', why: 'perte max' } })"); return W; };
  const A = mk(null), B = mk(AVANT);
  assert.strictEqual(A.S.openPositions.length, 1, 'nouveau : refusée'); assert.strictEqual(B.S.openPositions.length, 0, 'ancien : fermée');
  assert.ok(B.seen.learn.length > 0 && A.seen.learn.length === 0, 'ancien : la décision apprenait de la voix');
});

console.log('▶ B. openPosition { voix }');
await T('B1 · { voix, stakeUsdt: 95,99 } : mise exacte, levier de la paire ×3 et levier du compte ignorés (aucun emprunt), ni TP / SL, ni consignes, marque et t0 ; trading débité ; aucun toast', () => {
  const W = world({ f15b: false, pairLev: 3, leverage: 5 });
  const p = W.run("openPosition('SOL/USDT', 'short', { voix: true, stakeUsdt: 95.99, voixT0: 77 })");
  assert.ok(p, 'ouverte'); assert.strictEqual(p.stakeUsdt, 95.99); assert.strictEqual(p.totalExposure, 95.99); assert.strictEqual(p.levBorrowed, 0); assert.strictEqual(p._levCash, 0);
  assert.strictEqual(p.tp, null); assert.strictEqual(p.sl, null); assert.strictEqual(p._manMaxLossPct, null); assert.strictEqual(p._manTimeoutMin, null);
  assert.strictEqual(p._voix, 'tendance'); assert.strictEqual(p._voixT0, 77); assert.strictEqual(p.auto, false); assert.deepStrictEqual(J(p._openAgents), []);
  near(W.S.tradingAccount, 1055.91 - 95.99, 1e-9, 'trading'); assert.deepStrictEqual(W.seen.toasts, [], 'pas de toast par position');
});
await T('B2 · mise > trading, mise nulle ou illisible, paire déjà occupée : rien n\'est ouvert, rien n\'est débité', () => {
  const W = world({ f15b: false, trading: 50 });
  assert.strictEqual(W.run("openPosition('SOL/USDT', 'long', { voix: true, stakeUsdt: 60 })"), null);
  assert.strictEqual(W.run("openPosition('SOL/USDT', 'long', { voix: true, stakeUsdt: 0 })"), null);
  assert.strictEqual(W.run("openPosition('SOL/USDT', 'long', { voix: true, stakeUsdt: NaN })"), null);
  W.S.openPositions.push(vpos({ pair: 'SOL/USDT', id: 'x' }));
  assert.strictEqual(W.run("openPosition('SOL/USDT', 'long', { voix: true, stakeUsdt: 10 })"), null);
  assert.strictEqual(W.S.tradingAccount, 50); assert.strictEqual(W.S.openPositions.length, 1);
});
await T('B3 · SANS { voix } : le nouveau openPosition écrit le MÊME état que celui d\'avant (témoin), au bit près — 300 ouvertures (mise, levier, sens, consignes, paire occupée, levier du compte)', () => {
  for (let k = 0; k < 300; k++) {
    const st = Math.round(1 + rnd() * 300), side = rnd() < 0.5 ? 'long' : 'short', lev = rnd() < 0.3 ? 2 + Math.floor(rnd() * 3) : 1, accLev = rnd() < 0.3 ? 3 : 0, occ = rnd() < 0.1;
    const opts = rnd() < 0.3 ? "{ tpPct: 3, slPct: 1.5 }" : rnd() < 0.5 ? "{ maxLossPct: 4 }" : 'undefined';
    const mk = (code) => { const W = world({ f15b: false, code, pairLev: lev, leverage: accLev, trading: 100 + rnd() * 200 });
      W.S.pairStates['DOT/USDT'].stake = st; if (occ) W.S.openPositions.push(vpos({ pair: 'DOT/USDT', id: 'o', _voix: undefined }));
      W.run("openPosition('DOT/USDT', '" + side + "', " + opts + ")"); return W; };
    const s0 = seed; const A = mk(null); seed = s0; const B = mk(AVANT);
    assert.deepStrictEqual(J(A.S), J(B.S), 'ouverture ' + k); assert.deepStrictEqual(A.seen, B.seen, 'témoins ' + k);
  }
});

console.log('▶ C. 15b — l\'EV suit la poche');
await T('C1 · poche à 11 paires (10 SHORT + PEPE LONG), EV en play, AUTO, prix frais : 11 positions, même sens, mise = 1/11 de l\'EV (95,99 $), une ligne au journal, un toast ; le passage suivant ne rouvre rien', () => {
  const W = world(); poche(W, all11('short')); W.run('_tlr.sync()');
  const V = voix(W); assert.strictEqual(V.length, 11);
  V.forEach(p => { assert.strictEqual(p.side, W.S.tendance.pos[p.pair].side, p.pair); assert.strictEqual(p.stakeUsdt, 95.99, p.pair); assert.strictEqual(p._voixT0, 5); });
  near(W.S.tradingAccount, 1055.91 - 11 * 95.99, 1e-9, 'trading restant'); assert.strictEqual(W.seen.toasts.length, 1);
  assert.ok(/11 positions ouvertes avec ton argent EV/.test(W.S.chainLog.slice(-1)[0].desc));
  assert.ok(W.seen.saves >= 1, 'sauvegardé'); W.run('_tlr.sync()'); assert.strictEqual(voix(W).length, 11); assert.strictEqual(W.seen.toasts.length, 1);
  assert.strictEqual(W.S.tendance.reel.on, 1); assert.strictEqual(Object.keys(W.S.tendance.reel.suivi).length, 11);
});
await T('C2 · retournement (BTC SHORT → LONG, nouvelle entrée de la poche) : la position EV est fermée (« retournement », ligne « tendance ») et rouverte LONG avec l\'argent revenu', () => {
  const W = world(); poche(W, all11('short')); W.run('_tlr.sync()');
  W.S.pairStates['BTC/USDT'].price = 12;   // le SHORT gagne
  W.S.tendance.hist.push({ p: 'BTC/USDT', s: -1, t0: 5, t1: 9, why: 'retournement' });
  W.S.tendance.pos['BTC/USDT'] = { side: 'long', t0: 9, x0: 12 };
  const tr0 = W.S.tradingAccount; W.run('_tlr.sync()');
  const b = voix(W).find(p => p.pair === 'BTC/USDT'); assert.ok(b && b.side === 'long' && b._voixT0 === 9, 'BTC rouvert LONG');
  const t = W.S.pairStates['BTC/USDT'].trades.filter(x => x.type === 'tendance'); assert.strictEqual(t.length, 1);
  assert.ok(W.S.chainLog.some(x => /BTC\/USDT SHORT fermé \(retournement\)/.test(x.desc)));
  assert.ok(W.S.tendance.reel.real > 0, 'réalisé compté'); assert.ok(b.stakeUsdt > 95.99 && b.stakeUsdt <= tr0 + 96 * 1.1, 'mise = l\'argent revenu (borné par le trading)');
});
await T('C3 · MANU : rien ne s\'ouvre, le retournement ferme quand même ; EV en pause : rien ne s\'ouvre', () => {
  const W = world({ auto: false }); poche(W, all11('short')); W.run('_tlr.sync()'); assert.strictEqual(voix(W).length, 0, 'MANU');
  const W2 = world({ running: false }); poche(W2, all11('short')); W2.run('_tlr.sync()'); assert.strictEqual(voix(W2).length, 0, 'pause');
  const W3 = world(); poche(W3, all11('short')); W3.run('_tlr.sync()'); W3.S.botAutoMode = false;
  W3.S.tendance.hist.push({ p: 'ETH/USDT', s: -1, t0: 5, why: 'retournement' }); W3.S.tendance.pos['ETH/USDT'] = { side: 'long', t0: 9 };
  W3.run('_tlr.sync()'); assert.ok(!voix(W3).some(p => p.pair === 'ETH/USDT'), 'fermée, pas rouverte en MANU');
});
await T('C4 · ton ✕ ferme une position de la voix : pas rouverte cette semaine (une ligne au journal), rouverte le lundi suivant si la poche la tient encore', () => {
  const W = world(); poche(W, all11('short')); W.run('_tlr.sync()');
  const id = voix(W).find(p => p.pair === 'XRP/USDT').id; W.run("closePosition('" + id + "', false, { main: true })");
  W.run('_tlr.sync()'); W.run('_tlr.sync()'); assert.ok(!voix(W).some(p => p.pair === 'XRP/USDT'), 'pas cette semaine');
  assert.strictEqual(W.S.chainLog.filter(x => /XRP\/USDT fermée hors de la voix/.test(x.desc)).length, 1);
  W.setT(Date.UTC(2026, 10, 16, 0, 5, 0)); W.run('_tlr.sync()'); assert.ok(!voix(W).some(p => p.pair === 'XRP/USDT'), 'lundi 16/11 : la poche n\'a pas encore décidé la semaine → rien');
  decideSemaine(W); W.run('_tlr.sync()'); assert.ok(voix(W).some(p => p.pair === 'XRP/USDT'), 'rouverte lundi 16/11, une fois la semaine décidée par la poche');
});
await T('C5 · une autre position (la tienne, un bot) sur la paire : la voix ne l\'ouvre pas, ne touche pas l\'autre, le dit UNE fois — aucun toast de refus en boucle', () => {
  const W = world(); poche(W, all11('short')); W.S.openPositions.push({ id: 'm', pair: 'SOL/USDT', side: 'long', entryPrice: 19, stakeUsdt: 20, auto: false }); W.S.tradingAccount -= 20;
  for (let i = 0; i < 4; i++) W.run('_tlr.sync()');
  assert.strictEqual(voix(W).length, 10); assert.ok(W.S.openPositions.some(p => p.id === 'm'));
  assert.strictEqual(W.S.chainLog.filter(x => /SOL\/USDT : une autre position/.test(x.desc)).length, 1); assert.strictEqual(W.seen.toasts.length, 1);
});
await T('C6 · un SHORT de l\'EV dont le prix a doublé depuis SON entrée : fermé (−100 % de sa mise, « liquidation »), pas rouvert cette semaine', () => {
  const W = world(); poche(W, all11('short')); W.run('_tlr.sync()');
  const d = voix(W).find(p => p.pair === 'DOGE/USDT'); W.S.pairStates['DOGE/USDT'].price = 2 * d.entryPrice;
  W.run('_tlr.sync()'); W.run('_tlr.sync()'); assert.ok(!voix(W).some(p => p.pair === 'DOGE/USDT'), 'liquidée, pas rouverte');
  assert.strictEqual(W.S.pairStates['DOGE/USDT'].trades.filter(x => x.type === 'tendance').slice(-1)[0].pnlUsdt, -d.stakeUsdt);
});
await T('C7 · prix réel de plus de 5 min : la voix n\'ouvre pas la paire et ne ferme pas un retournement au prix périmé (elle attend)', () => {
  const W = world(); poche(W, all11('short')); W.ages['LINK/USDT'] = 400000; W.run('_tlr.sync()');
  assert.ok(!voix(W).some(p => p.pair === 'LINK/USDT'), 'pas ouverte'); assert.strictEqual(voix(W).length, 10);
  W.ages['ETH/USDT'] = 400000; W.S.tendance.pos['ETH/USDT'] = { side: 'long', t0: 9 }; W.run('_tlr.sync()');
  assert.ok(voix(W).some(p => p.pair === 'ETH/USDT' && p.side === 'short'), 'gardée tant que le prix est périmé');
});
await T('C8 · contexte : depuis l\'écran AA, la voix agit dans l\'EV puis rend l\'écran à l\'AA (mode et marque de bascule restaurés)', () => {
  const W = world(); poche(W, all11('short')); W.S.tradingMode = 'sim'; let seenMode = null;
  W.c.openPosition = new Proxy(W.c.openPosition, { apply: (f, t, a) => { seenMode = W.S.tradingMode + '/' + W.c._bgResolve; return f.apply(t, a); } });
  W.run('_tlr.sync()'); assert.strictEqual(seenMode, 'paperReal/true'); assert.strictEqual(W.S.tradingMode, 'sim'); assert.notStrictEqual(W.c._bgResolve, true);
});

await T('C9 · une sauvegarde plus ancienne (positions de la voix sans suivi) : le suivi est repris, un ✕ est reconnu (pas rouverte aussitôt)', () => {
  const W = world(); poche(W, all11('short')); W.run('_tlr.sync()'); W.S.tendance.reel.suivi = {};
  W.run('_tlr.sync()'); assert.strictEqual(Object.keys(W.S.tendance.reel.suivi).length, 11);
  const id = voix(W).find(p => p.pair === 'ADA/USDT').id; W.run("closePosition('" + id + "', false, { main: true })"); W.run('_tlr.sync()');
  assert.ok(!voix(W).some(p => p.pair === 'ADA/USDT'), 'pas rouverte');
});

console.log('▶ D. Le reste de l\'app');
const s09c = rd('js/09c-auto-open.js'), s10f = rd('js/10f-resolveur-cycle.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'),
      s09e = rd('js/09e-guards.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'), s06 = rd('js/06-v63-patterns-chartistes.js'), html = rd('AURA8_v118.html');
await T('D1 · bots hors EV : autoOpenPosition (le seul ouvreur des bots : seuil, hedges, propositions) rend la main en EV quand la voix tient l\'EV ; AA et RE inchangés', () => {
  const f = fnSrc(s09c, 'autoOpenPosition'); const i = f.indexOf("S.tradingMode === 'paperReal' && typeof window !== 'undefined' && typeof window._tlrTientEV === 'function' && window._tlrTientEV()) return;");
  assert.ok(i > 0 && i < f.indexOf('_p5PreActionSave'), 'refus avant toute action');
  let agi = 0; const c = { S: { tradingMode: 'paperReal', botAutoMode: true }, window: { _tlrTientEV: () => true }, _p5PreActionSave: () => { agi++; throw new Error('stop'); } }; vm.createContext(c);
  try { vm.runInContext(f + '\nautoOpenPosition("BTC/USDT", "long", 10);', c); } catch (e) {}
  assert.strictEqual(agi, 0, 'EV : rien');
  c.S.tradingMode = 'sim'; try { vm.runInContext('autoOpenPosition("BTC/USDT", "long", 10);', c); } catch (e) {}
  assert.strictEqual(agi, 1, 'AA : le bot agit comme avant');
});
await T('D2 · les sorties automatiques sautent la voix AVANT d\'écrire quoi que ce soit : perte max (10f), sorties de 07, consignes (09e), trailing et paliers (05), rescue (03) ; « fermée » dit seulement si elle l\'est (07 manuClose)', () => {
  const lc = s10f.slice(s10f.indexOf('window._lossCapSweep = function'));
  assert.ok(/forEach\(function\(pos\)\{\n\s*if \(pos && pos\._voix === 'tendance'\) return;/.test(lc), '10f _lossCapSweep');
  assert.ok(/S\.openPositions\.forEach\(pos => \{\n\s*if \(pos && pos\._voix === 'tendance'\) return;/.test(fnSrc(s07, 'learnFromOpenPositions')), '07');
  assert.ok(/p\._voix !== 'tendance'/.test(fnSrc(s09e, '_manConsignesWatchdog')), '09e');
  assert.ok(/pos\._voix === 'tendance'\) return;/.test(fnSrc(s05, 'checkTrailingStops')) && /pos\._voix === 'tendance'\) return;/.test(fnSrc(s05, 'closePartial')), '05');
  assert.ok(/_rescuable = \(S\.openPositions \|\| \[\]\)\.filter\(p => p && p\._voix !== 'tendance'\)/.test(fnSrc(s03, 'botRescue')), '03 rescue');
  ['manuInvert', 'manuEditTp', 'manuEditSl', 'manuResetTpSl'].forEach(n => assert.ok(/pos\._voix === 'tendance'\) \{ showToast/.test(fnSrc(s07, n)), n));
  assert.ok(/closePosition\(pos\.id, false, \{ main: true \}\);[^\n]*\n\s*if \(\(S\.openPositions \|\| \[\]\)\.some\(p => p\.id === pos\.id\)\) return;/.test(fnSrc(s07, 'manuClose')), 'manuClose');
  assert.ok(/closePosition\(id, false, \{ solvabilite: true \}\)/.test(fnSrc(s02, '_forceCloseAllForSolvency')), 'solvabilité');
  assert.strictEqual((s07.match(/closePosition\('\$\{pos\.id\}',false,\{main:true\}\)/g) || []).length, 3, '3 boutons ✕ de 07');
  assert.ok(/closePosition\('\$\{pos\.id\}',\$\{pos\.auto\?'true':'false'\},\{main:true\}\)/.test(s03), 'bouton de 03');
});
await T('D3 · fiscal : une position de la voix, même LONG sans levier, est au régime spéculatif (décision automatique, règle de Rams) ; une LONG manuelle reste « normal »', () => {
  const c = {}; vm.createContext(c); vm.runInContext(fnSrc(s16, '_fiscNum') + '\n' + fnSrc(s16, '_fiscRegimeOf'), c);
  const v = vm.runInContext("_fiscRegimeOf({ side: 'long', auto: false, stakeUsdt: 50, totalExposure: 50, levBorrowed: 0, _voix: 'tendance' })", c);
  const m = vm.runInContext("_fiscRegimeOf({ side: 'long', auto: false, stakeUsdt: 50, totalExposure: 50, levBorrowed: 0 })", c);
  assert.strictEqual(v.regime, 'spec'); assert.ok(v.why.some(x => /voix tendance/.test(x))); assert.strictEqual(m.regime, 'normal');
});
await T('D4 · rapports, résumé hebdo et historique comptent les fermetures de la voix (ligne « tendance ») ; Telegram dit « tendance longue »', () => {
  assert.ok(/t\.type === 'tendance'\) && t\.pnlUsdt != null\) out\.push/.test(s05), 'rapports (05)');
  assert.ok(/t\.type !== 'urgence' && t\.type !== 'tendance'\)\) return;/.test(s06), 'hebdo (06)');
  assert.ok(/t\.type === 'urgence' \|\| t\.type === 'tendance';/.test(s07) && /'TENDANCE'/.test(s07), 'historique (07)');
  assert.ok(/i\.voix \? '📈 tendance longue'/.test(s06), 'Telegram');
});
await T('D5 · HTML : 15b chargé une fois, juste après 15 ; cadre #tlReel dans la barre Tendance longue ; 15 dit que ton argent EV la suit', () => {
  const i15 = html.indexOf('src="js/15-voix-tendance.js'), i15b = html.indexOf('src="js/15b-tendance-reelle.js');
  assert.ok(i15 > 0 && i15b > i15 && html.split('src="js/15b-tendance-reelle.js').length === 2);
  assert.ok(html.indexOf('id="tlReel"') > html.indexOf('id="tlGrid"'));
  assert.ok(/ton argent EV la suit avec de vraies positions/.test(rd('js/15-voix-tendance.js')));
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
})();
