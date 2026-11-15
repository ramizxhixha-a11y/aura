// banc-fixtures/px-vm.js — [GO AFFICHAGE 3 · 15/11/2026] pose dans la vm d'un banc les aides d'AFFICHAGE de 02 que go affichage 3 fait lire à d'autres modules :
// pxTxt / pxIn (le texte d'un prix — n° 86b, 86c : journal d'ouverture, pyramide, paliers, calculateur, alertes de prix, figures…), _isCloseRow et _closeRowUsd
// (le résultat d'une fermeture avec ses parts fermées par paliers — n° 64 : rapports, résumé de la semaine). Le VRAI texte de 02 (lu sous la racine du banc),
// jamais une copie. Une aide déjà présente dans la vm est laissée telle quelle ; une aide absente du 02 lu (code d'avant, BANC_ROOT) n'est pas posée.
//   require('./banc-fixtures/px-vm.js')(ctx, ROOT)      (après vm.createContext(ctx))
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
function fnText(src, name) {
  const m = new RegExp('(^|\\n)function ' + name.replace(/\$/g, '\\$') + '\\s*\\(').exec(src); if (!m) return null;
  const start = m.index + m[1].length; let depth = 0;
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}
module.exports = function pxVm(ctx, root) {
  const s02 = fs.readFileSync(path.join(root, 'js/02-state-init.js'), 'utf8');
  if (!ctx.Intl) ctx.Intl = Intl;
  const has = n => vm.runInContext('typeof ' + n, ctx) !== 'undefined';
  const out = [];
  if (!has('pxTxt') && !has('_pxFmt')) out.push('var _pxFmt = {};');
  ['pxTxt', 'pxIn', '_isCloseRow', '_closeRowUsd'].forEach(n => { if (!has(n)) { const t = fnText(s02, n); if (t) out.push(t); } });
  if (out.length) vm.runInContext(out.join('\n'), ctx, { filename: 'js/02-state-init.js (aides d\'affichage)' });
  return ctx;
};
