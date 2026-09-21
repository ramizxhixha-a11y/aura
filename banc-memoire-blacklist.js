// banc-memoire-blacklist.js — [MÉMOIRE DE LA BLACKLIST · 22/09/2026] VERSION 20260922c
// L'organe « blacklist dynamique » (v7.12 : < 30 % de réussite sur 10+ trades → pause 2 h) existait mais dormait :
// sa fenêtre était effacée à chaque relance (non sauvegardée) et remplie par les trades AA. Il retrouve sa mémoire,
// nourrie par EV/RE seulement. Bloc RÉEL de 02 extrait et rejoué ; épingles sur 09c / 09b1 / 09b2 / 07.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js');
// le bloc streak de closePosition, du commentaire v7.12 à l'écriture finale S._lossStreaks[pos.pair] = streak;
const i0 = s02.indexOf('    // v7.12 MOD 5+ · Track loss streak + fenêtre glissante pour blacklist'), i1 = s02.indexOf('      S._lossStreaks[pos.pair] = streak;', i0);
assert.ok(i0 > 0 && i1 > i0); const BLOCK = s02.slice(i0, i1 + '      S._lossStreaks[pos.pair] = streak;'.length) + '\n    }';   // referme le if (pos.auto === true && mode) ouvert par le bloc
function run(S, pos, realisedPct) {
  const c = { S, pos, realisedPct, Math, Number, Date, isFinite, rndHash: () => 'h', nowStr: () => 't', showToast: () => {}, window: {} };
  vm.createContext(c); vm.runInContext('(function(){' + BLOCK + '})()', c); return S;
}
console.log('▶ banc-memoire-blacklist');
T('D1 · bloc RÉEL : 10 pertes sur 10 en EV → blacklist 2 h et journal 🚫 ; la fenêtre glisse (15) ; la 11e n\'ajoute pas une 2e pause tant que la 1re court', () => {
  const S = { tradingMode: 'paperReal', chainLog: [], _lossStreaks: {} };
  const pos = { pair: 'BTC/USDT', auto: true };
  for (let i = 0; i < 10; i++) run(S, pos, -0.5);
  const st = S._lossStreaks['BTC/USDT'];
  assert.ok(st.blacklistedUntil > Date.now() + 100 * 60000, 'blacklist ≈ 2 h : ' + st.blacklistedUntil);
  assert.strictEqual(st.recentTrades.length, 10); assert.ok(S.chainLog.some(e => e.desc.startsWith('BLACKLIST · BTC/USDT · 0/10 gains (0% WR) · pause 2h')), JSON.stringify(S.chainLog.map(e => e.desc)));
  const until = st.blacklistedUntil; run(S, pos, -0.5);
  assert.strictEqual(S._lossStreaks['BTC/USDT'].blacklistedUntil, until, 'pause en cours : pas de nouvelle pause');
  for (let i = 0; i < 10; i++) run(S, pos, 1); assert.strictEqual(S._lossStreaks['BTC/USDT'].recentTrades.length, 15, 'fenêtre 15');
});
T('D2 · l\'AA ne nourrit PAS la fenêtre (bougies fabriquées) ; une position manuelle non plus', () => {
  const S = { tradingMode: 'sim', chainLog: [], _lossStreaks: {} };
  for (let i = 0; i < 12; i++) run(S, { pair: 'BTC/USDT', auto: true }, -1);
  assert.deepStrictEqual(S._lossStreaks, {}, 'AA : rien');
  const S2 = { tradingMode: 'paperReal', chainLog: [], _lossStreaks: {} };
  for (let i = 0; i < 12; i++) run(S2, { pair: 'BTC/USDT', auto: false }, -1);
  assert.deepStrictEqual(S2._lossStreaks, {}, 'manuelle : rien');
  const S3 = { tradingMode: 'real', chainLog: [], _lossStreaks: {} }; run(S3, { pair: 'BTC/USDT', auto: true }, -1);
  assert.strictEqual(S3._lossStreaks['BTC/USDT'].recentTrades.length, 1, 'RE nourrit');
});
T('S1 · 09c lit la blacklist en EV/RE seulement ; 09b1 sauvegarde _lossStreaks, 09b2 la relit + manifest ; 07 : plus d\'écriture directe de fitness (apprentissage doux retiré)', () => {
  const c9c = codeStrict(rd('js/09c-auto-open.js')), c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js')), c7 = codeStrict(rd('js/07-v90-mode-bunker-sos.js'));
  assert.ok(c9c.includes("const streak = (S.tradingMode !== 'sim') ? S._lossStreaks[pair] : null;"));
  assert.ok(c1.includes('_lossStreaks: S._lossStreaks || {},') && c2.includes('S._lossStreaks      = snap._lossStreaks;') && c2.includes("'_lossStreaks'"));
  const fn = c7.slice(c7.indexOf('function learnFromOpenPositions()'), c7.indexOf('function learnFromOpenPositions()') + 6000);
  assert.strictEqual(fn.includes('a.fitness = Math.min(a.fitness + nudge'), false, 'apprentissage doux retiré');
  assert.strictEqual(fn.includes('if(Math.abs(unrealisedPct) >= 0.5) {'), false, 'la porte n\'a plus rien à garder');
  assert.ok(fn.includes("_trailStopHit(pos, cur)") && fn.includes('Timer anti-zombie'), 'l\'escalier de sortie est intact');
  assert.strictEqual((c7.match(/\ba\.fitness\s*=/g) || []).length, 0, 'aucune écriture directe de fitness dans 07');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
