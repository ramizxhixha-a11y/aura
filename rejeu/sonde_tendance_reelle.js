// [GO TENDANCE RÉELLE · 12/11/2026] VERSION 20261112a · rejeu/sonde_tendance_reelle.js — l'EV qui suit la voix tendance, joué par la VRAIE page.
//   node rejeu/sonde_tendance_reelle.js --root <dossier du code> --backup <aura_guardian_full_….json> [--port 8976] [--out <f.json>]
// Une page Chromium servie depuis --root, réseau coupé, l'état RÉEL du backup, l'AA à l'ÉCRAN (la voix agit derrière, dans l'EV), AUTO comme chez Rams.
// Réseau coupé = aucun prix réel frais : la sonde déclare frais les prix du backup (_rcPriceAge → 1 s) et les fait bouger elle-même. Étapes : le premier
// passage du minuteur de 15b (sans appel direct), les comptes AA / RE intacts, des prix contraires pendant plusieurs battements (perte max, sorties de 07),
// un bot qui tente d'ouvrir en EV, ton ✕ (même appel que le bouton), un retournement de la poche, un VRAI rechargement. Un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) {}
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_tendance_reelle.js --root <code> --backup <backup.json> [--port 8976] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), BACKUP = path.resolve(args.backup), PORT = Number(args.port || 8976);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 600) : '')); };
(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8')), st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
  st.tradingMode = 'sim';   // l'AA à l'écran : la voix agit DERRIÈRE, dans l'EV
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_tr')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
    localStorage.setItem('aura_current_trade_mode', 'sim'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_tr', '1'); } } catch (e) { window.__initErr = String(e); } })();
    (() => { const iv = setInterval(() => { try { if (typeof _rcPriceAge === 'function' && !window.__frais) { window.__frais = 1; window._rcPriceAge = function () { return 1000; }; try { _rcPriceAge = window._rcPriceAge; } catch (e) {} } } catch (e) {} }, 5); setTimeout(() => clearInterval(iv), 60000); })();`;
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  await ctx.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  const ev = (fn, a) => page.evaluate(fn, a);
  const pret = async () => { for (let i = 0; i < 900; i++) { if (await ev(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && window._tlr)).catch(() => false)) break; await page.waitForTimeout(200); } };
  const W = () => ev(() => {
    const w = S.walletStore, f = m => ({ trading: w[m].tradingAccount, n: (w[m].openPositions || []).length, voix: (w[m].openPositions || []).filter(p => p._voix === 'tendance').map(p => [p.pair, p.side, p.stakeUsdt, p.entryPrice, p.id]) });
    return { ecran: S.tradingMode, sim: f('sim'), ev: f('paperReal'), re: f('real'), poche: Object.fromEntries(Object.entries(S.tendance.pos).map(([k, v]) => [k, v.side])), reel: S.tendance.reel || null };
  });
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  const D0 = await W();
  R('départ · AA à l\'écran, AUTO, EV ' + D0.ev.trading.toFixed(2) + ' $ au trading, ' + D0.ev.n + ' position(s), poche ' + Object.keys(D0.poche).length + ' paires, prix déclarés frais',
    D0.ecran === 'sim' && D0.ev.voix.length === 0 && Object.keys(D0.poche).length === 11 && await ev(() => S.botAutoMode === true && _rcPriceAge('BTC/USDT') === 1000), { ev: D0.ev.trading, re: D0.re, poche: D0.poche });

  // ───────── 1. le minuteur de 15b (30 s après l'état prêt), sans appel direct ─────────
  let D1 = null; for (let i = 0; i < 60; i++) { D1 = await W(); if (D1.ev.voix.length) break; await page.waitForTimeout(1000); }
  const share = Math.floor(Math.min(D0.ev.trading, D0.ev.trading / 11) * 100) / 100;
  R('minuteur · 11 positions de la voix dans l\'EV (pas dans l\'AA), même sens que la poche, mise 1/11 = ' + share + ' $ ; écran resté sur l\'AA',
    D1.ev.voix.length === 11 && D1.sim.voix.length === 0 && D1.ev.voix.every(([p, s, k]) => D1.poche[p] === s && Math.abs(k - share) < 0.011) && D1.ecran === 'sim',
    { voix: D1.ev.voix.map(x => x.slice(0, 3)), ecran: D1.ecran });
  R('comptes · trading EV ' + D1.ev.trading.toFixed(2) + ' $ (≈ 0 : tout est engagé), RE identique, AA sans position de la voix',
    D1.ev.trading >= 0 && D1.ev.trading < 1 && D1.re.trading === D0.re.trading && D1.re.n === D0.re.n, { ev: D1.ev.trading, re: D1.re });
  const tl = await ev(() => S.chainLog.filter(x => /Tendance réelle/.test(x.desc)).map(x => [x.desc, x.m]));
  R('journal · une ligne « 11 positions ouvertes avec ton argent EV », marquée EV (faite derrière l\'écran)', tl.length === 1 && /11 positions ouvertes/.test(tl[0][0]) && tl[0][1] === 'paperReal', tl);

  // ───────── 2. prix contraires pendant plusieurs battements : aucune sortie automatique ─────────
  await ev(() => { const w = S.walletStore.paperReal; w.openPositions.filter(p => p._voix === 'tendance').forEach(p => { const ps = w.pairStates[p.pair]; ps.price = p.entryPrice * (p.side === 'long' ? 0.94 : 1.06); }); window.__cl0 = S.chainLog.length; });
  await page.waitForTimeout(25000);
  const D2 = await W();
  // lignes de l'EV (marquées m = paperReal : faites derrière l'écran AA) qui parlent d'une fermeture ; les lignes de l'AA à l'écran (ses bots) ne comptent pas
  const lignes = await ev(() => S.chainLog.slice(window.__cl0 || 0).filter(x => x.m === 'paperReal' || /Perte max/.test(x.desc)).map(x => x.desc).filter(d => /Perte max|zombie|Trailing|Consensus|fermé|Rescue|FLATTEN|Garde-fou|stop/i.test(d)));
  R('−6 % contre chaque position pendant 25 s de battements : les 11 restent ouvertes, aucune ligne « perte max / trailing / SL / rescue »', D2.ev.voix.length === 11 && lignes.length === 0, { n: D2.ev.voix.length, lignes });

  // ───────── 3. un bot tente d'ouvrir en EV ─────────
  const bot = await ev(() => { const d = S.tradingMode, b = window._bgResolve; S.tradingMode = 'paperReal'; window._bgResolve = true;
    try { const n0 = S.openPositions.length; const free = Object.keys(S.pairStates).find(p => !S.openPositions.some(o => o.pair === p) && S.pairStates[p].price > 0);
      try { autoOpenPosition(free, 'long', 5); } catch (e) {} return { free, avant: n0, apres: S.openPositions.length }; } finally { S.tradingMode = d; window._bgResolve = b; } });
  R('bot · autoOpenPosition en EV (' + bot.free + ') : rien ne s\'ouvre', bot.avant === bot.apres, bot);

  // ───────── 4. ton ✕ (le même appel que les boutons) : fermée, pas rouverte cette semaine ─────────
  const x = await ev(() => { const d = S.tradingMode, b = window._bgResolve; S.tradingMode = 'paperReal'; window._bgResolve = true;
    try { const p = S.openPositions.find(o => o._voix === 'tendance' && o.pair === 'XRP/USDT'); closePosition(p.id, false, { main: true }); const t = S.pairStates['XRP/USDT'].trades.slice(-1)[0]; return { ferme: !S.openPositions.some(o => o.id === p.id), type: t.type, usd: t.pnlUsdt }; } finally { S.tradingMode = d; window._bgResolve = b; } });
  await ev(() => _tlr.sync()); await ev(() => _tlr.sync());
  const D4 = await W(); const l4 = await ev(() => S.chainLog.filter(x => /XRP\/USDT fermée hors de la voix/.test(x.desc)).length);
  R('✕ · XRP fermée par ton geste (ligne « tendance », ' + (x.usd || 0).toFixed(2) + ' $) ; pas rouverte cette semaine ; dit une fois', x.ferme && x.type === 'tendance' && !D4.ev.voix.some(v => v[0] === 'XRP/USDT') && l4 === 1, { x, l4 });

  // ───────── 5. retournement de la poche (ETH SHORT → LONG) ─────────
  await ev(() => { const t = S.tendance, p = t.pos['ETH/USDT']; t.hist.push({ p: 'ETH/USDT', s: -1, w0: p.w, t0: p.t0, x0: p.x0, t1: Date.now(), x1: 1, r: 0, c: 0, net: 0, n: 11, why: 'retournement' });
    t.pos['ETH/USDT'] = Object.assign({}, p, { side: 'long', t0: Date.now() }); _tlr.sync(); });
  const D5 = await W(); const e5 = D5.ev.voix.find(v => v[0] === 'ETH/USDT');
  R('retournement · ETH : le SHORT de l\'EV fermé, un LONG rouvert avec l\'argent revenu', !!e5 && e5[1] === 'long' && await ev(() => S.walletStore.paperReal.pairStates['ETH/USDT'].trades.slice(-2)[0].type === 'tendance'), e5);

  // ───────── 6. écran : la barre « Tendance longue » dit ton argent EV ─────────
  const ecran = await ev(() => { try { _tlToggle(); _tlr.render(); } catch (e) {} const b = document.getElementById('tlReel'); return b ? b.innerText : null; });
  R('écran · cadre « Ton argent EV suit la voix » sous la poche', !!ecran && /Ton argent EV suit la voix : 10 positions/.test(ecran), ecran);

  // ───────── 7. un VRAI rechargement ─────────
  await ev(() => window.saveState && window.saveState(true)); await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'domcontentloaded' }); await pret(); await page.waitForTimeout(4000);
  const D7 = await W(); await ev(() => _tlr.sync()); const D7b = await W();
  R('rechargement · les 10 positions de la voix relues avec leur marque, l\'état du suiveur aussi ; un passage ne double rien',
    D7.ev.voix.length === 10 && D7b.ev.voix.length === 10 && !!(D7.reel && D7.reel.suivi && Object.keys(D7.reel.suivi).length === 10), { n: D7.ev.voix.length, suivi: D7.reel && Object.keys(D7.reel.suivi || {}).length });
  R('aucune erreur de page', perr.length === 0, perr);

  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌ ' + ko + ' défaut(s)' : '✅ 0 défaut') + ' sur ' + res.length + ' étapes');
  if (args.out) fs.writeFileSync(args.out, JSON.stringify(res, null, 1));
  await browser.close(); server.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
