# REPRISE — GO TENDANCE RÉELLE (branche `travail/tendance-reelle`, jamais livrée telle quelle)

Mission : Rams, 12/11/2026 19:49 : « Go tendances réélle tout » — la voix tendance longue (js/15) joue avec TOUT l'argent de l'EV.
Données : backup Drive `aura_guardian_full_20261112-194304.json` (id 1D1gVCyvbbuTCF5LonbgJwuOtJySvJZzO), hors dépôt.
État au départ (*app*, backup) : EV 1 062,49 $ (trading 1 055,91, caisse 6,58), 375 trades, 0 position, botAutoMode = true (AUTO) ;
poche : 10 SHORT depuis le 19/10 + BTC SHORT 26/10 + PEPE LONG 05/11 ; seuil appris fermé partout (12/11 18:42 UTC). banc-all LIVRABLE au départ.

## Règles choisies (dites à Rams avant le code)
- La poche (js/15) reste le cerveau, inchangée (banc 62/62, porte du 06/10). Module neuf = l'EV SUIT la poche : ouvre / ferme / retourne
  par openPosition / closePosition dans le contexte EV (bascule _bgResolve comme 10f _lossCapSweep).
- Entrée au prix du moment (jamais aux prix d'entrée de la poche : ce serait de l'argent inventé).
- Mise = trading EV ÷ nombre de paires de la voix encore sans position (premier passage : ÷ 11) ; un retournement rouvre avec ce que la
  paire a rendu. Sans levier (pairLeverage ignoré).
- Positions de la voix (`_voix: 'tendance'`) : closePosition les REFUSE sauf { voix } (la voix), { urgence } (Urgence/Bunker),
  { solvabilite } (jamais sous zéro, règle de Rams) et le bouton ✕ de Rams ({ main }). Aucun stop des bots (perte max, trailing, SL/TP bot,
  A13, consignes MAN) ne les touche. Fermeture de la voix = sans juge (comme urgence) : agents / bots / seuil non notés.
- Bots à 15 min : plus aucune ouverture en EV tant que la voix tient l'EV (ils restent dans l'AA). RE inchangé.
- AUTO / MANU (Rams seul) : en MANU la voix ferme mais n'ouvre pas.

## Étapes
- [ ] 1. Code : guard closePosition + openPosition({voix}) + refus 09c en EV + module 15b + boutons ✕ {main} ; banc vm `banc-tendance-reelle.js`
- [ ] 2. Preuve : sonde vraie page sur le backup du 12/11 ; relecture adverse (agent séparé)
- [ ] 3. Livraison : ETAT, PASSATION, token, banc-all LIVRABLE, squash sur main, push, DOC_V raw + Pages
