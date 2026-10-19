// banc-nettoyage-argent.js — [GO NETTOYAGE · 19/10/2026] VERSION 20261019a
// La part « argent » de go nettoyage (registre ETAT-AURA8.md) et les décisions de Rams du 18/10. Chaque essai fait tourner le VRAI texte de l'app en vm
// (02, 03, 05, 07, 08, 09j, 18) et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit 6ee5844> node banc-nettoyage-argent.js), sauf les gardes de
// non-régression marquées « garde ».
//   A  n° 52  règle Rams du 18/10 (« le trade est clôturé avant de perdre plus que la capacité du compte trading — frais, taxes, dettes ») : le contrôle de
//             solvabilité tourne avec ou sans levier, à chaque battement pour le mode à l'écran, dans _bgModeWatch pour un mode derrière l'écran ; l'impôt est
//             celui du registre légal (16) ; une mesure ratée ne solde rien ; sans dette du levier l'index n'est pas rabattu.
//   B  n° 54  des frais que le trading ne couvre pas restent DUS (w._feesDue), repris à la fermeture suivante, comptés dans le « net en poche ».
//   C  n° 53  remise à zéro d'un compte (appui long) : une question dit le compte, le montant et ce qu'il devient ; « Annuler » = rien.
//   D  n° 55  sortie par paliers : la part fermée passe par closePosition (frais, réserve, historique « partiel »), sans rien pour la décision ; TP2 = 50 % du
//             reste, TP3 = tout le reste (avant : la mise restante était réduite deux fois).
//   E  n° 58  capacité « juste à temps » = base × index (règle du 15/08) ; baisser l'index n'emprunte jamais ; S.portfolio écrit après l'ajout de la position.
//   F  n° 59  carte de paire : la mise et le levier ; « Prochain trade estimé » = la mise que 09c prendrait, frais aller-retour.
//   G  n° 60  « Inverser » une position perdante d'un compte investi : rouverte avec ce que le trading tient, et dit.
//   H  n° 51  recalage de l'AA (js/18-recalage-aa.js) : une fois, sur confirmation, −3 707,64 $ et les repères posés pendant l'écart ; rien d'autre.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ex = f => fs.existsSync(path.join(ROOT, f));
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
const has = (src, name) => new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(').test(src);
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'fin : ' + b.slice(0, 50)); return s.slice(i, j); };
const near = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'),
      s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'), s9j = rd('js/09j-helpers.js'), html = rd('AURA8_v118.html');

// ─── Le monde : un portefeuille à plat (EV), VRAIES fonctions d'argent (même harnais que banc-levier.js) ───
const FEE = { takerRate: 0.001, makerRate: 0.001, slippage: 0.0003, fundingRate: 0 };
let TICK = Date.UTC(2026, 9, 19, 9, 0, 0);
class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [TICK])); } static now() { return ++TICK; } }
const F02 = ['_computePortfolio', '_computePortfolioSans', '_tradingCapitalBase', 'syncLeverageReserve', 'applyAutoLeverageBorrow', 'ensureLeverageCoverForTrade', 'borrowLeverage',
  'repayLeverage', 'recordFees', 'releaseTradeReserve', '_manOpenWarnings', '_manConsigneOf', 'openPosition', 'closePosition', 'changeLeverage', '_leverageSolvency',
  '_forceCloseAllForSolvency', 'fmt$', 'fmt$2', '_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto'];
function world(o) {
  o = o || {};
  const seen = { toasts: [], confirms: [], learn: 0, tg: [] };
  const els = {};
  const el = id => els[id] || (els[id] = { id, value: '', textContent: '', innerHTML: '', style: {}, classList: { add() {}, remove() {} }, querySelector: () => null, querySelectorAll: () => ({ length: 99 }) });
  const S = { tradingMode: 'paperReal', cashAccount: o.cash != null ? o.cash : 0, tradingAccount: o.trading != null ? o.trading : 100, openPositions: [], pnlHistory: [100], chainLog: [], cashLog: [],
    totalTrades: 0, winTrades: 0, leverage: o.leverage || 0, leverageReserve: 0, leverageBorrowed: 0, leverageMaxMult: 10, leverageBorrowRate: 0, _autoLevBorrowed: 0, _autoLevBase: 0,
    antiNegReserve: 0, antiNegReserveLog: [], fiscalReserveAccount: 0, fiscalReserveLog: [], ownFundsInjected: 77, profitSplitCaissePct: 0, feeConfig: Object.assign({}, FEE),
    taxConfig: o.tax || { region: 'XX', regions: { XX: { inclusion: 1, rate: 0 } } }, paperRealStats: {}, agents: [], botFleet: {}, botAutoMode: false, currentPage: 1,
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {}, _manConsignes: {}, paperRealConfig: { maxConcurrentPos: 3 } };
  ['BTC/USDT', 'ETH/USDT'].forEach(p => { S.pairStates[p] = { price: 100, stake: 30, pairLeverage: 1, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const c = { S, PAIRS: { 'BTC/USDT': { dec: 0, color: '#f7931a' }, 'ETH/USDT': { dec: 2, color: '#627eea' } }, Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN, parseFloat, Error,
    console: { log() {}, warn() {}, error() {} }, showToast: (m, d, lvl) => seen.toasts.push([String(m), lvl || 'info']), rndHash: () => 'h', nowStr: () => '11:00:00',
    confirm: (q) => { seen.confirms.push(String(q)); return o.confirm !== false; }, navigator: {},
    document: { getElementById: el }, els,
    recordTradeForHeatmap() {}, learnFromOutcome: () => { seen.learn++; }, emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {}, checkPnlAlerts() {}, checkBadges() {},
    _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderChain() {}, renderHome() {}, renderPositions() {}, saveState() {}, renderActionsGrid() {},
    saveFeeRecord() {}, addAnnualNetRealised() {}, _fiscOnClose: () => ({ movedUsd: 0, regime: 'spec', gainEur: 0 }), renderSortiePartiSection() {}, renderPyramideSection() {},
    detectMarketRegime: () => 'calm', _calcBotTpSl: () => null, lmsrP: () => 0.5, notifTradeOpen() {}, notifTradeClose() {}, tgOnTrade: x => seen.tg.push(x), disableFullPowerMode() {},
    _modeBehind: () => false, _schoolBehind: () => false, _walletKey: m => m || 'paperReal', updateStreakBadge() {}, _p5PreActionSave() {}, _autoSnapshotBeforeLeverage() {},
    _stakeFloor: () => 2, _stakeRound: x => Math.round((Number(x) || 0) * 10) / 10 };
  c._activeWallet = () => S;   // le portefeuille du mode traité (ici : S à plat)
  c.window = c; vm.createContext(c);
  const src = F02.filter(n => n !== '_levNormAuto' || has(s02, n)).map(n => fnSrc(s02, n));
  if (has(s02, '_feesDueOf')) src.push(fnSrc(s02, '_feesDueOf'));
  src.push('var _leverageMarginCheck = ' + between(s02, 'window._leverageMarginCheck = function _leverageMarginCheck() {', '\n};\n').replace('window._leverageMarginCheck = ', '') + '\n};');
  src.push(fnSrc(s9j, 'validateTotalExposure'), fnSrc(s9j, 'validateInvestmentCapProvisioned'));
  src.push(fnSrc(s07, 'manuInvert'), fnSrc(s07, '_computeNetUsdParts'), fnSrc(s03, '_executeAccountReset'));
  src.push((s05.match(/const _SP_PALIERS_DEF = \[[\s\S]*?\];/) || [''])[0], has(s05, '_spRemainingFactor') ? fnSrc(s05, '_spRemainingFactor') : '', fnSrc(s05, 'closePartial'));
  vm.runInContext(src.join('\n') + '\nvar S = this.S;', c);
  return { c, S, seen, els, run: code => vm.runInContext(code, c) };
}
const pos = o => Object.assign({ id: 'pA', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 30, totalExposure: 30, levBorrowed: 0, auto: false, openedAt: 1, entryTs: 1 }, o);
function poser(W, p, o) {   // comme l'ouvreur : mise retirée du trading, dette au compteur
  o = o || {};
  if (o.cash > 0) { W.S.tradingAccount += o.cash; W.S.leverageBorrowed += o.cash; W.S._autoLevBorrowed += o.cash; }
  const bonus = Math.max(0, (p.totalExposure || p.stakeUsdt) - p.stakeUsdt);
  if (bonus > 0) W.S.leverageBorrowed += bonus;
  W.S.tradingAccount -= p.stakeUsdt; W.S.openPositions.push(p); return p;
}
const lastTrade = (W, pair) => { const t = W.S.pairStates[pair || 'BTC/USDT'].trades; return t[t.length - 1]; };

(async () => {
console.log('▶ banc-nettoyage-argent · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

console.log('▶ A. n° 52 — jamais sous zéro : le contrôle de solvabilité');
await T('A1 · SANS levier, une position perdue presque entière, trading vide : le contrôle RÉEL la ferme avant que les frais dépassent ce qui reste (avant : il sortait aussitôt sans dette du levier — rien n\'était fermé)', () => {
  const W = world({ trading: 30 }); poser(W, pos()); W.S.pairStates['BTC/USDT'].price = 0.1;   // −99,9 % : la position vaut 0,03 $, ses frais 0,078 $
  W.run('_leverageMarginCheck()');
  assert.strictEqual(W.S.openPositions.length, 0, 'position fermée'); assert.ok(W.S.tradingAccount >= 0, 'jamais sous zéro');
  assert.ok(W.S.chainLog.some(l => /Clôture de solvabilité/.test(l.desc) && !/levier rendu/.test(l.desc)), W.S.chainLog.map(l => l.desc).join(' | '));
  assert.ok(W.seen.toasts.some(t => /ne passe pas sous zéro/.test(t[0])), 'le message ne parle plus seulement du levier');
});
await T('A2 · garde : sans levier, une position ordinaire (−20 %) n\'est PAS fermée par le contrôle', () => {
  const W = world({ trading: 30 }); poser(W, pos()); W.S.pairStates['BTC/USDT'].price = 80; W.run('_leverageMarginCheck()'); assert.strictEqual(W.S.openPositions.length, 1);
});
await T('A3 · l\'impôt compté est celui du registre légal (16 _fiscLatentTaxUsd) en Belgique — avant : gains × taux de base (10 %), alors qu\'un trade AUTO / à levier est spéculatif (33 %)', () => {
  const W = world({ trading: 0, tax: { region: 'BE', regions: { BE: { inclusion: 1, rate: 0.10 } } } }); W.c._fiscLatentTaxUsd = () => 6.6;
  poser(W, pos({ stakeUsdt: 100, totalExposure: 100, levBorrowed: 100, _levCash: 100 }), { cash: 100 }); W.S.pairStates['BTC/USDT'].price = 120;
  const sv = W.run('_leverageSolvency()'); near(sv.tax, 6.6, 1e-12, 'impôt du registre'); assert.strictEqual(sv.ok, true);
});
await T('A4 · une mesure qui ÉCHOUE (état abîmé) ne solde rien — avant : la mesure rendait des zéros, « reste net 0 » → tout fermé', () => {
  const W = world({ trading: 0 }); poser(W, pos({ stakeUsdt: 50, totalExposure: 50, levBorrowed: 50, _levCash: 50 }), { cash: 50 });
  W.c._posLatent = () => { throw new Error('état abîmé'); }; W.run('_leverageMarginCheck()'); assert.strictEqual(W.S.openPositions.length, 1, 'rien soldé sur une mesure ratée');
});
await T('A5 · clôture de solvabilité SANS dette du levier : l\'index du levier réglé par Rams n\'est pas rabattu à 0 (avant : toujours remis à 0)', () => {
  const W = world({ trading: 30, leverage: 2 }); poser(W, pos()); W.run("_forceCloseAllForSolvency('banc')"); assert.strictEqual(W.S.leverage, 2); assert.strictEqual(W.S.openPositions.length, 0);
});
await T('A7 · l\'impôt gardé 1 s est relu dès qu\'une position ferme ou que le registre bouge (2e relecture du 19/10 : l\'impôt déjà versé à la fermeture était retranché une 2e fois → deux positions saines soldées)', () => {
  const W = world({ trading: 0, tax: { region: 'BE', regions: { BE: { inclusion: 1, rate: 0.1 } } } }); let rev = 1;
  W.c._fiscLatentTaxUsd = () => W.S.openPositions.length * 5; W.c._fiscLedger = () => ({ rev });
  poser(W, pos({ id: 'pA', stakeUsdt: 10, totalExposure: 10 })); poser(W, pos({ id: 'pB', pair: 'ETH/USDT', stakeUsdt: 10, totalExposure: 10 })); W.S.tradingAccount = 0;
  W.S.pairStates['BTC/USDT'].price = 120; W.S.pairStates['ETH/USDT'].price = 120;
  near(W.run('_leverageSolvency()').tax, 10, 1e-12, 'deux positions');
  W.S.openPositions.splice(0, 1); near(W.run('_leverageSolvency()').tax, 5, 1e-12, 'une position partie : relu');
  W.c._fiscLatentTaxUsd = () => 7; rev++; near(W.run('_leverageSolvency()').tax, 7, 1e-12, 'registre bougé : relu');
  W.c._fiscLatentTaxUsd = () => 99; near(W.run('_leverageSolvency()').tax, 7, 1e-12, 'rien n\'a bougé : gardé');
});
await T('A6 · 08 : le contrôle du mode à l\'écran tourne à CHAQUE battement (plus 1 sur 3) ; _bgModeWatch RÉEL le lance pour un mode en play derrière l\'écran, dans SON contexte (avant : jamais derrière l\'écran — registre n° 18)', () => {
  const tickBloc = between(s08, '  window._bgResolve = false;', '  _mRun.forEach(function(_m){');
  const i = tickBloc.indexOf('window._leverageMarginCheck()'), j = tickBloc.indexOf('if (tick % 3 === 0) {');
  assert.ok(i > 0 && j > 0 && i < j, 'appel hors du « tick % 3 »');
  const vu = []; const S = { tradingMode: 'sim', openPositions: [], pairStates: {} };
  const c = { S, window: {}, learnFromOpenPositions() {}, estimateStakes() {}, _computePortfolio: () => 0, _posMark() {} };
  c.window._leverageMarginCheck = () => vu.push(S.tradingMode); c.window._decErr = e => { throw e; };
  vm.createContext(c); vm.runInContext(fnSrc(s08, '_bgModeWatch') + '\n_bgModeWatch(3);', c);
  assert.deepStrictEqual(vu, ['sim']);
});

console.log('▶ B. n° 54 — des frais que le trading ne couvre pas restent dus');
await T('B1 · VRAI recordFees : manque de frais > trading → le reste devient w._feesDue (journal), repris à la fermeture suivante ; « net en poche » (07) le retranche (avant : la part manquante disparaissait)', () => {
  const W = world({ trading: 0 });
  W.run("recordFees('BTC/USDT', 1000, 0, 'taker', 0, null, 100)");   // 2,60 $ de frais, réserve 0, trading 0
  near(W.S._feesDue, 2.6, 1e-9, 'frais dus'); assert.strictEqual(W.S.tradingAccount, 0); assert.ok(W.S.chainLog.some(l => /non couverts par le trading : \$2,60 restent dus/.test(l.desc)), W.S.chainLog.map(l => l.desc).join(' | '));
  W.S.tradingAccount = 50; const net0 = W.run('_computeNetUsdParts()'); near(net0.feesDue, 2.6, 1e-9); near(net0.net, 50 - 2.6, 1e-9, 'net en poche');
  W.run("recordFees('BTC/USDT', 100, 0, 'taker', 0, null, 100)");   // 0,26 $ de frais : payés, puis les 2,60 $ dus repris
  near(W.S._feesDue, 0, 1e-9, 'dette de frais soldée'); near(W.S.tradingAccount, 50 - 0.26 - 2.6, 1e-9);
});
await T('B2 · la dette de frais compte dans le contrôle de solvabilité (une dette comme une autre)', () => {
  const W = world({ trading: 30 }); poser(W, pos()); W.S._feesDue = 5; const sv = W.run('_leverageSolvency()'); near(sv.debt, 5, 1e-12); near(sv.feesDue, 5, 1e-12);
});

console.log('▶ C. n° 53 — remise à zéro d\'un compte : une question qui dit ce qui change');
await T('C1 · VRAI _executeAccountReset (03) : « Annuler » → rien ne change, pour les 5 comptes ; la question dit le montant exact (avant : remis à zéro au bout de l\'appui de 2 s)', () => {
  const W = world({ trading: 123.45, cash: 67.8, confirm: false }); W.S.fiscalReserveAccount = 9.5; W.S.leverageBorrowed = 40; W.S._autoLevBorrowed = 40;
  ['caisse', 'trading', 'fondsPropres', 'reserveFiscale', 'dette'].forEach(k => W.run("_executeAccountReset('" + k + "')"));
  assert.strictEqual(W.S.cashAccount, 67.8); assert.strictEqual(W.S.tradingAccount, 123.45); assert.strictEqual(W.S.ownFundsInjected, 77); assert.strictEqual(W.S.fiscalReserveAccount, 9.5); assert.strictEqual(W.S.leverageBorrowed, 40);
  assert.strictEqual(W.seen.confirms.length, 5); assert.ok(/67\.80 \$/.test(W.seen.confirms[0]) && /123\.45 \$/.test(W.seen.confirms[1]) && /9\.50 \$/.test(W.seen.confirms[3]));
  assert.ok(/40\.00 \$/.test(W.seen.confirms[4]) && /argent créé/.test(W.seen.confirms[4]), W.seen.confirms[4]);
});
await T('C2 · « OK » → la remise à zéro est faite comme avant (dette effacée, positions nettoyées)', () => {
  const W = world({ trading: 100 }); poser(W, pos({ stakeUsdt: 30, totalExposure: 30, levBorrowed: 30, _levCash: 30 }), { cash: 30 });
  W.run("_executeAccountReset('dette')"); assert.strictEqual(W.S.leverageBorrowed, 0); assert.strictEqual(W.S.openPositions[0].levBorrowed, 0); assert.strictEqual(W.seen.confirms.length, 1);
});

await T('C3 · la question dit tout : trading à 0 avec une dette en argent et une position ouverte → « soldera les positions » ; réserve fiscale (Belgique) → le registre la reprendra sur le trading ; fonds propres → lu par l\'estimateur fiscal (relecture du 19/10)', () => {
  const W = world({ trading: 100, confirm: false, tax: { region: 'BE', regions: { BE: { inclusion: 1, rate: 0.1 } } } }); poser(W, pos({ stakeUsdt: 30, totalExposure: 30, levBorrowed: 30, _levCash: 30 }), { cash: 30 });
  W.run("_executeAccountReset('trading')"); W.run("_executeAccountReset('reserveFiscale')"); W.run("_executeAccountReset('fondsPropres')");
  assert.ok(/soldera les 1 position\(s\) ouverte\(s\)/.test(W.seen.confirms[0]), W.seen.confirms[0]);
  assert.ok(/reprendra ce qui manque sur le TRADING/.test(W.seen.confirms[1]), W.seen.confirms[1]); assert.ok(/estimateur fiscal de la décision/.test(W.seen.confirms[2]), W.seen.confirms[2]);
  const W2 = world({ trading: 100, confirm: false }); poser(W2, pos()); W2.run("_executeAccountReset('trading')"); assert.ok(/Les positions ouvertes ne sont pas touchées/.test(W2.seen.confirms[0]), 'sans dette : pas touchées');
  const W3 = world({ trading: 200, confirm: false }); W3.S.leverageBorrowed = 100; W3.S._autoLevBorrowed = 100; poser(W3, pos({ stakeUsdt: 150, totalExposure: 150 }));   // dette 100 $, position 150 $ : rien ne serait soldé
  W3.run("_executeAccountReset('trading')"); assert.ok(/restent dus/.test(W3.seen.confirms[0]) && !/soldera les/.test(W3.seen.confirms[0]), W3.seen.confirms[0]);
});

console.log('▶ D. n° 55 — sortie par paliers par closePosition');
await T('D1 · TP1 (33 %) : la part fermée passe par VRAI closePosition — frais sur l\'exposition (registre des frais) ; AUCUNE ligne d\'historique (les lecteurs de la décision y comptent leurs clôtures, 40 par paire), compteurs, apprentissage et journal des frais de la décision INCHANGÉS ; le reste ouvert garde 67 % et porte le résultat du palier (avant : crédit maison, frais taker × 2 sur la mise, sans glissement)', () => {
  const W = world({ trading: 90 }); poser(W, pos({ stakeUsdt: 90, totalExposure: 90 })); W.S.pairStates['BTC/USDT'].price = 101.5;
  const t0 = W.S.tradingAccount; W.run("closePartial('pA', 0)");
  const p = W.S.openPositions[0]; near(p.stakeUsdt, 90 * 0.67, 1e-9, 'reste'); near(p.totalExposure, 90 * 0.67, 1e-9);
  const part = 90 * 0.33, gross = part * 0.015, fee = part * (0.002 + 0.0006);
  near(W.S.tradingAccount, t0 + part + gross - fee, 1e-9, 'trading = part + résultat − frais aller-retour avec glissement');
  assert.strictEqual(W.S.pairStates['BTC/USDT'].trades.length, 0, 'aucune ligne d\'historique pour un palier'); assert.ok(p._paliers && p._paliers.length === 1 && Math.abs(p._paliers[0].stake - part) < 1e-9, 'résultat porté par la position');
  assert.strictEqual(W.S.pairStates['BTC/USDT'].totalTrades, 0, 'compteurs de la paire (décision) inchangés'); assert.strictEqual(W.seen.learn, 0, 'aucun apprentissage');
  assert.strictEqual(W.S.fees.feeLog.length, 0, 'journal des frais lu par la décision : rien'); near(W.S.fees.totalGross, fee, 1e-9, 'frais au total');
  assert.ok(p._spPaliers[0].hit && Math.abs(p._spPaliers[0].pnlUsd - (gross - fee)) < 1e-9);
});
await T('D2 · TP2 = 50 % du RESTE, TP3 = tout le reste (fermeture complète, normale) — avant : TP2 fermait 33 % du reste, TP3 laissait 66 % ouverts', () => {
  const W = world({ trading: 90 }); poser(W, pos({ stakeUsdt: 90, totalExposure: 90 })); W.S.pairStates['BTC/USDT'].price = 103.5;
  W.run("closePartial('pA', 0)"); W.run("closePartial('pA', 1)"); near(W.S.openPositions[0].stakeUsdt, 90 * 0.67 * 0.5, 1e-9, 'TP2 : 50 % du reste');
  W.run("closePartial('pA', 2)"); assert.strictEqual(W.S.openPositions.length, 0, 'TP3 : tout fermé'); assert.strictEqual(W.seen.learn, 1, 'la fermeture finale juge, une fois');
  const tr = W.S.pairStates['BTC/USDT'].trades; assert.strictEqual(tr.length, 1, 'UNE ligne pour la position entière'); assert.strictEqual(tr[0].type, 'position');
  assert.ok(Array.isArray(tr[0].paliers) && tr[0].paliers.map(x => x.l).join() === 'TP1,TP2', 'les paliers sur la ligne finale : ' + JSON.stringify(tr[0].paliers));
});
await T('D3 · garde : une position à levier reste refusée (GO LEVIER)', () => {
  const W = world({ trading: 100 }); poser(W, pos({ totalExposure: 90, levBorrowed: 60 })); const t0 = W.S.tradingAccount; W.run("closePartial('pA', 0)");
  assert.strictEqual(W.S.openPositions.length, 1); assert.strictEqual(W.S.tradingAccount, t0);
});

console.log('▶ E. n° 58 — levier : la capacité dite, rien d\'emprunté en baissant');
await T('E1 · VRAIS changeLeverage ×1 (100 $ empruntés au trading) puis VRAI ensureLeverageCoverForTrade pour une mise de 230 $ : refusé (×1 = 1× le capital, déjà emprunté) ; après 40 $ gagnés, 30 $ « juste à temps » passent (marge 40 $) — avant : capacité 10 × base × index (900 $)', () => {
  const W = world({ trading: 100 }); W.run('changeLeverage(1)'); near(W.S.tradingAccount, 200, 1e-9);
  const r = W.run("ensureLeverageCoverForTrade(230, 'ETH/USDT')"); assert.strictEqual(r.ok, false, JSON.stringify(r)); near(W.S.leverageBorrowed, 100, 1e-9, 'rien de plus emprunté');
  W.S.tradingAccount += 40; const r2 = W.run("ensureLeverageCoverForTrade(270, 'ETH/USDT')"); assert.ok(r2.ok && Math.abs(r2.borrowed - 30) < 1e-9, JSON.stringify(r2));
  const r3 = W.run("ensureLeverageCoverForTrade(300, 'ETH/USDT')"); assert.strictEqual(r3.ok && r3.coveredShortfall, false, 'au-delà de la marge : plafonné');
});
await T('E2 · VRAI applyAutoLeverageBorrow : baisser l\'index ×3 → ×2 quand la dette suivie a baissé n\'emprunte RIEN (avant : il versait la différence au trading)', () => {
  const W = world({ trading: 100 }); W.S.leverage = 3; W.S.leverageBorrowed = 50; W.S._autoLevBorrowed = 50;   // remboursements depuis l'activation
  const t0 = W.S.tradingAccount; W.run('applyAutoLeverageBorrow(2, 3)'); assert.strictEqual(W.S.tradingAccount, t0); assert.strictEqual(W.S.leverageBorrowed, 50);
});
await T('E3 · VRAI openPosition : S.portfolio juste après l\'ouverture compte la mise (avant : écrit entre le débit et l\'ajout — trop bas d\'une mise)', () => {
  const W = world({ trading: 100, cash: 10 }); W.S.portfolio = 110; W.run("openPosition('ETH/USDT', 'long')"); assert.strictEqual(W.S.openPositions.length, 1); near(W.S.portfolio, 110, 1e-9);
});

console.log('▶ F. n° 59 — carte de paire (accord de Rams du 18/10)');
await T('F1 · VRAI renderPairPnl (07) : le badge dit la MISE et le levier (« mise $30.00 · ×3 ») — avant : l\'exposition, « mise $90.00 »', () => {
  const W = world({ trading: 100 }); poser(W, pos({ totalExposure: 90, levBorrowed: 60 }));
  W.run(fnSrc(s07, 'renderPairPnl')); W.run('renderPairPnl()');
  const b = W.els['pb_badge_BTC_USDT'].textContent; assert.ok(/mise \$30\.00 · ×3$/.test(b), b);
});
await T('F2 · VRAI renderFiscalPairs (08) « Prochain trade estimé » : la mise de base de 10f (part du capital libre, mise de la paire en plancher), bornée comme 09c ; frais aller-retour (avant : min(mise, 10 % du trading) — $0.00 en EV et RE —, frais d\'un côté, « impôt » sur les frais)', () => {
  const W = world({ trading: 100 }); W.S.pairStates['BTC/USDT'].stake = 40; W.S.pairStates['ETH/USDT'].stake = 500;
  W.run(fnSrc(s08, 'renderFiscalPairs')); W.run('renderFiscalPairs()'); const h = W.els.feesByPair.innerHTML;
  // 10f : part du capital libre = (100 − 2) ÷ 2 paires sans position = 49 $, la mise de la paire en plancher (BTC 40 → 49) ; ETH 500 > 95 % du trading → borne de 09c (98 ÷ 3 emplacements = 32,7)
  assert.ok(/Mise de base: <strong[^>]*>\$49\.00<\/strong>/.test(h), 'BTC : 49'); assert.ok(/Mise de base: <strong[^>]*>\$32\.70<\/strong>/.test(h), 'ETH : 32,70');
  assert.ok(/Frais A\/R: −\$0\.13/.test(h), 'frais aller-retour de 49 $ = 0,127'); assert.ok(/Impôt: sur le gain seulement/.test(h));
  W.S.pairStates['BTC/USDT'].stake = 0; W.run('renderFiscalPairs()'); assert.ok(/Mise de base: <strong[^>]*>\$49\.00<\/strong>/.test(W.els.feesByPair.innerHTML), 'mise de paire à 0 (EV, RE) : la part du capital, pas $0.00');
});

console.log('▶ G. n° 60 — Inverser une position perdante');
await T('G1 · VRAI manuInvert (07) : compte investi, position à −20 % → fermée puis ROUVERTE dans l\'autre sens avec ce que le trading tient, et c\'est dit (avant : fermée, pas rouverte)', () => {
  const W = world({ trading: 100 }); poser(W, pos({ stakeUsdt: 100, totalExposure: 100 })); W.S.pairStates['BTC/USDT'].price = 80; W.S.pairStates['BTC/USDT'].stake = 100;
  W.run("manuInvert('BTC/USDT')"); const p = W.S.openPositions[0];
  assert.ok(p && p.side === 'short', JSON.stringify(W.seen.toasts.slice(-2))); assert.ok(p.stakeUsdt < 100 && p.stakeUsdt > 79, 'mise = ce que le trading tient : ' + p.stakeUsdt);
  assert.ok(W.seen.toasts.some(t => /au lieu de \$100\.00/.test(t[0])), 'dit'); assert.ok(W.S.tradingAccount >= 0);
});

await T('G2 · VRAI manuInvert avec une AUTRE position ouverte : la mise rouverte est la plus grande que le VRAI contrôle de capital (09j) laisse passer, et c\'est dit (relecture du 19/10 : 13,82 $ au lieu de 490 $, ou rien, avec « trading vide »)', () => {
  const W = world({ trading: 1000 }); poser(W, pos({ id: 'pX', pair: 'ETH/USDT', stakeUsdt: 400, totalExposure: 400 })); poser(W, pos({ stakeUsdt: 400, totalExposure: 400 }));
  W.S.pairStates['BTC/USDT'].price = 80; W.run("manuInvert('BTC/USDT')"); const p = W.S.openPositions.find(x => x.pair === 'BTC/USDT');
  assert.ok(p && p.side === 'short' && p.stakeUsdt > 0, JSON.stringify(W.seen.toasts.slice(-2)));
  const passe = x => { const r = W.run('validateTotalExposure(' + x + ', 0)'); return !!(r && (r.ok || r.available >= x * 0.5)); };
  if (p.stakeUsdt < 400 - 0.005) { assert.ok(!passe(p.stakeUsdt + 0.05) || p.stakeUsdt >= W.S.tradingAccount + p.stakeUsdt - 0.05, 'la plus grande mise acceptée'); assert.ok(W.seen.toasts.some(t => /au lieu de \$400\.00 : c'est ce que (le contrôle de capital laisse ouvrir|le trading tient)/.test(t[0])), JSON.stringify(W.seen.toasts.slice(-2))); }
});

console.log('▶ H. n° 51 — recalage de l\'AA (js/18-recalage-aa.js)');
const S18 = ex('js/18-recalage-aa.js') ? rd('js/18-recalage-aa.js') : null;
function aa(w) {
  const S = { walletStore: { sim: w, paperReal: { tradingAccount: 1074.06 }, real: { tradingAccount: 1145.42 } }, chainLog: [] };
  const c = { S, Date, Math, JSON, Number, String, Array, isFinite, console, _computePortfolio: x => x.cashAccount + x.tradingAccount + (x.openPositions || []).reduce((a, p) => a + p.stakeUsdt, 0), saveState() { c.sauve = 1; } };
  c.window = c; vm.createContext(c); assert.ok(S18, 'module absent'); vm.runInContext(S18, c); return c;
}
const aaW = () => ({ totalTrades: 2188, fees: { tradeCount: 2188 }, tradingAccount: 4123.61, cashAccount: 47.39, portfolio: 4388.07, openPositions: [{ stakeUsdt: 217.07 }], _startPortfolio: 4388.49,
  bunker: { capRef: 4341.10, startCapital: 948.47 }, pnlHistory: [1003.29, 4388.07], pnlPeriod: { todayStartPortfolio: 4388.49, weekStartPortfolio: 1003.29, monthStartPortfolio: 1077.06,
  history: [{ date: '2026-08-17', start: 238.39, end: 6708.55, pnlUsd: 6470.16, pnlPct: 2714.1 }, { date: '2026-10-18', start: 1003.29, end: 4388.07, pnlUsd: 3384.78, pnlPct: 337.4 }] } });
await T('H1 · l\'AA qui porte l\'écart : −3 707,64 $ au trading, repères posés pendant l\'écart baissés d\'autant (départ de session, bunker, du jour, courbe, ligne du 18/10 → P&L du jour vrai), une trace empêche de le refaire ; le reste intact', () => {
  const w = aaW(), c = aa(w); assert.strictEqual(c._recalageAA.etat(), 'porte');
  const r = c._recalageAA._appliquer(); assert.ok(r.ok); near(w.tradingAccount, 4123.61 - 3707.64, 1e-9); near(w.portfolio, 47.39 + 4123.61 - 3707.64 + 217.07, 1e-9);
  near(w._startPortfolio, 4388.49 - 3707.64, 1e-9); near(w.bunker.capRef, 4341.10 - 3707.64, 1e-9); assert.strictEqual(w.bunker.startCapital, 948.47);
  near(w.pnlPeriod.todayStartPortfolio, 4388.49 - 3707.64, 1e-9); assert.strictEqual(w.pnlPeriod.weekStartPortfolio, 1003.29); assert.strictEqual(w.pnlPeriod.monthStartPortfolio, 1077.06);
  assert.deepStrictEqual(w.pnlHistory.map(v => Math.round(v * 100) / 100), [1003.29, 680.43]);
  assert.deepStrictEqual(w.pnlPeriod.history[0], { date: '2026-08-17', start: 238.39, end: 6708.55, pnlUsd: 6470.16, pnlPct: 2714.1 }, 'une ligne d\'août (autre époque) n\'est pas touchée');
  assert.strictEqual(w.pnlPeriod.history[1].end, 680.43); near(w.pnlPeriod.history[1].pnlUsd, 680.43 - 1003.29, 1e-9);
  assert.strictEqual(c._recalageAA.etat(), 'fait'); assert.strictEqual(c._recalageAA._appliquer().ok, false, 'une seule fois'); assert.ok(c.sauve);
  assert.strictEqual(c.S.walletStore.paperReal.tradingAccount, 1074.06); assert.strictEqual(c.S.walletStore.real.tradingAccount, 1145.42);
  assert.ok(/Recalage AA \(ETAT n° 51, confirmé par Rams\) · −3707\.64 \$/.test(c.S.chainLog[0].desc));
});
await T('H2 · refus : état d\'avant l\'écart final (< 2 185 fermetures) → « avant » ; trading plus petit que l\'écart → « manque » ; rien n\'est écrit', () => {
  const w1 = aaW(); w1.totalTrades = 2100; w1.fees.tradeCount = 2100; const c1 = aa(w1); assert.strictEqual(c1._recalageAA.etat(), 'avant'); assert.strictEqual(c1._recalageAA._appliquer().ok, false); assert.strictEqual(w1.tradingAccount, 4123.61);
  const w2 = aaW(); w2.tradingAccount = 3000; const c2 = aa(w2); assert.strictEqual(c2._recalageAA.etat(), 'manque'); assert.strictEqual(c2._recalageAA._appliquer().ok, false);
});
await T('H3 · le module est chargé par le HTML ; sans écart il reste inerte (aucun élément à l\'écran) ; contrôle au lancement puis une fois par minute (l\'AA peut tenir des positions au lancement), arrêté une fois fait ; la cause est dite « supposée »', () => {
  assert.ok(/<script src="js\/18-recalage-aa\.js\?v=\d{8}[a-z]"><\/script>/.test(html));
  assert.ok(/if \(e0 === 'porte' && !plusTard && !bandeau\) proposer\(\);/.test(S18) && /if \(e0 === 'fait'\) \{ clearInterval\(iv\); return; \}/.test(S18) && /essais % 60 !== 0/.test(S18));
  assert.ok(/Cause supposée \(non prouvée\)/.test(S18) && /680,12 \$ attendus/.test(S18) && /cause supposée : l’emprunt du levier/.test(S18), 'la cause est dite supposée, le montant mesuré');
});
const BK = path.join(__dirname, 'rejeu/backups/pont/aura_guardian_full_20261018-213733.json');
await T('H4 · sur le VRAI backup du 18/10 21:37 (hors dépôt : sauté s\'il manque) : AA « porte », trading 4 123,61 → 415,97 $, portefeuille 680,43 $ (= 680,12 $ attendus à 21:22 + 3 fermetures depuis − la réserve tenue), EV et RE intacts', () => {
  if (!fs.existsSync(BK)) { console.log('     ⏭ backup absent'); return; }
  const b = JSON.parse(fs.readFileSync(BK, 'utf8')).aura, w = b.walletStore.sim, c = aa(w);
  c.S.walletStore = b.walletStore; assert.strictEqual(c._recalageAA.etat(), 'porte'); const ev = b.walletStore.paperReal.tradingAccount;
  const r = c._recalageAA._appliquer(); assert.ok(r.ok); near(r.apres.trading, 415.97, 0.005); near(r.apres.portefeuille, 680.43, 0.005); assert.strictEqual(b.walletStore.paperReal.tradingAccount, ev);
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
})();
