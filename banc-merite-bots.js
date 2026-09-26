// banc-merite-bots.js — [MÉRITE DES BOTS · 26/09/2026] VERSION 20260926j
// Rams : « les bots sont cassés quasi en permanence » (DAO 26/09 20:04 : les 9 bots à 50 T$). Cause (backups 21, 23, 25/09) :
// learnFromOutcome jugeait chaque bot sur le SIGNE du résultat du système × amplitude → les 9 fenêtres identiques, la fitness du
// système copiée 9 fois, au plancher dès que le système perd, sans revigoration automatique. Désormais un bot est jugé sur SES
// actes vérifiés. Fonctions RÉELLES de 03 (moteur, migration, garde du Risk Bot) et _fitJudge en vm.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s09c = rd('js/09c-auto-open.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s10i = rd('js/10i-intel-bus.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false);
const ENGINE = between(s03, 'var BOT_AUDIT_MS = 30 * 60 * 1000', 'window._botPredict = _botPredict;', false);
const GUARD = between(s03, 'function guardianCheck(guardianId, verdict, pair, stake) {', '\n// ── ORCHESTRATOR ──', false);
const J = v => JSON.parse(JSON.stringify(v));
const MIN = 60000;
function mk(mode, opts) {
  opts = opts || {};
  const S = Object.assign({ tradingMode: mode, _realJudgments: 5, agents: [
    { id: 'arb_bot_v1', isBot: true, fitness: 50, streak: 0, _judgments: Array.from({ length: 60 }, () => ({ s: -1, w: 1, k: 1 })) },
    { id: 'risk_bot_v1', isBot: true, fitness: 50, streak: 0, _judgments: [] },
    { id: 'smart_sizer_v1', isBot: true, fitness: 50, streak: 0, _judgments: [] },
    { id: 'macro_v1', fitness: 640, streak: 2, _judgments: [{ s: 1, w: 1, k: 1 }] },
    { id: 'evolver_v1', isMeta: true, fitness: 400, _judgments: [] }], chainLog: [] }, opts.S || {});
  const px = Object.assign({ 'BTC/USDT': 100 }, opts.px || {}), age = Object.assign({ 'BTC/USDT': 5000 }, opts.age || {});
  const intervals = [];
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, Date, window: { _stateReady: true }, console,
    setInterval: (f) => { intervals.push(f); return intervals.length; }, clearInterval: () => {},
    _rcLastPrice: p => px[p] || 0, _rcPriceAge: p => (p in age ? age[p] : Infinity), saveState: () => { c._saved = (c._saved || 0) + 1; } };
  vm.createContext(c); vm.runInContext(JUDGE + '\nwindow._fitJudge = _fitJudge;\n' + ENGINE, c);
  return { c, S, px, age, intervals, run: code => vm.runInContext(code, c) };
}
console.log('▶ banc-merite-bots');
T('D1 · _botPredict RÉEL : seulement en EV / RE, sur prix réel frais ; sens valide ; une prédiction par bot, paire et sens par demi-heure', () => {
  let t = mk('sim'); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'x')"), false, 'AA : rien');
  t = mk('paperReal', { age: { 'BTC/USDT': 5 * MIN } }); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'x')"), false, 'prix figé : rien');
  t = mk('paperReal');
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'up', 'x')"), false, 'sens invalide');
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'convergence')"), true);
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'convergence')"), false, 'doublon dans la demi-heure');
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'short', 'x')"), true, 'autre sens : accepté');
  assert.strictEqual(t.run("_botPredict('risk_bot_v1', 'BTC/USDT', 'long', 'veto')"), true, 'autre bot : accepté');
  const q = J(t.S._botPredictions[0]); assert.deepStrictEqual([q.bot, q.pair, q.dir, q.px, q.kind], ['arb_bot_v1', 'BTC/USDT', 'long', 100, 'convergence']);
  t = mk('real'); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'x')"), true, 'RE : accepté');
});
T('D2 · _botMeritAudit RÉEL : < 30 min → attend ; bon sens > 0,3 % → jugement +1 (poids = mouvement en %), série +1 ; mauvais sens → −1, série 0 ; < 0,3 % → non concluant, AUCUN jugement ; prix figé → attend ; > 2 h → abandonnée', () => {
  const t = mk('paperReal');
  const P = (bot, dir, ageMin, px0) => t.S._botPredictions.push({ bot, pair: 'BTC/USDT', dir, px: px0 || 100, ts: Date.now() - ageMin * MIN, kind: 'k' });
  t.S._botPredictions = [];
  P('risk_bot_v1', 'short', 10);            // trop récente
  P('risk_bot_v1', 'short', 31, 100.5);     // prix 100 → −0,5 % : le veto avait raison
  P('risk_bot_v1', 'long', 31, 100.5);      // même mouvement dans l'autre sens : tort
  P('risk_bot_v1', 'long', 31, 100.1);      // −0,1 % : non concluant
  P('risk_bot_v1', 'long', 130, 90);        // > 2 h : abandonnée
  assert.strictEqual(t.run('_botMeritAudit()'), 2);
  const bot = t.S.agents.find(a => a.id === 'risk_bot_v1');
  assert.deepStrictEqual(J(bot._judgments.map(j => [j.s, Math.round(j.w * 1000) / 1000])), [[1, 0.498], [-1, 0.498]]);
  assert.strictEqual(bot.streak, 0, 'bonne puis mauvaise : série remise à 0');
  assert.deepStrictEqual([t.S.botMerit.risk_bot_v1.good, t.S.botMerit.risk_bot_v1.bad, t.S.botMerit.risk_bot_v1.inconclusive], [1, 1, 1]);
  assert.strictEqual(t.S._botPredictions.length, 1, 'la récente reste'); assert.strictEqual(t.S._botPredictions[0].px, 100);
  t.age['BTC/USDT'] = 10 * MIN; t.S._botPredictions[0].ts = Date.now() - 40 * MIN;
  assert.strictEqual(t.run('_botMeritAudit()'), 0); assert.strictEqual(t.S._botPredictions.length, 1, 'prix figé : on attend');
  t.age['BTC/USDT'] = 1000; t.px['BTC/USDT'] = 101; assert.strictEqual(t.run('_botMeritAudit()'), 1);
  assert.strictEqual(bot.streak, 0, '+1 % contre un pari short : faux'); assert.strictEqual(t.S._botPredictions.length, 0);
});
T('D3 · _botJudgeMeasured RÉEL (TWAP, Smart Sizer) : en AA rien ; en EV signe = bon/mauvais, poids = |$| ; < 0,001 $ rien ; fitness sur la fenêtre après 5 jugements', () => {
  let t = mk('sim'); assert.strictEqual(t.run("_botJudgeMeasured('smart_sizer_v1', 0.3, 'taille')"), null);
  t = mk('paperReal'); const sz = t.S.agents.find(a => a.id === 'smart_sizer_v1');
  assert.strictEqual(t.run("_botJudgeMeasured('smart_sizer_v1', 0.0004, 'taille')"), null, 'zéro n\'est pas une perte');
  [0.3, 0.2, -0.1, 0.4, 0.1].forEach(v => t.run("_botJudgeMeasured('smart_sizer_v1', " + v + ", 'taille')"));
  assert.strictEqual(sz._judgments.length, 5); assert.strictEqual(sz.fitness, Math.round(350 + 1000 * (0.3 + 0.2 - 0.1 + 0.4 + 0.1) / 1.1), 'fenêtre de SES actes');
  assert.strictEqual(sz.streak, 2); assert.deepStrictEqual([t.S.botMerit.smart_sizer_v1.good, t.S.botMerit.smart_sizer_v1.bad], [4, 1]);
  assert.strictEqual(t.run("_botJudgeMeasured('smart_sizer_v1', NaN, 'x')"), null); assert.strictEqual(t.run("_botJudgeMeasured('smart_sizer_v1', null, 'x')"), null);
});
T('D4 · migration RÉELLE (une fois, après restauration) : fenêtres des bots effacées, fitness neutre 350, série 0 ; agents intouchés ; l\'Évolueur migré aussi (son propre drapeau, 26/09 k) ; journal ; une sauvegarde ; deuxième passage : rien', () => {
  const t = mk('paperReal', { S: { _riskVetoes: [{ x: 1 }] } });
  const mig = t.intervals.find(f => /_botMeritMigrated/.test(String(f)) || true);
  t.intervals.forEach(f => { try { f(); } catch (e) {} });
  const arb = t.S.agents.find(a => a.id === 'arb_bot_v1'), macro = t.S.agents.find(a => a.id === 'macro_v1'), meta = t.S.agents.find(a => a.id === 'evolver_v1');
  assert.deepStrictEqual([arb._judgments.length, arb.fitness, arb.streak], [0, 350, 0]);
  assert.deepStrictEqual([macro.fitness, macro._judgments.length, macro.streak], [640, 1, 2]);
  assert.deepStrictEqual([meta.fitness, meta._judgments.length, t.S._metaMeritMigrated], [350, 0, true], 'Évolueur migré');
  assert.ok(/^Évolueur : fenêtre effacée/.test(t.S.chainLog[1].desc), t.S.chainLog[1].desc);
  assert.strictEqual(t.S._botMeritMigrated, true); assert.strictEqual(t.S._riskVetoes, undefined); assert.strictEqual(t.c._saved, 1);
  assert.ok(/^Bots : 3 fenêtres effacées/.test(t.S.chainLog[0].desc), t.S.chainLog[0].desc);
  arb.fitness = 777; t.intervals.forEach(f => { try { f(); } catch (e) {} }); assert.strictEqual(arb.fitness, 777, 'drapeau posé : plus jamais');
  void mig;
});
T('D5 · guardianCheck RÉEL (Risk Bot) : exposition > 65 % et verdict LONG → prédiction « le prix ira contre » (short) enregistrée — plus de ReferenceError silencieuse ; verdict HOLD → rien ; ≤ 65 % → approuvé', () => {
  const calls = [];
  const S = { openPositions: [{ stakeUsdt: 70 }], portfolio: 100, pairStates: { 'BTC/USDT': { price: 100 } } };
  const c = { S, Math, Number, Object, Array, JSON, window: {}, _botPredict: (...a) => { calls.push(a); return true; }, _genomeOf: () => ({}), getTechSignals: () => null };
  vm.createContext(c); vm.runInContext(GUARD, c);
  const r1 = J(vm.runInContext("guardianCheck('risk_bot_v1', 'LONG', 'BTC/USDT', 10)", c));
  assert.strictEqual(r1.status, 'veto'); assert.deepStrictEqual(calls, [['risk_bot_v1', 'BTC/USDT', 'short', 'veto']]);
  vm.runInContext("guardianCheck('risk_bot_v1', 'SHORT', 'BTC/USDT', 10)", c); assert.deepStrictEqual(calls[1], ['risk_bot_v1', 'BTC/USDT', 'long', 'veto']);
  vm.runInContext("guardianCheck('risk_bot_v1', 'HOLD', 'BTC/USDT', 10)", c); assert.strictEqual(calls.length, 2, 'HOLD : aucun trade refusé');
  S.openPositions = [{ stakeUsdt: 30 }]; assert.strictEqual(J(vm.runInContext("guardianCheck('risk_bot_v1', 'LONG', 'BTC/USDT', 10)", c)).status, 'approve');
});
T('S1 · textes : learnFromOutcome ne juge plus les bots ; propositions / flatten / taille / TWAP branchés ; 10i rejoue la fenêtre sans bots ni méta ; persistance + manifeste ; bandeau « aucun acte vérifié »', () => {
  const lfoStart = s03.indexOf('function learnFromOutcome('), lfo = codeStrict(s03.slice(lfoStart, s03.indexOf('\n}\n', lfoStart)));
  assert.ok(!lfo.includes('botReward') && !lfo.includes('_lastPnlContrib'));
  const c3 = codeStrict(s03);
  ["_botPredict('arb_bot_v1', best.lag, 'long', 'convergence')", "_botPredict('scalper_bot_v1', best.pair, best.side, 'scalp')", "_botPredict('fiscal_bot_v1', worst.pair, worst.side === 'long' ? 'short' : 'long', 'harvest')",
   "_botPredict('dca_bot_v1', best.pair, 'long', 'dca')", "_botPredict('rebalance_bot_v1', skewed.pair, _rbp.side === 'long' ? 'short' : 'long', 'rééquilibrage')", "_botPredict('rescue_bot_v1', p.pair, p.side === 'long' ? 'short' : 'long', 'flatten')",
   "_botJudgeMeasured('smart_sizer_v1', marginal, 'taille')", 'setInterval(_botMeritAudit, 60000);'].forEach(t => assert.ok(c3.includes(t), t));
  assert.ok(!c3.includes('_riskVetoAudit') && !c3.includes('S._riskVetoes.push'), 'ancien audit retiré');
  assert.ok(s09c.includes("S.botFleet.exec_bot_v1.pnlContrib = (S.botFleet.exec_bot_v1.pnlContrib || 0) + saving; if (typeof _botJudgeMeasured === 'function') _botJudgeMeasured('exec_bot_v1', saving, 'twap');"));
  assert.ok(codeStrict(s10i).includes("r = _fitWindowEval(S.agents.filter(function (a) { return a && !a.isBot && !a.isMeta; }));"));
  assert.ok(codeStrict(s9b1).includes('botMerit: S.botMerit || {},') && codeStrict(s9b1).includes('_botMeritMigrated: !!S._botMeritMigrated,'));
  assert.ok(codeStrict(s9b2).includes("'fitWindowRule','botMerit','_botPredictions','_botMeritMigrated',") && codeStrict(s9b2).includes('if (snap._botMeritMigrated)                                               S._botMeritMigrated = true;'));
  assert.ok(codeStrict(s07).includes("elMemText.textContent = 'aucun acte vérifié encore — jugé sur ses propres actes (propositions, vetos, flatten, TWAP, taille), 30 min après';"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
