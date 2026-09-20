# AUDIT-VERITE-AURA8 · 14/09/2026 · lecture seule · token `20260912c`

**Question unique** : pour chaque décision, d'où vient la donnée, est-elle vraie, fraîche, du bon mode ?
**Sources** : backup Guardian complet `aura_guardian_full_20260914-152719.json` (cycle 599 135, sauvegardé 14/09 15:27:19 local, 1 min après relance) + dépôt `main` @ `10c2ac7`. Chaque ligne porte sa provenance `fichier:ligne` et sa preuve dans le backup. Rien n'est supposé ; ce qui n'est pas prouvable est marqué NON PROUVABLE.
**Verdicts** : VRAI · DÉRIVÉ DU VRAI · SYNTHÉTIQUE · PÉRIMÉ · MORT · PARAMÈTRE (réglage, pas mesure).
Ce document est la référence de toutes les missions suivantes : le plan se plie à l'audit, pas l'inverse.

---
## 0. Verdict

1. **En EV, 7 paires sur 12 n'ont plus de bougie réelle depuis le 13/09 21:45** (ETH, XRP, SOL, DOGE, AVAX, LINK, DOT). Deux verrous au code, chacun suffisant. Pour ces paires : aucune porte évaluée, aucune sortie bot vérifiée. DOT et DOGE sont sous leur SL depuis 2 jours ; 3 slots/3 occupés → zéro ouverture possible.
2. **L'analyse EV/RE tourne sur des bougies fabriquées** (13 scouts, 14 indicateurs, patterns, régime, corrélation de repli). PEPE analysé à 1/13 de son prix, GBP/USDT sur des klines de décembre 2023.
3. **Les 21 agents signal sont des clones** (Fade·Fade, RSI·Sentiment/RSI·Sentiment) : 60 fusions/h, 95 013 générations, mémoire et compétence-paire effacées à chaque fusion, fitness par régime copiée des parents.
4. **Les historiques rotatifs gardent le PLUS VIEUX au lieu du plus récent** (`09b2:905`) : `learningHistory` figé au cycle 130 980 (juin), `dreamJournal` au 06/09.
5. **La nuit du 13 au 14 : ~6 h de trading effectif sur 17.** Veille écran à 1,8 s par frame, 3 pauses du garde réseau (62 min, 21 min, 160 s), pause définitive 09:02:51, mort 09:52, relance 15:26.

---
## 1. Tableau de vérité — entrées de décision (EV/RE)

| # | Entrée | Producteur (file:ligne) | Lecteurs décisionnels | Verdict | Preuve backup |
|---|---|---|---|---|---|
| 1 | Prix courant `ps.price` | WS `@trade` par paire, `02:4618-4621` | P&L positions, `_lossCapSweep`, veto mouvement | **VRAI** | BTC `ps.price` 77 819,47 = close 5m Binance 15:25 |
| 2 | Klines tf du mode `S.realCandles[p]['15m']` | Bootstrap REST `02:4712-4735` (**tf du mode seulement**, et seulement si la paire est pausée « Données obsolètes » `02:4696-4698`) + agrégation WS `02:3322-3400` | Porte EV `10g:33-49`, porte RE `08:3448-3476`, ATR/SL `09d1:44-60` via `10e:193`, corrélation `10e:188-200`, bêta `10e5:49`, Sharpe `09d2:24` | **PÉRIMÉ 7/12** (ETH, XRP, SOL, DOGE, AVAX, LINK, DOT : dernière bougie 13/09 21:45) · VRAI BTC/ADA/EUR/PEPE (bootstrappées à la relance 15:26) · **MORT GBP** (klines du 28-29/12/2023) | `realCandles.*.15m[-1].ts` ; 17 h sans bougie sur 7 paires |
| 3 | Klines 5m/1h/4h/1j | Jamais bootstrappées (`02:4731` : tf du mode) ; alimentées seulement par agrégation WS | **Référence du filtre outlier** `02:3341` | **PÉRIMÉ** (ETH 5m 19/08 à 1 919 vs 2 501 ; DOGE 02/06 ; XRP/AVAX 30/06 ; SOL 08/07 ; LINK 11/08 ; DOT/PEPE 19/08) | `realCandles.*.5m[-1]` |
| 4 | Bougies d'analyse `ps.candles` (EV et RE) | `simTick` `08:3164-3207` : marche aléatoire toutes les 3 ticks, dernier close réancré (`blendRealPrices` `02:3609`) | `getTechSignals` `08:1955` (14 indicateurs = 60 % du composite), 13 scouts `03:3524-3700`, patterns 06, régime `02:661`, `_getPairReturns` repli `10e:195` | **SYNTHÉTIQUE** | PEPE : synth 2,65e-7 vs prix 3,43e-6 (×13) ; GBP : synth 1,529 vs 1,335 ; aucune bougie n'a de `ts` |
| 5 | Votes agents `ps.roster.votes` (phase 1) | `runRosterAnalysis` `03:3824`, `scoutAnalysis` `03:3524` (switch par `agentId` : logique par siège intacte) | Consensus 10f, juge `learnFromOutcome`, angles 12 | **DÉRIVÉ DU SYNTHÉTIQUE** : toutes les entrées des 13 scouts = `ps.candles` + `ps.price` (volume = ranges inventés, whale/onchain/flow = corps inventés) ; macro/fundamental = 0 (S3) | `_jury` des positions : 10 réponses sur du synthétique |
| 6 | Régime `detectMarketRegime()` | `02:645` : `pnl24h` (CoinGecko, réel, `02:885`) + 20 closes `ps.candles` | Portes 10f, refus contextuel `09d1:96`, stress bear | **DÉRIVÉ MIXTE** (moitié réel, moitié synthétique) | — |
| 7 | Matrice de corrélation `adaptiveState.correlationMatrix` | `_refreshCorrelationMatrix` `10e:106-130` sur `_getPairReturns` (30 closes realCandles 15m, repli synthétique) | Anti-doublon P1 `_corrGateForOpen` | **PÉRIMÉ / DÉSALIGNÉ** : 7 paires sur une fenêtre 13/09 14:15-21:45, 3 sur le 14/09 → Pearson entre deux jours différents ; GBP corrélé à 2023 | matrice du 14/09 07:41 : BTC|ETH 0,16, ADA|BTC 0,83 (les 2 seules fraîches) |
| 8 | Bêta BTC | `10e5:49-50` realCandles 15m | P5 mise ×0,5 / veto | **PÉRIMÉ 7/12** | idem #2 |
| 9 | ATR → SL/TP des positions auto | `_applyPaperRealProtection` `09d1:23-88` ← `_getPairAdaptiveProfile` (`10e:193` realCandles 15m ≥ 30) | Bornes `pos.sl`/`pos.tp` | **PÉRIMÉ 7/12** — et voir #10 | DOT `sl` 1,0312 posé le 12/09, jamais revu |
| 10 | **Sorties des positions bot** (TP, SL, breakeven, Signal inversé, timeout) | `10f:242-290`, **à l'intérieur de `_resolvePairCycleCore`** — exécutées uniquement à la résolution du cycle | Clôture auto | **MORT quand la bougie ne se ferme pas** : en EV la résolution exige une nouvelle kline close (`10g:37-39`) → pour les 7 paires figées, aucune sortie n'est jamais vérifiée. `learnFromOpenPositions` `07:3143` ne surveille TP/SL que des positions **manuelles** (`pos.auto !== true`) | DOT long 12/09 19:31 : prix 1,011 < SL 1,031 ; DOGE : 0,0836 < SL 0,0845 ; `_worstPx` DOT 1,0298 > close réel 1,018 = jamais mis à jour |
| 11 | Garde-fou perte max `_lossCapSweep` | Défini `10f:580` (et copie morte `10-fin-bloc:1964`) | — | **MORT : 0 appelant** (retiré du battement `08:2946-2954`, « règle Rams 27/07 : aucun plafond imposé ») | grep `_lossCapSweep(` = 0 hors définition |
| 12 | Heatmap horaire | `10e3:5` : écrite à **chaque clôture, tous modes** | P3 conviction ±0,08 | **DÉRIVÉ DE L'AA** : ~2 000 clôtures de marche aléatoire pour 47 trades EV | `heatmap.byHour[0].count` 90, `[1]` 78… |
| 13 | Frais + slippage | `10e6:35` : `feeConfig` taker 0,10 % / slippage 0,03 % / funding | P6, `_gainNet`, seuil | **PARAMÈTRE** (jamais mesuré : pas de `bookTicker`) ; `feeLog` 47 entrées cohérentes | `fees.byPair` |
| 14 | Calendrier éco | `10e2:29-31` : dates FOMC/CPI 2026 en dur + expirations Deribit calculées | P2 fenêtre de prudence | **VRAI, statique** (valide 2026 seulement, à renouveler) | — |
| 15 | News NLP | `10e7:37,253` CoinStats, clé `aura_news_key` (hors snapshot, P0b) | Scout `nlp_v1` `03:3541`, P7 | **NON PROUVABLE depuis le backup** (clé volontairement absente) — à lire au Guardian | — |
| 16 | Allocation Sharpe | `adaptiveState.sharpeByPair` | Mise ×0,4…×1,5 | **DÉRIVÉ sur échantillon insignifiant** : PEPE ×1,5 sur 6 trades, XRP ×0,4 sur 5 | `sharpeAllocations` 14/09 00:46 |
| 17 | A/B testing | `abTesting` bras A/B, verdict à 50 trades/bras | SL/TP/mise par bras | **VRAI mais coûteux** : bras B −4,48 $ / 20 trades (5 % du capital) depuis le verdict du 21/08 | `abTesting.armB.pnl` |
| 18 | Leçons `agentLessons*` | `03:1389+` (|pnl| > 0,5 % sur `trade`) | `recallMemory`, Learn | **PARTIEL** : dernières leçons 11/09 ; clôtures ADA 14/09 00:01 (+0,029 $) et 00:30 (+0,023 $) < 0,5 % → aucune leçon (attendu) ; mais `globalMemoryPool[-1]` dit « ADA won:false, pnl 0.5 » pour un gain → **INCOHÉRENT** | `globalMemoryPool[-1]` vs `decisionCascade[-2]` |
| 19 | Mémoire + compétence par paire des agents | Effacées à chaque fusion `07:2716-2724` (`memory = []`, `delete agentPairSkill[id]`) ; `regimeFitness` = copie pondérée des parents `07:2727-2740` | `recallMemory`, `agentPairSkill` dans le juge et 09c | **MORT par construction** (loi 4 violée ~60×/h) | `agentPairSkill.macro_v1` = 0/0 sur 10 paires ; les 21 agents ont « calm 282/498, volatile_bear −32,94 » identiques ; `lastPnl` identique −0,00615 pour les 21 |
| 20 | Évolution | `03:1429-1435` : toutes les 15 décisions (`S.cycle % 15`), plafond 1/60 s `07:2643` | Naissance des hybrides | **DÉRIVE** : `_genCount` 95 013 ; type `p1.type.split('·')[0]+'·'+p2…` `07:2695` converge vers « Fade·Fade » ; fitness 350 forcée `07:2701` | 21/21 agents « Hybrid Gen-88951…95013 », type Fade·Fade |
| 21 | Rêve | Déclencheur `08:3086` (5 holds consécutifs — permanent quand la paire ne résout plus), plafond 4 min `07:2780` ; `id = S.dreams.length+1` `07:2784` (plafonné → toujours #11) ; ratchet `ps.threshold` +0,03 `07:2858-2862` | `ps.threshold` = affichage seul (aucun lecteur décisionnel) | **BRUIT** : 15 rêves/h, `evoLog` 50/50 = rêves (généalogie effacée en 1 h) | `evoLog` = « Dream #11 terminé » ×50 ; EV `threshold` 0,82 partout |
| 22 | Historiques rotatifs | `09b2:905` `cut = arr.slice(0, n)` (**garde le plus vieux**) appliqué `09b2:916-919` à `learningHistory` 80, `globalMemoryPool` 30, `fiscalReserveLog` 50, `dreamJournal` 30 ; 09b1 sauvegarde `slice(-200)` (le plus récent) | Onglet Learn, mémoire partagée | **PÉRIMÉ PAR CONSTRUCTION** : à chaque chargement les 80 plus vieux survivent, les récents sont jetés | `learningHistory` : cycles 130 817 → 130 980 (juin) pour un cycle courant 599 135 ; `dreamJournal[-1]` 06/09 |
| 23 | Comptabilité EV | `walletStore.paperReal` | HOME, Analytics, `_startPortfolio` | Equity réelle ≈ **118,6 $** (cash 4,69 + trading 83,70 + positions 30,2) pour 116,56 $ injectés le 21/08 → **+2 $ en 24 j**. HOME `portfolio` 88,39 = hors positions ; `_startPortfolio = portfolio` `09b2:610` → P&L 0 % ; `_totalCompounded` −123 = fossile ; `pnl24h` 30,2 = faux ; `cashLog` mort depuis le 07/07 ; `pnlHistory` figé à 118,82 | — |
| 24 | Journal (`chainLog` 100, `evoLog` 50) | Inondé par 📡 CoinGecko (1/2 min) et 💤 rêves (2/4 min) | La preuve elle-même | **S'EFFACE en ~1 h** : l'historique utile (pauses réseau, clôtures) disparaît avant le backup | 50 dernières lignes = 08:53 → 15:26 |

**Correction de mon message du 14/09** : `paperRealLastClose[ADA]` n'est écrit que sur une **perte** (`02:5719-5722`, cooldown 30 min après perte uniquement) — les clôtures ADA du 14/09 étaient des gains : comportement attendu, pas un défaut. Retiré de la liste.

### Les deux verrous des bougies réelles (prouvés)
- **Verrou 1 — filtre outlier auto-bloquant** `02:3339-3350` : chaque prix WS est comparé au **dernier close 5m** ; > 2 % d'écart → rejet **pour toutes les timeframes** (`return` avant la boucle `02:3353`). La 5m n'est jamais re-bootstrappée. Dès qu'elle date (pause, veille, coupure, mouvement > 2 %), la paire est morte à vie : ETH 5m à 1 919 pour un prix à 2 501 → 100 % des prix rejetés.
- **Verrou 2 — le refetch « données obsolètes » est inatteignable** `10g:37-39` (`if (closedTs <= lastSeenTs) return;`) et `08:3456-3458` : le test de fraîcheur `10g:43-49` / `08:3467-3476` qui déclenche `_fetchAndBootstrapRealCandles` est placé **après** ce `return`. Une série figée ne produit jamais de nouvelle bougie close → jamais de refetch. Le « v118 FIX » ne s'exécute qu'une fois par relance.
- **Au boot** `02:4694-4698` : bootstrap REST seulement si la paire est pausée « Données obsolètes » — or `paperRealKillSwitch` est vide (le mode EV ne pause plus, il « attend ») → seules les paires dont la 5m est encore vivante (BTC, ADA, EUR) reçoivent des bougies après la relance.

---
## 2. Stabilité — la nuit du 13 au 14 (« incontrôlable »)

| Heure (locale) | Fait prouvé | Preuve | Lecture |
|---|---|---|---|
| 13/09 21:36 | Gel 15,2 s : `BUTTON.onclick` 14 874 ms dans `AURA8_v118.html` | `perfLog.gels` (LoAF `fn:'onclick', pos:0`) | Un bouton inline du HTML bloque 15 s ; bouton non identifié (nom absent) → sonde à ajouter |
| 21:52 | Relance (boot cycle 591 855) | `perfLog.boots` | 20-21 cycles/min ensuite |
| 14/09 01:02 → 03:42 | Rythme 20 → **6 cycles/min** | `perfLog.heap` (cycle par 10 min) | Veille écran entrée après 10 min sans toucher |
| 01:08:54 | `timer rAF@13-veille-ecran.js:61` **1 817 ms** (déjà 1 181 ms le 12/09 18:12) | `perfLog.lent` | `13-veille-ecran.js` : canvas plein écran 60 fps, `cv.width=innerWidth` **à chaque frame** (l.31, réallocation), 260 traînées + 31 étoiles avec `shadowBlur` 14-22 (l.19-24), `(0,eval)('S')` par frame (l.57). L'« anti-throttling » étrangle le battement 1 s |
| 05:17 → 06:19 | Tick à l'arrêt **62 min** ; op nommé `fetch api.binance.com/api/v3/ping` ; **40 opérations JS (3,1 s) ont tourné pendant le trou** ; 26 messages WS en 62 min | `perfLog.gels[24]` (`jsN:40, jsSum:3.1, ws:26, hidden:false`) | Ce n'est **pas un gel JS** (le JS tournait) : c'est une **pause du garde réseau** `01:120-126` (2 pings Binance ratés en 40 s → `stopSim`), Binance injoignable (WS quasi mort aussi). Cause de l'injoignabilité : NON PROUVABLE (le ping ne journalise pas le statut HTTP) |
| 07:47 → 08:08 | 21 min (op `traitement CoinGecko`), puis 08:16 : 160 s (op ping) | `perfLog.gels[28-29]` | Même mécanisme |
| 07:52 | Page 4 affichée jusqu'à la mort | `perfLog.heap[].page` | Rams a touché la tablette |
| 09:02:51 | « ⏸ Évaluation en pause · cycle #599135 » | `chainLog` | 2 pings KO. Plus **aucune** ligne réseau après (CoinGecko compris) |
| 09:12 → 09:42 | Cycle figé, timer heap vivant (10 min) | `perfLog.heap` | Le JS répond encore, le trading est en pause |
| 09:52:00 | Dernière sauvegarde | `boots[15].prevSavedAt` | Mort entre 09:52 et 10:02 |
| 15:26:19 | Relance manuelle | `boots[15]` | 5 h 34 sans app |

Bilan de la « journée d'observation phase 1 » : trading effectif ≈ 6 h sur 17. Heap 21 → 87 Mo en 24 h, DOM 5 000 → 9 400 nœuds sur la page 0 : à suivre.
**NON PROUVABLE** : la cause de la mort (aucun crash log ; `boots[].doc` toujours `null`). Sondes à ajouter : statut HTTP + durée du ping dans le journal, nom du bouton dans la LoAF, `_perfOp('veille')`.

**Note** : les 19 « gels » du 11/09 21:06-21:24 (60 s exacts, `hidden:true`, heap 468 Mo) sont le throttling Android app en arrière-plan, pas un défaut de code.

---
## 3. Phase 1 (vote par paire) — vérification à 24 h

- `a.score`/`a.conf` = biais appris, stables : macro 0,000/0,500, volume −0,095/0,578 ✓ (plus de saut à chaque tick).
- Aucune ligne 🐌 `roster:PAIRE` dans `perfLog.lent` (5 entrées, aucune roster) ✓.
- 2 clôtures EV après la livraison : ADA short 14/09 00:01 (+0,029 $) et 00:30 (+0,023 $), gates EVAL cohérents (`brainLog` consensus 81-92 % HOLD).
- KPI espérance nette : **non mesurable** — EV figé sur 7 paires et saturé 3/3. L'observation ne conclut rien tant que §1 #2-#11 ne sont pas corrigés.

---
## 4. Ce que ça change au PLAN-DIRECTEUR (ordre imposé par l'audit)

L'inventaire §1a du plan (« Binance : prix/bougies EV-RE → DÉCIDE ») est faux pour l'analyse et incomplet pour les bougies elles-mêmes : corrigé par ce document.

1. **Phase 1b-a — bougies réelles vivantes + sorties bot vivantes** (touche la décision → 24 h) — **LIVRÉE le 14/09, token `20260914a`, `banc-verite-donnees.js` 12/12 bloquant** :
   (i) filtre outlier `02:3339` : référence = **dernier prix WS accepté de la paire** (ou dernier close de la tf du mode si < 2 tf), plus jamais la 5m ; (ii) `10g` et `08` : test de fraîcheur **avant** `closedTs <= lastSeenTs`, refetch REST de toutes les tf lues (15m + 5m) ; (iii) `02:4696` : bootstrap au boot pour **toutes** les paires actives ; (iv) GBP/USDT retiré des paires EV (klines 2023) ; (v) sorties bot **hors résolution** : le bloc `10f:242-290` (TP/SL/breakeven/timeout) sort de la résolution et tourne sur `ps.price` à chaque tick pour les positions auto ; la résolution ne garde que « Signal inversé » ; `_lossCapSweep` rebranché toutes les 3 s (`08:2952`). **Tranché ici : la règle du 06/07 (« stoppe si perte trop importante, même si je l'ai oublié ») prime sur celle du 27/07** — c'est la seule qui protège quand la bougie ne se ferme pas. Si Rams maintient celle du 27/07, il le dit avant 1b-a. `banc-verite-donnees.js` livré dans ce lot (§5).
2. **Phase 1b-b — analyse EV/RE sur klines** (24 h) : `ps.candles` EV/RE = klines Binance 5m (`ts` présent), générateur synthétique réservé à AA ; hors ligne = série figée + graphe marqué.
3. **Phase 1c — patrimoine des agents** (12 h, pas de décision touchée) : évolution 1/h max ; l'hybride hérite fitness moyenne des parents (pas 350 forcé), mémoire + `agentPairSkill` du défunt (12 le fait déjà pour les disciples : étendre à tous), `regimeFitness` vide (vécu, pas cloné) ; rêve 1/jour au rollover, résultats hors `evoLog` ; `09b2:905` `cut` → `cutEnd` pour les 4 historiques ; 📡 CoinGecko et 💤 hors `chainLog` (compteurs à part).
4. Puis, dans l'ordre déjà écrit : micro-mission affichage P&L (12 h) → phase 2 bus/attribution.

À faire par Rams sans attendre : fermer DOT et DOGE à la main (2 jours sous SL, 2 slots sur 3 bloqués) ; retirer AURA de l'optimisation batterie Samsung (déjà noté).

---
## 5. `banc-verite-donnees.js` — spécification (livré avec 1b-a, bloque `banc-all`)

Statique (sur le texte des fichiers) : S1 `02` : le filtre outlier ne lit plus `['5m']` comme référence · S2 `10g`/`08` : le test de fraîcheur précède `closedTs <= lastSeenTs` · S3 `08` appelle `_lossCapSweep(` · S4 `10f` : aucune vérification TP/SL de position auto à l'intérieur de `_resolvePairCycleCore` · S5 `09b2` : `cut(` absent, `cutEnd(` sur les 4 historiques · S6 `07:2643` cooldown évolution ≥ 3 600 000 · S7 GBP/USDT absent des presets EV.
Dynamique (vm, fonctions réelles, snapshot de test) : D1 série 5m figée à −30 % + prix WS cohérent → agrégation acceptée sur 15m · D2 série 15m figée > 37,5 min → `_fetchAndBootstrapRealCandles` appelé dès le tick suivant · D3 position auto à −2 % sous SL → fermée en ≤ 3 ticks sans résolution · D4 fusion → l'héritier porte mémoire + skill du défunt, fitness = moyenne parents · D5 10 rêves → `evoLog` contient toujours ≥ 1 entrée `new` · D6 chargement d'un snapshot avec 200 `learningHistory` → les 80 **plus récents** survivent · D7 (après 1b-b) `getTechSignals('ETH/USDT')` en EV lit des bougies avec `ts` · D8 heatmap : une clôture AA n'écrit pas dans la heatmap lue en EV.
Une régression de vérité = `VERDICT : NON LIVRABLE`, jamais « CONNU, toléré ».

---
## 6. Procédure de vérification et de rectification (base d'approche — engagement de Claude)

1. **Le backup d'abord.** Toute mission commence par les 8 sondes lues dans le backup et comparées à la passation, avant tout code : `perfLog.boots/gels/lent/heap` (rythme de cycles par 10 min, trous, ops nommés), fraîcheur `realCandles` par paire et tf, positions ouvertes vs `sl`/`tp`, `evoLog`/`dreams`/`_genCount`, noms/types des agents, equity par mode (cash + trading + positions vs injecté), 5 dernières clôtures vs leçons, dernières lignes réseau du journal.
2. **Rien n'est écrit VRAI sans sa sonde.** Une affirmation de passation invalidée par le backup est marquée « faux depuis le … » dans cet audit, avec la ligne qui la contredit — jamais reformulée, jamais effacée.
3. **Chaque livraison nomme d'avance** la ligne exacte du backup qui la valide 12/24 h après, et celle qui l'invaliderait.
4. **Le banc de vérité bloque.** Pas d'entrée dans `CONNUS` pour une régression de vérité.
5. **Une découverte pendant une mission s'écrit ici, ne se corrige pas « en passant »** (loi 5). Une racine, un lot, une observation.
6. **Symptôme → racine avant la 2e tentative** : la racine est prouvée par grep de tous les appelants/lecteurs dans le bac à sable (règle 8), pas au chat.

## 7. Journal des vérifications
- **15/09 18:04 — 1b-a vérifiée** (backup cycle 605 942) : 11/11 paires EV avec bougie 15m de 4 min (14/09 : 3/12) ; 5m vivantes ; 0 position zombie ; 17 trades EV/24 h sur 5 paires nouvelles ; equity plate. **Réfuté dans ce même backup** : la stabilité — ~11 h sur 21 sans trading (05:28→09:24, 10:48→18:03), CoinGecko et Binance muets ensemble, JS vivant → cause non nommable (le ping ne journalisait rien, un 418 comptait « en ligne »). Livré : sonde réseau `20260915a` (§2 sondes à ajouter : ping = fait ; bouton 15 s et `boots[].doc` restent).

- **15/09 soir — 1c-lite + veille CSS livrées** (`20260915b`) : #19 partiellement (regimeFitness du siège, types restaurés ; héritage mémoire/skill = décision Rams, banc 06/09), #20 (1/h), #21 (1/jour), #22 (cutEnd), §2 veille écran. Restent : #4-#8 (1b-b), #19 héritage, #23-#24, bouton 15 s, `boots[].doc`.

- **15/09 nuit — 1b-b livrée** (`20260915c`) : #4 (ps.candles EV/RE = klines Binance 15 m, générateur réservé à AA), #5/#6 (scouts et régime lisent du vrai), #12 (heatmap EV/RE seulement, remise à zéro). Restent : #7/#8 (corrélation/bêta : vivants depuis 1b-a), #13-#17 (paramètres, échantillons), #19 héritage (décision Rams), #23-#24, bouton 15 s, `boots[].doc`.

- **15/09 23:10 — bunker sur l'equity** (`20260915d`) : #23 pour le bunker (compte + positions), fausses alertes « −15 % » à 3 positions ouvertes supprimées ; le « portfolio » de l'accueil reste à corriger (micro-mission P&L). Dernière retouche avant 7 jours sans intervention.

- **16/09 — 1c-full livrée** (`20260916a`) : #19 réglé (rien d'effacé ni copié à la fusion, fitness de naissance = moyenne des parents / 2). Découvert : `banc-skill-borne.js` s'arrêtait à sa 1re section depuis le 06/09 (pin HTML figé) — réparé, 33/33. Le 7 jours sans retouche est levé par Rams ; suite : génome réel, fitness glissante, poids par attribution.

- **16/09 — génome réel par siège** (`20260916b`) : #20 va au-delà du plan — la « fusion » évolue désormais des nombres que la décision lit (72 gènes sur 17 sièges), byte-identique par défaut (oracle + 40 états). Restent : fitness glissante (3), poids par attribution (4).

- **16/09 — fitness glissante** (`20260916c`) : la saturation à 1 600 (audit #20, captures 14-15/09) n'est plus possible ; sélection sur les 60 derniers jugements réels, poids symétriques. `redistributeFitness` (économie bots 15/08) devient sans effet → décision Rams.

- **16/09 — poids par attribution** (`20260916d`) : consensus pondéré par compétence par paire × régime ; `regimeFitness` = votes alignés du siège (fin du « calm 282/498 » identique, #19). Conseil 1→4 livré en entier.

- **17/09 — l'école ne note plus** (`20260917a`) : les jugements AA (marche aléatoire) n'alimentent plus fitness/skill/régime/génome — seuls EV/RE jugent (#5/#12 fermés côté apprentissage). Backup 17/09 : 11/11 paires, equity plate, 1 fusion/h, sonde réseau 60/60 ok dans sa fenêtre, Guardian : gels = suspension OS.

- **17/09 — A13 moteur de sortie unique** (`20260917b`) : #9/#10 fermés — les niveaux ATR (A/B) sont exécutés, breakeven réel ; le % de conviction n'est plus qu'un repli. L'A/B compare enfin deux règles réelles.

- **17/09 — affichage P&L + portfolio au boot** (`20260917c`) : #23 fermé côté accueil (recalage avec mises engagées, plus de +30 $ fantômes) ; latent live par paire, mise 🤖/👤. Restent : `_totalCompounded` fossile (affichage), `cashLog` EV mort depuis le 07/07, #24 journal.

- **17/09 — flux Binance (A14)** (`20260917d`) : #5 fermé pour whale/flow/volume — flux d'ordres réel (quantité + côté preneur) et carnet 20 niveaux ; les autres scouts lisent déjà les klines réelles (1b-b).

- **17/09 — génome de paire** (`20260917e`) : les périodes et poids de `getTechSignals` (60 % du composite, #4/#5) ne sont plus des constantes partagées BTC/PEPE — 12 gènes par paire, mutés 1/jour sur le P&L réel de la paire, défauts identiques à hier.

- **17/09 — attribution par source** (`20260917f`) : phase 2 A2/A5 livrée en lecture seule — on mesure enfin quelle DONNÉE rapporte (flux, technique, prix, news…), pas seulement quel siège. Rien ne s'en sert encore : décision Rams quand le volume sera là.

- **19/09 — correctif attribution** (`20260919a`) : ma livraison du 17/09 lisait une forme de votes inventée (objet) au lieu de la vraie (nombre) — seule la source « technique » était mesurée. Corrigé, forme épinglée par le banc. Banc du flux rendu déterministe (il clignotait).
- **19/09 — lecture backup** : stabilité réglée (12 h continues depuis la relance). Argent : −13,46 $ sur 1 150,34 $ injectés, 56 % de trades gagnants mais pertes > gains ; cause nommée : le trailing stop de 07 (0,5 point sous un pic ≥ +1 %) ferme avant le TP ATR et rend l'A/B non mesurable. Décision Rams en attente.

- **19/09 — trailing proportionnel** (`20260919b`) : la sortie qui plafonnait les gagnants (0,5 point sous un pic ≥ +1 %) devient proportionnelle au TP ATR de la position — armée à 60 % du chemin, rend au plus 40 % du gain ou un quart de la distance. L'A/B peut enfin atteindre son objectif.

- **20/09 — porte de sortie + plancher** (`20260920a`) : l'escalier de sortie était derrière `|P&L| < 0,5 % → return` — le timer anti-zombie de v7.12 n'a jamais pu se déclencher (preuve : EUR tenu 43 h à −0,27 %, 3 emplacements EV bloqués). Porte ouverte ; trailing planchéisé à la moitié du chemin. Attribution par source validée (5 sources, volume et flux positifs, harmonique et prix négatifs).

- **20/09 — journal des événements** (`20260920b`) : #24 fermé — le journal ne couvrait que 3 minutes (100 lignes RAM / 50 sauvegardées, 105 écrivains, bruit à haute fréquence). Relais sur le push : ce qui compte est gardé (400 événements, 250 sauvegardés) et compté par jour sur 7 jours, sans toucher un seul appelant ni changer chainLog.

*Mis à jour à chaque mission. Le prochain audit complet : après 1b-b, sur un backup de 24 h propre.*
