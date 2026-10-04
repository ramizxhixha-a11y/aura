// [MANU · 05/10/2026] VERSION 20261005a · fiche MAN : décision commune, seuil appris, règle de sortie et de mise des bots, TP / SL en % appliqués au sens cliqué, rafraîchie toutes les 2 s
// ▓▓▓ VERSION 20260908a ▓▓▓
// 10h-pont-fullpower-bricks.js — Pont Claude, Plein Régime (enable), loadAllTrades, détail MAN, briques d'action
// [DÉCOUPE 10 · 09/08/2026] Tranche de 10-fin-bloc-restauration-v93.js (lignes 2317-2792 de l'original).
// Ordre de chargement OBLIGATOIRE : 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.
// [PHASE 0 · 08/09/2026] Bloc « Pont Claude » réécrit (sécurité) : voie « boîte de dépôt publique » et
// voie « token GitHub » retirées. Tout le reste (enableFullPowerMode → renderActionBricks) est byte-identique à la tranche d'origine.


// ═══ PONT CLAUDE · EXPORT DEPUIS AURA (05/07/2026 · réécrit phase 0, 08/09/2026) ═══
// Le bouton vit DANS AURA : cette page EST l'état vivant, donc l'export est
// frais PAR CONSTRUCTION. Enveloppe identique au backup Guardian -> même lecteur
// côté Claude. Nom FIXE : aura_live.json.
// Phase 0 : le fichier ne quitte plus l'appareil tout seul (plus de dépôt sur une
// boîte publique tierce, plus de push GitHub par jeton en localStorage).
// Une seule voie, celle du backup (09b3 _shareOrDownloadJSON) : écriture native
// Download/AURA (APK), sinon feuille de partage Android, sinon téléchargement
// (navigateur). Rams joint ensuite aura_live.json à la conversation Claude.
var _PONT_V = 'v5.0';   // ★ VERSION VISIBLE dans la barre et les toasts : une capture suffit à savoir quel code tourne.
// [A20] Jeton GitHub résiduel des Ponts ≤ v4.0 (envoi direct au repo, retiré) : purgé à chaque lancement.
try { localStorage.removeItem('aura_claude_gh_token'); } catch(e){}
function exportForClaude() {
  try {
    var snap = (typeof buildSnapshot === 'function') ? buildSnapshot()
             : (window.buildSnapshot ? window.buildSnapshot() : null);
    if (!snap) { try { showToast('Export impossible : etat non pret', 3000, 'warn'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} } return; }
    var payload = {
      _type: 'aura_guardian_full',
      version: 'aura-embed-1',
      savedAt: new Date().toISOString(),
      auraCycle: (typeof snap.cycle === 'number') ? snap.cycle : null,
      auraSource: 'aura-live',
      auraSavedAt: snap.savedAt || null,
      aura: snap,
      guardian: null
    };
    var cyc = payload.auraCycle || '?';
    _shareOrDownloadJSON(JSON.stringify(payload), 'aura_live.json').then(function(res){
      var m;
      if (res === 'fs-written')      m = '\u2705 [' + _PONT_V + '] aura_live.json \u00b7 cycle ' + cyc + ' \u2014 Download/AURA \u00b7 joins-le \u00e0 Claude';
      else if (res === 'shared')     m = '\u2705 [' + _PONT_V + '] Partag\u00e9 \u00b7 cycle ' + cyc + ' \u2014 choisis Claude';
      else if (res === 'downloaded') m = '\u2705 [' + _PONT_V + '] aura_live.json \u00b7 cycle ' + cyc + ' \u2014 dans T\u00e9l\u00e9chargements';
      else if (res === 'cancelled')  return;
      else                            m = '\u26D4 [' + _PONT_V + '] Export \u00e9chou\u00e9 \u00b7 ' + String(window._fsLastDiag || 'aucune voie disponible').slice(0, 160);
      try { showToast(m, 6000, (res === 'fs-written' || res === 'shared' || res === 'downloaded') ? 'win' : 'warn'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
    });
  } catch(e) { try { showToast('Export Claude : erreur', 3000, 'warn'); } catch(_) {} }
}
window.exportForClaude = exportForClaude;

// Bouton injecte dans le panneau Outils Avances (sous les onglets, visible partout)
(function _injectClaudeExport(){
  function put(){
    try {
      if (document.getElementById('claudeExportBar')) return true;
      var tabs = document.querySelector('#outilsPanel .outils-tabs');
      if (!tabs) return false;
      var bar = document.createElement('div');
      bar.id = 'claudeExportBar';
      bar.style.cssText = 'padding:8px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(120,180,255,.12);';
      bar.innerHTML = '<button onclick="exportForClaude()" style="flex:0 0 auto;padding:7px 12px;border-radius:9px;border:1.5px solid rgba(56,212,245,.5);background:rgba(56,212,245,.10);color:#38d4f5;font-weight:800;font-size:12px;">\uD83D\uDCE4 Export pour Claude</button>'
        + '<span style="font-size:10px;color:var(--t3,#8899aa);line-height:1.35;"><b style="color:#38d4f5;">Pont ' + _PONT_V + '</b> \u00b7 aura_live.json \u00b7 \u00e9tat VIVANT \u00b7 \u00e9crit dans Download/AURA (natif), sinon partage / t\u00e9l\u00e9chargement</span>';
      tabs.insertAdjacentElement('afterend', bar);
      return true;
    } catch(e) { return false; }
  }
  if (!put()) { var iv = setInterval(function(){ if (put()) clearInterval(iv); }, 1500); setTimeout(function(){ clearInterval(iv); }, 30000); }
})();

function enableFullPowerMode() {
  if (!S || !S.agents) return;
  
  const initCap = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.fiscalReserveAccount || 0);
  S._fpInitialCapital = initCap;
  S._fpStopTriggered = false;
  
  // [FIX BUG-002 + PROTECTION DONNEES · 05/08/2026]
  // 1) S.botAutoMode est l'axe UTILISATEUR : le bot/les modes n'y touchent JAMAIS (retire).
  // 2) L'ancienne version ECRASAIT la fitness de TOUS les agents a 2000, conf 0.99,
  //    erreurs 0 — destruction irreversible de l'apprentissage (a garder « a vie »),
  //    et effet domino : tout le monde « fort » -> redistributions « X forts -> 0
  //    faibles » brulant 130-230 T$ en boucle. Plein Regime est desormais un FLAG
  //    (S.fullPowerMode) que les ouvreurs consultent — il ne falsifie plus les donnees.
  const count = S.agents.length;
  S.fullPowerMode = true;
  S.fullPowerSince = Date.now();
  
  try {
    if (typeof renderHome === 'function') renderHome();
    if (typeof updateStreakBadge === 'function') updateStreakBadge();
    if (typeof renderAgentsSection === 'function') renderAgentsSection();
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  
  if (typeof showToast === 'function') {
    showToast('⚡ PLEIN RÉGIME · ' + count + ' agents/bots @ 100%', 'up');
  }
  return count;
}
window.enableFullPowerMode = enableFullPowerMode;
if(typeof enableFullPowerMode==='function') window.enableFullPowerMode = enableFullPowerMode;

async function loadAllTrades() {
  try {
    const db = await openDB();
    return new Promise((res) => {
      const req = db.transaction(RT.STORE_TRADES, 'readonly').objectStore(RT.STORE_TRADES).getAll();
      req.onsuccess = e => res(e.target.result || []);
      req.onerror   = () => res([]);
    });
  } catch(e) { return []; }
}
if(typeof loadAllTrades==='function') window.loadAllTrades = loadAllTrades;

// ═══ [MANU · 05/10/2026] FICHE MAN : l'intelligence du système, des boutons qui font ce qu'ils disent ═══
// Sonde du 05/10 (vraie app, backup du 04/10 21:04, clics réels dans Chromium) — la fiche d'avant :
//  · « Suggestion bot » = le LMSR seul (une voix parmi 10), pas la décision commune ; « Force 6 % » mais « LONG » quand même ;
//  · ATR 0,00 % : ps.atr n'existe nulle part (repli 0,01 $) → TP / SL toujours aux planchers posés à la main 0,8 % / 0,5 % ;
//  · TP / SL en PRIX pour le sens suggéré, appliqués au sens cliqué (10e) → l'autre sens fermé au tick suivant ; « TP ($) » pour un prix ;
//  · rien ne se rafraîchissait (« en temps réel ») ; ✕ et fond ne fermaient pas (03 closePairDetail).
// Désormais : direction et force = la DÉCISION COMMUNE de la paire (10f ps._dc : toutes les voix pesées par leur bilan) ; seuil appris (03
// _thLevel) et verdict « les bots ouvriraient » ; TP / SL en % = la règle de sortie des bots (10f : conviction + signaux techniques du sens +
// volatilité du moment) ; mise = la part du capital libre de la paire (règle d'engagement des bots, 10f) ; les avis contraires (02
// _manOpenWarnings) affichés AVANT le clic ; bloc système rafraîchi toutes les 2 s tant que la fiche est ouverte. Rien de tout cela ne
// décide à ta place : en MANU, le bot ne fait que suggérer, surveiller et protéger (règles du 05/07).
function _manFmtPx(pair, px) {
  const cfg = (typeof PAIRS !== 'undefined' && PAIRS[pair]) || {};
  px = Number(px);
  if (!isFinite(px) || px <= 0) return '—';
  if (px >= 1000) return '$' + Math.round(px).toLocaleString();
  return px.toFixed(cfg.dec >= 4 ? cfg.dec : (px >= 1 ? 2 : 4));
}
window._manFmtPx = _manFmtPx;

// Lecture du système pour une paire. light = sans indicateurs techniques ni seuil (briques MAN, 10 paires à chaque rendu).
function _manPlan(pair, light) {
  const ps = S.pairStates && S.pairStates[pair], cfg = (typeof PAIRS !== 'undefined') ? PAIRS[pair] : null;
  if (!ps || !cfg) return null;
  const now = Date.now();
  // 1 · décision commune de la paire (10f, à chaque cycle) ; le LMSR seulement si elle n'a jamais été calculée
  const dc = (ps._dc && typeof ps._dc.C === 'number' && isFinite(ps._dc.C)) ? ps._dc : null;
  let C, src, n = 0, age = null;
  if (dc) { C = dc.C; src = 'dc'; n = dc.n || 0; age = dc.ts ? Math.max(0, now - dc.ts) : null; }
  else { const pr = (typeof lmsrP === 'function') ? lmsrP(ps) : 0.5; C = (pr - 0.5) * 2; src = 'lmsr'; }
  C = Math.max(-1, Math.min(1, Number(C) || 0));
  const dir = C > 0 ? 'long' : (C < 0 ? 'short' : null), conv = Math.abs(C);
  // 2 · mise : la part du capital libre revenant à la paire (10f, engagement quasi-total), plafonnée au libre
  const acc = S.tradingAccount || 0, capT = Math.max(0, acc - Math.max(1, acc * 0.02));
  const eng = (S.openPositions || []).reduce((a, p) => a + (Number(p && p.stakeUsdt) || 0), 0);
  const free = Math.max(0, capT - eng), held = {};
  (S.openPositions || []).forEach(p => { if (p && p.pair) held[p.pair] = 1; });
  const slots = Object.keys(S.pairStates || {}).filter(k => !held[k]).length;
  const share = free / Math.max(2, slots), floor = (ps.stake && ps.stake > 0) ? ps.stake : 0;
  const stake = Math.floor(Math.min(free, Math.max(floor, share)) * 10) / 10;
  const plan = { pair, price: Number(ps.price) || 0, C, conv, dir, src, n, age, stake, free };
  if (light) return plan;
  // 3 · TP / SL : la règle de sortie des bots (10f tpPctE / slPctE), pour chaque sens avec le bonus des signaux techniques de CE sens
  let tech = null; try { tech = (typeof getTechSignals === 'function') ? getTechSignals(pair) : null; } catch(e) {}
  const volCV = (tech && tech.raw && tech.raw.stddev && tech.raw.stddev.cv) || 0.015;
  const tb = (d) => { let b = 0; if (tech) Object.values(tech.signals || {}).forEach(s => { if (s && s.signal === d) b += 0.04; }); return Math.min(0.25, b); };
  const lv = (side) => {
    const ec = Math.min(1, conv + tb(side === 'long' ? 'bull' : 'bear'));
    const tp = Math.max(0.6, ec * 3.2 * (1 + volCV * 9));
    const sl = Math.max(0.45, Math.min((volCV * 100) * 1.4, tp / 1.4));
    return { ec, tp, sl };
  };
  plan.volCV = volCV;
  plan.lv = { long: lv('long'), short: lv('short') };
  // 4 · seuil appris (03 : null hors EV / RE, Infinity = aucun niveau ne paie après frais) et horizon prouvé pour cette force
  let th = null; try { th = (typeof _thLevel === 'function') ? _thLevel() : null; } catch(e) {}
  plan.th = th;
  plan.botsOpen = (dir && typeof th === 'number' && isFinite(th)) ? (plan.lv[dir].ec >= th) : null;
  plan.hz = null;
  try { if (dir && typeof _thPick === 'function') { const pk = _thPick(conv); if (pk && typeof _thHzLab === 'function') plan.hz = _thHzLab(pk.h, pk.f); } } catch(e) {}
  // 5 · régime et volatilité réelle (ATR 20 bougies de la tf du mode, 10a)
  plan.regime = 'calm'; try { plan.regime = (typeof detectMarketRegime === 'function' ? detectMarketRegime() : 'calm') || 'calm'; } catch(e) {}
  plan.atrPct = null;
  try { const vs = (typeof _computeVolatilityScore === 'function') ? _computeVolatilityScore(pair) : null; if (vs && vs.atrAbs > 0 && plan.price > 0) plan.atrPct = vs.atrAbs / plan.price * 100; } catch(e) {}
  return plan;
}
window._manPlan = _manPlan;

// % de TP / SL appliqués au sens cliqué : ceux des champs de la fiche (ce que tu vois est ce qui s'applique), sinon la règle des bots pour ce sens
function _manSideLevels(pair, side) {
  const k = pair.replace('/', '_');
  const f = (id) => { const el = document.getElementById(id); const v = el ? parseFloat(el.value) : NaN; return (isFinite(v) && v > 0) ? v : null; };
  let tp = f('manIn_tpp_' + k), sl = f('manIn_slp_' + k);
  if (tp === null || sl === null) {
    const pl = _manPlan(pair);
    const L = pl && pl.lv ? pl.lv[side === 'short' ? 'short' : 'long'] : null;
    if (tp === null) tp = L ? L.tp : null;
    if (sl === null) sl = L ? L.sl : null;
  }
  return { tp, sl };
}
window._manSideLevels = _manSideLevels;

const _MAN_REG = { bull: 'haussier', bear: 'baissier', calm: 'calme', volatile: 'volatil', volatile_bull: 'volatil haussier', volatile_bear: 'volatil baissier' };
function _manSystemHtml(pair, pl) {
  const r = (lab, val) => `<div><span style="color:var(--t3);">${lab}</span><br>${val}</div>`;
  const mono = (t, col) => `<span style="color:${col || 'var(--t1)'};font-weight:700;font-family:var(--font-mono);">${t}</span>`;
  const dirLab = pl.dir === 'long' ? '↑ LONG' : pl.dir === 'short' ? '↓ SHORT' : '— aucun avis';
  const dirCol = pl.dir === 'long' ? 'var(--up)' : pl.dir === 'short' ? 'var(--down)' : 'var(--t3)';
  const ageTxt = pl.age === null ? '' : (pl.age < 90000 ? ' · il y a ' + Math.round(pl.age / 1000) + ' s' : ' · il y a ' + Math.round(pl.age / 60000) + ' min');
  const srcTxt = pl.src === 'dc' ? (pl.n + ' voix' + ageTxt) : 'LMSR seul — décision commune pas encore calculée';
  let thTxt = '—', verdict = '';
  if (pl.th === Infinity) { thTxt = 'marché fermé'; verdict = 'Aucun niveau de force ne paie après frais : les bots n\'ouvrent pas.'; }
  else if (typeof pl.th === 'number' && isFinite(pl.th)) {
    thTxt = (pl.th * 100).toFixed(0) + ' %';
    if (pl.botsOpen === true) verdict = '✓ Au-dessus du seuil appris : les bots ouvriraient ' + (pl.dir === 'long' ? 'LONG' : 'SHORT') + ' (avant ajustements de contexte).';
    else if (pl.botsOpen === false) verdict = '✗ Sous le seuil appris : les bots n\'ouvriraient pas.';
  } else verdict = 'Seuil appris : seulement en EV / RE.';
  const atr = pl.atrPct === null ? '—' : pl.atrPct.toFixed(2) + ' %';
  return `
      <div class="detail-section-title">🧠 Le système · décision commune</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:11px;">
        ${r('Direction', `<span style="color:${dirCol};font-weight:800;font-size:13px;">${dirLab}</span>`)}
        ${r('Force', mono((pl.conv * 100).toFixed(0) + ' %') + `<span style="font-size:9px;color:var(--t3);"> · ${srcTxt}</span>`)}
        ${r('Seuil appris', mono(thTxt))}
        ${r('Régime', mono(_MAN_REG[pl.regime] || pl.regime))}
        ${r('ATR (20 bougies)', mono(atr))}
        ${r('Horizon prouvé', mono(pl.hz || '—'))}
      </div>
      <div style="margin-top:6px;font-size:10px;color:${pl.botsOpen === true ? 'var(--up)' : 'var(--t3)'};line-height:1.4;">${verdict}</div>`;
}
function _manPreviewHtml(pair) {
  const ps = S.pairStates && S.pairStates[pair]; const px = ps ? Number(ps.price) : 0;
  const one = (side) => {
    const L = _manSideLevels(pair, side), d = side === 'long' ? 1 : -1;
    if (!(px > 0) || !L.tp || !L.sl) return '';
    return `<span style="color:${side === 'long' ? 'var(--up)' : 'var(--down)'};">${side === 'long' ? '↑ LONG' : '↓ SHORT'}</span> TP ${_manFmtPx(pair, px * (1 + d * L.tp / 100))} · SL ${_manFmtPx(pair, px * (1 - d * L.sl / 100))}`;
  };
  return one('long') + '<br>' + one('short');
}
function _manWarnHtml(pair) {
  if (typeof _manOpenWarnings !== 'function') return '';
  const out = [];
  ['long', 'short'].forEach(side => { const w = _manOpenWarnings(pair, side); if (w.length) out.push(`⚠ ${side === 'long' ? 'LONG' : 'SHORT'} : ${w.join(' · ')} — s'ouvre quand même, à ta demande.`); });
  return out.join('<br>');
}
function _manPreview(pair) {
  const k = pair.replace('/', '_'), el = document.getElementById('manPrev_' + k);
  if (el) el.innerHTML = _manPreviewHtml(pair);
}
window._manPreview = _manPreview;

let _manRefreshT = null;
function _manRefreshTick(pair, hadManual) {
  const o = document.getElementById('pairDetailOverlay'), k = pair.replace('/', '_');
  const box = document.getElementById('manSys_' + k);
  if (!o || !o.classList.contains('open') || _currentDetailPair !== pair || !box) { clearInterval(_manRefreshT); _manRefreshT = null; return; }
  try {
    const hasManual = !!(S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    if (hasManual !== hadManual) { openManDetail(pair); return; }   // ouverte / fermée entre-temps : la fiche entière change
    const pl = _manPlan(pair); if (!pl) return;
    box.innerHTML = _manSystemHtml(pair, pl);
    const L = pl.lv[pl.dir || 'long'];
    [['manIn_tpp_' + k, L.tp], ['manIn_slp_' + k, L.sl]].forEach(([id, v]) => { const el = document.getElementById(id); if (el && el.dataset.edited !== '1' && document.activeElement !== el) el.value = v.toFixed(2); });
    _manPreview(pair);
    const w = document.getElementById('manWarn_' + k); if (w) w.innerHTML = _manWarnHtml(pair);
    ['long', 'short'].forEach(sd => { const st = document.getElementById('manStar_' + sd + '_' + k); if (st) st.textContent = (pl.dir === sd) ? ' ★ système' : ''; });
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
}

function openManDetail(pair) {
  const overlay = document.getElementById('pairDetailOverlay');
  const title = document.getElementById('pairDetailTitle');
  const body = document.getElementById('pairDetailBody');
  if (!overlay || !title || !body) return;
  
  _currentDetailPair = pair;
  const cfg = PAIRS[pair];
  const ps = S.pairStates[pair];
  if (!cfg || !ps) return;
  const k = pair.replace('/', '_');
  const pl = _manPlan(pair);
  
  if (!S._manConsignes) S._manConsignes = {};
  if (!S._manConsignes[pair]) { S._manConsignes[pair] = { maxLossPct: 2.0, timeoutMin: 60 }; }
  const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
  // une position manuelle ouverte par la fiche porte SES consignes (09e les lit sur elle) : ce sont elles qu'on montre et qu'on modifie (10g)
  const posCons = !!(manualPos && (manualPos._manMaxLossPct > 0 || manualPos._manTimeoutMin > 0));
  const cons = posCons ? { maxLossPct: manualPos._manMaxLossPct || '', timeoutMin: manualPos._manTimeoutMin || '' } : S._manConsignes[pair];
  const botPos = (S.openPositions || []).find(p => p.pair === pair && p.auto === true);
  
  const pnl24 = ps.pnl24h || 0;
  const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
  title.innerHTML = `
    <span style="color:${cfg.color};font-size:15px;">${pair}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:var(--ice);background:rgba(56,212,245,0.1);padding:2px 6px;border-radius:4px;margin-left:6px;">MAN</span>
    <span style="font-family:var(--font-mono);font-size:11px;color:var(--t2);margin-left:6px;">${_manFmtPx(pair, ps.price)}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:${pnl24Col};margin-left:6px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>
  `;
  
  body.innerHTML = '';
  const inp = 'width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-family:var(--font-mono);font-weight:700;font-size:12px;';
  const lab = 'color:var(--t3);font-size:9px;display:block;margin-bottom:3px;';
  
  if (manualPos) {
    const pnlUsd = manualPos.pnlUsdt || 0;
    const pnlPct = manualPos.pnl || 0;
    const pnlCol = pnlUsd >= 0 ? 'var(--up)' : 'var(--down)';
    const sign = pnlUsd >= 0 ? '+' : '';
    const sideLabel = manualPos.side === 'long' ? '↑ LONG' : '↓ SHORT';
    const sideCol = manualPos.side === 'long' ? 'var(--up)' : 'var(--down)';
    const posSection = document.createElement('div');
    posSection.className = 'detail-section';
    posSection.innerHTML = `
      <div class="detail-section-title">🎛️ Position active</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:11px;">
        <div><span style="color:var(--t3);">Side</span><br><span style="color:${sideCol};font-weight:800;font-size:13px;">${sideLabel}</span></div>
        <div><span style="color:var(--t3);">Mise</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">$${(manualPos.stakeUsdt || 0).toFixed(2)}</span></div>
        <div><span style="color:var(--t3);">Entrée</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);font-size:10px;">${_manFmtPx(pair, manualPos.entryPrice)}</span></div>
        <div><span style="color:var(--t3);">P&L</span><br><span style="color:${pnlCol};font-weight:800;font-family:var(--font-mono);">${sign}$${pnlUsd.toFixed(2)} <span style="font-size:9px;color:var(--t3);">(${sign}${pnlPct.toFixed(2)}%)</span></span></div>
        <div><span style="color:var(--t3);">TP</span><br><span style="color:var(--up);font-weight:700;font-family:var(--font-mono);font-size:10px;">${_manFmtPx(pair, manualPos.tp)}</span></div>
        <div><span style="color:var(--t3);">SL</span><br><span style="color:var(--down);font-weight:700;font-family:var(--font-mono);font-size:10px;">${_manFmtPx(pair, manualPos.sl)}</span></div>
      </div>`;
    body.appendChild(posSection);
  }
  
  // Le système : toujours affiché (aussi pendant une position : c'est lui qui dira s'il bascule)
  const sysSection = document.createElement('div');
  sysSection.className = 'detail-section';
  sysSection.id = 'manSys_' + k;
  sysSection.innerHTML = pl ? _manSystemHtml(pair, pl) : '<div class="detail-section-title">🧠 Le système</div><div style="font-size:10px;color:var(--t3);">Pas de données pour cette paire.</div>';
  body.appendChild(sysSection);
  
  if (!manualPos && pl) {
    const L = pl.lv[pl.dir || 'long'];
    const paramsSection = document.createElement('div');
    paramsSection.className = 'detail-section';
    paramsSection.innerHTML = `
      <div class="detail-section-title">⚙️ Ton trade (pré-rempli par le système · éditable)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
        <div>
          <label style="${lab}">Mise ($)</label>
          <input type="number" id="manIn_stake_${k}" value="${pl.stake.toFixed(2)}" min="1" step="1" style="${inp}color:var(--t1);">
        </div>
        <div>
          <label style="${lab}">Levier ×</label>
          <input type="number" id="manIn_lev_${k}" value="1" min="1" max="10" step="1" style="${inp}color:var(--t1);">
        </div>
        <div>
          <label style="${lab}">TP (% depuis l'entrée)</label>
          <input type="number" id="manIn_tpp_${k}" value="${L.tp.toFixed(2)}" min="0.05" step="0.05" oninput="this.dataset.edited='1';_manPreview('${pair}')" style="${inp}color:var(--up);">
        </div>
        <div>
          <label style="${lab}">SL (% depuis l'entrée)</label>
          <input type="number" id="manIn_slp_${k}" value="${L.sl.toFixed(2)}" min="0.05" step="0.05" oninput="this.dataset.edited='1';_manPreview('${pair}')" style="${inp}color:var(--down);">
        </div>
      </div>
      <div id="manPrev_${k}" style="margin-top:8px;font-size:10px;font-family:var(--font-mono);color:var(--t2);line-height:1.6;">${_manPreviewHtml(pair)}</div>
      <div style="margin-top:4px;font-size:9px;color:var(--t3);line-height:1.4;">Mise : part du capital libre de la paire (règle des bots, $${pl.free.toFixed(2)} libres). TP / SL : règle de sortie des bots (force commune + signaux techniques + volatilité) ; ils s'appliquent au sens que tu cliques.</div>`;
    body.appendChild(paramsSection);
  }
  
  const consignesSection = document.createElement('div');
  consignesSection.className = 'detail-section';
  consignesSection.innerHTML = `
    <div class="detail-section-title">🛡️ Consignes garde-fou (le système ferme si dépassé)</div>
    <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.4;">Le bot respecte ton ouverture mais ferme automatiquement si ces seuils sont franchis.${manualPos && !posCons ? ' <span style="color:var(--gold);">Position ouverte hors fiche : aucune consigne ne la surveille encore — modifie une valeur pour l\'en équiper.</span>' : ''}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
      <div>
        <label style="${lab}">Perte max (% du capital)</label>
        <input type="number" id="manCon_loss_${k}" value="${cons.maxLossPct}" min="0.5" max="10" step="0.5" onchange="_saveManConsigne('${pair}','maxLossPct',this.value)" style="${inp}color:var(--gold);">
      </div>
      <div>
        <label style="${lab}">Timeout (min)</label>
        <input type="number" id="manCon_tout_${k}" value="${cons.timeoutMin}" min="5" max="1440" step="5" onchange="_saveManConsigne('${pair}','timeoutMin',this.value)" style="${inp}color:var(--gold);">
      </div>
    </div>
    <div style="margin-top:6px;font-size:9px;color:var(--t3);line-height:1.4;">ℹ️ Fermée aussi : à ton TP ou ton SL, à la perte max du trade (2 × SL, 1,5–3 %), par le trailing, après 30 min à plat.</div>`;
  body.appendChild(consignesSection);
  
  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = 'margin:12px 0;';
  if (manualPos) {
    actionsSection.innerHTML = `<div style="display:flex;gap:8px;"><button class="force-close-btn" style="flex:1;" onclick="_showForceCloseConfirm('${pair}')">✕ Fermer ${manualPos.side === 'long' ? 'LONG' : 'SHORT'} ${pair}</button></div>`;
  } else {
    const star = (side) => `<span id="manStar_${side}_${k}" style="font-size:10px;opacity:.8;">${(pl && pl.dir === side) ? ' ★ système' : ''}</span>`;
    actionsSection.innerHTML = `
      <div style="display:flex;gap:8px;">
        <button style="flex:1;background:rgba(0,232,122,0.12);color:var(--up);border:1px solid rgba(0,232,122,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','long')">↑ LONG${star('long')}</button>
        <button style="flex:1;background:rgba(255,61,107,0.12);color:var(--down);border:1px solid rgba(255,61,107,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','short')">↓ SHORT${star('short')}</button>
      </div>
      <div id="manWarn_${k}" style="margin-top:6px;font-size:9px;color:var(--gold);line-height:1.4;">${_manWarnHtml(pair)}</div>
      ${botPos ? `<div style="margin-top:4px;font-size:9px;color:var(--t3);line-height:1.4;">🤖 Position bot ${botPos.side === 'long' ? 'LONG' : 'SHORT'} ouverte sur ${pair} (mise $${(botPos.stakeUsdt || 0).toFixed(2)}) : ouvrir ici la ferme d'abord (une position par paire).</div>` : ''}`;
  }
  body.appendChild(actionsSection);
  
  const pairTrades = (ps.trades || []).filter(t => t.type === 'position' && typeof t.pnlUsdt === 'number');
  const wins = pairTrades.filter(t => t.pnlUsdt > 0).length;
  const totalTrades = pairTrades.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : '—';
  const totalPnl = pairTrades.reduce((s, t) => s + (t.pnlUsdt || 0), 0);
  
  const statsSection = document.createElement('div');
  statsSection.className = 'detail-section';
  statsSection.innerHTML = `
    <div class="detail-section-title">📊 Statistiques · ${pair}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;">
      <div><span style="color:var(--t3);font-size:9px;">Trades</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${totalTrades}</span></div>
      <div><span style="color:var(--t3);font-size:9px;">Win rate</span><br><span style="color:${parseFloat(winRate) >= 50 ? 'var(--up)' : parseFloat(winRate) >= 40 ? 'var(--gold)' : 'var(--down)'};font-weight:700;font-family:var(--font-mono);">${winRate}%</span></div>
      <div><span style="color:var(--t3);font-size:9px;">P&L cumul</span><br><span style="color:${totalPnl >= 0 ? 'var(--up)' : 'var(--down)'};font-weight:700;font-family:var(--font-mono);">${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}</span></div>
    </div>`;
  body.appendChild(statsSection);
  
  overlay.classList.add('open');
  if (_manRefreshT) clearInterval(_manRefreshT);
  const _had = !!manualPos;
  _manRefreshT = setInterval(function(){ _manRefreshTick(pair, _had); }, 2000);
}
window.openManDetail = openManDetail;
if(typeof openManDetail==='function') window.openManDetail = openManDetail;

function openPairDetail(pair) {
  if (typeof showPairDetail === 'function') { return showPairDetail(pair); }
}
window.openPairDetail = openPairDetail;
if(typeof openPairDetail==='function') window.openPairDetail = openPairDetail;

function renderActionBricks() {
  const grid = document.getElementById('actionsGrid');
  if (!grid) return;
  grid.classList.add('as-bricks');
  
  Object.entries(PAIRS).forEach(([pair, cfg]) => {
    const pairKey = pair.replace('/','_');
    const ps = S.pairStates[pair];
    if (!ps) return;
    
    const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
    const pct = prob * 100;
    let signal = 'hold', label = 'HOLD';
    if (prob > 0.60) { signal = 'buy';  label = 'BUY'; }
    else if (prob < 0.40) { signal = 'sell'; label = 'SELL'; }
    
    const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
    const botPos    = (S.openPositions || []).find(p => p.pair === pair && p.auto === true);
    const activePos = manualPos || botPos;
    if (activePos) {
      signal = activePos.side === 'long' ? 'buy' : 'sell';
      label  = activePos.side === 'long' ? 'LONG' : 'SHORT';
    }
    
    let brick = document.getElementById('actbrick_' + pairKey);
    if (!brick) {
      brick = document.createElement('div');
      brick.id = 'actbrick_' + pairKey;
      brick.className = 'action-brick';
      brick.style.setProperty('--accent', cfg.color);
      brick.onclick = () => openPairDetail(pair);
      brick.innerHTML = `
        <div>
          <div class="ab-head"><span class="ab-sym">${cfg.sym}</span><span class="ab-dot"></span></div>
          <div class="ab-price" id="ab_px_${pairKey}">—</div>
        </div>
        <div>
          <div class="ab-signal" id="ab_sig_${pairKey}">—</div>
          <div class="ab-sub" id="ab_sub_${pairKey}">—</div>
        </div>`;
      grid.appendChild(brick);
    }
    
    brick.className = 'action-brick sig-' + signal;
    
    const priceStr = (cfg.dec >= 4) ? ps.price.toFixed(cfg.dec) : ('$' + Math.floor(ps.price).toLocaleString());
    const p24 = ps.pnl24h || 0;
    const p24Col = p24 >= 0 ? 'var(--up)' : 'var(--down)';
    const pxEl = document.getElementById('ab_px_' + pairKey);
    if (pxEl) pxEl.innerHTML = `${priceStr} <span style="color:${p24Col};margin-left:3px;">${p24 >= 0 ? '+' : ''}${p24.toFixed(2)}%</span>`;
    
    const sigEl = document.getElementById('ab_sig_' + pairKey);
    if (sigEl) { const prefix = activePos ? (manualPos ? '🔒 ' : '') : '🤖 '; sigEl.textContent = prefix + label; }
    
    const subEl = document.getElementById('ab_sub_' + pairKey);
    if (subEl) {
      if (activePos) subEl.textContent = '$' + (activePos.stakeUsdt || 0).toFixed(0);
      else subEl.textContent = pct.toFixed(0) + '% LMSR';
    }
  });
}
window.renderActionBricks = renderActionBricks;
if(typeof renderActionBricks==='function') window.renderActionBricks = renderActionBricks;
