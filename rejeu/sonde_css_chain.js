// rejeu/sonde_css_chain.js — [GO CSS · écran 5 · 14/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280) : l'écran Chain, AVANT / APRÈS.
// Usage : node rejeu/sonde_css_chain.js --root . --avant <copie du code d'avant> --backup <backup.json> [--out <dossier>]
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes (APRÈS) : zones dans l'ordre (tuiles · titre de la liste · liste) · l'écran s'ouvre sur les trades (groupés par jour, 60 au plus, du plus récent) ·
// tuiles justes (recomptées depuis S) · appui sur une tuile = la liste de sa nature · plus de « hash » · « Ce que le système a appris » dans le titre, ouvre
// le panneau · textes < 11 px (chaque onglet) → 0 · défilement plus court · plus de reconstruction sans changement (avant : à chaque passage) ·
// badge : « 9+ » permanent avant → caché, puis « 1 » posé par le battement de 08 hors écran après un trade, caché de retour sur Chain ·
// autres écrans inchangés · 390 / 1 280 sans débordement · 0 erreur.
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
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 600))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;

// textes < 11 px et hauteur de #page4 pour l'onglet montré
const MESURE = () => { const vis = e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const pg = document.getElementById('page4'); let petits = 0; const g = {};
  pg.querySelectorAll('*').forEach(e => { if (!vis(e) || ![...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
    const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11) { petits++; const k = ((typeof e.className === 'string' && e.className) ? '.' + e.className.split(' ')[0] : e.tagName) + ' ' + f + 'px'; g[k] = (g[k] || 0) + 1; } });
  return { petits, ex: Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 6), h: pg.scrollHeight, rows: pg.querySelectorAll('#mobileChainList .chain-row').length }; };
const ONGLETS = ev => ev(() => [...document.querySelectorAll('#page4 [id^="chaintab-"]')].map(b => b.id));
const MONTRE = async (o, id) => { await o.ev(i => { document.getElementById(i).click(); document.getElementById('page4').scrollTop = 0; }, id); await o.page.waitForTimeout(900); return o.ev(MESURE); };
// combien de fois renderChain réécrit la liste quand rien ne change (5 passages)
const REBATIT = () => new Promise(res => { const cl = document.getElementById('mobileChainList'); let n = 0; const mo = new MutationObserver(() => {});
  mo.observe(cl, { childList: true }); for (let i = 0; i < 5; i++) { renderChain(); n += mo.takeRecords().filter(x => x.type === 'childList').length ? 1 : 0; } setTimeout(() => { mo.disconnect(); res(n); }, 50); });
const BADGE = () => { const b = document.getElementById('chainCountBadge'); return { txt: b.textContent, vu: getComputedStyle(b).display !== 'none' }; };

async function ouvrir(browser, ROOT, PORT, vp) {
  const server = await serve(ROOT, PORT);
  const ctx = await browser.newContext({ viewport: vp || { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT) ? r.continue() : r.abort()));
  await ctx.addInitScript(init);
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) break; await page.waitForTimeout(200); }
  await page.waitForTimeout(7000);
  await page.evaluate(() => { window.showToast = function () {}; goPage(4, null, document.getElementById('nav4')); document.getElementById('page4').scrollTop = 0; }); await page.waitForTimeout(4000);
  const close = async () => { await ctx.close(); server.close(); };
  return { page, perr, close, ev: (fn, a) => page.evaluate(fn, a) };
}
const hauteurs = ev => ev(async () => { const h = {}; for (const i of [0, 1, 2, 3, 5, 4]) { goPage(i, null, document.getElementById('nav' + i)); await new Promise(r => setTimeout(r, 1500)); h[i] = document.getElementById('page' + i).scrollHeight; } return h; });
const capture = async (o, f) => { if (!OUT) return; await o.ev(() => { [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && /Connexion perdue/.test(e.textContent) && e.textContent.length < 120).forEach(e => e.style.display = 'none'); });
  await o.page.waitForTimeout(600); await o.page.screenshot({ path: path.join(OUT, f) }); };

(async () => {
  // ───── AVANT ─────
  let browser = await chromium.launch();
  const av = await ouvrir(browser, OLD, 8991);
  const ongAv = await ONGLETS(av.ev), mAv = {};
  for (const id of ongAv) mAv[id] = await MONTRE(av, id);
  await av.ev(() => document.getElementById('chaintab-all').click()); await av.page.waitForTimeout(600);
  await capture(av, 'avant-chain.png');
  const rAv = await av.ev(REBATIT);
  const bAv = await av.ev(async () => { goPage(0, null, document.getElementById('nav0')); await new Promise(r => setTimeout(r, 800)); renderChain(); const b = document.getElementById('chainCountBadge');
    return { txt: b.textContent, vu: getComputedStyle(b).display !== 'none' }; });
  const hAv = await hauteurs(av.ev);
  await av.close(); await browser.close();

  // ───── APRÈS ─────
  browser = await chromium.launch();
  const ap = await ouvrir(browser, NEW, 8992); const ev = ap.ev, page = ap.page;
  const z = await ev(() => { const pos = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top : -1; };
    return { tuiles: pos('chainBref'), titre: pos('chainHead'), liste: pos('mobileChainList'), actif: [...document.querySelectorAll('#page4 .active')].map(e => e.id),
      filtre: typeof _chainFilter !== 'undefined' ? _chainFilter : null }; });
  R('zones dans l\'ordre (tuiles · titre de la liste · liste) ; l\'écran s\'ouvre sur les trades (tuile Trades active)', z.tuiles >= 0 && z.tuiles < z.titre && z.titre < z.liste && z.filtre === 'trade' && z.actif.join() === 'chaintab-trade', z);
  const tr = await ev(() => { const ps = S.pairStates, all = []; Object.keys(ps).forEach(p => (ps[p].trades || []).forEach(t => all.push(t.ts || 0)));
    all.sort((a, b) => b - a); const rows = [...document.querySelectorAll('#mobileChainList .chain-row')];
    return { n: all.length, rows: rows.length, jours: document.querySelectorAll('#mobileChainList .cz-day').length, hash: /chain-hash|0x[0-9a-f]{6}/.test(document.getElementById('mobileChainList').innerHTML),
      tuile: [document.getElementById('czN_trade').textContent, document.getElementById('czL_trade').textContent], r0: rows[0] && rows[0].innerText.replace(/\s+/g, ' ') }; });
  R('trades : ' + tr.rows + ' lignes (' + tr.n + ' dans l\'historique, 60 au plus), ' + tr.jours + ' jours, plus de « hash » ; tuile « ' + tr.tuile.join(' · ') + ' » ; 1re : « ' + tr.r0 + ' »',
    tr.rows === Math.min(60, tr.n) && tr.jours >= 1 && !tr.hash && +tr.tuile[0] === tr.n && /mise \$\d+,\d\d à/.test(tr.r0 || ''), tr);
  const cats = await ev(() => { const c = { dec: 0, learn: 0, sys: 0 }; S.chainLog.forEach(x => c[_chainCat(x)]++);
    return { c, t: ['dec', 'learn', 'sys'].map(f => +document.getElementById('czN_' + f).textContent), all: document.getElementById('chaintab-all').textContent, n: S.chainLog.length }; });
  R('tuiles recomptées depuis S : Décisions ' + cats.t[0] + ' · Apprentissage ' + cats.t[1] + ' · Système ' + cats.t[2] + ' ; « ' + cats.all + ' »',
    cats.t[0] === cats.c.dec && cats.t[1] === cats.c.learn && cats.t[2] === cats.c.sys && cats.all === 'Tout le journal · ' + cats.n, cats);
  const ongAp = await ONGLETS(ev), mAp = {};
  for (const id of ongAp) { await page.click('#' + id); await page.waitForTimeout(900); mAp[id] = await ev(MESURE);
    mAp[id].titre = await ev(() => document.getElementById('chainHeadT').textContent); mAp[id].actif = await ev(() => [...document.querySelectorAll('#page4 .active')].map(e => e.id).join()); }
  R('appui sur chaque tuile / « Tout le journal » : la liste de sa nature (' + ongAp.map(i => mAp[i].titre + ' ' + mAp[i].rows).join(' · ') + '), seul cet onglet actif',
    ongAp.length === 5 && ongAp.every(i => mAp[i].actif === i) && mAp['chaintab-dec'].titre === 'Décisions' && mAp['chaintab-sys'].rows > 0, Object.fromEntries(ongAp.map(i => [i, [mAp[i].titre, mAp[i].actif, mAp[i].rows]])));
  const grp = await ev(() => [...document.querySelectorAll('#mobileChainList .cz-x')].map(e => e.textContent));
  R('lignes identiques groupées dans « Tout le journal » (' + grp.join(' ') + ')', grp.length >= 1, grp);
  const petitsAv = Object.values(mAv).reduce((a, m) => a + m.petits, 0), petitsAp = Object.values(mAp).reduce((a, m) => a + m.petits, 0);
  R('textes < 11 px (chaque onglet) : ' + petitsAv + ' avant → ' + petitsAp, petitsAp === 0 && petitsAv > 100, { ap: Object.fromEntries(ongAp.map(i => [i, mAp[i].ex])) });
  R('défilement : Trades ' + mAv['chaintab-trade'].h + ' → ' + mAp['chaintab-trade'].h + ' px ; journal entier ' + mAv['chaintab-all'].h + ' → ' + mAp['chaintab-all'].h + ' px',
    mAp['chaintab-trade'].h < mAv['chaintab-trade'].h * 0.85 && mAp['chaintab-all'].h < mAv['chaintab-all'].h, { av: mAv, ap: mAp });
  const lb = await ev(async () => { const b = document.getElementById('learnedBtn'), inHead = !!(b && b.parentNode && b.parentNode.id === 'chainHeadBtns');
    b.click(); await new Promise(r => setTimeout(r, 400)); const ov = [...document.body.children].find(e => /Ce que le système a appris/.test(e.textContent) && e !== document.getElementById('page4') && !e.contains(document.getElementById('page4')));
    const ok = !!ov; if (ov) ov.remove(); return { inHead, ok, n: document.querySelectorAll('#learnedBtn').length }; });
  R('« Ce que le système a appris » dans le titre de la liste, une seule fois, ouvre son panneau', lb.inHead && lb.ok && lb.n === 1, lb);
  await page.click('#chaintab-trade'); await page.waitForTimeout(600);
  const rAp = await ev(REBATIT);
  R('reconstruction de la liste sur 5 passages sans changement : ' + rAv + ' avant → ' + rAp, rAv >= 5 && rAp === 0, { rAv, rAp });
  // hauteurs des écrans au même moment de la vie de la page qu'avant (avant les attentes du badge : l'école tourne et fait grandir l'écran Agents)
  const hAp = await hauteurs(ev);
  const autres = [0, 1, 2, 3, 5].filter(i => Math.abs(hAp[i] - hAv[i]) > Math.max(20, hAv[i] * 0.01));
  R('autres écrans inchangés (hauteurs ' + [0, 1, 2, 3, 5].map(i => hAv[i] + '→' + hAp[i]).join(' · ') + ')', autres.length === 0, { autres, hAv, hAp });
  // badge : hors écran, le battement de 08 le pose (sans appel de la sonde) ; de retour sur Chain, caché
  const b0 = await ev(async () => { goPage(0, null, document.getElementById('nav0')); await new Promise(r => setTimeout(r, 12000)); const b = document.getElementById('chainCountBadge'); return { txt: b.textContent, vu: getComputedStyle(b).display !== 'none' }; });
  const b1 = await ev(async () => { const p = Object.keys(S.pairStates)[0]; S.pairStates[p].trades.push({ type: 'open', side: 'buy', price: 1, stakeUsdt: 10, ts: Date.now() + 500, __sonde: 1 });
    await new Promise(r => setTimeout(r, 12000)); const b = document.getElementById('chainCountBadge'); return { txt: b.textContent, vu: getComputedStyle(b).display !== 'none' }; });
  const b2 = await ev(async () => { goPage(4, null, document.getElementById('nav4')); await new Promise(r => setTimeout(r, 6000)); const b = document.getElementById('chainCountBadge');
    const out = { txt: b.textContent, vu: getComputedStyle(b).display !== 'none', ls: localStorage.getItem('aura_chain_vu') };
    Object.keys(S.pairStates).forEach(p => { S.pairStates[p].trades = S.pairStates[p].trades.filter(t => !t.__sonde); }); renderChain(); return out; });
  R('badge : avant « ' + bAv.txt + ' » affiché sans trade nouveau → caché ; un trade : « ' + b1.txt + ' » posé par le battement hors écran ; de retour sur Chain : caché',
    bAv.vu && bAv.txt === '9+' && !b0.vu && b1.vu && b1.txt === '1' && !b2.vu && /paperReal/.test(b2.ls || ''), { bAv, b0, b1, b2 });
  await ev(() => { goPage(4, null, document.getElementById('nav4')); document.getElementById('page4').scrollTop = 0; }); await page.waitForTimeout(1500);
  await capture(ap, 'apres-chain.png');
  const vue = await ev(() => { const v = innerHeight - document.getElementById('nav').offsetHeight, rows = [...document.querySelectorAll('#mobileChainList .chain-row')].filter(r => r.getBoundingClientRect().bottom < v);
    return { bref: Math.round(document.getElementById('chainBref').getBoundingClientRect().bottom), v, rows: rows.length }; });
  R('1er écran sans défiler : les 4 tuiles et ' + vue.rows + ' trades', vue.bref < vue.v && vue.rows >= 15, vue);
  R('aucune erreur de page (après : ' + ap.perr.length + ', avant : ' + av.perr.length + ')', ap.perr.length === 0, ap.perr);
  await ap.close(); await browser.close();

  // ───── formats ─────
  for (const [vp, nom] of [[{ width: 390, height: 844 }, 'téléphone 390 × 844'], [{ width: 1280, height: 800 }, 'paysage 1 280 × 800']]) {
    browser = await chromium.launch();
    const o = await ouvrir(browser, NEW, 8993, vp);
    const d = await o.ev(() => { const w = document.documentElement.clientWidth; const pg = document.getElementById('page4');
      const sortent = [...pg.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1; }).map(e => e.id || e.className).slice(0, 8);
      return { w, sortent, cols: getComputedStyle(document.getElementById('chainBref')).gridTemplateColumns.split(' ').length }; });
    R(nom + ' : rien ne déborde, tuiles sur ' + d.cols + ' colonnes', d.sortent.length === 0 && (vp.width < 520 ? d.cols === 2 : d.cols === 4), d);
    if (OUT && vp.width < 520) { await capture(o, 'apres-chain-390.png'); }
    await o.close(); await browser.close();
  }

  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌' : '✅') + ' sonde_css_chain : ' + (res.length - ko) + '/' + res.length);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
