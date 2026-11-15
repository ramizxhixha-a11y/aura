// [GO N° 108 · 15/11/2026] rejeu/sonde_n108.js — la mèche de la nuit au-delà de 2 × l'entrée de l'EV, jouée par la VRAIE page (Chromium).
//   node rejeu/sonde_n108.js --root <code> [--avant <copie du code d'avant>] --backup <aura_guardian_full_….json> [--pair BTC/USDT] [--port 8981]
// La vraie app servie depuis --root sur 127.0.0.1, l'état RÉEL du backup (EV à l'écran, MANU, comme chez Rams). Réseau COUPÉ, sauf les bougies 1 h de la
// paire : Binance rend, pour toute demande, les bougies de l'heure demandée jusqu'à maintenant (plus haut = prix du backup × 1,01), avec UNE mèche dans
// la nuit du 14 au 15/11 (02:00 UTC) à 2,06 × l'entrée de l'EV — sous 2 × l'entrée de la poche (elle ne liquide donc pas la poche). Aucun prix réel frais
// (_rcPriceAge = l'infini) : le ps.price de l'EV est celui du backup. Rien n'est appelé à la main : les minuteurs de la poche (20 s) et de 15b (30 s, puis
// 20 s) jouent seuls. Un backup n'entre jamais dans le dépôt.
//   1. 15b relit les bougies 1 h de la paire depuis l'heure qui suit l'entrée de l'EV
//   2. la position EV de la paire est fermée AU PRIX DE LA LIQUIDATION (2 × son entrée), pas au ps.price sauvegardé
//   3. son résultat = ce que 02 closePosition réalise à ce prix (−100 % de la mise)
//   4. rien d'autre : la poche garde la paire (mèche sous 2 × SON entrée), les autres positions de la voix restent, AA et RE inchangés ; ta position
//      n'est jamais touchée par 15b (sa propre consigne peut la fermer — même sort sur le code d'avant, vérifié par le témoin)
//   5. journal 💥 daté de la bougie, « pas rouverte » jusqu'au lundi qui suit la mèche, réalisé compté, aucun prix imposé laissé
//   6. un VRAI rechargement : fermée, ligne gardée, pas rouverte
//   (--avant) même passage sur le code d'avant → la position EV reste ouverte (le défaut n° 108), 15b ne demande aucune bougie
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); } catch (e2) {} }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_n108.js --root <code> [--avant <code d\'avant>] --backup <backup.json> [--pair BTC/USDT] [--port 8981]'); process.exit(3); }
const PORT = Number(args.port || 8981), PAIR = args.pair || 'BTC/USDT', SYM = PAIR.replace('/', ''), HOUR = 3600000, DAY = 24 * HOUR;
const MECHE = Date.UTC(2026, 10, 15, 2, 0, 0);   // nuit du 14 au 15/11, 03:00 à Bruxelles
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
const out = { backup: path.basename(args.backup), pair: PAIR, meche: new Date(MECHE).toISOString(), passages: {} };
const mondayOf = t => 4 * DAY + Math.floor((t - 4 * DAY) / (7 * DAY)) * 7 * DAY;

async function passage(browser, racine, nom) {
  RACINE = path.resolve(racine);
  const res = [], R = (n, ok, detail) => { res.push({ n, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + n + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 500) : '')); };
  const st = JSON.parse(JSON.stringify(ST));
  const evPos = st.walletStore.paperReal.openPositions.find(p => p.pair === PAIR && p._voix === 'tendance'), e = evPos.entryPrice, x0 = st.tendance.pos[PAIR].x0;
  const base = st.walletStore.paperReal.pairStates[PAIR].price, hi = 2.06 * e;
  if (!(hi < 2 * x0)) throw new Error('la mèche liquiderait aussi la poche : la sonde ne séparerait pas les deux');
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_n108')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
    localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', ${JSON.stringify(st.tradingMode || 'paperReal')});
    ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_n108', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'Europe/Brussels' });   // l'heure de la tablette
  const vus = { demandes: [], coupes: 0 };
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue();
    const m = /api\.binance\.com\/api\/v3\/klines\?symbol=([A-Z]+)&interval=1h&startTime=(\d+)&limit=(\d+)$/.exec(u);
    if (m && m[1] === SYM) {   // Binance : les bougies 1 h depuis startTime jusqu'à l'heure en cours, une mèche à MECHE
      const s = Math.ceil(Number(m[2]) / HOUR) * HOUR, now = Math.floor(Date.now() / HOUR) * HOUR, k = [];
      for (let o = s; o <= now && k.length < Number(m[3]); o += HOUR) k.push([o, String(base), String(o === MECHE ? hi : base * 1.01), String(base * 0.99), String(base), '1', o + HOUR - 1, '1', 1, '1', '1', '0']);
      vus.demandes.push({ t: Date.now(), start: Number(m[2]), n: k.length, meche: k.some(x => x[0] === MECHE) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(k) });
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
    return { ecran: S.tradingMode, auto: S.botAutoMode, sim: f('sim'), ev: f('paperReal'), re: f('real'), pos: pos && { id: pos.id, side: pos.side, e: pos.entryPrice, stake: pos.stakeUsdt, forced: pos._forcedExitPx, openedAt: pos.openedAt },
      voix: (evw.openPositions || []).filter(p => p._voix === 'tendance').map(p => p.pair).sort(), autres: (evw.openPositions || []).filter(p => p._voix !== 'tendance').map(p => p.id),
      psPrice: evw.pairStates[pair] && evw.pairStates[pair].price, age: _rcPriceAge(pair), poche: S.tendance.pos[pair] ? S.tendance.pos[pair].side : null, pocheHist: (S.tendance.hist || []).length,
      tr: tr && { price: tr.price, pnlUsdt: tr.pnlUsdt, pnl: tr.pnl, time: tr.time }, liq: window._tlr && window._tlr.liq ? JSON.parse(JSON.stringify(window._tlr.liq)) : null,
      attente: (S.tendance.reel && S.tendance.reel.attente || {})[pair] || null, real: S.tendance.reel && S.tendance.reel.real,
      tiennes: Object.keys(evw.pairStates).filter(p => p.indexOf('EUR') === 0 || (evw.openPositions || []).some(x => x.pair === p && x._voix !== 'tendance')).map(p => {
        const t = ((evw.pairStates[p] || {}).trades || []).slice(-1)[0] || null; return { pair: p, ouverte: (evw.openPositions || []).some(x => x.pair === p && x._voix !== 'tendance'), dernier: t && { type: t.type, time: t.time } };
      }), journalTiennes: S.chainLog.filter(x => /Tendance réelle/.test(x.desc) && /EUR/.test(x.desc)).length,
      journal: S.chainLog.filter(x => /Tendance (réelle|longue)/.test(x.desc) && x.desc.indexOf(pair) >= 0).map(x => x.icon + ' ' + x.desc).slice(-3) };
  }, pair);
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  const D0 = await W(PAIR);
  const h0 = Math.ceil(D0.pos.openedAt / HOUR) * HOUR;
  R(nom + ' · départ : écran ' + D0.ecran + ', ' + (D0.auto ? 'AUTO' : 'MANU') + ', EV ' + D0.voix.length + ' positions de la voix + ' + D0.autres.length + ' autre(s), ' + PAIR + ' SHORT entrée EV ' + e + ' / poche ' + x0 + ', ps.price ' + D0.psPrice + ', prix réel ' + (D0.age === null || D0.age > 300000 ? 'périmé' : 'frais') + ' ; mèche ' + hi.toFixed(2) + ' (2 × entrée EV ' + (2 * e).toFixed(2) + ', 2 × poche ' + (2 * x0).toFixed(2) + ')',
    D0.pos && D0.pos.side === 'short' && D0.poche === 'short' && !(D0.age < 300000), { ev: D0.ev, voix: D0.voix.length });
  let D1 = null; for (let i = 0; i < (nom === 'avant' ? 80 : 150); i++) { D1 = await W(PAIR); if (!D1.pos && D1.tr) break; await page.waitForTimeout(1000); }
  const dEV = vus.demandes.filter(d => d.start === h0);
  out.passages[nom] = { ferme: !D1.pos, prix: D1.tr && D1.tr.price, pnlUsdt: D1.tr && D1.tr.pnlUsdt, e, x0, psPrice: D0.psPrice, stake: D0.pos.stake, demandesEV: dEV.length, demandes: vus.demandes.length,
    tiennes: D1.tiennes.map(x => x.pair + ':' + (x.ouverte ? 'ouverte' : (x.dernier && x.dernier.type))).join(',') };
  if (nom === 'avant') { await ctx.close(); return res; }
  R(nom + ' · 1. 15b relit les bougies 1 h de ' + PAIR + ' depuis ' + new Date(h0).toISOString() + ' (heure qui suit l\'entrée) : ' + dEV.length + ' demande(s), mèche incluse', dEV.length === 1 && dEV[0].meche, { demandes: vus.demandes, liq: D1.liq });
  const pnlAt = (px) => { const raw = (e - px) / e * 100, pct = Math.max(-100, Math.min(500, raw)); return Math.max(-D0.pos.stake, D0.pos.stake * pct / 100); };
  R(nom + ' · 2. position EV fermée au prix ' + (D1.tr && D1.tr.price) + ' (liquidation 2 × ' + e + ' = ' + 2 * e + ' · ps.price sauvegardé ' + D0.psPrice + ')', !D1.pos && D1.tr && D1.tr.price === 2 * e, D1.tr);
  R(nom + ' · 3. résultat ' + (D1.tr && D1.tr.pnlUsdt) + ' $ = ce que closePosition réalise à 2 × l\'entrée (' + pnlAt(2 * e).toFixed(2) + ' $, toute la mise ; au prix sauvegardé : ' + pnlAt(D0.psPrice).toFixed(2) + ' $)',
    D1.tr && Math.abs(D1.tr.pnlUsdt - pnlAt(2 * e)) < 1e-6 && Math.abs(D1.tr.pnlUsdt + D0.pos.stake) < 1e-9);
  const tienne = D1.tiennes.map(x => x.pair + ' ' + (x.ouverte ? 'ouverte' : 'fermée (' + (x.dernier && x.dernier.type) + ')')).join(', ');
  R(nom + ' · 4. rien d\'autre : la poche garde ' + PAIR + ' (' + D1.poche + ', historique ' + D0.pocheHist + ' → ' + D1.pocheHist + '), ' + D1.voix.length + ' autres positions de la voix, ta position jamais touchée par 15b (' + tienne + '), AA et RE identiques, prix toujours périmé, aucune erreur de page',
    D1.poche === 'short' && D1.pocheHist === D0.pocheHist && D1.voix.length === D0.voix.length - 1 && D1.voix.every(p => D0.voix.includes(p)) && D1.journalTiennes === 0 && D1.tiennes.every(x => x.ouverte || (x.dernier && x.dernier.type !== 'tendance')) &&
    JSON.stringify(D1.sim) === JSON.stringify(D0.sim) && JSON.stringify(D1.re) === JSON.stringify(D0.re) && !(D1.age < 300000) && perr.length === 0, { perr, sim: [D0.sim, D1.sim], re: [D0.re, D1.re], autres: [D0.autres, D1.autres], voix: D1.voix, age: D1.age });
  R(nom + ' · 5. journal 💥 daté de la bougie, pas rouverte avant le lundi qui suit la mèche (' + new Date(mondayOf(MECHE)).toISOString().slice(0, 10) + '), réalisé de la voix compté, aucun prix imposé laissé',
    D1.journal.some(x => /^💥 Tendance réelle · .* fermé \(liquidation : le prix a doublé depuis ton entrée — bougie 1 h du 15\/11 03 h\)/.test(x)) && D1.attente && D1.attente.w === mondayOf(MECHE) &&
    Math.abs(D1.real - ((ST.tendance.reel && ST.tendance.reel.real) || 0) - D1.tr.pnlUsdt) < 1e-6, { journal: D1.journal, attente: D1.attente });
  await ev(() => { try { window.saveState && window.saveState(true); } catch (e) {} }); await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret(); await page.waitForTimeout(40000);
  const D2 = await W(PAIR);
  R(nom + ' · 6. rechargement : fermée, ligne gardée (' + (D2.tr && D2.tr.price) + '), pas rouverte, ' + D2.voix.length + ' positions de la voix, la poche tient toujours ' + PAIR,
    !D2.pos && D2.tr && D1.tr && D2.tr.price === D1.tr.price && Math.abs(D2.tr.pnlUsdt - D1.tr.pnlUsdt) < 1e-9 && D2.voix.length === D1.voix.length && D2.poche === 'short' && perr.length === 0, { perr });
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
      console.log('▶ code d\'avant · ' + args.avant + ' (témoin : la position EV doit rester ouverte)');
      await passage(browser, args.avant, 'avant');
      const p = out.passages.avant;
      const vu = p && !p.ferme && p.demandesEV === 0, meme = p && p.tiennes === out.passages['livré'].tiennes;
      console.log((vu ? '  OK  ' : '  !!  ') + 'témoin · le code d\'avant garde ' + PAIR + ' ouverte après 80 s (15b : ' + (p && p.demandesEV) + ' demande de bougies ; la poche : ' + (p && p.demandes) + ') — la sonde voit la différence');
      console.log((meme ? '  OK  ' : '  !!  ') + 'témoin · ta position, même sort sur les deux codes : ' + (p && p.tiennes) + ' (livré : ' + out.passages['livré'].tiennes + ')');
      out.temoin = { vu, meme }; ok = ok && vu && meme;
    }
  } finally { await browser.close(); server.close(); }
  out.ok = ok;
  const f = path.join(__dirname, 'out', 'sonde_n108.resultat.json'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(out, null, 1));
  console.log((ok ? '✅' : '❌') + ' sonde n° 108 · ' + JSON.stringify(out.passages) + ' → ' + f);
  process.exit(ok ? 0 : 1);
})();
