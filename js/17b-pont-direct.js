// ═══ [PONT DIRECT · 11/10/2026] VERSION 20261011a · « go pont » (Rams, 11/10 00:25) ═══
// POURQUOI : Rams n'a pas de PC, une tablette c'est tout. Une session Claude ne voyait l'app vivante que par les backups du Drive et
// ses captures : aucun contrôle « sur la tablette » (window._recStatus, _tlStatus, version chargée) n'était possible sans console.
// Ce module ouvre un pont DIRECT par un dépôt GitHub PRIVÉ, séparé du code : ramizxhixha-a11y/aura-pont.
//   1) ÉTAT : toutes les 5 min l'app y réécrit etat.json (version chargée, mode à l'écran, modes en play, positions, réseau,
//      enregistreur, arrêts de la tablette, erreurs, et le plus long trou entre deux battements du pont) ;
//   2) DEMANDES : toutes les 15 s elle lit le dossier demandes/ ; une session y dépose demandes/<id>.json, l'app répond dans
//      reponses/<id>.json. LISTE FERMÉE : ping, etat, diag, lire, backup — rien d'autre n'existe ;
//   3) BACKUP sur demande : le snapshot de 09b1 (buildSnapshot), même enveloppe que l'export de 10h, dans backups/.
// LECTURE SEULE — le pont (ce fichier + 17-pont-lecture.js, qui lit l'app) :
//   • n'écrit RIEN dans S ; n'appelle de l'app que buildSnapshot (09b1 : la fonction de la sauvegarde automatique, telle quelle, pour
//     un backup) et _perfOp (08 : il s'annonce « pont:backup / diag / lire », comme toute opération lourde) ; n'en remplace ni n'en
//     enveloppe aucune ; jamais Math.random (le rejeu le sème), ni showToast (08 y compte S._silencedCount), ni _decErr (00 → S._errStats) ;
//   • n'ouvre ni ne ferme aucune position : aucune demande ne le peut, aucun chemin de code n'y mène ;
//   • n'exécute RIEN de ce qui vient du dépôt : une demande est du JSON validé (nom du fichier, id, date, commande de la liste) ;
//     ni eval, ni Function, ni HTML bâti avec ce qui est reçu ;
//   • TRACES INDIRECTES, dites : 00 et 08 chronomètrent le pont comme le reste de la page — un rappel de plus de 1 s serait noté par 00
//     (S.chainLog / S.perfLog.lent), un gel RÉEL pendant un backup le serait par 08 (S.perfLog.gels, sous le nom « pont:backup »).
//     00 pose son marqueur window._auraLastOp à chaque réponse réseau, celles du pont comprises : le pont le REMET tel qu'il l'a
//     trouvé, pour qu'un gel venu d'ailleurs ne lui soit pas attribué ;
//   • est TOTALEMENT INERTE sans PAT : ni minuterie, ni requête, ni écouteur d'erreurs — seulement sa ligne dans le panneau Outils.
// LE PAT (jeton GitHub) — ce pont REVIENT sur la phase 0 du 08/09 (« plus de push GitHub par jeton en localStorage ») : décision de
// Rams du 11/10, bornée ainsi :
//   • seul un PAT fine-grained (github_pat_…) est accepté ; un PAT classique (ghp_…, tous les dépôts) est refusé ;
//   • AVANT de le garder, puis à chaque lancement et une fois par jour : (a) aura-pont répond, il est PRIVÉ et sans GitHub Pages ;
//     (b) le PAT ne peut PAS écrire de fichier dans le dépôt du code : ce fichier-ci y est relu (il existe), puis une écriture
//     IMPOSSIBLE par construction (sha de 40 zéros) doit être refusée faute de droit (403 « Resource not accessible by personal access
//     token », ou 404) ; un 409 / 422 voudrait dire « droit d'écriture sur le code » : PAT refusé et retiré de l'appareil ; tout autre
//     cas : pont à l'arrêt, rien n'est tenté ; (c) l'écriture de etat.json dans aura-pont réussit.
//     LIMITES dites : c'est un garde-fou contre l'erreur probable (un PAT ouvert sur tous les dépôts), pas une preuve — il ne voit ni un
//     droit d'administration sur le code, ni les AUTRES dépôts du compte. Et tout script de la page (toute page servie par
//     ramizxhixha-a11y.github.io) peut lire localStorage : le PAT n'est pas plus à l'abri que la page elle-même ;
//   • le PAT vit dans localStorage « aura_pont_pat », hors snapshot et hors backups (comme aura_news_key, 10e7) ; il ne part QUE dans
//     l'en-tête Authorization vers api.github.com/repos/ramizxhixha-a11y/aura-pont (et l'unique adresse de contrôle du dépôt du
//     code), redirections interdites ; dernier filet : le PAT, tout texte en forme de jeton GitHub ou Telegram et la valeur des
//     secrets de S sont retirés de TOUT ce qui part ;
//   • débit borné : 60 écritures / h dont 12 gardées pour etat.json, comptées d'un rechargement à l'autre, 2 s entre deux, un backup
//     toutes les 2 min au plus ; 3 demandes par relevé, la plus récente d'abord ; une demande dont le NOM date de plus de 65 min n'est
//     même pas lue ; une demande ne sert qu'UNE fois (mémoire « aura_pont_mem ») et périme (15 min) ; toute attente est bornée ; pause
//     qui double jusqu'à 5 min sur erreur, 1 h sur un PAT refusé.
// POUR COUPER : bouton « Couper le pont » (Outils) → le PAT est effacé de l'appareil, tout s'arrête ; ou révoquer le PAT sur GitHub.
// (Le « Reset usine » n'efface que nexus* : il ne coupe PAS le pont.)
// PROTOCOLE et mode d'emploi côté session : PASSATION-AURA8.md (démarrage, point 21) et rejeu/pont.js.
(function () {
  'use strict';
  if (typeof window === 'undefined' || window._pont) return;

  var PONT_V = '20261011a', PROTO = 1;
  var API = 'https://api.github.com/repos/ramizxhixha-a11y/';
  var DEPOT = API + 'aura-pont', NOM_DEPOT = 'ramizxhixha-a11y/aura-pont';
  var SONDE = API + 'aura/contents/js/17b-pont-direct.js';   // CE fichier, dans le dépôt du code (banc P31) ; sa présence est relue avant l'écriture de contrôle
  var SHA0 = '0000000000000000000000000000000000000000';     // aucun fichier n'a ce sha : l'écriture de contrôle ne peut pas aboutir
  var LS_PAT = 'aura_pont_pat', LS_MEM = 'aura_pont_mem';
  var POLL_MS = 15000, ETAT_MS = 300000, BOOT_MS = 60000, VERIF_MS = 86400000;
  var TTL_S = 900, TTL_MAX_S = 3600, FUTUR_MS = 300000, FENETRE_MS = TTL_MAX_S * 1000 + FUTUR_MS;
  var ECRITS_H = 60, RESERVE = 12, ECART_MS = 2000, BACKUP_MS = 120000, PAR_RELEVE = 3, ESSAIS = 3, FAIT_MAX = 100;
  var DEM_MAX = 4096, REP_MAX = 400000;
  var T_GET = 20000, T_PUT = 90000, T_GZIP = 30000, PAUSE_MAX = 300000, PAUSE_LONGUE = 3600000, CHAMP_MS = 600000;
  var CMDS = ['ping', 'etat', 'diag', 'lire', 'backup'];
  var RE_NOM = /^(\d{8}-\d{6}-[a-z0-9]{4,12})\.json$/;
  var RE_PAT = /^github_pat_[A-Za-z0-9_]{20,243}$/;
  var RE_JETON = /\b(github_pat_|gh[pousr]_)[A-Za-z0-9_]{6,}/g, RE_TG = /\bbot\d{5,}:[A-Za-z0-9_-]+/g;   // un jeton, même coupé en route

  var st = { v: PONT_V, etat: 'coupe', msg: '', boot: Date.now(), verifAt: 0, etatAt: 0, releveAt: 0, n: 0, servis: 0, refus: 0, echecs: 0, suite: 0,
    ecritsH: 0, quota: null, err: null, errAt: 0, pauseUntil: 0, nErr: 0, tics: 0, ticMax: 0 };
  var pat = null, actif = false, iv = null, busy = false, gen = 0, etagDem = null, etatDu = 0, dernierTic = 0;
  var mem = null, memOk = true, errs = [], essais = {}, ecartes = {}, garde = null, ecoute = false, videA = null;
  var DOC = null;
  try { var cs = document.currentScript, mv = cs && /[?&]v=([0-9a-z]+)/.exec(cs.src || ''); DOC = mv ? mv[1] : null; } catch (e) {}

  // ── outils ──
  function now() { return Date.now(); }
  function txt(x, n) { return String(x === null || x === undefined ? '' : x).slice(0, n || 200); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function heure(ms) { if (!ms) return '—'; var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function horodate(ms) { var d = new Date(ms); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()); }
  function attendre(ms) { return new Promise(function (r) { setTimeout(r, Math.max(0, ms)); }); }
  function lsLit(k) { try { return localStorage.getItem(k); } catch (e) { return undefined; } }   // undefined : le stockage n'a pas répondu
  function lsGet(k) { var v = lsLit(k); return v === undefined ? null : v; }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function enLigne() { try { return navigator.onLine !== false; } catch (e) { return true; } }
  function incident(m) { st.err = m; st.errAt = now(); }
  function lecture() { var L = window._pontLecture; if (!L) throw new Error('17-pont-lecture.js absent'); return L; }
  function b64Octets(u8) {   // par blocs de 24 576 octets (multiple de 3 : les morceaux se concatènent sans bourrage au milieu)
    var out = [], PAS = 24576;
    for (var i = 0; i < u8.length; i += PAS) out.push(btoa(String.fromCharCode.apply(null, u8.subarray(i, i + PAS))));
    return out.join('');
  }
  function b64Texte(s) { return b64Octets(new TextEncoder().encode(s)); }
  function texteB64(b) {
    var bin = atob(String(b || '').replace(/\s+/g, '')), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(u8);
  }
  function gzip(texte) {   // compression du navigateur ; null si elle manque, échoue ou traîne plus de 30 s (le backup part alors tel quel)
    return new Promise(function (ok) {
      var to = setTimeout(function () { ok(null); }, T_GZIP), fin = function (v) { clearTimeout(to); ok(v); };
      try {
        if (typeof CompressionStream !== 'function' || typeof Blob !== 'function' || typeof Response !== 'function') return fin(null);
        var flux = new Blob([texte]).stream().pipeThrough(new CompressionStream('gzip'));
        new Response(flux).arrayBuffer().then(function (b) { fin(new Uint8Array(b)); }, function () { fin(null); });
      } catch (e) { fin(null); }
    });
  }
  // Dernier filet, sur TOUT texte qui part : le PAT, la valeur des secrets de S (17), et tout ce qui a la forme d'un jeton GitHub ou Telegram.
  function propre(t) {
    if (pat && t.indexOf(pat) >= 0) t = t.split(pat).join('[PAT masqué]');
    var L = []; try { L = lecture().secrets(); } catch (e) {}
    for (var i = 0; i < L.length; i++) if (t.indexOf(L[i]) >= 0) t = t.split(L[i]).join('[masqué]');
    return t.replace(RE_JETON, '$1[masqué]').replace(RE_TG, 'bot[masqué]');
  }

  // ── mémoire du pont (hors S, hors snapshot) : installation, demandes déjà servies, dernier état (heure, sha), écritures de l'heure, dernier backup ──
  // relire : au début de chaque battement la mémoire est RELUE (un autre onglet a pu servir une demande ou écrire) — sur place, pour que les
  // références tenues restent bonnes ; jamais si la dernière sauvegarde a échoué (ce qui est en mémoire serait plus juste que le stockage).
  function memoire(relire) {
    if (mem && (!relire || !memOk)) return mem;
    var b = lsLit(LS_MEM); if (mem && b === undefined) return mem;   // stockage muet : on garde ce qu'on a
    var m = null; try { m = JSON.parse(b || 'null'); } catch (e) {}
    if (!m || typeof m !== 'object' || Array.isArray(m)) m = {};
    var t = now(), passe = function (x) { x = Number(x); return (x > 0 && x <= t) ? x : 0; };   // une date du futur (horloge reculée) ne compte pas
    var n = { inst: (typeof m.inst === 'string' && /^[a-z0-9]{6,16}$/.test(m.inst)) ? m.inst : (mem ? mem.inst : null),
      fait: (Array.isArray(m.fait) ? m.fait : []).filter(function (x) { return typeof x === 'string' && x.length <= 40; }).slice(-FAIT_MAX),
      etatAt: passe(m.etatAt), sha: (typeof m.sha === 'string' && /^[0-9a-f]{40}$/.test(m.sha)) ? m.sha : null, backupAt: passe(m.backupAt),
      ecrits: (Array.isArray(m.ecrits) ? m.ecrits : []).map(passe).filter(function (x) { return x && t - x < 3600000; }).slice(-ECRITS_H) };
    if (!mem) mem = n; else Object.keys(n).forEach(function (k) { mem[k] = n[k]; });
    return mem;
  }
  function memSauve() { memOk = lsSet(LS_MEM, JSON.stringify(mem)); if (!memOk) incident('le stockage de l\'appareil refuse l\'écriture : la mémoire du pont n\'est pas gardée'); }
  function fini(id) { var m = memoire(); if (m.fait.indexOf(id) < 0) { m.fait.push(id); if (m.fait.length > FAIT_MAX) m.fait.splice(0, m.fait.length - FAIT_MAX); } delete essais[id]; memSauve(); }

  // ── ce qui part : la lecture de l'app (17) + l'état du pont lui-même ──
  function entete(a) {
    var o = { pont: PROTO, v: PONT_V, doc: DOC, t: a.t, iso: a.iso, inst: memoire().inst, boot: st.boot, n: st.n };
    Object.keys(a).forEach(function (k) { if (!(k in o)) o[k] = a[k]; });
    o.erreurs = { n: st.nErr, dernieres: errs.slice(-5) };
    // tics / ticMax : battements du pont (un toutes les 15 s) depuis l'état d'avant, et le plus long trou entre deux — une page bridée ou endormie se voit là
    o.etatPont = { etat: st.etat, servis: st.servis, refus: st.refus, echecs: st.echecs, ecritsH: memoire().ecrits.length, quota: st.quota, err: st.err, errAt: st.errAt,
      releveAt: st.releveAt, pauseUntil: st.pauseUntil, tics: st.tics, ticMax: st.ticMax };
    return o;
  }
  function construireEtat() {   // une lecture qui échoue n'empêche pas l'état de partir : il le dit
    var a; try { a = lecture().etat(); } catch (e) { a = { t: now(), iso: new Date().toISOString(), _err: 'lecture : ' + txt(e && e.message, 160) }; }
    return entete(a);
  }
  async function construireDiag() { var o = entete(await lecture().diag()); o.erreursPage = errs.slice(); return o; }

  // ── GitHub : deux adresses possibles, pas une de plus ; toute requête finit (réponse, erreur ou délai) ──
  function gh(jeton, methode, url, corps, etag, delai) {
    if (!jeton) return Promise.reject(new Error('pont coupé'));
    if (url !== DEPOT && url.indexOf(DEPOT + '/') !== 0 && url !== SONDE) return Promise.reject(new Error('adresse hors du pont'));
    var h = { 'Authorization': 'Bearer ' + jeton, 'Accept': 'application/vnd.github+json' };
    if (etag) h['If-None-Match'] = etag;
    var opt = { method: methode, headers: h, cache: 'no-store', redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer' };
    if (corps !== undefined) { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(corps); }
    var ac = (typeof AbortController === 'function') ? new AbortController() : null; if (ac) opt.signal = ac.signal;
    var avant, marque = 'fetch ' + url.replace(/^https?:\/\//, '').split('?')[0].slice(0, 60);   // le nom que 00 donnera à cette requête
    try { avant = window._auraLastOp; } catch (e) {}
    return new Promise(function (oui, rate) {
      var to = setTimeout(function () { to = null; try { if (ac) ac.abort(); } catch (e) {} rate(new Error('délai dépassé')); }, delai || T_GET);
      var fin = function () { if (to) { clearTimeout(to); to = null; } }, envoi;
      try { envoi = fetch(url, opt); } catch (e) { fin(); rate(e); return; }
      envoi.then(function (r) {
        try { var op = window._auraLastOp; if (op && op !== avant && op.name === marque) window._auraLastOp = avant; } catch (e) {}   // le marqueur de 00, remis tel qu'il était
        var out = { st: r.status, etag: null, j: null, attente: 0 };
        try {
          out.etag = r.headers.get('etag');
          var ra = Number(r.headers.get('retry-after')), rem = r.headers.get('x-ratelimit-remaining'), rst = Number(r.headers.get('x-ratelimit-reset'));
          if (ra > 0) out.attente = ra * 1000; else if (rem === '0' && rst > 0) out.attente = Math.max(1000, rst * 1000 - now());
          if (rem !== null && rem !== '' && isFinite(Number(rem))) st.quota = Number(rem);
        } catch (e) {}
        if (r.status === 304 || r.status === 204) return out;
        return r.text().then(function (t) { try { out.j = JSON.parse(t); } catch (e) { out.j = null; } return out; }, function () { return out; });
      }).then(function (o) { fin(); oui(o); }, function (e) { fin(); rate(e); });
    });
  }
  function ghMsg(r) { return (r && r.plein) ? r.j.message : (r && r.st ? 'GitHub ' + r.st : 'réseau') + ((r && r.j && r.j.message) ? ' « ' + txt(r.j.message, 110) + ' »' : ''); }
  function bon(r) { return !!r && (r.st === 200 || r.st === 201); }
  function non(code, msg, attente) { return { ok: false, code: code, msg: msg, attente: attente || 0 }; }

  // ── écritures : une à la fois, espacées, comptées (le compte survit au rechargement de la page) ──
  function place(n, reserve) { var m = memoire(), t = now(); m.ecrits = m.ecrits.filter(function (x) { return x <= t && t - x < 3600000; }); st.ecritsH = m.ecrits.length; return ECRITS_H - (reserve || 0) - m.ecrits.length >= n; }
  function plein() { return { st: 0, plein: true, j: { message: 'quota d\'écritures du pont atteint (' + ECRITS_H + ' / h, dont ' + RESERVE + ' gardées pour etat.json)' } }; }
  async function ecart() { var e = memoire().ecrits, d = e.length ? Math.min(ECART_MS, ECART_MS - (now() - e[e.length - 1])) : 0; if (d > 0) await attendre(d); }
  function compter() { var m = memoire(); m.ecrits.push(now()); st.ecritsH = m.ecrits.length; memSauve(); }
  async function ecrire(chemin, contenu, sha, message, dejaB64, reserve) {
    if (!place(1, reserve)) return plein();
    await ecart();
    var corps = { message: message, content: dejaB64 ? contenu : b64Texte(contenu) }; if (sha) corps.sha = sha;
    compter();
    return gh(pat, 'PUT', DEPOT + chemin, corps, null, T_PUT);
  }

  // Le PAT est-il acceptable ? (a) fine-grained, (b) aura-pont visible, PRIVÉ, sans Pages, (c) aucune écriture de fichier possible dans le dépôt du code.
  async function verifier(jeton) {
    if (!RE_PAT.test(jeton)) return non('format', /^gh[pousr]_/.test(jeton) ? 'PAT classique refusé (il ouvre tous tes dépôts) : crée un PAT fine-grained limité à aura-pont' : 'ce n\'est pas un PAT fine-grained (il commence par github_pat_)');
    var r = await gh(jeton, 'GET', DEPOT, undefined, null, T_GET);
    if (r.st === 401) return non('401', 'PAT refusé par GitHub (mal collé, expiré ou révoqué) · ' + ghMsg(r));
    if (r.attente && (r.st === 403 || r.st === 429)) return non('limite', 'GitHub demande d\'attendre · ' + ghMsg(r), r.attente);
    if (r.st === 404 || r.st === 403) return non('acces', 'ce PAT ne voit pas aura-pont (dépôt non sélectionné, ou PAT d\'un autre compte) · ' + ghMsg(r));
    if (r.st !== 200 || !r.j) return non('reseau', 'aura-pont ne répond pas · ' + ghMsg(r));
    if (String(r.j.full_name || '').toLowerCase() !== NOM_DEPOT) return non('acces', 'dépôt inattendu : ' + txt(r.j.full_name, 60));
    if (r.j.private !== true) return non('public', 'aura-pont est PUBLIC : passe-le en privé sur GitHub, puis recommence');
    if (r.j.has_pages === true) return non('public', 'aura-pont a GitHub Pages activé (son contenu serait public) : désactive Pages sur ce dépôt, puis recommence');
    if (pat !== jeton) return non('coupe', 'pont coupé');   // « Couper » pendant le contrôle : les requêtes suivantes ne partent pas
    // Le fichier-témoin existe-t-il dans le dépôt du code ? S'il n'est pas lu, un « 404 » à l'écriture ne prouvera rien (seul le 403 explicite comptera).
    var e = await gh(jeton, 'GET', SONDE, undefined, null, T_GET), temoin = e.st === 200 && !!e.j && e.j.type === 'file';
    if (e.st === 401) return non('401', 'PAT refusé par GitHub · ' + ghMsg(e));
    if (e.attente && (e.st === 403 || e.st === 429)) return non('limite', 'GitHub demande d\'attendre · ' + ghMsg(e), e.attente);
    if (pat !== jeton) return non('coupe', 'pont coupé');
    if (!place(1)) return non('limite', plein().j.message, 60000);
    await ecart(); compter();   // une écriture, même refusée : elle compte et s'espace comme les autres
    // Écriture impossible par construction (sha de 40 zéros) : seul le MOTIF du refus compte. Rien n'est écrit, quel que soit le PAT.
    var s = await gh(jeton, 'PUT', SONDE, { message: 'sonde du pont direct : refus attendu, rien n\'est écrit', content: 'c29uZGU=', sha: SHA0 }, null, T_GET);
    if (s.st === 401) return non('401', 'PAT refusé par GitHub · ' + ghMsg(s));
    if (s.st === 409 || s.st === 422 || s.st === 200 || s.st === 201) return non('large', 'ce PAT peut ÉCRIRE dans le dépôt du code (aura) : refusé. Recrée-le avec « Only select repositories » → aura-pont seul · ' + ghMsg(s));
    if (s.st === 403 && !s.attente && /not accessible by personal access token/i.test((s.j && s.j.message) || '')) return { ok: true };
    if (s.st === 404 && temoin) return { ok: true };   // le fichier existe (lu à l'instant) : ce 404 est un refus d'accès
    return non(s.attente ? 'limite' : 'reseau', 'contrôle du dépôt du code non concluant · ' + ghMsg(s) + (temoin ? '' : ' · fichier-témoin non lu (' + ghMsg(e) + ')'), s.attente);
  }
  async function envoyerEtat() {
    if (!place(1)) return plein();
    await ecart();   // l'état est bâti APRÈS l'attente : ce qui part est l'état du moment de l'écriture
    var o = construireEtat(), texte = propre(JSON.stringify(o)), msg = 'etat ' + o.iso + ' · cycle ' + (o.cycle || 0) + ' · doc ' + (DOC || '?');
    var m = memoire(), r = await ecrire('/contents/etat.json', texte, m.sha, msg);
    if (r.st === 409 || r.st === 422 || (r.st === 404 && m.sha)) {   // sha absent ou dépassé, ou fichier retiré du dépôt : on le relit, une fois
      var g = await gh(pat, 'GET', DEPOT + '/contents/etat.json', undefined, null, T_GET);
      if (g.st !== 200 && g.st !== 404) return g;
      m.sha = (g.st === 200 && g.j && typeof g.j.sha === 'string') ? g.j.sha : null;
      r = await ecrire('/contents/etat.json', texte, m.sha, msg);
    }
    if (bon(r)) {
      m.sha = (r.j && r.j.content && typeof r.j.content.sha === 'string') ? r.j.content.sha : null;
      st.etatAt = now(); st.n++; st.tics = 0; st.ticMax = 0; etatDu = st.etatAt + ETAT_MS; m.etatAt = st.etatAt; memSauve();
    }
    return r;
  }

  // ── demandes : liste fermée ──
  function dateDuNom(id) { var m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)-/.exec(id); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN; }   // le nom porte la date (UTC) du dépôt
  function valider(d, id, t) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return 'demande : un objet est attendu';
    if (d.id !== id) return 'demande : id différent du nom du fichier';
    if (typeof d.t !== 'number' || !isFinite(d.t)) return 'demande : t (ms) manquant';
    var ttl = Math.min(TTL_MAX_S, Math.max(1, Number(d.ttl) || TTL_S)) * 1000, age = t - d.t;
    if (age > ttl) return 'demande périmée (' + Math.round(age / 1000) + ' s, validité ' + ttl / 1000 + ' s) · horloge de la tablette ' + new Date(t).toISOString();
    if (age < -FUTUR_MS) return 'demande datée du futur (' + Math.round(-age / 1000) + ' s) · horloge de la tablette ' + new Date(t).toISOString();
    if (typeof d.cmd !== 'string' || CMDS.indexOf(d.cmd) < 0) return 'commande inconnue (liste fermée : ' + CMDS.join(', ') + ')';
    if (d.args !== undefined && (d.args === null || typeof d.args !== 'object' || Array.isArray(d.args))) return 'demande : args doit être un objet';
    return null;
  }
  function annoncer(cmd) { try { var f = window._perfOp; if (typeof f === 'function') f('pont:' + cmd); } catch (e) {} }   // comme toute opération lourde de l'app (08)
  async function backup() {
    var t = now(), m = memoire();
    if (m.backupAt && t - m.backupAt < BACKUP_MS) return { _err: 'un backup toutes les ' + BACKUP_MS / 60000 + ' min au plus' };
    var bs = null; try { bs = window.buildSnapshot; } catch (e) {}
    if (typeof bs !== 'function' || window._stateReady !== true) return { _err: 'état non prêt' };
    var snap = bs(); if (!snap) return { _err: 'état non prêt' };
    var cyc = typeof snap.cycle === 'number' ? snap.cycle : null, sauve = snap.savedAt || null;
    // Même enveloppe que l'export de 10h ; snapshot et texte dans la MÊME tâche (le snapshot garde des références vivantes).
    var json = propre(JSON.stringify({ _type: 'aura_guardian_full', version: 'aura-embed-1', savedAt: new Date(t).toISOString(), auraCycle: cyc, auraSource: 'aura-pont', auraSavedAt: sauve, aura: snap, guardian: null }));
    snap = null;
    await attendre(0);
    var gz = await gzip(json), nom = 'aura_guardian_full_' + horodate(t) + (gz ? '.json.gz' : '.json');
    await attendre(0);
    var b = gz ? b64Octets(gz) : b64Texte(json), car = json.length; json = null;
    var w = await ecrire('/contents/backups/' + nom, b, null, 'backup ' + nom + ' · cycle ' + (cyc === null ? '?' : cyc), true, RESERVE);
    if (!bon(w)) return { _err: 'backup non écrit · ' + ghMsg(w) };
    m.backupAt = now(); memSauve();   // le délai de 2 min ne court que d'un backup ÉCRIT
    return { fichier: 'backups/' + nom, gz: !!gz, caracteres: car, octetsEnvoyes: gz ? gz.length : null, cycle: cyc, savedAt: sauve, sha: (w.j && w.j.content && w.j.content.sha) || null };
  }
  async function executer(cmd, args) {
    switch (cmd) {
      case 'ping': return { pong: true };
      case 'etat': return construireEtat();
      case 'diag': annoncer(cmd); return construireDiag();
      case 'lire': annoncer(cmd); return lecture().lire(args);
      case 'backup': annoncer(cmd); return backup();
    }
    return { _err: 'commande inconnue' };
  }
  function dejaLa(w) { return w.st === 422 && /sha/i.test((w.j && w.j.message) || ''); }   // « "sha" wasn't supplied » : le fichier de la réponse existe déjà
  // true : la demande est classée (servie, refusée, écartée ou retirée) ; false : à reprendre au prochain relevé.
  async function traiter(nom) {
    var id = RE_NOM.exec(nom)[1], t0 = now(), texte, cmd, ok;
    if (!place(1, RESERVE)) { incident(plein().j.message); return false; }   // plus de place pour les demandes cette heure-ci : elle attend, rien n'est lu ni exécuté
    if (garde && garde.id === id) { texte = garde.texte; cmd = garde.cmd; ok = garde.ok; }   // réponse bâtie au tour d'avant, écriture ratée : rien n'est exécuté deux fois
    else {
      garde = null;
      var g = await gh(pat, 'GET', DEPOT + '/contents/demandes/' + nom, undefined, null, T_GET);
      if (g.st === 404) return true;   // retirée entre-temps
      if (g.st !== 200) { echec(g); return false; }
      if (!g.j || typeof g.j.content !== 'string') {   // ni un fichier ni du JSON (sous-module, corps illisible) : écartée après 3 lectures, sans bloquer les autres
        if ((essais[id] = (essais[id] || 0) + 1) >= ESSAIS) { ecartes[id] = 1; delete essais[id]; return true; }
        incident('demande ' + id + ' illisible'); return false;
      }
      var d = null, pourquoi = null, rep;
      try { var brut = texteB64(g.j.content); if (brut.length > DEM_MAX) pourquoi = 'demande trop longue'; else d = JSON.parse(brut); } catch (e) { pourquoi = 'demande : JSON illisible'; }
      if (!pourquoi) pourquoi = valider(d, id, t0);
      cmd = (d && typeof d.cmd === 'string' && CMDS.indexOf(d.cmd) >= 0) ? d.cmd : null; rep = { id: id, cmd: cmd, ok: false };
      if (pourquoi) rep.err = pourquoi;
      else if (cmd === 'backup' && !place(2, RESERVE)) { incident(plein().j.message); return false; }
      else {
        try { var r = await executer(cmd, d.args || {}); if (r && r._err) { rep.err = r._err; if (r.cles) rep.cles = r.cles; } else { rep.ok = true; rep.r = r; } }
        catch (e2) { rep.err = 'erreur : ' + txt(e2 && e2.message, 200); }
      }
      rep.t = now(); rep.iso = new Date(rep.t).toISOString(); rep.ms = rep.t - t0; rep.doc = DOC; rep.v = PONT_V; rep.inst = memoire().inst;
      texte = propre(JSON.stringify(rep)); ok = rep.ok;
      if (texte.length > REP_MAX) { ok = false; texte = propre(JSON.stringify({ id: id, cmd: cmd, ok: false, err: 'réponse trop longue (' + texte.length + ' caractères, ' + REP_MAX + ' au plus) : réduis prof ou n', t: rep.t, iso: rep.iso, ms: rep.ms, doc: DOC, v: PONT_V, inst: rep.inst })); }
    }
    garde = { id: id, texte: texte, cmd: cmd, ok: ok };   // gardée AVANT l'écriture : si elle échoue (ou si le réseau lâche), la même réponse repartira
    var w = await ecrire('/contents/reponses/' + id + '.json', texte, null, 'reponse ' + id + ' · ' + (cmd || 'refus') + (ok ? '' : ' · refus'), false, RESERVE);
    if (bon(w) || dejaLa(w)) { garde = null; fini(id); if (ok) st.servis++; else st.refus++; return true; }
    if (w.plein) return false;
    echec(w);
    if ((essais[id] = (essais[id] || 0) + 1) < ESSAIS) return false;
    garde = null; fini(id); st.refus++; return true;   // trois écritures ratées : classée, pour ne pas tourner en rond
  }
  async function relever() {
    var r = await gh(pat, 'GET', DEPOT + '/contents/demandes', undefined, etagDem, T_GET);
    st.releveAt = now();
    if (r.st === 304) return true;
    if (r.st === 404) { etagDem = null; return true; }   // dossier vide
    if (r.st !== 200 || !Array.isArray(r.j)) { echec(r); return false; }
    var t = now(), fait = memoire().fait, noms = [], futur = false;
    r.j.forEach(function (e) {
      var m = (e && e.type === 'file' && typeof e.name === 'string') ? RE_NOM.exec(e.name) : null;
      if (!m || !(Number(e.size) <= DEM_MAX) || fait.indexOf(m[1]) >= 0 || ecartes[m[1]]) return;
      var age = t - dateDuNom(m[1]);
      if (age < -FUTUR_MS) futur = true;   // datée du futur : elle sera relue plus tard
      else if (age <= FENETRE_MS) noms.push(e.name);   // au-delà de 65 min elle ne peut plus être valide : ni lue, ni retenue, ni répondue
    });
    noms.sort().reverse();   // la plus récente d'abord : une demande fraîche n'attend pas derrière des demandes en retard
    var reste = noms.length, ok = true;
    for (var i = 0; ok && i < noms.length && i < PAR_RELEVE; i++) { if (await traiter(noms[i])) reste--; else ok = false; }
    etagDem = (ok && reste === 0 && !futur) ? r.etag : null;   // tant qu'une demande attend, la liste est relue en entier
    return ok;
  }

  // ── le battement du pont ──
  function echec(r) {
    if (!actif) return;   // coupé entre-temps : l'état « coupé » reste
    st.echecs++; st.suite++; incident(ghMsg(r));
    var p;
    if (r && r.st === 401) { st.etat = 'suspendu'; st.verifAt = 0; p = PAUSE_LONGUE; }
    else if (r && r.attente) p = Math.min(PAUSE_LONGUE, Math.max(60000, r.attente));
    else if (r && (r.st === 403 || r.st === 404)) { st.etat = 'suspendu'; st.verifAt = 0; p = PAUSE_MAX; }   // accès perdu ? le contrôle du PAT est refait
    else p = Math.min(PAUSE_MAX, POLL_MS * Math.pow(2, Math.min(st.suite, 5)));
    st.pauseUntil = now() + p;
  }
  function verdict(v) {
    if (!actif) return;
    incident(v.msg);
    if (v.code === 'large' || v.code === 'public' || v.code === 'format') { couper('⛔ ' + v.msg); return; }   // refus définitif : le PAT quitte l'appareil
    st.etat = 'suspendu'; st.msg = v.msg; st.suite++; st.echecs++;
    st.pauseUntil = now() + ((v.code === '401' || v.code === 'acces') ? PAUSE_LONGUE : (v.attente ? Math.min(PAUSE_LONGUE, Math.max(60000, v.attente)) : Math.min(PAUSE_MAX, POLL_MS * Math.pow(2, Math.min(st.suite, 5)))));
  }
  async function cycle() {
    if (busy || !actif || !pat) return;
    var t = now();
    if (st.pauseUntil > t + PAUSE_LONGUE) st.pauseUntil = t + PAUSE_LONGUE;   // horloge reculée : jamais plus d'une heure d'attente,
    if (etatDu > t + ETAT_MS) etatDu = t + ETAT_MS;                           // ni plus de 5 min sans état
    if (t < st.pauseUntil || !enLigne()) { peindre(); return; }
    var s = lsLit(LS_PAT);   // « Couper » dans un autre onglet arrête celui-ci aussi
    if (s !== undefined && s !== pat) { couper(s ? 'arrêté ici : le PAT a changé dans un autre onglet (recharge la page)' : 'coupé depuis un autre onglet', true); return; }
    memoire(true);
    busy = true;
    try {
      if (!st.verifAt || t - st.verifAt >= VERIF_MS || t < st.verifAt) {
        var v = await verifier(pat);
        if (!v.ok) { verdict(v); return; }
        st.verifAt = now();
      }
      if (now() >= etatDu) {
        var r = await envoyerEtat();
        if (!bon(r)) {
          incident('etat.json non écrit · ' + ghMsg(r));
          if (!r.plein && r.st !== 409 && r.st !== 422) { echec(r); return; }   // réseau, accès perdu (401, 403, 404), GitHub en panne : tout attend
          etatDu = now() + ETAT_MS;   // etat.json seul est en cause (409 / 422 même après relecture), ou le quota : nouvel essai dans 5 min, les demandes sont servies quand même
        }
      }
      if (!(await relever()) || !actif) return;
      st.suite = 0; st.etat = 'actif'; st.msg = '';
    } catch (e) { echec({ st: 0, j: { message: txt(e && e.message, 110) } }); }
    finally { busy = false; peindre(); }
  }
  function tic() { var t = now(), e = t - dernierTic; dernierTic = t; st.tics++; if (e > st.ticMax) st.ticMax = e; cycle(); }
  function noterErr(e) { noter(e && e.message, e && e.filename, e && e.lineno); }
  function noterRej(e) { var r = e && e.reason; noter('promesse : ' + txt((r && r.message) || r, 180), null, null); }
  function noter(m, f, l) {
    errs.push({ t: now(), m: txt(m, 200), ou: f ? txt(String(f).replace(/^.*\//, '').replace(/[?#].*$/, ''), 60) + (l ? ':' + l : '') : null });
    if (errs.length > 30) errs.splice(0, errs.length - 30);
    st.nErr++;
  }
  function ecouter() { if (ecoute) return; ecoute = true; try { window.addEventListener('error', noterErr); window.addEventListener('unhandledrejection', noterRej); } catch (e) {} }
  function sourd() { if (!ecoute) return; ecoute = false; try { window.removeEventListener('error', noterErr); window.removeEventListener('unhandledrejection', noterRej); } catch (e) {} }
  function demarrer() { actif = true; ecouter(); if (!memoire().inst) { mem.inst = now().toString(36); memSauve(); } if (!iv) { dernierTic = now(); iv = setInterval(tic, POLL_MS); } }
  function couper(msg, sansEffacer) {   // sansEffacer : arrêt de CET onglet seulement (le PAT qu'un autre onglet vient de poser n'est pas à lui)
    gen++; actif = false; pat = null; if (!sansEffacer) lsDel(LS_PAT);
    if (videA) { clearTimeout(videA); videA = null; }
    if (iv) { clearInterval(iv); iv = null; }
    sourd(); etagDem = null; essais = {}; ecartes = {}; garde = null;
    st.etat = 'coupe'; st.msg = msg || 'coupé · le PAT est effacé de cet appareil'; st.verifAt = 0; st.pauseUntil = 0; st.suite = 0;
    var c = el('pontDirectPat'); if (c) c.value = '';
    peindre();
  }
  // Collage du PAT : il n'est gardé qu'après les contrôles (fine-grained, aura-pont privé, aucune écriture possible dans le code) ET une écriture réussie.
  async function activer() {
    if (actif) return;
    if (busy) { st.msg = 'encore occupé : réessaie dans quelques secondes'; peindre(); return; }
    var c = el('pontDirectPat'), brut = c ? String(c.value || '').replace(/\s+/g, '') : '';
    if (!brut) { st.msg = 'colle d\'abord le PAT du dépôt aura-pont'; peindre(); return; }
    busy = true; st.etat = 'verif'; st.msg = ''; peindre();
    pat = brut;   // en mémoire seulement, le temps des contrôles
    var ok = false, laisse = false, g = ++gen;
    try {
      var v = await verifier(brut);
      if (g !== gen) return;   // « Couper » pendant le contrôle : on s'arrête là
      if (!v.ok) { st.msg = '⛔ ' + v.msg; laisse = (v.code === 'reseau' || v.code === 'limite'); return; }
      if (!memoire().inst) mem.inst = now().toString(36);
      var r = await envoyerEtat();
      if (g !== gen) return;   // « Couper » pendant l'écriture : le PAT n'est pas gardé
      if (!bon(r)) { st.msg = '⛔ écriture refusée dans aura-pont (permission Contents : Read and write ?) · ' + ghMsg(r); laisse = !r.st; return; }
      if (!lsSet(LS_PAT, brut)) { st.msg = '⛔ le stockage de l\'appareil refuse l\'écriture'; return; }
      ok = true; st.verifAt = now(); st.suite = 0; st.pauseUntil = 0; st.etat = 'actif'; st.msg = '';
      demarrer();
    } catch (e) { if (g === gen) { st.msg = '⛔ réseau : ' + txt(e && e.message, 120) + ' — réessaie'; laisse = true; } }
    finally {
      if (!ok && g === gen) { pat = null; st.etat = 'coupe'; }
      if (videA) { clearTimeout(videA); videA = null; }
      // laissé dans le champ seulement si le réseau a manqué (inutile de le recoller), et 10 min au plus
      if (c) { if (laisse && g === gen) videA = setTimeout(function () { videA = null; try { if (!busy) c.value = ''; } catch (e) {} }, CHAMP_MS); else c.value = ''; }
      busy = false; peindre();
    }
  }

  // ── la ligne du panneau Outils ──
  function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function peindre() {
    try {
      var e = el('pontDirectEtat'); if (!e) return;
      var t, quand = now();
      if (st.etat === 'verif') t = 'contrôle du PAT…' + (st.msg ? ' · ' + st.msg : '') + ((actif && st.err) ? ' · ' + st.err + ' · nouvel essai ' + heure(st.pauseUntil) : '');
      else if (st.etat === 'actif') t = '✅ actif · état envoyé ' + heure(st.etatAt) + ' · ' + st.servis + ' demande(s) servie(s)'
        + (!enLigne() ? ' · hors ligne : le pont attend le réseau' : (quand < st.pauseUntil ? ' · en pause jusqu\'à ' + heure(st.pauseUntil) : ''))
        + ((st.err && quand - st.errAt < 3600000) ? ' · dernier incident ' + heure(st.errAt) + ' : ' + st.err : '');
      else if (st.etat === 'suspendu') t = '⏸ suspendu · ' + (st.msg || st.err || '') + ' · nouvel essai ' + heure(st.pauseUntil);
      else t = st.msg || 'coupé · colle le PAT du dépôt aura-pont, puis Activer';
      e.textContent = t;
      var a = el('pontDirectSaisie'), b = el('pontDirectActions');
      if (a) a.style.display = actif ? 'none' : 'flex';
      if (b) b.style.display = actif ? 'flex' : 'none';
    } catch (err) {}
  }
  function poser() {
    try {
      if (el('pontDirectBar')) return;
      var tabs = document.querySelector('#outilsPanel .outils-tabs'); if (!tabs) return;
      var bar = document.createElement('div'), BTN = 'flex:0 0 auto;padding:7px 12px;border-radius:9px;font-weight:800;font-size:12px;';
      bar.id = 'pontDirectBar';
      bar.style.cssText = 'padding:8px 14px;border-bottom:1px solid rgba(120,180,255,.12);font-size:10px;color:var(--t3,#8899aa);line-height:1.4;';
      // Texte FIXE : rien de ce qui est reçu du dépôt n'entre dans ce HTML (l'état s'affiche par textContent).
      bar.innerHTML = '<div><b style="color:#38d4f5;">Pont direct ' + PONT_V + '</b> · <span id="pontDirectEtat"></span></div>'
        + '<div id="pontDirectSaisie" style="display:flex;gap:8px;margin-top:6px;align-items:center;">'
        + '<input id="pontDirectPat" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="PAT du dépôt aura-pont (github_pat_…)" style="flex:1 1 auto;min-width:0;padding:7px 9px;border-radius:9px;border:1px solid rgba(120,180,255,.25);background:rgba(255,255,255,.04);color:#cfe6ff;font-size:12px;">'
        + '<button onclick="pontDirectActiver()" style="' + BTN + 'border:1.5px solid rgba(56,212,245,.5);background:rgba(56,212,245,.10);color:#38d4f5;">Activer</button></div>'
        + '<div id="pontDirectActions" style="display:none;gap:8px;margin-top:6px;align-items:center;">'
        + '<button onclick="pontDirectEnvoyer()" style="' + BTN + 'border:1.5px solid rgba(56,212,245,.5);background:rgba(56,212,245,.10);color:#38d4f5;">Envoyer l’état</button>'
        + '<button onclick="pontDirectCouper()" style="' + BTN + 'border:1.5px solid rgba(255,77,110,.5);background:rgba(255,77,110,.10);color:#ff4d6e;">Couper le pont</button></div>';
      (el('claudeExportBar') || tabs).insertAdjacentElement('afterend', bar);
      peindre();
    } catch (e) {}
  }

  // ── démarrage : inerte sans PAT ──
  window._pontStatus = st;
  window._pont = Object.freeze({ V: PONT_V, CMDS: CMDS.slice(), valider: valider, dateDuNom: dateDuNom, etat: construireEtat, diag: construireDiag, b64Texte: b64Texte, texteB64: texteB64 });
  window.pontDirectActiver = function () { activer(); };
  window.pontDirectCouper = function () { couper(); };
  window.pontDirectEnvoyer = function () { if (!actif) return; etatDu = 0; cycle(); };   // un état tout de suite (une attente demandée par GitHub reste respectée)
  var stocke = lsGet(LS_PAT);
  if (stocke) { if (RE_PAT.test(stocke)) { pat = stocke; st.etat = 'verif'; etatDu = memoire().etatAt + BOOT_MS; demarrer(); } else lsDel(LS_PAT); }   // au lancement : pas plus d'un état par minute, même si la page se relance en boucle
  try { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poser, { once: true }); else poser(); } catch (e) {}
})();
