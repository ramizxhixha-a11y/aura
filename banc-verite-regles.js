// banc-verite-regles.js — [VÉRITÉ DES RÈGLES · 23/09/2026] VERSION 20260923f
// Une règle armée tient-elle sa promesse ? armedAt/baseMean conservés tant que la règle reste la même, remis à
// l'armement d'une règle différente ; _ruleTruth compare les trades de la paire depuis l'armement à la fenêtre d'avant
// et compte les sorties dues à la règle ; 10f marque la position, 09d1 copie la marque, 11b l'affiche.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s10i = rd('js/10i-intel-bus.js');
const SRC = between(s10i, 'var PATH_MARKS = [15, 30, 60, 120, 240];', 'window._pathRecord = _pathRecord;', false).replace(/^window\..*$/gm, '');
const J = v => JSON.parse(JSON.stringify(v));
let NOW = 1000;
function ctx(S) { const c = { S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, nowStr: () => 'hh:mm', Date: { now: () => NOW } }; vm.createContext(c); vm.runInContext(SRC, c); return c; }
const mkg = (pair, fin, gb, closedAt) => ({ pair, closedAt: closedAt || 1, pnlPct: fin, path: { mfe: 0.5, mae: -0.3, at: {}, gb: gb || { '0.3|0.5': 0.25 } } });
console.log('▶ banc-verite-regles');
T('D1 · à l\'armement : armedAt = maintenant, baseMean = moyenne des 30 derniers trades de la paire ; conservés tant que la règle reste la même ; remis si la règle change', () => {
  const S = { pairStates: { 'A/USDT': {} }, tradeContextMemory: [], chainLog: [] };
  for (let i = 0; i < 9; i++) S.tradeContextMemory.push(mkg('A/USDT', -0.2, undefined, 100 + i));
  const c = ctx(S); NOW = 5000;
  vm.runInContext('_gainRefresh()', c);
  const r1 = J(S.gainRules['A/USDT']); assert.strictEqual(r1.armedAt, 5000); assert.ok(Math.abs(r1.baseMean - (-0.2)) < 1e-9, 'baseMean ' + r1.baseMean);
  NOW = 9000; S.tradeContextMemory.push(mkg('A/USDT', 0.3, undefined, 8000)); vm.runInContext('_gainRefresh()', c);
  const r2 = J(S.gainRules['A/USDT']); assert.strictEqual(r2.armedAt, 5000, 'même règle : armedAt conservé'); assert.strictEqual(r2.baseMean, r1.baseMean);
  // la règle change de case (m|f) → nouvel armement
  S.tradeContextMemory.forEach(t => { t.path.gb = { '0.5|0.7': 0.35 }; }); NOW = 12000; vm.runInContext('_gainRefresh()', c);
  const r3 = J(S.gainRules['A/USDT']); assert.strictEqual(r3.armedAt, 12000, 'règle différente : nouvel armement'); assert.strictEqual(r3.f, 0.7);
});
T('D2 · _ruleTruth : trades de la paire depuis l\'armement (tous), moyenne vs avant, sorties dues à la règle, promesse ; null sans règle ; « aucun trade encore » = n 0', () => {
  const S = { pairStates: { 'A/USDT': {} }, tradeContextMemory: [], chainLog: [] };
  for (let i = 0; i < 9; i++) S.tradeContextMemory.push(mkg('A/USDT', -0.2, undefined, 100 + i));
  const c = ctx(S); NOW = 5000; vm.runInContext('_gainRefresh()', c);
  let tr = J(vm.runInContext("_ruleTruth('A/USDT', 'gain')", c));
  assert.deepStrictEqual([tr.n, tr.acted, tr.mean, tr.delta], [0, 0, null, null]); assert.ok(Math.abs(tr.before + 0.2) < 1e-9 && Math.abs(tr.promise - 0.45) < 1e-9, JSON.stringify(tr));
  S.tradeContextMemory.push(Object.assign(mkg('A/USDT', 0.25, undefined, 6000), { ruleExit: { kind: 'gain', at: 0.25 } }));
  S.tradeContextMemory.push(mkg('A/USDT', 0.1, undefined, 7000));
  S.tradeContextMemory.push(Object.assign(mkg('A/USDT', -0.4, undefined, 7500), { ruleExit: { kind: 'stop', at: -0.4 } }));
  S.tradeContextMemory.push(mkg('B/USDT', 5, undefined, 7600));   // autre paire : ignorée
  tr = J(vm.runInContext("_ruleTruth('A/USDT', 'gain')", c));
  assert.strictEqual(tr.n, 3); assert.strictEqual(tr.acted, 1, 'une seule sortie par la règle de gain'); assert.strictEqual(tr.mean, Math.round((-0.05 / 3) * 1000) / 1000, 'moyenne arrondie à 3 décimales : ' + tr.mean); assert.ok(tr.delta > 0, 'mieux qu\'avant (−0,20)');
  assert.strictEqual(vm.runInContext("_ruleTruth('A/USDT', 'stop')", c), null, 'stop non armé → null');
  assert.strictEqual(vm.runInContext("_ruleTruth('B/USDT', 'gain')", c), null);
});
T('S1 · 10f marque la position à chaque sortie par règle apprise, 02 → 09d1 copient la marque, 11b affiche « depuis armée » sous chaque règle', () => {
  const cf = codeStrict(rd('js/10f-resolveur-cycle.js')), c9 = codeStrict(rd('js/09d1-paper-real-core.js')), c2 = codeStrict(rd('js/02-state-init.js')), c11 = codeStrict(rd('js/11b-ecran-appris.js'));
  ['horizon', 'gain', 'stop'].forEach(k => assert.ok(cf.includes("pos._ruleExit = { kind: '" + k + "', at: Math.round(pnlPct * 1000) / 1000, t: Date.now() };"), k));
  assert.ok(c2.includes('_enrichTradeContextOnClose(pos._contextId, realisedPct, realisedUsd, holdMs, pos._path, pos._ruleExit);'));
  assert.ok(c9.includes('function _enrichTradeContextOnClose(contextId, pnlPct, pnlUsd, holdMs, path, ruleExit) {') && c9.includes("S.tradeContextMemory[i].ruleExit = { kind: ruleExit.kind, at: ruleExit.at };"));
  assert.ok(c11.includes("_ruleTruth(p, kv[0])") && c11.includes("'depuis armée : '"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
