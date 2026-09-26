// banc-contexte.js — [CONTEXTE 1 H / 4 H · 26/09/2026] VERSION 20260926e
// Lot 4 des sources (Rams « Go 4 ») : chaque siège lisait sa propre bougie de 15 min. Le siège geopolitic_v1 (« Géopolitique »,
// qui lisait la volatilité 15 min déjà lue par deux autres sièges) devient « Contexte 1h·4h » : tendance des horizons 1 h et 4 h.
// Fonctions RÉELLES de 02 (lecture pure, besoin de rafraîchissement, tournante REST), de 03 (scout), de 07 (synchronisation des
// étiquettes) et de 10i (_pathRecord) en vm, horloge gelée.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'), s10i = rd('js/10i-intel-bus.js');
const CTX02 = between(s02, "var CTX_TFS = ['1h', '4h'];", 'window._ctxHorizonRead = _ctxHorizonRead;', false);
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const SCOUT = between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false);
const SYNC07 = between(s07, 'const _SEAT_DEF = {', 'setTimeout(_seatLabelsSync, 15000);', false).replace(/^window\..*$/gm, '');
const PATH10 = between(s10i, 'var PATH_MARKS = [15, 30, 60, 120, 240];', 'window._pathRecord = _pathRecord;', false).replace(/^window\..*$/gm, '');
const J = v => JSON.parse(JSON.stringify(v));
const TF = { '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1j': 86400000 };
const NOW = { t: 1758880000000 + 1800000 };   // horloge gelée (mutable pour la tournante)
const H = 3600000;
// série de n bougies d'un pas tfMs, dérive par bougie (fraction), dernière bougie = seau courant (fraîche) sauf décalage lastAgo
function serie(n, tfMs, drift, opt) {
  opt = opt || {}; const out = []; let px = opt.px0 || 100;
  const lastTs = (opt.lastTs !== undefined) ? opt.lastTs : Math.floor((NOW.t - (opt.lastAgo || 0)) / tfMs) * tfMs;
  for (let i = 0; i < n; i++) {
    const o = px, c = px * (1 + drift), h = Math.max(o, c) * 1.002, l = Math.min(o, c) * 0.998;
    const k = { ts: lastTs - (n - 1 - i) * tfMs, o, h, l, c, v: 1, n: 5 };
    if (opt.gapFrom !== undefined && i >= opt.gapFrom) { k._gap = true; k.o = k.h = k.l = k.c = px; k.v = 0; k.n = 0; }
    out.push(k); px = c;
  }
  return out;
}
function ctx02(S, extra) {
  const c = Object.assign({ S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date: { now: () => NOW.t }, REAL_CANDLE_INTERVALS: TF }, extra || {});
  vm.createContext(c); vm.runInContext(CTX02, c); return c;
}
function scoutCtx(realCandles, withRead) {
  const S = { pairStates: { 'BTC/USDT': { candles: [], price: 100 } }, realCandles: realCandles || {}, agents: [] };
  const c = { S, Math, Number, Object, Array, JSON, Date: { now: () => NOW.t }, isFinite, String, window: {}, REAL_CANDLE_INTERVALS: TF,
    getTechSignals: () => ({ atScore: 0, raw: {} }), getFundamentalSignals: () => ({ fundScore: 0 }), detectHarmonicResonance: () => null, lmsrP: () => 0.5, COUNCIL_ADVISORS: {} };
  vm.createContext(c);
  if (withRead !== false) vm.runInContext(CTX02, c);
  vm.runInContext(ENGINE + '\n' + SCOUT, c);
  return c;
}
const sc = (rc, withRead) => J(vm.runInContext("scoutAnalysis('geopolitic_v1', 'BTC/USDT')", scoutCtx(rc, withRead)));
const G0 = { emaF: 8, emaS: 21, slopeN: 3, atrN: 14, minBars: 24, kGap: 0.5, kSlope: 0.5, w1h: 0.5, w4h: 0.5, agree: 0.25, disagree: 0.5 };
console.log('▶ banc-contexte');

T('D1 · _ctxHorizonRead RÉEL : hausse → t > 0, baisse → t < 0, plat → ≈ 0 ; forte tendance saturée à ±1 ; SANS ÉCHELLE (× 1000 → même lecture) ; tf inconnue → null', () => {
  const c = ctx02({ realCandles: { 'A/USDT': { '1h': serie(60, H, 0.0005), '4h': serie(60, 4 * H, -0.0005) }, 'B/USDT': { '1h': serie(60, H, 0) } } }); c.G = G0;
  const up = J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c)), dn = J(vm.runInContext("_ctxHorizonRead('A/USDT', '4h', G, Date.now())", c)), fl = J(vm.runInContext("_ctxHorizonRead('B/USDT', '1h', G, Date.now())", c));
  assert.ok(up.ok && up.t > 0.3 && up.t < 1 && up.gapAtr > 0 && up.slopeAtr > 0 && up.bars === 60 && up.gaps === 0, JSON.stringify(up));
  assert.ok(dn.ok && dn.t < -0.3 && dn.t > -1 && dn.gapAtr < 0, JSON.stringify(dn));
  assert.ok(fl.ok && Math.abs(fl.t) < 0.05, JSON.stringify(fl));
  c.S.realCandles['A/USDT']['1h'] = serie(60, H, 0.004); assert.strictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c)).t, 1, 'forte hausse : saturé à +1');
  c.S.realCandles['A/USDT']['1h'] = serie(60, H, -0.004); assert.strictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c)).t, -1);
  c.S.realCandles['A/USDT']['1h'] = serie(60, H, 0.0005, { px0: 0.000001234 }); const tiny = J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c));
  assert.ok(Math.abs(tiny.t - up.t) <= 0.002, 'sans échelle (PEPE vs BTC) : ' + tiny.t + ' vs ' + up.t);
  assert.strictEqual(vm.runInContext("_ctxHorizonRead('A/USDT', '2h', G, Date.now())", c), null);
});
T('D2 · une série courte (< minBars), périmée (> 2 bougies), trouée (> 25 % de dojis _gap) ou plate est REFUSÉE avec son motif — jamais un chiffre inventé', () => {
  const c = ctx02({ realCandles: { 'A/USDT': {
    '1h': serie(20, H, 0.001), '4h': serie(60, 4 * H, 0.001, { lastAgo: 9 * H }),
    '5m': serie(60, 300000, 0.001, { gapFrom: 40 }), '15m': serie(60, 900000, 0).map(k => Object.assign({}, k, { o: k.c, h: k.c, l: k.c })), '1j': serie(60, 86400000, 0.001, { gapFrom: 50 }) } } }); c.G = G0;
  assert.deepStrictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c)), { ok: false, why: 'court', bars: 20 });
  assert.deepStrictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '4h', G, Date.now())", c)), { ok: false, why: 'périmé', bars: 60 }, '9 h sans bougie de 4 h');
  assert.deepStrictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '5m', G, Date.now())", c)), { ok: false, why: 'lacunaire', bars: 60, gaps: 20 });
  assert.strictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '15m', G, Date.now())", c)).why, 'plat', 'ATR nul');
  c.S.realCandles['A/USDT']['15m'][30].c = 0; assert.strictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '15m', G, Date.now())", c)).why, 'plat', 'clôture nulle');
  assert.ok(J(vm.runInContext("_ctxHorizonRead('A/USDT', '1j', G, Date.now())", c)).ok, '10 dojis sur 60 (≤ 25 %) : lisible');
  assert.deepStrictEqual(J(vm.runInContext("_ctxHorizonRead('Z/USDT', '1h', G, Date.now())", c)), { ok: false, why: 'court', bars: 0 }, 'paire inconnue');
  c.S.realCandles['A/USDT']['1h'] = serie(60, H, 0.001, { lastTs: NOW.t - 119 * 60000 }); assert.ok(J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c)).ok, 'dernière bougie ouverte il y a 1 h 59 : encore fraîche');
  c.S.realCandles['A/USDT']['1h'] = serie(60, H, 0.001, { lastTs: NOW.t - 121 * 60000 }); assert.strictEqual(J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c)).why, 'périmé', 'ouverte il y a 2 h 01 : périmée');
});
T('D3 · scout RÉEL : horizons alignés → renforcé (conf 0,7) ; en conflit → amorti (conf 0,45) ; un seul horizon → sa part seule (conf 0,5) ; rien → neutre avec motifs ; sans lecteur → neutre', () => {
  const up1 = serie(60, H, 0.0005), up4 = serie(60, 4 * H, 0.0005), dn4 = serie(60, 4 * H, -0.0005);
  const c = ctx02({ realCandles: { 'BTC/USDT': { '1h': up1, '4h': up4 } } }); c.G = G0;
  const t1 = J(vm.runInContext("_ctxHorizonRead('BTC/USDT', '1h', G, Date.now())", c)).t, t4 = J(vm.runInContext("_ctxHorizonRead('BTC/USDT', '4h', G, Date.now())", c)).t;
  const aligned = sc({ 'BTC/USDT': { '1h': up1, '4h': up4 } });
  assert.ok(Math.abs(aligned.score - Math.min(1, (t1 * 0.5 + t4 * 0.5) * 1.25)) < 1e-9 && aligned.conf === 0.7 && /^1 h ▲ \+0\.\d\d · 4 h ▲ \+0\.\d\d · horizons alignés$/.test(aligned.reasoning), JSON.stringify(aligned));
  const conflict = sc({ 'BTC/USDT': { '1h': up1, '4h': dn4 } });
  assert.ok(conflict.conf === 0.45 && conflict.reasoning.endsWith('horizons en conflit') && Math.abs(conflict.score) < Math.abs(aligned.score), JSON.stringify(conflict));
  const one = sc({ 'BTC/USDT': { '1h': up1, '4h': serie(10, 4 * H, 0.0005) } });
  assert.ok(Math.abs(one.score - t1 * 0.5) < 1e-9 && one.conf === 0.5 && one.reasoning.endsWith('· 4 h en attente (court)'), JSON.stringify(one));
  const four = sc({ 'BTC/USDT': { '1h': serie(60, H, 0.0005, { lastAgo: 3 * H }), '4h': dn4 } });
  assert.ok(four.score < 0 && four.reasoning.startsWith('1 h en attente (périmé) · 4 h ▼'), JSON.stringify(four));
  const none = sc({}); assert.deepStrictEqual(none, { score: 0, conf: 0.3, reasoning: 'En attente des bougies 1 h / 4 h (court / court)' });
  const calm = sc({ 'BTC/USDT': { '1h': serie(60, H, 0), '4h': serie(60, 4 * H, 0) } }); assert.ok(calm.conf === 0.55 && calm.reasoning.endsWith('contexte calme') && Math.abs(calm.score) < 0.05, JSON.stringify(calm));
  const noReader = sc({ 'BTC/USDT': { '1h': up1, '4h': up4 } }, false); assert.deepStrictEqual(noReader, { score: 0, conf: 0.3, reasoning: 'En attente des bougies 1 h / 4 h' });
});
T('D4 · tournante REST RÉELLE : une série par appel (courte → périmée → trouée → une fois par bougie), ≥ 10 min entre deux appels pour la même série, quiet=true, jamais hors ligne', () => {
  const calls = [];
  const c = ctx02({ realCandles: {} }, { _bgPairsToWatch: () => ['A/USDT', 'B/USDT'], _fetchAndBootstrapRealCandles: (p, tf, q) => calls.push(p + '_' + tf + ':' + q) });
  const go = () => vm.runInContext('_ctxCandlesRefresh()', c);
  assert.deepStrictEqual([go(), go(), go(), go(), go()], ['A/USDT_1h', 'A/USDT_4h', 'B/USDT_1h', 'B/USDT_4h', null], 'séries absentes : les 4 dans l\'ordre, puis rien (10 min)');
  assert.deepStrictEqual(calls, ['A/USDT_1h:true', 'A/USDT_4h:true', 'B/USDT_1h:true', 'B/USDT_4h:true']);
  const t0 = NOW.t;
  NOW.t = t0 + 11 * 60000;
  assert.strictEqual(go(), 'A/USDT_1h', 'toujours absente après 10 min : re-tentée');
  ['A/USDT', 'B/USDT'].forEach(p => { c.S.realCandles[p] = { '1h': serie(60, H, 0.001), '4h': serie(60, 4 * H, 0.001) }; });
  assert.strictEqual(go(), null, 'séries saines, toutes rafraîchies il y a moins d\'une bougie : rien');
  NOW.t = t0 + 61 * 60000;
  assert.strictEqual(go(), 'B/USDT_1h', 'une bougie de 1 h écoulée depuis son dernier REST : re-lue (A 1h : 50 min seulement)');
  assert.strictEqual(go(), null, 'les 4 h attendent leur bougie (61 min < 4 h)');
  c.S.realCandles['B/USDT']['4h'][59]._gap = true;
  assert.strictEqual(go(), 'B/USDT_4h', 'un doji de coupure dans les 30 dernières : re-lue sans attendre la bougie');
  NOW.t = t0 + 72 * 60000;
  assert.strictEqual(go(), 'A/USDT_1h', '61 min après son REST : re-lue');
  assert.strictEqual(calls.length, 8); assert.ok(calls.every(x => x.endsWith(':true')), 'toujours quiet');
});
T('D4b · besoin de rafraîchissement : motifs court / périmé / lacunaire / bougie / null', () => {
  NOW.t = 1758880000000 + 1800000;
  const c = ctx02({ realCandles: { 'A/USDT': { '1h': serie(60, H, 0.001), '4h': serie(60, 4 * H, 0.001, { lastAgo: 9 * H }), '5m': serie(60, 300000, 0.001, { gapFrom: 45 }), '15m': serie(29, 900000, 0.001) } } });
  assert.strictEqual(vm.runInContext("_ctxSeriesNeedsRest('A/USDT', '15m', Date.now())", c), 'court');
  assert.strictEqual(vm.runInContext("_ctxSeriesNeedsRest('A/USDT', '4h', Date.now())", c), 'périmé');
  assert.strictEqual(vm.runInContext("_ctxSeriesNeedsRest('A/USDT', '5m', Date.now())", c), 'lacunaire');
  assert.strictEqual(vm.runInContext("_ctxSeriesNeedsRest('A/USDT', '1h', Date.now())", c), 'bougie', 'saine mais jamais rafraîchie par REST');
  vm.runInContext("_ctxRestAt['A/USDT_1h'] = Date.now() - 30 * 60000", c);
  assert.strictEqual(vm.runInContext("_ctxSeriesNeedsRest('A/USDT', '1h', Date.now())", c), null, 'rafraîchie il y a 30 min : rien');
  vm.runInContext("_ctxRestAt['A/USDT_1h'] = Date.now() - 61 * 60000", c);
  assert.strictEqual(vm.runInContext("_ctxSeriesNeedsRest('A/USDT', '1h', Date.now())", c), 'bougie', 'une bougie entière : re-lue');
  c.window._auraNetOffline = true; c._bgPairsToWatch = () => ['A/USDT']; c._fetchAndBootstrapRealCandles = () => { throw new Error('appel hors ligne'); };
  assert.strictEqual(vm.runInContext('_ctxCandlesRefresh()', c), null, 'hors ligne : rien');
});
T('S1 · génome : 11 gènes par défaut, bornes (emaF ≤ 20, emaS ≥ 10, w ≥ 0,05, disagree ≤ 0,9, entiers), 20 sièges génomés', () => {
  const c = scoutCtx({}); assert.deepStrictEqual(J(vm.runInContext("_genomeOf('geopolitic_v1')", c)), G0);
  c.S.genome = { geopolitic_v1: { emaF: 99, emaS: 5, slopeN: 0.2, w1h: 0, disagree: 2, kGap: 7.7 } };
  const g = J(vm.runInContext("_genomeOf('geopolitic_v1')", c)); assert.deepStrictEqual([g.emaF, g.emaS, g.slopeN, g.w1h, g.disagree, g.kGap, g.w4h], [20, 10, 2, 0.05, 0.9, 2, 0.5]);
  assert.strictEqual(Object.keys(J(vm.runInContext('GENOME_DEFAULTS', c))).length, 20);
  // emaF ≥ emaS après mutation : la lecture impose emaS ≥ emaF + 2 (pas d'inversion de sens)
  const c2 = ctx02({ realCandles: { 'A/USDT': { '1h': serie(60, H, 0.0005) } } }); c2.G = Object.assign({}, G0, { emaF: 20, emaS: 10 });
  assert.ok(J(vm.runInContext("_ctxHorizonRead('A/USDT', '1h', G, Date.now())", c2)).t > 0, 'EMA inversées par mutation : la hausse reste une hausse');
});
T('S2 · _seatLabelsSync RÉEL (07) : les étiquettes suivent la logique du siège ; ancien nom littéral → nouveau nom/emoji/domaine ; un hybride garde son nom ; idempotent', () => {
  const c = { S: { agents: [
    { id: 'geopolitic_v1', name: 'Géopolitique', emoji: '🌍', type: 'LLM·GPT-4', source: 'GDELT/News', domain: 'geopolitics' },
    { id: 'fundamental_v1', name: 'Hybrid Gen-7', emoji: '🧬', type: 'Fade·Fade', source: 'RSI/Sentiment', domain: 'fundamental' },
    { id: 'macro_v1', name: 'Macro-Économie', emoji: '📊', type: 'Linear·FRED', source: 'Fed/BCE/FMI', domain: 'macro' },
    { id: 'nlp_v1', name: 'Sentiment NLP', emoji: '🧠', type: 'NLP·BERT-fin', source: 'News/Earnings' },
    { id: 'risk_bot_v1', name: 'Risk', type: 'x', source: 'y' }] }, Array, Object, window: {} };
  vm.createContext(c); vm.runInContext(SYNC07, c);
  assert.strictEqual(vm.runInContext('_seatLabelsSync()', c), 4);
  const A = J(c.S.agents);
  assert.deepStrictEqual(A[0], { id: 'geopolitic_v1', name: 'Contexte 1h·4h', emoji: '🔭', type: 'Multi·Horizon', source: 'Binance 1h·4h', domain: 'contexte' });
  assert.deepStrictEqual(A[1], { id: 'fundamental_v1', name: 'Hybrid Gen-7', emoji: '🧬', type: 'Futures·Levier', source: 'Binance Futures', domain: 'fundamental' });
  assert.deepStrictEqual([A[2].type, A[2].source, A[2].name], ['Indices·Marché', 'F&G·CoinGecko', 'Macro-Économie']);
  assert.deepStrictEqual(A[3], { id: 'nlp_v1', name: 'Sentiment NLP', emoji: '🧠', type: 'NLP·BERT-fin', source: 'News/Earnings' });
  assert.deepStrictEqual(A[4], { id: 'risk_bot_v1', name: 'Risk', type: 'x', source: 'y' });
  assert.strictEqual(vm.runInContext('_seatLabelsSync()', c), 0, 'idempotent');
});
T('S3 · _pathRecord RÉEL (10i) : en EV le chemin se mesure sur le dernier prix réel ACCEPTÉ (_rcLastPrice), pas sur ps.price figé ; AA : ps.price ; sans référence : ps.price', () => {
  const t0 = 1000000000000;
  const mk = (mode, last) => { const S = { tradingMode: mode, pairStates: { 'A/USDT': { price: 101 } }, openPositions: [{ pair: 'A/USDT', side: 'long', entryPrice: 100, openedAt: t0 }] };
    const c = { S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, nowStr: () => 'x', Date: { now: () => t0 + 16 * 60000 }, _rcPriceAge: () => 30000, _rcLastPrice: () => last }; vm.createContext(c); vm.runInContext(PATH10, c); vm.runInContext('_pathRecord()', c); return J(S.openPositions[0]._path).mfe; };
  assert.strictEqual(mk('paperReal', 103), 3); assert.strictEqual(mk('real', 103), 3); assert.strictEqual(mk('sim', 103), 1); assert.strictEqual(mk('paperReal', 0), 1);
});
T('S4 · textes livrés : 02 (siège, tournante 10 s, quiet, _rcLastPrice), 03 (case), 07 (_SEAT_DEF vrai, sync ×2), 09b2 (sync à la restauration), 08 (tuile), 10i (source « contexte », prix sorti de geopolitic)', () => {
  const c2 = codeStrict(s02), c3 = codeStrict(s03), c7 = codeStrict(s07), c8 = codeStrict(s08), c10 = codeStrict(s10i);
  assert.ok(c2.includes("{ id:'geopolitic_v1',name:'Contexte 1h·4h',    emoji:'🔭', type:'Multi·Horizon',  source:'Binance 1h·4h',") && !c2.includes("name:'Géopolitique'") && !c2.includes("type:'Linear·FRED'"));
  assert.ok(c2.includes('setInterval(_ctxCandlesRefresh, 10000);') && c2.includes('setTimeout(_ctxCandlesRefresh, 30000);') && c2.includes('_fetchAndBootstrapRealCandles(s[0], s[1], true);') && c2.includes('var CTX_REST_MIN_MS = 600000;'));
  assert.ok(c2.includes('async function _fetchAndBootstrapRealCandles(pair, tf, quiet) {') && c2.includes('    if (quiet) return;') && c2.includes('window._rcLastPrice = _rcLastPrice;'));
  assert.ok(CTX02.includes('if (window._auraNetOffline) return null;'));
  assert.ok(c3.includes("case 'geopolitic_v1': {") && c3.includes("_ctxHorizonRead(pair, '1h', G, _cNow)") && !c3.includes('Risque géopolitique'));
  const m = s07.match(/const _SEAT_DEF = \{([\s\S]*?)\n\};/); assert.ok(m);
  ["'macro_v1': { type: 'Indices·Marché', source: 'F&G·CoinGecko' }", "'fundamental_v1': { type: 'Futures·Levier', source: 'Binance Futures' }", "'geopolitic_v1': { type: 'Multi·Horizon', source: 'Binance 1h·4h' }"].forEach(l => assert.ok(m[1].includes(l), l));
  assert.ok(c7.includes('setTimeout(_seatLabelsSync, 15000);') && c7.includes('setTimeout(_seatLabelsSync, 60000);'));
  assert.ok(codeStrict(rd('js/09b2-save-load.js')).includes("  try { if (typeof _seatLabelsSync === 'function') _seatLabelsSync(); } catch(e) {}"), '09b2 : synchronisation dès la restauration');
  assert.ok(c8.includes("label:'Contexte 1 h / 4 h'") && !c8.includes("label:'Régime de volatilité'"));
  assert.ok(c10.includes("  contexte:    ['geopolitic_v1'],") && c10.includes("  prix:        ['sentiment_v2', 'volatility_v1', 'corr_v1', 'onchain_v1', 'breakout_v1'],"));
  assert.ok(c10.includes("if ((S.tradingMode === 'paperReal' || S.tradingMode === 'real') && typeof _rcLastPrice === 'function') { var _lp = _rcLastPrice(pos.pair); if (_lp > 0) px = _lp; }"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
