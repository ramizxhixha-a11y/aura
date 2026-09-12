// banc-all.js — [PROTOCOLE · 12/09/2026] contrôle global AVANT toute livraison AURA8. Aucune livraison sans « VERDICT : LIVRABLE ».
//
//   node banc-all.js              statique + tous les bancs (≈ 10 s)
//   node banc-all.js --statique   statique seul (≈ 1 s)
//
// STATIQUE (tout est lu dans le dépôt, rien n'est figé ici) :
//   1. HTML : DOC_V présent, les 78 ?v= identiques à DOC_V, chaque script/css déclaré existe sur le disque.
//   1b. PASSATION : PASSATION-AURA8.md présente à la racine et 1re ligne portant `DOC_V` — la passation est versionnée et
//       réécrite dans CHAQUE commit de livraison (push direct depuis le 12/09) ; l'oublier ou la laisser à l'ancien token BLOQUE.
//   2. Syntaxe : chaque .js du dépôt (js/, racine, bancs) compile (vm.Script).
//   3. COLLISIONS GLOBALES — la classe d'erreur la plus coûteuse de ce projet (09b3 `_buildFullBackup()` a écrasé en silence
//      celui de 03 pendant 2 mois et demi → store IDB obèse, gels de 6 s à chaque boot) : tous les scripts chargés par le HTML
//      (externes + inline) partagent UN SEUL espace global. Un nom déclaré au niveau 0 dans deux scripts = ÉCHEC :
//        function / var  → le 2e écrase le 1er sans erreur ni log ;  let / const / class → SyntaxError, le 2e script ne s'exécute pas.
//      Analyse exacte avec acorn si présent (`npm i acorn --no-save` à la racine, 2 s), sinon heuristique « colonne 0 » (signalée).
//      `window.X =` posé dans deux fichiers = AVERTISSEMENT (patch volontaire possible : à relire, pas bloquant).
// BANCS : chaque banc-*.js est exécuté ; les échecs antérieurs connus (CONNUS) sont tolérés à score identique, tout autre échec BLOQUE.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = __dirname, HTML = 'AURA8_v118.html';
const STATIQUE_SEUL = process.argv.includes('--statique');
const CONNUS = {   // échecs antérieurs tolérés (score identique) — retirer une entrée dès que le banc est rétabli
  'banc-net-expectancy.js':   { score: '18/19', motif: 'échec antérieur (avant 07/09), non lié aux livraisons gel' },
  'banc-p6-frais-slippage.js': { score: '28/29', motif: 'échec antérieur (avant 07/09), non lié' },
  'banc-p7-news.js':          { motif: 'figé : banc-p7-news-payload.json absent du dépôt' },
  'banc-skill-borne.js':      { motif: 'figé : token 20260906i en dur — à réécrire pour lire DOC_V' },
};
const ARGS = { 'banc-phase0-pont.js': ['js/10h-pont-fullpower-bricks.js'] };   // bancs qui exigent un argument
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let KO = 0, WARN = 0;
const ok = (m) => console.log('  ✅ ' + m);
const ko = (m) => { KO++; console.log('  ❌ ' + m); };
const warn = (m) => { WARN++; console.log('  ⚠️  ' + m); };

/* ───── 1. HTML : token + fichiers déclarés ───── */
console.log('▶ HTML');
const html = rd(HTML);
const mDoc = html.match(/DOC_V = '(\d{8}[a-z])'/);
const TOK = mDoc ? mDoc[1] : null;
if (!TOK) ko('DOC_V introuvable dans ' + HTML); else ok('DOC_V = ' + TOK);
const toks = html.match(/\?v=[0-9a-z]+/g) || [];
const bad = toks.filter(t => t !== '?v=' + TOK);
if (toks.length === 78 && !bad.length) ok('78 ?v= tous à ' + TOK);
else ko(toks.length + ' ?v= (attendu 78) · divergents : ' + (bad.slice(0, 5).join(' ') || 'aucun'));
const scripts = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
const csss = [...html.matchAll(/<link[^>]*\bhref="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(m => m[1]);
const missing = scripts.concat(csss).filter(f => !fs.existsSync(path.join(ROOT, f)));
if (!missing.length) ok(scripts.length + ' scripts + ' + csss.length + ' css déclarés, tous présents sur le disque');
else ko('déclarés mais ABSENTS du dépôt : ' + missing.join(', '));

/* ───── 1b. Passation : versionnée dans le dépôt, 1re ligne au token courant ───── */
console.log('▶ Passation');
const PASS = 'PASSATION-AURA8.md';
if (!fs.existsSync(path.join(ROOT, PASS))) ko(PASS + ' ABSENTE de la racine — la passation est commitée avec chaque livraison');
else {
  const l1 = rd(PASS).split('\n')[0];
  if (TOK && l1.includes('`' + TOK + '`')) ok(PASS + ' : 1re ligne au token ' + TOK);
  else ko(PASS + ' : 1re ligne sans le token ' + TOK + ' — passation NON mise à jour : « ' + l1.slice(0, 90) + ' »');
}

/* ───── 2. Syntaxe de tous les .js du dépôt ───── */
console.log('▶ Syntaxe');
const allJs = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)
  .concat(fs.readdirSync(ROOT).filter(f => f.endsWith('.js')));
let synKO = 0;
for (const f of allJs) { try { new vm.Script(rd(f), { filename: f }); } catch (e) { synKO++; ko('syntaxe ' + f + ' : ' + e.message); } }
if (!synKO) ok(allJs.length + ' fichiers .js compilent');
const nonCharges = allJs.filter(f => f.startsWith('js/') && !scripts.includes(f));
if (nonCharges.length) console.log('  ℹ️  dans js/ mais non chargés par le HTML (hors espace global) : ' + nonCharges.join(', '));

/* ───── 3. Collisions dans l'espace global partagé ───── */
console.log('▶ Collisions globales (scripts chargés par le HTML + inline)');
let acorn = null; try { acorn = require('acorn'); } catch (e) { try { acorn = require(path.join(ROOT, 'node_modules', 'acorn')); } catch (e2) {} }
const units = scripts.map(f => ({ name: f, src: rd(f) }));
let n = 0; for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) units.push({ name: HTML + '#inline' + (++n), src: m[1] });
function declsExact(src) {   // niveau 0 du Program : function / class / var / let / const (motifs de déstructuration inclus)
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
  const out = [];
  const walk = (p, k) => { if (!p) return; if (p.type === 'Identifier') out.push([p.name, k]); else if (p.type === 'ObjectPattern') p.properties.forEach(q => walk(q.value || q.argument, k));
    else if (p.type === 'ArrayPattern') p.elements.forEach(e => walk(e, k)); else if (p.type === 'AssignmentPattern') walk(p.left, k); else if (p.type === 'RestElement') walk(p.argument, k); };
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') out.push([node.id.name, node.type === 'ClassDeclaration' ? 'class' : 'function']);
    else if (node.type === 'VariableDeclaration') node.declarations.forEach(d => walk(d.id, node.kind));
  }
  return out;
}
function declsHeuristique(src) {   // repli : déclarations en colonne 0 uniquement
  const out = []; let m;
  for (const line of src.split('\n')) {
    if ((m = line.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/))) out.push([m[1], 'function']);
    else if ((m = line.match(/^class\s+([A-Za-z_$][\w$]*)/))) out.push([m[1], 'class']);
    else if ((m = line.match(/^(var|let|const)\s+([A-Za-z_$][\w$]*)/))) out.push([m[2], m[1]]);
  }
  return out;
}
const decl = new Map(), winSet = new Map();
let parseKO = 0;
for (const u of units) {
  let ds; try { ds = acorn ? declsExact(u.src) : declsHeuristique(u.src); } catch (e) { parseKO++; ko('analyse ' + u.name + ' : ' + e.message); continue; }
  for (const [name, kind] of ds) { if (!decl.has(name)) decl.set(name, []); decl.get(name).push(kind + '@' + u.name.replace(/^js\//, '')); }
  for (const m of u.src.matchAll(/(?:^|[^\w$.])window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) { if (!winSet.has(m[1])) winSet.set(m[1], new Set()); winSet.get(m[1]).add(u.name.replace(/^js\//, '')); }
}
const dups = [...decl.entries()].filter(([, l]) => new Set(l.map(x => x.split('@')[1])).size > 1);
const mode = acorn ? 'acorn (exact)' : 'HEURISTIQUE colonne 0 — `npm i acorn --no-save` pour l\'analyse exacte';
if (!dups.length && !parseKO) ok(decl.size + ' noms de niveau 0 sur ' + units.length + ' scripts, AUCUNE collision · ' + mode);
for (const [name, l] of dups) ko('COLLISION « ' + name + ' » : ' + l.join(' | ') + '  → le dernier chargé écrase (function/var) ou casse le script (let/const/class)');
if (!acorn) warn('analyse heuristique : les déclarations indentées ou multi-lignes ne sont pas vues');
const winDups = [...winSet.entries()].filter(([, s]) => s.size > 1);
if (winDups.length) warn('window.X posé dans plusieurs fichiers (' + winDups.length + ') — patch volontaire ou collision ? à relire : ' + winDups.map(([k, s]) => k + ' {' + [...s].join(', ') + '}').join(' ; '));
else ok('aucun window.X posé dans deux fichiers');

/* ───── 4. Bancs ───── */
let nouveaux = 0;
if (!STATIQUE_SEUL) {
  console.log('▶ Bancs');
  const bancs = fs.readdirSync(ROOT).filter(f => /^banc-.*\.js$/.test(f) && f !== path.basename(__filename)).sort();
  for (const b of bancs) {
    const t0 = Date.now();
    const r = cp.spawnSync(process.execPath, [b].concat(ARGS[b] || []), { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
    const out = (r.stdout || '') + (r.stderr || '');
    const last = out.trim().split('\n').filter(Boolean).pop() || '';
    const rc = r.status === null ? 'timeout' : r.status;
    const ms = Date.now() - t0, c = CONNUS[b];
    const tag = b + ' (' + ms + ' ms) · ' + last.slice(0, 70);
    if (rc === 0) { if (c) ok(tag + '  ← rétabli : retirer de CONNUS'); else ok(tag); }
    else if (c && (!c.score || out.includes(c.score))) console.log('  ⚠️  ' + tag + '  ← KO connu, toléré : ' + c.motif);
    else { nouveaux++; ko(tag + '  ← ÉCHEC NOUVEAU (rc=' + rc + ')'); console.log(out.split('\n').filter(l => /❌|Error|ÉCHEC|KO/.test(l)).slice(0, 6).map(l => '        ' + l.slice(0, 160)).join('\n')); }
  }
}

/* ───── verdict ───── */
const bloque = KO > 0;
console.log('\n' + (bloque ? '⛔ VERDICT : BLOQUÉ' : '✅ VERDICT : LIVRABLE') + ' — token ' + TOK + ' · ' + KO + ' échec(s) dont ' + nouveaux + ' banc(s) nouveau(x) · ' + WARN + ' avertissement(s)');
process.exit(bloque ? 1 : 0);
