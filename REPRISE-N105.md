# REPRISE go n° 105 (15/11/2026, « Go 105 ») — branche `travail/n105`

Défaut (ETAT n° 105) : AA lancée sans réseau → avant le 1er prix réel, 08 `_simCandleStep` borne le prix de l'école à `cfg.minP / cfg.maxP`,
qui sont les CONSTANTES du code (02 PAIRS, candidats de 09b2:800) : DOT minP 3 (réel 0,734), AVAX minP 8 (réel 7,217), ADA minP 0,15 (réel 0,1547).
02 pose pourtant ces bornes à chaque prix réel (`realPrice × 0,65 / × 1,55`, 02:1045 Binance, 02:3920 CoinGecko) — perdues au rechargement.

Remède choisi : au chargement (fin de 09b2 loadState), tant qu'aucun prix réel n'est arrivé (`_pricesFetched` faux), les bornes de chaque paire
repartent de son DERNIER prix réel gardé (`S.realCandles`, dernière bougie la plus récente), même règle que 02. Fonction 08 `_schoolBoundsFromReal`.
Aucun format de sauvegarde changé. `cfg.vol` (constante, DOT 0,25 pour 0,73) : HORS mission → registre n° 106.

## Étapes
- [x] démarrage : pont etat 12:09 (20261115g), Sentry (seule « Sentry branché »), banc-all brut LIVRABLE
- [x] backup du pont `rejeu/backups/pont/aura_guardian_full_20261115-121000.json`
- [ ] code 08 + appel 09b2
- [ ] banc-n105.js (vm) — tests qui échouent sur cb896e0
- [ ] mutations rejeu/mutations_n105.py
- [ ] sonde vraie page rejeu/sonde_n105.js (--avant copie de cb896e0)
- [ ] fixtures des bancs qui épinglent 08 / 09b2, jeton 20261115h
- [ ] ETAT, PASSATION, banc-all, un commit sur main, push, DOC_V raw + Pages

Copie d'avant : `git worktree add /home/claude/avant cb896e0` (ou `git archive cb896e0 | tar -x -C /home/claude/avant`).
