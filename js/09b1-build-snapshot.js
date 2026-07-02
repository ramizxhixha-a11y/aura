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
        regimeFitness:  a.regimeFitness   || {}
      })),

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
