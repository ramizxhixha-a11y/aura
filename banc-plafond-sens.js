// banc-plafond-sens.js — [PLAFOND DE SENS · 21/09/2026] VERSION 20260921a
// Au plus 2 positions ouvertes dans le même sens. Backup 21/09 : à 03:45, LINK + ADA + BTC tous LONG, stoppés par le
// même creux en 6 minutes ; l'anti-doublon (> 0,80) n'avait rien bloqué (corrélations mesurées 0,60 à 0,73).
// Fonction RÉELLE _dirCapForOpen (10e) + épingles sur l'entonnoir 09c.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s10e = rd('js/10e-helpers-adaptatifs.js'), s09c = rd('js/09c-auto-open.js');
const grab = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); const j = src.indexOf('\n}\n', i); return src.slice(i, j + 2); };
const SRC = grab(s10e, 'function _isLongSide(side) {') + '\nconst DIR_CAP_MAX = 2;\n' + grab(s10e, 'function _dirCapForOpen(pair, side) {');
function run(positions, pair, side) { const c = { S: { openPositions: positions }, String }; vm.createContext(c); vm.runInContext(SRC, c); c.p = pair; c.sd = side; return JSON.parse(JSON.stringify(vm.runInContext('_dirCapForOpen(p, sd)', c))); }
const P = (pair, side, auto) => ({ pair, side, auto: auto !== false, stakeUsdt: 50 });
console.log('▶ banc-plafond-sens');
T('D1 · le cas du backup 21/09 : LINK + ADA LONG ouverts → BTC LONG refusé ; un 3e SHORT reste possible', () => {
  const book = [P('LINK/USDT', 'long'), P('ADA/USDT', 'long')];
  const r = run(book, 'BTC/USDT', 'long');
  assert.deepStrictEqual(r, { veto: true, count: 2, max: 2, pairs: ['LINK/USDT', 'ADA/USDT'] });
  assert.strictEqual(run(book, 'BTC/USDT', 'short').veto, false, 'un short diversifie : autorisé');
});
T('D2 · 0 ou 1 position dans le sens → autorisé ; le sens opposé ne compte pas ; la paire candidate est exclue', () => {
  assert.strictEqual(run([], 'BTC/USDT', 'long').veto, false);
  assert.strictEqual(run([P('ETH/USDT', 'long')], 'BTC/USDT', 'long').veto, false);
  assert.strictEqual(run([P('ETH/USDT', 'short'), P('SOL/USDT', 'short')], 'BTC/USDT', 'long').veto, false, 'deux shorts n\'empêchent pas un long');
  assert.strictEqual(run([P('ETH/USDT', 'short'), P('SOL/USDT', 'short')], 'BTC/USDT', 'short').veto, true, '… mais un 3e short, si');
  assert.strictEqual(run([P('BTC/USDT', 'long'), P('ETH/USDT', 'long')], 'BTC/USDT', 'long').count, 1, 'la paire candidate ne se compte pas elle-même');
});
T('D3 · les positions MANUELLES comptent dans le livre ; variantes de sens (LONG, buy, Short) reconnues ; entrées douteuses ignorées', () => {
  assert.strictEqual(run([P('ETH/USDT', 'long', false), P('SOL/USDT', 'long', false)], 'BTC/USDT', 'long').veto, true, 'manuelles comptées');
  assert.strictEqual(run([P('ETH/USDT', 'LONG'), P('SOL/USDT', 'buy')], 'BTC/USDT', 'long').veto, true);
  assert.strictEqual(run([P('ETH/USDT', 'Short'), P('SOL/USDT', 'SHORT')], 'BTC/USDT', 'short').veto, true);
  assert.strictEqual(run([null, {}, P('ETH/USDT', 'long')], 'BTC/USDT', 'long').veto, false, 'null / sans paire ignorés');
});
T('S1 · 09c : le plafond est appliqué dans l\'entonnoir JUSTE APRÈS l\'anti-doublon et AVANT le calendrier économique, en EV et RE seulement, et il SORT avant toute ouverture', () => {
  const c = codeStrict(s09c);
  const iCorr = c.indexOf('const _cg = _corrGateForOpen(pair, side);'), iCap = c.indexOf('const _dc = _dirCapForOpen(pair, side);'), iEco = c.indexOf('_ecoGateForOpen(');
  assert.ok(iCorr > 0 && iCap > iCorr && iEco > iCap, 'ordre : anti-doublon → plafond de sens → calendrier');
  const blk = c.slice(iCap - 200, iCap + 1200);
  assert.ok(blk.includes("(S.tradingMode === 'paperReal' || S.tradingMode === 'real') && typeof _dirCapForOpen === 'function'"), 'EV/RE seulement, garde typeof');
  assert.ok(/if \(_dc\.veto\) \{[\s\S]*?return;\s*\}/.test(blk), 'le veto sort de la fonction');
  assert.ok(blk.includes("event: 'DIRCAP'") && blk.includes('Plafond de sens · ${pair} ${_sd} refusé'), 'raison visible (EVAL + journal)');
  assert.ok(c.includes('const _dirCapLogTs = {};') && blk.includes('5 * 60 * 1000'), 'journal limité à une ligne / paire / 5 min');
  assert.ok(codeStrict(s10e).includes('const DIR_CAP_MAX = 2;'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
