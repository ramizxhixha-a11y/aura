// rejeu/sonde_n94.js — [GO N° 94 · 20/11/2026] vraie page, backup du pont (12 paires vivantes, GBP/USDT retirée ; EUR/USDT seule sans position dans aucun
// mode), tablette 800 × 1 280 : retirer la paire À L'ÉCRAN depuis l'écran Marché. AVANT / APRÈS.
// Usage : node rejeu/sonde_n94.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur, les passes l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Passe EV (mode du backup) : écran Marché, VRAI appui sur la puce EUR/USDT → EUR à l'écran ; « ⚖ Gérer les paires » → VRAI « ➖ retirer » d'EUR/USDT → « Fermer » ;
//   15 s de battement de l'écran Marché : erreurs rattrapées (simTick → window._decErr), paire, libellé, puces ; puis la carte EUR/USDT des mini-graphiques
//   (restée) : VRAI pointerdown / pointerup → paire à l'écran, 6 s de battement.
// Passe AA (même backup, lancé en AA) : même retrait, puis VRAI 04 forceTrade('long') (bouton « ⚡ FORCER LONG » du panneau Débat) → sur quelle paire ?
// Capture : rejeu/out/sonde_n94_<passe>_marche.png
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
const init = (mode) => `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); const s = ${JSON.stringify(JSON.stringify(st))};
  const o = JSON.parse(s); o.tradingMode = '${mode}'; localStorage.setItem('nexus_state_v2', JSON.stringify(o));
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', '${mode}');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };
const PAIRE = 'EUR/USDT', K = 'EUR_USDT';

async function passe(browser, ROOT, PORT, nom, mode) {
  const server = await serve(ROOT, PORT), r = { nom, mode };
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', q => (q.request().url().startsWith('http://127.0.0.1:' + PORT) ? q.continue() : q.abort())); await ctx.addInitScript(init(mode));
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret = await PRET(page); await page.waitForTimeout(6000);
  const ev = (fn, a) => page.evaluate(fn, a);
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  // erreurs rattrapées par le battement (01 : simTick → console.warn + window._decErr), comptées depuis ici
  await ev(() => { window.__dec = []; const o = window._decErr; window._decErr = function (e) { try { window.__dec.push(String(e && e.message || e).slice(0, 160)); } catch (_e) {} return o ? o.apply(this, arguments) : undefined; }; });
  const vue = () => ev(() => { const b = document.getElementById('pairSelWrap'), l = document.getElementById('mktPairLabel');
    return { active: S.activePair, vivante: !!PAIRS[S.activePair], page: S.currentPage, libelle: l ? l.textContent : null, prix: (document.getElementById('mktPrice') || {}).textContent || null,
      puces: b ? Array.from(b.children).map(c => c.getAttribute('data-pair')) : null, puceActive: b ? Array.from(b.children).filter(c => c.classList.contains('active')).map(c => c.getAttribute('data-pair')) : null,
      erreurs: window.__dec.length, derniere: window.__dec[window.__dec.length - 1] || null }; });
  r.depart = await ev((p) => ({ mode: S.tradingMode, auto: S.botAutoMode, active: S.activePair, vivantes: Object.keys(PAIRS).length, retirees: (S.removedPairs || []).slice(),
    positionsSur: ['sim', 'paperReal', 'real'].map(m => (S.walletStore[m].openPositions || []).filter(x => x.pair === p).length),
    positions: ['sim', 'paperReal', 'real'].map(m => (S.walletStore[m].openPositions || []).length) }), PAIRE);
  // 1. écran Marché, VRAI appui sur la puce EUR/USDT
  await ev(() => goPage(2)); await page.waitForTimeout(2500);
  try { await page.locator('#ppill_' + K).scrollIntoViewIfNeeded(); await page.click('#ppill_' + K, { timeout: 8000 }); r.clicPuce = true; } catch (e) { r.clicPuce = String(e).slice(0, 160); }
  await page.waitForTimeout(6000);
  r.surPaire = await vue();
  // 2. « ⚖ Gérer les paires » → VRAI « ➖ retirer » d'EUR/USDT → « Fermer »
  try {
    await page.click('#pairMgrBtn', { timeout: 8000 }); await page.waitForTimeout(500);
    await page.click(`#pairMgrModal button[onclick^="var r=removePair('${PAIRE}')"]`, { timeout: 8000 }); r.clicRetirer = true; await page.waitForTimeout(800);
    r.journal = await ev(() => (S.chainLog || []).slice(-1).map(l => l.desc)[0] || null);
    await page.click('#pairMgrModal button:has-text("Fermer")', { timeout: 8000 });
  } catch (e) { r.clicRetirer = String(e).slice(0, 200); }
  r.retiree = await ev((p) => ({ dansPAIRS: !!PAIRS[p], retirees: S.removedPairs.slice() }), PAIRE);
  const e0 = (await vue()).erreurs;
  await page.waitForTimeout(15000);
  r.apresRetrait = await vue(); r.apresRetrait.erreurs15s = r.apresRetrait.erreurs - e0;
  try { await page.locator('#candle-wrap-top').screenshot({ path: path.join(OUT, 'sonde_n94_' + nom + '_marche.png') }); } catch (e) { r.capture = String(e).slice(0, 120); }
  // 3. la carte EUR/USDT des mini-graphiques (03 drawMiniCharts) : restée ? VRAI appui
  r.carte = await ev((k) => !!document.getElementById('mci_' + k), K);
  if (r.carte) {
    const e1 = (await vue()).erreurs;
    try { const c = page.locator('#mci_' + K); await c.scrollIntoViewIfNeeded(); await c.dispatchEvent('pointerdown'); await c.dispatchEvent('pointerup'); r.appuiCarte = true; } catch (e) { r.appuiCarte = String(e).slice(0, 160); }
    await page.waitForTimeout(6000);
    r.apresCarte = await vue(); r.apresCarte.erreurs6s = r.apresCarte.erreurs - e1;
    await ev(() => { try { if (typeof closePairDetail === 'function') closePairDetail(); } catch (e) {} });
  }
  // 4. AA : « ⚡ FORCER LONG » (04 forceTrade) — sur quelle paire ?
  if (mode === 'sim') {
    r.force = await ev((p) => { const n0 = S.openPositions.length; let err = null; try { forceTrade('long'); } catch (e) { err = String(e.message || e); }
      const nouv = S.openPositions.slice(n0).map(x => ({ pair: x.pair, side: x.side, mise: x.stakeUsdt })); const log = (S.brainLog || [])[0] || null;
      return { err, nouvelles: nouv, surRetiree: S.openPositions.filter(x => x.pair === p).length, journal: log && log.event === 'FORCE' ? log.pair : null }; }, PAIRE);
    await page.waitForTimeout(3000);
    r.forceApres = await ev((p) => ({ surRetiree: S.openPositions.filter(x => x.pair === p).length, dansPAIRS: !!PAIRS[p] }), PAIRE);
  }
  r.erreurs = perr.slice(); r.dec = await ev(() => window.__dec.slice(0, 5));
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8941, 'avant_ev', 'paperReal'), ap = await passe(browser, NEW, 8942, 'apres_ev', 'paperReal');
  const avA = await passe(browser, OLD, 8943, 'avant_aa', 'sim'), apA = await passe(browser, NEW, 8944, 'apres_aa', 'sim');
  await browser.close();
  console.log('SONDE N° 94 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  console.log('  départ : ' + JSON.stringify(ap.depart));
  R('témoin réel : EV à l\'écran, 12 paires vivantes, GBP/USDT retirée, EUR/USDT sans position dans aucun mode (11 dans l\'EV) — les deux versions',
    [av, ap].every(x => x.depart.mode === 'paperReal' && x.depart.vivantes === 12 && JSON.stringify(x.depart.retirees) === '["GBP/USDT"]' && JSON.stringify(x.depart.positionsSur) === '[0,0,0]' && x.depart.positions[1] === 11),
    [av.depart, ap.depart]);
  R('VRAI appui sur la puce EUR/USDT (écran Marché) → EUR/USDT à l\'écran, « EUR / USDT », 0 erreur — les deux versions',
    [av, ap].every(x => x.clicPuce === true && x.surPaire.active === PAIRE && x.surPaire.page === 2 && x.surPaire.libelle === 'EUR / USDT' && x.surPaire.erreurs === 0), [av.surPaire, ap.surPaire]);
  R('VRAI « ➖ retirer » d\'EUR/USDT dans « Gérer les paires » : retirée dans les deux versions (mémoire conservée)',
    [av, ap].every(x => x.clicRetirer === true && !x.retiree.dansPAIRS && x.retiree.retirees.includes(PAIRE)), [av.retiree, ap.retiree, av.clicRetirer, ap.clicRetirer]);
  R('AVANT (le n° 94) : EUR/USDT reste à l\'écran, le battement lève (« color ») à chaque passage de l\'écran Marché ; prix, libellé et puces figés (puce EUR restée)',
    av.apresRetrait.active === PAIRE && !av.apresRetrait.vivante && av.apresRetrait.erreurs15s >= 10 && /color/.test(av.apresRetrait.derniere || '') && av.apresRetrait.puces.includes(PAIRE), av.apresRetrait);
  R('APRÈS : BTC/USDT à l\'écran, « BTC / USDT », puce BTC active, plus de puce EUR, journal « à l\'écran : BTC/USDT », 0 erreur en 15 s',
    ap.apresRetrait.active === 'BTC/USDT' && ap.apresRetrait.libelle === 'BTC / USDT' && JSON.stringify(ap.apresRetrait.puceActive) === '["BTC/USDT"]' && !ap.apresRetrait.puces.includes(PAIRE)
      && ap.apresRetrait.erreurs15s === 0 && /à l’écran : BTC\/USDT$/.test(ap.journal || ''), { apres: ap.apresRetrait, journal: ap.journal });
  R('carte EUR/USDT des mini-graphiques restée après le retrait (les deux versions — registre) ; APRÈS, son VRAI appui ne la remet pas à l\'écran : BTC/USDT reste, 0 erreur',
    av.carte && ap.carte && ap.appuiCarte === true && ap.apresCarte.active === 'BTC/USDT' && ap.apresCarte.erreurs6s === 0, { avant: av.apresCarte, apres: ap.apresCarte });
  R('AA, même retrait : avant EUR/USDT reste à l\'écran et lève ; après BTC/USDT, 0 erreur',
    avA.apresRetrait.active === PAIRE && avA.apresRetrait.erreurs15s >= 10 && apA.apresRetrait.active === 'BTC/USDT' && apA.apresRetrait.erreurs15s === 0, { avant: avA.apresRetrait, apres: apA.apresRetrait });
  R('AA, « ⚡ FORCER LONG » après le retrait : APRÈS, jamais sur EUR/USDT (la paire retirée) ; avant : ' + JSON.stringify(avA.force),
    apA.force && !apA.force.err && apA.force.surRetiree === 0 && apA.forceApres.surRetiree === 0 && apA.force.journal === 'BTC/USDT', { avant: avA.force, apres: apA.force });
  R('pages prêtes ; APRÈS aucune erreur de page ; AVANT seulement celles du n° 94 (« color », non rattrapées : appui sur la carte, rendu différé de l\'écran)',
    [av, ap, avA, apA].every(x => x.pret) && !ap.erreurs.length && !apA.erreurs.length && [av, avA].every(x => x.erreurs.every(m => /reading 'color'/.test(m))), [av, ap, avA, apA].map(x => x.erreurs));
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.writeFileSync(path.join(OUT, 'sonde_n94.json'), JSON.stringify({ avant: av, apres: ap, avantAA: avA, apresAA: apA, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
