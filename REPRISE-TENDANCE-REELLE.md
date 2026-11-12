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

## Porte POIDS (Rams 12/11 19:56 : « diviser par 11 n'est pas stratège, prendre les plus favorables et les favoriser »)
- `rejeu/porte_poids.py` : règles lignes 1–45 figées 12/11/2026 18:58:48 UTC, SHA-256 f14655967424a8b8a983e94acd6c18354112daff259cc5c90f76a5a9e6ca38bf,
  commitées AVANT le premier passage. E égal / F force |ln 28 j| / V risque égal 1/σ ; portefeuille composé, entrée seule.
- Données : `sh rejeu/portage_get.sh <scratchpad>/donnees 2018-08 2026-09` (1013 spot1h, 821 fund — comme la porte du 06/10).
- Lancer : `python3 -I rejeu/porte_poids.py <données>` → choix E / F / V = règle de mise du module 15b.

## Étapes
- [x] 0. Porte POIDS passée 12/11 ~19:05 UTC → **E (égal) reste** : F ×25,15 contre E ×68,66 (jugement L1), pire baisse −65 / −53 %, contrôle −1 / +102 %, z −1,07 / −1,14 ;
       V ×86,80, contrôle +126 %, z +0,53 / +0,83, années 3/6 (L1) → non prouvé. Rééquilibrées chaque lundi : F ×1,57 (−96 %), V ×3,41.
       RÈGLE DE MISE du module 15b = celle mesurée : à chaque entrée, mise = min(trading, (trading + valeur des positions de la voix) / n),
       n = paires tenues par la poche (≥ 1) ; une position tenue n'est jamais retaillée.
- [x] 1. Code : guard closePosition + openPosition({voix}) + refus 09c en EV + module 15b + boutons ✕ {main} ; `banc-tendance-reelle.js` 20/20 (3/20 sur dcbd4ad)
       témoin : banc-fixtures/tendance-reelle-avant-20261027b.js (open/close au commit dcbd4ad)
- [ ] 1b. Bancs épinglés à remettre (banc-all BLOQUÉ, 20 échecs au 1er passage) : jeton + nombre de ?v= (87 → 88 avec 15b), empreintes de
       openPosition / closePosition / 09c (levier S1, levier-56 D, reglages E2, talent-registre S, consignes K10, alertes A2, p4 02, p6, modes-separes S2e,
       skill-borne, verite D4/S9, net-expectancy 10f lignes) — chacun avec la raison datée
- [ ] 2. Preuve : sonde vraie page sur le backup du 12/11 ; relecture adverse (agent séparé)
- [ ] 3. Livraison : ETAT, PASSATION, token, banc-all LIVRABLE, squash sur main, push, DOC_V raw + Pages
