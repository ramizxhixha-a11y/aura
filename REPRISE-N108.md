# REPRISE — go n° 108 (15/11/2026, 23:40, « Go 108 »)

Mission : registre n° 108 (G2) — 15b sync (c) : la liquidation PROPRE de l'EV (SHORT, prix ×2 de SON entrée) n'est vue qu'au prix frais ;
la poche (js/15 liqHist) relit les plus hauts 1 h des heures de sommeil, l'EV non → une mèche nocturne au-delà de 2 × l'entrée EV n'est pas comptée.

Départ : `main` = e09d72a (token 20261115l), banc-all LIVRABLE sur le dépôt brut (15/11 23:42). App : 20261115l chargé (pont 15/11 23:4x).
Sentry : seule l'issue « Sentry branché ».

## Étapes
- [x] Démarrage : ETAT, pont etat, Sentry, banc-all
- [x] Remède 15b : relecture des plus hauts 1 h depuis l'heure qui suit l'entrée EV (même règle que js/15 liqHist), 1 fois / h / SHORT ;
      mèche ≥ 2 × entrée → fermée AU PRIX DE LA LIQUIDATION (pos._forcedExitPx, comme go n° 80), pas rouverte avant le lundi qui suit la mèche
- [x] banc-n108.js (15/15, 11 échecs sur e09d72a) (vm) + témoin banc-fixtures/tendance-reelle-avant-n108.js + sans-n108.js / n108-retours.json ; gardes des autres bancs
- [x] mutations (22/22 ; mutations_n80 12/12) rejeu/mutations_n108.py
- [x] sonde vraie page rejeu/sonde_n108.js 7/7 + témoins 2/2 (backup 15/11 23:45 : rejeu/backups/pont/aura_guardian_full_20261115-234506.json)
- [ ] ETAT, PASSATION, token, banc-all, squash sur main, push, DOC_V raw + Pages

## Données
- backup : rejeu/backups/pont/aura_guardian_full_20261115-231303.json
- copie d'avant : /tmp/avant-n108 (git worktree de e09d72a)
