// banc-fixtures/sans-n101.js — [GO N° 101 · 15/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 101 (10h : section « ⚡ Levier de la paire » de la fiche MAN,
// _manPairLevParts / _manPairLevHtml / _manPairLevSync / _manPairLev, et la mise à jour de _manRefreshTick).
// n101-retours.json : généré par `python3 -I rejeu/retours_gen.py 733ed6a banc-fixtures/n101-retours.json js/10h-pont-fullpower-bricks.js`, vérifié par l'outil
// (redonne le fichier d'avant au caractère près ; banc-n101.js, test F, le revérifie). Les bancs qui épinglent le TEXTE de 10h le lisent par ici, EN PREMIER.
'use strict';
const R = require('./n101-retours.json');
module.exports = function sansN101(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
