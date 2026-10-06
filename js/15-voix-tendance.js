// ═══ [VOIX TENDANCE LONGUE · 07/10/2026] VERSION 20261007a · « Go voix tendance longue » (Rams, 06/10 23:48) ═══
// POURQUOI : la porte TENDANCE LONGUE (06/10, rejeu/tendance_longue.py, règles figées avant les données) est la première idée qui
// ENTRE depuis le 02/10 : la tendance des 28 derniers jours, revue chaque lundi, tenue jusqu'à ce qu'elle se retourne (z 2,83 sur
// 10/2018 → 09/2024 jamais lu ; fragile : sans 2020-21, z 1,6). La passation disait : « mission d'intégration en EV à part, une voix
// qui tient des semaines, à côté des bots à 15 min, seuil appris inchangé pour eux, puis EV en direct avant tout RE ». C'est ce module.
//
// LA RÈGLE (exactement celle de la porte, rien d'appris ni de choisi ici) :
//   • chaque LUNDI 00:00 UTC (w), pour chaque paire crypto active en EV (S.paperRealActivePairs, fiat de 02 CG_FIAT exclues) :
//     P_w = ouverture de la bougie 1 h Binance de w ; absente → clôture de la dernière bougie 1 h ouverte dans les 24 h avant ; sinon
//     pas de prix. Même chose pour w − 28 j. Signal = signe(P_w / P_(w−28 j) − 1) : + → LONG, − → SHORT, 0 → rien.
//   • la position est TENUE tant que le signe ne change pas ; quand il change : fermée et retournée au prix du moment (dernier prix
//     réel de l'app s'il a moins de 5 min — même fraîcheur que le filtre de 02 —, sinon le prix Binance demandé à l'instant).
//     Pas de stop, pas d'objectif, pas de durée. Seule autre sortie : la LIQUIDATION d'un SHORT si le prix double (perte = toute la
//     mise, comme la règle « perte jamais au-delà de la mise » de 02 closePosition) — vérifiée sur le prix en direct et, pour les heures
//     où la tablette dormait, sur les plus hauts des bougies 1 h Binance depuis le dernier contrôle.
//   • tablette éteinte le lundi : la décision de la semaine est prise au premier battement où l'EV est en play, sur les prix du lundi
//     00:00 (la porte a été passée aussi avec 1 jour de retard ; rejeu de la forme tenue : +1 et +2 jours restent positifs).
//   • coût d'un côté = S.feeConfig.takerRate + S.feeConfig.slippage (le barème que l'EV facture, 0,13 % aujourd'hui), à l'entrée et à
//     la sortie ; pas de financement (l'EV n'en facture pas).
// UNE POCHE À PART — ce module :
//   • n'ouvre ni ne ferme JAMAIS rien dans S.openPositions ; n'appelle ni openPosition, ni closePosition, ni autoOpenPosition ;
//     ne touche à aucun compte (caisse, trading, levier, frais), à aucun agent, bot, fitness, seuil appris, ni à la décision commune :
//     les bots à 15 min tournent exactement comme avant, sur les mêmes paires, et ne voient pas cette voix.
//   • garde SON état dans S.tendance (snapshot 09b1 → 09b2 applySnap + _APPLYSNAP_MANIFEST, donc aussi dans les backups) :
//     pos = position tenue par paire ; dec = décision de la semaine par paire ; hist = trades fermés (1 000 derniers) ;
//     tot = cumul depuis la mise en service (jamais tronqué). Une mise = 1 / (nombre de paires de la voix à l'entrée) de la poche,
//     non composée : c'est la mesure de la porte (« capital K/11 par paire »). Résultat en % de la poche ; l'écran le traduit en $ à
//     la taille de ton compte EV, sans rien y verser.
//   • décide seulement si l'EV est en play (_isModeRunning('paperReal')) ; en pause : positions gardées, rien de décidé.
//     AUTO / MANU ne la concernent pas : c'est une mesure, rien n'est ouvert sur ton compte.
//   • écrit au journal (S.chainLog, icône 📈) chaque ouverture, retournement, liquidation ; ajoute une barre « Tendance longue · EV »
//     à l'accueil (sous « Positions en cours Man »).
// RÉSEAU : 2 à 4 appels klines par paire et par semaine (+1 par heure et par SHORT tenu pour la liquidation) ; une paire qui échoue
// est réessayée 2 min plus tard ; une réponse sans prix (paire trop jeune, symbole absent de Binance) = « données absentes » pour la
// semaine, la position éventuelle est gardée.
(function () {
  'use strict';
  if (typeof window === 'undefined' || window._tl) return;

  var TL_V = '20261007a';
  var DAY = 86400000, WEEK = 7 * DAY, HOUR = 3600000;
  var MON0 = 4 * DAY;                  // lundi 05/01/1970 00:00 UTC
  var LOOK = 28 * DAY;                 // recul figé par la porte (en-tête de rejeu/tendance_longue.py)
  var FRESH = 300000;                  // âge max du dernier prix réel de l'app (02 _rcOutlier : référence fraîche = 5 min)
  var RETRY = 120000;                  // nouvel essai d'une paire après un échec réseau
  var FETCH_MS = 10000;                // délai max d'un appel Binance (comme les autres appels de l'app)
  var STALE = 300000;                  // un battement en cours depuis plus longtemps est abandonné (ses écritures sont ignorées)
  var HIST_MAX = 1000;
  var API = 'https://api.binance.com/api/v3/';
  var busy = false, gen = 0, nextTry = {}, liqAt = {}, open_ = false, lastHtml = '';
  var st = { v: TL_V, started: Date.now(), tick: 0, running: null, err: null, errAt: 0, net: 0 };

  function now() { return Date.now(); }
  function mondayOf(t) { return MON0 + Math.floor((t - MON0) / WEEK) * WEEK; }
  function sym(pair) { return String(pair).replace('/', ''); }
  function sideCost() {
    var f = (typeof S !== 'undefined' && S && S.feeConfig) || {};
    var c = (Number(f.takerRate) || 0) + (Number(f.slippage) || 0);
    return (isFinite(c) && c >= 0) ? c : 0;
  }
  function T() {
    if (typeof S === 'undefined' || !S) return null;
    var t = S.tendance;
    if (!t || typeof t !== 'object' || t.v !== 1) t = S.tendance = { v: 1, depuis: now(), pos: {}, dec: {}, hist: [], tot: null };
    if (!t.pos || typeof t.pos !== 'object') t.pos = {};
    if (!t.dec || typeof t.dec !== 'object') t.dec = {};
    if (!Array.isArray(t.hist)) t.hist = [];
    if (!t.tot || typeof t.tot !== 'object') t.tot = { net: 0, netL: 0, n: 0, win: 0, liq: 0 };
    return t;
  }
  function universe() {
    var a = (typeof S !== 'undefined' && S && S.paperRealActivePairs && typeof S.paperRealActivePairs === 'object') ? S.paperRealActivePairs : {};
    return Object.keys(a).filter(function (p) {
      if (!a[p]) return false;
      var b = String(p).split('/');
      if (b.length !== 2 || b[1] !== 'USDT' || !b[0]) return false;
      try { if (typeof CG_FIAT !== 'undefined' && CG_FIAT && CG_FIAT[b[0]]) return false; } catch (e) {}
      return true;
    }).sort();
  }
  function journal(icon, desc) {
    try {
      if (!S.chainLog) return;
      S.chainLog.push({ icon: icon, desc: desc, hash: (typeof rndHash === 'function') ? rndHash() : Math.random().toString(36).slice(2, 8),
        time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch (e) {}
  }
  function pc(x, d) { return (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(d === undefined ? 1 : d).replace('.', ',') + ' %'; }
  function fpx(p) { return (isFinite(p) && p > 0) ? Number(p).toLocaleString('fr-FR', { maximumSignificantDigits: 5 }) : '—'; }
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }   // texte venu de l'état (une sauvegarde importée)
  function short(pair) { return esc(String(pair).split('/')[0]); }
  // le battement g écrit encore dans la poche t ? (non si abandonné, ou si une sauvegarde a été restaurée entre-temps)
  function alive(t, g) { try { return g === gen && typeof S !== 'undefined' && !!S && S.tendance === t; } catch (e) { return false; } }

  // ── réseau : une erreur « données » (réponse sans prix, symbole refusé) se distingue d'une panne (réessayée) ──
  function dataErr(m) { var e = new Error(m); e.data = true; return e; }
  function getJ(url) {
    try { if (window._perfOp) window._perfOp('tendance:' + url.split('symbol=')[1].split('&')[0]); } catch (e) {}
    var opt = {};
    try { if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') opt.signal = AbortSignal.timeout(FETCH_MS); } catch (e) {}
    return fetch(url, opt).then(function (r) {
      if (r.status === 400) throw dataErr('symbole refusé par Binance');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  // prix à l'instant ts : règle de la porte (ouverture de la bougie 1 h de ts, sinon clôture de la dernière ouverte dans les 24 h avant).
  // Aucune bougie à partir de ts = Binance n'y est pas encore (horloge de la tablette en avance, coupure) : nouvel essai, jamais le repli.
  function pxAt(pair, ts) {
    var base = API + 'klines?symbol=' + sym(pair) + '&interval=1h';
    return getJ(base + '&startTime=' + ts + '&limit=1').then(function (a) {
      if (!Array.isArray(a) || !a[0]) throw new Error('bougie du ' + new Date(ts).toISOString().slice(0, 13).replace('T', ' ') + ' h UTC pas encore chez Binance');
      if (Number(a[0][0]) === ts) { var o = parseFloat(a[0][1]); if (isFinite(o) && o > 0) return o; }
      return getJ(base + '&endTime=' + (ts - 1) + '&limit=1').then(function (b) {
        if (Array.isArray(b) && b[0] && Number(b[0][0]) < ts && Number(b[0][0]) >= ts - DAY) { var c = parseFloat(b[0][4]); if (isFinite(c) && c > 0) return c; }
        return null;
      });
    });
  }
  // prix du moment pour exécuter : dernier prix réel de l'app s'il est frais, sinon Binance à l'instant
  function pxNow(pair) {
    try {
      if (typeof _rcPriceAge === 'function' && typeof _rcLastPrice === 'function' && _rcPriceAge(pair) < FRESH) {
        var p = _rcLastPrice(pair); if (isFinite(p) && p > 0) return Promise.resolve(p);
      }
    } catch (e) {}
    return getJ(API + 'ticker/price?symbol=' + sym(pair)).then(function (j) {
      var v = j && parseFloat(j.price);
      if (!(isFinite(v) && v > 0)) throw new Error('prix du moment absent');
      return v;
    });
  }
  function lastPx(pair) {   // affichage seulement (aucun appel réseau)
    try { if (typeof _rcLastPrice === 'function') { var p = _rcLastPrice(pair); if (p > 0) return p; } } catch (e) {}
    try { var w = (typeof _walletFor === 'function') ? _walletFor('paperReal') : null; var ps = w && w.pairStates && w.pairStates[pair]; if (ps && ps.price > 0) return ps.price; } catch (e) {}
    return 0;
  }

  // ── positions de la poche ──
  function openPos(t, pair, side, px, w, pW, pL, n) {
    t.pos[pair] = { side: side, w: w, pW: pW, pL: pL, x0: px, t0: now(), n: n, cIn: sideCost(), liqChk: Math.ceil(now() / HOUR) * HOUR };
    journal(side === 'long' ? '📈' : '📉', 'Tendance longue · ' + pair + ' ' + side.toUpperCase() + ' ouvert @' + fpx(px) +
      ' · 28 j : ' + pc(pW / pL - 1) + ' · tenu jusqu\'au retournement (poche à part, EV)');
  }
  function closePos(t, pair, px, ts, why, liq) {
    var p = t.pos[pair]; if (!p) return null;
    var d = p.side === 'long' ? 1 : -1;
    var r = liq ? -1 : Math.max(-1, d * (px / p.x0 - 1));
    var c = liq ? 0 : (Number(p.cIn) || 0) + sideCost();
    var net = Math.max(-1, r - c);
    var n = Math.max(1, Number(p.n) || 1);
    var h = { p: pair, s: d, w0: p.w, t0: p.t0, x0: p.x0, t1: ts, x1: px, r: r, c: c, net: net, n: n, why: why };
    t.hist.push(h); if (t.hist.length > HIST_MAX) t.hist.splice(0, t.hist.length - HIST_MAX);
    t.tot.net += net / n; if (d > 0) t.tot.netL += net / n;
    t.tot.n += 1; if (net > 0) t.tot.win += 1; if (liq) t.tot.liq += 1;
    delete t.pos[pair];
    journal(liq ? '💥' : (net > 0 ? '✅' : '↩'), 'Tendance longue · ' + pair + ' ' + (d > 0 ? 'LONG' : 'SHORT') + ' fermé (' + why + ') @' + fpx(px) +
      ' · ' + pc(net) + ' net sur sa mise · tenu ' + Math.max(0, Math.round((ts - p.t0) / DAY)) + ' j');
    return h;
  }
  // liquidation d'un SHORT : prix en direct, puis plus hauts des bougies 1 h depuis le dernier contrôle (heures de sommeil)
  function liqLive(t, pair) {
    var p = t.pos[pair]; if (!p || p.side !== 'short') return false;
    var px = 0;
    try { if (typeof _rcPriceAge === 'function' && _rcPriceAge(pair) < FRESH) px = _rcLastPrice(pair); } catch (e) {}
    if (px > 0 && px >= 2 * p.x0) { closePos(t, pair, 2 * p.x0, now(), 'liquidation : le prix a doublé', true); return true; }
    return false;
  }
  // l'heure d'entrée elle-même n'est pas relue (son plus haut peut dater d'avant l'entrée) : le prix en direct la couvre.
  // Pages de 1 000 heures enchaînées jusqu'au présent (tablette endormie des semaines).
  function liqHist(t, pair, g) {
    var p = t.pos[pair]; if (!p || p.side !== 'short') return Promise.resolve(false);
    var start = Math.ceil(p.t0 / HOUR) * HOUR;
    var from = Math.max(Number(p.liqChk) || 0, start);
    var url = API + 'klines?symbol=' + sym(pair) + '&interval=1h&startTime=' + from + '&limit=1000';
    return getJ(url).then(function (a) {
      if (!alive(t, g) || t.pos[pair] !== p || !Array.isArray(a)) return false;
      for (var i = 0; i < a.length; i++) {
        var o = Number(a[i][0]), hi = parseFloat(a[i][2]);
        if (o < start) continue;
        if (isFinite(hi) && hi >= 2 * p.x0) { closePos(t, pair, 2 * p.x0, o, 'liquidation : le prix a doublé', true); return true; }
      }
      if (a.length >= 1000) { p.liqChk = Number(a[a.length - 1][0]) + HOUR; return liqHist(t, pair, g); }
      var lastO = a.length ? Number(a[a.length - 1][0]) : from;     // la bougie en cours sera relue au prochain contrôle
      p.liqChk = Math.max(from, Math.min(Math.floor(now() / HOUR) * HOUR, lastO));
      return false;
    });
  }
  function lastClosed(t, pair) { for (var i = t.hist.length - 1; i >= 0; i--) if (t.hist[i].p === pair) return t.hist[i]; return null; }

  // ── décision de la semaine pour une paire ──
  function decide(t, pair, w, n, g) {
    var pre = (t.pos[pair] && t.pos[pair].side === 'short') ? liqHist(t, pair, g) : Promise.resolve(false);
    var stop = false;
    return pre.then(function () {
      var lh = lastClosed(t, pair);                    // liquidé depuis lundi 00:00 : rouvert au lundi suivant seulement (règle de la porte)
      if (!t.pos[pair] && lh && String(lh.why).indexOf('liquidation') === 0 && lh.t1 >= w) {
        if (alive(t, g)) t.dec[pair] = { w: w, s: null, at: now(), why: 'liquidée cette semaine · rouverte lundi prochain si le signal le dit' };
        stop = true; return null;
      }
      return pxAt(pair, w);
    }).then(function (pW) {
      if (stop) return null;
      return pxAt(pair, w - LOOK).then(function (pL) { return [pW, pL]; });
    }).then(function (v) {
      if (stop || !alive(t, g)) return;
      var pW = v[0], pL = v[1];
      var cur = t.pos[pair];
      if (!(pW > 0 && pL > 0)) {
        t.dec[pair] = { w: w, s: null, pW: pW, pL: pL, at: now(), why: 'données absentes' + (cur ? ' · position gardée' : '') };
        return;
      }
      var s = Math.sign(pW / pL - 1);
      var want = s > 0 ? 'long' : (s < 0 ? 'short' : null);
      if (cur && cur.side === want) { t.dec[pair] = { w: w, s: s, pW: pW, pL: pL, at: now(), why: 'tenue' }; return; }
      if (!cur && !want) { t.dec[pair] = { w: w, s: 0, pW: pW, pL: pL, at: now(), why: 'signal nul' }; return; }
      return pxNow(pair).then(function (px) {
        if (!alive(t, g) || t.pos[pair] !== cur) return;   // changé pendant l'attente (liquidation, restauration) : décision reprise au battement suivant
        if (cur) closePos(t, pair, px, now(), want ? 'retournement' : 'signal nul');
        if (want) openPos(t, pair, want, px, w, pW, pL, n);
        t.dec[pair] = { w: w, s: s, pW: pW, pL: pL, at: now(), px: px, why: cur ? (want ? 'retournement' : 'signal nul') : 'ouverture' };
      });
    });
  }

  function evRunning() { try { return (typeof _isModeRunning === 'function') ? !!_isModeRunning('paperReal') : false; } catch (e) { return false; } }

  function tick() {
    if (busy && (now() - st.tick) > STALE) { busy = false; gen++; st.err = 'battement abandonné après ' + Math.round(STALE / 60000) + ' min'; st.errAt = now(); }
    if (busy) return Promise.resolve(false);
    try { if (window._stateReady !== true) return Promise.resolve(false); } catch (e) { return Promise.resolve(false); }
    var t = T(); if (!t) return Promise.resolve(false);
    busy = true; st.tick = now();
    var g = ++gen, chain = Promise.resolve();
    // 1. liquidations (marché réel : vérifiées même EV en pause)
    Object.keys(t.pos).forEach(function (pair) {
      if (liqLive(t, pair)) return;
      if (t.pos[pair] && t.pos[pair].side === 'short' && !((liqAt[pair] || 0) > now() - HOUR)) {
        chain = chain.then(function () { liqAt[pair] = now(); return liqHist(t, pair, g); }).catch(function (e) { st.err = pair + ' liquidation : ' + ((e && e.message) || e); st.errAt = now(); });
      }
    });
    // 2. décision de la semaine (EV en play seulement)
    st.running = evRunning();
    var w = mondayOf(now()), wMax = 0;
    Object.keys(t.dec).forEach(function (p) { if (t.dec[p] && t.dec[p].w > wMax) wMax = t.dec[p].w; });
    if (st.running && w < wMax) { st.err = 'horloge de la tablette avant la semaine déjà décidée : rien de décidé'; st.errAt = now(); }
    if (st.running && w >= wMax) {
      var U = universe(), n = U.length;
      Object.keys(t.pos).forEach(function (pair) {           // paire retirée de l'EV : fermée à la décision de la semaine
        if (U.indexOf(pair) >= 0) return;
        if (t.dec[pair] && t.dec[pair].w === w) return;
        if ((nextTry[pair] || 0) > now()) return;
        chain = chain.then(function () {
          return pxNow(pair).then(function (px) { if (!alive(t, g)) return; if (t.pos[pair]) closePos(t, pair, px, now(), 'paire retirée de l\'EV'); t.dec[pair] = { w: w, s: null, at: now(), why: 'paire retirée de l\'EV' }; });
        }).catch(function (e) { nextTry[pair] = now() + RETRY; st.err = pair + ' : ' + ((e && e.message) || e); st.errAt = now(); });
      });
      U.forEach(function (pair) {
        chain = chain.then(function () {
          if (t.dec[pair] && t.dec[pair].w === w) return;
          if ((nextTry[pair] || 0) > now()) return;
          if (!alive(t, g)) return;
          return decide(t, pair, w, n, g).catch(function (e) {
            if (!alive(t, g)) return;
            if (e && e.data) { t.dec[pair] = { w: w, s: null, at: now(), why: 'données absentes (' + e.message + ')' + (t.pos[pair] ? ' · position gardée' : '') }; return; }
            nextTry[pair] = now() + RETRY; st.err = pair + ' : ' + ((e && e.message) || e); st.errAt = now();
          });
        });
      });
    }
    return chain.then(function () { if (g === gen) busy = false; try { render(); } catch (e) {} return true; },
                      function (e) { if (g === gen) busy = false; st.err = 'battement : ' + ((e && e.message) || e); st.errAt = now(); return false; });
  }

  // ── lecture : résultat de la poche ──
  function summary() {
    var t = T(); if (!t) return null;
    var lat = 0, latL = 0, rows = [], c1 = sideCost(), U = universe();
    var pairs = U.slice(); Object.keys(t.pos).forEach(function (p) { if (pairs.indexOf(p) < 0) pairs.push(p); });
    pairs.forEach(function (pair) {
      var p = t.pos[pair], px = lastPx(pair), row = { pair: pair, pos: p || null, dec: t.dec[pair] || null, px: px, r: null };
      if (p && px > 0) {
        var d = p.side === 'long' ? 1 : -1;
        var r = Math.max(-1, Math.max(-1, d * (px / p.x0 - 1)) - (Number(p.cIn) || 0) - c1);
        row.r = r; lat += r / Math.max(1, p.n); if (d > 0) latL += r / Math.max(1, p.n);
      }
      rows.push(row);
    });
    var eq = 0; try { eq = (typeof _computePortfolio === 'function' && typeof _walletFor === 'function') ? _computePortfolio(_walletFor('paperReal')) : 0; } catch (e) {}
    var w = mondayOf(now());
    return { v: TL_V, depuis: t.depuis, real: t.tot.net, realL: t.tot.netL, lat: lat, latL: latL, total: t.tot.net + lat, totalL: t.tot.netL + latL,
      trades: t.tot.n, win: t.tot.win, liq: t.tot.liq, open: Object.keys(t.pos).length, rows: rows, eqEV: eq, w: w, next: w + WEEK,
      decided: U.filter(function (p) { return t.dec[p] && t.dec[p].w === w; }).length, nU: U.length, running: evRunning(), hist: t.hist.slice(-5).reverse() };
  }

  // ── écran : barre « Tendance longue · EV » de l'accueil ──
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function render() {
    var bar = el('tlBar'); if (!bar) return;
    var s = summary(); if (!s) return;
    var cnt = el('tlBarCounter'), pnl = el('tlBarPnl');
    if (cnt) cnt.textContent = s.open + ' tenue' + (s.open > 1 ? 's' : '');
    if (pnl) { pnl.textContent = pc(s.total); pnl.style.color = s.total >= 0 ? 'var(--up)' : 'var(--down)'; }
    if (s.open > 0) bar.classList.add('has-active'); else bar.classList.remove('has-active');
    if (!bar.classList.contains('open')) return;
    var g = el('tlGrid'); if (!g) return;
    var dt = function (ts) { return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); };
    var nx = new Date(s.next).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    var col = function (x) { return x >= 0 ? 'var(--up)' : 'var(--down)'; };
    var usd = function (x) { return s.eqEV > 0 ? ' ≈ ' + (x >= 0 ? '+' : '−') + Math.abs(x * s.eqEV).toFixed(2).replace('.', ',') + ' $' : ''; };
    var h = '<div style="padding:8px 14px 4px;font-size:var(--fs-12);color:var(--t2);line-height:1.5">' +
      '<div style="font-size:var(--fs-14);color:var(--t1)">Poche <b style="color:' + col(s.total) + '">' + pc(s.total) + '</b>' + usd(s.total) +
      ' <span style="color:var(--t3)">(à la taille de ton compte EV)</span></div>' +
      '<div>réalisé ' + pc(s.real) + ' · latent ' + pc(s.lat) + ' · ' + s.trades + ' trade' + (s.trades > 1 ? 's' : '') + ' fermé' + (s.trades > 1 ? 's' : '') +
      (s.trades ? ' (' + s.win + ' gagnant' + (s.win > 1 ? 's' : '') + (s.liq ? ', ' + s.liq + ' liquidé' + (s.liq > 1 ? 's' : '') : '') + ')' : '') + '</div>' +
      '<div>« LONG ou rien » (le comptant) : ' + pc(s.totalL) + ' · depuis le ' + dt(s.depuis) + '</div>' +
      '<div>' + (s.running ? 'Semaine du ' + dt(s.w) + ' : ' + s.decided + '/' + s.nU + ' paires décidées · prochaine décision ' + nx
                           : '<span style="color:var(--gold)">⏸ EV en pause : positions gardées, rien de décidé</span>') + '</div></div>';
    h += '<div style="padding:2px 14px 6px">';
    s.rows.forEach(function (r) {
      var p = r.pos, d = r.dec;
      var left = '<b style="color:var(--t1);display:inline-block;min-width:46px">' + short(r.pair) + '</b>';
      var mid, right = '';
      if (p) {
        var wk = Math.max(0, Math.floor((now() - p.t0) / WEEK));
        mid = '<span style="color:' + (p.side === 'long' ? 'var(--up)' : 'var(--down)') + '">' + (p.side === 'long' ? 'LONG' : 'SHORT') + '</span>' +
          ' <span style="color:var(--t3)">' + dt(p.t0) + (wk ? ' (' + wk + ' sem.)' : '') + ' · ' + fpx(p.x0) + ' → ' + fpx(r.px) + '</span>';
        if (r.r !== null) right = '<b style="color:' + col(r.r) + '">' + pc(r.r) + '</b>';
      } else {
        mid = '<span style="color:var(--t3)">rien' + (d && d.why ? ' · ' + esc(d.why) : (s.running ? ' · en attente des prix du lundi' : '')) + '</span>';
      }
      h += '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:var(--fs-12);font-family:var(--font-mono)">' +
        '<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + left + mid + '</span><span style="flex-shrink:0">' + right + '</span></div>';
    });
    h += '</div>';
    if (s.hist.length) {
      h += '<div style="padding:4px 14px 2px;font-size:var(--fs-11);color:var(--t3)">Derniers trades fermés</div><div style="padding:0 14px 6px">';
      s.hist.forEach(function (x) {
        h += '<div style="display:flex;justify-content:space-between;gap:8px;font-size:var(--fs-11);color:var(--t2);padding:2px 0">' +
          '<span>' + short(x.p) + ' ' + (x.s > 0 ? 'LONG' : 'SHORT') + ' ' + dt(x.t0) + ' → ' + dt(x.t1) + ' · ' + esc(x.why) + '</span>' +
          '<b style="color:' + col(x.net) + '">' + pc(x.net) + '</b></div>';
      });
      h += '</div>';
    }
    h += '<div style="padding:4px 14px 10px;font-size:var(--fs-10);color:var(--t3);line-height:1.45">Règle figée par la porte TENDANCE LONGUE (06/10) : ' +
      'signe du prix du lundi 00:00 UTC contre 28 jours avant, tenu jusqu\'au retournement ; pas de stop, pas d\'objectif ; un SHORT est liquidé si le prix double. ' +
      'Une mise = 1/' + (s.nU || '—') + ' de la poche, non composée. Ne touche ni ton compte EV ni les bots. Preuve fragile : sans 2020-21, la porte ne passait plus.</div>';
    if (lastHtml !== h || !g.firstChild) { g.innerHTML = h; lastHtml = h; }
  }
  function toggle() {
    var bar = el('tlBar'); if (!bar) return;
    open_ = !bar.classList.contains('open');
    if (open_) bar.classList.add('open'); else bar.classList.remove('open');
    try { render(); } catch (e) {}
  }

  window._tlStatus = st;
  window._tl = { V: TL_V, mondayOf: mondayOf, universe: universe, pxAt: pxAt, pxNow: pxNow, decide: decide, tick: tick, summary: summary,
    render: render, toggle: toggle, state: T, LOOK: LOOK, WEEK: WEEK };
  window._tlToggle = toggle;
  setInterval(function () { try { tick(); } catch (e) {} }, 60000);
  setInterval(function () { try { var b = el('tlBar'); if (b && b.classList.contains('open')) render(); } catch (e) {} }, 5000);
  var boot = setInterval(function () { try { if (window._stateReady === true) { clearInterval(boot); setTimeout(function () { tick(); }, 20000); } } catch (e) {} }, 1000);
  try { document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(function () { try { tick(); } catch (e) {} }, 5000); }); } catch (e) {}
})();
