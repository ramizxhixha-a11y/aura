// banc-seuil-appris.js — [SEUIL APPRIS · 27/09/2026] VERSION 20260927h · [HORIZONS APPRIS · 27/09/2026] VERSION 20260927i · [SENS CONTRAIRE · 27/09/2026] VERSION 20260927j
// Rams (27/09 14:46, « Go ») : le seuil d'ouverture appris — hors du marché tant qu'aucun niveau de consensus ne paie les frais, rouvert dès
// qu'un niveau prouve ; il apprend sans trader. (27/09 16:54, « Go ») : juger les trades virtuels à 1 h, 2 h, 4 h ; si un horizon plus long
// paie, les sorties apprennent à tenir jusque-là. (27/09 19:31, « Go ») : juger aussi le sens contraire de chaque décision, sans trader, sur
// les seules données à venir. Les attentes du sens décidé (M1-M11, S1-S3) sont celles d'avant, inchangées ; preuve ponctuelle (rejeu différentiel
// contre 20260927i, 150 scénarios) dans la passation.
// Fonctions RÉELLES de 03 en vm (moteur) ; _botExitSweep RÉEL de 10f en vm ; portes de 10f EXÉCUTÉES sur le texte livré ; textes de 07,
// 09b1, 09b2 ; panneau RÉEL de 11b. Rejeu de l'app entière et simulation des faux positifs : dans la passation.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 50)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s10f = rd('js/10f-resolveur-cycle.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'),
  s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
const TH = between(s03, 'var TH_MIN_N = 30,', 'window._thNote = _thNote;', false);
const Q = 900000, HZ = [1, 2, 4, 8, 16];   // bougie 15 min
function mk(o) {
  o = o || {};
  const S = Object.assign({ tradingMode: 'paperReal', paperRealTimeframe: '15m', chainLog: [], realPairCycle: {}, realCandles: {} }, o.S || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, Date: { now: () => c.__now }, __now: o.now || 0, __px: {}, __age: {},
    _ownStakeCostPct: () => (o.cost === undefined ? 0.275 : o.cost), nowStr: () => '12:00:00' };
  c._rcLastPrice = p => c.__px[p] || 0; c._rcPriceAge = p => (c.__age[p] === undefined ? 0 : c.__age[p]);   // 02 : dernier prix réel accepté et son âge
  vm.createContext(c); vm.runInContext(TH, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
// k trades virtuels {c, n, b} : niveau c, net n (ou fonction de i), créneau b = b0 + step × (i % blocks)
const obs = (k, c, net, blocks, b0, step) => Array.from({ length: k }, (_, i) => ({ c, n: typeof net === 'function' ? net(i) : net, b: (b0 || 0) + (step || 1) * (i % blocks) }));
function refSe(a) {   // erreur type à la main : r_b = S_b − n_b·moyenne ; V = max(Σ r_b², Σ r_b² + 2 Σ r_b·r_b+1) ; √(V / n² × B / (B − 1))
  const n = a.length, m = a.reduce((s, o) => s + o.n, 0) / n, g = {};
  a.forEach(o => { g[o.b] = g[o.b] || { s: 0, k: 0 }; g[o.b].s += o.n; g[o.b].k++; });
  const r = {}; Object.keys(g).forEach(b => { r[b] = g[b].s - g[b].k * m; });
  const v0 = Object.values(r).reduce((s, x) => s + x * x, 0), c1 = Object.keys(r).reduce((s, b) => s + (r[Number(b) + 1] !== undefined ? r[b] * r[Number(b) + 1] : 0), 0);
  const B = Object.keys(g).length; return Math.sqrt(Math.max(v0, v0 + 2 * c1) / (n * n) * (B / (B - 1)));
}
console.log('▶ banc-seuil-appris');

T('M1 · preuve : Student (créneaux − 1 degrés de liberté) au niveau de 2 erreurs types partagé entre 25 essais (5 horizons × 5 niveaux) ; ≥ 20 créneaux ; valeurs de table', () => {
  const t = mk();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t.run('TH_HZ'))), HZ); assert.strictEqual(t.run('TH_MIN_B'), 20); assert.strictEqual(t.run('TH_MIN_N'), 30);
  assert.ok(Math.abs(t.run('TH_ALPHA') - 0.0227501319481792 / 25) < 1e-15); assert.deepStrictEqual(JSON.parse(JSON.stringify(t.run('TH_TOP'))), [1, 0.5, 0.25, 0.1, 0.05]);
  assert.ok(Math.abs(t.c._thNormInv(0.975) - 1.959964) < 1e-5 && Math.abs(t.c._thNormInv(0.0227501319481792) + 2) < 1e-6);
  for (const [p, v, e] of [[0.975, 9, 2.2622], [0.995, 9, 3.2498], [0.975, 19, 2.0930], [0.995, 19, 2.8609], [0.999, 19, 3.5794], [0.995, 29, 2.7564]]) assert.ok(Math.abs(t.c._thTInv(p, v) - e) / e < 0.001, p + ' ' + v);
  assert.ok(Math.abs(t.c._thCrit(20) - 3.621) < 0.002 && Math.abs(t.c._thCrit(60) - 3.266) < 0.002, 'valeur critique à 20 et 60 créneaux');
});

T('M2 · _thEval : rien → fermé ; tous perdants → fermé (le plus proche montré) ; gagnant prouvé → ouvert à CE niveau ; < 30 trades ou < 20 créneaux → pas jugé', () => {
  const t = mk();
  let r = t.c._thEval([]); assert.strictEqual(r.open, false); assert.strictEqual(r.n, 0); assert.strictEqual(r.near, null);
  r = t.c._thEval(obs(60, 0.3, i => -0.3 + (i % 3) * 0.01, 20)); assert.strictEqual(r.open, false);
  assert.ok(r.near && Math.abs(r.near.mean + 0.29) < 1e-9 && r.near.n === 60 && r.near.blocks === 20 && r.near.crit > 2.8, JSON.stringify(r.near));
  r = t.c._thEval(obs(40, 0.5, i => 0.4 + (i % 2 ? 0.1 : -0.1), 20).concat(obs(100, 0.1, -0.3, 25)));
  assert.strictEqual(r.open, true); assert.strictEqual(r.level, 0.5); assert.ok(Math.abs(r.best.mean - 0.4) < 1e-9 && r.best.n === 40 && r.best.blocks === 20);
  assert.strictEqual(t.c._thEval(obs(29, 0.6, 0.5, 20)).open, false, '29 trades');
  assert.strictEqual(t.c._thEval(obs(60, 0.6, i => 0.5 + (i % 2 ? 0.05 : -0.05), 19)).open, false, '19 créneaux');
  assert.strictEqual(t.c._thEval(obs(60, 0.6, i => 0.5 + (i % 2 ? 0.05 : -0.05), 20)).open, true, '20 créneaux');
  // 5 niveaux seulement (tout, moitié, quart, dixième, vingtième les plus forts) : 200 décisions de 0,000 à 0,995 — un niveau « 0,35 » gagnant
  // ne peut pas être isolé, seuls 0,90 / 0,75 / 0,50 / 0 sont jugés
  const lv = Array.from({ length: 200 }, (_, i) => ({ c: Math.round((199 - i) * 5) / 1000, n: ((199 - i) * 5 >= 350 && (199 - i) * 5 < 500) ? 2 : -0.5, b: i % 25 }));
  const r5 = t.c._thEval(lv);
  assert.strictEqual(r5.open, false, 'la bande 0,35-0,50 seule gagnerait, mais aucun des 5 niveaux ne la contient seule');
});

T('M3 · erreur type PAR CRÉNEAU (des paires qui bougent ensemble ne sont pas des preuves indépendantes) et recouvrement d\'un créneau sur le suivant — même calcul qu\'à la main', () => {
  const t = mk();
  const cl = []; for (let b = 0; b < 20; b++) for (let j = 0; j < 5; j++) cl.push({ c: 0.4, n: b < 11 ? 1 : -1, b: 2 * b });   // 20 créneaux non voisins
  const r = t.c._thEval(cl); const naive = Math.sqrt(cl.reduce((s, o) => s + (o.n - 0.1) ** 2, 0) / (cl.length - 1)) / Math.sqrt(cl.length);
  assert.ok(Math.abs(naive - 0.1) < 0.002, 'tirages indépendants : 0,10'); assert.ok(Math.abs(r.near.se - refSe(cl)) < 1e-12 && Math.abs(r.near.se - 0.2283) < 0.001, 'par créneau : ' + r.near.se);
  const a = []; for (let i = 0; i < 12; i++) for (const b of [2 * i, 2 * i + 1]) for (let j = 0; j < 3; j++) a.push({ c: 0.3, n: i < 7 ? 0.9 : -0.6, b });   // couples voisins semblables
  const spaced = a.map(o => ({ c: o.c, n: o.n, b: 3 * o.b }));
  assert.ok(Math.abs(t.c._thEval(a).near.se - refSe(a)) < 1e-12); assert.ok(t.c._thEval(a).near.se > t.c._thEval(spaced).near.se * 1.4, 'voisins semblables : erreur plus grande');
  const alt = []; for (let b = 0; b < 20; b++) for (let j = 0; j < 3; j++) alt.push({ c: 0.3, n: b % 2 ? 0.9 : -0.3, b });   // voisins opposés
  assert.ok(Math.abs(t.c._thEval(alt).near.se - t.c._thEval(alt.map(o => ({ c: o.c, n: o.n, b: 3 * o.b }))).near.se) < 1e-12, 'jamais moins que sans recouvrement');
  const flip = []; for (let i = 0; i < 16; i++) for (const b of [2 * i, 2 * i + 1]) for (let j = 0; j < 2; j++) flip.push({ c: 0.5, n: i < 12 ? 0.6 : -0.4, b });
  assert.strictEqual(t.c._thEval(flip.map(o => ({ c: o.c, n: o.n, b: 3 * o.b }))).open, true, 'sans recouvrement : prouvé');
  assert.strictEqual(t.c._thEval(flip).open, false, 'avec recouvrement : pas prouvé');
});

T('M4 · parmi les niveaux prouvés : celui qui aurait rapporté le PLUS au total ; ex æquo jugés ensemble', () => {
  const t = mk();
  const hi = obs(40, 0.6, i => 0.5 + (i % 2 ? 0.05 : -0.05), 20);
  assert.strictEqual(t.c._thEval(hi.concat(obs(60, 0.4, i => 0.1 + (i % 2 ? 0.05 : -0.05), 20))).level, 0.4);
  assert.strictEqual(t.c._thEval(hi.concat(obs(60, 0.4, i => -0.2 + (i % 2 ? 0.05 : -0.05), 20))).level, 0.6);
  assert.strictEqual(t.c._thEval(obs(20, 0.5, 0.6, 10).concat(obs(20, 0.5, -0.9, 10, 10))).open, false);
});

T('M5 · trade virtuel à 5 horizons : entrée au dernier prix réel, sortie à la clôture de la bougie qui contient « note + h bougies », chaque horizon jugé dès que SA bougie est close ; forme compacte quand tout est tranché', () => {
  const k = 100 * Q, tn = k + Q + 30000;
  const ser = [{ ts: k - Q, o: 99, h: 99, l: 99, c: 99 }, { ts: k, o: 100, h: 100, l: 100, c: 100 }, { ts: k + Q, o: 100, h: 100.3, l: 100, c: 100.3 }];
  const t = mk({ now: tn, S: { realPairCycle: { 'SOL/USDT': k }, realCandles: { 'SOL/USDT': { '15m': ser } } } });
  t.c.__px['SOL/USDT'] = 100.2;
  assert.strictEqual(t.c._thNote('SOL/USDT', 0.42, 2.4), true); assert.strictEqual(t.c._thNote('SOL/USDT', 0.42, 2.4), false, 'une fois par bougie');
  const q = t.S.dcThreshold.pend[0];
  assert.deepStrictEqual(JSON.parse(JSON.stringify(q)), { p: 'SOL/USDT', k, t: tn, px: 100.2, d: 1, c: 0.42, f: Q, tf: '15m', cap: 2.4, x: HZ.map(h => k + Q + h * Q), n: [null, null, null, null, null], s: k, s0: k + Q, el: 100, eh: 100.3, hit: 0 });
  // [SENS CONTRAIRE] le même trade dans l'autre sens, dans SA liste ; perte max contraire absente → la même
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t.S.dcThreshold.pendC)), [Object.assign(JSON.parse(JSON.stringify(q)), { d: -1 })]); assert.strictEqual(t.S.dcThreshold.pendC[0].x === q.x, false, 'rien de partagé');
  const add = (i, c, l, h) => ser.push({ ts: k + i * Q, o: c, h: h || c, l: l || c, c });
  add(2, 101); add(3, 102); t.c.__now = k + 3 * Q + 1000;   // k+2Q close (k+3Q en cours)
  assert.strictEqual(t.c._thJudge(), 1); assert.ok(Math.abs(q.n[0] - (Math.round(((101 - 100.2) / 100.2 * 100 - 0.275) * 10000) / 10000)) < 1e-12, '15 min : ' + q.n[0]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(q.n.slice(1))), [null, null, null, null]);
  for (let i = 4; i <= 19; i++) add(i, 102 + (i - 3) * 0.1);
  t.c.__now = k + 19 * Q + 1000; t.c._thJudge();
  assert.strictEqual(t.S.dcThreshold.pend.length, 0, 'tout tranché'); const r = t.S.dcThreshold.rec[0];
  assert.ok(Array.isArray(r) && r.length === 8 && r[0] === 0.42 && r[1] === Math.round(tn / 1000) && r[2] === 15, 'forme compacte [conviction, heure (s), pas (min), 5 nets] : ' + JSON.stringify(r));
  const exp = [101, 102, 102 + 2 * 0.1, 102 + 6 * 0.1, 102 + 14 * 0.1].map(cl => Math.round(((cl - 100.2) / 100.2 * 100 - 0.275) * 10000) / 10000);
  r.slice(3).forEach((v, i) => assert.ok(Math.abs(v - exp[i]) < 1e-12, HZ[i] + ' bougies : ' + v + ' ≠ ' + exp[i]));
  // [SENS CONTRAIRE] le short contraire : mêmes sorties ; sa perte max (2,4 %) touchée par le haut 102,7 (k+10Q) → 4 h à −2,675
  const rC = t.S.dcThreshold.recC[0], expC = [101, 102, 102.2, 102.6].map(cl => Math.round((-1 * ((cl - 100.2) / 100.2 * 100) - 0.275) * 10000) / 10000).concat([-2.675]);
  assert.ok(rC.length === 8 && rC[0] === 420 && rC[1] === Math.round(tn / 1000) - 1700000000 && rC[2] === 15 && t.S.dcThreshold.pendC.length === 0, 'forme compacte en entiers courts [conviction × 1000, heure (s) − 1 700 000 000, pas (min), 5 nets × 10 000] : ' + JSON.stringify(rC));
  rC.slice(3).forEach((v, i) => assert.ok(Number.isInteger(v) && v / 10000 === expC[i], 'contraire ' + HZ[i] + ' bougies : ' + v + ' ≠ ' + expC[i] + ' × 10 000'));
  t.run('_thRule()'); const R15 = t.S.dcThreshold.rules[15]; assert.ok(R15 && Array.isArray(R15.hz) && R15.hz.length === 5, 'un seuil par pas de temps (15 min)');
});

T('M6 · perte max sur le chemin (celle du vrai trade) : touchée → les horizons dont la sortie vient après sortent à −perte max − coût ; les autres sont jugés normalement ; short symétrique', () => {
  const k = 200 * Q, tn = k + Q + 5000;
  const ser = [{ ts: k, o: 50, h: 50, l: 50, c: 50 }, { ts: k + Q, o: 50, h: 50, l: 50, c: 50 }];
  const t = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': ser } } } });
  t.c.__px['ETH/USDT'] = 50;
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.3, 2), true);
  ser.push({ ts: k + 2 * Q, o: 50, h: 50.2, l: 49.8, c: 50.1 }, { ts: k + 3 * Q, o: 50.1, h: 50.1, l: 48.9, c: 49.2 }, { ts: k + 4 * Q, o: 49.2, h: 51, l: 49.2, c: 51 });   // k+3Q : bas −2,2 %
  t.c.__now = k + 4 * Q + 1000; t.c._thJudge();
  const q = t.S.dcThreshold.rec[0].slice(3);
  assert.ok(Math.abs(q[0] - (Math.round(((50.1 - 50) / 50 * 100 - 0.275) * 10000) / 10000)) < 1e-12, '15 min (sortie k+2Q, avant le creux) : ' + q[0]);
  q.slice(1).forEach((v, i) => assert.strictEqual(v, -2.275, HZ[i + 1] + ' bougies : perte max'));
  assert.strictEqual(t.S.dcThreshold.pend.length, 0, 'tout est tranché dès que la perte max est touchée');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t.S.dcThreshold.pendC[0].n)), [-0.475, 1.325, null, null, null], '[SENS CONTRAIRE] le short contraire gagne sur le creux : 15 min et 30 min jugés, sa perte max pas touchée — il attend encore, à part');
  // short : la perte max se lit sur le haut
  const t2 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': [{ ts: k, c: 50, h: 50, l: 50 }, { ts: k + Q, c: 50, h: 50, l: 50 }] } } } });
  t2.c.__px['ETH/USDT'] = 50; t2.c._thNote('ETH/USDT', -0.3, 1.5);
  const s2 = t2.S.realCandles['ETH/USDT']['15m']; s2.push({ ts: k + 2 * Q, o: 50, h: 50.8, l: 49.9, c: 50.7 }, { ts: k + 3 * Q, o: 50.7, h: 50.7, l: 50, c: 50 });   // haut +1,6 % ≥ 1,5
  t2.c.__now = k + 3 * Q + 1000; t2.c._thJudge(); const q2 = t2.S.dcThreshold.rec[0];
  assert.strictEqual(q2[3], -1.775, 'short : perte max 1,5 touchée dans la bougie de sortie même');
  assert.strictEqual(t2.S.dcThreshold.pendC[0].n[0], 1.125, '[SENS CONTRAIRE] le long contraire : le haut qui coûte au short lui profite (+1,4 % − 0,275)');
  // creux APRÈS l'entrée dans la bougie d'entrée elle-même : à la note, la bougie en cours avait un bas à 50 ; elle se ferme avec un bas à 48,8
  // (−2,4 %, nouveau) → perte max touchée dès la bougie d'entrée ; un bas d'AVANT l'entrée ne compte pas
  const s5 = [{ ts: k, c: 50, h: 50, l: 50 }, { ts: k + Q, o: 49, c: 50, h: 50.2, l: 49 }];
  const t5 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': s5 } } } }); t5.c.__px['ETH/USDT'] = 50; t5.c._thNote('ETH/USDT', 0.3, 2);
  assert.strictEqual(t5.S.dcThreshold.pend[0].el, 49, 'bas d\'avant l\'entrée gardé (−2 % : ne compte pas)');
  s5[1].l = 49; s5[1].c = 50.5; s5.push({ ts: k + 2 * Q, c: 50.6, h: 50.7, l: 50.3 }, { ts: k + 3 * Q, c: 50.6 }); t5.c.__now = k + 3 * Q + 1000; t5.c._thJudge();
  assert.ok(t5.S.dcThreshold.pend.length === 1 && t5.S.dcThreshold.pend[0].hit === 0, 'pas de nouveau bas : rien');
  const t6 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': [{ ts: k, c: 50, h: 50, l: 50 }, { ts: k + Q, o: 50, c: 50, h: 50.1, l: 50 }] } } } }); t6.c.__px['ETH/USDT'] = 50; t6.c._thNote('ETH/USDT', 0.3, 2);
  const s6 = t6.S.realCandles['ETH/USDT']['15m']; s6[1].l = 48.8; s6[1].c = 50.2; s6.push({ ts: k + 2 * Q, c: 50.3, h: 50.3, l: 50.1 }, { ts: k + 3 * Q, c: 50.3 });
  t6.c.__now = k + 3 * Q + 1000; t6.c._thJudge(); assert.strictEqual(t6.S.dcThreshold.rec[0][3], -2.275, 'nouveau bas à −2,4 % après l\'entrée : perte max');
  assert.strictEqual(mk().c._thNote('X', 0.3), false);
  const t3 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': [{ ts: k, c: 50 }, { ts: k + Q, c: 50 }] } } } }); t3.c.__px['ETH/USDT'] = 50;
  t3.c._thNote('ETH/USDT', 0.3); assert.strictEqual(t3.S.dcThreshold.pend[0].cap, 2, 'sans stop connu : 2 % comme _lossCapSweep');
  const t4 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': [{ ts: k, c: 50 }, { ts: k + Q, c: 50 }] } } } }); t4.c.__px['ETH/USDT'] = 50;
  t4.c._thNote('ETH/USDT', 0.3, 9); assert.strictEqual(t4.S.dcThreshold.pend[0].cap, 3, 'bornée à 3 %');
});

T('M7 · jamais inventé : prix réel absent ou figé, bougie close ou en cours de bouche-trou → pas de trade ; coupure sur le chemin → les horizons qui la traversent sont abandonnés, les autres jugés ; sortie introuvable → abandonnée ; mode simulé → rien', () => {
  const k = 300 * Q, tn = k + Q + 5000;
  const ser = [{ ts: k - Q, c: 50 }, { ts: k, c: 50, _gap: true }, { ts: k + Q, c: 50 }];
  const t = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': ser } } } });
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 2), false, 'pas de prix réel');
  t.c.__px['ETH/USDT'] = 50; t.c.__age['ETH/USDT'] = 120001; assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 2), false, 'prix figé > 2 min');
  t.c.__age['ETH/USDT'] = 5000; assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 2), false, 'bougie close = bouche-trou');
  delete ser[1]._gap; ser[2]._gap = true; assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 2), false, 'bougie en cours = bouche-trou');
  delete ser[2]._gap; assert.strictEqual(t.c._thNote('ETH/USDT', 0, 2), false, 'signal nul');
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 2), true);
  // chemin : k+2Q, k+3Q réelles, k+4Q bouche-trou, puis reprise — 15 min (sortie k+2Q) jugé ; 30 min (sortie k+3Q = juste avant la coupure) et plus : abandonnés
  ser.push({ ts: k + 2 * Q, c: 50.5, h: 50.5, l: 50 }, { ts: k + 3 * Q, c: 50.6, h: 50.6, l: 50.4 }, { ts: k + 4 * Q, c: 50.6, h: 50.6, l: 50.6, _gap: true }, { ts: k + 5 * Q, c: 52, h: 52, l: 51 }, { ts: k + 6 * Q, c: 52 });
  t.c.__now = k + 6 * Q + 1000; t.c._thJudge();
  const r = t.S.dcThreshold.rec[0]; assert.ok(r, 'tranché');
  assert.ok(Math.abs(r[3] - (Math.round((0.5 / 50 * 100 * 1 - 0.275) * 10000) / 10000)) < 1e-12); assert.deepStrictEqual(JSON.parse(JSON.stringify(r.slice(4))), [false, false, false, false]);
  const rc = t.S.dcThreshold.recC[0]; assert.strictEqual(rc[3] / 10000, Math.round((-1 * (0.5 / 50 * 100) - 0.275) * 10000) / 10000); assert.deepStrictEqual(JSON.parse(JSON.stringify(rc.slice(4))), [false, false, false, false], '[SENS CONTRAIRE] mêmes abandons');
  // bougie MANQUANTE sur le chemin (série re-bootstrappée, ou pas de bouche-trou) : les horizons qui la traversent sont abandonnés
  const t7 = mk({ now: tn, S: { realPairCycle: { 'DOT/USDT': k }, realCandles: { 'DOT/USDT': { '15m': [{ ts: k, c: 7, h: 7, l: 7 }, { ts: k + Q, c: 7, h: 7, l: 7 }] } } } }); t7.c.__px['DOT/USDT'] = 7; t7.c._thNote('DOT/USDT', 0.4, 2);
  const s7 = t7.S.realCandles['DOT/USDT']['15m']; s7.push({ ts: k + 2 * Q, c: 7.1, h: 7.1, l: 7 }, { ts: k + 3 * Q, c: 7.2, h: 7.2, l: 7.1 }, { ts: k + 5 * Q, c: 7.5, h: 7.5, l: 7.4 }, { ts: k + 6 * Q, c: 7.5 });   // k+4Q manquante
  t7.c.__now = k + 6 * Q + 1000; t7.c._thJudge(); const r7 = t7.S.dcThreshold.rec[0];
  assert.ok(r7 && Math.abs(r7[3] - (Math.round((0.1 / 7 * 100 - 0.275) * 10000) / 10000)) < 1e-9, '15 min jugé (sortie k+2Q, avant le trou) : ' + JSON.stringify(r7));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r7.slice(4))), [false, false, false, false], 'la bougie juste avant le trou et après : abandonnés');
  // [SENS CONTRAIRE] le short contraire touche sa perte max (haut 7,2 = +2,9 %) dans k+3Q, AVANT le trou : son issue est connue, rien d'abandonné
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t7.S.dcThreshold.recC[0].slice(3))), [Math.round((-1 * (0.1 / 7 * 100) - 0.275) * 10000), -22750, -22750, -22750, -22750], 'forme entière');
  t.S.realPairCycle['ETH/USDT'] = k + 4 * Q; assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 2), false, 'bougie close = bouche-trou');
  t.S.dcThreshold.pend = [{ p: 'ETH/USDT', k: 1, t: k, px: 50, d: 1, c: 0.5, f: Q, tf: '15m', cap: 2, x: HZ.map(h => k + 20 * Q + h * Q), n: [null, null, null, null, null], s: k + 30 * Q, hit: 0 }];
  t.c.__now = k + 21 * Q + 4 * Q; t.c._thJudge(); assert.strictEqual(t.S.dcThreshold.pend[0].n[0], null, 'encore dans les temps (4 bougies de grâce)');
  t.c.__now = k + 21 * Q + 4 * Q + 1; t.c._thJudge(); assert.strictEqual(t.S.dcThreshold.pend[0].n[0], false, 'série coupée : abandonné');
  const sim = mk({ S: { tradingMode: 'sim', realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': [{ ts: k, c: 50 }, { ts: k + Q, c: 50 }] } } } }); sim.c.__px['ETH/USDT'] = 50;
  assert.strictEqual(sim.c._thNote('ETH/USDT', 0.5, 2), false); assert.strictEqual(sim.c._thJudge(), 0); assert.strictEqual(sim.c._thLevel(), null);
});

T('M8 · file pleine : on refuse les NOUVEAUX, ceux qui arrivent à terme sont jugés ; fenêtre = 30 créneaux du plus long horizon (≈ 5 jours) ; plafond mémoire', () => {
  const k = 400 * Q;
  const t = mk({ now: k + Q + 1000, S: { realPairCycle: { 'ADA/USDT': k }, realCandles: { 'ADA/USDT': { '15m': [{ ts: k - Q, c: 1, h: 1, l: 1 }, { ts: k, c: 1, h: 1, l: 1 }, { ts: k + Q, c: 1 }] } } } });
  const full = Array.from({ length: t.run('TH_PEND_MAX') }, (_, i) => ({ p: 'X' + i, k: 1, t: k, px: 1, d: 1, c: 0.1, f: Q, tf: '15m', cap: 2, x: HZ.map(h => k + 99 * Q), n: [null, null, null, null, null], s: k, hit: 0 }));
  full[0] = { p: 'ADA/USDT', k: k - 2 * Q, t: k - 2 * Q + 1000, px: 1, d: 1, c: 0.1, f: Q, tf: '15m', cap: 2, x: [k - Q, k, k + 99 * Q, k + 99 * Q, k + 99 * Q], n: [null, null, null, null, null], s: k - 2 * Q, hit: 0 };
  t.S.dcThreshold = { rec: [], pend: full }; t.c.__px['ADA/USDT'] = 1;
  assert.strictEqual(t.c._thNote('ADA/USDT', 0.4, 2), false, 'file pleine : le nouveau est refusé');
  assert.strictEqual(t.c._thJudge(), 2, 'les deux premiers horizons du plus ancien sont jugés');
  const span = 1.5 * 20 * 17 * Q; t.S.dcThreshold.pend = []; t.S.dcThreshold.rules = {};
  t.S.dcThreshold.rec = [[0.11, Math.round((k - span) / 1000) - 1, 15, 0, 0, 0, 0, 0], [0.12, Math.round((k - span) / 1000) + 1, 15, 0, 0, 0, 0, 0]];
  t.S.dcThreshold.pend = [{ p: 'Z', k: 2, t: k, px: 1, d: 1, c: 0.1, f: Q, tf: '15m', cap: 2, x: HZ.map(() => k - Q), n: [null, null, null, null, null], s: k, hit: 0 }];
  t.S.realCandles.Z = { '15m': [{ ts: k - Q, c: 1, h: 1, l: 1 }, { ts: k, c: 1 }] }; t.c.__now = k; t.c._thJudge();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t.S.dcThreshold.rec.map(r => r[0]))), [0.12, 0.1], 'plus vieux que 30 créneaux de 4 h : sorti de la fenêtre');
  t.S.dcThreshold.rec = Array.from({ length: 8005 }, (_, i) => [0.1, Math.round((k - i * 1000) / 1000), 15, 0, 0, 0, 0, 0]).reverse();
  t.S.dcThreshold.pend = [{ p: 'Z', k: 3, t: k, px: 1, d: 1, c: 0.1, f: Q, tf: '15m', cap: 2, x: HZ.map(() => k - Q), n: [null, null, null, null, null], s: k, hit: 0 }];
  t.S.dcThreshold.rules = {}; t.c._thJudge(); assert.strictEqual(t.S.dcThreshold.rec.length, t.run('TH_REC_MAX'));
});

T('M9 · un seuil par horizon et par pas de temps (créneaux de h+1 bougies) ; _thLevel = le plus bas des seuils prouvés ; _thPick = la meilleure moyenne par bougie tenue parmi les horizons que la conviction atteint', () => {
  const t = mk({ now: 5000 * Q });
  // 700 décisions, conviction 0,0 à 0,9 (70 de chaque) ; 1 h (indice 2) gagne dès 0,5 ; 4 h (indice 4) gagne dès 0,7 et plus par bougie tenue ; le reste perd
  const rec = []; for (let i = 0; i < 700; i++) {
    const c = (i % 10) / 10;
    rec.push([c, Math.round((5000 * Q - i * Q * 0.6) / 1000), 15, -0.3, -0.3, c >= 0.5 ? 0.4 + (i % 2 ? 0.05 : -0.05) : -0.6, -0.3, c >= 0.7 ? 3 + (i % 2 ? 0.1 : -0.1) : -0.5]);
  }
  rec.push([0.9, Math.round(5000 * Q / 1000), 60, 9, 9, 9, 9, 9]);   // autre pas de temps (1 h) : ignoré par le seuil de 15 min
  t.S.dcThreshold = { rec, pend: [] }; t.c._thRefresh();
  const hz = t.S.dcThreshold.rules[15].hz;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(hz.map(x => x.open))), [false, false, true, false, true], JSON.stringify(hz.map(x => [x.h, x.open, x.level, x.near && x.near.blocks])));
  assert.strictEqual(hz[2].level, 0.5); assert.strictEqual(hz[4].level, 0.7); assert.strictEqual(t.c._thLevel(), 0.5);
  assert.ok(Math.abs(hz[2].score - hz[2].best.mean / 4) < 1e-12 && Math.abs(hz[4].score - hz[4].best.mean / 16) < 1e-12 && hz[4].score > hz[2].score, 'score = moyenne par bougie tenue');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t.c._thPick(0.6))), { h: 4, level: 0.5, mean: hz[2].best.mean, f: Q }, 'conviction 0,6 : seul 1 h est atteint');
  assert.strictEqual(t.c._thPick(0.8).h, 16, 'conviction 0,8 : 4 h, la meilleure moyenne par bougie tenue');
  assert.strictEqual(t.c._thPick(0.3), null);
  assert.ok(/Seuil appris · ouvert — 1 h dès conviction ≥ 0,50 \(\+0,41 %\/trade net de frais, 350 trades, \d+ créneaux\) ; 4 h dès conviction ≥ 0,70 \(\+3,03 %\/trade net de frais, 210 trades/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  // le même état lu depuis le mode RE en 1 h : son propre seuil (ici l'enregistrement unique en 1 h : rien de prouvé)
  t.S.tradingMode = 'real'; t.S.realTimeframe = '1h'; assert.strictEqual(t.c._thLevel(), Infinity); assert.ok(t.S.dcThreshold.rules[60] && t.S.dcThreshold.rules[15].open);
  // jugements en attente de recalcul : marqués PAR pas de temps (le recalcul du seuil 15 min n'efface pas l'attente du seuil 1 h)
  t.S.dcThreshold.dirty = {}; t.S.tradingMode = 'real'; t.S.realTimeframe = '1h'; t.S.realPairCycle = {}; t.S.realCandles = { 'ADA/USDT': { '1h': [{ ts: 0, c: 1, h: 1, l: 1 }, { ts: 3600000, c: 1, h: 1, l: 1 }] } };
  t.S.dcThreshold.pend = [{ p: 'ADA/USDT', k: 1, t: 1000, px: 1, d: 1, c: 0.1, f: 3600000, tf: '1h', cap: 2, x: [0, 99 * 3600000, 99 * 3600000, 99 * 3600000, 99 * 3600000], n: [null, null, null, null, null], s: -3600000, s0: 0, el: 1, eh: 1, hit: 0 }];
  t.S.tradingMode = 'paperReal'; t.c._thJudge(); assert.strictEqual(t.S.dcThreshold.dirty[60], true, 'jugement d\'un trade 1 h : le seuil 1 h attend'); assert.ok(!t.S.dcThreshold.dirty[15]);
  // un seuil vieux de plus d'une bougie est recalculé à la lecture (ex. : l'app était fermée, la fenêtre s'est vidée)
  t.S.tradingMode = 'paperReal'; t.c.__now = 5000 * Q + 30 * 24 * 3600000; assert.strictEqual(t.c._thLevel(), Infinity, '30 jours plus tard : plus rien dans la fenêtre → fermé');
});

T('M10 · journal 🎚 à chaque changement seulement ; système neuf fermé ; ancien format (20260927h, un horizon) repris comme résultats de cet horizon', () => {
  const t = mk({ now: 500 * Q });
  assert.strictEqual(t.c._thLevel(), Infinity);
  assert.ok(/Seuil appris · marché fermé — aucun horizon \(15 min à 4 h\) ne paie encore les frais \(pas encore assez de trades virtuels : 0 décisions\)/.test(t.S.chainLog[0].desc), t.S.chainLog[0].desc);
  t.c._thRefresh(); assert.strictEqual(t.S.chainLog.length, 1, 'rien ne change : rien au journal');
  const old = mk({ now: 500 * Q, S: { dcThreshold: { obs: [{ c: 0.2, n: -0.3, b: 4, r: 'c', t: 100 * Q, p: 'SOL/USDT' }, { c: 0.4, n: 0.1, b: 5, r: 'o', t: 101 * Q, p: 'ETH/USDT' }], pend: [{ p: 'A', k: 1, x: 5 }], rule: { h: 2, open: false } } } });
  old.run('_thState()'); const T2 = old.S.dcThreshold;
  assert.strictEqual(T2.obs, undefined); assert.strictEqual(T2.pend.length, 0, 'anciens en attente abandonnés'); assert.strictEqual(T2.rule, undefined); assert.deepStrictEqual(JSON.parse(JSON.stringify(T2.rules)), {});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(T2.rec)), [[0.2, 100 * Q / 1000, 15, false, -0.3, false, false, false], [0.4, 101 * Q / 1000, 15, false, 0.1, false, false, false]]);
  assert.deepStrictEqual(['15 min', '30 min', '1 h', '2 h', '4 h', '1 h 30'], [1, 2, 4, 8, 16, 6].map(h => t.c._thHzLab(h, Q)));
});

T('M11 · _botExitSweep RÉEL (10f) : une position marquée d\'un horizon n\'est fermée par rien avant son heure (même au-delà du SL, du TP ou d\'une règle apprise) ; à l\'heure dite → « Horizon appris » ; sur coupure, son stop est la perte max ; une position non marquée garde ses sorties', () => {
  const code = between(s10f, 'function _closeCompleted(pos, label) {', 'window._lossCapSweep = function', false);
  const mkS = (pos, px, now) => {
    const S = { openPositions: [pos], pairStates: { 'SOL/USDT': { price: px } }, chainLog: [], tradingMode: 'paperReal', botAutoMode: true };
    const c = { S, Math, Number, String, Object, Array, isFinite, JSON, window: { __thJudgeTs: now }, Date: { now: () => now }, nowStr: () => '12:00',
      closePosition: id => { const p0 = S.openPositions.find(p => p.id === id); S.exitPx = p0 && p0._forcedExitPx; S.openPositions = S.openPositions.filter(p => p.id !== id); S.closed = id; }, _rcPriceAge: () => (c.__age || 0), _rcLastPrice: () => (c.__last || px),
      _horizonExit: () => ({ why: 'horizon règle' }), _gainExit: () => null, _stopExit: () => null, _thHzLab: (h) => h + ' b', _thTfMs: () => Q, _thTf: () => '15m' };
    vm.createContext(c); vm.runInContext(code, c); return c;
  };
  const base = () => ({ id: 7, pair: 'SOL/USDT', side: 'long', auto: true, entryPrice: 100, stakeUsdt: 10, sl: 99, tp: 101, _thH: 4, _thX: 10 * Q });
  let c = mkS(base(), 98, 10 * Q - 1); c.window._botExitSweep(); assert.strictEqual(c.S.openPositions.length, 1, 'sous le SL, avant l\'heure : tenue');
  c = mkS(base(), 102, 10 * Q - 1); c.window._botExitSweep(); assert.strictEqual(c.S.openPositions.length, 1, 'au-delà du TP, avant l\'heure : tenue');
  c = mkS(base(), 100.4, 10 * Q); c.window._botExitSweep(); assert.strictEqual(c.S.closed, 7, 'à l\'heure : fermée');
  assert.ok(/Horizon appris · SOL\/USDT LONG · tenue 4 b · @0\.40 %/.test(c.S.chainLog[0].desc), c.S.chainLog[0].desc); assert.strictEqual(c.S.openPositions.length, 0); assert.strictEqual(c.S.exitPx, 100.4, 'au dernier prix réel');
  c = mkS(base(), 100.4, 10 * Q); c.__last = 101.2; c.window._botExitSweep(); assert.strictEqual(c.S.exitPx, 101.2, 'ps.price qui date (100,4) : sortie au dernier prix RÉEL (101,2)');
  c = mkS(base(), 100.4, 10 * Q); c.__age = 120001; c.window._botExitSweep(); assert.strictEqual(c.S.openPositions.length, 1, 'prix réel figé depuis plus de 2 min : on attend un prix frais');
  const plain = base(); delete plain._thH; delete plain._thX;
  c = mkS(plain, 100.2, 10 * Q - 1); c.window._botExitSweep(); assert.strictEqual(c.S.closed, 7, 'non marquée : la règle d\'horizon apprise (chemins) la ferme comme avant');
  // coupure réseau : le stop d'une position marquée est la perte max (SL 99 → 1 % → perte max 2 % → 98), pas le SL
  let st = Object.assign(base(), { _pathStale: 120 }); c = mkS(st, 98.5, 10 * Q - 1); c.window._botExitSweep(); assert.strictEqual(c.S.openPositions.length, 1, 'au retour, sous le SL mais au-dessus de la perte max : tenue');
  st = Object.assign(base(), { _pathStale: 120 }); c = mkS(st, 97.5, 10 * Q - 1); c.window._botExitSweep(); assert.strictEqual(c.S.closed, 7, 'au-delà de la perte max : fermée');
  assert.ok(Math.abs(st._forcedExitPx - 98) < 1e-9 && st._ruleExit.kind === 'stop_exchange', 'comptée AU niveau de la perte max');
  const pl2 = Object.assign(base(), { _pathStale: 120 }); delete pl2._thX; c = mkS(pl2, 98.5, 10 * Q - 1); c.window._botExitSweep(); assert.strictEqual(pl2._forcedExitPx, 99, 'non marquée : au SL, comme avant');
  let judged = 0; c = mkS(base(), 100, 10 * Q - 1); c._thJudge = () => { judged++; }; c.window.__thJudgeTs = 0; c.window._botExitSweep(); c.window._botExitSweep();
  assert.strictEqual(judged, 1, 'les trades virtuels sont aussi jugés ici, au plus toutes les 10 s');
});

T('S1 · 10f : trade virtuel noté avec la perte max du vrai trade ; position marquée de l\'horizon choisi ; le cycle ne ferme pas une position marquée', () => {
  const core = codeStrict(between(s10f, 'function _resolvePairCycleCore(pair, ps) {', "if(typeof _resolvePairCycleCore==='function')", false));
  const iV = core.indexOf('const volCV     = raw?.stddev?.cv || 0.015;'), iN = core.indexOf('_thNote(pair, finalSignalWithMem, Math.min(3, Math.max(1.5, 2 * _thSl)), Math.min(3, Math.max(1.5, 2 * _thSlC)));');   // [SENS CONTRAIRE] + la perte max contraire
  assert.ok(iV > 0 && iN > iV, 'noté après volCV'); assert.strictEqual((core.match(/_thNote\(/g) || []).length, 1);
  assert.ok(core.includes('const _thTp = Math.max(0.6, effectiveConviction * 3.2 * (1 + volCV * 9));') && core.includes('const _thSl = Math.max(0.45, Math.min((volCV * 100) * 1.4, _thTp / 1.4));'));
  assert.ok(core.includes('const tpPctE=Math.max(0.6,effectiveConviction*3.2*(1+volCV*9));') && core.includes('const slPctE   = Math.max(0.45, Math.min(_slNoise, tpPctE / 1.4));') && core.includes('const _slNoise = (volCV * 100) * 1.4;'), 'même formule que le vrai stop');
  assert.ok(core.includes('if(canBotClose && !botPos._thX && minHoldMet && (sigRev||timeClose||hardTime||consRev)){'));
  assert.ok(core.includes('_thP = (_thOn && np.side === side && typeof _thPick === \'function\') ? _thPick(Math.abs(finalSignalWithMem)) : null;'), 'retournée par l\'entonnoir : pas marquée');
  const iNo = core.indexOf("if (typeof window !== 'undefined' && window.__thNoteOnly) return;"); assert.ok(iNo > iN && iNo < core.indexOf('const adjProb'), 'places prises : on s\'arrête juste après la note');
  assert.ok(core.includes('np._thH = _thP.h; np._thX = Math.floor((_t0 + _thP.h * _thP.f) / _thP.f) * _thP.f + _thP.f;'));
  assert.ok(core.includes("${_thP && typeof _thHzLab === 'function' ? '· tenue ' + _thHzLab(_thP.h, _thP.f) + ' ' : ''}"));
  assert.ok(core.includes("const _thL  = (typeof _thLevel === 'function') ? _thLevel() : null;") && core.includes('const _boost = _thOn ? 0 : _boostHand;') && core.includes('const sigDir=_revBuy?1:_revSell?-1:0;'));
  const sweep = codeStrict(between(s10f, 'window._botExitSweep = function _botExitSweep() {', 'window._lossCapSweep = function', false));
  const iT = sweep.indexOf('if (pos._thX) {'), iH = sweep.indexOf('_horizonExit(pos, pnlPct, Date.now())'), iS = sweep.indexOf("if (S.tradingMode === 'paperReal' && pos._pathStale > 0");
  assert.ok(iS > 0 && iT > iS && iH > iT, 'après le stop sur coupure, avant les règles apprises et les niveaux');
  const s08 = codeStrict(rd('js/08-learning-history-render.js')), i08 = s08.indexOf('if (_isBg) { S.tradingMode = _m; window._bgResolve = true; }');
  assert.ok(i08 > 0 && s08.indexOf("if (_isBg && (S.tradingMode === 'paperReal' || S.tradingMode === 'real') && typeof _rcLastPrice === 'function' && typeof _rcPriceAge === 'function') {") > i08, '08 : mode réel en arrière-plan → dernier prix réel');
  assert.ok(s08.includes('if (q && _rcPriceAge(p) <= 120000) { var lp = Number(_rcLastPrice(p)); if (lp > 0) q.price = lp; }'));
  const c04 = codeStrict(rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js')), c10d = codeStrict(rd('js/10d-protections-indicateurs.js'));
  assert.ok(c04.includes("if (_auto && (S.openPositions || []).some(p => p && p.id === action.payload.posId && p._thX)) break;"), '04 : fermeture proposée, exécutée automatiquement → pas une position tenue');
  assert.ok(c04.includes("const positions = (S.openPositions || []).filter(p => p.pair === action.payload.pair && !(_auto && p._thX));"), '04 : rééquilibrage automatique → pas une position tenue');
  const rv = between(c10d, 'function _checkReversalsAndClose() {', 'const reversal = _detectReversal(pos.pair, pos.side);', false); assert.ok(rv.includes('if (pos._thX) return;'), '10d : pas de fermeture préventive avant l\'horizon');
  const s10g = rd('js/10g-resolveur-ev-csv.js');
  assert.ok(codeStrict(s10g).includes('if (openPositions.length >= maxConcurrent) { window.__thNoteOnly = true; try { return _resolvePairCycleCore(pair, ps); } finally { window.__thNoteOnly = false; } }'), '10g : places prises → cycle « noter seulement »');
  assert.ok(s10g.startsWith('// [HORIZONS APPRIS · 27/09/2026] VERSION 20260927i'));
  assert.ok(s10f.startsWith('// [MARCHÉ RÉPARÉ · 30/09/2026] VERSION 20260930a') && s10f.split('\n')[1].startsWith('// [BILAN AUX HORIZONS · 27/09/2026] VERSION 20260927k') && s10f.split('\n')[2].startsWith('// [SENS CONTRAIRE · 27/09/2026] VERSION 20260927j'));   // [BILAN AUX HORIZONS · 27/09] 10f relivré
});

T('S2 · portes de 10f EXÉCUTÉES (texte livré) : seuil 0,30 → 0,31 passe, 0,29 non, le consensus seul doit l\'atteindre ; fermé → rien ne passe mais le retournement reste vu ; coup de pouce sans effet sur le seuil appris ; sans seuil → tout comme avant', () => {
  const gateTxt = s10f.slice(s10f.indexOf('  const _mktReg ='), s10f.indexOf('  const lmsrAlignBuy'));
  const decTxt = s10f.slice(s10f.indexOf('  const lmsrAlignBuy'), s10f.indexOf('  const action = '));
  const floorTxt = s10f.slice(s10f.indexOf('  const _convFloor ='), s10f.indexOf('  if(_gainNet < _minNetGain'));
  function gates(th, conv, sig, boost, regime) {
    const c = { S: { _convBoost: boost || 0, openPositions: [] }, effectiveConviction: conv, finalSignalWithMem: sig, ps: { trades: [] }, pair: 'BTC/USDT', Math,
      detectMarketRegime: () => regime || 'calm', _corrGateForOpen: () => ({ bonus: 0 }), _ecoGateForOpen: () => ({ malus: 0 }), _newsGateForOpen: () => ({ delta: 0 }),
      _heatGateForOpen: () => ({ delta: 0 }), _pairNetExpectancy: () => null, _pairWatch: false, adjProb: 0.5, _dcR: { C: sig, n: 5 } };
    if (th !== undefined) c._thLevel = () => th;
    vm.createContext(c);
    vm.runInContext(gateTxt.replace(/const /g, 'var ') + '\n' + decTxt.replace(/const /g, 'var ') + '\nvar __cg = convGate, __dg = dirGate;', c);
    vm.runInContext(floorTxt.replace(/const /g, 'var '), c);
    return { conv: c.__cg, dir: c.__dg, floor: c._convFloor, buy: c.isBuy, sell: c.isSell, revBuy: c._revBuy, revSell: c._revSell };
  }
  let g = gates(0.30, 0.31, 0.31); assert.strictEqual(g.buy, true); assert.ok(Math.abs(g.floor - 0.30) < 1e-9);
  g = gates(0.30, 0.29, 0.29); assert.strictEqual(g.buy, false);
  g = gates(0.30, 0.31, 0.29); assert.strictEqual(g.conv, true); assert.strictEqual(g.dir, false);
  g = gates(Infinity, 1, 1); assert.strictEqual(g.buy, false); assert.strictEqual(g.floor, Infinity);
  g = gates(Infinity, 0.40, -0.30); assert.strictEqual(g.sell, false); assert.strictEqual(g.revSell, true);
  g = gates(0.30, 0.27, 0.27, 0.06); assert.strictEqual(g.buy, false); assert.ok(Math.abs(g.floor - 0.30) < 1e-9);
  for (const [cv, sg, bo, rg] of [[0.40, 0.30, 0, 'calm'], [0.30, 0.30, 0.06, 'calm'], [0.20, -0.12, 0, 'volatile'], [0.26, 0.16, 0, 'bull'], [0.24, 0.16, 0, 'bull']]) {
    for (const th of [undefined, null]) { g = gates(th, cv, sg, bo, rg); assert.strictEqual(g.buy, g.revBuy); assert.strictEqual(g.sell, g.revSell); }
  }
  g = gates(undefined, 0.30, 0.30, 0.06); assert.strictEqual(g.buy, true); assert.ok(Math.abs(g.floor - 0.27) < 1e-9);
});

T('S3 · 07 : trailing, anti-zombie et bascule attendent l\'horizon d\'une position marquée ; persistance ; écran « Ce que le système a appris » (un état par horizon)', () => {
  const lf = codeStrict(between(s07, 'function learnFromOpenPositions() {', '\nlet deferredPrompt', false));
  const iG = lf.indexOf('if (pos.auto === true && pos._thX) return;'), iA = lf.indexOf('_trailStopHit(pos, cur)'), iC = lf.indexOf('posAgeMs > 30 * 60 * 1000'), iD = lf.indexOf('const conflict =');
  assert.ok(iG > 0 && iG < iA && iA < iC && iC < iD, 'la garde passe avant le trailing, l\'anti-zombie et la bascule');
  assert.ok(s9b1.includes('dcThreshold: S.dcThreshold || null,') && s9b2.includes("if (snap.dcThreshold && typeof snap.dcThreshold === 'object')") && s9b2.includes("'botMerit','dcVoices','dcThreshold',"));
  const src = rd('js/11b-ecran-appris.js').replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const hz = HZ.map((h, i) => ({ h, open: i === 2, level: i === 2 ? 0.35 : null, best: i === 2 ? { level: 0.35, mean: 0.12, se: 0.03, n: 64, blocks: 22, crit: 2.88 } : null, near: i === 2 ? null : (i === 4 ? null : { level: 0.1, mean: -0.2, se: 0.05, n: 300, blocks: 40, crit: 2.75 }) }));
  const S = { tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {},
    dcThreshold: { rec: [[], [], []], pend: [{}], rules: { 15: { open: true, level: 0.35, hz, tfMs: Q, cost: 0.275 } } } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [], _thHzLab: (h, f) => ({ 1: '15 min', 2: '30 min', 4: '1 h', 8: '2 h', 16: '4 h' })[h] };
  vm.createContext(c); vm.runInContext(src, c);
  let h = vm.runInContext('_learnedPanelHtml()', c);
  assert.ok(h.includes('SEUIL D\'OUVERTURE APPRIS') && h.includes('ouvert · conviction ≥ 0.35') && h.includes('3 décisions jugées · 1 en cours') && h.includes('preuve ≥ 20 créneaux'), h.slice(h.indexOf('SEUIL'), h.indexOf('SEUIL') + 900));
  assert.ok(h.includes('>1 h<') && h.includes('prouvé ≥ 0.35') && h.includes('≥ 0.35 : +0.12 %/trade (± 0.03)') && h.includes('64 · 22 · exigé 2.9 ET'));
  assert.ok(h.includes('>15 min<') && h.includes('≥ 0.10 : -0.20 %/trade (± 0.05)') && h.includes('>4 h<') && h.includes('pas encore jugeable'));
  S.dcThreshold = null; h = vm.runInContext('_learnedPanelHtml()', c); assert.ok(h.includes('pas encore de trade virtuel jugé (0 en attente)'));
});

T('M12 · SENS CONTRAIRE : chaque décision notée engendre AUSSI son trade contraire, dans ses propres listes — même entrée, mêmes sorties, même coût, SA perte max (4e argument, bornée 1,5-3 %) — jugé EXACTEMENT comme un trade du sens décidé nourri du signal inversé', () => {
  const k = 700 * Q, tn = k + Q + 5000;
  // chemin : bougie d'entrée avec un haut à 51,2 AVANT l'entrée (+2,4 %) ; puis montée, creux, remontée
  const path = () => [{ ts: k, c: 50, h: 50, l: 50 }, { ts: k + Q, o: 50.5, c: 50, h: 51.2, l: 49.9 }];
  const tail = [[50.3, 50.4, 50.1], [51, 51.1, 50.3], [49.6, 51, 49.2], [50.8, 50.9, 49.5], [50.2, 50.8, 50.1]]; for (let i = 7; i <= 19; i++) tail.push([50 + (i % 3) * 0.3, 50.9, 49.4]);
  const run = (sig, cap, capC) => {
    const ser = path(); const t = mk({ now: tn, S: { realPairCycle: { 'BTC/USDT': k }, realCandles: { 'BTC/USDT': { '15m': ser } } } }); t.c.__px['BTC/USDT'] = 50;
    assert.strictEqual(t.c._thNote('BTC/USDT', sig, cap, capC), true);
    ser[1].c = 50.2; tail.forEach((b, i) => ser.push({ ts: k + (i + 2) * Q, c: b[0], h: b[1], l: b[2] }));
    t.c.__now = k + 19 * Q + 1000; const nj = t.c._thJudge(); return { t, nj };
  };
  const A = run(0.45, 2.7, 2.1), B = run(-0.45, 2.1), C = run(0.45, 2.7);
  const TA = A.t.S.dcThreshold, TB = B.t.S.dcThreshold, TC = C.t.S.dcThreshold;
  const dec = r => [r[0] / 1000, r[1] + 1700000000, r[2]].concat(r.slice(3).map(v => (typeof v === 'number' ? v / 10000 : v)));   // forme entière → nets
  assert.strictEqual(TA.pendC.length + TA.recC.length, 1, 'un trade contraire, à part'); assert.strictEqual(TA.recC[0][0], 450);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(TA.recC.map(dec))), JSON.parse(JSON.stringify(TB.rec)), 'contraire (perte max 2,1) == sens décidé du signal inversé (perte max 2,1), nombre pour nombre, relu à l\'identique');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(TA.rec)), JSON.parse(JSON.stringify(TC.rec)), 'le sens décidé ne dépend pas de la perte max contraire');
  assert.strictEqual(A.nj, B.nj, '_thJudge compte les jugements du sens décidé seulement');
  assert.ok(TA.recC[0].slice(3).some(v => v === -23750), 'sa perte max à lui (2,1 % + coût) : ' + JSON.stringify(TA.recC[0]));
  assert.notDeepStrictEqual(JSON.parse(JSON.stringify(TA.recC[0])), JSON.parse(JSON.stringify(run(0.45, 2.7, 2.7).t.S.dcThreshold.recC[0])), 'une autre perte max contraire change son résultat');
  // le haut d'AVANT l'entrée (51,2) ne touche pas la perte max du short contraire ; bornes 1,5-3 %
  const t2 = mk({ now: tn, S: { realPairCycle: { 'BTC/USDT': k }, realCandles: { 'BTC/USDT': { '15m': path() } } } }); t2.c.__px['BTC/USDT'] = 50;
  const t2b = mk({ now: tn, S: { realPairCycle: { 'BTC/USDT': k }, realCandles: { 'BTC/USDT': { '15m': path() } } } }); t2b.c.__px['BTC/USDT'] = 50;
  t2.c._thNote('BTC/USDT', 0.45, 2, 9); t2b.c._thNote('BTC/USDT', -0.3, 2, 0.4);
  assert.deepStrictEqual(JSON.parse(JSON.stringify([t2.S.dcThreshold.pendC[0], t2b.S.dcThreshold.pendC[0]].map(q => [q.d, q.cap, q.eh, q.el]))), [[-1, 3, 51.2, 49.9], [1, 1.5, 51.2, 49.9]], 'sens inversé, perte max bornée 1,5-3 %');
  const s3 = path(); const t3 = mk({ now: tn, S: { realPairCycle: { 'BTC/USDT': k }, realCandles: { 'BTC/USDT': { '15m': s3 } } } }); t3.c.__px['BTC/USDT'] = 50; t3.c._thNote('BTC/USDT', 0.45, 2, 2);
  s3[1].c = 50.2; s3.push({ ts: k + 2 * Q, c: 50.3, h: 50.4, l: 50.1 }, { ts: k + 3 * Q, c: 50.3 }); t3.c.__now = k + 3 * Q + 1000; t3.c._thJudge();
  assert.strictEqual(t3.S.dcThreshold.pendC[0].hit, 0, 'haut d\'avant l\'entrée : pas compté'); assert.strictEqual(t3.S.dcThreshold.pendC[0].n[0], Math.round((-1 * ((50.3 - 50) / 50 * 100) - 0.275) * 10000) / 10000);
});

T('M13 · le sens décidé ne voit rien du sens contraire (listes, créneaux, recalcul à part) ; seules les décisions notées à partir de cette version comptent ; début de la mesure posé une fois ; abandon et file pleine comme le sens décidé', () => {
  const k = 800 * Q, now = k + 2 * Q + 1000;
  const t = mk({ now, S: { realCandles: { 'ETH/USDT': { '15m': [{ ts: k, c: 10, h: 10, l: 10 }, { ts: k + Q, c: 10.1, h: 10.1, l: 10 }, { ts: k + 2 * Q, c: 10.2 }] } } } });
  const far = [k + Q, k + 99 * Q, k + 99 * Q, k + 99 * Q, k + 99 * Q];
  const b = { p: 'ETH/USDT', k: k - Q, t: k - Q + 2000, px: 10, d: 1, c: 0.6, f: Q, tf: '15m', cap: 2, x: far.slice(), n: [null, null, null, null, null], s: k - Q, s0: k, el: 10, eh: 10, hit: 0 };
  t.S.dcThreshold = { rec: [[0.5, Math.round((k - 5 * Q) / 1000), 15, 0.1, 0.1, 0.1, 0.1, 0.1]], rules: { 15: { t: now, hz: [] } }, pend: [], pendC: [b] };
  const timers = []; t.c.setTimeout = fn => { timers.push(fn); };   // l'app : le seuil contraire se recalcule dans une tâche à part
  assert.strictEqual(t.c._thJudge(), 0, 'sens décidé : rien à juger');
  assert.strictEqual(b.n[0], Math.round((1 * ((10.1 - 10) / 10 * 100) - 0.275) * 10000) / 10000, 'le contraire est jugé même quand le sens décidé n\'a rien en attente');
  assert.strictEqual(t.S.dcThreshold.dirtyC[15], true, 'son recalcul à lui attend'); assert.ok(!t.S.dcThreshold.dirty[15], 'le seuil décidé n\'est pas touché');
  assert.strictEqual(t.S.dcThreshold.rules[15].t, now, 'ni recalculé');
  assert.strictEqual(timers.length, 1); timers[0](); assert.ok(t.S.dcThreshold.rulesC[15] && t.S.dcThreshold.dirtyC[15] === false, 'la tâche à part recalcule le seuil contraire');
  assert.ok(!t.S.dcThreshold.dirty[15] && t.S.dcThreshold.rules[15].t === now, 'et rien du seuil décidé');
  const ev = (i, ct) => t.run('_thEvalH(' + i + ', S.dcThreshold, ' + Q + (ct ? ', true' : '') + ')').n;
  assert.strictEqual(ev(0, true), 1, 'le sens contraire : sa seule décision'); assert.strictEqual(ev(0), 1, 'le sens décidé : son seul trade jugé');
  // des trades contraires gagnants par centaines ne changent rien au seuil décidé
  t.S.dcThreshold.recC = Array.from({ length: 600 }, (_, i) => [500 + (i % 5) * 100, Math.round((now - i * Q * 0.6) / 1000) - 1700000000, 15, 10000, 10000, 10000, 10000, 10000]);
  t.S.dcThreshold.rules = {}; assert.strictEqual(t.c._thLevel(), Infinity, 'seuil décidé : fermé'); assert.strictEqual(t.c._thPick(0.9), null);
  assert.strictEqual(t.S.dcThreshold.rules[15].ct, undefined, 'le seuil décidé ne porte rien du sens contraire');
  // notes : un trade contraire par décision nouvelle ; le début de la mesure posé à la PREMIÈRE, jamais réécrit
  const k2 = 900 * Q, s2 = [{ ts: k2, c: 5, h: 5, l: 5 }, { ts: k2 + Q, c: 5, h: 5, l: 5 }];
  const t2 = mk({ now: k2 + Q + 1000, S: { realPairCycle: { 'ADA/USDT': k2 }, realCandles: { 'ADA/USDT': { '15m': s2 } } } }); t2.c.__px['ADA/USDT'] = 5;
  t2.c._thNote('ADA/USDT', 0.3, 2, 2); assert.strictEqual(t2.S.dcThreshold.ctSince, k2 + Q + 1000);
  t2.c.__now = k2 + 2 * Q + 5000; s2.push({ ts: k2 + 2 * Q, c: 5, h: 5, l: 5 }); t2.S.realPairCycle['ADA/USDT'] = k2 + Q; t2.c._thNote('ADA/USDT', -0.3, 2, 2);
  assert.strictEqual(t2.S.dcThreshold.pendC.length, 2); assert.strictEqual(t2.S.dcThreshold.ctSince, k2 + Q + 1000, 'jamais réécrit');
  // un état d'avant (20260927i : pas de liste contraire) : rien n'est inventé pour ses trades
  const t3 = mk({ now: k2 + Q + 1000, S: { realPairCycle: {}, realCandles: {} } });
  t3.S.dcThreshold = { rec: [[0.2, 1, 15, 0, 0, 0, 0, 0]], pend: [{ p: 'Z', k: 1, t: 1000, px: 1, d: 1, c: 0.1, f: Q, tf: '15m', cap: 2, x: HZ.map(() => 99 * Q), n: [null, null, null, null, null], s: 0, s0: Q, el: 1, eh: 1, hit: 0 }], rules: {} };
  t3.c._thJudge(); t3.run('_thRefreshC()'); assert.deepStrictEqual([t3.S.dcThreshold.recC.length, t3.S.dcThreshold.pendC.length, t3.S.dcThreshold.ctSince], [0, 0, undefined]);
  // abandon (série coupée, 4 bougies de grâce) et file pleine : comme le sens décidé
  t3.S.dcThreshold.pendC = [{ p: 'Z', k: 1, t: k, px: 1, d: -1, c: 0.5, f: Q, tf: '15m', cap: 2, x: HZ.map(h => k + 20 * Q + h * Q), n: [null, null, null, null, null], s: k + 30 * Q, hit: 0 }];
  t3.c.__now = k + 21 * Q + 4 * Q; t3.c._thJudge(); assert.strictEqual(t3.S.dcThreshold.pendC[0].n[0], null, 'encore dans les temps');
  t3.c.__now = k + 37 * Q + 4 * Q + 1; t3.c._thJudge(); assert.strictEqual(t3.S.dcThreshold.pendC.length, 0, 'tout abandonné : sorti de l\'attente');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t3.S.dcThreshold.recC[0].slice(3))), [false, false, false, false, false]);
  const t4 = mk({ now: k2 + Q + 1000, S: { realPairCycle: { 'ADA/USDT': k2 }, realCandles: { 'ADA/USDT': { '15m': [{ ts: k2, c: 5, h: 5, l: 5 }, { ts: k2 + Q, c: 5, h: 5, l: 5 }] } } } }); t4.c.__px['ADA/USDT'] = 5;
  t4.S.dcThreshold = { rec: [], pend: [], pendC: Array.from({ length: t4.run('TH_PEND_MAX') }, () => ({})) };
  assert.strictEqual(t4.c._thNote('ADA/USDT', 0.3, 2, 2), true, 'le sens décidé est noté'); assert.strictEqual(t4.S.dcThreshold.pendC.length, t4.run('TH_PEND_MAX'), 'file contraire pleine : le contraire attend son tour, sans gêner le sens décidé');
});

T('M14 · le sens contraire se prouve comme le sens décidé (même _thEval, un résultat par horizon) mais n\'ouvre RIEN ; son seuil se recalcule dans une tâche à part ; journal 🎚 quand il devient prouvé, change ou cesse de l\'être, rien sinon', () => {
  const now = 5000 * Q, t = mk({ now });
  const recC = []; for (let i = 0; i < 700; i++) { const c = (i % 10) * 100; recC.push([c, Math.round((now - i * Q * 0.6) / 1000) - 1700000000, 15, -3000, -3000, c >= 500 ? 4000 + (i % 2 ? 500 : -500) : -6000, -3000, -5000]); }   // forme entière
  t.S.dcThreshold = { rec: [], pend: [], recC, pendC: [], ctSince: 4000 * Q };
  const R = t.run('_thRefreshC()');
  assert.strictEqual(t.c._thLevel(), Infinity, 'rien ne s\'ouvre'); assert.strictEqual(t.c._thPick(0.9), null, 'aucun horizon à tenir'); assert.strictEqual(t.S.dcThreshold.rules[15].open, false);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(R.hz.map(x => x.open))), [false, false, true, false, false]); assert.strictEqual(R.level, 0.5); assert.strictEqual(R.n, 700); assert.strictEqual(R.since, 4000 * Q);
  assert.ok(Math.abs(R.hz[2].best.mean - 0.41) < 1e-9 && R.hz[2].best.n === 350, 'même preuve que le sens décidé (M9) sur les mêmes nombres');
  assert.strictEqual(t.S.dcThreshold.rulesC[15], R);
  const L = t.S.chainLog.map(x => x.desc);
  assert.ok(L.some(d => /^Sens contraire · prouvé — 1 h dès conviction ≥ 0,50 \(\+0,41 %\/trade net de frais, 350 trades, \d+ créneaux\) — mesuré seulement : rien n'est tradé dans ce sens$/.test(d)), L.join(' | '));
  const nL = t.S.chainLog.length; t.run('_thRefreshC()'); assert.strictEqual(t.S.chainLog.length, nL, 'rien ne change : rien au journal');
  recC.forEach(r => { r[5] = -6000; }); t.run('_thRefreshC()');
  assert.ok(/^Sens contraire · plus prouvé \(le plus proche : .+ trades virtuels\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  const n2 = t.S.chainLog.length; t.run('_thRefreshC()'); assert.strictEqual(t.S.chainLog.length, n2, 'toujours pas prouvé : rien');
  const t2 = mk({ now: 500 * Q }); t2.S.dcThreshold = { rec: [], pend: [], recC: [[300, 1, 15, -10000, -10000, -10000, -10000, -10000]] }; t2.run('_thRefreshC()'); t2.run('_thRefreshC()'); assert.ok(!t2.S.chainLog.some(x => /Sens contraire/.test(x.desc)), 'jamais prouvé : aucune ligne');
  // tâche à part : avec setTimeout (l'app), _thJudge ne recalcule PAS le seuil contraire lui-même — il le programme, une fois
  const t3 = mk({ now }); const timers = []; t3.c.setTimeout = fn => { timers.push(fn); };
  t3.S.dcThreshold = { rec: [], pend: [], recC: recC.slice(), pendC: [] };
  t3.c._thJudge(); t3.c._thJudge(); assert.strictEqual(timers.length, 1, 'programmé une fois'); assert.strictEqual(t3.S.dcThreshold.rulesC[15], undefined, 'pas dans le même passage');
  timers[0](); assert.ok(t3.S.dcThreshold.rulesC[15] && t3.S.dcThreshold.rulesC[15].t === now);
  t3.c._thJudge(); assert.strictEqual(timers.length, 1, 'à jour : rien');
  t3.c.__now = now + Q + 1; t3.c._thJudge(); assert.strictEqual(timers.length, 2, 'plus d\'une bougie : recalculé (la fenêtre glisse)');
  // l'ouverture et la tenue (10f) ne lisent pas le sens contraire
  const c10f = codeStrict(s10f); assert.ok(!/rulesC|recC|pendC|dirtyC|ctSince|_thRefreshC|_thJudgeC/.test(c10f), '10f ne lit pas le sens contraire');
  const lv = codeStrict(between(s03, 'function _thRefresh() {', 'window._thNote = _thNote;', false).split('function _thRefreshC(')[0] + between(s03, 'function _thRule() {', 'window._thNote = _thNote;', false));
  assert.ok(!/rulesC|recC|pendC|dirtyC|ctSince/.test(lv), '_thRefresh, _thRule, _thLevel, _thPick ne lisent pas le sens contraire');
});

T('M15 · seuil contraire : recalculé pour le pas de temps du mode qui l\'a demandé (08 : EV et RE à tour de rôle, la tâche part après le retour au mode affiché) ; une demande par pas de temps, refaite si elle reste 60 s sans suite ; 5 min après de nouveaux jugements, ou dès qu\'il a plus d\'une bougie ; même fenêtre que le sens décidé', () => {
  const H1 = 3600000, now = 3000 * H1, t = mk({ now, S: { tradingMode: 'paperReal', paperRealTimeframe: '15m', realTimeframe: '1h' } }); const timers = []; t.c.setTimeout = fn => { timers.push(fn); };
  const mkRec = (fm, k) => Array.from({ length: k }, (_, i) => [300, Math.round((now - i * fm * 60000) / 1000) - 1700000000, fm, -3000, -3000, -3000, -3000, -3000]);
  t.S.dcThreshold = { rec: [], pend: [], recC: mkRec(15, 40).concat(mkRec(60, 30)), pendC: [] };
  t.S.tradingMode = 'real'; t.c._thJudge(); t.S.tradingMode = 'paperReal';   // RE traité en arrière-plan (08), puis retour au mode affiché
  assert.strictEqual(timers.length, 1); timers.shift()();
  assert.deepStrictEqual(Object.keys(t.S.dcThreshold.rulesC), ['60'], 'le seuil contraire du pas de temps de RE (1 h), pas celui de l\'écran');
  assert.strictEqual(t.S.dcThreshold.rulesC[60].n, 30);
  t.c._thJudge(); assert.strictEqual(timers.length, 1, 'EV (15 min) : sa propre demande'); timers.shift()(); assert.ok(t.S.dcThreshold.rulesC[15] && t.S.dcThreshold.rulesC[15].n === 40);
  t.S.dcThreshold.rulesC = {}; t.c._thJudge(); t.c._thJudge(); assert.strictEqual(timers.length, 1, 'en attente : pas de doublon');
  t.S.tradingMode = 'real'; t.c._thJudge(); t.S.tradingMode = 'paperReal'; assert.strictEqual(timers.length, 2, 'l\'autre pas de temps n\'attend pas');
  t.c.__now = now + 59999; t.c._thJudge(); assert.strictEqual(timers.length, 2);
  t.c.__now = now + 60000; t.c._thJudge(); assert.strictEqual(timers.length, 3, 'sans suite depuis 60 s : refaite');
  timers.splice(0).forEach(fn => fn());
  const R = t.S.dcThreshold.rulesC[15]; t.S.dcThreshold.dirtyC[15] = true;
  t.c.__now = R.t + 299999; t.c._thJudge(); assert.strictEqual(timers.length, 0, 'moins de 5 min');
  t.c.__now = R.t + 300000; t.c._thJudge(); assert.strictEqual(timers.length, 1, '5 min'); timers.shift()();
  t.c.__now = t.S.dcThreshold.rulesC[15].t + 900001; t.c._thJudge(); assert.strictEqual(timers.length, 1, 'plus d\'une bougie sans nouveau jugement : recalculé quand même'); timers.shift()();
  const span = 1.5 * 20 * 17 * Q, n0 = t.c.__now;
  t.S.dcThreshold.recC = [[300, Math.round((n0 - span) / 1000) - 1 - 1700000000, 15, 0, 0, 0, 0, 0], [300, Math.round((n0 - span) / 1000) + 1 - 1700000000, 15, 0, 0, 0, 0, 0]];
  t.run('_thRefreshC(' + Q + ')'); assert.strictEqual(t.S.dcThreshold.recC.length, 1, 'plus vieux que la fenêtre : retiré'); const T0c = t.run('TH_CT_T0'), s26 = Math.round(Date.UTC(2026, 8, 27) / 1000), s56 = Math.round(Date.UTC(2056, 0, 1) / 1000); assert.ok(s26 - T0c > 0 && s56 - T0c < 2 ** 30, 'heure relative : entier court (< 2^30) de 2023 à 2056');
});

T('S4 · 10f : la perte max du trade contraire (même formule, bonus des signaux techniques de SON sens) ; écran : le sens contraire horizon par horizon, ses décisions, le début de la mesure — « rien n\'est tradé »', () => {
  const core = codeStrict(between(s10f, 'function _resolvePairCycleCore(pair, ps) {', "if(typeof _resolvePairCycleCore==='function')", false));
  assert.ok(core.includes("if (tech) { const _dC = finalSignalWithMem > 0 ? 'bear' : 'bull'; Object.values(tech.signals || {}).forEach(s => { if (s?.signal === _dC) _thTbC += 0.04; }); _thTbC = Math.min(0.25, _thTbC); }"));
  assert.ok(core.includes('const _thTpC = Math.max(0.6, Math.min(1, conviction + _thTbC) * 3.2 * (1 + volCV * 9));') && core.includes('const _thSlC = Math.max(0.45, Math.min((volCV * 100) * 1.4, _thTpC / 1.4));'));
  assert.ok(core.includes("const dir = finalSignalWithMem > 0 ? 'bull' : 'bear';") && core.includes('techBonus = Math.min(0.25, techBonus);') && core.includes('const effectiveConviction = Math.min(1, conviction + techBonus);'), 'même formule que le sens décidé');
  // exécution du bloc livré : 3 signaux haussiers, 1 baissier → décision LONG 0,40 : perte max 2,7 % ; le contraire (1 signal) : 2,1 %
  const blk = s10f.slice(s10f.indexOf('  let techBonus = 0;'), s10f.indexOf('  const targetProb'));
  const note = s10f.slice(s10f.indexOf('  try {\n    if (typeof _thNote === \'function\') {'), s10f.indexOf('  // [HORIZONS APPRIS · 27/09/2026] places prises (10g)'));
  const cx = { Math, Object, finalSignalWithMem: 0.4, volCV: 0.015, tech: { signals: { a: { signal: 'bull' }, b: { signal: 'bull' }, c: { signal: 'bull' }, d: { signal: 'bear' } } }, got: null };
  cx._thNote = (p, s, cap, capC) => { cx.got = [s, cap, capC]; }; cx.pair = 'X';
  vm.createContext(cx); vm.runInContext(blk.replace(/const |let /g, 'var ') + note.replace(/const |let /g, 'var '), cx);
  assert.ok(cx.got && Math.abs(cx.got[1] - 2 * (0.52 * 3.2 * 1.135) / 1.4) < 1e-9 && Math.abs(cx.got[2] - 2 * (0.44 * 3.2 * 1.135) / 1.4) < 1e-9, JSON.stringify(cx.got));
  // écran
  const src = rd('js/11b-ecran-appris.js').replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const mkHz = io => HZ.map((h, i) => ({ h, open: i === io, level: i === io ? 0.5 : null, best: i === io ? { level: 0.5, mean: 0.41, se: 0.06, n: 350, blocks: 44, crit: 3.2 } : null, near: i === io ? null : { level: 0.2, mean: -0.35, se: 0.04, n: 560, blocks: 60, crit: 3.3 } }));
  const since = new Date(2026, 8, 27, 19, 45).getTime();
  const S = { tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {},
    dcThreshold: { rec: [], pend: [], rules: { 15: { open: false, level: null, hz: mkHz(-1), tfMs: Q, cost: 0.275 } }, recC: Array.from({ length: 690 }, () => [0, 0, 15]).concat([[0, 0, 60], [0, 0, 60]]), pendC: Array.from({ length: 10 }, () => ({ f: Q })).concat([{ f: 3600000 }]), ctSince: since,
      rulesC: { 15: { open: true, level: 0.5, hz: mkHz(2), tfMs: Q, n: 700, since } } } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [], _thHzLab: (h, f) => ({ 1: '15 min', 2: '30 min', 4: '1 h', 8: '2 h', 16: '4 h' })[h] };
  vm.createContext(c); vm.runInContext(src, c);
  let h = vm.runInContext('_learnedPanelHtml()', c);
  assert.ok(h.includes('marché fermé') && h.includes('>sens contraire<') && h.includes('prouvé · conviction ≥ 0.50 · 700 décisions') && h.includes('mesuré depuis le 27/09 19:45 · rien n\'est tradé'), h.slice(h.indexOf('sens contraire') - 200, h.indexOf('sens contraire') + 600));
  assert.ok(h.includes('>↳ 1 h<') && h.includes('prouvé ≥ 0.50') && h.includes('≥ 0.50 : +0.41 %/trade (± 0.06)') && h.includes('350 · 44 · exigé 3.2 ET'));
  assert.ok(h.includes('>↳ 15 min<') && h.includes('>pas prouvé<') && h.includes('≥ 0.20 : -0.35 %/trade (± 0.04)'));
  delete S.dcThreshold.rulesC; h = vm.runInContext('_learnedPanelHtml()', c); assert.ok(h.includes('pas encore jugé · 700 décisions') && h.includes('mesuré depuis le 27/09 19:45'));
  S.dcThreshold.recC = []; S.dcThreshold.pendC = []; delete S.dcThreshold.ctSince; h = vm.runInContext('_learnedPanelHtml()', c); assert.ok(!h.includes('sens contraire'), 'avant la première note : rien');
});

console.log(`\n${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
