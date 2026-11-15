// banc-fixtures/sans-n80.js — [GO N° 80 · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 80 (15b sync (b) : une liquidation de la poche
// ferme la position EV au prix de la liquidation, pos._forcedExitPx ; en-tête du module).
// n80-retours.json : généré par `python3 -I rejeu/retours_gen.py 85e18ca …`, vérifié par l'outil (redonne le fichier d'avant au caractère près ;
// banc-n80.js, test N8, le revérifie). Les bancs qui épinglent le TEXTE de 15b lisent la source par ici, EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n80-retours.json');
module.exports = function sansN80(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
