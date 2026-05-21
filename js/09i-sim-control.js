// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09i-sim-control.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Sim Control — toggleSim, stopSim, toggleBar.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION Sim Control
// Contrôle de la simulation et des barres UI :
//  - toggleSim          : bascule démarrage/arrêt de la sim
//  - stopSim            : arrête la sim, sauvegarde, libère le Wake Lock
//  - toggleFullPower    : bascule le mode "Plein régime"
//  - toggleBar(barName) : ouvre/ferme les barres auto/man/param
// ════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────
// Bascule démarrage / arrêt de la simulation
// ──────────────────────────────────────────────────────────────────────
function toggleSim() {
  if (RT._simRunning) stopSim();
  else             startSim();
}
window.toggleSim = toggleSim;


// ──────────────────────────────────────────────────────────────────────
// Arrêt de la simulation
// Libère le Wake Lock (l'écran peut s'éteindre), sauvegarde l'état,
// affiche un toast de confirmation et trace l'événement dans chainLog.
// ──────────────────────────────────────────────────────────────────────
function stopSim() {
  if (!RT._simRunning) return;

  RT._simRunning = false;
  clearInterval(RT._simInterval);
  RT._simInterval = null;

  updateSimBtn();

  // Libération du Wake Lock — l'écran peut s'éteindre
  _releaseWakeLock();

  updateSaveIndicator('saving');
  saveState(false).then(() =>
    showToast('⏸ Auto-apprentissage en pause · données sauvegardées', 2800, 'user')
  );

  S.chainLog.push({
    icon: '⏸',
    desc: 'Auto-apprentissage en pause · cycle #' + S.cycle,
    hash: rndHash(),
    time: nowStr()
  });
}
window.stopSim = stopSim;


// ──────────────────────────────────────────────────────────────────────
// Bascule du mode "Plein régime"
// Mise à jour synchronisée du bouton header (label + nombre de positions)
// ──────────────────────────────────────────────────────────────────────
window.toggleFullPower = function () {
  const btn = document.getElementById('fpBtn');

  if (S.fullPowerMode) {
    disableFullPowerMode();
    if (btn) {
      btn.classList.remove('active');
      btn.querySelector('span:last-child').textContent = 'Plein régime';
    }
  } else {
    const n = enableFullPowerMode();
    if (btn) {
      btn.classList.add('active');
      btn.querySelector('span:last-child').textContent = '100% · ' + n;
    }
  }
};


// ──────────────────────────────────────────────────────────────────────
// Gestion de l'ouverture / fermeture des 3 barres (auto / man / param)
// Comportement : si la barre demandée est ouverte → on la ferme.
//                Sinon on ferme les autres et on ouvre celle demandée.
// L'état est persisté dans localStorage sous RT.BARS_KEY.
// ──────────────────────────────────────────────────────────────────────
function toggleBar(barName) {
  const autoBar  = document.getElementById('autoBar');
  const manBar   = document.getElementById('manBar');
  const paramBar = document.getElementById('paramBar');
  if (!autoBar || !manBar) return;

  const closeAll = () => {
    autoBar.classList.remove('open');
    manBar.classList.remove('open');
    if (paramBar) paramBar.classList.remove('open');
  };

  if (barName === 'auto') {
    if (autoBar.classList.contains('open')) {
      autoBar.classList.remove('open');
      try { localStorage.setItem(RT.BARS_KEY, 'closed'); } catch (e) {}
    } else {
      closeAll();
      autoBar.classList.add('open');
      try { localStorage.setItem(RT.BARS_KEY, 'auto'); } catch (e) {}
    }
  } else if (barName === 'man') {
    if (manBar.classList.contains('open')) {
      manBar.classList.remove('open');
      try { localStorage.setItem(RT.BARS_KEY, 'closed'); } catch (e) {}
    } else {
      closeAll();
      manBar.classList.add('open');
      try { localStorage.setItem(RT.BARS_KEY, 'man'); } catch (e) {}
    }
  } else if (barName === 'param') {
    if (paramBar && paramBar.classList.contains('open')) {
      paramBar.classList.remove('open');
      try { localStorage.setItem(RT.BARS_KEY, 'closed'); } catch (e) {}
    } else if (paramBar) {
      closeAll();
      paramBar.classList.add('open');
      try { localStorage.setItem(RT.BARS_KEY, 'param'); } catch (e) {}
    }
  }
}
window.toggleBar = toggleBar;
