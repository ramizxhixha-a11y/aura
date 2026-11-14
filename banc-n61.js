// banc-n61.js — [GO N° 61 · 15/11/2026] les parties MANUELLES de n° 61 et n° 87 (ETAT-AURA8.md, registre G1 / G2).
// Chaque essai fait tourner le VRAI texte de l'app en vm (02, 03, 07, 09j) et ÉCHOUE sur le code d'avant
//   BANC_ROOT=<copie du commit 918ae59> node banc-n61.js        (sauf les gardes B et F, marquées « garde »)
//   N1  VRAI openPosition, l'EV comme au pont du 15/11 00:26 (11 positions de la voix, 1 055,89 $ engagés, 1 115,33 $ au trading, sans levier) :
//       200 $ à la main sur EUR/USDT s'ouvrent (avant : « Capital max atteint · $59 libre », plafond = trading − engagés, les mises comptées deux fois)
//   N2  VRAI manuInvert (07) : 3 positions à la main, la 1re (490 $) inversée → rouverte à 490 $ dans l'autre sens (avant : « fermé, mais … non rouvert »)
//   N3  VRAI _openProposedPosition (03, panneau de la paire) : même état que N1, 200 $ s'ouvrent ; refus au-delà du trading, message « (trading) »
//   N4  VRAI applyBotSuggestion (02, « ✓ Appliquer ») : même état, suggestion de 150 $ → 150 $ ouverts (avant : 17 $ = ⌊(trading − engagés) × 0,3⌋)
//   N5  09j getCapitalSummary : libre = caisse + trading ; engagé et maximum inchangés
//   P   propriété (2 000 états tirés) : validateManualExposure = validateTotalExposure, sauf la phase 5 sans levier (plafond = le trading) ;
//       jamais plus stricte ; avec un emprunt du levier, réponse identique
//   C   appels : validateManualExposure seulement depuis 02 openPosition, 03 _openProposedPosition, 07 manuInvert ; `.free` de getCapitalSummary
//       seulement dans 02 applyBotSuggestion et 03 (panneau) ; applyBotSuggestion seulement depuis un bouton (onclick, 07)
//   B   garde : ce que le BOT lit est au texte d'avant (02 estimateStakes, 09j validateTotalExposure / validateInvestmentCapProvisioned, 09c, 10f,
//       15, 15b) et, sur l'état de N1, le bot voit toujours le plafond d'avant (59,44 $) — la partie bot de n° 61 reste au registre (porte du 20/10)
//   F   garde : banc-fixtures/n61-retours.json redonne les 4 fichiers d'avant au caractère près (empreintes du commit 918ae59)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
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
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s9j = rd('js/09j-helpers.js'),
      html = rd('AURA8_v118.html');

// ─── Le monde : un portefeuille à plat (EV), VRAIES fonctions d'argent (même harnais que banc-nettoyage-argent.js) ───
const FEE = { takerRate: 0.001, makerRate: 0.001, slippage: 0.0003, fundingRate: 0 };
let TICK = Date.UTC(2026, 10, 15, 0, 0, 0);
class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [TICK])); } static now() { return ++TICK; } }
const F02 = ['_computePortfolio', '_computePortfolioSans', '_tradingCapitalBase', 'syncLeverageReserve', 'applyAutoLeverageBorrow', 'ensureLeverageCoverForTrade', 'borrowLeverage',
  'repayLeverage', 'recordFees', 'releaseTradeReserve', '_manOpenWarnings', '_manConsigneOf', 'openPosition', 'closePosition', 'applyBotSuggestion',
  'fmt$', 'fmt$2', '_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto', '_feesDueOf'];
const PAIRES = ['ADA/USDT', 'AVAX/USDT', 'BNB/USDT', 'BTC/USDT', 'DOGE/USDT', 'DOT/USDT', 'ETH/USDT', 'LINK/USDT', 'PEPE/USDT', 'SOL/USDT', 'XRP/USDT', 'EUR/USDT'];
function world(o) {
  o = o || {};
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
    console: { log() {}, warn() {}, error() {} }, showToast: (m, d, lvl) => seen.toasts.push([String(m), lvl || 'info']), rndHash: () => 'h', nowStr: () => '00:26:00',
    confirm: () => true, navigator: {}, document: { getElementById: el }, els,
    recordTradeForHeatmap() {}, learnFromOutcome() {}, emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {}, checkPnlAlerts() {}, checkBadges() {},
    _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderChain() {}, renderHome() {}, renderPositions() {}, saveState() {}, renderActionsGrid() {},
    saveFeeRecord() {}, addAnnualNetRealised() {}, _fiscOnClose: () => ({ movedUsd: 0, regime: 'spec', gainEur: 0 }), renderSortiePartiSection() {}, renderPyramideSection() {},
    detectMarketRegime: () => 'calm', _calcBotTpSl: () => null, lmsrP: () => 0.5, notifTradeOpen() {}, notifTradeClose() {}, tgOnTrade() {}, disableFullPowerMode() {},
    _modeBehind: () => false, _schoolBehind: () => false, _walletKey: m => m || 'paperReal', updateStreakBadge() {}, _p5PreActionSave() {}, _autoSnapshotBeforeLeverage() {},
    _stakeFloor: () => 2, _stakeRound: x => Math.round((Number(x) || 0) * 10) / 10 };
  c._activeWallet = () => S;
  c.window = c; vm.createContext(c);
  const src = F02.map(n => fnSrc(s02, n)).filter(Boolean);
  src.push('var _leverageMarginCheck = ' + between(s02, 'window._leverageMarginCheck = function _leverageMarginCheck() {', '\n};\n').replace('window._leverageMarginCheck = ', '') + '\n};');
  src.push(need(s9j, 'validateTotalExposure'), need(s9j, 'validateInvestmentCapProvisioned'), need(s9j, 'getCapitalSummary'), fnSrc(s9j, 'validateManualExposure') || '');
  src.push(need(s07, 'manuInvert'), need(s03, '_openProposedPosition'));
  vm.runInContext(src.join('\n') + '\nvar S = this.S;', c);
  return { c, S, seen, els, run: code => vm.runInContext(code, c) };
}
// l'EV du pont (15/11 00:26) : 11 positions de la voix à 95,99 $ (1 055,89 $), 1 115,33 $ au trading, caisse 0, sans levier ; réserve de levier recalculée
function evDuPont() {
  const W = world({ trading: 1115.33 });
  PAIRES.slice(0, 11).forEach((p, i) => W.S.openPositions.push({ id: 'v' + i, pair: p, side: i === 8 ? 'long' : 'short', entryPrice: 100, stakeUsdt: 95.99, totalExposure: 95.99,
    levBorrowed: 0, auto: false, _voix: 'tendance', openedAt: 1, entryTs: 1 }));
  W.run('syncLeverageReserve()');
  return W;
}
const ouverte = (W, pair) => W.S.openPositions.find(p => p.pair === pair) || null;

console.log('▶ banc-n61 · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

T('N1 · VRAI openPosition, l\'EV du pont du 15/11 (11 positions, 1 055,89 $ engagés, 1 115,33 $ au trading) : 200 $ à la main sur EUR/USDT s\'ouvrent (avant : « Capital max atteint · $59 libre »)', () => {
  const W = evDuPont(); W.S.pairStates['EUR/USDT'].stake = 200;
  const np = W.run("openPosition('EUR/USDT', 'long')");
  assert.ok(np && ouverte(W, 'EUR/USDT'), 'refusée : ' + JSON.stringify(W.seen.toasts));
  near(ouverte(W, 'EUR/USDT').stakeUsdt, 200, 1e-12, 'mise'); near(W.S.tradingAccount, 915.33, 1e-9, 'trading débité de la mise, une fois');
  assert.ok(!W.seen.toasts.some(t => /Capital max/.test(t[0])), JSON.stringify(W.seen.toasts));
  // au-delà du trading : toujours refusé (le trading est le plafond, sans levier)
  const W2 = evDuPont(); W2.S.pairStates['EUR/USDT'].stake = 1115.34;
  assert.strictEqual(W2.run("openPosition('EUR/USDT', 'long')"), null); assert.strictEqual(ouverte(W2, 'EUR/USDT'), null); near(W2.S.tradingAccount, 1115.33, 1e-12);
});

T('N2 · VRAI manuInvert : 3 positions à la main (490 $, 300 $, 300 $), 100 $ au trading — la 1re inversée est ROUVERTE à 490 $ en SHORT (avant : « fermé, mais SHORT non rouvert »)', () => {
  const W = world({ trading: 100 });
  [['pA', 'BTC/USDT', 490], ['pB', 'ETH/USDT', 300], ['pC', 'SOL/USDT', 300]].forEach(([id, pair, st]) =>
    W.S.openPositions.push({ id, pair, side: 'long', entryPrice: 100, stakeUsdt: st, totalExposure: st, levBorrowed: 0, auto: false, openedAt: 1, entryTs: 1 }));
  W.run('syncLeverageReserve()');
  W.run("manuInvert('BTC/USDT')");
  const np = ouverte(W, 'BTC/USDT');
  assert.ok(np && np.side === 'short', JSON.stringify(W.seen.toasts)); near(np.stakeUsdt, 490, 1e-12, 'mise rouverte');
  assert.ok(W.seen.toasts.some(t => /inversé → SHORT · mise \$490/.test(t[0])), JSON.stringify(W.seen.toasts));
  assert.ok(W.S.tradingAccount >= 0, 'jamais sous zéro');
});

T('N3 · VRAI _openProposedPosition (03, panneau de la paire) : même EV, 200 $ s\'ouvrent ; 1 200 $ refusés avec « (trading) » et le plafond = le trading', () => {
  const W = evDuPont(); const k = 'EUR_USDT';
  W.els['pinput_stake_' + k] = { value: '200' }; W.els['pinput_lev_' + k] = { dataset: { val: '1' } };
  W.run("_openProposedPosition('EUR/USDT', 'long')");
  assert.ok(ouverte(W, 'EUR/USDT'), JSON.stringify(W.seen.toasts)); near(ouverte(W, 'EUR/USDT').stakeUsdt, 200, 1e-12);
  assert.strictEqual(W.S.pairStates['EUR/USDT'].stake, 30, 'mise de la paire rendue');
  const W2 = evDuPont(); W2.els['pinput_stake_' + k] = { value: '1200' }; W2.els['pinput_lev_' + k] = { dataset: { val: '1' } };
  W2.run("_openProposedPosition('EUR/USDT', 'long')");
  assert.strictEqual(ouverte(W2, 'EUR/USDT'), null);
  assert.ok(W2.seen.toasts.some(t => /Règle sizing · max investissable \$1,115 \(trading\)$/.test(t[0])), JSON.stringify(W2.seen.toasts));
});

T('N4 · VRAI applyBotSuggestion (« ✓ Appliquer ») : même EV, suggestion de 150 $ → 150 $ ouverts (avant : 17 $ = ⌊(1 115,33 − 1 055,89) × 0,3⌋)', () => {
  const W = evDuPont();
  W.run("applyBotSuggestion('EUR/USDT', 'long', 150)");
  assert.ok(ouverte(W, 'EUR/USDT'), JSON.stringify(W.seen.toasts)); near(ouverte(W, 'EUR/USDT').stakeUsdt, 150, 1e-12, 'mise');
  assert.ok(W.seen.toasts.some(t => /Suggestion appliquée · EUR\/USDT ↑ LONG · \$150$/.test(t[0])), JSON.stringify(W.seen.toasts));
  // plafond 30 % du libre : 1 115,33 × 0,3 = 334 $
  const W2 = evDuPont(); W2.run("applyBotSuggestion('EUR/USDT', 'long', 900)"); near(ouverte(W2, 'EUR/USDT').stakeUsdt, 334, 1e-12, '30 % du libre');
});

T('N5 · 09j getCapitalSummary : libre = caisse + trading (avant : − trades en cours, comptés deux fois) ; engagé, maximum et % inchangés', () => {
  const W = evDuPont(); W.S.cashAccount = 12.5;
  W.S.openPositions.push({ id: 'L', pair: 'EUR/USDT', side: 'long', entryPrice: 100, stakeUsdt: 50, totalExposure: 150, levBorrowed: 100, auto: false });   // une position à levier ×3
  W.run('syncLeverageReserve()');
  const r = W.run('getCapitalSummary()');
  near(r.free, 1127.83, 1e-9, 'libre'); near(r.staked, 1055.89 + 150, 1e-9, 'engagé = exposition'); near(r.maxAllowed, W.S.leverageReserve, 0, 'maximum = la réserve du levier');
  near(r.usedPct, (1055.89 + 150) / (1115.33 + 1055.89 + 150) * 100, 1e-9, '% du capital trading');
});

T('P · propriété, 2 000 états tirés : validateManualExposure = validateTotalExposure sauf la phase 5 SANS levier (plafond = trading) ; jamais plus stricte ; avec emprunt, identique', () => {
  const W = world(); assert.ok(W.run('typeof validateManualExposure') === 'function', 'validateManualExposure absente');
  let seed = 61; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let agit = 0, levier = 0;
  for (let i = 0; i < 2000; i++) {
    const n = Math.floor(rnd() * 6), S = W.S;
    S.openPositions = Array.from({ length: n }, (_, j) => { const st = Math.round(rnd() * 600 * 100) / 100, lv = rnd() < 0.2 ? 1 + Math.floor(rnd() * 4) : 1;
      return { id: 'x' + j, pair: 'P' + j, stakeUsdt: st, totalExposure: st * lv }; });
    S.tradingAccount = Math.round(rnd() * 2000 * 100) / 100; S.cashAccount = rnd() < 0.3 ? Math.round(rnd() * 300) : 0;
    S.leverageBorrowed = rnd() < 0.25 ? Math.round(rnd() * 3000) : 0; S.leverageReserve = rnd() < 0.2 ? Math.round(rnd() * 500) : Math.round(rnd() * 30000);
    const st = Math.round(rnd() * 1500 * 100) / 100, lb = rnd() < 0.2 ? st * Math.floor(rnd() * 3) : 0;
    const a = W.run('validateTotalExposure(' + st + ', ' + lb + ')'), b = W.run('validateManualExposure(' + st + ', ' + lb + ')');
    if (a.ok) { assert.ok(b.ok, 'plus stricte : ' + i); }
    if (a.ok || !a.phase5 || a.phase5Mode !== 'no_leverage') { assert.deepStrictEqual(b, a, 'hors phase 5 sans levier : identique (' + i + ')'); if (S.leverageBorrowed > 0) levier++; continue; }
    agit++;
    assert.strictEqual(b.ok, st <= S.tradingAccount, 'plafond = trading (' + i + ')');
    if (b.ok) near(b.available, a.maxAllowed - a.alreadyStaked, 1e-9, 'disponible comme un accord de validateTotalExposure');
    else { near(b.available, S.tradingAccount, 1e-12, 'disponible = trading'); assert.ok(b.available >= a.available, 'jamais moins de disponible'); }
  }
  assert.ok(agit > 50 && levier > 50, 'tirage trop pauvre : ' + agit + ' / ' + levier);
});

T('C · appels : validateManualExposure ← 02 openPosition, 03 _openProposedPosition, 07 manuInvert seulement ; `.free` ← 02 applyBotSuggestion et 03 seulement ; applyBotSuggestion ← un onclick (07) seulement', () => {
  const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
  ['js/native-bridge.js', 'guardian-core.js', 'guardian-embed.js', 'aura-guardian.html'].forEach(f => { if (fs.existsSync(path.join(ROOT, f)) && !files.includes(f)) files.push(f); });
  const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  // qui appelle (fonction englobante de chaque appel)
  const appelants = (re) => { const out = []; files.map(f => [f, rd(f)]).concat([['HTML (en ligne)', inline]]).forEach(([f, s]) => {
    const fns = [...s.matchAll(/\nfunction ([\w$]+)\s*\(/g)].map(m => [m.index, m[1]]);
    for (const m of s.matchAll(re)) { const line = s.slice(s.lastIndexOf('\n', m.index) + 1, s.indexOf('\n', m.index)); if (/^\s*\/\//.test(line)) continue;
      const before = fns.filter(x => x[0] < m.index).pop(); out.push(f + ':' + (before ? before[1] : '(haut du fichier)')); } }); return [...new Set(out)].sort(); };
  assert.deepStrictEqual(appelants(/validateManualExposure\s*\(/g), ['js/02-state-init.js:openPosition', 'js/03-per-pair-position-buttons-controls-buid.js:_openProposedPosition',
    'js/07-v90-mode-bunker-sos.js:manuInvert', 'js/09j-helpers.js:validateManualExposure'].sort());
  // lecteurs de `.free` du résultat de getCapitalSummary : la fonction englobante de chaque appel, puis `getCapitalSummary().free` ou `X.free` avec X = getCapitalSummary()
  const libre = [];
  appelants(/getCapitalSummary\(\)/g).forEach(fx => { const [f, n] = fx.split(':'); if (f === 'js/09j-helpers.js' && n === 'getCapitalSummary') return;
    const body = need(f === 'HTML (en ligne)' ? inline : rd(f), n), vars = [...body.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:typeof getCapitalSummary === 'function' \? )?getCapitalSummary\(\)/g)].map(m => m[1]);
    if (/getCapitalSummary\(\)\.free/.test(body) || vars.some(v => new RegExp('\\b' + v.replace(/\$/g, '\\$') + '\\.free\\b').test(body))) libre.push(fx); });
  assert.deepStrictEqual(libre.sort(), ['js/02-state-init.js:applyBotSuggestion', 'js/03-per-pair-position-buttons-controls-buid.js:updatePairAnalysisPanels'], 'lecteurs de .free : ' + libre);
  const ab = appelants(/applyBotSuggestion\s*\(/g).filter(x => !/:applyBotSuggestion$/.test(x));
  assert.ok(ab.length === 1 && /^js\/07-v90-mode-bunker-sos\.js:/.test(ab[0]), 'appelants : ' + ab);
  assert.ok(/onclick="applyBotSuggestion\(/.test(rd('js/07-v90-mode-bunker-sos.js')) && (rd('js/07-v90-mode-bunker-sos.js').match(/applyBotSuggestion\(/g) || []).length === 1, 'seulement un onclick');
});

T('B · garde : ce que le BOT lit est au texte d\'avant (918ae59) et, sur l\'EV du pont, le bot voit toujours le plafond d\'avant — partie bot de n° 61 au registre', () => {
  const E = { estimateStakes: [s02, '191de2e4cf018d53'], validateTotalExposure: [s9j, '9ff782139655cb22'], validateInvestmentCapProvisioned: [s9j, '3229d70744efd7a8'], applyBotSuggestion: [s02, '3fb037063c1325e2'] };
  Object.keys(E).forEach(n => assert.strictEqual(h16(need(E[n][0], n)), E[n][1], n + ' a changé'));
  const FH = { 'js/09c-auto-open.js': 'cb981dcbb9806d73', 'js/10f-resolveur-cycle.js': '2c7f1bbbb66741a0', 'js/15-voix-tendance.js': '9757929e4b295254', 'js/15b-tendance-reelle.js': '08582a20cd8f495a' };
  Object.keys(FH).forEach(f => assert.strictEqual(h16(rd(f)), FH[f], f + ' a changé'));
  const W = evDuPont(); const p5 = W.run('validateInvestmentCapProvisioned(334)'); near(p5.cap, 1115.33 - 1055.89, 1e-9, 'plafond du bot'); assert.strictEqual(p5.ok, false);
  const v = W.run('validateTotalExposure(334, 0, 0.5)'); assert.strictEqual(v.ok, false); assert.strictEqual(v.phase5, true);
});

T('F · garde : banc-fixtures/n61-retours.json redonne les 4 fichiers d\'avant au caractère près (empreintes du commit 918ae59)', () => {
  if (process.env.BANC_ROOT) return;   // code d'avant : rien à retirer
  const sans = require('./banc-fixtures/sans-n61.js');
  const A = { 'js/02-state-init.js': 'cf8eae00ce2618de', 'js/03-per-pair-position-buttons-controls-buid.js': 'f439468ae00df1a0', 'js/07-v90-mode-bunker-sos.js': '06cae2cfa7a41d43', 'js/09j-helpers.js': '9f10f52d5bd6268f' };
  Object.keys(A).forEach(f => { const s = rd(f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sans(s, f)), A[f], f + ' : autre chose a bougé'); });
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
