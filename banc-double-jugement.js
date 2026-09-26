// banc-double-jugement.js — [DOUBLE JUGEMENT · 26/09/2026] VERSION 20260926g
// Une fermeture bot (10f : résolution « signal inversé / timeout », balayage niveaux ATR) jugeait les agents DEUX fois pour le
// même trade : closePosition (02) → learnFromOutcome('position'), puis 10f → learnFromOutcome('trade'). Le second appel est retiré ;
// la compétence par régime, qui ne suivait que 'trade', suit désormais 'position' (la fermeture elle-même).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s10f = rd('js/10f-resolveur-cycle.js');
console.log('▶ banc-double-jugement');
T('S1 · 10f : plus aucun learnFromOutcome après une fermeture (les deux voies : résolution et balayage) ; 02 closePosition juge UNE fois (\'position\') ; les jugements de cycle (prédictions) restent', () => {
  const c10 = codeStrict(s10f), c02 = codeStrict(s02);
  assert.strictEqual((c10.match(/learnFromOutcome\('trade'/g) || []).length, 0, 'jugement « trade » restant dans 10f');
  assert.ok(c10.includes('closePosition(botPos.id,true);') && c10.includes("if (!_closeCompleted(pos, 'bot ' + why)) return;"), 'les deux fermetures existent toujours');
  assert.strictEqual((c10.match(/learnFromOutcome\('cycle'/g) || []).length, 7, 'jugements de cycle inchangés (7)');
  const cp = between(s02, 'function closePosition(id, botClose = false) {', '\n}\n', false);   // corps entier (jusqu\'à la première accolade fermante en colonne 0)
  assert.strictEqual((cp.match(/learnFromOutcome\(/g) || []).length, 1); assert.ok(cp.includes("learnFromOutcome('position', realisedPct, pos.pair);"));
});
T('D1 · learnFromOutcome RÉEL (tête de fonction, 03) : la compétence par régime est mise à jour pour \'position\' ET \'trade\' (votants |vote| > 0,05, poids EV ×3), pas pour \'cycle\' ; en AA rien', () => {
  const head = between(s03, 'function learnFromOutcome(source, pnlPct, pair) {', '  const won   = pnlPct > 0;', false) + '}';
  const mk = mode => {
    const S = { tradingMode: mode, _realJudgments: 10, agents: [{ id: 'a', score: 0.5 }, { id: 'b', score: 0.01 }, { id: 'c', score: -0.7 }] };
    const calls = [];
    const c = { S, Math, Number, isFinite, window: {}, detectMarketRegime: () => 'calm', _agentPairVote: (a) => a.score, updateRegimeFitness: (a, r, v) => calls.push([a.id, r, v]) };
    vm.createContext(c); vm.runInContext(head, c); return { S, calls, run: (src, pnl) => vm.runInContext('learnFromOutcome(' + JSON.stringify(src) + ', ' + pnl + ', "BTC/USDT")', c) };
  };
  let t = mk('paperReal'); t.run('position', 1.5);
  assert.deepStrictEqual(t.calls, [['a', 'calm', 4.5], ['c', 'calm', -4.5]], 'position : votants > 0,05 jugés, ×3 en EV, signe du vote');
  assert.strictEqual(t.S._realJudgments, 11);
  t = mk('paperReal'); t.run('trade', -1); assert.strictEqual(t.calls.length, 2, 'trade : toujours accepté');
  t = mk('paperReal'); t.run('cycle', 1.5); assert.strictEqual(t.calls.length, 0, 'cycle : pas de compétence par régime');
  t = mk('real'); t.run('position', 1); assert.deepStrictEqual(t.calls[0], ['a', 'calm', 5], 'RE ×5');
  t = mk('sim'); t.run('position', 1.5); assert.strictEqual(t.calls.length, 0); assert.strictEqual(t.S._realJudgments, 10); assert.strictEqual(t.S._simLearnSkipped, 1, 'AA : sortie avant tout');
  t = mk('paperReal'); t.run('position', 0); assert.strictEqual(t.calls.length, 0, 'zéro n\'enseigne rien');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
