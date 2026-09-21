// banc-plafonds-appris.js — [PLAFONDS APPRIS · 22/09/2026] VERSION 20260922b
// Le nombre de positions en même temps (en tout, par sens) n'est plus un chiffre choisi : il est appris par paliers,
// sur les propres trades du système (combien de positions étaient déjà ouvertes à l'ouverture, et comment ça a fini).
// Fonctions RÉELLES de 10i en vm ; épingles sur 10c (enregistrement), 09c/10e (application), 11 (GBP→BNB).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s10i = rd('js/10i-intel-bus.js');
const SRC = between(s10i, 'var CAP_MIN_N = 8, CAP_MIN_WORSE = 0.6, CAP_WINDOW = 30;', 'window._capEval = _capEval;', false);
const J = v => JSON.parse(JSON.stringify(v));
function ctx(S) { const c = { S, Math, Number, Object, Array, JSON, isFinite, String, window: {}, nowStr: () => 'hh:mm', Date: { now: () => 1 }, PAIRS: { 'A/USDT': {}, 'B/USDT': {}, 'C/USDT': {} } }; vm.createContext(c); vm.runInContext(SRC, c); return c; }
// mk(kind-count, pnl, side) : trade clos ouvert alors que `n` positions (en tout / même sens) étaient déjà là
const mk = (openTotal, openSameDir, pnl, side) => ({ closedAt: 1, pnlPct: pnl, side: side || 'long', openTotal, openSameDir });
console.log('▶ banc-plafonds-appris');
T('D1 · sans données : le plafond = le départ (config) ; plancher 1 ; plafond = nombre de paires', () => {
  const c = ctx({}); c.mem = [];
  assert.strictEqual(J(vm.runInContext("_capEval('total', mem, 3, 11)", c)).level, 3);
  assert.strictEqual(J(vm.runInContext("_capEval('total', mem, 0, 11)", c)).level, 1, 'plancher 1');
  assert.strictEqual(J(vm.runInContext("_capEval('total', mem, 20, 11)", c)).level, 11, 'jamais au-dessus du nombre de paires');
});
T('D2 · monte d\'un palier quand le k-ième n\'a pas nui (≥ 8 cas, gagne encore), palier par palier, jamais deux d\'un coup ; gagner un peu moins que les autres n\'est pas nuire', () => {
  const c = ctx({}); const mem = [];
  for (let i = 0; i < 10; i++) mem.push(mk(0, 0, 0.3));   // référence : ouverts seuls
  for (let i = 0; i < 10; i++) mem.push(mk(1, 0, 0.2));   // 2e position : bien
  for (let i = 0; i < 9; i++) mem.push(mk(2, 0, 0.25));   // 3e position : n'a pas nui → le niveau 3 est prouvé → on ouvre le 4
  c.mem = mem;
  const r = J(vm.runInContext("_capEval('total', mem, 3, 11)", c));
  assert.strictEqual(r.level, 4, JSON.stringify(r)); assert.deepStrictEqual(r.proven, [2, 3]);
  // le 4e n'a que 5 cas → inconnu → on reste à 4 (pas 5)
  for (let i = 0; i < 5; i++) mem.push(mk(3, 0, 0.5)); c.mem = mem;
  assert.strictEqual(J(vm.runInContext("_capEval('total', mem, 3, 11)", c)).level, 4, 'niveau 4 pas encore prouvé');
  for (let i = 0; i < 3; i++) mem.push(mk(3, 0, 0.5)); c.mem = mem;
  assert.strictEqual(J(vm.runInContext("_capEval('total', mem, 3, 11)", c)).level, 5, '8 cas : le 4e est prouvé → 5');
});
T('D3 · redescend sous le premier palier nuisible (PERD en moyenne, pire que la référence, ≥ 60 % pire) ; le cas du 21/09 : le 3e long a nui → même sens LONG = 2', () => {
  const c = ctx({}); const mem = [];
  for (let i = 0; i < 12; i++) mem.push(mk(0, 0, 0.2, 'long'));
  for (let i = 0; i < 10; i++) mem.push(mk(1, 1, 0.1, 'long'));
  for (let i = 0; i < 9; i++) mem.push(mk(2, 2, i < 7 ? -1.2 : 0.3, 'long'));   // 3e long : 7/9 pire, moyenne −0,87
  c.mem = mem;
  const r = J(vm.runInContext("_capEval('long', mem, 3, 11)", c));
  assert.strictEqual(r.level, 2, JSON.stringify(r)); assert.strictEqual(r.harmful, 3);
  assert.strictEqual(J(vm.runInContext("_capEval('short', mem, 3, 11)", c)).level, 3, 'les shorts n\'ont pas de données : départ');
  // perd en moyenne mais seulement 50 % pire → pas nuisible
  const c2 = ctx({}); const m2 = [];
  for (let i = 0; i < 12; i++) m2.push(mk(0, 0, 0.2));
  for (let i = 0; i < 10; i++) m2.push(mk(2, 0, i < 5 ? -2 : 0.5)); c2.mem = m2;   // 5 pires, 5 meilleures que la référence : 50 %
  assert.strictEqual(J(vm.runInContext("_capEval('total', mem, 3, 11)", c2)).harmful, null);
  // nuisible dès le 2e → plancher 1
  const c3 = ctx({}); const m3 = [];
  for (let i = 0; i < 10; i++) m3.push(mk(0, 0, 0.5)); for (let i = 0; i < 10; i++) m3.push(mk(1, 0, -1)); c3.mem = m3;
  assert.strictEqual(J(vm.runInContext("_capEval('total', mem, 3, 11)", c3)).level, 1);
});
T('D4 · fenêtre 30 : de vieux résultats nuisibles n\'empêchent pas la remontée quand les 30 derniers sont sains', () => {
  const c = ctx({}); const mem = [];
  for (let i = 0; i < 15; i++) mem.push(mk(0, 0, 0.2));
  for (let i = 0; i < 40; i++) mem.push(mk(2, 0, -1.5));   // vieux : le 3e nuisait
  for (let i = 0; i < 30; i++) mem.push(mk(2, 0, 0.25));   // récents : il ne nuit plus
  c.mem = mem;
  const r = J(vm.runInContext("_capEval('total', mem, 3, 11)", c));
  assert.strictEqual(r.harmful, null); assert.strictEqual(r.level, 4, JSON.stringify(r));
});
T('D5 · _capRefresh / _capFor : règles par nature, journal 🪜 seulement quand un niveau change, plafond = paires actives du mode, départ = config', () => {
  const S = { tradingMode: 'paperReal', paperRealConfig: { maxConcurrentPos: 3 }, paperRealActivePairs: { 'A/USDT': true, 'B/USDT': true, 'C/USDT': false }, tradeContextMemory: [], chainLog: [] };
  const c = ctx(S);
  assert.strictEqual(vm.runInContext('_capCeiling()', c), 2, '2 paires actives');
  vm.runInContext('_capRefresh()', c);
  assert.strictEqual(S.capRules.total.level, 2, 'départ 3 ramené au plafond des paires actives (2)'); assert.strictEqual(S.chainLog.length, 0, 'première évaluation : pas de journal');
  assert.strictEqual(vm.runInContext("_capFor('total')", c), 2); assert.strictEqual(vm.runInContext("_capFor('long')", c), 2);
  S.paperRealActivePairs['C/USDT'] = true;
  for (let i = 0; i < 10; i++) S.tradeContextMemory.push(mk(0, 0, 0.2)); for (let i = 0; i < 10; i++) S.tradeContextMemory.push(mk(1, 1, -1.5));
  vm.runInContext('_capRefresh()', c);
  assert.strictEqual(S.capRules.total.level, 1); assert.strictEqual(S.capRules.long.level, 1);
  assert.ok(S.chainLog.some(e => e.desc.startsWith('Emplacements appris · en tout · 2 → 1 (le 2e a nui sur 10 cas)')), JSON.stringify(S.chainLog));
  const cS = ctx({ tradingMode: 'sim', paperRealActivePairs: {} }); assert.strictEqual(vm.runInContext('_capCeiling()', cS), 3, 'AA : toutes les PAIRS');
  assert.strictEqual(vm.runInContext("_capFor('total')", ctx({ tradingMode: 'paperReal', paperRealConfig: { maxConcurrentPos: 3 } })), 3, 'sans règle : la config');
});
T('S1 · branchements : 10c note openTotal/openSameDir à l\'ouverture (paire candidate exclue), 09c lit _capFor(total) en EV et garde 1 en RE, 10e lit _capFor(long|short), 09d1 recalcule à la clôture, 09b1/09b2 + manifest + boot', () => {
  const c10c = codeStrict(rd('js/10c-profil-ab-contexte.js')), c09c = codeStrict(rd('js/09c-auto-open.js')), c10e = codeStrict(rd('js/10e-helpers-adaptatifs.js')), c9d = codeStrict(rd('js/09d1-paper-real-core.js')), c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js'));
  assert.ok(c10c.includes("openTotal: (S.openPositions || []).filter(function (p) { return p && p.pair && p.pair !== pair; }).length,"));
  assert.ok(c10c.includes('openSameDir: (S.openPositions || []).filter(function (p) { return p && p.pair && p.pair !== pair &&'));
  assert.ok(c09c.includes("const _capMax = (S.tradingMode === 'real') ? 1 : ((typeof _capFor === 'function') ? _capFor('total') :"), 'EV appris, RE = 1');
  assert.ok(c10e.includes("const max = (typeof _capFor === 'function') ? _capFor(wantLong ? 'long' : 'short') : DIR_CAP_MAX;") && c10e.includes('out.veto = out.count >= max;'));
  assert.ok(c9d.includes("if (typeof _capRefresh === 'function') _capRefresh();"));
  assert.ok(c1.includes('capRules: S.capRules || {},') && c2.includes('S.capRules          = snap.capRules;') && c2.includes("'capRules'") && c2.includes('_capRefresh();'));
});
T('S2 · GBP/USDT → BNB/USDT par l\'organe existant (11 removePair/addPair), une fois, drapeau persisté, jamais hors ligne, retrait refusé si position ouverte', () => {
  const c11 = codeStrict(rd('js/11-gestion-paires.js'));
  assert.ok(c11.includes("removePair('GBP/USDT')") && c11.includes("addPair('BNB')") && c11.includes('if (S._gbpToBnbDone) return;') && c11.includes('if (window._auraNetOffline) return;'));
  assert.ok(c11.includes('setTimeout(_migrateGbpToBnb, 15000);'));
  assert.ok(codeStrict(rd('js/09b1-build-snapshot.js')).includes('_gbpToBnbDone: !!S._gbpToBnbDone,') && codeStrict(rd('js/09b2-save-load.js')).includes('if (snap._gbpToBnbDone) S._gbpToBnbDone = true;'));
  // removePair refuse s'il y a une position ouverte sur la paire : c'est la garde qui protège une position AA sur GBP
  assert.ok(c11.includes("if (held.length) return { ok: false, reason: 'position ouverte sur ' + pair"));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
