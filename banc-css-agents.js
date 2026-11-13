// banc-css-agents.js — [GO CSS · écran 2 · 14/11/2026] écran Agents par priorité (Rams 13/11 23:48 « Go css », maquette validée « Ok » 14/11 00:17) — affichage seul.
// Lit le VRAI HTML, le VRAI CSS et fait tourner les VRAIS textes de 07 (buildAgentCards), 03 (filterAgents), 08 (renderAgentHeatmap) et 09i (bloc écran 2) en vm.
// Sur le code d'avant (BANC_ROOT=<copie du commit 85a61bb>) : A1 à A7 ÉCHOUENT ; G PASSE (garde : ce que d'autres scripts lisent est resté).
//   A1 #page1 : onglets · En bref (bots, analystes, mémoire = ancienne barre, ids gardés) · familles (10 boutons avec leur nombre) · cartes · matrice en volet
//   A2 aucun bloc perdu : les 21 id de #page1 au commit 85a61bb présents une seule fois ; aucun id en double dans le HTML ; balises équilibrées
//   A3 07 buildAgentCards : UNE carte par agent (chaque rôle des agents de 02 a son groupe — avant : éclaireurs et conseil sans carte) ; bots d'abord ;
//      titres de groupe avec leur nombre ; « appuyer pour tout voir » ; filtre réappliqué aux titres ; cartes ouvertes rouvertes
//   A4 03 filterAgents : les titres de groupe suivent le filtre ; 08 : chaque case de la matrice porte la spécialité ; En bref appelé par 08 et 02
//   A5 css/29-agents-zones.css chargé en DERNIER au token ; chaque règle visée à #page1 ; plancher 11 px (onglet Évolution compris) ; compacte / ouverte
//   A6 09i _agBrefRender : En bref et nombres justes (recalculés ici), famille vide cachée sauf si filtrée ; sous-titre de la matrice
//   A7 09i volet de la matrice (fermé par défaut, mémorisé, rouvert sans redessin ; à l'ouverture redessiné) ; appui sur une carte (bandeau mémoire exclu)
//   G  ids lus par 07 (memPoolCount, memPoolWon, memDreamCount, memRecallBadge, agentCountMobile), 07 switchAgentTab (tab-*, agentPanel-*), 08 (learn*, agentHeatmapGrid)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'banc-fixtures/ids-agents-85a61bb.json'), 'utf8'));
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }

const html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const p1 = html.slice(html.indexOf('id="page1"'), html.indexOf('id="page2"'));
const idsOf = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const at = id => p1.indexOf('id="' + id + '"');
function block(src, id) {
  const i = src.indexOf('id="' + id + '"'); if (i < 0) return null;
  const s = src.lastIndexOf('<', i), tag = src.slice(s + 1).match(/^(\w+)/)[1];
  const re = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g'); re.lastIndex = s; let d = 0, m;
  while ((m = re.exec(src))) { d += m[0][1] === '/' ? -1 : 1; if (!d) return src.slice(s, m.index + m[0].length); }
  return null;
}
const FAM = ['all', 'execution', 'meta', 'council', 'scout', 'fundamental', 'technical', 'context', 'sentiment', 'hybrid'];
const GRP = ['execution', 'meta', 'council', 'scout', 'fundamental', 'technical', 'context', 'sentiment', 'hybrid'];

// agents réels : la liste par défaut de 02 (id, rôle, nom, emoji) — 31 agents, 8 rôles
const src02 = rd('js/02-state-init.js');
const AG = [...src02.matchAll(/\{\s*id:\s*'(\w+)'[^{}]*?name:\s*'([^']+)'[^{}]*?role:\s*'(\w+)'/g)].map((m, i) => ({ id: m[1], name: m[2], role: m[3], emoji: '·', type: 'T' + i, source: 'src', fitness: 100.7 + 37 * i, color: '#fff', isBot: m[3] === 'execution' }));   // fitness en .7 : le T$ affiché est tronqué, comme la carte (07) et la matrice (08)

T('A1 #page1 : onglets · En bref (bots, analystes, mémoire) · familles · cartes · matrice en volet, dans cet ordre', () => {
  const ordre = ['tab-agents', 'agentCountMobile', 'agBref', 'agentFilterRow', 'mobileAgentList', 'agentHeatmapGrid', 'agentPanel-learn'];
  const pos = ordre.map(at); assert.ok(pos.every(p => p > 0), 'absent : ' + ordre.filter((x, i) => pos[i] < 0));
  assert.ok(pos.every((p, i) => !i || p > pos[i - 1]), 'ordre ' + JSON.stringify(pos));
  const bref = block(p1, 'agBref');
  ['agBrefBots', 'agBrefBotsBest', 'agBrefBotsSub', 'agBrefAna', 'agBrefAnaBest', 'agBrefAnaSub', 'memoryStatsBar', 'memPoolCount', 'memPoolWon', 'memDreamCount', 'memRecallBadge']
    .forEach(i => assert.ok(bref.includes('id="' + i + '"'), i + ' hors de En bref'));
  const row = block(p1, 'agentFilterRow');
  assert.deepStrictEqual([...row.matchAll(/data-role="(\w+)"/g)].map(m => m[1]), FAM, 'familles dans l\'ordre des groupes');
  FAM.forEach(f => assert.ok(row.includes("filterAgents('" + f + "',this)") && row.includes('id="agFam_' + f + '"'), 'bouton ' + f));
  const i = p1.indexOf('data-fold="matrice"'), s = p1.lastIndexOf('<div', i);
  assert.ok(i > at('mobileAgentList'), 'volet après les cartes');
  const fold = p1.slice(s, p1.indexOf('agentPanel-learn'));
  assert.ok(fold.includes("_agFold('matrice')") && fold.includes('id="agentHeatmapGrid"') && fold.includes('id="agMatriceSub"'), 'volet de la matrice');
  assert.ok(!/MATRICE DE SIGNAUX/.test(p1), 'l\'ancien titre de la matrice est devenu le volet');
});

T('A2 aucun bloc perdu : les ' + FIX.ids.length + ' id de #page1 (' + FIX.commit + ') présents une seule fois ; HTML sans id en double ; balises équilibrées', () => {
  const now = idsOf(p1);
  assert.deepStrictEqual(FIX.ids.filter(i => !now.includes(i)), [], 'perdus');
  const all = idsOf(html), dbl = [...new Set(all.filter((x, i) => all.indexOf(x) !== i))]; assert.deepStrictEqual(dbl, [], 'doublons');
  const n = re => (p1.match(re) || []).length;
  assert.strictEqual(n(/<div\b/g), n(/<\/div>/g), 'div'); assert.strictEqual(n(/<button\b/g), n(/<\/button>/g), 'button');
  assert.ok(now.length > FIX.ids.length, 'ids ajoutés');
});

// ── vm : le vrai texte de 07 buildAgentCards ──
const src07 = rd('js/07-v90-mode-bunker-sos.js');
function build(agents, opts = {}) {
  const a0 = src07.indexOf('var _agCardsSig'), a1 = src07.indexOf('function patchAgentCards()');
  const cards = [], heads = [], log = [];
  const list = { innerHTML: '', parentElement: null, children: [], querySelector: () => null,
    querySelectorAll: q => (q === '[data-agent-role]' ? cards : q === '.ag-grp-h' ? heads : []) };
  const c = { S: { agents, botFleet: {} }, Math, String, Number, Object, Array, JSON, log,
    document: { getElementById: id => (id === 'mobileAgentList' ? list : null) } };
  vm.createContext(c);
  if (opts.filter) vm.runInContext("var _agentFilter = '" + opts.filter + "';", c);
  if (opts.reopen) c._agReopenCards = () => log.push('reopen');
  vm.runInContext(src07.slice(a0, a1), c);
  // les cartes et titres de la liste (pour le filtre réappliqué) : lus dans le HTML produit
  let H = ''; Object.defineProperty(list, 'innerHTML', { get: () => H, set: v => { H = v;
    [...v.matchAll(/data-agent-role="(\w+)"/g)].forEach(m => cards.push({ dataset: { agentRole: m[1] }, style: {} }));
    [...v.matchAll(/class="ag-grp-h" data-grp="(\w+)"/g)].forEach(m => heads.push({ dataset: { grp: m[1] }, style: {} })); } });
  vm.runInContext('buildAgentCards()', c);
  return { H, cards, heads, log };
}

T('A3 07 buildAgentCards : une carte par agent (' + AG.length + ', rôles de 02 : ' + [...new Set(AG.map(a => a.role))].join(', ') + ') ; bots d\'abord ; titres avec leur nombre ; filtre et cartes ouvertes réappliqués', () => {
  assert.ok(AG.length >= 31 && AG.some(a => a.role === 'scout') && AG.some(a => a.role === 'council'), 'agents de 02 : ' + AG.length);
  const r = build(AG);
  const ids = [...r.H.matchAll(/id="agcard_(\w+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(AG.filter(a => !ids.includes(a.id)).map(a => a.role + ':' + a.id), [], 'agents sans carte');
  assert.strictEqual(ids.length, AG.length);
  const grp = [...r.H.matchAll(/class="ag-grp-h" data-grp="(\w+)"><span>[^<]+<\/span><em>(\d+)/g)].map(m => [m[1], +m[2]]);
  const roles = GRP.filter(g => AG.some(a => a.role === g));
  assert.deepStrictEqual(grp.map(g => g[0]), roles, 'ordre des groupes');
  grp.forEach(([g, n]) => assert.strictEqual(n, AG.filter(a => a.role === g).length, 'nombre du groupe ' + g));
  assert.ok(r.H.indexOf('agcard_' + AG.find(a => a.role === 'execution').id) < r.H.indexOf('agcard_' + AG.find(a => a.role !== 'execution').id), 'les bots d\'abord');
  assert.strictEqual((r.H.match(/class="ag-tap"/g) || []).length, AG.length, '« appuyer pour tout voir » sur chaque carte');
  assert.ok(!/font-size:8px;font-weight:700;color:var\(--t3\);letter-spacing:\.1em;text-transform:uppercase;\s*padding:6px 0 3px/.test(r.H), 'ancien titre de groupe');
  const f = build(AG, { filter: 'council', reopen: true });
  assert.deepStrictEqual(f.heads.filter(h => h.style.display !== 'none').map(h => h.dataset.grp), ['council'], 'titres sous filtre');
  assert.strictEqual(f.cards.filter(h => h.style.display !== 'none').length, AG.filter(a => a.role === 'council').length);
  assert.deepStrictEqual(f.log, ['reopen'], 'cartes ouvertes rouvertes après reconstruction');
});

T('A4 03 filterAgents : les titres suivent le filtre ; 08 : chaque case de la matrice porte la spécialité, En bref appelé par 08 renderAgents et 02 goPage(1)', () => {
  const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), a0 = s03.indexOf('let _agentFilter'), a1 = s03.indexOf('\n}\n', s03.indexOf('function filterAgents')) + 3;
  const cards = AG.map(a => ({ dataset: { agentRole: a.role }, style: {} })), heads = GRP.map(g => ({ dataset: { grp: g }, style: {} }));
  const list = { querySelectorAll: q => (q === '[data-agent-role]' ? cards : q === '.ag-grp-h' ? heads : []) };
  const c = { document: { getElementById: id => (id === 'mobileAgentList' ? list : null), querySelectorAll: () => [] } }; vm.createContext(c);
  vm.runInContext(s03.slice(a0, a1), c);
  vm.runInContext("filterAgents('scout', null)", c);
  assert.deepStrictEqual(heads.filter(h => h.style.display !== 'none').map(h => h.dataset.grp), ['scout']);
  assert.strictEqual(cards.filter(h => h.style.display !== 'none').length, AG.filter(a => a.role === 'scout').length);
  vm.runInContext("filterAgents('all', null)", c);
  assert.ok(heads.every(h => h.style.display === '') && cards.every(h => h.style.display === ''), 'Tous');
  const s08 = rd('js/08-learning-history-render.js');
  const hm = s08.slice(s08.indexOf('function renderAgentHeatmap()'), s08.indexOf('function', s08.indexOf('function renderAgentHeatmap()') + 10));
  assert.ok(/<div class="hc-lbl">\$\{a\.type \|\| a\.name\}<\/div>/.test(hm), 'case nommée');
  const ra = s08.slice(s08.indexOf('function renderAgents()'), s08.indexOf('function renderMarket()'));
  assert.ok(ra.includes("typeof _agBrefRender === 'function') _agBrefRender()"), '08 renderAgents → _agBrefRender');
  assert.ok(/if\(idx === 1\) \{ setTimeout\(\(\)=>\{ renderAgentHeatmap\(\); try \{ if \(typeof _agBrefRender === 'function'\) _agBrefRender\(\);/.test(src02), '02 goPage(1) → _agBrefRender');
});

T('A5 css/29-agents-zones.css chargé en dernier au token ' + TOK + ' ; toutes ses règles visent #page1 ; plancher 11 px (Évolution comprise) ; compacte / ouverte ; téléphone 1 colonne', () => {
  const links = [...html.matchAll(/<link[^>]*href="(css\/[^"?]+)\?v=([^"]+)"/g)];
  const last = links[links.length - 1]; assert.ok(last && last[1] === 'css/29-agents-zones.css' && last[2] === TOK, 'dernier : ' + (last && last[1]));
  const css = rd('css/29-agents-zones.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const sels = []; css.replace(/([^{}]+)\{/g, (m, s) => { s = s.trim(); if (!s.startsWith('@')) sels.push(...s.split(',').map(x => x.trim())); return m; });
  assert.ok(sels.length > 40, sels.length + ' sélecteurs');
  assert.deepStrictEqual(sels.filter(s => !/^#page1\b/.test(s)), [], 'règles hors écran Agents');
  assert.ok(/#page1\s*\{[^}]*--fs-6:\s*11px[^}]*--fs-8:\s*11px/.test(css), 'variables --fs au plancher');
  assert.ok(/\[style\*="font-size:6px"\][\s\S]*font-size:\s*11px !important/.test(css), 'tailles en dur au plancher');
  ['.evo-sub', '.evo-time', '.dream-card-badge', '.dream-status', '.dream-scenario-sub', '.memory-metaphor', '.hc-fit', '.agent-type-row'].forEach(k => assert.ok(css.includes('#page1 ' + k), k + ' au plancher'));
  assert.ok(/agent-card:not\(\.ag-open\) canvas\[id\^="aspk_"\][\s\S]*?agent-card:not\(\.ag-open\) \.memory-strip \{ display: none !important; \}/.test(css), 'compacte : courbe, compteurs, série et mémoire à l\'appui');
  assert.ok(/\.agent-card\.ag-open \{ grid-column: 1 \/ -1;/.test(css), 'ouverte : toute la largeur');
  assert.ok(/\.agent-tabs \{ position: sticky; top: 0;/.test(css), 'onglets collants');
  assert.ok(/@media \(max-width: 560px\)[\s\S]*#mobileAgentList \{ grid-template-columns: 1fr; \}/.test(css), 'téléphone : 1 colonne');
});

// ── vm : le vrai texte de 09i (bloc écran 2) ──
const src09i = rd('js/09i-sim-control.js'), K = src09i.indexOf('[GO CSS · écran 2 · 14/11/2026]');
function ctx09i(store, agents) {
  const mkCls = () => { const s = new Set(); return { contains: c => s.has(c), toggle: (c, on) => { if (on === undefined) on = !s.has(c); on ? s.add(c) : s.delete(c); return on; }, add: c => s.add(c), remove: c => s.delete(c) }; };
  const el = {}; const get = id => (id.startsWith('agcard_') ? (el[id] || null) : (el[id] = el[id] || { id, textContent: '', style: {}, dataset: {}, classList: mkCls() }));   // une carte n'existe que si le banc la pose
  const fold = { classList: mkCls() }, log = [];
  const btns = FAM.map(r => ({ dataset: { role: r }, style: {}, classList: mkCls() })); btns[0].classList.add('active');
  const list = get('mobileAgentList'); list.addEventListener = (t, f) => log.push(['listen', t, f]);
  const c = { log, el, fold, btns, JSON, Object, Math, Number, String, Set, Array,
    S: { agents },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: { readyState: 'complete', addEventListener: () => {}, getElementById: get,
      querySelector: q => (/\.ag-fold\[data-fold="matrice"\]/.test(q) ? fold : null),
      querySelectorAll: q => (q === '#agentFilterRow .agent-filter-btn' ? btns : []) },
    window: {}, renderAgentHeatmap: () => log.push(['heatmap']) };
  vm.createContext(c);
  if (K < 0) throw new Error('bloc écran 2 absent de 09i');
  vm.runInContext(src09i.slice(src09i.lastIndexOf('\n// ───', K)), c);
  return c;
}

T('A6 09i _agBrefRender : En bref et nombres de familles justes (recalculés ici), famille vide cachée sauf si filtrée, sous-titre de la matrice', () => {
  const c = ctx09i({}, AG); vm.runInContext('_agBrefRender()', c);
  const fit = a => Math.floor(a.fitness), b = AG.filter(a => a.role === 'execution'), n = AG.filter(a => a.role !== 'execution');
  const top = arr => arr.slice().sort((x, y) => fit(y) - fit(x))[0], moy = arr => Math.round(arr.reduce((s, a) => s + fit(a), 0) / arr.length);
  const t = id => c.el[id].textContent;
  assert.deepStrictEqual([t('agBrefBots'), t('agBrefBotsBest'), t('agBrefBotsSub')], [String(b.length), '1er : ' + top(b).name, fit(top(b)) + ' T$ · moy. ' + moy(b)]);
  assert.deepStrictEqual([t('agBrefAna'), t('agBrefAnaBest'), t('agBrefAnaSub')], [String(n.length), '1er : ' + top(n).name, fit(top(n)) + ' T$ · moy. ' + moy(n)]);
  FAM.forEach(f => assert.strictEqual(t('agFam_' + f), String(f === 'all' ? AG.length : AG.filter(a => a.role === f).length), 'famille ' + f));
  assert.strictEqual(c.btns[FAM.indexOf('hybrid')].style.display, 'none', 'Hybrides (0) caché');
  assert.strictEqual(c.btns[FAM.indexOf('scout')].style.display, '', 'Éclaireurs montré');
  assert.strictEqual(t('agMatriceSub'), AG.filter(a => !a.isBot).length + ' analystes · score appris');
  c.btns[FAM.indexOf('hybrid')].classList.add('active'); vm.runInContext('_agBrefRender()', c);
  assert.strictEqual(c.btns[FAM.indexOf('hybrid')].style.display, '', 'une famille vide mais filtrée reste visible');
  const c0 = ctx09i({}, []); vm.runInContext('_agBrefRender()', c0); assert.strictEqual(c0.el.agBrefBotsBest.textContent, '—', 'aucun agent : rien ne casse');
});

T('A7 09i : matrice fermée par défaut, un appui ouvre (redessinée) et mémorise, un 2e referme et oublie, rouverte sans redessin à la relance ; appui sur une carte (bandeau mémoire exclu)', () => {
  const store = {}, c = ctx09i(store, AG);
  assert.ok(!c.fold.classList.contains('open'), 'fermé par défaut');
  assert.ok(c.log.some(l => l[0] === 'listen' && l[1] === 'click'), 'appui écouté sur la liste');
  assert.strictEqual(vm.runInContext("_agFold('matrice')", c), true);
  assert.deepStrictEqual(JSON.parse(store.aura_agents_volets), { matrice: 1 }); assert.ok(c.log.some(l => l[0] === 'heatmap'), 'redessinée à l\'ouverture');
  assert.strictEqual(vm.runInContext("_agFold('matrice')", c), false); assert.deepStrictEqual(JSON.parse(store.aura_agents_volets), {});
  const c2 = ctx09i({ aura_agents_volets: '{"matrice":1}' }, AG);
  assert.ok(c2.fold.classList.contains('open') && !c2.log.some(l => l[0] === 'heatmap'), 'rouvert sans redessin');
  assert.ok(!ctx09i({ aura_agents_volets: '{pas du json' }, AG).fold.classList.contains('open'), 'stockage illisible → fermé');
  const tap = c.log.find(l => l[0] === 'listen')[2];
  const card = { id: 'agcard_x', classList: (() => { const s = new Set(); return { toggle: k => (s.has(k) ? (s.delete(k), false) : (s.add(k), true)), add: k => s.add(k), contains: k => s.has(k) }; })() };
  const ev = inStrip => ({ target: { closest: q => (q === '.agent-card' ? card : q === '.memory-strip' ? (inStrip ? {} : null) : null) } });
  tap(ev(false)); assert.ok(card.classList.contains('ag-open'), 'ouverte');
  tap(ev(true)); assert.ok(card.classList.contains('ag-open'), 'appui sur le bandeau mémoire : la carte ne se referme pas');
  const cl = new Set(); c.el.agcard_x = { id: 'agcard_x', classList: { add: k => cl.add(k), contains: k => cl.has(k) } };   // 07 a reconstruit la liste : carte NEUVE, fermée
  vm.runInContext('_agReopenCards()', c); assert.ok(cl.has('ag-open'), 'la carte ouverte au doigt est rouverte après reconstruction');
  delete c.el.agcard_x; vm.runInContext('_agReopenCards()', c); assert.ok(!vm.runInContext('_agOpenCards.has("agcard_x")', c), 'carte disparue (évolution) : oubliée');
  c.el.agcard_x = card;
  tap(ev(false)); assert.ok(!card.classList.contains('ag-open'), '2e appui : fermée');
  tap({ target: { closest: () => null } });   // appui hors carte : rien
});

T('G ids lus ailleurs toujours dans #page1 : barre mémoire (07), compteur (07), onglets (07 switchAgentTab), Apprentissage et Évolution (07, 08), matrice (08)', () => {
  ['memPoolCount', 'memPoolWon', 'memDreamCount', 'memRecallBadge', 'agentCountMobile', 'tab-agents', 'tab-learn', 'tab-evo', 'agentPanel-agents', 'agentPanel-learn', 'agentPanel-evo',
    'learnCount', 'learnStats', 'learnFeed', 'mobileEvoList', 'agentHeatmapGrid', 'mobileAgentList', 'dreamDotBadge'].forEach(i => assert.ok(at(i) > 0, i));
  assert.ok(src07.includes("document.getElementById('memPoolCount')") && src07.includes("document.getElementById('agentPanel-'+t)"));
  assert.ok(rd('js/08-learning-history-render.js').includes("document.getElementById('agentHeatmapGrid')"));
});

console.log('\n' + (fail ? '❌ ' + fail + ' échec(s)' : '✅ ' + pass + '/' + pass + ' tests passés'));
process.exit(fail ? 1 : 0);
