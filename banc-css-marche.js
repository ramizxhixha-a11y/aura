// banc-css-marche.js — [GO CSS · écran 3 · 14/11/2026] écran Marché par priorité (Rams 14/11 11:49 « Go css », maquette validée « Go » 12:01) — affichage seul.
// Lit le VRAI HTML, le VRAI CSS et fait tourner les VRAIS textes de 08 (puces de paire), 11 (_injectPairManagerButton) et 09i (bloc écran 3) en vm.
// Sur le code d'avant (BANC_ROOT=<copie du commit 1a2ec3d>) : M1 à M6 ÉCHOUENT ; G PASSE (garde : ce que d'autres scripts lisent est resté).
//   M1 #page2 : graphique · barre de la paire · analyse (technique, fondamentale côte à côte) · toutes les paires · composite · volet Agents · volet Veille
//   M2 aucun bloc perdu : les 27 id de #page2 au commit 1a2ec3d présents une seule fois ; aucun id en double dans le HTML ; balises équilibrées
//   M3 08 renderMarket : une puce par paire, dans la barre (en tête), rebâtie quand les paires changent, pas à chaque battement ; consensus nommé
//   M4 11 « Gérer les paires » au bout de la barre (sans barre : sous le graphique, comme avant)
//   M5 css/30-marche-zones.css chargé en DERNIER au token ; chaque règle visée à #page2 ; plancher 11 px ; analyse fermée / ouverte ; volets ; téléphone
//   M6 09i : volets fermés par défaut, un appui ouvre et mémorise (matrice redessinée), un 2e referme et oublie, rouverts sans redessin ; appui sur l'analyse
//   G  ids lus ailleurs (08 graphique, puces, analyses, composite, consensus, matrice ; 03 mini-graphiques ; 07 veille) toujours dans #page2
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'banc-fixtures/ids-marche-1a2ec3d.json'), 'utf8'));
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }

const html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const p2 = html.slice(html.indexOf('id="page2"'), html.indexOf('id="page3"'));
const idsOf = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const at = id => p2.indexOf('id="' + id + '"');
function foldBlock(name) {
  const i = p2.indexOf('data-fold="' + name + '"'); if (i < 0) return null;
  const s = p2.lastIndexOf('<div', i); const re = /<div\b|<\/div>/g; re.lastIndex = s; let d = 0, m;
  while ((m = re.exec(p2))) { d += m[0][1] === '/' ? -1 : 1; if (!d) return p2.slice(s, m.index + m[0].length); }
  return null;
}

T('M1 #page2 : graphique · barre de la paire · analyse côte à côte · toutes les paires · composite · volet Agents · volet Veille', () => {
  const ordre = ['candle-wrap-top', 'mkPairBar', 'mkDuo', 'technicalPanel', 'fundamentalPanel', 'miniChartsGrid', 'compositePanel'];
  const pos = ordre.map(at); assert.ok(pos.every(p => p > 0), 'absent : ' + ordre.filter((x, i) => pos[i] < 0));
  assert.ok(pos.every((p, i) => !i || p > pos[i - 1]), 'ordre ' + JSON.stringify(pos));
  assert.ok(/<div class="mk-duo" id="mkDuo">\s*<div id="technicalPanel" class="mk-ana"><\/div>\s*<div id="fundamentalPanel" class="mk-ana"><\/div>\s*<\/div>/.test(p2), 'analyse : les deux panneaux dans #mkDuo');
  const fa = foldBlock('agents'), fv = foldBlock('veille');
  assert.ok(fa && fv && p2.indexOf('data-fold="agents"') > at('compositePanel') && p2.indexOf('data-fold="veille"') > p2.indexOf('data-fold="agents"'), 'volets après le composite');
  ['agentConsensusMkt', 'corrMatrixWrap', 'corrMatrixCanvas'].forEach(i => assert.ok(fa.includes('id="' + i + '"'), i + ' hors du volet Agents'));
  ['veilleMarche', 'veilleSentimentBody', 'veilleFeGrBody', 'veilleNewsBody', 'veilleDomBody', 'veilleTrendBody', 'veilleLastUpdate', 'veilleLiveBadge'].forEach(i => assert.ok(fv.includes('id="' + i + '"'), i + ' hors du volet Veille'));
  assert.ok(fa.includes("_mkFold('agents')") && fv.includes("_mkFold('veille')"), 'boutons des volets');
  assert.ok(at('atBadge') > 0 && at('atBadge') < at('mkDuo'), '#atBadge dans le titre de l\'analyse');
  assert.strictEqual((p2.match(/class="sec-header/g) || []).length, 0, 'anciens titres de section remplacés par les zones');
});

T('M2 aucun bloc perdu : les ' + FIX.ids.length + ' id de #page2 (' + FIX.commit + ') présents une seule fois ; HTML sans id en double ; balises équilibrées', () => {
  const now = idsOf(p2);
  assert.deepStrictEqual(FIX.ids.filter(i => !now.includes(i)), [], 'perdus');
  const all = idsOf(html), dbl = [...new Set(all.filter((x, i) => all.indexOf(x) !== i))]; assert.deepStrictEqual(dbl, [], 'doublons');
  const n = re => (p2.match(re) || []).length;
  assert.strictEqual(n(/<div\b/g), n(/<\/div>/g), 'div'); assert.strictEqual(n(/<button\b/g), n(/<\/button>/g), 'button');
  assert.ok(now.includes('mkPairBar') && now.includes('mkDuo'), 'ids ajoutés');
});

// ── vm : le vrai texte de 08 (puces de paire) ──
const s08 = rd('js/08-learning-history-render.js');
function puces() {
  const a = s08.indexOf("  { const _ps = document.getElementById('pairSelWrap');"), b = s08.indexOf("  Object.keys(PAIRS).forEach(pair=>{\n    const el=document.getElementById('ppill_'");
  if (a < 0 || b < 0) throw new Error('bloc des puces absent de 08');
  const code = s08.slice(a, b);
  const mk = tag => { const e = { tag, id: '', children: [], style: {}, attrs: {}, parent: null, setAttribute: (k, v) => { e.attrs[k] = v; },
    appendChild: c => { c.parent = e; e.children.push(c); }, insertBefore: (c, ref) => { c.parent = e; const i = ref ? e.children.indexOf(ref) : -1; i < 0 ? e.children.push(c) : e.children.splice(i, 0, c); },
    remove: () => { if (e.parent) e.parent.children.splice(e.parent.children.indexOf(e), 1); e.parent = null; }, insertAdjacentElement: (w, c) => { c.parent = e.parent; e.parent.children.splice(e.parent.children.indexOf(e) + 1, 0, c); } };
    Object.defineProperty(e, 'firstChild', { get: () => e.children[0] || null }); return e; };
  const page = mk('div'), wrap = mk('div'), bar = mk('div'), btn = mk('button');
  wrap.id = 'candle-wrap-top'; bar.id = 'mkPairBar'; btn.id = 'pairMgrBtn';
  page.appendChild(wrap); page.appendChild(bar); bar.appendChild(btn);
  const find = (root, id) => { for (const c of root.children) { if (c.id === id) return c; const f = find(c, id); if (f) return f; } return null; };
  const PAIRS = { 'BTC/USDT': { color: '#f00' }, 'ETH/USDT': { color: '#0f0' } };
  const c = { PAIRS, S: { activePair: 'BTC/USDT' }, Object, selectPair: () => {}, document: { getElementById: id => find(page, id), createElement: mk } };
  vm.createContext(c);
  return { run: () => vm.runInContext(code, c), page, bar, wrap, PAIRS, find };
}

T('M3 08 renderMarket : une puce par paire, en tête de la barre de la paire ; rebâtie quand les paires changent, pas à chaque battement ; consensus nommé', () => {
  const t = puces(); t.run();
  const sel = t.find(t.page, 'pairSelWrap'); assert.ok(sel, 'barre des puces');
  assert.deepStrictEqual(t.bar.children.map(e => e.id), ['pairSelWrap', 'pairMgrBtn'], 'puces puis « Gérer »');
  assert.deepStrictEqual(sel.children.map(e => e.attrs['data-pair']), ['BTC/USDT', 'ETH/USDT']);
  t.run(); assert.strictEqual(t.find(t.page, 'pairSelWrap'), sel, 'même composition : rien n\'est rebâti');
  t.PAIRS['PEPE/USDT'] = { color: '#00f' }; t.run();
  const sel2 = t.find(t.page, 'pairSelWrap'); assert.notStrictEqual(sel2, sel, 'paire ajoutée : rebâtie');
  assert.deepStrictEqual(sel2.children.map(e => e.attrs['data-pair']), ['BTC/USDT', 'ETH/USDT', 'PEPE/USDT']);
  assert.deepStrictEqual(t.bar.children.map(e => e.id), ['pairSelWrap', 'pairMgrBtn'], 'une seule barre, toujours en tête');
  delete t.PAIRS['ETH/USDT']; t.run(); assert.strictEqual(t.find(t.page, 'pairSelWrap').children.length, 2, 'paire retirée : rebâtie');
  assert.ok(/color:\$\{cc\};">\$\{a\.type \|\| a\.name\} \$\{\(\(a\.score/.test(s08), 'consensus : la spécialité de l\'agent, pas son emoji');
});

T('M4 11 « Gérer les paires » : au bout de la barre de la paire ; sans barre, sous le graphique comme avant', () => {
  const s11 = rd('js/11-gestion-paires.js'), a = s11.indexOf('function _injectPairManagerButton()'), b = s11.indexOf('function openPairManager()');
  const run = withBar => { const kids = []; const parent = { insertBefore: (x, ref) => kids.push(['après-graphique', x.id]) };
    const bar = { appendChild: x => kids.push(['barre', x.id]) };
    const c = { openPairManager: () => {}, document: { getElementById: id => (id === 'candle-wrap-top' ? { parentNode: parent, nextSibling: null } : id === 'mkPairBar' && withBar ? bar : null),
      createElement: () => ({ style: {} }) } };
    vm.createContext(c); vm.runInContext(s11.slice(a, b) + '\n_injectPairManagerButton();', c); return kids; };
  assert.deepStrictEqual(run(true), [['barre', 'pairMgrBtn']]);
  assert.deepStrictEqual(run(false), [['après-graphique', 'pairMgrBtn']]);
});

T('M5 css/30-marche-zones.css chargé en dernier au token ' + TOK + ' ; toutes ses règles visent #page2 ; plancher 11 px ; analyse fermée / ouverte ; volets ; téléphone', () => {
  const links = [...html.matchAll(/<link[^>]*href="(css\/[^"?]+)\?v=([^"]+)"/g)];
  const last = links[links.length - 1]; assert.ok(last && last[1] === 'css/30-marche-zones.css' && last[2] === TOK, 'dernier : ' + (last && last[1]));
  const css = rd('css/30-marche-zones.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const sels = []; css.replace(/([^{}]+)\{/g, (m, s) => { s = s.trim(); if (!s.startsWith('@')) sels.push(...s.split(',').map(x => x.trim())); return m; });
  assert.ok(sels.length > 40, sels.length + ' sélecteurs');
  assert.deepStrictEqual(sels.filter(s => !/^#page2\b/.test(s)), [], 'règles hors écran Marché');
  assert.ok(/#page2\s*\{[^}]*--fs-6:\s*11px[^}]*--fs-8:\s*11px/.test(css), 'variables --fs au plancher');
  assert.ok(/\[style\*="font-size:7px"\][\s\S]*font-size:\s*11px !important/.test(css), 'tailles en dur au plancher');
  ['.signal-row-detail', '.mini-chart-pnl', '.veille-fg-sub', '.veille-trend-rank', '.corr-matrix-title'].forEach(k => assert.ok(css.includes('#page2 ' + k), k + ' au plancher'));
  assert.ok(!/veille-card-body \*/.test(css) && !/veille-fg-number/.test(css), 'les grands chiffres de la veille ne sont pas ramenés à 11 px');
  assert.ok(/\.mk-ana:not\(\.mk-open\) \.signal-card > :nth-child\(n\+3\) \{ display: none !important; \}/.test(css), 'analyse fermée : titre, verdict, score');
  assert.ok(/\.mk-ana\.mk-open \{ grid-column: 1 \/ -1; \}/.test(css), 'analyse ouverte : toute la largeur');
  assert.ok(/\.mk-fold-b \{ display: none;[\s\S]*\.mk-fold\.open \.mk-fold-b \{ display: block; \}/.test(css), 'volets');
  assert.ok(/#miniChartsGrid \{ grid-template-columns: repeat\(3, 1fr\) !important;/.test(css), 'toutes les paires : 3 colonnes');
  assert.ok(/@media \(max-width: 560px\)[\s\S]*#miniChartsGrid \{ grid-template-columns: 1fr 1fr !important; \}/.test(css), 'téléphone : 2 colonnes');
});

// ── vm : le vrai texte de 09i (bloc écran 3) ──
const src09i = rd('js/09i-sim-control.js'), K = src09i.indexOf('[GO CSS · écran 3 · 14/11/2026]');
function ctx09i(store) {
  const mkCls = () => { const s = new Set(); return { contains: c => s.has(c), toggle: (c, on) => { if (on === undefined) on = !s.has(c); on ? s.add(c) : s.delete(c); return on; }, add: c => s.add(c), remove: c => s.delete(c) }; };
  const folds = { agents: { classList: mkCls() }, veille: { classList: mkCls() } }, log = [];
  const duo = { dataset: {}, addEventListener: (t, f) => log.push(['listen', t, f]) };
  const c = { log, folds, JSON, Object,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: { readyState: 'complete', addEventListener: () => {}, getElementById: id => (id === 'mkDuo' ? duo : null),
      querySelector: q => { const m = q.match(/#page2 \.mk-fold\[data-fold="(\w+)"\]/); return m ? folds[m[1]] || null : null; } },
    window: {}, renderCorrMatrix: () => log.push(['corr', c._corrLastTick]) };
  vm.createContext(c); vm.runInContext('var _corrLastTick = 7;', c);
  if (K < 0) throw new Error('bloc écran 3 absent de 09i');
  vm.runInContext(src09i.slice(src09i.lastIndexOf('\n// ───', K)), c);
  return c;
}

T('M6 09i : volets fermés par défaut ; un appui ouvre et mémorise (matrice redessinée à l\'ouverture d\'Agents), un 2e referme et oublie ; rouverts sans redessin ; appui sur l\'analyse', () => {
  const store = {}, c = ctx09i(store);
  assert.ok(!c.folds.agents.classList.contains('open') && !c.folds.veille.classList.contains('open'), 'fermés par défaut');
  assert.strictEqual(vm.runInContext("_mkFold('agents')", c), true);
  assert.deepStrictEqual(JSON.parse(store.aura_marche_volets), { agents: 1 });
  assert.deepStrictEqual(c.log.filter(l => l[0] === 'corr'), [['corr', -10]], 'matrice redessinée à l\'ouverture (garde des 5 battements levée)');
  vm.runInContext("_mkFold('veille')", c); assert.deepStrictEqual(JSON.parse(store.aura_marche_volets), { agents: 1, veille: 1 });
  assert.strictEqual(c.log.filter(l => l[0] === 'corr').length, 1, 'la veille ne redessine pas la matrice');
  assert.strictEqual(vm.runInContext("_mkFold('agents')", c), false); assert.deepStrictEqual(JSON.parse(store.aura_marche_volets), { veille: 1 });
  const c2 = ctx09i({ aura_marche_volets: '{"agents":1}' });
  assert.ok(c2.folds.agents.classList.contains('open') && !c2.folds.veille.classList.contains('open'));
  assert.ok(!c2.log.some(l => l[0] === 'corr'), 'au démarrage : rouvert sans redessin');
  assert.ok(!ctx09i({ aura_marche_volets: '{pas du json' }).folds.agents.classList.contains('open'), 'stockage illisible → fermé');
  assert.strictEqual(vm.runInContext("_mkFold('inconnu')", c), false);
  const tap = c.log.find(l => l[0] === 'listen' && l[1] === 'click'); assert.ok(tap, 'appui écouté sur #mkDuo');
  const cl = new Set(), panel = { classList: { toggle: k => (cl.has(k) ? (cl.delete(k), false) : (cl.add(k), true)) } };
  tap[2]({ target: { closest: q => (q === '.mk-ana' ? panel : null) } }); assert.ok(cl.has('mk-open'), 'ouverte');
  tap[2]({ target: { closest: q => (q === '.mk-ana' ? panel : null) } }); assert.ok(!cl.has('mk-open'), 'refermée');
  tap[2]({ target: { closest: () => null } });   // appui hors des panneaux : rien
});

T('G ids lus ailleurs toujours dans #page2 : graphique et puces (08), analyses et composite (08), consensus et matrice (08), mini-graphiques (03), veille (07)', () => {
  ['candle-wrap-top', 'mktPairLabel', 'mktPrice', 'mktPnl24h', 'mobileChart', 'technicalPanel', 'fundamentalPanel', 'compositePanel', 'agentConsensusMkt', 'corrMatrixCanvas',
    'miniChartsGrid', 'veilleSentimentBody', 'veilleFeGrBody', 'veilleNewsBody', 'veilleDomBody', 'veilleTrendBody', 'veilleLastUpdate'].forEach(i => assert.ok(at(i) > 0, i));
  assert.ok(s08.includes("document.getElementById('corrMatrixCanvas')") && s08.includes("document.getElementById('technicalPanel')"));
  assert.ok(rd('js/03-per-pair-position-buttons-controls-buid.js').includes("document.getElementById('miniChartsGrid')"));
  assert.ok(rd('js/07-v90-mode-bunker-sos.js').includes("document.getElementById('veilleLastUpdate')"));
});

console.log('\n' + (fail ? '❌ ' + fail + ' échec(s)' : '✅ ' + pass + '/' + pass + ' tests passés'));
process.exit(fail ? 1 : 0);
