// ▓▓▓ VERSION 20260809r ▓▓▓
// 11-gestion-paires.js — Ajout / retrait de paires par Rams (demande du 11/08/2026)
// ════════════════════════════════════════════════════════════════════════
// PRINCIPES :
//  · AJOUT : symbole validé sur Binance (klines réelles exigées) avant toute création ;
//    config auto depuis le marché réel (prix spot, ATR20 comme vol, décimales selon prix) ;
//    pairState neuf = seeds LMSR neutres 130/130 (makePairState, vérité 09/08) ; WS ouverte
//    et bougies bootstrappées immédiatement.
//  · RETRAIT = DÉSACTIVATION : la paire sort de PAIRS (plus aucun scan/trade/affichage,
//    toutes les boucles Object.keys(PAIRS) l'ignorent naturellement) mais son pairState
//    (LMSR appris, trades, stats) est CONSERVÉ — la ré-ajouter restitue sa mémoire.
//    Philosophie : l'intelligence acquise ne se jette pas.
//  · Refus de retirer une paire portant une position ouverte (n'importe quel mode).
//  · Persistance : S.customPairs / S.removedPairs (snapshot 09b1, petites clés → LS aussi) ;
//    rejoués au boot ici même dès _stateReady.
// ════════════════════════════════════════════════════════════════════════

(function _pairManagerBoot() {
  var _t = 0;
  var _iv = setInterval(function () {
    _t++;
    var ready = false;
    try { ready = !!window._stateReady; } catch (e) {}
    if (!ready && _t < 240) return;
    clearInterval(_iv);
    try { _replayPairChanges(); } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
    // [FIX 11/08/2026] l'injection unique au boot était balayée par les re-rendus de la
    // page Marché (contenu reconstruit → bouton détruit) : VEILLEUR permanent, ré-injecte
    // dès que le bouton manque (test par id toutes les 2 s, coût négligeable).
    setInterval(function () {
      try { _injectPairManagerButton(); } catch (e) {}
    }, 2000);
    try { _injectPairManagerButton(); } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
  }, 500);
})();

// Rejoue les ajouts/retraits persistés (au boot, PAIRS repart de la constante de 02)
function _replayPairChanges() {
  if (typeof S === 'undefined' || !S) return;
  if (!S.customPairs) S.customPairs = {};
  if (!S.removedPairs) S.removedPairs = [];
  Object.entries(S.customPairs).forEach(function (kv) {
    var p = kv[0], cfg = kv[1];
    if (S.removedPairs.indexOf(p) !== -1) return;   // ajoutée puis retirée
    if (!PAIRS[p]) PAIRS[p] = cfg;
    if (!S.pairStates[p]) S.pairStates[p] = makePairState(cfg);
    try { if (typeof _openBgWs === 'function') _openBgWs(p); } catch (e) {}
    try { if (typeof _fetchAndBootstrapRealCandles === 'function') _fetchAndBootstrapRealCandles(p, '15m'); } catch (e) {}
  });
  S.removedPairs.forEach(function (p) {
    if (PAIRS[p]) delete PAIRS[p];               // pairState conservé volontairement
    try {
      if (typeof _bgCollectorWSMap !== 'undefined' && _bgCollectorWSMap[p]) {
        _bgCollectorWSMap[p].close(); delete _bgCollectorWSMap[p];
      }
    } catch (e) {}
  });
}

// ── AJOUT ────────────────────────────────────────────────────────────────
async function addPair(input) {
  try {
    var raw = String(input || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!raw) return { ok: false, reason: 'symbole vide' };
    var sym = raw.replace('/USDT', '').replace('USDT', '');
    if (!/^[A-Z0-9]{2,10}$/.test(sym)) return { ok: false, reason: 'symbole invalide' };
    var pair = sym + '/USDT';
    if (PAIRS[pair]) return { ok: false, reason: pair + ' déjà active' };

    // Validation Binance : des bougies réelles ou rien
    var url = 'https://api.binance.com/api/v3/klines?symbol=' + sym + 'USDT&interval=15m&limit=21';
    var res = await fetch(url);
    if (!res.ok) return { ok: false, reason: sym + 'USDT introuvable sur Binance' };
    var data = await res.json();
    if (!Array.isArray(data) || data.length < 21) return { ok: false, reason: 'historique Binance insuffisant' };

    var closes = data.map(function (k) { return parseFloat(k[4]); });
    var price = closes[closes.length - 1];
    var trSum = 0;
    for (var i = 1; i < data.length; i++) {
      var h = parseFloat(data[i][2]), l = parseFloat(data[i][3]), pc = parseFloat(data[i - 1][4]);
      trSum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }
    var atr = trSum / (data.length - 1);
    var dec = price >= 100 ? 2 : price >= 1 ? 3 : price >= 0.01 ? 4 : 6;
    var palette = ['#ff7a59', '#5cd6c0', '#b48cff', '#ffd166', '#6fa8ff', '#ff8fb1', '#7bd88f', '#e0b089'];
    var hue = 0; for (var c = 0; c < sym.length; c++) hue = (hue + sym.charCodeAt(c)) % palette.length;

    var cfg = { sym: sym, color: palette[hue], startPrice: price, vol: atr, minP: price * 0.25, maxP: price * 4, dec: dec };
    PAIRS[pair] = cfg;
    S.customPairs[pair] = cfg;
    var ri = S.removedPairs.indexOf(pair);
    if (ri !== -1) S.removedPairs.splice(ri, 1);

    var hadMemory = !!S.pairStates[pair];
    if (!hadMemory) S.pairStates[pair] = makePairState(cfg);
    S.pairStates[pair].price = price;   // prix réel immédiat, pas le startPrice théorique
    try { if (typeof _openBgWs === 'function') _openBgWs(pair); } catch (e) {}
    try { if (typeof _fetchAndBootstrapRealCandles === 'function') _fetchAndBootstrapRealCandles(pair, '15m'); } catch (e) {}
    // EV : activer la paire si la liste des actives existe (miroir du comportement défaut)
    try { if (S.paperRealActivePairs) S.paperRealActivePairs[pair] = true; } catch (e) {}

    _pairLog('➕', 'Paire ajoutée : ' + pair + ' @ ' + price.toFixed(dec) + (hadMemory ? ' · mémoire retrouvée (LMSR/stats conservés du retrait)' : ' · naissance neutre (LMSR 130/130)'));
    try { if (typeof saveState === 'function') saveState(true); } catch (e) {}
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    return { ok: true, pair: pair, price: price };
  } catch (e) {
    try{window._decErr&&window._decErr(e)}catch(_e){}
    return { ok: false, reason: 'erreur : ' + String(e && e.message || e).slice(0, 60) };
  }
}
window.addPair = addPair;

// ── RETRAIT (désactivation, mémoire conservée) ──────────────────────────
function removePair(pair) {
  try {
    if (!PAIRS[pair]) return { ok: false, reason: pair + ' non active' };
    if (Object.keys(PAIRS).length <= 2) return { ok: false, reason: 'minimum 2 paires actives' };
    // refus si position ouverte dessus, dans N'IMPORTE quel mode
    var held = [];
    (S.openPositions || []).forEach(function (p) { if (p.pair === pair) held.push(S.tradingMode); });
    try {
      Object.entries(S.walletStore || {}).forEach(function (kv) {
        ((kv[1] && kv[1].openPositions) || []).forEach(function (p) { if (p.pair === pair) held.push(kv[0]); });
      });
    } catch (e) {}
    if (held.length) return { ok: false, reason: 'position ouverte sur ' + pair + ' (' + held.join(',') + ') — fermer d\u2019abord' };

    delete PAIRS[pair];
    if (S.removedPairs.indexOf(pair) === -1) S.removedPairs.push(pair);
    try { if (S.paperRealActivePairs) delete S.paperRealActivePairs[pair]; } catch (e) {}
    try {
      if (typeof _bgCollectorWSMap !== 'undefined' && _bgCollectorWSMap[pair]) {
        _bgCollectorWSMap[pair].close(); delete _bgCollectorWSMap[pair];
      }
    } catch (e) {}
    _pairLog('➖', 'Paire retirée : ' + pair + ' · mémoire conservée (ré-ajout = LMSR/stats restitués)');
    try { if (typeof saveState === 'function') saveState(true); } catch (e) {}
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    return { ok: true };
  } catch (e) {
    try{window._decErr&&window._decErr(e)}catch(_e){}
    return { ok: false, reason: 'erreur' };
  }
}
window.removePair = removePair;

function _pairLog(icon, desc) {
  try {
    if (!S.chainLog) S.chainLog = [];
    S.chainLog.push({ icon: icon, desc: desc, hash: Math.random().toString(36).slice(2, 8), time: new Date().toLocaleTimeString() });
    if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    if (typeof showToast === 'function') showToast(icon + ' ' + desc, 4000);
  } catch (e) {}
}

// ── UI : bouton sur la page Marché + modale ─────────────────────────────
function _injectPairManagerButton() {
  // [FIX ANCRAGE · 11/08/2026] marketMoodWrap est sur la page HOME, pas Marché — le
  // bouton s'injectait au mauvais endroit depuis le début (mon erreur, prouvée par les
  // captures). Ancrage réel de la page Marché : SOUS le grand graphique (#candle-wrap-top,
  // page2), au-dessus de « Toutes les paires ».
  if (document.getElementById('pairMgrBtn')) return;
  var anchor = document.getElementById('candle-wrap-top');
  if (!anchor || !anchor.parentNode) return;
  var btn = document.createElement('button');
  btn.id = 'pairMgrBtn';
  btn.textContent = '⚖ Gérer les paires';
  btn.style.cssText = 'display:block;margin:10px 16px 2px auto;padding:7px 16px;background:rgba(0,232,122,.08);color:var(--up,#00e87a);border:1px solid rgba(0,232,122,.35);border-radius:9px;font-size:12px;font-family:inherit;';
  btn.onclick = openPairManager;
  anchor.parentNode.insertBefore(btn, anchor.nextSibling);
}

function openPairManager() {
  var old = document.getElementById('pairMgrModal');
  if (old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'pairMgrModal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  var actives = Object.keys(PAIRS).map(function (p) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.06);">'
      + '<span style="color:' + (PAIRS[p].color || '#ccc') + ';font-weight:600;">' + p + '</span>'
      + '<button onclick="var r=removePair(\'' + p + '\');if(!r.ok&&typeof showToast===\'function\')showToast(\'⚠ \'+r.reason,4000,\'warn\');openPairManager();" style="background:rgba(255,77,109,.12);color:#ff4d6d;border:1px solid rgba(255,77,109,.4);border-radius:7px;padding:4px 10px;font-size:11px;">➖ retirer</button></div>';
  }).join('');
  var removed = (S.removedPairs || []).map(function (p) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.06);opacity:.75;">'
      + '<span style="color:#889;">' + p + ' <span style="font-size:10px;">(mémoire conservée)</span></span>'
      + '<button onclick="addPair(\'' + p + '\').then(function(r){if(!r.ok&&typeof showToast===\'function\')showToast(\'⚠ \'+r.reason,4000,\'warn\');openPairManager();});" style="background:rgba(0,232,122,.1);color:#00e87a;border:1px solid rgba(0,232,122,.35);border-radius:7px;padding:4px 10px;font-size:11px;">↩ réactiver</button></div>';
  }).join('') || '<div style="color:#667;font-size:11px;padding:6px 4px;">aucune</div>';
  ov.innerHTML = '<div style="background:#0d1420;border:1px solid rgba(0,232,122,.25);border-radius:14px;max-width:420px;width:100%;max-height:80vh;overflow:auto;padding:16px;font-family:inherit;color:#dfe7ef;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><strong style="color:#00e87a;">⚖ Gestion des paires</strong>'
    + '<button onclick="document.getElementById(\'pairMgrModal\').remove()" style="background:none;border:1px solid rgba(255,255,255,.2);color:#aab;border-radius:7px;padding:4px 10px;font-size:11px;">Fermer</button></div>'
    + '<div style="display:flex;gap:8px;margin-bottom:12px;">'
    + '<input id="pairMgrInput" placeholder="ex. DOT ou PEPE" style="flex:1;background:#0a0f18;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px 10px;color:#fff;font-size:13px;" />'
    + '<button onclick="var v=document.getElementById(\'pairMgrInput\').value;addPair(v).then(function(r){if(!r.ok&&typeof showToast===\'function\')showToast(\'⚠ \'+r.reason,4000,\'warn\');openPairManager();});" style="background:rgba(0,232,122,.12);color:#00e87a;border:1px solid rgba(0,232,122,.4);border-radius:8px;padding:8px 14px;font-size:12px;">➕ Ajouter</button></div>'
    + '<div style="font-size:10px;color:#667;margin-bottom:8px;">Validation Binance obligatoire · nouvelle paire = naissance neutre (LMSR 130/130) · retrait = désactivation, mémoire conservée</div>'
    + '<div style="font-size:11px;color:#89a;margin:8px 0 2px;font-weight:600;">ACTIVES (' + Object.keys(PAIRS).length + ')</div>' + actives
    + '<div style="font-size:11px;color:#89a;margin:12px 0 2px;font-weight:600;">RETIRÉES</div>' + removed
    + '</div>';
  ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
}
window.openPairManager = openPairManager;
