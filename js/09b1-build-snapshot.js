// [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] VERSION 20260926k · evoTrials, evoMerit, _metaMeritMigrated dans le snapshot
// [MÉRITE DES BOTS · 26/09/2026] VERSION 20260926j · botMerit, _botPredictions, _botMeritMigrated dans le snapshot
// [FENÊTRE APPRENANTE · 26/09/2026] VERSION 20260926f · _judgments gardés 240 (étaient 60) ; fitWindowRule dans le snapshot
// [COMPTEURS RÉGLAGES · 24/09/2026] VERSION 20260924a · _realJudgments dans le snapshot
// [STOP APPRIS · 23/09/2026] VERSION 20260923b · stopRules dans le snapshot
// [GAIN APPRIS · 23/09/2026] VERSION 20260923a · gainRules dans le snapshot
// [MÉMOIRE DE LA BLACKLIST · 22/09/2026] VERSION 20260922c · _lossStreaks (fenêtre blacklist / pause série) dans le snapshot
// [PLAFONDS APPRIS · 22/09/2026] VERSION 20260922b · capRules dans le snapshot
// [MÉMOIRE DES CHEMINS · 22/09/2026] VERSION 20260922a · horizonRules dans le snapshot
// [JOURNAL DES ÉVÉNEMENTS · 20/09/2026] VERSION 20260920b · eventLog (250) + eventStats dans le snapshot
// [ATTRIBUTION PAR SOURCE · 17/09/2026] VERSION 20260917f · attribution (par source) dans le snapshot
// [GÉNOME DE PAIRE · 17/09/2026] VERSION 20260917e · pairGenome + pairGenomeHistory + _pairGenomeDay dans le snapshot
// [FITNESS GLISSANTE · 16/09/2026] VERSION 20260916c · agents : _judgments (60), _probationUntil, _bornCycle dans le snapshot
// [GÉNOME · 16/09/2026] VERSION 20260916b · genome + genomeHistory dans le snapshot
// [SONDE RÉSEAU · 15/09/2026] VERSION 20260915a · perfLog.net (60 derniers pings classés) dans le snapshot
// [GEL BOOT · 11/09/2026] VERSION 20260911b · perfLog : + loaf (20 frames ≥ 1 s nommées par le navigateur)
// [GEL BOOT · 11/09/2026] VERSION 20260911a · snapshot : + perfLog (gels 30 / lent 30 / heap 144 / boots 20), bornée, relue par applySnap (09b2) et listée dans _APPLYSNAP_MANIFEST
// [P0b · 08/09/2026] VERSION 20260908b · newsApiKey RETIRÉE du snapshot (persistance dédiée aura_news_key dans 10e7)
// [P7 · 06/09/2026] VERSION 20260906g — snapshot : + newsApiKey (clé CoinStats, 10e7)
// [SEPARATION COMPLETE 3 MODES · 02/07/2026] flat openPositions/pnl24h/pnlHistory/pnlPeriod retires (walletStore les porte par mode)
// [ETAPE 1 · SEPARATION 3 MODES] walletStore additif dormant · 01/07/2026
// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b1-build-snapshot.js · VERSION 123 · 10/06/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// buildSnapshot — sérialisation complète de S vers un objet snap.
//
// v121 : ajout d'un try/catch global. Si S n'est pas prêt (autosave
// appelé avant init complète), retourne null au lieu de throw → saveState
// renvoie false silencieusement, l'autosave ne casse pas.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


function buildSnapshot() {
  // Garde-fou : ne pas tenter de snapshot si S incomplet
  if (typeof S === 'undefined' || !S || !S.agents || !S.pairStates) {
    return null;
  }

  try {
    const snap = {
      key:          RT.SAVE_KEY,
      savedAt:      new Date().toISOString(),
      version:      2,

      // Portefeuille
      portfolio:       S.portfolio,
      cashAccount:     S.cashAccount,
      tradingAccount:  S.tradingAccount,
      leverage:        S.leverage,
      botAutoMode:     S.botAutoMode,
      profitSplitCaissePct: S.profitSplitCaissePct,

      // ── SEPARATION DES 3 MODES (etape 1) · 3 portefeuilles independants + play/pause par mode
      walletStore:     S.walletStore,

      // Cycle
      cycle:    S.cycle,
      cycleMax: S.cycleMax,

      // Agents
      agents: (S.agents || []).map(a => ({
        id:             a.id,
        name:           a.name,
        emoji:          a.emoji,
        type:           a.type,
        source:         a.source,
        score:          a.score,
        conf:           a.conf,
        fitness:        a.fitness,
        color:          a.color,
        learningEvents: a.learningEvents  || 0,
        totalReward:    a.totalReward     || 0,
        fitnessHistory: (a.fitnessHistory || []).slice(-50),
        errors:         a.errors          || 0,
        corrections:    a.corrections     || 0,
        streak:         a.streak          || 0,
        lastPnl:        a.lastPnl         || 0,
        memory:         (a.memory         || []).slice(-20),
        regimeFitness:  a.regimeFitness   || {},
        _judgments:     (a._judgments     || []).slice(-240),   // [FITNESS GLISSANTE · 16/09/2026] · [FENÊTRE APPRENANTE · 26/09/2026] 240 (FIT_KEEP, 03)
        _probationUntil: a._probationUntil || 0,               // [GÉNOME · 16/09/2026]
        _bornCycle:     a._bornCycle      || 0
      })),

      // [GESTION PAIRES · 11/08/2026] paires ajoutées/retirées par Rams — rejouées au
      // boot par 11-gestion-paires.js (PAIRS muté, pairStates conservés pour les retirées)
      customPairs:  S.customPairs  || {},
      removedPairs: S.removedPairs || [],
      // [13/08/2026] compétence agent×paire — pondère le vote du conseil par paire
      agentPairSkill: S.agentPairSkill || {},
      genome: S.genome || {},                 // [GÉNOME · 16/09/2026]
      genomeHistory: S.genomeHistory || {},   // [GÉNOME · 16/09/2026]
      pairGenome: S.pairGenome || {},                 // [GÉNOME DE PAIRE · 17/09/2026]
      pairGenomeHistory: S.pairGenomeHistory || {},   // [GÉNOME DE PAIRE · 17/09/2026]
      _pairGenomeDay: S._pairGenomeDay || {},
      attribution: S.attribution || {},               // [ATTRIBUTION PAR SOURCE · 17/09/2026]
      horizonRules: S.horizonRules || {},             // [MÉMOIRE DES CHEMINS · 22/09/2026]
      capRules: S.capRules || {},                     // [PLAFONDS APPRIS · 22/09/2026]
      _lossStreaks: S._lossStreaks || {},             // [MÉMOIRE DE LA BLACKLIST · 22/09/2026]
      gainRules: S.gainRules || {},                   // [GAIN APPRIS · 23/09/2026]
      stopRules: S.stopRules || {},                   // [STOP APPRIS · 23/09/2026]
      fitWindowRule: S.fitWindowRule || null,         // [FENÊTRE APPRENANTE · 26/09/2026]
      botMerit: S.botMerit || {},                     // [MÉRITE DES BOTS · 26/09/2026]
      _botPredictions: (S._botPredictions || []).slice(-200),
      _botMeritMigrated: !!S._botMeritMigrated,
      evoTrials: S.evoTrials || {},                   // [MÉRITE DE L'ÉVOLUEUR · 26/09/2026]
      evoMerit: S.evoMerit || null,
      _metaMeritMigrated: !!S._metaMeritMigrated,
      _gbpToBnbDone: !!S._gbpToBnbDone,
      _realJudgments: S._realJudgments || 0,          // [COMPTEURS RÉGLAGES · 24/09/2026]
      botDisciples:   S.botDisciples   || {},   // [15/08] sièges des disciples par bot
      discipleTasks:  S.discipleTasks  || {},   // [15/08] tâche élue de chaque disciple
      discipleAngles: S.discipleAngles || {},   // [15/08] angle mesurable de chaque disciple
      discipleTaskSkill: S.discipleTaskSkill || {},   // [15/08] mérite par tâche (jugé à chaque clôture)

      // Apprentissage
      learningHistory: (S.learningHistory || []).slice(-200).map((h, i, arr) =>
        i >= arr.length - 30 ? h : { ...h, adjustments: [] }
      ),
      evoLog: (S.evoLog || []).slice(-50),

      // Paires
      pairStates: Object.fromEntries(
        Object.entries(S.pairStates || {}).map(([pair, ps]) => [pair, {
          price:        ps.price,
          qYes:         ps.qYes,
          qNo:          ps.qNo,
          stake:        ps.stake,
          pairLeverage: ps.pairLeverage || 1,
          threshold:    ps.threshold    || 0.65,
          userStake:    ps.userStake    || false,
          userCycleSet: ps.userCycleSet || false,
          lastAction:   ps.lastAction   || 'hold',
          holdStartTs:  ps.holdStartTs  || 0,
          capital:      ps.capital,
          cycleMax:     ps.cycleMax,
          cycleTimer:   ps.cycleTimer,
          totalTrades:  ps.totalTrades,
          winTrades:    ps.winTrades,
          totalPnlPct:  ps.totalPnlPct,
          totalPnlUsd:  ps.totalPnlUsd,
          pnl24h:       ps.pnl24h,
          trades:       (ps.trades  || []).slice(-30),
          candles:      (ps.candles || []).slice(-60)
        }])
      ),


      // Frais & taxes
      fees:      S.fees,
      feeConfig: S.feeConfig,
      taxConfig: S.taxConfig ? {
        region:  S.taxConfig.region,
        regions: S.taxConfig.regions
      } : {},

      // Chain log
      chainLog: (S.chainLog || []).slice(-50),
      eventLog: (S.eventLog || []).slice(-250),      // [JOURNAL DES ÉVÉNEMENTS · 20/09/2026] ce qui compte, durable
      eventStats: S.eventStats || {},

      // Stats globales
      totalTrades:     S.totalTrades,
      winTrades:       S.winTrades,
      _startPortfolio: S._startPortfolio || S.portfolio,

      // Version
      vMajor: S.vMajor,
      vMinor: S.vMinor,

      // Réserve levier
      leverageReserve:   S.leverageReserve   || 0,
      leverageBorrowed:  S.leverageBorrowed  || 0,
      leverageTotalFees: S.leverageTotalFees || 0,

      // Comptes Fiat / fiscal / fonds propres
      fiscalReserveAccount: S.fiscalReserveAccount || 0,
      fiscalReserveLog:     (S.fiscalReserveLog || []).slice(0, 200),
      cashLog:              (S.cashLog || []).slice(0, 200),
      ownFundsInjected:     S.ownFundsInjected || 0,
      _ownFundsLegacyEUR:   S._ownFundsLegacyEUR,
      ownFundsLog:          (S.ownFundsLog || []).slice(0, 200),
      fiatConvFeePct:       (typeof S.fiatConvFeePct === 'number') ? S.fiatConvFeePct : 0.002,

      // Emprunt auto levier
      _autoLevBase:     S._autoLevBase     || 0,
      _autoLevBorrowed: S._autoLevBorrowed || 0,

      // Best/worst trade par paire
      pairBestWorst: Object.fromEntries(
        Object.entries(S.pairStates || {}).map(([p, ps]) => [p, {
          bestTrade:  ps.bestTrade  || null,
          worstTrade: ps.worstTrade || null
        }])
      ),

      // Mémoires agents
      agentMemories: Object.fromEntries(
        (S.agents || []).map(a => [a.id, (a.memory || []).slice(-30)])
      ),
      globalMemoryPool: (S.globalMemoryPool || []).slice(-50),

      // Dreams
      dreams: (S.dreams || []).slice(-10),

      // Paires dynamiques
      dynamicPairKeys: (typeof PAIRS !== 'undefined' && PAIRS)
        ? Object.keys(PAIRS).filter(k => !['BTC/USDT','ETH/USDT','XRP/USDT','SOL/USDT'].includes(k))
        : [],
      pairCandidates:  S.pairCandidates || [],
      proposals:       (S.proposals || []).slice(-20),

      // Intelligence + contrôle
      heatmap:          S.heatmap          || { byHour:{}, byWeekday:{} },
      shadow:           S.shadow           || {},
      dreamJournal:     (S.dreamJournal    || []).slice(-40),
      decisionCascade:  (S.decisionCascade || []).slice(-15),
      resonanceHistory: (S.resonanceHistory|| []).slice(-15),
      archives:         S.archives         || { snapshots:[], totalResets:0 },
      brainLog:         (S.brainLog        || []).slice(-30),
      pendingActions:   (S.pendingActions  || []).slice(-10),
      mutedAgents:      S.mutedAgents      || [],
      botFleet:         S.botFleet         || {},
      agentLessons:     (S.agentLessons    || []).slice(-30),

      // Mode trading
      tradingMode:       S.tradingMode       || 'sim',
      realTimeframe:     S.realTimeframe     || '15m',
      realActivePairs:   S.realActivePairs   || {},
      agentLessonsReal:  (S.agentLessonsReal || []).slice(-30),
      realKillSwitch:    S.realKillSwitch    || {},
      realModeStartedAt: S.realModeStartedAt || 0,
      realStatsByPair:   S.realStatsByPair   || {},

      preRealSnapshot: (S.tradingMode === 'real') ? (S.preRealSnapshot || null) : null,

      // PaperReal
      agentLessonsPaperReal:     (S.agentLessonsPaperReal || []).slice(-30),
      paperRealStats:            S.paperRealStats || {},
      paperRealActivePairs:      S.paperRealActivePairs || {},
      paperRealTimeframe:        S.paperRealTimeframe || '15m',
      paperRealStartedAt:        S.paperRealStartedAt || 0,
      paperRealKillSwitch:       S.paperRealKillSwitch || {},
      paperRealLastClose:        S.paperRealLastClose || {},
      paperRealConsecLosses:     S.paperRealConsecLosses || 0,
      paperRealGlobalPauseUntil: S.paperRealGlobalPauseUntil || 0,
      paperRealConfig:           S.paperRealConfig || {},
      adaptiveState:             S.adaptiveState || {},
      tradeContextMemory:        (S.tradeContextMemory || []).slice(-500),
      abTesting:                 S.abTesting || null,

      preRealSnapshotPaperReal: (S.tradingMode === 'paperReal') ? (S.preRealSnapshotPaperReal || null) : null,

      // Compounding et générations
      _totalCompounded: S._totalCompounded || 0,
      _genCount:        S._genCount        || 0,

      // [GEL BOOT · 11/09/2026] journal de performance durable : gels (nom d'op complet + LoAF),
      // LENT, relevés heap 10 min, boots. Bornes dures : 30 / 30 / 144 / 20 (~30-60 Ko max).
      // S.perf (volatile : _lastTickAt en performance.now) n'est JAMAIS sauvegardé.
      perfLog: (function() {
        try {
          const p = (S.perfLog && typeof S.perfLog === 'object') ? S.perfLog : {};
          return {
            gels:  Array.isArray(p.gels)  ? p.gels.slice(-30)  : [],
            lent:  Array.isArray(p.lent)  ? p.lent.slice(-30)  : [],
            heap:  Array.isArray(p.heap)  ? p.heap.slice(-144) : [],
            boots: Array.isArray(p.boots) ? p.boots.slice(-20) : [],
            loaf:  Array.isArray(p.loaf)  ? p.loaf.slice(-20)  : [],
            net:   Array.isArray(p.net)   ? p.net.slice(-60)   : []    // [SONDE RÉSEAU · 15/09/2026] pings classés
          };
        } catch(e) { return { gels: [], lent: [], heap: [], boots: [], loaf: [], net: [] }; }
      })(),

      // Bougies temps réel
      realCandles: (function() {
        if (!S.realCandles) return {};
        const out = {};
        try {
          Object.entries(S.realCandles).forEach(([pair, intervals]) => {
            out[pair] = {};
            Object.entries(intervals || {}).forEach(([iv, arr]) => {
              out[pair][iv] = (arr || []).slice(-100);
            });
          });
        } catch(e) {}
        return out;
      })()
    };

    return snap;
  } catch (e) {
    console.warn('[buildSnapshot] error:', e.message);
    return null;
  }
}
window.buildSnapshot = buildSnapshot;
