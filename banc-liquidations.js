// banc-liquidations.js — [LIQUIDATIONS · 26/09/2026] VERSION 20260926d
// Lot 3 des sources : le flux des liquidations forcées (futures Binance, !forceOrder@arr) → S.liqStats par paire et par
// minute → whale_v1. Fonctions RÉELLES de 02 (_liqPairOf, _liqRecord, _liqSummary) et scout RÉEL de 03 en vm.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const LIQ = between(s02, 'var _liqWs = null, _liqRetryMs = 30000, _liqNextTry = 0;', 'function _openLiqWs() {', false);
const FLUX = between(s02, 'var _flowEmaNotional = {};', 'window._parseDepth = _parseDepth;', true);
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const SCOUT = between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false);
const J = v => JSON.parse(JSON.stringify(v));
const M = 60000, now = Math.floor(Date.now() / M) * M + 30000;
function ctx(S) { const c = { S, PAIRS: { 'BTC/USDT': {}, 'PEPE/USDT': {}, 'SOL/USDT': {} }, Math, Number, Object, Array, Date: { now: () => now }, isFinite, String, window: {}, getTechSignals: () => ({ atScore: 0, raw: {} }), getFundamentalSignals: () => ({ fundScore: 0 }), detectHarmonicResonance: () => null, lmsrP: () => 0.5 }; vm.createContext(c); vm.runInContext(LIQ + '\n' + FLUX + '\n' + ENGINE + '\n' + SCOUT, c); return c; }
console.log('▶ banc-liquidations');
T('D1 · symbole → paire : BTCUSDT, 1000PEPEUSDT → PEPE/USDT, paire inconnue du système → null, format étranger → null', () => {
  const c = ctx({});
  assert.strictEqual(vm.runInContext("_liqPairOf('BTCUSDT')", c), 'BTC/USDT'); assert.strictEqual(vm.runInContext("_liqPairOf('1000PEPEUSDT')", c), 'PEPE/USDT');
  assert.strictEqual(vm.runInContext("_liqPairOf('XYZUSDT')", c), null); assert.strictEqual(vm.runInContext("_liqPairOf('BTCBUSD')", c), null); assert.strictEqual(vm.runInContext("_liqPairOf('')", c), null);
});
T('D2 · _liqRecord RÉEL sur le format forceOrder : SELL = long liquidé, BUY = short liquidé ; notionnel = prix moyen × quantité ; seaux d\'une minute ; résumé net (−1 longs … +1 shorts)', () => {
  const S = {}; const c = ctx(S);
  c.o1 = { s: 'BTCUSDT', S: 'SELL', q: '0.5', p: '80000', ap: '79990' }; c.o2 = { s: 'BTCUSDT', S: 'BUY', q: '0.1', p: '80100', ap: '80100' }; c.o3 = { s: 'SOLUSDT', S: 'SELL', q: '100', p: '150', ap: '150' };
  const r1 = J(vm.runInContext(`_liqRecord(o1, ${now - 2 * M})`, c)); assert.deepStrictEqual(r1, { pair: 'BTC/USDT', usd: 39995, side: 'long' });
  vm.runInContext(`_liqRecord(o2, ${now - M})`, c); vm.runInContext(`_liqRecord(o3, ${now})`, c);
  assert.strictEqual(vm.runInContext("_liqRecord({ s: 'BTCUSDT', S: 'SELL', q: '0', p: '1' }, " + now + ")", c), null, 'quantité nulle : rien');
  const btc = J(vm.runInContext(`_liqSummary('BTC/USDT', 5, ${now})`, c));
  assert.strictEqual(btc.longUsd, 39995); assert.strictEqual(btc.shortUsd, 8010); assert.strictEqual(btc.n, 2); assert.ok(btc.net < 0 && Math.abs(btc.net - (8010 - 39995) / 48005) < 1e-9, 'net ' + btc.net);
  assert.strictEqual(J(vm.runInContext(`_liqSummary('BTC/USDT', 1, ${now})`, c)).n, 0, 'fenêtre 1 min = minute courante');
  assert.strictEqual(J(vm.runInContext(`_liqSummary('SOL/USDT', 1, ${now})`, c)).longUsd, 15000);
  for (let i = 40; i >= 0; i--) vm.runInContext(`_liqRecord({ s: '1000PEPEUSDT', S: 'BUY', q: '1000000', p: '0.00001', ap: '0.00001' }, ${now - i * M})`, c);   // paire sans seau préalable, du plus vieux au plus récent
  assert.strictEqual(S.liqStats['PEPE/USDT'].length, 30, '≤ 30 seaux');
});
T('D3 · whale_v1 RÉEL : sans liquidations → inchangé ; sous le seuil (liqMinUsd 20 k$) → ignorées ; shorts liquidés massivement → +wLiq ; longs liquidés → −wLiq ; motif lisible', () => {
  const mk = () => ({ pairStates: { 'BTC/USDT': { candles: [], price: 100 } }, flowStats: {}, orderBook: {}, agents: [], liqStats: {} });
  let S = mk(); let c = ctx(S);
  for (let i = 0; i < 100; i++) vm.runInContext(`_recordTrade('BTC/USDT', 100, 1, false, ${now - 4 * M + i * 1000})`, c);   // flux vivant, aucun gros ordre
  const base = J(vm.runInContext("scoutAnalysis('whale_v1', 'BTC/USDT')", c)); assert.strictEqual(base.score, 0, 'aucun gros ordre : 0');
  vm.runInContext(`_liqRecord({ s: 'BTCUSDT', S: 'BUY', q: '0.1', p: '100', ap: '100' }, ${now - M})`, c);   // 10 $ : sous le seuil
  assert.strictEqual(J(vm.runInContext("scoutAnalysis('whale_v1', 'BTC/USDT')", c)).score, 0, 'sous liqMinUsd : ignoré');
  vm.runInContext(`_liqRecord({ s: 'BTCUSDT', S: 'BUY', q: '500', p: '100', ap: '100' }, ${now - M})`, c);   // 50 k$ de shorts liquidés
  const sq = J(vm.runInContext("scoutAnalysis('whale_v1', 'BTC/USDT')", c));
  assert.ok(Math.abs(sq.score - 0.3 * (50010 - 0) / 50010) < 1e-9, 'shorts liquidés → +0,30 : ' + sq.score); assert.ok(sq.reasoning.includes('liquidations 50 k$ (shorts 100 %)'), sq.reasoning);
  S = mk(); c = ctx(S); for (let i = 0; i < 100; i++) vm.runInContext(`_recordTrade('BTC/USDT', 100, 1, false, ${now - 4 * M + i * 1000})`, c);
  vm.runInContext(`_liqRecord({ s: 'BTCUSDT', S: 'SELL', q: '300', p: '100', ap: '100' }, ${now - M})`, c);
  const cap = J(vm.runInContext("scoutAnalysis('whale_v1', 'BTC/USDT')", c)); assert.ok(Math.abs(cap.score + 0.3) < 1e-9, 'longs liquidés → −0,30 : ' + cap.score); assert.ok(cap.reasoning.includes('(longs 100 %)'));
});
T('S1 · une seule connexion (!forceOrder@arr), backoff 30 s → 5 min, jamais hors ligne, gardien 15 s ; génome : wLiq [0,1], liqMinUsd [1 k, 500 k]', () => {
  const c02 = codeStrict(s02);
  assert.ok(c02.includes("new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr')") && c02.includes('if (window._auraNetOffline) return false;') && c02.includes('_liqRetryMs = Math.min(300000, _liqRetryMs * 2);') && c02.includes('setInterval(_openLiqWs, 15000);'));
  const c = ctx({}); const g = J(vm.runInContext("_genomeOf('whale_v1')", c)); assert.strictEqual(g.wLiq, 0.3); assert.strictEqual(g.liqMinUsd, 20000);
  c.S.genome = { whale_v1: { wLiq: 5, liqMinUsd: 1 } }; const g2 = J(vm.runInContext("_genomeOf('whale_v1')", c)); assert.strictEqual(g2.wLiq, 1); assert.strictEqual(g2.liqMinUsd, 1000);
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
