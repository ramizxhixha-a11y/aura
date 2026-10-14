# ÉTAT-AURA8 — 14/10/2026 — token `20261013a` — À LIRE EN PREMIER (≤ 20 Ko, banc-all le vérifie)

Ce fichier dit OÙ EN EST AURA8 aujourd'hui. L'histoire de chaque livraison est dans `PASSATION-AURA8.md` (438 Ko) : on y CHERCHE (`grep -n`), on ne la lit pas en entier. Les règles de travail de Claude sont dans `CLAUDE.md`. Le détail de l'audit du 13/10 est dans `rejeu/audit-20261013/`.

## 1. L'app (lue en direct par le pont, 14/10 14:52 — dernier etat.json écrit à 07:12 : tablette partie sans réseau)
- Version chargée `20261012a` (le token `20261013a` « go argent » se charge à la prochaine relance avec réseau), 58 scripts, aucune erreur de page. `banc-all` : LIVRABLE.
- Modes : AA, EV et RE en play ; EV à l'écran. RE n'envoie aucun ordre réel (aucun appel `/api/v3/order`).
- EV : 1 082,27 $, 354 trades, aucune position (inchangé depuis le 11/10 20:40). AA : 1 032,43 $, 2 004 trades. RE : 1 145,42 $. Levier : 0 partout.
- Poche tendance longue (`js/15`) : 11 positions tenues (pont).
- **La décision n'a aucune information** : sur 3 599 décisions (08/10 → 13/10), −0,26 % net à 15 min (t = −10,5) ; la décision INVERSE perd autant (−0,29 %). Ce qui est perdu, ce sont les frais. Le seuil appris garde le marché fermé : le bot EV n'ouvre plus. Six portes de recherche (TALENT, SOURCE, RÉPLIQUE, CARNET, PORTAGE, FLUX) et TENDANCE n'ont trouvé aucune source qui change ça ; TENDANCE LONGUE est la seule entrée (fragile).
- Arrêts : la tablette part avec Rams au travail, sans réseau loin du Wi-Fi et sur batterie (GO VEILLE). Remède côté Rams, pas dans le code.

## 2. Règles de Rams en vigueur (ne pas les redemander)
- AUTO / MANU : Rams seul. En MANU, le bot peut surveiller, préremplir, fermer — jamais ouvrir.
- Noms internes `sim` / `paperReal` / `real` et clés de stockage (`nexus_state_v2`, `nexusSnap_A/B/C`, `NEXUS_DB`) : jamais renommés.
- Aucune limite ni seuil chiffré posé à la main : le système l'apprend sur ses données. Pas de retrait de paire ni de réduction du nombre de trades pour corriger les pertes.
- Rien n'est remis à plat : AA / EV / RE, agents, bots, rêves, Guardian restent entiers.
- Une mission par conversation, nommée par « go … » ; un commit de livraison. Aucune livraison sur la décision sans passer la porte TALENT ou SOURCE.
- Le bot doit pouvoir tenir une position le temps qu'il faut (pas 15 min) ; perdre peu, gagner gros.
- Fiscal (07/10) : calcul de la loi trade par trade — MANU LONG sans levier = normal (10 000 €/an exonérés), AUTO ou levier = spéculatif 33 %.
- Être explicite sur chaque modification ; vérité d'abord ; réponses courtes en français.

## 3. Défauts OUVERTS — registre (audit du 13/10 ; G1 n° 1–7 et n° 8, 20, 21 fermés par « go argent » le 14/10, token `20261013a`)
Preuve : **R** = revérifiée par la session principale (code relu et/ou script rejoué) · **vm** = vrai code exécuté par un script de `rejeu/audit-20261013/` · **c** = lu dans le code. Taille du remède : S ≤ 20 lignes.

### G1 — argent ou données faux
| n° | Défaut | Où | Preuve | Taille |
|---|---|---|---|---|
| 25 | Levier « JIT » : l'emprunt est versé au trading, puis la dette est effacée à la fermeture sans rien reprendre → l'emprunt devient de l'argent (+20 $ sur 110 $). Inactif tant que le levier est à 0 | 02:4296-4303 · 09c:813-820 → 02 repayLeverage | revue vm (avant = après) | S |
| 26 | Modifier la MISE d'une position ouverte (fiche) ne débite rien : 30 → 40 $ crée +10 $ à la fermeture | 08:1554 applyPosEdit | revue vm | S |
| 27 | « SEED v4 · ZÉRO ABSOLU » et 7 autres migrations gardées par un drapeau localStorage : si l'état réel est déjà en stockage au 1er boot sans drapeaux, les 3 portefeuilles passent à 0. Aucun chemin réaliste trouvé dans l'app (l'app vide pose ses drapeaux en 2,5 s) | 02:7441 et voisines | revue page (conditionnel) | S |

### G2 — promesse non tenue ou décision faussée
| n° | Défaut | Où | Preuve | Taille |
|---|---|---|---|---|
| 9 | Part des gains vers la caisse à 0 % depuis le 11/10 ~18:40 : la caisse ne reçoit plus rien. Aucun journal ne dit qui l'a changé → **demander à Rams** | `cashLog` · 10g:209-217 | backup | — |
| 10 | Écran RE : `renderPairPnl` plante (EUR/USDT et BNB/USDT sans état RE) → la fin du battement saute un tick sur deux quand RE est à l'écran | 07:3502-3504 | R vm | S |
| 11 | « RESTAURER » depuis l'historique des backups : refusé en silence par le garde anti-régression, l'écran dit « ✅ Backup restauré » | 04:347-410 · 09b2:175 | c | S |
| 12 | « Importer backup » ne pose pas le repère de cycle : fichier en avance → l'app charge un autre backup sans demander ; en retard → sauvegardes refusées | 09b3:17-80 | c | S |
| 13 | Réglages jamais sauvegardés (retour usine à chaque relance) : Anti-Revenge, Bunker, Telegram, Vacances, Son, notifications verbeuses | absents de 09b1 | c + backup | S |
| 14 | « Réduire les mises » (Bunker, Vacances, Urgence) : l'ouvreur 09c ne lit aucune des valeurs changées | 07 · 09c | vm | S |
| 15 | Hedge automatique affiché ON (Rams l'a activé), `_checkHedgingTrigger` jamais appelé | — | c + backup | S |
| 16 | « 🧪 Simuler un blocage (test) » pose un VRAI blocage du bot de 15 min, sans déblocage | 06:4087 → 09c:93 | c | S |
| 17 | Onglet « 🛠 Outils » sans bouton d'accès : 15 outils invisibles (Urgence, Stress test, Calculatrice, Backtest, PDF…) | 07:1196 | c | S |
| 18 | Snapshots internes (Réglages) : la fenêtre plante (`listInternalSnapshots` absent), aucun snapshot n'existe ; `_snapshotActionCreate` non défini | 04:1580 · 09g:222/236 | vm | S |
| 19 | « 🚨 Ouvrir Mode Urgence » vise `#urgenceOverlay`, absent du DOM | 06:681, 06:807 | c | S |
| 22 | Mise ×0,4 à ×1,5 selon un Sharpe dès 5 trades par paire | 10d:210 · 02:6074 | c | S |
| 23 | Pause auto des paires (WR < 40 % sur 50 trades) impossible : l'historique est coupé à 40 lignes | 09e:165 · 09b2:1052 | c | S |
| 24 | Les trades de la paire du graphique n'entrent jamais dans `S.flowStats` (whale_v1 / flow_v1 aveugles sur elle) | 02:5138-5140 | c | S |
| 28 | Fenêtre « bougies réelles » ouverte hors réseau : son rafraîchissement de 1 s passe `ps.price` (figé) dans le filtre des prix réels → l'âge du prix est remis à zéro, les gardes « prix figé » (07, 10f, 10i) voient un prix frais pour la paire affichée | 02:1069, 1206-1217, 1438, 1474 | revue c | S |
| 29 | Estimations restées sur la MISE alors que les frais réels sont sur l'exposition (« net en poche », P&L net de la carte, solvabilité) — faux seulement avec levier | 16:416 · 07:4350 · 02:77 | revue c | S |

### G3 (9) et G4 (31)
Liste complète, avec fichier:ligne : `rejeu/audit-20261013/registre.md` (n° 13 à 50) et `promesses.md` (n° 9 et 12). Les plus visibles : « ✕ Fermer hedges » ne ferme rien et « Hedge manuel » annonce « ouvert » même refusé ; calendrier éco et montants fiscaux écrits pour 2026 seulement ; additionnels communaux à 0 % (saisie de Rams) ; écran anti-revenge absent ; `pnl24h` = depuis la relance ; module 18 (réparation démo) inerte à retirer ; `banc-pont-direct.js` P22 intermittent.

### Corrigé / faux depuis les rapports précédents
27 points corrigés, 6 périmés, 7 énoncés faux rectifiés (dont : `_closeTradesOnExit` ne ferme que les positions du bot ; les 7 bots non votants agissent par veto, taille de mise, découpage et sauvetage) — `rejeu/audit-20261013/registre.md` §2–4.

## 4. Missions proposées, dans l'ordre (aucune sans « go » de Rams)
1. **go réglages** — G2 n° 10 à 19 : ce que l'écran promet, le code le fait (ou le bouton disparaît).
2. **go levier** — G1 n° 25, 26 et G2 n° 29 avant toute utilisation du levier (inactif aujourd'hui).
3. **go nettoyage** — G3 / G4 choisis par Rams (dont n° 27, 28).
Hors code, à Rams : réseau de la tablette (GO VEILLE) ; la part caisse à 0 % (n° 9) ; additionnels communaux ; révoquer l'ancienne clé CoinStats et l'ancien PAT ; 2FA GitHub.

## 5. Outils (détail : PASSATION, points numérotés)
App en direct : `node rejeu/pont.js etat | journal --heures 24 | backup | lire S <chemin>` (point 21 ; rattacher `aura-pont` en lecture SANS le cloner). Lecture d'un backup : `node rejeu/lecture_backup.js <fichier>`. Argent : `node banc-argent.js` (vm) et `node rejeu/sonde_argent.js --root . --backup <backup>` (vraie page, 19 étapes). Sonde navigateur : point 15. Sonde des modes : point 20. Portes de recherche : points 9 à 17. Fiscal : point 19. Enveloppe Android : point 23.
