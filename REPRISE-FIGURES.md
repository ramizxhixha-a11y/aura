# REPRISE — GO FIGURES (branche de travail `travail/figures`, jamais livrée telle quelle)

Mission : Rams, 26/10/2026 20:25 (« Corrige les figures », conversation « Go talent ») puis 20:28 (nouvelle conversation).
Les figures de 06 `_detectPatterns` ne lisent que des clôtures (jamais ouverture / haut / bas) ; l'affichage lit des prix de trades ou une série inventée.
But : figures sur les vraies bougies closes (o / h / l / c), à l'écran tout de suite ; dans la décision (08 getTechSignals) SEULEMENT si la porte le dit.

Si une conversation coupe : en ouvrir une neuve, dire « reprends go figures », cloner, `git checkout travail/figures`, lire CE fichier.

## Étapes (cochées au fil de l'eau, chaque étape = un commit poussé sur cette branche)
- [x] 0. Code lu : 06:37 `_detectPatterns(prices)`, 06:19 `_ptPrices` (prix de trades, sinon série sinus + hasard), 08:2071 décision (`_detectPatterns(closes)`).
      Bougies : AA = fabriquées complètes (08 `_simCandleStep`) ; EV / RE = klines Binance, la DERNIÈRE est celle qui se forme (10g:55, 08:3657 `arr[len-2]` = dernière close).
      banc-all sur le dépôt brut (57d1864) : LIVRABLE.
- [ ] 1. Règles de la porte écrites AVANT toute donnée : `rejeu/porte_figures.js` (en-tête figé + sha-256).
- [ ] 2. `_detectCandlePatterns(candles)` dans 06 + affichage sur les vraies bougies ; `banc-figures.js` (échoue sur le code d'avant).
- [ ] 3. Porte : `rejeu/talent.js --figures 1` (voix figures seules) et `--figures-decision 1` (voix de l'app avec les figures corrigées), 2 lectures.
- [ ] 4. Verdict appliqué, relecture adverse, banc-all, ETAT + PASSATION, UN commit sur main (squash), push, DOC_V raw + Pages, branche supprimée.

## Données (hors dépôt, à refaire dans une session neuve)
`sh rejeu/talent_get.sh <D>/raw 2024-10 2026-09` puis `python3 -I rejeu/talent_prep.py <D>/raw <D>/paires`.
