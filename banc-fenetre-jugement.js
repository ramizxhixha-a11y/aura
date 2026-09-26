// banc-fenetre-jugement.js — [FENÊTRE APPRENANTE · 26/09/2026] VERSION 20260926f
// La fenêtre de jugement de la fitness (60, constante du 16/09) devient apprise par rejeu exact des jugements gardés.
// Fonctions RÉELLES : 03 (_fitJudge / _fitWindow / _fitOf / _fitRecomputeAll), 10i (_fitWindowEval / _fitWindowRefresh) en vm,
// données synthétiques DÉTERMINISTES (xorshift, graine fixe).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s10i = rd('js/10i-intel-bus.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s11b = rd('js/11b-ecran-appris.js');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false);
const RULE = between(s10i, 'var FITW_GRID = [20, 40, 60, 100, 160, 240]', 'window._fitWindowEval = _fitWindowEval;', false);
const J = v => JSON.parse(JSON.stringify(v));
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
// agents synthétiques : pFn(i, t) = probabilité que l'agent i ait raison à l'événement t ; jugement {s, w, k = t+1}
function mkAgents(n, events, pFn, seed) {
  const r = rng(seed || 7);
  return Array.from({ length: n }, (_, i) => ({ id: 'a' + i, fitness: 350, _judgments: Array.from({ length: events }, (_, t) => ({ s: r() < pFn(i, t) ? 1 : -1, w: 0.5 + r(), k: t + 1 })) }));
}
function ctx(S) { const c = { S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date }; vm.createContext(c); vm.runInContext(JUDGE + '\n' + RULE, c); return c; }
console.log('▶ banc-fenetre-jugement');

T('D1 · _fitJudge RÉEL : garde 240 jugements (n° d\'événement k), juge sur la fenêtre EFFECTIVE (60 par défaut, celle de la règle si armée) ; _fitRecomputeAll recalcule tout le monde', () => {
  const S = { _realJudgments: 0, agents: [] }; const c = ctx(S); const a = { fitness: 350 }; c.a = a;
  for (let i = 0; i < 1000; i++) { S._realJudgments++; vm.runInContext('_fitJudge(a, 1, 0.7)', c); }
  assert.strictEqual(a.fitness, 1350); assert.strictEqual(a._judgments.length, 240); assert.strictEqual(a._judgments[239].k, 1000); assert.strictEqual(a._judgments[0].k, 761);
  // 100 erreurs puis 20 bonnes : fenêtre 60 → mélange ; fenêtre apprise 20 → 1 350
  const b = { fitness: 350 }; c.b = b;
  for (let i = 0; i < 100; i++) vm.runInContext('_fitJudge(b, -1, 1)', c); for (let i = 0; i < 20; i++) vm.runInContext('_fitJudge(b, 1, 1)', c);
  assert.strictEqual(b.fitness, 50, 'fenêtre 60 : 40 erreurs + 20 bonnes → 350 − 333 → plancher 50');
  S.fitWindowRule = { armed: true, window: 20 };
  assert.strictEqual(vm.runInContext('_fitWindow()', c), 20);
  S.agents = [a, b, { fitness: 999 }, { fitness: 500, _judgments: [{ s: 1, w: 1, k: 1 }] }];
  assert.strictEqual(vm.runInContext('_fitRecomputeAll()', c), 1, 'seul b change (a déjà à 1 350 ; sans jugements ou < 5 : intouchés)');
  assert.strictEqual(b.fitness, 1350);
  S.fitWindowRule = { armed: true, window: 9999 }; assert.strictEqual(vm.runInContext('_fitWindow()', c), 60, 'fenêtre hors bornes → défaut');
  S.fitWindowRule = { armed: false, window: 20 }; assert.strictEqual(vm.runInContext('_fitWindow()', c), 60, 'désarmée → défaut');
});
T('D2 · _fitWindowEval RÉEL : changement de régime (les bons deviennent mauvais à mi-parcours) → la fenêtre courte prédit mieux, armée avec marge et stabilité ; qualités stables → 60 n\'est pas battue de 5 points ; pile-ou-face → rien', () => {
  const c = ctx({});
  const flip = mkAgents(12, 200, (i, t) => ((i < 6) === (t < 100)) ? 0.8 : 0.2, 11);
  c.ag = flip; const r1 = J(vm.runInContext('_fitWindowEval(ag)', c));
  assert.strictEqual(r1.n, 200); assert.ok(r1.acc[20] > r1.acc[60] + 5 && r1.acc[60] > r1.acc[240], 'court > 60 > long : ' + JSON.stringify(r1.acc));
  assert.ok(r1.armed && (r1.window === 20 || r1.window === 40) && r1.best === r1.window, JSON.stringify(r1));
  const stable = mkAgents(12, 200, (i) => i < 6 ? 0.7 : 0.3, 5);
  c.ag = stable; const r2 = J(vm.runInContext('_fitWindowEval(ag)', c));
  assert.ok(Math.abs(r2.acc[240] - r2.acc[60]) < 5 && !r2.armed, 'qualités stables : toutes les fenêtres se valent, 60 reste : ' + JSON.stringify(r2));
  const coin = mkAgents(12, 200, () => 0.5, 3);
  c.ag = coin; const r3 = J(vm.runInContext('_fitWindowEval(ag)', c));
  assert.ok(!r3.armed && r3.window === 60, 'hasard : pas de règle : ' + JSON.stringify(r3));
});
T('D2b · preuve exigée : < 40 événements → rien ; < 8 agents par événement → l\'événement ne compte pas ; jugements sans k (anciens) ignorés ; meilleure seulement sur une moitié → pas armée', () => {
  const c = ctx({});
  c.ag = mkAgents(12, 39, (i, t) => ((i < 6) === (t < 20)) ? 0.9 : 0.1, 2); const r = J(vm.runInContext('_fitWindowEval(ag)', c));
  assert.ok(!r.armed && r.n === 39 && r.why === 'événements rejouables 39/40', JSON.stringify(r));
  c.ag = mkAgents(7, 200, (i, t) => ((i < 4) === (t < 100)) ? 0.9 : 0.1, 2); assert.strictEqual(J(vm.runInContext('_fitWindowEval(ag)', c)).n, 0, '7 agents < 8');
  const old = mkAgents(12, 200, () => 0.8, 2); old.forEach(a => a._judgments.forEach(e => { delete e.k; })); c.ag = old; assert.strictEqual(J(vm.runInContext('_fitWindowEval(ag)', c)).n, 0, 'sans k : rien à rejouer');
  // instable : 1re moitié = régimes qui basculent tous les 40 événements (le court gagne largement) ; 2e moitié = qualités fixes
  // avec des rafales corrélées de 5 erreurs tous les 40 (le court se laisse retourner par la rafale) → marge globale ≥ 5 MAIS
  // 2e moitié légèrement pire que 60 → veto de stabilité (graine 1, déterministe)
  const mixed = mkAgents(12, 400, (i, t) => t < 200 ? (((i < 6) === (Math.floor(t / 40) % 2 === 0)) ? 0.9 : 0.1) : (((t % 40) < 5) ? ((i < 6) ? 0.0 : 1.0) : ((i < 6) ? 0.85 : 0.15)), 1);
  c.ag = mixed; const r4 = J(vm.runInContext('_fitWindowEval(ag)', c));
  assert.ok(r4.n === 400 && r4.best === 20 && r4.acc[20] - r4.acc[60] >= 5, 'marge globale : ' + JSON.stringify(r4.acc));
  assert.ok(!r4.armed && r4.window === 60 && /instable/.test(r4.why) && r4.halves[20][0] > r4.halves[60][0] && r4.halves[20][1] < r4.halves[60][1], 'veto de stabilité : ' + JSON.stringify(r4));
});
T('D3 · _fitWindowRefresh RÉEL : arme (armedAt = n° du jugement courant, fitness recalculées, journal), conserve armedAt tant que la fenêtre est la même, désarme quand la preuve disparaît (journal)', () => {
  const S = { _realJudgments: 777, agents: mkAgents(12, 200, (i, t) => ((i < 6) === (t < 100)) ? 0.8 : 0.2, 11), chainLog: [] };
  const c = ctx(S); let recomputed = 0; c._fitRecomputeAll = () => { recomputed++; return 9; };
  const r = J(vm.runInContext('_fitWindowRefresh()', c));
  assert.ok(r.armed && S.fitWindowRule.armedAt === 777 && recomputed === 1, JSON.stringify(S.fitWindowRule));
  assert.ok(/^Fenêtre de jugement 60 → (20|40) · 200 événements rejoués \(\d+(\.\d)? % vs \d+(\.\d)? % pour 60\) · 9 fitness recalculées$/.test(S.chainLog[0].desc), S.chainLog[0].desc);
  S._realJudgments = 900; vm.runInContext('_fitWindowRefresh()', c);
  assert.strictEqual(S.fitWindowRule.armedAt, 777, 'même fenêtre : armedAt conservé'); assert.strictEqual(recomputed, 1, 'pas de recalcul sans changement');
  S.agents = mkAgents(12, 200, () => 0.5, 3); const r2 = J(vm.runInContext('_fitWindowRefresh()', c));
  assert.ok(!r2.armed && r2.armedAt === null && recomputed === 2 && /→ 60 · /.test(S.chainLog[1].desc), 'désarmée : ' + S.chainLog[1].desc);
});
T('S1 · textes : 03 (FIT_KEEP 240, k, rejeu avant l\'évolution), 09b1/09b2 (240, fitWindowRule, manifest, rejeu au boot après la fusion des agents), 11b (section), 10i (seuils)', () => {
  const c3 = codeStrict(s03), c1 = codeStrict(s9b1), c2 = codeStrict(s9b2), c11 = codeStrict(s11b), c10 = codeStrict(s10i);
  assert.ok(c3.includes('const FIT_KEEP = 240;') && c3.includes("k: (typeof S !== 'undefined' && S && Number(S._realJudgments)) || 0 });"));
  const iRef = c3.indexOf("try { if (typeof _fitWindowRefresh === 'function') _fitWindowRefresh(); } catch(e) {}"), iEvo = c3.indexOf('const sorted = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness);');
  assert.ok(iRef > 0 && iEvo > iRef, 'rejeu de la fenêtre avant le déclenchement de l\'évolution');
  assert.ok(c1.includes('_judgments:     (a._judgments     || []).slice(-240),') && c1.includes('fitWindowRule: S.fitWindowRule || null,'));
  assert.ok(c2.includes('a._judgments     = Array.isArray(sa._judgments) ? sa._judgments.slice(-240) : [];') && c2.includes("if (snap.fitWindowRule && typeof snap.fitWindowRule === 'object')         S.fitWindowRule     = snap.fitWindowRule;") && c2.includes("'gainRules','stopRules','fitWindowRule',"));
  const iMerge = c2.indexOf("a._probationUntil = sa._probationUntil || 0;"), iBoot = c2.indexOf("try { if (typeof _fitWindowRefresh === 'function') _fitWindowRefresh(); } catch(e) {}");
  assert.ok(iMerge > 0 && iBoot > iMerge, 'rejeu au boot APRÈS la fusion des agents (sinon jugements absents)');
  assert.ok(c11.includes("title('FENÊTRE DE JUGEMENT'") && c11.includes("'60 jugements (défaut)'"));
  assert.ok(c10.includes('var FITW_GRID = [20, 40, 60, 100, 160, 240], FITW_DEFAULT = 60, FITW_MIN_EVENTS = 40, FITW_MIN_MARGIN = 0.05, FITW_MIN_AGENTS = 8, FITW_MIN_N = 5;'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
