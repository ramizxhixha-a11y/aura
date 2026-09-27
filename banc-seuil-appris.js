// banc-seuil-appris.js — [SEUIL APPRIS · 27/09/2026] VERSION 20260927h
// Rams (27/09 14:46, « Go ») : le seuil d'ouverture appris — il garde le système hors du marché tant qu'aucun niveau de consensus ne paie
// les frais, et le rouvre dès qu'un niveau prouve un avantage ; il apprend sans avoir besoin de trader (trades virtuels jugés à chaque bougie).
// Fonctions RÉELLES de 03 en vm (moteur du seuil) ; portes de 10f EXÉCUTÉES sur le texte livré ; textes de 09b1, 09b2 ; panneau RÉEL de 11b.
// Le rejeu de l'app entière (81 h, 9 fenêtres, 2 tirages) et la simulation des faux positifs sont dans la passation.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 50)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s10f = rd('js/10f-resolveur-cycle.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js');
const TH = between(s03, 'var TH_MIN_N = 30,', 'window._thNote = _thNote;', false);
const Q = 900000;   // bougie 15 min
function mk(o) {
  o = o || {};
  const S = Object.assign({ tradingMode: 'paperReal', paperRealTimeframe: '15m', chainLog: [], tradeContextMemory: [], realPairCycle: {}, realCandles: {} }, o.S || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, Date: { now: () => c.__now }, __now: o.now || 0, __px: {}, __age: {},
    _ownStakeCostPct: () => (o.cost === undefined ? 0.275 : o.cost), nowStr: () => '12:00:00' };
  c._rcLastPrice = p => c.__px[p] || 0; c._rcPriceAge = p => (c.__age[p] === undefined ? 0 : c.__age[p]);   // 02 : dernier prix réel accepté et son âge
  vm.createContext(c); vm.runInContext(TH, c);
  if (o.z !== undefined) vm.runInContext('TH_Z = ' + o.z, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
// k trades virtuels {c, n, b} : niveau c, net n (ou fonction de i), créneau b = b0 + step × (i % blocks)
const obs = (k, c, net, blocks, b0, step) => Array.from({ length: k }, (_, i) => ({ c, n: typeof net === 'function' ? net(i) : net, b: (b0 || 0) + (step || 1) * (i % blocks) }));
// erreur type de référence, calculée à la main : r_b = S_b − n_b·moyenne ; V = max(Σ r_b², Σ r_b² + 2 Σ r_b·r_b+1) ; √(V / n² × B / (B − 1))
function refSe(a) {
  const n = a.length, m = a.reduce((s, o) => s + o.n, 0) / n, g = {};
  a.forEach(o => { g[o.b] = g[o.b] || { s: 0, k: 0 }; g[o.b].s += o.n; g[o.b].k++; });
  const r = {}; Object.keys(g).forEach(b => { r[b] = g[b].s - g[b].k * m; });
  const v0 = Object.values(r).reduce((s, x) => s + x * x, 0), c1 = Object.keys(r).reduce((s, b) => s + (r[Number(b) + 1] !== undefined ? r[b] * r[Number(b) + 1] : 0), 0);
  const B = Object.keys(g).length; return Math.sqrt(Math.max(v0, v0 + 2 * c1) / (n * n) * (B / (B - 1)));
}
console.log('▶ banc-seuil-appris');

T('M1 · _thEval : rien → fermé ; tous perdants net de frais → fermé (le niveau le plus proche est montré) ; niveau gagnant prouvé → ouvert à CE niveau ; preuve à 2 erreurs types', () => {
  const t = mk();
  assert.strictEqual(t.run('TH_Z'), 2, 'preuve à 2 erreurs types');
  let r = t.c._thEval([]); assert.strictEqual(r.open, false); assert.strictEqual(r.n, 0); assert.strictEqual(r.near, null);
  r = t.c._thEval(obs(60, 0.3, i => -0.3 + (i % 3) * 0.01, 12)); assert.strictEqual(r.open, false, 'perd −0,3 %/trade : fermé');
  assert.ok(r.near && Math.abs(r.near.mean + 0.29) < 1e-9 && r.near.n === 60 && r.near.blocks === 12, JSON.stringify(r.near));
  const a = obs(40, 0.5, i => 0.4 + (i % 2 ? 0.1 : -0.1), 20).concat(obs(100, 0.1, -0.3, 25));
  r = t.c._thEval(a); assert.strictEqual(r.open, true); assert.strictEqual(r.level, 0.5, 'le seuil = le niveau prouvé, pas plus bas');
  assert.ok(Math.abs(r.best.mean - 0.4) < 1e-9 && r.best.n === 40 && r.best.blocks === 20 && r.best.se > 0);
});

T('M2 · preuve exigée : moins de 30 trades → non ; moins de 10 créneaux → non ; erreur type PAR CRÉNEAU (10 paires au même instant ne sont pas 10 preuves)', () => {
  const t = mk();
  assert.strictEqual(t.c._thEval(obs(29, 0.6, 0.5, 20)).open, false, '29 trades gagnants : pas assez');
  assert.strictEqual(t.c._thEval(obs(30, 0.6, i => 0.5 + (i % 2 ? 0.05 : -0.05), 20)).open, true, '30 trades gagnants sur 20 créneaux : prouvé');
  assert.strictEqual(t.c._thEval(obs(60, 0.6, 0.5, 9)).open, false, '60 trades gagnants sur 9 créneaux : pas assez de créneaux');
  // 12 créneaux (non voisins) × 5 trades identiques par créneau : 7 à +1, 5 à −1 → moyenne +0,167. Tirages indépendants : erreur 0,13 ;
  // par créneau : ≈ 0,30 (5 paires au même instant = un seul pari) → pas prouvé, même à 1 erreur type
  const cl = []; for (let b = 0; b < 12; b++) for (let j = 0; j < 5; j++) cl.push({ c: 0.4, n: b < 7 ? 1 : -1, b: 2 * b });
  const t1 = mk({ z: 1 }); const r = t1.c._thEval(cl); const naive = Math.sqrt(cl.reduce((s, o) => s + (o.n - 1 / 6) ** 2, 0) / (cl.length - 1)) / Math.sqrt(cl.length);
  assert.ok(1 / 6 - naive > 0, 'en tirages indépendants ce serait prouvé');
  assert.strictEqual(r.open, false); assert.ok(r.near.se > 0.29 && r.near.se < 0.31, 'erreur par créneau ' + r.near.se);
});

T('M3 · recouvrement : un trade de H bougies déborde sur le créneau suivant — l\'erreur type compte Σ r_b·r_b+1 (jamais moins que sans) ; même calcul qu\'à la main', () => {
  const t = mk();
  // 10 couples de créneaux voisins (2i, 2i+1) de même valeur : forte ressemblance d'un créneau au suivant
  const a = []; for (let i = 0; i < 10; i++) for (const b of [2 * i, 2 * i + 1]) for (let j = 0; j < 3; j++) a.push({ c: 0.3, n: i < 6 ? 0.9 : -0.6, b });
  const r = t.c._thEval(a), se = refSe(a);
  assert.ok(Math.abs(r.near.se - se) < 1e-12, r.near.se + ' ≠ ' + se);
  const spaced = a.map(o => ({ c: o.c, n: o.n, b: 3 * o.b }));   // mêmes trades, créneaux jamais voisins
  const r2 = t.c._thEval(spaced); assert.ok(Math.abs(r2.near.se - refSe(spaced)) < 1e-12); assert.ok(r.near.se > r2.near.se * 1.5, 'voisins qui se ressemblent : erreur plus grande');
  // voisins qui s'opposent : jamais moins que sans recouvrement
  const alt = []; for (let b = 0; b < 20; b++) for (let j = 0; j < 3; j++) alt.push({ c: 0.3, n: b % 2 ? 0.9 : -0.3, b });
  const r3 = t.c._thEval(alt), altSp = alt.map(o => ({ c: o.c, n: o.n, b: 3 * o.b }));
  assert.ok(Math.abs(r3.near.se - t.c._thEval(altSp).near.se) < 1e-12, 'plancher : l\'erreur sans recouvrement');
  // verdict qui bascule : prouvé si l'on oublie le recouvrement, pas prouvé sinon
  const flip = []; for (let i = 0; i < 12; i++) for (const b of [2 * i, 2 * i + 1]) for (let j = 0; j < 2; j++) flip.push({ c: 0.5, n: i < 8 ? 0.6 : -0.4, b });
  const m = flip.reduce((s, o) => s + o.n, 0) / flip.length;
  assert.ok(m - 2 * refSe(flip.map(o => ({ c: o.c, n: o.n, b: 3 * o.b }))) > 0, 'sans recouvrement : prouvé');
  assert.strictEqual(t.c._thEval(flip).open, false, 'avec recouvrement : pas prouvé');
});

T('M4 · parmi les niveaux prouvés : celui qui aurait rapporté le PLUS au total ; ex æquo jugés ensemble', () => {
  const t = mk();
  const hi = obs(40, 0.6, i => 0.5 + (i % 2 ? 0.05 : -0.05), 20);
  let r = t.c._thEval(hi.concat(obs(60, 0.4, i => 0.1 + (i % 2 ? 0.05 : -0.05), 20)));
  assert.strictEqual(r.level, 0.4, 'les trades 0,4-0,6 gagnent aussi : 20 + 6 > 20');
  r = t.c._thEval(hi.concat(obs(60, 0.4, i => -0.2 + (i % 2 ? 0.05 : -0.05), 20)));
  assert.strictEqual(r.level, 0.6, 'les trades 0,4-0,6 perdent : on reste à 0,6');
  r = t.c._thEval(obs(20, 0.5, 0.6, 10).concat(obs(20, 0.5, -0.9, 10, 10)));
  assert.strictEqual(r.open, false, '40 trades à 0,5 : moyenne −0,15, jamais la moitié gagnante seule');
});

T('M5 · trade virtuel : entrée au DERNIER PRIX RÉEL (pas la clôture déjà vue, pas ps.price qui peut dater), sortie = clôture de la bougie qui contient « note + H bougies », jugé seulement quand elle est close ; net = sens × mouvement − coût', () => {
  const k = 100 * Q, tn = k + Q + 30000;   // décision 30 s après la clôture de la bougie k
  const ser = [{ ts: k - Q, c: 99 }, { ts: k, c: 100 }, { ts: k + Q, c: 100.3 }];
  const t = mk({ now: tn, S: { realPairCycle: { 'SOL/USDT': k }, realCandles: { 'SOL/USDT': { '15m': ser } }, tradeContextMemory: [{ closedAt: 1, holdMinutes: 30 }] } });
  t.c.__px['SOL/USDT'] = 100.2;
  assert.strictEqual(t.c._thNote('SOL/USDT', 0.42, 'calm'), true);
  assert.strictEqual(t.c._thNote('SOL/USDT', 0.42, 'calm'), false, 'une seule fois par bougie');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(t.S.dcThreshold.pend[0])), { p: 'SOL/USDT', k, tn, px: 100.2, d: 1, c: 0.42, h: 2, x: k + 3 * Q, b: Math.floor(tn / (3 * Q)), r: 'c', tf: '15m' });
  ser.push({ ts: k + 2 * Q, c: 101 }, { ts: k + 3 * Q, c: 102 }); t.c.__now = k + 3 * Q + 60000;   // bougie de sortie EN COURS
  assert.strictEqual(t.c._thJudge(), 0, 'bougie de sortie pas encore close'); assert.strictEqual(t.S.dcThreshold.pend.length, 1);
  ser.push({ ts: k + 4 * Q, c: 103 }); t.c.__now = k + 4 * Q + 1000;
  assert.strictEqual(t.c._thJudge(), 1);
  const o = t.S.dcThreshold.obs[0]; assert.ok(Math.abs(o.n - (Math.round(((102 - 100.2) / 100.2 * 100 - 0.275) * 10000) / 10000)) < 1e-12, 'long : +1,80 % − 0,275 % = ' + o.n);
  assert.strictEqual(o.t, tn); assert.strictEqual(o.p, 'SOL/USDT'); assert.strictEqual(t.S.dcThreshold.pend.length, 0);
  // short : le même mouvement se paie
  t.S.realPairCycle['SOL/USDT'] = k + 3 * Q; t.c.__now = k + 4 * Q + 1000; t.c.__px['SOL/USDT'] = 103.5; assert.strictEqual(t.c._thNote('SOL/USDT', -0.3, 'volatile_bull'), true);
  ser.push({ ts: k + 5 * Q, c: 104 }, { ts: k + 6 * Q, c: 105 }, { ts: k + 7 * Q, c: 105 }); t.c.__now = k + 7 * Q + 1000; t.c._thJudge();
  const o2 = t.S.dcThreshold.obs[1]; assert.ok(Math.abs(o2.n - (Math.round((-(105 - 103.5) / 103.5 * 100 - 0.275) * 10000) / 10000)) < 1e-12, 'short : sortie à la clôture de k+6 = ' + o2.n); assert.strictEqual(o2.r, 'v');
  assert.ok(t.S.dcThreshold.rule && t.S.dcThreshold.rule.n === 2, 'le seuil est recalculé après chaque jugement');
});

T('M6 · jamais inventé : prix réel absent ou figé (> 2 min), bougie close ou en cours de bouche-trou → pas de trade virtuel ; sortie en bouche-trou ou juste avant une coupure → abandonné ; sortie introuvable → abandonné ; signal nul, mode simulé → rien', () => {
  const k = 200 * Q;
  const ser = [{ ts: k - Q, c: 50 }, { ts: k, c: 50, _gap: true }, { ts: k + Q, c: 50 }];
  const t = mk({ now: k + Q + 5000, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': ser } } } });
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 'calm'), false, 'pas de prix réel');
  t.c.__px['ETH/USDT'] = 51; t.c.__px['BTC/USDT'] = 60000; t.c.__age['ETH/USDT'] = 120001;
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 'calm'), false, 'prix réel figé depuis plus de 2 min');
  t.c.__age['ETH/USDT'] = 5000;
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 'calm'), false, 'bougie close = bouche-trou');
  delete ser[1]._gap; ser[2]._gap = true;
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 'calm'), false, 'bougie en cours = bouche-trou');
  delete ser[2]._gap;
  assert.strictEqual(t.c._thNote('ETH/USDT', 0, 'calm'), false, 'signal nul');
  assert.strictEqual(t.c._thNote('BTC/USDT', 0.5, 'calm'), false, 'pas de bougie close connue');
  assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 'calm'), true);
  const q = t.S.dcThreshold.pend[0]; assert.strictEqual(q.h, 1, 'sans trade réel clos : horizon 1 bougie'); assert.strictEqual(q.x, k + 2 * Q);
  ser.push({ ts: k + 2 * Q, c: 49, _gap: true }, { ts: k + 3 * Q, c: 52 }); t.c.__now = k + 3 * Q + 1000;
  assert.strictEqual(t.c._thJudge(), 0); assert.strictEqual(t.S.dcThreshold.pend.length, 0, 'sortie dans une coupure : abandonné'); assert.strictEqual(t.S.dcThreshold.obs.length, 0, 'aucun résultat inventé');
  t.S.realPairCycle['ETH/USDT'] = k + 2 * Q; assert.strictEqual(t.c._thNote('ETH/USDT', 0.5, 'calm'), false, 'bougie close = bouche-trou');
  // la sortie est une vraie bougie, mais le flux est mort pendant : la suivante est un bouche-trou → sa clôture n'est pas le vrai prix
  const ser2 = [{ ts: k, c: 70 }, { ts: k + Q, c: 70 }, { ts: k + 2 * Q, c: 71 }, { ts: k + 3 * Q, c: 71, _gap: true }, { ts: k + 4 * Q, c: 75 }];
  t.S.realCandles['DOT/USDT'] = { '15m': ser2 }; t.S.dcThreshold.pend = [{ p: 'DOT/USDT', k: k, tn: k + Q + 1000, px: 70, d: 1, c: 0.5, h: 1, x: k + 2 * Q, b: 1, r: 'c', tf: '15m' }];
  t.c.__now = k + 4 * Q + 1000; t.c._thJudge(); assert.strictEqual(t.S.dcThreshold.pend.length, 0, 'sortie juste avant une coupure : abandonné'); assert.strictEqual(t.S.dcThreshold.obs.length, 0);
  t.S.realPairCycle['ETH/USDT'] = k + Q; t.S.dcThreshold.pend = [{ p: 'ETH/USDT', k: k + Q, tn: k + 2 * Q, px: 50, d: 1, c: 0.5, h: 1, x: k + 9 * Q, b: 1, r: 'c', tf: '15m' }];
  t.c.__now = k + 13 * Q; t.c._thJudge(); assert.strictEqual(t.S.dcThreshold.pend.length, 1, 'encore dans les temps (4 bougies de grâce)');
  t.c.__now = k + 13 * Q + 1; t.c._thJudge(); assert.strictEqual(t.S.dcThreshold.pend.length, 0, 'série coupée : abandonné');
  const sim = mk({ S: { tradingMode: 'sim', realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': [{ ts: k, c: 50 }, { ts: k + Q, c: 50 }] } } } });
  assert.strictEqual(sim.c._thNote('ETH/USDT', 0.5, 'calm', 50), false); assert.strictEqual(sim.c._thJudge(), 0); assert.strictEqual(sim.c._thLevel(), null, 'mode simulé : les portes d\'avant');
});

T('M7 · file d\'attente pleine : on refuse les NOUVEAUX, ceux qui arrivent à terme sont jugés quand même', () => {
  const k = 300 * Q;
  const t = mk({ now: k + Q + 1000, S: { realPairCycle: { 'ADA/USDT': k }, realCandles: { 'ADA/USDT': { '15m': [{ ts: k, c: 1 }, { ts: k + Q, c: 1 }] } } } });
  const full = Array.from({ length: t.run('TH_PEND_MAX') }, (_, i) => ({ p: 'X' + i, k: 1, tn: k, px: 1, d: 1, c: 0.1, h: 1, x: k + 99 * Q, b: 0, r: 'c', tf: '15m' }));
  full[0] = { p: 'ADA/USDT', k: k - Q, tn: k - Q, px: 1, d: 1, c: 0.1, h: 1, x: k, b: 0, r: 'c', tf: '15m' };   // le plus ancien : sa sortie (k) est close
  t.S.dcThreshold = { obs: [], pend: full };
  t.c.__px['ADA/USDT'] = 1; assert.strictEqual(t.c._thNote('ADA/USDT', 0.4, 'calm'), false, 'file pleine : le nouveau est refusé');
  assert.strictEqual(t.c._thJudge(), 1, 'le plus ancien est jugé'); assert.strictEqual(t.S.dcThreshold.pend.length, t.run('TH_PEND_MAX') - 1);
});

T('M8 · horizon = durée médiane des 30 derniers trades réels clos (en bougies du mode) ; RE lit sa propre unité', () => {
  const t = mk({ S: { tradeContextMemory: [10, 20, 30, 40, 1000].map(h => ({ closedAt: 1, holdMinutes: h })).concat([{ closedAt: null, holdMinutes: null }]) } });
  assert.strictEqual(t.c._thHorizon(Q), 2, 'médiane 30 min → 2 bougies de 15 min');
  t.S.tradeContextMemory = Array.from({ length: 30 }, () => ({ closedAt: 1, holdMinutes: 60 })).concat([{ closedAt: 1, holdMinutes: 5 }]);
  assert.strictEqual(t.c._thHorizon(Q), 4, 'les 30 derniers seulement');
  t.S.tradeContextMemory = [{ closedAt: 1, holdMinutes: 20 }, { closedAt: 1, holdMinutes: 40 }];
  assert.strictEqual(t.c._thHorizon(Q), 2, 'nombre pair : moyenne des deux du milieu');
  assert.strictEqual(t.c._thHorizon(3600000), 1, 'bougies d\'1 h : au moins 1');
  t.S.tradingMode = 'real'; t.S.realTimeframe = '1h'; t.S.paperRealTimeframe = '15m'; assert.strictEqual(t.run('_thTf()'), '1h');
});

T('M9 · _thLevel : fermé (Infinity) tant que rien n\'est prouvé, ouvert au niveau prouvé ; journal 🎚 à chaque changement seulement ; fenêtre des 2000 derniers', () => {
  const t = mk({ now: 500 * Q });
  assert.strictEqual(t.c._thLevel(), Infinity, 'système neuf : fermé');
  assert.strictEqual(t.S.chainLog.length, 1); assert.ok(/Seuil appris · marché fermé — aucun niveau de consensus ne paie encore les frais \(pas encore assez de trades virtuels : 0 jugés\)/.test(t.S.chainLog[0].desc), t.S.chainLog[0].desc);
  t.c._thRefresh(); assert.strictEqual(t.S.chainLog.length, 1, 'rien ne change : rien au journal');
  t.S.dcThreshold.obs = obs(40, 0.35, i => 0.3 + (i % 2 ? 0.05 : -0.05), 20); t.c._thRefresh();
  assert.strictEqual(t.c._thLevel(), 0.35); assert.ok(/Seuil appris · ouvert à conviction ≥ 0,35 — les trades virtuels de ce niveau et au-dessus gagnent \+0,30 %\/trade net de frais \(40 trades, 20 créneaux\)/.test(t.S.chainLog[1].desc), t.S.chainLog[1].desc);
  t.S.dcThreshold.obs = t.S.dcThreshold.obs.concat(obs(200, 0.5, -0.5, 30)); t.c._thRefresh();
  assert.strictEqual(t.c._thLevel(), Infinity, 'les trades plus forts perdent : le niveau 0,35 ne paie plus au total → fermé');
  assert.ok(/marché fermé/.test(t.S.chainLog[2].desc));
  const k = 600 * Q; t.S.dcThreshold.obs = obs(2100, 0.2, -0.1, 40); t.S.realPairCycle = { 'SOL/USDT': k };
  t.S.realCandles = { 'SOL/USDT': { '15m': [{ ts: k, c: 10 }, { ts: k + Q, c: 10 }, { ts: k + 2 * Q, c: 10 }, { ts: k + 3 * Q, c: 10 }] } };
  t.c.__now = k + Q + 1000; t.c.__px['SOL/USDT'] = 10; assert.strictEqual(t.c._thNote('SOL/USDT', 0.2, 'calm'), true); t.c.__now = k + 3 * Q + 1000; t.c._thJudge();
  assert.strictEqual(t.S.dcThreshold.obs.length, 2000); assert.strictEqual(t.S.dcThreshold.obs[1999].t, k + Q + 1000, 'le plus récent est gardé');
});

T('S1 · 10f : ouvertures au seuil appris en EV / RE, coup de pouce neutralisé sur lui, « Signal inversé » à la règle d\'avant, trade virtuel à chaque cycle', () => {
  const core = codeStrict(between(s10f, 'function _resolvePairCycleCore(pair, ps) {', "if(typeof _resolvePairCycleCore==='function')", false));
  const iJ = core.indexOf('_thJudge()'), iR = core.indexOf('runRosterAnalysis(pair)'), iN = core.indexOf('_thNote(pair, finalSignalWithMem, _currentRegime)'), iE = core.indexOf('const effectiveConviction');
  assert.ok(iJ > 0 && iJ < iR, 'trades virtuels jugés avant le roster'); assert.ok(iN > iE, 'trade virtuel noté après la conviction');
  assert.ok(core.includes("const _thL  = (typeof _thLevel === 'function') ? _thLevel() : null;") && core.includes('const _thOn = (_thL !== null);'));
  assert.ok(core.includes('const _boostHand = (S._convBoost || 0);') && core.includes('const _boost = _thOn ? 0 : _boostHand;'));
  assert.ok(core.includes('const _gates = _thOn ? {conv:_thL, dir:_thL} : _gatesHand;') && core.includes("const _gatesHand = (_mktReg==='calm') ? {conv:0.35, dir:0.20}"));
  assert.strictEqual((core.match(/S\._convBoost/g) || []).length, 1, 'le coup de pouce ne passe que par _boostHand');
  assert.ok(core.includes('const convGate = effectiveConviction >= (_gates.conv + _expPenalty + _ecoMalus + _heatDelta + _newsDelta - _corrBonus - _boost);'));
  assert.ok(core.includes('const dirGate  = Math.abs(finalSignalWithMem) >= (_gates.dir - _boost * 0.5);'));
  assert.ok(core.includes('const _revConv = effectiveConviction >= (_gatesHand.conv + _expPenalty + _ecoMalus + _heatDelta + _newsDelta - _corrBonus - _boostHand);'));
  assert.ok(core.includes('const sigDir=_revBuy?1:_revSell?-1:0;') && !core.includes('const sigDir=isBuy'));
  assert.ok(core.includes('const _convFloor = ((_thOn ? _thL : 0.30) - Math.min(0.04, _boost * 0.5)) + (_pairWatch ? 0.12 : 0)'));
  assert.ok(core.includes('np._thL = _thOn ? _thL : null;') && core.includes("${_thOn ? 'Seuil appris:' + (_thL*100).toFixed(0) + '% ' : ''}"));
});

T('S2 · portes de 10f EXÉCUTÉES (texte livré) : seuil 0,30 → 0,31 passe, 0,29 non, le consensus seul doit l\'atteindre ; fermé → rien ne passe, même à 1,0, mais le retournement d\'une position reste vu ; coup de pouce sans effet sur le seuil appris ; sans seuil → tout comme avant', () => {
  const gateTxt = s10f.slice(s10f.indexOf('  const _mktReg ='), s10f.indexOf('  const lmsrAlignBuy'));
  const decTxt = s10f.slice(s10f.indexOf('  const lmsrAlignBuy'), s10f.indexOf('  const action = '));
  const floorTxt = s10f.slice(s10f.indexOf('  const _convFloor ='), s10f.indexOf('  if(_gainNet < _minNetGain'));
  assert.ok(gateTxt.includes('const dirGate') && decTxt.includes('const _revSell') && floorTxt.includes('_convFloor'));
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
  let g = gates(0.30, 0.31, 0.31); assert.strictEqual(g.buy, true); assert.ok(Math.abs(g.floor - 0.30) < 1e-9, 'plancher = seuil appris');
  g = gates(0.30, 0.29, 0.29); assert.strictEqual(g.conv, false); assert.strictEqual(g.buy, false);
  g = gates(0.30, 0.31, 0.29); assert.strictEqual(g.conv, true); assert.strictEqual(g.dir, false, 'le bonus technique ne remplace pas le consensus');
  g = gates(Infinity, 1, 1); assert.strictEqual(g.buy, false); assert.strictEqual(g.floor, Infinity, 'marché fermé');
  g = gates(Infinity, 0.40, -0.30); assert.strictEqual(g.sell, false); assert.strictEqual(g.revSell, true, 'fermé aux ouvertures, mais un retournement (règle d\'avant) coupe encore une position');
  g = gates(0.30, 0.27, 0.27, 0.06); assert.strictEqual(g.conv, false); assert.strictEqual(g.dir, false); assert.ok(Math.abs(g.floor - 0.30) < 1e-9, 'coup de pouce sans effet sur le seuil appris');
  for (const [cv, sg, bo, rg] of [[0.40, 0.30, 0, 'calm'], [0.30, 0.30, 0.06, 'calm'], [0.20, -0.12, 0, 'volatile'], [0.26, 0.16, 0, 'bull'], [0.24, 0.16, 0, 'bull']]) {
    for (const th of [undefined, null]) {
      g = gates(th, cv, sg, bo, rg);
      assert.strictEqual(g.buy, g.revBuy); assert.strictEqual(g.sell, g.revSell, 'sans seuil : ouverture et retournement identiques (règle d\'avant)');
    }
  }
  g = gates(undefined, 0.40, 0.30); assert.strictEqual(g.buy, true); assert.ok(Math.abs(g.floor - 0.30) < 1e-9, 'sans seuil : calme 0,35 / 0,20, plancher 0,30');
  g = gates(undefined, 0.30, 0.30, 0.06); assert.strictEqual(g.buy, true, '0,35 − 0,06'); assert.ok(Math.abs(g.floor - 0.27) < 1e-9, 'sans seuil : le coup de pouce agit comme avant');
});

T('S3 · persistance (snapshot, relecture, manifeste) et écran « Ce que le système a appris »', () => {
  assert.ok(s9b1.includes('dcThreshold: S.dcThreshold || null,'));
  assert.ok(s9b2.includes("if (snap.dcThreshold && typeof snap.dcThreshold === 'object')             S.dcThreshold       = snap.dcThreshold;"));
  assert.ok(s9b2.includes("'botMerit','dcVoices','dcThreshold',"));
  const src = rd('js/11b-ecran-appris.js').replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const S = { tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {},
    dcThreshold: { obs: [{}, {}, {}], pend: [{}], rule: { open: false, n: 3, h: 2, cost: 0.275, near: { level: 0.31, mean: -0.18, se: 0.07, n: 64, blocks: 14 }, byRegime: { c: { n: 50, s: -12 }, v: { n: 14, s: 1.4 } } } } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [] };
  vm.createContext(c); vm.runInContext(src, c);
  let h = vm.runInContext('_learnedPanelHtml()', c);
  assert.ok(h.includes('SEUIL D\'OUVERTURE APPRIS') && h.includes('marché fermé') && h.includes('3 jugés · 1 en attente') && h.includes('horizon 2 bougies · coût 0.275 %'), h.slice(h.indexOf('SEUIL'), h.indexOf('SEUIL') + 900));
  assert.ok(h.includes('le plus proche') && h.includes('≥ 0.31 : -0.18 %/trade (± 0.07)') && h.includes('64 trades · 14 créneaux') && h.includes('calme -0.24 % (50) · volatil +0.10 % (14)'));
  S.dcThreshold.rule = { open: true, level: 0.44, h: 1, cost: 0.275, best: { level: 0.44, mean: 0.12, se: 0.05, n: 41, blocks: 18 }, byRegime: {} };
  h = vm.runInContext('_learnedPanelHtml()', c);
  assert.ok(h.includes('ouvert · conviction ≥ 0.44') && h.includes('niveau prouvé') && h.includes('+0.12 %/trade') && h.includes('horizon 1 bougie ·'));
  S.dcThreshold = null; h = vm.runInContext('_learnedPanelHtml()', c); assert.ok(h.includes('pas encore de trade virtuel jugé (0 en attente)'));
});

console.log(`\n${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
