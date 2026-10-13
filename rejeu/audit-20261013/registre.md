# Registre des défauts connus — AURA8 — code `d5b020d` (token `20261012a`) — 13/10/2026

Sources lues : `PASSATION-AURA8.md` (922 lignes, en entier par morceaux ; sections Reports, Reste ouvert, Pas fait, Limites, Constats, Non touché, Observations), `AUDIT-VERITE-AURA8.md` (§0 à §7), plus les 8 points dits le 13/10. Chaque statut a été vérifié dans le code d'aujourd'hui (recherche par nom) ; « vm » = le vrai texte de la fonction exécuté par un script de ce dossier (`vm_*.js`) ; « backup » = `rejeu/backups/pont/aura_guardian_full_20261013-202953.json`.

## 1. Points OUVERTS (triés par gravité)

| n° | Défaut (une phrase) | Fichier:ligne | G | Remède | Décision |
|---|---|---|---|---|---|
| 1 | « 🛑 Fermer toutes les positions » (Outils › Urgence) et le bunker SOS ferment SANS `closePosition` : la mise et le P&L (calculé sur la mise, pas sur l'exposition) reviennent au compte, mais le levier n'est jamais remboursé, aucun frais, rien au registre fiscal, aucune ligne d'historique (vm) | 06:698-729 ; appelé 06:812, 07:254 | G1 | S | oui (fermeture) |
| 2 | Position à levier : le compte perd le P&L sur l'exposition SANS plafond à la mise, alors que l'historique écrit la perte plafonnée (vm : ×10, −15 % → −45 $ au compte, −30 $ à l'historique) | 02:6527-6530, 02:6566 (plafond seulement 02:6318) | G1 | S | oui (argent) |
| 3 | Pyramide : l'entrée moyenne est calculée mais la fermeture lit l'entrée d'origine ; l'exposition et le levier sont écrasés par la somme des mises (vm : +0,11 $ réels → −0,50 $ crédités) | 05:541-546 ; 02:6305 | G1 | S | oui (fermeture) |
| 4 | `_closeTradesOnExit` : à chaque pagehide / beforeunload / freeze (passage en arrière-plan Android), ferme toutes les positions AUTO du mode à l'écran — même en MANU, même tenues par un horizon appris ; les manuelles et les modes derrière l'écran restent (vm) | 09b2:897-915 | G2 | S | oui (fermeture) |
| 5 | Réglages « 📸 Snapshots internes · auto toutes les 30 min · 5 conservés » : le modal plante (`listInternalSnapshots` n'existe plus) et `_snapshotActionCreate` non plus — la fonction promise n'existe pas (vm : ReferenceError) | 04:1580-1582 ; 09g:222, 09g:236, 09g:248 | G2 | S | non |
| 6 | `S.profitSplitCaissePct` = 0 (backup 13/10 20:29) depuis le 11/10 ~18:40 : la caisse ne reçoit plus rien des gains ; aucune trace de qui l'a changé (`changeProfitSplit` n'écrit rien au journal) | lu 02:6578 ; écrit 10g:209-217, 09b2:388, 04:309 | G2 | S | non |
| 7 | `openPosition` ferme la position déjà ouverte sur la paire AVANT la validation du capital : si le capital refuse ensuite, l'ancienne est fermée et rien ne s'ouvre | 02:6141-6162 | G2 | S | oui |
| 8 | Écran RE : `renderPairPnl` lève (EUR/USDT et BNB/USDT absents du portefeuille RE) → le battement s'arrête là 1 tick sur 2 tant que RE est à l'écran (vm sur le backup : TypeError) | 07:3502-3504 ; 08:3394 ; 11:39-58 | G2 | S | non (rendu, mais le reste du battement saute) |
| 9 | Frais de sortie et glissement calculés sur la MISE, pas sur l'exposition : en levier, l'EV sous-compte ses frais du facteur de levier | 02:6572 → 02:4631-4648 | G2 | S | oui (net jugé) |
| 10 | Allocation Sharpe : mise ×0,4 à ×1,5 dès 5 trades par paire (échantillon insignifiant, audit 14/09 #16) | 10d:210 ; 02:6074-6079 (via 10f:584) | G2 | S | oui (mise) |
| 11 | Pause automatique des paires (« WR < 40 % sur 50 trades ») ne peut jamais se déclencher : ps.trades est coupé à 40 lignes ; et si elle venait, elle serait commune aux 3 modes et perdue à la relance | 09e:165 ; 09b2:1052 ; 09c:160 | G2 | S | oui |
| 12 | Les trades de la paire affichée dans le graphique n'entrent jamais dans `S.flowStats` → whale_v1 / flow_v1 aveugles sur cette paire | 02:5138-5140 | G2 | S | oui |
| 13 | Calendrier éco : seules les dates FOMC / CPI 2026 sont écrites → plus aucun veto ni prudence à partir du 01/01/2027 | 10e2:29-31 | G3 | S | oui (dès 2027) |
| 14 | Montants fiscaux indexés : seuls ceux de 2026 | 16:52 | G3 | S | non |
| 15 | Additionnels communaux à 0 % (impôt spéculatif sous-estimé) — saisie de Rams | backup `fiscalCfg.commune` = 0 | G3 | — (Rams) | non |
| 16 | Écran de refroidissement anti-revenge `#revengeBlock` absent du DOM (il vit dans le gabarit du PDF hebdo) : pas de voile ni compte à rebours, `unlockRevenge` inatteignable | 07:940/1042 ; 06:3969 | G3 | S | non |
| 17 | `S.pnl24h` = gain depuis le début de SESSION (remis à chaque relance), pas sur 24 h | 08:3362-3366 | G3 | S | non |
| 18 | Mode derrière l'écran : ni `_leverageMarginCheck` ni `_fpEmergencyCheck` (hors de la boucle des modes) — soupçon, levier 0 au backup | 08:3083, 08:3338 ; 08:2918 | G3 | S | oui |
| 19 | security_v1 ne met jamais de veto en 15 min (seuils cv 0,04 / 0,03 hors d'échelle) — soupçon, cv 15 min non mesuré ici | 03:3742, 03:4226 | G3 | M | oui |
| 20 | Plugin Android : notification du service jamais affichée, `configure` sans effet ; côté dépôt le sondage s'arrête après 20 essais (10 s) — soupçon, aura-wrapper non lu (pas de réseau) | native-bridge.js:53-80 | G3 | M | non |
| 21 | `_OUTILS_TABS` : `riskScoreSection` et `calcSection` listées deux fois (un bloc vide chacune) | 07:1140/1147, 07:1205/1208 | G4 | S | non |
| 22 | Module 18 (réparation démo) toujours chargé, inerte (0 faux trade dans les 3 portefeuilles) | AURA8_v118.html:1356 | G4 | S | non |
| 23 | `banc-pont-direct.js` P22 échoue par intermittence (non rejoué ici) | banc-pont-direct.js:442 | G4 | S | non |
| 24 | `boots[].doc` toujours null : `DOC_V` est un `var` dans une IIFE du HTML, invisible pour 09k | AURA8_v118.html:1395-1396 ; 09k:153 | G4 | S | non |
| 25 | Manifeste de relecture : 7 clés jamais écrites par 09b1 (`fullPowerMode`, `_errStats`, `_riskVetoes`, `_botSurplusCarry`, `_fpByBot`, `antiNegReserve`, `_fleetTruthReset0908`) | 09b2:1248 | G4 | S | non |
| 26 | Identifiant de position = milliseconde (`'p'+Date.now().toString(36)`) : deux ouvertures dans la même ms se confondent | 02:6147 ; 03:4769/4835/4932/5031 | G4 | S | non |
| 27 | `ps.pnl24h` = variation de la réponse CoinGecko ; les paires retirées gardent la dernière | 02:954, 02:3972 ; affiché 03:497 | G4 | S | non |
| 28 | `S._convBoost` global calculé sur le mode affiché (effectif seulement hors seuil appris, donc AA) | 08:3280-3295 ; 10f:240-241 | G4 | S | AA seulement |
| 29 | Fenêtre de boot : PAIRS contient encore la paire retirée jusqu'à `_replayPairChanges` | 11:18-27 | G4 | S | non |
| 30 | École derrière un autre écran : toasts silencieux même en verbeux, comptés dans « silenciées » | 08:2503 | G4 | S | non |
| 31 | Ordres LMSR du tick non joués pour l'AA derrière l'écran (marché des sièges partagé) | 08 (multiplexeur 3086-3148) | G4 | M | non |
| 32 | `S.heatmap`, `S.shadow`, `S.decisionCascade` communs aux modes (pas des accesseurs) — la heatmap mêle EV et RE | 02:6872-6884 ; 03:2728 | G4 | S | oui (P3 heatmap) |
| 33 | `_screenMode()` sans lecteur ; `window._bgFrom` jamais effacé | 02:4125 ; 08:3096/3147 | G4 | S | non |
| 34 | Mémoire des trades virtuels jugés (`TH_REC_MAX` 8 000) partagée entre pas de temps | 03:6742 | G4 | S | oui (preuve 1 h) |
| 35 | Coupure plus courte qu'une bougie à cheval sur une clôture : manche et trade virtuel soldés sur le dernier prix d'avant — soupçon | 03 `_mktSettle` / `_thWalk` | G4 | M | oui |
| 36 | `w._lossStreaks = {}` au reset écrit dans le portefeuille (ligne sans effet) | 07:3631 | G4 | S | non |
| 37 | Gel de 14,9 s d'un bouton inline non identifié (la trace LoAF ne garde pas le nom) — soupçon | 00 (aucune capture de nom) | G4 | S | non |
| 38 | Chaque sauvegarde (toutes les 10 s) relit et parse tout le localStorage pour lire `.cycle` | 09b2:159 ; 09b2:928 | G4 | S | non |
| 39 | `window.X` posé dans plusieurs fichiers : `stopSim` {01, 09i}, `applyTheme` {05, 07}, `_auraLastOp` {00, 08, 17b}, `requestAnimationFrame` {00, 03} | — | G4 | S | non |
| 40 | Bancs tolérés : `banc-p7-news` figé (payload absent), `net-expectancy` 18/19, `p6` 28/29 | banc-all.js:22-26 | G4 | S | non |
| 41 | `sw.js` jamais enregistré ; `alert('⛔ Export REFUSÉ…')` bloquant dans Guardian | guardian-core.js:1227 | G4 | S | non |
| 42 | `js/10-fin-bloc-restauration-v93.js` mort (seul js/ non chargé par le HTML ; doublons de `changeProfitSplit`, `_isPairPaused`…) | 10-fin-bloc:2190 | G4 | S | non |
| 43 | `S.fiscalYear` (estimateur par mode) non sauvegardé | 02:4867 ; absent de 09b1 | G4 | S | non (sous franchise) |
| 44 | `tradeContextMemory[].topAgents[].fitness` : 621 valeurs non entières d'avant le 28/09 | backup | G4 | S | non |
| 45 | volume_v1 lit un compte de messages plafonné (presque muet sur les paires liquides) | 03:3955-3960 ; 02:5129 | G4 | M | oui |
| 46 | Le change USD→EUR de l'USDT gardé entre deux trades n'est pas suivi au registre fiscal | 16 (limite dite) | G4 | M | non |
| 47 | Commentaire faux « taux de base non vérifiable d'ici » (vérifié le 02/10 : 0,01 %/8 h) | 03:3095 | G4 | S | non |
| 48 | L'entonnoir peut encore retourner le sens décidé (coalition ≥ 60 %) — limite dite, à trancher | 09c:389-392 | G4 | S | oui |
| 49 | Limites du pont dites : deux onglets actifs au même instant servent deux fois une demande ; PAT lisible par toute page de ramizxhixha-a11y.github.io | 17b:54 | G4 | M | non |
| 50 | Stops chez Binance en RE : décision acceptée, non livrée (sans effet aujourd'hui : RE n'envoie aucun ordre) | — | G4 | L | oui (à l'allumage du RE) |

Hors code (à Rams, pas un défaut de l'app) : tablette sans réseau loin du Wi-Fi / sur batterie (GO VEILLE) ; vieux backups `Download/AURA` ; révoquer l'ancienne clé CoinStats et l'ancien PAT classique ; 2FA GitHub. Constat de stratégie, pas un défaut : la décision n'a pas d'avantage mesuré après frais (le seuil appris garde le marché fermé), « go audit » proposé.

## 2. CORRIGÉ (preuve dans le code + livraison)
- `_fundCache` partagé entre modes → clé par mode, 08:2070 (`20261010a`).
- `_techCache` qui ne servait jamais → retiré, 08:1883 (`20261010b`).
- P1–P8 du 10/10 (régime sur paires vivantes, portefeuille juste, journal / toasts / anti-revenge par mode, EV derrière l'écran surveillé) → `_livePairs` 02:693, `_computePortfolioSans`, `_bgModeWatch` 08:2918 (`20261010b`).
- Toasts de l'AA derrière l'écran sans leur mode → `_toastModeTag` 08:2514 (`20261010b`).
- `banc-verite-donnees` D8 qui échouait entre 3 h et 4 h → heure décalée, banc-verite-donnees.js:372 (`20261004a`).
- Dégel des voix (« pas fait » du 30/09) → statut de gardien = 0, 03:7552 (`20261002a`).
- Drain LMSR de la fitness (`a.fitness -= cost`) → absent du code (`20260928b`).
- EV / RE derrière l'écran sur un `ps.price` daté → `_rcLastPrice` injecté, 08:3097-3101 (`20260927i`).
- Revigoration automatique qui masquait les cassés → retirée (`20260926o`).
- Apprentissage doux de 07 qui écrivait `a.fitness` → seule écriture restante = naissance 07:2879 (`20260926p`).
- Double jugement d'une clôture bot (02 + 10f) → 0 `learnFromOutcome('trade')` dans 10f (`20260926g`).
- Plafond de sens « 2 » posé à la main → plafonds appris `_capFor` 10i:330 (`20260922b`) ; blacklist persistée (`20260922c`).
- `redistributeFitness` → retirée, 02:765 (`20260916e`).
- Fermeture qui lève puis réessaie à chaque tick → `_closeCompleted` 10f:664 (`20260914b`).
- Niveaux ATR `pos.sl` / `pos.tp` jamais exécutés (A13) → 10f:767 (`20260917b`).
- `_startPortfolio = portfolio` (P&L 0 %) → recalage au boot 09b2:733-735 (`20260917c`).
- `_totalCompounded` fossile → plus écrit, 02:6623 (`20260923g`).
- Heatmap écrite par l'AA → EV / RE seulement, 03:2728 (`20260915c`).
- `cut` = plus vieux dans `_auraRotatePurge` → `cutEnd`, 09b2:1028 (`20260915b`).
- Évolution 60 fusions/h → `_EVO_COOLDOWN_MS` 3 600 000, 07:2811 (`20260915b`).
- Veille écran à 1,8 s/frame → réécrite en CSS, 13-veille-ecran.js:1-3 (`20260915b`).
- Ping sans statut HTTP → `S.perfLog.net`, 01:147 (`20260915a`).
- Deux verrous des bougies réelles (filtre 5m, refetch inatteignable) → 02:3812 (`20260914a`) ; `_lossCapSweep` sans appelant → 08:3084 (`20260914a`).
- `chainLog` inondé (preuve effacée en 1 h) → journal des événements (`20260920b`).
- `banc-skill-borne` au token en dur → lit `DOC_V` du HTML, banc-skill-borne.js:123.
- `probeFiles` ne testait pas les CSS → `probeFilesResources` script + css, guardian-core.js:374.
- Audit #19 (mémoire / skill effacés à la fusion) → `20260916a` ; #23 portfolio de l'accueil → `20260917c`.

## 3. PÉRIMÉ (le code ou l'état visé n'existe plus)
- GO DÉMO (f) le bandeau de 18 couvre l'en-tête → plus aucune empreinte (backup : 0 trade sans prix ni mise dans les 3 portefeuilles), le bandeau ne vient plus.
- GO DÉMO (g) évolution sur des fitness tirées au hasard → rejugées depuis (backup : 1 fitness non entière sur 31 sièges).
- Audit §4 « fermer DOT et DOGE à la main » → 0 position ouverte au backup.
- A/B bras B −4,48 $ / 20 trades → A/B reparti (backup : bras A 0 trade, bras B 1).
- Dégât des stats DOT (1b-a, 14/09) → historique coupé à 40 lignes par paire, plus mesurable.
- Clé `aura_mc_slots` du Multi-compte → plus aucun lecteur (05:2560).

## 4. FAUX (énoncé inexact → énoncé juste)
- « `_closeTradesOnExit` ferme toutes les positions » → il ne ferme que les positions AUTO du mode à l'écran : `closePosition(id, true)` renvoie sans rien faire pour une manuelle (02:6290) ; vm : la manuelle reste, l'auto est fermée (le défaut reste ouvert, n° 4).
- « Les 7 bots ne sont jamais entendus par la décision » → seuls Scalper / Arbitrage / DCA votent dans la décision commune (03:6524, 03:6582), mais : risk_bot_v1 est gardien et son veto bloque l'ouverture (03:3699, 03:4211-4216 → 09c:376) ; evolver_v1 est gardien sans veto possible (warn / approve seulement) ; smart_sizer_v1 change la mise (09c:623-631) ; exec_bot_v1 découpe en TWAP (09c:624, 09c:869) ; rescue_bot_v1 ferme tout à −12 % (03:4966-4975) ; rebalance_bot_v1 crée une fermeture `close_skewed` auto-validée (03:5031-5038, 04:1900) ; fiscal_bot_v1 : statut d'écran seulement.
- « `profitSplitCaissePct` : seul le bouton ± l'écrit » → aussi `applySnap` (09b2:388) et l'import de configuration (04:309, champ autorisé 03:5935) ; le doublon de 10-fin-bloc n'est pas chargé.
- « `_snapshotActionCreate` appelé sans définition » → plus grave : le modal ne s'ouvre pas du tout (`listInternalSnapshots` absent, 09g:222) ; ouvert, n° 5.
- « `globalMemoryPool` dit won:false pour un gain » (audit #18) → `won` = l'agent avait raison (03:1418 / 03:1445), pas le trade gagnant ; au backup, 29 / 30 épisodes sont des agents qui se sont trompés sur un trade gagnant : cohérent (nom de champ trompeur seulement).
- « `cashLog` EV mort depuis le 07/07 » → vivant (déjà corrigé le 23/09) ; backup : dernière entrée EV le 11/10 18:41 (`profit_split` 0, cf. n° 6).
- « native-bridge interroge le plugin toutes les 500 ms » → 20 essais seulement, puis arrêt (native-bridge.js:75-80).

## Bilan
90 statuts rendus — ouverts 50 (G1 3, G2 9, G3 8, G4 30), corrigés 27, périmés 6, faux 7. Quatre « faux » restent aussi ouverts sous leur énoncé juste (n° 4, 5, 6, 20) → 86 points distincts.
Preuves vm de ce dossier : `vm_exit.js` (n° 4), `vm_pyramide.js` (n° 1 et 3), `vm_levier.js` (n° 2), `vm_snap.js` (n° 5), `vm_re.js` (n° 8) ; extracteur `fnsrc.js` (repris de banc-portefeuille-juste).

## Non couvert
Pas vérifié : leçons ×0,008 (A8), plancher 10 $ d'`executePending` (A4), compteur « jugements réels » qui compte les abstentions, gardiens qui misent au marché LMSR, onchain_v1 (un seul gène), balayage de sortie 10f (`ps.price` contre `_rcLastPx`) au-delà de 10f:709, autres écrans manuels (07 « MANU enrichi »), « position manuelle sans réserve de frais », heap / DOM sur 24 h, `S.cycle` par paire, la passation lignes 120-145 (portes TENDANCE, mesures sans code) lue en diagonale. Pas rejoué : `banc-all`, P22.
