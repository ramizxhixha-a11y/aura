// rejeu/sonde_alertes_2.js — [GO ALERTES 2 · 14/11/2026] vraie page, backup du jour, tablette 800 × 1 280 : n° 66, 67, 68, 69, 34b, 77, 81, 96, AVANT / APRÈS.
// Usage : node rejeu/sonde_alertes_2.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé,
//    Telegram jamais appelé : tgOnPnlGoal est remplacé par un enregistreur)
// Étapes : (66 / 67) l'alerte « Gain du jour » réglée pour partir, écran sur l'AA par le vrai bouton de mode, 15 s de vrai battement → l'EV et le RE en play
// derrière l'écran ont la leur, étiquetée, en $ ; (68) export « Journal des frais » dans une app Android dont l'écriture native est refusée → le message le dit ;
// (77) « Portefeuille Total » = portefeuille + réserve fiscale + provisions, sans la réserve frais ; (96) net du CSV résumé = net de l'écran Fiscal ;
// (81) métriques EV = toutes les fermetures du mode ; (69) calculateur : R/R après frais ; (34b) Twin activé en EV, sauvé, page rechargée → toujours actif ; 0 erreur.
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
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 900))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };

async function passe(browser, ROOT, PORT, nom) {
  const server = await serve(ROOT, PORT), r = { nom };
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', q => (q.request().url().startsWith('http://127.0.0.1:' + PORT) ? q.continue() : q.abort())); await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.pret = await PRET(page); await page.waitForTimeout(6000);
  const ev = (fn, a) => page.evaluate(fn, a);
  // enregistreurs (aucun envoi réel) + l'alerte « Gain du jour » réglée pour partir, les autres coupées
  await ev(() => {
    window.__tg = []; window.__toasts = []; window.__ms = [];
    window.tgOnPnlGoal = t => { window.__tg.push(String(t)); return true; };
    window.showToast = m => { window.__toasts.push(((typeof _modeBehind === 'function' && _modeBehind()) ? '[' + _modeLab(S.tradingMode) + '] ' : '') + String(m)); };
    window.showMilestone = (i, t) => { window.__ms.push(_modeLab(S.tradingMode) + ' ' + i + ' ' + t); };
    _initAlerts(); Object.keys(S.pnlAlerts).forEach(k => { S.pnlAlerts[k].enabled = false; S.pnlAlerts[k].triggered = false; });
    goPage(0, null, document.getElementById('nav0'));
  });
  r.modes = await ev(() => ['sim', 'paperReal', 'real'].map(m => m + ':' + (window._isModeRunning ? _isModeRunning(m) : '?')));
  // écran sur l'AA par le vrai bouton de mode
  for (let i = 0; i < 3 && (await ev(() => window.AuraChrono.getCurrentMode())) !== 'sim'; i++) { await ev(() => cycleTradeMode()); await page.waitForTimeout(800); }
  r.ecran = await ev(() => window.AuraChrono.getCurrentMode());
  // l'alerte n'est armée qu'une fois l'écran sur l'AA (le bouton passe par le RE : il ne doit pas l'avoir à l'écran)
  await ev(() => { window.__tg = []; window.__toasts = []; window.__ms = []; S.pnlAlerts.dailyGain = { enabled: true, value: -1e9, triggered: false }; });
  await page.waitForTimeout(15000);
  r.alertes = await ev(() => ({ tg: window.__tg.slice(), toasts: window.__toasts.filter(t => /aujourd'hui/.test(t)), ms: window.__ms.slice() }));
  // retour à l'EV
  for (let i = 0; i < 3 && (await ev(() => window.AuraChrono.getCurrentMode())) !== 'paperReal'; i++) { await ev(() => cycleTradeMode()); await page.waitForTimeout(800); }
  r.ecran2 = await ev(() => window.AuraChrono.getCurrentMode());
  // 68 : export dans une app Android dont l'écriture native est refusée
  r.export = await ev(async () => {
    window.__toasts = []; const blobs = []; const o = URL.createObjectURL; URL.createObjectURL = b => { blobs.push(1); return o.call(URL, b); };
    window.Capacitor = { Plugins: { Filesystem: { writeFile: async () => { throw new Error('refusé (sonde)'); } } } };
    try { await exportFeesCSV(); } catch (e) { window.__toasts.push('ERR ' + e.message); }
    await new Promise(z => setTimeout(z, 300)); delete window.Capacitor; URL.createObjectURL = o;
    return { toasts: window.__toasts.slice(), blobs: blobs.length };
  });
  // 77, 96, 81, 69 : chiffres de l'EV
  r.chiffres = await ev(() => {
    const f = S.fees, n = v => Number(v) || 0, tax = calcTaxProvision();
    const net = n(f.totalPnlGross) - n(f.totalGross) - tax;
    const csv = buildSummaryCSV(), m = computeAdvancedMetrics();
    const rows = Object.values(S.pairStates).flatMap(ps => (ps.trades || []).filter(t => t.pnlUsdt != null));
    const parType = {}; rows.forEach(t => { parType[t.type] = (parType[t.type] || 0) + 1; });
    let calc = null; const el = document.getElementById('calcSection') || (() => { const d = document.createElement('div'); d.id = 'calcSection'; document.body.appendChild(d); return d; })();
    try { renderCalcSection(); const t = el.innerText || el.textContent; calc = (t.match(/R\/R[^\n]*\n?[^\n]*/g) || []).slice(0, 2); } catch (e) { calc = 'ERR ' + e.message; }
    return { total: computePortfolioTotal(), sansFrais: _computePortfolio() + n(S.fiscalReserveAccount) + n(S.antiNegTaxPart), reserveFrais: n(f.feeReserveAccount),
      netEcran: +net.toFixed(2), netCsv: (csv.match(/P&L Net,([-\d.]+)\$/) || [])[1], totalPnlNet: +n(f.totalPnlNet).toFixed(2), funding: +n(f.totalFunding).toFixed(4),
      metriques: m ? m.tradesCount : 0, parType, calc };
  });
  // 34b : Twin activé en EV, sauvé, page rechargée
  r.twin0 = await ev(async () => { toggleTwinLive(); const a = !!(S.twin && S.twin.active); await saveState(true); return { actif: a, mode: S.tradingMode }; });
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'domcontentloaded' }); await PRET(page); await page.waitForTimeout(5000);
  r.twin1 = await ev(() => { const m = S.tradingMode; if (typeof _initTwin === 'function') _initTwin();
    return { mode: m, actif: !!(S.twin && S.twin.active), parMode: S.twinByMode ? Object.keys(S.twinByMode).map(k => k + ':' + !!S.twinByMode[k].active) : null }; });
  r.err = perr.slice();
  await ctx.close(); server.close();
  return r;
}

(async () => {
  let browser = await chromium.launch(); const av = await passe(browser, OLD, 8981, 'avant'); await browser.close();
  browser = await chromium.launch(); const ap = await passe(browser, NEW, 8983, 'apres'); await browser.close();
  console.log('  (modes en play : ' + ap.modes.join(' ') + ' ; écran ' + ap.ecran + ' puis ' + ap.ecran2 + ')');
  const lab = x => x.tg.map(t => t.slice(0, 2)).sort().join(',');
  R('n° 66 · écran sur l\'AA, 15 s de battement : alertes Telegram « Gain du jour » ' + JSON.stringify(av.alertes.tg.map(t => t.slice(0, 40))) + ' → ' + JSON.stringify(ap.alertes.tg.map(t => t.slice(0, 60))),
    ap.ecran === 'sim' && lab(ap.alertes) === 'AA,EV,RE' && !/EV|RE/.test(lab(av.alertes)), { av: av.alertes, ap: ap.alertes });
  R('n° 66 · derrière l\'écran : messages étiquetés « [EV] » / « [RE] », aucun bandeau de l\'écran pour eux (bandeaux : ' + JSON.stringify(ap.alertes.ms.map(x => x.slice(0, 20))) + ')',
    ap.alertes.toasts.some(t => /^\[EV\]/.test(t)) && ap.alertes.toasts.some(t => /^\[RE\]/.test(t)) && ap.alertes.ms.every(x => /^AA /.test(x)), ap.alertes);
  R('n° 67 · « Gain du jour » en $ depuis minuit : ' + (ap.alertes.tg.find(t => /^EV/.test(t)) || '—') + ' (avant, AA : « ' + (av.alertes.tg[0] || '—') + ' », un % lu comme des $)',
    ap.alertes.tg.every(t => /Gain du jour ≥ \$-1000000000 : [+−]\$\d+\.\d\d depuis minuit$/.test(t)), ap.alertes.tg);
  R('n° 68 · export « Journal des frais », écriture native refusée : « ' + av.export.toasts.join(' | ') + ' » (liens blob ' + av.export.blobs + ') → « ' + ap.export.toasts.join(' | ') + ' » (liens blob ' + ap.export.blobs + ')',
    ap.export.blobs === 0 && ap.export.toasts.some(t => /^❌ Journal des frais non écrit/.test(t)) && !ap.export.toasts.some(t => /export/i.test(t)) && av.export.toasts.some(t => /Frais exportés/.test(t)), { av: av.export, ap: ap.export });
  const c = ap.chiffres, b = av.chiffres;
  R('n° 77 · Portefeuille Total EV ' + b.total.toFixed(2) + ' $ → ' + c.total.toFixed(2) + ' $ (réserve frais ' + c.reserveFrais.toFixed(2) + ' $ retirée : le cumul des frais déjà payés)',
    Math.abs(c.total - c.sansFrais) < 0.005 && Math.abs(b.total - c.total - c.reserveFrais) < 0.05, { av: b, ap: c });
  R('n° 96 · net du CSV résumé ' + b.netCsv + ' $ → ' + c.netCsv + ' $ = net de l\'écran Fiscal ' + c.netEcran + ' $ (totalPnlNet ' + c.totalPnlNet + ' $, funding ' + c.funding + ' $)',
    Number(c.netCsv) === c.netEcran && Number(b.netCsv) !== c.netEcran, { av: b, ap: c });
  R('n° 81 · métriques EV : ' + b.metriques + ' → ' + c.metriques + ' clôtures (historique EV par type : ' + JSON.stringify(c.parType) + ')',
    c.metriques === (c.parType.position || 0) + (c.parType.urgence || 0) + (c.parType.tendance || 0), { av: b, ap: c });
  R('n° 69 · calculateur : « ' + JSON.stringify(b.calc) + ' » → « ' + JSON.stringify(c.calc) + ' »', Array.isArray(c.calc) && /R\/R après frais/.test(c.calc.join(' ')) && !/2\.00 ✅/.test(c.calc.join(' ')), { av: b.calc, ap: c.calc });
  R('n° 34b · Twin activé en EV (' + ap.twin0.actif + '), sauvé, page rechargée : actif ' + av.twin1.actif + ' → ' + ap.twin1.actif + ' ; par mode ' + JSON.stringify(ap.twin1.parMode),
    ap.twin0.actif && ap.twin1.mode === 'paperReal' && ap.twin1.actif === true && av.twin1.actif === false, { av: [av.twin0, av.twin1], ap: [ap.twin0, ap.twin1] });
  R('0 erreur de page (avant ' + av.err.length + ', après ' + ap.err.length + ')', !ap.err.length, { av: av.err, ap: ap.err });
  const ko = res.filter(x => !x.ok).length; console.log('\n' + (ko ? '❌ ' : '✅ ') + (res.length - ko) + '/' + res.length + ' étapes');
  process.exit(ko ? 1 : 0);
})();
