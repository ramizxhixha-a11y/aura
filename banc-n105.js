// banc-n105.js — [GO N° 105 · 15/11/2026] (ETAT n° 105) AA lancée sans réseau : avant le 1er prix réel, le prix de l'école est borné par cfg.minP / cfg.maxP ;
// ces bornes repartent désormais, au chargement, du dernier prix réel GARDÉ de la paire (S.realCandles), règle de 02 (× 0,65 / × 1,55) — avant : les constantes du code.
// Chaque essai fait tourner le VRAI texte de l'app en vm et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit cb896e0> node banc-n105.js), sauf les gardes G et F.
// Données (app) : backup du pont du 15/11 12:10 — dernière bougie de chaque intervalle de S.realCandles (ts, clôture) et prix de l'AA ; PAIRS = le VRAI littéral de 02,
// DOT et BNB bâtis des VRAIS candidats de 02 comme 09b2 loadState (dynamicPairKeys).
//   B1  VRAI 08 _schoolBoundsFromReal : 12 paires → bornes = clôture la plus récente × 0,65 / × 1,55 (DOT 0,4771 / 1,1377 ; AVAX 4,691 / 11,186) ; témoin : avant, DOT [3, 30]
//   B2  prix réel déjà arrivé (_pricesFetched vrai) → rien ne bouge (02 a posé les bornes du moment)
//   B3  choix de la bougie : la plus RÉCENTE de tous les intervalles ; bougie illisible (c NaN, 0, < 0 ; ts NaN) ignorée ; paire sans bougie réelle : bornes gardées ;
//       paire retirée (GBP, hors PAIRS) : rien créé ; S.realCandles absent : rien
//   B4  VRAI 08 _simCandleStep, réseau coupé, hasard aux extrêmes (100 pas) : DOT reste dans [0,4771 ; 1,1377] (avant : 3 $ au 1er pas) ; AVAX descend sous 8
//   B5  la règle est celle de 02 : mêmes facteurs que fetchBinancePrices et la réception CoinGecko (lus dans le texte de 02)
//   B6  VRAI 09b2 loadState : l'appel vient APRÈS la relecture de S.realCandles et la reconstruction des paires candidates, AVANT la fin du chargement
//   G   garde : fichiers de la décision et 02 au texte d'avant (empreintes du commit cb896e0)
//   C   appels : _schoolBoundsFromReal ← 09b2 loadState seul ; cfg.minP / cfg.maxP lus par la seule ligne de _simCandleStep
//   F   garde : banc-fixtures/n105-retours.json redonne 08 et 09b2 du commit cb896e0 au caractère près
// Ce qui se voit sur la vraie page (backup chargé, réseau coupé, AA à l'écran 45 s) : node rejeu/sonde_n105.js --root . --avant <copie> --backup <b>
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOUVEAU = !process.env.BANC_ROOT;
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sansN105 = require('./banc-fixtures/sans-n105.js');
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
const F = { s02: 'js/02-state-init.js', s08: 'js/08-learning-history-render.js', s9b2: 'js/09b2-save-load.js' };
const C = {}; Object.keys(F).forEach(k => { C[k] = rd(F[k]); });
// (app) backup du pont du 15/11 12:10 : dernière bougie [ts, clôture] de chaque intervalle de S.realCandles ; prix de l'AA (walletStore.sim)
const RC = {"BTC/USDT":{"5m":[1794741000000,65283.32],"15m":[1794740400000,65283.32],"1h":[1794740400000,65283.32],"4h":[1794729600000,65283.32],"1j":[1794700800000,65283.32]},"ETH/USDT":{"5m":[1794740700000,1825.38],"15m":[1794740400000,1825.38],"1h":[1794740400000,1825.38],"4h":[1794729600000,1825.38],"1j":[1794700800000,1825.38]},"XRP/USDT":{"5m":[1794740700000,0.9623],"15m":[1794740400000,0.9623],"1h":[1794740400000,0.9623],"4h":[1794729600000,0.9623],"1j":[1794700800000,0.9623]},"SOL/USDT":{"5m":[1794740700000,72.02],"15m":[1794740400000,72.02],"1h":[1794740400000,72.02],"4h":[1794729600000,72.02],"1j":[1794700800000,72.02]},"DOGE/USDT":{"5m":[1794741000000,0.05906],"15m":[1794740400000,0.05906],"1h":[1794740400000,0.05906],"4h":[1794729600000,0.05906],"1j":[1794700800000,0.05906]},"ADA/USDT":{"5m":[1794740700000,0.1547],"15m":[1794740400000,0.1547],"1h":[1794740400000,0.1547],"4h":[1794729600000,0.1547],"1j":[1794700800000,0.1547]},"AVAX/USDT":{"5m":[1794740700000,7.217],"15m":[1794740400000,7.217],"1h":[1794740400000,7.217],"4h":[1794729600000,7.217],"1j":[1794700800000,7.217]},"LINK/USDT":{"5m":[1794740700000,9.245],"15m":[1794740400000,9.245],"1h":[1794740400000,9.245],"4h":[1794729600000,9.245],"1j":[1794700800000,9.245]},"DOT/USDT":{"5m":[1794740700000,0.734],"15m":[1794740400000,0.734],"1h":[1794740400000,0.734],"4h":[1794729600000,0.734],"1j":[1794700800000,0.734]},"PEPE/USDT":{"5m":[1794740700000,4.02e-06],"15m":[1794740400000,4.02e-06],"1h":[1794740400000,4.02e-06],"4h":[1794729600000,4.02e-06],"1j":[1794700800000,4.02e-06]},"EUR/USDT":{"5m":[1794741000000,1.0989],"15m":[1794740400000,1.0989],"1h":[1794740400000,1.0989],"4h":[1794729600000,1.0989],"1j":[1794700800000,1.0989]},"GBP/USDT":{"5m":[1790542800000,1.443733758553121],"15m":[1790542800000,1.443733758553121],"1h":[1790542800000,1.443733758553121],"4h":[1790539200000,1.443733758553121],"1j":[1790467200000,1.443733758553121]},"BNB/USDT":{"5m":[1794740700000,596.41],"15m":[1794740400000,596.41],"1h":[1794740400000,596.41],"4h":[1794729600000,596.41],"1j":[1794700800000,596.41]}};
const AA = {"BTC/USDT":65545.70803611063,"ETH/USDT":1831.7468181585414,"XRP/USDT":0.9604405744690497,"SOL/USDT":72.3338523701495,"DOGE/USDT":0.058887826423731,"ADA/USDT":0.15433159484978226,"AVAX/USDT":7.256032221386853,"LINK/USDT":9.260467983556014,"DOT/USDT":0.7369828124124962,"PEPE/USDT":3.999020383220773e-06,"EUR/USDT":1.1027852045679973,"BNB/USDT":597.4776966803456};
// (app) paires ajoutées par Rams (customPairs du backup) : leurs bornes sont sauvées avec elles (posées par 02 au dernier prix réel)
const CUSTOM = { 'PEPE/USDT': { sym: 'PEPE', startPrice: 2.56e-06, vol: 2.550671017225224e-08, minP: 2.613e-06, maxP: 6.230999999999999e-06, dec: 6 },
  'EUR/USDT': { sym: 'EUR', startPrice: 1.1598, vol: 3.081206920478947e-05, minP: 0.716862480410354, maxP: 1.7094412994400752, dec: 3 } };
const realCandles = () => { const o = {}; Object.keys(RC).forEach(p => { o[p] = {}; Object.keys(RC[p]).forEach(iv => { o[p][iv] = [{ ts: RC[p][iv][0] - 300000, o: 1, h: 1, l: 1, c: RC[p][iv][1] * 0.97, v: 1, n: 1 },
  { ts: RC[p][iv][0], o: RC[p][iv][1], h: RC[p][iv][1], l: RC[p][iv][1], c: RC[p][iv][1], v: 1, n: 1 }]; }); }); return o; };
// PAIRS : le VRAI littéral de 02 ; DOT et BNB bâtis des VRAIS candidats de 02, comme 09b2 loadState (dynamicPairKeys du backup) ; PEPE et EUR : celles de Rams
function pairs() {
  const lit = C.s02.match(/\nconst PAIRS = (\{[\s\S]*?\n\});/), cand = C.s02.match(/\n  pairCandidates: (\[[\s\S]*?\n  \]),/);
  assert.ok(lit && cand, 'littéraux de 02 introuvables');
  const P = vm.runInNewContext('(' + lit[1] + ')'), K = vm.runInNewContext('(' + cand[1] + ')');
  ['DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'BNB/USDT', 'PEPE/USDT', 'EUR/USDT'].forEach(k => { if (P[k]) return; const c = K.find(x => x.sym === k.split('/')[0]);
    if (c) P[k] = { sym: c.sym, color: c.color, startPrice: c.startPrice, vol: c.vol, minP: c.minP, maxP: c.maxP, dec: c.dec }; });
  Object.keys(CUSTOM).forEach(k => { P[k] = JSON.parse(JSON.stringify(CUSTOM[k])); });
  return P;
}
function monde(o) {
  o = o || {};
  const c = { console, Math: o.Math || Math, Object, JSON, Array, Number, String, isFinite, isNaN, PAIRS: o.PAIRS || pairs(), S: o.S || { realCandles: realCandles(), pairStates: {} } };
  c.window = c; c._decErr = (e) => { throw e; }; vm.createContext(c);
  vm.runInContext('var _pricesFetched = ' + (o.fetched ? 'true' : 'false') + ';\n' + need(C.s08, '_simCandleStep') + '\n' + (o.sans ? '' : need(C.s08, '_schoolBoundsFromReal')) + '\nthis._sim = _simCandleStep;' + (o.sans ? '' : ' this._bornes = _schoolBoundsFromReal;'), c);
  return c;
}
const rel = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-12;
const DERNIER = p => RC[p]['5m'][1];

T('B1 · VRAI 08 _schoolBoundsFromReal : 12 paires → bornes = dernière clôture réelle × 0,65 / × 1,55 (DOT 0,4771 / 1,1377 ; AVAX 4,691 / 11,186) ; témoin : avant, DOT [3, 30], AVAX [8, 80]', () => {
  const t = monde({ sans: true }); assert.deepStrictEqual([t.PAIRS['DOT/USDT'].minP, t.PAIRS['DOT/USDT'].maxP, t.PAIRS['AVAX/USDT'].minP, t.PAIRS['ADA/USDT'].minP], [3, 30, 8, 0.15], 'témoin : constantes du code');
  const c = monde(); const n = c._bornes();
  assert.strictEqual(n, 12, 'paires reposées');
  Object.keys(AA).forEach(p => { assert.ok(rel(c.PAIRS[p].minP, DERNIER(p) * 0.65) && rel(c.PAIRS[p].maxP, DERNIER(p) * 1.55), p + ' ' + JSON.stringify([c.PAIRS[p].minP, c.PAIRS[p].maxP]));
    assert.ok(AA[p] > c.PAIRS[p].minP && AA[p] < c.PAIRS[p].maxP, p + ' : le prix de l\'AA est dans ses bornes'); });
  assert.ok(Math.abs(c.PAIRS['DOT/USDT'].minP - 0.4771) < 1e-9 && Math.abs(c.PAIRS['DOT/USDT'].maxP - 1.1377) < 1e-9, 'DOT');
  assert.ok(!c.PAIRS['GBP/USDT'], 'GBP (retirée) non créée');
  // rien d'autre de la paire ne bouge
  const t2 = monde({ sans: true }); Object.keys(c.PAIRS).forEach(p => { const a = Object.assign({}, c.PAIRS[p], { minP: 0, maxP: 0 }), b = Object.assign({}, t2.PAIRS[p], { minP: 0, maxP: 0 }); assert.deepStrictEqual(a, b, p); });
});

T('B2 · un prix réel est déjà arrivé (_pricesFetched vrai) : rien ne bouge, 0 paire', () => {
  const c = monde({ fetched: true }), avant = JSON.stringify(c.PAIRS);
  assert.strictEqual(c._bornes(), 0); assert.strictEqual(JSON.stringify(c.PAIRS), avant);
});

T('B3 · bougie la plus récente de tous les intervalles ; bougies illisibles ignorées ; paire sans bougie : bornes gardées ; S.realCandles absent : rien', () => {
  const rc = realCandles();
  rc['DOT/USDT']['1j'].push({ ts: RC['DOT/USDT']['5m'][0] + 60000, c: 0.8 });   // la plus récente est dans « 1j » → 0,8
  rc['AVAX/USDT']['5m'].push({ ts: RC['AVAX/USDT']['5m'][0] + 60000, c: NaN }); rc['AVAX/USDT']['15m'].push({ ts: RC['AVAX/USDT']['5m'][0] + 90000, c: 0 });
  rc['AVAX/USDT']['1h'].push({ ts: RC['AVAX/USDT']['5m'][0] + 99000, c: -3 }); rc['AVAX/USDT']['4h'].push({ ts: NaN, c: 9 });
  delete rc['ADA/USDT']; rc['LINK/USDT'] = { '5m': [], '15m': null };
  const c = monde({ S: { realCandles: rc, pairStates: {} } }); const n = c._bornes();
  assert.ok(rel(c.PAIRS['DOT/USDT'].minP, 0.8 * 0.65) && rel(c.PAIRS['DOT/USDT'].maxP, 0.8 * 1.55), 'DOT : la bougie la plus récente (1j)');
  assert.ok(rel(c.PAIRS['AVAX/USDT'].minP, 7.217 * 0.65), 'AVAX : NaN, 0, négatif et ts illisible ignorés (les dernières bougies lisibles restent)');
  assert.deepStrictEqual([c.PAIRS['ADA/USDT'].minP, c.PAIRS['ADA/USDT'].maxP, c.PAIRS['LINK/USDT'].minP, c.PAIRS['LINK/USDT'].maxP], [0.15, 1.5, 5, 40], 'sans bougie : gardées');
  assert.strictEqual(n, 10);
  const v = monde({ S: { pairStates: {} } }), av = JSON.stringify(v.PAIRS); assert.strictEqual(v._bornes(), 0); assert.strictEqual(JSON.stringify(v.PAIRS), av, 'S.realCandles absent');
});

T('B4 · VRAI 08 _simCandleStep, réseau coupé, hasard aux extrêmes (100 pas) : DOT reste dans [0,4771 ; 1,1377], AVAX descend sous 8 ; témoin : avant, DOT = 3 $ au 1er pas', () => {
  // hasard reproductible : un tirage sur trois aux extrêmes (0,001 / 0,999 : bruit et queue épaisse au maximum), les autres d'un générateur congruentiel
  let k = 0, g = 12345; const M = Object.create(Math); M.random = () => { k++; g = (g * 1103515245 + 12345) % 2147483648; const u = g / 2147483648; return k % 3 ? u : (u < 0.5 ? 0.001 : 0.999); };
  const etats = () => { const ps = {}; ['DOT/USDT', 'AVAX/USDT'].forEach(p => { ps[p] = { price: AA[p], candles: Array.from({ length: 20 }, () => ({ o: AA[p], h: AA[p], l: AA[p], c: AA[p], v: 1 })) }; }); return ps; };
  const t = monde({ sans: true, Math: M, S: { realCandles: realCandles(), pairStates: etats() } }); t._sim();
  assert.strictEqual(t.S.pairStates['DOT/USDT'].price, 3, 'témoin : avant, DOT à 3 $ au premier pas');
  const tv = []; for (let i = 0; i < 99; i++) { t._sim(); tv.push(t.S.pairStates['AVAX/USDT'].price); } assert.ok(Math.min(...tv) >= 8, 'témoin : avant, AVAX jamais sous 8');
  k = 0; g = 12345; const c = monde({ Math: M, S: { realCandles: realCandles(), pairStates: etats() } }); c._bornes();
  const vus = { 'DOT/USDT': [], 'AVAX/USDT': [] };
  for (let i = 0; i < 100; i++) { c._sim(); Object.keys(vus).forEach(p => vus[p].push(c.S.pairStates[p].price)); }
  vus['DOT/USDT'].forEach(v => assert.ok(v >= 0.734 * 0.65 - 1e-12 && v <= 0.734 * 1.55 + 1e-12, 'DOT ' + v));
  assert.ok(Math.min(...vus['AVAX/USDT']) < 8 && Math.max(...vus['AVAX/USDT']) <= 7.217 * 1.55 + 1e-12, 'AVAX ' + Math.min(...vus['AVAX/USDT']));
  assert.ok(new Set(vus['DOT/USDT']).size > 10, 'l\'école bouge');
});

T('B5 · la règle est celle de 02 : mêmes facteurs que fetchBinancePrices et la réception CoinGecko', () => {
  const r02 = (C.s02.match(/cfg\.minP\s*=\s*realPrice \* ([\d.]+);\s*\n\s*cfg\.maxP\s*=\s*realPrice \* ([\d.]+);/g) || []).map(x => x.match(/\* ([\d.]+);[\s\S]*\* ([\d.]+);/).slice(1));
  assert.strictEqual(r02.length, 2, 'deux poses dans 02'); r02.forEach(f => assert.deepStrictEqual(f, ['0.65', '1.55']));
  const f08 = need(C.s08, '_schoolBoundsFromReal').match(/cfg\.minP = k\.c \* ([\d.]+); cfg\.maxP = k\.c \* ([\d.]+);/);
  assert.ok(f08, 'pose de 08'); assert.deepStrictEqual(f08.slice(1), ['0.65', '1.55']);
});

T('B6 · VRAI 09b2 loadState : l\'appel vient après la relecture de S.realCandles et des paires candidates, avant la fin du chargement', () => {
  const L = need(C.s9b2, 'loadState'), at = L.indexOf("try { if (typeof _schoolBoundsFromReal === 'function') _schoolBoundsFromReal(); } catch(e) { dbg.push('bornes:err'); }");
  assert.ok(at > 0, 'appel absent'); assert.strictEqual(L.split('_schoolBoundsFromReal()').length - 1, 1, 'un seul appel');
  assert.ok(L.indexOf('S.realCandles = snap.realCandles;') < at && L.indexOf("dbg.push('dynPairs:err')") < at && L.lastIndexOf('window._stateReady = true;') > at, 'ordre');
});

T('G · garde : fichiers de la décision et 02 au texte d\'avant (empreintes du commit cb896e0)', () => {
  const H = { 'js/02-state-init.js': '9f458ee895a6c0bc', 'js/03-per-pair-position-buttons-controls-buid.js': 'edeb1cf93142e44b', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js': '56365f1615101466',
    'js/07-v90-mode-bunker-sos.js': '037d807afdbdafed', 'js/09b1-build-snapshot.js': '393c4df7cf1df426', 'js/09c-auto-open.js': 'cb981dcbb9806d73', 'js/09j-helpers.js': '469be1c86f4a9337',
    'js/10f-resolveur-cycle.js': '9935b3138d2a97b0', 'js/11-gestion-paires.js': '9c5179b84cae2ea3', 'js/15-voix-tendance.js': '9757929e4b295254', 'js/15b-tendance-reelle.js': '08582a20cd8f495a', 'js/16-fiscal.js': '18d61b55137bc8f3' };
  Object.keys(H).forEach(f => assert.strictEqual(h16(require('./banc-fixtures/sans-n80.js')(require('./banc-fixtures/sans-n108.js')(rd(f), f), f)), H[f], f + ' a changé'));   // [GO N° 80 · 15/11/2026] hors go n° 80 (15b : liquidation de la poche au prix de la liquidation, banc-n80.js) · [GO N° 108 · 15/11/2026] hors go n° 108 (15b : liquidation propre de l'EV relue sur les bougies 1 h, banc-fixtures/sans-n108.js)
});

T('C · appels : _schoolBoundsFromReal ← 09b2 loadState seul ; cfg.minP / cfg.maxP lus par la seule ligne de _simCandleStep', () => {
  const js = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f) && !/\.min\.js$/.test(f)), html = rd('AURA8_v118.html');
  const appels = []; js.forEach(f => { (rd('js/' + f).match(/(?<!function )\b_schoolBoundsFromReal\(\)/g) || []).forEach(() => appels.push(f)); }); (html.match(/_schoolBoundsFromReal/g) || []).forEach(() => appels.push('HTML'));
  assert.deepStrictEqual(appels, ['09b2-save-load.js'], 'appelants');
  const lus = []; js.forEach(f => rd('js/' + f).split('\n').forEach(l => { if (/\.(minP|maxP)\b/.test(l) && !/\.(minP|maxP)\s*=[^=]|(minP|maxP):\s*candidate\./.test(l) && !/^\s*\/\//.test(l)) lus.push(f + ' : ' + l.trim()); }));
  assert.deepStrictEqual(lus, ['08-learning-history-render.js : ps.price = _pricesFetched ? c : Math.max(cfg.minP, Math.min(cfg.maxP, c));'], 'lecteurs');
});

T('F · garde : banc-fixtures/n105-retours.json redonne 08 et 09b2 du commit cb896e0 au caractère près', () => {
  if (!NOUVEAU) return;   // code d'avant : rien à retirer
  const A = { 'js/08-learning-history-render.js': '1612eb4233084d9c', 'js/09b2-save-load.js': '7c05cdce855b9eca' };
  Object.keys(A).forEach(f => { const s = require('./banc-fixtures/sans-n106.js')(rd(f), f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sansN105(s, f)), A[f], f + ' : autre chose a bougé'); });   // [GO N° 106 · 15/11/2026] hors go n° 106 (08, 09b2 : amplitude de l'école, banc-n106.js)
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
