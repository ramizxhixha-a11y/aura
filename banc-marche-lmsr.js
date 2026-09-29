// banc-marche-lmsr.js — [MARCHÉ LMSR À PART · 28/09/2026] VERSION 20260928b
// Rams (28/09 13:06, « Ok go ») sur ma proposition : retirer le débit LMSR de la fitness — le jugement seule écriture courante ; le marché garde
// sa grandeur à lui ; rejoué avant livraison. Forme livrée (relecture) : un PORTEFEUILLE de marché par siège (a.lmsrWallet), rechargé à la fitness
// à chaque écriture du jugement (03), débité par les ordres (08), lu par la taille des ordres et les gardes — même dynamique de marché qu'avant.
// Bloc RÉEL de 08 en vm avec les fonctions RÉELLES de 02 (lmsrBuyYes / lmsrBuyNo) ; l'ANCIEN bloc (HEAD 1378717, débit de la fitness) rejoué en
// parallèle avec le même hasard : trajectoires identiques (portefeuille = ancienne fitness, marché identique). Textes 03, 07, 08, 09b1, 09b2 ; 11b réel.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = x => JSON.parse(JSON.stringify(x));
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s11 = rd('js/11b-ecran-appris.js');
const LMSR = between(s02, 'function lmsrBuyYes(ps, delta) {', '// old genCandles stub', false);
const WALLET = between(s08, 'function _lmsrWallet(a) {', 'window._lmsrWallet = _lmsrWallet;', false);
const BLOCK = between(s08, "  if(tick % 6 === 0) {\n    const pairList  = Object.keys(PAIRS);", "  _phEnd('votes LMSR');", false);
// l'ANCIEN bloc (HEAD 1378717 = 20260928a, js/08 l. 3133-3167) : le débit de la fitness, tel qu'il tournait depuis la v5
const OLD_BLOCK = `  if(tick % 6 === 0) {
    const pairList  = Object.keys(PAIRS);
    const nPairs    = pairList.length;
    S.agents.forEach(a => {
      const sig        = a.score;
      const budgetPerPair = (a.fitness * .08) / nPairs;
      if(budgetPerPair <= 0) return;
      pairList.forEach(pair => {
        const ps = S.pairStates[pair];
        if(!ps) return;
        const pairBias = 0.8 + Math.random() * 0.4;
        const budget   = budgetPerPair * pairBias;
        if(sig > .1) {
          const d = Math.floor(budget * sig * 1.8);
          if(d > 0 && a.fitness > d * .5) {
            const cost = lmsrBuyYes(ps, d);
            a.fitness -= cost;
          }
        } else if(sig < -.1) {
          const d = Math.floor(budget * Math.abs(sig) * 1.8);
          if(d > 0 && a.fitness > d * .4) {
            const cost = lmsrBuyNo(ps, d);
            a.fitness -= cost;
          }
        }
      });
    });
  }`;
const AGENTS = () => [{ id: 'a1', fitness: 1000, score: 0.5 }, { id: 'a2', fitness: 1000, score: -0.5 }, { id: 'a3', fitness: 1000, score: 0.05 }, { id: 'a4', fitness: 20, score: 0.9 }, { id: 'a5', fitness: 0, score: 0.9 }, { id: 'a6', fitness: 600, score: -0.2 }, { id: 'a7', fitness: 1300, score: 0.95 }];
const PS = () => ({ 'A/USDT': { qYes: 130, qNo: 130 }, 'B/USDT': { qYes: 250, qNo: 50 }, 'C/USDT': { qYes: 100, qNo: 100 } });
const LCG = seed => { let x = seed >>> 0; return () => { x = (Math.imul(1664525, x) + 1013904223) >>> 0; return x / 4294967296; }; };   // même hasard des deux côtés
function mk(block, seed, b) {
  const S = { b: b === undefined ? 100 : b, agents: AGENTS(), pairStates: PS() };
  const c = { S, PAIRS: { 'A/USDT': {}, 'B/USDT': {}, 'C/USDT': {} }, tick: 6, window: {}, _phEnd: () => {}, Number, Object, console, isFinite, __rnd: LCG(seed) };
  vm.createContext(c); vm.runInContext('Math.random = __rnd;\n' + LMSR + '\n' + WALLET, c);
  return { c, S, pass: () => vm.runInContext(block, c) };
}
console.log('▶ banc-marche-lmsr');

T('T1 · textes : plus aucune écriture additive de fitness dans tout js/ ; 08 : taille des ordres et gardes lisent le portefeuille (_lmsrWallet / a.lmsrWallet), le coût passe par _lmsrSpend ; 03 : la porte recharge le portefeuille à chacune de ses trois écritures ; 07 : naissance ; 09b1 / 09b2 ; en-têtes', () => {
  const add = [];
  fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f)).forEach(f => codeStrict(rd('js/' + f)).split('\n').forEach((l, i) => { if (/[\w$]\.fitness\s*[-+*/]=(?!=)/.test(l)) add.push(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 80)); }));
  assert.deepStrictEqual(add, [], 'écritures additives de fitness :\n' + add.join('\n'));
  const c08 = codeStrict(s08), blk = codeStrict(BLOCK);
  assert.strictEqual((blk.match(/a\.fitness/g) || []).length, 0, 'le bloc des ordres ne lit plus la fitness');
  assert.ok(blk.includes('const budgetPerPair = (_lmsrWallet(a) * .08) / nPairs;') && blk.includes('if(d > 0 && a.lmsrWallet > d * .5) {') && blk.includes('if(d > 0 && a.lmsrWallet > d * .4) {'), 'budget et gardes : le portefeuille (même arithmétique)');
  assert.strictEqual((blk.match(/_lmsrSpend\(a, cost\);/g) || []).length, 2); assert.ok(blk.includes("const cost = lmsrBuyYes(ps, d);\n            _lmsrSpend(a, cost);") && blk.includes("const cost = lmsrBuyNo(ps, d);\n            _lmsrSpend(a, cost);"));
  assert.strictEqual((c08.match(/function _lmsrWallet\(a\)/g) || []).length, 1); assert.strictEqual((c08.match(/function _lmsrRefill\(a\)/g) || []).length, 1); assert.strictEqual((c08.match(/function _lmsrSpend\(a, cost\)/g) || []).length, 1);
  assert.ok(c08.includes('window._lmsrWallet = _lmsrWallet; window._lmsrRefill = _lmsrRefill; window._lmsrSpend = _lmsrSpend;'));
  const c03 = codeStrict(s03);
  assert.ok(c03.includes("  a.fitness = f;\n  if (typeof _lmsrRefill === 'function') _lmsrRefill(a);"), '_fitJudge recharge');
  assert.ok(c03.includes("if (f !== null) { if (f !== a.fitness) { a.fitness = f; n++; } if (typeof _lmsrRefill === 'function') _lmsrRefill(a); }"), '_fitRecomputeAll recharge dès qu\'il y a une valeur (avant : la fitness débitée différait toujours → écriture)');
  assert.ok(c03.includes("if (_fw !== null) a.fitness = _fw; if (_fw !== null && typeof _lmsrRefill === 'function') _lmsrRefill(a); } catch(e) {}"), 'abstention recharge');
  assert.strictEqual((c03.match(/_lmsrRefill\(a\)/g) || []).length, 3, 'trois recharges = les trois évaluations avec preuve de la porte');
  assert.ok(codeStrict(s07).includes("  weak.lmsrWallet = weak.fitness; weak.lmsrSpent = 0;"), '07 : naissance');
  assert.ok(codeStrict(s9b1).includes("lmsrWallet:     (typeof a.lmsrWallet === 'number' && isFinite(a.lmsrWallet)) ? a.lmsrWallet : a.fitness,") && codeStrict(s9b1).includes('lmsrSpent:      a.lmsrSpent       || 0,'), '09b1');
  assert.ok(codeStrict(s9b2).includes("a.lmsrWallet     = (typeof sa.lmsrWallet === 'number' && isFinite(sa.lmsrWallet)) ? sa.lmsrWallet : a.fitness;") && codeStrict(s9b2).includes('a.lmsrSpent      = Number(sa.lmsrSpent) || 0;'), '09b2');
  assert.ok(codeStrict(s9b2).includes("if (Number(a.fitness) < 350 && _fitCurrent(a) === null && !(typeof _fitHz === 'function' && _fitHz(a) !== null)) { a.fitness = 350; a.lmsrWallet = 350; nR++; }"), '09b2 : résidu des sauvegardes d\'avant (sans preuve : ni porte, ni record aux horizons)');
  [s03, s07, s08, s9b1, s9b2, s11].forEach((s, i) => assert.ok(s.split('\n').slice(0, 6).some(l => l.startsWith('// [MARCHÉ LMSR À PART · 28/09/2026] VERSION 20260928b')), 'en-tête ' + i + ' (dans les 6 premières lignes : relivré depuis)'));
});

T('T2 · bloc RÉEL de 08 : la fitness ne bouge plus d\'un centime ; le portefeuille est débité du coût réel (02), la dépense comptée ; |score| ≤ 0,1, budget nul : rien ; S.b nul (coût NaN) : rien retiré ni compté, la fitness jamais NaN ; agent d\'avant (sans portefeuille) : sa fitness, comme avant', () => {
  const t = mk(BLOCK, 7); const fit0 = t.S.agents.map(a => a.fitness); const q0 = J(t.S.pairStates);
  // référence : mêmes ordres, mêmes fonctions réelles, sur une copie du marché
  const ref = mk(BLOCK, 7); const exp = {}; const P = ref.S.pairStates; const rnd = LCG(7);
  ref.S.agents.forEach(a => { const bp = a.fitness * .08 / 3; if (bp <= 0) return; let W = a.fitness; ['A/USDT', 'B/USDT', 'C/USDT'].forEach(p => { const ps = P[p], bias = 0.8 + rnd() * 0.4, budget = bp * bias; if (a.score > .1) { const d = Math.floor(budget * a.score * 1.8); if (d > 0 && W > d * .5) { const c = ref.c.lmsrBuyYes(ps, d); exp[a.id] = (exp[a.id] || 0) + c; W -= c; } } else if (a.score < -.1) { const d = Math.floor(budget * Math.abs(a.score) * 1.8); if (d > 0 && W > d * .4) { const c = ref.c.lmsrBuyNo(ps, d); exp[a.id] = (exp[a.id] || 0) + c; W -= c; } } }); });
  t.pass();
  assert.deepStrictEqual(t.S.agents.map(a => a.fitness), fit0, 'la fitness ne bouge pas');
  assert.deepStrictEqual(J(t.S.pairStates), J(P), 'le marché bouge exactement comme la référence'); assert.notDeepStrictEqual(J(t.S.pairStates), q0, 'et il a bougé');
  t.S.agents.forEach(a => { const e = exp[a.id] || 0; if (!e) { assert.strictEqual(a.lmsrSpent, undefined, a.id + ' : pas d\'ordre'); return; } assert.ok(Math.abs(a.lmsrSpent - e) < 1e-9, a.id + ' dépense = coût réel'); assert.ok(Math.abs(a.lmsrWallet - (a.fitness - e)) < 1e-9, a.id + ' portefeuille = fitness − coût'); });
  assert.ok(exp.a1 > 30 && exp.a2 > 10 && !exp.a3 && !exp.a5 && exp.a4 > 0 && exp.a7 > 100, 'ordres de grandeur : ' + JSON.stringify(Object.keys(exp).map(k => k + ':' + exp[k].toFixed(1))));
  t.pass(); assert.deepStrictEqual(t.S.agents.map(a => a.fitness), fit0, 'deuxième passe : toujours pas'); assert.ok(t.S.agents[0].lmsrSpent > exp.a1 && t.S.agents[0].lmsrWallet < 1000 - exp.a1, 'le portefeuille continue de descendre, la dépense de monter');
  // S.b nul → coût NaN
  const z = mk(BLOCK, 7, 0); z.S.agents[5].lmsrSpent = 3.5; z.pass();
  assert.deepStrictEqual(z.S.agents.map(a => a.fitness), [1000, 1000, 1000, 20, 0, 600, 1300], 'fitness jamais NaN');
  assert.deepStrictEqual(z.S.agents.map(a => a.lmsrSpent), [undefined, undefined, undefined, undefined, undefined, 3.5, undefined], 'rien compté');
  assert.ok(z.S.agents.every(a => !(typeof a.lmsrWallet === 'number') || isFinite(a.lmsrWallet)), 'portefeuille jamais NaN'); assert.ok(z.S.pairStates['A/USDT'].qYes > 130, 'le marché a quand même bougé (comme avant)');
  // _lmsrRefill / _lmsrWallet
  // la porte de 03 (bloc FIT réel) recharge le portefeuille à chaque écriture : jugement, recompute ; pas d'écriture (pas de preuve) → pas de recharge
  const FIT = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false);
  const g = { S: { agents: [] }, Math, Number, Array, Object, isFinite, window: {} }; vm.createContext(g); vm.runInContext(FIT + '\n' + WALLET, g);
  const y = { id: 'y', fitness: 350, _judgments: [], lmsrWallet: 12 }; g.S.agents.push(y); g.y = y;
  for (let i = 0; i < 4; i++) vm.runInContext('_fitJudge(y, 1, 1)', g); assert.deepStrictEqual([y.fitness, y.lmsrWallet], [350, 12], '4 jugements : pas de preuve, pas d\'écriture, pas de recharge (comme avant : la fitness débitée restait)');
  vm.runInContext('_fitJudge(y, 1, 1)', g); assert.deepStrictEqual([y.fitness, y.lmsrWallet], [1350, 1350], '5e jugement : écriture → recharge');
  y.lmsrWallet = 3; vm.runInContext('_fitJudge(y, 1, 1)', g); assert.deepStrictEqual([y.fitness, y.lmsrWallet], [1350, 1350], 'même valeur réécrite : rechargé quand même (comme avant)');
  y.lmsrWallet = 3; assert.strictEqual(vm.runInContext('_fitRecomputeAll()', g), 0); assert.strictEqual(y.lmsrWallet, 1350, 'recompute sans changement de valeur : rechargé quand même (avant : la fitness débitée différait toujours → écriture)');
  const noProof = { id: 'z', fitness: 350, _judgments: [], lmsrWallet: 9 }; g.S.agents.push(noProof); vm.runInContext('_fitRecomputeAll()', g); assert.strictEqual(noProof.lmsrWallet, 9, 'sans preuve : rien');
  y._judgments = y._judgments.map(j => ({ s: -1, w: 1 })); assert.strictEqual(vm.runInContext('_fitRecomputeAll()', g), 1); assert.deepStrictEqual([y.fitness, y.lmsrWallet], [50, 50], 'recompute qui écrit : recharge');
  const a = { id: 'x', fitness: 777 }; assert.strictEqual(t.c._lmsrWallet(a), 777); a.lmsrWallet = 5; t.c._lmsrRefill(a); assert.strictEqual(a.lmsrWallet, 777); a.fitness = 812; assert.strictEqual(t.c._lmsrRefill(a), 812); t.c._lmsrSpend(a, 12); assert.deepStrictEqual([a.lmsrWallet, a.lmsrSpent], [800, 12]); t.c._lmsrSpend(a, NaN); assert.deepStrictEqual([a.lmsrWallet, a.lmsrSpent], [800, 12]);
});

T('T2b · ÉQUIVALENCE avec l\'ancien bloc (HEAD 1378717, débit de la fitness) : même hasard, 40 passes, un jugement (recharge) au milieu — portefeuille nouveau = fitness ancienne à chaque passe, marché identique ; la fitness nouvelle, elle, ne bouge qu\'au jugement', () => {
  const o = mk(OLD_BLOCK, 11), n = mk(BLOCK, 11);
  for (let k = 1; k <= 40; k++) {
    if (k === 20) {   // jugement : l'ancien écrivait la fitness (= recharge), le nouveau écrit la fitness et recharge le portefeuille
      o.S.agents.forEach(a => { a.fitness = 900; }); n.S.agents.forEach(a => { a.fitness = 900; n.c._lmsrRefill(a); });
    }
    o.pass(); n.pass();
    n.S.agents.forEach((a, i) => { const b = o.S.agents[i]; assert.ok(Math.abs(n.c._lmsrWallet(a) - b.fitness) < 1e-6, 'passe ' + k + ' ' + a.id + ' : portefeuille ' + a.lmsrWallet + ' vs ancienne fitness ' + b.fitness); });
    assert.deepStrictEqual(J(n.S.pairStates), J(o.S.pairStates), 'passe ' + k + ' : marché identique');
  }
  assert.deepStrictEqual(n.S.agents.map(a => a.fitness), [900, 900, 900, 900, 900, 900, 900], 'la fitness nouvelle : celle du jugement, intacte');
  assert.ok(o.S.agents[0].fitness < 300 && n.S.agents[0].lmsrWallet < 300, 'sans jugement pendant 20 passes (2 min), l\'ancienne fitness / le portefeuille fondent (' + o.S.agents[0].fitness.toFixed(0) + ' T$) : le flux s\'éteint, comme avant');
});

T('T3 · écran 11b « Fitness des sièges » : colonne « marché » = portefeuille · dépense (k / M), « vivante » sans note de débit ; lecture seule', () => {
  const src = s11.replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const HZ = [1, 2, 4, 8, 16], Q = 900000, hz = HZ.map((h, i) => ({ h, n: 72, blocks: 24, mean: i === 0 ? -0.45 : null, se: i === 0 ? 0.05 : null, crit: i === 0 ? 3.5 : null, better: false, worse: i === 0 }));
  const rec = e => HZ.map(() => Array.from({ length: 6 }, () => [500, e > 0 ? 100 : -100]).reduce((a, p) => a.concat(p), []));
  const S = { tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {},
    agents: [{ id: 'a1', name: 'Momentum Alpha', fitness: 1350, lmsrWallet: 1200.4, lmsrSpent: 12.4, _judgments: Array.from({ length: 6 }, () => ({ s: 1, w: 1 })) }, { id: 'a2', name: 'On-chain', fitness: 50, _judgments: Array.from({ length: 6 }, () => ({ s: -1, w: 1 })) },
      { id: 'a3', name: 'Trend', fitness: 400, lmsrWallet: 40, lmsrSpent: 4321, _judgments: [] }, { id: 'a4', name: 'Swing', fitness: 500, lmsrWallet: 500, lmsrSpent: 2500000, _judgments: [] }, { id: 'b', name: 'Scalper', isBot: true, fitness: 500 }],
    dcThreshold: { rec: [], pend: [], rules: {}, pendV: [], vHz: { a1: rec(1), a2: rec(-1) }, fModes: { 15: 'bougie' }, fRules: { 15: { t: 1, mode: 'bougie', hz, tfMs: Q } } } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [], _thHzLab: (h) => ({ 1: '15 min', 2: '30 min', 4: '1 h', 8: '2 h', 16: '4 h' })[h], _thTfMs: () => Q, _thTf: () => '15m',
    _fitWindow: () => 60, _fitOf: (js) => (js.length >= 5 ? (js[0].s > 0 ? 1350 : 50) : null), _fitHz: a => (a.id === 'a1' ? 1350 : a.id === 'a2' ? 50 : null), _dcMerit: () => 0, _dcMeritHz: () => null, _fjMode: () => 'bougie' };
  vm.createContext(c); vm.runInContext(src, c);
  const h = vm.runInContext('_learnedPanelHtml()', c), seg = h.slice(h.indexOf('FITNESS DES SIÈGES'));
  assert.ok(seg.includes('>vivante<') && seg.includes('>marché (portefeuille · dépensé, à part)<') && !seg.includes('débite'), seg.slice(0, 1200));
  const rowOf = name => { const i = seg.indexOf('>' + name + '<'); return seg.slice(seg.lastIndexOf('<span', i), i + 600).match(/<span[^>]*>([^<]*)<\/span>/g).map(x => x.replace(/<[^>]+>/g, '')); };
  assert.deepStrictEqual(rowOf('Momentum Alpha').slice(0, 5), ['Momentum Alpha', '1350', '1350', '1350 T$', '1200 · −12'], 'siège, bougie, horizons, vivante, marché');
  assert.deepStrictEqual(rowOf('On-chain').slice(0, 5), ['On-chain', '50', '50', '50 T$', '— · 0'], 'agent d\'avant : pas de portefeuille encore, rien dépensé');
  assert.deepStrictEqual(rowOf('Trend').slice(0, 5), ['Trend', '—', 'pas encore', '400 T$', '40 · −4.3 k']); assert.deepStrictEqual(rowOf('Swing').slice(0, 5), ['Swing', '—', 'pas encore', '500 T$', '500 · −2.50 M']);
  assert.ok(!/S\.\w+\s*=[^=]/.test(codeStrict(src).split('function _learnedPanelHtml')[1].split('\nfunction ')[0]), '11b : lecture seule');
});

T('T4 · 09b2 RÉEL (bloc des agents + résidu) : portefeuille et dépense relus ; snapshot d\'avant → portefeuille = fitness relue, dépense 0 ; un siège sans preuve débité sous 350 repart de 350 (journal, une fois) ; avec preuve ou ≥ 350 : rien', () => {
  const blk = between(s9b2, "  try {\n    if (snap.agents && snap.agents.length && S.agents) {", "  } catch(e) { dbg.push('lmsr:err'); }", true);
  const mkA = (id, o) => Object.assign({ id, name: id, emoji: '', type: '', source: '', score: 0, conf: 0.5, fitness: 350, _judgments: [] }, o || {});
  const S = { agents: [mkA('a1'), mkA('a2'), mkA('a3'), mkA('a4'), mkA('a5'), mkA('bot', { isBot: true })], chainLog: [] };
  const snap = { agents: [
    { id: 'a1', name: 'a1', fitness: 1350, lmsrWallet: 1200.5, lmsrSpent: 12.4, _judgments: Array.from({ length: 6 }, () => ({ s: 1, w: 1 })) },   // nouveau format, preuve
    { id: 'a2', name: 'a2', fitness: 900, _judgments: Array.from({ length: 6 }, () => ({ s: 1, w: 1 })) },                                          // snapshot d'avant, preuve
    { id: 'a3', name: 'a3', fitness: 61.7, _judgments: [{ s: 1, w: 1 }] },                                                                          // snapshot d'avant, SANS preuve, débité → 350
    { id: 'a4', name: 'a4', fitness: 520, _judgments: [] },                                                                                         // sans preuve mais ≥ 350 : naissance, on ne touche pas
    { id: 'a5', name: 'a5', fitness: 120, _judgments: Array.from({ length: 6 }, () => ({ s: -1, w: 1 })) },                                          // avec preuve (5 jugements) : le jugement la réécrira, on ne touche pas
    { id: 'bot', name: 'bot', fitness: 70, _judgments: [] } ] };
  S.agents.push(mkA('a6')); snap.agents.push({ id: 'a6', name: 'a6', fitness: 90, _judgments: [{ s: 1, w: 1 }], _hz: true });   // record complet aux horizons, définition vivante « bougie » : _fitCurrent null mais preuve → on ne touche pas
  const c = { S, snap, dbg: [], Array, Number, Object, isFinite, Math, _fitWindowRefresh: () => {}, _fitCurrent: a => ((a._judgments || []).length >= 5 ? 1 : null), _fitHz: a => (a.id === 'a6' ? 90 : null), nowStr: () => '12:00:00' };
  vm.createContext(c); vm.runInContext(blk, c);
  const g = id => S.agents.find(a => a.id === id);
  assert.deepStrictEqual([g('a1').fitness, g('a1').lmsrWallet, g('a1').lmsrSpent], [1350, 1200.5, 12.4]);
  assert.deepStrictEqual([g('a2').fitness, g('a2').lmsrWallet, g('a2').lmsrSpent], [900, 900, 0], 'snapshot d\'avant : le portefeuille = la fitness (c\'était la même variable)');
  assert.deepStrictEqual([g('a3').fitness, g('a3').lmsrWallet], [350, 350], 'résidu : sans preuve, sous 350 → 350'); assert.deepStrictEqual([g('a4').fitness, g('a4').lmsrWallet], [520, 520]); assert.deepStrictEqual([g('a5').fitness, g('a5').lmsrWallet], [120, 120]); assert.deepStrictEqual([g('bot').fitness, g('bot').lmsrWallet], [70, 70], 'bot : jamais'); assert.deepStrictEqual([g('a6').fitness, g('a6').lmsrWallet], [90, 90], 'record aux horizons (preuve) : on ne touche pas');
  assert.deepStrictEqual(c.dbg, ['lmsr:1']); assert.strictEqual(S.chainLog.length, 1); assert.ok(/^Marché LMSR à part : 1 siège\(s\) sans preuve .* repartent de la fitness neutre 350/.test(S.chainLog[0].desc), S.chainLog[0].desc);
  snap.agents[2].fitness = 350; snap.agents[2].lmsrWallet = 350; vm.runInContext(blk, c); assert.strictEqual(S.chainLog.length, 1, 'snapshot sauvé depuis (a3 à 350) : plus rien'); assert.deepStrictEqual(c.dbg, ['lmsr:1']);
});

console.log(`\n${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
