// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09j-helpers.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Helpers divers — A/B testing, snapshots auto, save pré-action,
// résumé capital, marqueur prix réel, reset P&L session,
// validation exposition / cap provisionné.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION Helpers divers
// Fonctions utilitaires pour A/B testing, snapshots auto, sauvegarde
// pré-action, résumé capital, marqueur réseau, reset P&L, validation
// d'exposition. Petites fonctions à responsabilité unique.
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// A/B testing : enregistrement du résultat d'un trade
// Met à jour les compteurs trades/wins/losses/pnl de l'arm choisi,
// puis vérifie si le seuil de comparaison est atteint pour produire un verdict.
// ──────────────────────────────────────────────────────────────────────
function _abRecordResult(arm, pnlPct, pnlUsd) {
  if (!S.abTesting) return;

  const target = (arm === 'B') ? S.abTesting.armB : S.abTesting.armA;
  if (!target) return;

  target.trades = (target.trades || 0) + 1;
  target.pnl    = (target.pnl    || 0) + pnlUsd;
  if (pnlPct >= 0) target.wins   = (target.wins   || 0) + 1;
  else             target.losses = (target.losses || 0) + 1;

  // Lancement du verdict quand chaque arm a accumulé assez de trades
  const cfg       = S.paperRealConfig || {};
  const threshold = cfg.abTestingTradesPerArm || 50;
  if (S.abTesting.armA.trades >= threshold && S.abTesting.armB.trades >= threshold) {
    _abComputeVerdict();
  }
}
window._abRecordResult = _abRecordResult;


// ──────────────────────────────────────────────────────────────────────
// Snapshots automatiques avant action sensible / après fermeture de trade
// ──────────────────────────────────────────────────────────────────────
function _autoSnapshotBeforeLeverage() { _maybeCreateAutoSnapshot('leverage'); }
window._autoSnapshotBeforeLeverage = _autoSnapshotBeforeLeverage;

function _autoSnapshotOnTradeClose() { _maybeCreateAutoSnapshot('trade_close'); }
window._autoSnapshotOnTradeClose = _autoSnapshotOnTradeClose;


// ──────────────────────────────────────────────────────────────────────
// Sauvegarde multi-storage avant action critique du bot
// Filet de sécurité : si l'action plante, on a un point de retour récent
// ──────────────────────────────────────────────────────────────────────
function _p5PreActionSave(action) {
  try {
    _p5MultiStorageSave();
  } catch (e) {
    console.warn('preAction save failed:', e);
  }
}
window._p5PreActionSave = _p5PreActionSave;


// ──────────────────────────────────────────────────────────────────────
// Résumé de l'exposition capital
// Retourne { staked, maxAllowed, usedPct, free }
// ──────────────────────────────────────────────────────────────────────
function getCapitalSummary() {
  const staked     = S.openPositions.reduce((s, p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  const maxAllowed = S.tradingAccount + (S.leverageReserve || 0);
  const usedPct    = maxAllowed > 0 ? Math.min(100, staked / maxAllowed * 100) : 0;
  return {
    staked,
    maxAllowed,
    usedPct,
    free: Math.max(0, maxAllowed - staked)
  };
}
window.getCapitalSummary = getCapitalSummary;


// ──────────────────────────────────────────────────────────────────────
// Marqueur de réception d'un prix réel (CG ou Binance, pas sim)
// Gère la reprise après coupure réseau : 3 prix frais consécutifs requis
// pour considérer la connexion rétablie. Redémarre le bot si on l'avait pausé.
// ──────────────────────────────────────────────────────────────────────
function markRealPriceReceived() {
  RT._lastRealPriceTs = Date.now();

  if (RT._netwatchState === 'offline') {
    RT._freshPricesInRow++;
    if (RT._freshPricesInRow >= 3) {
      // Reprise confirmée
      RT._netwatchState        = 'online';
      RT._net10sSaveTriggered  = false;
      RT._netOfflineSinceTs    = 0;

      // Déblocage du bot : le flag S._netPaused empêchait les ouvertures
      if (typeof S !== 'undefined' && S) {
        S._netPaused      = false;
        S._netToastShown  = false;
      }

      _updateNetIndicator();

      // Si on avait pausé le bot, on le redémarre
      if (RT._netwatchPausedBot && !RT._simRunning) {
        RT._netwatchPausedBot = false;
        if (typeof startSim === 'function') {
          try { startSim(); } catch (e) {}
        }
        // Trace dans chainLog (pas de toast, c'est normal)
        S.chainLog.push({
          icon: '🟢',
          desc: 'Connexion rétablie · bot reprend',
          hash: rndHash(),
          time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      RT._netwatchPausedBot = false;
    }
  } else {
    RT._freshPricesInRow = 0;
  }
}
window.markRealPriceReceived = markRealPriceReceived;


// ──────────────────────────────────────────────────────────────────────
// Reset des compteurs de P&L (session + journalier)
// L'apprentissage du bot (fitness agents, génération, leçons) est préservé.
// ──────────────────────────────────────────────────────────────────────
function resetPnlSession() {
  if (!confirm('Recalibrer les compteurs de P&L ? L\'apprentissage du bot ne sera PAS perdu.')) return;

  const current = S.portfolio || 0;

  // Reset session (affichage heroPnlBadge)
  S._startPortfolio = current;
  S.pnl24h          = 0;

  // Reset journalier
  if (!S.pnlPeriod) S.pnlPeriod = { history: [] };
  S.pnlPeriod.todayStartPortfolio = current;
  S.pnlPeriod.todayDate           = _getTodayKey();

  if (typeof showToast === 'function') {
    showToast('🔄 Compteurs P&L recalibrés · Apprentissage préservé', 4000, 'win');
  }

  try { if (typeof saveState === 'function') saveState(); } catch (e) {}
  try { if (typeof renderHome === 'function') renderHome(); } catch (e) {}
}
window.resetPnlSession = resetPnlSession;


// ──────────────────────────────────────────────────────────────────────
// Validation du plafond d'investissement provisionné
// Deux modes :
//  - Avec levier emprunté : cap = levier emprunté − pertes max prévues
//  - Sans levier         : cap = tradingAccount − sommes engagées
// ──────────────────────────────────────────────────────────────────────
function validateInvestmentCapProvisioned(proposedStake) {
  if (!proposedStake || proposedStake <= 0) {
    return { ok: true, cap: Infinity, mode: 'noop' };
  }

  const engaged        = (S.openPositions || []).reduce((s, p) => s + (p.stakeUsdt || 0), 0);
  const maxLossesOpen  = engaged;  // worst-case : 100% loss par position ouverte
  const borrowed       = S.leverageBorrowed || 0;

  if (borrowed > 0) {
    // Mode levier actif : cap = levier emprunté − pertes max prévues
    const cap = Math.max(0, borrowed - maxLossesOpen);
    return {
      ok:             proposedStake <= cap,
      cap,
      mode:           'leverage',
      engaged,
      maxLossesOpen,
      borrowed
    };
  }

  // Mode sans levier : cap = tradingAccount − sommes engagées
  const cap = Math.max(0, (S.tradingAccount || 0) - engaged);
  return {
    ok:             proposedStake <= cap,
    cap,
    mode:           'no_leverage',
    engaged,
    tradingAccount: S.tradingAccount
  };
}
window.validateInvestmentCapProvisioned = validateInvestmentCapProvisioned;


// ──────────────────────────────────────────────────────────────────────
// Validation de l'exposition totale avec auto-limitation par conviction
//
// Le bot s'auto-limite à 80% du capital max pour garder une marge de sécurité.
// Exception : si la conviction du trade est > 0.75 (signal très fort), il peut
// monter à 100%. Cette règle s'applique TOUJOURS, même hors Plein régime,
// pour que le bot apprenne à garder de la marge même en mode normal.
//
// Validations en cascade :
//  1. Plafond brut : maxAllowed × 1.02 (2% de marge pour arrondis)
//  2. Auto-cap conviction : maxAllowed × 0.80 (ou 1.00 si conviction > 0.75)
//  3. Phase 5 : règle sizing conforme à validateInvestmentCapProvisioned
// ──────────────────────────────────────────────────────────────────────
function validateTotalExposure(proposedStake, proposedLevBonus, proposedConviction) {
  const alreadyStaked   = S.openPositions.reduce((s, p) => s + (p.totalExposure || p.stakeUsdt || 0), 0);
  const alreadyBorrowed = S.leverageBorrowed || 0;
  const maxAllowed      = S.tradingAccount + (S.leverageReserve || 0);
  const newExposure     = (proposedStake || 0) + (proposedLevBonus || 0);
  const totalAfter      = alreadyStaked + newExposure;

  // 1. Plafond brut absolu
  if (totalAfter > maxAllowed * 1.02) {
    const available = Math.max(0, maxAllowed - alreadyStaked);
    return { ok: false, available, maxAllowed, alreadyStaked, totalAfter };
  }

  // 2. Auto-cap conviction : 80% par défaut, 100% si signal très fort
  const _convForCap = (typeof proposedConviction === 'number' && !isNaN(proposedConviction))
                      ? proposedConviction
                      : 0.5;
  const _useFullCap = _convForCap > 0.75;
  const _cap        = _useFullCap ? 1.00 : 0.80;
  const leverageCap = maxAllowed * _cap;

  if (totalAfter > leverageCap) {
    const available = Math.max(0, leverageCap - alreadyStaked);
    return {
      ok:             false,
      available,
      maxAllowed:     leverageCap,
      alreadyStaked,
      totalAfter,
      autoCap:        true,
      capLevel:       _cap,
      convictionUsed: _convForCap
    };
  }

  // 3. Validation Phase 5 (cap selon mode levier/non-levier)
  const _p5 = validateInvestmentCapProvisioned(proposedStake || 0);
  if (!_p5.ok) {
    return {
      ok:         false,
      available:  _p5.cap,
      maxAllowed,
      alreadyStaked,
      totalAfter,
      phase5:     true,
      phase5Mode: _p5.mode,
      phase5Cap:  _p5.cap
    };
  }

  return { ok: true, available: maxAllowed - alreadyStaked };
}
window.validateTotalExposure = validateTotalExposure;
