# REPRISE — go n° 80 (15/11/2026 23:03, « Go 80 ») — branche travail/n80, base main 85e18ca (20261115k)

Mission : n° 80 du registre (G2) — 15b sync (b) : une liquidation décidée par la poche (js/15, prix ×2 de SON entrée) ferme la position EV
même si son prix réel a plus de 5 min (15b:144 `if (!liq && !fresh) return;`) → au prix de l'EV (ps.price, périmé), pas au prix de la liquidation.

Remède retenu (convention existante 10f:717 / 10f:739, décision Rams 26/09 « au stop, pas au prix de retour ») :
- liquidation de la poche avec un prix de liquidation connu (h.x1 > 0, = 2 × x0 de la poche) → `pos._forcedExitPx = h.x1`, fermeture tout de suite
  (frais ou pas, EV en pause comprise), `_forcedExitPx` effacé si la fermeture n'aboutit pas ;
- liquidation sans prix connu (ligne d'historique sans x1) → attend un prix frais comme les autres fermetures (jamais au prix sauvegardé).

Étapes :
- [x] 1. ETAT, CLAUDE.md, pont `etat` (20261115k, 0 erreur), Sentry (seule « Sentry branché »), banc-all LIVRABLE avant
- [x] 2. banc-n80.js (vm, vrai 15b + vrai 02 closePosition) : échoue sur l'ancien code
- [x] 3. remède 15b
- [ ] 4. mutations rejeu/mutations_n80.py
- [ ] 5. sonde vraie page rejeu/sonde_n80.js (backup du pont du jour)
- [ ] 6. ETAT, PASSATION, jeton 20261115l, banc-all, un commit sur main, push, DOC_V raw + Pages

Commandes : `node banc-n80.js` · `python3 -I rejeu/mutations_n80.py .` · `node rejeu/sonde_n80.js --root . --avant /tmp/avant-n80 --backup <b>`
Copie d'avant : `git worktree add /tmp/avant-n80 85e18ca` (ou `git archive 85e18ca | tar -x -C /tmp/avant-n80`).
