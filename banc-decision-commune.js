// banc-decision-commune.js — [DÉCISION COMMUNE · 27/09/2026] VERSION 20260927g
// Rams (27/09 11:34) : « je pensais que les bots rassemblaient toutes leurs infos, leurs analyses et leur savoir vécu, avec l'appui de leur
// hybride dédié, et qu'une décision tombait par un consensus commun pour ouvrir ou fermer un trade ». Go 11:41.
// Fonctions RÉELLES de 03 en vm (moteur de fitness + moteur de la décision commune + _agentPairVote) ; textes livrés de 02, 04, 07, 09b1,
// 09b2, 10f. Le rejeu de l'app entière (81 h, 9 fenêtres) est dans la passation.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = v => JSON.parse(JSON.stringify(v));
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'),
  s07 = rd('js/07-v90-mode-bunker-sos.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s10f = rd('js/10f-resolveur-cycle.js');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false) + '\nwindow._fitJudge = _fitJudge;\n';
const DC = between(s03, 'const _DC_BOTS = [', 'window._botPredict = _botPredict;', false);
const APV = between(s03, 'function _agentPairVote(a, pair, fallback) {', '\n}\n', true);
const candles = (n, c) => Array.from({ length: n }, (_, i) => ({ o: c(i), h: c(i) * 1.001, l: c(i) * 0.999, c: c(i) }));
function mk(o) {
  o = o || {};
  const S = Object.assign({ tradingMode: 'paperReal', _realJudgments: 7, agents: [], pairStates: {} }, o.S || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, PAIRS: o.PAIRS || {},
    getTechSignals: o.tech || (() => null), lmsrP: ps => (ps.qYes || 50) / ((ps.qYes || 50) + (ps.qNo || 50)),
    _getPairReturns: o.ret || (() => null), _getPairCorrelation: o.corr || (() => null), learnFromOutcome: o.lfo || (() => {}) };
  c.window._consultDisciples = o.disc || (() => ({ mod: 1 }));
  vm.createContext(c); vm.runInContext(JUDGE + '\n' + APV + '\n' + DC, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
const Jn = (n, s, w) => Array.from({ length: n }, () => ({ s, w: w || 1, k: 0 }));
console.log('▶ banc-decision-commune');

T('M1 · bilan mesuré (_dcMerit) : moins de 5 actes → 0 ; se trompe au moins autant qu\'il a raison → 0 ; sinon E = (justes − fausses) pondérées, sur la fenêtre de la fitness (60)', () => {
  const t = mk();
  const m = js => t.c._dcMerit({ _judgments: js });
  assert.strictEqual(m(Jn(4, 1)), 0, '4 actes : pas de preuve');
  assert.strictEqual(m([].concat(Jn(3, 1), Jn(3, -1))), 0, 'autant de justes que de fausses : 0');
  assert.strictEqual(m([].concat(Jn(2, 1), Jn(4, -1))), 0, 'négatif : 0, jamais un poids négatif');
  assert.ok(Math.abs(m([].concat(Jn(6, 1), Jn(2, -1))) - 0.5) < 1e-9, '6 justes / 2 fausses : E = 0,5');
  assert.ok(Math.abs(m([{ s: 1, w: 3, k: 0 }, { s: -1, w: 1, k: 0 }, { s: 1, w: 1, k: 0 }, { s: 1, w: 1, k: 0 }, { s: -1, w: 1, k: 0 }]) - 3 / 7) < 1e-9, 'pondéré');
  assert.strictEqual(m([].concat(Jn(60, -1), Jn(60, 1))), 1, 'fenêtre de 60 : les anciens actes sortent');
});

T('M2 · lecture d\'une paire par chaque bot (_botView) = mêmes règles que son scan : Scalper (LMSR décollé > 12 pts + volatilité), Arbitrage (retard > 2,5 % sur une paire corrélée > 0,65 → long), DCA (calme + bas 15 % de la fourchette → long)', () => {
  const ps = { price: 100, qYes: 70, qNo: 30, candles: candles(20, i => 100 + (i % 5)) };
  let t = mk({ S: { pairStates: { 'SOL/USDT': ps } }, tech: () => ({ raw: { stddev: { cv: 0.002 }, adx: { adx: 30 } } }) });
  assert.deepStrictEqual(J(t.run("_botView('scalper_bot_v1', 'SOL/USDT')")), { dir: 1 });
  ps.qYes = 30; ps.qNo = 70; assert.deepStrictEqual(J(t.run("_botView('scalper_bot_v1', 'SOL/USDT')")), { dir: -1 });
  ps.qYes = 55; ps.qNo = 45; assert.strictEqual(t.run("_botView('scalper_bot_v1', 'SOL/USDT')"), null, '55 % : pas décollé');
  t = mk({ S: { pairStates: { 'SOL/USDT': Object.assign({}, ps, { qYes: 80, qNo: 20 }) } }, tech: () => ({ raw: { stddev: { cv: 0.0005 } } }) });
  assert.strictEqual(t.run("_botView('scalper_bot_v1', 'SOL/USDT')"), null, 'sans volatilité : rien');
  const R = { 'SOL/USDT': Array(20).fill(0.0005), 'ETH/USDT': Array(20).fill(0.002), 'BTC/USDT': Array(20).fill(0.0005) };
  t = mk({ S: { pairStates: { 'SOL/USDT': ps } }, PAIRS: { 'SOL/USDT': {}, 'ETH/USDT': {}, 'BTC/USDT': {} }, ret: p => R[p], corr: (a, b) => ((a + b).includes('ETH') ? 0.8 : 0.3) });
  assert.deepStrictEqual(J(t.run("_botView('arb_bot_v1', 'SOL/USDT')")), { dir: 1 }, 'SOL en retard de 3 % sur ETH (corr 0,8)');
  t = mk({ S: { pairStates: { 'SOL/USDT': ps } }, PAIRS: { 'SOL/USDT': {}, 'ETH/USDT': {} }, ret: p => R[p], corr: () => 0.5 });
  assert.strictEqual(t.run("_botView('arb_bot_v1', 'SOL/USDT')"), null, 'pas assez corrélée');
  const lowPs = { price: 100.1, candles: candles(20, i => 100 + i * 0.05) };
  t = mk({ S: { pairStates: { 'BTC/USDT': lowPs } }, tech: () => ({ raw: { stddev: { cv: 0.001 }, adx: { adx: 15 } } }) });
  assert.deepStrictEqual(J(t.run("_botView('dca_bot_v1', 'BTC/USDT')")), { dir: 1 }, 'bas de fourchette, marché calme');
  lowPs.price = 100.9; assert.strictEqual(t.run("_botView('dca_bot_v1', 'BTC/USDT')"), null, 'haut de fourchette');
  assert.strictEqual(t.run("_botView('exec_bot_v1', 'BTC/USDT')"), null, 'les autres bots ne votent pas');
});

T('M3 · consensus (_dcConsensus) : Σ bilan × voix / Σ bilan de TOUTES les voix qui ont un bilan (l\'abstention dilue) ; une voix sans bilan positif ne compte pas ; le bot pèse son bilan × l\'avis de ses hybrides ; le composite est une voix ; C borné à ±1', () => {
  const agents = [
    { id: 'a1', _judgments: [].concat(Jn(6, 1), Jn(2, -1)) },   // E 0,5
    { id: 'a2', _judgments: [].concat(Jn(3, 1), Jn(1, -1), Jn(1, -1), Jn(1, 1)) },   // 4 justes / 2 fausses : E 1/3
    { id: 'a3', _judgments: Jn(10, -1) },                        // se trompe : 0
    { id: 'a4', _judgments: Jn(3, 1) },                          // 3 actes : pas de preuve
    { id: 'arb_bot_v1', isBot: true, _judgments: Jn(8, 1) },      // E 1
    { id: 'rescue_bot_v1', isBot: true, _judgments: Jn(8, 1) },   // bot de protection : pas une voix de trading
    { id: 'evolver_v1', isMeta: true, _judgments: Jn(8, 1) }];
  const R = { 'SOL/USDT': Array(20).fill(0.0005), 'ETH/USDT': Array(20).fill(0.002) };
  const ps = { price: 100, candles: candles(20, () => 100) };
  const base = { S: { agents, pairStates: { 'SOL/USDT': ps } }, PAIRS: { 'SOL/USDT': {}, 'ETH/USDT': {} }, ret: p => R[p], corr: () => 0.9 };
  const votes = { a1: 0.6, a2: -0.3, a3: 0.9, a4: 0.9 };
  let t = mk(base); t.c.__v = votes;
  let r = J(t.run("_dcConsensus('SOL/USDT', a => __v[a.id] || 0, null)"));
  // den = 0,5 + 1/3 + 1 (arb) ; num = 0,5×0,6 − (1/3)×0,3 + 1×1 (arb : SOL en retard → long)
  const den = 0.5 + 1 / 3 + 1, num = 0.5 * 0.6 - (1 / 3) * 0.3 + 1;
  assert.ok(Math.abs(r.C - num / den) < 1e-9, JSON.stringify(r)); assert.strictEqual(r.n, 3);
  assert.deepStrictEqual(r.top.map(x => x.id), ['arb_bot_v1', 'a1', 'a2']);
  t = mk(Object.assign({}, base, { disc: () => ({ mod: 0.85 }) })); t.c.__v = votes;
  r = J(t.run("_dcConsensus('SOL/USDT', a => __v[a.id] || 0, null)"));
  assert.ok(Math.abs(r.C - (0.5 * 0.6 - (1 / 3) * 0.3 + 0.85) / den) < 1e-9, 'hybrides contre : la voix du bot ×0,85');
  t = mk(Object.assign({}, base, { ret: () => null })); t.c.__v = { a1: 0.6 };
  r = J(t.run("_dcConsensus('SOL/USDT', a => __v[a.id] || 0, null)"));
  assert.ok(Math.abs(r.C - 0.3 / den) < 1e-9, 'a2 et l\'Arbitrage prouvés mais muets : ils diluent (C = 0,3 / 1,83)');
  t = mk(base); t.S.dcVoices = { composite: { id: 'composite', _judgments: Jn(5, 1) } }; t.c.__v = {};
  r = J(t.run("_dcConsensus('SOL/USDT', a => __v[a.id] || 0, -0.8)"));
  assert.ok(Math.abs(r.C - (1 - 0.8) / (den + 1)) < 1e-9, 'composite prouvé (E 1) : une voix comme les autres ' + JSON.stringify(r));
  t = mk({ S: { agents: [{ id: 'x', _judgments: Jn(9, 1) }], pairStates: {} } });
  assert.strictEqual(J(t.run("_dcConsensus('SOL/USDT', () => 2, null)")).C, 1, 'borné à +1');
  assert.deepStrictEqual(J(mk().run("_dcConsensus('SOL/USDT', () => 1, null)")), { C: 0, n: 0, den: 0, top: [], C1: 0, Ch: 0, mode: 'hz' }, 'aucune voix prouvée : 0');   // [BILAN AUX HORIZONS · 27/09] + C1 (bougie), Ch (horizons), mode
});

T('M4 · bilan SUR L\'AVENIR : _dcForwardJudge juge les votes du cycle PRÉCÉDENT (instantané) sur le mouvement survenu depuis — l\'agent est lu tel qu\'il votait alors (_agentPairVote), pas son vote d\'aujourd\'hui ; le composite est jugé pareil ; _dcSnapVotes garde les votes et le composite de maintenant', () => {
  const seen = [];
  const t = mk({ lfo: (src, mv, pair) => { seen.push([src, Math.round(mv * 1000) / 1000, pair, t.c._agentPairVote({ id: 'a1' }, pair, 9), t.c._agentPairVote({ id: 'a2' }, pair, 9), t.c._agentPairVote({ id: 'a1' }, 'ETH/USDT', 7)]); } });
  const ps = { price: 101, roster: { votes: { a1: -0.4, a2: 0.2 } }, _voteSnap: { px: 100, t: 0, votes: { a1: 0.5 }, comp: 0.4, k: 900000 * 2000, tf: '15m' } };   // [HORLOGE PAR MODE · 01/10/2026] la photo porte sa bougie ; jugée à la suivante
  t.S.pairStates['SOL/USDT'] = ps; t.S.realPairCycle = { 'SOL/USDT': 900000 * 2001 };
  assert.strictEqual(t.run("_dcForwardJudge('SOL/USDT', S.pairStates['SOL/USDT'])"), 1);
  assert.deepStrictEqual(seen, [['cycle', 1, 'SOL/USDT', 0.5, 0, 7]], 'vote du cycle précédent (a1 0,5 ; a2 absent → 0) ; une autre paire garde sa lecture normale');
  assert.strictEqual(t.c.window.__voteOverride, null, 'remis à zéro');
  const comp = J(t.S.dcVoices.composite._judgments); assert.strictEqual(comp.length, 1); assert.strictEqual(comp[0].s, 1, 'composite +0,4, marché +1 % : juste');
  assert.ok(Math.abs(comp[0].w - 0.4 * 1 * 3 * 0.7) < 1e-9, 'même poids qu\'un agent : force × |mouvement| × 3 (EV) × 0,7');
  t.run("_dcSnapVotes('SOL/USDT', S.pairStates['SOL/USDT'], -0.2)");
  assert.deepStrictEqual(J(ps._voteSnap.votes), { a1: -0.4, a2: 0.2 }); assert.strictEqual(ps._voteSnap.px, 101); assert.strictEqual(ps._voteSnap.comp, -0.2);
  ps.roster.votes.a1 = 0.9; assert.strictEqual(ps._voteSnap.votes.a1, -0.4, 'copie, pas une référence');
  const t2 = mk(); t2.S.pairStates.X = { price: 100 }; assert.strictEqual(t2.run("_dcForwardJudge('X', S.pairStates.X)"), 0, 'pas d\'instantané : rien');
  const t3 = mk({ S: { tradingMode: 'sim' } }); t3.S.pairStates.X = { price: 102, _voteSnap: { px: 100, votes: {}, comp: 0.9 } }; t3.run("_dcForwardJudge('X', S.pairStates.X)");
  assert.strictEqual(((t3.S.dcVoices || {}).composite || { _judgments: [] })._judgments.length, 0, 'AA : le composite n\'est pas jugé (bougies fabriquées)');
});

T('S1 · 10f livré : le signal = la décision commune (plus 0,3 composite + 0,5 agents + 0,2 LMSR en premier) ; plus d\'alignement LMSR exigé ; bilan sur l\'avenir AVANT le roster, instantané APRÈS ; plus de jugement sur un mouvement déjà vu ; votes et composite gardés à l\'ouverture', () => {
  const c = codeStrict(s10f);
  assert.ok(c.includes('const _dcR = (typeof _dcConsensus === \'function\') ? _dcConsensus(pair, _voteOf, composite) : null;'));
  assert.ok(c.includes('const finalSignal = Math.max(-1, Math.min(1, _dcR ? _dcR.C : _rawFinal * _alignBonus));'));
  assert.ok(c.includes('&& (_dcR ? true : (lmsrAlignBuy  || convOverride));') && c.includes('&& (_dcR ? true : (lmsrAlignSell || convOverride));'));
  const iF = c.indexOf('_dcForwardJudge(pair, ps)'), iR = c.indexOf('runRosterAnalysis(pair); } catch(e) {} }'), iS = c.indexOf('_dcSnapVotes(pair, ps, composite)');
  assert.ok(iF > 0 && iR > iF && iS > iR, 'jugement → roster → instantané');
  assert.ok(!c.includes("learnFromOutcome('cycle',move,pair)") && !c.includes("learnFromOutcome('cycle',pnlPct*0.08,pair)") && !c.includes("learnFromOutcome('cycle',mPnl,pair)"), 'plus aucun jugement sur un mouvement déjà vu');
  assert.ok(c.includes('np._votes = Object.assign({}, (ps.roster && ps.roster.votes) || {}); np._comp = composite;'));
  assert.ok(c.includes('ps._dc = _dcR ? { C: _dcR.C, n: _dcR.n, ts: Date.now() } : null;'));
});

T('S2 · 02 : à la fermeture, jugés sur leurs votes À L\'OUVERTURE (une seule fois) + le composite ; 07 : la bascule relit la décision commune (LMSR seulement si absente) ; 04 : en automatique, aucun bot n\'ouvre seul (voix + affirmation + 🗳) ; 09b1/09b2 : dcVoices sauvegardé et relu', () => {
  const cp = between(s02, 'function closePosition(id, botClose = false) {', '\n}\n', false);
  assert.strictEqual((cp.match(/learnFromOutcome\(/g) || []).length, 1);
  assert.ok(cp.includes("window.__voteOverride = (pos._votes && typeof pos._votes === 'object') ? { pair: pos.pair, votes: pos._votes } : null; learnFromOutcome('position', realisedPct, pos.pair); } finally { window.__voteOverride = null; }"));
  assert.ok(cp.includes('_dcJudgeComposite(pos._comp, realisedPct, 1.3)'));
  const c7 = codeStrict(s07); assert.ok(c7.includes("const _dcC = (ps._dc && typeof ps._dc.C === 'number') ? ps._dc.C : null;") && c7.includes('const brainProb = _dcC !== null ? (0.5 + _dcC / 2) : lmsrP(ps);'));
  const c4 = codeStrict(s04); assert.ok(c4.includes('const _voice = !!(_auto && _bot);') && c4.includes("if(!_reBlock && !_voice && typeof autoOpenPosition === 'function') {") && c4.includes("icon: '🗳'"));
  assert.ok(!c4.includes('const _brake ='), 'le frein est remplacé');
  assert.ok(codeStrict(s9b1).includes('dcVoices: S.dcVoices || {},') && codeStrict(s9b2).includes("if (snap.dcVoices && typeof snap.dcVoices === 'object')") && s9b2.includes("'botMerit','dcVoices','dcThreshold','_botPredictions',"));
});

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
