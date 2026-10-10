// [OUTILS · 10/10/2026 soir] rejeu/sondes/tout-20261010.js — script de mesure de la mission « TOUT » (paire retirée, portefeuille à la fermeture, modes séparés).
// Évalué dans la page par rejeu/sonde_modes.js (--inject), sur N'IMPORTE quelle version du code : il ne lit que des fonctions qui existent avant et après, et
// recalcule lui-même ses références (paires vivantes = celles de PAIRS ; portefeuille vrai = caisse + trading + mises encore engagées).
//   node rejeu/sonde_modes.js --root <code> --backup <backup> --out <f.json> --hours 2 --flush 1 --cgchg backup --split 1 --inject rejeu/sondes/tout-20261010.js
//     [--injectarg '{"man":{"mode":"paperReal","pair":"ETH/USDT","side":"long","tpPct":1,"slPct":1,"timeoutMin":0}}']   position MANUELLE ouverte par la vraie
//     fonction (02 openPosition) dans le mode donné, qu'il soit à l'écran ou derrière — pour voir qui surveille son TP / SL / ses consignes
// Mesures (result.probe) : régime lu par l'app dans chaque mode contre le régime des paires vivantes ; cycles résolus par paire et par mode (la paire retirée
// en a-t-elle ?) ; emplacements et mises ; à chaque fermeture : portefeuille écrit contre portefeuille vrai, valeur lue par les alertes, point de la courbe ;
// lignes du journal et toasts produits par un mode qui n'est pas à l'écran (étiquetés ?) ; anti-revenge : secondes bloquées PAR MODE, écran de refroidissement ;
// cumul de l'estimateur fiscal ; amplitude du hasard de l'école ; cache des signaux techniques ; position manuelle : fermée par qui, quand.
(function () {
  'use strict';
  var A = window.__probeArg || {}, MODES = ['sim', 'paperReal', 'real'], LAB = { sim: 'AA', paperReal: 'EV', real: 'RE' };
  var R = { t0: Date.now(), regime: [], cyc: {}, closes: [], alerts: [], milestones: [], bgLines: { n: 0, tagged: 0, ex: [] }, bgToasts: { n: 0, tagged: 0, ex: [] }, fgToasts: 0,
    rv: { secs: 0, blocked: { sim: 0, paperReal: 0, real: 0 }, overlay: 0, overlayByScreen: {}, trig: [] }, stakes: {}, slots: {}, vol: {}, tech: { calls: 0, ms: 0, served: 0 }, man: null, errs: [] };
  var err = function (w, e) { if (R.errs.length < 30) R.errs.push(w + ' : ' + String(e && e.message || e).slice(0, 160)); };
  var screen = function () { try { return window.AuraChrono.getCurrentMode(); } catch (e) { return S.tradingMode; } };
  var inMode = function (m, fn) { var m0 = S.tradingMode, b0 = window._bgResolve; if (m === m0) return fn(); S.tradingMode = m; window._bgResolve = true; try { return fn(); } finally { S.tradingMode = m0; window._bgResolve = b0; } };
  var W = function (m) { return S.walletStore[m]; };
  var liveKeys = function (m) { return Object.keys(W(m).pairStates || {}).filter(function (p) { return !!PAIRS[p]; }); };
  var allKeys = function (m) { return Object.keys(W(m).pairStates || {}); };
  // régime recalculé ICI sur une liste de paires (même règle que 02 detectMarketRegime : moyenne des variations, dispersion des 20 dernières clôtures)
  var regimeOf = function (m, keys) {
    var ps = W(m).pairStates, sP = 0, nP = 0, sV = 0, nV = 0;
    keys.forEach(function (k) { var q = ps[k]; if (!q) return;
      if (typeof q.pnl24h === 'number' && !isNaN(q.pnl24h)) { sP += q.pnl24h; nP++; }
      if (q.candles && q.candles.length >= 10) { var c = q.candles.slice(-20).map(function (x) { return x.c; }), mean = c.reduce(function (a, b) { return a + b; }, 0) / c.length, v = c.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / c.length; sV += mean > 0 ? Math.sqrt(v) / mean : 0; nV++; } });
    if (!nP) return { r: 'calm', avg: null, n: 0 };
    var avg = sP / nP, vol = nV ? sV / nV : 0, isV = vol > 0.02, r = (isV && avg > 2) ? 'volatile_bull' : (isV && avg < -2) ? 'volatile_bear' : isV ? 'volatile' : avg > 2 ? 'bull' : avg < -2 ? 'bear' : 'calm';
    return { r: r, avg: Math.round(avg * 1000) / 1000, vol: Math.round(vol * 100000) / 100000, n: nP };
  };
  var regimeRow = function () {
    var row = { min: Math.round((Date.now() - R.t0) / 60000) };
    MODES.forEach(function (m) { try { var app = inMode(m, function () { return detectMarketRegime(); }), a = regimeOf(m, allKeys(m)), l = regimeOf(m, liveKeys(m)); row[m] = { app: app, toutes: a.r, vivantes: l.r, moyToutes: a.avg, moyVivantes: l.avg, nT: a.n, nV: l.n }; } catch (e) { err('régime ' + m, e); } });
    return row;
  };
  var stakesRow = function () {
    var out = {};
    MODES.forEach(function (m) { try { inMode(m, function () {
      var ps = S.pairStates, keep = {}; Object.keys(ps).forEach(function (k) { keep[k] = [ps[k].stake, ps[k]._leverageBonus]; });
      estimateStakes(); var st = {}; Object.keys(ps).forEach(function (k) { st[k] = ps[k].stake; });
      Object.keys(ps).forEach(function (k) { ps[k].stake = keep[k][0]; ps[k]._leverageBonus = keep[k][1]; });   // la mesure ne laisse rien
      var held = {}; (S.openPositions || []).forEach(function (p) { if (p && p.pair) held[p.pair] = 1; });
      var acc = S.tradingAccount || 0, capT = Math.max(0, acc - Math.max(1, acc * 0.02)), eng = (S.openPositions || []).reduce(function (a, p) { return a + (Number(p.stakeUsdt) || 0); }, 0), free = Math.max(0, capT - eng);
      var plan = null; try { plan = (typeof _manPlan === 'function') ? _manPlan('BTC/USDT', true) : null; } catch (e) {}
      out[m] = { mises: st, somme: Object.keys(st).reduce(function (a, k) { return a + (Number(st[k]) || 0); }, 0), libre: Math.round(free * 100) / 100,
        emplacementsToutes: allKeys(m).filter(function (k) { return !held[k]; }).length, emplacementsVivantes: liveKeys(m).filter(function (k) { return !held[k]; }).length,
        ficheManBTC: plan ? plan.stake : null };
    }); } catch (e) { err('mises ' + m, e); } });
    return out;
  };
  R.regime.push(regimeRow()); R.stakes.debut = stakesRow();
  R.paires = { PAIRS: Object.keys(PAIRS), retirees: (S.removedPairs || []).slice(), parMode: {} };
  MODES.forEach(function (m) { R.paires.parMode[m] = { toutes: allKeys(m).length, vivantes: liveKeys(m).length, fantomes: allKeys(m).filter(function (p) { return !PAIRS[p]; }) }; });
  // ── cycles résolus par paire et par mode ──
  try { var _rp = window.resolvePairCycle; window.resolvePairCycle = function (pair, ps) { var k = S.tradingMode; (R.cyc[k] = R.cyc[k] || {})[pair] = ((R.cyc[k] || {})[pair] || 0) + 1; return _rp.apply(this, arguments); }; } catch (e) { err('cycles', e); }
  // ── fermetures : portefeuille écrit contre portefeuille vrai ──
  var closing = null;
  var truth = function () { var id = closing && closing.id; return (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.openPositions || []).reduce(function (a, p) { return a + ((p && p.id === id) ? 0 : (Number(p.stakeUsdt) || 0)); }, 0); };
  try { var _cp = window.closePosition; window.closePosition = function (id, bc) {
    var pos = (S.openPositions || []).find(function (p) { return p.id === id; }), m = S.tradingMode, scr = screen(), n0 = (S.openPositions || []).length, prev = closing;
    closing = pos || null; var r; try { r = _cp.apply(this, arguments); } finally { closing = prev; }
    if (pos && (S.openPositions || []).length < n0 && R.closes.length < 4000) {
      var pfT = (S.cashAccount || 0) + (S.tradingAccount || 0) + (S.openPositions || []).reduce(function (a, p) { return a + (Number(p.stakeUsdt) || 0); }, 0), h = S.pnlHistory || [];
      R.closes.push({ t: Date.now(), mode: m, ecran: scr, derriere: m !== scr, pair: pos.pair, auto: pos.auto === true, mise: pos.stakeUsdt, ecrit: S.portfolio, vrai: pfT, enTrop: Math.round((S.portfolio - pfT) * 1e6) / 1e6, courbeEnTrop: h.length ? Math.round((h[h.length - 1] - pfT) * 1e6) / 1e6 : null });
    }
    return r; }; } catch (e) { err('fermetures', e); }
  try { var _ca = window.checkPnlAlerts; if (typeof _ca === 'function') window.checkPnlAlerts = function () { if (closing && R.alerts.length < 2000) R.alerts.push({ t: Date.now(), mode: S.tradingMode, lu: S.portfolio, vrai: truth(), enTrop: Math.round((S.portfolio - truth()) * 1e6) / 1e6 }); return _ca.apply(this, arguments); }; } catch (e) { err('alertes', e); }
  try { var _sm = window.showMilestone; if (typeof _sm === 'function') window.showMilestone = function (ic, tx) { if (R.milestones.length < 200) R.milestones.push({ t: Date.now(), mode: S.tradingMode, ecran: screen(), pendantFermeture: !!closing, tx: String(ic) + ' ' + String(tx).slice(0, 90) }); return _sm.apply(this, arguments); }; } catch (e) { err('jalons', e); }
  // ── journal : lignes produites par un mode qui n'est pas à l'écran ──
  var isTagged = function (e) { return !!(e && (e.m || e.mode)); };
  var tapChain = function () { try { var arr = S.chainLog; if (!Array.isArray(arr) || arr.__probed) return; var p0 = arr.push; Object.defineProperty(arr, '__probed', { value: true, enumerable: false, writable: true, configurable: true });
    Object.defineProperty(arr, 'push', { value: function () { var n = p0.apply(this, arguments); try { var m = S.tradingMode, scr = screen(); if (m !== scr) { for (var i = 0; i < arguments.length; i++) { var e = arguments[i]; R.bgLines.n++; if (isTagged(e)) R.bgLines.tagged++; if (R.bgLines.ex.length < 12) R.bgLines.ex.push({ mode: m, ecran: scr, marque: (e && (e.m || e.mode)) || null, d: String((e && e.icon) || '') + ' ' + String((e && e.desc) || '').slice(0, 90) }); } } } catch (x) {} return n; }, enumerable: false, writable: true, configurable: true }); } catch (e) { err('journal', e); } };
  tapChain();
  // ── toasts réellement affichés (après le filtre « silencieux ») ──
  var tagRe = /(^|\s)[\[〔](AA|EV|RE)[\]〕]|\b(AA|EV|RE) · /;
  try { var _so = window._showToast_orig; if (typeof _so === 'function') window._showToast_orig = function (msg) { try { var m = S.tradingMode, scr = screen(); if (m !== scr) { R.bgToasts.n++; if (tagRe.test(String(msg))) R.bgToasts.tagged++; if (R.bgToasts.ex.length < 12) R.bgToasts.ex.push({ mode: m, ecran: scr, msg: String(msg).slice(0, 100) }); } else R.fgToasts++; } catch (x) {} return _so.apply(this, arguments); }; } catch (e) { err('toasts', e); }
  // ── anti-revenge ──
  try { var _tr = window.triggerAntiRevenge; window.triggerAntiRevenge = function (pnlUsd, pct, pair, n) { if (R.rv.trig.length < 200) R.rv.trig.push({ t: Date.now(), mode: S.tradingMode, ecran: screen(), pair: pair, pct: Math.round(pct * 100) / 100, usd: Math.round(pnlUsd * 100) / 100 }); return _tr.apply(this, arguments); }; } catch (e) { err('anti-revenge', e); }
  // ── signaux techniques : appels, temps, relectures du cache (même objet rendu deux fois de suite pour la paire) ──
  try { var _gt = window.getTechSignals, lastT = {}; window.getTechSignals = function (pair) { var t0 = performance.now(), r = _gt.apply(this, arguments); R.tech.ms += performance.now() - t0; R.tech.calls++; var k = S.tradingMode + '|' + pair; if (r && lastT[k] === r) R.tech.served++; lastT[k] = r; return r; }; } catch (e) { err('tech', e); }
  // ── position manuelle ouverte par la vraie fonction, dans le mode demandé ──
  R.man = [];
  (Array.isArray(A.man) ? A.man : (A.man ? [A.man] : [])).forEach(function (M) { try {
    // la mise de la fiche (10h _manPlan) comme le fait le vrai bouton : posée sur la paire le temps de l'ouverture, puis rendue
    var np = inMode(M.mode, function () { var ps = S.pairStates[M.pair], st0 = ps.stake; if (M.stake > 0) ps.stake = M.stake; else if (!(ps.stake > 0)) { var pl = null; try { pl = _manPlan(M.pair, true); } catch (e) {} ps.stake = (pl && pl.stake > 0) ? pl.stake : 50; }
      try { return openPosition(M.pair, M.side, { tpPct: M.tpPct, slPct: M.slPct, maxLossPct: M.maxLossPct, timeoutMin: M.timeoutMin }); } finally { ps.stake = st0; } });
    var o = { demande: M, ecranAuDepart: screen(), ouverte: !!np, id: np && np.id, entree: np && np.entryPrice, tp: np && np.tp, sl: np && np.sl, timeoutMin: np && np._manTimeoutMin, maxLossPct: np && np._manMaxLossPct, mise: np && np.stakeUsdt, suivi: [] };
    if (!np) o.journal = (S.chainLog || []).slice(-3).map(function (c) { return c.desc; });
    R.man.push(o);
    try { window.__advanceTo(window.__now() + 7); } catch (e) {}   // 02 openPosition nomme une position manuelle par la milliseconde : deux ouvertures dans la même porteraient le même nom
  } catch (e) { err('manuelle', e); } });
  var P = window.__probe = {};
  P.second = function () {
    R.rv.secs++;
    MODES.forEach(function (m) { try { if (inMode(m, function () { return typeof isRevengeBlocked === 'function' && isRevengeBlocked(); })) R.rv.blocked[m]++; } catch (e) {} });
    try { var ov = document.getElementById('revengeBlock'); if (ov && ov.classList.contains('show')) { R.rv.overlay++; var s = screen(); R.rv.overlayByScreen[s] = (R.rv.overlayByScreen[s] || 0) + 1; } } catch (e) {}
    tapChain();
  };
  P.minute = function (min) {
    R.regime.push(regimeRow());
    Object.keys(PAIRS).forEach(function (p) { var c = PAIRS[p], q = W('sim').pairStates[p]; if (!c || !q || !(q.price > 0)) return; var rel = c.vol / q.price, v = R.vol[p] || (R.vol[p] = { min: Infinity, max: 0, zero: 0, nan: 0 }); if (!(rel === rel)) v.nan++; else { if (rel < v.min) v.min = rel; if (rel > v.max) v.max = rel; if (!(rel > 0)) v.zero++; } });
    R.man.forEach(function (X) { if (!X.id) return; try { var w = W(X.demande.mode), pos = (w.openPositions || []).find(function (p) { return p.id === X.id; }), ps = w.pairStates[X.demande.pair];
      if (X.suivi.length < 400) X.suivi.push({ min: min, ouverte: !!pos, prix: ps && ps.price, ecran: screen() });
      if (!pos && !X.fermeeMin) { X.fermeeMin = min; var tr = (ps.trades || []).filter(function (t) { return t.type === 'position'; }).pop(); X.sortie = tr ? { prix: tr.price, pnl: Math.round(tr.pnl * 1000) / 1000 } : null; X.lignes = (S.chainLog || []).filter(function (e) { return String(e.desc).indexOf(X.demande.pair) >= 0; }).slice(-4).map(function (e) { return (e.m ? '[' + e.m + '] ' : '') + e.desc; }); } } catch (e) { err('suivi manuelle', e); } });
  };
  P.end = function () {
    R.stakes.fin = stakesRow();
    R.fiscalYear = (function () { try { return JSON.parse(JSON.stringify(S.fiscalYear || null)); } catch (e) { return null; } })();
    R.cycle = S.cycle;
    var dit = [];
    var first = R.regime[0] || {}, changes = { sim: 0, paperReal: 0, real: 0 }, faux = { sim: 0, paperReal: 0, real: 0 };
    R.regime.forEach(function (row) { MODES.forEach(function (m) { if (row[m] && row[m].app !== row[m].vivantes) faux[m]++; }); });
    MODES.forEach(function (m) { var f = first[m]; if (!f) return; dit.push('RÉGIME ' + LAB[m] + ' : lu par l\'app « ' + f.app + ' » · toutes les paires « ' + f.toutes + ' » (moyenne ' + f.moyToutes + ' sur ' + f.nT + ') · paires vivantes « ' + f.vivantes + ' » (moyenne ' + f.moyVivantes + ' sur ' + f.nV + ') · minutes où l\'app ne lit pas le régime des paires vivantes : ' + faux[m] + ' / ' + R.regime.length); });
    var fant = (R.paires.parMode.sim.fantomes || []).concat(R.paires.parMode.paperReal.fantomes || []).filter(function (p, i, a) { return a.indexOf(p) === i; });
    dit.push('PAIRES : ' + R.paires.PAIRS.length + ' vivantes (PAIRS) · retirées ' + JSON.stringify(R.paires.retirees) + ' · pairStates par mode ' + JSON.stringify(R.paires.parMode));
    MODES.forEach(function (m) { var c = R.cyc[m]; if (!c) return; var tot = Object.keys(c).reduce(function (a, k) { return a + c[k]; }, 0), ph = fant.reduce(function (a, k) { return a + (c[k] || 0); }, 0); dit.push('CYCLES ' + LAB[m] + ' : ' + tot + ' passages dont ' + ph + ' pour une paire retirée ' + JSON.stringify(fant.map(function (k) { return k + ' ' + (c[k] || 0); }))); });
    ['debut', 'fin'].forEach(function (w) { var s = R.stakes[w] || {}; MODES.forEach(function (m) { var x = s[m]; if (!x) return; var ph = fant.map(function (k) { return k + ' ' + x.mises[k]; }); dit.push('MISES ' + LAB[m] + ' (' + w + ') : somme estimateStakes ' + x.somme + ' · emplacements comptant toutes les paires ' + x.emplacementsToutes + ' / vivantes ' + x.emplacementsVivantes + ' · libre ' + x.libre + ' · fiche MAN BTC ' + x.ficheManBTC + ' · mise de la paire retirée ' + JSON.stringify(ph)); }); });
    var byM = {}; R.closes.forEach(function (c) { var k = LAB[c.mode] + (c.derriere ? ' derrière' : ' à l\'écran'); var b = byM[k] || (byM[k] = { n: 0, enTrop: 0, max: 0, courbe: 0 }); b.n++; if (Math.abs(c.enTrop) > 0.005) b.enTrop++; if (Math.abs(c.enTrop) > b.max) b.max = Math.abs(c.enTrop); if (c.courbeEnTrop !== null && Math.abs(c.courbeEnTrop) > 0.005) b.courbe++; });
    dit.push('FERMETURES : ' + R.closes.length + ' · portefeuille écrit ≠ vrai juste après : ' + JSON.stringify(byM));
    var al = R.alerts.filter(function (a) { return Math.abs(a.enTrop) > 0.005; });
    dit.push('ALERTES P&L pendant une fermeture : ' + R.alerts.length + ' lectures, dont ' + al.length + ' sur un portefeuille gonflé (max ' + (al.reduce(function (a, x) { return Math.max(a, Math.abs(x.enTrop)); }, 0)).toFixed(2) + ' $) · jalons affichés : ' + JSON.stringify(R.milestones.slice(0, 6).map(function (x) { return LAB[x.mode] + '/' + LAB[x.ecran] + ' ' + x.tx; })));
    dit.push('JOURNAL : ' + R.bgLines.n + ' lignes écrites par un mode qui n\'est pas à l\'écran, dont ' + R.bgLines.tagged + ' marquées de leur mode · ex. ' + JSON.stringify(R.bgLines.ex.slice(0, 3)));
    dit.push('TOASTS : ' + R.bgToasts.n + ' affichés pour un mode qui n\'est pas à l\'écran, dont ' + R.bgToasts.tagged + ' étiquetés · ex. ' + JSON.stringify(R.bgToasts.ex.slice(0, 3)) + ' · ' + R.fgToasts + ' pour le mode à l\'écran');
    dit.push('ANTI-REVENGE : déclenchements ' + JSON.stringify(R.rv.trig.map(function (x) { return LAB[x.mode] + ' (écran ' + LAB[x.ecran] + ') ' + x.pair + ' ' + x.pct + ' %'; })) + ' · secondes bloquées par mode ' + JSON.stringify(R.rv.blocked) + ' sur ' + R.rv.secs + ' · écran de refroidissement ' + R.rv.overlay + ' s ' + JSON.stringify(R.rv.overlayByScreen));
    dit.push('ESTIMATEUR FISCAL : S.fiscalYear = ' + JSON.stringify(R.fiscalYear));
    var vz = Object.keys(R.vol).filter(function (p) { return R.vol[p].zero || R.vol[p].nan || R.vol[p].min < 1e-7; });
    dit.push('HASARD DE L\'ÉCOLE : amplitude relative la plus basse par paire ' + JSON.stringify(Object.keys(R.vol).map(function (p) { return p.split('/')[0] + ' ' + R.vol[p].min.toExponential(1); })) + ' · éteinte (< 1e-7, nulle ou NaN) : ' + JSON.stringify(vz));
    dit.push('SIGNAUX TECHNIQUES : ' + R.tech.calls + ' appels, ' + Math.round(R.tech.ms) + ' ms, relus du cache ' + R.tech.served);
    R.man.forEach(function (X) { dit.push('POSITION MANUELLE ' + LAB[X.demande.mode] + ' ' + X.demande.pair + ' ' + X.demande.side + ' : ouverte ' + X.ouverte + ' (écran ' + LAB[X.ecranAuDepart] + ') mise ' + X.mise + ' entrée ' + X.entree + ' TP ' + X.tp + ' SL ' + X.sl + ' durée ' + X.timeoutMin + ' min perte max ' + X.maxLossPct + ' % · fermée à la minute ' + (X.fermeeMin || 'JAMAIS') + ' ' + JSON.stringify(X.sortie || null) + ' ' + JSON.stringify(X.lignes || X.journal || [])); });
    if (R.errs.length) dit.push('ERREURS DE LA SONDE : ' + JSON.stringify(R.errs));
    R.dit = dit;
    return R;
  };
})();
