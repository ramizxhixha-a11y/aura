// banc-prix-fige.js — [PRIX FIGÉ + PREUVE D'ACTION · 25/09/2026] VERSION 20260925a
// (1) la mémoire des chemins n'écrit rien sur un prix figé (coupure) ; (2) une règle de gain / stop ne s'arme que si elle
// aurait agi sur ≥ 4 chemins ; (3) l'anti-zombie s'efface devant une règle de gain armée et marque sa sortie.
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
const t0 = 1000000000000;
function ctx(S, ageMs) { const c = { S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, nowStr: () => 'x', Date: { now: () => t0 + 16 * 60000 }, _rcPriceAge: () => ageMs }; vm.createContext(c); vm.runInContext(SRC, c); return c; }
console.log('▶ banc-prix-fige');
T('D1 · prix réel vieux de plus de 2 min en EV : aucun chemin écrit (compteur _pathStale) ; prix frais : écrit ; en AA (bougies fabriquées) : écrit quel que soit l\'âge', () => {
  const mk = mode => ({ tradingMode: mode, pairStates: { 'A/USDT': { price: 101 } }, openPositions: [{ pair: 'A/USDT', side: 'long', entryPrice: 100, openedAt: t0 }] });
  let S = mk('paperReal'); vm.runInContext('_pathRecord()', ctx(S, 5 * 60000));
  assert.strictEqual(S.openPositions[0]._path, undefined, 'figé : rien'); assert.strictEqual(S.openPositions[0]._pathStale, 1);
  S = mk('paperReal'); vm.runInContext('_pathRecord()', ctx(S, 30000)); assert.strictEqual(J(S.openPositions[0]._path).mfe, 1, 'frais : écrit');
  S = mk('sim'); vm.runInContext('_pathRecord()', ctx(S, 9e9)); assert.strictEqual(J(S.openPositions[0]._path).mfe, 1, 'AA : pas de notion de prix réel');
});
T('D2 · gain et stop : une règle qui n\'aurait agi que sur 3 chemins ne s\'arme pas, même avec un gros gain ; à 4, elle peut', () => {
  const c = ctx({}, 0);
  const mkg = (fin, gb, mfe, mae) => ({ pair: 'A/USDT', closedAt: 1, pnlPct: fin, path: { mfe: mfe, mae: mae === undefined ? -0.1 : mae, at: {}, gb: gb } });
  c.m3 = []; for (let i = 0; i < 8; i++) c.m3.push(mkg(0.1, {}, 0.15)); for (let i = 0; i < 3; i++) c.m3.push(mkg(-1, { '0.3|0.5': 0.4 }, 0.8));   // 11 chemins (< 16 : pas de test de stabilité ici)
  assert.strictEqual(vm.runInContext("_gainEvalPair('A/USDT', m3)", c), null, '3 actions : pas de règle');
  c.m4 = c.m3.concat([mkg(-1, { '0.3|0.5': 0.4 }, 0.8)]);
  assert.ok(vm.runInContext("_gainEvalPair('A/USDT', m4)", c), '4 actions : règle possible');
  c.s3 = []; for (let i = 0; i < 8; i++) c.s3.push(mkg(0.1, {}, 0.15, -0.1)); for (let i = 0; i < 3; i++) c.s3.push(mkg(-2, {}, 0.05, -2));
  assert.strictEqual(vm.runInContext("_stopEvalPair('A/USDT', s3)", c), null);
  c.s4 = c.s3.concat([mkg(-2, {}, 0.05, -2)]); assert.ok(vm.runInContext("_stopEvalPair('A/USDT', s4)", c));
});
T('S1 · 07 : l\'anti-zombie ne s\'applique pas quand la paire a une règle de gain armée ; sa sortie est marquée « zombie » ; 02 expose _rcPriceAge', () => {
  const c7 = codeStrict(rd('js/07-v90-mode-bunker-sos.js')), c2 = codeStrict(rd('js/02-state-init.js'));
  assert.ok(c7.includes('const _gainArmed = !!(S.gainRules && S.gainRules[pos.pair]);') && c7.includes('if (!_gainArmed && posAgeMs > 30 * 60 * 1000 && Math.abs(_cExitPct) < 0.3) {'));
  assert.ok(c7.includes("pos._ruleExit = { kind: 'zombie', at: Math.round(_cExitPct * 1000) / 1000, t: Date.now() };"));
  assert.ok(c2.includes('function _rcPriceAge(pair) { var ref = _rcLastPx[pair]; return ref ? (Date.now() - ref.ts) : Infinity; }'));
  assert.ok(codeStrict(s10i).includes('var GAIN_MIN_ACTED = 4;') && (codeStrict(s10i).match(/best\.acted < GAIN_MIN_ACTED/g) || []).length === 2);
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
