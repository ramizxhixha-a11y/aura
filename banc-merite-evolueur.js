// banc-merite-evolueur.js — [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] VERSION 20260926k
// L'Évolueur était jugé sur le résultat du système. Désormais chaque évolution ouvre un essai contrefactuel : l'ancien génome vote
// en ombre au même roster, il est jugé sur les MÊMES événements que le nouveau ; après 30 événements, nouveau contre ancien juge
// l'Évolueur. Fonctions RÉELLES de 03 (génome, scouts, conseil, gardiens, moteur d'essai) en vm, données déterministes.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s11b = rd('js/11b-ecran-appris.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
const GENOME = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const TIERS = between(s03, 'const ROSTER_TIERS = {', '\n};', true) + '\n' + between(s03, 'const COUNCIL_ADVISORS = {', '\n};', true);
const SCOUT = between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false);
const COUNCIL = between(s03, 'function councilVote(councilId, pair, scoutResults) {', '\n// ── GUARDIAN CHECKS', false);
const GUARD = between(s03, 'function guardianCheck(guardianId, verdict, pair, stake) {', '\n// ── ORCHESTRATOR ──', false);
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false);
const EVO = between(s03, 'var EVO_TRIAL_N = 30', 'window._evoTrialStart = _evoTrialStart;', false);
const J = v => JSON.parse(JSON.stringify(v));
function mkCtx() {
  const candles = Array.from({ length: 60 }, (_, i) => { const o = 100 + Math.sin(i / 5) * 2, c = o + Math.cos(i / 3) * 0.8; return { o, h: Math.max(o, c) + 0.3, l: Math.min(o, c) - 0.3, c, v: 10 + (i % 7) }; });
  const S = { pairStates: { 'BTC/USDT': { candles, price: candles[59].c, qYes: 300, qNo: 200 } }, agents: [
      { id: 'breakout_v1', fitness: 400, _judgments: [] }, { id: 'trend_v2', fitness: 500, _judgments: [] }, { id: 'evolver_v1', isMeta: true, fitness: 350, streak: 0, _judgments: [] }],
    genome: {}, resonanceHistory: [{ ts: 1, pair: 'X', direction: 'bullish' }], mutedAgents: [], chainLog: [], _realJudgments: 10, openPositions: [], portfolio: 100 };
  const tech = { atScore: 0.35, raw: { rsi: { rsi: 62 }, stddev: { cv: 0.012 }, adx: { adx: 28 }, macd: { hist: 0.4 }, boll: { position: 0.7 }, stoch: { k: 70 } } };
  const c = { S, Math, Number, Object, Array, JSON, Date, isFinite, String, Set, window: {}, console,
    getTechSignals: () => tech, getFundamentalSignals: () => ({ fundScore: 0.1 }), lmsrP: ps => ps.qYes / (ps.qYes + ps.qNo),
    detectHarmonicResonance: () => { S.resonanceHistory.push({ ts: 2, pair: 'BTC/USDT', direction: 'bullish' }); return { direction: 'bullish', strength: 0.6, isResonance: true, bullCount: 4, bearCount: 1 }; } };
  vm.createContext(c);
  vm.runInContext(GENOME + '\n' + TIERS + '\n' + SCOUT + '\n' + COUNCIL + '\n' + GUARD + '\n' + JUDGE + '\nwindow._fitJudge = _fitJudge;\n' + EVO, c);
  return c;
}
console.log('▶ banc-merite-evolueur');
T('D1 · _evoShadowVotes RÉEL : l\'ancien génome vote en ombre (scout ET conseil, sur les résultats RÉELS des scouts) ; le génome courant est remis en place ; l\'historique des résonances n\'est pas pollué ; sans essai → null', () => {
  const c = mkCtx();
  assert.strictEqual(vm.runInContext("_evoShadowVotes('BTC/USDT', {}, 'LONG', 10)", c), null, 'aucun essai');
  // génome courant (nouveau) : breakout plus exigeant ; ancien = défaut
  c.S.genome.breakout_v1 = { win: 20, margin: 0.008, score: 0.3 }; c.S.genome.trend_v2 = { adxMin: 45, atMin: 0.5, score: 0.2, ownW: 0.6, voteThr: 0.18 };
  const newScout = J(vm.runInContext("scoutAnalysis('breakout_v1', 'BTC/USDT')", c));
  const oldGb = J(vm.runInContext("GENOME_DEFAULTS.breakout_v1", c)), oldGt = J(vm.runInContext("GENOME_DEFAULTS.trend_v2", c));
  vm.runInContext('_evoTrialStart("breakout_v1", ' + JSON.stringify(oldGb) + ', { name: "Hybrid Gen-1" }); _evoTrialStart("trend_v2", ' + JSON.stringify(oldGt) + ', { name: "Hybrid Gen-2" });', c);
  const sr = {}; ['macro_v1', 'fundamental_v1', 'nlp_v1', 'sentiment_v2', 'volume_v1', 'volatility_v1', 'corr_v1', 'geopolitic_v1', 'onchain_v1', 'whale_v1', 'breakout_v1', 'harmonic_v1', 'flow_v1'].forEach(id => { try { sr[id] = J(vm.runInContext("scoutAnalysis('" + id + "', 'BTC/USDT')", c)); } catch (e) { sr[id] = { score: 0, conf: 0.3 }; } });
  c.__sr = sr; const hist0 = J(c.S.resonanceHistory);
  const sh = J(vm.runInContext("_evoShadowVotes('BTC/USDT', __sr, 'LONG', 10)", c));
  // attendu : mêmes appels avec l'ancien génome posé directement
  const cRef = mkCtx(); cRef.__sr = sr; cRef.S.genome.trend_v2 = oldGt;
  const refScout = J(vm.runInContext("scoutAnalysis('breakout_v1', 'BTC/USDT')", cRef)), refCouncil = J(vm.runInContext("councilVote('trend_v2', 'BTC/USDT', __sr)", cRef));
  const m = Math.abs(refCouncil.score || 0.3), refVote = refCouncil.vote === 'long' ? m : refCouncil.vote === 'short' ? -m : 0;
  assert.strictEqual(sh.breakout_v1, refScout.score); assert.strictEqual(sh.trend_v2, refVote);
  assert.deepStrictEqual(J(c.S.genome.breakout_v1), { win: 20, margin: 0.008, score: 0.3 }, 'génome courant remis'); assert.strictEqual(c.S.genome.trend_v2.adxMin, 45);
  assert.deepStrictEqual(J(c.S.resonanceHistory), hist0, 'résonances non polluées');
  assert.ok(typeof newScout.score === 'number');
});
function feed(c, id, pairs) {   // pairs : [[voteNouveau, voteAncien, gagné], ...]
  pairs.forEach(([vn, vo, won]) => {
    c.S.pairStates['BTC/USDT'].roster = { shadow: { [id]: vo } };
    c.__a = c.S.agents.find(a => a.id === id);
    vm.runInContext('_evoTrialJudge(__a, "BTC/USDT", ' + won + ', 3, 1, ' + vn + ')', c);
  });
}
T('D2 · _evoTrialJudge / conclusion RÉELS : sans ombre ou quand aucun des deux ne parle → ignoré ; 30 événements → le nouveau génome plus juste = « amélioration » : l\'Évolueur reçoit +1 (poids = écart), série, bilan, journal', () => {
  const c = mkCtx(); vm.runInContext('_evoTrialStart("breakout_v1", {win:20,margin:0.002,score:0.7}, { name: "Hybrid Gen-7", gen: 7 })', c);
  c.__a = c.S.agents[0]; c.S.pairStates['BTC/USDT'].roster = { votes: {} };
  vm.runInContext('_evoTrialJudge(__a, "BTC/USDT", true, 3, 1, 0.5)', c); assert.strictEqual(c.S.evoTrials.breakout_v1.n, 0, 'pas d\'ombre : ignoré');
  feed(c, 'breakout_v1', [[0.02, -0.03, true]]); assert.strictEqual(c.S.evoTrials.breakout_v1.n, 0, 'aucun des deux ne parle');
  const ev = []; for (let i = 0; i < 30; i++) { const won = i % 2 === 0; ev.push([won ? 0.6 : -0.6, i % 3 === 0 ? (won ? 0.6 : -0.6) : (won ? -0.6 : 0.6), won]); }   // nouveau toujours juste, ancien juste 1 fois sur 3
  feed(c, 'breakout_v1', ev);
  assert.strictEqual(c.S.evoTrials.breakout_v1, undefined, 'essai conclu');
  const M = J(c.S.evoMerit), r = M.recent[0], meta = c.S.agents[2];
  assert.deepStrictEqual([M.good, M.bad, M.inconclusive, r.verdict, r.n, r.accNew, r.name], [1, 0, 0, 'amélioration', 30, 100, 'Hybrid Gen-7']);
  assert.ok(r.accOld > 30 && r.accOld < 40, 'ancien ≈ 1 sur 3 : ' + r.accOld);
  assert.strictEqual(meta._judgments.length, 1); assert.strictEqual(meta._judgments[0].s, 1); assert.ok(meta._judgments[0].w > 1.2, 'poids = écart de précision pondérée : ' + meta._judgments[0].w);
  assert.strictEqual(meta.streak, 1);
  assert.ok(/^Évolution jugée · Hybrid Gen-7 \(breakout_v1\) : nouveau génome 100 % contre ancien 3\d(\.\d)? % sur 30 jugements → amélioration$/.test(c.S.chainLog[0].desc), c.S.chainLog[0].desc);
});
T('D3 · verdicts : ancien plus juste → « dégradation » (−1) ; même justesse → « non concluant » (l\'Évolueur n\'est pas jugé) ; essai interrompu à < 10 événements → abandonné ; à ≥ 10 → conclu', () => {
  let c = mkCtx(); vm.runInContext('_evoTrialStart("trend_v2", {adxMin:25}, { name: "G" })', c);
  feed(c, 'trend_v2', Array.from({ length: 30 }, (_, i) => { const won = i % 2 === 0; return [won ? -0.5 : 0.5, won ? 0.5 : -0.5, won]; }));
  assert.strictEqual(c.S.evoMerit.recent[0].verdict, 'dégradation'); assert.strictEqual(c.S.agents[2]._judgments[0].s, -1); assert.strictEqual(c.S.agents[2].streak, 0);
  c = mkCtx(); vm.runInContext('_evoTrialStart("trend_v2", {adxMin:25}, { name: "G" })', c);
  feed(c, 'trend_v2', Array.from({ length: 30 }, (_, i) => { const won = i % 2 === 0; return [won ? 0.5 : -0.5, won ? 0.5 : -0.5, won]; }));
  assert.strictEqual(c.S.evoMerit.recent[0].verdict, 'non concluant'); assert.strictEqual(c.S.agents[2]._judgments.length, 0, 'pas de jugement'); assert.strictEqual(c.S.evoMerit.inconclusive, 1);
  c = mkCtx(); vm.runInContext('_evoTrialStart("trend_v2", {adxMin:25}, { name: "G" })', c); feed(c, 'trend_v2', Array.from({ length: 5 }, () => [0.5, -0.5, true]));
  vm.runInContext('_evoTrialStart("trend_v2", {adxMin:30}, { name: "G2" })', c);
  assert.strictEqual(c.S.evoMerit.dropped, 1); assert.strictEqual(c.S.evoTrials.trend_v2.n, 0); assert.strictEqual(c.S.evoTrials.trend_v2.oldG.adxMin, 30, 'nouvel essai sur le génome qui vient d\'être remplacé');
  feed(c, 'trend_v2', Array.from({ length: 12 }, () => [0.5, -0.5, true]));
  vm.runInContext('_evoTrialStart("trend_v2", {adxMin:40}, { name: "G3" })', c);
  assert.strictEqual(c.S.evoMerit.recent[0].verdict, 'amélioration'); assert.strictEqual(c.S.evoMerit.recent[0].why, 'interrompu : nouvelle évolution du siège');
});
T('S1 · textes : learnFromOutcome ne juge plus l\'Évolueur et juge l\'ombre juste après le vote ; le roster publie l\'ombre ; triggerEvolution capture l\'ancien génome AVANT la mutation et n\'ouvre un essai que si des gènes ont changé ; écran, bandeau, persistance', () => {
  const lfoStart = s03.indexOf('function learnFromOutcome('), lfo = codeStrict(s03.slice(lfoStart, s03.indexOf('\n}\n', lfoStart)));
  assert.ok(!lfo.includes('metaReward') && /if\(a\.isMeta\) \{\n\s*return;\n\s*\}/.test(lfo), 'méta : sortie sans jugement');
  assert.ok(lfo.includes("    const signalStrength= Math.abs(_vote);\n    try { if (S.evoTrials && S.evoTrials[a.id]) _evoTrialJudge(a, pair, won, mag, decay, _vote); } catch(e) {}"));
  assert.ok(codeStrict(s03).includes("try { const _sh = _evoShadowVotes(pair, scoutResults, verdict, (S.tradingAccount || 100) * 0.1); if (_sh) _ps.roster.shadow = _sh; } catch(e) {}"));
  const evo = between(s07, 'function triggerEvolution(weak, opts) {', 'buildAgentCards(); patchAgentCards();\n}', true);
  const iCap = evo.indexOf('const _oldG = '), iEvolve = evo.indexOf('_genomeEvolve(weak.id, _mutation, _peakPrev)'), iStart = evo.indexOf('_evoTrialStart(weak.id, _oldG,');
  assert.ok(iCap > 0 && iEvolve > iCap && iStart > iEvolve, 'capture → mutation → essai');
  assert.ok(evo.includes('if (_ge && _ge.changed > 0 && _oldG && Object.keys(_oldG).length && typeof _evoTrialStart === \'function\')'));
  assert.ok(codeStrict(s11b).includes("title('ÉVOLUTIONS JUGÉES'") && codeStrict(s07).includes("lab.textContent = '🧬 MÉMOIRE RÉELLE';"));
  assert.ok(codeStrict(s9b1).includes('evoTrials: S.evoTrials || {},') && codeStrict(s9b2).includes("'_botMeritMigrated','evoTrials','evoMerit','_metaMeritMigrated',"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
