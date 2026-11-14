// rejeu/sonde_css_marche.js — [GO CSS · écran 3 · 14/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280) : l'écran Marché, AVANT / APRÈS.
// Usage : node rejeu/sonde_css_marche.js --root . --avant <copie du code d'avant> --backup <backup.json> [--out <dossier>]
//   (un seul navigateur, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes (APRÈS) : une puce par paire (avant : 10 pour 12), dans la barre de la paire, « Gérer » au bout ; une paire ajoutée / retirée suit ·
// zones dans l'ordre · rien de perdu (tout révélé) · textes < 11 px TOUT révélé (analyses ouvertes, volets ouverts) → 0 · défilement plus court ·
// autres écrans inchangés · analyse au doigt (ouverte sur toute la largeur, gardée aux rendus de 08, refermée) · consensus nommé (plus de 🧬) ·
// volets fermés par défaut, mémorisés à la relance, matrice redessinée à sa largeur · puce → paire choisie · « Gérer » ouvre sa fenêtre ·
// 390 × 844 et 1 280 × 800 sans débordement · 0 erreur.
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


const MESURE = async () => {
  // un conteneur en display: contents (la barre des puces dans #mkPairBar) n'a pas de boîte : visible si l'un de ses enfants l'est
  const vis = e => { const cs = getComputedStyle(e); if (cs.display === 'contents') return [...e.children].some(vis); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const pg = document.getElementById('page2'); const ids = new Set(); let petits = 0; const g = {};
  const folds = [...document.querySelectorAll('#page2 .mk-fold')], ana = [...document.querySelectorAll('#page2 .mk-ana')];
  folds.forEach(f => f.classList.add('open')); ana.forEach(a => a.classList.add('mk-open'));
  await new Promise(r => setTimeout(r, 600));
  pg.querySelectorAll('[id]').forEach(e => { if (vis(e)) ids.add(e.id); });
  pg.querySelectorAll('*').forEach(e => { if (!vis(e) || ![...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
    const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11) { petits++; const k = ((typeof e.className === 'string' && e.className) ? '.' + e.className.split(' ')[0] : e.tagName) + ' ' + f + 'px'; g[k] = (g[k] || 0) + 1; } });
  folds.forEach(f => f.classList.remove('open')); ana.forEach(a => a.classList.remove('mk-open'));
  return { ids: [...ids], petits, ex: Object.entries(g).sort((a, b) => b[1] - a[1]) };
};

async function ouvrir(browser, ROOT, PORT, vp) {
  const server = await serve(ROOT, PORT);
  const ctx = await browser.newContext({ viewport: vp || { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT) ? r.continue() : r.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  const pret = async () => {
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(7000);
    await page.evaluate(() => { window.showToast = function () {}; goPage(2, null, document.getElementById('nav2')); document.getElementById('page2').scrollTop = 0; }); await page.waitForTimeout(4000);
  };
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pret();
  const close = async () => { await ctx.close(); server.close(); };
  return { page, perr, pret, close, ev: (fn, a) => page.evaluate(fn, a) };
}
const hauteurs = ev => ev(async () => { const h = {}; for (const i of [0, 1, 3, 4, 5, 2]) { goPage(i, null, document.getElementById('nav' + i)); await new Promise(r => setTimeout(r, 1500)); h[i] = document.getElementById('page' + i).scrollHeight; } return h; });
const capture = async (o, f) => { if (!OUT) return; await o.ev(() => { [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && /Connexion perdue/.test(e.textContent) && e.textContent.length < 120).forEach(e => e.style.display = 'none'); });
  await o.page.waitForTimeout(600); await o.page.screenshot({ path: path.join(OUT, f) }); };
const PUCES = () => ({ paires: Object.keys(PAIRS), puces: [...document.querySelectorAll('#pairSelWrap .pair-pill')].map(e => e.dataset.pair) });

(async () => {
  const browser = await chromium.launch();
  // ───── AVANT ─────
  const av = await ouvrir(browser, OLD, 8977);
  const pAv = await av.ev(PUCES);
  const mAv = await av.ev(MESURE); const hAv = await hauteurs(av.ev);
  await av.ev(() => { document.getElementById('page2').scrollTop = 0; }); await capture(av, 'avant-marche.png');
  console.log('AVANT : ' + pAv.puces.length + ' puces / ' + pAv.paires.length + ' paires · ' + mAv.ids.length + ' id visibles · ' + mAv.petits + ' textes < 11 px · défilement ' + hAv[2] + ' px · erreurs ' + av.perr.length);
  await av.close();

  // ───── APRÈS ─────
  const ap = await ouvrir(browser, NEW, 8978); const ev = ap.ev, page = ap.page;
  R('départ · page prête, mode à l\'écran ' + await ev(() => S.tradingMode), await ev(() => S.tradingMode === 'paperReal'));
  const p = await ev(() => { const b = document.getElementById('mkPairBar'), k = [...b.children].map(e => e.id);
    return { paires: Object.keys(PAIRS), puces: [...document.querySelectorAll('#pairSelWrap .pair-pill')].map(e => e.dataset.pair), barre: k }; });
  R('une puce par paire : ' + pAv.puces.length + ' avant → ' + p.puces.length + ' / ' + p.paires.length + ', dans la barre de la paire, « Gérer » au bout (' + p.barre.join(' · ') + ')',
    JSON.stringify(p.puces) === JSON.stringify(p.paires) && pAv.puces.length < pAv.paires.length && JSON.stringify(p.barre) === '["pairSelWrap","pairMgrBtn"]', p);
  const suit = await ev(() => { const k = Object.keys(PAIRS)[0]; PAIRS['ZZZ/USDT'] = Object.assign({}, PAIRS[k]); renderMarket();
    const n1 = document.querySelectorAll('#pairSelWrap .pair-pill').length, last = document.querySelector('#pairSelWrap .pair-pill:last-child').dataset.pair;
    delete PAIRS['ZZZ/USDT']; renderMarket(); const n2 = document.querySelectorAll('#pairSelWrap .pair-pill').length;
    return { n1, last, n2, n: Object.keys(PAIRS).length, barre: [...document.getElementById('mkPairBar').children].map(e => e.id) }; });
  R('une paire ajoutée a sa puce (' + suit.n1 + '), retirée la perd (' + suit.n2 + '), « Gérer » reste au bout', suit.n1 === suit.n + 1 && suit.last === 'ZZZ/USDT' && suit.n2 === suit.n && JSON.stringify(suit.barre) === '["pairSelWrap","pairMgrBtn"]', suit);
  const ordre = await ev(() => { const pg = document.getElementById('page2'), y = e => e ? Math.round(e.getBoundingClientRect().top - pg.getBoundingClientRect().top + pg.scrollTop) : -1;
    return ['candle-wrap-top', 'mkPairBar', 'mkDuo', 'miniChartsGrid', 'compositePanel'].map(i => y(document.getElementById(i))).concat([...document.querySelectorAll('#page2 .mk-fold')].map(y)); });
  R('zones dans l\'ordre : graphique · barre · analyse · toutes les paires · composite · Agents · Veille (' + ordre.join(' < ') + ')', ordre.length === 7 && ordre.every((v, i) => v >= 0 && (!i || v > ordre[i - 1])), ordre);

  const mAp = await ev(MESURE); const hAp = await hauteurs(ev);
  const perdus = mAv.ids.filter(i => !mAp.ids.includes(i));
  R('rien de perdu : ' + mAv.ids.length + ' id visibles avant (tout révélé), tous visibles après (' + mAp.ids.length + ')', perdus.length === 0, perdus.slice(0, 30));
  R('textes < 11 px, tout révélé (analyses et volets ouverts) : ' + mAv.petits + ' avant → ' + mAp.petits, mAp.petits === 0 && mAv.petits > 100, mAp.ex.slice(0, 40));
  R('défilement de l\'écran Marché (volets et analyses fermés) : ' + hAv[2] + ' → ' + hAp[2] + ' px', hAp[2] < hAv[2] * 0.6, { hAv, hAp });
  const autres = [0, 1, 3, 4, 5].filter(i => Math.abs(hAp[i] - hAv[i]) > Math.max(20, hAv[i] * 0.01));
  R('autres écrans inchangés (hauteurs ' + [0, 1, 3, 4, 5].map(i => hAv[i] + '→' + hAp[i]).join(' · ') + ')', autres.length === 0, { autres, hAv, hAp });

  await ev(() => { goPage(2, null, document.getElementById('nav2')); document.getElementById('page2').scrollTop = 0; }); await page.waitForTimeout(1500);
  await capture(ap, 'apres-marche.png');
  const z = await ev(() => { const vue = innerHeight - document.getElementById('nav').offsetHeight, b = id => Math.round(document.getElementById(id).getBoundingClientRect().bottom);
    return { barre: b('mkPairBar'), duo: b('mkDuo'), vue }; });
  R('1er écran sans défiler : graphique, toutes les puces et les deux verdicts', z.barre < z.vue && z.duo < z.vue, z);

  // analyse au doigt
  const a0 = await ev(() => { const t = document.getElementById('technicalPanel'); return { rows: [...t.querySelectorAll('.signal-row-item')].filter(e => getComputedStyle(e).display !== 'none').length, w: Math.round(t.getBoundingClientRect().width),
    verdict: getComputedStyle(t.querySelector('.signal-card-val')).display !== 'none' }; });
  await page.locator('#technicalPanel .signal-card-title').click(); await page.waitForTimeout(500);
  const a1 = await ev(() => { const t = document.getElementById('technicalPanel'); return { open: t.classList.contains('mk-open'), rows: [...t.querySelectorAll('.signal-row-item')].filter(e => getComputedStyle(e).display !== 'none').length, w: Math.round(t.getBoundingClientRect().width) }; });
  R('analyse technique : fermée (verdict, ' + a0.rows + ' ligne, ' + a0.w + ' px) → un appui l\'ouvre (' + a1.rows + ' indicateurs, ' + a1.w + ' px)', a0.verdict && a0.rows === 0 && a1.open && a1.rows >= 8 && a1.w > a0.w * 1.8, { a0, a1 });
  await ev(() => { const t = document.getElementById('technicalPanel'), pg = document.getElementById('page2'); pg.scrollTop = t.offsetTop - 80; }); await capture(ap, 'apres-analyse-ouverte.png');
  const n0 = await ev(() => { window.__tp = document.querySelector('#technicalPanel .signal-card'); return true; });
  await page.waitForTimeout(6500);
  const a2 = await ev(() => ({ open: document.getElementById('technicalPanel').classList.contains('mk-open'), rendu: document.querySelector('#technicalPanel .signal-card') !== window.__tp }));
  R('rendu de 08 (toutes les 5 s) : le panneau est réécrit et reste ouvert', n0 && a2.open && a2.rendu, a2);
  await page.locator('#technicalPanel .signal-card-title').click(); await page.waitForTimeout(400);
  R('2e appui : refermée', !(await ev(() => document.getElementById('technicalPanel').classList.contains('mk-open'))));

  // consensus nommé
  const cons = await ev(() => { const t = document.getElementById('agentConsensusMkt').textContent; const types = S.agents.filter(a => !a.isBot).map(a => a.type).filter(Boolean); return { emoji: t.includes('🧬'), nomme: types.some(x => t.includes(x)), t: t.slice(0, 120) }; });
  R('consensus des agents nommé par spécialité (plus de 🧬) : « ' + cons.t + ' »', !cons.emoji && cons.nomme, cons);

  // volets
  const v0 = await ev(() => [...document.querySelectorAll('#page2 .mk-fold')].map(f => [f.dataset.fold, f.classList.contains('open'), Math.round(f.querySelector('.mk-fold-b').getBoundingClientRect().height)]));
  await ev(() => { const pg = document.getElementById('page2'); pg.scrollTop = pg.scrollHeight; }); await page.waitForTimeout(400);
  await page.locator('#page2 .mk-fold[data-fold="agents"] .mk-fold-h').click(); await page.waitForTimeout(1200);
  const v1 = await ev(() => { const c = document.getElementById('corrMatrixCanvas'), dpr = window.devicePixelRatio || 1; return { open: document.querySelector('#page2 .mk-fold[data-fold="agents"]').classList.contains('open'),
    bitmap: Math.round(c.width / dpr), vu: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height), mem: localStorage.getItem('aura_marche_volets') }; });
  R('volets fermés par défaut (' + v0.map(v => v[0] + ' ' + v[2] + ' px').join(', ') + ') ; Agents ouvert au doigt : matrice dessinée à sa largeur (' + v1.bitmap + ' / ' + v1.vu + ' × ' + v1.h + ' px)',
    v0.length === 2 && v0.every(v => !v[1] && v[2] === 0) && v1.open && v1.vu > 300 && v1.vu <= 481 && Math.abs(v1.bitmap - v1.vu) <= 3 && v1.mem === '{"agents":1}', { v0, v1 });
  await page.locator('#page2 .mk-fold[data-fold="veille"] .mk-fold-h').click(); await page.waitForTimeout(800);
  await ev(() => { const pg = document.getElementById('page2'); pg.scrollTop = document.querySelector('#page2 .mk-fold').offsetTop - 20; }); await capture(ap, 'apres-volets.png');
  await page.reload({ waitUntil: 'domcontentloaded' }); await ap.pret();
  const v2 = await ev(() => [...document.querySelectorAll('#page2 .mk-fold')].map(f => f.classList.contains('open')));
  R('volets mémorisés à la relance (' + JSON.stringify(v2) + ')', JSON.stringify(v2) === '[true,true]', v2);
  await ev(() => { _mkFold('agents'); _mkFold('veille'); }); await page.waitForTimeout(300);

  // puce → paire choisie ; « Gérer » ouvre sa fenêtre
  await ev(() => { document.getElementById('page2').scrollTop = 0; }); await page.waitForTimeout(300);
  await page.locator('#ppill_ETH_USDT').click(); await page.waitForTimeout(1500);
  const ch = await ev(() => ({ pair: S.activePair, lbl: document.getElementById('mktPairLabel').textContent, active: document.querySelector('#pairSelWrap .pair-pill.active').dataset.pair }));
  R('appui sur la puce ETH/USDT : paire choisie (' + ch.pair + ', graphique « ' + ch.lbl + ' »)', ch.pair === 'ETH/USDT' && /ETH/.test(ch.lbl) && ch.active === 'ETH/USDT', ch);
  await page.locator('#ppill_BTC_USDT').click(); await page.waitForTimeout(800);
  await page.locator('#pairMgrBtn').click(); await page.waitForTimeout(600);
  const mg = await ev(() => { const m = document.getElementById('pairMgrModal'); const o = !!m; if (m) m.remove(); return o; });
  R('« Gérer les paires » ouvre sa fenêtre', mg, mg);

  for (const [w, h] of [[390, 844], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(1500);
    const lar = await ev(async () => { const pg = document.getElementById('page2'); const f = [...document.querySelectorAll('#page2 .mk-fold, #page2 .mk-ana')]; f.forEach(x => x.classList.add('open', 'mk-open'));
      await new Promise(r => setTimeout(r, 300)); const r = { scroll: pg.scrollWidth, client: pg.clientWidth }; f.forEach(x => x.classList.remove('open', 'mk-open')); return r; });
    R(w + ' × ' + h + ' : rien ne sort de l\'écran en largeur (' + lar.scroll + ' / ' + lar.client + ' px)', lar.scroll <= lar.client + 1, lar);
    await ev(() => { document.getElementById('page2').scrollTop = 0; }); await capture(ap, 'apres-' + w + '.png');
  }
  await page.setViewportSize({ width: 800, height: 1280 }); await page.waitForTimeout(800);
  R('aucune erreur de page (avant ' + av.perr.length + ', après ' + ap.perr.length + ')', ap.perr.length === 0, ap.perr);
  await ap.close(); await browser.close();
  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌ ' + ko + ' étape(s) en échec sur ' + res.length : '✅ ' + res.length + '/' + res.length + ' étapes'));
  if (OUT) fs.writeFileSync(path.join(OUT, 'sonde_css_marche.json'), JSON.stringify({ res, avant: { puces: pAv.puces.length, petits: mAv.petits, hauteurs: hAv, ids: mAv.ids.length }, apres: { petits: mAp.petits, hauteurs: hAp, ids: mAp.ids.length } }, null, 1));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
