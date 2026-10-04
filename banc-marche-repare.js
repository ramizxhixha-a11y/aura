// banc-marche-repare.js — [MARCHÉ RÉPARÉ · 30/09/2026] VERSION 20260930a
// Rams (30/09 04:05, « Go ») sur ma proposition : réparer le marché tel qu'il a été conçu — 1. chaque agent mise sur chaque paire SON avis
// sur cette paire ; 2. un vrai prix LMSR, avec sa propre liquidité, séparée du capital ; 3. chaque manche se solde à l'horizon : les mises
// justes paient, les autres perdent, puis le marché repart de 50/50 ; 4. les T$ gagnés restent au siège : celui qui voit juste pèse plus sur
// le prix. Le prix du marché devient une voix de la décision commune, jugée comme les autres.
// Fonctions RÉELLES de 03 en vm (bloc de la décision commune → marché, avec la porte de la fitness), lmsrP RÉEL de 02, blocs RÉELS de 10f (poussée,
// décroissance), de 08 (ordres toutes les 6 s), de 09b2 (relecture des sièges), panneau RÉEL de 11b.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = x => JSON.parse(JSON.stringify(x));
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (msg || '') + ' : ' + a + ' ≠ ' + b);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'),
  s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s10f = rd('js/10f-resolveur-cycle.js'), s11 = rd('js/11b-ecran-appris.js'), html = rd('AURA8_v118.html');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false) + '\nwindow._fitJudge = _fitJudge;\n';
const DC = between(s03, 'const _DC_BOTS = [', 'window._botPredict = _botPredict;', false);
const APV = between(s03, 'function _agentPairVote(a, pair, fallback) {', '\n}\n', true);
const LMSRP = s02.split('\n').filter(l => l.startsWith('function lmsrP(ps){'));
assert.strictEqual(LMSRP.length, 1, 'lmsrP unique dans 02');
const MKT = between(s03, 'var MKT_B = 100, MKT_Q0 = 100, MKT_STAKE = 0.08;', 'window._mktOn = _mktOn;', false);
const F = 900000, T0 = Math.floor(1790000000000 / F) * F, PAIR = 'SOL/USDT';
const LCG = seed => { let x = seed >>> 0; return () => { x = (Math.imul(1664525, x) + 1013904223) >>> 0; return x / 4294967296; }; };
// Série de bougies 15 min closes jusqu'à T0 − F, bougie EN COURS à T0 (prix 100)
const series = (n, px) => Array.from({ length: n }, (_, i) => { const ts = T0 - (n - 1 - i) * F, c = px || 100; return { ts, o: c, h: c * 1.001, l: c * 0.999, c }; });
function mk(o) {
  o = o || {};
  const clock = { t: o.t || (T0 + 60000) };
  class FakeDate extends Date { static now() { return clock.t; } }
  const M = Object.create(Math); M.random = LCG(o.seed || 7);
  const S = Object.assign({ tradingMode: 'paperReal', _realJudgments: 0, agents: [], pairStates: {}, realCandles: {}, realPairCycle: {}, paperRealActivePairs: {}, realActivePairs: {}, paperRealTimeframe: '15m', realTimeframe: '15m' }, o.S || {});
  const px = Object.assign({}, o.px || {}), age = Object.assign({}, o.age || {});
  const c = { S, Math: M, Date: FakeDate, Number, Object, Array, JSON, isFinite, String, console, window: { _decErr: e => { throw e; } }, PAIRS: o.PAIRS || {},
    getTechSignals: o.tech || (() => null), _getPairReturns: () => null, _getPairCorrelation: () => null, learnFromOutcome: o.lfo || (() => {}),
    _rcLastPrice: p => (p in px ? px[p] : 0), _rcPriceAge: p => (p in age ? age[p] : 1000) };
  c.window._consultDisciples = () => ({ mod: 1 });
  vm.createContext(c); vm.runInContext(JUDGE + '\n' + APV + '\n' + DC + '\nfunction AP() { return S.pairStates[S.activePair]; }\n' + LMSRP[0] + '\n', c);
  return { c, S, clock, px, age, run: code => vm.runInContext(code, c) };
}
const agent = (id, fitness, o) => Object.assign({ id, name: id, fitness, _judgments: [] }, o || {});
// Paire EV prête : 4 paires actives, bougie close = T0 − F, bougie en cours = T0, dernier prix 100
function ready(o) {
  o = o || {};
  const t = mk(Object.assign({ px: { [PAIR]: 100 }, age: { [PAIR]: 1000 } }, o));
  t.S.paperRealActivePairs = { [PAIR]: true, 'BTC/USDT': true, 'ETH/USDT': true, 'XRP/USDT': true, 'DOGE/USDT': false };
  t.S.realActivePairs = { [PAIR]: true, 'BTC/USDT': true };
  t.S.realCandles[PAIR] = { '15m': series(40) };
  t.S.realPairCycle[PAIR] = T0 - F;
  t.S.agents = o.agents || [agent('A', 1000), agent('B', 500), agent('C', 800), agent('E', 300, { mktWallet: 2000 }), agent('bot', 900, { isBot: true }), agent('meta', 900, { isMeta: true }), agent('D', 700), agent('Z', 600, { mktWallet: 1e-5 })];
  t.S.pairStates[PAIR] = Object.assign({ price: 100, qYes: 2751, qNo: 50, roster: { votes: o.votes || { A: 0.4, B: -0.2, C: 0.02, E: 0.1, bot: 0.5, meta: 0.3, Z: 0.5 } } }, o.ps || {});
  return t;
}
const C0 = t => t.run('_mktCost(100, 100)');
console.log('▶ banc-marche-repare');

T('M1 · LMSR (réel) : prix 1 / (1 + e^((qNo − qYes) / 100)), coût b·ln(e^(qYes/b) + e^(qNo/b)) ; une mise amène le prix à la croyance 0,5 + vote / 2 (OUI sous la croyance, NON au-dessus) sans dépasser son budget ; vote nul ou budget nul : rien', () => {
  const t = mk();
  near(t.run('_mktPrice(100, 100)'), 0.5); near(t.run('_mktPrice(140, 100)'), 1 / (1 + Math.exp(-0.4)), 1e-12, 'prix LMSR');
  near(t.run('_mktCost(140, 100) - _mktCost(100, 100)'), 100 * Math.log((Math.exp(1.4) + Math.exp(1)) / (2 * Math.exp(1))), 1e-9, 'coût');
  near(t.run('_mktCost(20000, 100)'), 20000 + 100 * Math.log(1 + Math.exp(-199)), 1e-6, 'coût stable (pas d\'exponentielle qui déborde)');
  let r = t.run('var __p = { qYes: 100, qNo: 100 }; _mktBet(__p, 0.2, 1000)');
  near(t.run('_mktPrice(__p.qYes, __p.qNo)'), 0.6, 1e-12, 'croyance 0,6 atteinte'); near(r.yes, 100 * Math.log(1.5), 1e-9); near(r.cost, 100 * Math.log(1.25), 1e-9); assert.strictEqual(r.no, 0);
  r = t.run('var __p = { qYes: 100, qNo: 100 }; _mktBet(__p, 1, 5)');
  near(r.cost, 5, 1e-9, 'budget atteint avant la croyance : le coût = le budget'); assert.ok(t.run('_mktPrice(__p.qYes, __p.qNo)') < 0.53 && r.no === 0);
  r = t.run('var __p = { qYes: 100, qNo: 100 }; _mktBet(__p, -0.5, 1000)');
  near(t.run('_mktPrice(__p.qYes, __p.qNo)'), 0.25, 1e-12, 'baisse : parts NON'); assert.strictEqual(r.yes, 0); near(r.no, 100 * Math.log(3), 1e-9);
  r = t.run('var __p = { qYes: 150, qNo: 100 }; _mktBet(__p, 0.1, 1000)');
  near(t.run('_mktPrice(__p.qYes, __p.qNo)'), 0.55, 1e-12, 'prix au-dessus de sa croyance (haussière) : il achète du NON'); assert.strictEqual(r.yes, 0); assert.ok(r.no > 0);
  near(r.cost, t.run('_mktCost(150, 100 + ' + r.no + ') - _mktCost(150, 100)'), 1e-9, 'coût réel LMSR');
  r = t.run('var __p = { qYes: 150, qNo: 100 }; _mktBet(__p, -0.5, 5)'); near(r.cost, 5, 1e-9, 'NON, budget atteint, marché déjà penché : coût = budget'); assert.ok(r.yes === 0 && r.no > 0);
  r = t.run('var __p = { qYes: 100, qNo: 150 }; _mktBet(__p, 0.5, 5)'); near(r.cost, 5, 1e-9, 'OUI, budget atteint, marché déjà penché : coût = budget'); assert.ok(r.no === 0 && r.yes > 0);
  assert.strictEqual(t.run('var __p = { qYes: 100, qNo: 100 }; _mktBet(__p, 0, 50)'), null); assert.strictEqual(t.run('_mktBet(__p, 0.3, 0)'), null);
  assert.deepStrictEqual(J(t.run('__p')), { qYes: 100, qNo: 100 }, 'rien acheté');
  r = t.run('var __p = { qYes: 100, qNo: 100 }; _mktBet(__p, 1, 3)'); assert.ok(isFinite(r.yes) && r.yes > 0 && isFinite(t.run('__p.qYes')), 'vote ±1 : la croyance 100 % reste finie (le budget arrête)');
  const pr = b => t.run('var __q = { qYes: 100, qNo: 100 }; _mktBet(__q, 0.4, ' + b + '); _mktPrice(__q.qYes, __q.qNo)');
  assert.ok(pr(1) < pr(5) && pr(5) < pr(20) && pr(20) < pr(1e6) && Math.abs(pr(1e6) - 0.7) < 1e-9, 'plus de T$ → prix plus près de sa croyance, jamais au-delà');
});

T('M2 · ouverture (_mktCycle réel, EV) : 50/50 d\'abord (l\'ancien marché saturé ne fuit pas), puis chaque agent qui vote sur LA paire (|vote| ≥ 0,03, ni bot ni méta) mise son vote avec au plus 8 % de ses T$ / paires actives du mode ; T$ = fitness au premier pari ; une manche à la fois ; prix figé, bougie bouche-trou, AA : pas de manche', () => {
  const t = ready();
  assert.strictEqual(t.run("_mktCycle('" + PAIR + "', S.pairStates['" + PAIR + "'])"), 3, 'A, B, E misent ; C (0,02), D (pas de vote), bot, méta : non ; Z (T$ presque épuisés) : mise arrondie à 0, rien acheté');
  const ps = t.S.pairStates[PAIR], R = ps.mkt;
  assert.ok(R.open && R.t === T0 + 60000 && R.p0 === 100 && R.x === T0 && R.tf === '15m' && R.f === F && R.m === 'E' && R.prev === null);
  assert.deepStrictEqual(Object.keys(R.pos).sort(), ['A', 'B', 'E']);
  const nP = 4, w0 = { A: 1000, B: 500, E: 2000 };
  let sum = 0; Object.keys(R.pos).forEach(id => { const q = R.pos[id], a = t.S.agents.find(x => x.id === id); assert.ok(q[2] > 0 && q[2] <= w0[id] * 0.08 / nP + 1e-4, id + ' : mise ≤ 8 % de ses T$ / 4 paires'); near(a.mktWallet, w0[id] - q[2], 1e-9, id + ' : T$ débités du coût'); sum += q[2]; });
  assert.ok(Object.keys(R.pos).every(id => R.pos[id].length === 4 && R.pos[id][3] === 0), 'position : parts OUI, parts NON, mise, génération du siège (0)');
  assert.strictEqual(t.S.agents.find(a => a.id === 'Z').mktWallet, 1e-5, 'Z : rien pris');
  near(R.vol, sum, 1e-6, 'volume'); assert.ok(R.pos.A[0] > 0 && R.pos.A[1] === 0 && R.pos.B[1] > 0 && R.pos.B[0] === 0, 'A (+0,4) achète du OUI, B (−0,2) du NON');
  near(t.run('_mktCost(S.pairStates["' + PAIR + '"].qYes, S.pairStates["' + PAIR + '"].qNo)') - C0(t), sum, 1e-3, 'Σ coûts = C(q) − C(100, 100) : la manche est partie de 50/50 (q saturé 2751 / 50 effacé), et la mise de Z n\'a laissé aucune part');
  assert.ok(!('mktWallet' in t.S.agents.find(a => a.id === 'C')) && !('mktWallet' in t.S.agents.find(a => a.id === 'D')) && !('mktWallet' in t.S.agents.find(a => a.id === 'bot')), 'ceux qui ne misent pas : rien ne leur est pris');
  const z = ready({ votes: { Z: 0.5, C: 0.01 } }); assert.strictEqual(z.run("_mktCycle('" + PAIR + "', S.pairStates['" + PAIR + "'])"), 0);
  assert.deepStrictEqual([z.S.pairStates[PAIR].qYes, z.S.pairStates[PAIR].qNo, z.S.pairStates[PAIR].mkt.n, Object.keys(z.S.pairStates[PAIR].mkt.pos).length], [100, 100, 0, 0], 'seul Z mise (arrondie à 0) : q exactement 100 / 100, rien d\'enregistré');
  // une manche à la fois
  const snap = J(ps); assert.strictEqual(t.run("_mktCycle('" + PAIR + "', S.pairStates['" + PAIR + "'])"), 0); assert.deepStrictEqual(J(ps), snap, 'manche ouverte : ni nouvelle manche ni nouvelle mise');
  // prix figé, bouche-trou, AA
  const guard = (fn, msg) => { const u = ready(); fn(u); assert.strictEqual(u.run("_mktCycle('" + PAIR + "', S.pairStates['" + PAIR + "'])"), 0, msg); assert.ok(!u.S.pairStates[PAIR].mkt && u.S.pairStates[PAIR].qYes === 2751, msg + ' : rien touché'); };
  guard(u => { u.age[PAIR] = 120001; }, 'prix réel de plus de 2 min');
  guard(u => { u.px[PAIR] = 0; }, 'pas de prix réel');
  guard(u => { u.S.realCandles[PAIR]['15m'][38]._gap = true; }, 'bougie close bouche-trou');
  guard(u => { u.S.realCandles[PAIR]['15m'][39]._gap = true; }, 'bougie en cours bouche-trou');
  guard(u => { u.S.realPairCycle[PAIR] = T0 - 3 * F + 7; }, 'bougie close inconnue');
  guard(u => { u.S.tradingMode = 'sim'; }, 'AA : l\'ancien marché, pas de manche');
  // RE : ses paires actives, sa marque
  const r = ready(); r.S.tradingMode = 'real'; r.run("_mktCycle('" + PAIR + "', S.pairStates['" + PAIR + "'])");
  const Rr = r.S.pairStates[PAIR].mkt; assert.strictEqual(Rr.m, 'R'); assert.ok(Rr.pos.A[2] <= 1000 * 0.08 / 2 + 1e-4 && Rr.pos.A[2] > 1000 * 0.08 / 4, 'RE : 2 paires actives → budget 4 %');
});

T('M3 · résolution (réelle) : bougie de sortie close — hausse : chaque part OUI paie 1 T$, baisse : chaque part NON ; nulle (bouche-trou, jamais reçue, clôture égale) : mises rendues ; gain et manches du siège, compteurs, journal ; le marché repart de 50/50 et la manche suivante s\'ouvre ; mise d\'un génome retiré : ni payée ni rendue', () => {
  const settle = (close, o) => {
    o = o || {};
    const t = ready(o); t.run("_mktCycle('" + PAIR + "', S.pairStates['" + PAIR + "'])");
    const ps = t.S.pairStates[PAIR], R = J(ps.mkt), P = t.run('_mktPrice(S.pairStates["' + PAIR + '"].qYes, S.pairStates["' + PAIR + '"].qNo)');
    const before = {}; t.S.agents.forEach(a => { before[a.id] = { w: a.mktWallet, g: a.mktGain, n: a.mktN }; });
    if (o.born) t.S.agents.find(a => a.id === o.born).mktGen = 1;   // 07 : naissance après la mise (génération suivante)
    // pas encore close : la manche attend
    t.clock.t = T0 + 600000;
    assert.strictEqual(t.run("_mktSettle('" + PAIR + "', S.pairStates['" + PAIR + "'], Date.now())"), null, 'bougie de sortie en cours : on attend');
    const arr = t.S.realCandles[PAIR]['15m'];
    if (close !== undefined) {
      arr[39].c = close; if (o.gap) arr[39]._gap = true;
      if (o.filler) { arr.push({ ts: T0 + F, o: close, h: close, l: close, c: close, _gap: true }); arr.push({ ts: T0 + 2 * F, o: 100, h: 100, l: 100, c: 100 }); t.S.realPairCycle[PAIR] = T0 + F; }   // coupure : bouche-trou après x
      else if (o.hole) { arr.push({ ts: T0 + 2 * F, o: 100, h: 100, l: 100, c: 100 }); t.S.realPairCycle[PAIR] = T0; }   // bougie x + f jamais reçue
      else { arr.push({ ts: T0 + F, o: 100, h: 100, l: 100, c: 100 }); t.S.realPairCycle[PAIR] = T0; }
    }
    t.clock.t = o.late ? T0 + 5 * F + 1 : (o.filler || o.hole) ? T0 + 2 * F + 30000 : T0 + F + 30000;
    if (o.missing) t.S.agents = t.S.agents.filter(a => a.id !== o.missing);
    if (o.late) { arr.splice(39, 1); }
    t.px[PAIR] = 100.5;
    t.run("_mktCycle('" + PAIR + "', S.pairStates['" + PAIR + "'])");
    return { t, R, P, before, ps };
  };
  // hausse
  let x = settle(101);
  assert.ok(x.ps.mkt.open && x.ps.mkt.t === T0 + F + 30000 && x.ps.mkt.p0 === 100.5 && x.ps.mkt.x === T0 + F, 'la manche suivante s\'ouvre au même cycle');
  assert.deepStrictEqual(J(x.ps.mkt.prev), { P: Math.round(x.P * 1000) / 1000, out: 1, n: 3 });
  let paid = 0;
  ['A', 'B', 'E'].forEach(id => { const q = x.R.pos[id], a = x.t.S.agents.find(z => z.id === id), second = (x.ps.mkt.pos[id] || [0, 0, 0])[2];
    near(a.mktWallet + second, x.before[id].w + q[0], 1e-9, id + ' : payé de ses parts OUI (1 T$ chacune)'); near(a.mktGain, q[0] - q[2], 1e-9, id + ' : gain = paiement − mise'); assert.strictEqual(a.mktN, 1); paid += q[0]; });
  const st = x.t.S.mktStats.E; assert.ok(st && x.t.S.mktStats.since > 0);
  assert.deepStrictEqual([st.n, st.v, st.b, st.up, st.d, st.ok], [1, 0, 1, 1, 1, x.P > 0.5 ? 1 : 0]); near(st.br, Math.pow(x.P - 1, 2), 1e-12, 'Brier'); near(st.vol, x.R.vol, 1e-9); near(st.paid, paid, 1e-9);
  assert.deepStrictEqual(J(x.t.S.mktLog), [[Math.round((T0 + 60000) / 1000), 'E', PAIR, Math.round(x.P * 1000), 1, 3, x.R.vol, (F - 60000) / 1000, 0]], 'journal : …, horizon 14 min, pas suivie');   // [HORLOGE PAR MODE · 01/10/2026] 9e champ : manche suivie (0)
  near(x.t.run('_mktCost(S.pairStates["' + PAIR + '"].qYes, S.pairStates["' + PAIR + '"].qNo)') - C0(x.t), x.ps.mkt.vol, 1e-3, 'nouvelle manche repartie de 50/50');
  // baisse
  x = settle(99.5);
  ['A', 'B', 'E'].forEach(id => { const q = x.R.pos[id], a = x.t.S.agents.find(z => z.id === id), second = (x.ps.mkt.pos[id] || [0, 0, 0])[2]; near(a.mktWallet + second, x.before[id].w + q[1], 1e-9, id + ' : payé de ses parts NON'); near(a.mktGain, q[1] - q[2], 1e-9); });
  assert.strictEqual(x.t.S.mktStats.E.up, 0); assert.strictEqual(x.t.S.mktLog[0][4], -1);
  // nulles : bouche-trou, clôture égale, bougie jamais reçue (4 bougies de retard)
  [[101, { gap: true }, 'bouche-trou'], [101, { filler: true }, 'bougie de sortie suivie d\'un bouche-trou (sa clôture = dernier prix avant la coupure)'], [101, { hole: true }, 'bougie suivante jamais reçue (trou)'],
   [100, {}, 'clôture égale au prix d\'ouverture'], [undefined, { late: true }, 'bougie de sortie jamais reçue']].forEach(([cl, o, msg]) => {
    const y = settle(cl, o);
    ['A', 'B', 'E'].forEach(id => { const a = y.t.S.agents.find(z => z.id === id), second = (y.ps.mkt.pos && y.ps.mkt.pos[id] || [0, 0, 0])[2]; near(a.mktWallet + second, y.before[id].w + y.R.pos[id][2], 1e-9, msg + ' : ' + id + ' remboursé'); assert.ok(!a.mktGain && !a.mktN, msg + ' : ni gain ni manche comptée'); });
    assert.deepStrictEqual([y.t.S.mktStats.E.n, y.t.S.mktStats.E.v], [0, 1], msg); assert.strictEqual(y.t.S.mktLog[0][4], 0, msg);
  });
  // génome retiré depuis la mise (07 : génération suivante, même à la même milliseconde) : ni payé ni remboursé ; les autres, si
  x = settle(101, { born: 'A' });
  const a = x.t.S.agents.find(z => z.id === 'A'), second = (x.ps.mkt.pos.A || [0, 0, 0])[2];
  near(a.mktWallet + second, x.before.A.w, 1e-9, 'A (nouveau-né) : la mise de l\'ancien génome ne lui revient pas'); assert.ok(!a.mktN);
  near(x.t.S.agents.find(z => z.id === 'B').mktGain, -x.R.pos.B[2], 1e-9, 'B perd sa mise');
  // un siège déjà reclassé deux fois (génération 2) : sa mise porte sa génération et lui est payée
  x = settle(101, { agents: [agent('A', 1000, { mktGen: 2 }), agent('B', 500), agent('E', 300, { mktWallet: 2000 })] });
  assert.strictEqual(x.R.pos.A[3], 2); near(x.t.S.agents.find(z => z.id === 'A').mktGain, x.R.pos.A[0] - x.R.pos.A[2], 1e-9, 'génération 2 → 2 : payé'); assert.strictEqual(x.t.S.agents.find(z => z.id === 'A').mktN, 1);
  // un siège disparu entre la mise et la résolution : ignoré, les autres payés
  x = settle(101, { missing: 'B' });
  near(x.t.S.agents.find(z => z.id === 'A').mktGain, x.R.pos.A[0] - x.R.pos.A[2], 1e-9); assert.ok(!x.t.S.agents.some(z => z.id === 'B') && x.t.S.mktStats.E.n === 1);
});

T('M4 · lmsrP (02 réel) : EV / RE → prix LMSR de la manche ouverte, 50 % sans manche (même avec l\'ancien q saturé) ; AA → l\'ancien rapport ; le Bot Scalper (_botView réel) lit ce prix', () => {
  const t = ready({ tech: () => ({ raw: { stddev: { cv: 0.002 } } }) }), ps = t.S.pairStates[PAIR];
  near(t.run('lmsrP(S.pairStates["' + PAIR + '"])'), 0.5, 0, 'EV sans manche : 50 % (q saturé 2751 / 50 ignoré)');
  ps.mkt = { open: true, n: 2 }; ps.qYes = 100 + 100 * Math.log(1.5); ps.qNo = 100;
  near(t.run('lmsrP(S.pairStates["' + PAIR + '"])'), 0.6, 1e-12, 'EV : vrai prix LMSR (le rapport donnerait ' + (ps.qYes / (ps.qYes + ps.qNo)).toFixed(3) + ')');
  assert.strictEqual(t.run('_botView("scalper_bot_v1", "' + PAIR + '")'), null, 'scalper : 60 % < 62 % → silence');
  ps.qYes = 100 + 100 * Math.log(0.65 / 0.35);
  assert.deepStrictEqual(J(t.run('_botView("scalper_bot_v1", "' + PAIR + '")')), { dir: 1 }, 'scalper : marché à 65 % → achat');
  t.S.tradingMode = 'real'; near(t.run('lmsrP(S.pairStates["' + PAIR + '"])'), 0.65, 1e-12, 'RE : pareil');
  ps.mkt.open = false; near(t.run('lmsrP(S.pairStates["' + PAIR + '"])'), 0.5, 0, 'manche soldée : 50 %');
  t.S.tradingMode = 'sim'; ps.qYes = 150; ps.qNo = 100; near(t.run('lmsrP(S.pairStates["' + PAIR + '"])'), 0.6, 1e-12, 'AA : qYes / (qYes + qNo), inchangé');
  t.S.activePair = PAIR; near(t.run('lmsrP()'), 0.6, 1e-12, 'AA sans argument : la paire active');
  // 02 : les ordres LMSR d'AA (lmsrBuyYes / lmsrBuyNo, S.b) — texte inchangé depuis 20260928d
  const buy = between(s02, 'function lmsrBuyYes(ps, delta) {', '// old genCandles stub', false);
  assert.ok(buy.includes('const b=S.b, ey=Math.exp(ps.qYes/b)') && buy.includes('ps.qYes+=delta; return cost;') && buy.includes('ps.qNo+=delta; return cost;'));
});

T('M5 · décision commune (réelle) : le prix de la manche est une voix (« marche », (P − 0,5) × 2) pesée par son bilan, photographiée avec les votes (mk), jugée comme le composite à la bougie suivante (3 EV / 5 RE, décroissance 0,7) — pas en AA, pas sans mise, pas sous 0,05', () => {
  const t = ready(), ps = t.S.pairStates[PAIR];
  const setP = (P, n) => { ps.mkt = { open: true, n: n === undefined ? 3 : n }; ps.qYes = 100 + 100 * Math.log(P / (1 - P)); ps.qNo = 100; };
  const voice = (s, n) => { t.S.dcVoices = { marche: { id: 'marche', fitness: 350, _judgments: Array.from({ length: n || 10 }, () => ({ s, w: 1, k: 0 })) } }; };
  t.S.agents = [agent('A', 1000, { _judgments: Array.from({ length: 10 }, () => ({ s: 1, w: 1, k: 0 })) })];
  const vote = { A: -0.4 }, run = () => J(t.run('_dcConsensus("' + PAIR + '", a => (' + JSON.stringify(vote) + ')[a.id] || 0, null)'));
  setP(0.6); let r = run();
  assert.deepStrictEqual(J(ps._dcVj.v).map(e => e[0]), ['A', 'marche']); near(ps._dcVj.v[0][1], -0.4, 1e-12); near(ps._dcVj.v[1][1], 0.2, 1e-12, 'vote du marché = (0,6 − 0,5) × 2');
  // aux horizons : la photo des votes part avec les trades long / short de la paire (_vjNote réel) — la voix du marché y est notée comme les autres
  assert.strictEqual(t.run('_vjNote("' + PAIR + '", 2, 2)'), true, '_vjNote : cycle noté');
  const TT = t.S.dcThreshold, iM = TT.vIds.indexOf('marche'), qv = TT.pendV[TT.pendV.length - 1];
  assert.ok(iM >= 0 && qv.p === PAIR && qv.v.some(e => e[0] === iM && e[1] === 200), 'voix « marche » notée aux horizons (vote × 1000 = 200)');
  near(r.C, -0.4, 1e-12, 'voix sans bilan : poids 0, la décision ne bouge pas');
  voice(1); r = run(); near(r.C, (1 * -0.4 + 1 * 0.2) / 2, 1e-12, 'voix au bilan parfait (poids 1) : Σ poids × vote / Σ poids');
  assert.ok(r.top.some(x => x.id === 'marche'));
  voice(-1); r = run(); near(r.C, -0.4, 1e-12, 'bilan négatif → poids 0 (comme toute voix)');
  voice(1); setP(0.6, 0); r = run(); near(r.C, -0.4 / 2, 1e-12, 'manche sans mise : vote 0 (son poids dilue, comme une abstention)'); assert.deepStrictEqual(J(ps._dcVj.v), [['A', -0.4]]);
  setP(0.51); r = run(); assert.deepStrictEqual(J(ps._dcVj.v), [['A', -0.4]], '|vote| 0,02 < 0,03 : pas de vote');
  setP(0.6); t.S.tradingMode = 'sim'; r = run(); assert.deepStrictEqual(J(ps._dcVj.v), [['A', -0.4]], 'AA : pas de voix du marché'); near(r.C, -0.4, 1e-12, 'AA : rien ne change');
  // photo des votes : mk en EV / RE seulement
  t.S.tradingMode = 'paperReal'; t.run('_dcSnapVotes("' + PAIR + '", S.pairStates["' + PAIR + '"], 0.3)'); near(ps._voteSnap.mk, 0.2, 1e-12); assert.strictEqual(ps._voteSnap.comp, 0.3);
  t.S.tradingMode = 'sim'; t.run('_dcSnapVotes("' + PAIR + '", S.pairStates["' + PAIR + '"], 0.3)'); assert.ok(!('mk' in ps._voteSnap), 'AA : pas de mk');
  // jugement à la bougie suivante
  let kk = T0;   // [HORLOGE PAR MODE · 01/10/2026] la photo porte sa bougie, jugée à la bougie suivante (sans elle, en EV / RE : pas jugée)
  const judge = (mode, mk, mv) => { kk += F; t.S.realPairCycle[PAIR] = kk + F; t.S.tradingMode = mode; t.S.dcVoices = {}; ps._voteSnap = { px: 100, t: 0, votes: {}, comp: null, mk: mk, k: kk, tf: '15m' }; ps.price = 100 * (1 + mv / 100); t.run('_dcForwardJudge("' + PAIR + '", S.pairStates["' + PAIR + '"])'); return J((t.S.dcVoices.marche && t.S.dcVoices.marche._judgments) || []); };
  let js = judge('paperReal', 0.2, 1); assert.strictEqual(js.length, 1); assert.strictEqual(js[0].s, 1); near(js[0].w, 0.2 * 1 * 3 * 0.7, 1e-9, 'poids = |vote| × |mouvement| × 3 (EV) × 0,7');
  js = judge('paperReal', 0.2, -1); assert.strictEqual(js[0].s, -1, 'mauvais sens');
  js = judge('real', -0.3, -2); assert.strictEqual(js[0].s, 1); near(js[0].w, 0.3 * 2 * 5 * 0.7, 1e-9, 'RE : × 5');
  assert.strictEqual(judge('paperReal', 0.05, 1).length, 0, '|vote| ≤ 0,05 : pas jugé (comme le composite)');
  assert.strictEqual(judge('sim', 0.3, 1).length, 0, 'AA : pas jugé');
  assert.strictEqual(judge('paperReal', undefined, 1).length, 0, 'photo d\'avant (sans mk) : rien');
});

T('M6 · 10f / 08 : la manche se joue juste après le roster frais de la paire et avant la photo des votes ; plus rien d\'autre n\'écrit le marché en EV / RE (poussée de la décision, décroissance, remise à 50/50 d\'une fermeture, ordres de 08, injection du rendu) — AA inchangé (blocs réels)', () => {
  const core = codeStrict(between(s10f, 'function _resolvePairCycleCore(pair, ps) {', "if(typeof _resolvePairCycleCore==='function')", false));
  const iR = core.indexOf('runRosterAnalysis(pair);'), iM = core.indexOf("if (typeof _mktCycle === 'function') _mktCycle(pair, ps);"), iS = core.indexOf('_dcSnapVotes(pair, ps, composite);'), iC = core.indexOf('_dcConsensus(pair, _voteOf, composite)');
  assert.ok(iR > 0 && iM > iR && iS > iM && iC > iS, 'roster → manche → photo → décision');
  const code10 = codeStrict(s10f);
  assert.strictEqual((code10.match(/_mktCycle\(/g) || []).length, 1);
  const writers = code10.split('\n').filter(l => /ps\.q(Yes|No)\s*=(?!=)/.test(l));
  assert.strictEqual(writers.length, 8, 'poussée (3 lignes), remise à la fermeture du cycle, 3 décroissances, sortie bot (8 lignes) : ' + writers.length);
  writers.forEach(l => assert.ok(/!_mktQ|_mktOn\(\)/.test(l), 'écriture du marché non gardée : ' + l.trim().slice(0, 100)));
  assert.strictEqual((code10.match(/const _mktQ = \(typeof _mktOn === 'function'\) && _mktOn\(\);/g) || []).length, 1);
  // bloc réel de la poussée : EV → rien ; AA → comme avant
  const push = between(s10f, '  const targetProb = 0.5 + finalSignalWithMem * 0.40;', '  const adxVal    = raw?.adx?.adx || 20;', false);
  const runPush = on => { const c = { ps: { qYes: 100, qNo: 100 }, finalSignalWithMem: 0.8, effectiveConviction: 0.8, Math, lmsrP: ps => ps.qYes / (ps.qYes + ps.qNo), _mktOn: () => on }; vm.createContext(c); vm.runInContext(push, c); return J(c.ps); };
  assert.deepStrictEqual(runPush(true), { qYes: 100, qNo: 100 }, 'EV / RE : la décision ne pousse plus le marché');
  assert.ok(runPush(false).qYes > 100, 'AA : poussée comme avant');
  const dec = s10f.split('\n').filter(l => l.includes('if (!_mktQ) { ps.qYes = Math.max(20, 100 + (ps.qYes - 100) * 0.95);'));
  assert.strictEqual(dec.length, 3, '3 décroissances gardées');
  // 08 : ordres toutes les 6 s (bloc réel, même ancre que banc-marche-lmsr)
  const BLOCK = between(s08, "  if(tick % 6 === 0) {\n    const pairList  = Object.keys(PAIRS);", "  _phEnd('votes LMSR');", false);
  const LMSR = between(s02, 'function lmsrBuyYes(ps, delta) {', '// old genCandles stub', false), WALLET = between(s08, 'function _lmsrWallet(a) {', 'window._lmsrWallet = _lmsrWallet;', false);
  const runOrders = on => { const S = { b: 100, agents: [{ id: 'a', fitness: 1000, score: 0.6 }, { id: 'b', fitness: 1000, score: -0.6 }], pairStates: { 'A/USDT': { qYes: 100, qNo: 100 } } };
    const c = { S, PAIRS: { 'A/USDT': {} }, tick: 6, window: {}, Number, Object, isFinite, Math, _mktOn: () => on }; vm.createContext(c); vm.runInContext(LMSR + '\n' + WALLET + '\n' + BLOCK, c); return J(S); };
  const e = runOrders(true); assert.deepStrictEqual(e.pairStates, { 'A/USDT': { qYes: 100, qNo: 100 } }, 'EV / RE : aucun ordre'); assert.ok(!('lmsrWallet' in e.agents[0]));
  const a = runOrders(false); assert.ok(a.pairStates['A/USDT'].qYes > 100 && a.pairStates['A/USDT'].qNo > 100, 'AA : ordres comme avant');
  const cyc = between(s03, '    // ── 3. Optimal cycle (LMSR signal speed) ─────────────────', '    // ── 4. Lever suggestion', false);
  const runCyc = on => { const c = { ps: { userCycleSet: false, cycleMax: 60, raw: { stddev: { annualVol: 0.3 } } }, lmsrP: () => 0.95, Math, _mktOn: () => on }; vm.createContext(c); vm.runInContext(cyc, c); return c.ps.cycleMax; };
  assert.strictEqual(runCyc(false), 30, 'AA : cadence réglée sur le prix du marché, comme avant'); assert.strictEqual(runCyc(true), 60, 'EV / RE : syncPairPresets ne touche plus la cadence (10f la règle)');
  const inj = between(s08, '  // ── Inject composite into LMSR + nudge agents for ALL pairs ──', '    // Target probability from composite', false);
  assert.ok(codeStrict(inj).trim().startsWith("if (!((typeof _mktOn === 'function') && _mktOn())) pairs.forEach(pair => {"), 'rendu : injection du composite gardée');
});

T('M7 · persistance et naissance : 09b1 garde les T$ des sièges, mktLog, mktStats ; 09b2 (bloc réel) les relit — snapshot d\'avant : T$ = fitness au premier pari ; manifeste ; 07 : T$ du nouveau génome = fitness de naissance', () => {
  ["mktWallet:      (typeof a.mktWallet === 'number' && isFinite(a.mktWallet)) ? a.mktWallet : null,", 'mktGain:        Number(a.mktGain) || 0,', 'mktN:           Number(a.mktN)    || 0,', 'mktGen:         Number(a.mktGen)  || 0,', 'mktLog: S.mktLog || null,', 'mktStats: S.mktStats || null,']
    .forEach(k => assert.strictEqual(s9b1.split(k).length - 1, 1, '09b1 : ' + k));
  const blk = between(s9b2, "  try {\n    if (snap.agents && snap.agents.length && S.agents) {", "  } catch(e) { dbg.push('lmsr:err'); }", true);
  const mkA = id => ({ id, name: id, emoji: '', type: '', source: '', score: 0, conf: 0.5, fitness: 350, _judgments: [] });
  const S = { agents: [mkA('a1'), mkA('a2')], chainLog: [] };
  const snap = { agents: [{ id: 'a1', name: 'a1', fitness: 900, mktWallet: 1234.5, mktGain: -12.25, mktN: 40, mktGen: 3, _judgments: [] }, { id: 'a2', name: 'a2', fitness: 700, _judgments: [] }] };
  const c = { S, snap, dbg: [], Array, Number, Object, isFinite, Math, _fitWindowRefresh: () => {}, _fitCurrent: () => null, _fitHz: () => null, nowStr: () => '' };
  vm.createContext(c); vm.runInContext(blk, c);
  const g = id => S.agents.find(a => a.id === id);
  assert.deepStrictEqual([g('a1').mktWallet, g('a1').mktGain, g('a1').mktN, g('a1').mktGen], [1234.5, -12.25, 40, 3]);
  assert.deepStrictEqual([g('a2').mktWallet, g('a2').mktGain, g('a2').mktN, g('a2').mktGen], [null, 0, 0, 0], 'snapshot d\'avant');
  const t = mk(); t.S.agents = [Object.assign(agent('z', 777), { mktWallet: null })]; near(t.run('_mktWallet(S.agents[0])'), 777, 0, 'null → sa fitness au premier pari'); near(t.S.agents[0].mktWallet, 777, 0);
  assert.ok(s9b2.includes("if (Array.isArray(snap.mktLog))                                           S.mktLog            = snap.mktLog;") && s9b2.includes("if (snap.mktStats && typeof snap.mktStats === 'object')                   S.mktStats          = snap.mktStats;"));
  const man = s9b2.split('window._APPLYSNAP_MANIFEST = [')[1].split('];')[0]; assert.strictEqual(man.split("'mktLog'").length - 1, 1); assert.strictEqual(man.split("'mktStats'").length - 1, 1);
  // 07 : naissance — après la fitness de naissance, avec le reste du nouveau génome
  const i07 = s07.indexOf('weak.fitness = Math.max(350,'), iW = s07.indexOf('weak.mktWallet = weak.fitness; weak.mktGain = 0; weak.mktN = 0; weak.mktGen = (Number(weak.mktGen) || 0) + 1;'), iL = s07.indexOf('weak.lmsrWallet = weak.fitness; weak.lmsrSpent = 0;');
  assert.ok(i07 > 0 && iL > i07 && iW > iL && s07.split('weak.mktWallet = weak.fitness;').length === 2, '07 : T$ = fitness de naissance, une fois');
  // les manches ouvertes vivent dans walletStore (sauvé entier, relu entier)
  assert.ok(/\n\s*walletStore:\s+S\.walletStore,/.test(s9b1) && s9b2.includes('if (snap.walletStore && typeof snap.walletStore === \'object\') S.walletStore = snap.walletStore;'));
});

T('M8 · écran 11b (réel, lecture seule) : « Marché des agents » — manches soldées / nulles, erreur du prix contre pile ou face, bon sens, T$ misés / rendus, prix de chaque paire, qui pèse sur le prix, poids de sa voix ; « Poids des voix » la nomme ; « Fitness des sièges » : colonne T$ du marché', () => {
  const src = s11.replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const HZ = [1, 2, 4, 8, 16], rec = e => HZ.map(() => Array.from({ length: 6 }, () => [500, e > 0 ? 100 : -100]).reduce((a, p) => a.concat(p), []));
  const P6 = 100 + 100 * Math.log(1.5);
  const S = { tradingMode: 'paperReal', paperRealActivePairs: { 'SOL/USDT': true, 'BTC/USDT': true, 'ETH/USDT': true }, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {},
    pairStates: { 'SOL/USDT': { qYes: P6, qNo: 100, mkt: { open: true, n: 5, vol: 12.3456, prev: { P: 0.42, out: -1, n: 4 } } }, 'BTC/USDT': { qYes: 100, qNo: 100, mkt: { open: false, t: 1, P: 0.555, out: 0, n: 2, vol: 3 } }, 'ETH/USDT': { qYes: 100, qNo: 100 } },
    mktStats: { since: 1, E: { n: 40, v: 3, b: 38, br: 38 * 0.2345, d: 30, ok: 18, up: 21, vol: 1520.4, paid: 1480.2, fw: 5 } },   // [HORLOGE PAR MODE · 01/10/2026] fw : manches suivies
    agents: [{ id: 'a1', name: 'Momentum Alpha', fitness: 1350, mktWallet: 2210.4, mktGain: 310.2, mktN: 38, _judgments: [] }, { id: 'a2', name: 'On-chain', fitness: 50, mktWallet: 40.4, mktGain: -12.6, mktN: 30, _judgments: [] },
      { id: 'a3', name: 'Trend', fitness: 400, _judgments: [] }, { id: 'b', name: 'Scalper', isBot: true, fitness: 500, mktWallet: 99999 }],
    dcVoices: { marche: { id: 'marche', _judgments: [] } },
    dcThreshold: { rec: [], pend: [], rules: {}, pendV: [], vHz: { a1: rec(1), marche: rec(1) } } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [], _thHzLab: h => h + ' b', _thTfMs: () => F, _thTf: () => '15m',
    _fitWindow: () => 60, _fitOf: () => null, _fitHz: () => null, _dcMerit: v => (v && v.id === 'marche' ? 0.37 : 0), _dcMeritHz: id => (id === 'marche' ? 0.21 : null), _fjMode: () => 'hz' };
  vm.createContext(c); vm.runInContext(MKT.split('\n').filter(l => /^(var MKT_B|function _mktPrice)/.test(l)).join('\n') + '\n' + src, c);
  const before = JSON.stringify(S), h = vm.runInContext('_learnedPanelHtml()', c);
  assert.strictEqual(JSON.stringify(S), before, 'lecture seule');
  const seg = h.slice(h.indexOf('MARCHÉ DES AGENTS'), h.indexOf('FITNESS DES SIÈGES')), txt = seg.replace(/<[^>]+>/g, '|');
  assert.ok(seg.length > 0 && h.indexOf('POIDS DES VOIX') < h.indexOf('MARCHÉ DES AGENTS'), 'section après « Poids des voix »');
  ['40 manches soldées · 3 nulles (mises rendues)', 'erreur du prix (Brier) 0.234 — pile ou face : 0,250', 'bon sens 60 % des 30 manches où il penchait', 'T$ misés 1.5 k · rendus aux agents 1.5 k (−40) · dont 5 manches suivies (prix de l\'autre mode, sans mise)', 'hausses 53 % des manches',
    '60 % hausse · 5 mises (12 T$)', '42 % → baisse', '56 % → nulle', 'Momentum 2.2 k (+310)', 'On-chain 40 (−13)', 'bougie 0.37 · horizons 0.21'].forEach(k => assert.ok(txt.includes(k), 'absent : ' + k + '\n' + txt.slice(0, 1500)));
  assert.ok(!txt.includes('Scalper') && !txt.includes('100.0 k'), 'un bot n\'a pas de T$ de marché ici (il ne mise pas)');
  assert.ok(/\|SOL\|/.test(txt) && /\|ETH\|\|—\|\|—\|/.test(txt), 'paire sans manche : —');
  const vv = h.slice(h.indexOf('POIDS DES VOIX'), h.indexOf('MARCHÉ DES AGENTS')); assert.ok(vv.includes('>Marché des agents (prix)<') && vv.includes('>0.37<'), 'poids des voix : la voix du marché nommée, son bilan');
  const ft = h.slice(h.indexOf('FITNESS DES SIÈGES')).replace(/<[^>]+>/g, '|'); assert.ok(ft.includes('T$ du marché (gain · manches)') && ft.includes('2.2 k · +310 · 38') && ft.includes('40 · −13 · 30'), ft.slice(0, 1600));
  // sans manche : message
  const stE = S.mktStats; S.mktStats = null; const h2 = vm.runInContext('_learnedPanelHtml()', c); assert.ok(h2.includes('pas encore de manche soldée en EV'));
  // RE : ses compteurs, ses paires ; AA : dit que c'est l'ancien marché et montre EV
  S.mktStats = { since: 1, E: stE.E, R: { n: 5, v: 0, b: 5, br: 1.2, d: 4, ok: 3, up: 2, vol: 10, paid: 9 } }; S.realActivePairs = { 'BTC/USDT': true }; S.tradingMode = 'real';
  const sec = () => { const hh = vm.runInContext('_learnedPanelHtml()', c); return hh.slice(hh.indexOf('MARCHÉ DES AGENTS'), hh.indexOf('FITNESS DES SIÈGES')).replace(/<[^>]+>/g, '|'); };
  let s3 = sec(); assert.ok(s3.includes('RE : 5 manches soldées') && s3.includes('|BTC|') && !s3.includes('|SOL|') && s3.includes('56 % → nulle'), 'RE : ses compteurs et ses paires\n' + s3.slice(0, 800));
  S.tradingMode = 'sim'; s3 = sec(); assert.ok(s3.includes('AA : l\'ancien marché') && s3.includes('EV : 40 manches soldées') && !s3.includes('manche ouverte : prix'), 'AA : l\'ancien marché, EV montré\n' + s3.slice(0, 800));
});

T('M9 · textes : en-têtes 02, 03, 07, 08, 09b1, 09b2, 10f, 11b (VERSION 20260930a) ; HTML : 81 × 20260930a, plus de 20260928d ; constantes fondatrices dites telles (b = 100, q0 = 100, 8 %) ; plus aucun écrivain du marché hors AA et les manches dans js/', () => {
  const H = '// [MARCHÉ RÉPARÉ · 30/09/2026] VERSION 20260930a';
  [s02, s03, s07, s08, s9b1, s9b2, s10f, s11].forEach((s, i) => assert.ok(s.split('\n').slice(0, 3).some(l => l.startsWith(H)), 'en-tête ' + i));   // [DÉGEL DES VOIX · 02/10/2026] 02, 03, 07, 08, 09b1, 09b2 relivrés : en-tête MARCHÉ RÉPARÉ en 2e ou 3e ligne   // [HORLOGE PAR MODE · 01/10/2026] 02 et 03 relivrés : en-tête MARCHÉ RÉPARÉ en 2e ligne
  assert.strictEqual(html.split('20261005a').length - 1, 82); assert.strictEqual(html.split('20261004a').length - 1, 0);   // [MANU · 05/10/2026] HTML au jeton 20261005a
   assert.strictEqual(html.split('20261002a').length - 1, 0); assert.strictEqual(html.split('20261001a').length - 1, 0); assert.strictEqual(html.split('20260930a').length - 1, 0); assert.strictEqual(html.split('20260928d').length - 1, 0);   // [DÉGEL DES VOIX · 02/10/2026] HTML au jeton 20261002a   // [HORLOGE PAR MODE · 01/10/2026] HTML relivré au jeton 20261001a
  assert.ok(MKT.startsWith('var MKT_B = 100, MKT_Q0 = 100, MKT_STAKE = 0.08;') && s03.includes('Constantes FONDATRICES, pas apprises (la simulation d\'origine) : b = 100, q = 100 / 100, mise 8 % des T$'));
  // tout js/ chargé : qui écrit qYes / qNo ? 02 (lmsrBuyYes / No : AA), 03 (manches), 08 (rendu : AA, gardé), 10f (gardés) — rien d'autre
  const files = html.match(/src="js\/[^"?]+/g).map(x => x.slice(5));
  const w = {}; files.forEach(f => codeStrict(rd(f)).split('\n').forEach(l => { if (/\.q(Yes|No)\s*(=(?!=)|\+=|-=)/.test(l)) (w[f] = w[f] || []).push(l.trim()); }));
  assert.deepStrictEqual(Object.keys(w).sort(), ['js/02-state-init.js', 'js/03-per-pair-position-buttons-controls-buid.js', 'js/08-learning-history-render.js', 'js/10f-resolveur-cycle.js'], JSON.stringify(Object.keys(w)));
  assert.ok(w['js/02-state-init.js'].every(l => /^ps\.q(Yes|No)\+=delta; return cost;$/.test(l)), '02 : lmsrBuyYes / No (AA) seulement');
  assert.ok(w['js/03-per-pair-position-buttons-controls-buid.js'].every(l => /MKT_Q0|qY \+ yes|qN \+ no|ps\.qYes = qY; ps\.qNo = qN;|ps\.qYes = ops\.qYes; ps\.qNo = ops\.qNo;/.test(l)), '03 : les manches seulement : ' + JSON.stringify(w['js/03-per-pair-position-buttons-controls-buid.js']));
  const inj = codeStrict(between(s08, '  // ── Inject composite into LMSR + nudge agents for ALL pairs ──', '  // [S3 · 03/09/2026]', false));
  assert.strictEqual(w['js/08-learning-history-render.js'].length, 4); assert.ok(w['js/08-learning-history-render.js'].every(l => inj.includes(l)), '08 : l\'injection du rendu (gardée) seulement');
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' ✅ · ' + fail + ' ❌');
process.exit(fail ? 1 : 0);
