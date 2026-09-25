// banc-stop-exchange.js — [STOP CÔTÉ EXCHANGE SIMULÉ · 26/09/2026] VERSION 20260926a
// Décision Rams (26/09, « oui aux deux ») : en EV, au premier prix frais après une coupure, une position dont le prix a
// traversé le stop est comptée fermée AU stop (comme l'exchange l'aurait fait), pas au prix de retour. Balayage RÉEL de 10f
// + prise du prix imposé par closePosition RÉEL (02).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s10f = rd('js/10f-resolveur-cycle.js'), s02 = rd('js/02-state-init.js');
function ctxSweep(S, priceAge) {
  const closed = [];
  const ctx = { console, Math, Date, String, Error, isFinite, Number, window: {}, S, _rcPriceAge: () => priceAge,
    closePosition: (id, bot) => { const p = S.openPositions.find(x => x.id === id); closed.push([id, bot, p && p._forcedExitPx]); S.openPositions = S.openPositions.filter(x => x.id !== id); },
    learnFromOutcome: () => {}, showToast: () => {} };
  vm.createContext(ctx);
  vm.runInContext(between(s10f, 'function _closeCompleted(pos, label) {', 'window._closeCompleted = _closeCompleted;', true), ctx);
  vm.runInContext(between(s10f, 'window._botExitSweep = function _botExitSweep() {', '\nwindow._lossCapSweep = function', false), ctx);
  return { ctx, closed, run: () => vm.runInContext('window._botExitSweep()', ctx) };
}
const pos = (id, side, entry, sl, tp, stale) => ({ id, pair: 'P/USDT', side, entryPrice: entry, stakeUsdt: 50, auto: true, sl, tp, _holdCycles: 3, _pathStale: stale });
console.log('▶ banc-stop-exchange');
T('D1 · le cas PEPE : coupure (prix figé), prix revenu à −5 % sous un stop à −2 % → fermée AU stop (prix imposé = stop), marque stop_exchange, journal 🔌', () => {
  const S = { tradingMode: 'paperReal', botAutoMode: true, chainLog: [], pairStates: { 'P/USDT': { price: 95 } }, openPositions: [pos('a', 'long', 100, 98, 103, 3600)] };
  const s = ctxSweep(S, 5000); s.run();
  assert.deepStrictEqual(s.closed, [['a', true, 98]], 'fermée avec le prix imposé 98 (le stop), pas 95');
  assert.ok(S.chainLog.some(e => e.desc.startsWith('Stop côté exchange (simulé) · P/USDT LONG · coupure 60 min, prix revenu à -5.00 % → compté au stop -2.00 %')), JSON.stringify(S.chainLog));
});
T('D2 · short symétrique ; prix revenu SANS avoir traversé le stop → rien de spécial (la coupure est simplement oubliée) ; prix encore figé → on attend', () => {
  let S = { tradingMode: 'paperReal', botAutoMode: true, chainLog: [], pairStates: { 'P/USDT': { price: 104 } }, openPositions: [pos('b', 'short', 100, 102, 97, 10)] };
  let s = ctxSweep(S, 1000); s.run(); assert.deepStrictEqual(s.closed, [['b', true, 102]]);
  S = { tradingMode: 'paperReal', botAutoMode: true, chainLog: [], pairStates: { 'P/USDT': { price: 99 } }, openPositions: [pos('c', 'long', 100, 98, 103, 10)] };
  s = ctxSweep(S, 1000); s.run(); assert.strictEqual(s.closed.length, 0, 'pas traversé : on tient'); assert.strictEqual(S.openPositions[0]._pathStale, 0, 'la coupure est soldée');
  // prix toujours figé (pendant la coupure ps.price ne bouge pas : il vaut le dernier prix d'AVANT, 99.3 ici) : rien n'est soldé, la coupure continue
  S = { tradingMode: 'paperReal', botAutoMode: true, chainLog: [], pairStates: { 'P/USDT': { price: 99.3 } }, openPositions: [pos('d', 'long', 100, 98, 103, 10)] };
  s = ctxSweep(S, 999999); s.run(); assert.strictEqual(s.closed.length, 0); assert.strictEqual(S.openPositions[0]._pathStale, 10, 'prix toujours figé : rien n\'est décidé');
});
T('D3 · jamais en AA ; jamais sans coupure (une position normale sous son stop passe par le stop ATR habituel, au prix courant)', () => {
  let S = { tradingMode: 'sim', botAutoMode: true, chainLog: [], pairStates: { 'P/USDT': { price: 95 } }, openPositions: [pos('e', 'long', 100, 98, 103, 100)] };
  let s = ctxSweep(S, 1000); s.run(); assert.deepStrictEqual(s.closed, [['e', true, undefined]], 'AA : stop ATR normal, prix courant');
  S = { tradingMode: 'paperReal', botAutoMode: true, chainLog: [], pairStates: { 'P/USDT': { price: 95 } }, openPositions: [pos('f', 'long', 100, 98, 103, 0)] };
  s = ctxSweep(S, 1000); s.run(); assert.deepStrictEqual(s.closed, [['f', true, undefined]], 'sans coupure : stop ATR au prix courant');
});
T('D4 · closePosition RÉEL consomme le prix imposé UNE fois, et ne l\'utilise que s\'il est valide', () => {
  const c = codeStrict(s02);
  assert.ok(c.includes("const _forced = (isFinite(pos._forcedExitPx) && pos._forcedExitPx > 0) ? pos._forcedExitPx : null;") && c.includes('if (_forced !== null) delete pos._forcedExitPx;') && c.includes('const cur = _forced !== null ? _forced : (ps ? ps.price : pos.entryPrice);'));
  assert.strictEqual((c.match(/_forcedExitPx = /g) || []).length, 0, '02 ne le pose jamais lui-même');
  assert.strictEqual((codeStrict(s10f).match(/pos\._forcedExitPx = pos\.sl;/g) || []).length, 1, 'un seul écrivain : 10f, à la reconnexion, au stop');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
