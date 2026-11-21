// banc-gains-paires.js — [GO LIBÉRER · 21/11/2026] js/18c-gains-paires.js : « Mes paires » montre les gains du jour (Rams 21/11 08:52 / 08:59).
// VRAI texte de 07 renderPairPnl, de 02 _isCloseRow / _closeRowUsd et du module, en vm, sur les lignes EV du backup du pont du 21/11 08:25
// (banc-fixtures/gains-paires-ev-20261121.json : 11 fermetures de Rams à 07:28, 11 SHORT rouverts et fermés à 07:41–07:44, lignes « open » et d'hier).
//   G1  en-tête : « Aujourd'hui +$221.40 · 22 fermetures » (somme exacte des lignes : 221,4044) ; le cumul (07, inchangé) reste −$35.79 / 363 trades
//   G2  sous chaque paire : BTC « auj. +$18.40 », PEPE « auj. +$29.10 » … ; une paire sans fermeture du jour : rien
//   G3  témoin : sans le module, aucun « Aujourd'hui » ni « auj. » (07 seul) ; les lignes « open » et celles d'hier ne comptent pas
//   G4  historique coupé : 30 lignes toutes d'aujourd'hui → « ≥ » ; rien n'est écrit dans S
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MOD = rd('js/18c-gains-paires.js'), S07 = rd('js/07-v90-mode-bunker-sos.js'), S02 = rd('js/02-state-init.js');
const FX = JSON.parse(rd('banc-fixtures/gains-paires-ev-20261121.json'));
let pass = 0, fail = 0;
function T(n, fn) { try { fn(); pass++; console.log('  ✓ ' + n); } catch (e) { fail++; console.log('  ✗ ' + n + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); } }
function fnText(src, name) {
  const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); } }
  throw new Error('fin de ' + name);
}
function el(id) { const e = { id, style: {}, textContent: '', innerHTML: '', children: [], parentNode: null, title: '',
  appendChild(c) { c.parentNode = e; e.children.push(c); D[c.id] = c; return c; }, insertBefore(c) { c.parentNode = e; e.children.unshift(c); D[c.id] = c; return c; },
  querySelectorAll: () => [] }; return e; }
let D = {};
function boot(withModule, pairStates) {
  D = {};
  const right = el('right'), gTr = el('globalPnlTrades'); right.appendChild(gTr); D.globalPnlUsd = el('globalPnlUsd');
  const bars = el('pairPnlBars');
  bars.querySelectorAll = () => Object.keys(FX.pairs).map(p => ({}));
  Object.keys(FX.pairs).forEach(p => { const k = p.replace('/', '_'), col = el('col_' + k); ['pb_fill_', 'pb_usd_', 'pb_meta_', 'pb_badge_', 'pb_live_'].forEach(x => col.appendChild(el(x + k))); });
  D.pairPnlBars = bars;
  const PAIRS = {}; Object.keys(FX.pairs).forEach(p => PAIRS[p] = { color: '#fff' });
  const S = { pairStates: pairStates || JSON.parse(JSON.stringify(FX.pairs)), openPositions: [] };
  const now = FX.now;
  const c = { S, PAIRS, Math, Number, isFinite, Object, Array, JSON, String, console,
    Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } },
    document: { getElementById: id => D[id] || null, createElement: () => el('') } };
  c.window = c; vm.createContext(c);
  vm.runInContext(fnText(S02, '_isCloseRow') + '\n' + fnText(S02, '_closeRowUsd') + '\n' + fnText(S07, 'renderPairPnl') + '\nwindow.renderPairPnl = renderPairPnl;', c);
  if (withModule) vm.runInContext(MOD, c);
  vm.runInContext('renderPairPnl()', c);
  return { c, S };
}
T('G1 en-tête : Aujourd\'hui +$221.40 · 22 fermetures ; cumul inchangé −$35.79 / 363 trades', () => {
  boot(true);
  assert.strictEqual(D.globalPnlToday.textContent, 'Aujourd\'hui +$221.40 · 22 fermetures');
  assert.strictEqual(D.globalPnlUsd.textContent, '-$35.79'); assert.strictEqual(D.globalPnlTrades.textContent, '363 trades');
});
T('G2 sous chaque paire : BTC +$18.40, PEPE +$29.10 ; 11 paires du jour', () => {
  boot(true);
  assert.strictEqual(D.pb_today_BTC_USDT.textContent, 'auj. +$18.40');
  assert.strictEqual(D.pb_today_PEPE_USDT.textContent, 'auj. +$29.10');
  const n = Object.keys(D).filter(k => k.startsWith('pb_today_') && D[k].style.display !== 'none').length; assert.strictEqual(n, 11);
});
T('G3 témoin : 07 seul n\'affiche rien du jour ; lignes « open » et d\'hier écartées', () => {
  boot(false);
  assert.ok(!D.globalPnlToday && !Object.keys(D).some(k => k.startsWith('pb_today_')));
  const { c } = boot(true); const m0 = c.window._gainsPaires.minuit(FX.now);
  const ps = { trades: [{ type: 'open', ts: m0 + 1000, pnlUsdt: null }, { type: 'position', ts: m0 - 1000, pnlUsdt: 50 }, { type: 'tendance', ts: m0 + 5, pnlUsdt: 2 }] };
  const j = c.window._gainsPaires.duJour(ps, m0); assert.strictEqual(j.n, 1); assert.strictEqual(j.usd, 2);
});
T('G4 historique coupé → « ≥ » ; S intact', () => {
  const ps = JSON.parse(JSON.stringify(FX.pairs)); const m0 = new Date(FX.now); m0.setHours(0, 0, 0, 0);
  ps['BTC/USDT'].trades = Array.from({ length: 30 }, (_, i) => ({ type: 'position', ts: m0.getTime() + 1000 + i, pnlUsdt: 1 }));
  const before = JSON.stringify(ps);
  const { S } = boot(true, ps);
  assert.strictEqual(D.pb_today_BTC_USDT.textContent, 'auj. ≥ +$30.00');
  assert.ok(D.globalPnlToday.textContent.includes('≥'));
  assert.strictEqual(JSON.stringify(S.pairStates), before, 'S modifié');
});
console.log('\n' + (fail ? '❌ ' + pass + '/' + (pass + fail) + ' tests passés — ' + fail + ' ÉCHEC(S)' : '✅ ' + pass + '/' + pass + ' tests passés'));
process.exit(fail ? 1 : 0);
