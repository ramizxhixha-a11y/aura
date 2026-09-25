// banc-positionnement.js — [POSITIONNEMENT · 26/09/2026] VERSION 20260926c
// Lot 2 des sources : financement, open interest, ratio long/short des futures Binance → le siège fundamental_v1 (ex « EPS·P/E·EV »,
// jamais alimenté) devient Positionnement. Fonctions RÉELLES de 02 (symbole, interprétation) et de 03 (scout) en vm.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const FEED = between(s02, 'var _posCursor = 0;', 'async function _positioningRefresh() {', false);
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const SCOUT = between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false);
const J = v => JSON.parse(JSON.stringify(v));
function feedCtx() { const c = { Math, Number, Array, Date, isFinite, String, window: {} }; vm.createContext(c); vm.runInContext(FEED, c); return c; }
function scoutCtx(pos, candles) { const c = { S: { pairStates: { 'BTC/USDT': { candles: candles || [], price: 1 } }, positioning: pos, agents: [] }, Math, Number, Object, Date, isFinite, String, window: {}, getTechSignals: () => ({ atScore: 0, raw: {} }), getFundamentalSignals: () => ({ fundScore: 0 }), detectHarmonicResonance: () => null, lmsrP: () => 0.5 }; vm.createContext(c); vm.runInContext(ENGINE + '\n' + SCOUT, c); return c; }
const sc = (pos, candles) => J(vm.runInContext("scoutAnalysis('fundamental_v1', 'BTC/USDT')", scoutCtx(pos, candles)));
const up = Array.from({ length: 12 }, (_, i) => ({ o: 100, h: 101, l: 99, c: 100 + i * 0.2, v: 1 })), down = Array.from({ length: 12 }, (_, i) => ({ o: 100, h: 101, l: 99, c: 100 - i * 0.2, v: 1 }));
console.log('▶ banc-positionnement');
T('D1 · symbole futures : BTCUSDT, PEPE → 1000PEPEUSDT, EUR/GBP → aucun contrat', () => {
  const c = feedCtx();
  assert.strictEqual(vm.runInContext("_futSymbol('BTC/USDT')", c), 'BTCUSDT'); assert.strictEqual(vm.runInContext("_futSymbol('PEPE/USDT')", c), '1000PEPEUSDT');
  assert.strictEqual(vm.runInContext("_futSymbol('EUR/USDT')", c), null); assert.strictEqual(vm.runInContext("_futSymbol('GBP/USDT')", c), null); assert.strictEqual(vm.runInContext("_futSymbol('')", c), null);
});
T('D2 · _positioningParse RÉEL sur les formats Binance : financement en %/8 h, OI sur 2 h (premier → dernier), ratio long/short ; réponses manquantes tolérées ; rien → null', () => {
  const c = feedCtx();
  c.prem = { symbol: 'BTCUSDT', lastFundingRate: '0.00010000', markPrice: '81000' };
  c.oi = Array.from({ length: 9 }, (_, i) => ({ sumOpenInterest: String(100000 + i * 1000), timestamp: i }));
  c.ls = [{ longShortRatio: '1.4321', longAccount: '0.5889', shortAccount: '0.4111' }];
  const p = J(vm.runInContext('_positioningParse(prem, oi, ls)', c));
  assert.strictEqual(p.funding, 0.01); assert.strictEqual(p.oiChg2h, 8); assert.strictEqual(p.oiNow, 108000); assert.strictEqual(p.lsRatio, 1.432); assert.ok(p.t > 0);
  const q = J(vm.runInContext('_positioningParse(null, null, ls)', c)); assert.strictEqual(q.funding, null); assert.strictEqual(q.lsRatio, 1.432);
  assert.strictEqual(vm.runInContext('_positioningParse(null, [], [])', c), null); assert.strictEqual(vm.runInContext('_positioningParse({lastFundingRate:"abc"}, null, null)', c), null);
});
T('D3 · scout RÉEL : sans flux → 0 ; périmé → 0 ; longs surpeuplés (financement élevé, ratio > 1,5) → biais vendeur ; OI qui monte avec le prix → confirmation dans le sens du prix', () => {
  assert.ok(sc(null).reasoning.startsWith('En attente du flux positionnement')); assert.strictEqual(sc({ 'BTC/USDT': { funding: 0.1, t: Date.now() - 3600000 } }).score, 0, 'périmé');
  const crowded = sc({ 'BTC/USDT': { funding: 0.05, oiChg2h: 0, lsRatio: 3, t: Date.now() } }, up);
  assert.ok(crowded.score < -0.5, 'longs surpeuplés → vendeur : ' + crowded.score); assert.ok(crowded.reasoning.includes('financement +0.050 %') && crowded.reasoning.includes('long/short 3.00'), crowded.reasoning);
  const squeeze = sc({ 'BTC/USDT': { funding: -0.05, oiChg2h: 0, lsRatio: 0.3, t: Date.now() } }, up);
  assert.ok(squeeze.score > 0.5, 'shorts surpeuplés → acheteur : ' + squeeze.score);
  const confirmUp = sc({ 'BTC/USDT': { funding: 0, oiChg2h: 5, lsRatio: 1, t: Date.now() } }, up), confirmDown = sc({ 'BTC/USDT': { funding: 0, oiChg2h: 5, lsRatio: 1, t: Date.now() } }, down);
  assert.ok(Math.abs(confirmUp.score - 0.35) < 1e-9 && Math.abs(confirmDown.score + 0.35) < 1e-9, 'OI +5 % × sens du prix × 0,35 : ' + confirmUp.score + ' / ' + confirmDown.score);
  const partial = sc({ 'BTC/USDT': { funding: null, oiChg2h: null, lsRatio: 1, t: Date.now() } }, up); assert.strictEqual(partial.score, 0); assert.strictEqual(partial.reasoning, 'long/short 1.00');
});
T('S1 · génome (7 gènes, bornes) ; flux en tournante 20 s, jamais hors ligne, RAM ; siège renommé Positionnement ; sources d\'attribution macro / positionnement séparées', () => {
  const c = scoutCtx(null); assert.deepStrictEqual(J(vm.runInContext("_genomeOf('fundamental_v1')", c)), { fundScale: 0.05, oiScale: 5, lsHigh: 1.5, lsLow: 0.67, wF: 0.4, wOi: 0.35, wLs: 0.25 });
  c.S.genome = { fundamental_v1: { fundScale: 9, lsHigh: 0.5, lsLow: 3, wF: 7 } }; const g = J(vm.runInContext("_genomeOf('fundamental_v1')", c)); assert.deepStrictEqual([g.fundScale, g.lsHigh, g.lsLow, g.wF], [0.3, 1.05, 0.95, 1]);
  const c02 = codeStrict(s02); assert.ok(c02.includes('setInterval(_positioningRefresh, 20000);') && c02.includes('if (window._auraNetOffline) return null;') && c02.includes("fapi.binance.com/fapi/v1/premiumIndex?symbol=") && c02.includes("futures/data/openInterestHist?symbol=") && c02.includes("futures/data/globalLongShortAccountRatio?symbol="));
  assert.ok(c02.includes("{ id:'fundamental_v1',name:'Positionnement',") && !c02.includes("name:'EPS·P/E·EV'"));
  const c10 = codeStrict(rd('js/10i-intel-bus.js')); assert.ok(c10.includes("macro:       ['macro_v1'],") && c10.includes("positionnement: ['fundamental_v1'],") && !c10.includes("fondamental: ['macro_v1', 'fundamental_v1']"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
