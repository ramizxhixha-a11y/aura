// banc-p3-heatmap.js — [P3 · 06/09/2026] BRIQUE 3 DU PONT : heatmap horaire → portes de conviction.
// Charge le module LIVRÉ 10e3 en vm avec une horloge et un S pilotés, puis rejoue le texte LIVRÉ
// des portes 10f (porte par régime + plancher) et vérifie les traces, le HTML et l'écrivain 03.
// Lancer à la racine du dépôt : node banc-p3-heatmap.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let ok = 0, ko = 0;
function T(name, fn) { try { fn(); ok++; console.log('  ✅ ' + name); } catch (e) { ko++; console.log('  ❌ ' + name + '\n     ' + (e && e.message)); } }

console.log('── A · 10e3 livré : _heatSlotVerdict / _heatGateForOpen ──');
let _fakeNow = Date.UTC(2026, 8, 12, 12, 0);            // horloge pilotée
const S = { heatmap: { byHour: {} }, chainLog: [] };
const ctx = { window: {}, S, Date: class extends Date { constructor(...a) { super(a.length ? a[0] : _fakeNow); } static now() { return _fakeNow; } }, Number, Math };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/10e3-heatmap-horaire.js', 'utf8'), ctx);
const v = ctx._heatSlotVerdict;
T('créneau absent → neutre', () => { const o = v({}, 3); assert.strictEqual(o.delta, 0); assert.strictEqual(o.tag, null); assert.strictEqual(o.count, 0); });
T('19 trades WR 10 % → neutre (échantillon insuffisant)', () => { const o = v({ 3: { count: 19, wins: 2, pnl: -5 } }, 3); assert.strictEqual(o.delta, 0); assert.strictEqual(o.tag, null); });
T('20 trades WR 35 % → froid +0.08', () => { const o = v({ 3: { count: 20, wins: 7, pnl: -5 } }, 3); assert.strictEqual(o.delta, 0.08); assert.strictEqual(o.tag, 'froid'); assert.strictEqual(o.hour, 3); });
T('20 trades WR 40 % exactement → neutre (borne froide exclusive)', () => { assert.strictEqual(v({ 3: { count: 20, wins: 8, pnl: -1 } }, 3).delta, 0); });
T('20 trades WR 60 %, pnl > 0 → or −0.03', () => { const o = v({ 3: { count: 20, wins: 12, pnl: 4 } }, 3); assert.strictEqual(o.delta, -0.03); assert.strictEqual(o.tag, 'or'); });
T('20 trades WR 60 %, pnl ≤ 0 → neutre (gagne souvent, perd de l’argent)', () => { assert.strictEqual(v({ 3: { count: 20, wins: 12, pnl: 0 } }, 3).delta, 0); });
T('20 trades WR 59 % → neutre (borne or inclusive à 60)', () => { assert.strictEqual(v({ 3: { count: 100, wins: 59, pnl: 9 } }, 3).delta, 0); });
T('champs non numériques → neutre sans exception', () => { assert.strictEqual(v({ 3: { count: 'x', wins: null } }, 3).delta, 0); });
T('_heatGateForOpen lit l’heure LOCALE courante (même horloge que l’écrivain 03)', () => {
  const h = new Date(_fakeNow).getHours();
  S.heatmap.byHour = { [h]: { count: 25, wins: 5, pnl: -3 } };
  const g = ctx._heatGateForOpen(); assert.strictEqual(g.hour, h); assert.strictEqual(g.delta, 0.08);
});
T('cache 60 s : une mise à jour de la heatmap dans la minute n’est pas relue', () => {
  const h = new Date(_fakeNow).getHours();
  S.heatmap.byHour[h].wins = 20; S.heatmap.byHour[h].pnl = 5;
  assert.strictEqual(ctx._heatGateForOpen().delta, 0.08);
  _fakeNow += 61 * 1000;
  assert.strictEqual(ctx._heatGateForOpen().delta, -0.03);
});
T('changement d’heure → cache invalidé immédiatement', () => {
  _fakeNow += 3600 * 1000;
  const g = ctx._heatGateForOpen(); assert.strictEqual(g.delta, 0); assert.strictEqual(g.count, 0);
});
T('S sans heatmap → neutre', () => { _fakeNow += 3600 * 1000; delete S.heatmap; assert.strictEqual(ctx._heatGateForOpen().delta, 0); S.heatmap = { byHour: {} }; });

console.log('\n── B · 10f livré : portes avec delta (texte réel) ──');
const src10f = fs.readFileSync('js/10f-resolveur-cycle.js', 'utf8');
const gateTxt = src10f.slice(src10f.indexOf("  const _mktReg ="), src10f.indexOf("  const dirGate"));
const floorTxt = src10f.slice(src10f.indexOf("  const _convFloor ="), src10f.indexOf("  if(_gainNet < _minNetGain"));
function gates(conv, regime, delta, eco, corr) {
  const c = { S: { _convBoost: 0, openPositions: [] }, effectiveConviction: conv, ps: { trades: [] }, pair: 'BTC/USDT',
    detectMarketRegime: () => regime, _corrGateForOpen: () => ({ bonus: corr || 0, corr: null }), _ecoGateForOpen: () => ({ malus: eco || 0, veto: false }),
    _heatGateForOpen: () => ({ delta: delta || 0, hour: 3, wr: 0.3, count: 25, tag: delta > 0 ? 'froid' : delta < 0 ? 'or' : null }),
    finalSignalWithMem: 0.5, _pairWatch: false, Math };
  vm.createContext(c);
  vm.runInContext(gateTxt + 'var __cg = convGate;', c);
  vm.runInContext(floorTxt.replace(/const /g, 'var '), c);
  return { convGate: c.__cg, floor: c._convFloor, corrDecisive: c._corrDecisive, heatDecisive: c._heatDecisive };
}
T('CALM 0.35 · conv 0.40 · neutre → porte ouverte, plancher 0.30', () => { const g = gates(0.40, 'calm', 0); assert.strictEqual(g.convGate, true); assert.ok(Math.abs(g.floor - 0.30) < 1e-9); assert.strictEqual(g.heatDecisive, false); });
T('CALM · conv 0.40 · froid +0.08 → porte 0.43 fermée, plancher 0.38', () => { const g = gates(0.40, 'calm', 0.08); assert.strictEqual(g.convGate, false); assert.ok(Math.abs(g.floor - 0.38) < 1e-9); });
T('CALM · conv 0.43 · froid → passe (0.43 ≥ 0.43)', () => { assert.strictEqual(gates(0.43, 'calm', 0.08).convGate, true); });
T('normal 0.25 · conv 0.30 · froid → porte 0.33 fermée', () => { assert.strictEqual(gates(0.30, 'bull', 0.08).convGate, false); });
T('volatil 0.18 · conv 0.26 · froid → passe la porte (0.26), plancher 0.38 le retiendra', () => { const g = gates(0.26, 'volatile', 0.08); assert.strictEqual(g.convGate, true); assert.ok(Math.abs(g.floor - 0.38) < 1e-9); });
T('CALM · conv 0.33 · or −0.03 → porte 0.32 passe, DÉCISIF', () => { const g = gates(0.33, 'calm', -0.03); assert.strictEqual(g.convGate, true); assert.strictEqual(g.heatDecisive, true); assert.ok(Math.abs(g.floor - 0.27) < 1e-9); });
T('CALM · conv 0.40 · or → passe, NON décisif (aurait passé sans)', () => { const g = gates(0.40, 'calm', -0.03); assert.strictEqual(g.convGate, true); assert.strictEqual(g.heatDecisive, false); });
T('bull 0.25 · conv 0.28 · or → plancher 0.30→0.27 passe, DÉCISIF (par le plancher)', () => { const g = gates(0.28, 'bull', -0.03); assert.strictEqual(g.convGate, true); assert.ok(g.floor <= 0.28); assert.strictEqual(g.heatDecisive, true); });
T('cumul froid +0.08 + éco +0.10 : CALM porte 0.53, plancher 0.48', () => { const g = gates(0.50, 'calm', 0.08, 0.10); assert.strictEqual(g.convGate, false); assert.ok(Math.abs(g.floor - 0.48) < 1e-9); });
T('cumul or −0.03 + corr −0.03 : CALM porte 0.29, plancher 0.24', () => { const g = gates(0.29, 'calm', -0.03, 0, 0.03); assert.strictEqual(g.convGate, true); assert.ok(Math.abs(g.floor - 0.24) < 1e-9); });
T('P1 intact : bonus corr décisif calculé AVEC le delta (0.41 passe grâce à −0.03 sur porte 0.43+0.08−0.03)', () => { const g = gates(0.40, 'calm', 0.08, 0, 0.03); assert.strictEqual(g.convGate, true); assert.strictEqual(g.corrDecisive, true); });
T('P2 intact : éco +0.10 seul, CALM 0.40 fermée, plancher 0.40', () => { const g = gates(0.40, 'calm', 0, 0.10); assert.strictEqual(g.convGate, false); assert.ok(Math.abs(g.floor - 0.40) < 1e-9); });

console.log('\n── C · 10f livré : traces et structure ──');
T('un seul appel _heatGateForOpen dans 10f, 10 usages de _heatDelta (déclaration + 9 lectures)', () => {
  assert.strictEqual((src10f.match(/_heatGateForOpen\(/g) || []).length, 1);
  assert.strictEqual((src10f.match(/_heatDelta/g) || []).length, 10);
});
T('trace froid dans le hold (porte régime) et au plancher ; trace or à l’ouverture', () => {
  assert.strictEqual((src10f.match(/_heatTrace\(pair, _heatG, false\)/g) || []).length, 2);
  assert.strictEqual((src10f.match(/_heatTrace\(pair, _heatG, true\)/g) || []).length, 1);
  assert.ok(src10f.indexOf('if(_heatDecisive) _heatTrace') > src10f.indexOf('autoOpenPosition(pair, side, finalStake)'));
});
T('_heatTrace : 1×/5 min/paire, icône 🕐, plafond 100 chainLog', () => {
  const c = { S: { chainLog: [] }, rndHash: () => 'h', nowStr: () => 't', HEAT_GOLD_BONUS: 0.03, HEAT_COLD_MALUS: 0.08, Date, Math };
  vm.createContext(c);
  vm.runInContext(src10f.slice(src10f.indexOf('const _heatLogTs'), src10f.indexOf('function _ecoMalusTrace')), c);
  const hg = { hour: 3, wr: 0.3, count: 25, tag: 'froid' };
  c._heatTrace('BTC/USDT', hg, false); c._heatTrace('BTC/USDT', hg, false); c._heatTrace('ETH/USDT', { hour: 14, wr: 0.65, count: 40, tag: 'or' }, true);
  assert.strictEqual(c.S.chainLog.length, 2);
  assert.strictEqual(c.S.chainLog[0].icon, '🕐'); assert.ok(c.S.chainLog[0].desc.includes('retenu') && c.S.chainLog[0].desc.includes('3h') && c.S.chainLog[0].desc.includes('+0.08'));
  assert.ok(c.S.chainLog[1].desc.includes("créneau d'or 14h") && c.S.chainLog[1].desc.includes('−0.03'));
});
T('trace éco du hold recalculée avec le delta heatmap (seul l’éco est isolé)', () => {
  assert.ok(src10f.includes('effectiveConviction >= (_gates.conv + _expPenalty + _heatDelta - _corrBonus - (S._convBoost || 0))) _ecoMalusTrace'));
});
T('_heatDecisive exclut le delta du seuil de référence (porte ET plancher)', () => {
  assert.ok(src10f.includes('effectiveConviction < (_convFloor - _heatDelta));'));
});

console.log('\n── D · écrivain 03, HTML, périmètre ──');
const src03 = fs.readFileSync('js/03-per-pair-position-buttons-controls-buid.js', 'utf8');
T('écrivain unique : recordTradeForHeatmap définie dans 03, appelée une fois (02 closePosition), heure locale', () => {
  const defs = fs.readdirSync('js').filter(f => f.endsWith('.js') && f !== '10-fin-bloc-restauration-v93.js').filter(f => fs.readFileSync('js/' + f, 'utf8').includes('function recordTradeForHeatmap'));
  assert.deepStrictEqual(defs, ['03-per-pair-position-buttons-controls-buid.js']);
  const calls = fs.readdirSync('js').filter(f => f.endsWith('.js') && f !== '10-fin-bloc-restauration-v93.js').map(f => (fs.readFileSync('js/' + f, 'utf8').match(/recordTradeForHeatmap\(realisedUsd/g) || []).length).reduce((a, b) => a + b, 0);
  assert.strictEqual(calls, 1);
  const body = src03.slice(src03.indexOf('function recordTradeForHeatmap'), src03.indexOf('function renderHeatmapPanel'));
  assert.ok(body.includes('d.getHours()') && !body.includes('getUTCHours'));
});
T('10e3 : module ≤ 500 lignes, lit uniquement S.heatmap', () => {
  const src = fs.readFileSync('js/10e3-heatmap-horaire.js', 'utf8');
  assert.ok(src.split('\n').length <= 500);
  assert.deepStrictEqual([...new Set(src.match(/\bS\.[a-zA-Z_]+/g))], ['S.heatmap']);
});
const html = fs.readFileSync('AURA8_v118.html', 'utf8');
T('HTML : 10e3 chargé juste après 10e2 et avant 10f, token 20260906b sur 74 ressources + DOC_V, ancien token absent', () => {
  const i2 = html.indexOf('js/10e2-calendrier-eco.js?v=20260906b'), i3 = html.indexOf('js/10e3-heatmap-horaire.js?v=20260906b'), i4 = html.indexOf('js/10f-resolveur-cycle.js?v=20260906b');
  assert.ok(i2 > 0 && i3 > i2 && i4 > i3);
  assert.strictEqual((html.match(/\?v=20260906b/g) || []).length, 74);
  assert.ok(html.includes("DOC_V = '20260906b'")); assert.ok(!html.includes('20260906a'));
});
T('10e et 10e2 non touchés : aucune référence HEAT', () => {
  assert.ok(!fs.readFileSync('js/10e-helpers-adaptatifs.js', 'utf8').includes('_heat'));
  assert.ok(!fs.readFileSync('js/10e2-calendrier-eco.js', 'utf8').includes('_heat'));
});

console.log('\n' + ok + '/' + (ok + ko) + ' tests passés' + (ko ? ' · ' + ko + ' ÉCHEC(S)' : ''));
process.exit(ko ? 1 : 0);
