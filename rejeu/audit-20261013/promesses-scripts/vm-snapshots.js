// Preuve vm : le bouton Réglages « 📸 Voir et restaurer (1 tap) » exécute
// `openSnapshotsModal();closeSettingsModal();` — on exécute le VRAI texte de
// openSnapshotsModal (09g) dans un contexte qui contient toutes les définitions
// globales du code chargé SAUF celles qui n'existent pas.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = process.argv[2];
const src = fs.readFileSync(path.join(ROOT, 'js/09g-modals.js'), 'utf8');
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name + '\\s*\\(');
  const m = re.exec(src); if (!m) throw new Error('absent ' + name);
  const start = m.index + m[1].length, st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return src.slice(start, i + 1); }
  }
}
const appended = [];
let settingsClosed = false;
const ctx = {
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {} }),
    body: { appendChild: (n) => appended.push(n) },
  },
  closeSettingsModal: () => { settingsClosed = true; },
  console,
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fnSrc(src, 'openSnapshotsModal'), ctx);
// Le gestionnaire exact du bouton (04:1582)
const handler = 'openSnapshotsModal();closeSettingsModal();';
try { vm.runInContext(handler, ctx); console.log('OK sans erreur'); }
catch (e) { console.log('EXCEPTION :', e.name, '-', e.message); }
console.log('modal ajoutée au DOM :', appended.length, '· réglages fermés :', settingsClosed);
