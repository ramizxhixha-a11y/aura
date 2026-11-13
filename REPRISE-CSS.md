# REPRISE — GO CSS (Rams 13/11 21:55 « Go css » ; maquette de l'accueil validée « Ok » 22:23) — branche travail/css

Mission : écran par écran, maquette avant le code. Écran 1 = ACCUEIL (#page0) en 6 zones. Token de livraison `20261113b`.
Maquette, mesures et sources de la maquette : doc projet `claude/REPRISE-CSS-ACCUEIL-20261113.md`.
Backup : Drive `aura_guardian_full_20261113-192213.json` → `rejeu/backups/` (hors dépôt).

## Étapes
- [x] banc-all brut sur 81ede33 : LIVRABLE
- [x] HTML : #page0 réécrit en zones (script /home/claude/css-work/build_html.py, repères ligne par ligne) — 158 id gardés, 0 doublon
- [x] css/28-accueil-zones.css (chargé en dernier) ; 09i _accFold / _accRestoreFolds / _accGo ; token 20261113b ; bancs ?v= 89 → 90
- [x] banc-css.js 7/7 (6 en échec sur 81ede33, G passe)
- [x] rejeu/sonde_css.js 15/15 (a trouvé : Brain 0 × 0 px à l'ouverture — taille figée en style par 03 initBrainNodes → 09i efface le style ; corrigé, banc Z6 le couvre)
  commande : node rejeu/sonde_css.js --root . --avant /tmp/aura-avant --backup rejeu/backups/aura_guardian_full_20261113-192213.json --out <d>  (/tmp/aura-avant = git archive 81ede33)
- [x] relecture adverse : BLOQUANT au 1er passage (6 bancs, plancher urgences / onglets) + 7 mineurs → tout corrigé ; sonde 18/18 tout révélé
- [x] ETAT (19 987 o) + PASSATION rédigées — VERDICT_RELECTURE à remplir dans la section GO CSS
- [ ] ETAT + PASSATION, banc-all LIVRABLE, squash sur main sans cette note, push, DOC_V raw + Pages
