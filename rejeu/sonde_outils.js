// [GO OUTILS · 18/10/2026] VERSION 20261018b · rejeu/sonde_outils.js — l'onglet « 🛠 Outils » (ETAT n° 33) joué par la VRAIE page.
//   node rejeu/sonde_outils.js --root <dossier du code> --backup <aura_guardian_full_….json> [--port 8974] [--out <f.json>]
// Une page Chromium servie depuis --root, réseau coupé, l'état RÉEL du backup (EV à l'écran, AUTO / MANU tel qu'au backup, migrations « une fois »
// marquées faites). Les VRAIS boutons de l'onglet, les VRAIES boîtes de confirmation (refusées puis acceptées), une position manuelle EV ouverte par
// la vraie openPosition, et l'app Android simulée par un faux plugin Filesystem (le chemin des backups Guardian, 09b3 _fsWriteBackup) ; puis un
// rechargement. Sur le code d'avant (commit 0a68fd7) elle montre les défauts ; sur le code livré, elle rend 0. Un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (_e) {} } }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_outils.js --root <code> --backup <backup.json> [--port 8974] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), BACKUP = path.resolve(args.backup), PORT = Number(args.port || 8974);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];   // liste de rejeu/sonde_modes.js
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 600) : '')); };
const FAUX_FS = `window.__fs = []; window.Capacitor = { Plugins: { Filesystem: { writeFile: async (o) => { if (window.__fsRefus) throw new Error('refusé (sonde)'); window.__fs.push({ path: o.path, dir: o.directory, data: o.data }); return { uri: 'file:///storage/emulated/0/' + o.path }; } } } };`;

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BK = JSON.parse(fs.readFileSync(BACKUP, 'utf8')), st = BK.aura; st.tradingMode = 'paperReal';
  const autoAuBackup = st.botAutoMode !== false; st.botAutoMode = true;   // AUTO : « Passer en MANU » doit pouvoir agir
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_outils')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
    localStorage.setItem('aura_current_trade_mode', 'paperReal'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_outils', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
  const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 }, acceptDownloads: true });
  await ctx.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [], dialogs = [], downloads = [], popups = [];
  let reponse = 'dismiss';
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => { dialogs.push({ type: d.type(), msg: d.message(), rep: reponse }); (reponse === 'accept' ? d.accept() : d.dismiss()).catch(() => {}); });
  page.on('download', async d => { const p = await d.path().catch(() => null); downloads.push({ name: d.suggestedFilename(), text: p ? fs.readFileSync(p, 'utf8') : '' }); });
  page.on('popup', async p => { await p.waitForLoadState().catch(() => {}); popups.push(await p.content().catch(() => '')); await p.close().catch(() => {}); });
  const pret = async () => {
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && S.agents && S.agents.length > 0)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(4000);
  };
  const ev = (fn, a) => page.evaluate(fn, a);
  const toasts = () => ev(() => [...document.querySelectorAll('.toast, #toast, .toast-msg')].map(x => x.textContent).join(' | '));
  const lastToast = async () => ev(() => window.__toasts ? window.__toasts.slice(-3) : []);
  const html = id => ev(i => (document.getElementById(i) || {}).innerHTML || '', id);
  const clic = async (sel) => { const n = await page.$(sel); if (!n) return false; await n.click({ timeout: 5000 }).catch(() => ev(s => document.querySelector(s).click(), sel)); await page.waitForTimeout(400); return true; };
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  // enregistreur de toasts (lecture seule : on enveloppe showToast pour garder le texte)
  await ev(() => { window.__toasts = []; const o = window.showToast; window.showToast = function (t) { window.__toasts.push(String(t)); return o.apply(this, arguments); }; try { showToast = window.showToast; } catch (e) {} });
  const hist0 = await ev(() => JSON.stringify(Object.fromEntries(['sim', 'paperReal', 'real'].map(m => [m, Object.fromEntries(Object.entries(S.walletStore[m].pairStates || {}).map(([p, ps]) => [p, (ps.trades || []).length]))]))));

  // ───────── accès ─────────
  await ev(() => openOutils('analytics')); await page.waitForTimeout(400);
  const bouton = await clic('#outilsPanel .outils-tab[onclick*="\'outils\'"]');
  if (!bouton) await ev(() => switchOutilsTab('outils'));
  await page.waitForTimeout(1500);
  const sec = await ev(() => [...document.querySelectorAll('#outilsContent > div')].map(d => ({ id: d.id, n: d.innerHTML.length })));
  const ids = sec.map(s => s.id);
  R('accès · bouton « 🛠 Outils » dans la barre d\'onglets', bouton);
  R('accès · chaque section rendue (non vide), aucun id en double, Paper Ultra / Coffre / Auto-backup absents', sec.length > 0 && sec.every(s => s.n > 50) && new Set(ids).size === ids.length && !ids.some(i => /paperUltra|vault|autoBackup/.test(i)), sec);

  // ───────── stress test sans position ─────────
  await clic('#stressTestSection .st-scenario:nth-child(1)');
  const st0 = await html('stressTestSection');
  R('stress · EV sans position, crash : compte inchangé (USDT), aucune tuile inventée', /Variation/.test(st0) && /\+\$0\.00|−\$0\.00/.test(st0) && !/WR bots|agents résistants/.test(st0), (st0.match(/st-result-val[^>]*>[^<]*/g) || []).slice(0, 4));

  // ───────── une position manuelle EV (vraie openPosition) ─────────
  const ouv = await ev(() => {
    const p = 'ETH/USDT', ps = S.pairStates[p]; if (!ps || !(ps.price > 0)) return { err: 'pas de prix EV ETH' };
    _rcOutlier(p, ps.price, Date.now());
    const pos = openPosition(p, 'long'); const o = S.openPositions.find(x => x.pair === p);
    return o ? { id: o.id, stake: o.stakeUsdt, expo: o.totalExposure || o.stakeUsdt, e: o.entryPrice, cur: ps.price, auto: o.auto } : { err: 'ouverture refusée' };
  });
  R('position · manuelle EV ouverte par openPosition', !ouv.err, ouv);
  await ev(() => switchOutilsTab('outils')); await page.waitForTimeout(1200);
  await clic('#stressTestSection .st-scenario:nth-child(5)');   // flash crash −40 %
  const r1 = await ev(() => { try { return _runStressTest(); } catch (e) { return { err: String(e) }; } });
  const attendu = ouv.err ? null : Math.max(-ouv.stake, ouv.expo * (ouv.cur * 0.6 - ouv.e) / ouv.e) - Math.max(-ouv.stake, ouv.expo * (ouv.cur - ouv.e) / ouv.e);
  R('stress · flash crash −40 % : variation = exposition × chute, bornée à la mise ; USDT libre intact', r1 && attendu !== null && Math.abs(-r1.totalLoss - attendu) < 1e-6 && Math.abs(r1.valNow - r1.valAfter - r1.longPosLoss) < 1e-6, { r: r1 && { totalLoss: r1.totalLoss, libre: r1.libre }, attendu });

  // ───────── Urgence : Fermer (refus puis accord) ─────────
  await ev(() => switchOutilsTab('outils')); await page.waitForTimeout(1000);
  const nPos0 = await ev(() => S.openPositions.length);
  reponse = 'dismiss'; const d0 = dialogs.length;
  await clic('#urgenceSection button:nth-of-type(1)');
  const nPos1 = await ev(() => S.openPositions.length);
  const dlg = dialogs.slice(d0);
  R('urgence · « Fermer » : une confirmation qui liste la position (paire, manuel, mise, latent) et le mode ; refusée → rien fermé', dlg.length === 1 && /ETH\/USDT LONG · manuel · mise/.test(dlg[0].msg) && /mode EV/.test(dlg[0].msg) && nPos1 === nPos0 && nPos0 > 0, { dlg: dlg.map(x => x.msg), nPos0, nPos1 });
  reponse = 'accept';
  await clic('#urgenceSection button:nth-of-type(1)');
  await page.waitForTimeout(800);
  const apresF = await ev((id) => { const tr = (S.pairStates['ETH/USDT'].trades || []); const l = tr[tr.length - 1]; return { reste: S.openPositions.some(x => x.id === id), ligne: l && l.type, html: (document.getElementById('urgenceSection') || {}).innerHTML || '' }; }, ouv.id);
  R('urgence · accordée → fermée par closePosition (ligne « urgence » dans l\'historique), section re-rendue', !apresF.reste && apresF.ligne === 'urgence' && /Positions ouvertes \(EV\)<\/span>\s*<span[^>]*>0</.test(apresF.html), { reste: apresF.reste, ligne: apresF.ligne });

  // ───────── Urgence : Passer en MANU (refus puis accord) ─────────
  const modeAvant = await ev(() => S.mode);   // champ mort : l'ancienne Pause y écrivait 'manual'
  reponse = 'dismiss'; const d1 = dialogs.length;
  await clic('#urgenceSection button:nth-of-type(2)');
  const m1 = await ev(() => S.botAutoMode);
  const dlg2 = dialogs.slice(d1);
  R('urgence · « Passer en MANU » : confirmation (3 modes, ce qui continue / s\'arrête) ; refusée → toujours AUTO', dlg2.length === 1 && /3 modes/.test(dlg2[0].msg) && /perte max/.test(dlg2[0].msg) && m1 === true, { dlg: dlg2.map(x => x.msg.slice(0, 200)), auto: m1 });
  reponse = 'accept';
  await clic('#urgenceSection button:nth-of-type(2)');
  const m2 = await ev(() => ({ auto: S.botAutoMode, chain: (S.chainLog || []).slice(-3).map(c => c.desc), chip: (document.getElementById('heroModeChip') || {}).textContent || '', paused: (S.agents || []).some(a => a._paused), mode: S.mode }));
  R('urgence · accordée → MANU par setBotMode (journal 🔗 « Mode MANUEL », puce de l\'en-tête), aucun champ mort', m2.auto === false && m2.chain.some(d => /Mode MANUEL/.test(d)) && !m2.paused && m2.mode === modeAvant, Object.assign(m2, { modeAvant }));
  reponse = 'dismiss';

  // ───────── Urgence : Backup complet — navigateur, puis app Android (faux plugin Filesystem) ─────────
  const dl0 = downloads.length;
  await clic('#urgenceSection button:nth-of-type(3)'); await page.waitForTimeout(2500);
  const bkN = downloads.slice(dl0);
  let bkOk = false; try { bkOk = bkN.length === 1 && JSON.parse(bkN[0].text)._type === 'aura_guardian_full'; } catch (e) {}
  R('urgence · « Backup complet » (navigateur) : un fichier aura_guardian_full téléchargé, toast qui le dit', bkOk && (await lastToast()).some(t => /Backup complet téléchargé/.test(t)), { fichiers: bkN.map(x => x.name), toasts: await lastToast() });
  await ev(FAUX_FS);
  await clic('#urgenceSection button:nth-of-type(3)'); await page.waitForTimeout(2500);
  const fsU = await ev(() => (window.__fs || []).map(f => ({ path: f.path, type: (() => { try { return JSON.parse(f.data)._type; } catch (e) { return 'illisible'; } })() })));
  R('urgence · « Backup complet » (app Android) : écrit par le plugin dans Download/AURA, toast avec le chemin', fsU.length === 1 && /^Download\/AURA\/aura_guardian_full_/.test(fsU[0].path) && fsU[0].type === 'aura_guardian_full' && (await lastToast()).some(t => /écrit : Download\/AURA\//.test(t)), { fsU, toasts: await lastToast() });

  // ───────── exports dans l'app Android (faux plugin) : rapport PDF, Excel, hebdo ─────────
  await ev(() => { window.__fs = []; }); const pop0 = popups.length;
  await clic('#pdfReportSection2 .rp-export-btn'); await page.waitForTimeout(1500);
  await clic('#xlExportBtn'); await page.waitForTimeout(1500);
  const hebdoBtn = await page.$('#hebdoSection button[onclick^="exportHebdoPdf"]');
  if (!hebdoBtn) { await clic('#hebdoSection .rh-nav-btn:nth-child(2)'); }
  await clic('#hebdoSection button[onclick^="exportHebdoPdf"]'); await page.waitForTimeout(1500);
  const fx = await ev(() => (window.__fs || []).map(f => ({ path: f.path, n: f.data.length, data: f.data })));
  const rap = fx.find(f => /AURA_rapport_EV_.*\.html$/.test(f.path)), xls = fx.find(f => /\.xls$/.test(f.path)), heb = fx.find(f => /AURA_hebdo_EV_.*\.html$/.test(f.path));
  const netEV = await ev(() => Number(S.fees.totalPnlNet).toFixed(2));
  R('rapport · app Android : .html écrit dans Download/AURA (aucune fenêtre), mode EV nommé, net vrai du mode', !!rap && popups.length === pop0 && /EV · Évaluation/.test(rap.data) && rap.data.includes(netEV), { fichiers: fx.map(f => f.path), netEV });
  const lignes = xls ? (xls.data.match(/<Worksheet ss:Name="Trades">[\s\S]*?<\/Worksheet>/) || [''])[0] : '';
  R('excel · app Android : .xls écrit dans Download/AURA, colonne Paire remplie', !!xls && /\/USDT/.test(lignes) && !/<Data ss:Type="String">—<\/Data><Data ss:Type="String">(LONG|SHORT)/.test(lignes), { xls: xls && xls.path });
  R('hebdo · app Android : .html écrit, sans DOM de l\'appli, paires nommées', !!heb && !/compactWidgetTab|bunkerBanner|revengeBlock|cinemaOverlay/.test(heb.data) && !/undefined/.test(heb.data), { heb: heb && heb.path });
  await ev(() => { window.__fsRefus = true; });
  await clic('#xlExportBtn'); await page.waitForTimeout(1500);
  const tf = await lastToast();
  R('excel · écriture refusée : le toast dit « non écrit » (avant : « téléchargé » toujours)', tf.some(t => /Excel non écrit/.test(t)) && !tf.slice(-1).some(t => /téléchargé/.test(t)), tf);
  await ev(() => { delete window.Capacitor; delete window.__fsRefus; });

  // ───────── ADN, comparaison, replay, calculateur ─────────
  const hTr = () => ev(() => JSON.stringify(Object.values(S.walletStore.paperReal.pairStates).map(ps => ps.trades || [])));   // l'HISTOIRE seule (les prix bougent)
  const h0 = await hTr();
  await ev(() => switchOutilsTab('outils')); await page.waitForTimeout(1200);
  const adn = await html('adnSection'); const h1 = await hTr();
  R('adn · rien écrit dans l\'historique, paires nommées, plus de gène « Calm » constant', h1 === h0 && !/"adn"/.test(h1) && /<span style="font-weight:700;color:[^"]+;">[A-Z]{2,5}<\/span>/.test(adn) && !/>Calm</.test(adn), { avant: h0.length, apres: h1.length, adn: /"adn"/.test(h1) });
  const fc = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
  await clic('#diffSection .diff-upload-zone');
  const ch = await fc; if (ch) await ch.setFiles(BACKUP); await page.waitForTimeout(1500);
  const df = await html('diffSection'); const pfEV = Number(st.walletStore.paperReal.portfolio).toFixed(2);
  R('comparaison · le backup complet réel lu, portefeuille EV du backup à gauche (' + pfEV + ' $)', df.includes('$' + pfEV) && !/Avant[\s\S]{0,400}\$0\.00/.test(df.slice(0, 1500)), (df.match(/diff-row-val[^>]*>[^<]*/g) || []).slice(0, 6));
  const rp = await ev(() => { initReplaySection(); return { n: _RP.events.length, chain: _RP.events.filter(e => e.type === 'chain').length, trades: _RP.events.filter(e => e.type.startsWith('trade')).length }; });
  R('replay · aucun événement du journal sans date (avant : tous datés « maintenant » en fin de lecture)', rp.chain === 0 && rp.trades > 0, rp);
  await ev(() => { _CALC.leverage = 3; _CALC.capital = 1000; _CALC.riskPct = 2; _CALC.slPct = 1.5; _CALC.tpPct = 3; renderCalcSection(); });
  const ca = await ev(() => { const r = _runCalc(); return { cap: r.cap, pertSL: r.exposure !== undefined ? r.exposure * 0.015 : null, risque: r.cap * 0.02, rr: r.rr }; });
  R('calculateur · levier ×3 : perte au SL = exactement 2 % du capital (recalé sur le compte trading), R/R 2 (avant : 6)', Math.abs(ca.pertSL - ca.risque) < 1e-6 && Math.abs(ca.rr - 2) < 1e-9, ca);

  // ───────── rechargement ─────────
  await ev(async () => { closeOutils(); await saveState(true); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  const fin = await ev(() => ({ auto: S.botAutoMode, adn: Object.values(S.walletStore).some(w => Object.values(w.pairStates || {}).some(ps => (ps.trades || []).some(t => 'adn' in t))),
    hist: JSON.stringify(Object.fromEntries(['sim', 'paperReal', 'real'].map(m => [m, Object.fromEntries(Object.entries(S.walletStore[m].pairStates || {}).map(([p, ps]) => [p, (ps.trades || []).length]))]))) }));
  const h0o = JSON.parse(hist0), h1o = JSON.parse(fin.hist); const diffs = [];
  Object.keys(h0o).forEach(m => Object.keys(h0o[m]).forEach(p => { if (h1o[m][p] !== h0o[m][p]) diffs.push(m + ' ' + p + ' ' + h0o[m][p] + '→' + h1o[m][p]); }));
  R('rechargement · MANU gardé ; historique : seules lignes nouvelles = l\'ouverture et la fermeture « urgence » de la position de la sonde ; aucun champ adn', fin.auto === false && !fin.adn && diffs.length <= 1 && diffs.every(d => /^paperReal ETH\/USDT/.test(d)), { diffs, auto: fin.auto });
  R('aucune erreur de page', perr.length === 0, perr);

  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '⚠ ' + ko + ' défaut(s) montré(s)' : '✅ 0 défaut') + ' · ' + res.length + ' étapes · code ' + ROOT + ' · AUTO au backup : ' + autoAuBackup);
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ root: ROOT, res, dialogs }, null, 1));
  await browser.close(); server.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
