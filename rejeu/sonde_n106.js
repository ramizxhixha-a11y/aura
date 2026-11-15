// rejeu/sonde_n106.js — [GO N° 106 · 15/11/2026] vraie page, backup du pont (MANU), tablette 800 × 1 280, RÉSEAU COUPÉ (l'app lancée sans réseau, ETAT n° 106) :
// l'AMPLITUDE de l'école (AA, cfg.vol) avant le 1er prix réel, AVANT / APRÈS. Avant : 08 _simCandleStep tire chaque bougie dans la constante du code (02 PAIRS,
// candidats de 09b2) — DOT 0,25 pour un prix de 0,733 (34 % du prix par pas). Après : amplitude reposée au chargement depuis les bougies réelles gardées
// (S.realCandles), règle de 02 (variation 24 h × prix / 9,8).
// Usage : node rejeu/sonde_n106.js --root . --avant <copie du code d'avant> --backup <backup.json> [--secondes 45]
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : (0) au chargement : aucun prix réel arrivé, amplitude de chaque paire (contre la règle de 02 recalculée ICI depuis le backup) ; (1) AA à l'écran,
// N s de vrai battement : chaque bougie que l'école fabrique est relevée À SA NAISSANCE (|clôture − ouverture|, en enveloppant _simCandleStep dans la page : la
// sonde observe, l'app n'est pas changée) et comparée au mouvement RÉEL de la paire en 24 h ; (2) EV et RE : prix inchangés, bornes de go n° 105 inchangées ;
// (3) aucune erreur de page.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
if (!A.backup || !A.avant) { console.error('--backup <fichier> et --avant <dossier> requis'); process.exit(2); }
const NEW = path.resolve(A.root || '.'), OLD = path.resolve(A.avant), SEC = Math.max(10, Number(A.secondes) || 45);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const serve = (ROOT, PORT) => new Promise(r => { const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}); s.listen(PORT, '127.0.0.1', () => r(s)); });
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 1600))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
st.botAutoMode = false;   // MANU, comme la tablette au 15/11 : seul Rams ouvre
// le dernier prix réel gardé de chaque paire (la bougie la plus récente de S.realCandles), lu dans le backup par la sonde elle-même
const REEL = {}; Object.keys(st.realCandles || {}).forEach(p => { let k = null; Object.values(st.realCandles[p] || {}).forEach(a => { const x = Array.isArray(a) ? a[a.length - 1] : null;
  if (x && isFinite(x.c) && x.c > 0 && isFinite(x.ts) && (!k || x.ts > k.ts)) k = x; }); if (k) REEL[p] = k.c; });
// la règle de 02, recalculée ICI depuis le backup (indépendante de 08) : variation 24 h = dernier prix réel contre l'ouverture de la bougie 1 h posée 24 h avant la dernière
const JOUR = {}, REGLE = {}; Object.keys(REEL).forEach(p => { const h = (st.realCandles[p] || {})['1h'] || [], x = h[h.length - 1], y = x && h.find(b => b.ts === x.ts - 86400000);
  if (y && y.o > 0) { JOUR[p] = REEL[p] * Math.abs((REEL[p] - y.o) / y.o); REGLE[p] = JOUR[p] / 9.8; } });
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };

async function passe(browser, ROOT, PORT, nom) {
  const server = await serve(ROOT, PORT), r = { nom };
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  let sortants = 0;
  await ctx.route('**/*', q => { if (q.request().url().startsWith('http://127.0.0.1:' + PORT)) return q.continue(); sortants++; return q.abort(); }); await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret = await PRET(page);
  const ev = (fn, a) => page.evaluate(fn, a);
  // la sonde observe chaque bougie de l'école à sa naissance (|c − o| = le pas de _simCandleStep, avant toute autre retouche du prix)
  await ev(() => { window.__corps = {}; const f0 = window._simCandleStep; window._simCandleStep = function () {
    const av = {}; Object.keys(S.pairStates).forEach(p => { const a = S.pairStates[p] && S.pairStates[p].candles; av[p] = a && a[a.length - 1]; });
    const ret = f0.apply(this, arguments);
    Object.keys(S.pairStates).forEach(p => { const a = S.pairStates[p] && S.pairStates[p].candles, x = a && a[a.length - 1]; if (x && x !== av[p]) (window.__corps[p] = window.__corps[p] || []).push(Math.abs(x.c - x.o)); });
    return ret; }; });
  // (0) juste après le chargement : bornes, prix de l'école, aucun prix réel arrivé
  const lit = () => ev(() => { const o = { fetched: _pricesFetched, mode: S.tradingMode, bornes: {}, aa: {}, ev: {}, re: {}, vol: {} };
    Object.keys(PAIRS).forEach(p => { o.bornes[p] = [PAIRS[p].minP, PAIRS[p].maxP]; o.vol[p] = PAIRS[p].vol;
      ['sim', 'paperReal', 'real'].forEach(m => { const ps = S.walletStore[m] && S.walletStore[m].pairStates && S.walletStore[m].pairStates[p];
        o[m === 'sim' ? 'aa' : m === 'paperReal' ? 'ev' : 're'][p] = ps ? ps.price : null; }); });
    o.doc = (document.querySelector('script[src*="?v="]') && (document.querySelector('script[src*="?v="]').getAttribute('src').match(/\?v=(\w+)/) || [])[1]) || null;
    return o; });
  r.charge = await lit();
  // (1) l'AA à l'écran, SEC secondes de vrai battement, le prix de l'école relevé chaque seconde
  r.aaMode = await ev(() => { if (typeof cycleTradeMode === 'function') { for (let i = 0; i < 3 && S.tradingMode !== 'sim'; i++) cycleTradeMode(); } return S.tradingMode; });
  r.serie = {};
  for (let s = 0; s < SEC; s++) {
    await page.waitForTimeout(1000);
    const x = await ev(() => { if (S.tradingMode !== 'sim') return null; const o = {}; Object.keys(PAIRS).forEach(p => { o[p] = S.pairStates[p] ? S.pairStates[p].price : null; }); return o; });
    if (x) Object.keys(x).forEach(p => { (r.serie[p] = r.serie[p] || []).push(x[p]); });
  }
  r.fin = await lit();
  r.corps = await ev(() => window.__corps);
  r.erreurs = perr.slice(); r.sortants = sortants;
  await ctx.close(); server.close();
  return r;
}
const rel = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-9;
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8983, 'avant'), ap = await passe(browser, NEW, 8984, 'apres');
  await browser.close();
  console.log('SONDE N° 106 · backup ' + path.basename(A.backup) + ' · avant ' + av.charge.doc + ' · après ' + ap.charge.doc + ' · ' + SEC + ' s d\'AA hors réseau');
  const P = Object.keys(REEL).filter(p => ap.fin.vol[p] !== undefined && av.fin.vol[p] !== undefined), P0 = P.filter(p => ap.charge.vol[p] !== undefined), PC = P.filter(p => !P0.includes(p));   // P0 : paires du code (02 PAIRS, candidats de 09b2) ; PC : ajoutées par Rams (11, après le chargement)
  const R1 = x => { const o = {}; P.forEach(p => { const c = (x.corps[p] || []).filter(v => isFinite(v)), s = (x.serie[p] || []).filter(v => isFinite(v));
    o[p] = { vol: x.charge.vol[p] !== undefined ? x.charge.vol[p] : x.fin.vol[p], regle: REGLE[p], jour: JOUR[p], n: c.length, pasMax: Math.max(0, ...c), pasMed: c.slice().sort((a, b) => a - b)[Math.floor(c.length / 2)] || 0,
      auDela: c.filter(v => v > JOUR[p]).length, min: Math.min(...s), max: Math.max(...s), prix: new Set(s).size }; }); return o; };
  const Ra = R1(av), Rp = R1(ap);
  P.forEach(p => console.log('  ' + p.padEnd(10) + ' réel ' + REEL[p] + ' · 24 h ' + (JOUR[p] || 0).toPrecision(3) + ' · AVANT vol ' + Ra[p].vol.toPrecision(3) + ' pas max ' + Ra[p].pasMax.toPrecision(3) + ' (' + Ra[p].auDela + '/' + Ra[p].n + ' au-delà de 24 h) école ' + Ra[p].min.toPrecision(4) + '…' + Ra[p].max.toPrecision(4)
    + ' · APRÈS vol ' + Rp[p].vol.toPrecision(3) + ' pas max ' + Rp[p].pasMax.toPrecision(3) + ' (' + Rp[p].auDela + '/' + Rp[p].n + ') école ' + Rp[p].min.toPrecision(4) + '…' + Rp[p].max.toPrecision(4)));
  R('départ : page prête, aucun prix réel arrivé au chargement (_pricesFetched faux), réseau coupé (requêtes sortantes refusées), AA à l\'écran ensuite (les deux versions)',
    av.pret && ap.pret && av.charge.fetched === false && ap.charge.fetched === false && av.fin.fetched === false && ap.fin.fetched === false && av.aaMode === 'sim' && ap.aaMode === 'sim' && av.sortants > 0 && ap.sortants > 0,
    { avant: [av.pret, av.charge.fetched, av.fin.fetched, av.aaMode, av.sortants], apres: [ap.pret, ap.charge.fetched, ap.fin.fetched, ap.aaMode, ap.sortants] });
  R('(0) après : au chargement, l\'amplitude de chaque paire du code (' + P0.length + ' paires) = la règle de 02 recalculée par la sonde depuis le backup ; celles ajoutées par Rams (' + PC.join(', ') + ') gardent leur amplitude sauvée, la même avant et après',
    P0.length >= 10 && P0.every(p => REGLE[p] && rel(ap.charge.vol[p], REGLE[p])) && PC.every(p => ap.fin.vol[p] === st.customPairs[p].vol && av.fin.vol[p] === ap.fin.vol[p]),
    P.map(p => [p, REGLE[p], ap.charge.vol[p], ap.fin.vol[p]]));
  R('(0b) témoin — avant : amplitude = constante du code (DOT 0,25 = ' + (0.25 / REEL['DOT/USDT'] * 100).toFixed(0) + ' % du prix, ADA 0,012, LINK 0,45, BNB 12) ; chaque paire du code au-dessus de la règle de 02',
    av.charge.vol['DOT/USDT'] === 0.25 && av.charge.vol['ADA/USDT'] === 0.012 && av.charge.vol['LINK/USDT'] === 0.45 && av.charge.vol['BNB/USDT'] === 12 && P0.every(p => av.charge.vol[p] > REGLE[p]),
    P0.map(p => [p, av.charge.vol[p], REGLE[p]]));
  R('(1) témoin — avant, ' + SEC + ' s d\'AA : des bougies de l\'école bougent PLUS en un pas que le marché réel en 24 h (DOT ' + Ra['DOT/USDT'].auDela + ' sur ' + Ra['DOT/USDT'].n + ', pas max ' + (Ra['DOT/USDT'].pasMax / REEL['DOT/USDT'] * 100).toFixed(1) + ' % du prix ; ' + P0.filter(p => Ra[p].auDela > 0).length + ' paires sur ' + P0.length + ')',
    Ra['DOT/USDT'].n >= 5 && Ra['DOT/USDT'].auDela > 0 && P0.filter(p => Ra[p].auDela > 0).length >= 3, Ra);
  R('(1b) après, ' + SEC + ' s d\'AA : AUCUNE bougie de l\'école ne bouge plus en un pas que le marché réel de sa paire en 24 h (' + P0.reduce((a, p) => a + Rp[p].n, 0) + ' bougies, ' + P0.length + ' paires ; DOT pas max ' + (Rp['DOT/USDT'].pasMax / REEL['DOT/USDT'] * 100).toFixed(3) + ' % du prix, 24 h : ' + (JOUR['DOT/USDT'] / REEL['DOT/USDT'] * 100).toFixed(2) + ' %)',
    P0.every(p => Rp[p].n >= 5 && Rp[p].auDela === 0), Rp);
  R('(1c) après : l\'école BOUGE (l\'amplitude ne la fige pas) — chaque paire a au moins 2 prix différents et des pas non nuls sur ' + SEC + ' s',
    P.every(p => Rp[p].prix >= 2) && P0.every(p => Rp[p].pasMax > 0), P.map(p => [p, Rp[p].prix, Rp[p].pasMax]));
  R('(2) EV et RE : prix identiques au backup, avant comme après (aucun prix réel ; la retouche ne touche que l\'amplitude de l\'école)',
    P.every(p => av.fin.ev[p] === st.walletStore.paperReal.pairStates[p].price && ap.fin.ev[p] === av.fin.ev[p] && (st.walletStore.real.pairStates[p] ? ap.fin.re[p] === st.walletStore.real.pairStates[p].price && av.fin.re[p] === ap.fin.re[p] : true)),
    { ev: [av.fin.ev, ap.fin.ev], re: [av.fin.re, ap.fin.re] });
  R('(2b) bornes de l\'école (go n° 105) : les mêmes avant et après', P.every(p => JSON.stringify(av.fin.bornes[p]) === JSON.stringify(ap.fin.bornes[p])), { avant: av.fin.bornes, apres: ap.fin.bornes });
  R('(3) page sans erreur (avant et après)', !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.mkdirSync(path.join(NEW, 'rejeu/out'), { recursive: true });
  fs.writeFileSync(path.join(NEW, 'rejeu/out/sonde_n106.json'), JSON.stringify({ reel: REEL, jour: JOUR, regle: REGLE, avant: Ra, apres: Rp, brut: { avant: av, apres: ap }, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
