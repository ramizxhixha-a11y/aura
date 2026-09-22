// banc-stop-appris.js — [STOP APPRIS · 23/09/2026] VERSION 20260923b
// Le stop de la paire décidé par ses creux : rejeu exact (creux ≤ −d → le trade aurait fermé à −d), meilleure case de la
// grille, armé sur preuve (n ≥ 8, gain > 0, mieux ≥ 60 %, stable sur les deux moitiés), désarmé sinon ; s'ajoute au stop ATR.
// Fonctions RÉELLES de 10i ; épingles 10f / 09d1 / 09b1 / 09b2 / 10c.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s10i = rd('js/10i-intel-bus.js');
const SRC = between(s10i, 'var GAIN_WINDOW = 30, GAIN_MIN_N = 8, GAIN_MIN_BETTER = 0.6;', 'window._gainEvalPair = _gainEvalPair;', false).replace(/window\._stopEvalPair.*\n/, '');
const J = v => JSON.parse(JSON.stringify(v));
function ctx(S, now) { const c = { S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, nowStr: () => 'hh:mm', Date: { now: () => now }, GAIN_M: [0.2, 0.3, 0.5, 0.8], GAIN_F: [0.3, 0.5, 0.7] }; vm.createContext(c); vm.runInContext(SRC, c); return c; }
const mk = (fin, mae, pair) => ({ pair: pair || 'A/USDT', closedAt: 1, pnlPct: fin, path: { mfe: 0.1, mae: mae, at: {} } });
console.log('▶ banc-stop-appris');
T('D1 · rejeu EXACT : creux ≤ −d → aurait fermé à −d (mieux si le trade a fini plus bas, pire s\'il avait remonté) ; creux > −d → inchangé ; meilleure case ; armé à ≥ 8, gain > 0, mieux ≥ 60 %', () => {
  const c = ctx({}, 0);
  // 10 trades finis à −1,9 avec creux −1,9 : un stop à −0,8 aurait rapporté +1,1 chacun ; à −1,2 : +0,7 ; à −0,4 : +1,5 (meilleure)
  c.mem = []; for (let i = 0; i < 10; i++) c.mem.push(mk(-1.9, -1.9));
  let r = J(vm.runInContext("_stopEvalPair('A/USDT', mem)", c));
  assert.ok(r && r.d === 0.4 && Math.abs(r.gain - 1.5) < 1e-9 && r.better === 100 && r.n === 10, JSON.stringify(r));
  // trades qui creusent à −0,7 puis REMONTENT à +0,5 : un stop à −0,4 ou −0,6 les aurait coupés → gain négatif → rien
  c.memB = []; for (let i = 0; i < 10; i++) c.memB.push(mk(0.5, -0.7));
  assert.strictEqual(vm.runInContext("_stopEvalPair('A/USDT', memB)", c), null, 'couper des trades qui remontent : pas armé');
  // mélange : 5 perdants à −1,9 (creux −1,9) et 5 gagnants +0,5 avec creux −0,7 → à −0,8 : agit sur 5 (tous mieux : +1,1), gain moyen +0,55 ; à −0,4 : agit sur 10, 5 mieux 5 pire → 50 % → refusé ; le meilleur gain moyen ? −0,4 : 5×1,5 + 5×(−0,9) = +3,0 → 0,30 ; −0,8 : 5×1,1 = 5,5 → 0,55 → gagne
  c.memC = []; for (let i = 0; i < 5; i++) c.memC.push(mk(-1.9, -1.9)); for (let i = 0; i < 5; i++) c.memC.push(mk(0.5, -0.7));
  r = J(vm.runInContext("_stopEvalPair('A/USDT', memC)", c));
  assert.ok(r && r.d === 0.8 && Math.abs(r.gain - 0.55) < 1e-9 && r.acted === 5 && r.better === 100, JSON.stringify(r));
  // 7 chemins → rien ; sans creux atteint → rien
  c.mem7 = c.mem.slice(0, 7); assert.strictEqual(vm.runInContext("_stopEvalPair('A/USDT', mem7)", c), null);
  c.memD = []; for (let i = 0; i < 10; i++) c.memD.push(mk(0.2, -0.2)); assert.strictEqual(vm.runInContext("_stopEvalPair('A/USDT', memD)", c), null, 'la règle n\'aurait jamais agi');
  // autre paire ignorée
  c.memE = c.mem.concat([mk(-5, -5, 'B/USDT')]); assert.strictEqual(J(vm.runInContext("_stopEvalPair('A/USDT', memE)", c)).n, 10);
});
T('D2 · preuve STABLE : ≥ 16 chemins → la règle doit avoir rapporté sur les deux moitiés ; un épisode isolé ne suffit pas (gain et stop)', () => {
  const c = ctx({}, 0);
  // 16 chemins : les 8 premiers perdants à −1,9, les 8 derniers gagnants +0,5 avec creux −0,5 (un stop à −0,4 les couperait) :
  // globalement positif à −0,8 (agit seulement sur les 8 premiers), et stable ? moitié 2 : aucune action → somme 0 → PAS > 0 → refusé
  c.mem = []; for (let i = 0; i < 8; i++) c.mem.push(mk(-1.9, -1.9)); for (let i = 0; i < 8; i++) c.mem.push(mk(0.5, -0.5));
  assert.strictEqual(vm.runInContext("_stopEvalPair('A/USDT', mem)", c), null, 'la 2e moitié ne prouve rien : pas armé');
  // même chose mais des perdants dans les deux moitiés → armé
  c.mem2 = []; for (let i = 0; i < 16; i++) c.mem2.push(i % 2 === 0 ? mk(-1.9, -1.9) : mk(0.5, -0.5));
  const r = J(vm.runInContext("_stopEvalPair('A/USDT', mem2)", c)); assert.ok(r && r.d === 0.6 && Math.abs(r.gain - 0.65) < 1e-9, 'la case −0,6 ne touche pas les gagnants (creux −0,5) et coupe les perdants : ' + JSON.stringify(r));
  // _halfStable directement
  c.dl = [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]; assert.strictEqual(vm.runInContext('_halfStable(dl)', c), false);
  c.dl2 = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]; assert.strictEqual(vm.runInContext('_halfStable(dl2)', c), true);
  c.dl3 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; assert.strictEqual(vm.runInContext('_halfStable(dl3)', c), true, '< 16 : pas de test de stabilité');
  // le gain appris passe par le même test
  const mkg = (fin, gb) => ({ pair: 'A/USDT', closedAt: 1, pnlPct: fin, path: { mfe: 0.5, mae: 0, at: {}, gb: gb } });
  c.memG = []; for (let i = 0; i < 8; i++) c.memG.push(mkg(0, { '0.3|0.5': 0.25 })); for (let i = 0; i < 8; i++) c.memG.push(mkg(0.6, {}));
  assert.strictEqual(vm.runInContext("_gainEvalPair('A/USDT', memG)", c), null, 'gain appris : 2e moitié sans action → refusé');
});
T('D3 · _stopRefresh / _stopExit : règle par paire, journal 🛑 à l\'armement et au désarmement ; sortie seulement si P&L ≤ −d ; rien sans règle', () => {
  const S = { pairStates: { 'A/USDT': {}, 'B/USDT': {} }, tradeContextMemory: [], chainLog: [] };
  for (let i = 0; i < 9; i++) S.tradeContextMemory.push(mk(-1.9, -1.9));
  const c = ctx(S, 5);
  assert.strictEqual(vm.runInContext('_stopRefresh()', c), 1);
  assert.strictEqual(S.stopRules['A/USDT'].d, 0.4); assert.strictEqual(S.stopRules['B/USDT'], undefined);
  assert.ok(S.chainLog[0].desc.startsWith('Stop appris · A/USDT · fermer à −0.4 % (9 chemins, +1.5 %/trade, mieux 100 % des fois)'), S.chainLog[0].desc);
  vm.runInContext('_stopRefresh()', c); assert.strictEqual(S.chainLog.length, 1);
  c.pos = { pair: 'A/USDT' };
  assert.strictEqual(vm.runInContext('_stopExit(pos, -0.39)', c), null); const r = J(vm.runInContext('_stopExit(pos, -0.4)', c)); assert.ok(r && r.why.startsWith('Stop appris −0.4 % (9 chemins)'), JSON.stringify(r));
  assert.strictEqual(vm.runInContext('_stopExit({ pair: "B/USDT" }, -5)', c), null, 'sans règle');
  for (let i = 0; i < 30; i++) S.tradeContextMemory.push(mk(0.5, -0.7));   // récents : ils remontent → désarmé
  vm.runInContext("_stopRefresh('A/USDT')", c);
  assert.strictEqual(S.stopRules['A/USDT'], undefined); assert.ok(S.chainLog[1].desc.startsWith('Stop désarmé · A/USDT'));
});
T('S1 · branchements : 10f ferme par _stopExit après le gain et avant les niveaux (même entonnoir), 09d1 recalcule, 09b1/09b2 + manifest + boot ; 10c garde l\'état des sources à l\'ouverture', () => {
  const cf = codeStrict(rd('js/10f-resolveur-cycle.js')), c9 = codeStrict(rd('js/09d1-paper-real-core.js')), c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js')), c10c = codeStrict(rd('js/10c-profil-ab-contexte.js'));
  const sweep = cf.slice(cf.indexOf('window._botExitSweep = function _botExitSweep() {'));
  const iGa = sweep.indexOf('_gainExit(pos, pnlPct)'), iSt = sweep.indexOf('_stopExit(pos, pnlPct)'), iLv = sweep.indexOf('var hasLv = isFinite(pos.sl)');
  assert.ok(iGa > 0 && iSt > iGa && iLv > iSt, 'ordre : gain → stop → niveaux'); assert.ok(sweep.slice(iSt, iLv).includes("_closeCompleted(pos, 'bot ' + _st.why)"));
  assert.ok(c9.includes("_stopRefresh(S.tradeContextMemory[i].pair);"));
  assert.ok(c1.includes('stopRules: S.stopRules || {},') && c2.includes('S.stopRules         = snap.stopRules;') && c2.includes("'stopRules'") && c2.includes('_stopRefresh();'));
  assert.ok(c10c.includes("sources: (typeof _intelRead === 'function') ? (_intelRead(pair) || null) : null"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
