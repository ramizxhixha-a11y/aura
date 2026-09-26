// banc-abstention.js — [ABSTENTION · 26/09/2026] + [REDÉMARRAGE · 26/09/2026] VERSION 20260926n
// Rams : « à chaque fois que tu pousses, auto-revigoration, c'est normal ? ». Deux causes :
//  1. une abstention (|vote| ≤ 0,05 : conseil « hold », scout sans donnée, gardien qui approuve) était jugée FAUSSE (−1, poids
//     plancher 0,01) : 5 abstentions suffisaient à mettre un siège à 50 T$ (« cassé ») et comptaient autant d'« erreurs » ;
//  2. les délais de l'évolution (1 h), de la revigoration (30 min) et du rêve (24 h) n'étaient pas sauvegardés : chaque
//     rechargement (donc chaque livraison) déclenchait les trois.
// Fonctions RÉELLES (03 runRosterAnalysis, learnFromOutcome, _fitJudge, moteur d'essai, migration, _autoRevigorCheck ;
// 07 triggerEvolution, triggerDreamCycle ; 09b2 restauration des délais) en vm ; rejeu sur les backups réels s'ils sont là.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = v => JSON.parse(JSON.stringify(v));
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false) + '\nwindow._fitJudge = _fitJudge;\n';
const TIERS_TXT = between(s03, 'const ROSTER_TIERS = {', '\n};', true);
const ROSTER_TXT = between(s03, 'function runRosterAnalysis(pair) {', '\n// ════', false);
const LEARN_TXT = between(s03, 'function learnFromOutcome(source, pnlPct, pair) {', '\nconst METAPHOR_TEMPLATES', false);
const EVO = between(s03, 'var EVO_TRIAL_N = 30', 'window._evoTrialStart = _evoTrialStart;', false);
const MIGR = between(s03, '(function _botMeritMigrate() {', '\n})();', true);
const REVIG = between(s03, 'function _autoRevigorCheck() {', '\nwindow._autoRevigorCheck = _autoRevigorCheck;', false);
const RESTORE = between(s9b2, "    ['_lastEvolutionAt', '_lastAutoRevigorTs', '_lastDreamAt'].forEach(function (k) {", '\n    });\n', true);
const EVOLVE = between(s07, 'function triggerEvolution(weak) {', 'buildAgentCards(); patchAgentCards();\n}', true);
const DREAM_HEAD = between(s07, 'function triggerDreamCycle() {', '\n  S.dreamActive   = true;', false) + '\n}';
const TIERS = new Function(TIERS_TXT + '\nreturn ROSTER_TIERS;')();

// ── contexte roster + juge RÉELS (même montage que banc-phase1-vote-paire) ──
const BOT_IDS = ['exec_bot_v1', 'arb_bot_v1', 'scalper_bot_v1', 'fiscal_bot_v1', 'dca_bot_v1', 'rescue_bot_v1', 'rebalance_bot_v1', 'smart_sizer_v1'];
function mkAgents(fit) {
  const A = [], base = (id, sc, extra) => Object.assign({ id, name: id, emoji: '·', type: 'x·y', domain: 'd', source: 's/t', score: sc, conf: 0.6, fitness: fit, memory: [], streak: 0, errors: 0, corrections: 0 }, extra || {});
  TIERS.scouts.forEach(id => A.push(base(id, 0.42)));
  TIERS.council.forEach(id => A.push(base(id, -0.31)));
  TIERS.guardians.forEach(id => A.push(base(id, 0, { isBot: id === 'risk_bot_v1', isMeta: id === 'evolver_v1' })));
  BOT_IDS.forEach(id => A.push(base(id, 0, { isBot: true })));
  return A;
}
const MUTE_SCOUT = 'flow_v1', HOLD_COUNCIL = 'hedge_v2';   // un scout qui attend sa donnée, un conseiller qui dit « hold »
function mkLearnCtx() {
  const calls = { regime: [], memory: [] };
  const c = { console, Math, Date, Object, Array, Number, String, JSON, Set, Map, isFinite, calls };
  c.window = { _perfOp: () => {} };
  c.S = { agents: mkAgents(800), pairStates: { 'BTC/USDT': { price: 1 } }, mutedAgents: [], tradingAccount: 500, cycle: 7, tradingMode: 'paperReal', chainLog: [], learningHistory: [] };
  c.scoutAnalysis = id => ({ score: id === MUTE_SCOUT ? 0 : 0.6, conf: 0.7, reasoning: 'stub' });
  c.councilVote = id => (id === HOLD_COUNCIL ? { vote: 'hold', score: 0, quote: 'stub' } : { vote: 'long', score: 0.5, quote: 'stub' });
  c.guardianCheck = () => ({ status: 'approve', reasoning: 'stub' });
  c.detectMarketRegime = () => 'calm'; c.getContextualWeight = a => a.fitness || 1;
  c.updateRegimeFitness = a => calls.regime.push(a.id);
  c.enrichMemory = (a, won) => calls.memory.push([a.id, won]);
  c.triggerEvolution = () => {}; c.nowStr = () => '00:00:00'; c.rndHash = () => 'h';
  vm.createContext(c);
  vm.runInContext(TIERS_TXT + '\n' + ROSTER_TXT + '\n' + JUDGE + '\n' + LEARN_TXT, c);
  return c;
}
const ag = (c, id) => c.S.agents.find(a => a.id === id);
const lose = (c, n) => { for (let i = 0; i < (n || 1); i++) vm.runInContext("runRosterAnalysis('BTC/USDT'); learnFromOutcome('position', -1.2, 'BTC/USDT')", c); };

console.log('▶ banc-abstention');
T('D1 · learnFromOutcome RÉEL : le scout sans donnée (vote 0), le conseiller « hold » (0) et le gardien qui approuve (+0,05) ne sont PLUS jugés — ni jugement, ni erreur, ni souvenir, ni compétence, ni ligne d\'historique ; le votant (+0,6, perdu) est jugé −1', () => {
  const c = mkLearnCtx(); lose(c);
  const v = c.S.pairStates['BTC/USDT'].roster.votes;
  assert.deepStrictEqual([v[MUTE_SCOUT], v[HOLD_COUNCIL], v.security_v1, v.macro_v1], [0, 0, 0.05, 0.6], 'votes publiés par le roster RÉEL');
  const macro = ag(c, 'macro_v1'); assert.strictEqual(macro._judgments.length, 1); assert.strictEqual(macro._judgments[0].s, -1); assert.strictEqual(macro.errors, 1);
  [MUTE_SCOUT, HOLD_COUNCIL, 'security_v1'].forEach(id => {
    const a = ag(c, id);
    assert.ok(!a._judgments || a._judgments.length === 0, id + ' : aucun jugement'); assert.strictEqual(a.errors, 0, id + ' : aucune erreur');
    assert.ok(!c.calls.memory.some(m => m[0] === id), id + ' : aucun souvenir'); assert.ok(!(c.S.agentPairSkill || {})[id], id + ' : aucune compétence');
    assert.ok(!c.S.learningHistory[0].adjustments.some(x => x.agentId === id), id + ' : absent de l\'historique');
  });
  assert.ok(c.S.learningHistory[0].adjustments.some(x => x.agentId === 'macro_v1' && x.aligned === false));
});
T('D2 · 20 abstentions de suite : le scout reste à 800 T$, 0 erreur, jamais « auto-recalibré » ; l\'ANCIEN chemin (5 jugements −1 au poids 0 → plancher 0,01, _fitJudge RÉEL) mettait un nouveau-né de 350 à 50 T$ = « cassé »', () => {
  const c = mkLearnCtx(); lose(c, 20);
  const f = ag(c, MUTE_SCOUT); assert.strictEqual(f.fitness, 800); assert.strictEqual(f.errors, 0); assert.strictEqual(f.score, 0.42, 'score intact');
  assert.ok(!c.S.chainLog.some(e => /flow_v1 auto-recalibré/.test(e.desc || '')));
  const hold = ag(c, HOLD_COUNCIL); assert.strictEqual(hold.fitness, 800); assert.strictEqual(hold.errors, 0);
  const newborn = { id: 'x', fitness: 350, _judgments: [] }; c.__nb = newborn;
  for (let i = 0; i < 5; i++) vm.runInContext('_fitJudge(__nb, -1, 0)', c);
  assert.strictEqual(newborn.fitness, 50, 'ancien chemin : 5 abstentions = 50 T$');
});
T('D3 · le siège qui s\'abstient garde la fitness de SA fenêtre : un nouveau-né (fenêtre vide) reste à sa fitness de naissance ; une écriture additive héritée (LMSR 08, clôture 02) est effacée à la clôture suivante comme avant', () => {
  const c = mkLearnCtx();
  const hold = ag(c, HOLD_COUNCIL); hold.fitness = 350; hold._judgments = [];
  const f = ag(c, MUTE_SCOUT); f._judgments = Array.from({ length: 6 }, () => ({ s: 1, w: 0.5, k: 0 })); f.fitness = 1310;   // fenêtre → 1 350, affichée dérivée
  lose(c, 12);
  assert.strictEqual(hold.fitness, 350, 'naissance conservée'); assert.strictEqual(hold._judgments.length, 0);
  assert.strictEqual(f.fitness, 1350, 'fitness = sa fenêtre'); assert.strictEqual(f._judgments.length, 6, 'aucun jugement ajouté');
});
T('D4 · essai de l\'Évolueur RÉEL : une abstention n\'est jugée ni pour le nouveau génome ni pour l\'ancien ; si un seul des deux parle, lui seul est jugé', () => {
  const c = { S: { agents: [{ id: 'trend_v2' }, { id: 'evolver_v1', isMeta: true, _judgments: [] }], pairStates: { 'BTC/USDT': { roster: { shadow: { trend_v2: -0.5 } } } }, chainLog: [] }, Math, Number, Object, JSON, Date, window: {}, console };
  vm.createContext(c); vm.runInContext(JUDGE + EVO, c);
  assert.strictEqual(vm.runInContext('_evoTermOf(0, true, 2, 1)', c), null); assert.strictEqual(vm.runInContext('_evoTermOf(0.05, true, 2, 1)', c), null); assert.strictEqual(vm.runInContext('_evoTermOf(-0.05, false, 2, 1)', c), null);
  assert.deepStrictEqual(J(vm.runInContext('_evoTermOf(0.3, true, 2, 1)', c)), { s: 1, w: 0.6 });
  vm.runInContext('_evoTrialStart("trend_v2", { adxMin: 25 }, { name: "G" }); _evoTrialJudge(S.agents[0], "BTC/USDT", false, 2, 1, 0)', c);   // nouveau muet, ancien court (−0,5) et le trade perd
  const tr = J(c.S.evoTrials.trend_v2);
  assert.deepStrictEqual([tr.n, tr.nw, tr.ns, tr.ow, tr.os], [1, 0, 0, 1, 1], 'seul l\'ancien est jugé (aligné, poids 0,5 × 2 × 1)');
});
function runMigr(S) {
  const c = { S, Math, Number, Array, Object, JSON, Date, console, window: { _stateReady: true }, saves: 0 };
  c.setInterval = fn => { c._tick = fn; return 1; }; c.clearInterval = () => {}; c.saveState = () => { c.saves++; }; c.nowStr = () => '00:00:00';
  vm.createContext(c); vm.runInContext(JUDGE + '\n' + MIGR, c); c._tick();
  return c;
}
const jj = (n, s, w) => Array.from({ length: n }, () => ({ s, w, k: 0 }));
T('D5 · migration RÉELLE (une fois) : poids plancher retirés des fenêtres des APPRENANTS (les deux signes) ; fitness recalculée, neutre 350 si la fenêtre n\'était qu\'abstentions, naissance gardée sous 5 jugements ; « erreurs » d\'abstention retirées ; bots et Évolueur intacts ; journal + sauvegarde', () => {
  const S = { _botMeritMigrated: true, _metaMeritMigrated: true, chainLog: [], agents: [
    { id: 'macro_v1', fitness: 50, errors: 14, _judgments: jj(14, -1, 0.01) },
    { id: 'security_v1', fitness: 632, errors: 25, _judgments: [].concat(jj(20, 1, 0.01), jj(20, -1, 0.01), jj(20, 1, 0.4), jj(10, -1, 0.4)) },
    { id: 'trend_v2', fitness: 520, errors: 3, _judgments: jj(3, -1, 0.01) },
    { id: 'nlp_v1', fitness: 1350, errors: 0, _judgments: jj(8, 1, 0.3) },
    { id: 'exec_bot_v1', isBot: true, fitness: 50, _judgments: jj(10, -1, 0.01) },
    { id: 'evolver_v1', isMeta: true, fitness: 50, _judgments: jj(6, -1, 0.01) }] };
  const c = runMigr(S), A = id => S.agents.find(a => a.id === id);
  assert.deepStrictEqual([A('macro_v1')._judgments.length, A('macro_v1').fitness, A('macro_v1').errors], [0, 350, 0], 'que des abstentions → neutre');
  assert.deepStrictEqual([A('security_v1')._judgments.length, A('security_v1').fitness, A('security_v1').errors], [30, 683, 5], 'vrais votes gardés : 350 + 1000 × (8 − 4) / 12');
  assert.deepStrictEqual([A('trend_v2')._judgments.length, A('trend_v2').fitness], [0, 520], 'moins de 5 jugements : fitness de naissance gardée');
  assert.deepStrictEqual([A('nlp_v1')._judgments.length, A('nlp_v1').fitness], [8, 1350]);
  assert.deepStrictEqual([A('exec_bot_v1')._judgments.length, A('exec_bot_v1').fitness, A('evolver_v1')._judgments.length], [10, 50, 6], 'bots et Évolueur : autres juges');
  assert.strictEqual(S._abstMigrated, true); assert.strictEqual(c.saves, 1);
  assert.ok(/^Abstentions : 57 jugements au poids plancher retirés des fenêtres de 3 agents/.test(S.chainLog[0].desc), S.chainLog[0].desc);
  const c2 = runMigr(S); assert.strictEqual(c2.saves, 0, 'une seule fois'); assert.strictEqual(S.chainLog.length, 1);
});
T('D6 · rejeu sur la mémoire réelle (backups 23/09 et 25/09, migration RÉELLE) : apprenants « cassés » (≤ 80 T$) 14 → 7 et 13 → 6', () => {
  const UP = '/mnt/user-data/uploads/', cases = [['aura_guardian_full_20260923-123512.json', 14, 7], ['aura_guardian_full_20260925-194758.json', 13, 6]];
  if (!cases.every(k => fs.existsSync(UP + k[0]))) { console.log('     ⏳ backups absents de cette machine : rejeu non exécuté (non bloquant)'); return; }
  cases.forEach(([fn, before, after]) => {
    const st = JSON.parse(fs.readFileSync(UP + fn, 'utf8')).aura;
    const agents = st.agents.map(a => Object.assign({}, a, { isBot: /_bot_v1$|^smart_sizer_v1$/.test(a.id), isMeta: a.id === 'evolver_v1' }));
    const broken = () => agents.filter(a => !a.isBot && !a.isMeta && a.fitness <= 80).length;
    assert.strictEqual(broken(), before, fn + ' avant');
    runMigr({ _botMeritMigrated: true, _metaMeritMigrated: true, chainLog: [], agents, fitWindowRule: st.fitWindowRule || null });
    assert.strictEqual(broken(), after, fn + ' après');
  });
});
T('D7 · 09b2 RÉEL : délais relus au redémarrage — heure passée gardée ; absente (snapshot d\'avant) ou du futur → le délai part du chargement ; zéro (jamais arrivé) → rien de retenu', () => {
  const now = Date.now(), run = snap => { const c = { S: {}, snap, Date, Number }; vm.createContext(c); vm.runInContext(RESTORE, c); return c.S; };
  const a = run({ _lastEvolutionAt: now - 600000, _lastAutoRevigorTs: now - 300000, _lastDreamAt: now - 3600000 });
  assert.deepStrictEqual([a._lastEvolutionAt, a._lastAutoRevigorTs, a._lastDreamAt], [now - 600000, now - 300000, now - 3600000]);
  const b = run({}); ['_lastEvolutionAt', '_lastAutoRevigorTs', '_lastDreamAt'].forEach(k => assert.ok(Math.abs(b[k] - now) < 5000, 'absent → maintenant : ' + k));
  const f = run({ _lastEvolutionAt: now + 86400000, _lastAutoRevigorTs: 0, _lastDreamAt: 0 });
  assert.ok(Math.abs(f._lastEvolutionAt - now) < 5000, 'futur → maintenant'); assert.strictEqual(f._lastAutoRevigorTs, undefined); assert.strictEqual(f._lastDreamAt, undefined);
});
T('D8 · après un rechargement, les délais RÉELS tiennent : revigoration (30 min), évolution (1 h), rêve (24 h) ne repartent pas ; une fois le délai écoulé, la revigoration repart (6 apprenants cassés)', () => {
  const now = Date.now();
  const mk = last => { const c = { S: { _lastAutoRevigorTs: last, chainLog: [], agents: Array.from({ length: 6 }, (_, i) => ({ id: 's' + i, fitness: 50, _judgments: jj(6, -1, 0.3), errors: 2, streak: 0 })) }, Date, Math, window: {}, rndHash: () => 'h', nowStr: () => '' }; vm.createContext(c); vm.runInContext(REVIG, c); vm.runInContext('_autoRevigorCheck()', c); return c.S; };
  const held = mk(now - 10 * 60000); assert.ok(held.agents.every(a => a.fitness === 50) && held.chainLog.length === 0, 'dans le délai : rien');
  const fired = mk(now - 31 * 60000); assert.ok(fired.agents.every(a => a.fitness === 400) && /Auto-revigoration · 6/.test(fired.chainLog[0].desc), 'délai écoulé : revigoration');
  const ce = { S: { _lastEvolutionAt: now - 10 * 60000, agents: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], evoLog: [] }, Date, Math, window: {} }; vm.createContext(ce); vm.runInContext(EVOLVE, ce);
  vm.runInContext('triggerEvolution(S.agents[0])', ce); assert.strictEqual(ce.S._lastEvolutionAt, now - 10 * 60000); assert.strictEqual(ce.S.evoLog.length, 0, 'évolution : délai tenu');
  const cd = { S: { _lastDreamAt: now - 3600000, dreamActive: false }, Date, Math }; vm.createContext(cd); vm.runInContext(DREAM_HEAD, cd);
  vm.runInContext('triggerDreamCycle()', cd); assert.strictEqual(cd.S._lastDreamAt, now - 3600000, 'rêve : délai tenu');
  cd.S._lastDreamAt = now - 25 * 3600000; vm.runInContext('triggerDreamCycle()', cd); assert.ok(Math.abs(cd.S._lastDreamAt - Date.now()) < 5000, 'rêve : délai écoulé → repart');
});
T('S1 · textes : le saut d\'abstention suit l\'essai de l\'Évolueur et précède compétence, fitness, erreurs, souvenir ; 09b1 écrit et 09b2 relit les délais et le drapeau de migration (manifeste)', () => {
  const lfo = codeStrict(LEARN_TXT);
  const iEvo = lfo.indexOf('_evoTrialJudge(a, pair, won, mag, decay, _vote); } catch(e) {}'), iSkip = lfo.indexOf('    if (signalStrength <= 0.05) {'), iSkill = lfo.indexOf('    if (pair && signalStrength > 0.05) {'), iAl = lfo.indexOf('    if(aligned) {');
  assert.ok(iEvo > 0 && iSkip > iEvo && iSkill > iSkip && iAl > iSkill, 'ordre : essai → saut → compétence → jugement');
  assert.ok(lfo.includes('try { const _fw = _fitOf(a._judgments || [], _fitWindow()); if (_fw !== null) a.fitness = _fw; } catch(e) {}\n      return;\n    }'));
  assert.ok(codeStrict(EVO).includes('if (Math.abs(v) <= 0.05) return null;'));
  const b1 = codeStrict(s9b1); ['_lastEvolutionAt: S._lastEvolutionAt || 0,', '_lastAutoRevigorTs: S._lastAutoRevigorTs || 0,', '_lastDreamAt: S._lastDreamAt || 0,', '_abstMigrated: !!S._abstMigrated,'].forEach(t => assert.ok(b1.includes(t), t));
  const b2 = codeStrict(s9b2); assert.ok(b2.includes("'_lastEvolutionAt','_lastAutoRevigorTs','_lastDreamAt','_abstMigrated',") && b2.includes('if (snap._abstMigrated)'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
