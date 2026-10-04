// banc-enregistrement.js — [ENREGISTREMENT · 04/10/2026] VERSION 20261004a
// L'enregistreur (js/14-enregistreur.js) garde chaque jour ce que l'app reçoit déjà : seaux de trades (S.flowStats), résumés
// du carnet (S.orderBook), liquidations brutes (écouteur sur la connexion de l'app), news (_newsStore). Il doit être en
// LECTURE SEULE : l'état S de l'app est le même, au bit près, avec ou sans lui. Fonctions RÉELLES de 02 (_recordTrade,
// _parseDepth, _liqPairOf, _liqRecord, _openLiqWs) et de 10e7 (_newsIngest) en vm, base IndexedDB et écriture native simulées.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const ASYNC = [];
function T(name, fn) { ASYNC.push([name, fn]); }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = v => JSON.parse(JSON.stringify(v));
const s02 = rd('js/02-state-init.js'), s10e7 = rd('js/10e7-news-nlp.js'), REC = rd('js/14-enregistreur.js'), HTML = rd('AURA8_v118.html');
const FLUX = between(s02, 'var _flowEmaNotional = {};', 'window._parseDepth = _parseDepth;', true);
const LIQ = between(s02, 'var _liqWs = null, _liqRetryMs = 30000, _liqNextTry = 0;', 'window._liqPairOf = _liqPairOf;', false);
const NEWS = between(s10e7, "const NEWS_API_BASE     = 'https://openapiv1.coinstats.app/news';", 'function _newsWeight(', false);
const M = 60000;
const T0 = Date.UTC(2026, 9, 4, 10, 0, 3);   // 04/10/2026 10:00:03 UTC

// ── base IndexedDB simulée (clés triées comme IndexedDB : chaînes, ordre lexicographique) ──
function fakeIDB() {
  const stores = {};
  const KR = {
    bound: (lo, hi) => ({ has: k => k >= lo && k <= hi }),
    upperBound: (hi, open) => ({ has: k => open ? k < hi : k <= hi })
  };
  const later = f => Promise.resolve().then(f);
  const db = {
    objectStoreNames: { contains: n => !!stores[n] },
    createObjectStore: n => { stores[n] = new Map(); },
    transaction(n, mode) {
      const m = stores[n], tx = {};
      const op = fn => { const r = {}; const res = fn(); later(() => { r.result = res; if (r.onsuccess) r.onsuccess(); later(() => { if (tx.oncomplete) tx.oncomplete(); }); }); return r; };
      const sorted = () => [...m.keys()].sort();
      tx.objectStore = () => ({
        put: (v, k) => { if (mode !== 'readwrite') throw new Error('readonly'); if (api.failPut) { const r = {}; later(() => { tx.error = new Error('QuotaExceededError'); if (tx.onerror) tx.onerror(); }); return r; } return op(() => { m.set(k, v); return k; }); },
        getAllKeys: rg => op(() => sorted().filter(k => !rg || rg.has(k))),
        getAll: rg => op(() => sorted().filter(k => !rg || rg.has(k)).map(k => m.get(k))),
        delete: rg => { if (mode !== 'readwrite') throw new Error('readonly'); return op(() => { sorted().forEach(k => { if (rg.has(k)) m.delete(k); }); }); }
      });
      return tx;
    }
  };
  const indexedDB = { open: () => { const rq = {}; later(() => { rq.result = db; if (!stores.lots && rq.onupgradeneeded) rq.onupgradeneeded(); rq.onsuccess(); }); return rq; } };
  const api = { indexedDB, IDBKeyRange: KR, failPut: false, keys: () => (stores.lots ? [...stores.lots.keys()].sort() : []), put: (k, v) => stores.lots.set(k, v), get: k => stores.lots.get(k) };
  return api;
}
// ── connexion WebSocket simulée : l'app pose onmessage, l'enregistreur un écouteur ──
class FakeWS { constructor(url) { this.url = url; this.readyState = 1; this.l = []; FakeWS.all.push(this); } addEventListener(t, f) { if (t === 'message') this.l.push(f); }
  emit(o) { const evt = { data: JSON.stringify(o) }; if (this.onmessage) this.onmessage(evt); this.l.forEach(f => f(evt)); } }
FakeWS.all = [];

function makeCtx(withRec, opts) {
  opts = opts || {};
  const clock = { t: T0 };
  class FD extends Date { constructor(...a) { if (!a.length) super(clock.t); else super(...a); } static now() { return clock.t; } }
  const idb = fakeIDB();
  const timers = [];
  const c = { S: { tradingMode: 'paperReal' }, PAIRS: { 'BTC/USDT': {}, 'SOL/USDT': {}, 'PEPE/USDT': {} }, Math, Number, Object, Array, String, JSON, Map, Set, Promise,
    isFinite, Date: FD, console, WebSocket: FakeWS, setTimeout: (f, ms) => { timers.push(['t', ms]); return timers.length; }, setInterval: (f, ms) => { timers.push(['i', ms]); return timers.length; },
    clearTimeout() {}, clearInterval() {}, document: { addEventListener() {}, visibilityState: 'visible', currentScript: { src: 'https://x/js/14-enregistreur.js?v=20261004a' } },
    indexedDB: opts.idb === null ? undefined : idb.indexedDB, IDBKeyRange: idb.IDBKeyRange, _bgPairsToWatch: () => ['BTC/USDT', 'SOL/USDT', 'PEPE/USDT'], _cgIdFor: () => null };
  c.window = c; c.addEventListener = () => {};
  if (opts.idbFail) idb.failPut = true;
  if (opts.fs) c.Capacitor = { Plugins: { Filesystem: opts.fs } };
  vm.createContext(c);
  vm.runInContext(FLUX + '\n' + LIQ + '\n' + NEWS, c);
  if (withRec) vm.runInContext(REC, c, { filename: 'js/14-enregistreur.js' });
  return { c, clock, idb, timers, run: s => vm.runInContext(s, c) };
}
// Scénario commun : 3 min 10 s de trades réels, carnets, liquidations et news, relevés toutes les 15 s, battement toutes les 2 s.
function scenario(X) {
  const { c, clock, run } = X;
  run('_openLiqWs()');
  const ws = () => c._liqWs;
  const px = { 'BTC/USDT': 80000, 'SOL/USDT': 150, 'PEPE/USDT': 0.00001234 };
  let k = 0;
  for (let s = 0; s <= 190; s++) {
    clock.t = T0 + s * 1000;
    if (c._rec && s % 2 === 0) c._rec.watch(clock.t);
    for (const p of Object.keys(px)) {
      for (let j = 0; j < 3; j++) { k++; const q = (k % 7 === 0) ? 9 + (k % 5) : 0.01 * (1 + (k % 4)); c._recordTrade(p, px[p] * (1 + ((k % 11) - 5) / 1e4), p === 'PEPE/USDT' ? q * 1e7 : q, k % 3 === 0, clock.t); }
    }
    if (s % 5 === 0) { const p = Object.keys(px)[(s / 5) % 3]; const P = px[p]; c._parseDepth(p, [[P * 0.9999, 1 + s % 3], [P * 0.9998, 20]], [[P * 1.0001, 2], [P * 1.0002, 1]]); }
    if (s % 17 === 0) ws().emit({ e: 'forceOrder', E: clock.t, o: { s: s % 2 ? 'BTCUSDT' : '1000PEPEUSDT', S: s % 3 ? 'SELL' : 'BUY', o: 'LIMIT', q: '0.5', p: '80000', ap: '79990', X: 'FILLED', T: clock.t - 5 } });
    if (s === 40) ws().emit({ e: 'forceOrder', E: clock.t, o: { s: 'XYZUSDT', S: 'SELL', q: '1', p: '2', ap: '2' } });   // paire hors système : ignorée par l'app ET l'enregistreur
    if (s === 30 || s === 150) {
      c._art = [{ id: 'a' + s, title: 'Bitcoin rally continues', source: 'x', feedDate: clock.t - 60000, relatedCoins: ['bitcoin'] }, { id: 'b' + s, title: 'SOL drop', source: 'y', feedDate: clock.t - 120000, relatedCoins: ['solana'] }];
      run('_newsIngest(_newsStore, _art, Date.now()); _newsStore.lastFetch = Date.now(); _newsStore.calls++;');
    }
    if (c._rec && s % 15 === 0) c._rec.collect(clock.t);
  }
}
const lines = X => X.c._rec.queue().map(l => JSON.parse(l));

console.log('▶ banc-enregistrement');
T('E1 · LECTURE SEULE prouvée : même scénario réel (trades, carnet, liquidations, news) avec et sans l\'enregistreur → S identique au bit près ; onmessage de l\'app intact', () => {
  const A = makeCtx(false), B = makeCtx(true);
  scenario(A); scenario(B);
  assert.deepStrictEqual(J(B.c.S), J(A.c.S));
  assert.ok(B.c.S.flowStats['BTC/USDT'].length >= 3 && B.c.S.liqStats['BTC/USDT'].length >= 2 && B.c.S.orderBook['SOL/USDT'], 'le scénario remplit bien S');
  const ws = B.c._liqWs; assert.ok(ws.l.length === 1, 'un seul écouteur ajouté'); assert.ok(/_liqRecord\(m\.o/.test(String(ws.onmessage)), 'onmessage = celui de 02');
});
T('E2 · texte du module : aucune écriture dans S, aucun Math.random (le rejeu est semé), aucune connexion ni requête, aucun onmessage posé ; seuls window._rec et window._recStatus', () => {
  const code = codeStrict(REC);
  assert.ok(!/\bS0?\s*(\.[\w$]+|\[[^\]]+\])+\s*(=(?!=)|\+=|-=|\+\+|--)/.test(code), 'écriture dans S');
  assert.ok(!/Math\.random/.test(code), 'Math.random');
  assert.ok(!/new WebSocket|fetch\(|XMLHttpRequest/.test(code), 'connexion ou requête');
  assert.ok(!/\.onmessage\s*=/.test(code), 'onmessage remplacé');
  const wins = [...code.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)].map(m => m[1]).sort();
  assert.deepStrictEqual(wins, ['_rec', '_recStatus']);
  assert.ok(/addEventListener\('message', onLiqMsg\)/.test(code));
  assert.ok(/S0\.flowStats/.test(code) && /S0\.orderBook/.test(code) && /_newsStore/.test(code) && /_liqWs/.test(code));
});
T('E3 · fidélité : chaque seau de trades fini (S.flowStats) est enregistré une fois et une seule, champ par champ ; la minute en cours ne l\'est pas', () => {
  const B = makeCtx(true); scenario(B);
  const L = lines(B), got = {};
  L.filter(l => l.k === 'm').forEach(l => Object.keys(l.fl || {}).forEach(p => { const key = p + '@' + l.t; assert.ok(!got[key], 'doublon ' + key); got[key] = l.fl[p]; }));
  const done = Math.floor((T0 + 180000 - 5000) / M) * M;   // dernier relevé du scénario : s = 180
  let n = 0;
  for (const p of Object.keys(B.c.S.flowStats)) for (const b of B.c.S.flowStats[p]) {
    if (b.t < done) { n++; assert.deepStrictEqual(J(got[p + '@' + b.t]), J(B.c._rec.flowRow(b)), p + ' ' + b.t); }
    else assert.strictEqual(got[p + '@' + b.t], undefined, 'minute en cours enregistrée');
  }
  assert.strictEqual(n, 6, '10:00 et 10:01 finies au dernier relevé (10:03:03) × 3 paires');
  const b = B.c.S.flowStats['BTC/USDT'][0], r = B.c._rec.flowRow(b);
  assert.strictEqual(r[2] + r[3], b.n); assert.ok(Math.abs(r[0] - b.buyQ) <= 1e-5 * b.buyQ && r[5] === b.bigBuy && r[6] === b.bigSell);
});
T('E4 · liquidations : les événements bruts enregistrés, rejoués dans _liqRecord RÉEL, redonnent EXACTEMENT S.liqStats de l\'app ; paire hors système ignorée', () => {
  const B = makeCtx(true); scenario(B);
  const L = lines(B).filter(l => l.k === 'lq');
  assert.ok(L.length >= 10 && L.every(l => l.s !== 'XYZUSDT'));
  const R = makeCtx(false);
  L.forEach(l => R.c._liqRecord({ s: l.s, S: l.S, o: l.o, q: l.q, p: l.p, ap: l.ap, X: l.X, T: l.T }, Number(l.E)));
  assert.deepStrictEqual(J(R.c.S.liqStats), J(B.c.S.liqStats));
});
T('E5 · carnet : chaque résumé enregistré est un vrai résumé de _parseDepth (même heure, mêmes valeurs) ; le dernier de chaque paire est présent', () => {
  const B = makeCtx(true); scenario(B);
  const obs = []; lines(B).filter(l => l.k === 'm' && l.ob).forEach(l => obs.push(...l.ob));
  assert.ok(obs.length >= 9);
  const seen = {}; obs.forEach(r => { assert.ok(!seen[r[0] + r[1]], 'doublon'); seen[r[0] + r[1]] = r; });
  B.c._rec.collect(B.clock.t + 61000);
  const all = []; lines(B).filter(l => l.k === 'm' && l.ob).forEach(l => all.push(...l.ob));
  for (const p of Object.keys(B.c.S.orderBook)) { const ob = B.c.S.orderBook[p]; assert.deepStrictEqual(J(all.find(r => r[0] === p && r[1] === ob.t)), J(B.c._rec.obRow(p, ob))); }
});
T('E6 · minutes : 5 s de grâce (10:01:03 → rien de 10:00 ; 10:01:06 → 10:00 enregistrée) ; couverture al / lq / off comptée par battement ; rattrapage borné à 30 min', () => {
  const X = makeCtx(true); const c = X.c; c.run = X.run;
  X.run('_openLiqWs()');
  for (let s = 0; s < 60; s += 2) { c._liqWs.readyState = s < 20 ? 0 : 1; c.window._auraNetOffline = s < 8; X.clock.t = T0 - 3000 + s * 1000; c._rec.watch(X.clock.t); }   // 10:00:00 → 10:00:58 : 30 battements, connexion ouverte à 10:00:20, hors ligne 4 battements
  c._liqWs.readyState = 3; c.window._auraNetOffline = true;
  X.clock.t = T0 + 58000; c._rec.watch(X.clock.t);                                                    // 10:01:01 : hors ligne
  assert.strictEqual(c._rec.collect(T0 + 60000), 0, 'à 10:01:03 la minute 10:00 n\'est pas finie (grâce)');
  assert.strictEqual(c._rec.collect(T0 + 63000), 1);
  const m = lines(X).filter(l => l.k === 'm');
  assert.strictEqual(m.length, 1); assert.strictEqual(m[0].t, T0 - 3000); assert.deepStrictEqual([m[0].al, m[0].lq, m[0].off], [30, 20, 4]);
  const Y = makeCtx(true); Y.c._rec.collect(T0);
  for (let i = 0; i < 90; i++) Y.c._rec.watch(T0 + 60000 + i * 60000);                                 // 90 minutes vivantes sans relevé (écran coupé)
  Y.c._rec.collect(T0 + 92 * 60000);
  const ts = lines(Y).filter(l => l.k === 'm').map(l => l.t);
  assert.strictEqual(ts.length, 30, 'rattrapage : 30 minutes au plus'); assert.strictEqual(ts[0], T0 - 3000 + 61 * 60000); assert.strictEqual(ts[29], T0 - 3000 + 90 * 60000);
});
T('E7 · liquidations : écouteur posé sur la connexion de l\'app, reposé sur la suivante après fermeture ; jamais deux fois sur la même', () => {
  const X = makeCtx(true); X.run('_openLiqWs()');
  const w1 = X.c._liqWs; X.c._rec.watch(T0); X.c._rec.watch(T0 + 2000);
  assert.strictEqual(w1.l.length, 1); assert.strictEqual(X.c._recStatus.liqAttach, 1);
  w1.onclose(); X.clock.t = T0 + 31000; X.run('_openLiqWs()');
  const w2 = X.c._liqWs; assert.ok(w2 !== w1); X.c._rec.watch(X.clock.t);
  assert.strictEqual(w2.l.length, 1); assert.strictEqual(X.c._recStatus.liqAttach, 2);
  w2.emit({ E: X.clock.t, o: { s: 'SOLUSDT', S: 'BUY', q: '3', p: '150', ap: '150', X: 'FILLED', T: X.clock.t } });
  const L = lines(X).filter(l => l.k === 'lq'); assert.strictEqual(L.length, 1); assert.strictEqual(L[0].q, '3', 'brut : chaîne Binance gardée telle quelle');
});
T('E8 · news : chaque article une seule fois (vu = première lecture), titre / coins / score de l\'app ; état du fetch noté à chaque changement', () => {
  const B = makeCtx(true); scenario(B);
  const L = lines(B), nw = L.filter(l => l.k === 'nw'), nf = L.filter(l => l.k === 'nf');
  assert.deepStrictEqual(J(nw.map(l => l.id).sort()), ['a150', 'a30', 'b150', 'b30']);
  const a = nw.find(l => l.id === 'a30'); assert.strictEqual(a.title, 'Bitcoin rally continues'); assert.deepStrictEqual(a.coins, ['bitcoin']); assert.strictEqual(a.s, 1); assert.strictEqual(a.w, T0 + 30000);
  assert.ok(nf.length >= 2 && nf.every(l => l.lf > 0 || l.n === 0));
});
T('E9 · base et fichier : un lot par vidage ; le jour UTC fini part en UN fichier JSON valide aura_guardian_full_rec-AAAAMMJJ.json (Download/AURA), puis quitte la base ; le jour courant reste', async () => {
  const writes = [];
  const FS = { writeFile: async o => { writes.push(o); return { uri: 'file://' + o.path }; } };
  const X = makeCtx(true, { fs: FS }); scenario(X);
  const nQ = X.c._rec.queue().length;
  assert.strictEqual(await X.c._rec.flush(X.clock.t), true);
  assert.deepStrictEqual(X.idb.keys().map(k => k.split('|')[0]), ['20261004']);
  X.clock.t = Date.UTC(2026, 9, 5, 0, 10, 0); X.c._rec.watch(X.clock.t); X.c._rec.collect(X.clock.t + 120000);
  await X.c._rec.flush(X.clock.t);
  assert.deepStrictEqual(X.idb.keys().map(k => k.split('|')[0]), ['20261004', '20261005']);
  const r = await X.c._rec.finalize(X.clock.t);
  assert.deepStrictEqual(J(r), ['EXTERNAL_STORAGE:Download/AURA/aura_guardian_full_rec-20261004.json']);
  assert.strictEqual(writes.length, 1); assert.strictEqual(writes[0].directory, 'EXTERNAL_STORAGE'); assert.strictEqual(writes[0].encoding, 'utf8');
  const f = JSON.parse(writes[0].data);
  assert.strictEqual(f._type, 'aura_rec'); assert.strictEqual(f.day, '20261004'); assert.strictEqual(f.parts, 1); assert.strictEqual(f.lines, nQ); assert.strictEqual(f.rec.length, nQ);
  assert.strictEqual(f.rec[0].k, 'boot'); assert.strictEqual(f.rec[0].doc, '20261004a', 'token lu dans le src du script (DOC_V n\'existe pas encore au chargement)'); assert.deepStrictEqual(f.rec[0].fl.length, 9);
  assert.deepStrictEqual(X.idb.keys().map(k => k.split('|')[0]), ['20261005'], 'jour écrit effacé, jour courant gardé');
  assert.deepStrictEqual(J(X.c._recStatus.files), ['EXTERNAL_STORAGE:Download/AURA/aura_guardian_full_rec-20261004.json']);
});
T('E10 · écriture refusée ou absente : RIEN n\'est effacé, l\'erreur est dite ; repli sur EXTERNAL puis DOCUMENTS comme les backups', async () => {
  const X = makeCtx(true, { fs: { writeFile: async () => { throw new Error('refusé'); } } });
  await X.c._rec.flush(T0); X.clock.t = T0 + 86400000;
  assert.strictEqual(await X.c._rec.finalize(X.clock.t), null);
  assert.strictEqual(X.idb.keys().length, 1); assert.ok(/écriture refusée pour 20261004/.test(X.c._recStatus.err));
  const Y = makeCtx(true); await Y.c._rec.flush(T0);
  assert.strictEqual(await Y.c._rec.finalize(T0 + 86400000), null); assert.strictEqual(Y.idb.keys().length, 1); assert.ok(/écriture native absente/.test(Y.c._recStatus.err));
  const dirs = []; const Z = makeCtx(true, { fs: { writeFile: async o => { dirs.push(o.directory); if (o.directory !== 'DOCUMENTS') throw new Error('non'); return {}; } } });
  await Z.c._rec.flush(T0); const r = await Z.c._rec.finalize(T0 + 86400000);
  assert.deepStrictEqual(dirs, ['EXTERNAL_STORAGE', 'EXTERNAL', 'DOCUMENTS']); assert.deepStrictEqual(J(r), ['DOCUMENTS:AURA_Backups/aura_guardian_full_rec-20261004.json']);
});
T('E11 · plus de 14 jours sans écriture possible : le plus vieux jour est effacé et la perte est ENREGISTRÉE (ligne « perte »), jamais silencieuse', async () => {
  const Y = makeCtx(true); await Y.c._rec.flush(T0);
  for (let d = 1; d <= 15; d++) Y.idb.put(Y.c._rec.dayUTC(T0 + d * 86400000) + '|0000000000000|000000', '{"k":"m"}');
  await Y.c._rec.finalize(T0 + 20 * 86400000);
  assert.strictEqual(Y.idb.keys().filter(k => k.startsWith('20261004')).length, 0);
  const p = Y.c._rec.queue().map(l => JSON.parse(l)).filter(l => l.k === 'perte');
  assert.strictEqual(p.length, 1); assert.strictEqual(p[0].day, '20261004'); assert.deepStrictEqual(J(Y.c._recStatus.dropped), ['20261004']);
  assert.ok(Y.timers.some(t => t[0] === 't' && t[1] === 5000), 'le jour suivant est repris 5 s après');
});
T('E12 · découpe : un jour de plus de 3 Mo part en plusieurs fichiers -p1, -p2… chacun JSON valide, aucune ligne perdue ni dupliquée ; noms jamais confondus avec un backup', () => {
  const X = makeCtx(true);
  const ls = []; for (let i = 0; i < 500; i++) ls.push(JSON.stringify({ k: 'm', t: i, pad: 'x'.repeat(i % 50) }));
  const parts = X.c._rec.splitParts('20261004', ls, 5000, '2026-10-05T00:00:00.000Z');
  assert.ok(parts.length > 3);
  const back = []; parts.forEach((p, j) => { const o = JSON.parse(p.text); assert.strictEqual(o.part, j + 1); assert.strictEqual(o.parts, parts.length); assert.ok(p.text.length <= 5000 + 300); assert.strictEqual(p.name, 'aura_guardian_full_rec-20261004-p' + (j + 1) + '.json'); back.push(...o.rec.map(r => r.t)); });
  assert.deepStrictEqual(back, ls.map((l, i) => i));
  const one = X.c._rec.splitParts('20261004', ls.slice(0, 3), 3000000);
  assert.strictEqual(one.length, 1); assert.strictEqual(one[0].name, 'aura_guardian_full_rec-20261004.json');
  const BACKUP = /^aura_guardian_full_\d{8}-\d{6}\.json$/;
  assert.ok(!BACKUP.test(one[0].name) && !BACKUP.test(parts[0].name) && /^aura_guardian_full_/.test(one[0].name), 'préfixe accepté par DriveSync, jamais un nom de backup');
});
T('E13 · HTML : js/14-enregistreur.js chargé juste après 13-veille-ecran, au token courant ; en-tête VERSION = DOC_V ; minuteries 2 s / 15 s / 60 s / 90 s / 10 min', () => {
  const tok = (HTML.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
  assert.ok(HTML.includes('<script src="js/13-veille-ecran.js?v=' + tok + '"></script>\n<script src="js/14-enregistreur.js?v=' + tok + '"></script>'));
  const recV = (REC.match(/var REC_V = '(\d{8}[a-z])'/) || [])[1];   // [MANU · 05/10/2026] HTML relivré au jeton 20261005a, 14 inchangé : l'en-tête porte la version du FICHIER (REC_V), le src porte le jeton
  assert.ok(recV && REC.split('\n')[0].includes('VERSION ' + recV));
  const X = makeCtx(true);
  assert.deepStrictEqual(X.timers.map(t => t[0] + t[1]).sort(), ['i15000', 'i2000', 'i60000', 'i600000', 't90000']);
});
T('E14 · volume MESURÉ : une journée vivante simulée (11 paires, seaux et carnets chaque minute, 30 battements/min, 300 liquidations) passe par l\'enregistreur réel → quelques Mo, une seule écriture par jour', () => {
  const X = makeCtx(true), c = X.c, P = []; for (let i = 0; i < 11; i++) P.push('P' + i + '/USDT');
  c.S.flowStats = {}; c.S.orderBook = {}; c.S.liqStats = {};
  c._liqPairOf = () => 'P0/USDT';
  let bytes = 0; const t0 = Date.UTC(2026, 9, 4, 0, 0, 0);
  for (let m = 0; m < 1440; m++) {
    const M0 = t0 + m * M;
    P.forEach((p, i) => { const a = c.S.flowStats[p] || (c.S.flowStats[p] = []); a.push({ t: M0, buyQ: 12.3456789 + i, sellQ: 9.87654321, buyN: 160, sellN: 140, notional: 1234567.891, n: 300, bigBuy: 2, bigSell: 1, bigBuyUsd: 98765.4321, bigSellUsd: 45678.9 }); if (a.length > 30) a.shift();
      c.S.orderBook[p] = { t: M0 + 5000 * i, imb: 0.1234567, bidQ: 123.4567, askQ: 98.76543, bidWall: { p: 80123.45, q: 12.345 }, askWall: { p: 80234.56, q: 23.456 }, spreadPct: 0.0123457 }; });
    for (let s2 = 0; s2 < 60; s2 += 2) c._rec.watch(M0 + s2 * 1000);
    if (m % 5 === 0) c._rec.onLiqMsg({ data: JSON.stringify({ E: M0 + 100, o: { s: 'P0USDT', S: 'SELL', o: 'LIMIT', f: 'IOC', q: '0.5', p: '80000', ap: '79990', X: 'FILLED', l: '0.5', z: '0.5', T: M0 + 90 } }) });
    for (let s2 = 0; s2 < 60; s2 += 15) { X.clock.t = M0 + s2 * 1000 + 3000; c._rec.collect(X.clock.t); }
  }
  assert.strictEqual(X.c._recStatus.lost, 0, 'file jamais pleine en une journée');
  bytes = c._rec.queue().reduce((t, l) => t + l.length + 2, 0);
  const perDay = bytes + 450 * 220;   // + news (~450 articles/jour mesurés en 10e7)
  console.log('     ℹ️  mesuré : ' + (perDay / 1e6).toFixed(2) + ' Mo/jour (' + Math.round(bytes / 1440) + ' car./minute) → ' + Math.ceil(perDay / 3e6) + ' fichier(s)');
  assert.ok(perDay > 1e6 && perDay < 6e6, (perDay / 1e6).toFixed(2) + ' Mo');
});
T('E15 · file pleine (base indisponible) : les plus vieilles lignes partent, le compte est EXACT et une seule ligne « perte » datée part avec le lot suivant', async () => {
  const X = makeCtx(true, { idbFail: true });
  for (let i = 0; i < 20010; i++) X.c._rec.onLiqMsg({ data: JSON.stringify({ E: i, o: { s: 'BTCUSDT', S: 'SELL', q: '1', p: '1', ap: '1' } }) });
  assert.strictEqual(X.c._rec.queue().length, 20000); assert.strictEqual(X.c._recStatus.lost, 11, 'boot + 10 liquidations');
  assert.strictEqual(await X.c._rec.flush(T0), false); assert.ok(/base/.test(X.c._recStatus.err));
  X.idb.failPut = false;
  assert.strictEqual(await X.c._rec.flush(T0 + 1000), true);
  const first = X.idb.get(X.idb.keys()[0]).split('\n').map(l => JSON.parse(l));
  assert.strictEqual(first[0].k, 'perte'); assert.strictEqual(first[0].n, 11); assert.ok(first[0].de > 0 && first[0].a >= first[0].de);
  assert.strictEqual(first.length, 5000, 'un lot = 5 000 lignes au plus'); assert.strictEqual(first.filter(l => l.k === 'perte').length, 1);
  assert.strictEqual(X.c._recStatus.lost, 11);
});
T('E16 · base qui refuse un lot : RIEN n\'est perdu (lot remis en tête de file, dans l\'ordre), l\'erreur est dite, le lot part au vidage suivant', async () => {
  const X = makeCtx(true, { idbFail: true }); scenario(X);
  const before = X.c._rec.queue();
  assert.strictEqual(await X.c._rec.flush(X.clock.t), false);
  assert.deepStrictEqual(J(X.c._rec.queue()), J(before));
  X.idb.failPut = false; assert.strictEqual(await X.c._rec.flush(X.clock.t + 1000), true);
  assert.deepStrictEqual(J(X.idb.get(X.idb.keys()[0]).split('\n')), J(before)); assert.strictEqual(X.c._recStatus.err, null);
});
T('E17 · trade arrivé en retard dans un seau déjà enregistré : ligne re:1 avec le seau complet ; « la dernière ligne par paire et par t » redonne EXACTEMENT S.flowStats', () => {
  const X = makeCtx(true), c = X.c;
  c._recordTrade('BTC/USDT', 80000, 0.5, false, T0); c._rec.watch(T0); c._rec.collect(T0 + 63000);
  c._recordTrade('BTC/USDT', 80001, 2, true, T0 + 1000);   // en retard : même seau (dernier seau de la paire)
  c._rec.collect(T0 + 78000);
  const L = lines(X).filter(l => l.k === 'm' && l.fl && l.fl['BTC/USDT']);
  assert.strictEqual(L.length, 2); assert.strictEqual(L[1].re, 1); assert.strictEqual(L[1].al, undefined, 'pas de couverture sur une ligne re');
  assert.deepStrictEqual(J(L[1].fl['BTC/USDT']), J(c._rec.flowRow(c.S.flowStats['BTC/USDT'][0])));
  assert.strictEqual(L[1].fl['BTC/USDT'][2] + L[1].fl['BTC/USDT'][3], 2);
});
T('E18 · écriture : partie 2 refusée → rien n\'est effacé ; plus de 14 jours en attente mais écriture qui marche → AUCUN jour effacé, le plus vieux est écrit', async () => {
  const writes = [];
  const FS = { writeFile: async o => { if (/-p2\.json$/.test(o.path)) throw new Error('plein'); writes.push(o.path); return {}; } };
  const X = makeCtx(true, { fs: FS }); await X.c._rec.flush(T0);
  const big = []; for (let i = 0; i < 40000; i++) big.push(JSON.stringify({ k: 'm', t: i, pad: 'x'.repeat(60) }));
  X.idb.put('20261004|9999999999999|0|000001', big.join('\n'));
  assert.strictEqual(await X.c._rec.finalize(T0 + 86400000), null);
  assert.strictEqual(X.idb.keys().length, 2, 'rien effacé'); assert.ok(writes.some(w => /-p1\.json$/.test(w))); assert.ok(/partie 2/.test(X.c._recStatus.err));
  const w2 = []; const Y = makeCtx(true, { fs: { writeFile: async o => { w2.push(o.path); return {}; } } }); await Y.c._rec.flush(T0);
  for (let d = 1; d <= 15; d++) Y.idb.put(Y.c._rec.dayUTC(T0 + d * 86400000) + '|0000000000000|0|000000', '{"k":"m"}');
  const r = await Y.c._rec.finalize(T0 + 20 * 86400000);
  assert.deepStrictEqual(J(r), ['EXTERNAL_STORAGE:Download/AURA/aura_guardian_full_rec-20261004.json']);
  assert.deepStrictEqual(J(Y.c._recStatus.dropped), []); assert.strictEqual(Y.c._rec.queue().filter(l => /"perte"/.test(l)).length, 0);
});
T('E19 · couverture par paire : battements avec le flux @trade de chaque paire ouvert (ws) et paire du graphique (cp, dont 02 n\'enregistre pas les trades) ; liquidations des autres symboles agrégées (lqx) ; seaux de liquidations de l\'app (lqs)', () => {
  const X = makeCtx(true), c = X.c;
  X.run("var _bgCollectorWSMap = { 'BTC/USDT': { readyState: 1 }, 'SOL/USDT': { readyState: 3 } }; var _realCandlesState = { wsConnected: true, wsPair: 'SOL/USDT' };");
  X.run('_openLiqWs()');
  for (let s2 = 0; s2 < 60; s2 += 2) { X.clock.t = T0 - 3000 + s2 * 1000; c._rec.watch(X.clock.t); if (s2 === 10) c._liqWs.emit({ E: X.clock.t, o: { s: 'DOGEUSDT', S: 'SELL', q: '1000', p: '0.2', ap: '0.2' } }); if (s2 === 20) c._liqWs.emit({ E: X.clock.t, o: { s: 'BTCUSDT', S: 'BUY', q: '0.1', p: '80000', ap: '80000' } }); }
  c._rec.collect(T0 + 63000);
  const m = lines(X).find(l => l.k === 'm');
  assert.deepStrictEqual(J(m.ws), { 'BTC/USDT': 30 }); assert.deepStrictEqual(J(m.cp), { 'SOL/USDT': 30 });
  assert.deepStrictEqual(J(m.lqx), [1, 200, 0]);
  assert.deepStrictEqual(J(m.lqs), { 'BTC/USDT': [0, 8000, 1] }); assert.deepStrictEqual(J(m.lqs['BTC/USDT']), J(c._rec.liqRow(c.S.liqStats['BTC/USDT'][0])));
  assert.strictEqual(lines(X).filter(l => l.k === 'lq').length, 1, 'DOGE n\'est pas une paire de l\'app : agrégée, pas brute');
});
T('E20 · version et paires : boot.doc = token du src du script (DOC_V n\'existe pas encore au chargement) ; ligne cfg dès que l\'état est prêt, puis à chaque changement de paires', () => {
  const X = makeCtx(true), c = X.c;
  const boot = lines(X)[0]; assert.strictEqual(boot.k, 'boot'); assert.strictEqual(boot.doc, '20261004a'); assert.ok(/t \+ 60000 ≤ D/.test(boot.regles));
  c._rec.collect(T0); assert.strictEqual(lines(X).filter(l => l.k === 'cfg').length, 0, 'état pas prêt : rien');
  c._stateReady = true; c._rec.collect(T0 + 15000); c._rec.collect(T0 + 30000);
  c._bgPairsToWatch = () => ['BTC/USDT']; c._rec.collect(T0 + 45000);
  const cfg = lines(X).filter(l => l.k === 'cfg');
  assert.deepStrictEqual(J(cfg.map(l => l.pairs)), [['BTC/USDT', 'SOL/USDT', 'PEPE/USDT'], ['BTC/USDT']]); assert.strictEqual(cfg[0].doc, '20261004a');
});
T('E21 · restaurations RÉELLES de 09b3 : un enregistrement est refusé sans rien écrire ; un backup FULL est déplié (cycle lu dans aura) ; recoverFromFiles ignore l\'enregistrement et garde le backup', async () => {
  const s9 = rd('js/09b3-import-export.js');
  const IMP = between(s9, 'function importState() {', 'window.importState = importState;'), REC9 = between(s9, 'function recoverFromFiles() {', 'window.recoverFromFiles = recoverFromFiles;');
  const mk = () => { const o = { inp: null, conf: [], toasts: [], writes: 0 }; const c = { JSON, Math, Date, Array, Promise, console, RT: { SAVE_KEY: 'nexus_state_v2', STORE_STATE: 'state' },
    document: { createElement: () => (o.inp = { click() {} }) }, confirm: m => { o.conf.push(m); return false; }, showToast: m => o.toasts.push(m), openDB: async () => { o.writes++; }, localStorage: { setItem: () => o.writes++ } };
    c.window = c; vm.createContext(c); vm.runInContext(IMP + '\n' + REC9, c); o.c = c; return o; };
  const file = (obj, name) => ({ name, text: async () => JSON.stringify(obj) });
  const rec = { _type: 'aura_rec', v: '20261004a', day: '20261004', rec: [] }, full = { _type: 'aura_guardian_full', aura: { cycle: 1064359, totalTrades: 221, portfolio: 1089.4 } };
  let o = mk(); o.c.importState(); await o.inp.onchange({ target: { files: [file(rec, 'aura_guardian_full_rec-20261004.json')] } });
  assert.strictEqual(o.conf.length, 0); assert.strictEqual(o.writes, 0); assert.ok(/Pas une sauvegarde AURA \(enregistrement du marché\)/.test(o.toasts[0]));
  o = mk(); o.c.importState(); await o.inp.onchange({ target: { files: [file(full, 'aura_guardian_full_20261003-201027.json')] } });
  assert.strictEqual(o.conf.length, 1); assert.ok(o.conf[0].includes('Cycle : #1064359') && o.conf[0].includes('Trades : 221'));
  o = mk(); o.c.recoverFromFiles(); await o.inp.onchange({ target: { files: [file(rec, 'aura_guardian_full_rec-20261004.json'), file(full, 'aura_guardian_full_20261003-201027.json')] } });
  assert.strictEqual(o.conf.length, 1); assert.ok(o.conf[0].includes('aura_guardian_full_20261003-201027.json') && o.conf[0].includes('Cycle : 1064359'));
  o = mk(); o.c.recoverFromFiles(); await o.inp.onchange({ target: { files: [file(rec, 'aura_guardian_full_rec-20261004.json')] } });
  assert.strictEqual(o.conf.length, 0); assert.strictEqual(o.writes, 0); assert.ok(/Aucune sauvegarde AURA/.test(o.toasts[0]));
});
T('E22 · sans IndexedDB (navigateur limité) : l\'enregistreur se charge, relève, et dit l\'erreur au vidage — jamais d\'exception', async () => {
  const X = makeCtx(true, { idb: null }); scenario(X);
  assert.strictEqual(await X.c._rec.flush(X.clock.t), false); assert.ok(/IndexedDB absente/.test(X.c._recStatus.err));
  assert.ok(X.c._rec.queue().length > 10);
});

(async () => {
  for (const [name, fn] of ASYNC) {
    try { await fn(); pass++; console.log('  ✅ ' + name); }
    catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); }
  }
  console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
  process.exit(fail ? 1 : 0);
})();
