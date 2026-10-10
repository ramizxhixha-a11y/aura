// banc-ecole-vivante.js — [ÉCOLE VIVANTE · 10/10/2026] VERSION 20261010a
// Défaut lu dans le backup de Rams du 10/10 15:38 et reproduit sur la vraie app (sonde navigateur) :
//  · l'AA en play DERRIÈRE l'EV tradait sur un marché figé — 89 fermetures sur 89 au prix d'entrée exact en trois jours (58 sur PEPE au même prix à 16 chiffres),
//    0,000 % de mouvement sur 13 paires pour 7 223 cycles en 8 h de sonde : le générateur de bougies (08) et l'ancrage au prix reçu (02) n'écrivaient que dans le
//    mode À L'ÉCRAN ;
//  · l'AA À L'ÉCRAN : le générateur levait une exception sur la paire retirée GBP/USDT (sortie de PAIRS le 22/09, pairState gardé) — 600 battements interrompus
//    sur 1 800, exception avalée par le minuteur de 01 ; BNB/USDT, rangée après GBP, n'a jamais eu de bougie d'école.
// Testé sur le CODE RÉEL en vm : _simCandleStep et le bloc du multiplexeur de simTick (08), blendRealPrices, fetchLivePrices, fetchBinancePrices, l'ancrage
// _schoolBgAnchor et le bloc des portefeuilles avec ses accesseurs (02), installés comme dans l'app. Oracle : le texte EXACT du générateur d'avant
// (banc-fixtures/generateur-ecole-avant-20261010a.js). Dents : BANC_ROOT=<ancien code> node banc-ecole-vivante.js → les tests du changement échouent, les
// invariants passent.
// La relecture adverse (agent séparé, app réelle) a trouvé que l'AA rendue vivante derrière l'EV aurait armé l'anti-revenge COMMUN aux trois modes (15 min sans ouverture
// en EV / RE, écran de refroidissement) et grossi une fuite du cache des signaux fondamentaux (clé sans le mode) : R1 à R4 tiennent ces deux corrections et les états abîmés.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0; const failed = [];
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; failed.push(name.split(' · ')[0]); console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
// Extrait « function name(...) { ... } » (niveau 0) en sautant chaînes, gabarits ${…} et commentaires (même outil que banc-zombie / banc-manu / banc-cartes).
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
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s08 = rd('js/08-learning-history-render.js');
const ORACLE = require('./banc-fixtures/generateur-ecole-avant-20261010a.js');
const HAS_GEN = /(^|\n)function _simCandleStep\s*\(/.test(s08);
const WALLET = between(s02, 'function _freshWallet() {', 'function setBotMode(isAuto) {');
const MAP = between(s02, 'const CG_IDS_BY_SYM = {', 'window._cgIdFor = _cgIdFor;');
const BN = between(s02, 'function _bnSymbolMap() {', '\nfunction _simulationTickAll() {');
const LIVE = between(s02, 'async function fetchLivePrices(force = false) {', '\n// v7.0: Watchdog');
const BLEND = fnSrc(s02, 'blendRealPrices');
const GEN = HAS_GEN ? fnSrc(s08, '_simCandleStep') : '';
const MX = between(s08, '  var _mDisp = S.tradingMode;', '  try { if (window._botMeritAudit) window._botMeritAudit(); } catch(e) {}');
const FUND = 'const _fundCache = {};\n' + fnSrc(s08, 'getFundamentalSignals');
const CLOSE = between(s02, 'function closePosition(id, botClose = false) {', '\nfunction quickOpen(side) {');
// Deux fragments RÉELS de closePosition, exécutés tels quels : l'appel de l'anti-revenge et le bloc des jalons (de son titre à la fin de la chaîne if / else if).
const CP_RV = between(CLOSE, '  // ANTI-REVENGE : à chaque fermeture', '  // v7.12 LIVRAISON 8 · STATS + RÈGLES en mode Réel');
const CP_MS = between(CLOSE, '  // ═══ v5.1 — Milestones & Particles ═══', '  updatePairBtnStates();\n  renderPositions();\n  if(S.currentPage===4) renderChain();\n}');
const CP_AL = CLOSE.split('\n').filter(l => /checkPnlAlerts\(\)|checkBadges\(\)/.test(l) && !/^\s*\/\//.test(l)).join('\n');

// Le monde : 13 paires dans chaque portefeuille, dans l'ordre du backup de Rams (GBP/USDT, retirée, AVANT BNB/USDT) ; 12 dans PAIRS.
const PX = { 'BTC/USDT': 82790.559, 'ETH/USDT': 2499.37, 'XRP/USDT': 1.4039, 'SOL/USDT': 109.87, 'DOGE/USDT': 0.08592, 'ADA/USDT': 0.2552, 'AVAX/USDT': 10.508, 'LINK/USDT': 13.035, 'DOT/USDT': 1.254,
  'PEPE/USDT': 4.04e-06, 'EUR/USDT': 1.1202, 'GBP/USDT': 0.983946604235968, 'BNB/USDT': 749.8 };
const ORDER = Object.keys(PX), LIVEPAIRS = ORDER.filter(p => p !== 'GBP/USDT');
const CGID = { BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana', DOGE: 'dogecoin', DOT: 'polkadot', ADA: 'cardano', AVAX: 'avalanche-2', LINK: 'chainlink', BNB: 'binancecoin', PEPE: 'pepe' };
// Réponse CoinGecko au format réel ; variations 24 h non nulles (celle de l'USDT en EUR est celle relevée le 26/09, banc-prix-12-paires) : 02 en tire l'amplitude du hasard.
function cgData(px) { const d = { tether: { usd: 1, usd_24h_change: -0.00089, eur: 1 / px['EUR/USDT'], eur_24h_change: 0.07274858648083919 } }; LIVEPAIRS.forEach((p, k) => { const b = p.split('/')[0]; if (CGID[b]) d[CGID[b]] = { usd: px[p], usd_24h_change: (k % 2 ? -1 : 1) * (0.4 + 0.15 * k) }; }); return d; }
function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mkPs(px, n, k) { const candles = []; for (let i = 0; i < n; i++) { const c = px * (1 + 0.0004 * Math.sin((i + 1) * (k + 2))); candles.push({ o: c * 0.9999, h: c * 1.0003, l: c * 0.9996, c: c, v: 100 + i }); }
  return { price: n ? candles[n - 1].c : px, candles: candles, pnl24h: 0, cycleTimer: 2 + (k % 4), cycleMax: 6, qYes: 130, qNo: 130 }; }
const J = x => JSON.parse(JSON.stringify(x));
function mkStore() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }

// o : { screen, run: { sim, paperReal, real }, seed, frozenSim (prix de l'AA figé loin du marché, comme le 10/10), ncSim, fetched }
function world(o) {
  o = o || {};
  const rnd = mulberry(o.seed || 7), M = Object.create(Math); M.random = rnd;
  const S = { tradingMode: o.screen || 'paperReal', cycle: 0, chainLog: [] };
  const PAIRS = {}; LIVEPAIRS.forEach(p => { PAIRS[p] = { sym: p.split('/')[0], vol: PX[p] * 0.0005, minP: PX[p] * 0.65, maxP: PX[p] * 1.55, startPrice: PX[p], dec: 4 }; });
  const log = { cyc: [], proj: [], prot: [], agg: [], urls: [], decErr: [] };
  const c = { S, PAIRS, Math: M, Number, Object, Array, JSON, Set, String, Date, isFinite, parseFloat, encodeURIComponent, console, localStorage: mkStore(),
    AbortSignal: { timeout: () => undefined }, performance: { now: () => 0 }, setTimeout: () => 0,
    CG: cgData(PX), BNRESP: null,
    fetch: async (u) => { log.urls.push(String(u)); if (String(u).indexOf('api.binance.com') >= 0) { if (!c.BNRESP) return { ok: false, status: 451, json: async () => ({}) }; return { ok: true, json: async () => c.BNRESP }; } if (c.CGFAIL) throw new Error('HTTP 429'); return { ok: true, json: async () => c.CG }; },
    _aggregateRealPrice: (p) => { log.agg.push(p); }, markRealPriceReceived: () => {}, _setLiveIndicator: () => {}, syncPairPresets: () => {}, nowStr: () => 'x', rndHash: () => 'h', _simulationTickAll: () => {},
    _applyPaperRealProtection: () => { log.prot.push(S.tradingMode); }, _pairGenomeRollover: () => 0, _projectRealCandles: () => { log.proj.push(S.tradingMode); return 0; },
    resolvePairCycle: (pair, ps) => { log.cyc.push({ m: S.tradingMode, p: pair, px: ps.price, nc: (ps.candles || []).length, bg: c._bgResolve === true, beh: (typeof c._schoolBehind === 'function') ? c._schoolBehind() : null }); },
    lmsrP: (ps) => ps.qYes / (ps.qYes + ps.qNo), rv: [], fx: [],
    checkAntiRevenge: (usd, pct, pair) => { c.rv.push([usd, pct, pair]); }, emitVictoryParticles: (n) => { c.fx.push('particules ' + n); }, emitLossParticles: (n) => { c.fx.push('particules perte ' + n); },
    showMilestone: (i, t) => { c.fx.push('jalon ' + i); }, checkPnlAlerts: () => { c.fx.push('alertes'); }, checkBadges: () => { c.fx.push('badges'); },
    RC: {}, _rcLastPrice: (p) => (c.RC[p] ? c.RC[p].px : 0), _rcPriceAge: (p) => (c.RC[p] ? c.RC[p].age : Infinity),
    _decErr: (e) => { log.decErr.push(String(e && e.message || e)); } };
  c.window = c; c.log = log;
  vm.createContext(c);
  vm.runInContext(WALLET, c);
  ['sim', 'paperReal', 'real'].forEach(m => {
    const w = S.walletStore[m]; w.pairStates = {};
    ORDER.forEach((p, k) => { const px = (m === 'sim' && o.frozenSim) ? PX[p] * (1 + (k % 2 ? 0.03 : -0.05)) : PX[p]; w.pairStates[p] = mkPs(px, (m === 'sim' && p === 'BNB/USDT') ? 50 : (o.ncSim !== undefined && m === 'sim' ? o.ncSim : 60), k + (m === 'sim' ? 0 : m === 'paperReal' ? 20 : 40)); });
    w.running = !!(o.run && o.run[m]);
  });
  vm.runInContext(MAP + '\nlet _lastPriceFetch = 0, _pricesFetched = ' + (o.fetched === false ? 'false' : 'true') + ', _fetchInProgress = false, _priceRetryDelay = 2000; const _PRICE_RETRY_MAX = 32000; let _priceSource = 0, _cgFailCount = 0; const _CG_FAIL_THRESHOLD = 2;\n' +
    BN + '\n' + LIVE + '\n' + BLEND + '\n' + GEN + '\n' + FUND + '\nfunction __mx(tick) {\n' + MX + '\n}\nfunction __oracle() {\n' + ORACLE.generateur + '\n}' +
    '\nfunction __rv(realisedUsd, realisedPct, pos) {\n' + CP_RV + '\n  return (typeof _aaBehind === "undefined") ? null : _aaBehind;\n}' +
    '\nfunction __ms(realisedPct, pos, _aaBehind) { const pnlStr = "p", usdtStr = "u";\n' + CP_MS + '\n}' +
    '\nfunction __al(_aaBehind) {\n' + CP_AL + '\n}', c);
  S.agents = [];
  return { c, S, PAIRS, log, sim: () => S.walletStore.sim.pairStates, ev: () => S.walletStore.paperReal.pairStates, re: () => S.walletStore.real.pairStates, run: code => vm.runInContext(code, c) };
}
const EVSCREEN = { screen: 'paperReal', run: { sim: true, paperReal: true, real: false } };

(async () => {
console.log('▶ banc-ecole-vivante');

await T('G1 · _simCandleStep RÉEL = le générateur d\'avant, au bit près : 12 paires réglées, 300 pas, même hasard (prix reçus : sans borne ; jamais reçus : borné min / max) — bougies, prix, variation identiques', () => {
  [true, false].forEach(fetched => {
    const mk = () => { const w = world({ screen: 'sim', run: { sim: true }, seed: 11, fetched: fetched }); LIVEPAIRS.forEach((p, k) => { w.sim()[p] = mkPs(PX[p], [0, 1, 3, 25, 60][k % 5], k); }); delete w.sim()['GBP/USDT']; return w; };
    const a = mk(), b = mk();
    for (let i = 0; i < 300; i++) { a.run('_simCandleStep()'); b.run('__oracle()'); }
    assert.strictEqual(JSON.stringify(a.sim()), JSON.stringify(b.sim()), 'divergence avec le texte d\'avant (prix reçus : ' + fetched + ')');
    LIVEPAIRS.forEach(p => { assert.strictEqual(a.sim()[p].candles.length, 60); assert.ok(a.sim()[p].price > 0 && isFinite(a.sim()[p].price), p); });
    if (!fetched) LIVEPAIRS.forEach(p => assert.ok(a.sim()[p].price >= a.PAIRS[p].minP && a.sim()[p].price <= a.PAIRS[p].maxP, 'borné : ' + p));
  });
});

await T('G2 · paire RETIRÉE au milieu (GBP/USDT, dans le portefeuille, hors de PAIRS — l\'état de Rams) : aucune exception, GBP intacte, BNB (rangée après) reçoit sa bougie ; le texte d\'avant, lui, lève l\'exception et laisse BNB sans bougie', () => {
  const w = world({ screen: 'sim', run: { sim: true }, seed: 3 });
  const gbp0 = JSON.stringify(w.sim()['GBP/USDT']), bnb0 = w.sim()['BNB/USDT'].candles.length, btc0 = w.sim()['BTC/USDT'].candles[59].c;
  assert.strictEqual(bnb0, 50); assert.ok(!w.PAIRS['GBP/USDT'] && w.sim()['GBP/USDT']);
  w.run('_simCandleStep()');
  assert.strictEqual(JSON.stringify(w.sim()['GBP/USDT']), gbp0, 'GBP touchée');
  assert.strictEqual(w.sim()['BNB/USDT'].candles.length, 51, 'BNB sans bougie'); assert.notStrictEqual(w.sim()['BNB/USDT'].price, PX['BNB/USDT']);
  assert.strictEqual(w.sim()['BTC/USDT'].candles[59].o, btc0, 'la nouvelle bougie part de la clôture précédente');
  for (let i = 0; i < 20; i++) w.run('_simCandleStep()');
  assert.strictEqual(w.sim()['BNB/USDT'].candles.length, 60);
  const old = world({ screen: 'sim', run: { sim: true }, seed: 3 });
  assert.throws(() => old.run('__oracle()'), /vol/, 'le texte d\'avant devait lever l\'exception sur GBP');
  assert.strictEqual(old.sim()['BNB/USDT'].candles.length, 50, 'avant : BNB jamais servie');
});

await T('G3 · état abîmé (paire nulle, bougies absentes) : sautée sans exception, les autres servies', () => {
  const w = world({ screen: 'sim', run: { sim: true } });
  w.sim()['ETH/USDT'] = null; w.sim()['XRP/USDT'] = { price: 1.4 }; w.sim()['DOGE/USDT'].candles[59] = null;   // DOGE : une bougie nulle fait échouer le calcul de CETTE paire
  w.run('_simCandleStep()');
  assert.strictEqual(w.sim()['XRP/USDT'].candles, undefined); assert.strictEqual(w.sim()['SOL/USDT'].candles.length, 60); assert.notStrictEqual(w.sim()['SOL/USDT'].price, PX['SOL/USDT']);
  assert.notStrictEqual(w.sim()['BNB/USDT'].price, PX['BNB/USDT'], 'les paires rangées après la paire en défaut sont servies'); assert.strictEqual(w.sim()['BNB/USDT'].candles.length, 51);
  assert.strictEqual(w.log.decErr.length, 1, 'l\'erreur de la paire en défaut est signalée une fois (_decErr), pas avalée : ' + JSON.stringify(w.log.decErr));
});

await T('M1 · multiplexeur RÉEL, EV à l\'écran, AA en play derrière : à chaque passage de l\'AA (tick multiple de 3) ses 12 paires réglées reçoivent une bougie et un prix, APRÈS ses cycles ; S.tradingMode et _bgResolve rendus ; l\'EV (prix, bougies) n\'est pas écrit', () => {
  const w = world(Object.assign({ seed: 5 }, EVSCREEN));
  const ev0 = J(w.ev()), re0 = JSON.stringify(w.re()), sim0 = J(w.sim());
  w.run('__mx(3)');
  assert.strictEqual(w.S.tradingMode, 'paperReal'); assert.strictEqual(w.c._bgResolve, false);
  LIVEPAIRS.forEach(p => { const a = w.sim()[p], b = sim0[p];
    assert.strictEqual(a.candles.length, Math.min(60, b.candles.length + 1), p); assert.notStrictEqual(a.price, b.price, 'prix figé : ' + p);
    assert.strictEqual(a.candles[a.candles.length - 1].o, b.candles[b.candles.length - 1].c, 'la bougie part de la dernière clôture : ' + p); assert.strictEqual(a.price, a.candles[a.candles.length - 1].c); });
  assert.strictEqual(JSON.stringify(w.sim()['GBP/USDT'].candles), JSON.stringify(sim0['GBP/USDT'].candles), 'paire retirée : pas de bougie');
  const cs = w.log.cyc.filter(x => x.m === 'sim'); assert.ok(cs.length >= 3, 'cycles AA : ' + cs.length);
  cs.forEach(x => { assert.strictEqual(x.bg, true); assert.strictEqual(x.px, sim0[x.p].price, 'le cycle a vu le prix d\'AVANT le pas de marché : ' + x.p); });
  ORDER.forEach(p => { assert.strictEqual(w.ev()[p].price, ev0[p].price, 'EV prix : ' + p); assert.strictEqual(JSON.stringify(w.ev()[p].candles), JSON.stringify(ev0[p].candles), 'EV bougies : ' + p); });
  assert.strictEqual(JSON.stringify(w.re()), re0, 'RE (en pause) touché'); assert.deepStrictEqual(w.log.decErr, []);
});

await T('M2 · cadence : aux ticks non multiples de 3 l\'AA derrière n\'est pas traitée (ni cycle, ni bougie) ; sur 300 ticks, 100 bougies par paire — la cadence de l\'AA à l\'écran', () => {
  const w = world(Object.assign({ seed: 5, ncSim: 0 }, EVSCREEN));
  const s0 = JSON.stringify(w.sim());
  w.run('__mx(1)'); w.run('__mx(2)');
  assert.strictEqual(JSON.stringify(w.sim()), s0); assert.strictEqual(w.log.cyc.filter(x => x.m === 'sim').length, 0);
  let n = 0; for (let t = 3; t <= 302; t++) { const b = w.sim()['ETH/USDT'].candles.length ? w.sim()['ETH/USDT'].candles[w.sim()['ETH/USDT'].candles.length - 1] : null; w.run('__mx(' + t + ')'); const a = w.sim()['ETH/USDT'].candles[w.sim()['ETH/USDT'].candles.length - 1]; if (a !== b) n++; }
  assert.strictEqual(n, 100);
});

await T('M3 · AA en PAUSE : rien ne bouge chez elle, à aucun tick ; AA à l\'écran : le multiplexeur ne lui fabrique rien (le bloc de l\'écran s\'en charge, une fois)', () => {
  const w = world({ screen: 'paperReal', run: { sim: false, paperReal: true }, seed: 5 });
  const s0 = JSON.stringify(w.sim());
  for (let t = 1; t <= 30; t++) w.run('__mx(' + t + ')');
  assert.strictEqual(JSON.stringify(w.sim()), s0); assert.strictEqual(w.log.cyc.filter(x => x.m === 'sim').length, 0);
  const a = world({ screen: 'sim', run: { sim: true, paperReal: true }, seed: 5 });
  const c0 = J(a.sim());
  for (let t = 1; t <= 30; t++) a.run('__mx(' + t + ')');
  LIVEPAIRS.forEach(p => { assert.strictEqual(JSON.stringify(a.sim()[p].candles), JSON.stringify(c0[p].candles), 'bougie fabriquée par le multiplexeur pour l\'AA à l\'écran : ' + p); assert.strictEqual(a.sim()[p].price, c0[p].price); });
  assert.strictEqual(a.log.cyc.filter(x => x.m === 'sim').length > 0, true); assert.strictEqual(a.S.tradingMode, 'sim');
});

await T('M4 · modes RÉELS derrière l\'AA : jamais de bougie fabriquée — l\'EV et le RE en arrière-plan gardent leurs bougies et reçoivent le dernier prix réel accepté (règle du 27/09, inchangée)', () => {
  const w = world({ screen: 'sim', run: { sim: true, paperReal: true, real: true }, seed: 9 });
  LIVEPAIRS.forEach(p => { w.c.RC[p] = { px: PX[p] * 1.01, age: 1000 }; }); w.c.RC['DOT/USDT'].age = 500000;
  const ev0 = J(w.ev()), re0 = J(w.re());
  for (let t = 1; t <= 30; t++) w.run('__mx(' + t + ')');
  ['ev', 're'].forEach(k => { const now = w[k](), was = k === 'ev' ? ev0 : re0;
    ORDER.forEach(p => assert.strictEqual(JSON.stringify(now[p].candles), JSON.stringify(was[p].candles), k + ' bougies : ' + p));
    assert.strictEqual(now['BTC/USDT'].price, PX['BTC/USDT'] * 1.01); assert.strictEqual(now['DOT/USDT'].price, was['DOT/USDT'].price, 'prix de plus de 2 min : non posé'); });
  assert.ok(w.log.prot.includes('paperReal') && w.log.prot.includes('real') && !w.log.prot.includes('sim'));
});

await T('A1 · fetchLivePrices RÉEL, EV à l\'écran, AA en play derrière, prix de l\'AA figés loin du marché (−5 % / +3 %, comme le 10/10) : les 12 paires de l\'AA sont ancrées au prix reçu — posé tout de suite (écart > 0,5 %, dernière clôture comprise), cible gardée ; GBP (retirée) intacte ; l\'EV est IDENTIQUE à ce qu\'il est quand l\'AA est en pause', async () => {
  const w = world(Object.assign({ frozenSim: true, seed: 2 }, EVSCREEN)), ctl = world({ screen: 'paperReal', run: { sim: false, paperReal: true }, frozenSim: true, seed: 2 });
  const gbp0 = JSON.stringify(w.sim()['GBP/USDT']), ctlSim0 = JSON.stringify(ctl.sim());
  await w.run('fetchLivePrices(true)'); await ctl.run('fetchLivePrices(true)');
  LIVEPAIRS.forEach(p => { const sp = w.sim()[p], want = p === 'EUR/USDT' ? 1 / (1 / PX[p]) : PX[p];
    assert.ok(Math.abs(sp._targetPrice - want) <= 1e-12 * want, 'cible : ' + p); assert.ok(Math.abs(sp.price - want) <= 1e-12 * want, 'prix posé : ' + p); assert.strictEqual(sp.candles[sp.candles.length - 1].c, sp.price, 'dernière clôture : ' + p); });
  assert.strictEqual(JSON.stringify(w.sim()['GBP/USDT']), gbp0);
  assert.strictEqual(JSON.stringify(w.ev()), JSON.stringify(ctl.ev()), 'l\'EV diffère selon que l\'AA tourne derrière ou non'); assert.strictEqual(JSON.stringify(w.re()), JSON.stringify(ctl.re()));
  assert.strictEqual(JSON.stringify(ctl.sim()), ctlSim0, 'AA en pause : son portefeuille a été écrit'); assert.strictEqual(w.S.chainLog.length, ctl.S.chainLog.length);
});

await T('A1b · le cas normal du tablet — flux Binance VIVANT pour les 12 paires : CoinGecko ne touche alors ni le prix ni la cible de l\'EV à l\'écran (règle du 26/09), mais l\'AA derrière est ancrée 12/12 (son marché n\'a pas d\'autre source)', async () => {
  const w = world(Object.assign({ frozenSim: true, seed: 2 }, EVSCREEN));
  LIVEPAIRS.forEach(p => w.run('_bnLiveTs[' + JSON.stringify(p) + '] = Date.now()'));
  const ev0 = J(w.ev());
  await w.run('fetchLivePrices(true)');
  LIVEPAIRS.forEach(p => { assert.strictEqual(w.ev()[p]._targetPrice, undefined, 'EV ciblé par CoinGecko alors que Binance est vivant : ' + p); assert.strictEqual(w.ev()[p].price, ev0[p].price, 'EV prix : ' + p);
    assert.ok(w.sim()[p]._targetPrice > 0 && Math.abs(w.sim()[p].price / PX[p] - 1) < 1e-9, 'AA derrière non ancrée : ' + p); });
  assert.deepStrictEqual(w.log.agg, [], 'bougies réelles nourries par CoinGecko alors que Binance est vivant');
});

await T('A2 · règle d\'ancrage = celle de l\'écran : écart ≤ 0,5 % → prix NON posé, cible seulement ; cible déjà en cours → pas de saut même à 3 % ; prix nul ou absent refusé ; AA à l\'écran → _schoolBgAnchor ne fait rien (l\'ancrage d\'origine agit, une seule fois)', async () => {
  const w = world(Object.assign({ seed: 2 }, EVSCREEN));
  const sp = w.sim()['SOL/USDT'], px0 = sp.price;
  assert.strictEqual(w.run("_schoolBgAnchor('SOL/USDT', " + (px0 * 1.004) + ")"), true); assert.strictEqual(sp.price, px0); assert.strictEqual(sp._targetPrice, px0 * 1.004);
  assert.strictEqual(w.run("_schoolBgAnchor('SOL/USDT', " + (px0 * 1.03) + ")"), true); assert.strictEqual(sp.price, px0, 'saut alors qu\'une cible est en cours'); assert.strictEqual(sp._targetPrice, px0 * 1.03);
  assert.strictEqual(w.run("_schoolBgAnchor('SOL/USDT', 0)"), false); assert.strictEqual(w.run("_schoolBgAnchor('SOL/USDT', NaN)"), false); assert.strictEqual(w.run("_schoolBgAnchor('FOO/USDT', 5)"), false);
  // le seuil : 0,4 % → pas de saut ; 0,6 % → saut (prix et dernière clôture) ; et l'ancrage n'écrit QUE le prix, la cible et la dernière clôture
  const a4 = w.sim()['ADA/USDT'], p4 = a4.price; w.run("_schoolBgAnchor('ADA/USDT', " + (p4 * 1.004) + ")"); assert.strictEqual(a4.price, p4, '0,4 % : saut');
  const a6 = w.sim()['LINK/USDT'], b6 = J(a6), p6 = a6.price; w.run("_schoolBgAnchor('LINK/USDT', " + (p6 * 1.006) + ")"); assert.strictEqual(a6.price, p6 * 1.006, '0,6 % : pas de saut'); assert.strictEqual(a6.candles[59].c, p6 * 1.006);
  const after = J(a6); assert.deepStrictEqual(Object.keys(after).sort(), Object.keys(b6).concat(['_targetPrice']).sort(), 'champ en plus');
  Object.keys(b6).forEach(k => { if (k !== 'price' && k !== 'candles') assert.deepStrictEqual(after[k], b6[k], 'champ modifié : ' + k); });
  assert.deepStrictEqual(after.candles.slice(0, 59), b6.candles.slice(0, 59)); assert.deepStrictEqual(Object.assign({}, after.candles[59], { c: 0 }), Object.assign({}, b6.candles[59], { c: 0 }), 'la dernière bougie : seule sa clôture change');
  const a = world({ screen: 'sim', run: { sim: true, paperReal: true }, frozenSim: true, seed: 2 });
  assert.strictEqual(a.run("_schoolBgAnchor('SOL/USDT', 100)"), false); assert.strictEqual(a.run("_schoolBgPs('SOL/USDT')"), null);
  const ev0 = JSON.stringify(a.ev());
  await a.run('fetchLivePrices(true)');
  LIVEPAIRS.forEach(p => assert.ok(a.sim()[p]._targetPrice > 0 && Math.abs(a.sim()[p].price / PX[p] - 1) < 1e-9, 'AA à l\'écran ancrée par les lignes d\'origine : ' + p));
  assert.strictEqual(JSON.stringify(a.ev()), ev0, 'EV derrière l\'AA écrit par CoinGecko');
});

await T('A3 · secours Binance RÉEL (CoinGecko en panne deux fois), EV à l\'écran, AA derrière : l\'AA reçoit le même ancrage pour les paires servies', async () => {
  const w = world(Object.assign({ frozenSim: true, seed: 2 }, EVSCREEN));
  w.c.CGFAIL = true; w.c.BNRESP = [{ symbol: 'BTCUSDT', lastPrice: '82800.5', priceChangePercent: '-1.2', openPrice: '83800' }, { symbol: 'PEPEUSDT', lastPrice: '0.00000405', priceChangePercent: '-2.3', openPrice: '0.00000414' }];
  await w.run('fetchLivePrices(true)'); await w.run('fetchLivePrices(true)');
  assert.ok(w.log.urls.some(u => u.indexOf('api.binance.com/api/v3/ticker/24hr') >= 0), 'secours non appelé');
  assert.strictEqual(w.sim()['BTC/USDT']._targetPrice, 82800.5); assert.strictEqual(w.sim()['BTC/USDT'].price, 82800.5); assert.strictEqual(w.sim()['PEPE/USDT']._targetPrice, 0.00000405);
  assert.strictEqual(w.sim()['ETH/USDT']._targetPrice, undefined, 'paire non servie par le secours : pas d\'ancrage');
});

await T('E1 · AA derrière l\'EV pendant 50 minutes de battements (3 000 ticks, prix reçu toutes les 15 s, marché réel en dérive de +3 %) : jamais figée (60 clôtures distinctes par paire), toujours près du marché (< 1 % ; PEPE, sous le pas du mélange, < 2 %) ; l\'EV identique à ce qu\'il est AA en pause', async () => {
  const w = world(Object.assign({ frozenSim: true, seed: 21 }, EVSCREEN)), ctl = world({ screen: 'paperReal', run: { sim: false, paperReal: true }, frozenSim: true, seed: 21 });
  const ctlSim0 = JSON.stringify(ctl.sim());
  let worst = 0, worstP = '';
  for (let t = 1; t <= 3000; t++) {
    if (t % 15 === 1) { const k = 1 + 0.03 * t / 3000, px = {}; ORDER.forEach(p => { px[p] = p === 'EUR/USDT' ? PX[p] : PX[p] * k; }); w.c.CG = cgData(px); ctl.c.CG = cgData(px); await w.run('fetchLivePrices(true)'); await ctl.run('fetchLivePrices(true)');
      if (t > 60) LIVEPAIRS.forEach(p => { const e = Math.abs(w.sim()[p].price / px[p] - 1); if (e > worst) { worst = e; worstP = p; } assert.ok(e < (p === 'PEPE/USDT' ? 0.02 : 0.01), 'écart au marché ' + p + ' : ' + (e * 100).toFixed(3) + ' % au tick ' + t); }); }
    w.run('__mx(' + t + ')'); ctl.run('__mx(' + t + ')');
  }
  LIVEPAIRS.forEach(p => { const cl = new Set(w.sim()[p].candles.map(k => k.c)); assert.strictEqual(w.sim()[p].candles.length, 60); assert.ok(cl.size >= 59, 'clôtures distinctes ' + p + ' : ' + cl.size); });
  assert.strictEqual(JSON.stringify(w.ev()), JSON.stringify(ctl.ev()), 'EV'); assert.strictEqual(JSON.stringify(w.re()), JSON.stringify(ctl.re()), 'RE');
  assert.strictEqual(w.log.cyc.filter(x => x.m === 'paperReal').length, ctl.log.cyc.filter(x => x.m === 'paperReal').length, 'cycles EV'); assert.deepStrictEqual(w.log.decErr, []);
  assert.strictEqual(JSON.stringify(ctl.sim()), ctlSim0, 'AA en pause : son portefeuille a bougé');
  console.log('       pire écart au marché : ' + (worst * 100).toFixed(3) + ' % (' + worstP + ')');
});

await T('R1 · _schoolBehind RÉEL : vrai seulement quand le mode en cours est sim ET qu\'un autre mode est à l\'écran (drapeau du multiplexeur, ou mode vu par le battement ET par l\'horloge de 01 — photo vieillie = non) ; le multiplexeur RÉEL pose le mode de l\'écran à chaque tick ; pendant les cycles de l\'AA derrière → vrai, de l\'AA à l\'écran → faux, de l\'EV → faux', () => {
  const w = world(Object.assign({ seed: 5 }, EVSCREEN));
  const at = (mode, bg, scr) => { w.S.tradingMode = mode; w.c._bgResolve = bg; w.c._auraScreenMode = scr; const r = w.run('_schoolBehind()'); w.S.tradingMode = 'paperReal'; w.c._bgResolve = false; return r; };
  assert.strictEqual(at('sim', true, undefined), true); assert.strictEqual(at('sim', false, 'paperReal'), true); assert.strictEqual(at('sim', false, 'real'), true);
  assert.strictEqual(at('sim', false, 'sim'), false, 'AA à l\'écran'); assert.strictEqual(at('sim', false, undefined), false, 'écran inconnu : comme avant');
  assert.strictEqual(at('paperReal', true, 'sim'), false, 'EV derrière l\'AA : un mode réel garde ses gardes'); assert.strictEqual(at('real', true, 'sim'), false); assert.strictEqual(at('paperReal', false, 'paperReal'), false);
  // l'horloge de 01 (maître du mode affiché, à jour dès la bascule) doit le dire aussi : photo du battement vieillie (tout en pause, ou seconde qui suit une bascule) → non
  const chr = m => { w.c.AuraChrono = (m === null) ? undefined : { getCurrentMode: () => m }; };
  chr('sim'); assert.strictEqual(at('sim', false, 'paperReal'), false, 'photo vieillie : l\'horloge montre l\'AA à l\'écran → fermeture traitée comme à l\'écran'); assert.strictEqual(at('sim', true, 'paperReal'), true, 'le drapeau du multiplexeur suffit');
  chr('paperReal'); assert.strictEqual(at('sim', false, 'paperReal'), true); assert.strictEqual(at('sim', false, 'sim'), false, 'la photo dit AA à l\'écran'); assert.strictEqual(at('sim', false, undefined), false);
  chr('real'); assert.strictEqual(at('sim', false, 'paperReal'), true); assert.strictEqual(at('paperReal', false, 'real'), false);
  w.c.AuraChrono = { getCurrentMode: () => { throw new Error('horloge en défaut'); } }; assert.strictEqual(at('sim', false, 'paperReal'), false, 'horloge en défaut : non, comme à l\'écran');
  chr(null);
  w.c._auraScreenMode = undefined; w.run('__mx(3)');
  assert.strictEqual(w.c._auraScreenMode, 'paperReal', 'le battement ne pose pas le mode de l\'écran');
  for (let t = 4; t <= 9; t++) w.run('__mx(' + t + ')');
  const cs = w.log.cyc; assert.ok(cs.some(x => x.m === 'sim') && cs.some(x => x.m === 'paperReal'));
  cs.forEach(x => assert.strictEqual(x.beh, x.m === 'sim', 'pendant le cycle ' + x.m + ' ' + x.p));
  // 10f _lossCapSweep bascule vers sim SANS le drapeau du multiplexeur : le mode de l'écran gardé par le battement tranche
  w.S.tradingMode = 'sim'; assert.strictEqual(w.c._bgResolve, false); assert.strictEqual(w.run('_schoolBehind()'), true, 'bascule de la perte max'); w.S.tradingMode = 'paperReal';
  const a = world({ screen: 'sim', run: { sim: true, paperReal: true }, seed: 5 }); a.run('__mx(3)');
  assert.strictEqual(a.c._auraScreenMode, 'sim'); a.log.cyc.forEach(x => assert.strictEqual(x.beh, false, 'AA à l\'écran, cycle ' + x.m));
});

await T('R2 · closePosition, fragments RÉELS exécutés : une fermeture de l\'AA DERRIÈRE l\'EV n\'arme pas l\'anti-revenge commun (aucun appel), ne vérifie ni alertes ni badges, n\'affiche ni jalon ni particules, même à −6 % ou +6 % ; AA à l\'écran, EV à l\'écran, EV derrière l\'AA : tout comme avant', () => {
  const w = world(Object.assign({ seed: 5 }, EVSCREEN));
  const set = (mode, bg, scr) => { w.S.tradingMode = mode; w.c._bgResolve = bg; w.c._auraScreenMode = scr; w.c.rv.length = 0; w.c.fx.length = 0; };
  const pos = "{ pair: 'PEPE/USDT', side: 'short' }";
  // AA derrière l'EV (multiplexeur), puis (perte max : pas de drapeau)
  [[true, 'paperReal'], [false, 'paperReal'], [true, 'real']].forEach(([bg, scr]) => {
    set('sim', bg, scr);
    assert.strictEqual(w.run('__rv(-1.2, -2.32, ' + pos + ')'), true); assert.deepStrictEqual(J(w.c.rv), [], 'anti-revenge armé par l\'AA derrière');
    [6, 2.5, -6, 1].forEach(pct => w.run('__ms(' + pct + ', ' + pos + ', true)')); w.run('__al(true)');
    assert.deepStrictEqual(J(w.c.fx), [], 'effet d\'écran pour l\'AA derrière');
  });
  // AA à l'écran : comme avant
  set('sim', false, 'sim');
  assert.strictEqual(w.run('__rv(-1.2, -2.32, ' + pos + ')'), false); assert.deepStrictEqual(J(w.c.rv), [[-1.2, -2.32, 'PEPE/USDT']]);
  [6, 2.5, -6, 1].forEach(pct => w.run('__ms(' + pct + ', ' + pos + ', false)')); w.run('__al(false)');
  assert.deepStrictEqual(J(w.c.fx), ['particules 55', 'jalon 🎉', 'particules 22', 'jalon 💰', 'particules perte 15', 'jalon ⚠️', 'alertes', 'badges']);
  // EV à l'écran, et EV derrière l'AA (mode réel en arrière-plan) : la garde reste
  set('paperReal', false, 'paperReal'); assert.strictEqual(w.run('__rv(-1.2, -2.32, ' + pos + ')'), false); assert.strictEqual(w.c.rv.length, 1);
  set('paperReal', true, 'sim'); assert.strictEqual(w.run('__rv(-0.8, -1.5, ' + pos + ')'), false); assert.deepStrictEqual(J(w.c.rv), [[-0.8, -1.5, 'PEPE/USDT']]);
  w.S.tradingMode = 'paperReal'; w.c._bgResolve = false;
  // textes : les quatre gardes sont dans closePosition, _aaBehind est posé une fois, avant son premier usage ; 06 et 09c (l'état commun et sa porte) non touchés par l'idée
  const cc = codeStrict(CLOSE);
  assert.strictEqual(cc.split("const _aaBehind = (typeof _schoolBehind === 'function') && _schoolBehind();").length - 1, 1);
  assert.strictEqual(cc.split('_aaBehind').length - 1, 5, 'définition + 4 gardes : anti-revenge, alertes, badges, jalons');
  assert.ok(cc.indexOf('const _aaBehind') < cc.indexOf('if (!_aaBehind && typeof checkAntiRevenge'));
  assert.ok(cc.includes("  showToast('Fermé '+pos.pair+levTag+' · '+pnlStr+' · '+usdtStr);"), 'le toast de fermeture reste pour tous');
});

await T('R3 · getFundamentalSignals RÉEL : le cache est tenu PAR MODE — une valeur calculée pendant le passage de l\'AA (ses bougies fabriquées : +5 %) n\'est jamais relue par l\'EV (son marché : −5 %) dans la même fenêtre de 5 cycles ; dans un même mode le cache sert toujours', () => {
  const w = world(Object.assign({ seed: 5 }, EVSCREEN)); w.S.cycle = 1000;
  w.sim()['ETH/USDT'].pnl24h = 5; w.sim()['BTC/USDT'].pnl24h = 2; w.ev()['ETH/USDT'].pnl24h = -5; w.ev()['BTC/USDT'].pnl24h = -2;
  w.S.tradingMode = 'sim'; const fa = w.run("getFundamentalSignals('ETH/USDT')");
  w.S.tradingMode = 'paperReal'; const fe = w.run("getFundamentalSignals('ETH/USDT')"), fe2 = w.run("getFundamentalSignals('ETH/USDT')");
  assert.strictEqual(fa.momentum.score, 0.5); assert.strictEqual(fe.momentum.score, -0.5, 'l\'EV a relu la valeur de l\'AA'); assert.strictEqual(fe.corr.score, -0.6); assert.ok(fe.fundScore < fa.fundScore);
  assert.strictEqual(fe2, fe, 'même mode, même fenêtre : le cache ne sert plus');
  w.S.tradingMode = 'sim'; assert.strictEqual(w.run("getFundamentalSignals('ETH/USDT')").momentum.score, 0.5); w.S.tradingMode = 'paperReal';
  w.S.cycle = 1005; assert.notStrictEqual(w.run("getFundamentalSignals('ETH/USDT')"), fe, 'fenêtre suivante : recalculé');
});

await T('R4 · portefeuille d\'école abîmé : il n\'arrête ni la bougie des autres paires (mélange et bougie ont chacun leur garde) ni le lot de prix de l\'EV à l\'écran (12 paires servies, aucun échec compté)', async () => {
  const w = world(Object.assign({ frozenSim: true, seed: 5 }, EVSCREEN));
  w.sim()['ETH/USDT'] = null; w.sim()['XRP/USDT'].candles[59] = null; delete w.sim()['ADA/USDT'].candles;
  await w.run('fetchLivePrices(true)');
  LIVEPAIRS.forEach(p => assert.ok(typeof w.ev()[p].pnl24h === 'number' && w.ev()[p]._targetPrice > 0, 'EV non servi : ' + p));
  assert.strictEqual(w.run('_cgFailCount'), 0, 'le lot CoinGecko a été compté comme un échec'); assert.ok(w.sim()['SOL/USDT']._targetPrice > 0 && w.sim()['XRP/USDT']._targetPrice > 0);
  const n0 = w.sim()['SOL/USDT'].candles.length, last0 = w.sim()['SOL/USDT'].candles[n0 - 1];
  w.run('__mx(3)');
  assert.notStrictEqual(w.sim()['SOL/USDT'].candles[w.sim()['SOL/USDT'].candles.length - 1], last0, 'bougie non fabriquée après l\'échec du mélange');
  assert.ok(w.log.decErr.length >= 1, 'l\'échec du mélange est signalé (_decErr), pas avalé'); assert.strictEqual(w.S.tradingMode, 'paperReal');
});

await T('S1 · textes : le générateur n\'est appelé qu\'à DEUX endroits (écran : mode sim, bloc du tick sur trois ; arrière-plan : multiplexeur, mode sim, avant de rendre la main) ; l\'ancrage qu\'aux deux arrivées de prix ; l\'école ne note toujours pas (03) ; rien pour l\'EV / le RE', () => {
  const c08 = codeStrict(s08), c02 = codeStrict(s02);
  assert.strictEqual(c08.split('_simCandleStep()').length - 1, 3, 'définition + 2 appels');
  assert.strictEqual(c08.split("    if (S.tradingMode === 'sim') _simCandleStep();\n  }\n").length - 1, 1, 'appel de l\'écran');
  const iScr = c08.indexOf("    if (S.tradingMode === 'sim') _simCandleStep();"), iBlk = c08.lastIndexOf('  if(tick % 3 === 0) {\n', iScr); assert.ok(iBlk > 0 && c08.slice(iBlk, iScr).indexOf('\n  }\n') < 0, 'hors du bloc du tick sur trois');
  const bg = "    if (_isBg && S.tradingMode === 'sim') {\n      try { blendRealPrices(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }\n      try { _simCandleStep(); } catch(e) { try{window._decErr&&window._decErr(e)}catch(_e){} }\n    }\n    if (_isBg) { S.tradingMode = _mDisp; window._bgResolve = false; }\n";
  assert.strictEqual(c08.split(bg).length - 1, 1, 'appel de l\'arrière-plan (deux gardes séparées), juste avant de rendre le mode');
  assert.ok(c08.indexOf(bg) > c08.indexOf('          resolvePairCycle(pair, ps);'), 'après les cycles');
  assert.ok(GEN.includes('    if (!cfg || !ps || !Array.isArray(ps.candles)) return;'), 'garde de la paire retirée');
  assert.ok(!/realPairCycle|openPositions|tradingAccount|cashAccount|fitness|agents/.test(codeStrict(GEN)), 'le générateur touche autre chose que prix et bougies');
  assert.strictEqual(c02.split('_schoolBgAnchor(pair, realPrice)').length - 1, 3, 'définition + 2 arrivées de prix');
  assert.ok(codeStrict(fnSrc(s02, '_schoolBgPs')).includes("S.tradingMode === 'sim') return null;") && codeStrict(fnSrc(s02, '_schoolBgPs')).includes("!_isModeRunning('sim')) return null;") && codeStrict(fnSrc(s02, '_schoolBgPs')).includes("_walletFor('sim')"));
  assert.ok(s03.includes("  if (S.tradingMode === 'sim') { try { S._simLearnSkipped = (S._simLearnSkipped || 0) + 1; } catch(e) {} return; }"), 'l\'école note de nouveau les agents ?');
  assert.ok(s08.includes("    if (_isBg && (S.tradingMode === 'paperReal' || S.tradingMode === 'real') && typeof _rcLastPrice === 'function' && typeof _rcPriceAge === 'function') {"), 'règle du 27/09 pour les modes réels');
  assert.ok(rd('js/01-chrono-network.js').includes("      try { simTick(); } catch(e) { console.warn('[AURA simTick]', e); try { if (window._decErr) window._decErr(e); } catch(_e) {} }"), '01 : une exception du battement est dite au journal');
  assert.ok(/\n  Object\.entries\(S\.pairStates\)\.forEach\(\(\[pair, ps\]\) => \{\n    try \{[^\n]*\n    const cfg  = PAIRS\[pair\];/.test(GEN) && GEN.includes("    } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }\n  });\n}"), 'garde par paire dans le générateur');
  assert.strictEqual(c08.split("_fundCache[pair].mode === S.tradingMode").length - 1, 1); assert.ok(c08.includes("_fundCache[pair] = { tick: Math.floor(S.cycle / 5), mode: S.tradingMode, val: result };"), 'cache fondamental par mode');
  assert.strictEqual(c08.split('window._auraScreenMode = _mDisp;').length - 1, 1, 'le battement garde le mode de l\'écran');
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S) : ' + failed.join(', ') : ''));
process.exit(fail ? 1 : 0);
})();
