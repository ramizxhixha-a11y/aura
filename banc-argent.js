// banc-argent.js — [GO ARGENT · 13/10/2026] VERSION 20261013a
// Les défauts d'argent du registre (ETAT-AURA8.md, audit du 13/10) : chaque essai fait tourner le VRAI texte des fonctions de l'app en vm et ÉCHOUE
// sur le code d'avant (BANC_ROOT=<copie du commit 9236ff4> node banc-argent.js). Les scripts de preuve de l'audit (rejeu/audit-20261013/) en sont la base.
//   A  n° 5 + 21  closePosition : le compte reçoit ce que l'historique écrit (perte bornée à la mise) ; frais sur l'exposition ; sans levier : identique au bit près
//   B  n° 4       pyramide et « ↑ Renforcer » : la fermeture rend le P&L exact de chaque entrée, levier gardé
//   C  n° 6       urgence / bunker : la fermeture passe par closePosition
//   D  n° 8       sortie de page : sauvegarde seulement, aucune position fermée
//   E  n° 1       loadState sur un stockage neuf : plus aucune migration « une fois » sur le vrai compte
//   F  n° 2 + 3   imports : jamais l'argent, l'historique, AUTO / MANU, le mode ; la confirmation nomme ce qui change
//   G  n° 7       « Restaurer état pré-réel » : n'écrit plus rien
//   H  n° 20      openPosition : une position ouverte sur la paire n'est plus fermée avant les contrôles
//   R  revue adverse du 13/10 (C1–C9) : trailing / anti-zombie après un ajout, aucune sortie sur un prix réel figé (EV / RE), urgence sans juges,
//      imports (__proto__, champs absents, fiscal / frais / cours / levier / Bunker), confirmation complète, journal des frais (mise), TWAP, cas limites
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
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const J = o => JSON.parse(JSON.stringify(o));
const near = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'),
      s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'), s06 = rd('js/06-v63-patterns-chartistes.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s9b2 = rd('js/09b2-save-load.js');
const TEMOIN = fs.readFileSync(path.join(__dirname, 'banc-fixtures/argent-avant-20261013a.js'), 'utf8');   // closePosition au token 20261012a

// ─── Le monde de fermeture : comptes d'un mode à plat, VRAIS closePosition, recordFees, releaseTradeReserve, repayLeverage, _computePortfolio(Sans) de 02 ───
// Ce qui juge (agents, bots, attribution, fiscal 16) est remplacé par des témoins : ce banc regarde l'ARGENT. Le registre fiscal est éprouvé par banc-fiscal.
const FEE = { takerRate: 0.001, makerRate: 0.0008, slippage: 0.0005, fundingRate: 0 };
const T0 = Date.UTC(2026, 9, 13, 20, 0, 0);   // une horloge fixe : deux mondes écrivent les mêmes heures
class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [T0])); } static now() { return T0; } }
function world(o) {
  o = o || {};
  const seen = { learn: [], fees: [], toasts: [] };
  const S = { tradingMode: 'paperReal', cashAccount: 100, tradingAccount: o.trading != null ? o.trading : 900, openPositions: [], pnlHistory: [1000], chainLog: [], cashLog: [], totalTrades: 0, winTrades: 0,
    leverage: o.leverage || 0, leverageReserve: 0, leverageBorrowed: o.borrowed || 0, leverageMaxMult: 10, _autoLevBorrowed: 0, antiNegReserve: 0, antiNegReserveLog: [],
    profitSplitCaissePct: o.split != null ? o.split : 30, feeConfig: Object.assign({}, FEE), taxConfig: { region: 'BE' }, paperRealStats: {}, agents: [], botFleet: {},
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {} };
  ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'].forEach(p => { S.pairStates[p] = { price: 100, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const c = { S, PAIRS: { 'BTC/USDT': { dec: 2 }, 'ETH/USDT': { dec: 2 }, 'SOL/USDT': { dec: 2 } }, Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN,
    console: { log() {}, warn() {}, error() {} }, showToast: (m) => seen.toasts.push(String(m)), rndHash: () => 'h', nowStr: () => '12:00:00',
    syncLeverageReserve() {}, recordTradeForHeatmap() {}, learnFromOutcome: (k, pct, pair) => seen.learn.push([pair, pct]), emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {},
    checkPnlAlerts() {}, checkBadges() {}, _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderPositions() {}, renderChain() {}, renderHome() {}, renderPyramideSection() {},
    renderActionsGrid() {}, renderOpenPosSummary() {}, _urgAppendLog() {}, saveFeeRecord() {}, addAnnualNetRealised() {}, _fiscOnClose: () => ({ movedUsd: 0, regime: 'speculatif', gainEur: 0 }) };
  c.window = c; vm.createContext(c);
  const names = ['_computePortfolio', '_computePortfolioSans', 'repayLeverage', 'releaseTradeReserve', 'recordFees'];
  const extra = (o.extra || []).map(([src, n]) => fnSrc(src, n)).join('\n');
  vm.runInContext(names.map(n => fnSrc(s02, n)).join('\n') + '\n' + (o.close || fnSrc(s02, 'closePosition')) + '\n' + extra
    + (has(s02, '_addToPosition') ? '\n' + fnSrc(s02, '_addToPosition') : '') + '\nvar S = this.S;', c);
  return { c, S, seen, run: code => vm.runInContext(code, c) };
}
const pos = (o) => Object.assign({ id: 'pA', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 30, totalExposure: 30, auto: false, openedAt: 1, entryTs: 1 }, o);
function ouvrir(W, p) { W.S.openPositions.push(p); W.S.tradingAccount -= p.stakeUsdt; if (p.levBorrowed) W.S.leverageBorrowed += p.levBorrowed; return p; }
const lastTrade = (W, pair) => { const t = W.S.pairStates[pair].trades; return t[t.length - 1]; };

(async () => {
console.log('▶ banc-argent · token ' + ((rd('AURA8_v118.html').match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]));

console.log('▶ A. closePosition — levier et frais (n° 5, n° 21)');
await T('A1 · levier ×10 (mise 30 $, exposition 300 $), prix −15 % : le compte perd 30 $ + frais, comme l\'historique écrit −30 $ (avant : −45 $ au compte)', () => {
  const W = world(); ouvrir(W, pos({ totalExposure: 300, levBorrowed: 270 })); W.S.pairStates['BTC/USDT'].price = 85;
  const t0 = W.S.tradingAccount; W.run("closePosition('pA')");
  const tr = lastTrade(W, 'BTC/USDT'), fee = W.S.fees.feeLog[0].totalFee;
  near(tr.pnlUsdt, -30, 1e-9, 'historique'); near(W.S.tradingAccount - t0, 30 - 30 - fee, 1e-9, 'compte = mise rendue + historique − frais');
  assert.strictEqual(W.S.leverageBorrowed, 0, 'levier remboursé'); assert.strictEqual(W.S.openPositions.length, 0);
});
await T('A2 · frais et glissement sur l\'EXPOSITION (300 $), pas sur la mise (30 $) : 300 × (0,1 % + 0,1 %) + 300 × 0,05 % × 2 (sortie taker, position manuelle)', () => {
  const W = world(); ouvrir(W, pos({ totalExposure: 300, levBorrowed: 270 })); W.S.pairStates['BTC/USDT'].price = 101;
  W.run("closePosition('pA')"); const f = W.S.fees.feeLog[0];
  near(f.totalFee, 300 * FEE.takerRate * 2 + 300 * FEE.slippage * 2, 1e-12, 'frais');
  // le journal garde la MISE dans « notional » (lu par l'estimateur du régime fiscal de la décision, 02 detectFiscalRegime indice 4 — revue du 13/10) ; l'exposition à part
  assert.strictEqual(f.notional, 30, 'notional = mise (la décision lit la même chose qu\'avant)'); assert.strictEqual(f.exposure, 300, 'exposure');
});
await T('A3 · SANS levier : le nouveau closePosition écrit le MÊME état que celui du 12/10 (témoin), au bit près — 400 fermetures tirées au hasard (LONG / SHORT, bot / main, gain / perte, caisse 0–55 %)', () => {
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < 400; k++) {
    const st = Math.round(5 + rnd() * 200), e = 50 + rnd() * 100, cur = e * (0.8 + rnd() * 0.4), side = rnd() < 0.5 ? 'long' : 'short', auto = rnd() < 0.5, split = Math.round(rnd() * 55);
    const mk = (close) => { const W = world({ split, close }); ouvrir(W, pos({ side, auto, entryPrice: e, stakeUsdt: st, totalExposure: st, _reservedAmount: rnd() < 0.3 ? 0.05 : undefined })); W.S.pairStates['BTC/USDT'].price = cur; return W; };
    const s0 = seed, A = mk(null); seed = s0; const B = mk(TEMOIN.replace(/^\/\/.*\n/gm, ''));
    A.run("closePosition('pA')"); B.run("closePosition('pA')");
    // le témoin tourne avec le recordFees d'aujourd'hui (le journal porte « exposure ») : sans levier, exposure = notional = la mise, et le reste est identique
    const a = J(A.S), b = J(B.S); [a, b].forEach(x => x.fees.feeLog.forEach(e => { assert.strictEqual(e.exposure, e.notional, 'exposure = mise sans levier'); delete e.exposure; }));
    assert.deepStrictEqual(a, b, 'fermeture ' + k); assert.deepStrictEqual(A.seen, B.seen, 'témoins ' + k);
  }
});
await T('A4 · levier sans dépassement de la mise (×3, −5 %) : compte et historique = 90 × −5 % = −4,50 $, comme avant', () => {
  const W = world(); ouvrir(W, pos({ totalExposure: 90, levBorrowed: 60 })); W.S.pairStates['BTC/USDT'].price = 95;
  const t0 = W.S.tradingAccount; W.run("closePosition('pA')"); const fee = W.S.fees.feeLog[0].totalFee;
  near(lastTrade(W, 'BTC/USDT').pnlUsdt, -4.5, 1e-9); near(W.S.tradingAccount - t0, 30 - 4.5 - fee, 1e-9);
});

console.log('▶ B. Ajout à une position : pyramide (05) et « ↑ Renforcer » (07) — n° 4');
const PY = (s05.match(/const _PY_CFG = \{[\s\S]*?\};/) || [''])[0];
function pyWorld(o) { const W = world(o); W.run(PY + '\n' + fnSrc(s05, 'pyramidPosition') + '\n' + fnSrc(s07, 'manuReinforce')); return W; }
const vraiPnl = (entrees, cur, side) => entrees.reduce((s, e) => s + e.exp * (side === 'long' ? (cur - e.price) : (e.price - cur)) / e.price, 0);
await T('B1 · pyramide LONG 30 $ @100, ajout @97, fermée @99 : crédité = P&L exact des deux entrées (+0,11 $ ; avant : −0,50 $)', () => {
  const W = pyWorld(); ouvrir(W, pos()); W.S.pairStates['BTC/USDT'].price = 97; W.run("pyramidPosition('pA')");
  const p = W.S.openPositions[0], add = p._pyramidEntries[0].stake; assert.strictEqual(add, 20, 'mise ajoutée 30 × 0,6 → 20 $');
  W.S.pairStates['BTC/USDT'].price = 99; W.run("closePosition('pA')");
  near(lastTrade(W, 'BTC/USDT').pnlUsdt, vraiPnl([{ price: 100, exp: 30 }, { price: 97, exp: 20 }], 99, 'long'), 1e-9, 'P&L');
});
await T('B2 · pyramide SHORT avec levier (mise 30, exposition 90 @100), ajout @103, fermée @101 : P&L exact, exposition 90 + 20 gardée (avant : remise à la mise)', () => {
  const W = pyWorld(); ouvrir(W, pos({ side: 'short', totalExposure: 90, levBorrowed: 60 })); W.S.pairStates['BTC/USDT'].price = 103; W.run("pyramidPosition('pA')");
  const p = W.S.openPositions[0]; assert.strictEqual(p.totalExposure, 110); assert.strictEqual(p.stakeUsdt, 50);
  W.S.pairStates['BTC/USDT'].price = 101; W.run("closePosition('pA')");
  near(lastTrade(W, 'BTC/USDT').pnlUsdt, vraiPnl([{ price: 100, exp: 90 }, { price: 103, exp: 20 }], 101, 'short'), 1e-9, 'P&L');
});
await T('B3 · 2e pyramide : mise dégressive depuis la 1re mise (30 × 0,6² → 10 $ ; avant : depuis la mise TOTALE), 3 entrées → P&L exact', () => {
  const W = pyWorld(); ouvrir(W, pos()); W.S.pairStates['BTC/USDT'].price = 97; W.run("pyramidPosition('pA')"); W.S.pairStates['BTC/USDT'].price = 95; W.run("pyramidPosition('pA')");
  const p = W.S.openPositions[0]; assert.deepStrictEqual(J(p._pyramidEntries.map(e => e.stake)), [20, 10]); assert.strictEqual(p.stakeUsdt, 60);
  W.S.pairStates['BTC/USDT'].price = 98; W.run("closePosition('pA')");
  near(lastTrade(W, 'BTC/USDT').pnlUsdt, vraiPnl([{ price: 100, exp: 30 }, { price: 97, exp: 20 }, { price: 95, exp: 10 }], 98, 'long'), 1e-9, 'P&L');
});
await T('B4 · « ↑ Renforcer » LONG 50 $ @100 après une hausse à 110 (+10 $), fermée @110 : +5 $ (la mise ajoutée n\'a rien gagné ; avant : +6 $)', () => {
  const W = pyWorld(); ouvrir(W, pos({ stakeUsdt: 50, totalExposure: 50 })); W.S.pairStates['BTC/USDT'].price = 110; W.run("manuReinforce('BTC/USDT')");
  assert.strictEqual(W.S.openPositions[0].stakeUsdt, 60); W.run("closePosition('pA')");
  near(lastTrade(W, 'BTC/USDT').pnlUsdt, 5, 1e-9, 'P&L');
});
await T('B5 · l\'argent est conservé : mise retirée du trading à l\'ajout = mise rendue à la fermeture (pyramide et Renforcer, prix inchangé, frais à part)', () => {
  const W = pyWorld({ split: 0 }); ouvrir(W, pos()); const t0 = W.S.tradingAccount + 30; W.S.pairStates['BTC/USDT'].price = 99; W.run("pyramidPosition('pA')"); W.run("manuReinforce('BTC/USDT')");
  const p = W.S.openPositions[0]; W.S.pairStates['BTC/USDT'].price = p.entryPrice; W.run("closePosition('pA')");
  near(W.S.tradingAccount, t0 - W.S.fees.totalGross, 1e-9, 'trading = départ − frais');
});

console.log('▶ C. Fermeture d\'urgence / Bunker (06) — n° 6');
await T('C1 · urgenceCloseAll = closePosition pour chaque position : même argent, ligne d\'historique, frais, levier remboursé (avant : rien de tout cela, levier jamais rendu)', () => {
  const mk = () => { const W = world(); W.run(fnSrc(s06, 'urgenceCloseAll')); ouvrir(W, pos({ totalExposure: 300, levBorrowed: 270 })); ouvrir(W, pos({ id: 'pB', pair: 'ETH/USDT', side: 'short', auto: true })); W.S.pairStates['BTC/USDT'].price = 102; W.S.pairStates['ETH/USDT'].price = 99; return W; };
  const U = mk(), R = mk(); U.run('urgenceCloseAll()'); R.run("closePosition('pA'); closePosition('pB')");
  ['tradingAccount', 'cashAccount', 'leverageBorrowed', 'openPositions'].forEach(k => assert.deepStrictEqual(J(U.S[k]), J(R.S[k]), k));
  ['totalTradingFees', 'totalSlippage', 'totalGross', 'totalPnlGross', 'totalPnlNet', 'tradeCount', 'feeReserveAccount'].forEach(k => assert.strictEqual(U.S.fees[k], R.S.fees[k], 'frais ' + k));
  // une ligne d'historique par paire, au même résultat (type « urgence » : voir R4)
  ['BTC/USDT', 'ETH/USDT'].forEach(p => { const a = U.S.pairStates[p].trades, b = R.S.pairStates[p].trades; assert.strictEqual(a.length, b.length); const x = J(a[a.length - 1]), y = J(b[b.length - 1]); assert.strictEqual(x.type, 'urgence'); x.type = 'position'; assert.deepStrictEqual(x, y); });
  assert.strictEqual(U.S.leverageBorrowed, 0); assert.strictEqual(U.S.fees.tradeCount, 2);
  assert.ok(U.S.chainLog.some(l => /^URGENCE: BTC\/USDT long fermé · \+\$6\.00 \(avant frais\)$/.test(l.desc)), 'ligne d\'urgence au journal');
});
await T('C2 · le Bunker (07 activateBunker, action « Fermer les positions ») passe par urgenceCloseAll', () => {
  assert.ok(/if\(cfg\.actions\.closePositions\) \{\s*try \{ urgenceCloseAll\?\.\(\); \} catch\(e\) \{\}/.test(fnSrc(s07, 'activateBunker')));
  assert.ok(!/S\.openPositions\s*=/.test(codeStrict(fnSrc(s06, 'urgenceCloseAll'))), 'plus aucune écriture directe de la liste des positions');
});

console.log('▶ D. Sortie de page (09b2) — n° 8');
await T('D1 · pagehide / beforeunload / freeze : sauvegarde seulement — les positions du bot (AUTO comme MANU) restent ouvertes, aucun jugement', () => {
  const L = s9b2.split('\n').filter(l => /^window\.addEventListener\('(pagehide|beforeunload|freeze)'/.test(l));
  assert.strictEqual(L.length, 3, 'trois écouteurs');
  const W = world(), flush = [], h = {}; ouvrir(W, pos({ auto: true })); ouvrir(W, pos({ id: 'pM', pair: 'ETH/USDT' }));
  W.c._flushSyncOnExit = r => flush.push(r); W.c.addEventListener = (ev, fn) => { h[ev] = fn; };
  if (has(s9b2, '_closeTradesOnExit')) W.run(fnSrc(s9b2, '_closeTradesOnExit'));
  W.run(L.join('\n'));
  [true, false].forEach(auto => { W.S.botAutoMode = auto; ['pagehide', 'beforeunload', 'freeze'].forEach(ev => h[ev]()); });
  assert.deepStrictEqual(W.S.openPositions.map(p => p.id), ['pA', 'pM'], 'positions intactes'); assert.strictEqual(W.seen.learn.length, 0, 'aucun jugement');
  assert.strictEqual(flush.length, 6, 'sauvegarde à chaque sortie');
});
await T('D2 · _closeTradesOnExit n\'existe plus nulle part dans le code chargé', () => {
  const html = rd('AURA8_v118.html'), files = (html.match(/src="js\/[^"?]+/g) || []).map(x => x.slice(5));
  files.forEach(f => assert.ok(!/_closeTradesOnExit/.test(codeStrict(rd(f))), f));
});

console.log('▶ E. loadState sur un stockage neuf (09b2) — n° 1');
await T('E1 · drapeaux localStorage absents (nouvelle tablette, données effacées) : comptes, cumul, courbe, bases et chronos du backup restent ceux du backup (avant : EV recalculé, cumul et courbe effacés, chronos à 0)', () => {
  const a = s9b2.indexOf('  // Au redemarrage, une NOUVELLE session commence.'), b = s9b2.indexOf("  setTimeout(() => {\n    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}\n  }, 50);", a);
  assert.ok(a > 0 && b > a, 'bloc de loadState trouvé');
  const wal = (tr, cash, net, start) => ({ tradingAccount: tr, cashAccount: cash, ownFundsInjected: 1000, fees: { totalPnlNet: net }, openPositions: [{ stakeUsdt: 20 }], _startPortfolio: start, _totalCompounded: -150,
    portfolio: start, pnlPeriod: { todayStartPortfolio: 1090, weekStartPortfolio: 1100, monthStartPortfolio: 1050, history: [1, 2] }, pnlHistory: new Array(80).fill(1080), pnl24h: 3, bunker: { capRef: 1077 } });
  const S = { walletStore: { sim: wal(986.56, 47.39, -229.6, 1053.95), paperReal: wal(1075.7, 6.58, -149.54, 1102.28), real: wal(1145.42, 0, 0, 1165.42) } };
  S.pnlHistory = S.walletStore.paperReal.pnlHistory; S.pnlPeriod = S.walletStore.paperReal.pnlPeriod; S.pnl24h = 3;
  const before = J(S), chrono = { reset: 0 };
  const c = { S, JSON, Math, Number, Object, Array, String, Date, isFinite, console, localStorage: { getItem: () => null, setItem() {} },
    window: { AuraChrono: { resetAll: () => { chrono.reset++; } } }, _computePortfolio: w => (w.cashAccount || 0) + (w.tradingAccount || 0) + (w.openPositions || []).reduce((t, p) => t + p.stakeUsdt, 0) };
  vm.createContext(c); vm.runInContext('(function(){ var dbg = [];\n' + s9b2.slice(a, b) + '\n})();', c);
  ['sim', 'paperReal', 'real'].forEach(m => {
    const w = S.walletStore[m], w0 = before.walletStore[m];
    assert.strictEqual(w.tradingAccount, w0.tradingAccount, m + ' trading'); assert.strictEqual(w.cashAccount, w0.cashAccount, m + ' caisse');
    assert.strictEqual(w.pnlHistory.length, 80, m + ' courbe'); assert.deepStrictEqual(w.bunker, w0.bunker, m + ' bunker');
    const pf = w0.cashAccount + w0.tradingAccount + 20;   // relance normale : la session écoulée versée au cumul, la session repart du portefeuille
    near(w._totalCompounded, -150 + (pf - w0._startPortfolio), 1e-9, m + ' cumul'); near(w._startPortfolio, pf, 1e-9, m + ' départ de session');
  });
  assert.strictEqual(chrono.reset, 0, 'chronos'); assert.strictEqual(S.pnlHistory.length, 80, 'courbe du mode'); assert.deepStrictEqual(S.pnlPeriod.history, [1, 2], 'historique des périodes');
});

console.log('▶ F. Imports (04, liste blanche 03) — n° 2 et n° 3');
function importWorld() {
  const seen = { confirm: '', saved: 0, alerts: [] };
  const c = { Math, Number, Object, Array, String, JSON, Date, isFinite, console: { log() {}, warn() {}, error() {} },
    confirm: (m) => { seen.confirm = m; return true; }, alert: (m) => seen.alerts.push(m), showToast() {}, renderSettingsPanel() {},
    saveState: () => { seen.saved++; }, _buildFullBackup: () => ({}), _saveBackupToDB: async () => {}, makePairState: () => ({ trades: [] }), PAIRS: {} };
  c.window = c; vm.createContext(c);
  const take = (re, src) => (src.match(re) || [''])[0];
  const parts = ['const S={tradingMode:"paperReal",botAutoMode:false,mode:"manual",profitSplitCaissePct:0,cycle:1365892,agents:[{id:"a1",fitness:812}],walletStore:null,chainLog:[],paperRealConfig:{x:1}};',
    fnSrc(s02, '_freshWallet'), fnSrc(s02, '_freshWalletStore'), fnSrc(s02, '_walletKey'), fnSrc(s02, '_walletFor'), fnSrc(s02, '_activeWallet'),
    take(/var _WALLET_ACCESSOR_FIELDS = \[[\s\S]*?\];/, s02), fnSrc(s02, '_installWalletAccessors'), '_installWalletAccessors(); window._WALLET_ACCESSOR_FIELDS = _WALLET_ACCESSOR_FIELDS;',
    take(/const AURA_IMPORT_ALLOWED_FIELDS = \[[\s\S]*?\];/, s03), take(/const AURA_PROTECTED_FIELDS = \[[\s\S]*?\];/, s04),
    take(/const AURA_IMPORT_NEVER_FIELDS = \[[\s\S]*?\];/, s04), has(s04, '_importNeverField') ? fnSrc(s04, '_importNeverField') : '',
    take(/const AURA_IMPORT_DECISION_FIELDS = \[[\s\S]*?\];/, s04), take(/const AURA_IMPORT_KEPT_TEXT = [^\n]*\n/, s04), has(s04, '_importFieldsText') ? fnSrc(s04, '_importFieldsText') : '',
    fnSrc(s04, '_validateBackupCoherence'), fnSrc(s04, '_countBackupChanges'), fnSrc(s04, 'importBackupMaxPermissive'), fnSrc(s04, 'importBackup'), 'globalThis.__S = S;'];
  vm.runInContext(parts.join('\n'), c);
  vm.runInContext(`_walletFor('paperReal').tradingAccount = 1075.70; _walletFor('paperReal').cashAccount = 6.58; _walletFor('paperReal').totalTrades = 354; _walletFor('paperReal').leverage = 0;
    _walletFor('paperReal').pairStates = { 'BTC/USDT': { trades: new Array(40).fill({ p: 1 }), totalTrades: 40, totalPnlUsd: -12 } }; _walletFor('paperReal').fiscal = { an: 2026 };`, c);
  return { c, seen, run: code => vm.runInContext(code, c) };
}
const vieux = { walletStore: { sim: { tradingAccount: 1 }, paperReal: { tradingAccount: 500, cashAccount: 0, totalTrades: 3, pairStates: { 'BTC/USDT': { trades: [{ p: 9 }], totalTrades: 1, totalPnlUsd: 99 } }, openPositions: [], fiscal: { an: 1999 } }, real: { tradingAccount: 2 } },
  tradingMode: 'real', botAutoMode: true, mode: 'auto', profitSplitCaissePct: 55, leverage: 5, agents: [{ id: 'a1', fitness: 100 }], cycle: 900000, tradingAccount: 500, portfolio: 500,
  pairStates: { 'BTC/USDT': { totalTrades: 1, totalPnlUsd: 99 } }, fees: { totalPnlNet: 7 }, paperRealConfig: { x: 2 }, paperRealStats: { 'BTC/USDT': { trades: 1 } } };
const fichier = st => ({ text: async () => JSON.stringify({ meta: { app: 'AURA', date: Date.now(), label: 'vieux' }, state: st }) });
const argent = X => ({ EV: J(X.run("_walletFor('paperReal')")), AA: J(X.run("_walletFor('sim')")), RE: J(X.run("_walletFor('real')")), botAutoMode: X.run('S.botAutoMode'), mode: X.run('S.mode'), tradingMode: X.run('S.tradingMode'), split: X.run('S.profitSplitCaissePct'), cycle: X.run('S.cycle'), stats: J(X.run('S.paperRealStats || null')) });
await T('F1 · « Importer MAX PERMISSIF » d\'un vieux fichier (EV 500 $ / 3 trades, AUTO, mode RE, caisse 55 %) : les 3 portefeuilles, AUTO / MANU, le mode, la caisse, le cycle restent les tiens (avant : EV 500 $ / 3 trades, AUTO)', async () => {
  const X = importWorld(), av = argent(X);
  await X.run('importBackupMaxPermissive')(fichier(vieux));
  assert.deepStrictEqual(argent(X), av); assert.ok(X.seen.saved >= 1, 'importé (sauvegardé)'); assert.deepStrictEqual(J(X.run('S.paperRealConfig')), { x: 2 }, 'une configuration est bien importée');
});
await T('F2 · MAX PERMISSIF : la confirmation NOMME ce qui change — la population d\'agents en clair (1 → 1 agents), les autres champs par leur nom — et dit ce qui ne change pas ; plus jamais « protégées » sans l\'être', async () => {
  const X = importWorld(); await X.run('importBackupMaxPermissive')(fichier(vieux));
  const m = X.seen.confirm;
  assert.ok(/🧠 agents : TOUTE la population \(1 → 1 agents/.test(m), m); assert.ok(m.includes('paperRealConfig'), m);
  assert.ok(m.includes('Ne changent PAS : tes 3 portefeuilles'), m); assert.ok(!/HISTORIQUES \(capital, trades, archives\) sont protégées/.test(m));
  ['walletStore', 'botAutoMode', 'tradingMode', 'profitSplitCaissePct', 'pairStates', 'fees', 'leverage', 'cycle', 'paperRealStats'].forEach(f => assert.ok(!new RegExp('\\b' + f + '\\b').test(m.split('Ne changent PAS')[0]), f + ' annoncé comme changé'));
  assert.strictEqual(X.run('S.agents[0].fitness'), 100, 'agents remplacés, comme annoncé');
});
await T('F3 · « Importer SÉCURISÉ » d\'un fichier en AUTO / mode RE / levier ×5 / caisse 55 % : rien de cela n\'est écrit ; la confirmation nomme les configurations remplacées (avant : AUTO remis, levier et caisse réécrits)', async () => {
  const X = importWorld(), av = argent(X);
  await X.run('importBackup')(fichier(vieux));
  assert.deepStrictEqual(argent(X), av); assert.deepStrictEqual(J(X.run('S.paperRealConfig')), { x: 2 });
  assert.ok(/paperRealConfig/.test(X.seen.confirm) && !/botAutoMode|tradingMode|leverage|profitSplit/.test(X.seen.confirm.split('Ne changent PAS')[0]), X.seen.confirm);
  const LISTE = (s03.match(/const AURA_IMPORT_ALLOWED_FIELDS = \[[\s\S]*?\];/) || [''])[0].split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  ['botAutoMode', 'mode', 'tradingMode', 'leverage', 'profitSplitCaissePct'].forEach(f => assert.ok(!new RegExp("'" + f + "'").test(LISTE), f + ' encore dans la liste blanche'));
});
await T('F4 · un champ qui est un accesseur de portefeuille sur S est refusé même s\'il manquait aux listes (ex. « realPairCycle », « cashLog »)', () => {
  const X = importWorld(); assert.strictEqual(X.run("_importNeverField('realPairCycle')"), true); assert.strictEqual(X.run("_importNeverField('cashLog')"), true);
  assert.strictEqual(X.run("_importNeverField('paperRealConfig')"), false);
});

console.log('▶ G. « ↶ Restaurer état pré-réel » (02, 04) — n° 7');
await T('G1 · même avec un snapshot pré-réel présent, confirmRollbackPreReal n\'écrit RIEN (avant : historique d\'un autre mode dans RE, agents remplacés, stats EV effacées)', () => {
  const c = { S: { tradingMode: 'real', preRealSnapshot: { snap: { agents: [{ id: 'x' }], pairStates: { a: 1 }, fees: { f: 1 }, pnlHistory: [1], cycle: 5 }, takenAt: 1, meta: { totalUsd: 999 } }, agents: [{ id: 'a1' }], paperRealStats: { s: 1 }, tradingAccount: 10, cashAccount: 1 },
    confirm: () => true, showToast() {}, _updateRealModeBanner() {}, renderSettingsPanel() {}, renderHome() {}, _walletFor: () => ({}), JSON, Object, Array, Math, Date, isFinite };
  c.window = c; vm.createContext(c); const av = J(c.S); vm.runInContext(fnSrc(s02, 'confirmRollbackPreReal') + '\nconfirmRollbackPreReal();', c); assert.deepStrictEqual(J(c.S), av);
});
await T('G2 · le bouton n\'est plus dessiné (04) et l\'activation du RE ne prend plus de snapshot pré-réel (02)', () => {
  assert.ok(!/onclick="confirmRollbackPreReal\(\)"/.test(s04)); assert.ok(!/S\.preRealSnapshot\s*=/.test(codeStrict(fnSrc(s02, 'confirmSwitchToReal'))));
});

console.log('▶ H. openPosition (02) — n° 20');
await T('H1 · une position déjà ouverte sur la paire : l\'ouverture est refusée et le dit, la position reste ouverte, rien n\'est fermé (avant : fermée d\'abord, puis ouverture refusée faute de capital)', () => {
  const W = world({ trading: 5 }); ouvrir(W, pos({ id: 'pBot', auto: true }));
  Object.assign(W.c, { _manOpenWarnings: () => [], borrowLeverage: () => 0, validateTotalExposure: () => ({ ok: false, available: 0 }), ensureLeverageCoverForTrade: () => ({ ok: true, borrowed: 0 }),
    fmt$: x => '$' + x, fmt$2: x => '$' + x, lmsrP: () => 0.5, _manConsigneOf: () => ({ maxLossPct: 2, timeoutMin: 60 }), _calcBotTpSl: () => null, notifTradeOpen() {} });
  W.S.pairStates['BTC/USDT'].stake = 30; W.run(fnSrc(s02, 'openPosition'));
  const r = W.run("openPosition('BTC/USDT', 'short')");
  assert.strictEqual(r, null); assert.deepStrictEqual(W.S.openPositions.map(p => p.id), ['pBot'], 'la position du bot est toujours là'); assert.strictEqual(W.S.fees.tradeCount, 0, 'rien de fermé');
  assert.ok(W.seen.toasts.some(t => /déjà ouverte/.test(t)), W.seen.toasts.join(' | '));
});

console.log('▶ R. Revue adverse du 13/10 (constats C1 à C9, corrigés dans la même livraison)');
const s09c = rd('js/09c-auto-open.js'), s10f = rd('js/10f-resolveur-cycle.js'), s16 = rd('js/16-fiscal.js');
// le VRAI balayage de sortie de 07 (trailing, anti-zombie, bascule, TP / SL manuels) : closePosition remplacé par un témoin
function sortieWorld(o) {
  const closed = [], S = { tradingMode: o.mode || 'paperReal', openPositions: o.positions, pairStates: o.pairStates, gainRules: {}, chainLog: [] };
  const c = { S, Math, Number, Object, Array, String, JSON, Date, isFinite, isNaN, console: { log() {}, warn() {} }, rndHash: () => 'h', nowStr: () => 't', showToast() {},
    lmsrP: () => 0.5, _rcPriceAge: () => (o.age === undefined ? 0 : o.age), _rcSeenAge: () => (o.age === undefined ? 0 : o.age), closePosition: (id) => { closed.push(id); S.openPositions = S.openPositions.filter(p => p.id !== id); } };
  c.window = c; vm.createContext(c); vm.runInContext(fnSrc(s07, '_trailStopHit') + '\n' + fnSrc(s07, 'learnFromOpenPositions') + (has(s02, '_addToPosition') ? '\n' + fnSrc(s02, '_addToPosition') : '') + '\nvar S = this.S;', c);
  return { c, S, closed, run: code => vm.runInContext(code, c) };
}
await T('R1 (C1) · « ↑ Renforcer » après un pic (LONG 50 $ @100, TP 102, pic 101,96, prix 101,5) : le trailing NE ferme PAS au prix même du renforcement (avant la revue : fermée)', () => {
  const pos = pos0 => Object.assign({ id: 'm1', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 50, totalExposure: 50, auto: false, tp: 102, sl: 98, openedAt: Date.now() - 600000 }, pos0);
  const W = sortieWorld({ positions: [pos()], pairStates: { 'BTC/USDT': { price: 101.96 } } });
  W.run('learnFromOpenPositions()'); W.S.pairStates['BTC/USDT'].price = 101.5; W.run('learnFromOpenPositions()'); assert.deepStrictEqual(W.closed, [], 'pas armé avant le renfort');
  W.run("_addToPosition(S.openPositions[0], 10, 101.5)"); W.run('learnFromOpenPositions()'); W.run('learnFromOpenPositions()');
  assert.deepStrictEqual(W.closed, [], 'pas de sortie au prix du renforcement');
  W.S.pairStates['BTC/USDT'].price = 101.9; W.run('learnFromOpenPositions()'); W.S.pairStates['BTC/USDT'].price = 101.2; W.run('learnFromOpenPositions()');
  assert.deepStrictEqual(W.closed, ['m1'], 'le trailing se ré-arme ensuite normalement (pic 101,9 → repli 101,2)');
});
await T('R2 (C1) · pyramide sur une position du BOT ouverte il y a 40 min, prix −0,40 % (−0,24 % après l\'ajout) : l\'anti-zombie compte ses 30 min depuis l\'ajout (avant la revue : fermée « à plat » au tick suivant)', () => {
  const W = sortieWorld({ positions: [{ id: 'b1', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 30, totalExposure: 30, auto: true, openedAt: Date.now() - 2400000 }], pairStates: { 'BTC/USDT': { price: 99.6 } } });
  W.run('learnFromOpenPositions()'); assert.deepStrictEqual(W.closed, []); W.run("_addToPosition(S.openPositions[0], 20, 99.6)"); W.run('learnFromOpenPositions()');
  assert.deepStrictEqual(W.closed, [], 'pas fermée à l\'ajout'); assert.ok(W.S.openPositions[0]._addedAt > 0);
  W.S.openPositions[0]._addedAt -= 31 * 60000; W.run('learnFromOpenPositions()'); assert.deepStrictEqual(W.closed, ['b1'], '31 min à plat après l\'ajout : la règle s\'applique');
});
await T('R3 (C4) · EV, position du bot à plat depuis 2 h, AUCUN prix réel depuis la relance : rien n\'est fermé ; prix frais : l\'anti-zombie s\'applique comme avant ; AA : inchangé', () => {
  const mk = (age, mode) => sortieWorld({ age, mode, positions: [{ id: 'z', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 30, totalExposure: 30, auto: true, openedAt: Date.now() - 7200000 }], pairStates: { 'BTC/USDT': { price: 100 } } });
  let W = mk(Infinity); W.run('learnFromOpenPositions()'); assert.deepStrictEqual(W.closed, [], 'prix jamais reçu');
  W = mk(130000); W.run('learnFromOpenPositions()'); assert.deepStrictEqual(W.closed, [], 'prix vieux de 2 min 10');
  W = mk(5000); W.run('learnFromOpenPositions()'); assert.deepStrictEqual(W.closed, ['z'], 'prix frais');
  W = mk(Infinity, 'sim'); W.run('learnFromOpenPositions()'); assert.deepStrictEqual(W.closed, ['z'], 'AA (bougies fabriquées) : inchangé');
  assert.ok(/\(S\.tradingMode === 'paperReal' \|\| S\.tradingMode === 'real'\) && typeof _rcSeenAge === 'function' && _rcSeenAge\(pos\.pair\) > 120000\) return;/.test(fnSrc(s10f.replace(/^window\._botExitSweep = function _botExitSweep/m, 'function _botExitSweep'), '_botExitSweep')), '10f _botExitSweep : même garde');
});
await T('R3b (2e passage, N2) · un saut de prix de plus de 2 % (écarté 5 min par le filtre) ne coupe PAS les sorties : l\'âge du prix REÇU reste frais ; aucun prix : Infinity', () => {
  const c = { Date, Math, isFinite, window: {} }; vm.createContext(c);
  vm.runInContext((s02.match(/var _rcLastPx = \{\};[^\n]*\n/) || [''])[0] + (s02.match(/var _rcLastJump = \{\};[^\n]*\n/) || [''])[0] + fnSrc(s02, '_rcOutlier') + '\n' + fnSrc(s02, '_rcPriceAge') + '\n' + fnSrc(s02, '_rcSeenAge'), c);
  const t = Date.now(); assert.strictEqual(vm.runInContext("_rcSeenAge('BTC/USDT')", c), Infinity);
  vm.runInContext("_rcOutlier('BTC/USDT', 100, " + (t - 180000) + ")", c);                     // accepté il y a 3 min
  assert.strictEqual(vm.runInContext("_rcOutlier('BTC/USDT', 97.5, " + (t - 1000) + ")", c), true, 'saut de 2,5 % : écarté');
  assert.ok(vm.runInContext("_rcPriceAge('BTC/USDT')", c) > 120000, 'prix accepté : vieux'); assert.ok(vm.runInContext("_rcSeenAge('BTC/USDT')", c) < 5000, 'prix reçu : frais');
});
await T('R4 (C2) · urgence : l\'argent, l\'historique, les frais comme toute fermeture — mais AUCUN juge ni porte (agents, anti-revenge, stats / cooldown EV, série de pertes) ; une fermeture ordinaire, elle, juge', () => {
  const mk = () => { const W = world(); W.S.botFleet = { b: {} }; W.c.checkAntiRevenge = () => W.seen.learn.push(['anti-revenge']); W.c._botJudgeMeasured = () => W.seen.learn.push(['bot']);
    W.run(fnSrc(s06, 'urgenceCloseAll')); ouvrir(W, pos({ auto: true, _bot: 'b' })); ouvrir(W, pos({ id: 'pB', pair: 'ETH/USDT', auto: true })); W.S.pairStates['BTC/USDT'].price = 98; W.S.pairStates['ETH/USDT'].price = 97; return W; };
  const U = mk(), N = mk(); U.run('urgenceCloseAll()'); N.run("closePosition('pA'); closePosition('pB')");
  assert.deepStrictEqual(U.seen.learn, [], 'aucun juge'); assert.deepStrictEqual(J(U.S.paperRealStats), {}); assert.ok(!U.S._lossStreaks && !U.S.paperRealLastClose && !U.S.paperRealConsecLosses);
  assert.ok(N.seen.learn.length >= 4 && Object.keys(N.S.paperRealStats).length === 2, 'fermeture ordinaire : jugée');
  ['tradingAccount', 'cashAccount', 'openPositions'].forEach(k => assert.deepStrictEqual(J(U.S[k]), J(N.S[k]), 'même argent : ' + k));
  ['totalTradingFees', 'totalSlippage', 'totalGross', 'tradeCount'].forEach(k => assert.strictEqual(U.S.fees[k], N.S.fees[k], 'mêmes frais : ' + k));
  // 2e passage (N1) : la ligne d'historique est écrite avec le type « urgence » — aucun lecteur de la décision (tous lisent « position ») ne la voit ;
  // compteurs de la paire, journal des 50 frais (lu par l'estimateur du régime fiscal) : comme avant l'urgence
  ['BTC/USDT', 'ETH/USDT'].forEach(p => { const u = U.S.pairStates[p], tr = u.trades[u.trades.length - 1];
    assert.strictEqual(tr.type, 'urgence'); assert.strictEqual(tr.pnlUsdt, N.S.pairStates[p].trades[N.S.pairStates[p].trades.length - 1].pnlUsdt, 'même résultat écrit');
    assert.deepStrictEqual([u.totalTrades, u.winTrades, u.totalPnlUsd], [0, 0, 0], 'compteurs de la paire'); assert.ok(!u.trades.some(t => t.type === 'position')); });
  assert.deepStrictEqual(J(U.S.fees.feeLog), [], 'journal des frais lu par la décision'); assert.strictEqual(N.S.fees.feeLog.length, 2);
});
await T('R5 (C3, C6) · imports : « __proto__ », « constructor », un champ que S n\'a pas, fiscalCfg, taxConfig, feeConfig, cours €, levier, Bunker, kill switch EV : refusés', () => {
  const X = importWorld(); X.run("S.fiscalCfg = { commune: 0 }; S.usdEurRate = 0.9; S.bunkerCfg = { x: 1 }; S.feeConfig = { takerRate: 0.001 }; S.paperRealKillSwitch = {};");
  ['__proto__', 'constructor', 'prototype', 'fullPowerMode', 'fiscalCfg', 'taxConfig', 'feeConfig', 'usdEurRate', '_usdEurLastFetch', 'leverageMaxMult', 'leverageBorrowRate', 'bunkerCfg', 'paperRealKillSwitch', 'a-b']
    .forEach(f => assert.strictEqual(X.run('_importNeverField(' + JSON.stringify(f) + ')'), true, f));
  assert.strictEqual(X.run("_importNeverField('paperRealConfig')"), false);
});
await T('R6 (C3) · MAX PERMISSIF d\'un fichier avec « __proto__ » : le prototype de S n\'est pas remplacé, aucun champ absent n\'apparaît', async () => {
  const X = importWorld(), proto0 = X.run('Object.getPrototypeOf(S)');
  await X.run('importBackupMaxPermissive')({ text: async () => '{"meta":{"app":"AURA","date":1,"label":"x"},"state":{"__proto__":{"fullPowerMode":true},"_manualPairs":{"BTC/USDT":true},"paperRealConfig":{"x":3}}}' });
  assert.strictEqual(X.run('Object.getPrototypeOf(S)'), proto0, 'prototype intact'); assert.strictEqual(X.run('S.fullPowerMode'), undefined); assert.strictEqual(X.run("Object.prototype.hasOwnProperty.call(S, '_manualPairs')"), false);
  assert.deepStrictEqual(J(X.run('S.paperRealConfig')), { x: 3 }, 'un réglage existant est importé');
});
await T('R7 (C6) · la confirmation nomme TOUS les champs remplacés, ceux de la décision d\'abord (rien sous « … et N autres »)', async () => {
  const X = importWorld(), st = { meta: { app: 'AURA', date: 1, label: 'x' }, state: {} };
  const noms = []; for (let i = 0; i < 60; i++) { noms.push('cfg' + i); X.run('S.cfg' + i + ' = 0;'); st.state['cfg' + i] = 1; }
  X.run('S.dcThreshold = 1; S.genome = {};'); st.state.dcThreshold = 2; st.state.genome = { a: 1 };
  await X.run('importBackupMaxPermissive')({ text: async () => JSON.stringify(st) });
  const m = X.seen.confirm; assert.ok(/🧠 décision \(2\) : dcThreshold, genome/.test(m), m.slice(0, 400)); noms.forEach(n => assert.ok(new RegExp('\\b' + n + '\\b').test(m), n)); assert.ok(!/autres\)?\s*$|… et \d+ autres/.test(m.split('Ne changent PAS')[0]));
});
await T('R8 (C5) · le journal des frais garde la MISE dans « notional » (l\'estimateur du régime fiscal de la décision lit la même chose qu\'avant), l\'exposition à part', () => {
  const W = world(); ouvrir(W, pos({ totalExposure: 300, levBorrowed: 270 })); W.S.pairStates['BTC/USDT'].price = 101; W.run("closePosition('pA')");
  assert.strictEqual(W.S.fees.feeLog[0].notional, 30); assert.strictEqual(W.S.fees.feeLog[0].exposure, 300);
  assert.ok(/const notionals = fl\.map\(e => e\.notional\)/.test(fnSrc(s02, 'detectFiscalRegime')), 'l\'indice 4 lit « notional »');
});
await T('R9 (C7) · TWAP : un ajout pendant un remplissage est refusé ; un morceau en retard de plus de 2 min arrête le plan (entrée gardée) au lieu d\'acheter au prix du retour', () => {
  const W = world(); const p = ouvrir(W, pos({ _twap: { n: 2, filled: 1, sumPrice: 100, p0: 100, nextAt: T0 - 3 * 3600000 } }));   // horloge du monde : T0
  assert.strictEqual(W.run("_addToPosition(S.openPositions[0], 10, 100)"), null, 'ajout refusé pendant le TWAP');
  const i = s09c.indexOf('setInterval(function _twapSweep() {'); assert.ok(i > 0);
  const sweep = fnSrc('\n' + s09c.slice(i + 'setInterval('.length), '_twapSweep');
  W.S.pairStates['BTC/USDT'].price = 110; W.run(sweep + '\n_twapSweep();');
  assert.strictEqual(W.S.openPositions[0].entryPrice, 100, 'entrée gardée'); assert.strictEqual(W.S.openPositions[0]._twap, null, 'plan arrêté');
  const W2 = world(); ouvrir(W2, pos({ _twap: { n: 2, filled: 1, sumPrice: 100, p0: 100, nextAt: T0 - 1000 } })); W2.S.pairStates['BTC/USDT'].price = 101; W2.run(sweep + '\n_twapSweep();');
  assert.strictEqual(W2.S.openPositions[0].entryPrice, 100.5, 'à l\'heure : rempli comme avant');
});
await T('R10 (C8) · « ↑ Renforcer » puis pyramide : la mise dégressive part de la 1re entrée (30 $ de 50 $) ; pyramide sans prix : refusée ; cours € de l\'entrée = moyenne pondérée par l\'exposition', () => {
  const W = pyWorld(); ouvrir(W, pos({ stakeUsdt: 50, totalExposure: 50, _fxIn: 0.9 })); W.S._usdEurLastFetch = 1; W.S.usdEurRate = 0.8; W.S.pairStates['BTC/USDT'].price = 101; W.run("manuReinforce('BTC/USDT')");
  const p = W.S.openPositions[0]; assert.deepStrictEqual(J(p._pyFirst), { price: 100, stake: 50 }); near(p._fxIn, (50 * 0.9 + 10 * 0.8) / 60, 1e-12, '_fxIn');
  W.S.pairStates['BTC/USDT'].price = 99; W.run("pyramidPosition('pA')"); assert.strictEqual(p._pyramidEntries[0].stake, 30, 'mise = 50 × 0,6');
  const W2 = pyWorld(); ouvrir(W2, pos()); W2.S.pairStates['BTC/USDT'].price = 0; const t0 = W2.S.tradingAccount; W2.run("pyramidPosition('pA')");
  assert.strictEqual(W2.S.tradingAccount, t0, 'rien débité'); assert.ok(!W2.S.openPositions[0]._pyramidEntries);
});
await T('R11 (C9) · refus d\'ouverture sur une position du BOT : le message dit « ferme-la d\'abord (✕) », sans proposer « Inverser » (absent de l\'écran pour le bot)', () => {
  const W = world(); ouvrir(W, pos({ id: 'pBot', auto: true }));
  Object.assign(W.c, { _manOpenWarnings: () => [], borrowLeverage: () => 0, validateTotalExposure: () => ({ ok: true }), ensureLeverageCoverForTrade: () => ({ ok: true, borrowed: 0 }), fmt$: x => '$' + x, fmt$2: x => '$' + x, lmsrP: () => 0.5, _manConsigneOf: () => ({}), _calcBotTpSl: () => null, notifTradeOpen() {} });
  W.run(fnSrc(s02, 'openPosition')); W.run("openPosition('BTC/USDT', 'long')"); const t = W.seen.toasts.join(' | ');
  assert.ok(/du bot est déjà ouverte — ferme-la d'abord \(✕\)/.test(t) && !/inverse/.test(t), t);
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
})();
