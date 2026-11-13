// banc-css.js — [GO CSS · 13/11/2026] accueil en 6 zones par priorité (Rams 13/11 « Go css », maquette validée « Ok » 22:23) — affichage seul.
// Lit le VRAI HTML, le VRAI CSS et fait tourner le VRAI texte de 09i (_accFold, _accRestoreFolds, _accGo) en vm.
// Sur le code d'avant (BANC_ROOT=<copie du commit 81ede33>) : Z1 à Z6 ÉCHOUENT ; G PASSE (garde : ce que d'autres scripts lisent est resté).
//   Z1 #page0 : sommaire (6 boutons → 6 zones existantes, même ordre), urgences, puis Mon argent · Mes paires · Comptes · Santé · Cerveau · Historique
//   Z2 aucun bloc perdu : les 158 id de #page0 au commit 81ede33 sont tous là, une seule fois ; aucun id en double dans le HTML ; balises équilibrées
//   Z3 chaque bloc dans sa zone (argent, positions, paires, comptes, réglages rapides, santé, volets techniques / Brain / Intelligence / journal / Twin)
//   Z4 css/28-accueil-zones.css chargé en DERNIER au token ; chaque règle visée à #page0 ou #statusBar (les autres écrans ne bougent pas) ; plancher 11 px
//   Z5 09i volets : fermés par défaut, un appui ouvre et mémorise, un 2e referme et oublie ; au démarrage les volets mémorisés rouvrent SANS redessiner
//   Z6 09i Brain : ouvrir son volet le redessine à sa vraie taille (stop, _brainStaticDrawn = false, start) ; _accGo place la zone sous le sommaire
//   G  #qPortfolio (lu par 10g _updateBotPauseBadge) et les 9 tuiles .wc-account (délégation de 09m) sont toujours dans #page0 ; toggleBar inchangée
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'banc-fixtures/ids-accueil-81ede33.json'), 'utf8'));
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }

const html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const p0 = html.slice(html.indexOf('id="page0"'), html.indexOf('id="page1"'));
const idsOf = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const at = id => p0.indexOf('id="' + id + '"');
// texte d'un élément à partir de son id (balises <div>/<section>/<nav> équilibrées)
function block(src, id) {
  const i = src.indexOf('id="' + id + '"'); if (i < 0) return null;
  const s = src.lastIndexOf('<', i), tag = src.slice(s + 1).match(/^(\w+)/)[1];
  const re = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g'); re.lastIndex = s; let d = 0, m;
  while ((m = re.exec(src))) { d += m[0][1] === '/' ? -1 : 1; if (!d) return src.slice(s, m.index + m[0].length); }
  return null;
}
function foldBlock(name) {
  const i = p0.indexOf('data-fold="' + name + '"'); if (i < 0) return null;
  const s = p0.lastIndexOf('<div', i); const re = /<div\b|<\/div>/g; re.lastIndex = s; let d = 0, m;
  while ((m = re.exec(p0))) { d += m[0][1] === '/' ? -1 : 1; if (!d) return p0.slice(s, m.index + m[0].length); }
  return null;
}
const ZONES = ['accArgent', 'accPaires', 'accComptes', 'accSante', 'accCerveau', 'accHisto'];

T('Z1 #page0 : sommaire collant (6 boutons → 6 zones), urgences, puis les 6 zones dans l\'ordre de priorité', () => {
  const nav = block(p0, 'accNav'); assert.ok(nav, 'accNav absent');
  const cibles = [...nav.matchAll(/_accGo\('([^']+)'\)/g)].map(m => m[1]);
  assert.deepStrictEqual(cibles, ZONES);
  const pos = ZONES.map(at); assert.ok(pos.every(p => p > 0), 'zone absente : ' + ZONES.filter((z, i) => pos[i] < 0));
  assert.ok(pos.every((p, i) => !i || p > pos[i - 1]), 'ordre des zones');
  assert.ok(at('accNav') < at('pendingBanner') && at('pendingBanner') < at('accArgent'), 'sommaire puis urgences puis Mon argent');
  ZONES.forEach(z => assert.ok(/^<section class="acc-zone"/.test(block(p0, z)), z + ' n\'est pas une section de zone'));
});

T('Z2 aucun bloc perdu : les ' + FIX.ids.length + ' id de #page0 (' + FIX.commit + ') présents une seule fois ; HTML sans id en double ; balises équilibrées', () => {
  const now = idsOf(p0);
  const manque = FIX.ids.filter(i => !now.includes(i)); assert.deepStrictEqual(manque, [], 'perdus');
  const all = idsOf(html), dbl = [...new Set(all.filter((x, i) => all.indexOf(x) !== i))]; assert.deepStrictEqual(dbl, [], 'doublons');
  const n = re => (p0.match(re) || []).length;
  assert.strictEqual(n(/<div\b/g), n(/<\/div>/g), 'div'); assert.strictEqual(n(/<section\b/g), n(/<\/section>/g), 'section');
  assert.strictEqual(n(/<section\b/g), 6);
  ZONES.forEach(z => assert.ok(block(p0, z), z));
});

T('Z3 chaque bloc dans sa zone ; volets : techniques, Brain, Intelligence, journal, Twin', () => {
  const Z = Object.fromEntries(ZONES.map(z => [z, block(p0, z) || '']));
  const dans = (z, ids) => ids.forEach(i => assert.ok(Z[z].includes('id="' + i + '"'), i + ' hors de ' + z));
  dans('accArgent', ['qPortfolio', 'heroVal', 'heroUsd', 'heroPnlBadge', 'capBarPct', 'capStaked', 'capFree', 'capMax', 'sparkline', 'openPnlBanner']);
  dans('accPaires', ['pairPnlBars', 'globalPnlUsd', 'autoBar', 'manBar', 'tlBar', 'paramBar', 'actionBrickGrid', 'pairBrickGrid', 'openPosSummaryCards']);
  dans('accComptes', ['cashVal', 'tradVal', 'levReserveVal', 'fiscalResVal', 'ownFundsVal', 'antiNegReserveVal', 'fiscalRegimeVal', 'leverageDisp', 'splitDisp', 'wAllocCash', 'fiscalMini']);
  dans('accSante', ['trustScoreWrap', 'qPnlNet', 'qSessionPnl', 'qWin', 'qDD', 'qFeesTotal', 'cycleTrades', 'marketMoodWrap', 'thoughtsTicker', 'intelBanner']);
  dans('accCerveau', ['brainSection', 'brainCanvas', 'apanel-debate', 'atab-leadlag']);
  dans('accHisto', ['mobileTradeList', 'tradeCountMobile', 'journalEntries', 'journalFilterPair', 'twinLiveSection']);
  const reg = block(Z.accComptes, 'splitDisp') && Z.accComptes.slice(Z.accComptes.indexOf('acc-reg'));
  assert.ok(reg.includes('leverageDisp') && reg.includes('splitDisp') && reg.includes('openTransferModal()'), 'Réglages rapides : levier, répartition, transfert');
  const F = { tech: ['cyclePhase', 'qActivePairs', 'qEfficiency', 'qSharpe', 'qReserve', 'qAvgCycle', 'qGenCount', 'qBestAgent', 'qBotSignal', 'qSession'],
    brain: ['brainSection'], intel: ['apanel-debate', 'atab-debate'], journal: ['journalEntries', 'journalStats'], twin: ['twinLiveSection'] };
  Object.entries(F).forEach(([f, ids]) => { const b = foldBlock(f); assert.ok(b, 'volet ' + f); ids.forEach(i => assert.ok(b.includes('id="' + i + '"'), i + ' hors du volet ' + f));
    assert.ok(b.includes("_accFold('" + f + "')"), 'bouton du volet ' + f); });
  assert.strictEqual((p0.match(/data-fold="/g) || []).length, 5);
});

T('Z4 css/28-accueil-zones.css chargé en dernier au token ' + TOK + ' ; toutes ses règles visent #page0 ou #statusBar ; plancher 11 px', () => {
  const links = [...html.matchAll(/<link[^>]*href="(css\/[^"?]+)\?v=([^"]+)"/g)];
  const last = links[links.length - 1]; assert.ok(last && last[1] === 'css/28-accueil-zones.css' && last[2] === TOK, 'dernier : ' + (last && last[1]));
  const css = rd('css/28-accueil-zones.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const sels = []; css.replace(/([^{}]+)\{/g, (m, s) => { s = s.trim(); if (!s.startsWith('@')) sels.push(...s.split(',').map(x => x.trim())); return m; });
  assert.ok(sels.length > 50, sels.length + ' sélecteurs');
  const hors = sels.filter(s => !/^#page0\b|^#statusBar\b/.test(s)); assert.deepStrictEqual(hors, [], 'règles hors accueil / en-tête');
  assert.ok(/#page0\s*\{[^}]*--fs-6:\s*11px[^}]*--fs-8:\s*11px/.test(css), 'variables --fs au plancher');
  assert.ok(/\[style\*="font-size:7px"\][\s\S]*font-size:\s*11px !important/.test(css), 'tailles en dur au plancher');
});

// ── vm : le vrai texte de 09i (bloc GO CSS) ──
const src09i = rd('js/09i-sim-control.js'), K = src09i.indexOf('[GO CSS · 13/11/2026]');
function ctx09i(store) {
  const mk = name => { const cls = new Set(); return { name, classList: { contains: c => cls.has(c), toggle: (c, on) => { if (on === undefined) on = !cls.has(c); on ? cls.add(c) : cls.delete(c); return on; }, add: c => cls.add(c), remove: c => cls.delete(c) } }; };
  const folds = Object.fromEntries(['tech', 'brain', 'intel', 'journal', 'twin'].map(n => [n, mk(n)]));
  const log = [];
  const pg = { scrollTo: o => log.push(['scroll', o.top]) }, zone = { offsetTop: 2043 }, nav = { offsetHeight: 50 };
  const c = {
    log, folds, JSON, Object,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: { readyState: 'complete', addEventListener: () => {}, querySelector: q => { const m = q.match(/data-fold="(\w+)"/); return m ? folds[m[1]] || null : null; },
      getElementById: id => ({ page0: pg, accComptes: zone, accNav: nav }[id] || null) },
    window: {}, stopBrainAnim: () => log.push(['stop']), startBrainAnim: () => log.push(['start', c._brainStaticDrawn]),
    renderAnalyticsPanel: () => log.push(['intel']), renderJournal: () => log.push(['journal']),
  };
  vm.createContext(c); vm.runInContext('var _brainStaticDrawn = true;', c);
  if (K < 0) throw new Error('bloc GO CSS absent de 09i');
  vm.runInContext(src09i.slice(src09i.lastIndexOf('\n// ───', K)), c);
  return c;
}

T('Z5 09i volets : fermés par défaut ; un appui ouvre et mémorise, un 2e referme et oublie ; au démarrage, rouvre sans redessiner', () => {
  const store = {}, c = ctx09i(store);
  assert.ok(Object.values(c.folds).every(f => !f.classList.contains('open')), 'fermés par défaut');
  assert.strictEqual(vm.runInContext("_accFold('journal')", c), true);
  assert.ok(c.folds.journal.classList.contains('open')); assert.deepStrictEqual(JSON.parse(store.aura_accueil_volets), { journal: 1 });
  assert.deepStrictEqual(c.log, [['journal']], 'journal rafraîchi à l\'ouverture');
  assert.strictEqual(vm.runInContext("_accFold('journal')", c), false);
  assert.ok(!c.folds.journal.classList.contains('open')); assert.deepStrictEqual(JSON.parse(store.aura_accueil_volets), {});
  const store2 = { aura_accueil_volets: JSON.stringify({ brain: 1, twin: 1 }) }, c2 = ctx09i(store2);   // relance : le chargement appelle _accRestoreFolds
  assert.ok(c2.folds.brain.classList.contains('open') && c2.folds.twin.classList.contains('open') && !c2.folds.intel.classList.contains('open'));
  assert.deepStrictEqual(c2.log, [], 'aucun dessin au démarrage (09k dessine le Brain une fois, à sa vraie taille)');
  assert.strictEqual(vm.runInContext("_accFold('inconnu')", c2), false);
  const c3 = ctx09i({ aura_accueil_volets: '{pas du json' }); assert.ok(Object.values(c3.folds).every(f => !f.classList.contains('open')), 'stockage illisible → tout fermé');
});

T('Z6 09i : ouvrir le Brain le redessine (stop, _brainStaticDrawn = false, start) ; _accGo met la zone sous le sommaire', () => {
  const c = ctx09i({});
  vm.runInContext("_accFold('brain')", c);
  assert.deepStrictEqual(c.log, [['stop'], ['start', false]]);
  c.log.length = 0; vm.runInContext("_accFold('brain')", c); assert.deepStrictEqual(c.log, [], 'refermer ne dessine rien');
  vm.runInContext("_accGo('accComptes')", c); assert.deepStrictEqual(c.log, [['scroll', 2043 - 50]]);
  c.log.length = 0; vm.runInContext("_accGo('zoneInconnue')", c); assert.deepStrictEqual(c.log, []);
});

T('G #qPortfolio (10g _updateBotPauseBadge) et les 9 tuiles .wc-account (09m) dans #page0 ; toggleBar de 09i inchangée', () => {
  assert.ok(/class="wallet-card portfolio-total[^"]*" id="qPortfolio"/.test(p0), '#qPortfolio .portfolio-total');
  assert.ok(rd('js/10g-resolveur-ev-csv.js').includes("document.getElementById('qPortfolio')"));
  assert.strictEqual((p0.match(/class="wc-account[ "]/g) || []).length, 9);
  assert.ok(rd('js/09m-wallet-detail.js').includes("e.target.closest('.wc-account')"));
  const tb = src09i.slice(src09i.indexOf('function toggleBar('), src09i.indexOf('window.toggleBar = toggleBar;'));
  assert.strictEqual(require('crypto').createHash('sha256').update(tb).digest('hex'), 'b7c5b443277c81052be1d1cdab2d389f9b6e3ad80198611c4252e49fa74d0873', 'toggleBar identique au commit 81ede33');
});

console.log('\n' + (fail ? '❌ ' + fail + ' échec(s)' : '✅ ' + pass + '/' + pass + ' tests passés'));
process.exit(fail ? 1 : 0);
