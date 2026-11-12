// [GO SENTRY · 12/11/2026] VERSION 20261112b · chaque erreur de l'app part à Sentry (projet aura8/aura8-app, Europe), filtrée
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ▓▓▓ AURA8 — 00s-sentry.js ▓▓▓  chargé juste après 00 (avant 02), avec js/00r-sentry-sdk.min.js
//
// POURQUOI : une erreur sur la tablette était avalée en silence (00 _decErr : un compteur + une ligne
// « ⚠ Erreur avalée » au journal) et Claude ne la voyait qu'au backup suivant. Désormais elle arrive
// tout de suite dans Sentry, avec le fichier, la ligne et le token — lisible depuis n'importe quelle
// conversation (outil Sentry).
//
// CE QUI PART :
//   • les plantages (erreur non rattrapée, promesse rejetée sans gestion) — intégration globalHandlers ;
//   • les erreurs AVALÉES par 00 _decErr (niveau « warning », étiquette avalee=oui) ;
//   • une fois par token et par appareil, le message « AURA8 · Sentry branché · <token> » (preuve du tuyau).
//   Avec : type, message filtré, pile (fichier:ligne:colonne), token (release), mode à l'écran,
//   visibilité de la page, dernière opération chronométrée par 00 (sans paramètres), User-Agent.
//
// CE QUI NE PART JAMAIS (filtre « garde », appliqué à CHAQUE événement juste avant l'envoi) :
//   • aucun état de l'app (S, portefeuilles, positions), aucun localStorage, aucun cookie, aucune IP
//     (dataCollection.userInfo = false → Sentry n'infère pas l'IP) ; seuls les champs listés plus haut
//     sont recopiés, tout le reste de l'événement est jeté ;
//   • les secrets : clé CoinStats, jeton et chat Telegram (valeurs lues au moment de l'envoi), valeurs
//     des champs de S au nom de secret (17 _pontLecture.secrets), toute forme de jeton GitHub (le PAT du
//     pont, github_pat_…, sans que ce fichier connaisse sa clé de stockage) ou Telegram, « Bearer … », « clé=… » dans une adresse, toute chaîne de 32 caractères et plus ;
//   • les montants : tout nombre à virgule, tout nombre collé à $, €, USD, USDT, EUR, et tout nombre de
//     4 chiffres ou plus sont remplacés par « # » dans les textes (message, valeurs des étiquettes).
//   • les paramètres d'adresse (sauf ?v=<token> des fichiers de l'app).
//
// CE QUI NE CHANGE PAS : aucune intégration par défaut du SDK — rien n'enveloppe setTimeout, rAF,
// fetch, console ou addEventListener (00 les chronomètre déjà) ; pas de fil d'Ariane, pas de session,
// pas de trace, pas de replay. Error.stackTraceLimit est rendu à sa valeur d'avant (le SDK le met à 50,
// ce qui alourdirait la capture de pile que 00 fait à chaque setTimeout / then).
//
// GARDE-FOUS DE QUOTA (plan Developer gratuit : 5 000 erreurs / mois) :
//   • la même erreur (type + message filtré + fichier:ligne du haut de la pile) ne part qu'UNE fois par
//     chargement de la page ; • au plus PLAFOND_JOUR envois par jour UTC et par appareil
//     (localStorage aura_sentry_jour) = la limite posée côté serveur sur la clé (5 000 / 31, arrondi).
//   Couper Sentry à distance : désactiver la clé « tablette AURA8 » du projet (outil Sentry update_dsn).
//
// N'ENVOIE RIEN hors de la page servie par GitHub Pages (ramizxhixha-a11y.github.io) : bancs, rejeux et
// sondes restent muets, sauf si une sonde pose window.__auraSentryForce = true avant le chargement.
// Sur la tablette : window._auraSentry.etat() → { actif, raison, envoyes, refuses, dernierStatut, … }.
// ════════════════════════════════════════════════════════════════════════════════════════════════
(function _auraSentry() {
  'use strict';
  if (typeof window === 'undefined' || window._auraSentry) return;
  var V = '20261112b';
  var DSN = 'https://a4fbd89d24d60a40dc643590355d0def@o4512420537499648.ingest.de.sentry.io/4512420614570064';
  var HOTE = 'ramizxhixha-a11y.github.io';
  var PLAFOND_JOUR = 160;      // = limite de la clé côté serveur (rateLimit 160 / 86 400 s) = 5 000 / 31
  var LS_JOUR = 'aura_sentry_jour', LS_BRANCHE = 'aura_sentry_v';

  var st = { actif: false, raison: 'pas démarré', token: null, envoyes: 0, refuses: { doublon: 0, plafond: 0, filtre: 0 }, dernierStatut: null, erreurEnvoi: null };
  var vus = {};   // empreintes déjà envoyées pendant ce chargement

  // ── token : lu dans l'adresse de CE script (?v=…), le DOC_V du HTML n'existe qu'en fin de page ──
  function lireToken() {
    try {
      var cs = document.currentScript && document.currentScript.src;
      var m = cs && String(cs).match(/[?&]v=([0-9a-z]+)/);
      if (m) return m[1];
    } catch (e) {}
    return V;
  }

  // ── filtre ──
  var RE_JETON = /\b(github_pat_|gh[pousr]_)[A-Za-z0-9_]{6,}/g, RE_TG = /\bbot\d{5,}:[A-Za-z0-9_-]+/g;
  var RE_BEARER = /\b(bearer|basic|token)\s+[A-Za-z0-9._~+\/=-]{8,}/gi;
  var RE_PARAM = /((?:api[_-]?key|apikey|key|token|access[_-]?token|secret|signature|sig|pass(?:word)?|pwd|auth|sentry_key|chat_?id)=)[^&#\s"']+/gi;
  var RE_LONG = /[A-Za-z0-9+\/_=-]{32,}/g;
  var RE_URLQ = /(https?:\/\/[^\s"'?#]+)\?([^\s"'#]*)/g;
  var NB = '[-+\\u2212]?\\d(?:[\\d\\u00a0\\u202f ]*\\d)?(?:[.,]\\d+)?';   // un nombre : signe, espaces de milliers (jamais en bout), décimales
  var RE_DEV = new RegExp('(?:[$\\u20ac]\\s*)?' + NB + '\\s*(?:\\$|\\u20ac|T\\$|USDT|USD|EUR)(?![A-Za-z])|[$\\u20ac]\\s*' + NB, 'g');   // montant avec devise
  var RE_DEC = /[-+\u2212]?\d(?:[\d\u00a0\u202f ]*\d)?[.,]\d+/g;   // nombre à virgule
  var RE_GRAND = /\d{4,}/g;

  function lsLit(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function secretsConnus() {
    var L = [];
    var pousse = function (v) { v = (v == null) ? '' : String(v); if (v.length >= 6 && L.indexOf(v) < 0) L.push(v); };
    pousse(lsLit('aura_news_key'));   // le PAT du pont : jamais lu ici (seul 17b connaît sa clé de stockage) — RE_JETON masque toute forme github_pat_…
    try { var tg = JSON.parse(lsLit('aura_tg_cfg') || 'null'); if (tg && typeof tg === 'object') { pousse(tg.botToken); pousse(tg.chatId); } } catch (e) {}
    try { var P = window._pontLecture; if (P && typeof P.secrets === 'function') { var s = P.secrets(); for (var i = 0; i < s.length; i++) pousse(s[i]); } } catch (e) {}
    return L;
  }
  function sansSecret(t, L) {
    t = String(t);
    for (var i = 0; i < L.length; i++) if (t.indexOf(L[i]) >= 0) t = t.split(L[i]).join('[masqué]');
    return t.replace(RE_JETON, '$1[masqué]').replace(RE_TG, 'bot[masqué]').replace(RE_BEARER, '$1 [masqué]').replace(RE_PARAM, '$1[masqué]');
  }
  // adresse : secrets retirés, paramètres retirés sauf v=<token> (les fichiers de l'app sont publics sur Pages)
  function nettoieUrl(u, L) {
    return sansSecret(u, L).replace(RE_URLQ, function (_, base, q) {
      var v = String(q).match(/(?:^|&)v=([0-9a-z]+)(?:&|$)/);
      return base + (v ? '?v=' + v[1] : '');
    });
  }
  // texte libre (message, valeur d'étiquette) : adresses nettoyées, puis secrets longs, puis montants
  function nettoieTexte(t, L, max) {
    var tk = st.token || V;   // le token de l'app (ex. 20261112b) n'est pas un montant : gardé tel quel
    t = String(t).split(tk).map(function (p) {
      return nettoieUrl(p, L).replace(RE_LONG, '[masqué]').replace(RE_DEV, '#').replace(RE_DEC, '#').replace(RE_GRAND, '#');
    }).join(tk);
    return t.length > (max || 400) ? t.slice(0, max || 400) + '…' : t;
  }
  function nettoieCode(t, L, max) {   // noms de fonction, types : du code, pas de montant à craindre — secrets seulement
    t = sansSecret(t, L).replace(RE_LONG, '[masqué]');
    return t.length > (max || 200) ? t.slice(0, max || 200) : t;
  }

  function jourUTC() { return new Date().toISOString().slice(0, 10); }
  function compteJour() {
    var o = null; try { o = JSON.parse(lsLit(LS_JOUR) || 'null'); } catch (e) {}
    return (o && o.j === jourUTC() && typeof o.n === 'number') ? o.n : 0;
  }
  function noteJour(n) { try { localStorage.setItem(LS_JOUR, JSON.stringify({ j: jourUTC(), n: n })); } catch (e) {} }

  function frameHaut(ex) {
    var fr = ex && ex.stacktrace && ex.stacktrace.frames;
    if (!fr || !fr.length) return '';
    var f = fr[fr.length - 1] || {};
    return String(f.filename || f.abs_path || '').replace(/^.*\//, '').replace(/[?#].*$/, '') + ':' + (f.lineno || 0);
  }

  // LA GARDE : reconstruit un événement neuf à partir des seuls champs permis, filtrés. Rend null = rien ne part.
  function garde(ev) {
    try {
      if (!ev || typeof ev !== 'object') return null;
      var L = secretsConnus();
      var out = {};
      ['event_id', 'timestamp', 'platform', 'level', 'logger', 'release', 'environment', 'sdk'].forEach(function (k) { if (ev[k] !== undefined) out[k] = ev[k]; });
      if (ev.sdkProcessingMetadata) out.sdkProcessingMetadata = ev.sdkProcessingMetadata;
      var vals = ev.exception && Array.isArray(ev.exception.values) ? ev.exception.values : null;
      if (vals) {
        out.exception = { values: vals.slice(-5).map(function (x) {
          var y = { type: nettoieCode(x && x.type || 'Error', L, 120), value: nettoieTexte(x && x.value != null ? x.value : '', L, 400) };
          if (x && x.mechanism && typeof x.mechanism === 'object') y.mechanism = { type: nettoieCode(x.mechanism.type || 'generic', L, 60), handled: !!x.mechanism.handled };
          var fr = x && x.stacktrace && Array.isArray(x.stacktrace.frames) ? x.stacktrace.frames : null;
          if (fr) y.stacktrace = { frames: fr.slice(-30).map(function (f) {
            var g = {};
            if (f.filename) g.filename = nettoieUrl(f.filename, L);
            if (f.abs_path) g.abs_path = nettoieUrl(f.abs_path, L);
            if (f['function']) g['function'] = nettoieCode(f['function'], L, 120);
            if (typeof f.lineno === 'number') g.lineno = f.lineno;
            if (typeof f.colno === 'number') g.colno = f.colno;
            if (typeof f.in_app === 'boolean') g.in_app = f.in_app;
            return g;
          }) };
          return y;
        }) };
      }
      var msg = (typeof ev.message === 'string') ? ev.message : (ev.message && ev.message.formatted) || (ev.logentry && (ev.logentry.formatted || ev.logentry.message)) || null;
      if (msg != null) out.message = nettoieTexte(msg, L, 400);
      if (!out.exception && out.message == null) { st.refuses.filtre++; return null; }
      var tags = {};
      var ti = ev.tags || {};
      for (var k in ti) if (Object.prototype.hasOwnProperty.call(ti, k) && /^[a-z_]{1,32}$/.test(k)) tags[k] = nettoieTexte(String(ti[k]), L, 120);
      out.tags = tags;
      if (ev.request) {
        out.request = {};
        if (ev.request.url) out.request.url = nettoieUrl(ev.request.url, L);
        var h = ev.request.headers || {};
        var ua = h['User-Agent'] || h['user-agent'];
        if (ua) out.request.headers = { 'User-Agent': nettoieCode(ua, L, 300) };
      }
      // quota : une fois par empreinte et par chargement, PLAFOND_JOUR par jour
      var e0 = out.exception ? out.exception.values[out.exception.values.length - 1] : null;
      var empreinte = (e0 ? e0.type + '|' + e0.value + '|' + frameHaut(e0) : 'msg|' + out.message) + '|' + (tags.avalee || '');
      if (vus[empreinte]) { st.refuses.doublon++; return null; }
      var n = compteJour();
      if (n >= PLAFOND_JOUR) { st.refuses.plafond++; return null; }
      vus[empreinte] = 1; noteJour(n + 1); st.envoyes++;
      return out;
    } catch (e) { st.refuses.filtre++; return null; }   // dans le doute, rien ne part
  }

  function etiquettes(scope, avalee) {
    var S0 = null; try { S0 = (0, eval)('S'); } catch (e) {}
    var mode = S0 && S0.tradingMode;
    scope.setTag('mode', (mode === 'sim' || mode === 'paperReal' || mode === 'real') ? mode : 'inconnu');
    scope.setTag('avalee', avalee ? 'oui' : 'non');
    try { scope.setTag('page', String(document.visibilityState || '')); } catch (e) {}
    try { var op = window._auraLastOp; if (op && op.name) scope.setTag('derniere_op', String(op.name).slice(0, 80)); } catch (e) {}
  }

  var SDK = null, client = null;
  function demarrer() {
    st.token = lireToken();
    SDK = window.__auraSentrySdk;
    if (!SDK || typeof SDK.BrowserClient !== 'function') { st.raison = 'SDK absent'; return; }
    var force = window.__auraSentryForce === true;
    var hote = ''; try { hote = String(location.hostname || ''); } catch (e) {}
    if (hote !== HOTE && !force) { st.raison = 'hors de la page publiée (' + (hote || 'aucun hôte') + ')'; return; }
    var fetchApp = window.fetch;
    if (typeof fetchApp !== 'function') { st.raison = 'fetch absent'; return; }
    var transport = function (opts) {
      var t = SDK.makeFetchTransport(opts, function (url, o) { return fetchApp(url, o); });
      return {
        send: function (env) {
          return t.send(env).then(function (r) {
            st.dernierStatut = r && r.statusCode != null ? r.statusCode : null;
            if (st.dernierStatut >= 200 && st.dernierStatut < 300 && st.brancheEnAttente) { st.brancheEnAttente = false; try { localStorage.setItem(LS_BRANCHE, st.token); } catch (e) {} }
            return r;
          }, function (e) { st.erreurEnvoi = String(e && e.message || e).slice(0, 80); throw e; });
        },
        flush: function (ms) { return t.flush(ms); }
      };
    };
    var limite = Error.stackTraceLimit;
    try {
      client = new SDK.BrowserClient({
        dsn: DSN,
        release: 'aura8@' + st.token,
        environment: force ? 'sonde' : 'tablette',
        transport: transport,
        transportOptions: { bufferSize: 10 },
        stackParser: SDK.defaultStackParser,
        integrations: [
          SDK.globalHandlersIntegration({ onerror: true, onunhandledrejection: true }),
          SDK.linkedErrorsIntegration(),
          SDK.dedupeIntegration(),
          SDK.httpContextIntegration()
        ],
        sendClientReports: false,
        maxBreadcrumbs: 0,
        beforeBreadcrumb: function () { return null; },
        beforeSend: function (ev) { return garde(ev); },
        dataCollection: {
          userInfo: false, cookies: false,
          httpHeaders: { request: { allow: ['user-agent'] }, response: false },
          httpBodies: [], urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0,
          graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false },
          mcp: { inputs: false, outputs: false }, databaseQueryData: false, queues: false
        }
      });
      SDK.getCurrentScope().setClient(client);
      client.init();
      st.actif = true; st.raison = 'actif';
    } catch (e) {
      st.actif = false; st.raison = 'init : ' + String(e && e.message || e).slice(0, 80);
    } finally {
      Error.stackTraceLimit = limite;
    }
    if (!st.actif) return;
    // preuve du tuyau : une fois par token et par appareil (marquée seulement quand Sentry a répondu 2xx)
    if (lsLit(LS_BRANCHE) !== st.token) {
      st.brancheEnAttente = true;
      setTimeout(function () {
        try { SDK.withScope(function (scope) { etiquettes(scope, false); scope.setLevel('info'); SDK.captureMessage('AURA8 · Sentry branché · ' + st.token); }); } catch (e) {}
      }, 20000);
    }
  }

  // erreur avalée par 00 _decErr : même filtre, niveau warning, étiquette avalee=oui
  var vuesAvalees = {};   // tri AVANT de bâtir l'événement : une erreur avalée à chaque battement ne coûte qu'une lecture de clé
  function avalee(e) {
    if (!st.actif || !SDK) return;
    try {
      var cle = String((e && e.message) || e).slice(0, 120) + '|' + ((e && typeof e.stack === 'string') ? (e.stack.split('\n')[1] || '') : '');
      if (vuesAvalees[cle]) { st.refuses.doublon++; return; }
      vuesAvalees[cle] = 1;
    } catch (x) { return; }
    try {
      SDK.withScope(function (scope) {
        etiquettes(scope, true);
        scope.setLevel('warning');
        if (e && typeof e === 'object' && (e.stack || e.message)) SDK.captureException(e, { mechanism: { type: 'aura.decErr', handled: true } });
        else SDK.captureMessage('Erreur avalée : ' + String(e == null ? 'erreur inconnue' : e).slice(0, 200));
      });
    } catch (x) {}
  }

  try { demarrer(); } catch (e) { st.actif = false; st.raison = 'démarrage : ' + String(e && e.message || e).slice(0, 80); }

  // les plantages passent par globalHandlers : on y ajoute les mêmes étiquettes au moment de l'envoi
  if (st.actif) {
    try { SDK.getCurrentScope().addEventProcessor(function (ev) {
      if (!ev.tags || ev.tags.avalee === undefined) {
        var t = { tags: {} }, sc = { setTag: function (k, v) { t.tags[k] = v; } };
        etiquettes(sc, false);
        ev.tags = Object.assign({}, t.tags, ev.tags || {});
      }
      return ev;
    }); } catch (e) {}
  }

  window._auraSentry = Object.freeze({
    V: V,
    avalee: avalee,
    etat: function () { return JSON.parse(JSON.stringify(st)); },
    // pour les bancs : la garde et les filtres, sans envoyer
    _garde: garde, _nettoieTexte: function (t) { return nettoieTexte(t, secretsConnus()); }, _nettoieUrl: function (u) { return nettoieUrl(u, secretsConnus()); },
    _plafondJour: PLAFOND_JOUR
  });
})();
