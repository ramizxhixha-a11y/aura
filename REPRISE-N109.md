# REPRISE — go n° 109 (Rams, 20/11/2026 21:26 « Go 109 »)

Mission : registre n° 109 (G2) — la note T$ ne prédit pas. Remède du registre (ETAT § 4, 1b) : R1 la fenêtre de jugement n'est armée que si le
conseil pondéré par la fitness est PROUVÉ au-dessus du hasard (borne basse de Wilson à 95 % > 50 %, comme 03 `_botStakeMult`) ; R2 une note
au-dessus de 350 seulement si l'avantage est prouvé (Wilson). Porte d'abord : `rejeu/porte_n109.py` (règles en tête, écrites avant toute mesure).

Code de départ : `main` e84e8ae (token 20261116b). Branche : `travail/n109`.

## Étapes
- [x] Démarrage : pont actif (20/11 21:26, 20261116b, 60 scripts), Sentry : rien de neuf (AURA8-APP-5 seul), banc-all brut LIVRABLE.
- [x] Backup du jour (pont) : `rejeu/backups/pont/aura_guardian_full_20261120-212812.json` (hors dépôt ; `node rejeu/pont.js backup` pour un neuf).
- [x] Règles de la porte écrites (en-tête de `rejeu/porte_n109.py`, lignes 1–48) AVANT toute donnée D2 : sha-256 `f17df08298014eb0c406cb6dfec07284cbee77c998ed49d33b28b3ac46de8de0`, 20/11 20:35:31 UTC (`head -48 rejeu/porte_n109.py | sha256sum`).
- [x] D2 (fait, 20/11 ~20:40 UTC, /home/claude/talent, hors dépôt) : `sh rejeu/talent_get.sh /home/claude/talent` → `python3 rejeu/talent_prep.py /home/claude/talent /home/claude/talent/p`
      → `node rejeu/talent.js --data /home/claude/talent/p --out /home/claude/talent/v_a --from 961 --to 35520 --encours 1` et `… v_b --from 35520 --to 70080 --encours 1`.
- [x] Mesures M0–M4 → verdict : **R1 N'ENTRE PAS** (M2 : la fenêtre choisie bat 60 sur la mesure de la règle, +2,7 pts, z = 16,5 sur 177 jours armés ;
      décision commune : 15 min −0,0009 z −0,65 · 1 h −0,0114 z −2,79 · 4 h −0,0110 z −1,69) · **R2 ENTRE** (M3 : la note PRÉDIT le lendemain, Spearman
      W20 +0,104 z 7,41 / W60 +0,082 z 5,97 ; R2 +0,099 z 7,10 / +0,079 z 5,75 ; écart d'aujourd'hui − R2 z 1,60 / 1,11 < 3,2).
      D1 : M0 25/25 T$, règle rejouée identique ; armement vivant NON prouvé (borne 39,6 %). R2 seul (W 20) : 12 T$ changent.
      Commande : `python3 -I rejeu/porte_n109.py --d1 rejeu/backups/pont/aura_guardian_full_20261120-212812.json --data /home/claude/talent/p --votes /home/claude/talent/v_a /home/claude/talent/v_b --out rejeu/out/porte_n109/resultat.json` (~30 s).
- [ ] R2 seul : code 03 (`_fitProven`, `_fitOf`, `_vjE(id, W, prouve)` lu par `_fitHz` seulement ; `_dcMeritHz` et 10i inchangés), banc-n109.js, mutations, sonde vraie page.
- [ ] ETAT, PASSATION, banc-all, un commit sur main, push, DOC_V raw + Pages.

## Notes
