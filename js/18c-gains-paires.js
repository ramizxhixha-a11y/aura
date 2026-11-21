// ═══ [GO LIBÉRER · 21/11/2026] VERSION 20261121c · « MES PAIRES » MONTRE LE VRAI RÉSULTAT ═══
// Rams (21/11 08:52 / 08:59) : ses gains « n'indiquaient pas » ; (09:50, capture de la tablette) « ça n'affiche toujours pas réellement ce qui est
// censé afficher ». Constat (backup du pont 21/11 09:50, EV) : le compteur cumulé des paires (02 ps.totalPnlUsd, affiché par 07 renderPairPnl) dit
// −35 $ sur 364 trades, mais l'ARGENT dit +114 $ (portefeuille total 2 372,94 $ − versements de Rams 2 258,87 $) et le compteur des frais
// +188,57 $ brut sur 402 trades : le compteur des paires ne suit pas l'argent (écart ≈ 225 $, d'avant le 10/10 ; cause non établie — compteur
// gardé tel quel, rien n'est remis à zéro). « Mes paires » montre donc, À LA PLACE du compteur :
//   • le grand chiffre = le RÉSULTAT RÉEL du mode : l'argent à Rams (02 _pnlBasis, base du P&L jour : trading + caisse + mises engagées − dette
//     du levier − frais dus) + la réserve d'impôt + la part anti-négatif − ses versements (ownFundsInjected) ; un mode sans versement garde l'ancien chiffre ;
//   • chaque paire = ses fermetures du journal fiscal (16 : une ligne par fermeture, pu = résultat brut, 300 lignes en AA / EV) depuis la plus
//     ancienne ligne gardée (« depuis le 10/10 » en EV aujourd'hui), barre et tri sur ce chiffre ; sans journal : l'ancien compteur ;
//   • « auj. ± $ » sous chaque paire et « Aujourd'hui ± $ · n fermetures » en tête (lignes de la paire, 02 _isCloseRow / _closeRowUsd, jour de la
//     tablette ; « ≥ » si l'historique gardé est coupé).
// Montants des paires BRUTS (avant frais et impôt), le grand chiffre NET de frais (l'argent). Affichage seul : rien n'est écrit dans S ; enveloppe
// 07 renderPairPnl (appelée par 08 à chaque rendu) sans retoucher 07.
(function () {
  'use strict';
  function minuit(now) { var d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function num(x) { var n = Number(x); return isFinite(n) ? n : 0; }
  function usdOf(t) {
    try { if (typeof _closeRowUsd === 'function') { var u = _closeRowUsd(t); if (u && isFinite(u.usd)) return Number(u.usd); } } catch (e) {}
    return num(t && t.pnlUsdt);
  }
  function estFermeture(t) {
    try { if (typeof _isCloseRow === 'function') return !!_isCloseRow(t); } catch (e) {}
    return !!t && (t.type === 'position' || t.type === 'urgence' || t.type === 'tendance');
  }
  function duJour(ps, m0) {
    var rows = (ps && Array.isArray(ps.trades)) ? ps.trades : [], usd = 0, n = 0, plusVieille = Infinity;
    for (var i = 0; i < rows.length; i++) {
      var t = rows[i]; if (!t) continue;
      var ts = num(t.ts); if (ts < plusVieille) plusVieille = ts;
      if (ts >= m0 && estFermeture(t)) { usd += usdOf(t); n++; }
    }
    return { usd: usd, n: n, coupe: rows.length >= 30 && plusVieille >= m0 };
  }
  function wallet() {
    try { if (typeof _walletFor === 'function') return _walletFor(S.tradingMode); } catch (e) {}
    return (S.walletStore && S.walletStore[S.tradingMode]) || null;
  }
  // résultat réel du mode à l'écran : null sans versement
  function resultat() {
    var w = wallet(); if (!w) return null;
    var verse = num(w.ownFundsInjected); if (!(verse > 0)) return null;
    // 02 _pnlBasis : l'argent à Rams (trading + caisse + mises engagées − dette du levier − frais dus), base du P&L jour ; + la réserve d'impôt
    var base = (typeof _pnlBasis === 'function') ? num(_pnlBasis())
      : ((typeof _computePortfolio === 'function') ? num(_computePortfolio()) : (num(S.cashAccount) + num(S.tradingAccount))) - num(S.leverageBorrowed);
    var total = base + num(S.fiscalReserveAccount) + num(S.antiNegTaxPart);
    return { usd: total - verse, total: total, verse: verse };
  }
  // fermetures du journal fiscal par paire : { paires: {pair: {usd, n, win}}, depuis, n, coupe } ou null
  function parPaire() {
    var w = wallet(), h = w && w.fiscal && Array.isArray(w.fiscal.hist) ? w.fiscal.hist : null;
    if (!h || !h.length) return null;
    var P = {}, depuis = Infinity, n = 0;
    for (var i = 0; i < h.length; i++) {
      var x = h[i]; if (!x || !x.p || !isFinite(Number(x.pu))) continue;
      var a = P[x.p] || (P[x.p] = { usd: 0, n: 0, win: 0 });
      a.usd += Number(x.pu); a.n++; if (Number(x.pu) > 0) a.win++; n++;
      if (num(x.t) && num(x.t) < depuis) depuis = num(x.t);
    }
    var cap = 300; try { if (typeof _FISC_HIST_MAX !== 'undefined' && _FISC_HIST_MAX[S.tradingMode]) cap = _FISC_HIST_MAX[S.tradingMode]; } catch (e) {}
    return { paires: P, depuis: depuis, n: n, coupe: h.length >= cap };
  }
  function txt(v, coupe) { return (coupe ? '≥ ' : '') + (v >= 0 ? '+' : '−') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function jj(ms) { var d = new Date(ms); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }

  function patch() {
    if (typeof S === 'undefined' || !S || !S.pairStates || typeof PAIRS === 'undefined') return;
    var m0 = minuit(Date.now()), tot = 0, n = 0, coupe = false, F = parPaire(), vals = [];
    Object.keys(PAIRS).forEach(function (pair) {
      var ps = S.pairStates[pair]; if (!ps) return;
      var j = duJour(ps, m0), k = pair.replace('/', '_');
      tot += j.usd; n += j.n; coupe = coupe || j.coupe;
      var meta = document.getElementById('pb_meta_' + k); if (!meta || !meta.parentNode) return;
      if (F) {
        var a = F.paires[pair] || { usd: 0, n: 0, win: 0 };
        vals.push({ pair: pair, k: k, usd: a.usd });
        var u = document.getElementById('pb_usd_' + k);
        if (u) { u.textContent = txt(a.usd, false); u.style.color = a.usd >= 0 ? 'var(--up)' : 'var(--down)'; }
        meta.textContent = a.n + 't · ' + (a.n ? Math.round(a.win / a.n * 100) : 0) + '%';
      }
      var el = document.getElementById('pb_today_' + k);
      if (!el) { el = document.createElement('div'); el.id = 'pb_today_' + k; el.style.cssText = 'font-size:9px;font-weight:700;'; meta.parentNode.appendChild(el); }
      if (j.n) { el.textContent = 'auj. ' + txt(j.usd, j.coupe); el.style.color = j.usd >= 0 ? 'var(--up)' : 'var(--down)'; el.style.display = ''; }
      else el.style.display = 'none';
    });
    if (F && vals.length) {                                       // barres et ordre sur le journal fiscal
      var max = Math.max(1, Math.max.apply(null, vals.map(function (v) { return Math.abs(v.usd); })));
      vals.forEach(function (v) {
        var f = document.getElementById('pb_fill_' + v.k); if (!f) return;
        var up = v.usd >= 0;
        f.style.width = Math.min(100, Math.abs(v.usd) / max * 100) + '%'; f.style.background = up ? '#00e87a' : '#ff3d6b';
        f.style.left = up ? '0' : 'auto'; f.style.right = up ? 'auto' : '0';
      });
      var bars = document.getElementById('pairPnlBars');
      if (bars) {
        var rows = vals.slice().sort(function (a, b) { return b.usd - a.usd; })
          .map(function (v) { return bars.querySelector ? bars.querySelector('[data-pairbar="' + v.pair + '"]') : null; }).filter(Boolean);
        var cur = Array.prototype.slice.call(bars.children || []);
        var same = rows.length === cur.length && rows.every(function (r, i) { return r === cur[i]; });
        if (!same) rows.forEach(function (r) { bars.appendChild(r); });
      }
    }
    var gUsd = document.getElementById('globalPnlUsd'), gTr = document.getElementById('globalPnlTrades');
    var R = resultat();
    if (gUsd && R) {
      gUsd.textContent = txt(R.usd, false); gUsd.style.color = R.usd >= 0 ? 'var(--up)' : 'var(--down)';
      var lab = gUsd.previousElementSibling;
      if (lab) lab.textContent = 'Résultat réel · ton argent';
      var sub = document.getElementById('globalPnlReel');
      if (!sub) { sub = document.createElement('div'); sub.id = 'globalPnlReel'; sub.style.cssText = 'font-size:var(--fs-9);color:var(--t3);margin-top:2px;'; gUsd.parentNode.appendChild(sub); }
      sub.textContent = 'Ton argent ' + txt(R.total, false).replace('+', '') + ' (réserve d\'impôt comprise) − tes versements ' + txt(R.verse, false).replace('+', '');
    }
    if (gTr && F) gTr.textContent = 'paires : ' + F.n + ' fermetures ' + (F.coupe ? '(les ' + F.n + ' dernières) ' : '') + 'depuis le ' + jj(F.depuis) + ' · brut';
    if (!gTr || !gTr.parentNode) return;
    var g = document.getElementById('globalPnlToday');
    if (!g) { g = document.createElement('div'); g.id = 'globalPnlToday'; g.style.cssText = 'font-size:var(--fs-11);font-weight:700;margin-top:3px;'; gTr.parentNode.insertBefore(g, gTr); }
    g.textContent = n ? ('Aujourd\'hui ' + txt(tot, coupe) + ' · ' + n + ' fermeture' + (n > 1 ? 's' : '')) : 'Aujourd\'hui : aucune fermeture';
    g.style.color = !n ? 'var(--t3)' : (tot >= 0 ? 'var(--up)' : 'var(--down)');
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
  if (typeof window !== 'undefined') window._gainsPaires = { duJour: duJour, patch: patch, envelopper: envelopper, minuit: minuit, resultat: resultat, parPaire: parPaire };
})();
