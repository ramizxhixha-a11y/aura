// banc-prix-12-paires.js — [PRIX 12 PAIRES · 26/09/2026] VERSION 20260926l
// Rams : « prix réels mis à jour : 9 paires via CoinGecko — pourquoi pas 12 ? ». Les demandes CoinGecko et le secours Binance
// utilisaient des listes FIGÉES (10 paires de 07/2026, dont MATIC) : BNB, PEPE, EUR jamais mis à jour. Fonctions RÉELLES de 02 en vm,
// réponses au format réel (CoinGecko relevé le 26/09).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js');
const MAP = between(s02, 'const CG_IDS_BY_SYM = {', 'window._cgIdFor = _cgIdFor;', false);
const BN = between(s02, 'function _bnSymbolMap() {', '\nfunction _simulationTickAll() {', false);
const LIVE = between(s02, 'async function fetchLivePrices(force = false) {', '\n// v7.0: Watchdog', false);
const PAIRS12 = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'PEPE', 'EUR'].map(s => s + '/USDT');
// réponse réelle (curl 26/09) complétée pour les 9 premières paires
const CG = { binancecoin: { usd: 770.86, usd_24h_change: -0.5152375397423721, eur: 676.73, eur_24h_change: -0.44 }, pepe: { usd: 4.36e-06, usd_24h_change: -2.307826824985219 },
  tether: { usd: 0.999802, usd_24h_change: -0.00089, eur: 0.877712, eur_24h_change: 0.07274858648083919 },
  bitcoin: { usd: 109000, usd_24h_change: 1.2 }, ethereum: { usd: 3900, usd_24h_change: -0.8 }, ripple: { usd: 2.8, usd_24h_change: 0.3 }, solana: { usd: 200, usd_24h_change: 2.1 },
  dogecoin: { usd: 0.22, usd_24h_change: -1.5 }, polkadot: { usd: 3.9, usd_24h_change: 0.1 }, cardano: { usd: 0.8, usd_24h_change: 0.4 }, 'avalanche-2': { usd: 29, usd_24h_change: 1 }, chainlink: { usd: 21, usd_24h_change: -0.2 } };
function mkStore() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; }
function ctx(extra) {
  const PAIRS = {}; PAIRS12.forEach(p => { PAIRS[p] = { minP: 1, maxP: 2, vol: 1 }; });
  const c = Object.assign({ PAIRS, Math, Number, Object, Array, JSON, Set, String, Date, isFinite, parseFloat, encodeURIComponent, console, window: {}, localStorage: mkStore(),
    AbortSignal: { timeout: () => undefined }, performance: { now: () => 0 } }, extra || {});
  vm.createContext(c); vm.runInContext(MAP, c); return c;
}
(async () => {
console.log('▶ banc-prix-12-paires');
await T('D1 · _cgIdFor RÉEL : les 12 paires actives ont un identifiant (EUR → tether) ; symbole inconnu → null ; cache de l\'appareil lu', () => {
  const c = ctx();
  const ids = PAIRS12.map(p => vm.runInContext('_cgIdFor(' + JSON.stringify(p) + ')', c));
  assert.deepStrictEqual(ids, ['bitcoin', 'ethereum', 'ripple', 'solana', 'dogecoin', 'polkadot', 'cardano', 'avalanche-2', 'chainlink', 'binancecoin', 'pepe', 'tether']);
  assert.strictEqual(vm.runInContext("_cgIdFor('GBP/USDT')", c), 'tether'); assert.strictEqual(vm.runInContext("_cgIdFor('FOO/USDT')", c), null); assert.strictEqual(vm.runInContext("_cgIdFor('')", c), null);
  c.localStorage.setItem('aura_cg_ids', JSON.stringify({ FOO: 'foo' })); vm.runInContext('_cgIdsCache = null', c);
  assert.strictEqual(vm.runInContext("_cgIdFor('FOO/USDT')", c), 'foo');
});
await T('D2 · _cgQuote RÉEL sur la réponse réelle : BNB, PEPE au prix USD ; EUR/USDT = 1 / (USDT en EUR) et variation inversée ; absente → null', () => {
  const c = ctx(); c.D = CG;
  const q = p => JSON.parse(JSON.stringify(vm.runInContext('_cgQuote(' + JSON.stringify(p) + ', D)', c)));
  assert.deepStrictEqual(q('BNB/USDT'), { price: 770.86, change: -0.5152375397423721 }); assert.strictEqual(q('PEPE/USDT').price, 4.36e-06);
  const e = q('EUR/USDT'); assert.ok(Math.abs(e.price - 1 / 0.877712) < 1e-12 && Math.abs(e.price - 1.13933) < 1e-4, e.price);
  assert.ok(Math.abs(e.change - (1 / (1 + 0.07274858648083919 / 100) - 1) * 100) < 1e-12 && e.change < 0, 'USDT +0,07 % en EUR = EUR −0,07 % en USDT : ' + e.change);
  assert.strictEqual(vm.runInContext("_cgQuote('GBP/USDT', D)", c), null, 'pas de cotation GBP dans la réponse');
  assert.strictEqual(vm.runInContext("_cgQuote('FOO/USDT', D)", c), null);
});
function liveCtx(mode, freshPairs) {
  const agg = [], urls = [];
  const S = { tradingMode: mode, pairStates: {}, chainLog: [] };
  PAIRS12.forEach(p => { S.pairStates[p] = { price: 1, candles: [{ c: 1 }] }; });
  const c = ctx({ S, fetch: async (u) => { urls.push(u); return { ok: true, json: async () => CG }; }, _aggregateRealPrice: (p, px) => agg.push(p), markRealPriceReceived: () => {}, _setLiveIndicator: () => {},
    syncPairPresets: () => {}, nowStr: () => 'x', rndHash: () => 'h', fetchBinancePrices: async () => false, _simulationTickAll: () => {}, setTimeout: () => 0 });
  vm.runInContext('let _lastPriceFetch = 0, _pricesFetched = false, _fetchInProgress = false, _priceRetryDelay = 2000; const _PRICE_RETRY_MAX = 32000; let _priceSource = 0, _cgFailCount = 0; const _CG_FAIL_THRESHOLD = 2;\n' + LIVE, c);
  const now = Date.now(); (freshPairs || []).forEach(p => { c._bnLiveTs[p] = now; });
  vm.runInContext('_bnLiveTs = this._bnLiveTs || _bnLiveTs;', c);
  return { c, S, agg, urls };
}
await T('D3 · fetchLivePrices RÉEL (EV) : UNE demande couvrant les 12 paires (12 identifiants uniques, usd + eur) ; variation 24 h des 12 ; Binance vivant pour 9 → CoinGecko ne touche NI prix NI bougies de ces 9, sert de secours aux 3 autres ; journal « 12/12 · secours pour 3 »', async () => {
  const fresh = PAIRS12.slice(0, 9);
  const t = liveCtx('paperReal', fresh);
  fresh.forEach(p => { vm.runInContext('_bnLiveTs[' + JSON.stringify(p) + '] = Date.now()', t.c); });
  await vm.runInContext('fetchLivePrices(true)', t.c);
  assert.strictEqual(t.urls.length, 1);
  const u = decodeURIComponent(t.urls[0]), ids = (u.match(/ids=([^&]+)/) || [])[1].split(',');
  assert.strictEqual(ids.length, 12); ['binancecoin', 'pepe', 'tether', 'bitcoin'].forEach(i => assert.ok(ids.includes(i), i)); assert.ok(!ids.includes('matic-network'), 'plus de MATIC');
  assert.ok(/vs_currencies=usd,eur&/.test(u), u);
  PAIRS12.forEach(p => assert.ok(typeof t.S.pairStates[p].pnl24h === 'number', 'variation 24 h : ' + p));
  assert.deepStrictEqual(t.agg.sort(), ['BNB/USDT', 'EUR/USDT', 'PEPE/USDT'], 'bougies nourries seulement en secours');
  assert.strictEqual(t.S.pairStates['BTC/USDT']._targetPrice, undefined, 'BTC : Binance vivant, prix non touché'); assert.strictEqual(t.S.pairStates['BTC/USDT'].price, 1);
  assert.strictEqual(t.S.pairStates['BNB/USDT']._targetPrice, 770.86, 'BNB : secours');
  assert.ok(Math.abs(t.S.pairStates['EUR/USDT']._targetPrice - 1 / 0.877712) < 1e-12);
  assert.strictEqual(t.S.chainLog[0].desc, 'Prix réels mis à jour: 12/12 paires via CoinGecko · secours de Binance pour 3');
});
await T('D3b · même appel en école (AA) : le prix de l\'école reste ancré sur CoinGecko pour les 12 ; les bougies RÉELLES restent protégées quand Binance est vivant', async () => {
  const t = liveCtx('sim', []);
  PAIRS12.slice(0, 9).forEach(p => { vm.runInContext('_bnLiveTs[' + JSON.stringify(p) + '] = Date.now()', t.c); });
  await vm.runInContext('fetchLivePrices(true)', t.c);
  PAIRS12.forEach(p => assert.ok(t.S.pairStates[p]._targetPrice > 0, 'AA ancré : ' + p));
  assert.deepStrictEqual(t.agg.sort(), ['BNB/USDT', 'EUR/USDT', 'PEPE/USDT']);
});
await T('D4 · secours Binance RÉEL : symboles construits depuis les 12 paires actives (EURUSDT, PEPEUSDT, BNBUSDT ; plus de MATICUSDT)', async () => {
  const urls = [];
  const S = { pairStates: {} }; PAIRS12.forEach(p => { S.pairStates[p] = { price: 1, candles: [{ c: 1 }] }; });
  const c = ctx({ S, fetch: async (u) => { urls.push(u); return { ok: true, json: async () => [{ symbol: 'PEPEUSDT', lastPrice: '0.00000436', priceChangePercent: '-2.3' }, { symbol: 'EURUSDT', lastPrice: '1.1391', priceChangePercent: '-0.07' }] }; },
    _aggregateRealPrice: () => {}, markRealPriceReceived: () => {}, _setLiveIndicator: () => {} });
  vm.runInContext('let _lastPriceFetch = 0, _pricesFetched = false, _priceSource = 0;\n' + BN, c);
  const syms = Object.values(JSON.parse(JSON.stringify(vm.runInContext('_bnSymbolMap()', c))));
  assert.strictEqual(syms.length, 12); ['EURUSDT', 'PEPEUSDT', 'BNBUSDT', 'BTCUSDT'].forEach(sy => assert.ok(syms.includes(sy), sy)); assert.ok(!syms.includes('MATICUSDT'));
  assert.strictEqual(await vm.runInContext('fetchBinancePrices()', c), true);
  assert.ok(decodeURIComponent(urls[0]).includes('"EURUSDT"'));
  assert.strictEqual(S.pairStates['EUR/USDT'].pnl24h, -0.07); assert.strictEqual(S.pairStates['PEPE/USDT']._targetPrice, 0.00000436);
});
await T('D5 · _cgResolveUnknown RÉEL : paire au symbole inconnu → UNE recherche CoinGecko, premier résultat au symbole EXACT mis en cache ; pas de nouvel essai avant 24 h ; hors ligne : rien', async () => {
  const calls = [];
  const c = ctx({ fetch: async (u) => { calls.push(u); return { ok: true, json: async () => ({ coins: [{ id: 'foo-token', symbol: 'FOOX' }, { id: 'foo', symbol: 'FOO' }] }) }; } });
  c.PAIRS['FOO/USDT'] = { minP: 1, maxP: 2, vol: 1 };
  assert.strictEqual(await vm.runInContext('_cgResolveUnknown()', c), 1);
  assert.ok(calls[0].endsWith('/search?query=FOO')); assert.strictEqual(vm.runInContext("_cgIdFor('FOO/USDT')", c), 'foo');
  assert.strictEqual(JSON.parse(c.localStorage.getItem('aura_cg_ids')).FOO, 'foo', 'cache de l\'appareil');
  c.PAIRS['BAR/USDT'] = { minP: 1, maxP: 2, vol: 1 };
  const c2calls = calls.length;
  c.fetch = async (u) => { calls.push(u); return { ok: true, json: async () => ({ coins: [] }) }; };
  assert.strictEqual(await vm.runInContext('_cgResolveUnknown()', c), 0); assert.strictEqual(calls.length, c2calls + 1, 'BAR cherché une fois');
  assert.strictEqual(await vm.runInContext('_cgResolveUnknown()', c), 0); assert.strictEqual(calls.length, c2calls + 1, 'pas de nouvel essai avant 24 h');
  c.PAIRS['BAZ/USDT'] = { minP: 1, maxP: 2, vol: 1 }; c.window._auraNetOffline = true;
  assert.strictEqual(await vm.runInContext('_cgResolveUnknown()', c), 0); assert.strictEqual(calls.length, c2calls + 1, 'hors ligne : rien');
});
await T('S1 · textes : plus de liste figée (COINGECKO_IDS / BINANCE_SYMBOLS à 10 paires) ; flux Binance marqué vivant aux 3 entrées (WS de fond, WS principal, kline)', () => {
  const c02 = codeStrict(s02);
  assert.ok(!c02.includes('const COINGECKO_IDS') && !c02.includes("'MATIC/USDT':'MATICUSDT'"));
  assert.ok(c02.includes("      _bnLiveTs[pair] = Date.now();   // [PRIX 12 PAIRES · 26/09/2026] Binance vivant pour cette paire") || s02.includes('      _bnLiveTs[pair] = Date.now();   // [PRIX 12 PAIRES · 26/09/2026] Binance vivant pour cette paire'));
  assert.ok(s02.includes('try { if (_realCandlesState.wsPair) _bnLiveTs[_realCandlesState.wsPair] = Date.now(); } catch(e) {}'));
  assert.ok(s02.includes('  _bnLiveTs[pair] = Date.now();   // [PRIX 12 PAIRES · 26/09/2026] kline Binance reçue'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
})();
