// banc-fixtures/sans-n105.js — [GO N° 105 · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 105 (08 _schoolBoundsFromReal, les bornes de l'école
// reposées au chargement depuis le dernier prix réel gardé ; son appel dans 09b2 loadState).
// n105-retours.json : généré par `python3 -I rejeu/retours_gen.py cb896e0 …`, vérifié par l'outil (redonne le fichier d'avant au caractère près ;
// banc-n105.js, test F, le revérifie). Les bancs qui épinglent le TEXTE de 08 ou de 09b2 lisent la source par ici, EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n105-retours.json');
module.exports = function sansN105(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
