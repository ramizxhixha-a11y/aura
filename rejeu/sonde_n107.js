// [GO N° 107 · 16/11/2026] VERSION 20261116b · rejeu/sonde_n107.js — une faute de CODE dans le battement du pont, jouée par la VRAIE page (Chromium) ; rien ne sort de la machine.
//   node rejeu/sonde_n107.js --root <code> [--avant <copie du code d'avant>] [--port 8981]
// La vraie app servie depuis --root sur 127.0.0.1 ; Sentry FORCÉ (window.__auraSentryForce = true, vrai SDK, vraie garde de 00s) et INTERCEPTÉ (200 simulé) ;
// un faux PAT à la bonne forme ; GitHub simulé par la sonde (aura-pont privé, fichier-témoin, écriture de contrôle refusée, etat.json, demandes/) ; tout autre trafic coupé.
// La faute : l'objet de lecture de l'app (window._pontLecture, 17) remplacé par un autre dont etat() rend null → 17b entete lève une TypeError (le code sous essai est intact).
// 24 h ne s'attendent pas : la mémoire du pont (aura_pont_mem) est posée comme une relance la trouverait (« panne commencée il y a 24 h 01 », ou 23 h pour le témoin).
//   1. pont actif, état écrit ; puis la faute + « Envoyer l'état » → UN envoi avalee=oui (warning) : TypeError, message FIXE, pile dans 17b, rien du message d'origine ni du PAT ;
//      aucun etat.json de plus ; la ligne d'Outils dit « faute de code » ; début de panne gardé
//   2. faute dès le lancement, panne commencée il y a 24 h 01 → en plus, UN envoi « AURA8 · Pont direct muet · faute de code … » (error)
//   3. même chose, panne de 23 h → la warning seule, aucun envoi error (la sonde voit la différence)
//   4. réseau coupé vers GitHub (panne de 3 jours en mémoire) → AUCUN envoi du pont, la ligne dit « réseau »
//   5. (--avant) passages 1 et 2 sur le code d'avant → AUCUN envoi du pont, la ligne dit « réseau « Cannot read … » » (le silence du n° 107)
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); } catch (e2) {} }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root) { console.error('usage : node rejeu/sonde_n107.js --root <code> [--avant <code d\'avant>] [--port 8981]'); process.exit(3); }
const PORT = Number(args.port || 8981);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
let RACINE = path.resolve(args.root);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(RACINE, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const PAT = 'github_pat_11SONDEfakeFAKEfake_sondeSONDE0123456789abcdefXYZ';
const API = 'https://api.github.com/repos/ramizxhixha-a11y/', DEPOT = API + 'aura-pont', SONDE = API + 'aura/contents/js/17b-pont-direct.js';
const TCODE = 'AURA8 · Pont direct muet · faute de code dans son battement depuis 24 h (pas une coupure du réseau)';
const MSG = 'AURA8 · Pont direct · faute de code dans le battement';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type, If-None-Match, Accept', 'access-control-allow-methods': 'GET, PUT, OPTIONS' };
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 600) : '')); };
const evts = envois => envois.map(e => { const L = e.corps.split('\n'); try { return JSON.parse(L[2]); } catch (x) { return { brut: e.corps.slice(0, 200) }; } });
const exc = e => (e.exception && e.exception.values && e.exception.values.slice(-1)[0]) || null;
const duPont = E => E.filter(e => /^AURA8 · Pont direct/.test(e.message || '') || ((exc(e) || {}).value === MSG));
const json = (route, st, corps) => route.fulfill({ status: st, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify(corps) });
// la faute, posée dès que 17 a publié son objet de lecture (avant le 1er battement du pont, à 15 s)
const FAUTE = `(function poser() { var L = window._pontLecture; if (!L) return setTimeout(poser, 50); window._pontLecture = Object.assign({}, L, { etat: function () { return null; } }); })();`;

async function passage(browser, racine, github, init, etapes) {
  RACINE = path.resolve(racine);
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 } });
  const envois = [], pont = [], autres = [];
  let n = 0;
  await ctx.route('**/*', route => {
    const q = route.request(), u = q.url(), m = q.method();
    if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue();
    if (/^https:\/\/[^/]*ingest\.de\.sentry\.io\//.test(u)) { envois.push({ url: u, corps: q.postData() || '' }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (u === DEPOT || u.startsWith(DEPOT + '/') || u === SONDE) {
      if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
      pont.push(m + ' ' + u.replace(API, ''));
      if (github === 'reseau') return route.abort();
      if (u === DEPOT && m === 'GET') return json(route, 200, { full_name: 'ramizxhixha-a11y/aura-pont', private: true, has_pages: false });
      if (u === SONDE && m === 'GET') return json(route, 200, { type: 'file', name: '17b-pont-direct.js', sha: 'c0de'.padEnd(40, '0') });
      if (u === SONDE && m === 'PUT') return json(route, 403, { message: 'Resource not accessible by personal access token' });
      if (/\/contents\/etat\.json$/.test(u) && m === 'PUT') return json(route, 201, { content: { sha: (++n).toString(16).padStart(40, 'a') } });
      return json(route, 404, { message: 'Not Found' });
    }
    autres.push(u.replace(/\?.*$/, '').slice(0, 80)); return route.abort();
  });
  await ctx.addInitScript(`(() => { window.__auraSentryForce = true; if (sessionStorage.getItem('__sonde_init')) return; sessionStorage.setItem('__sonde_init', '1'); try { ${init} } catch (e) {} })();`);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const lire = () => page.evaluate(() => ({ pont: window._pontStatus && { etat: window._pontStatus.etat, err: window._pontStatus.err, echecs: window._pontStatus.echecs },
    ligne: (document.getElementById('pontDirectEtat') || {}).textContent || null, mem: localStorage.getItem('aura_pont_mem'), sentry: window._auraSentry && window._auraSentry.etat() }));
  const out = await etapes(page, lire, { envois, pont });
  await ctx.close();
  return Object.assign({ envois, E: evts(envois), pont, autres, perr }, out);
}
const memAvec = champs => `localStorage.setItem('aura_pont_mem', JSON.stringify(Object.assign({ inst: 'sonde107', fait: [], etatAt: Date.now() - 90000000, ecrits: [] }, ${champs})));`;
const avecPat = `localStorage.setItem('aura_pont_pat', ${JSON.stringify(PAT)}); `;
const muetDe = h => avecPat + memAvec(`{ actif: 1, muet: Date.now() - ${Math.round(h * 3600000)} }`);
const etats = pont => pont.filter(x => /^PUT aura-pont\/contents\/etat\.json$/.test(x)).length;

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const attendre = (page, s) => page.waitForTimeout(s * 1000);
  const enRoute = racine => passage(browser, racine, 'sain', avecPat, async (page, lire, o) => {
    await attendre(page, 25); const e0 = await lire(); const n0 = etats(o.pont);
    await page.evaluate(FAUTE); await attendre(page, 1); await page.evaluate(() => window.pontDirectEnvoyer()); await attendre(page, 20);
    return { e0, n0, e: await lire(), n1: etats(o.pont) };
  });
  const auLancement = (racine, h) => passage(browser, racine, 'sain', muetDe(h) + FAUTE, async (page, lire) => { await attendre(page, 40); return { e: await lire() }; });
  try {
    /* 1 · faute en route */
    const A = await enRoute(args.root), pa = duPont(A.E), wa = pa.filter(e => (exc(e) || {}).value === MSG), xa = wa.length ? exc(wa[0]) : null;
    R('chargement : Sentry actif (environnement « sonde »), pont actif, état écrit', A.e0.sentry && A.e0.sentry.actif && A.e0.pont && A.e0.pont.etat === 'actif' && A.n0 >= 1, { pont: A.e0.pont, etats: A.n0, ligne: A.e0.ligne });
    R('1 · faute de CODE en route → UN envoi du pont : avalee=oui, warning, TypeError, message FIXE', pa.length === 1 && wa.length === 1 && wa[0].level === 'warning' && wa[0].tags && wa[0].tags.avalee === 'oui' && xa.type === 'TypeError' && xa.value === MSG,
      pa.map(e => [e.level, e.tags && e.tags.avalee, e.message || (exc(e) || {}).type + ': ' + (exc(e) || {}).value]));
    const fr = xa && xa.stacktrace && xa.stacktrace.frames || [];
    R('1 · la pile montre 17b (fichier:ligne, nom de fonction), au jeton', fr.some(f => /17b-pont-direct\.js(\?v=\w+)?$/.test(f.filename || '') && f.lineno > 0) && fr.some(f => f['function'] === 'entete'),
      fr.slice(-4).map(f => (f['function'] || '?') + ' @ ' + String(f.filename || '').replace(/^.*\//, '') + ':' + f.lineno));
    R('1 · rien du message d\'origine (« Cannot read … null »), ni du PAT, dans les ' + A.envois.length + ' corps envoyés', !A.envois.some(e => /Cannot read|reading 't'|11SONDE|github_pat_11/.test(e.corps)));
    R('1 · aucun etat.json de plus ; la ligne d\'Outils dit « faute de code », pas « réseau » ; début de panne gardé', A.n1 === A.n0 && /faute de code : Cannot read properties of null/.test(A.e.ligne || '') && !/réseau/.test(A.e.ligne || '') && JSON.parse(A.e.mem).muet > 0,
      { ligne: A.e.ligne, etats: [A.n0, A.n1] });
    /* 2 · faute au lancement, panne de 24 h 01 */
    const B = await auLancement(args.root, 24 + 1 / 60), pb = duPont(B.E);
    const eb = pb.filter(e => e.message === TCODE), wb = pb.filter(e => (exc(e) || {}).value === MSG);
    R('2 · faute au lancement, panne commencée il y a 24 h 01 → UN envoi « muet · faute de code … » (error, avalee=non) + UN avalee (warning)',
      pb.length === 2 && eb.length === 1 && eb[0].level === 'error' && eb[0].tags && eb[0].tags.avalee === 'non' && wb.length === 1 && wb[0].level === 'warning', pb.map(e => [e.level, e.tags && e.tags.avalee, e.message || (exc(e) || {}).value]));
    /* 3 · témoin : 23 h */
    const C = await auLancement(args.root, 23), pc = duPont(C.E);
    R('3 · même faute, panne de 23 h → la warning seule, AUCUN envoi error (la sonde voit la différence)', pc.length === 1 && (exc(pc[0]) || {}).value === MSG && pc[0].level === 'warning', pc.map(e => [e.level, e.message || (exc(e) || {}).value]));
    /* 4 · réseau coupé */
    const D = await passage(browser, args.root, 'reseau', muetDe(72), async (page, lire) => { await attendre(page, 40); return { e: await lire() }; });
    R('4 · réseau coupé vers GitHub (panne de 3 jours en mémoire) → AUCUN envoi du pont ; la ligne dit « réseau »', duPont(D.E).length === 0 && D.pont.length >= 1 && /réseau/.test(D.e.ligne || '') && !/faute de code/.test(D.e.ligne || ''), { ligne: D.e.ligne, pont: D.pont.slice(0, 3) });
    R('aucune erreur de page venue du pont ou de Sentry (passages 1 à 4)', ![A, B, C, D].some(x => x.perr.some(m => /pont|sentry/i.test(m))), [A, B, C, D].map(x => x.perr.filter(m => /pont|sentry/i.test(m)).slice(0, 2)));
    /* 5 · témoin, code d'avant */
    if (args.avant) {
      const H1 = await enRoute(args.avant), H2 = await auLancement(args.avant, 24 + 1 / 60);
      R('5 · témoin, code d\'avant : passages 1 et 2 → AUCUN envoi du pont (Sentry actif), la ligne dit « réseau « Cannot read … » » (le silence du n° 107)',
        duPont(H1.E).length === 0 && duPont(H2.E).length === 0 && H1.e.sentry && H1.e.sentry.actif && /réseau « Cannot read properties of null/.test(H1.e.ligne || '') && /réseau « Cannot read/.test(H2.e.ligne || ''), { l1: H1.e.ligne, l2: H2.e.ligne });
    }
    const ok = res.every(r => r.ok);
    console.log((ok ? '✅ ' : '❌ ') + res.filter(r => r.ok).length + '/' + res.length + ' étapes');
    process.exitCode = ok ? 0 : 1;
  } finally { await browser.close(); server.close(); }
})();
