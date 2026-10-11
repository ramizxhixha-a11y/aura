// rejeu/sondes/pont-20261011.js — [PONT DIRECT · 11/10/2026] mesure de mission pour rejeu/sonde_modes.js (--inject) : le pont (17 + 17b) dans la VRAIE page,
// contre le faux GitHub des bancs (banc-fixtures/faux-github.js, chargé depuis le serveur de la sonde). Deux usages, même script :
//   --injectarg '{"actif":true}'    le PAT d'essai est collé dans le VRAI champ du panneau Outils, « Activer » appelé comme un toucher ; des demandes sont
//                                   déposées aux minutes du plan ; à la fin : ce qui est parti (adresses, en-têtes, tailles), les réponses, le backup, la
//                                   recherche du PAT partout (dépôt, page, S, localStorage), les traces éventuelles du pont dans les journaux de l'app
//   --injectarg '{"actif":false}'   témoin : même script, pont laissé sans PAT (inerte) — sert au tirage de comparaison (--dump identique attendu)
// Autres réglages : "playEV":true met l'EV en play avant la mesure (témoin et essai : même réglage) ; "plan":[[minute,"cmd",{args}],…] remplace le plan ;
//   "wsFige":true   les WebSocket de la page deviennent des objets FERMÉS d'emblée (témoin et essai). Sans cela, le réseau coupé par la sonde fait échouer
//                   les vrais WebSocket à un instant RÉEL qui varie d'un tirage à l'autre : le gardien des connexions (02 _bgCollectorHealthCheck) relance alors
//                   plus ou moins de fois, et son toast « 🔌 Reconnexion » (silencieux, compté dans S._silencedCount) varie tout seul — mesuré le 11/10 sur quatre
//                   tirages TÉMOINS identiques par ailleurs : 43, 58, 39, 45 relances en 20 min. Avec wsFige, deux tirages de même départ sont comparables au caractère près.
// Comparer : même --seed, --flush 1 --cgchg backup --split 1, --dump <f> ; le code d'avant doit porter le même jeton dans le HTML (la ligne « Document v… »
// du journal en dépend). Le PAT d'essai est fabriqué ici : aucun texte du dépôt ne ressemble à un vrai jeton.
(function () {
  var A = window.__probeArg || {}, G = ['github', 'pat', ''].join('_'), PAT = G + 'S'.repeat(22) + '_' + 'SondeNavigateur'.repeat(4).slice(0, 59);
  var x = new XMLHttpRequest(); x.open('GET', '/banc-fixtures/faux-github.js', false); x.send(); (0, eval)(x.responseText);
  var jetons = {}; jetons[PAT] = { pont: 'rw', code: null };
  var gh = window.__fauxGitHub({ jetons: jetons });
  gh.poser('LISEZMOI.md', '# aura-pont'); ['demandes', 'reponses', 'backups'].forEach(function (d) { gh.poser(d + '/.gitkeep', ''); });
  var f0 = window.fetch;
  window.fetch = function (u, i) { var s = String((u && u.url) || u); return s.indexOf('https://api.github.com/') === 0 ? gh.fetch(s, i) : f0.apply(window, arguments); };
  var plan = A.plan || [[1, 'ping'], [2, 'etat'], [3, 'diag'], [4, 'lire', { quoi: 'S', chemin: ['walletStore', 'paperReal'], prof: 2, n: 3 }], [5, 'lire', { quoi: 'rec' }], [6, 'backup'], [7, 'lire', { quoi: 'S', chemin: ['newsApiKey'] }],
    [8, 'ouvrir', { pair: 'BTC/USDT', side: 'long' }], [9, 'lire', { quoi: 'tl' }], [10, 'lire', { quoi: 'throttle' }], [12, 'backup'], [20, 'lire', { quoi: 'S', chemin: ['perfLog', 'boots'], n: 2 }], [40, 'ping'], [90, 'diag']];
  if (A.wsFige) {
    var FauxWS = function (url) { this.url = url; this.readyState = 3; this._createdAt = Date.now(); };
    FauxWS.prototype.close = function () {}; FauxWS.prototype.send = function () {}; FauxWS.prototype.addEventListener = function () {}; FauxWS.prototype.removeEventListener = function () {};
    FauxWS.CONNECTING = 0; FauxWS.OPEN = 1; FauxWS.CLOSING = 2; FauxWS.CLOSED = 3;
    window.WebSocket = FauxWS;
    try { Object.keys(_bgCollectorWSMap).forEach(function (p) { var w = _bgCollectorWSMap[p]; try { w.onclose = null; w.onerror = null; w.onmessage = null; w.onopen = null; w.close(); } catch (e) {} _bgCollectorWSMap[p] = new FauxWS('fige'); }); } catch (e) {}
    try { if (_liqWs) { _liqWs.onclose = null; _liqWs.onerror = null; _liqWs.onmessage = null; _liqWs.onopen = null; try { _liqWs.close(); } catch (e) {} _liqWs = new FauxWS('fige'); } } catch (e) {}
    try { var rw = _realCandlesState && _realCandlesState.ws; if (rw) { rw.onclose = null; rw.onerror = null; rw.onmessage = null; rw.onopen = null; try { rw.close(); } catch (e) {} _realCandlesState.ws = new FauxWS('fige'); } } catch (e) {}
  }
  var ids = [], N = { active: null, bar: !!document.getElementById('pontDirectBar'), minuteries0: window.__timerCount ? window.__timerCount() : null };
  if (A.playEV) { try { _setModeRunning('paperReal', true); } catch (e) { N.playEVErr = String(e); } }
  if (A.actif) {
    try { document.getElementById('pontDirectPat').value = PAT; window.pontDirectActiver(); N.active = 'demandée'; }   // rien n'est écrit dans S : le témoin et l'essai partent du même état
    catch (e) { N.active = 'exception : ' + String(e && e.message || e); }
  }
  var pad = function (n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; };
  window.__probe = {
    minute: function (m) {
      plan.forEach(function (p, k) {
        if (p[0] !== m) return;
        var d = new Date(), id = d.getUTCFullYear() + pad(d.getUTCMonth() + 1, 2) + pad(d.getUTCDate(), 2) + '-' + pad(d.getUTCHours(), 2) + pad(d.getUTCMinutes(), 2) + pad(d.getUTCSeconds(), 2) + '-s' + pad(k, 3);
        gh.poser('demandes/' + id + '.json', JSON.stringify({ id: id, cmd: p[1], t: Date.now(), args: p[2] })); ids.push([id, p[1], m]);
      });
    },
    end: function () {
      var st = window._pontStatus || null, dit = [], O = 'https://api.github.com/repos/ramizxhixha-a11y/', J = gh.journal;
      var hors = J.filter(function (r) { return !(r.url === O + 'aura-pont' || r.url.indexOf(O + 'aura-pont/contents/') === 0 || r.url === O + 'aura/contents/js/17b-pont-direct.js'); });
      var corpsPat = J.filter(function (r) { return r.brut && r.brut.indexOf(PAT) >= 0; }).length, sansAuth = J.filter(function (r) { return r.h.Authorization !== 'Bearer ' + PAT; }).length;
      var opt = J.filter(function (r) { return !(r.opt.redirect === 'error' && r.opt.cache === 'no-store' && r.opt.credentials === 'omit'); }).length;
      var compte = {}; J.forEach(function (r) { var k = r.m + ' ' + (r.url === O + 'aura-pont' ? 'dépôt' : r.url.indexOf('/aura/contents/') > 0 ? 'sonde du code' : r.url.replace(O + 'aura-pont/contents/', '').replace(/\/.*$/, '/…')); compte[k] = (compte[k] || 0) + 1; });
      var texte = function (p) { try { return gh.texte(p); } catch (e) { return null; } };
      var reps = ids.map(function (q) { var t = texte('reponses/' + q[0] + '.json'), r = null; try { r = t === null ? null : JSON.parse(t); } catch (e) {} return { id: q[0], cmd: q[1], min: q[2], ok: r ? r.ok : null, err: r && r.err ? String(r.err).slice(0, 90) : null, ms: r ? r.ms : null, car: t === null ? 0 : t.length }; });
      var fuites = [];
      gh.chemins().forEach(function (p) { if (/\.gz$/.test(p)) return; var t = texte(p); if (t && t.indexOf(PAT) >= 0) fuites.push(p); });
      try { if (document.documentElement.innerHTML.indexOf(PAT) >= 0) fuites.push('la page (HTML)'); } catch (e) {}
      try { var inp = document.getElementById('pontDirectPat'); if (inp && inp.value) fuites.push('le champ de saisie'); } catch (e) {}
      try { Object.keys(S).forEach(function (k) { var d = Object.getOwnPropertyDescriptor(S, k), s = ''; try { s = JSON.stringify('value' in d ? d.value : null) || ''; } catch (e) {} if (s.indexOf(PAT) >= 0) fuites.push('S.' + k); }); } catch (e) {}
      var lsPat = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if ((localStorage.getItem(k) || '').indexOf(PAT) >= 0) lsPat.push(k); } } catch (e) {}
      var traces = (S.chainLog || []).filter(function (c) { return /17b?-pont|pont:backup|api\.github/.test(String(c && c.desc)); }).map(function (c) { return String(c.desc).slice(0, 140); });
      var lents = ((S.perfLog && S.perfLog.lent) || []).filter(function (l) { return /17b?-pont|pont:/.test(String(l && l.name)); }).map(function (l) { return l.name + ' ' + l.dur + ' ms'; });
      var etat = null; try { etat = JSON.parse(texte('etat.json')); } catch (e) {}
      var bk = gh.chemins().filter(function (p) { return /^backups\/aura/.test(p); }), b64 = null;
      if (bk.length) { var u = gh.octets(bk[0]), s2 = ''; for (var q2 = 0; q2 < u.length; q2 += 8190) s2 += btoa(String.fromCharCode.apply(null, u.subarray(q2, q2 + 8190))); b64 = s2; }
      var t0 = performance.now(), snap = null, car = 0; try { snap = window.buildSnapshot(); car = JSON.stringify(snap).length; } catch (e) {} var msSnap = Math.round(performance.now() - t0);
      dit.push('pont ' + (A.actif ? 'ACTIF' : 'inerte (témoin)') + ' · ligne Outils ' + (N.bar ? 'présente' : 'ABSENTE') + ' · état ' + JSON.stringify(st && st.etat) + ' · servis ' + (st && st.servis) + ' · refus ' + (st && st.refus) + ' · échecs ' + (st && st.echecs) + ' · dernier incident ' + JSON.stringify(st && st.err));
      dit.push('requêtes ' + J.length + ' : ' + JSON.stringify(compte) + ' · hors des deux adresses ' + hors.length + ' · sans le bon Authorization ' + sansAuth + ' · options réseau non conformes ' + opt + ' · corps contenant le PAT ' + corpsPat + ' · écritures abouties ' + gh.ecrits.length + ' · dépôt du code écrit ' + gh.ecritsCode);
      dit.push('etat.json : ' + (etat ? 'doc ' + JSON.stringify(etat.doc) + ' · écran ' + JSON.stringify(etat.ecran) + ' · cycle ' + etat.cycle + ' · n° ' + etat.n + ' · prêt ' + etat.pret + ' · natif ' + etat.natif + ' · scripts ' + JSON.stringify(etat.scripts) + ' · ' + (texte('etat.json') || '').length + ' caractères' : 'absent'));
      reps.forEach(function (r) { dit.push('demande min ' + r.min + ' · ' + r.cmd + ' → ' + (r.ok === null ? 'PAS DE RÉPONSE' : (r.ok ? 'ok' : 'refus « ' + r.err + ' »')) + ' · ' + r.car + ' caractères · ' + r.ms + ' ms'); });
      dit.push('backups : ' + JSON.stringify(bk) + ' · octets ' + JSON.stringify(bk.map(function (p) { return gh.octets(p).length; })) + ' · snapshot de la page ' + car + ' caractères, bâti + texte en ' + msSnap + ' ms ici');
      dit.push('PAT retrouvé hors de sa place : ' + JSON.stringify(fuites) + ' · clés localStorage qui portent le PAT : ' + JSON.stringify(lsPat) + ' · lignes du journal de l\'app qui nomment le pont : ' + JSON.stringify(traces) + ' · rappels lents (> 1 s) du pont notés par 00 : ' + JSON.stringify(lents));
      dit.push('minuteries à la pose ' + N.minuteries0 + ' · à la fin ' + (window.__timerCount ? window.__timerCount() : '?') + ' · activation ' + JSON.stringify(N.active) + ' · silencieux ' + (S._silencedCount || 0));
      return { dit: dit, actif: !!A.actif, st: st ? JSON.parse(JSON.stringify(st)) : null, compte: compte, hors: hors.length, sansAuth: sansAuth, opt: opt, corpsPat: corpsPat, reps: reps, fuites: fuites, lsPat: lsPat, traces: traces, lents: lents,
        etat: etat, backups: bk, backupB64: b64, snapCar: car, msSnap: msSnap, ecrits: gh.ecrits.slice(), ecritsCode: gh.ecritsCode };
    }
  };
})();
