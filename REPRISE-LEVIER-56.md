# REPRISE — GO LEVIER 56 (branche `travail/levier-56`, jamais livrée telle quelle)

Mission : Rams, 27/10/2026 18:05 (conversation « go figures ») : « Mon argent plus l'emprunt » = réponse à la question n° 56.
→ RÈGLE : avec le levier, les mises du bot se calculent sur son argent + l'emprunt (= comportement actuel ; 02 `_computePortfolio` NE CHANGE PAS).
Reste de n° 56 : l'AFFICHAGE (registre : « Ensuite seulement : séparer l'affichage (argent à soi) »). Rien de ce que la décision lit ne change.

Si une conversation coupe : conversation neuve, « reprends go levier 56 », cloner, `git checkout travail/levier-56`, lire CE fichier.

## Constat (backup Drive 27/10 18:01 locale, `rejeu/backups/drive/aura_guardian_full_20261027-180158.json`, lecture seule)
- AA : portefeuille 6 697,19 $ dont 6 282,96 $ empruntés (levier ×10, aucune position) → à Rams ≈ 414 $. « Portefeuille Total » (07 renderHomePrices → 02 computePortfolioTotal) les compte sans le dire ; le commentaire 02:5621 « le levier emprunté reste exclu » est FAUX.
- P&L jour / semaine / mois (09d1 `_computePnlByPeriod` : S.portfolio − bases de S.pnlPeriod) : un emprunt compte comme un GAIN (AA : semaine W43 base 1 003,29 → +5 694 $ ; mois base 1 077,06 → +5 620 $). Lus par : 07 hero (4848, 5015), 07 quick (5353), 04 panneau (931) et alertes P&L / Telegram (2297). AUCUN lecteur dans la décision (grep 27/10).
- `_startPortfolio` : lu par le Rescue Bot (03:4962) → NE PAS TOUCHER.

## Étapes
- [ ] 1. `_pnlBasis(w)` (02) = portefeuille − dette du levier versée en argent − frais restés dus ; bases et lecture des périodes dessus (09d1, 10c, 09b2:853, 09j:151, 07:3673).
- [ ] 2. Hero : sous « Portefeuille Total », « dont X $ empruntés » ; tuiles « Dont emprunté » / « À toi » ; commentaire 02:5621 corrigé.
- [ ] 3. `banc-levier-56.js` (échoue sur 6f4cd12) + empreintes des fonctions de décision inchangées.
- [ ] 4. Relecture adverse, banc-all, ETAT (règle § 2, n° 56 fermé / reste au registre), PASSATION, UN commit sur main, push, DOC_V.
