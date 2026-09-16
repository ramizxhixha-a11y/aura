// banc-fitness-glissante.js — [FITNESS GLISSANTE · 16/09/2026] VERSION 20260916c
// Point 3 du conseil « évolution à l'infini » : fitness = 350 + 1 000 × espérance nette des 60 derniers jugements.
//  D · _fitJudge RÉEL : plafond jamais atteint sur 1 000 bonnes réponses (1 350) ; pile-ou-face ≈ 350 ; un siège à 80 %
//      qui se met à perdre passe sous 600 en < 30 jugements ; < 5 jugements → fitness de naissance conservée ; fenêtre 60 ;
//      poids symétriques (une erreur pèse autant qu'une bonne réponse de même amplitude).
//  S · learnFromOutcome : les 4 écritures additives remplacées, bonus de série retiré ; 07 : fenêtre remise à zéro à la
//      fusion ; 09b1/09b2 : _judgments, _probationUntil, _bornCycle persistés.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début absente : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin absente'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
function ctx() { const c = { Math, Number, Array, window: {} }; vm.createContext(c); vm.runInContext(between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', true), c); return c; }
const judge = (c, a, s, w) => { c.a = a; c.s = s; c.w = w; return vm.runInContext('_fitJudge(a, s, w)', c); };
console.log('▶ banc-fitness-glissante');
T('D1 · 1 000 bonnes réponses : fitness plafonne à 1 350, jamais 2 000 ; fenêtre bornée à 60', () => {
  const c = ctx(), a = { fitness: 350 };
  let mx = 0; for (let i = 0; i < 1000; i++) mx = Math.max(mx, judge(c, a, 1, 0.5 + (i % 7) * 0.1));
  assert.strictEqual(a.fitness, 1350); assert.strictEqual(mx, 1350); assert.strictEqual(a._judgments.length, 60);
});
T('D2 · pile-ou-face pondéré : fitness ≈ 350 (poids symétriques) ; 1 000 erreurs : plancher 50', () => {
  const c = ctx(), a = { fitness: 650 };
  for (let i = 0; i < 600; i++) judge(c, a, i % 2 ? 1 : -1, 1);
  assert.ok(Math.abs(a.fitness - 350) <= 20, 'coin flip → ' + a.fitness);
  const b = { fitness: 650 }; for (let i = 0; i < 1000; i++) judge(c, b, -1, 1); assert.strictEqual(b.fitness, 50);
});
T('D3 · un siège à 80 % (≈ 950) qui se met à perdre passe sous 600 en moins de 30 jugements', () => {
  const c = ctx(), a = { fitness: 350 };
  for (let i = 0; i < 200; i++) judge(c, a, i % 5 === 0 ? -1 : 1, 1);
  assert.ok(a.fitness >= 900 && a.fitness <= 1000, '80 % → ' + a.fitness);
  let n = 0; while (a.fitness >= 600 && n < 60) { judge(c, a, -1, 1); n++; }
  assert.ok(n < 30, 'redescendu sous 600 en ' + n + ' jugements');
});
T('D4 · moins de 5 jugements : la fitness de naissance est conservée ; au 5e elle est recalculée', () => {
  const c = ctx(), a = { fitness: 650 };
  for (let i = 0; i < 4; i++) { judge(c, a, 1, 1); assert.strictEqual(a.fitness, 650); }
  judge(c, a, 1, 1); assert.strictEqual(a.fitness, 1350);
});
T('D5 · l\'amplitude pèse : 1 grosse erreur (poids 10) annule 10 petites bonnes réponses (poids 1)', () => {
  const c = ctx(), a = { fitness: 350 };
  for (let i = 0; i < 10; i++) judge(c, a, 1, 1);
  judge(c, a, -1, 10); assert.strictEqual(a.fitness, 350);
});
T('S1 · learnFromOutcome : plus aucune écriture additive de fitness (bots, méta, alignés, erreurs, bonus de série) — 4 appels _fitJudge ; 07 remet _judgments à zéro ; 09b1/09b2 persistent', () => {
  const lfoStart = s03.indexOf('function learnFromOutcome('); const lfoEnd = s03.indexOf('\n}\n', lfoStart); assert.ok(lfoStart > 0 && lfoEnd > lfoStart);
  const lfo = codeStrict(s03.slice(lfoStart, lfoEnd));
  assert.strictEqual((lfo.match(/a\.fitness\s*=\s*Math\.(min|max)\(/g) || []).length, 0, 'écritures additives restantes');
  assert.strictEqual((lfo.match(/_fitJudge\(a, /g) || []).length, 4, 'appels _fitJudge');
  assert.ok(lfo.includes("_fitJudge(a, 1, signalStrength * mag * decay);") && lfo.includes("_fitJudge(a, -1, signalStrength * mag * decay);"), 'poids symétriques agents');
  assert.ok(lfo.includes("_fitJudge(a, botReward >= 0 ? 1 : -1, mag);"), 'bots : poids = amplitude');
  assert.strictEqual(lfo.includes('a.fitness + 5'), false, 'bonus de série retiré');
  assert.ok(codeStrict(rd('js/07-v90-mode-bunker-sos.js')).includes('weak._judgments = [];'));
  assert.ok(codeStrict(rd('js/09b1-build-snapshot.js')).includes('_judgments:     (a._judgments     || []).slice(-60),'));
  assert.ok(codeStrict(rd('js/09b2-save-load.js')).includes('a._judgments     = Array.isArray(sa._judgments) ? sa._judgments.slice(-60) : [];'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
