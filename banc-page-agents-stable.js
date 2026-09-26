// banc-page-agents-stable.js — [PAGE AGENTS STABLE · 26/09/2026] VERSION 20260926i
// Rams : « la page agents n'est pas stable visuellement ». Cause : renderAgents (08, toutes les 5 s) comparait list.children.length
// (cartes + titres de groupe) à S.agents.length → toujours différent → 31 cartes détruites/recréées toutes les 5 s (barres reparties
// de 0 %, bandeaux mémoire masqués → la page raccourcit → le défilement saute, filtre perdu). Fonctions RÉELLES de 07 en vm, DOM simulé.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s07 = rd('js/07-v90-mode-bunker-sos.js'), css = rd('css/07-page-agents.css'), s08 = rd('js/08-learning-history-render.js');
const PRE = between(s07, 'var _agSpkResize = true;', '/* ── stable agent card IDs', false);
const BUILD = between(s07, "var _agCardsSig = '';", '\nfunction patchAgentCards() {', false);
const PATCH = between(s07, 'function patchAgentCards() {', '\n}\n', true);
const EVO = between(s07, 'function renderAgentsEvo() {', '\n}\n', true);

// ── DOM simulé ──
function mkCtx2d(log) { const noop = () => {}; return new Proxy({}, { get: (t, k) => k === 'createLinearGradient' ? () => ({ addColorStop: noop }) : (k in t ? t[k] : (k === 'setTransform' ? () => log.push('draw') : noop)), set: (t, k, v) => { t[k] = v; return true; } }); }
function mkDoc(opts) {
  opts = opts || {};
  const els = {}, log = { widthSets: 0, draws: [] };
  const mk = id => {
    const e = { id, style: {}, textContent: '', className: '', dataset: {}, children: [], _html: '', offsetWidth: (opts.width === undefined ? 240 : opts.width), parentElement: { offsetWidth: (opts.pwidth === undefined ? 260 : opts.pwidth) },
      querySelector: () => ({ textContent: '' }), querySelectorAll: () => [], appendChild(c) { this.children.push(c); }, remove() {}, parentNode: { insertBefore() {} } };
    let w = 0, h = 0;
    Object.defineProperty(e, 'width', { get: () => w, set: v => { w = v; log.widthSets++; } });
    Object.defineProperty(e, 'height', { get: () => h, set: v => { h = v; } });
    e.getContext = () => mkCtx2d(log.draws);
    return e;
  };
  const document = { getElementById: id => (opts.missing && opts.missing.includes(id)) ? null : (els[id] || (els[id] = mk(id))), createElement: () => mk('new'), querySelectorAll: () => [] };
  return { document, els, log };
}
const agents = () => [
  { id: 'macro_v1', name: 'Hybrid Gen-1', emoji: '🧬', type: 'Indices·Marché', source: 'F&G', role: 'hybrid', fitness: 750, score: 0.2, conf: 0.7, errors: 5, streak: 4, color: '#0f0', memory: [], fitnessHistory: [700, 750] },
  { id: 'exec_bot_v1', name: 'Bot Exécution', emoji: '⚡', type: 'x', source: 'y', role: 'execution', isBot: true, fitness: 350, score: 0, conf: 0.5, errors: 0, streak: 0, color: '#f00', memory: [], _judgments: [], fitnessHistory: [350, 350] }
];

console.log('▶ banc-page-agents-stable');
T('D1 · buildAgentCards RÉEL : construit une fois ; même composition → AUCUNE reconstruction (renderAgents l\'appelle toutes les 5 s) ; un rôle qui change → reconstruit ; les cartes naissent à leur état final (barre à sa largeur, bandeau visible, badges à place fixe)', () => {
  const { document } = mkDoc();
  const page = { scrollTop: 0, parentElement: null };
  let sets = 0, html = '';
  const list = { parentElement: page, querySelectorAll: () => [], querySelector: sel => html.includes('agent-card') ? {} : null };
  Object.defineProperty(list, 'innerHTML', { get: () => html, set: v => { html = v; sets++; } });
  document.getElementById = id => id === 'mobileAgentList' ? list : null;
  const S = { agents: agents(), botFleet: { exec_bot_v1: { contributions: 0, pnlContrib: 0 } } };
  const c = { S, document, Math, Number, Array, Object, String, window: {} }; vm.createContext(c); vm.runInContext(BUILD, c);
  vm.runInContext('buildAgentCards()', c); assert.strictEqual(sets, 1);
  for (let i = 0; i < 5; i++) vm.runInContext('buildAgentCards()', c);
  assert.strictEqual(sets, 1, 'même composition : pas de reconstruction');
  S.agents[0].fitness = 900; S.agents[0].name = 'Hybrid Gen-2'; vm.runInContext('buildAgentCards()', c); assert.strictEqual(sets, 1, 'fitness / nom : mis à jour en place par le patch');
  S.agents[1].role = 'hybrid'; vm.runInContext('buildAgentCards()', c); assert.strictEqual(sets, 2, 'rôle changé : reconstruit');
  assert.ok(html.includes('id="afb_macro_v1" style="width:60%;'), 'barre à sa largeur (900/1500) : ' + html.slice(html.indexOf('afb_macro_v1'), html.indexOf('afb_macro_v1') + 40));
  assert.ok(html.includes(`<div id="amstrip_macro_v1" class="memory-strip" onclick="showMemoryOverlay('macro_v1')">`) && !html.includes('display:none;">\n        <div class="memory-strip-label">'), 'bandeau visible dès la construction');
  assert.ok(html.includes('id="aebdg_macro_v1" style="display:none;') && html.includes('id="asbdg_macro_v1" style="display:none;') && !html.includes('⚠ 5 err.'), 'badges : emplacements fixes, remplis par le patch');
  assert.ok(!html.includes('animation-delay') && html.includes('flex-wrap:nowrap;min-width:0;overflow:hidden;'));
});
T('D1b · reconstruction : le défilement de la page est restauré (le remplacement le ramenait à 0) et le filtre de rôle actif est réappliqué', () => {
  const { document } = mkDoc();
  const page = { scrollTop: 480, parentElement: null };
  const cards = [{ dataset: { agentRole: 'hybrid' }, style: {} }, { dataset: { agentRole: 'execution' }, style: {} }];
  let html = '';
  const list = { parentElement: page, querySelectorAll: () => cards, querySelector: () => html.includes('agent-card') ? {} : null };
  Object.defineProperty(list, 'innerHTML', { get: () => html, set: v => { html = v; page.scrollTop = 0; } });   // le navigateur raccourcit / ramène en haut
  document.getElementById = id => id === 'mobileAgentList' ? list : null;
  const c = { S: { agents: agents(), botFleet: {} }, document, Math, Number, Array, Object, String, window: {}, _agentFilter: 'execution' };
  vm.createContext(c); vm.runInContext('var _agentFilter = "execution";\n' + BUILD, c);
  vm.runInContext('buildAgentCards()', c);
  assert.strictEqual(page.scrollTop, 480, 'défilement restauré');
  assert.strictEqual(cards[0].style.display, 'none', 'carte hors filtre masquée'); assert.strictEqual(cards[1].style.display, undefined, 'carte du filtre intacte');
});
function patchCtx(opts) {
  const d = mkDoc(opts);
  const S = Object.assign({ agents: agents(), botFleet: { exec_bot_v1: { contributions: 2, pnlContrib: 0 } }, mutedAgents: [], globalMemoryPool: [], dreams: [], dreamActive: false }, (opts && opts.S) || {});
  const c = { S, document: d.document, Math, Number, Array, Object, String, JSON, window: { devicePixelRatio: 2 }, tick: 1 };
  vm.createContext(c); vm.runInContext(PRE + '\n' + PATCH, c);
  return { c, S, els: d.els, log: d.log, run: () => vm.runInContext('patchAgentCards()', c) };
}
T('D2 · patchAgentCards RÉEL : l\'historique de fitness ne reçoit un point QUE si une fitness change (tous les agents ensemble) — plus un point par seconde qui faisait glisser les courbes', () => {
  const t = patchCtx();
  t.run(); const n0 = t.S.agents.map(a => a.fitnessHistory.length);
  for (let i = 0; i < 5; i++) t.run();
  assert.deepStrictEqual(t.S.agents.map(a => a.fitnessHistory.length), n0, 'rien ne change : aucun point');
  t.S.agents[0].fitness = 760; t.run();
  assert.deepStrictEqual(t.S.agents.map(a => a.fitnessHistory.length), n0.map(n => n + 1), 'une fitness change : un point pour chacun (séries alignées)');
  assert.deepStrictEqual(t.S.agents.map(a => a.fitnessHistory[a.fitnessHistory.length - 1]), [760, 350]);
  for (let i = 0; i < 70; i++) { t.S.agents[0].fitness = 700 + i; t.run(); }
  assert.strictEqual(t.S.agents[0].fitnessHistory.length, 60, 'plafond 60');
});
T('D3 · sparklines : dessinées au premier passage, PAS redessinées ni réallouées tant que la série ne change pas ; redessinées sur changement ou redimensionnement ; carte masquée (largeur 0) ignorée', () => {
  const t = patchCtx();
  t.run(); const draws1 = t.log.draws.length, sets1 = t.log.widthSets;
  assert.strictEqual(draws1, 2, 'deux cartes dessinées'); assert.strictEqual(sets1, 2);
  for (let i = 0; i < 10; i++) t.run();
  assert.strictEqual(t.log.draws.length, draws1, 'série inchangée : aucun dessin'); assert.strictEqual(t.log.widthSets, sets1, 'aucune réallocation');
  t.S.agents[1].fitness = 400; t.run();
  assert.strictEqual(t.log.draws.length, draws1 + 2, 'une fitness change : les deux séries reçoivent un point → deux dessins');
  assert.strictEqual(t.log.widthSets, sets1, 'même largeur : le canevas n\'est pas réalloué');
  vm.runInContext('_agSpkResize = true;', t.c); t.run(); assert.strictEqual(t.log.draws.length, draws1 + 4, 'redimensionnement : tout est redessiné une fois'); t.run(); assert.strictEqual(t.log.draws.length, draws1 + 4);
  const hid = patchCtx({ width: 0, pwidth: 0 }); hid.run(); hid.run();
  assert.strictEqual(hid.log.draws.length, 0, 'cartes masquées (largeur 0) : rien dessiné');
  hid.els['aspk_macro_v1'].offsetWidth = 240; hid.run();
  assert.strictEqual(hid.log.draws.length, 1, 'la carte redevient visible : dessinée à sa vraie largeur');
});
T('D4 · badges à place fixe : ⚠ au-delà de 3 erreurs, 🔥 à partir de 3 en série — montrés / cachés par le patch, jamais recréés', () => {
  const t = patchCtx(); t.run();
  assert.deepStrictEqual([t.els['aebdg_macro_v1'].textContent, t.els['aebdg_macro_v1'].style.display, t.els['asbdg_macro_v1'].textContent, t.els['asbdg_macro_v1'].style.display], ['⚠ 5 err.', '', '🔥 4', '']);
  assert.deepStrictEqual([t.els['aebdg_exec_bot_v1'].style.display, t.els['asbdg_exec_bot_v1'].style.display], ['none', 'none']);
  t.S.agents[0].errors = 2; t.S.agents[0].streak = 0; t.run();
  assert.deepStrictEqual([t.els['aebdg_macro_v1'].style.display, t.els['asbdg_macro_v1'].style.display], ['none', 'none']);
});
T('D5 · renderAgentsEvo RÉEL : le journal (40 entrées, 25 affichées) n\'est reconstruit que si les entrées affichées changent (avant : à CHAQUE rendu dès 26 entrées) ; bannière de rêve réécrite seulement si son contenu change', () => {
  const d = mkDoc(); let evSets = 0, evHtml = '';
  const ev = { dataset: {}, children: [], appendChild(x) { this.children.push(x); }, parentNode: { insertBefore() {} } };
  Object.defineProperty(ev, 'innerHTML', { get: () => evHtml, set: v => { evHtml = v; evSets++; ev.children = []; } });
  const created = []; let bSets = 0;
  d.document.getElementById = id => id === 'mobileEvoList' ? ev : id === 'dreamActiveBanner' ? (created.find(e => e.id === 'dreamActiveBanner' && !e._removed) || null) : null;
  d.document.createElement = () => { const b = { id: '', _h: '', className: '', remove() { this._removed = true; } }; Object.defineProperty(b, 'innerHTML', { get: () => b._h, set: v => { b._h = v; if (b.id === 'dreamActiveBanner') bSets++; } }); created.push(b); return b; };
  const log = Array.from({ length: 40 }, (_, i) => ({ type: i % 2 ? 'new' : 'removed', title: 'évolution ' + i, desc: 'd', time: '10:' + String(i).padStart(2, '0') }));
  const S = { evoLog: log, dreams: [], dreamActive: false };
  const c = { S, document: d.document, Math, Number, Array, Object, String, window: {} }; vm.createContext(c); vm.runInContext(EVO, c);
  vm.runInContext('renderAgentsEvo()', c); assert.strictEqual(evSets, 1); assert.strictEqual(ev.children.length, 25);
  for (let i = 0; i < 5; i++) vm.runInContext('renderAgentsEvo()', c);
  assert.strictEqual(evSets, 1, 'rien de nouveau : pas de reconstruction');
  log.push({ type: 'new', title: 'évolution 40', desc: 'd', time: '11:00' }); log.shift();
  vm.runInContext('renderAgentsEvo()', c); assert.strictEqual(evSets, 2, 'nouvelle entrée (journal plein) : reconstruit');
  S.dreamActive = true; S.currentDream = { id: 3, scenarios: [{ icon: '🌊', name: 'a', sub: 'b', outcome: null }] }; S.dreamProgress = 40;
  vm.runInContext('renderAgentsEvo()', c); vm.runInContext('renderAgentsEvo()', c); vm.runInContext('renderAgentsEvo()', c);
  assert.strictEqual(bSets, 1, 'bannière identique : écrite une fois');
  S.dreamProgress = 60; vm.runInContext('renderAgentsEvo()', c); assert.strictEqual(bSets, 2, 'progression : réécrite');
});
T('S1 · CSS : chiffres à chasse fixe, lignes sans retour, souvenir 2 lignes à hauteur fixe, pas de pulsation au rappel ; 08 renderAgents inchangé (appelle un build désormais idempotent)', () => {
  ['#mobileAgentList, #agentHeatmapGrid { font-variant-numeric: tabular-nums; }', '#mobileAgentList .memory-metaphor { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; height: 2.9em; }',
   '#mobileAgentList .memory-recall-pulse { animation: none; }', '#mobileAgentList .agent-type-row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }', '#mobileAgentList .agent-meta-row { flex-wrap: nowrap; overflow: hidden; white-space: nowrap; }'].forEach(r => assert.ok(css.includes(r), r));
  assert.ok(codeStrict(s08).includes('if(list && list.children.length !== S.agents.length) buildAgentCards();'), '08 inchangé');
  assert.ok(codeStrict(s07).includes("if (_sig === _agCardsSig && list.querySelector('.agent-card')) return;"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
