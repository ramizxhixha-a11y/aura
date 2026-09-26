// banc-phase1-vote-paire.js — [PHASE 1 · 12/09/2026] VOTE PAR PAIRE (PLAN-DIRECTEUR A1) · banc autonome : `node banc-phase1-vote-paire.js` à la racine.
// Prouve sur les FICHIERS LIVRÉS (token lu dans le HTML, jamais figé ici) :
//  A · statique — liveTrainAgents retiré de tous les scripts chargés (+ appelant 02) et archivé byte-identique ; 08 sans aucun appel
//      roster ; runRosterAnalysis n'écrit plus a.score / a.conf des agents de signal et publie ps.roster ; ps.roster hors snapshot
//      (09b1) ; 10f lit les votes (0 lecture de a.score), roster frais marqué _perfOp ; learnFromOutcome / enrichMemory / 12 jugent
//      sur le vote ; en-têtes et HTML au token.
//  B · dynamique — runRosterAnalysis RÉEL (scouts/conseil/gardiens stubbés PAR PAIRE) + tranche consensus RÉELLE de 10f :
//      consensus(ETH) ≠ consensus(BTC) sur les MÊMES agents (signes opposés), a.score / a.conf STABLES sans clôture, muet = 0,
//      sans roster = 0 (pas de décision sur du faux), multiplexage par mode, veto gardien = −0.5 ; learnFromOutcome RÉEL juge
//      sur le vote de la paire (repli a.score sans roster) ; _angleAnswer RÉEL (12) lit le vote ; sortie « Signal inversé »
//      atteignable (dénominateur = agents qui votent).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname;
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const TOK = (() => { const m = rd('AURA8_v118.html').match(/DOC_V = '(\d{8}[a-z])'/); if (!m) { console.error('DOC_V introuvable dans AURA8_v118.html'); process.exit(2); } return m[1]; })();
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n      ')); } }
const F02 = 'js/02-state-init.js', F03 = 'js/03-per-pair-position-buttons-controls-buid.js', F08 = 'js/08-learning-history-render.js',
      F10F = 'js/10f-resolveur-cycle.js', F12 = 'js/12-bots-disciples.js', F9B1 = 'js/09b1-build-snapshot.js', F9C = 'js/09c-auto-open.js',
      FARCH = 'archive/liveTrainAgents-03-retire-phase1.js';
const s02 = rd(F02), s03 = rd(F03), s08 = rd(F08), s10f = rd(F10F), s12 = rd(F12), s9b1 = rd(F9B1), html = rd('AURA8_v118.html');
const code = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');   // lignes hors commentaires
const count = (s, k) => s.split(k).length - 1;
const codeStrict = s => code(s).split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');   // hors commentaires, y compris en fin de ligne
const between = (s, a, b, what) => {
  const i = s.indexOf(a); assert.ok(i >= 0, what + ' : ancre début absente');
  assert.strictEqual(s.indexOf(a, i + 1), -1, what + ' : ancre début non unique');
  const j = s.indexOf(b, i + a.length); assert.ok(j > i, what + ' : ancre fin absente');
  return s.slice(i, j);
};
const scripts = [...html.matchAll(/<script src="(js\/[^"?]+)\?v=/g)].map(m => m[1]);
console.log('▶ banc-phase1-vote-paire · token ' + TOK + ' · ' + scripts.length + ' scripts js/ chargés par le HTML');

/* ═══════════════════════════ A · STATIQUE ═══════════════════════════ */
console.log('\n── A · statique : ce qui est retiré, ce qui est publié ──');
T('en-têtes : 03/12 « [PHASE 1 · 12/09/2026] VERSION 20260912c », 02/08 relivrés par 1b-a « [1b-a · 14/09/2026] VERSION 20260914a », 10f « ▓▓▓ VERSION 20260917b ▓▓▓ »', () => {
  assert.ok(s12.startsWith('// [ÉCOLE · 17/09/2026] VERSION 20260917a') && s12.split('\n').slice(0, 5).some(l => l.startsWith('// [PHASE 1 · 12/09/2026] VERSION 20260912c')), F12);   // [1c-FULL] 12 relivré, en-tête PHASE 1 en 2e ligne
  assert.ok(s03.startsWith("// [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] VERSION 20260926k") && s03.split('\n').slice(0, 23).some(l => l.startsWith('// [PHASE 1 · 12/09/2026] VERSION 20260912c')), F03);   // [FITNESS GLISSANTE] 03 relivré, en-tête PHASE 1 conservé dans les 5 premières lignes
  assert.ok(s08.startsWith('// [CONTEXTE 1 H / 4 H · 26/09/2026] VERSION 20260926e') && s08.split('\n').slice(0, 9).some(l => l.startsWith('// [1b-a · 14/09/2026] VERSION 20260914a')), F08);   // [1b-b] 08 relivré, en-tête 1b-a en 2e ligne
  assert.ok(s02.startsWith('// [CONTEXTE 1 H / 4 H · 26/09/2026] VERSION 20260926e') && s02.split('\n').slice(0, 17).some(l => l.startsWith('// [1b-a · 14/09/2026] VERSION 20260914a')), F02);   // [SONDE RÉSEAU] 02 relivré, en-tête 1b-a en 2e ligne
  assert.ok(s10f.startsWith('// ▓▓▓ VERSION 20260926g ▓▓▓'));   // [DOUBLE JUGEMENT 26/09] 10f relivré
});
T('HTML : DOC_V + 80 ?v= au token ' + TOK + ' (81 occurrences, 10i le 17/09, 11b le 23/09), aucun autre token, archive/ non chargé', () => {
  assert.strictEqual(count(html, TOK), 81);
  assert.strictEqual(count(html, '?v=' + TOK), 80);
  assert.strictEqual((html.match(/\?v=\d{8}[a-z]/g) || []).length, 80);
  assert.strictEqual(html.indexOf('archive/'), -1);
});
T('syntaxe : 02, 03, 08, 10f, 12 et l\'archive compilent (vm.Script)', () => {
  for (const [f, s] of [[F02, s02], [F03, s03], [F08, s08], [F10F, s10f], [F12, s12], [FARCH, rd(FARCH)]]) new vm.Script(s, { filename: f });
});
T('liveTrainAgents : absent (code hors commentaires) de TOUS les scripts chargés par le HTML ; archivé avec raison + remplaçant, bloc byte-identique à l\'ancien 03', () => {
  for (const f of scripts) assert.strictEqual(count(code(rd(f)), 'liveTrainAgents'), 0, f);
  const arch = rd(FARCH);
  assert.ok(arch.includes('function liveTrainAgents()') && arch.includes('Raison') && arch.includes('Remplaçant'));
  const bloc = arch.slice(arch.indexOf('// ════'));
  assert.ok(bloc.startsWith('// ════') && bloc.includes('// LIVE TRAINING — every real price fetch nudges agents toward momentum') && bloc.trimEnd().endsWith('}'));
  assert.strictEqual(count(bloc, 'a.score = (a.score || 0) * 0.985 + normMom * w;'), 1);
});
T('02 : _cgT(\'liveTrainAgents\') retiré, _cgT(\'syncPairPresets\') conservé (seul _cgT restant du bloc CoinGecko)', () => {
  const c = code(s02);
  assert.strictEqual(count(c, "_cgT('liveTrainAgents'"), 0);
  assert.strictEqual(count(c, "_cgT('syncPairPresets'"), 1);
  assert.strictEqual(count(c, "_cgT('"), 1);   // un seul appel _cgT('…') subsiste : syncPairPresets
});
T('08 simTick : plus AUCUN appel runRosterAnalysis (rotation 1 paire/tick + rafraîchissement paire active retirés) ; 9 _phEnd conservés (banc-phases-tick)', () => {
  const c = code(s08);
  assert.strictEqual(count(c, 'runRosterAnalysis'), 0);
  assert.strictEqual(count(c, "_phEnd('"), 9);
});
T('03 runRosterAnalysis : plus d\'écriture a.score / a.conf des scouts-conseil-gardiens ; publie ps.roster = {ts, cycle, votes} (muet → 0) ; seul écrivain restant = statut des bots de flotte', () => {
  const body = between(s03, 'function runRosterAnalysis(pair) {', '\nfunction _agentPairVote(', 'runRosterAnalysis');
  const c = code(body);
  assert.strictEqual(count(c, 'agent.conf'), 0);
  assert.strictEqual(count(c, 'agent.score ='), 1);
  const iScore = c.indexOf('agent.score ='), iRoster = c.indexOf('_ps.roster = { ts: Date.now(), cycle: S.cycle || 0, votes: _votes, weights: _weights, regime: _regimeNow };')   // [POIDS PAR ATTRIBUTION 16/09] + weights/regime;
  assert.ok(iRoster >= 0 && iRoster < iScore, 'ps.roster publié avant le miroir bots');
  assert.ok(c.lastIndexOf('S.botFleet', iScore) > iRoster, 'l\'unique agent.score = est dans le bloc botFleet');
  assert.strictEqual(count(c, '_ps.roster = {'), 1);
  assert.ok(c.includes('new Set(S.mutedAgents || [])'));
});
T('_agentPairVote : 1 déclaration (03), lu par 03 ×3 (porte régime, juge, mémoire) et 12 ×2 (angles) ; 10f lit ps.roster.votes via _voteOf (1 déclaration, 3 lectures), 0 lecture de a.score, roster frais marqué _perfOp', () => {
  assert.strictEqual(count(code(s03), 'function _agentPairVote('), 1);
  assert.strictEqual(count(code(s03), '_agentPairVote('), 4);
  assert.strictEqual(count(code(s12), '_agentPairVote('), 2);
  const c = code(s10f);
  assert.strictEqual(count(c, 'const _voteOf ='), 1);
  assert.strictEqual(count(c, '_voteOf('), 3);   // 3 lectures (raw, mémoire, oppWeight) ; la déclaration est une flèche sans parenthèse
  assert.strictEqual(count(codeStrict(s10f), 'a.score'), 0);
  assert.strictEqual(count(c, "window._perfOp('roster:' + pair)"), 1);
  assert.strictEqual(count(c, 'runRosterAnalysis(pair)'), 1);
  assert.strictEqual(count(c, 'const totalFitness   = S.agents.filter(a => !a.isBot && !a.isMeta).reduce('), 1);
});
T('03 learnFromOutcome / enrichMemory : jugent sur _agentPairVote(a, pair, a.score || 0) — aligné, force, porte régime, mémoire ; plus aucun a.score > 0 / < 0', () => {
  const lf = between(s03, 'function learnFromOutcome(source, pnlPct, pair) {', '\nconst METAPHOR_TEMPLATES', 'learnFromOutcome');
  assert.ok(lf.includes('const _vote         = _agentPairVote(a, pair, a.score || 0);'));
  assert.ok(lf.includes('const aligned       = (won && _vote > 0) || (!won && _vote < 0);'));
  assert.ok(lf.includes('const signalStrength= Math.abs(_vote);'));
  assert.ok(lf.includes("const _va = _agentPairVote(a, pair, a.score||0);") && lf.includes('if(Math.abs(_va) > 0.05) updateRegimeFitness(a, _regime, (_va > 0 ? 1 : -1) * pnlPct'))   // [POIDS PAR ATTRIBUTION 16/09] porte régime sur le vote aligné;
  const c = code(lf);
  assert.strictEqual(count(c, 'a.score > 0') + count(c, 'a.score < 0') + count(c, 'Math.abs(a.score)'), 0);
  assert.ok(s03.includes('agentScore: _agentPairVote(agent, pair, agent.score || 0),'));
});
T('09b1 : « roster » absent du snapshot (ps.roster reste en RAM, aucune clé 09b1/09b2 ajoutée) ; 09c non touché (0 _agentPairVote)', () => {
  assert.strictEqual(count(s9b1, 'roster'), 0);
  assert.strictEqual(count(rd('js/09b2-save-load.js'), 'roster'), 0);
  assert.strictEqual(count(code(rd(F9C)), '_agentPairVote'), 0);
});

/* ═══════════════════════════ B · DYNAMIQUE ═══════════════════════════ */
console.log('\n── B · dynamique : runRosterAnalysis RÉEL + tranche consensus RÉELLE de 10f ──');
const TIERS_TXT  = between(s03, 'const ROSTER_TIERS = {', '\n};', 'ROSTER_TIERS') + '\n};';
const ROSTER_TXT = between(s03, 'function runRosterAnalysis(pair) {', '\n// ════', 'runRosterAnalysis + _agentPairVote');
const CONS_TXT   = between(s10f, "  try { if (typeof window !== 'undefined' && window._perfOp) window._perfOp('roster:' + pair); } catch(e) {}", '  const lmsrProb  = lmsrP(ps);', 'tranche consensus 10f');
const OPP_TXT    = between(s10f, '    const oppWeight=', '\n', 'oppWeight');
const LEARN_TXT  = between(s03, 'function learnFromOutcome(source, pnlPct, pair) {', '\nconst METAPHOR_TEMPLATES', 'learnFromOutcome');
const ANGLE_TXT  = between(s12, 'function _angleAnswer(a, angle, pair, side) {', '\nfunction _taskMerit(', '_angleAnswer');
assert.ok(ROSTER_TXT.includes('function _agentPairVote('), 'ROSTER_TXT doit inclure le helper');
assert.ok(CONS_TXT.includes('const agentConsensus'), 'CONS_TXT doit inclure agentConsensus');

const TIERS = new Function(TIERS_TXT + '\nreturn ROSTER_TIERS;')();
const BOT_IDS = ['exec_bot_v1', 'arb_bot_v1', 'scalper_bot_v1', 'fiscal_bot_v1', 'dca_bot_v1', 'rescue_bot_v1', 'rebalance_bot_v1', 'smart_sizer_v1'];   // + risk_bot_v1 (gardien, isBot)
function mkAgents(fit) {
  const A = [];
  TIERS.scouts.forEach(id => A.push({ id, name: id, emoji: '·', type: 'x·y', domain: 'd', source: 's/t', score: 0.42, conf: 0.66, fitness: fit, memory: [], streak: 0, errors: 0, corrections: 0 }));
  TIERS.council.forEach(id => A.push({ id, name: id, emoji: '·', type: 'x·y', domain: 'd', source: 's/t', score: -0.31, conf: 0.55, fitness: fit, memory: [], streak: 0, errors: 0, corrections: 0 }));
  TIERS.guardians.forEach(id => A.push({ id, name: id, emoji: '·', type: 'x·y', domain: 'd', source: 's/t', score: 0.0, conf: 0.5, fitness: fit, memory: [], streak: 0, errors: 0, corrections: 0, isBot: id === 'risk_bot_v1', isMeta: id === 'evolver_v1' }));
  BOT_IDS.forEach(id => A.push({ id, name: id, emoji: '🤖', type: 'x·y', domain: 'd', source: 's/t', score: 0.0, conf: 0.5, fitness: fit, memory: [], streak: 0, errors: 0, corrections: 0, isBot: true }));
  return A;   // 31 agents comme 02 : 21 de signal (13 scouts + 7 conseil + security_v1), 9 bots, 1 méta
}
const DIR = { 'BTC/USDT': 1, 'ETH/USDT': -1, 'SOL/USDT': 1 };
function mkCtx() {
  const ops = [], ctx = { console, Math, Date, Object, Array, Number, String, JSON, Set, Map, ops };
  ctx.window = { _perfOp: n => ops.push(n) };
  ctx.S = { agents: mkAgents(800), pairStates: { 'BTC/USDT': { price: 1 }, 'ETH/USDT': { price: 1 }, 'SOL/USDT': { price: 1 } },
            mutedAgents: [], tradingAccount: 500, cycle: 7, tradingMode: 'paperReal', chainLog: [], learningHistory: [], botFleet: null, agentPairSkill: undefined };   // [ÉCOLE 17/09] tradingMode paperReal : les jugements ne s'exercent qu'en mode réel
  ctx.scoutAnalysis = (id, pair) => ({ score: 0.6 * DIR[pair] * (id === 'volume_v1' ? 0.5 : 1), conf: 0.7, reasoning: 'stub ' + pair });
  ctx.councilVote   = (id, pair) => ({ vote: DIR[pair] > 0 ? 'long' : 'short', score: 0.5 * DIR[pair], quote: 'stub' });
  ctx.guardianCheck = (id, verdict, pair) => ({ status: (pair === 'SOL/USDT' && id === 'security_v1') ? 'veto' : 'approve', reasoning: 'stub' });
  ctx.detectMarketRegime = () => 'calm';
  ctx.getContextualWeight = a => a.fitness || 1;
  vm.createContext(ctx);
  vm.runInContext(TIERS_TXT + '\n' + ROSTER_TXT, ctx);
  vm.runInContext('function _consensus(pair, ps) {\n' + CONS_TXT + '\n  return { agentConsensus, _votes, totalFitness, _voteOf, _signalAgents }; }', ctx);
  vm.runInContext('function _opp(posDir, _voteOf, totalFitness) {\n' + OPP_TXT + '\n  return oppWeight; }', ctx);
  return ctx;
}
const J = x => JSON.parse(JSON.stringify(x));   // objets du vm : comparaison par valeur
const snapSig = (S) => JSON.stringify(S.agents.filter(a => !a.isBot && !a.isMeta).map(a => [a.id, a.score, a.conf]));

T('roster BTC : ps.roster.votes publiés (scout = score, conseil = ±magnitude, gardien ok = +0.05) ; résultat retourné = même API (09c/04/03) ; aucun a.score / a.conf d\'agent de signal modifié', () => {
  const c = mkCtx(); const before = snapSig(c.S);
  const r = vm.runInContext("runRosterAnalysis('BTC/USDT')", c);
  const ps = c.S.pairStates['BTC/USDT'];
  assert.ok(ps.roster && ps.roster.votes && ps.roster.ts > 0 && ps.roster.cycle === 7);
  assert.strictEqual(ps.roster.votes.macro_v1, 0.6); assert.strictEqual(ps.roster.votes.volume_v1, 0.3);
  assert.strictEqual(ps.roster.votes.scalper_v2, 0.5); assert.strictEqual(ps.roster.votes.security_v1, 0.05);
  assert.strictEqual(Object.keys(ps.roster.votes).length, 23);
  assert.deepStrictEqual(Object.keys(JSON.parse(JSON.stringify(r))).sort(), ['anyVeto', 'coalition', 'consensus', 'councilResults', 'finalDecision', 'guardianResults', 'pair', 'scoutResults', 'skillWeighted', 'verdict', 'votes'].sort());
  assert.strictEqual(r.verdict, 'LONG'); assert.strictEqual(r.anyVeto, false);
  assert.strictEqual(snapSig(c.S), before);
});
T('roster ETH puis BTC : un roster PAR PAIRE (ETH négatif, BTC intact) ; 10 appels de suite → a.score / a.conf des 21 agents de signal byte-identiques (stables sans clôture)', () => {
  const c = mkCtx(); const before = snapSig(c.S);
  vm.runInContext("runRosterAnalysis('BTC/USDT'); runRosterAnalysis('ETH/USDT')", c);
  assert.strictEqual(c.S.pairStates['ETH/USDT'].roster.votes.macro_v1, -0.6);
  assert.strictEqual(c.S.pairStates['ETH/USDT'].roster.votes.scalper_v2, -0.5);
  assert.strictEqual(c.S.pairStates['BTC/USDT'].roster.votes.macro_v1, 0.6);
  for (let i = 0; i < 10; i++) vm.runInContext("runRosterAnalysis(['BTC/USDT','ETH/USDT','SOL/USDT'][" + i + " % 3])", c);
  assert.strictEqual(snapSig(c.S), before);
});
T('10f : consensus(BTC) > +0.3 et consensus(ETH) < −0.3 sur les MÊMES agents — signes opposés (avant : un scalaire global, même valeur pour toutes les paires) ; roster frais marqué _perfOp(\'roster:paire\')', () => {
  const c = mkCtx(); const before = snapSig(c.S);
  const b = vm.runInContext("_consensus('BTC/USDT', S.pairStates['BTC/USDT'])", c);
  const e = vm.runInContext("_consensus('ETH/USDT', S.pairStates['ETH/USDT'])", c);
  assert.ok(b.agentConsensus > 0.3, 'BTC ' + b.agentConsensus);
  assert.ok(e.agentConsensus < -0.3, 'ETH ' + e.agentConsensus);
  assert.ok(Math.sign(b.agentConsensus) !== Math.sign(e.agentConsensus));
  assert.deepStrictEqual(c.ops, ['roster:BTC/USDT', 'roster:ETH/USDT']);
  assert.strictEqual(snapSig(c.S), before);
  assert.strictEqual(b._signalAgents.length, 21);
});
T('bots / méta : jamais de vote (0) → hors consensus ; le miroir « statut de flotte → score des bots » est conservé tel quel', () => {
  const c = mkCtx(); c.S.botFleet = { exec_bot_v1: { status: 'executing' }, dca_bot_v1: { status: 'alert' } };
  const b = vm.runInContext("_consensus('BTC/USDT', S.pairStates['BTC/USDT'])", c);
  const exec = c.S.agents.find(a => a.id === 'exec_bot_v1'), dca = c.S.agents.find(a => a.id === 'dca_bot_v1'), evo = c.S.agents.find(a => a.id === 'evolver_v1');
  assert.strictEqual(exec.score, 0.3); assert.strictEqual(dca.score, -0.4);
  assert.strictEqual(b._voteOf(exec), 0); assert.strictEqual(b._voteOf(dca), 0);
  assert.strictEqual(b._voteOf(evo), 0.05);   // gardien méta : vote publié mais exclu du consensus (isMeta) — _signalAgents ne le contient pas
  assert.ok(!b._signalAgents.some(a => a.isBot || a.isMeta));
});
T('agent muet (S.mutedAgents) : vote 0 dans ps.roster (scout, conseil), gardien muet = +0.05 ; consensus BTC reste > 0 ; démuté → vote rétabli', () => {
  const c = mkCtx(); c.S.mutedAgents = ['volume_v1', 'scalper_v2', 'security_v1'];
  const b = vm.runInContext("_consensus('SOL/USDT', S.pairStates['SOL/USDT'])", c);
  const v = c.S.pairStates['SOL/USDT'].roster.votes;
  assert.strictEqual(v.volume_v1, 0); assert.strictEqual(v.scalper_v2, 0); assert.strictEqual(v.security_v1, 0.05);
  assert.ok(b.agentConsensus > 0.3);
  c.S.mutedAgents = [];
  vm.runInContext("runRosterAnalysis('SOL/USDT')", c);
  assert.strictEqual(c.S.pairStates['SOL/USDT'].roster.votes.volume_v1, 0.3);
  assert.strictEqual(c.S.pairStates['SOL/USDT'].roster.votes.security_v1, -0.5);   // veto gardien (stub) = −0.5, comme avant dans a.score
});
T('sans roster (runRosterAnalysis en erreur) : consensus = 0 — pas de décision sur du faux ; _agentPairVote rend le repli', () => {
  const c = mkCtx();
  vm.runInContext("runRosterAnalysis = function(){ throw new Error('KO'); };", c);
  const b = vm.runInContext("_consensus('BTC/USDT', S.pairStates['BTC/USDT'])", c);
  assert.strictEqual(b.agentConsensus, 0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(b._votes)), {});
  assert.strictEqual(vm.runInContext("_agentPairVote(S.agents[0], 'BTC/USDT', 0.77)", c), 0.77);
  assert.strictEqual(vm.runInContext("_agentPairVote(S.agents[0], 'BTC/USDT')", c), 0);
});
T('_agentPairVote : vote de la paire quand le roster existe ; repli pour un bot (pas de vote) ; multiplexage — un autre S.pairStates (autre mode) n\'a pas ce roster', () => {
  const c = mkCtx();
  vm.runInContext("runRosterAnalysis('BTC/USDT')", c);
  assert.strictEqual(vm.runInContext("_agentPairVote(S.agents.find(a => a.id === 'macro_v1'), 'BTC/USDT', -9)", c), 0.6);
  assert.strictEqual(vm.runInContext("_agentPairVote(S.agents.find(a => a.id === 'exec_bot_v1'), 'BTC/USDT', -9)", c), -9);
  assert.strictEqual(vm.runInContext("_agentPairVote(S.agents.find(a => a.id === 'macro_v1'), 'ETH/USDT', -9)", c), -9);
  const modeA = c.S.pairStates; c.S.pairStates = { 'BTC/USDT': { price: 2 } };   // autre mode : mêmes clés, autre objet
  assert.strictEqual(vm.runInContext("_agentPairVote(S.agents.find(a => a.id === 'macro_v1'), 'BTC/USDT', -9)", c), -9);
  c.S.pairStates = modeA;
  assert.strictEqual(vm.runInContext("_agentPairVote(S.agents.find(a => a.id === 'macro_v1'), 'BTC/USDT', -9)", c), 0.6);
});
T('sortie « Signal inversé » : position LONG sur ETH (20 votants contre sur 21) → oppWeight = 0.95 > 0.75 ; sur BTC → 0 ; avec l\'ancien dénominateur (31 agents) le seuil 0.75 était inatteignable (21/31 ≈ 0.68)', () => {
  const c = mkCtx();
  const opp = (pair, posDir) => vm.runInContext("(function(){ const r = _consensus('" + pair + "', S.pairStates['" + pair + "']); return [_opp(" + posDir + ", r._voteOf, r.totalFitness), r.totalFitness]; })()", c);
  const [oE, tf] = opp('ETH/USDT', 1);
  assert.ok(Math.abs(oE - 20 / 21) < 1e-9 && oE > 0.75, 'ETH long : ' + oE);   // 20 votants contre / 21 de signal (security_v1 approuve à +0.05 : neutre)
  assert.strictEqual(tf, 21 * 800);
  assert.strictEqual(opp('BTC/USDT', 1)[0], 0);
  assert.ok(opp('BTC/USDT', -1)[0] > 0.75);   // position SHORT sur BTC : les votants sont contre
  const all = c.S.agents.reduce((s, a) => s + a.fitness, 0);
  assert.ok(21 * 800 / all < 0.75, 'ancien dénominateur : ' + (21 * 800 / all).toFixed(3));
});

/* ── learnFromOutcome RÉEL : le juge lit le vote de la paire ── */
console.log('\n── B2 · learnFromOutcome RÉEL (03) et _angleAnswer RÉEL (12) : jugés sur le vote de la paire ──');
function mkLearnCtx() {
  const c = mkCtx();
  c.calls = { regime: [], memory: [], evo: [] };
  c.updateRegimeFitness = (a) => c.calls.regime.push(a.id);
  c.enrichMemory = (a, won, pnl, pair) => c.calls.memory.push([a.id, won, pair]);
  c.triggerEvolution = a => c.calls.evo.push(a.id);
  c.nowStr = () => '00:00:00'; c.rndHash = () => 'h';
  vm.runInContext(between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', 'fitJudge') + 'window._fitJudge = _fitJudge;', c);   // [FITNESS GLISSANTE 16/09]
  vm.runInContext(LEARN_TXT, c);
  return c;
}
T('learnFromOutcome(\'trade\', +1.5, BTC) : macro_v1 (a.score = −0.9, vote BTC = +0.6) est ALIGNÉ (avant : jugé sur a.score → faux) → streak 1, jugement +1 (fitness glissante : inchangée avant 5), agentPairSkill[macro_v1][BTC].w = 1, mémoire won', () => {
  const c = mkLearnCtx(); const macro = c.S.agents.find(a => a.id === 'macro_v1'); macro.score = -0.9;
  vm.runInContext("runRosterAnalysis('BTC/USDT'); learnFromOutcome('trade', 1.5, 'BTC/USDT')", c);
  assert.strictEqual(macro.streak, 1); assert.strictEqual(macro._judgments.length, 1); assert.strictEqual(macro._judgments[0].s, 1); assert.strictEqual(macro.fitness, 800, '[FITNESS GLISSANTE] < 5 jugements : fitness de naissance conservée');
  assert.deepStrictEqual(J(c.S.agentPairSkill.macro_v1['BTC/USDT']), { w: 1, l: 0 });
  assert.ok(c.calls.memory.some(m => m[0] === 'macro_v1' && m[1] === true && m[2] === 'BTC/USDT'));
  assert.deepStrictEqual(J(c.S.agentPairSkill.scalper_v2['BTC/USDT']), { w: 1, l: 0 });   // conseil long sur BTC, gagné
});
T('learnFromOutcome(\'trade\', +1.5, ETH) : votes ETH négatifs, trade gagné → tous les votants INCORRECTS (errors 1, l = 1, jugement −1) ; porte régime appelée pour les 20 votants |vote| > 0.05 seulement (gardien +0.05 exclu, bots score 0 exclus)', () => {
  const c = mkLearnCtx();
  vm.runInContext("runRosterAnalysis('ETH/USDT'); learnFromOutcome('trade', 1.5, 'ETH/USDT')", c);
  const macro = c.S.agents.find(a => a.id === 'macro_v1'), swing = c.S.agents.find(a => a.id === 'swing_v2');
  assert.strictEqual(macro.errors, 1); assert.strictEqual(macro._judgments[0].s, -1); assert.strictEqual(macro.fitness, 800, '[FITNESS GLISSANTE] < 5 jugements : inchangée'); assert.deepStrictEqual(J(c.S.agentPairSkill.macro_v1['ETH/USDT']), { w: 0, l: 1 });
  assert.strictEqual(swing.errors, 1); assert.deepStrictEqual(J(c.S.agentPairSkill.swing_v2['ETH/USDT']), { w: 0, l: 1 });
  assert.deepStrictEqual([...new Set(c.calls.regime)].sort(), [...TIERS.scouts, ...TIERS.council].sort());
});
T('learnFromOutcome sur une paire SANS roster (XRP) : repli a.score — agent à +0.4 aligné si gagné (comportement d\'avant, inchangé) ; bots/méta jamais jugés sur un vote', () => {
  const c = mkLearnCtx(); c.S.pairStates['XRP/USDT'] = { price: 1 };
  const macro = c.S.agents.find(a => a.id === 'macro_v1'); macro.score = 0.4;
  const swing = c.S.agents.find(a => a.id === 'swing_v2'); swing.score = -0.31;
  vm.runInContext("learnFromOutcome('trade', 1.0, 'XRP/USDT')", c);
  assert.strictEqual(macro.streak, 1); assert.deepStrictEqual(J(c.S.agentPairSkill.macro_v1['XRP/USDT']), { w: 1, l: 0 });
  assert.strictEqual(swing.errors, 1);
  const exec = c.S.agents.find(a => a.id === 'exec_bot_v1'); assert.strictEqual(exec.streak, 0); assert.strictEqual(exec.errors, 0);
});
T('12 _angleAnswer RÉEL : direction/timing lus sur le vote de LA paire (macro_v1 a.score = −0.9, vote BTC +0.6 → direction long = +1, timing = 1 ; ETH → −1) ; sans roster → repli a.score (−1)', () => {
  const c = mkCtx(); vm.runInContext(ANGLE_TXT, c);
  vm.runInContext("runRosterAnalysis('BTC/USDT'); runRosterAnalysis('ETH/USDT')", c);
  const macro = c.S.agents.find(a => a.id === 'macro_v1'); macro.score = -0.9;
  const ask = (angle, pair, side) => vm.runInContext("_angleAnswer(S.agents.find(a => a.id === 'macro_v1'), '" + angle + "', '" + pair + "', '" + side + "')", c);
  assert.strictEqual(ask('direction', 'BTC/USDT', 'long'), 1);
  assert.strictEqual(ask('direction', 'ETH/USDT', 'long'), -1);
  assert.strictEqual(ask('direction', 'ETH/USDT', 'short'), 1);
  assert.strictEqual(ask('timing', 'BTC/USDT', 'long'), 1);
  c.S.pairStates['XRP/USDT'] = { price: 1 };
  assert.strictEqual(ask('direction', 'XRP/USDT', 'long'), -1);
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
