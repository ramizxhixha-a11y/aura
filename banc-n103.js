// banc-n103.js — [GO N° 103 · 15/11/2026] le toast de fermeture (02 closePosition) dit le montant emprunté ARRONDI AU CENT : « ⚡$40 », plus « ⚡$39.99999999999999 ».
// Le VRAI closePosition en vm (harnais de banc-n62.js) ; ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit c730c1b>), sauf la garde F.
//   T1  position XRP ×1,4 ouverte par le VRAI openPosition (100 $ × 0,4 = 39.99999999999999 empruntés) → toast « Fermé XRP/USDT ⚡$40 · … »
//   T2  12,345 $ → « ⚡$12.35 » ; sans emprunt : aucun « ⚡ » ; l'argent (trading, dette) identique au code d'avant au centime près
//   F   garde : banc-fixtures/n103-retours.json redonne le 02 d'avant au caractère près (empreinte du commit c730c1b)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
const html = rd('AURA8_v118.html');
// le monde de banc-n62.js (VRAIES fonctions d'argent de 02, 07, 09j) : on le reprend tel quel, sur la racine du banc
function monde(o, racine) {
  const prev = process.env.BANC_ROOT; if (racine) process.env.BANC_ROOT = racine; else delete process.env.BANC_ROOT;
  try { delete require.cache[require.resolve('./banc-n62.js')]; } catch (e) {}
  const src = fs.readFileSync(path.join(__dirname, 'banc-n62.js'), 'utf8');
  const cut = src.indexOf("console.log('▶ banc-n62");
  const mod = { exports: {} };
  new Function('require', 'module', 'process', '__dirname', src.slice(0, cut).replace("'use strict';", '') + '\nmodule.exports = { world, poser, posOf };')(require, mod, process, __dirname);
  if (prev === undefined) delete process.env.BANC_ROOT; else process.env.BANC_ROOT = prev;
  return mod.exports;
}
console.log('▶ banc-n103 · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));
const M = monde(null, process.env.BANC_ROOT);

T('T1 · XRP ×1,4 ouverte par le VRAI openPosition (39.99999999999999 $ empruntés) → toast « Fermé XRP/USDT ⚡$40 · … » (avant : « ⚡$39.99999999999999 »)', () => {
  const W = M.world({ trading: 2000, leverage: 1 }); W.S.leverageBorrowed = 1000; W.S._autoLevBorrowed = 1000; W.run('syncLeverageReserve()');
  const ps = W.S.pairStates['XRP/USDT']; ps.stake = 100; ps.pairLeverage = 1.4;
  const p = W.run("openPosition('XRP/USDT', 'long')"); assert.ok(p, JSON.stringify(W.seen.toasts));
  assert.strictEqual(p.levBorrowed, 100 * (1.4 - 1), 'le nombre brut est bien 39.99999999999999');
  W.seen.toasts.length = 0; W.run("closePosition('" + p.id + "')");
  const t = W.seen.toasts.find(x => /^Fermé XRP\/USDT/.test(x[0])); assert.ok(t, JSON.stringify(W.seen.toasts));
  assert.ok(/^Fermé XRP\/USDT ⚡\$40 · /.test(t[0]), t[0]);
});

T('T2 · 12,345 $ → « ⚡$12.35 » ; sans emprunt, aucun « ⚡ » ; l\'argent identique au code d\'avant (même fermeture, avant / après)', () => {
  const cas = (lb, racine) => { const MM = racine === undefined ? M : monde(null, racine);
    const W = MM.world({ trading: 500 }); const p = MM.poser(W, MM.posOf({ stakeUsdt: 50, totalExposure: 50 + lb })); W.S.pairStates['BTC/USDT'].price = 101.7; W.run('syncLeverageReserve()');
    W.run("closePosition('pA')"); return { t: W.seen.toasts.map(x => x[0]).find(x => /^Fermé/.test(x)), argent: [W.S.tradingAccount, W.S.leverageBorrowed, W.S.cashAccount, W.S.leverageReserve] }; };
  assert.ok(/^Fermé BTC\/USDT ⚡\$12\.35 · /.test(cas(12.345).t), cas(12.345).t);
  assert.ok(/^Fermé BTC\/USDT · /.test(cas(0).t), cas(0).t);
  if (!process.env.BANC_ROOT) {   // le code d'avant (sans-n103) : mêmes nombres d'argent
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'n103-')); fs.mkdirSync(path.join(dir, 'js'));
    fs.readdirSync(path.join(__dirname, 'js')).forEach(f => { const s = fs.readFileSync(path.join(__dirname, 'js', f), 'utf8'); fs.writeFileSync(path.join(dir, 'js', f), require('./banc-fixtures/sans-n103.js')(s, 'js/' + f)); });
    fs.copyFileSync(path.join(__dirname, 'AURA8_v118.html'), path.join(dir, 'AURA8_v118.html'));
    try { [0, 12.345, 40, 0.004].forEach(lb => assert.deepStrictEqual(cas(lb).argent, cas(lb, dir).argent, 'argent ' + lb)); const t0 = cas(12.345, dir).t; assert.ok(/⚡\$12\.34499999+ · /.test(t0), 'témoin : le code d\'avant écrit le brut : ' + t0); }
    finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

T('F · garde : banc-fixtures/n103-retours.json redonne le 02 d\'avant au caractère près (empreinte du commit c730c1b)', () => {
  if (process.env.BANC_ROOT) return;
  const f = 'js/02-state-init.js', s = rd(f);
  assert.notStrictEqual(h16(s), '5b82fc4d014f1cb4', 'la retouche manque');
  assert.strictEqual(h16(require('./banc-fixtures/sans-n103.js')(s, f)), '5b82fc4d014f1cb4', 'autre chose a bougé dans 02');
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
