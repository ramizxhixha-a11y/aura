// [GO DÉMO · 12/10/2026] VERSION 20261012a · rejeu/sonde_demo_vie.js — la réparation du Mode Démo prouvée sur le VRAI code de l'app, par différence.
// Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 22. (Idée de la revue contradictoire du 13/10 : le banc banc-demo-retire.js imite
// l'ouverture et la fermeture d'une position ; ici ce sont les VRAIES fonctions qui jouent.)
//   node rejeu/sonde_demo_vie.js --root <dossier du code> --avant <backup d'AVANT l'accident.json> --apres <backup pris JUSTE APRÈS.json> [--ecran paperReal|sim] [--port 8961] [--out <f.json>]
// Deux pages Chromium servies depuis --root, réseau coupé :
//   A · part de l'état RÉEL d'après l'accident (--apres : le compte porte les faux chiffres, aucun trade encore fait depuis) ;
//   B · part de l'état RÉEL d'avant (--avant) : le monde sans accident.
// Les deux vivent la MÊME suite, jouée par les vraies fonctions (02 openPosition / closePosition → frais, registre fiscal, part du gain versée en caisse ;
// 09b2 saveState puis rechargement = vrai recalage de relance ; 09d1 _computePnlByPeriod avec le jour avancé = vraie ligne d'historique ; une position
// laissée ouverte). Puis A est réparé par js/18-reparation-demo.js avec --avant, et le portefeuille EV de A est comparé à celui de B, champ par champ :
// l'argent au milliardième, les lignes d'historique journalier au centime (elles sont écrites arrondies), l'historique des paires ligne à ligne hors heures.
// --ecran sim : la même chose avec l'AA à l'écran (l'EV vit « derrière ») — c'est là que la réserve de levier recalculée se serait décalée d'une mise en cours.
// La sonde rend 0 si A réparé = B, 1 sinon (les écarts sont listés), 2 si la réparation refuse. Un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (e2) {} } }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.avant || !args.apres) { console.error(chromium ? 'usage : node rejeu/sonde_demo_vie.js --root <code> --avant <backup d\'avant> --apres <backup juste après> [--ecran paperReal|sim] [--port 8961] [--out f.json]' : 'playwright introuvable'); process.exit(2); }
const ROOT = path.resolve(args.root), AVANT = path.resolve(args.avant), APRES = path.resolve(args.apres), PORT = Number(args.port || 8961), ECRAN = args.ecran === 'sim' ? 'sim' : 'paperReal';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];   // les migrations uniques déjà faites sur la tablette (liste de rejeu/sonde_modes.js)
// ── exécuté dans la page ──
const lireEV = () => {
  const w = S.walletStore.paperReal, sansHeure = t => { const o = Object.assign({}, t); ['ts', 'time', 'entryTs', 'entryTime'].forEach(k => delete o[k]); return o; }, paires = {};
  Object.keys(w.pairStates).forEach(p => { const ps = w.pairStates[p]; paires[p] = { totalTrades: ps.totalTrades, winTrades: ps.winTrades, totalPnlUsd: ps.totalPnlUsd, totalPnlPct: ps.totalPnlPct, trades: (ps.trades || []).map(sansHeure) }; });
  return JSON.parse(JSON.stringify({ ecran: S.tradingMode, cashAccount: w.cashAccount, tradingAccount: w.tradingAccount, portfolio: w.portfolio, _startPortfolio: w._startPortfolio, _totalCompounded: w._totalCompounded,
    leverageReserve: w.leverageReserve, antiNegReserve: w.antiNegReserve, fiscalReserveAccount: w.fiscalReserveAccount, capRef: w.bunker && w.bunker.capRef, totalTrades: w.totalTrades, winTrades: w.winTrades,
    pnlPeriod: w.pnlPeriod, courbe: Array.from(new Set(w.pnlHistory.map(v => Math.round(v * 1e6) / 1e6))).sort(), fees: w.fees && { tradeCount: w.fees.tradeCount, totalTradingFees: w.fees.totalTradingFees, totalSlippage: w.fees.totalSlippage,
      totalFunding: w.fees.totalFunding, totalPnlGross: w.fees.totalPnlGross, totalPnlNet: w.fees.totalPnlNet, feeReserveAccount: w.fees.feeReserveAccount },
    caisse3: (w.cashLog || []).slice(0, 3).map(e => [e.source, e.amount]), fiscalLignes: w.fiscal && w.fiscal.hist && w.fiscal.hist.length, positions: (w.openPositions || []).map(q => [q.pair, q.side, q.stakeUsdt]),
    faux: Object.values(w.pairStates).reduce((n, ps) => n + (ps.trades || []).filter(t => window._demoReparation.faux(t)).length, 0), paires }));
};
const reglages = () => { S.profitSplitCaissePct = 55; try { if (typeof setBotMode === 'function') setBotMode(false); } catch (e) {} S.botAutoMode = false; return [S.profitSplitCaissePct, S.botAutoMode, S.tradingMode]; };   // même partage des gains des deux côtés ; bot en manuel : seule la suite jouée bouge le compte
const trade = o => {   // un trade manuel LONG par les vraies fonctions, dans le mode EV (bascule de contexte si l'écran en montre un autre, comme le multiplexeur de 09d)
  const ecran = S.tradingMode; S.tradingMode = 'paperReal';
  try { const ps = S.pairStates[o.pair], mise0 = ps.stake; ps.price = o.px; ps._targetPrice = null; ps.stake = o.stake; const pos = openPosition(o.pair, 'long'); ps.stake = mise0;
    if (!pos) return { err: 'ouverture refusée' }; if (o.laisser) return { ouverte: pos.id, mise: pos.stakeUsdt };
    ps.price = o.px * (1 + o.pct / 100); closePosition(pos.id); return { fermee: true, trading: S.tradingAccount, caisse: S.cashAccount, fermetures: S.fees.tradeCount };
  } finally { S.tradingMode = ecran; }
};
const jourSuivant = cle => { const ecran = S.tradingMode; S.tradingMode = 'paperReal'; try { window._getTodayKey = function () { return cle; }; try { _getTodayKey = window._getTodayKey; } catch (e) {} _computePnlByPeriod(); const h = S.pnlPeriod.history; return [S.pnlPeriod.todayDate, h[h.length - 1]]; } finally { S.tradingMode = ecran; } };
(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch(), journal = [];
  const ouvrir = async (fichier, nom) => {
    const st = JSON.parse(fs.readFileSync(fichier, 'utf8')).aura; st.tradingMode = ECRAN;
    const init = `(() => { try { if (!sessionStorage.getItem('__sonde_vie')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
      localStorage.setItem('aura_current_trade_mode', '${ECRAN}'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_vie', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
    const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 } });
    await ctx.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort());
    await ctx.addInitScript(init); const page = await ctx.newPage(), perr = [];
    page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); }); page.on('dialog', d => d.dismiss().catch(() => {}));
    const pret = async () => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length > 0 && S.walletStore && S.walletStore.paperReal)).catch(() => false)) return true; await page.waitForTimeout(100); } return false; };
    await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); if (!await pret()) throw new Error(nom + ' : état non restauré'); await page.waitForTimeout(3000);
    return { nom, page, pret, perr };
  };
  const A = await ouvrir(APRES, 'A (après l\'accident)'), B = await ouvrir(AVANT, 'B (sans accident)');
  const surLesDeux = async (quoi, fn, arg) => { const r = []; for (const P of [A, B]) r.push(await P.page.evaluate(fn, arg)); journal.push(quoi + ' → A ' + JSON.stringify(r[0]) + ' | B ' + JSON.stringify(r[1])); return r; };
  const depart = await surLesDeux('départ (EV : portefeuille, trades, faux trades)', () => { const w = S.walletStore.paperReal; return [w.portfolio, w.totalTrades, Object.values(w.pairStates).reduce((n, ps) => n + (ps.trades || []).filter(t => window._demoReparation.faux(t)).length, 0)]; });
  if (!(depart[0][2] > 0) || depart[1][2] !== 0) { console.error('départ inattendu : A doit porter les faux trades, B aucun', JSON.stringify(depart)); await browser.close(); server.close(); process.exit(2); }
  await surLesDeux('réglages', reglages);
  await surLesDeux('trade 1 · BTC +1,2 % (gagnant : part versée en caisse)', trade, { pair: 'BTC/USDT', px: 84000, stake: 50, pct: 1.2 });
  await surLesDeux('trade 2 · ETH −0,9 % (perdant)', trade, { pair: 'ETH/USDT', px: 2550, stake: 40, pct: -0.9 });
  for (const P of [A, B]) {   // sauvegarde réelle, puis rechargement : le vrai recalage de relance (09b2)
    await P.page.evaluate(async () => { try { await saveState(true); } catch (e) {} }); await P.page.waitForTimeout(800); await P.page.evaluate(() => { window._stateReady = false; });
    await P.page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); if (!await P.pret()) throw new Error(P.nom + ' : après relance, état non restauré'); await P.page.waitForTimeout(3000);
  }
  await surLesDeux('après relance (départ de session, cumul, repère du jour, bunker)', () => { S.botAutoMode = false; const w = S.walletStore.paperReal; return [w._startPortfolio, w._totalCompounded, w.pnlPeriod.todayStartPortfolio, w.bunker.capRef]; });
  await surLesDeux('trade 3 · SOL +2,0 % (gagnant)', trade, { pair: 'SOL/USDT', px: 112, stake: 30, pct: 2.0 });
  await surLesDeux('le jour tourne (vraie ligne d\'historique)', jourSuivant, '2026-10-14');
  await surLesDeux('trade 4 · XRP −1,5 % (perdant)', trade, { pair: 'XRP/USDT', px: 1.42, stake: 25, pct: -1.5 });
  await surLesDeux('position 5 · DOGE laissée OUVERTE', trade, { pair: 'DOGE/USDT', px: 0.0874, stake: 35, laisser: true });
  // La réserve de levier du mode À L'ÉCRAN est reposée par l'app à chaque rendu du portefeuille (07) — à un instant qui dépend de la minuterie de chaque page. Pour comparer A et B au
  // même instant, la sonde la repose elle-même des deux côtés quand l'EV est à l'écran. Avec --ecran sim l'EV vit derrière, sa réserve reste celle de la dernière ouverture (mise
  // en cours non comptée) : on n'y touche pas — c'est le cas qui prouve que la réparation REMONTE la réserve gardée (10 × l'écart) au lieu de la recalculer.
  if (ECRAN === 'paperReal') await surLesDeux('réserve de levier reposée, comme un rendu du portefeuille', () => { syncLeverageReserve(); return S.walletStore.paperReal.leverageReserve; });
  else await surLesDeux('réserve de levier gardée (EV derrière l\'écran : pas reposée)', () => S.walletStore.paperReal.leverageReserve);
  const avantRep = await A.page.evaluate(lireEV), backup = JSON.parse(fs.readFileSync(AVANT, 'utf8')).aura;
  const rep = await A.page.evaluate(F => { const r = window._demoReparation.appliquer(S, F, 'paperReal'); return r.ok ? { ok: true, ecart: r.ecart, relance: r.relance, fermeturesDepuis: r.fermeturesDepuis, pairesRendues: r.pairesRendues, agents: r.agents.length, apres: r.apres } : { ok: false, code: r.code, msg: r.msg }; }, backup);
  const a = await A.page.evaluate(lireEV), b = await B.page.evaluate(lireEV);
  console.log(journal.join('\n').slice(0, 6000)); console.log('\nréparation de A :', JSON.stringify(rep));
  if (!rep.ok) { await browser.close(); server.close(); process.exit(2); }
  let ko = 0; const lignes = [];
  const dit = (nom, x, y, tol) => { const egal = (typeof x === 'number' && typeof y === 'number') ? Math.abs(x - y) <= (tol === undefined ? 1e-9 : tol) : JSON.stringify(x) === JSON.stringify(y); if (!egal) ko++; lignes.push((egal ? '  OK  ' : '  !!  ') + nom.padEnd(34) + ' A ' + String(JSON.stringify(x)).slice(0, 100) + (egal ? '' : '   ≠ B ' + String(JSON.stringify(y)).slice(0, 100))); };
  ['cashAccount', 'tradingAccount', 'portfolio', '_startPortfolio', '_totalCompounded', 'leverageReserve', 'antiNegReserve', 'fiscalReserveAccount', 'capRef'].forEach(k => dit(k, a[k], b[k]));
  ['totalTrades', 'winTrades', 'faux', 'positions', 'caisse3', 'fiscalLignes', 'courbe'].forEach(k => dit(k, a[k], b[k]));
  ['todayStartPortfolio', 'weekStartPortfolio', 'monthStartPortfolio'].forEach(k => dit('repère ' + k, a.pnlPeriod[k], b.pnlPeriod[k])); ['todayDate', 'weekStart', 'monthStart'].forEach(k => dit('repère ' + k, a.pnlPeriod[k], b.pnlPeriod[k]));
  dit('lignes d\'historique (nombre)', a.pnlPeriod.history.length, b.pnlPeriod.history.length);
  a.pnlPeriod.history.slice(-2).forEach((h, i) => { const g = b.pnlPeriod.history.slice(-2)[i] || {}; dit('ligne ' + h.date + ' date', h.date, g.date); ['start', 'end', 'pnlUsd', 'pnlPct'].forEach(k => dit('ligne ' + h.date + ' ' + k + ' (au centime)', h[k], g[k], 0.0101)); });
  Object.keys(a.fees || {}).forEach(k => dit('frais ' + k, a.fees[k], b.fees[k], k === 'tradeCount' ? 0 : 1e-9));
  let np = 0; Object.keys(b.paires).forEach(p => { const x = a.paires[p], y = b.paires[p]; const egal = x && x.totalTrades === y.totalTrades && x.winTrades === y.winTrades && Math.abs(x.totalPnlUsd - y.totalPnlUsd) < 1e-9 && Math.abs(x.totalPnlPct - y.totalPnlPct) < 1e-9 && JSON.stringify(x.trades) === JSON.stringify(y.trades);
    if (egal) np++; else { ko++; lignes.push('  !!  paire ' + p + ' : A ' + JSON.stringify(x && [x.totalTrades, x.winTrades, x.totalPnlUsd, x.trades.length]) + ' ≠ B ' + JSON.stringify([y.totalTrades, y.winTrades, y.totalPnlUsd, y.trades.length])); } });
  lignes.push('  ' + (np === Object.keys(b.paires).length && Object.keys(a.paires).length === np ? 'OK  ' : '!!  ') + np + ' / ' + Object.keys(b.paires).length + ' paires identiques (compteurs, gains cumulés, historique ligne à ligne hors heures)');
  console.log('\nA réparé contre B (sans accident) · écran ' + a.ecran + ' · A avant réparation : ' + avantRep.portfolio + ' $, ' + avantRep.totalTrades + ' trades, ' + avantRep.faux + ' faux trades'); console.log(lignes.join('\n'));
  console.log('\nerreurs de page · A', JSON.stringify(A.perr), '· B', JSON.stringify(B.perr)); console.log(ko ? '⚠ ' + ko + ' écart(s)' : '✅ A réparé = B, champ par champ');
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ code: ROOT, ecran: ECRAN, avant: path.basename(AVANT), apres: path.basename(APRES), journal, reparation: rep, ecarts: ko, lignes, a, b }, null, 1));
  await browser.close(); server.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); process.exit(3); });
