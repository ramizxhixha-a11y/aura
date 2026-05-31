// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09e-guards.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Garde-fous — stop urgence Plein Régime (-5% DD), watchdog manuel,
// évaluation perf paires (kill switch automatique).
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION Garde-fous
// Trois protections qui tournent en boucle pour automatiser des fermetures
// ou pauses quand certaines limites sont atteintes :
//  - _fpEmergencyCheck         : stop d'urgence Plein Régime sur drawdown
//  - _manConsignesWatchdog     : garde-fou positions manuelles (perte/timeout)
//  - _evaluatePairPerformance  : pause/reprise auto d'une paire selon WR
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Stop d'urgence Plein Régime
// Si le drawdown depuis l'activation atteint -5%, on coupe tout :
// désactivation du mode, fermeture de toutes les positions ouvertes,
// reset du snapshot pour permettre une réactivation manuelle propre.
// ──────────────────────────────────────────────────────────────────────
function _fpEmergencyCheck() {
  if (!S.fullPowerMode || !S._fpInitialCapital || S._fpStopTriggered) return;

  const curCap       = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  const latentPnl    = (S.openPositions || []).reduce((s, p) => s + (p.pnlUsdt || 0), 0);
  const effectiveCap = curCap + latentPnl;
  const drawdown     = (S._fpInitialCapital - effectiveCap) / S._fpInitialCapital;

  if (drawdown >= 0.05) {  // seuil critique : -5%
    S._fpStopTriggered = true;

    // 1. Désactiver Plein régime
    if (typeof disableFullPowerMode === 'function') disableFullPowerMode();
    const fpBtn = document.getElementById('fpBtn');
    if (fpBtn) {
      fpBtn.classList.remove('active');
      const span = fpBtn.querySelector('span:last-child');
      if (span) span.textContent = 'Plein régime';
    }

    // 2. Fermer toutes les positions ouvertes
    const positionsToClose = [...(S.openPositions || [])];
    positionsToClose.forEach(pos => {
      try {
        if (typeof closePosition === 'function') closePosition(pos.id, true);
      } catch (e) {
        console.warn('FP emergency close:', e);
      }
    });

    // 3. Log + toast
    S.chainLog.push({
      icon: '🚨',
      desc: `STOP D'URGENCE · Plein régime désactivé · drawdown ${(drawdown*100).toFixed(1)}% · ${positionsToClose.length} position(s) fermée(s)`,
      hash: rndHash(), time: nowStr()
    });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);

    if (typeof showToast === 'function') {
      showToast(
        '🚨 STOP URGENCE · −' + (drawdown*100).toFixed(1) + '% · Plein régime OFF + ' + positionsToClose.length + ' position(s) fermée(s)',
        5000, 'critical'
      );
    }

    // Reset du snapshot pour réactivation manuelle propre
    S._fpInitialCapital = null;
  }
}
window._fpEmergencyCheck = _fpEmergencyCheck;


// ──────────────────────────────────────────────────────────────────────
// Garde-fou positions manuelles
// Surveille les positions ouvertes en mode manuel et les ferme si :
//  - la perte dépasse le % max configuré (par défaut 2% du trading account)
//  - OU la durée dépasse le timeout configuré (par défaut 60 min)
// ──────────────────────────────────────────────────────────────────────
function _manConsignesWatchdog() {
  const positions = (S.openPositions || []).filter(p => p.auto !== true);

  positions.forEach(pos => {
    const pnlUsd     = pos.pnlUsdt || 0;
    const openedAt   = pos._manOpenedAt || pos.openedAt || pos.entryTs || Date.now();
    const elapsedMin = (Date.now() - openedAt) / 60000;

    const maxLossPct = pos._manMaxLossPct || 2.0;
    const timeoutMin = pos._manTimeoutMin || 60;

    // Perte exprimée en % du trading account
    const tradingCap     = S.tradingAccount || 1;
    const lossAsPctOfCap = Math.abs(Math.min(0, pnlUsd)) / tradingCap * 100;

    let reason = null;
    if (lossAsPctOfCap >= maxLossPct) {
      reason = `Perte max dépassée (${lossAsPctOfCap.toFixed(1)}% ≥ ${maxLossPct}%)`;
    } else if (elapsedMin >= timeoutMin) {
      reason = `Timeout atteint (${elapsedMin.toFixed(0)}min ≥ ${timeoutMin}min)`;
    }

    if (reason && typeof closePosition === 'function') {
      try {
        closePosition(pos.id, true);
        S.chainLog.push({
          icon: '🛡️',
          desc: `Garde-fou MAN · ${pos.pair} ${pos.side.toUpperCase()} fermé · ${reason}`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);

        if (typeof showToast === 'function') {
          showToast('🛡️ ' + pos.pair + ' fermé · ' + reason, 3500, 'warn');
        }
      } catch (e) {
        console.warn('man watchdog:', e);
      }
    }
  });
}
window._manConsignesWatchdog = _manConsignesWatchdog;


// ──────────────────────────────────────────────────────────────────────
// Évaluation périodique des performances par paire
// Tous les 50 trades clôturés sur une paire, on calcule le WR :
//  - WR < 40% → pause auto de la paire (signalée dans chainLog)
//  - WR >= 50% → reprise de la paire si elle était en pause
// Entre 40% et 50% : on ne change rien (zone neutre, évite oscillations).
// ──────────────────────────────────────────────────────────────────────
function _evaluatePairPerformance() {
  if (!S._pausedPairs)        S._pausedPairs        = {};
  if (!S._pairLastEvalCount)  S._pairLastEvalCount  = {};

  Object.keys(PAIRS).forEach(pair => {
    const ps = S.pairStates[pair];
    if (!ps) return;

    const closedTrades  = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
    const count         = closedTrades.length;
    const lastEvalCount = S._pairLastEvalCount[pair] || 0;

    // Évaluation tous les 50 trades clôturés
    if (count >= lastEvalCount + 50) {
      const recent  = closedTrades.slice(-50);
      const wins    = recent.filter(t => t.pnlUsdt > 0).length;
      const winRate = wins / recent.length * 100;

      // Pause si WR insuffisant
      if (winRate < 40 && !S._pausedPairs[pair]) {
        S._pausedPairs[pair] = { pausedAt: Date.now(), winRateAtPause: winRate };
        S.chainLog.push({
          icon: '⏸',
          desc: `Paire ${pair} désactivée · win rate ${winRate.toFixed(1)}% sur 50 derniers trades (seuil 40%)`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);

        if (typeof showToast === 'function') {
          showToast(`⏸ ${pair} mise en pause (win rate ${winRate.toFixed(0)}%)`, 3500, 'warn');
        }
      }
      // Reprise si WR remonté
      else if (winRate >= 50 && S._pausedPairs[pair]) {
        delete S._pausedPairs[pair];
        S.chainLog.push({
          icon: '▶',
          desc: `Paire ${pair} réactivée · win rate remonté à ${winRate.toFixed(1)}%`,
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }

      S._pairLastEvalCount[pair] = count;
    }
  });
}
window._evaluatePairPerformance = _evaluatePairPerformance;
