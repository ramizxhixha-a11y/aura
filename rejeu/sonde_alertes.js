// [GO ALERTES · 15/10/2026] VERSION 20261018a · rejeu/sonde_alertes.js — les défauts « alertes » (ETAT n° 30, 31, 32) joués par la VRAIE page.
//   node rejeu/sonde_alertes.js --root <dossier du code> --backup <aura_guardian_full_….json> [--port 8973] [--out <f.json>]
// Une page Chromium servie depuis --root, réseau coupé SAUF api.telegram.org (répond { ok: true } et chaque message est gardé), l'état RÉEL du backup
// (EV à l'écran, bot en MANU, migrations « une fois » marquées faites), notifications du système remplacées par un enregistreur (permission accordée).
// Les VRAIS écrans (Outils Avancés › 🔔 Alertes), le VRAI battement et de VRAIS rechargements : alerte prix créée au formulaire, déclenchée sur un prix
// réel injecté par le filtre des prix (02 _rcOutlier) pendant qu'une AUTRE page est affichée ; interrupteur et seuil des alertes P&L ; une position
// manuelle EV fermée par son TP ; un changement de régime ; la clé CoinStats ; puis rechargement. Sur le code d'avant (commit e7d6fe9) elle montre les
// défauts ; sur le code livré, elle rend 0. Un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (_e) {} } }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_alertes.js --root <code> --backup <backup.json> [--port 8973] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), BACKUP = path.resolve(args.backup), PORT = Number(args.port || 8973);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];   // liste de rejeu/sonde_modes.js
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 500) : '')); };
const TOKEN = '123456:SONDE-jeton-secret', NEWSKEY = 'cle-sonde-coinstats-0123456789abcdef';

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const st = JSON.parse(fs.readFileSync(BACKUP, 'utf8')).aura; st.tradingMode = 'paperReal'; st.botAutoMode = false;
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_alertes')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
    localStorage.setItem('aura_current_trade_mode', 'paperReal'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_alertes', '1'); } } catch (e) { window.__initErr = String(e); }
    window.__notifs = []; window.Notification = function (t, o) { window.__notifs.push(t + ' | ' + ((o && o.body) || '')); this.close = function () {}; };
    window.Notification.permission = 'granted'; window.Notification.requestPermission = function () { return Promise.resolve('granted'); }; })();`;
  const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 } });
  const tg = [];
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue();
    if (/^https:\/\/api\.telegram\.org\/bot/.test(u)) { try { tg.push(JSON.parse(route.request().postData() || '{}')); } catch (e) {} return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"result":{}}' }); }
    return route.abort();
  });
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [], dialogs = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => { dialogs.push(d.message()); (d.type() === 'prompt' ? d.accept('12') : d.type() === 'confirm' ? d.accept() : d.dismiss()).catch(() => {}); });
  const pret = async () => {
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && S.agents && S.agents.length > 0)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(4000);
  };
  const recharge = async () => { await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret(); };
  const ev = (fn, a) => page.evaluate(fn, a);
  const attendre = async (fn, a, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { if (await ev(fn, a).catch(() => false)) return true; await page.waitForTimeout(300); } return false; };
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  await ev(() => { S.botAutoMode = false; });

  // Telegram configuré par l'écran (jeton, chat, activer, + « Objectif P&L »)
  await ev((t) => { updateTgField('botToken', t); updateTgField('chatId', '42'); toggleTgEnabled(); if (!_tgGet().onPnlGoal) toggleTgOption('onPnlGoal'); }, TOKEN);

  // ───────── n° 30 / 31 : alerte prix créée au formulaire, déclenchée écran sur une AUTRE page ─────────
  await ev(() => { _rcOutlier('BTC/USDT', 60800, Date.now()); openOutils('alertes'); });
  await page.waitForTimeout(500);
  await ev(() => { document.getElementById('prPairSel').value = 'BTC/USDT'; document.getElementById('prTypeSel').value = 'above'; document.getElementById('prValueInp').value = '61000'; });
  await page.click('#priceAlertSection .pr-add-btn');
  await ev(() => { document.getElementById('prPairSel').value = 'ETH/USDT'; document.getElementById('prTypeSel').value = 'below'; document.getElementById('prValueInp').value = '100'; });
  await page.click('#priceAlertSection .pr-add-btn');
  const cree = await ev(() => (S.priceAlerts || []).map(a => ({ id: a.id, pair: a.pair, type: a.type, value: a.value })));
  R('n° 31 · deux alertes créées au formulaire, ids distincts', cree.length === 2 && cree[0].id !== cree[1].id, cree);
  await ev(() => { closeOutils(); goPage(3); });
  const n0 = tg.length;
  for (let i = 0; i < 6; i++) { await ev(() => _rcOutlier('BTC/USDT', 61500, Date.now())); await page.waitForTimeout(1000); }
  const dec = await attendre(() => (S.priceAlerts || []).some(a => a.pair === 'BTC/USDT' && a.triggered), null, 25000);
  await page.waitForTimeout(2500);
  const tgAl = tg.slice(n0).filter(m => /Alerte Prix/.test(m.text || ''));
  R('n° 30 · alerte prix déclenchée sur un prix réel pendant qu\'une autre page est affichée (page DAO)', dec, await ev(() => ({ page: S.currentPage, alertes: (S.priceAlerts || []).map(a => [a.id, a.triggered, a.triggeredPrice]) })));
  R('n° 30 · Telegram « 🔔 Alertes prix » : un message, texte échappé', tgAl.length === 1 && /BTC\/USDT ≥ 61000\.00 · prix 61500\.00/.test(tgAl[0].text), tgAl.map(m => m.text));

  // ───────── n° 30 / 31 : alertes P&L dans Outils › Alertes ─────────
  await ev(() => { goPage(0); openOutils('alertes'); });
  await page.waitForTimeout(600);
  const avant = await ev(() => (document.getElementById('alertsSection2') || {}).innerHTML || '');
  await page.click('#alertsSection2 [onclick="toggleAlert(\'tradeCount\')"]').catch(() => {});
  await page.waitForTimeout(300);
  const apres = await ev(() => ({ html: (document.getElementById('alertsSection2') || {}).innerHTML || '', etat: S.pnlAlerts.tradeCount.enabled }));
  R('n° 30 · interrupteur « Nb Trades » (Alertes P&L) : l\'état change ET la section visible le montre', apres.etat === true && apres.html !== avant, { etat: apres.etat, reRendu: apres.html !== avant });
  await page.click('#alertsSection2 [onclick="editAlertValue(\'sessionGain\')"]').catch(() => {});
  await page.waitForTimeout(300);
  const seuil = await ev(() => ({ v: S.pnlAlerts.sessionGain.value, vu: /12/.test((document.getElementById('alertsSection2') || {}).innerHTML || '') }));
  R('n° 30 · seuil « Gain session » réglé à 12 (prompt) et affiché', seuil.v === 12 && seuil.vu, seuil);
  await ev(() => closeOutils());

  // ───────── n° 30 : position manuelle EV fermée par son TP → Telegram « Chaque trade » + notification « TP / SL atteint » ─────────
  await ev(() => { _initNotifConfig(); S.notifConfig.enabled = true; S.notifConfig.tpSl = true; S.notifConfig.lastNotifTs = 0; window.__notifs.length = 0; });
  const n1 = tg.length;
  const ouv = await ev(() => {
    const p = 'ETH/USDT', ps = S.pairStates[p]; if (!ps || !(ps.price > 0)) return { err: 'pas de prix EV ETH' };
    _rcOutlier(p, ps.price, Date.now());
    const pos = openPosition(p, 'long'); if (!pos) return { err: 'ouverture refusée', toast: (document.querySelector('.toast') || {}).textContent };
    const o = S.openPositions.find(x => x.pair === p); if (!o) return { err: 'position absente' };
    // anti-spam des notifications (07 sendNotif : une toutes les 30 s) : la notification « Position ouverte » vient de partir — remis à zéro pour voir celle du TP
    S.notifConfig.lastNotifTs = 0; window.__notifs.length = 0;
    const px0 = ps.price; o.tp = px0 * 1.001; ps.price = px0 * 1.002; _rcOutlier(p, ps.price, Date.now());   // le prix monte de 0,2 % : TP touché
    return { id: o.id, prix: px0, auto: o.auto };
  });
  const ferme = ouv.err ? false : await attendre((id) => !S.openPositions.some(x => x.id === id), ouv.id, 30000);
  await page.waitForTimeout(2500);
  const tgTr = tg.slice(n1).filter(m => /— ETH\/USDT<\/b>/.test(m.text || ''));
  R('n° 30 · position manuelle EV ouverte puis fermée par son TP (07)', !ouv.err && ferme, ouv);
  R('n° 30 · Telegram « 📊 Chaque trade » : « WIN », « EV · 👤 manuel », « ↑ LONG », P&L positif, raison « 🎯 TP »', tgTr.length === 1 && /WIN — ETH\/USDT<\/b> · EV · 👤 manuel/.test(tgTr[0].text) && /↑ LONG/.test(tgTr[0].text) && /<code>\+\$0\.0\d<\/code> \(\+0\.\d\d %\)/.test(tgTr[0].text) && /🎯 TP/.test(tgTr[0].text), tgTr.map(m => m.text));
  const nf = await ev(() => window.__notifs.slice());
  R('n° 30 · notification « 🎯 Objectif atteint » (interrupteur TP / SL)', nf.some(x => /Objectif atteint \| ETH\/USDT · EV · TP/.test(x)), nf);

  // ───────── n° 30 : changement de régime ─────────
  // le régime doit TENIR (relecture adverse du 18/10 : une moyenne qui frôle sa borne basculait à chaque battement) : la sonde le tient ~70 s
  const reg = await ev(async () => {
    S.notifConfig.regimeChange = true; S.notifConfig.lastNotifTs = 0; window.__notifs.length = 0;
    const r0 = detectMarketRegime(); await new Promise(r => setTimeout(r, 3500));
    const live = (typeof _livePairStates === 'function') ? _livePairStates() : Object.values(S.pairStates);
    const sauve = live.map(ps => ps.pnl24h); const cible = r0 === 'bear' ? 5 : -5;
    const tenir = setInterval(() => live.forEach(ps => { ps.pnl24h = cible; }), 200);   // le moteur recalcule pnl24h à chaque tick
    const t0 = Date.now(); let frole = 0;
    while (Date.now() - t0 < 75000) { await new Promise(r => setTimeout(r, 1000)); if (window.__notifs.length) { frole = Math.round((Date.now() - t0) / 1000); break; } }
    clearInterval(tenir);
    const out = { avant: r0, apres: detectMarketRegime(), notifs: window.__notifs.slice(), apresS: frole };
    live.forEach((ps, i) => { ps.pnl24h = sauve[i]; }); S.notifConfig.regimeChange = false; return out;
  });
  R('n° 30 · « Changement de régime » : notification une fois que le nouveau régime a TENU (≈ 60 battements), pas au premier frôlement', reg.avant !== reg.apres && reg.notifs.length === 1 && /Régime marché changé \| EV · /.test(reg.notifs[0]) && reg.apresS >= 55, reg);

  // ───────── n° 32 : clé CoinStats ─────────
  const k1 = await ev((k) => { updateNewsApiKey(k); let fb = ''; try { fb = JSON.stringify(_buildFullBackup('sonde', 'manual')); } catch (e) { fb = 'ERR ' + e; }
    return { lue: S.newsApiKey === k, dansS: JSON.stringify(S).includes(k), dansBackup: fb.includes(k), guardian: (() => { try { return JSON.stringify(JSON.parse(JSON.stringify(S))).includes(k); } catch (e) { return 'ERR'; } })() }; }, NEWSKEY);
  R('n° 32 · clé CoinStats lue, absente de JSON.stringify(S) et du backup de l\'historique (_buildFullBackup)', k1.lue && !k1.dansS && !k1.dansBackup && !k1.guardian, k1);

  // ───────── rechargement ─────────
  const sv = await ev(async () => await saveState(true));
  await recharge();
  const apresR = await ev((k) => ({ alertes: (S.priceAlerts || []).map(a => ({ id: a.id, pair: a.pair, type: a.type, value: a.value, triggered: !!a.triggered })),
    seuils: S.pnlAlerts ? { sessionGain: S.pnlAlerts.sessionGain.value, tradeCount: S.pnlAlerts.tradeCount.enabled, declenchee: Object.values(S.pnlAlerts).some(a => a.triggered) } : null,
    tg: (() => { const c = _tgGet(); return { enabled: c.enabled, onPnlGoal: c.onPnlGoal, chat: c.chatId }; })(), cle: S.newsApiKey === k, cleDansS: JSON.stringify(S).includes(k) }), NEWSKEY);
  R('n° 31 · après rechargement : les 2 alertes prix (une déclenchée), mêmes ids', saved(apresR.alertes, cree), { sauve: sv, alertes: apresR.alertes });
  R('n° 31 · après rechargement : seuil « Gain session » 12 et « Nb Trades » activé', apresR.seuils && apresR.seuils.sessionGain === 12 && apresR.seuils.tradeCount === true, apresR.seuils);
  R('n° 32 · après rechargement : clé CoinStats relue (aura_news_key) et toujours hors de JSON.stringify(S)', apresR.cle && !apresR.cleDansS, { cle: apresR.cle, dansS: apresR.cleDansS });
  R('aucune erreur de page', perr.length === 0, perr);

  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '⚠ ' + ko + ' défaut(s) montré(s)' : '✅ 0 défaut') + ' · ' + res.length + ' étapes · code ' + ROOT);
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ root: ROOT, res, tg: tg.map(m => m.text) }, null, 1));
  await browser.close(); server.close();
  process.exit(0);
  function saved(apres, avant) { return apres.length === 2 && avant.length === 2 && avant.every(a => apres.some(b => b.id === a.id && b.pair === a.pair && b.value === a.value)) && apres.filter(a => a.triggered).length === 1; }
})().catch(e => { console.error(e); process.exit(2); });
