// ════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 09f4-bricks-utils.js ▓▓▓
// ════════════════════════════════════════════════════════════════════════
// UI Bricks utils — long-press fermeture, compteurs barres auto/man,
// restauration état ouvert/fermé des barres.
//
// Dépend de 09a-runtime-state.js (accès via window.RT).
// ════════════════════════════════════════════════════════════════════════


function _attachLongPressToBricks() {
  document.querySelectorAll('.action-brick, .pair-brick').forEach(brick => {
    if (brick.dataset.lpAttached === '1') return;
    brick.dataset.lpAttached = '1';

    const pair = brick.getAttribute('data-pair');
    if (!pair) return;

    const startFn = (e) => {
      // Long-press uniquement si une position est active sur la paire
      const pos = (S.openPositions || []).find(p => p.pair === pair);
      if (!pos) return;

      RT._longPressPair  = pair;
      RT._longPressTimer = setTimeout(() => {
        _showForceCloseConfirm(pair);
        RT._longPressTimer = null;
      }, RT.LONG_PRESS_MS);
    };

    const cancelFn = () => {
      if (RT._longPressTimer) {
        clearTimeout(RT._longPressTimer);
        RT._longPressTimer = null;
      }
    };

    brick.addEventListener('touchstart',  startFn, { passive: true });
    brick.addEventListener('touchend',    cancelFn);
    brick.addEventListener('touchmove',   cancelFn);
    brick.addEventListener('touchcancel', cancelFn);
    brick.addEventListener('mousedown',   startFn);
    brick.addEventListener('mouseup',     cancelFn);
    brick.addEventListener('mouseleave',  cancelFn);

    // Si le long-press s'est déclenché, intercepter le click pour ne pas ouvrir le détail
    brick.addEventListener('click', (e) => {
      if (RT._longPressTimer === null && RT._longPressPair === pair) {
        RT._longPressPair = null;
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  });
}
window._attachLongPressToBricks = _attachLongPressToBricks;


// ──────────────────────────────────────────────────────────────────────
// Mise à jour des compteurs des barres auto / man
// Nombre de positions actives + nombre de paires (hors paused)
// ──────────────────────────────────────────────────────────────────────
function _updateAutoBarCounters() {
  const autoBar      = document.getElementById('autoBar');
  const manBar       = document.getElementById('manBar');
  const autoCounter  = document.getElementById('autoBarCounter');
  const manCounter   = document.getElementById('manBarCounter');
  const autoPaircount = document.getElementById('autoBarPairCount');
  const manPaircount  = document.getElementById('manBarPairCount');

  const autoPositions = (S.openPositions || []).filter(p => p.auto === true).length;
  const manPositions  = (S.openPositions || []).filter(p => p.auto !== true).length;

  // Barre auto
  if (autoBar && autoCounter) {
    if (autoPositions > 0) {
      autoBar.classList.add('has-active');
      autoCounter.textContent = autoPositions + ' active' + (autoPositions > 1 ? 's' : '');
    } else {
      autoBar.classList.remove('has-active');
      autoCounter.textContent = 'En veille';
    }
  }

  // Barre manuel
  if (manBar && manCounter) {
    if (manPositions > 0) {
      manBar.classList.add('has-active');
      manCounter.textContent = manPositions + ' active' + (manPositions > 1 ? 's' : '');
    } else {
      manBar.classList.remove('has-active');
      manCounter.textContent = 'En veille';
    }
  }

  // Nombre de paires actives (total - paused)
  const totalPairs  = Object.keys(PAIRS).length;
  const pausedPairs = Object.keys(S._pausedPairs || {}).length;
  const pairText    = pausedPairs > 0
    ? (totalPairs - pausedPairs) + '/' + totalPairs + ' paires'
    : totalPairs + ' paires';
  if (autoPaircount) autoPaircount.textContent = pairText;
  if (manPaircount)  manPaircount.textContent  = pairText;
}
window._updateAutoBarCounters = _updateAutoBarCounters;


// ──────────────────────────────────────────────────────────────────────
// Restauration de l'état (ouverte/fermée) des barres au démarrage
// Lit la préférence stockée dans localStorage sous RT.BARS_KEY
// ──────────────────────────────────────────────────────────────────────
function _restoreAutoBarState() {
  const autoBar  = document.getElementById('autoBar');
  const manBar   = document.getElementById('manBar');
  const paramBar = document.getElementById('paramBar');
  if (!autoBar || !manBar) return;

  let saved = 'auto';
  try { saved = localStorage.getItem(RT.BARS_KEY) || 'auto'; } catch (e) {}

  autoBar.classList.remove('open');
  manBar.classList.remove('open');
  if (paramBar) paramBar.classList.remove('open');

  if      (saved === 'auto')                 autoBar.classList.add('open');
  else if (saved === 'man')                  manBar.classList.add('open');
  else if (saved === 'param' && paramBar)    paramBar.classList.add('open');
}
window._restoreAutoBarState = _restoreAutoBarState;
