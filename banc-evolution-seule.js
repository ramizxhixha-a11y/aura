// banc-evolution-seule.js — [ÉVOLUTION SEULE · 26/09/2026] VERSION 20260926o
// Go Rams (26/09 22:43) : la revigoration AUTOMATIQUE des apprenants est retirée. Elle remettait à 400 T$ (fenêtre vidée) tout
// apprenant ≤ 80 T$ dès qu'il y en avait 4 : son vrai niveau disparaissait, il revotait avec le poids d'un agent moyen, et
// l'évolution — qui remplace le plus faible — ne le voyait plus. Désormais un siège faible garde sa vraie fitness et l'évolution
// le remplace. Code RÉEL : déclencheur d'évolution (fin de learnFromOutcome, 03), migration des abstentions (03, n), revigoration
// manuelle (03, gardée) ; rejeu sur les backups réels s'ils sont là.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false) + '\nwindow._fitJudge = _fitJudge;\n';
const MIGR = between(s03, '(function _botMeritMigrate() {', '\n})();', true);
const TRIG = 'function _evoTrigger() {\n' + between(s03, '  const sorted = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness);', '\n  }\n', true) + '}\n';
const MANUAL = between(s03, 'function _revigorBrokenAgents(silent) {', '\n  return count;\n}', true);
const sum = xs => xs.reduce((t, x) => t + x, 0);
function evoTarget(agents, cycle) {   // déclencheur RÉEL : qui l'évolution vise-t-elle à la prochaine clôture ?
  const c = { S: { agents, cycle }, Math, hit: [] };
  c.triggerEvolution = a => c.hit.push(a.id);
  vm.createContext(c); vm.runInContext(TRIG + '\n_evoTrigger();', c);
  return c.hit[0] || null;
}
const jj = (n, s, w) => Array.from({ length: n }, () => ({ s, w, k: 0 }));
function mkLearners() {   // 21 apprenants : 6 réellement faux (fenêtre 30 % juste), 15 sains
  const A = [];
  for (let i = 0; i < 6; i++) A.push({ id: 'faux_' + i, fitness: 50, _judgments: [].concat(jj(7, 1, 0.3), jj(13, -1, 0.3)) });
  for (let i = 0; i < 15; i++) A.push({ id: 'sain_' + i, fitness: 300 + i * 40, _judgments: jj(10, 1, 0.3) });
  A.push({ id: 'exec_bot_v1', isBot: true, fitness: 20 }, { id: 'evolver_v1', isMeta: true, fitness: 10 });
  return A;
}
console.log('▶ banc-evolution-seule');
T('D1 · déclencheur RÉEL (fin de learnFromOutcome) : les sièges faux gardent leur vraie fitness → l\'évolution vise l\'un d\'eux (plus faible, < 150 T$) ; revigorés à 400, elle visait un siège sain ; bots et méta jamais visés', () => {
  const A = mkLearners();
  const t0 = evoTarget(A, 1); assert.ok(/^faux_/.test(t0), 'cible sans revigoration : ' + t0);
  const revived = A.map(a => /^faux_/.test(a.id) ? Object.assign({}, a, { fitness: 400, _judgments: [] }) : a);
  const t1 = evoTarget(revived, 15); assert.strictEqual(t1, 'sain_0', 'revigorés : l\'évolution cyclique tombe sur un siège sain');
  assert.strictEqual(evoTarget(revived, 1), null, 'revigorés : aucun siège sous 150 → pas de remplacement immédiat');
});
T('D2 · un siège faux garde un poids réduit dans le vote (fitness 50 contre 400 revigoré : ×8) ; la revigoration MANUELLE RÉELLE reste disponible (bouton) : ≤ 80 T$ → 400, fenêtre vide, journal', () => {
  const A = mkLearners(), L = A.filter(a => !a.isBot && !a.isMeta), faux = L.filter(a => a.fitness <= 80);
  const share = sum(faux.map(a => a.fitness)) / sum(L.map(a => a.fitness)), shareR = faux.length * 400 / (sum(L.map(a => a.fitness)) + sum(faux.map(a => 400 - a.fitness)));
  assert.ok(shareR > 4 * share, 'poids revigorés ' + (shareR * 100).toFixed(1) + ' % contre ' + (share * 100).toFixed(1) + ' %');
  const c = { S: { agents: A, chainLog: [] }, Math, window: {}, rndHash: () => 'h', nowStr: () => '' }; vm.createContext(c); vm.runInContext(MANUAL, c);
  assert.strictEqual(vm.runInContext('_revigorBrokenAgents(true)', c), 7, 'les 6 sièges faux + l\'Évolueur (le bouton couvre tout ce qui n\'est pas un bot)');
  assert.ok(A.filter(a => /^faux_/.test(a.id)).every(a => a.fitness === 400 && a._judgments.length === 0));
  assert.strictEqual(A.find(a => a.isBot).fitness, 20, 'bots : bouton séparé'); assert.ok(/^Revigoration · 7 agent\(s\)/.test(c.S.chainLog[0].desc));
});
T('D3 · rejeu sur la mémoire réelle (backups 23 et 25/09, après la migration RÉELLE des abstentions) : 7 et 6 vrais cassés, précision pondérée < 40 % chacun ; revigorés, leur poids dans le vote est > 4 × leur poids réel ; l\'évolution (déclencheur RÉEL) vise un cassé, et un siège non cassé s\'ils sont revigorés', () => {
  const UP = '/mnt/user-data/uploads/', cases = [['aura_guardian_full_20260923-123512.json', 7, 'sentiment_v2'], ['aura_guardian_full_20260925-194758.json', 6, 'nlp_v1']];
  if (!cases.every(k => fs.existsSync(UP + k[0]))) { console.log('     ⏳ backups absents de cette machine : rejeu non exécuté (non bloquant)'); return; }
  cases.forEach(([fn, nBroken, target]) => {
    const st = JSON.parse(fs.readFileSync(UP + fn, 'utf8')).aura;
    const agents = st.agents.map(a => Object.assign({}, a, { isBot: /_bot_v1$|^smart_sizer_v1$/.test(a.id), isMeta: a.id === 'evolver_v1' }));
    const c = { S: { _botMeritMigrated: true, _metaMeritMigrated: true, chainLog: [], agents, fitWindowRule: st.fitWindowRule || null }, Math, Number, Array, Object, JSON, Date, console, window: { _stateReady: true } };
    c.setInterval = f => { c._t = f; return 1; }; c.clearInterval = () => {}; c.saveState = () => {}; c.nowStr = () => '';
    vm.createContext(c); vm.runInContext(JUDGE + MIGR, c); c._t();
    const L = agents.filter(a => !a.isBot && !a.isMeta), broken = L.filter(a => a.fitness <= 80);
    assert.strictEqual(broken.length, nBroken, fn + ' : vrais cassés');
    broken.forEach(a => { const js = a._judgments.slice(-60), acc = (sum(js.map(j => j.s * j.w)) / sum(js.map(j => j.w)) + 1) / 2; assert.ok(js.length >= 5 && acc < 0.4, a.id + ' précision ' + acc.toFixed(2)); });
    const share = sum(broken.map(a => a.fitness)) / sum(L.map(a => a.fitness)), shareR = broken.length * 400 / (sum(L.map(a => a.fitness)) + sum(broken.map(a => 400 - a.fitness)));
    assert.ok(shareR > 4 * share, fn + ' poids ' + (share * 100).toFixed(1) + ' % → ' + (shareR * 100).toFixed(1) + ' %');
    assert.strictEqual(evoTarget(agents, 1), target, fn + ' : cible sans revigoration');
    const revived = agents.map(a => (!a.isBot && !a.isMeta && a.fitness <= 80) ? Object.assign({}, a, { fitness: 400 }) : a);
    const t1 = evoTarget(revived, 15); assert.ok(t1 && !broken.some(b => b.id === t1), fn + ' : revigorés, cible ' + t1);
  });
});
T('S1 · textes : plus de revigoration automatique (ni fonction, ni minuterie, ni délai sauvegardé) ; revigorations manuelles exposées et bouton Déblocages intact ; manifeste cohérent', () => {
  const c03 = codeStrict(s03);
  assert.ok(!c03.includes('_autoRevigorCheck') && !c03.includes('_lastAutoRevigorTs') && !c03.includes('Auto-revigoration'));
  assert.ok(c03.includes('window._revigorBrokenAgents = _revigorBrokenAgents;') && c03.includes('window._revigorBots = _revigorBots;'));
  assert.ok(codeStrict(s04).includes('<button onclick="window._revigorBrokenAgents()"'));
  assert.ok(!codeStrict(s9b1).includes('_lastAutoRevigorTs') && !codeStrict(s9b2).includes('_lastAutoRevigorTs'));
  assert.ok(codeStrict(s9b2).includes("'_lastEvolutionAt','_lastDreamAt','_abstMigrated',"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
