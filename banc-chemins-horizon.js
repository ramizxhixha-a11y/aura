// banc-chemins-horizon.js — [MÉMOIRE DES CHEMINS · 22/09/2026] VERSION 20260922a
// Apprendre du chemin, pas de la clôture : le battement enregistre le P&L de chaque position à ses jalons (pic, creux,
// 15/30/60/120/240 min) ; la règle d'horizon d'une paire ne s'arme que si ses propres chemins prouvent que fermer à H
// aurait rapporté ; elle se désarme seule. Fonctions RÉELLES de 10i en vm.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s10i = rd('js/10i-intel-bus.js');
const SRC = between(s10i, 'var PATH_MARKS = [15, 30, 60, 120, 240];', 'window._pathRecord = _pathRecord;', false);
const J = v => JSON.parse(JSON.stringify(v));
function ctx(S, now) { const c = { S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, nowStr: () => 'hh:mm', Date: { now: () => now } }; vm.createContext(c); vm.runInContext(SRC, c); return c; }
const M = 60000;
console.log('▶ banc-chemins-horizon');
T('D1 · _pathRecord : pic, creux, jalons posés UNE fois au premier tick qui les dépasse, long et short, entrées douteuses ignorées', () => {
  const t0 = 1000000000000;
  const S = { pairStates: { 'A/USDT': { price: 100 }, 'B/USDT': { price: 50 } }, openPositions: [ { pair: 'A/USDT', side: 'long', entryPrice: 100, openedAt: t0 }, { pair: 'B/USDT', side: 'short', entryPrice: 50, openedAt: t0 }, { pair: 'C/USDT', side: 'long', entryPrice: 1, openedAt: t0 }, null ] };
  const c = ctx(S, t0 + 1000);
  assert.strictEqual(vm.runInContext('_pathRecord()', c), 2, 'C sans prix et null ignorés');
  S.pairStates['A/USDT'].price = 101.2; S.pairStates['B/USDT'].price = 50.5;   // A +1,2 %, B −1 %
  c.Date.now = () => t0 + 16 * M; vm.runInContext('_pathRecord()', c);
  const strip = p => { const q = J(p); delete q.gb; return q; };   // [23/09] les repères de rendu (gb) sont testés dans banc-gain-appris
  const A = strip(S.openPositions[0]._path), B = strip(S.openPositions[1]._path);
  assert.deepStrictEqual(A, { mfe: 1.2, mae: 0, at: { 15: 1.2 } }); assert.deepStrictEqual(B, { mfe: 0, mae: -1, at: { 15: -1 } });
  S.pairStates['A/USDT'].price = 99; c.Date.now = () => t0 + 31 * M; vm.runInContext('_pathRecord()', c);
  const A2 = strip(S.openPositions[0]._path); assert.deepStrictEqual(A2, { mfe: 1.2, mae: -1, at: { 15: 1.2, 30: -1 } }, 'le jalon 15 ne bouge plus, le creux descend');
  c.Date.now = () => t0 + 300 * M; S.pairStates['A/USDT'].price = 100.3; vm.runInContext('_pathRecord()', c);
  assert.deepStrictEqual(Object.keys(J(S.openPositions[0]._path).at).sort((a, b) => a - b).map(Number), [15, 30, 60, 120, 240]);
  assert.strictEqual(J(S.openPositions[0]._path).at[60], 0.3, 'jalons manqués posés au tick courant');
});
T('D2 · _horizonEvalPair : s\'arme seulement avec ≥ 8 chemins négatifs à H, ≥ 60 % finissant pire, et un gain moyen ; le plus petit H qui prouve ; fenêtre 30 ; rien sans chemins', () => {
  const c = ctx({}, 0);
  const mk = (pair, atH, fin, H) => ({ pair, closedAt: 1, pnlPct: fin, path: { mfe: 0, mae: -2, at: Object.assign({}, H) } });
  // 10 trades négatifs à 120 min qui finissent pire (−0,5 → −1,8) : règle à 120
  const mem = []; for (let i = 0; i < 10; i++) mem.push(mk('A/USDT', -0.5, -1.8, { 60: 0.2, 120: -0.5, 240: -1.5 }));
  c.mem = mem; let r = J(vm.runInContext("_horizonEvalPair('A/USDT', mem)", c));
  assert.deepStrictEqual(r, { H: 120, n: 10, worse: 100, gain: 1.3 }, JSON.stringify(r));
  // à 60 ils étaient positifs → 60 ne s'arme pas ; 120 est le plus petit H qui prouve
  // 7 chemins seulement → rien
  c.mem7 = mem.slice(0, 7); assert.strictEqual(vm.runInContext("_horizonEvalPair('A/USDT', mem7)", c), null, 'n < 8 : rien');
  // finissent MIEUX (−0,5 → −0,1) → rien, même avec 10 chemins
  c.memB = []; for (let i = 0; i < 10; i++) c.memB.push(mk('A/USDT', -0.5, -0.1, { 120: -0.5 }));
  assert.strictEqual(vm.runInContext("_horizonEvalPair('A/USDT', memB)", c), null, 'ils remontent : pas de règle');
  // 50 % pire seulement → rien
  c.memC = []; for (let i = 0; i < 10; i++) c.memC.push(mk('A/USDT', -0.5, i < 5 ? -2 : -0.2, { 120: -0.5 }));
  assert.strictEqual(vm.runInContext("_horizonEvalPair('A/USDT', memC)", c), null, '50 % < 60 % : pas de règle');
  // autre paire, ou sans chemin → ignorés
  c.memD = mem.concat([mk('B/USDT', -1, -3, { 120: -1 }), { pair: 'A/USDT', closedAt: 1, pnlPct: -3 }]);
  assert.strictEqual(J(vm.runInContext("_horizonEvalPair('A/USDT', memD)", c)).n, 10, 'B et le trade sans chemin ne comptent pas');
  // fenêtre : 30 derniers seulement — 40 vieux « pires » puis 30 récents « mieux » → rien
  c.memE = []; for (let i = 0; i < 40; i++) c.memE.push(mk('A/USDT', -0.5, -2, { 120: -0.5 })); for (let i = 0; i < 30; i++) c.memE.push(mk('A/USDT', -0.5, -0.1, { 120: -0.5 }));
  assert.strictEqual(vm.runInContext("_horizonEvalPair('A/USDT', memE)", c), null, 'la règle se désarme quand les chemins récents ne prouvent plus');
  assert.strictEqual(vm.runInContext("_horizonEvalPair('A/USDT', [])", c), null);
});
T('D3 · _horizonRefresh : règles par paire dans S.horizonRules, journal ⏳ à l\'armement et au désarmement, pas de ligne sans changement', () => {
  const mk = (pair, atH, fin) => ({ pair, closedAt: 1, pnlPct: fin, path: { mfe: 0, mae: -2, at: { 120: atH } } });
  const S = { pairStates: { 'A/USDT': {}, 'B/USDT': {} }, tradeContextMemory: [], chainLog: [] };
  for (let i = 0; i < 9; i++) S.tradeContextMemory.push(mk('A/USDT', -0.4, -1.5));
  const c = ctx(S, 5);
  assert.strictEqual(vm.runInContext('_horizonRefresh()', c), 1);
  assert.strictEqual(S.horizonRules['A/USDT'].H, 120); assert.strictEqual(S.horizonRules['B/USDT'], undefined);
  assert.strictEqual(S.chainLog.length, 1); assert.ok(S.chainLog[0].desc.startsWith('Horizon appris · A/USDT · fermer si encore négative à 120 min (9 chemins, 100 % finissent pire'), S.chainLog[0].desc);
  vm.runInContext('_horizonRefresh()', c); assert.strictEqual(S.chainLog.length, 1, 'sans changement : pas de ligne');
  for (let i = 0; i < 30; i++) S.tradeContextMemory.push(mk('A/USDT', -0.4, -0.1));   // les chemins récents remontent
  vm.runInContext("_horizonRefresh('A/USDT')", c);
  assert.strictEqual(S.horizonRules['A/USDT'], undefined, 'désarmée'); assert.ok(S.chainLog[1].desc.startsWith('Horizon désarmé · A/USDT'));
});
T('D4 · _horizonExit : ferme seulement si règle armée ET position négative ET âge ≥ H ; jamais une gagnante, jamais avant H, jamais sans règle', () => {
  const S = { horizonRules: { 'A/USDT': { H: 120, n: 9, worse: 89, gain: 1.1 } } };
  const c = ctx(S, 0); const t0 = 1000000000000;
  c.pos = { pair: 'A/USDT', side: 'long', openedAt: t0 };
  assert.strictEqual(vm.runInContext(`_horizonExit(pos, -0.3, ${t0 + 119 * M})`, c), null, 'avant H');
  const r = J(vm.runInContext(`_horizonExit(pos, -0.3, ${t0 + 120 * M})`, c));
  assert.strictEqual(r.H, 120); assert.ok(r.why.startsWith('Horizon appris 120 min (9 chemins, 89 % finissent pire)'), r.why);
  assert.strictEqual(vm.runInContext(`_horizonExit(pos, 0.2, ${t0 + 500 * M})`, c), null, 'positive : jamais');
  assert.strictEqual(vm.runInContext(`_horizonExit(pos, 0, ${t0 + 500 * M})`, c), null, 'à zéro : pas négative');
  c.pos2 = { pair: 'B/USDT', side: 'long', openedAt: t0 };
  assert.strictEqual(vm.runInContext(`_horizonExit(pos2, -2, ${t0 + 500 * M})`, c), null, 'sans règle : rien');
  assert.strictEqual(vm.runInContext(`_horizonExit(null, -2, ${t0})`, c), null);
});
T('S1 · branchements : 08 enregistre le chemin AVANT le balayage, 02 → 09d1 gardent le chemin et recalculent la paire, 10f ferme par _horizonExit avant les niveaux (bot seulement), persistance + manifest + recalcul au boot', () => {
  const c08 = codeStrict(rd('js/08-learning-history-render.js')), c02 = codeStrict(rd('js/02-state-init.js')), c9 = codeStrict(rd('js/09d1-paper-real-core.js')), cf = codeStrict(rd('js/10f-resolveur-cycle.js')), c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js'));
  const iP = c08.indexOf('window._pathRecord()'), iS = c08.indexOf('window._botExitSweep()'); assert.ok(iP > 0 && iS > iP, 'chemin avant sorties');
  assert.ok(c02.includes('_enrichTradeContextOnClose(pos._contextId, realisedPct, realisedUsd, holdMs, pos._path);'));
  assert.ok(c9.includes('function _enrichTradeContextOnClose(contextId, pnlPct, pnlUsd, holdMs, path) {') && c9.includes('S.tradeContextMemory[i].path = { mfe: path.mfe, mae: path.mae, at: Object.assign({}, path.at || {}) };') && c9.includes('_horizonRefresh(S.tradeContextMemory[i].pair);'));
  const sweep = cf.slice(cf.indexOf('window._botExitSweep = function _botExitSweep() {'));
  const iAuto = sweep.indexOf("if (!pos || pos.auto !== true) return;"), iHz = sweep.indexOf('_horizonExit(pos, pnlPct, Date.now())'), iLv = sweep.indexOf('var hasLv = isFinite(pos.sl)');
  assert.ok(iAuto > 0 && iHz > iAuto && iLv > iHz, 'bot seulement, horizon avant les niveaux');
  assert.ok(sweep.slice(iHz, iLv).includes("_closeCompleted(pos, 'bot ' + _hz.why)"), 'même entonnoir de fermeture (1 essai / 60 s)');
  assert.ok(c1.includes('horizonRules: S.horizonRules || {},') && c2.includes('S.horizonRules      = snap.horizonRules;') && c2.includes("'horizonRules'") && c2.includes('_horizonRefresh();'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
