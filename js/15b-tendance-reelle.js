// ═══ [GO TENDANCE RÉELLE · 12/11/2026] VERSION 20261112a · « Go tendances réelle tout » (Rams, 12/11 19:49) ═══
// POURQUOI : la voix tendance longue (js/15, porte TENDANCE LONGUE du 06/10) est la seule idée qui a passé une porte. Elle jouait dans une
// poche à part, sans argent. Rams lui donne TOUT l'argent de l'EV : ce module fait SUIVRE la poche par le compte EV, avec de vraies positions
// (openPosition / closePosition, frais, historique, impôt), pendant que la poche reste la mesure de la porte (js/15 inchangé).
//
// CE QUE FAIT LE MODULE (toutes les 20 s, dans le contexte EV — même bascule que 10f _lossCapSweep) :
//   • la poche tient une paire (LONG / SHORT, entrée t0) → le compte EV tient la même paire, même sens, marquée _voix = 'tendance' ;
//   • la poche se retourne ou ferme (retournement, liquidation, paire retirée) → la position EV est fermée (closePosition { voix }), puis
//     rouverte dans le nouveau sens avec l'argent revenu ; liquidée par la poche : fermée AU PRIX DE LA LIQUIDATION (go n° 80, 15/11) ;
//   • un SHORT de l'EV dont le prix a doublé depuis SON entrée est fermé (−100 % de sa mise, comme la poche) et n'est pas rouvert avant le
//     lundi suivant ; vu sur le prix en direct ET, pour les heures où la tablette dormait, sur les plus hauts des bougies 1 h Binance depuis
//     le dernier contrôle (même règle que la poche, js/15 liqHist ; go n° 108, 15/11) — fermé alors AU PRIX DE LA LIQUIDATION (2 × son entrée) ;
//   • ENTRÉE AU PRIX DU MOMENT (prix réel de moins de 5 min), jamais au prix d'entrée de la poche : ce serait de l'argent inventé.
//   • MISE (porte POIDS du 12/11, rejeu/porte_poids.py : « égal » retenu ; « force » perd, « risque égal » non prouvé) : à chaque entrée,
//     min(trading, (trading + valeur des positions de la voix) / n), n = paires tenues par la poche ; sans levier ; une position tenue n'est
//     jamais retaillée.
// CE QUI NE LA TOUCHE PAS : aucune sortie automatique des bots (perte max, trailing, TP / SL, anti-zombie, consignes, rescue…) — 02
// closePosition la leur refuse. La ferment seulement : la voix, TON ✕ / ta fiche / « tout fermer », l'Urgence (et le Bunker s'il est armé
// pour fermer), et « jamais sous zéro ». Fermée par toi (ou l'urgence, la solvabilité) : rouverte au lundi suivant si la poche la tient encore.
// RÈGLES DE RAMS : AUTO / MANU à Rams seul — en MANU la voix ferme mais n'ouvre jamais ; EV en pause : rien n'est ouvert (les fermetures
// suivent la poche, qui ne décide pas en pause : seules les liquidations passent). Les bots à 15 min n'ouvrent plus en EV (09c) ; ils restent
// dans l'AA. Le RE ne change pas. Fiscal : ouvertes par la voix → régime spéculatif (16). État : S.tendance.reel (sauvé avec la poche).
// RÉSEAU (go n° 108) : 1 appel klines 1 h par heure et par SHORT de la voix (comme la poche) ; un échec est réessayé l'heure suivante.
(function () {
  'use strict';
  if (typeof window === 'undefined' || window._tlr) return;

  var V = '20261112a';
  var DAY = 86400000, WEEK = 7 * DAY, MON0 = 4 * DAY;
  var FRESH = 300000;                  // âge max du prix réel pour agir (même fraîcheur que la poche, js/15)
  var RETRY = 300000;                  // une ouverture refusée est réessayée 5 min plus tard (pas de toast en boucle)
  var MODE = 'paperReal';
  var busy = false, lastHtml = '';
  var st = { v: V, tick: 0, last: 0, err: null, errAt: 0 };
  // [GO N° 108 · 15/11/2026] liquidation PROPRE de l'EV pendant le sommeil de la tablette : mêmes constantes que la poche (js/15)
  var HOUR = 3600000, FETCH_MS = 10000, STALE = 300000, API = 'https://api.binance.com/api/v3/';
  var pend = {}, liqAt = {}, hRun = 0, hGen = 0;     // mémoire seulement : pend[id] = mèche trouvée (fermée au battement), liqAt[id] = dernier contrôle
  var hst = { n: 0, at: 0, err: null, errAt: 0 };

  function now() { return Date.now(); }
  function mondayOf(t) { return MON0 + Math.floor((t - MON0) / WEEK) * WEEK; }
  function num(x) { var n = Number(x); return isFinite(n) ? n : 0; }
  function journal(icon, desc) {
    try {
      if (!S.chainLog) return;
      S.chainLog.push({ icon: icon, desc: desc, hash: (typeof rndHash === 'function') ? rndHash() : Math.random().toString(36).slice(2, 8),
        time: (typeof nowStr === 'function') ? nowStr() : new Date().toLocaleTimeString() });
      if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
    } catch (e) {}
  }
  function fmt(x) { return (x < 0 ? '−' : '') + Math.abs(x).toFixed(2).replace('.', ',') + ' $'; }
  function sgn(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2).replace('.', ',') + ' $'; }
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  // état du suiveur, rangé DANS la poche (09b1 / 09b2 la sauvent déjà, backups compris)
  function R() {
    if (typeof S === 'undefined' || !S) return null;
    var t = S.tendance; if (!t || typeof t !== 'object' || t.v !== 1) return null;
    var r = t.reel;
    if (!r || typeof r !== 'object' || r.v !== 1) r = t.reel = { v: 1, on: 1, depuis: now(), suivi: {}, attente: {}, bloque: {}, essai: {}, real: 0, n: 0 };
    ['suivi', 'attente', 'bloque', 'essai'].forEach(function (k) { if (!r[k] || typeof r[k] !== 'object') r[k] = {}; });
    if (!isFinite(r.real)) r.real = 0;
    return r;
  }
  function tientEV() { try { var r = R(); return !!(r && r.on === 1); } catch (e) { return false; } }

  function fresh(pair) {
    try { return typeof _rcPriceAge === 'function' && _rcPriceAge(pair) < FRESH; } catch (e) { return false; }
  }
  function mine() { return (S.openPositions || []).filter(function (p) { return p && p._voix === 'tendance'; }); }
  function valueOf(pos) {
    var ps = S.pairStates && S.pairStates[pos.pair];
    var px = ps ? Number(ps.price) : NaN;
    try { if (typeof _posLatent === 'function') return _posLatent(pos, px).val; } catch (e) {}
    return num(pos.stakeUsdt);
  }
  function held(t) {   // paires que la poche tient, avec sens et entrée
    var out = {};
    Object.keys(t.pos || {}).forEach(function (pair) {
      var p = t.pos[pair];
      if (p && (p.side === 'long' || p.side === 'short')) out[pair] = p;
    });
    return out;
  }

  // bascule de contexte vers l'EV (synchrone, comme 10f _lossCapSweep / 08 / 04) ; l'écran est rendu à son mode après
  function inEV(fn) {
    var disp = S.tradingMode, sw = (disp !== MODE), b0 = window._bgResolve, f0 = window._bgFrom;
    if (sw) { window._bgFrom = disp; S.tradingMode = MODE; window._bgResolve = true; }
    try { return fn(); } finally { if (sw) { S.tradingMode = disp; window._bgResolve = b0; window._bgFrom = f0; } }
  }

  function closeVoix(r, t, pos, why) {
    var pair = pos.pair, ps = S.pairStates && S.pairStates[pair];
    var n0 = ps && Array.isArray(ps.trades) ? ps.trades.length : 0;
    closePosition(pos.id, false, { voix: true });
    if ((S.openPositions || []).some(function (p) { return p && p.id === pos.id; })) return false;
    delete r.suivi[pair];
    var usd = null;
    if (ps && Array.isArray(ps.trades) && ps.trades.length > 0) {
      var last = ps.trades[ps.trades.length - 1];
      if (last && last.type === 'tendance' && (ps.trades.length > n0 || n0 >= 100) && isFinite(Number(last.pnlUsdt))) usd = Number(last.pnlUsdt);
    }
    if (usd !== null) r.real += usd;
    r.n += 1;
    journal(why.indexOf('liquidation') >= 0 ? '💥' : '↩', 'Tendance réelle · ' + pair + ' ' + String(pos.side).toUpperCase() + ' fermé (' + why + ')' +
      (usd !== null ? ' · ' + sgn(usd) : '') + ' · ton argent EV');
    return true;
  }

  // ── [GO N° 108 · 15/11/2026] la liquidation PROPRE de l'EV (SHORT, prix ×2 de SON entrée) relue sur les bougies 1 h des heures de sommeil ──
  // Avant : (c) ne la voyait qu'au prix frais du moment ; une mèche de la nuit au-delà de 2 × l'entrée de l'EV, retombée au réveil, n'était jamais
  // comptée (la poche, elle, relit ses plus hauts 1 h : js/15 liqHist — mais son entrée est plus haute que celle de l'EV). Même règle que la poche :
  // les bougies 1 h depuis l'heure qui suit l'entrée (l'heure d'entrée elle-même est couverte par le prix en direct), depuis le dernier contrôle
  // (S.tendance.reel.suivi[paire].chk, sauvé), pages de 1 000 heures, la bougie en cours relue au contrôle suivant ; une fois par heure et par SHORT.
  function getJ(url) {
    try { if (window._perfOp) window._perfOp('tendance-reelle:' + url.split('symbol=')[1].split('&')[0]); } catch (e) {}
    var opt = {};
    try { if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') opt.signal = AbortSignal.timeout(FETCH_MS); } catch (e) {}
    return fetch(url, opt).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function liqStart(pos) { var t = num(pos.openedAt) || num(pos.entryTs); return t > 0 ? Math.ceil(t / HOUR) * HOUR : 0; }
  function liqHist(r, q, g) {
    var s = r.suivi[q.pair]; if (!s || s.id !== q.id) return Promise.resolve(false);
    var from = Math.max(num(s.chk), q.start);
    return getJ(API + 'klines?symbol=' + String(q.pair).replace('/', '') + '&interval=1h&startTime=' + from + '&limit=1000').then(function (a) {
      if (g !== hGen || R() !== r || r.suivi[q.pair] !== s || s.id !== q.id || !Array.isArray(a)) return false;
      for (var i = 0; i < a.length; i++) {
        var o = Number(a[i][0]), hi = parseFloat(a[i][2]);
        if (o < q.start) continue;
        if (isFinite(hi) && hi >= 2 * q.e) { pend[q.id] = { e: q.e, px: 2 * q.e, o: o }; return true; }
      }
      if (a.length >= 1000) { s.chk = Number(a[a.length - 1][0]) + HOUR; return liqHist(r, q, g); }
      var lastO = a.length ? Number(a[a.length - 1][0]) : from;     // la bougie en cours sera relue au prochain contrôle
      s.chk = Math.max(from, Math.min(Math.floor(now() / HOUR) * HOUR, lastO));
      return false;
    });
  }
  function liqCheck(r, due) {   // les SHORT à contrôler, l'un après l'autre (un seul appel en vol) ; une mèche trouvée : fermée tout de suite (sync)
    if (hRun && now() - hRun > STALE) { hRun = 0; hGen++; }        // contrôle resté sans réponse : abandonné (ses écritures sont ignorées)
    if (hRun || !due.length || typeof fetch !== 'function') return;
    hRun = now(); var g = ++hGen, hit = false, chain = Promise.resolve();
    due.forEach(function (q) {
      chain = chain.then(function () {
        if (g !== hGen) return;
        liqAt[q.id] = now(); hst.n++;
        return liqHist(r, q, g).then(function (h) { if (h) hit = true; hst.at = now(); });
      }).catch(function (e) { hst.err = q.pair + ' : ' + ((e && e.message) || e); hst.errAt = now(); });
    });
    chain.then(function () { if (g !== hGen) return; hRun = 0; if (hit) { try { sync(); } catch (e) {} } });
  }

  function sync() {
    if (busy) return;
    var r = R(); if (!r || r.on !== 1) return;
    if (!S.walletStore || !S.walletStore[MODE] || typeof openPosition !== 'function' || typeof closePosition !== 'function') return;
    var t = S.tendance, H = held(t);
    var running = false;
    try { running = typeof window._isModeRunning === 'function' && !!window._isModeRunning(MODE); } catch (e) {}
    var changed = false, due = [];
    busy = true; st.tick++;
    try {
      inEV(function () {
        var tNow = now(), w = mondayOf(tNow);
        var M = mine(), ids = {};
        M.forEach(function (p) { ids[p.id] = 1; });
        // positions de la voix sans suivi (sauvegarde plus ancienne restaurée) : reprises, sinon un ✕ ne serait pas reconnu et la paire rouverte aussitôt
        M.forEach(function (p) { if (!r.suivi[p.pair]) r.suivi[p.pair] = { id: p.id, t0: num(p._voixT0) }; });
        // (a) fermée hors de la voix (ton ✕, urgence, solvabilité) : rouverte au lundi suivant si la poche la tient encore
        Object.keys(r.suivi).forEach(function (pair) {
          var s = r.suivi[pair];
          if (!s || ids[s.id]) return;
          delete r.suivi[pair];
          var pp = H[pair];
          if (pp && num(pp.t0) === num(s.t0)) {
            r.attente[pair] = { w: w, t0: num(pp.t0) };
            journal('⏸', 'Tendance réelle · ' + pair + ' fermée hors de la voix — rouverte lundi prochain si la voix la tient encore');
          }
          changed = true;
        });
        // (b) la poche ne la tient plus (retournement, liquidation, paire retirée) → fermée
        M.forEach(function (pos) {
          var pp = H[pos.pair];
          if (pp && pp.side === pos.side && num(pp.t0) === num(pos._voixT0)) return;
          var why = 'la voix ne la tient plus', liq = false, liqPx = 0;
          var hist = Array.isArray(t.hist) ? t.hist : [];
          for (var i = hist.length - 1; i >= 0; i--) {
            var h = hist[i];
            if (h && h.p === pos.pair && num(h.t0) === num(pos._voixT0)) { why = String(h.why || why); liq = why.indexOf('liquidation') >= 0; if (liq) liqPx = num(h.x1); break; }
          }
          if (!pp && i < 0) why = 'paire retirée de la voix';
          // [GO N° 80 · 15/11/2026] liquidation de la poche (js/15 : x1 = 2 × SON entrée, le prix que le marché a touché) : fermée tout de suite AU PRIX DE
          // LA LIQUIDATION (02 closePosition, pos._forcedExitPx — comme 10f « stop côté exchange simulé », décision Rams du 26/09 : au stop, pas au prix de
          // retour), EV en pause comprise. Avant : au ps.price de l'EV, le prix SAUVEGARDÉ quand le prix réel avait plus de 5 min. Sans ce prix (ligne
          // d'avant), elle attend un prix frais comme toute autre fermeture de la voix. Effacé si la fermeture n'aboutit pas (jamais laissé à un ✕ suivant).
          if (!(liqPx > 0) && !fresh(pos.pair)) return;      // pas de prix réel frais : on attend (jamais au prix sauvegardé)
          if (liqPx > 0) pos._forcedExitPx = liqPx;
          var done = false;
          try { done = closeVoix(r, t, pos, why); } finally { if (!done) delete pos._forcedExitPx; }
          if (done) changed = true;
          if (liq) r.attente[pos.pair] = { w: w, t0: pp ? num(pp.t0) : 0 };
        });
        // (c0) [GO N° 108 · 15/11/2026] SHORT de l'EV dont une bougie 1 h (heures de sommeil) a touché 2 × SON entrée : fermé AU PRIX DE LA
        // LIQUIDATION (pos._forcedExitPx, comme la poche et go n° 80), EV en pause et MANU compris, prix frais ou non ; pas rouvert avant le lundi qui
        // suit la mèche. Effacé si la fermeture n'aboutit pas (réessayée au battement suivant). Puis : les SHORT à contrôler cette heure (liqCheck).
        Object.keys(pend).forEach(function (id) { if (!ids[id]) delete pend[id]; });
        mine().forEach(function (pos) {
          if (pos.side !== 'short') return;
          var q = pend[pos.id];
          if (q && q.e === num(pos.entryPrice)) {
            var pp = H[pos.pair], done = false, d = new Date(q.o), dd = function (x) { return (x < 10 ? '0' : '') + x; };
            pos._forcedExitPx = q.px;
            try { done = closeVoix(r, t, pos, 'liquidation : le prix a doublé depuis ton entrée — bougie 1 h du ' + dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + ' ' + dd(d.getHours()) + ' h'); }
            finally { if (!done) delete pos._forcedExitPx; }
            if (done) { changed = true; delete pend[pos.id]; r.attente[pos.pair] = { w: mondayOf(q.o), t0: pp ? num(pp.t0) : 0 }; }
            return;
          }
          var s0 = liqStart(pos);
          if (s0 > 0 && !((liqAt[pos.id] || 0) > tNow - HOUR)) due.push({ id: pos.id, pair: pos.pair, e: num(pos.entryPrice), start: s0 });
        });
        // (c) SHORT de l'EV dont le prix a doublé depuis SON entrée : liquidé, pas rouvert cette semaine
        mine().forEach(function (pos) {
          if (pos.side !== 'short' || !fresh(pos.pair)) return;
          var ps = S.pairStates[pos.pair], px = ps ? Number(ps.price) : 0;
          if (px > 0 && px >= 2 * num(pos.entryPrice)) {
            var pp = H[pos.pair];
            if (closeVoix(r, t, pos, 'liquidation : le prix a doublé depuis ton entrée')) {
              changed = true; r.attente[pos.pair] = { w: w, t0: pp ? num(pp.t0) : 0 };
            }
          }
        });
        // (d) ouvertures : EV en play, AUTO (MANU : jamais), prix frais
        if (!running || S.botAutoMode === false) return;
        var pairs = Object.keys(H).sort();
        var n = Math.max(1, pairs.length);
        var todo = pairs.filter(function (pair) {
          var a = r.attente[pair];
          if (a && a.w === w && a.t0 === num(H[pair].t0)) return false;
          if (a && (a.w !== w || a.t0 !== num(H[pair].t0))) delete r.attente[pair];
          if (r.essai[pair] && tNow - r.essai[pair] < RETRY) return false;
          var other = (S.openPositions || []).find(function (p) { return p && p.pair === pair; });
          if (other) {
            if (other._voix !== 'tendance' && r.bloque[pair] !== w) {
              r.bloque[pair] = w;
              journal('⚠', 'Tendance réelle · ' + pair + ' : une autre position est ouverte sur la paire — la voix attend qu\'elle soit fermée');
            }
            return false;
          }
          // la poche doit avoir pris la décision de CETTE semaine (lundi 00:00 UTC) : tablette éteinte le lundi, elle la prend au premier battement —
          // ouvrir avant, ce serait ouvrir le sens de la semaine passée et risquer de le retourner une minute plus tard (frais deux fois)
          var d = t.dec && t.dec[pair];
          if (!(d && num(d.w) === w)) return false;
          var ps = S.pairStates && S.pairStates[pair];
          return !!(ps && Number(ps.price) > 0 && fresh(pair));
        });
        if (!todo.length) return;
        var E = num(S.tradingAccount);
        mine().forEach(function (p) { E += valueOf(p); });
        var share = E / n, opened = [];
        todo.forEach(function (pair) {
          var stake = Math.floor(Math.min(num(S.tradingAccount), share) * 100) / 100;
          if (!(stake > 0)) return;
          var pp = H[pair];
          var np = null;
          try { np = openPosition(pair, pp.side, { voix: true, stakeUsdt: stake, voixT0: num(pp.t0) }); } catch (e) { np = null; }
          if (np && np._voix === 'tendance') {
            r.suivi[pair] = { id: np.id, t0: num(pp.t0) }; delete r.essai[pair]; delete r.bloque[pair];
            opened.push(pair.split('/')[0] + ' ' + (pp.side === 'long' ? 'LONG' : 'SHORT'));
            changed = true;
          } else r.essai[pair] = tNow;
        });
        if (opened.length) {
          journal('📈', 'Tendance réelle · ' + opened.length + ' position' + (opened.length > 1 ? 's' : '') + ' ouverte' + (opened.length > 1 ? 's' : '') +
            ' avec ton argent EV (' + fmt(share) + ' max chacune = 1/' + n + ' de ' + fmt(E) + ') : ' + opened.join(', '));
          try { if (typeof showToast === 'function') showToast('📈 Tendance longue · ' + opened.length + ' position' + (opened.length > 1 ? 's' : '') + ' ouverte' + (opened.length > 1 ? 's' : '') + ' en EV', 4000, 'win'); } catch (e) {}
        }
      });
      st.err = null;
    } catch (e) {
      st.err = String(e && e.message || e); st.errAt = now();
      try { window._decErr && window._decErr(e); } catch (_e) {}
    } finally { busy = false; st.last = now(); }
    try { liqCheck(r, due); } catch (e) {}   // [GO N° 108 · 15/11/2026]
    if (changed) { try { if (typeof window.saveState === 'function') window.saveState(true); } catch (e) {} }
    try { render(); } catch (e) {}
  }

  // ── écran : une ligne « ton argent EV » dans la barre Tendance longue (js/15 rend la poche au-dessus) ──
  function summary() {
    var r = R(); if (!r) return null;
    var w = (typeof _walletFor === 'function') ? _walletFor(MODE) : null; if (!w) return null;
    var pos = (w.openPositions || []).filter(function (p) { return p && p._voix === 'tendance'; });
    var stake = 0, lat = 0;
    pos.forEach(function (p) {
      var ps = w.pairStates && w.pairStates[p.pair], px = ps ? Number(ps.price) : NaN;
      stake += num(p.stakeUsdt);
      try { lat += (typeof _posLatent === 'function') ? _posLatent(p, px).usd : 0; } catch (e) {}
    });
    var auto = true; try { auto = S.botAutoMode !== false; } catch (e) {}
    var run = false; try { run = !!window._isModeRunning(MODE); } catch (e) {}
    return { n: pos.length, stake: stake, lat: lat, real: num(r.real), trading: num(w.tradingAccount), depuis: r.depuis, auto: auto, run: run };
  }
  function render() {
    var box = document.getElementById('tlReel'); if (!box) return;
    var s = summary();
    var h = '';
    if (s) {
      var col = function (x) { return x >= 0 ? 'var(--up)' : 'var(--down)'; };
      var dt = new Date(s.depuis).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      h = '<div style="margin:4px 14px 8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:var(--fs-12);color:var(--t2);line-height:1.5">' +
        '<div style="font-size:var(--fs-13);color:var(--t1)">💶 Ton argent EV suit la voix : <b>' + s.n + '</b> position' + (s.n > 1 ? 's' : '') +
        ' · engagé ' + fmt(s.stake) + ' · latent <b style="color:' + col(s.lat) + '">' + sgn(s.lat) + '</b></div>' +
        '<div>réalisé ' + '<b style="color:' + col(s.real) + '">' + sgn(s.real) + '</b> depuis le ' + dt + ' · libre au trading ' + fmt(s.trading) + '</div>' +
        (!s.run ? '<div style="color:var(--gold)">⏸ EV en pause : rien ne s\'ouvre</div>' : (!s.auto ? '<div style="color:var(--gold)">MANU : la voix ferme, n\'ouvre pas</div>' : '')) +
        '<div style="font-size:var(--fs-10);color:var(--t3)">Entrées au prix du moment · mise = 1/n de la valeur de l\'EV (porte POIDS : « égal ») · ni stop ni objectif · les bots à 15 min n\'ouvrent plus en EV</div>' +
        (st.err ? '<div style="font-size:var(--fs-10);color:var(--down)">erreur : ' + esc(st.err) + '</div>' : '') + '</div>';
    }
    if (h !== lastHtml) { box.innerHTML = h; lastHtml = h; }
  }

  window._tlrTientEV = tientEV;
  window._tlrStatus = st;
  window._tlr = { V: V, sync: sync, state: R, summary: summary, render: render, mondayOf: mondayOf, tientEV: tientEV, liq: hst };   // [GO N° 108 · 15/11/2026] liq : contrôles des bougies 1 h

  setInterval(function () { try { sync(); } catch (e) {} }, 20000);
  setInterval(function () { try { render(); } catch (e) {} }, 5000);
  var boot = setInterval(function () { try { if (window._stateReady === true) { clearInterval(boot); setTimeout(function () { try { sync(); } catch (e) {} }, 30000); } } catch (e) {} }, 1000);
})();
