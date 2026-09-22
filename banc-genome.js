// banc-genome.js — [GÉNOME · 16/09/2026] VERSION 20260916b
// Point 2 du conseil « évolution à l'infini » (Rams 16/09) : génome réel par siège.
//  1. NON-RÉGRESSION : scoutAnalysis / councilVote / guardianCheck (livrés) contre l'ORACLE d'avant génome
//     (banc-fixtures/analyse-avant-genome-20260916a.js) — 17 sièges × paires × 40 états aléatoires : sorties IDENTIQUES
//     (score, conf, reasoning, vote, quote, status) avec le génome par défaut.
//  2. _genomeOf : défaut, surcharge, bornes, entiers, siège inconnu.
//  3. _genomeEvolve (Math.random maîtrisé) : archivage avec fitness de pointe, tri, cap 10, recombinaison avec la
//     meilleure version passée, mutation bornée, entiers entiers, gènes changés comptés, siège sans génome → null.
//  4. Un génome muté CHANGE les votes (ce n'est pas décoratif).
//  5. Persistance : 09b1 écrit genome/genomeHistory, 09b2 les relit, manifest.
//  6. Probation : le roster pèse moitié un nouveau-né (03), 07 pose _probationUntil = _bornCycle + 30.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début absente : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin absente : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js');
const oracle = require('./banc-fixtures/analyse-avant-genome-20260916a.js');
const NEW = {
  scoutAnalysis: between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS'),
  councilVote:   between(s03, 'function councilVote(councilId, pair, scoutResults) {', '\n// ── GUARDIAN CHECKS'),
  guardianCheck: between(s03, 'function guardianCheck(guardianId, verdict, pair, stake) {', '\n// ── ORCHESTRATOR ──')
};
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const SCOUTS = ['macro_v1', 'fundamental_v1', 'nlp_v1', 'sentiment_v2', 'volume_v1', 'volatility_v1', 'corr_v1', 'geopolitic_v1', 'onchain_v1', 'whale_v1', 'breakout_v1', 'harmonic_v1', 'flow_v1'];
const COUNCIL = ['scalper_v2', 'swing_v2', 'contrarian_v2', 'trend_v2', 'hedge_v2', 'momentum_v1', 'mean_rev_v1'];

// ── générateur d'états déterministe ──
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function mkState(seed) {
  const r = rng(seed), pairs = ['BTC/USDT', 'ETH/USDT', 'PEPE/USDT'];
  const S = { pairStates: {}, agents: [], openPositions: [], portfolio: 100, cycle: 1000 };
  pairs.forEach((p, i) => {
    let px = [77000, 2500, 0.0000034][i] * (0.9 + r() * 0.2); const candles = [];
    for (let k = 0; k < 60; k++) { const o = px, c = px * (1 + (r() - 0.5) * 0.02), h = Math.max(o, c) * (1 + r() * 0.005), l = Math.min(o, c) * (1 - r() * 0.005); candles.push({ o, h, l, c, v: r() * 100 }); px = c; }
    S.pairStates[p] = { candles, price: px * (1 + (r() - 0.5) * 0.01), qYes: 100 + r() * 300, qNo: 100 + r() * 300 };
  });
  const tech = {};
  pairs.forEach(p => { tech[p] = { atScore: (r() - 0.5) * 2, raw: { rsi: { rsi: 10 + r() * 80 }, stddev: { cv: r() * 0.05 }, adx: { adx: 5 + r() * 45 }, macd: { hist: (r() - 0.5) * 2 }, boll: { position: r() } } }; });
  const fund = {}; pairs.forEach(p => { fund[p] = { fundScore: (r() - 0.5) * 2 }; });
  const harm = {}; pairs.forEach(p => { harm[p] = r() < 0.3 ? null : { direction: r() < 0.5 ? 'bullish' : 'bearish', strength: r(), isResonance: r() < 0.5, bullCount: 3, bearCount: 2 }; });
  return { S, tech, fund, harm, pairs };
}
function mkCtx(src, st, genomeOverride) {
  const ctx = { S: st.S, Math, Number, Object, Array, JSON, Date, isFinite, String, window: {},
    getTechSignals: p => st.tech[p], getFundamentalSignals: p => st.fund[p], detectHarmonicResonance: p => st.harm[p],
    lmsrP: ps => ps.qYes / (ps.qYes + ps.qNo), COUNCIL_ADVISORS: { scalper_v2: ['volume_v1', 'flow_v1'], swing_v2: ['breakout_v1', 'volatility_v1'], contrarian_v2: ['sentiment_v2', 'whale_v1'], trend_v2: ['volatility_v1', 'corr_v1'], hedge_v2: ['geopolitic_v1', 'onchain_v1'], momentum_v1: ['flow_v1', 'breakout_v1'], mean_rev_v1: ['sentiment_v2', 'volume_v1'] } };
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx);
  if (genomeOverride) ctx.S.genome = genomeOverride;
  vm.runInContext(src.scoutAnalysis + '\n' + src.councilVote + '\n' + src.guardianCheck, ctx);
  return ctx;
}
function runAll(ctx, st) {
  const out = {};
  st.pairs.forEach(p => {
    const scouts = {}; SCOUTS.forEach(id => { scouts[id] = vm.runInContext('scoutAnalysis(' + JSON.stringify(id) + ',' + JSON.stringify(p) + ')', ctx); });
    const council = {}; ctx.__scouts = scouts; COUNCIL.forEach(id => { council[id] = vm.runInContext('councilVote(' + JSON.stringify(id) + ',' + JSON.stringify(p) + ', __scouts)', ctx); });
    const guard = vm.runInContext('guardianCheck("security_v1", {}, ' + JSON.stringify(p) + ', 10)', ctx);
    out[p] = { scouts, council, guard };
  });
  return JSON.parse(JSON.stringify(out));
}
console.log('▶ banc-genome');
T('1 · NON-RÉGRESSION : génome par défaut = sorties byte-identiques à l\'oracle (10 scouts + 3 conseils + sécurité ; whale/flow/volume et leurs conseils exclus depuis FLUX BINANCE 17/09), 3 paires, 40 états', () => {
  let n = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const a = mkState(seed * 7919), b = mkState(seed * 7919);
    const oldOut = runAll(mkCtx(oracle, a), a), newOut = runAll(mkCtx(NEW, b), b);
    // [FLUX BINANCE 17/09] whale_v1 / flow_v1 / volume_v1 lisent désormais le flux et le carnet Binance (comportement
    // volontairement différent de l'oracle) ; les conseils qu'ils conseillent (scalper, contrarian, momentum, mean_rev) suivent.
    const CHANGED_SCOUTS = ['whale_v1', 'flow_v1', 'volume_v1'], CHANGED_COUNCIL = ['scalper_v2', 'contrarian_v2', 'momentum_v1', 'mean_rev_v1'];
    [oldOut, newOut].forEach(o => Object.values(o).forEach(p => { CHANGED_SCOUTS.forEach(id => delete p.scouts[id]); CHANGED_COUNCIL.forEach(id => delete p.council[id]); }));
    assert.deepStrictEqual(newOut, oldOut, 'état ' + seed); n++;
  }
  assert.strictEqual(n, 40);
});
T('2 · _genomeOf : défaut sans surcharge, surcharge bornée, entiers arrondis, siège inconnu → {}', () => {
  const st = mkState(3); const ctx = mkCtx(NEW, st);
  const J = v => JSON.parse(JSON.stringify(v));   // objets nés dans la vm : aller-retour JSON
  const d = J(vm.runInContext("_genomeOf('breakout_v1')", ctx)); assert.deepStrictEqual(d, { win: 20, margin: 0.002, score: 0.7 });
  ctx.S.genome = { breakout_v1: { win: 33.4, margin: 9, score: 0.55 }, contrarian_v2: { rsiHigh: 200, rsiLow: -3 } };
  const g = vm.runInContext("_genomeOf('breakout_v1')", ctx); assert.strictEqual(g.win, 33); assert.strictEqual(g.margin, 0.008); assert.strictEqual(g.score, 0.55);
  const c = vm.runInContext("_genomeOf('contrarian_v2')", ctx); assert.strictEqual(c.rsiHigh, 95); assert.strictEqual(c.rsiLow, 5); assert.strictEqual(c.score, 0.7);
  assert.deepStrictEqual(J(vm.runInContext("_genomeOf('risk_bot_v1')", ctx)), {});
  assert.deepStrictEqual(J(vm.runInContext("_genomeOf('nlp_v1')", ctx)), {});
});
T('3 · _genomeEvolve : archivage (fitness de pointe), tri, cap 10, recombinaison avec la meilleure version, mutation bornée, entiers, compte des gènes changés, siège sans génome → null', () => {
  const st = mkState(5); const ctx = mkCtx(NEW, st);
  let seq = [0.6, 0.9, 0.2, 0.1, 0.6, 0.5, 0.6, 0.0, 0.9, 0.99]; let k = 0;
  const M = Object.create(Math); M.random = () => seq[(k++) % seq.length];   // hérite round/max/min (non énumérables)
  ctx.Math = M; vm.runInContext('Math = this.Math;', ctx);
  assert.strictEqual(vm.runInContext("_genomeEvolve('exec_bot_v1', 0.1, 900)", ctx), null);
  const r1 = vm.runInContext("_genomeEvolve('breakout_v1', 0.1, 900)", ctx);
  assert.ok(r1.archived && r1.genes === 3, JSON.stringify(r1));
  const h = ctx.S.genomeHistory.breakout_v1; assert.strictEqual(h.length, 1); assert.strictEqual(h[0].f, 900); assert.deepStrictEqual(JSON.parse(JSON.stringify(h[0].g)), { win: 20, margin: 0.002, score: 0.7 });
  const g1 = ctx.S.genome.breakout_v1; assert.strictEqual(g1.win, Math.round(g1.win)); assert.ok(g1.win >= 2 && g1.win <= 60);
  assert.ok(g1.margin >= 0.0005 && g1.margin <= 0.008 && g1.score >= 0.1 && g1.score <= 1);
  assert.ok(r1.changed >= 1 && r1.changed <= 3);
  // 12 évolutions à fitness croissante puis décroissante : la meilleure reste en tête, ≤ 10 versions
  for (let i = 1; i <= 12; i++) vm.runInContext("_genomeEvolve('breakout_v1', 0.2, " + (i <= 6 ? 900 + i * 100 : 300) + ")", ctx);
  const hh = ctx.S.genomeHistory.breakout_v1; assert.ok(hh.length <= 10 && hh.length >= 5, 'versions : ' + hh.length);
  assert.strictEqual(hh[0].f, 1500, 'la meilleure version (pointe 1500) reste en tête');
  for (let i = 1; i < hh.length; i++) assert.ok(hh[i - 1].f >= hh[i].f, 'triée');
  hh.forEach(v => { assert.strictEqual(v.g.win, Math.round(v.g.win)); assert.ok(v.g.margin <= 0.008 && v.g.margin >= 0.0005); });
  // même génome → pas de doublon archivé
  const before = ctx.S.genomeHistory.breakout_v1.length; ctx.S.genome.breakout_v1 = JSON.parse(JSON.stringify(ctx.S.genomeHistory.breakout_v1[0].g));
  const r2 = vm.runInContext("_genomeEvolve('breakout_v1', 0.05, 100)", ctx); assert.strictEqual(r2.archived, false); assert.strictEqual(ctx.S.genomeHistory.breakout_v1.length, before);
});
T('4 · un génome muté CHANGE les votes : contrarian_v2 (rsiHigh 72→55) et breakout_v1 (marge 0,2 %→1 %) ne votent plus comme l\'oracle', () => {
  const st = mkState(11); const ctx = mkCtx(NEW, st, { contrarian_v2: { rsiHigh: 55, rsiLow: 45, score: 0.9, ownW: 0.9, voteThr: 0.05 }, breakout_v1: { win: 8, margin: 0.01, score: 0.3 } });
  const out = runAll(ctx, st); const ref = runAll(mkCtx(oracle, mkState(11)), mkState(11));
  let diff = 0; st.pairs.forEach(p => { if (JSON.stringify(out[p].council.contrarian_v2) !== JSON.stringify(ref[p].council.contrarian_v2)) diff++; if (JSON.stringify(out[p].scouts.breakout_v1) !== JSON.stringify(ref[p].scouts.breakout_v1)) diff++; });
  assert.ok(diff >= 2, 'au moins 2 sorties différentes (' + diff + ')');
  st.pairs.forEach(p => assert.deepStrictEqual(out[p].scouts.onchain_v1, ref[p].scouts.onchain_v1, 'les sièges non mutés votent comme avant'));
});
T('5 · persistance : 09b1 écrit genome + genomeHistory, 09b2 les relit, manifest ; 07 : _genomeEvolve appelé à la fusion avec _mutation et la fitness de pointe, _probationUntil = _bornCycle + 30', () => {
  const c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js')), c7 = codeStrict(s07), c3 = codeStrict(s03);
  assert.ok(c1.includes('genome: S.genome || {},') && c1.includes('genomeHistory: S.genomeHistory || {},'));
  assert.ok(c2.includes("S.genome        = snap.genome;") && c2.includes("S.genomeHistory = snap.genomeHistory;"));
  assert.ok(c2.includes("window._APPLYSNAP_MANIFEST = ['genome','genomeHistory',"));
  assert.ok(c7.includes("_genomeEvolve(weak.id, _mutation, _peakPrev)") && c7.includes("weak._probationUntil = weak._bornCycle + 30;"));
  assert.ok(c3.includes("if (agent._probationUntil && (S.cycle || 0) < agent._probationUntil) weight *= 0.5;"));
  assert.strictEqual((c3.match(/const G = _genomeOf\(/g) || []).length, 3, 'scoutAnalysis, councilVote, guardianCheck lisent le génome');
  const defs = Object.keys(JSON.parse(JSON.stringify(vm.runInContext('GENOME_DEFAULTS', mkCtx(NEW, mkState(1)))))); assert.strictEqual(defs.length, 18, 'sièges génomés : ' + defs.length);   // [23/09] + harmonic_v1
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
