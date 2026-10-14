// [GO ARGENT · 13/10/2026] VERSION 20261013a · rejeu/sonde_argent.js — les défauts d'argent (ETAT n° 1, 2, 3, 4, 5, 6, 8, 20, 21) joués par la VRAIE page.
//   node rejeu/sonde_argent.js --root <dossier du code> --backup <aura_guardian_full_….json> [--port 8971] [--out <f.json>]
// Une page Chromium servie depuis --root, réseau coupé, l'état RÉEL du backup chargé (EV à l'écran, migrations « une fois » marquées faites, comme la tablette).
// Les VRAIES fonctions jouent : openPosition / closePosition (02), pyramidPosition (05), manuReinforce (07), urgenceCloseAll (06), les écouteurs de sortie (09b2),
// importBackupMaxPermissive / importBackup (04). Puis une SECONDE page sur un stockage NEUF (aucun drapeau) : le backup y est restauré comme le fait « Importer
// backup » (IDB + LS, puis loadState). Chaque étape écrit son résultat ; la sonde le compare au calcul attendu. Lancée sur le code d'avant (commit 9236ff4), elle
// montre les défauts ; sur le code livré, elle rend 0. Un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (_e) {} } }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_argent.js --root <code> --backup <backup.json> [--port 8971] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), BACKUP = path.resolve(args.backup), PORT = Number(args.port || 8971);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];   // liste de rejeu/sonde_modes.js
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail) : '')); };
const near = (a, b, tol) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol);

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const st = JSON.parse(fs.readFileSync(BACKUP, 'utf8')).aura; st.tradingMode = 'paperReal';
  const page0 = async (avecEtat) => {
    const init = avecEtat ? `(() => { try { if (!sessionStorage.getItem('__sonde_argent')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
      localStorage.setItem('aura_current_trade_mode', 'paperReal'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_argent', '1'); } } catch (e) { window.__initErr = String(e); } })();` : '';
    const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 } });
    await ctx.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort());
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage(), perr = [], dialogs = [];
    page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
    page.on('dialog', d => { dialogs.push(d.message()); (d.type() === 'confirm' ? d.accept() : d.dismiss()).catch(() => {}); });
    await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
    for (let i = 0; i < 900; i++) { if (await page.evaluate((e) => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && (!e || (S.agents && S.agents.length > 0))), avecEtat).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(3000);
    return { ctx, page, perr, dialogs };
  };

  // ───────── 1. la page avec l'état réel du backup ─────────
  const P = await page0(true), ev = fn => P.page.evaluate(fn);
  const d0 = await ev(() => { S.botAutoMode = false; const w = S.walletStore.paperReal; return { ecran: S.tradingMode, pf: w.portfolio, trades: w.totalTrades, pos: w.openPositions.length, lev: w.leverage }; });
  R('départ : état du backup chargé, EV à l\'écran, aucune position', d0.ecran === 'paperReal' && d0.pos === 0, d0);
  // un trade manuel LONG (vraies fonctions), mise et levier prêtés le temps de l'ouverture, comme la fiche MAN (10e)
  const ouvre = (o) => P.page.evaluate(o => { const ps = S.pairStates[o.pair], m0 = ps.stake, l0 = ps.pairLeverage, L0 = S.leverage; ps.price = o.px; ps._targetPrice = null; ps.stake = o.stake; ps.pairLeverage = o.lev || 1; if (o.lev > 1) S.leverage = Math.max(1, S.leverage || 0);
    try { const p = openPosition(o.pair, o.side || 'long'); if (p && o.auto) p.auto = true; return p ? { id: p.id, stake: p.stakeUsdt, expo: p.totalExposure, lev: p.levBorrowed } : null; } finally { ps.stake = m0; ps.pairLeverage = l0; if (o.lev > 1) S.leverage = L0; } }, o);
  const ferme = (id, pair, px) => P.page.evaluate(([id, pair, px]) => { S.pairStates[pair].price = px; S.pairStates[pair]._targetPrice = null; const t0 = S.tradingAccount, n0 = S.fees.tradeCount; closePosition(id); const tr = S.pairStates[pair].trades, l = tr[tr.length - 1], f = S.fees.feeLog[0];
    return { delta: S.tradingAccount - t0, hist: l && l.pnlUsdt, fees: f && f.totalFee, notional: f && f.notional, exposure: f && f.exposure, attendu: f && f.exposure * ((S.feeConfig.takerRate || 0) * 2 + (S.feeConfig.slippage || 0) * 2), closed: S.fees.tradeCount - n0, encore: S.openPositions.some(p => p.id === id), caisse: (S.cashLog[0] || {}).amount }; }, [id, pair, px]);

  // n° 20 : une position ouverte, une 2e ouverture sur la paire
  const a = await ouvre({ pair: 'BTC/USDT', px: 100000, stake: 50 });
  const r20 = await ev(() => { const n0 = S.fees.tradeCount, x = openPosition('BTC/USDT', 'short'); return { refus: x === null, encore: S.openPositions.filter(p => p.pair === 'BTC/USDT').length, fermees: S.fees.tradeCount - n0 }; });
  R('n° 20 · 2e ouverture sur une paire tenue : refusée, la 1re reste ouverte, rien de fermé', a && r20.refus && r20.encore === 1 && r20.fermees === 0, r20);
  // n° 4 (Renforcer) : +2 % puis renforcement, fermeture au même prix → seul le 1er achat a gagné
  const rf = await ev(() => { S.pairStates['BTC/USDT'].price = 102000; S.pairStates['BTC/USDT']._targetPrice = null; manuReinforce('BTC/USDT'); const p = S.openPositions.find(q => q.pair === 'BTC/USDT'); return { stake: p.stakeUsdt, entry: p.entryPrice }; });
  const fRf = await ferme(a.id, 'BTC/USDT', 102000);
  R('n° 4 · « ↑ Renforcer » après +2 % puis fermeture au même prix : l\'historique écrit +1,00 $ (50 $ × 2 %), pas +1,20 $', near(fRf.hist, 1.0, 1e-9), { renfort: rf, fermeture: fRf });
  // n° 4 (pyramide) : ETH 30 $ @2500, ajout à −3 %, fermeture à −1 %
  const b = await ouvre({ pair: 'ETH/USDT', px: 2500, stake: 30 });
  const py = await ev(() => { S.pairStates['ETH/USDT'].price = 2425; S.pairStates['ETH/USDT']._targetPrice = null; pyramidPosition(S.openPositions.find(q => q.pair === 'ETH/USDT').id); const p = S.openPositions.find(q => q.pair === 'ETH/USDT'); return { stake: p.stakeUsdt, expo: p.totalExposure, ajout: (p._pyramidEntries || [])[0] }; });
  const fPy = await ferme(b.id, 'ETH/USDT', 2475);
  const vrai = 30 * (2475 - 2500) / 2500 + (py.ajout ? py.ajout.stake * (2475 - 2425) / 2425 : 0);
  R('n° 4 · pyramide (30 $ @2500 + ' + (py.ajout && py.ajout.stake) + ' $ @2425), fermée @2475 : l\'historique écrit le P&L des deux entrées (' + vrai.toFixed(4) + ' $)', near(fPy.hist, vrai, 1e-9), { pyramide: py, fermeture: fPy });
  // n° 5 + 21 : levier ×10, −15 %
  const c = await ouvre({ pair: 'SOL/USDT', px: 200, stake: 30, lev: 10 });
  if (!c || !(c.lev > 0)) R('n° 5 · levier ×10 : ouverture avec emprunt', false, c);
  else {
    const fL = await ferme(c.id, 'SOL/USDT', 170);
    R('n° 5 · levier ×' + (c.expo / c.stake) + ' (mise 30 $, exposition ' + c.expo + ' $), prix −15 % : le compte perd ce que l\'historique écrit (−30 $), frais à part', near(fL.hist, -30, 1e-9) && near(fL.delta, 30 - 30 - fL.fees, 1e-6), fL);
    R('n° 21 · frais de cette fermeture calculés sur l\'exposition (' + c.expo + ' $) ; le journal garde la mise dans « notional » (lu par la décision)', fL.exposure === c.expo && fL.notional === c.stake && near(fL.fees, fL.attendu, 1e-9), { notional: fL.notional, exposure: fL.exposure, fees: fL.fees, attendu: fL.attendu });
  }
  // n° 6 : urgence avec une position à levier et une position du bot
  const d = await ouvre({ pair: 'XRP/USDT', px: 2, stake: 30, lev: 5 }), e = await ouvre({ pair: 'ADA/USDT', px: 0.7, stake: 20, auto: true });
  const u = await ev(() => { S.pairStates['XRP/USDT'].price = 2.04; S.pairStates['ADA/USDT'].price = 0.69; const b0 = S.leverageBorrowed, n0 = S.fees.tradeCount, h0 = ['XRP/USDT', 'ADA/USDT'].map(p => S.pairStates[p].trades.length);
    urgenceCloseAll(); return { ouvertes: S.openPositions.length, empruntAvant: b0, empruntApres: S.leverageBorrowed, fermees: S.fees.tradeCount - n0, lignes: ['XRP/USDT', 'ADA/USDT'].map((p, i) => S.pairStates[p].trades.length - h0[i]), types: ['XRP/USDT', 'ADA/USDT'].map(p => { const t = S.pairStates[p].trades; return t[t.length - 1] && t[t.length - 1].type; }), journal: S.chainLog.filter(l => /^URGENCE/.test(l.desc)).map(l => l.desc).slice(-2) }; });
  R('n° 6 · « Fermer toutes » : par closePosition — 2 fermetures comptées (frais), 1 ligne d\'historique « urgence » par paire, levier rendu', d && e && u.ouvertes === 0 && u.fermees === 2 && u.lignes.every(n => n === 1) && u.types.every(t => t === 'urgence') && u.empruntApres < u.empruntAvant, u);
  // n° 8 : sortie de page avec une position du bot
  const g = await ouvre({ pair: 'BTC/USDT', px: 100000, stake: 25, auto: true });
  const x8 = await ev(() => { const n0 = S.fees.tradeCount; ['pagehide', 'beforeunload', 'freeze'].forEach(t => { try { window.dispatchEvent(new Event(t)); document.dispatchEvent(new Event(t)); } catch (e) {} }); return { encore: S.openPositions.filter(p => p.pair === 'BTC/USDT').length, fermees: S.fees.tradeCount - n0 }; });
  R('n° 8 · pagehide / beforeunload / freeze avec une position du bot : elle reste ouverte, rien de fermé', g && x8.encore === 1 && x8.fermees === 0, x8);
  // n° 8 (suite, revue du 13/10) : position du bot à plat depuis 2 h, AUCUN prix réel (réseau coupé : la relance sans Wi-Fi) — la page tourne 10 s
  const z = await ev(() => { const p = S.openPositions.find(q => q.pair === 'BTC/USDT'); if (p) { p.openedAt = Date.now() - 7200000; p.entryPrice = S.pairStates['BTC/USDT'].price; } return { age: typeof _rcPriceAge === 'function' ? String(_rcPriceAge('BTC/USDT')) : '?' }; });
  await P.page.waitForTimeout(10000);
  const z2 = await ev(() => ({ encore: S.openPositions.filter(p => p.pair === 'BTC/USDT').length, zombie: S.chainLog.filter(l => /anti-zombie · BTC/.test(l.desc)).length }));
  R('n° 8 · position du bot à plat depuis 2 h, aucun prix réel reçu (âge ' + z.age + ') : 10 s de marche de la page, elle reste ouverte (avant : « anti-zombie 120min flat »)', z2.encore === 1 && z2.zombie === 0, z2);
  // urgence (revue C2) : aucun juge — la fitness des agents et les stats EV ne bougent pas
  const u2 = await ev(() => { const fit = JSON.stringify((S.agents || []).map(a => a.fitness)), st = JSON.stringify(S.paperRealStats || {}); urgenceCloseAll(); return { fitnessInchangee: JSON.stringify((S.agents || []).map(a => a.fitness)) === fit, statsInchangees: JSON.stringify(S.paperRealStats || {}) === st, ouvertes: S.openPositions.length }; });
  R('n° 6 · « Fermer toutes » sur une position du bot : fermée, sans jugement (fitness des agents et stats EV inchangées)', u2.ouvertes === 0 && u2.fitnessInchangee && u2.statsInchangees, u2);
  // n° 2 / 3 : imports d'un vieux fichier (EV 500 $ / 3 trades, AUTO, mode RE, caisse 55 %)
  const imp = await ev(async () => {
    // l'argent et l'historique de chaque portefeuille (la page tourne : prix et bougies de pairStates bougent entre deux lectures, l'argent non)
    const dig = w => JSON.stringify({ t: w.tradingAccount, c: w.cashAccount, f: w.fiscalReserveAccount, o: w.ownFundsInjected, n: w.totalTrades, g: w.winTrades, pos: (w.openPositions || []).map(p => p.id),
      fees: w.fees && [w.fees.tradeCount, w.fees.totalPnlNet, w.fees.totalGross], cl: (w.cashLog || []).length, fisc: w.fiscal ? JSON.stringify(w.fiscal) : null,
      ps: Object.keys(w.pairStates || {}).sort().map(k => [k, w.pairStates[k].totalTrades, w.pairStates[k].totalPnlUsd, (w.pairStates[k].trades || []).length]) });
    const diff = (x, y) => Object.keys(x).filter(k => x[k] !== y[k]);
    const lire = () => ({ ev: dig(S.walletStore.paperReal), aa: dig(S.walletStore.sim), re: dig(S.walletStore.real), auto: S.botAutoMode, mode: S.tradingMode, split: S.profitSplitCaissePct, cycle: S.cycle });
    const vieux = { walletStore: { sim: { tradingAccount: 1 }, paperReal: { tradingAccount: 500, totalTrades: 3, pairStates: {}, openPositions: [] }, real: { tradingAccount: 2 } }, tradingMode: 'real', botAutoMode: true, mode: 'auto', profitSplitCaissePct: 55, leverage: 5,
      cycle: 900000, tradingAccount: 500, pairStates: { 'BTC/USDT': { totalTrades: 1 } }, fees: { totalPnlNet: 7 }, paperRealStats: {} };
    const f = (cfg) => new File([JSON.stringify({ meta: { app: 'AURA', date: Date.now(), label: 'vieux' }, state: Object.assign({}, vieux, { paperRealConfig: Object.assign({}, S.paperRealConfig, cfg) }) })], 'vieux.json');   // + une configuration qui change
    const av = lire(); await importBackupMaxPermissive(f({ __sonde: 1 })); const apMax = lire(); await importBackup(f({ __sonde: 2 })); const apSec = lire();
    if (!S.paperRealConfig || S.paperRealConfig.__sonde !== 2) return { max: ['configuration non importée'], securise: [] };
    // revue C3 / C6 : un backup COMPLET de l'app (tous ses champs), additionnels communaux 9 %, cours € 0,5, levier 5 %, Bunker « fermer », « __proto__ » ;
    // MAX PERMISSIF puis la passe du bot fiscal (16) : l'argent ne bouge pas, le prototype de S non plus
    const full = _buildFullBackup('sonde', 'manual'); const fs2 = full.state;
    fs2.paperRealConfig = Object.assign({}, fs2.paperRealConfig || {}, { __sonde: 3 }); if (Object.prototype.hasOwnProperty.call(S, 'dcThreshold')) fs2.dcThreshold = (Number(S.dcThreshold) || 0) + 0.123;   // deux champs de la décision qui changent
    fs2.fiscalCfg = Object.assign({}, fs2.fiscalCfg || {}, { commune: 9 }); fs2.usdEurRate = 0.5; fs2.leverageBorrowRate = 0.05; fs2.bunkerCfg = Object.assign({}, fs2.bunkerCfg || {}, { actions: { closePositions: true } });
    const txt = JSON.stringify(full).replace(/^\{/, '{"__x":1,').replace('"state":{', '"state":{"__proto__":{"fullPowerMode":true},');
    const proto0 = Object.getPrototypeOf(S), avFull = lire();
    await importBackupMaxPermissive(new File([txt], 'complet.json')); try { if (typeof _fiscAdjustAll === 'function') _fiscAdjustAll('sonde'); } catch (e) {}
    const apFull = lire(), complet = diff(avFull, apFull).concat(Object.getPrototypeOf(S) === proto0 ? [] : ['prototype']).concat(S.fullPowerMode === true ? ['fullPowerMode'] : []);
    return { max: diff(av, apMax), securise: diff(apMax, apSec), complet };

  });
  R('n° 2 · « Importer MAX PERMISSIF » : 3 portefeuilles, AUTO / MANU, mode, caisse, cycle inchangés', imp.max.length === 0, imp.max);
  R('n° 3 · « Importer SÉCURISÉ » : idem', imp.securise.length === 0, imp.securise);
  R('revue C3 / C6 · MAX PERMISSIF d\'un backup COMPLET (fiscal 9 %, cours € 0,5, levier 5 %, Bunker « fermer », « __proto__ ») puis passe du bot fiscal : argent, AUTO / MANU, mode, caisse, cycle, prototype de S inchangés', imp.complet && imp.complet.length === 0, imp.complet);
  const dl = P.dialogs.filter(m => /IMPORT MAX|Importer ce backup/.test(m)).map(m => m.split('\n').filter(l => /REMPLAC|Ne changent|protég|agents|décision/.test(l)).join(' / '));
  R('n° 2 / 3 · les 3 confirmations nomment ce qui change et ce qui ne change pas ; celle du backup complet nomme d\'abord les champs de la décision', dl.length === 3 && dl.every(t => /REMPLAC/.test(t) && /Ne changent PAS/.test(t)) && !dl.some(t => /sont protégées/.test(t)) && /🧠 décision \(\d+\)/.test(dl[2]) && !/… et \d+ autres/.test(P.dialogs.join('\n')), dl.map(t => t.slice(0, 300)));
  R('page 1 : aucune erreur de page', P.perr.length === 0, P.perr);
  await P.ctx.close();

  // ───────── 2. n° 1 : stockage NEUF, puis le backup restauré comme « Importer backup » ─────────
  const N = await page0(false);
  const n1 = await N.page.evaluate(async (snap) => {
    await new Promise(r => setTimeout(r, 1500));   // les migrations du boot (02, 09b2) ont tourné sur l'état vide et posé leurs drapeaux
    const db = await openDB(); await new Promise(r => { const tx = db.transaction(RT.STORE_STATE, 'readwrite'); tx.objectStore(RT.STORE_STATE).put(snap, RT.SAVE_KEY); tx.oncomplete = () => r(); tx.onerror = () => r(); });
    try { localStorage.setItem(RT.SAVE_KEY, JSON.stringify(snap)); } catch (e) {}
    await loadState();
    const o = {}; ['sim', 'paperReal', 'real'].forEach(m => { const w = S.walletStore[m]; o[m] = { trading: w.tradingAccount, caisse: w.cashAccount, courbe: (w.pnlHistory || []).length }; });
    return o;
  }, st);
  ['sim', 'paperReal', 'real'].forEach(m => { const w = st.walletStore[m]; R('n° 1 · stockage neuf + restauration : ' + m + ' — trading, caisse et courbe du backup (' + (+w.tradingAccount).toFixed(2) + ' $, ' + (w.pnlHistory || []).length + ' points)',
    near(n1[m].trading, w.tradingAccount, 1e-9) && near(n1[m].caisse, w.cashAccount, 1e-9) && n1[m].courbe === (w.pnlHistory || []).length, n1[m]); });
  R('page 2 : aucune erreur de page', N.perr.length === 0, N.perr);
  await N.ctx.close(); await browser.close(); server.close();
  const ko = res.filter(r => !r.ok).length;
  console.log(ko ? '⚠ ' + ko + ' écart(s) sur ' + res.length : '✅ ' + res.length + ' / ' + res.length);
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ code: ROOT, backup: path.basename(BACKUP), res }, null, 1));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); try { server.close(); } catch (_e) {} process.exit(3); });
