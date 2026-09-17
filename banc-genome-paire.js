// banc-genome-paire.js — [GÉNOME DE PAIRE · 17/09/2026] VERSION 20260917e
// Les périodes des indicateurs (RSI, EMA, SMA, stochastique, ADX) et les poids du mélange deviennent le génome DE LA
// PAIRE : par défaut identiques à hier (non-régression), mutables une fois par jour et par paire, bornés, persistés.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début absente : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin absente'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s08 = rd('js/08-learning-history-render.js');
const ENGINE = between(s03, 'const PAIR_GENOME_DEFAULTS = {', 'window.PAIR_GENOME_DEFAULTS = PAIR_GENOME_DEFAULTS;', false);
const ROLL = between(s08, 'function _pairGenomeRollover() {', 'window._pairGenomeRollover = _pairGenomeRollover;', false);
const J = v => JSON.parse(JSON.stringify(v));
function ctx(S) { const c = { S, Math, Number, Object, Array, JSON, Date, isFinite, String, window: {} }; vm.createContext(c); vm.runInContext(ENGINE, c); return c; }
console.log('▶ banc-genome-paire');
T('D1 · _pairGenomeOf : défauts = les constantes d\'hier (RSI 14, EMA 9/21/50, SMA 10/20/50, stoch 14, ADX 14, poids 1,2/1,3/1) ; bornes [défaut/3, ×3], entiers, croisements distincts, poids dans [0,2 ; 3]', () => {
  const c = ctx({});
  assert.deepStrictEqual(J(vm.runInContext("_pairGenomeOf('BTC/USDT')", c)), { rsi: 14, stoch: 14, adx: 14, emaFast: 9, emaSlow: 21, emaLong: 50, smaFast: 10, smaSlow: 20, smaLong: 50, wTrend: 1.2, wMomentum: 1.3, wVolatility: 1 });
  c.S.pairGenome = { 'BTC/USDT': { rsi: 99, emaFast: 0.5, emaSlow: 4, smaFast: 12.6, wTrend: 99, wVolatility: 0.01, adx: 7.4 } };
  const g = J(vm.runInContext("_pairGenomeOf('BTC/USDT')", c));
  assert.strictEqual(g.rsi, 42, 'borné à 3 × 14'); assert.strictEqual(g.emaFast, 3, 'plancher 3'); assert.strictEqual(g.emaSlow, 7, 'borné à 21/3');
  assert.strictEqual(g.smaFast, 13, 'entier'); assert.strictEqual(g.wTrend, 3, 'poids borné à 3'); assert.ok(Math.abs(g.wVolatility - 1/3) < 1e-9, 'poids borné à défaut/3 : ' + g.wVolatility); assert.strictEqual(g.adx, 7);
  c.S.pairGenome = { 'X/USDT': { emaFast: 20, emaSlow: 9, smaFast: 30, smaSlow: 12 } };
  const g2 = J(vm.runInContext("_pairGenomeOf('X/USDT')", c));
  assert.ok(g2.emaSlow > g2.emaFast && g2.smaSlow > g2.smaFast, 'croisements distincts : ' + JSON.stringify(g2));
});
T('D2 · _pairGenomeEvolve : archive la version courante avec sa fitness, jamais deux fois la même, trie, cap 8, recombine et mute dans les bornes (entiers)', () => {
  const c = ctx({});
  let k = 0; const seq = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4, 0.95, 0.05, 0.55, 0.45];   // Math.random maîtrisé
  const M = Object.create(Math); M.random = () => seq[(k++) % seq.length]; c.Math = M; vm.runInContext('Math = this.Math;', c);
  const r = J(vm.runInContext("_pairGenomeEvolve('BTC/USDT', 0.15, 4.2)", c));
  assert.strictEqual(r.genes, 12); assert.ok(r.changed >= 1, 'au moins un gène muté');
  const h = c.S.pairGenomeHistory['BTC/USDT'];
  assert.strictEqual(h.length, 1); assert.strictEqual(h[0].f, 4.2); assert.strictEqual(J(h[0].g).rsi, 14, 'la version archivée est celle d\'avant mutation');
  // le génome courant est muté, entier, dans les bornes
  const g = J(c.S.pairGenome['BTC/USDT']), D = { rsi: 14, stoch: 14, adx: 14, emaFast: 9, emaSlow: 21, emaLong: 50, smaFast: 10, smaSlow: 20, smaLong: 50, wTrend: 1.2, wMomentum: 1.3, wVolatility: 1 };
  Object.keys(D).forEach(key => {
    const isW = key.startsWith('w');
    assert.ok(g[key] >= Math.max(isW ? 0.2 : 3, D[key] / 3 - 1e-9) && g[key] <= Math.min(isW ? 3 : 60, D[key] * 3 + 1e-9), key + ' hors bornes : ' + g[key]);
    if (!isW) assert.strictEqual(g[key], Math.round(g[key]), key + ' non entier');
  });
  // même génome courant → pas de doublon archivé
  const before = c.S.pairGenomeHistory['BTC/USDT'].length;
  c.S.pairGenome['BTC/USDT'] = J(c.S.pairGenomeHistory['BTC/USDT'][0].g);
  vm.runInContext("_pairGenomeEvolve('BTC/USDT', 0.15, 99)", c);
  assert.strictEqual(c.S.pairGenomeHistory['BTC/USDT'].length, before, 'version déjà archivée : pas de doublon');
  // 12 versions distinctes (imposées) : triées par fitness décroissante, cap 8, la meilleure en tête
  for (let i = 1; i <= 12; i++) {
    c.S.pairGenome['BTC/USDT'] = Object.assign(J(D), { rsi: 5 + i });
    vm.runInContext("_pairGenomeEvolve('BTC/USDT', 0.15, " + (i <= 6 ? i * 2 : -i) + ")", c);
  }
  const hh = c.S.pairGenomeHistory['BTC/USDT'];
  assert.strictEqual(hh.length, 8, 'cap 8');
  assert.strictEqual(hh[0].f, 12, 'meilleure version (fitness 12) en tête');
  for (let i = 1; i < hh.length; i++) assert.ok(hh[i - 1].f >= hh[i].f, 'triée');
});
T('D3 · _pairGenomeRollover RÉEL : rien en AA ; en EV une seule paire par passage, seulement ≥ 5 trades, une fois par jour, journal 🧬', () => {
  const S = { tradingMode: 'sim', pairStates: { 'A/USDT': { totalTrades: 9, totalPnlUsd: 1.5 }, 'B/USDT': { totalTrades: 3, totalPnlUsd: 0 }, 'C/USDT': { totalTrades: 40, totalPnlUsd: -2 } }, chainLog: [] };
  const c = ctx(S); vm.runInContext(ROLL, c);
  assert.strictEqual(vm.runInContext('_pairGenomeRollover()', c), 0, 'AA : rien');
  S.tradingMode = 'paperReal';
  assert.strictEqual(vm.runInContext('_pairGenomeRollover()', c), 1);
  assert.strictEqual(vm.runInContext('_pairGenomeRollover()', c), 1, '2e passage : la paire suivante');
  assert.strictEqual(vm.runInContext('_pairGenomeRollover()', c), 0, '3e : B a moins de 5 trades, A et C déjà faits aujourd\'hui');
  assert.deepStrictEqual(Object.keys(S.pairGenome).sort(), ['A/USDT', 'C/USDT']);
  assert.strictEqual(S.pairGenome['B/USDT'], undefined);
  assert.strictEqual(S.chainLog.length, 2); assert.ok(S.chainLog[0].desc.startsWith('Génome de paire A/USDT :') && S.chainLog[0].desc.includes('1.50 $'), S.chainLog[0].desc);
  S._pairGenomeDay = {}; assert.strictEqual(vm.runInContext('_pairGenomeRollover()', c), 1, 'jour suivant : ça repart');
});
T('S1 · 08 : getTechSignals lit GP (périodes + poids par famille), la clé de cache porte l\'empreinte du génome, plus aucune période en dur ; persistance 09b1/09b2 + manifest', () => {
  const g = between(s08, 'function getTechSignals(pair) {', '  const result = { signals, atScore, raw };', false), c = codeStrict(g);
  assert.ok(c.includes("const GP = (typeof _pairGenomeOf === 'function') ? _pairGenomeOf(pair)"));
  ['calcSMA(closes, Math.min(GP.smaFast', 'calcSMA(closes, Math.min(GP.smaSlow', 'calcSMA(closes, Math.min(GP.smaLong', 'calcEMA(closes, Math.min(GP.emaFast', 'calcEMA(closes, Math.min(GP.emaSlow', 'calcEMA(closes, Math.min(GP.emaLong', 'calcStochastic(candles, Math.min(GP.stoch', 'calcRSI(candles, Math.min(GP.rsi', 'calcADX(candles, Math.min(GP.adx'].forEach(k => assert.ok(c.includes(k), k));
  assert.strictEqual(/Math\.min\((10|20|50|9|21|14),/.test(c), false, 'période en dur restante');
  assert.strictEqual((c.match(/weight: GP\.wTrend/g) || []).length, 3); assert.strictEqual((c.match(/weight: GP\.wMomentum/g) || []).length, 3); assert.strictEqual((c.match(/weight: GP\.wVolatility/g) || []).length, 1);
  assert.ok(c.includes("GP.rsi + '.' + GP.emaFast"), 'cache invalidé par le génome');
  assert.ok(codeStrict(s08).includes('_pairGenomeRollover();'), 'rollover appelé dans le battement');
  const c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js'));
  assert.ok(c1.includes('pairGenome: S.pairGenome || {},') && c1.includes('pairGenomeHistory: S.pairGenomeHistory || {},') && c1.includes('_pairGenomeDay: S._pairGenomeDay || {},'));
  assert.ok(c2.includes('S.pairGenome        = snap.pairGenome;') && c2.includes("'pairGenome','pairGenomeHistory','_pairGenomeDay'"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
