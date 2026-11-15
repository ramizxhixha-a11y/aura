// banc-fixtures/sans-n106.js — [GO N° 106 · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 106 (08 _schoolVolFromReal, l'amplitude de l'école
// reposée au chargement depuis les bougies réelles gardées ; son appel dans 09b2 loadState).
// n106-retours.json : généré par `python3 -I rejeu/retours_gen.py 15eb7af …`, vérifié par l'outil (redonne le fichier d'avant au caractère près ;
// banc-n106.js, test F, le revérifie). Les bancs qui épinglent le TEXTE de 08 ou de 09b2 lisent la source par ici, EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n106-retours.json');
module.exports = function sansN106(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
