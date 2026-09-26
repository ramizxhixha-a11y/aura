// banc-memoire-bots.js — [MÉMOIRE DES BOTS · 26/09/2026] VERSION 20260926h
// Les bots et le méta n'ont jamais eu d'épisodes (03 learnFromOutcome les juge et sort avant enrichMemory) : la carte montrait un
// bandeau vide. Leur vraie mémoire — la fenêtre de jugements (fitness glissante) et les interventions comptées de la flotte — est
// résumée par _botMemorySummary (07, pur) et affichée dans le bandeau ; showMemoryOverlay (03) la dit au lieu de « aucune mémoire ».
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js');
const SUMMARY = between(s07, 'function _botMemorySummary(a) {', 'window._botMemorySummary = _botMemorySummary;', false);
const OVERLAY = between(s03, 'function showMemoryOverlay(agentId) {', "  let overlay = document.getElementById('memoryOverlay');", false) + '}';
const J = v => JSON.parse(JSON.stringify(v));
const jud = (n, favEvery) => Array.from({ length: n }, (_, i) => ({ s: (i % favEvery === 0) ? 1 : -1, w: 1 + (i % 3), k: i + 1 }));
console.log('▶ banc-memoire-bots');
T('D1 · _botMemorySummary RÉEL : bot de la flotte → n / favorables / % / bilan pondéré / fenêtre / interventions / apport ; méta → hors flotte ; scout → null ; sans jugement → n 0 ; fenêtre effective suivie', () => {
  const S = { botFleet: { exec_bot_v1: { contributions: 12, pnlContrib: 0 }, rescue_bot_v1: { contributions: 3, pnlContrib: -1.234 } } };
  const c = { S, Math, Number, Array, window: {} }; vm.createContext(c); vm.runInContext(SUMMARY, c);
  c.bot = { id: 'exec_bot_v1', isBot: true, _judgments: jud(80, 2) };   // 80 jugements, 1 sur 2 favorable
  const r = J(vm.runInContext('_botMemorySummary(bot)', c));
  assert.deepStrictEqual(r, { n: 60, fav: 30, pct: 50, weighted: 0, window: 60, interventions: 12, contrib: 0 }, JSON.stringify(r));
  c.res = { id: 'rescue_bot_v1', isBot: true, _judgments: jud(10, 5) };   // 2 favorables sur 10
  const r2 = J(vm.runInContext('_botMemorySummary(res)', c)); assert.deepStrictEqual([r2.n, r2.fav, r2.pct, r2.interventions, r2.contrib], [10, 2, 20, 3, -1.23]);
  assert.ok(r2.weighted < 0, 'bilan pondéré négatif : ' + r2.weighted);
  c.meta = { id: 'evolver_v1', isMeta: true, _judgments: jud(5, 1) }; const r3 = J(vm.runInContext('_botMemorySummary(meta)', c)); assert.deepStrictEqual([r3.n, r3.fav, r3.pct, r3.interventions, r3.contrib], [5, 5, 100, null, null]);
  c.scout = { id: 'macro_v1', _judgments: jud(5, 1) }; assert.strictEqual(vm.runInContext('_botMemorySummary(scout)', c), null);
  c.empty = { id: 'dca_bot_v1', isBot: true }; const r4 = J(vm.runInContext('_botMemorySummary(empty)', c)); assert.deepStrictEqual([r4.n, r4.pct, r4.weighted, r4.interventions], [0, null, null, null]);
  c._fitWindow = () => 20; const r5 = J(vm.runInContext('_botMemorySummary(bot)', c)); assert.deepStrictEqual([r5.n, r5.window], [20, 20], 'fenêtre apprise suivie');
});
T('D2 · showMemoryOverlay RÉEL (03) : un bot sans épisodes reçoit sa vraie mémoire en toast (jugements, interventions, apport) ; un agent sans rien : « aucune mémoire » ; un agent avec épisodes passe à l\'overlay', () => {
  const toasts = [];
  const S = { agents: [{ id: 'rescue_bot_v1', name: 'Bot Sauvetage', isBot: true, memory: [], _judgments: jud(10, 5) }, { id: 'x', name: 'X', memory: [] }, { id: 'y', name: 'Y', memory: [{ won: true }] }], botFleet: { rescue_bot_v1: { contributions: 3, pnlContrib: -1.234 } } };
  const c = { S, Math, Number, Array, window: {}, showToast: (t) => toasts.push(t), document: {} };
  vm.createContext(c); vm.runInContext(SUMMARY + '\n' + OVERLAY, c);
  vm.runInContext("showMemoryOverlay('rescue_bot_v1')", c);
  assert.strictEqual(toasts[0], '🧮 Bot Sauvetage · 2 jugements favorables sur 10 (20 %) · fenêtre 60 · 3 intervention(s) · apport −$1.23');
  vm.runInContext("showMemoryOverlay('x')", c); assert.strictEqual(toasts[1], '📭 Aucune mémoire pour cet agent encore');
  vm.runInContext("showMemoryOverlay('y')", c); assert.strictEqual(toasts.length, 2, 'avec épisodes : aucun toast, la suite (overlay DOM, hors extrait) prend le relais');
});
T('S1 · textes : 07 bandeau (label 🧮 MÉMOIRE RÉELLE, compteur jug., texte, interventions/apport, hors flotte, legacy) sous condition bot/méta sans épisodes ; 03 en-tête', () => {
  const c7 = codeStrict(s07);
  assert.ok(c7.includes("if(elMstrip && (a.isBot || a.isMeta) && !(a.memory && a.memory.length > 0) && typeof _botMemorySummary === 'function') {"));
  ["lab.textContent = '🧮 MÉMOIRE RÉELLE';", "elMemCnt.textContent  = bm.n + ' jug.';", "' jugements favorables sur ' + bm.n + ' (' + bm.pct + ' %) · fenêtre ' + bm.window + ' · bilan pondéré '", "bm.interventions === null ? 'hors flotte' :", "elMemPair.textContent = 'fitness glissante';", "elMemLegacy.textContent = '🧮 ' + bm.n + ' jug. · ' + bm.fav + '✓';"].forEach(t => assert.ok(c7.includes(t), t));
  assert.ok(s03.split('\n').slice(0, 3).some(l => l.startsWith('// [MÉMOIRE DES BOTS · 26/09/2026] VERSION 20260926h')));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
