// banc-bilan-horizons.js — [BILAN AUX HORIZONS · 27/09/2026] VERSION 20260927k
// Rams (27/09 23:20, « Go ») : juger les voix de la décision commune comme la décision — sur les trades virtuels de la paire, de
// 15 min à 4 h, perte max comprise — et peser la décision commune avec ce bilan ; toujours sans trader ; rejoué avant livraison.
// Fonctions RÉELLES de 03 en vm (décision commune + moteur des trades virtuels) ; textes de 07, 10f ; panneau RÉEL de 11b.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 50)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s10f = rd('js/10f-resolveur-cycle.js'), s07 = rd('js/07-v90-mode-bunker-sos.js');
const DC = between(s03, "const _DC_BOTS = ['scalper_bot_v1', 'arb_bot_v1', 'dca_bot_v1'];", 'window._thNote = _thNote;', false);
const Q = 900000, HZ = [1, 2, 4, 8, 16], R4 = x => Math.round(x * 10000) / 10000, J = x => JSON.parse(JSON.stringify(x));
function mk(o) {
  o = o || {};
  const S = Object.assign({ tradingMode: 'paperReal', paperRealTimeframe: '15m', chainLog: [], realPairCycle: {}, realCandles: {}, pairStates: {}, agents: [] }, o.S || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, Date: { now: () => c.__now }, __now: o.now || 0, __px: {}, __age: {}, PAIRS: {},
    FIT_WINDOW: 60, FIT_MIN_N: 5, FIT_KEEP: 240, _fitWindow: () => (c.__W || 60), _fitJudge: () => 0, _ownStakeCostPct: () => (o.cost === undefined ? 0.275 : o.cost), nowStr: () => '12:00:00' };
  c._rcLastPrice = p => c.__px[p] || 0; c._rcPriceAge = p => (c.__age[p] === undefined ? 0 : c.__age[p]);
  vm.createContext(c); vm.runInContext(DC, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
// une voix avec un ancien bilan E (fenêtre de la fitness) : n jugements tous justes (E = 1) ou tous faux (E = −1), ou mêlés
const agent = (id, E, n) => ({ id, name: id, isBot: false, isMeta: false, fitness: 350, _judgments: Array.from({ length: n === undefined ? 10 : n }, (_, i) => ({ s: E === null ? (i % 2 ? 1 : -1) : (E >= 0 ? 1 : -1), w: 1, k: i })) });
// bougies : k = dernière close au moment de la note, k+Q en cours ; puis closes au fil du temps
const series = (k, px) => [{ ts: k - Q, o: px, h: px, l: px, c: px }, { ts: k, o: px, h: px, l: px, c: px }, { ts: k + Q, o: px, h: px, l: px, c: px }];
console.log('▶ banc-bilan-horizons');

T('M1 · _vjNote : les votes de CE cycle (ps._dcVj posé par _dcConsensus, < 60 s) partent avec les deux trades de la paire — long (perte max capL) et short (capS), même entrée au dernier prix réel, 5 sorties ; mêmes refus que _thNote ; une fois par bougie ; début de la mesure posé une fois', () => {
  const k = 1000 * Q, tn = k + Q + 5000;
  const t = mk({ now: tn, S: { realPairCycle: { 'SOL/USDT': k }, realCandles: { 'SOL/USDT': { '15m': series(k, 100) } }, pairStates: { 'SOL/USDT': { _dcVj: { t: tn - 1000, v: [['a1', 0.5], ['a2', -0.2], ['composite', 0.05], ['scalper_bot_v1', 1.1]], C1: 0.3, Ch: -0.1 } } } } });
  t.c.__px['SOL/USDT'] = 100.2;
  assert.strictEqual(t.c._vjNote('SOL/USDT', 2.7, 2.1), true);
  const T3 = t.S.dcThreshold, q = T3.pendV[0];
  assert.deepStrictEqual(J(T3.vIds), ['a1', 'a2', 'composite', 'scalper_bot_v1']);
  assert.deepStrictEqual(J([q.p, q.k, q.t, q.f, q.v, q.dO, q.dH, q.a]), ['SOL/USDT', k, tn, Q, [[0, 500], [1, -200], [2, 50], [3, 1100]], 1, -1, [0, 0, 0, 0, 0]]);
  const tr = (d, cap) => ({ p: 'SOL/USDT', k, t: tn, px: 100.2, d, c: 0, f: Q, tf: '15m', cap, x: HZ.map(h => k + Q + h * Q), n: [null, null, null, null, null], s: k, s0: k + Q, el: 100, eh: 100, hit: 0 });
  assert.deepStrictEqual(J(q.L), tr(1, 2.7)); assert.deepStrictEqual(J(q.S), tr(-1, 2.1));
  assert.strictEqual(T3.vSince, tn);
  assert.strictEqual(t.c._vjNote('SOL/USDT', 2.7, 2.1), false, 'une fois par bougie');
  t.c.__now = tn + 61000; t.S.realPairCycle['SOL/USDT'] = k + Q; assert.strictEqual(t.c._vjNote('SOL/USDT', 2, 2), false, 'votes d\'un autre cycle (> 60 s) : rien');
  t.c.__now = tn; t.S.realPairCycle['SOL/USDT'] = k + Q; t.S.pairStates['SOL/USDT']._dcVj.t = tn; t.c.__age['SOL/USDT'] = 120001; assert.strictEqual(t.c._vjNote('SOL/USDT', 2, 2), false, 'prix figé > 2 min');
  t.c.__age['SOL/USDT'] = 0; t.S.realCandles['SOL/USDT']['15m'][1]._gap = true; t.S.realPairCycle['SOL/USDT'] = k; assert.strictEqual(t.c._vjNote('SOL/USDT', 2, 2), false, 'bougie close = bouche-trou (et déjà notée)');
  t.S.tradingMode = 'sim'; assert.strictEqual(t.c._vjNote('SOL/USDT', 2, 2), false, 'mode simulé : rien');
  assert.strictEqual(T3.pendV.length, 1); assert.strictEqual(T3.vSince, tn, 'début de la mesure jamais réécrit');
  // perte max bornée 1,5-3 % ; sans valeur : 2 %
  const t2 = mk({ now: tn, S: { realPairCycle: { 'X/USDT': k }, realCandles: { 'X/USDT': { '15m': series(k, 5) } }, pairStates: { 'X/USDT': { _dcVj: { t: tn, v: [['a1', 0.4]], C1: 0, Ch: 0 } } } } }); t2.c.__px['X/USDT'] = 5;
  t2.c._vjNote('X/USDT', 9, undefined); const q2 = t2.S.dcThreshold.pendV[0]; assert.deepStrictEqual([q2.L.cap, q2.S.cap, q2.dO, q2.dH], [3, 2, 0, 0]);
  // file pleine : refusé, sans toucher au sens décidé
  t2.S.dcThreshold.pendV = Array.from({ length: t2.run('TH_PEND_MAX') }, () => ({ p: 'Y', k: 1 })); t2.S.realPairCycle['X/USDT'] = k + Q; t2.S.realCandles['X/USDT']['15m'].push({ ts: k + 2 * Q, c: 5, h: 5, l: 5 });
  assert.strictEqual(t2.c._vjNote('X/USDT', 2, 2), false, 'file pleine'); assert.strictEqual(t2.S.dcThreshold.pend.length, 0);
});

T('M2 · _vjJudge : les deux trades marchent avec _thWalk ; à chaque horizon jugé des deux côtés, D = (long − short) / 2 et chaque voix (|v| ≥ 0,03) reçoit [v, D] — même D pour tous ; perte max d\'un côté comprise ; un côté abandonné → personne ; abstention → rien ; cycle sorti de l\'attente quand tout est tranché', () => {
  const k = 2000 * Q, tn = k + Q + 5000, ser = series(k, 100);
  const t = mk({ now: tn, S: { agents: ['a1', 'a2', 'a3', 'a4'].map(id => ({ id })), realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': ser } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a1', 0.5], ['a2', -0.2], ['a3', 0.02], ['a4', 0.03]], C1: 0.3, Ch: -0.1 } } } } });
  t.c.__px['ETH/USDT'] = 100; t.c._vjNote('ETH/USDT', 2, 2);
  const add = (i, c, l, h) => ser.push({ ts: k + i * Q, o: c, h: h === undefined ? c : h, l: l === undefined ? c : l, c });
  add(2, 100.5, 100, 100.6); add(3, 100.5);        // 15 min : sortie k+2Q, +0,5 % (k+3Q en cours : la dernière bougie n'est jamais lue)
  t.c.__now = k + 3 * Q + 1000; t.c._thJudge();    // k+2Q close
  const T3 = t.S.dcThreshold, q = T3.pendV[0];
  assert.deepStrictEqual(J([q.L.n[0], q.S.n[0], q.a]), [R4(0.5 - 0.275), R4(-0.5 - 0.275), [1, 0, 0, 0, 0]]);
  const D0 = 0.5;   // (net long − net short) / 2 = mouvement : les frais s'annulent
  assert.deepStrictEqual(J(T3.vHz), { a1: [[500, 5000], [], [], [], []], a2: [[-200, 5000], [], [], [], []], a4: [[30, 5000], [], [], [], []] }, 'même D pour toutes les voix (record à plat : v, D, …) ; a3 (0,02) s\'abstient');
  assert.strictEqual(T3.vCmp[0][Object.keys(T3.vCmp[0])[0]][0], Math.round((-1 - 1) * D0 * 10000), 'écart apparié (sens nouveau −1 − sens ancien +1) × D');
  assert.strictEqual(T3.vCmp[0][Object.keys(T3.vCmp[0])[0]][1], 1);
  // 30 min : k+3Q avec un creux à −2,1 % → la perte max du LONG (2 %) est touchée ; le short sort à la clôture
  Object.assign(ser[ser.length - 1], { c: 99.5, l: 97.9, h: 100.5 }); add(4, 99.5); t.c.__now = k + 4 * Q + 1000; t.c._thJudge();
  assert.strictEqual(q.L.n[1], R4(-2 - 0.275)); assert.strictEqual(q.S.n[1], R4(0.5 - 0.275));
  const D1 = (q.L.n[1] - q.S.n[1]) / 2; assert.deepStrictEqual(J(T3.vHz.a1[1]), [500, Math.round(D1 * 10000)]); assert.ok(D1 < 0);
  // 1 h : bouche-trou sur le chemin → le short est abandonné (le long, lui, a déjà touché sa perte max : issue connue) → personne n'est jugé, l'horizon est clos
  ser[ser.length - 1]._gap = true; add(5, 99.4); add(6, 99.4); add(7, 99.4); t.c.__now = k + 7 * Q + 1000; t.c._thJudge();
  assert.strictEqual(q.L.n[2], -2.275); assert.strictEqual(q.S.n[2], false); assert.strictEqual(q.a[2], 1); assert.deepStrictEqual(J(T3.vHz.a1[2]), []);
  for (let i = 8; i <= 21; i++) add(i, 99.4);
  t.c.__now = k + 21 * Q + 1000; t.c._thJudge(); assert.strictEqual(T3.pendV.length, 0, 'tout tranché : sorti de l\'attente');
  assert.deepStrictEqual(J(q.a), [1, 1, 1, 1, 1]); assert.strictEqual(T3.vHz.a1.filter(L => L.length).length, 2, '2 h et 4 h : short abandonné aussi (coupure avant la sortie) → personne'); assert.deepStrictEqual(J(q.S.n), [R4(-0.5 - 0.275), R4(0.5 - 0.275), false, false, false]);
  // le sens décidé n'a rien vu de tout ça
  assert.deepStrictEqual([T3.pend.length, T3.rec.length, T3.pendC.length, T3.recC.length], [0, 0, 0, 0]);
});

T('M3 · _dcMeritHz : null tant qu\'un horizon a moins de 5 jugements dans la fenêtre APPRISE ; E_h = Σ v·D / Σ |v·D| ; poids = max(0, moyenne des 5) ; jugements gardés jusqu\'à 240, lus sur la fenêtre', () => {
  const t = mk({ now: 5000 * Q });
  t.S.dcThreshold = { vHz: { a1: [[500, 100], [], [], [], []] } };
  assert.strictEqual(t.c._dcMeritHz('a1'), null); assert.strictEqual(t.c._dcMeritHz('inconnu'), null);
  const L = (pairs) => pairs.reduce((a, p) => a.concat([p[0], p[1]]), []);   // à plat
  // 15 min : toujours juste (E = 1) ; 30 min : juste 2 fois sur 3 en poids (E = 1/3) ; 1 h : nul ; 2 h : faux (E = −1) ; 4 h : (3 − 1) / 4 = 0,5
  t.S.dcThreshold.vHz.a1 = [L([[500, 100], [500, 100], [-300, -100], [-300, -100], [700, 200]]), L([[500, 100], [500, 100], [500, -100], [500, 100], [500, -100], [500, 100]]),
    L([[500, 100], [500, -100], [500, 100], [500, -100], [500, 100], [500, -100]]), L([[500, -100], [500, -100], [500, -100], [500, -100], [500, -100]]), L([[100, 300], [100, 300], [100, 300], [100, -300], [100, 0]])];
  const E = [1, 1 / 3, 0, -1, 0.5];
  assert.ok(Math.abs(t.c._dcMeritHz('a1') - E.reduce((s, x) => s + x, 0) / 5) < 1e-12, 'moyenne des 5 : ' + t.c._dcMeritHz('a1'));
  t.S.dcThreshold.vHz.a1[0] = L([[500, -100], [500, -100], [500, -100], [500, -100], [500, -100], [500, -100]]); assert.strictEqual(t.c._dcMeritHz('a1'), 0, 'moyenne négative → 0');
  // fenêtre apprise : W = 5 → seuls les 5 derniers comptent
  t.c.__W = 5; t.S.dcThreshold.vHz.a1 = [L(Array.from({ length: 20 }, (_, i) => [500, i < 15 ? -100 : 100])), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]]), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]]), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]]), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]])];
  assert.strictEqual(t.c._dcMeritHz('a1'), 1, 'les 5 derniers de 15 min sont justes'); t.c.__W = 60; assert.ok(Math.abs(t.c._dcMeritHz('a1') - (4 + (-15 + 5) / 20) / 5) < 1e-12, 'fenêtre 60 : les 20 comptent (E = −0,5) : ' + t.c._dcMeritHz('a1'));
  t.c.__W = 4; assert.strictEqual(t.c._dcMeritHz('a1'), null, 'fenêtre 4 < 5 jugements exigés'); t.c.__W = 60;
  t.S.dcThreshold.vHz.a1[1] = [500, 100, 500, 100, 500, 100]; assert.strictEqual(t.c._dcMeritHz('a1'), null, '3 jugements (6 nombres) à 30 min : pas encore, même avec W = 60');
  // lecture des W DERNIERS jugements (2W nombres) : 10 anciens faux puis 5 récents justes, W = 5 → E = 1 ; W = 10 → (5 − 5) / 10 = 0
  t.S.dcThreshold.vHz.a1 = [L(Array.from({ length: 15 }, (_, i) => [500, i < 10 ? -100 : 100])), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]]), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]]), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]]), L([[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]])];
  t.c.__W = 5; assert.strictEqual(t.c._dcMeritHz('a1'), 1); t.c.__W = 10; assert.ok(Math.abs(t.c._dcMeritHz('a1') - 4 / 5) < 1e-12, 'W = 10 : E(15 min) = 0'); t.c.__W = 60;
  // garde 240 par horizon (comme les jugements de la fitness), même si la fenêtre est plus courte
  const k = 3000 * Q, ser = series(k, 10); const t2 = mk({ now: k + Q + 1000, S: { realPairCycle: { 'A/USDT': k }, realCandles: { 'A/USDT': { '15m': ser } }, pairStates: { 'A/USDT': {} } } }); t2.c.__px['A/USDT'] = 10;
  t2.S.dcThreshold = { vHz: { a1: [Array.from({ length: 240 }, (_, i) => [500, i]).reduce((a, p) => a.concat(p), []), [], [], [], []] } }; t2.run('_thState()');
  t2.S.dcThreshold.pendV = [{ p: 'A/USDT', k, t: k + Q + 1000, f: Q, v: [[0, 500]], dO: 0, dH: 0, a: [0, 1, 1, 1, 1], L: { p: 'A/USDT', k, t: k + Q + 1000, px: 10, d: 1, c: 0, f: Q, tf: '15m', cap: 2, x: [k + 2 * Q, 0, 0, 0, 0], n: [null, 1, 1, 1, 1], s: k, s0: k + Q, el: 10, eh: 10, hit: 0 }, S: { p: 'A/USDT', k, t: k + Q + 1000, px: 10, d: -1, c: 0, f: Q, tf: '15m', cap: 2, x: [k + 2 * Q, 0, 0, 0, 0], n: [null, 1, 1, 1, 1], s: k, s0: k + Q, el: 10, eh: 10, hit: 0 } }];
  t2.S.dcThreshold.vIds = ['a1']; ser.push({ ts: k + 2 * Q, c: 10.1, h: 10.1, l: 10 }, { ts: k + 3 * Q, c: 10.1 }); t2.c.__now = k + 3 * Q + 1000; t2.c._thJudge();
  assert.strictEqual(Object.keys(t2.S.dcThreshold.vCmp[0]).length, 0, 'une des deux pesées nulle (dO = 0) : pas d\'écart apparié pour ce cycle');
  assert.strictEqual(t2.S.dcThreshold.vHz.a1[0].length, 480); assert.deepStrictEqual(J(t2.S.dcThreshold.vHz.a1[0].slice(478)), [500, 10000 * (0.1 / 10 * 100)].map(Math.round), 'le plus vieux sort, le nouveau entre'); assert.deepStrictEqual(J(t2.S.dcThreshold.vHz.a1[0].slice(0, 2)), [500, 1]);
  // record abîmé (pas un tableau) : régénéré, la passe continue
  t2.S.dcThreshold.vHz.a1[0] = 'abîmé'; t2.S.dcThreshold.pendV = [{ p: 'A/USDT', k, t: k + Q + 1000, f: Q, v: [[0, 500]], dO: 0, dH: 0, a: [0, 1, 1, 1, 1], L: { p: 'A/USDT', k, t: k + Q + 1000, px: 10, d: 1, c: 0, f: Q, tf: '15m', cap: 2, x: [k + 2 * Q, 0, 0, 0, 0], n: [null, 1, 1, 1, 1], s: k, s0: k + Q, el: 10, eh: 10, hit: 0 }, S: { p: 'A/USDT', k, t: k + Q + 1000, px: 10, d: -1, c: 0, f: Q, tf: '15m', cap: 2, x: [k + 2 * Q, 0, 0, 0, 0], n: [null, 1, 1, 1, 1], s: k, s0: k + Q, el: 10, eh: 10, hit: 0 } }];
  t2.c._thJudge(); assert.deepStrictEqual(J(t2.S.dcThreshold.vHz.a1[0]), [500, 10000], 'régénéré');
  // record d'une autre forme (paires emboîtées : essais jamais livrés) : écarté à _thState, la voix se rejuge
  t2.S.dcThreshold.vHz.a1 = HZ.map(() => [[500, 100], [500, 100], [500, 100], [500, 100], [500, 100]]); t2.S.dcThreshold.vHz.a9 = [[500, 100], [], [], [], []]; t2.run('_thState()');
  assert.deepStrictEqual(Object.keys(t2.S.dcThreshold.vHz), ['a9'], 'emboîté écarté, à plat gardé'); assert.strictEqual(t2.c._dcMeritHz('a1'), null);
  // entrée abîmée en tête de file : signalée (_decErr), retirée ; l'entrée saine derrière est jugée quand même
  const errs = []; t2.c.window._decErr = e => errs.push(String(e && e.message || e));
  const sane = () => ({ p: 'A/USDT', k: k + Q, t: k + 2 * Q + 1000, f: Q, v: [[0, 500]], dO: 1, dH: 0, a: [0, 1, 1, 1, 1], L: { p: 'A/USDT', k: k + Q, t: k + 2 * Q + 1000, px: 10, d: 1, c: 0, f: Q, tf: '15m', cap: 2, x: [k + 3 * Q, 0, 0, 0, 0], n: [null, 1, 1, 1, 1], s: k + Q, s0: k + 2 * Q, el: 10, eh: 10, hit: 0 }, S: { p: 'A/USDT', k: k + Q, t: k + 2 * Q + 1000, px: 10, d: -1, c: 0, f: Q, tf: '15m', cap: 2, x: [k + 3 * Q, 0, 0, 0, 0], n: [null, 1, 1, 1, 1], s: k + Q, s0: k + 2 * Q, el: 10, eh: 10, hit: 0 } });
  const broken = sane(); delete broken.L.x; t2.S.dcThreshold.pendV = [broken, sane()]; t2.S.dcThreshold.vHz = {}; ser.push({ ts: k + 4 * Q, c: 10.2 }); t2.c.__now = k + 4 * Q + 1000; t2.c._thJudge();
  assert.strictEqual(errs.length, 1, 'signalée une fois'); assert.strictEqual(t2.S.dcThreshold.pendV.length, 0, 'l\'abîmée retirée, la saine jugée et sortie'); assert.deepStrictEqual(J(t2.S.dcThreshold.vHz.a1[0]), [500, 10000 * (0.1 / 10 * 100)].map(Math.round), 'la saine a bien été jugée');
  assert.strictEqual(Object.keys(t2.S.dcThreshold.vCmp[0]).length, 0, 'une seule pesée nulle (dH = 0) : pas d\'écart apparié');
});

T('M4 · _dcConsensus RÉEL : deux pesées côte à côte sur les mêmes voix — ancienne (bilan de la bougie suivante) et aux horizons (repli sur l\'ancien poids tant que la voix n\'est pas jugée) ; la décision vivante suit le mode ; les votes (bots compris, même sans poids) sont posés pour _vjNote', () => {
  const t = mk({ now: 7000 * Q }); t.run('_thState()');
  t.S.agents = [agent('a1', 1), agent('a2', 1), agent('a3', -1), agent('a4', 1, 2), { id: 'scalper_bot_v1', isBot: true, fitness: 350, _judgments: [] }, { id: 'meta', isMeta: true }];
  t.S.pairStates = { 'BTC/USDT': { price: 100 } };
  const votes = { a1: 0.8, a2: -0.4, a3: 0.9, a4: 0.7 }, voteOf = a => votes[a.id] || 0;
  // ancienne pesée : a1 (E = 1) et a2 (E = 1) pèsent ; a3 (E = −1 → 0) et a4 (2 jugements < 5) ne pèsent pas → C1 = (0,8 − 0,4) / 2 = 0,2
  let r = t.c._dcConsensus('BTC/USDT', voteOf, 0.02);
  assert.ok(Math.abs(r.C1 - 0.2) < 1e-12 && Math.abs(r.Ch - 0.2) < 1e-12 && r.mode === 'hz' && Math.abs(r.C - 0.2) < 1e-12, JSON.stringify(r));
  assert.deepStrictEqual(J(t.S.pairStates['BTC/USDT']._dcVj.v), [['a1', 0.8], ['a2', -0.4], ['a3', 0.9], ['a4', 0.7]], 'toutes les voix qui parlent, pesées ou non ; composite 0,02 < 0,03 : abstention');
  // le composite parle ; le Scalper voit la paire (LMSR décollé + volatilité) : sa voix est posée même sans poids
  t.c.getTechSignals = () => ({ raw: { stddev: { cv: 0.002 } } }); t.c.lmsrP = () => 0.7; t.c.window._consultDisciples = () => ({ mod: 1.1 });
  r = t.c._dcConsensus('BTC/USDT', voteOf, 0.5);
  assert.deepStrictEqual(J(t.S.pairStates['BTC/USDT']._dcVj.v), [['a1', 0.8], ['a2', -0.4], ['a3', 0.9], ['a4', 0.7], ['scalper_bot_v1', 1.1], ['composite', 0.5]]);
  assert.ok(Math.abs(r.C1 - 0.2) < 1e-12, 'sans bilan, le Scalper et le composite ne pèsent pas');
  // aux horizons : a3 jugée excellente (E = 1 partout), a1 nulle (E = 0) ; a2 pas jugée (ancien poids 1) ; a4 jugée mais poids 0 → écartée de la pesée aux horizons
  const flat = f => HZ.map(() => Array.from({ length: 6 }, (_, i) => f(i)).reduce((a, p) => a.concat(p), []));   // records à plat : v, D, v, D, …
  const good = flat(() => [500, 100]), zero = flat(i => [500, i % 2 ? 100 : -100]), bad = flat(() => [500, -100]);
  t.S.dcThreshold.vHz = { a3: good, a1: zero, a4: bad };
  r = t.c._dcConsensus('BTC/USDT', voteOf, 0.5);
  assert.ok(Math.abs(r.C1 - 0.2) < 1e-12, 'ancienne pesée inchangée');
  assert.ok(Math.abs(r.Ch - ((1 * 0.9) + (1 * -0.4)) / 2) < 1e-12, 'aux horizons : a3 (1) et a2 (ancien poids 1) ; a1 pèse 0 (jugée nulle) ; a4 pèse 0 : ' + r.Ch);
  assert.ok(Math.abs(r.C - r.Ch) < 1e-12 && r.mode === 'hz', 'décision vivante = horizons');
  assert.deepStrictEqual([t.S.pairStates['BTC/USDT']._dcVj.C1, t.S.pairStates['BTC/USDT']._dcVj.Ch].map(x => Math.round(x * 1000) / 1000), [0.2, 0.25]);
  t.S.dcThreshold.vModes = { 60: 'bougie' }; r = t.c._dcConsensus('BTC/USDT', voteOf, 0.5); assert.ok(Math.abs(r.C - r.Ch) < 1e-12 && r.mode === 'hz', 'retour à la bougie prouvé sur un AUTRE pas de temps (1 h) : rien pour EV 15 min');
  t.S.dcThreshold.vModes = { 15: 'bougie' }; r = t.c._dcConsensus('BTC/USDT', voteOf, 0.5); assert.ok(Math.abs(r.C - 0.2) < 1e-12 && r.mode === 'bougie', 'retour prouvé à la bougie (15 min) : la décision vivante suit');
  // top : les 3 plus forts apports de la pesée vivante
  assert.deepStrictEqual(J(r.top.map(x => x.id)), ['a1', 'a2']);
});

T('M5 · garde-fou appris, PAR PAS DE TEMPS : écart apparié (sens nouveau − sens ancien) × D par cycle, erreur type par créneau avec recouvrement (même calcul que le seuil), preuve Φ(−2)/25 dans un sens ou dans l\'autre ; bascule hz → bougie seulement si l\'ancienne est prouvée meilleure à un horizon et la nouvelle à aucun (et retour dans le cas inverse) ; journal ⚖️ à la bascule seulement ; fenêtre', () => {
  const t = mk({ now: 9000 * Q }); t.run('_thState()'); const T3 = t.S.dcThreshold;
  const blocks = (i, n, s, nb, b0) => { for (let b = 0; b < nb; b++) t.c._vjCmpAdd(T3, i, (b0 + b) * (HZ[i] + 1) * Q + 1, Q, 0); const M = T3.vCmp[i]; Object.keys(M).forEach((key, j) => { if (Number(key.split(':')[1]) >= b0) { M[key] = [Math.round(s * 10000), n]; } }); };
  // évaluation à la main : 24 créneaux, écart moyen −0,2 %/cycle, 3 cycles par créneau, sans variation → erreur type nulle → « pire » prouvé
  const now = 9000 * Q, b0 = Math.floor(now / (2 * Q)) - 30;
  blocks(0, 3, -0.6, 24, b0);
  let hz0 = t.run('_vjCmpEval(Object.keys(S.dcThreshold.vCmp[0]).map(k => ({ fm: 15, b: Number(k.split(":")[1]), s: S.dcThreshold.vCmp[0][k][0] / 10000, n: S.dcThreshold.vCmp[0][k][1] })))');
  assert.deepStrictEqual([hz0.n, hz0.blocks, R4(hz0.mean), hz0.se < 1e-6, hz0.better, hz0.worse], [72, 24, -0.2, true, false, true], JSON.stringify(hz0));
  // avec variation : moitié des créneaux à −0,6, moitié à +0,3 (3 cycles) → moyenne −0,05 ; à la main
  const M0 = T3.vCmp[0]; Object.keys(M0).forEach((key, j) => { M0[key] = [Math.round((j % 2 ? 0.3 : -0.6) * 10000), 3]; });
  hz0 = t.run('_vjCmpEval(Object.keys(S.dcThreshold.vCmp[0]).map(k => ({ fm: 15, b: Number(k.split(":")[1]), s: S.dcThreshold.vCmp[0][k][0] / 10000, n: S.dcThreshold.vCmp[0][k][1] })))');
  const ss = Object.keys(M0).sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1])).map(k => M0[k][0] / 10000), m = ss.reduce((a, x) => a + x, 0) / 72, r = ss.map(x => x - 3 * m);
  const v0 = r.reduce((a, x) => a + x * x, 0), c1 = r.slice(0, -1).reduce((a, x, i) => a + x * r[i + 1], 0), seRef = Math.sqrt(Math.max(v0, v0 + 2 * c1) / (72 * 72) * (24 / 23));
  assert.ok(Math.abs(hz0.mean - m) < 1e-12 && Math.abs(hz0.se - seRef) < 1e-12 && Math.abs(hz0.crit - t.c._thCrit(24)) < 1e-12, JSON.stringify(hz0));
  assert.strictEqual(hz0.worse, m + hz0.crit * hz0.se < 0); assert.strictEqual(hz0.better, false);
  // < 30 cycles ou < 20 créneaux : pas jugé
  assert.strictEqual(t.c._vjCmpEval(Array.from({ length: 19 }, (_, b) => ({ fm: 15, b, s: -0.6, n: 3 }))).worse, false);
  assert.strictEqual(t.c._vjCmpEval(Array.from({ length: 29 }, (_, b) => ({ fm: 15, b, s: -0.2, n: 1 }))).worse, false);
  // bascule : mode hz par défaut ; « pire » prouvé à 15 min, rien de « meilleur » ailleurs → retour à la bougie, journal ⚖️
  T3.vCmp = HZ.map(() => ({})); blocks(0, 3, -0.6, 24, b0); T3.vDirtyF = { 15: true }; T3.vRules = {};
  assert.strictEqual(t.c._vjMode(), 'hz'); let R = t.c._vjRefresh();
  assert.strictEqual(R.mode, 'bougie'); assert.strictEqual(t.c._vjMode(), 'bougie'); assert.strictEqual(T3.vDirtyF[15], false); assert.strictEqual(T3.vRules[15], R); assert.strictEqual(R.tfMs, Q);
  assert.strictEqual(t.c._vjMode(60), 'hz', 'par pas de temps : le 1 h (RE) n\'est pas touché'); assert.strictEqual(t.run('_vjRefresh(3600000)').hz[0].n, 0, 'le 1 h ne voit pas les créneaux du 15 min');
  assert.ok(/^⚖️$/.test(t.S.chainLog[0].icon) && /^Poids des voix · retour à la bougie — l'ancienne pesée a fait mieux : 15 min \(écart −0,200 %\/cycle ± 0,000, 72 cycles\)$/.test(t.S.chainLog[0].desc.replace(/-0,/g, '−0,')), t.S.chainLog[0].desc);
  const n1 = t.S.chainLog.length; t.c._vjRefresh(); assert.strictEqual(t.S.chainLog.length, n1, 'rien ne change : rien au journal'); assert.strictEqual(t.c._vjMode(), 'bougie');
  // « meilleur » prouvé à 1 h ET « pire » à 15 min : on reste (dans les deux sens)
  blocks(2, 3, 0.9, 24, Math.floor(now / (5 * Q)) - 30); t.c._vjRefresh(); assert.strictEqual(t.c._vjMode(), 'bougie', 'contradiction : on reste');
  T3.vModes[15] = 'hz'; t.c._vjRefresh(); assert.strictEqual(t.c._vjMode(), 'hz', 'contradiction : on reste aussi');
  // « meilleur » seul → (retour) aux horizons
  T3.vModes[15] = 'bougie'; T3.vCmp[0] = {}; t.c._vjRefresh(); assert.strictEqual(t.c._vjMode(), 'hz');
  assert.ok(/^Poids des voix · aux horizons — la pesée aux horizons a fait mieux : 1 h \(écart \+0,300 %\/cycle ± 0,000, 72 cycles\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  // bascule d'un AUTRE pas de temps (RE 1 h) : libellé au pas jugé, mode du 15 min intact
  { const H1 = 3600000, b1 = Math.floor(now / (2 * H1)) - 30; for (let b = 0; b < 24; b++) for (let j = 0; j < 3; j++) t.c._vjCmpAdd(T3, 0, (b1 + b) * 2 * H1 + 1, H1, -0.6); T3.vModes[15] = 'hz'; T3.vCmp[0] = Object.fromEntries(Object.entries(T3.vCmp[0]).filter(([k2]) => k2.startsWith('60:'))); const before = t.c._vjMode(15);
    const R1 = t.run('_vjRefresh(3600000)'); assert.strictEqual(R1.mode, 'bougie'); assert.strictEqual(t.c._vjMode(60), 'bougie'); assert.strictEqual(t.c._vjMode(15), before, 'le 15 min ne bouge pas');
    assert.ok(/^Poids des voix · retour à la bougie — l'ancienne pesée a fait mieux : 1 h \(écart −0,600 %\/cycle ± 0,000, 72 cycles\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc.replace(/-0,/g, '−0,')), t.S.chainLog[t.S.chainLog.length - 1].desc); T3.vModes[60] = 'hz'; T3.vCmp[0] = {}; }
  // fenêtre : les créneaux plus vieux que 30 créneaux du plus long horizon sortent
  const old = Math.floor((now - 1.5 * 20 * 17 * Q) / (2 * Q)) - 5; t.c._vjCmpAdd(T3, 0, old * 2 * Q, Q, 0.1); const kOld = '15:' + old; assert.ok(T3.vCmp[0][kOld]);
  t.c._vjRefresh(); assert.strictEqual(T3.vCmp[0][kOld], undefined, 'sorti de la fenêtre'); assert.ok(Object.keys(T3.vCmp[2]).length === 24, 'les récents restent');
  // recouvrement d'un créneau sur le suivant : des créneaux voisins SEMBLABLES (écarts +, +, −, −, …) gonflent l'erreur type (2 Σ r_b·r_b+1 > 0) ; alternés : jamais moins que sans recouvrement
  const evalOf = (pat) => t.c._vjCmpEval(Array.from({ length: 24 }, (_, b) => ({ fm: 15, b, s: 3 * pat(b), n: 3 })));
  const same = evalOf(b => (Math.floor(b / 4) % 2 ? 0.25 : -0.15) + 0.05), alt = evalOf(b => (b % 2 ? 0.25 : -0.15) + 0.05), far = t.c._vjCmpEval(Array.from({ length: 24 }, (_, b) => ({ fm: 15, b: 3 * b, s: 3 * ((b % 2 ? 0.25 : -0.15) + 0.05), n: 3 })));
  assert.ok(same.se > alt.se * 1.3, 'voisins semblables : erreur plus grande (' + same.se.toFixed(4) + ' vs ' + alt.se.toFixed(4) + ')'); assert.ok(Math.abs(alt.se - far.se) < 1e-12, 'voisins opposés : comme sans recouvrement');
  // niveau de preuve : plus de 2 erreurs types au-dessus de zéro ne suffit pas — il faut la valeur critique de Student au niveau Φ(−2)/25 (3,5 à 24 créneaux)
  const edge = t.c._vjCmpEval(Array.from({ length: 24 }, (_, b) => ({ fm: 15, b: 3 * b, s: 3 * (0.1 + (b % 2 ? 0.18 : -0.18)), n: 3 })));
  assert.ok(edge.mean - 2 * edge.se > 0 && edge.mean - edge.crit * edge.se < 0 && edge.better === false && Math.abs(edge.crit - t.c._thCrit(24)) < 1e-12, JSON.stringify(edge));
  // _vjJudge recalcule au plus toutes les 5 min après un nouvel écart
  const fake = () => ({ p: 'Z', k: 1, t: now, f: Q, v: [], dO: 1, dH: 1, a: [1, 1, 1, 1, 1], L: { p: 'Z', k: 1, t: now, px: 1, d: 1, f: Q, tf: '15m', cap: 2, x: [0, 0, 0, 0, 0], n: [1, 1, 1, 1, 1], s: 0, s0: 0, el: 1, eh: 1, hit: 0 }, S: { p: 'Z', k: 1, t: now, px: 1, d: -1, f: Q, tf: '15m', cap: 2, x: [0, 0, 0, 0, 0], n: [1, 1, 1, 1, 1], s: 0, s0: 0, el: 1, eh: 1, hit: 0 } });
  T3.vRules = { 15: { t: now, mode: 'hz', hz: [] } }; T3.vDirtyF = { 15: true }; t.S.dcThreshold.pendV = [fake()];
  t.c.__now = now + 299999; t.c._vjJudge(T3); assert.strictEqual(T3.vRules[15].t, now, 'moins de 5 min : pas de recalcul');
  t.c.__now = now + 300000; T3.pendV = [fake()]; t.c._vjJudge(T3); assert.strictEqual(T3.vRules[15].t, now + 300000);
  // un écart d'un autre pas de temps (1 h) marque SON attente, pas celle du 15 min
  T3.vDirtyF = {}; const f1 = fake(); f1.f = 3600000; f1.a = [0, 1, 1, 1, 1]; T3.pendV = [f1]; t.c._vjJudge(T3); assert.deepStrictEqual(J(T3.vDirtyF), { 60: true }); assert.strictEqual(T3.vRules[60], undefined, 'le mode courant est EV 15 min : le 1 h attend son tour (RE en arrière-plan)');
});

T('M6 · _vjReset (07 : le siège qui évolue repart de zéro) : son record est effacé et ses votes en attente retirés ; les autres voix intactes ; 07 l\'appelle à côté de « _judgments = [] »', () => {
  const t = mk({ now: 100 }); t.run('_thState()'); const T3 = t.S.dcThreshold;
  T3.vIds = ['a1', 'a2']; T3.vHz = { a1: [[500, 1], [], [], [], []], a2: [[500, 1], [], [], [], []] };
  T3.pendV = [{ p: 'X', k: 1, t: 1, f: Q, v: [[0, 500], [1, -300]], dO: 1, dH: 1, a: [0, 0, 0, 0, 0], L: { n: [null, null, null, null, null] }, S: { n: [null, null, null, null, null] } }];
  assert.strictEqual(t.c._vjReset('a1'), 2); assert.deepStrictEqual(J([T3.vHz, T3.pendV[0].v, T3.vIds]), [{ a2: [[500, 1], [], [], [], []] }, [[1, -300]], ['a1', 'a2']]);
  assert.strictEqual(t.c._vjReset('inconnu'), 0); assert.strictEqual(t.c._dcMeritHz('a1'), null, 'la décision reprend son ancien poids');
  const c07 = codeStrict(s07), i1 = c07.indexOf('weak._judgments = [];'), i2 = c07.indexOf("try { if (typeof _vjReset === 'function') _vjReset(weak.id); } catch(e) {}");
  assert.ok(i1 > 0 && i2 > i1 && i2 - i1 < 300, '07 : reset juste après la fenêtre de fitness'); assert.ok(s07.split('\n').slice(0, 6).some(l => l.startsWith('// [BILAN AUX HORIZONS · 27/09/2026] VERSION 20260927k')), 'en-tête BILAN AUX HORIZONS dans les 6 premières lignes de 07 (relivré depuis)');
});

T('S1 · 10f : _vjNote appelé juste après _thNote, à chaque cycle (décision nulle comprise, places prises comprises), perte max long / short dans le bon ordre selon le sens décidé ; _dcConsensus lu avant ; rien d\'autre ne lit le sens contraire ni les voix', () => {
  const core = codeStrict(between(s10f, 'function _resolvePairCycleCore(pair, ps) {', "if(typeof _resolvePairCycleCore==='function')", false));
  const iC = core.indexOf('_dcConsensus(pair, _voteOf, composite)'), iN = core.indexOf('_thNote(pair, finalSignalWithMem, Math.min(3, Math.max(1.5, 2 * _thSl)), Math.min(3, Math.max(1.5, 2 * _thSlC)));');
  const iV = core.indexOf("if (typeof _vjNote === 'function') _vjNote(pair, finalSignalWithMem > 0 ? _thCapD : _thCapC, finalSignalWithMem > 0 ? _thCapC : _thCapD);"), iR = core.indexOf("if (typeof window !== 'undefined' && window.__thNoteOnly) return;");
  assert.ok(iC > 0 && iN > iC && iV > iN && iR > iV, 'ordre : décision commune → note du sens décidé → note des voix → (places prises : retour)');
  assert.ok(core.includes('const _thCapD = Math.min(3, Math.max(1.5, 2 * _thSl)), _thCapC = Math.min(3, Math.max(1.5, 2 * _thSlC));'));
  assert.strictEqual((core.match(/_vjNote\(/g) || []).length, 1);
  assert.ok(!/rulesC|recC|pendC|vHz|vCmp|_dcMeritHz|_vjMode|\.C1\b|\.Ch\b/.test(core), '10f ne lit ni le sens contraire ni le bilan des voix : la décision vivante lui vient toute faite (_dcR.C)');
  assert.ok(s10f.startsWith('// [BILAN AUX HORIZONS · 27/09/2026] VERSION 20260927k'));
  // le sens décidé (seuil appris) n'est pas touché par les voix : _thRefresh / _thRule / _thLevel / _thPick ne lisent rien d'elles
  const lv = codeStrict(between(s03, 'function _thRefresh() {', 'function _thRefreshC(', false) + between(s03, 'function _thRule() {', 'function _vjNote(', false));
  assert.ok(!/pendV|vHz|vCmp|vIds|vModes|vRules|_dcMeritHz|_vjMode/.test(lv));
  // 09b : dcThreshold entier persiste (les listes des voix avec)
  const s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
  assert.ok(s9b1.includes('dcThreshold: S.dcThreshold || null,') && s9b2.includes("if (snap.dcThreshold && typeof snap.dcThreshold === 'object')"));
});

T('S2 · écran 🧠 Appris, panneau RÉEL (11b) : « Poids des voix » — pesée vivante, début de la mesure, écart apparié par horizon (prouvé / pas prouvé), poids bougie / horizons de chaque voix, nom des sièges ; avant toute note : une ligne', () => {
  const src = rd('js/11b-ecran-appris.js').replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const since = new Date(2026, 8, 27, 23, 40).getTime();
  const hz = HZ.map((h, i) => ({ h, n: 72, blocks: 24, mean: i === 0 ? -0.2 : i === 2 ? 0.05 : null, se: i === 0 ? 0.02 : i === 2 ? 0.1 : null, crit: i === 0 ? 3.4 : i === 2 ? 3.4 : null, better: false, worse: i === 0 }));
  const S = { tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {}, agents: [{ id: 'a1', name: 'Momentum Alpha', _judgments: Array.from({ length: 6 }, () => ({ s: 1, w: 1 })) }, { id: 'a2', name: 'Contrarian', _judgments: [] }],
    dcThreshold: { rec: [], pend: [], rules: {}, pendV: [{}, {}, {}], vSince: since, vModes: { 15: 'bougie', 60: 'hz' }, vRules: { 15: { t: 1, mode: 'bougie', hz, tfMs: Q }, 60: { t: 1, mode: 'hz', hz: [] } }, vHz: { a1: HZ.map(() => Array.from({ length: 14 }, (_, i) => i % 2 ? 100 : 500)), a2: [[500, 100], [], [], [], []], composite: HZ.map(() => Array.from({ length: 10 }, (_, i) => i % 2 ? (i % 4 === 1 ? 100 : -100) : 300)) } } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [], _thHzLab: (h) => ({ 1: '15 min', 2: '30 min', 4: '1 h', 8: '2 h', 16: '4 h' })[h], _thTfMs: () => Q, _thTf: () => '15m',
    _dcMerit: v => (v && v._judgments && v._judgments.length >= 5 ? 0.5 : 0), _dcMeritHz: id => ({ a1: 1, a2: null, composite: 0 })[id] };
  vm.createContext(c); vm.runInContext(src, c);
  let h = vm.runInContext('_learnedPanelHtml()', c);
  const seg = h.slice(h.indexOf('POIDS DES VOIX'));
  assert.ok(seg.includes('pesée à la bougie (retour prouvé)') && seg.includes('3 voix jugées · 3 cycles en cours') && seg.includes('mesuré depuis le 27/09 23:40'), seg.slice(0, 700));
  assert.ok(seg.includes('>↳ 15 min<') && seg.includes('-0.200 %/cycle (± 0.020)') && seg.includes('72 cycles · 24 créneaux · exigé 3.4 ET') && seg.includes('bougie prouvée meilleure') && seg.includes('>↳ 1 h<') && seg.includes('+0.050 %/cycle (± 0.100)') && seg.includes('>pas prouvé<') && seg.includes('pas encore d\'écart'));
  assert.ok(seg.includes('>Momentum Alpha<') && seg.includes('>Contrarian<') && seg.includes('>Analyse tech. + fond.<') && seg.includes('>pas encore<') && seg.includes('>7<') && seg.includes('>0<'));
  const iA1 = seg.indexOf('>Momentum Alpha<'), rowA1 = seg.slice(seg.lastIndexOf('<span', iA1), iA1 + 400).match(/<span[^>]*>([^<]*)<\/span>/g).map(x => x.replace(/<[^>]+>/g, ''));
  assert.deepStrictEqual(rowA1.slice(0, 4), ['Momentum Alpha', '0.50', '1.00', '7'], 'colonnes : voix, poids bougie, poids horizons, jugements (7 = 14 nombres à plat) : ' + rowA1.join(' | '));
  assert.ok(seg.indexOf('Momentum Alpha') < seg.indexOf('Analyse tech. + fond.') && seg.indexOf('Analyse tech. + fond.') < seg.indexOf('Contrarian'), 'triées par poids aux horizons');
  S.dcThreshold = { rec: [], pend: [], rules: {}, pendV: [{}] }; h = vm.runInContext('_learnedPanelHtml()', c); assert.ok(h.includes('pas encore de voix jugée aux horizons (1 cycles en cours)'));
  assert.ok(!/S\.\w+\s*=[^=]/.test(codeStrict(src).split('function _learnedPanelHtml')[1].split('\nfunction ')[0]), '11b : lecture seule');
});

console.log(`\n${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
