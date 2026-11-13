// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09i-sim-control.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// Sim Control — stopSim, toggleBar. (toggleSim vit dans 01-chrono-network — version par-mode)
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════
// SECTION Sim Control
// Contrôle de la simulation et des barres UI :
//  - stopSim            : arrête la sim, sauvegarde, libère le Wake Lock
//  - toggleFullPower    : bascule le mode "Plein régime"
//  - toggleBar(barName) : ouvre/ferme les barres auto/man/param
// ════════════════════════════════════════════════════════════════════════


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
    if (btn) btn.classList.remove('active');
  } else {
    enableFullPowerMode();
    if (btn) btn.classList.add('active');
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

// ──────────────────────────────────────────────────────────────────────
// [GO CSS · 13/11/2026] Accueil en zones — volets repliables mémorisés + sommaire collant.
// Rams 13/11 « Go css » (chaque écran par priorité, défilement pensé), maquette validée « Ok » (22:23).
// Volets : Détails techniques, Brain Network, Intelligence, Journal de bord, Twin Live — fermés par défaut,
// l'état ouvert est gardé dans localStorage 'aura_accueil_volets' (préférence d'affichage, hors snapshot).
// À l'ouverture : le Brain se redessine à la vraie taille (dessiné à 0 px tant qu'il est replié,
// 03 startBrainAnim ne dessine qu'une fois), l'Intelligence et le journal se rafraîchissent.
// ──────────────────────────────────────────────────────────────────────
const ACC_FOLDS_KEY = 'aura_accueil_volets';
function _accFoldState() {
  try { const o = JSON.parse(localStorage.getItem(ACC_FOLDS_KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; }
}
function _accFold(name, force, silent) {
  const el = document.querySelector('#page0 .acc-fold[data-fold="' + name + '"]');
  if (!el) return false;
  const open = (typeof force === 'boolean') ? force : !el.classList.contains('open');
  el.classList.toggle('open', open);
  if (!silent) {
    const st = _accFoldState();
    if (open) st[name] = 1; else delete st[name];
    try { localStorage.setItem(ACC_FOLDS_KEY, JSON.stringify(st)); } catch (e) {}
    if (open) _accFoldOpened(name);
  }
  return open;
}
function _accFoldOpened(name) {
  if (name === 'brain') {
    try { if (typeof stopBrainAnim === 'function') stopBrainAnim(); _brainStaticDrawn = false; if (typeof startBrainAnim === 'function') startBrainAnim(); } catch (e) {}
  } else if (name === 'intel') {
    try { if (typeof renderAnalyticsPanel === 'function') renderAnalyticsPanel(); } catch (e) {}
  } else if (name === 'journal') {
    try { if (typeof renderJournal === 'function') renderJournal(); } catch (e) {}
  }
}
// Au démarrage : rouvre (sans redessiner) les volets laissés ouverts ; le premier dessin du Brain (09k) se fait alors à la vraie taille.
function _accRestoreFolds() {
  const st = _accFoldState();
  Object.keys(st).forEach(n => _accFold(n, true, true));
}
// Sommaire : amène la zone sous le sommaire collant.
function _accGo(zoneId) {
  const pg = document.getElementById('page0'), z = document.getElementById(zoneId), nav = document.getElementById('accNav');
  if (!pg || !z) return;
  const top = Math.max(0, z.offsetTop - (nav ? nav.offsetHeight : 0));
  try { pg.scrollTo({ top, behavior: 'smooth' }); } catch (e) { pg.scrollTop = top; }
}
window._accFold = _accFold;
window._accGo = _accGo;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _accRestoreFolds);
else _accRestoreFolds();
