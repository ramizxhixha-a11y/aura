// banc-operateur-appris.js — [OPÉRATEUR APPRIS · 28/09/2026] VERSION 20260928d
// Rams (28/09 20:15, « OK go ») sur ma proposition : juger l'opérateur d'évolution lui-même — les 243 évolutions du jour disent que le nouveau
// génome ne fait pas mieux que l'ancien. Trois sources de naissance (R recombinaison + mutation, l'opérateur d'avant ; B retour à la meilleure
// version passée ; M mutation seule), comparées sur les mêmes essais, avec la preuve du seuil ; rejoué avant livraison.
// Fonctions RÉELLES de 03 en vm (génome, preuve du seuil, essai, règle de l'évolution, règle des sources) ; l'ANCIEN _genomeEvolve (HEAD 133d001)
// embarqué en littéral pour l'identité de R ; triggerEvolution RÉEL de 07 ; panneau RÉEL de 11b. Après deux revues indépendantes (review_t) :
// B vers une version passée complète et bornée-différente ; _evoOpPick(siège) sur la vue purgée — rotation par siège puis partout, une sur
// deux aux sources à juger quand une source est prouvée, nuisance prouvée tenue jusqu'à l'expiration de sa dernière observation ; politique
// en cours dite au journal et à l'écran ; « toutes nuisibles : aucune écartée » ; R identique à l'ancien opérateur, exceptions comprises.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const J = x => JSON.parse(JSON.stringify(x));
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s11 = rd('js/11b-ecran-appris.js');
const GENOME = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const TH = between(s03, 'var TH_MIN_N = 30,', 'function _thState()', false), THEVAL = between(s03, 'function _thEval(obs) {', 'function _thEvalH(', false);
const FIT = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', 'window._fitJudge = _fitJudge;', false), TRIAL = between(s03, 'var EVO_TRIAL_N = 30', 'window._evoTrialStart = _evoTrialStart;', false);
const RULE = between(s03, 'var EVO_BLOCK_MS = 4 * 3600000', 'window._evoRuleState = _evoRuleState;', false), OPS = between(s03, "var EVO_OPS = ['R', 'B', 'M']", 'window._evoOpStats = _evoOpStats;', false);
// l'ANCIEN opérateur (HEAD 133d001, 03) : une seule source, recombinaison avec la meilleure version passée + mutation
const OLD_EVOLVE = `function _genomeEvolveOld(id, mut, fitnessPeak) {
  var def = GENOME_DEFAULTS[id]; if (!def) return null;
  if (!S.genome) S.genome = {}; if (!S.genomeHistory) S.genomeHistory = {};
  var cur = _genomeOf(id);
  var hist = Array.isArray(S.genomeHistory[id]) ? S.genomeHistory[id] : (S.genomeHistory[id] = []);
  var sig = JSON.stringify(cur), archived = false;
  if (!hist.some(function(h){ return JSON.stringify(h.g) === sig; })) { hist.push({ g: cur, f: Math.round(Number(fitnessPeak) || 0), t: Date.now() }); archived = true; }
  hist.sort(function(a, b){ return (b.f || 0) - (a.f || 0); });
  if (hist.length > 10) hist.splice(10);
  var best = hist[0].g, next = {}, changed = 0;
  mut = Math.max(0.02, Math.min(0.5, Number(mut) || 0.1));
  Object.keys(def).forEach(function(k){
    var base = (Math.random() < 0.5) ? cur[k] : (isFinite(best[k]) ? best[k] : cur[k]);
    var v = _geneClamp(k, base * (1 + (Math.random() * 2 - 1) * mut), def[k]);
    if (v !== cur[k]) changed++;
    next[k] = v;
  });
  S.genome[id] = next;
  return { changed: changed, archived: archived, genes: Object.keys(def).length };
}`;
const GENOME_DEFAULTS_KEYS = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(GENOME + '\nwindow.G = GENOME_DEFAULTS;', c); return c.window.G; })();
const H4 = 4 * 3600000, NOW = 1790000000000;
const LCG = seed => { let x = seed >>> 0; return () => { x = (Math.imul(1664525, x) + 1013904223) >>> 0; return x / 4294967296; }; };
function mk(o) {
  o = o || {};
  const S = Object.assign({ agents: [], chainLog: [], pairStates: {}, cycle: 0, evoTrials: {}, genome: {}, genomeHistory: {} }, o.S || {});
  const c = { S, Math, Number, Object, Array, JSON, isFinite, String, console, window: {}, __now: o.now || NOW, nowStr: () => '12:00:00' };
  c.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [c.__now])); } static now() { return c.__now; } };
  vm.createContext(c); vm.runInContext(GENOME + '\n' + TH + '\n' + THEVAL + '\n' + FIT + '\nwindow._fitJudge = _fitJudge;\n' + TRIAL + '\n' + RULE + '\n' + OPS + '\n' + OLD_EVOLVE, c);
  return { c, S, run: code => vm.runInContext(code, c) };
}
const gen = (n, op, d, step, t0) => Array.from({ length: n }, (_, i) => { const t = (t0 || NOW - n * (step || H4) + (step || H4) / 2) + i * (step || H4); const dd = typeof d === 'function' ? d(i) : d; return [Math.round(t / 1000), 50, Math.round(dd * 10000), 30, 'A', 0, 's' + i, op]; });   // t0 par défaut : les n derniers créneaux, milieu de créneau (dans la fenêtre de 30 créneaux)
console.log('▶ banc-operateur-appris');

T('T1 · _genomeEvolve(id, mut, pointe, source) RÉEL : R = l\'opérateur d\'avant byte-identique (même hasard, même génome, même archive, mêmes exceptions) et self dit quand la meilleure version n\'a rien à donner ; B = la meilleure version passée COMPLÈTE et différente de la courante, telle quelle (sans hasard), pointe rendue ; sinon → R ; M = mutation seule ; siège sans génome → null', () => {
  const t = mk(); const seq = LCG(3); t.c.Math = Object.create(Math); t.c.Math.random = seq; t.run('Math = this.Math;');
  // R contre l'ancien : mêmes tirages (deux générateurs au même état)
  const a = mk(), b = mk(); [a, b].forEach((x, i) => { x.c.Math = Object.create(Math); x.c.Math.random = LCG(11); x.run('Math = this.Math;'); x.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 }; x.S.genomeHistory.breakout_v1 = [{ g: { win: 25, margin: 0.001, score: 0.9 }, f: 1200, t: 1 }]; });
  let rn = J(a.run("_genomeEvolve('breakout_v1', 0.12, 700, 'R')")), ro = J(b.run("_genomeEvolveOld('breakout_v1', 0.12, 700)"));
  assert.deepStrictEqual(J(a.S.genome.breakout_v1), J(b.S.genome.breakout_v1), 'R : même génome que l\'ancien opérateur'); assert.deepStrictEqual(J(a.S.genomeHistory.breakout_v1), J(b.S.genomeHistory.breakout_v1), 'même archive');
  assert.deepStrictEqual([rn.changed, rn.archived, rn.genes, rn.op, rn.self], [ro.changed, ro.archived, ro.genes, 'R', false], 'la meilleure passée (1200) n\'est pas la courante (700) : vraie recombinaison'); const first = J(b.S.genome.breakout_v1);
  const e = mk(); e.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 }; e.S.genomeHistory.breakout_v1 = [{ g: { win: 25, margin: 0.001, score: 0.9 }, f: 1200, t: 1 }];
  assert.strictEqual(J(e.run("_genomeEvolve('breakout_v1', 0.12, 1500, 'R')")).self, true, 'la courante archivée avec la plus haute pointe (1500) : R sans rien à prendre, dit');
  const e2 = mk(); e2.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 }; e2.S.genomeHistory.breakout_v1 = [{ g: { foo: 1, bar: 2 }, f: 5000, t: 1 }];   // la meilleure : un autre jeu de gènes (logique refondue)
  assert.strictEqual(J(e2.run("_genomeEvolve('breakout_v1', 0.12, 700, 'R')")).self, true, 'meilleure version d\'un autre jeu de gènes : R sans rien à prendre, dit');
  e2.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 }; e2.S.genomeHistory.breakout_v1 = [{ g: { foo: 1, bar: 2 }, f: 5000, t: 1 }]; assert.strictEqual(J(e2.run("_genomeEvolve('breakout_v1', 0.12, 700, 'B')")).op, 'R', 'B ne revient pas vers un autre jeu de gènes (remise aux défauts)');
  // revue v2 n°4 : tête de l'historique sans génome — R se comporte exactement comme avant, exceptions comprises (self ne lit rien)
  const a3 = mk(), b3 = mk(); [a3, b3].forEach(x => { x.c.Math = Object.create(Math); x.run('Math = this.Math;'); }); let nX = 0, nOk = 0;
  for (let i = 0; i < 24; i++) {
    const out = [a3, b3].map((x, j) => { x.S.genome.corr_v1 = { win: 5, gain: 0.15 }; x.S.genomeHistory.corr_v1 = [{ f: 5000, t: 1 }]; x.c.Math.random = LCG(300 + i); try { const r = J(x.run(j ? "_genomeEvolveOld('corr_v1', 0.1, 300)" : "_genomeEvolve('corr_v1', 0.1, 300, 'R')")); return JSON.stringify([r.changed, r.archived, r.genes, x.S.genome.corr_v1, x.S.genomeHistory.corr_v1]); } catch (err) { return 'X ' + err.message + ' ' + JSON.stringify(x.S.genomeHistory.corr_v1); } });
    assert.strictEqual(out[0], out[1], 'graine ' + i); if (out[0].startsWith('X ')) nX++; else nOk++;
  }
  assert.ok(nX > 0 && nOk > 0, 'les deux issues vues : ' + nX + ' exceptions, ' + nOk + ' naissances');
  let nBestDiff = 0;
  for (let i = 0; i < 60; i++) {   // 60 naissances de suite, hasard et pointes variés (souvent sous la meilleure passée : la recombinaison joue), sur tous les sièges à génome : identité byte à byte
    const ids = Object.keys(GENOME_DEFAULTS_KEYS); const id = ids[i % ids.length]; [a, b].forEach(x => { x.c.Math.random = LCG(100 + i); });
    const peak = (i % 3 === 0) ? 2000 + i : 100 + i, maxF = Math.max(0, ...((a.S.genomeHistory[id] || []).map(h => h.f))); if (maxF > peak) nBestDiff++;
    rn = J(a.run(`_genomeEvolve('${id}', ${0.04 + (i % 7) * 0.02}, ${peak}, 'R')`)); ro = J(b.run(`_genomeEvolveOld('${id}', ${0.04 + (i % 7) * 0.02}, ${peak})`));
    assert.deepStrictEqual(J(a.S.genome), J(b.S.genome), 'naissance ' + i + ' (' + id + ')'); assert.deepStrictEqual(J(a.S.genomeHistory), J(b.S.genomeHistory)); assert.deepStrictEqual([rn.changed, rn.archived, rn.genes], [ro.changed, ro.archived, ro.genes]);
  }
  assert.ok(nBestDiff >= 20, 'le test a des dents : ' + nBestDiff + ' naissances avec une meilleure version passée différente');
  const a2 = mk(); a2.c.Math = Object.create(Math); a2.c.Math.random = LCG(11); a2.run('Math = this.Math;'); a2.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 }; a2.S.genomeHistory.breakout_v1 = [{ g: { win: 25, margin: 0.001, score: 0.9 }, f: 1200, t: 1 }];
  a2.run("_genomeEvolve('breakout_v1', 0.12, 700)"); assert.deepStrictEqual(J(a2.S.genome.breakout_v1), first, 'sans source : R (l\'appelant d\'avant)');
  // B : la meilleure version passée différente de la courante, telle quelle
  t.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 }; t.S.genomeHistory.breakout_v1 = [{ g: { win: 25, margin: 0.001, score: 0.9 }, f: 1200, t: 1 }, { g: { win: 10, margin: 0.004, score: 0.4 }, f: 400, t: 2 }];
  let r = J(t.run("_genomeEvolve('breakout_v1', 0.12, 1500, 'B')"));   // la courante est archivée avec la pointe 1500 : la MEILLEURE est la courante → la meilleure DIFFÉRENTE = 1200
  assert.deepStrictEqual([r.op, r.peak, r.changed, r.genes, r.archived], ['B', 1200, 3, 3, true], JSON.stringify(r)); assert.deepStrictEqual(J(t.S.genome.breakout_v1), { win: 25, margin: 0.001, score: 0.9 }, 'telle quelle');
  assert.deepStrictEqual(J(t.S.genomeHistory.breakout_v1.map(h => h.f)), [1500, 1200, 400], 'archivée et triée comme avant');
  r = J(t.run("_genomeEvolve('breakout_v1', 0.12, 100, 'B')")); assert.deepStrictEqual([r.op, r.peak], ['B', 1500], 'de retour : la meilleure différente est maintenant la 1500'); assert.deepStrictEqual(J(t.S.genome.breakout_v1), { win: 18, margin: 0.003, score: 0.6 });
  // B sans version passée différente → R
  const u = mk(); u.c.Math = Object.create(Math); u.c.Math.random = LCG(5); u.run('Math = this.Math;'); u.S.genome.corr_v1 = { win: 5, gain: 0.15 };
  r = J(u.run("_genomeEvolve('corr_v1', 0.1, 300, 'B')")); assert.strictEqual(r.op, 'R', 'aucune version passée différente : R'); assert.strictEqual(r.peak, undefined);
  // M : mutation seule — la meilleure version (très loin) n'entre jamais
  const m = mk(); m.c.Math = Object.create(Math); m.c.Math.random = LCG(7); m.run('Math = this.Math;'); m.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 }; m.S.genomeHistory.breakout_v1 = [{ g: { win: 60, margin: 0.008, score: 1 }, f: 5000, t: 1 }];
  for (let i = 0; i < 20; i++) { r = J(m.run("_genomeEvolve('breakout_v1', 0.02, 100, 'M')")); assert.strictEqual(r.op, 'M'); const g = m.S.genome.breakout_v1; assert.ok(g.win <= 20 && g.margin <= 0.0033 && g.score <= 0.66, 'M reste près de la courante : ' + JSON.stringify(g)); }
  assert.strictEqual(m.run("_genomeEvolve('exec_bot_v1', 0.1, 900, 'B')"), null, 'siège sans génome : null');
  // revues n°2/8 et v2 n°1 : une version passée à gènes manquants (gènes ajoutés depuis : whale_v1 +wLiq, liqMinUsd le 26/09) n'est pas une version où
  // revenir, même si ses gènes présents diffèrent ; une entrée sans génome non plus ; sinon R
  const w = mk(); w.c.Math = Object.create(Math); w.c.Math.random = LCG(9); w.run('Math = this.Math;');
  const keys = Object.keys(GENOME_DEFAULTS_KEYS.whale_v1); assert.ok(keys.length >= 5, 'whale_v1 : ' + keys.join(','));
  w.S.genome.whale_v1 = Object.assign({}, GENOME_DEFAULTS_KEYS.whale_v1); const partial = {}; keys.slice(0, keys.length - 2).forEach(k => { partial[k] = GENOME_DEFAULTS_KEYS.whale_v1[k]; }); partial[keys[0]] = GENOME_DEFAULTS_KEYS.whale_v1[keys[0]] * 1.3;
  w.S.genomeHistory.whale_v1 = [{ g: partial, f: 900, t: 1 }, { f: 800, t: 2 }, { g: null, f: 700, t: 3 }];
  assert.strictEqual(w.run("_genomePast('whale_v1')"), null, 'aucune version où revenir'); assert.strictEqual(w.S.genomeHistory.whale_v1.length, 3, '_genomePast n\'écrit pas'); assert.deepStrictEqual(J(w.S.genome.whale_v1), J(GENOME_DEFAULTS_KEYS.whale_v1));
  const other = Object.assign({}, GENOME_DEFAULTS_KEYS.whale_v1); other[keys[0]] = GENOME_DEFAULTS_KEYS.whale_v1[keys[0]] * 1.5; w.S.genomeHistory.whale_v1.push({ g: other, f: 650, t: 4 });
  const gp = J(w.run("_genomePast('whale_v1')")); assert.ok(gp && gp.h.f === 650 && gp.changed >= 1, 'la seule version complète et différente, sous la partielle (900, différente mais incomplète) et les entrées sans génome : ' + JSON.stringify(gp));
  r = J(w.run("_genomeEvolve('whale_v1', 0.1, 500, 'B')")); assert.deepStrictEqual([r.op, r.peak, r.changed], ['B', 650, gp.changed]); assert.strictEqual(w.S.genome.whale_v1[keys[0]], gp.next[keys[0]]);
  const same = Object.assign({ extra: 1 }, GENOME_DEFAULTS_KEYS.whale_v1); const w2 = mk(); w2.S.genome.whale_v1 = Object.assign({}, GENOME_DEFAULTS_KEYS.whale_v1); w2.S.genomeHistory.whale_v1 = [{ g: same, f: 900, t: 1 }];
  assert.strictEqual(w2.run("_genomePast('whale_v1')"), null, 'complète mais égale une fois bornée (seule une clé en trop diffère) : pas une version où revenir'); assert.strictEqual(J(w2.run("_genomeEvolve('whale_v1', 0.1, 500, 'B')")).op, 'R');
  w.S.genomeHistory.whale_v1 = w.S.genomeHistory.whale_v1.filter(h => h.f !== 650); w.S.genome.whale_v1 = Object.assign({}, GENOME_DEFAULTS_KEYS.whale_v1);   // plus que la partielle (incomplète) et les entrées sans génome
  r = J(w.run("_genomeEvolve('whale_v1', 0.1, 500, 'B')")); assert.strictEqual(r.op, 'R', 'B impossible → R, dite R'); assert.ok(r.changed > 0 && r.peak === undefined);
});

T('T2 · _evoOpStats / _evoOpPick(siège) (preuve du seuil RÉELLE, vue purgée, sans écrire) : rotation — celle qui attend depuis le plus longtemps sur CE siège, puis partout (essais en cours compris ; jamais servie d\'abord ; à égalité R, B, M ; observation d\'avant = R) ; B seulement sur un siège à version passée complète ; prouvée bénéfique : elle, une naissance sur deux aux sources encore à juger (alternance par siège) ; prouvée nuisible écartée, et TENUE jusqu\'à l\'expiration de sa dernière observation sauf naissance depuis ; toutes nuisibles : rien n\'est retiré ; observations périmées ignorées', () => {
  const t = mk(); const pick = id => t.run(id ? `_evoOpPick('${id}')` : '_evoOpPick()'), stats = () => J(t.run('_evoOpStats(S.evoRule ? S.evoRule.obs : [])')), alt = i => (i % 2 ? 0.02 : -0.02);
  const ending = (n, op, d, endMs, step) => gen(n, op, d, step || H4, endMs - (n - 1) * (step || H4)), HR = 3600000, one = (op, d, tMs, seat) => [Math.round(tMs / 1000), 50, Math.round(d * 10000), 30, 'A', 0, seat, op];
  const PAST = [{ g: { win: 25, margin: 0.001, score: 0.9 }, f: 1200, t: 1 }]; t.S.genome.breakout_v1 = { win: 18, margin: 0.003, score: 0.6 };
  assert.strictEqual(pick(), 'R', 'rien : R');
  t.S.evoRule = { obs: ending(10, 'R', 0.01, NOW - HR, HR / 10).concat(ending(3, 'B', 0.01, NOW - 3 * HR, HR / 10), ending(5, 'M', 0.01, NOW - 2 * HR, HR / 10)), rule: null, since: 1 };
  let st = stats(); assert.deepStrictEqual([st.R.n, st.B.n, st.M.n], [10, 3, 5]); assert.ok(st.R.gain === null && st.R.harm === null && Math.abs(st.R.mean - 0.01) < 1e-9);
  assert.strictEqual(pick(), 'B', 'celle qui attend le plus (dernière naissance il y a 3 h)');
  t.S.evoTrials = { s1: { op: 'B', t: NOW - 600000 } }; assert.strictEqual(pick(), 'M', 'un essai B en cours : B vient de servir → M (2 h)'); t.S.evoTrials = { s1: { t: NOW - 600000 }, s2: { op: 'B', t: NOW - 60000 }, s3: { op: 'M' } }; assert.strictEqual(pick(), 'M', 'essai d\'avant sans source = R ; essai sans heure ignoré'); t.S.evoTrials = {};
  t.S.evoRule.obs = ending(6, 'R', 0.01, NOW - HR, HR / 10).map(o => o.slice(0, 7)).concat(ending(2, 'B', 0.01, NOW - 2 * HR, HR / 10)); st = stats(); assert.deepStrictEqual([st.R.n, st.B.n, st.M.n], [6, 2, 0], 'observation d\'avant (7 champs) : R'); assert.strictEqual(pick(), 'M', 'jamais servie d\'abord');
  t.S.evoRule.obs = ending(6, 'R', 0.01, NOW - HR, HR / 10); assert.strictEqual(pick(), 'B', 'jamais servies : B avant M');
  // le siège : B hors jeu sans version passée complète où revenir
  t.S.genomeHistory.breakout_v1 = []; assert.strictEqual(pick('breakout_v1'), 'M', 'ce siège n\'a pas de version passée : M'); assert.strictEqual(pick('exec_bot_v1'), 'M', 'siège sans génome : pas de B');
  t.S.genomeHistory.breakout_v1 = [{ g: { win: 25 }, f: 1200, t: 1 }]; assert.strictEqual(pick('breakout_v1'), 'M', 'seulement une version incomplète (autre jeu de gènes) : pas de B');
  t.S.genomeHistory.breakout_v1 = J(PAST); assert.strictEqual(pick('breakout_v1'), 'B', 'une version complète où revenir : B');
  // revue v2 n°3 : par siège d'abord — ce siège a eu R puis B, jamais M ; ailleurs M et R viennent de servir
  t.S.evoRule.obs = [one('R', 0.01, NOW - 5 * HR, 'breakout_v1'), one('B', 0.01, NOW - 4 * HR, 'breakout_v1'), one('M', 0.01, NOW - HR, 'corr_v1'), one('R', 0.01, NOW - HR / 2, 'whale_v1')];
  assert.strictEqual(pick(), 'B', 'partout : B attend le plus (4 h)'); assert.strictEqual(pick('breakout_v1'), 'M', 'sur ce siège : M jamais servie');
  t.S.evoTrials = { breakout_v1: { op: 'M', t: NOW - 60000 } }; assert.strictEqual(pick('breakout_v1'), 'R', 'l\'essai en cours de ce siège compte : R (5 h) attend le plus ici'); t.S.evoTrials = {};
  // observations périmées : ignorées au choix, sans écrire
  t.S.evoRule.obs = gen(30, 'M', 0.3, H4, NOW - 40 * 86400000); assert.strictEqual(pick(), 'R', 'M prouvée sur des données de 40 jours : rien ne compte'); t.S.evoTrials = { s1: { op: 'R', t: NOW - 60000 } }; assert.strictEqual(pick(), 'B', 'R vient de servir, M périmée ne compte ni comme prouvée ni comme servie → B'); t.S.evoTrials = {}; assert.strictEqual(t.S.evoRule.obs.length, 30, 'sans écrire');
  // prouvée bénéfique (R, 30 évolutions, 30 créneaux) et des sources à juger (B 2, M 0) : une naissance sur deux
  const R30 = gen(30, 'R', 0.3); st = (t.S.evoRule.obs = R30.concat(ending(2, 'B', 0.01, NOW - 2 * H4)), stats()); assert.ok(st.R.gain && st.R.gain.n === 30 && Math.abs(st.R.gain.mean - 0.3) < 1e-9 && !st.B.gain, JSON.stringify(st));
  assert.strictEqual(pick(), 'M', 'la dernière naissance était la prouvée → une à juger (M, jamais servie)');
  t.S.evoTrials = { s1: { op: 'M', t: NOW - 60000 } }; assert.strictEqual(pick(), 'R', 'la dernière était une à juger → la prouvée');
  t.S.evoTrials = { s1: { op: 'M', t: NOW - 120000 }, s2: { op: 'R', t: NOW - 60000 } }; assert.strictEqual(pick(), 'B', 'la dernière était la prouvée → la plus en attente des sources à juger (B, il y a 8 h)'); t.S.evoTrials = {};
  t.S.genomeHistory.breakout_v1 = []; assert.strictEqual(pick('breakout_v1'), 'M', 'B indisponible sur ce siège'); t.S.genomeHistory.breakout_v1 = J(PAST);
  // alternance par siège : partout la dernière naissance est M (ailleurs) → la prouvée ; sur ce siège la dernière était R (la prouvée) → une à juger
  t.S.evoRule.obs = R30.concat(ending(2, 'B', 0.01, NOW - 2 * H4), [one('R', 0.3, NOW - 3 * HR, 'breakout_v1')]); t.S.evoTrials = { zz: { op: 'M', t: NOW - 60000 } };
  assert.strictEqual(pick(), 'R', 'partout : la dernière était M → la prouvée'); assert.strictEqual(pick('breakout_v1'), 'B', 'ce siège : la dernière était la prouvée → la source à juger qui attend le plus ici puis partout (B)'); t.S.evoTrials = {};
  // revue v2 n°6 : « à juger » = sous 30 évolutions OU sous 20 créneaux — M 35 évolutions en ≤ 10 créneaux est à juger ; B jugée sans preuve ne l'est pas
  const Rlast = R30.concat([one('R', 0.3, NOW - 60000, 'q')]);
  t.S.evoRule.obs = Rlast.concat(ending(35, 'B', alt, NOW - H4, 29 * H4 / 34), ending(35, 'M', alt, NOW - 2 * H4, 9 * H4 / 34)); st = stats(); assert.ok(st.R.gain && st.B.n === 35 && st.B.blocks >= 20 && !st.B.gain && !st.B.harm && st.M.n === 35 && st.M.blocks <= 10, JSON.stringify([st.B, st.M]));
  assert.strictEqual(pick(), 'M', 'dernière naissance R (prouvée) → M, à juger faute de créneaux');
  t.S.evoRule.obs = Rlast.concat(ending(35, 'B', alt, NOW - 4.5 * H4, 25 * H4 / 34), ending(12, 'M', alt, NOW - H4 / 3, H4)); st = stats(); assert.ok(!st.B.gain && !st.B.harm && st.B.blocks >= 20 && st.M.n === 12, JSON.stringify([st.B, st.M]));
  assert.strictEqual(pick(), 'M', 'B jugée sans preuve attend le plus, mais seule M est à juger → M');
  // R (+0,3) et B (+0,5) prouvées, M jugée sans preuve (35 évolutions, ≥ 20 créneaux) : plus rien à juger → la meilleure, B
  t.S.evoRule.obs = gen(30, 'R', 0.3, H4, NOW - 30 * H4).concat(gen(30, 'B', 0.5, H4, NOW - 30 * H4 + H4 / 2), gen(35, 'M', alt, 30 * H4 / 35, NOW - 30 * H4 + H4 / 4)); st = stats(); assert.ok(st.R.gain && st.B.gain && !st.M.gain && !st.M.harm && st.M.n === 35 && st.M.blocks >= 20, JSON.stringify([st.R, st.B, st.M]));
  assert.strictEqual(pick(), 'B', 'la meilleure des prouvées'); t.S.genomeHistory.breakout_v1 = []; assert.strictEqual(pick('breakout_v1'), 'R', 'sur un siège sans version passée : la meilleure prouvée disponible (R)'); t.S.genomeHistory.breakout_v1 = J(PAST);
  // M prouvée nuisible ET celle qui attend le plus : écartée → celle qui attend le plus des autres (B)
  t.S.evoRule.obs = gen(30, 'M', -0.3, 0.9 * H4, NOW - 29.5 * H4).concat(ending(40, 'R', alt, NOW - H4 / 3, 20 * H4 / 40), ending(35, 'B', alt, NOW - 2 * H4 / 3, 20 * H4 / 35)); st = stats(); assert.ok(st.M.harm && Math.abs(st.M.harm.mean + 0.3) < 1e-9 && !st.M.gain && !st.R.gain && !st.R.harm && !st.B.gain && !st.B.harm, JSON.stringify(st)); assert.strictEqual(pick(), 'B', 'M écartée → B'); t.S.evoRule.obs.forEach(o => { if (o[7] === 'M') o[2] = 0; }); assert.strictEqual(pick(), 'M', 'sans la preuve de nuisance, M attendait le plus');
  // revue v2 n°2 : nuisance TENUE — M n'est plus prouvée sur la fenêtre (10 évolutions) mais l'était, écartée depuis, sans naissance : toujours écartée
  t.S.evoRule.obs = ending(35, 'R', alt, NOW - 120000, 25 * H4 / 34).concat(ending(35, 'B', alt, NOW - 60000, 25 * H4 / 34), ending(10, 'M', -0.3, NOW - 10 * H4, H4)); st = stats(); assert.ok(!st.M.harm && !st.R.harm && !st.B.harm && !st.R.gain && !st.B.gain, JSON.stringify(st));
  assert.strictEqual(pick(), 'M', 'sans preuve tenue : M attend le plus');
  t.S.evoRule.opRule = { t: NOW - 3600000, M: { held: { t: NOW / 1000 - 3600, until: NOW + 86400000, mean: -0.3, se: 0, n: 30, blocks: 30 } } }; assert.strictEqual(pick(), 'R', 'preuve tenue : M écartée → R (attend plus que B)');
  t.S.evoRule.opRule.M.held.until = NOW - 1000; assert.strictEqual(pick(), 'M', 'tenue jusqu\'à l\'expiration de sa dernière observation seulement');
  t.S.evoRule.opRule.M.held.until = NOW + 86400000; t.S.evoTrials = { k: { op: 'M', t: NOW - 1800000 } }; assert.strictEqual(pick(), 'M', 'une naissance LIBRE de M depuis la preuve rend la main aux données');
  t.S.evoTrials = { k: { op: 'M', t: NOW - 1800000, forced: true } }; assert.strictEqual(pick(), 'R', 'revue v3 n°1 : une naissance FORCÉE (siège sans autre choix) ne lève pas la tenue'); t.S.evoTrials = {};
  t.S.evoRule.obs.push([Math.round((NOW - 1800000) / 1000), 50, -3000, 30, 'A', 0, 'whale_v1', 'M', 1]); assert.strictEqual(pick(), 'R', 'observation forcée (index 8 = 1) : la tenue reste');
  t.S.evoRule.obs[t.S.evoRule.obs.length - 1].pop(); assert.strictEqual(pick(), 'M', 'la même, libre : rendue aux données'); t.S.evoRule.obs.pop(); t.S.evoRule.opRule = null;
  // toutes prouvées nuisibles : rien n'est retiré → celle qui attend le plus
  t.S.evoRule.obs = gen(30, 'R', -0.3, H4, NOW - 30 * H4).concat(gen(30, 'B', -0.3, H4, NOW - 30 * H4 + H4 / 3), gen(30, 'M', -0.3, H4, NOW - 30 * H4 + 2 * H4 / 3)); st = stats(); assert.ok(st.R.harm && st.B.harm && st.M.harm); assert.strictEqual(pick(), 'R');
  t.S.evoRule.obs.push([Math.round(NOW / 1000), 50, -3000, 30, 'A', 0, 'z', 'R']); assert.strictEqual(pick(), 'B', 'R vient de servir → B');
  assert.ok(st.R.harm.mean < 0 && st.R.mean < 0, 'moyennes rendues dans le sens de l\'écart');
  assert.strictEqual(t.S.evoRule.opRule, null, 'le choix n\'écrit rien');
});

T('T3 · _evoOpRefresh (rejugée avec la règle de l\'évolution) : E.opRule (n, écart, preuves vivantes et tenues, politique) persisté dans S.evoRule ; journal 🧬 « Opérateur appris » quand une source devient prouvée ou cesse de l\'être (première évaluation comprise), rien sinon, avec la politique en cours ; nuisance tenue jusqu\'à l\'expiration de sa dernière observation, rendue aux données par une naissance ; l\'observation d\'un essai porte la source', () => {
  const LAB = 'recombinaison + mutation', LB = 'retour à la meilleure version passée', LM = 'mutation seule', ROT = 'rotation par siège entre ';
  const t = mk({ S: { agents: [{ id: 'x', fitness: 50, _judgments: [] }, { id: 'm', isMeta: true, fitness: 350, _judgments: [], streak: 0 }], pairStates: { 'BTC/USDT': {} } } });
  const lines = () => t.S.chainLog.filter(x => /Opérateur appris/.test(x.desc)).map(x => x.desc);
  t.run("_evoTrialStart('x', { g: 1 }, { name: 'G', gen: 9, fit: 50, trig: 'A', op: 'B' })"); assert.strictEqual(t.S.evoTrials.x.op, 'B');
  for (let i = 0; i < 30; i++) { t.S.pairStates['BTC/USDT'].roster = { shadow: { x: -0.5 } }; t.c.__a = t.S.agents[0]; t.run('_evoTrialJudge(__a, "BTC/USDT", true, 3, 1, 0.5)'); }
  const o = t.S.evoRule.obs; assert.strictEqual(o.length, 1); assert.strictEqual(o[0][7], 'B', 'la source dans l\'observation'); assert.strictEqual(t.S.evoMerit.recent[0].op, 'B');
  const OR = t.S.evoRule.opRule; assert.ok(OR && OR.B.n === 1 && OR.R.n === 0 && OR.R.open === true && OR.B.open === true && OR.M.held === null && OR.policy === ROT + LAB + ' / ' + LB + ' / ' + LM, 'règle des sources rejugée : ' + JSON.stringify(OR)); assert.strictEqual(lines().length, 0, 'rien de prouvé : rien au journal');
  // B devient prouvée bénéfique : R et M restent à juger
  t.S.evoRule.obs = gen(30, 'B', 0.3); t.run('_evoRuleRefresh()'); assert.deepStrictEqual(lines(), ['Opérateur appris · ' + LB + ' : prouvée bénéfique (+0,300 ± 0,000, 30 évolutions, 30 créneaux) → naissances : ' + LB + ' (prouvée) une naissance sur deux ; l\'autre : ' + LAB + ' / ' + LM + ' (à juger), en rotation par siège']);
  t.run('_evoRuleRefresh()'); assert.strictEqual(lines().length, 1, 'rien ne change : rien');
  // M prouvée nuisible en plus (mêmes instants que B)
  t.S.evoRule.obs = gen(30, 'B', 0.3).concat(gen(30, 'M', -0.3)); t.run('_evoRuleRefresh()'); let L = lines(); assert.strictEqual(L.length, 2);
  assert.strictEqual(L[1], 'Opérateur appris · ' + LM + ' : prouvée nuisible (-0,300 ± 0,000, 30 évolutions, 30 créneaux) — écartée jusqu\'à 5 jours après sa plus jeune observation (repoussé si une nouvelle observation la reprouve) → naissances : ' + LB + ' (prouvée) une naissance sur deux ; l\'autre : ' + LAB + ' (à juger), en rotation par siège');
  const lastM = Math.max(...t.S.evoRule.obs.filter(x => x[7] === 'M').map(x => x[0])), HM = t.S.evoRule.opRule.M.held; assert.ok(HM && HM.until === lastM * 1000 + 120 * 3600000 && HM.n === 30 && t.S.evoRule.opRule.M.open === false, JSON.stringify(HM));
  // 3 jours plus tard : les plus vieilles observations sont purgées — B n'est plus prouvée ; M non plus sur la fenêtre, mais TENUE (écartée, aucune naissance depuis)
  t.c.__now = NOW + 3 * 86400000; t.run('_evoRuleRefresh()'); L = lines(); assert.strictEqual(L.length, 3); assert.ok(!t.S.evoRule.opRule.M.harm && t.S.evoRule.opRule.M.held === t.S.evoRule.opRule.M.held && t.S.evoRule.opRule.M.held.until === HM.until, 'tenue');
  assert.strictEqual(L[2], 'Opérateur appris · ' + LB + ' : plus rien de prouvé → naissances : ' + ROT + LAB + ' / ' + LB);
  // 6 jours : la dernière observation de M a expiré → la preuve tombe
  t.c.__now = NOW + 6 * 86400000; t.run('_evoRuleRefresh()'); L = lines(); assert.strictEqual(L.length, 4); assert.strictEqual(L[3], 'Opérateur appris · ' + LM + ' : plus rien de prouvé → naissances : ' + ROT + LAB + ' / ' + LB + ' / ' + LM);
  // essai forcé → observation index 8 = 1 ; libre → absent
  const q = mk({ S: { agents: [{ id: 'y', fitness: 50, _judgments: [] }], pairStates: { 'BTC/USDT': {} } } }); q.run("_evoTrialStart('y', { g: 1 }, { name: 'G', gen: 9, fit: 50, trig: 'A', op: 'M', forced: true })"); assert.strictEqual(q.S.evoTrials.y.forced, true);
  for (let i = 0; i < 30; i++) { q.S.pairStates['BTC/USDT'].roster = { shadow: { y: -0.5 } }; q.c.__a = q.S.agents[0]; q.run('_evoTrialJudge(__a, "BTC/USDT", true, 3, 1, 0.5)'); } assert.strictEqual(q.S.evoRule.obs[0].length, 9); assert.deepStrictEqual(J(q.S.evoRule.obs[0].slice(7)), ['M', 1]);
  q.run("_evoTrialStart('y', { g: 1 }, { name: 'G', gen: 9, fit: 50, trig: 'A', op: 'M' })"); assert.strictEqual(q.S.evoTrials.y.forced, false);
  // une naissance forcée après la preuve ne lève pas la tenue ; une naissance libre la rend aux données
  const hf = mk({ S: { evoRule: { obs: gen(30, 'M', -0.3), rule: null, since: 1 } } }); hf.run('_evoRuleRefresh()'); const HF = hf.S.evoRule.opRule.M.held; assert.ok(HF);
  hf.c.__now = NOW + 3 * 86400000; hf.S.evoTrials = { k: { op: 'M', t: NOW + 3 * 86400000 - 60000, forced: true } }; hf.run('_evoRuleRefresh()'); assert.strictEqual(hf.S.evoRule.opRule.M.held, HF, 'forcée : tenue');
  hf.S.evoTrials = {}; hf.S.evoRule.obs.push([Math.round((NOW + 3 * 86400000 - 60000) / 1000), 50, 0, 30, 'A', 0, 'whale_v1', 'M', 1]); hf.run('_evoRuleRefresh()'); assert.strictEqual(hf.S.evoRule.opRule.M.held, HF, 'observation forcée (index 8 = 1) après la preuve : tenue');
  hf.S.evoRule.obs[hf.S.evoRule.obs.length - 1].pop(); hf.run('_evoRuleRefresh()'); assert.strictEqual(hf.S.evoRule.opRule.M.held, null, 'la même, libre : rendue aux données');
  const h = mk({ S: { evoRule: { obs: gen(30, 'M', -0.3), rule: null, since: 1 } } }); h.run('_evoRuleRefresh()'); assert.ok(h.S.evoRule.opRule.M.held);
  h.c.__now = NOW + 3 * 86400000; h.S.evoTrials = { k: { op: 'M', t: NOW + 3 * 86400000 - 60000 } }; h.run('_evoRuleRefresh()'); const LH = h.S.chainLog.filter(x => /Opérateur appris/.test(x.desc)).map(x => x.desc);
  assert.strictEqual(LH.length, 2); assert.strictEqual(LH[1], 'Opérateur appris · ' + LM + ' : plus rien de prouvé → naissances : ' + ROT + LAB + ' / ' + LB + ' / ' + LM); assert.strictEqual(h.S.evoRule.opRule.M.held, null);
  // revue n°6 : première évaluation (opRule absent) avec une preuve → journal
  const f = mk({ S: { evoRule: { obs: gen(30, 'R', -0.3), rule: null, since: 1 } } }); f.run('_evoRuleRefresh()'); const LF = f.S.chainLog.filter(x => /Opérateur appris/.test(x.desc)).map(x => x.desc);
  assert.deepStrictEqual(LF, ['Opérateur appris · ' + LAB + ' : prouvée nuisible (-0,300 ± 0,000, 30 évolutions, 30 créneaux) — écartée jusqu\'à 5 jours après sa plus jeune observation (repoussé si une nouvelle observation la reprouve) → naissances : ' + ROT + LB + ' / ' + LM]); assert.ok(f.S.evoRule.opRule.R.harm && f.S.evoRule.opRule.R.open === false);
  // revue n°7 : toutes nuisibles → « aucune n'est écartée », sans le suffixe « écartée »
  const g = mk({ S: { evoRule: { obs: gen(30, 'R', -0.3, H4, NOW - 30 * H4).concat(gen(30, 'B', -0.3, H4, NOW - 30 * H4 + H4 / 3), gen(30, 'M', -0.3, H4, NOW - 30 * H4 + 2 * H4 / 3)), rule: null, since: 1 } } }); g.run('_evoRuleRefresh()'); const LG = g.S.chainLog.filter(x => /Opérateur appris/.test(x.desc)).map(x => x.desc); assert.strictEqual(LG.length, 1);
  assert.ok(!/écartée jusqu/.test(LG[0]) && LG[0].endsWith('toutes prouvées nuisibles : aucune n\'est écartée (rien n\'est retiré) → naissances : ' + ROT + LAB + ' / ' + LB + ' / ' + LM), LG[0]);
});

T('T4 · triggerEvolution RÉEL (07) : la source vient de _evoOpPick(siège), passe à _genomeEvolve et à l\'essai (la source réellement appliquée) ; journal « Génome … » pour R (dont « sans rien à prendre »), B (pointe reprise), M', () => {
  const EVOLVE = between(s07, 'function triggerEvolution(weak, opts) {', 'buildAgentCards(); patchAgentCards();\n}', false) + '}';
  const mkS = () => ({ agents: [{ id: 'w', name: 'Weak', fitness: 61.7, score: 0.3, conf: 0.5, type: 'a·b', source: 'x/y', color: '#fff', _judgments: [], fitnessHistory: [700] }, { id: 'p1', name: 'P1', fitness: 900, score: 0.2, conf: 0.6, type: 'a·b', source: 'x/y', color: '#0f0' }, { id: 'p2', name: 'P2', fitness: 700, score: -0.1, conf: 0.6, type: 'a·b', source: 'x/y', color: '#00f' }], evoLog: [], chainLog: [], cycle: 500, genome: {}, _genCount: 100 });
  const run = (op, ge, plan) => {
    const S = mkS(); const c = { S, Math, Number, Object, Array, JSON, Date, isFinite, String, Set, window: {}, console, nowStr: () => '12:00:00', starts: [], calls: [],
      _genomeOf: () => ({ g: 1 }), _genomeEvolve: (id, mut, peak, o) => { c.calls.push([id, o]); return ge; }, _evoOpPick: (sid) => { c.picked = sid; return op; }, _evoOpPlan: (sid) => { c.planned = sid; return plan || { harm: { R: false, B: false, M: false }, allHarm: false }; }, _evoTrialStart: (id, oldG, info) => { c.starts.push({ id, info }); }, _vjReset: () => 0, _SEAT_DEF: {}, buildAgentCards: () => {}, patchAgentCards: () => {}, showToast: () => {}, bumpVersion: () => {}, rndHash: () => 'h', _onAgentEvolved: null };
    vm.createContext(c); vm.runInContext(EVOLVE, c); vm.runInContext("triggerEvolution(S.agents[0], { trig: 'A' })", c); return c;
  };
  let c = run('B', { changed: 3, genes: 12, archived: true, op: 'B', peak: 1234 });
  assert.deepStrictEqual(c.calls, [['w', 'B']]); assert.strictEqual(c.starts[0].info.op, 'B'); assert.strictEqual(c.picked, 'w', 'le siège qui naît est passé à la règle des sources');
  assert.ok(c.S.chainLog.some(x => x.desc === 'Génome w : retour à la meilleure version passée (pointe 1234 T$), 3/12 gènes changés · version précédente archivée (pointe 700 T$)'), JSON.stringify(c.S.chainLog.map(x => x.desc)));
  c = run('B', { changed: 2, genes: 12, archived: false, op: 'R' });   // B demandée, R appliquée (pas de version passée différente) : l'essai porte R
  assert.strictEqual(c.starts[0].info.op, 'R'); assert.ok(c.S.chainLog.some(x => /^Génome w : 2\/12 gènes mutés \(±\d+ %, recombinaison avec la meilleure version passée\)$/.test(x.desc)), JSON.stringify(c.S.chainLog.map(x => x.desc)));
  c = run('R', { changed: 4, genes: 12, archived: true, op: 'R', self: true }); assert.ok(c.S.chainLog.some(x => /^Génome w : 4\/12 gènes mutés \(±\d+ %, recombinaison sans rien à prendre de la meilleure version passée : mutation seule, de fait\) · version précédente archivée \(pointe 700 T\$\)$/.test(x.desc)), JSON.stringify(c.S.chainLog.map(x => x.desc)));
  c = run('M', { changed: 5, genes: 12, archived: false, op: 'M' }); assert.strictEqual(c.starts[0].info.op, 'M'); assert.ok(c.S.chainLog.some(x => /^Génome w : 5\/12 gènes mutés \(±\d+ %, mutation seule\)$/.test(x.desc)));
  const c2 = run('R', { changed: 0, genes: 12, archived: false, op: 'R' }); assert.strictEqual(c2.starts.length, 0, 'aucun gène changé : pas d\'essai (comme avant)');
  assert.strictEqual(c.starts[0].info.forced, false, 'libre'); assert.strictEqual(c.planned, null, 'forcée : jugée hors siège (toutes nuisibles ou non)');
  c = run('M', { changed: 5, genes: 12, archived: false, op: 'M' }, { harm: { R: true, B: false, M: true }, allHarm: false }); assert.strictEqual(c.starts[0].info.forced, true, 'M tenue nuisible appliquée alors que B ne l\'est pas : forcée');
  c = run('M', { changed: 5, genes: 12, archived: false, op: 'M' }, { harm: { R: true, B: true, M: true }, allHarm: true }); assert.strictEqual(c.starts[0].info.forced, false, 'toutes nuisibles : rien n\'est écarté, la naissance est libre');
  assert.ok(codeStrict(s07).includes("const _op = (typeof _evoOpPick === 'function') ? _evoOpPick(weak.id) : 'R';") && codeStrict(s07).includes("_genomeEvolve(weak.id, _mutation, _peakPrev, _op)") && codeStrict(s07).includes("op: _ge.op || 'R', forced: _forced });"));
});

T('S1 · textes / écran : en-têtes 03, 07, 11b ; 11b « Évolution apprise » : les trois sources (évolutions, écart, état : prouvée / nuisible écartée jusqu\'à / à juger / pas prouvé), la politique en cours (pas de « prochaine ») et la colonne source des observations ; lecture seule', () => {
  [s03, s07, s11].forEach((s, i) => assert.ok(s.startsWith('// [OPÉRATEUR APPRIS · 28/09/2026] VERSION 20260928d'), 'en-tête ' + i));
  const src = s11.replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
  const obs = gen(12, 'R', 0.01).concat(gen(3, 'B', 0.2, H4, NOW - 3 * H4), gen(5, 'M', -0.05, H4, NOW - 5 * H4)); obs[obs.length - 1][6] = 'corr_v1';
  const REAL = Date.now(), until = REAL + 2 * 86400000, dt = new Date(until).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const opRule = { t: REAL, policy: 'rotation par siège entre recombinaison + mutation / retour à la meilleure version passée', R: { n: 12, blocks: 12, mean: 0.01, se: null, gain: null, harm: null, held: null, open: true }, B: { n: 3, blocks: 3, mean: 0.2, se: null, gain: null, harm: null, held: null, open: true }, M: { n: 5, blocks: 5, mean: -0.05, se: null, gain: null, harm: null, held: { t: REAL / 1000, until: until, mean: -0.3, se: 0, n: 30, blocks: 30 }, open: false } };
  const S = { tradingMode: 'paperReal', paperRealActivePairs: {}, tradeContextMemory: [], capRules: {}, _lossStreaks: {}, eventStats: {}, agents: [], dcThreshold: { rec: [], pend: [], rules: {}, pendV: [], vHz: {} }, evoRule: { obs, rule: { t: NOW, n: 20, blocks: 20, gain: null, harm: null, near: null, nearH: null }, since: 1, opRule } };
  const c = { S, PAIRS: {}, document: { getElementById: () => null }, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, EVO_OP_LABEL: { R: 'recombinaison + mutation', B: 'retour à la meilleure version passée', M: 'mutation seule' }, _attributionSummary: () => [], _thHzLab: h => h + ' b', _thTfMs: () => 900000, _thTf: () => '15m', _fitWindow: () => 60, _fitOf: () => null, _fitHz: () => null, _dcMerit: () => 0, _dcMeritHz: () => null, _fjMode: () => 'hz', _evoLevels: () => null };
  vm.createContext(c); vm.runInContext(src, c); const h = vm.runInContext('_learnedPanelHtml()', c), seg = h.slice(h.indexOf('ÉVOLUTION APPRISE'), h.indexOf('EMPLACEMENTS APPRIS'));
  assert.ok(seg.includes('>source de naissance<') && seg.includes('>12 · 12 cr.<') && seg.includes('>prouvée nuisible (écartée jusqu\'au ' + dt + ' sans nouvelle observation)<') && seg.includes('>à juger (sous 30 évolutions ou 20 créneaux)<') && !seg.includes('>pas prouvé<') && !seg.includes('prochaine'), seg.slice(0, 2500));
  assert.ok(seg.includes('>naissances : rotation par siège entre recombinaison + mutation / retour à la meilleure version passée · B seulement sur un siège qui a une version passée complète où revenir<'), 'la politique en cours (stockée)');
  c._evoOpPolicy = () => 'POLITIQUE VIVANTE'; assert.ok(vm.runInContext('_learnedPanelHtml()', c).includes('>naissances : POLITIQUE VIVANTE ·'), 'la politique en cours (recalculée, lecture seule)'); delete c._evoOpPolicy;
  opRule.M.held.until = REAL - 1000; assert.ok(!vm.runInContext('_learnedPanelHtml()', c).includes('prouvée nuisible'), 'preuve tenue expirée : plus nuisible à l\'écran');
  ['R', 'B', 'M'].forEach(o => { opRule[o] = { n: 30, blocks: 30, mean: -0.3, se: 0, gain: null, harm: { mean: -0.3, se: 0, n: 30, blocks: 30 }, held: { t: REAL / 1000, until: until, mean: -0.3, se: 0, n: 30, blocks: 30 }, open: false }; }); const h2 = vm.runInContext('_learnedPanelHtml()', c);
  assert.strictEqual((h2.match(/prouvée nuisible \(toutes : aucune écartée\)/g) || []).length, 3, 'toutes nuisibles à l\'écran'); assert.ok(!h2.includes('prouvée nuisible (écartée'));
  opRule.R = { n: 30, blocks: 30, mean: 0.02, se: 0.01, gain: null, harm: null, held: null, open: false }; assert.ok(vm.runInContext('_learnedPanelHtml()', c).includes('>pas prouvé<'), 'jugée sans preuve : pas prouvé');
  const iRow = seg.indexOf('>corr_v1<'); const cells = seg.slice(seg.lastIndexOf('<span', iRow), iRow + 700).match(/<span[^>]*>([^<]*)<\/span>/g).map(x => x.replace(/<[^>]+>/g, ''));
  assert.deepStrictEqual(cells.slice(1, 5), ['50 T$', '03 · sous le niveau', 'mutation seule', '-0.050 (30 év.)'], 'siège, fitness, déclencheur, source, écart : ' + cells.join(' | '));
  assert.ok(!/S\.\w+\s*=[^=]/.test(codeStrict(src).split('function _learnedPanelHtml')[1].split('\nfunction ')[0]), '11b : lecture seule');
});

console.log(`\n${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
