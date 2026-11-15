// banc-n99.js — [GO N° 99 · 15/11/2026] le levier de paire n'est plus réduit EN SILENCE (ETAT-AURA8.md, registre n° 99).
// Chaque essai fait tourner le VRAI texte de l'app en vm (02, 07, 09j, 10e) et ÉCHOUE sur le code d'avant
//   BANC_ROOT=<copie du commit 733674d> node banc-n99.js        (sauf les gardes L2, V, G et F)
//   L1  VRAI openPosition, l'EV du pont (index ×0, 11 positions de la voix, 1 115,33 $ au trading) : EUR/USDT réglée ×2, mise 60 $ → s'ouvre en ×1 (argent
//       comme avant : exposition 60 $, aucun emprunt) ET le dit : avertissement « ouvert en ×1 au lieu de ×2 · levier général ×0 : aucun emprunt » + journal
//       (avant : seul le toast « 📈 … » de niveau info, masqué hors mode verbeux)
//   L1b VRAI applyBotSuggestion (« ✓ Appliquer ») sur la même paire : même avertissement, « Suggestion appliquée » gardé
//   L2  garde : index ×1, réserve ample → ×2 pris en entier, aucun avertissement, journal « (×2 lev → $120) » au caractère près comme avant
//   L3  index ×1, réserve 30 $ pour ×3 : ×1,5 pris (90 $), dit avec la raison ; journal « (×1,5 lev → $90) » (avant : « (×3 lev → $90) »)
//   L4  index ×1, dette au plafond 10× fonds propres → ×1, raison « plafond » ; L5 minimum 10 $ ; L5b réserve sous 10 $
//   L6  VRAI _openManTrade (fiche MAN, 10e) : ×3 demandé à l'index ×0 → journal « levier ×1 (×3 demandé) » (avant : « levier ×3 ») ; ×3 pris → « levier ×3 »
//   L7  VRAI manuInvert d'une position ×2 à l'index ×0 : rouverte en ×1, et dit
//   L8  arrondi (relecture du 15/11) : manque de 4 $ sur 1 000 $ → « ×1,99 au lieu de ×2 » (avant la relecture : « ×2 au lieu de ×2 »), fiche « levier ×1,99 (×2 demandé) » ;
//       manque de 0,10 $ dit ; de 0,004 $ non (seuil 0,005 $) ; _levTxt sur ses cas
//   L9  frontières des raisons : part = 10 $ tout juste et réserve 5 $ → « réserve sous 10 $ » ; part 9,99 $ → « sous le minimum de 10 $ »
//   W   VRAI texte de l'écran : carte de paire (07, mise de base et frais estimés) et champ « Levier × » de la fiche MAN (10h), index ×0 / ×1
//   V   garde : la voix (15b) n'a jamais de levier, même si la paire est réglée ×2 — aucun avertissement
//   P   propriété, 3 000 états tirés (index 0–3, réserve, dette, caisse, mise, levier ×1–×10, positions) : l'ARGENT et les positions après openPosition sont
//       ceux du code d'avant au centime ; l'avertissement apparaît si et seulement si la position s'ouvre avec moins de levier que demandé ; sa RAISON est
//       celle que donne, depuis l'état d'AVANT l'emprunt, la branche de borrowLeverage qui a refusé (oracle écrit à part, relecture du 15/11) ; le levier dit est sous le demandé
//   G   garde : ce que le BOT lit et écrit est au texte d'avant (borrowLeverage, estimateStakes, 09c, 09j, 10f, 15, 15b, 04, 03) ; aucun bot n'appelle openPosition
//   C   appels : _pairLevShortWhy ← 02 openPosition seulement ; _levTxt ← 02 openPosition et 10e _openManTrade
//   F   garde : banc-fixtures/n99-retours.json redonne les 4 fichiers d'avant au caractère près (empreintes du commit 733674d)
// L'écran (fiche MAN : champ « Levier × » verrouillé à ×1 avec la raison ; carte de paire : « ×2 inactif · levier ×0 ») est éprouvé sur la vraie page :
//   node rejeu/sonde_n99.js --root . --avant <copie d'avant> --backup <backup>
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sansN99 = require('./banc-fixtures/sans-n99.js');
const sansA3 = require('./banc-fixtures/sans-affichage-3.js');   // [GO AFFICHAGE 3 · 15/11/2026] hors les retouches de go affichage 3 (affichage seul, banc-affichage-3.js)
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
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'fin'); return s.slice(i, j); };
const near = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const F = { s02: 'js/02-state-init.js', s07: 'js/07-v90-mode-bunker-sos.js', s9j: 'js/09j-helpers.js', s10e: 'js/10e-helpers-adaptatifs.js', s10h: 'js/10h-pont-fullpower-bricks.js' };
const sansN62 = require('./banc-fixtures/sans-n62.js');
const C = {}; Object.keys(F).forEach(k => { C[k] = sansN62(rd(F[k]), F[k]); });   // [GO N° 62 · 15/11/2026] l'ANCIEN « Inverser » (07 manuInvert d'avant go n° 62, banc-fixtures/sans-n62.js) : ce banc garde ses essais d'avant ; banc-n62.js prouve le nouveau
const html = rd('AURA8_v118.html');
const AVANT = {}; Object.keys(F).forEach(k => { AVANT[k] = sansN99(C[k], F[k]); });   // le code d'avant, pour P (sur BANC_ROOT : identique)

// ─── Le monde : un portefeuille à plat (EV), VRAIES fonctions d'argent (même harnais que banc-n61.js) ───
const FEE = { takerRate: 0.001, makerRate: 0.001, slippage: 0.0003, fundingRate: 0 };
let TICK = Date.UTC(2026, 10, 15, 2, 0, 0);
class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [TICK])); } static now() { return ++TICK; } }
const F02 = ['_computePortfolio', '_computePortfolioSans', '_tradingCapitalBase', 'syncLeverageReserve', 'applyAutoLeverageBorrow', 'ensureLeverageCoverForTrade', 'borrowLeverage',
  'repayLeverage', 'recordFees', 'releaseTradeReserve', '_manOpenWarnings', '_manConsigneOf', 'openPosition', 'closePosition', 'applyBotSuggestion', '_pairLevShortWhy', '_levTxt',
  'fmt$', 'fmt$2', '_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto', '_feesDueOf'];
const PAIRES = ['ADA/USDT', 'AVAX/USDT', 'BNB/USDT', 'BTC/USDT', 'DOGE/USDT', 'DOT/USDT', 'ETH/USDT', 'LINK/USDT', 'PEPE/USDT', 'SOL/USDT', 'XRP/USDT', 'EUR/USDT'];
function world(o) {
  o = o || {};
  const src0 = o.avant ? AVANT : C;
  const seen = { toasts: [] };
  const els = {};
  const el = id => els[id] || null;
  const S = { tradingMode: 'paperReal', cashAccount: o.cash || 0, tradingAccount: o.trading != null ? o.trading : 100, openPositions: [], pnlHistory: [100], chainLog: [], cashLog: [],
    totalTrades: 0, winTrades: 0, leverage: 0, leverageReserve: 0, leverageBorrowed: 0, leverageMaxMult: 10, leverageBorrowRate: 0, _autoLevBorrowed: 0, _autoLevBase: 0,
    antiNegReserve: 0, antiNegReserveLog: [], fiscalReserveAccount: 0, fiscalReserveLog: [], ownFundsInjected: 0, profitSplitCaissePct: 0, feeConfig: Object.assign({}, FEE),
    taxConfig: { region: 'XX', regions: { XX: { inclusion: 1, rate: 0 } } }, paperRealStats: {}, agents: [], botFleet: {}, botAutoMode: false, currentPage: 1,
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {}, _manConsignes: {}, paperRealConfig: { maxConcurrentPos: 3 } };
  PAIRES.forEach(p => { S.pairStates[p] = { price: 100, stake: 30, pairLeverage: 1, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const c = { S, PAIRS: Object.fromEntries(PAIRES.map(p => [p, { dec: 2, color: '#fff' }])), Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN, parseFloat, parseInt, Error,
    console: { log() {}, warn() {}, error() {} }, showToast: (m, d, lvl) => seen.toasts.push([String(m), lvl || 'info']), rndHash: () => 'h', nowStr: () => '02:00:00',
    confirm: () => true, navigator: {}, document: { getElementById: el }, els,
    recordTradeForHeatmap() {}, learnFromOutcome() {}, emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {}, checkPnlAlerts() {}, checkBadges() {},
    _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderChain() {}, renderHome() {}, renderPositions() {}, saveState() {}, renderActionsGrid() {},
    saveFeeRecord() {}, addAnnualNetRealised() {}, _fiscOnClose: () => ({ movedUsd: 0, regime: 'spec', gainEur: 0 }), renderSortiePartiSection() {}, renderPyramideSection() {},
    detectMarketRegime: () => 'calm', _calcBotTpSl: () => null, lmsrP: () => 0.5, notifTradeOpen() {}, notifTradeClose() {}, tgOnTrade() {}, disableFullPowerMode() {},
    _modeBehind: () => false, _schoolBehind: () => false, _walletKey: m => m || 'paperReal', updateStreakBadge() {}, _p5PreActionSave() {}, _autoSnapshotBeforeLeverage() {},
    _stakeFloor: () => 2, _stakeRound: x => Math.round((Number(x) || 0) * 10) / 10,
    _manSideLevels: () => null, closePairDetail() {}, updateManBricks() {}, _manFmtPx: (p, x) => String(x) };
  c._activeWallet = () => S;
  c.window = c; vm.createContext(c);
  const src = F02.map(n => fnSrc(src0.s02, n)).filter(Boolean);
  c.Intl = Intl; src.unshift('var _pxFmt = {};', need(src0.s02, 'pxTxt'));   // [GO AFFICHAGE 3 · 15/11/2026] (n° 86b) le journal d'ouverture écrit le prix par 02 pxTxt
  src.push('var _leverageMarginCheck = ' + between(src0.s02, 'window._leverageMarginCheck = function _leverageMarginCheck() {', '\n};\n').replace('window._leverageMarginCheck = ', '') + '\n};');
  src.push(need(src0.s9j, 'validateTotalExposure'), need(src0.s9j, 'validateInvestmentCapProvisioned'), need(src0.s9j, 'getCapitalSummary'), fnSrc(src0.s9j, 'validateManualExposure') || '');
  src.push(need(src0.s07, 'manuInvert'), need(src0.s10e, '_openManTrade'));
  vm.runInContext(src.join('\n') + '\nvar S = this.S;', c);
  return { c, S, seen, els, run: code => vm.runInContext(code, c) };
}
// l'EV du pont (15/11 02:35) : index ×0, 11 positions de la voix à 95,99 $ (1 055,89 $), 1 115,33 $ au trading, caisse 0 ; réserve de levier recalculée
function evDuPont(o) {
  const W = world(Object.assign({ trading: 1115.33 }, o || {}));
  PAIRES.slice(0, 11).forEach((p, i) => W.S.openPositions.push({ id: 'v' + i, pair: p, side: i === 8 ? 'long' : 'short', entryPrice: 100, stakeUsdt: 95.99, totalExposure: 95.99,
    levBorrowed: 0, auto: false, _voix: 'tendance', openedAt: 1, entryTs: 1 }));
  W.run('syncLeverageReserve()');
  return W;
}
const ouverte = (W, pair) => W.S.openPositions.find(p => p.pair === pair) || null;
const avert = W => W.seen.toasts.filter(t => /ouvert en ×[\d,]+ au lieu de ×\d+/.test(t[0]));
const journal = W => W.S.chainLog.map(l => l.desc);

console.log('▶ banc-n99 · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

T('L1 · VRAI openPosition, l\'EV du pont (index ×0) : EUR/USDT réglée ×2, mise 60 $ → ouverte en ×1 (argent d\'avant) ET dit : avertissement + journal', () => {
  const W = evDuPont(); W.S.pairStates['EUR/USDT'].stake = 60; W.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W.run("openPosition('EUR/USDT', 'long')"), JSON.stringify(W.seen.toasts));
  const p = ouverte(W, 'EUR/USDT');
  near(p.stakeUsdt, 60, 0, 'mise'); near(p.totalExposure, 60, 0, 'exposition ×1'); near(p.levBorrowed, 0, 0, 'aucun emprunt'); near(W.S.leverageBorrowed, 0, 0, 'dette');
  near(W.S.tradingAccount, 1055.33, 1e-9, 'trading débité de la mise');
  assert.deepStrictEqual(avert(W), [['⚠ EUR/USDT LONG ouvert en ×1 au lieu de ×2 · levier général ×0 : aucun emprunt', 'warn']], JSON.stringify(W.seen.toasts));
  assert.ok(journal(W).includes('Levier EUR/USDT LONG : ×2 demandé, ×1 pris (exposition $60) · levier général ×0 : aucun emprunt'), JSON.stringify(journal(W)));
  assert.ok(journal(W).includes('Position LONG EUR/USDT | $60 @$100,00')   /* [GO AFFICHAGE 3 · 15/11/2026] (n° 86b) prix du journal par 02 pxTxt (avant : « @$100 », entier tronqué) */, 'ligne d\'ouverture d\'avant (sans « lev ») : ' + JSON.stringify(journal(W)));
});

T('L1b · VRAI applyBotSuggestion (« ✓ Appliquer ») : même EV, paire ×2 → ouverte en ×1, avertie ; « Suggestion appliquée » gardé', () => {
  const W = evDuPont(); W.S.pairStates['EUR/USDT'].pairLeverage = 2;
  W.run("applyBotSuggestion('EUR/USDT', 'short', 60)");
  const p = ouverte(W, 'EUR/USDT'); assert.ok(p, JSON.stringify(W.seen.toasts)); near(p.totalExposure, 60, 0, 'exposition');
  assert.deepStrictEqual(avert(W).map(t => t[0]), ['⚠ EUR/USDT SHORT ouvert en ×1 au lieu de ×2 · levier général ×0 : aucun emprunt']);
  assert.ok(W.seen.toasts.some(t => /^✓ Suggestion appliquée · EUR\/USDT ↓ SHORT · \$60$/.test(t[0])), JSON.stringify(W.seen.toasts));
  assert.strictEqual(W.S.pairStates['EUR/USDT'].pairLeverage, 2, 'réglage de la paire inchangé');
});

T('L2 · garde : index ×1, réserve ample, aucune position → ×2 pris en entier, aucun avertissement, journal « (×2 lev → $120) » comme avant', () => {
  for (const avant of [false, true]) {
    const W = world({ avant, trading: 1000 }); W.S.leverage = 1; W.run('syncLeverageReserve()'); W.S.pairStates['EUR/USDT'].stake = 60; W.S.pairStates['EUR/USDT'].pairLeverage = 2;
    assert.ok(W.run("openPosition('EUR/USDT', 'long')"));
    const p = ouverte(W, 'EUR/USDT'); near(p.totalExposure, 120, 1e-9, 'exposition'); near(p.levBorrowed, 60, 1e-9, 'emprunt');
    assert.deepStrictEqual(avert(W), []); assert.ok(!journal(W).some(d => / demandé, ×[\d,]+ pris /.test(d)));
    assert.ok(journal(W).includes('Position LONG EUR/USDT | $60 (×2 lev → $120) @$100,00')   /* [GO AFFICHAGE 3 · 15/11/2026] (n° 86b) prix du journal par 02 pxTxt (avant : « @$100 », entier tronqué) */, JSON.stringify(journal(W)));
  }
});

T('L3 · index ×1, réserve 30 $ pour ×3 (90 $ demandés) : ×1,5 pris, dit avec la raison ; journal « (×1,5 lev → $90) » (avant : « ×3 »)', () => {
  const W = world({ trading: 1000 }); W.S.leverage = 1; W.S.pairStates['EUR/USDT'].stake = 60; W.S.pairStates['EUR/USDT'].pairLeverage = 3; W.S.leverageReserve = 30;
  assert.ok(W.run("openPosition('EUR/USDT', 'long')"));
  const p = ouverte(W, 'EUR/USDT'); near(p.totalExposure, 90, 1e-9, 'exposition'); near(p.levBorrowed, 30, 1e-9, 'emprunt partiel');
  assert.deepStrictEqual(avert(W).map(t => t[0]), ['⚠ EUR/USDT LONG ouvert en ×1,5 au lieu de ×3 · réserve du levier insuffisante (' + W.run('fmt$2(30)') + ' empruntés sur ' + W.run('fmt$2(120)') + ')']);
  assert.ok(journal(W).includes('Position LONG EUR/USDT | $60 (×1,5 lev → $90) @$100,00')   /* [GO AFFICHAGE 3 · 15/11/2026] (n° 86b) prix du journal par 02 pxTxt (avant : « @$100 », entier tronqué) */, JSON.stringify(journal(W)));
});

T('L4 · index ×1, dette au plafond (10× fonds propres) → ×1, raison « plafond » ; L5 part sous 10 $ ; L5b réserve sous 10 $', () => {
  const W = world({ trading: 100 }); W.S.leverage = 1; W.S.leverageBorrowed = 950; W.S.leverageReserve = 5000; W.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W.run("openPosition('EUR/USDT', 'long')"));
  assert.deepStrictEqual(avert(W).map(t => t[0]), ['⚠ EUR/USDT LONG ouvert en ×1 au lieu de ×2 · dette du levier au plafond (10× tes fonds propres)']);
  const W5 = world({ trading: 100 }); W5.S.leverage = 1; W5.S.leverageReserve = 5000; W5.S.pairStates['EUR/USDT'].stake = 5; W5.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W5.run("openPosition('EUR/USDT', 'long')"));
  assert.deepStrictEqual(avert(W5).map(t => t[0]), ['⚠ EUR/USDT LONG ouvert en ×1 au lieu de ×2 · part à emprunter sous le minimum de 10 $']);
  const W6 = world({ trading: 100 }); W6.S.leverage = 2; W6.S.leverageReserve = 5; W6.S.pairStates['EUR/USDT'].pairLeverage = 4;
  assert.ok(W6.run("openPosition('EUR/USDT', 'short')"));
  assert.deepStrictEqual(avert(W6).map(t => t[0]), ['⚠ EUR/USDT SHORT ouvert en ×1 au lieu de ×4 · réserve du levier sous 10 $']);
});

T('L6 · VRAI _openManTrade (fiche MAN) : ×3 demandé à l\'index ×0 → journal « levier ×1 (×3 demandé) » + avertissement ; ×3 pris à l\'index ×1 → « levier ×3 »', () => {
  const W = evDuPont(); W.els.manIn_stake_EUR_USDT = { value: '50' }; W.els.manIn_lev_EUR_USDT = { value: '3' };
  assert.ok(W.run("_openManTrade('EUR/USDT', 'long')"), JSON.stringify(W.seen.toasts));
  assert.ok(journal(W).includes('Trade MANUEL EUR/USDT LONG · mise $50 · levier ×1 (×3 demandé)'), JSON.stringify(journal(W)));
  assert.deepStrictEqual(avert(W).map(t => t[0]), ['⚠ EUR/USDT LONG ouvert en ×1 au lieu de ×3 · levier général ×0 : aucun emprunt']);
  assert.strictEqual(W.S.pairStates['EUR/USDT'].pairLeverage, 1, 'levier de la paire rendu');
  const W2 = world({ trading: 1000 }); W2.S.leverage = 1; W2.run('syncLeverageReserve()'); W2.els.manIn_stake_EUR_USDT = { value: '50' }; W2.els.manIn_lev_EUR_USDT = { value: '3' };
  assert.ok(W2.run("_openManTrade('EUR/USDT', 'long')"));
  assert.ok(journal(W2).includes('Trade MANUEL EUR/USDT LONG · mise $50 · levier ×3'), JSON.stringify(journal(W2))); assert.deepStrictEqual(avert(W2), []);
});

T('L7 · VRAI manuInvert d\'une position ×2 (ouverte quand l\'index était à ×1) après retour de l\'index à ×0 : rouverte en ×1, et dit', () => {
  const W = world({ trading: 400 }); W.S.leverage = 1;
  W.S.openPositions.push({ id: 'pL', pair: 'ETH/USDT', side: 'long', entryPrice: 100, stakeUsdt: 100, totalExposure: 200, levBorrowed: 100, _levCash: 0, auto: false, openedAt: 1, entryTs: 1 });
  W.S.leverageBorrowed = 100; W.run('syncLeverageReserve()'); W.S.leverage = 0;
  W.run("manuInvert('ETH/USDT')");
  const p = ouverte(W, 'ETH/USDT'); assert.ok(p && p.side === 'short', JSON.stringify(W.seen.toasts)); near(p.totalExposure, p.stakeUsdt, 1e-12, 'exposition ×1');
  assert.ok(avert(W).length === 1 && /^⚠ ETH\/USDT SHORT ouvert en ×1 au lieu de ×2 · levier général ×0 : aucun emprunt$/.test(avert(W)[0][0]), JSON.stringify(W.seen.toasts));
});

T('W · VRAI texte de l\'écran : carte de paire (07) et champ « Levier × » de la fiche MAN (10h), index ×0 / ×1 — ce qui s\'affiche est ce qui s\'appliquera', () => {
  // 07 renderActionsGrid, carte sans position : le bloc de la mise de base, exécuté tel quel
  const bloc = between(C.s07, 'const lev     = ps.pairLeverage || 1;', '\n        }\n      }\n\n      // ── Frais estimés') + '\n';
  const carte = (index, lev) => { const stEl = { innerHTML: null, textContent: null }; const c = { S: { leverage: index }, ps: { pairLeverage: lev, stake: 60 }, stEl, Number };
    vm.createContext(c); vm.runInContext('(function(){' + bloc + '})()', c); return stEl.innerHTML !== null ? stEl.innerHTML.replace(/<[^>]+>/g, '') : stEl.textContent; };
  assert.strictEqual(carte(0, 2), '$60 ×2 inactif · levier ×0'); assert.strictEqual(carte(1, 2), '$60 ×2 =$120'); assert.strictEqual(carte(0, 1), '$60'); assert.strictEqual(carte(3, 4), '$60 ×4 =$240');
  // frais estimés de la carte : sur la mise × levier qui s'appliquera
  const frais = between(C.s07, 'const stake = _activePos ?', ';') ;
  const fx = (index, lev) => { const c = { S: { leverage: index }, ps: { pairLeverage: lev, stake: 60 }, _activePos: null, Number }; vm.createContext(c); return vm.runInContext('(' + frais.replace('const stake = ', '') + ')', c); };
  assert.strictEqual(fx(0, 2), 60); assert.strictEqual(fx(1, 2), 120); assert.strictEqual(fx(0, 1), 60);
  // 10h openManDetail : le champ « Levier × », exécuté comme le gabarit de la fiche
  const t0 = C.s10h.indexOf('${(Number(S.leverage) || 0) === 0'); assert.ok(t0 > 0, 'champ levier introuvable');
  const fin = 'step="1" style="${inp}color:var(--t1);">`}'; const t1 = C.s10h.indexOf(fin, t0); assert.ok(t1 > t0);
  const champ = index => { const c = { S: { leverage: index }, k: 'EUR_USDT', inp: '', Number }; vm.createContext(c); return vm.runInContext('`' + C.s10h.slice(t0, t1 + fin.length) + '`', c); };
  const z = champ(0), u = champ(1);
  assert.ok(/<input type="number" id="manIn_lev_EUR_USDT" value="1" min="1" max="1" step="1" disabled /.test(z), z);
  assert.ok(/id="manLevNote_EUR_USDT"[^>]*>Levier général ×0 : aucun emprunt, le trade s'ouvre en ×1<\/div>/.test(z), z);
  assert.ok(/<input type="number" id="manIn_lev_EUR_USDT" value="1" min="1" max="10" step="1" style="color:var\(--t1\);">$/.test(u.trim()) && !/disabled|manLevNote/.test(u), u);
});

T('L8 · arrondi : manque de 4 $ sur 1 000 $ → « ×1,99 au lieu de ×2 » (et fiche « levier ×1,99 (×2 demandé) ») ; manque de 0,10 $ dit, de 0,004 $ non ; _levTxt', () => {
  const W = world({ trading: 5000 }); W.S.leverage = 1; W.S.leverageReserve = 996; W.S.pairStates['EUR/USDT'].stake = 1000; W.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W.run("openPosition('EUR/USDT', 'long')")); near(ouverte(W, 'EUR/USDT').totalExposure, 1996, 1e-9);
  assert.deepStrictEqual(avert(W).map(t => t[0]), ['⚠ EUR/USDT LONG ouvert en ×1,99 au lieu de ×2 · réserve du levier insuffisante (' + W.run('fmt$2(996)') + ' empruntés sur ' + W.run('fmt$2(1000)') + ')']);
  const F = world({ trading: 5000 }); F.S.leverage = 1; F.S.leverageReserve = 996; F.els.manIn_stake_EUR_USDT = { value: '1000' }; F.els.manIn_lev_EUR_USDT = { value: '2' };
  assert.ok(F.run("_openManTrade('EUR/USDT', 'long')")); assert.ok(journal(F).includes('Trade MANUEL EUR/USDT LONG · mise $1000 · levier ×1,99 (×2 demandé)'), JSON.stringify(journal(F)));
  const W2 = world({ trading: 500 }); W2.S.leverage = 1; W2.S.leverageReserve = 99.9; W2.S.pairStates['EUR/USDT'].stake = 100; W2.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W2.run("openPosition('EUR/USDT', 'long')")); assert.strictEqual(avert(W2).length, 1, 'manque de 0,10 $ tu');
  const F2 = world({ trading: 500 }); F2.S.leverage = 1; F2.S.leverageReserve = 99.9; F2.els.manIn_stake_EUR_USDT = { value: '100' }; F2.els.manIn_lev_EUR_USDT = { value: '2' };
  assert.ok(F2.run("_openManTrade('EUR/USDT', 'long')")); assert.ok(journal(F2).includes('Trade MANUEL EUR/USDT LONG · mise $100 · levier ×1,99 (×2 demandé)'), 'fiche, manque de 0,10 $ : ' + JSON.stringify(journal(F2))); assert.ok(/ouvert en ×1,99 au lieu de ×2 · réserve du levier insuffisante/.test(avert(W2)[0][0]), avert(W2)[0][0]);
  const W3 = world({ trading: 500 }); W3.S.leverage = 1; W3.S.leverageReserve = 99.996; W3.S.pairStates['EUR/USDT'].stake = 100; W3.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W3.run("openPosition('EUR/USDT', 'long')")); assert.deepStrictEqual(avert(W3), [], 'manque de 0,004 $ : sous le seuil');
  const L = (x, s) => W.run('_levTxt(' + x + ', ' + s + ')');
  [[1.996, 2, '1,99'], [2.9999999996, 0, '3'], [1.5, 3, '1,5'], [1.4999999999, 3, '1,5'], [2.25, 0, '2,25'], [1.996, 0, '2'], [1.9999999, 2, '1,99'], [1.999999999, 2, '1,99'], [1, 2, '1'], [2, 3, '2']].forEach(([x, so, t]) => assert.strictEqual(L(x, so), t, x + ' / ' + so));
});

T('L9 · frontières des raisons : part à emprunter = 10 $ tout juste, réserve 5 $ → « réserve du levier sous 10 $ » ; part 9,99 $ → « part … sous le minimum de 10 $ »', () => {
  const W = world({ trading: 100 }); W.S.leverage = 1; W.S.leverageReserve = 5; W.S.pairStates['EUR/USDT'].stake = 10; W.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W.run("openPosition('EUR/USDT', 'long')")); assert.deepStrictEqual(avert(W).map(t => t[0]), ['⚠ EUR/USDT LONG ouvert en ×1 au lieu de ×2 · réserve du levier sous 10 $']);
  const W2 = world({ trading: 100 }); W2.S.leverage = 1; W2.S.leverageReserve = 5000; W2.S.pairStates['EUR/USDT'].stake = 9.99; W2.S.pairStates['EUR/USDT'].pairLeverage = 2;
  assert.ok(W2.run("openPosition('EUR/USDT', 'long')")); assert.deepStrictEqual(avert(W2).map(t => t[0]), ['⚠ EUR/USDT LONG ouvert en ×1 au lieu de ×2 · part à emprunter sous le minimum de 10 $']);
});

T('V · garde : la voix (15b) ne prend jamais de levier, même sur une paire réglée ×2 à l\'index ×1 — aucun avertissement', () => {
  const W = world({ trading: 500 }); W.S.leverage = 1; W.run('syncLeverageReserve()'); W.S.pairStates['BTC/USDT'].pairLeverage = 2;
  const np = W.run("openPosition('BTC/USDT', 'short', { voix: true, stakeUsdt: 96, voixT0: 1 })");
  assert.ok(np && np._voix === 'tendance'); near(np.totalExposure, 96, 0); near(np.levBorrowed, 0, 0); assert.deepStrictEqual(avert(W), []);
});

T('P · propriété, 3 000 états tirés : argent et positions après openPosition = code d\'avant au centime ; avertissement ⇔ levier pris < demandé', () => {
  let seed = 99; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = a => a[Math.floor(rnd() * a.length)];
  let reduit = 0, entier = 0, refus = 0; const raisons = {};
  for (let i = 0; i < 3000; i++) {
    const st = {
      trading: Math.round(rnd() * 3000 * 100) / 100, cash: rnd() < 0.3 ? Math.round(rnd() * 500) : 0, index: pick([0, 0, 1, 2, 3]),
      reserve: rnd() < 0.3 ? Math.round(rnd() * 200 * 100) / 100 : null, debt: rnd() < 0.3 ? Math.round(rnd() * 4000 * 100) / 100 : 0,
      stake: Math.round((rnd() < 0.1 ? rnd() * 12 : rnd() * 900) * 100) / 100 + 0.01, lev: 1 + Math.floor(rnd() * 10), side: pick(['long', 'short']),
      pos: Array.from({ length: Math.floor(rnd() * 4) }, (_, j) => { const s = Math.round(rnd() * 400 * 100) / 100 + 1, l = rnd() < 0.3 ? 2 : 1;
        return { id: 'o' + j, pair: PAIRES[j], side: 'long', entryPrice: 100, stakeUsdt: s, totalExposure: s * l, levBorrowed: s * (l - 1), _levCash: 0, auto: false, openedAt: 1, entryTs: 1 }; }) };
    const out = [];
    for (const avant of [true, false]) {
      TICK = Date.UTC(2026, 10, 15, 2, 0, 0) + i * 1000;
      const W = world({ avant, trading: st.trading, cash: st.cash });
      W.S.openPositions = JSON.parse(JSON.stringify(st.pos)); W.S.leverage = st.index; W.S.leverageBorrowed = st.debt + st.pos.reduce((a, p) => a + p.levBorrowed, 0);
      W.run('syncLeverageReserve()'); if (st.reserve !== null) W.S.leverageReserve = st.reserve;
      W.S.pairStates['EUR/USDT'].stake = st.stake; W.S.pairStates['EUR/USDT'].pairLeverage = st.lev;
      const pre = { index: W.S.leverage, dette: W.S.leverageBorrowed, reserve: W.S.leverageReserve, cap: W.run('_tradingCapitalBase()') * 10 };
      const np = W.run("openPosition('EUR/USDT', '" + st.side + "')");
      const m = {}; ['tradingAccount', 'cashAccount', 'leverageBorrowed', 'leverageReserve', '_autoLevBorrowed', 'portfolio', 'antiNegReserve'].forEach(k => { m[k] = W.S[k]; });
      out.push({ np: np ? JSON.stringify(np) : null, pos: JSON.stringify(W.S.openPositions), m: JSON.stringify(m), trades: JSON.stringify(W.S.pairStates['EUR/USDT'].trades), W, pre });
    }
    const [A, B] = out;
    assert.strictEqual(B.m, A.m, 'argent différent (' + i + ') ' + JSON.stringify(st));
    assert.strictEqual(B.pos, A.pos, 'positions différentes (' + i + ')'); assert.strictEqual(B.np, A.np); assert.strictEqual(B.trades, A.trades);
    const np = B.np ? JSON.parse(B.np) : null, av = avert(B.W);
    if (!np) { refus++; assert.deepStrictEqual(av, [], 'avertissement sans ouverture (' + i + ')'); continue; }
    const pris = np.totalExposure / np.stakeUsdt, demande = st.lev;
    if (np.levBorrowed < np.stakeUsdt * (demande - 1) - 0.005) {
      reduit++; assert.strictEqual(av.length, 1, 'réduit sans le dire (' + i + ') ' + JSON.stringify(st));
      assert.ok(av[0][0].includes('ouvert en ×' + B.W.run('_levTxt(' + pris + ', ' + demande + ')') + ' au lieu de ×' + demande + ' · '), av[0][0]);
      const dit = Number(av[0][0].match(/ouvert en ×([\d,]+) /)[1].replace(',', '.')); assert.ok(dit < demande && dit <= pris + 1e-9, 'levier dit ' + dit + ' (pris ' + pris + ', demandé ' + demande + ')');
      // l'oracle de la raison : la branche de borrowLeverage (02) qui a refusé, lue sur l'état d'AVANT l'emprunt — l'index ×0 dit en premier (à ×0 rien n'est jamais emprunté)
      const a = np.stakeUsdt * (demande - 1), g = np.totalExposure - np.stakeUsdt, p = B.pre;
      const attendu = p.index === 0 ? 'levier général ×0 : aucun emprunt'
        : g > 0 ? 'réserve du levier insuffisante (' + B.W.run('fmt$2(' + g + ')') + ' empruntés sur ' + B.W.run('fmt$2(' + a + ')') + ')'
        : (p.dette + a > p.cap) ? 'dette du levier au plafond (10× tes fonds propres)'
        : a < 10 ? 'part à emprunter sous le minimum de 10 $' : 'réserve du levier sous 10 $';
      assert.ok(av[0][0].endsWith(' · ' + attendu), 'raison (' + i + ') : « ' + av[0][0] + ' » ≠ ' + attendu + ' ' + JSON.stringify(p));
      raisons[attendu.split(' (')[0]] = (raisons[attendu.split(' (')[0]] || 0) + 1;
      // les toasts et le journal d'avant restent, sauf le levier de « lev → » qui dit le levier pris
      const t0 = A.W.seen.toasts.map(t => t[0].replace(/×[\d,.]+ lev →/, '×? lev →')), t1 = B.W.seen.toasts.filter(t => !av.includes(t)).map(t => t[0].replace(/×[\d,.]+ lev →/, '×? lev →'));
      assert.deepStrictEqual(t1, t0, 'autres toasts (' + i + ')');
    } else { entier++; assert.deepStrictEqual(av, [], 'avertissement à tort (' + i + ')'); assert.deepStrictEqual(B.W.seen.toasts, A.W.seen.toasts, 'toasts (' + i + ')'); assert.deepStrictEqual(journal(B.W), journal(A.W)); }
  }
  assert.ok(reduit > 300 && entier > 300 && refus > 50, 'tirage trop pauvre : ' + reduit + ' / ' + entier + ' / ' + refus);
  assert.ok(Object.keys(raisons).length === 5 && Object.values(raisons).every(n => n >= 5), 'raisons trop peu tirées : ' + JSON.stringify(raisons));
});

T('G · garde : ce que le BOT lit et écrit est au texte d\'avant (733674d) ; aucun bot n\'appelle openPosition', () => {
  ['borrowLeverage', 'estimateStakes', 'repayLeverage', 'syncLeverageReserve', '_tradingCapitalBase', 'ensureLeverageCoverForTrade'].forEach(n =>
    assert.strictEqual(need(C.s02, n), need(AVANT.s02, n), n + ' a changé'));
  assert.strictEqual(h16(need(C.s02, 'estimateStakes')), '191de2e4cf018d53', 'estimateStakes (empreinte de go n° 61)');
  const FH = { 'js/09c-auto-open.js': 'cb981dcbb9806d73', 'js/10f-resolveur-cycle.js': '2c7f1bbbb66741a0', 'js/15-voix-tendance.js': '9757929e4b295254', 'js/15b-tendance-reelle.js': '08582a20cd8f495a',
    'js/09j-helpers.js': '469be1c86f4a9337', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js': '61d3dedc2ac96e82', 'js/03-per-pair-position-buttons-controls-buid.js': '9c2ecc2cbdd73a08' };
  Object.keys(FH).forEach(f => assert.strictEqual(h16(sansA3(require('./banc-fixtures/sans-n86d.js')(rd(f), f), f)), FH[f], f + ' a changé'));   // [GO N° 86D · 15/11/2026] hors go n° 86d (03, 08 : champs de saisie TP / SL, banc-n86d.js)   // [GO AFFICHAGE 3 · 15/11/2026] hors les retouches de go affichage 3 (affichage seul, banc-affichage-3.js)
  ['js/09c-auto-open.js', 'js/10f-resolveur-cycle.js', 'js/15-voix-tendance.js', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js'].forEach(f =>
    assert.ok(!/(^|[^\w$.])openPosition\s*\(/.test(rd(f).replace(/\/\/.*$/gm, '')), f + ' appelle openPosition'));
});

T('C · appels : _pairLevShortWhy ← 02 openPosition seulement ; _levTxt ← 02 openPosition et 10e _openManTrade seulement', () => {
  const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
  ['js/native-bridge.js', 'guardian-core.js', 'guardian-embed.js', 'aura-guardian.html'].forEach(f => { if (fs.existsSync(path.join(ROOT, f)) && !files.includes(f)) files.push(f); });
  const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const appelants = (re) => { const out = []; files.map(f => [f, rd(f)]).concat([['HTML (en ligne)', inline]]).forEach(([f, s]) => {
    const fns = [...s.matchAll(/\nfunction ([\w$]+)\s*\(/g)].map(m => [m.index, m[1]]);
    for (const m of s.matchAll(re)) { const line = s.slice(s.lastIndexOf('\n', m.index) + 1, s.indexOf('\n', m.index)); if (/^\s*\/\//.test(line)) continue;
      const before = fns.filter(x => x[0] < m.index).pop(); out.push(f + ':' + (before ? before[1] : '(haut du fichier)')); } }); return [...new Set(out)].sort(); };
  // [GO N° 62 · 15/11/2026] + 07 « Inverser » : la raison du levier réduit DITE AVANT la fermeture (_invChoix) et le levier écrit (_invQuestion, manuInvert)
  assert.deepStrictEqual(appelants(/_pairLevShortWhy\s*\(/g), ['js/02-state-init.js:_pairLevShortWhy', 'js/02-state-init.js:openPosition', 'js/07-v90-mode-bunker-sos.js:_invChoix'].sort());
  assert.deepStrictEqual(appelants(/_levTxt\s*\(/g), ['js/02-state-init.js:_levTxt', 'js/02-state-init.js:openPosition', 'js/10e-helpers-adaptatifs.js:_openManTrade', 'js/07-v90-mode-bunker-sos.js:_invChoix', 'js/07-v90-mode-bunker-sos.js:_invQuestion', 'js/07-v90-mode-bunker-sos.js:manuInvert'].sort());
});

T('F · garde : banc-fixtures/n99-retours.json redonne les 4 fichiers d\'avant au caractère près (empreintes du commit 733674d)', () => {
  if (process.env.BANC_ROOT) return;   // code d'avant : rien à retirer
  const A = { 'js/02-state-init.js': '905210979c640363', 'js/07-v90-mode-bunker-sos.js': 'a4fbc05aef5f996d', 'js/10e-helpers-adaptatifs.js': '2455e8b0c3ed8ad3', 'js/10h-pont-fullpower-bricks.js': 'ee5ae4f1b898b80e' };
  Object.keys(A).forEach(f => { const s = require('./banc-fixtures/sans-n101.js')(rd(f), f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sansN99(sansA3(sansN62(require('./banc-fixtures/sans-n103.js')(s, f), f), f), f)), A[f], f + ' : autre chose a bougé'); });   // [GO N° 101 · 15/11/2026] hors go n° 101 (10h : levier de la paire dans la fiche, banc-n101.js)   // [GO N° 103 · 15/11/2026] hors go n° 103 (banc-n103.js)   // [GO N° 62 · 15/11/2026] hors go n° 62 (banc-n62.js)   // [GO AFFICHAGE 3 · 15/11/2026] hors les retouches de go affichage 3 (affichage seul, banc-affichage-3.js)
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
