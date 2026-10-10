// [HORLOGE PAR MODE · 01/10/2026] VERSION 20261001a · section « Marché des agents » : manches suivies (même pas de temps : l'autre mode avait déjà ouvert la manche de la bougie — même prix, sans mise ; les T$ se jouent une fois par bougie)
// [MARCHÉ RÉPARÉ · 30/09/2026] VERSION 20260930a · section « Marché des agents » (manches soldées / nulles, erreur du prix contre pile ou face, bon sens, T$ misés / rendus, prix de chaque paire, qui pèse le plus sur le prix, poids de sa voix) ; « Poids des voix » nomme la voix du marché ; « Fitness des sièges » : colonne T$ du marché (l'ancienne colonne devient « marché AA »)
// [OPÉRATEUR APPRIS · 28/09/2026] VERSION 20260928d · section « Évolution apprise » : les trois sources de naissance (évolutions, écart moyen, état : prouvée bénéfique, nuisible écartée jusqu'au …, à juger), politique en cours (« naissances : … ») ; colonne « source » des observations
// [ÉVOLUTION APPRISE · 28/09/2026] VERSION 20260928c · section « Évolution apprise » : niveaux prouvés (gain / nuisance) ou repli posé à la main, observations (fitness à l'évolution, écart, déclencheur), queues jugées
// [MARCHÉ LMSR À PART · 28/09/2026] VERSION 20260928b · section « Fitness des sièges » : colonne « marché » (portefeuille de marché du siège · dépense du génome, à part de la fitness) ; la fitness vivante n'est plus débitée entre deux jugements
// [FITNESS AUX HORIZONS · 28/09/2026] VERSION 20260928a · section « Fitness des sièges » : définition vivante (horizons ou bougie), écart des sièges retirés par horizon, fitness bougie / horizons / vivante de chaque siège
// [BILAN AUX HORIZONS · 27/09/2026] VERSION 20260927k · section « Poids des voix » : pesée vivante (horizons ou bougie), écart apparié des deux pesées par horizon, poids de chaque voix (bougie / horizons)
// [SENS CONTRAIRE · 27/09/2026] VERSION 20260927j · section « Seuil d'ouverture appris » : le sens contraire de chaque décision, horizon par horizon (même preuve, décisions notées depuis sa mise en service) — mesuré seulement, rien n'est tradé
// [HORIZONS APPRIS · 27/09/2026] VERSION 20260927i · section « Seuil d'ouverture appris » : un état par horizon (15 min à 4 h) pour le pas de temps du mode — prouvé ≥ seuil ou fermé, meilleur niveau ou le plus proche (net %/trade ± erreur, trades, créneaux, valeur exigée)
// [SEUIL APPRIS · 27/09/2026] VERSION 20260927h · section « Seuil d'ouverture appris » : ouvert au niveau prouvé ou marché fermé, trades virtuels jugés / en attente, horizon, coût, niveau prouvé ou le plus proche, net par régime
// [MÉRITE DE L'ÉVOLUEUR · 26/09/2026] VERSION 20260926k · section « Évolutions jugées » : essais en cours (nouveau contre ancien génome) et derniers verdicts
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
  // 2b · seuil d'ouverture [SEUIL APPRIS · 27/09/2026] · [HORIZONS APPRIS · 27/09/2026] un seuil par horizon, pour le pas de temps du mode
  var T3 = S.dcThreshold || null, thFm = (typeof _thTfMs === 'function' && typeof _thTf === 'function') ? _thTfMs(_thTf()) / 60000 : 15;
  var th = T3 && T3.rules && T3.rules[thFm], thRec = (T3 && T3.rec) || [], thPend = (T3 && T3.pend) || [];
  var f2 = function (x) { return (x >= 0 ? '+' : '') + Number(x).toFixed(2) + ' %'; };
  h += title('SEUIL D\'OUVERTURE APPRIS', '· chaque décision est un trade virtuel jugé net de frais à 5 horizons, sans trader (EV/RE)');
  if (!th || !Array.isArray(th.hz)) h += '<div style="color:#667;font-size:11px;">pas encore de trade virtuel jugé (' + thPend.length + ' en attente)</div>';
  else {
    h += row([{ t: th.open ? ('ouvert · conviction ≥ ' + Number(th.level).toFixed(2)) : 'marché fermé', w: '1.2fr', s: 'font-weight:600;color:' + (th.open ? '#00e87a' : '#ffd166') + ';' },
      { t: thRec.length + ' décisions jugées · ' + thPend.length + ' en cours', w: '1.5fr' }, { t: 'coût ' + Number(th.cost || 0).toFixed(3) + ' % · preuve ≥ 20 créneaux', w: '1.3fr', s: 'color:#889;' }]);
    h += row([{ t: 'horizon', w: '.8fr' }, { t: 'état', w: '1fr' }, { t: 'meilleur / le plus proche', w: '1.8fr' }, { t: 'trades · créneaux', w: '.9fr' }], true);
    th.hz.forEach(function (x) {
      var bt = x.open ? x.best : x.near, lab = (typeof _thHzLab === 'function') ? _thHzLab(x.h, th.tfMs) : (x.h + ' bougie' + (x.h > 1 ? 's' : ''));
      h += row([{ t: lab, w: '.8fr', s: 'font-weight:600;' }, { t: x.open ? ('prouvé ≥ ' + Number(x.level).toFixed(2)) : 'fermé', w: '1fr', s: 'color:' + (x.open ? '#00e87a' : '#889') + ';' },
        { t: bt ? ('≥ ' + Number(bt.level).toFixed(2) + ' : ' + f2(bt.mean) + '/trade (± ' + Number(bt.se).toFixed(2) + ')') : 'pas encore jugeable', w: '1.8fr', s: 'color:' + (bt ? (bt.mean >= 0 ? '#00e87a' : '#ff4d6d') : '#556') + ';' },
        { t: bt ? (bt.n + ' · ' + bt.blocks + (bt.crit ? ' · exigé ' + Number(bt.crit).toFixed(1) + ' ET' : '')) : '—', w: '.9fr', s: 'color:#889;' }]);
    });
  }
  // [SENS CONTRAIRE · 27/09/2026] le sens contraire de chaque décision : même preuve, décisions notées depuis sa mise en service — mesuré, jamais tradé
  var thCt = T3 && T3.rulesC && T3.rulesC[thFm], thCs = (T3 && T3.ctSince) ? new Date(T3.ctSince) : null, thDd = function (x) { return (x < 10 ? '0' : '') + x; };
  var thCn = ((T3 && T3.recC) || []).filter(function (r) { return r && r[2] === thFm; }).length + ((T3 && T3.pendC) || []).filter(function (q) { return q && q.f === thFm * 60000; }).length;   // pas de temps du mode
  if (T3 && (thCt || thCn || thCs)) {
    h += row([{ t: 'sens contraire', w: '1.2fr', s: 'font-weight:600;color:' + (thCt && thCt.open ? '#00e87a' : '#ffd166') + ';' },
      { t: (thCt ? (thCt.open ? ('prouvé · conviction ≥ ' + Number(thCt.level).toFixed(2)) : 'pas prouvé') : 'pas encore jugé') + ' · ' + thCn + ' décisions', w: '1.5fr' },
      { t: (thCs ? ('mesuré depuis le ' + thDd(thCs.getDate()) + '/' + thDd(thCs.getMonth() + 1) + ' ' + thDd(thCs.getHours()) + ':' + thDd(thCs.getMinutes())) : 'mesure pas commencée') + ' · rien n\'est tradé', w: '1.3fr', s: 'color:#889;' }]);
    if (thCt && Array.isArray(thCt.hz)) thCt.hz.forEach(function (x) {
      var bt = x.open ? x.best : x.near, lab = (typeof _thHzLab === 'function') ? _thHzLab(x.h, thCt.tfMs) : (x.h + ' bougie' + (x.h > 1 ? 's' : ''));
      h += row([{ t: '↳ ' + lab, w: '.8fr', s: 'font-weight:600;' }, { t: x.open ? ('prouvé ≥ ' + Number(x.level).toFixed(2)) : 'pas prouvé', w: '1fr', s: 'color:' + (x.open ? '#00e87a' : '#889') + ';' },
        { t: bt ? ('≥ ' + Number(bt.level).toFixed(2) + ' : ' + f2(bt.mean) + '/trade (± ' + Number(bt.se).toFixed(2) + ')') : 'pas encore jugeable', w: '1.8fr', s: 'color:' + (bt ? (bt.mean >= 0 ? '#00e87a' : '#ff4d6d') : '#556') + ';' },
        { t: bt ? (bt.n + ' · ' + bt.blocks + (bt.crit ? ' · exigé ' + Number(bt.crit).toFixed(1) + ' ET' : '')) : '—', w: '.9fr', s: 'color:#889;' }]);
    });
  }
  // 2c · poids des voix [BILAN AUX HORIZONS · 27/09/2026] (lecture seule)
  var vr = T3 && T3.vRules && T3.vRules[thFm], vHz = (T3 && T3.vHz) || {}, vmode = (T3 && T3.vModes && T3.vModes[thFm] === 'bougie') ? 'bougie' : 'hz';   // le pas de temps du mode
  h += title('POIDS DES VOIX', '· chaque voix pèse ce que SON trade virtuel a donné de 15 min à 4 h (perte max comprise) — tant qu\'elle n\'y est pas jugée, sa bougie suivante');
  var vN = Object.keys(vHz).length;
  if (!vN && !vr) h += '<div style="color:#667;font-size:11px;">pas encore de voix jugée aux horizons' + ((T3 && T3.pendV && T3.pendV.length) ? ' (' + T3.pendV.length + ' cycles en cours)' : '') + '</div>';
  else {
    h += row([{ t: vmode === 'hz' ? 'pesée aux horizons' : 'pesée à la bougie (retour prouvé)', w: '1.3fr', s: 'font-weight:600;color:' + (vmode === 'hz' ? '#00e87a' : '#ffd166') + ';' },
      { t: vN + ' voix jugées · ' + ((T3 && T3.pendV) || []).length + ' cycles en cours', w: '1.4fr' }, { t: (T3 && T3.vSince ? ('mesuré depuis le ' + thDd(new Date(T3.vSince).getDate()) + '/' + thDd(new Date(T3.vSince).getMonth() + 1) + ' ' + thDd(new Date(T3.vSince).getHours()) + ':' + thDd(new Date(T3.vSince).getMinutes())) : 'mesure pas commencée') + ' · écart apparié : horizons − bougie, par cycle', w: '1.3fr', s: 'color:#889;' }]);
    if (vr && Array.isArray(vr.hz)) vr.hz.forEach(function (x) {
      var lab = (typeof _thHzLab === 'function') ? _thHzLab(x.h, (typeof _thTfMs === 'function' && typeof _thTf === 'function') ? _thTfMs(_thTf()) : 900000) : (x.h + ' b');
      var st = x.better ? 'horizons prouvés meilleurs' : x.worse ? 'bougie prouvée meilleure' : 'pas prouvé';
      h += row([{ t: '↳ ' + lab, w: '.8fr', s: 'font-weight:600;' }, { t: x.mean === null ? 'pas encore d\'écart' : ((x.mean >= 0 ? '+' : '') + Number(x.mean).toFixed(3) + ' %/cycle' + (x.se !== null ? ' (± ' + Number(x.se).toFixed(3) + ')' : '')), w: '1.4fr', s: 'color:' + (x.mean === null ? '#556' : x.mean >= 0 ? '#00e87a' : '#ff4d6d') + ';' },
        { t: x.n + ' cycles · ' + x.blocks + ' créneaux' + (x.crit ? ' · exigé ' + Number(x.crit).toFixed(1) + ' ET' : ''), w: '1.2fr', s: 'color:#889;' }, { t: st, w: '.9fr', s: 'color:' + (x.better ? '#00e87a' : x.worse ? '#ffd166' : '#889') + ';' }]);
    });
    h += row([{ t: 'voix', w: '1.3fr' }, { t: 'poids bougie', w: '.8fr' }, { t: 'poids horizons', w: '.8fr' }, { t: 'jugements (le moins jugé des 5)', w: '1.1fr' }], true);
    var vRows = Object.keys(vHz).map(function (id) {
      var ag = (S.agents || []).find(function (a) { return a && a.id === id; }), cv = (S.dcVoices && S.dcVoices.composite) || null, mv = (S.dcVoices && S.dcVoices.marche) || null;   // [MARCHÉ RÉPARÉ · 30/09/2026] la voix du marché
      var wO = null; try { wO = (typeof _dcMerit === 'function') ? _dcMerit(id === 'composite' ? cv : id === 'marche' ? mv : ag) : null; } catch (e) {}
      var wH = null; try { wH = (typeof _dcMeritHz === 'function') ? _dcMeritHz(id) : null; } catch (e) {}
      var nMin = Array.isArray(vHz[id]) ? Math.min.apply(null, vHz[id].map(function (L) { return Array.isArray(L) ? (L.length >> 1) : 0; })) : 0;   // à plat : v, D, v, D, …
      return { name: id === 'composite' ? 'Analyse tech. + fond.' : id === 'marche' ? 'Marché des agents (prix)' : ((ag && ag.name) || id), wO: wO, wH: wH, n: nMin };
    }).sort(function (x, y) { return (y.wH === null ? -1 : y.wH) - (x.wH === null ? -1 : x.wH); });
    vRows.forEach(function (r) {
      h += row([{ t: r.name, w: '1.3fr', s: 'font-weight:600;' }, { t: r.wO === null ? '—' : Number(r.wO).toFixed(2), w: '.8fr', s: 'color:#889;' },
        { t: r.wH === null ? 'pas encore' : Number(r.wH).toFixed(2), w: '.8fr', s: 'color:' + (r.wH === null ? '#556' : r.wH > 0 ? '#00e87a' : '#889') + ';' }, { t: String(r.n), w: '1.1fr', s: 'color:#889;' }]);
    });
  }
  // 2c-bis · marché des agents [MARCHÉ RÉPARÉ · 30/09/2026] (lecture seule)
  var mkM = (S.tradingMode === 'real') ? 'R' : 'E', mkL = (mkM === 'R') ? 'RE' : 'EV', mkOn = (S.tradingMode === 'paperReal' || S.tradingMode === 'real'), MSt = (S.mktStats && S.mktStats[mkM]) || null;
  var kT = function (x) { x = Number(x) || 0; var a = Math.abs(x); return a < 1000 ? String(Math.round(a)) : a < 1e6 ? ((a / 1000).toFixed(1) + ' k') : ((a / 1e6).toFixed(2) + ' M'); };
  var sgT = function (x) { x = Number(x) || 0; return (x >= 0 ? '+' : '−') + kT(x); };
  var pcT = function (x) { return Math.round(Number(x) * 100) + ' %'; };
  h += title('MARCHÉ DES AGENTS', '· à chaque bougie close, chaque agent mise ses T$ sur SON vote de la paire ; à la clôture de la bougie suivante, chaque part juste paie 1 T$ — le prix est une voix de la décision (EV/RE)');
  if (!mkOn) h += '<div style="color:#667;font-size:11px;">AA : l\'ancien marché (bac à sable, rien n\'y est jugé) — ci-dessous, le marché des agents en EV</div>';
  if (!MSt || !((MSt.n || 0) + (MSt.v || 0))) h += '<div style="color:#667;font-size:11px;">pas encore de manche soldée en ' + mkL + ' — une manche s\'ouvre à chaque bougie close de chaque paire active</div>';
  else {
    var brT = MSt.b ? MSt.br / MSt.b : null;
    h += row([{ t: mkL + ' : ' + MSt.n + ' manches soldées · ' + MSt.v + ' nulles (mises rendues)', w: '1.2fr', s: 'font-weight:600;' },
      { t: brT === null ? 'aucune mise encore' : ('erreur du prix (Brier) ' + brT.toFixed(3) + ' — pile ou face : 0,250'), w: '1.4fr', s: 'color:' + (brT !== null && brT < 0.25 ? '#00e87a' : '#ffd166') + ';' },
      { t: MSt.d ? ('bon sens ' + pcT(MSt.ok / MSt.d) + ' des ' + MSt.d + ' manches où il penchait') : '—', w: '1.2fr', s: 'color:#889;' }]);
    h += row([{ t: 'T$ misés ' + kT(MSt.vol) + ' · rendus aux agents ' + kT(MSt.paid) + ' (' + sgT((MSt.paid || 0) - (MSt.vol || 0)) + ')' + (MSt.fw ? ' · dont ' + MSt.fw + ' manches suivies (prix de l\'autre mode, sans mise)' : ''), w: '2fr', s: 'color:#889;' },   // [HORLOGE PAR MODE · 01/10/2026]
      { t: 'hausses ' + pcT((MSt.up || 0) / Math.max(1, MSt.n)) + ' des manches', w: '1fr', s: 'color:#889;' }]);
  }
  var mkPairs = (mkM === 'R') ? Object.keys(S.realActivePairs || {}).filter(function (p) { return S.realActivePairs[p]; }) : _lrnActivePairs();   // RE : ses paires
  if (mkOn && mkPairs.length) {
    h += row([{ t: 'paire', w: '1fr' }, { t: 'manche ouverte : prix · mises', w: '1.5fr' }, { t: 'manche précédente', w: '1.3fr' }], true);
    mkPairs.forEach(function (p) {
      var ps = S.pairStates && S.pairStates[p], R = ps && ps.mkt, col = (typeof PAIRS !== 'undefined' && PAIRS[p] && PAIRS[p].color) || '#ccc';
      var Pn = (R && R.open && typeof _mktPrice === 'function') ? _mktPrice(ps.qYes, ps.qNo) : null;
      var L = R ? (R.open ? R.prev : R) : null;
      h += row([{ t: p.replace('/USDT', ''), w: '1fr', s: 'color:' + col + ';font-weight:600;' },
        { t: Pn === null ? '—' : (pcT(Pn) + ' hausse · ' + (R.fw ? ('suivie : prix de l\'autre mode (' + R.n + ' mise' + (R.n > 1 ? 's' : '') + ')') : (R.n + ' mise' + (R.n > 1 ? 's' : '') + ' (' + kT(R.vol) + ' T$)'))), w: '1.5fr', s: 'color:' + (Pn === null ? '#556' : Pn > 0.5 ? '#00e87a' : Pn < 0.5 ? '#ff8fb1' : '#889') + ';' },
        { t: L ? (pcT(L.P) + ' → ' + (L.out > 0 ? 'hausse' : L.out < 0 ? 'baisse' : 'nulle')) : '—', w: '1.3fr', s: 'color:#889;' }]);
    });
  }
  var mkSeats = (S.agents || []).filter(function (a) { return a && !a.isBot && !a.isMeta && typeof a.mktWallet === 'number' && isFinite(a.mktWallet); }).sort(function (x, y) { return y.mktWallet - x.mktWallet; });
  if (mkSeats.length) {
    var nmT = function (a) { return String(a.name || a.id).split(' ')[0] + ' ' + kT(a.mktWallet) + ' (' + sgT(a.mktGain) + ')'; };
    h += row([{ t: 'pèsent le plus sur le prix (T$, gain)', w: '1.2fr', s: 'color:#889;' }, { t: mkSeats.slice(0, 4).map(nmT).join(' · '), w: '2.8fr', s: 'color:#00e87a;' }]);
    if (mkSeats.length > 4) h += row([{ t: 'le moins', w: '1.2fr', s: 'color:#889;' }, { t: mkSeats.slice(-3).map(nmT).join(' · '), w: '2.8fr', s: 'color:#ff8fb1;' }]);
  }
  var mvO = null, mvH = null;
  try { mvO = (typeof _dcMerit === 'function') ? _dcMerit(S.dcVoices && S.dcVoices.marche) : null; } catch (e) {}
  try { mvH = (typeof _dcMeritHz === 'function') ? _dcMeritHz('marche') : null; } catch (e) {}
  h += row([{ t: 'poids de sa voix dans la décision', w: '1.2fr', s: 'color:#889;' }, { t: 'bougie ' + (mvO === null ? '—' : Number(mvO).toFixed(2)) + ' · horizons ' + (mvH === null ? 'pas encore' : Number(mvH).toFixed(2)), w: '2.8fr' }]);
  // 2d · fitness des sièges [FITNESS AUX HORIZONS · 28/09/2026] (lecture seule)
  var fr = T3 && T3.fRules && T3.fRules[thFm], fmodeTf = (T3 && T3.fModes && T3.fModes[thFm] === 'bougie') ? 'bougie' : 'hz';
  var fmode = (typeof _fjMode === 'function') ? _fjMode() : fmodeTf;   // la définition vivante : une par siège, tous pas de temps (bougie dès qu'un pas l'a prouvé)
  var seats = (S.agents || []).filter(function (a) { return a && !a.isBot && !a.isMeta; });
  var kf = function (x) { x = Math.abs(Number(x) || 0); return x < 1000 ? String(Math.round(x)) : x < 1e6 ? ((x / 1000).toFixed(1) + ' k') : ((x / 1e6).toFixed(2) + ' M'); };   // [MARCHÉ LMSR À PART · 28/09/2026] la dépense de marché se compte en milliers par jour
  h += title('FITNESS DES SIÈGES', '· ce qui décide l\'évolution : le siège le plus faible est recyclé — sa fitness suit son bilan aux horizons dès qu\'il l\'a, la bougie suivante sinon');
  if (!vN && !fr) h += '<div style="color:#667;font-size:11px;">pas encore de siège jugé aux horizons</div>';
  else {
    h += row([{ t: (fmode === 'hz' ? 'fitness aux horizons' : 'fitness à la bougie (retour prouvé)') + (fmode !== fmodeTf ? ' · ce pas de temps : ' + (fmodeTf === 'hz' ? 'horizons' : 'bougie') : ''), w: '1.3fr', s: 'font-weight:600;color:' + (fmode === 'hz' ? '#00e87a' : '#ffd166') + ';' },
      { t: seats.filter(function (a) { return typeof _fitHz === 'function' && _fitHz(a) !== null; }).length + ' sièges jugés aux horizons sur ' + seats.length, w: '1.4fr' }, { t: 'écart : qualité (vote × mouvement) du siège que la bougie retirerait − celle du siège que les horizons retireraient', w: '1.3fr', s: 'color:#889;' }]);
    if (fr && Array.isArray(fr.hz)) fr.hz.forEach(function (x) {
      var lab = (typeof _thHzLab === 'function') ? _thHzLab(x.h, fr.tfMs || 900000) : (x.h + ' b');
      var st = x.better ? 'horizons prouvés meilleurs' : x.worse ? 'bougie prouvée meilleure' : 'pas prouvé';
      h += row([{ t: '↳ ' + lab, w: '.8fr', s: 'font-weight:600;' }, { t: x.mean === null ? 'pas encore d\'écart' : ((x.mean >= 0 ? '+' : '') + Number(x.mean).toFixed(3) + ' %×vote/cycle' + (x.se !== null ? ' (± ' + Number(x.se).toFixed(3) + ')' : '')), w: '1.4fr', s: 'color:' + (x.mean === null ? '#556' : x.mean >= 0 ? '#00e87a' : '#ff4d6d') + ';' },
        { t: x.n + ' cycles · ' + x.blocks + ' créneaux' + (x.crit ? ' · exigé ' + Number(x.crit).toFixed(1) + ' ET' : ''), w: '1.2fr', s: 'color:#889;' }, { t: st, w: '.9fr', s: 'color:' + (x.better ? '#00e87a' : x.worse ? '#ffd166' : '#889') + ';' }]);
    });
    h += row([{ t: 'siège', w: '1.3fr' }, { t: 'bougie', w: '.8fr' }, { t: 'horizons', w: '.8fr' }, { t: 'vivante', w: '.8fr' }, { t: 'marché AA (portefeuille · dépensé)', w: '.9fr' }, { t: 'T$ du marché (gain · manches)', w: '1fr' }], true);
    seats.map(function (a) {
      var fb = null, fh = null; try { fb = (typeof _fitOf === 'function' && typeof _fitWindow === 'function') ? _fitOf(Array.isArray(a._judgments) ? a._judgments : [], _fitWindow()) : null; } catch (e) {}
      try { fh = (typeof _fitHz === 'function') ? _fitHz(a) : null; } catch (e) {}
      return { name: a.name || a.id, fb: fb, fh: fh, f: Number(a.fitness) || 0, m: Number(a.lmsrSpent) || 0, wl: (typeof a.lmsrWallet === 'number' && isFinite(a.lmsrWallet)) ? a.lmsrWallet : null,
        tw: (typeof a.mktWallet === 'number' && isFinite(a.mktWallet)) ? a.mktWallet : null, tg: Number(a.mktGain) || 0, tn: Number(a.mktN) || 0 };   // [MARCHÉ RÉPARÉ · 30/09/2026]
    }).sort(function (x, y) { return x.f - y.f; }).forEach(function (r) {
      h += row([{ t: r.name, w: '1.3fr', s: 'font-weight:600;' }, { t: r.fb === null ? '—' : String(Math.round(r.fb)), w: '.8fr', s: 'color:#889;' },
        { t: r.fh === null ? 'pas encore' : String(Math.round(r.fh)), w: '.8fr', s: 'color:' + (r.fh === null ? '#556' : r.fh >= 350 ? '#00e87a' : '#ff4d6d') + ';' }, { t: String(Math.round(r.f)) + ' T$', w: '.8fr', s: 'color:' + (r.f <= 80 ? '#ff4d6d' : '#cde') + ';font-weight:600;' }, { t: (r.wl === null ? '—' : String(Math.round(r.wl))) + ' · ' + (Math.round(r.m) ? ('−' + kf(r.m)) : '0'), w: '.9fr', s: 'color:#889;' },
          { t: r.tw === null ? '—' : (kf(r.tw) + ' · ' + (r.tg >= 0 ? '+' : '−') + kf(r.tg) + ' · ' + r.tn), w: '1fr', s: 'color:' + (r.tw === null ? '#556' : r.tg >= 0 ? '#00e87a' : '#ff8fb1') + ';' }]);
    });
  }
  // 2e · évolution apprise [ÉVOLUTION APPRISE · 28/09/2026] (lecture seule)
  var EL = (typeof _evoLevels === 'function') ? _evoLevels() : null;   // d'abord (peut purger et rejuger), puis l'état
  var ER = S.evoRule, EO = (ER && Array.isArray(ER.obs)) ? ER.obs : [], ERR = ER && ER.rule;
  var TRIG = { A: '03 · sous le niveau', B: '03 · tous les 15 cycles', C: '03 · sous 300, tous les 8', D: 'Home · sous le niveau', E: 'Home · stagnation', M: 'manuelle' };
  var f3 = function (x) { return (x >= 0 ? '+' : '') + Number(x).toFixed(3); };
  h += title('ÉVOLUTION APPRISE', '· quand recycler un siège : ce que les évolutions ont rapporté (nouveau génome contre ancien, même preuve que le seuil)');
  if (!EO.length) h += '<div style="color:#667;font-size:11px;">pas encore d\'évolution jugée — repli : plus faible sous 150 tout de suite, tous les 15 cycles, sous 300 tous les 8 (03) ; sous 300, stagnation sous 400 (Home)</div>';
  else {
    var st = !EL ? 'rien de prouvé : les nombres posés à la main décident (150 / 300 / 400, tous les 15 cycles)' : ((EL.gain !== null ? ('gain prouvé : recyclable dès que fitness ≤ ' + Math.round(EL.gain) + ' T$ (au-dessus : les nombres posés à la main)') : '') + (EL.gain !== null && EL.harm !== null ? ' · ' : '') + (EL.harm !== null ? ('nuisance prouvée : plus d\'évolution automatique à ' + Math.round(EL.harm) + ' T$ ou moins' + (ERR && ERR.oldest ? ' (au plus jusqu\'au ' + new Date(ERR.oldest + 1.5 * 20 * 4 * 3600000).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' sans nouvelle observation)' : '')) : ''));
    h += row([{ t: st, w: '1.6fr', s: 'font-weight:600;color:' + (!EL ? '#889' : EL.harm !== null && EL.gain === null ? '#ffd166' : '#00e87a') + ';' }, { t: EO.length + ' évolutions jugées · ' + (ERR ? ERR.blocks : '?') + ' créneaux de 4 h (preuve : ≥ 30 et ≥ 20)', w: '1.2fr', s: 'color:#889;' }]);
    [['gain', ERR && ERR.near], ['nuisance', ERR && ERR.nearH]].forEach(function (kv) { var q = kv[1]; if (!q) return; h += row([{ t: '↳ la queue la plus proche d\'une preuve de ' + kv[0] + ' : sièges ≤ ' + Math.round(q.level) + ' T$', w: '1.6fr' }, { t: f3(q.mean) + ' ± ' + (q.se === null || q.se === undefined ? '—' : Number(q.se).toFixed(3)) + ' (' + q.n + ' évolutions, ' + q.blocks + ' créneaux' + (q.crit ? ', exigé ' + Number(q.crit).toFixed(1) + ' ET' : '') + ')', w: '1.2fr', s: 'color:#889;' }]); });
    // [OPÉRATEUR APPRIS · 28/09/2026] les trois sources de naissance
    var OPR = ER && ER.opRule, OPL = (typeof EVO_OP_LABEL === 'object' && EVO_OP_LABEL) ? EVO_OP_LABEL : { R: 'R', B: 'B', M: 'M' }, NOWT = Date.now(), HV = function (x) { return !!(x && (x.harm || (x.held && x.held.until > NOWT))); }, ALLH = !!(OPR && HV(OPR.R) && HV(OPR.B) && HV(OPR.M));
    if (OPR) {
      h += row([{ t: 'source de naissance', w: '1.3fr' }, { t: 'évolutions', w: '.7fr' }, { t: 'écart moyen', w: '.9fr' }, { t: 'état', w: '1.1fr' }], true);
      ['R', 'B', 'M'].forEach(function (op) {
        var x = OPR[op] || {}, hv = HV(x); var st = x.gain ? 'prouvée bénéfique' : hv ? (ALLH ? 'prouvée nuisible (toutes : aucune écartée)' : ('prouvée nuisible (écartée' + (x.held && x.held.until ? ' jusqu\'au ' + new Date(x.held.until).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' sans nouvelle observation' : '') + ')')) : x.open ? 'à juger (sous 30 évolutions ou 20 créneaux)' : 'pas prouvé';
        h += row([{ t: OPL[op], w: '1.3fr', s: 'font-weight:600;' }, { t: String(x.n || 0) + (x.blocks ? ' · ' + x.blocks + ' cr.' : ''), w: '.7fr', s: 'color:#889;' },
          { t: x.mean === null || x.mean === undefined ? '—' : (f3(x.mean) + (x.se !== null && x.se !== undefined ? ' ± ' + Number(x.se).toFixed(3) : '')), w: '.9fr', s: 'color:' + (x.mean === null || x.mean === undefined ? '#556' : x.mean >= 0 ? '#00e87a' : '#ff4d6d') + ';' }, { t: st, w: '1.1fr', s: 'color:' + (x.gain ? '#00e87a' : hv ? '#ffd166' : '#889') + ';' }]);
      });
      var POL = (typeof _evoOpPolicy === 'function') ? _evoOpPolicy() : (OPR.policy || '');   // la politique en cours (pas une prédiction : la source dépend du siège recyclé)
      if (POL) h += row([{ t: 'naissances : ' + POL + ' · B seulement sur un siège qui a une version passée complète où revenir', w: '1fr', s: 'color:#889;' }]);
    }
    h += row([{ t: 'évolution', w: '.9fr' }, { t: 'siège', w: '1fr' }, { t: 'fitness', w: '.6fr' }, { t: 'déclencheur', w: '1fr' }, { t: 'source', w: '.8fr' }, { t: 'écart', w: '.7fr' }], true);
    EO.slice(-8).reverse().forEach(function (o) {
      var dd = o[2] / 10000, so = (o[7] === 'B' || o[7] === 'M') ? o[7] : 'R';
      h += row([{ t: new Date(o[0] * 1000).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), w: '.9fr', s: 'color:#889;' }, { t: String(o[6] || '—'), w: '1fr', s: 'font-weight:600;' }, { t: String(o[1]) + ' T$', w: '.6fr' },
        { t: (TRIG[o[4]] || o[4]) + (o[5] ? ' (Rams)' : ''), w: '1fr', s: 'color:#889;' }, { t: OPL[so], w: '.8fr', s: 'color:#889;' }, { t: f3(dd) + ' (' + o[3] + ' év.)', w: '.7fr', s: 'color:' + (Math.abs(dd) < 0.1 ? '#889' : dd > 0 ? '#00e87a' : '#ff4d6d') + ';' }]);
    });
  }
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
  // 4c · évolutions jugées [MÉRITE DE L'ÉVOLUEUR · 26/09/2026]
  var et = S.evoTrials || {}, etK = Object.keys(et), em = S.evoMerit || null;
  h += title('ÉVOLUTIONS JUGÉES', '· le nouveau génome contre l\'ancien, votés sur les mêmes événements (30)');
  if (!etK.length && !(em && em.recent && em.recent.length)) h += '<div style="color:#667;font-size:11px;">aucune évolution depuis la mise en place (≤ 1 par heure)</div>';
  etK.forEach(function (id) {
    var tr = et[id] || {}, pn = tr.nw > 0 ? Math.round((tr.ns / tr.nw + 1) * 50) : null, po = tr.ow > 0 ? Math.round((tr.os / tr.ow + 1) * 50) : null;
    h += row([{ t: (tr.name || id), w: '1.3fr', s: 'font-weight:600;' }, { t: (tr.n || 0) + '/30', w: '.6fr' }, { t: pn === null ? 'en attente du premier vote' : ('nouveau ' + pn + ' % · ancien ' + po + ' %'), w: '2.1fr', s: 'color:#889;' }]);
  });
  if (em && em.recent && em.recent.length) {
    em.recent.slice(-5).reverse().forEach(function (r) {
      var col = r.verdict === 'amélioration' ? '#00e87a' : r.verdict === 'dégradation' ? '#ff4d6d' : '#889';
      h += row([{ t: (r.name || r.seat), w: '1.3fr' }, { t: r.verdict, w: '1fr', s: 'color:' + col + ';font-weight:600;' }, { t: r.accNew + ' % contre ' + r.accOld + ' % · ' + r.n + ' jug.', w: '1.7fr', s: 'color:#889;' }]);
    });
    h += '<div style="color:#667;font-size:10px;padding:3px 2px;">bilan : ' + (em.good || 0) + ' amélioration(s) · ' + (em.bad || 0) + ' dégradation(s) · ' + (em.inconclusive || 0) + ' non concluant(s)</div>';
  }
  // 5 · journal
  // [MODES SÉPARÉS · 10/10/2026] les ouvertures, fermetures, sorties et refus comptés ici sont ceux du mode À L'ÉCRAN (02 _eventNote : st._m[mode]). Avant, un
  // seul total pour les trois modes : depuis que l'école trade derrière l'EV (10/10), ses trades s'y mêlaient à ceux de l'EV. Le réseau reste commun.
  // Un jour sans détail par mode, ou dont le détail est incomplet (jours d'avant cette version, jour de la mise à jour), garde son total, marqué « * ».
  var es = S.eventStats || {}, days = Object.keys(es).sort().slice(-3);
  var _jm = (typeof _walletKey === 'function') ? _walletKey(S.tradingMode) : S.tradingMode, _jl = (typeof _modeLab === 'function') ? _modeLab(_jm) : _jm;
  var _jk = ['ouverture', 'fermeture', 'sortie_gain', 'sortie_trailing', 'sortie_zombie', 'sortie_consensus', 'veto'], _jStar = false;
  h += title('JOURNAL', '· événements comptés par jour · ' + _jl);
  if (!days.length) h += '<div style="color:#667;font-size:11px;">rien encore</div>';
  else days.forEach(function (d) {
    var st = es[d] || {}, bm = st._m || null;
    // détail complet = pour chaque nature de trade, la somme des modes fait le total du jour
    var full = !!bm && _jk.every(function (k) { var s = 0; Object.keys(bm).forEach(function (m) { s += Number((bm[m] || {})[k]) || 0; }); return s === (Number(st[k]) || 0); });
    var sm = full ? (bm[_jm] || {}) : null;
    if (!sm) _jStar = true;
    var keys = ['ouverture', 'fermeture', 'sortie_gain', 'sortie_trailing', 'sortie_zombie', 'sortie_consensus', 'reseau', 'veto'];
    var val = function (k) { return (sm && k !== 'reseau') ? sm[k] : st[k]; };
    var parts = keys.filter(function (k) { return val(k); }).map(function (k) { return k.replace('sortie_', '') + ' ' + val(k); });
    h += row([{ t: d.slice(5) + (sm ? '' : ' *'), w: '.6fr', s: 'font-weight:600;' }, { t: parts.join(' · ') || '—', w: '3fr', s: 'color:#aab;' }]);
  });
  if (_jStar) h += '<div style="color:#667;font-size:10px;padding:3px 2px;">* tous modes confondus (compté avant le détail par mode)</div>';
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
