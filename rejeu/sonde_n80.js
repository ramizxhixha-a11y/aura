// [GO N° 80 · 15/11/2026] VERSION 20261115l · rejeu/sonde_n80.js — la poche tendance liquidée pendant la nuit, jouée par la VRAIE page (Chromium).
//   node rejeu/sonde_n80.js --root <code> [--avant <copie du code d'avant>] --backup <aura_guardian_full_….json> [--pair BTC/USDT] [--port 8980]
// La vraie app servie depuis --root sur 127.0.0.1, l'état RÉEL du backup (EV à l'écran, MANU, comme chez Rams). Réseau COUPÉ, sauf UNE réponse : la page
// de bougies 1 h que la poche (js/15 liqHist) demande pour la paire, avec une bougie de la nuit dont le plus haut dépasse 2 × l'entrée de la poche — ce
// que Binance rendrait au réveil de la tablette après une mèche. Aucun prix réel frais (_rcPriceAge = l'infini) : le ps.price de l'EV est celui du backup.
// Rien n'est appelé à la main : le minuteur de la poche (20 s après l'état prêt) liquide, celui de 15b (30 s, puis 20 s) suit. Un backup n'entre jamais
// dans le dépôt.
//   1. la poche liquide la paire (ligne « liquidation », x1 = 2 × x0) — le code de la poche n'a pas changé
//   2. la position EV de la paire est fermée par 15b : AU PRIX DE LA LIQUIDATION (avant : au ps.price sauvegardé de l'EV)
//   3. son résultat = ce que 02 closePosition réalise à ce prix (−100 % de la mise si 2 × x0 dépasse 2 × l'entrée de l'EV)
//   4. rien d'autre : les autres positions de la voix et la tienne restent, AA et RE inchangés, le prix est resté périmé
//   5. journal 💥, « pas rouverte cette semaine », aucun prix imposé laissé
//   6. un VRAI rechargement : fermée, ligne gardée, pas rouverte
//   (--avant) même passage sur le code d'avant → fermée au ps.price sauvegardé (le défaut n° 80)
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); } catch (e2) {} }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_n80.js --root <code> [--avant <code d\'avant>] --backup <backup.json> [--pair BTC/USDT] [--port 8980]'); process.exit(3); }
const PORT = Number(args.port || 8980), PAIR = args.pair || 'BTC/USDT', SYM = PAIR.replace('/', ''), HOUR = 3600000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
let RACINE = path.resolve(args.root);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(RACINE, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const BK = JSON.parse(fs.readFileSync(path.resolve(args.backup), 'utf8')), ST = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
const out = { backup: path.basename(args.backup), pair: PAIR, passages: {} };

async function passage(browser, racine, nom) {
  RACINE = path.resolve(racine);
  const res = [], R = (n, ok, detail) => { res.push({ n, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + n + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 500) : '')); };
  const st = JSON.parse(JSON.stringify(ST)), x0 = st.tendance.pos[PAIR].x0, x1 = 2 * x0;
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_n80')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
    localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', ${JSON.stringify(st.tradingMode || 'paperReal')});
    ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_n80', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const vus = { bougies: 0, coupes: 0 };
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue();
    const m = /api\.binance\.com\/api\/v3\/klines\?symbol=([A-Z]+)&interval=1h&startTime=(\d+)&limit=1000$/.exec(u);
    if (m && m[1] === SYM) {   // la page de bougies 1 h de la nuit : une mèche au-delà de 2 × x0 dans la 1re heure relue
      vus.bougies++; const o = Number(m[2]);
      const k = [o, String(x0 * 1.62), String(x1 * 1.03), String(x0 * 1.6), String(x0 * 1.64), '1', String(o + HOUR - 1), '1', 1, '1', '1', '0'];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([k]) });
    }
    vus.coupes++; return route.abort();
  });
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  const ev = (fn, a) => page.evaluate(fn, a);
  const pret = async () => { for (let i = 0; i < 900; i++) { if (await ev(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && window._tlr && window._tl)).catch(() => false)) break; await page.waitForTimeout(200); } };
  const W = (pair) => ev((pair) => {
    const w = S.walletStore, f = m => ({ trading: w[m].tradingAccount, cash: w[m].cashAccount, n: (w[m].openPositions || []).length, ids: (w[m].openPositions || []).map(p => p.id).sort().join(',') });
    const evw = w.paperReal, pos = (evw.openPositions || []).find(p => p.pair === pair && p._voix === 'tendance') || null;
    const tr = ((evw.pairStates[pair] || {}).trades || []).filter(x => x.type === 'tendance').slice(-1)[0] || null;
    const h = (S.tendance.hist || []).filter(x => x.p === pair).slice(-1)[0] || null;
    return { ecran: S.tradingMode, auto: S.botAutoMode, sim: f('sim'), ev: f('paperReal'), re: f('real'), pos: pos && { id: pos.id, side: pos.side, e: pos.entryPrice, stake: pos.stakeUsdt, forced: pos._forcedExitPx },
      voix: (evw.openPositions || []).filter(p => p._voix === 'tendance').map(p => p.pair).sort(), autres: (evw.openPositions || []).filter(p => p._voix !== 'tendance').map(p => p.id),
      psPrice: evw.pairStates[pair] && evw.pairStates[pair].price, age: _rcPriceAge(pair), poche: S.tendance.pos[pair] ? S.tendance.pos[pair].side : null,
      h: h && { why: h.why, x0: h.x0, x1: h.x1, t1: h.t1 }, tr: tr && { price: tr.price, pnlUsdt: tr.pnlUsdt, pnl: tr.pnl, time: tr.time },
      attente: (S.tendance.reel && S.tendance.reel.attente || {})[pair] || null, real: S.tendance.reel && S.tendance.reel.real,
      journal: S.chainLog.filter(x => /Tendance (réelle|longue)/.test(x.desc) && x.desc.indexOf(pair) >= 0).map(x => x.icon + ' ' + x.desc).slice(-3) };
  }, pair);
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  const D0 = await W(PAIR);
  R(nom + ' · départ : écran ' + D0.ecran + ', ' + (D0.auto ? 'AUTO' : 'MANU') + ', EV ' + D0.voix.length + ' positions de la voix + ' + D0.autres.length + ' autre(s), ' + PAIR + ' SHORT entrée EV ' + (D0.pos && D0.pos.e) + ' / poche ' + x0 + ', ps.price ' + D0.psPrice + ', prix réel ' + (D0.age === null || D0.age > 300000 ? 'périmé' : 'frais'),
    D0.pos && D0.pos.side === 'short' && D0.poche === 'short' && !(D0.age < 300000), { ev: D0.ev, voix: D0.voix.length });
  // 1. la poche (son minuteur, 20 s) liquide ; 2. 15b (30 s puis 20 s) suit
  let D1 = null; for (let i = 0; i < 120; i++) { D1 = await W(PAIR); if (!D1.pos && D1.tr && D1.h && /liquidation/.test(D1.h.why)) break; await page.waitForTimeout(1000); }
  R(nom + ' · 1. la poche liquide ' + PAIR + ' (bougie de la nuit relue : ' + vus.bougies + ' réponse(s)) : « ' + (D1.h && D1.h.why) + ' » à ' + (D1.h && D1.h.x1) + ' = 2 × ' + x0,
    D1.poche === null && D1.h && /liquidation/.test(D1.h.why) && D1.h.x1 === x1, D1.h);
  const pnlAt = (px) => { const raw = (D0.pos.e - px) / D0.pos.e * 100, pct = Math.max(-100, Math.min(500, raw)); return Math.max(-D0.pos.stake, D0.pos.stake * pct / 100); };
  out.passages[nom] = { prix: D1.tr && D1.tr.price, pnlUsdt: D1.tr && D1.tr.pnlUsdt, attendu_liquidation: pnlAt(x1), au_prix_sauve: pnlAt(D0.psPrice), x1, psPrice: D0.psPrice, e: D0.pos.e, stake: D0.pos.stake };
  R(nom + ' · 2. position EV fermée par 15b au prix ' + (D1.tr && D1.tr.price) + ' (liquidation ' + x1 + ' · ps.price sauvegardé ' + D0.psPrice + ')', !D1.pos && D1.tr && D1.tr.price === x1, D1.tr);
  R(nom + ' · 3. résultat ' + (D1.tr && D1.tr.pnlUsdt) + ' $ = ce que closePosition réalise à ' + x1 + ' (' + pnlAt(x1).toFixed(2) + ' $ ; au prix sauvegardé : ' + pnlAt(D0.psPrice).toFixed(2) + ' $)',
    D1.tr && Math.abs(D1.tr.pnlUsdt - pnlAt(x1)) < 1e-6);
  R(nom + ' · 4. rien d\'autre : ' + D1.voix.length + ' autres positions de la voix, ta position gardée, AA et RE identiques, prix toujours périmé, aucune erreur de page',
    D1.voix.length === D0.voix.length - 1 && D1.voix.every(p => D0.voix.includes(p)) && JSON.stringify(D1.autres) === JSON.stringify(D0.autres) &&
    JSON.stringify(D1.sim) === JSON.stringify(D0.sim) && JSON.stringify(D1.re) === JSON.stringify(D0.re) && !(D1.age < 300000) && perr.length === 0, { perr, sim: [D0.sim.n, D1.sim.n], re: [D0.re.n, D1.re.n] });
  R(nom + ' · 5. journal 💥, « pas rouverte cette semaine », réalisé de la voix compté, aucun prix imposé laissé',
    D1.journal.some(x => /^💥 Tendance réelle/.test(x)) && D1.attente && Math.abs(D1.real - ((ST.tendance.reel && ST.tendance.reel.real) || 0) - D1.tr.pnlUsdt) < 1e-6, { journal: D1.journal, attente: D1.attente });
  // 6. un VRAI rechargement (le minuteur d'autosave a sauvé ; on sauve aussi pour ne pas attendre)
  await ev(() => { try { window.saveState && window.saveState(true); } catch (e) {} }); await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret(); await page.waitForTimeout(36000);
  const D2 = await W(PAIR);
  R(nom + ' · 6. rechargement : fermée, ligne gardée (' + (D2.tr && D2.tr.price) + '), pas rouverte, ' + D2.voix.length + ' positions de la voix',
    !D2.pos && D2.tr && D1.tr && D2.tr.price === D1.tr.price && Math.abs(D2.tr.pnlUsdt - D1.tr.pnlUsdt) < 1e-9 && D2.voix.length === D1.voix.length && perr.length === 0, { perr });
  await ctx.close();
  return res;
}

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  let ok = true;
  try {
    console.log('▶ code livré · ' + args.root);
    const a = await passage(browser, args.root, 'livré'); ok = a.every(x => x.ok);
    if (args.avant) {
      console.log('▶ code d\'avant · ' + args.avant + ' (témoin : il doit fermer au prix sauvegardé)');
      const b = await passage(browser, args.avant, 'avant');
      const p = out.passages.avant;
      const vu = p && p.prix === p.psPrice && p.prix !== p.x1;
      console.log((vu ? '  OK  ' : '  !!  ') + 'témoin · le code d\'avant ferme au ps.price sauvegardé ' + (p && p.prix) + ' (' + (p && p.pnlUsdt) + ' $) au lieu de ' + (p && p.x1) + ' — la sonde voit la différence');
      out.temoin = { vu, etapes: b.map(x => [x.n, x.ok]) }; ok = ok && vu;
    }
  } finally { await browser.close(); server.close(); }
  out.ok = ok;
  const f = path.join(__dirname, 'out', 'sonde_n80.resultat.json'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(out, null, 1));
  console.log((ok ? '✅' : '❌') + ' sonde n° 80 · ' + JSON.stringify(out.passages) + ' → ' + f);
  process.exit(ok ? 0 : 1);
})();
