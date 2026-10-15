# ÉTAT-AURA8 — 15/10/2026 — token `20261014a` — À LIRE EN PREMIER (≤ 20 Ko, banc-all le vérifie)

Ce fichier dit OÙ EN EST AURA8 aujourd'hui. L'histoire de chaque livraison est dans `PASSATION-AURA8.md` (438 Ko) : on y CHERCHE (`grep -n`), on ne la lit pas en entier. Les règles de travail de Claude sont dans `CLAUDE.md`. Le détail de l'audit du 13/10 est dans `rejeu/audit-20261013/`.

## 1. L'app (lue en direct par le pont, 15/10 ~04:00 — en marche sans arrêt depuis le 14/10 18:39, réseau présent)
- Version chargée `20261013a` (le token `20261014a` « go réglages » se charge à la prochaine relance avec réseau), 58 scripts, aucune erreur de page. `banc-all` : LIVRABLE.
- Modes : AA, EV et RE en play ; EV à l'écran. RE n'envoie aucun ordre réel (aucun appel `/api/v3/order`).
- EV : 1 082,27 $, 354 trades, aucune position (inchangé depuis le 11/10 20:40). AA : 1 025,78 $, 2 030 trades. RE : 1 145,42 $, 0 trade. Levier : 0 partout.
- Poche tendance longue (`js/15`) : 11 positions tenues (pont).
- **La décision n'a aucune information** : sur 3 899 décisions (09/10 → 14/10, backup du 14/10 18:45), −0,265 % net à 15 min (t = −11,7) ; la décision INVERSE perd autant (−0,286 %). Ce qui est perdu, ce sont les frais. Le seuil appris garde le marché fermé : le bot EV n'ouvre plus. Six portes de recherche (TALENT, SOURCE, RÉPLIQUE, CARNET, PORTAGE, FLUX) et TENDANCE n'ont trouvé aucune source qui change ça ; TENDANCE LONGUE est la seule entrée (fragile).
- Arrêts : la tablette part avec Rams au travail, sans réseau loin du Wi-Fi et sur batterie (GO VEILLE). Remède côté Rams, pas dans le code.
- **RE et les paires ajoutées** (go réglages, dit à Rams) : EUR/USDT et BNB/USDT, cochées dans la liste RE, n'avaient pas d'état dans le portefeuille RE (créé seulement si l'écran était RE au démarrage) → le RE ne les voyait pas. Désormais les 3 portefeuilles les reçoivent (règle « toute paire ajoutée se met en place partout », 26/09) : le bot RE peut les trader (papier). Au 14/10, sa porte « bases solides » (10f) les tient fermées (net appris négatif).

## 2. Règles de Rams en vigueur (ne pas les redemander)
- AUTO / MANU : Rams seul. En MANU, le bot peut surveiller, préremplir, fermer — jamais ouvrir.
- Noms internes `sim` / `paperReal` / `real` et clés de stockage (`nexus_state_v2`, `nexusSnap_A/B/C`, `NEXUS_DB`) : jamais renommés.
- Aucune limite ni seuil chiffré posé à la main : le système l'apprend sur ses données. Pas de retrait de paire ni de réduction du nombre de trades pour corriger les pertes.
- Rien n'est remis à plat : AA / EV / RE, agents, bots, rêves, Guardian restent entiers.
- Une mission par conversation, nommée par « go … » ; un commit de livraison. Aucune livraison sur la décision sans passer la porte TALENT ou SOURCE.
- Le bot doit pouvoir tenir une position le temps qu'il faut (pas 15 min) ; perdre peu, gagner gros.
- Fiscal (07/10) : calcul de la loi trade par trade — MANU LONG sans levier = normal (10 000 €/an exonérés), AUTO ou levier = spéculatif 33 %.
- Être explicite sur chaque modification ; vérité d'abord ; réponses courtes en français.

## 3. Défauts OUVERTS — registre (audit du 13/10 ; G1 n° 1–8, 20, 21 fermés par « go argent » le 14/10, `20261013a` ; G2 n° 10–19 fermés par « go réglages » le 15/10, `20261014a`)
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
| 22 | Mise ×0,4 à ×1,5 selon un Sharpe dès 5 trades par paire | 10d:210 · 02:6074 | c | S |
| 23 | Pause auto des paires (WR < 40 % sur 50 trades) impossible : l'historique est coupé à 40 lignes | 09e:165 · 09b2:1052 | c | S |
| 24 | Les trades de la paire du graphique n'entrent jamais dans `S.flowStats` (whale_v1 / flow_v1 aveugles sur elle) | 02:5138-5140 | c | S |
| 28 | Fenêtre « bougies réelles » ouverte hors réseau : son rafraîchissement de 1 s passe `ps.price` (figé) dans le filtre des prix réels → l'âge du prix est remis à zéro, les gardes « prix figé » (07, 10f, 10i) voient un prix frais pour la paire affichée | 02:1069, 1206-1217, 1438, 1474 | revue c | S |
| 29 | Estimations restées sur la MISE alors que les frais réels sont sur l'exposition (« net en poche », P&L net de la carte, solvabilité) — faux seulement avec levier | 16:416 · 07:4350 · 02:77 | revue c | S |
| 30 | Interrupteurs sans effet : Telegram « 📊 Chaque trade », « 🔔 Alertes prix » (tgOnTrade / tgOnAlert : 0 appelant), « 💰 Objectif P&L » (jamais lu) ; Notifications « TP / SL » (jamais lu), « Twin », « Régime » (notifTwinAlert / notifRegimeChange : 0 appelant). Seuls l'urgence Telegram (Bunker) et ouverture / fermeture / drawdown des notifications agissent | 06:2584, 2594, 2655 · 07:1853, 1954, 1967 | revue grep | S |
| 31 | Alertes prix (`S.priceAlerts`) et seuils d'alertes P&L (`S.pnlAlerts`) jamais sauvegardés : perdus à chaque relance (même onglet que les réglages sauvegardés le 15/10) | 06:825 · 04:2266 · absents de 09b1 | revue grep | S |
| 32 | Clé CoinStats (`S.newsApiKey`) dans les backups de l'historique et les exports .json / .txt : `JSON.stringify(S)` (03 _buildFullBackup) la copie — même défaut que le jeton Telegram, corrigé le 15/10 par une propriété non énumérable (06 _tgGet) | 10e7:194, 325 · 03:6063 | revue c | S |
| 33 | Onglet « 🛠 Outils » laissé sans bouton (décision du 15/10) : 14 sections sur 14 à corriger avant de l'exposer (Urgence sans confirmation, Coffre qui plante et remplace tout l'état, stress test / ADN / Paper Ultra / auto-backup faux, calculateur, PDF, Excel, hebdo faux) | `rejeu/reglages-20261014/outils-audit.md` | agent + vm | M |

### G3 (9) et G4 (32)
Liste complète, avec fichier:ligne : `rejeu/audit-20261013/registre.md` (n° 13 à 50) et `promesses.md` (n° 9 et 12). Ajouté le 15/10 (G4) : `_writeChosenState` (09b2) attend la fin de la transaction IDB sans délai maximal — une transaction qui ne finirait jamais laisserait les sauvegardes suspendues jusqu'au rechargement (supposé, jamais vu). Les plus visibles : « ✕ Fermer hedges » ne ferme rien et « Hedge manuel » annonce « ouvert » même refusé ; calendrier éco et montants fiscaux écrits pour 2026 seulement ; additionnels communaux à 0 % (saisie de Rams) ; écran anti-revenge absent ; `pnl24h` = depuis la relance ; module 18 (réparation démo) inerte à retirer ; `banc-pont-direct.js` P22 intermittent.

### Corrigé / faux depuis les rapports précédents
27 points corrigés, 6 périmés, 7 énoncés faux rectifiés (dont : `_closeTradesOnExit` ne ferme que les positions du bot ; les 7 bots non votants agissent par veto, taille de mise, découpage et sauvetage) — `rejeu/audit-20261013/registre.md` §2–4.

## 4. Missions proposées, dans l'ordre (aucune sans « go » de Rams)
1. **go levier** — G1 n° 25, 26 et G2 n° 29 avant toute utilisation du levier (inactif aujourd'hui).
2. **go alertes** — G2 n° 30, 31, 32 : les interrupteurs Telegram / notifications font ce qu'ils disent (ou disparaissent), alertes sauvegardées, clé CoinStats hors des backups.
3. **go outils** — n° 33 : corriger les 14 outils, puis rendre l'onglet accessible.
4. **go nettoyage** — G3 / G4 choisis par Rams (dont n° 27, 28).
Hors code, à Rams : réseau de la tablette (GO VEILLE) ; la part caisse à 0 % (n° 9) ; additionnels communaux ; révoquer l'ancienne clé CoinStats et l'ancien PAT ; 2FA GitHub.

## 5. Outils (détail : PASSATION, points numérotés)
App en direct : `node rejeu/pont.js etat | journal --heures 24 | backup | lire S <chemin>` (point 21 ; rattacher `aura-pont` en lecture SANS le cloner). Lecture d'un backup : `node rejeu/lecture_backup.js <fichier>`. Argent : `node banc-argent.js` (vm) et `node rejeu/sonde_argent.js --root . --backup <backup>` (vraie page, 19 étapes). Réglages / restaurations : `node banc-reglages.js` (vm, 27) et `node rejeu/sonde_reglages.js --root . --backup <backup>` (vraie page, 17 étapes, rechargements compris). Sonde navigateur : point 15. Sonde des modes : point 20. Portes de recherche : points 9 à 17. Fiscal : point 19. Enveloppe Android : point 23.
