// banc-fixtures/sans-n99.js — [GO N° 99 · 15/11/2026] retire d'un fichier js/ EXACTEMENT les retouches de go n° 99 (levier de paire dit : 02 _pairLevShortWhy,
// _levTxt, openPosition ; 07 badge et frais de la carte de paire ; 10e _openManTrade journal ; 10h champ « Levier × » de la fiche MAN).
// n99-retours.json : chaque bloc nouveau → le bloc d'avant, avec son contexte ; généré par difflib contre le commit 733674d et vérifié : appliqué au
// fichier de la livraison, il redonne le fichier d'avant au caractère près (banc-n99.js, test F, le revérifie à chaque passe).
// Les bancs qui épinglent le TEXTE des ouvreurs (banc-reglages, banc-talent-registre, banc-levier, banc-alertes-2 ; banc-n61 test F) lisent la source par ici :
// leurs empreintes d'avant restent la preuve que RIEN D'AUTRE n'a bougé ; ce qui a bougé est éprouvé par banc-n99.js.
// À composer AVANT sans-n61 (les retouches les plus récentes d'abord) : sansTR(sansN61(sansN99(src, f), f), f).
// Un bloc absent (fichier d'un autre commit, BANC_ROOT) est laissé tel quel.
'use strict';
const R = require('./n99-retours.json');
module.exports = function sansN99(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
