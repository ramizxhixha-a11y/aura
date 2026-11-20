// banc-n62.js — [GO N° 62 · 15/11/2026] « ↓ Inverser » (07 manuInvert) : la réouverture est connue AVANT la fermeture (ETAT-AURA8.md, registre G1 n° 62).
// Chaque essai fait tourner le VRAI texte de l'app en vm (02 openPosition / closePosition / recordFees / emprunts, 07, 09j, et 16 pour l'impôt belge)
// et ÉCHOUE sur le code d'avant      BANC_ROOT=<copie du commit 2361fbb> node banc-n62.js       (sauf les gardes C, G et F)
//   Q   la question vient AVANT la fermeture (position encore ouverte, trading intact) et dit la fermeture et la réouverture ; « Annuler » = rien ne change
//   L   le levier EXACT de la position : ×1,4 rouvert en ×1,4 (avant : ×1), ×1,5 en ×1,5 (avant : ×2)
//   P   levier de paire ×2, index ×1, 2 autres positions : avant « fermé, mais SHORT non rouvert » (l'emprunt de la part à levier passait le contrôle
//       de capital en branche « levier » APRÈS la recherche de la mise) ; après : la question dit « ×1 au lieu de ×2 » et pourquoi, et c'est ce qui s'ouvre
//   R   rien ne peut être rouvert (dette de levier de 0,01 $ et une autre position : plafond = dette − mises engagées) → RIEN n'est fermé
//   D   la fermeture laisse moins que prévu (un débit imprévu pendant la fermeture) → 2e question (« La réouverture annoncée n'est plus possible telle quelle ») avec les vrais montants ; acceptée : c'est ce qui
//       s'ouvre ; refusée : rien n'est rouvert, et c'est dit
//   C   garde — ce que go consignes et go levier avaient prouvé tient toujours : vraie fermeture (historique, frais), mêmes distances de TP / SL, mêmes consignes ;
//       la voix tendance refusée ; « Pas de position »
//   E   miroir, 3 000 états tirés : l'état prévu par _invApres = l'état RÉEL après closePosition (trading, dette, réserve du levier, caisse), au 1e-6 —
//       avec emprunts (index, part « exposition », part en argent), réserve anti-négatif, frais dus, part caisse, dette orpheline, perte totale ;
//       et 400 états avec l'impôt belge RÉEL (16) : écart ≤ 1 cent
//   A   miroir de l'ouverture, 3 000 essais : _invPasse(x, L) dit oui ⇔ le VRAI openPosition ouvre ; part empruntée prévue = réelle (jit compris)
//   M   propriété, 2 000 états tirés, VRAI manuInvert : (1) toute question vient avant la fermeture ; (2) sans question, rien n'a bougé ; (3) ce qui
//       s'ouvre = ce que la dernière question acceptée annonçait (mise et exposition, au cent) ; (4) jamais « fermé, mais … non rouvert » après un accord ;
//       sans débit imprévu, 0 deuxième question. Témoin : le code d'avant, sur les mêmes états, ferme sans rouvrir ou change le levier (compté)
//   G   garde : manuInvert n'est appelé que par un bouton (onclick, 07) et la fiche ✏️ (08 flipPosition) ; les _inv… seulement par manuInvert ; aucun
//       bot ne passe par là ; les fichiers que lit la décision (02, 03, 04, 09c, 09j, 10f, 15, 15b) et 08, 16 au texte de 2361fbb
//   F   garde : banc-fixtures/n62-retours.json redonne le 07 d'avant au caractère près (empreinte du commit 2361fbb)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
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
const near = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const s02 = rd('js/02-state-init.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s9j = rd('js/09j-helpers.js'), s16 = rd('js/16-fiscal.js'), html = rd('AURA8_v118.html');
const INV = ['_invAvec', '_invEmprunt', '_invPasse', '_invChoix', '_invApres', '_invPlan', '_invQuestion'];
const NOUVEAU = INV.every(n => fnSrc(s07, n));

// ─── Le monde : un portefeuille à plat (EV), VRAIES fonctions d'argent (même harnais que banc-n61.js) ───
const FEE = { takerRate: 0.001, makerRate: 0.001, slippage: 0.0003, fundingRate: 0 };
let TICK = Date.UTC(2026, 10, 15, 5, 0, 0);
class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [TICK])); } static now() { return ++TICK; } }
const F02 = ['_computePortfolio', '_computePortfolioSans', '_tradingCapitalBase', 'syncLeverageReserve', 'ensureLeverageCoverForTrade', 'borrowLeverage',
  'repayLeverage', 'recordFees', 'releaseTradeReserve', '_manOpenWarnings', '_manConsigneOf', 'openPosition', 'closePosition', '_pairLevShortWhy', '_levTxt',
  'fmt$', 'fmt$2', '_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto', '_feesDueOf'];
const F16 = ['_fiscNum', '_fiscYearOf', '_fiscAmounts', '_fiscFx', '_fiscCfg', '_fiscRegimeOf', '_fiscGainEur', '_fiscNewYear', '_fiscDue', '_fiscCloseYear', '_fiscWallet',
  '_fiscLedger', '_fiscRoll', '_fiscLog', '_fiscReconcile', '_fiscRebalance', '_fiscSettleClosed', '_fiscOnClose', '_fiscLatentTaxUsd'];
const PAIRES = ['ADA/USDT', 'AVAX/USDT', 'BNB/USDT', 'BTC/USDT', 'DOGE/USDT', 'DOT/USDT', 'ETH/USDT', 'LINK/USDT', 'PEPE/USDT', 'SOL/USDT', 'XRP/USDT', 'EUR/USDT'];
function world(o) {
  o = o || {};
  const seen = { toasts: [], q: [] };
  const S = { tradingMode: 'paperReal', cashAccount: o.cash || 0, tradingAccount: o.trading != null ? o.trading : 100, openPositions: [], pnlHistory: [100], chainLog: [], cashLog: [],
    totalTrades: 0, winTrades: 0, leverage: o.leverage || 0, leverageReserve: 0, leverageBorrowed: 0, leverageMaxMult: 10, leverageBorrowRate: 0, _autoLevBorrowed: 0, _autoLevBase: 0,
    antiNegReserve: 0, antiNegReserveLog: [], fiscalReserveAccount: 0, fiscalReserveLog: [], ownFundsInjected: 0, profitSplitCaissePct: o.split != null ? o.split : 0, feeConfig: Object.assign({}, FEE),
    taxConfig: o.be ? { region: 'BE' } : { region: 'XX', regions: { XX: { inclusion: 1, rate: 0 } } }, usdEurRate: 0.9, _usdEurLastFetch: 1, fiscalCfg: { commune: 0, ext: {} },
    paperRealStats: {}, agents: [], botFleet: {}, botAutoMode: false, currentPage: 1,
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {}, _manConsignes: {}, paperRealConfig: { maxConcurrentPos: 3 } };
  PAIRES.forEach(p => { S.pairStates[p] = { price: 100, stake: 30, pairLeverage: 1, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const W = { S, seen, surprise: 0, repond: o.repond || (() => true) };
  const c = { S, PAIRS: Object.fromEntries(PAIRES.map(p => [p, { dec: 2, color: '#fff' }])), Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN, parseFloat, parseInt, Error, Intl,
    console: { log() {}, warn() {}, error() {} }, showToast: (m, d, lvl) => seen.toasts.push([String(m), lvl || 'info']), rndHash: () => 'h', nowStr: () => '05:10:00',
    confirm: (q) => { const p0 = W.cible; seen.q.push({ q: String(q), ouverte: !!(p0 && S.openPositions.indexOf(p0) >= 0), trading: S.tradingAccount, hist: S.pairStates[p0 ? p0.pair : 'BTC/USDT'].trades.length }); return W.repond(String(q), seen.q.length); },
    navigator: {}, document: { getElementById: () => null },
    recordTradeForHeatmap() {}, learnFromOutcome() {}, emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {}, checkPnlAlerts() {}, checkBadges() {},
    _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderChain() {}, renderHome() {}, renderPositions() {}, saveState() {}, renderActionsGrid() {},
    saveFeeRecord() {}, addAnnualNetRealised() {}, renderSortiePartiSection() {}, renderPyramideSection() {},
    detectMarketRegime: () => 'calm', _calcBotTpSl: () => null, lmsrP: () => 0.5, notifTradeOpen() {}, notifTradeClose() {}, tgOnTrade() {}, disableFullPowerMode() {},
    _modeBehind: () => false, _schoolBehind: () => false, _walletKey: m => m || 'paperReal', updateStreakBadge() {}, _p5PreActionSave() {}, _autoSnapshotBeforeLeverage() {},
    _notifyTradeForExport: () => { if (W.surprise) S.tradingAccount = Math.max(0, S.tradingAccount - W.surprise); } };
  c._activeWallet = () => S; c._walletFor = () => S;
  if (!o.be) c._fiscOnClose = () => ({ movedUsd: 0, regime: 'spec', gainEur: 0 });
  c.window = c; vm.createContext(c);
  const src = ['var _pxFmt = {};', need(s02, 'pxTxt')].concat(F02.map(n => fnSrc(s02, n)).filter(Boolean));
  src.push(need(s9j, 'validateTotalExposure'), need(s9j, 'validateInvestmentCapProvisioned'), need(s9j, 'validateManualExposure'));
  if (o.be) src.push((s16.match(/var FISC_BE = \{[\s\S]*?\n\};/) || [''])[0], 'var _FISC_HIST_MAX = { sim: 300, paperReal: 300, real: 1500 };', ...F16.map(n => need(s16, n)));
  src.push(...INV.map(n => fnSrc(s07, n) || ''), need(s07, 'manuInvert'));
  vm.runInContext(src.join('\n') + '\nvar S = this.S;', c);
  W.c = c; W.run = code => vm.runInContext(code, c);
  return W;
}
const posOf = o => Object.assign({ id: 'pA', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 100, totalExposure: 100, levBorrowed: 0, auto: false, openedAt: 1, entryTs: 1 }, o);
// comme un ouvreur : mise retirée du trading ; part « exposition » empruntée (dette, réserve) ; part en argent (JIT) versée au trading puis misée
function poser(W, p, o) {
  o = o || {}; const S = W.S;
  const expo = Math.max(0, (p.totalExposure || p.stakeUsdt) - p.stakeUsdt), cash = Number(p._levCash) || 0;
  p.levBorrowed = expo + cash;
  S.leverageBorrowed += expo + cash; S._autoLevBorrowed += cash; S.tradingAccount += cash - p.stakeUsdt;
  S.openPositions.push(p); return p;
}
const ouverte = (W, pair) => W.S.openPositions.find(p => p.pair === pair) || null;
const num = s => Number(String(s).replace(/[\s  ]/g, '').replace(',', '.'));
// ce qu'annonce une question : la mise et l'exposition de la réouverture
function annonce(q) {
  let m = /2\. Ouvrir un (?:LONG|SHORT) · mise \$([\d\u202f\u00a0]+,\d\d)(?: · ×[\d,]+ \(exposition \$([\d\u202f\u00a0]+,\d\d)\))?/.exec(q);
  if (m) return { x: num(m[1]), expo: m[2] ? num(m[2]) : num(m[1]) };
  m = /avec mise \$([\d\u202f\u00a0]+,\d\d) · ×([\d,]+)/.exec(q);
  if (m) return { x: num(m[1]), lev: num(m[2]) };
  return null;
}
const etat = W => JSON.stringify([W.S.tradingAccount, W.S.cashAccount, W.S.leverageBorrowed, W.S.leverageReserve, W.S._autoLevBorrowed, W.S.antiNegReserve,
  W.S.openPositions.map(p => [p.id, p.pair, p.side, p.stakeUsdt, p.totalExposure]), Object.values(W.S.pairStates).map(ps => ps.trades.length), W.S.fees.tradeCount]);

console.log('▶ banc-n62 · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

T('Q · la question vient AVANT la fermeture (position ouverte, trading intact), dit la fermeture et la réouverture ; acceptée → SHORT 490 $ ; « Annuler » → rien ne change', () => {
  const mk = rep => { const W = world({ trading: 1190, repond: rep });
    [['pA', 'BTC/USDT', 490], ['pB', 'ETH/USDT', 300], ['pC', 'SOL/USDT', 300]].forEach(([id, pair, st]) => poser(W, posOf({ id, pair, stakeUsdt: st, totalExposure: st })));
    W.run('syncLeverageReserve()'); W.cible = W.S.openPositions[0]; W.S.pairStates['BTC/USDT'].price = 101; return W; };
  const W = mk(() => true); W.run("manuInvert('BTC/USDT')");
  assert.strictEqual(W.seen.q.length, 1, 'une question : ' + JSON.stringify(W.seen.toasts));
  const q = W.seen.q[0]; assert.ok(q.ouverte && q.trading === 100 && q.hist === 0, 'posée avant la fermeture : ' + JSON.stringify(q));
  assert.ok(/1\. Fermer le LONG · mise \$490,00 · résultat ≈ \+\$3,63 \(frais compris\)/.test(q.q), q.q);   // 490 × 1 % − 490 × 0,0026
  assert.ok(/2\. Ouvrir un SHORT · mise \$490,00\n/.test(q.q) && /mêmes distances, mêmes consignes/.test(q.q) && !/⚠/.test(q.q), q.q);
  const np = ouverte(W, 'BTC/USDT'); assert.ok(np && np.side === 'short', JSON.stringify(W.seen.toasts)); near(np.stakeUsdt, 490, 1e-12, 'mise rouverte');
  assert.ok(W.seen.toasts.some(t => /inversé → SHORT · mise \$490,00$/.test(t[0])), JSON.stringify(W.seen.toasts));
  assert.strictEqual(W.S.pairStates['BTC/USDT'].stake, 30, 'mise de la paire rendue'); assert.strictEqual(W.S.pairStates['BTC/USDT'].pairLeverage, 1, 'levier de la paire rendu');
  const V = mk(() => false), av = etat(V); V.run("manuInvert('BTC/USDT')");
  assert.strictEqual(etat(V), av, 'rien ne change'); assert.strictEqual(ouverte(V, 'BTC/USDT').id, 'pA');
  assert.ok(V.seen.toasts.some(t => /annulé · rien n'a changé/.test(t[0])), JSON.stringify(V.seen.toasts));
});

T('L · le levier EXACT : ×1,4 rouvert en ×1,4 (avant : ×1, l\'arrondi) et ×1,5 en ×1,5 (avant : ×2) — index ×1, réserve suffisante', () => {
  [[1.4, 140], [1.5, 150]].forEach(([lv, ex]) => {
    const W = world({ trading: 2000, leverage: 1 }); W.S.leverageBorrowed = 1000; W.S._autoLevBorrowed = 1000;   // l'emprunt de l'index ×1 (déjà versé au trading)
    W.cible = poser(W, posOf({ stakeUsdt: 100, totalExposure: ex })); W.run('syncLeverageReserve()');
    W.run("manuInvert('BTC/USDT')");
    const np = ouverte(W, 'BTC/USDT'); assert.ok(np && np.side === 'short', JSON.stringify(W.seen.toasts));
    near(np.stakeUsdt, 100, 1e-12, 'mise'); near(np.totalExposure, ex, 1e-9, '×' + lv + ' exposition');
    assert.ok(W.seen.q.length === 1 && new RegExp('mise \\$100,00 · ×' + String(lv).replace('.', ',') + ' \\(exposition \\$' + ex + ',00\\)').test(W.seen.q[0].q), JSON.stringify(W.seen.q));
  });
});

T('P · levier de paire ×2, index ×1, 2 autres positions (600 $) : avant « fermé, mais SHORT non rouvert » ; après la question dit « ×1 au lieu de ×2 » et pourquoi, et c\'est ce qui s\'ouvre', () => {
  const W = world({ trading: 1000, leverage: 1 });
  W.cible = poser(W, posOf({ stakeUsdt: 100, totalExposure: 200 })); poser(W, posOf({ id: 'pB', pair: 'ETH/USDT', stakeUsdt: 300, totalExposure: 300 }));
  poser(W, posOf({ id: 'pC', pair: 'SOL/USDT', stakeUsdt: 300, totalExposure: 300 })); W.run('syncLeverageReserve()');
  W.run("manuInvert('BTC/USDT')");
  const np = ouverte(W, 'BTC/USDT');
  assert.ok(np && np.side === 'short', 'non rouverte : ' + JSON.stringify(W.seen.toasts));
  assert.ok(!W.seen.toasts.some(t => /non rouvert|Capital max/.test(t[0])), JSON.stringify(W.seen.toasts));
  assert.strictEqual(W.seen.q.length, 1); const q = W.seen.q[0].q;
  assert.ok(/2\. Ouvrir un SHORT · mise \$100,00\n/.test(q) && /⚠ ×1 au lieu de ×2 : à ×2, contrôle de capital : avec une dette de levier, plafond = dette − mises engagées \(\$0,00\)/.test(q), q);
  near(np.stakeUsdt, 100, 1e-12, 'mise'); near(np.totalExposure, 100, 1e-12, '×1 annoncé, ×1 ouvert');
});

T('R · rien ne peut être rouvert (dette de 0,01 $, une autre position : plafond = dette − mises engagées) → RIEN n\'est fermé, et c\'est dit (avant : fermé, « non rouvert »)', () => {
  const W = world({ trading: 500 }); W.cible = poser(W, posOf({ stakeUsdt: 100, totalExposure: 100 })); poser(W, posOf({ id: 'pB', pair: 'ETH/USDT', stakeUsdt: 50, totalExposure: 50 }));
  W.S.leverageBorrowed = 0.01; W.run('syncLeverageReserve()'); const av = etat(W);
  W.run("manuInvert('BTC/USDT')");
  assert.strictEqual(W.seen.q.length, 0, 'aucune question'); assert.strictEqual(etat(W), av, 'rien n\'a bougé'); assert.strictEqual(ouverte(W, 'BTC/USDT').id, 'pA');
  assert.ok(W.seen.toasts.some(t => /rien ne pourrait être rouvert en SHORT \(contrôle de capital : avec une dette de levier, plafond = dette − mises engagées \(\$0,00\)\) · rien n'est fermé/.test(t[0])), JSON.stringify(W.seen.toasts));
});

T('D · un débit imprévu pendant la fermeture (60 $) : 2e question avec les vrais montants — acceptée, c\'est ce qui s\'ouvre ; refusée, rien n\'est rouvert et c\'est dit', () => {
  const mk = rep => { const W = world({ trading: 110, repond: rep }); W.cible = poser(W, posOf({ stakeUsdt: 100, totalExposure: 100 })); W.run('syncLeverageReserve()'); W.surprise = 60; return W; };
  const W = mk(() => true); W.run("manuInvert('BTC/USDT')");
  assert.strictEqual(W.seen.q.length, 2, JSON.stringify(W.seen.q.map(x => x.q)));
  const a1 = annonce(W.seen.q[0].q), a2 = annonce(W.seen.q[1].q); assert.ok(a1 && a2, JSON.stringify(W.seen.q));
  near(a1.x, 100, 1e-9, '1re annonce'); assert.ok(!W.seen.q[1].ouverte && /le LONG est fermé/.test(W.seen.q[1].q) && /au lieu de \$100,00 · ×1 annoncés/.test(W.seen.q[1].q), W.seen.q[1].q);
  const np = ouverte(W, 'BTC/USDT'); assert.ok(np && np.side === 'short'); near(np.stakeUsdt, a2.x, 0.005, 'ouvert = 2e annonce'); assert.ok(a2.x < 50 && a2.x > 49, String(a2.x));
  const V = mk((q, n) => n === 1); V.run("manuInvert('BTC/USDT')");
  assert.strictEqual(V.seen.q.length, 2); assert.strictEqual(ouverte(V, 'BTC/USDT'), null, 'rien rouvert sans accord');
  assert.ok(V.seen.toasts.some(t => /LONG fermé · SHORT non rouvert \(annulé\)/.test(t[0])), JSON.stringify(V.seen.toasts));
});

T('C · vraie fermeture (historique, frais) puis réouverture avec les mêmes distances de TP / SL et les mêmes consignes ; voix refusée ; « Pas de position »', () => {
  const W = world({ trading: 500 }); W.cible = poser(W, posOf({ stakeUsdt: 80, totalExposure: 80, tp: 101.5, sl: 99.3, _manMaxLossPct: 3, _manTimeoutMin: 90 }));
  W.S.pairStates['BTC/USDT'].price = 99.5; W.run('syncLeverageReserve()');
  W.run("manuInvert('BTC/USDT')");
  const np = ouverte(W, 'BTC/USDT'); assert.ok(np && np.side === 'short');
  near(np.tp, 99.5 * (1 - 0.015), 1e-9, 'TP 1,5 % sous l\'entrée'); near(np.sl, 99.5 * (1 + 0.007), 1e-9, 'SL 0,7 % au-dessus'); assert.strictEqual(np._manMaxLossPct, 3); assert.strictEqual(np._manTimeoutMin, 90);
  const t = W.S.pairStates['BTC/USDT'].trades; assert.ok(t.some(x => x.type === 'position' && Math.abs(x.pnlUsdt - (-0.4)) < 1e-9), JSON.stringify(t)); assert.strictEqual(W.S.fees.tradeCount, 1);
  const V = world({ trading: 500 }); V.cible = poser(V, posOf({ _voix: 'tendance' })); const av = etat(V); V.run("manuInvert('BTC/USDT')");
  assert.strictEqual(etat(V), av); assert.strictEqual(V.seen.q.length, 0); assert.ok(/voix tendance/.test(V.seen.toasts[0][0]));
  V.run("manuInvert('ETH/USDT')"); assert.ok(/Pas de position ouverte sur ETH\/USDT/.test(V.seen.toasts[1][0]));
});

// ─── états tirés ───
function tirage(seed) {
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, pick = a => a[Math.floor(rnd() * a.length)];
  return () => {
    const W = world({ trading: Math.round(rnd() * 1500 * 100) / 100, cash: rnd() < 0.3 ? Math.round(rnd() * 500) : 0, leverage: pick([0, 0, 0, 1, 2]), split: pick([0, 30, 100]) });
    const S = W.S, lv = pick([1, 1, 1, 1.4, 1.5, 2, 3]), st = Math.round((5 + rnd() * 600) * 100) / 100;
    const p = posOf({ side: pick(['long', 'short']), stakeUsdt: st, totalExposure: Math.round(st * lv * 100) / 100, _levCash: rnd() < 0.15 ? Math.round(rnd() * st * 100) / 100 : 0 });
    if (rnd() < 0.3) { p._reservedAmount = Math.round(rnd() * 3 * 100) / 100; S.antiNegReserve = Math.round(rnd() * 5 * 100) / 100; }
    W.cible = poser(W, p);
    for (let j = 0, n = Math.floor(rnd() * 4); j < n; j++) { const s2 = Math.round(rnd() * 400 * 100) / 100, l2 = pick([1, 1, 2]);
      poser(W, posOf({ id: 'o' + j, pair: PAIRES[j], stakeUsdt: s2, totalExposure: s2 * l2 })); }
    if (rnd() < 0.2) { const d = Math.round(rnd() * 80 * 100) / 100; S.leverageBorrowed += d; if (rnd() < 0.7) S._autoLevBorrowed += d; }   // dette orpheline (P2)
    if (rnd() < 0.15) S._feesDue = Math.round(rnd() * 4 * 100) / 100;
    S.tradingAccount = Math.max(0, S.tradingAccount);
    W.run('syncLeverageReserve()'); if (rnd() < 0.2) S.leverageReserve = Math.round(rnd() * 300);
    S.pairStates[p.pair].price = rnd() < 0.05 ? 0 : Math.round(100 * (0.5 + rnd() * 1.0) * 1e4) / 1e4;
    return W;
  };
}

T('E · miroir, 3 000 états : l\'état prévu par _invApres = l\'état RÉEL après closePosition (trading, dette, réserve, caisse) au 1e-6 ; 400 états avec l\'impôt belge réel (16) : ≤ 1 cent', () => {
  assert.ok(NOUVEAU, '_invApres absente (code d\'avant)');
  const tire = tirage(62); let n = 0, pertes = 0, p2 = 0, cash = 0, res = 0;
  for (let i = 0; i < 3000; i++) {
    const W = tire(), p = W.cible, S = W.S;
    const ap = W.c._invApres(p).etat;
    if (S.pairStates[p.pair].price === 0) pertes++; if (S._autoLevBorrowed > (Number(p._levCash) || 0) && S.leverage === 0) p2++; if (p._levCash > 0) cash++; if (p._reservedAmount != null) res++;
    W.run("closePosition('pA')");
    ['tradingAccount', 'leverageBorrowed', 'leverageReserve', 'cashAccount'].forEach(k => near(ap[k], S[k], 1e-6, 'état ' + i + ' · ' + k));
    assert.deepStrictEqual(ap.openPositions.map(x => x.id), S.openPositions.map(x => x.id)); n++;
  }
  assert.ok(pertes > 50 && p2 > 50 && cash > 200 && res > 500, 'tirage trop pauvre : ' + [pertes, p2, cash, res]);
  // l'impôt belge réel : le 16 au complet (registre, provision, cours), gains et pertes, LONG et SHORT, MANU
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; let maxE = 0, taxes = 0;
  for (let i = 0; i < 400; i++) {
    const W = world({ trading: Math.round(rnd() * 800), be: true, split: [0, 100][i % 2] }); const S = W.S;
    for (let k = 0, n2 = Math.floor(rnd() * 3); k < n2; k++) { const q = poser(W, posOf({ id: 'h' + k, pair: PAIRES[k], stakeUsdt: 200, totalExposure: 200 })); S.pairStates[q.pair].price = 100 * (0.9 + rnd() * 0.3); W.run("closePosition('h" + k + "')"); }   // un registre de l'année déjà rempli
    const p = poser(W, posOf({ side: rnd() < 0.25 ? 'long' : 'short', stakeUsdt: Math.round(rnd() * 500 + 5), totalExposure: 0 })); p.totalExposure = p.stakeUsdt;
    S.pairStates['BTC/USDT'].price = 100 * (0.8 + rnd() * 0.4); W.run('syncLeverageReserve()');
    const ap = W.c._invApres(p); if (Math.abs(ap.impot) > 0.005) taxes++;
    W.run("closePosition('pA')");
    ['tradingAccount', 'cashAccount', 'leverageReserve'].forEach(k => { const e = Math.abs(ap.etat[k] - S[k]); maxE = Math.max(maxE, e); assert.ok(e <= 0.01, 'impôt · état ' + i + ' · ' + k + ' : ' + ap.etat[k] + ' ≠ ' + S[k]); });
  }
  assert.ok(taxes > 100, 'trop peu d\'impôt dans le tirage : ' + taxes);
  console.log('     (miroir : ' + n + ' états au 1e-6 · impôt belge : ' + taxes + ' fermetures imposées, écart max ' + maxE.toExponential(2) + ' $)');
});

T('A · miroir de l\'ouverture, 3 000 essais : _invPasse(x, L) dit oui ⇔ le VRAI openPosition ouvre (emprunt de la part à levier, contrôle de capital, emprunt « juste à temps ») ; emprunt prévu = emprunt réel', () => {
  assert.ok(NOUVEAU, '_invPasse absente (code d\'avant)');
  let oui = 0, non = 0, jit = 0, b = 0;
  let seed = 99; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, pick = a => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < 3000; i++) {
    const W = world({ trading: Math.round(rnd() * 1500 * 100) / 100, cash: rnd() < 0.3 ? Math.round(rnd() * 500) : 0, leverage: pick([0, 0, 1, 1, 2]) }), S = W.S, ps = S.pairStates['EUR/USDT'];
    if (S.leverage >= 1 && rnd() < 0.6) { const d = Math.round(S.tradingAccount * S.leverage * (0.5 + rnd() * 0.5) * 100) / 100; S.tradingAccount += d; S.leverageBorrowed += d; S._autoLevBorrowed += d; }   // l'emprunt de l'index, versé au trading
    for (let j = 0, n = Math.floor(rnd() * 4); j < n; j++) { const s2 = Math.round(rnd() * 300 * 100) / 100; poser(W, posOf({ id: 'o' + j, pair: PAIRES[j], stakeUsdt: s2, totalExposure: s2 * pick([1, 1, 1, 2]) })); }
    if (rnd() < 0.1) S.leverageBorrowed += 0.01;
    S.tradingAccount = Math.max(0, S.tradingAccount); W.run('syncLeverageReserve()'); if (rnd() < 0.15) S.leverageReserve = Math.round(rnd() * 200);
    const x = Math.round((0.5 + rnd() * (S.tradingAccount * 1.4 + 50)) * 100) / 100, L = [1, 1, 1.4, 1.5, 2, 3][Math.floor(rnd() * 6)];
    const pr = W.c._invPasse(x, L), av = etat(W); assert.strictEqual(etat(W), av, 'lecture seule');
    const T0 = S.tradingAccount; ps.stake = x; ps.pairLeverage = L;
    const np = W.run("openPosition('EUR/USDT', 'long')");
    assert.strictEqual(!!np, !!pr.ok, 'essai ' + i + ' : prévu ' + JSON.stringify(pr) + ' · réel ' + JSON.stringify(W.seen.toasts.slice(-2)));
    if (np) { oui++; near(np.totalExposure - np.stakeUsdt, pr.b, 1e-9, 'essai ' + i + ' : part empruntée'); if (x > T0) jit++; if (pr.b > 0) b++; } else non++;
  }
  assert.ok(oui > 500 && non > 500 && jit > 50 && b > 100, 'tirage trop pauvre : ' + [oui, non, jit, b]);
});

T('M · propriété, 2 000 états, VRAI manuInvert : question avant la fermeture ; sans question rien ne bouge ; ouvert = annoncé ; jamais « non rouvert » après un accord ; 0 deuxième question — témoin : le code d\'avant', () => {
  const tire = tirage(2062); let ouvertes = 0, sansQ = 0, reduites = 0, lev1 = 0;
  for (let i = 0; i < 2000; i++) {
    const W = tire(), S = W.S, p = W.cible, av = etat(W);
    W.run("manuInvert('BTC/USDT')");
    const qs = W.seen.q, np = ouverte(W, 'BTC/USDT');
    assert.ok(qs.length <= 1, 'état ' + i + ' : deuxième question sans débit imprévu : ' + JSON.stringify(qs.map(x => x.q)));
    if (!qs.length) {
      sansQ++; assert.strictEqual(etat(W), av, 'état ' + i + ' : sans question, rien ne bouge');
      assert.ok(np === p && W.seen.toasts.some(t => /rien ne pourrait être rouvert/.test(t[0])), 'état ' + i + ' : ' + JSON.stringify(W.seen.toasts)); continue;
    }
    assert.ok(qs[0].ouverte, 'état ' + i + ' : question après la fermeture');
    const a = annonce(qs[qs.length - 1].q); assert.ok(a, qs[0].q);
    assert.ok(np && np !== p && np.side !== p.side, 'état ' + i + ' : non rouverte après accord : ' + JSON.stringify(W.seen.toasts) + '\n' + qs[0].q);
    near(np.stakeUsdt, a.x, 0.005, 'état ' + i + ' : mise ouverte / annoncée'); near(np.totalExposure, a.expo, 0.01, 'état ' + i + ' : exposition ouverte / annoncée');
    assert.ok(!W.seen.toasts.some(t => /non rouvert/.test(t[0])), JSON.stringify(W.seen.toasts));
    if (a.x < p.stakeUsdt - 0.005 && qs.length === 1) assert.ok(/\n\n⚠ Mise \$[\d\u202f\u00a0]+,\d\d au lieu de \$[\d\u202f\u00a0]+,\d\d : (le trading( \(emprunt du levier compris\))? ne tiendra que|contrôle de capital : )/.test(qs[0].q), 'état ' + i + ' : mise réduite non dite\n' + qs[0].q);
    ouvertes++; if (np.stakeUsdt < p.stakeUsdt - 0.005) reduites++; if (Math.abs(np.totalExposure / np.stakeUsdt - p.totalExposure / p.stakeUsdt) > 0.005) lev1++;
  }
  assert.ok(ouvertes > 1000 && sansQ > 5 && reduites > 20 && lev1 > 20, 'tirage trop pauvre : ' + [ouvertes, sansQ, reduites, lev1]);
  // témoin : le code d'avant sur les MÊMES états (sa copie dans banc-fixtures/sans-n62.js) — la porte VOIT le défaut
  let fermeSans = 0, levChange = 0, n0 = 0;
  if (!process.env.BANC_ROOT) {
    const old07 = require('./banc-fixtures/sans-n62.js')(s07, 'js/07-v90-mode-bunker-sos.js'), oldInv = need(old07, 'manuInvert'), tire2 = tirage(2062);
    for (let i = 0; i < 2000; i++) {
      const W = tire2(), p = W.cible; W.run(oldInv); W.run("manuInvert('BTC/USDT')"); const np = ouverte(W, 'BTC/USDT');
      if (!np) fermeSans++; else if (np !== p) { n0++; if (Math.abs(np.totalExposure / np.stakeUsdt - p.totalExposure / p.stakeUsdt) > 0.005) levChange++; }
    }
    assert.ok(fermeSans > 20, 'témoin : le code d\'avant devrait fermer sans rouvrir sur ces états (' + fermeSans + ')');
  }
  console.log('     (après : ' + ouvertes + ' rouvertes comme annoncé, ' + reduites + ' avec une mise réduite dite, ' + lev1 + ' avec un levier changé dit, ' + sansQ + ' rien fermé · avant, mêmes états : ' + fermeSans + ' fermées SANS réouverture, ' + levChange + ' rouvertes avec un autre levier)');
});

T('G · garde : manuInvert ← un onclick (07) et 08 flipPosition seulement ; _inv… ← manuInvert seulement ; fichiers de la décision, 08 et 16 au texte de 2361fbb', () => {
  const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
  ['js/native-bridge.js', 'guardian-core.js', 'guardian-embed.js', 'aura-guardian.html'].forEach(f => { if (fs.existsSync(path.join(ROOT, f)) && !files.includes(f)) files.push(f); });
  const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const appelants = (re) => { const out = []; files.map(f => [f, rd(f)]).concat([['HTML (en ligne)', inline]]).forEach(([f, s]) => {
    const fns = [...s.matchAll(/\nfunction ([\w$]+)\s*\(/g)].map(m => [m.index, m[1]]);
    for (const m of s.matchAll(re)) { const line = s.slice(s.lastIndexOf('\n', m.index) + 1, s.indexOf('\n', m.index)); if (/^\s*\/\//.test(line) || /function\s+$/.test(s.slice(Math.max(0, m.index - 12), m.index))) continue;
      const before = fns.filter(x => x[0] < m.index).pop(); out.push(f + ':' + (before ? before[1] : '(haut du fichier)') + (/onclick="manuInvert\(/.test(line) ? '(onclick)' : '')); } }); return [...new Set(out)].sort(); };
  assert.deepStrictEqual(appelants(/\bmanuInvert\s*\(/g).filter(x => !/:manuInvert$/.test(x)), ['js/07-v90-mode-bunker-sos.js:renderActionsGrid(onclick)', 'js/08-learning-history-render.js:flipPosition'].sort());
  if (NOUVEAU) {
    const inv = appelants(/\b_inv(?:Avec|Emprunt|Passe|Choix|Apres|Plan|Question)\s*\(/g).map(x => x.split(':')[1]);
    assert.deepStrictEqual([...new Set(inv)].sort(), ['_invApres', '_invChoix', '_invPasse', '_invPlan', 'manuInvert'].sort(), 'appelants des _inv… : ' + inv);
  }
  const H = { 'js/02-state-init.js': '5b82fc4d014f1cb4', 'js/03-per-pair-position-buttons-controls-buid.js': '117f962efbeb4f37', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js': '56365f1615101466',
    'js/08-learning-history-render.js': 'e5b53d1146fba1b1', 'js/09c-auto-open.js': 'cb981dcbb9806d73', 'js/09j-helpers.js': '469be1c86f4a9337', 'js/10f-resolveur-cycle.js': '9935b3138d2a97b0',
    'js/15-voix-tendance.js': '9757929e4b295254', 'js/15b-tendance-reelle.js': '08582a20cd8f495a', 'js/16-fiscal.js': '18d61b55137bc8f3' };
  Object.keys(H).forEach(f => assert.strictEqual(h16(require('./banc-fixtures/sans-n103.js')(require('./banc-fixtures/sans-n86d.js')(require('./banc-fixtures/sans-n105.js')(require('./banc-fixtures/sans-n106.js')(require('./banc-fixtures/sans-n80.js')(require('./banc-fixtures/sans-n108.js')(require('./banc-fixtures/sans-n109.js')(require('./banc-fixtures/sans-n94.js')(rd(f), f), f), f), f), f), f), f), f)), H[f], f + ' a changé'));   // [GO N° 105 · 15/11/2026] hors go n° 105 (08, 09b2 : bornes de l'école, banc-n105.js)   // [GO N° 86D · 15/11/2026] hors go n° 86d (03, 08 : champs de saisie TP / SL, banc-n86d.js)   // [GO N° 103 · 15/11/2026] hors go n° 103 (02, toast arrondi : banc-n103.js)   // [GO N° 106 · 15/11/2026] hors go n° 106 (08, 09b2 : amplitude de l'école, banc-n106.js)   // [GO N° 80 · 15/11/2026] hors go n° 80 (15b : liquidation de la poche au prix de la liquidation, banc-n80.js) · [GO N° 108 · 15/11/2026] hors go n° 108 (15b : liquidation propre de l'EV relue sur les bougies 1 h, banc-fixtures/sans-n108.js)   // [GO N° 109 · 20/11/2026] hors go n° 109 (03 : note prouvée, banc-fixtures/sans-n109.js)
});

T('F · garde : banc-fixtures/n62-retours.json redonne le 07 d\'avant au caractère près (empreinte du commit 2361fbb)', () => {
  if (process.env.BANC_ROOT) return;
  const A = { 'js/07-v90-mode-bunker-sos.js': '24f40537d2a36612' };
  const sans = require('./banc-fixtures/sans-n62.js');
  Object.keys(A).forEach(f => { const s = require('./banc-fixtures/sans-n109.js')(require('./banc-fixtures/sans-n94.js')(rd(f), f), f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sans(s, f)), A[f], f + ' : autre chose a bougé'); });   // [GO N° 109 · 20/11/2026] hors go n° 109 (03 : note prouvée, banc-fixtures/sans-n109.js)
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
