# REPRISE — go n° 86d (15/11/2026, conversation « Gn 86d »)

Mission : ETAT n° 86d — champs de saisie d'un prix (TP / SL) arrondis aux décimales d'avant (2 sous dec 4) :
03 `_adjPropPct` + proposition de `updatePairAnalysisPanels` (pinput_tp_ / pinput_sl_), 08 `setTpSl` (peTpInput / peSlInput).
Remède : ces champs reçoivent 02 `pxIn(pair, prix)` (mêmes décimales que pxTxt, point décimal).

Base : `main` c52acfa (token 20261115f), banc-all LIVRABLE sur le brut (0 échec, 2 avertissements connus).
Données : backup du pont rejeu/backups/pont/aura_guardian_full_20261115-111819.json (15/11 11:18, non commité — rejeu/backups/ ignoré par git ;
à redemander par `node rejeu/pont.js backup` si la session est neuve).

## Étapes
- [x] Démarrage : ETAT lu, pont `etat` (app en 20261115e puis 20261115f), Sentry (seule « Sentry branché »), banc-all LIVRABLE
- [ ] Remède 03 + 08
- [ ] banc-n86d.js (échoue sur c52acfa), fixtures sans-n86d.js + n86d-retours.json (rejeu/retours_gen.py c52acfa …)
- [ ] bancs qui épinglent 03 / 08 : composer sans-n86d en premier
- [ ] mutations rejeu/mutations_n86d.py
- [ ] sonde vraie page rejeu/sonde_n86d.js (--avant copie de c52acfa, --backup ci-dessus)
- [ ] ETAT, PASSATION, DOC_V → 20261115g, banc-all, squash sur main, push, DOC_V raw + Pages
