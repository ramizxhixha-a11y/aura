// banc-fixtures/sans-n109.js — [GO N° 109 · 20/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 109 (03 : la note prouvée — en-tête,
// _fitProven, _fitOf, _vjE(id, W, prouve), _fitHz, export).
// n109-retours.json : généré par `python3 -I rejeu/retours_gen.py e84e8ae banc-fixtures/n109-retours.json js/03-per-pair-position-buttons-controls-buid.js`,
// vérifié par l'outil (redonne le fichier d'avant au caractère près ; banc-n109.js le revérifie). Les bancs qui épinglent le TEXTE de 03 le lisent par ici,
// EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n109-retours.json');
module.exports = function sansN109(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
