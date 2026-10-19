// [GO NETTOYAGE · 19/10/2026] VERSION 20261019a · rejeu/sonde_nettoyage.js — la part « argent » de go nettoyage jouée par la VRAIE page.
//   node rejeu/sonde_nettoyage.js --root <dossier du code> --backup <aura_guardian_full_….json> [--port 8976] [--out <f.json>]
// Une page Chromium servie depuis --root, réseau coupé, l'état RÉEL du backup (EV à l'écran, MANU : le bot n'ouvre rien ; migrations « une fois »
// marquées faites). Les VRAIS gestes : le bandeau du recalage de l'AA (n° 51 : « Plus tard », puis « Recaler l'AA » et sa question, puis un rechargement),
// la remise à zéro d'un compte refusée puis acceptée (n° 53), une position perdue presque entière sans levier soldée par le contrôle de solvabilité
// (n° 52) et ses frais restés dus (n° 54), une sortie par paliers (n° 55), « Inverser » une position perdante d'un compte investi (n° 60), le badge de
// la carte de paire avec levier (n° 59). Sur le code d'avant (commit 6ee5844) elle montre les défauts ; sur le code livré, elle rend 0.
// Un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (_e) {} } }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_nettoyage.js --root <code> --backup <backup.json> [--port 8976] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), BACKUP = path.resolve(args.backup), PORT = Number(args.port || 8976);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];   // liste de rejeu/sonde_modes.js
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 600) : '')); };

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8')), st = BK.aura; st.tradingMode = 'paperReal'; st.botAutoMode = false;
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_nettoyage')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
    localStorage.setItem('aura_current_trade_mode', 'paperReal'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_nettoyage', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
  const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 } });
  await ctx.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [], dialogs = [];
  let accepter = true;
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message(), accepte: accepter }); (accepter ? d.accept() : d.dismiss()).catch(() => {}); });
  const pret = async () => {
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && S.agents && S.agents.length > 0)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(4000);
  };
  const ev = (fn, a) => page.evaluate(fn, a);
  // l'AA continue de trader derrière l'écran pendant la sonde : le recalage se lit dans sa trace (avant / après, au moment même)
  const AA = () => ev(() => { const w = S.walletStore.sim; return { tr: w.tradingAccount, pf: w.portfolio, start: w._startPortfolio, cap: w.bunker && w.bunker.capRef, rec: (w._recalages || []).map(r => r.id), trace: (w._recalages || [])[0] || null }; });
  const bandeau = () => ev(() => { const b = document.getElementById('recalageAABandeau'); return b ? b.innerText : null; });
  const bouton = (txt) => ev((t) => { const b = document.getElementById('recalageAABandeau'); if (!b) return false; const x = [...b.querySelectorAll('button')].find(e => e.textContent.includes(t)); if (!x) return false; x.click(); return true; }, txt);
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  await ev(() => { window.__toasts = []; const o = window.showToast; window.showToast = function (t, d, l) { window.__toasts.push([String(t), l || 'info']); return o.apply(this, arguments); }; try { showToast = window.showToast; } catch (e) {} });

  // ───────── 1. n° 51 · le bandeau du recalage de l'AA ─────────
  // [GO NETTOYAGE · 19/10/2026, suite] le module est retiré de l'app une fois le recalage fait sur la tablette : ses étapes ne se jouent que s'il est chargé
  if (/<script src="js\/18-recalage-aa\.js/.test(fs.readFileSync(path.join(ROOT, 'AURA8_v118.html'), 'utf8'))) {
  const A0 = await AA(), b0 = await bandeau();
  R('recalage · au lancement, le bandeau dit l\'écart de l\'AA (3 707,64 $)', !!b0 && /3707\.64/.test(b0), { b0, A0 });
  await bouton('Plus tard'); await page.waitForTimeout(300);
  const A1 = await AA();
  R('recalage · « Plus tard » : le bandeau part, RIEN ne change', !(await bandeau()) && A1.tr === A0.tr && A1.rec.length === 0, A1);
  await ev(async () => { await saveState(true); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  const b2 = await bandeau();
  R('recalage · rechargement : le bandeau revient (rien n\'a été fait)', !!b2, b2);
  const nD = dialogs.length; await bouton('Recaler'); await page.waitForTimeout(800);
  const A2 = await AA(), q2 = dialogs.slice(nD).filter(d => d.type === 'confirm');
  R('recalage · « Recaler l\'AA » : une question dit le montant, la mesure et ce qui ne change pas ; acceptée → trading AA − 3 707,64 $, repères baissés d\'autant, trace posée',
    q2.length === 1 && /3707\.64/.test(q2[0].msg) && /680,12 \$/.test(q2[0].msg) && /Rien d.autre ne change/.test(q2[0].msg) && A2.rec.length === 1 && A2.trace && Math.abs((A2.trace.avant.trading - A2.trace.apres.trading) - 3707.64) < 1e-6 && Math.abs(A2.trace.apres.trading - A2.tr) < 1e-6,
    { A2, q: q2.map(d => d.msg.slice(0, 160)) });
  await ev(async () => { await saveState(true); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  const A3 = await AA(), b3 = await bandeau();
  R('recalage · rechargement : gardé, plus de bandeau, une seule fois', !b3 && A3.trace && A3.trace.t === A2.trace.t && A3.start < A0.start - 3000 && A3.rec.length === 1 && await ev(() => window._recalageAA && window._recalageAA.etat()) === 'fait', A3);
  await ev(() => { window.__toasts = []; const o = window.showToast; window.showToast = function (t, d, l) { window.__toasts.push([String(t), l || 'info']); return o.apply(this, arguments); }; try { showToast = window.showToast; } catch (e) {} });
  } else console.log('  ··  recalage · module retiré (recalage fait sur la tablette le 19/10) : étapes sautées');

  // ───────── 2. n° 53 · remise à zéro d'un compte (le geste de l'appui long) ─────────
  accepter = false; const nD2 = dialogs.length;
  const c0 = await ev(() => ({ c: S.cashAccount, t: S.tradingAccount }));
  await ev(() => _executeAccountReset('caisse')); await page.waitForTimeout(200);
  const c1 = await ev(() => ({ c: S.cashAccount, t: S.tradingAccount, toast: window.__toasts.slice(-1) }));
  const q3 = dialogs.slice(nD2);
  R('remise à zéro · caisse EV, question refusée : rien ne change, la question disait le montant', q3.length === 1 && q3[0].msg.includes(c0.c.toFixed(2) + ' $') && c1.c === c0.c, { q: q3.map(d => d.msg.slice(0, 160)), c1 });
  accepter = true;

  // ───────── 3. n° 52 + 54 · sans levier, une position perdue presque entière ─────────
  const P = await ev(() => Object.keys(S.pairStates).filter(p => S.pairStates[p].price > 0 && !S.openPositions.some(o => o.pair === p)).slice(0, 4));
  const s3 = await ev((pa) => {
    const ps = S.pairStates[pa]; ps.stake = Math.floor(S.tradingAccount * 100) / 100; ps.pairLeverage = 1;
    const p = openPosition(pa, 'long'); if (!p) return { ouverte: false, t: window.__toasts.slice(-1) };
    ps.price = p.entryPrice * 0.0005;   // −99,95 %
    window._leverageMarginCheck();
    return { ouverte: true, encore: S.openPositions.some(x => x.id === p.id), tr: S.tradingAccount, du: S.walletStore.paperReal._feesDue || 0, log: S.chainLog.slice(-6).map(l => l.desc).filter(d => /solvabilité|restent dus/.test(d)) };
  }, P[0]);
  R('solvabilité · SANS levier, position à −99,95 % sur un compte vide : soldée par le contrôle RÉEL, trading jamais négatif ; les frais non couverts restent dus et c\'est dit',
    s3.ouverte && !s3.encore && s3.tr >= 0 && s3.du > 0 && s3.log.some(d => /Clôture de solvabilité/.test(d)) && s3.log.some(d => /restent dus/.test(d)), s3);
  const s3b = await ev(() => ({ parts: (typeof _computeNetUsdParts === 'function') ? _computeNetUsdParts() : null }));
  R('« net en poche » · les frais restés dus sont retranchés', s3b.parts && Math.abs((s3b.parts.feesDue || 0) - s3.du) < 1e-9, s3b);

  // ───────── 4. n° 55 · sortie par paliers ─────────
  const s4 = await ev((pa) => {
    S.tradingAccount += 200;   // de quoi trader après la perte précédente (argent posé pour la sonde)
    const ps = S.pairStates[pa]; ps.stake = 90; ps.pairLeverage = 1; const p = openPosition(pa, 'long'); if (!p) return { ouverte: false, t: window.__toasts.slice(-1) };
    ps.price = p.entryPrice * 1.015; const t0 = S.tradingAccount, n0 = (ps.trades || []).length, du0 = S.walletStore.paperReal._feesDue || 0;
    closePartial(p.id, 0);
    const q = S.openPositions.find(x => x.id === p.id), l = ps.trades[ps.trades.length - 1];
    return { ouverte: true, reste: q && q.stakeUsdt, paliers: q && q._paliers && q._paliers.length, n: ps.trades.length - n0, dTr: S.tradingAccount - t0, du0, du1: S.walletStore.paperReal._feesDue || 0, compteur: ps.totalTrades };
  }, P[1]);
  R('paliers · TP1 : 33 % fermés par closePosition (aucune ligne d\'historique : le résultat est porté par la position), 67 % restent ouverts, le trading reçoit la part + le résultat − les frais, moins les frais restés dus (repris d\'abord)',
    s4.ouverte && Math.abs(s4.reste - 60.3) < 1e-6 && s4.paliers === 1 && s4.n === 0 && s4.du1 === 0 && (s4.dTr + s4.du0) > 29.7 && (s4.dTr + s4.du0) < 30.2, s4);

  // ───────── 5. n° 60 · « Inverser » une position perdante d'un compte investi ─────────
  const s5 = await ev((pa) => {
    const ps = S.pairStates[pa]; ps.stake = Math.floor(S.tradingAccount * 100) / 100; ps.pairLeverage = 1; const p = openPosition(pa, 'long'); if (!p) return { ouverte: false, t: window.__toasts.slice(-1) };
    const st0 = p.stakeUsdt; ps.price = p.entryPrice * 0.8; manuInvert(pa);
    const q = S.openPositions.find(x => x.pair === pa);
    return { ouverte: true, st0, side: q && q.side, mise: q && q.stakeUsdt, tr: S.tradingAccount, t: window.__toasts.slice(-2) };
  }, P[2]);
  R('inverser · position à −20 % d\'un compte investi : rouverte en SHORT avec ce que le trading tient, et c\'est dit', s5.ouverte && s5.side === 'short' && s5.mise > 0 && s5.mise < s5.st0 && s5.tr >= 0 && /au lieu de/.test(JSON.stringify(s5.t)), s5);

  // ───────── 6. n° 59 · le badge de la carte avec levier ─────────
  const s6 = await ev((pa) => {
    // argent posé pour la sonde (le compte est investi par les pas d'avant), puis la réserve du levier recalculée : la part « exposition » ×3 est empruntable
    // (index du levier posé à ×1 sans l'emprunt de l'index : seule la part « exposition » de la paire ×3 nous intéresse ici)
    S.openPositions.slice().forEach(x => closePosition(x.id)); S.tradingAccount += 100; S.leverage = 1; syncLeverageReserve(); /* les positions des pas d'avant fermées */ const ps = S.pairStates[pa]; ps.stake = 10; ps.pairLeverage = 3; const p = openPosition(pa, 'long'); if (!p) return { ouverte: false, t: window.__toasts.slice(-1) };
    renderPairPnl(); const b = document.getElementById('pb_badge_' + pa.replace('/', '_'));
    return { ouverte: true, mise: p.stakeUsdt, expo: p.totalExposure, badge: b && b.textContent };
  }, P[3]);
  R('carte · le badge dit la mise et le levier (« mise $10.00 · ×3 »), plus l\'exposition', s6.ouverte && /mise \$10\.00 · ×3/.test(s6.badge || ''), s6);

  R('aucune erreur de page', perr.length === 0, perr);
  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '⚠ ' + ko + ' défaut(s) montré(s)' : '✅ 0 défaut') + ' · ' + res.length + ' étapes · code ' + ROOT + ' · paires ' + P.join(', '));
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ root: ROOT, res, dialogs }, null, 1));
  await browser.close(); server.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
