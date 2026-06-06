// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b2-save-load.js · VERSION 123.1 · 01/06/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// saveState + loadState + hooks de fermeture — TOUTE la persistance ici.
//
// v121 — Refonte complète :
//   • saveState : put avec CLÉ EXPLICITE (RT.SAVE_KEY) — sans cela, IDB
//     échoue silencieusement (store sans keyPath).
//   • loadState : try/catch global + par section, accepte cycle=0 valide,
//     ne bloque plus sur version absente, appel renderAll() à la fin,
//     bannière debug visuelle visible à l'écran (pas besoin de console).
//
// v122 (31/05/2026) — VERROU _stateReady + GARDE-FOU ANTI-RÉGRESSION
//   PROBLÈME : storage régressait (cycle 16520 → 12634 → 42). Cause :
//   saveState appelé pendant le démarrage avant restauration de S.
//   FIX : verrou _stateReady (false au démarrage, true après loadState).
//   + garde-fou anti-régression dans saveState (refuse cycle < LS - 5).
//
// v123 (01/06/2026) — HOOKS DE FERMETURE SYNCHRONES
//   PROBLÈME : quand l'app passe en arrière-plan, le cycle revenait à
//   une vieille valeur au retour. Cause : aucun handler pagehide actif.
//   FIX : hooks pagehide/freeze/beforeunload/visibilitychange installés
//   ICI avec écriture localStorage SYNCHRONE via _flushSyncOnExit().
//
// ★★ v123.1 (01/06/2026) — FIX IDB SILENCIEUSEMENT MUET
//   PROBLÈME : IndexedDB.state restait VIDE même avec saveState qui
//   tournait. Cause : conflit entre 2 définitions de openDB() :
//     - 09a-runtime-state.js crée le store SANS keyPath
//     - 10-fin-bloc-restauration-v93.js crée le store AVEC keyPath:'key'
//   La 2e écrase la 1re (chargée après). Donc le store final a keyPath.
//   Mais saveState faisait .put(snap, RT.SAVE_KEY) → invalide quand le
//   store a un keyPath → erreur silencieuse (avalée par try/catch).
//
//   FIX : détection runtime du keyPath du store, et appel adapté :
//     - Si keyPath → snap.key = RT.SAVE_KEY puis .put(snap)
//     - Sinon → .put(snap, RT.SAVE_KEY)
//   Appliqué dans saveState() ET dans _flushSyncOnExit().
//
// Dépend de 09a-runtime-state.js (window.RT + window.openDB).
// ════════════════════════════════════════════════════════════════════════

// ── VERROU GLOBAL : _stateReady ─────────────────────────────────────────
// false par défaut → saveState refuse d'écrire au démarrage tant que
// loadState n'a pas terminé. Mis à true par loadState() (3 chemins de
// sortie) ou par 09k-init.js si loadState plante (try/finally).
if (typeof window !== 'undefined' && typeof window._stateReady === 'undefined') {
  window._stateReady = false;
}


// ════════════════════════════════════════════════════════════════════════
// saveState — écrit dans IDB ET localStorage en parallèle
// v122 : VERROU _stateReady + GARDE-FOU anti-régression
// ════════════════════════════════════════════════════════════════════════
async function saveState(silent = false) {
  // ─── VERROU 1 : _stateReady (empêche saveState pendant le démarrage) ──
  // Tant que loadState n'a pas terminé, on refuse d'écrire pour éviter
  // d'écraser le storage avec un S encore en valeurs par défaut.
  if (typeof window !== 'undefined' && window._stateReady === false) {
    if (!silent) console.warn('[saveState v122] BLOQUÉ : _stateReady=false (démarrage en cours)');
    return false;
  }

  let snap;
  try {
    snap = buildSnapshot();
  } catch (e) {
    console.warn('[saveState] buildSnapshot a planté:', e);
    return false;
  }
  if (!snap) return false;

  // ─── VERROU 2 : GARDE-FOU ANTI-RÉGRESSION (renforcé) ────────────────
  // Filet de sécurité contre l'écrasement d'un bon état par un état
  // vide/neuf. Compare à PLUSIEURS références pour ne pas dépendre du seul
  // localStorage (qui disparaît si on vide le navigateur — c'était la faille).
  try {
    const snapCycle = (typeof snap.cycle === 'number') ? snap.cycle : -1;
    const snapPf    = (typeof snap.portfolio === 'number') ? snap.portfolio : -1;

    // Référence 1 : cycle dans localStorage
    let refCycle = -1;
    try { const raw = localStorage.getItem(RT.SAVE_KEY); if (raw) { const c = JSON.parse(raw); if (c && typeof c.cycle === 'number') refCycle = c.cycle; } } catch(e){}

    // Référence 2 : plus haut cycle jamais vu, gardé dans une clé séparée qui
    // sert UNIQUEMENT de témoin (résiste mieux, et sert même si SAVE_KEY est absent).
    let highWater = -1;
    try { const hw = localStorage.getItem('aura_highwater_cycle'); if (hw) highWater = parseInt(hw, 10) || -1; } catch(e){}

    // Référence 3 : cycle de l'état actuellement en mémoire vive (S), via buildSnapshot précédent
    let liveCycle = -1;
    try { if (typeof S !== 'undefined' && S && typeof S.cycle === 'number') liveCycle = S.cycle; } catch(e){}

    const knownMax = Math.max(refCycle, highWater, liveCycle);

    // BLOCAGE ABSOLU : un état manifestement neuf/vide (cycle ≤ 100 ET portfolio ≤ 0)
    // ne peut JAMAIS écraser automatiquement un état avancé connu (cycle > 500).
    // Pour repartir de zéro volontairement, il faut poser window._auraAllowReset = true.
    const looksEmpty = (snapCycle <= 100 && snapPf <= 0);
    const allowReset = (typeof window !== 'undefined' && window._auraAllowReset === true);
    if (looksEmpty && knownMax > 500 && !allowReset) {
      if (!silent) console.warn('[saveState] BLOQUÉ : état vide (cycle ' + snapCycle + ', pf ' + snapPf + ') refusé — un état avancé existe (cycle ' + knownMax + '). Pour reset volontaire : window._auraAllowReset=true');
      try { if (typeof window !== 'undefined') window._auraSaveBlocked = { at: Date.now(), snapCycle: snapCycle, knownMax: knownMax }; } catch(e){}
      return false;
    }

    // BLOCAGE anti-régression classique : cycle nettement inférieur au connu.
    if (knownMax > snapCycle + 5 && !allowReset) {
      if (!silent) console.warn('[saveState] BLOQUÉ anti-régression : cycle ' + snapCycle + ' < connu#' + knownMax);
      return false;
    }

    // Mettre à jour le témoin high-water si ce snapshot est plus avancé.
    if (snapCycle > highWater) { try { localStorage.setItem('aura_highwater_cycle', String(snapCycle)); } catch(e){} }
  } catch (e) {}

  if (!snap.savedAt) snap.savedAt = new Date().toISOString();
  if (!snap.key)     snap.key = RT.SAVE_KEY;

  let idbOk = false;
  let lsOk  = false;

  // IndexedDB — détection keyPath du store
  // Le store peut être créé avec ou sans keyPath selon le module qui a
  // ouvert IDB en premier (conflit historique entre 09a et 10). On gère
  // les deux cas pour ne pas planter silencieusement.
  try {
    const db = await openDB();
    idbOk = await new Promise(res => {
      try {
        const tx    = db.transaction(RT.STORE_STATE, 'readwrite');
        const store = tx.objectStore(RT.STORE_STATE);
        let req;
        if (store.keyPath) {
          // Store avec keyPath : la clé est dans snap[keyPath]
          if (!snap.key) snap.key = RT.SAVE_KEY;
          req = store.put(snap);
        } else {
          // Store sans keyPath : la clé est passée en 2e argument
          req = store.put(snap, RT.SAVE_KEY);
        }
        req.onsuccess = () => res(true);
        req.onerror   = () => res(false);
        tx.onerror    = () => res(false);
        tx.onabort    = () => res(false);
      } catch(e) { res(false); }
    });
  } catch (e) {}

  // localStorage en parallèle (pas en fallback)
  try {
    localStorage.setItem(RT.SAVE_KEY, JSON.stringify(snap));
    lsOk = true;
  } catch (e) {
    console.warn('[saveState] localStorage error:', e.message);
  }

  if ((idbOk || lsOk) && !silent && typeof updateSaveIndicator === 'function') {
    try { updateSaveIndicator('saved'); } catch(e) {}
  }

  // ─── BACKUP LOCAL DÉDIÉ ─────────────────────────────────────────────
  // À chaque sauvegarde d'un bon état, on confie une copie au backup IDB
  // dédié de Guardian (séparé du store principal). La vraie protection
  // hors-navigateur passe par le téléchargement de fichier (09b3) + synchro
  // Android — PAS de Drive OAuth ici (abandonné, causait des reconnexions).
  // Throttle : au plus une fois par 2 min.
  try {
    if ((idbOk || lsOk) && typeof snap.cycle === 'number' && snap.cycle > 100) {
      const now = Date.now();
      if (typeof window !== 'undefined' && (!window._auraLastOffsiteBk || (now - window._auraLastOffsiteBk) > 120000)) {
        window._auraLastOffsiteBk = now;
        if (window.GuardianCore && window.GuardianCore.autoBackup) {
          window.GuardianCore.autoBackup.run(true).catch(()=>{});
        }
      }
    }
  } catch (e) {}

  return idbOk || lsOk;
}
window.saveState = saveState;


// ════════════════════════════════════════════════════════════════════════
// loadState — lit IDB + LS, garde le cycle le plus élevé, applique à S
// ════════════════════════════════════════════════════════════════════════
async function loadState() {
  const dbg = [];
  let snapIDB = null;
  let snapLS  = null;

  // ── factoryReset bypass ─────────────────────────────────────────────
  try {
    if (sessionStorage.getItem('nexus_factory_reset') === '1') {
      sessionStorage.removeItem('nexus_factory_reset');
      try { indexedDB.deleteDatabase(RT.DB_NAME); } catch (e) {}
      // v122 : factory_reset = état neuf voulu. On débloque saveState.
      if (typeof window !== 'undefined') window._stateReady = true;
      return false;
    }
  } catch (e) {}

  // ── Lecture IDB ─────────────────────────────────────────────────────
  try {
    const db = await openDB();
    snapIDB = await new Promise(res => {
      try {
        const req = db.transaction(RT.STORE_STATE, 'readonly')
                      .objectStore(RT.STORE_STATE).get(RT.SAVE_KEY);
        req.onsuccess = e => res(e.target.result || null);
        req.onerror   = () => res(null);
      } catch(e) { res(null); }
    });
    dbg.push('IDB:' + (snapIDB ? '#' + snapIDB.cycle : 'vide'));
  } catch (e) {
    dbg.push('IDB:err=' + e.message);
  }

  // ── Lecture LS ──────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(RT.SAVE_KEY);
    if (raw) {
      snapLS = JSON.parse(raw);
      dbg.push('LS:#' + (snapLS && snapLS.cycle));
    } else {
      dbg.push('LS:vide');
    }
  } catch (e) {
    dbg.push('LS:err=' + e.message);
  }

  // ── Choisir le plus récent (cycle prioritaire, savedAt secondaire) ──
  let snap = null;
  const cIDB = snapIDB && typeof snapIDB.cycle === 'number' ? snapIDB.cycle : -1;
  const cLS  = snapLS  && typeof snapLS.cycle  === 'number' ? snapLS.cycle  : -1;
  if (cIDB === -1 && cLS === -1) {
    // v122 : pas de snapshot = premier démarrage légitime. On débloque saveState.
    if (typeof window !== 'undefined') window._stateReady = true;
    return false;
  }
  snap = (cIDB >= cLS) ? snapIDB : snapLS;

  // ─── RESTAURATION AUTOMATIQUE AU BOOT ───────────────────────────────
  // Si le meilleur snapshot trouvé est vide/bas (cycle ≤ 100) ALORS qu'un
  // backup Guardian bien plus avancé existe (hors localStorage/IDB principal,
  // donc survivant à un vidage du navigateur), on récupère ce backup à la
  // place. C'est le filet ultime : même cache vidé, AURA se répare seule.
  try {
    const bestCycle = snap && typeof snap.cycle === 'number' ? snap.cycle : -1;
    // témoin du plus haut cycle jamais atteint (clé séparée, écrite par saveState)
    let highWater = -1;
    try { const hw = localStorage.getItem('aura_highwater_cycle'); if (hw) highWater = parseInt(hw, 10) || -1; } catch(e){}
    const looksEmpty = bestCycle <= 100;
    const knewBetter = highWater > 500 || bestCycle < 0;

    if (looksEmpty && knewBetter && window.GuardianCore && window.GuardianCore.autoBackup) {
      const list = await window.GuardianCore.autoBackup.list().catch(() => []);
      if (list && list.length) {
        // prendre le backup Guardian au cycle le plus élevé
        let best = null;
        for (const meta of list) {
          const rec = await window.GuardianCore.autoBackup.get(meta.id).catch(() => null);
          const s = rec && rec.snapshot ? rec.snapshot : null;
          if (s && typeof s.cycle === 'number' && (!best || s.cycle > best.cycle)) best = s;
        }
        if (best && typeof best.cycle === 'number' && best.cycle > bestCycle + 5) {
          snap = best;
          dbg.push('AUTO-RESTORE Guardian #' + best.cycle);
          try { localStorage.setItem('aura_highwater_cycle', String(best.cycle)); } catch(e){}
        }
      }
    }
  } catch (e) { dbg.push('auto-restore:err'); }
  dbg.push('→ choix: #' + snap.cycle);

  // ── Restauration section par section (try/catch indépendants) ───────
  // safeNum corrigé : accepte zéro et nombres positifs/négatifs
  const safeNum = (val, fallback) => (typeof val === 'number' && isFinite(val)) ? val : fallback;

  try { S.portfolio       = safeNum(snap.portfolio,       S.portfolio); } catch(e){}
  try { S.cashAccount     = safeNum(snap.cashAccount,     S.cashAccount); } catch(e){}
  try { S.tradingAccount  = safeNum(snap.tradingAccount,  S.tradingAccount); } catch(e){}
  try { S.leverage        = safeNum(snap.leverage,        0); } catch(e){}
  try { S.botAutoMode     = snap.botAutoMode !== undefined ? snap.botAutoMode : false; } catch(e){}

  // Intelligence + contrôle
  try {
    if (snap.heatmap)          S.heatmap          = snap.heatmap;
    if (snap.shadow)           S.shadow           = snap.shadow;
    if (snap.dreamJournal)     S.dreamJournal     = snap.dreamJournal;
    if (snap.decisionCascade)  S.decisionCascade  = snap.decisionCascade;
    if (snap.resonanceHistory) S.resonanceHistory = snap.resonanceHistory;
    if (snap.archives)         S.archives         = snap.archives;
    if (snap.brainLog)         S.brainLog         = snap.brainLog;
    if (snap.pendingActions)   S.pendingActions   = snap.pendingActions;
    if (snap.mutedAgents)      S.mutedAgents      = snap.mutedAgents;
    if (snap.botFleet)         Object.assign(S.botFleet || {}, snap.botFleet);
    if (Array.isArray(snap.agentLessons)) S.agentLessons = snap.agentLessons;
  } catch(e) { dbg.push('intel:err'); }

  // Mode trading
  try {
    if (typeof snap.tradingMode === 'string')        S.tradingMode       = snap.tradingMode;
    if (typeof snap.realTimeframe === 'string')      S.realTimeframe     = snap.realTimeframe;
    if (snap.realActivePairs   && typeof snap.realActivePairs   === 'object') S.realActivePairs   = snap.realActivePairs;
    if (Array.isArray(snap.agentLessonsReal))        S.agentLessonsReal  = snap.agentLessonsReal;
    if (snap.realKillSwitch    && typeof snap.realKillSwitch    === 'object') S.realKillSwitch    = snap.realKillSwitch;
    if (typeof snap.realModeStartedAt === 'number')  S.realModeStartedAt = snap.realModeStartedAt;
    if (snap.realStatsByPair   && typeof snap.realStatsByPair   === 'object') S.realStatsByPair   = snap.realStatsByPair;
    if (snap.preRealSnapshot   && typeof snap.preRealSnapshot   === 'object') S.preRealSnapshot   = snap.preRealSnapshot;
  } catch(e) { dbg.push('mode:err'); }

  // PaperReal
  try {
    if (Array.isArray(snap.agentLessonsPaperReal))                                 S.agentLessonsPaperReal     = snap.agentLessonsPaperReal;
    if (snap.paperRealStats             && typeof snap.paperRealStats             === 'object') S.paperRealStats             = snap.paperRealStats;
    if (snap.paperRealActivePairs       && typeof snap.paperRealActivePairs       === 'object') S.paperRealActivePairs       = snap.paperRealActivePairs;
    if (typeof snap.paperRealTimeframe === 'string')                               S.paperRealTimeframe         = snap.paperRealTimeframe;
    if (typeof snap.paperRealStartedAt === 'number')                               S.paperRealStartedAt         = snap.paperRealStartedAt;
    if (snap.paperRealKillSwitch        && typeof snap.paperRealKillSwitch        === 'object') S.paperRealKillSwitch        = snap.paperRealKillSwitch;
    if (snap.paperRealLastClose         && typeof snap.paperRealLastClose         === 'object') S.paperRealLastClose         = snap.paperRealLastClose;
    if (typeof snap.paperRealConsecLosses === 'number')                            S.paperRealConsecLosses      = snap.paperRealConsecLosses;
    if (typeof snap.paperRealGlobalPauseUntil === 'number')                        S.paperRealGlobalPauseUntil  = snap.paperRealGlobalPauseUntil;
    if (snap.paperRealConfig            && typeof snap.paperRealConfig            === 'object') S.paperRealConfig            = Object.assign(S.paperRealConfig || {}, snap.paperRealConfig);
    if (snap.adaptiveState              && typeof snap.adaptiveState              === 'object') S.adaptiveState              = Object.assign(S.adaptiveState   || {}, snap.adaptiveState);
    if (Array.isArray(snap.tradeContextMemory))                                    S.tradeContextMemory         = snap.tradeContextMemory.slice(-500);
    if (snap.abTesting                  && typeof snap.abTesting                  === 'object') S.abTesting                  = Object.assign(S.abTesting       || {}, snap.abTesting);
    if (snap.pnlPeriod                  && typeof snap.pnlPeriod                  === 'object') S.pnlPeriod                  = Object.assign(S.pnlPeriod       || {}, snap.pnlPeriod);
    if (typeof snap._totalCompounded === 'number') S._totalCompounded = snap._totalCompounded;
    if (typeof snap._genCount        === 'number') S._genCount        = snap._genCount;
    if (snap.preRealSnapshotPaperReal   && typeof snap.preRealSnapshotPaperReal   === 'object') S.preRealSnapshotPaperReal   = snap.preRealSnapshotPaperReal;
  } catch(e) { dbg.push('paperReal:err'); }

  // Bougies temps réel
  try {
    if (snap.realCandles && typeof snap.realCandles === 'object') {
      S.realCandles = snap.realCandles;
      if (typeof _ensureRealCandlesStruct === 'function') _ensureRealCandlesStruct();
    }
  } catch(e) { dbg.push('candles:err'); }

  // Bandeau mode + bouton mode (différé pour laisser l'UI se construire)
  setTimeout(() => {
    try { if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner(); } catch(e){}
    try { if (typeof updateModeButton === 'function') updateModeButton(); } catch(e){}
  }, 100);

  // Cycle, P&L, historiques
  try {
    S.cycle           = typeof snap.cycle === 'number' ? snap.cycle : 0;
    S.cycleMax        = snap.cycleMax        || 30;
    S.pnl24h          = snap.pnl24h          || 0;
    S.pnlHistory      = snap.pnlHistory      || [];
    S.totalTrades     = snap.totalTrades     || 0;
    S.winTrades       = snap.winTrades       || 0;
    S.chainLog        = snap.chainLog        || [];
    S.learningHistory = snap.learningHistory || [];
    S.evoLog          = snap.evoLog          || [];
    S.openPositions   = snap.openPositions   || [];
    if (snap._startPortfolio) S._startPortfolio = snap._startPortfolio;
  } catch(e) { dbg.push('cycle:err'); }

  // Fees
  try {
    if (snap.fees) {
      Object.assign(S.fees, snap.fees);
      S.fees.feeLog = snap.fees.feeLog || [];
      S.fees.byPair = snap.fees.byPair || {};
    }
  } catch(e) { dbg.push('fees:err'); }

  // TaxConfig
  try {
    if (snap.taxConfig) {
      S.taxConfig.region = snap.taxConfig.region || S.taxConfig.region;
      if (snap.taxConfig.regions) {
        Object.assign(S.taxConfig.regions, snap.taxConfig.regions);
      }
    }
  } catch(e) { dbg.push('tax:err'); }

  // Agents
  try {
    if (snap.agents && snap.agents.length && S.agents) {
      snap.agents.forEach(sa => {
        const a = S.agents.find(x => x.id === sa.id);
        if (a) {
          a.name           = sa.name;
          a.emoji          = sa.emoji;
          a.type           = sa.type;
          a.source         = sa.source;
          a.score          = sa.score;
          a.conf           = sa.conf;
          a.fitness        = sa.fitness;
          a.learningEvents = sa.learningEvents;
          a.totalReward    = sa.totalReward;
          a.fitnessHistory = sa.fitnessHistory || [];
          a.regimeFitness  = sa.regimeFitness  || {};
          a.errors         = sa.errors         || 0;
          a.corrections    = sa.corrections    || 0;
          a.streak         = sa.streak         || 0;
          a.lastPnl        = sa.lastPnl        || 0;
          a.memory         = sa.memory         || [];
        }
      });
    }
  } catch(e) { dbg.push('agents:err'); }

  // Paires
  try {
    const snapAge    = snap.savedAt ? (Date.now() - new Date(snap.savedAt).getTime()) : 0;
    const priceStale = snapAge > 600000;
    if (snap.pairStates) {
      Object.entries(snap.pairStates).forEach(([pair, saved]) => {
        const ps = S.pairStates && S.pairStates[pair];
        if (!ps) return;
        if (!priceStale) ps.price = saved.price || ps.price;
        ps.qYes         = saved.qYes         || ps.qYes;
        ps.qNo          = saved.qNo          || ps.qNo;
        ps.stake        = saved.stake        || ps.stake;
        ps.userStake    = saved.userStake    || false;
        ps.pairLeverage = saved.pairLeverage || 1;
        ps.threshold    = saved.threshold    || 0.65;
        ps.userCycleSet = saved.userCycleSet || false;
        ps.lastAction   = saved.lastAction   || 'hold';
        ps.holdStartTs  = saved.holdStartTs  || 0;
        ps.capital      = saved.capital      || ps.capital;
        ps.cycleMax     = saved.cycleMax     || ps.cycleMax;
        ps.cycleTimer   = saved.cycleTimer   || ps.cycleTimer;
        ps.totalTrades  = saved.totalTrades  || 0;
        ps.winTrades    = saved.winTrades    || 0;
        ps.totalPnlPct  = saved.totalPnlPct  || 0;
        ps.totalPnlUsd  = saved.totalPnlUsd  || 0;
        ps.pnl24h       = saved.pnl24h       || 0;
        ps.trades       = saved.trades       || [];
        if (saved.candles && saved.candles.length) ps.candles = saved.candles;
        if (snap.pairBestWorst && snap.pairBestWorst[pair]) {
          ps.bestTrade  = snap.pairBestWorst[pair].bestTrade  || null;
          ps.worstTrade = snap.pairBestWorst[pair].worstTrade || null;
        }
      });
    }
  } catch(e) { dbg.push('pairs:err'); }

  // Mémoires agents
  try {
    if (snap.agentMemories && S.agents) {
      S.agents.forEach(a => {
        if (snap.agentMemories[a.id]) a.memory = snap.agentMemories[a.id];
        const saved = snap.agents ? snap.agents.find(sa => sa.id === a.id) : null;
        if (saved) {
          if (saved.errors         != null) a.errors         = saved.errors;
          if (saved.corrections    != null) a.corrections    = saved.corrections;
          if (saved.streak         != null) a.streak         = saved.streak;
          if (saved.lastPnl        != null) a.lastPnl        = saved.lastPnl;
          if (saved.learningEvents != null) a.learningEvents = saved.learningEvents;
        }
      });
    }
    if (snap.globalMemoryPool) S.globalMemoryPool = snap.globalMemoryPool;
  } catch(e) { dbg.push('memories:err'); }

  // Dreams
  try { if (snap.dreams && snap.dreams.length) S.dreams = snap.dreams; } catch(e){}

  // Version
  try { if (snap.vMajor != null) S.vMajor = snap.vMajor; } catch(e){}

  // Levier
  try {
    if (snap.leverageReserve   != null) S.leverageReserve   = snap.leverageReserve;
    if (snap.leverageBorrowed  != null) S.leverageBorrowed  = snap.leverageBorrowed;
    if (snap.leverageTotalFees != null) S.leverageTotalFees = snap.leverageTotalFees;
  } catch(e) { dbg.push('lev:err'); }

  // Fiat / fiscal / fonds propres
  try {
    if (snap.fiscalReserveAccount != null) S.fiscalReserveAccount = snap.fiscalReserveAccount;
    if (Array.isArray(snap.fiscalReserveLog)) S.fiscalReserveLog  = snap.fiscalReserveLog;
    if (snap.ownFundsInjected     != null) S.ownFundsInjected     = snap.ownFundsInjected;
    if (Array.isArray(snap.ownFundsLog))    S.ownFundsLog         = snap.ownFundsLog;
    if (typeof snap.fiatConvFeePct === 'number') S.fiatConvFeePct = snap.fiatConvFeePct;
  } catch(e) { dbg.push('fiat:err'); }

  // Emprunt auto levier
  try {
    if (snap._autoLevBase     != null) S._autoLevBase     = snap._autoLevBase;
    if (snap._autoLevBorrowed != null) S._autoLevBorrowed = snap._autoLevBorrowed;
  } catch(e) {}

  // Paires dynamiques
  try {
    if (snap.dynamicPairKeys && snap.dynamicPairKeys.length && typeof PAIRS !== 'undefined') {
      snap.dynamicPairKeys.forEach(pairKey => {
        if (!PAIRS[pairKey]) {
          const sym = pairKey.split('/')[0];
          const candidate = (snap.pairCandidates || S.pairCandidates || []).find(c => c.sym === sym);
          if (candidate) {
            PAIRS[pairKey] = {
              sym: candidate.sym, color: candidate.color,
              startPrice: candidate.startPrice, vol: candidate.vol,
              minP: candidate.minP, maxP: candidate.maxP, dec: candidate.dec
            };
            if (S.pairStates && !S.pairStates[pairKey] && typeof makePairState === 'function') {
              S.pairStates[pairKey] = makePairState(PAIRS[pairKey]);
            }
          }
        }
      });
    }
    if (snap.pairCandidates) S.pairCandidates = snap.pairCandidates;
  } catch(e) { dbg.push('dynPairs:err'); }

  // Proposals
  try {
    if (snap.proposals && snap.proposals.length && S.proposals) {
      const savedPairProps = snap.proposals.filter(p => p.isPairProposal);
      savedPairProps.forEach(sp => {
        if (!S.proposals.find(p => p.id === sp.id)) S.proposals.unshift(sp);
      });
      const activePP = savedPairProps.find(p => p.status === 'active');
      if (activePP) S.activePairProposal = activePP.pairSym;
    }
  } catch(e) { dbg.push('props:err'); }

  // ── Render UI après restauration ────────────────────────────────────
  setTimeout(() => {
    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
  }, 50);

  // v122 : restauration réussie. On débloque saveState.
  if (typeof window !== 'undefined') window._stateReady = true;
  return true;
}
window.loadState = loadState;


// ════════════════════════════════════════════════════════════════════════
// v123 — HOOKS DE FERMETURE SYNCHRONES
// ════════════════════════════════════════════════════════════════════════
// _flushSyncOnExit : appelée par les hooks pagehide/freeze/visibilitychange.
// Construit le snapshot et écrit localStorage de manière SYNCHRONE pour
// garantir l'écriture avant que le browser gèle l'onglet.
// IDB tenté en fire-and-forget (best effort, peut échouer sans conséquence).
// ════════════════════════════════════════════════════════════════════════
function _flushSyncOnExit(reason) {
  try {
    // Verrou _stateReady : pas d'écriture pendant le démarrage avant loadState
    if (typeof window !== 'undefined' && window._stateReady === false) return;
    // Pas d'écriture pendant un factory reset
    if (typeof window !== 'undefined' && window._resetInProgress) return;
    try {
      if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
    } catch (e) {}

    if (typeof buildSnapshot !== 'function') return;
    const snap = buildSnapshot();
    if (!snap) return;

    // Garde-fou anti-régression : refuse cycle < LS - 5
    try {
      const raw = localStorage.getItem(RT.SAVE_KEY);
      if (raw) {
        const currentLS = JSON.parse(raw);
        const lsCycle   = (currentLS && typeof currentLS.cycle === 'number') ? currentLS.cycle : -1;
        const snapCycle = (typeof snap.cycle === 'number') ? snap.cycle : -1;
        if (lsCycle > snapCycle + 5) {
          console.warn('[flush ' + reason + ' v123] BLOQUÉ anti-régression : cycle ' + snapCycle + ' < LS#' + lsCycle);
          return;
        }
      }
    } catch (e) {}

    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    if (!snap.key)     snap.key = RT.SAVE_KEY;

    // Écriture SYNCHRONE de localStorage — termine AVANT que le browser gèle
    try {
      localStorage.setItem(RT.SAVE_KEY, JSON.stringify(snap));
    } catch (e) {
      console.warn('[flush ' + reason + ' v123] LS error:', e.message);
    }

    // IDB en fire-and-forget — best effort, peut être interrompu sans conséquence
    // Détection keyPath comme dans saveState
    try {
      openDB().then(db => {
        const tx    = db.transaction(RT.STORE_STATE, 'readwrite');
        const store = tx.objectStore(RT.STORE_STATE);
        if (store.keyPath) {
          if (!snap.key) snap.key = RT.SAVE_KEY;
          store.put(snap);
        } else {
          store.put(snap, RT.SAVE_KEY);
        }
      }).catch(() => {});
    } catch (e) {}

    console.log('[flush v123] ' + reason + ' · cycle ' + (snap.cycle || '?'));
  } catch (e) {
    console.warn('[flush v123] ' + reason + ' a planté:', e);
  }
}

// ════════════════════════════════════════════════════════════════════════
// _closeTradesOnExit : ferme les positions ouvertes quand le navigateur va
// VRAIMENT couper l'onglet (pagehide/freeze), pour ne jamais laisser un trade
// ouvert sans surveillance pendant l'absence. closePosition() est synchrone,
// donc faisable dans le temps imparti par le navigateur.
// IMPORTANT : seulement sur pagehide/freeze (vraie coupure), JAMAIS sur
// visibilitychange (simple passage en arrière-plan = AURA continue de tourner).
// ════════════════════════════════════════════════════════════════════════
function _closeTradesOnExit(reason) {
  try {
    if (typeof window !== 'undefined' && window._stateReady === false) return;
    if (typeof window !== 'undefined' && window._resetInProgress) return;
    let St; try { St = (0, eval)('S'); } catch(e){ return; }
    if (!St || !Array.isArray(St.openPositions) || St.openPositions.length === 0) return;
    let closeFn; try { closeFn = (0, eval)('closePosition'); } catch(e){ return; }
    if (typeof closeFn !== 'function') return;
    // copie des ids (closePosition modifie openPositions pendant l'itération)
    const ids = St.openPositions.map(p => p.id);
    for (const id of ids) {
      try { closeFn(id, true); } catch(e){}   // botClose=true : fermeture système
    }
    console.log('[closeTradesOnExit] ' + reason + ' · ' + ids.length + ' position(s) fermée(s)');
  } catch (e) {}
}

// Installation des hooks — exécutée à l'évaluation du fichier (pas dans une fonction)
// Ordre à la vraie coupure : fermer les trades PUIS sauvegarder l'état.
window.addEventListener('pagehide',     () => { _closeTradesOnExit('pagehide'); _flushSyncOnExit('pagehide'); });
window.addEventListener('beforeunload', () => { _closeTradesOnExit('beforeunload'); _flushSyncOnExit('beforeunload'); });
window.addEventListener('freeze',       () => { _closeTradesOnExit('freeze'); _flushSyncOnExit('freeze'); });
// visibilitychange : AURA passe juste en arrière-plan, elle CONTINUE de tourner.
// On sauvegarde par sécurité, mais on NE FERME PAS les trades ici.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') _flushSyncOnExit('visibility-hidden');
});

console.log('[09b2] ✅ hooks installés · trades fermés à la coupure (pagehide/freeze), sauvegarde sync sur tous');
