// ▓▓▓ VERSION 20260809k ▓▓▓
// 10h-pont-fullpower-bricks.js — Pont Claude, Plein Régime (enable), loadAllTrades, détail MAN, briques d'action
// [DÉCOUPE 10 · 09/08/2026] Tranche BYTE-IDENTIQUE de 10-fin-bloc-restauration-v93.js
// (lignes 2317-2792 de l'original). Aucun code réécrit. Ordre de chargement OBLIGATOIRE :
// 10a → 10h, à la place exacte de l'ancien fichier 10 dans le HTML.


// ═══ PONT CLAUDE · EXPORT DEPUIS AURA (05/07/2026) ═══
// Le bouton vit DANS AURA : cette page EST l'etat vivant, donc l'export est
// frais PAR CONSTRUCTION — plus jamais le piege du "mauvais navigateur" (les
// exports Guardian photographiaient un vieil IDB du 28/06). Enveloppe identique
// au backup Guardian -> meme lecteur cote Claude. Nom FIXE : aura_live.json.
var _PONT_V = 'v4.0';
// Boite de depot Claude (webhook.site) : URL fixe, ecriture par POST 'simple'
// (text/plain) que le navigateur envoie SANS preflight ni permission — teste le
// 05/07 avec le fichier reel de 938 Ko, relu intact cote Claude.
var _CLAUDE_BOX = 'a48904e7-79e7-4477-855b-1f2d69c7b7a5';   // ★ VERSION VISIBLE : affichee dans la barre et les toasts.
// Une capture d'ecran suffit desormais a savoir QUELLE version tourne reellement
// (la PWA a servi du code perime toute la soiree du 05/07 pendant que les fixes
// etaient en ligne — indetectable sans ce marqueur).
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
    var tk = null; try { tk = localStorage.getItem('aura_claude_gh_token') || null; } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
    if (tk) { _claudePush(payload, tk); return; }
    _claudeDrop(payload);
  } catch(e) { try { showToast('Export Claude : erreur', 3000, 'warn'); } catch(_) {} }
}

// SANS token : feuille de PARTAGE Android (marche en PWA, la ou le telechargement
// est ignore). L'utilisateur choisit l'appli Claude -> le fichier arrive dans le
// chat. Fallback final : telechargement classique (onglet navigateur).
// DEPOT SANS RIEN : POST 'simple' vers la boite fixe. mode:'no-cors' = le
// navigateur envoie sans exiger de permission du serveur ; la reponse est
// opaque (on ne peut pas la lire), donc le toast dit 'Depose' — c'est Claude
// qui CONFIRME la reception en lisant la boite (verifie une fois en reel).
// Si le reseau rejette : bascule sur partage/telechargement.
function _claudeDrop(payload) {
  var txt = JSON.stringify(payload);
  var cyc = payload.auraCycle || '?';
  try {
    fetch('https://webhook.site/' + _CLAUDE_BOX, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: txt })
      .then(function(){ try { showToast('✅ [' + _PONT_V + '] Déposé pour Claude · cycle ' + cyc + ' — il confirme la réception à la lecture', 6000, 'win'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} } })
      .catch(function(){ _claudeShareOrDownload(payload); });
  } catch(e) { _claudeShareOrDownload(payload); }
}
function _claudeShareOrDownload(payload) {
  var txt = JSON.stringify(payload);
  var cyc = payload.auraCycle || '?';
  try {
    if (navigator.canShare && typeof File === 'function') {
      var f = new File([txt], 'aura_live.json', { type: 'application/json' });
      if (navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f], title: 'aura_live.json \u00b7 cycle ' + cyc })
          .then(function(){ try { showToast('\u2705 Partag\u00e9 \u00b7 cycle ' + cyc + ' \u2014 choisis Claude (ou envoie le fichier dans le chat)', 6000, 'win'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} } })
          .catch(function(err){
            if (err && err.name === 'AbortError') return;   // feuille fermee volontairement
            _claudeDownloadFallback(txt, cyc);
          });
        return;
      }
    }
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  _claudeDownloadFallback(txt, cyc);
}
function _claudeDownloadFallback(txt, cyc) {
  downloadFile(txt, 'aura_live.json', 'application/json');
  var hh = new Date(); var pad = function(n){ return (n<10?'0':'')+n; };
  try { showToast('\u2705 aura_live.json \u00b7 cycle ' + cyc + ' \u00b7 ' + pad(hh.getHours()) + ':' + pad(hh.getMinutes()) + ' \u2014 dans T\u00e9l\u00e9chargements', 6000, 'win'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
}

// Envoi DIRECT au repo (API GitHub, token fine-grained limite au repo, Contents RW).
// Un clic : GET sha du fichier existant puis PUT du nouveau contenu. Zero
// telechargement, zero upload manuel, zero Commit — le repo recoit tout seul.
// A quel compte GitHub appartient le token ? (GET /user -> login).
// Un fine-grained ne peut JAMAIS acceder aux repos d'un autre compte : si le
// login affiche n'est pas ramizxhixha-a11y, TOUTES les editions de droits sont
// vaines — c'est la cause racine, prouvee a l'ecran.
function _claudeWho(tk) {
  return fetch('https://api.github.com/user', { headers: { 'Authorization': 'Bearer ' + tk, 'Accept': 'application/vnd.github+json' }, cache: 'no-store' })
    .then(function(r){ return r.status === 200 ? r.json() : null; })
    .then(function(j){ return (j && j.login) ? j.login : '?'; })
    .catch(function(){ return '?'; });
}
function _claudeB64(str) {
  // base64 sur du UTF-8 (btoa seul casse sur les accents)
  return btoa(unescape(encodeURIComponent(str)));
}
function _claudePush(payload, tk) {
  var base = 'https://api.github.com/repos/ramizxhixha-a11y/aura';
  var hdr = { 'Authorization': 'Bearer ' + tk, 'Accept': 'application/vnd.github+json' };
  try { showToast('\u23F3 Envoi \u00e0 Claude\u2026', 2500, 'ice'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  // Le sha du fichier existant est lu via le LISTING de la racine (fiable quelle
  // que soit la taille du fichier ; le GET direct d'un fichier proche de 1 Mo
  // peut etre refuse par l'API et aurait fait echouer la mise a jour).
  fetch(base + '/contents/?ref=main', { headers: hdr, cache: 'no-store' })
    .then(function(r){
      if (r.status !== 200) return r.json().catch(function(){ return {}; }).then(function(j){ throw { st: r.status, gh: j && j.message }; });
      return r.json();
    })
    .then(function(list){
      var sha = null;
      if (Array.isArray(list)) { for (var i = 0; i < list.length; i++) { if (list[i] && list[i].name === 'aura_live.json') { sha = list[i].sha; break; } } }
      var body = { message: 'aura_live via AURA \u00b7 cycle ' + (payload.auraCycle || '?'), content: _claudeB64(JSON.stringify(payload)) };
      if (sha) body.sha = sha;
      return fetch(base + '/contents/aura_live.json', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr), body: JSON.stringify(body) });
    })
    .then(function(r){
      if (!r) return;
      if (r.status === 200 || r.status === 201) { try { showToast('\u2705 Envoy\u00e9 \u00e0 Claude \u00b7 cycle ' + (payload.auraCycle || '?') + ' \u2014 il peut le lire maintenant', 6000, 'win'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} } return; }
      return r.json().catch(function(){ return {}; }).then(function(j){ throw { st: r.status, gh: j && j.message }; });
    })
    .catch(function(e){
      var st = e && e.st, gh = e && e.gh;
      var msg = st ? ('GitHub ' + st + (gh ? (' \u00b7 \u00ab ' + String(gh).slice(0, 90) + ' \u00bb') : '')) : 'r\u00e9seau coup\u00e9';
      // ★ v3.5 · INSTRUMENT DE VERITE : montrer QUEL token l'app utilise reellement
      // (12 premiers caracteres — non sensible sur ~90). ghp_ = classic,
      // github_pat_ = fine-grained. La capture de CE toast identifie le token
      // sans aucune ambiguite possible.
      _claudeWho(tk).then(function(who){
        var alerte = (who !== '?' && who !== 'ramizxhixha-a11y') ? ' \u26A0 PAS le proprietaire du repo !' : '';
        try { showToast('\u26D4 [' + _PONT_V + '] ' + msg + ' \u00b7 token : ' + String(tk).slice(0, 12) + '\u2026 \u00b7 compte du token : ' + who + alerte + ' \u2014 capture CE message', 12000, 'warn'); } catch(_) {}
      });
    });
}
function claudeTokenConfig() {
  try {
    var cur = null; try { cur = localStorage.getItem('aura_claude_gh_token'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
    // ★ FIX (05/07 soir) · le champ n'est PLUS pre-rempli : l'ancien placeholder
    // « •••• » faisait ignorer EN SILENCE tout collage qui le laissait en tete —
    // les nouveaux tokens de Rams n'etaient donc JAMAIS enregistres et l'app
    // poussait toujours avec le premier token rate. Desormais : champ VIDE,
    // tout collage non vide est enregistre puis TESTE immediatement.
    var msg = cur ? 'Un token est deja enregistre.\n\nColle le NOUVEAU token pour le remplacer (il sera teste aussitot).\nLaisse vide + OK pour EFFACER le token actuel.'
                  : 'Colle ton token GitHub (il sera teste aussitot).';
    var v = window.prompt(msg, '');
    if (v === null) return;                       // Annuler : rien ne change
    v = (v || '').replace(/\s+/g, '');           // espaces/retours du clavier retires
    if (!v) {
      if (cur && window.confirm('Effacer le token enregistre ?')) {
        localStorage.removeItem('aura_claude_gh_token');
        try { showToast('Token efface', 2500, 'ice'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
      }
      return;
    }
    localStorage.setItem('aura_claude_gh_token', v);
    try { showToast('\uD83D\uDCBE Token enregistre (' + v.slice(0, 10) + '\u2026) \u2014 test en cours', 2500, 'ice'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
    _claudeTestToken(v);
  } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
}
// Verdict immediat du token : voit-il le repo ? peut-il ECRIRE ?
// (GET /repos renvoie permissions.push quand authentifie)
function _claudeTestToken(tk) {
  try { showToast('\u23F3 Test du token\u2026', 2000, 'ice'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
  fetch('https://api.github.com/repos/ramizxhixha-a11y/aura', { headers: { 'Authorization': 'Bearer ' + tk, 'Accept': 'application/vnd.github+json' }, cache: 'no-store' })
    .then(function(r){
      if (r.status === 200) return r.json();
      return r.json().catch(function(){ return {}; }).then(function(j){ throw { st: r.status, gh: j && j.message }; });
    })
    .then(function(j){
      if (j && j.permissions && j.permissions.push === true) {
        _claudeWho(tk).then(function(who){
          try { showToast('\u2705 [' + _PONT_V + '] Token OK \u00b7 compte : ' + who + ' \u00b7 \u00e9criture confirm\u00e9e \u2014 clique \uD83D\uDCE4', 6000, 'win'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
        });
      } else {
        try { showToast('\u26A0 Le token LIT le repo mais ne peut pas \u00c9CRIRE \u2192 Permissions \u2192 Contents : Read and write', 9000, 'warn'); } catch(e){ try{window._decErr&&window._decErr(e)}catch(_e){} }
      }
    })
    .catch(function(e){
      var st = e && e.st, gh = e && e.gh ? (' \u00b7 \u00ab ' + String(e.gh).slice(0, 80) + ' \u00bb') : '';
      var hint = (st === 401) ? ' \u2192 token mal coll\u00e9 ou expir\u00e9'
               : (st === 404 || st === 403) ? ' \u2192 ce token ne voit pas le repo aura'
               : '';
      _claudeWho(tk).then(function(who){
        var alerte = (who !== '?' && who !== 'ramizxhixha-a11y') ? ' \u26A0 PAS le proprietaire du repo !' : '';
        try { showToast('\u26D4 [' + _PONT_V + '] GitHub ' + (st || '?') + gh + hint + ' \u00b7 compte du token : ' + who + alerte + ' \u2014 capture CE message', 12000, 'warn'); } catch(_) {}
      });
    });
}
window.claudeTokenConfig = claudeTokenConfig;
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
        + '<button onclick="claudeTokenConfig()" title="Configurer le token GitHub (envoi direct)" style="flex:0 0 auto;padding:7px 10px;border-radius:9px;border:1.5px solid rgba(136,153,170,.4);background:transparent;color:#8899aa;font-size:12px;">\u2699</button>'
        + '<span style="font-size:10px;color:var(--t3,#8899aa);line-height:1.35;"><b style="color:#38d4f5;">Pont ' + _PONT_V + '</b> \u00b7 aura_live.json \u00b7 \u00e9tat VIVANT \u00b7 avec token \u2699 : envoi DIRECT au repo (sinon t\u00e9l\u00e9chargement)</span>';
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

function openManDetail(pair) {
  const overlay = document.getElementById('pairDetailOverlay');
  const title = document.getElementById('pairDetailTitle');
  const body = document.getElementById('pairDetailBody');
  if (!overlay || !title || !body) return;
  
  _currentDetailPair = pair;
  const cfg = PAIRS[pair];
  const ps = S.pairStates[pair];
  if (!cfg || !ps) return;
  
  const prob = typeof lmsrP === 'function' ? lmsrP(ps) : 0.5;
  const pct = prob * 100;
  const conviction = Math.abs(prob - 0.5) * 2;
  let suggSide = prob >= 0.5 ? 'long' : 'short';
  const atr = ps.atr || 0.01;
  const atrRel = atr > 0 ? (atr / ps.price) : 0.015;
  
  const suggStake = Math.max(10, Math.round((S.tradingAccount || 100) * (0.05 + conviction * 0.05)));
  const suggLev = conviction > 0.5 ? Math.min(3, Math.max(1, Math.round(conviction * 3))) : 1;
  const tpDist = Math.max(0.8, atrRel * 100 * 2);
  const slDist = Math.max(0.5, atrRel * 100 * 1.5);
  const tpPrice = suggSide === 'long' ? ps.price * (1 + tpDist/100) : ps.price * (1 - tpDist/100);
  const slPrice = suggSide === 'long' ? ps.price * (1 - slDist/100) : ps.price * (1 + slDist/100);
  const suggMaxLoss = 2.0;
  const suggTimeout = 60;
  
  if (!S._manConsignes) S._manConsignes = {};
  if (!S._manConsignes[pair]) { S._manConsignes[pair] = { maxLossPct: suggMaxLoss, timeoutMin: suggTimeout }; }
  const cons = S._manConsignes[pair];
  
  const manualPos = (S.openPositions || []).find(p => p.pair === pair && p.auto !== true);
  
  const pnl24 = ps.pnl24h || 0;
  const pnl24Col = pnl24 >= 0 ? 'var(--up)' : 'var(--down)';
  title.innerHTML = `
    <span style="color:${cfg.color};font-size:15px;">${pair}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:var(--ice);background:rgba(56,212,245,0.1);padding:2px 6px;border-radius:4px;margin-left:6px;">MAN</span>
    <span style="font-family:var(--font-mono);font-size:11px;color:var(--t2);margin-left:6px;">${cfg.dec >= 4 ? ps.price.toFixed(cfg.dec) : '$' + Math.floor(ps.price).toLocaleString()}</span>
    <span style="font-family:var(--font-mono);font-size:10px;color:${pnl24Col};margin-left:6px;">${pnl24 >= 0 ? '+' : ''}${pnl24.toFixed(2)}%</span>
  `;
  
  body.innerHTML = '';
  
  const headSection = document.createElement('div');
  headSection.className = 'detail-section';
  
  if (manualPos) {
    const pnlUsd = manualPos.pnlUsdt || 0;
    const pnlPct = manualPos.pnl || 0;
    const isWin = pnlUsd >= 0;
    const pnlCol = isWin ? 'var(--up)' : 'var(--down)';
    const sign = pnlUsd >= 0 ? '+' : '';
    const sideLabel = manualPos.side === 'long' ? '↑ LONG' : '↓ SHORT';
    const sideCol = manualPos.side === 'long' ? 'var(--up)' : 'var(--down)';
    headSection.innerHTML = `
      <div class="detail-section-title">🎛️ Position active</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:11px;">
        <div><span style="color:var(--t3);">Side</span><br><span style="color:${sideCol};font-weight:800;font-size:13px;">${sideLabel}</span></div>
        <div><span style="color:var(--t3);">Mise</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">$${(manualPos.stakeUsdt || 0).toFixed(0)}</span></div>
        <div><span style="color:var(--t3);">Entrée</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);font-size:10px;">${cfg.dec >= 4 ? manualPos.entryPrice.toFixed(cfg.dec) : '$' + Math.floor(manualPos.entryPrice)}</span></div>
        <div><span style="color:var(--t3);">P&L</span><br><span style="color:${pnlCol};font-weight:800;font-family:var(--font-mono);">${sign}$${pnlUsd.toFixed(2)} <span style="font-size:9px;color:var(--t3);">(${sign}${pnlPct.toFixed(2)}%)</span></span></div>
      </div>`;
  } else {
    const sideLabel = suggSide === 'long' ? '↑ LONG' : '↓ SHORT';
    const sideCol = suggSide === 'long' ? 'var(--up)' : 'var(--down)';
    headSection.innerHTML = `
      <div class="detail-section-title">🤖 Suggestion bot en temps réel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:11px;">
        <div><span style="color:var(--t3);">Direction</span><br><span style="color:${sideCol};font-weight:800;font-size:13px;">${sideLabel}</span></div>
        <div><span style="color:var(--t3);">Conviction LMSR</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${pct.toFixed(0)}%</span></div>
        <div><span style="color:var(--t3);">ATR (volatilité)</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${(atrRel*100).toFixed(2)}%</span></div>
        <div><span style="color:var(--t3);">Force signal</span><br><span style="color:var(--t1);font-weight:700;font-family:var(--font-mono);">${(conviction*100).toFixed(0)}%</span></div>
      </div>`;
  }
  body.appendChild(headSection);
  
  if (!manualPos) {
    const paramsSection = document.createElement('div');
    paramsSection.className = 'detail-section';
    paramsSection.innerHTML = `
      <div class="detail-section-title">⚙️ Paramètres (pré-remplis · éditables)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Mise ($)</label>
          <input type="number" id="manIn_stake_${pair.replace('/','_')}" value="${suggStake}" min="10" step="5" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--t1);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Levier ×</label>
          <input type="number" id="manIn_lev_${pair.replace('/','_')}" value="${suggLev}" min="1" max="10" step="1" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--t1);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">TP ${cfg.dec >= 4 ? '(prix)' : '($)'}</label>
          <input type="number" id="manIn_tp_${pair.replace('/','_')}" value="${cfg.dec >= 4 ? tpPrice.toFixed(cfg.dec) : Math.round(tpPrice)}" step="${cfg.dec >= 4 ? '0.0001' : '1'}" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--up);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
        <div>
          <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">SL ${cfg.dec >= 4 ? '(prix)' : '($)'}</label>
          <input type="number" id="manIn_sl_${pair.replace('/','_')}" value="${cfg.dec >= 4 ? slPrice.toFixed(cfg.dec) : Math.round(slPrice)}" step="${cfg.dec >= 4 ? '0.0001' : '1'}" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--down);font-family:var(--font-mono);font-weight:700;font-size:12px;">
        </div>
      </div>`;
    body.appendChild(paramsSection);
  }
  
  const consignesSection = document.createElement('div');
  consignesSection.className = 'detail-section';
  consignesSection.innerHTML = `
    <div class="detail-section-title">🛡️ Consignes garde-fou (bot ferme si dépassé)</div>
    <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.4;">Le bot respecte ton ouverture mais ferme automatiquement si ces seuils sont franchis.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
      <div>
        <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Perte max (% du capital)</label>
        <input type="number" id="manCon_loss_${pair.replace('/','_')}" value="${cons.maxLossPct}" min="0.5" max="10" step="0.5" onchange="_saveManConsigne('${pair}','maxLossPct',this.value)" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--gold);font-family:var(--font-mono);font-weight:700;font-size:12px;">
      </div>
      <div>
        <label style="color:var(--t3);font-size:9px;display:block;margin-bottom:3px;">Timeout (min)</label>
        <input type="number" id="manCon_tout_${pair.replace('/','_')}" value="${cons.timeoutMin}" min="5" max="1440" step="5" onchange="_saveManConsigne('${pair}','timeoutMin',this.value)" style="width:100%;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--gold);font-family:var(--font-mono);font-weight:700;font-size:12px;">
      </div>
    </div>
    <div style="margin-top:6px;font-size:9px;color:var(--t3);">ℹ️ Le bot fermera aussi si TP ou SL sont atteints.</div>`;
  body.appendChild(consignesSection);
  
  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = 'margin:12px 0;display:flex;gap:8px;';
  if (manualPos) {
    actionsSection.innerHTML = `<button class="force-close-btn" style="flex:1;" onclick="_showForceCloseConfirm('${pair}')">✕ Fermer ${manualPos.side === 'long' ? 'LONG' : 'SHORT'} ${pair}</button>`;
  } else {
    actionsSection.innerHTML = `
      <button style="flex:1;background:rgba(0,232,122,0.12);color:var(--up);border:1px solid rgba(0,232,122,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','long')">↑ LONG</button>
      <button style="flex:1;background:rgba(255,61,107,0.12);color:var(--down);border:1px solid rgba(255,61,107,0.4);padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;" onclick="_openManTrade('${pair}','short')">↓ SHORT</button>`;
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
