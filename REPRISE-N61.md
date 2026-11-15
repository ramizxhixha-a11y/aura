# REPRISE — go n° 61 (Rams, 15/11/2026 00:18 « Go n⁰61 ») — branche `travail/n61`

Mission = ETAT § 4, point 1 : n° 61 et n° 87, PARTIES MANUELLES, puis la porte. Base : `main` 918ae59 (token 20261114i).

## Fait
- [x] Démarrage : ETAT lu ; pont `etat` 15/11 00:13 (app en 20261114i, EV 11 positions de la voix, 2 171,22 $) ; Sentry : seule l'issue « Sentry branché » ; banc-all brut BLOQUÉ par `banc-css-chain` C2 (heure : échoue de 00:00 à 02:00) → heure du banc figée à midi (4 fuseaux : 10/10).
- [x] Règles de la porte `rejeu/porte_n61.js` (en-tête figé, sha-256 dans la passation)
- [x] Code : 09j `validateManualExposure` (nouveau) ; 02 openPosition, 03 `_openProposedPosition`, 07 `manuInvert` le lisent ; 09j `getCapitalSummary().free` = caisse + trading
- [x] Banc `banc-n61.js` (vm) + épingles des bancs des ouvreurs ; mutations ; sonde vraie page
- [x] Mesures de la porte + verdict ; relecture adverse
- [x] ETAT, PASSATION, banc-all LIVRABLE ; reste : rapport au projet, squash sur main

## Chemins
- Ouvertures MANUELLES (seules touchées) : 02 openPosition (02:6258), 03 `_openProposedPosition` (03:448), 07 `manuInvert` (07:2519, recherche de la mise), 02 `applyBotSuggestion` (getCapitalSummary().free × 0,3), 03 `suggestStake` (free × 0,25, panneau masqué).
- Chemins du BOT (inchangés au caractère près, épinglés) : 02 estimateStakes (02:4424 phase 5), 09c (09c:677 et 696 validateTotalExposure), 09j validateInvestmentCapProvisioned, validateTotalExposure.
- Outils : `NODE_PATH=/tmp/ac/node_modules node banc-all.js` (acorn : `cd /tmp/ac && npm i acorn`).
