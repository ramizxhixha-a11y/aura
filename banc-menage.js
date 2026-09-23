// banc-menage.js — [MÉNAGE · 23/09/2026] VERSION 20260923g
// Fossiles retirés : _totalCompounded (double comptage dans les panneaux Miroir / Jumeau), reset EV/RE qui laissait la
// mémoire de la blacklist intacte. Le cashLog EV, annoncé mort dans l'audit du 14/09, est VIVANT (backup 23/09 : 148 entrées,
// dernière 06:30) — non touché.
'use strict';
const fs = require('fs'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const c02 = codeStrict(rd('js/02-state-init.js')), c03 = codeStrict(rd('js/03-per-pair-position-buttons-controls-buid.js')), c07 = codeStrict(rd('js/07-v90-mode-bunker-sos.js'));
console.log('▶ banc-menage');
T('1 · _totalCompounded : plus jamais écrit, plus jamais lu dans un P&L affiché ; le champ reste sauvegardé (manifest)', () => {
  assert.strictEqual(/_totalCompounded\s*=\s*\(/.test(c02), false, 'incrément retiré');
  assert.strictEqual(c03.includes('(S._totalCompounded || 0) +'), false); assert.strictEqual(c07.includes('(S._totalCompounded || 0) +'), false);
  assert.ok(c03.includes('const mainPnl = (S.portfolio && S._startPortfolio ? (S.portfolio - S._startPortfolio) : 0);') && c07.includes('const mainPnl = (S.portfolio && S._startPortfolio ? (S.portfolio - S._startPortfolio) : 0);'), 'P&L de session, le même qu\'à l\'accueil');
  assert.ok(codeStrict(rd('js/09b1-build-snapshot.js')).includes('_totalCompounded: S._totalCompounded || 0,') && c02.includes("'_totalCompounded'"), 'champ conservé dans les sauvegardes');
});
T('2 · reset des portefeuilles : un reset EV ou RE vide aussi S._lossStreaks (la blacklist repart de zéro avec le portefeuille)', () => {
  assert.ok(c07.includes("if (S.walletStore && (w === S.walletStore.paperReal || w === S.walletStore.real)) S._lossStreaks = {};"));
});
T('3 · le cashLog EV est vivant : rien n\'y est touché (profit_split toujours journalisé à chaque trade gagnant)', () => {
  assert.ok(c02.includes("S.cashLog.unshift({ amount:_toCaisse, source:'profit_split', ts:Date.now(), time:nowStr() });"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
