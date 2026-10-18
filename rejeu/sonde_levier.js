// [GO LEVIER · 18/10/2026] VERSION 20261018c · rejeu/sonde_levier.js — le levier joué par la VRAIE page (ETAT n° 25, 26, 29).
//   node rejeu/sonde_levier.js --root <dossier du code> --backup <aura_guardian_full_….json> [--port 8975] [--out <f.json>]
// Une page Chromium servie depuis --root, réseau coupé, l'état RÉEL du backup (EV à l'écran, MANU pour que le bot reste immobile, migrations « une fois »
// marquées faites). Les VRAIS gestes : le bouton « + » du levier (×0 → ×1), une position manuelle (vraie openPosition) dont la mise est changée par la
// VRAIE fiche ✏️ (champ « Mise », bouton « ✓ Appliquer »), une position dont la mise dépasse le trading (emprunt « juste à temps »), les cartes et le
// P&L latent avec un prix qui bouge, les fermetures, le VRAI transfert trading → caisse (modale), puis un rechargement. À chaque pas : les fonds propres
// (caisse + trading + mises + réserve − dette versée en argent) ne bougent que du résultat réalisé moins les frais. Sur le code d'avant (commit a82841b)
// elle montre les défauts ; sur le code livré, elle rend 0. Un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (_e) {} } }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_levier.js --root <code> --backup <backup.json> [--port 8975] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), BACKUP = path.resolve(args.backup), PORT = Number(args.port || 8975);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];   // liste de rejeu/sonde_modes.js
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 700) : '')); };

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8')), st = BK.aura; st.tradingMode = 'paperReal'; st.botAutoMode = false;   // MANU : le bot n'ouvre rien pendant la sonde
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_levier')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
    localStorage.setItem('aura_current_trade_mode', 'paperReal'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_levier', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
  const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 } });
  await ctx.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [], dialogs = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message() }); d.accept().catch(() => {}); });
  const pret = async () => {
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && S.agents && S.agents.length > 0)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(4000);
  };
  const ev = (fn, a) => page.evaluate(fn, a);
  const clic = async (sel) => { const n = await page.$(sel); if (!n) return false; await n.click({ timeout: 5000 }).catch(() => ev(s => document.querySelector(s).click(), sel)); await page.waitForTimeout(500); return true; };
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  await ev(() => { window.__toasts = []; const o = window.showToast; window.showToast = function (t, d, l) { window.__toasts.push([String(t), l || 'info']); return o.apply(this, arguments); }; try { showToast = window.showToast; } catch (e) {} });
  // fonds propres EV et ce que les fermetures ont réalisé / payé (historique, journal des frais) — lus dans la page
  const FONDS = () => ev(() => {
    const w = S, cashOf = p => { const tot = Number(p.levBorrowed) || 0; return (p._levCash != null) ? Math.min(tot, Number(p._levCash)) : Math.max(0, tot - Math.max(0, (Number(p.totalExposure) || 0) - (Number(p.stakeUsdt) || 0))); };
    const stakes = w.openPositions.reduce((a, p) => a + (Number(p.stakeUsdt) || 0), 0), expo = w.openPositions.reduce((a, p) => a + Math.max(0, (Number(p.levBorrowed) || 0) - cashOf(p)), 0);
    return { f: w.cashAccount + w.tradingAccount + stakes + (w.antiNegReserve || 0) - (w.leverageBorrowed - expo), cash: w.cashAccount, tr: w.tradingAccount, debt: w.leverageBorrowed, lev: w.leverage,
      fees: w.fees.feeLog.length ? w.fees.feeLog[0].ts : 0, nf: w.fees.feeLog.length, nPos: w.openPositions.length };
  });
  const REAL = (since) => ev((t0) => {
    let got = 0, paid = 0; Object.values(S.pairStates).forEach(ps => (ps.trades || []).forEach(t => { if (t.type === 'position' && t.ts >= t0) got += t.pnlUsdt; }));
    S.fees.feeLog.forEach(e => { if (e.ts >= t0) paid += e.totalFee; }); return { got, paid };
  }, since);
  const PAIRS3 = await ev(() => Object.keys(S.pairStates).filter(p => S.pairStates[p].price > 0 && !S.openPositions.some(o => o.pair === p)).slice(0, 3));
  const [PA, PB] = PAIRS3; const KA = PA.replace('/', '_'), KB = PB.replace('/', '_');
  const t0 = await ev(() => Date.now()); const F0 = await FONDS();
  R('départ · EV, MANU, levier ×' + F0.lev + ', dette ' + F0.debt.toFixed(2) + ' $, ' + F0.nPos + ' position(s)', F0.lev === 0 && F0.debt === 0, F0);

  // ───────── 1. levier ×0 → ×3 par le VRAI bouton « + » (trois appuis) ─────────
  for (let i = 0; i < 3; i++) await clic('button[onclick="changeLeverage(+1)"]');
  const F1 = await FONDS();
  R('levier · bouton « + » ×3 : trois fois le capital emprunté versé au trading, fonds propres inchangés', F1.lev === 3 && F1.debt > 0 && Math.abs(F1.tr - F0.tr - F1.debt) < 1e-6 && Math.abs(F1.f - F0.f) < 1e-6, F1);

  // ───────── 2. position manuelle A, mise 30 → 40 $ par la VRAIE fiche ✏️ ─────────
  const pA = await ev((pa) => { const ps = S.pairStates[pa]; ps.stake = 30; ps.pairLeverage = 1; const p = openPosition(pa, 'long'); return p ? { id: p.id, e: p.entryPrice, stake: p.stakeUsdt, expo: p.totalExposure, cash: p._levCash } : null; }, PA);
  R('position A · ' + PA + ' LONG 30 $ ouverte par openPosition', !!pA, pA);
  const trAvant = (await FONDS()).tr;
  await ev((id) => openPosEdit(id), pA.id); await page.waitForTimeout(400);
  await page.fill('#peStakeInput', '40'); await clic('#posEditModal button[onclick="applyPosEdit()"]');
  const eA = await ev((id) => { const p = S.openPositions.find(x => x.id === id); return { stake: p.stakeUsdt, expo: p.totalExposure, e: p.entryPrice, tr: S.tradingAccount, t: window.__toasts.slice(-2) }; }, pA.id);
  const F2 = await FONDS();
  R('fiche ✏️ · mise 30 → 40 $ : 10 $ retirés du trading, exposition 40, fonds propres inchangés', eA.stake === 40 && eA.expo === 40 && Math.abs(trAvant - eA.tr - 10) < 1e-6 && Math.abs(F2.f - F0.f) < 1e-6, eA);
  await ev((id) => openPosEdit(id), pA.id); await page.waitForTimeout(400);
  await page.fill('#peStakeInput', '20'); await clic('#posEditModal button[onclick="applyPosEdit()"]');
  const rA = await ev((id) => { const p = S.openPositions.find(x => x.id === id); return { stake: p.stakeUsdt, t: window.__toasts.slice(-4).filter(x => /Mise|mise/.test(x[0])) }; }, pA.id);
  R('fiche ✏️ · réduire 40 → 20 $ : refusé et dit (aucune vente partielle)', rA.stake === 40 && /non réduite/.test(JSON.stringify(rA.t)), rA);

  // ───────── 3. position B dont la mise dépasse le trading : emprunt « juste à temps » ─────────
  const pB = await ev((pb) => { const ps = S.pairStates[pb]; ps.stake = Math.round(S.tradingAccount + 40); ps.pairLeverage = 1; const p = openPosition(pb, 'long'); return p ? { id: p.id, e: p.entryPrice, stake: p.stakeUsdt, lev: p.levBorrowed, cash: p._levCash, tr: S.tradingAccount } : { refus: window.__toasts.slice(-1) }; }, PB);
  const F3 = await FONDS();
  R('position B · ' + PB + ' : mise = trading + 40 $, 40 $ empruntés « juste à temps », marqués en argent (_levCash), fonds propres inchangés', pB && pB.id && Math.abs(pB.lev - 40) < 1 && Math.abs((pB.cash || 0) - pB.lev) < 1e-9 && Math.abs(F3.f - F0.f) < 1e-6, pB);
  if (!(pB && pB.id)) { console.log('position B absente : fin'); await browser.close(); server.close(); process.exit(1); }
  const pTrop = await ev((pc) => { if (!pc) return { skip: true }; const ps = S.pairStates[pc]; ps.stake = Math.round(S.tradingAccount + S.leverageReserve * 5 + 100); const p = openPosition(pc, 'long'); return { ouverte: !!p, t: window.__toasts.slice(-1) }; }, PAIRS3[2]);
  R('position C · mise au-delà de ce que le trading et l\'emprunt couvrent : refusée et dite, rien ne bouge', pTrop.skip || (!pTrop.ouverte && Math.abs((await FONDS()).f - F3.f) < 1e-6), pTrop);

  // ───────── 4. le prix bouge : P&L latent, carte, valeur, estimations — une seule mesure ─────────
  const m = await ev(([pa, pb, ka, kb]) => {
    S.pairStates[pa].price *= 1.02; S.pairStates[pb].price *= 0.97;
    renderPositions(); try { renderActionsGrid(); } catch (e) {}
    const out = {};
    [[pa, ka], [pb, kb]].forEach(([pair, k]) => {
      // ce que closePosition réaliserait et ce que recordFees prendrait (formules de 02, écrites ici : la sonde tourne aussi sur le code d'avant)
      const p = S.openPositions.find(x => x.pair === pair), ps = S.pairStates[pair], st = Number(p.stakeUsdt) || 0, ex = Number(p.totalExposure) || st, e = p.entryPrice, px = ps.price;
      const pct = p.side === 'long' ? ((px - e) / e) * 100 : ((e - px) / e) * 100, rp = Math.max(-100, Math.min(500, pct)), usd = Math.max(-st, ex * (rp / 100));
      const fc = S.feeConfig, n = ex, tf = n * fc.takerRate + n * ((p.auto && rp > 0.3) ? fc.makerRate : fc.takerRate), sf = n * fc.slippage * 2;
      const lt = { pct, usd, val: st + usd }, cf = { total: tf + sf };
      const fund = p.stakeUsdt * S.feeConfig.fundingRate, reg = S.taxConfig.regions[S.taxConfig.region], ng = lt.usd - (cf.total + fund), tax = ng > 0 ? ng * reg.inclusion * reg.rate : 0, net = lt.usd - cf.total - fund - tax;
      out[pair] = { usd: p.pnlUsdt, lt: lt.usd, val: p.currentVal, ltv: lt.val, netAttendu: (net >= 0 ? '+' : '−') + '$' + Math.abs(net).toFixed(2), carteNet: (document.getElementById('ac2_gp_' + k) || {}).textContent || null,
        valAttendue: '$' + lt.val.toFixed(2), carteVal: (document.getElementById('ac2_val_' + k) || {}).textContent || null };
    });
    return out;
  }, [PA, PB, KA, KB]);
  const okM = Object.values(m).every(x => x.usd === x.lt && x.val === x.ltv && (x.carteNet === null || x.carteNet.includes(x.netAttendu)) && (x.carteVal === null || x.carteVal === x.valAttendue));
  R('mesure · P&L latent et valeur de chaque position = ce que closePosition réaliserait ; la carte affiche le net et la valeur de cette mesure', okM, m);

  // ───────── 5. fermetures (vraie closePosition, bouton ✕ des positions manuelles) ─────────
  await ev(([a, b]) => { closePosition(a); closePosition(b); }, [pA.id, pB.id]);
  const F5 = await FONDS(), r5 = await REAL(t0);
  R('fermetures · fonds propres = départ + résultats − frais (l\'emprunt « juste à temps » rendu au prêteur sur le trading)', Math.abs(F5.f - (F0.f + r5.got - r5.paid)) < 1e-6 && F5.nPos === F0.nPos, { F5, r5, ecart: F5.f - (F0.f + r5.got - r5.paid) });
  const jB = await ev(() => S.chainLog.slice(-8).map(l => l.desc).filter(d => /rendus au prêteur/.test(d)));
  R('journal · « empruntés pour la mise rendus au prêteur »', jB.length === 1, jB);

  // ───────── 6. VRAI transfert trading → caisse (modale) : la dette libre de l'index est rendue sur le trading ─────────
  await ev(() => openTransferModal()); await page.waitForTimeout(300);
  await clic('#transferModal .tr-arrow'); await page.fill('#transferInput', '50'); await clic('#transferModal .transfer-confirm');
  const F6 = await FONDS(), t6 = await ev(() => window.__toasts.slice(-4).filter(x => /Caisse/.test(x[0])));
  const q6 = dialogs.filter(d => d.type === 'confirm').slice(-1);
  R('transfert · 50 $ vers la caisse : la question dit ce qui change (acceptée) ; index ×0, dette rendue sur le trading, fonds propres inchangés, le message le dit', q6.length === 1 && /rend d'abord au prêteur/.test(q6[0].msg) && F6.lev === 0 && F6.debt < 1e-9 && Math.abs(F6.cash - F5.cash - 50) < 1e-6 && Math.abs(F6.f - F5.f) < 1e-6 && /rendu au prêteur/.test(JSON.stringify(t6)) && /×0/.test(JSON.stringify(t6)), { F6, t6, q6 });

  // ───────── 7. rechargement ─────────
  await ev(async () => { await saveState(true); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  const F7 = await FONDS();
  R('rechargement · levier ×0, dette 0, fonds propres gardés', F7.lev === 0 && F7.debt < 1e-9 && Math.abs(F7.f - F6.f) < 1e-6, F7);
  R('aucune erreur de page', perr.length === 0, perr);

  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '⚠ ' + ko + ' défaut(s) montré(s)' : '✅ 0 défaut') + ' · ' + res.length + ' étapes · code ' + ROOT + ' · paires ' + PAIRS3.join(', '));
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ root: ROOT, res, dialogs }, null, 1));
  await browser.close(); server.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
