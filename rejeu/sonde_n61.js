// rejeu/sonde_n61.js — [GO N° 61 · 15/11/2026] vraie page, backup du pont (EV : 11 positions de la voix), tablette 800 × 1 280 : les ouvertures À LA MAIN
// passent-elles le contrôle de capital ? AVANT / APRÈS.
// Usage : node rejeu/sonde_n61.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : EV à l'écran ; la fiche MAN de EUR/USDT (vrai openManDetail, vrais champs, vrai bouton LONG) avec 200 $ ; « ✓ Appliquer » d'une suggestion
// (vrai applyBotSuggestion, 150 $) ; l'AA : 3 positions à la main (600 / 600 / 490 $) par la vraie fiche, 1 200 $ passés du trading à la caisse, puis
// « Inverser » celle de 490 $ (vrai manuInvert) ;
// ce que le BOT lit dans l'EV (09j validateInvestmentCapProvisioned, validateTotalExposure) inchangé ; 20 s de vrai battement sans erreur de page.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
if (!A.backup || !A.avant) { console.error('--backup <fichier> et --avant <dossier> requis'); process.exit(2); }
const NEW = path.resolve(A.root || '.'), OLD = path.resolve(A.avant);
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
st.botAutoMode = false;   // MANU, comme la tablette au 15/11 00:26 : seul Rams ouvre
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };

async function passe(browser, ROOT, PORT, nom) {
  const server = await serve(ROOT, PORT), r = { nom };
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', q => (q.request().url().startsWith('http://127.0.0.1:' + PORT) ? q.continue() : q.abort())); await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret = await PRET(page); await page.waitForTimeout(6000);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { window.__toasts = []; const t = window.showToast; window.showToast = function (m) { try { window.__toasts.push(String(m)); } catch (e) {} return t.apply(this, arguments); }; });
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  const etat = () => ev(() => ({ mode: S.tradingMode, trading: Math.round(S.tradingAccount * 100) / 100, n: S.openPositions.length, eng: Math.round(S.openPositions.reduce((s, p) => s + (p.stakeUsdt || 0), 0) * 100) / 100,
    eur: (S.openPositions.find(p => p.pair === 'EUR/USDT') || {}).stakeUsdt || null }));
  r.depart = await etat();
  // ce que le BOT lit dans l'EV (avant toute ouverture)
  r.bot = await ev(() => { const T = S.tradingAccount; const a = validateInvestmentCapProvisioned(T * 0.3), b = validateTotalExposure(T * 0.3, 0, 0.5);
    return { cap: Math.round(a.cap * 100) / 100, ok: a.ok, vte: b.ok, p5: !!b.phase5 }; });
  // 1. la fiche MAN de EUR/USDT, 200 $, bouton LONG (vrais clics)
  await ev(() => { window.__toasts = []; openManDetail('EUR/USDT'); });
  await page.fill('#manIn_stake_EUR_USDT', '200');
  await page.click('button[onclick*="_openManTrade(\'EUR/USDT\',\'long\')"]');
  await page.waitForTimeout(800);
  r.fiche = Object.assign(await etat(), { toasts: await ev(() => window.__toasts.slice()) });
  // 2. « ✓ Appliquer » d'une suggestion de 150 $ — la position EUR est d'abord fermée par Rams (✕), comme sur la tablette
  await ev(() => { const p = S.openPositions.find(x => x.pair === 'EUR/USDT'); if (p) closePosition(p.id); window.__toasts = []; applyBotSuggestion('EUR/USDT', 'long', 150); });
  await page.waitForTimeout(500);
  r.appliquer = Object.assign(await etat(), { toasts: await ev(() => window.__toasts.slice()) });
  // 3. l'AA : 3 positions à la main par la fiche (490 / 300 / 300 $), puis « Inverser » la 1re
  r.aa = await ev(async () => {
    const out = {}; const p0 = S.openPositions.find(x => x.pair === 'EUR/USDT'); if (p0) closePosition(p0.id);
    if (typeof cycleTradeMode === 'function') { for (let i = 0; i < 3 && S.tradingMode !== 'sim'; i++) cycleTradeMode(); }
    out.mode = S.tradingMode; if (S.tradingMode !== 'sim') return out;
    S.tradingAccount = 3000;   // l'AA du backup n'a que 121 $ : 3 000 $ posés par la sonde, puis 3 positions par la vraie fiche MAN
    out.trading0 = S.tradingAccount;
    for (const [p, m] of [['SOL/USDT', 600], ['ETH/USDT', 600], ['BTC/USDT', 490]]) { openManDetail(p); const k = p.replace('/', '_'); document.getElementById('manIn_stake_' + k).value = String(m); _openManTrade(p, 'long'); }
    S.tradingAccount -= 1200; S.cashAccount = (S.cashAccount || 0) + 1200;   // comme un transfert trading → caisse de Rams : 110 $ restent au trading
    out.ouvertes = S.openPositions.map(x => [x.pair, x.side, x.stakeUsdt]); out.tradingAvant = Math.round(S.tradingAccount * 100) / 100;
    window.__toasts = []; manuInvert('BTC/USDT');
    const b = S.openPositions.find(x => x.pair === 'BTC/USDT'); out.inverse = b ? [b.side, Math.round(b.stakeUsdt * 100) / 100] : null; out.toasts = window.__toasts.slice();
    return out;
  });
  await page.waitForTimeout(20000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8941, 'avant'), ap = await passe(browser, NEW, 8942, 'après');
  await browser.close();
  console.log('SONDE N° 61 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  console.log('  départ (EV) : ' + JSON.stringify(ap.depart));
  R('départ : EV à l\'écran, 11 positions de la voix, ~1 056 $ engagés (les deux versions)', av.depart.mode === 'paperReal' && av.depart.n === 11 && ap.depart.n === 11 && Math.abs(ap.depart.eng - 1055.89) < 0.01, [av.depart, ap.depart]);
  R('fiche MAN, 200 $ sur EUR/USDT : avant REFUSÉE (« Capital max atteint »), après OUVERTE à 200 $', !av.fiche.eur && av.fiche.toasts.some(t => /Capital max atteint/.test(t)) && ap.fiche.eur === 200 && Math.abs(ap.fiche.trading - (ap.depart.trading - 200)) < 0.01,
    { avant: av.fiche, apres: ap.fiche });
  R('« ✓ Appliquer » 150 $ : avant 17 $ ouverts, après 150 $', av.appliquer.eur === 17 && ap.appliquer.eur === 150, { avant: av.appliquer, apres: ap.appliquer });
  R('AA, « Inverser » la position de 490 $ (2 autres de 600 $, 110 $ au trading) : avant non rouverte, après rouverte en SHORT à 490 $',
    av.aa.mode === 'sim' && ap.aa.mode === 'sim' && av.aa.ouvertes.length === 3 && ap.aa.ouvertes.length === 3 && !(av.aa.inverse) && av.aa.toasts.some(t => /non rouvert/.test(t))
      && ap.aa.inverse && ap.aa.inverse[0] === 'short' && ap.aa.inverse[1] === 490, { avant: av.aa, apres: ap.aa });
  R('ce que le BOT lit dans l\'EV est le même avant et après (plafond phase 5 ~59 $, refus)', JSON.stringify(av.bot) === JSON.stringify(ap.bot) && ap.bot.ok === false && Math.abs(ap.bot.cap - 59.44) < 0.05, { avant: av.bot, apres: ap.bot });
  R('page prête et sans erreur (avant et après), 20 s de battement', av.pret && ap.pret && !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.mkdirSync(path.join(NEW, 'rejeu/out'), { recursive: true });
  fs.writeFileSync(path.join(NEW, 'rejeu/out/sonde_n61.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
