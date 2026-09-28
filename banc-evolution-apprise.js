// banc-evolution-apprise.js — [ÉVOLUTION APPRISE · 28/09/2026] VERSION 20260928c
// Rams (28/09 15:41, « OK go ») sur ma proposition : apprendre les seuils d'évolution (150 / 300 / 400, tous les 15 cycles, posés à la main) sur ce
// que les évolutions ont réellement rapporté — l'essai « nouveau génome contre ancien » juge déjà chaque évolution ; rejoué avant livraison.
// Fonctions RÉELLES de 03 en vm (preuve du seuil _thEval, essai de l'Évolueur, moteur de la règle), déclencheurs RÉELS de 03 et 08 (tranches),
// triggerEvolution RÉEL de 07 (comme banc-masque), panneau RÉEL de 11b ; textes 09b1 / 09b2.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = x => JSON.parse(JSON.stringify(x));
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s11 = rd('js/11b-ecran-appris.js');
const TH = between(s03, 'var TH_MIN_N = 30,', 'function _thState()', false), THEVAL = between(s03, 'function _thEval(obs) {', 'function _thEvalH(', false);
const FIT = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false), TRIAL = between(s03, 'var EVO_TRIAL_N = 30', 'window._evoTrialStart = _evoTrialStart;', false);
const RULE = between(s03, 'var EVO_BLOCK_MS = 4 * 3600000', 'window._evoRuleState = _evoRuleState;', false);
const TRIG03 = between(s03, '  const sorted = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness);', "    triggerEvolution(wC, { trig: 'C' });  // amélioration continue des agents en retard\n  }", true);
const TRIG08 = between(s08, '        const _GRACE = 60;', "        if(_stagnant && tick % 24 === 0) triggerEvolution(_stagnant, { trig: 'E' });", true);
const EVOLVE_NOW = between(s03, 'function _evolveBrokenNow(silent) {', '\nwindow._evolveBrokenNow = _evolveBrokenNow;', false);
const H4 = 4 * 3600000, NOW = 1790000000000;
function mk(o) {
  o = o || {};
  const S = Object.assign({ agents: [], chainLog: [], pairStates: {}, cycle: 0, evoTrials: {}, _realJudgments: 0 }, o.S || {});
  // une vraie Date (le journal date la fin de preuve : new Date(...).toLocaleString) dont l'horloge est celle du banc
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, __now: o.now || NOW, nowStr: () => '12:00:00' };
  c.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [c.__now])); } static now() { return c.__now; } };
  vm.createContext(c); vm.runInContext(TH + '\n' + THEVAL + '\n' + FIT + '\nwindow._fitJudge = _fitJudge;\n' + TRIAL + '\n' + RULE, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
// observations synthétiques : n évolutions espacées de step ms, fitness F, écart d (fonction ou constante)
const gen = (n, F, d, step, t0) => Array.from({ length: n }, (_, i) => { const t = (t0 || NOW - n * (step || H4)) + i * (step || H4); const dd = typeof d === 'function' ? d(i) : d; return [Math.round(t / 1000), F, Math.round(dd * 10000), 30, 'A', 0, 's' + i]; });
console.log('▶ banc-evolution-apprise');

T('M1 · _evoRuleEval (pur, _thEval RÉEL) : gain prouvé sous un niveau ; nuisance prouvée ; les deux à la fois (plancher nuisible, au-dessus bénéfique) ; rien sous 30 évolutions ou 20 créneaux ; le niveau est une fitness (≤)', () => {
  const t = mk();
  const ev = obs => J(t.run('_evoRuleEval(' + JSON.stringify(obs) + ')'));
  let r = ev(gen(40, 50, i => 0.3 + (i % 3) * 0.01)); assert.ok(r.gain && r.gain.level === 50 && r.harm === null && r.gain.n === 40 && r.gain.blocks === 40 && r.gain.mean > 0.3, 'gain : ' + JSON.stringify(r.gain));
  r = ev(gen(40, 50, i => -0.3 - (i % 3) * 0.01)); assert.ok(r.gain === null && r.harm && r.harm.level === 50 && r.harm.mean < -0.3, 'nuisance : ' + JSON.stringify(r.harm));
  // plancher nuisible (50 T$ : −0,3), au-dessus bénéfique (200 T$ : +0,9) → la queue « toutes » (≤ 200) est prouvée en gain, la queue du plancher en nuisance
  const mix = Array.from({ length: 80 }, (_, i) => { const t = NOW - 80 * H4 + i * H4, lo = i % 2 === 0; return [Math.round(t / 1000), lo ? 50 : 200, Math.round((lo ? -0.3 - (i % 3) * 0.01 : 0.9 + (i % 3) * 0.01) * 10000), 30, 'A', 0, 's' + i]; });   // créneaux alternés (deux populations mêlées dans le temps)
  r = ev(mix); assert.ok(r.gain && r.gain.level === 200 && r.harm && r.harm.level === 50, 'les deux : ' + JSON.stringify([r.gain, r.harm]));
  assert.ok(Math.abs(r.gain.mean - 0.3) < 0.02 && r.gain.n === 80 && Math.abs(r.harm.mean + 0.31) < 0.02 && r.harm.n === 40, JSON.stringify([r.gain, r.harm]));
  // les mêmes deux populations, mais l'une après l'autre dans le temps : les créneaux voisins se ressemblent (recouvrement compté) → la preuve de gain sur « toutes » ne tient pas
  const seq = gen(40, 50, i => -0.3 - (i % 3) * 0.01, H4, NOW - 80 * H4).concat(gen(40, 200, i => 0.9 + (i % 3) * 0.01, H4, NOW - 40 * H4));
  r = ev(seq); assert.ok(r.gain === null && r.harm && r.harm.level === 50, 'populations successives : l\'autocorrélation des créneaux retient la preuve de gain, la nuisance du plancher (constante) reste prouvée');
  r = ev(gen(29, 50, 0.3)); assert.ok(r.gain === null && r.harm === null && r.near === null && r.n === 29, '29 évolutions : rien (aucune queue n\'atteint 30)');
  r = ev(gen(40, 50, 0.3, 3600000)); assert.ok(r.gain === null, '40 évolutions en 10 créneaux : rien (≥ 20 créneaux)');
  r = ev(gen(40, 50, i => (i % 2 ? 0.3 : -0.3))); assert.ok(r.gain === null && r.harm === null && Math.abs(r.near.mean) < 1e-9, 'moyenne nulle : rien');
  r = ev([]); assert.deepStrictEqual(r, { gain: null, harm: null, near: null, nearH: null, n: 0 });
  r = ev([[1, 50, 100, 30, 'A', 0, 'x'], 'abîmée', [2, 'abc', 5, 1, 'A', 0, 'y'], null]); assert.strictEqual(r.n, 1, 'observations abîmées ignorées');
});

T('M2 · _evoOk / _evoLevels : sans observation → le nombre posé à la main de chaque déclencheur (150, aucun, 300, 400) ; gain prouvé → fitness ≤ F* et rien au-dessus ; nuisance prouvée → plus de siège ≤ H* ; les deux ; la règle est rejugée au plus tard un créneau après (une preuve ne survit pas à ses données : purge à 5 jours)', () => {
  const t = mk(); const ok = (f, d) => t.run('_evoOk({ fitness: ' + f + ' }, ' + d + ')');
  assert.deepStrictEqual([ok(100, 150), ok(150, 150), ok(299, 300), ok(300, 300), ok(1000, Infinity)], [true, false, true, false, true], 'repli : les nombres d\'avant, tels quels (<)');
  assert.strictEqual(t.run('_evoLevels()'), null);
  t.S.evoRule = { obs: gen(40, 50, 0.3), rule: null, since: 1 };   // 40 observations de 4 h : la fenêtre (5 jours = 30 créneaux) en garde 30
  assert.deepStrictEqual(J(t.run('_evoLevels()')), { gain: 50, harm: null }); assert.strictEqual(t.S.evoRule.obs.length, 30, 'purge : 5 jours'); assert.deepStrictEqual([ok(50, 150), ok(51, 150), ok(100, Infinity), ok(50, Infinity), ok(200, 300), ok(350, 300), ok(50, 0)], [true, true, true, true, true, false, true], 'gain à 50 : le plancher est recyclable quel que soit le déclencheur ; au-dessus, les nombres d\'avant restent');
  const L1 = t.S.chainLog.length; assert.ok(/^Évolution apprise · recycler un siège aide en dessous de 50 T\$ \(écart nouveau − ancien génome \+0,300 ± 0,000 par évolution, 30 évolutions, 30 créneaux\) : tout siège ≤ 50 T\$ est recyclable tout de suite ; au-dessus, les nombres posés à la main restent$/.test(t.S.chainLog[L1 - 1].desc), t.S.chainLog[L1 - 1].desc);
  t.S.evoRule = { obs: gen(30, 269, 0.3), rule: null, since: 1 }; assert.deepStrictEqual(J(t.run('_evoLevels()')), { gain: 269, harm: null }); assert.deepStrictEqual([ok(200, 150), ok(269, Infinity), ok(270, 300), ok(300, 300)], [true, true, true, false], 'gain à 269 : étend le 150 et le 300 jusqu\'à 269');
  t.S.evoRule = { obs: gen(30, 50, -0.3), rule: null, since: 1 };
  assert.deepStrictEqual(J(t.run('_evoLevels()')), { gain: null, harm: 50 }); assert.deepStrictEqual([ok(50, 150), ok(51, 150), ok(50, Infinity), ok(100, 300)], [false, true, false, true], 'nuisance à 50 : le plancher n\'est plus recyclé, au-dessus les nombres d\'avant');
  assert.ok(/recycler un siège à 50 T\$ ou moins est prouvé nuisible \(-0,300 ± 0,000, 30 évolutions, 30 créneaux\) : plus d'évolution automatique de ces sièges tant que la preuve tient — au plus jusqu'au \d\d\/\d\d \d\d:\d\d sans nouvelle observation \(les manuelles restent\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  assert.ok(t.S.evoRule.rule.oldest === t.S.evoRule.obs[0][0] * 1000 && t.S.evoRule.rule.nearH && t.S.evoRule.rule.nearH.level === 50, 'la plus vieille observation datée ; la queue la plus proche côté nuisance rendue');
  t.S.evoRule = { obs: Array.from({ length: 60 }, (_, i) => { const tt = NOW - 60 * H4 / 2 + i * H4 / 2, lo = i % 2 === 0; return [Math.round(tt / 1000), lo ? 50 : 200, Math.round((lo ? -0.3 : 0.9) * 10000), 30, 'A', 0, 's' + i]; }), rule: null, since: 1 };   // mêlées : deux par créneau
  assert.deepStrictEqual(J(t.run('_evoLevels()')), { gain: 200, harm: 50 }); assert.deepStrictEqual([ok(50, 150), ok(120, 150), ok(200, Infinity), ok(201, Infinity), ok(201, 150)], [false, true, true, true, false], 'nuisance dedans, gain dehors : le plancher protégé, 51-200 recyclables, au-dessus le repli');
  // gain dedans (50 : +0,3), nuisance dehors (« toutes » ≤ 200 : le 200 T$ à −0,9) : la preuve la plus intérieure décide
  t.S.evoRule = { obs: Array.from({ length: 60 }, (_, i) => { const tt = NOW - 60 * H4 / 2 + i * H4 / 2, lo = i % 2 === 0; return [Math.round(tt / 1000), lo ? 50 : 200, Math.round((lo ? 0.3 : -0.9) * 10000), 30, 'A', 0, 's' + i]; }), rule: null, since: 1 };
  assert.deepStrictEqual(J(t.run('_evoLevels()')), { gain: 50, harm: 200 }); assert.deepStrictEqual([ok(50, 150), ok(120, 150), ok(200, Infinity), ok(300, 150), ok(300, Infinity)], [true, false, false, false, true], 'gain dedans, nuisance dehors : le plancher recyclé, 51-200 protégés, au-dessus le repli');
  assert.deepStrictEqual([t.run('_evoOk({ fitness: NaN }, 150)'), t.run('_evoOk({}, 150)'), t.run('_evoOk(null, 150)')], [false, false, false], 'fitness non finie : non (comme avant)');
  // une preuve ne survit pas à ses données : le temps passe (6 jours), la règle est rejugée au plus tard un créneau après → observations purgées → rien
  const n0 = t.S.chainLog.length; t.c.__now = NOW + 6 * 86400000; assert.deepStrictEqual([ok(50, 150), ok(100, 150)], [true, true], 'rejugée : plus d\'observation dans la fenêtre → les nombres d\'avant'); assert.strictEqual(t.S.evoRule.obs.length, 0);
  assert.ok(/le gain n'est plus prouvé : les nombres posés à la main reprennent ; la nuisance n'est plus prouvée : ces sièges redeviennent recyclables$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc); assert.strictEqual(t.S.chainLog.length, n0 + 1);
  // dans le créneau : pas de recalcul (la règle en place sert)
  t.c.__now = NOW; t.S.evoRule = { obs: gen(30, 50, 0.3), rule: null, since: 1 }; t.run('_evoLevels()'); t.S.evoRule.obs = gen(10, 50, 0.3); t.c.__now = NOW + H4 - 1; assert.deepStrictEqual(J(t.run('_evoLevels()')), { gain: 50, harm: null }, 'moins d\'un créneau : la règle en place'); t.c.__now = NOW + H4 + 1; assert.strictEqual(t.run('_evoLevels()'), null, 'un créneau passé : rejugée (10 observations : rien)');
  // cap : 2 000 observations
  t.S.evoRule = { obs: gen(2100, 50, 0.3, 60000), rule: null, since: 1 }; t.c.__now = NOW; t.run('_evoRuleRefresh()'); assert.strictEqual(t.S.evoRule.obs.length, 2000);
});

T('M3 · essai RÉEL → observation : l\'essai reçoit la fitness à l\'évolution, le déclencheur et « manuelle » ; à sa conclusion (≥ 10 événements) une observation [t, fitness, écart × 10000, n, déclencheur, manuelle, siège] entre dans S.evoRule.obs, écart brut (même « non concluant ») ; essai abandonné (< 10) → rien ; ligne journal de l\'essai enrichie', () => {
  const t = mk({ S: { agents: [{ id: 'x', fitness: 61.7, _judgments: [] }, { id: 'm', isMeta: true, fitness: 350, _judgments: [], streak: 0 }], pairStates: { 'BTC/USDT': {} } } });
  t.run("_evoTrialStart('x', { g: 1 }, { name: 'Hybrid Gen-9', gen: 9, prev: 'Old', fit: 61.7, trig: 'A', man: false })");
  const tr = t.S.evoTrials.x; assert.deepStrictEqual([tr.fit, tr.trig, tr.man, tr.seat, tr.t], [61.7, 'A', false, 'x', NOW]);
  const feed = (vn, vo, won, k) => { for (let i = 0; i < k; i++) { t.S.pairStates['BTC/USDT'].roster = { shadow: { x: vo } }; t.c.__a = t.S.agents[0]; t.run('_evoTrialJudge(__a, "BTC/USDT", ' + won + ', 3, 1, ' + vn + ')'); } };
  t.c.__now = NOW + 50 * 60000; feed(0.5, 0.5, true, 20); feed(0.5, -0.5, true, 10);   // nouveau juste 30/30, ancien juste 20/30 → eNew = 1, eOld = 1/3 → d = +0,667
  assert.strictEqual(t.S.evoTrials.x, undefined, 'conclu à 30'); const o = t.S.evoRule.obs; assert.strictEqual(o.length, 1);
  assert.deepStrictEqual(J(o[0].slice(0, 2).concat(o[0].slice(3))), [NOW / 1000, 62, 30, 'A', 0, 'x'], JSON.stringify(o[0])); assert.ok(Math.abs(o[0][2] / 10000 - 2 / 3) < 0.001, 'écart brut nouveau − ancien : ' + o[0][2]);
  assert.strictEqual(t.S.evoRule.since, NOW); assert.ok(t.S.evoRule.rule && t.S.evoRule.rule.n === 1 && !t.S.evoRule.rule.gain, 'règle rejugée : 1 observation, rien de prouvé');
  const row = t.S.evoMerit.recent[0]; assert.deepStrictEqual([row.verdict, row.fit, row.trig], ['amélioration', 61.7, 'A']);
  // non concluant : l'écart brut entre quand même ; manuelle ; abandonné : rien
  t.S.agents.push({ id: 'y', fitness: 50, _judgments: [] }); t.run("_evoTrialStart('y', { g: 1 }, { name: 'G', fit: 50, trig: 'M', man: true })");
  const feedY = (vn, vo, won, k) => { for (let i = 0; i < k; i++) { t.S.pairStates['BTC/USDT'].roster = { shadow: { y: vo } }; t.c.__a = t.S.agents[2]; t.run('_evoTrialJudge(__a, "BTC/USDT", ' + won + ', 3, 1, ' + vn + ')'); } };
  feedY(0.5, 0.5, true, 28); feedY(0.5, -0.5, true, 1); feedY(0.5, 0.5, true, 1);   // nouveau 30/30 justes, ancien 29/30 → d = 1 − 28/30 = +0,0667 : « non concluant » (< 0,1) mais l'écart brut compte
  assert.strictEqual(t.S.evoRule.obs.length, 2); assert.deepStrictEqual(J(t.S.evoRule.obs[1].slice(1)), [50, 667, 30, 'M', 1, 'y'], 'non concluant (écart +0,067 brut, pas 0), manuelle'); assert.strictEqual(t.S.evoMerit.recent[1].verdict, 'non concluant');
  // essai ouvert AVANT cette version (sans fitness à l'évolution) : pas d'observation
  t.S.agents.push({ id: 'z', fitness: 50, _judgments: [] }); t.run("_evoTrialStart('z', { g: 1 }, { name: 'Ancien' })"); for (let i = 0; i < 30; i++) { t.S.pairStates['BTC/USDT'].roster = { shadow: { z: 0.5 } }; t.c.__a = t.S.agents[3]; t.run('_evoTrialJudge(__a, "BTC/USDT", true, 3, 1, 0.5)'); }
  assert.strictEqual(t.S.evoTrials.z, undefined); assert.strictEqual(t.S.evoRule.obs.length, 2, 'essai d\'avant : conclu, pas d\'observation');
  t.run("_evoTrialStart('y', { g: 2 }, { name: 'G2', fit: 350, trig: 'B' })"); feedY(0.5, 0.5, true, 5); t.run("_evoTrialConclude('y', 'interrompu')"); assert.strictEqual(t.S.evoRule.obs.length, 2, 'abandonné (5 événements) : pas d\'observation');
  // sans le moteur (bloc essai seul, comme banc-merite-evolueur) : l'essai conclut comme avant
  const c2 = { S: { agents: [{ id: 'x', fitness: 50, _judgments: [] }], pairStates: { 'BTC/USDT': { roster: { shadow: { x: 0.5 } } } }, evoTrials: {}, chainLog: [] }, Math, Number, Object, Array, JSON, Date, isFinite, String, window: {} };
  vm.createContext(c2); vm.runInContext(TRIAL + "\n_evoTrialStart('x', { g: 1 }, { name: 'G', fit: 50, trig: 'A' }); for (let i = 0; i < 30; i++) _evoTrialJudge(S.agents[0], 'BTC/USDT', true, 3, 1, 0.5);", c2);
  assert.strictEqual(c2.S.evoTrials.x, undefined); assert.strictEqual(c2.S.evoRule, undefined, 'pas de moteur : pas d\'observation, pas d\'erreur');
});

T('M4 · déclencheurs RÉELS (tranches de 03 et 08) : sans règle → 150 / tous les 15 cycles / 300 tous les 8 (03), 300 et stagnation 400 (Home), déclencheur transmis ; gain prouvé à 50 → le plancher seulement ; nuisance prouvée → plus rien pour ces sièges ; tranche de 08 sans _evoOk → les nombres d\'avant', () => {
  const t = mk(); const calls = []; t.c.triggerEvolution = (a, o) => calls.push([a.id, o && o.trig]);
  const run03 = (agents, cycle) => { calls.length = 0; t.S.agents = agents; t.S.cycle = cycle; t.run('{\n' + TRIG03 + '\n}'); return calls.slice(); };
  const A = (id, f, s) => ({ id, fitness: f, score: s === undefined ? 0.5 : s });
  assert.deepStrictEqual(run03([A('w', 100), A('h', 800)], 7), [['w', 'A']], '< 150 : tout de suite');
  assert.deepStrictEqual(run03([A('w', 200), A('h', 800)], 30), [['w', 'B']], 'tous les 15 cycles, quel que soit le niveau');
  assert.deepStrictEqual(run03([A('w', 200), A('h', 800)], 16), [['w', 'C']], '< 300 tous les 8');
  assert.deepStrictEqual(run03([A('w', 200), A('h', 800)], 17), [], 'sinon rien'); assert.deepStrictEqual(run03([A('w', 400), A('h', 800)], 16), [], '≥ 300 : pas le « tous les 8 »');
  assert.deepStrictEqual(run03([{ id: 'b', isBot: true, fitness: 10 }, A('w', 100)], 7), [['w', 'A']], 'bots ignorés');
  t.S.evoRule = { obs: gen(40, 50, 0.3), rule: null, since: 1 };   // gain prouvé au plancher : étend, ne retire rien
  assert.deepStrictEqual(run03([A('w', 100), A('h', 800)], 30), [['w', 'A']], 'gain à 50 : un siège à 100 reste recyclé par le 150 d\'avant');
  assert.deepStrictEqual(run03([A('w', 50), A('h', 800)], 7), [['w', 'A']], 'le plancher : tout de suite');
  t.S.evoRule = { obs: gen(30, 269, 0.3), rule: null, since: 1 }; assert.deepStrictEqual(run03([A('w', 260), A('h', 800)], 7), [['w', 'A']], 'gain à 269 : un siège à 260 est recyclé tout de suite (avant : au 8e cycle seulement)');
  t.S.evoRule = { obs: gen(40, 50, -0.3), rule: null, since: 1 };   // nuisance prouvée au plancher : le plus faible RECYCLABLE
  assert.deepStrictEqual(run03([A('w', 50), A('h', 800)], 7), [], 'nuisance : le plancher n\'est plus recyclé, personne d\'autre sous 150');
  assert.deepStrictEqual(run03([A('w', 50), A('h', 800)], 30), [['h', 'B']], 'au 15e cycle : le plus faible recyclable (800) — le plancher protégé n\'éteint pas l\'évolution');
  assert.deepStrictEqual(run03([A('w', 50), A('m', 120), A('h', 800)], 7), [['m', 'A']], 'le premier recyclable sous 150 : 120');
  // manuel (« Faire évoluer maintenant ») : jamais retenu par la règle
  t.c.__manual = []; t.c.triggerEvolution = (a, o) => { t.c.__manual.push([a.id, o && o.trig, !!(o && o.manual)]); t.S._genCount = (t.S._genCount || 0) + 1; }; t.S.agents = [A('w', 50), A('h', 800)]; t.run(EVOLVE_NOW + '\n_evolveBrokenNow(true)');
  assert.deepStrictEqual(t.c.__manual, [['w', 'M', true]], 'manuel : le plancher évolue quand même sous nuisance prouvée'); t.c.triggerEvolution = (a, o) => calls.push([a.id, o && o.trig]);
  // 08 (page Home) : grâce 60 cycles, plus faible évoluable < 300 toutes les 8 s, stagnation < 400 toutes les 24 s
  const run08 = (agents, tick, cycle) => { calls.length = 0; t.S.agents = agents; t.S.cycle = cycle === undefined ? 1000 : cycle; t.c.tick = tick; t.run('{\n' + TRIG08 + '\n}'); return calls.slice(); };   // tranche RÉELLE avec _GRACE / _evolvable
  t.S.evoRule = null;
  assert.deepStrictEqual(run08([A('w', 250), A('h', 800)], 8), [['w', 'D']], 'Home : < 300'); assert.deepStrictEqual(run08([A('w', 350), A('h', 800)], 8), [], '≥ 300 : rien');
  assert.deepStrictEqual(run08([A('w', 350, 0.01), A('h', 800)], 24), [['w', 'E']], 'stagnation : score plat et < 400'); assert.deepStrictEqual(run08([A('w', 450, 0.01), A('h', 800)], 24), [], 'stagnation ≥ 400 : rien');
  assert.deepStrictEqual(run08([Object.assign(A('w', 100), { _bornCycle: 990 }), A('h', 800)], 8), [], 'période de grâce (60 cycles) : inchangée');
  t.S.evoRule = { obs: gen(40, 50, 0.3), rule: null, since: 1 }; assert.deepStrictEqual(run08([A('w', 250), A('h', 800)], 8), [['w', 'D']], 'gain à 50 : 250 reste recyclé par le 300 d\'avant'); assert.deepStrictEqual(run08([A('w', 50), A('h', 800)], 8), [['w', 'D']]);
  t.S.evoRule = { obs: gen(30, 450, 0.3), rule: null, since: 1 }; assert.deepStrictEqual(run08([A('w', 440), A('h', 800)], 8), [['w', 'D']], 'gain à 450 : étend le 300'); assert.deepStrictEqual(run08([A('w', 440, 0.01), A('h', 800)], 24), [['w', 'D'], ['w', 'E']], 'et le 400 de la stagnation (au tick 24, D passe aussi : dans l\'app le délai d\'1 h retient la seconde)');
  t.S.evoRule = { obs: gen(40, 50, -0.3), rule: null, since: 1 }; assert.deepStrictEqual(run08([A('w', 50), A('h', 800)], 8), [], 'nuisance : plus le plancher, personne d\'autre sous 300'); assert.deepStrictEqual(run08([A('w', 50), A('m', 200), A('h', 800)], 8), [['m', 'D']], 'le plus faible recyclable : 200');
  // sans _evoOk (03 absent) : la tranche de 08 retombe sur ses nombres
  const c2 = { S: { agents: [A('w', 250), A('h', 800)], cycle: 1000 }, tick: 8, Math, Number, Object, Array, triggerEvolution: (a, o) => c2.calls.push([a.id, o.trig]), calls: [] };
  vm.createContext(c2); vm.runInContext('{\n' + TRIG08 + '\n}', c2); assert.deepStrictEqual(c2.calls, [['w', 'D']]);
});

T('M5 · triggerEvolution RÉEL (07, comme banc-masque) : l\'essai reçoit la fitness d\'AVANT la naissance, le déclencheur et « manuelle » ; _evolveBrokenNow transmet M', () => {
  const EVOLVE = between(s07, 'function triggerEvolution(weak, opts) {', 'buildAgentCards(); patchAgentCards();\n}', false) + '}';
  const S = { agents: [{ id: 'w', name: 'Weak', fitness: 61.7, score: 0.3, conf: 0.5, type: 'a·b', source: 'x/y', color: '#fff', _judgments: [], fitnessHistory: [] }, { id: 'p1', name: 'P1', fitness: 900, score: 0.2, conf: 0.6, type: 'a·b', source: 'x/y', color: '#0f0' }, { id: 'p2', name: 'P2', fitness: 700, score: -0.1, conf: 0.6, type: 'a·b', source: 'x/y', color: '#00f' }], evoLog: [], chainLog: [], cycle: 500, genome: {}, _genCount: 100 };
  const c = { S, Math, Number, Object, Array, JSON, Date, isFinite, String, Set, window: {}, console, nowStr: () => '12:00:00', starts: [],
    _genomeOf: () => ({ g: 1 }), _genomeEvolve: () => ({ changed: 3, genes: 12, archived: false }), _evoTrialStart: (id, oldG, info) => { c.starts.push({ id, info }); }, _vjReset: () => 0, _SEAT_DEF: {}, buildAgentCards: () => {}, patchAgentCards: () => {}, showToast: () => {}, bumpVersion: () => {}, rndHash: () => 'h', _onAgentEvolved: null };
  vm.createContext(c); vm.runInContext(EVOLVE, c);
  vm.runInContext("triggerEvolution(S.agents[0], { trig: 'C' })", c);
  assert.strictEqual(c.starts.length, 1); assert.deepStrictEqual([c.starts[0].id, c.starts[0].info.fit, c.starts[0].info.trig, c.starts[0].info.man, c.starts[0].info.gen], ['w', 61.7, 'C', false, 101], JSON.stringify(c.starts[0]));
  assert.ok(S.agents[0].fitness >= 350, 'naissance après lecture'); assert.deepStrictEqual([S.agents[0].lmsrWallet, S.agents[0].lmsrSpent], [S.agents[0].fitness, 0]);
  S.agents[0].fitness = 40; S._lastEvolutionAt = 0; vm.runInContext("triggerEvolution(S.agents[0], { manual: true, quiet: true, trig: 'M' })", c); assert.deepStrictEqual([c.starts[1].info.fit, c.starts[1].info.trig, c.starts[1].info.man], [40, 'M', true]);
  S.agents[0].fitness = 30; S._lastEvolutionAt = 0; vm.runInContext("triggerEvolution(S.agents[0])", c); assert.deepStrictEqual([c.starts[2].info.trig, c.starts[2].info.man], ['?', false], 'appelant sans déclencheur : « ? »');
  assert.ok(codeStrict(s03).includes("triggerEvolution(a, { manual: true, quiet: true, trig: 'M' });"), '_evolveBrokenNow : M');
});

T('S1 · textes : 09b1 écrit evoRule, 09b2 le relit, manifeste ; en-têtes des six fichiers ; écran 11b « Évolution apprise » (repli sans observation ; niveaux et observations avec) ; lecture seule', () => {
  assert.ok(codeStrict(s9b1).includes('evoRule: S.evoRule || null,') && codeStrict(s9b2).includes("if (snap.evoRule && typeof snap.evoRule === 'object')                     S.evoRule           = snap.evoRule;"));
  const man = (codeStrict(s9b2).match(/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/) || [])[1] || ''; assert.ok(man.includes("'evoRule'"), 'manifeste');
  [s03, s07, s08, s9b1, s9b2, s11].forEach((s, i) => assert.ok(s.startsWith('// [ÉVOLUTION APPRISE · 28/09/2026] VERSION 20260928c'), 'en-tête ' + i));
  const src = s11.replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const mkS = evoRule => ({ tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {}, agents: [], dcThreshold: { rec: [], pend: [], rules: {}, pendV: [], vHz: {} }, evoRule });
  const mkC = S => ({ S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [], _thHzLab: h => h + ' b', _thTfMs: () => 900000, _thTf: () => '15m', _fitWindow: () => 60, _fitOf: () => null, _fitHz: () => null, _dcMerit: () => 0, _dcMeritHz: () => null, _fjMode: () => 'hz' });
  let c = mkC(mkS(null)); vm.createContext(c); vm.runInContext(src, c); let h = vm.runInContext('_learnedPanelHtml()', c), seg = h.slice(h.indexOf('ÉVOLUTION APPRISE'), h.indexOf('EMPLACEMENTS APPRIS'));
  assert.ok(seg.includes('pas encore d\'évolution jugée — repli : plus faible sous 150 tout de suite, tous les 15 cycles, sous 300 tous les 8 (03) ; sous 300, stagnation sous 400 (Home)'), seg.slice(0, 400));
  const obs = gen(40, 50, 0.3); obs[39][4] = 'M'; obs[39][5] = 1; obs[39][6] = 'corr_v1';
  c = mkC(mkS({ obs, rule: { t: NOW, n: 40, blocks: 40, gain: { level: 50, n: 40, blocks: 40, mean: 0.3, se: 0, crit: 3.5 }, harm: null, near: { level: 50, n: 40, blocks: 40, mean: 0.3, se: 0, crit: 3.5 } }, since: 1 })); c._evoLevels = () => ({ gain: 50, harm: null });
  vm.createContext(c); vm.runInContext(src, c); h = vm.runInContext('_learnedPanelHtml()', c); seg = h.slice(h.indexOf('ÉVOLUTION APPRISE'), h.indexOf('EMPLACEMENTS APPRIS'));
  assert.ok(seg.includes('gain prouvé : recyclable dès que fitness ≤ 50 T$ (au-dessus : les nombres posés à la main)') && seg.includes('40 évolutions jugées · 40 créneaux de 4 h') && seg.includes('>corr_v1<') && seg.includes('manuelle (Rams)') && seg.includes('+0.300 (30 év.)') && seg.includes('>50 T$<'), seg.slice(0, 1500));
  c = mkC(mkS({ obs, rule: { t: NOW, n: 40, blocks: 40, gain: null, harm: null, near: { level: 269, n: 40, blocks: 40, mean: -0.011, se: 0.006, crit: 3.5 } }, since: 1 })); c._evoLevels = () => null;
  vm.createContext(c); vm.runInContext(src, c); h = vm.runInContext('_learnedPanelHtml()', c); seg = h.slice(h.indexOf('ÉVOLUTION APPRISE'), h.indexOf('EMPLACEMENTS APPRIS'));
  assert.ok(seg.includes('rien de prouvé : les nombres posés à la main décident (150 / 300 / 400, tous les 15 cycles)') && seg.includes('sièges ≤ 269 T$') && seg.includes('-0.011 ± 0.006 (40 évolutions, 40 créneaux, exigé 3.5 ET)'), seg.slice(0, 1500));
  assert.ok(!/S\.\w+\s*=[^=]/.test(codeStrict(src).split('function _learnedPanelHtml')[1].split('\nfunction ')[0]), '11b : lecture seule');
});

console.log(`\n${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
