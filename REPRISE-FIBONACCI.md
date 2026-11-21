# REPRISE — go fibonacci (21/11/2026, Rams 08:01 « Go Fibonacci »)
Branche `travail/fibonacci`. Reprendre par « reprends go fibonacci » : `git checkout travail/fibonacci`, lire cette note.

## Règles figées
`rejeu/porte_fibonacci.py` lignes 1–56, SHA-256 `ee4609b335f04ea41d40621b1aefb498a1870feda1ac9a19db42db7484602c5a`, figées 21/11/2026 07:08:43 UTC, AVANT toute donnée.

## Étapes
- [x] Démarrage : ETAT lu, pont 07:46 (app 20261120b, EV 0 position / 388 trades), Sentry rien de neuf, banc-all brut : P22 de banc-pont-direct intermittent connu (2 passes sur 4)
- [x] Règles figées + commit
- [x] Code de la porte, essayé sur données synthétiques (marche aléatoire : brut ≈ 0, net ≈ −0,26 % ; T1 ✓ T2 ✓) + cas à la main
- [x] Données (937 archives, 152 absentes avant cotation) : `sh rejeu/sessions_get.sh /home/claude/d5m 2018-07 2026-09` (hors dépôt)
- [x] Passage (37 s) : PORTE FAUSSE — T2 raté (z_B 2,30 ≥ 1,645) ; T1 ✓ (z A 20,2, z B 57,5). AUCUNE des 33 variantes ne passe A (meilleur z A 1,34 : 4 h / 55 simple, seuils 2,84 / 2,91) → rien ne peut entrer. Diagnostic hors règles (`/home/claude/diag_t2.py`) : T2 sur 20 autres graines, z_B moyenne −0,01, écart-type 0,96, 5 % ≥ 1,645 → malchance de la graine, test B sain.
- [ ] Livraison : lecture affichée sans vote (fiche de la paire) — EN COURS (ENTRE → bot qui vote ; sinon lecture affichée sans vote)
- [ ] Relecture, ETAT, PASSATION, banc-all, un commit sur main, DOC_V
