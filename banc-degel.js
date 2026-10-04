// banc-degel.js — [DÉGEL DES VOIX · 02/10/2026] VERSION 20261002a
// Les voix lisent ce qu'elles croient lire (go Rams 01/10 20:51 : « l'horloge par mode en premier … Ensuite le dégel »). Fonctions RÉELLES des
// fichiers livrés, en vm :
//  V1-V3  série trouée (02) : un bouche-trou parmi les 60 bougies lues → périmée ; portes EV (10g) et RE (08) : vraies bougies redemandées, attente,
//         puis le cycle de la dernière bougie close dès la réparation ; projection (08) gelée sur les dernières vraies, marque _gap gardée.
//  V4-V5  RSI / Bollinger : 08 getTechSignals RÉEL donne raw.rsi.value et raw.boll.pct (raw.rsi.rsi / raw.boll.position n'ont jamais existé) ;
//         harmonic_v1, contrarian_v2, mean_rev_v1, sentiment_v2 les lisent enfin (l'oracle d'avant lisait 50 / 0,5) ; plus aucune lecture des
//         anciens champs dans js/.
//  V6-V7  gardiens : feu vert et gardien muet = 0 (roster et vote en ombre) ; alerte −0,2, veto −0,5 ; l'Évolueur lit les 5 derniers trades du système.
//  V8-V9  migration unique RÉELLE (record de security_v1, gènes jamais exercés) — sur un état construit et sur la mémoire réelle du 29/09.
//  V10    disciples gardiens (12 RÉEL) : ni direction ni timing ; le Smart Sizer ne tire plus ×1,1 du silence de son disciple gardien.
//  V11-V14 voix de marché recentrées : corr_v1 et macro_v1 × corrélation à BTC, nlp_v1 relatif au ton de toutes les news, fundamental_v1 depuis
//         le taux de base de Binance ; V15 flux macro (07 RÉEL) : une heure par source ; V16 persistance, en-têtes, jeton.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0; const pending = [];
function T(name, fn) { pending.push([name, fn]); }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const fnAt = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0 && s.indexOf(a, i + 1) === -1, 'fonction : ' + a.slice(0, 50)); return s.slice(i, s.indexOf('\n}\n', i) + 3); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const J = v => JSON.parse(JSON.stringify(v));
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js');
const s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s10g = rd('js/10g-resolveur-ev-csv.js'), s12 = rd('js/12-bots-disciples.js'), html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const STALE = between(s02, 'var RC_HOLE_WIN = ', 'window._realCandlesStale = _realCandlesStale;', true);   // ancre sans la valeur : la fenêtre est éprouvée par V1
const GATE_EV = between(s10g, 'function _resolvePaperRealCycle(pair, ps) {', '\nwindow._resolvePaperRealCycle = _resolvePaperRealCycle;', false);
const GATE_RE = between(s08, 'function resolvePairCycle(pair, ps) {', "\nif(typeof resolvePairCycle==='function') window.resolvePairCycle = resolvePairCycle;", false);
const PROJ = between(s08, 'function _projectRealCandles() {', 'window._projectRealCandles = _projectRealCandles;', true);
const TECH = between(s08, 'function _closes(candles){', '\nconst _fundCache = {};', false);
const DEGEL = between(s03, 'function _techRsi(tech) {', 'window._techRsi = _techRsi;', false);
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const HARM = fnAt(s03, 'function detectHarmonicResonance(pair) {');
const SCOUT = between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false);
const COUNCIL = between(s03, 'function councilVote(councilId, pair, scoutResults) {', '\n// ── GUARDIAN CHECKS', false);
const GUARD = between(s03, 'function guardianCheck(guardianId, verdict, pair, stake) {', '\n// ── ORCHESTRATOR ──', false);
const TIERS = between(s03, 'const ROSTER_TIERS = {', '\n};', true) + '\n' + between(s03, 'const COUNCIL_ADVISORS = {', '\n};', true);
const ROSTER = between(s03, 'function runRosterAnalysis(pair) {', '\n// ════', false);
const SHADOW = between(s03, 'function _evoShadowVotes(pair, scoutResults, verdict, stake) {', "\n// Juge l'ancien et le nouveau génome", false);
const MIGR = between(s03, '(function _botMeritMigrate() {', '\n})();', true);
const JUDGE = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false);
const THSTATE = fnAt(s03, 'function _thState() {'), VJRESET = fnAt(s03, 'function _vjReset(id) {');
const VJE = between(s03, 'function _vjE(id, W) {', '\n// ═══ [FITNESS AUX HORIZONS · 28/09/2026] LE SIÈGE VAUT', false);
const THVARS = between(s03, 'var TH_MIN_N = 30,', ';\n', true);
const ANGLE = between(s12, 'function _angleAnswer(a, angle, pair, side) {', '\nfunction _taskMerit(', false), TASKM = fnAt(s12, 'function _taskMerit(id, angle) {');
const CONSULT = between(s12, 'window._consultDisciples = function (botId, pair, side) {', '\n};\n', true);
const MACROFEED = between(s07, 'async function _macroFeedRefresh() {', '\nwindow._macroFeedRefresh = _macroFeedRefresh;', false);
const THWALK = fnAt(s03, 'function _thWalk(q, cost, now) {'), THCANDLE = fnAt(s03, 'function _thCandle(arr, ts) {'), DCMERIT = fnAt(s03, 'function _dcMerit(v) {');
const AGG = fnAt(s02, 'function _aggregateRealPrice(pair, price, ts) {'), OUTLIER = fnAt(s02, 'function _rcOutlier(pair, price, ts) {'), CSTART = fnAt(s02, 'function _candleStartTs(now, intervalMs) {');
const BOOT = between(s02, 'var _rcBootstrapAt = {};', 'window._fetchAndBootstrapRealCandles = _fetchAndBootstrapRealCandles;', true);
const ELECT = between(s12, 'var _BOT_TASKS = {', '\n};\n', true) + '\n' + between(s12, "var _ANGLES = ['direction', 'timing', 'conditions'];", '\n', true) + '\n' + fnAt(s12, 'function _taskMerit(id, angle) {') + fnAt(s12, 'function _discipleMerit(a) {') + fnAt(s12, 'function _electTasks() {');
const ORACLE_HARM = require('./banc-fixtures/harmonic-avant-genome-20260923c.js'), ORACLE = require('./banc-fixtures/analyse-avant-genome-20260916a.js');
const TFMS = { '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1j': 86400000 }, F = 900000;
// n bougies 15 min jusqu'à la bougie EN COURS (fraîche) ; prix de base px, petites oscillations
function mk(n, px, now) { const t1 = Math.floor((now || Date.now()) / F) * F, out = []; for (let i = 0; i < n; i++) { const c = px * (1 + 0.001 * Math.sin(i)); out.push({ ts: t1 - (n - 1 - i) * F, o: px, h: Math.max(px, c) * 1.001, l: Math.min(px, c) * 0.999, c, v: 5, n: 3 }); } return out; }
const hole = (arr, i) => { const p = arr[i - 1].c; arr[i] = { ts: arr[i].ts, o: p, h: p, l: p, c: p, v: 0, n: 0, _gap: true }; return arr; };

console.log('▶ banc-degel · token ' + TOK);
T('V1 · 02 RÉEL : un bouche-trou parmi les 60 dernières bougies → série trouée = périmée ; plus ancien que ces 60 → non ; série courte ou vieille → périmée comme avant ; la fenêtre est celle que projette 08 (60)', () => {
  const c = { S: { realCandles: {} }, Date, Math, window: {}, REAL_CANDLE_INTERVALS: TFMS }; vm.createContext(c); vm.runInContext(STALE, c);
  const set = a => { c.S.realCandles['A/USDT'] = { '15m': a }; }, st = () => vm.runInContext("_realCandlesStale('A/USDT', '15m')", c), ho = () => vm.runInContext("_realCandlesHoled(S.realCandles['A/USDT']['15m'])", c);
  set(mk(100, 10)); assert.deepStrictEqual([st(), ho()], [false, false], 'propre et fraîche');
  set(hole(mk(100, 10), 90)); assert.deepStrictEqual([st(), ho()], [true, true], 'bouche-trou à 10 bougies');
  set(hole(mk(100, 10), 99)); assert.deepStrictEqual([st(), ho()], [true, true], 'bouche-trou en dernière position (jamais produit par 02, compté quand même)');
  set(hole(mk(100, 10), 40)); assert.deepStrictEqual([st(), ho()], [true, true], 'bouche-trou à 60 bougies (encore lue)');
  set(hole(mk(100, 10), 39)); assert.deepStrictEqual([st(), ho()], [false, false], 'bouche-trou à 61 bougies : plus lu par personne');
  set(mk(20, 10)); assert.strictEqual(st(), true, '< 30 bougies');
  set(mk(60, 10, Date.now() - 40 * 60000)); assert.strictEqual(st(), true, 'bougie en cours vieille de 40 min');
  assert.strictEqual(vm.runInContext('RC_HOLE_WIN', c), 60); assert.ok(codeStrict(PROJ).includes('const src = arr.slice(-60);'), '08 projette 60 bougies');
  assert.strictEqual(vm.runInContext('_realCandlesHoled(null)', c), false);
});
function gateCtx(mode) {
  const calls = { fetch: [], core: [] }, now = Date.now();
  const S = { tradingMode: mode, paperRealActivePairs: { 'A/USDT': true }, realActivePairs: { 'A/USDT': true }, paperRealTimeframe: '15m', realTimeframe: '15m', paperRealConfig: {}, openPositions: [], realCandles: { 'A/USDT': { '15m': hole(mk(80, 10, now), 70) } }, realPairCycle: {} };
  const c = { S, Date, Math, window: {}, REAL_CANDLE_INTERVALS: TFMS, calls, _isRealLike: () => true,
    _fetchAndBootstrapRealCandles: (p, tf) => { calls.fetch.push([p, tf]); }, _resolvePairCycleCore: (p) => { calls.core.push([p, S.realPairCycle[p]]); } };
  vm.createContext(c); vm.runInContext(STALE + '\n' + GATE_EV + '\n' + GATE_RE, c); return c;
}
T('V2 · portes RÉELLES EV (10g) et RE (08) : série trouée → vraies bougies redemandées (REST), aucun cycle, horloge intacte ; série réparée → le cycle de la dernière bougie close, une fois', () => {
  [['paperReal', '_resolvePaperRealCycle'], ['real', 'resolvePairCycle']].forEach(([mode, fn]) => {
    const c = gateCtx(mode), arr = c.S.realCandles['A/USDT']['15m'];
    vm.runInContext(fn + "('A/USDT', {})", c); vm.runInContext(fn + "('A/USDT', {})", c);
    assert.deepStrictEqual(J(c.calls.fetch), [['A/USDT', '15m'], ['A/USDT', '15m']], mode + ' : REST redemandé (limité à 90 s dans 02)');
    assert.deepStrictEqual(J(c.calls.core), [], mode + ' : aucun cycle sur une série trouée'); assert.strictEqual(c.S.realPairCycle['A/USDT'], undefined, mode + ' : horloge intacte');
    const p = arr[69].c; arr[70] = { ts: arr[70].ts, o: p, h: p * 1.002, l: p * 0.998, c: p * 1.001, v: 4, n: 9 };   // réponse REST : la vraie bougie
    vm.runInContext(fn + "('A/USDT', {})", c); vm.runInContext(fn + "('A/USDT', {})", c);
    assert.deepStrictEqual(J(c.calls.core), [['A/USDT', arr[arr.length - 2].ts]], mode + ' : un cycle, sur la dernière bougie close'); assert.strictEqual(c.calls.fetch.length, 2, mode + ' : plus de REST');
  });
});
T('V3 · 08 _projectRealCandles RÉEL : série trouée → pas projetée (les voix gardent les dernières vraies bougies, _candlesStale) ; réparée → 60 vraies bougies ; sans le critère de 02, un bouche-trou projeté garde sa marque _gap (et lui seul)', () => {
  const now = Date.now(), S = { tradingMode: 'paperReal', paperRealTimeframe: '15m', realCandles: { 'E/USDT': { '15m': hole(mk(80, 100, now), 75) } }, pairStates: { 'E/USDT': { candles: [{ o: 1, h: 1, l: 1, c: 1, v: 1 }], price: 100 } } };
  const c = { S, Date, Math, Object, Array, window: {}, REAL_CANDLE_INTERVALS: TFMS, _getActiveRealTimeframe: () => '15m' }; vm.createContext(c); vm.runInContext(STALE + '\n' + PROJ, c);
  const before = S.pairStates['E/USDT'].candles;
  assert.strictEqual(vm.runInContext('_projectRealCandles()', c), 0); assert.strictEqual(S.pairStates['E/USDT'].candles, before); assert.strictEqual(S.pairStates['E/USDT']._candlesStale, true);
  const arr = S.realCandles['E/USDT']['15m']; delete arr[75]._gap; arr[75].v = 3;
  assert.strictEqual(vm.runInContext('_projectRealCandles()', c), 1); const pc = S.pairStates['E/USDT'].candles;
  assert.strictEqual(pc.length, 60); assert.ok(pc.every(k => !('_gap' in k) && Object.keys(k).join() === 'o,h,l,c,v,ts'), 'vraies bougies : 6 champs, aucune marque');
  const c2 = { S: { tradingMode: 'paperReal', paperRealTimeframe: '15m', realCandles: { 'E/USDT': { '15m': hole(mk(80, 100, now), 75) } }, pairStates: { 'E/USDT': { candles: [], price: 100 } } }, Date, Math, Object, Array, window: {}, _getActiveRealTimeframe: () => '15m' };
  vm.createContext(c2); vm.runInContext(PROJ, c2); vm.runInContext('_projectRealCandles()', c2);
  const q = c2.S.pairStates['E/USDT'].candles; assert.strictEqual(q.filter(k => k._gap === true).length, 1); assert.strictEqual(q[55]._gap, true);
});
function techCtx(closes, genome) {
  const candles = closes.map((cl, i) => { const o = i ? closes[i - 1] : cl; return { o, h: Math.max(o, cl) * 1.0005, l: Math.min(o, cl) * 0.9995, c: cl, v: 10 }; });
  const S = { pairStates: { 'X/USDT': { candles, price: closes[closes.length - 1], qYes: 100, qNo: 100 } }, resonanceHistory: [], genome: genome || null };
  const c = { S, Math, Number, Object, Array, JSON, Date, isFinite, String, window: {}, console, getFundamentalSignals: () => ({ fundScore: 0 }), lmsrP: () => 0.5 };
  vm.createContext(c); vm.runInContext(TECH + '\n' + ENGINE + '\n' + DEGEL + '\n' + TIERS + '\n' + HARM + '\n' + SCOUT + '\n' + COUNCIL, c); return c;
}
const UP = Array.from({ length: 60 }, (_, i) => 100 + i * 0.4 + (i % 7 === 3 ? -0.3 : 0) + (i === 59 ? 1.5 : 0)), DOWN = UP.map(x => 200 - x);   // hausse régulière qui finit par un bond (%B > 1) ; la baisse en miroir
T('V4 · 08 getTechSignals RÉEL : raw.rsi = { value, divergence }, raw.boll = { pct, … } — raw.rsi.rsi et raw.boll.position n\'existent pas (les voix lisaient 50 et 0,5) ; _techRsi / _techBollPct lisent les vrais champs, neutre 50 / 0,5 sans valeur', () => {
  const c = techCtx(UP), tech = vm.runInContext("getTechSignals('X/USDT')", c);
  assert.ok(tech.raw.rsi.value > 70, 'RSI réel en tendance haussière : ' + tech.raw.rsi.value); assert.strictEqual(tech.raw.rsi.rsi, undefined, 'raw.rsi.rsi n\'existe pas');
  assert.ok(tech.raw.boll.pct > 0.85, '%B réel en haut de bande : ' + tech.raw.boll.pct); assert.strictEqual(tech.raw.boll.position, undefined, 'raw.boll.position n\'existe pas');
  c.__t = tech; assert.strictEqual(vm.runInContext('_techRsi(__t)', c), tech.raw.rsi.value); assert.strictEqual(vm.runInContext('_techBollPct(__t)', c), tech.raw.boll.pct);
  assert.deepStrictEqual([vm.runInContext('_techRsi(null)', c), vm.runInContext('_techRsi({ raw: { rsi: { value: NaN } } })', c), vm.runInContext('_techBollPct({ raw: {} })', c), vm.runInContext('_techBollPct({ raw: { boll: { pct: null } } })', c)], [50, 50, 0.5, 0.5]);
  const d = techCtx(DOWN), td = vm.runInContext("getTechSignals('X/USDT')", d); assert.ok(td.raw.rsi.value < 30 && td.raw.boll.pct < 0.15, 'baisse : RSI ' + td.raw.rsi.value + ', %B ' + td.raw.boll.pct);
});
T('V5 · les voix sur les VRAIS indicateurs : harmonic_v1 (notes RSI et Bollinger vivantes, l\'oracle d\'avant les lisait à 50 / 0,5), contrarian_v2 et mean_rev_v1 parlent enfin, sentiment_v2 a son terme RSI ; plus aucune lecture des anciens champs dans js/', () => {
  ['UP', 'DOWN'].forEach(k => {
    const c = techCtx(k === 'UP' ? UP : DOWN), sgn = k === 'UP' ? 1 : -1;
    const h = J(vm.runInContext("detectHarmonicResonance('X/USDT')", c));
    const o = (() => { const co = techCtx(k === 'UP' ? UP : DOWN); vm.runInContext(ORACLE_HARM, co); return J(vm.runInContext("detectHarmonicResonance('X/USDT')", co)); })();
    const note = (r, n) => r.notes.find(x => x.name === n).val;
    assert.deepStrictEqual([note(h, 'RSI'), note(h, 'BOLL')], [sgn, sgn], k + ' : notes RSI et Bollinger vivantes'); assert.deepStrictEqual([note(o, 'RSI'), note(o, 'BOLL')], [0, 0], k + ' : l\'oracle lisait 50 / 0,5');
    const cv = id => J(vm.runInContext("councilVote('" + id + "', 'X/USDT', {})", c));
    assert.strictEqual(cv('contrarian_v2').vote, sgn > 0 ? 'short' : 'long', k + ' : contrarian fade l\'extrême'); assert.strictEqual(cv('mean_rev_v1').vote, sgn > 0 ? 'short' : 'long', k + ' : mean_rev retour à la moyenne');
    const co = techCtx(k === 'UP' ? UP : DOWN); vm.runInContext(ORACLE.councilVote, co); assert.deepStrictEqual([J(vm.runInContext("councilVote('contrarian_v2', 'X/USDT', {})", co)).vote, J(vm.runInContext("councilVote('mean_rev_v1', 'X/USDT', {})", co)).vote], ['hold', 'hold'], k + ' : avant, muets');
    const sNew = J(vm.runInContext("scoutAnalysis('sentiment_v2', 'X/USDT')", c)), co2 = techCtx(k === 'UP' ? UP : DOWN); co2.__t = vm.runInContext("getTechSignals('X/USDT')", co2); co2.__t.raw.rsi = { value: 50 };
    vm.runInContext('getTechSignals = () => __t;', co2); const sOld = J(vm.runInContext("scoutAnalysis('sentiment_v2', 'X/USDT')", co2));
    assert.ok(sgn * (sNew.score - sOld.score) > 0.2, k + ' : terme RSI de sentiment_v2 ' + sOld.score + ' → ' + sNew.score);
  });
  const all = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => [f, codeStrict(rd('js/' + f))]);
  const bad = all.filter(([, s]) => /raw\??\.rsi\??\.rsi\b|boll\??\.position\b/.test(s)).map(x => x[0]); assert.deepStrictEqual(bad, [], 'lecture des anciens champs : ' + bad.join(', '));
  const c3 = codeStrict(s03); assert.strictEqual(c3.split('_techRsi(tech)').length - 1, 5, '_techRsi : débat, harmonique, sentiment, conseil + définition'); assert.strictEqual(c3.split('_techBollPct(tech)').length - 1, 3, '_techBollPct : harmonique, mean_rev + définition');
});
function rosterCtx(statusOf, muted) {
  const A = [], ids = new Function(TIERS + '\nreturn ROSTER_TIERS;')();
  ids.scouts.concat(ids.council).forEach(id => A.push({ id, name: id, score: 0, conf: 0.6, fitness: 500 }));
  ids.guardians.forEach(id => A.push({ id, name: id, score: 0, conf: 0.5, fitness: 500, isBot: id === 'risk_bot_v1', isMeta: id === 'evolver_v1' }));
  const c = { console, Math, Date, Object, Array, Number, String, JSON, Set, Map, window: {}, S: { agents: A, pairStates: { 'B/USDT': { price: 1 } }, mutedAgents: muted || [], tradingAccount: 100, cycle: 1, chainLog: [] },
    scoutAnalysis: () => ({ score: 0.4, conf: 0.6 }), councilVote: () => ({ vote: 'long', score: 0.4 }), guardianCheck: id => ({ status: statusOf(id), reasoning: 'stub' }), detectMarketRegime: () => 'calm', getContextualWeight: a => a.fitness };
  vm.createContext(c); vm.runInContext(TIERS + '\n' + ROSTER, c); return c;
}
T('V6 · gardiens RÉELS (roster 03, vote en ombre) : un statut n\'est pas un sens — feu vert, alerte, veto et gardien muet valent 0 (avant +0,05 / −0,2 / −0,5) ; le veto bloque toujours (anyVeto)', () => {
  const v = st => { const c = rosterCtx(() => st); vm.runInContext("runRosterAnalysis('B/USDT')", c); return J(c.S.pairStates['B/USDT'].roster.votes); };
  const a = v('approve'), w = v('warn'), x = v('veto');
  ['security_v1', 'risk_bot_v1', 'evolver_v1'].forEach(id => assert.deepStrictEqual([a[id], w[id], x[id]], [0, 0, 0], id));
  assert.strictEqual(a.macro_v1, 0.4, 'les autres voix : inchangées');
  const cm = rosterCtx(() => 'warn', ['security_v1']); const r = vm.runInContext("runRosterAnalysis('B/USDT')", cm); assert.strictEqual(cm.S.pairStates['B/USDT'].roster.votes.security_v1, 0, 'gardien muet : 0'); assert.strictEqual(r.anyVeto, false);
  const cv = rosterCtx(() => 'veto'), rv = vm.runInContext("runRosterAnalysis('B/USDT')", cv); assert.deepStrictEqual([rv.anyVeto, rv.finalDecision], [true, 'VETO'], 'le veto bloque toujours');
  ['approve', 'veto'].forEach(st => { const sc = { console, Math, Object, Array, JSON, Set, S: { evoTrials: { security_v1: { oldG: { cvVeto: 0.04, cvWarn: 0.03 } } }, genome: {}, mutedAgents: [], resonanceHistory: [] }, scoutAnalysis: () => ({ score: 0 }), councilVote: () => null, guardianCheck: () => ({ status: st }) };
    vm.createContext(sc); vm.runInContext(TIERS + '\n' + SHADOW, sc); assert.deepStrictEqual(J(vm.runInContext("_evoShadowVotes('B/USDT', {}, 'LONG', 10)", sc)), { security_v1: 0 }, 'vote en ombre du gardien (' + st + ') : 0'); });
  const c3 = codeStrict(s03); assert.ok(!c3.includes("'warn' ? -0.2 : 0.05") && !c3.includes("res.status === 'veto' ? -0.5"), 'plus aucune traduction statut → sens');
});
T('V7 · Évolueur RÉEL : « 4 perdants sur les 5 derniers trades » lit les 5 derniers trades DU SYSTÈME (heure de clôture) — l\'oracle d\'avant lisait les 5 derniers de chaque paire (alerte permanente)', () => {
  const mkS = lastWin => { const ps = {}; ['A', 'B', 'C', 'D', 'E', 'F'].forEach((p, k) => { ps[p + '/USDT'] = { trades: [1, 2, 3, 4, 5].map(i => ({ type: 'position', pnlUsdt: (i === 5 && lastWin) ? 1 : -1, ts: (i === 5 ? 1e6 : 0) + k * 10 + i })) }; }); return { pairStates: ps, archives: { snapshots: [] } }; };
  const run = (src, S) => { const c = { S, Math, Number, Object, Array, JSON, window: {}, _genomeOf: () => ({}), getTechSignals: () => null }; vm.createContext(c); vm.runInContext(src, c); return J(vm.runInContext("guardianCheck('evolver_v1', 'LONG', 'A/USDT', 10)", c)).status; };
  assert.strictEqual(run(GUARD, mkS(true)), 'approve', 'les 5 derniers trades du système sont gagnants'); assert.strictEqual(run(ORACLE.guardianCheck, mkS(true)), 'warn', 'l\'oracle : 4 perdants par paire → alerte');
  assert.strictEqual(run(GUARD, mkS(false)), 'warn', '5 derniers perdants → alerte');
  const few = { pairStates: { 'A/USDT': { trades: [{ type: 'position', pnlUsdt: -1, ts: 1 }, { type: 'position', pnlUsdt: -1, ts: 2 }] } } }; assert.strictEqual(run(GUARD, few), 'approve', 'moins de 5 trades');
});
function migrCtx(S, noDefaults, noTh) {
  const c = { S, Math, Number, Array, Object, JSON, Date, console, window: { _stateReady: true, _decErr: e => { c.errs.push(String(e && e.message || e)); } }, saves: 0, errs: [] };
  c.setInterval = fn => { c._tick = fn; return 1; }; c.clearInterval = () => {}; c.saveState = () => { c.saves++; }; c.nowStr = () => '00:00:00';
  vm.createContext(c); vm.runInContext((noDefaults ? '' : ENGINE + '\n') + (noTh ? '' : THVARS + '\n') + JUDGE + '\n' + THSTATE + '\n' + VJRESET + '\n' + MIGR, c); c._tick(); return c;
}
const MIGRATED = { _botMeritMigrated: true, _metaMeritMigrated: true, _abstMigrated: true };
T('V8 · migration unique RÉELLE : record de security_v1 effacé (bilan aux horizons, votes en attente, jugements, T$ du marché comme à une naissance) → fitness neutre 350 ; gènes jamais exercés (harmonic_v1, sentiment_v2, contrarian_v2, mean_rev_v1) → valeurs de départ dans le génome, l\'ancien génome d\'un essai ET les versions archivées, les autres gènes intacts ; journal, une sauvegarde, une seule fois', () => {
  const S = Object.assign({}, MIGRATED, { chainLog: [], agents: [{ id: 'security_v1', fitness: 835, streak: 3, _judgments: [{ s: 1, w: 0.2, k: 1 }], mktWallet: 2400, mktGain: 51, mktN: 900, mktGen: 2 }, { id: 'nlp_v1', fitness: 617, _judgments: [{ s: 1, w: 0.3, k: 1 }], mktWallet: 700 }],
    genome: { harmonic_v1: { rsiHigh: 54.7, rsiLow: 37.9, macdThr: 0.0019, stochHigh: 74.9, stochLow: 21.9, adxMin: 28, bbHigh: 1, bbLow: 0.186, resonanceMin: 3 },
              sentiment_v2: { win: 13, rsiHigh: 60.1, rsiLow: 36.2, momGain: 10.1, rsiW: 0.456, atW: 0.262, conf: 0.505 }, mean_rev_v1: { bbHigh: 0.873, bbLow: 0.1, score: 0.48, ownW: 0.76, voteThr: 0.15 },
              contrarian_v2: { rsiHigh: 61, rsiLow: 30, score: 0.7, ownW: 0.6, voteThr: 0.18 } },
    genomeHistory: { sentiment_v2: [{ g: { win: 8, rsiHigh: 56.98, rsiLow: 33.58, momGain: 9, rsiW: 0.416, atW: 0.3, conf: 0.7 }, f: 1350, t: 1 }, { g: { win: 9, rsiHigh: 65, rsiLow: 35, momGain: 9, rsiW: 0.5, atW: 0.3, conf: 0.7 }, f: 900, t: 2 }], mean_rev_v1: [{ g: { bbHigh: 1, bbLow: 0.2, score: 0.5, ownW: 0.6, voteThr: 0.18 }, f: 700, t: 3 }] },
    evoTrials: { sentiment_v2: { oldG: { win: 9, rsiHigh: 58, rsiLow: 40, momGain: 12, rsiW: 0.3, atW: 0.2, conf: 0.6 }, n: 3 } },
    dcThreshold: { vIds: ['security_v1', 'nlp_v1'], vHz: { security_v1: [1, 2, 3, 4, 5].map(() => [50, 10]), nlp_v1: [1, 2, 3, 4, 5].map(() => [300, 10]) }, pendV: [{ p: 'B/USDT', v: [[0, 50], [1, 300]] }] } });   // un record par horizon (5), à plat v, D
  const c = migrCtx(S);
  const sec = S.agents[0]; assert.deepStrictEqual([sec.fitness, sec._judgments.length, sec.streak], [350, 0, 0], 'security_v1 neutre');
  assert.deepStrictEqual([sec.mktWallet, sec.mktGain, sec.mktN, sec.mktGen], [350, 0, 0, 3], 'T$ du marché comme à une naissance (génération suivante : ses mises ouvertes ne lui reviennent pas)');
  assert.deepStrictEqual([S.agents[1].fitness, S.agents[1]._judgments.length, S.agents[1].mktWallet], [617, 1, 700], 'nlp_v1 intact');
  assert.ok(!('security_v1' in S.dcThreshold.vHz) && Array.isArray(S.dcThreshold.vHz.nlp_v1), 'bilan aux horizons : celui de security_v1 seul'); assert.deepStrictEqual(J(S.dcThreshold.pendV[0].v), [[1, 300]], 'votes en attente : ceux de security_v1 seuls');
  assert.deepStrictEqual(J(S.genome.harmonic_v1), { rsiHigh: 65, rsiLow: 35, macdThr: 0.0019, stochHigh: 74.9, stochLow: 21.9, adxMin: 28, bbHigh: 0.85, bbLow: 0.15, resonanceMin: 3 });
  assert.deepStrictEqual(J(S.genome.sentiment_v2), { win: 13, rsiHigh: 65, rsiLow: 35, momGain: 10.1, rsiW: 0.5, atW: 0.262, conf: 0.505 });
  assert.deepStrictEqual(J(S.genome.contrarian_v2), { rsiHigh: 72, rsiLow: 28, score: 0.7, ownW: 0.6, voteThr: 0.18 }, 'contrarian_v2 : son RSI était lu à vide aussi');
  assert.deepStrictEqual(J(S.genome.mean_rev_v1), { bbHigh: 0.9, bbLow: 0.1, score: 0.48, ownW: 0.76, voteThr: 0.15 }, 'mean_rev_v1 : son Bollinger était lu à vide');
  assert.deepStrictEqual(J(S.evoTrials.sentiment_v2.oldG), { win: 9, rsiHigh: 65, rsiLow: 35, momGain: 12, rsiW: 0.5, atW: 0.2, conf: 0.6 }, 'essai en cours : l\'ancien génome reçoit les mêmes valeurs');
  assert.deepStrictEqual(J(S.genomeHistory.sentiment_v2.map(h => [h.g.rsiHigh, h.g.rsiLow, h.g.rsiW, h.g.win, h.g.momGain, h.f])), [[65, 35, 0.5, 8, 9, 1350], [65, 35, 0.5, 9, 9, 900]], 'versions archivées : gènes jamais exercés au départ, le reste et la pointe intacts');
  assert.deepStrictEqual(J(S.genomeHistory.mean_rev_v1[0].g), { bbHigh: 0.9, bbLow: 0.1, score: 0.5, ownW: 0.6, voteThr: 0.18 });
  assert.strictEqual(S._degelMigrated, true); assert.strictEqual(c.saves, 1);
  const L = S.chainLog.map(x => x.desc); assert.strictEqual(L.length, 5, L.join(' | ')); assert.ok(S.chainLog.every(x => x.icon === '🧊'));
  assert.strictEqual(L[0], 'Gardien Sécurité : son statut ne compte plus comme un sens (feu vert = achat, alerte / veto = vente) · record effacé (gagné par ce faux achat : fitness 835, bilan aux horizons, 1 jugement(s) à la bougie, 2400 T$ au marché) · fitness neutre 350, 350 T$');
  assert.ok(L[1].startsWith('Génome harmonic_v1 : gènes jamais exercés') && L[1].includes('rsiHigh 54.7 → 65') && L[1].includes('bbHigh 1 → 0.85') && !L[1].includes('archivée'), L[1]);
  assert.ok(L[2].startsWith('Génome sentiment_v2 :') && L[2].includes('rsiW 0.456 → 0.5') && L[2].endsWith(' · 1 version(s) archivée(s) aussi'), L[2]);
  assert.ok(L[3].startsWith('Génome contrarian_v2 :') && L[3].includes('rsiHigh 61 → 72') && L[3].includes('rsiLow 30 → 28'), L[3]);
  assert.ok(L[4].startsWith('Génome mean_rev_v1 :') && L[4].includes('bbHigh 0.873 → 0.9') && !L[4].includes('bbLow') && L[4].endsWith(' · 1 version(s) archivée(s) aussi'), L[4]);
  sec.fitness = 777; const c2 = migrCtx(S); assert.deepStrictEqual([c2.saves, sec.fitness, S.chainLog.length], [0, 777, 5], 'une seule fois');
  const S3 = Object.assign({}, MIGRATED, { chainLog: [], agents: [{ id: 'security_v1', fitness: 900, _judgments: [] }], genome: { harmonic_v1: { rsiHigh: 50 } } });
  const c3 = migrCtx(S3, true); assert.deepStrictEqual([S3.agents[0].fitness, S3.genome.harmonic_v1.rsiHigh, S3._degelMigrated, c3.saves], [350, 50, true, 1], 'sans GENOME_DEFAULTS : aucune erreur, gènes laissés, sauvegarde faite');
  // le bilan aux horizons n'a pas pu être effacé (_vjReset en erreur, ses erreurs sont avalées) : rien n'est touché, pas de drapeau, erreur signalée — refait au prochain démarrage
  const S4 = { _botMeritMigrated: true, _metaMeritMigrated: false, _abstMigrated: true, chainLog: [], agents: [{ id: 'security_v1', fitness: 835, _judgments: [{ s: 1, w: 1, k: 1 }], mktWallet: 2400 }, { id: 'evolver_v1', isMeta: true, fitness: 50, _judgments: [] }], dcThreshold: { vIds: ['security_v1'], vHz: { security_v1: [1, 2, 3, 4, 5].map(() => [50, 10]) }, pendV: [] } };
  const c4 = migrCtx(S4, false, true); assert.deepStrictEqual([S4.agents[0].fitness, S4.agents[0]._judgments.length, S4.agents[0].mktWallet, S4._degelMigrated, Array.isArray(S4.dcThreshold.vHz.security_v1)], [835, 1, 2400, undefined, true], 'rien touché');
  assert.ok(c4.errs.some(e => e.includes('bilan aux horizons de security_v1 non effacé')), c4.errs.join(' | ')); assert.deepStrictEqual([S4._metaMeritMigrated, c4.saves], [true, 1], 'les autres migrations sauvegardées quand même');
});
T('V9 · migration RÉELLE sur la mémoire réelle (backup 29/09 20:45) : security_v1 pesait 0,485 dans la décision avec 240 votes « +0,05 » par horizon et une fitness de 835 → poids nul dans les deux pesées, fitness 350 ; gènes jamais exercés remis, versions archivées comprises — l\'opérateur « retour à la meilleure version » (07, _genomeEvolve RÉEL) ne les ramène plus', () => {
  const f = '/root/.claude/uploads/81cc7bc3-c277-5d7b-a23b-a43db24c04a8/4ded422c-aura_guardian_full_20260929-204507.json';
  if (!fs.existsSync(f)) { console.log('     ⏳ backup du 29/09 absent de cette machine : rejeu non exécuté (non bloquant)'); return; }
  const st = JSON.parse(fs.readFileSync(f, 'utf8')).aura;
  const S = Object.assign({}, MIGRATED, { chainLog: [], agents: st.agents, genome: st.genome, genomeHistory: st.genomeHistory || {}, evoTrials: st.evoTrials || {}, dcThreshold: st.dcThreshold, fitWindowRule: st.fitWindowRule || null });
  const pre = { S, Math, Number, Array, Object, JSON, Date, isFinite, window: {} }; vm.createContext(pre); vm.runInContext(ENGINE + '\n' + THVARS + '\n' + JUDGE + '\n' + VJE + '\n' + DCMERIT, pre);
  const w0 = vm.runInContext("_dcMeritHz('security_v1')", pre), n0 = st.dcThreshold.vHz.security_v1.map(L => L.length / 2), v0 = new Set(st.dcThreshold.vHz.security_v1[0].filter((x, i) => i % 2 === 0));
  assert.ok(Math.abs(w0 - 0.485) < 0.01, 'poids avant : ' + w0); assert.deepStrictEqual(n0.slice(0, 4), [240, 240, 240, 240]); assert.deepStrictEqual([...v0], [50], 'tous ses votes : +0,05');
  const DEADK = { harmonic_v1: ['rsiHigh', 'rsiLow', 'bbHigh', 'bbLow'], sentiment_v2: ['rsiHigh', 'rsiLow', 'rsiW'], contrarian_v2: ['rsiHigh', 'rsiLow'], mean_rev_v1: ['bbHigh', 'bbLow'] }, GD = J(vm.runInContext('GENOME_DEFAULTS', pre));
  const drifted = () => Object.keys(DEADK).reduce((n, id) => n + (S.genomeHistory[id] || []).filter(h => h && h.g && DEADK[id].some(k => Number(h.g[k]) !== GD[id][k])).length, 0);
  const d0 = drifted(); assert.ok(d0 > 0, 'versions archivées dérivées avant : ' + d0);
  const sec = st.agents.find(a => a.id === 'security_v1'); assert.strictEqual(Math.round(sec.fitness), 835);
  migrCtx(S);
  pre.__sec = sec; assert.deepStrictEqual([vm.runInContext("_dcMeritHz('security_v1')", pre), vm.runInContext('_dcMerit(__sec)', pre), sec.fitness, sec.mktWallet], [null, 0, 350, 350], 'plus de record : poids nul (horizons et bougie), fitness et T$ neutres');
  assert.strictEqual(drifted(), 0, 'plus aucune version archivée dérivée');
  const L = S.chainLog.map(x => x.desc); ['harmonic_v1', 'sentiment_v2', 'mean_rev_v1'].forEach(id => assert.ok(L.some(d => d.startsWith('Génome ' + id + ' :')), id + ' : ' + L.join(' | ')));
  assert.strictEqual(st.genome.harmonic_v1.resonanceMin, 3, 'les gènes exercés restent (resonanceMin)');
  ['sentiment_v2', 'harmonic_v1', 'mean_rev_v1'].forEach(id => { vm.runInContext("_genomeEvolve('" + id + "', 0.15, 900, 'B')", pre); const g = S.genome[id]; DEADK[id].forEach(k => assert.strictEqual(g[k], GD[id][k], id + ' après retour à la meilleure version : ' + k + ' = ' + g[k])); });
});
function angleCtx(votes, extra) {
  const S = Object.assign({ pairStates: { 'B/USDT': { roster: { votes } } }, agents: [{ id: 'security_v1', conf: 0.5, regimeFitness: { calm: { wins: 8, total: 10 } } }, { id: 'macro_v1', conf: 0.5 }], botDisciples: { smart_sizer_v1: ['security_v1'] }, discipleAngles: { security_v1: 'timing' } }, extra || {});
  const c = { S, Math, Number, Object, Array, JSON, window: {}, detectMarketRegime: () => 'calm', _agentPairVote: (a, pair, fb) => (S.pairStates[pair] && S.pairStates[pair].roster.votes[a.id] !== undefined) ? S.pairStates[pair].roster.votes[a.id] : fb };
  vm.createContext(c); vm.runInContext(TIERS + '\n' + ANGLE + '\n' + TASKM + '\n' + CONSULT, c); return c;
}
T('V10 · 12 RÉEL : un disciple gardien ne répond ni « direction » ni « timing » (sa mémoire de régime, oui) ; les autres inchangés ; le Smart Sizer, seul disciple security_v1 à 0, garde ×1,0 — sans la garde il tirait ×1,1 du silence', () => {
  const c = angleCtx({ security_v1: 0, macro_v1: 0 }), A = (id, ang, side) => vm.runInContext("_angleAnswer(S.agents.find(a => a.id === '" + id + "'), '" + ang + "', 'B/USDT', '" + side + "')", c);
  assert.deepStrictEqual([A('security_v1', 'direction', 'long'), A('security_v1', 'timing', 'long'), A('security_v1', 'conditions', 'long')], [0, 0, 1]);
  c.S.pairStates['B/USDT'].roster.votes.security_v1 = -0.5; assert.deepStrictEqual([A('security_v1', 'direction', 'long'), A('security_v1', 'timing', 'long')], [0, 0], 'veto : ni sens ni force');
  assert.deepStrictEqual([A('macro_v1', 'timing', 'long')], [-1], 'agent à 0 : « pas maintenant » comme avant');
  c.S.pairStates['B/USDT'].roster.votes.macro_v1 = 0.5; assert.deepStrictEqual([A('macro_v1', 'direction', 'long'), A('macro_v1', 'direction', 'short'), A('macro_v1', 'timing', 'long')], [1, -1, 1]);
  c.S.pairStates['B/USDT'].roster.votes.security_v1 = 0; assert.strictEqual(J(vm.runInContext("window._consultDisciples('smart_sizer_v1', 'B/USDT', null)", c)).mod, 1);
  const noGuard = ANGLE.split('\n').filter(l => !l.includes('ROSTER_TIERS.guardians.indexOf(a.id) >= 0) return 0;')).join('\n'); assert.ok(noGuard.length < ANGLE.length);
  const c0 = angleCtx({ security_v1: 0 }); vm.runInContext(noGuard, c0); assert.strictEqual(Math.round(J(vm.runInContext("window._consultDisciples('smart_sizer_v1', 'B/USDT', null)", c0)).mod * 100) / 100, 1.1, 'sans la garde : ×1,1');
});
function scoutCtx(extra) {
  const btc = Array.from({ length: 10 }, (_, i) => ({ o: 100 + i, h: 101 + i, l: 99 + i, c: 100.5 + i, v: 1 }));
  const S = Object.assign({ tradingMode: 'paperReal', pairStates: { 'BTC/USDT': { candles: btc, price: 110 }, 'ETH/USDT': { candles: [], price: 1 }, 'EUR/USDT': { candles: [], price: 1 }, 'XRP/USDT': { candles: [], price: 1 } }, agents: [] }, extra || {});
  const RHO = { 'ETH/USDT': 0.8, 'EUR/USDT': -0.05, 'XRP/USDT': null };
  const c = { S, Math, Number, Object, Array, JSON, Date, isFinite, String, window: {}, getTechSignals: () => ({ atScore: 0, raw: {} }), getFundamentalSignals: () => ({ fundScore: 0 }), detectHarmonicResonance: () => null, lmsrP: () => 0.5,
    _getPairCorrelation: (a, b) => (b === 'BTC/USDT' && a in RHO) ? RHO[a] : null, _realCandlesStale: () => !!S.__btcStale, _getActiveRealTimeframe: () => '15m' };
  vm.createContext(c); vm.runInContext(ENGINE + '\n' + DEGEL + '\n' + SCOUT, c); return c;
}
const sc = (c, id, p) => J(vm.runInContext("scoutAnalysis('" + id + "', '" + p + "')", c));
T('V11 · corr_v1 RÉEL : la lecture de BTC (4 hausses sur 5 bougies × 0,15 = 0,6) vaut pour la paire × sa corrélation à BTC ; nulle / négative → 0 ; inconnue → abstention ; en EV / RE, bougies de BTC en attente → abstention (pas en AA)', () => {
  const c = scoutCtx();
  assert.ok(Math.abs(sc(c, 'corr_v1', 'BTC/USDT').score - 0.6) < 1e-9); assert.ok(Math.abs(sc(c, 'corr_v1', 'ETH/USDT').score - 0.48) < 1e-9, 'ETH × 0,8');
  const eur = sc(c, 'corr_v1', 'EUR/USDT'); assert.strictEqual(eur.score, 0); assert.ok(eur.reasoning.includes('corrélation à BTC -0.05'), eur.reasoning);
  const xrp = sc(c, 'corr_v1', 'XRP/USDT'); assert.deepStrictEqual([xrp.score, xrp.reasoning], [0, 'Corrélation à BTC inconnue']);
  c.S.__btcStale = true; assert.deepStrictEqual([sc(c, 'corr_v1', 'ETH/USDT').score, sc(c, 'corr_v1', 'ETH/USDT').reasoning], [0, 'Bougies de BTC en attente']); assert.ok(Math.abs(sc(c, 'corr_v1', 'BTC/USDT').score - 0.6) < 1e-9, 'BTC lui-même');
  c.S.tradingMode = 'sim'; assert.ok(Math.abs(sc(c, 'corr_v1', 'ETH/USDT').score - 0.48) < 1e-9, 'AA : pas de garde des bougies réelles');
  // _btcRho : en EV / RE, la série de LA paire périmée ou trouée → corrélation sans objet (macro_v1 aussi) ; BTC périmé → macro_v1 s'abstient aussi
  const c2 = scoutCtx({ macroFeed: { fng: 10, cap24h: 2.5, t: Date.now() } }); c2._realCandlesStale = (p) => p === 'ETH/USDT';
  assert.strictEqual(sc(c2, 'corr_v1', 'ETH/USDT').reasoning, 'Corrélation à BTC inconnue'); assert.strictEqual(sc(c2, 'macro_v1', 'ETH/USDT').reasoning, 'Macro : corrélation à BTC inconnue');
  c2._realCandlesStale = (p) => p === 'BTC/USDT'; assert.strictEqual(sc(c2, 'macro_v1', 'ETH/USDT').reasoning, 'Macro : corrélation à BTC inconnue'); assert.ok(sc(c2, 'macro_v1', 'BTC/USDT').score > 0.5, 'BTC lui-même : 1');
  c2.S.tradingMode = 'sim'; assert.ok(sc(c2, 'macro_v1', 'ETH/USDT').score > 0.4, 'AA : pas de garde');
});
T('V12 · macro_v1 RÉEL : climat × corrélation de la paire à BTC (EUR → 0) ; chaque source a son heure : Fear & Greed vieux de 40 min → seul l\'élan de la cap compte ; les deux vieux → en attente ; flux d\'avant (sans heures par source) → comme avant', () => {
  const now = Date.now(), base = { fng: 10, fngLabel: 'Extreme Fear', cap24h: 2.5, t: now };
  const btc = sc(scoutCtx({ macroFeed: base }), 'macro_v1', 'BTC/USDT').score, eth = sc(scoutCtx({ macroFeed: base }), 'macro_v1', 'ETH/USDT').score;
  assert.ok(Math.abs(btc - (0.6 * 0.6 + 0.2)) < 1e-9, 'BTC : ' + btc); assert.ok(Math.abs(eth - btc * 0.8) < 1e-9, 'ETH × 0,8 : ' + eth);
  assert.strictEqual(sc(scoutCtx({ macroFeed: base }), 'macro_v1', 'EUR/USDT').score, 0); assert.strictEqual(sc(scoutCtx({ macroFeed: base }), 'macro_v1', 'XRP/USDT').reasoning, 'Macro : corrélation à BTC inconnue');
  const capOnly = sc(scoutCtx({ macroFeed: Object.assign({}, base, { tFng: now - 40 * 60000, tCap: now }) }), 'macro_v1', 'BTC/USDT'); assert.ok(Math.abs(capOnly.score - 0.2) < 1e-9 && capOnly.reasoning.startsWith('Fear & Greed en attente'), JSON.stringify(capOnly));
  const fngOnly = sc(scoutCtx({ macroFeed: Object.assign({}, base, { tFng: now, tCap: now - 40 * 60000 }) }), 'macro_v1', 'BTC/USDT'); assert.ok(Math.abs(fngOnly.score - 0.36) < 1e-9 && !fngOnly.reasoning.includes('cap globale'), JSON.stringify(fngOnly));
  assert.ok(sc(scoutCtx({ macroFeed: Object.assign({}, base, { tFng: now - 40 * 60000, tCap: now - 40 * 60000 }) }), 'macro_v1', 'BTC/USDT').reasoning.startsWith('En attente du flux macro'));
});
T('V13 · fundamental_v1 RÉEL : le financement se mesure depuis le taux de base de Binance (+0,01 %/8 h) — à 0,01 % le terme est nul (avant −0,08 avec les gènes par défaut, sur toutes les paires) ; à 0 % il penche à l\'achat ; à 0,05 % à la vente', () => {
  const f = fund => sc(scoutCtx({ positioning: { 'ETH/USDT': { funding: fund, t: Date.now() } } }), 'fundamental_v1', 'ETH/USDT').score;
  assert.strictEqual(f(0.01), 0); assert.ok(Math.abs(f(0) - 0.08) < 1e-9, 'à 0 % : ' + f(0)); assert.ok(Math.abs(f(0.05) + 0.32) < 1e-9, 'à 0,05 % : ' + f(0.05));
  assert.ok(/var FUND_BASE_PCT = 0\.01;\s+\/\/ financement « neutre » de Binance : l'intérêt de sa formule, 0,03 %\/jour soit 0,01 % par période de 8 h — un fait de la bourse, pas une limite/.test(s03));
});
T('V14 · nlp_v1 RÉEL : ton des news de la paire − ton de toutes les news (avant : − 50, biais haussier de la liste de mots) ; ton global non mesurable → abstention', () => {
  const run = (pairS, glob) => { const c = scoutCtx(); c._newsPairSignal = () => ({ score: pairS, nScored: 10, n: 12, label: 'haussier' }); c._newsGlobal = () => glob; c._newsSourceAlive = () => true; return sc(c, 'nlp_v1', 'ETH/USDT'); };
  const a = run(70, { score: 65 }); assert.ok(Math.abs(a.score - 0.1) < 1e-9 && a.reasoning.includes('70/100 contre 65/100 toutes paires'), JSON.stringify(a));
  assert.strictEqual(run(70, { score: 70 }).score, 0); assert.ok(run(40, { score: 60 }).score < 0);
  const n = run(70, null); assert.deepStrictEqual([n.score, n.conf, n.reasoning], [0, 0, 'News : ton global non mesurable — neutre']);
});
T('V15 · 07 _macroFeedRefresh RÉEL : chaque source a son heure (tFng, tCap) — Fear & Greed seul répond → tFng posée, pas tCap ; puis la cap répond → tCap', async () => {
  let fg = [{ value: '20', value_classification: 'Fear' }], gl = null;
  const c = { S: {}, Date, Number, Object, isFinite, window: {}, _fetchFearGreed: async () => fg, _fetchGlobal: async () => gl }; vm.createContext(c); vm.runInContext(MACROFEED, c);
  await vm.runInContext('_macroFeedRefresh()', c); const f1 = J(c.S.macroFeed); assert.ok(f1.tFng > 0 && f1.t > 0 && !('tCap' in f1), JSON.stringify(f1));
  gl = { market_cap_percentage: { btc: 55 }, market_cap_change_percentage_24h_usd: 1.5 }; fg = null;
  await vm.runInContext('_macroFeedRefresh()', c); const f2 = J(c.S.macroFeed); assert.ok(f2.tCap > 0 && f2.cap24h === 1.5 && f2.tFng === f1.tFng, JSON.stringify(f2));
});
T('V16 · persistance, en-têtes, jeton : _degelMigrated écrit (09b1), relu (09b2), au manifeste ; 02, 03, 07, 08, 09b1, 09b2, 10g, 10i, 12 commencent par l\'en-tête DÉGEL DES VOIX ; HTML : 82 × ' + TOK + ', plus de 20261001a', () => {
  assert.ok(s9b1.includes('_degelMigrated: !!S._degelMigrated,')); assert.ok(s9b2.includes('if (snap._degelMigrated)                                                  S._degelMigrated = true;'));
  assert.ok(/'_abstMigrated','_degelMigrated',/.test((s9b2.match(/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/) || [])[1] || ''), 'manifeste');
  const H = '// [DÉGEL DES VOIX · 02/10/2026] VERSION 20261002a';
  [s02, s03, s07, s08, s9b1, s9b2, s10g, rd('js/10i-intel-bus.js'), s12].forEach((s, i) => assert.ok(s.startsWith(H), 'en-tête ' + i));
  assert.strictEqual(TOK, '20261005b'); assert.strictEqual(html.split('20261005b').length - 1, 82); assert.strictEqual(html.split('20261005a').length - 1, 0); assert.strictEqual(html.split('20261004a').length - 1, 0);   // [CARTES · 05/10/2026] HTML au jeton 20261005b
   assert.strictEqual(html.split('20261002a').length - 1, 0); assert.strictEqual(html.split('20261001a').length - 1, 0);
  assert.ok(s03.includes("// ═══ [DÉGEL DES VOIX · 02/10/2026] LES VOIX LISENT CE QU'ELLES CROIENT LIRE (go Rams 01/10 20:51 : « l'horloge par mode en premier … Ensuite le dégel ») ═══"));
  assert.ok(fs.existsSync(path.join(ROOT, 'banc-fixtures/harmonic-avant-genome-20260923c.js')) && fs.existsSync(path.join(ROOT, 'banc-fixtures/analyse-avant-genome-20260916a.js')), 'oracles');
});

T('V17 · 03 _thWalk RÉEL : un bouche-trou sur le chemin d\'un trade virtuel → en attente (avant : abandonné sur-le-champ, la réparation arrivait trop tard) ; réparé → jugé sur les vraies bougies ; jamais réparé → abandonné 4 bougies après la sortie ; bougie MANQUANTE → abandon immédiat comme avant', () => {
  const T0 = 1790000000000 - (1790000000000 % F), mkS = () => Array.from({ length: 12 }, (_, i) => ({ ts: T0 + i * F, o: 100 + i * 0.1, h: 100.3 + i * 0.1, l: 99.9 + i * 0.1, c: 100.2 + i * 0.1, v: 5, n: 3 }));
  const run = (arr, now, walk, q) => { const c = { S: { realCandles: { 'A/USDT': { '15m': arr } } }, Math, Number, _thTfMs: () => F }; vm.createContext(c); vm.runInContext(THCANDLE + (walk || THWALK), c); c.__q = q; vm.runInContext('_thWalk(__q, 0.1, ' + now + ')', c); return J(q.n); };
  const mkQ = () => ({ p: 'A/USDT', tf: '15m', f: F, px: 100.5, d: 1, cap: 2, s: T0 + 3 * F, s0: T0 + 4 * F, el: 100.4, eh: 100.6, hit: 0, x: [T0 + 5 * F, T0 + 6 * F], n: [null, null] });
  const holed = mkS(); hole(holed, 5);
  let q = mkQ(); assert.deepStrictEqual(run(holed, T0 + 8 * F, null, q), [null, null], 'bouche-trou : en attente');
  const oldWalk = THWALK.replace("    if (b.ts > q.s + f) { cut = q.s + f; break; }   // bougie manquante : chemin inconnu\n", '').replace(/    if \(b\._gap\) break;[^\n]*\n/, '    if (b._gap || b.ts > q.s + f) { cut = (b.ts > q.s + f) ? q.s + f : b.ts; break; }\n');
  assert.ok(oldWalk !== THWALK && oldWalk.includes('cut = (b.ts > q.s + f)')); assert.deepStrictEqual(run(holed, T0 + 8 * F, oldWalk, mkQ()), [false, false], 'avant : abandonné sur-le-champ');
  const repaired = mkS(); const nx = run(repaired, T0 + 8 * F, null, q); assert.ok(typeof nx[0] === 'number' && typeof nx[1] === 'number', 'réparé : jugé ' + JSON.stringify(nx));
  assert.ok(Math.abs(nx[0] - ((repaired[5].c - 100.5) / 100.5 * 100 - 0.1)) < 1e-3, 'net à la clôture réelle de la bougie de sortie');
  assert.deepStrictEqual(run(holed, T0 + 9 * F + F / 2, null, mkQ()), [false, null], 'jamais réparé : abandonné 4 bougies après la sortie (la 2e attend encore)');
  assert.deepStrictEqual(run(holed, T0 + 10 * F + F / 2, null, mkQ()), [false, false], 'puis la 2e');
  const missing = mkS(); missing.splice(5, 1); assert.deepStrictEqual(run(missing, T0 + 8 * F, null, mkQ()), [false, false], 'bougie manquante : abandon immédiat, comme avant');
});
T('V18 · volume : bougies REST marquées _r (02 _fetchAndBootstrapRealCandles RÉEL), marque retirée quand le flux retouche la bougie (02 _aggregateRealPrice RÉEL), gardée par la projection (08) ; volume_v1 RÉEL : abstention si sa fenêtre mêle REST et flux (bougie en cours comprise, comme avant)', async () => {
  const now = Date.now(), t1 = Math.floor(now / F) * F, kl = Array.from({ length: 60 }, (_, i) => [t1 - (59 - i) * F, '100', '101', '99', '100.5', String(300 + i), 0, '0', 4000 + i]);
  const cb = { S: { realCandles: {} }, Date, Math, JSON, window: {}, performance: { now: () => 0 }, _rcLastPx: {}, fetch: async () => ({ ok: true, json: async () => kl }) };
  vm.createContext(cb); vm.runInContext(BOOT, cb); await vm.runInContext("_fetchAndBootstrapRealCandles('B/USDT', '15m', true)", cb);
  const arr = cb.S.realCandles['B/USDT']['15m']; assert.strictEqual(arr.length, 60); assert.ok(arr.every(k => k._r === 1 && k.v >= 300 && k.n >= 4000), 'REST : marquées, volume en monnaie de base');
  const ca = { S: { realCandles: { 'B/USDT': { '15m': arr } } }, Date, Math, Object, window: {}, _rcLastPx: {}, REAL_CANDLE_INTERVALS: { '15m': F }, REAL_CANDLES_MAX: 200, _ensureRealCandlesStruct: () => {} };
  vm.createContext(ca); vm.runInContext(OUTLIER + CSTART + AGG, ca); vm.runInContext("_aggregateRealPrice('B/USDT', 100.6, " + (t1 + 5000) + ')', ca);
  assert.strictEqual(arr[59]._r, undefined, 'bougie en cours retouchée par le flux : plus REST'); assert.strictEqual(arr[59].v, arr[59].n, 'son v devient un compte'); assert.ok(arr.slice(0, 59).every(k => k._r === 1), 'les closes restent REST');
  const pc = { S: { tradingMode: 'paperReal', paperRealTimeframe: '15m', realCandles: { 'B/USDT': { '15m': arr } }, pairStates: { 'B/USDT': { candles: [], price: 100.6 } } }, Date, Math, Object, Array, window: {}, _getActiveRealTimeframe: () => '15m' };
  vm.createContext(pc); vm.runInContext(PROJ, pc); vm.runInContext('_projectRealCandles()', pc); const P = pc.S.pairStates['B/USDT'].candles;
  assert.deepStrictEqual([P.length, P.filter(k => k._r === 1).length, P._real], [60, 59, true], 'projection : marques gardées');
  // volume_v1 : fenêtre de 20 bougies (recentN 5 + histN 15), bougie en cours comprise (comme avant)
  const vol = (cands, mode) => { const c = scoutCtx({ tradingMode: mode || 'paperReal' }); c.S.pairStates['V/USDT'] = { candles: cands, price: cands[cands.length - 1].c }; return sc(c, 'volume_v1', 'V/USDT'); };
  const mkV = (n, vf, rf) => { const a = Array.from({ length: n }, (_, i) => Object.assign({ o: 100, h: 101, l: 99, c: 100 + i * 0.01, v: vf(i), ts: t1 - (n - 1 - i) * F }, rf && rf(i) ? { _r: 1 } : {})); a._real = true; return a; };
  const flux = vol(mkV(30, i => i >= 25 ? 2000 : 1000)); assert.ok(flux.reasoning.startsWith('Pic de volume ×2.0'), 'flux seul : ' + flux.reasoning);
  const mix = vol(mkV(30, i => i < 25 ? 300 : 1000, i => i < 25)); assert.deepStrictEqual([mix.score, mix.reasoning], [0, 'Volume : deux sources dans la fenêtre (bougies redemandées à Binance et bougies du flux) — en attente']);
  const mix2 = vol(mkV(30, i => i < 29 ? 300 : 40, i => i < 29)); assert.strictEqual(mix2.score, 0, 'bougie en cours retouchée par le flux après une réparation : fenêtre mêlée');
  const rest = vol(mkV(30, i => i >= 25 ? 600 : 300, () => true)); assert.ok(rest.reasoning.startsWith('Pic de volume ×2.0'), 'toutes REST (série rafraîchie) : vote ' + rest.reasoning);
  const old = mkV(30, i => i < 10 ? 300 : 1000, i => i < 10); assert.ok(vol(old).reasoning.startsWith('Volume normal') || vol(old).reasoning.startsWith('Volume faible'), 'les bougies REST sorties de la fenêtre ne comptent plus : ' + vol(old).reasoning);
});
T('V19 · 12 _electTasks RÉEL : l\'élection ne donne à un gardien que « conditions » (un disciple gardien élu « timing » restait muet à vie) ; les autres disciples gardent direction / timing', () => {
  const S = { botDisciples: { smart_sizer_v1: ['security_v1'], scalper_bot_v1: ['macro_v1', 'nlp_v1', 'risk_bot_v1'] }, discipleTasks: {}, discipleAngles: { security_v1: 'timing' }, chainLog: [],
    agents: [{ id: 'security_v1', name: 'Sécurité', corrections: 30, errors: 2, conf: 0.9 }, { id: 'macro_v1', name: 'Macro', corrections: 5, errors: 5, conf: 0.5 }, { id: 'nlp_v1', name: 'NLP', corrections: 6, errors: 4, conf: 0.5 }, { id: 'risk_bot_v1', name: 'Risk', corrections: 40, errors: 1, conf: 0.95 }] };
  const c = { S, Math, Object, Array, JSON, Set, Date, window: {} }; vm.createContext(c); vm.runInContext(TIERS + '\n' + ELECT, c); vm.runInContext('_electTasks()', c);
  assert.deepStrictEqual([S.discipleAngles.security_v1, S.discipleAngles.risk_bot_v1], ['conditions', 'conditions']);
  assert.deepStrictEqual([S.discipleAngles.macro_v1, S.discipleAngles.nlp_v1].sort(), ['direction', 'timing']);
});

(async () => {
  for (const [name, fn] of pending) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
  process.exit(fail ? 1 : 0);
})();
