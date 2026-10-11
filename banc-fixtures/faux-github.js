// banc-fixtures/faux-github.js — [PONT DIRECT · 11/10/2026] un faux GitHub (API « Contents ») pour banc-pont-direct.js (Node) et
// rejeu/sondes/pont-20261011.js (dans la page). Il tient en mémoire le dépôt aura-pont et répond comme l'API réelle pour ce dont le
// pont se sert — codes et messages relevés dans la documentation de GitHub le 11/10/2026 :
//   • jeton inconnu → 401 « Bad credentials » ; dépôt non visible par le jeton → 404 « Not Found » ;
//   • écriture sans le droit → 403 « Resource not accessible by personal access token » ;
//   • PUT d'un fichier existant sans sha → 422 ; avec un sha qui ne correspond pas → 409 « <chemin> does not match <sha> » ;
//   • GET avec If-None-Match égal à l'ETag → 304 ; dossier → liste ; fichier → { content (base64, coupé en lignes), sha, size } ;
//   • le dépôt du code est PUBLIC : tout jeton valide y LIT (« Tokens always include read-only access to all public repositories »).
// CE QUE LA DOCUMENTATION NE DIT PAS est réglable, pour que le banc joue chaque réponse possible :
//   • gh.shaSurAbsent — PUT avec un sha sur un fichier qui n'existe plus : 404 (défaut), 409, 422 ou 'cree' ;
//   • gh.melange — l'ordre de la liste d'un dossier (GitHub trie par nom ; le pont ne doit pas en dépendre).
// Le dépôt du CODE (aura) n'est jamais écrit : toute écriture qui y aboutirait est comptée dans ecritsCode (les bancs exigent 0).
(function (root) {
  'use strict';
  function fauxGitHub(opts) {
    opts = opts || {};
    var O = 'https://api.github.com/repos/ramizxhixha-a11y/', PONT = O + 'aura-pont', CODE = O + 'aura';
    var gh = { jetons: opts.jetons || {}, prive: opts.prive !== false, pages: false, nom: opts.nom || 'ramizxhixha-a11y/aura-pont', journal: [], pannes: [], ecrits: [], ecritsCode: 0, reste: 4999, n: 0,
      shaSurAbsent: 404, melange: false, codeFichiers: { 'js/17b-pont-direct.js': 1 }, speciaux: {} };   // ecrits : les écritures ABOUTIES, dans l'ordre
    var fichiers = {};   // chemin → { b64, sha }
    function hache(s) {   // 40 chiffres hexadécimaux, déterministe (pas un vrai sha : seul l'accord compte)
      var out = '';
      for (var k = 0; k < 5; k++) { var h = (0x811c9dc5 ^ (k * 0x9e3779b1)) >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } out += ('00000000' + h.toString(16)).slice(-8); }
      return out;
    }
    function versB64(texte) { var u = new TextEncoder().encode(texte), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
    function octets(b64) { var bin = atob(String(b64).replace(/\s+/g, '')), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
    function lignes(b64) { return b64.replace(/(.{60})/g, '$1\n'); }   // GitHub coupe le base64 en lignes
    function rep(st, j, h) {
      var H = Object.assign({ 'x-ratelimit-remaining': String(gh.reste) }, h || {}), corps = (st === 304 || st === 204) ? '' : JSON.stringify(j === undefined ? {} : j);
      return { status: st, headers: { get: function (k) { k = String(k).toLowerCase(); return Object.prototype.hasOwnProperty.call(H, k) ? H[k] : null; } }, text: function () { return Promise.resolve(corps); } };
    }
    function enfants(dossier) {
      var pre = dossier ? dossier + '/' : '', vus = {}, out = [];
      Object.keys(fichiers).concat(Object.keys(gh.speciaux)).sort().forEach(function (p) {
        if (p.indexOf(pre) !== 0) return;
        var resteP = p.slice(pre.length), i = resteP.indexOf('/');
        if (gh.speciaux[p]) { if (i < 0) out.push(Object.assign({ name: resteP, path: p }, gh.speciaux[p].liste)); return; }
        if (i < 0) out.push({ type: 'file', name: resteP, path: p, sha: fichiers[p].sha, size: octets(fichiers[p].b64).length });
        else { var d = resteP.slice(0, i); if (!vus[d]) { vus[d] = 1; out.push({ type: 'dir', name: d, path: pre + d, sha: hache('d' + pre + d), size: 0 }); } }
      });
      if (gh.melange) out.sort(function (a, b) { return hache(a.name) < hache(b.name) ? -1 : 1; });   // un ordre quelconque, mais stable
      return out;
    }
    gh.poser = function (chemin, texte) { var b = versB64(texte); fichiers[chemin] = { b64: b, sha: hache(chemin + '|' + b + '|' + (++gh.n)) }; return fichiers[chemin].sha; };
    gh.poserSpecial = function (chemin, liste, lecture) { gh.speciaux[chemin] = { liste: liste, lecture: lecture }; };   // une entrée qui n'est pas un fichier ordinaire (sous-module…)
    gh.retirer = function (chemin) { delete fichiers[chemin]; delete gh.speciaux[chemin]; };
    gh.existe = function (chemin) { return Object.prototype.hasOwnProperty.call(fichiers, chemin); };
    gh.octets = function (chemin) { return gh.existe(chemin) ? octets(fichiers[chemin].b64) : null; };
    gh.texte = function (chemin) { return gh.existe(chemin) ? new TextDecoder('utf-8').decode(octets(fichiers[chemin].b64)) : null; };
    gh.sha = function (chemin) { return gh.existe(chemin) ? fichiers[chemin].sha : null; };
    gh.chemins = function () { return Object.keys(fichiers).sort(); };
    gh.panne = function (regle) { gh.pannes.push(regle); };   // regle(req) → null (rien) | 'reseau' | { st, j, h } | { st, brut } | { st, corpsRate } ; regle.une = true : une seule fois
    gh.fetch = function (url, init) {
      init = init || {};
      var h = init.headers || {}, m = String(init.method || 'GET').toUpperCase(), corps = null;
      try { corps = init.body === undefined ? null : JSON.parse(init.body); } catch (e) { corps = '(illisible)'; }
      var req = { m: m, url: String(url), h: h, brut: init.body === undefined ? null : String(init.body), corps: corps, opt: { cache: init.cache, redirect: init.redirect, credentials: init.credentials, referrerPolicy: init.referrerPolicy, signal: !!init.signal } };
      gh.journal.push(req);
      for (var i = 0; i < gh.pannes.length; i++) {
        var r = gh.pannes[i](req);
        if (!r) continue;
        if (gh.pannes[i].une) gh.pannes.splice(i, 1);
        if (r === 'reseau') return Promise.reject(new TypeError('Failed to fetch'));
        if (r.brut !== undefined || r.corpsRate) { var x = rep(r.st, {}, r.h), t = r.brut, rate = r.corpsRate; x.text = function () { return rate ? Promise.reject(new TypeError('network error')) : Promise.resolve(t); }; return Promise.resolve(x); }   // corps qui n'est pas du JSON, ou qui ne se lit pas
        return Promise.resolve(rep(r.st, r.j, r.h));
      }
      var auth = String(h.Authorization || h.authorization || ''), jeton = auth.indexOf('Bearer ') === 0 ? auth.slice(7) : '';
      var droits = Object.prototype.hasOwnProperty.call(gh.jetons, jeton) ? gh.jetons[jeton] : null;
      if (!droits) return Promise.resolve(rep(401, { message: 'Bad credentials', status: '401' }));
      var inm = h['If-None-Match'] || h['if-none-match'] || null, chemin, f;
      if (req.url === CODE || req.url.indexOf(CODE + '/') === 0) {   // dépôt du code : public en lecture, écrit seulement si le jeton en a le droit
        if (req.url === CODE) return Promise.resolve(rep(m === 'GET' ? 200 : 404, m === 'GET' ? { full_name: 'ramizxhixha-a11y/aura', private: false } : { message: 'Not Found' }));
        chemin = decodeURIComponent(req.url.slice((CODE + '/contents/').length));
        if (m === 'GET') return Promise.resolve(gh.codeFichiers[chemin] ? rep(200, { type: 'file', name: chemin.split('/').pop(), path: chemin, sha: 'c0de' + hache(chemin).slice(4), size: 5, encoding: 'base64', content: 'Y29kZQ==\n' }) : rep(404, { message: 'Not Found', status: '404' }));
        if (droits.code !== 'rw') return Promise.resolve(rep(403, { message: 'Resource not accessible by personal access token', status: '403' }));
        if (!corps || corps.sha !== 'c0de' + hache(chemin).slice(4)) return Promise.resolve(rep(409, { message: chemin + ' does not match ' + (corps && corps.sha), status: '409' }));
        gh.ecritsCode++; return Promise.resolve(rep(200, { content: { path: chemin } }));
      }
      if (req.url !== PONT && req.url.indexOf(PONT + '/') !== 0) return Promise.resolve(rep(404, { message: 'Not Found', status: '404' }));
      if (!droits.pont) return Promise.resolve(rep(404, { message: 'Not Found', status: '404' }));
      if (req.url === PONT) return Promise.resolve(rep(m === 'GET' ? 200 : 404, m === 'GET' ? { full_name: gh.nom, private: gh.prive, has_pages: gh.pages, permissions: { push: droits.pont === 'rw', pull: true } } : { message: 'Not Found' }));
      if (req.url.indexOf(PONT + '/contents/') !== 0) return Promise.resolve(rep(404, { message: 'Not Found', status: '404' }));
      chemin = decodeURIComponent(req.url.slice((PONT + '/contents/').length)).replace(/\/+$/, '');
      if (m === 'GET') {
        if (gh.speciaux[chemin]) return Promise.resolve(rep(200, gh.speciaux[chemin].lecture));
        if (gh.existe(chemin)) {
          f = fichiers[chemin];
          if (inm === '"' + f.sha + '"') return Promise.resolve(rep(304, undefined, { etag: '"' + f.sha + '"' }));
          return Promise.resolve(rep(200, { type: 'file', name: chemin.split('/').pop(), path: chemin, sha: f.sha, size: octets(f.b64).length, encoding: 'base64', content: lignes(f.b64) }, { etag: '"' + f.sha + '"' }));
        }
        var liste = enfants(chemin);
        if (!liste.length) return Promise.resolve(rep(404, { message: 'Not Found', status: '404' }));
        var et = '"' + hache(JSON.stringify(liste)) + '"';
        return Promise.resolve(inm === et ? rep(304, undefined, { etag: et }) : rep(200, liste, { etag: et }));
      }
      if (m === 'PUT') {
        if (droits.pont !== 'rw') return Promise.resolve(rep(403, { message: 'Resource not accessible by personal access token', status: '403' }));
        if (!corps || typeof corps !== 'object' || typeof corps.message !== 'string' || typeof corps.content !== 'string') return Promise.resolve(rep(422, { message: 'Invalid request.', status: '422' }));
        if (enfants(chemin).length) return Promise.resolve(rep(422, { message: 'Unprocessable Entity', status: '422' }));   // un DOSSIER porte ce nom : rien ne s'y écrit
        var cree = !gh.existe(chemin);
        if (!cree) {
          if (!corps.sha) return Promise.resolve(rep(422, { message: 'Invalid request.\n\n"sha" wasn\'t supplied.', status: '422' }));
          if (corps.sha !== fichiers[chemin].sha) return Promise.resolve(rep(409, { message: chemin + ' does not match ' + corps.sha, status: '409' }));
        } else if (corps.sha && gh.shaSurAbsent !== 'cree') {
          return Promise.resolve(gh.shaSurAbsent === 404 ? rep(404, { message: 'Not Found', status: '404' }) : (gh.shaSurAbsent === 409 ? rep(409, { message: chemin + ' does not match ' + corps.sha, status: '409' }) : rep(422, { message: 'Invalid request.', status: '422' })));
        }
        var b = corps.content.replace(/\s+/g, '');
        fichiers[chemin] = { b64: b, sha: hache(chemin + '|' + b + '|' + (++gh.n)), message: corps.message };
        gh.ecrits.push(chemin);
        return Promise.resolve(rep(cree ? 201 : 200, { content: { name: chemin.split('/').pop(), path: chemin, sha: fichiers[chemin].sha, size: octets(b).length }, commit: { sha: hache('c' + gh.n), message: corps.message } }));
      }
      return Promise.resolve(rep(404, { message: 'Not Found', status: '404' }));
    };
    return gh;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = fauxGitHub; else root.__fauxGitHub = fauxGitHub;
})(typeof window !== 'undefined' ? window : this);
