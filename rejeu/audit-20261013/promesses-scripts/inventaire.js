// Inventaire des gestionnaires d'interface AURA8 (lecture seule).
// Usage : node inventaire.js /home/claude/aura
const fs = require('fs');
const path = require('path');
const NM = path.join(__dirname, '..', 'node_modules');
const acorn = require(path.join(NM, 'acorn'));
const walk = require(path.join(NM, 'acorn-walk'));

const ROOT = process.argv[2];
const html = fs.readFileSync(path.join(ROOT, 'AURA8_v118.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

const defs = new Map();      // nom -> [fichier:ligne]
const implicit = new Map();  // affectation à un identifiant (global implicite possible)
const handlers = [];         // {where, code}

function addDef(map, name, where) { if (!map.has(name)) map.set(name, []); map.get(name).push(where); }

function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

function scanHandlerStrings(text, file, baseLine, offsetToLine) {
  // onclick="..." / onclick='...' / onclick=\"...\" dans une chaîne
  const re = /\bon(click|change|input|submit|touchstart|touchend|keyup|keydown|blur|focus)\s*=\s*(\\?["'])/g;
  let m;
  while ((m = re.exec(text))) {
    const q = m[2];
    const start = m.index + m[0].length;
    let end;
    if (q.length === 2) { end = text.indexOf(q, start); }
    else {
      // chercher la quote de fermeture non échappée
      end = start;
      while (end < text.length && !(text[end] === q && text[end - 1] !== '\\')) end++;
    }
    if (end < 0) continue;
    const code = text.slice(start, end);
    handlers.push({ file, line: offsetToLine(m.index), ev: m[1], code });
  }
}

const parsed = [];
for (const f of srcs) {
  const p = path.join(ROOT, f);
  const text = fs.readFileSync(p, 'utf8');
  let ast;
  try { ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true }); }
  catch (e) { console.error('PARSE FAIL', f, e.message); continue; }
  parsed.push({ f, text, ast });
  // top-level
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') addDef(defs, st.id.name, f + ':' + st.loc.start.line);
    if (st.type === 'ClassDeclaration') addDef(defs, st.id.name, f + ':' + st.loc.start.line);
    if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') addDef(defs, d.id.name, f + ':' + st.loc.start.line);
  }
  walk.full(ast, n => {
    if (n.type === 'AssignmentExpression') {
      const L = n.left;
      if (L.type === 'MemberExpression' && L.object.type === 'Identifier' && ['window', 'globalThis', 'self'].includes(L.object.name)) {
        const nm = L.computed ? (L.property.type === 'Literal' ? L.property.value : null) : L.property.name;
        if (nm) addDef(defs, nm, f + ':' + n.loc.start.line + '(window)');
      }
      if (L.type === 'Identifier') addDef(implicit, L.name, f + ':' + n.loc.start.line);
    }
    // var déclarées avec var dans le top-level de blocs non-fonction : déjà approximé
    if (n.type === 'VariableDeclaration' && n.kind === 'var') {
      // var dans un bloc top-level (if/try) au niveau script => global ; approx : on ajoute dans implicit
      for (const d of n.declarations) if (d.id.type === 'Identifier') addDef(implicit, d.id.name, f + ':' + n.loc.start.line + '(var)');
    }
    // Chaînes et templates contenant des handlers
    if (n.type === 'Literal' && typeof n.value === 'string' && /\bon(click|change|input)\s*=/.test(n.value)) {
      scanHandlerStrings(n.value, f, n.loc.start.line, () => n.loc.start.line);
    }
    if (n.type === 'TemplateLiteral') {
      for (const q of n.quasis) {
        const raw = q.value.cooked != null ? q.value.cooked : q.value.raw;
        if (/\bon(click|change|input)\s*=/.test(raw)) scanHandlerStrings(raw, f, q.loc.start.line, (idx) => q.loc.start.line + raw.slice(0, idx).split('\n').length - 1);
      }
    }
  });
  // addEventListener with string literal handler names are rare ; on liste les addEventListener('click'|'change'|'input') dont le callback est un Identifier
  walk.full(ast, n => {
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.property.name === 'addEventListener' && n.arguments.length >= 2) {
      const ev = n.arguments[0].type === 'Literal' ? n.arguments[0].value : '?';
      if (['click', 'change', 'input', 'touchend', 'touchstart', 'pointerdown', 'pointerup', 'submit'].includes(ev)) {
        const cb = n.arguments[1];
        handlers.push({ file: f, line: n.loc.start.line, ev: 'AEL:' + ev, code: cb.type === 'Identifier' ? cb.name + '()' : null, aelNode: cb.type });
      }
    }
  });
}

// Handlers HTML statiques
scanHandlerStrings(html, 'AURA8_v118.html', 0, idx => lineOf(html, idx));
// Inline script defs
for (const s of inline) {
  try {
    const ast = acorn.parse(s, { ecmaVersion: 'latest' });
    walk.full(ast, n => { if (n.type === 'FunctionDeclaration') addDef(defs, n.id.name, 'inline'); });
  } catch (e) { }
}
// IDs du DOM HTML (window.<id> existe implicitement)
const ids = new Set([...html.matchAll(/\bid="([A-Za-z_$][\w$]*)"/g)].map(m => m[1]));

const BUILTIN = new Set(['alert', 'confirm', 'prompt', 'event', 'this', 'document', 'window', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'Number', 'parseFloat', 'parseInt', 'String', 'Math', 'JSON', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage', 'Date', 'Object', 'Array', 'Promise', 'encodeURIComponent', 'decodeURIComponent', 'isNaN', 'Boolean', 'requestAnimationFrame', 'fetch', 'open', 'print', 'scrollTo', 'getComputedStyle', 'performance', 'indexedDB', 'Blob', 'URL', 'Notification', 'screen', 'Error', 'undefined', 'NaN', 'Infinity', 'arguments']);

function analyseCode(code) {
  // remplace ${...} par un littéral
  let c = code.replace(/\$\{[^}]*\}/g, '0').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\\'/g, "'").replace(/\\"/g, '"');
  let ast;
  try { ast = acorn.parse(c, { ecmaVersion: 'latest', allowReturnOutsideFunction: true }); }
  catch (e) { return { err: e.message, code: c }; }
  const calls = []; const guarded = new Set();
  walk.full(ast, n => {
    if (n.type === 'UnaryExpression' && n.operator === 'typeof') {
      const a = n.argument;
      if (a.type === 'Identifier') guarded.add(a.name);
      if (a.type === 'MemberExpression' && a.object.type === 'Identifier' && a.object.name === 'window' && !a.computed) guarded.add(a.property.name);
    }
    if (n.type === 'LogicalExpression' && n.operator === '&&') {
      const a = n.left;
      if (a.type === 'MemberExpression' && a.object.type === 'Identifier' && a.object.name === 'window' && !a.computed) guarded.add(a.property.name);
      if (a.type === 'Identifier') guarded.add(a.name);
    }
    if (n.type === 'CallExpression') {
      const cl = n.callee;
      if (cl.type === 'Identifier') calls.push(cl.name);
      else if (cl.type === 'MemberExpression' && cl.object.type === 'Identifier' && cl.object.name === 'window' && !cl.computed) calls.push(cl.property.name);
    }
  });
  return { calls, guarded, code: c };
}

const report = { dead: [], guardedDead: [], parseErr: [], implicitOnly: [], total: handlers.length, ok: 0 };
for (const h of handlers) {
  if (h.code == null) { continue; }
  const r = analyseCode(h.code);
  if (r.err) { report.parseErr.push({ ...h, err: r.err }); continue; }
  let allOk = true;
  for (const nm of r.calls) {
    if (BUILTIN.has(nm) || defs.has(nm)) continue;
    allOk = false;
    const entry = { where: h.file + ':' + h.line, ev: h.ev, name: nm, code: h.code.slice(0, 140), implicitDef: implicit.get(nm) || null, isDomId: ids.has(nm) };
    if (implicit.has(nm)) report.implicitOnly.push(entry);
    else if (r.guarded.has(nm)) report.guardedDead.push(entry);
    else report.dead.push(entry);
  }
  if (allOk) report.ok++;
}
fs.writeFileSync(path.join(__dirname, '..', 'defs.json'), JSON.stringify([...defs.keys()].sort()));
fs.writeFileSync(path.join(__dirname, '..', 'handlers.json'), JSON.stringify(handlers.map(h => ({ w: h.file + ':' + h.line, ev: h.ev, code: (h.code || '').slice(0, 300) })), null, 1));
console.log(JSON.stringify(report, null, 1));

// Repli regex pour les gestionnaires coupés par concaténation
const KW = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'typeof', 'catch', 'new', 'try']);
const regexDead = [];
for (const h of report.parseErr) {
  const c = h.code.replace(/\\'/g, "'");
  const re = /(^|[^.\w$])(window\.)?([A-Za-z_$][\w$]*)\s*\(/g; let m;
  const guardRe = /typeof\s+(?:window\.)?([A-Za-z_$][\w$]*)|window\.([A-Za-z_$][\w$]*)\s*&&|\b([A-Za-z_$][\w$]*)\s*&&/g; const g = new Set(); let gm;
  while ((gm = guardRe.exec(c))) g.add(gm[1] || gm[2] || gm[3]);
  while ((m = re.exec(c))) {
    const nm = m[3];
    if (KW.has(nm) || BUILTIN.has(nm) || defs.has(nm)) continue;
    regexDead.push({ where: h.file + ':' + h.line, name: nm, guarded: g.has(nm), implicit: implicit.get(nm) || null, code: c.slice(0, 140) });
  }
}
fs.writeFileSync(path.join(__dirname, '..', 'regexdead.json'), JSON.stringify(regexDead, null, 1));
