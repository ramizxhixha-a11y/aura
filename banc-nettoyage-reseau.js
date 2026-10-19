// banc-nettoyage-reseau.js — [GO NETTOYAGE · 18/10/2026] groupe « reseau » : registre ETAT-AURA8.md n° 27 (G1) et n° 28 (G2).
// Chaque essai fait tourner le VRAI texte de l'app en vm et ÉCHOUE sur le code d'avant :   BANC_ROOT=<copie du commit 6ee5844> node banc-nettoyage-reseau.js
//   A  n° 27 · les migrations « une fois » gardées par un drapeau localStorage (02, 03, 09b2) ne touchent plus un état VÉCU quand le drapeau manque
//      (localStorage perdu, IndexedDB gardée) : argent des 3 portefeuilles, frais, points de départ, journal de bord, dette, fitness des agents, flotte.
//      Critère (02 _oneShotEtatVecu) : l'état a été RELU du stockage (S._restoredSavedAt, posé par loadState 09b2 seulement), ou il porte des données
//      réelles (trade, position, apport, argent, agent jugé). Installation neuve : loadState sort avant (vrai texte rejoué) et S / _freshWallet sont à
//      zéro → les migrations font ce qu'elles faisaient. Le vrai backup du 18/10 (s'il est sur la machine) traverse les 11 migrations intact.
//   B  n° 28 · la fenêtre « bougies réelles » (02 openRealCandlesModal) n'écrit plus ps.price dans la mesure de fraîcheur des prix réels :
//      hors réseau l'âge grandit (avant : 0 chaque seconde), la garde « prix figé » 07 et la mémoire des chemins 10i voient la coupure, la série de
//      bougies de la paire affichée vieillit (porte EV / RE) ; en réseau un vrai trade WS, une kline, un prix REST remettent l'âge à 0 comme avant.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const BACKUP = process.env.BANC_BACKUP || '/home/claude/aura/rejeu/backups/pont/aura_guardian_full_20261018-213733.json';
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
function matchBody(src, from) {   // indice de l'accolade qui ferme le corps ouvert au premier « { » après `from` (chaînes, gabarits, commentaires sautés)
  const st = [];
  for (let i = src.indexOf('{', from); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return i; }
  }
  throw new Error('fin introuvable');
}
function fnSrc(src, name) { const m = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(').exec(src); assert.ok(m, 'fonction absente : ' + name); const a = m.index + m[1].length; return src.slice(a, matchBody(src, src.indexOf(')', a)) + 1); }
const has = (src, name) => new RegExp('(^|\\n)function ' + name + '\\s*\\(').test(src);
function iife(src, name) { const a = src.indexOf('(function ' + name + '('); assert.ok(a >= 0, 'migration absente : ' + name); const e = matchBody(src, src.indexOf(')', a)); assert.strictEqual(src.slice(e + 1, e + 5), ')();', 'forme : ' + name); return src.slice(a, e + 5); }
const bloc = (src, a, b) => { const i = src.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 60)); const j = src.indexOf(b, i); assert.ok(j > i, 'fin : ' + b.slice(0, 60)); return src.slice(i, j + b.length); };
const ligne = (src, re) => { const m = src.match(re); assert.ok(m, 'ligne absente ' + re); return m[0]; };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const J = o => JSON.parse(JSON.stringify(o));
const s01 = rd('js/01-chrono-network.js'), s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'),
      s09j = rd('js/09j-helpers.js'), s9b2 = rd('js/09b2-save-load.js'), s10i = rd('js/10i-intel-bus.js'), html = rd('AURA8_v118.html');
const SCRIPTS = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
const TOUT = SCRIPTS.map(f => [f, rd(f)]).concat([['AURA8_v118.html (en ligne)', [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n')]]);

// ══ A · n° 27 ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// les 11 migrations « une fois » à drapeau localStorage seul, dans l'ordre de chargement (02, 03, 09b2) ; GARDEES = celles qui écrivent l'argent,
// l'historique, les agents (règle 9). Non gardées, dites au rapport : _etage1Migration (réglage de la décision d'ouvrir, maxConcurrentPos 1 → 3 : porte
// TALENT, pas ce go) et _upgradeFeeRates (relève le taux de frais au plancher Binance 0,10 %, ne le baisse jamais) ; 01 aura_permode_reset_v2 (play → pause).
const MIG = [['_etage1Migration', s02], ['_levRealign', s02], ['_delev1808v2', s02], ['_seed2308v4', s02], ['_resetFees2308', s02], ['_rebase2308', s02], ['_purgeJournal2308', s02],
  ['_fleetTruthPurge', s03], ['_clearOrphanDebt', s9b2], ['_upgradeFeeRates', s9b2], ['_fitnessRestore20260805', s9b2]];
const GARDEES = ['_levRealign', '_delev1808v2', '_seed2308v4', '_resetFees2308', '_rebase2308', '_purgeJournal2308', '_fleetTruthPurge', '_clearOrphanDebt', '_fitnessRestore20260805'];
const r2 = x => Math.round((Number(x) || 0) * 100) / 100;
// le monde : S donné (état réel relu, ou installation neuve), accesseurs de portefeuille RÉELS de 02, localStorage donné, état prêt
function monde27(S0, o) {
  o = o || {};
  const ls = Object.assign({}, o.ls || {}), rec = { saved: 0 }, timers = [];
  const c = { console: { log() {}, warn() {}, error() {} }, Math, Number, Object, Array, String, JSON, Date, isFinite, isNaN, parseInt, parseFloat,
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
    setInterval: (f) => { const t = { f, on: true }; timers.push(t); return t; }, clearInterval: (t) => { if (t) t.on = false; }, setTimeout: () => 0,
    saveState: () => { rec.saved++; return true; }, renderAll() {}, showToast() {}, PAIRS: {}, makePairState: () => ({ trades: [] }) };
  c.window = c; c._stateReady = true; c._decErr = () => {};
  vm.createContext(c);
  c.__S = S0;
  vm.runInContext(['var S = __S;', fnSrc(s02, '_freshWallet'), fnSrc(s02, '_freshWalletStore'), fnSrc(s02, '_walletKey'), fnSrc(s02, '_walletFor'), fnSrc(s02, '_activeWallet'),
    ligne(s02, /var _WALLET_ACCESSOR_FIELDS = \[[\s\S]*?\];/), fnSrc(s02, '_installWalletAccessors'), fnSrc(s02, '_ensureWalletStore'), '_ensureWalletStore(); _installWalletAccessors();',
    fnSrc(s02, '_computePortfolio'), fnSrc(s02, '_tradingCapitalBase'), fnSrc(s02, 'syncLeverageReserve'), fnSrc(s02, 'rndHash'), fnSrc(s02, 'nowStr'),
    has(s02, '_oneShotEpargne') ? fnSrc(s02, '_oneShotEtatVecu') + '\n' + fnSrc(s02, '_oneShotEpargne') : ''].join('\n'), c);
  return { c, S: c.S, ls, rec, run: code => vm.runInContext(code, c),
    migrer(noms) { (noms || MIG.map(m => m[0])).forEach(n => vm.runInContext(iife(MIG.find(m => m[0] === n)[1], n), c)); for (let k = 0; k < 400; k++) { const on = timers.filter(t => t.on); if (!on.length) break; on.forEach(t => t.f()); } } };
}
// le S de 02 tel qu'au chargement (vrai texte du littéral) — installation neuve
function sNeuf() { const i = s02.indexOf('\nconst S = {'), j = s02.indexOf('\n};', i); const c = { Math, Date, Number, Object, Array, JSON, String }; vm.createContext(c);
  vm.runInContext(s02.slice(i + 1, j + 3).replace('const S =', 'var S =') + '\n' + bloc(s03, 'const BOT_FLEET_IDS = [', '];') + '\n' + fnSrc(s03, 'initBotFleet') + '\ninitBotFleet();', c); return c.S; }   // + la flotte, comme 03 au chargement
// un état VÉCU, chiffres du backup réel du 18/10 21:37 (AA 4 123,61 $ / 2 188 trades, EV 1 074,06 $, RE 1 145,42 $, une position ADA, 61 récits, 10 bots jugés)
function sVecu(o) {
  o = o || {};
  const S = sNeuf();
  const w = (trading, cash, own, nTr, feeRes, pnlNet, start, week, recits) => ({ tradingAccount: trading, cashAccount: cash, ownFundsInjected: own, ownFundsLog: own ? [{ amount: own }] : [], totalTrades: nTr, winTrades: Math.round(nTr / 2),
    leverageReserve: (trading + cash) * 10, fees: { totalTradingFees: 1, totalFunding: 0, totalSlippage: 0, totalGross: 1, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: pnlNet, tradeCount: nTr, feeReserveAccount: feeRes, feeLog: [{ x: 1 }], byPair: {} },
    _startPortfolio: start, portfolio: start, pnlPeriod: { day: 0, week: 0, month: 0, history: [], todayStartPortfolio: start, weekStartPortfolio: week }, dreamJournal: new Array(recits).fill({ t: 'récit' }), pnlHistory: [start], openPositions: [], pairStates: {}, cashLog: [{ a: 1 }] });
  S.walletStore = { sim: w(4123.61, 47.39, 1275.62, 2188, 690.35, -584.27, 4388.49, 1003.29, 31), paperReal: w(1074.06, 6.58, 1149.81, 367, 40.40, -61.72, 1080.64, 1080.64, 30), real: w(1145.42, 0, 1145.42, 0, 0, 0, 1145.42, 1145.42, 0) };
  S.walletStore.sim.openPositions = [{ id: 'ada', pair: 'ADA/USDT', side: 'short', stakeUsdt: 217.06, auto: true, levBorrowed: 0 }];
  if (o.dette) Object.assign(S.walletStore.paperReal, { leverageBorrowed: 62, _autoLevBorrowed: 62 });   // une dette du levier en ARGENT, sans position (n° 52 : elle reste due)
  S.tradingMode = 'paperReal';
  const FIT = { 'Bot Exécution': 231.2, 'Bot Arbitrage': 304, 'Bot Scalper·HF': 203, 'Bot DCA·Grid': 116 };
  S.agents.forEach(a => { if (FIT[a.name]) a.fitness = FIT[a.name]; a._judgments = [{ s: 1, w: 0.5 }]; });
  S.botFleet = { exec_bot_v1: { contributions: 1850, pnlContrib: -3.13 }, scalper_bot_v1: { contributions: 30736, pnlContrib: -3.47 }, smart_sizer_v1: { contributions: 10, pnlContrib: -90.38 } };
  S.paperRealConfig.maxConcurrentPos = 3; S.feeConfig = { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 }; S.chainLog = []; S.cycle = 1566774;
  if (o.relu !== false) S._restoredSavedAt = '2026-10-18T19:37:33.037Z';   // ce que loadState (09b2) pose quand il a relu un snapshot
  return S;
}
function photo(S) {
  const o = {};
  ['sim', 'paperReal', 'real'].forEach(m => { const w = S.walletStore[m];
    o[m] = { trading: r2(w.tradingAccount), caisse: r2(w.cashAccount), fondsPropres: r2(w.ownFundsInjected), apports: (w.ownFundsLog || []).length, positions: (w.openPositions || []).length,
      dette: r2(w.leverageBorrowed), detteAuto: r2(w._autoLevBorrowed), levier: w.leverage, reserveLevier: r2(w.leverageReserve), reserveFrais: r2(w.fees.feeReserveAccount), pnlNet: r2(w.fees.totalPnlNet),
      nbTradesFrais: w.fees.tradeCount, journalFrais: (w.fees.feeLog || []).length, depart: r2(w._startPortfolio), semaine: r2(w.pnlPeriod.weekStartPortfolio), recits: (w.dreamJournal || []).length }; });
  o.agents = S.agents.map(a => a.name + ':' + a.fitness + '/' + a.conf + '/' + a.errors + '/' + a.corrections + '/' + a.streak).join(' ');
  o.flotte = J(S.botFleet); o.frais = J(S.feeConfig); o.maxPos = S.paperRealConfig.maxConcurrentPos;
  return o;
}

// ══ B · n° 28 ═══════════════════════════════════════════════════════════════════════════════════════════════════════
const TEXTES28 = () => [
  ligne(s02, /var _rcLastPx = \{\};[^\n]*\n/), ligne(s02, /var _rcLastJump = \{\};[^\n]*\n/), ligne(s02, /var _bnLiveTs = \{\};[^\n]*\n/),
  ligne(s02, /var _wsAggLastByPair = \{\};[^\n]*\n/), ligne(s02, /var RC_HOLE_WIN = [^\n]*\n/), ligne(s02, /const REAL_CANDLES_MAX = [^\n]*\n/),
  bloc(s02, 'const REAL_CANDLE_INTERVALS = {', '\n};'), bloc(s02, 'let _realCandlesState = {', '\n};'),
  ['_livePairs', '_rcOutlier', '_rcSeenAge', '_rcPriceAge', '_rcLastPrice', '_candleStartTs', '_ensureRealCandlesStruct', '_wsAggGate', '_upsertKlineCandle',
    '_aggregateRealPriceOtherIntervals', '_aggregateRealPrice', '_realCandlesHoled', '_realCandlesStale', 'openRealCandlesModal', 'closeRealCandlesModal',
    '_selectRealCandlesPair', '_selectRealCandlesInterval'].map(n => fnSrc(s02, n)).join('\n'),
  bloc(s02, 'let _rcWsRetryDelay = 1000;', 'window._rcDisconnectWS = _rcDisconnectWS;'),
  fnSrc(s09j, 'markRealPriceReceived'), fnSrc(s07, '_trailStopHit'), fnSrc(s07, 'learnFromOpenPositions'),
  bloc(s10i, 'var PATH_MARKS = [15, 30, 60, 120, 240];', 'window._pathRecord = _pathRecord;').replace(/^window\..*$/gm, '')
].join('\n');
const PAIRES = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
function monde28(o) {
  o = o || {};
  const horloge = { t: Date.UTC(2026, 9, 18, 20, 0, 3) };
  class D extends Date { constructor(...a) { super(...(a.length ? a : [horloge.t])); } static now() { return horloge.t; } }
  const timers = [], sockets = [], els = {}, rec = { closed: [] };
  const document = { getElementById: id => els[id] || null, createElement: () => ({ style: {}, innerHTML: '' }),
    body: { appendChild: (m) => { els[m.id] = Object.assign(m, { remove() { delete els[m.id]; } }); } }, querySelectorAll: () => [], readyState: 'complete', addEventListener() {} };
  function WebSocket(url) { this.url = url; sockets.push(this); }   // hors réseau : jamais d'onopen ni de message
  WebSocket.prototype.close = function () { this.closed = true; };
  const S = { tradingMode: o.mode || 'paperReal', pairStates: {}, realCandles: {}, openPositions: [], gainRules: {}, chainLog: [] };
  PAIRES.forEach((p, i) => { S.pairStates[p] = { price: [100, 50, 20][i], trades: [] }; });
  const c = { S, PAIRS: { 'BTC/USDT': { dec: 2 }, 'ETH/USDT': { dec: 2 }, 'SOL/USDT': { dec: 2 } }, RT: { _lastRealPriceTs: 0 }, document, WebSocket,
    Date: D, Math, Number, Object, Array, String, JSON, isFinite, isNaN, parseFloat, parseInt, Set, Promise, console: { log() {}, warn() {}, error() {} },
    setInterval: (f, ms) => { const t = { f, ms, on: true }; timers.push(t); return t; }, clearInterval: (t) => { if (t) t.on = false; }, setTimeout: () => 0,
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, lmsrP: () => 0.5, rndHash: () => 'h', nowStr: () => 't', showToast() {},
    closePosition: (id) => { rec.closed.push(id); S.openPositions = S.openPositions.filter(p => p.id !== id); },
    _renderRealCandles() {}, _rcRenderThrottled() {}, _rcAnimateLive() {}, _rcLoadToggles() {}, _rcApplyTogglesVisuals() {}, _backfillRealCandles: async () => false, _updateNetIndicator() {}, startSim() {} };
  c.window = c; vm.createContext(c);
  vm.runInContext(TEXTES28() + '\nvar S = this.S;', c);
  vm.runInContext('_ensureRealCandlesStruct()', c);
  const run = code => vm.runInContext(code, c);
  return { c, S, rec, timers, sockets, horloge, run,
    tick(sec) { for (let k = 0; k < sec; k++) { horloge.t += 1000; timers.filter(t => t.on && t.ms <= 1000).forEach(t => t.f()); } },   // les minuteries à la seconde (le rafraîchissement de la fenêtre était de 1 s)
    age: p => run("_rcPriceAge('" + p + "')"), vu: p => run("_rcSeenAge('" + p + "')"),
    rest: (p, px) => run("_aggregateRealPrice('" + p + "', " + px + ")"),   // un vrai prix REST : 02 fetchBinancePrices (Binance) et le secours CoinGecko appellent ceci
    wsOuvre() { sockets[sockets.length - 1].onopen(); },
    wsTrade(p, px) { sockets[sockets.length - 1].onmessage({ data: JSON.stringify({ stream: p.replace('/', '').toLowerCase() + '@trade', data: { e: 'trade', p: String(px), T: horloge.t } }) }); },
    wsKline(px) { const ts = Math.floor(horloge.t / 300000) * 300000; sockets[sockets.length - 1].onmessage({ data: JSON.stringify({ stream: 'k', data: { e: 'kline', E: horloge.t, k: { t: ts, o: String(px), h: String(px), l: String(px), c: String(px), v: '1', n: 1, x: false } } }) }); },
    bougies: (p, iv) => J((S.realCandles[p] || {})[iv || '5m'] || []),
    botAPlat(p) { S.openPositions.push({ id: 'z-' + p, pair: p, side: 'long', entryPrice: S.pairStates[p].price, stakeUsdt: 30, totalExposure: 30, auto: true, openedAt: horloge.t - 7200000 }); } };
}

(async () => {
  console.log('▶ banc-nettoyage-reseau · code ' + ROOT);

  console.log('▶ A. n° 27 — migrations « une fois » : la garde se fonde sur l\'état');
  await T('A1 · inventaire : les migrations qui lisent un drapeau localStorage (getItem(F) / getItem(FLAG)) dans les scripts du HTML sont exactement les 11 connues ; les 9 qui écrivent l\'argent, l\'historique ou les agents demandent _oneShotEpargne AVANT d\'écrire', () => {
    const found = [];
    TOUT.forEach(([f, s]) => { const re = /\(function (\w+)\s*\(/g; let m; while ((m = re.exec(s))) { let e; try { e = matchBody(s, s.indexOf(')', m.index)); } catch (x) { continue; } const body = s.slice(m.index, e + 1);
      if (/localStorage\.getItem\((F|FLAG)\)/.test(body)) found.push(m[1]); } });
    assert.deepStrictEqual(found.slice().sort(), MIG.map(x => x[0]).sort(), 'migration à drapeau à CLASSER (argent / historique / agents → _oneShotEpargne ; sinon la nommer ici) : ' + found.join(', '));
    GARDEES.forEach(n => { const b = codeStrict(iife(MIG.find(x => x[0] === n)[1], n)), g = b.search(/_oneShotEpargne\((F|FLAG),/);
      assert.ok(g > 0, n + ' : pas de garde sur l\'état');
      const w = b.search(/\b(S|w|fc)\.[A-Za-z_]+\s*=[^=]|\.forEach\(function\(a\)\{|zap\(|a\.fitness = /); assert.ok(w < 0 || g < w, n + ' : la garde vient après une écriture'); });
    assert.ok(has(s02, '_oneShotEtatVecu') && has(s02, '_oneShotEpargne'), '02 : la garde commune');
  });
  await T('A2 · état VÉCU relu du stockage (chiffres du backup réel du 18/10), drapeaux ABSENTS : après les 11 migrations, AA / EV / RE, fonds propres, position, réserve de frais, P&L, points de départ, journal de bord, fitness des bots, flotte inchangés ; drapeaux posés ; une ligne « non rejouée » par migration gardée (avant : les 3 portefeuilles à 0 $)', () => {
    const W = monde27(sVecu()), av = photo(W.S);
    W.migrer();
    assert.deepStrictEqual(photo(W.S), av);
    MIG.forEach(([n, s]) => { const f = (s.slice(s.indexOf('(function ' + n + '(')).match(/(?:FLAG|F)\s*=\s*'([^']+)'/) || [])[1]; assert.ok(f && W.ls[f] === '1', 'drapeau non posé : ' + n); });
    const non = W.S.chainLog.filter(l => /non rejouée : état relu du stockage \(sauvegardé le 2026-10-18 19:37\) — rien n'est touché/.test(l.desc));
    assert.strictEqual(non.length, GARDEES.length, 'lignes au journal : ' + W.S.chainLog.map(l => l.desc).join(' | '));
    assert.strictEqual(W.rec.saved, 0, 'aucune sauvegarde forcée (rien n\'a changé)');
  });
  await T('A3 · état vécu avec une dette du levier en ARGENT (EV 62 $, sans position — n° 52 : elle reste due) : ni le réalignement (15/08), ni le déleveraging (18/08), ni la « dette orpheline » (27/07) ne la prennent sur le trading ou ne l\'effacent (avant : 62 $ retirés du trading, dette à 0)', () => {
    const W = monde27(sVecu({ dette: true })), av = photo(W.S);
    W.migrer(['_levRealign', '_delev1808v2', '_clearOrphanDebt']);
    assert.deepStrictEqual(photo(W.S).paperReal, av.paperReal);
    assert.strictEqual(W.S.walletStore.paperReal.leverageBorrowed, 62);
  });
  await T('A4 · le critère « données réelles » seul (état pas encore marqué relu) : un trade, une position, un apport, de l\'argent, un agent jugé — chacun suffit à épargner l\'état ; sans rien de tout ça, la migration tourne', () => {
    const cas = { trades: S => { S.walletStore.real.totalTrades = 1; }, frais: S => { S.walletStore.real.fees.tradeCount = 1; }, position: S => { S.walletStore.real.openPositions = [{ id: 'p', stakeUsdt: 0 }]; },
      apport: S => { S.walletStore.real.ownFundsLog = [{ amount: 0 }]; }, argent: S => { S.walletStore.paperReal.cashAccount = 0.01; }, jugé: S => { S.agents[3]._judgments = [{ s: -1, w: 0.2 }]; } };
    Object.keys(cas).forEach(k => { const S = sNeuf(); const W = monde27(S); cas[k](W.S); assert.ok(W.run('_oneShotEtatVecu()'), 'non vu : ' + k);
      W.S.walletStore.sim.tradingAccount = 0; W.migrer(['_seed2308v4']); assert.ok(W.S.chainLog.some(l => /non rejouée/.test(l.desc)), 'pas épargné : ' + k); });
    const W = monde27(sNeuf()); assert.strictEqual(W.run('_oneShotEtatVecu()'), ''); W.migrer(['_seed2308v4']); assert.ok(W.S.chainLog.some(l => /SEED v4 · ZÉRO ABSOLU/.test(l.desc)), 'neuf : la migration tourne');
  });
  await T('A5 · INSTALLATION NEUVE (le vrai S de 02 et _freshWallet) : rien n\'y ressemble à un état vécu ; les 11 migrations tournent comme avant — leurs propres lignes au journal, fitness du 05/08 posée par nom (Bot Arbitrage 1572,6), drapeaux posés, aucune ligne « non rejouée »', () => {
    const W = monde27(sNeuf());
    assert.strictEqual(W.run('_oneShotEtatVecu()'), '', 'un état neuf vu comme vécu : ' + W.run('_oneShotEtatVecu()'));
    ['sim', 'paperReal', 'real'].forEach(m => { const w = W.S.walletStore[m]; assert.deepStrictEqual([w.tradingAccount, w.cashAccount, w.ownFundsInjected, w.totalTrades, w.openPositions.length, w.fees.tradeCount], [0, 0, 0, 0, 0, 0], m + ' : pas à zéro'); });
    assert.ok(!W.S.agents.some(a => a._judgments && a._judgments.length), 'agents neufs déjà jugés');
    W.migrer();
    const d = W.S.chainLog.map(l => l.desc).join(' | ');
    assert.ok(!/non rejouée/.test(d), d);
    ['SEED v4 · ZÉRO ABSOLU', 'Circuit frais remis à zéro', 'Baselines recalées', 'Fitness restaurée depuis le backup 01:35', 'Compteurs flotte purgés'].forEach(x => assert.ok(d.includes(x), 'n\'a pas tourné : ' + x));
    assert.strictEqual(W.S.agents.find(a => a.name === 'Bot Arbitrage').fitness, 1572.6);
    assert.strictEqual(Object.keys(W.ls).length, MIG.length);
  });
  await T('A6 · le VRAI loadState (09b2) : stockage vide ou remise à zéro d\'usine → S._restoredSavedAt n\'existe pas (une installation neuve ne peut pas passer pour relue) ; IndexedDB seule (localStorage vidé) ou localStorage seul → marqué relu, et _oneShotEtatVecu le dit', async () => {
    async function essai(idbSnap, lsSnap, reset) {
      const ls = {}; if (lsSnap) ls.nexus_state_v2 = JSON.stringify(lsSnap);
      const db = { transaction: () => ({ objectStore: () => ({ get: () => { const r = {}; setImmediate(() => r.onsuccess({ target: { result: idbSnap || null } })); return r; } }) }), close() {} };
      const c = { console: { log() {}, warn() {}, error() {} }, Math, Number, Object, Array, String, JSON, Date, isFinite, isNaN, parseInt, Promise, setTimeout: () => 0, setImmediate,
        localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
        sessionStorage: { getItem: k => (reset && k === 'nexus_factory_reset' ? '1' : null), removeItem() {} }, indexedDB: { deleteDatabase() {} },
        RT: { SAVE_KEY: 'nexus_state_v2', STORE_STATE: 'state', DB_NAME: 'NEXUS_DB' }, openDB: async () => db, PAIRS: {}, __S: sNeuf() };
      c.window = c; vm.createContext(c);
      vm.runInContext('var S = __S; S.walletStore = { sim: {}, paperReal: {}, real: {} };\n' + fnSrc(s9b2, 'loadState') + '\n' + fnSrc(s02, '_oneShotEtatVecu'), c);
      await vm.runInContext('loadState()', c);
      return { marque: Object.prototype.hasOwnProperty.call(c.S, '_restoredSavedAt'), vecu: vm.runInContext('_oneShotEtatVecu()', c), pret: c._stateReady };
    }
    assert.deepStrictEqual(await essai(null, null), { marque: false, vecu: '', pret: true }, 'stockage vide');
    assert.deepStrictEqual(await essai({ cycle: 12, savedAt: 'x' }, null, true), { marque: false, vecu: '', pret: true }, 'remise à zéro d\'usine');
    const idb = await essai({ cycle: 1566774, savedAt: '2026-10-18T19:37:33.037Z' }, null); assert.ok(idb.marque && /état relu du stockage/.test(idb.vecu), J(idb));
    const lsx = await essai(null, { cycle: 900 }); assert.ok(lsx.marque && /état relu du stockage/.test(lsx.vecu), J(lsx));
    // un seul écrivain de S._restoredSavedAt dans tout ce que charge le HTML : loadState (09b2)
    const w = []; TOUT.forEach(([f, s]) => (codeStrict(s).match(/_restoredSavedAt\s*=[^=]/g) || []).forEach(() => w.push(f)));
    assert.deepStrictEqual(w, ['js/09b2-save-load.js'], 'écrivains : ' + w.join(', '));
  });
  await T('A7 · drapeaux PRÉSENTS (la tablette aujourd\'hui) : la garde n\'est même pas consultée — aucune ligne au journal, rien ne change', () => {
    const ls = {}; MIG.forEach(([n, s]) => { ls[(s.slice(s.indexOf('(function ' + n + '(')).match(/(?:FLAG|F)\s*=\s*'([^']+)'/) || [])[1]] = '1'; });
    const W = monde27(sVecu(), { ls }), av = photo(W.S); W.migrer();
    assert.deepStrictEqual(photo(W.S), av); assert.deepStrictEqual(W.S.chainLog, []);
  });
  await T('A8 · le VRAI backup du 18/10 21:37 (JSON.parse, jamais exécuté), drapeaux absents, relu : les 11 migrations ensemble le laissent intact (avant : AA 4 123,61 → 0, EV 1 074,06 → 0, RE 1 145,42 → 0, fonds propres et position effacés)', () => {
    if (!fs.existsSync(BACKUP)) { console.log('     ⏳ backup absent de cette machine : rejeu non exécuté (non bloquant)'); return; }
    const aura = JSON.parse(fs.readFileSync(BACKUP, 'utf8')).aura; aura._restoredSavedAt = aura.savedAt; aura.chainLog = [];
    const W = monde27(aura), av = photo(W.S); W.migrer();
    assert.deepStrictEqual(photo(W.S), av);
    assert.strictEqual(r2(W.S.walletStore.sim.tradingAccount), 4123.61); assert.strictEqual(r2(W.S.walletStore.paperReal.tradingAccount), 1074.06); assert.strictEqual(r2(W.S.walletStore.real.tradingAccount), 1145.42);
  });

  console.log('▶ B. n° 28 — la fenêtre « bougies réelles » n\'écrit plus dans la fraîcheur des prix réels');
  await T('B1 · HORS RÉSEAU, fenêtre ouverte sur BTC : l\'âge du dernier prix réel grandit (30, 60, 90, 120, 150 s ; avant : 0 à chaque relevé) ; vu = accepté ; le témoin réseau de 09j n\'est plus rafraîchi', () => {
    const W = monde28(); W.rest('BTC/USDT', 100); W.run('openRealCandlesModal()');
    const ages = []; for (let k = 0; k < 5; k++) { W.tick(30); ages.push(Math.round(W.age('BTC/USDT') / 1000)); }
    assert.deepStrictEqual(ages, [30, 60, 90, 120, 150]); assert.strictEqual(W.vu('BTC/USDT'), W.age('BTC/USDT'));
    assert.strictEqual(W.horloge.t - W.c.RT._lastRealPriceTs, 150000, 'markRealPriceReceived appelé sans prix réel');
    assert.strictEqual(W.bougies('BTC/USDT').length, 1, 'bougie fabriquée sur le prix figé');
  });
  await T('B2 · la garde « prix figé » EXISTANTE (07 learnFromOpenPositions, vrai texte, seuil inchangé) : position du bot à plat depuis 2 h, 150 s sans réseau, fenêtre ouverte → rien n\'est fermé (avant : fermée au prix figé) ; la mémoire des chemins (10i) ne l\'écrit pas ; fenêtre fermée : pareil, comme avant', () => {
    for (const ouverte of [true, false]) {
      const W = monde28(); W.rest('BTC/USDT', 100); W.botAPlat('BTC/USDT'); if (ouverte) W.run('openRealCandlesModal()');
      W.tick(150); W.run('learnFromOpenPositions()'); W.run('_pathRecord()');
      assert.deepStrictEqual(W.rec.closed, [], (ouverte ? 'ouverte' : 'fermée') + ' : fermée sur un prix figé');
      assert.ok(!W.S.openPositions[0]._path && W.S.openPositions[0]._pathStale === 1, 'chemin écrit sur un prix figé');
    }
  });
  await T('B3 · ouvrir la fenêtre, choisir une paire, choisir un intervalle : aucune paire ne devient « fraîche » avec son ps.price (avant : ETH, jamais reçue, fraîche à l\'ouverture et au choix)', () => {
    const W = monde28(); W.rest('BTC/USDT', 100); W.tick(20); W.run('openRealCandlesModal()');
    assert.strictEqual(W.age('ETH/USDT'), Infinity); assert.strictEqual(W.age('SOL/USDT'), Infinity); assert.strictEqual(W.age('BTC/USDT'), 20000);
    W.run("_selectRealCandlesPair('ETH/USDT')"); assert.strictEqual(W.age('ETH/USDT'), Infinity);
    W.run("_selectRealCandlesInterval('15m')"); assert.strictEqual(W.age('ETH/USDT'), Infinity);
    assert.deepStrictEqual(W.bougies('ETH/USDT'), [], 'bougie réelle fabriquée');
    assert.strictEqual(W.timers.filter(t => t.on && t.ms <= 1000).length, 0, 'une minuterie à la seconde tourne encore dans la fenêtre'); W.run('closeRealCandlesModal()');   // (la minuterie de 60 s du suivi de stabilité WS, 02, est hors de la fenêtre)
  });
  await T('B4 · EN RÉSEAU, fenêtre ouverte : un vrai trade WS, une kline WS, un prix REST (Binance / CoinGecko) remettent l\'âge à 0 et nourrissent les bougies, comme avant', () => {
    const W = monde28(); W.rest('BTC/USDT', 100); W.run('openRealCandlesModal()'); W.tick(40); W.wsOuvre();
    assert.strictEqual(W.age('BTC/USDT'), 40000); W.wsTrade('BTC/USDT', 100.1); assert.strictEqual(W.age('BTC/USDT'), 0, 'trade WS'); assert.strictEqual(W.S.pairStates['BTC/USDT'].price, 100.1);
    W.horloge.t += 5000; W.wsKline(100.3); assert.strictEqual(W.age('BTC/USDT'), 0, 'kline WS'); assert.strictEqual(W.run("_rcLastPrice('BTC/USDT')"), 100.3);
    W.horloge.t += 70000; W.rest('ETH/USDT', 51); assert.strictEqual(W.age('ETH/USDT'), 0, 'REST'); assert.strictEqual(W.bougies('ETH/USDT').length, 1);
    W.tick(30); assert.strictEqual(W.age('ETH/USDT'), 30000);
  });
  await T('B5 · AA à l\'écran (prix de l\'école 100,8 ; dernier vrai prix 100) : le prix de l\'école n\'entre plus dans le dernier prix réel que lisent EV / RE derrière l\'écran (08 _rcLastPrice) ni dans la bougie réelle (avant : 100,8)', () => {
    const W = monde28({ mode: 'sim' }); W.rest('BTC/USDT', 100); W.S.pairStates['BTC/USDT'].price = 100.8; W.run('openRealCandlesModal()'); W.tick(3);
    assert.strictEqual(W.run("_rcLastPrice('BTC/USDT')"), 100); const b = W.bougies('BTC/USDT'); assert.strictEqual(b[b.length - 1].c, 100);
  });
  await T('B6 · porte EV / RE (série de la paire affichée, _realCandlesStale, critère inchangé) : 40 vraies bougies 5 min puis 13 min sans réseau, fenêtre ouverte → la série est vue périmée et la porte attend (avant : bougies fabriquées sur le prix figé, série « fraîche »)', () => {
    const W = monde28(); const tf = 300000, b0 = Math.floor(W.horloge.t / tf) * tf;
    W.S.realCandles['BTC/USDT']['5m'] = Array.from({ length: 40 }, (_, i) => ({ ts: b0 - (39 - i) * tf, o: 100, h: 100.2, l: 99.8, c: 100, v: 5, n: 9 }));
    W.rest('BTC/USDT', 100); assert.strictEqual(W.run("_realCandlesStale('BTC/USDT', '5m')"), false, 'fraîche au départ');
    W.run('openRealCandlesModal()'); W.tick(13 * 60);
    assert.strictEqual(W.run("_realCandlesStale('BTC/USDT', '5m')"), true);
  });
  await T('B7 · dans tout ce que charge le HTML, plus aucun appel du filtre des prix réels (_aggregateRealPrice, _aggregateRealPriceOtherIntervals, _rcOutlier) ne reçoit ps.price : seulement le prix d\'un message Binance (WS, kline) ou d\'une réponse REST Binance / CoinGecko', () => {
    const appels = [];
    TOUT.forEach(([f, s]) => { const c = codeStrict(s); const re = /\b(_aggregateRealPrice|_aggregateRealPriceOtherIntervals|_rcOutlier)\(([^,()]+),\s*([^,()]+)/g; let m;
      while ((m = re.exec(c))) { if (/^function\s/.test(c.slice(Math.max(0, m.index - 9), m.index + 1).trim()) || /function\s+$/.test(c.slice(Math.max(0, m.index - 12), m.index))) continue; appels.push(f.replace('js/', '') + ' ' + m[1] + '(' + m[2].trim() + ', ' + m[3].trim()); } });
    const PS = appels.filter(a => /ps\.price|\.price\b/.test(a.split('(')[1] || ''));
    assert.deepStrictEqual(PS, [], 'ps.price dans le filtre : ' + PS.join(' ; '));
    const SRC = { 'realPrice': 1, 'price': 1, 'k.c': 1, '_realCandlesState.selectedPair, price': 1 };
    appels.forEach(a => { const arg = a.slice(a.indexOf('(') + 1).split(', ').slice(1).join(', '); assert.ok(/^(realPrice|price|k\.c)$/.test(arg), 'source inconnue : ' + a); });
    assert.ok(appels.length >= 6, 'inventaire trop court : ' + appels.join(' ; ')); void SRC;
  });
  await T('B8 · règle 3 : la décision n\'est pas touchée — les gardes et les mesures (07 learnFromOpenPositions, 10f _botExitSweep, 10i _pathRecord, 02 _rcOutlier / _rcPriceAge / _rcSeenAge / _realCandlesStale) gardent leurs seuils (120 000 ms, 2 %, 5 min, max(2,5 tf, 2 min))', () => {
    const c07 = codeStrict(fnSrc(s07, 'learnFromOpenPositions')), c10f = codeStrict(rd('js/10f-resolveur-cycle.js')), c02 = codeStrict(s02);
    assert.ok(/_rcSeenAge\(pos\.pair\) > 120000\) return;/.test(c07), '07'); assert.ok(/_rcSeenAge\(pos\.pair\) > 120000\) return;/.test(c10f), '10f');
    assert.ok(/_rcPriceAge\(pos\.pair\) > 120000\) \{ pos\._pathStale/.test(codeStrict(s10i)), '10i');
    assert.ok(c02.includes('if (ref && (now - ref.ts) < 300000 && Math.abs(price - ref.px) / ref.px > 0.02) { _rcLastJump[pair] = now; return true; }'), '02 _rcOutlier');
    assert.ok(c02.includes('if ((Date.now() - (arr[arr.length - 1].ts || 0)) > Math.max(tfMs * 2.5, 120000)) return true;'), '02 _realCandlesStale');
  });

  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
  process.exit(fail ? 1 : 0);
})();
