// banc-ecran-appris.js — [ÉCRAN APPRIS · 23/09/2026] VERSION 20260923c
// L'écran « ce que le système a appris » : lecture seule, construit depuis S (attribution, règles, paliers, blacklist,
// journal). Fonction RÉELLE _learnedPanelHtml + injection du bouton sur un DOM minimal.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const src = rd('js/11b-ecran-appris.js').replace(/setInterval\(function \(\) \{ try \{ _injectLearnedButton\(\); \} catch \(e\) \{\} \}, 2000\);/, '');
function mkDom() {
  const nodes = {};
  const el = (id) => ({ id, style: {}, children: [], parentNode: null, textContent: '', innerHTML: '', remove() { this.removed = true; }, insertBefore(n, ref) { n.parentNode = this; this.children.push(n); }, appendChild(n) { n.parentNode = this; this.children.push(n); } });
  const list = el('mobileChainList'); const parent = el('page4'); list.parentNode = parent; nodes.mobileChainList = list;
  const body = el('body');
  const document = { body, getElementById: id => nodes[id] || null, createElement: tag => { const n = el(null); n.tag = tag; return n; } };
  return { document, nodes, parent, body };
}
function ctx(S) { const d = mkDom(); const c = { S, PAIRS: { 'BTC/USDT': { color: '#f7931a' }, 'PEPE/USDT': { color: '#5cd6c0' } }, document: d.document, Math, Number, Object, Array, JSON, isFinite, String, window: {}, Date, _attributionSummary: () => [{ src: 'volume', n: 11, winRate: 73, avgPnl: 0.33, sumPnl: 3.63 }, { src: 'prix', n: 19, winRate: 42, avgPnl: -0.279, sumPnl: -5.3 }], _capCeiling: () => 12 }; vm.createContext(c); vm.runInContext(src, c); c._dom = d; return c; }
const baseS = () => ({ tradingMode: 'paperReal', paperRealActivePairs: { 'BTC/USDT': true, 'PEPE/USDT': true, 'GBP/USDT': false }, tradeContextMemory: [], gainRules: {}, stopRules: {}, horizonRules: {}, capRules: {}, _lossStreaks: {}, eventStats: {} });
console.log('▶ banc-ecran-appris');
T('D1 · panneau sur un système vierge : sources, paires (0/8), emplacements sans preuve, blacklist vide, journal vide — sans exception', () => {
  const c = ctx(baseS()); const h = vm.runInContext('_learnedPanelHtml()', c);
  assert.ok(h.includes('SOURCES DE DONNÉES') && h.includes('volume') && h.includes('73 %') && h.includes('+0.330 %'));
  assert.ok(h.includes('RÈGLES APPRISES PAR PAIRE') && h.includes('>BTC<') && h.includes('>PEPE<') && !h.includes('>GBP<'), 'paires actives seulement');
  assert.ok((h.match(/0\/8/g) || []).length === 2, 'chemins 0/8 pour les deux paires');
  assert.ok(h.includes('EMPLACEMENTS APPRIS') && h.includes('pas encore de preuve') && h.includes('(12)'));
  assert.ok(h.includes('fenêtre vide') && h.includes('rien encore'));
});
T('D2 · panneau avec des règles : gain / stop / horizon affichés, chemins verts à 8, paliers, blacklist en pause, journal des 3 derniers jours', () => {
  const S = baseS();
  for (let i = 0; i < 9; i++) S.tradeContextMemory.push({ pair: 'PEPE/USDT', closedAt: 1, pnlPct: 0, path: { mfe: 0.4 } });
  S.gainRules['PEPE/USDT'] = { m: 0.3, f: 0.5, n: 9, gain: 0.21, better: 82 };
  S.stopRules['PEPE/USDT'] = { d: 0.8, n: 9, gain: 0.6, better: 83 };
  S.horizonRules['BTC/USDT'] = { H: 120, n: 8, worse: 75, gain: 1.1 };
  S.capRules = { total: { level: 4, harmful: null, n: { 2: 10, 3: 9 } }, long: { level: 2, harmful: 3, n: { 3: 8 } }, short: { level: 3, n: {} } };
  S._lossStreaks = { 'BTC/USDT': { recentTrades: [{ won: false }, { won: false }, { won: true }], blacklistedUntil: Date.now() + 30 * 60000 } };
  S.eventStats = { '2026-09-20': { fermeture: 41 }, '2026-09-21': { ouverture: 8, sortie_zombie: 12, veto: 898 }, '2026-09-22': { ouverture: 21, sortie_consensus: 3 }, '2026-09-19': { fermeture: 1 } };
  const c = ctx(S); const h = vm.runInContext('_learnedPanelHtml()', c);
  assert.ok(h.includes('9/8') && h.includes('pic ≥ +0.3 → 50 % (+0.21 %)') && h.includes('−0.8 % (+0.60 %)') && h.includes('120 min (75 % pire)'), h.slice(h.indexOf('RÈGLES'), h.indexOf('RÈGLES') + 900));
  assert.ok(h.includes('4 / 12') && h.includes('2e : 10 cas · 3e : 9 cas') && h.includes('le 3e a nui'));
  assert.ok(h.includes('3 trades') && h.includes('33 %') && h.includes('⏸ pause'));
  assert.ok(h.includes('09-22') && h.includes('ouverture 21 · consensus 3') && !h.includes('09-19'), '3 derniers jours seulement');
});
T('D3 · bouton : injecté une seule fois avant la liste du Journal, ouvre le panneau ; openLearnedPanel monte une modale lecture seule', () => {
  const c = ctx(baseS());
  assert.strictEqual(vm.runInContext('_injectLearnedButton()', c), true);
  c._dom.nodes.learnedBtn = c._dom.parent.children[0];
  assert.strictEqual(vm.runInContext('_injectLearnedButton()', c), false, 'déjà là');
  assert.strictEqual(c._dom.parent.children.length, 1); assert.strictEqual(c._dom.parent.children[0].textContent, '🧠 Ce que le système a appris');
  vm.runInContext('openLearnedPanel()', c);
  const modal = c._dom.body.children[0]; assert.ok(modal && modal.innerHTML.includes('Ce que le système a appris') && modal.innerHTML.includes('lecture seule'));
});
T('S1 · lecture seule et branchement : 11b n\'écrit rien dans S (aucune affectation S.x =), pas de closePosition, script chargé après 11, token courant', () => {
  const c = codeStrict(rd('js/11b-ecran-appris.js'));
  assert.strictEqual(/\bS\.[A-Za-z_]+(\[[^\]]*\])?\s*=[^=]/.test(c), false, 'aucune écriture dans S');
  assert.strictEqual(/closePosition\(|addPair\(|removePair\(/.test(c), false);
  const html = rd('AURA8_v118.html'), tok = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
  const i11 = html.indexOf('js/11-gestion-paires.js'), i11b = html.indexOf('js/11b-ecran-appris.js?v=' + tok);
  assert.ok(tok && i11 > 0 && i11b > i11, '11b chargé après 11 au token courant');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
