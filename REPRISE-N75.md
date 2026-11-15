# REPRISE — go n° 75 (Rams, 15/11/2026 01:35 « Go n⁰75 »)
Mission : registre n° 75 — 02 `_tradingCapitalBase` retranche TOUTE la dette (part « exposition » comprise) → argent propre sous-estimé ; lu par la réserve et l'emprunt du levier. ETAT § 4 : « porte d'abord ».
Base : main `40742a4` (token 20261115a). Branche `travail/n75`.

## Étapes
- [x] Démarrage : pont etat (15/11 00:35 UTC, doc 20261115a, EV 12 positions), Sentry (seule « Sentry branché »), banc-all brut LIVRABLE
- [x] Lecteurs de `_tradingCapitalBase` : 02 initLeverageReserve, syncLeverageReserve, applyAutoLeverageBorrow, setLeverageByBot P6, ensureLeverageCoverForTrade, borrowLeverage (cap10), applyBotSuggestion ; 07 manuInvert, barre capital ; 09b2 / 02 one-shots morts. Décision : réserve → estimateStakes, 09c (bonus, repli, validateTotalExposure, anticipation), JIT
- [x] Données : 20 backups Drive + pont 15/11 01:41 (rejeu/backups/n75, rejeu/backups/pont)
- [x] Porte `rejeu/porte_n75.js` : règles lignes 1–36 écrites AVANT toute mesure, sha-256 `960fae708a0a3f23df11e82f44a011dc70db7fba77a692ac969a501fd60089dc` (15/11 00:40:44 UTC)
- [x] Mesure, verdict : NON PROUVÉ (M0 0/63, M1 0/6384, M2 0 s E>0 ; M2 « DIFFÉRENT » = bruit, hors règles) → correction retirée
- [x] Si ENTRE : sans objet
- [ ] ETAT, PASSATION, banc-all, commit unique sur main, push, DOC_V raw + Pages

## Données
- D2 Drive (dossier 1K-UU4LyU-tZ0XMCNU9xZptKWRiJV8xa1) → rejeu/backups/n75/ : 20261115-012901, 20261114-222804, 20261113-222247, 20261112-224331, 20261111-155225, 20261110-214859, 20261108-210050, 20261107-205835, 20261105-182646, 20261030-013131, 20261029-223131, 20261028-060435, 20261027-210236, 20261026-231837, 20261021-034540, 20261020-214342, 20261019-215033, 20261018-231602, 20261017-230838, + 20261020-035156
- D1 : node rejeu/pont.js backup → rejeu/backups/pont/
