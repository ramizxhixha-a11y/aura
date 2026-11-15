// banc-fixtures/sans-n62.js — [GO N° 62 · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 62 (07 : « ↓ Inverser » — le plan avant la
// fermeture, la question, le levier exact ; _invAvec, _invEmprunt, _invPasse, _invChoix, _invApres, _invPlan, _invQuestion, manuInvert).
// n62-retours.json : chaque bloc nouveau → le bloc d'avant, avec son contexte ; généré par `python3 -I rejeu/retours_gen.py 2361fbb …` et vérifié par
// l'outil : appliqué au fichier de la livraison, il redonne le fichier d'avant au caractère près (banc-n62.js, test F, le revérifie à chaque passe).
// Les bancs qui épinglent le TEXTE de 07 ou font tourner l'ANCIEN manuInvert (banc-consignes, banc-levier, banc-nettoyage-argent, banc-n61, banc-n99…)
// lisent la source par ici : leurs empreintes et leurs essais d'avant restent la preuve que RIEN D'AUTRE n'a bougé ; banc-n62 prouve le nouveau.
// À composer EN PREMIER (les retouches les plus récentes d'abord) : sansA3(sansN62(src, f), f)…
// Un bloc absent (fichier d'un autre commit, BANC_ROOT) est laissé tel quel.
'use strict';
const R = require('./n62-retours.json');
module.exports = function sansN62(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
