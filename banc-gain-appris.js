// banc-gain-appris.js — [GAIN APPRIS · 23/09/2026] VERSION 20260923a
// Garder ce que la position a touché : repères de rendu dans le chemin (grille m|f, posés au premier déclenchement),
// règle apprise par paire rejouée EXACTEMENT sur ses chemins, armée sur preuve, désarmée sinon. Fonctions RÉELLES de 10i.
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
const M = 60000, t0 = 1000000000000;
// fait vivre une position tick par tick à travers _pathRecord RÉEL ; retourne son chemin
function live(pctSeries, side) {
  const entry = 100, S = { pairStates: { 'A/USDT': { price: entry } }, openPositions: [{ pair: 'A/USDT', side: side || 'long', entryPrice: entry, openedAt: t0 }] };
  const c = ctx(S, t0); let now = t0;
  pctSeries.forEach(pct => { now += 30000; c.Date.now = () => now; S.pairStates['A/USDT'].price = side === 'short' ? entry * (1 - pct / 100) : entry * (1 + pct / 100); vm.runInContext('_pathRecord()', c); });
  return J(S.openPositions[0]._path);
}
console.log('▶ banc-gain-appris');
T('D1 · repères de rendu RÉELS : le pic est suivi tick par tick, le repère (m|f) est posé au premier instant où pic ≥ m ET P&L ≤ f × pic', () => {
  const P = live([0.1, 0.3, 0.55, 0.4, 0.2, 0.5, 0.7, 0.4, 0.1]);
  assert.strictEqual(P.mfe, 0.7);
  // (0,5|0,7) : pic 0,55 au 3e tick → seuil 0,385 ; 0,4 non, 0,2 oui → repère 0,2 (posé une fois : la remontée à 0,7 ne le change pas)
  assert.strictEqual(P.gb['0.5|0.7'], 0.2);
});
T('D1b · vérification pas à pas des repères', () => {
  const P = live([0.1, 0.3, 0.55, 0.4, 0.2, 0.5, 0.7, 0.4, 0.1]);
  // pics successifs : 0,1 / 0,3 / 0,55 / 0,55 / 0,55 / 0,55 / 0,7 / 0,7 / 0,7
  // m=0,2 f=0,5 : pic ≥ 0,2 dès 0,3 ; premier P&L ≤ 0,5×pic : à 0,2 (pic 0,55 → seuil 0,275) → repère 0,2
  assert.strictEqual(P.gb['0.2|0.5'], 0.2);
  // m=0,2 f=0,7 : seuil 0,7×0,55=0,385 → 0,4 non, 0,2 oui → 0,2 ; (au tick 0,3 : pic 0,3, seuil 0,21, 0,3 non)
  assert.strictEqual(P.gb['0.2|0.7'], 0.2);
  // m=0,5 f=0,3 : seuil 0,3×0,55=0,165 → jamais avant la fin ; à la fin pic 0,7 seuil 0,21 → 0,1 ≤ 0,21 → 0,1
  assert.strictEqual(P.gb['0.5|0.3'], 0.1);
  // m=0,8 : jamais atteint → aucun repère
  assert.strictEqual(P.gb['0.8|0.5'], undefined);
  // short : mêmes valeurs en miroir
  const Q = live([0.1, 0.3, 0.55, 0.4, 0.2, 0.5, 0.7, 0.4, 0.1], 'short');
  assert.strictEqual(Q.mfe, 0.7); assert.strictEqual(Q.gb['0.2|0.5'], 0.2);
  // une position qui ne monte jamais n'a pas de repères
  assert.deepStrictEqual(live([-0.1, -0.3, -0.2]).gb, undefined);
});
T('D2 · _gainEvalPair : rejeu exact, choisit la case au meilleur gain moyen, s\'arme sur ≥ 8 chemins, gain > 0 et mieux dans ≥ 60 % des cas ; rien sans preuve', () => {
  const c = ctx({}, 0);
  // 10 chemins : pic +0,5, final +0,0 ; la règle (0,3|0,5) aurait fermé à 0,25 → +0,25 par trade
  const mk = (fin, gb, mfe) => ({ pair: 'A/USDT', closedAt: 1, pnlPct: fin, path: { mfe: mfe, mae: -0.2, at: {}, gb: gb } });
  c.mem = []; for (let i = 0; i < 10; i++) c.mem.push(mk(0, { '0.2|0.5': 0.25, '0.3|0.5': 0.25, '0.2|0.3': 0.15, '0.3|0.3': 0.15, '0.2|0.7': 0.35, '0.3|0.7': 0.35, '0.5|0.3': 0.15, '0.5|0.5': 0.25, '0.5|0.7': 0.35 }, 0.5));
  const r = J(vm.runInContext("_gainEvalPair('A/USDT', mem)", c));
  assert.ok(r && r.f === 0.7 && Math.abs(r.gain - 0.35) < 1e-9 && r.n === 10 && r.better === 100, JSON.stringify(r));
  // 7 chemins → rien
  c.mem7 = c.mem.slice(0, 7); assert.strictEqual(vm.runInContext("_gainEvalPair('A/USDT', mem7)", c), null);
  // les trades finissaient mieux que le repère (final +0,6 > 0,35) → gain négatif → rien
  c.memB = []; for (let i = 0; i < 10; i++) c.memB.push(mk(0.6, { '0.2|0.5': 0.25, '0.2|0.7': 0.35 }, 0.7));
  assert.strictEqual(vm.runInContext("_gainEvalPair('A/USDT', memB)", c), null, 'la règle aurait coupé des gagnants : pas armée');
  // mieux seulement 50 % des fois → rien même si le gain moyen est positif
  c.memC = []; for (let i = 0; i < 10; i++) c.memC.push(mk(i < 5 ? -1 : 0.4, { '0.2|0.5': 0.3 }, 0.6));
  assert.strictEqual(vm.runInContext("_gainEvalPair('A/USDT', memC)", c), null, '50 % < 60 %');
  // sans repère (la règle n'aurait jamais agi) → rien
  c.memD = []; for (let i = 0; i < 10; i++) c.memD.push(mk(0.1, {}, 0.15));
  assert.strictEqual(vm.runInContext("_gainEvalPair('A/USDT', memD)", c), null);
  // autre paire ignorée, fenêtre 30
  c.memE = c.mem.concat([mk(-5, { '0.2|0.7': -4 }, 0.3)].map(x => Object.assign(x, { pair: 'B/USDT' })));
  assert.strictEqual(J(vm.runInContext("_gainEvalPair('A/USDT', memE)", c)).n, 10);
});
T('D3 · _gainRefresh / _gainExit : règle par paire, journal 🔒 à l\'armement et au désarmement ; sortie seulement si pic ≥ m ET P&L ≤ f × pic ; rien sans règle', () => {
  const mk = (fin, gb, mfe) => ({ pair: 'A/USDT', closedAt: 1, pnlPct: fin, path: { mfe: mfe, mae: 0, at: {}, gb: gb } });
  const S = { pairStates: { 'A/USDT': {}, 'B/USDT': {} }, tradeContextMemory: [], chainLog: [] };
  for (let i = 0; i < 9; i++) S.tradeContextMemory.push(mk(0, { '0.3|0.5': 0.25 }, 0.5));
  const c = ctx(S, 5);
  assert.strictEqual(vm.runInContext('_gainRefresh()', c), 1);
  assert.deepStrictEqual([S.gainRules['A/USDT'].m, S.gainRules['A/USDT'].f], [0.3, 0.5]); assert.strictEqual(S.gainRules['B/USDT'], undefined);
  assert.ok(S.chainLog[0].desc.startsWith('Gain appris · A/USDT · pic ≥ +0.3 % → garder 50 % du pic (9 chemins, +0.25 %/trade, mieux 100 % des fois)'), S.chainLog[0].desc);
  vm.runInContext('_gainRefresh()', c); assert.strictEqual(S.chainLog.length, 1, 'sans changement : pas de ligne');
  c.pos = { pair: 'A/USDT', _path: { mfe: 0.5 } };
  assert.strictEqual(vm.runInContext('_gainExit(pos, 0.3)', c), null, '0,3 > 0,25 : on tient');
  const r = J(vm.runInContext('_gainExit(pos, 0.25)', c)); assert.ok(r && r.why.startsWith('Gain appris · pic +0.50 % → sortie à 50 % du pic'), JSON.stringify(r));
  c.pos2 = { pair: 'A/USDT', _path: { mfe: 0.2 } }; assert.strictEqual(vm.runInContext('_gainExit(pos2, 0.05)', c), null, 'pic < m : pas armée');
  c.pos3 = { pair: 'B/USDT', _path: { mfe: 2 } }; assert.strictEqual(vm.runInContext('_gainExit(pos3, 0.1)', c), null, 'sans règle');
  c.pos4 = { pair: 'A/USDT' }; assert.strictEqual(vm.runInContext('_gainExit(pos4, -1)', c), null, 'sans chemin');
  for (let i = 0; i < 30; i++) S.tradeContextMemory.push(mk(0.6, { '0.3|0.5': 0.25 }, 0.7));   // les trades récents finissent mieux : désarmement
  vm.runInContext("_gainRefresh('A/USDT')", c);
  assert.strictEqual(S.gainRules['A/USDT'], undefined); assert.ok(S.chainLog[1].desc.startsWith('Gain désarmé · A/USDT'));
});
T('S1 · branchements : 10f ferme par _gainExit après l\'horizon et avant les niveaux (bot seulement, même entonnoir), 09d1 recalcule à la clôture, 09b1/09b2 + manifest + boot', () => {
  const cf = codeStrict(rd('js/10f-resolveur-cycle.js')), c9 = codeStrict(rd('js/09d1-paper-real-core.js')), c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js'));
  const sweep = cf.slice(cf.indexOf('window._botExitSweep = function _botExitSweep() {'));
  const iAuto = sweep.indexOf("if (!pos || pos.auto !== true) return;"), iHz = sweep.indexOf('_horizonExit(pos, pnlPct, Date.now())'), iGa = sweep.indexOf('_gainExit(pos, pnlPct)'), iLv = sweep.indexOf('var hasLv = isFinite(pos.sl)');
  assert.ok(iAuto > 0 && iHz > iAuto && iGa > iHz && iLv > iGa, 'ordre : bot → horizon → gain → niveaux');
  assert.ok(sweep.slice(iGa, iLv).includes("_closeCompleted(pos, 'bot ' + _ga.why)"));
  assert.ok(c9.includes("_gainRefresh(S.tradeContextMemory[i].pair);"));
  assert.ok(c1.includes('gainRules: S.gainRules || {},') && c2.includes('S.gainRules         = snap.gainRules;') && c2.includes("'gainRules'") && c2.includes('_gainRefresh();'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
