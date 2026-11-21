// rejeu/sonde_fibonacci.js — [GO FIBONACCI · 21/11/2026] vraie page, backup du pont du jour, tablette 800 × 1 280 : la fiche MAN montre-t-elle le bot
// Fibonacci (lecture seule, sans vote) ? AVANT / APRÈS. Réseau coupé, SAUF les klines du module (…&limit=56), servies par la sonde (bougies inventées).
// Usage : node rejeu/sonde_fibonacci.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette)
// Étapes : accueil, barre « Positions en cours Man » ouverte, VRAI clic sur la brique BTC → fiche MAN ; après 14 s : section « Bot Fibonacci » EN DERNIER,
// 6 unités lues, 6 requêtes une à une (5m 15m 30m 1h 4h 1d) ; argent, positions et décisions identiques avant / après l'ouverture de la fiche ; fiche
// fermée → plus aucune requête ; avant : ni section ni requête. Capture : rejeu/out/sonde_fibonacci_<passe>_fiche.png
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
if (!A.backup || !A.avant) { console.error('--backup <fichier> et --avant <dossier> requis'); process.exit(2); }
const NEW = path.resolve(A.root || '.'), OLD = path.resolve(A.avant), OUT = path.join(NEW, 'rejeu/out');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const serve = (ROOT, PORT) => new Promise(r => { const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}); s.listen(PORT, '127.0.0.1', () => r(s)); });
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 900))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };

async function passe(browser, ROOT, PORT, nom) {
  const server = await serve(ROOT, PORT), r = { nom, req: [] };
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const IV = { '5m': 300000, '15m': 900000, '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
  await ctx.route('**/*', q => {
    const u = q.request().url();
    if (u.startsWith('http://127.0.0.1:' + PORT)) return q.continue();
    const m = /^https:\/\/api\.binance\.com\/api\/v3\/klines\?symbol=([A-Z]+)&interval=([0-9a-z]+)&limit=56$/.exec(u);
    if (!m) return q.abort();
    r.req.push([Date.now(), m[1], m[2]]);
    const un = IV[m[2]], now = Date.now(), last = Math.floor(now / un) * un, out = [];
    for (let k = 55; k >= 0; k--) { const t = last - k * un, x = 60000 + 4000 * Math.sin((55 - k) / 9) + (55 - k) * 30; out.push([t, String(x), String(x + 120), String(x - 120), String(x + 40), '1', t + un - 1]); }
    return q.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret = await PRET(page); await page.waitForTimeout(6000);
  const ev = (fn, a) => page.evaluate(fn, a);
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  const etat = () => ev(() => JSON.stringify(['sim', 'paperReal', 'real'].map(m => { const w = S.walletStore[m];
    return [w.tradingAccount, w.cashAccount, w.leverage, (w.openPositions || []).map(p => [p.id, p.pair, p.side, p.stakeUsdt, p.entryPrice]),
      Object.keys(w.pairStates).map(k => [k, w.pairStates[k].stake, w.pairStates[k].pairLeverage])]; }).concat([S.botAutoMode, S.tradingMode, (S.agents || []).length])));
  r.depart = { mode: await ev(() => S.tradingMode), auto: await ev(() => S.botAutoMode) };
  await ev(() => { goPage(0); const b = document.getElementById('manBar'); if (b && !b.classList.contains('open')) toggleBar('man'); });
  await page.waitForTimeout(1200);
  r.etatAvant = await etat();
  try { await page.locator('#manbrick_BTC_USDT').scrollIntoViewIfNeeded(); await page.click('#manbrick_BTC_USDT', { timeout: 8000 }); r.clicBrique = true; }
  catch (e) { r.clicBrique = String(e).slice(0, 160); await ev(() => openManDetail('BTC/USDT')); }
  await page.waitForTimeout(14000);
  r.etatApres = await etat();
  r.fiche = await ev(() => { const o = document.getElementById('pairDetailOverlay'), b = document.getElementById('pairDetailBody'), s = document.getElementById('fib_BTC_USDT');
    return { ouverte: !!(o && o.classList.contains('open')), section: !!s, derniere: !!(s && b && b.lastElementChild === s), lignes: s ? (s.innerText.match(/ · zone /g) || []).length : 0,
      refus: s ? (s.innerText.match(/⛔|rien lu|lecture…/g) || []).length : -1, texte: s ? s.innerText.slice(0, 900) : null,
      visible: !!(s && s.getBoundingClientRect().height > 0) }; });
  if (r.fiche.section) { await ev(() => { const s = document.getElementById('fib_BTC_USDT'); s.scrollIntoView(); }); await page.waitForTimeout(300); }
  await page.screenshot({ path: path.join(OUT, 'sonde_fibonacci_' + nom + '_fiche.png') });
  r.nReqOuverte = r.req.length;
  await ev(() => { const o = document.getElementById('pairDetailOverlay'); if (typeof closePairDetail === 'function') closePairDetail(); else if (o) o.classList.remove('open'); });
  await page.waitForTimeout(8000);
  r.nReqFermee = r.req.length; r.fermee = await ev(() => !document.getElementById('pairDetailOverlay').classList.contains('open'));
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8971, 'avant'), ap = await passe(browser, NEW, 8972, 'apres');
  await browser.close();
  console.log('SONDE FIBONACCI · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc + ' · départ ' + JSON.stringify(ap.depart));
  R('VRAI clic sur la brique BTC → fiche MAN ouverte — les deux versions', [av, ap].every(x => x.clicBrique === true && x.fiche.ouverte), [av.clicBrique, ap.clicBrique]);
  R('avant : ni section ni requête ; après : « Bot Fibonacci » visible, EN DERNIER dans la fiche, 6 unités lues, aucun refus',
    !av.fiche.section && av.nReqOuverte === 0 && ap.fiche.section && ap.fiche.visible && ap.fiche.derniere && ap.fiche.lignes === 6 && ap.fiche.refus === 0,
    { avant: av.fiche, apres: ap.fiche });
  R('après : 6 requêtes, une par unité dans l\'ordre 5m 15m 30m 1h 4h 1d, BTCUSDT', JSON.stringify(ap.req.slice(0, 6).map(x => x[2])) === '["5m","15m","30m","1h","4h","1d"]' && ap.req.every(x => x[1] === 'BTCUSDT') && ap.nReqOuverte >= 6, ap.req);
  R('argent, positions, mises, leviers, AUTO / MANU, mode et agents identiques avant / après l\'ouverture de la fiche (les deux versions)', av.etatAvant === av.etatApres && ap.etatAvant === ap.etatApres, { av: av.etatAvant === av.etatApres, ap: ap.etatAvant === ap.etatApres });
  R('fiche fermée → plus aucune requête pendant 8 s', ap.fermee && ap.nReqFermee === ap.nReqOuverte, [ap.nReqOuverte, ap.nReqFermee]);
  R('pages prêtes et sans erreur (avant et après)', av.pret && ap.pret && !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  console.log('  fiche après :\n' + (ap.fiche.texte || '').split('\n').map(l => '    ' + l).join('\n'));
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.writeFileSync(path.join(OUT, 'sonde_fibonacci.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
