# ÉTAT-AURA8 — 18/10/2026 — token `20261018c` — À LIRE EN PREMIER (≤ 20 Ko, banc-all le vérifie)

Ce fichier dit OÙ EN EST AURA8 aujourd'hui. L'histoire de chaque livraison est dans `PASSATION-AURA8.md` (438 Ko) : on y CHERCHE (`grep -n`), on ne la lit pas en entier. Les règles de travail de Claude sont dans `CLAUDE.md`. Le détail de l'audit du 13/10 est dans `rejeu/audit-20261013/`.

## 1. L'app (lue en direct par le pont, 18/10 ~16:35 UTC — relancée le 18/10 15:12 UTC, réseau présent, veille empêchée tenue)
- Version chargée `20261018b` (« go outils ») ; le token `20261018c` « go levier » se charge à la prochaine relance avec réseau. 58 scripts, aucune erreur de page. `banc-all` : LIVRABLE.
- Modes : AA, EV et RE en play ; AA à l'écran. RE n'envoie aucun ordre réel (aucun appel `/api/v3/order`).
- EV : 1 080,64 $, 367 trades, aucune position (net du mode depuis le début : −61,72 $, backup du 18/10 02:30). RE : 1 145,42 $, 0 trade. Levier 0 et dette 0 dans les 3 modes (pont, `walletStore`).
- **AA le 18/10** (pont : `etat.json` toutes les 5 min, journal des événements) : de 10:35 à 11:48 UTC, trades MANUELS de 1 000 à 30 000 $ de mise avec le levier, le portefeuille affiché passe de 999,91 $ à 32 895 $ puis redescend ; à 16:35 : 4 388,49 $ (trading 4 341,10 $), levier 0, dette 0. Les 39 fermetures du jour ont réalisé +225 $ bruts : **≈ +3 160 $ que les résultats n'expliquent pas**. Cause supposée (non prouvée, chemin non reconstitué) : le n° 25 corrigé par go levier. Rien n'a été remis : décision de Rams (n° 51).
- Arrêt de 14 h le 16/10 (05:59, tablette hors réseau avec Rams) ; « veille empêchée » demandée mais NON tenue par le système au dernier relevé.
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
- Part des gains vers la caisse : 0 % depuis le 11/10, réglée par Rams lui-même (confirmé le 15/10) — ce n'est pas un défaut.

## 3. Défauts OUVERTS — registre (audit du 13/10 ; G1 n° 1–8, 20, 21 fermés par « go argent » le 14/10 ; G2 n° 10–19 par « go réglages » le 15/10 ; G2 n° 30–32 par « go alertes » le 18/10, `20261018a` ; G2 n° 33 par « go outils » le 18/10, `20261018b` ; G1 n° 25, 26 et G2 n° 29 par « go levier » le 18/10, `20261018c`)
Preuve : **R** = revérifiée par la session principale (code relu et/ou script rejoué) · **vm** = vrai code exécuté par un script de `rejeu/audit-20261013/` · **c** = lu dans le code. Taille du remède : S ≤ 20 lignes.

### G1 — argent ou données faux
| n° | Défaut | Où | Preuve | Taille |
|---|---|---|---|---|
| 51 | AA porte ≈ 3 160 $ que ses résultats n'expliquent pas (§ 1) : les garder ou recaler AA — Rams seul (règle 9 : rien n'est remis sans confirmation qui dit ce qui change) | état AA | app (pont) | S |
| 52 | Dette du levier en ARGENT que le trading ne couvre pas (perte d'une position financée par l'emprunt) : reste due, dite (journal, tuile « Dette du levier »). À trancher par Rams : la prendre sur la caisse (règle 23/08 « caisse dans la capacité »), l'effacer (règle 27/07 « jamais sous zéro »), ou la garder due (actuel) | 02 `_repayCashDebt` (4479) · closePosition · `_forceCloseAllForSolvency` | test (banc-levier) | S |
| 53 | Appui long « Dette levier » (2 s) remet la dette à 0 sans question qui dise le montant : l'emprunt resté au trading devient de l'argent | 03:5651-5661 `_executeAccountReset` | c | S |
| 54 | Frais non couverts par le trading (trading borné à 0) : la part manquante disparaît au lieu de devenir une dette | 02:4607 recordFees | c | S |
| 55 | Sortie partielle par paliers hors `closePosition` (règle 9) : refusée désormais sur une position avec levier, reste à faire passer par closePosition | 05:653 closePartial | c | S |
| 27 | « SEED v4 · ZÉRO ABSOLU » et 7 autres migrations gardées par un drapeau localStorage : si l'état réel est déjà en stockage au 1er boot sans drapeaux, les 3 portefeuilles passent à 0. Aucun chemin réaliste trouvé dans l'app (l'app vide pose ses drapeaux en 2,5 s) | 02:7441 et voisines | revue page (conditionnel) | S |

### G2 — promesse non tenue ou décision faussée
| n° | Défaut | Où | Preuve | Taille |
|---|---|---|---|---|
| 22 | Mise ×0,4 à ×1,5 selon un Sharpe dès 5 trades par paire | 10d:210 · 02:6074 | c | S |
| 23 | Pause auto des paires (WR < 40 % sur 50 trades) impossible : l'historique est coupé à 40 lignes | 09e:165 · 09b2:1052 | c | S |
| 24 | Les trades de la paire du graphique n'entrent jamais dans `S.flowStats` (whale_v1 / flow_v1 aveugles sur elle) | 02:5138-5140 | c | S |
| 28 | Fenêtre « bougies réelles » ouverte hors réseau : son rafraîchissement de 1 s passe `ps.price` (figé) dans le filtre des prix réels → l'âge du prix est remis à zéro, les gardes « prix figé » (07, 10f, 10i) voient un prix frais pour la paire affichée | 02:1069, 1206-1217, 1438, 1474 | revue c | S |
| 56 | Portefeuille « canonique » compte l'argent emprunté (le portefeuille AA a affiché 32 895 $ avec ~1 000 $ à lui) ; `_tradingCapitalBase` retranche aussi la part exposition. Lus par la décision (`_checkPaperRealStakeLimit`, guardianCheck) → porte TALENT | 02:158 `_computePortfolio` · 02:184 | c + app | M |
| 57 | Arrêt d'urgence Plein Régime calculé sans les mises engagées : toute ouverture ≥ 5 % du capital le déclenche (le bot allume PR avec levier) → porte TALENT | 09e:30 · 10h:73 | c | S |
| 58 | Levier : capacité « juste à temps » = base × 10 × index (le ×10 caché que le 18/08 avait retiré ailleurs) ; baisser l'index peut emprunter ; `S.portfolio` écrit au milieu d'une ouverture | 02:4290 · 02:7159 changeLeverage · 02:6186 | c | S |
| 59 | Carte de paire : le badge « mise » montre l'exposition (mise × levier) ; « Prochain trade estimé » ne suit pas la mise réelle. La carte est un accord de Rams : rien changé | 07:3566 · 08:949 | c | S |
| 60 | « ↓ Inverser / Convertir » : passe par fermeture puis réouverture manuelle (manuInvert) ; sur une position perdante d'un compte investi, elle est fermée et pas rouverte (dit à l'écran). `confirm()` des transferts avec levier : non essayé sur la tablette | 08:1595 flipPosition · 02 confirmTransfer | test (sonde_levier, Chromium) | S |
| 34 | Le Twin Live n'avance QU'À l'ouverture de l'accueil (seul appelant de `tickTwinLive`) : son encart et sa notification « Twin devant » ne bougent pas tant que tu n'ouvres pas l'accueil. Dit à l'écran | 02:4973 · 07 tickTwinLive | revue grep | S |
| 35 | Alertes P&L : les drapeaux « déjà déclenchée » sont communs aux 3 modes — le premier mode qui atteint le seuil consomme l'alerte des autres jusqu'à la remise à zéro de 24 h | 02:6565 · 04:2340 | revue c | M |
| 36 | `notifConfig.lastNotifTs` écrit et plus lu (l'anti-spam est par genre, en mémoire) : champ mort gardé dans le snapshot pour ne pas changer la forme du réglage | 07:1904 | revue grep | S |
| 37 | Message Telegram « résumé de la semaine » : dit « 100 dernières lignes par paire » — l'historique est coupé à 40 lignes (09b2:1138) | 06 `_tgHebdoText` (~2766) | revue c | S |
| 38 | Réglages › « Exporter backup » (09b3 exportState → `_shareOrDownloadJSON`) : dans l'app Android, si l'écriture native est refusée, repli sur un lien blob qui n'écrit rien → toast « Sauvegarde exportée » (même défaut que l'Urgence corrigée par go outils, `05 _outilsSaveText`) | 09b3:164-188, 332-338 | revue c | S |
| 39 | Outils : les fermetures d'urgence (lignes `type:'urgence'`) n'entrent ni dans le résumé hebdo (écran, PDF) ni dans l'Excel, alors que le résumé Telegram les compte ; Kelly du calculateur : « ✅ » sur un WR AVANT frais quand le net du mode est ≥ 0 (libellé « avant frais ») | 05 `_outilsClosedTrades` · 06 renderCalcSection | revue vm | S |

### G3 (9) et G4 (33)
Liste complète, avec fichier:ligne : `rejeu/audit-20261013/registre.md` (n° 13 à 50) et `promesses.md` (n° 9 et 12). Ajouté le 18/10 (G4, go levier) : `_p4AntiDetteWatchdog` et `_p5InvariantCheck` (10 et 10e) sans appelant. Ajouté le 18/10 (G4, go outils) : code sans appelant laissé en place — 06 Paper Ultra (`renderPaperUltraSection`…), Coffre (`renderVaultSection`, `saveVault`…), Auto-backup (`renderAutoBackupSection`, `restoreSlot`…), `loadDiffFromAutoSlot`, `urgenceReduceStake`, et le minuteur « v117 DIAG TEMPORAIRE » (06 `_abDiagTimer`, toutes les 3 s). Ajouté le 15/10 (G4) : `_writeChosenState` (09b2) attend la fin de la transaction IDB sans délai maximal — une transaction qui ne finirait jamais laisserait les sauvegardes suspendues jusqu'au rechargement (supposé, jamais vu). Les plus visibles : « ✕ Fermer hedges » ne ferme rien et « Hedge manuel » annonce « ouvert » même refusé ; calendrier éco et montants fiscaux écrits pour 2026 seulement ; additionnels communaux à 0 % (saisie de Rams) ; écran anti-revenge absent ; `pnl24h` = depuis la relance ; module 18 (réparation démo) inerte à retirer ; `banc-pont-direct.js` P22 intermittent.

### Corrigé / faux depuis les rapports précédents
27 points corrigés, 6 périmés, 7 énoncés faux rectifiés (dont : `_closeTradesOnExit` ne ferme que les positions du bot ; les 7 bots non votants agissent par veto, taille de mise, découpage et sauvetage) — `rejeu/audit-20261013/registre.md` §2–4.

## 4. Missions proposées, dans l'ordre (aucune sans « go » de Rams)
1. **Décisions de Rams sur le levier** (n° 51 et 52), puis **go nettoyage** — G1 n° 53–55 et G3 / G4 choisis par Rams (dont n° 27, 28, 34–39, 58–60 et le code mort laissé par go outils).
2. **Porte TALENT** pour n° 56 et 57 (ils touchent la décision d'ouvrir).
Hors code, à Rams : réseau de la tablette (GO VEILLE) ; additionnels communaux ; révoquer l'ancienne clé CoinStats (les backups faits AVANT le 18/10 la portent encore) et l'ancien PAT ; 2FA GitHub ; pour être prévenu hors de l'app (la WebView Android n'a pas de notifications du système) : configurer Telegram dans Outils Avancés › 🔔 Alertes. Go outils (18/10) : essayer UNE fois sur la tablette un export de l'onglet 🛠 Outils (rapport .html ou Excel écrit dans Download/AURA, puis l'ouvrir) — l'écriture suit le chemin des backups Guardian, son ouverture dans Chrome n'est pas prouvée.

## 5. Outils (détail : PASSATION, points numérotés)
App en direct : `node rejeu/pont.js etat | journal --heures 24 | backup | lire S <chemin>` (point 21 ; rattacher `aura-pont` en lecture SANS le cloner). Lecture d'un backup : `node rejeu/lecture_backup.js <fichier>`. Argent : `node banc-argent.js` (vm) et `node rejeu/sonde_argent.js --root . --backup <backup>` (vraie page, 19 étapes). Réglages / restaurations : `node banc-reglages.js` (vm, 27) et `node rejeu/sonde_reglages.js --root . --backup <backup>` (vraie page, 17 étapes, rechargements compris). Alertes : `node banc-alertes.js` (vm, 28) et `node rejeu/sonde_alertes.js --root . --backup <backup>` (vraie page, 14 étapes, Telegram bouchonné). Outils : `node banc-outils.js` (vm, 18) et `node rejeu/sonde_outils.js --root . --backup <backup>` (vraie page, 21 étapes, vraies confirmations, faux plugin Filesystem pour l'app Android). Levier : `node banc-levier.js` (vm, 36) et `node rejeu/sonde_levier.js --root . --backup <backup>` (vraie page, 13 étapes : bouton « + », fiche ✏️, emprunt « juste à temps », cartes, fermetures, transfert, rechargement). Sonde navigateur : point 15. Sonde des modes : point 20. Portes de recherche : points 9 à 17. Fiscal : point 19. Enveloppe Android : point 23.
