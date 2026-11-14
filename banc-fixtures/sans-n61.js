// banc-fixtures/sans-n61.js — [GO N° 61 · 15/11/2026] retire d'un fichier js/ EXACTEMENT les retouches de go n° 61 (ouvertures manuelles,
// suggestions manuelles : 02 openPosition, 03 _openProposedPosition, 07 manuInvert, 09j getCapitalSummary + validateManualExposure).
// n61-retours.json : chaque bloc nouveau → le bloc d'avant, avec son contexte ; généré par difflib contre le commit 918ae59 et vérifié : appliqué au
// fichier de la livraison, il redonne le fichier d'avant au caractère près (banc-n61.js, test F, le revérifie à chaque passe).
// Les bancs qui épinglent le TEXTE des ouvreurs et de l'argent (banc-reglages E2, banc-talent-registre S, banc-alertes-2 G1, banc-ecran G) lisent la
// source par ici : leurs empreintes d'avant restent la preuve que RIEN D'AUTRE n'a bougé ; ce qui a bougé est éprouvé par banc-n61.js.
// À composer AVANT sans-tendance-reelle (les retouches les plus récentes d'abord) : sansTR(sansN61(src, f), f).
// Un bloc absent (fichier d'un autre commit, BANC_ROOT) est laissé tel quel.
'use strict';
const R = require('./n61-retours.json');
module.exports = function sansN61(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
