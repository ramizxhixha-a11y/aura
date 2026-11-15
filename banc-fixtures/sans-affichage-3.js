// banc-fixtures/sans-affichage-3.js — [GO AFFICHAGE 3 · 15/11/2026] retire d'un fichier js/ EXACTEMENT les retouches de go affichage 3 (affichage seul : prix par
// 02 pxTxt — n° 86b, 86c ; voix dans l'historique fiscal — 88b ; badges de série — 67b ; sauvegarde auto dans l'app Android — 68b ; tuiles « Funding payé » — 77b ;
// matrice de corrélation — 93 ; résultat des paliers dans les rapports — 64).
// affichage-3-retours.json : chaque bloc nouveau → le bloc d'avant, avec son contexte ; généré par `python3 -I rejeu/retours_gen.py ba8be3a …` et vérifié par
// l'outil : appliqué au fichier de la livraison, il redonne le fichier d'avant au caractère près (banc-affichage-3.js, test F, le revérifie à chaque passe).
// Les bancs qui épinglent le TEXTE des ouvreurs ou de la décision (banc-reglages, banc-talent-registre, banc-levier, banc-alertes-2, banc-n61, banc-n99,
// banc-net-expectancy, banc-css-finitions) lisent la source par ici : leurs empreintes d'avant restent la preuve que RIEN D'AUTRE n'a bougé.
// À composer EN PREMIER (les retouches les plus récentes d'abord) : sansTR(sansN61(sansN99(sansA3(src, f), f), f), f).
// Un bloc absent (fichier d'un autre commit, BANC_ROOT) est laissé tel quel.
'use strict';
const R = require('./affichage-3-retours.json');
module.exports = function sansAffichage3(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
