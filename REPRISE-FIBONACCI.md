# REPRISE — go fibonacci (21/11/2026, Rams 08:01 « Go Fibonacci »)
Branche `travail/fibonacci`. Reprendre par « reprends go fibonacci » : `git checkout travail/fibonacci`, lire cette note.

## Règles figées
`rejeu/porte_fibonacci.py` lignes 1–56, SHA-256 `ee4609b335f04ea41d40621b1aefb498a1870feda1ac9a19db42db7484602c5a`, figées 21/11/2026 07:08:43 UTC, AVANT toute donnée.

## Étapes
- [x] Démarrage : ETAT lu, pont 07:46 (app 20261120b, EV 0 position / 388 trades), Sentry rien de neuf, banc-all brut : P22 de banc-pont-direct intermittent connu (2 passes sur 4)
- [x] Règles figées + commit
- [x] Code de la porte, essayé sur données synthétiques (marche aléatoire : brut ≈ 0, net ≈ −0,26 % ; T1 ✓ T2 ✓) + cas à la main
- [x] Données (937 archives, 152 absentes avant cotation) : `sh rejeu/sessions_get.sh /home/claude/d5m 2018-07 2026-09` (hors dépôt)
- [ ] Passage : `python3 -I rejeu/porte_fibonacci.py /home/claude/d5m`
- [ ] Livraison selon verdict (ENTRE → bot qui vote ; sinon lecture affichée sans vote)
- [ ] Relecture, ETAT, PASSATION, banc-all, un commit sur main, DOC_V
