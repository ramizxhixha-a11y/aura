// Pour une liste de fonctions de réglage : quelles propriétés écrivent-elles (S.x.y = / obj.key = / localStorage.setItem) ?
// Puis : où ces propriétés sont-elles LUES dans le code chargé (hors fonctions render*/update*/toggle* de l'UI) ?
// Usage : node ecrit-lu.js ROOT fn1 fn2 ...
const fs = require('fs'), path = require('path');
const NM = path.join(__dirname, '..', 'node_modules');
const acorn = require(path.join(NM, 'acorn'));
const walk = require(path.join(NM, 'acorn-walk'));
const ROOT = process.argv[2];
const wanted = process.argv.slice(3);
const html = fs.readFileSync(path.join(ROOT, 'AURA8_v118.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
const files = srcs.map(f => ({ f, text: fs.readFileSync(path.join(ROOT, f), 'utf8') }));
for (const F of files) F.ast = acorn.parse(F.text, { ecmaVersion: 'latest', locations: true, ranges: true });

function memberPath(n) {
  const parts = [];
  while (n && n.type === 'MemberExpression') {
    if (n.computed) parts.unshift(n.property.type === 'Literal' ? String(n.property.value) : '[]');
    else parts.unshift(n.property.name);
    n = n.object;
  }
  if (n && n.type === 'Identifier') parts.unshift(n.name); else if (n && n.type === 'ThisExpression') parts.unshift('this'); else parts.unshift('?');
  return parts;
}
// trouve les fonctions par nom (déclaration, window.X = function, const X = function/arrow)
const fnNodes = new Map();
for (const F of files) walk.ancestor(F.ast, {
  FunctionDeclaration(n) { if (n.id) (fnNodes.get(n.id.name) || fnNodes.set(n.id.name, []).get(n.id.name)).push({ F, n }); },
  AssignmentExpression(n) {
    if (n.left.type === 'MemberExpression' && /Function/.test(n.right.type)) { const p = memberPath(n.left); const nm = p[p.length - 1]; (fnNodes.get(nm) || fnNodes.set(nm, []).get(nm)).push({ F, n: n.right }); }
  },
  VariableDeclarator(n) { if (n.init && /Function/.test(n.init.type) && n.id.type === 'Identifier') (fnNodes.get(n.id.name) || fnNodes.set(n.id.name, []).get(n.id.name)).push({ F, n: n.init }); },
});
// enclosing function name for any node position
function enclosingName(F, pos) {
  let best = null;
  walk.ancestor(F.ast, {
    Function(n, anc) {
      if (n.start <= pos && pos < n.end) {
        let nm = n.id && n.id.name;
        if (!nm) { const p = anc[anc.length - 2]; if (p && p.type === 'VariableDeclarator') nm = p.id.name; else if (p && p.type === 'AssignmentExpression') nm = memberPath(p.left).join('.'); else if (p && p.type === 'Property') nm = p.key.name || p.key.value; }
        if (!best || n.start >= best.start) best = { start: n.start, nm: nm || '(anon)' };
      }
    }
  });
  return best ? best.nm : '(top)';
}
for (const w of wanted) {
  const defs = fnNodes.get(w) || [];
  console.log(`\n### ${w} : ${defs.length} définition(s) ${defs.map(d => d.F.f + ':' + d.n.loc.start.line).join(', ')}`);
  const d = defs[defs.length - 1]; if (!d) continue;
  const writes = new Set();
  walk.full(d.n.body, n => {
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression') writes.add(memberPath(n.left).slice(-1)[0] + '|' + memberPath(n.left).join('.'));
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.property.name === 'setItem' && n.arguments[0] && n.arguments[0].type === 'Literal') writes.add('LS:' + n.arguments[0].value);
  });
  for (const wr of writes) {
    const key = wr.startsWith('LS:') ? wr.slice(3) : wr.split('|')[0];
    const full = wr.startsWith('LS:') ? wr : wr.split('|')[1];
    if (key === '[]' || key === 'textContent' || key === 'innerHTML' || key === 'className' || key === 'display') continue;
    const reads = [];
    for (const F of files) {
      walk.ancestor(F.ast, {
        MemberExpression(n, anc) {
          const p = anc[anc.length - 2];
          const isWrite = p && p.type === 'AssignmentExpression' && p.left === n;
          const k = n.computed ? (n.property.type === 'Literal' ? String(n.property.value) : null) : n.property.name;
          if (k === key && !isWrite) reads.push(F.f.replace('js/', '') + ':' + n.loc.start.line + '<' + enclosingName(F, n.start) + '>');
        },
        Literal(n) { if (wr.startsWith('LS:') && n.value === key) reads.push(F.f.replace('js/', '') + ':' + n.loc.start.line + '<' + enclosingName(F, n.start) + '>'); }
      });
    }
    const uniq = [...new Set(reads)];
    console.log(`  écrit ${full} → lu ${uniq.length}× : ${uniq.slice(0, 14).join('  ')}${uniq.length > 14 ? ' …' : ''}`);
  }
}
