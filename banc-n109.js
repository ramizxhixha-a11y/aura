// banc-n109.js — [GO N° 109 · 20/11/2026] VERSION 20261120a · la note T$ (fitness) ne dépasse 350 que si l'avantage est PROUVÉ (registre n° 109, remède R2)
// Défaut (registre, G2) : la note d'un siège = 350 + 1 000 × E brut, sur 20 jugements (< 1 h de marché) — Futures·Levier 736, Stat·OBV 706, Scalper 638
// sans aucune preuve (backup du pont 20/11 21:28). Porte rejeu/porte_n109.py (règles figées avant les données, sha-256 f17df082…) : R1 (fenêtre armée
// seulement si prouvée) N'ENTRE PAS ; R2 ENTRE — sur 24 mois d'archives la note brute prédit la voix qui aura raison le lendemain (Spearman +0,104,
// z 7,4) et la note prouvée le garde (+0,099, z 7,1 ; écart z 1,6 < 3,2).
// Remède (03) : _fitProven(sw, se, sw2, n) — E ≤ 0 inchangé ; sinon effectif de Kish, borne basse de Wilson à 95 % (comme _botStakeMult) : > 0,5 →
// 2·borne − 1, sinon 0 ; _fitOf l'applique ; _vjE(id, W, prouve) l'applique par horizon quand prouve (lu par _fitHz seulement).
// Ce qui NE change PAS (gardé ici) : le poids d'une voix dans la décision commune (_dcMeritHz, _dcMerit), la mise des bots (_botStakeMult), la règle de
// fenêtre (10i), l'échelle (_fitScale).
// Les fonctions RÉELLES de 03 tournent en vm ; les attentes viennent de banc-fixtures/note-prouvee-ref.js (écrite d'après la règle, sans lire 03).
// Témoin : le 03 d'avant (banc-fixtures/sans-n109.js) — `node banc-n109.js --temoin` : N1 à N5 doivent y échouer.
// Usage : node banc-n109.js [--temoin | <03 à tester>]   (argument : mutations, rejeu/mutations_n109.py)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F03 = 'js/03-per-pair-position-buttons-controls-buid.js';
const REF = require('./banc-fixtures/note-prouvee-ref.js'), sansN109 = require('./banc-fixtures/sans-n109.js');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const LIVRE = rd(F03), AVANT = sansN109(LIVRE, F03);
const ARG = process.argv[2], TEMOIN = ARG === '--temoin';
const SRC = TEMOIN ? AVANT : (ARG ? fs.readFileSync(ARG, 'utf8') : LIVRE);
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 50)); return s.slice(i, j); };
const fnAt = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0 && s.indexOf(a, i + 1) < 0, 'fonction : ' + a); return s.slice(i, s.indexOf('\n}\n', i) + 3); };
const HZ = [1, 2, 4, 8, 16];
function mk(src, S0) {
  const S = Object.assign({ tradingMode: 'paperReal', paperRealTimeframe: '15m', chainLog: [], agents: [], _realJudgments: 0 }, S0 || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, Date: { now: () => 1e12 } };
  vm.createContext(c);
  vm.runInContext(between(src, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;') + '\n' + between(src, "const _DC_BOTS = ['scalper_bot_v1', 'arb_bot_v1', 'dca_bot_v1'];", 'window._thNote = _thNote;'), c);
  vm.runInContext('_thState()', c);
  return c;
}
// graine fixe
let seed = 109; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const js = (n, pOk, wf) => Array.from({ length: n }, (_, i) => ({ s: rnd() < pOk ? 1 : -1, w: wf ? wf(i) : 0.2 + rnd(), k: i + 1 }));
const rec = (n, pOk) => HZ.map(() => { const L = []; for (let i = 0; i < n; i++) { const v = Math.round((rnd() < 0.5 ? -1 : 1) * (100 + 900 * rnd())); const D = Math.round((rnd() < pOk ? 1 : -1) * Math.sign(v) * (5 + 500 * rnd())); L.push(v, D); } return L; });
console.log('▶ banc-n109' + (TEMOIN ? ' · TÉMOIN (03 d\'avant)' : ARG ? ' · ' + ARG : ''));

T('N1 · _fitProven RÉEL = la référence (règle R2) sur 3 000 cas tirés : E ≤ 0 rendu tel quel, avantage non prouvé → 0, prouvé → 2·borne − 1 ; Σ w² nul → effectif de repli', () => {
  const c = mk(SRC); assert.strictEqual(typeof c._fitProven, 'function', '_fitProven absent');
  let nz = 0, np = 0, nn = 0;
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(rnd() * 240), sw = rnd() * 50, E = rnd() * 2 - 1, se = E * sw, sw2 = sw * sw / (1 + rnd() * (n - 1));
    const a = c._fitProven(sw, se, sw2, n), b = REF.E(sw, se, sw2, n);
    assert.ok(Math.abs(a - b) < 1e-12, JSON.stringify({ sw, se, sw2, n, a, b }));
    if (E <= 0) nn++; else if (b === 0) nz++; else np++;
  }
  assert.ok(nn > 1000 && nz > 100 && np > 100, 'les trois branches vues : ' + [nn, nz, np]);
  assert.strictEqual(c._fitProven(0, 0, 0, 7), 0, 'aucun poids : 0'); assert.strictEqual(c._fitProven(5, 5, 0, 30), REF.E(5, 5, 0, 30), 'Σ w² nul : effectif = n');
  assert.strictEqual(c._fitProven(4, -2, 4, 4), -0.5, 'négatif : inchangé');
  assert.strictEqual(c._fitProven(5, 5, 0, 0), 0, 'aucun effectif : 0 (rien de prouvé)');
});
T('N2 · _fitOf RÉEL (la note à la bougie, bots et sièges sans record) : 20 justes sur 20 → note prouvée (≈ 1 028, brute 1 350) ; 80 % sur 60 → ≈ 714 ; 4 sur 5 → 350 (brute 950) ; un seul gros juste parmi des petites erreurs (Kish ≈ 1) → 350 ; les notes ≤ 350 inchangées (négatif, pile-ou-face, plancher 50)', () => {
  const c = mk(SRC);
  const all20 = js(20, 1, () => 1); assert.strictEqual(c._fitOf(all20, 60), REF.deJugements(all20, 60)); assert.ok(c._fitOf(all20, 60) > 1000 && c._fitOf(all20, 60) < 1100, '20/20 : ' + c._fitOf(all20, 60));
  const p80 = Array.from({ length: 60 }, (_, i) => ({ s: i % 5 === 0 ? -1 : 1, w: 1, k: i + 1 })); assert.strictEqual(c._fitOf(p80, 60), 714);
  const f45 = [1, 1, -1, 1, 1].map((s, i) => ({ s, w: 1, k: i + 1 })); assert.strictEqual(c._fitOf(f45, 60), 350, '4 sur 5 : pas prouvé');
  const kish = [{ s: 1, w: 10, k: 1 }].concat(Array.from({ length: 8 }, (_, i) => ({ s: -1, w: 0.1, k: i + 2 }))); assert.strictEqual(c._fitOf(kish, 60), 350, 'E = 0,85 mais effectif ≈ 1,07 : pas prouvé');
  const neg = Array.from({ length: 40 }, (_, i) => ({ s: i % 3 === 0 ? 1 : -1, w: 0.5 + (i % 4) * 0.2, k: i + 1 })); let sw = 0, se = 0; neg.forEach(j => { sw += j.w; se += j.s * j.w; });
  assert.ok(se < 0); assert.strictEqual(c._fitOf(neg, 60), Math.max(50, Math.min(2000, Math.round(350 + 1000 * se / sw))), 'négatif : la note brute');
  assert.strictEqual(c._fitOf(Array.from({ length: 30 }, (_, i) => ({ s: -1, w: 1, k: i })), 60), 50, 'toujours faux : 50');
  assert.strictEqual(c._fitOf(js(4, 1), 60), null, 'moins de 5 : pas de note');
  for (let i = 0; i < 300; i++) { const L = js(5 + Math.floor(rnd() * 235), rnd()), W = [20, 40, 60, 100, 160, 240][i % 6]; assert.strictEqual(c._fitOf(L, W), REF.deJugements(L, W)); }
});
T('N3 · la note aux horizons (_fitHz RÉEL) est prouvée par horizon ; _vjE brut (sans « prouve ») inchangé et _dcMeritHz (poids de la voix dans la décision commune) IDENTIQUE au code d\'avant sur 400 records tirés', () => {
  const c = mk(SRC), old = mk(AVANT);
  for (let i = 0; i < 400; i++) {
    const r = rec(5 + Math.floor(rnd() * 60), rnd()), W = [20, 40, 60, 100, 160, 240][i % 6];
    c.S.dcThreshold.vHz = { a: r }; old.S.dcThreshold.vHz = { a: r }; c.S.fitWindowRule = old.S.fitWindowRule = { armed: true, window: W };
    assert.strictEqual(c._dcMeritHz('a'), old._dcMeritHz('a'), 'poids de la voix inchangé');
    assert.strictEqual(c._vjE('a', W), old._vjE('a', W), '_vjE brut inchangé');
    assert.strictEqual(c._fitHz({ id: 'a' }), REF.deRecord(r, W), 'note prouvée aux horizons');
  }
  c.S.dcThreshold.vHz = { a: HZ.map(() => Array.from({ length: 12 }, (_, j) => j % 2 ? 100 : 500)) }; c.S.fitWindowRule = { armed: true, window: 20 };
  assert.strictEqual(c._fitHz({ id: 'a' }), REF.deRecord(c.S.dcThreshold.vHz.a, 20)); assert.ok(c._fitHz({ id: 'a' }) < 1350, '6 justes par horizon : sous la note brute');
  assert.ok(Math.abs(c._dcMeritHz('a') - 1) < 1e-12, 'poids de la voix : toujours 1 (brut)');
});
T('N4 · la porte unique (_fitJudge, _fitRecomputeAll, _fitCurrent) écrit la note prouvée : siège au record complet (horizons), siège sans record et bot (fenêtre à la bougie) ; un siège à 736 sans preuve retombe à 350 au recalcul', () => {
  const c = mk(SRC, { agents: [] }); c.S.fitWindowRule = { armed: true, window: 20 };
  const seat = { id: 's1', fitness: 736, _judgments: js(20, 0.6) }, bot = { id: 'scalper_bot_v1', isBot: true, fitness: 638, _judgments: js(240, 0.62) }, nr = { id: 's2', fitness: 706, _judgments: js(7, 0.8, () => 1) };
  c.S.agents.push(seat, bot, nr); c.S.dcThreshold.vHz = { s1: rec(30, 0.55) };
  c._fitRecomputeAll();
  assert.strictEqual(seat.fitness, REF.deRecord(c.S.dcThreshold.vHz.s1, 20), 'siège : record aux horizons, prouvé');
  assert.strictEqual(bot.fitness, REF.deJugements(bot._judgments, 20), 'bot : ses actes, prouvés');
  assert.strictEqual(nr.fitness, REF.deJugements(nr._judgments, 20), 'siège sans record : la bougie, prouvée');
  c.S._realJudgments = 999; c.a = seat; const f = c._fitJudge(seat, 1, 1); assert.strictEqual(f, REF.deRecord(c.S.dcThreshold.vHz.s1, 20), 'un jugement à la bougie ne change pas la note aux horizons');
  const flat = { id: 's3', fitness: 736, _judgments: Array.from({ length: 20 }, (_, i) => ({ s: i % 2 ? 1 : -1, w: 1, k: i })).concat([{ s: 1, w: 1, k: 21 }]) }; c.S.agents.push(flat); c._fitRecomputeAll({ s3: 1 });
  assert.strictEqual(flat.fitness, 350, '11 justes sur 21 (fenêtre 20 : 11 sur 20) : rien de prouvé → 350');
});
T('N5 · cas réels du 20/11 21:28 (porte, M0 b′) reproduits en forme : 7 jugements à 80 % (Stat·OBV, 706) → sous 706 ; Scalper 240 actes à 62 % sur une fenêtre de 20 → 350 ; un siège négatif garde sa note brute', () => {
  const c = mk(SRC);
  const obv = [1, 1, 1, 1, 1, -1, 1].map((s, i) => ({ s, w: 1, k: i + 1 })); assert.strictEqual(c._fitOf(obv, 20), REF.deJugements(obv, 20)); assert.ok(c._fitOf(obv, 20) < 706 && c._fitOf(obv, 20) >= 350);
  const sc = Array.from({ length: 240 }, (_, i) => ({ s: (i * 7) % 13 < 8 ? 1 : -1, w: 1, k: i + 1 })); assert.strictEqual(c._fitOf(sc, 20), 350, '62 % sur 20 : pas prouvé');
  assert.ok(c._fitOf(sc, 240) >= 350, 'sur 240 : ' + c._fitOf(sc, 240));
});
T('N6 · ce qui ne change pas : _botStakeMult, _dcMerit, _dcMeritHz, _fitScale, _fitWindow au texte d\'avant ; 10i (règle de fenêtre, R1 n\'entre pas) intact ; un seul appel « prouvé » (_fitHz) ; _fitProven exporté', () => {
  ['function _botStakeMult(botId) {', 'function _dcMerit(v) {', 'function _dcMeritHz(id) {', 'function _fitWindow() {', 'function _fitRecomputeAll(only) {', 'function _fitJudge(a, sign, w) {', 'function _fitCurrent(a) {']
    .forEach(a => assert.strictEqual(fnAt(SRC, a), fnAt(AVANT, a), a + ' a changé'));
  assert.ok(SRC.includes('function _fitScale(E) { return Math.max(50, Math.min(2000, Math.round(350 + 1000 * E))); }\n'), '_fitScale a changé');
  assert.strictEqual(h16(rd('js/10i-intel-bus.js')), 'ebfb044cd180d4b0', '10i a changé');
  const code = SRC.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  assert.strictEqual((code.match(/_vjE\(.*, true\)/g) || []).length, 1, 'un seul lecteur prouvé');
  assert.ok(/function _fitHz\(a\) \{[\s\S]*?_vjE\(a\.id, [^\n]*, true\)/.test(code), '_fitHz lit _vjE prouvé');
  assert.ok(/function _dcMeritHz\(id\) \{[\s\S]*?const e = _vjE\(id, \(typeof _fitWindow === 'function'\) \? _fitWindow\(\) : 60\);/.test(code), '_dcMeritHz lit _vjE brut');
  assert.ok(code.includes('window._fitProven = _fitProven;'));
});
T('N7 · garde : banc-fixtures/n109-retours.json redonne 03 du commit e84e8ae au caractère près ; la retouche est là ; rien d\'autre n\'a bougé dans 03', () => {
  assert.notStrictEqual(h16(LIVRE), 'edeb1cf93142e44b', 'la retouche manque');
  assert.strictEqual(h16(AVANT), 'edeb1cf93142e44b', '03 : autre chose a bougé');
});
console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(TEMOIN ? 0 : (fail ? 1 : 0));
