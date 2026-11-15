// banc-fixtures/sans-n103.js — [GO N° 103 · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 103 (02 closePosition : le montant emprunté
// du toast « Fermé … ⚡$… » arrondi au cent ; avant : le nombre brut, « ⚡$39.99999999999999 »). Affichage seul.
// n103-retours.json : généré par `python3 -I rejeu/retours_gen.py c730c1b …`, vérifié par l'outil (redonne le fichier d'avant au caractère près ;
// banc-n103.js, test F, le revérifie). Les bancs qui épinglent le TEXTE de 02 lisent la source par ici, EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n103-retours.json');
module.exports = function sansN103(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
