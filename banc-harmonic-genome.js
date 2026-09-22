// banc-harmonic-genome.js — [HARMONIQUE GÉNOMÉE · 23/09/2026] VERSION 20260923d
// Les 9 seuils du détecteur harmonique deviennent le génome du siège harmonic_v1 : byte-identique par défaut (oracle),
// différent avec un génome muté, mutation bornée (resonanceMin entier 2..5).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const ORACLE = require('./banc-fixtures/harmonic-avant-genome-20260923c.js');
const NEW = (() => { const i = s03.indexOf('function detectHarmonicResonance(pair) {'); const j = s03.indexOf('\n}\n', i); return s03.slice(i, j + 3); })();
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const J = v => JSON.parse(JSON.stringify(v));
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function ctx(fnSrc, tech, genome) {
  const c = { S: { pairStates: { 'BTC/USDT': {} }, resonanceHistory: [], genome: genome || null }, Math, Number, Object, JSON, Date, isFinite, String, window: {}, getTechSignals: () => tech };
  vm.createContext(c); vm.runInContext(ENGINE + '\n' + fnSrc, c); return c;
}
const mkTech = r => ({ raw: { rsi: { rsi: 10 + r() * 80 }, macd: { hist: (r() - 0.5) * 0.02 }, stoch: { k: r() * 100 }, adx: { adx: 5 + r() * 45 }, boll: { position: r() } } });
console.log('▶ banc-harmonic-genome');
T('D1 · NON-RÉGRESSION : génome par défaut → sorties byte-identiques à l\'oracle sur 200 états', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = rng(seed * 7919), tech = mkTech(r);
    const a = J(vm.runInContext("detectHarmonicResonance('BTC/USDT')", ctx(ORACLE, tech))), b = J(vm.runInContext("detectHarmonicResonance('BTC/USDT')", ctx(NEW, tech)));
    assert.deepStrictEqual(b, a, 'état ' + seed);
  }
});
T('D2 · un génome muté CHANGE la lecture : RSI à 55/45, résonance à 3 → plus d\'alignements et de résonances', () => {
  const tech = { raw: { rsi: { rsi: 60 }, macd: { hist: 0.001 }, stoch: { k: 70 }, adx: { adx: 25 }, boll: { position: 0.8 } } };
  const d = J(vm.runInContext("detectHarmonicResonance('BTC/USDT')", ctx(NEW, tech)));
  assert.strictEqual(d.bullCount, 0); assert.strictEqual(d.isResonance, false);
  const m = J(vm.runInContext("detectHarmonicResonance('BTC/USDT')", ctx(NEW, tech, { harmonic_v1: { rsiHigh: 55, rsiLow: 45, macdThr: 0.0005, stochHigh: 65, stochLow: 35, adxMin: 20, bbHigh: 0.75, bbLow: 0.25, resonanceMin: 3 } })));
  assert.strictEqual(m.bullCount, 5); assert.strictEqual(m.isResonance, true); assert.strictEqual(m.direction, 'bullish');
});
T('D3 · le génome du siège : 9 gènes, mutation bornée (resonanceMin entier dans [2, 5], seuils dans leur domaine), archive comme les autres sièges', () => {
  const c = ctx(NEW, mkTech(rng(3)));
  let k = 0; const seq = [0.99, 0.01, 0.9, 0.1, 0.95, 0.05, 0.99, 0.01, 0.9, 0.1, 0.95, 0.05, 0.99, 0.01, 0.9, 0.1, 0.95, 0.05];
  const M = Object.create(Math); M.random = () => seq[(k++) % seq.length]; c.Math = M; vm.runInContext('Math = this.Math;', c);
  assert.deepStrictEqual(J(vm.runInContext("_genomeOf('harmonic_v1')", c)), { rsiHigh: 65, rsiLow: 35, macdThr: 0.002, stochHigh: 75, stochLow: 25, adxMin: 30, bbHigh: 0.85, bbLow: 0.15, resonanceMin: 4 });
  for (let i = 0; i < 12; i++) vm.runInContext("_genomeEvolve('harmonic_v1', 0.5, 500)", c);
  const g = J(c.S.genome.harmonic_v1);
  assert.strictEqual(g.resonanceMin, Math.round(g.resonanceMin)); assert.ok(g.resonanceMin >= 2 && g.resonanceMin <= 5, 'resonanceMin ' + g.resonanceMin);
  assert.ok(g.rsiHigh >= 50 && g.rsiHigh <= 95 && g.rsiLow >= 5 && g.rsiLow <= 50 && g.stochHigh >= 50 && g.stochHigh <= 95 && g.stochLow >= 5 && g.stochLow <= 50 && g.adxMin >= 10 && g.adxMin <= 60 && g.bbHigh >= 0.5 && g.bbHigh <= 1 && g.bbLow >= 0 && g.bbLow <= 0.5, JSON.stringify(g));
  assert.ok(c.S.genomeHistory.harmonic_v1.length >= 1);
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
