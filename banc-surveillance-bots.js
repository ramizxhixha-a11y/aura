// banc-surveillance-bots.js — [SURVEILLANCE PERMANENTE · 27/09/2026] VERSION 20260927a
// Rams : « les bots doivent mener la danse… surveillance en permanence, et dès que l'occasion se présente, ils doivent trader ; je
// ne veux pas de limite de 30 min en dur ». Avant : la flotte ne tournait que quand l'écran l'appelait (ouverture de l'accueil,
// onglet flotte) ; ses propositions attendaient 5 s ; ses affirmations étaient vérifiées 30 min plus tard, sous 0,3 % : rien.
// Code RÉEL en vm : battement (03 _fleetHeartbeat), exécution (04 executePending), moteur de mérite (03), Scalper, Sauvetage,
// Rééquilibrage (03) ; entonnoir, clôture et prix réels simulés.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 7).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = v => JSON.parse(JSON.stringify(v));
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s08 = rd('js/08-learning-history-render.js');
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false) + '\nwindow._fitJudge = _fitJudge;\n';
const ENGINE = between(s03, 'function _botMeritRow(botId) {', 'window._botPredict = _botPredict;', false);
const SETBOT = between(s03, 'function _setBot(id, status, action) {', '\n}\n', true);
const HEART = between(s03, 'function _fleetHeartbeat() {', 'window._fleetHeartbeat = _fleetHeartbeat;', false);
const EXEC = between(s04, 'function executePending(actionId, opts) {', '\nfunction dismissPending(', false);
const SCALP = between(s03, 'function botScalper() {', '\n// ── 4. FISCAL BOT', false);
const RESCUE = between(s03, 'function botRescue() {', '\n// ── 7. REBALANCE BOT', false);
const REBAL = between(s03, 'function botRebalance() {', '\n// ── 8. SMART SIZER', false);
const candles = () => Array.from({ length: 20 }, () => ({ o: 100, h: 100.5, l: 99.5, c: 100 }));   // ATR 1 %
function mk(o) {
  o = o || {};
  const W = { sim: { openPositions: [] }, paperReal: { openPositions: [] }, real: { openPositions: [] } };
  const S = { tradingMode: o.mode || 'paperReal', pendingActions: [], chainLog: [], brainLog: [], botFleet: {}, tradingAccount: 500,
    pairStates: { 'BTC/USDT': { price: 100, stake: 20, candles: candles() }, 'SOL/USDT': { price: 100, stake: 20, candles: candles() } },
    agents: [{ id: 'arb_bot_v1', name: 'Arbitrage', isBot: true, fitness: 350, _judgments: [] }, { id: 'dca_bot_v1', name: 'DCA', isBot: true, fitness: 350, _judgments: [] }] };
  Object.defineProperty(S, 'openPositions', { get: () => W[S.tradingMode].openPositions, set: v => { W[S.tradingMode].openPositions = v; } });
  ['arb_bot_v1', 'dca_bot_v1', 'scalper_bot_v1', 'rescue_bot_v1', 'rebalance_bot_v1', 'fiscal_bot_v1'].forEach(id => { S.botFleet[id] = { status: 'idle', lastAction: '', contributions: 0, pnlContrib: 0 }; });
  const c = { S, W, Math, Number, Object, Array, JSON, isFinite, String, Date, console, setInterval: () => 0, clearInterval: () => {}, toasts: [], opens: [], closes: [], saves: 0, running: Object.assign({ paperReal: true, real: true, sim: false }, o.running || {}),
    allowOpen: o.allowOpen !== false, net: o.net === undefined ? 1 : o.net, propose: o.propose || [] };
  c.window = { _isModeRunning: m => !!c.running[m], _bgResolve: false };
  c.runBotFleet = () => { c.propose.forEach(a => S.pendingActions.unshift(Object.assign({ id: 'x' + Math.random().toString(36).slice(2), ts: Date.now() }, a))); };
  c.autoOpenPosition = (pair, side, stake) => { c.opens.push([S.tradingMode, pair, side, stake]); if (!c.allowOpen || S.openPositions.some(p => p.pair === pair)) { S.brainLog.unshift({ ts: Date.now(), pair, event: 'EVAL', reason: 'veto BRAIN · consensus 12 %' }); return; } S.openPositions.push({ id: 'p' + c.opens.length, pair, side, stakeUsdt: stake, openedAt: Date.now(), auto: true }); };
  c.closePosition = (id, botClose) => { c.closes.push([id, botClose]); const i = S.openPositions.findIndex(p => p.id === id); if (i < 0) return; if (botClose && S.openPositions[i].auto !== true) return; S.openPositions.splice(i, 1); };
  c._learnedNetUsd = () => ({ netUsd: c.net });
  c.showToast = m => c.toasts.push(m); c.renderPendingActions = () => {}; c.saveState = () => { c.saves++; }; c.rndHash = () => 'h'; c.nowStr = () => '00:00';
  c._rcLastPrice = () => 100; c._rcPriceAge = () => 1000; c._getActiveRealTimeframe = () => '15m';
  vm.createContext(c);
  vm.runInContext(JUDGE + '\n' + ENGINE + '\n' + SETBOT + '\n' + HEART + '\n' + EXEC, c);
  return c;
}
const run = (c, code) => vm.runInContext(code, c);
console.log('▶ banc-surveillance-bots');
T('D1 · battement RÉEL : occasion de l\'Arbitrage → trade ouvert TOUT DE SUITE par l\'entonnoir (plus d\'attente de 5 s), marqué pos._bot, journal « 🤖 … ouvert », sauvegarde ; mode en pause : rien ne tourne', () => {
  let c = mk({ running: { paperReal: false }, propose: [{ type: 'arb', source: 'arb_bot_v1', action: 'open_trade', pair: 'SOL/USDT', side: 'long', payload: { pair: 'SOL/USDT', side: 'long' } }] });
  assert.strictEqual(run(c, '_fleetHeartbeat()'), 0); assert.strictEqual(c.opens.length, 0, 'EV en pause : les bots aussi');
  c = mk({ propose: [{ type: 'arb', source: 'arb_bot_v1', action: 'open_trade', pair: 'SOL/USDT', side: 'long', payload: { pair: 'SOL/USDT', side: 'long' } }] });
  assert.strictEqual(run(c, '_fleetHeartbeat()'), 1);
  assert.deepStrictEqual(c.opens, [['paperReal', 'SOL/USDT', 'long', 20]]);
  const p = c.S.openPositions[0]; assert.deepStrictEqual([p.pair, p._bot, p._botKind], ['SOL/USDT', 'arb_bot_v1', 'arb']);
  assert.ok(/^Arbitrage · trade SOL\/USDT LONG ouvert \(arb\)$/.test(c.S.chainLog[0].desc), c.S.chainLog[0].desc);
  assert.strictEqual(c.S.pendingActions.length, 0, 'plus rien en attente'); assert.strictEqual(c.saves, 1, 'le livre a changé : sauvegarde');
  assert.deepStrictEqual(c.toasts, ['🤖 Arbitrage · SOL/USDT LONG ouvert']);
});
T('D2 · refusée par l\'entonnoir → affirmation (bornes ±1 ATR) jugée par le marché, raison affichée dans le statut du bot, AUCUNE sauvegarde, aucun faux « exécuté » ; le « Harvest » du Fiscal reste à valider (manuel) ; les propositions d\'un autre mode ne sont pas touchées', () => {
  const c = mk({ allowOpen: false, propose: [{ type: 'arb', source: 'arb_bot_v1', action: 'open_trade', pair: 'SOL/USDT', side: 'long', payload: { pair: 'SOL/USDT', side: 'long' } },
    { type: 'harvest', source: 'fiscal_bot_v1', action: 'close_position', pair: 'BTC/USDT', posId: 'm1', payload: { posId: 'm1' } }] });
  c.S.pendingActions = [{ id: 'rx', type: 'dca', source: 'dca_bot_v1', action: 'open_trade', mode: 'real', pair: 'BTC/USDT', side: 'long', payload: { pair: 'BTC/USDT', side: 'long' } }];
  run(c, '_fleetHeartbeat()');
  const q = J(c.S._botPredictions); assert.deepStrictEqual(q.map(x => [x.bot, x.pair, x.dir, x.kind, x.up, x.dn]), [['arb_bot_v1', 'SOL/USDT', 'long', 'arb', 101, 99]]);
  assert.ok(/refusée par l'entonnoir \(veto BRAIN · consensus 12 %\) · affirmation suivie/.test(c.S.botFleet.arb_bot_v1.lastAction), c.S.botFleet.arb_bot_v1.lastAction);
  assert.strictEqual(c.saves, 0); assert.strictEqual(c.toasts.length, 0, 'aucun toast mensonger');
  const left = J(c.S.pendingActions).map(a => [a.type, a.mode]).sort();
  assert.deepStrictEqual(left, [['dca', 'real'], ['harvest', 'paperReal']], 'harvest en attente (tagué EV) ; la proposition RE intacte');
  run(c, '_fleetHeartbeat()'); assert.strictEqual(c.S._botPredictions.length, 1, 'affirmation déjà ouverte : pas de doublon');
});
T('D3 · Réel : un bot n\'ouvre qu\'avec des bases solides (Règles Réel v2) — paire à espérance nette apprise > 0 ET bot au mérite prouvé (> 350 sur ≥ 5 actes) ; sinon affirmation seulement ; prouvé : trade ouvert', () => {
  const P = [{ type: 'arb', source: 'arb_bot_v1', action: 'open_trade', pair: 'SOL/USDT', side: 'long', payload: { pair: 'SOL/USDT', side: 'long' } }];
  let c = mk({ mode: 'real', propose: P });
  run(c, '_fleetHeartbeat()'); assert.strictEqual(c.opens.length, 0, 'bot non prouvé : pas d\'ordre réel'); assert.strictEqual(c.S._botPredictions.length, 1);
  assert.ok(/^Réel : SOL\/USDT LONG non ouvert — bases pas encore prouvées/.test(c.S.botFleet.arb_bot_v1.lastAction));
  c = mk({ mode: 'real', propose: P, net: -0.5 }); const b = c.S.agents[0]; b._judgments = Array.from({ length: 6 }, () => ({ s: 1, w: 1, k: 0 })); b.fitness = 1350;
  run(c, '_fleetHeartbeat()'); assert.strictEqual(c.opens.length, 0, 'paire à espérance nette négative : pas d\'ordre réel');
  c = mk({ mode: 'real', propose: P, net: 0.8 }); const b2 = c.S.agents[0]; b2._judgments = Array.from({ length: 6 }, () => ({ s: 1, w: 1, k: 0 })); b2.fitness = 1350;
  run(c, '_fleetHeartbeat()'); assert.deepStrictEqual(c.opens, [['real', 'SOL/USDT', 'long', 20]]); assert.strictEqual(c.W.real.openPositions[0]._bot, 'arb_bot_v1');
});
T('D4 · une proposition s\'exécute dans SON mode : validée depuis l\'écran d\'un autre mode, elle ouvre dans le sien ; Rééquilibrage validé automatiquement → fermeture « bot » (position manuelle jamais fermée)', () => {
  const c = mk({ mode: 'real' });
  c.S.pendingActions = [{ id: 'a1', type: 'dca', source: 'dca_bot_v1', action: 'open_trade', mode: 'paperReal', payload: { pair: 'BTC/USDT', side: 'long' } }];
  run(c, "executePending('a1')");
  assert.deepStrictEqual(c.opens, [['paperReal', 'BTC/USDT', 'long', 20]]); assert.strictEqual(c.S.tradingMode, 'real', 'contexte rétabli'); assert.strictEqual(c.W.paperReal.openPositions.length, 1);
  c.S.tradingMode = 'paperReal'; c.W.paperReal.openPositions.push({ id: 'm1', pair: 'SOL/USDT', stakeUsdt: 50, auto: false });
  c.S.pendingActions = [{ id: 'r1', type: 'rebalance', action: 'close_skewed', payload: { pair: 'SOL/USDT' } }];
  run(c, "executePending('r1', { auto: true })"); assert.deepStrictEqual(c.closes, [['m1', true]]); assert.ok(c.W.paperReal.openPositions.some(p => p.id === 'm1'), 'manuelle intacte');
});
T('D5 · Scalper RÉEL : plus de pause dès qu\'une position est ouverte ailleurs — il propose sur SOL pendant qu\'une position BTC est ouverte, et saute BTC (déjà engagée)', () => {
  const c = mk();
  c.W.paperReal.openPositions.push({ id: 'b1', pair: 'BTC/USDT', side: 'long', stakeUsdt: 20, auto: true });
  c.S.pairStates['BTC/USDT'].qYes = 90; c.S.pairStates['BTC/USDT'].qNo = 10; c.S.pairStates['SOL/USDT'].qYes = 80; c.S.pairStates['SOL/USDT'].qNo = 20;
  c.PAIRS = { 'BTC/USDT': {}, 'SOL/USDT': {} }; c.lmsrP = ps => ps.qYes / (ps.qYes + ps.qNo); c.getTechSignals = () => ({ raw: { stddev: { cv: 0.002 } } });
  run(c, SCALP);
  run(c, 'botScalper()');
  const a = c.S.pendingActions.find(x => x.type === 'scalp'); assert.ok(a, 'proposition créée malgré la position BTC'); assert.deepStrictEqual([a.pair, a.side], ['SOL/USDT', 'long']);
});
T('D6 · Sauvetage RÉEL surveillé en permanence : −13 % → flatten ; la référence repart du portefeuille restant — la nouvelle position n\'est PAS refermée au passage suivant ; nouvelle session (base changée) : référence de session', () => {
  const c = mk(); const S = c.S;
  S._startPortfolio = 1000; S.portfolio = 870; c.W.paperReal.openPositions.push({ id: 'a', pair: 'BTC/USDT', side: 'long', auto: true }, { id: 'b', pair: 'SOL/USDT', side: 'short', auto: true });
  run(c, RESCUE);
  run(c, 'botRescue()'); assert.strictEqual(c.W.paperReal.openPositions.length, 0, 'flatten'); assert.deepStrictEqual(J(S._rescueRef.paperReal), { ref: 870, base: 1000 });
  c.W.paperReal.openPositions.push({ id: 'n', pair: 'SOL/USDT', side: 'long', auto: true }); S.portfolio = 868;
  run(c, 'botRescue()'); assert.strictEqual(c.W.paperReal.openPositions.length, 1, 'plus de gel : la nouvelle position vit');
  S._startPortfolio = 868; S.portfolio = 760; run(c, 'botRescue()'); assert.strictEqual(c.W.paperReal.openPositions.length, 0, 'nouvelle session : −12,4 % de SA base → flatten');
});
T('D7 · Rééquilibrage RÉEL : ne propose jamais de fermer une position manuelle (règle absolue) ; position du bot déséquilibrée → proposition', () => {
  const c = mk(); c.PAIRS = {};
  run(c, REBAL);
  c.W.paperReal.openPositions.push({ id: 'm', pair: 'SOL/USDT', side: 'long', stakeUsdt: 80, auto: false }, { id: 'k', pair: 'BTC/USDT', side: 'long', stakeUsdt: 20, auto: true });
  run(c, 'botRebalance()'); assert.strictEqual(c.S.pendingActions.length, 0); assert.ok(/position manuelle : pas de rééquilibrage/.test(c.S.botFleet.rebalance_bot_v1.lastAction));
  c.W.paperReal.openPositions[0].auto = true; run(c, 'botRebalance()');
  assert.deepStrictEqual(c.S.pendingActions.map(a => [a.type, a.pair]), [['rebalance', 'SOL/USDT']]);
});
T('S1 · textes : le battement (08) fait tourner la flotte de chaque mode et juge les affirmations à chaque tick ; l\'écran ne la fait plus tourner (accueil, onglet flotte) ; le bot d\'une position est jugé à la clôture sur son résultat réel ; plus de 30 min ni de 0,3 % dans le moteur', () => {
  const c08 = codeStrict(s08);
  const iExit = c08.indexOf('try { if (window._botExitSweep) window._botExitSweep(); } catch(e) {}'), iHb = c08.indexOf('try { if (window._fleetHeartbeat) window._fleetHeartbeat(); }'), iCyc = c08.indexOf('Object.entries(S.pairStates).forEach(([pair, ps]) => {', iHb);
  assert.ok(iExit > 0 && iHb > iExit && iCyc > iHb, 'dans la boucle des modes, après les sorties, avant les cycles');
  assert.ok(/try \{ if \(window\._botMeritAudit\) window\._botMeritAudit\(\); \} catch\(e\) \{\}[^\n]*\n  _phEnd\('cycles paires \+ protection'\);/.test(c08), 'audit à chaque tick, après la boucle des modes');
  assert.ok(!codeStrict(s02).includes("runBotFleet('tick')"), 'accueil : plus de tick');
  const fp = codeStrict(between(s03, 'function renderFleetPanel() {', '\n  const stats = {', false)); assert.ok(!fp.includes("runBotFleet('tick')"), 'onglet flotte : plus de tick');
  assert.ok(codeStrict(s02).includes("try { if (pos._bot && typeof _botJudgeMeasured === 'function') { _botJudgeMeasured(pos._bot, realisedUsd, 'trade');"));
  const eng = codeStrict(ENGINE); ['BOT_AUDIT_MS', 'BOT_AUDIT_MIN_MOVE', 'BOT_AUDIT_MAX_AGE', '30 * 60 * 1000', '0.003'].forEach(k => assert.ok(!eng.includes(k), 'reste : ' + k));
  assert.ok(codeStrict(s04).includes("if (action.mode && action.mode !== S.tradingMode) continue;") && codeStrict(s04).includes('executePending(action.id, { auto: true });'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
