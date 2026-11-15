// rejeu/sonde_n99.js — [GO N° 99 · 15/11/2026] vraie page, backup du pont (EV, index ×0, AVAX réglée ×2), tablette 800 × 1 280 : le levier de paire
// réduit à l'index ×0 est-il DIT, et l'écran montre-t-il ce qui s'appliquera ? AVANT / APRÈS.
// Usage : node rejeu/sonde_n99.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Témoin réel : dans le backup, AVAX/USDT est réglée ×2 dans l'EV, index ×0 — mais AVAX porte une position de la voix (une seule position par paire) ; la
// sonde règle donc aussi EUR/USDT (sans position) à ×2, mise 60 $ — c'est dit dans la sortie.
// Étapes : carte de paire EUR/USDT (accueil, vrai renderActionsGrid) ; fiche MAN de EUR/USDT (vrai openManDetail, vrais champs, vrai bouton LONG ; avant :
// levier 3 saisi) ; « ✓ Appliquer » (vrai applyBotSuggestion, 60 $) ; toasts VISIBLES (niveau ≠ info : le niveau info est masqué hors mode verbeux) ;
// l'argent après chaque ouverture identique avant / après ; 20 s de vrai battement sans erreur de page. Captures : rejeu/out/sonde_n99_<passe>_{carte,fiche}.png
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
  // chaque toast avec son niveau : visible = niveau ≠ info (08 showToast masque l'info hors mode verbeux)
  await ev(() => { window.__toasts = []; const t = window.showToast; window.showToast = function (m, d, l) { try { window.__toasts.push([String(m), l || 'info']); } catch (e) {} return t.apply(this, arguments); }; });
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  const etat = () => ev(() => { const p = S.openPositions.find(x => x.pair === 'EUR/USDT');
    return { mode: S.tradingMode, index: S.leverage, trading: Math.round(S.tradingAccount * 1e6) / 1e6, dette: S.leverageBorrowed, n: S.openPositions.length,
      eur: p ? { mise: p.stakeUsdt, expo: p.totalExposure, emprunt: p.levBorrowed } : null }; });
  r.depart = Object.assign(await etat(), { avax: await ev(() => S.pairStates['AVAX/USDT'].pairLeverage), avaxPos: await ev(() => !!S.openPositions.find(p => p.pair === 'AVAX/USDT')), auto: await ev(() => S.botAutoMode) });
  // la sonde règle EUR/USDT (sans position) comme AVAX : ×2, mise 60 $
  await ev(() => { S.pairStates['EUR/USDT'].pairLeverage = 2; S.pairStates['EUR/USDT'].stake = 60; });
  // 1. carte de paire (accueil)
  // (le moteur réécrit la mise de base de EUR/USDT à chaque battement : réglée et lue dans le même appel, comme le battement de la carte la lit)
  await ev(() => { goPage(0); });
  await page.waitForTimeout(1500);
  r.carte = await ev(() => { S.pairStates['EUR/USDT'].pairLeverage = 2; S.pairStates['EUR/USDT'].stake = 60; renderActionsGrid();
    const e = document.getElementById('ac2_st_EUR_USDT'); const f = document.getElementById('ac2_fee_EUR_USDT'); return { badge: e ? e.textContent : null, frais: f ? f.textContent : null, visible: !!(e && e.offsetParent && e.getBoundingClientRect().width > 0) }; });
  try { const card = await page.$('#ac2_st_EUR_USDT'); const box = card && await card.evaluateHandle(e => { let x = e; while (x && x.parentElement && x.parentElement.id !== 'actionsGrid') x = x.parentElement; return x || e; });
    if (box) { await box.asElement().scrollIntoViewIfNeeded(); await box.asElement().screenshot({ path: path.join(OUT, 'sonde_n99_' + nom + '_carte.png') }); } } catch (e) { r.captureCarte = String(e).slice(0, 120); }
  // 2. fiche MAN de EUR/USDT : champ « Levier × », puis vrai bouton LONG
  await ev(() => { window.__toasts = []; S.chainLog.length = 0; openManDetail('EUR/USDT'); });
  await page.waitForTimeout(600);
  r.ficheChamp = await ev(() => { const i = document.getElementById('manIn_lev_EUR_USDT'), n = document.getElementById('manLevNote_EUR_USDT'); return { existe: !!i, desactive: i ? i.disabled : null, val: i ? i.value : null, note: n ? n.innerText : null }; });
  try { const sec = await page.$('#manIn_lev_EUR_USDT'); const box = sec && await sec.evaluateHandle(e => e.closest('.detail-section')); if (box) await box.asElement().screenshot({ path: path.join(OUT, 'sonde_n99_' + nom + '_fiche.png') }); } catch (e) { r.captureFiche = String(e).slice(0, 120); }
  await page.fill('#manIn_stake_EUR_USDT', '60');
  r.saisieLevier = 'non tentée';
  if (!r.ficheChamp.desactive) { await page.fill('#manIn_lev_EUR_USDT', '3'); r.saisieLevier = '3'; }
  await page.click('button[onclick*="_openManTrade(\'EUR/USDT\',\'long\')"]');
  await page.waitForTimeout(800);
  r.fiche = Object.assign(await etat(), { toasts: await ev(() => window.__toasts.slice()), journal: await ev(() => S.chainLog.map(l => l.desc).filter(d => /EUR\/USDT/.test(d))) });
  // 3. « ✓ Appliquer » 60 $ : la position EUR est d'abord fermée (✕ de Rams)
  await ev(() => { const p = S.openPositions.find(x => x.pair === 'EUR/USDT'); if (p) closePosition(p.id); window.__toasts = []; S.chainLog.length = 0; });
  r.avantAppliquer = await etat();
  await ev(() => applyBotSuggestion('EUR/USDT', 'long', 60));
  await page.waitForTimeout(500);
  r.appliquer = Object.assign(await etat(), { toasts: await ev(() => window.__toasts.slice()), journal: await ev(() => S.chainLog.map(l => l.desc).filter(d => /EUR\/USDT/.test(d))) });
  r.avaxFin = await ev(() => S.pairStates['AVAX/USDT'].pairLeverage);
  await page.waitForTimeout(20000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
const visibles = t => t.filter(x => x[1] !== 'info').map(x => x[0]);
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8951, 'avant'), ap = await passe(browser, NEW, 8952, 'apres');
  await browser.close();
  console.log('SONDE N° 99 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  console.log('  départ (EV) : ' + JSON.stringify(ap.depart) + ' · la sonde règle EUR/USDT à ×2, mise 60 $');
  R('témoin réel : EV à l\'écran, index ×0, AVAX/USDT réglée ×2 (avec une position de la voix), MANU — les deux versions',
    av.depart.mode === 'paperReal' && ap.depart.mode === 'paperReal' && av.depart.index === 0 && ap.depart.index === 0 && ap.depart.avax === 2 && av.depart.avax === 2 && ap.depart.auto === false, [av.depart, ap.depart]);
  R('carte de paire EUR/USDT ×2 : avant « $60 ×2 =$120 » (promet 120 $), après « $60 ×2 inactif · levier ×0 »',
    /\$60\s*×2\s*=\$120/.test(av.carte.badge || '') && /^\$60\s*×2 inactif · levier ×0$/.test((ap.carte.badge || '').trim()), { avant: av.carte, apres: ap.carte });
  R('fiche MAN : avant champ « Levier × » libre (1 à 10) ; après verrouillé à ×1 avec « Levier général ×0 : aucun emprunt, le trade s\'ouvre en ×1 »',
    av.ficheChamp.existe && !av.ficheChamp.desactive && !av.ficheChamp.note && ap.ficheChamp.desactive === true && ap.ficheChamp.val === '1' && /Levier général ×0 : aucun emprunt, le trade s'ouvre en ×1/.test(ap.ficheChamp.note || ''),
    { avant: av.ficheChamp, apres: ap.ficheChamp });
  R('fiche MAN, LONG 60 $ : avant ×3 saisi → ouvert en ×1, journal « levier ×3 » (faux), aucun mot visible sur le levier ; après ×1, journal « levier ×1 »',
    av.saisieLevier === '3' && av.fiche.eur && av.fiche.eur.expo === 60 && av.fiche.journal.some(d => /Trade MANUEL EUR\/USDT LONG · mise \$60 · levier ×3/.test(d)) && !visibles(av.fiche.toasts).some(t => /levier|×\d/.test(t))
      && ap.fiche.eur && ap.fiche.eur.expo === 60 && ap.fiche.eur.emprunt === 0 && ap.fiche.journal.some(d => /Trade MANUEL EUR\/USDT LONG · mise \$60 · levier ×1(?! \()/.test(d)),
    { avant: { e: av.fiche.eur, j: av.fiche.journal, t: av.fiche.toasts }, apres: { e: ap.fiche.eur, j: ap.fiche.journal, t: ap.fiche.toasts } });
  R('« ✓ Appliquer » 60 $ sur EUR/USDT ×2 : avant ouvert en ×1 sans un mot visible ; après le même ×1 ET l\'avertissement « ouvert en ×1 au lieu de ×2 · levier général ×0 : aucun emprunt »',
    av.appliquer.eur && av.appliquer.eur.expo === 60 && !visibles(av.appliquer.toasts).some(t => /au lieu de ×|levier/.test(t))
      && ap.appliquer.eur && ap.appliquer.eur.expo === 60 && visibles(ap.appliquer.toasts).includes('⚠ EUR/USDT LONG ouvert en ×1 au lieu de ×2 · levier général ×0 : aucun emprunt')
      && ap.appliquer.journal.includes('Levier EUR/USDT LONG : ×2 demandé, ×1 pris (exposition $60) · levier général ×0 : aucun emprunt'),
    { avant: av.appliquer, apres: ap.appliquer });
  const argent = x => JSON.stringify([x.fiche.trading, x.fiche.dette, x.fiche.eur, x.avantAppliquer.trading, x.appliquer.trading, x.appliquer.dette, x.appliquer.eur]);
  R('argent identique avant / après à chaque étape (trading, dette, mise, exposition, emprunt)', argent(av) === argent(ap), { avant: argent(av), apres: argent(ap) });
  R('réglages des paires rendus (AVAX toujours ×2 : la sonde n\'y touche pas)', av.avaxFin === 2 && ap.avaxFin === 2, [av.avaxFin, ap.avaxFin]);
  R('page prête et sans erreur (avant et après), 20 s de battement', av.pret && ap.pret && !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.writeFileSync(path.join(OUT, 'sonde_n99.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
