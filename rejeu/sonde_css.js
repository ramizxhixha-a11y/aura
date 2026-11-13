// rejeu/sonde_css.js — [GO CSS · 13/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280) : l'accueil en 6 zones, AVANT / APRÈS.
// Usage : node rejeu/sonde_css.js --root . --avant <copie du code d'avant> --backup <backup.json> [--out <dossier>]
//   (un seul navigateur, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes (APRÈS) : rien de perdu (chaque id visible avant l'est après, volets ouverts) · zones dans l'ordre · 1er écran = l'argent ·
// textes < 11 px sur l'accueil (avant : 209 attendus) → 0 · défilement plus court · écrans 1 à 5 inchangés · volets fermés par défaut,
// mémorisés à la relance (seul l'état des volets est jugé après la relance : sur ce banc local, une relance repart d'un état vide, ancien code
// compris — vérifié le 13/11 : trading 1 115,52 $ → 0, 11 positions → 0, à l'identique sur 81ede33) · Brain dessiné à l'ouverture de son volet · sommaire · boutons de l'en-tête atteignables · tuile → détail · toggleBar · 0 erreur.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
if (!A.backup || !A.avant) { console.error('--backup <fichier> et --avant <dossier> requis'); process.exit(2); }
const NEW = path.resolve(A.root || '.'), OLD = path.resolve(A.avant), OUT = A.out || null;
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const serve = (ROOT, PORT) => new Promise(r => { const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}); s.listen(PORT, '127.0.0.1', () => r(s)); });
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 500))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;

// mesures communes aux deux versions (dans la page)
const MESURE = () => {
  const vis = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const F = [...document.querySelectorAll('#page0 .acc-fold')].map(f => f.dataset.fold);   // ouverts comme au doigt (_accFold : Brain redessiné), refermés à la fin
  F.forEach(n => _accFold(n, true));
  const ids = [...document.querySelectorAll('#page0 [id]')].filter(vis).map(e => e.id);
  let petits = 0; const ex = [];
  document.querySelectorAll('#page0 *').forEach(e => { if (!vis(e) || ![...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
    const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11) { petits++; if (ex.length < 6) ex.push((e.className || e.tagName) + ' ' + f + 'px'); } });
  F.forEach(n => _accFold(n, false));
  return { ids, petits, ex };
};

async function ouvrir(browser, ROOT, PORT) {
  const server = await serve(ROOT, PORT);
  const ctx = await browser.newContext({ viewport: { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT) ? r.continue() : r.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  const pret = async () => {
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(7000);
    await page.evaluate(() => { goPage(0, null, document.getElementById('nav0')); document.getElementById('page0').scrollTop = 0; }); await page.waitForTimeout(2500);
  };
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pret();
  const close = async () => { await ctx.close(); server.close(); };
  return { page, perr, pret, close, ev: (fn, a) => page.evaluate(fn, a) };
}
const hauteurs = ev => ev(async () => { const h = {}; for (let i = 0; i <= 5; i++) { goPage(i, null, document.getElementById('nav' + i)); await new Promise(r => setTimeout(r, 1500)); h[i] = document.getElementById('page' + i).scrollHeight; }
  goPage(0, null, document.getElementById('nav0')); return h; });

(async () => {
  const browser = await chromium.launch();
  // ───── AVANT ─────
  const av = await ouvrir(browser, OLD, 8985);
  const mAv = await av.ev(MESURE); const hAv = await hauteurs(av.ev);
  if (OUT) { await av.ev(() => { document.getElementById('page0').scrollTop = 0; }); await av.page.waitForTimeout(800); await av.page.screenshot({ path: path.join(OUT, 'avant-ecran1.png') }); }
  console.log('AVANT : ' + mAv.ids.length + ' id visibles · ' + mAv.petits + ' textes < 11 px · défilement ' + hAv[0] + ' px · erreurs ' + av.perr.length);
  await av.close();

  // ───── APRÈS ─────
  const ap = await ouvrir(browser, NEW, 8986); const ev = ap.ev;
  const mode = await ev(() => S.tradingMode);
  R('départ · page prête, mode à l\'écran ' + mode, mode === 'paperReal', mode);
  const ferm = await ev(() => [...document.querySelectorAll('#page0 .acc-fold')].map(f => [f.dataset.fold, f.classList.contains('open')]));
  R('volets fermés par défaut : ' + ferm.map(f => f[0]).join(', '), ferm.length === 5 && ferm.every(f => !f[1]), ferm);
  const brain0 = await ev(() => document.getElementById('brainCanvas').getBoundingClientRect().width);
  const mAp = await ev(MESURE); const hAp = await hauteurs(ev);
  const perdus = mAv.ids.filter(i => !mAp.ids.includes(i));
  R('rien de perdu : ' + mAv.ids.length + ' id visibles avant, tous visibles après (volets ouverts : ' + mAp.ids.length + ')', perdus.length === 0, perdus.slice(0, 20));
  R('textes < 11 px sur l\'accueil : ' + mAv.petits + ' avant → ' + mAp.petits + ' (volets ouverts)', mAp.petits === 0 && mAv.petits > 100, mAp.ex);
  R('défilement de l\'accueil, volets fermés : ' + hAv[0] + ' → ' + hAp[0] + ' px', hAp[0] < hAv[0] * 0.8, { hAv, hAp });
  const autres = [1, 2, 3, 4, 5].filter(i => Math.abs(hAp[i] - hAv[i]) > Math.max(20, hAv[i] * 0.01));
  R('écrans 1 à 5 inchangés (hauteurs ' + [1, 2, 3, 4, 5].map(i => hAv[i] + '→' + hAp[i]).join(' · ') + ')', autres.length === 0, { autres, hAv, hAp });

  await ev(() => { document.getElementById('page0').scrollTop = 0; }); await ap.page.waitForTimeout(800);
  if (OUT) await ap.page.screenshot({ path: path.join(OUT, 'apres-ecran1.png') });
  const z = await ev(() => { const pg = document.getElementById('page0'), r0 = pg.getBoundingClientRect();
    const zones = ['accArgent', 'accPaires', 'accComptes', 'accSante', 'accCerveau', 'accHisto'].map(id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top - r0.top + pg.scrollTop) : -1; });
    const bas = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().bottom) : 99999; };
    const lignes = [...document.querySelectorAll('#openPnlBanner > div > div')].slice(0, 2).map(e => Math.round(e.getBoundingClientRect().bottom));
    return { zones, heroVal: bas('heroVal'), capFree: bas('capFree'), positions: lignes, vue: innerHeight - document.getElementById('nav').offsetHeight,
      texte: ['heroVal', 'capFree'].map(i => document.getElementById(i).textContent) }; });
  R('zones dans l\'ordre : ' + z.zones.join(' < '), z.zones.every((p, i) => p >= 0 && (!i || p > z.zones[i - 1])), z.zones);
  R('1er écran sans défiler : total ' + z.texte[0] + ', LIBRE ' + z.texte[1] + ' et le début des positions ouvertes', z.heroVal < z.vue && z.capFree < z.vue && z.positions.length === 2 && z.positions[1] < z.vue, z);

  // volets : mémorisés à la relance
  await ev(() => _accFold('journal')); await ap.page.waitForTimeout(500);
  const mem = await ev(() => localStorage.getItem('aura_accueil_volets'));
  await ap.page.reload({ waitUntil: 'domcontentloaded' }); await ap.pret();
  const apresRelance = await ev(() => Object.fromEntries([...document.querySelectorAll('#page0 .acc-fold')].map(f => [f.dataset.fold, f.classList.contains('open')])));
  R('volet ouvert mémorisé : ' + mem + ' → à la relance ' + JSON.stringify(apresRelance), mem === '{"journal":1}' && apresRelance.journal === true && !apresRelance.brain && !apresRelance.intel, apresRelance);
  await ev(() => _accFold('journal')); await ap.page.waitForTimeout(300);

  // Brain : replié → 0 px ; ouvert → dessiné à sa taille
  await ev(() => _accFold('brain')); await ap.page.waitForTimeout(1500);
  const brain = await ev(() => { const c = document.getElementById('brainCanvas'), r = c.getBoundingClientRect(); let px = 0;
    try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) px++; } catch (e) { px = -1; }
    return { w: Math.round(r.width), h: Math.round(r.height), cw: c.width, px }; });
  R('Brain : replié ' + Math.round(brain0) + ' px de large → ouvert ' + brain.w + ' × ' + brain.h + ' px, ' + brain.px + ' pixels dessinés', brain0 === 0 && brain.w > 600 && brain.px > 500, brain);
  if (OUT) { await ev(() => { const pg = document.getElementById('page0'); pg.scrollTop = document.getElementById('accCerveau').offsetTop - 50; }); await ap.page.waitForTimeout(800); await ap.page.screenshot({ path: path.join(OUT, 'apres-brain-ouvert.png') }); }
  await ev(() => _accFold('brain'));

  // sommaire : « Historique » amène la zone sous le sommaire
  await ev(() => { document.getElementById('page0').scrollTop = 0; }); await ap.page.waitForTimeout(400);
  await ap.page.locator('#accNav button', { hasText: 'Comptes' }).click(); await ap.page.waitForTimeout(1500);
  const go = await ev(() => { const pg = document.getElementById('page0'), nav = document.getElementById('accNav'), h = document.getElementById('accComptes');
    const max = pg.scrollHeight - pg.clientHeight; return { ecart: Math.round(h.getBoundingClientRect().top - nav.getBoundingClientRect().bottom), scroll: Math.round(pg.scrollTop), max }; });
  R('sommaire « Comptes » : la zone arrive sous le sommaire (écart ' + go.ecart + ' px, ou bas de page)', Math.abs(go.ecart) <= 6 || go.scroll >= go.max - 2, go);

  // en-tête : chaque bouton atteignable au doigt
  await ev(() => { document.getElementById('page0').scrollTop = 0; }); await ap.page.waitForTimeout(400);
  const tete = await ev(() => ['wakeLockBtn', 'fpBtn', 'diagBtn', 'regimeBadge', 'modeToggleBtn', 'tradeModeBtn', 'settingsBtn', 'simToggleBtn', 'closeAllBtn'].map(id => {
    const b = document.getElementById(id), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return [id, !!(e && b.contains(e)), Math.round(r.width)]; }));
  R('en-tête : 9 boutons atteignables (' + tete.filter(t => t[1]).length + '/9)', tete.every(t => t[1] && t[2] >= 24), tete);

  // tuile Caisse → fiche détail (délégation 09m) ; toggleBar
  await ev(() => { const pg = document.getElementById('page0'); pg.scrollTop = document.getElementById('accComptes').offsetTop - 50; }); await ap.page.waitForTimeout(700);
  await ap.page.locator('#cashVal').click(); await ap.page.waitForTimeout(800);
  const fiche = await ev(() => { const s = document.getElementById('wdSheet'); const o = !!(s && s.classList.contains('open')); try { closeWalletDetail(); } catch (e) {} return o; });
  R('tuile Caisse → fiche détail ouverte', fiche, fiche);
  const bar = await ev(() => { const m = document.getElementById('manBar'), was = m.classList.contains('open'); toggleBar('man'); const now = m.classList.contains('open'); toggleBar('man'); return [was, now]; });
  R('toggleBar(\'man\') ouvre la barre Positions Man', bar[0] === false && bar[1] === true, bar);
  R('aucune erreur de page (avant ' + av.perr.length + ', après ' + ap.perr.length + ')', ap.perr.length === 0, ap.perr);
  await ap.close(); await browser.close();
  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌ ' + ko + ' étape(s) en échec sur ' + res.length : '✅ ' + res.length + '/' + res.length + ' étapes'));
  if (OUT) fs.writeFileSync(path.join(OUT, 'sonde_css.json'), JSON.stringify({ res, avant: { petits: mAv.petits, hauteurs: hAv, ids: mAv.ids.length }, apres: { petits: mAp.petits, hauteurs: hAp, ids: mAp.ids.length } }, null, 1));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
