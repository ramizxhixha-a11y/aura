// banc-attribution.js — [POIDS PAR ATTRIBUTION · 16/09/2026] VERSION 20260916d
// Point 4 du conseil « évolution à l'infini » : le poids d'un siège dans le consensus = fitness glissante × compétence
// sur la paire × compétence dans le régime courant, en continu ; regimeFitness = votes alignés du siège.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début absente : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin absente'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const near = (a, b) => Math.abs(a - b) < 1e-9;
function ctx(S) { const c = { S, Number, Math, Array, window: {} }; vm.createContext(c); vm.runInContext(between(s03, 'function _attributionFactor(id, pair, regime) {', 'window._attributionFactor = _attributionFactor;', true), c); return c; }
const F = (c, id, pair, regime) => JSON.parse(JSON.stringify(vm.runInContext('_attributionFactor(' + JSON.stringify(id) + ',' + JSON.stringify(pair) + ',' + JSON.stringify(regime) + ')', c)));
console.log('▶ banc-attribution');
T('D1 · _attributionFactor RÉEL : sans historique → 1,0 × 1,0 ; paire 30/10 → 1,2 ; 10/30 → 0,8 ; régime 40/50 → 1,25 ; 5/50 → 0,667 ; régime inconnu → 1', () => {
  const S = { agentPairSkill: { a: { 'BTC/USDT': { w: 30, l: 10 }, 'ETH/USDT': { w: 10, l: 30 } } }, agents: [{ id: 'a', regimeFitness: { calm: { wins: 40, total: 50 }, bear: { wins: 5, total: 50 } } }] };
  const c = ctx(S);
  let f = F(c, 'z', 'BTC/USDT', 'calm'); assert.ok(near(f.pairF, 1) && near(f.regF, 1), JSON.stringify(f));
  f = F(c, 'a', 'BTC/USDT', 'calm'); assert.ok(near(f.pairF, 1.2) && near(f.regF, 1.25), JSON.stringify(f));
  f = F(c, 'a', 'ETH/USDT', 'bear'); assert.ok(near(f.pairF, 0.8) && near(f.regF, 0.5 + 10 / 60), JSON.stringify(f));
  f = F(c, 'a', 'XRP/USDT', 'sideways'); assert.ok(near(f.pairF, 1) && near(f.regF, 1) && f.regime === 'sideways');
  f = F(c, 'a', 'BTC/USDT', null); assert.ok(near(f.regF, 1) && f.regime === null);
});
T('D2 · un petit échantillon tire vers le neutre : 1/0 → 1,045 ; 100/0 → 1,455 (jamais 1,5) ; 0/100 → 0,545 (jamais 0,5)', () => {
  const S = { agentPairSkill: { a: { P: { w: 1, l: 0 }, Q: { w: 100, l: 0 }, R: { w: 0, l: 100 } } }, agents: [] };
  const c = ctx(S);
  assert.ok(near(F(c, 'a', 'P', null).pairF, 0.5 + 6 / 11)); assert.ok(near(F(c, 'a', 'Q', null).pairF, 0.5 + 105 / 110)); assert.ok(near(F(c, 'a', 'R', null).pairF, 0.5 + 5 / 110));
});
T('S1 · roster : base fitness inchangée (0,5 + fitness/1000), plus de paliers hitRate/paire, poids = base × pairF × regF, régime calculé UNE fois par appel, décomposition dans ps.roster.weights', () => {
  const r = codeStrict(between(s03, 'function runRosterAnalysis(pair) {', "_ps.roster = { ts: Date.now(), cycle: S.cycle || 0, votes: _votes, weights: _weights, regime: _regimeNow };", true));
  assert.ok(r.includes('weight = 0.5 + (Math.max(50, Math.min(2000, agent.fitness)) / 1000);'));
  assert.strictEqual(r.includes('hitRate'), false); assert.strictEqual(r.includes('weight *= 1.25'), false); assert.strictEqual(r.includes('weight *= 1.3'), false);
  assert.ok(r.includes('weight *= _pf.pairF * _pf.regF;'));
  assert.strictEqual((r.match(/detectMarketRegime\(\)/g) || []).length, 1, 'régime calculé une fois');
  assert.ok(r.includes('_attributionFactor(cId, pair, _regimeNow)'));
  assert.ok(r.includes("if (agent._probationUntil && (S.cycle || 0) < agent._probationUntil) weight *= 0.5;") && r.includes('agent.streak <= -3'), 'probation et série perdante conservées');
});
T('S2 · learnFromOutcome : regimeFitness alimenté avec le SIGNE DU VOTE × P&L (compétence propre), plus le résultat du trade copié à tous', () => {
  const l = codeStrict(s03);
  assert.ok(l.includes("updateRegimeFitness(a, _regime, (_va > 0 ? 1 : -1) * pnlPct * ("));
  assert.strictEqual(l.includes("updateRegimeFitness(a, _regime, pnlPct * ("), false);
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
