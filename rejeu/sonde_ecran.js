// rejeu/sonde_ecran.js — [GO ÉCRAN · 13/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280) : les 4 défauts d'écran n° 82–85.
// Usage : node rejeu/sonde_ecran.js --root . --backup <backup.json> [--out <dossier>]   (un seul navigateur à la fois — CLAUDE.md règle 8)
// Étapes : 82 prix des mini-cartes (texte de la carte ET du pousseur 3×/s après un nouveau prix) · 83 LIBRE de l'accueil = caisse + trading ·
// 84 aucune alerte « BTC chute » sans chute, une seule pour une vraie chute · 85 --t4 / --mag définies, ENGAGÉ au même format que LIBRE / MAX,
// compte des textes < 8 px · aucune erreur de page. Rien n'est écrit sur la tablette : page locale, réseau coupé hors 127.0.0.1.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
const ROOT = path.resolve(A.root || '.'), OUT = A.out || null, PORT = 8983;
if (!A.backup) { console.error('--backup <fichier> manquant'); process.exit(2); }
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
// drapeaux des migrations uniques déjà passées sur la tablette (sinon elles rejoueraient sur le backup chargé)
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 400))); };
(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
  const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
    localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
    ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT) ? r.continue() : r.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  for (let i = 0; i < 900; i++) { if (await ev(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) break; await page.waitForTimeout(200); }
  await page.waitForTimeout(6000);
  const mode = await ev(() => S.tradingMode);
  R('départ · page prête, mode à l\'écran ' + mode, mode === 'paperReal', mode);

  // ───── 83 + 85 : la carte capital de l'accueil ─────
  await ev(() => { try { goPage(0, null, document.getElementById('nav0')); } catch (e) {} window.scrollTo(0, 0); });
  await page.waitForTimeout(2500);
  const home = await ev(() => {
    const t = id => { const e = document.getElementById(id); return e ? e.textContent : null; };
    const eng = (S.openPositions || []).reduce((a, p) => a + (Number(p.totalExposure) || Number(p.stakeUsdt) || 0), 0);
    return { libre: t('capFree'), engage: t('capStaked'), max: t('capMax'), cash: S.cashAccount, trading: S.tradingAccount, eng, n: (S.openPositions || []).length,
      attendu: fmt$2(Math.max(0, (S.cashAccount || 0) + (S.tradingAccount || 0))), ancien: fmt$2(Math.max(0, (S.cashAccount || 0) + (S.tradingAccount || 0) - eng)),
      engAttendu: fmt$2(eng) };
  });
  R('83 · LIBRE = caisse + trading : ' + home.libre + ' (attendu ' + home.attendu + ' ; formule d\'avant ' + home.ancien + ', ' + home.n + ' positions, ' + home.eng.toFixed(2) + ' $ engagés)',
    home.libre === home.attendu && home.n > 0, home);
  R('85 · ENGAGÉ au format de LIBRE / MAX : ' + home.engage + ' · ' + home.max, home.engage === home.engAttendu, home);
  const vars = await ev(() => { const cs = getComputedStyle(document.documentElement); return { t4: cs.getPropertyValue('--t4').trim(), mag: cs.getPropertyValue('--mag').trim() }; });
  R('85 · --t4 et --mag définies : ' + JSON.stringify(vars), !!vars.t4 && !!vars.mag, vars);
  const mini = await ev(() => {
    const pg = document.querySelector('.page.active'); const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const by = {}; let n = 0;
    for (const el of (pg ? pg.querySelectorAll('*') : [])) { if (el.children.length || !(el.innerText || '').trim() || !vis(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 8) { n++; const k = fs + 'px ' + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : el.tagName) + ' « ' + el.innerText.trim().slice(0, 14) + ' »'; by[k] = (by[k] || 0) + 1; } }
    return { n, top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12) };
  });
  R('85 · textes < 8 px à l\'accueil : ' + mini.n + ' (mesure, sans verdict)', true, mini);
  if (OUT) await page.screenshot({ path: path.join(OUT, 'accueil.png') });

  // ───── 82 : mini-cartes Marché ─────
  const pMarche = await ev(() => { for (let i = 0; i <= 5; i++) { try { goPage(i, null, document.getElementById('nav' + i)); } catch (e) {} if (typeof drawMiniCharts === 'function') drawMiniCharts(); const g = document.getElementById('miniChartsGrid'); if (g && g.offsetParent !== null && g.children.length) return i; } return -1; });
  await page.waitForTimeout(1500);
  const px = await ev(() => Object.keys(PAIRS).map(p => { const e = document.getElementById('mc_px_' + p.replace('/', '_')); const d = PAIRS[p].dec; return [p, d, S.pairStates[p] && S.pairStates[p].price, e ? e.textContent : null]; }));
  const fmtA = (v, d) => '$' + Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const malPx = px.filter(([p, d, v, t]) => v && t !== fmtA(v, d));
  R('82 · page Marché n° ' + pMarche + ' : ' + px.length + ' mini-cartes au prix avec les décimales de la paire (DOT ' + (px.find(x => x[0] === 'DOT/USDT') || [])[3] + ', AVAX ' + (px.find(x => x[0] === 'AVAX/USDT') || [])[3] + ')',
    pMarche >= 0 && px.length >= 10 && malPx.length === 0, { malPx, px });
  // le pousseur 3×/s (11) doit écrire un nouveau prix sans re-rendu de la carte
  const push = await ev(async () => { const p = 'DOT/USDT', ps = S.pairStates[p]; const e = document.getElementById('mc_px_DOT_USDT'); if (!ps || !e) return null;
    const old = ps.price; const drawn = window.drawMiniCharts; window.drawMiniCharts = function () {};   // aucun re-rendu pendant la mesure
    ps.price = Math.round(old * 1.0123 * 1e4) / 1e4; e.textContent = '?'; await new Promise(r => setTimeout(r, 900)); const t = e.textContent; const v = ps.price;
    ps.price = old; window.drawMiniCharts = drawn; return { t, v }; });
  R('82 · pousseur 3×/s : nouveau prix DOT écrit en < 1 s sans re-rendu : ' + (push && push.t), !!push && push.t === fmtA(push.v, 2), push);
  if (OUT) await page.screenshot({ path: path.join(OUT, 'marche.png') });

  // ───── 84 : alerte « BTC chute » ─────
  const btc = await ev(() => {
    const toasts = []; const real = window.showToast; window.showToast = function (m) { if (/BTC chute/.test(m)) toasts.push(m); return real && real.apply(this, arguments); };
    const ps = S.pairStates['BTC/USDT']; const p0 = ps.price; const realNow = Date.now; let t = realNow();
    Date.now = () => t;
    try {
      _btcHistory.length = 0; _btcLastAlertTs = 0;
      for (let i = 0; i < 8; i++) { t += 60000; btcImpactTick(); }               // prix plat, 8 min
      t += 11 * 60000; btcImpactTick(); const plat = toasts.length;               // 10 min passées, toujours plat
      for (let i = 0; i < 5; i++) { t += 1000; ps.price = p0 * (1 - 0.01 * (i + 1)); btcImpactTick(); }   // −5 % en 5 battements
      const chute = toasts.length - plat;
      for (let i = 0; i < 5; i++) { t += 1000; ps.price = ps.price * 0.99; btcImpactTick(); } const encore = toasts.length - plat - chute;   // la chute continue < 10 min
      return { plat, chute, encore, toasts };
    } finally { Date.now = realNow; ps.price = p0; window.showToast = real; _btcHistory.length = 0; }
  });
  R('84 · prix plat 19 min : ' + btc.plat + ' alerte (attendu 0) ; vraie chute de 5 % : ' + btc.chute + ' (attendu 1) ; la chute continue dans les 10 min : ' + btc.encore + ' (attendu 0)',
    btc.plat === 0 && btc.chute === 1 && btc.encore === 0, btc);
  R('aucune erreur de page', perr.length === 0, perr);
  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌ ' + ko + ' défaut(s)' : '✅ 0 défaut') + ' sur ' + res.length + ' étapes');
  if (OUT) fs.writeFileSync(path.join(OUT, 'sonde_ecran.json'), JSON.stringify(res, null, 1));
  await browser.close(); server.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
