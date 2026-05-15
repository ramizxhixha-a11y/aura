// ════════════════════════════════════════════════════════════
// AURA8 — module consolidé 02/10
// Contient : state-init, v7-12-livraison-3-calcul-des-indicateurs-a, v7-12-livraison-8-mode-reel-utilitaires, moteur-de-frais-taxes, open-positions-render
// ════════════════════════════════════════════════════════════
// ============================================================
// STATE — MULTI-PAIR
// ============================================================
const PAIRS = {
  'BTC/USDT': { sym:'BTC',  color:'#f7931a', startPrice:84000,  vol:500,    minP:54000,  maxP:130000, dec:0 },
  'ETH/USDT': { sym:'ETH',  color:'#627eea', startPrice:1600,   vol:25,     minP:900,    maxP:5000,   dec:0 },
  'XRP/USDT': { sym:'XRP',  color:'#00aae4', startPrice:0.575,  vol:0.010,  minP:0.20,   maxP:2.00,   dec:4 },
  'SOL/USDT': { sym:'SOL',  color:'#9945ff', startPrice:130.0,  vol:2.5,    minP:50,     maxP:400,    dec:2 },
  // v7.12 · Priorité 2 — 4 nouvelles paires ajoutées
  'DOGE/USDT':{ sym:'DOGE', color:'#c3a634', startPrice:0.15,   vol:0.004,  minP:0.03,   maxP:0.50,   dec:4 },
  'ADA/USDT': { sym:'ADA',  color:'#0033ad', startPrice:0.45,   vol:0.012,  minP:0.15,   maxP:1.50,   dec:4 },
  'AVAX/USDT':{ sym:'AVAX', color:'#e84142', startPrice:22.0,   vol:0.7,    minP:8,      maxP:80,     dec:2 },
  'LINK/USDT':{ sym:'LINK', color:'#2a5ada', startPrice:14.0,   vol:0.45,   minP:5,      maxP:40,     dec:2 },
};

function genCandlesFor(p0, vol, n) {
  let p=p0; const out=[];
  for(let i=0;i<n;i++){
    const o=p, ch=(Math.random()-.48)*vol;
    const h=o+Math.abs(ch)+Math.random()*vol*.4;
    const l=o-Math.abs(ch)-Math.random()*vol*.4;
    const c=o+ch;
    out.push({o,h,l,c}); p=c;
  }
  return out;
}

function makePairState(cfg) {
  const candles = genCandlesFor(cfg.startPrice, cfg.vol, 50);
  // v6.5: clamp initial price to startPrice ±10% to avoid stale chart display
  const initPrice = Math.max(cfg.startPrice * 0.90, Math.min(cfg.startPrice * 1.10, candles[candles.length-1].c));
  return {
    price:        initPrice,
    candles,
    pnl24h:       (Math.random()-.45)*4,
    qYes:         100+Math.floor(Math.random()*60),
    qNo:          100+Math.floor(Math.random()*60),
    trades:       [], totalTrades:0, winTrades:0,
    totalPnlPct:  0,  totalPnlUsd: 0,
    bestTrade:    null, worstTrade: null,
    capital:      10000,
    stake:        10,  // v6.9: mise min $10   userStake: false,
    pairLeverage: 1,
    threshold:    0.65,
    cycleMax:     30,  cycleTimer: 30,
    userCycleSet: false,
    holdStartTs:  0,
    lastAction:   'hold',
    userStake:    false,
  };
}

const S = {
  cycle:42, cycleTimer:30, cycleMax:30,
  portfolio:0, pnl24h:0,    // v7.4 · défaut 0 USDT · l'utilisateur choisit le montant à injecter
  cashAccount:    0,        // v7.4 · défaut 0 (était 50) · injection manuelle via modal Fiat
  tradingAccount: 0,        // v7.4 · défaut 0 (était 50) · transfert depuis caisse après injection
  leverage:       0,        // v7.2 Phase 14b: 0 = levier désactivé par défaut (modifiable 0→×10)

  // ── v7.5 · PORTEFEUILLE AFFICHÉ (EUR) ────────────────────
  // Formule: portfolioTotal = (cashAccount + tradingAccount + fiscalReserveAccount) × usdEurRate
  // Exclu: leverageBorrowed (dette, pas actif)
  portfolioTotal:   0,      // calculé par computePortfolioTotal()
  usdEurRate:       0.92,   // cours USD→EUR live, fallback 0.92 si fetch KO
  _usdEurLastFetch: 0,      // timestamp du dernier fetch réussi

  // ── v7.1 PHASE 9 · TAUX FIAT LIVE (multi-devises) ────────
  // Rempli par fetchFiatRates() depuis open.er-api.com (même endpoint que usdEurRate).
  // Clés = code ISO 3 lettres. Valeur = taux 1 USD → X devise.
  fiatRates: { EUR: 0.92, GBP: 0.79, CHF: 0.88, CAD: 1.36, AUD: 1.52, JPY: 152.0, CNY: 7.25 },
  fiatConvFeePct: 0.002,    // frais conversion réels moyens (0.2% ~ Kraken/Binance fiat on-ramp)

  // ── v7.1 PHASE 1 · COMPTE RÉSERVE FISCALE ────────────────
  // (séparé de feeReserveAccount — alimenté en Phase 2 par les transferts trading→caisse)
  fiscalReserveAccount: 0,  // cumul des taxes prélevées (USDT)
  fiscalReserveLog:    [],  // historique des dépôts {amount, source, ts}

  // ── v7.1 PHASE 8 · FONDS PROPRES RÉELS INJECTÉS ──────────
  // Spec v7.4: défaut = 0 USDT. L'utilisateur choisit le montant via le modal Fiat→USDT.
  // Les sommes venant de conversion Fiat→Crypto sont exonérées d'impôt (traçage distinct).
  ownFundsInjected: 0,      // v7.4 · cumul USDT d'origine Fiat exonéré (0 au 1er lancement)
  ownFundsLog:      [],     // historique des injections {amount, fiatType, fiatAmount, rate, fee, ts}

  // ── COMPTE LEVIER (Réserve d'emprunt) ────────────────────
  leverageReserve:  0,      // sera calculé = tradingAccount × 10 au démarrage
  leverageMaxMult:  10,     // maximum 10× le compte trading
  leverageBorrowRate: 0,    // v7.1 P1: défaut 0% (était 0.0008) · modifiable manuel/auto
  leverageBorrowed: 0,      // montant actuellement emprunté (actif)
  leverageTotalFees:0,      // cumul des frais d'emprunt payés

  // ── v7.2 PHASE 14c · EMPRUNT AUTOMATIQUE (confirmed A=OUI) ──
  // Snapshot du solde trading AVANT activation du levier (pour calcul emprunt × index)
  // et montant emprunté automatiquement (séparé de leverageBorrowed si besoin de tracking fin)
  _autoLevBase:      0,     // solde trading au moment d'activer le levier (index passe de 0 à ≥1)
  _autoLevBorrowed:  0,     // montant emprunté automatiquement via l'index (sous-ensemble de leverageBorrowed)

  // ── v7.2 PHASE 16a · MARGIN-CALL ─────────────────────────
  _marginCallFired: false,  // verrou 1-shot (se déverrouille quand ratio remonte ≥ warn)

  // ── v7.2 PHASE 18 · MONITORING PERF ──────────────────────
  perf: { tickDurations: [], avgMs: 0, maxMs: 0, samples: 0, lastMs: 0 },

  totalTrades:0, winTrades:0,
  botAutoMode: false,
  toastVerbose: false,  // v7.0: silent mode ON par défaut
  // 🤖 true = bot gère tout (AUTO) / false = manuel (MAN)
  pnlHistory:[], b:100,
  chainLog:[], evoLog:[], alerts:[],
  learningHistory: [],
  agentLessons: [],       // v7.3 OPT · mémoire inter-agents — leçons collectives des trades significatifs
  // v7.12 LIVRAISON 4 · MODE TRADING (sim/real)
  tradingMode: 'sim',           // 'sim' | 'real'
  realTimeframe: '15m',         // intervalle décisions bot en mode real
  realActivePairs: {},          // { 'BTC/USDT': true, ... }  paires actives en mode real
  agentLessonsReal: [],         // mémoire d'apprentissage SÉPARÉE en mode real
  realPairCycle: {},            // { 'BTC/USDT': lastTsClosed }  pour détecter nouvelles bougies
  realKillSwitch: {},           // { 'BTC/USDT': { paused:false, lossStreak:0, reason:'' } }
  realModeStartedAt: 0,         // timestamp d'activation du mode real
  // v7.12 LIVRAISON 6 · STATS PAR PAIRE EN MODE REAL
  // Format: { 'BTC/USDT': { wins, losses, pnlNet, trades, lastTrades:[+1,-1,...], lastUpdate:ts } }
  realStatsByPair: {},
  // v7.12 LIVRAISON 6 · SAFETY · snapshot pris automatiquement avant chaque activation
  // du mode réel. Permet de rollback en 1 clic si quelque chose tourne mal.
  preRealSnapshot: null,        // { snap:{...}, takenAt: timestamp, mode: 'auto-pre-real' }
  
  // Utilise vraies bougies Binance MAIS avec règles de sécurité strictes
  agentLessonsPaperReal: [],    // mémoire séparée pour ce mode
  paperRealStats: {},           // { 'BTC/USDT': { wins, losses, pnlNet, trades, lastTrades:[] } }
  paperRealActivePairs: {},     // paires actives en mode Réel
  paperRealTimeframe: '15m',    // intervalle décisions
  paperRealStartedAt: 0,        // timestamp d'activation
  paperRealKillSwitch: {},      // pauses individuelles par paire
  paperRealLastClose: {},       // { 'BTC/USDT': ts_last_close } pour la règle pause 30min
  paperRealConsecLosses: 0,     // pertes consécutives toutes paires confondues
  paperRealGlobalPauseUntil: 0, // pause globale 2h après 3 pertes consécutives
  paperRealConfig: {            // règles modifiables (défaut conservateur)
    maxConcurrentPos: 1,        // 1 position ouverte max simultanée
    stopLossPct: 3.0,           // arrêt de perte fallback à -3% (si ATR pas calculable)
    takeProfitPct: 2.0,         // prise bénéfice fallback à +2%
    cooldownMs: 30 * 60 * 1000, // 30 min pause de référence (auto-ajustée)
    maxConsecLosses: 3,         // 3 pertes consécutives de référence (auto-ajustée)
    globalPauseMs: 2 * 60 * 60 * 1000, // 2h de pause globale
    maxStakePct: 5.0,           // 5% du capital max par trade (référence)
    maxRecentMovePct: 3.0,      // refuser si bougie a bougé > 3%
    slAtrMultiplier: 2.0,       // v7.12 LIVRAISON 16 · SL = 2 × ATR (standard pro)
    // v7.12 LIVRAISON 17 · PHASE 1 · Auto-réglage des paramètres
    tpAtrMultiplier: 1.5,       // 1.3 · TP = 1.5 × ATR (ratio risk/reward 0.75)
    bonusMultiplierMax: 1.5,    // 1.4 · Bonus max sur paires gagnantes (jusqu'à 1.5×)
    adaptiveCooldown: true,     // 1.2 · Cooldown ajusté selon volatilité globale
    adaptiveStopLosses: true,   // 1.1 · Seuil pertes consécutives ajusté selon WR
    // v8.0 PHASE 3 · Apprentissage actif
    contextRefusalEnabled: true,    // 2.3 · Refuser les contextes <30% WR
    contextRefusalMinTrades: 20,    // Minimum de trades pour qu'un contexte soit "jugé"
    contextRefusalMaxWR: 0.30,      // WR max pour qu'un contexte soit refusé
    agentVotingAdaptive: true,      // 2.2 · Pondération adaptative des agents
    agentVoteBoostMax: 1.6,         // Boost max sur agents excellents
    agentVoteReduceMin: 0.4,        // Réduction min sur agents médiocres
    // v8.0 PHASE 4a · A/B testing automatique
    abTestingEnabled: true,         // 3.1 · Active le test A/B en parallèle
    abTestingTradesPerArm: 50,      // Nombre de trades par variante avant verdict
    abTestingMutationStrength: 0.3, // Amplitude de mutation lors d'une nouvelle variante (±30%)
    // v8.0 PHASE 4b · Mémoire transférable entre modes
    transferLearningEnabled: true,  // 3.3 · Active le transfert de mémoire entre modes
    transferWeightSim: 0.3,         
    transferWeightPaperReal: 0.7,   // Poids de la mémoire Réel (réelle mais sans risque)
    transferWeightReal: 1.0,        // Poids de la mémoire réelle (référence absolue)
    // v8.0 PHASE 5 · Intelligence prédictive
    volatilityForecastEnabled: true,    // 4.1 · Prédiction de volatilité (GARCH simplifié)
    volatilityForecastBlockSpike: true, // Bloque ouverture si pic de volatilité prévu
    volatilitySpikeMultiplier: 1.8,     // Si volatilité prévue > 1.8 × moyenne → blocage
    reversalDetectionEnabled: true,     // 4.2 · Détection retournements
    reversalRsiDivergenceThreshold: 8,  // Écart RSI vs prix pour détecter divergence
    reversalEarlyCloseProfit: 0.5,      // Fermeture préventive si déjà en profit > 0.5%
    // v8.0 PHASE 6a · Corrélation entre paires
    correlationLimitEnabled: true,      // 5.1 · Active la limite de positions corrélées
    correlationThreshold: 0.7,          // Au-delà → considéré comme "fortement corrélé"
    correlationDecimateFactor: 0.5,     // Si corrélé, mise réduite à 50% (au lieu de bloquer)
    // v8.0 PHASE 6b · Allocation dynamique + Hedging
    sharpeAllocationEnabled: true,      // 5.2 · Allocation pondérée par Sharpe par paire
    sharpeAllocationMaxBoost: 1.5,      // Boost max sur paires excellentes
    sharpeAllocationMinReduce: 0.4,     // Réduction min sur paires médiocres
    hedgingEnabled: false,              // 5.3 · Hedging défensif (DÉSACTIVÉ par défaut, opt-in)
    hedgingTriggerBearStreak: 3,        // 3 régimes BEAR consécutifs → trigger
    hedgingMaxAllocPct: 2.0             // Max 2% du capital sur le hedge (petit)
  },
  // v8.0 LIVRAISON 25 · RECALIBRAGE P&L PAR PÉRIODE
  // Le P&L de session se réinitialise tous les jours à minuit pour éviter
  // les chiffres absurdes cumulés sur de longues sessions.
  pnlPeriod: {
    todayStartPortfolio: null,    // valeur au début de la journée (00:00 locale)
    todayDate: null,              // 'YYYY-MM-DD' courant
    weekStartPortfolio: null,     // valeur au début de la semaine
    weekStart: null,              // 'YYYY-WW' courant
    monthStartPortfolio: null,    // valeur au début du mois
    monthStart: null,             // 'YYYY-MM' courant
    history: []                   // [{ date: 'YYYY-MM-DD', start, end, pnlPct, pnlUsd }]
  },
  
  // v8.0 PHASE 4a · A/B TESTING AUTOMATIQUE
  // Le bot teste 2 variantes de paramètres en parallèle.
  // Chaque trade est étiqueté 'A' ou 'B' (alterné).
  // Au bout de N trades par variante, comparaison + sélection.
  abTesting: {
    armA: {
      params: { slAtrMult: 2.0, tpAtrMult: 1.5, stakeFactor: 1.0 },  // référence
      trades: 0, wins: 0, losses: 0, pnl: 0,
      label: 'A (référence)'
    },
    armB: {
      params: { slAtrMult: 2.5, tpAtrMult: 1.8, stakeFactor: 1.0 },  // mutation
      trades: 0, wins: 0, losses: 0, pnl: 0,
      label: 'B (challenger)'
    },
    nextAssign: 'A',          // alternance simple
    generation: 0,             // nb de cycles complétés
    history: [],               // log des verdicts passés
    lastVerdict: null          // { winner, loser, params, ts }
  },
  
  // v8.0 PHASE 2 · MÉMOIRE DES CONTEXTES DE TRADES
  // Pour chaque trade fermé en mode Réel, stocke un snapshot complet :
  // - Conditions de marché à l'ouverture
  // - Indicateurs techniques au moment de l'entrée
  // - Régime, heure, paire, agents votants
  // - Résultat (gain/perte) — enrichi à la fermeture
  // Limite : 500 entrées (FIFO), suffisant pour identifier des patterns
  tradeContextMemory: [],
  
  // v7.12 LIVRAISON 17 · MÉMOIRE DES PARAMÈTRES AUTO-AJUSTÉS (pour panneau diagnostic)
  adaptiveState: {
    lastTpUsed: null,           // dernier TP calculé (pour traçabilité)
    lastSlUsed: null,           // dernier SL calculé
    lastCooldownMs: null,       // dernier cooldown effectif
    lastConsecLossThresh: null, // dernier seuil pertes consécutives
    lastEffectiveWR: null,      // WR effectif observé
    lastMarketVolatility: null, // volatilité globale observée
    lastBonusMultipliers: {},   // { 'BTC/USDT': 1.2, ... }
    // v8.0 PHASE 3
    lastContextRefusalCount: 0,    // nb de refus de contexte récents
    lastContextRefusalReason: null, // dernier refus + raison
    lastAgentBoosts: {},           // { 'agent_name': 1.4, ... }
    // v8.0 PHASE 4b
    lastTransferLearning: null,    // info dernier transfert
    lastEvolutionGen: 0,           // dernière génération d'agent observée
    // v8.0 PHASE 5
    lastVolForecast: null,         // { pair, currentVol, forecastVol, ratio, blocked }
    lastReversalDetection: null,   // { pair, type, score, action }
    volForecastBlocks: 0,          // nb de blocages préventifs
    reversalEarlyCloses: 0,        // nb de fermetures préventives
    // v8.0 PHASE 6a
    correlationMatrix: {},         // { 'BTC|ETH': 0.85, ... } cache corrélations
    correlationMatrixTs: 0,        // timestamp dernier calcul (cache 5 min)
    correlationLimitActions: 0,    // nb de mises réduites pour cause de corrélation
    lastCorrelationDecision: null, // { pair, correlatedWith, value, action }
    // v8.0 PHASE 6b
    sharpeByPair: {},              // { 'BTC/USDT': 0.85, ... } Sharpe par paire
    sharpeAllocations: {},         // { 'BTC/USDT': 1.3, ... } multiplicateurs alloc
    sharpeAllocTs: 0,              // timestamp dernier calcul
    hedgeActive: false,            // hedge ouvert actuellement ?
    hedgeOpenedAt: 0,              // timestamp ouverture
    hedgePositionId: null,         // ID de la position hedge
    bearStreak: 0,                 // compteur de régimes BEAR consécutifs
    lastHedgeAction: null          // dernière action de hedging
  },
  preRealSnapshotPaperReal: null, // snapshot avant activation Réel
  currentPage:0, tf:'5m',
  activePair:'BTC/USDT',
  pairStates:{},
  openPositions:[],
  proposals:[
    { id:42, desc:'Augmenter taille position BTC 0.01→0.02', forVotes:1850, againstVotes:1094, status:'active', userVoted:false },
    { id:43, desc:'Ouvrir position SOL/USDT 5% du capital',  forVotes:980,  againstVotes:410,  status:'active', userVoted:false }
  ],

  // ── AGENT MEMORY & METAPHORS ─────────────────────────────
  globalMemoryPool: [],   // Shared cross-agent knowledge base (metaphors)

  // ── DREAM SEQUENCES ──────────────────────────────────────
  dreams: [],             // Log of completed dream cycles
  dreamActive: false,     // Is a dream currently running?
  dreamProgress: 0,       // 0-100%
  currentDream: null,     // Active dream scenario object
  _holdConsecutive: {},   // Per-pair hold counters for dream trigger

  // ── VERSION AUTO-INCREMENT ───────────────────────────────
  vMajor: 8, vMinor: 92,

  // ── MODE AUTO / MANUEL ───────────────────────────────────
  mode: 'auto',   // 'auto' | 'manual'

  // ── DYNAMIC PAIR CANDIDATES ──────────────────────────────
  pairCandidates: [
    { sym:'DOGE', name:'Dogecoin',     color:'#c3a634', startPrice:0.165,  vol:0.004, minP:0.05,  maxP:0.80,  dec:4, emoji:'🐕', corr:'LOW',   rationale:'Capitalisation top-10, corrélation BTC ~0.72, fort signal sentiment communautaire. Diversifie l\'exposition meme-coin.' },
    { sym:'AVAX', name:'Avalanche',    color:'#e84142', startPrice:28.5,   vol:0.9,   minP:10,    maxP:120,   dec:2, emoji:'🔺', corr:'MED',   rationale:'Écosystème DeFi croissant, corrélation ETH ~0.81. Agent On-Chain détecte activité smart-contract en hausse.' },
    { sym:'LINK', name:'Chainlink',    color:'#375bd2', startPrice:14.2,   vol:0.4,   minP:5,     maxP:50,    dec:2, emoji:'⛓', corr:'LOW',   rationale:'Infrastructure oracle critique, décorrélé des majeurs. Signal fondamental très fort — adoption institutionnelle.' },
    { sym:'ADA',  name:'Cardano',      color:'#0033ad', startPrice:0.44,   vol:0.012, minP:0.15,  maxP:2.5,   dec:4, emoji:'🔵', corr:'MED',   rationale:'Volume trading élevé, forte activité on-chain. Complète l\'exposition smart-contract sans doublon ETH.' },
    { sym:'BNB',  name:'BNB Chain',    color:'#f3ba2f', startPrice:580,    vol:12,    minP:200,   maxP:1200,  dec:0, emoji:'🟡', corr:'HIGH',  rationale:'Liquidité maximale exchange natif, frais réduits. Corrélation BTC utilisable comme couverture implicite.' },
    { sym:'DOT',  name:'Polkadot',     color:'#e6007a', startPrice:6.8,    vol:0.25,  minP:3,     maxP:30,    dec:2, emoji:'🔴', corr:'LOW',   rationale:'Interopérabilité parachain — exposition future Web3 orthogonale aux assets actuels du portefeuille.' },
  ],
  activePairProposal: null,  // Current proposed pair sym

  // ── FRAIS & TAXES ────────────────────────────────────────────
  feeConfig: {
    makerRate:   0.0002,   // 0.02% maker (ordres limites — seuil conviction 80%)
    takerRate:   0.0005,   // 0.05% taker (ordres marché — signal modéré)
    fundingRate: 0.00005,  // 0.005% financement/cycle (positions ouvertes)
    slippage:    0.0003,   // 0.03% slippage — optimisé vs 0.05% précédent
    // Note: frais réels Binance spot: maker 0.02-0.10%, taker 0.04-0.10%
    // NEXUS utilise maker quand conviction >= 80% → réduction ~60% des frais
  },
  taxConfig: {
    region:     'BE',     // Belgique par défaut
    regions: {
      BE: { label:'🇧🇪 Belgique',    rate:0.00,   inclusion:0.0,   method:'Exonéré*',      note:'Gains en capital exonérés si gestion "normale" du patrimoine. Spéculation taxée 33%' },
      CA: { label:'🇨🇦 Canada',      rate:0.267,  inclusion:0.5,   method:'Inclusion 50%', note:'Gains en capital: 50% inclus dans revenus, ~26.7% effectif' },
      FR: { label:'🇫🇷 France',      rate:0.30,   inclusion:1.0,   method:'Flat Tax 30%',  note:'PFU 30% (12.8% IR + 17.2% PS) sur gains nets' },
      US: { label:'🇺🇸 États-Unis',  rate:0.20,   inclusion:1.0,   method:'Capital Gains', note:'20% long-terme / 37% court-terme sur gains nets' },
      CH: { label:'🇨🇭 Suisse',      rate:0.00,   inclusion:0.0,   method:'Exonéré',       note:'Gains en capital exonérés si non-professionnel' },
      SG: { label:'🇸🇬 Singapour',   rate:0.00,   inclusion:0.0,   method:'Exonéré',       note:'Pas d\'impôt sur gains en capital crypto' },
      EU: { label:'🇪🇺 Europe (moy)', rate:0.20,   inclusion:1.0,   method:'Variable',      note:'Taux moyen orientatif ~20%, varie par pays' },
    }
  },
  fees: {
    // ── Totaux globaux ──
    totalTradingFees: 0,    // frais exchange accumulés ($)
    totalFunding:     0,    // frais de financement ($)
    totalSlippage:    0,    // slippage estimé ($)
    totalGross:       0,    // total frais bruts ($)
    totalTaxProvision:0,    // provision fiscale totale ($)
    totalPnlGross:    0,    // P&L brut avant frais/taxes ($)
    totalPnlNet:      0,    // P&L net après frais+taxes ($)
    tradeCount:       0,    // nombre de trades avec frais
    // ── Compte séparé provisions ──
    feeReserveAccount: 0,   // MONTANT MIS EN RÉSERVE (frais + taxes, compte séparé)
    feeLog:           [],   // max 50 entrées détaillées
    // ── Par paire ──
    byPair: {}              // {pair: {tradingFees, funding, slippage, gross, tax, pnlGross, pnlNet, trades, netPct}}
  },
  agents:[
    // ── Agents d'Analyse Fondamentale ──────────────────────────────────────
    { id:'macro_v1',     name:'Macro-Économie',     emoji:'📊', type:'Linear·FRED',    source:'Fed/BCE/FMI',      score:-0.30, conf:0.70, fitness:878,  color:'var(--ice)',
      role:'fundamental', domain:'macro',      errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    { id:'fundamental_v1',name:'EPS·P/E·EV',        emoji:'💹', type:'Quant·Alpha',    source:'Bloomberg/AlphaV', score:0.25,  conf:0.65, fitness:620,  color:'var(--up)',
      role:'fundamental', domain:'corporate',  errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    { id:'nlp_v1',       name:'Sentiment NLP',      emoji:'🧠', type:'NLP·BERT-fin',   source:'News/Earnings',    score:0.40,  conf:0.72, fitness:730,  color:'var(--pur)',
      role:'fundamental', domain:'nlp',        errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    // ── Agents d'Analyse de Marché ──────────────────────────────────────────
    { id:'sentiment_v2', name:'Sentiment Social',   emoji:'💬', type:'NLP·BERT',       source:'Twitter/Reddit',   score:0.65,  conf:0.82, fitness:1200, color:'var(--up)',
      role:'sentiment',   domain:'social',     errors:0, corrections:0, streak:2, lastPnl:0.65, memory:[] },
    { id:'volume_v1',    name:'Volume·Flux',        emoji:'📦', type:'Stat·OBV',       source:'Binance/OB',       score:0.15,  conf:0.68, fitness:540,  color:'var(--gold)',
      role:'technical',   domain:'volume',     errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    { id:'volatility_v1',name:'Volatilité·ATR',     emoji:'📐', type:'Stat·GARCH',     source:'Price/Options',    score:-0.10, conf:0.75, fitness:660,  color:'var(--gold)',
      role:'technical',   domain:'risk',       errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    { id:'corr_v1',      name:'Corrélation·Cross',  emoji:'🔗', type:'Stat·PCA',       source:'Multi-Asset',      score:0.30,  conf:0.63, fitness:480,  color:'var(--ice)',
      role:'technical',   domain:'correlation',errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    // ── Agents de Contexte Global ───────────────────────────────────────────
    { id:'geopolitic_v1',name:'Géopolitique',       emoji:'🌍', type:'LLM·GPT-4',      source:'GDELT/News',       score:0.20,  conf:0.65, fitness:572,  color:'var(--pur)',
      role:'context',     domain:'geopolitics',errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    { id:'onchain_v1',   name:'On-Chain Analytics', emoji:'⛓️', type:'Graph·Anomaly',  source:'Etherscan/Glassn', score:0.10,  conf:0.78, fitness:810,  color:'var(--ice)',
      role:'context',     domain:'onchain',    errors:0, corrections:0, streak:1, lastPnl:0, memory:[] },
    { id:'security_v1',  name:'Sécurité·Risque',   emoji:'🔒', type:'Anomaly·Forta',  source:'Forta/CertiK',     score:0.05,  conf:0.60, fitness:400,  color:'var(--gold)',
      role:'context',     domain:'security',   errors:0, corrections:0, streak:0, lastPnl:0, memory:[] },
    // ── Bots d'Exécution Spécialisés ────────────────────────────────────────
    { id:'exec_bot_v1',  name:'Bot Exécution',      emoji:'⚡', type:'TWAP·VWAP',      source:'Exchange·CCXT',    score:0.00,  conf:0.95, fitness:950,  color:'var(--up)',
      role:'execution',   domain:'orders',     errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true },
    { id:'risk_bot_v1',  name:'Bot Gestion Risque', emoji:'🛡️', type:'VaR·Kelly',      source:'Portfolio·VaR',    score:0.00,  conf:0.90, fitness:900,  color:'var(--down)',
      role:'execution',   domain:'risk_mgmt',  errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true },
    { id:'arb_bot_v1',   name:'Bot Arbitrage',      emoji:'⚖️', type:'Stat·Arb',       source:'Multi-Exchange',   score:0.00,  conf:0.80, fitness:750,  color:'var(--gold)',
      role:'execution',   domain:'arbitrage',  errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true },
    { id:'scalper_bot_v1',name:'Bot Scalper·HF',    emoji:'🎯', type:'HFT·OrderFlow',  source:'L2·OrderBook',     score:0.00,  conf:0.85, fitness:820,  color:'var(--pur)',
      role:'execution',   domain:'scalping',   errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true },
    // ── Agent Évolueur (Méta) ───────────────────────────────────────────────
    { id:'evolver_v1',   name:'Évolueur·Méta-IA',   emoji:'🧬', type:'GenAlgo·LLM',    source:'All·Agents',       score:0.00,  conf:0.70, fitness:500,  color:'var(--pur)',
      role:'meta',        domain:'evolution',  errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isMeta:true },
    // ── v5.5 · Agents Spécialistes Additionnels ───────────────────────────
    { id:'whale_v1',     name:'Whale Watcher',      emoji:'🐋', type:'On-Chain·L2',    source:'Mempool·DEX',      score:0.00,  conf:0.75, fitness:650,  color:'var(--ice)',
      role:'scout',       domain:'whale',      errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isScout:true },
    { id:'breakout_v1',  name:'Breakout Sniper',    emoji:'🎯', type:'Range·ATR',      source:'Price·Structure',  score:0.00,  conf:0.70, fitness:580,  color:'var(--gold)',
      role:'scout',       domain:'breakout',   errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isScout:true },
    { id:'harmonic_v1',  name:'Harmonic Analyst',   emoji:'🎼', type:'Multi·Align',    source:'Tech·Indicators',  score:0.00,  conf:0.68, fitness:510,  color:'var(--pur)',
      role:'scout',       domain:'harmonic',   errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isScout:true },
    { id:'flow_v1',      name:'Order Flow',         emoji:'📡', type:'L2·Microstruct', source:'OrderBook·Depth',  score:0.00,  conf:0.72, fitness:620,  color:'var(--up)',
      role:'scout',       domain:'flow',       errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isScout:true },
    { id:'momentum_v1',  name:'Momentum Core',      emoji:'🚀', type:'RSI·MACD·EMA',   source:'Price·Candles',    score:0.00,  conf:0.80, fitness:740,  color:'var(--up)',
      role:'council',     domain:'momentum',   errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isCouncil:true },
    { id:'mean_rev_v1',  name:'Mean Reversion',     emoji:'🔄', type:'Z-Score·Bands',  source:'Price·Variance',   score:0.00,  conf:0.66, fitness:490,  color:'var(--gold)',
      role:'council',     domain:'mean_rev',   errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isCouncil:true },
    // ── v5.5 · Conseil Principal (5 voteurs décisionnaires) ─────────────────
    { id:'scalper_v2',    name:'Scalper·Council',    emoji:'⚡', type:'Momentum·5min',  source:'LMSR·Price',       score:0.00,  conf:0.78, fitness:720,  color:'var(--up)',
      role:'council',     domain:'scalping',   errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isCouncil:true },
    { id:'swing_v2',      name:'Swing·Council',      emoji:'🌊', type:'Cycles·1h-4h',   source:'MACD·ADX',         score:0.00,  conf:0.74, fitness:680,  color:'var(--ice)',
      role:'council',     domain:'swing',      errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isCouncil:true },
    { id:'contrarian_v2', name:'Contrarian·Council', emoji:'🔥', type:'Fade·Extremes',  source:'RSI·Sentiment',    score:0.00,  conf:0.70, fitness:595,  color:'var(--down)',
      role:'council',     domain:'contrarian', errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isCouncil:true },
    { id:'trend_v2',      name:'Trend·Council',      emoji:'📈', type:'ADX·EMA·Cross',  source:'Price·Structure',  score:0.00,  conf:0.82, fitness:780,  color:'var(--up)',
      role:'council',     domain:'trend',      errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isCouncil:true },
    { id:'hedge_v2',      name:'Hedge·Council',      emoji:'🛡️', type:'Risk·Off·Defender',source:'Vol·Macro',       score:0.00,  conf:0.76, fitness:655,  color:'var(--gold)',
      role:'council',     domain:'hedge',      errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isCouncil:true },
    // ── v5.6 · Flotte de Bots d'Exécution Étendue ───────────────────────────
    { id:'fiscal_bot_v1',  name:'Bot Optimiseur Fiscal', emoji:'💎', type:'Tax·Harvest',   source:'Portfolio·Fees',   score:0.00,  conf:0.88, fitness:810,  color:'var(--gold)',
      role:'execution',   domain:'fiscal',     errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true, isFleet:true },
    { id:'dca_bot_v1',     name:'Bot DCA·Grid',          emoji:'🧲', type:'Accumulation',  source:'Vol·Trend',        score:0.00,  conf:0.75, fitness:620,  color:'var(--ice)',
      role:'execution',   domain:'dca',        errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true, isFleet:true },
    { id:'rescue_bot_v1',  name:'Bot Sauvetage',         emoji:'🛟', type:'Emergency·Flat',source:'Drawdown·VaR',     score:0.00,  conf:0.92, fitness:950,  color:'var(--down)',
      role:'execution',   domain:'rescue',     errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true, isFleet:true },
    { id:'rebalance_bot_v1',name:'Bot Rééquilibrage',    emoji:'🔀', type:'Portfolio·Skew',source:'Allocation',       score:0.00,  conf:0.80, fitness:700,  color:'var(--pur)',
      role:'execution',   domain:'rebalance',  errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true, isFleet:true },
    { id:'smart_sizer_v1', name:'Bot Smart Sizer',       emoji:'📊', type:'Kelly·VaR',     source:'Win-rate·Streak',  score:0.00,  conf:0.85, fitness:770,  color:'var(--up)',
      role:'execution',   domain:'sizing',     errors:0, corrections:0, streak:0, lastPnl:0, memory:[], isBot:true, isFleet:true }
  ]
};

Object.keys(PAIRS).forEach(k=>{ S.pairStates[k]=makePairState(PAIRS[k]); });

function AP()   { return S.pairStates[S.activePair]; }
function ACFG() { return PAIRS[S.activePair]; }
// v7.0: MARKET REGIME DETECTION — détecte le contexte actuel du marché
// Classifie en: 'bull' (hausse forte), 'bear' (baisse forte), 'volatile' (agité), 'calm' (stable)
function detectMarketRegime() {
  if(!S.pairStates) return 'calm';
  const pairs = Object.values(S.pairStates);
  if(pairs.length === 0) return 'calm';

  // Agrégats cross-paires
  let avgPnl24 = 0, avgVol = 0, countValid = 0;
  pairs.forEach(ps => {
    if(typeof ps.pnl24h === 'number' && !isNaN(ps.pnl24h)) {
      avgPnl24 += ps.pnl24h;
      countValid++;
    }
    // Volatilité = σ des dernières bougies
    if(ps.candles && ps.candles.length >= 10) {
      const closes = ps.candles.slice(-20).map(k => k.c);
      const mean = closes.reduce((a,b)=>a+b,0) / closes.length;
      const variance = closes.reduce((a,b)=>a+(b-mean)**2,0) / closes.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      avgVol += cv;
    }
  });
  if(countValid === 0) return 'calm';
  avgPnl24 /= countValid;
  avgVol /= countValid;

  // Classification
  const isVolatile = avgVol > 0.02;   // >2% de variance relative
  const isBull     = avgPnl24 > 2;     // +2% 24h moyen
  const isBear     = avgPnl24 < -2;    // -2% 24h moyen

  if(isVolatile && isBull) return 'volatile_bull';
  if(isVolatile && isBear) return 'volatile_bear';
  if(isVolatile)           return 'volatile';
  if(isBull)               return 'bull';
  if(isBear)               return 'bear';
  return 'calm';
}

// v7.0: PER-REGIME FITNESS — chaque agent accumule sa performance par régime
function updateRegimeFitness(agent, regime, pnlPct) {
  if(!agent || !regime) return;  // v7.0: null safety
  if(!agent.regimeFitness) agent.regimeFitness = {};
  if(!agent.regimeFitness[regime]) agent.regimeFitness[regime] = { wins:0, total:0, sumPnl:0 };
  const rf = agent.regimeFitness[regime];
  rf.total++;
  if(pnlPct > 0) rf.wins++;
  rf.sumPnl += pnlPct;
}

// v7.0: CONTEXT-AWARE WEIGHT — booster les agents spécialistes du régime actuel
function getContextualWeight(agent, currentRegime) {
  if(!agent) return 500;  // v7.0: null safety
  const base = agent.fitness || 500;
  if(!agent.regimeFitness || !agent.regimeFitness[currentRegime]) return base;
  const rf = agent.regimeFitness[currentRegime];
  if(rf.total < 3) return base; // pas assez d'historique
  const winRate = rf.wins / rf.total;
  // Bonus: agent avec >60% win rate dans ce régime reçoit boost x1.3
  // Malus: agent avec <30% win rate dans ce régime perd 30%
  let mult = 1.0;
  if(winRate >= 0.6) mult = 1 + Math.min(0.5, (winRate - 0.6) * 1.0);
  else if(winRate <= 0.3) mult = Math.max(0.5, 0.7 + winRate);
  return base * mult;
}

function lmsrP(ps){ ps=ps||AP(); return ps.qYes/(ps.qYes+ps.qNo); }
function fmtPrice(v,dec){ return dec>=4?v.toFixed(dec):'$'+Math.floor(v).toLocaleString(); }
// Safe DOM text setter — never throws on missing element
function setEl(id, val) { const e = document.getElementById(id); if(e) e.textContent = val; }

// ============================================================

// ============================================================
const COINGECKO_IDS = {
  'BTC/USDT':  'bitcoin',
  'ETH/USDT':  'ethereum',
  'XRP/USDT':  'ripple',
  'SOL/USDT':  'solana',
  'DOGE/USDT': 'dogecoin',
  'DOT/USDT':  'polkadot',
  'ADA/USDT':  'cardano',
  'AVAX/USDT': 'avalanche-2',
  'LINK/USDT': 'chainlink',
  'MATIC/USDT':'matic-network',
};

let _lastPriceFetch   = 0;
let _pricesFetched    = false;
let _fetchInProgress  = false;

// Fetch real prices from CoinGecko (free, no key needed)
// v7.0: Prix live BULLETPROOF — retry auto, cache, watchdog
let _priceRetryDelay = 2000;  // Backoff exponentiel: 2s, 4s, 8s, 16s, 32s max
const _PRICE_RETRY_MAX = 32000;

function _setLiveIndicator(state, label) {
  const indicator = document.getElementById('livePriceIndicator');
  if(!indicator) return;
  // v7.12 · STABILITÉ · texte court et fixe (pas d'horodatage variable)
  const states = {
    fetching: { text:'↻ SYNC',   bg:'rgba(245,200,66,.12)', border:'rgba(245,200,66,.3)', color:'var(--gold)' },
    live:     { text:'● LIVE',   bg:'rgba(0,232,122,.12)',  border:'rgba(0,232,122,.3)',  color:'var(--up)' },
    live_bn:  { text:'● LIVE BN', bg:'rgba(56,212,245,.12)', border:'rgba(56,212,245,.3)', color:'var(--ice)' },
    sim:      { text:'~ SIM',    bg:'rgba(167,139,250,.12)', border:'rgba(167,139,250,.3)', color:'var(--pur)' },
    stale:    { text:'◐ STALE',  bg:'rgba(245,200,66,.12)', border:'rgba(245,200,66,.3)', color:'var(--gold)' },
    error:    { text:'~ SIM',    bg:'rgba(167,139,250,.12)', border:'rgba(167,139,250,.3)', color:'var(--pur)' }
  };
  const s = states[state] || states.error;
  indicator.textContent = s.text;
  indicator.style.background = s.bg;
  indicator.style.borderColor = s.border;
  indicator.style.color = s.color;
  // titre pour hover (garde l'info horodatage si le label fourni)
  if (label) indicator.title = label;
}

// ═══ v7.12 · PRICE SOURCE TIER ═══

let _priceSource = 0;  // current tier
let _cgFailCount = 0;  // consecutive CG failures
const _CG_FAIL_THRESHOLD = 2;  // after 2 consecutive fails, switch to Binance

// Binance symbol mapping
const BINANCE_SYMBOLS = {
  'BTC/USDT':'BTCUSDT','ETH/USDT':'ETHUSDT','XRP/USDT':'XRPUSDT','SOL/USDT':'SOLUSDT',
  'DOGE/USDT':'DOGEUSDT','DOT/USDT':'DOTUSDT','ADA/USDT':'ADAUSDT','AVAX/USDT':'AVAXUSDT',
  'LINK/USDT':'LINKUSDT','MATIC/USDT':'MATICUSDT'
};

async function fetchBinancePrices() {
  try {
    const symbols = Object.values(BINANCE_SYMBOLS).filter(s => s).map(s => `"${s}"`).join(',');
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if(!resp.ok) throw new Error('Binance HTTP '+resp.status);
    const data = await resp.json();
    if(!Array.isArray(data)) throw new Error('Binance malformed response');
    
    let updated = 0;
    const symToPair = Object.fromEntries(Object.entries(BINANCE_SYMBOLS).map(([p,s])=>[s,p]));
    data.forEach(item => {
      const pair = symToPair[item.symbol];
      if(!pair) return;
      const ps = S.pairStates[pair];
      const cfg = PAIRS[pair];
      if(!ps || !cfg) return;
      const realPrice = parseFloat(item.lastPrice);
      const change24h = parseFloat(item.priceChangePercent);
      if(!realPrice || isNaN(realPrice)) return;
      
      if(!ps._targetPrice && Math.abs(realPrice - ps.price) / ps.price > 0.005) {
        ps.price = realPrice;
        if(ps.candles.length > 0) ps.candles[ps.candles.length-1].c = realPrice;
      }
      ps._targetPrice = realPrice;
      ps.pnl24h = change24h;
      
      // v7.12 LIVRAISON 1 · agrège dans les bougies temps réel (5m/15m/1h)
      try { _aggregateRealPrice(pair, realPrice); } catch(e) { /* silent */ }
      
      cfg.minP = realPrice * 0.65;
      cfg.maxP = realPrice * 1.55;
      const dailyRange = realPrice * Math.abs(change24h) / 100;
      cfg.vol = Math.max(cfg.vol * 0.3, dailyRange / 9.8);
      updated++;
    });
    
    if(updated > 0) {
      _lastPriceFetch = Date.now();
      if (typeof markRealPriceReceived === 'function') markRealPriceReceived();
      _pricesFetched = true;
      _priceSource = 1;
      const t = new Date().toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'});
      _setLiveIndicator('live_bn', `● LIVE BN ${t}`);
      return true;
    }
    return false;
  } catch(err) {
    console.warn('[Binance fetch failed]', err.message);
    return false;
  }
}


function _simulationTickAll() {
  // v7.12 LIVRAISON 4 · en mode real OU Réel, le prix vient du WS Binance
  if (_isRealLike()) {
    _lastPriceFetch = Date.now();
    _priceSource = 1;  // marqué comme prix "live" (vient du WS)
    return;
  }
  Object.entries(S.pairStates).forEach(([pair, ps]) => {
    const cfg = PAIRS[pair];
    if(!cfg || !ps || !ps.price) return;
    // GBM: dS = S * (μ*dt + σ*sqrt(dt)*Z)
    const dt = 1/96;  // 1 tick = ~1/96 of day
    const mu = 0;  // no drift in sim
    const sigma = Math.max(0.005, (cfg.vol / cfg.startPrice) || 0.01);  // relative vol
    const Z = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * Math.sqrt(3);  // ~N(0,1)
    const change = mu*dt + sigma*Math.sqrt(dt)*Z;
    ps.price = ps.price * (1 + change);
    // Update last candle close
    if(ps.candles && ps.candles.length > 0) {
      const last = ps.candles[ps.candles.length-1];
      last.c = ps.price;
      last.h = Math.max(last.h, ps.price);
      last.l = Math.min(last.l, ps.price);
      last.t = Date.now();  // Touch timestamp to avoid STALE detection
    }
  });
  _lastPriceFetch = Date.now();  // Prevent STALE flag
  _priceSource = 2;
  _setLiveIndicator('sim');
}



// ═══════════════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 2 · MODAL BOUGIES TEMPS RÉEL
// ═══════════════════════════════════════════════════════════════════════

let _realCandlesState = {
  selectedPair: 'BTC/USDT',
  selectedInterval: '5m',
  refreshTimer: null,
  zoomLevel: 1.0,        // 0.5 = beaucoup de bougies fines, 2.0 = peu de bougies épaisses
  scrollOffset: 0,        // décalage en bougies depuis la fin (0 = bougies les plus récentes)
  isDragging: false,
  dragStartX: 0,
  dragStartOffset: 0,
  viewMode: 'candles',    // 'candles' ou 'line'
  pulsePhase: 0,           // animation de la bougie live
  animFrameId: null,
  // v7.12 LIVRAISON 2 · ajouts
  crosshairX: -1,        // position X souris/touch (px CSS) — -1 = pas de crosshair
  crosshairY: -1,
  showVolume: true,      // D · barres de volume sous les bougies
  showMA: false,         // E · moyenne mobile 20 périodes
  showEMA: false,        // E · EMA 12 périodes
  // v7.12 LIVRAISON 3 · indicateurs avancés
  showBB: false,         // Bollinger Bands (overlay)
  showRSI: false,        // RSI 14 (panel séparé)
  showMACD: false,       // MACD (panel séparé)
  // v7.12 LIVRAISON 2 · WebSocket Binance pour prix temps réel
  ws: null,              // WebSocket actif (null si fermé)
  wsConnected: false,    // état de la connexion (vert si connecté)
  wsLastTradeTs: 0,      // timestamp du dernier trade reçu
  wsPair: null,          // paire actuellement souscrite (pour détecter changement)
  // v7.12 LIVRAISON 3 · throttle du rendu (60fps max)
  _renderPending: false,
  _lastRenderTs: 0,
  // v7.12 LIVRAISON 3 · cache des indicateurs (clé: pair+iv+len, valeur: { ma, ema, rsi, macd, bb })
  _indicCache: {}
};

function openRealCandlesModal() {
  _ensureRealCandlesStruct();
  
  // ═══ AMORCE IMMÉDIATE ═══
  // Pour que tu voies la bougie en cours dès l'ouverture du modal sans attendre
  // un nouveau fetch (qui n'arrive que toutes les ~15s), on injecte le prix
  // courant connu (S.pairStates[pair].price) dans toutes les paires/intervalles
  // qui n'ont pas encore de bougie en cours. La bougie sera ensuite mise à jour
  // normalement quand un nouveau prix réel arrive.
  try {
    if (S && S.pairStates) {
      Object.keys(S.pairStates).forEach(pair => {
        const ps = S.pairStates[pair];
        if (ps && isFinite(ps.price) && ps.price > 0) {
          _aggregateRealPrice(pair, ps.price);
        }
      });
    }
  } catch(e) { /* silent */ }
  
  // Construire le modal
  const existing = document.getElementById('realCandlesModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'realCandlesModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,.85);
    display:flex;align-items:center;justify-content:center;padding:12px;
  `;
  modal.onclick = (e) => { if (e.target === modal) closeRealCandlesModal(); };
  
  const pairList = Object.keys(PAIRS || {});
  const intervals = ['5m', '15m', '1h', '4h', '1j'];
  
  modal.innerHTML = `
    <div style="background:var(--s1);border:1px solid var(--border);border-radius:16px;
                width:100%;max-width:420px;max-height:92vh;overflow-y:auto;display:flex;flex-direction:column;">
      
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 14px 8px;border-bottom:1px solid var(--border);">
        <div style="font-size:14px;font-weight:800;color:var(--up);">📊 Bougies temps réel</div>
        <button onclick="closeRealCandlesModal()" style="background:var(--s3);border:1px solid var(--border);border-radius:8px;color:var(--t2);padding:4px 12px;font-size:13px;cursor:pointer;">✕</button>
      </div>
      
      <!-- Sélecteur Paire -->
      <div style="padding:10px 14px 6px;">
        <div style="font-size:9px;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Paire</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${pairList.map(p => `
            <button onclick="_selectRealCandlesPair('${p}')" data-rc-pair="${p}" 
                    style="padding:6px 9px;font-size:10px;font-weight:700;font-family:var(--font-mono);
                           background:${p === _realCandlesState.selectedPair ? 'rgba(0,232,122,.15)' : 'var(--s2)'};
                           color:${p === _realCandlesState.selectedPair ? 'var(--up)' : 'var(--t2)'};
                           border:1px solid ${p === _realCandlesState.selectedPair ? 'var(--up)' : 'var(--border)'};
                           border-radius:6px;cursor:pointer;">
              ${p.split('/')[0]}
            </button>
          `).join('')}
        </div>
      </div>
      
      <!-- Sélecteur Intervalle -->
      <div style="padding:6px 14px 10px;">
        <div style="font-size:9px;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Intervalle</div>
        <div style="display:flex;gap:5px;">
          ${intervals.map(iv => `
            <button onclick="_selectRealCandlesInterval('${iv}')" data-rc-interval="${iv}"
                    style="flex:1;padding:8px;font-size:11px;font-weight:700;font-family:var(--font-mono);
                           background:${iv === _realCandlesState.selectedInterval ? 'rgba(0,232,122,.15)' : 'var(--s2)'};
                           color:${iv === _realCandlesState.selectedInterval ? 'var(--up)' : 'var(--t2)'};
                           border:1px solid ${iv === _realCandlesState.selectedInterval ? 'var(--up)' : 'var(--border)'};
                           border-radius:6px;cursor:pointer;">
              ${iv}
            </button>
          `).join('')}
        </div>
      </div>
      
      <!-- Info prix actuel -->
      <div id="rcInfoBar" style="margin:0 14px;padding:8px 10px;background:var(--s2);border:1px solid var(--border);border-radius:8px;display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:11px;">
        <span id="rcCurrentPrice" style="color:var(--t1);font-weight:700;">— $—</span>
        <span id="rcLastUpdate" style="color:var(--t3);font-size:9px;">MAJ il y a —</span>
      </div>
      
      <!-- Contrôles zoom et scroll -->
      <div style="padding:6px 14px 0;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
        <div style="display:flex;gap:4px;">
          <button onclick="_rcSetView('candles')" id="rcViewBtnCandles" style="padding:0 8px;height:24px;background:rgba(0,232,122,.15);border:1px solid var(--up);border-radius:6px;color:var(--up);cursor:pointer;font-size:10px;font-weight:700;">📊 Bougies</button>
          <button onclick="_rcSetView('line')" id="rcViewBtnLine" style="padding:0 8px;height:24px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-size:10px;font-weight:700;">📈 Ligne</button>
        </div>
        <div style="display:flex;gap:4px;">
          <button onclick="_rcZoomChange(0.7)" style="width:28px;height:24px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-weight:700;font-size:14px;line-height:1;">−</button>
          <button onclick="_rcZoomReset()" style="padding:0 8px;height:24px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-size:9px;">FIT</button>
          <button onclick="_rcZoomChange(1.4)" style="width:28px;height:24px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-weight:700;font-size:14px;line-height:1;">+</button>
        </div>
      </div>
      <!-- v7.12 LIVRAISON 2 · Toggles indicateurs + reset -->
      <div style="padding:6px 14px 0;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button onclick="_rcToggle('showVolume')" id="rcVolBtn" style="padding:0 8px;height:22px;background:rgba(56,212,245,.15);border:1px solid var(--ice);border-radius:6px;color:var(--ice);cursor:pointer;font-size:9px;font-weight:700;">VOL</button>
          <button onclick="_rcToggle('showMA')" id="rcMABtn" style="padding:0 8px;height:22px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-size:9px;font-weight:700;">MA20</button>
          <button onclick="_rcToggle('showEMA')" id="rcEMABtn" style="padding:0 8px;height:22px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-size:9px;font-weight:700;">EMA12</button>
          <button onclick="_rcToggle('showBB')" id="rcBBBtn" style="padding:0 8px;height:22px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-size:9px;font-weight:700;">BB</button>
          <button onclick="_rcToggle('showRSI')" id="rcRSIBtn" style="padding:0 8px;height:22px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-size:9px;font-weight:700;">RSI</button>
          <button onclick="_rcToggle('showMACD')" id="rcMACDBtn" style="padding:0 8px;height:22px;background:var(--s2);border:1px solid var(--border);border-radius:6px;color:var(--t2);cursor:pointer;font-size:9px;font-weight:700;">MACD</button>
        </div>
        <div style="display:flex;gap:4px;">
          <button onclick="_rcDebugDump()" title="Diagnostic" style="padding:0 8px;height:22px;background:var(--s2);border:1px solid rgba(56,212,245,.4);border-radius:6px;color:var(--ice);cursor:pointer;font-size:9px;font-weight:700;">🔍</button>
          <button onclick="_rcResetCandles()" style="padding:0 8px;height:22px;background:var(--s2);border:1px solid rgba(255,61,107,.3);border-radius:6px;color:var(--down);cursor:pointer;font-size:9px;font-weight:700;">🗑</button>
        </div>
      </div>
      <div style="padding:2px 14px 0;font-size:8.5px;color:var(--t3);text-align:center;">Glisse ←→ pour explorer · tap pour détails</div>
      
      <!-- Canvas -->
      <div style="padding:6px 14px 0;">
        <canvas id="realCandlesCanvas" width="380" height="260" 
                style="width:100%;height:260px;background:var(--s2);border:1px solid var(--border);border-radius:10px;touch-action:pan-y;cursor:grab;"
                onmousedown="_rcDragStart(event)" onmousemove="_rcDragMove(event)" onmouseup="_rcDragEnd()" onmouseleave="_rcMouseLeave()"
                ontouchstart="_rcDragStart(event)" ontouchmove="_rcDragMove(event)" ontouchend="_rcDragEnd()"></canvas>
      </div>
      
      <!-- Stats -->
      <div id="rcStats" style="padding:0 14px 10px;display:flex;justify-content:space-between;font-size:10px;color:var(--t3);font-family:var(--font-mono);">
        <span id="rcCount">— bougies</span>
        <span id="rcOldest">—</span>
      </div>
      
      <!-- Footer note -->
      <div style="padding:8px 14px 14px;font-size:9px;color:var(--t3);line-height:1.5;border-top:1px solid var(--border);">
        💡 Les bougies se construisent au fil du temps. Une bougie 5m est complète après 5 minutes de collecte.
        Le bot continue avec sa moteur interne pour son entraînement.
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  _renderRealCandles();
  
  // Démarrer l'animation pulse continue (Q1:A · bougie live qui pulse)
  if (_realCandlesState.animFrameId) cancelAnimationFrame(_realCandlesState.animFrameId);
  _rcAnimateLive();
  
  // v7.12 LIVRAISON 3 · charger les toggles persistés et appliquer visuels
  _rcLoadToggles();
  setTimeout(_rcApplyTogglesVisuals, 0);  // après que le DOM des boutons soit prêt

  // v7.12 LIVRAISON 2 · Connexion WebSocket Binance pour prix temps réel
  _rcConnectWS(_realCandlesState.selectedPair);

  // Fallback polling 1s : utilise ps.price si le WS ne répond pas (synchro avec la simu)
  // Si le WS est connecté et reçoit des trades < 3s, ce polling ne fait rien
  if (_realCandlesState.refreshTimer) clearInterval(_realCandlesState.refreshTimer);
  _realCandlesState.refreshTimer = setInterval(() => {
    try {
      const pair = _realCandlesState.selectedPair;
      const wsAge = Date.now() - (_realCandlesState.wsLastTradeTs || 0);
      // Si le WS pousse des trades récents (< 3s), on le laisse faire
      if (_realCandlesState.wsConnected && wsAge < 3000) return;
      // Sinon, fallback sur ps.price
      const ps = (S && S.pairStates) ? S.pairStates[pair] : null;
      if (ps && isFinite(ps.price) && ps.price > 0) {
        _aggregateRealPrice(pair, ps.price);
      }
    } catch(e) { /* silent */ }
  }, 1000);
}

// ═══════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 2 · WEBSOCKET BINANCE (prix temps réel < 100ms)
// Stream "trade" — envoie chaque transaction exécutée sur le marché
// Format : { e:'trade', s:'BTCUSDT', p:'67234.5', T:timestamp, ... }
// Reconnexion auto avec backoff exponentiel en cas de perte de connexion
// ═══════════════════════════════════════════════════════════════
let _rcWsRetryDelay = 1000;        // ms · backoff initial
const _RC_WS_MAX_RETRY = 15000;    // 15s max entre tentatives (réduit pour reco rapide)
// v7.12 LIVRAISON 9 · TRACKING STABILITÉ CONNEXION
// Permet de mesurer la qualité du réseau et d'éviter les pauses pour micro-glitches
const _wsStability = {
  disconnects: [],          // timestamps des dernières déconnexions (1h fenêtre)
  lastDisconnectTs: 0,      // dernière déco
  lastConnectTs: Date.now(), // dernière (re)connexion
  totalDowntimeMs: 0        // cumul total temps offline sur 1h
};
function _trackWsDisconnect() {
  const now = Date.now();
  _wsStability.lastDisconnectTs = now;
  _wsStability.disconnects.push(now);
  // Garder seulement la dernière heure
  const oneHourAgo = now - 3600000;
  _wsStability.disconnects = _wsStability.disconnects.filter(ts => ts > oneHourAgo);
}
function _trackWsConnect() {
  const now = Date.now();
  if (_wsStability.lastDisconnectTs > 0) {
    const downtime = now - _wsStability.lastDisconnectTs;
    if (downtime < 600000) _wsStability.totalDowntimeMs += downtime;
  }
  _wsStability.lastConnectTs = now;
}
// Renvoie le % de uptime sur la dernière heure
function _getWsUptimePct() {
  const now = Date.now();
  const oneHourMs = 3600000;
  // Limiter le downtime à 1h max
  const downtime = Math.min(_wsStability.totalDowntimeMs, oneHourMs);
  const uptime = oneHourMs - downtime;
  return Math.round((uptime / oneHourMs) * 100);
}
// Reset partiel toutes les heures pour ne pas accumuler éternellement
setInterval(() => {
  const now = Date.now();
  // On garde juste les déco récentes
  _wsStability.disconnects = _wsStability.disconnects.filter(ts => ts > now - 3600000);
  // Reset progressif du downtime pour ne pas garder une trace permanente
  _wsStability.totalDowntimeMs = Math.max(0, _wsStability.totalDowntimeMs - 60000);
}, 60000);
window._getWsUptimePct = _getWsUptimePct;

function _rcConnectWS(pair) {
  // Fermer toute connexion existante (changement de paire ou reconnect)
  _rcDisconnectWS();
  _realCandlesState.wsPair = pair;
  // v7.12 LIVRAISON 6 · Stream KLINE officiel Binance pour la timeframe courante
  // Avantage : OHLCV officiels, volume précis, alignés avec Binance.com
  const symbol = pair.replace('/','').toLowerCase();
  // Mapping intervalle UI → Binance kline interval
  const ivMap = { '5m':'5m', '15m':'15m', '1h':'1h', '4h':'4h', '1j':'1d' };
  const binanceIv = ivMap[_realCandlesState.selectedInterval] || '15m';
  // On souscrit aussi à @trade pour avoir le prix tick-by-tick (sinon le close
  // de la bougie en cours ne se met à jour qu'à chaque "k" event ~1s).
  // Stream multi : kline + trade
  const url = 'wss://stream.binance.com:9443/stream?streams=' + symbol + '@kline_' + binanceIv + '/' + symbol + '@trade';
  let ws;
  try {
    ws = new WebSocket(url);
  } catch(e) {
    _rcScheduleReconnect();
    return;
  }
  _realCandlesState.ws = ws;
  ws.onopen = () => {
    _realCandlesState.wsConnected = true;
    _rcWsRetryDelay = 1000;   // reset backoff
    _trackWsConnect();
    _rcUpdateWsBadge();
    // v7.12 LIVRAISON 5 · re-backfill auto à chaque (re)connexion pour combler tout gap
    // (le backfill a un check "déjà couvert" donc ça ne duplique pas les bougies existantes,
    //  mais ça remplit les bougies manquantes après une déconnexion silencieuse)
    try {
      const iv = _realCandlesState.selectedInterval;
      const p  = _realCandlesState.wsPair || _realCandlesState.selectedPair;
      _backfillRealCandles(p, iv, 30).then(ok => {
        if (ok && _realCandlesState.selectedPair === p) _renderRealCandles();
      });
    } catch(e) {}
  };
  ws.onmessage = (evt) => {
    try {
      const wrap = JSON.parse(evt.data);
      // Stream multi : { stream: 'btcusdt@kline_15m', data: {...} }
      const msg = wrap.data || wrap;  // compat solo-stream
      const streamName = wrap.stream || '';

      if (msg.e === 'kline' && msg.k) {
        // ═══ STREAM KLINE ═══ : OHLCV officiels Binance
        const k = msg.k;
        const ts = +k.t;
        const ohlc = {
          ts: ts,
          o: +k.o, h: +k.h, l: +k.l, c: +k.c,
          v: +k.v, n: +k.n,
          isClosed: !!k.x
        };
        _realCandlesState.wsLastTradeTs = msg.E || Date.now();
        if (_realCandlesState.wsPair === _realCandlesState.selectedPair) {
          // Sync ps.price avec le close officiel
          try {
            const ps = (S && S.pairStates) ? S.pairStates[_realCandlesState.selectedPair] : null;
            if (ps) ps.price = ohlc.c;
          } catch(e) {}
          // Insérer/mettre à jour la bougie correspondante dans S.realCandles
          _upsertKlineCandle(_realCandlesState.selectedPair, _realCandlesState.selectedInterval, ohlc);
          if (typeof _rcRenderThrottled === 'function') _rcRenderThrottled();
        }
      } else if (msg.p && msg.T) {
        // ═══ STREAM TRADE ═══ : prix tick-by-tick (pour ps.price uniquement)
        const price = parseFloat(msg.p);
        if (isFinite(price) && price > 0) {
          _realCandlesState.wsLastTradeTs = msg.T;
          if (_realCandlesState.wsPair === _realCandlesState.selectedPair) {
            try {
              const ps = (S && S.pairStates) ? S.pairStates[_realCandlesState.selectedPair] : null;
              if (ps) ps.price = price;
            } catch(e) {}
            // Pour les autres timeframes (pas la sélectionnée), on continue d'aggréger via trades
            // (le stream kline ne couvre que la timeframe courante)
            _aggregateRealPriceOtherIntervals(_realCandlesState.selectedPair, price, msg.T);
            if (typeof _rcRenderThrottled === 'function') _rcRenderThrottled();
          }
        }
      }
    } catch(e) { /* silent */ }
  };
  ws.onerror = () => {
    _realCandlesState.wsConnected = false;
    _rcUpdateWsBadge();
  };
  ws.onclose = () => {
    _realCandlesState.wsConnected = false;
    _trackWsDisconnect();
    _rcUpdateWsBadge();
    // Reconnect uniquement si le modal est toujours ouvert
    if (document.getElementById('realCandlesModal')) {
      _rcScheduleReconnect();
    }
  };
}

function _rcDisconnectWS() {
  if (_realCandlesState.ws) {
    try { _realCandlesState.ws.onclose = null; _realCandlesState.ws.close(); } catch(e) {}
    _realCandlesState.ws = null;
  }
  _realCandlesState.wsConnected = false;
}

function _rcScheduleReconnect() {
  setTimeout(() => {
    // Reconnect uniquement si modal encore ouvert et même paire
    if (!document.getElementById('realCandlesModal')) return;
    _rcConnectWS(_realCandlesState.selectedPair);
  }, _rcWsRetryDelay);
  _rcWsRetryDelay = Math.min(_RC_WS_MAX_RETRY, _rcWsRetryDelay * 2);
}

// MAJ visuelle du badge "MAJ il y a Xs" — passe en vert "● LIVE WS" quand WS connecté
function _rcUpdateWsBadge() {
  const updEl = document.getElementById('rcLastUpdate');
  if (!updEl) return;
  if (_realCandlesState.wsConnected) {
    updEl.textContent = '● LIVE WS';
    updEl.style.color = 'var(--up)';
  }
  // Sinon _renderRealCandles écrit "MAJ il y a Xs" comme avant
}

window._rcConnectWS = _rcConnectWS;
window._rcDisconnectWS = _rcDisconnectWS;

function closeRealCandlesModal() {
  const modal = document.getElementById('realCandlesModal');
  if (modal) modal.remove();
  if (_realCandlesState.refreshTimer) {
    clearInterval(_realCandlesState.refreshTimer);
    _realCandlesState.refreshTimer = null;
  }
  if (_realCandlesState.animFrameId) {
    cancelAnimationFrame(_realCandlesState.animFrameId);
    _realCandlesState.animFrameId = null;
  }
  // v7.12 LIVRAISON 2 · fermer la connexion WebSocket
  _rcDisconnectWS();
}

function _selectRealCandlesPair(pair) {
  _realCandlesState.selectedPair = pair;
  _realCandlesState.scrollOffset = 0;
  // v7.12 LIVRAISON 2 · changer la souscription WebSocket vers la nouvelle paire
  _rcConnectWS(pair);
  // Amorce immédiate : si pas encore de bougie pour cette paire, on en crée une
  // avec le prix courant connu pour que tu voies tout de suite quelque chose
  try {
    const ps = (S && S.pairStates) ? S.pairStates[pair] : null;
    if (ps && isFinite(ps.price) && ps.price > 0) {
      _aggregateRealPrice(pair, ps.price);
    }
  } catch(e) { /* silent */ }
  // v7.12 LIVRAISON 2 · backfill historique Binance si moins de 5 bougies
  try {
    const iv = _realCandlesState.selectedInterval;
    const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][iv]) || [];
    if (arr.length < 5) {
      _backfillRealCandles(pair, iv, 100).then(ok => {
        if (ok && _realCandlesState.selectedPair === pair && _realCandlesState.selectedInterval === iv) {
          _renderRealCandles();
        }
      });
    }
  } catch(e) {}
  // Update buttons styles
  document.querySelectorAll('[data-rc-pair]').forEach(btn => {
    const isActive = btn.getAttribute('data-rc-pair') === pair;
    btn.style.background = isActive ? 'rgba(0,232,122,.15)' : 'var(--s2)';
    btn.style.color = isActive ? 'var(--up)' : 'var(--t2)';
    btn.style.borderColor = isActive ? 'var(--up)' : 'var(--border)';
  });
  _renderRealCandles();
}

function _selectRealCandlesInterval(interval) {
  _realCandlesState.selectedInterval = interval;
  _realCandlesState.scrollOffset = 0;
  // v7.12 LIVRAISON 6 · re-souscrire le WS sur la nouvelle timeframe (stream kline)
  try { _rcConnectWS(_realCandlesState.selectedPair); } catch(e) {}
  // Amorce immédiate : si pas encore de bougie pour cette paire/intervalle,
  // on en crée une avec le prix courant
  try {
    const pair = _realCandlesState.selectedPair;
    const ps = (S && S.pairStates) ? S.pairStates[pair] : null;
    if (ps && isFinite(ps.price) && ps.price > 0) {
      _aggregateRealPrice(pair, ps.price);
    }
  } catch(e) { /* silent */ }
  // v7.12 LIVRAISON 2 · backfill historique si moins de 5 bougies pour cet intervalle
  try {
    const pair = _realCandlesState.selectedPair;
    const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][interval]) || [];
    if (arr.length < 5) {
      _backfillRealCandles(pair, interval, 100).then(ok => {
        if (ok && _realCandlesState.selectedPair === pair && _realCandlesState.selectedInterval === interval) {
          _renderRealCandles();
        }
      });
    }
  } catch(e) {}
  document.querySelectorAll('[data-rc-interval]').forEach(btn => {
    const isActive = btn.getAttribute('data-rc-interval') === interval;
    btn.style.background = isActive ? 'rgba(0,232,122,.15)' : 'var(--s2)';
    btn.style.color = isActive ? 'var(--up)' : 'var(--t2)';
    btn.style.borderColor = isActive ? 'var(--up)' : 'var(--border)';
  });
  _renderRealCandles();
}

// ════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 3 · CALCUL DES INDICATEURS (avec cache)
// ════════════════════════════════════════════════════════════
// Tous les calculs prennent un tableau de closes (et highs/lows pour BB)
// et renvoient un tableau aligné de mêmes longueur (null pour les positions
// où l'indicateur n'a pas assez de données — typiquement les N premières).

// SMA (Simple Moving Average) de période N
function _computeSMA(closes, period) {
  const out = new Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// EMA (Exponential Moving Average) de période N
function _computeEMA(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length === 0) return out;
  const k = 2 / (period + 1);
  let prev = closes[0];
  out[0] = prev;
  for (let i = 1; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

// RSI (Relative Strength Index) de période N (Wilder's smoothing)
// Renvoie des valeurs entre 0 et 100
function _computeRSI(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let gain = 0, loss = 0;
  // Première moyenne sur N périodes
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : (100 - 100 / (1 + avgGain / avgLoss));
  // Wilder smoothing pour les suivants
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : (100 - 100 / (1 + avgGain / avgLoss));
  }
  return out;
}

// MACD (12, 26, 9) — renvoie { macd, signal, histogram } chacun aligné
function _computeMACD(closes, fast, slow, signal) {
  const emaFast = _computeEMA(closes, fast || 12);
  const emaSlow = _computeEMA(closes, slow || 26);
  const macd = closes.map((_, i) => {
    if (emaFast[i] == null || emaSlow[i] == null) return null;
    return emaFast[i] - emaSlow[i];
  });
  // EMA(9) sur la ligne MACD pour la signal
  // On filtre les nulls : on commence à calculer la signal seulement après le 1er macd valide
  const signalArr = new Array(macd.length).fill(null);
  const sigPeriod = signal || 9;
  const k = 2 / (sigPeriod + 1);
  let prev = null;
  let count = 0;
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] == null) continue;
    if (prev === null) {
      prev = macd[i];
      count = 1;
      // signal disponible seulement après sigPeriod valeurs valides
      if (count >= sigPeriod) signalArr[i] = prev;
      continue;
    }
    prev = macd[i] * k + prev * (1 - k);
    count++;
    if (count >= sigPeriod) signalArr[i] = prev;
  }
  const histogram = macd.map((m, i) => (m == null || signalArr[i] == null) ? null : m - signalArr[i]);
  return { macd, signal: signalArr, histogram };
}

// Bollinger Bands (20, 2) — renvoie { mid, upper, lower }
function _computeBB(closes, period, mult) {
  const N = period || 20;
  const M = mult || 2;
  const mid = _computeSMA(closes, N);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  for (let i = N - 1; i < closes.length; i++) {
    const m = mid[i];
    if (m == null) continue;
    let sumSq = 0;
    for (let j = i - N + 1; j <= i; j++) {
      const d = closes[j] - m;
      sumSq += d * d;
    }
    const std = Math.sqrt(sumSq / N);
    upper[i] = m + M * std;
    lower[i] = m - M * std;
  }
  return { mid, upper, lower };
}

// Cache des indicateurs : invalidé quand pair/iv change ou que la longueur du tableau change
// (Pour le streaming live où on ne fait qu'ajouter à la dernière bougie, le cache est ré-invalide
//  uniquement si la longueur change — sinon on recalcule la dernière valeur seulement)
function _getIndicators(arr, pair, iv) {
  if (!arr || arr.length === 0) return null;
  const key = pair + '_' + iv;
  const cache = _realCandlesState._indicCache[key];
  const len = arr.length;
  // Cache hit si même longueur ET le close de la dernière bougie n'a pas changé
  // (on accepte un recalcul si le close live a bougé)
  const lastClose = arr[len - 1].c;
  if (cache && cache.len === len && cache.lastClose === lastClose) {
    return cache.data;
  }
  // Re-calcul complet
  const closes = new Array(len);
  for (let i = 0; i < len; i++) closes[i] = arr[i].c;
  const data = {
    ma20: _computeSMA(closes, 20),
    ema12: _computeEMA(closes, 12),
    rsi14: _computeRSI(closes, 14),
    macd: _computeMACD(closes, 12, 26, 9),
    bb: _computeBB(closes, 20, 2)
  };
  _realCandlesState._indicCache[key] = { len, lastClose, data };
  return data;
}

// Throttle du rendu à 60fps max (16.7ms)
function _rcRenderThrottled() {
  if (_realCandlesState._renderPending) return;
  const now = Date.now();
  const since = now - (_realCandlesState._lastRenderTs || 0);
  if (since >= 16) {
    _realCandlesState._lastRenderTs = now;
    _renderRealCandles();
  } else {
    _realCandlesState._renderPending = true;
    setTimeout(() => {
      _realCandlesState._renderPending = false;
      _realCandlesState._lastRenderTs = Date.now();
      _renderRealCandles();
    }, 16 - since);
  }
}
window._rcRenderThrottled = _rcRenderThrottled;

function _renderRealCandles() {
  const pair = _realCandlesState.selectedPair;
  const interval = _realCandlesState.selectedInterval;
  const canvas = document.getElementById('realCandlesCanvas');
  if (!canvas) return;

  // Update info bar
  const ps = (S.pairStates || {})[pair];
  const cfg = (PAIRS || {})[pair];
  const priceEl = document.getElementById('rcCurrentPrice');
  const updEl = document.getElementById('rcLastUpdate');
  if (priceEl && ps && cfg) {
    const priceStr = cfg.dec >= 4 ? ps.price.toFixed(cfg.dec) : '$' + Math.floor(ps.price).toLocaleString();
    const pnl = ps.pnl24h || 0;
    const pnlCol = pnl >= 0 ? 'var(--up)' : 'var(--down)';
    priceEl.innerHTML = `<span style="color:${cfg.color}">${pair}</span> ${priceStr} <span style="color:${pnlCol};font-size:9px;">${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%</span>`;
  }
  if (updEl) {
    if (_realCandlesState.wsConnected) {
      updEl.textContent = '● LIVE WS';
      updEl.style.color = 'var(--up)';
    } else {
      const ageMs = Date.now() - (typeof _lastRealPriceTs !== 'undefined' ? _lastRealPriceTs : 0);
      const ageSec = Math.floor(ageMs / 1000);
      if (ageSec < 60) updEl.textContent = `MAJ il y a ${ageSec}s`;
      else if (ageSec < 3600) updEl.textContent = `MAJ il y a ${Math.floor(ageSec/60)}min`;
      else updEl.textContent = `MAJ > 1h`;
      updEl.style.color = ageSec < 30 ? 'var(--up)' : ageSec < 90 ? 'var(--gold)' : 'var(--down)';
    }
  }

  // Get candles
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][interval]) || [];

  // Update stats
  const countEl = document.getElementById('rcCount');
  const oldestEl = document.getElementById('rcOldest');
  if (countEl) countEl.textContent = arr.length + ' bougies';
  if (oldestEl) {
    if (arr.length > 0) {
      const ageMin = Math.floor((Date.now() - arr[0].ts) / 60000);
      if (ageMin < 60) oldestEl.textContent = `Plus ancienne il y a ${ageMin} min`;
      else if (ageMin < 1440) oldestEl.textContent = `Plus ancienne il y a ${Math.floor(ageMin/60)}h`;
      else oldestEl.textContent = `Plus ancienne il y a ${Math.floor(ageMin/1440)}j`;
    } else {
      oldestEl.textContent = 'Aucune donnée';
    }
  }

  // ═══ DPR + dimensions de base ═══
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 380;

  // ═══ LAYOUT DYNAMIQUE selon les toggles actifs ═══
  // Zones empilées : Price chart · Volume · RSI · MACD · Time labels
  const padTop = 12, padBottomTime = 18, padLeft = 4, padRight = 56;
  const showVolume = !!_realCandlesState.showVolume;
  const showRSI    = !!_realCandlesState.showRSI;
  const showMACD   = !!_realCandlesState.showMACD;
  const volH  = showVolume ? 40 : 0;
  const rsiH  = showRSI    ? 50 : 0;
  const macdH = showMACD   ? 50 : 0;
  const gap = 6;
  // Hauteur de la zone bougies (priorité : ce qui reste après volume/rsi/macd)
  const minPriceH = 100;
  const subTotal = (showVolume ? volH + gap : 0) + (showRSI ? rsiH + gap : 0) + (showMACD ? macdH + gap : 0);
  const priceH = Math.max(minPriceH, 200);   // hauteur du chart prix
  const cssH = padTop + priceH + subTotal + padBottomTime;

  // Adapter le canvas
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cssW;
  const H = cssH;

  // Clear
  ctx.fillStyle = '#0a0e15';
  ctx.fillRect(0, 0, W, H);

  if (arr.length === 0) {
    ctx.fillStyle = '#5a6172';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Pas encore de bougies pour ' + pair, W/2, H/2 - 8);
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#3a4152';
    ctx.fillText('Patience · 1ère bougie ' + interval + ' dans quelques minutes', W/2, H/2 + 12);
    return;
  }

  // ═══ Coordonnées Y des panels ═══
  const priceTop = padTop;
  const priceBot = priceTop + priceH;
  const volTop  = showVolume ? priceBot + gap : null;
  const volBot  = showVolume ? volTop + volH : null;
  const rsiTop  = showRSI    ? (showVolume ? volBot + gap : priceBot + gap) : null;
  const rsiBot  = showRSI    ? rsiTop + rsiH : null;
  const macdTop = showMACD   ? (rsiBot ?? volBot ?? priceBot) + gap : null;
  const macdBot = showMACD   ? macdTop + macdH : null;

  const chartW = W - padLeft - padRight;
  const rightMargin = Math.floor(chartW * 0.18);
  const candleAreaW = chartW - rightMargin;

  // ═══ Largeur des bougies + nombre visible (cap 2 mm) ═══
  const PX_PER_MM = 96 / 25.4;
  const MAX_CANDLE_PX = Math.round(2 * PX_PER_MM);   // ≈ 8 px
  const targetCandleW = 3;
  const baseFitCount = Math.floor(candleAreaW / (targetCandleW + 1));
  const visibleCount = Math.max(3, Math.min(arr.length, Math.floor(baseFitCount / _realCandlesState.zoomLevel)));
  const candleW = Math.max(1, Math.min(MAX_CANDLE_PX, Math.floor(candleAreaW / visibleCount) - 1));

  // ═══ Scroll horizontal ═══
  const maxOffset = Math.max(0, arr.length - visibleCount);
  if (_realCandlesState.scrollOffset > maxOffset) _realCandlesState.scrollOffset = maxOffset;
  if (_realCandlesState.scrollOffset < 0) _realCandlesState.scrollOffset = 0;

  const endIdx = arr.length - _realCandlesState.scrollOffset;
  const startIdx = Math.max(0, endIdx - visibleCount);
  const visible = arr.slice(startIdx, endIdx);
  if (visible.length === 0) return;

  // ═══ INDICATEURS (cache global) ═══
  const indic = _getIndicators(arr, pair, interval);
  // Slices alignées avec la fenêtre visible
  const maPoints   = (_realCandlesState.showMA   && indic) ? indic.ma20.slice(startIdx, endIdx)  : null;
  const emaPoints  = (_realCandlesState.showEMA  && indic) ? indic.ema12.slice(startIdx, endIdx) : null;
  const bbPoints   = (_realCandlesState.showBB   && indic) ? {
    mid:   indic.bb.mid.slice(startIdx, endIdx),
    upper: indic.bb.upper.slice(startIdx, endIdx),
    lower: indic.bb.lower.slice(startIdx, endIdx)
  } : null;
  const rsiPoints  = (_realCandlesState.showRSI  && indic) ? indic.rsi14.slice(startIdx, endIdx) : null;
  const macdData   = (_realCandlesState.showMACD && indic) ? {
    macd:  indic.macd.macd.slice(startIdx, endIdx),
    sig:   indic.macd.signal.slice(startIdx, endIdx),
    hist:  indic.macd.histogram.slice(startIdx, endIdx)
  } : null;

  // ═══ Échelle des prix (autoscale, inclut MA/EMA/BB si visibles) ═══
  let minP = Infinity, maxP = -Infinity;
  visible.forEach(k => {
    if (k.l < minP) minP = k.l;
    if (k.h > maxP) maxP = k.h;
  });
  const extendRange = (v) => { if (v != null && isFinite(v)) { if (v < minP) minP = v; if (v > maxP) maxP = v; } };
  if (maPoints)  maPoints.forEach(extendRange);
  if (emaPoints) emaPoints.forEach(extendRange);
  if (bbPoints) {
    bbPoints.upper.forEach(extendRange);
    bbPoints.lower.forEach(extendRange);
  }
  let range = maxP - minP;
  if (range === 0 || range / minP < 0.001) {
    range = Math.max(minP * 0.002, 1e-9);
    const center = (minP + maxP) / 2;
    minP = center - range / 2;
    maxP = center + range / 2;
  }
  const vPad = range * 0.06;
  minP -= vPad;
  maxP += vPad;
  range = maxP - minP;

  const startX = padLeft;
  const priceToY = (p) => priceTop + priceH * (1 - (p - minP) / range);
  const yToPrice = (y) => maxP - ((y - priceTop) / priceH) * range;

  // ═══ Grille horizontale du chart prix (4 lignes) ═══
  ctx.strokeStyle = 'rgba(120,130,150,.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = priceTop + (priceH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(W - padRight, y);
    ctx.stroke();
  }
  // Bordure droite (séparateur prix)
  ctx.strokeStyle = 'rgba(120,130,150,.15)';
  ctx.beginPath();
  ctx.moveTo(W - padRight, priceTop);
  ctx.lineTo(W - padRight, H - padBottomTime);
  ctx.stroke();

  // ═══ Étiquettes des prix (5 niveaux) ═══
  ctx.fillStyle = '#7a8192';
  ctx.font = '9px ui-monospace, monospace';
  ctx.textAlign = 'left';
  for (let i = 0; i <= 4; i++) {
    const y = priceTop + (priceH / 4) * i;
    const p = maxP - (range / 4) * i;
    const lbl = (cfg && cfg.dec >= 4) ? p.toFixed(cfg.dec) : '$' + Math.floor(p).toLocaleString();
    ctx.fillText(lbl, W - padRight + 4, y + 3);
  }

  // ═══ AFFICHAGE selon mode ═══
  if (_realCandlesState.viewMode === 'line') {
    ctx.beginPath();
    visible.forEach((k, i) => {
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = priceToY(k.c);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#38d4f5';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    const grad = ctx.createLinearGradient(0, priceTop, 0, priceBot);
    grad.addColorStop(0, 'rgba(56,212,245,.18)');
    grad.addColorStop(1, 'rgba(56,212,245,.01)');
    ctx.fillStyle = grad;
    ctx.lineTo(startX + (visible.length - 1) * (candleW + 1) + candleW / 2, priceBot);
    ctx.lineTo(startX, priceBot);
    ctx.closePath();
    ctx.fill();
  } else {
    visible.forEach((k, i) => {
      const x = startX + i * (candleW + 1);
      const xCenter = x + candleW / 2;
      const yHigh  = priceToY(k.h);
      const yLow   = priceToY(k.l);
      const yOpen  = priceToY(k.o);
      const yClose = priceToY(k.c);
      const isUp = k.c >= k.o;
      const color = isUp ? '#00e87a' : '#ff3d6b';
      const isLast = (i === visible.length - 1) && (_realCandlesState.scrollOffset === 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xCenter, yHigh);
      ctx.lineTo(xCenter, yLow);
      ctx.stroke();
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yClose - yOpen));
      if (isLast) {
        const phase = (Math.sin(_realCandlesState.pulsePhase) + 1) / 2;
        ctx.fillStyle = color;
        ctx.fillRect(x, bodyTop, candleW, bodyH);
        ctx.strokeStyle = isUp ? `rgba(0,232,122,${0.4 + phase*0.6})` : `rgba(255,61,107,${0.4 + phase*0.6})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 0.5, bodyTop - 0.5, candleW + 1, bodyH + 1);
        ctx.shadowBlur = 8 + phase * 6;
        ctx.shadowColor = color;
        ctx.fillRect(x, bodyTop, candleW, bodyH);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(x, bodyTop, candleW, bodyH);
      }
    });
  }

  // ═══ OVERLAY · Bollinger Bands (avant MA/EMA pour qu'elles passent au-dessus) ═══
  if (bbPoints) {
    // Aire entre upper et lower
    ctx.save();
    ctx.beginPath();
    let started = false;
    visible.forEach((k, i) => {
      const v = bbPoints.upper[i];
      if (v == null) return;
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = priceToY(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    // Retour par lower (à l'envers)
    for (let i = visible.length - 1; i >= 0; i--) {
      const v = bbPoints.lower[i];
      if (v == null) continue;
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = priceToY(v);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(94,234,212,.06)';
    ctx.fill();
    // Ligne supérieure
    const drawBBLine = (key, opacity) => {
      ctx.beginPath();
      let st = false;
      visible.forEach((k, i) => {
        const v = bbPoints[key][i];
        if (v == null) return;
        const x = startX + i * (candleW + 1) + candleW / 2;
        const y = priceToY(v);
        if (!st) { ctx.moveTo(x, y); st = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = `rgba(94,234,212,${opacity})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };
    drawBBLine('upper', 0.7);
    drawBBLine('lower', 0.7);
    drawBBLine('mid',   0.4);
    ctx.restore();
  }

  // ═══ OVERLAY · MA20 ═══
  if (maPoints) {
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let started = false;
    visible.forEach((k, i) => {
      const v = maPoints[i];
      if (v == null) return;
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = priceToY(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // ═══ OVERLAY · EMA12 ═══
  if (emaPoints) {
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let started = false;
    visible.forEach((k, i) => {
      const v = emaPoints[i];
      if (v == null) return;
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = priceToY(v);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // ═══ ZONE VOLUME ═══
  if (showVolume) {
    ctx.fillStyle = 'rgba(120,130,150,.04)';
    ctx.fillRect(padLeft, volTop, chartW, volH);
    let maxV = 0;
    visible.forEach(k => {
      const v = (typeof k.v === 'number' && isFinite(k.v) && k.v > 0) ? k.v : Math.abs((k.c||0)-(k.o||0));
      if (v > maxV) maxV = v;
    });
    if (maxV > 0) {
      visible.forEach((k, i) => {
        const v = (typeof k.v === 'number' && isFinite(k.v) && k.v > 0) ? k.v : Math.abs((k.c||0)-(k.o||0));
        const x = startX + i * (candleW + 1);
        const barH = Math.max(1, (v / maxV) * (volH - 2));
        const isUp = k.c >= k.o;
        ctx.fillStyle = isUp ? 'rgba(0,232,122,.45)' : 'rgba(255,61,107,.45)';
        ctx.fillRect(x, volBot - barH, candleW, barH);
      });
    }
    ctx.fillStyle = '#5a6172';
    ctx.font = '8px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Vol', padLeft + 2, volTop + 8);
  }

  // ═══ ZONE RSI ═══
  if (showRSI && rsiPoints) {
    ctx.fillStyle = 'rgba(120,130,150,.04)';
    ctx.fillRect(padLeft, rsiTop, chartW, rsiH);
    // Lignes 30 et 70 (zones surachat/survente)
    const yLine = (val) => rsiTop + rsiH * (1 - val / 100);
    ctx.strokeStyle = 'rgba(245,200,66,.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(padLeft, yLine(70)); ctx.lineTo(W - padRight, yLine(70)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padLeft, yLine(30)); ctx.lineTo(W - padRight, yLine(30)); ctx.stroke();
    ctx.setLineDash([]);
    // Ligne RSI
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let st = false;
    visible.forEach((k, i) => {
      const v = rsiPoints[i];
      if (v == null) return;
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = yLine(v);
      if (!st) { ctx.moveTo(x, y); st = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Étiquettes 30/70 + valeur courante
    ctx.fillStyle = '#7a8192';
    ctx.font = '8px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('70', W - padRight + 4, yLine(70) + 3);
    ctx.fillText('30', W - padRight + 4, yLine(30) + 3);
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 8px ui-monospace, monospace';
    ctx.fillText('RSI', padLeft + 2, rsiTop + 8);
    const lastRsi = rsiPoints.filter(v => v != null).slice(-1)[0];
    if (lastRsi != null) ctx.fillText(lastRsi.toFixed(1), padLeft + 28, rsiTop + 8);
  }

  // ═══ ZONE MACD ═══
  if (showMACD && macdData) {
    ctx.fillStyle = 'rgba(120,130,150,.04)';
    ctx.fillRect(padLeft, macdTop, chartW, macdH);
    // Échelle dynamique : centre = 0, range = max(|hist|, |macd|, |sig|) sur la fenêtre
    let maxAbs = 0;
    for (let i = 0; i < visible.length; i++) {
      const a = macdData.macd[i], b = macdData.sig[i], c = macdData.hist[i];
      [a, b, c].forEach(v => { if (v != null && Math.abs(v) > maxAbs) maxAbs = Math.abs(v); });
    }
    if (maxAbs === 0) maxAbs = 1;
    const macdY = (v) => macdTop + macdH/2 - (v / maxAbs) * (macdH/2 - 4);
    // Ligne 0
    ctx.strokeStyle = 'rgba(120,130,150,.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(padLeft, macdTop + macdH/2); ctx.lineTo(W - padRight, macdTop + macdH/2); ctx.stroke();
    ctx.setLineDash([]);
    // Histogramme
    visible.forEach((k, i) => {
      const h = macdData.hist[i];
      if (h == null) return;
      const x = startX + i * (candleW + 1);
      const yMid = macdTop + macdH/2;
      const y = macdY(h);
      ctx.fillStyle = h >= 0 ? 'rgba(0,232,122,.55)' : 'rgba(255,61,107,.55)';
      ctx.fillRect(x, Math.min(y, yMid), candleW, Math.abs(y - yMid) || 1);
    });
    // Ligne MACD
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    let st = false;
    visible.forEach((k, i) => {
      const v = macdData.macd[i];
      if (v == null) return;
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = macdY(v);
      if (!st) { ctx.moveTo(x, y); st = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Ligne Signal
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    st = false;
    visible.forEach((k, i) => {
      const v = macdData.sig[i];
      if (v == null) return;
      const x = startX + i * (candleW + 1) + candleW / 2;
      const y = macdY(v);
      if (!st) { ctx.moveTo(x, y); st = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Label
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 8px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MACD(12,26,9)', padLeft + 2, macdTop + 8);
  }

  // ═══ Ligne horizontale du prix actuel ═══
  const lastVisible = visible[visible.length - 1];
  if (lastVisible) {
    const lastClose = lastVisible.c;
    const lastY = priceToY(lastClose);
    const isLastUp = lastVisible.c >= lastVisible.o;
    const lineCol = isLastUp ? '#00e87a' : '#ff3d6b';
    ctx.save();
    ctx.strokeStyle = lineCol + 'aa';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, lastY);
    ctx.lineTo(W - padRight, lastY);
    ctx.stroke();
    ctx.restore();
    const priceLbl = (cfg && cfg.dec >= 4) ? lastClose.toFixed(cfg.dec) : '$' + Math.floor(lastClose).toLocaleString();
    ctx.font = 'bold 10px ui-monospace, monospace';
    const lblW = Math.max(50, ctx.measureText(priceLbl).width + 8);
    const lblH = 14;
    const lblY = Math.max(priceTop, Math.min(priceBot - lblH, lastY - lblH/2));
    ctx.fillStyle = lineCol;
    ctx.fillRect(W - padRight, lblY, lblW, lblH);
    ctx.fillStyle = '#0a0e15';
    ctx.textAlign = 'left';
    ctx.fillText(priceLbl, W - padRight + 4, lblY + 10);
    if (_realCandlesState.scrollOffset === 0) {
      const lastCandleX = startX + (visible.length - 1) * (candleW + 1) + candleW / 2;
      const phase = (Math.sin(_realCandlesState.pulsePhase) + 1) / 2;
      ctx.fillStyle = lineCol;
      ctx.shadowBlur = 6 + phase * 8;
      ctx.shadowColor = lineCol;
      ctx.beginPath();
      ctx.arc(lastCandleX, lastY, 2 + phase * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ═══ CROSSHAIR + TOOLTIP (avec prix exact à la position Y) ═══
  const cx = _realCandlesState.crosshairX;
  const cy = _realCandlesState.crosshairY;
  const inChart = cx >= padLeft && cx <= W - padRight && cy >= padTop && cy <= H - padBottomTime;
  if (inChart) {
    const relX = cx - startX;
    const idx = Math.max(0, Math.min(visible.length - 1, Math.floor(relX / (candleW + 1))));
    const k = visible[idx];
    if (k) {
      const xC = startX + idx * (candleW + 1) + candleW / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(200,210,230,.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      // Verticale (traverse tous les panels)
      ctx.beginPath();
      ctx.moveTo(xC, priceTop);
      ctx.lineTo(xC, H - padBottomTime);
      ctx.stroke();
      // Horizontale (seulement dans le panel survolé)
      let activePanelTop = null, activePanelBot = null, activePanelLabel = null;
      if (cy >= priceTop && cy <= priceBot) {
        activePanelTop = priceTop; activePanelBot = priceBot;
        // Prix exact à la position Y
        const priceAtY = yToPrice(cy);
        activePanelLabel = (cfg && cfg.dec >= 4) ? priceAtY.toFixed(cfg.dec) : '$' + Math.floor(priceAtY).toLocaleString();
      } else if (showVolume && cy >= volTop && cy <= volBot) {
        activePanelTop = volTop; activePanelBot = volBot;
      } else if (showRSI && cy >= rsiTop && cy <= rsiBot) {
        activePanelTop = rsiTop; activePanelBot = rsiBot;
        const rsiVal = (1 - (cy - rsiTop) / rsiH) * 100;
        activePanelLabel = rsiVal.toFixed(1);
      } else if (showMACD && cy >= macdTop && cy <= macdBot) {
        activePanelTop = macdTop; activePanelBot = macdBot;
      }
      if (activePanelTop != null) {
        ctx.beginPath();
        ctx.moveTo(padLeft, cy);
        ctx.lineTo(W - padRight, cy);
        ctx.stroke();
      }
      ctx.restore();
      // Badge prix Y dans la marge droite
      if (activePanelLabel) {
        ctx.font = 'bold 10px ui-monospace, monospace';
        const lblW = Math.max(50, ctx.measureText(activePanelLabel).width + 8);
        const lblH = 14;
        const lblY = Math.max(activePanelTop, Math.min(activePanelBot - lblH, cy - lblH/2));
        ctx.fillStyle = 'rgba(200,210,230,.85)';
        ctx.fillRect(W - padRight, lblY, lblW, lblH);
        ctx.fillStyle = '#0a0e15';
        ctx.textAlign = 'left';
        ctx.fillText(activePanelLabel, W - padRight + 4, lblY + 10);
      }
      // Tooltip OHLC (toujours sur le chart prix)
      const fmtP = (v) => (cfg && cfg.dec >= 4) ? v.toFixed(cfg.dec) : '$' + Math.floor(v).toLocaleString();
      const tipLines = [
        new Date(k.ts).toLocaleString('fr', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }),
        'O ' + fmtP(k.o),
        'H ' + fmtP(k.h),
        'L ' + fmtP(k.l),
        'C ' + fmtP(k.c)
      ];
      if (typeof k.v === 'number' && isFinite(k.v)) tipLines.push('V ' + (k.v >= 1000 ? (k.v/1000).toFixed(1)+'k' : k.v.toFixed(0)));
      // Ajouter MA/EMA/RSI à la valeur de la bougie hover
      if (maPoints && maPoints[idx] != null)  tipLines.push('MA ' + fmtP(maPoints[idx]));
      if (emaPoints && emaPoints[idx] != null) tipLines.push('EMA ' + fmtP(emaPoints[idx]));
      if (rsiPoints && rsiPoints[idx] != null) tipLines.push('RSI ' + rsiPoints[idx].toFixed(1));
      ctx.font = 'bold 9px ui-monospace, monospace';
      let tipW = 0;
      tipLines.forEach(l => { const w = ctx.measureText(l).width; if (w > tipW) tipW = w; });
      tipW += 10;
      const tipH = tipLines.length * 11 + 6;
      let tipX = xC + 8;
      if (tipX + tipW > W - padRight - 2) tipX = xC - tipW - 8;
      let tipY = priceTop + 4;
      ctx.fillStyle = 'rgba(15,20,30,.92)';
      ctx.strokeStyle = 'rgba(120,130,150,.4)';
      ctx.lineWidth = 1;
      ctx.fillRect(tipX, tipY, tipW, tipH);
      ctx.strokeRect(tipX, tipY, tipW, tipH);
      const isUp = k.c >= k.o;
      ctx.textAlign = 'left';
      tipLines.forEach((l, i) => {
        if (i === 0) ctx.fillStyle = '#c0c8d8';
        else if (l.startsWith('C ')) ctx.fillStyle = isUp ? '#00e87a' : '#ff3d6b';
        else if (l.startsWith('MA ')) ctx.fillStyle = '#f5c842';
        else if (l.startsWith('EMA ')) ctx.fillStyle = '#a78bfa';
        else if (l.startsWith('RSI ')) ctx.fillStyle = '#fb923c';
        else ctx.fillStyle = '#8895a8';
        ctx.fillText(l, tipX + 5, tipY + 11 + i * 11);
      });
    }
  }

  // ═══ Étiquettes temporelles ═══
  ctx.fillStyle = '#5a6172';
  ctx.font = '9px ui-monospace, monospace';
  if (visible.length > 0) {
    const fmtT = (ts) => {
      const d = new Date(ts);
      if (interval === '1j') {
        return d.getDate().toString().padStart(2,'0') + '/' + (d.getMonth()+1).toString().padStart(2,'0');
      }
      if (interval === '4h') {
        return d.getDate().toString().padStart(2,'0') + '/' + (d.getMonth()+1).toString().padStart(2,'0') + ' ' + d.getHours().toString().padStart(2,'0') + 'h';
      }
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    };
    ctx.textAlign = 'left';
    ctx.fillText(fmtT(visible[0].ts), startX, H - 4);
    ctx.textAlign = 'right';
    const lastX = startX + (visible.length - 1) * (candleW + 1) + candleW;
    ctx.fillText(fmtT(visible[visible.length - 1].ts), lastX, H - 4);
  }

  // ═══ Indicateurs de scroll ═══
  if (_realCandlesState.scrollOffset > 0) {
    ctx.fillStyle = 'rgba(0,232,122,.7)';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('→ +' + _realCandlesState.scrollOffset, W - padRight - 2, priceTop + 8);
  }
  if (startIdx === 0 && arr.length > visibleCount) {
    ctx.fillStyle = 'rgba(245,166,35,.7)';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('|◄ DÉBUT', startX + 2, priceTop + 8);
  }

  // ═══ Légende des indicateurs actifs (chart prix uniquement) ═══
  const legend = [];
  if (_realCandlesState.showMA)  legend.push(['#f5c842', 'MA20']);
  if (_realCandlesState.showEMA) legend.push(['#a78bfa', 'EMA12']);
  if (_realCandlesState.showBB)  legend.push(['#5eead4', 'BB(20,2)']);
  if (legend.length) {
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'left';
    let lx = padLeft + 60;
    legend.forEach(([col, lbl]) => {
      ctx.fillStyle = col;
      ctx.fillText('— ' + lbl, lx, priceTop + 8);
      lx += ctx.measureText('— ' + lbl).width + 10;
    });
  }
}

// ═══ Toggle vue Bougies / Ligne ═══
function _rcSetView(mode) {
  _realCandlesState.viewMode = mode;
  // MAJ visuel des boutons
  const btnC = document.getElementById('rcViewBtnCandles');
  const btnL = document.getElementById('rcViewBtnLine');
  if (btnC) {
    const active = (mode === 'candles');
    btnC.style.background = active ? 'rgba(0,232,122,.15)' : 'var(--s2)';
    btnC.style.borderColor = active ? 'var(--up)' : 'var(--border)';
    btnC.style.color = active ? 'var(--up)' : 'var(--t2)';
  }
  if (btnL) {
    const active = (mode === 'line');
    btnL.style.background = active ? 'rgba(0,232,122,.15)' : 'var(--s2)';
    btnL.style.borderColor = active ? 'var(--up)' : 'var(--border)';
    btnL.style.color = active ? 'var(--up)' : 'var(--t2)';
  }
  _renderRealCandles();
}

// ═══ Animation pulse continue (Q1:A) ═══
function _rcAnimateLive() {
  // Tick sur le canvas seulement si modal ouvert
  const modal = document.getElementById('realCandlesModal');
  if (!modal) {
    _realCandlesState.animFrameId = null;
    return;
  }
  _realCandlesState.pulsePhase += 0.08;  // vitesse de pulsation
  // On redessine seulement si pas en train de drag (pour éviter conflit)
  if (!_realCandlesState.isDragging) _renderRealCandles();
  _realCandlesState.animFrameId = requestAnimationFrame(_rcAnimateLive);
}

// ═══ Contrôles zoom ═══
function _rcZoomChange(factor) {
  _realCandlesState.zoomLevel = Math.max(0.3, Math.min(4.0, _realCandlesState.zoomLevel * factor));
  _renderRealCandles();
}
function _rcZoomReset() {
  _realCandlesState.zoomLevel = 1.0;
  _realCandlesState.scrollOffset = 0;
  _renderRealCandles();
}

// ═══ Drag horizontal ═══
function _rcDragStart(e) {
  _realCandlesState.isDragging = true;
  const x = (e.touches ? e.touches[0].clientX : e.clientX);
  _realCandlesState.dragStartX = x;
  _realCandlesState.dragStartOffset = _realCandlesState.scrollOffset;
  const canvas = document.getElementById('realCandlesCanvas');
  if (canvas) canvas.style.cursor = 'grabbing';
}
function _rcDragMove(e) {
  // v7.12 LIVRAISON 2 · met à jour la position du crosshair systématiquement
  const canvas = document.getElementById('realCandlesCanvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
  const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
  _realCandlesState.crosshairX = clientX - rect.left;
  _realCandlesState.crosshairY = clientY - rect.top;

  if (_realCandlesState.isDragging) {
    if (e.cancelable) e.preventDefault();
    const dx = clientX - _realCandlesState.dragStartX;
    const cssW = canvas.clientWidth || 380;
    const chartW = cssW - 4 - 56;
    const candleAreaW = chartW - Math.floor(chartW * 0.18);
    // v7.12 LIVRAISON 2 · même plafond 2 mm que dans _renderRealCandles
    const PX_PER_MM = 96 / 25.4;
    const MAX_CANDLE_PX = Math.round(2 * PX_PER_MM);
    const targetCandleW = 3;
    const baseFitCount = Math.floor(candleAreaW / (targetCandleW + 1));
    const visibleCount = Math.max(3, Math.floor(baseFitCount / _realCandlesState.zoomLevel));
    const candleW = Math.max(1, Math.min(MAX_CANDLE_PX, Math.floor(candleAreaW / visibleCount) - 1));
    const dxCandles = Math.round(dx / (candleW + 1));
    _realCandlesState.scrollOffset = Math.max(0, _realCandlesState.dragStartOffset + dxCandles);
  }
  _renderRealCandles();
}
function _rcDragEnd() {
  _realCandlesState.isDragging = false;
  const canvas = document.getElementById('realCandlesCanvas');
  if (canvas) canvas.style.cursor = 'grab';
}

// v7.12 LIVRAISON 2 · efface le crosshair quand la souris quitte le canvas
function _rcMouseLeave() {
  _realCandlesState.isDragging = false;
  _realCandlesState.crosshairX = -1;
  _realCandlesState.crosshairY = -1;
  const canvas = document.getElementById('realCandlesCanvas');
  if (canvas) canvas.style.cursor = 'grab';
  _renderRealCandles();
}
window._rcMouseLeave = _rcMouseLeave;

// v7.12 LIVRAISON 2 · D/E · toggle pour VOL / MA / EMA
function _rcToggle(key) {
  if (!_realCandlesState.hasOwnProperty(key)) return;
  _realCandlesState[key] = !_realCandlesState[key];
  // MAJ visuel des boutons
  const map = {
    showVolume:'rcVolBtn', showMA:'rcMABtn', showEMA:'rcEMABtn',
    showBB:'rcBBBtn', showRSI:'rcRSIBtn', showMACD:'rcMACDBtn'
  };
  const palette = {
    showVolume:['#38d4f5','rgba(56,212,245,.15)'],
    showMA:['#f5c842','rgba(245,200,66,.15)'],
    showEMA:['#a78bfa','rgba(167,139,250,.15)'],
    showBB:['#5eead4','rgba(94,234,212,.15)'],
    showRSI:['#fb923c','rgba(251,146,60,.15)'],
    showMACD:['#ec4899','rgba(236,72,153,.15)']
  };
  const btn = document.getElementById(map[key]);
  if (btn) {
    const on = _realCandlesState[key];
    const [col, bg] = palette[key];
    btn.style.background = on ? bg : 'var(--s2)';
    btn.style.borderColor = on ? col : 'var(--border)';
    btn.style.color = on ? col : 'var(--t2)';
  }
  // Persister les toggles à chaque changement
  _rcSaveToggles();
  _renderRealCandles();
}
window._rcToggle = _rcToggle;

// ════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 3 · PERSISTANCE des toggles d'indicateurs
// ════════════════════════════════════════════════════════════
const _RC_TOGGLE_KEYS = ['showVolume','showMA','showEMA','showBB','showRSI','showMACD'];
function _rcSaveToggles() {
  try {
    const obj = {};
    _RC_TOGGLE_KEYS.forEach(k => obj[k] = !!_realCandlesState[k]);
    localStorage.setItem('rc_toggles_v1', JSON.stringify(obj));
  } catch(e) {}
}
function _rcLoadToggles() {
  try {
    const raw = localStorage.getItem('rc_toggles_v1');
    if (!raw) return;
    const obj = JSON.parse(raw);
    _RC_TOGGLE_KEYS.forEach(k => {
      if (typeof obj[k] === 'boolean') _realCandlesState[k] = obj[k];
    });
  } catch(e) {}
}
// Appliquer le visuel des boutons selon l'état chargé
function _rcApplyTogglesVisuals() {
  const map = {
    showVolume:'rcVolBtn', showMA:'rcMABtn', showEMA:'rcEMABtn',
    showBB:'rcBBBtn', showRSI:'rcRSIBtn', showMACD:'rcMACDBtn'
  };
  const palette = {
    showVolume:['#38d4f5','rgba(56,212,245,.15)'],
    showMA:['#f5c842','rgba(245,200,66,.15)'],
    showEMA:['#a78bfa','rgba(167,139,250,.15)'],
    showBB:['#5eead4','rgba(94,234,212,.15)'],
    showRSI:['#fb923c','rgba(251,146,60,.15)'],
    showMACD:['#ec4899','rgba(236,72,153,.15)']
  };
  _RC_TOGGLE_KEYS.forEach(k => {
    const btn = document.getElementById(map[k]);
    if (!btn) return;
    const on = _realCandlesState[k];
    const [col, bg] = palette[k];
    btn.style.background = on ? bg : 'var(--s2)';
    btn.style.borderColor = on ? col : 'var(--border)';
    btn.style.color = on ? col : 'var(--t2)';
  });
}
window._rcSaveToggles = _rcSaveToggles;
window._rcLoadToggles = _rcLoadToggles;
window._rcApplyTogglesVisuals = _rcApplyTogglesVisuals;

// v7.12 LIVRAISON 2 · G · reset des bougies de la paire/intervalle courants
// v7.12 LIVRAISON 5 · DIAGNOSTIC · affiche un overlay avec tout l'état pour debug
function _rcDebugDump() {
  const pair = _realCandlesState.selectedPair;
  const iv = _realCandlesState.selectedInterval;
  const arr = (S.realCandles && S.realCandles[pair] && S.realCandles[pair][iv]) || [];
  const ps = (S.pairStates || {})[pair] || {};
  const last = arr.length > 0 ? arr[arr.length - 1] : null;
  const prev = arr.length > 1 ? arr[arr.length - 2] : null;
  const wsConn = !!_realCandlesState.wsConnected;
  const wsAge = _realCandlesState.wsLastTradeTs ? Math.round((Date.now() - _realCandlesState.wsLastTradeTs)/1000) : '?';
  // Trouver les bougies aberrantes (h ou l hors range raisonnable)
  let aberrant = 0;
  if (arr.length >= 2) {
    const closes = arr.slice(-20).map(k => k.c).filter(v => isFinite(v));
    const avg = closes.reduce((s,v)=>s+v,0) / Math.max(1, closes.length);
    arr.forEach(k => {
      if (Math.abs(k.h - avg) / avg > 0.20 || Math.abs(k.l - avg) / avg > 0.20) aberrant++;
    });
  }
  const fmt = (v) => v == null ? '—' : (typeof v === 'number' ? v.toFixed(2) : String(v));
  const fmtTs = (t) => t ? new Date(t).toLocaleTimeString('fr') : '—';
  const dec = (PAIRS[pair] || {}).dec || 2;
  
  // Vérifier la cohérence : la bougie en cours doit avoir close ≈ ps.price
  const drift = (last && ps.price) ? ((last.c - ps.price) / ps.price * 100).toFixed(2) : '?';
  
  const text = 
    'PAIRE : ' + pair + ' · ' + iv + '\n' +
    '──────────────────────\n' +
    'ps.price (state) : ' + fmt(ps.price) + '\n' +
    'Dernière bougie close : ' + fmt(last?.c) + '\n' +
    '★ DRIFT : ' + drift + '% (devrait être ~0)\n' +
    '──────────────────────\n' +
    'Bougies totales : ' + arr.length + '\n' +
    'Aberrantes (>20% écart) : ' + aberrant + '\n' +
    '──────────────────────\n' +
    'WS connecté : ' + (wsConn ? 'OUI' : 'NON') + '\n' +
    'Dernier trade WS il y a : ' + wsAge + 's\n' +
    'WS pair souscrite : ' + (_realCandlesState.wsPair || '—') + '\n' +
    '──────────────────────\n' +
    'Bougie EN COURS :\n' +
    '  ts : ' + fmtTs(last?.ts) + '\n' +
    '  o : ' + fmt(last?.o) + '\n' +
    '  h : ' + fmt(last?.h) + ' ← max\n' +
    '  l : ' + fmt(last?.l) + ' ← min\n' +
    '  c : ' + fmt(last?.c) + ' ← close (devrait = ps.price)\n' +
    '  v : ' + fmt(last?.v) + '\n' +
    '──────────────────────\n' +
    'Bougie PRÉCÉDENTE :\n' +
    '  ts : ' + fmtTs(prev?.ts) + '\n' +
    '  o : ' + fmt(prev?.o) + '\n' +
    '  h : ' + fmt(prev?.h) + '\n' +
    '  l : ' + fmt(prev?.l) + '\n' +
    '  c : ' + fmt(prev?.c) + '\n' +
    '  v : ' + fmt(prev?.v);

  // Afficher dans un overlay scrollable
  const old = document.getElementById('rcDebugOverlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'rcDebugOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.92);z-index:99999;padding:20px;overflow:auto;backdrop-filter:blur(8px);';
  overlay.innerHTML = `
    <div style="max-width:500px;margin:auto;background:#0f1420;border:1px solid var(--ice);border-radius:14px;padding:18px;box-shadow:0 8px 40px rgba(56,212,245,.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-size:13px;font-weight:800;color:var(--ice);">🔍 DIAGNOSTIC BOUGIES</div>
        <button onclick="document.getElementById('rcDebugOverlay').remove()" style="background:var(--s2);border:1px solid var(--border);color:var(--t1);width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;">✕</button>
      </div>
      <pre style="font-family:ui-monospace,monospace;font-size:11px;color:#e0e6f0;line-height:1.5;background:#0a0e15;border:1px solid var(--border);border-radius:8px;padding:12px;white-space:pre-wrap;word-break:break-word;margin:0;">${text.replace(/</g,'&lt;')}</pre>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button onclick="_rcCopyDebug()" style="flex:1;background:rgba(56,212,245,.15);border:1px solid var(--ice);color:var(--ice);padding:10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">📋 Copier</button>
        <button onclick="_rcFixCandles()" style="flex:1;background:rgba(245,200,66,.15);border:1px solid var(--gold);color:var(--gold);padding:10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">🔧 Réparer auto</button>
      </div>
      <div style="margin-top:8px;font-size:9px;color:var(--t3);text-align:center;line-height:1.4;">Réparer = supprimer bougies aberrantes + resync close avec prix live</div>
    </div>
  `;
  document.body.appendChild(overlay);
  // Stocker pour copy
  _realCandlesState._lastDebugText = text;
}
window._rcDebugDump = _rcDebugDump;

function _rcCopyDebug() {
  const txt = _realCandlesState._lastDebugText || '';
  if (!txt) {
    if (typeof showToast === 'function') showToast('Rien à copier', 2000, 'warn');
    return;
  }
  // Méthode legacy execCommand : marche dans tous les contextes (file://, content://, http)
  let success = false;
  try {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, txt.length);
    success = document.execCommand('copy');
    document.body.removeChild(ta);
  } catch(e) { success = false; }

  // Fallback : essayer aussi navigator.clipboard si le legacy a échoué
  if (!success && navigator.clipboard) {
    navigator.clipboard.writeText(txt).then(() => {
      if (typeof showToast === 'function') showToast('✅ Diagnostic copié', 2000, 'win');
    }).catch(() => {
      _rcShowCopyFallback(txt);
    });
    return;
  }

  if (success) {
    if (typeof showToast === 'function') showToast('✅ Diagnostic copié', 2000, 'win');
  } else {
    _rcShowCopyFallback(txt);
  }
}
window._rcCopyDebug = _rcCopyDebug;

// Fallback ultime : si la copie ne marche pas, afficher le texte dans un textarea
// que l'utilisateur peut sélectionner manuellement
function _rcShowCopyFallback(txt) {
  const old = document.getElementById('rcCopyFallback');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'rcCopyFallback';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.95);z-index:99999;padding:20px;overflow:auto;';
  overlay.innerHTML = `
    <div style="max-width:500px;margin:auto;background:#0f1420;border:1px solid var(--gold);border-radius:14px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:13px;font-weight:800;color:var(--gold);">📋 Sélectionne tout puis copie</div>
        <button onclick="document.getElementById('rcCopyFallback').remove()" style="background:var(--s2);border:1px solid var(--border);color:var(--t1);width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;">✕</button>
      </div>
      <textarea readonly onclick="this.select()" id="rcCopyFallbackTa" style="width:100%;min-height:300px;background:#0a0e15;color:#e0e6f0;border:1px solid var(--border);border-radius:8px;padding:10px;font-family:ui-monospace,monospace;font-size:11px;line-height:1.5;resize:vertical;"></textarea>
      <div style="margin-top:8px;font-size:9px;color:var(--t3);text-align:center;line-height:1.4;">Tape sur la zone, "Tout sélectionner" puis "Copier" depuis le menu Android</div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('rcCopyFallbackTa').value = txt;
  setTimeout(() => {
    const ta = document.getElementById('rcCopyFallbackTa');
    if (ta) { ta.focus(); ta.select(); }
  }, 100);
}
window._rcShowCopyFallback = _rcShowCopyFallback;

// Réparation : supprime bougies aberrantes + clamp wicks aberrants + resync close avec ps.price
function _rcFixCandles() {
  const pair = _realCandlesState.selectedPair;
  const iv = _realCandlesState.selectedInterval;
  if (!S.realCandles || !S.realCandles[pair] || !S.realCandles[pair][iv]) return;
  const arr = S.realCandles[pair][iv];
  if (arr.length === 0) return;
  // Calcule moyenne mobile pour détecter aberrations (sur les 20 dernières)
  const recent = arr.slice(-20).map(k => k.c).filter(v => isFinite(v));
  const avg = recent.reduce((s,v)=>s+v,0) / Math.max(1, recent.length);
  let removed = 0;
  let clamped = 0;
  // Étape 1 : enlever les bougies vraiment cassées (NaN ou écart énorme >15%)
  const cleaned = arr.filter(k => {
    if (!isFinite(k.o) || !isFinite(k.c)) return false;
    if (Math.abs(k.c - avg) / avg > 0.15) { removed++; return false; }
    return true;
  });
  // Étape 2 : pour chaque bougie restante, clamp les wicks (h/l) qui s'écartent
  // de plus de 2% de leur propre body — ces wicks sont presque sûrement des bad ticks
  cleaned.forEach(k => {
    const bodyMax = Math.max(k.o, k.c);
    const bodyMin = Math.min(k.o, k.c);
    const tolerance = bodyMax * 0.02;  // 2% du prix
    if (k.h > bodyMax + tolerance) {
      // High aberrant → on le ramène au max acceptable
      k.h = bodyMax + tolerance;
      clamped++;
    }
    if (k.l < bodyMin - tolerance) {
      k.l = bodyMin - tolerance;
      clamped++;
    }
  });
  // Étape 3 : resync close de la dernière bougie avec ps.price (LIVE)
  const ps = S.pairStates[pair];
  if (cleaned.length > 0 && ps && isFinite(ps.price) && ps.price > 0) {
    const last = cleaned[cleaned.length - 1];
    last.c = ps.price;
    if (ps.price > last.h) last.h = ps.price;
    if (ps.price < last.l) last.l = ps.price;
  }
  S.realCandles[pair][iv] = cleaned;
  const msg = removed > 0 || clamped > 0
    ? `🔧 ${removed} bougie(s) supprimée(s), ${clamped} mèche(s) clampée(s)`
    : '🔧 Rien à réparer · tout est sain';
  if (typeof showToast === 'function') showToast(msg, 3000, 'win');
  document.getElementById('rcDebugOverlay')?.remove();
  _renderRealCandles();
}
window._rcFixCandles = _rcFixCandles;


function _rcResetCandles() {
  const pair = _realCandlesState.selectedPair;
  const iv = _realCandlesState.selectedInterval;
  if (!confirm('Effacer l\'historique des bougies ' + pair + ' · ' + iv + ' ?')) return;
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][iv]) {
    S.realCandles[pair][iv] = [];
  }
  _realCandlesState.scrollOffset = 0;
  _renderRealCandles();
  // Backfill auto après reset
  _backfillRealCandles(pair, iv, 100).then(ok => {
    if (ok && _realCandlesState.selectedPair === pair && _realCandlesState.selectedInterval === iv) {
      _renderRealCandles();
    }
  });
}
window._rcResetCandles = _rcResetCandles;

window._rcSetView = _rcSetView;
window._rcZoomChange = _rcZoomChange;
window._rcZoomReset = _rcZoomReset;
window._rcDragStart = _rcDragStart;
window._rcDragMove = _rcDragMove;
window._rcDragEnd = _rcDragEnd;

window.openRealCandlesModal  = openRealCandlesModal;
window.closeRealCandlesModal = closeRealCandlesModal;
window._selectRealCandlesPair = _selectRealCandlesPair;
window._selectRealCandlesInterval = _selectRealCandlesInterval;

// ═══════════════════════════════════════════════════════════════════════
// v7.12 · LIVRAISON 1 · SYSTÈME DE BOUGIES TEMPS RÉEL
// ═══════════════════════════════════════════════════════════════════════

// on construit ici des bougies réelles basées sur les prix CoinGecko réels.
// Intervalles supportés : 5min, 15min, 1h
// Stockage : S.realCandles[pair][interval] = [{ ts, o, h, l, c, n }, ...]
//   ts = timestamp de début de bougie (ms)
//   o, h, l, c = open / high / low / close
//   n = nombre de prix agrégés dans cette bougie
// Limite : 200 bougies max par couple paire/intervalle (rotation FIFO)
// ═══════════════════════════════════════════════════════════════════════

const REAL_CANDLE_INTERVALS = {
  '5m':  5  * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h':  60 * 60 * 1000,
  '4h':  4  * 60 * 60 * 1000,
  '1j':  24 * 60 * 60 * 1000
};
const REAL_CANDLES_MAX = 200;  // max par couple paire/intervalle

/**
 * Initialise la structure S.realCandles si absente
 */
// ════════════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 4 · MODE TRADING (sim/real) — UTILITAIRES
// ════════════════════════════════════════════════════════════════════

// MAJ visuelle du bandeau MODE RÉEL et infos d'état
// ════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 8 · MODE Réel · UTILITAIRES
// ════════════════════════════════════════════════════════════
// Le mode Réel utilise les vraies bougies Binance comme le mode réel,
// mais avec des règles de protection strictes (1 trade, arrêts élargis,
// pause obligatoire après pertes, mémoire d'apprentissage séparée).

// Renvoie true si on est en mode "qui utilise les vraies bougies"

function _isRealLike() {
  return S.tradingMode === 'real' || S.tradingMode === 'paperReal';
}
window._isRealLike = _isRealLike;

// Renvoie les paires actives selon le mode (depuis le bon objet)
function _getActiveRealPairs() {
  if (S.tradingMode === 'real') {
    return Object.keys(S.realActivePairs || {}).filter(p => S.realActivePairs[p]);
  }
  if (S.tradingMode === 'paperReal') {
    return Object.keys(S.paperRealActivePairs || {}).filter(p => S.paperRealActivePairs[p]);
  }
  return [];
}
window._getActiveRealPairs = _getActiveRealPairs;

// Renvoie le timeframe actif selon le mode
function _getActiveRealTimeframe() {
  if (S.tradingMode === 'real') return S.realTimeframe || '15m';
  if (S.tradingMode === 'paperReal') return S.paperRealTimeframe || '15m';
  return '15m';
}
window._getActiveRealTimeframe = _getActiveRealTimeframe;

// Renvoie le kill switch actif selon le mode
function _getActiveKillSwitch() {
  if (S.tradingMode === 'real') return S.realKillSwitch || {};
  if (S.tradingMode === 'paperReal') return S.paperRealKillSwitch || {};
  return {};
}
window._getActiveKillSwitch = _getActiveKillSwitch;

// Renvoie la cible de mémoire d'apprentissage selon le mode
function _getLessonsTarget() {
  if (S.tradingMode === 'real') return 'agentLessonsReal';
  if (S.tradingMode === 'paperReal') return 'agentLessonsPaperReal';
  return 'agentLessons';
}
window._getLessonsTarget = _getLessonsTarget;

function _updateRealModeBanner() {
  const banner = document.getElementById('realModeBanner');
  const infoEl = document.getElementById('realModeBannerInfo');
  if (!banner) return;
  const isReal = S.tradingMode === 'real';
  const isPaperReal = S.tradingMode === 'paperReal';
  
  if (isReal || isPaperReal) {
    banner.style.display = 'block';
    document.body.classList.add('real-mode-active');
    if (isReal) {
      // Bandeau ROUGE (mode réel)
      banner.style.background = 'linear-gradient(90deg,rgba(255,61,107,.20),rgba(255,61,107,.34),rgba(255,61,107,.20))';
      banner.style.borderBottomColor = 'var(--down)';
      banner.style.color = 'var(--down)';
      banner.style.boxShadow = '0 1px 6px rgba(255,61,107,.25)';
      const active = Object.keys(S.realActivePairs || {}).filter(p => S.realActivePairs[p]);
      const tf = S.realTimeframe || '15m';
      const dot = banner.querySelector('span:first-child');
      if (dot) dot.style.background = 'var(--down)';
      // Texte principal
      const mainSpan = banner.querySelectorAll('span')[1];
      if (mainSpan) mainSpan.textContent = '📋 Réel';
      if (infoEl) infoEl.textContent = '· ' + active.length + ' paire(s) · ' + tf;
    } else {
      // Bandeau ORANGE (Réel)
      banner.style.background = 'linear-gradient(90deg,rgba(245,166,35,.20),rgba(245,166,35,.34),rgba(245,166,35,.20))';
      banner.style.borderBottomColor = 'var(--gold)';
      banner.style.color = 'var(--gold)';
      banner.style.boxShadow = '0 1px 6px rgba(245,166,35,.25)';
      const active = Object.keys(S.paperRealActivePairs || {}).filter(p => S.paperRealActivePairs[p]);
      const tf = S.paperRealTimeframe || '15m';
      const dot = banner.querySelector('span:first-child');
      if (dot) dot.style.background = 'var(--gold)';
      const mainSpan = banner.querySelectorAll('span')[1];
      if (mainSpan) mainSpan.textContent = 'Réel';
      if (infoEl) infoEl.textContent = '· ' + active.length + ' paire(s) · ' + tf;
    }
  } else {
    banner.style.display = 'none';
    document.body.classList.remove('real-mode-active');
  }
}
window._updateRealModeBanner = _updateRealModeBanner;

// Vérifie si une paire est éligible au mode real (assez de bougies pour calcul fiable)
// Renvoie { ok: true } ou { ok: false, reason: '...' }
function _isPairRealEligible(pair, tf) {
  tf = tf || S.realTimeframe || '15m';
  if (!S.realCandles || !S.realCandles[pair] || !S.realCandles[pair][tf]) {
    return { ok: false, reason: 'Aucune bougie collectée' };
  }
  const arr = S.realCandles[pair][tf];
  if (arr.length < 30) {
    return { ok: false, reason: 'Pas assez de bougies (' + arr.length + '/30 min)' };
  }
  return { ok: true };
}
window._isPairRealEligible = _isPairRealEligible;

// Backfill 200 bougies pour TOUTES les paires (pour préparer le mode real)
async function _prepareRealMode(tf) {
  tf = tf || S.realTimeframe || '15m';
  const pairs = Object.keys(PAIRS || {});
  const results = {};
  for (const pair of pairs) {
    try {
      const ok = await _backfillRealCandles(pair, tf, 200);
      results[pair] = ok;
    } catch(e) {
      results[pair] = false;
    }
  }
  return results;
}
window._prepareRealMode = _prepareRealMode;

// Toggle activation d'une paire en mode real
function toggleRealPair(pair) {
  if (!S.realActivePairs) S.realActivePairs = {};
  S.realActivePairs[pair] = !S.realActivePairs[pair];
  // Reset kill switch si on réactive manuellement
  if (S.realActivePairs[pair] && S.realKillSwitch && S.realKillSwitch[pair]) {
    S.realKillSwitch[pair] = { paused:false, lossStreak:0, reason:'' };
  }
  // Refresh UI Réglages
  if (typeof renderSettingsPanel === 'function') {
    try { renderSettingsPanel(); } catch(e) {}
  }
  _updateRealModeBanner();
  // v7.12 LIVRAISON 4 · réajuster les WS Binance selon paires actives
  try { _startBgCollector(); } catch(e) {}
}
window.toggleRealPair = toggleRealPair;

// v7.12 LIVRAISON 8 · Handlers MODE Réel
function togglePaperRealPair(pair) {
  if (!S.paperRealActivePairs) S.paperRealActivePairs = {};
  S.paperRealActivePairs[pair] = !S.paperRealActivePairs[pair];
  // Reset kill switch si on réactive manuellement
  if (S.paperRealActivePairs[pair] && S.paperRealKillSwitch && S.paperRealKillSwitch[pair]) {
    S.paperRealKillSwitch[pair] = { paused:false, lossStreak:0, reason:'' };
  }
  if (typeof renderSettingsPanel === 'function') {
    try { renderSettingsPanel(); } catch(e) {}
  }
  if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner();
  try { _startBgCollector(); } catch(e) {}
}
window.togglePaperRealPair = togglePaperRealPair;

function setPaperRealTimeframe(tf) {
  S.paperRealTimeframe = tf;
  if (typeof renderSettingsPanel === 'function') {
    try { renderSettingsPanel(); } catch(e) {}
  }
  if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner();
}
window.setPaperRealTimeframe = setPaperRealTimeframe;

async function confirmSwitchToPaperReal() {
  // Vérifier qu'au moins une paire est activée
  const activeCount = Object.values(S.paperRealActivePairs || {}).filter(v => v).length;
  if (activeCount === 0) {
    if (typeof showToast === 'function') showToast('⚠ Active au moins une paire d\'abord', 3500, 'warn');
    return;
  }
  // Vérifier qu'on n'est pas déjà en mode réel (incompatible)
  if (S.tradingMode === 'real') {
    if (typeof showToast === 'function') showToast('⚠ Désactive d\'abord le mode RÉEL', 3500, 'warn');
    return;
  }
  const tf = S.paperRealTimeframe || '15m';
  const cfg = S.paperRealConfig || {};
  const msg = '📋 ACTIVER LE MODE Réel\n\n' +
    'Le bot va trader sur les vraies bougies Binance (' + tf + ') avec ces règles strictes :\n' +
    '· 1 position ouverte maximum\n' +
    '· Stake max ' + (cfg.maxStakePct || 5) + '% du capital\n' +
    '· Arrêt perte -' + (cfg.stopLossPct || 3) + '% / Gain +' + (cfg.takeProfitPct || 2) + '%\n' +
    '· Cooldown ' + Math.round((cfg.cooldownMs || 1800000) / 60000) + ' min après perte\n' +
    '· Pause globale ' + Math.round((cfg.globalPauseMs || 7200000) / 3600000) + 'h après ' + (cfg.maxConsecLosses || 3) + ' pertes consécutives\n' +
    '· Refus si bougie volatile (>' + (cfg.maxRecentMovePct || 3) + '%)\n\n' +
    'Les agents apprendront dans une mémoire séparée (Réel).\n\n' +
    'Avant le démarrage : 200 bougies vont être téléchargées par paire.\n\n' +
    'Continuer ?';
  if (!confirm(msg)) return;
  
  if (typeof showToast === 'function') showToast('📡 Préparation Réel · backfill…', 4000, 'info');
  const activePairs = Object.keys(S.paperRealActivePairs || {}).filter(p => S.paperRealActivePairs[p]);
  for (const pair of activePairs) {
    try { await _backfillRealCandles(pair, tf, 200); } catch(e) {}
  }
  
  // Auto-snapshot avant activation (pour rollback)
  try {
    const snap = (typeof buildSnapshot === 'function') ? buildSnapshot() : null;
    if (snap) {
      // v114 FIX · anti-récursion : un snapshot ne doit jamais contenir un autre snapshot
      delete snap.preRealSnapshot;
      delete snap.preRealSnapshotPaperReal;
      S.preRealSnapshotPaperReal = {
        snap: snap,
        takenAt: Date.now(),
        mode: 'auto-real',
        meta: {
          totalUsd: snap.b || 0,
          activePairs: activePairs.slice()
        }
      };
    }
  } catch(e) {}
  
  // Activer
  S.tradingMode = 'real';
  S.paperRealStartedAt = Date.now();
  S.paperRealConsecLosses = 0;
  S.paperRealGlobalPauseUntil = 0;
  // Reset kill switches
  S.paperRealKillSwitch = {};
  activePairs.forEach(p => { S.paperRealKillSwitch[p] = { paused:false, lossStreak:0, reason:'' }; });
  
  if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner();
  if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
  try { _startBgCollector(); } catch(e) {}
  if (typeof showToast === 'function') showToast('✅ Mode Réel actif · ' + activePairs.length + ' paire(s) · ' + tf, 5000, 'win');
}
window.confirmSwitchToPaperReal = confirmSwitchToPaperReal;

function confirmSwitchMode() {
  const lessons = (S.agentLessonsPaperReal || []).length;
  const msg = '↩ MODE RÉEL' +
    'Le bot reprendra le moteur interne.\n\n' +
    'La mémoire d\'apprentissage Réel (' + lessons + ' leçons) sera CONSERVÉE pour de futurs tests.\n\n' +
    'Continuer ?';
  if (!confirm(msg)) return;
  S.tradingMode = 'sim';
  if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner();
  if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
  try { _startBgCollector(); } catch(e) {}
  if (typeof showToast === 'function') showToast('↩ Retour', 3000, 'info');
}
window.confirmSwitchMode = confirmSwitchMode;

// Choix du timeframe pour les décisions du bot en mode real
function setRealTimeframe(tf) {
  S.realTimeframe = tf;
  if (typeof renderSettingsPanel === 'function') {
    try { renderSettingsPanel(); } catch(e) {}
  }
  _updateRealModeBanner();
}
window.setRealTimeframe = setRealTimeframe;

// Confirmation bidirectionnelle pour les switchs sim ↔ real
async function confirmSwitchToReal() {
  // Vérifier qu'au moins une paire est activée
  const activeCount = Object.values(S.realActivePairs || {}).filter(v => v).length;
  if (activeCount === 0) {
    showToast('⚠ Active au moins une paire d\'abord', 3500, 'warn');
    return;
  }
  const tf = S.realTimeframe || '15m';
  if (!confirm('⚠ ACTIVER LE MODE RÉEL\n\nLe bot prendra ses décisions sur les bougies Binance live (' + tf + ') au lieu de la trading.\n\nAvant le démarrage, 200 bougies seront téléchargées pour chaque paire active. Cela peut prendre quelques secondes.\n\nLes agents apprendront dans une mémoire séparée.\n\nContinuer ?')) {
    return;
  }
  showToast('📡 Préparation du mode réel · backfill en cours…', 4000, 'info');
  // Backfill 200 bougies pour les paires actives
  const activePairs = Object.keys(S.realActivePairs || {}).filter(p => S.realActivePairs[p]);
  let okCount = 0;
  for (const pair of activePairs) {
    try {
      const ok = await _backfillRealCandles(pair, tf, 200);
      if (ok) okCount++;
    } catch(e) {}
  }
  // Vérifier éligibilité
  const ineligible = activePairs.filter(p => !_isPairRealEligible(p, tf).ok);
  if (ineligible.length > 0) {
    showToast('⚠ Certaines paires manquent de données : ' + ineligible.join(', '), 5000, 'warn');
    if (!confirm('Certaines paires ne sont pas prêtes :\n' + ineligible.join('\n') + '\n\nActiver quand même le mode réel ? Les paires non prêtes seront ignorées par le bot tant qu\'elles n\'ont pas assez de bougies.')) {
      return;
    }
  }
  // v7.12 LIVRAISON 6 · SAFETY · auto-snapshot avant activation
  try {
    const snap = (typeof buildSnapshot === 'function') ? buildSnapshot() : null;
    if (snap) {
      // v114 FIX · anti-récursion : un snapshot ne doit jamais contenir un autre snapshot
      delete snap.preRealSnapshot;
      delete snap.preRealSnapshotPaperReal;
      S.preRealSnapshot = {
        snap: snap,
        takenAt: Date.now(),
        mode: 'auto-pre-real',
        meta: {
          totalUsd: snap.b || 0,
          tradesCount: (snap.openPositions || []).length,
          activePairs: activePairs.slice()
        }
      };
    }
  } catch(e) {}

  // Activer
  S.tradingMode = 'real';
  S.realModeStartedAt = Date.now();
  // Reset kill switches au démarrage
  S.realKillSwitch = {};
  activePairs.forEach(p => { S.realKillSwitch[p] = { paused:false, lossStreak:0, reason:'' }; });
  _updateRealModeBanner();
  if (typeof renderSettingsPanel === 'function') {
    try { renderSettingsPanel(); } catch(e) {}
  }
  // v7.12 LIVRAISON 4 · démarrer les WS Binance pour les paires actives
  try { _startBgCollector(); } catch(e) {}
  showToast('✅ MODE RÉEL activé · ' + activePairs.length + ' paire(s) · ' + tf, 5000, 'win');
}
window.confirmSwitchToReal = confirmSwitchToReal;

// v7.12 LIVRAISON 6 · Rollback vers le snapshot pris avant activation real
function confirmRollbackPreReal() {
  if (!S.preRealSnapshot || !S.preRealSnapshot.snap) {
    if (typeof showToast === 'function') showToast('Pas de snapshot disponible', 2500, 'warn');
    return;
  }
  const ps = S.preRealSnapshot;
  const ageMin = Math.floor((Date.now() - ps.takenAt) / 60000);
  const ageStr = ageMin < 60 ? ageMin + ' min' : (ageMin < 1440 ? Math.floor(ageMin/60) + 'h' : Math.floor(ageMin/1440) + 'j');
  const dollarStr = '$' + (ps.meta?.totalUsd || 0).toFixed(0);
  if (!confirm('↶ RESTAURER L\'ÉTAT PRÉ-RÉEL\n\nÉtat sauvegardé il y a ' + ageStr + '\nTotal à l\'époque : ' + dollarStr + '\nPaires alors actives : ' + (ps.meta?.activePairs || []).join(', ') + '\n\n⚠ Toutes les modifications depuis seront perdues :\n· trades en mode réel\n· apprentissage agents (mémoire real)\n· stats par paire\n\nLa mémoire SIMULATION sera préservée.\n\nContinuer ?')) {
    return;
  }
  try {
    // v7.12 LIVRAISON 11 · ROLLBACK SÉCURISÉ
    // Le snapshot peut avoir des champs corrompus ou à zéro.
    // On ne restaure QUE les champs explicitement nécessaires, pas tout le snapshot.
    const snap = ps.snap;
    const meta = ps.meta || {};

    // 1. Sauvegarder l'état actuel comme garde-fou
    const safeBackup = {
      b: S.b,
      tradingAccount: S.tradingAccount,
      cashAccount: S.cashAccount,
      taxReserve: S.taxReserve,
      ownFunds: S.ownFunds,
      simLessons: S.agentLessons ? S.agentLessons.slice() : []
    };

    // 2. Restaurer SEULEMENT les champs d'apprentissage et de mode trading
    // (PAS les champs financiers qui peuvent être corrompus dans le snapshot)
    const SAFE_FIELDS_TO_RESTORE = [
      'agentLessons',          
      'agents',                // état des agents (fitness, etc.)
      'cycle',                 // cycle bot
      'pnlHistory',            // historique pnl
      'learningHistory',       // historique apprentissage
      'pairStates',            // états des paires
      'fees',                  // structure de fees
      // PAS S.b, S.tradingAccount, S.cashAccount → on garde l'actuel
    ];

    SAFE_FIELDS_TO_RESTORE.forEach(field => {
      if (snap[field] !== undefined && snap[field] !== null) {
        S[field] = JSON.parse(JSON.stringify(snap[field]));
      }
    });

    // 3. Restaurer le capital depuis meta (priorité) ou snapshot.b (fallback)
    // SEULEMENT si la valeur est saine (> 0 et numérique)
    let restoredCapital = 0;
    if (meta.totalUsd && isFinite(meta.totalUsd) && meta.totalUsd > 0) {
      restoredCapital = meta.totalUsd;
    } else if (snap.b && isFinite(snap.b) && snap.b > 0) {
      restoredCapital = snap.b;
    }

    if (restoredCapital > 0) {
      S.b = restoredCapital;
      // Répartir : 90% trading, 10% caisse (si l'état initial n'a pas ces champs)
      if (snap.tradingAccount && isFinite(snap.tradingAccount) && snap.tradingAccount > 0) {
        S.tradingAccount = snap.tradingAccount;
        S.cashAccount = snap.cashAccount || (restoredCapital - snap.tradingAccount);
      } else {
        S.tradingAccount = restoredCapital * 0.9;
        S.cashAccount = restoredCapital * 0.1;
      }
    } else {
      // Si pas de capital sain dans le snapshot, on garde la valeur actuelle
      // (qui est elle-même peut-être à zéro, mais au moins on n'écrase pas)
      S.b = safeBackup.b || 0;
      S.tradingAccount = safeBackup.tradingAccount || 0;
      S.cashAccount = safeBackup.cashAccount || 0;
    }

    // 4. Réinitialiser les modes spéciaux
    S.tradingMode = 'sim';
    S.realActivePairs = {};
    S.realStatsByPair = {};
    S.realKillSwitch = {};
    S.realPairCycle = {};
    S.realModeStartedAt = 0;
    // Effacer aussi les états Réel (sauf la mémoire d'apprentissage)
    S.paperRealActivePairs = {};
    S.paperRealStats = {};
    S.paperRealKillSwitch = {};
    S.paperRealConsecLosses = 0;
    S.paperRealGlobalPauseUntil = 0;
    S.paperRealLastClose = {};
    S.paperRealStartedAt = 0;

    // 5. UI refresh
    if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner();
    if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
    if (typeof renderHome === 'function') renderHome();

    if (typeof showToast === 'function') {
      showToast('✅ État restauré · $' + (S.b || 0).toFixed(0), 4000, 'win');
    }
  } catch(e) {
    if (typeof showToast === 'function') showToast('❌ Erreur rollback : ' + (e.message || e), 4000, 'critical');
    console.error('Rollback error:', e);
  }
}
window.confirmRollbackPreReal = confirmRollbackPreReal;

function confirmSwitchMode() {
  if (!confirm('Confirmer le changement de mode ?')) {
    return;
  }
  S.tradingMode = 'sim';
  // v114 FIX · purge des snapshots devenus inutiles au retour en sim (libère le stockage)
  S.preRealSnapshot = null;
  S.preRealSnapshotPaperReal = null;
  _updateRealModeBanner();
  if (typeof renderSettingsPanel === 'function') {
    try { renderSettingsPanel(); } catch(e) {}
  }
  // v7.12 LIVRAISON 4 · réduire les WS à juste la paire principale
  try { _startBgCollector(); } catch(e) {}
  showToast('↩ Retour', 3000, 'info');
}
window.confirmSwitchMode = confirmSwitchMode;

function _ensureRealCandlesStruct() {
  if (typeof S === 'undefined' || !S) return;
  if (!S.realCandles) S.realCandles = {};
  Object.keys(PAIRS).forEach(pair => {
    if (!S.realCandles[pair]) S.realCandles[pair] = {};
    Object.keys(REAL_CANDLE_INTERVALS).forEach(interval => {
      if (!S.realCandles[pair][interval]) S.realCandles[pair][interval] = [];
    });
  });
}

/**
 * Calcule le timestamp de début de bougie pour un prix donné
 * Ex : pour 5m, à 22:07:34 → renvoie le timestamp de 22:05:00
 */
function _candleStartTs(now, intervalMs) {
  return Math.floor(now / intervalMs) * intervalMs;
}

/**
 * v7.12 LIVRAISON 2 · BACKFILL HISTORIQUE
 * Récupère N bougies historiques depuis Binance (gratuit, sans clé API)
 * pour une paire et un intervalle donnés. Appelé une seule fois
 * à la première sélection (si aucune bougie présente).
 * @param {string} pair - ex: 'BTC/USDT'
 * @param {string} interval - ex: '5m'
 * @param {number} limit - nombre de bougies à récupérer (def: 100, max: 500)
 */
const _backfillInProgress = {};   // { 'BTC/USDT_5m': true } pour éviter requêtes parallèles
async function _backfillRealCandles(pair, interval, limit) {
  if (!pair || !interval) return false;
  const key = pair + '_' + interval;
  if (_backfillInProgress[key]) return false;
  _backfillInProgress[key] = true;
  try {
    _ensureRealCandlesStruct();
    // Mapping intervalle UI → Binance
    const ivMap = { '5m':'5m', '15m':'15m', '1h':'1h', '4h':'4h', '1j':'1d' };
    const binanceIv = ivMap[interval] || '5m';
    const symbol = pair.replace('/','');
    const lim = Math.max(10, Math.min(500, limit || 100));
    const url = 'https://api.binance.com/api/v3/klines?symbol=' + symbol + '&interval=' + binanceIv + '&limit=' + lim;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
    // Format Binance : [openTime, open, high, low, close, volume, closeTime, ...]
    const arr = S.realCandles[pair][interval];
    // v7.12 LIVRAISON 5 · FUSION INTELLIGENTE : on couvre tous les gaps (avant, milieu, après)
    // On construit un index par timestamp pour détecter les bougies déjà présentes
    const existingTs = new Set(arr.map(k => k.ts));
    let added = 0;
    let updated = 0;
    data.forEach(k => {
      const ts = +k[0];
      const candle = {
        ts: ts,
        o: +k[1], h: +k[2], l: +k[3], c: +k[4],
        v: +k[5],
        n: 1
      };
      if (existingTs.has(ts)) {
        // La bougie existe déjà : on met à jour SI elle n'est pas la bougie en cours (live)
        // (la bougie live ne doit pas être écrasée par le backfill car elle est plus à jour côté close)
        const idx = arr.findIndex(x => x.ts === ts);
        if (idx >= 0 && idx < arr.length - 1) {
          // Pas la dernière → on rafraîchit avec données Binance officielles
          // (utile si la bougie a été remplie par gap-fill avec doji)
          if (arr[idx]._gap || (arr[idx].n || 0) === 0) {
            arr[idx] = candle;
            updated++;
          }
        }
      } else {
        // Nouvelle : on l'ajoute
        arr.push(candle);
        added++;
      }
    });
    // Re-trier chronologiquement (au cas où on aurait inséré au milieu)
    arr.sort((a, b) => a.ts - b.ts);
    if (added === 0 && updated === 0) return false;
    // Cap à REAL_CANDLES_MAX
    if (arr.length > REAL_CANDLES_MAX) {
      S.realCandles[pair][interval] = arr.slice(-REAL_CANDLES_MAX);
    }
    return true;
  } catch(e) {
    return false;
  } finally {
    _backfillInProgress[key] = false;
  }
}
window._backfillRealCandles = _backfillRealCandles;

/**
 * Agrège un prix réel dans les bougies de toutes les granularités
 * Appelé à chaque arrivée d'un vrai prix CoinGecko/Binance
 * @param {string} pair - ex: 'BTC/USDT'
 * @param {number} price - prix en USDT
 * @param {number} ts - timestamp en ms (defaults to Date.now())
 */
// v7.12 LIVRAISON 6 · Insère/met à jour une bougie reçue via stream @kline
// (données OHLCV officielles Binance, plus précises que l'agrégation depuis @trade)
function _upsertKlineCandle(pair, interval, k) {
  if (!pair || !interval || !k) return;
  
  // v7.12 LIVRAISON 11 · Signaler au watchdog réseau (kline est un prix réel reçu)
  if (typeof markRealPriceReceived === 'function') markRealPriceReceived();
  
  _ensureRealCandlesStruct();
  if (!S.realCandles[pair] || !S.realCandles[pair][interval]) return;
  const arr = S.realCandles[pair][interval];

  // v7.12 LIVRAISON 8 · Filtre outlier renforcé : vérifie close ET high/low
  // (un high/low aberrant peut polluer le graphe même si close est correct)
  const ref = (arr.length > 0 ? arr[arr.length - 1].c : null) ||
              (S.pairStates && S.pairStates[pair] ? S.pairStates[pair].price : null);
  if (ref && isFinite(ref) && ref > 0) {
    // Reject si close, high OU low s'écarte de >2% de la référence
    if (Math.abs(k.c - ref) / ref > 0.02) return;
    if (Math.abs(k.h - ref) / ref > 0.02) return;
    if (Math.abs(k.l - ref) / ref > 0.02) return;
  }

  // Sanity intra-bougie : rejeter aussi si h/l s'écartent de >2% du close
  // (cas où la bougie elle-même est cohérente avec ref mais a une mèche corrompue)
  if (isFinite(k.c) && k.c > 0) {
    if (Math.abs(k.h - k.c) / k.c > 0.02) return;
    if (Math.abs(k.l - k.c) / k.c > 0.02) return;
  }

  // Chercher si la bougie existe déjà (même ts)
  const idx = arr.findIndex(c => c.ts === k.ts);
  const candleObj = {
    ts: k.ts, o: k.o, h: k.h, l: k.l, c: k.c, v: k.v,
    n: k.n || 1
  };
  if (idx >= 0) {
    arr[idx] = candleObj;
  } else {
    arr.push(candleObj);
    arr.sort((a, b) => a.ts - b.ts);
    if (arr.length > REAL_CANDLES_MAX) arr.splice(0, arr.length - REAL_CANDLES_MAX);
  }
}
window._upsertKlineCandle = _upsertKlineCandle;

// v7.12 LIVRAISON 6 · Agrège un prix dans toutes les granularités SAUF la sélectionnée
// (la timeframe sélectionnée reçoit les klines officielles via _upsertKlineCandle)
function _aggregateRealPriceOtherIntervals(pair, price, ts) {
  if (!pair || !isFinite(price) || price <= 0) return;
  if (!ts) ts = Date.now();
  
  // v7.12 LIVRAISON 11 · Signaler au watchdog (couvre les WS multi-paires en BG)
  if (typeof markRealPriceReceived === 'function') markRealPriceReceived();
  
  _ensureRealCandlesStruct();
  if (!S.realCandles[pair]) return;
  const skipInterval = (typeof _realCandlesState !== 'undefined') ? _realCandlesState.selectedInterval : null;
  Object.entries(REAL_CANDLE_INTERVALS).forEach(([interval, intervalMs]) => {
    if (interval === skipInterval) return;
    const arr = S.realCandles[pair][interval];
    if (!arr) return;
    const ref = arr.length > 0 ? arr[arr.length - 1].c : null;
    if (ref && Math.abs(price - ref) / ref > 0.02) return;
    const candleStart = _candleStartTs(ts, intervalMs);
    const lastCandle = arr[arr.length - 1];
    if (!lastCandle || lastCandle.ts < candleStart) {
      arr.push({ ts: candleStart, o: price, h: price, l: price, c: price, v: 0, n: 1 });
      if (arr.length > REAL_CANDLES_MAX) arr.splice(0, arr.length - REAL_CANDLES_MAX);
    } else if (lastCandle.ts === candleStart) {
      if (price > lastCandle.h) lastCandle.h = price;
      if (price < lastCandle.l) lastCandle.l = price;
      lastCandle.c = price;
      lastCandle.n = (lastCandle.n || 0) + 1;
      if (typeof lastCandle.v !== 'number') lastCandle.v = 0;
    }
  });
}
window._aggregateRealPriceOtherIntervals = _aggregateRealPriceOtherIntervals;

function _aggregateRealPrice(pair, price, ts) {
  if (!pair || !isFinite(price) || price <= 0) return;
  if (!ts) ts = Date.now();
  
  // v7.12 LIVRAISON 11 · Signaler au watchdog réseau qu'on reçoit un prix réel
  // (sinon le watchdog déclenche "Connexion instable · bot en pause" à tort
  //  car en mode Réel les prix viennent du WS, pas de CoinGecko)
  if (typeof markRealPriceReceived === 'function') markRealPriceReceived();
  
  _ensureRealCandlesStruct();
  if (!S.realCandles[pair]) return;
  
  // ═══ v7.12 LIVRAISON 5 · FILTRE OUTLIERS ═══
  // Si la dernière bougie en cours existe et que le prix s'écarte de >2% de son close,
  // c'est presque certainement un trade corrompu (mauvais feed, mauvais marché, parsing bug).
  // BTC/ETH ne bougent jamais de >2% en quelques secondes en conditions normales.
  // On vérifie sur la granularité 5m (la plus rapide) pour avoir une référence récente.
  try {
    const ref5m = S.realCandles[pair]['5m'];
    if (ref5m && ref5m.length > 0) {
      const refClose = ref5m[ref5m.length - 1].c;
      if (isFinite(refClose) && refClose > 0) {
        const deviation = Math.abs(price - refClose) / refClose;
        if (deviation > 0.02) {  // > 2% d'écart vs close 5m récent → rejet
          return;
        }
      }
    }
  } catch(e) {}
  
  Object.entries(REAL_CANDLE_INTERVALS).forEach(([interval, intervalMs]) => {
    const arr = S.realCandles[pair][interval];
    if (!arr) return;
    
    const candleStart = _candleStartTs(ts, intervalMs);
    const lastCandle = arr[arr.length - 1];
    
    if (!lastCandle || lastCandle.ts < candleStart) {
      // ═══ v7.12 LIVRAISON 5 · GAP-FILL ═══
      // Si plusieurs bougies se sont écoulées sans trade (ex: WS coupé 15min sur 5m),
      // on remplit les buckets manquants avec des bougies "doji" (o=h=l=c=lastClose, v=0)
      // pour préserver la chronologie temporelle continue
      if (lastCandle && lastCandle.ts < candleStart) {
        const lastClose = lastCandle.c;
        let nextTs = lastCandle.ts + intervalMs;
        let gapFilled = 0;
        while (nextTs < candleStart && gapFilled < 50) {  // limite sécurité 50 bougies
          arr.push({
            ts: nextTs,
            o: lastClose, h: lastClose, l: lastClose, c: lastClose,
            v: 0, n: 0,
            _gap: true   // marqueur pour debug
          });
          nextTs += intervalMs;
          gapFilled++;
        }
      }
      // Nouvelle bougie courante
      arr.push({
        ts: candleStart,
        o: price,
        h: price,
        l: price,
        c: price,
        v: 0,           // v7.12 LIVRAISON 5 · init volume à 0
        n: 1
      });
      // Rotation FIFO si trop de bougies
      if (arr.length > REAL_CANDLES_MAX) {
        arr.splice(0, arr.length - REAL_CANDLES_MAX);
      }
    } else if (lastCandle.ts === candleStart) {
      // Même bougie : on met à jour
      if (price > lastCandle.h) lastCandle.h = price;
      if (price < lastCandle.l) lastCandle.l = price;
      lastCandle.c = price;
      lastCandle.n = (lastCandle.n || 0) + 1;
      // v7.12 LIVRAISON 5 · accumulation du volume estimé
      // Sur le stream "trade" Binance on n'a pas la qty trade par trade
      // (sauf via msg.q), mais on compte le nombre de trades comme proxy de volume
      // Si v existait déjà (du backfill), on l'incrémente; sinon on initialise
      if (typeof lastCandle.v !== 'number') lastCandle.v = 0;
      // n compte les trades, on garde v = nb_trades comme volume relatif
      // (sera plus précis si on switche au stream @kline plus tard)
      lastCandle.v = lastCandle.n;
    }
  });
  
  // ═══ Redessin instantané si modal ouvert et que ça concerne la paire affichée ═══
  if (typeof _realCandlesState !== 'undefined' && _realCandlesState.selectedPair === pair) {
    const modal = document.getElementById('realCandlesModal');
    if (modal && typeof _renderRealCandles === 'function') {
      try { _renderRealCandles(); } catch(e) { /* silent */ }
    }
  }
}

/**
 * Hook public pour agréger plusieurs prix d'un coup (depuis CG/BN)
 * @param {Object} pricesByPair - { 'BTC/USDT': 67000, 'ETH/USDT': 3500, ... }
 */
function _aggregateRealPrices(pricesByPair) {
  const ts = Date.now();
  Object.entries(pricesByPair || {}).forEach(([pair, price]) => {
    _aggregateRealPrice(pair, price, ts);
  });
}

// API publique
window._aggregateRealPrice  = _aggregateRealPrice;
window._aggregateRealPrices = _aggregateRealPrices;
window._ensureRealCandlesStruct = _ensureRealCandlesStruct;
window.REAL_CANDLE_INTERVALS = REAL_CANDLE_INTERVALS;

// Init au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(_ensureRealCandlesStruct, 1000));
} else {
  setTimeout(_ensureRealCandlesStruct, 1000);
}

// Helper de diagnostic (utilisable dans la console pour vérifier)
window._dumpRealCandles = function(pair, interval) {
  if (!S.realCandles || !S.realCandles[pair] || !S.realCandles[pair][interval]) {
    console.log('Aucune bougie pour', pair, interval);
    return [];
  }
  const arr = S.realCandles[pair][interval];
  console.log(`[Bougies réelles] ${pair} · ${interval} · ${arr.length} bougies`);
  arr.slice(-5).forEach(k => {
    const date = new Date(k.ts).toLocaleString('fr');
    console.log(`  ${date} · O:${k.o.toFixed(2)} H:${k.h.toFixed(2)} L:${k.l.toFixed(2)} C:${k.c.toFixed(2)} (${k.n} prix)`);
  });
  return arr;
};

async function fetchLivePrices(force = false) {
  if(_fetchInProgress) return;
  const now = Date.now();
  if(!force && now - _lastPriceFetch < 8000) return;

  _fetchInProgress = true;
  _setLiveIndicator('fetching');

  try {
    const ids   = Object.values(COINGECKO_IDS).join(',');
    const url   = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const resp  = await fetch(url, { signal: AbortSignal.timeout(10000) });  // v7.0: 10s timeout

    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const data  = await resp.json();

    let updated = 0;
    Object.entries(COINGECKO_IDS).forEach(([pair, cgId]) => {
      const item = data[cgId];
      if(!item || !item.usd) return;

      const realPrice   = parseFloat(item.usd);
      const change24h   = parseFloat(item.usd_24h_change || 0);
      const ps          = S.pairStates[pair];
      const cfg         = PAIRS[pair];
      if(!ps || !cfg) return;

      const prevPrice   = ps.price;
      const priceDelta  = Math.abs(realPrice - prevPrice);

      // Smooth transition: blend real price over 3 ticks to avoid jarring jumps
      // v6.9: first fetch = prix immédiat, suivants = blend doux
      if(!ps._targetPrice && Math.abs(realPrice - ps.price) / ps.price > 0.005) {
        ps.price = realPrice;  // premier sync: immédiat
        if(ps.candles.length > 0) ps.candles[ps.candles.length-1].c = realPrice;
      }
      ps._targetPrice   = realPrice;
      ps.pnl24h         = change24h;
      
      // v7.12 LIVRAISON 1 · agrège dans les bougies temps réel (5m/15m/1h)
      try { _aggregateRealPrice(pair, realPrice); } catch(e) { /* silent */ }

      // Update dynamic min/max around real price (±35% — never locked)
      cfg.minP          = realPrice * 0.65;
      cfg.maxP          = realPrice * 1.55;

      
      // vol = typical tick-move ≈ daily_range / sqrt(96) tick_periods
      const dailyRange  = realPrice * Math.abs(change24h) / 100;
      cfg.vol           = Math.max(cfg.vol * 0.3, dailyRange / 9.8);

      updated++;
    });

    _lastPriceFetch  = Date.now();
    if (typeof markRealPriceReceived === 'function') markRealPriceReceived();
    _pricesFetched   = true;
    _priceRetryDelay = 2000;  // v7.0: reset backoff on success
    _cgFailCount     = 0;     // v7.12: reset CG fail counter
    _priceSource     = 0;     // back to primary source

    // v7.0: Affichage "LIVE HH:MM" persistant (pas de retour à ● LIVE)
    const t = new Date().toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'});
    _setLiveIndicator('live', `● LIVE CG ${t}`);

    if(updated > 0) {
      // v7.0: ChainLog silencieux — pas d'affichage toast inutile
      S.chainLog.push({ icon:'📡', desc:`Prix réels mis à jour: ${updated} paires via CoinGecko`, hash:rndHash(), time:nowStr() });
      // Save live prices to localStorage pour restore rapide au prochain load
      try {
        const priceCache = {};
        Object.entries(S.pairStates).forEach(([pair, ps]) => {
          priceCache[pair] = { price: ps.price, pnl24h: ps.pnl24h, ts: Date.now() };
        });
        localStorage.setItem('nexus_price_cache', JSON.stringify(priceCache));
      } catch(e) {}
      syncPairPresets();
      if(typeof liveTrainAgents === 'function') liveTrainAgents();
    }

  } catch(err) {
    
    _cgFailCount++;
    // Log silencieux : seulement après 3 échecs consécutifs (évite spam console sur échecs passagers)
    if (_cgFailCount >= 3 && _cgFailCount % 5 === 3) {
      console.info('[CoinGecko] temporarily unavailable · using fallback · err#' + _cgFailCount);
    }
    
    if(_cgFailCount >= _CG_FAIL_THRESHOLD) {
      // Try Binance backup
      _setLiveIndicator('fetching');
      const bnOk = await fetchBinancePrices();
      if(bnOk) {
        // Binance worked — stay on tier 1
      } else {
        
        _simulationTickAll();
      }
    } else {
      _setLiveIndicator('stale');
    }
    
    // Schedule retry with backoff (will try CG again)
    setTimeout(() => {
      if(!_fetchInProgress) fetchLivePrices(true);
    }, _priceRetryDelay);
    _priceRetryDelay = Math.min(_priceRetryDelay * 2, _PRICE_RETRY_MAX);
  } finally {
    _fetchInProgress = false;
  }
}

// v7.0: Watchdog — si pas de fetch réussi depuis 45s, force un retry
function _priceWatchdog() {
  const age = Date.now() - (_lastPriceFetch || 0);
  if(age > 45000 && !_fetchInProgress) {
    _priceRetryDelay = 2000;  // reset backoff
    fetchLivePrices(true);
  }
}

// v7.0: Listener visibilité — refetch quand user revient sur l'app
if(typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') {
      const age = Date.now() - (_lastPriceFetch || 0);
      if(age > 20000) fetchLivePrices(true);
    }
  });
}


function blendRealPrices() {
  Object.entries(S.pairStates).forEach(([pair, ps]) => {
    if(ps._targetPrice && typeof ps._targetPrice === 'number') {
      const diff = ps._targetPrice - ps.price;
      if(Math.abs(diff) > 0.0001) {
        // Blend 25% toward target each tick — smooth but not instant
        ps.price = ps.price + diff * 0.90;  // v6.8: blend 90% vers prix live
        // Sync last candle close to blended price
        if(ps.candles.length > 0) ps.candles[ps.candles.length-1].c = ps.price;
      } else {
        ps._targetPrice = null;
      }
    }
  });
}


// Règle : on alloue le capital de trading équitablement entre les paires actives,
// pondéré par la confiance LMSR de chaque paire (plus le signal est fort → plus on mise).
// ============================================================
// INITIALISATION DU COMPTE LEVIER
// ============================================================
function initLeverageReserve() {
  S.leverageReserve = S.tradingAccount * S.leverageMaxMult;
}

function syncLeverageReserve() {
  // v7.8 · Formule confirmée utilisateur :
  //   Capacité totale = base × 10 × indexMax (= base × 100, indexMax = 10)
  //   Utilisé         = base × 10 × indexCourant
  //   Disponible      = Capacité totale − Utilisé (= base × 10 × (indexMax − indexCourant))
  // Exemple avec base $49.70 :
  //   index 0  → disponible $4,970 (100% disponible)
  //   index 1  → disponible $4,473 ($497 utilisés, reste la marge pour monter jusqu'à ×10)
  //   index 5  → disponible $2,485
  //   index 10 → disponible $0 (tout consommé)
  const index    = S.leverage || 0;
  const maxIdx   = S.leverageMaxMult || 10;
  const useFrozenBase = index > 0 && (S._autoLevBase || 0) > 0;
  const base = useFrozenBase ? S._autoLevBase : (S.tradingAccount || 0);
  const totalCapacity = base * 10 * maxIdx;  // capacité max théorique (à ×10)
  S.leverageReserve   = Math.max(0, totalCapacity - (S.leverageBorrowed || 0));
}

// ── v7.2 PHASE 14c · Emprunt automatique quand l'index change ─────
// Spec: "la somme du solde du compte trading × l'index est déduite de la réserve
// et transférée au compte trading momentanément jusqu'à la fin des trades".
// Interprétation confirmée par l'utilisateur (A=OUI):
//   - targetBorrow = tradingAtLeverageStart × (index - 1)  (net au-delà du capital propre)
//   - index passe 0→N : snapshot du trading ACTUEL, emprunter la somme cible
//   - index monte (N→M>N) : emprunter la différence additionnelle
//   - index descend (M→N<M) : rembourser la différence (depuis trading courant)
//   - index → 0 : tout rembourser + reset snapshot
// Les positions ouvertes restent intouchées — leur pos.levBorrowed est indépendant.
function applyAutoLeverageBorrow(newIndex, prevIndex) {
  newIndex  = Math.max(0, newIndex  || 0);
  prevIndex = Math.max(0, prevIndex || 0);
  if(newIndex === prevIndex) return { ok:true, action:'noop' };

  const mult = S.leverageMaxMult || 10;  // plafond système (10)

  // Cas désactivation complète (N>0 → 0)
  if(newIndex === 0) {
    const toRepay = S._autoLevBorrowed || 0;
    if(toRepay > 0) {
      // v7.12 · FIX BUG DETTE ORPHELINE · tentative de remboursement complet depuis trading
      // Si trading insuffisant, la différence reste en dette orpheline
      // → elle sera résorbée par P2 (à la clôture des positions) ou P4 (watchdog 60s)
      const canRepay = Math.min(toRepay, S.tradingAccount || 0);
      S.tradingAccount   = Math.max(0, S.tradingAccount - canRepay);
      S.leverageBorrowed = Math.max(0, (S.leverageBorrowed || 0) - canRepay);
      S._autoLevBorrowed = Math.max(0, toRepay - canRepay);
      
      // v7.12 · Si dette résiduelle, marquer explicitement (pour les watchdogs)
      if (S._autoLevBorrowed > 0) {
        S._orphanDebtSince = Date.now();
        console.warn('[NEXUS] Dette orpheline créée: $' + S._autoLevBorrowed.toFixed(2) + ' · sera résorbée par P2/P4');
      } else {
        S._orphanDebtSince = 0;
      }
      
      S.chainLog.push({
        icon:'↩',
        desc:`Levier désactivé · réserve retirée de trading: ${fmt$2(canRepay)}${S._autoLevBorrowed>0?' (reste dû '+fmt$2(S._autoLevBorrowed)+' · auto-résorption activée)':''}`,
        hash:rndHash(), time:nowStr()
      });
    }
    S._autoLevBase = 0;
    return { ok:true, action:'disable', repaid:toRepay };
  }

  // v7.6 NEW FORMULA · targetBorrow = base × mult × newIndex (somme totale de la réserve)
  // Cas activation initiale (0 → N>0) : snapshot du trading AVANT transfert
  if(prevIndex === 0 && newIndex > 0) {
    S._autoLevBase = S.tradingAccount || 0;
    const targetBorrow = S._autoLevBase * mult * newIndex;  // réserve entière = base × 10 × index
    if(targetBorrow > 0) {
      S.tradingAccount    += targetBorrow;
      S.leverageBorrowed  = (S.leverageBorrowed || 0) + targetBorrow;
      S._autoLevBorrowed  = targetBorrow;
      S.chainLog.push({
        icon:'⚡',
        desc:`Levier ×${newIndex} activé · ${fmt$2(targetBorrow)} transférés de la réserve vers trading (base ${fmt$2(S._autoLevBase)})`,
        hash:rndHash(), time:nowStr()
      });
    } else {
      S._autoLevBorrowed = 0;
      S.chainLog.push({
        icon:'⚡', desc:`Levier ×${newIndex} activé · trading à zéro, aucun transfert`,
        hash:rndHash(), time:nowStr()
      });
    }
    return { ok:true, action:'activate', borrowed:S._autoLevBorrowed };
  }

  // Cas ajustement (N>0 → M>0) : diff par rapport à la base initiale
  const base = S._autoLevBase || (S.tradingAccount || 0);
  if(!S._autoLevBase) S._autoLevBase = base;  // rattrapage si missing
  const targetBorrow = base * mult * newIndex;  // v7.6 · nouvelle formule
  const delta = targetBorrow - (S._autoLevBorrowed || 0);

  if(delta > 0) {
    // Monter d'un cran → transférer delta supplémentaire
    S.tradingAccount    += delta;
    S.leverageBorrowed  = (S.leverageBorrowed || 0) + delta;
    S._autoLevBorrowed  = (S._autoLevBorrowed || 0) + delta;
    S.chainLog.push({
      icon:'⬆', desc:`Levier ×${newIndex} (↑) · +${fmt$2(delta)} transférés (cumul ${fmt$2(S._autoLevBorrowed)})`,
      hash:rndHash(), time:nowStr()
    });
    return { ok:true, action:'increase', delta };
  }
  if(delta < 0) {
    // Descendre d'un cran → retirer |delta| du trading
    const toRepay = Math.abs(delta);
    const canRepay = Math.min(toRepay, S.tradingAccount || 0);
    S.tradingAccount   = Math.max(0, S.tradingAccount - canRepay);
    S.leverageBorrowed = Math.max(0, (S.leverageBorrowed || 0) - canRepay);
    S._autoLevBorrowed = Math.max(0, (S._autoLevBorrowed || 0) - canRepay);
    S.chainLog.push({
      icon:'⬇', desc:`Levier ×${newIndex} (↓) · ${fmt$2(canRepay)} retirés du trading (reste emprunté ${fmt$2(S._autoLevBorrowed)})`,
      hash:rndHash(), time:nowStr()
    });
    return { ok:true, action:'decrease', repaid:canRepay };
  }
  return { ok:true, action:'noop' };
}

// v7.6 · Fonction exposée pour que les bots puissent activer/désactiver le levier
// Usage: setLeverageByBot(nouvelIndex, 'raison optionnelle')
// Retour: { ok, action, prevIndex, newIndex, ...info }
function setLeverageByBot(newIndex, reason) {
  newIndex = Math.max(0, Math.min(S.leverageMaxMult || 10, Math.floor(newIndex || 0)));
  const prevIndex = S.leverage || 0;
  if(newIndex === prevIndex) return { ok:true, action:'noop', prevIndex, newIndex };
  
  // ═══ v7.12 · PROTECTION P6 · Bot ne peut pas créer de dette orpheline ═══
  // Même logique que P1 mais appliquée aux actions du bot
  if (newIndex < prevIndex) {
    const posWithLev = (S.openPositions || []).filter(p => (p.levBorrowed || 0) > 0);
    if (posWithLev.length > 0) {
      const totalLev = posWithLev.reduce((s, p) => s + (p.levBorrowed || 0), 0);
      if (newIndex === 0) {
        // Bot veut désactiver mais dette active → refuser
        S.chainLog.push({
          icon: '🛑',
          desc: `Bot bloqué · désactivation levier refusée · ${posWithLev.length} position(s) avec $${totalLev.toFixed(0)} empruntés`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return { ok:false, action:'blocked_by_P6', prevIndex, newIndex, reason:'positions_with_leverage' };
      }
      // Baisse partielle → vérifier la faisabilité
      const mult = S.leverageMaxMult || 10;
      const base = S._autoLevBase || (S.tradingAccount || 0);
      const targetBorrow = base * mult * newIndex;
      const needsRepay = (S._autoLevBorrowed || 0) - targetBorrow;
      if (needsRepay > 0 && needsRepay > (S.tradingAccount || 0)) {
        S.chainLog.push({
          icon: '⚠',
          desc: `Bot bloqué · baisse levier ×${prevIndex}→×${newIndex} · trading insuffisant pour $${needsRepay.toFixed(0)}`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return { ok:false, action:'blocked_by_P6', prevIndex, newIndex, reason:'trading_insufficient' };
      }
    }
  }
  
  const result = applyAutoLeverageBorrow(newIndex, prevIndex);
  S.leverage = newIndex;
  if(typeof syncLeverageReserve === 'function') syncLeverageReserve();
  // Log bot-initiated
  S.chainLog.push({
    icon:'🤖',
    desc:`Bot: levier ${prevIndex} → ${newIndex}${reason?' ('+reason+')':''}`,
    hash:rndHash(), time:nowStr()
  });
  // Refresh UI if on home
  try {
    const el = document.getElementById('leverageDisp');
    if(el) el.textContent = '×'+newIndex;
    const lrvEl = document.getElementById('levReserveVal');
    if(lrvEl) lrvEl.textContent = fmt$(S.leverageReserve || 0);
    if(typeof renderHome === 'function' && S.currentPage === 0) renderHome();
  } catch(e) {}
  return Object.assign({ prevIndex, newIndex }, result);
}
window.setLeverageByBot = setLeverageByBot;

// ── v7.2 PHASE 14c-revised · Emprunt juste-à-temps à l'ouverture d'un trade ──
// Spec utilisateur: "si en mode auto le bot applique levier et n'a pas assez de fond,
// la procédure est engagée; idem en mode manuel, idem en semi-auto."
// Le stepper ne déclenche plus d'emprunt — c'est CETTE fonction qui le fait, seulement
// quand un trade va s'ouvrir et que le trading disponible est insuffisant.
function ensureLeverageCoverForTrade(neededStake, pair) {
  neededStake = Math.max(0, neededStake || 0);
  if(neededStake <= 0) return { ok:true, action:'noop' };
  // Si trading suffit → rien à faire (emprunt n'est pas "nécessaire")
  const shortfall = neededStake - (S.tradingAccount || 0);
  if(shortfall <= 0) return { ok:true, action:'noop' };
  // Si levier désactivé → impossible de couvrir
  const index = S.leverage || 0;
  if(index < 1) return { ok:false, action:'disabled', shortfall, reason:'leverage_off' };
  // v7.2 Phase 14c-revised FIX: capacité max basée sur la BASE initiale (snapshot au 1er emprunt)
  // sinon après un trade qui vide trading, maxBorrow deviendrait ≤ 0 à cause du recalcul.
  // Si pas encore de base (1er emprunt), on prend le trading courant (qui sera figé en snapshot).
  const base = (S._autoLevBase && S._autoLevBase > 0) ? S._autoLevBase : (S.tradingAccount || 0);
  const maxBorrow = base * (S.leverageMaxMult || 10) * index - (S.leverageBorrowed || 0);
  if(maxBorrow <= 0) return { ok:false, action:'capped', shortfall, reason:'reserve_empty' };
  
  // ═══ v7.12 · PROTECTION P9 · Q1:D · Auto-stop emprunt si capacité > 95% ═══
  // Empêche de dépasser 95% de la capacité totale (garde-fou avant liquidation)
  const maxCapacityAbs = base * (S.leverageMaxMult || 10);  // capacité absolue (tous les niveaux confondus)
  const currentUsagePct = maxCapacityAbs > 0 ? ((S.leverageBorrowed || 0) / maxCapacityAbs) * 100 : 0;
  if (currentUsagePct >= 95) {
    // Log discret + toast (pas à chaque tentative, 1 fois sur 10)
    if (Math.random() < 0.1) {
      S.chainLog.push({
        icon: '🛑',
        desc: `P9 · Emprunt bloqué · capacité levier ${currentUsagePct.toFixed(0)}% (>95%) · risque liquidation`,
        hash: typeof rndHash==='function' ? rndHash() : '',
        time: typeof nowStr==='function' ? nowStr() : ''
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return { ok:false, action:'blocked_by_P9', shortfall, reason:'capacity_exceeded', currentUsagePct };
  }
  
  // Emprunter ce qu'il faut pour couvrir le shortfall, capé par la réserve disponible
  const actualBorrow = Math.min(shortfall, maxBorrow);
  // Snapshot base si 1ère activation effective (cohérent avec applyAutoLeverageBorrow)
  if(!S._autoLevBase || S._autoLevBase <= 0) S._autoLevBase = S.tradingAccount || 0;
  S.tradingAccount    = (S.tradingAccount || 0) + actualBorrow;
  S.leverageBorrowed  = (S.leverageBorrowed || 0) + actualBorrow;
  S._autoLevBorrowed  = (S._autoLevBorrowed || 0) + actualBorrow;
  // v7.12 · P7 · Track l'emprunt pour le lier à la position à la prochaine ouverture
  S._pendingPositionBorrow = (S._pendingPositionBorrow || 0) + actualBorrow;
  S.chainLog.push({
    icon:'⚡',
    desc:`Emprunt auto (levier ×${index}) · +${fmt$2(actualBorrow)} pour trade ${pair||''} (besoin ${fmt$2(neededStake)})`,
    hash: typeof rndHash==='function' ? rndHash() : '',
    time: typeof nowStr==='function' ? nowStr() : ''
  });
  return { ok:true, action:'borrow', borrowed:actualBorrow, coveredShortfall: actualBorrow >= shortfall };
}

// ============================================================
// DISTRIBUTION INTELLIGENTE DES MISES — Kelly fractionnel
// + Levier conditionnel selon conviction
// ============================================================
function estimateStakes() {
  const pairs   = Object.keys(S.pairStates);
  const trading = Math.max(10, S.tradingAccount);  // v6.8: min $10 pour démarrer
  // REGLE ABSOLUE : le bot n\'utilise JAMAIS cashAccount

  // 1. Signaux LMSR par paire
  const signals = pairs.map(pair => {
    const ps   = S.pairStates[pair];
    const prob = lmsrP(ps);
    const conviction = Math.abs(prob - 0.5) * 2;
    return { pair, ps, prob, conviction };
  });

  // 2. Score total pour ponderation proportionnelle
  const totalConv = signals.reduce((s,sg) => s + Math.max(0.1, sg.conviction), 0);

  // 3. Budget bot : max 80% du tradingAccount
  const botBudget  = trading * 0.80;
  const maxPerPair = trading * 0.30;

  // 4. Levier disponible (reserve - emprunte)
  const levAvailable = Math.max(0, S.leverageReserve);

  // v7.6 · Seuil d'engagement : seules les paires avec conviction suffisante reçoivent une mise.
  // Les autres sont mises à 0 (pas de pré-allocation d'argent sur des paires non ciblées).
  const ENGAGE_THRESHOLD = 0.22;  // conviction minimum pour que le bot mette de l'argent

  signals.forEach(sg => {
    if(!sg.ps) return;
    if(sg.ps.userStake) return;

    // v7.6 · Si le bot n'a pas d'intention claire sur cette paire ET pas de position ouverte → stake 0
    const hasOpenPos = S.openPositions.some(p => p.pair === sg.pair);
    if(sg.conviction < ENGAGE_THRESHOLD && !hasOpenPos) {
      sg.ps.stake = 0;
      sg.ps._leverageBonus = 0;
      return;
    }

    const weight    = Math.max(0.1, sg.conviction) / totalConv;
    const baseStake = botBudget * weight;
    let   kelly     = Math.min(maxPerPair, Math.max(10, baseStake));

    // v7.1 PHASE 5 · Cap proactif selon règle utilisateur (sinon validateTotalExposure rejetterait)
    try {
      const _p5 = validateInvestmentCapProvisioned(kelly);
      if(!_p5.ok && _p5.cap >= 10) {
        kelly = Math.max(10, _p5.cap);  // on respecte quand même le min 10
      } else if(!_p5.ok && _p5.cap < 10) {
        // Plafond sous le seuil minimum: on laisse tel quel, validateTotalExposure bloquera
      }
    } catch(e) {}

    // 5. Levier conditionnel : conviction > 60%, reserve dispo, emprunt < 3x trading
    // ═══ v7.12 · PROTECTION P11 · Pas de bonus levier si levier désactivé (×0) ═══
    let leverageBonus = 0;
    if(sg.conviction > 0.60 
       && (S.leverage || 0) >= 1   // ← P11 · garde-fou levier actif
       && levAvailable > 100 
       && S.leverageBorrowed < trading * 3) {
      const maxBorrow  = Math.min(levAvailable * 0.25, kelly * 2, trading);
      leverageBonus    = maxBorrow * (sg.conviction - 0.60) / 0.40;
      leverageBonus    = Math.round(leverageBonus / 10) * 10;
    }

    sg.ps.stake          = Math.max(10, Math.round(kelly / 10) * 10);
    sg.ps._leverageBonus = leverageBonus;
  });
}

function borrowLeverage(amount, pair) {
  if(amount <= 0) return 0;
  // ═══ v7.12 · PROTECTION P10 · Pas d'emprunt si levier désactivé ═══
  // Sans ça, le bot pouvait emprunter des "bonus" depuis leverageReserve
  // même quand l'utilisateur avait mis levier à ×0 → dette orpheline.
  if((S.leverage || 0) === 0) {
    if (Math.random() < 0.05) {  // log discret
      S.chainLog.push({
        icon: '🛑',
        desc: `P10 · Emprunt bloqué pour ${pair} · levier ×0 (désactivé)`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    }
    return 0;
  }
  const available = Math.min(S.leverageReserve, amount);
  if(available < 10) return 0;
  S.leverageReserve  -= available;
  S.leverageBorrowed += available;
  // v7.12 · P10 · Tracker aussi dans _autoLevBorrowed pour que P4/P5 le voient
  S._autoLevBorrowed = (S._autoLevBorrowed || 0) + available;
  S.chainLog.push({
    icon:'\u26A1',
    desc:`Levier emprunte +${fmt$(available)} pour ${pair} - Taux: ${(S.leverageBorrowRate*100).toFixed(3)}%/cycle`,
    hash:rndHash(), time:nowStr()
  });
  return available;
}

function repayLeverage(amount) {
  if(amount <= 0) return;
  const repaid = Math.min(S.leverageBorrowed, amount);
  S.leverageBorrowed  = Math.max(0, S.leverageBorrowed - repaid);
  S.leverageReserve  += repaid;
  const maxReserve = S.tradingAccount * S.leverageMaxMult;
  S.leverageReserve = Math.min(maxReserve, S.leverageReserve);
}

// ── v7.1 PHASE 3 · Restitution du levier au moment d'un transfert trading→caisse ──
// Spec utilisateur: "restituer la somme empruntée au compte levier / index levier défaut x1
// à chaque recommencement du processus / réévaluer réserve sur trading disponible"
// Conservateur: ne rembourse que le levier LIBRE (non engagé dans des positions ouvertes).
// Les positions ouvertes gardent leur pos.levBorrowed jusqu'à leur clôture naturelle.
function restoreLeverageAtCashout() {
  const committed = (S.openPositions || []).reduce((s,p) => s + (p.levBorrowed || 0), 0);
  const free      = Math.max(0, (S.leverageBorrowed || 0) - committed);
  if(free > 0) {
    repayLeverage(free);
    S.chainLog.push({
      icon: '\u21A9',  // ↩
      desc: `Levier libre restitué: ${fmt$(free)} (engagé sur positions: ${fmt$(committed)})`,
      hash: rndHash(), time: nowStr()
    });
  }
  // v7.5 · Reset index levier à 0 (désactivé) au recommencement, conforme au défaut
  const _prevLev = S.leverage || 0;
  S.leverage = 0;
  if(typeof S.leverageMaxMult !== 'undefined') {
    // leverageMaxMult reste le plafond (10×), seul l'index actif revient à 1
  }
  // Réévaluer la réserve sur le trading disponible courant
  if(typeof syncLeverageReserve === 'function') syncLeverageReserve();
  return { freeRepaid: free, committed, prevLev: _prevLev };
}

function applyLeverageBorrowFees() {
  if(S.leverageBorrowed <= 0) return;
  const fee = S.leverageBorrowed * S.leverageBorrowRate;
  if(fee <= 0) return;
  S.tradingAccount    = Math.max(0, S.tradingAccount - fee);
  S.leverageTotalFees = (S.leverageTotalFees || 0) + fee;
  S.fees.totalFunding = (S.fees.totalFunding || 0) + fee;
  S.fees.totalGross   = (S.fees.totalGross   || 0) + fee;
  // v7.1 P2: intérêt levier → fiscalReserveAccount (dû au prêteur, mis en réserve comme les taxes)
  S.fiscalReserveAccount = (S.fiscalReserveAccount || 0) + fee;
  if(!S.fiscalReserveLog) S.fiscalReserveLog = [];
  S.fiscalReserveLog.unshift({
    amount: fee,
    source: 'leverage_interest',
    borrowed: S.leverageBorrowed,
    rate: S.leverageBorrowRate,
    ts: Date.now(),
    time: nowStr()
  });
  if(S.fiscalReserveLog.length > 200) S.fiscalReserveLog.pop();
  S.portfolio = S.cashAccount + S.tradingAccount;
}

// ============================================================
// MOTEUR DE FRAIS & TAXES
// ============================================================

// Appelé à chaque fermeture de position/trade. Calcule frais + provision fiscale.
function recordFees(pair, notionalUsdt, pnlUsd, tradeType) {
  const fc  = S.feeConfig;
  const tc  = S.taxConfig;
  const reg = tc.regions[tc.region];

  // Frais de trading (taker pour trades auto/market, maker pour limites)
  const tradingFee = notionalUsdt * (tradeType === 'maker' ? fc.makerRate : fc.takerRate);
  // Slippage estimé (aller + retour combiné)
  const slipFee    = notionalUsdt * fc.slippage;
  // Total frais du trade
  const totalFee   = tradingFee + slipFee;

  // Provision fiscale : sur le gain net après frais seulement
  const netGain    = pnlUsd - totalFee;
  const taxBase    = netGain > 0 ? netGain * reg.inclusion : 0;
  const taxAmount  = taxBase * reg.rate;

  // P&L net final (après frais + impôt estimé)
  const pnlNet = pnlUsd - totalFee - taxAmount;

  // Init par paire si nécessaire
  if(!S.fees.byPair[pair]) {
    S.fees.byPair[pair] = { tradingFees:0, slippage:0, gross:0,
                             tax:0, net:0, pnlGross:0, pnlNet:0, trades:0 };
  }

  // Accumulation globale
  S.fees.totalTradingFees  += tradingFee;
  S.fees.totalSlippage     += slipFee;
  S.fees.totalGross        += totalFee;
  S.fees.totalTaxProvision += taxAmount;
  S.fees.totalPnlGross     += pnlUsd;
  S.fees.totalPnlNet       += pnlNet;
  S.fees.tradeCount++;
  // ── v7.1 P2: feeReserveAccount = FRAIS D'ÉCHANGE uniquement (taker/maker + slippage) ──
  S.fees.feeReserveAccount += totalFee;
  // ── v7.1 P2: taxes dû au fisc → fiscalReserveAccount (compte séparé avec historique) ──
  if(taxAmount > 0) {
    S.fiscalReserveAccount = (S.fiscalReserveAccount || 0) + taxAmount;
    if(!S.fiscalReserveLog) S.fiscalReserveLog = [];
    S.fiscalReserveLog.unshift({
      amount: taxAmount,
      source: 'tax_trade_close',
      pair,
      pnlGross: pnlUsd,
      region: tc.region,
      ts: Date.now(),
      time: nowStr()
    });
    if(S.fiscalReserveLog.length > 200) S.fiscalReserveLog.pop();
  }

  // Accumulation par paire
  const bp  = S.fees.byPair[pair];
  bp.tradingFees += tradingFee;
  bp.slippage    += slipFee;
  bp.gross       += totalFee;
  bp.tax         += taxAmount;
  bp.pnlGross    += pnlUsd;
  bp.pnlNet      += pnlNet;
  bp.trades++;
  // Taux net effectif pour ce pair (P&L net / P&L brut)
  bp.netPct = bp.pnlGross !== 0 ? (bp.pnlNet / Math.abs(bp.pnlGross) * 100) : 0;

  // Log (max 50 entrées)
  const cfg = PAIRS[pair] || {};
  S.fees.feeLog.unshift({
    pair,
    sym:        cfg.sym || pair,
    notional:   notionalUsdt,
    tradingFee, slipFee, totalFee, taxAmount,
    pnlGross:   pnlUsd,
    pnlNet,
    region:     tc.region,
    time:       nowStr()
  });
  if(S.fees.feeLog.length > 50) S.fees.feeLog.pop();

  // Déduire frais + taxes du portfolio (comptabilisation réaliste)
  S.portfolio      -= (totalFee + taxAmount);
  S.tradingAccount -= (totalFee + taxAmount);

  // Auto-persist to IndexedDB
  saveFeeRecord({ pair, notional: notionalUsdt, pnlGross: pnlUsd,
    tradingFee, slipFee, totalFee, taxAmount, pnlNet, time: nowStr(), cycle: S.cycle });
  return { tradingFee, slipFee, totalFee, taxAmount, pnlNet };
}

// Frais de financement sur positions ouvertes (appelé chaque cycle)
function applyFundingFees() {
  S.openPositions.forEach(pos => {
    const fundFee = (pos.stakeUsdt || 0) * S.feeConfig.fundingRate;
    if(fundFee <= 0) return;
    S.fees.totalFunding += fundFee;
    S.fees.totalGross   += fundFee;
    if(!S.fees.byPair[pos.pair]) S.fees.byPair[pos.pair] =
      { tradingFees:0, slippage:0, gross:0, tax:0, net:0, pnlGross:0, pnlNet:0, trades:0 };
    S.fees.byPair[pos.pair].gross += fundFee;
    S.portfolio      = Math.max(0, S.portfolio - fundFee);
    S.tradingAccount = Math.max(0, S.tradingAccount - fundFee);
  });
}

// Recalcul live de la provision fiscale totale (pour affichage)
function calcTaxProvision() {
  const reg     = S.taxConfig.regions[S.taxConfig.region];
  const netGain = Math.max(0, S.fees.totalPnlGross - S.fees.totalGross);
  return netGain * reg.inclusion * reg.rate;
}
let navBtns = document.querySelectorAll('.nav-btn');

function goPage(idx, tabEl, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  navBtns.forEach(n => n.classList.remove('active'));

  // v5 · stop brain network if leaving page 0
  if(S.currentPage === 0 && idx !== 0) {
    try { stopBrainAnim(); } catch(e) {}
  }
  document.getElementById('page' + idx).classList.add('active');

  if (navEl) navEl.classList.add('active');
  else document.getElementById('nav' + idx).classList.add('active');

  S.currentPage = idx;
  if(idx === 2) { setTimeout(()=>{ drawMobileChart(); drawMiniCharts(); renderAnalysis(); renderCorrMatrix();
    // v20 · Veille Marché
    try { if(typeof _initVeilleOnPageChange === 'function') _initVeilleOnPageChange(2); } catch(e) {}
  }, 50); }
  if(idx === 3) { setTimeout(()=>{
    // v6.5 FIX: always rebuild DAO page on navigate so T$ ranking + proposals show
    try { buildGovCards(); renderDAO(); } catch(e) {}
  }, 50); }
  if(idx === 5) { setTimeout(()=>{ renderFiscal('global'); }, 30); }
  if(idx === 0) { setTimeout(()=>{ 
    try { 
      buildPairPosButtons(); buildPairBricks(); buildActionBricks(); buildManBricks();
      updatePairBricks(); updateActionBricks(); updateManBricks();
      if (typeof _restoreAutoBarState === 'function') _restoreAutoBarState();
      if (typeof _updateAutoBarCounters === 'function') _updateAutoBarCounters();
      if (typeof _attachLongPressToBricks === 'function') setTimeout(_attachLongPressToBricks, 50); updatePairAnalysisPanels(); updateIntelBanner(); updateStreakBadge(); startBrainAnim(); updateMarketMood(); updateBotThoughts(); updateFiscalMini(); renderAnalyticsPanel(); if(typeof renderPendingActions === 'function') renderPendingActions(); } catch(e) { console.warn('page 0 render:', e); }
    if(typeof runBotFleet === 'function') { try { runBotFleet('tick'); } catch(e) { console.warn('fleet tick:', e); } }
    // v18 · Twin Live tick
    try { if(typeof tickTwinLive === 'function') tickTwinLive(); } catch(e) {}
  // v6.2 · Expire stale pending actions (older than 10 minutes)
  if(S.pendingActions && S.pendingActions.length > 0) {
    const now = Date.now();
    const before = S.pendingActions.length;
    S.pendingActions = S.pendingActions.filter(a => (now - (a.ts||0)) < 600000);
    if(S.pendingActions.length !== before && typeof renderPendingActions === 'function') {
      try { renderPendingActions(); } catch(e) {}
    }
  }
  }, 20); }
  if(idx === 1) { setTimeout(()=>{ renderAgentHeatmap(); }, 30); }
}

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
  const n = new Date();
  const _ce = document.getElementById('clockEl'); if(_ce) _ce.textContent =
    String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
}
setInterval(updateClock, 1000); updateClock();

// ════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 3 · COLLECTION DE BOUGIES EN ARRIÈRE-PLAN
// Connecte un WebSocket léger sur la paire principale (1ère de PAIRS)
// pour continuer à collecter les bougies même quand le modal est fermé.
// Quand le modal s'ouvre sur cette paire, le foreground WS prend le relais
// (le background WS reste actif mais ses trades sont ignorés pour cette paire).
// ════════════════════════════════════════════════════════════
// v7.12 LIVRAISON 4 · BG collector multi-paires
//   - Mode SIM : 1 WS sur la paire principale (passive collection)
//   - Mode REAL : 1 WS par paire active (alimente le bot trading)
let _bgCollectorWSMap = {};   // { 'BTC/USDT': WebSocket, ... }
let _bgCollectorRetryByPair = {};  // { 'BTC/USDT': delay }

// Legacy compat — gardés pour ne rien casser
let _bgCollectorWS = null;
let _bgCollectorPair = null;
let _bgCollectorRetryDelay = 1000;

function _openBgWs(pair) {
  const symbol = pair.replace('/','').toLowerCase();
  const url = 'wss://stream.binance.com:9443/ws/' + symbol + '@trade';
  let ws;
  try { ws = new WebSocket(url); } catch(e) { _scheduleBgRetryFor(pair); return; }
  ws._createdAt = Date.now();   // v7.12 LIVRAISON 10 · pour détecter WS fantômes
  _bgCollectorWSMap[pair] = ws;
  ws.onopen = () => { _bgCollectorRetryByPair[pair] = 1000; };
  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (!msg || !msg.p || !msg.T) return;
      const price = parseFloat(msg.p);
      if (!isFinite(price) || price <= 0) return;
      if (_realCandlesState && _realCandlesState.wsConnected && _realCandlesState.wsPair === pair) return;
      try { _aggregateRealPrice(pair, price, msg.T); } catch(e) {}
      try {
        const ps = (S && S.pairStates) ? S.pairStates[pair] : null;
        if (ps) ps.price = price;
      } catch(e) {}
    } catch(e) {}
  };
  ws.onerror = () => {};
  ws.onclose = () => {
    delete _bgCollectorWSMap[pair];
    _scheduleBgRetryFor(pair);
  };
}

function _scheduleBgRetryFor(pair) {
  const delay = _bgCollectorRetryByPair[pair] || 1000;
  setTimeout(() => {
    let stillNeed = false;
    if (S.tradingMode === 'real') {
      stillNeed = !!(S.realActivePairs && S.realActivePairs[pair]);
    } else if (S.tradingMode === 'paperReal') {
      stillNeed = !!(S.paperRealActivePairs && S.paperRealActivePairs[pair]);
    } else {
      try {
        const keys = Object.keys(PAIRS || {});
        stillNeed = (keys[0] === pair);
      } catch(e) {}
    }
    if (stillNeed) _openBgWs(pair);
  }, delay);
  _bgCollectorRetryByPair[pair] = Math.min(60000, delay * 2);
}

function _startBgCollector() {
  // Construire la liste des paires à surveiller
  let pairsToWatch = [];
  if (S.tradingMode === 'real') {
    pairsToWatch = Object.keys(S.realActivePairs || {}).filter(p => S.realActivePairs[p]);
  } else if (S.tradingMode === 'paperReal') {
    // v7.12 LIVRAISON 8 · WebSocket pour paires Réel aussi
    pairsToWatch = Object.keys(S.paperRealActivePairs || {}).filter(p => S.paperRealActivePairs[p]);
  }
  if (pairsToWatch.length === 0) {
    try {
      const keys = Object.keys(PAIRS || {});
      if (keys.length > 0) pairsToWatch = [keys[0]];
    } catch(e) {}
  }
  if (pairsToWatch.length === 0) return;

  // Fermer les WS qui ne servent plus
  Object.keys(_bgCollectorWSMap).forEach(p => {
    if (!pairsToWatch.includes(p)) {
      try { _bgCollectorWSMap[p].onclose = null; _bgCollectorWSMap[p].close(); } catch(e) {}
      delete _bgCollectorWSMap[p];
    }
  });
  // Ouvrir ceux qui manquent + bootstrap REST pour les paires pausées/nouvelles
  const _bgTf = (S.tradingMode === 'real') ? (S.realTimeframe || '15m') : (S.paperRealTimeframe || '15m');
  pairsToWatch.forEach(pair => {
    const _bgKs = (S.tradingMode === 'real')
      ? (S.realKillSwitch && S.realKillSwitch[pair])
      : (S.paperRealKillSwitch && S.paperRealKillSwitch[pair]);
    const _isStalePaused = _bgKs && _bgKs.paused && _bgKs.reason === 'Données obsolètes';
    if (!_bgCollectorWSMap[pair]) _openBgWs(pair);
    // v118 · Bootstrap REST si nouvelle paire OU pausée pour données périmées
    if (!_bgCollectorWSMap[pair] || _isStalePaused) {
      try { _fetchAndBootstrapRealCandles(pair, _bgTf); } catch(e) {}
    }
  });
  _bgCollectorPair = pairsToWatch[0];
}

function _stopBgCollector() {
  Object.keys(_bgCollectorWSMap).forEach(p => {
    try { _bgCollectorWSMap[p].onclose = null; _bgCollectorWSMap[p].close(); } catch(e) {}
  });
  _bgCollectorWSMap = {};
}

// v118 FIX · Bootstrap bougies via REST Binance
// Évite la détection "Données obsolètes" au démarrage quand les bougies sauvegardées sont anciennes.
// Fetch les 60 dernières bougies et réveille la paire si elle était pausée pour données périmées.
async function _fetchAndBootstrapRealCandles(pair, tf) {
  const ivMap = { '5m':'5m', '15m':'15m', '1h':'1h', '4h':'4h', '1j':'1d' };
  const binanceIv = ivMap[tf || '15m'] || '15m';
  const sym = pair.replace('/','');   // 'BTC/USDT' → 'BTCUSDT'
  const url = 'https://api.binance.com/api/v3/klines?symbol=' + sym + '&interval=' + binanceIv + '&limit=60';
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return;
    if (!S.realCandles) S.realCandles = {};
    if (!S.realCandles[pair]) S.realCandles[pair] = {};
    S.realCandles[pair][tf || '15m'] = data.map(k => ({
      ts: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]),
      l: parseFloat(k[3]), c: parseFloat(k[4]),
      v: parseFloat(k[5]), n: parseInt(k[8]) || 0
    }));
    // Réveiller la paire si pausée uniquement pour "Données obsolètes"
    const ks = S.realKillSwitch && S.realKillSwitch[pair];
    if (ks && ks.paused && ks.reason === 'Données obsolètes') {
      S.realKillSwitch[pair] = { paused:false, lossStreak: ks.lossStreak || 0, reason:'' };
    }
    const ksPr = S.paperRealKillSwitch && S.paperRealKillSwitch[pair];
    if (ksPr && ksPr.paused && ksPr.reason === 'Données obsolètes') {
      S.paperRealKillSwitch[pair] = { paused:false, lossStreak: ksPr.lossStreak || 0, reason:'' };
    }
    try { if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner(); } catch(e) {}
  } catch(e) {}
}
window._fetchAndBootstrapRealCandles = _fetchAndBootstrapRealCandles;

function _scheduleBgRetry() {
  setTimeout(_startBgCollector, _bgCollectorRetryDelay);
  _bgCollectorRetryDelay = Math.min(60000, _bgCollectorRetryDelay * 2);
}

// v7.12 LIVRAISON 10 · HEALTH CHECK ACTIF DES WEBSOCKETS DE FOND
// Vérifie toutes les 10 secondes que les WS sont en état OPEN (readyState=1)
// Si un WS est dans un autre état (CONNECTING=0, CLOSING=2, CLOSED=3) depuis trop
// longtemps, on le force à se reconnecter. Évite les WS "endormis" sur Android.
function _bgCollectorHealthCheck() {
  if (!_isRealLike()) return;  
  let pairsToWatch = [];
  if (S.tradingMode === 'real') {
    pairsToWatch = Object.keys(S.realActivePairs || {}).filter(p => S.realActivePairs[p]);
  } else if (S.tradingMode === 'paperReal') {
    pairsToWatch = Object.keys(S.paperRealActivePairs || {}).filter(p => S.paperRealActivePairs[p]);
  }
  if (pairsToWatch.length === 0) return;
  // v7.12 LIVRAISON 12 · Si aucun WS actif alors qu'on devrait en avoir, démarrer
  if (Object.keys(_bgCollectorWSMap || {}).length === 0) {
    try { _startBgCollector(); } catch(e) {}
    return;  // _startBgCollector va faire le travail, on revérifiera au prochain tick
  }
  let revived = 0;
  pairsToWatch.forEach(pair => {
    const ws = _bgCollectorWSMap[pair];
    // Cas 1 : pas de WS du tout pour cette paire → en créer un
    if (!ws) {
      _openBgWs(pair);
      revived++;
      return;
    }
    // Cas 2 : WS existe mais pas OPEN (peut être CONNECTING, CLOSING, CLOSED)
    // readyState : 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
    if (ws.readyState !== 1) {
      // Si en état CLOSED ou CLOSING, on le remplace
      if (ws.readyState === 2 || ws.readyState === 3) {
        try { ws.onclose = null; ws.close(); } catch(e) {}
        delete _bgCollectorWSMap[pair];
        _openBgWs(pair);
        revived++;
      }
      // Si en CONNECTING depuis plus de 15s, c'est probablement un fantôme
      // On enregistre le moment de création et on force la reconnexion
      else if (ws.readyState === 0) {
        const createdAt = ws._createdAt || 0;
        if (createdAt > 0 && (Date.now() - createdAt) > 15000) {
          try { ws.onclose = null; ws.close(); } catch(e) {}
          delete _bgCollectorWSMap[pair];
          _openBgWs(pair);
          revived++;
        }
      }
    }
  });
  if (revived > 0) {
    if (typeof showToast === 'function') {
      showToast('🔌 Reconnexion · ' + revived + ' WS Binance', 2000, 'info');
    }
  }
}
window._bgCollectorHealthCheck = _bgCollectorHealthCheck;
// v7.12 LIVRAISON 13 · Health check plus rapide (toutes les 5s)
setInterval(_bgCollectorHealthCheck, 5000);

// v7.12 LIVRAISON 13 · REFRESH PRÉVENTIF toutes les 30 minutes
// Ferme et recrée TOUS les WS pour éviter la dégradation lente
// (certains routeurs ou pare-feu coupent les connexions long-duration)
setInterval(function() {
  if (!_isRealLike()) return;
  try {
    const wsCount = Object.keys(_bgCollectorWSMap || {}).length;
    if (wsCount === 0) return;
    // Fermer tous les WS proprement
    Object.keys(_bgCollectorWSMap).forEach(p => {
      try { 
        _bgCollectorWSMap[p].onclose = null; 
        _bgCollectorWSMap[p].close(); 
      } catch(e) {}
    });
    _bgCollectorWSMap = {};
    // Redémarrer tout de suite
    setTimeout(function() { 
      try { _startBgCollector(); } catch(e) {} 
    }, 500);
    if (typeof showToast === 'function') {
      showToast('🔄 Refresh préventif WS Binance', 1500, 'info');
    }
  } catch(e) {}
}, 30 * 60 * 1000);  // 30 minutes

// v7.12 LIVRAISON 10 · Reconnexion immédiate quand l'utilisateur revient sur l'app
// (Android gèle souvent les WS quand l'écran s'éteint)
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    // Page revient visible : forcer un health check immédiat
    setTimeout(_bgCollectorHealthCheck, 500);
  }
});



// Démarrage différé pour laisser PAIRS s'initialiser ET loadState terminer
setTimeout(_startBgCollector, 3000);
// v7.12 LIVRAISON 12 · Re-tentative à 6s pour gérer le cas où loadState

setTimeout(function() {
  if (_isRealLike()) {
    try { _startBgCollector(); } catch(e) {}
  }
}, 6000);
// v7.12 LIVRAISON 12 · Re-tentative finale à 12s (sécurité)
setTimeout(function() {
  if (_isRealLike() && Object.keys(_bgCollectorWSMap || {}).length === 0) {
    try { _startBgCollector(); } catch(e) {}
  }
}, 12000);
window._startBgCollector = _startBgCollector;
window._stopBgCollector  = _stopBgCollector;

// ============================================================
// LMSR — per pair state
// ============================================================
function lmsrBuyYes(ps, delta) {
  const b=S.b, ey=Math.exp(ps.qYes/b), en=Math.exp(ps.qNo/b), ey2=Math.exp((ps.qYes+delta)/b);
  const cost=b*Math.log(ey2+en)-b*Math.log(ey+en);
  ps.qYes+=delta; return cost;
}
function lmsrBuyNo(ps, delta) {
  const b=S.b, ey=Math.exp(ps.qYes/b), en=Math.exp(ps.qNo/b), en2=Math.exp((ps.qNo+delta)/b);
  const cost=b*Math.log(ey+en2)-b*Math.log(ey+en);
  ps.qNo+=delta; return cost;
}

// old genCandles stub (kept for safety — not used)
function genCandles(n){ return genCandlesFor(67000,400,n); }

// v8.0 LIVRAISON 30 · FIX #1 · Seed pnlHistory supprimé
// L'ancien seed injectait 40 valeurs random ~490000 qui polluaient le calcul
// du Sharpe et du drawdown. Maintenant pnlHistory commence vide et se remplit
// avec les vraies valeurs au fur et à mesure des trades.
// Sharpe affichera '—' tant qu'il n'y a pas 15 valeurs réelles (cf. ligne 22794).
// loadState() restaure pnlHistory depuis le snapshot si disponible.

// ============================================================
// SPARKLINE CHART
// ============================================================
function drawSparkline() {
  const canvas = document.getElementById('sparkline');
  if(!canvas) return;
  const parent = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const cW = parent?.offsetWidth || 360;
  const cH = 36;
  canvas.width  = cW * dpr;
  canvas.height = cH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = cW, H = cH;
  const data = S.pnlHistory;
  if(data.length < 2) { ctx.clearRect(0,0,W,H); return; }

  const mn = Math.min(...data), mx = Math.max(...data), rng = mx-mn||1;
  const pts = data.map((v,i)=>({ x:(i/(data.length-1))*W, y:H-((v-mn)/rng)*(H-8)-4 }));

  const isUp = pts[pts.length-1].y <= pts[0].y;
  const lineColor = isUp ? '#00e87a' : '#ff3d6b';

  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, isUp ? 'rgba(0,232,122,.18)' : 'rgba(255,61,107,.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  // Smooth bezier fill
  ctx.beginPath(); ctx.moveTo(0,H);
  ctx.lineTo(pts[0].x, pts[0].y);
  for(let i=1;i<pts.length;i++){
    const cx=(pts[i-1].x+pts[i].x)/2;
    ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);
  }
  ctx.lineTo(W,H); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();

  // Smooth bezier line
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++){
    const cx=(pts[i-1].x+pts[i].x)/2;
    ctx.bezierCurveTo(cx,pts[i-1].y,cx,pts[i].y,pts[i].x,pts[i].y);
  }
  ctx.strokeStyle=lineColor; ctx.lineWidth=1.5; ctx.stroke();

  // Last point dot
  const last = pts[pts.length-1];
  ctx.beginPath(); ctx.arc(last.x,last.y,2.5,0,Math.PI*2);
  ctx.fillStyle=lineColor; ctx.fill();
}

// ============================================================
// MOBILE MAIN CHART (Candles) — multi-pair
// ============================================================
function drawMobileChart() {
  const canvas = document.getElementById('mobileChart');
  if(!canvas) return;
  const W = canvas.parentElement?.offsetWidth || 360; const H = 210;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const ps  = AP();
  const cfg = ACFG();
  const data = ps.candles;
  if(!data || data.length < 2) return;  // v6.8: guard — no crash on empty candles

  // v6.5 FIX: always sync mktPrice with live ps.price (was showing stale startPrice)
  const mktEl = document.getElementById('mktPrice');
  if(mktEl && ps.price > 0) {
    mktEl.textContent = cfg.dec >= 4 ? '$' + ps.price.toFixed(cfg.dec) : '$' + Math.floor(ps.price).toLocaleString();
    mktEl.style.color = cfg.color;
  }

  if(!data.length) return;

  const mn=Math.min(...data.map(c=>c.l)), mx=Math.max(...data.map(c=>c.h));
  const rng=mx-mn||1;
  const pad={t:10,b:24,l:4,r:62};

  function yy(p){ return pad.t+((mx-p)/rng)*(H-pad.t-pad.b); }

  ctx.clearRect(0,0,W,H);

  // Grid lines
  [0,.25,.5,.75,1].forEach(f=>{
    const y=pad.t+f*(H-pad.t-pad.b);
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y);
    ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.stroke();
    const priceVal = mx-(f*(mx-mn));
    const label = cfg.dec>=4 ? priceVal.toFixed(cfg.dec) : ('$'+Math.floor(priceVal).toLocaleString());
    ctx.fillStyle='rgba(136,153,187,.5)'; ctx.font='8px DM Mono';
    ctx.fillText(label, W-pad.r+4, y+3);
  });

  const cw=(W-pad.l-pad.r)/data.length;
  const bw=Math.max(2,cw*.65);

  data.forEach((c,i)=>{
    const x=pad.l+i*cw+cw/2;
    const up=c.c>=c.o;
    const col=up?'#00e87a':'#ff3d6b';
    ctx.beginPath(); ctx.moveTo(x,yy(c.h)); ctx.lineTo(x,yy(c.l));
    ctx.strokeStyle=col; ctx.lineWidth=1; ctx.stroke();
    const by=yy(Math.max(c.o,c.c)), bh=Math.max(1,yy(Math.min(c.o,c.c))-by);
    ctx.fillStyle=up?'rgba(0,232,122,.85)':'rgba(255,61,107,.85)';
    ctx.fillRect(x-bw/2,by,bw,bh);
  });

  // Current price line with pair accent color
  const curP = ps.price;
  const py=yy(curP);
  const hexColor = cfg.color;
  ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(pad.l,py); ctx.lineTo(W-pad.r,py);
  ctx.strokeStyle=hexColor+'66'; ctx.lineWidth=1; ctx.stroke();
  ctx.setLineDash([]);

  // Price tag
  ctx.fillStyle=hexColor+'22';
  ctx.fillRect(W-pad.r+2,py-8,58,16);
  ctx.fillStyle=hexColor;
  ctx.font='bold 9px DM Mono';
  const priceTag = cfg.dec>=4 ? curP.toFixed(cfg.dec) : ('$'+Math.floor(curP).toLocaleString());
  ctx.fillText(priceTag, W-pad.r+5, py+3);

  // Label bottom
  ctx.fillStyle='rgba(136,153,187,.4)'; ctx.font='8px DM Mono';
  ctx.fillText(S.activePair+' · '+S.tf, pad.l+4, H-6);
}

// ============================================================
// RENDERERS
// ============================================================
function fmt$(n){ return '$'+Math.floor(n).toLocaleString(); }

// ── v7.2 · Format USD avec 2 décimales (locale fr-FR pour virgule décimale) ──
// Utilisé pour les balances wallet où la précision centime compte (trading, caisse,
// réserves) — ces comptes accumulent fréquemment des fractions après intérêts/taxes.
function fmt$2(n){
  return '$' + (n||0).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// ── v7.1 PHASE 1 · Affichage portefeuille en EUR + live rate fetch ──
function fmtEUR(n){
  return (Math.round((n||0)*100)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €';
}
function computePortfolioTotal(){
  // v7.5 · Formule mise à jour: (caisse + trading + réserve fiscale) × USD/EUR
  // Le levier emprunté reste exclu (c'est une dette, pas un actif).
  const baseUSD = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  S.portfolioTotal = baseUSD * (S.usdEurRate || 0.92);
  return S.portfolioTotal;
}

// ── v7.2 PHASE 15 · Santé du solde trading vs dettes dues au fisc ──
// Spec utilisateur:
//   100-35% = vert stable (sain)
//   34-15%  = orange clignotant (attention)
//   14-1%   = rouge clignotant (critique)
//   0%      = rouge stable + "SEUIL À DÉCOUVERT ATTEINT"
// Ratio = tradingAccount / (taxes provisionnées + intérêts levier dus)
// Si dettes nulles ou négligeables → état "healthy" par défaut (on n'inquiète pas l'utilisateur
// quand il n'y a rien à devoir).
function computeTradingHealth() {
  const trading = S.tradingAccount || 0;
  // Dettes en attente de règlement:
  //   - provisions fiscales déjà calculées (S.fees.totalTaxProvision reflète le cumul des trades
  //     passés — mais déjà alloué à fiscalReserveAccount. Ici on utilise plutôt calcTaxProvision()
  //     qui donne les taxes DUES sur les positions encore ouvertes non clôturées).
  //   - intérêts levier à régler = leverageBorrowed × leverageBorrowRate (1 cycle futur)
  //     Approximation conservatrice: on prend les intérêts cumulés non encore transférés au fisc.
  //     leverageTotalFees est le cumul historique (déjà réglé). Donc la "dette courante" levier =
  
  let taxDue = 0;
  try {
    // calcTaxProvision donne la provision fiscale courante (impôt dû sur P&L brut cumulé).
    // On soustrait ce qui est déjà en réserve pour obtenir le manque.
    if(typeof calcTaxProvision === 'function') {
      const taxLive = calcTaxProvision();
      const taxAlreadyReserved = S.fiscalReserveAccount || 0;
      taxDue = Math.max(0, taxLive - taxAlreadyReserved);
    }
  } catch(e) {}
  const leverageInterestDue = (S.leverageBorrowed || 0) * (S.leverageBorrowRate || 0);
  const totalDue = taxDue + leverageInterestDue;

  // Pas de dette significative → état sain par défaut
  if(totalDue < 0.01) {
    return { state: 'healthy', ratio: 1, trading, totalDue, taxDue, leverageInterestDue,
             pct: 100, label: 'Aucune dette fisc./levier' };
  }

  // Ratio = capacité de couverture. >= 1 signifie "trading couvre 100%+"
  const ratio = trading / totalDue;
  const pct = Math.round(ratio * 100);

  if(trading <= 0 || ratio <= 0) {
    return { state: 'breached', ratio, trading, totalDue, taxDue, leverageInterestDue,
             pct: 0, label: 'SEUIL À DÉCOUVERT ATTEINT' };
  }
  if(pct >= 35) {
    return { state: 'healthy', ratio, trading, totalDue, taxDue, leverageInterestDue,
             pct: Math.min(999, pct), label: `Couvre ${pct}% des dettes` };
  }
  if(pct >= 15) {
    return { state: 'warn', ratio, trading, totalDue, taxDue, leverageInterestDue,
             pct, label: `Attention · ${pct}% dettes` };
  }
  // 1-14%
  return { state: 'critical', ratio, trading, totalDue, taxDue, leverageInterestDue,
           pct, label: `Critique · ${pct}% dettes` };
}

// ── v7.2 PHASE 16a · MARGIN-CALL automatique au seuil à découvert ──
// Spec: "0% → clôturer le ou les trades, témoins lumineux rouge stables"
// Déclenchée 1 seule fois par situation de découvert (flag S._marginCallFired) pour éviter
// les boucles. Se déverrouille quand le ratio remonte ≥ 15% (retour à zone warn ou mieux).
function triggerMarginCall(healthSnapshot) {
  if(S._marginCallFired) return { ok:true, action:'already_fired' };
  S._marginCallFired = true;

  const positionsClosed = [];
  const positionsCopy = [...(S.openPositions || [])];
  positionsCopy.forEach(pos => {
    try {
      if(typeof closePosition === 'function') {
        closePosition(pos.id, true);  // botClose=true (clôture automatique)
        positionsClosed.push(pos.id);
      }
    } catch(e) { console.warn('margin-call close:', e); }
  });

  // Transférer ce qui reste du trading vers fiscalReserveAccount (couvre au mieux les dettes)
  const remainingTrading = Math.max(0, S.tradingAccount || 0);
  const taxDue = healthSnapshot ? (healthSnapshot.taxDue || 0) : 0;
  const leverageDue = healthSnapshot ? (healthSnapshot.leverageInterestDue || 0) : 0;
  const totalToTransfer = Math.min(remainingTrading, taxDue + leverageDue);
  if(totalToTransfer > 0) {
    S.tradingAccount -= totalToTransfer;
    S.fiscalReserveAccount = (S.fiscalReserveAccount || 0) + totalToTransfer;
    if(!S.fiscalReserveLog) S.fiscalReserveLog = [];
    S.fiscalReserveLog.unshift({
      amount: totalToTransfer,
      source: 'margin_call',
      taxDue, leverageDue,
      ts: Date.now(),
      time: typeof nowStr==='function' ? nowStr() : ''
    });
    if(S.fiscalReserveLog.length > 200) S.fiscalReserveLog.pop();
  }

  // Désactiver levier pour éviter re-emprunt immédiat
  S.leverage = 0;
  S._autoLevBase = 0;
  // Note: _autoLevBorrowed et leverageBorrowed peuvent rester > 0 si positions n'ont pas
  // tout couvert — c'est une dette qui se réglera à la prochaine injection/restitution

  // Notification visuelle + log
  if(typeof showToast === 'function') {
    showToast(`🚨 MARGIN CALL · ${positionsClosed.length} position(s) fermée(s) · ${fmt$2(totalToTransfer)} transféré réserve fisc.`, 5000, 'critical');
  }
  if(S.chainLog) {
    S.chainLog.push({
      icon: '🚨',
      desc: `MARGIN CALL automatique · seuil à découvert · ${positionsClosed.length} positions fermées, ${fmt$2(totalToTransfer)} vers réserve fiscale · levier désactivé`,
      hash: typeof rndHash==='function' ? rndHash() : '',
      time: typeof nowStr==='function' ? nowStr() : ''
    });
  }

  return { ok:true, action:'fired', positionsClosed: positionsClosed.length, transferred: totalToTransfer };
}

// Déverrouillage automatique quand la situation se normalise
function clearMarginCallLockIfRecovered(healthSnapshot) {
  if(!S._marginCallFired) return;
  if(!healthSnapshot) return;
  // Re-permet un déclenchement futur si on est remonté au-dessus de la zone critique
  if(healthSnapshot.state === 'healthy' || healthSnapshot.state === 'warn') {
    S._marginCallFired = false;
  }
}
async function fetchUsdEurRate(){
  // API publique gratuite, sans clé. Si KO → on garde la dernière valeur connue.
  // v7.1 P9: remplit aussi S.fiatRates (multi-devises) d'un seul appel.
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    if(!r || !r.ok) return;
    const j = await r.json();
    const rates = j && j.rates;
    if(!rates) return;
    // USD→EUR pour affichage portefeuille (Phase 1)
    const eur = rates.EUR;
    if(typeof eur === 'number' && eur > 0.5 && eur < 1.5) {
      S.usdEurRate = eur;
      S._usdEurLastFetch = Date.now();
      computePortfolioTotal();
    }
    // v7.1 P9: mise à jour des autres fiats pour le modal de conversion
    ['EUR','GBP','CHF','CAD','AUD','JPY','CNY'].forEach(c => {
      const v = rates[c];
      if(typeof v === 'number' && v > 0.001 && v < 10000) {
        if(!S.fiatRates) S.fiatRates = {};
        S.fiatRates[c] = v;
      }
    });
  } catch(e) { /* silencieux — fallback à la dernière valeur connue */ }
}

// ── v7.1 PHASE 9 · Conversion Fiat → USDT (fonds propres réels injectés) ──
// Spec utilisateur: "les sommes convertie de tout types de Fiat en USDT sont indexées
// avec le cours et frais réels du moment réel d'échange déduit directement de la somme
// qu'on veut injecter."
// Formule: usdtNet = (fiatAmount / rate_fiat_per_USD) × (1 − fee%)
// Les fonds injectés sont exonérés d'impôt → tracés dans S.ownFundsInjected/Log (Phase 8).
function previewFiatToUSDT(fiatType, fiatAmount){
  if(!fiatType || !fiatAmount || fiatAmount <= 0) {
    return { ok:false, reason:'invalid_amount' };
  }
  const rate = (S.fiatRates||{})[fiatType];
  if(typeof rate !== 'number' || rate <= 0) {
    return { ok:false, reason:'no_rate', fiatType };
  }
  // rate = 1 USD → X fiat (ex: 1 USD = 0.92 EUR)
  // Donc: 1 fiat = (1/rate) USD, et ~1 USD ≈ 1 USDT
  const grossUSDT = fiatAmount / rate;
  const feePct    = Math.max(0, Math.min(0.05, S.fiatConvFeePct || 0.002));
  const fee       = grossUSDT * feePct;
  const netUSDT   = Math.max(0, grossUSDT - fee);
  return { ok:true, fiatType, fiatAmount, rate, grossUSDT, fee, feePct, netUSDT };
}

function injectFundsFromFiat(fiatType, fiatAmount){
  const p = previewFiatToUSDT(fiatType, fiatAmount);
  if(!p.ok) {
    if(typeof showToast === 'function') {
      showToast(p.reason === 'no_rate'
        ? `⚠ Taux ${fiatType} indisponible — relancer fetchFiatRates`
        : '⚠ Montant invalide', 2800, 'critical');
    }
    return { ok:false, reason:p.reason };
  }
  if(p.netUSDT <= 0) {
    if(typeof showToast === 'function') showToast('⚠ Montant net nul après frais', 2800, 'critical');
    return { ok:false, reason:'net_zero' };
  }
  // Injection dans cashAccount (fonds propres → caisse, pas trading)
  S.cashAccount   = (S.cashAccount   || 0) + p.netUSDT;
  S.portfolio     = S.cashAccount + S.tradingAccount;
  // Spec: ces sommes sont exonérées d'impôt → on trace dans ownFundsInjected
  S.ownFundsInjected = (S.ownFundsInjected || 0) + p.netUSDT;
  if(!S.ownFundsLog) S.ownFundsLog = [];
  S.ownFundsLog.unshift({
    amount:    p.netUSDT,
    fiatType:  p.fiatType,
    fiatAmount:p.fiatAmount,
    rate:      p.rate,
    fee:       p.fee,
    feePct:    p.feePct,
    ts:        Date.now(),
    time:      (typeof nowStr === 'function' ? nowStr() : new Date().toISOString())
  });
  if(S.ownFundsLog.length > 200) S.ownFundsLog.pop();
  // Recalcul portfolioTotal (Phase 1) pour que le hero hero display refresh
  if(typeof computePortfolioTotal === 'function') computePortfolioTotal();
  if(typeof syncLeverageReserve === 'function') syncLeverageReserve();
  // Log chaîne
  if(S.chainLog) {
    S.chainLog.push({
      icon:'💶',
      desc:`Injection ${p.fiatAmount.toFixed(2)} ${p.fiatType} → ${p.netUSDT.toFixed(2)} USDT (taux ${p.rate.toFixed(4)}, frais ${(p.feePct*100).toFixed(2)}%)`,
      hash: typeof rndHash==='function' ? rndHash() : Math.random().toString(36).slice(2),
      time: typeof nowStr==='function' ? nowStr() : new Date().toISOString()
    });
  }
  if(typeof showToast === 'function') {
    showToast(`✅ +${p.netUSDT.toFixed(2)} USDT (de ${p.fiatAmount} ${p.fiatType}) · exonéré`, 3200, 'user');
  }
  return { ok:true, injected: p.netUSDT, preview: p };
}

// Modal léger injecté dynamiquement (pas besoin de toucher le HTML body)
function openFiatInjectModal(){
  let modal = document.getElementById('fiatInjectModal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'fiatInjectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div style="background:#151922;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:20px;max-width:420px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.6);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:16px;font-weight:700;color:#fff;">💶 Injecter des fonds Fiat → USDT</div>
          <button onclick="closeFiatInjectModal()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;line-height:1;">⊗</button>
        </div>
        <div style="font-size:11px;color:#888;margin-bottom:14px;line-height:1.45;">
          Conversion avec taux live + frais réels (${(( S.fiatConvFeePct||0.002 )*100).toFixed(2)}%). Les fonds injectés alimentent la caisse et sont <span style="color:var(--up);">exonérés d'impôt</span>.
        </div>
        <label style="display:block;font-size:10px;color:#aaa;margin-bottom:4px;">Devise Fiat</label>
        <select id="fiatInjSelect" style="width:100%;background:#0f1319;border:1px solid rgba(255,255,255,.1);color:#fff;padding:10px;border-radius:8px;margin-bottom:12px;font-size:14px;">
          <option value="EUR">EUR · Euro</option>
          <option value="USD">USD · Dollar US</option>
          <option value="GBP">GBP · Livre sterling</option>
          <option value="CHF">CHF · Franc suisse</option>
          <option value="CAD">CAD · Dollar canadien</option>
          <option value="AUD">AUD · Dollar australien</option>
          <option value="JPY">JPY · Yen japonais</option>
          <option value="CNY">CNY · Yuan chinois</option>
        </select>
        <label style="display:block;font-size:10px;color:#aaa;margin-bottom:4px;">Montant à convertir</label>
        <input id="fiatInjAmount" type="number" min="1" step="0.01" placeholder="Ex: 100" style="width:100%;background:#0f1319;border:1px solid rgba(255,255,255,.1);color:#fff;padding:10px;border-radius:8px;margin-bottom:12px;font-size:14px;box-sizing:border-box;" oninput="refreshFiatInjectPreview()">
        <div id="fiatInjPreview" style="background:rgba(0,232,122,.05);border:1px solid rgba(0,232,122,.15);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:#ccc;min-height:40px;">
          Saisis un montant pour voir la conversion…
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="closeFiatInjectModal()" style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#ccc;padding:11px;border-radius:10px;cursor:pointer;font-size:13px;">Annuler</button>
          <button onclick="confirmFiatInject()" style="flex:1;background:linear-gradient(135deg,#00e87a,#00c866);border:none;color:#000;padding:11px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;">Injecter</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  // Rafraîchir taux live au passage (si pas fait depuis >2min)
  try {
    if(!S._usdEurLastFetch || (Date.now() - S._usdEurLastFetch) > 120000) fetchUsdEurRate();
  } catch(e) {}
  refreshFiatInjectPreview();
}
function closeFiatInjectModal(){
  const m = document.getElementById('fiatInjectModal');
  if(m) m.style.display = 'none';
}
function refreshFiatInjectPreview(){
  const sel = document.getElementById('fiatInjSelect');
  const amtEl = document.getElementById('fiatInjAmount');
  const prevEl = document.getElementById('fiatInjPreview');
  if(!sel || !amtEl || !prevEl) return;
  const fiatType = sel.value;
  const fiatAmount = parseFloat(amtEl.value) || 0;
  if(!fiatAmount) {
    prevEl.innerHTML = `<span style="color:#888;">Saisis un montant pour voir la conversion…</span>`;
    return;
  }
  // USD n'a pas de rate dans fiatRates (c'est la base) → traitement spécial
  let p;
  if(fiatType === 'USD') {
    const feePct = Math.max(0, Math.min(0.05, S.fiatConvFeePct || 0.002));
    const fee = fiatAmount * feePct;
    p = { ok:true, fiatType:'USD', fiatAmount, rate:1, grossUSDT:fiatAmount, fee, feePct, netUSDT:fiatAmount - fee };
  } else {
    p = previewFiatToUSDT(fiatType, fiatAmount);
  }
  if(!p.ok) {
    prevEl.innerHTML = `<span style="color:var(--down);">Taux ${fiatType} indisponible — lance fetchUsdEurRate().</span>`;
    return;
  }
  prevEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Taux live</span><span style="color:#fff;">1 USD = ${p.rate.toFixed(4)} ${p.fiatType}</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Brut</span><span style="color:#fff;">${p.grossUSDT.toFixed(4)} USDT</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Frais (${(p.feePct*100).toFixed(2)}%)</span><span style="color:var(--down);">−${p.fee.toFixed(4)} USDT</span></div>
    <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid rgba(255,255,255,.1);font-weight:700;"><span>Net injecté</span><span style="color:var(--up);">+${p.netUSDT.toFixed(4)} USDT</span></div>`;
}
function confirmFiatInject(){
  const sel = document.getElementById('fiatInjSelect');
  const amtEl = document.getElementById('fiatInjAmount');
  if(!sel || !amtEl) return;
  const fiatType = sel.value;
  const fiatAmount = parseFloat(amtEl.value) || 0;
  if(fiatAmount <= 0) { showToast('⚠ Montant invalide', 2800, 'critical'); return; }
  let result;
  if(fiatType === 'USD') {
    // USD direct (rate=1) — pas dans S.fiatRates, on injecte manuellement via preview
    const feePct = Math.max(0, Math.min(0.05, S.fiatConvFeePct || 0.002));
    const fee = fiatAmount * feePct;
    const netUSDT = fiatAmount - fee;
    if(netUSDT <= 0) { showToast('⚠ Montant net nul', 2800, 'critical'); return; }
    S.cashAccount = (S.cashAccount||0) + netUSDT;
    S.portfolio = S.cashAccount + S.tradingAccount;
    S.ownFundsInjected = (S.ownFundsInjected||0) + netUSDT;
    if(!S.ownFundsLog) S.ownFundsLog = [];
    S.ownFundsLog.unshift({ amount:netUSDT, fiatType:'USD', fiatAmount, rate:1, fee, feePct, ts:Date.now(), time:nowStr() });
    if(S.ownFundsLog.length > 200) S.ownFundsLog.pop();
    if(typeof computePortfolioTotal === 'function') computePortfolioTotal();
    if(typeof syncLeverageReserve === 'function') syncLeverageReserve();
    S.chainLog.push({ icon:'💶', desc:`Injection ${fiatAmount.toFixed(2)} USD → ${netUSDT.toFixed(2)} USDT (frais ${(feePct*100).toFixed(2)}%)`, hash:rndHash(), time:nowStr() });
    showToast(`✅ +${netUSDT.toFixed(2)} USDT (de ${fiatAmount} USD) · exonéré`, 3200, 'user');
    result = { ok:true };
  } else {
    result = injectFundsFromFiat(fiatType, fiatAmount);
  }
  if(result && result.ok) {
    closeFiatInjectModal();
    // Rafraîchir le hero + carte wallet
    try { if(typeof renderHomePrices === 'function') renderHomePrices(); } catch(e){}
    try { if(typeof renderHome === 'function') renderHome(); } catch(e){}
  }
}
function fmtPct(n){ return (n>=0?'+':'')+n.toFixed(2)+'%'; }
function nowStr(){ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0'); }
function rndHash(){ let h='0x'; for(let i=0;i<10;i++) h+='0123456789abcdef'[Math.floor(Math.random()*16)]; return h+'...'; }

// ============================================================
// OPEN POSITIONS — render
// ============================================================
function renderPositions() {
  // Les positions s'affichent inline sous chaque carte d'action (renderInlinePosForPair)
  // Cette fonction met à jour uniquement le compteur global
  const countEl = document.getElementById('posCount');

  // Update unrealised PnL + USDT value for all positions — sur exposition totale
  S.openPositions.forEach(pos => {
    const ps = S.pairStates[pos.pair];
    if(!ps) return;
    const exp     = pos.totalExposure || pos.stakeUsdt;
    pos.pnl       = pos.side==='long'
      ? ((ps.price - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - ps.price) / pos.entryPrice) * 100;
    pos.pnlUsdt   = exp * (pos.pnl/100);
    pos.currentVal= exp + pos.pnlUsdt;
  });

  if(countEl) countEl.textContent = S.openPositions.length + ' POSITIONS';
}

// v7.12 LIVRAISON 16 · Limite stake adaptative universelle (sizing CONTINU)
// v8.0 PHASE 6a · Décimation supplémentaire si corrélation détectée
function _checkPaperRealStakeLimit(stakeUsdt, pair, side) {
  if (S.tradingMode !== 'paperReal') return stakeUsdt;
  // v8.0 LIVRAISON 39 · FIX BUG S.b inexistant - utiliser portfolio
  const totalCapital = (S.portfolio || S.tradingAccount || 0);
  if (totalCapital <= 0) return stakeUsdt;
  let maxPct = 5.0;
  if (pair && typeof _getPairAdaptiveProfile === 'function') {
    const profile = _getPairAdaptiveProfile(pair);
    maxPct = profile.stakePct;
  } else {
    const cfg = S.paperRealConfig || {};
    maxPct = cfg.maxStakePct || 5.0;
  }
  const maxStake = totalCapital * maxPct / 100;
  let finalStake = Math.min(stakeUsdt, maxStake);
  
  // v8.0 PHASE 6a · Si corrélation forte avec position ouverte → réduire la mise
  if (pair && side && typeof _checkCorrelationLimit === 'function') {
    const corrCheck = _checkCorrelationLimit(pair, side);
    if (corrCheck && corrCheck.decimate < 1.0) {
      finalStake *= corrCheck.decimate;
    }
  }
  
  // v8.0 PHASE 6b · Modulation par Sharpe (alloc dynamique selon performance historique)
  if (pair && typeof _getSharpeAllocMult === 'function') {
    const sharpeMult = _getSharpeAllocMult(pair);
    if (sharpeMult !== 1.0) {
      finalStake *= sharpeMult;
    }
  }
  
  return finalStake;
}
window._checkPaperRealStakeLimit = _checkPaperRealStakeLimit;

function openPosition(pair, side) {
  // v7.12 LIVRAISON 13 · ANTI-CONTRE-TENDANCE en mode Réel
  // Refuse LONG en BEAR, SHORT en BULL pour éviter les pertes en marché défavorable
  if (S.tradingMode === 'paperReal') {
    const regime = S._paperRealCurrentRegime || (typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm');
    const isBear = regime === 'bear' || regime === 'volatile_bear';
    const isBull = regime === 'bull' || regime === 'volatile_bull';
    if (side === 'long' && isBear) {
      return;
    }
    if (side === 'short' && isBull) {
      return;
    }
    // v8.0 PHASE 3 · 2.3 · Refus de contextes systématiquement perdants
    if (typeof _checkContextAllowance === 'function') {
      const check = _checkContextAllowance(pair, side);
      if (!check.allow) {
        // Refus silencieux. Le contexte sera ré-évalué à chaque tick.
        return;
      }
    }
    
    // v8.0 PHASE 5 · 4.1 · Refus si pic de volatilité prévu
    const cfg5 = S.paperRealConfig || {};
    if (cfg5.volatilityForecastEnabled && cfg5.volatilityForecastBlockSpike && typeof _forecastVolatility === 'function') {
      const forecast = _forecastVolatility(pair);
      if (forecast && forecast.isSpike) {
        // Mémoriser pour panneau diagnostic
        if (!S.adaptiveState) S.adaptiveState = {};
        S.adaptiveState.lastVolForecast = {
          pair: pair,
          currentVol: forecast.longTermVolPct,
          forecastVol: forecast.forecastVolPct,
          ratio: forecast.ratio,
          blocked: true,
          ts: Date.now()
        };
        S.adaptiveState.volForecastBlocks = (S.adaptiveState.volForecastBlocks || 0) + 1;
        return; // refus silencieux
      }
    }
  }

  const ps  = S.pairStates[pair];
  const cfg = PAIRS[pair];
  if(!ps) return;

  // Max 1 position par paire — fermer l'existante d'abord
  const existing = S.openPositions.find(p => p.pair === pair);
  if(existing) {
    closePosition(existing.id);
    showToast('🔄 '+pair+' — position précédente fermée');
  }

  const id        = 'p'+Date.now().toString(36);
  const stakeUsdt = ps.stake || 10;
  const pairLev   = ps.pairLeverage || 1;

  // Levier manuel : emprunter la part leveragée de la réserve
  const leverageBonus = stakeUsdt * (pairLev - 1);
  const levBorrowed   = leverageBonus > 0 ? borrowLeverage(leverageBonus, pair) : 0;
  const totalExposure = stakeUsdt + levBorrowed;

  // ── Validation capital avant ouverture manuelle ──────────
  const capCheck = validateTotalExposure(stakeUsdt, levBorrowed);
  if(!capCheck.ok && capCheck.available < stakeUsdt * 0.5) {
    showToast('⚠ Capital max atteint · ' + fmt$(Math.max(0,capCheck.available)) + ' libre', 2800, 'critical');
    if(levBorrowed > 0) repayLeverage(levBorrowed);
    return;
  }

  // v7.2 Phase 14c-revised · Emprunt automatique JIT si levier ≥ 1 et trading insuffisant
  // S'applique en mode manuel, auto, et semi-auto (bot pré-remplit, user valide).
  let _jitBorrowedManual = 0;  // v7.12 · P7 · track JIT borrow for manual trade
  try {
    if((S.leverage || 0) >= 1 && stakeUsdt > (S.tradingAccount || 0)) {
      const r = ensureLeverageCoverForTrade(stakeUsdt, pair);
      if(!r.ok) {
        showToast('⚠ Trading insuffisant · levier ' + (r.reason==='leverage_off'?'désactivé':'réserve vide') + ' · '+fmt$2(r.shortfall)+' manquant', 3200, 'critical');
        if(levBorrowed > 0) repayLeverage(levBorrowed);
        return;
      }
      if (r.borrowed > 0) _jitBorrowedManual = r.borrowed;
    }
  } catch(e) { console.warn('auto-leverage cover:', e); }
  // v7.12 · P7 · Consommer le pending
  if (S._pendingPositionBorrow) {
    _jitBorrowedManual = Math.max(_jitBorrowedManual, S._pendingPositionBorrow);
    S._pendingPositionBorrow = 0;
  }

  // Déduire la mise propre du compte trading
  S.tradingAccount = Math.max(0, S.tradingAccount - stakeUsdt);
  S.portfolio      = S.cashAccount + S.tradingAccount;
  syncLeverageReserve();

  const amount  = (totalExposure / Math.max(0.0001, ps.price)).toFixed(cfg.dec>=4?4:6);
  const priceTag= cfg.dec>=4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();

  S.openPositions.push({
    id, pair, side,
    entryPrice:   ps.price, openedAt:Date.now(),
    amount:       parseFloat(amount),
    stakeUsdt,
    levBorrowed: (levBorrowed || 0) + _jitBorrowedManual,  // v7.12 · P7 · inclure JIT
    totalExposure,
    entryTime:    nowStr(),
    entryTs:      Date.now(),
    pnl:          0, pnlUsdt: 0,
    currentVal:   totalExposure,
    auto:         false,
    tp:           (typeof _calcBotTpSl === 'function' ? _calcBotTpSl(pair, side).tp : null),
    sl:           (typeof _calcBotTpSl === 'function' ? _calcBotTpSl(pair, side).sl : null),
    conviction:   lmsrP(ps),
    _peakPnl:     0,
    _openReason:  `Ouverture manuelle · LMSR ${(lmsrP(ps)*100).toFixed(0)}%`,
    _openAgents:  [...S.agents].filter(a => !a.isBot && !a.isMeta && Math.abs(a.score||0) > 0.1)
                    .sort((a,b) => Math.abs(b.score||0)*b.fitness - Math.abs(a.score||0)*a.fitness)
                    .slice(0,5)
                    .map(a => ({ emoji:a.emoji, name:a.name.split(' ')[0].split('·')[0].trim(), score:a.score||0 }))
  });

  ps.trades.push({
    side:          side === 'long' ? 'buy' : 'sell',
    type:          'open',
    amount:        String(amount),
    price:         ps.price,
    pnl:           0,
    stakeUsdt,
    levBorrowed,
    totalExposure,
    pnlUsdt:       null,
    ts:            Date.now(),
    time:          nowStr()
  });
  if(ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);

  const levStr = levBorrowed > 0 ? ` (×${pairLev} lev → $${totalExposure})` : '';
  S.chainLog.push({
    icon: side==='long'?'🟢':'🔴',
    desc: `Position ${side.toUpperCase()} ${pair} | $${stakeUsdt}${levStr} @${priceTag}`,
    hash: rndHash(), time: nowStr()
  });
  if(!existing) showToast('📈 '+side.toUpperCase()+' '+pair+' — $'+totalExposure+' USDT'+levStr);
  // v19 · #38 Notification trade ouvert
  try { if(typeof notifTradeOpen === 'function') notifTradeOpen(pair, side, totalExposure); } catch(e) {}
  updatePairBtnStates();
  renderPositions();
  if(S.currentPage===4) renderChain();
}

// botClose=true means called from bot — MUST NOT close manual positions
function closePosition(id, botClose = false) {
  // v8.0 LIVRAISON 37 · DIAGNOSTIC : log dans la console + toast pour comprendre
  console.log('[DIAGNOSTIC closePosition] Appelé avec id=' + id + ' botClose=' + botClose);
  
  // v7.12 · PACK RÉSILIENCE · sauvegarde avant fermeture
  try { if (typeof _p5PreActionSave === 'function') _p5PreActionSave('close'); } catch(e) {}

  const pos = S.openPositions.find(p=>p.id===id);
  if(!pos) {
    console.error('[DIAGNOSTIC closePosition] Position non trouvée pour id=' + id);
    if (typeof showToast === 'function') showToast('❌ Position introuvable: ' + id, 4000, 'critical');
    return;
  }
  
  console.log('[DIAGNOSTIC closePosition] Position trouvée: ' + pos.pair + ' ' + pos.side + ' stake=$' + pos.stakeUsdt);

  // ABSOLUTE RULE: bot cannot close a manual position
  if(botClose && pos.auto !== true) return;

  const ps  = S.pairStates[pos.pair];
  const cfg = PAIRS[pos.pair];
  const cur = ps ? ps.price : pos.entryPrice;
  
  // ═══ v7.12 · QUANTFURY B · Règle "liquidation nette" ═══
  // - Clamp : une perte ne peut JAMAIS dépasser -100% (impossible de devoir plus que la marge)
  // - Cap haut : +500% max (protège contre bugs de prix irréalistes)
  // - Coté USD : la perte USD est limitée au stake propre (pas de dette résiduelle)
  const rawPct = pos.side === 'long'
    ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
    : ((pos.entryPrice - cur) / pos.entryPrice) * 100;
  const realisedPct = Math.max(-100, Math.min(500, rawPct));
  if (rawPct < -100 || rawPct > 500) {
    console.warn('[closePosition] pct clamped (Quantfury B):', pos.pair, pos.side, 'raw:', rawPct.toFixed(1), '→', realisedPct.toFixed(1));
  }

  // PnL calculé sur l'exposition totale (stake propre + levier emprunté)
  const totalExp    = pos.totalExposure || pos.stakeUsdt;
  const rawUsd = totalExp * (realisedPct / 100);
  // Quantfury B · La perte USD ne peut JAMAIS dépasser le stake propre engagé
  // (si levier, le système "liquide" la position à -100% de la marge, pas plus)
  const realisedUsd = Math.max(-pos.stakeUsdt, rawUsd);

  // v7.12 LIVRAISON 8 · STATS + RÈGLES en mode Réel
  if (S.tradingMode === 'paperReal' && pos.auto === true) {
    if (!S.paperRealStats) S.paperRealStats = {};
    if (!S.paperRealStats[pos.pair]) {
      S.paperRealStats[pos.pair] = { wins:0, losses:0, pnlNet:0, trades:0, lastTrades:[], lastUpdate:0 };
    }
    const st = S.paperRealStats[pos.pair];
    st.trades += 1;
    st.pnlNet += realisedUsd;
    // v8.0 LIVRAISON 27 FIX · critère unifié > 0 (trade neutre = pas un win)
    if (realisedPct > 0) st.wins += 1; else st.losses += 1;
    st.lastTrades.push(realisedPct > 0 ? 1 : -1);
    if (st.lastTrades.length > 10) st.lastTrades.shift();
    st.lastUpdate = Date.now();

    // Règle : enregistrer dernière fermeture pour cooldown 30min (uniquement si perte)
    if (realisedPct < 0) {
      if (!S.paperRealLastClose) S.paperRealLastClose = {};
      S.paperRealLastClose[pos.pair] = Date.now();
    }

    // Règle : pertes consécutives globales (toutes paires) - ADAPTATIF (Phase 1.1)
    const cfg = S.paperRealConfig || {};
    let maxConsec;
    if (typeof _getAdaptiveConsecLossThreshold === 'function') {
      maxConsec = _getAdaptiveConsecLossThreshold();
    } else {
      maxConsec = cfg.maxConsecLosses || 3;
    }
    const globalPauseMs = cfg.globalPauseMs || 2 * 60 * 60 * 1000;
    if (realisedPct < 0) {
      S.paperRealConsecLosses = (S.paperRealConsecLosses || 0) + 1;
      if (S.paperRealConsecLosses >= maxConsec) {
        S.paperRealGlobalPauseUntil = Date.now() + globalPauseMs;
        const hours = Math.round(globalPauseMs / 3600000);
        try { showToast('🛑 Réel · ' + maxConsec + ' pertes · pause globale ' + hours + 'h', 6000, 'critical'); } catch(e) {}
        try { _updateRealModeBanner(); } catch(e) {}
      }
    } else {
      // Reset au moindre trade gagnant
      S.paperRealConsecLosses = 0;
    }
    
    // v8.0 PHASE 2 · Enrichir le contexte mémorisé avec le résultat du trade
    if (pos._contextId && typeof _enrichTradeContextOnClose === 'function') {
      try {
        const holdMs = (pos.openedAt) ? (Date.now() - pos.openedAt) : 0;
        _enrichTradeContextOnClose(pos._contextId, realisedPct, realisedUsd, holdMs);
      } catch(e) {}
    }
    
    // v8.0 PHASE 4a · A/B testing : enregistrer le résultat dans l'arm correspondant
    if (pos._abArm && typeof _abRecordResult === 'function') {
      try {
        _abRecordResult(pos._abArm, realisedPct, realisedUsd);
      } catch(e) {}
    }
  }

  // v7.12 LIVRAISON 6 · STATS PAR PAIRE en mode real (avant kill switch)
  if (S.tradingMode === 'real' && pos.auto === true) {
    if (!S.realStatsByPair) S.realStatsByPair = {};
    if (!S.realStatsByPair[pos.pair]) {
      S.realStatsByPair[pos.pair] = { wins:0, losses:0, pnlNet:0, trades:0, lastTrades:[], lastUpdate:0 };
    }
    const st = S.realStatsByPair[pos.pair];
    st.trades += 1;
    st.pnlNet += realisedUsd;
    // v8.0 LIVRAISON 27 FIX · critère unifié > 0 (trade neutre = pas un win)
    if (realisedPct > 0) st.wins += 1; else st.losses += 1;
    st.lastTrades.push(realisedPct > 0 ? 1 : -1);
    if (st.lastTrades.length > 10) st.lastTrades.shift();
    st.lastUpdate = Date.now();

    // v7.12 LIVRAISON 6 · AUTO-PAUSE sous-performance
    // Si 10 derniers trades dispos ET WR < 30% → pause auto cette paire
    if (st.lastTrades.length >= 10) {
      const recentWins = st.lastTrades.filter(v => v > 0).length;
      const recentWR = recentWins / 10;
      if (recentWR < 0.30) {
        if (!S.realKillSwitch) S.realKillSwitch = {};
        const ks = S.realKillSwitch[pos.pair] || { paused:false, lossStreak:0, reason:'' };
        if (!ks.paused) {
          ks.paused = true;
          ks.reason = 'WR<30% sur 10 derniers (' + recentWins + 'W)';
          S.realKillSwitch[pos.pair] = ks;
          try { showToast('🛑 Auto-pause · ' + pos.pair + ' · WR ' + (recentWR*100).toFixed(0) + '%', 5500, 'critical'); } catch(e) {}
          try { _updateRealModeBanner(); } catch(e) {}
        }
      }
    }
  }

  // v7.12 LIVRAISON 4 · KILL SWITCH en mode real
  // Si 3 pertes consécutives sur une paire (trades AUTO uniquement) → pause auto cette paire
  if (S.tradingMode === 'real' && pos.auto === true) {
    if (!S.realKillSwitch) S.realKillSwitch = {};
    if (!S.realKillSwitch[pos.pair]) S.realKillSwitch[pos.pair] = { paused:false, lossStreak:0, reason:'' };
    const ks = S.realKillSwitch[pos.pair];
    if (realisedPct < 0) {
      ks.lossStreak = (ks.lossStreak || 0) + 1;
      if (ks.lossStreak >= 3 && !ks.paused) {
        ks.paused = true;
        ks.reason = '3 pertes consécutives';
        try { showToast('🛑 Kill switch · ' + pos.pair + ' en pause auto (3 pertes)', 5500, 'critical'); } catch(e) {}
        try { _updateRealModeBanner(); } catch(e) {}
      }
    } else {
      ks.lossStreak = 0;   // reset au moindre trade gagnant
    }
  }

  if(ps) {
    // ── Enregistrer dans l'historique des trades de la paire ──
    const amount = pos.amount || (pos.stakeUsdt / Math.max(0.0001, pos.entryPrice)).toFixed(cfg.dec>=4?4:6);
    ps.trades.push({
      side:      pos.side === 'long' ? 'buy' : 'sell',
      type:      'position',
      amount:    String(amount),
      price:     cur,
      pnl:       realisedPct,
      stakeUsdt: pos.stakeUsdt,
      pnlUsdt:   realisedUsd,
      entryPrice: pos.entryPrice,
      ts:        Date.now(),
      time:      nowStr()
    });
    if(ps.trades.length > 100) ps.trades.splice(0, ps.trades.length - 100);
    ps.totalPnlPct += realisedPct;
    ps.totalPnlUsd += realisedUsd;
    ps.totalTrades++;
    if(realisedPct > 0) ps.winTrades++;
    
    // v7.12 MOD 5+ · Track loss streak + fenêtre glissante pour blacklist
    if (pos.auto === true) {
      if (!S._lossStreaks) S._lossStreaks = {};
      const streak = S._lossStreaks[pos.pair] || { 
        count: 0, pausedAt: 0,
        recentTrades: [],   // fenêtre glissante des 15 derniers résultats (true=win, false=loss)
        blacklistedUntil: 0 // timestamp fin de blacklist
      };
      
      // Fenêtre glissante des derniers résultats
      if (!streak.recentTrades) streak.recentTrades = [];
      streak.recentTrades.push(realisedPct > 0);
      if (streak.recentTrades.length > 15) streak.recentTrades.shift();
      
      // Streak classique
      if (realisedPct <= 0) {
        streak.count = (streak.count || 0) + 1;
        if (streak.count >= 3) {
          streak.pausedAt = Date.now();
          S.chainLog.push({
            icon: '⏸',
            desc: `Pause streak · ${pos.pair} · 3 pertes consécutives · pause 30min`,
            hash: rndHash(), time: nowStr()
          });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        }
      } else {
        streak.count = 0;
        streak.pausedAt = 0;
      }
      
      // v7.12 BLACKLIST DYNAMIQUE · si < 30% WR sur 10+ trades récents → blacklist 2h
      if (streak.recentTrades.length >= 10) {
        const wins = streak.recentTrades.filter(w => w).length;
        const wr = wins / streak.recentTrades.length;
        if (wr < 0.30 && streak.blacklistedUntil < Date.now()) {
          streak.blacklistedUntil = Date.now() + 2 * 60 * 60 * 1000;  // 2h
          S.chainLog.push({
            icon: '🚫',
            desc: `BLACKLIST · ${pos.pair} · ${wins}/${streak.recentTrades.length} gains (${Math.round(wr*100)}% WR) · pause 2h`,
            hash: rndHash(), time: nowStr()
          });
          if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
          if (typeof showToast === 'function') {
            showToast('🚫 ' + pos.pair + ' blacklisté (WR ' + Math.round(wr*100) + '%) · 2h', 4000, 'critical');
          }
        }
      }
      
      S._lossStreaks[pos.pair] = streak;
    }
    // Return original stake to trading account, then apply net P&L
    // 🔒 RÈGLE: on retourne au tradingAccount (jamais vers cashAccount)
    const totalExp  = pos.totalExposure || pos.stakeUsdt;
    const pnlOnExp  = totalExp * (realisedPct / 100);
    // P&L calculé sur l'exposition totale (stake + levier)
    const netPnl    = pnlOnExp;

    // Rembourser le levier emprunté AVANT de créditer le trading
    if(pos.levBorrowed && pos.levBorrowed > 0) {
      repayLeverage(pos.levBorrowed);
      // Les frais d'emprunt ont déjà été prélevés cycle par cycle
      // v7.12 · P8 · Rembourser aussi le tracking _autoLevBorrowed
      // (car pos.levBorrowed peut inclure du JIT borrow tracké dans _autoLevBorrowed)
      if ((S._autoLevBorrowed || 0) > 0) {
        const autoRepay = Math.min(pos.levBorrowed, S._autoLevBorrowed);
        S._autoLevBorrowed = Math.max(0, S._autoLevBorrowed - autoRepay);
      }
    }
    
    // ═══ v7.12 · PROTECTION P2 · Auto-remboursement dette orpheline ═══
    // Si levier = 0 ET dette orpheline > 0 ET trading vient d'être libéré,
    // rembourser automatiquement ce qu'on peut depuis trading.
    if ((S.leverage || 0) === 0 && (S._autoLevBorrowed || 0) > 0) {
      const availableForRepay = (S.tradingAccount || 0) + (pos.stakeUsdt || 0);  // inclut ce qu'on va restituer
      const toRepay = Math.min(S._autoLevBorrowed, availableForRepay);
      if (toRepay > 0) {
        // On va décrémenter trading après la restitution de stake plus bas
        // Ici on réserve le remboursement
        pos._p2RepayPending = toRepay;
      }
    }

    // Restituer la mise propre au tradingAccount (toujours)
    S.tradingAccount = Math.max(0, S.tradingAccount + pos.stakeUsdt);
    
    // ═══ v7.12 · PRIORITÉ 1 · SPLIT BÉNÉFICES (Option B — net d'impôts/taxes) ═══
    // Si trade gagnant : split du net (après frais + taxes)
    // Si trade perdant : perte absorbée par tradingAccount (comportement normal)
    if (netPnl > 0) {
      // Calcul frais + taxes pour déterminer le "vraiment net"
      const _feeConf = S.feeConfig || {};
      const _exitFee = pos.stakeUsdt * (_feeConf.takerRate || 0.001) + pos.stakeUsdt * (_feeConf.slippage || 0.0005);
      const _taxReg = S.taxConfig?.regions?.[S.taxConfig?.region];
      const _taxAmount = _taxReg ? (netPnl * (_taxReg.inclusion || 0) * (_taxReg.rate || 0)) : 0;
      const _trulyNet = Math.max(0, netPnl - _exitFee - _taxAmount);
      
      // Envoyer les taxes vers fiscalReserveAccount (option B — comptabilité propre)
      if (_taxAmount > 0) {
        S.fiscalReserveAccount = (S.fiscalReserveAccount || 0) + _taxAmount;
      }
      
      // Split du net restant
      const _splitPct = (typeof S.profitSplitCaissePct === 'number' ? S.profitSplitCaissePct : 30) / 100;
      const _toCaisse = _trulyNet * _splitPct;
      const _toTrading = _trulyNet - _toCaisse;
      
      // Appliquer les mouvements
      S.cashAccount = (S.cashAccount || 0) + _toCaisse;
      S.tradingAccount += _toTrading;
      
      // Log discret dans chainLog
      S.chainLog.push({
        icon: '💰',
        desc: `Bénéfice ${pos.pair} · Net +$${_trulyNet.toFixed(2)} · Caisse +$${_toCaisse.toFixed(2)} (${(_splitPct*100).toFixed(0)}%) · Trading +$${_toTrading.toFixed(2)}${_taxAmount > 0 ? ' · Taxes $'+_taxAmount.toFixed(2)+' → fiscal' : ''}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } else {
      // Trade perdant : tout reste dans tradingAccount (déjà fait via stakeUsdt, on ajoute le netPnl négatif)
      S.tradingAccount = Math.max(0, S.tradingAccount + netPnl);
    }
    
    S.portfolio      = S.cashAccount + S.tradingAccount;
    
    // ═══ v7.12 · PROTECTION P2 · Appliquer le remboursement dette orpheline ═══
    if (pos._p2RepayPending && pos._p2RepayPending > 0) {
      const repay = Math.min(pos._p2RepayPending, S.tradingAccount || 0, S._autoLevBorrowed || 0);
      if (repay > 0) {
        S.tradingAccount   = Math.max(0, (S.tradingAccount || 0) - repay);
        S.leverageBorrowed = Math.max(0, (S.leverageBorrowed || 0) - repay);
        S._autoLevBorrowed = Math.max(0, (S._autoLevBorrowed || 0) - repay);
        S.portfolio        = (S.cashAccount || 0) + (S.tradingAccount || 0);
        S.chainLog.push({
          icon: '↩',
          desc: `Auto-remboursement dette orpheline · $${repay.toFixed(2)} (reste $${(S._autoLevBorrowed||0).toFixed(2)})`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      delete pos._p2RepayPending;
    }
    
    syncLeverageReserve();  // recalculer la réserve disponible
    // Auto-compound: reinvest profits back into trading capital
    if(realisedUsd > 0 && pos.auto === true) {
      S._totalCompounded = (S._totalCompounded||0) + realisedUsd * 0.7;
    }
    // Track best/worst trade
    const tradeRecord = { pnl: realisedPct, pnlUsd: realisedUsd, price: cur, side: pos.side, time: nowStr() };
    if(!ps.bestTrade  || realisedPct > ps.bestTrade.pnl)   ps.bestTrade  = tradeRecord;
    if(!ps.worstTrade || realisedPct < ps.worstTrade.pnl)  ps.worstTrade = tradeRecord;
    // Update pnlHistory on every significant close
    S.pnlHistory.push(S.portfolio);
    if(S.pnlHistory.length > 80) S.pnlHistory.shift();
    // ── Frais de sortie uniquement (l'entrée a déjà été facturée à l'ouverture) ──
    // Maker si la position a été ouverte avec forte conviction, sinon taker
    const exitType = (pos.auto && realisedPct > 0.3) ? 'maker' : 'taker';
    recordFees(pos.pair, pos.stakeUsdt, realisedUsd, exitType);
    S.totalTrades = Object.values(S.pairStates).reduce((s,p)=>s+p.totalTrades,0);
    // v7.12 · PACK RÉSILIENCE · notifier export auto + snapshot silencieux
    try { if (typeof _notifyTradeForExport === 'function') _notifyTradeForExport(); } catch(e) {}
    try { if (typeof _autoSnapshotOnTradeClose === 'function') _autoSnapshotOnTradeClose(); } catch(e) {}
    recordTradeForHeatmap(realisedUsd, pos.pair); /* v5.3+v24 */
    /* v5.4 + v5.6 · post-close hooks (v6.0 · agent learning) */
    try {
      if(typeof recordShadowFromClose === 'function') recordShadowFromClose(realisedUsd, realisedPct, pos.pair, pos.side);
      if(typeof generateDreamEntry    === 'function') generateDreamEntry(pos.pair, pos.side, realisedPct, realisedUsd);
      // v19 · #38 Notification trade fermé
      try { if(typeof notifTradeClose === 'function') notifTradeClose(pos.pair, pos.side, realisedUsd, realisedPct); } catch(e) {}
      // v23 · #5 Vérifier alertes après chaque trade
      try { if(typeof checkPnlAlerts === 'function') checkPnlAlerts(); } catch(e) {}
      try { if(typeof checkBadges === 'function') checkBadges(); } catch(e) {}
      if(typeof closeDecisionCascade  === 'function') closeDecisionCascade(pos.pair, pos.side, pos.currentPrice || pos.entryPrice, realisedUsd, realisedPct);
      if(typeof runBotFleet           === 'function') runBotFleet('post_trade', { pnlUsd: realisedUsd });

      // v6.0 · AGENT LEARNING — update fitness of agents who voted for this direction
      if(pos._openAgents && S.agents) {
        const won = realisedUsd > 0;
        (pos._openAgents || []).forEach(openedBy => {
          const agent = S.agents.find(a => a.name && a.name.includes(openedBy.name));
          if(!agent) return;
          // Direction alignment: did this agent's score agree with the trade side?
          const agentBullish = (openedBy.score || 0) > 0;
          const tradeLong = pos.side === 'long';
          const aligned = agentBullish === tradeLong;
          // v34 · Multiplicateur apprentissage accéléré
          const _laMult = (_LA_MODES && window._LA_MODE && _LA_MODES[window._LA_MODE]) ? _LA_MODES[window._LA_MODE].mult : 1;
          if(aligned && won)      { agent.fitness = Math.min(2000, (agent.fitness || 500) + 5*_laMult); agent.corrections = (agent.corrections || 0) + 1; agent.streak = Math.max(0, (agent.streak || 0)) + 1; }
          else if(aligned && !won) { agent.fitness = Math.max(50, (agent.fitness || 500) - 3*_laMult); agent.errors = (agent.errors || 0) + 1; agent.streak = Math.min(0, (agent.streak || 0)) - 1; }
          else if(!aligned && !won){ agent.fitness = Math.min(2000, (agent.fitness || 500) + 2*_laMult); /* correct skeptic */ }
          else                    { agent.fitness = Math.max(50, (agent.fitness || 500) - 1*_laMult); }
          agent.lastPnl = realisedPct;
          // Store compact memory entry
          if(!agent.memory) agent.memory = [];
          agent.memory.push({ ts: Date.now(), pair: pos.pair, side: pos.side, pnl: realisedPct, aligned });
          if(agent.memory.length > 20) agent.memory.shift();
          agent.learningEvents = (agent.learningEvents || 0) + 1;
        });
      }
    } catch(e) { console.warn('post-close hooks:', e); }
    S.winTrades   = Object.values(S.pairStates).reduce((s,p)=>s+p.winTrades,0);
  }

  learnFromOutcome('position', realisedPct, pos.pair);

  S.openPositions = S.openPositions.filter(p=>p.id!==id);
  const pnlStr  = (realisedPct>=0?'+':'')+realisedPct.toFixed(2)+'%';
  const usdtStr = (realisedUsd>=0?'+':'−')+'$'+Math.abs(realisedUsd).toFixed(1);
  if(S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
  S.chainLog.push({
    icon: realisedPct>=0?'✅':'❌',
    desc: `Fermé ${pos.pair} ${pos.side.toUpperCase()} | ${pnlStr} (${usdtStr} USDT)`,
    hash: rndHash(), time: nowStr()
  });
  const levTag = pos.levBorrowed > 0 ? ` ⚡$${pos.levBorrowed}` : '';
  showToast('Fermé '+pos.pair+levTag+' · '+pnlStr+' · '+usdtStr);

  // ═══ v5.1 — Milestones & Particles ═══
  if(realisedPct >= 5.0) {
    // Big win: 🎉 celebration
    emitVictoryParticles(55);
    showMilestone('🎉', 'VICTOIRE · '+pos.pair+' +'+realisedPct.toFixed(1)+'% · '+usdtStr);
  } else if(realisedPct >= 2.0) {
    // Decent win: subtle particles
    emitVictoryParticles(22);
    showMilestone('💰', 'Gain '+pos.pair+' · '+pnlStr+' · '+usdtStr, false, 2400);
  } else if(realisedPct <= -5.0) {
    // Big loss: warning milestone
    emitLossParticles(15);
    showMilestone('⚠️', 'Perte '+pos.pair+' '+pnlStr+' · '+usdtStr, true, 3000);
  }
  updatePairBtnStates();
  renderPositions();
  if(S.currentPage===4) renderChain();
}

function quickOpen(side) {
  openPosition(S.activePair, side);
}

// Met à jour l'état des boutons LONG/SHORT pour refléter la position ouverte
// ══ v4.1 — Global AUTO/MAN toggle ══
function applyBotSuggestion(pair, side, stake) {
  // Apply bot suggestion as a manual position (respects MAN mode).
  // Uses openPosition() which is the manual path.
  const ps = S.pairStates[pair];
  if(!ps) { showToast('Paire introuvable'); return; }

  // Cap stake to free capital
  const cap = getCapitalSummary();
  const safeStake = Math.min(Math.floor(cap.free * 0.3), stake);
  if(safeStake < 5) { showToast('Capital libre insuffisant'); return; }

  // Haptic feedback if available
  try { navigator.vibrate && navigator.vibrate(12); } catch(e) {}

  // Use the pair's current stake setting for the manual open
  const _origStake = ps.stake;
  ps.stake = safeStake;
  try {
    openPosition(pair, side);
    showToast('✓ Suggestion appliquée · '+pair+' '+(side==='long'?'↑ LONG':'↓ SHORT')+' · $'+safeStake, 2800, 'user');
  } finally {
    ps.stake = _origStake;   // restore user's stake setting
  }
}

function setBotMode(isAuto) {
  const prev = S.botAutoMode;
  S.botAutoMode = !!isAuto;
  if(prev === S.botAutoMode) return;

  // Haptic feedback (mobile)
  try { navigator.vibrate && navigator.vibrate([8, 30, 8]); } catch(e) {}
  // v5 · mode switch tone
  playTone(isAuto ? 523 : 392, 140, 0.05, 'triangle');

  // Safety hint when switching with open bot positions
  const openBotPositions = S.openPositions.filter(p => p.auto === true).length;
  if(!isAuto && openBotPositions > 0) {
    setTimeout(() => {
      showToast('⚠ '+openBotPositions+' position(s) bot ouverte(s) · à vous de les fermer');
    }, 700);
  }

  // v8.0 LIVRAISON 40 · FIX BUG #1 : Utiliser modeToggleBtn (vrai élément) au lieu des IDs obsolètes
  const modeBtn = document.getElementById('modeToggleBtn');
  const modeLabel = document.getElementById('modeLabelText');
  if(modeBtn) {
    modeBtn.className = isAuto ? 'auto' : 'manual';
  }
  if(modeLabel) {
    modeLabel.textContent = isAuto ? 'AUTO' : 'MAN';
  }
  const chip = document.getElementById('heroModeChip');
  if(chip) {
    chip.className = 'mode-indicator-chip ' + (isAuto?'auto':'manual');
    chip.innerHTML = isAuto ? '🤖 AUTO' : '🎛️ MAN';
  }

  // Log to chain + toast
  const msg = isAuto
    ? '🤖 Mode AUTO activé · bot autorisé à trader'
    : '🎛️ Mode MANUEL activé · bot en observation · vos actions uniquement';
  showToast(msg);
  S.chainLog.push({ icon: isAuto?'🤖':'🎛️', desc: msg, hash: rndHash(), time: nowStr() });
  if(S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);

  // Refresh all action cards (they'll show dimmed in MAN mode)
  renderActionsGrid();
  updateIntelBanner();

  // Persist immediately (silent)
  try { typeof saveState === 'function' && saveState(true); } catch(e) {}
  // v6.3 · Sync header mode button
  try { if(typeof updateModeButton === 'function') updateModeButton(); } catch(e) {}
}

function updatePairBtnStates() {
  Object.keys(PAIRS).forEach(pair => {
    const pairKey = pair.replace('/','_');
    const pos     = S.openPositions.find(p => p.pair === pair);
    const ps      = S.pairStates[pair];
    const cfg     = PAIRS[pair];
    const lBtn    = document.querySelector(`#pcrow_${pairKey} .pair-pos-btn.long`);
    const sBtn    = document.querySelector(`#pcrow_${pairKey} .pair-pos-btn.short`);
    if(lBtn && sBtn) {
      if(pos && pos.side === 'long') {
        lBtn.classList.add('active-pos');
        sBtn.classList.remove('active-pos');
      } else if(pos && pos.side === 'short') {
        sBtn.classList.add('active-pos');
        lBtn.classList.remove('active-pos');
      } else {
        lBtn.classList.remove('active-pos');
        sBtn.classList.remove('active-pos');
      }
    }
    // Live price under pair name
    const pxe = document.getElementById('ppos_px_'+pairKey);
    if(pxe && ps && cfg) {
      const priceStr = cfg.dec >= 4 ? ps.price.toFixed(cfg.dec) : '$'+Math.floor(ps.price).toLocaleString();
      const posStr   = pos ? (pos.side === 'long' ? ' ↑ LONG' : ' ↓ SHORT') : '';
      pxe.textContent = priceStr + posStr;
      pxe.style.color = pos ? (pos.side === 'long' ? 'var(--up)' : 'var(--down)') : 'var(--t3)';
    }
  });
}

// ============================================================
// CYCLE TIME CONTROLS
// ============================================================
// Tranches de cycle : 10s 30s 1m 2m 5m 10m 15m 30m 1h 2h 4h 8h 1d 1w
const CYCLE_STEPS = [10,30,60,120,300,600,900,1800,3600,7200,14400,28800,86400,604800];

function fmtDur(sec) {
  sec = Math.abs(Math.round(sec));
  if(sec < 60)       return sec+'s';
  if(sec < 3600)     { const m=Math.floor(sec/60),s=sec%60; return s?m+'m'+s+'s':m+'m'; }
  if(sec < 86400)    { const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60); return m?h+'h'+m+'m':h+'h'; }
  if(sec < 604800)   return Math.floor(sec/86400)+'j';
  return Math.floor(sec/604800)+'sem';
}

// Countdown display with leading zeros for seconds
function fmtCountdown(sec) {
  sec = Math.max(0, Math.round(sec));
  if(sec < 60)  return sec+'s';
  if(sec < 3600){ const m=Math.floor(sec/60),s=sec%60; return m+'m'+(s<10?'0':'')+s+'s'; }
  const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);
  return h+'h'+(m<10?'0':'')+m+'m';
}

// Duration since a timestamp (for position hold time)
function fmtSince(ts) {
  if(!ts) return '—';
  const sec = Math.floor((Date.now() - ts) / 1000);
  return fmtDur(sec);
}

function _nextStep(cur, dir) {
  // Find closest tranche then move up/down
  let idx = 0;
  for(let i=0;i<CYCLE_STEPS.length;i++) { if(CYCLE_STEPS[i] >= cur) { idx=i; break; } idx=i; }
  const next = idx + dir;
  if(next < 0) return CYCLE_STEPS[0];
  if(next >= CYCLE_STEPS.length) return CYCLE_STEPS[CYCLE_STEPS.length-1];
  return CYCLE_STEPS[next];
}

// Reset a pair's cycle to bot auto-management
function resetCycleToAuto(pair) {
  const ps = S.pairStates[pair];
  if(!ps) return;
  ps.userCycleSet = false;
  const k = pair.replace('/','_');
  const autoLbl = document.getElementById('ac2_autoind_'+k);
  const freqEl  = document.getElementById('ac2_freq_'+k);
  if(autoLbl) { autoLbl.textContent = '\u{1F916} Auto'; autoLbl.style.color = 'var(--t3)'; }
  if(freqEl)  { freqEl.style.color = 'var(--pur)'; }
  showToast('\u{1F916} ' + pair + ' cycle \u2192 contr\u00f4le bot IA');
}

function changePairCycle(pair, dir) {
  // dir is +1 or -1 (step up/down through CYCLE_STEPS)
  const ps = S.pairStates[pair];
  if(!ps) return;
  const step = Math.sign(dir) || 1;
  ps.cycleMax      = _nextStep(ps.cycleMax, step);
  ps.cycleTimer    = Math.min(ps.cycleTimer, ps.cycleMax);
  ps.userCycleSet  = true;   // user took manual control — bot won't auto-adjust

  const pairKey = pair.replace('/','_');
  const el      = document.getElementById('pcycle_'+pairKey);
  if(el) el.textContent = fmtDur(ps.cycleMax);

  // Sync action card freq label + flash
  const freqEl = document.getElementById('ac2_freq_'+pairKey);
  if(freqEl) {
    freqEl.textContent = fmtDur(ps.cycleMax);
    freqEl.style.color = 'var(--ice)';
    freqEl.style.textShadow = '0 0 8px rgba(56,212,245,.6)';
    setTimeout(()=>{ if(freqEl){freqEl.style.textShadow='';} }, 800);
  }
  // Update manual/auto indicator
  const autoLbl = document.getElementById('ac2_autoind_'+pairKey);
  if(autoLbl) { autoLbl.textContent = '🔒 Manuel · tap auto'; autoLbl.style.color = 'var(--gold)'; }

  // Sync threshold bar label — threshold independent but show cycle next to it
  const thrLbl = document.getElementById('ac2_thrlbl_'+pairKey);
  if(thrLbl) thrLbl.textContent = ((ps.threshold||0.65)*100).toFixed(0)+'% · '+fmtDur(ps.cycleMax);

  showToast('⏱ '+pair+' cycle → '+fmtDur(ps.cycleMax));
}

// Global cycle display only — does NOT override per-pair cycles
function changeCycleTime(dir) {
  // Global reference cycle: step through tranches
  const step = Math.sign(dir) || 1;
  S.cycleMax = _nextStep(S.cycleMax, step);
  // Do NOT set S.cycleTimer or per-pair timers — purely display
  updateCycleDurLabel();
  showToast('Cycle référence → '+fmtDur(S.cycleMax));
}

// Global cycle display reference (no-op — element removed from home)
function updateCycleDurLabel() {}

// ============================================================
// LEVERAGE CONTROLS
// ============================================================
function changeLeverage(delta) {
  // v7.12 · PACK RÉSILIENCE · sauvegarde + snapshot avant changement levier
  try { if (typeof _p5PreActionSave === 'function') _p5PreActionSave('leverage'); } catch(e) {}
  try { if (typeof _autoSnapshotBeforeLeverage === 'function') _autoSnapshotBeforeLeverage(); } catch(e) {}
  // v7.6 · Le stepper transfère maintenant la réserve vers trading à chaque transition
  //   - 0 → N   : transfert initial (base × 10 × N)
  //   - N → M   : ajustement (transfert du delta)
  //   - N → 0   : remboursement complet
  const prevIndex = S.leverage || 0;
  const newIndex  = Math.max(0, Math.min(10, prevIndex + delta));
  if(newIndex === prevIndex) return;
  
  // ═══════════════════════════════════════════════════════════════
  // v7.12 · PROTECTION P1 : Bloquer la baisse du levier si positions avec emprunt
  // ═══════════════════════════════════════════════════════════════
  // Si on descend le levier ET qu'il y a des positions ouvertes avec levBorrowed > 0,
  // on BLOQUE l'action pour empêcher la création d'une dette orpheline.
  if (newIndex < prevIndex) {
    const posWithLev = (S.openPositions || []).filter(p => (p.levBorrowed || 0) > 0);
    if (posWithLev.length > 0) {
      const totalLev = posWithLev.reduce((s, p) => s + (p.levBorrowed || 0), 0);
      // Cas 1 : désactivation complète (N → 0) avec positions leveragées → BLOQUER
      if (newIndex === 0) {
        showToast('🛑 Impossible désactiver · ' + posWithLev.length + ' position(s) utilisent $' + totalLev.toFixed(0) + ' emprunté · fermez-les d\'abord', 5000, 'critical');
        S.chainLog.push({
          icon: '🛑',
          desc: `Désactivation levier bloquée · ${posWithLev.length} position(s) avec $${totalLev.toFixed(0)} empruntés`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;  // ← BLOQUE l'action
      }
      // Cas 2 : baisse partielle (N → M, M > 0) → calculer si trading suffit
      // Vérifier que le remboursement partiel ne va pas créer une dette orpheline
      const mult = S.leverageMaxMult || 10;
      const base = S._autoLevBase || (S.tradingAccount || 0);
      const targetBorrow = base * mult * newIndex;
      const needsRepay = (S._autoLevBorrowed || 0) - targetBorrow;
      if (needsRepay > 0 && needsRepay > (S.tradingAccount || 0)) {
        showToast('⚠ Baisse levier risquée · trading insuffisant ($' + (S.tradingAccount||0).toFixed(0) + ') pour rembourser $' + needsRepay.toFixed(0) + ' · fermez des positions', 5000, 'critical');
        S.chainLog.push({
          icon: '⚠',
          desc: `Baisse levier ×${prevIndex}→×${newIndex} bloquée · trading insuffisant pour remboursement ($${needsRepay.toFixed(0)})`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
        return;  // ← BLOQUE l'action
      }
    }
  }
  
  // Appliquer le transfert AVANT de mettre à jour S.leverage (la fonction compare les deux)
  try { applyAutoLeverageBorrow(newIndex, prevIndex); } catch(e) { console.warn('auto-lev:', e); }
  S.leverage = newIndex;
  const el = document.getElementById('leverageDisp');
  if(el) el.textContent = '×'+S.leverage;
  // Recalculer la réserve (disponible après emprunt)
  if(typeof syncLeverageReserve === 'function') syncLeverageReserve();
  // Sync portefeuille affiché
  S.portfolio = (S.cashAccount || 0) + (S.tradingAccount || 0);
  // Refresh UI levier
  if(typeof renderHome === 'function') { try { renderHome(); } catch(e){} }
  const lbl = S.leverage === 0
    ? 'désactivé'
    : `trading +${fmt$2(S._autoLevBorrowed||0)} (emprunté cumul ${fmt$2(S.leverageBorrowed||0)})`;
  showToast('Levier ×'+S.leverage+' · '+lbl, 2800, 'user');
}

// ============================================================
// TRANSFER MODAL
// ============================================================
let transferDir = 'cash2trade'; // 'cash2trade' | 'trade2cash'

function openTransferModal() {
  transferDir = 'cash2trade';
  updateTransferUI();
  document.getElementById('transferInput').value = '';
  // Update leverage info in modal
  const lrm  = document.getElementById('levReserveModalVal');
  const lbm  = document.getElementById('levBorrowedModalVal');
  if(lrm) lrm.textContent = fmt$(S.leverageReserve || 0);
  if(lbm) {
    lbm.textContent = fmt$(S.leverageBorrowed || 0);
    lbm.style.color = (S.leverageBorrowed||0) > 0 ? 'var(--down)' : 'var(--up)';
  }
  document.getElementById('transferModal').classList.add('show');
}

function closeTransfer() {
  document.getElementById('transferModal').classList.remove('show');
}

function swapTransfer() {
  transferDir = transferDir === 'cash2trade' ? 'trade2cash' : 'cash2trade';
  updateTransferUI();
}

function updateTransferUI() {
  const isCash2Trade = transferDir === 'cash2trade';
  document.getElementById('trFromLabel').textContent = isCash2Trade ? 'Caisse' : 'Trading';
  document.getElementById('trToLabel').textContent   = isCash2Trade ? 'Trading' : 'Caisse';
  document.getElementById('trFromVal').textContent   = fmt$2(isCash2Trade ? S.cashAccount : S.tradingAccount);
  document.getElementById('trToVal').textContent     = fmt$2(isCash2Trade ? S.tradingAccount : S.cashAccount);
  document.getElementById('transferSub').textContent = isCash2Trade ? 'Caisse → Trading' : 'Trading → Caisse';
}

function setTransferPct(pct) {
  const src = transferDir==='cash2trade' ? S.cashAccount : S.tradingAccount;
  document.getElementById('transferInput').value = Math.floor(src * pct/100);
}

function confirmTransfer() {
  const amount = parseFloat(document.getElementById('transferInput').value) || 0;
  if(amount <= 0) { showToast('⚠ Montant invalide', 2800, 'critical'); return; }

  if(transferDir === 'cash2trade') {
    if(amount > S.cashAccount) { showToast('⚠ Fonds insuffisants en caisse', 2800, 'critical'); return; }
    S.cashAccount    -= amount;
    S.tradingAccount += amount;
    // Recalculer la réserve de levier après injection de capital
    syncLeverageReserve();
    showToast('✅ +' + fmt$(amount) + ' → Trading · Levier mis à jour');
  } else {
    if(amount > S.tradingAccount) { showToast('⚠ Fonds insuffisants en trading', 2800, 'critical'); return; }
    // v7.1 P2: Règlement des intérêts levier en attente AVANT transfert trading→caisse
    // (les taxes sur gains ont déjà été provisionnées à la clôture de chaque trade)
    const _fiscalBefore = S.fiscalReserveAccount || 0;
    if((S.leverageBorrowed || 0) > 0) {
      try { applyLeverageBorrowFees(); } catch(e) {}
    }
    const _fiscalJustDeducted = (S.fiscalReserveAccount || 0) - _fiscalBefore;
    // v7.1 P3: Restitution du levier libre + reset index à x1 (spec utilisateur)
    let _levRestoreInfo = { freeRepaid:0, committed:0, prevLev: S.leverage||1 };
    try { _levRestoreInfo = restoreLeverageAtCashout(); } catch(e) {}
    // Revérification après prélèvement intérêts
    if(amount > S.tradingAccount) {
      showToast('⚠ Solde insuffisant après intérêts levier (' + fmt$(S.tradingAccount) + ' dispo)', 2800, 'critical');
      return;
    }
    // v7.1: Permettre vidage total trading → caisse même avec positions ouvertes
    // Le levier sera utilisé par le bot automatiquement pour continuer à trader
    const exposed = S.openPositions.reduce((s,p) => s + (p.stakeUsdt||0), 0);
    const remainingTrading = S.tradingAccount - amount;
    // Warning seulement si positions exposées (informatif, pas bloquant)
    let warnMsg = '';
    if(exposed > 0 && remainingTrading < exposed * 0.5) {
      warnMsg = ' · Levier activé pour couvrir positions';
    }
    if(_fiscalJustDeducted > 0) {
      warnMsg += ' · ' + fmt$(_fiscalJustDeducted) + ' → réserve fiscale';
    }
    if(_levRestoreInfo.freeRepaid > 0 || _levRestoreInfo.prevLev !== 1) {
      warnMsg += ' · Levier restitué, index reset ×1';
    }
    S.tradingAccount -= amount;
    S.cashAccount    += amount;
    syncLeverageReserve();
    showToast('✅ +' + fmt$(amount) + ' → Caisse' + warnMsg, 2800, 'user');
  }
  S.portfolio = S.cashAccount + S.tradingAccount;
  try{renderAll();}catch(e){}
  try{saveState();}catch(e){} // v105
  closeTransfer();
  S.chainLog.push({ icon:'💸', desc:`Transfert manuel ${transferDir} ${fmt$(amount)} · approuvé utilisateur`, hash:rndHash(), time:nowStr() });
}


// v7.1: FERMETURE POSITIONS — modal avec choix par paire
function openClosePositionsModal() {
  const modal = document.getElementById('closePositionsModal');
  if(!modal) return;
  renderClosePositionsList();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeClosePositionsModal() {
  const modal = document.getElementById('closePositionsModal');
  if(!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function renderClosePositionsList() {
  const list = document.getElementById('closePositionsList');
  if(!list) return;
  const positions = S.openPositions || [];
  if(positions.length === 0) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);font-size:11px;">Aucune position ouverte</div>';
    const btn = document.getElementById('closeAllConfirmBtn');
    if(btn) btn.style.display = 'none';
    return;
  }
  const btn = document.getElementById('closeAllConfirmBtn');
  if(btn) btn.style.display = '';

  list.innerHTML = positions.map(pos => {
    const ps = S.pairStates[pos.pair];
    const cfg = PAIRS[pos.pair];
    const cur = ps?.price || pos.entryPrice;
    const pnlPct = pos.side === 'long'
      ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - cur) / pos.entryPrice) * 100;
    const pnlUsd = (pos.totalExposure || pos.stakeUsdt) * (pnlPct / 100);
    const pnlCol = pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const sideLabel = pos.side === 'long' ? '↑ LONG' : '↓ SHORT';
    const sideCol = pos.side === 'long' ? 'var(--up)' : 'var(--down)';
    const modeLabel = pos.auto ? '🤖 BOT' : '🔒 MAN';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:6px;background:var(--s2);border:1px solid var(--border);border-radius:10px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px;">
          <span style="font-size:11px;font-weight:700;color:${cfg?.color || 'var(--t1)'};">${pos.pair}</span>
          <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:rgba(120,130,150,.15);color:var(--t2);font-weight:600;">${modeLabel}</span>
          <span style="font-size:9px;font-weight:700;color:${sideCol};">${sideLabel}</span>
        </div>
        <div style="display:flex;gap:8px;font-size:9px;color:var(--t3);">
          <span>Mise: ${fmt$(pos.stakeUsdt)}</span>
          <span style="color:${pnlCol};font-weight:700;">${pnlUsd >= 0 ? '+' : ''}${fmt$(pnlUsd)} (${pnlPct.toFixed(2)}%)</span>
        </div>
      </div>
      <button onclick="confirmCloseOne('${pos.id}')" style="padding:8px 14px;background:rgba(255,61,107,.12);border:1px solid rgba(255,61,107,.35);border-radius:8px;color:var(--down);font-weight:700;font-size:10px;cursor:pointer;">Fermer</button>
    </div>`;
  }).join('');
}

function confirmCloseOne(id) {
  const pos = (S.openPositions || []).find(p => p.id === id);
  if(!pos) return;
  const ps = S.pairStates[pos.pair];
  const cur = ps?.price || pos.entryPrice;
  const pnlPct = pos.side === 'long'
    ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
    : ((pos.entryPrice - cur) / pos.entryPrice) * 100;
  const pnlUsd = (pos.totalExposure || pos.stakeUsdt) * (pnlPct / 100);
  // Appeler closePosition — botClose=false donc l'utilisateur peut fermer aussi les positions bot
  closePosition(id, false);
  showToast(`⊗ ${pos.pair} ${pos.side.toUpperCase()} fermé · ${pnlUsd >= 0 ? '+' : ''}${fmt$(pnlUsd)}`, 2800, 'user');
  renderClosePositionsList();
  _updateCloseAllBadge();
  if(!S.openPositions.length) setTimeout(closeClosePositionsModal, 400);
}

function confirmCloseAll() {
  const positions = [...(S.openPositions || [])];
  if(positions.length === 0) { closeClosePositionsModal(); return; }
  let totalPnl = 0;
  positions.forEach(pos => {
    const ps = S.pairStates[pos.pair];
    const cur = ps?.price || pos.entryPrice;
    const pnlPct = pos.side === 'long'
      ? ((cur - pos.entryPrice) / pos.entryPrice) * 100
      : ((pos.entryPrice - cur) / pos.entryPrice) * 100;
    totalPnl += (pos.totalExposure || pos.stakeUsdt) * (pnlPct / 100);
    closePosition(pos.id, false);
  });
  showToast(`⊗ ${positions.length} position(s) fermée(s) · ${totalPnl >= 0 ? '+' : ''}${fmt$(totalPnl)}`, 3500, 'user');
  S.chainLog.unshift({ icon:'⊗', desc:`Fermeture manuelle globale · ${positions.length} position(s) · ${totalPnl >= 0 ? '+' : ''}${fmt$(totalPnl)}`, hash:rndHash(), time:nowStr() });
  _updateCloseAllBadge();
  closeClosePositionsModal();
}

function _updateCloseAllBadge() {
  const badge = document.getElementById('closeAllBadge');
  if(!badge) return;
  const n = (S.openPositions || []).length;
  if(n > 0) {
    badge.textContent = n;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Expose globally
window.openClosePositionsModal = openClosePositionsModal;
window.closeClosePositionsModal = closeClosePositionsModal;
window.confirmCloseOne = confirmCloseOne;
window.confirmCloseAll = confirmCloseAll;

