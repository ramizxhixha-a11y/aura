// banc-liberer.js — [GO LIBÉRER · 21/11/2026] js/18b-liberer.js : l'EV libérée (Rams 21/11 09:00 / 09:03). VRAI texte du module, du 03 (_thLevel)
// et du 15b (R, tientEV, sync) en vm.
//   L1  seuil appris FERMÉ (Infinity) : EV → null (10f prend les portes par régime, comme l'AA) ; RE → Infinity (inchangé) ; AA → null (inchangé)
//   L2  seuil appris OUVERT (niveau 0,4) : EV → null ; RE → 0,4 ; le module ne s'enveloppe qu'une fois ; témoin : sans le module, EV → Infinity
//   L3  la voix lâche l'EV, une fois : reel.on 1 → 0, marque « 20261121 », UNE ligne 🔓 au journal ; VRAI 15b : _tlrTientEV() vrai avant, faux après,
//       et sync n'ouvre rien ; Rams la remet (on = 1, marque posée) → le module ne la recoupe pas ; état pas encore prêt → rien
//   L4  rien d'autre : le module n'appelle ni openPosition, ni closePosition, ni n'écrit ailleurs que S.tendance.reel (on, libre) et le journal
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MOD = rd('js/18b-liberer.js'), S03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), S15B = rd('js/15b-tendance-reelle.js');
let pass = 0, fail = 0;
function T(n, fn) { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); } }
function fnText(src, name) {
  const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); } }
  throw new Error('fin de ' + name);
}
// _thLevel réel de 03, avec _thRealLike réel et une _thRule témoin
function ctx03(mode, rule, avecModule) {
  const c = { S: { tradingMode: mode }, window: {}, Number, isFinite, Infinity, Math, Date, console };
  c.window = c; vm.createContext(c);
  vm.runInContext(fnText(S03, '_thRealLike') + '\n' + fnText(S03, '_thLevel') + '\nfunction _thRule(){ return __rule; }\nwindow._thLevel = _thLevel;', c);
  c.__rule = rule;
  if (avecModule) vm.runInContext(MOD, c);
  return c;
}
T('L1 seuil fermé : EV → null, RE → Infinity, AA → null', () => {
  const ferme = { open: false };
  assert.strictEqual(vm.runInContext('_thLevel()', ctx03('paperReal', ferme, true)), null);
  assert.strictEqual(vm.runInContext('_thLevel()', ctx03('real', ferme, true)), Infinity);
  assert.strictEqual(vm.runInContext('_thLevel()', ctx03('sim', ferme, true)), null);
});
T('L2 seuil ouvert : EV → null, RE → 0,4 ; une seule enveloppe ; témoin sans module : EV → Infinity', () => {
  const ouvert = { open: true, level: 0.4 };
  const ev = ctx03('paperReal', ouvert, true), re = ctx03('real', ouvert, true);
  assert.strictEqual(vm.runInContext('_thLevel()', ev), null);
  assert.strictEqual(vm.runInContext('_thLevel()', re), 0.4);
  const f1 = ev.window._thLevel; vm.runInContext('window._libre.enveloppe()', ev); assert.strictEqual(ev.window._thLevel, f1);
  assert.strictEqual(vm.runInContext('_thLevel()', ctx03('paperReal', { open: false }, false)), Infinity, 'témoin : le seuil fermait l\'EV');
  ev.S.tradingMode = 'real'; assert.strictEqual(vm.runInContext('_thLevel()', ev), 0.4, 'bascule de mode lue à chaque appel');
});
T('L3 la voix lâche l\'EV une fois ; VRAI 15b : tientEV vrai → faux, sync n\'ouvre rien ; Rams la remet → gardée', () => {
  const opened = [];
  const S = { tradingMode: 'paperReal', chainLog: [], openPositions: [], walletStore: { paperReal: {} }, pairStates: {},
    tendance: { v: 1, pos: { 'BTC/USDT': { s: 1, x0: 100, t0: 1 } }, reel: { v: 1, on: 1, depuis: 1, suivi: {}, attente: {}, bloque: {}, essai: {}, real: 0, n: 0 } } };
  const timers = [];
  const c = { S, window: {}, Number, isFinite, Infinity, Math, Date, JSON, console, Object, Array, String,
    setInterval: (fn) => { timers.push(fn); return timers.length; }, clearInterval: () => {}, setTimeout: () => 0,
    openPosition: () => { opened.push(1); return { id: 1 }; }, closePosition: () => true, nowStr: () => '09:10:00', rndHash: () => 'h',
    document: { getElementById: () => null, readyState: 'complete', addEventListener() {} }, fetch: () => Promise.reject(new Error('hors ligne')) };
  c.window = c; vm.createContext(c);
  vm.runInContext(S15B, c);
  assert.strictEqual(c._tlrTientEV(), true, 'avant : la voix tient l\'EV');
  vm.runInContext(MOD, c);
  vm.runInContext('window._libre.lacher()', c);   // état pas prêt : lacher agit quand même si appelé ; le minuteur, lui, attend _stateReady
  assert.strictEqual(S.tendance.reel.on, 0); assert.strictEqual(S.tendance.reel.libre, '20261121');
  assert.strictEqual(c._tlrTientEV(), false, 'après : les bots peuvent ouvrir en EV (09c:75)');
  assert.strictEqual(S.chainLog.filter(l => l.icon === '🔓').length, 1);
  c._isModeRunning = () => true; try { vm.runInContext('window._tlr.sync()', c); } catch (e) {}
  assert.strictEqual(opened.length, 0, 'la voix n\'ouvre plus rien');
  vm.runInContext('window._libre.lacher()', c); assert.strictEqual(S.chainLog.filter(l => l.icon === '🔓').length, 1, 'une seule fois');
  S.tendance.reel.on = 1; vm.runInContext('window._libre.lacher()', c);
  assert.strictEqual(S.tendance.reel.on, 1, 'Rams l\'a remise : gardée');
  // minuteur : rien tant que l'état n'est pas prêt
  const S2 = { chainLog: [], tendance: { v: 1, reel: { v: 1, on: 1 } } };
  const c2 = { S: S2, window: {}, setInterval: (fn) => { c2._t.push(fn); return 1; }, clearInterval: () => {}, _t: [], Math, Date };
  c2.window = c2; vm.createContext(c2); vm.runInContext(MOD, c2);
  c2._t.forEach(f => f()); assert.strictEqual(S2.tendance.reel.on, 1, 'état pas prêt : rien');
  c2._stateReady = true; c2._t.forEach(f => f()); assert.strictEqual(S2.tendance.reel.on, 0, 'état prêt : lâchée');
});
T('L4 rien d\'autre : ni ouverture, ni fermeture, ni stockage', () => {
  const code = MOD.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  ['openPosition', 'closePosition', 'localStorage', 'indexedDB', 'saveState', 'botAutoMode', 'walletStore', 'openPositions']
    .forEach(w => assert.ok(!code.includes(w), 'le module touche ' + w));
  const writes = (code.match(/\b(r|S)\.[A-Za-z_]+\s*=(?!=)/g) || []).sort();
  assert.deepStrictEqual(writes, ['r.libre =', 'r.on ='], 'écritures : ' + writes.join(', '));
});
console.log('\n' + (fail ? '❌ ' + pass + '/' + (pass + fail) + ' tests passés — ' + fail + ' ÉCHEC(S)' : '✅ ' + pass + '/' + pass + ' tests passés'));
process.exit(fail ? 1 : 0);
