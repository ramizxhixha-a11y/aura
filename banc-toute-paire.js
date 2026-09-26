// banc-toute-paire.js — [TOUTE PAIRE AUTOMATIQUE · 26/09/2026] VERSION 20260926m
// Rams : « si je veux ajouter une autre paire, tout se mettra en place automatiquement ? ». Audit : prix (CoinGecko + secours
// Binance, 20260926l), flux Binance, carnet, liquidations, contexte 1 h/4 h, règles apprises, génome de paire, attribution, plafonds :
// tous construits depuis les paires actives. Restaient trois listes figées : news (8 paires), historique 7 jours des cartes (8), pièces
// cotées « 1000… » sur les futures (4). Fonctions RÉELLES de 10e7, 06 et 02 en vm.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js'), s06 = rd('js/06-v63-patterns-chartistes.js'), s10e7 = rd('js/10e7-news-nlp.js');
const MAP = between(s02, 'const CG_IDS_BY_SYM = {', 'window._cgIdFor = _cgIdFor;', false);
const FUT = between(s02, 'var _posCursor = 0;', 'window._futSymbol = _futSymbol;', false);
const PH = between(s06, 'const _PH_CACHE   = {};', '\n// Générer sparkline SVG', false);
const J = v => JSON.parse(JSON.stringify(v));
function mkStore() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }
function newsCtx(pairs) {
  const PAIRS = {}; pairs.forEach(p => { PAIRS[p] = {}; });
  const c = { window: { _stateReady: true }, console, Math, Number, String, Object, Array, JSON, Promise, RegExp, Error, Date, Set, PAIRS, localStorage: mkStore(),
    setInterval: () => 0, setTimeout: () => 0, fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }), AbortSignal: { timeout: () => null },
    rndHash: () => 'h', nowStr: () => 't', document: { getElementById: () => null }, S: { chainLog: [] } };
  vm.createContext(c); vm.runInContext(MAP, c); vm.runInContext(s10e7, c); return c;
}
(async () => {
console.log('▶ banc-toute-paire');
await T('D1 · _newsCoinIdFor RÉEL : identifiant connu ; la donnée tranche (BNB : l\'identifiant réellement vu dans les articles gagne) ; AVAX : « avalanche » ; paire nouvelle (SUI) → identifiant CoinGecko ; devise → aucune', () => {
  const c = newsCtx(['BTC/USDT']);
  const f = (p, seen) => vm.runInContext('_newsCoinIdFor(' + JSON.stringify(p) + ', ' + (seen ? 'new Set(' + JSON.stringify(seen) + ')' : 'null') + ')', c);
  assert.strictEqual(f('BTC/USDT'), 'bitcoin'); assert.strictEqual(f('AVAX/USDT', ['avalanche']), 'avalanche');
  assert.strictEqual(f('BNB/USDT'), 'binance-coin', 'sans article : identifiant connu');
  assert.strictEqual(f('BNB/USDT', ['bitcoin', 'binancecoin']), 'binancecoin', 'la donnée tranche');
  assert.strictEqual(f('SUI/USDT', ['sui']), 'sui'); assert.strictEqual(f('SUI/USDT'), 'sui');
  assert.strictEqual(f('EUR/USDT', ['tether']), null); assert.strictEqual(f('GBP/USDT'), null);
});
await T('D2 · _newsAggregates RÉEL : toutes les paires ACTIVES reçoivent leur agrégat (DOT, BNB, PEPE et une paire ajoutée), pas les devises', () => {
  const c = newsCtx(['BTC/USDT', 'DOT/USDT', 'BNB/USDT', 'PEPE/USDT', 'SUI/USDT', 'EUR/USDT']);
  const now = Date.now();
  c.__arts = [{ id: 'a1', title: 'Polkadot rally continues', feedDate: now - 1000, relatedCoins: ['polkadot'] }, { id: 'a2', title: 'SUI surge on adoption', feedDate: now - 2000, relatedCoins: ['sui'] },
    { id: 'a3', title: 'BNB record', feedDate: now - 3000, relatedCoins: ['binance-coin'] }, { id: 'a4', title: 'Bitcoin drop', feedDate: now - 4000, relatedCoins: ['bitcoin'] }];
  vm.runInContext('_newsIngest(_newsStore, __arts, Date.now()); _newsStore.lastFetch = Date.now();', c);
  const agg = J(vm.runInContext('_newsAggregates(Date.now())', c));
  assert.deepStrictEqual(Object.keys(agg.pairs).sort(), ['BNB/USDT', 'BTC/USDT', 'DOT/USDT', 'PEPE/USDT', 'SUI/USDT']);
  assert.strictEqual(agg.pairs['DOT/USDT'].n, 1); assert.strictEqual(agg.pairs['SUI/USDT'].n, 1); assert.strictEqual(agg.pairs['SUI/USDT'].coinId, 'sui'); assert.strictEqual(agg.pairs['BNB/USDT'].n, 1);
});
await T('D3 · _phFetch RÉEL (06) : historique 7 jours de toute paire (DOT → polkadot) ; EUR → l\'USDT en EUR, inversé (hauts et bas échangés)', async () => {
  const urls = [];
  const c = { Math, Number, String, Object, Array, JSON, Date, Promise, PAIRS: {}, localStorage: mkStore(), window: {}, AbortSignal: { timeout: () => null },
    fetch: async (u) => { urls.push(u); return { ok: true, json: async () => (u.includes('tether') ? [[1, 0.8, 0.82, 0.78, 0.81], [2, 0.81, 0.83, 0.8, 0.8]] : [[1, 4, 4.2, 3.9, 4.1], [2, 4.1, 4.3, 4, 4.2]]) }; } };
  vm.createContext(c); vm.runInContext(MAP + '\n' + PH, c);
  await vm.runInContext("_phFetch('DOT/USDT')", c); await vm.runInContext("_phFetch('EUR/USDT')", c);
  assert.ok(urls[0].includes('/coins/polkadot/ohlc?vs_currency=usd&days=7'), urls[0]);
  assert.ok(urls[1].includes('/coins/tether/ohlc?vs_currency=eur&days=7'), urls[1]);
  const eur = J(vm.runInContext("_PH_CACHE['EUR/USDT'].ohlc", c))[0];
  assert.deepStrictEqual(eur.map(v => Math.round(v * 10000) / 10000), [1, 1.25, 1.2821, 1.2195, 1.2346], 'o = 1/0,8 ; h = 1/0,78 ; l = 1/0,82 ; c = 1/0,81');
  assert.ok(J(vm.runInContext("_PH_CACHE['DOT/USDT'].ohlc", c)).length === 2);
});
function futCtx(status) {
  const calls = [];
  const c = { Math, Number, String, Object, Array, JSON, Date, Promise, window: {}, AbortSignal: { timeout: () => undefined }, S: {},
    fetch: async (u) => { calls.push(u); const sym = (/symbol=([A-Z0-9]+)/.exec(u) || [])[1]; const st = status[sym]; if (st === 'net') throw new Error('réseau'); return { ok: st === 200, status: st || 500, json: async () => (st === 200 ? { lastFunding: '0' } : { code: -1121 }) }; } };
  vm.createContext(c); vm.runInContext(FUT, c); return { c, calls };
}
await T('D4 · _futDiscover RÉEL (02) : NEWUSDT inconnu (400), 1000NEWUSDT existe → retenu et utilisé ensuite ; aucun des deux → « pas de contrat » (paire ignorée 24 h) ; erreur réseau → rien n\'est conclu', async () => {
  let t = futCtx({ NEWUSDT: 400, '1000NEWUSDT': 200 });
  assert.strictEqual(vm.runInContext("_futSymbol('NEW/USDT')", t.c), 'NEWUSDT');
  assert.strictEqual(await vm.runInContext("_futDiscover('NEW/USDT', 'NEWUSDT')", t.c), '1000NEWUSDT');
  assert.strictEqual(vm.runInContext("_futSymbol('NEW/USDT')", t.c), '1000NEWUSDT');
  t = futCtx({ NOCUSDT: 400, '1000NOCUSDT': 400 });
  assert.strictEqual(await vm.runInContext("_futDiscover('NOC/USDT', 'NOCUSDT')", t.c), null); assert.strictEqual(vm.runInContext("_futSymbol('NOC/USDT')", t.c), null, 'pas de contrat : ignorée');
  t = futCtx({ NETUSDT: 'net' });
  assert.strictEqual(await vm.runInContext("_futDiscover('NET/USDT', 'NETUSDT')", t.c), null); assert.strictEqual(vm.runInContext("_futSymbol('NET/USDT')", t.c), 'NETUSDT', 'réseau : rien conclu');
  t = futCtx({ '1000PEPEUSDT': 400, PEPEUSDT: 200 });
  assert.strictEqual(await vm.runInContext("_futDiscover('PEPE/USDT', '1000PEPEUSDT')", t.c), 'PEPEUSDT', 'l\'inverse aussi (si Binance renommait)');
});
await T('D5 · _positioningRefresh RÉEL : pas de réponse pour le symbole supposé → découverte lancée ; au tour suivant la paire est lue sur le bon symbole', async () => {
  const t = futCtx({ NEWUSDT: 400, '1000NEWUSDT': 200 });
  t.c._bgPairsToWatch = () => ['NEW/USDT'];
  const out1 = await vm.runInContext('_positioningRefresh()', t.c);
  assert.strictEqual(out1, null); assert.ok(t.calls.some(u => u.includes('premiumIndex?symbol=1000NEWUSDT')), 'sonde de la variante');
  t.calls.length = 0; await vm.runInContext('_positioningRefresh()', t.c);
  assert.ok(t.calls.every(u => /symbol=1000NEWUSDT/.test(u)), 'tour suivant : bon symbole · ' + t.calls.join(' | '));
});
await T('S1 · textes : plus de liste figée pour les news ni l\'historique ; addPair (11) ouvre flux, bougies et EV ; toutes les autres sources suivent les paires actives', () => {
  const c10 = codeStrict(s10e7), c06 = codeStrict(s06), c11 = codeStrict(rd('js/11-gestion-paires.js')), c02 = codeStrict(s02);
  assert.ok(c10.includes('for (const pair of _pairList) {') && c10.includes('const cid = _newsCoinIdFor(pair, _seen);') && !c10.includes('for (const pair in NEWS_COIN_IDS) {'));
  assert.ok(c06.includes("const geckoId = ((typeof _cgIdFor === 'function') ? _cgIdFor(pair) : null) || _PH_GECKO_IDS[pair];"));
  ["_openBgWs(pair)", "_fetchAndBootstrapRealCandles(pair, '15m')", 'S.paperRealActivePairs[pair] = true'].forEach(x => assert.ok(c11.includes(x), x));
  ['_bgPairsToWatch().filter(_futSymbol)', "var pairs = (typeof _bgPairsToWatch === 'function') ? _bgPairsToWatch() : [];"].forEach(x => assert.ok(c02.includes(x), x));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
})();
