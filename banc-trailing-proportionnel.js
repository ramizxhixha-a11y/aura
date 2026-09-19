// banc-trailing-proportionnel.js — [TRAILING PROPORTIONNEL · 19/09/2026] VERSION 20260919b
// Le trailing stop devient proportionnel à l'objectif de la position (TP ATR, bras A/B) au lieu d'un seuil fixe
// (+1 % de pic, 0,5 point rendu) qui plafonnait les gagnants vers +0,5 à +1 % — backup 19/09 : 56 % de trades
// gagnants pour un P&L de −8,37 $. Fonction RÉELLE _trailStopHit extraite de 07.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s07 = rd('js/07-v90-mode-bunker-sos.js');
const SRC = (() => { const i = s07.indexOf('function _trailStopHit(pos, cur) {'); const j = s07.indexOf('\n}\n', i); assert.ok(i > 0 && j > i); return s07.slice(i, j + 2); })();
const c = { Math, Number, isFinite, window: {} }; vm.createContext(c); vm.runInContext(SRC, c);
const hit = (pos, px) => { c.p = pos; c.x = px; const r = vm.runInContext('_trailStopHit(p, x)', c); return r ? JSON.parse(JSON.stringify(r)) : r; };
// long entrée 100, TP 102 (objectif +2 %) : 60 % du chemin = 101,2
const L = () => ({ pair: 'X/USDT', side: 'long', entryPrice: 100, tp: 102, sl: 98, auto: true });
console.log('▶ banc-trailing-proportionnel');
T('D1 · sous 60 % du chemin, AUCUN trailing : le cas AVAX du backup (pic +1,25 % sur un objectif +2 %) ne ferme plus, même en retombant à zéro', () => {
  const p = L();
  const q = L();
  assert.strictEqual(hit(q, 101.0), null);          // 50 % du chemin
  assert.strictEqual(hit(q, 100.6), null);          // retombe à 30 % : l'ancienne règle aurait fermé si le pic ≥ 1 %
  assert.strictEqual(hit(q, 100.0), null, 'jamais armé → la position va au TP ou au SL');
  assert.ok(Math.abs(q._peakProg - 0.5) < 1e-9, 'pic 50 % : ' + q._peakProg);
});
T('D2 · armé à 60 % du chemin : ferme au plus serré des deux (40 % du gain rendu, ou un quart de la distance)', () => {
  const p = L();
  assert.strictEqual(hit(p, 101.6), null);                         // pic 80 % du chemin, pas de repli
  assert.ok(Math.abs(p._peakProg - 0.8) < 1e-9, 'pic 80 % : ' + p._peakProg);
  // seuil = max(0,6 × 0,8 ; 0,8 − 0,25) = 0,55 → 101,10
  assert.strictEqual(hit(p, 101.2), null, 'au-dessus du seuil : on tient');
  const r = hit(p, 101.10);
  assert.ok(r && Math.abs(r.pct - 1.1) < 1e-9, JSON.stringify(r));
  assert.ok(r.why.includes('pic 80 % du chemin') && r.why.includes('+1.10 %'), r.why);
  // pic juste au-dessus de l'armement : seuil = max(0,36 ; 0,35) = 0,36 → 100,72
  const q = L(); assert.strictEqual(hit(q, 101.2), null);
  assert.strictEqual(hit(q, 100.8), null, 'au-dessus de 0,36 du chemin');
  assert.ok(hit(q, 100.7), 'sous le seuil : fermeture');
});
T('D3 · short symétrique : entrée 100, TP 98 — armé à 98,8, seuil identique en miroir', () => {
  const p = { pair: 'X/USDT', side: 'short', entryPrice: 100, tp: 98, auto: true };
  assert.strictEqual(hit(p, 99.2), null);           // 40 % du chemin
  assert.strictEqual(hit(p, 98.4), null);           // pic 80 %
  assert.ok(Math.abs(p._peakProg - 0.8) < 1e-9, 'pic 80 % : ' + p._peakProg);
  assert.strictEqual(hit(p, 98.8), null, 'seuil 0,55 → 98,90 ; 98,8 est au-dessus');
  const r = hit(p, 98.90);
  assert.ok(r && Math.abs(r.pct - 1.1) < 1e-9, JSON.stringify(r));
});
T('D4 · sans niveau TP (position manuelle sans objectif) : règle v7.12 EXACTEMENT — pic ≥ +1 %, 0,5 point rendu', () => {
  const p = { pair: 'X/USDT', side: 'long', entryPrice: 100, tp: null, auto: false };
  assert.strictEqual(hit(p, 100.9), null, 'pic < 1 %');
  assert.strictEqual(hit(p, 100.45), null, 'pic 0,9 % : jamais armé');
  assert.strictEqual(hit(p, 101.5), null);
  assert.strictEqual(hit(p, 101.1), null, '0,4 point rendu');
  const r = hit(p, 101.0);
  assert.ok(r && Math.abs(r.pct - 1.0) < 1e-9 && r.why.includes('pic +1.50 %'), JSON.stringify(r));
  const q = { pair: 'X/USDT', side: 'short', entryPrice: 100, tp: 0 };   // tp 0 = pas de niveau
  assert.strictEqual(hit(q, 98.5), null); assert.ok(hit(q, 99.0), 'short sans niveau : v7.12');
});
T('D5 · entrées douteuses : rien ne casse, rien ne ferme (prix nul, entrée nulle, position absente, TP = entrée)', () => {
  assert.strictEqual(hit(null, 100), null);
  assert.strictEqual(hit({ side: 'long', entryPrice: 0, tp: 2 }, 1), null);
  assert.strictEqual(hit(L(), 0), null);
  assert.strictEqual(hit(L(), NaN), null);
  const p = { side: 'long', entryPrice: 100, tp: 100 };   // distance nulle → repli v7.12
  assert.strictEqual(hit(p, 101.5), null); assert.ok(hit(p, 101.0));
});
T('S1 · 07 : l\'ancienne règle en dur a disparu du bloc de sortie, le trailing passe par _trailStopHit, les autres stratégies (anti-zombie, consensus, TP manuel) sont intactes', () => {
  const c07 = codeStrict(s07);
  assert.strictEqual(c07.includes('const trailingDrop = pos._peakPct - _cExitPct;'), false, 'règle fixe retirée');
  assert.ok(c07.includes('const _trail = (typeof _trailStopHit === \'function\') ? _trailStopHit(pos, cur) : null;'));
  assert.strictEqual((c07.match(/\?\s*_trailStopHit\(pos, cur\)/g) || []).length, 1, 'un seul point d\'appel');
  assert.ok(c07.includes('Timer anti-zombie') && c07.includes('Consensus switch') && c07.includes('TP atteint'), 'B/C/D conservées');
  assert.ok(c07.includes('closePosition(pos.id, pos.auto === true);'), 'fermeture inchangée (auto/manuel)');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
