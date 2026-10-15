<!-- [GO RÉGLAGES · 14/10/2026] Audit en lecture seule de l'onglet « 🛠 Outils » (ETAT n° 17), fait par un agent séparé sur le code 20261013a.
     Décision de la livraison 20261014a : l'onglet reste sans bouton d'accès tant que ses outils ne sont pas corrigés (registre ETAT § 3).
     Les scripts vm sont dans rejeu/reglages-20261014/vm/ ; ils lisent le backup réel non versionné rejeu/backups/pont/aura_guardian_full_20261014-184539.json
     (en prendre un neuf par `node rejeu/pont.js backup` et changer le chemin). Les numéros de ligne datent du code 20261013a. -->

# Audit onglet « 🛠 Outils » (_OUTILS_TABS.outils) — lecture seule — 14/10/2026

## SYNTHÈSE

**Aucune des 14 sections (15 entrées) n'est entièrement OK.** Aucun gestionnaire `on*=` n'appelle une fonction non définie (inventaire scripté `rejeu/reglages-20261014/vm/handlers.js`) ; les pannes sont ailleurs : ids DOM absents, chiffres inventés, écritures silencieuses, exports non prouvés sur la tablette.

| # | section | verdict d'ensemble | décision avant d'exposer l'onglet |
|---|---|---|---|
| 1 | whatifSection | lecture seule, 2 libellés faux (DD « max », réel brut vs simulé net) | exposable après libellés |
| 2 | backtestSection | lecture seule ; teste un croisement EMA 9/21, pas la décision AURA ; « Seuil signal » = écart EMA (vm : 51 % → 190 trades, 60 % → 7, 70 % → 0) | exposable après libellés |
| 3 | replaySection | lecture seule ; journal 🔗 daté « maintenant » et rejoué après tous les trades (0/188 `chainLog.push` ont un `ts`) ; « P&L Net » brut | exposable après correction de l'ordre |
| 4 | urgenceSection | **DANGEREUX** « Fermer toutes » sans confirmation ; **DANGEREUX** « Pause bot » = AUTO→MANU global sans confirmation ni `setBotMode`, et coupe les sorties du cycle 10f (signal inversé / timeout, 10f:348) et le balayage d'horizon (10f:692) ; le moteur de sortie 07 (trailing, SL/TP, conflit) continue ; **MENT** « Mises à 10 % » (aucun effet) ; **MENT** « Backup d'urgence » (lien blob, aucun retour visible) ; **PLANTE** « Mode urgence plein écran » (`#urgenceOverlay` absent) | **refaire** : confirmation + `setBotMode`, retirer Mises/overlay/phrase SOS, backup via `exportState` |
| 5 | stressTestSection | MENT : perte sur l'USDT libre, levier ignoré, mises retirées deux fois, « agents résistants » = fitness > 200 quel que soit le scénario (vm) | **retirer** |
| 6 | adnSection | MENT : taille/régime/durée constants (240/240, vm), paire vide ; écrit `t.adn` dans l'historique (+82 Ko EV) | **retirer** |
| 7+10 | calcSection (×2) | MENT : perte au SL ignore le levier (×3 : −28 $ affiché, −60 $ réels), frais « A/R » doublés, Kelly 0 → « ✅ dans les clous » ; 2e entrée = div vide | **corriger** + supprimer 07:1208 |
| 8 | paperUltraSection | MENT : pas d'interrupteur, curseurs désactivés, frictions appliquées à aucun trade | **retirer** |
| 9 | diffSection | MENT : le format FULL quotidien (`aura_guardian_full`) est lu comme vide (vm) ; emplacements auto toujours effacés | **corriger** (déballer `.aura`) |
| 11 | vaultSection | **PLANTE** : `RangeError` au chiffrement de l'état réel (vm, 3,6 Mo) ; **DANGEREUX** par construction (`Object.assign(S, …)`, remplace walletStore/AUTO-MANU/agents) | **retirer** |
| 12 | autoBackupSection | MENT : emplacements effacés au rendu, interrupteur/heure jamais lus, « backup manuel » = saveState ordinaire | **retirer** |
| 13 | pdfReportSection2 | MENT (net brut −20,41 vs −60,09 réel, mode RE mal nommé, « mensuel » sans filtre, agents 0 trade) ; trie `S.agents` EN PLACE à chaque rendu | **corriger** |
| 14 | xlExportSection | MENT : paire vide, agents 0, funding 0, toast « téléchargé » inconditionnel (blob) | **corriger** |
| 15 | hebdoSection | MENT : par paire = « undefined » (vm) ; gabarit PDF contient ~100 lignes de DOM de l'appli (07:991-1097) | **corriger** |

**À retirer (6)** : stress test, ADN, Paper Ultra, coffre, auto-backup, 2e calcSection. **À refaire (1)** : urgence. **À corriger (5)** : calculateur, diff, PDF, Excel, hebdo. **Exposables après libellés (3)** : what-if, backtest, replay.

Faits établis revérifiés (lignes actuelles) : `urgenceCloseAll` → `closePosition(pos.id, false, { urgence: true })` 06:709 ✔ ; « Pause bot » `S.botAutoMode=false` 06:730 + `a._paused=true` 06:733, seule occurrence de `._paused` dans tout le code chargé ✔ ; « Mises à 10 % » écrit 06:744-747, l'ouvreur lit `stakeOverride`/`ps.stake`/`_stakeFloor()` 09c:361-363 ✔ ; `applyRealisticFrictions(` appelée seulement par `simulateRealisticTrade` 06:2346 ✔.

Méthode : code relu (fichier:ligne cité partout) ; grep sur les 55 scripts js chargés + HTML + guardian-*.js ; vrai code exécuté en `vm` Node sur le backup réel `rejeu/backups/pont/aura_guardian_full_20261014-184539.json` (scripts dans `rejeu/reglages-20261014/vm/` : vm_stress, vm_lecture, vm_hebdo, vm_vault, vm_rapports, vm_backtest2, handlers). **Non prouvé** (supposé) : comportement des liens blob, de `window.open`/`print()` dans le WebView Capacitor de la tablette (seul indice : commentaire 09b3:114-115) ; limite exacte de la pile V8 sur l'appareil. Aucun fichier du dépôt modifié.

---
## 0. Mécanique de l'onglet (lu)

- `_OUTILS_TABS.outils` : js/07-v90-mode-bunker-sos.js:1196-1215 (15 entrées ; `calcSection` aux lignes 1205 et 1208 ; `whatifSection` et `replaySection` existent AUSSI dans l'onglet analytics 07:1161-1162 avec d'autres fonctions de rendu).
- Accès : AURA8_v118.html:1376-1380 = 5 boutons (analytics, agents, trading, alertes, ui) — aucun `switchOutilsTab('outils')`. `openOutils(tab)` (07:1218) n'est appelé que par AURA8_v118.html:633 avec `'analytics'`.
- `_renderOutilsTab` (07:1241-1286) : crée un `<div id=…>` par entrée (07:1249-1251), puis appelle `window[render]()` / `window[init]()` dans un try/catch qui ne fait que `console.warn` (07:1282). Conséquence pour `calcSection` en double : deux `<div id="calcSection">` ; `renderCalcSection` vise `getElementById('calcSection')` → le 1er div est rendu DEUX fois, le 2e reste vide (supposé d'après 07:1249 + getElementById ; à confirmer en lisant 06:1972).
- Aucune des 15 ids de section n'existe ailleurs dans le HTML ni dans les js chargés (grep `id="…"` vide) : pas de collision hors panneau.

Légende verdicts : OK · MENT · PLANTE · DANGEREUX. « lu » = code relu à la ligne citée ; « supposé » = déduction non exécutée.

---

## 1. whatifSection — `initWhatIfSection` (js/04-v8-0-livraison-35-mode-max-permissif-v.js:2715-2786)

Note : l'onglet analytics rend la même div avec `renderWhatifSection` (08:3555 → `initWhatifSection` 08:3505, autre simulateur). Deux what-if différents sous le même id selon l'onglet.

| contrôle | promesse | fait réellement (fichier:ligne) | verdict | remède |
|---|---|---|---|---|
| Pré-remplissage (≥ 5 trades) | « Modifie les paramètres… » ; curseurs initialisés sur « tes » valeurs | lit `ps.trades` type `position` (04:2720-2722) : WR sur `pnlUsdt` (04:2726), gain/perte moyens en % (04:2728-2729), mise = moyenne de `ps.stake` (04:2731-2732, réglage de paire, pas la mise réelle des trades `stakeUsdt`). `pnlUsdt` est BRUT de frais (10e6:15) et le WR n'est pas filtré par mode (pairStates est multiplexé par mode via accesseur, 02:6831 → donc mode actif seulement). Lecture seule. | OK (approximatif : mise = réglage de paire) | lire `t.stakeUsdt` au lieu de `ps.stake` |
| 6 curseurs (Stake, WR, Gain moy., Perte moy., Nb trades, Frais) | recalcul immédiat | `oninput` → écrit `_WI_PARAMS.*` (variable locale du module, 04:2706) + `updateWhatIf()` (04:2744-2774). Rien dans S. | OK | — |
| « P&L Net estimé » | résultat de la simulation | formule déterministe `nWins·stake·avgWin − nLoss·stake·avgLoss − trades·stake·fees·2` (04:2789-2799). Pas de composition, pas d'aléa. | OK (modèle simple, assumé) | — |
| « DD max estimé » / « Pire série ~N pertes cons. » | pire drawdown probable | `ceil(log 0.05 / log(1−wr))` × mise × perte (04:2804-2805) — série de pertes atteinte avec 5 % de proba sur UN tirage, sans tenir compte du nombre de trades. Pour wr=0,9 → 2. | MENT (léger : l'étiquette dit « max », le calcul est une série-type indépendante de N) | libellé « série de pertes typique » ou formule dépendant de N |
| « Comparaison avec tes vrais trades » | P&L réel vs simulé | `realPnl` = somme `pnlUsdt` (BRUT, 10e6:15) comparé au simulé NET de frais (04:2846-2849) ; ne lit pas les trades `urgence` (type ≠ position, 02:6363). Libellé « P&L réel » sans « brut ». | MENT (léger : brut vs net comparés comme égaux) | libeller « P&L réel brut » ou soustraire `S.fees` |

Verdict section : **utilisable, lecture seule**, 2 libellés à corriger.

## 2. backtestSection — `initBacktestSection` (04:2875-2909) + `runBacktest` (04:2912-3073)

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Sélecteur Paire | paires de l'app | `Object.keys(PAIRS)` (04:2878) — les 8 paires codées en dur 02:197-207 ; les paires ajoutées dynamiquement (`S.customPairs`, `dynamicPairKeys`) absentes (supposé : non vérifié s'ils mutent PAIRS). | OK | — |
| Sélecteur Timeframe (« 15m (~5.2j) ») | durée couverte | `limit=500` (04:2929) : 500×15 min = 5,2 j, 500×5 min = 1,7 j, 500×1 h = 20,8 j, 500×4 h = 83 j — cohérent. | OK | — |
| « Seuil signal (%) » 51-90 | seuil de conviction du signal | seuil = `1+(thresh−0.5)·0.01` sur le ratio ema9/ema21 (04:2982, 2986) : 60 % → ratio > 1,001 ; mais le signal n'est pris QUE le jour du croisement (prevE9≤prevE21 && e9>e21, 04:2982), où le ratio vaut ≈1 → le seuil filtre presque tout au-delà de ~55 % — exécuté (vrai `runBacktest` en vm, 20 séries synthétiques de 500 bougies, `rejeu/reglages-20261014/vm/vm_backtest2.js`) : 51 % → 190 trades, 55 % → 58, 60 % (défaut) → 7, 70 % → 0 ; sur les 60 bougies réelles du backup : 51 % → 1-2 trades, ≥ 55 % → « Aucun signal ». La machine d'audit est bloquée par Binance (« restricted location »), données réelles 500 bougies non rejouées. N'a rien à voir avec le « seuil » de décision de l'app (dcThreshold/LMSR). | MENT (le nom suggère le seuil du bot ; c'est un écart EMA) | libellé « écart EMA min. au croisement » |
| « Stake ($) » | mise par trade | utilisé tel quel (04:2998-2999), aucune écriture dans S. | OK | — |
| « ▶ Lancer le Backtest » / « Données Binance réelles » | backtest sur données réelles | `fetch api.binance.com/api/v3/klines` (04:2929-2930) — vraies bougies ; la STRATÉGIE testée est un croisement EMA 9/21 + TP 3 % / SL 2 % (04:2947-2995), PAS la décision d'AURA (agents, LMSR, portes). Le pied l'écrit (« Stratégie EMA 9/21 · TP 3% / SL 2% », 04:3064). Frais 0,1 %×2 fixes (04:2963, 2999) au lieu de `S.feeConfig` (02:533 = 0,001 aussi, + slippage ignoré). Clôture au close de bougie (pas d'intrabar TP/SL). Aucune écriture dans S. Erreur réseau → message (04:3066-3068). | OK pour ce qu'il affiche ; trompeur par son emplacement (on croit tester le bot) | sous-titre « stratégie EMA de démonstration, pas la décision AURA » |
| « Profit Factor » | PF | `(avgWin·pW)/(avgLoss·pL)` en % (04:3025) — c'est un ratio d'espérance en % non pondéré par la mise ; mise constante → équivalent à Σgains/Σpertes en % mais calculé sur `pnlPct` BRUT alors que wins/losses sont classés sur `netPnl` (04:3019-3020). | MENT (léger : PF brut, classement net) | calculer sur `netPnl` |

Verdict section : **lecture seule, inoffensive** ; à étiqueter honnêtement (ce n'est pas un backtest du bot).

## 3. replaySection — `initReplaySection` (04:3084-3113), `_buildReplayEvents` (04:3116-3170), `replayPlay/Pause/Reset` (04:3172-3212), `_showReplayEvent`/`_updateReplayUI` (07:1307-1362)

Note : l'onglet analytics rend le même id via `renderReplaySection` (08:3499 → `initReplaySection`), donc même code.

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Compteur « N événements » | événements de la session | trades `type==='position'` de `S.pairStates` du MODE ACTIF (04:3120-3121 ; accesseur 02:6831), `S.dreamJournal` (04:3135), 50 derniers `S.chainLog` (04:3148). Les fermetures `urgence` (02:6363) ne sont pas rejouées. | OK (partiel) | — |
| Ordre chronologique | « Replay de Session » trié par ts | les entrées chainLog n'ont AUCUN champ `ts` (0 sur 188 `chainLog.push` des js chargés, compté par script ; ex. 06:716, 02:7311) → `ts: e.ts||Date.now()` (04:3150) : TOUTES les lignes du journal reçoivent l'heure de construction et sont triées APRÈS tous les trades (04:3160) ; l'horloge `rpClock` (07:1344-1345) affiche alors l'heure actuelle pour elles. | MENT (le « replay » n'est pas chronologique : trades+rêves d'abord, tout le journal à la fin, horodaté « maintenant ») | trier les seuls trades/rêves, ou dater chainLog |
| Texte d'un trade | « LONG/SHORT · +$x (y %) · Prix » | `t.side==='buy'` → LONG (04:3127) : correct (02:6362 écrit buy pour long) ; « Prix » = prix de SORTIE (02:6365 `price: cur`). | OK | — |
| « ▶ Play » / « ⏸ Pause » | lecture animée | `setInterval` 800/speed ms (04:3186-3195) ; pause = `clearInterval` (04:3199-3204). Lecture seule. | OK | — |
| Sélecteur vitesse ×1…×10 | change la vitesse | `onchange` écrit `_RP.speed` (04:3093) mais l'intervalle est fixé au lancement (04:3195) : effet seulement après Pause+Play ; plancher 150 ms → ×10 = ×5,3 réel. | MENT (léger) | relancer le timer dans onchange |
| « ↺ Reset » | revenir au début | `replayPause` + idx=0 + vide le flux (04:3206-3212). | OK | — |
| « P&L » cumulé / WR | P&L de la session | somme `pnlUsdt` BRUT (04:3128, 10e6:15 ; 07:1335). Libellé « P&L Net » dans les mini-stats (07:1358) alors que c'est brut. | MENT (léger) | libellé « P&L brut » |
| Toast vide « lance des trades ! » | — | 04:3173 | OK | — |

Verdict section : **lecture seule, inoffensive**, mais le « replay » est faux dans l'ordre (journal daté au moment du clic) et « Net » est brut.

## 4. urgenceSection — `renderUrgenceSection` (js/06-v63-patterns-chartistes.js:773-824) + actions 06:698-766

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Statut « Bot ✅ Actif / ⏸ Pause » | état du bot | `S.botAutoMode||false` (06:778) — reflète AUTO/MANU du mode. | OK | — |
| Texte « Appuie sur SOS (bouton flottant en bas à droite) » | un bouton SOS flottant existe | aucun bouton SOS ni `openUrgence` dans AURA8_v118.html ; seuls appelants de `openUrgence` : 06:819 (ce panneau) et 06:1689 (Risk Score ≥ 70). Le seul « SOS » du HTML est le nom du script (html:1310). | MENT | retirer la phrase |
| « 🛑 Fermer toutes les positions » | ferme tout | **fait établi revérifié** : `closePosition(pos.id, false, { urgence: true })` (06:709) — la porte légitime (02:6182-6183) ; ligne d'historique `type:'urgence'` (02:6363), frais payés et impôt au registre (02:4562-4565), pas d'apprentissage (02:6239-6588 `!_urg`). Toast « 🚨 URGENCE: N position(s) fermée(s) » (06:723). **Aucune confirmation** : un seul tap ferme toutes les positions du mode affiché, manuelles comprises (pas de `botClose`, 06:709) — alors que le bouton « Fermer ⊗ » de l'en-tête passe par une fiche de confirmation (02:7297 `confirmCloseAll`). Le journal dit « (avant frais) » (06:716) : exact (pnlUsdt brut). | DANGEREUX (pas de confirmation) | `confirm()` qui liste paires, mises et P&L latent avant d'appeler |
| « ⏸ Pause bot immédiate » | « Bot en pause — aucun trade ne sera ouvert » | **fait établi revérifié** : `S.botAutoMode=false` (06:730) **directement**, pas via `setBotMode` (02:6855 : chainLog, sauvegarde immédiate, chips) ; `S.mode='manual'` (06:731 — champ lu nulle part ailleurs, grep `S\.mode\b` : 06:731 et 06:3274 seulement) ; `a._paused=true` sur chaque agent (06:733) — **jamais lu** (grep `._paused` : seule écriture 06:733) ; log « N agents suspendus » (06:735) = faux. Effet réel : 09c:63/70 refusent l'ouverture → la promesse du toast est tenue ; MAIS aussi 10f:348 et 10f:692 : le bot ne fait plus les sorties du cycle 10f (signal inversé / timeout) ni le balayage d'horizon `_botExitSweep` ; le moteur de sortie de 07 (`learnFromOpenPositions` : trailing, SL/TP, conflit cerveau, 07:3336-3384) n'est pas conditionné par AUTO/MANU et continue — non dit. Bascule AUTO→MANU (registre : « AUTO / MANU : Rams seul ») sans confirmation, sans journal 🔗. Bouton grisé si déjà MANU (06:809). `updateModeButton?.()` existe (04:2220). | DANGEREUX (AUTO→MANU sans confirmation, effet de bord non dit sur les sorties du bot) + MENT (« agents suspendus ») | appeler `setBotMode(false)` après `confirm('Passer en MANU : le bot n'ouvre plus ET ne ferme plus ses positions')` ; supprimer `a._paused` et `S.mode` |
| « 📉 Mises à 10% » | « Mises réduites à $X/trade », « Stakes agents réduits à 10% » | **fait établi revérifié** : écrit `S.stakeConfig.defaultStake` (06:744, et `S.stakeConfig` n'est initialisé nulle part dans 02 → no-op probable), `S.stakeUsdt` (06:745), `a.stake` (06:747 ; les agents de 02:576+ n'ont pas de champ `stake` → no-op). L'ouvreur lit `stakeOverride` / `ps.stake` / `_stakeFloor()` (09c:361-363) — rien de ce qu'on écrit. `S.stakeUsdt` n'est lu que par 06/07 (urgence, bunker). Aucune réduction réelle. Écrit en revanche `stakeUsdt` dans S, champ de décision listé par l'import (04:70). | MENT (aucun effet sur les mises) | retirer le bouton, ou le brancher sur un plafond lu par 09c (porte TALENT/SOURCE requise, règle 10) |
| « 💾 Backup d'urgence » | « Backup d'urgence sauvegardé » + nom de fichier | `JSON.parse(JSON.stringify(S))` (06:756 — S entier ≈ 2,3 Mo d'après le commentaire 06:1077-1078), puis lien blob + `a.click()` (06:758-765). Le log « 💾 sauvegardé » s'écrit sans savoir si le fichier existe. Dans le WebView Android, « un WebView Android ne déclenche PAS le téléchargement d'un lien blob (a.click) » (commentaire 09b3:114-115) ; le chemin qui marche est `_shareOrDownloadJSON` (09b3:197, plugin Filesystem / partage). Format : S brut (pas `buildSnapshot`), accepté par `importState` (exige seulement `cycle` numérique, 09b3:30). | MENT (dans l'APK : annonce une sauvegarde qui n'a probablement pas eu lieu — *supposé* d'après le commentaire 09b3, non testé sur l'appareil) | brancher sur `exportState()` (09b3:336) ou `_shareOrDownloadJSON(JSON.stringify(_buildFullBackupFile()), …)` |
| « 🚨 OUVRIR MODE URGENCE PLEIN ÉCRAN » | ouvre un overlay plein écran | `openUrgence()` (06:681-689) cherche `#urgenceOverlay`, `#urgSub` ; `_urgAppendLog` cherche `#urgLog` (06:677). **Aucun de ces ids n'existe** dans AURA8_v118.html ni dans les js chargés (grep vide ; seul le CSS css/22-features-v16-v69.css:1466 le stylise). `if(el)` → rien ne s'affiche, aucune erreur, aucun toast. | PLANTE (vise un id DOM absent : clic sans effet visible) | retirer le bouton (et celui de 06:1689) ou créer l'overlay |

Verdict section : **à retirer ou à refaire avant d'exposer** (1 DANGEREUX sans confirmation sur l'argent, 1 DANGEREUX AUTO/MANU, 1 MENT sur les mises, 1 PLANTE).

Compléments urgence (lus) :
- « Fermer toutes les positions » ne ferme que le mode AFFICHÉ : `S.openPositions` est un accesseur vers le portefeuille du mode actif (02:6827-6833 liste, 02:6838-6850 accesseur). Un mode qui tourne derrière l'écran garde ses positions. Libellé « toutes » faux.
- « Pause bot » est GLOBAL : `botAutoMode` n'est pas dans la liste des champs par mode (02:6827-6833) → AA, EV et RE à la fois ; persisté par l'autosave 10 s (09b2:856-868 ; 09b1:60).
- « Mises à 10 % » : dans le backup réel du 14/10 18:45 (`rejeu/backups/pont/aura_guardian_full_20261014-184539.json`), `stakeConfig` et `stakeUsdt` sont absents et 0/31 agents ont un champ `stake` → les 3 écritures (06:744-747) ne visent rien d'existant sauf `S.stakeUsdt`, que seuls 06/07 lisent.
- « Backup d'urgence » : `_urgAppendLog` écrit dans `#urgLog` (absent) et `urgenceSaveBackup` n'a aucun `showToast` (06:754-766) → depuis ce panneau, AUCUN retour visible, réussite ou échec.
- Après chaque action, la section n'est pas re-rendue (aucun appel à `renderUrgenceSection` dans 06:698-766) : compteur « Positions ouvertes » et boutons grisés restent périmés.

---

## 5. stressTestSection — `renderStressTestSection` (06:582-666), `_runStressTest` (06:535-580), `selectStScenario` (06:522), `updateStCustom` (06:528)

Exécuté en vm (vrai `_runStressTest`, portefeuille EV du backup réel 14/10 18:45 ; script `rejeu/reglages-20261014/vm/vm_stress.js`) :
`0 position · crash2022 : capital 1075.70 → après 817.53 · perte 258.17 (longs 0, libre 258.17) · agents résistants 18/31 · WR bots 50→26`
`1 long 100$ ×3 · flash_crash : capital 975.70 → … perte 145.08 (longs 40.00, libre 105.08)`

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Cartes scénario (6) | choisir un scénario | `selectStScenario(key)` → variable de module + re-rendu (06:522-526). Lecture seule. | OK | — |
| Curseur « Crash % » (scénario perso) | régler la chute | `updateStCustom('drop',v)` → re-rendu COMPLET de la section à chaque `input` (06:528-532, 06:622) : le curseur est remplacé pendant le glissé (supposé : le doigt « décroche » sur tablette, non testé). `_stCustomStake` est réglable dans le code mais jamais lu (06:543 `avgStake` inutilisé). | OK (fonctionnel), ergonomie douteuse | `onchange` au lieu de `oninput` |
| « Impact simulé · Capital actuel / après / Perte totale » | « Simulation basée sur ton portfolio actuel » (06:661) | `capital = S.tradingAccount` seul (06:540) — ni la caisse, ni les mises engagées (déjà retirées du trading à l'ouverture : 09c:833, 02:6088). Puis `freeCapital = capital − totalStake` (06:555) retire les mises UNE 2e FOIS. Le capital libre (USDT) perd 30 % × la chute (06:556) : un compte 100 % USDT sans position « perd » 258 $ dans le crash 2022 (vm ci-dessus). Les longs perdent `stakeUsdt × chute` sans levier ni exposition (06:548-550 ; vm : long 100 $ ×3 à −40 % → 40 $ au lieu de la mise entière). Shorts « hedge partiel ×0,8 » (06:552) arbitraire. | MENT (chiffres fabriqués présentés comme l'impact sur TON portefeuille) | retirer, ou recalculer sur `totalExposure` et sans perte sur l'USDT libre |
| « WR bots après » | effet du scénario sur les bots | `max(20, WR + drop×0,3)` (06:566) — formule inventée. | MENT | retirer la tuile |
| « N agents résistants / cassés » | résistance des agents au scénario | `fitness > 200` (06:569) — indépendant du scénario (18/31 pour TOUS les scénarios, vm). | MENT | retirer |
| Recommandations | conseils | dérivées des chiffres ci-dessus (06:591-596). | MENT (par héritage) | — |

Verdict section : **à retirer** (lecture seule, mais tout le chiffrage est inventé).

## 6. adnSection — `renderAdnSection` (06:4177-4248), `_buildAdnSignature` (06:4098-4140), `_adnAnnotateTrades` (06:4159-4168), `_adnBestPatterns` (06:4143-4156), `setAdnFilter` (06:4171)

Exécuté en vm (vraies fonctions, 240 trades EV du backup réel ; `rejeu/reglages-20261014/vm/vm_lecture.js`) :
`G3 taille : {"Mise normale":240} · G4 régime : {"Calm":240} · G7 durée : {"Durée inconnue":240} · champ pair : 0/240 · pairStates EV 338 Ko → 420 Ko`

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Ouverture de la section | « 🧬 ADN des Trades … empreintes » | `_adnAnnotateTrades()` ÉCRIT un champ `t.adn` (8 gènes + hash) dans CHAQUE ligne `position` de `S.pairStates` du mode affiché (06:4163), sans le dire. L'historique est sauvegardé en entier via `walletStore` (09b1:63) → +82 Ko sur le seul portefeuille EV (vm). Aucun lecteur de `.adn` hors 06 (grep). Non destructif. | DANGEREUX au sens strict (écriture silencieuse dans l'historique) — non destructif | calculer l'ADN à l'affichage sans l'écrire dans `t` |
| Gène « Taille » | grosse / petite / normale | `ps.avgStake` n'existe pas (grep : seule variable locale 09b3:265) → ratio = mise/mise = 1 → toujours « Mise normale » (06:4113 ; vm 240/240). | MENT | calculer la moyenne des `stakeUsdt` |
| Gène « Régime » | régime au moment du trade | lit `trade._regime`, jamais écrit (grep : seul lecteur 06:4117 ; 02:6361-6374 ne l'écrit pas) → toujours « Calm » (vm 240/240). | MENT | retirer le gène ou l'enregistrer à la clôture |
| Gène « Durée » | scalp / court / moyen / long | lit `trade.closedAt`, jamais écrit sur ces lignes (02:6361-6374 : `entryTs`, `ts`) → toujours « Durée inconnue » (vm 240/240). | MENT | utiliser `ts − entryTs` |
| Gène « Heure » | heure du trade | `new Date(trade.ts)` = heure de CLÔTURE (02:6372 `ts: Date.now()`) ; le commentaire d'en-tête dit « au moment de l'ouverture » (06:4092). L'écran ne précise pas. | OK (ambigu) | libeller « heure de clôture » ou lire `entryTs` |
| Nom de paire sur chaque carte | paire du trade | `t.pair` n'existe pas sur les lignes d'historique (0/240, vm ; 02:6361-6374) → nom vide, couleur par défaut (06:4227-4230). | MENT | parcourir `Object.entries(S.pairStates)` et joindre la paire |
| « 🏆 Configurations les plus performantes » | meilleures configurations | triées par taux de réussite seul (06:4155), affichées en vert même à P&L négatif : sur le backup réel la 1re est « Soir · Short · Mise normale · Calm · 3 tr · P&L −2,49 » (vm). Clé = 4 gènes dont 2 constants → regroupe en fait heure × côté. | MENT | trier par P&L ou espérance, n ≥ 10 |
| Filtres Tous / Gagnants / Perdants | filtrer | `setAdnFilter` (06:4171) + filtre sur `pnlUsdt` (06:4190-4191). | OK | — |

Verdict section : **à retirer** (3 gènes sur 8 constants, paire vide, écrit dans l'historique).

## 7. calcSection — `renderCalcSection` (06:1972-2075), `_runCalc` (06:1912-1969), `calcUpdate` (06:1892), `calcSetPair` (06:1898), `calcSetRiskPreset` (06:1906)

Entrée en double dans l'onglet (07:1205 et 07:1208) : deux `<div id="calcSection">` (07:1249-1251) ; `getElementById` rend dans le 1er, deux fois ; le 2e reste vide (déjà au registre promesses.md:75-79, revérifié).

Exécuté en vm (vrai `_runCalc`, compte EV du backup réel) :
`1er rendu : capital utilisé 1000 (compte trading 1075.70)` ·
`levier ×1 : « Montant risqué » $20 · « Si SL » −22,67 · perte réelle 20 · R/R 2.00 · frais 2,67 pour 0,1 % « A/R » sur 1 333 $` ·
`levier ×3 : « Montant risqué » $20 · « Si SL » −28,00 · perte réelle au SL 60 · R/R affiché 6.00` ·
`TP 1 % / SL 1,5 % : Kelly 0,0 % → « ✅ Ton risque est dans les clous Kelly »`

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Sélecteur Paire | prix d'entrée de la paire | `calcSetPair` prend `ps.price` (06:1898-1902). Lecture seule. | OK | — |
| LONG / SHORT | côté | `_CALC.side=…; renderCalcSection()` (06:1993-2002) ; SL/TP du bon côté (06:1936-1937). | OK | — |
| Capital (pré-rempli) | « Sync capital avec le compte réel » | `_runCalc()` est appelé (06:1976) AVANT la synchro (06:1982) : le 1er rendu calcule sur 1 000 $ alors que le champ affiche 1 076 (vm). | MENT (léger, 1er affichage) | synchroniser avant `_runCalc` |
| Risque % + presets | montant risqué | `cap × risque` (06:1923) ; presets OK (06:2025). | OK | — |
| Levier | taille avec levier | `stakeLev = stakeUsd × lev` (06:1928) mais « Montant risqué » et « Si SL atteint » ignorent le levier (06:1943) ; R/R multiplié par le levier (06:1941, 1950) : à ×3, perte réelle 60 $ affichée −28 $, R/R 6 au lieu de 2 (vm). | MENT (sous-estime la perte d'un facteur = levier) | `pnlSL = −exposure × slPct` ; R/R sans levier |
| Frais A/R | frais aller-retour en % | le champ est déjà « A/R » (libellé 06:2041, commentaire 06:1887) mais le calcul multiplie encore par 2 (06:1946) → 0,1 % saisi = 0,2 % facturé. | MENT | retirer le `× 2` ou libeller « par côté » |
| Kelly | « basé sur ton WR réel (x %) » | la formule utilise 50 % tant que ≤ 10 trades (06:1959) alors que le texte affiche le WR réel (06:2071) ; si Kelly = 0 (espérance négative), le texte dit « ✅ Ton risque est dans les clous Kelly » (06:2072 ; vm). | MENT | « ⚠ espérance négative : ne pas trader » quand Kelly ≤ 0 |
| Aucune écriture dans S (06:1892-1910). | | | OK | supprimer l'entrée en double 07:1208 |

Verdict section : **à corriger** (levier, frais doublés, Kelly) ; lecture seule.

## 8. paperUltraSection — `renderPaperUltraSection` (06:2350-2433), `togglePaperRealistic` (06:2281), `updatePrCfg` (06:2289), `togglePrBool` (06:2296), `applyRealisticFrictions` (06:2304-2340)

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| « Frictions réalistes » (bloc « Toggle principal ») | interrupteur ON/OFF | le bloc est VIDE : aucun bouton (06:2367-2374). `togglePaperRealistic` n'a aucun appelant dans les js chargés ni le HTML (grep : définition 06:2281 + export seulement). `enabled` reste `false` (06:2265) ; badge « INACTIF » (06:2362). | MENT (interrupteur annoncé, absent) | — |
| 8 curseurs (slippage, spread, latence…) | régler les frictions | `disabled` tant que `enabled=false` (06:2408) → inutilisables. `latencyMs` n'est lu nulle part (grep : 06:2269 défaut + 06:2398 curseur). `S.paperRealisticConfig` n'est pas sauvegardé (absent de 09b1/09b2 ; absent du backup réel). | MENT | — |
| « Fills partiels ON/OFF » | bascule | `pointer-events:none` tant qu'inactif (06:2421). | MENT | — |
| Texte « Les frictions sont appliquées à chaque ouverture de position en mode Simulation » (06:2429) | effet sur les trades AA | **fait établi revérifié** : `applyRealisticFrictions(` n'a qu'un appelant, `simulateRealisticTrade` (06:2346), l'aperçu de la carte. Aucun ouvreur (09c, 02 `openPosition`) ne l'appelle. | MENT | — |
| Aperçu « Impact simulé sur un trade de $100 » | coût des frictions | tirages aléatoires à chaque rendu (06:2318, 2323) ; ordre non rempli → `finalStake 0` affiché « $100.000 » (06:2385 `||100`). Moot tant qu'inactif. | MENT (si activé) | — |

Verdict section : **à retirer** (section entièrement inerte et texte faux).

## 9. diffSection — `renderDiffSection` (06:2147-2252), `loadDiffBackup` (06:2083-2106), `loadDiffFromAutoSlot` (06:2109-2120), `clearDiff` (06:2122)

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| « 📂 Charger un backup JSON » | comparer l'état actuel à un backup | lit le fichier, ne déballe que `{meta, state}` (06:2093). Le format que l'app produit chaque jour — `aura_guardian_full` `{_type, aura:{…}}` (09b3:137-147, auto-téléchargement 09b3:417-436, Guardian, Drive) — n'est PAS déballé : vm sur le backup réel → `portfolio undefined · totalTrades undefined · agents 0` → « Avant : $0.00, 0 trades, 0 agents ». Le format `exportState` (`nexus_save_*.json` = `buildSnapshot`, 09b3:336-363) marche (champs 09b1:56, 178, 191-192). Les deux côtés sont le mode affiché au moment de chaque sauvegarde (accesseurs 02:6827) : comparer un backup EV à l'écran AA mélange les modes sans le dire. Lecture seule (`_diffSnapshot` variable de module). | MENT (format principal lu comme vide) | déballer `snap.aura` ; afficher le mode des deux côtés |
| Boutons « 💾 Aujourd'hui / Hier / Avant-hier » | auto-backups | lit `aura_autobackup_daily_i` (06:2156) — clés effacées à chaque `_abInit` / `_abCheck` / `_abExecute` (06:1059, 1068, 1088) → jamais affichés ; à la place : « Aucun auto-backup disponible. Active le backup auto (v70). » (06:2183) — conseil faux (activer ne crée aucun emplacement, § 12). | MENT | retirer ces boutons et la phrase |
| « ✕ Reset » / « Charger un autre backup » | — | `clearDiff` (06:2122) / même chargeur. | OK | — |

Verdict section : **à corriger** (déballer le format FULL, retirer les emplacements morts).

## 10. calcSection (2e entrée, 07:1208)

Div vide, voir § 7. Remède : supprimer la ligne 07:1208.

## 11. vaultSection — `renderVaultSection` (06:4958-5015), `saveVault` (06:4840-4866), `loadVault` (06:4870-4896), `exportVault` (06:4899-4916), `importVault` (06:4920-4942), crypto 06:4781-4819

Exécuté en vm (vrai `_vaultEncrypt` + `_vaultGetSalt` + `_vaultDeriveKey`, Node 22 = V8 ; `rejeu/reglages-20261014/vm/vm_vault.js`) :
`petit (1 Ko) → chiffré OK` · `snapshot réel 14/10 (3 564 Ko) → RangeError: Maximum call stack size exceeded`
Cause (lu) : `btoa(String.fromCharCode(...combined))` (06:4809) étale tout le chiffré en arguments ; mesuré ici : 125 000 octets OK, 200 000 KO. `saveVault` chiffre `S` entier (06:4848), `exportVault` aussi (06:4904) — plusieurs Mo. Même moteur V8 dans le WebView Chrome 154 de la tablette (ETAT § 23) ; limite exacte non mesurée sur l'appareil (supposé du même ordre).

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Champ mot de passe + barre de force | force du MDP | `vaultPwdUpdate` (06:4944-4953). Entrée = `saveVault(0)` (06:4983) : écrase le coffre 1 sans confirmation. | OK | — |
| « 🔐 Save » (×3) | « Coffre sauvegardé · AES-256-GCM » | lève `RangeError` (vm) → toast « ❌ Erreur chiffrement: Maximum call stack size exceeded » (06:4862). Même réussi : ~4,7 Mo de base64 dans localStorage (06:4856), au-delà du quota ~5 Mo déjà saturé (commentaire 06:1077-1079). Les 3 boutons portent le même `id="vaultSaveBtn"` (06:5000) → l'état « ⏳ » ne s'affiche que sur le 1er. | PLANTE | retirer |
| « ↩ » restaurer un coffre | restaurer | n'apparaît que si un coffre existe (06:5001) — impossible à créer (ci-dessus). Si un coffre existait : `confirm` « Les données actuelles seront remplacées » (date, $, trades) puis `Object.assign(S, snapshot)` (06:4886) avec l'état COMPLET : remplace `walletStore` (les 3 portefeuilles), `botAutoMode` (AUTO/MANU), `agents`, l'historique — la confirmation ne nomme ni AUTO/MANU, ni les 3 modes. Sans la liste blanche de l'import sécurisé (03:5935, cf. destructeurs.md:61). | DANGEREUX (par construction ; inatteignable aujourd'hui) | retirer |
| « 📤 Export .vault » | fichier chiffré | même `RangeError` (06:4904-4905) → toast « ❌ Erreur export ». Le sel est propre à l'appareil (localStorage, 06:4790-4796) et n'est PAS écrit dans le fichier (06:4907) → un .vault ne se déchiffre que sur le même stockage, contrairement à « Déchiffrable uniquement avec ton mot de passe » (06:5011). Téléchargement par lien blob (06:4908-4913 ; inopérant dans le WebView d'après 09b3:114-115, supposé). | PLANTE + MENT | retirer |
| « 📥 Import .vault » | importer | déchiffre puis `confirm('Importer ce fichier .vault ? Les données actuelles seront remplacées.')` → `Object.assign(S, snapshot)` (06:4935) : même remplacement total, confirmation encore moins précise. | DANGEREUX | retirer |

Verdict section : **à retirer** (ne peut pas sauvegarder ; ses deux chemins de restauration remplacent tout l'état).

## 12. autoBackupSection — `renderAutoBackupSection` (06:1261-1343), `_abInit` (06:1050-1060), `_abCheck` (06:1063-1071), `_abExecute` (06:1074-1138), `runManualBackup` (06:1140), `restoreSlot` (06:1146), `downloadSlot` (06:1162), `toggleAutoBackup` (06:1177), `setAbHour` (06:1189)

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Rendu « Auto-Backup Quotidien … N/3 slots » | 3 emplacements J, J-1, J-2 | `_abInit()` (appelé au rendu 06:1264) EFFACE les 3 clés `aura_autobackup_daily_*` (06:1059) ; `_abCheck` et `_abExecute` aussi (06:1068, 06:1088). Toujours « 0/3 », « Aucun backup ». | MENT | retirer |
| Interrupteur « Backup automatique » | « 💾 Auto-backup activé » | bascule `S.autoBackup.enabled` (06:1179) ; lu seulement pour l'affichage (06:1294, 1297, 1301 ; grep). Aucun minuteur : `_abTimer` jamais posé (06:1048, 06:1196), `_abCheck` ne fait que purger. `S.autoBackup` n'est pas dans le snapshot (absent de 09b1 ; absent du backup réel du 14/10). | MENT | retirer |
| « Heure quotidienne » | heure du backup | `S.autoBackup.hour` (06:1191), lu seulement pour « Prochain dans ~Xh » (06:1279). | MENT | retirer |
| « ↩ Restaurer » / « 📥 DL » | restaurer / télécharger un emplacement | jamais affichés (emplacements toujours vides). `restoreSlot` ferait `Object.assign(S, snap)` après `confirm` (06:1154) — mort (déjà noté destructeurs.md:71). | MENT (mort) | retirer |
| « 💾 Backup manuel maintenant » | « Backup manuel effectué » ; pied « Stocké dans localStorage · 3 slots rotatifs · Téléchargeable en JSON » (06:1339) | `_abExecute('manual')` : purge, `saveState(true)` non attendu (06:1089) = la sauvegarde ordinaire (déjà faite toutes les 10 s, 09b2:856-868), `buildSnapshot()` sérialisé pour la taille (06:1091-1092), compteur, ligne 🔗. Le toast « effectué » part toujours, même si `_abExecute` a échoué (06:1140-1143). Aucune copie, rien de téléchargeable. Les vraies sauvegardes sont ailleurs : Guardian (guardian-embed.js:215-222) et le téléchargement auto FULL (09b3:417-436). | MENT | retirer (ou renvoyer vers `exportState`) |
| « Stockage ≈ N Ko » | taille | `JSON.stringify(S)` ENTIER à chaque rendu (06:1340) — plusieurs Mo sur la tablette (42 ms ici pour 3,6 Mo ; plus lent sur l'appareil, supposé). | OK (coûteux) | — |

Verdict section : **à retirer** (rien de ce qu'elle annonce n'existe ; la fonction « sauvegarde » est celle de Guardian / 09b3).

## 13. pdfReportSection2 — `renderPdfReportSection` (05:1651-1699, id prêté par 07:1262-1273), `_buildReportHTML` (05:1033-1637), `exportPdfReport` (05:1639-1648)

Exécuté en vm (vraies fonctions + `computeAdvancedMetrics` 03:2523, portefeuille EV du backup réel, `S.tradingMode='real'` pour tester l'étiquette ; `rejeu/reglages-20261014/vm/vm_rapports.js`) :
`Mode : Mode Auto-apprentissage` (pour RE) · `« P&L Net Total » $-20.41` alors que `S.fees.totalPnlNet = -60.09` · `Win Rate (240 trades)` alors que les compteurs disent 354 · Top 5 agents : Trades 0 / WR — partout · `Aperçu : ordre de S.agents modifié par le rendu : true (macro_v1 → contrarian_v2 en tête)`

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Rendu de l'aperçu | lecture | « Top agent » = `(S.agents||[]).sort(...)` EN PLACE (05:1679) : chaque ouverture de l'onglet RÉORDONNE `S.agents` (sauvegardé tel quel, 09b1:71). L'ordre compte au moins pour les ordres LMSR de l'AA, passés agent par agent sur un prix qui bouge à chaque achat (08:3217-3240, 02:5359-5367) — effet probablement minime (supposé). | DANGEREUX (léger : touche les agents sans le dire) | `[...S.agents].sort(...)` |
| « P&L Net » (aperçu et PDF « P&L Net Total ») | net | somme des `pnlUsdt` BRUTS (05:1655-1658, 05:1041 ; 10e6:15) sur l'historique TRONQUÉ (100 lignes par paire, ouvertures comprises : 02:6375, 09c:988 → ~20 clôtures par paire). vm : −20,41 affiché, −60,09 réellement net. | MENT | lire `S.fees.totalPnlNet` / libeller « brut, N dernières clôtures » |
| « Rapport PDF Mensuel » / « Période : octobre 2026 » | le mois | aucun filtre de date (05:1035-1037) : l'historique tronqué entier. | MENT | filtrer sur le mois ou retirer « mensuel » |
| « Mode : … » | mode du rapport | `paperReal ? 'Évaluation' : 'Auto-apprentissage'` (05:1558) → RE étiqueté « Auto-apprentissage » (vm). | MENT | 3 cas |
| Table « Performance par Paire · P&L Net » | net par paire | `ps.totalPnlUsd` (05:1055) = cumul BRUT (02:6378) ; nombres de trades = compteurs complets, incohérents avec les KPI du haut (historique tronqué). | MENT | — |
| Top 5 agents · Trades / Win Rate | stats des agents | `a.trades` / `a.wins` n'existent pas (0/31 agents dans le backup réel ; aucun écrivain, grep) → 0 et « — » (05:1615 ; vm). | MENT | retirer les 2 colonnes |
| « 📥 Générer et Exporter le PDF » | « S'ouvre dans un nouvel onglet → Ctrl+P → Enregistrer en PDF » | `window.open('', '_blank')` + `document.write` + `print()` (05:1641-1646). Dans l'APK Capacitor (seul appareil de Rams), une fenêtre surgissante et `print()` ne sont pas garantis ; non testé (supposé). Le toast « Rapport ouvert » part si `window.open` rend un objet. Aucune écriture dans S. | OK dans un navigateur ; non prouvé sur la tablette | à vérifier sur l'appareil avant d'exposer |

Verdict section : **à corriger** (tri en copie, net vrai, mode, période, colonnes agents) ; export à prouver sur la tablette.

## 14. xlExportSection — `renderXlExportSection` (05:1934-1978), `buildExcelData` (05:1724-1862), `exportExcel` (05:1864-1906)

Exécuté en vm (vrai `buildExcelData`, EV du backup réel) : `Trades : 240 lignes · colonne Paire : — | — | —` · `Agents : Trades 0 / WR — pour tous` · `Frais : funding par paire non nul 0/12 alors que S.fees.totalFunding = 0,08` · `Résumé : 28 lignes (écran : « 26 lignes »)`

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Liste des 6 onglets + compteurs | contenu | compteurs depuis l'historique tronqué du mode affiché (05:1937-1942) ; « 26 lignes » faux (28). | OK (détail) | — |
| « 📊 Exporter Excel (.xls) » | « 📊 Excel téléchargé — AURA_rapport_….xls » | XML SpreadsheetML 2003 nommé `.xls` (05:1872-1884), lien blob + `a.click()` (05:1886-1895) puis toast de réussite INCONDITIONNEL (05:1898). Dans le WebView, le lien blob ne télécharge pas (commentaire 09b3:114-115 ; supposé, non testé) → toast mensonger. Le chemin qui marche dans l'APK est `_shareOrDownloadJSON`/Filesystem (09b3:156-224). | MENT (sur la tablette, supposé) | passer par le plugin Filesystem / partage, toast selon le résultat |
| Onglet Trades | « Tous les trades avec entrée/sortie/P&L » | ~20 dernières clôtures par paire (troncature 02:6375) ; colonne Paire vide (`t.pair` absent, 05:1780 ; vm) ; P&L brut. | MENT | joindre la paire ; libeller brut |
| Onglet Résumé « P&L Net Total » | net | brut (05:1753). | MENT | — |
| Onglet Agents · Trades / WR% | — | toujours 0 / « — » (05:1816, 1825 ; vm). | MENT | retirer les colonnes |
| Onglet Frais · Funding $ | funding par paire | `f.funding` jamais cumulé par paire (02:4570 init sans `funding` ; aucun `+=`, grep) → 0 (vm). | MENT (léger) | — |
| Aucune écriture dans S. | | | OK | — |

Verdict section : **à corriger** (paire, agents, net, chemin de fichier natif + toast honnête).

## 15. hebdoSection — `renderHebdoSection` (05:2066-2179), `_getWeekTrades` (05:1985-2004), `_analyzeWeek` (05:2006-2063), `exportHebdoPdf` (07:940-1107)

Exécuté en vm (vraies fonctions, EV du backup réel, semaine passée) : `trades 41 · clés byPair : undefined · insights : « 🎯 À surveiller : undefined ($-0.71) »`

| contrôle | promesse | fait réellement | verdict | remède |
|---|---|---|---|---|
| Cette semaine / Semaine passée / S-2 / S-3 | naviguer | `_rhWeekOffset=N;renderHebdoSection()` (05:2114-2117 ; `let` global 05:1984). Les semaines anciennes sont incomplètes : historique tronqué à ~20 clôtures par paire (02:6375) — ex. EV DOT/USDT commence le 26/09 dans le backup réel. | OK (S-2/S-3 partielles, non signalé) | afficher « N clôtures disponibles » |
| KPIs (P&L, WR, R/R, gain/perte moy.) | semaine | sur `pnlUsdt` brut (05:2010-2014). | OK (brut non dit) | — |
| « Performance par paire » + insights paire | par paire | `byPair[t.pair]` avec `t.pair` absent (05:2020-2023) → une seule ligne « undefined » ; insights « Meilleure paire : undefined », « À surveiller : undefined » (vm). | MENT | parcourir `Object.entries(S.pairStates)` |
| « 📄 Exporter ce résumé en PDF » | PDF de la semaine | `window.open` + `print()` (07:1100-1105, non prouvé dans l'APK, supposé) ; « P&L Net » brut (07:972) ; table par paire « undefined » ; et le gabarit contient, avant `</body>`, ~100 lignes de DOM de l'APPLI collées par erreur (07:991-1097 : widget compact, bannière vacances, overlay « Moment de grâce », écran anti-revenge « Tu viens de perdre… », mode cinéma, bannière bunker avec boutons `onclick` vers des fonctions absentes de la fenêtre) — elles s'impriment sous le rapport (lu ; rendu non vu). Déjà relevé côté anti-revenge (PASSATION:96). | MENT | sortir ce DOM du gabarit (et le remettre dans l'appli si voulu) |

Verdict section : **à corriger** (paire, gabarit PDF) ; lecture seule.

