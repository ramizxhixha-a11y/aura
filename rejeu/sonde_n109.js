// rejeu/sonde_n109.js — [GO N° 109 · 20/11/2026] vraie page, backup du pont (20/11 21:28) : la note T$ prouvée, AVANT / APRÈS.
// Usage : node rejeu/sonde_n109.js --root . --avant <copie du code d'avant> --backup <backup.json> --porte <rejeu/out/porte_n109/resultat.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : la page charge le backup ; on relève la note de chaque agent, le poids de chaque voix dans la décision commune (_dcMeritHz), la mise de chaque bot
// (_botStakeMult), la règle de fenêtre ; puis la VRAIE porte de recalcul (_fitRecomputeAll, celle de chaque jugement) ; on relève à nouveau, et le siège
// que l'évolution retirerait (le plus faible, 03 learnFromOutcome) ; 20 s de battement.
// Attendu : avant, le recalcul ne change rien (la note brute = la note gardée) ; après, exactement les notes de la porte (M0 b′, R2 seul) ; poids des voix,
// mises des bots, règle de fenêtre et siège le plus faible IDENTIQUES avant / après ; aucune erreur de page.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
if (!A.backup || !A.avant || !A.porte) { console.error('--backup <fichier>, --avant <dossier> et --porte <resultat.json> requis'); process.exit(2); }
const NEW = path.resolve(A.root || '.'), OLD = path.resolve(A.avant), OUT = path.join(NEW, 'rejeu/out');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const serve = (ROOT, PORT) => new Promise(r => { const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}); s.listen(PORT, '127.0.0.1', () => r(s)); });
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 1500))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
const PORTE = JSON.parse(fs.readFileSync(A.porte, 'utf8'));
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };
const RELEVE = () => {
  const notes = {}; S.agents.forEach(a => { if (a) notes[a.id] = Math.round(Number(a.fitness)); });
  const T = S.dcThreshold || {}, poids = {}; Object.keys(T.vHz || {}).sort().forEach(id => { poids[id] = _dcMeritHz(id); });
  const mises = {}; S.agents.filter(a => a && a.isBot).forEach(a => { const m = _botStakeMult(a.id); mises[a.id] = [m.mult, m.p, m.lo, m.n]; });
  const r = S.fitWindowRule || {}, faible = ([...S.agents].filter(a => !a.isBot && !a.isMeta).sort((a, b) => a.fitness - b.fitness)[0] || {}).id;
  return { notes, poids, mises, regle: [!!r.armed, r.window, _fitWindow()], faible, judged: Number(S._realJudgments) || 0 };
};
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
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  await ev('window.__releve = ' + RELEVE.toString());
  r.charge = await ev(() => window.__releve());
  r.recalcules = await ev(() => _fitRecomputeAll());   // la VRAIE porte : celle de chaque jugement (_fitJudge, abstention, _vjJudge)
  r.apres = await ev(() => window.__releve());
  r.hasProven = await ev(() => typeof window._fitProven === 'function');
  await page.waitForTimeout(20000);
  r.fin = await ev(() => window.__releve());
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8971, 'avant'), ap = await passe(browser, NEW, 8972, 'apres');
  await browser.close();
  console.log('SONDE N° 109 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  const chg = (x) => Object.keys(x.apres.notes).filter(k => x.apres.notes[k] !== x.charge.notes[k]).map(k => [k, x.charge.notes[k], x.apres.notes[k]]);
  const attendu = (PORTE.M0b_R2_seul || []).map(c => [c[0], c[1], c[2]]).sort();
  R('témoin : les deux pages chargent le même état (mêmes notes gardées, règle de fenêtre armée à 20, mêmes jugements)', av.pret && ap.pret && JSON.stringify(av.charge.notes) === JSON.stringify(ap.charge.notes) && av.charge.regle[0] === true && av.charge.regle[1] === 20,
    { avant: av.charge.regle, apres: ap.charge.regle });
  R('avant : la vraie porte de recalcul ne change aucune note (note brute = note gardée)', av.recalcules === 0 && chg(av).length === 0, chg(av));
  R('après : elle change exactement les notes que dit la porte (R2 seul, fenêtre 20) — ' + attendu.length + ' agents', ap.hasProven && JSON.stringify(chg(ap).sort()) === JSON.stringify(attendu),
    { sonde: chg(ap).sort(), porte: attendu });
  R('poids des voix dans la décision commune (_dcMeritHz), mises des bots (_botStakeMult) et règle de fenêtre : IDENTIQUES avant / après',
    JSON.stringify(av.apres.poids) === JSON.stringify(ap.apres.poids) && JSON.stringify(av.apres.mises) === JSON.stringify(ap.apres.mises) && JSON.stringify(av.apres.regle) === JSON.stringify(ap.apres.regle),
    { poids: [Object.keys(av.apres.poids).length, Object.keys(ap.apres.poids).length], mises: [av.apres.mises, ap.apres.mises], regle: [av.apres.regle, ap.apres.regle] });
  R('siège que l\'évolution retirerait (le plus faible) : le même avant / après', av.apres.faible === ap.apres.faible, [av.apres.faible, ap.apres.faible]);
  console.log('  (dit) au-dessus de 350 après : ' + JSON.stringify(Object.keys(ap.apres.notes).filter(k => ap.apres.notes[k] > 350).map(k => [k, ap.apres.notes[k]])));
  R('pages sans erreur (avant et après), 20 s de battement', !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.writeFileSync(path.join(OUT, 'sonde_n109.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
