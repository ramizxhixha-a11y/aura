// [FENÊTRE APPRENANTE · 26/09/2026] VERSION 20260926f · section « Fenêtre de jugement » : fenêtre courante (apprise ou défaut), événements rejoués, précision par fenêtre
// [VÉRITÉ DES RÈGLES · 23/09/2026] VERSION 20260923f · sous chaque règle armée : promesse vs réalité depuis l'armement
// [ÉCRAN APPRIS · 23/09/2026] VERSION 20260923c
// ═══ CE QUE LE SYSTÈME A APPRIS — ÉCRAN, LECTURE SEULE (« go », Rams 23/09) ═══
// Jusqu'ici tout ce que le système apprend (attribution par source, règles de gain / stop / horizon par paire, paliers
// d'emplacements, blacklist, compteurs du journal) ne se lisait que dans les backups. Ce module l'affiche : un bouton
// « 🧠 Appris » sur la page Journal ouvre un panneau. Il ne modifie rien : aucune écriture, aucune décision.
'use strict';

function _lrnPct(v, dec) { return (isFinite(v) ? (v >= 0 ? '+' : '') + Number(v).toFixed(dec === undefined ? 2 : dec) : '—') + ' %'; }
function _lrnActivePairs() {
  try {
    var mode = S.tradingMode;
    if (mode === 'paperReal' || mode === 'real') return Object.keys(S.paperRealActivePairs || {}).filter(function (p) { return S.paperRealActivePairs[p]; });
    return Object.keys((typeof PAIRS !== 'undefined' && PAIRS) || {});
  } catch (e) { return []; }
}
function _lrnPathCount(pair) {
  try { return (S.tradeContextMemory || []).filter(function (t) { return t && t.pair === pair && t.closedAt && t.path && isFinite(t.path.mfe); }).slice(-30).length; } catch (e) { return 0; }
}
// Construit le HTML du panneau (pur : lit S, ne l'écrit pas) — testé par banc-ecran-appris.js
function _learnedPanelHtml() {
  var h = '';
  var row = function (cells, muted) { return '<div style="display:grid;grid-template-columns:' + cells.map(function (c) { return c.w || '1fr'; }).join(' ') + ';gap:6px;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px;' + (muted ? 'color:#889;' : '') + '">' + cells.map(function (c) { return '<span style="' + (c.s || '') + '">' + c.t + '</span>'; }).join('') + '</div>'; };
  var title = function (t, sub) { return '<div style="font-size:11px;color:#89a;margin:12px 0 4px;font-weight:600;">' + t + (sub ? ' <span style="font-weight:400;color:#667;">' + sub + '</span>' : '') + '</div>'; };
  // 1 · sources
  var mode = S.tradingMode === 'real' ? 'real' : 'paperReal';
  var att = (typeof _attributionSummary === 'function') ? _attributionSummary(mode) : [];
  h += title('SOURCES DE DONNÉES', '· ce que chaque donnée rapporte, par trade (EV)');
  if (!att.length) h += '<div style="color:#667;font-size:11px;">pas encore de trade attribué</div>';
  else {
    h += row([{ t: 'source', w: '1.2fr' }, { t: 'trades', w: '.6fr' }, { t: 'réussite', w: '.8fr' }, { t: 'P&L moyen', w: '1fr' }], true);
    att.forEach(function (r) { h += row([{ t: r.src, w: '1.2fr', s: 'font-weight:600;' }, { t: String(r.n), w: '.6fr' }, { t: r.winRate + ' %', w: '.8fr' }, { t: _lrnPct(r.avgPnl, 3), w: '1fr', s: 'color:' + (r.avgPnl >= 0 ? '#00e87a' : '#ff4d6d') + ';' }]); });
  }
  // 2 · règles par paire
  var pairs = _lrnActivePairs();
  h += title('RÈGLES APPRISES PAR PAIRE', '· armées seulement sur preuve (≥ 8 chemins), révisées à chaque clôture');
  h += row([{ t: 'paire', w: '1fr' }, { t: 'chemins', w: '.7fr' }, { t: 'gain', w: '1.1fr' }, { t: 'stop', w: '.9fr' }, { t: 'horizon', w: '.9fr' }], true);
  pairs.forEach(function (p) {
    var g = S.gainRules && S.gainRules[p], st = S.stopRules && S.stopRules[p], hz = S.horizonRules && S.horizonRules[p], n = _lrnPathCount(p);
    var col = (typeof PAIRS !== 'undefined' && PAIRS[p] && PAIRS[p].color) || '#ccc';
    h += row([
      { t: p.replace('/USDT', ''), w: '1fr', s: 'color:' + col + ';font-weight:600;' },
      { t: n + '/8', w: '.7fr', s: n >= 8 ? 'color:#00e87a;' : 'color:#889;' },
      { t: g ? ('pic ≥ +' + g.m + ' → ' + Math.round(g.f * 100) + ' % (' + _lrnPct(g.gain, 2) + ')') : '—', w: '1.1fr', s: g ? 'color:#00e87a;' : 'color:#556;' },
      { t: st ? ('−' + st.d + ' % (' + _lrnPct(st.gain, 2) + ')') : '—', w: '.9fr', s: st ? 'color:#ff8fb1;' : 'color:#556;' },
      { t: hz ? (hz.H + ' min (' + hz.worse + ' % pire)') : '—', w: '.9fr', s: hz ? 'color:#ffd166;' : 'color:#556;' }
    ]);
    // [VÉRITÉ DES RÈGLES · 23/09/2026] promesse vs réalité : depuis l'armement, tous les trades de la paire, contre avant
    [['gain', g], ['stop', st], ['horizon', hz]].forEach(function (kv) {
      var tr = kv[1] && (typeof _ruleTruth === 'function') ? _ruleTruth(p, kv[0]) : null;
      if (!tr) return;
      var txt = tr.n ? ('depuis armée : ' + tr.n + ' trade' + (tr.n > 1 ? 's' : '') + ', ' + _lrnPct(tr.mean, 2) + '/trade (avant ' + _lrnPct(tr.before, 2) + ', promesse ' + _lrnPct(tr.promise, 2) + '), ' + tr.acted + ' sortie' + (tr.acted > 1 ? 's' : '') + ' par la règle') : 'depuis armée : aucun trade encore';
      h += row([{ t: '', w: '1fr' }, { t: '↳ ' + kv[0], w: '.7fr', s: 'color:#889;' }, { t: txt, w: '2.9fr', s: 'color:' + (tr.delta === null ? '#889' : tr.delta >= 0 ? '#00e87a' : '#ff4d6d') + ';' }]);
    });
  });
  // 3 · emplacements
  var cr = S.capRules || {}, ceil = (typeof _capCeiling === 'function') ? _capCeiling() : pairs.length;
  h += title('EMPLACEMENTS APPRIS', '· niveau courant / plafond = paires actives (' + ceil + ')');
  ['total', 'long', 'short'].forEach(function (k) {
    var r = cr[k]; var lab = k === 'total' ? 'en tout' : ('même sens ' + k.toUpperCase());
    var cases = r && r.n ? Object.keys(r.n).filter(function (lv) { return r.n[lv] > 0; }).map(function (lv) { return lv + 'e : ' + r.n[lv] + ' cas'; }).join(' · ') : '';
    h += row([{ t: lab, w: '1fr', s: 'font-weight:600;' }, { t: r ? (r.level + ' / ' + ceil) : '—', w: '.6fr', s: 'color:#00e87a;' }, { t: (r && r.harmful) ? ('le ' + r.harmful + 'e a nui') : (cases || 'pas encore de preuve'), w: '1.8fr', s: 'color:#889;' }]);
  });
  // 4 · blacklist
  var ls = S._lossStreaks || {}, lsKeys = Object.keys(ls);
  h += title('BLACKLIST', '· < 30 % de réussite sur 10 trades → pause 2 h (EV/RE seulement)');
  if (!lsKeys.length) h += '<div style="color:#667;font-size:11px;">fenêtre vide (elle se remplit avec les trades EV)</div>';
  else lsKeys.forEach(function (p) {
    var s = ls[p] || {}, rt = s.recentTrades || [], w = rt.filter(function (x) { return x && (x.won === true || x === true || x.pnl > 0); }).length;
    var paused = s.blacklistedUntil && s.blacklistedUntil > Date.now();
    h += row([{ t: p.replace('/USDT', ''), w: '1fr', s: 'font-weight:600;' }, { t: rt.length + ' trades', w: '.8fr' }, { t: rt.length ? Math.round(100 * w / rt.length) + ' %' : '—', w: '.6fr' }, { t: paused ? ('⏸ pause ' + Math.ceil((s.blacklistedUntil - Date.now()) / 60000) + ' min') : 'active', w: '1fr', s: paused ? 'color:#ff4d6d;' : 'color:#889;' }]);
  });
  // 4b · fenêtre de jugement [FENÊTRE APPRENANTE · 26/09/2026]
  var fw = S.fitWindowRule;
  h += title('FENÊTRE DE JUGEMENT', '· combien de jugements font la fitness d\'un siège — apprise par rejeu, 60 par défaut');
  if (!fw) h += '<div style="color:#667;font-size:11px;">pas encore rejouée</div>';
  else {
    var accTxt = Object.keys(fw.acc || {}).map(function (w) { return w + ' → ' + fw.acc[w] + ' %'; }).join(' · ');
    h += row([{ t: fw.armed ? (fw.window + ' jugements (apprise)') : '60 jugements (défaut)', w: '1.4fr', s: fw.armed ? 'color:#00e87a;font-weight:600;' : 'font-weight:600;' }, { t: fw.n + ' événements rejoués', w: '1fr' }, { t: fw.why || ('meilleure : ' + fw.best), w: '1.6fr', s: 'color:#889;' }]);
    if (accTxt) h += row([{ t: 'précision du conseil', w: '1.4fr', s: 'color:#889;' }, { t: accTxt, w: '2.6fr', s: 'color:#889;' }]);
  }
  // 5 · journal
  var es = S.eventStats || {}, days = Object.keys(es).sort().slice(-3);
  h += title('JOURNAL', '· événements comptés par jour');
  if (!days.length) h += '<div style="color:#667;font-size:11px;">rien encore</div>';
  else days.forEach(function (d) {
    var st = es[d] || {};
    var keys = ['ouverture', 'fermeture', 'sortie_gain', 'sortie_trailing', 'sortie_zombie', 'sortie_consensus', 'reseau', 'veto'];
    var parts = keys.filter(function (k) { return st[k]; }).map(function (k) { return k.replace('sortie_', '') + ' ' + st[k]; });
    h += row([{ t: d.slice(5), w: '.6fr', s: 'font-weight:600;' }, { t: parts.join(' · ') || '—', w: '3fr', s: 'color:#aab;' }]);
  });
  return h;
}
function openLearnedPanel() {
  try {
    var old = document.getElementById('learnedModal'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'learnedModal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = '<div style="background:#0d1420;border:1px solid rgba(0,232,122,.25);border-radius:14px;max-width:480px;width:100%;max-height:85vh;overflow:auto;padding:16px;font-family:inherit;color:#dfe7ef;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><strong style="color:#00e87a;">🧠 Ce que le système a appris</strong>'
      + '<button onclick="document.getElementById(\'learnedModal\').remove()" style="background:none;border:1px solid rgba(255,255,255,.2);color:#aab;border-radius:7px;padding:4px 10px;font-size:11px;">Fermer</button></div>'
      + '<div style="font-size:10px;color:#667;margin-bottom:6px;">lecture seule · tout ici est décidé par le système sur ses propres trades · rien ne bouge avant huit chemins par paire</div>'
      + _learnedPanelHtml()
      + '</div>';
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
  } catch (e) { try{window._decErr&&window._decErr(e)}catch(_e){} }
}
function _injectLearnedButton() {
  if (document.getElementById('learnedBtn')) return false;
  var anchor = document.getElementById('mobileChainList');
  if (!anchor || !anchor.parentNode) return false;
  var btn = document.createElement('button');
  btn.id = 'learnedBtn';
  btn.textContent = '🧠 Ce que le système a appris';
  btn.style.cssText = 'display:block;margin:8px 16px 0 auto;padding:6px 14px;background:rgba(0,232,122,.08);color:var(--up,#00e87a);border:1px solid rgba(0,232,122,.35);border-radius:9px;font-size:11px;font-weight:600;cursor:pointer;';
  btn.onclick = openLearnedPanel;
  anchor.parentNode.insertBefore(btn, anchor);
  return true;
}
window.openLearnedPanel = openLearnedPanel; window._learnedPanelHtml = _learnedPanelHtml; window._injectLearnedButton = _injectLearnedButton;
// Veilleur : la page Journal est re-rendue ; on repose le bouton s'il manque (test par id toutes les 2 s, coût nul).
setInterval(function () { try { _injectLearnedButton(); } catch (e) {} }, 2000);
