# REPRISE go n° 62 — « Inverser » (07 manuInvert)
Rams 15/11 05:09 « Go n⁰62 ». Branche `travail/n62`, base `2361fbb` (`20261115c`).

## Fait
- [x] Démarrage : pont `etat` 15/11 ~05:10 (app `20261115c`, EV 11 positions `_voix`, MANU) ; Sentry : seule « Sentry branché » ; `banc-all` LIVRABLE sur le dépôt brut.

## À faire
- [x] Lire 07 manuInvert, 02 openPosition (emprunt levier de paire avant contrôle), closePosition (argent rendu)
- [x] Correction (07 : _invAvec, _invEmprunt, _invPasse, _invChoix, _invApres, _invPlan, _invQuestion, manuInvert)
- [x] banc-n62.js 11/11 (8 échouent sur 2361fbb), `python3 -I rejeu/mutations_n62.py .` 28/28 ; bancs d'avant par banc-fixtures/sans-n62.js
- [ ] sonde vraie page : `node rejeu/sonde_n62.js --root . --avant /tmp/aura-avant --backup rejeu/backups/pont/aura_guardian_full_20261115-052010.json` (copie d'avant : `git worktree add /tmp/aura-avant 2361fbb`)
- [ ] relecture adverse (agent séparé)
- [ ] Livraison : ETAT, PASSATION, token, un commit sur main, DOC_V raw + Pages

## Données
- Backups du pont : `rejeu/backups/pont/` (ignoré par git) — `node rejeu/pont.js backup`.
