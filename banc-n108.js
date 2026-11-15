// banc-n108.js — [GO N° 108 · 15/11/2026] la liquidation PROPRE de l'EV relue sur les bougies 1 h des heures de sommeil (registre G2 n° 108)
// Le défaut (15b sync (c), e09d72a) : un SHORT de la voix dont le prix a doublé depuis SON entrée n'était fermé qu'au prix réel FRAIS du moment ; une
// mèche de la nuit au-delà de 2 × l'entrée de l'EV, retombée au réveil, n'était jamais comptée. La poche (js/15 liqHist) relit ses plus hauts 1 h,
// mais son entrée est plus haute que celle de l'EV (backup 15/11 : BTC 80 104 contre 71 652) : elle ne la voit pas pour l'EV.
// Le remède (15b seul) : même règle que la poche — bougies 1 h depuis l'heure qui suit l'entrée de l'EV, depuis le dernier contrôle (suivi[paire].chk,
// sauvé), 1 fois par heure et par SHORT ; mèche ≥ 2 × l'entrée → fermée AU PRIX DE LA LIQUIDATION (pos._forcedExitPx, comme go n° 80), EV en pause et
// MANU compris ; pas rouverte avant le lundi qui suit la mèche.
// Chaque essai fait tourner le VRAI texte de l'app en vm : 02 (openPosition, closePosition, recordFees, _posLatent…) et 15b entier ; Binance = un faux
// fetch qui rend des bougies 1 h comme l'API (startTime, limit 1 000, bougie en cours comprise) et compte les appels.
// ÉCHOUE sur le code d'avant      BANC_ROOT=<copie du commit e09d72a> node banc-n108.js       (L1-L4, L6-L10, L12b, L12c)
//   L1  le défaut : nuit de 9 h, prix périmé, une bougie de la nuit touche 2,06 × l'entrée → fermée à 2 × l'entrée (= jumeau), −100 % de la mise,
//       💥 au journal (bougie 1 h datée), réalisé compté, pas rouverte cette semaine, aucun prix imposé laissé
//   L2  prix frais revenu (1,1 × l'entrée) : fermée au prix de la liquidation, pas au prix du moment
//   L3  EV en pause, MANU : fermée quand même ; rien ne s'ouvre
//   L4  sans mèche (plus haut 1,99 × l'entrée) : rien de fermé ; contrôle 1 fois par heure et par SHORT (LONG et ta position jamais), repris au dernier
//       contrôle (la bougie en cours relue) ; la progression est sauvée (suivi[paire].chk) et reprise après un rechargement
//   L5  l'heure d'entrée et les heures d'avant ne sont pas lues (comme la poche) : leur plus haut peut dater d'avant l'entrée
//   L6  sommeil de plus de 1 000 heures : pages enchaînées, mèche de l'heure 1 500 trouvée
//   L7  réseau en panne (rejet, HTTP 500) : rien ne change (état = code d'avant au caractère près), erreur dite, réessai l'heure suivante seulement
//   L8  mèche d'une semaine passée (lundi suivant déjà passé) : en AUTO, rouverte au prix du moment si la poche la tient et a décidé cette semaine ;
//       mèche de cette semaine : pas rouverte
//   L9  fermeture refusée : aucun prix imposé laissé ; réessayée au battement suivant (fermée alors à 2 × l'entrée)
//   L10 réponse arrivée trop tard : position fermée entre-temps (ton ✕), sauvegarde restaurée, ou contrôle abandonné après 5 min → rien n'est écrit
//   L11 la poche liquide aussi (2 × son entrée, au-delà) : une seule fermeture, −100 % de la mise
//   L12 témoin : (a) sans réseau, 9 étapes = code d'avant au caractère près ; (b) bougies sans mèche : idem hormis suivi[paire].chk ; (c) le banc VOIT
//       la différence sur une mèche (règle 10)
//   L13 garde : 15b ne change que dans l'en-tête, les constantes, les fonctions de relecture, le bloc (c0), l'appel liqCheck et l'export ; le témoin
//       banc-fixtures/tendance-reelle-avant-n108.js = 15b de e09d72a (empreinte) ; banc-fixtures/sans-n108.js le redonne au caractère près
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
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
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise(r => setImmediate(r)); };
const s02 = rd('js/02-state-init.js');
const s15b = rd('js/15b-tendance-reelle.js');
const AVANT15b = fs.readFileSync(path.join(__dirname, 'banc-fixtures/tendance-reelle-avant-n108.js'), 'utf8');

// ─── le monde (harnais de banc-n80.js) : un mode EV à plat, VRAIS 02 openPosition / closePosition / recordFees…, un faux Binance ───
const FEE = { takerRate: 0.001, makerRate: 0.0008, slippage: 0.0003, fundingRate: 0 };
const PAIRS11 = ['ADA', 'AVAX', 'BNB', 'BTC', 'DOGE', 'DOT', 'ETH', 'LINK', 'PEPE', 'SOL', 'XRP'].map(x => x + '/USDT');
const HOUR = 3600000, DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 10, 12, 19, 22, 50);   // jeudi 12/11/2026 19:22:50 UTC (heure des 11 ouvertures de la voix)
const H0 = Math.ceil(T0 / HOUR) * HOUR;          // 20:00 UTC : première heure relue
function world(o) {
  o = o || {};
  const seen = { toasts: [], judges: 0, saves: 0, calls: [] };
  let clock = o.t || T0;
  class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } static now() { return clock; } }
  const S = { tradingMode: 'paperReal', botAutoMode: o.auto !== false, cashAccount: 6.58, tradingAccount: 1155.91, openPositions: [],
    pnlHistory: [1000], chainLog: [], cashLog: [], totalTrades: 0, winTrades: 0, leverage: 0, leverageReserve: 0, leverageBorrowed: 0, leverageMaxMult: 10,
    _autoLevBorrowed: 0, antiNegReserve: 0, antiNegReserveLog: [], profitSplitCaissePct: 0, feeConfig: Object.assign({}, FEE), taxConfig: { region: 'BE' },
    paperRealStats: {}, agents: [], botFleet: {}, currentPage: 0,
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {}, walletStore: { paperReal: { running: o.running !== false } } };
  PAIRS11.concat(['EUR/USDT']).forEach((p, i) => { S.pairStates[p] = { price: 10 + i, stake: 30, pairLeverage: 1, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const ages = {};
  // le faux Binance : bougies 1 h [o, open, high, low, close, …] de chaque heure ≤ maintenant ; plus haut = base × 1,05, sauf les mèches posées
  const B = { base: {}, meche: {}, panne: null, gele: false, enAttente: [] };
  PAIRS11.forEach((p, i) => { B.base[p] = 10 + i; });
  function klines(sym, start, limit) {
    const pair = sym.replace(/USDT$/, '/USDT'), base = B.base[pair], out = [];
    for (let h = Math.ceil(start / HOUR) * HOUR; h <= Math.floor(clock / HOUR) * HOUR && out.length < limit; h += HOUR) {
      const m = (B.meche[pair] || {})[h];
      out.push([h, String(base), String(m != null ? m : base * 1.05), String(base * 0.95), String(base), '1', h + HOUR - 1, '1', 1, '1', '1', '0']);
    }
    return out;
  }
  function fetch(url) {
    seen.calls.push(url);
    if (B.gele) return new Promise(res => B.enAttente.push(res));
    if (B.panne === 'rejet') return Promise.reject(new Error('Failed to fetch'));
    if (B.panne === 500) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
    const m = /^https:\/\/api\.binance\.com\/api\/v3\/klines\?symbol=([A-Z]+)&interval=1h&startTime=(\d+)&limit=(\d+)$/.exec(url);
    if (!m) return Promise.reject(new Error('url inattendue ' + url));
    const data = klines(m[1], Number(m[2]), Number(m[3]));
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  }
  const c = { S, PAIRS: Object.fromEntries(PAIRS11.concat(['EUR/USDT']).map(p => [p, { dec: 4 }])), Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN, parseFloat, Error, Promise,
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
  if (o.net !== false) c.fetch = fetch;
  c.window = c; c._walletFor = () => ({ openPositions: S.openPositions, pairStates: S.pairStates, tradingAccount: S.tradingAccount });
  c._isModeRunning = () => !!S.walletStore.paperReal.running; c.saveState = () => { seen.saves++; };
  vm.createContext(c); require('./banc-fixtures/px-vm.js')(c, ROOT);
  vm.runInContext('function validateManualExposure(a, b) { return validateTotalExposure(a, b); }', c);
  const names = ['_computePortfolio', '_computePortfolioSans', 'repayLeverage', 'releaseTradeReserve', 'recordFees', '_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto'].filter(n => has(s02, n));
  vm.runInContext(names.map(n => fnSrc(s02, n)).join('\n') + '\n' + fnSrc(s02, 'openPosition') + '\n' + fnSrc(s02, 'closePosition') + '\nvar S = this.S;', c);
  vm.runInContext(o.src15b || s15b, c);
  return { c, S, seen, ages, B, run: code => vm.runInContext(code, c), tick: (ms) => { clock += ms; }, now: () => clock,
    sync: async () => { vm.runInContext('_tlr.sync()', c); await flush(); } };
}
const mondayOf = t => 4 * DAY + Math.floor((t - 4 * DAY) / (7 * DAY)) * 7 * DAY;
function poche(W, sides, x0) {   // la poche de js/15 (S.tendance) : une position par paire, entrée x0 (au-dessus de l'EV), la semaine en cours décidée
  const pos = {}, w = mondayOf(W.now());
  Object.keys(sides).forEach(p => { pos[p] = { side: sides[p], w: 0, pW: 1, pL: 1, x0: x0 || 40, t0: 5, n: 11, cIn: 0.0013, liqChk: 0 }; });
  const dec = Object.fromEntries(Object.keys(sides).map(p => [p, { w, s: sides[p] === 'long' ? 1 : -1, why: 'tenue' }]));
  W.S.tendance = { v: 1, depuis: 1, pos, dec, hist: [], tot: { net: 0, netL: 0, n: 0, win: 0, liq: 0 } };
}
const all11 = (side) => Object.fromEntries(PAIRS11.map(p => [p, p === 'PEPE/USDT' ? 'long' : side]));
const voix = W => W.S.openPositions.filter(p => p._voix === 'tendance');
const lastTrade = (W, pair) => W.S.pairStates[pair].trades.filter(x => x.type === 'tendance').slice(-1)[0];
const klCalls = (W, sym) => W.seen.calls.filter(u => !sym || u.indexOf('symbol=' + sym + '&') > 0);
const startOf = u => Number(/startTime=(\d+)/.exec(u)[1]);
// la voix ouverte (12/11 19:22:50, 11 positions, prix 10 + i), plus ta position EUR/USDT à la main ; ps.price = entrée
async function ouvert(o) {
  const W = world(o); poche(W, all11('short'));
  W.run("openPosition('EUR/USDT', 'short', {})");
  const m = W.S.botAutoMode; W.S.botAutoMode = true; W.run('_tlr.sync()'); W.S.botAutoMode = m;
  assert.strictEqual(voix(W).length, 11, '11 positions de la voix'); assert.strictEqual(W.S.openPositions.length, 12, '+ la tienne');
  await flush();
  return W;
}
// jumeau : la même position fermée par la voix au prix x (closePosition { voix }, ps.price = x) — l'argent et la ligne attendus
async function jumeau(o, pair, x) {
  const W = await ouvert(o); const pos = voix(W).find(p => p.pair === pair);
  W.S.pairStates[pair].price = x; W.run("closePosition('" + pos.id + "', false, { voix: true })");
  assert.ok(!voix(W).some(p => p.pair === pair), 'jumeau fermé');
  return { tr: lastTrade(W, pair), trading: W.S.tradingAccount, cash: W.S.cashAccount, fees: W.S.fees.totalTradingFees };
}
// la nuit : tablette endormie N heures (prix réel périmé, ps.price sauvegardé = p0), une mèche à l'heure hMeche (relative à H0) ; au réveil, prix px
async function nuit(W, pair, heures, hMeche, facteur, reveil) {
  const pos = voix(W).find(p => p.pair === pair), e = pos.entryPrice;
  W.B.meche[pair] = { [H0 + hMeche * HOUR]: e * facteur };
  W.tick(heures * HOUR); PAIRS11.forEach(p => { W.ages[p] = heures * HOUR; });
  if (reveil) { W.ages[pair] = reveil.age; W.S.pairStates[pair].price = reveil.px; }
  return { pos, e, o: H0 + hMeche * HOUR };
}

(async () => {
  console.log('▶ banc-n108 · token ' + ((rd('AURA8_v118.html').match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]));
  console.log('▶ L. Mèche de la nuit au-delà de 2 × l\'entrée de l\'EV → fermée au prix de la liquidation');

  await T('L1 · nuit de 9 h, prix périmé (ps.price sauvegardé 12,4), bougie de 03 h à 2,06 × l\'entrée : fermée à 2 × l\'entrée (= jumeau), −100 % de la mise, 💥 daté, réalisé compté, pas rouverte cette semaine, aucun prix imposé laissé', async () => {
    const W = await ouvert();
    const { pos, e, o } = await nuit(W, 'BTC/USDT', 9, 7, 2.06, null);
    W.S.pairStates['BTC/USDT'].price = 12.4;
    await W.sync();
    assert.ok(!voix(W).some(p => p.pair === 'BTC/USDT'), 'fermée (avant : toujours ouverte)');
    const tr = lastTrade(W, 'BTC/USDT'), J = await jumeau(undefined, 'BTC/USDT', 2 * e);
    assert.strictEqual(tr.price, 2 * e, 'prix de sortie = 2 × l\'entrée (' + tr.price + ')');
    near(tr.pnlUsdt, J.tr.pnlUsdt, 'résultat'); near(tr.pnlUsdt, -pos.stakeUsdt, 'perte = toute la mise');
    near(W.S.tradingAccount, J.trading, 'trading'); near(W.S.fees.totalTradingFees, J.fees, 'frais');
    near(W.S.tendance.reel.real, tr.pnlUsdt, 'réalisé de la voix');
    const j = W.S.chainLog.filter(x => x.icon === '💥' && /BTC\/USDT SHORT fermé \(liquidation : le prix a doublé depuis ton entrée — bougie 1 h du \d\d\/\d\d \d\d h\)/.test(x.desc));
    assert.strictEqual(j.length, 1, 'journal 💥 avec la bougie datée');
    const d = new Date(o), dd = x => String(x).padStart(2, '0');
    assert.ok(j[0].desc.indexOf(dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + ' ' + dd(d.getHours()) + ' h') > 0, 'date de la mèche');
    const at = W.S.tendance.reel.attente['BTC/USDT']; assert.ok(at && at.w === mondayOf(W.now()) && at.t0 === 5, 'pas rouverte cette semaine');
    W.ages['BTC/USDT'] = 1000; W.S.botAutoMode = true; await W.sync();
    assert.ok(!voix(W).some(p => p.pair === 'BTC/USDT'), 'pas rouverte (AUTO, la poche la tient)');
    assert.ok(!('_forcedExitPx' in pos), 'prix imposé consommé');
    assert.strictEqual(voix(W).length, 10, 'les 10 autres restent'); assert.ok(W.S.openPositions.some(p => p.pair === 'EUR/USDT'), 'ta position reste');
  });

  await T('L2 · prix frais revenu à 1,1 × l\'entrée, mèche à 2,02 × entre deux battements : fermée à 2 × l\'entrée, pas au prix du moment ; plus haut d\'exactement 2 × : liquidée', async () => {
    const W = await ouvert();
    const { e } = await nuit(W, 'ETH/USDT', 3, 1, 2.02, { age: 1000, px: 0 });
    W.S.pairStates['ETH/USDT'].price = 1.1 * 16; W.ages['ETH/USDT'] = 1000;
    await W.sync();
    const tr = lastTrade(W, 'ETH/USDT');
    assert.ok(tr && tr.price === 2 * e, 'au prix de la liquidation (' + (tr && tr.price) + ')');
    near(tr.pnlUsdt, -voix(await ouvert()).find(p => p.pair === 'ETH/USDT').stakeUsdt, '−100 %');
    // exactement 2 × l'entrée (la règle de la poche : ≥) : liquidée
    const W2 = await ouvert(); await nuit(W2, 'ETH/USDT', 3, 1, 2, null); await W2.sync();
    assert.strictEqual(lastTrade(W2, 'ETH/USDT') && lastTrade(W2, 'ETH/USDT').price, 32, 'plus haut = 2 × l\'entrée : liquidée');
  });

  await T('L3 · EV en pause et MANU : fermée quand même (2 × l\'entrée) ; rien ne s\'ouvre', async () => {
    const W = await ouvert({ auto: false });
    W.S.walletStore.paperReal.running = false;
    const { e } = await nuit(W, 'SOL/USDT', 9, 4, 2.5, null);
    const n0 = W.S.openPositions.length; await W.sync();
    assert.strictEqual(W.S.openPositions.length, n0 - 1, 'seule la liquidée part, rien ne s\'ouvre');
    assert.strictEqual(lastTrade(W, 'SOL/USDT').price, 2 * e);
  });

  await T('L4 · sans mèche (plus haut 1,99 × l\'entrée) : rien de fermé ; 1 contrôle / heure / SHORT (ni PEPE LONG, ni ta position) ; repris au dernier contrôle, la bougie en cours relue ; progression sauvée et reprise', async () => {
    const W = await ouvert();
    W.B.meche['DOT/USDT'] = { [H0 + 2 * HOUR]: 15 * 1.99 };
    W.tick(9 * HOUR + 10 * 60000); await W.sync();
    assert.strictEqual(voix(W).length, 11, 'rien de fermé');
    const c1 = W.seen.calls.slice();
    assert.strictEqual(c1.length, 10, '10 SHORT contrôlés (' + c1.length + ')');
    assert.ok(!c1.some(u => /PEPEUSDT|EURUSDT/.test(u)), 'ni le LONG ni ta position');
    assert.ok(c1.every(u => startOf(u) === H0), 'depuis l\'heure qui suit l\'entrée');
    const hNow = Math.floor(W.now() / HOUR) * HOUR;
    Object.values(W.S.tendance.reel.suivi).filter(s => !/pepe/.test(s.id)).forEach(s => assert.strictEqual(s.chk, hNow, 'chk = la bougie en cours'));
    assert.ok(!('chk' in W.S.tendance.reel.suivi['PEPE/USDT']), 'PEPE : pas de contrôle');
    W.tick(20000); await W.sync(); W.tick(40 * 60000); await W.sync();
    assert.strictEqual(W.seen.calls.length, 10, 'pas de nouvel appel dans l\'heure');
    W.tick(25 * 60000); await W.sync();
    assert.strictEqual(W.seen.calls.length, 20, 'un contrôle par heure');
    assert.ok(W.seen.calls.slice(10).every(u => startOf(u) === hNow), 'repris à la bougie relue (' + startOf(W.seen.calls[10]) + ')');
    // rechargement : un monde neuf avec l'état sauvé → reprend au dernier contrôle, pas à l'entrée
    const saved = JSON.parse(JSON.stringify(W.S.tendance));
    const W2 = await ouvert(); W2.S.tendance.reel.suivi = Object.fromEntries(Object.entries(saved.reel.suivi).map(([p, s]) => [p, Object.assign({}, s, { id: W2.S.tendance.reel.suivi[p].id })]));
    W2.tick(W.now() - W2.now()); await W2.sync();
    assert.ok(W2.seen.calls.length === 10 && W2.seen.calls.every(u => startOf(u) === Math.floor(W.now() / HOUR) * HOUR), 'après rechargement : depuis le dernier contrôle');
  });

  await T('L5 · l\'heure d\'entrée et celles d\'avant ne sont pas lues (comme la poche) : une mèche à 19 h ou 18 h UTC (entrée 19:22) ne ferme rien', async () => {
    const W = await ouvert();
    W.B.meche['BNB/USDT'] = { [H0 - HOUR]: 12 * 3, [H0 - 2 * HOUR]: 12 * 3 };
    W.tick(5 * HOUR); await W.sync();
    assert.ok(voix(W).some(p => p.pair === 'BNB/USDT'), 'gardée');
    // une réponse qui contiendrait l'heure d'entrée (Binance arrondit le début) : ignorée aussi
    const W2 = await ouvert(); W2.B.meche['BNB/USDT'] = { [H0 - HOUR]: 36 }; W2.tick(5 * HOUR);
    const f = W2.c.fetch; W2.c.fetch = (u) => f(u.replace(/startTime=\d+/, 'startTime=' + (H0 - HOUR)));
    await W2.sync(); assert.ok(voix(W2).some(p => p.pair === 'BNB/USDT'), 'heure d\'entrée ignorée même rendue');
  });

  await T('L6 · sommeil de plus de 1 000 heures : pages de 1 000 enchaînées, mèche de l\'heure 1 500 trouvée', async () => {
    const W = await ouvert();
    const { e } = await nuit(W, 'LINK/USDT', 1600, 1500, 2.2, null);
    await W.sync();
    const c = klCalls(W, 'LINKUSDT');
    assert.strictEqual(c.length, 2, '2 pages (' + c.length + ')'); assert.strictEqual(startOf(c[1]), H0 + 1000 * HOUR, '2e page depuis l\'heure 1 000');
    assert.strictEqual(lastTrade(W, 'LINK/USDT').price, 2 * e, 'fermée à 2 × l\'entrée');
  });

  await T('L7 · réseau en panne (rejet puis HTTP 500) : rien ne change — état = code d\'avant au caractère près —, erreur dite, réessai l\'heure suivante seulement', async () => {
    for (const panne of ['rejet', 500]) {
      const W = await ouvert(), A = await ouvert({ src15b: AVANT15b });
      W.B.panne = panne; W.B.meche['BTC/USDT'] = { [H0 + HOUR]: 13 * 3 };
      W.tick(3 * HOUR); A.tick(3 * HOUR); await W.sync(); await A.sync();
      assert.strictEqual(JSON.stringify(W.S), JSON.stringify(A.S), panne + ' : état identique au code d\'avant');
      assert.ok(/USDT : (Failed to fetch|HTTP 500)$/.test(String(W.run('_tlr.liq.err'))), 'erreur dite : ' + W.run('_tlr.liq.err'));
      const n = W.seen.calls.length; W.B.panne = null;
      W.tick(30 * 60000); await W.sync(); assert.strictEqual(W.seen.calls.length, n, 'pas de réessai dans l\'heure');
      W.tick(31 * 60000); await W.sync();
      assert.ok(W.seen.calls.length > n && !voix(W).some(p => p.pair === 'BTC/USDT'), panne + ' : l\'heure suivante, la mèche est lue');
    }
  });

  await T('L8 · mèche d\'une semaine passée : en AUTO, rouverte au prix du moment (la poche la tient, décision de cette semaine) ; mèche de cette semaine : pas rouverte', async () => {
    const W = await ouvert({ auto: true });
    // la tablette dort du jeudi 12/11 au mardi 17/11 : mèche le samedi 14/11 (semaine passée)
    const { e } = await nuit(W, 'XRP/USDT', 4 * 24 + 6, 40, 2.1, { age: 1000, px: 21 * 0.98 });
    PAIRS11.forEach(p => { W.ages[p] = 1000; });
    Object.keys(W.S.tendance.dec).forEach(p => { W.S.tendance.dec[p].w = mondayOf(W.now()); });
    W.S.tradingAccount += 200;   // de l'argent libre (ton EV du 15/11 : 1 015 $ libres)
    await W.sync(); await W.sync();
    const tr = W.S.pairStates['XRP/USDT'].trades.filter(x => x.type === 'tendance');
    assert.strictEqual(tr.filter(x => x.price === 2 * e).length, 1, 'fermée à 2 × l\'entrée');
    const np = voix(W).find(p => p.pair === 'XRP/USDT');
    assert.ok(np && np.entryPrice === 21 * 0.98, 'rouverte au prix du moment (' + (np && np.entryPrice) + ')');
    // mèche de cette semaine (mardi) : pas rouverte
    const W2 = await ouvert({ auto: true });
    await nuit(W2, 'XRP/USDT', 4 * 24 + 6, 4 * 24 + 2, 2.1, { age: 1000, px: 21 * 0.98 });
    PAIRS11.forEach(p => { W2.ages[p] = 1000; }); Object.keys(W2.S.tendance.dec).forEach(p => { W2.S.tendance.dec[p].w = mondayOf(W2.now()); });
    W2.S.tradingAccount += 200;
    await W2.sync(); await W2.sync();
    assert.ok(!voix(W2).some(p => p.pair === 'XRP/USDT'), 'mèche de cette semaine : pas rouverte');
    assert.strictEqual(W2.S.tendance.reel.attente['XRP/USDT'].w, mondayOf(W2.now()));
  });

  await T('L9 · fermeture refusée : aucun prix imposé laissé ; réessayée au battement suivant, fermée alors à 2 × l\'entrée', async () => {
    const W = await ouvert();
    const { pos, e } = await nuit(W, 'DOGE/USDT', 9, 3, 2.3, null);
    const vrai = W.c.closePosition; W.c.closePosition = function () { /* refus muet */ };
    await W.sync(); W.c.closePosition = vrai;
    assert.ok(voix(W).some(p => p.id === pos.id), 'toujours ouverte'); assert.ok(!('_forcedExitPx' in pos), 'prix imposé retiré');
    W.tick(20000); await W.sync();
    assert.ok(!voix(W).some(p => p.id === pos.id), 'fermée au battement suivant'); assert.strictEqual(lastTrade(W, 'DOGE/USDT').price, 2 * e);
  });

  await T('L10 · réponse arrivée trop tard : ton ✕ entre-temps, sauvegarde restaurée, contrôle abandonné après 5 min → rien n\'est écrit', async () => {
    // (a) ton ✕ pendant l'appel
    let W = await ouvert(); W.B.gele = true; await nuit(W, 'ADA/USDT', 9, 3, 2.5, null);
    await W.sync(); const pa = voix(W).find(p => p.pair === 'ADA/USDT');
    W.S.pairStates['ADA/USDT'].price = 9; W.run("closePosition('" + pa.id + "', false, { main: true })");
    W.B.gele = false; W.B.enAttente.splice(0).forEach(r => r({ ok: true, status: 200, json: () => Promise.resolve([[H0 + 3 * HOUR, '10', '50', '9', '10']]) })); await flush();
    assert.strictEqual(W.S.pairStates['ADA/USDT'].trades.filter(x => x.type === 'tendance').length, 1, 'une seule fermeture (la tienne)');
    // (b) sauvegarde restaurée pendant l'appel : la réponse ne touche pas la nouvelle poche
    W = await ouvert(); W.B.gele = true; await nuit(W, 'ADA/USDT', 9, 3, 2.5, null); await W.sync();
    const neuf = JSON.parse(JSON.stringify(W.S.tendance)); W.S.tendance = neuf;
    W.B.gele = false; W.B.enAttente.splice(0).forEach(r => r({ ok: true, status: 200, json: () => Promise.resolve([[H0 + 3 * HOUR, '10', '50', '9', '10']]) })); await flush();
    assert.ok(voix(W).some(p => p.pair === 'ADA/USDT') && !Object.values(neuf.reel.suivi).some(s => 'chk' in s), 'rien d\'écrit dans la poche restaurée');
    // (c) appel resté sans réponse : abandonné après 5 min, un nouveau contrôle part, la vieille réponse est ignorée
    W = await ouvert(); W.B.gele = true; await W.sync(); W.tick(HOUR); await W.sync();
    const n1 = W.seen.calls.length; W.tick(4 * 60000); await W.sync(); assert.strictEqual(W.seen.calls.length, n1, 'en vol : rien de neuf avant 5 min');
    W.B.gele = false; const vieux = W.B.enAttente.splice(0);
    W.tick(2 * 60000 + HOUR); await W.sync(); assert.ok(W.seen.calls.length > n1, 'abandonné après 5 min : nouveau contrôle');
    const chk = Object.values(W.S.tendance.reel.suivi).map(s => s.chk).join(',');
    vieux.forEach(r => r({ ok: true, status: 200, json: () => Promise.resolve([[H0 + 3 * HOUR, '10', '50', '9', '10']]) })); await flush();
    assert.strictEqual(voix(W).length, 11, 'vieille réponse ignorée'); assert.strictEqual(Object.values(W.S.tendance.reel.suivi).map(s => s.chk).join(','), chk, 'aucun chk réécrit');
  });

  await T('L11 · la poche liquide aussi (2 × son entrée, au-delà de 2 × celle de l\'EV) : une seule fermeture, −100 % de la mise', async () => {
    const W = await ouvert();
    const { pos } = await nuit(W, 'AVAX/USDT', 9, 3, 9, null);
    const t = W.S.tendance, p = t.pos['AVAX/USDT'];
    t.hist.push({ p: 'AVAX/USDT', s: -1, w0: p.w, t0: p.t0, x0: p.x0, t1: H0 + 3 * HOUR, x1: 2 * p.x0, r: -1, c: 0, net: -1, n: p.n, why: 'liquidation : le prix a doublé' }); delete t.pos['AVAX/USDT'];
    await W.sync(); await W.sync();
    const tr = W.S.pairStates['AVAX/USDT'].trades.filter(x => x.type === 'tendance');
    assert.strictEqual(tr.length, 1, 'une seule fermeture'); near(tr[0].pnlUsdt, -pos.stakeUsdt, '−100 %');
  });

  console.log('▶ L12. Témoin : sans mèche, état identique au code d\'avant ; le banc voit la différence sur une mèche');
  async function scenario(src, o, meche) {
    const W = world({ src15b: src, net: o.net }); poche(W, all11('short')); const out = [];
    const strip = (S) => JSON.parse(JSON.stringify(S), (k, v) => (o.sansChk && k === 'chk') ? undefined : v);
    const snap = (k) => out.push(k + ' ' + JSON.stringify({ S: strip(W.S), toasts: W.seen.toasts, judges: W.seen.judges, saves: W.seen.saves }));
    await W.sync(); snap('ouverture');
    const tourne = (pair, x1, t0) => { const t = W.S.tendance, p = t.pos[pair]; t.hist.push({ p: pair, s: -1, w0: p.w, t0: p.t0, x0: p.x0, t1: W.now(), x1, r: 0, c: 0, net: 0, n: p.n, why: 'retournement' }); t.pos[pair] = { side: 'long', w: 0, pW: 1, pL: 1, x0: x1, t0, n: 11, cIn: 0, liqChk: 0 }; };
    W.tick(HOUR); tourne('ETH/USDT', 16, 9); W.S.pairStates['ETH/USDT'].price = 16.5; await W.sync(); snap('retournement frais');
    W.tick(HOUR); W.ages['SOL/USDT'] = 400000; tourne('SOL/USDT', 19, 10); await W.sync(); snap('retournement périmé');
    W.ages['SOL/USDT'] = 1000; await W.sync(); snap('retournement redevenu frais');
    W.tick(HOUR); const d = voix(W).find(p => p.pair === 'DOGE/USDT'); W.S.pairStates['DOGE/USDT'].price = 2 * d.entryPrice; await W.sync(); snap('×2 de l\'EV en direct');
    W.tick(HOUR); delete W.S.tendance.pos['XRP/USDT']; await W.sync(); snap('paire retirée');
    W.tick(HOUR); const a = voix(W).find(p => p.pair === 'ADA/USDT'); W.run("closePosition('" + a.id + "', false, { main: true })"); await W.sync(); snap('ton ✕');
    W.tick(HOUR); W.S.botAutoMode = false; await W.sync(); snap('MANU');
    W.tick(HOUR); W.S.walletStore.paperReal.running = false; W.tick(9 * HOUR); PAIRS11.forEach(p => { W.ages[p] = 9 * HOUR; }); await W.sync(); snap('pause, nuit de 9 h');
    if (meche) { W.tick(HOUR); W.B.meche['BTC/USDT'] = { [Math.floor(W.now() / HOUR) * HOUR]: 13 * 2.4 }; await W.sync(); snap('mèche'); }
    return out;
  }
  await T('L12a · sans réseau : 9 étapes (ouverture, retournements, ×2 en direct, paire retirée, ✕, MANU, pause et nuit) = code d\'avant au caractère près', async () => {
    const a = await scenario(AVANT15b, { net: false }), b = await scenario(s15b, { net: false });
    assert.strictEqual(a.length, 9); a.forEach((x, i) => assert.strictEqual(b[i], x, 'étape « ' + x.split(' ')[0] + ' » différente'));
  });
  await T('L12b · bougies sans mèche : les mêmes 9 étapes = code d\'avant, hormis la progression des contrôles (suivi[paire].chk)', async () => {
    const a = await scenario(AVANT15b, { sansChk: true }), b = await scenario(s15b, { sansChk: true });
    a.forEach((x, i) => assert.strictEqual(b[i], x, 'étape « ' + x.split(' ')[0] + ' » différente'));
    const c = await scenario(s15b, {}); assert.notStrictEqual(c[8], b[8], 'chk bien écrit (sinon le témoin ne prouve rien)');
  });
  await T('L12c · le banc VOIT la différence : la même suite terminée par une mèche de la nuit diffère du code d\'avant (fermée à 2 × l\'entrée contre gardée)', async () => {
    const a = await scenario(AVANT15b, { sansChk: true }, true), b = await scenario(s15b, { sansChk: true }, true);
    assert.strictEqual(a.slice(0, 9).join('\n'), b.slice(0, 9).join('\n'), 'mêmes 9 premières étapes');
    const btc = (s) => JSON.parse(s.slice(s.indexOf(' ') + 1)).S.openPositions.some(p => p.pair === 'BTC/USDT');
    assert.strictEqual(btc(a[9]), true, 'avant : BTC gardée'); assert.strictEqual(btc(b[9]), false, 'après : BTC fermée');
  });

  console.log('▶ L13. Garde');
  await T('L13 · 15b ne change que dans l\'en-tête, les constantes, les fonctions de relecture, le bloc (c0), l\'appel liqCheck et l\'export ; témoin = 15b de e09d72a ; sans-n108.js le redonne', async () => {
    assert.strictEqual(crypto.createHash('sha256').update(AVANT15b).digest('hex').slice(0, 16), '07bb7c025b0a1e0a', 'empreinte du témoin');
    assert.strictEqual(require('./banc-fixtures/sans-n108.js')(s15b, 'js/15b-tendance-reelle.js'), AVANT15b, 'sans-n108.js redonne le 15b d\'avant au caractère près');
    const R = require('./banc-fixtures/n108-retours.json')['js/15b-tendance-reelle.js'];
    const lieux = ['le dernier contrôle (même règle que la poche', 'RÉSEAU (go n° 108)', 'var HOUR = 3600000, FETCH_MS', 'function liqHist(r, q, g)',
      'var changed = false, due = [];', '// (c0) [GO N° 108', 'try { liqCheck(r, due); }', 'liq: hst };'];
    assert.strictEqual(R.length, lieux.length, 'nombre de retouches (' + R.length + ')');
    R.forEach(([n], i) => assert.ok(n.indexOf(lieux[i]) >= 0, 'retouche ' + i + ' hors des lieux prévus'));
    // le (c) du ×2 en direct est intact
    const c = (s) => s.slice(s.indexOf('        // (c) SHORT de l\'EV'), s.indexOf('        // (d) ouvertures'));
    assert.strictEqual(c(s15b), c(AVANT15b), '(c) en direct identique');
  });

  console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés');
  process.exit(fail ? 1 : 0);
})();
