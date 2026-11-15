# REPRISE go n° 62 — « Inverser » (07 manuInvert)
Rams 15/11 05:09 « Go n⁰62 ». Branche `travail/n62`, base `2361fbb` (`20261115c`).

## Fait
- [x] Démarrage : pont `etat` 15/11 ~05:10 (app `20261115c`, EV 11 positions `_voix`, MANU) ; Sentry : seule « Sentry branché » ; `banc-all` LIVRABLE sur le dépôt brut.

## À faire
- [ ] Lire 07 manuInvert, 02 openPosition (emprunt levier de paire avant contrôle), closePosition (argent rendu)
- [ ] Correction : la réouverture calculée AVANT la fermeture, question avec les montants, levier exact, message clair
- [ ] banc-n62.js (échoue sur 2361fbb), mutations, sonde vraie page avec backup du pont
- [ ] Livraison : ETAT, PASSATION, token, un commit sur main, DOC_V raw + Pages

## Données
- Backups du pont : `rejeu/backups/pont/` (ignoré par git) — `node rejeu/pont.js backup`.
