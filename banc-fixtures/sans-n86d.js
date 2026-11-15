// banc-fixtures/sans-n86d.js — [GO N° 86D · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 86d (les champs de saisie TP / SL : 03 _adjPropPct
// et la proposition de updatePairAnalysisPanels, 08 setTpSl reçoivent 02 pxIn ; avant : toFixed(dec ≥ 4 ? dec : 2)).
// n86d-retours.json : généré par `python3 -I rejeu/retours_gen.py c52acfa …`, vérifié par l'outil (redonne le fichier d'avant au caractère près ;
// banc-n86d.js, test F, le revérifie). Les bancs qui épinglent le TEXTE de 03 ou de 08 lisent la source par ici, EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n86d-retours.json');
module.exports = function sansN86d(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
