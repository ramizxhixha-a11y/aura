// banc-fibonacci.js — [GO FIBONACCI · 21/11/2026] bot Fibonacci 6 unités (js/18-fibonacci-lecture.js) : LECTURE seule sur la fiche MAN, sans vote.
// La porte (rejeu/porte_fibonacci.py, règles figées 21/11 07:08:43 UTC) : aucune des 33 versions ne passe le test A → rien n'entre dans la décision.
// Chaque essai fait tourner le VRAI texte du module en vm.
//   F1  la lecture = la règle de la porte : sur banc-fixtures/fibonacci-reference.json (bougies 1 h BTC 03/2021 et 4 h ETH 01/2022, archives
//       Binance agrégées PAR LE MOTEUR DE LA PORTE, signal attendu calculé par ses fonctions agg + extremes), à CHAQUE clôture : même sens (LONG,
//       SHORT, aucun), mêmes H et L, même stop et objectif au bit près, même impulsion ; série de moins de 55 bougies → « court »
//   F2  témoin : la même comparaison sur le module muté (zone 50–78,6 % au lieu de 38,2–61,8 %) TROUVE des écarts — le banc voit une différence
//   F3  refus : trou d'horodatage → « lacunaire », bougie non finie → « lacunaire », aucun écart → « plat », 54 bougies → « court »
//   F4  la fiche : MAN ouverte (BTC/USDT) → section « Bot Fibonacci » ajoutée EN DERNIER ; une requête à la fois, une par unité, 5m 15m 30m 1h 4h 1d,
//       limit=56 ; la bougie en cours est écartée ; le prix montré = sa clôture (Binance), jamais ps.price ; 6 lignes lues
//   F5  hors ligne : aucune requête ; erreur HTTP 451 : « ⛔ HTTP 451 », aucun niveau inventé, nouvel essai pas avant 60 s
//   F6  rien d'autre : le module ne lit ni n'écrit S, n'appelle aucune ouverture / fermeture / décision / stockage (texte du module) ; fiche
//       fermée → minuteur arrêté ; fiche d'une paire non MAN (pas de #manSys_) → rien ajouté
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = rd('js/18-fibonacci-lecture.js');
const REF = JSON.parse(rd('banc-fixtures/fibonacci-reference.json'));
let pass = 0, fail = 0;
const tests = [];
function T(name, fn) { tests.push([name, fn]); }

function mkEl(id) {
  const el = { id: id || '', className: '', innerHTML: '', children: [], _cls: new Set(),
    classList: { contains: c => el._cls.has(c), add: c => el._cls.add(c), remove: c => el._cls.delete(c) },
    appendChild(c) { el.children.push(c); if (c.id) DOM.reg[c.id] = c; if (DOM.obs) DOM.obsQ.push(1); return c; } };
  return el;
}
const DOM = { reg: {}, obs: null, obsQ: [] };
function boot(opts) {
  opts = opts || {};
  DOM.reg = {}; DOM.obs = null; DOM.obsQ = [];
  const calls = [], timers = [];
  let now = opts.now || Date.UTC(2026, 10, 21, 8, 30, 0);
  const overlay = mkEl('pairDetailOverlay'), body = mkEl('pairDetailBody');
  DOM.reg.pairDetailOverlay = overlay; DOM.reg.pairDetailBody = body;
  if (opts.open !== false) overlay._cls.add('open');
  if (opts.man !== false) body.appendChild(Object.assign(mkEl('manSys_BTC_USDT'), { className: 'detail-section' }));
  const S = opts.S || { pairStates: { 'BTC/USDT': { price: 12345.678 } } };
  const sJson = JSON.stringify(S);
  const ctx = {
    console, Math, JSON, Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } },
    Promise, Error, String, Number, Array, Object, isFinite, isNaN, setImmediate,
    navigator: { onLine: opts.offline ? false : true },
    document: { readyState: 'complete', getElementById: id => DOM.reg[id] || null, createElement: () => mkEl(''), addEventListener() {} },
    MutationObserver: class { constructor(cb) { this.cb = cb; DOM.obs = this; } observe() {} },
    setInterval: (fn, ms) => { timers.push({ fn, ms, on: true }); return timers.length; },
    clearInterval: h => { if (timers[h - 1]) timers[h - 1].on = false; },
    AbortSignal: { timeout: () => ({}) },
    fetch: (url) => { calls.push(url); return opts.fetch ? opts.fetch(url, now) : Promise.resolve(klines(url, now)); },
    S, _currentDetailPair: opts.pair || 'BTC/USDT',
    pxTxt: (p, v) => Number(v).toFixed(2)
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'js/18-fibonacci-lecture.js' });
  return { ctx, calls, timers, body, overlay, sJson, S,
    setNow: t => { now = t; }, getNow: () => now,
    fireObs: () => { if (DOM.obs) DOM.obs.cb([]); },
    tick: () => timers.filter(t => t.on).forEach(t => t.fn()),
    flush: () => new Promise(r => setImmediate(() => setImmediate(r))) };
}
const IVMS = { '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
function klines(url, now) {
  const iv = /interval=([0-9a-z]+)/.exec(url)[1], u = IVMS[iv], lim = +/limit=(\d+)/.exec(url)[1];
  const lastOpen = Math.floor(now / u) * u, out = [];
  for (let k = lim - 1; k >= 0; k--) {
    const t = lastOpen - k * u, x = 100 + Math.sin(t / u / 7) * 10 + (t / u % 3);
    out.push([t, String(x), String(x + 1), String(x - 1), String(x + 0.5), '1', t + u - 1]);
  }
  return { ok: true, status: 200, json: () => Promise.resolve(out) };
}

function compare(src) {
  const ctx = { Math, Array, isFinite, Infinity, window: {}, document: { readyState: 'complete', getElementById: () => null, addEventListener() {} }, navigator: {} };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
  let bad = 0, seen = 0, sig = 0;
  for (const c of REF.cas) {
    for (let i = 0; i < c.bars.length; i++) {
      const r = ctx._fibRead(c.bars.slice(0, i + 1), c.N, c.unit_ms), e = c.attendu[i]; seen++;
      if (e === null) { if (r.ok || r.why !== 'court') bad++; continue; }
      if (!r.ok) { bad++; continue; }
      if (r.H !== e[1] || r.L !== e[2]) { bad++; continue; }
      if (e[0] !== 0) { sig++; if (r.side !== e[0] || r.stop !== e[3] || r.tgt !== e[4]) bad++; }
      else if (r.side !== 0 || r.dir !== e[3]) bad++;
    }
  }
  return { bad, seen, sig };
}

T('F1 lecture = règle de la porte, à chaque clôture (1 h BTC, 4 h ETH)', () => {
  const r = compare(SRC);
  assert.strictEqual(r.seen, 900); assert.ok(r.sig >= 150, 'signaux : ' + r.sig);
  assert.strictEqual(r.bad, 0, r.bad + ' écarts sur ' + r.seen);
});
T('F2 témoin : le module muté (zone 50–78,6 %) est attrapé', () => {
  const mut = SRC.split('H - 0.618 * R <= c && c <= H - 0.382 * R').join('H - 0.786 * R <= c && c <= H - 0.5 * R')
                 .split('L + 0.382 * R <= c && c <= L + 0.618 * R').join('L + 0.5 * R <= c && c <= L + 0.786 * R');
  assert.notStrictEqual(mut, SRC, 'mutation non appliquée');
  assert.ok(compare(mut).bad > 0, 'le banc ne voit pas la mutation');
});
T('F3 refus : trou, bougie non finie, plat, court', () => {
  const b = boot(), f = b.ctx._fibRead, c = REF.cas[0], bars = c.bars.slice(0, 55).map(x => x.slice());
  assert.strictEqual(f(bars, 55, c.unit_ms).ok, true);
  const t = bars.map(x => x.slice()); t[20][0] += c.unit_ms; assert.strictEqual(f(t, 55, c.unit_ms).why, 'lacunaire');
  const n = bars.map(x => x.slice()); n[30][4] = NaN; assert.strictEqual(f(n, 55, c.unit_ms).why, 'lacunaire');
  const p = bars.map((x, i) => [x[0], 5, 5, 5, 5]); assert.strictEqual(f(p, 55, c.unit_ms).why, 'plat');
  assert.strictEqual(f(bars.slice(1), 55, c.unit_ms).why, 'court');
});
T('F4 fiche MAN : section en dernier, 6 unités une à une, bougie en cours écartée, prix Binance', async () => {
  const b = boot();
  b.fireObs();
  const sec = b.body.children[b.body.children.length - 1];
  assert.strictEqual(sec.id, 'fib_BTC_USDT'); assert.ok(sec.innerHTML.includes('Bot Fibonacci'));
  assert.strictEqual(b.calls.length, 1, 'une requête à la fois');
  for (let k = 0; k < 8; k++) { await b.flush(); b.tick(); }
  await b.flush();
  const ivs = b.calls.map(u => /interval=([0-9a-z]+)/.exec(u)[1]);
  assert.deepStrictEqual(ivs, ['5m', '15m', '30m', '1h', '4h', '1d']);
  assert.ok(b.calls.every(u => u.startsWith('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&') && u.endsWith('&limit=56')));
  const st = b.ctx._fibState.c['BTC/USDT'];
  Object.keys(IVMS).forEach(iv => assert.strictEqual(st[iv].bars.length, 55, iv + ' : bougie en cours non écartée'));
  const lastOpen = Math.floor(b.getNow() / 300000) * 300000, x = 100 + Math.sin(lastOpen / 300000 / 7) * 10 + (lastOpen / 300000 % 3);
  assert.strictEqual(st['5m'].px, x + 0.5);
  const html = b.body.children[b.body.children.length - 1].innerHTML;
  assert.ok(html.includes((x + 0.5).toFixed(2)), 'prix Binance montré');
  assert.ok(!html.includes('12345.68'), 'ps.price montré');
  assert.strictEqual((html.match(/ · zone /g) || []).length, 6, '6 lignes lues');
  assert.strictEqual(b.calls.length, 6);
});
T('F5 hors ligne : rien ; HTTP 451 : motif, aucun niveau, nouvel essai après 60 s', async () => {
  const off = boot({ offline: true }); off.fireObs(); off.tick(); await off.flush();
  assert.strictEqual(off.calls.length, 0);
  assert.ok(off.body.children[off.body.children.length - 1].innerHTML.includes('hors ligne'));
  const b = boot({ fetch: () => Promise.resolve({ ok: false, status: 451, json: () => Promise.resolve([]) }) });
  b.fireObs(); await b.flush();
  for (let k = 0; k < 6; k++) { b.tick(); await b.flush(); }
  const html = b.body.children[b.body.children.length - 1].innerHTML;
  assert.ok(html.includes('⛔ HTTP 451')); assert.ok(!html.includes(' · zone '), 'niveau inventé');
  const n0 = b.calls.length; assert.strictEqual(n0, 6);
  b.setNow(b.getNow() + 30000); b.tick(); await b.flush(); assert.strictEqual(b.calls.length, n0, 'nouvel essai avant 60 s');
  b.setNow(b.getNow() + 31000); b.tick(); await b.flush(); assert.strictEqual(b.calls.length, n0 + 1);
});
T('F6 rien d\'autre : ni S, ni trade, ni stockage ; fiche fermée → minuteur arrêté ; fiche non MAN → rien', async () => {
  const code = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  assert.ok(!/\bS\s*[\.\[]/.test(code), 'le module lit S');
  ['openPosition', 'closePosition', 'autoOpenPosition', 'localStorage', 'indexedDB', 'saveState', '_dc', 'councilVote', '_agents', 'S.agents']
    .forEach(w => assert.ok(!code.includes(w), 'le module appelle ' + w));
  const b = boot(); b.fireObs(); for (let k = 0; k < 8; k++) { await b.flush(); b.tick(); } await b.flush();
  assert.strictEqual(JSON.stringify(b.S), b.sJson, 'S modifié');
  b.overlay._cls.delete('open'); b.tick();
  assert.ok(b.timers.every(t => !t.on), 'minuteur encore actif fiche fermée');
  const nm = boot({ man: false }); nm.fireObs();
  assert.strictEqual(nm.body.children.length, 0); assert.strictEqual(nm.calls.length, 0);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('  ✓ ' + name); }
    catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
  }
  console.log('\n' + (fail ? '❌ ' + pass + '/' + (pass + fail) + ' tests passés — ' + fail + ' ÉCHEC(S)' : '✅ ' + pass + '/' + pass + ' tests passés'));
  process.exit(fail ? 1 : 0);
})();
