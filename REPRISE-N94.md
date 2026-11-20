# REPRISE go n° 94 — branche `travail/n94` (20/11/2026, départ sur `121562e`, token `20261120a`)

Défaut (ETAT § 3, G2, S) : `removePair` (js/11:122) laisse `S.activePair` sur la paire retirée → `ACFG()` (02:744) = undefined →
08 `renderMarket` (`cfg.color`, 08:120) et 02 `drawMobileChart` lèvent à chaque battement de l'écran Marché ; `renderAll` s'arrête à renderMarket.

Constats (*code*) :
- `S.activePair` n'est PAS sauvé (absent de 09b1 et de `_APPLYSNAP_MANIFEST`) : au lancement il vaut `'BTC/USDT'` (02:559), puis 11 `_replayPairChanges`
  retire les paires de `S.removedPairs` → même panne si BTC/USDT est retirée.
- 03 `drawMiniCharts` ne retire jamais la carte d'une paire retirée ; son appui appelle 08 `selectPair(pair)` → remet la paire retirée à l'écran.
- Lecteurs de `S.activePair` : 02 drawMobileChart · 08 renderMarket, selectPair, renderTechnical / renderFundamental · 03 resonance, debate, swarm,
  runRosterAnalysis · 04 forceTrade (ouvre sur la paire à l'écran).

## Étapes
- [x] Démarrage : pont (app 20261120a, 60 scripts, relance 20/11 22:15), Sentry (rien de neuf), banc-all LIVRABLE sur le brut
- [x] Correction : 11 `_activePairKeepLive` (removePair + _replayPairChanges) ; 08 selectPair refuse une paire hors PAIRS
- [x] banc-n94.js (vm, témoin `--temoin` sur le code d'avant) + mutations_n94.py
- [x] sonde_n94.js (Chromium, vraie page, backup du pont, avant / après)
- [x] Relecture : par la session seule (registre n° 110 : carte restée)
- [x] ETAT, PASSATION, jeton 20261120b · [ ] banc-all, squash sur main, push, DOC_V raw + Pages

## Commandes
- `node rejeu/pont.js etat` · `node rejeu/pont.js backup` (backup du jour → rejeu/backups/pont/)
- Copie d'avant : `git worktree add /home/claude/avant-n94 121562e` (ou `git archive 121562e | tar -x -C /home/claude/avant-n94`)
