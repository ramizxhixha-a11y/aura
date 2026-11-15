// [GO N° 98 · 15/11/2026] VERSION 20261115k · rejeu/sonde_n98.js — le pont muet SANS signal, joué par la VRAIE page (Chromium) ; rien ne sort de la machine.
//   node rejeu/sonde_n98.js --root <code> [--avant <copie du code d'avant>] [--port 8979]
// La vraie app servie depuis --root sur 127.0.0.1 ; Sentry FORCÉ (window.__auraSentryForce = true) et INTERCEPTÉ (200 simulé) ; un faux PAT à la bonne
// forme ; GitHub simulé par la sonde (aura-pont privé, fichier-témoin du code, écriture de contrôle, etat.json, demandes/) ; tout autre trafic coupé.
// 24 h ne s'attendent pas : la mémoire du pont (aura_pont_mem) est posée comme une relance la trouverait — « panne muette commencée il y a 24 h 01 »
// (ou 23 h, le témoin qui ne doit RIEN dire).
//   1. contrôle « non concluant » (403 « Forbidden » à l'écriture de contrôle), panne commencée il y a 24 h 01 → UN envoi « muet · contrôle … » (error)
//   2. même chose, panne commencée il y a 23 h → aucun envoi (la sonde voit la différence)
//   3. réseau coupé vers GitHub, panne commencée il y a 3 jours → aucun envoi (aucune réponse de GitHub : rien à dire)
//   4. PAT disparu au LANCEMENT (mémoire marquée, pas de PAT) → la ligne le dit, aucune requête GitHub, UN envoi « disparu » après 1 min, pas avant
//   5. PAT disparu EN ROUTE (pont actif, le PAT retiré du stockage) → pont « coupé », UN envoi « disparu », plus de requête
//   6. « Couper le pont » puis relance → marque retirée, aucun envoi, aucune requête
//   7. (--avant) passages 1 et 4 sur le code d'avant → AUCUN envoi « Pont direct » (le silence du n° 98)
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); } catch (e2) {} }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root) { console.error('usage : node rejeu/sonde_n98.js --root <code> [--avant <code d\'avant>] [--port 8979]'); process.exit(3); }
const PORT = Number(args.port || 8979);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
let RACINE = path.resolve(args.root);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(RACINE, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const PAT = 'github_pat_11SONDEfakeFAKEfake_sondeSONDE0123456789abcdefXYZ';
const API = 'https://api.github.com/repos/ramizxhixha-a11y/', DEPOT = API + 'aura-pont', SONDE = API + 'aura/contents/js/17b-pont-direct.js';
const P = 'AURA8 · Pont direct ';
const TCTRL = P + 'muet · contrôle du PAT non concluant depuis 24 h, GitHub répond pourtant', TDISP = P + 'coupé · le PAT a disparu de l\'appareil sans « Couper le pont »';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type, If-None-Match, Accept', 'access-control-allow-methods': 'GET, PUT, OPTIONS' };
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 500) : '')); };
const evts = envois => envois.map(e => { const L = e.corps.split('\n'); try { return JSON.parse(L[2]); } catch (x) { return { brut: e.corps.slice(0, 200) }; } });
const pontMsgs = E => E.filter(e => /^AURA8 · Pont direct/.test(e.message || ''));
const json = (route, st, corps) => route.fulfill({ status: st, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify(corps) });

// github : 'sain' | 'nonconcluant' | 'reseau' ; init : script posé avant le chargement (stockage) ; etapes(page, ctx) : ce qui se passe ensuite
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
      if (u === SONDE && m === 'PUT') return json(route, 403, { message: github === 'nonconcluant' ? 'Forbidden' : 'Resource not accessible by personal access token' });
      if (/\/contents\/etat\.json$/.test(u) && m === 'PUT') return json(route, 201, { content: { sha: (++n).toString(16).padStart(40, 'a') } });
      if (/\/contents\/demandes$/.test(u)) return json(route, 404, { message: 'Not Found' });
      return json(route, 404, { message: 'Not Found' });
    }
    autres.push(u.replace(/\?.*$/, '').slice(0, 80)); return route.abort();
  });
  await ctx.addInitScript(`(() => { window.__auraSentryForce = true; if (sessionStorage.getItem('__sonde_init')) return; sessionStorage.setItem('__sonde_init', '1'); try { ${init} } catch (e) {} })();`);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const lire = () => page.evaluate(() => ({ pont: window._pontStatus && { etat: window._pontStatus.etat, err: window._pontStatus.err },
    ligne: (document.getElementById('pontDirectEtat') || {}).textContent || null, mem: localStorage.getItem('aura_pont_mem'), pat: localStorage.getItem('aura_pont_pat'), sentry: window._auraSentry && window._auraSentry.etat() }));
  const out = await etapes(page, lire, { envois, pont });
  await ctx.close();
  return Object.assign({ envois, E: evts(envois), pont, autres, perr }, out);
}
const memAvec = champs => `localStorage.setItem('aura_pont_mem', JSON.stringify(Object.assign({ inst: 'sonde98', fait: [], etatAt: Date.now() - 90000000, ecrits: [] }, ${champs})));`;

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const attendre = (page, s) => page.waitForTimeout(s * 1000);
  try {
    /* 1 · non concluant, panne de 24 h 01 */
    const muetDe = h => `localStorage.setItem('aura_pont_pat', ${JSON.stringify(PAT)}); ` + memAvec(`{ actif: 1, muet: Date.now() - ${Math.round(h * 3600000)} }`);
    const A = await passage(browser, args.root, 'nonconcluant', muetDe(24 + 1 / 60), async (page, lire) => { await attendre(page, 40); return { e: await lire() }; });
    const pa = pontMsgs(A.E);
    R('chargement : Sentry actif (environnement « sonde »)', A.e.sentry && A.e.sentry.actif, A.e.sentry && A.e.sentry.raison);
    R('1 · contrôle « non concluant » (403 « Forbidden »), panne commencée il y a 24 h 01 → pont « suspendu », UN envoi « muet · contrôle … », error, avalee=non',
      A.e.pont && A.e.pont.etat === 'suspendu' && pa.length === 1 && pa[0].message === TCTRL && pa[0].level === 'error' && pa[0].tags && pa[0].tags.avalee === 'non', { ligne: A.e.ligne, envois: pa.map(e => [e.message, e.level]) });
    R('1 · ni le PAT ni le message de GitHub dans les ' + A.envois.length + ' corps envoyés ; requêtes : ' + A.pont.slice(0, 4).join(', '), !A.envois.some(e => e.corps.includes(PAT) || e.corps.includes('11SONDE') || e.corps.includes('Forbidden')) && A.pont.includes('PUT aura/contents/js/17b-pont-direct.js'));
    /* 2 · témoin : 23 h */
    const B = await passage(browser, args.root, 'nonconcluant', muetDe(23), async (page, lire) => { await attendre(page, 40); return { e: await lire() }; });
    R('2 · même panne commencée il y a 23 h → « suspendu », AUCUN envoi « Pont direct » (la sonde voit la différence)', B.e.pont && B.e.pont.etat === 'suspendu' && pontMsgs(B.E).length === 0 && JSON.parse(B.e.mem).muet > 0, { ligne: B.e.ligne });
    /* 3 · réseau coupé, panne de 3 jours */
    const C = await passage(browser, args.root, 'reseau', muetDe(72), async (page, lire) => { await attendre(page, 40); return { e: await lire() }; });
    R('3 · réseau coupé vers GitHub (aucune réponse), même avec une panne de 3 jours en mémoire → AUCUN envoi', pontMsgs(C.E).length === 0 && C.pont.length >= 1, { etat: C.e.pont, pont: C.pont.slice(0, 3) });
    /* 4 · PAT disparu au lancement */
    const D = await passage(browser, args.root, 'sain', memAvec('{ actif: 1 }'), async (page, lire, o) => {
      await attendre(page, 3); const e0 = await lire(); await attendre(page, 50); const n50 = pontMsgs(evts(o.envois)).length; await attendre(page, 15); return { e0, n50, e: await lire() };
    });
    const pd = pontMsgs(D.E);
    R('4 · PAT disparu AU LANCEMENT : la ligne le dit tout de suite', D.e0.ligne === 'coupé · le PAT a disparu de cet appareil sans « Couper le pont » → colle un nouveau PAT et Activer', D.e0.ligne);
    R('4 · aucun envoi avant la minute, UN « disparu » après, error ; AUCUNE requête GitHub', D.n50 === 0 && pd.length === 1 && pd[0].message === TDISP && pd[0].level === 'error' && D.pont.length === 0, { n50: D.n50, envois: pd.map(e => e.message), pont: D.pont });
    /* 5 · PAT disparu en route */
    const F = await passage(browser, args.root, 'sain', `localStorage.setItem('aura_pont_pat', ${JSON.stringify(PAT)});`, async (page, lire, o) => {
      await attendre(page, 25); const e0 = await lire(); await page.evaluate(() => localStorage.removeItem('aura_pont_pat')); const n0 = o.pont.length;
      await attendre(page, 20); const e = await lire(); const n1 = o.pont.length; await attendre(page, 20); return { e0, e, n0, n1, n2: o.pont.length };
    });
    const pf = pontMsgs(F.E);
    R('5 · pont actif (état écrit), marque posée', F.e0.pont && F.e0.pont.etat === 'actif' && JSON.parse(F.e0.mem).actif === 1, { e0: F.e0.pont, ligne: F.e0.ligne });
    R('5 · PAT retiré du stockage EN ROUTE → « coupé », UN envoi « disparu », la ligne le dit, plus aucune requête GitHub après l\'arrêt', F.e.pont && F.e.pont.etat === 'coupe' && pf.length === 1 && pf[0].message === TDISP && /a disparu de cet appareil/.test(F.e.ligne || '') && F.n2 === F.n1, { ligne: F.e.ligne, envois: pf.map(e => e.message), req: [F.n0, F.n1, F.n2] });
    /* 6 · Couper puis relance */
    const G = await passage(browser, args.root, 'sain', `localStorage.setItem('aura_pont_pat', ${JSON.stringify(PAT)});`, async (page, lire, o) => {
      await attendre(page, 25); await page.evaluate(() => window.pontDirectCouper()); const e0 = await lire(); const n0 = o.pont.length;
      await page.reload({ waitUntil: 'domcontentloaded' }); await attendre(page, 70); return { e0, e: await lire(), n0, n1: o.pont.length };
    });
    R('6 · « Couper le pont » : marque retirée, PAT effacé ; relance : AUCUN envoi « Pont direct », aucune requête GitHub, ligne « coupé · colle le PAT »',
      G.e0.pat === null && !('actif' in JSON.parse(G.e0.mem)) && pontMsgs(G.E).length === 0 && G.n1 === G.n0 && /^coupé · colle le PAT/.test(G.e.ligne || ''), { ligne: G.e.ligne, mem: G.e0.mem });
    R('aucune erreur de page venue du pont ou de Sentry (passages 1 à 6)', ![A, B, C, D, F, G].some(x => x.perr.some(m => /pont|sentry/i.test(m))), [A, B, C, D, F, G].map(x => x.perr.filter(m => /pont|sentry/i.test(m)).slice(0, 2)));
    /* 7 · témoin, code d'avant */
    if (args.avant) {
      const H1 = await passage(browser, args.avant, 'nonconcluant', muetDe(24 + 1 / 60), async (page, lire) => { await attendre(page, 40); return { e: await lire() }; });
      const H4 = await passage(browser, args.avant, 'sain', memAvec('{ actif: 1 }'), async (page, lire) => { await attendre(page, 65); return { e: await lire() }; });
      R('7 · témoin, code d\'avant : passage 1 → « ' + (H1.e.pont && H1.e.pont.etat) + ' » SANS envoi ; passage 4 → « ' + (H4.e.pont && H4.e.pont.etat) + ' » SANS envoi (le silence du n° 98)',
        H1.e.pont && H1.e.pont.etat === 'suspendu' && pontMsgs(H1.E).length === 0 && H4.e.pont && H4.e.pont.etat === 'coupe' && pontMsgs(H4.E).length === 0 && H1.e.sentry && H1.e.sentry.actif, { l1: H1.e.ligne, l4: H4.e.ligne });
    }
    const ok = res.every(r => r.ok);
    console.log((ok ? '✅ ' : '❌ ') + res.filter(r => r.ok).length + '/' + res.length + ' étapes');
    process.exitCode = ok ? 0 : 1;
  } finally { await browser.close(); server.close(); }
})();
