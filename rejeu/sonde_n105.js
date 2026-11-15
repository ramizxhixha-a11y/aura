// rejeu/sonde_n105.js — [GO N° 105 · 15/11/2026] vraie page, backup du pont (MANU), tablette 800 × 1 280, RÉSEAU COUPÉ (l'app lancée sans réseau, ETAT n° 105) :
// le prix de l'école (AA) avant le 1er prix réel, AVANT / APRÈS. Avant : 08 _simCandleStep borne le prix aux minP / maxP CONSTANTS du code (02 PAIRS,
// candidats de 09b2) — DOT (minP 3, réel 0,734) passe à 3 $, AVAX (minP 8, réel 7,217) ne descend jamais sous 8. Après : bornes reposées au chargement depuis
// le dernier prix réel gardé (S.realCandles), règle de 02 (× 0,65 / × 1,55).
// Usage : node rejeu/sonde_n105.js --root . --avant <copie du code d'avant> --backup <backup.json> [--secondes 45]
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : (0) au chargement : aucun prix réel arrivé (_pricesFetched faux), bornes de chaque paire ; (1) AA à l'écran, N s de vrai battement, le prix de
// l'école de chaque paire relevé chaque seconde ; (2) EV et RE : leurs prix ne bougent pas (aucun prix réel) et sont les mêmes avant / après ;
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
  r.erreurs = perr.slice(); r.sortants = sortants;
  await ctx.close(); server.close();
  return r;
}
const rel = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-9;
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8981, 'avant'), ap = await passe(browser, NEW, 8982, 'apres');
  await browser.close();
  console.log('SONDE N° 105 · backup ' + path.basename(A.backup) + ' · avant ' + av.charge.doc + ' · après ' + ap.charge.doc + ' · ' + SEC + ' s d\'AA hors réseau');
  const P = Object.keys(REEL).filter(p => ap.fin.bornes[p] && av.fin.bornes[p]), P0 = P.filter(p => ap.charge.bornes[p]);   // P : toutes les paires (celles ajoutées par Rams, 11, arrivent après le chargement) ; P0 : celles du code (02 PAIRS, candidats de 09b2)
  const resume = x => { const o = {}; P.forEach(p => { const s = (x.serie[p] || []).filter(v => isFinite(v)); o[p] = { reel: REEL[p], depart: x.charge.aa[p], min: Math.min(...s), max: Math.max(...s),
    bornes: x.fin.bornes[p], n: s.length, fin: s.slice(Math.floor(s.length / 2)), horsRegle: s.filter(v => v < REEL[p] * 0.65 * (1 - 1e-9) || v > REEL[p] * 1.55 * (1 + 1e-9)).length,
    // dépassement de la règle : 02 _simulationTickAll (marche GBM, SANS borne, inchangée) bouge aussi le prix de l'école hors réseau entre deux bougies (un tick sur deux)
    depasse: Math.max(0, ...s.map(v => Math.max(REEL[p] * 0.65 / v - 1, v / (REEL[p] * 1.55) - 1))), aConstante: s.filter(v => CONST[p] && (v === CONST[p][0] || v === CONST[p][1])).length }; }); return o; };
  const CONST = {}; P.filter(p => av.charge.bornes[p]).forEach(p => { CONST[p] = av.charge.bornes[p]; });   // les bornes constantes du code, lues dans la page d'AVANT au chargement
  const Ra = resume(av), Rp = resume(ap);
  P.forEach(p => console.log('  ' + p.padEnd(10) + ' réel ' + REEL[p] + ' · AVANT bornes ' + JSON.stringify(av.fin.bornes[p]) + ' école ' + Ra[p].min.toPrecision(5) + '…' + Ra[p].max.toPrecision(5)
    + ' · APRÈS bornes [' + ap.fin.bornes[p].map(v => v.toPrecision(5)).join(', ') + '] école ' + Rp[p].min.toPrecision(5) + '…' + Rp[p].max.toPrecision(5)));
  R('départ : page prête, aucun prix réel arrivé au chargement (_pricesFetched faux), réseau coupé (requêtes sortantes refusées), AA à l\'écran ensuite (les deux versions)',
    av.pret && ap.pret && av.charge.fetched === false && ap.charge.fetched === false && av.fin.fetched === false && ap.fin.fetched === false && av.aaMode === 'sim' && ap.aaMode === 'sim' && av.sortants > 0 && ap.sortants > 0,
    { avant: [av.pret, av.charge.fetched, av.fin.fetched, av.aaMode, av.sortants], apres: [ap.pret, ap.charge.fetched, ap.fin.fetched, ap.aaMode, ap.sortants] });
  R('(0) après : au chargement, les bornes de chaque paire du code (02 PAIRS, candidats de 09b2 : ' + P0.length + ' paires) = dernier prix réel gardé × 0,65 / × 1,55 ; celles ajoutées par Rams (11) gardent leurs bornes sauvées (posées par 02 au dernier prix réel)',
    P0.length >= 10 && P0.every(p => rel(ap.charge.bornes[p][0], REEL[p] * 0.65) && rel(ap.charge.bornes[p][1], REEL[p] * 1.55))
      && P.filter(p => !P0.includes(p)).every(p => JSON.stringify(ap.fin.bornes[p]) === JSON.stringify([st.customPairs[p].minP, st.customPairs[p].maxP]) && JSON.stringify(av.fin.bornes[p]) === JSON.stringify(ap.fin.bornes[p])),
    P.map(p => [p, REEL[p], ap.charge.bornes[p] || null, ap.fin.bornes[p]]));
  R('(0b) témoin — avant : bornes constantes du code, DOT [3, 30] et AVAX [8, 80] ne contiennent pas leur prix réel (0,734 ; 7,217)',
    av.charge.bornes['DOT/USDT'][0] === 3 && av.charge.bornes['DOT/USDT'][1] === 30 && av.charge.bornes['AVAX/USDT'][0] === 8 && REEL['DOT/USDT'] < 3 && REEL['AVAX/USDT'] < 8,
    { DOT: av.charge.bornes['DOT/USDT'], AVAX: av.charge.bornes['AVAX/USDT'] });
  const mn = a => Math.min(...a);
  // (avant, DOT : selon que l'attraction vers le dernier prix réel gardé — 02 blendRealPrices, ps._targetPrice du backup — est éteinte ou non avant le 1er pas de
  //  bougie, DOT reste à 3 $ ou va et vient entre 3 $ et ≈ 0,76 toutes les 3 s : les deux se voient d'une passe à l'autre ; le témoin exige seulement d'atteindre 3 $)
  const a3 = (Ra['DOT/USDT'].serie = (av.serie['DOT/USDT'] || []).filter(v => v >= 3)).length;
  R('(1) témoin — avant, ' + SEC + ' s d\'AA : DOT atteint 3 $ (' + a3 + ' relevés à 3 $ ou plus, max ' + Ra['DOT/USDT'].max.toPrecision(4) + ' ; ' + Ra['DOT/USDT'].horsRegle + ' relevés hors règle) ; AVAX touche sa borne constante 8 (' + Ra['AVAX/USDT'].aConstante + ' relevés) ; ADA la sienne, 0,15 (' + Ra['ADA/USDT'].aConstante + ', au hasard de la marche)',
    Ra['DOT/USDT'].n >= SEC - 2 && a3 >= 3 && Ra['DOT/USDT'].horsRegle > 0 && Ra['AVAX/USDT'].aConstante > 0, { DOT: Ra['DOT/USDT'], AVAX: Ra['AVAX/USDT'], ADA: Ra['ADA/USDT'] });
  const dep = Math.max(...P.map(p => Rp[p].depasse));
  R('(1b) après, ' + SEC + ' s d\'AA : le prix de l\'école de chaque paire reste dans [0,65 ; 1,55] × son dernier prix réel, au pas GBM de 02 près (dépassement max ' + (dep * 100).toFixed(3) + ' %, ' + P.reduce((a, p) => a + Rp[p].horsRegle, 0) + ' relevés) ; aucun relevé à une borne constante du code ; DOT ' + Rp['DOT/USDT'].min.toPrecision(4) + '…' + Rp['DOT/USDT'].max.toPrecision(4) + ', AVAX ' + Rp['AVAX/USDT'].min.toPrecision(4) + '…' + Rp['AVAX/USDT'].max.toPrecision(4),
    P.every(p => Rp[p].n >= SEC - 2 && Rp[p].depasse < 0.01 && Rp[p].aConstante === 0) && Rp['DOT/USDT'].max < 3, Rp);
  R('(1c) après : l\'école BOUGE (la borne ne fige pas le prix) — chaque paire a au moins 2 prix différents sur ' + SEC + ' s',
    P.every(p => new Set(ap.serie[p] || []).size >= 2), P.map(p => [p, new Set(ap.serie[p] || []).size]));
  R('(2) EV et RE : prix identiques au backup, avant comme après (aucun prix réel ; la retouche ne touche que les bornes de l\'école)',
    P.every(p => av.fin.ev[p] === st.walletStore.paperReal.pairStates[p].price && ap.fin.ev[p] === av.fin.ev[p] && (st.walletStore.real.pairStates[p] ? ap.fin.re[p] === st.walletStore.real.pairStates[p].price && av.fin.re[p] === ap.fin.re[p] : true)),
    { ev: [av.fin.ev, ap.fin.ev], re: [av.fin.re, ap.fin.re] });
  R('(2b) amplitude de l\'école (cfg.vol) : la même avant et après (hors mission : registre n° 106)', P.every(p => av.charge.vol[p] === ap.charge.vol[p]), { avant: av.charge.vol, apres: ap.charge.vol });
  R('(3) page sans erreur (avant et après)', !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.mkdirSync(path.join(NEW, 'rejeu/out'), { recursive: true });
  fs.writeFileSync(path.join(NEW, 'rejeu/out/sonde_n105.json'), JSON.stringify({ reel: REEL, avant: Ra, apres: Rp, brut: { avant: av, apres: ap }, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
