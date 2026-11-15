// rejeu/sonde_n63.js — [GO N° 63 · 15/11/2026] vraie page, backup du pont du jour, tablette 800 × 1 280 : le journal anti-négatif (walletStore[mode].antiNegReserveLog)
// AVANT / APRÈS la correction de 09b2 _auraRotatePurge. Rien n'est appelé à la place de l'app : les lignes sont écrites par les vrais openPosition /
// autoOpenPosition / closePosition, la purge est celle du VRAI minuteur de 2 min (setInterval de 09b2), la persistance celle du vrai saveState + rechargement.
// Usage : node rejeu/sonde_n63.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : (0) départ = le backup : AA et EV, 50 lignes figées (13/09, 15/09) ; (1) AA (3 000 $ posés par la sonde) : 30 trades ouverts / fermés à la main
// (10 $, BTC) + 1 ouverture du bot (autoOpenPosition, qui tient la réserve ; une paire après l'autre tant qu'il s'abstient) fermée → ~ 32 lignes du jour en tête, 80 et plus au total ;
// (2) EV : EUR/USDT 20 $ à la main, fermée → 1 ligne du jour ; (3) on attend le VRAI minuteur (≤ 150 s) : avant, les lignes du jour disparaissent,
// le 13/09 et le 15/09 restent ; après, les 50 plus récentes, le jour en tête ; (4) saveState, rechargement de la page : le journal relu = celui d'avant
// le rechargement ; (5) aucune erreur de page.
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
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 1500))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
st.botAutoMode = false;   // MANU, comme la tablette : seul Rams (ici la sonde) ouvre
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };
const JOUR = '2026-11-15';
const RESUME = () => { const d = t => t ? new Date(t).toISOString().slice(0, 16) : null, o = {};
  ['sim', 'paperReal', 'real'].forEach(m => { const L = (S.walletStore[m] || {}).antiNegReserveLog || [];
    o[m] = { n: L.length, tete: L[0] ? [d(L[0].ts), L[0].source, L[0].pair] : null, queue: L.length ? d(L[L.length - 1].ts) : null,
      max: L.length ? d(Math.max(...L.map(e => e.ts || 0))) : null, jour: L.filter(e => e && e.ts && new Date(e.ts).toISOString().slice(0, 10) === '2026-11-15').length,
      ordre: L.every((e, k) => !k || (e.ts || 0) <= (L[k - 1].ts || 0)), ids: L.slice(0, 60).map(e => (e.ts || 0) + ':' + e.source + ':' + (e.pair || '')) }; });
  return o; };

async function passe(browser, ROOT, PORT, nom) {
  const server = await serve(ROOT, PORT), r = { nom };
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', q => (q.request().url().startsWith('http://127.0.0.1:' + PORT) ? q.continue() : q.abort())); await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret = await PRET(page);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(`window.__resume = ${RESUME.toString()};`);
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  r.depart = await ev(() => window.__resume());
  await page.waitForTimeout(25000);   // la purge du lancement (setTimeout 20 s de 09b2)
  r.boot = await ev(() => window.__resume());
  // (1) AA : 30 trades à la main + 1 ouverture du bot, fermés par le vrai closePosition
  r.aa = await ev(() => {
    for (let i = 0; i < 3 && S.tradingMode !== 'sim'; i++) if (typeof cycleTradeMode === 'function') cycleTradeMode();
    S.tradingAccount = 3000; const out = { mode: S.tradingMode, man: 0, bot: null, err: [] };
    const ps = S.pairStates['BTC/USDT'], s0 = ps.stake, l0 = ps.pairLeverage;
    for (let i = 0; i < 30; i++) {
      try { ps.stake = 10; ps.pairLeverage = 1; const p = openPosition('BTC/USDT', i % 2 ? 'short' : 'long'); if (p) { const q = S.openPositions.find(x => x.pair === 'BTC/USDT'); if (q) { closePosition(q.id); out.man++; } } }
      catch (e) { if (out.err.length < 3) out.err.push(String(e).slice(0, 120)); } finally { ps.stake = s0; ps.pairLeverage = l0; }
    }
    const m0 = S.botAutoMode; S.botAutoMode = true;   // l'ouverture du bot n'existe qu'en AUTO (copie locale ; remis aussitôt)
    try { const n0 = (S.antiNegReserveLog || []).length; out.bot = { ouvert: false, hold: false, n0, essais: [] };   // le bot peut s'abstenir sur une paire (ses gardes) : la suivante
      for (const pr of ['ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT', 'LINK/USDT', 'DOGE/USDT', 'BNB/USDT', 'DOT/USDT']) {
        autoOpenPosition(pr, 'long', 12); const q = S.openPositions.find(x => x.pair === pr); out.bot.essais.push(pr + (q ? ' ouverte' : ' non'));
        if (!q) continue; const h = (S.antiNegReserveLog || [])[0]; out.bot.ouvert = true; out.bot.hold = !!(h && h.source === 'hold' && h.pair === pr); closePosition(q.id, true); break; }
    } catch (e) { out.bot = String(e).slice(0, 160); } finally { S.botAutoMode = m0; }
    return out;
  });
  // (2) EV : EUR/USDT 20 $ à la main, fermée
  r.ev = await ev(() => {
    for (let i = 0; i < 3 && S.tradingMode !== 'paperReal'; i++) if (typeof cycleTradeMode === 'function') cycleTradeMode();
    const ps = S.pairStates['EUR/USDT'], s0 = ps.stake, l0 = ps.pairLeverage, out = { mode: S.tradingMode, ok: false };
    try { ps.stake = 20; ps.pairLeverage = 1; const p = openPosition('EUR/USDT', 'long'); const q = S.openPositions.find(x => x.pair === 'EUR/USDT' && !x._voix); if (q) { closePosition(q.id); out.ok = true; } }
    catch (e) { out.err = String(e).slice(0, 160); } finally { ps.stake = s0; ps.pairLeverage = l0; }
    return out;
  });
  r.ecrit = await ev(() => window.__resume());
  // (3) le VRAI minuteur de 2 min : on attend que l'AA repasse à 50 lignes ou moins (≤ 150 s)
  const t0 = Date.now(); r.attente = null;
  for (let i = 0; i < 31; i++) { await page.waitForTimeout(5000); const n = await ev(() => ((S.walletStore.sim || {}).antiNegReserveLog || []).length); if (n <= 50) { r.attente = Math.round((Date.now() - t0) / 1000); break; } }
  r.purge = await ev(() => window.__resume());
  // (4) sauvegarde, rechargement : le journal relu
  r.save = await ev(async () => { try { const x = saveState(); if (x && x.then) await x; return true; } catch (e) { return String(e).slice(0, 120); } });
  await page.waitForTimeout(3000);
  r.avantRelance = await ev(() => window.__resume());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); r.pret2 = await PRET(page);
  await ev(`window.__resume = ${RESUME.toString()};`);
  r.relu = await ev(() => window.__resume());
  await page.waitForTimeout(5000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8963, 'avant'), ap = await passe(browser, NEW, 8964, 'après');
  await browser.close();
  const c = o => ({ sim: [o.sim.n, o.sim.tete && o.sim.tete[0], o.sim.max, o.sim.jour], paperReal: [o.paperReal.n, o.paperReal.tete && o.paperReal.tete[0], o.paperReal.max, o.paperReal.jour], real: [o.real.n, o.real.max] });
  console.log('SONDE N° 63 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  ['depart', 'boot', 'ecrit', 'purge', 'relu'].forEach(k => console.log('  ' + k.padEnd(7) + ' avant ' + JSON.stringify(c(av[k])) + '\n          après ' + JSON.stringify(c(ap[k]))));
  console.log('  AA : ' + JSON.stringify(ap.aa) + ' · EV : ' + JSON.stringify(ap.ev) + ' · minuteur vu après ' + av.attente + ' s (avant) / ' + ap.attente + ' s (après)');
  const d0 = ap.depart;
  R('(0) départ = le backup : AA 50 lignes (dernière le 13/09), EV 50 lignes (dernière le 15/09), plus récente en tête ; mêmes données pour les deux versions',
    d0.sim.n === 50 && /^2026-09-13/.test(d0.sim.max) && d0.paperReal.n === 50 && /^2026-09-15/.test(d0.paperReal.max) && d0.sim.ordre && d0.paperReal.ordre
      && JSON.stringify(av.depart) === JSON.stringify(ap.depart), { avant: av.depart, apres: ap.depart });
  R('(0b) la purge du lancement ne change rien à un journal de 50 lignes (avant et après)', JSON.stringify(av.boot) === JSON.stringify(av.depart) && JSON.stringify(ap.boot) === JSON.stringify(ap.depart));
  R('(1–2) les vrais écrivains écrivent EN TÊTE (avant et après) : AA, 30 fermetures à la main + 1 ouverture du bot (réserve tenue) fermée ; EV, 1 fermeture — lignes du jour en tête',
    [av, ap].every(x => x.aa.mode === 'sim' && x.aa.man === 30 && x.aa.bot && x.aa.bot.ouvert && x.aa.bot.hold && x.ev.mode === 'paperReal' && x.ev.ok
      && x.ecrit.sim.jour >= 32 && x.ecrit.sim.n >= 82 && x.ecrit.sim.tete[0].startsWith(JOUR) && x.ecrit.paperReal.jour === 1 && x.ecrit.paperReal.n === 51 && x.ecrit.paperReal.tete[2] === 'EUR/USDT' && x.ecrit.sim.ordre),
    { avant: [av.aa, av.ev, c(av.ecrit)], apres: [ap.aa, ap.ev, c(ap.ecrit)] });
  const P0 = av.purge, P1 = ap.purge;
  R('(3) AVANT, au vrai minuteur de 2 min : les lignes du jour EFFACÉES, le 13/09 (AA) et le 15/09 (EV) restent — le défaut, vu sur la vraie page',
    av.attente !== null && P0.sim.n === 50 && P0.sim.jour === 0 && /^2026-09-13/.test(P0.sim.max) && P0.paperReal.n === 50 && P0.paperReal.jour === 0 && /^2026-09-15/.test(P0.paperReal.max), c(P0));
  R('(3) APRÈS, au même minuteur : les 50 plus récentes, le jour en tête dans l\'ordre d\'écriture — AA : les lignes du jour + les plus récentes du 13/09 ; EV : la ligne du jour + les 49 plus récentes du 15/09',
    ap.attente !== null && P1.sim.n === 50 && P1.sim.ordre && P1.sim.ids.slice(0, 50).join() === ap.ecrit.sim.ids.slice(0, 50).join() && P1.sim.jour === ap.ecrit.sim.jour
      && P1.paperReal.n === 50 && P1.paperReal.jour === 1 && P1.paperReal.tete[2] === 'EUR/USDT' && P1.paperReal.ids.join() === ap.ecrit.paperReal.ids.slice(0, 50).join()
      && JSON.stringify(P1.real) === JSON.stringify(ap.ecrit.real), c(P1));
  R('(4) saveState + rechargement : le journal relu = celui d\'avant le rechargement (après : le jour toujours en tête)',
    ap.save === true && ap.pret2 && JSON.stringify(ap.relu.sim.ids) === JSON.stringify(ap.avantRelance.sim.ids) && JSON.stringify(ap.relu.paperReal.ids) === JSON.stringify(ap.avantRelance.paperReal.ids)
      && ap.relu.sim.tete[0].startsWith(JOUR) && ap.relu.paperReal.jour === 1, { save: ap.save, avant: c(ap.avantRelance), relu: c(ap.relu) });
  R('page prête et sans erreur (avant et après, rechargement compris)', av.pret && ap.pret && av.pret2 && ap.pret2 && !av.erreurs.length && !ap.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.mkdirSync(path.join(NEW, 'rejeu/out'), { recursive: true });
  fs.writeFileSync(path.join(NEW, 'rejeu/out/sonde_n63.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
