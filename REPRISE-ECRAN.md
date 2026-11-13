# REPRISE — go écran (13/11/2026) — n° 82–85, affichage seul
Base : main f6c3920 (token 20261112b). Backup : Drive `aura_guardian_full_20261113-192213.json` (id 1Rn7Ffn6Rr2nM0DA9BRa4WAvw58lXbMKa).
## Constats (code)
- 82 : 03:1108 arrondit à l'entier si dec < 4 ; 11:247 pousseur 3×/s cherche `mc_px_DOT/USDT` (id réel `mc_px_DOT_USDT`) → n'écrit rien.
- 83 : 07 ~4973 LIBRE local = caisse + trading − engagé (le trading est déjà débité à l'ouverture, 02:6241) → engagé retiré 2 fois. 09j getCapitalSummary().free a la même formule MAIS est lu par 02 applyBotSuggestion (mise manuelle) et 03:562 suggestStake → NE PAS toucher (argent), au registre.
- 84 : 06:1357 `pct < -3 && !last || écoulé > 10 min` → toast toutes les 10 min.
- 85 : `--t4`, `--mag` non définies (01-base.css :root) ; capStaked en en-US à côté de fmt$2 (07) ; textes < 8 px.
## Étapes
- [ ] 1. Code + banc `banc-ecran.js` (échoue sur f6c3920)
- [ ] 2. Sonde vraie page 800×1280 avec le backup, captures ; relecture adverse
- [ ] 3. ETAT, PASSATION, token 20261113a, banc-all LIVRABLE, squash main, push, DOC_V raw + Pages
