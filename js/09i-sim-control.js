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
// À l'ouverture : le Brain se redessine à la vraie taille (dessiné à 0 px tant qu'il est replié, taille figée en style par 03
// initBrainNodes, et 03 startBrainAnim ne dessine qu'une fois), l'Intelligence et le journal se rafraîchissent.
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
    // 03 initBrainNodes fige la taille du canevas en style (largeur mesurée : 0 px tant que le volet est fermé) → on rend la taille au CSS (100 %) avant de redessiner
    try { const c = document.getElementById('brainCanvas'); if (c) { c.style.width = ''; c.style.height = ''; } } catch (e) {}
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
  if (!pg || !z || !pg.classList.contains('active')) return;   // seulement sur l'accueil affiché
  const top = Math.max(0, z.offsetTop - (nav ? nav.offsetHeight : 0));
  try { pg.scrollTo({ top, behavior: 'smooth' }); } catch (e) { pg.scrollTop = top; }
}
window._accFold = _accFold;
window._accGo = _accGo;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _accRestoreFolds);
else _accRestoreFolds();

// ──────────────────────────────────────────────────────────────────────
// [GO CSS · écran 2 · 14/11/2026] Écran Agents par priorité — En bref, nombre par famille, cartes compactes, matrice en volet.
// Rams 13/11 23:48 « Go css » (suite de l'accueil), maquette montrée puis « Ok » (14/11 00:17). Affichage seul : rien n'est lu
// ni écrit dans S, aucune décision touchée.
//  · _agBrefRender : En bref (bots = rôle 'execution', les maîtres ; analystes = les autres, comme les groupes de 07) — nombre, 1er au T$,
//    moyenne ; nombre de chaque famille sur son bouton de filtre (famille vide cachée) ; sous-titre de la matrice. Appelée par 08 renderAgents
//    (toutes les 5 s sur l'écran Agents) et par 02 goPage(1).
//  · cartes : compactes ; un appui ouvre la carte entière (courbe, score, série, mémoire), un 2e la referme ; le bandeau mémoire garde son
//    propre appui (showMemoryOverlay). À l'ouverture la courbe est redessinée à la vraie largeur (07 _agSpkResize). Les cartes ouvertes
//    le restent quand 07 reconstruit la liste (≤ 1/h, _agReopenCards).
//  · volet de la matrice : fermé par défaut, état gardé dans localStorage 'aura_agents_volets' (préférence d'affichage, hors snapshot) ;
//    à l'ouverture la matrice est redessinée (08 renderAgentHeatmap).
// ──────────────────────────────────────────────────────────────────────
const AG_FOLDS_KEY = 'aura_agents_volets';
const _agOpenCards = new Set();
function _agFoldState() {
  try { const o = JSON.parse(localStorage.getItem(AG_FOLDS_KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; }
}
function _agFold(name, force, silent) {
  const el = document.querySelector('#page1 .ag-fold[data-fold="' + name + '"]');
  if (!el) return false;
  const open = (typeof force === 'boolean') ? force : !el.classList.contains('open');
  el.classList.toggle('open', open);
  if (!silent) {
    const st = _agFoldState();
    if (open) st[name] = 1; else delete st[name];
    try { localStorage.setItem(AG_FOLDS_KEY, JSON.stringify(st)); } catch (e) {}
    if (open && name === 'matrice') { try { if (typeof renderAgentHeatmap === 'function') renderAgentHeatmap(); } catch (e) {} }
  }
  return open;
}
function _agRestoreFolds() {
  const st = _agFoldState();
  Object.keys(st).forEach(n => _agFold(n, true, true));
}
function _agBrefRender() {
  if (typeof S === 'undefined' || !S || !Array.isArray(S.agents)) return;
  const set = (id, t) => { const e = document.getElementById(id); if (e && e.textContent !== t) e.textContent = t; };
  const fit = a => Math.floor(Number(a.fitness) || 0);   // comme la carte (07) et la matrice (08) : T$ tronqué
  const role = a => a.role || 'fundamental';
  const bots = S.agents.filter(a => role(a) === 'execution'), ana = S.agents.filter(a => role(a) !== 'execution');
  const tuile = (arr, k) => {
    let best = null; arr.forEach(a => { if (!best || fit(a) > fit(best)) best = a; });
    const moy = arr.length ? Math.round(arr.reduce((s, a) => s + fit(a), 0) / arr.length) : 0;
    set('agBref' + k, String(arr.length));
    set('agBref' + k + 'Best', best ? '1er : ' + best.name : '—');
    set('agBref' + k + 'Sub', best ? fit(best) + ' T$ · moy. ' + moy : '—');
  };
  tuile(bots, 'Bots'); tuile(ana, 'Ana');
  const n = {}; S.agents.forEach(a => { n[role(a)] = (n[role(a)] || 0) + 1; });
  document.querySelectorAll('#agentFilterRow .agent-filter-btn').forEach(b => {
    const r = b.dataset.role, c = r === 'all' ? S.agents.length : (n[r] || 0);
    set('agFam_' + r, String(c));
    const vide = r !== 'all' && !c && !b.classList.contains('active');
    if (b.style.display !== (vide ? 'none' : '')) b.style.display = vide ? 'none' : '';
  });
  set('agMatriceSub', S.agents.filter(a => !a.isBot).length + ' analystes · score appris');
}
function _agCardTap(e) {
  const c = e.target && e.target.closest ? e.target.closest('.agent-card') : null;
  if (!c || e.target.closest('.memory-strip')) return;
  const open = c.classList.toggle('ag-open');
  if (open) _agOpenCards.add(c.id); else _agOpenCards.delete(c.id);
  if (open) {
    // la courbe était dessinée à la largeur de la carte compacte : 07 la redessine à la vraie largeur au prochain patch (≤ 1 s)
    if (typeof _agSpkResize !== 'undefined') _agSpkResize = true;
    try { c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) {}   // ouverte sur toute la largeur, elle peut passer à la ligne suivante : on la garde sous le doigt
  }
}
function _agReopenCards() {
  _agOpenCards.forEach(id => { const c = document.getElementById(id); if (c) c.classList.add('ag-open'); else _agOpenCards.delete(id); });
}
function _agInit() {
  const l = document.getElementById('mobileAgentList');
  if (l && !l.dataset.agTap) { l.dataset.agTap = '1'; l.addEventListener('click', _agCardTap); }
  _agRestoreFolds();
}
window._agFold = _agFold;
window._agBrefRender = _agBrefRender;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _agInit);
else _agInit();
