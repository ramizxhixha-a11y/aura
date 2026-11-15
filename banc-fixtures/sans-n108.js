// banc-fixtures/sans-n108.js — [GO N° 108 · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 108 (15b : la liquidation propre de l'EV
// relue sur les bougies 1 h des heures de sommeil — en-tête, constantes, liqHist / liqCheck, bloc (c0), appel liqCheck, export).
// n108-retours.json : généré par `python3 -I rejeu/retours_gen.py e09d72a …`, vérifié par l'outil (redonne le fichier d'avant au caractère près ;
// banc-n108.js, test L13, le revérifie). Les bancs qui épinglent le TEXTE de 15b lisent la source par ici, EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n108-retours.json');
module.exports = function sansN108(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
