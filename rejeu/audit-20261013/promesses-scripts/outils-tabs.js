// Vérifie _OUTILS_TABS : doublons, onglets atteignables, fonctions render/init présentes sur window.
const fs = require('fs'), path = require('path');
const NM = path.join(__dirname, '..', 'node_modules');
const acorn = require(path.join(NM, 'acorn'));
const walk = require(path.join(NM, 'acorn-walk'));
const ROOT = process.argv[2];
const html = fs.readFileSync(path.join(ROOT, 'AURA8_v118.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
const onWindow = new Map(); const lexical = new Map();
for (const f of srcs) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const ast = acorn.parse(text, { ecmaVersion: 'latest', locations: true });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') onWindow.set(st.id.name, f + ':' + st.loc.start.line);
    if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') (st.kind === 'var' ? onWindow : lexical).set(d.id.name, f + ':' + st.loc.start.line);
  }
  walk.full(ast, n => {
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.type === 'Identifier' && n.left.object.name === 'window' && !n.left.computed)
      if (!onWindow.has(n.left.property.name)) onWindow.set(n.left.property.name, f + ':' + n.loc.start.line + '(window.)');
  });
}
// Extraire _OUTILS_TABS
const s07 = fs.readFileSync(path.join(ROOT, 'js/07-v90-mode-bunker-sos.js'), 'utf8');
const i = s07.indexOf('const _OUTILS_TABS = {');
const ast = acorn.parse(s07.slice(i), { ecmaVersion: 'latest', locations: true });
const obj = ast.body[0].declarations[0].init;
const lineBase = s07.slice(0, i).split('\n').length - 1;
const tabsInHtml = new Set([...html.matchAll(/switchOutilsTab\('(\w+)'/g)].map(m => m[1]));
const opened = new Set([...html.matchAll(/openOutils\('(\w+)'/g)].map(m => m[1]));
const seenGlobal = new Map();
for (const p of obj.properties) {
  const tab = p.key.name;
  const reachable = tabsInHtml.has(tab) || opened.has(tab);
  const secs = p.value.properties.find(q => q.key.name === 'sections').value.elements;
  const ids = new Map();
  const out = [];
  for (const e of secs) {
    const g = k => { const pr = e.properties.find(q => q.key.name === k); return pr && pr.value.value; };
    const id = g('id'), render = g('render'), init = g('init');
    const line = lineBase + e.loc.start.line;
    const fn = render || init;
    const st = fn ? (onWindow.has(fn) ? 'ok' : lexical.has(fn) ? 'LEXICAL(not on window) ' + lexical.get(fn) : 'ABSENT') : '-';
    if (ids.has(id)) out.push(`  DOUBLON id=${id} lignes ${ids.get(id)} et ${line}`);
    ids.set(id, line);
    if (seenGlobal.has(id)) out.push(`  (id ${id} aussi dans onglet ${seenGlobal.get(id)})`);
    else seenGlobal.set(id, tab);
    if (st !== 'ok') out.push(`  ${id} -> ${fn} : ${st} (07:${line})`);
  }
  console.log(`onglet ${tab} : ${secs.length} sections · bouton d'accès : ${reachable ? 'oui' : 'NON'}`);
  out.forEach(l => console.log(l));
}
