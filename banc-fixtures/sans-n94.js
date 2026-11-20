// banc-fixtures/sans-n94.js — [GO N° 94 · 20/11/2026] retire d'un fichier js/ EXACTEMENT la retouche de go n° 94 (08 : selectPair refuse une paire hors PAIRS ;
// 11 : _activePairKeepLive, son appel dans removePair et dans _replayPairChanges, le mot « à l'écran » du journal du retrait).
// n94-retours.json : généré par `python3 -I rejeu/retours_gen.py 121562e banc-fixtures/n94-retours.json js/08-learning-history-render.js js/11-gestion-paires.js`,
// vérifié par l'outil (redonne le fichier d'avant au caractère près ; banc-n94.js le revérifie). Les bancs qui épinglent le TEXTE de 08 ou 11 le lisent par ici,
// EN PREMIER (la retouche la plus récente d'abord).
'use strict';
const R = require('./n94-retours.json');
module.exports = function sansN94(src, file) {
  (R[file] || []).forEach(([n, o]) => { if (src.split(n).length === 2) src = src.replace(n, () => o); });
  return src;
};
