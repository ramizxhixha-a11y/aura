# REPRISE go n° 63 — journal anti-négatif (09b2 _auraRotatePurge)
Rams 15/11 10:36 « Go n63 ». Branche `travail/n63`, base `c730c1b` (`20261115d`). Jeton de livraison : `20261115e`.

## Fait
- [x] Démarrage : pont `etat` 15/11 ~10:40 (app `20261115d` depuis 10:26, EV 11 positions `_voix`) ; Sentry : seule « Sentry branché » ; `banc-all` LIVRABLE sur le dépôt brut.
- [x] Code : écrivains de `antiNegReserveLog` = 02:5044, 02:5062, 02:7713 (tous `unshift`, tête = le plus récent) ; purge 09b2:1155 `cutEnd(…, 50)` garde la QUEUE = les 50 plus anciens.

## À faire
- [x] Backup du jour par le pont : `rejeu/backups/pont/aura_guardian_full_20261115-103934.json` — AA 50 lignes 13/09 01:58→17:06 ; EV 50 lignes 12/09 17:13→15/09 17:55 ; RE 11 lignes 01/07→15/08 ; tête = la plus récente partout
- [x] Correction 09b2:1155 (garder la tête, comme fiscalReserveLog 09b2:1143) ; banc-verite-donnees S5 suit (épinglait cutEnd)
- [x] banc-n63.js 6/6 (6 échouent sur c730c1b : `git worktree add /tmp/aura-avant c730c1b`), `python3 -I rejeu/mutations_n63.py .` 13/13
- [x] sonde vraie page `node rejeu/sonde_n63.js --root . --avant /tmp/aura-avant --backup rejeu/backups/pont/aura_guardian_full_20261115-103934.json` 7/7
- [x] ETAT, PASSATION, jeton 20261115e (HTML 97 + 3 bancs) ; banc-all LIVRABLE
- [ ] Livraison : un commit sur main (squash sans cette note), DOC_V raw + Pages

## Données
- Backups du pont : `rejeu/backups/pont/` (ignoré par git).
