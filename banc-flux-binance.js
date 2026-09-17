// banc-flux-binance.js — [FLUX BINANCE · 17/09/2026] VERSION 20260917d
// A14 : whale_v1 / flow_v1 lisent le flux d'ordres réel (@trade : quantité + côté preneur) et le carnet (depth 20) ;
// volume_v1 lit le volume réel des klines. Fonctions RÉELLES de 02 et 03 en vm.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début absente : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin absente'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const FLUX = between(s02, 'var _flowEmaNotional = {};', 'window._parseDepth = _parseDepth;', true);
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const SCOUT = between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false);
function ctx(S) {
  const c = { S, Math, Number, Array, Object, Date, isFinite, String, window: {}, getTechSignals: () => ({ atScore: 0, raw: {} }), getFundamentalSignals: () => ({ fundScore: 0 }), detectHarmonicResonance: () => null, lmsrP: () => 0.5 };
  vm.createContext(c); vm.runInContext(FLUX + '\n' + ENGINE + '\n' + SCOUT, c); return c;
}
const now = Date.now(), M = 60000;
console.log('▶ banc-flux-binance');
T('D1 · _recordTrade / _flowSummary RÉELS : seaux d\'une minute, quantités par côté preneur (m=true → vente), gros trades > 8 × notionnel moyen (plancher 500 $), fenêtre, trade en retard ignoré, ≤ 30 seaux', () => {
  const c = ctx({}); const rec = (p, px, q, m, t) => vm.runInContext(`_recordTrade('${p}', ${px}, ${q}, ${m}, ${t})`, c);
  for (let i = 0; i < 50; i++) rec('BTC/USDT', 100, 1, i % 4 === 0, now - 3 * M + i * 1000);   // 50 trades de 100 $ : 37 achats, 13 ventes (i = 0, 4, …, 48)
  rec('BTC/USDT', 100, 20, false, now - 2 * M + 5000);   // 2 000 $ = 20 × la moyenne → gros ACHAT
  rec('BTC/USDT', 100, 15, true,  now - 1 * M + 5000);   // 1 500 $ → gros VENTE
  rec('BTC/USDT', 100, 1, false, now - 10 * M);           // en retard → ignoré
  const f = JSON.parse(JSON.stringify(vm.runInContext("_flowSummary('BTC/USDT', 5)", c)));
  assert.strictEqual(f.n, 52); assert.strictEqual(f.buyQ, 37 + 20); assert.strictEqual(f.sellQ, 13 + 15);
  assert.strictEqual(f.bigBuy, 1); assert.strictEqual(f.bigSell, 1); assert.strictEqual(f.bigBuyUsd, 2000); assert.strictEqual(f.bigSellUsd, 1500);
  assert.ok(Math.abs(f.bigNet - (2000 - 1500) / 3500) < 1e-9); assert.ok(f.imb > 0.3);
  assert.strictEqual(JSON.parse(JSON.stringify(vm.runInContext("_flowSummary('BTC/USDT', 1)", c))).n, 0, 'fenêtre 1 min = la minute courante (vide ici)');
  assert.strictEqual(JSON.parse(JSON.stringify(vm.runInContext("_flowSummary('BTC/USDT', 2)", c))).n, 1, 'fenêtre 2 min = minute courante + précédente (la grosse vente)');
  const cc = ctx({}); for (let i = 0; i < 40; i++) vm.runInContext(`_recordTrade('X/USDT', 1, 1, false, ${now - i * M})`, cc);
  assert.strictEqual(cc.S.flowStats['X/USDT'].length, 1, 'trades en retard (i>0) ignorés');
  const c3 = ctx({}); for (let i = 40; i >= 0; i--) vm.runInContext(`_recordTrade('Y/USDT', 1, 1, false, ${now - i * M})`, c3);
  assert.strictEqual(c3.S.flowStats['Y/USDT'].length, 30, '≤ 30 seaux');
  // petit notionnel (PEPE) : un trade 20× la moyenne mais < 500 $ n'est pas une baleine
  const c4 = ctx({}); for (let i = 0; i < 30; i++) vm.runInContext(`_recordTrade('PEPE/USDT', 0.000003, 1000000, false, ${now - 2 * M + i * 1000})`, c4);   // 3 $ chacun
  vm.runInContext(`_recordTrade('PEPE/USDT', 0.000003, 30000000, false, ${now - M})`, c4);   // 90 $ = 30× mais < 500 $
  assert.strictEqual(JSON.parse(JSON.stringify(vm.runInContext("_flowSummary('PEPE/USDT', 5)", c4))).bigBuy, 0);
});
T('D2 · _parseDepth RÉEL : déséquilibre bid/ask, murs (> 5 × moyenne des niveaux), spread, stocké dans S.orderBook', () => {
  const c = ctx({});
  const bids = Array.from({ length: 20 }, (_, i) => [String(100 - i * 0.1), '1']); bids[3] = ['99.7', '40'];
  const asks = Array.from({ length: 20 }, (_, i) => [String(100.1 + i * 0.1), '1']);
  c.bids = bids; c.asks = asks; const ob = JSON.parse(JSON.stringify(vm.runInContext("_parseDepth('BTC/USDT', bids, asks)", c)));
  assert.strictEqual(ob.bidQ, 59); assert.strictEqual(ob.askQ, 20); assert.ok(ob.imb > 0.4);
  assert.deepStrictEqual(ob.bidWall, { p: 99.7, q: 40 }); assert.strictEqual(ob.askWall, null); assert.ok(Math.abs(ob.spreadPct - 0.1) < 1e-9);
  assert.strictEqual(c.S.orderBook['BTC/USDT'].bidQ, 59);
});
T('D3 · scouts RÉELS sur le flux : flow_v1 = flux acheteur (70 % pris à l\'achat) → score > 0 ; whale_v1 = gros achats → +bigScore, mur de vente → −0,15 ; sans flux → « En attente du flux Binance » (score 0)', () => {
  const S = { pairStates: { 'BTC/USDT': { candles: [], price: 100 } }, flowStats: {}, orderBook: {}, agents: [] };
  const c = ctx(S);
  const sc = id => JSON.parse(JSON.stringify(vm.runInContext(`scoutAnalysis('${id}', 'BTC/USDT')`, c)));
  assert.strictEqual(sc('flow_v1').reasoning, 'En attente du flux Binance'); assert.strictEqual(sc('whale_v1').score, 0);
  for (let i = 0; i < 100; i++) vm.runInContext(`_recordTrade('BTC/USDT', 100, 1, ${i % 10 < 3}, ${now - 4 * M + i * 1000})`, c);   // 70 % achats, sur 100 s
  const f = sc('flow_v1'); assert.ok(f.score > 0.2 && f.reasoning.startsWith('Flux acheteur dominant'), JSON.stringify(f));
  for (let i = 0; i < 3; i++) vm.runInContext(`_recordTrade('BTC/USDT', 100, 30, false, ${now - M + i * 1000})`, c);   // 3 gros achats (3 000 $)
  const w = sc('whale_v1'); assert.ok(w.score >= 0.7 && w.reasoning.startsWith('Gros acheteurs : 3 achats / 0 ventes'), JSON.stringify(w));
  vm.runInContext("S.orderBook['BTC/USDT'] = { t: Date.now(), imb: -0.5, bidWall: null, askWall: { p: 101, q: 50 } }", c);
  const w2 = sc('whale_v1'); assert.ok(Math.abs(w2.score - (w.score - 0.15)) < 1e-9 && w2.reasoning.includes('mur de vente à 101'), JSON.stringify(w2));
  const f2 = sc('flow_v1'); assert.ok(f2.score < f.score, 'le carnet en déséquilibre vendeur pèse 30 %');
});
T('D4 · volume_v1 RÉEL : volume des klines (v) — pic ×2 avec prix en hausse → +spikeScore ; volume à 0 partout → « En attente du volume Binance »', () => {
  const candles = Array.from({ length: 30 }, (_, i) => ({ o: 100, h: 101, l: 99, c: 100 + i * 0.01, v: i >= 25 ? 20 : 10 }));
  const S = { pairStates: { 'BTC/USDT': { candles, price: 100.3 } }, flowStats: {}, orderBook: {}, agents: [] };
  const c = ctx(S); const v = JSON.parse(JSON.stringify(vm.runInContext("scoutAnalysis('volume_v1', 'BTC/USDT')", c)));
  assert.strictEqual(v.score, 0.6); assert.ok(v.reasoning.startsWith('Pic de volume ×2.0'), v.reasoning);
  candles.forEach(k => { k.v = 0; }); const z = JSON.parse(JSON.stringify(vm.runInContext("scoutAnalysis('volume_v1', 'BTC/USDT')", c)));
  assert.strictEqual(z.reasoning, 'En attente du volume Binance'); assert.strictEqual(z.score, 0);
});
T('S1 · 02 : le @trade appelle _recordTrade(pair, price, q, m === true, T) ; carnet en tournante toutes les 5 s, jamais hors ligne ; 03 : plus de proxys de bougies dans whale/flow', () => {
  const c02 = codeStrict(s02), c03 = codeStrict(SCOUT);
  assert.ok(c02.includes("_recordTrade(pair, price, parseFloat(msg.q), msg.m === true, msg.T);"));
  assert.ok(c02.includes('setInterval(_pollOrderBook, 5000);') && between(c02, 'function _pollOrderBook() {', 'window._pollOrderBook', false).includes('if (window._auraNetOffline) return;'));
  assert.ok(s02.includes("'https://api.binance.com/api/v3/depth?symbol=' + sym + '&limit=20'"));
  assert.strictEqual(c03.includes('avgBody'), false); assert.strictEqual(c03.includes('bullBodies'), false);
  assert.strictEqual((c03.match(/_flowSummary\(pair, G\.(avgN|win)\)/g) || []).length, 2);
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
