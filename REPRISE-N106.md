# REPRISE — go n° 106 (Rams 15/11 19:05 « Go 106 ») — base 15eb7af (`20261115i`)
Défaut (ETAT § 3, G2) : AA lancée sans réseau → `cfg.vol` des paires du code (02 PAIRS) et des candidats (09b2:799) = constante du code, pas sauvée. Suite de go n° 105 (bornes : 08 `_schoolBoundsFromReal`).
## Étapes
- [x] 1. Branche + note
- [ ] 2. Lire : 08:2745 (_simCandleStep), 02:270 (PAIRS), 09b2:799 (candidats), 02 recalage de vol au 1er prix réel, 08 _schoolBoundsFromReal
- [ ] 3. Remède + banc-n106.js (vm, échoue sur 15eb7af) + rejeu/mutations_n106.py
- [ ] 4. rejeu/sonde_n106.js --root . --avant <copie 15eb7af> --backup <backup du jour> (réseau coupé, AA 45 s)
- [ ] 5. ETAT, PASSATION, banc-all, 1 commit sur main, push, DOC_V raw + Pages
## Données
- Backup : rejeu/backups/pont/ (via `node rejeu/pont.js backup`)
