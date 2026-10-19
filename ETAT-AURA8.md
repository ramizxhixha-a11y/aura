# ÉTAT-AURA8 — 19/10/2026 — token `20261019a` — À LIRE EN PREMIER (≤ 20 Ko, banc-all le vérifie)

Ce fichier dit OÙ EN EST AURA8 aujourd'hui. L'histoire de chaque livraison est dans `PASSATION-AURA8.md` (≈ 460 Ko) : on y CHERCHE (`grep -n`), on ne la lit pas en entier. Les règles de travail de Claude sont dans `CLAUDE.md`. Le détail de l'audit du 13/10 est dans `rejeu/audit-20261013/`.

## 1. L'app (lue en direct par le pont, 19/10 ~12:00 UTC — dernier etat.json 11:22 UTC, relancée le 18/10 17:42 UTC, arrêt de 7 h le 19/10 05:40 heure de la tablette)
- Version chargée `20261018c` (« go levier ») ; le token `20261019a` « go nettoyage » se charge à la prochaine relance avec réseau. 58 scripts, aucune erreur de page. `banc-all` : LIVRABLE.
- Modes : AA, EV et RE en play ; EV à l'écran. RE n'envoie aucun ordre réel (aucun appel `/api/v3/order`).
- EV : 1 067,14 $, 373 trades, aucune position. RE : 1 145,42 $, 0 trade. AA : 4 337,44 $, 2 233 trades, aucune position.
- **AA porte 3 707,64 $ que ses fermetures n'expliquent pas** (n° 51, mesuré au centime : 999,48 $ le 18/10 10:30 UTC, 33 fermetures à −319,36 $ net de frais, 4 387,76 $ à 19:22 UTC sans position ni apport ni transfert). Cause supposée : l'emprunt du levier de trades manuels resté au trading (n° 25, corrigé le 18/10). Décision de Rams (19/10) : le retirer → `js/18-recalage-aa.js` : bandeau au lancement, « Recaler l'AA » + question chiffrée ; **à faire par Rams sur la tablette** (un appui).
- Poche tendance longue (`js/15`) : 11 positions tenues.
- **La décision n'a aucune information** : sur 7 927 décisions (15/10 → 18/10, backup du 18/10 21:37), −0,274 % net à 15 min (t = −19,3). Ce qui est perdu, ce sont les frais. Six portes de recherche et TENDANCE n'ont trouvé aucune source qui change ça ; TENDANCE LONGUE est la seule entrée (fragile).
- Arrêts : la tablette part avec Rams au travail, sans réseau loin du Wi-Fi et sur batterie (GO VEILLE). « Veille empêchée » demandée mais NON tenue. Remède côté Rams, pas dans le code.

## 2. Règles de Rams en vigueur (ne pas les redemander)
- AUTO / MANU : Rams seul. En MANU, le bot peut surveiller, préremplir, fermer — jamais ouvrir.
- Noms internes `sim` / `paperReal` / `real` et clés de stockage (`nexus_state_v2`, `nexusSnap_A/B/C`, `NEXUS_DB`) : jamais renommés.
- Aucune limite ni seuil chiffré posé à la main : le système l'apprend sur ses données. Pas de retrait de paire ni de réduction du nombre de trades pour corriger les pertes.
- Rien n'est remis à plat : AA / EV / RE, agents, bots, rêves, Guardian restent entiers.
- Une mission par conversation, nommée par « go … » ; un commit de livraison. Aucune livraison sur la décision sans passer la porte TALENT ou SOURCE.
- Le bot doit pouvoir tenir une position le temps qu'il faut (pas 15 min) ; perdre peu, gagner gros.
- Fiscal (07/10) : calcul de la loi trade par trade — MANU LONG sans levier = normal (10 000 €/an exonérés), AUTO ou levier = spéculatif 33 %.
- **Jamais sous zéro (18/10)** : « le trade est clôturé avant de perdre plus que la capacité du compte trading — frais, taxes, dettes » ; la réserve anti-négatif calcule en permanence. Livré par go nettoyage (n° 52, 54) : contrôle à chaque seconde, avec ou sans levier, dans chaque mode en play.
- Être explicite sur chaque modification ; vérité d'abord ; réponses courtes en français.
- Part des gains vers la caisse : 0 % depuis le 11/10, réglée par Rams lui-même (confirmé le 15/10) — ce n'est pas un défaut.
- Carte de paire : accord de Rams ; changée le 19/10 sur son « oui » (badge mise + levier, « Mise de base » du prochain trade).

## 3. Défauts OUVERTS — registre (audit du 13/10 ; fermés : G1 n° 1–8, 20, 21 go argent 14/10 · G2 n° 10–19 go réglages 15/10 · n° 30–32 go alertes, 33 go outils, 25, 26, 29 go levier 18/10 · **go nettoyage 19/10 `20261019a` : n° 27, 28, 34–39, 51 (code ; geste de Rams en attente), 52–55, 58–60, G4 n° 21, 22, 42 et le code mort de go outils / go levier**)
Preuve : **R** = revérifiée par la session principale · **vm** = vrai code exécuté · **c** = lu dans le code · **rel** = relecture adverse du 19/10 (`claude/RAPPORT-NETTOYAGE-20261019.md`). Taille du remède : S ≤ 20 lignes.

### G1 — argent ou données faux
| n° | Défaut | Où | Preuve | Taille |
|---|---|---|---|---|
| 51 | Recalage de l'AA livré (`js/18-recalage-aa.js`) : reste le geste de Rams (bandeau → « Recaler l'AA » → OK). Vérifier ensuite `_recalageAA.etat()` = `fait` par le pont, puis retirer le module et sa ligne du HTML | 18 | test + sonde | S |
| 61 | `validateInvestmentCapProvisioned` retire deux fois les mises engagées : avec plusieurs positions ouvertes le « disponible » est trop bas (inverser une position de 490 $ la rouvre à 27,65 $) — lu par l'ouverture du bot → porte TALENT | 09j:193 | rel vm | S |
| 62 | « Inverser » ferme la position avant de savoir à combien elle sera rouverte (aucune question) ; avec 3 positions le message de non-réouverture est confus | 07 manuInvert | rel vm | S |
| 63 | `_auraRotatePurge` coupe `antiNegReserveLog` en gardant les 50 lignes les PLUS ANCIENNES (backup 18/10 : rien entre le 13/09 et le 18/10 21:36) | 09b2:1145 | rel c | S |
| 64 | Rapports / Excel / hebdo : le résultat des sorties par paliers (champ `paliers` de la ligne finale) n'est pas additionné — argent réalisé absent des rapports (comme avant go nettoyage) | 05 `_outilsClosedTrades` | c | S |

### G2 — promesse non tenue ou décision faussée
| n° | Défaut | Où | Preuve | Taille |
|---|---|---|---|---|
| 22 | Mise ×0,4 à ×1,5 selon un Sharpe dès 5 trades par paire | 10d:210 · 02:6074 | c | S |
| 23 | Pause auto des paires (WR < 40 % sur 50 trades) impossible : l'historique est coupé à 40 lignes | 09e:165 · 09b2:1052 | c | S |
| 24 | Les trades de la paire du graphique n'entrent jamais dans `S.flowStats` (whale_v1 / flow_v1 aveugles sur elle) | 02:5138-5140 | c | S |
| 56 | Portefeuille « canonique » compte l'argent emprunté ; `_tradingCapitalBase` retranche aussi la part exposition. Lus par la décision → porte TALENT | 02:158 `_computePortfolio` · 02:184 | c + app | M |
| 57 | Arrêt d'urgence Plein Régime calculé sans les mises engagées : toute ouverture ≥ 5 % du capital le déclenche → porte TALENT | 09e:30 · 10h:73 | c | S |
| 65 | Migrations « une fois » encore gardées par leur seul drapeau : 02 `_etage1Migration` (maxConcurrentPos 1→3) et 09b2 `_upgradeFeeRates` (frais relevés à 0,10 %) — réglages lus par la décision → porte TALENT | 02 · 09b2 | vm (go nettoyage) | S |
| 66 | Alertes P&L : un mode en play DERRIÈRE l'écran n'en reçoit aucune (seuls appelants : 07 renderHome, 02 closePosition `!_behind`) | 04 checkPnlAlerts | rel c | S |
| 67 | Alertes « Gain / Perte journalière ($) » comparent `S.pnl24h`, un POURCENTAGE depuis la relance, à des dollars (AA : « +$338.85 aujourd'hui », aussi sur Telegram) ; « Drawdown » et « Win Streak » ne partent jamais (`S.perf.maxDrawdown`, `ps.streak` sans écrivain) | 04 · 08:3401 | rel vm | S |
| 68 | 9 exports passent encore par un lien blob dans l'app Android et disent « exporté » : 09h (CSV trades, frais, fiscal, JSON), 4 CSV Google Sheets (05:3510), « Export pour Claude » (10h:39) — même défaut que n° 38, corrigé pour « Exporter backup » | 09h · 05 · 10h | rel c | S |
| 69 | Calculateur : « R/R 2.00 ✅ » calculé avant frais (après frais 1,65 aux réglages d'usine → ⚠️ par la règle de l'écran) | 06 renderCalcSection | rel vm | S |
| 34b | Twin Live : `S.twin` commun aux 3 modes (ouvert sur les prix AA, fermé sur les prix EV) et jamais sauvegardé (inactif à chaque relance) ; « Twin devant » sans hystérésis (soupçon) | 07 tickTwinLive | rel vm | S |
| 70 | Une clôture derrière l'écran appelle `saveState` pendant la bascule de mode : le snapshot pourrait garder le mode d'arrière-plan (soupçon) | 02:120 | rel c | S |

### G3 / G4
Liste complète, avec fichier:ligne : `rejeu/audit-20261013/registre.md` (n° 13 à 50) et `promesses.md` (n° 9 et 12). Fermés le 19/10 : n° 21 (doublon `_OUTILS_TABS`), 22 (module 18 démo), 42 (`js/10-fin-bloc` supprimé), le code sans appelant de go outils (Paper Ultra, Coffre, Auto-backup, `loadDiffFromAutoSlot`, `urgenceReduceStake`, minuteur DIAG 3 s) et de go levier (`_p4AntiDetteWatchdog`, `_p5InvariantCheck`). Clés de stockage laissées orphelines (données de Rams) : `aura_vault_salt_v89`, `aura_vault_0/1/2`, `_aura_lastBackupError`, `aura_autobackup_daily_0/1/2` (plus effacées au démarrage ; Guardian les lit encore).
Ajouté le 19/10 (G4, code sans appelant laissé en place) : 06 `openUrgence`, `closeUrgence`, `graceActNow`, `unlockRevenge` ; 10e `_giveBackToBot`, `_initNetIndicator`, `_netwatchTick`, `_pulseSettingsBtn`, `_recomputeAllAgentBoosts` et 4 coquilles vides ; 02 `EVENT_KINDS` motif « sauvegarde suspendue » sans écrivain ; scripts d'audit datés qui ne tournent plus (`rejeu/reglages-20261014/vm/handlers.js`, `vm_vault.js`, `rejeu/audit-20261013/promesses-scripts/vm-bunker.js`) ; `aura-guardian.html` REF_FUNCTIONS : mauvais fichier pour `renderAll` et `enableFullPowerMode` ; texte « MAJ il y a … » de la fenêtre bougies réelles lit `_lastRealPriceTs` nu (non défini, c'est `RT._lastRealPriceTs`) → « MAJ > 1h » hors WS (02:1652, 10g:168, 10e:303) ; commentaire de 02 closePosition sur les drapeaux d'alertes P&L « communs aux modes » devenu faux. Plus anciens : `_writeChosenState` (09b2) sans délai maximal (supposé) ; « ✕ Fermer hedges » ne ferme rien ; calendrier éco et montants fiscaux écrits pour 2026 seulement ; additionnels communaux à 0 % (saisie de Rams) ; écran anti-revenge absent ; `pnl24h` = depuis la relance ; `banc-pont-direct.js` P22 intermittent.

### Corrigé / faux depuis les rapports précédents
27 points corrigés, 6 périmés, 7 énoncés faux rectifiés — `rejeu/audit-20261013/registre.md` §2–4. Go nettoyage : l'estimation « ≈ 3 160 $ » du n° 51 ne comptait que le résultat BRUT des fermetures ; avec leurs frais, l'écart est 3 707,64 $.

## 4. Missions proposées, dans l'ordre (aucune sans « go » de Rams)
1. **Geste de Rams** : relancer l'app avec réseau (token `20261019a`), appuyer « Recaler l'AA » sur le bandeau ; Claude vérifie ensuite par le pont et retire le module 18.
2. **Porte TALENT** pour n° 56, 57, 61, 65 (ils touchent la décision d'ouvrir).
3. **go alertes 2** — n° 66, 67, 68, 69, 34b (écran et exports qui mentent encore).
Hors code, à Rams : réseau de la tablette (GO VEILLE) ; additionnels communaux ; révoquer l'ancienne clé CoinStats et l'ancien PAT ; 2FA GitHub ; Telegram dans Outils Avancés › 🔔 Alertes ; essayer une fois un export de l'onglet 🛠 Outils et « Exporter backup » sur la tablette (écriture dans Download/AURA prouvée en vm seulement).

## 5. Outils (détail : PASSATION, points numérotés)
App en direct : `node rejeu/pont.js etat | journal --heures 24 | backup | lire S <chemin>` (point 21 ; rattacher `aura-pont` en lecture SANS le cloner). Lecture d'un backup : `node rejeu/lecture_backup.js <fichier>`. Argent : `node banc-argent.js`, `node rejeu/sonde_argent.js --root . --backup <backup>`. Réglages : `node banc-reglages.js`, `node rejeu/sonde_reglages.js`. Alertes : `node banc-alertes.js`, `node rejeu/sonde_alertes.js`. Outils : `node banc-outils.js`, `node rejeu/sonde_outils.js`. Levier : `node banc-levier.js`, `node rejeu/sonde_levier.js`. **Nettoyage** : `node banc-nettoyage-argent.js` (vm, 26 : n° 51–55, 58–60), `banc-nettoyage-promesses.js` (13 : n° 34–39), `banc-nettoyage-reseau.js` (16 : n° 27, 28), `banc-nettoyage-mort.js` (7) et `node rejeu/sonde_nettoyage.js --root . --backup <backup>` (vraie page, 12 étapes : bandeau du recalage, remise à zéro, solvabilité sans levier, paliers, inverser, carte). Sonde navigateur : point 15. Sonde des modes : point 20. Portes de recherche : points 9 à 17. Fiscal : point 19. Enveloppe Android : point 23.
