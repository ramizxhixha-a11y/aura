# REPRISE — go n° 106 (Rams 15/11 19:05 « Go 106 ») — base 15eb7af (`20261115i`)
Défaut (ETAT § 3, G2) : AA lancée sans réseau → `cfg.vol` des paires du code (02 PAIRS) et des candidats (09b2:799) = constante du code, pas sauvée. Suite de go n° 105 (bornes : 08 `_schoolBoundsFromReal`).
## Étapes
- [x] 1. Branche + note
- [x] 2. Lire : 08:2745 (_simCandleStep), 02:270 (PAIRS), 09b2:799 (candidats), 02 recalage de vol au 1er prix réel, 08 _schoolBoundsFromReal
- [x] 3. Remède + banc-n106.js (vm, échoue sur 15eb7af) + rejeu/mutations_n106.py
- [ ] 4. rejeu/sonde_n106.js --root . --avant <copie 15eb7af> --backup <backup du jour> (réseau coupé, AA 45 s)
- [ ] 5. ETAT, PASSATION, banc-all, 1 commit sur main, push, DOC_V raw + Pages
## Données
- Backup : rejeu/backups/pont/ (via `node rejeu/pont.js backup`)
## Fait (étape 2–3 en cours)
- 08 `_schoolVolFromReal` (après `_schoolBoundsFromReal`) + appel 09b2 loadState juste après les bornes. Règle : vol = |k.c − o(24 h avant, même série, la plus fraîche)| / o × k.c / 9,8 (02).
- Jeton 20261115j (HTML 97, banc-degel / -horloge-mode / -marche-repare) ; `banc-fixtures/sans-n106.js` + `n106-retours.json` (base 15eb7af) ; chaînés dans affichage-3, n101 G, n105 F, n62, n63, n86d.
- Vérifié contre data-api.binance.vision (1 h) : ADA −1,67 %, DOT −2,92 %, EUR −0,12 % ; le pnl24h sauvé n'est PAS fiable (ADA +2,12).
- Reste : banc-n106.js, mutations, sonde (backup rejeu/backups/pont/aura_guardian_full_20261115-190644.json, à re-télécharger par `node rejeu/pont.js backup` si conteneur neuf), ETAT, PASSATION.
- banc-n106 9/9 (7 échouent sur 15eb7af : copie /home/claude/avant-n106 = git archive 15eb7af), mutations 20/20.
