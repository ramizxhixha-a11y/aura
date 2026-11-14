// banc-css-dao.js — [GO CSS · écran 4 · 14/11/2026] écran DAO par priorité (Rams 14/11 13:50 « Go css », maquette validée « Go » 13:59) — affichage seul.
// Lit le VRAI HTML, le VRAI CSS et fait tourner le VRAI texte de 08 (buildGovCards, patchGovCards, renderDAO et leurs aides) en vm.
// Sur le code d'avant (BANC_ROOT=<copie du commit 466387f>) : D1 à D5 ÉCHOUENT ; G PASSE (garde : ce que d'autres lisent est resté).
//   D1 #page3 : En bref (#daoBref) · zone Propositions (#daoPropZone ⊃ #mobileGovList) · zone Classement T$ (#daoClsSub) · #mobileWallets ; plus d'en-têtes décoratifs
//   D2 buildGovCards : bots (rôle 'execution') puis analystes, triés au T$, rang sur tous ; libellés (analyste = spécialité, nom en wn_) ; série seulement si elle existe ;
//      En bref ; la liste des propositions sans celles de paire (grande carte) ; vide = aucun enfant
//   D3 renderDAO : rien à montrer = plus de reconstruction à chaque passage ; zone Propositions montrée / cachée ; la proposition de paire une seule fois
//   D4 patchGovCards : sans changement = aucun rebâti ; l'ordre change = rebâti une fois ; En bref suit les chiffres
//   D5 css/31-dao-zones.css chargé en DERNIER au token ; chaque règle visée à #page3 ; plancher 11 px ; 2 colonnes, téléphone 1
//   G  ids lus ailleurs (wrow_ / wv_ / wn_ / wbar_, gc_ / vf_ / va_ / vs_for_ / vs_ag_ / vbtns_, daoNewPairCard) ; 02 goPage(3) rebâtit toujours
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }

const html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const p3 = html.slice(html.lastIndexOf('<div', html.indexOf('id="page3"')), html.indexOf('<!-- PAGE 4'));
const idsOf = s => [...s.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const at = id => p3.indexOf('id="' + id + '"');
function block(id) {
  const i = p3.indexOf('id="' + id + '"'); if (i < 0) return null;
  const s = p3.lastIndexOf('<div', i); const re = /<div\b|<\/div>/g; re.lastIndex = s; let d = 0, m;
  while ((m = re.exec(p3))) { d += m[0][1] === '/' ? -1 : 1; if (!d) return p3.slice(s, m.index + m[0].length); }
  return null;
}

T('D1 #page3 : En bref · Propositions (⊃ mobileGovList) · Classement T$ · mobileWallets ; sans en-têtes décoratifs ; HTML sans id en double, balises équilibrées', () => {
  const ordre = ['daoBref', 'daoPropZone', 'daoClsSub', 'mobileWallets'], pos = ordre.map(at);
  assert.ok(pos.every(p => p > 0), 'absent : ' + ordre.filter((x, i) => pos[i] < 0));
  assert.ok(pos.every((p, i) => !i || p > pos[i - 1]), 'ordre ' + JSON.stringify(pos));
  const z = block('daoPropZone'); assert.ok(z && z.includes('id="mobileGovList"'), 'mobileGovList hors de la zone Propositions');
  const b = block('daoBref'); ['daoBrefBots', 'daoBrefBotsBest', 'daoBrefBotsSub', 'daoBrefAna', 'daoBrefAnaBest', 'daoBrefAnaSub', 'daoBrefProp', 'daoBrefPropBest'].forEach(i => assert.ok(b.includes('id="' + i + '"'), i + ' hors d\'En bref'));
  assert.strictEqual((p3.match(/class="sec-header/g) || []).length, 0, 'anciens titres de section');
  const all = idsOf(html), dbl = [...new Set(all.filter((x, i) => all.indexOf(x) !== i))]; assert.deepStrictEqual(dbl, [], 'doublons');
  const n = re => (p3.match(re) || []).length; assert.strictEqual(n(/<div\b/g), n(/<\/div>/g), 'div');
});

// ── vm : le vrai texte de 08 (de l'en-tête de l'écran 4 — ou de buildGovCards sur le code d'avant — jusqu'à renderChain) ──
const s08 = rd('js/08-learning-history-render.js');
const a0 = s08.indexOf('// [GO CSS · écran 4 · 14/11/2026] écran DAO'), a1 = s08.indexOf('function buildGovCards() {'), b0 = s08.indexOf('let _chainFilter');
const CODE = s08.slice(a0 >= 0 ? a0 : a1, b0);
function monde(agents, proposals) {
  const els = {};
  const cl = () => { const s = new Set(); return { contains: c => s.has(c), add: c => s.add(c), remove: c => s.delete(c), toggle: (c, f) => { const on = f === undefined ? !s.has(c) : !!f; on ? s.add(c) : s.delete(c); return on; } }; };
  const mk = id => { const e = { id, style: {}, dataset: {}, classList: cl(), textContent: '', _html: '', parentNode: null, kids: [] };
    Object.defineProperty(e, 'innerHTML', { get: () => e._html, set: v => { e._html = String(v); e.nbSet = (e.nbSet || 0) + 1;
      idsOf(e._html).forEach(i => { els[i] = mk(i); const m = e._html.match(new RegExp('id="' + i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>([^<]*)<')); if (m) els[i].textContent = m[1]; }); } });
    Object.defineProperty(e, 'children', { get: () => { const t = e._html; let d = 0, n = 0; const re = /<div\b|<\/div>/g; let m; while ((m = re.exec(t))) { if (m[0][1] !== '/') { if (!d) n++; d++; } else d--; } return { length: n + e.kids.length }; } });
    e.remove = () => { delete els[e.id]; if (e.parentNode) e.parentNode.kids = e.parentNode.kids.filter(k => k !== e); };
    e.insertBefore = (k) => { k.parentNode = e; e.kids.push(k); if (k.id) els[k.id] = k; };
    return e; };
  ['mobileGovList', 'mobileWallets', 'daoPropZone', 'daoClsSub', 'daoBrefBots', 'daoBrefBotsBest', 'daoBrefBotsSub', 'daoBrefAna', 'daoBrefAnaBest', 'daoBrefAnaSub', 'daoBrefProp', 'daoBrefPropBest'].forEach(i => { els[i] = mk(i); });
  els.mobileGovList.parentNode = els.daoPropZone;
  const S = { agents, proposals, cycle: 100, chainLog: [], totalTFlows: 1 };
  const c = { S, tick: 1, Math, Number, Map, Set, String, Object, Array, document: { getElementById: id => els[id] || null, createElement: () => mk('') },
    rndHash: () => 'h', nowStr: () => '00:00', bumpVersion: () => {}, activateDynamicPair: () => {}, rejectPairProposal: () => {} };
  vm.createContext(c); vm.runInContext(CODE, c);
  const build = c.buildGovCards; c.nBuild = 0; c.buildGovCards = function () { c.nBuild++; return build.apply(this, arguments); };
  return { c, els, S };
}
const AG = () => [
  { id: 'h1', name: 'Hybrid Gen-1', type: 'Fade·Extremes', role: 'council', fitness: 1012.4, streak: 2, emoji: '🧬', color: 'red' },
  { id: 'b1', name: 'Bot Arbitrage', type: 'Stat·Arb', role: 'execution', isBot: true, fitness: 527, streak: 1, emoji: '⚖️', color: 'gold' },
  { id: 'h2', name: 'Hybrid Gen-2', type: 'Z-Score·Bands', role: 'technical', fitness: 856, streak: 0, emoji: '🧬', color: 'gold' },
  { id: 'b2', name: 'Bot DCA·Grid', type: 'Accumulation', role: 'execution', isBot: true, fitness: 372, streak: -3, emoji: '🧲', color: 'ice' },
  { id: 'e1', name: 'Évolueur·Méta-IA', type: 'GenAlgo·LLM', role: 'meta', fitness: 226, streak: 0, emoji: '🧬', color: 'pur' },
  { id: 'b3', name: 'Bot Exécution', type: 'TWAP·VWAP', role: 'execution', isBot: true, fitness: 231.2, streak: 0, emoji: '⚡', color: 'up' }];
const rowsOf = (h) => [...h.matchAll(/<div class="dao-row[^"]*" id="wrow_([^"]+)">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g)].map(m => ({ id: m[1], body: m[2] }));

T('D2 buildGovCards : bots puis analystes, triés, rang sur tous ; analyste lu par sa spécialité (nom en wn_) ; série seulement si elle existe ; En bref ; liste sans proposition de paire', () => {
  const w = monde(AG(), [{ id: 7, desc: 'ordinaire', forVotes: 1, againstVotes: 1, status: 'active' }, { id: 8, desc: 'Ajouter X/USDT', isPairProposal: true, status: 'active', forVotes: 1, againstVotes: 1, pairSym: 'X' },
    { id: 6, desc: 'Ajouter W/USDT', isPairProposal: true, status: 'executed', _executed: true, forVotes: 9, againstVotes: 1, pairSym: 'W' }]);
  w.c.buildGovCards();
  const h = w.els.mobileWallets.innerHTML, grp = h.split('class="dao-grp"').slice(1);
  assert.strictEqual(grp.length, 2, 'deux groupes');
  assert.deepStrictEqual(rowsOf(grp[0]).map(r => r.id), ['b1', 'b2', 'b3'], 'groupe 1 = bots triés');
  assert.deepStrictEqual(rowsOf(grp[1]).map(r => r.id), ['h1', 'h2', 'e1'], 'groupe 2 = analystes triés');
  // deux colonnes remplies de haut en bas : --rows = moitié arrondie au-dessus, la 2e moitié porte dao-c2
  grp.forEach(g => { const n = rowsOf(g).length, half = Math.ceil(n / 2), c2 = [...g.matchAll(/class="dao-row( dao-c2)?"/g)].map(m => !!m[1]);
    assert.ok(g.includes('style="--rows:' + half + '"'), '--rows ' + half); assert.deepStrictEqual(c2, c2.map((x, i) => i >= half), 'dao-c2 sur la 2e moitié'); });
  const rk = id => (h.match(new RegExp('id="wrow_' + id + '">\\s*<div class="dao-rk[^"]*">([^<]+)<')) || [])[1];
  assert.deepStrictEqual(['h1', 'h2', 'b1', 'b2', 'b3', 'e1'].map(rk), ['🥇', '🥈', '🥉', '4', '5', '6'], 'rang sur tous');
  const r = Object.fromEntries(rowsOf(h).map(x => [x.id, x.body]));
  assert.ok(/class="dao-nm">Fade·Extremes</.test(r.h1) && /id="wn_h1">Hybrid Gen-1</.test(r.h1), 'analyste : spécialité, nom en wn_');
  assert.ok(/class="dao-nm"><span id="wn_b1">Bot Arbitrage</.test(r.b1) && /<span>Stat·Arb<\/span>/.test(r.b1), 'bot : nom (wn_), spécialité dessous');
  assert.ok(/🔥 2 gains d'affilée/.test(r.h1) && /🔥 1 gain d'affilée/.test(r.b1) && /❄ 3 pertes d'affilée/.test(r.b2), 'séries');
  assert.ok(!/dao-stk/.test(r.h2) && !/dao-stk/.test(r.e1) && !/0 gain/.test(h), 'pas de série à 0');
  assert.ok(/id="wv_h1">1012</.test(h) && /id="wbar_h2" style="width:85%/.test(h), 'T$ tronqué, barre au max');
  const t = id => w.els[id].textContent;
  assert.deepStrictEqual(['daoBrefBots', 'daoBrefBotsBest', 'daoBrefBotsSub', 'daoBrefAna', 'daoBrefAnaBest', 'daoBrefAnaSub', 'daoBrefProp', 'daoBrefPropBest', 'daoClsSub', 'daoGrpBotsSub', 'daoGrpAnaSub'].map(t),
    ['3', '1er : Bot Arbitrage', '527 T$ · rang 3 sur 6', '3', '1er : Fade·Extremes', '1012 T$ · 2 devant le 1er bot', '2', '2 en vote', 'marché interne · rang sur 6', '3 · le 1er au rang 3', '3 · 2 devant le 1er bot'], 'En bref');
  const g = w.els.mobileGovList.innerHTML;
  assert.ok(/id="gc_7"/.test(g) && !/id="gc_8"/.test(g), 'la proposition de paire EN VOTE n\'est pas dans la liste (grande carte)');
  assert.ok(/id="gc_6"/.test(g), 'une proposition de paire passée garde sa petite carte (comme avant)');
  assert.ok(w.els.daoPropZone.classList.contains('on'), 'zone montrée');
  const v = monde(AG(), []); v.c.buildGovCards();
  assert.strictEqual(v.els.mobileGovList.innerHTML.trim(), '', 'vide = rien (la tuile le dit)'); assert.ok(!v.els.daoPropZone.classList.contains('on'), 'zone cachée');
  assert.strictEqual(v.els.daoBrefPropBest.textContent, 'aucune active');
});

T('D3 renderDAO : rien à montrer ou une proposition de paire en vote = aucun rebâti (5 passages) ; zone suit la grande carte ; la proposition de paire une seule fois, passée : sa petite carte', () => {
  const w = monde(AG(), []); w.c.buildGovCards(); w.c.nBuild = 0;
  for (let i = 0; i < 5; i++) w.c.renderDAO();
  assert.strictEqual(w.c.nBuild, 0, 'rebâti ' + w.c.nBuild + ' fois sur 5');
  w.S.proposals.push({ id: 9, desc: 'Ajouter Y/USDT', isPairProposal: true, status: 'active', forVotes: 10, againstVotes: 5, pairSym: 'Y', pairCfg: { emoji: '🌐', name: 'Y', corr: 'LOW' }, rationale: 'r', autoPassAt: 130 });
  w.c.renderDAO();
  assert.ok(w.els.daoNewPairCard, 'grande carte'); assert.ok(w.els.daoPropZone.classList.contains('on'), 'zone montrée avec la grande carte');
  w.c.nBuild = 0; for (let i = 0; i < 5; i++) w.c.renderDAO();
  assert.strictEqual(w.c.nBuild, 0, 'proposition de paire en vote : rebâti ' + w.c.nBuild + ' fois sur 5');
  const n = (w.els.mobileGovList.innerHTML.match(/Y\/USDT/g) || []).length + (w.els.daoNewPairCard.innerHTML.match(/pair-proposal-sym">Y\/USDT/g) || []).length;
  assert.strictEqual(n, 1, 'Y/USDT montrée ' + n + ' fois');
  w.S.proposals[0].status = 'executed'; w.c.renderDAO();
  assert.ok(!w.els.daoNewPairCard, 'grande carte retirée'); assert.ok(/id="gc_9"/.test(w.els.mobileGovList.innerHTML), 'passée : sa petite carte, comme avant');
  w.S.proposals.length = 0; w.c.renderDAO();
  assert.ok(!w.els.daoPropZone.classList.contains('on'), 'plus rien : zone cachée');
});

T('D4 patchGovCards : sans changement aucun rebâti ; l\'ordre change → rebâti une fois ; En bref suit les chiffres', () => {
  const w = monde(AG(), []); w.c.buildGovCards(); w.c.nBuild = 0;
  for (let i = 0; i < 5; i++) w.c.patchGovCards();
  assert.strictEqual(w.c.nBuild, 0, 'rebâti sans changement');
  w.S.agents[1].fitness = 600; w.c.patchGovCards();   // T$ du 1er bot : même ordre
  assert.strictEqual(w.c.nBuild, 0, 'même ordre'); assert.strictEqual(w.els.daoBrefBotsSub.textContent, '600 T$ · rang 3 sur 6'); assert.strictEqual(w.els.wv_b1.textContent, 600);
  w.S.agents[1].fitness = 2000; w.c.patchGovCards();
  assert.strictEqual(w.c.nBuild, 1, 'rebâti une fois'); assert.strictEqual(w.els.daoBrefBotsSub.textContent, '2000 T$ · rang 1 sur 6');
  w.c.patchGovCards(); assert.strictEqual(w.c.nBuild, 1, 'puis stable');
  w.S.agents[2].streak = 4; w.c.patchGovCards(); assert.strictEqual(w.c.nBuild, 2, 'une série qui change → rebâti');
  // une carte de proposition rebâtie par le patch reçoit ses votes dans le MÊME patch (relecture du 14/11 : avant, « 0 G$ (0%) » jusqu'au patch suivant)
  const v = monde(AG(), [{ id: 3, desc: 'ordinaire', forVotes: 300, againstVotes: 100, status: 'active' }]); v.c.buildGovCards(); v.c.patchGovCards();
  v.S.agents[1].fitness = 5000; v.c.patchGovCards();
  assert.strictEqual(v.c.nBuild, 2, 'rebâti par le patch'); assert.strictEqual(v.els.vs_for_3.textContent, '↑ Pour: 300 G$ (75%)', 'votes posés après le rebâti');
});

T('D5 css/31-dao-zones.css chargé en dernier au token ' + TOK + ' ; chaque règle visée à #page3 ; plancher 11 px ; 2 colonnes, téléphone 1', () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"?]+)\?v=([0-9a-z]+)"/g)];
  const last = links[links.length - 1]; assert.ok(last && last[1] === 'css/31-dao-zones.css' && last[2] === TOK, 'dernier : ' + (last && last[1]));
  const css = rd('css/31-dao-zones.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const sel = [...css.replace(/@media[^{]+\{/g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)].map(m => m[1].trim()).filter(Boolean);
  const hors = sel.flatMap(s => s.split(',').map(x => x.trim())).filter(x => x && !x.startsWith('#page3'));
  assert.deepStrictEqual(hors, [], 'sélecteurs hors #page3');
  const decl = [...css.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).join(';');   // les déclarations seules (les sélecteurs [style*="font-size:8px"] ne comptent pas)
  const tailles = [...decl.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map(m => +m[1]).filter(n => n < 11);
  assert.deepStrictEqual(tailles, [], 'tailles < 11 px');
  assert.ok(/\[style\*="font-size:8px"\][\s\S]*font-size: 11px !important/.test(css) && /\.pair-proposal-card::before/.test(css), 'plancher : tailles en dur et « ✨ NOUVEAU »');
  assert.ok(/#page3 \.dao-rows \{[^}]*grid-template-columns: 1fr 1fr[^}]*grid-auto-flow: column/.test(css), '2 colonnes, rang de haut en bas');
  assert.ok(/@media \(max-width: 520px\)[\s\S]*#page3 \.dao-rows \{ grid-template-columns: 1fr;/.test(css), 'téléphone : 1 colonne');
  assert.ok(/#page3 #daoPropZone:not\(\.on\) \{ display: none; \}/.test(css), 'zone Propositions cachée sans proposition');
});

T('G ids lus ailleurs gardés : wrow_ / wv_ / wn_ / wbar_ (patchGovCards), gc_ / vf_ / va_ / vs_for_ / vs_ag_ / vbtns_, daoNewPairCard ; 02 goPage(3) rebâtit', () => {
  ['id="wrow_${a.id}"', 'id="wv_${a.id}"', 'id="wn_${a.id}"', 'id="wbar_${a.id}"', 'id="gc_${p.id}"', 'id="vf_${p.id}"', 'id="va_${p.id}"', 'id="vs_for_${p.id}"', 'id="vs_ag_${p.id}"', 'id="vbtns_${p.id}"']
    .forEach(i => assert.ok(CODE.includes(i), i + ' absent de buildGovCards'));
  ["getElementById('wv_'+a.id)", "getElementById('wn_'+a.id)", "getElementById('wbar_'+a.id)", "getElementById('vbtns_'+p.id)"].forEach(i => assert.ok(CODE.includes(i), i + ' absent de patchGovCards'));
  assert.ok(CODE.includes("pairProposalEl.id = 'daoNewPairCard'") && CODE.includes('gl.parentNode.insertBefore(pairProposalEl, gl)'), 'grande carte de paire');
  assert.ok(/if\(idx === 3\) \{ setTimeout\(\(\)=>\{[\s\S]{0,200}buildGovCards\(\); renderDAO\(\);/.test(rd('js/02-state-init.js')), '02 goPage(3)');
  ['mobileWallets', 'mobileGovList'].forEach(i => assert.ok(at(i) > 0, i + ' absent de #page3'));
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
