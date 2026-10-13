// [GO DÉMO · 12/10/2026] VERSION 20261012a · rejeu/sonde_demo.js — la réparation d'un compte abîmé par le Mode Démo, sur la VRAIE app, avec de VRAIS backups.
// Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 22. (banc-demo-retire.js refait l'accident sur un état d'essai avec le texte témoin du
// Mode Démo ; cette sonde, elle, joue l'écran réel — bandeau, choix du fichier, bouton — dans Chromium, sur l'état réel de la tablette.)
//   node rejeu/sonde_demo.js --root <dossier du code> --abime <backup abîmé.json> --avant <backup d'avant.json> [--refus <fichier.json,…>] [--port 8951] [--out <f.json>]
//     --abime  l'état de départ de la page : un backup Guardian pris APRÈS l'accident (le compte porte les faux chiffres) ; « sain » à la place d'un
//              fichier ne change rien : passer un backup d'avant dans --abime vérifie qu'aucun bandeau ne vient sur un compte sain
//     --avant  le fichier que « Rams » choisit dans le bandeau : le dernier backup d'AVANT l'accident
//     --refus  d'autres fichiers à présenter d'abord au bandeau : chacun doit être REFUSÉ (trop ancien, d'après l'accident…), sans rien écrire
// Ce que la sonde fait : sert le dossier, ouvre la page (réseau coupé, sauf elle-même), pose l'état du backup --abime par localStorage (comme rejeu/sonde_modes.js),
// attend _stateReady, lit le compte, joue le bandeau avec de vrais clics et le vrai sélecteur de fichier, relit le compte, puis envoie la page en arrière-plan
// (sauvegarde de sortie), la relance et relit encore. Elle ouvre aussi le panneau Outils, onglet UI : plus de Mode Démo, plus de Multi-compte.
// Elle ne juge pas : elle rend les chiffres (résultat JSON), à comparer à l'attendu de la passation.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (e2) {} } }
if (!chromium) { console.error('playwright introuvable'); process.exit(2); }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!args.root || !args.abime) { console.error('usage : node rejeu/sonde_demo.js --root <code> --abime <backup> [--avant <backup>] [--refus a.json,b.json] [--port 8951] [--out f.json]'); process.exit(2); }
const ROOT = path.resolve(args.root), ABIME = path.resolve(args.abime), AVANT = args.avant ? path.resolve(args.avant) : null, REFUS = (args.refus || '').split(',').filter(Boolean).map(f => path.resolve(f)), PORT = Number(args.port || 8951);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];   // les migrations uniques déjà faites sur la tablette (liste de rejeu/sonde_modes.js)
const lire = () => {   // exécuté dans la page
  const out = { ecran: S.tradingMode, cycle: S.cycle, modes: {} };
  ['sim', 'paperReal', 'real'].forEach(m => {
    const w = S.walletStore[m], ps = w.pairStates; let gardes = 0, faux = 0, sT = 0, sW = 0, sU = 0;
    Object.keys(ps).forEach(p => { (ps[p].trades || []).forEach(t => { gardes++; if (window._demoReparation && window._demoReparation.faux(t)) faux++; }); sT += ps[p].totalTrades || 0; sW += ps[p].winTrades || 0; sU += ps[p].totalPnlUsd || 0; });
    out.modes[m] = { portfolio: w.portfolio, tradingAccount: w.tradingAccount, cashAccount: w.cashAccount, totalTrades: w.totalTrades, winTrades: w.winTrades, sommePaires: sT, sommeGagnants: sW, sommePnlUsd: sU, fraisTradeCount: w.fees && w.fees.tradeCount,
      tradesGardes: gardes, faux, positions: (w.openPositions || []).length, _startPortfolio: w._startPortfolio, _totalCompounded: w._totalCompounded, leverageReserve: w.leverageReserve, capRef: w.bunker && w.bunker.capRef,
      jour: w.pnlPeriod && w.pnlPeriod.todayStartPortfolio, semaine: w.pnlPeriod && w.pnlPeriod.weekStartPortfolio, mois: w.pnlPeriod && w.pnlPeriod.monthStartPortfolio, derniereLigne: w.pnlPeriod && w.pnlPeriod.history && w.pnlPeriod.history[w.pnlPeriod.history.length - 1],
      fiscalLignes: w.fiscal && w.fiscal.hist && w.fiscal.hist.length };
  });
  out.fitness = S.agents.map(a => [a.id, a.fitness]);
  out.journal = (S.chainLog || []).filter(l => /rendu|Démo|démo|restaur/i.test(l.desc || '')).map(l => l.desc).slice(-4);
  out.journalDurable = (S.eventLog || []).filter(e => /Mode démo/i.test(e.d || '')).map(e => e.k + ' · ' + e.d).slice(-2);
  out.statut = window._demoReparationStatus ? JSON.parse(JSON.stringify(window._demoReparationStatus)) : null;
  return out;
};
const bandeau = () => { const b = document.getElementById('demoReparationBandeau'); if (!b) return null; return { texte: Array.from(b.querySelectorAll('div > div')).map(e => e.textContent), boutons: Array.from(b.querySelectorAll('button')).map(e => e.textContent) }; };
(async () => {
  const env = JSON.parse(fs.readFileSync(ABIME, 'utf8')), st = env.aura; st.tradingMode = 'paperReal';
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_demo')) { localStorage.clear();
      localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
      localStorage.setItem('aura_current_trade_mode', 'paperReal'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_demo', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 } });   // l'écran de la tablette de Rams (diag du pont : 686 × 1073)
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue(); return route.abort(); });
  await ctx.addInitScript(init);
  const page = await ctx.newPage(); const perr = [], dialogs = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 240)); });
  page.on('dialog', d => { dialogs.push(d.type() + ' : ' + d.message().slice(0, 160)); d.dismiss().catch(() => {}); });
  const pret = async () => { for (let i = 0; i < 900; i++) { const ok = await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length > 0 && S.walletStore && S.walletStore.paperReal)).catch(() => false); if (ok) return true; await page.waitForTimeout(100); } return false; };
  const choisir = async (fichier, bouton) => { const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 15000 }), page.locator('#demoReparationBandeau button', { hasText: bouton }).click()]); await fc.setFiles(fichier); await page.waitForTimeout(1500); return page.evaluate(bandeau); };
  const out = { code: ROOT, abime: path.basename(ABIME), avant: AVANT && path.basename(AVANT) };
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (!await pret()) { console.error('état non restauré', await page.evaluate(() => window.__initErr || null), perr); await browser.close(); server.close(); process.exit(3); }
  await page.waitForTimeout(3500);   // le contrôle du module passe une seconde après _stateReady
  out.docV = await page.evaluate(() => (document.documentElement.innerHTML.match(/DOC_V = '([0-9a-z]+)'/) || [])[1]);
  out.depart = await page.evaluate(lire); out.bandeauDepart = await page.evaluate(bandeau);
  await page.evaluate(async () => { try { await saveState(true); } catch (e) {} });
  // le panneau Outils, onglet UI : ce qui s'y trouve
  out.outilsUI = await page.evaluate(() => { try { openOutils('ui'); } catch (e) { return { err: String(e) }; } const c = document.getElementById('outilsContent'); const r = { sections: Array.from(c.children).map(e => e.id), demo: !!document.getElementById('demoSection'), multiCompte: !!document.getElementById('multiCompteSection'), cartesDemo: document.querySelectorAll('.demo-preset').length, boutonNouveauCompte: document.querySelectorAll('.mc-add-btn').length, vides: Array.from(c.children).filter(e => !e.innerHTML.trim()).map(e => e.id), fonctions: ['enterDemoMode', 'exitDemoMode', 'createAccount', 'switchAccount'].filter(f => typeof window[f] === 'function') }; try { closeOutils(); } catch (e) {} return r; });
  if (out.bandeauDepart && AVANT) {
    out.refus = [];
    let bouton = 'Choisir le backup';
    for (const f of REFUS) { const b = await choisir(f, bouton); out.refus.push({ fichier: path.basename(f), bandeau: b, compte: (await page.evaluate(lire)).modes.paperReal.portfolio }); bouton = 'Choisir un autre fichier'; }
    out.bandeauFichier = await choisir(AVANT, bouton);
    out.avantDeConfirmer = (await page.evaluate(lire)).modes.paperReal.portfolio;   // choisir le fichier n'écrit rien
    await page.locator('#demoReparationBandeau button', { hasText: 'Rendre mon vrai compte' }).click(); await page.waitForTimeout(1200);
    out.bandeauApres = await page.evaluate(bandeau); out.apres = await page.evaluate(lire);
    await page.waitForTimeout(1500);
  }
  // l'app passe en arrière-plan (la sauvegarde de sortie écrit), est tuée, puis relancée
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(1500); await page.evaluate(() => { window._stateReady = false; }); await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  if (!await pret()) { console.error('après relance : état non restauré', perr); await browser.close(); server.close(); process.exit(4); }
  await page.waitForTimeout(3500);
  out.apresRelance = await page.evaluate(lire); out.bandeauApresRelance = await page.evaluate(bandeau);
  out.erreursPage = perr; out.dialogues = dialogs;
  if (args.out) fs.writeFileSync(args.out, JSON.stringify(out, null, 1));
  const dit = (nom, v) => { if (!v) return; const e = v.modes.paperReal; console.log(nom.padEnd(14) + ' EV ' + e.portfolio + ' $ (trading ' + e.tradingAccount + ', caisse ' + e.cashAccount + ') · ' + e.totalTrades + ' trades / ' + e.winTrades + ' gagnants · frais ' + e.fraisTradeCount + ' · ' + e.tradesGardes + ' gardés dont ' + e.faux + ' faux · départ session ' + e._startPortfolio + ' · cumul ' + e._totalCompounded + ' · jour ' + e.jour + ' · semaine ' + e.semaine + ' · bunker ' + e.capRef + ' · levier ' + e.leverageReserve + ' · AA ' + v.modes.sim.portfolio + ' / ' + v.modes.sim.totalTrades + ' · RE ' + v.modes.real.portfolio); };
  console.log('document', out.docV, '· départ', out.abime, '· fichier choisi', out.avant);
  dit('départ', out.depart); console.log('  bandeau :', JSON.stringify(out.bandeauDepart));
  (out.refus || []).forEach(r => console.log('  refus ' + r.fichier + ' :', JSON.stringify(r.bandeau && r.bandeau.texte), '· compte', r.compte));
  if (out.bandeauFichier) console.log('  fichier  :', JSON.stringify(out.bandeauFichier), '· compte avant de confirmer', out.avantDeConfirmer);
  dit('après', out.apres); if (out.bandeauApres) console.log('  bandeau :', JSON.stringify(out.bandeauApres), '· journal', JSON.stringify(out.apres.journal), '· durable', JSON.stringify(out.apres.journalDurable), '· statut', JSON.stringify(out.apres.statut));
  dit('après relance', out.apresRelance); console.log('  bandeau :', JSON.stringify(out.bandeauApresRelance), '· journal', JSON.stringify(out.apresRelance.journal));
  console.log('Outils · UI :', JSON.stringify(out.outilsUI)); console.log('erreurs de page', JSON.stringify(out.erreursPage), '· dialogues', JSON.stringify(out.dialogues));
  await browser.close(); server.close();
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
