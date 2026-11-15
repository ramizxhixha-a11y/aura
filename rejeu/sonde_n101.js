// rejeu/sonde_n101.js — [GO N° 101 · 15/11/2026] vraie page, backup du pont (EV, index ×0, AVAX réglée ×2 avec une position de la voix), tablette 800 × 1 280 :
// Rams peut-il VOIR et CHANGER le levier gardé d'AVAX ? AVANT / APRÈS.
// Usage : node rejeu/sonde_n101.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : accueil, barre « Positions en cours Man » ouverte, VRAI clic sur la brique AVAX → fiche MAN ; avant : aucune commande du levier de la paire (le seul
// écrivain est dans le panneau 03, masqué) ; après : section « ⚡ Levier de la paire » ×2 + « inactif », VRAI clic sur « − » → ×1 dans l'EV seul, argent et
// positions identiques ; l'autosave (25 s) puis une relance de la page : le réglage est gardé ; « + » → ×2 ; 20 s de battement sans erreur de page.
// Capture : rejeu/out/sonde_n101_<passe>_fiche.png
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
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  const leviers = () => ev(() => ['sim', 'paperReal', 'real'].map(m => S.walletStore[m].pairStates['AVAX/USDT'].pairLeverage));
  await ev(() => { window.__argent = () => JSON.stringify(['sim', 'paperReal', 'real'].map(m => { const w = S.walletStore[m];
    return [w.tradingAccount, w.cashAccount, w.leverage, w.leverageBorrowed, (w.openPositions || []).map(p => [p.id, p.pair, p.side, p.stakeUsdt, p.totalExposure, p.levBorrowed, p.entryPrice]),
      Object.keys(w.pairStates).map(k => [k, w.pairStates[k].stake, k === 'AVAX/USDT' && m === 'paperReal' ? '·' : w.pairStates[k].pairLeverage])]; })); });
  r.depart = { mode: await ev(() => S.tradingMode), index: await ev(() => S.leverage), auto: await ev(() => S.botAutoMode), leviers: await leviers(),
    avaxVoix: await ev(() => { const p = S.openPositions.find(x => x.pair === 'AVAX/USDT'); return p ? p._voix || null : null; }),
    panneau03Masque: await ev(() => { const w = document.getElementById('pairPosButtons'); return !!w && getComputedStyle(w).display === 'none'; }) };
  // 1. accueil, barre MAN ouverte, VRAI clic sur la brique AVAX
  await ev(() => { goPage(0); const b = document.getElementById('manBar'); if (b && !b.classList.contains('open')) toggleBar('man'); });
  await page.waitForTimeout(1200);
  try { await page.locator('#manbrick_AVAX_USDT').scrollIntoViewIfNeeded(); await page.click('#manbrick_AVAX_USDT', { timeout: 8000 }); r.clicBrique = true; }
  catch (e) { r.clicBrique = String(e).slice(0, 160); await ev(() => openManDetail('AVAX/USDT')); }
  await page.waitForTimeout(800);
  const lireFiche = () => ev(() => { const o = document.getElementById('pairDetailOverlay'), v = document.getElementById('manPairLev_AVAX_USDT'), n = document.getElementById('manPairLevNote_AVAX_USDT');
    const t = o ? o.textContent : ''; /* textContent : les titres de section sont en capitales par le CSS */ const vis = e => !!(e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden');
    return { ouverte: !!(o && o.classList.contains('open')), voix: /Position de la voix tendance/.test(t), section: /⚡ Levier de la paire/.test(t), valeur: v ? v.textContent : null, valeurVisible: vis(v), note: n ? n.innerText : null,
      boutons: Array.from(document.querySelectorAll('#pairDetailOverlay button')).filter(b => /_manPairLev\('AVAX\/USDT',(-1|1)\)/.test(b.getAttribute('onclick') || '') && vis(b)).length }; });
  r.fiche = await lireFiche();
  try { const sec = await page.$(r.fiche.section ? '#manPairLev_AVAX_USDT' : '#pairDetailOverlay .detail-section'); const box = sec && await sec.evaluateHandle(e => e.closest('.detail-section'));
    if (box) { await box.asElement().scrollIntoViewIfNeeded(); await box.asElement().screenshot({ path: path.join(OUT, 'sonde_n101_' + nom + '_fiche.png') }); } } catch (e) { r.capture = String(e).slice(0, 120); }
  // 2. clic sur « − » (après seulement : avant, il n'existe pas) — le vrai bouton reçoit un vrai événement click DANS le même appel que les deux relevés
  //    de l'argent (le moteur réécrit les mises de base des paires à son battement : un relevé de part et d'autre d'un clic de Playwright peut l'enjamber)
  const rel = await ev(() => { const b = document.querySelector('button[onclick="_manPairLev(\'AVAX/USDT\',-1)"]');
    const a1 = window.__argent(); if (b) { b.scrollIntoView(); b.click(); } const a2 = window.__argent(); return { a1, a2, clic: !!b }; });
  r.argentAvant = rel.a1; r.argentApres = rel.a2; r.clicMoins = rel.clic; await page.waitForTimeout(400);
  r.apresMoins = Object.assign(await lireFiche(), { leviers: await leviers() });
  // 3. autosave (25 s) puis relance de la page : le réglage est-il gardé ?
  await page.waitForTimeout(27000);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret2 = await PRET(page); await page.waitForTimeout(4000);
  r.apresRelance = { mode: await ev(() => S.tradingMode), leviers: await leviers() };
  // 4. « + » → ×2 (après seulement)
  await ev(() => openManDetail('AVAX/USDT')); await page.waitForTimeout(600);
  if ((await lireFiche()).boutons) { await page.click('button[onclick="_manPairLev(\'AVAX/USDT\',1)"]'); await page.waitForTimeout(400); }
  r.apresPlus = Object.assign(await lireFiche(), { leviers: await leviers() });
  await page.waitForTimeout(20000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8961, 'avant'), ap = await passe(browser, NEW, 8962, 'apres');
  await browser.close();
  console.log('SONDE N° 101 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  console.log('  départ : ' + JSON.stringify(ap.depart));
  R('témoin réel : EV à l\'écran, index ×0, MANU, AVAX ×2 dans l\'EV seul (AA, RE ×1), position de la voix ; panneau 03 masqué — les deux versions',
    [av, ap].every(x => x.depart.mode === 'paperReal' && x.depart.index === 0 && x.depart.auto === false && JSON.stringify(x.depart.leviers) === '[1,2,1]' && x.depart.avaxVoix === 'tendance' && x.depart.panneau03Masque), [av.depart, ap.depart]);
  R('VRAI clic sur la brique AVAX → fiche MAN ouverte, position de la voix montrée — les deux versions', [av, ap].every(x => x.clicBrique === true && x.fiche.ouverte && x.fiche.voix), [av.clicBrique, ap.clicBrique, av.fiche, ap.fiche]);
  R('avant : aucune commande du levier de la paire dans la fiche ; après : « ⚡ Levier de la paire » ×2 visible, « − » et « + », « en EV », « ×2 inactif »',
    !av.fiche.section && av.fiche.boutons === 0 && ap.fiche.section && ap.fiche.valeur === '×2' && ap.fiche.valeurVisible && ap.fiche.boutons === 2 && /en EV/.test(ap.fiche.note || '') && /Levier général ×0 : aucun emprunt, ×2 inactif\./.test(ap.fiche.note || ''),
    { avant: av.fiche, apres: ap.fiche });
  R('après, VRAI clic sur « − » : AVAX ×1 dans l\'EV seul (AA, RE inchangés), la fiche montre ×1 sans « inactif » ; avant : rien ne peut le changer (×2 reste)',
    JSON.stringify(av.apresMoins.leviers) === '[1,2,1]' && JSON.stringify(ap.apresMoins.leviers) === '[1,1,1]' && ap.apresMoins.valeur === '×1' && !/inactif/.test(ap.apresMoins.note || ''),
    { avant: av.apresMoins, apres: ap.apresMoins });
  R('après, le clic sur « − » ne change que ce réglage : argent, positions, mises et autres réglages des 3 modes identiques juste avant / juste après (relevés dans le même appel que le clic)', ap.clicMoins === true && av.clicMoins === false && ap.argentAvant === ap.argentApres && av.argentAvant === av.argentApres,
    { clic: [av.clicMoins, ap.clicMoins], av: av.argentAvant === av.argentApres, ap: ap.argentAvant === ap.argentApres });
  R('autosave puis relance de la page : après, AVAX reste ×1 dans l\'EV (avant : ×2)', ap.pret2 && av.pret2 && JSON.stringify(ap.apresRelance.leviers) === '[1,1,1]' && JSON.stringify(av.apresRelance.leviers) === '[1,2,1]',
    { avant: av.apresRelance, apres: ap.apresRelance });
  R('après, « + » : AVAX revient à ×2 dans l\'EV, « ×2 inactif » redit', JSON.stringify(ap.apresPlus.leviers) === '[1,2,1]' && ap.apresPlus.valeur === '×2' && /×2 inactif/.test(ap.apresPlus.note || ''), ap.apresPlus);
  R('pages prêtes et sans erreur (avant et après), 20 s de battement', av.pret && ap.pret && !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.writeFileSync(path.join(OUT, 'sonde_n101.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
