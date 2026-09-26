// banc-masque.js — [MASQUE CORRIGÉ · 26/09/2026] VERSION 20260926p
// Rams : « le masque, il faut le corriger ». Plus aucune fitness écrite sans jugement :
//  · « Revigorer » (apprenants ≤ 80 T$ → 400, même génome, fenêtre vidée) → « Faire évoluer maintenant » (03 _evolveBrokenNow :
//    évolution RÉELLE, 07 triggerEvolution(weak, { manual, quiet })) ; « Revigoration forcée » des bots retirée ;
//  · 04 « Apprentissage accéléré » (modes ×3 / ×8, session rejouée ±5 à tous, boost +50 / +200) → panneau « Apprentissage réel » ;
//  · 02 juge caché « v6.0 » de la clôture retiré (il créditait toujours le premier hybride, macro_v1, pour les avis des autres).
// Invariant vérifié sur TOUT le code : la fitness ne s'écrit que par le jugement, la naissance, la restauration (et la démo, le
// marché LMSR — connus, listés).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 8).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 50)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s07 = rd('js/07-v90-mode-bunker-sos.js');
const EVOLVE = between(s07, 'function triggerEvolution(weak, opts) {', 'buildAgentCards(); patchAgentCards();\n}', true);
const EVOLVE_NOW = between(s03, 'function _evolveBrokenNow(silent) {', '\nwindow._evolveBrokenNow = _evolveBrokenNow;', false);
const PANEL = between(s04, 'function renderLearningAccelSection() {', '\nwindow.renderLearningAccelSection = renderLearningAccelSection;', false);
const jj = (n, s, w) => Array.from({ length: n }, () => ({ s, w, k: 0 }));
function mkState(now) {
  const ag = (id, fitness, extra) => Object.assign({ id, name: 'Hybrid Gen-' + id, emoji: '·', type: 'Momentum·RSI', source: 'RSI/Vol', score: 0.02, conf: 0.6, fitness, color: '#fff', _judgments: jj(8, fitness > 300 ? 1 : -1, 0.3), fitnessHistory: [fitness], streak: 0, errors: 0 }, extra || {});
  return { agents: [ag('w1', 50), ag('w2', 40), ag('w3', 70), ag('h1', 500), ag('h2', 650), ag('h3', 800), ag('h4', 900), ag('h5', 1000), ag('h6', 1100),
                    ag('exec_bot_v1', 20, { isBot: true }), ag('evolver_v1', 10, { isMeta: true })],
           _lastEvolutionAt: now - 5 * 60000, _genCount: 100, evoLog: [], chainLog: [], cycle: 10 };
}
function mkEvoCtx(S) {
  const c = { S, Math, Date, Number, Object, Array, JSON, Set, isFinite, window: {}, console, toasts: [] };
  c.showToast = m => c.toasts.push(m); c.bumpVersion = () => {}; c.buildAgentCards = () => {}; c.patchAgentCards = () => {}; c.rndHash = () => 'h'; c.nowStr = () => '00:00';
  vm.createContext(c); vm.runInContext(EVOLVE + '\n' + EVOLVE_NOW, c);
  return c;
}
console.log('▶ banc-masque');
T('D1 · « Faire évoluer maintenant » RÉEL (03 + 07) : les 3 apprenants ≤ 80 T$ ÉVOLUENT (nouveau nom, génome, fenêtre vide, naissance ≥ 350, probation) même si l\'évolution automatique attend son heure ; bots, Évolueur et sains intacts ; un seul résumé ; le délai d\'1 h repart', () => {
  const now = Date.now(), S = mkState(now), c = mkEvoCtx(S), before = JSON.stringify(S.agents.filter(a => /^h|_bot_|evolver/.test(a.id)));
  assert.strictEqual(vm.runInContext('_evolveBrokenNow(true)', c), 3);
  ['w1', 'w2', 'w3'].forEach(id => { const a = S.agents.find(x => x.id === id);
    assert.ok(/^Hybrid Gen-10[1-3]$/.test(a.name), id + ' renommé : ' + a.name); assert.ok(a.fitness >= 350, id + ' naissance ' + a.fitness);
    assert.strictEqual(a._judgments.length, 0); assert.strictEqual(a._probationUntil, 40); });
  assert.strictEqual(JSON.stringify(S.agents.filter(a => /^h|_bot_|evolver/.test(a.id))), before, 'sains, bot, Évolueur intacts');
  assert.strictEqual(S._genCount, 103); assert.ok(Math.abs(S._lastEvolutionAt - now) < 5000, 'délai repart');
  assert.strictEqual(c.toasts.length, 0, 'pas de toast par évolution (quiet) ni de résumé (silent)');
  assert.ok(/^Évolution demandée · 3 agent\(s\) ≤ 80 T\$ remplacé\(s\)/.test(S.chainLog[S.chainLog.length - 1].desc));
  assert.strictEqual(S.evoLog.filter(e => e.type === 'removed').length, 3, 'retraites journalisées');
  vm.runInContext('triggerEvolution(S.agents[3])', c); assert.strictEqual(S._genCount, 103, 'automatique : délai d\'1 h tenu après la demande');
  const S2 = mkState(now), c2 = mkEvoCtx(S2); vm.runInContext('_evolveBrokenNow()', c2);
  assert.deepStrictEqual(c2.toasts, ['🧬 3 agent(s) faible(s) remplacé(s) par l\'évolution'], 'un seul résumé');
});
T('D2 · juge caché « v6.0 » retiré de la clôture (02) ; rejeu backups 14 → 21/09 : l\'ancien appariement par préfixe (« Hybrid ») donnait TOUJOURS le premier hybride, macro_v1', () => {
  const cp = codeStrict(between(s02, 'function closePosition(', "\n    } catch(e) { console.warn('post-close hooks:', e); }", false));
  assert.ok(!cp.includes('openedBy') && !/agent\.fitness\s*=/.test(cp) && !cp.includes('_LA_MODES'), 'plus de second juge à la clôture');
  assert.ok(codeStrict(s02).includes("learnFromOutcome('position', realisedPct, pos.pair);"), 'le juge unique reste');
  const UP = '/mnt/user-data/uploads/', files = fs.existsSync(UP) ? fs.readdirSync(UP).filter(f => /^aura_guardian_full_2026091[4-9]|^aura_guardian_full_202609(20|21)/.test(f)) : [];
  if (!files.length) { console.log('     ⏳ backups absents de cette machine : rejeu non exécuté (non bloquant)'); return; }
  let n = 0; const ids = new Set();
  files.forEach(f => {
    const st = JSON.parse(fs.readFileSync(UP + f, 'utf8')).aura, pos = [];
    (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (Array.isArray(o._openAgents) && o._openAgents.length) pos.push(o); Object.values(o).forEach(walk); } })(st);
    pos.forEach(p => p._openAgents.forEach(ob => { const hit = st.agents.find(a => a.name && a.name.includes(ob.name)); n++; ids.add(hit && hit.id); }));   // appariement de l'ancien code
  });
  assert.ok(n >= 10, 'entrées rejouées : ' + n); assert.deepStrictEqual([...ids], ['macro_v1'], 'toujours le même siège');
});
T('D3 · panneau « Apprentissage réel » RÉEL (04) : jugements réels, fenêtre (apprise), agents ≤ 80 T$, prochaine évolution, essais en cours ; bouton « Faire évoluer » seulement s\'il y a des faibles ; plus de modes ×3 / ×8, de session, de boost', () => {
  const now = Date.now(), el = { innerHTML: '' };
  const S = { agents: [{ fitness: 50 }, { fitness: 60 }, { fitness: 700 }, { fitness: 20, isBot: true }], _realJudgments: 768, fitWindowRule: { armed: true, window: 90 }, _lastEvolutionAt: now - 20 * 60000, evoTrials: { a: {}, b: {} } };
  const c = { S, Math, Date, Object, window: {}, document: { getElementById: () => el }, _fitWindow: () => 90 }; vm.createContext(c); vm.runInContext(PANEL + '\nrenderLearningAccelSection();', c);
  const h = el.innerHTML;
  ['Apprentissage réel', '>768<', '>90<', 'Fenêtre apprise', 'Agents ≤ 80 T$', 'dans 40 min', 'Évolutions en essai', 'Faire évoluer les 2 agent(s) faible(s) maintenant'].forEach(k => assert.ok(h.includes(k), 'manque : ' + k));
  ['Boost', 'Lancer session', 'entraînement', '×3', '×8', 'Intensif', 'T$ distribués'].forEach(k => assert.ok(!h.includes(k), 'reste : ' + k));
  S.agents = [{ fitness: 500 }]; S._lastEvolutionAt = now - 2 * 3600000; vm.runInContext('renderLearningAccelSection();', c);
  assert.ok(!el.innerHTML.includes('Faire évoluer') && el.innerHTML.includes('possible maintenant'));
});
T('D4 · invariant sur TOUT le code : la fitness ne s\'écrit que par le jugement (03), la naissance (07), la restauration (09b2) — plus la démo (05, restaurée à la sortie) et le marché LMSR (08, connu) ; aucune autre écriture', () => {
  const ALLOW = [
    ['03', 'a.fitness = f;', 2], ['03', 'if (_fw !== null) a.fitness = _fw;', 1], ['03', 'if (_fa !== null) a.fitness = _fa;', 1], ['03', 'else if (before >= FIT_MIN_N) a.fitness = 350;', 1],
    ['03', 'a._judgments = []; a.fitness = 350; a.streak = 0;', 2], ['05', 'a.fitness = preset.agentFitness', 1], ['07', 'weak.fitness = Math.max(350,', 1],
    ['08', 'a.fitness -= cost;', 2], ['09b2', 'a.fitness        = sa.fitness;', 1], ['09b2', 'a.fitness = r.f;', 1]];
  const found = [];
  fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f)).forEach(f => rd('js/' + f).split('\n').forEach((l, i) => {
    if (/^\s*\/\//.test(l)) return;
    const re = /(^|[^\w$.])([\w$]+(?:\.[\w$]+)*)\.fitness\s*([-+*/]?=)(?!=)/g; let m;
    while ((m = re.exec(l))) found.push({ f: f.split('-')[0], l: l.trim(), at: f + ':' + (i + 1) });
  }));
  const used = found.map(() => false);
  ALLOW.forEach(([f, sub, n]) => { let k = 0; found.forEach((x, i) => { if (!used[i] && x.f === f && x.l.includes(sub) && k < n) { used[i] = true; k++; } }); assert.strictEqual(k, n, 'attendu ' + n + ' × ' + f + ' « ' + sub + ' », trouvé ' + k); });
  const extra = found.filter((x, i) => !used[i]).map(x => x.at + ' ' + x.l.slice(0, 90));
  assert.deepStrictEqual(extra, [], 'écritures de fitness hors liste :\n' + extra.join('\n'));
});
T('S1 · textes : plus de revigoration (fonctions, boutons), plus d\'apprentissage accéléré (modes, session, boost) ; boutons « Faire évoluer » (fenêtre des cassés, Déblocages) ; bots et Évolueur sans bouton ; alerte sans « session » ; 07 : manual / quiet', () => {
  const all = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f)).map(f => codeStrict(rd('js/' + f))).join('\n');
  ['_revigorBrokenAgents', '_revigorBots', 'boostAllAgents', 'startLearningSession', 'setLearningMode', '_LA_MODES', '_LA_SESSION'].forEach(k => assert.ok(!all.includes(k), 'reste : ' + k));
  const c03 = codeStrict(s03), c04 = codeStrict(s04), c07 = codeStrict(s07);
  assert.ok(c03.includes('<button onclick="_evolveBrokenNow(); document.getElementById(\'brokenAgentsDetail\')?.remove();"') && c03.includes('🧬 Faire évoluer les ${learners.length} agent(s) maintenant'));
  assert.ok(c03.includes('const bots = broken.filter(a => a.isBot || a.isMeta);') && c03.includes('aucun bouton ne la réécrit'));
  assert.ok(c04.includes('<button onclick="window._evolveBrokenNow()"') && c04.includes('🧬 Faire évoluer agents cassés') && !c04.includes("Lance une session d'apprentissage accéléré"));
  assert.ok(c07.includes('if(!(opts && opts.manual) && S._lastEvolutionAt && (Date.now() - S._lastEvolutionAt) < _EVO_COOLDOWN_MS) return;') && c07.includes("if (!(opts && opts.quiet)) showToast("));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
