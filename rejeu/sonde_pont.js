// [GO PONT · 14/11/2026] VERSION 20261114i · rejeu/sonde_pont.js — le cas du 10/11 joué par la VRAIE page (Chromium), rien ne sort de la machine.
//   node rejeu/sonde_pont.js --root <code> [--avant <copie du code d'avant>] [--port 8978] [--secondes 45]
// La vraie app, servie depuis --root sur 127.0.0.1 ; Sentry FORCÉ (window.__auraSentryForce = true) et INTERCEPTÉ (réponse 200 simulée) ;
// un PAT à la bonne forme (faux) gardé dans localStorage, comme sur la tablette ; tout autre trafic extérieur coupé, sauf l'adresse
// d'aura-pont sur api.github.com, servie par la sonde selon le passage :
//   1. 401 « Bad credentials » (le PAT expiré du 10/11) → attendu : pont « suspendu », UN envoi Sentry « AURA8 · Pont direct suspendu ·
//      PAT refusé par GitHub (401 … ) » (error, avalee=non, environnement « sonde »), une seule requête vers aura-pont (un essai par heure),
//      la ligne d'Outils dit le geste, ni le PAT ni « Bad credentials » dans aucun corps envoyé, aucune erreur de page venue du pont.
//   2. réseau coupé vers GitHub → attendu : aucun envoi « Pont direct » (rien à faire pour Rams : le pont réessaie seul).
//   2b. limite SECONDAIRE de GitHub (403 « secondary rate limit », sans en-tête d'attente ; relecture du 14/11) → aucun envoi, aucun geste
//      (« Couper » effacerait un PAT valide), la ligne dit « GitHub demande d'attendre ».
//   3. (--avant) le passage 1 sur le code d'avant → témoin : pont suspendu aussi, mais AUCUN envoi « Pont direct » (le silence du 10/11).
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); } catch (e2) {} }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root) { console.error('usage : node rejeu/sonde_pont.js --root <code> [--avant <code d\'avant>] [--port 8978] [--secondes 45]'); process.exit(3); }
const PORT = Number(args.port || 8978), SEC = Number(args.secondes || 45);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
let RACINE = path.resolve(args.root);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(RACINE, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const PAT = 'github_pat_11SONDEfakeFAKEfake_sondeSONDE0123456789abcdefXYZ';
const DEPOT = 'https://api.github.com/repos/ramizxhixha-a11y/aura-pont';
const T401 = 'AURA8 · Pont direct suspendu · PAT refusé par GitHub (401 : expiré ou révoqué)';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type, If-None-Match', 'access-control-allow-methods': 'GET, PUT, OPTIONS' };
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 600) : '')); };
const evts = envois => envois.map(e => { const L = e.corps.split('\n'); try { return JSON.parse(L[2]); } catch (x) { return { brut: e.corps.slice(0, 200) }; } });

async function passage(browser, racine, github) {
  RACINE = path.resolve(racine);
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 } });
  const envois = [], pont = [], autres = [];
  await ctx.route('**/*', route => {
    const q = route.request(), u = q.url();
    if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue();
    if (/^https:\/\/[^/]*ingest\.de\.sentry\.io\//.test(u)) { envois.push({ url: u, corps: q.postData() || '' }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (u === DEPOT || u.startsWith(DEPOT + '/')) {
      pont.push(q.method() + ' ' + u.replace(DEPOT, 'aura-pont'));
      if (q.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
      if (github === 'secondaire') return route.fulfill({ status: 403, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify({ message: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.', documentation_url: 'https://docs.github.com/rest' }) });
      if (github === '401') return route.fulfill({ status: 401, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify({ message: 'Bad credentials', documentation_url: 'https://docs.github.com/rest', status: '401' }) });
      return route.abort();
    }
    autres.push(u.replace(/\?.*$/, '').slice(0, 80)); return route.abort();
  });
  await ctx.addInitScript(`(() => { window.__auraSentryForce = true; try { localStorage.setItem('aura_pont_pat', ${JSON.stringify(PAT)}); } catch (e) {} })();`);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(SEC * 1000);
  const etat = await page.evaluate(() => ({ pont: window._pontStatus && { etat: window._pontStatus.etat, err: window._pontStatus.err, v: window._pontStatus.v },
    ligne: (document.getElementById('pontDirectEtat') || {}).textContent || null, sentry: window._auraSentry && window._auraSentry.etat(), signal: !!(window._auraSentry && window._auraSentry.signal) }));
  await ctx.close();
  return { envois, E: evts(envois), pont, autres, perr, etat };
}

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    /* 1 · le PAT expiré du 10/11 */
    const A = await passage(browser, args.root, '401');
    const pa = A.E.filter(e => /^AURA8 · Pont direct/.test(e.message || ''));
    R('chargement : Sentry actif (environnement « sonde »), 00s expose signal(), pont ' + (A.etat.pont && A.etat.pont.v), A.etat.sentry && A.etat.sentry.actif && A.etat.signal, A.etat.sentry && A.etat.sentry.raison);
    R('401 de GitHub → pont « suspendu » (' + (A.etat.pont && A.etat.pont.err) + ')', A.etat.pont && A.etat.pont.etat === 'suspendu');
    R('UN envoi Sentry « Pont direct », texte fixe, niveau error, avalee=non, environnement sonde', pa.length === 1 && pa[0].message === T401 && pa[0].level === 'error' && pa[0].tags && pa[0].tags.avalee === 'non' && pa[0].environment === 'sonde', pa.map(e => ({ m: e.message, l: e.level, t: e.tags, env: e.environment })));
    R('une seule demande à aura-pont en ' + SEC + ' s (le contrôle, puis un essai par heure) : ' + A.pont.join(', '), A.pont.filter(x => !x.startsWith('OPTIONS')).length === 1 && A.pont[A.pont.length - 1] === 'GET aura-pont');
    R('ligne d\'Outils : le geste est dit', !!A.etat.ligne && A.etat.ligne.includes('« Couper le pont », puis colle un nouveau PAT et Activer'), A.etat.ligne);
    const tout = A.envois.map(e => e.corps).join('\n');
    R('ni le PAT ni le message de GitHub dans les ' + A.envois.length + ' corps envoyés', !tout.includes(PAT) && !tout.includes('11SONDE') && !tout.includes('Bad credentials'));
    R('aucune erreur de page venue du pont ou de Sentry', !A.perr.some(m => /pont|sentry/i.test(m)), A.perr.slice(0, 5));
    /* 2 · réseau coupé vers GitHub : rien à faire pour Rams */
    const B = await passage(browser, args.root, 'reseau');
    const pb = B.E.filter(e => /^AURA8 · Pont direct/.test(e.message || ''));
    R('réseau coupé vers GitHub : pont « ' + (B.etat.pont && B.etat.pont.etat) + ' », AUCUN envoi « Pont direct » (' + B.envois.length + ' envoi(s) Sentry en tout), la ligne ne demande aucun geste',
      B.etat.pont && B.etat.pont.etat === 'verif' && pb.length === 0 && B.pont.length >= 1 && !(B.etat.ligne || '').includes('Couper le pont'), { ligne: B.etat.ligne, pont: B.pont });
    /* 2b · limite secondaire de GitHub : attendre, rien à faire pour Rams */
    const D = await passage(browser, args.root, 'secondaire');
    const pd = D.E.filter(e => /^AURA8 · Pont direct/.test(e.message || ''));
    R('limite secondaire (403 sans en-tête) : AUCUN envoi « Pont direct », la ligne dit « attendre », pas « Couper le pont »',
      pd.length === 0 && !!D.etat.ligne && D.etat.ligne.includes('GitHub demande d\'attendre') && !D.etat.ligne.includes('Couper le pont') && !/ne voit pas/.test(D.etat.ligne), { ligne: D.etat.ligne, pont: D.pont });
    /* 3 · témoin : le code d'avant, même 401 */
    if (args.avant) {
      const C = await passage(browser, args.avant, '401');
      const pc = C.E.filter(e => /^AURA8 · Pont direct/.test(e.message || ''));
      R('témoin, code d\'avant : même 401, pont « ' + (C.etat.pont && C.etat.pont.etat) + ' », AUCUN envoi « Pont direct » (le silence du 10/11) ; la sonde voit la différence',
        C.etat.pont && C.etat.pont.etat === 'suspendu' && pc.length === 0 && C.etat.sentry && C.etat.sentry.actif && !C.etat.signal, { ligne: C.etat.ligne, envois: C.E.map(e => e.message || (e.exception && e.exception.values.slice(-1)[0].value)) });
    }
    const ok = res.every(r => r.ok);
    console.log((ok ? '✅ ' : '❌ ') + res.filter(r => r.ok).length + '/' + res.length + ' étapes');
    process.exitCode = ok ? 0 : 1;
  } finally { await browser.close(); server.close(); }
})();
