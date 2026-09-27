// banc-merite-bots.js — [MÉRITE DES BOTS · 26/09/2026] VERSION 20260926j
// Rams : « les bots sont cassés quasi en permanence » (DAO 26/09 20:04 : les 9 bots à 50 T$). Cause (backups 21, 23, 25/09) :
// learnFromOutcome jugeait chaque bot sur le SIGNE du résultat du système × amplitude → les 9 fenêtres identiques, la fitness du
// système copiée 9 fois, au plancher dès que le système perd, sans revigoration automatique. Désormais un bot est jugé sur SES
// actes vérifiés. Fonctions RÉELLES de 03 (moteur, migration, garde du Risk Bot) et _fitJudge en vm.
// [SURVEILLANCE PERMANENTE · 27/09/2026] D1/D2/S1 : plus de 30 min ni de 0,3 % — affirmations jugées au premier franchissement de ±1 ATR,
// une affirmation ouverte par bot / paire / sens, sans limite de temps ; propositions d'ouverture jugées au résultat réel (04, 02).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s09c = rd('js/09c-auto-open.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s10i = rd('js/10i-intel-bus.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false);
const ENGINE = between(s03, 'function _botMeritRow(botId) {', 'window._botPredict = _botPredict;', false);
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
    { id: 'evolver_v1', isMeta: true, fitness: 400, _judgments: [] }], chainLog: [],
    pairStates: { 'BTC/USDT': { price: 100, candles: Array.from({ length: 20 }, () => ({ o: 100, h: 100.5, l: 99.5, c: 100 })) } } }, opts.S || {});   // ATR 1 %
  const px = Object.assign({ 'BTC/USDT': 100 }, opts.px || {}), age = Object.assign({ 'BTC/USDT': 5000 }, opts.age || {});
  const intervals = [];
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, Date, window: { _stateReady: true }, console,
    setInterval: (f) => { intervals.push(f); return intervals.length; }, clearInterval: () => {},
    _rcLastPrice: p => px[p] || 0, _rcPriceAge: p => (p in age ? age[p] : Infinity), saveState: () => { c._saved = (c._saved || 0) + 1; }, _getActiveRealTimeframe: () => '15m' };
  vm.createContext(c); vm.runInContext(JUDGE + '\nwindow._fitJudge = _fitJudge;\n' + ENGINE, c);
  return { c, S, px, age, intervals, run: code => vm.runInContext(code, c) };
}
console.log('▶ banc-merite-bots');
T('D1 · _botPredict RÉEL : seulement en EV / RE, sur prix réel frais ; sens valide ; bornes ±1 ATR posées à la création ; UNE affirmation ouverte par bot, paire et sens (plus de demi-heure) ; sans bougies (pas d\'ATR) : rien', () => {
  let t = mk('sim'); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'x')"), false, 'AA : rien');
  t = mk('paperReal', { age: { 'BTC/USDT': 5 * MIN } }); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'x')"), false, 'prix figé : rien');
  t = mk('paperReal');
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'up', 'x')"), false, 'sens invalide');
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'convergence')"), true);
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'convergence')"), false, 'affirmation déjà ouverte');
  assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'short', 'x')"), true, 'autre sens : accepté');
  assert.strictEqual(t.run("_botPredict('risk_bot_v1', 'BTC/USDT', 'long', 'veto')"), true, 'autre bot : accepté');
  const q = J(t.S._botPredictions[0]); assert.deepStrictEqual([q.bot, q.pair, q.dir, q.px, q.kind, q.atr, q.up, q.dn], ['arb_bot_v1', 'BTC/USDT', 'long', 100, 'convergence', 0.01, 101, 99]);
  t.S._botPredictions[0].ts = Date.now() - 5 * 3600000; assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'convergence')"), false, '5 h plus tard, toujours ouverte : pas de doublon');
  t.px['BTC/USDT'] = 101.2; t.run('_botMeritAudit()'); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'convergence')"), true, 'jugée : le bot peut réaffirmer');
  t = mk('real'); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'x')"), true, 'RE : accepté');
  t = mk('paperReal', { S: { pairStates: { 'BTC/USDT': { price: 100, candles: [] } } } }); assert.strictEqual(t.run("_botPredict('arb_bot_v1', 'BTC/USDT', 'long', 'x')"), false, 'pas d\'ATR : rien');
});
T('D2 · _botMeritAudit RÉEL : jugée au premier franchissement de ±1 ATR, QUEL QUE SOIT le temps écoulé — borne basse : short juste, long faux (poids = mouvement en %) ; entre les bornes : reste ouverte (plus d\'abandon à 2 h) ; ancienne affirmation (30 min) : bornes posées sur son prix ; prix figé : attend', () => {
  const t = mk('paperReal');
  const P = (dir, px0, ageMin, old) => t.S._botPredictions.push(Object.assign({ bot: 'risk_bot_v1', pair: 'BTC/USDT', dir, px: px0, ts: Date.now() - ageMin * MIN, kind: 'k' }, old ? {} : { atr: 0.01, up: px0 * 1.01, dn: px0 * 0.99 }));
  t.S._botPredictions = [];
  P('short', 102, 2);          // prix 100 ≤ 100,98 : le short avait raison
  P('long', 102, 2);           // même franchissement : le long avait tort
  P('long', 100.5, 180);       // 3 h, prix 100 entre 99,495 et 101,505 : reste ouverte
  P('short', 103, 40, true);   // ancienne règle, sans bornes : ATR 1 % posé → 101,97 franchi → juste
  assert.strictEqual(t.run('_botMeritAudit()'), 3);
  const bot = t.S.agents.find(a => a.id === 'risk_bot_v1');
  assert.deepStrictEqual(J(bot._judgments.map(j => [j.s, Math.round(j.w * 100) / 100])), [[1, 1.96], [-1, 1.96], [1, 2.91]]);
  assert.strictEqual(bot.streak, 1); assert.deepStrictEqual([t.S.botMerit.risk_bot_v1.good, t.S.botMerit.risk_bot_v1.bad, t.S.botMerit.risk_bot_v1.inconclusive], [2, 1, 0]);
  assert.strictEqual(t.S._botPredictions.length, 1, 'l\'affirmation non tranchée reste'); assert.strictEqual(t.S._botPredictions[0].px, 100.5);
  t.age['BTC/USDT'] = 10 * MIN; t.px['BTC/USDT'] = 90; assert.strictEqual(t.run('_botMeritAudit()'), 0, 'prix figé : on attend');
  t.age['BTC/USDT'] = 1000; t.px['BTC/USDT'] = 101.6; assert.strictEqual(t.run('_botMeritAudit()'), 1); assert.strictEqual(bot.streak, 2, 'borne haute : le long avait raison');
  assert.strictEqual(t.S._botPredictions.length, 0);
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
  ["_botPredict('fiscal_bot_v1', worst.pair, worst.side === 'long' ? 'short' : 'long', 'harvest')",
   "_botPredict('rebalance_bot_v1', skewed.pair, _rbp.side === 'long' ? 'short' : 'long', 'rééquilibrage')", "_botPredict('rescue_bot_v1', p.pair, p.side === 'long' ? 'short' : 'long', 'flatten')",
   "_botJudgeMeasured('smart_sizer_v1', marginal, 'taille')"].forEach(t => assert.ok(c3.includes(t), t));
  // [SURVEILLANCE PERMANENTE 27/09] propositions d'ouverture : jugées au trade réel (02) ou, refusées, comme affirmation (04) ; audit au battement (08)
  ["_botPredict('arb_bot_v1'", "_botPredict('scalper_bot_v1'", "_botPredict('dca_bot_v1'", 'setInterval(_botMeritAudit'].forEach(t => assert.ok(!c3.includes(t), 'retiré : ' + t));
  assert.ok(codeStrict(rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js')).includes("try { if (typeof _botPredict === 'function') _botPredict(_bot, _pr, _sd, action.type || ''); } catch(e) {}"));
  assert.ok(codeStrict(rd('js/08-learning-history-render.js')).includes('try { if (window._botMeritAudit) window._botMeritAudit(); } catch(e) {}'));
  assert.ok(!c3.includes('_riskVetoAudit') && !c3.includes('S._riskVetoes.push'), 'ancien audit retiré');
  assert.ok(s09c.includes("S.botFleet.exec_bot_v1.pnlContrib = (S.botFleet.exec_bot_v1.pnlContrib || 0) + saving; if (typeof _botJudgeMeasured === 'function') _botJudgeMeasured('exec_bot_v1', saving, 'twap');"));
  assert.ok(codeStrict(s10i).includes("r = _fitWindowEval(S.agents.filter(function (a) { return a && !a.isBot && !a.isMeta; }));"));
  assert.ok(codeStrict(s9b1).includes('botMerit: S.botMerit || {},') && codeStrict(s9b1).includes('_botMeritMigrated: !!S._botMeritMigrated,'));
  assert.ok(codeStrict(s9b2).includes("'fitWindowRule','botMerit','dcVoices','dcThreshold','_botPredictions','_botMeritMigrated',") && codeStrict(s9b2).includes('if (snap._botMeritMigrated)                                               S._botMeritMigrated = true;'));
  assert.ok(codeStrict(s07).includes("elMemText.textContent = 'aucun acte jugé encore — jugé sur ses propres actes : résultat réel de ses trades, affirmations dès que le marché tranche (±1 ATR), TWAP, taille';"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
