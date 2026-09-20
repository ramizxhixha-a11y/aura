// banc-journal-evenements.js — [JOURNAL DES ÉVÉNEMENTS · 20/09/2026] VERSION 20260920b
// Le journal chainLog (100 en RAM, 50 sauvegardées, 105 écrivains) ne couvrait que 3 minutes dans le backup du
// 20/09 : impossible de compter les sorties d'une nuit. Ici : un second journal filtré (S.eventLog) + des compteurs
// par jour (S.eventStats), alimentés par un relais sur le push de chainLog — aucun appelant modifié.
// Fonctions RÉELLES de 02, testées sur des lignes RÉELLES du backup.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s02 = rd('js/02-state-init.js');
const SRC = between(s02, 'const EVENT_KINDS = [', 'window._eventKind = _eventKind;', false);
function ctx(S) { const c = { S, Math, Number, Array, Object, JSON, Date, String, isFinite, window: {} }; vm.createContext(c); vm.runInContext(SRC, c); return c; }
const J = v => JSON.parse(JSON.stringify(v));
const kind = (c, desc) => { c.e = { desc: desc }; return vm.runInContext('_eventKind(e)', c); };
console.log('▶ banc-journal-evenements');
T('D1 · classement des lignes RÉELLES du backup : le bruit à haute fréquence n\'est PAS gardé, les événements le sont', () => {
  const c = ctx({});
  // bruit réel du backup 20/09 (les lignes qui noyaient le journal)
  ['Prix réels mis à jour: 9 paires via CoinGecko', 'Bot ETH/USDT: cycle 1m→50s · conv. 31%',
   'Learn[cycle][LINK/USDT] +0.01% → 🏆Hybrid Gen-95152(869T$)', 'News · DOGE/USDT SHORT retenu · news 24 h 84/100 (6 art.)'
  ].forEach(d => assert.strictEqual(kind(c, d), null, 'bruit gardé : ' + d));
  // événements réels
  const cas = {
    'Trailing stop · AVAX/USDT LONG · pic 80 % du chemin → sortie @+1.10 %': 'sortie_trailing',
    'Timer anti-zombie · EUR/USDT · 43min flat (-0.05%)': 'sortie_zombie',
    'Consensus switch · PEPE/USDT SHORT · Brain bascule (LMSR 28%)': 'sortie_consensus',
    'Fermé AVAX/USDT LONG | +0.58% (+$0.3 USDT)': 'fermeture',
    'Bénéfice AVAX/USDT · Net +$0.23 · Caisse +$0.12 (50%)': 'argent',
    'Évolueur: Hybrid Gen-95164 ← 6 ADN fusionnés · mut 0.15': 'evolution',
    'Génome volatility_v1 : 7/7 gènes mutés (±15 %)': 'evolution',
    'Génome de paire ETH/USDT : 4/12 gènes mutés (P&L de référence 1.50 $)': 'evolution',
    'Auto-revigoration · 8 agent(s) apprenant(s) restaurés (seuil >3)': 'evolution',
    'Hybrid Gen-95119 auto-recalibré · fitness critique': 'evolution',
    'Réseau · Binance injoignable (2 échecs)': 'reseau',
    'Veto RSI · SOL/USDT LONG bloqué · RSI 99 (suracheté)': 'veto',
    'BLACKLIST · GBP/USDT LONG bloqué · WR insuffisant': 'veto'
  };
  Object.keys(cas).forEach(d => assert.strictEqual(kind(c, d), cas[d], d.slice(0, 40) + ' → ' + kind(c, d)));
  assert.strictEqual(kind(c, ''), null); assert.strictEqual(vm.runInContext('_eventKind(null)', c), null);
});
T('D2 · _eventNote : compteurs par jour et par nature, anneau de 400, 7 jours gardés, le bruit ne compte pas', () => {
  const c = ctx({});
  c.mk = d => ({ desc: d, icon: '🎯' });
  vm.runInContext("_eventNote(mk('Trailing stop · X · pic 70 % du chemin'))", c);
  vm.runInContext("_eventNote(mk('Trailing stop · Y · pic 65 % du chemin'))", c);
  vm.runInContext("_eventNote(mk('Timer anti-zombie · Z · 31min flat'))", c);
  assert.strictEqual(vm.runInContext("_eventNote(mk('Prix réels mis à jour: 9 paires'))", c), null, 'bruit : rien');
  const day = Object.keys(c.S.eventStats)[0];
  assert.deepStrictEqual(J(c.S.eventStats[day]), { sortie_trailing: 2, sortie_zombie: 1 });
  assert.strictEqual(c.S.eventLog.length, 3);
  assert.strictEqual(c.S.eventLog[0].k, 'sortie_trailing'); assert.ok(c.S.eventLog[0].t > 0 && c.S.eventLog[0].d.startsWith('Trailing stop'));
  for (let i = 0; i < 500; i++) vm.runInContext("_eventNote(mk('Fermé X/USDT LONG | +0.1%'))", c);
  assert.strictEqual(c.S.eventLog.length, 400, 'anneau 400');
  assert.strictEqual(c.S.eventStats[day].fermeture, 500, 'les compteurs, eux, ne perdent rien');
  for (let i = 1; i <= 9; i++) c.S.eventStats['2026-09-0' + i] = { fermeture: i };
  vm.runInContext("_eventNote(mk('Fermé Z'))", c);
  assert.strictEqual(Object.keys(c.S.eventStats).length, 7, '7 jours gardés : ' + Object.keys(c.S.eventStats).length);
  assert.ok(Object.keys(c.S.eventStats).sort()[0] >= '2026-09-04', 'les plus vieux jours sortent');
});
T('D3 · le relais : chainLog garde EXACTEMENT son comportement (contenu, longueur, retour de push) et alimente le journal ; réinstallation idempotente', () => {
  const S = { chainLog: [] }; const c = ctx(S);
  assert.strictEqual(vm.runInContext('_installChainTap()', c), true);
  assert.strictEqual(vm.runInContext('_installChainTap()', c), false, 'déjà posé : no-op');
  c.push1 = { icon: '🎯', desc: 'Trailing stop · A · pic 70 %' };
  const n = vm.runInContext('S.chainLog.push(push1)', c);
  assert.strictEqual(n, 1, 'push retourne la longueur'); assert.strictEqual(S.chainLog.length, 1);
  assert.deepStrictEqual(J(S.chainLog[0]), J(c.push1), 'la ligne est intacte');
  assert.strictEqual(S.eventLog.length, 1);
  vm.runInContext("S.chainLog.push({desc:'Prix réels mis à jour'}, {desc:'Fermé B | +1%'})", c);
  assert.strictEqual(S.chainLog.length, 3, 'push multiple inchangé'); assert.strictEqual(S.eventLog.length, 2, 'seul l\'événement est noté');
  // le splice des 105 appelants fonctionne toujours
  for (let i = 0; i < 120; i++) vm.runInContext("S.chainLog.push({desc:'Bot X: cycle 1m'})", c);
  vm.runInContext('if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100)', c);
  assert.strictEqual(S.chainLog.length, 100);
  assert.strictEqual(JSON.stringify(Object.keys(S.chainLog[0])), '["desc"]', 'objets intacts');
  // un push qui lève dans le relais ne casse pas l'appelant
  vm.runInContext('S.eventLog = null; S.chainLog.push({desc:"Fermé C"});', c);
  assert.strictEqual(S.chainLog.length, 101, 'appelant servi malgré tout');
});
T('D4 · _eventSummary : total par nature, jours, n dernières lignes', () => {
  const c = ctx({ eventStats: { '2026-09-19': { sortie_trailing: 3, fermeture: 5 }, '2026-09-20': { sortie_trailing: 2, sortie_zombie: 4 } }, eventLog: [{ t: 1, k: 'a', d: 'x' }, { t: 2, k: 'b', d: 'y' }, { t: 3, k: 'c', d: 'z' }] });
  const r = J(vm.runInContext('_eventSummary(2)', c));
  assert.deepStrictEqual(r.total, { sortie_trailing: 5, fermeture: 5, sortie_zombie: 4 });
  assert.strictEqual(Object.keys(r.jours).length, 2); assert.strictEqual(r.dernier.length, 2); assert.strictEqual(r.dernier[0].t, 2);
});
T('S1 · branchements : 02 initialise eventLog/eventStats, 09b1 sauvegarde (250 + compteurs), 09b2 relit et repose le relais, 08 le repose à chaque battement, manifest', () => {
  const c02 = codeStrict(s02), c1 = codeStrict(rd('js/09b1-build-snapshot.js')), c2 = codeStrict(rd('js/09b2-save-load.js')), c8 = codeStrict(rd('js/08-learning-history-render.js'));
  assert.ok(c02.includes('chainLog:[], eventLog:[], eventStats:{},'));
  assert.ok(c1.includes('eventLog: (S.eventLog || []).slice(-250),') && c1.includes('eventStats: S.eventStats || {},'));
  assert.ok(c1.includes('chainLog: (S.chainLog || []).slice(-50),'), 'chainLog inchangé');
  assert.ok(c2.includes('S.eventLog   = snap.eventLog.slice(-400);') && c2.includes("'eventLog','eventStats'"));
  assert.strictEqual((c2.match(/_installChainTap\(\)/g) || []).length, 1, '09b2 repose le relais après avoir remplacé chainLog');
  assert.ok(c8.includes("if (typeof _installChainTap === 'function') _installChainTap();"), '08 le repose');
  assert.strictEqual((c02.match(/S\.chainLog\.push/g) || []).length > 0, true, 'les appelants ne sont pas touchés');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
