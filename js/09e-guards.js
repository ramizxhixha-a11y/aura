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
// [GO TALENT · 20/10/2026] (ETAT n° 57) Le capital mesuré ici comptait caisse + trading + réserve fiscale SANS les mises engagées. Or openPosition (02)
// sort la mise du trading : toute ouverture ≥ 5 % du capital passait pour une perte de 5 % → « STOP D'URGENCE », les positions du bot fermées (une
// position manuelle, jamais : 02 closePosition refuse au bot), Plein Régime éteint. Une seule mesure, à l'activation (10h enableFullPowerMode) comme à
// la vérification : _fpEquity = caisse + trading + réserve fiscale + réserve anti-négatif (sortie du trading à chaque ouverture, 09c holdTradeReserve) +
// mises engagées + P&L latent − dette du levier versée en argent (02 _levCashDebt : rendue au prêteur à la fermeture — la compter ferait une fausse
// perte au remboursement). Sans levier, sans position et sans réserve anti-négatif : le même nombre qu'avant.
function _fpEquity() {
  const eng    = (S.openPositions || []).reduce((s, p) => s + (Number(p && p.stakeUsdt) || 0), 0);
  const latent = (S.openPositions || []).reduce((s, p) => s + (Number(p && p.pnlUsdt) || 0), 0);
  const debt   = (typeof _levCashDebt === 'function') ? _levCashDebt(S) : 0;
  return (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0) + Math.max(0, Number(S.antiNegReserve) || 0) + eng + latent - debt;
}
window._fpEquity = _fpEquity;

function _fpEmergencyCheck() {
  if (!S.fullPowerMode || !S._fpInitialCapital || S._fpStopTriggered) return;

  const effectiveCap = _fpEquity();
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
  // [MANU · 05/10/2026] (1) Il fermait par closePosition(id, true) : la garde absolue de 02 refuse au BOT de fermer une manuelle → aucune
  // fermeture, mais le journal et le toast annonçaient « fermé » tous les 4 ticks (sonde du 05/10 : manuelle à 120 min pour 60, toujours
  // ouverte, ligne « Garde-fou MAN · fermé » écrite). Les consignes sont TA protection, comme ton TP / SL (07) : closePosition(id, false),
  // et rien n'est annoncé sans fermeture vérifiée (1 essai / 60 s sinon, dit une fois). (2) Seules les positions qui PORTENT des consignes
  // sont surveillées. [CONSIGNES · 06/10/2026] Depuis go consignes, TOUTE ouverture manuelle en porte (02 openPosition : tes consignes de la
  // paire, sinon 2 % / 60 min) ; seule une manuelle ouverte avant cette version peut encore n'en avoir aucune (la fiche le dit).
  const positions = (S.openPositions || []).filter(p => p.auto !== true && (p._manMaxLossPct > 0 || p._manTimeoutMin > 0));

  positions.forEach(pos => {
    const pnlUsd     = pos.pnlUsdt || 0;
    const openedAt   = pos._manOpenedAt || pos.openedAt || pos.entryTs || Date.now();
    const elapsedMin = (Date.now() - openedAt) / 60000;

    const maxLossPct = pos._manMaxLossPct > 0 ? pos._manMaxLossPct : null;
    const timeoutMin = pos._manTimeoutMin > 0 ? pos._manTimeoutMin : null;

    // Perte exprimée en % du trading account
    const tradingCap     = S.tradingAccount || 1;
    const lossAsPctOfCap = Math.abs(Math.min(0, pnlUsd)) / tradingCap * 100;

    let reason = null;
    if (maxLossPct !== null && lossAsPctOfCap >= maxLossPct) {
      reason = `Perte max dépassée (${lossAsPctOfCap.toFixed(1)}% ≥ ${maxLossPct}%)`;
    } else if (timeoutMin !== null && elapsedMin >= timeoutMin) {
      reason = `Timeout atteint (${elapsedMin.toFixed(0)}min ≥ ${timeoutMin}min)`;
    }
    if (!reason || typeof closePosition !== 'function') return;
    if (pos._manWdFailAt && (Date.now() - pos._manWdFailAt) < 60000) return;

    let err = null;
    // [GO ALERTES · 15/10/2026] la perte max de tes consignes est un stop : raison passée aux notifications (« 🎯 TP / SL atteint ») et à Telegram
    const _sortie = (maxLossPct !== null && lossAsPctOfCap >= maxLossPct) ? { sortie: { k: 'sl', why: 'perte max (consigne)' } } : undefined;
    try { closePosition(pos.id, false, _sortie); } catch (e) { err = e; }
    const gone = !(S.openPositions || []).some(p => p && p.id === pos.id);
    if (gone) {
      S.chainLog.push({
        icon: '🛡️',
        desc: `Garde-fou MAN · ${pos.pair} ${pos.side.toUpperCase()} fermé · ${reason}`,
        hash: rndHash(), time: nowStr()
      });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      if (typeof showToast === 'function') {
        showToast('🛡️ ' + pos.pair + ' fermé · ' + reason, 3500, 'warn');
      }
    } else {
      pos._manWdFailAt = Date.now();
      pos._manWdFails = (pos._manWdFails || 0) + 1;
      if (pos._manWdFails === 1 || pos._manWdFails % 10 === 0) {
        S.chainLog.push({
          icon: '⚠',
          desc: `Garde-fou MAN · ${pos.pair} · ${reason} · fermeture NON aboutie (essai ${pos._manWdFails})` + (err ? ' · ' + String(err.message || err).slice(0, 80) : ''),
          hash: rndHash(), time: nowStr()
        });
        if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
      }
      try { window._decErr && window._decErr(err || new Error('garde-fou MAN : fermeture non aboutie ' + pos.pair)); } catch (_e) {}
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
