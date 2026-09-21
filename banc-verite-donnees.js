// banc-verite-donnees.js — [1b-a · 14/09/2026] VERSION 20260914a
// BANC DE VÉRITÉ DES DONNÉES (AUDIT-VERITE-AURA8.md §5) — verrouille la lignée des données de décision.
// Une régression de vérité = échec = VERDICT NON LIVRABLE (jamais « CONNU, toléré »).
//  S · statique — sur le texte livré : filtre outlier non auto-bloquant (02), fraîcheur AVANT « nouvelle bougie close »
//      (10g, 08), garde-fou perte max et balayage des sorties bot appelés par le battement (08), aucune sortie TP/SL
//      dans la résolution (10f), limiteur de bootstrap (02), GBP/USDT retirée d'EV/RE (09b2), en-têtes et HTML au token.
//  D · dynamique — les fonctions RÉELLES en vm : _aggregateRealPrice accepte un prix cohérent malgré une 5m figée à −30 %
//      et se répare seul après 5 min ; _resolvePaperRealCycle refetch dès le tick suivant sur une série figée ;
//      _botExitSweep ferme une position auto sous SL sans résolution (sémantique inchangée : SL immédiat, TP après
//      5 cycles, breakeven à 45 % du TP, canBotClose) ; _evRetireDelisted idempotent ; _realCandlesStale = critère des portes.
//  ⏳ en attente — tests dont la phase n'est pas livrée (1c : cut→cutEnd, évolution 1/h, héritage, evoLog ; 1b-b : AT sur
//      klines ; heatmap par mode) : affichés, non comptés, activés à la livraison de leur phase.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname;
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const TOK = (() => { const m = rd('AURA8_v118.html').match(/DOC_V = '(\d{8}[a-z])'/); if (!m) { console.error('DOC_V introuvable'); process.exit(2); } return m[1]; })();
let pass = 0, fail = 0, pend = 0;
const _queue = [];
function T(name, fn) { _queue.push([name, fn]); }
async function _runQueue() { for (const [name, fn] of _queue) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } } }
function P(phase, name) { pend++; console.log('  ⏳ ' + name + '  ← en attente de ' + phase); }
const F02 = 'js/02-state-init.js', F08 = 'js/08-learning-history-render.js', F10F = 'js/10f-resolveur-cycle.js',
      F10G = 'js/10g-resolveur-ev-csv.js', F9B2 = 'js/09b2-save-load.js';
const s02 = rd(F02), s08 = rd(F08), s10f = rd(F10F), s10g = rd(F10G), s9b2 = rd(F9B2), html = rd('AURA8_v118.html');
const count = (s, k) => s.split(k).length - 1;
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\/\/.*$/, '')).join('\n');
const between = (s, a, b, what, incl) => {
  const i = s.indexOf(a); assert.ok(i >= 0, what + ' : ancre début absente');
  assert.strictEqual(s.indexOf(a, i + 1), -1, what + ' : ancre début non unique');
  const j = s.indexOf(b, i + a.length); assert.ok(j > i, what + ' : ancre fin absente');
  return s.slice(i, incl ? j + b.length : j);
};
const HDR = '// [1b-a · 14/09/2026] VERSION 20260914a';   // 02/08/10g/09b2 livrés au token 20260914a ; 10f suit le token courant (hotfix b)
console.log('▶ banc-verite-donnees · token ' + TOK);

/* ═══════════════════════════ S · STATIQUE ════════════════════════════ */
console.log('\n── S · statique ──');
T('S1 · 02 : filtre outlier = _rcOutlier (référence = dernier prix accepté < 5 min), plus aucune référence au close 5m ni au dernier close de série', () => {
  const c = codeStrict(s02);
  assert.strictEqual(count(c, 'function _rcOutlier(pair, price, ts)'), 1);
  assert.strictEqual(count(c, "S.realCandles[pair]['5m']"), 0, 'le close 5m ne doit plus servir de référence');
  assert.strictEqual(count(c, 'const ref5m'), 0);
  assert.strictEqual(count(c, 'const ref = arr.length > 0 ? arr[arr.length - 1].c : null;'), 0, 'référence par intervalle retirée (modal)');
  assert.strictEqual(count(c, 'S.pairStates[pair].price : null'), 0, 'référence kline retirée');
  assert.strictEqual(count(c, 'if (_rcOutlier(pair, price, ts)) return;'), 2, '@trade + modal');
  assert.strictEqual(count(c, '_rcOutlier(pair, k.c, Date.now())'), 1, '@kline');
  assert.ok(c.includes("(now - ref.ts) < 300000 && Math.abs(price - ref.px) / ref.px > 0.02"));
});
T('S2 · 10g et 08 : le test de fraîcheur (stalenessThreshold + refetch) PRÉCÈDE « closedTs <= lastSeenTs »', () => {
  for (const [f, s, fn] of [[F10G, s10g, 'function _resolvePaperRealCycle(pair, ps) {'], [F08, s08, 'const tf = S.realTimeframe || \'15m\';']]) {
    const body = codeStrict(s.slice(s.indexOf(fn)));   // hors commentaires (les commentaires 1b-a citent l'ancien ordre)
    const iFresh = body.indexOf('dataAge > stalenessThreshold'), iClosed = body.indexOf('closedTs <= lastSeenTs'), iFetch = body.indexOf('_fetchAndBootstrapRealCandles(pair, tf)');
    assert.ok(iFresh > 0 && iClosed > 0 && iFetch > 0, f);
    assert.ok(iFresh < iClosed, f + ' : fraîcheur après closedTs');
    assert.ok(iFetch < iClosed, f + ' : refetch après closedTs');
    assert.ok(body.slice(0, iClosed).includes('arr.length < 30 || dataAge > stalenessThreshold'), f + ' : série courte → refetch');
  }
});
T('S3 · 08 : _lossCapSweep() et _botExitSweep() appelés par le battement, « SUPPRIME (regle Rams 27/07 » disparu', () => {
  const c = codeStrict(s08);
  assert.strictEqual(count(c, 'window._lossCapSweep()'), 1);
  assert.strictEqual(count(c, 'window._botExitSweep()'), 1);
  assert.strictEqual(count(s08, 'garde-fou perte max a ete SUPPRIME'), 0);
  assert.ok(c.indexOf('window._botExitSweep()') > c.indexOf('_applyPaperRealProtection();'), 'après la protection du mode traité');
  assert.ok(c.indexOf('window._botExitSweep()') < c.indexOf('ps.cycleTimer -= _step;'), 'avant la résolution des cycles');
});
T('S4 · 10f : aucune vérification TP/SL dans _resolvePairCycleCore (écrit _tpPct/_slPct), _botExitSweep défini, _lossCapSweep défini UNE fois', () => {
  const core = between(s10f, 'function _resolvePairCycleCore', 'window._resolvePairCycleCore', 'core');
  const cc = codeStrict(core);
  assert.strictEqual(count(cc, 'tpHit'), 0); assert.strictEqual(count(cc, 'slHit'), 0);
  assert.strictEqual(count(cc, 'botPos._tpPct=tpPct; botPos._slPct=slPct;'), 1);
  assert.ok(cc.includes('if(canBotClose && minHoldMet && (sigRev||timeClose||hardTime||consRev)){'));
  assert.strictEqual(count(s10f, 'window._botExitSweep = function _botExitSweep()'), 1);
  assert.strictEqual(count(s10f, 'window._lossCapSweep = function _lossCapSweep()'), 1);
  assert.strictEqual(count(html, '10-fin-bloc-restauration-v93.js'), 0, 'la copie morte de 10-fin-bloc n\'est pas chargée');
});
T('S5 · 09b2 : les 6 historiques rotatifs de _auraRotatePurge gardent le plus RÉCENT (cutEnd), plus aucun cut( (tête)', () => {
  const c = codeStrict(s9b2);
  assert.strictEqual(count(c, ' cut('), 0, 'cut( = tête, interdit');
  for (const k of ['S.learningHistory  = cutEnd(S.learningHistory, 80);', 'S.globalMemoryPool = cutEnd(S.globalMemoryPool, 30);', 'S.fiscalReserveLog = cutEnd(S.fiscalReserveLog, 50);', 'S.dreamJournal     = cutEnd(S.dreamJournal, 30);', 'w.dreamJournal      = cutEnd(w.dreamJournal, 40);', 'w.antiNegReserveLog = cutEnd(w.antiNegReserveLog, 50);']) assert.ok(c.includes(k), k);
});
T('S6 · 07 : évolution ≥ 1 h (_EVO_COOLDOWN_MS 3 600 000), rêve ≥ 24 h (86 400 000), type/source du siège via _SEAT_DEF (21 sièges), regimeFitness du siège conservée', () => {
  const s07 = rd('js/07-v90-mode-bunker-sos.js'), c = codeStrict(s07);
  assert.ok(c.includes('const _EVO_COOLDOWN_MS = 3600000;'));
  assert.ok(c.includes('const _DREAM_COOLDOWN_MS = 86400000;'));
  assert.ok(c.includes("weak.type    = _sd ? _sd.type   :"));
  assert.ok(c.includes("weak.regimeFitness = (weak.regimeFitness && typeof weak.regimeFitness === 'object') ? weak.regimeFitness : {};"));
  assert.strictEqual(count(c, 'weak.regimeFitness = mergeRegimeFit('), 0);
  const m = s07.match(/const _SEAT_DEF = \{([\s\S]*?)\n\};/); assert.ok(m);
  const ids = (m[1].match(/'([a-z_0-9]+)': \{ type:/g) || []).length; assert.strictEqual(ids, 21, 'sièges dans la carte : ' + ids);
  assert.ok(m[1].includes("'macro_v1': { type: 'Linear·FRED', source: 'Fed/BCE/FMI' }"));
});
T('D6 · _auraRotatePurge RÉEL : 200 learningHistory → les 80 PLUS RÉCENTS survivent (cycles 121…200), idem dreamJournal (30) et globalMemoryPool (30)', () => {
  const src = between(s9b2, 'function _auraRotatePurge() {', '\nsetInterval(_auraRotatePurge, 120000);', 'purge');
  const S = { learningHistory: Array.from({ length: 200 }, (_, i) => ({ cycle: i + 1 })), dreamJournal: Array.from({ length: 50 }, (_, i) => ({ n: i + 1 })), globalMemoryPool: Array.from({ length: 40 }, (_, i) => ({ n: i + 1 })), fiscalReserveLog: [], realCandles: {}, walletStore: {} };
  const ctx = { S, Array, Object, Math, console, window: {} }; vm.createContext(ctx);
  vm.runInContext(src + '\n_auraRotatePurge();', ctx);
  assert.strictEqual(S.learningHistory.length, 80); assert.strictEqual(S.learningHistory[0].cycle, 121); assert.strictEqual(S.learningHistory[79].cycle, 200);
  assert.strictEqual(S.dreamJournal.length, 30); assert.strictEqual(S.dreamJournal[0].n, 21);
  assert.strictEqual(S.globalMemoryPool.length, 30); assert.strictEqual(S.globalMemoryPool[29].n, 40);
});
T('S11 · 13-veille-ecran : plus de canvas, plus de requestAnimationFrame, plus d\'eval ; étoiles CSS (vTw), wake lock et appui long conservés', () => {
  const s13 = rd('js/13-veille-ecran.js'), c = codeStrict(s13);
  assert.strictEqual(count(c, 'requestAnimationFrame'), 0); assert.strictEqual(count(c, 'getContext('), 0); assert.strictEqual(count(c, 'shadowBlur'), 0); assert.strictEqual(count(c, 'eval'), 0);
  assert.ok(c.includes('@keyframes vTw') && c.includes('wakeLock.request') && c.includes("getElementById('wakeLockBtn')") && c.includes('window._veilleNow=enter'));
  assert.ok(s13.startsWith('// ▓▓▓ VERSION 20260915b ▓▓▓'));   // 13 livré en 1c-lite, non retouché depuis
});
T('S7 · 09b2 : GBP/USDT (retirée de Binance le 29/12/2023) désactivée en EV/RE à chaque chargement', () => {
  assert.ok(s9b2.includes("var _EV_DELISTED_PAIRS = ['GBP/USDT'];"));
  assert.strictEqual(count(codeStrict(s9b2), 'var n = _evRetireDelisted();'), 1);
  assert.ok(s9b2.includes("['paperRealActivePairs', 'realActivePairs']"));
});
T('S8 · 02 : _realCandlesStale (critère des portes) utilisé au boot, limiteur 90 s / paire·tf dans _fetchAndBootstrapRealCandles, référence rafraîchie après bootstrap, op « bootstrap:PAIRE » sans espace', () => {
  const c = codeStrict(s02);
  assert.strictEqual(count(c, 'function _realCandlesStale(pair, tf)'), 1);
  assert.ok(c.includes('_isStalePaused || _realCandlesStale(pair, _bgTf)'));
  assert.ok(c.includes("if (_rcBootstrapAt[_bk] && (_bn - _rcBootstrapAt[_bk]) < 90000) return;"));
  assert.ok(c.includes("_rcLastPx[pair] = { px: _lk.c, ts: Date.now() }"));
  assert.ok(c.includes("window._perfOp('bootstrap:' + pair)"));
  assert.strictEqual(count(c, "'bootstrap candles '"), 0);
});
T('S9 · en-têtes 02/08/10g/09b2 « ' + HDR + ' », 10f « ▓▓▓ VERSION 20260917b ▓▓▓ » (hotfix b), HTML : DOC_V + 78 ?v= (79), aucun autre token', () => {
  assert.ok(s10g.startsWith(HDR), F10G);
  assert.ok(s08.startsWith('// [JOURNAL DES ÉVÉNEMENTS · 20/09/2026] VERSION 20260920b') && s08.split('\n').slice(0, 6).some(l => l.startsWith(HDR)), F08);   // [1b-b] 08 relivré, en-tête 1b-a en 2e ligne
  assert.ok(s02.startsWith('// [PLAFOND DE SENS · 21/09/2026] VERSION 20260921a') && s02.split('\n').slice(0, 8).some(l => l.startsWith(HDR)), F02);   // [SONDE RÉSEAU] 02 relivré, en-tête 1b-a en 2e ligne
  assert.ok(s9b2.startsWith('// [JOURNAL DES ÉVÉNEMENTS · 20/09/2026] VERSION 20260920b') && s9b2.split('\n').slice(0, 10).some(l => l.startsWith(HDR)), F9B2);   // [FITNESS GLISSANTE] 09b2 relivré, en-tête 1b-a dans les 6 premières lignes
  assert.ok(s10f.startsWith('// ▓▓▓ VERSION 20260917b ▓▓▓'));   // 10f livré au hotfix b, non retouché depuis
  assert.strictEqual(count(html, TOK), 80);   // [ATTRIBUTION PAR SOURCE 17/09] 10i-intel-bus ajouté
  assert.strictEqual((html.match(/\?v=\d{8}[a-z]/g) || []).length, 79);
  assert.strictEqual((html.match(/\?v=\d{8}[a-z]/g) || []).filter(t => t !== '?v=' + TOK).length, 0);
});

/* ═══════════════════════════ D · DYNAMIQUE ═══════════════════════════ */
console.log('\n── D · dynamique (fonctions réelles en vm) ──');
const TF_MS = { '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1j': 86400000 };
const mkCandles = (n, tf, lastTs, close) => { const out = []; for (let i = n - 1; i >= 0; i--) out.push({ ts: lastTs - i * TF_MS[tf], o: close, h: close, l: close, c: close, v: 1, n: 1 }); return out; };
function ctxOutlier(realCandles) {
  const ctx = { console, Math, Date, isFinite, Number, Object, Array, window: {}, S: { realCandles, pairStates: {} },
    REAL_CANDLE_INTERVALS: TF_MS, REAL_CANDLES_MAX: 200,
    _candleStartTs: (now, ms) => Math.floor(now / ms) * ms,
    _ensureRealCandlesStruct: function () { Object.keys(ctx.S.realCandles).forEach(p => Object.keys(TF_MS).forEach(tf => { if (!ctx.S.realCandles[p][tf]) ctx.S.realCandles[p][tf] = []; })); } };
  vm.createContext(ctx);
  vm.runInContext(between(s02, 'var _rcLastPx = {};', 'window._rcOutlier = _rcOutlier;', 'rcOutlier', true), ctx);
  vm.runInContext(between(s02, 'function _aggregateRealPrice(pair, price, ts) {', '\n}\n\n/**', 'aggregate', false) + '\n}', ctx);
  return ctx;
}
T('D1 · _aggregateRealPrice RÉEL : 5m figée à −30 % (ETH 1 919 du 19/08 vs 2 501) → le prix cohérent est ACCEPTÉ sur 15m et 5m ; un glitch +4 % est rejeté ; sans référence < 5 min le filtre se répare seul', () => {
  const now = Date.UTC(2026, 8, 14, 13, 20, 7);
  const c = ctxOutlier({ 'ETH/USDT': {
    '5m':  mkCandles(60, '5m',  Date.UTC(2026, 7, 19, 7, 45), 1919.02),
    '15m': mkCandles(60, '15m', Math.floor(now / 900000) * 900000, 2500) } });
  const r = c.S.realCandles['ETH/USDT'];
  const run = (px, t) => vm.runInContext("_aggregateRealPrice('ETH/USDT', " + px + ", " + t + ")", c);
  run(2501, now);
  assert.strictEqual(r['15m'][r['15m'].length - 1].c, 2501, '15m mise à jour malgré la 5m figée');
  assert.strictEqual(r['5m'][r['5m'].length - 1].c, 2501, '5m reprend sur le vrai');
  assert.strictEqual(r['5m'][r['5m'].length - 1].ts, Math.floor(now / 300000) * 300000);
  run(2600, now + 1000);   // +4 % en 1 s = glitch
  assert.strictEqual(r['15m'][r['15m'].length - 1].c, 2501, 'glitch +4 % rejeté');
  run(2510, now + 2000);
  assert.strictEqual(r['15m'][r['15m'].length - 1].c, 2510, '+0,36 % accepté');
  run(2900, now + 400000);   // référence vieille de 6 min 38 → plus de référence : accepté, redevient la référence
  assert.strictEqual(r['15m'][r['15m'].length - 1].c, 2900, 'auto-réparation sans référence fraîche');
  run(2950, now + 401000);
  assert.strictEqual(r['15m'][r['15m'].length - 1].c, 2950);
  assert.strictEqual(c._rcLastPx['ETH/USDT'].px, 2950);
});
T('D2 · _resolvePaperRealCycle RÉEL (tête) : série 15m figée depuis 17 h et closedTs déjà vu → refetch DÈS LE TICK SUIVANT ; < 30 bougies → refetch ; série fraîche → la porte est atteinte', () => {
  const head = between(s10g, 'function _resolvePaperRealCycle(pair, ps) {', '  const lastCandle = arr[arr.length - 1];', 'gate') + "\n  return 'REACHED';\n}";
  const now = Date.now();
  const stale = mkCandles(60, '15m', now - 17 * 3600000, 1.018);
  const calls = [];
  const ctx = { console, Math, Date, Infinity, isFinite, Number, Object, window: {},
    _fetchAndBootstrapRealCandles: (p, tf) => calls.push(p + ':' + tf),
    S: { paperRealActivePairs: { 'DOT/USDT': true }, paperRealGlobalPauseUntil: 0, paperRealKillSwitch: {}, paperRealConfig: { cooldownMs: 1 },
         fullPowerMode: false, paperRealLastClose: {}, paperRealTimeframe: '15m', realCandles: { 'DOT/USDT': { '15m': stale } },
         realPairCycle: { 'DOT/USDT': stale[stale.length - 2].ts } } };
  vm.createContext(ctx); vm.runInContext(head, ctx);
  const ps = { price: 1.011 };
  assert.strictEqual(vm.runInContext("_resolvePaperRealCycle('DOT/USDT', " + JSON.stringify(ps) + ")", ctx), undefined);
  assert.deepStrictEqual(calls, ['DOT/USDT:15m'], 'refetch au 1er tick sur une série figée déjà vue');
  ctx.S.realCandles['DOT/USDT']['15m'] = stale.slice(-10);
  vm.runInContext("_resolvePaperRealCycle('DOT/USDT', {price:1})", ctx);
  assert.strictEqual(calls.length, 2, 'série courte → refetch');
  ctx.S.realCandles['DOT/USDT']['15m'] = mkCandles(60, '15m', Math.floor(now / 900000) * 900000, 1.02);
  ctx.S.realPairCycle['DOT/USDT'] = 0;
  assert.strictEqual(vm.runInContext("_resolvePaperRealCycle('DOT/USDT', {price:1.02})", ctx), 'REACHED', 'série fraîche → porte atteinte');
  assert.strictEqual(calls.length, 2, 'pas de refetch sur du frais');
});
function ctxSweep(S) {
  const closed = [], learned = [], toasts = [];
  const ctx = { console, Math, Date, String, Error, isFinite, Number, window: {}, S,
    closePosition: (id, bot) => { closed.push([id, bot]); S.openPositions = S.openPositions.filter(p => p.id !== id); },
    learnFromOutcome: (src, pnl, pair) => learned.push([src, +pnl.toFixed(2), pair]),
    showToast: t => toasts.push(t) };
  vm.createContext(ctx);
  vm.runInContext(between(s10f, 'function _closeCompleted(pos, label) {', 'window._closeCompleted = _closeCompleted;', 'closeCompleted', true), ctx);
  vm.runInContext(between(s10f, 'window._botExitSweep = function _botExitSweep() {', '\nwindow._lossCapSweep = function', 'sweep'), ctx);
  return { ctx, closed, learned, toasts, run: () => vm.runInContext('window._botExitSweep()', ctx) };
}
T('D3 · _botExitSweep RÉEL : SL immédiat sans résolution, TP seulement après 5 cycles, breakeven à 45 % du TP, repli conviction, positions manuelles et MANU intouchées, P&L de la position rafraîchi', () => {
  const pos = (id, pair, side, entry, extra) => Object.assign({ id, pair, side, entryPrice: entry, stakeUsdt: 10, auto: true, sl: null, tp: null, _holdCycles: 0 }, extra || {});
  // (a) SL : long à −1,5 % avec _slPct 0,9 → fermé en botClose, learnFromOutcome('trade')
  let s = ctxSweep({ botAutoMode: true, pairStates: { 'DOT/USDT': { price: 98.5, qYes: 500, qNo: 700 } }, openPositions: [pos('a', 'DOT/USDT', 'long', 100, { _tpPct: 2.7, _slPct: 0.9 })] });
  s.run();
  assert.deepStrictEqual(s.closed, [['a', true]]); assert.deepStrictEqual(s.learned, [['trade', -1.5, 'DOT/USDT']]);
  assert.ok(s.toasts[0].includes('SL') && s.toasts[0].includes('-1.50%'));
  assert.ok(s.ctx.S.pairStates['DOT/USDT'].qYes < 200, 'LMSR réinitialisé');
  // (b) TP à +3 % : _holdCycles 0 → rien ; _holdCycles 5 → fermé
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 103 } }, openPositions: [pos('b', 'X/USDT', 'long', 100, { _tpPct: 2.7, _slPct: 0.9 })] });
  s.run(); assert.strictEqual(s.closed.length, 0, 'TP avant 5 cycles = rien');
  assert.strictEqual(s.ctx.S.openPositions[0].pnl, 3, 'P&L rafraîchi'); assert.strictEqual(s.ctx.S.openPositions[0].pnlUsdt, 0.3);
  s.ctx.S.openPositions[0]._holdCycles = 5; s.run();
  assert.deepStrictEqual(s.closed, [['b', true]]); assert.ok(s.toasts[0].includes('TP +2.7%'));
  // (c) breakeven : +1,3 % > 45 % de 2,7 → sl = entry × 1,001, pas fermé
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 101.3 } }, openPositions: [pos('c', 'X/USDT', 'long', 100, { _tpPct: 2.7, _slPct: 0.9, _holdCycles: 9 })] });
  s.run(); assert.strictEqual(s.closed.length, 0); assert.strictEqual(+s.ctx.S.openPositions[0].sl.toFixed(3), 100.1);
  // (c') short : breakeven au-dessous de l'entrée
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 98.7 } }, openPositions: [pos('c2', 'X/USDT', 'short', 100, { _tpPct: 2.7, _slPct: 0.9 })] });
  s.run(); assert.strictEqual(s.closed.length, 0); assert.strictEqual(+s.ctx.S.openPositions[0].sl.toFixed(3), 99.9);
  // (d) position antérieure sans _tpPct : repli sur la conviction d'ouverture (0,585 → tp 2,63 %, sl 0,92 %) → −1 % fermé
  s = ctxSweep({ botAutoMode: true, pairStates: { 'DOT/USDT': { price: 99 } }, openPositions: [pos('d', 'DOT/USDT', 'long', 100, { conviction: 0.585 })] });
  s.run(); assert.deepStrictEqual(s.closed, [['d', true]]);
  s = ctxSweep({ botAutoMode: true, pairStates: { 'DOT/USDT': { price: 99.2 } }, openPositions: [pos('d2', 'DOT/USDT', 'long', 100, { conviction: 0.585 })] });
  s.run(); assert.strictEqual(s.closed.length, 0, '−0,8 % > −0,92 % : reste ouverte');
  // (e) manuelle à −5 % : jamais touchée par ce balayage ; (f) MANU (botAutoMode false) : rien
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 95 } }, openPositions: [pos('e', 'X/USDT', 'long', 100, { auto: false, _slPct: 0.9 })] });
  s.run(); assert.strictEqual(s.closed.length, 0);
  s = ctxSweep({ botAutoMode: false, pairStates: { 'X/USDT': { price: 95 } }, openPositions: [pos('f', 'X/USDT', 'long', 100, { _slPct: 0.9 })] });
  s.run(); assert.strictEqual(s.closed.length, 0);
  // (g) sans prix → rien
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 0 } }, openPositions: [pos('g', 'X/USDT', 'long', 100, { _slPct: 0.9 })] });
  s.run(); assert.strictEqual(s.closed.length, 0);
});
T('D11 · _closeCompleted / _botExitSweep RÉELS (hotfix) : closePosition qui lève ou ne retire pas → AUCUN learnFromOutcome, 1 essai / 60 s, journal UNE fois avec la raison ; fermeture réussie → learn', () => {
  const mk = (closeImpl) => {
    const S = { botAutoMode: true, chainLog: [], pairStates: { 'DOT/USDT': { price: 97.6 } }, openPositions: [{ id: 'z', pair: 'DOT/USDT', side: 'long', entryPrice: 100, stakeUsdt: 10, auto: true, sl: null, _slPct: 0.9, _tpPct: 2.7, _holdCycles: 0 }] };
    const calls = { close: 0, learn: 0, dec: 0 };
    const ctx = { console, Math, Date, String, Error, isFinite, Number, window: { _decErr: () => calls.dec++ }, S,
      closePosition: (id, bot) => { calls.close++; return closeImpl(S, id); }, learnFromOutcome: () => calls.learn++, showToast: () => {} };
    vm.createContext(ctx);
    vm.runInContext(between(s10f, 'function _closeCompleted(pos, label) {', 'window._closeCompleted = _closeCompleted;', 'closeCompleted', true), ctx);
    vm.runInContext(between(s10f, 'window._botExitSweep = function _botExitSweep() {', '\nwindow._lossCapSweep = function', 'sweep'), ctx);
    return { ctx, calls, S, run: () => vm.runInContext('window._botExitSweep()', ctx) };
  };
  // (a) closePosition lève → position toujours là : 1 seul appel malgré 5 ticks, 0 learn, 1 ligne journal avec la raison
  let t = mk(() => { throw new TypeError("Cannot read properties of undefined (reading 'closedAt')"); });
  for (let i = 0; i < 5; i++) t.run();
  assert.strictEqual(t.calls.close, 1); assert.strictEqual(t.calls.learn, 0); assert.strictEqual(t.calls.dec, 1);
  assert.strictEqual(t.S.chainLog.length, 1); assert.ok(t.S.chainLog[0].desc.includes("TypeError: Cannot read properties of undefined (reading 'closedAt')"), t.S.chainLog[0].desc);
  assert.ok(t.S.chainLog[0].desc.includes('essai 1'));
  // 60 s plus tard : un nouvel essai, journal seulement au 10e
  t.S.openPositions[0]._exitFailAt = Date.now() - 61000; t.run();
  assert.strictEqual(t.calls.close, 2); assert.strictEqual(t.S.chainLog.length, 1);
  // (b) closePosition sans erreur mais ne retire pas → même garde, raison explicite
  t = mk(() => {}); t.run(); t.run();
  assert.strictEqual(t.calls.close, 1); assert.strictEqual(t.calls.learn, 0);
  assert.ok(t.S.chainLog[0].desc.includes('sans erreur mais position toujours ouverte'));
  // (c) fermeture réussie → learn UNE fois, aucune ligne ⚠
  t = mk((S, id) => { S.openPositions = S.openPositions.filter(p => p.id !== id); }); t.run(); t.run();
  assert.strictEqual(t.calls.close, 1); assert.strictEqual(t.calls.learn, 1); assert.strictEqual(t.S.chainLog.length, 0);
});
T('S10 · sonde réseau : 01 classe chaque ping (perfLog.net, HTTP ≥ 400 = échec, témoin CoinGecko, journal 📵/📶, _auraNetOffline) ; 02 gardien WS sans tempête (_bgNextTry, rien hors ligne) ; 09b1/09b2 portent perfLog.net', () => {
  const s01 = rd('js/01-chrono-network.js'), s9b1 = rd('js/09b1-build-snapshot.js');
  const c01 = codeStrict(s01), c02 = codeStrict(s02);
  assert.ok(s01.includes("_netProbe('https://api.binance.com/api/v3/ping', 5000)"));   // source brute : codeStrict tronque les URL (//)
  assert.ok(s01.includes("_netProbe('https://api.coingecko.com/api/v3/ping', 5000)"));
  assert.ok(c01.includes("kind: r.ok ? 'ok' : 'http'"), 'statut HTTP classé');
  assert.ok(c01.includes("window._auraNetOffline = (sNew === 'offline')"));
  assert.strictEqual(count(c01, "P.net.push(entry)"), 1);
  assert.ok(c02.includes("if (window._auraNetOffline) return;"), '02 : rien hors ligne');
  assert.strictEqual(count(c02, "_bgNextTry[pair] = _nowHC + (_bgCollectorRetryByPair[pair] || 1000);"), 3, '3 branches du gardien sous backoff');
  assert.ok(c02.includes("_bgNextTry[pair] = Date.now() + delay;"), 'retry onclose partage le backoff');
  assert.ok(codeStrict(s9b1).includes("net:   Array.isArray(p.net)   ? p.net.slice(-60)   : []"));
  assert.ok(codeStrict(s9b2).includes("net:   Array.isArray(_pl.net)   ? _pl.net.slice(-60)   : []"));
});
T('D12 · _netPing RÉEL (fetch simulé) : 418 → échec classé http 418 ; 2 échecs → témoin CoinGecko + journal 📵 « Binance seul injoignable » + hors ligne ; retour ok → journal 📶 avec la durée', async () => {
  const s01 = rd('js/01-chrono-network.js');
  const block = between(s01, 'var _pingFails = 0, _netOffSince = 0;', 'window._netPing = _netPing;', 'ping', true);
  const S = { perfLog: {}, chainLog: [] }, net = [];
  const responses = {};   // url → fn() → Promise<Response>|throw
  const ctx = { console, Math, Date, String, Promise, Array, setTimeout, clearTimeout, AbortController, navigator: { onLine: true },
    window: { S }, _setNet: (st) => net.push(st),
    fetch: (url) => responses[url]() };
  vm.createContext(ctx); vm.runInContext(block, ctx);
  const tick = () => new Promise(r => setTimeout(r, 15));
  responses['https://api.binance.com/api/v3/ping'] = () => Promise.resolve({ ok: false, status: 418 });
  responses['https://api.coingecko.com/api/v3/ping'] = () => Promise.resolve({ ok: true, status: 200 });
  vm.runInContext('_netPing()', ctx); await tick();
  assert.deepStrictEqual(net, [], '1er échec : pas encore hors ligne');
  assert.strictEqual(S.perfLog.net.length, 1); assert.strictEqual(S.perfLog.net[0].kind, 'http'); assert.strictEqual(S.perfLog.net[0].status, 418);
  vm.runInContext('_netPing()', ctx); await tick(); await tick();
  assert.deepStrictEqual(net, ['offline'], '2e échec : hors ligne');
  assert.strictEqual(S.perfLog.net[1].cg, 'ok 200');
  assert.strictEqual(S.chainLog.length, 1); assert.ok(S.chainLog[0].desc.includes('Binance http 418') && S.chainLog[0].desc.includes('Binance seul injoignable'), S.chainLog[0].desc);
  vm.runInContext('_netPing()', ctx); await tick(); await tick();
  assert.strictEqual(S.chainLog.length, 1, 'pas de 2e ligne 📵 tant que la coupure dure');
  responses['https://api.binance.com/api/v3/ping'] = () => Promise.resolve({ ok: true, status: 200 });
  vm.runInContext('_netPing()', ctx); await tick();
  assert.strictEqual(net[net.length - 1], 'online');
  assert.strictEqual(S.chainLog.length, 2); assert.ok(S.chainLog[1].desc.includes('tabli apr'), S.chainLog[1].desc);
  // réseau du tablet coupé : Binance error + CoinGecko error
  responses['https://api.binance.com/api/v3/ping'] = () => Promise.reject(new TypeError('Failed to fetch'));
  responses['https://api.coingecko.com/api/v3/ping'] = () => Promise.reject(new TypeError('Failed to fetch'));
  vm.runInContext('_netPing()', ctx); await tick(); vm.runInContext('_netPing()', ctx); await tick(); await tick();
  assert.ok(S.chainLog[2].desc.includes('seau du tablet coup') && S.chainLog[2].desc.includes('error (Failed to fetch)'), S.chainLog[2].desc);
});
T('D13 · checkBunker RÉEL : 3 positions ouvertes (mises sorties du compte) → aucune alerte ; vraie perte de 16 % de l\'equity → bunker ; messages sur l\'equity (compte + positions)', () => {
  const s07 = rd('js/07-v90-mode-bunker-sos.js');
  const src = between(s07, 'function _bkCapital() {', 'window.checkBunker = checkBunker;', 'bunker', true);
  const S = { tradingAccount: 106.42, openPositions: [], bunker: { active: false, capRef: 0, startCapital: 0, triggerTs: 0 } };
  const calls = [];
  const ctx = { S, Number, isFinite, Math, window: {}, _bkGet: () => ({ enabled: true, triggerDropPct: 15, actions: {} }), _bkState: () => S.bunker, exitBunker: () => {}, activateBunker: (d) => calls.push(+d.toFixed(1)) };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  vm.runInContext('checkBunker()', ctx);
  assert.strictEqual(S.bunker.capRef, 106.42, '1re référence = equity courante');
  S.openPositions = [{ stakeUsdt: 9.1, currentVal: 9.05 }, { stakeUsdt: 9.1, currentVal: 9.2 }, { stakeUsdt: 9.1, currentVal: 9.1 }]; S.tradingAccount = 106.42 - 27.3;
  vm.runInContext('checkBunker()', ctx);
  assert.deepStrictEqual(calls, [], '3 positions ouvertes : pas de bunker (avant : −25,6 %)');
  S.openPositions.forEach(p => { p.currentVal = 3.4; });   // vraie perte : 27,3 → 10,2 (equity 89,3 = −16,1 %)
  vm.runInContext('checkBunker()', ctx);
  assert.deepStrictEqual(calls, [16.1], 'vraie chute de 16,1 % → bunker');
  const c07 = codeStrict(s07); const seg = c07.slice(c07.indexOf('function _bkInitCapRef()'), c07.indexOf('function _bkUpdateBanner()') + 500);
  assert.strictEqual(count(seg, 'S.tradingAccount||0'), 0, 'plus aucune lecture du compte seul dans le bunker');
  assert.strictEqual(count(s07, 'compte + positions)'), 2, 'messages sur l\'equity');
});
T('D4 · 1c-FULL (banc-skill-borne.js rejoué ici) : à la fusion le siège garde mémoire, agentPairSkill, discipleTaskSkill, regimeFitness ; fitness = max(350, moyenne parents / 2) ; succession sans transfert ; 300 successions sans explosion', () => {
  const r = require('child_process').spawnSync(process.execPath, [path.join(ROOT, 'banc-skill-borne.js')], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/banc-skill-borne : (\d+)\/(\d+) OK/);
  assert.ok(r.status === 0 && m && m[1] === m[2] && +m[1] >= 30, 'banc-skill-borne doit passer entièrement (33/33) : ' + out.slice(-300));
  const sb = rd('banc-skill-borne.js');
  for (const k of ['agentPairSkill du siège CONSERVÉ', 'aucune copie envoyée', 'rien dupliqué', 'moyenne des parents 1300 / 2']) assert.ok(sb.includes(k), 'banc-skill-borne porte le test : ' + k);
});
T('D5 · 07 : plus aucun reset de mémoire/compétence dans triggerEvolution ; 12 : plus aucun transfert', () => {
  const c07 = codeStrict(rd('js/07-v90-mode-bunker-sos.js')), c12 = codeStrict(rd('js/12-bots-disciples.js'));
  assert.strictEqual(count(c07, 'weak.memory  = [];'), 0); assert.strictEqual(count(c07, 'delete S.agentPairSkill[weak.id]'), 0); assert.strictEqual(count(c07, 'delete S.discipleTaskSkill[weak.id]'), 0);
  assert.ok(c07.includes('window._onAgentEvolved(weak.id, prevName);'));
  assert.ok(c07.includes('weak.fitness = Math.max(350, Math.round(parents.reduce((t, p) => t + (Number(p.fitness) || 0), 0) / parents.length / 2));'));
  assert.strictEqual(count(c12, 'S.agentPairSkill[heir.id][pair].w +='), 0); assert.strictEqual(count(c12, 'heir.memory = (heir.memory || []).concat(memory)'), 0);
});
T('D7 · _projectRealCandles RÉEL : en EV ps.candles = 60 klines Binance avec ts (ce que lit getTechSignals) ; série périmée → figée + _candlesStale ; AA intact ; pas de réallocation sans nouvelle bougie ; pnl24h = variation de la fenêtre', () => {
  const src = between(s08, 'function _projectRealCandles() {', 'window._projectRealCandles = _projectRealCandles;', 'proj', true);
  const now = Date.now(), last15 = Math.floor(now / 900000) * 900000;
  const real = mkCandles(60, '15m', last15, 100); real[59].c = 101; real[0].c = 95;
  const synth = Array.from({ length: 60 }, () => ({ o: 1, h: 1, l: 1, c: 1, v: 1 }));
  const S = { tradingMode: 'paperReal', paperRealTimeframe: '15m', realCandles: { 'ETH/USDT': { '15m': real }, 'DOT/USDT': { '15m': mkCandles(60, '15m', now - 17 * 3600000, 1) } },
    pairStates: { 'ETH/USDT': { candles: synth, price: 101 }, 'DOT/USDT': { candles: synth.slice(), price: 1 } } };
  const ctx = { S, Object, Math, Array, Date, window: {}, REAL_CANDLE_INTERVALS: TF_MS,
    _getActiveRealTimeframe: () => S.tradingMode === 'real' ? (S.realTimeframe || '15m') : (S.paperRealTimeframe || '15m') };
  vm.createContext(ctx);
  vm.runInContext(between(s02, 'function _realCandlesStale(pair, tf) {', 'window._realCandlesStale = _realCandlesStale;', 'stale', true) + '\n' + src, ctx);
  assert.strictEqual(vm.runInContext('_projectRealCandles()', ctx), 1, 'ETH projetée, DOT (périmée) non');
  const eth = S.pairStates['ETH/USDT'];
  assert.strictEqual(eth.candles.length, 60); assert.strictEqual(eth.candles[59].c, 101); assert.strictEqual(eth.candles[59].ts, last15); assert.strictEqual(eth.candles[0].ts, last15 - 59 * 900000);
  assert.strictEqual(eth._candlesStale, false); assert.ok(Math.abs(eth.pnl24h - (101 - 95) / 95 * 100) < 1e-9, 'pnl24h = variation de la fenêtre');
  assert.strictEqual(S.pairStates['DOT/USDT'].candles[59].ts, undefined, 'DOT figée sur ses bougies existantes'); assert.strictEqual(S.pairStates['DOT/USDT']._candlesStale, true);
  const ref = eth.candles; vm.runInContext('_projectRealCandles()', ctx);
  assert.strictEqual(eth.candles, ref, 'même bougie → même tableau (pas de réallocation)');
  real[59].c = 102; vm.runInContext('_projectRealCandles()', ctx);
  assert.notStrictEqual(eth.candles, ref); assert.strictEqual(eth.candles[59].c, 102, 'nouveau close → projeté');
  S.tradingMode = 'sim'; S.pairStates['ETH/USDT'].candles = synth;
  assert.strictEqual(vm.runInContext('_projectRealCandles()', ctx), 0); assert.strictEqual(S.pairStates['ETH/USDT'].candles, synth, 'AA intact');
});
T('D8 · recordTradeForHeatmap RÉEL : une clôture AA n\'écrit rien ; la première clôture EV remet le compteur mélangé à zéro puis écrit ; 08 : générateur synthétique réservé à sim, projection appelée dans le battement', () => {
  const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
  const src = between(s03, 'function recordTradeForHeatmap(pnlUsd, pair) {', "  if(pnlUsd>0) S.heatmap.byDayHour[dk].wins++;", 'heat', true) + '\n}';
  const S = { tradingMode: 'sim', heatmap: { byHour: { 3: { count: 500, pnl: -9, wins: 200 } }, byWeekday: {}, byDayHour: {} } };
  const ctx = { S, Date, Object, Math, window: {} }; vm.createContext(ctx); vm.runInContext(src, ctx);
  vm.runInContext("recordTradeForHeatmap(1.5, 'X/USDT')", ctx);
  assert.strictEqual(S.heatmap.byHour[3].count, 500, 'AA : rien écrit'); assert.strictEqual(S.heatmap._realOnlySince, undefined);
  S.tradingMode = 'paperReal'; vm.runInContext("recordTradeForHeatmap(1.5, 'X/USDT')", ctx);
  assert.ok(S.heatmap._realOnlySince > 0); assert.strictEqual(S.heatmap.byHour[3], undefined, 'compteur mélangé remis à zéro');
  const h = new Date().getHours(); assert.deepStrictEqual(JSON.parse(JSON.stringify(S.heatmap.byHour[h])), { count: 1, pnl: 1.5, wins: 1 });   // objet né dans la vm : aller-retour JSON
  const c08 = codeStrict(s08);
  assert.ok(c08.includes("if (S.tradingMode === 'sim') Object.entries(S.pairStates).forEach(([pair, ps]) => {"), 'générateur réservé à sim');
  assert.strictEqual(count(c08, 'ps.candles.push({ o, h, l, c, v });'), 1);
  assert.ok(c08.indexOf('_projectRealCandles();') < c08.indexOf('window._botExitSweep()'), 'projection avant les sorties');
});
T('D14 · A13 _botExitSweep RÉEL, niveaux ATR : SL exécuté au niveau, TP exécuté au niveau (sans attente de 5 cycles), breakeven à 45 % du chemin puis SL breakeven exécuté ; short symétrique ; le repli % reste pour une position sans niveaux', () => {
  const pos = (id, side, entry, sl, tp) => ({ id, pair: 'X/USDT', side, entryPrice: entry, stakeUsdt: 10, auto: true, sl, tp, _holdCycles: 0, _tpPct: 2.7, _slPct: 0.9 });
  let s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 97.9 } }, openPositions: [pos('a', 'long', 100, 98, 103)] });
  s.run(); assert.deepStrictEqual(s.closed, [['a', true]]); assert.ok(s.toasts[0].includes('SL 98.0000'), s.toasts[0]);
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 103.1 } }, openPositions: [pos('b', 'long', 100, 98, 103)] });
  s.run(); assert.deepStrictEqual(s.closed, [['b', true]]); assert.ok(s.toasts[0].includes('TP 103.0000'), 'TP immédiat malgré _holdCycles 0');
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 101.4 } }, openPositions: [pos('c', 'long', 100, 98, 103)] });
  s.run(); assert.strictEqual(s.closed.length, 0); assert.strictEqual(+s.ctx.S.openPositions[0].sl.toFixed(3), 100.1); assert.ok(s.ctx.S.openPositions[0]._beAt > 0);
  s.ctx.S.pairStates['X/USDT'].price = 100.05; s.run();
  assert.deepStrictEqual(s.closed, [['c', true]]); assert.ok(s.toasts[0].includes('(breakeven)') && s.learned[0][1] > 0, s.toasts[0] + ' ' + JSON.stringify(s.learned));
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 101.0 } }, openPositions: [pos('d', 'long', 100, 98, 103)] });
  s.run(); assert.strictEqual(s.closed.length, 0); assert.strictEqual(s.ctx.S.openPositions[0].sl, 98, '< 45 % : SL inchangé');
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 98.6 } }, openPositions: [pos('e', 'short', 100, 102, 97)] });
  s.run(); assert.strictEqual(s.closed.length, 0); assert.strictEqual(+s.ctx.S.openPositions[0].sl.toFixed(3), 99.9, 'short : breakeven sous l\'entrée');
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 102.1 } }, openPositions: [pos('e2', 'short', 100, 102, 97)] }); s.run(); assert.deepStrictEqual(s.closed, [['e2', true]]);
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 96.9 } }, openPositions: [pos('e3', 'short', 100, 102, 97)] }); s.run(); assert.deepStrictEqual(s.closed, [['e3', true]]);
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 103 } }, openPositions: [pos('f', 'long', 100, null, null)] }); s.run(); assert.strictEqual(s.closed.length, 0, 'repli % : TP attend 5 cycles');
  s = ctxSweep({ botAutoMode: true, pairStates: { 'X/USDT': { price: 98.5 } }, openPositions: [pos('f2', 'long', 100, null, null)] }); s.run(); assert.deepStrictEqual(s.closed, [['f2', true]], 'repli % : SL −1,5 %');
});
T('D9 · _evRetireDelisted RÉEL : GBP/USDT désactivée en EV et RE, les autres paires intactes, idempotent', () => {
  const ctx = { window: {}, S: { paperRealActivePairs: { 'GBP/USDT': true, 'BTC/USDT': true }, realActivePairs: { 'BTC/USDT': true } } };
  vm.createContext(ctx);
  vm.runInContext(between(s9b2, "var _EV_DELISTED_PAIRS = ['GBP/USDT'];", 'window._evRetireDelisted = _evRetireDelisted;', 'delisted', true), ctx);
  assert.strictEqual(vm.runInContext('_evRetireDelisted()', ctx), 1);
  assert.strictEqual(ctx.S.paperRealActivePairs['GBP/USDT'], false); assert.strictEqual(ctx.S.paperRealActivePairs['BTC/USDT'], true);
  assert.strictEqual(ctx.S.realActivePairs['BTC/USDT'], true);
  assert.strictEqual(vm.runInContext('_evRetireDelisted()', ctx), 0, 'idempotent');
});
T('D10 · _realCandlesStale RÉEL = critère des portes : < 30 bougies → périmée ; bougie en cours de 10 min → fraîche ; 40 min → périmée (seuil 15m = 37,5 min)', () => {
  const now = Date.now();
  const ctx = { Date, Math, S: { realCandles: { 'A/USDT': { '15m': mkCandles(10, '15m', now, 1) } } }, REAL_CANDLE_INTERVALS: TF_MS, window: {} };
  vm.createContext(ctx);
  vm.runInContext(between(s02, 'function _realCandlesStale(pair, tf) {', 'window._realCandlesStale = _realCandlesStale;', 'stale', true), ctx);
  assert.strictEqual(vm.runInContext("_realCandlesStale('A/USDT', '15m')", ctx), true);
  ctx.S.realCandles['A/USDT']['15m'] = mkCandles(60, '15m', now - 10 * 60000, 1);
  assert.strictEqual(vm.runInContext("_realCandlesStale('A/USDT', '15m')", ctx), false);
  ctx.S.realCandles['A/USDT']['15m'] = mkCandles(60, '15m', now - 40 * 60000, 1);
  assert.strictEqual(vm.runInContext("_realCandlesStale('A/USDT', '15m')", ctx), true);
  assert.strictEqual(vm.runInContext("_realCandlesStale('Z/USDT', '15m')", ctx), true, 'paire absente = périmée');
});

_runQueue().then(() => {
  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : '') + ' · ' + pend + ' en attente');
  process.exit(fail ? 1 : 0);
});
