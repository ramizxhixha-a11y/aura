// ═══ [GO LIBÉRER · 21/11/2026] VERSION 20261121b · « MES PAIRES » MONTRE LES GAINS DU JOUR ═══
// Rams (21/11 08:52) : ses 11 fermetures du matin (+236 $) « n'indiquaient pas des gains » — « Mes paires » ne montre que le P&L CUMULÉ depuis le
// début du mode (363 trades en EV, surtout les pertes des bots d'avant le 12/11) : toutes les paires restaient rouges. (08:59) « bien sûr que je
// veux que cela montre ». Ici, à côté du cumul (inchangé) : AUJOURD'HUI — le total des fermetures du jour (en-tête de « Mes paires ») et, sous chaque
// paire, « auj. ± $ ». Même lecture que la fiche de la paire (02 _isCloseRow : fermetures des bots, de Rams, de la voix, d'urgence ; 02 _closeRowUsd :
// la ligne + ses parts fermées par paliers) ; montants BRUTS comme le cumul (avant frais et impôt : le net est « P&L jour » en haut). Jour = minuit de
// la tablette. Historique gardé par paire limité (09b1) : si la plus vieille ligne gardée est déjà d'aujourd'hui, le montant est marqué « ≥ ».
// Affichage seul : rien n'est écrit dans S ; enveloppe 07 renderPairPnl (appelée par 08 à chaque rendu) sans retoucher 07.
(function () {
  'use strict';
  function minuit(now) { var d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function usdOf(t) {
    try { if (typeof _closeRowUsd === 'function') { var u = _closeRowUsd(t); if (u && isFinite(u.usd)) return Number(u.usd); } } catch (e) {}
    return Number(t && t.pnlUsdt) || 0;
  }
  function estFermeture(t) {
    try { if (typeof _isCloseRow === 'function') return !!_isCloseRow(t); } catch (e) {}
    return !!t && (t.type === 'position' || t.type === 'urgence' || t.type === 'tendance');
  }
  // { usd, n, coupe } des fermetures du jour d'une paire
  function duJour(ps, m0) {
    var rows = (ps && Array.isArray(ps.trades)) ? ps.trades : [], usd = 0, n = 0, plusVieille = Infinity;
    for (var i = 0; i < rows.length; i++) {
      var t = rows[i]; if (!t) continue;
      var ts = Number(t.ts) || 0; if (ts < plusVieille) plusVieille = ts;
      if (ts >= m0 && estFermeture(t)) { usd += usdOf(t); n++; }
    }
    return { usd: usd, n: n, coupe: rows.length >= 30 && plusVieille >= m0 };
  }
  function txt(v, coupe) { return (coupe ? '≥ ' : '') + (v >= 0 ? '+' : '−') + '$' + Math.abs(v).toFixed(2); }

  function patch() {
    if (typeof S === 'undefined' || !S || !S.pairStates || typeof PAIRS === 'undefined') return;
    var m0 = minuit(Date.now()), tot = 0, n = 0, coupe = false;
    Object.keys(PAIRS).forEach(function (pair) {
      var ps = S.pairStates[pair]; if (!ps) return;
      var j = duJour(ps, m0), k = pair.replace('/', '_');
      tot += j.usd; n += j.n; coupe = coupe || j.coupe;
      var meta = document.getElementById('pb_meta_' + k); if (!meta || !meta.parentNode) return;
      var el = document.getElementById('pb_today_' + k);
      if (!el) { el = document.createElement('div'); el.id = 'pb_today_' + k; el.style.cssText = 'font-size:9px;font-weight:700;'; meta.parentNode.appendChild(el); }
      if (j.n) { el.textContent = 'auj. ' + txt(j.usd, j.coupe); el.style.color = j.usd >= 0 ? 'var(--up)' : 'var(--down)'; el.style.display = ''; }
      else el.style.display = 'none';
    });
    var gTr = document.getElementById('globalPnlTrades'); if (!gTr || !gTr.parentNode) return;
    var g = document.getElementById('globalPnlToday');
    if (!g) { g = document.createElement('div'); g.id = 'globalPnlToday'; g.style.cssText = 'font-size:var(--fs-11);font-weight:700;margin-top:3px;'; gTr.parentNode.insertBefore(g, gTr); }
    g.textContent = n ? ('Aujourd\'hui ' + txt(tot, coupe) + ' · ' + n + ' fermeture' + (n > 1 ? 's' : '')) : 'Aujourd\'hui : aucune fermeture';
    g.style.color = !n ? 'var(--t3)' : (tot >= 0 ? 'var(--up)' : 'var(--down)');
    g.title = 'Brut, avant frais et impôt (le net : « P&L jour » en haut). Le chiffre du dessous reste le cumul depuis le début du mode.';
  }

  function envelopper() {
    var o = (typeof window !== 'undefined') ? window.renderPairPnl : null;
    if (typeof o !== 'function' || o._gains) return false;
    var f = function () { var r = o.apply(this, arguments); try { patch(); } catch (e) {} return r; };
    f._gains = true; f._avant = o;
    window.renderPairPnl = f;
    return true;
  }
  envelopper();
  if (typeof window !== 'undefined') window._gainsPaires = { duJour: duJour, patch: patch, envelopper: envelopper, minuit: minuit };
})();
