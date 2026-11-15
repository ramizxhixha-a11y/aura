// rejeu/sonde_n62.js — [GO N° 62 · 15/11/2026] vraie page, backup du pont (EV : 11 positions de la voix ; MANU), tablette 800 × 1 280 : « ↓ Inverser »
// (07 manuInvert) AVANT / APRÈS. La vraie question (window.confirm → boîte de dialogue du navigateur, acceptée ou refusée par la sonde) ; l'état AU MOMENT
// de la question est relevé dans la page (la position encore ouverte ? le trading intact ?).
// Usage : node rejeu/sonde_n62.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : (1) EV : Inverser une position de la voix → refusé, rien ne bouge ; (2) AA (3 000 $ posés par la sonde), 3 positions à la main 600 / 600 / 490 $,
// 1 200 $ passés à la caisse, « Inverser » celle de 490 $ (acceptée) ; (3) « Inverser » ETH, question REFUSÉE → rien ne change ; (4) le SHORT de BTC à −3 %
// (gain, impôt belge 33 %, part caisse du réglage de Rams) : l'état prévu avant la fermeture = l'état réel juste après closePosition, au cent ;
// (5) index ×1, XRP ×1,4 par le vrai openPosition, « Inverser » → ×1,4 gardé ; (6) EV, EUR/USDT 100 $ à la main + 0,01 $ de dette posée par la sonde (la limite
// n° 61) : rien ne peut être rouvert → avant : fermé, « non rouvert » ; après : rien n'est fermé ; (7) 20 s de vrai battement sans erreur de page.
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
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 1200))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
st.botAutoMode = false;   // MANU, comme la tablette au 15/11 05:20 : seul Rams ouvre
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };

async function passe(browser, ROOT, PORT, nom) {
  const server = await serve(ROOT, PORT), r = { nom };
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', q => (q.request().url().startsWith('http://127.0.0.1:' + PORT) ? q.continue() : q.abort())); await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [], dialogs = []; let reponse = true;
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message(), rep: reponse }); (reponse ? d.accept() : d.dismiss()).catch(() => {}); });
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret = await PRET(page); await page.waitForTimeout(6000);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => {
    window.__toasts = []; const t = window.showToast; window.showToast = function (m) { try { window.__toasts.push(String(m)); } catch (e) {} return t.apply(this, arguments); };
    window.__q = []; const c0 = window.confirm; window.confirm = function (q) { try { const p = window.__cible; window.__q.push({ q: String(q).slice(0, 900), ouverte: !!(p && S.openPositions.indexOf(p) >= 0), trading: S.tradingAccount }); } catch (e) {} return c0.call(window, q); };
    window.__apres = null; const k0 = window.closePosition; window.closePosition = function () { const x = k0.apply(this, arguments);
      try { window.__apres = { T: S.tradingAccount, B: S.leverageBorrowed, R: S.leverageReserve, C: S.cashAccount, n: S.openPositions.length }; } catch (e) {} return x; };
    window.__etat = () => JSON.stringify([S.tradingMode, Math.round(S.tradingAccount * 1e6) / 1e6, Math.round(S.cashAccount * 1e6) / 1e6, S.leverageBorrowed, S.openPositions.map(p => [p.id, p.pair, p.side, p.stakeUsdt, p.totalExposure])]);
    window.__ouvrir = (pair, side, stake, lev) => { const ps = S.pairStates[pair], s0 = ps.stake, l0 = ps.pairLeverage; ps.stake = stake; ps.pairLeverage = lev || 1;
      try { return openPosition(pair, side) ? true : false; } finally { ps.stake = s0; ps.pairLeverage = l0; } };
    window.__inverser = (pair) => { const p = S.openPositions.find(x => x.pair === pair); window.__cible = p; window.__q = []; window.__toasts = []; window.__apres = null;
      let pred = null; try { if (typeof _invApres === 'function' && p) { const e = _invApres(p).etat; pred = { T: e.tradingAccount, B: e.leverageBorrowed, R: e.leverageReserve, C: e.cashAccount }; } } catch (e) { pred = String(e); }
      const av = window.__etat(); manuInvert(pair); const q = S.openPositions.find(x => x.pair === pair);
      return { av, ap: window.__etat(), q: window.__q.slice(), toasts: window.__toasts.slice(), pred, apres: window.__apres, avant: p ? [p.side, p.stakeUsdt, p.totalExposure] : null,
        apresPos: q ? [q.side, Math.round(q.stakeUsdt * 100) / 100, Math.round(q.totalExposure * 100) / 100, q === p] : null };
    };
  });
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  r.depart = await ev(() => ({ mode: S.tradingMode, n: S.openPositions.length, voix: S.openPositions.filter(p => p._voix === 'tendance').length, split: S.profitSplitCaissePct, region: S.taxConfig && S.taxConfig.region }));
  // (1) EV : une position de la voix
  reponse = true; r.voix = await ev(() => window.__inverser('ADA/USDT'));
  // (2)–(5) l'AA
  r.aa = await ev(() => { if (typeof cycleTradeMode === 'function') { for (let i = 0; i < 3 && S.tradingMode !== 'sim'; i++) cycleTradeMode(); } return S.tradingMode; });
  await ev(() => { S.tradingAccount = 3000; [['SOL/USDT', 600], ['ETH/USDT', 600], ['BTC/USDT', 490]].forEach(([p, m]) => window.__ouvrir(p, 'long', m, 1));
    S.tradingAccount -= 1200; S.cashAccount = (S.cashAccount || 0) + 1200; });
  reponse = true; r.btc = await ev(() => window.__inverser('BTC/USDT')); r.dlg2 = dialogs.splice(0);
  reponse = false; r.eth = await ev(() => window.__inverser('ETH/USDT')); r.dlg3 = dialogs.splice(0);
  // (4) le SHORT de BTC à −3 % du prix d'entrée : un gain (impôt 33 %, part caisse)
  reponse = true; r.gain = await ev(() => { const p = S.openPositions.find(x => x.pair === 'BTC/USDT'); if (p) S.pairStates['BTC/USDT'].price = p.entryPrice * 0.97; return window.__inverser('BTC/USDT'); });
  r.dlg4 = dialogs.splice(0);
  // (5) index ×1, XRP ×1,4
  r.x14 = await ev(() => { changeLeverage(1); const ok = window.__ouvrir('XRP/USDT', 'long', 100, 1.4); const p = S.openPositions.find(x => x.pair === 'XRP/USDT');
    return { index: S.leverage, ok, pos: p ? [p.stakeUsdt, p.totalExposure] : null }; });
  reponse = true; r.xrp = await ev(() => window.__inverser('XRP/USDT')); r.dlg5 = dialogs.splice(0);
  // (6) l'EV : EUR/USDT 100 $ à la main + 0,01 $ de dette (posée par la sonde : la limite n° 61)
  r.ev = await ev(() => { if (typeof cycleTradeMode === 'function') { for (let i = 0; i < 3 && S.tradingMode !== 'paperReal'; i++) cycleTradeMode(); }
    const ok = window.__ouvrir('EUR/USDT', 'long', 100, 1); S.leverageBorrowed = (S.leverageBorrowed || 0) + 0.01; return { mode: S.tradingMode, ok }; });
  reponse = true; r.rien = await ev(() => window.__inverser('EUR/USDT')); r.dlg6 = dialogs.splice(0);
  await ev(() => { S.leverageBorrowed = Math.max(0, (S.leverageBorrowed || 0) - 0.01); });
  await page.waitForTimeout(20000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= t;
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8961, 'avant'), ap = await passe(browser, NEW, 8962, 'après');
  await browser.close();
  console.log('SONDE N° 62 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  console.log('  départ : ' + JSON.stringify(ap.depart));
  R('départ : EV à l\'écran, 11 positions de la voix (les deux versions)', av.depart.mode === 'paperReal' && ap.depart.voix === 11 && av.depart.voix === 11, [av.depart, ap.depart]);
  R('(1) EV, Inverser une position de la voix : refusé, rien ne bouge (avant et après)', [av, ap].every(x => x.voix.av === x.voix.ap && !x.voix.q.length && x.voix.toasts.some(t => /voix tendance/.test(t))), { avant: av.voix, apres: ap.voix });
  const q2 = ap.btc.q[0] || {};
  R('(2) AA, Inverser BTC 490 $ : avant, AUCUNE question (fermée puis rouverte) ; après, la question vient AVANT la fermeture (position ouverte, trading intact) et dit « Fermer le LONG · mise $490,00 » / « Ouvrir un SHORT · mise $490,00 » ; acceptée → SHORT 490 $',
    av.aa === 'sim' && ap.aa === 'sim' && !av.btc.q.length && !av.dlg2.length && ap.btc.q.length === 1 && q2.ouverte === true && JSON.parse(ap.btc.av)[1] === q2.trading
      && /1\. Fermer le LONG · mise \$490,00/.test(q2.q) && /2\. Ouvrir un SHORT · mise \$490,00/.test(q2.q) && ap.dlg2.length === 1 && ap.dlg2[0].type === 'confirm'
      && ap.btc.apresPos && ap.btc.apresPos[0] === 'short' && ap.btc.apresPos[1] === 490, { avant: av.btc, apres: ap.btc, dlg: ap.dlg2 });
  R('(3) AA, Inverser ETH, question REFUSÉE : après, rien ne change (ETH LONG toujours là, même trading) ; avant : pas de question, ETH fermée et rouverte',
    ap.eth.q.length === 1 && ap.eth.av === ap.eth.ap && ap.eth.apresPos && ap.eth.apresPos[3] === true && ap.eth.toasts.some(t => /annulé · rien n'a changé/.test(t))
      && !av.eth.q.length && av.eth.apresPos && av.eth.apresPos[0] === 'short', { avant: av.eth, apres: ap.eth });
  const g = ap.gain;
  R('(4) AA, SHORT BTC à −3 % (gain : impôt belge, part caisse) : l\'état prévu avant la fermeture = l\'état réel juste après closePosition (trading, dette, réserve, caisse), au cent ; rouvert comme annoncé',
    g.pred && g.apres && near(g.pred.T, g.apres.T, 0.01) && near(g.pred.B, g.apres.B, 0.01) && near(g.pred.R, g.apres.R, 0.01) && near(g.pred.C, g.apres.C, 0.01) && g.q.length === 1 && g.apresPos && g.apresPos[0] === 'long',
    { pred: g.pred, reel: g.apres, q: g.q, pos: g.apresPos, toasts: g.toasts });
  R('(5) index ×1, XRP ×1,4 : avant rouvert en ×1 (arrondi) ; après ×1,4 gardé et annoncé', ap.x14.pos && Math.abs(ap.x14.pos[1] / ap.x14.pos[0] - 1.4) < 0.005 && av.x14.pos && Math.abs(av.x14.pos[1] / av.x14.pos[0] - 1.4) < 0.005
      && av.xrp.apresPos && Math.abs(av.xrp.apresPos[2] / av.xrp.apresPos[1] - 1) < 0.005 && ap.xrp.apresPos && Math.abs(ap.xrp.apresPos[2] / ap.xrp.apresPos[1] - 1.4) < 0.005 && /· ×1,4 \(exposition \$140,00\)/.test((ap.xrp.q[0] || {}).q || ''),
    { avant: [av.x14, av.xrp], apres: [ap.x14, ap.xrp] });
  R('(6) EV, EUR/USDT 100 $ et 0,01 $ de dette : avant, FERMÉE et « non rouvert » ; après, aucune question, RIEN n\'est fermé, et c\'est dit',
    av.ev.ok && ap.ev.ok && av.rien.apresPos === null && av.rien.toasts.some(t => /non rouvert/.test(t)) && !ap.rien.q.length && ap.rien.av === ap.rien.ap && ap.rien.toasts.some(t => /rien ne pourrait être rouvert.*rien n'est fermé/.test(t)),
    { avant: av.rien, apres: ap.rien });
  R('page prête et sans erreur (avant et après), 20 s de battement', av.pret && ap.pret && !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.mkdirSync(path.join(NEW, 'rejeu/out'), { recursive: true });
  fs.writeFileSync(path.join(NEW, 'rejeu/out/sonde_n62.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
