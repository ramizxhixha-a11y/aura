// ═══ [GO TENDANCE RÉELLE · 12/11/2026] VERSION 20261112a · « Go tendances réelle tout » (Rams, 12/11 19:49) ═══
// POURQUOI : la voix tendance longue (js/15, porte TENDANCE LONGUE du 06/10) est la seule idée qui a passé une porte. Elle jouait dans une
// poche à part, sans argent. Rams lui donne TOUT l'argent de l'EV : ce module fait SUIVRE la poche par le compte EV, avec de vraies positions
// (openPosition / closePosition, frais, historique, impôt), pendant que la poche reste la mesure de la porte (js/15 inchangé).
//
// CE QUE FAIT LE MODULE (toutes les 20 s, dans le contexte EV — même bascule que 10f _lossCapSweep) :
//   • la poche tient une paire (LONG / SHORT, entrée t0) → le compte EV tient la même paire, même sens, marquée _voix = 'tendance' ;
//   • la poche se retourne ou ferme (retournement, liquidation, paire retirée) → la position EV est fermée (closePosition { voix }), puis
//     rouverte dans le nouveau sens avec l'argent revenu ;
//   • un SHORT de l'EV dont le prix a doublé depuis SON entrée est fermé (−100 % de sa mise, comme la poche) et n'est pas rouvert avant le
//     lundi suivant ;
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

  function sync() {
    if (busy) return;
    var r = R(); if (!r || r.on !== 1) return;
    if (!S.walletStore || !S.walletStore[MODE] || typeof openPosition !== 'function' || typeof closePosition !== 'function') return;
    var t = S.tendance, H = held(t);
    var running = false;
    try { running = typeof window._isModeRunning === 'function' && !!window._isModeRunning(MODE); } catch (e) {}
    var changed = false;
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
          var why = 'la voix ne la tient plus', liq = false;
          var hist = Array.isArray(t.hist) ? t.hist : [];
          for (var i = hist.length - 1; i >= 0; i--) {
            var h = hist[i];
            if (h && h.p === pos.pair && num(h.t0) === num(pos._voixT0)) { why = String(h.why || why); liq = why.indexOf('liquidation') >= 0; break; }
          }
          if (!pp && i < 0) why = 'paire retirée de la voix';
          if (!liq && !fresh(pos.pair)) return;              // pas de prix réel frais : on attend (jamais au prix sauvegardé)
          if (closeVoix(r, t, pos, why)) changed = true;
          if (liq) r.attente[pos.pair] = { w: w, t0: pp ? num(pp.t0) : 0 };
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
  window._tlr = { V: V, sync: sync, state: R, summary: summary, render: render, mondayOf: mondayOf, tientEV: tientEV };

  setInterval(function () { try { sync(); } catch (e) {} }, 20000);
  setInterval(function () { try { render(); } catch (e) {} }, 5000);
  var boot = setInterval(function () { try { if (window._stateReady === true) { clearInterval(boot); setTimeout(function () { try { sync(); } catch (e) {} }, 30000); } } catch (e) {} }, 1000);
})();
