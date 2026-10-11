// ═══ [PONT DIRECT · 11/10/2026] VERSION 20261011a · LECTURE de l'app pour le pont (17b-pont-direct.js) · « go pont » (Rams, 11/10 00:25) ═══
// Ce fichier ne fait que LIRE, et seulement quand le pont (17b) le lui demande. Il ne connaît NI le PAT NI le réseau : aucun fetch,
// aucune minuterie durable, aucun écouteur, aucun accès à localStorage hors la clé « aura_throttle_log » (journal des arrêts de 00).
//   • il n'écrit RIEN dans S, n'appelle AUCUNE fonction de l'app, jamais Math.random ;
//   • il lit les propriétés PROPRES par leur descripteur et n'appelle JAMAIS un accesseur de l'app : les champs de portefeuille de S
//     (portfolio, openPositions, pairStates… — accesseurs de 02, qui CRÉENT le portefeuille s'il manque) sont lus là où ils vivent,
//     S.walletStore[mode à l'écran] ; tout autre accesseur est rendu « [accesseur non appelé] ». Il ne convertit en texte ou en nombre
//     que des valeurs simples (ni toString ni valueOf de l'app) et reconnaît un objet à son prototype, pas à son étiquette.
//     Limite dite : un Proxy (l'app n'en a aucun) verrait ses trappes de lecture appelées ;
//   • il masque tout champ dont le NOM évoque un secret (S.newsApiKey, S.telegramCfg.botToken) et donne à 17b la VALEUR de ces champs,
//     pour qu'elle soit retirée de tout ce qui part ; il n'ouvre jamais window, document, navigator, localStorage, sessionStorage ni
//     un élément de la page ; seuls les tableaux et les objets simples s'ouvrent (Map, Set, erreur, classe… : nommés, pas ouverts) ;
//   • ce qu'il rend est borné : profondeur 8, 40 000 valeurs en tout (CHAQUE valeur compte, pas seulement les objets : le coût d'une
//     lecture est borné aussi), les N derniers éléments d'un tableau (500 au plus), 400 clés par objet, 2 000 caractères par texte.
// SOURCES de « lire » — liste fermée : S (l'état), RT (09a), rec (window._recStatus, 14), tl (window._tlStatus, 15),
// lents (window._auraSlowTimers, 00), throttle (les arrêts de la tablette, 00), pont (window._pontStatus, 17b).
(function () {
  'use strict';
  if (typeof window === 'undefined' || window._pontLecture) return;

  var LECT_V = '20261011a', NOEUDS_MAX = 40000;
  var MODES = ['sim', 'paperReal', 'real'];
  var RE_SECRET = /(api_?key|secret|token|jeton|passw|pwd|passphrase|mnemonic|credential|authorization|bearer|private_?key|access_?key|webhook|cookie|jwt)/i;
  var ACC = {};   // marque interne : « cette propriété est un accesseur, non appelé »
  var DOC = null;
  try { var cs = document.currentScript, mv = cs && /[?&]v=([0-9a-z]+)/.exec(cs.src || ''); DOC = mv ? mv[1] : null; } catch (e) {}

  // ── lecture sans effet ──
  function txt(x, n) { var t = typeof x; return (t === 'string' ? x : ((t === 'number' || t === 'boolean') ? String(x) : '')).slice(0, n || 200); }
  function num(x, d) { if (typeof x !== 'number' || !isFinite(x)) return null; var p = Math.pow(10, d === undefined ? 2 : d); return Math.round(x * p) / p; }
  function ent(x) { return (typeof x === 'number' && isFinite(x)) ? x : 0; }
  function val(o, k) {   // valeur d'une propriété PROPRE ; ACC si c'est un accesseur (jamais appelé)
    var d; try { d = Object.getOwnPropertyDescriptor(o, k); } catch (e) { return undefined; }
    if (!d) return undefined;
    return ('value' in d) ? d.value : ACC;
  }
  function lu(o, k) { if (o === null || o === undefined || (typeof o !== 'object' && typeof o !== 'function')) return undefined; var v = val(o, k); return v === ACC ? undefined : v; }
  function dernier(a) { if (!Array.isArray(a) || !a.length) return null; var v = lu(a, String(a.length - 1)); return v === undefined ? null : v; }
  function liveS() { try { return (typeof S !== 'undefined' && S) ? S : null; } catch (e) { return null; } }
  function interdit(v) {
    try {
      if (v === window || v === document) return true;
      if (typeof localStorage !== 'undefined' && v === localStorage) return true;
      if (typeof sessionStorage !== 'undefined' && v === sessionStorage) return true;
      if (typeof navigator !== 'undefined' && v === navigator) return true;
      if (typeof Storage === 'function' && v instanceof Storage) return true;
      if (typeof Node === 'function' && v instanceof Node) return true;
    } catch (e) { return true; }
    return false;
  }
  function ouvrable(v) {   // 1 : tableau · 2 : objet simple · 0 : tout le reste, qui n'est ni ouvert ni traversé
    try { if (Array.isArray(v)) return 1; var p = Object.getPrototypeOf(v); return (p === Object.prototype || p === null) ? 2 : 0; } catch (e) { return 0; }
  }
  function nomDe(v) {   // « [Map] », « [Uint8Array] »… ; une date est rendue en ISO
    try {
      var p = Object.getPrototypeOf(v);
      if (p === Date.prototype) { try { return Date.prototype.toISOString.call(v); } catch (e) { return '[date]'; } }
      var c = p ? val(p, 'constructor') : null, n = (typeof c === 'function') ? val(c, 'name') : null;
      return '[' + ((typeof n === 'string' && n) ? n.slice(0, 40) : 'objet') + ']';
    } catch (e2) { return '[illisible]'; }
  }
  function ecran(S0) {   // le mode à l'écran, d'où que l'on soit (la règle de 02 _screenMode, sans l'appeler)
    var f = lu(window, '_bgFrom');
    if (lu(window, '_bgResolve') === true && MODES.indexOf(f) >= 0) return f;
    var m = S0 ? val(S0, 'tradingMode') : null;
    return MODES.indexOf(m) >= 0 ? m : 'sim';
  }
  function portefeuille(S0, mode) {
    var ws = S0 ? lu(S0, 'walletStore') : null, w = (ws && typeof ws === 'object') ? lu(ws, mode) : null;
    return (w && typeof w === 'object') ? w : null;
  }
  function champ(o, k) {   // comme val, mais un champ de portefeuille de S est lu dans S.walletStore[mode à l'écran]
    var v = val(o, k);
    if (v !== ACC) return v;
    var S0 = liveS(), L = lu(window, '_WALLET_ACCESSOR_FIELDS');
    if (S0 && o === S0 && Array.isArray(L) && L.indexOf(k) >= 0) { var w = portefeuille(S0, ecran(S0)); if (w) { var x = val(w, k); if (x !== ACC) return x; } }
    return '[accesseur non appelé]';
  }
  function copie(v, prof, lim) {
    var ctx = { n: 0, max: (lim && lim.noeuds) || NOEUDS_MAX, tab: Math.max(1, Math.min(500, (lim && lim.n) || 30)), vus: [] };
    return cp(v, (prof === undefined || prof === null) ? 2 : prof, ctx, '');
  }
  function cp(v, prof, ctx, nom) {
    var t = typeof v;
    if (v === null || t === 'undefined') return null;
    if (nom && RE_SECRET.test(nom)) return v === '' ? '' : '[masqué]';
    if (++ctx.n > ctx.max) return '[tronqué]';   // chaque valeur compte
    if (t === 'number') return isFinite(v) ? v : String(v);
    if (t === 'boolean') return v;
    if (t === 'string') return v.length > 2000 ? v.slice(0, 2000) + '… [' + v.length + ' car.]' : v;
    if (t !== 'object') return '[' + t + ']';   // fonction, symbole, bigint
    if (interdit(v)) return '[interdit]';
    if (ctx.vus.indexOf(v) >= 0) return '[cycle]';
    var genre = ouvrable(v);
    if (!genre) return nomDe(v);
    var cles; try { cles = Object.keys(v); } catch (e3) { return '[illisible]'; }
    if (prof <= 0) return genre === 1 ? '[tableau · ' + v.length + ']' : '[objet · ' + cles.length + ' clés]';
    ctx.vus.push(v);
    var out, i;
    if (genre === 1) {
      var L = v.length, de = Math.max(0, L - ctx.tab); out = [];
      if (de > 0) out.push('… ' + de + ' avant');
      for (i = de; i < L; i++) out.push(cp(champ(v, String(i)), prof - 1, ctx, ''));
    } else {
      var m = Math.min(cles.length, 400); out = {};
      for (i = 0; i < m; i++) Object.defineProperty(out, cles[i], { value: cp(champ(v, cles[i]), prof - 1, ctx, cles[i]), enumerable: true, writable: true, configurable: true });   // defineProperty : une clé « __proto__ » reste une clé
      if (cles.length > m) out['…'] = (cles.length - m) + ' clés de plus';
    }
    ctx.vus.pop();
    return out;
  }
  function suivre(racine, chemin) {
    var cur = racine;
    for (var i = 0; i < chemin.length; i++) {
      var k = chemin[i];
      if (typeof k !== 'string' && typeof k !== 'number') return { err: 'chemin : élément ' + i + ' illisible' };
      k = String(k);
      if (RE_SECRET.test(k)) return { err: 'chemin masqué : ' + txt(k, 40) };
      if (cur === null || typeof cur !== 'object' || interdit(cur) || !ouvrable(cur)) return { err: 'chemin : « ' + txt(chemin.slice(0, i).join('.'), 120) + ' » n\'est pas un objet qui s\'ouvre' };
      if (!Object.prototype.hasOwnProperty.call(cur, k)) { var cles = []; try { cles = Object.keys(cur).slice(0, 80); } catch (e) {} return { err: 'chemin : « ' + txt(k, 40) + ' » absent', cles: cles }; }
      cur = champ(cur, k);
    }
    return { v: cur };
  }
  var SOURCES = Object.freeze({
    S: liveS,
    RT: function () { return lu(window, 'RT') || null; },
    rec: function () { return lu(window, '_recStatus') || null; },
    tl: function () { return lu(window, '_tlStatus') || null; },
    lents: function () { return lu(window, '_auraSlowTimers') || null; },
    throttle: function () { try { return JSON.parse(localStorage.getItem('aura_throttle_log') || '[]'); } catch (e) { return null; } },
    pont: function () { return lu(window, '_pontStatus') || null; }
  });
  // { quoi, chemin: [clés], prof: 0…8, n: derniers éléments d'un tableau } → { quoi, chemin, type, v } ou { _err, cles }
  function lire(args) {
    var q = args ? args.quoi : null, src = (typeof q === 'string' && Object.prototype.hasOwnProperty.call(SOURCES, q)) ? SOURCES[q] : null;
    if (!src) return { _err: 'source inconnue (liste fermée : ' + Object.keys(SOURCES).join(', ') + ')' };
    var ch = args.chemin === undefined ? [] : args.chemin;
    if (!Array.isArray(ch) || ch.length > 16) return { _err: 'chemin : un tableau de 16 éléments au plus' };
    var racine = src();
    if (racine === null || racine === undefined) return { _err: 'source absente : ' + q };
    var s = suivre(racine, ch);
    if (s.err) return { _err: s.err, cles: s.cles };
    var prof = (typeof args.prof === 'number' && isFinite(args.prof)) ? Math.max(0, Math.min(8, args.prof | 0)) : 2, v = s.v;
    var type = (v === null || v === undefined) ? 'absent' : (Array.isArray(v) ? 'tableau · ' + v.length : typeof v);
    return { quoi: q, chemin: ch.map(function (k) { return txt(k, 60); }), type: type, v: copie(v, prof, { n: (typeof args.n === 'number' && isFinite(args.n)) ? (args.n | 0) : 0 }) };
  }
  // Les VALEURS des champs au nom de secret (S et ses objets directs) : 17b les retire de tout ce qui part, où qu'elles aient pu se glisser.
  function secrets() {
    var out = [], S0 = liveS();
    var voir = function (o, prof) {
      var ks; try { ks = Object.keys(o); } catch (e) { return; }
      for (var i = 0; i < ks.length && i < 400 && out.length < 20; i++) {
        var v = val(o, ks[i]);
        if (typeof v === 'string') { if (v.length >= 12 && RE_SECRET.test(ks[i]) && out.indexOf(v) < 0) out.push(v); }
        else if (prof > 0 && v && v !== ACC && typeof v === 'object' && ouvrable(v) === 2) voir(v, prof - 1);
      }
    };
    if (S0) voir(S0, 1);
    return out;
  }

  // ── l'état court de l'app (etat.json) et le diagnostic ──
  function scripts(liste) {
    var out = { n: 0, jetons: {} }; if (liste) out.liste = [];
    try {
      var L = document.scripts || [];
      for (var i = 0; i < L.length; i++) {
        var m = /([^\/?#]+\.js)(?:\?v=([0-9a-z]+))?/.exec(L[i].src || ''); if (!m) continue;
        out.n++; out.jetons[m[2] || '-'] = (out.jetons[m[2] || '-'] || 0) + 1;
        if (liste && out.liste.length < 150) out.liste.push(m[1] + (m[2] ? '?v=' + m[2] : ''));
      }
    } catch (e) {}
    return out;
  }
  function modes(S0) {
    var out = {};
    MODES.forEach(function (m) {
      var w = portefeuille(S0, m); if (!w) { out[m] = null; return; }
      var pos = lu(w, 'openPositions'); pos = Array.isArray(pos) ? pos : [];
      var liste = [];
      for (var i = Math.max(0, pos.length - 40); i < pos.length; i++) {
        var p = lu(pos, String(i));
        liste.push((!p || typeof p !== 'object') ? null : { id: txt(lu(p, 'id'), 24), paire: txt(lu(p, 'pair'), 16), sens: txt(lu(p, 'side'), 8), auto: lu(p, 'auto') === true, entree: num(lu(p, 'entryPrice'), 8),
          mise: num(lu(p, 'stakeUsdt')), pnl: num(lu(p, 'pnl'), 3), pnlUsdt: num(lu(p, 'pnlUsdt'), 3), ouverte: ent(lu(p, 'openedAt')) || null });
      }
      out[m] = { play: lu(w, 'running') === true, portefeuille: num(lu(w, 'portfolio')), trading: num(lu(w, 'tradingAccount')), caisse: num(lu(w, 'cashAccount')),
        trades: ent(lu(w, 'totalTrades')), gagnants: ent(lu(w, 'winTrades')), nPos: pos.length, positions: liste };
    });
    return out;
  }
  // Chaque rubrique est bâtie à part : une lecture qui échoue donne { _err } dans SA rubrique, le reste de l'état part quand même.
  function sur(o, k, f) { try { var v = f(); if (v !== undefined) o[k] = v; } catch (e) { o[k] = { _err: txt(e && e.message, 120) }; } }
  function etat() {
    var t = Date.now(), S0 = liveS(), RT0 = SOURCES.RT();
    var o = { doc: DOC, t: t, iso: new Date(t).toISOString(), fuseauMin: new Date(t).getTimezoneOffset(), natif: !!(val(window, 'Capacitor') || val(window, 'cordova')),
      visible: (function () { try { return document.visibilityState; } catch (e) { return null; } })(),
      enLigne: (function () { try { return navigator.onLine !== false; } catch (e) { return null; } })(),
      pret: lu(window, '_stateReady') === true };
    sur(o, 'scripts', function () { return scripts(false); });
    if (S0) {
      o.ecran = ecran(S0); o.cycle = ent(val(S0, 'cycle'));
      sur(o, 'modes', function () { return modes(S0); });
      sur(o, 'tendance', function () {
        var tl = lu(S0, 'tendance'); if (!tl || typeof tl !== 'object') return undefined;
        var tp = lu(tl, 'pos'), tt = lu(tl, 'tot'), ttOk = !!tt && typeof tt === 'object';
        return { ouvertes: (tp && typeof tp === 'object') ? Object.keys(tp).length : 0, net: ttOk ? num(lu(tt, 'net'), 4) : null, trades: ttOk ? ent(lu(tt, 'n')) : 0 };
      });
      sur(o, 'perf', function () {   // le DERNIER de chaque journal (ces journaux sont plafonnés par l'app : leur longueur ne dit rien)
        var pl = lu(S0, 'perfLog'); if (!pl || typeof pl !== 'object') return undefined;
        var q = function (k) { return dernier(lu(pl, k)); }, g = q('gels');
        return { boot: copie(q('boots'), 1), gel: (g && typeof g === 'object') ? { t: num(lu(g, 't'), 0), gap: num(lu(g, 'gap'), 1), op: txt(lu(g, 'op'), 60) } : null,
          lent: copie(q('lent'), 1), heap: copie(q('heap'), 1), net: copie(q('net'), 1) };
      });
      sur(o, 'avalees', function () { var es = lu(S0, '_errStats'); return (es && typeof es === 'object') ? Object.keys(es).length : undefined; });
    }
    // Réseau et moteur, là où l'app les tient VRAIMENT : le témoin réseau de 01 (window._auraNetOffline : un ping réel, navigator.onLine ne vaut rien sur
    // Android), le battement de 01 (window._auraSimState.running), le chrono de 01, le dernier prix réel reçu de 09j (RT._lastRealPriceTs).
    sur(o, 'reseau', function () {
      var pa = RT0 ? lu(RT0, '_lastRealPriceTs') : null, cx = null;
      try { var nc = navigator.connection; if (nc) cx = { type: txt(nc.type, 16) || null, effectif: txt(nc.effectiveType, 8) || null, rtt: num(nc.rtt, 0), debit: num(nc.downlink, 2), eco: nc.saveData === true }; } catch (e) {}
      return { hors: lu(window, '_auraNetOffline') === true, prixAge: (typeof pa === 'number' && pa > 0) ? Math.round((t - pa) / 1000) : null, connexion: cx };
    });
    sur(o, 'moteur', function () {
      var ch = lu(lu(window, 'AuraChrono'), 'state'), sim = lu(window, '_auraSimState'), veille = null;
      try { veille = { voulue: (typeof _wakeLockEnabled !== 'undefined') ? _wakeLockEnabled === true : null, tenue: (typeof _wakeLockSentinel !== 'undefined') ? !!_wakeLockSentinel : null }; } catch (e) {}
      return { battement: lu(sim, 'running') === true, chrono: (ch && typeof ch === 'object') ? { mode: txt(lu(ch, 'currentMode'), 12), enMarche: lu(ch, 'running') === true, secondes: copie(lu(ch, 'chronoSeconds'), 1) } : null, veille: veille };
    });
    sur(o, 'rec', function () {
      var r = SOURCES.rec(); if (!r || typeof r !== 'object') return undefined;
      return { lignes: num(lu(r, 'lines'), 0), vidages: num(lu(r, 'flushes'), 0), dernierVidage: num(lu(r, 'lastFlush'), 0), perdues: num(lu(r, 'lost'), 0),
        dernierFichier: txt(dernier(lu(r, 'files')), 160) || null, err: txt(lu(r, 'err'), 200) || null, warn: txt(lu(r, 'warn'), 200) || null };
    });
    sur(o, 'tl', function () {
      var s = SOURCES.tl(); if (!s || typeof s !== 'object') return undefined;
      var run = lu(s, 'running');
      return { dernierTick: num(lu(s, 'tick'), 0), running: run === true ? true : (run === false ? false : null), err: txt(lu(s, 'err'), 200) || null, errAt: num(lu(s, 'errAt'), 0) };
    });
    sur(o, 'arrets', function () { var th = SOURCES.throttle(); return Array.isArray(th) ? { n: th.length, derniers: copie(th.slice(0, 5), 2) } : undefined; });   // 00 les range du plus récent au plus ancien, 50 au plus
    return o;
  }
  function borne(p, ms) { return new Promise(function (ok) { var to = setTimeout(function () { ok(null); }, ms); p.then(function (v) { clearTimeout(to); ok(v); }, function () { clearTimeout(to); ok(null); }); }); }
  async function diag() {
    var o = etat(), S0 = liveS();
    sur(o, 'scripts', function () { return scripts(true); });
    if (S0) { o.perfLog = copie(champ(S0, 'perfLog'), 4, { n: 30 }); o.journal = copie(champ(S0, 'chainLog'), 2, { n: 60 }); o.erreursAvalees = copie(champ(S0, '_errStats'), 1); }
    o.recComplet = copie(SOURCES.rec(), 3, { n: 30 }); o.tlComplet = copie(SOURCES.tl(), 2); o.RT = copie(SOURCES.RT(), 1);
    o.lents = copie(SOURCES.lents(), 2, { n: 20 }); o.arretsComplets = copie(SOURCES.throttle(), 2, { n: 50 });
    try {
      var pm = performance.memory;
      o.appareil = { ua: txt(navigator.userAgent, 300), langue: txt(navigator.language, 20), ecran: [window.innerWidth, window.innerHeight, window.devicePixelRatio],
        memoireMo: pm ? [Math.round(pm.usedJSHeapSize / 1048576), Math.round(pm.totalJSHeapSize / 1048576), Math.round(pm.jsHeapSizeLimit / 1048576)] : null };
    } catch (e) {}
    try { if (navigator.storage && navigator.storage.estimate) { var q = await borne(navigator.storage.estimate(), 3000); if (q) o.stockage = { usage: num(q.usage, 0), quota: num(q.quota, 0) }; } } catch (e2) {}   // 3 s au plus : aucune attente du pont n'est sans fin
    return o;
  }

  window._pontLecture = Object.freeze({ V: LECT_V, sources: Object.keys(SOURCES), copie: copie, suivre: suivre, lire: lire, secrets: secrets, etat: etat, diag: diag });
})();
