// banc-fitness-horizons.js — [FITNESS AUX HORIZONS · 28/09/2026] VERSION 20260928a
// Rams (28/09 04:29, « Go ») : juger aussi la fitness des sièges (ce qui décide l'évolution) aux horizons, avec la même comparaison et le
// même garde-fou que le poids des voix ; toujours sans trader ; rejoué avant livraison.
// Fonctions RÉELLES de 03 en vm (fitness glissante + décision commune + moteur des trades virtuels) ; textes de 03, 07 ; panneau RÉEL de 11b.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 50)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js');
const FIT = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false);
const DC = between(s03, "const _DC_BOTS = ['scalper_bot_v1', 'arb_bot_v1', 'dca_bot_v1'];", 'window._thNote = _thNote;', false);
const Q = 900000, HZ = [1, 2, 4, 8, 16], R4 = x => Math.round(x * 10000) / 10000, J = x => JSON.parse(JSON.stringify(x));
function mk(o) {
  o = o || {};
  const S = Object.assign({ tradingMode: 'paperReal', paperRealTimeframe: '15m', chainLog: [], realPairCycle: {}, realCandles: {}, pairStates: {}, agents: [] }, o.S || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, Date: { now: () => c.__now }, __now: o.now || 0, __px: {}, __age: {}, PAIRS: {},
    _ownStakeCostPct: () => (o.cost === undefined ? 0.275 : o.cost), nowStr: () => '12:00:00' };
  c._rcLastPrice = p => c.__px[p] || 0; c._rcPriceAge = p => (c.__age[p] === undefined ? 0 : c.__age[p]);
  vm.createContext(c); vm.runInContext(FIT + '\n' + DC, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
// un siège avec n jugements à la bougie tous justes (E = 1), tous faux (−1) ou mêlés (null → 0)
const seat = (id, E, n) => ({ id, name: id, fitness: 350, score: 0.1, _judgments: Array.from({ length: n === undefined ? 10 : n }, (_, i) => ({ s: E === null ? (i % 2 ? 1 : -1) : (E >= 0 ? 1 : -1), w: 1, k: i })) });
// record aux horizons à plat : E_h = e pour chacun des 5 horizons (n jugements, v = 0,5)
const rec = (e, n) => HZ.map(() => { const N = n === undefined ? (Math.abs(e) === 1 ? 6 : 20) : n, pos = Math.round(N * (1 + e) / 2); return Array.from({ length: N }, (_, i) => [500, i < pos ? 100 : -100]).reduce((a, p) => a.concat(p), []); });   // E_h = e exactement (pos − neg) / N
const series = (k, px) => [{ ts: k - Q, o: px, h: px, l: px, c: px }, { ts: k, o: px, h: px, l: px, c: px }, { ts: k + Q, o: px, h: px, l: px, c: px }];
console.log('▶ banc-fitness-horizons');

T('M1 · _fitHz : 350 + 1 000 × moyenne des 5 E_h (fenêtre apprise, ≥ 5 jugements par horizon), bornée 50-2 000 comme _fitOf ; null tant qu\'un horizon manque ; jamais pour un bot, le méta ou la voix composite', () => {
  const t = mk({ now: 1000 * Q }); t.run('_thState()'); const T3 = t.S.dcThreshold;
  const a = seat('a1', 1), bot = { id: 'scalper_bot_v1', isBot: true, fitness: 500, _judgments: [] }, meta = { id: 'evo', isMeta: true, fitness: 350, _judgments: [] };
  assert.strictEqual(t.c._fitHz(a), null, 'pas de record');
  T3.vHz = { a1: rec(1), scalper_bot_v1: rec(1), evo: rec(1), composite: rec(1) };
  assert.strictEqual(t.c._fitHz(a), 1350, 'toujours juste : 1 350, jamais 2 000'); assert.strictEqual(t.c._fitHz(bot), null); assert.strictEqual(t.c._fitHz(meta), null); assert.strictEqual(t.c._fitHz({ id: 'composite', _judgments: [] }), null);
  T3.vHz.a1 = rec(-1); assert.strictEqual(t.c._fitHz(a), 50, 'toujours faux : plancher 50'); T3.vHz.a1 = rec(0); assert.strictEqual(t.c._fitHz(a), 350, 'pile-ou-face : 350');
  T3.vHz.a1 = rec(0.3); assert.strictEqual(t.c._fitHz(a), 650); T3.vHz.a1[2] = [500, 100, 500, 100, 500, 100, 500, 100]; assert.strictEqual(t.c._fitHz(a), null, '4 jugements à 1 h : pas encore');
  // fenêtre apprise : les W derniers jugements seulement
  T3.vHz.a1 = rec(-1, 20); t.c.__W = 60; assert.strictEqual(t.c._fitHz(a), 50);
  T3.vHz.a1 = T3.vHz.a1.map(L => L.concat([500, 100, 500, 100, 500, 100, 500, 100, 500, 100])); t.c._fitWindow = () => 5; t.run('_fitWindow = () => 5');
  assert.strictEqual(t.c._fitHz(a), 1350, 'fenêtre 5 : les 5 derniers, tous justes'); t.run('_fitWindow = () => 60'); assert.strictEqual(t.c._fitHz(a), 50, 'fenêtre 60 : les 25 (E = −0,6 → −250 → plancher 50)'); assert.ok(Math.abs(t.c._vjE('a1', 60) - (-20 + 5) / 25) < 1e-12);
  assert.ok(Math.abs(t.c._vjE('a1', 60) - (-20 + 5) / 25) < 1e-12 && Math.abs(t.c._dcMeritHz('a1') - 0) < 1e-12, '_vjE brut, _dcMeritHz borné à 0 : même record');
});

T('M2 · _fitCurrent : la porte unique — siège avec record complet et définition vivante « hz » → aux horizons ; sinon sa fenêtre à la bougie (_fitOf) ; null sans preuve (fitness de naissance conservée) ; bots / méta : toujours leur fenêtre ; UNE définition vivante pour tous les pas de temps (bougie dès qu\'un pas l\'a prouvé), la preuve restant par pas de temps', () => {
  const t = mk({ now: 1000 * Q, S: { tradingMode: 'real', realTimeframe: '1h', paperRealTimeframe: '15m' } }); t.run('_thState()'); const T3 = t.S.dcThreshold;
  const a = seat('a1', 1), young = seat('a2', 1, 3), bot = { id: 'b', isBot: true, fitness: 500, _judgments: Array.from({ length: 6 }, () => ({ s: -1, w: 1 })) };
  T3.vHz = { a1: rec(-1), a2: rec(-1), b: rec(-1) };
  assert.strictEqual(t.c._fjMode(), 'hz'); assert.strictEqual(t.c._fitCurrent(a), 50, 'hz : le record aux horizons (bougie dirait 1 350)');
  assert.strictEqual(t.c._fitCurrent(young), 50, 'record complet aux horizons mais 3 jugements à la bougie : les horizons suffisent');
  T3.vHz.a2 = rec(-1, 3); assert.strictEqual(t.c._fitCurrent(young), null, 'ni record complet ni 5 jugements : pas de preuve → la fitness en place reste');
  assert.strictEqual(t.c._fitCurrent(bot), 50, 'bot : sa fenêtre (6 erreurs), jamais le record de sa lecture de paire');
  T3.fModes = { 60: 'bougie' }; assert.strictEqual(t.c._fjMode(), 'bougie', 'retour prouvé en 1 h'); assert.strictEqual(t.c._fitCurrent(a), 1350, 'retour prouvé à la bougie');
  T3.fModes = { 15: 'bougie' }; assert.strictEqual(t.c._fjMode(), 'bougie', 'une seule fitness par siège : le retour prouvé en 15 min (EV) vaut aussi quand RE (1 h) bat'); assert.strictEqual(t.c._fitCurrent(a), 1350);
  t.S.tradingMode = 'paperReal'; assert.strictEqual(t.c._fjMode(), 'bougie'); assert.strictEqual(t.c._fitCurrent(a), 1350);
  T3.fModes = { 15: 'hz', 60: 'hz' }; assert.strictEqual(t.c._fjMode(), 'hz', 'aucun pas de temps en retour : horizons'); assert.strictEqual(t.c._fitCurrent(a), 50);
  T3.fModes = { 60: 'bougie' }; assert.deepStrictEqual([t.c._vjMode(15, 'f'), t.c._vjMode(60, 'f'), t.c._fjMode()], ['hz', 'bougie', 'bougie'], 'la preuve, elle, reste par pas de temps (_vjMode(fm, « f ») ; écran 11b)');
});

T('M3 · _fitJudge, la branche d\'abstention et _fitRecomputeAll passent par _fitCurrent ; un jugement à la bougie ne fait plus varier la fitness d\'un siège jugé aux horizons ; sans _fitCurrent (bloc FIT seul) : comme avant', () => {
  const t = mk({ now: 1000 * Q }); t.run('_thState()'); const T3 = t.S.dcThreshold;
  const a = seat('a1', 1); t.S.agents = [a, seat('a2', null), { id: 'b', isBot: true, fitness: 500, _judgments: Array.from({ length: 6 }, () => ({ s: 1, w: 1 })) }];
  assert.strictEqual(t.c._fitJudge(a, 1, 1), 1350, 'sans record : la bougie, comme avant');
  T3.vHz = { a1: rec(-1) }; assert.strictEqual(t.c._fitJudge(a, 1, 1), 50, 'record complet : la bonne réponse à la bougie ne change rien, la fitness suit les horizons'); assert.strictEqual(a._judgments.length, 12, 'le jugement à la bougie est quand même gardé (poids de la voix, fenêtre apprise, essai d\'évolution)');
  a.fitness = 999; assert.strictEqual(t.c._fitRecomputeAll(), 2, 'recalculés : a1 999 → 50, bot 500 → 1 350 (a2 déjà à 350)'); assert.deepStrictEqual(t.S.agents.map(x => x.fitness), [50, 350, 1350]);
  T3.fModes = { 15: 'bougie' }; assert.strictEqual(t.c._fitRecomputeAll(), 1); assert.strictEqual(a.fitness, 1350, 'retour à la bougie : recalculée');
  T3.fModes = {}; const noJ = { id: 'a9', fitness: 350 }; t.S.agents.push(noJ); T3.vHz.a9 = rec(-1);
  assert.strictEqual(t.c._fitRecomputeAll(), 2, 'a1 1 350 → 50 ; a9 (aucun tableau de jugements, record complet) 350 → 50'); assert.strictEqual(noJ.fitness, 50, 'un siège jamais jugé à la bougie reçoit quand même sa fitness aux horizons');
  a.fitness = 999; noJ.fitness = 999; assert.strictEqual(t.c._fitRecomputeAll({ a1: 1 }), 1, 'only : ces agents seulement (_vjJudge)'); assert.deepStrictEqual([a.fitness, noJ.fitness], [50, 999]);
  // première fitness aux horizons : une ligne, une fois (learnFromOutcome avant l'évolution, ou _vjJudge)
  t.c.__now = 1000 * Q + 5; assert.strictEqual(t.c._fitHzFirst(), true); assert.strictEqual(T3.fSince, 1000 * Q + 5); assert.ok(/^Fitness des sièges : désormais leur bilan aux horizons — 2 siège\(s\) au record complet/.test(t.S.chainLog[t.S.chainLog.length - 1].desc));
  assert.strictEqual(t.c._fitHzFirst(), false, 'déjà écrite'); T3.fSince = 0; T3.fModes = { 15: 'bougie' }; assert.strictEqual(t.c._fitHzFirst(), false, 'définition à la bougie : rien'); T3.fModes = {};
  const c03b = codeStrict(s03), iRef = c03b.indexOf("try { if (typeof _fitWindowRefresh === 'function') _fitWindowRefresh(); } catch(e) {}"), iFirst = c03b.indexOf("try { if (typeof _fitHzFirst === 'function') _fitHzFirst(); } catch(e) {}"), iEvo = c03b.indexOf('const sorted = [...S.agents].filter(a=>!a.isBot&&!a.isMeta).sort((a,b)=>a.fitness-b.fitness);');
  assert.ok(iRef > 0 && iFirst > iRef && iEvo > iFirst, 'learnFromOutcome : fenêtre → ligne « désormais » → évolution');
  // le texte : les trois portes
  const c03 = codeStrict(s03);
  assert.ok(c03.includes("  var f = (typeof _fitCurrent === 'function') ? _fitCurrent(a) : _fitOf(a._judgments, _fitWindow());"), '_fitJudge');
  assert.ok(c03.includes("      try { const _fw = (typeof _fitCurrent === 'function') ? _fitCurrent(a) : _fitOf(a._judgments || [], _fitWindow()); if (_fw !== null) a.fitness = _fw; if (_fw !== null && typeof _lmsrRefill === 'function') _lmsrRefill(a); } catch(e) {}"), 'abstention (+ recharge du portefeuille de marché, MARCHÉ LMSR À PART)');
  assert.ok(c03.includes("    var f = (typeof _fitCurrent === 'function') ? _fitCurrent(a) : _fitOf(Array.isArray(a._judgments) ? a._judgments : [], W);"), '_fitRecomputeAll');
  assert.strictEqual((c03.match(/\ba\.fitness = /g) || []).length, (codeStrict(rd('js/03-per-pair-position-buttons-controls-buid.js')).match(/\ba\.fitness = /g) || []).length, 'aucun écrivain de fitness ajouté : _vjJudge passe par _fitRecomputeAll(only)');
  assert.ok(c03.includes('    if (nS) _fitRecomputeAll(only);') && !c03.includes('a.fitness = fv'), 'queue de _vjJudge : la porte, pas un écrivain');
  assert.strictEqual((c03.match(/return Math\.max\(50, Math\.min\(2000, Math\.round\(350 \+ 1000 \* E\)\)\);/g) || []).length, 1, 'l\'échelle vit une fois (_fitScale)'); assert.ok(c03.includes('return _fitScale(E);') && c03.includes('return e === null ? null : _fitScale(e);'), '_fitOf et _fitHz l\'appellent');
  // bloc FIT seul (comme les bancs de la fitness glissante) : _fitCurrent absent → comportement d'avant
  const c = { Math, Number, Array, window: {} }; vm.createContext(c); vm.runInContext(FIT, c);
  const b = { id: 'x', fitness: 350, _judgments: [] }; c.b = b; for (let i = 0; i < 6; i++) vm.runInContext('_fitJudge(b, 1, 1)', c); assert.strictEqual(b.fitness, 1350);
});

T('M4 · _fitPicks : le siège que chaque définition retirerait (le plus faible parmi les sièges jugés ≥ 5 fois à la bougie ; horizons = bougie tant que le record n\'est pas complet) ; _vjNote le mémorise (wB / wH, indices vIds) ; moins de deux sièges → rien', () => {
  const k = 3000 * Q, tn = k + Q + 5000, ser = series(k, 100);
  const t = mk({ now: tn, S: { realPairCycle: { 'SOL/USDT': k }, realCandles: { 'SOL/USDT': { '15m': ser } }, pairStates: { 'SOL/USDT': { _dcVj: { t: tn, v: [['a1', 0.5], ['a3', -0.3]], C1: 0.3, Ch: 0.2 } } } } });
  t.run('_thState()'); const T3 = t.S.dcThreshold; t.c.__px['SOL/USDT'] = 100;
  t.S.agents = [{ id: 'b', isBot: true, fitness: 10, _judgments: Array.from({ length: 6 }, () => ({ s: -1, w: 1 })) }, { id: 'm', isMeta: true, fitness: 10, _judgments: Array.from({ length: 6 }, () => ({ s: -1, w: 1 })) }, seat('a1', 1), seat('a2', -1), seat('a3', null), seat('a4', -1, 2)];
  assert.deepStrictEqual(J(t.c._fitPicks()), { b: 'a2', h: 'a2' }, 'bougie : a2 (50) ; horizons sans record : pareil ; a4 (2 jugements), le bot et le méta ne comptent pas');
  T3.vHz = { a1: rec(-1), a2: rec(1) };
  assert.deepStrictEqual(J(t.c._fitPicks()), { b: 'a2', h: 'a1' }, 'aux horizons a1 est le pire (50) et a2 le meilleur (1 350)');
  assert.strictEqual(t.c._vjNote('SOL/USDT', 2, 2), true); const q = T3.pendV[0];
  assert.deepStrictEqual(J([T3.vIds, q.wB, q.wH]), [['a1', 'a3', 'a2'], 2, 0], 'wB = a2 (ajouté à vIds même s\'il n\'a pas voté), wH = a1');
  assert.deepStrictEqual([q.qB, q.qH], [0, 500], 'leurs votes de ce cycle mémorisés dans l\'entrée (×1000 ; 0 = pas voté)');
  t.S.agents = [seat('a1', 1)]; assert.deepStrictEqual(J(t.c._fitPicks()), { b: null, h: null });
  const t2 = mk({ now: tn, S: { realPairCycle: { 'X/USDT': k }, realCandles: { 'X/USDT': { '15m': series(k, 5) } }, pairStates: { 'X/USDT': { _dcVj: { t: tn, v: [['a1', 0.4]], C1: 0, Ch: 0 } } } } }); t2.c.__px['X/USDT'] = 5;
  t2.c._vjNote('X/USDT', 2, 2); assert.deepStrictEqual([t2.S.dcThreshold.pendV[0].wB, t2.S.dcThreshold.pendV[0].wH, t2.S.dcThreshold.pendV[0].qB, t2.S.dcThreshold.pendV[0].qH], [-1, -1, 0, 0], 'aucun siège : −1, votes 0');
});

T('M5 · _vjJudge : écart des sièges retirés = qualité du vote de wB − celle de wH (v·D), seulement si les deux ont voté (|v| ≥ 0,03) ; même siège → 0 ; dans T.fCmp (à part de l\'écart des pesées) ; attente par pas de temps ; la fitness des sièges jugés suit aussitôt (sans jugement à la bougie, par _fitRecomputeAll restreint, selon la définition vivante) ; première fitness aux horizons : une ligne au journal ; le siège qui évolue d\'ici l\'horizon reste dans la preuve', () => {
  const k = 4000 * Q, tn = k + Q + 5000, ser = series(k, 100);
  const t = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': ser } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a1', 0.5], ['a2', -0.4], ['a3', 0.02]], C1: 0.3, Ch: -0.1 } } } } });
  t.run('_thState()'); const T3 = t.S.dcThreshold; t.c.__px['ETH/USDT'] = 100;
  const a1 = seat('a1', 1), a2 = seat('a2', -1), a3 = seat('a3', null); t.S.agents = [a1, a2, a3];
  T3.vHz = { a1: rec(-1), a2: rec(1), a3: rec(0) };   // bougie retirerait a2 (50), horizons a1 (50)
  assert.strictEqual(t.c._vjNote('ETH/USDT', 2, 2), true); const q = T3.pendV[0]; assert.deepStrictEqual([T3.vIds[q.wB], T3.vIds[q.wH], q.qB, q.qH], ['a2', 'a1', -400, 500]);
  ser.push({ ts: k + 2 * Q, o: 100.5, h: 100.6, l: 100, c: 100.5 }, { ts: k + 3 * Q, c: 100.5, h: 100.5, l: 100.5 }); t.c.__now = k + 3 * Q + 1000; t.c._thJudge();
  // 15 min : D = +0,5 ; qB = (−0,4)(0,5) = −0,2 ; qH = (0,5)(0,5) = +0,25 ; écart = −0,45 (le siège retiré par la bougie a fait pire : la bougie choisissait mieux ici)
  const key = Object.keys(T3.fCmp[0])[0]; assert.deepStrictEqual(J(T3.fCmp[0][key]), [Math.round(-0.45 * 10000), 1], JSON.stringify(T3.fCmp));
  assert.strictEqual(Object.keys(T3.vCmp[0]).length, 1, 'l\'écart des pesées a le sien, à part'); assert.ok(T3.fRules[15] && T3.fDirtyF[15] === false, 'premier écart : le garde-fou de la fitness est jugé aussitôt (pas de règle encore), attente levée');
  const E15 = (6 * 50000 - 400 * 5000) / (6 * 50000 + 400 * 5000);   // a2 : 6 jugements justes (500 × 100) puis −0,4 × 0,5 : E(15 min) = −0,739
  assert.deepStrictEqual(t.S.agents.map(a => a.fitness), [50, Math.round(350 + 1000 * (E15 + 4) / 5), 350], 'a1 et a2 jugés aux horizons : leur fitness suit aussitôt (a2 1 350 → 1 002 : son mauvais vote pèse) ; a3 : 350 (bougie mêlée, horizons pile-ou-face)');
  const Lf = t.S.chainLog[t.S.chainLog.length - 1]; assert.ok(T3.fSince === k + 3 * Q + 1000 && Lf && Lf.icon === '\uD83E\uDDEC' && Lf.desc === 'Fitness des sièges : désormais leur bilan aux horizons — 3 siège(s) au record complet recalculé(s), les autres restent à la bougie le temps de l\'avoir · le garde-fou appris la ramène à la bougie si elle retirait de plus mauvais sièges', 'première fois : une ligne au journal, datée (T.fSince) — ' + (Lf && Lf.desc));
  const nL = t.S.chainLog.length; ser.push({ ts: k + 4 * Q, c: 100.5, h: 100.5, l: 100.5 }); t.c.__now = k + 4 * Q + 1000; t.c._thJudge(); assert.strictEqual(t.S.chainLog.length, nL, 'la fois suivante : plus de ligne');
  // wH n'a pas voté sur ce cycle → pas d'écart ; même siège → écart 0 compté
  const t2 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': series(k, 100) } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a2', -0.4]], C1: 0.3, Ch: -0.1 } } } } });
  t2.run('_thState()'); t2.c.__px['ETH/USDT'] = 100; t2.S.agents = [seat('a1', 1), seat('a2', -1)]; t2.S.dcThreshold.vHz = { a1: rec(-1), a2: rec(1) };
  t2.c._vjNote('ETH/USDT', 2, 2); const s2 = t2.S.realCandles['ETH/USDT']['15m']; s2.push({ ts: k + 2 * Q, o: 100.5, h: 100.6, l: 100, c: 100.5 }, { ts: k + 3 * Q, c: 100.5, h: 100.5, l: 100.5 }); t2.c.__now = k + 3 * Q + 1000; t2.c._thJudge();
  assert.strictEqual(Object.keys(t2.S.dcThreshold.fCmp[0]).length, 0, 'a1 (wH) n\'a pas voté : rien'); assert.deepStrictEqual(J(t2.S.dcThreshold.fDirtyF), {}); assert.strictEqual(t2.S.dcThreshold.fRules[15], undefined);
  const t3 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': series(k, 100) } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a2', -0.4]], C1: 0.3, Ch: -0.1 } } } } });
  t3.run('_thState()'); t3.c.__px['ETH/USDT'] = 100; t3.S.agents = [seat('a1', 1), seat('a2', -1)];
  t3.c._vjNote('ETH/USDT', 2, 2); const s3 = t3.S.realCandles['ETH/USDT']['15m']; s3.push({ ts: k + 2 * Q, o: 100.5, h: 100.6, l: 100, c: 100.5 }, { ts: k + 3 * Q, c: 100.5, h: 100.5, l: 100.5 }); t3.c.__now = k + 3 * Q + 1000; t3.c._thJudge();
  const k3 = Object.keys(t3.S.dcThreshold.fCmp[0])[0]; assert.deepStrictEqual(J(t3.S.dcThreshold.fCmp[0][k3]), [0, 1], 'même siège des deux côtés : écart 0, compté');
  // wH a « voté » 0,01 (abstention) : pas d'écart
  const t4 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': series(k, 100) } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a2', -0.4], ['a1', 0.01]], C1: 0.3, Ch: -0.1 } } } } });
  t4.run('_thState()'); t4.c.__px['ETH/USDT'] = 100; t4.S.agents = [seat('a1', 1), seat('a2', -1)]; t4.S.dcThreshold.vHz = { a1: rec(-1), a2: rec(1) };
  t4.c._vjNote('ETH/USDT', 2, 2); const s4 = t4.S.realCandles['ETH/USDT']['15m']; s4.push({ ts: k + 2 * Q, o: 100.5, h: 100.6, l: 100, c: 100.5 }, { ts: k + 3 * Q, c: 100.5, h: 100.5, l: 100.5 }); t4.c.__now = k + 3 * Q + 1000; t4.c._thJudge();
  assert.strictEqual(Object.keys(t4.S.dcThreshold.fCmp[0]).length, 0, 'abstention de wH : rien');
  // wH (a1) évolue avant l'horizon : _vjReset retire ses votes de la file — l'écart est quand même compté (qB, qH mémorisés à la note), son record repart de zéro
  const t5 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': series(k, 100) } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a1', 0.5], ['a2', -0.4]], C1: 0.3, Ch: -0.1 } } } } });
  t5.run('_thState()'); t5.c.__px['ETH/USDT'] = 100; t5.S.agents = [seat('a1', 1), seat('a2', -1)]; t5.S.dcThreshold.vHz = { a1: rec(-1), a2: rec(1) };
  t5.c._vjNote('ETH/USDT', 2, 2); assert.strictEqual(t5.c._vjReset('a1'), 2, 'record effacé + 1 vote retiré de la file'); assert.deepStrictEqual(J(t5.S.dcThreshold.pendV[0].v), [[1, -400]]);
  const s5 = t5.S.realCandles['ETH/USDT']['15m']; s5.push({ ts: k + 2 * Q, o: 100.5, h: 100.6, l: 100, c: 100.5 }, { ts: k + 3 * Q, c: 100.5, h: 100.5, l: 100.5 }); t5.c.__now = k + 3 * Q + 1000; t5.c._thJudge();
  const k5 = Object.keys(t5.S.dcThreshold.fCmp[0])[0]; assert.deepStrictEqual(J(t5.S.dcThreshold.fCmp[0][k5]), [Math.round(-0.45 * 10000), 1], 'le siège retiré par les horizons a évolué entre-temps : son vote compte quand même dans la preuve');
  assert.strictEqual(t5.S.dcThreshold.vHz.a1, undefined, 'son record, lui, reste à zéro (nouveau génome)'); assert.strictEqual(t5.S.agents[0].fitness, 350, 'et sa fitness de naissance reste (aucune preuve)');
  // entrée d'avant cette mémoire (sans qB / qH) : les votes sont relus dans la file
  const t6 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': series(k, 100) } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a1', 0.5], ['a2', -0.4]], C1: 0.3, Ch: -0.1 } } } } });
  t6.run('_thState()'); t6.c.__px['ETH/USDT'] = 100; t6.S.agents = [seat('a1', 1), seat('a2', -1)]; t6.S.dcThreshold.vHz = { a1: rec(-1), a2: rec(1) };
  t6.c._vjNote('ETH/USDT', 2, 2); delete t6.S.dcThreshold.pendV[0].qB; delete t6.S.dcThreshold.pendV[0].qH;
  const s6 = t6.S.realCandles['ETH/USDT']['15m']; s6.push({ ts: k + 2 * Q, o: 100.5, h: 100.6, l: 100, c: 100.5 }, { ts: k + 3 * Q, c: 100.5, h: 100.5, l: 100.5 }); t6.c.__now = k + 3 * Q + 1000; t6.c._thJudge();
  const k6 = Object.keys(t6.S.dcThreshold.fCmp[0])[0]; assert.deepStrictEqual(J(t6.S.dcThreshold.fCmp[0][k6]), [Math.round(-0.45 * 10000), 1], 'sans qB / qH : relus dans la file');
  // définition vivante à la bougie : la queue de _vjJudge laisse la fitness à la bougie (pas d'oscillation dans le cycle), pas de ligne « désormais aux horizons »
  const t7 = mk({ now: tn, S: { realPairCycle: { 'ETH/USDT': k }, realCandles: { 'ETH/USDT': { '15m': series(k, 100) } }, pairStates: { 'ETH/USDT': { _dcVj: { t: tn, v: [['a1', 0.5], ['a2', -0.4]], C1: 0.3, Ch: -0.1 } } } } });
  t7.run('_thState()'); t7.c.__px['ETH/USDT'] = 100; t7.S.agents = [seat('a1', 1), seat('a2', -1)]; t7.S.dcThreshold.vHz = { a1: rec(-1), a2: rec(1) }; t7.S.dcThreshold.fModes = { 60: 'bougie' }; for (let b = 0; b < 3; b++) t7.c._vjCmpAdd(t7.S.dcThreshold, 0, tn - b * 7200000, 3600000, -0.6, 'f');   // une preuve vit avec ses créneaux
  t7.c._fitRecomputeAll(); assert.deepStrictEqual(t7.S.agents.map(a => a.fitness), [1350, 50]); t7.c._vjNote('ETH/USDT', 2, 2);
  const s7 = t7.S.realCandles['ETH/USDT']['15m']; s7.push({ ts: k + 2 * Q, o: 100.5, h: 100.6, l: 100, c: 100.5 }, { ts: k + 3 * Q, c: 100.5, h: 100.5, l: 100.5 }); t7.c.__now = k + 3 * Q + 1000; t7.c._thJudge();
  assert.deepStrictEqual(t7.S.agents.map(a => a.fitness), [1350, 50], 'retour prouvé (à un autre pas de temps) : la queue respecte la définition vivante'); assert.strictEqual(t7.S.dcThreshold.fSince, undefined); assert.ok(!t7.S.chainLog.some(x => /désormais leur bilan/.test(x.desc)));
});

T('M6 · garde-fou de la fitness : même jugement que celui des pesées (_vjRefresh kind « f » : créneaux, recouvrement, Student Φ(−2)/25, par pas de temps) ; bascule hz → bougie si « pire » prouvé à un horizon et « meilleur » à aucun, et retour ; la bascule recalcule la fitness de tous les sièges quand la définition vivante (une par siège) change ; journal ⚖️ « Fitness des sièges » (pas de temps de la preuve, unité %×vote) ; les deux garde-fous sont indépendants', () => {
  const now = 9000 * Q, t = mk({ now }); t.run('_thState()'); const T3 = t.S.dcThreshold;
  const a1 = seat('a1', 1), a2 = seat('a2', -1); t.S.agents = [a1, a2]; T3.vHz = { a1: rec(-1), a2: rec(1) }; t.c._fitRecomputeAll(); assert.deepStrictEqual([a1.fitness, a2.fitness], [50, 1350]);
  const b0 = Math.floor(now / (2 * Q)) - 30;
  for (let b = 0; b < 24; b++) for (let j = 0; j < 3; j++) t.c._vjCmpAdd(T3, 0, (b0 + b) * 2 * Q + 1, Q, -0.6, 'f');   // la bougie retirait de plus mauvais sièges, 72 cycles, sans variation
  assert.strictEqual(Object.keys(T3.vCmp[0]).length, 0, 'rien dans l\'écart des pesées'); T3.fDirtyF = { 15: true };
  assert.strictEqual(t.c._fjMode(), 'hz'); const R = t.run("_vjRefresh(900000, 'f')");
  assert.strictEqual(R.mode, 'bougie'); assert.strictEqual(t.c._fjMode(), 'bougie'); assert.strictEqual(t.c._vjMode(), 'hz', 'la pesée des voix, elle, ne bouge pas'); assert.strictEqual(T3.fRules[15], R); assert.strictEqual(T3.fDirtyF[15], false); assert.strictEqual(T3.vRules[15], undefined);
  assert.deepStrictEqual([a1.fitness, a2.fitness], [1350, 50], 'bascule : la fitness de tous les sièges recalculée à la bougie');
  const L1 = t.S.chainLog[t.S.chainLog.length - 1]; assert.ok(L1.icon === '⚖️' && /^Fitness des sièges · retour à la bougie — elle retirait de plus mauvais sièges \(pas de temps 15 min\) : 15 min \(écart −0,600 %×vote\/cycle ± 0,000, 72 cycles\) → une seule fitness par siège : tous recalculés \(bougie\)$/.test(L1.desc.replace(/-0,/g, '−0,')), L1.desc);
  const n1 = t.S.chainLog.length; t.run("_vjRefresh(900000, 'f')"); assert.strictEqual(t.S.chainLog.length, n1, 'rien ne change : rien au journal');
  // « meilleur » prouvé à 1 h en plus : contradiction, on reste ; puis seul → retour aux horizons, fitness recalculée
  const b2 = Math.floor(now / (5 * Q)) - 30; for (let b = 0; b < 24; b++) for (let j = 0; j < 3; j++) t.c._vjCmpAdd(T3, 2, (b2 + b) * 5 * Q + 1, Q, 0.9, 'f');
  t.run("_vjRefresh(900000, 'f')"); assert.strictEqual(t.c._fjMode(), 'bougie', 'contradiction : on reste');
  T3.fCmp[0] = {}; t.run("_vjRefresh(900000, 'f')"); assert.strictEqual(t.c._fjMode(), 'hz'); assert.deepStrictEqual([a1.fitness, a2.fitness], [50, 1350]);
  assert.ok(/^Fitness des sièges · aux horizons — elle retire de plus mauvais sièges \(pas de temps 15 min\) : 1 h \(écart \+0,900 %×vote\/cycle ± 0,000, 72 cycles\) → une seule fitness par siège : tous recalculés \(horizons\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  // par pas de temps : le 1 h a sa propre preuve ; la définition vivante, elle, est une : bougie dès qu'un pas l'a prouvé, horizons quand plus aucun
  const add60 = (i, d) => { for (let b = 0; b < 24; b++) for (let j = 0; j < 3; j++) t.c._vjCmpAdd(T3, i, (Math.floor(now / ((HZ[i] + 1) * 3600000)) - 30 + b) * (HZ[i] + 1) * 3600000 + 1, 3600000, d, 'f'); };
  add60(0, -0.6); t.run("_vjRefresh(3600000, 'f')"); assert.deepStrictEqual([t.c._vjMode(60, 'f'), t.c._vjMode(15, 'f'), t.c._fjMode()], ['bougie', 'hz', 'bougie'], 'retour prouvé en 1 h : la définition vivante suit');
  assert.deepStrictEqual([a1.fitness, a2.fitness], [1350, 50], 'tous recalculés à la bougie'); assert.ok(/retirait de plus mauvais sièges \(pas de temps 1 h\) : 1 h \(écart −0,600.*→ une seule fitness par siège : tous recalculés \(bougie\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc.replace(/-0,/g, '−0,')), t.S.chainLog[t.S.chainLog.length - 1].desc);
  T3.fCmp[2] = {}; for (let b = 0; b < 24; b++) for (let j = 0; j < 3; j++) t.c._vjCmpAdd(T3, 0, (b0 + b) * 2 * Q + 1, Q, -0.6, 'f');   // le 15 min prouve le retour à son tour
  a1.fitness = 7; t.run("_vjRefresh(900000, 'f')"); assert.deepStrictEqual([t.c._vjMode(60, 'f'), t.c._vjMode(15, 'f'), t.c._fjMode()], ['bougie', 'bougie', 'bougie']);
  assert.strictEqual(a1.fitness, 7, 'la définition vivante n\'a pas changé : pas de recalcul'); assert.ok(/\(pas de temps 15 min\) : .* → la définition vivante reste à la bougie \(retour prouvé à un autre pas de temps\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  Object.keys(T3.fCmp[0]).forEach(k => { if (k.startsWith('60:')) delete T3.fCmp[0][k]; }); add60(1, 0.9); t.run("_vjRefresh(3600000, 'f')"); assert.deepStrictEqual([t.c._vjMode(60, 'f'), t.c._vjMode(15, 'f'), t.c._fjMode()], ['hz', 'bougie', 'bougie'], 'le 1 h revient aux horizons, le 15 min tient encore : la fitness reste à la bougie');
  assert.strictEqual(a1.fitness, 7); assert.ok(/aux horizons — elle retire de plus mauvais sièges \(pas de temps 1 h\) : 2 h .* → la définition vivante reste à la bougie \(retour prouvé à un autre pas de temps\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  T3.fCmp[0] = {}; T3.fCmp[1] = {}; for (let b = 0; b < 24; b++) for (let j = 0; j < 3; j++) t.c._vjCmpAdd(T3, 2, (b2 + b) * 5 * Q + 1, Q, 0.9, 'f');
  t.run("_vjRefresh(900000, 'f')"); assert.deepStrictEqual([t.c._vjMode(60, 'f'), t.c._vjMode(15, 'f'), t.c._fjMode()], ['hz', 'hz', 'hz'], 'plus aucun pas en retour : horizons'); assert.deepStrictEqual([a1.fitness, a2.fitness], [50, 1350], 'tous recalculés aux horizons');
  assert.ok(/→ une seule fitness par siège : tous recalculés \(horizons\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc));
  // une preuve ne survit pas à ses données : le 1 h a prouvé le retour, puis plus aucun cycle en 1 h — ses créneaux sortent de la fenêtre (21 j) → sa preuve tombe, journal, tous recalculés
  T3.fCmp = HZ.map(() => ({})); T3.fModes = { 15: 'hz', 60: 'bougie' }; T3.fRules[60] = { t: now - 25 * 86400000, mode: 'bougie', hz: [], tfMs: 3600000 };
  for (let b = 0; b < 24; b++) t.c._vjCmpAdd(T3, 0, now - 25 * 86400000 + b * 7200000, 3600000, -0.6, 'f'); t.c._fitRecomputeAll(); assert.deepStrictEqual([a1.fitness, a2.fitness], [1350, 50]);
  for (let b = 0; b < 3; b++) t.c._vjCmpAdd(T3, 0, now - b * 2 * Q, Q, 0.1, 'f');   // le 15 min, lui, vit
  const nE = t.S.chainLog.length; t.run("_vjRefresh(900000, 'f')");
  assert.deepStrictEqual([t.c._vjMode(60, 'f'), t.c._vjMode(15, 'f'), t.c._fjMode(), T3.fRules[60].expired, Object.keys(T3.fCmp[0]).filter(k => k.startsWith('60:')).length], ['hz', 'hz', 'hz', true, 0], 'preuve du 1 h expirée avec ses créneaux (purgés)');
  assert.deepStrictEqual([a1.fitness, a2.fitness], [50, 1350], 'tous recalculés aux horizons'); assert.strictEqual(t.S.chainLog.length, nE + 1);
  assert.strictEqual(t.S.chainLog[nE].desc, 'Fitness des sièges · la preuve du pas de temps 1 h a expiré avec ses données (plus aucun créneau dans sa fenêtre) : ce pas revient aux horizons → une seule fitness par siège : tous recalculés (horizons)');
  // le pas courant aussi : « bougie » sans plus aucun créneau → horizons ; et une preuve vivante (créneaux dans la fenêtre) ne tombe pas
  T3.fModes = { 15: 'bougie' }; T3.fCmp = HZ.map(() => ({})); t.run("_vjRefresh(900000, 'f')"); assert.deepStrictEqual([t.c._vjMode(15, 'f'), T3.fRules[15].expired], ['hz', true]);
  assert.ok(/^Fitness des sièges · la preuve du pas de temps 15 min a expiré avec ses données .* → une seule fitness par siège : tous recalculés \(horizons\)$/.test(t.S.chainLog[t.S.chainLog.length - 1].desc), t.S.chainLog[t.S.chainLog.length - 1].desc);
  T3.fModes = { 15: 'bougie', 60: 'bougie' }; for (let b = 0; b < 3; b++) { t.c._vjCmpAdd(T3, 0, now - b * 2 * Q, Q, 0.1, 'f'); t.c._vjCmpAdd(T3, 0, now - b * 7200000, 3600000, 0.1, 'f'); }
  const nL2 = t.S.chainLog.length; t.run("_vjRefresh(900000, 'f')"); assert.deepStrictEqual([t.c._vjMode(15, 'f'), t.c._vjMode(60, 'f'), t.S.chainLog.length], ['bougie', 'bougie', nL2], 'des créneaux dans la fenêtre : les preuves tiennent, rien au journal');
  // _vjJudge déclenche le recalcul du garde-fou de la fitness au plus toutes les 5 min, pour le pas courant
  T3.fRules[15] = { t: now, mode: 'hz', hz: [] }; T3.fDirtyF = { 15: true }; T3.pendV = []; T3.fModes = {}; T3.fCmp = HZ.map(() => ({}));
  const fake = () => ({ p: 'Z', k: 1, t: now, f: Q, v: [[0, 500], [1, -500]], dO: 1, dH: 1, wB: 0, wH: 1, a: [0, 1, 1, 1, 1], L: { p: 'Z', k: 1, t: now, px: 1, d: 1, f: Q, tf: '15m', cap: 2, x: [0, 0, 0, 0, 0], n: [0.5, 1, 1, 1, 1], s: 0, s0: 0, el: 1, eh: 1, hit: 0 }, S: { p: 'Z', k: 1, t: now, px: 1, d: -1, f: Q, tf: '15m', cap: 2, x: [0, 0, 0, 0, 0], n: [-0.5, 1, 1, 1, 1], s: 0, s0: 0, el: 1, eh: 1, hit: 0 } });
  T3.vIds = ['a1', 'a2']; t.c.__now = now + 299999; T3.pendV = [fake()]; t.c._vjJudge(T3); assert.strictEqual(T3.fRules[15].t, now, 'moins de 5 min');
  t.c.__now = now + 300000; T3.pendV = [fake()]; t.c._vjJudge(T3); assert.strictEqual(T3.fRules[15].t, now + 300000, '5 min : recalculé');
});

T('S1 · textes : 07 remet le record du siège à zéro à l\'évolution (déjà) ; l\'essai d\'évolution reste jugé à la bougie ; 10f ne lit rien de la fitness aux horizons ; 09b persistent dcThreshold entier ; écran 11b « Fitness des sièges » (lecture seule)', () => {
  const c07 = codeStrict(s07); assert.ok(c07.includes("try { if (typeof _vjReset === 'function') _vjReset(weak.id); } catch(e) {}"));
  const c03 = codeStrict(s03); assert.ok(c03.includes('_evoTrialJudge(a, pair, won, mag, decay, _vote)'), 'essai d\'évolution : inchangé (bougie)');
  assert.ok(!/_fitHz|_fitCurrent|_fjMode|fModes|fRules|fCmp/.test(codeStrict(rd('js/10f-resolveur-cycle.js'))));
  const s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'); assert.ok(s9b1.includes('dcThreshold: S.dcThreshold || null,') && s9b2.includes("if (snap.dcThreshold && typeof snap.dcThreshold === 'object')"));
  assert.ok(s03.split('\n').slice(0, 7).some(l => l.startsWith('// [FITNESS AUX HORIZONS · 28/09/2026] VERSION 20260928a')), 'en-tête FITNESS AUX HORIZONS dans les 7 premières lignes (03 relivré depuis)');   // [DÉGEL DES VOIX · 02/10/2026] une ligne d'en-tête de plus
  // écran
  const src = rd('js/11b-ecran-appris.js').replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const hz = HZ.map((h, i) => ({ h, n: 72, blocks: 24, mean: i === 0 ? -0.45 : null, se: i === 0 ? 0.05 : null, crit: i === 0 ? 3.5 : null, better: false, worse: i === 0 }));
  const S = { tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {},
    agents: [{ id: 'a1', name: 'Momentum Alpha', fitness: 1350, _judgments: Array.from({ length: 6 }, () => ({ s: 1, w: 1 })) }, { id: 'a2', name: 'On-chain', fitness: 50, _judgments: Array.from({ length: 6 }, () => ({ s: -1, w: 1 })) }, { id: 'b', name: 'Scalper', isBot: true, fitness: 500 }],
    dcThreshold: { rec: [], pend: [], rules: {}, pendV: [], vHz: { a1: rec(1), a2: rec(-1) }, fModes: { 15: 'bougie' }, fRules: { 15: { t: 1, mode: 'bougie', hz, tfMs: Q } } } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [], _thHzLab: (h) => ({ 1: '15 min', 2: '30 min', 4: '1 h', 8: '2 h', 16: '4 h' })[h], _thTfMs: () => Q, _thTf: () => '15m',
    _fitWindow: () => 60, _fitOf: (js) => (js.length >= 5 ? (js[0].s > 0 ? 1350 : 50) : null), _fitHz: a => (a.id === 'a1' ? 1350 : a.id === 'a2' ? 50 : null), _dcMerit: () => 0, _dcMeritHz: () => null };
  vm.createContext(c); vm.runInContext(src, c);
  const h = vm.runInContext('_learnedPanelHtml()', c), seg = h.slice(h.indexOf('FITNESS DES SIÈGES'));
  assert.ok(seg.includes('fitness à la bougie (retour prouvé)') && seg.includes('2 sièges jugés aux horizons sur 2') && seg.includes('>↳ 15 min<') && seg.includes('-0.450 %×vote/cycle (± 0.050)') && seg.includes('72 cycles · 24 créneaux · exigé 3.5 ET') && seg.includes('bougie prouvée meilleure') && seg.includes('pas encore d\'écart'), seg.slice(0, 900));
  const iA2 = seg.indexOf('>On-chain<'), rowA2 = seg.slice(seg.lastIndexOf('<span', iA2), iA2 + 400).match(/<span[^>]*>([^<]*)<\/span>/g).map(x => x.replace(/<[^>]+>/g, ''));
  assert.deepStrictEqual(rowA2.slice(0, 4), ['On-chain', '50', '50', '50 T$'], 'colonnes : siège, bougie, horizons, vivante — le plus faible en premier : ' + rowA2.join(' | '));
  assert.ok(seg.indexOf('On-chain') < seg.indexOf('Momentum Alpha') && !seg.includes('>Scalper<'), 'triés du plus faible au plus fort ; les bots ne sont pas des sièges');
  assert.ok(!/S\.\w+\s*=[^=]/.test(codeStrict(src).split('function _learnedPanelHtml')[1].split('\nfunction ')[0]), '11b : lecture seule');
  assert.ok(!seg.includes('ce pas de temps'), 'sans _fjMode : la preuve du pas de temps affiché tient lieu de définition');
  c._fjMode = () => 'bougie'; S.dcThreshold.fModes = { 60: 'bougie' }; const h2 = vm.runInContext('_learnedPanelHtml()', c), seg2 = h2.slice(h2.indexOf('FITNESS DES SIÈGES'));
  assert.ok(seg2.includes('fitness à la bougie (retour prouvé) · ce pas de temps : horizons'), 'la définition vivante (une par siège) et, si elle diffère, la preuve du pas de temps affiché : ' + seg2.slice(0, 600));
});

console.log(`\n${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
