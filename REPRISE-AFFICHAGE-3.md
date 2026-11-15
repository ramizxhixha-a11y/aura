# REPRISE — go affichage 3 (Rams 15/11/2026 04:07 « Go affichage 3 »)

Mission : ETAT § 4 point 2 — les petits restes d'affichage : 86b, 86c, 88b, 67b, 68b, 77b, 93, 64.
Base : `main` à `ba8be3a` (token `20261115b`). Copie d'avant (sonde) : `/tmp/aff3/avant` (refaire : `git archive ba8be3a | tar -x -C <dir>`).
Backup du jour : pont, `rejeu/backups/pont/aura_guardian_full_20261115-041039.json` (refaire : `node rejeu/pont.js backup`).

## Étapes
- [x] Démarrage : pont actif (app en `20261115b`), Sentry : seule « Sentry branché », banc-all LIVRABLE (1re passe : banc-alertes A1 intermittent sous charge, 2e passe LIVRABLE)
- [x] Lecture du code des 8 défauts (voir décisions)
- [ ] Remèdes
- [ ] banc-affichage-3.js + mutations + bancs épinglés (sans-affichage-3)
- [ ] Sonde vraie page avant / après
- [ ] Relecture séparée
- [ ] ETAT, PASSATION, banc-all, un commit sur main, push, DOC_V

## Décisions
- 86b : 02 openPosition `priceTag` et 10f `pt/tt/st` → `pxTxt`. Bancs qui épinglent les ouvreurs : `banc-fixtures/sans-affichage-3.js` composé en premier.
- 86c : textes d'affichage d'un PRIX (pas les champs de saisie, pas les quantités, pas les valeurs stockées) → `pxTxt` ; défaut d'un `prompt` → `pxIn`.
- 88b : 16 `_fiscOnClose` ajoute `v: 1` pour une position de la voix (absent sinon) ; 16b : « 📈 Tendance », raison, CSV.
- 67b : 05 badges de série → plus longue suite de fermetures gagnantes du mode (historique gardé).
- 68b : 09b3 `autoDlDownload` dans l'app Android : pas de lien blob, échec dit (toast + journal + réglages), `last` reste au dernier succès.
- 77b : 07 tuiles « Funding payé » : `S.fees.totalFunding` seul (contient déjà les intérêts du levier, 02 applyLeverageBorrowFees).
- 93 : 08 renderCorrMatrix : noms (spécialité `type`) DANS le canvas, numéros sur la diagonale, titre dans le canvas.
- 64 : 02 `_closeRowUsd` (ligne + parts fermées par paliers) ; 05 `_outilsClosedTrades`, 06 `_tgHebdoText` ; 05 closePartial garde le brut `g`.
