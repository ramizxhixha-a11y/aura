// [GO RÉGLAGES · 14/10/2026] VERSION 20261014a · rejeu/sonde_reglages.js — les défauts « réglages » (ETAT n° 10 à 19) joués par la VRAIE page.
//   node rejeu/sonde_reglages.js --root <dossier du code> --backup <aura_guardian_full_….json> [--port 8972] [--out <f.json>]
// Une page Chromium servie depuis --root, réseau coupé, l'état RÉEL du backup chargé (EV à l'écran, bot en MANU, migrations « une fois » marquées faites).
// Les VRAIS boutons et les VRAIS rechargements : écran RE (renderPairPnl), réglages changés puis page rechargée, Mode Vacances (départ, relance, retour
// à la date prévue), Telegram, « RESTAURER » de l'historique des backups (un état plus ancien que l'état vivant), « ⬆ Importer backup » d'un fichier de
// 5 000 cycles en retard. Lancée sur le code d'avant (commit 61aeac6), elle montre les défauts ; sur le code livré, elle rend 0. Un backup n'entre jamais
// dans le dépôt.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (_e) {} } }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root || !args.backup) { console.error('usage : node rejeu/sonde_reglages.js --root <code> --backup <backup.json> [--port 8972] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), BACKUP = path.resolve(args.backup), PORT = Number(args.port || 8972);
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
const TOKEN = '123456:SONDE-jeton-secret';

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const st = JSON.parse(fs.readFileSync(BACKUP, 'utf8')).aura; st.tradingMode = 'paperReal'; st.botAutoMode = false;
  const init = `(() => { try { if (!sessionStorage.getItem('__sonde_reglages')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))}); localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
    localStorage.setItem('aura_current_trade_mode', 'paperReal'); ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__sonde_reglages', '1'); } } catch (e) { window.__initErr = String(e); } })();`;
  const ctx = await browser.newContext({ viewport: { width: 686, height: 1073 } });
  await ctx.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:' + PORT) ? route.continue() : route.abort());
  await ctx.addInitScript(init);
  const page = await ctx.newPage(), perr = [], dialogs = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => { dialogs.push(d.message()); (d.type() === 'confirm' ? d.accept() : d.dismiss()).catch(() => {}); });
  const pret = async () => {
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore && S.walletStore.paperReal && S.agents && S.agents.length > 0)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(4000);   // 11 rejoue les paires ajoutées dès _stateReady (veilleur 500 ms) ; 09b2 relance les vacances à +1,5 s
  };
  const recharge = async () => { await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await pret(); };
  const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await pret();
  await ev(() => { S.botAutoMode = false; });

  // ───────── n° 10 : écran RE ─────────
  const r10 = await ev(() => { const k = m => Object.keys(S.walletStore[m].pairStates || {}).sort(); const m0 = S.tradingMode; let err = null;
    try { S.tradingMode = 'real'; renderPairPnl(); } catch (e) { err = String(e && e.message || e); } finally { S.tradingMode = m0; }
    return { re: k('real'), ev: k('paperReal'), actives: Object.keys(PAIRS).sort(), err }; });
  R('n° 10 · les paires actives (' + r10.actives.length + ') ont un état dans le portefeuille RE', r10.actives.every(p => r10.re.includes(p)), { manquent: r10.actives.filter(p => !r10.re.includes(p)) });
  R('n° 10 · écran RE : renderPairPnl sans exception', !r10.err, r10.err);

  // ───────── n° 13 : réglages changés, page rechargée ─────────
  const v13 = await ev(async () => {
    _rvGet().enabled = false; _rvGet().cooldownMin = 5; toggleBkEnabled(); updateBkParam('triggerDropPct', 20); _sndGet().volume = 0.3; _sndGet().preset = 'casino';
    _initNotifConfig(); toggleNotifType('twinAlert'); S.toastVerbose = true; return true;
  }).catch(e => String(e));
  await ev((t) => { updateTgField('botToken', t); updateTgField('chatId', '42'); }, TOKEN);
  await ev(() => { S.botAutoMode = true; enterVacancesMode(); });
  const avantVac = await ev(() => ({ actif: S.vacancesCfg.active, prev: S.vacancesCfg.prevBotMode, auto: S.botAutoMode, fin: S.vacancesCfg.endDate }));
  const sv = await ev(async () => await saveState(true));
  const secret = await ev((t) => { _tgGet(); return { snapshot: JSON.stringify(buildSnapshot()).includes(t), historique: JSON.stringify(_buildFullBackup('sonde', 'manual')).includes(t), S: JSON.stringify(S).includes(t) }; }, TOKEN);
  await recharge();
  const apres = await ev(() => ({ rvOn: S.antiRevengeCfg && S.antiRevengeCfg.enabled, rvMin: S.antiRevengeCfg && S.antiRevengeCfg.cooldownMin, bkOn: S.bunkerCfg && S.bunkerCfg.enabled, bkPct: S.bunkerCfg && S.bunkerCfg.triggerDropPct,
    vol: S.soundCfg && S.soundCfg.volume, preset: S.soundCfg && S.soundCfg.preset, twin: S.notifConfig && S.notifConfig.twinAlert, verbose: S.toastVerbose,
    tg: _tgGet().botToken, chat: _tgGet().chatId, vac: S.vacancesCfg && S.vacancesCfg.active, prev: S.vacancesCfg && S.vacancesCfg.prevBotMode, fin: S.vacancesCfg && S.vacancesCfg.endDate, auto: S.botAutoMode }));
  R('n° 13 · départ en vacances : pause du bot (AUTO → MANU), AUTO d\'avant gardé', avantVac.actif === true && avantVac.prev === true && avantVac.auto === false, Object.assign({ v13, sauve: sv }, avantVac));
  R('n° 13 · après rechargement : Anti-Revenge (désactivé, 5 min), Bunker (désactivé, 20 %), Son (casino, 0,3), Notifications (twin), verbeux — tous gardés',
    apres.rvOn === false && apres.rvMin === 5 && apres.bkOn === false && apres.bkPct === 20 && apres.vol === 0.3 && apres.preset === 'casino' && apres.twin === true && apres.verbose === true, apres);
  R('n° 13 · après rechargement : Mode Vacances toujours en cours, même date de retour, bot toujours en MANU', apres.vac === true && apres.prev === true && apres.fin === avantVac.fin && apres.auto === false, apres);
  R('n° 13 · Telegram : jeton et chat gardés après rechargement ; jeton absent du snapshot, du backup de l\'historique et de JSON.stringify(S)', apres.tg === TOKEN && apres.chat === '42' && !secret.snapshot && !secret.historique && !secret.S, { tg: apres.tg === TOKEN, chat: apres.chat, secret });
  // retour : la date de retour passe pendant que l'app est fermée
  await ev(async () => { if (S.vacancesCfg) S.vacancesCfg.endDate = Date.now() - 1000; await saveState(true); });
  await recharge();
  const retour = await ev(() => ({ vac: S.vacancesCfg && S.vacancesCfg.active, auto: S.botAutoMode, entete: (document.getElementById('modeLabelText') || {}).textContent, journal: (S.chainLog || []).filter(l => /Fin vacances \(date prévue\).*resté en MAN/.test(l.desc)).length }));
  R('n° 13 · date de retour passée pendant l\'arrêt : au chargement, fin des vacances ; le bot RESTE en MAN (jamais AUTO sans ton geste), le journal le dit', retour.vac === false && retour.auto === false && retour.entete === 'MAN' && retour.journal >= 1, retour);

  // ───────── n° 11 : « RESTAURER » un backup de l'historique, plus ancien que l'état vivant ─────────
  const b11 = await ev(async () => {
    const b = _buildFullBackup('sonde-restore', 'manual'); await _saveBackupToDB(b);
    const list = await _loadAllBackups(); const it = list.find(x => x.meta && x.meta.label === 'sonde-restore');
    const c0 = S.cycle, ev0 = S.walletStore.paperReal.tradingAccount;
    S.walletStore.paperReal.tradingAccount = ev0 + 123; S.cycle = c0 + 3000; const ok = await saveState(true);
    return { id: it && it.id, c0, ev0, sauveApres: ok };
  });
  const nav = page.waitForNavigation({ timeout: 60000 }).catch(() => null);
  await ev((id) => { restoreBackup(id); }, b11.id);
  await nav; await pret();
  const a11 = await ev(() => ({ cycle: S.cycle, evT: S.walletStore.paperReal.tradingAccount, hw: localStorage.getItem('aura_highwater_cycle') }));
  R('n° 11 · « RESTAURER » (backup au cycle ' + b11.c0 + ', état vivant au cycle ' + (b11.c0 + 3000) + ') : après le rechargement, l\'app est au cycle du backup et l\'EV a son compte d\'alors',
    b11.id != null && a11.cycle >= b11.c0 && a11.cycle < b11.c0 + 1000 && Math.abs(a11.evT - b11.ev0) < 1e-9, Object.assign({}, b11, a11));
  const conf11 = dialogs.filter(m => /RESTAURATION COMPLÈTE/.test(m)).pop() || '';
  R('n° 11 · la confirmation nomme les 3 portefeuilles, AUTO / MANU et le cycle', /• AA : /.test(conf11) && /• EV : /.test(conf11) && /• RE : /.test(conf11) && /AUTO \/ MANU/.test(conf11) && /Cycle : #/.test(conf11), conf11.slice(0, 500));

  // ───────── n° 12 : « Importer backup » d'un fichier 5 000 cycles en retard ─────────
  // le fichier : 5 000 cycles en retard, EV −50 $, fait sur l'écran RE, SANS réglages Bunker / Vacances (comme tous les backups d'avant cette livraison)
  const bk0 = await ev(() => JSON.stringify(S.bunkerCfg));
  const fichier = await ev(() => { const s = JSON.parse(JSON.stringify(buildSnapshot())); s.cycle = S.cycle - 5000; s.walletStore.paperReal.tradingAccount = (Number(s.walletStore.paperReal.tradingAccount) || 0) - 50; s.tradingMode = 'real'; delete s.bunkerCfg; delete s.vacancesCfg; return JSON.stringify(s); });
  const fp = path.join(os.tmpdir(), 'sonde_reglages_import_' + process.pid + '.json'); fs.writeFileSync(fp, fichier);
  const attendu = JSON.parse(fichier);
  const fc = page.waitForEvent('filechooser', { timeout: 30000 });
  await ev(() => { importState(); });
  const chooser = await fc; const nav12 = page.waitForNavigation({ timeout: 60000 }).catch(() => null); await chooser.setFiles(fp);
  await nav12; await pret();
  const i12 = await ev(async () => ({ cycle: S.cycle, evT: S.walletStore.paperReal.tradingAccount, hw: localStorage.getItem('aura_highwater_cycle'), sauve: await saveState(true), journal: (S.chainLog || []).some(l => /Session importée depuis fichier/.test(l.desc)),
    mode: S.tradingMode, bouton: (document.getElementById('tradeModeBtn') || {}).textContent, argent: S.tradingAccount, bk: JSON.stringify(S.bunkerCfg) }));
  R('n° 12 · après l\'import d\'un fichier fait sur RE : l\'écran reste EV et l\'argent affiché est celui de l\'EV ; le Bunker absent du fichier reste le tien (pas le réglage d\'usine)',
    i12.mode === 'paperReal' && /EV/.test(i12.bouton || '') && Math.abs(i12.argent - i12.evT) < 1e-9 && i12.bk === bk0, { mode: i12.mode, bouton: i12.bouton, argent: i12.argent, bk: i12.bk, bk0 });
  R('n° 12 · « Importer backup » (fichier ' + attendu.cycle + ', 5 000 cycles en retard) : l\'app recharge sur l\'état du fichier, le repère de cycle suit, la sauvegarde suivante est ACCEPTÉE',
    i12.cycle >= attendu.cycle && i12.cycle < attendu.cycle + 1000 && Math.abs(i12.evT - attendu.walletStore.paperReal.tradingAccount) < 1e-9 && Number(i12.hw) <= i12.cycle && i12.sauve === true && i12.journal, i12);
  await recharge();
  const r12 = await ev(() => ({ cycle: S.cycle, evT: S.walletStore.paperReal.tradingAccount, banniere: !!document.getElementById('auraRecoveryBanner') }));
  R('n° 12 · rechargement après l\'import : toujours l\'état du fichier, aucune « régression » détectée', r12.cycle >= attendu.cycle && r12.cycle < attendu.cycle + 2000 && Math.abs(r12.evT - attendu.walletStore.paperReal.tradingAccount) < 1e-9 && !r12.banniere, r12);
  const conf12 = dialogs.filter(m => /Restaurer cette sauvegarde/.test(m)).pop() || '';
  R('n° 12 · la confirmation nomme les 3 portefeuilles, AUTO / MANU et le cycle', /• AA : /.test(conf12) && /• EV : /.test(conf12) && /AUTO \/ MANU/.test(conf12) && /Cycle : #/.test(conf12), conf12.slice(0, 500));
  try { fs.unlinkSync(fp); } catch (e) {}

  // ───────── n° 15, 16, 18, 19 : écrans ─────────
  const ecr = await ev(() => {
    const out = {}; const st0 = (S.adaptiveState || {}).bearStreak || 0;
    try { openOutils('trading'); renderHedgeAutoSection(); renderHedgeAutoSection(); out.hedge = (document.getElementById('hedgeAutoSection') || {}).textContent || ''; } catch (e) { out.hedgeErr = String(e); }
    out.bear = ((S.adaptiveState || {}).bearStreak || 0) - st0;
    try { switchOutilsTab('alertes'); out.alertes = (document.getElementById('outilsContent') || {}).textContent || ''; } catch (e) { out.alErr = String(e); }
    try { closeOutils(); openSettingsModal(); out.reglages = document.body.textContent; closeSettingsModal(); } catch (e) { out.regErr = String(e); }
    return { hedge: /non branché/.test(out.hedge) && !/Système actif/.test(out.hedge), bear: out.bear, simuler: /Simuler un (blocage|déclenchement)/.test(out.alertes || ''), reduire: /Réduire les mises|Mises réduites à/.test(out.alertes || ''),
      snapshots: /SNAPSHOTS INTERNES/.test(out.reglages || ''), err: [out.hedgeErr, out.alErr, out.regErr].filter(Boolean) };
  });
  R('n° 15 · Hedge : l\'écran dit « non branché » ; deux affichages n\'avancent plus le compteur BEAR', ecr.hedge && ecr.bear === 0, ecr);
  R('n° 14 / 16 · onglet Alertes : plus de « Simuler un blocage / un déclenchement », plus de « Réduire les mises »', !ecr.simuler && !ecr.reduire && !ecr.err.length, ecr);
  R('n° 18 · Réglages : plus de « SNAPSHOTS INTERNES »', !ecr.snapshots, ecr);
  R('page : aucune erreur de page', perr.length === 0, perr);

  await ctx.close(); await browser.close(); server.close();
  const ko = res.filter(r => !r.ok).length;
  console.log(ko ? '⚠ ' + ko + ' écart(s) sur ' + res.length : '✅ ' + res.length + ' / ' + res.length);
  if (args.out) fs.writeFileSync(args.out, JSON.stringify({ code: ROOT, backup: path.basename(BACKUP), res }, null, 1));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e); try { server.close(); } catch (_e) {} process.exit(3); });
