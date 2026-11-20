// banc-n106.js — [GO N° 106 · 15/11/2026] (ETAT n° 106) AA lancée sans réseau : avant le 1er prix réel, l'école (08 _simCandleStep) tire chaque bougie dans cfg.vol,
// l'amplitude que 02 pose à chaque prix réel (variation 24 h × prix / 9,8) mais ne sauve pas — au rechargement, une paire du code (02 PAIRS) ou d'un candidat (09b2)
// repartait de la constante du code (DOT 0,25 pour 0,733 : 126 fois la règle). Elle repart désormais, au chargement, des bougies réelles GARDÉES (S.realCandles), règle de 02.
// Chaque essai fait tourner le VRAI texte de l'app en vm et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit 15eb7af> node banc-n106.js), sauf les gardes G et F.
// Données (app) : backup du pont du 15/11 19:06 — par paire et par intervalle de S.realCandles : [ts, clôture] de la dernière bougie, + ouverture de la bougie posée
// 24 h avant elle ; prix de l'AA ; PAIRS = le VRAI littéral de 02, DOT et BNB bâtis des VRAIS candidats de 02 comme 09b2 loadState ; PEPE et EUR : celles de Rams.
//   V1  VRAI 08 _schoolVolFromReal : 10 paires du code et des candidats + PEPE, EUR → vol = |prix − ouverture 24 h plus tôt| / ouverture × prix / 9,8 (série 1 h) ;
//       DOT 0,001987 (avant 0,25) ; rien d'autre de la paire ne bouge ; GBP (retirée) non créée
//   V2  prix réel déjà arrivé (_pricesFetched vrai) → rien ne bouge
//   V3  choix : prix = la bougie la plus récente de tous les intervalles ; référence = la série la plus fraîche qui a une bougie EXACTEMENT 24 h avant sa dernière
//       (une voisine à 23 h ne compte pas) ; référence illisible → série suivante (4 h) ; aucune → amplitude gardée ; variation nulle → gardée ; S.realCandles absent : rien
//   V4  VRAI 08 _simCandleStep après le chargement (VRAIES bornes de go n° 105 + amplitude), réseau coupé, 100 pas, hasard aux extrêmes : chaque bougie de l'école
//       bouge moins que le marché réel en 24 h (|c − o| ≤ variation 24 h × prix) ; témoin : avant, DOT bouge de 34 % du prix au 1er pas et touche ses bornes
//   V5  la règle est celle de 02 : même formule et même 9,8 que fetchBinancePrices et la réception CoinGecko (lus dans le texte de 02)
//   V6  VRAI 09b2 loadState : l'appel vient juste APRÈS celui des bornes (go n° 105), donc après S.realCandles et les paires candidates, AVANT _stateReady
//   G   garde : fichiers de la décision, 02, 09b1, 11 au texte d'avant (empreintes du commit 15eb7af)
//   C   appels : _schoolVolFromReal ← 09b2 loadState seul ; écrivains de cfg.vol : 02 (2 lignes) et 08 _schoolVolFromReal ; lecteurs : la liste connue
//   F   garde : banc-fixtures/n106-retours.json redonne 08 et 09b2 du commit 15eb7af au caractère près
// Ce qui se voit sur la vraie page (backup chargé, réseau coupé, AA à l'écran 45 s) : node rejeu/sonde_n106.js --root . --avant <copie> --backup <b>
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOUVEAU = !process.env.BANC_ROOT;
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const sansN106 = require('./banc-fixtures/sans-n106.js');
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
// (app) backup du pont du 15/11 19:06 : par paire et par intervalle, [ts, clôture] de la dernière bougie de S.realCandles (+ ouverture de la bougie posée 24 h avant
// elle, quand la série en a une) ; prix de l'AA (walletStore.sim) ; paires ajoutées par Rams (customPairs : leur amplitude est sauvée avec elles)
const RC = {"BTC/USDT":{"5m":[1794765900000,64654.99],"15m":[1794765600000,64654.99],"1h":[1794765600000,64654.99,65901.6],"4h":[1794758400000,64654.99,65742],"1j":[1794700800000,64654.99,68314.01]},"ETH/USDT":{"5m":[1794765900000,1817.97],"15m":[1794765600000,1817.97],"1h":[1794765600000,1817.97,1843.28],"4h":[1794758400000,1817.97,1841.22],"1j":[1794700800000,1817.97,1929.88]},"XRP/USDT":{"5m":[1794765900000,0.9519],"15m":[1794765600000,0.9519],"1h":[1794765600000,0.9519,0.9601],"4h":[1794758400000,0.9519,0.9718],"1j":[1794700800000,0.9519,1.0109]},"SOL/USDT":{"5m":[1794765900000,71.64],"15m":[1794765600000,71.64],"1h":[1794765600000,71.64,72.86],"4h":[1794758400000,71.64,73.88],"1j":[1794700800000,71.64,78.2]},"DOGE/USDT":{"5m":[1794765900000,0.05882],"15m":[1794765600000,0.05882],"1h":[1794765600000,0.05882,0.06038],"4h":[1794758400000,0.05882,0.06112],"1j":[1794700800000,0.05882,0.06454]},"ADA/USDT":{"5m":[1794765900000,0.1538],"15m":[1794765600000,0.1538],"1h":[1794765600000,0.1538,0.1558],"4h":[1794758400000,0.1538,0.1573],"1j":[1794700800000,0.1538,0.1686]},"AVAX/USDT":{"5m":[1794765900000,7.224],"15m":[1794765600000,7.224],"1h":[1794765600000,7.224,7.489],"4h":[1794758400000,7.224,7.679],"1j":[1794700800000,7.224,8.235]},"LINK/USDT":{"5m":[1794765900000,9.228],"15m":[1794765600000,9.228],"1h":[1794765600000,9.228,9.168],"4h":[1794758400000,9.228,9.278],"1j":[1794700800000,9.228,9.858]},"DOT/USDT":{"5m":[1794765900000,0.733],"15m":[1794765600000,0.733],"1h":[1794765600000,0.733,0.753],"4h":[1794758400000,0.733,0.765],"1j":[1794700800000,0.733,0.818]},"PEPE/USDT":{"5m":[1794765900000,0.00000391],"15m":[1794765600000,0.00000391],"1h":[1794765600000,0.00000391,0.00000399],"4h":[1794758400000,0.00000391,0.00000405],"1j":[1794700800000,0.00000391,0.00000441]},"EUR/USDT":{"5m":[1794765900000,1.1005],"15m":[1794765600000,1.1005],"1h":[1794765600000,1.1005,1.1019],"4h":[1794758400000,1.1005,1.102],"1j":[1794700800000,1.1005,1.1025]},"GBP/USDT":{"5m":[1790542800000,1.443733758553121],"15m":[1790542800000,1.443733758553121],"1h":[1790542800000,1.443733758553121],"4h":[1790539200000,1.443733758553121],"1j":[1790467200000,1.443733758553121,1.3353653588731755]},"BNB/USDT":{"5m":[1794765900000,591.82],"15m":[1794765600000,591.82],"1h":[1794765600000,591.82,590.43],"4h":[1794758400000,591.82,598.57],"1j":[1794700800000,591.82,630.31]}};
const AA = {"BTC/USDT":64509.33650796775,"ETH/USDT":1815.6829682566804,"XRP/USDT":0.95029075961019,"SOL/USDT":71.5564477484913,"DOGE/USDT":0.0587924948598949,"ADA/USDT":0.15338097836661055,"AVAX/USDT":7.228146546482019,"LINK/USDT":9.216157661476041,"DOT/USDT":0.7317882235821401,"PEPE/USDT":0.000003903393323024256,"EUR/USDT":1.1027039175354425,"GBP/USDT":0.983946604235968,"BNB/USDT":591.1843346476447};
const CUSTOM = {"PEPE/USDT":{"sym":"PEPE","startPrice":0.00000256,"vol":6.550666771396399e-9,"minP":0.000002535,"maxP":0.000006045,"dec":6},"EUR/USDT":{"sym":"EUR","startPrice":1.1598,"vol":0.000023813993740801375,"minP":0.7167952854719931,"maxP":1.7092810653562913,"dec":3}};

const J = 86400000;
// les bougies réelles : pour chaque série, un leurre posé 23 h avant la dernière (autre ouverture), la bougie 24 h avant (si le backup en a une), puis la dernière
const realCandles = () => { const o = {}; Object.keys(RC).forEach(p => { o[p] = {}; Object.keys(RC[p]).forEach(iv => { const [ts, c, o24] = RC[p][iv], a = [];
  if (o24 !== undefined) a.push({ ts: ts - J, o: o24, h: o24, l: o24, c: o24, v: 1, n: 1 });
  a.push({ ts: ts - J + 3600000, o: c * 0.5, h: c, l: c * 0.5, c: c, v: 1, n: 1 });
  a.push({ ts: ts, o: c, h: c, l: c, c: c, v: 1, n: 1 }); o[p][iv] = a; }); }); return o; };
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
  vm.runInContext('var _pricesFetched = ' + (o.fetched ? 'true' : 'false') + ';\n' + need(C.s08, '_simCandleStep') + '\n' + need(C.s08, '_schoolBoundsFromReal') + '\n'
    + (o.sans ? '' : need(C.s08, '_schoolVolFromReal')) + '\nthis._sim = _simCandleStep; this._bornes = _schoolBoundsFromReal;' + (o.sans ? '' : ' this._vol = _schoolVolFromReal;'), c);
  return c;
}
const rel = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-12;
const PRIX = p => RC[p]['5m'][1];                                        // la bougie la plus récente : 5 min
const REGLE = p => { const o24 = RC[p]['1h'][2]; return PRIX(p) * Math.abs((PRIX(p) - o24) / o24 * 100) / 100 / 9.8; };   // calcul du banc, indépendant de 08
const JOUR = p => PRIX(p) * Math.abs((PRIX(p) - RC[p]['1h'][2]) / RC[p]['1h'][2]);    // variation réelle sur 24 h, en prix
const PAIRES = Object.keys(AA).filter(p => p !== 'GBP/USDT');   // GBP : retirée par Rams (hors PAIRS), son état d'école est gardé

T('V1 · VRAI 08 _schoolVolFromReal : 12 paires → vol = variation 24 h (série 1 h) × prix / 9,8 (DOT 0,001987 ; avant 0,25 = 126 fois) ; rien d\'autre ne bouge ; GBP non créée', () => {
  const t = monde({ sans: true });
  assert.deepStrictEqual([t.PAIRS['DOT/USDT'].vol, t.PAIRS['ADA/USDT'].vol, t.PAIRS['LINK/USDT'].vol, t.PAIRS['BNB/USDT'].vol], [0.25, 0.012, 0.45, 12], 'témoin : constantes du code');
  assert.ok(t.PAIRS['DOT/USDT'].vol / REGLE('DOT/USDT') > 100, 'témoin : DOT plus de 100 fois la règle de 02');
  const c = monde(); const n = c._vol();
  assert.strictEqual(n, 12, 'paires reposées');
  PAIRES.forEach(p => assert.ok(rel(c.PAIRS[p].vol, REGLE(p)), p + ' ' + c.PAIRS[p].vol + ' ≠ ' + REGLE(p)));
  assert.ok(Math.abs(c.PAIRS['DOT/USDT'].vol - 0.001987) < 1e-6, 'DOT ' + c.PAIRS['DOT/USDT'].vol);
  assert.ok(!c.PAIRS['GBP/USDT'], 'GBP (retirée) non créée');
  const t2 = monde({ sans: true }); Object.keys(c.PAIRS).forEach(p => { const a = Object.assign({}, c.PAIRS[p], { vol: 0 }), b = Object.assign({}, t2.PAIRS[p], { vol: 0 }); assert.deepStrictEqual(a, b, p); });
  assert.strictEqual(JSON.stringify(c.S.realCandles), JSON.stringify(realCandles()), 'bougies réelles intactes');
});

T('V2 · un prix réel est déjà arrivé (_pricesFetched vrai) : rien ne bouge, 0 paire', () => {
  const c = monde({ fetched: true }), avant = JSON.stringify(c.PAIRS);
  assert.strictEqual(c._vol(), 0); assert.strictEqual(JSON.stringify(c.PAIRS), avant);
});

T('V3 · prix = bougie la plus récente ; référence exacte à 24 h dans la série la plus fraîche (le leurre à 23 h ne compte pas) ; illisible → série suivante ; aucune → gardée ; nulle → gardée', () => {
  const rc = realCandles(), L = RC['DOT/USDT'];
  rc['DOT/USDT']['1j'].push({ ts: L['5m'][0] + 60000, o: 1, c: 0.8 });   // la plus récente est dans « 1j » → prix 0,8 ; la référence reste celle de la série 1 h (la plus fraîche à avoir sa bougie 24 h avant)
  rc['AVAX/USDT']['1h'][0].o = NaN;                                       // référence 1 h illisible → série 4 h
  ['5m', '15m', '1h', '4h', '1j'].forEach(iv => { rc['ADA/USDT'][iv] = rc['ADA/USDT'][iv].filter(x => x.ts !== RC['ADA/USDT'][iv][0] - J); });   // ADA : plus aucune bougie 24 h avant
  ['1h', '4h', '1j'].forEach(iv => { rc['LINK/USDT'][iv][0].o = RC['LINK/USDT']['5m'][1]; });   // LINK : variation nulle partout
  delete rc['XRP/USDT'];
  const c = monde({ S: { realCandles: rc, pairStates: {} } }), t = monde({ sans: true }); const n = c._vol();
  const o1h = RC['DOT/USDT']['1h'][2]; assert.ok(rel(c.PAIRS['DOT/USDT'].vol, 0.8 * Math.abs((0.8 - o1h) / o1h * 100) / 100 / 9.8), 'DOT : prix 0,8, référence 1 h ' + c.PAIRS['DOT/USDT'].vol);
  const o4 = RC['AVAX/USDT']['4h'][2], pA = PRIX('AVAX/USDT'); assert.ok(rel(c.PAIRS['AVAX/USDT'].vol, pA * Math.abs((pA - o4) / o4 * 100) / 100 / 9.8), 'AVAX : référence 4 h');
  ['ADA/USDT', 'LINK/USDT', 'XRP/USDT'].forEach(p => assert.strictEqual(c.PAIRS[p].vol, t.PAIRS[p].vol, p + ' : gardée'));
  assert.strictEqual(n, 9);
  const v = monde({ S: { pairStates: {} } }), av = JSON.stringify(v.PAIRS); assert.strictEqual(v._vol(), 0); assert.strictEqual(JSON.stringify(v.PAIRS), av, 'S.realCandles absent');
});

T('V4 · VRAI 08 _simCandleStep après le chargement (bornes + amplitude), réseau coupé, 100 pas : chaque bougie de l\'école bouge moins que le marché réel en 24 h ; témoin : avant, DOT 34 % au 1er pas', () => {
  let k = 0, g = 12345; const M = Object.create(Math); M.random = () => { k++; g = (g * 1103515245 + 12345) % 2147483648; const u = g / 2147483648; return k % 3 ? u : (u < 0.5 ? 0.001 : 0.999); };
  const etats = () => { const ps = {}; PAIRES.forEach(p => { ps[p] = { price: AA[p], candles: Array.from({ length: 20 }, () => ({ o: AA[p], h: AA[p], l: AA[p], c: AA[p], v: 1 })) }; }); return ps; };
  const corps = (c) => { const o = {}; PAIRES.forEach(p => o[p] = []); for (let i = 0; i < 100; i++) { c._sim(); PAIRES.forEach(p => { const x = c.S.pairStates[p].candles[c.S.pairStates[p].candles.length - 1]; o[p].push(Math.abs(x.c - x.o)); }); } return o; };
  const t = monde({ sans: true, Math: M, S: { realCandles: realCandles(), pairStates: etats() } }); t._bornes(); const bt = corps(t);
  assert.ok(bt['DOT/USDT'][0] > 0.1 * AA['DOT/USDT'], 'témoin : avant, 1er pas de DOT ' + bt['DOT/USDT'][0]);
  assert.ok(bt['DOT/USDT'].filter(v => v > JOUR('DOT/USDT')).length > 50, 'témoin : avant, DOT dépasse en un pas le marché de 24 h');
  k = 0; g = 12345; const c = monde({ Math: M, S: { realCandles: realCandles(), pairStates: etats() } }); c._bornes(); c._vol(); const bc = corps(c);
  PAIRES.forEach(p => { const mx = Math.max(...bc[p]); assert.ok(mx <= JOUR(p), p + ' : pas max ' + mx + ' > variation 24 h ' + JOUR(p)); assert.ok(new Set(bc[p]).size > 10, p + ' : l\'école bouge'); });
  PAIRES.forEach(p => c.S.pairStates[p].candles.forEach(x => assert.ok(isFinite(x.o) && isFinite(x.c) && isFinite(x.v) && x.h >= Math.max(x.o, x.c) && x.l <= Math.min(x.o, x.c), p + ' bougie ' + JSON.stringify(x))));
});

T('V5 · la règle est celle de 02 : même formule, même 9,8 que fetchBinancePrices et la réception CoinGecko', () => {
  const r02 = C.s02.match(/const dailyRange\s*=\s*realPrice \* Math\.abs\(change24h\) \/ 100;[\s\S]{0,900}?dailyRange \/ ([\d.]+)\);/g) || [];
  assert.strictEqual(r02.length, 2, 'deux poses dans 02 : ' + r02.length); r02.forEach(x => assert.strictEqual(x.match(/dailyRange \/ ([\d.]+)\);$/)[1], '9.8'));
  const f = need(C.s08, '_schoolVolFromReal');
  assert.ok(/const dailyRange = k\.c \* Math\.abs\(change24h\) \/ 100;/.test(f) && /cfg\.vol = dailyRange \/ 9\.8;/.test(f) && /const change24h\s*=\s*\(k\.c - r\.y\.o\) \/ r\.y\.o \* 100;/.test(f), 'formule de 08');
  assert.ok(/b\.ts === x\.ts - 86400000/.test(f), '24 h exactes');
});

T('V6 · VRAI 09b2 loadState : l\'appel vient juste après celui des bornes (après S.realCandles et les candidats), avant _stateReady, une seule fois', () => {
  const L = need(C.s9b2, 'loadState');
  const b = L.indexOf("try { if (typeof _schoolBoundsFromReal === 'function') _schoolBoundsFromReal(); } catch(e) { dbg.push('bornes:err'); }");
  const at = L.indexOf("try { if (typeof _schoolVolFromReal === 'function') _schoolVolFromReal(); } catch(e) { dbg.push('amplitude:err'); }");
  assert.ok(b > 0 && at > b, 'ordre bornes → amplitude'); assert.strictEqual(L.split('_schoolVolFromReal()').length - 1, 1, 'un seul appel');
  assert.ok(L.slice(b, at).split('\n').filter(l => l.trim() && !/^\s*\/\//.test(l)).length === 1, 'juste après');
  assert.ok(L.indexOf('S.realCandles = snap.realCandles;') < at && L.indexOf("dbg.push('dynPairs:err')") < at && L.lastIndexOf('window._stateReady = true;') > at, 'ordre');
});

T('G · garde : fichiers de la décision, 02, 09b1, 11 au texte d\'avant (empreintes du commit 15eb7af)', () => {
  const H = {"js/02-state-init.js":"9f458ee895a6c0bc", "js/03-per-pair-position-buttons-controls-buid.js":"edeb1cf93142e44b", "js/04-v8-0-livraison-35-mode-max-permissif-v.js":"56365f1615101466", "js/07-v90-mode-bunker-sos.js":"037d807afdbdafed", "js/09b1-build-snapshot.js":"393c4df7cf1df426", "js/09c-auto-open.js":"cb981dcbb9806d73", "js/09j-helpers.js":"469be1c86f4a9337", "js/10f-resolveur-cycle.js":"9935b3138d2a97b0", "js/11-gestion-paires.js":"9c5179b84cae2ea3", "js/15-voix-tendance.js":"9757929e4b295254", "js/15b-tendance-reelle.js":"08582a20cd8f495a", "js/16-fiscal.js":"18d61b55137bc8f3"};
  Object.keys(H).forEach(f => assert.strictEqual(h16(require('./banc-fixtures/sans-n80.js')(require('./banc-fixtures/sans-n108.js')(require('./banc-fixtures/sans-n109.js')(require('./banc-fixtures/sans-n94.js')(rd(f), f), f), f), f)), H[f], f + ' a changé'));   // [GO N° 80 · 15/11/2026] hors go n° 80 (15b : liquidation de la poche au prix de la liquidation, banc-n80.js) · [GO N° 108 · 15/11/2026] hors go n° 108 (15b : liquidation propre de l'EV relue sur les bougies 1 h, banc-fixtures/sans-n108.js)   // [GO N° 109 · 20/11/2026] hors go n° 109 (03 : note prouvée, banc-fixtures/sans-n109.js)
});

T('C · appels : _schoolVolFromReal ← 09b2 loadState seul ; écrivains de cfg.vol : 02 (2) + 08 ; lecteurs : la liste connue', () => {
  const js = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f) && !/\.min\.js$/.test(f)), html = rd('AURA8_v118.html');
  const appels = []; js.forEach(f => { (rd('js/' + f).match(/(?<!function )\b_schoolVolFromReal\(\)/g) || []).forEach(() => appels.push(f)); }); (html.match(/_schoolVolFromReal/g) || []).forEach(() => appels.push('HTML'));
  assert.deepStrictEqual(appels, ['09b2-save-load.js'], 'appelants');
  const ecr = [], lus = [];
  js.forEach(f => rd('js/' + f).split('\n').forEach(l => { if (/^\s*\/\//.test(l)) return; const t = l.replace(/\/\/ .*$/, '').trim();
    if (/\bcfg\.vol\s*=[^=]/.test(t)) ecr.push(f + ' : ' + t);
    else if (/(\bcfg\.vol\b|PAIRS\[[^\]]+\]\.vol\b|candidate\.vol\b)/.test(t)) lus.push(f); }));
  assert.deepStrictEqual(ecr, ['02-state-init.js : if (dailyRange > 0) cfg.vol = Math.max(((cfg.vol > 0 && isFinite(cfg.vol)) ? cfg.vol : 0) * 0.3, dailyRange / 9.8);',
    '02-state-init.js : if (dailyRange > 0) cfg.vol = Math.max(((cfg.vol > 0 && isFinite(cfg.vol)) ? cfg.vol : 0) * 0.3, dailyRange / 9.8);',
    '08-learning-history-render.js : if (dailyRange > 0) { cfg.vol = dailyRange / 9.8; n++; }'], 'écrivains');
  const cpt = {}; lus.forEach(f => cpt[f] = (cpt[f] || 0) + 1);
  // 02 : makePairState, _simulationTickAll ; 07 : runDreamScenario (BTC), activateDynamicPair (candidat) ; 08 : renderMarket (éclat du prix), _simCandleStep (6 lignes) ; 09b2 : candidat
  assert.deepStrictEqual(cpt, { '02-state-init.js': 2, '07-v90-mode-bunker-sos.js': 2, '08-learning-history-render.js': 7, '09b2-save-load.js': 1 }, 'lecteurs ' + JSON.stringify(cpt));
});

T('F · garde : banc-fixtures/n106-retours.json redonne 08 et 09b2 du commit 15eb7af au caractère près', () => {
  if (!NOUVEAU) return;   // code d'avant : rien à retirer
  const A = {"js/08-learning-history-render.js":"01642da3956a9670", "js/09b2-save-load.js":"246e0b7eb4e21195"};
  Object.keys(A).forEach(f => { const s = require('./banc-fixtures/sans-n109.js')(require('./banc-fixtures/sans-n94.js')(rd(f), f), f); assert.notStrictEqual(h16(s), A[f], f + ' : la retouche manque'); assert.strictEqual(h16(sansN106(s, f)), A[f], f + ' : autre chose a bougé'); });   // [GO N° 109 · 20/11/2026] hors go n° 109 (03 : note prouvée, banc-fixtures/sans-n109.js)
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
