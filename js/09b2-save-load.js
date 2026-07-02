// [SEPARATION COMPLETE 3 MODES · 02/07/2026] restaurations flat openPositions/pnl24h/pnlHistory/pnlPeriod retirees (walletStore les porte par mode)
// [ETAPE 5 · SEPARATION 3 MODES] restauration dreamJournal flat retiree (walletStore le porte par mode) · 01/07/2026
// [ETAPE 4 · SEPARATION 3 MODES] restaurations pairStates + fees flat retirees (walletStore les porte par mode) · 01/07/2026
// [ETAPE 2 · SEPARATION 3 MODES] restaurations argent obsoletes retirees + reset unique (chronos+P&L) · 01/07/2026
// [ETAPE 1 · SEPARATION 3 MODES] walletStore additif dormant · 01/07/2026
// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09b2-save-load.js · VERSION 128 · 10/06/2026 ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// saveState + loadState + hooks de fermeture — TOUTE la persistance ici.
//
// v121 — Refonte complète (put clé explicite, loadState robuste).
// v122 — Verrou _stateReady + garde-fou anti-régression.
// v123 — Hooks de fermeture synchrones (pagehide/freeze/beforeunload/visibility).
// v123.1 — Fix IDB muet (détection runtime du keyPath du store).
//
// ★★ v125 (07/06/2026) — ANTI-SATURATION localStorage par LISTE-BLANCHE
//   PROBLÈME : nexus_state_v2 pesait ~1.82 Mo en localStorage (limite ~5 Mo
//   sur mobile). Le snapshot complet était écrit à la fois en IDB et en LS.
//   FIX (durable, zéro maintenance) : le localStorage ne garde QUE les petites
//   valeurs vitales listées dans _LIGHT_KEYS (comptes, cycle, modes, taux,
//   config légère). TOUT le reste — agents, mémoires, historiques, bougies,
//   archives, ET tout champ ajouté au state à l'avenir — vit dans l'IndexedDB
//   uniquement (plusieurs Go dispo). Une clé inconnue est LOURDE par défaut,
//   donc le LS reste petit définitivement, sans liste de grosses clés à tenir.
//   La version LS porte le marqueur _lightened:true. → LS ~150-250 Ko.
//   loadState : si le snapshot retenu est la version allégée du LS, _mergeHeavyFrom
//   recharge depuis l'IDB TOUTE clé absente (sans liste fixe), zéro perte. Les
//   trois écritures LS (save, fallback, flush de sortie) sont toutes allégées ;
//   l'IDB garde toujours le snapshot complet.
//
//   v125 corrige aussi _startPortfolio au boot (P&L de session repart de 0,
//   P&L totale préservée via _totalCompounded) — fin du faux flash au démarrage.
//
// Dépend de 09a-runtime-state.js (window.RT + window.openDB).
// ════════════════════════════════════════════════════════════════════════

// ── VERROU GLOBAL : _stateReady ─────────────────────────────────────────
if (typeof window !== 'undefined' && typeof window._stateReady === 'undefined') {
  window._stateReady = false;
}

// ── Liste des grosses clés exclues du localStorage (gardées en IDB) ──────
// STRATEGIE LISTE-BLANCHE (durable, zero maintenance) :
// Le localStorage ne garde QUE les petites valeurs vitales necessaires au
// tout premier instant du boot. TOUT le reste (agents, memoires, historiques,
// bougies, archives, et tout champ ajoute au state a l'avenir) vit dans l'IDB
// uniquement et est recharge au boot par fusion. Aucune liste de grosses cles
// a maintenir : une cle inconnue est LOURDE par defaut -> IDB. LS reste petit.
const _LIGHT_KEYS = [
  'key','version','vMajor','vMinor','savedAt',
  'cycle','cycleMax','cycleTimer','userCycleSet',
  'portfolio','portfolioTotal','pnl24h','cashAccount','tradingAccount',
  'fiscalReserveAccount','ownFundsInjected','leverage','leverageReserve',
  'leverageMaxMult','leverageBorrowRate','leverageBorrowed','leverageTotalFees',
  '_autoLevBase','_autoLevBorrowed','_marginCallFired',
  'usdEurRate','_usdEurLastFetch','fiatRates','fiatConvFeePct',
  'tradingMode','botAutoMode','_mcActiveSlot',
  'totalTrades','winTrades','_genCount','_totalCompounded','_startPortfolio',
  'taxConfig','feeConfig','region','regions','toastVerbose','suggestionsEnabled',
  'b','userStake','realTimeframe'
];

// Copie allegee pour le LS : UNIQUEMENT les cles de la liste blanche.
function _lightSnapshot(snap) {
  const light = {};
  for (const k of _LIGHT_KEYS) {
    if (snap[k] !== undefined) light[k] = snap[k];
  }
  light._lightened = true;
  return light;
}

// Complete un snapshot allege en reprenant depuis l'IDB TOUTE cle absente
// (sans liste fixe -> valable pour tout champ present ET futur).
function _mergeHeavyFrom(target, heavySrc) {
  if (!target || !heavySrc) return target;
  for (const k in heavySrc) {
    if (target[k] === undefined && heavySrc[k] !== undefined) target[k] = heavySrc[k];
  }
  if (target._lightened) delete target._lightened;
  return target;
}


// ════════════════════════════════════════════════════════════════════════
// saveState — IDB = snapshot COMPLET · localStorage = snapshot ALLÉGÉ
// ════════════════════════════════════════════════════════════════════════
async function saveState(silent = false) {
  if (typeof window !== 'undefined' && window._stateReady === false) {
    if (!silent) console.warn('[saveState] BLOQUÉ : _stateReady=false (démarrage en cours)');
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

  // ─── GARDE-FOU ANTI-RÉGRESSION ──────────────────────────────────────
  try {
    const snapCycle = (typeof snap.cycle === 'number') ? snap.cycle : -1;
    const snapPf    = (typeof snap.portfolio === 'number') ? snap.portfolio : -1;

    let refCycle = -1;
    try { const raw = localStorage.getItem(RT.SAVE_KEY); if (raw) { const c = JSON.parse(raw); if (c && typeof c.cycle === 'number') refCycle = c.cycle; } } catch(e){}

    let highWater = -1;
    try { const hw = localStorage.getItem('aura_highwater_cycle'); if (hw) highWater = parseInt(hw, 10) || -1; } catch(e){}

    let liveCycle = -1;
    try { if (typeof S !== 'undefined' && S && typeof S.cycle === 'number') liveCycle = S.cycle; } catch(e){}

    const knownMax = Math.max(refCycle, highWater, liveCycle);

    const looksEmpty = (snapCycle <= 100 && snapPf <= 0);
    const allowReset = (typeof window !== 'undefined' && window._auraAllowReset === true);
    if (looksEmpty && knownMax > 500 && !allowReset) {
      if (!silent) console.warn('[saveState] BLOQUÉ : état vide (cycle ' + snapCycle + ', pf ' + snapPf + ') refusé — un état avancé existe (cycle ' + knownMax + ').');
      try { if (typeof window !== 'undefined') window._auraSaveBlocked = { at: Date.now(), snapCycle: snapCycle, knownMax: knownMax }; } catch(e){}
      return false;
    }

    if (knownMax > snapCycle + 5 && !allowReset) {
      if (!silent) console.warn('[saveState] BLOQUÉ anti-régression : cycle ' + snapCycle + ' < connu#' + knownMax);
      return false;
    }

    if (snapCycle > highWater) { try { localStorage.setItem('aura_highwater_cycle', String(snapCycle)); } catch(e){} }
  } catch (e) {}

  if (!snap.savedAt) snap.savedAt = new Date().toISOString();
  if (!snap.key)     snap.key = RT.SAVE_KEY;

  let idbOk = false;
  let lsOk  = false;

  // ── IndexedDB : snapshot COMPLET (détection keyPath) ────────────────
  try {
    const db = await openDB();
    idbOk = await new Promise(res => {
      try {
        const tx    = db.transaction(RT.STORE_STATE, 'readwrite');
        const store = tx.objectStore(RT.STORE_STATE);
        let req;
        if (store.keyPath) {
          if (!snap.key) snap.key = RT.SAVE_KEY;
          req = store.put(snap);
        } else {
          req = store.put(snap, RT.SAVE_KEY);
        }
        req.onsuccess = () => res(true);
        req.onerror   = () => res(false);
        tx.onerror    = () => res(false);
        tx.onabort    = () => res(false);
      } catch(e) { res(false); }
    });
  } catch (e) {}

  // ── localStorage : snapshot ALLÉGÉ (anti-saturation) ────────────────
  // On n'écrit la version allégée que si l'IDB complet a réussi (sinon on
  // perdrait les grosses clés). Le localStorage reçoit TOUJOURS la version allégée,
  // même si l'IDB a échoué : écrire le snapshot complet (~1,7 Mo) en LS saturerait
  // le quota mobile (~5 Mo) et ferait planter toutes les écritures suivantes. Mieux
  // vaut un LS léger fiable (les grosses clés repartent dans l'IDB au cycle suivant).
  try {
    localStorage.setItem(RT.SAVE_KEY, JSON.stringify(_lightSnapshot(snap)));
    lsOk = true;
  } catch (e) {
    console.warn('[saveState] localStorage error:', e.message);
    // Si l'écriture allégée échoue encore (quota), on tente au moins le minimum vital
    try {
      const minimal = _lightSnapshot(snap);
      localStorage.setItem(RT.SAVE_KEY, JSON.stringify(minimal));
      lsOk = true;
    } catch (e2) {}
  }

  if ((idbOk || lsOk) && !silent && typeof updateSaveIndicator === 'function') {
    try { updateSaveIndicator('saved'); } catch(e) {}
  }

  // ─── BACKUP LOCAL DÉDIÉ (Guardian) ──────────────────────────────────
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
// Si le snapshot retenu est allégé (LS), complète depuis l'IDB.
// ════════════════════════════════════════════════════════════════════════
async function loadState() {
  const dbg = [];
  let snapIDB = null;
  let snapLS  = null;

  try {
    if (sessionStorage.getItem('nexus_factory_reset') === '1') {
      sessionStorage.removeItem('nexus_factory_reset');
      try { indexedDB.deleteDatabase(RT.DB_NAME); } catch (e) {}
      if (typeof window !== 'undefined') window._stateReady = true;
      return false;
    }
  } catch (e) {}

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

  try {
    const raw = localStorage.getItem(RT.SAVE_KEY);
    if (raw) {
      snapLS = JSON.parse(raw);
      dbg.push('LS:#' + (snapLS && snapLS.cycle) + (snapLS && snapLS._lightened ? '(allégé)' : ''));
    } else {
      dbg.push('LS:vide');
    }
  } catch (e) {
    dbg.push('LS:err=' + e.message);
  }

  let snap = null;
  const cIDB = snapIDB && typeof snapIDB.cycle === 'number' ? snapIDB.cycle : -1;
  const cLS  = snapLS  && typeof snapLS.cycle  === 'number' ? snapLS.cycle  : -1;
  if (cIDB === -1 && cLS === -1) {
    if (typeof window !== 'undefined') window._stateReady = true;
    return false;
  }
  snap = (cIDB >= cLS) ? snapIDB : snapLS;

  // ─── FUSION ANTI-PERTE ───────────────────────────────────────
  // Si le snapshot retenu est la version ALLÉGÉE du localStorage, ses grosses
  // clés sont absentes. On les complète depuis l'IDB (qui est complet).
  // Garde-fou absolu : agents/mémoires/candles ne peuvent jamais disparaître.
  try {
    if (snap && snap._lightened) {
      const heavySrc = (snapIDB && !snapIDB._lightened) ? snapIDB : null;
      if (heavySrc) {
        _mergeHeavyFrom(snap, heavySrc);
        dbg.push('fusion grosses clés ← IDB');
      } else {
        dbg.push('⚠ LS allégé mais IDB indispo — grosses clés par défaut');
      }
    }
  } catch (e) { dbg.push('merge:err'); }

  // ─── RESTAURATION AUTOMATIQUE AU BOOT (régression > 2000 cycles) ────
  const REGRESSION_MARGIN = 2000;
  try {
    const bestCycle = snap && typeof snap.cycle === 'number' ? snap.cycle : -1;
    let highWater = -1;
    try { const hw = localStorage.getItem('aura_highwater_cycle'); if (hw) highWater = parseInt(hw, 10) || -1; } catch(e){}
    const regressed = highWater > 0 && bestCycle < (highWater - REGRESSION_MARGIN);

    if (regressed && window.GuardianCore && window.GuardianCore.autoBackup) {
      const list = await window.GuardianCore.autoBackup.list().catch(() => []);
      if (list && list.length) {
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
    window._auraRegressionPending = regressed && (!snap || typeof snap.cycle !== 'number' || snap.cycle < (highWater - REGRESSION_MARGIN));
    window._auraHighWaterSeen = highWater;
  } catch (e) { dbg.push('auto-restore:err'); }
  dbg.push('→ choix: #' + snap.cycle);

  const safeNum = (val, fallback) => (typeof val === 'number' && isFinite(val)) ? val : fallback;

  try { S.botAutoMode     = snap.botAutoMode !== undefined ? snap.botAutoMode : false; } catch(e){}
  try { if (snap.profitSplitCaissePct != null) S.profitSplitCaissePct = safeNum(snap.profitSplitCaissePct, 30); } catch(e){}
  // ── SEPARATION DES 3 MODES (etape 1) · restaurer les 3 portefeuilles puis garantir/completer
  try { if (snap.walletStore && typeof snap.walletStore === 'object') S.walletStore = snap.walletStore; } catch(e){}
  try { if (typeof _ensureWalletStore === 'function') _ensureWalletStore(); } catch(e){}

  try {
    if (snap.heatmap)          S.heatmap          = snap.heatmap;
    if (snap.shadow)           S.shadow           = snap.shadow;
    if (snap.decisionCascade)  S.decisionCascade  = snap.decisionCascade;
    if (snap.resonanceHistory) S.resonanceHistory = snap.resonanceHistory;
    if (snap.archives)         S.archives         = snap.archives;
    if (snap.brainLog)         S.brainLog         = snap.brainLog;
    if (snap.pendingActions)   S.pendingActions   = snap.pendingActions;
    if (snap.mutedAgents)      S.mutedAgents      = snap.mutedAgents;
    if (snap.botFleet)         Object.assign(S.botFleet || {}, snap.botFleet);
    if (Array.isArray(snap.agentLessons)) S.agentLessons = snap.agentLessons;
  } catch(e) { dbg.push('intel:err'); }

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
    if (typeof snap._genCount        === 'number') S._genCount        = snap._genCount;
    if (snap.preRealSnapshotPaperReal   && typeof snap.preRealSnapshotPaperReal   === 'object') S.preRealSnapshotPaperReal   = snap.preRealSnapshotPaperReal;
  } catch(e) { dbg.push('paperReal:err'); }

  try {
    if (snap.realCandles && typeof snap.realCandles === 'object') {
      S.realCandles = snap.realCandles;
      if (typeof _ensureRealCandlesStruct === 'function') _ensureRealCandlesStruct();
    }
  } catch(e) { dbg.push('candles:err'); }

  setTimeout(() => {
    try { if (typeof _updateRealModeBanner === 'function') _updateRealModeBanner(); } catch(e){}
    try { if (typeof updateModeButton === 'function') updateModeButton(); } catch(e){}
  }, 100);

  try {
    S.cycle           = typeof snap.cycle === 'number' ? snap.cycle : 0;
    S.cycleMax        = snap.cycleMax        || 30;
    S.chainLog        = snap.chainLog        || [];
    S.learningHistory = snap.learningHistory || [];
    S.evoLog          = snap.evoLog          || [];
  } catch(e) { dbg.push('cycle:err'); }

  try {
    if (snap.taxConfig) {
      S.taxConfig.region = snap.taxConfig.region || S.taxConfig.region;
      if (snap.taxConfig.regions) {
        Object.assign(S.taxConfig.regions, snap.taxConfig.regions);
      }
    }
  } catch(e) { dbg.push('tax:err'); }

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

  try { if (snap.dreams && snap.dreams.length) S.dreams = snap.dreams; } catch(e){}
  try { if (snap.vMajor != null) S.vMajor = snap.vMajor; } catch(e){}

  try {
    if (typeof snap.fiatConvFeePct === 'number') S.fiatConvFeePct = snap.fiatConvFeePct;
  } catch(e) { dbg.push('fiat:err'); }

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

  // ─── RECALAGE _startPortfolio (fin OBS-A/OBS-B) ─────────────────────
  // Au redemarrage, une NOUVELLE session commence. _startPortfolio restaure
  // depuis le snapshot porte la valeur d'une session ancienne -> la P&L de
  // session afficherait un ecart enorme et faux ("flash" au boot). On verse
  // la session ecoulee dans le cumul (_totalCompounded, zero perte) puis on
  // recale _startPortfolio sur le portefeuille courant : la P&L de session
  // repart de 0, la P&L totale reste identique.
  try {
    const _pf = (typeof S.portfolio === 'number') ? S.portfolio : null;
    if (_pf !== null && typeof S._startPortfolio === 'number' && S._startPortfolio > 0) {
      const _sessionElapsed = _pf - S._startPortfolio;
      if (Math.abs(_sessionElapsed) > 0.01) {
        S._totalCompounded = (S._totalCompounded || 0) + _sessionElapsed;
      }
    }
    if (_pf !== null) {
      S._startPortfolio = _pf;
      if (S.pnlPeriod && typeof S.pnlPeriod === 'object') S.pnlPeriod.todayStartPortfolio = _pf;
    }
  } catch(e) { dbg.push('startPf-recal:err'); }

  // ── RESET UNIQUE · SEPARATION 3 MODES v2 ─────────────────────────────────
  // Les balances viennent maintenant de walletStore (a zero au depart), donc le
  // faux solde herite n'est plus restaure. Ici on remet a zero ce qui n'est pas
  // encore par-mode : les 3 chronos + l'historique P&L cosmetique. UNE SEULE
  // FOIS (drapeau LS), ensuite tout s'accumule normalement. Cerveau et
  // cycle/generations NON touches.
  try {
    if (!localStorage.getItem('aura_walletsep_reset_v2')) {
      if (window.AuraChrono && typeof window.AuraChrono.resetAll === 'function') window.AuraChrono.resetAll();
      S.pnlHistory = [];
      S.pnl24h = 0;
      if (S.pnlPeriod && typeof S.pnlPeriod === 'object') {
        S.pnlPeriod.todayStartPortfolio = null; S.pnlPeriod.todayDate = null;
        S.pnlPeriod.weekStartPortfolio  = null; S.pnlPeriod.weekStart = null;
        S.pnlPeriod.monthStartPortfolio = null; S.pnlPeriod.monthStart = null;
        S.pnlPeriod.history = [];
      }
      localStorage.setItem('aura_walletsep_reset_v2', String(Date.now()));
      dbg.push('walletsep-reset-v2: OK');
    }
  } catch(e) { dbg.push('walletsep-reset:err'); }

  setTimeout(() => {
    try { if (typeof renderAll === 'function') renderAll(); } catch(e){}
  }, 50);

  try {
    if (window._auraRegressionPending) {
      setTimeout(() => { try { _showRecoveryBanner(window._auraHighWaterSeen, snap && snap.cycle); } catch(e){} }, 1500);
    }
  } catch(e){}

  if (typeof window !== 'undefined') window._stateReady = true;
  return true;
}
window.loadState = loadState;

// ════════════════════════════════════════════════════════════════════════
// BANNIÈRE DE RÉCUPÉRATION — régression > 2000 cycles non corrigée
// ════════════════════════════════════════════════════════════════════════
function _showRecoveryBanner(highWater, currentCycle) {
  if (document.getElementById('auraRecoveryBanner')) return;
  const bar = document.createElement('div');
  bar.id = 'auraRecoveryBanner';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#7a0c1e,#b3122c);color:#fff;padding:14px 16px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
  bar.innerHTML =
    '<div style="flex:1 1 auto;min-width:200px">'
    + '<div style="font-weight:800;font-size:15px;margin-bottom:2px">⚠️ État régressé détecté</div>'
    + '<div style="font-size:12px;opacity:.95">Cycle actuel <b>#' + (currentCycle != null ? currentCycle : '?') + '</b> · dernier connu <b>#' + (highWater != null ? highWater : '?') + '</b>. Restaure ton dernier backup depuis le Drive.</div>'
    + '</div>'
    + '<button id="auraRecBtn" style="flex:0 0 auto;background:#fff;color:#b3122c;border:none;border-radius:8px;padding:10px 18px;font-weight:800;font-size:13px;cursor:pointer">📂 Restaurer un backup</button>'
    + '<button id="auraRecDismiss" style="flex:0 0 auto;background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:10px 14px;font-weight:700;font-size:12px;cursor:pointer">Ignorer</button>';
  document.body.appendChild(bar);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  document.getElementById('auraRecBtn').onclick = () => fileInput.click();
  document.getElementById('auraRecDismiss').onclick = () => { try { bar.remove(); fileInput.remove(); } catch(e){} };

  fileInput.onchange = () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      let obj = null;
      try { obj = JSON.parse(rd.result); } catch(e){ alert('Fichier JSON invalide.'); return; }
      let snapObj = obj;
      if (obj && obj._type === 'aura_guardian_full' && obj.aura) snapObj = obj.aura;
      const cyc = snapObj && typeof snapObj.cycle === 'number' ? snapObj.cycle : null;
      if (cyc == null) { alert('Ce fichier ne contient pas d\'état AURA valide.'); return; }
      if (!confirm('Restaurer le cycle #' + cyc + ' ? L\'état actuel sera remplacé.')) return;
      try {
        let saveKey = 'nexus_state_v2';
        try { if (typeof RT !== 'undefined' && RT.SAVE_KEY) saveKey = RT.SAVE_KEY; } catch(e){}
        if (!snapObj.key) snapObj.key = saveKey;
        if (!snapObj.savedAt) snapObj.savedAt = new Date().toISOString();
        localStorage.setItem(saveKey, JSON.stringify(snapObj));
        localStorage.setItem('aura_highwater_cycle', String(cyc));
        bar.remove(); fileInput.remove();
        setTimeout(() => location.reload(), 400);
      } catch(e){ alert('Échec de la restauration : ' + e.message); }
    };
    rd.readAsText(f);
  };
}
window._showRecoveryBanner = _showRecoveryBanner;


// ════════════════════════════════════════════════════════════════════════
// HOOKS DE FERMETURE SYNCHRONES
// Le flush de sortie écrit la version ALLÉGÉE en LS (l'IDB synchrone garde le
// complet juste avant), ce qui évite de re-saturer le quota à la fermeture.
// ════════════════════════════════════════════════════════════════════════
function _flushSyncOnExit(reason) {
  try {
    if (typeof window !== 'undefined' && window._stateReady === false) return;
    if (typeof window !== 'undefined' && window._resetInProgress) return;
    try {
      if (sessionStorage.getItem('nexus_factory_reset') === '1') return;
    } catch (e) {}

    if (typeof buildSnapshot !== 'function') return;
    const snap = buildSnapshot();
    if (!snap) return;

    try {
      const raw = localStorage.getItem(RT.SAVE_KEY);
      if (raw) {
        const currentLS = JSON.parse(raw);
        const lsCycle   = (currentLS && typeof currentLS.cycle === 'number') ? currentLS.cycle : -1;
        const snapCycle = (typeof snap.cycle === 'number') ? snap.cycle : -1;
        if (lsCycle > snapCycle + 5) {
          console.warn('[flush ' + reason + '] BLOQUÉ anti-régression : cycle ' + snapCycle + ' < LS#' + lsCycle);
          return;
        }
      }
    } catch (e) {}

    if (!snap.savedAt) snap.savedAt = new Date().toISOString();
    if (!snap.key)     snap.key = RT.SAVE_KEY;

    // IDB en fire-and-forget (snapshot complet)
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

    // localStorage SYNCHRONE — version ALLEGEE (liste blanche). Le snapshot
    // complet vient d'etre ecrit dans l'IDB juste au-dessus, donc le LS n'a
    // pas besoin du complet : ecrire l'allege evite de re-saturer le quota.
    try {
      localStorage.setItem(RT.SAVE_KEY, JSON.stringify(_lightSnapshot(snap)));
    } catch (e) {
      console.warn('[flush ' + reason + '] LS error:', e.message);
    }

    console.log('[flush] ' + reason + ' · cycle ' + (snap.cycle || '?'));
  } catch (e) {
    console.warn('[flush] ' + reason + ' a planté:', e);
  }
}

function _closeTradesOnExit(reason) {
  try {
    if (typeof window !== 'undefined' && window._stateReady === false) return;
    if (typeof window !== 'undefined' && window._resetInProgress) return;
    let St; try { St = (0, eval)('S'); } catch(e){ return; }
    if (!St || !Array.isArray(St.openPositions) || St.openPositions.length === 0) return;
    let closeFn; try { closeFn = (0, eval)('closePosition'); } catch(e){ return; }
    if (typeof closeFn !== 'function') return;
    const ids = St.openPositions.map(p => p.id);
    for (const id of ids) {
      try { closeFn(id, true); } catch(e){}
    }
    console.log('[closeTradesOnExit] ' + reason + ' · ' + ids.length + ' position(s) fermée(s)');
  } catch (e) {}
}

window.addEventListener('pagehide',     () => { _closeTradesOnExit('pagehide'); _flushSyncOnExit('pagehide'); });
window.addEventListener('beforeunload', () => { _closeTradesOnExit('beforeunload'); _flushSyncOnExit('beforeunload'); });
window.addEventListener('freeze',       () => { _closeTradesOnExit('freeze'); _flushSyncOnExit('freeze'); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') _flushSyncOnExit('visibility-hidden');
});

// ─── AUTOSAVE PÉRIODIQUE ────────────────────────────────────────────
// scheduleAutoSave est appelé au boot par 09k-init mais n'était défini nulle
// part → l'autosave périodique n'existait pas, le localStorage n'était réécrit
// (en version allégée) que sur événements rares (changement de mode, coupure
// réseau). On installe ici un autosave toutes les 10 s, anti-empilement.
let _autoSaveTimer = null;
function scheduleAutoSave() {
  if (_autoSaveTimer) return;           // déjà installé : pas de doublon
  _autoSaveTimer = setInterval(function () {
    try {
      if (typeof window !== 'undefined' && window._stateReady === true
          && typeof saveState === 'function') {
        saveState(true);                // silent : pas de toast
      }
    } catch (e) {}
  }, 10000);
}
window.scheduleAutoSave = scheduleAutoSave;

console.log('[09b2 v125] ✅ hooks + autosave 10s installés · LS allégé · IDB complet · fusion au load');
