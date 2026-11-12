// banc-fixtures/sans-tendance-reelle.js — [GO TENDANCE RÉELLE · 12/11/2026] retire d'un fichier js/ EXACTEMENT les retouches de go tendance réelle
// (tendance-reelle-retours.json : chaque bloc nouveau → le bloc d'avant, avec son contexte ; généré par difflib contre le commit dcbd4ad et vérifié :
// appliqué au fichier de la livraison, il redonne le fichier d'avant au caractère près). Les bancs qui épinglent le TEXTE des ouvreurs, des gardes et
// de la fermeture (banc-levier S1, banc-levier-56 D, banc-reglages E2, banc-talent-registre S) lisent la source par ici : leurs empreintes d'avant
// restent la preuve que RIEN D'AUTRE n'a bougé ; ce qui a bougé est éprouvé par banc-tendance-reelle.js (A3 / B3 : sans la marque de la voix,
// openPosition et closePosition écrivent le même état qu'avant, 700 cas ; D1 : 09c ne refuse qu'en EV quand la voix tient l'EV).
// Un bloc absent (fichier d'un autre commit, BANC_ROOT) est laissé tel quel.
'use strict';
const R = require('./tendance-reelle-retours.json');
module.exports = function sansTendanceReelle(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
