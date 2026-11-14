// rejeu/sonde_css_finitions.js — [GO CSS FINITIONS · 14/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280), mode EV : n° 86, 88, 89, 91, 92, AVANT / APRÈS.
// Usage : node rejeu/sonde_css_finitions.js --root . --avant <copie du code d'avant> --backup <backup.json> [--out <dossier>]
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes (APRÈS) : la voix n'est plus « 👤 MAN » (Positions ouvertes, briques, barres P&L) · prix des paires « $ » + virgule (entrées, briques, cartes de paire : DOT « $0 » avant) ·
// 🔇 et le bouclier dans la barre du bas, sur aucun bouton, chaque bouton de la barre atteignable au doigt, 🔇 et le bouclier répondent · fiche mémoire : 0 texte < 11 px,
// date, votes justes · analyse fondamentale : 11 facteurs + 2 hors score, 0 texte < 11 px · autres écrans à la même hauteur · 390 × 844 sans débordement · 0 erreur.
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
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 700))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;

async function ouvrir(browser, ROOT, PORT, vp) {
  const server = await serve(ROOT, PORT);
  const ctx = await browser.newContext({ viewport: vp || { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT) ? r.continue() : r.abort())); await ctx.addInitScript(init);
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) break; await page.waitForTimeout(200); }
  await page.waitForTimeout(7000);
  await page.evaluate(() => { window.showToast = function () {}; goPage(0, null, document.getElementById('nav0')); document.getElementById('page0').scrollTop = 0;
    [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && /Connexion perdue/.test(e.textContent) && e.textContent.length < 120).forEach(e => e.style.display = 'none'); });
  await page.waitForTimeout(2500);
  const close = async () => { await ctx.close(); server.close(); };
  return { page, perr, close, ev: (fn, a) => page.evaluate(fn, a) };
}

const ACCUEIL = () => {
  const vis = e => { if (!e) return false; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const ban = (document.getElementById('openPnlBanner') || {}).innerText || '';
  return { voix: (S.openPositions || []).filter(p => p._voix === 'tendance').length,
    manBan: (ban.match(/👤 MAN/g) || []).length, tendBan: (ban.match(/📈 Tendance/g) || []).length, titre: ban.split('\n')[0],
    manBrq: [...document.querySelectorAll('.action-brick')].filter(b => /👤 MAN/.test(b.innerText)).length,
    tendBrq: [...document.querySelectorAll('.action-brick')].filter(b => /📈 TENDANCE/.test(b.innerText)).length,
    manBar: [...document.querySelectorAll('[id^="pb_badge_"]')].filter(b => vis(b) && /👤/.test(b.textContent)).length,
    entrees: (ban.match(/entrée [^\n]+/g) || []), attendu: (typeof pxTxt === 'function') ? (S.openPositions || []).filter(p => p.auto !== true).map(p => 'entrée ' + pxTxt(p.pair, p.entryPrice)) : null, dot: (document.getElementById('ppos_px_DOT_USDT') || {}).textContent || '',
    brqDot: ((document.getElementById('abpx_DOT_USDT') || {}).textContent || '').split(' ')[0] };
};
const BOUTONS = () => {   // 🔇 et le bouclier contre la barre du bas : posés sur un bouton ? au-dessus de la barre ? chaque bouton atteignable au doigt ?
  const box = e => e.getBoundingClientRect(), inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const nav = document.getElementById('nav'), nb = box(nav), btn = [...nav.querySelectorAll('.nav-btn')], fl = ['soundToggle', 'gdnFab'].map(id => document.getElementById(id)).filter(Boolean);
  return { n: fl.length, sur: fl.map(f => btn.filter(b => inter(box(f), box(b)) > 0).map(b => b.id)).flat(),
    hors: fl.map(f => Math.round(Math.max(0, nb.top - box(f).top) + Math.max(0, box(f).bottom - nb.bottom))),
    doigt: btn.filter(b => { const r = box(b), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(e && b.contains(e)); }).map(b => b.id),
    W: innerWidth, deborde: Math.round(document.documentElement.scrollWidth - innerWidth) };
};
const PETITS = sel => { const vis = e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const root = document.querySelector(sel); if (!root) return -1; let n = 0;
  root.querySelectorAll('*').forEach(e => { if (vis(e) && [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11) n++; }); return n; };
const MEMOIRE = async () => { const a = (S.agents || []).filter(x => x.memory && x.memory.length).sort((x, y) => y.memory.length - x.memory.length)[0]; if (!a) return null;
  showMemoryOverlay(a.id); await new Promise(r => setTimeout(r, 600)); const o = document.getElementById('memoryOverlay'), t = o.innerText, b = o.querySelector('.memory-overlay-close').getBoundingClientRect();
  return { agent: a.name, n: a.memory.length, justes: a.memory.filter(e => e.won).length, haut: t.split('\n').slice(0, 6), ferme: [Math.round(b.width), Math.round(b.height)] }; };
const FOND = async () => { goPage(2, null, document.getElementById('nav2')); await new Promise(r => setTimeout(r, 2000)); const f = document.getElementById('fundamentalPanel'); (f.closest('.mk-ana') || f).click();
  await new Promise(r => setTimeout(r, 900)); const t = f.innerText; return { lignes: f.querySelectorAll('.signal-row-item').length, titre: (t.match(/(\d+ Indicateurs Fondamentaux|Dans le score[^\n]*)/i) || [])[0],
    score: (t.match(/Score pondéré[^\n]*/) || [])[0], poids: (t.match(/poids [−-]?\d+ %/g) || []).length }; };
const hauteurs = ev => ev(async () => { const h = {}; for (const i of [0, 2, 3, 4, 5]) { goPage(i, null, document.getElementById('nav' + i)); await new Promise(r => setTimeout(r, 1300)); h[i] = document.getElementById('page' + i).scrollHeight; } goPage(0, null, document.getElementById('nav0')); return h; });
const capture = async (o, f, clip) => { if (OUT) await o.page.screenshot(Object.assign({ path: path.join(OUT, f) }, clip ? { clip } : {})); };

async function passe(browser, ROOT, PORT, nom) {
  const o = await ouvrir(browser, ROOT, PORT), ev = o.ev, r = { nom };
  r.acc = await ev(ACCUEIL); r.bt0 = await ev(BOUTONS); await capture(o, nom + '-accueil.png');
  await ev(() => goPage(5, null, document.getElementById('nav5'))); await o.page.waitForTimeout(1200); r.bt5 = await ev(BOUTONS); await capture(o, nom + '-fiscal-bas.png', { x: 0, y: 1000, width: 800, height: 280 });
  await ev(() => goPage(0, null, document.getElementById('nav0'))); await o.page.waitForTimeout(800);
  // 🔇 et le bouclier répondent au doigt (vrai appui)
  r.son = await ev(() => { const b = document.getElementById('soundToggle'); return b ? b.className : null; });
  if (r.son !== null) { await o.page.tap('#soundToggle'); await o.page.waitForTimeout(300); r.son2 = await ev(() => document.getElementById('soundToggle').className); await o.page.tap('#soundToggle'); }
  r.gdn = await ev(() => !!document.getElementById('gdnFab'));
  if (r.gdn) { await o.page.tap('#gdnFab'); await o.page.waitForTimeout(500); r.gdnOuvert = await ev(() => !!document.querySelector('#gdnOverlay.open'));
    await ev(() => { const c = document.getElementById('gdnClose'); if (c) c.click(); }); await o.page.waitForTimeout(300); }
  r.mem = await ev(MEMOIRE); r.memPetits = await ev(PETITS, '#memoryOverlay'); await capture(o, nom + '-memoire.png', { x: 0, y: 0, width: 800, height: 700 });
  await ev(() => { const m = document.getElementById('memoryOverlay'); if (m) m.remove(); });
  r.fond = await ev(FOND); r.fondPetits = await ev(PETITS, '#fundamentalPanel'); await capture(o, nom + '-fondamental.png');
  r.h = await hauteurs(ev); r.err = o.perr.slice();
  await o.close();
  // téléphone
  const t = await ouvrir(browser, ROOT, PORT + 1, { width: 390, height: 844 }); r.tel = await t.ev(BOUTONS); r.telErr = t.perr.slice(); await capture(t, nom + '-telephone.png'); await t.close();
  return r;
}

(async () => {
  let browser = await chromium.launch(); const av = await passe(browser, OLD, 8971, 'avant'); await browser.close();
  browser = await chromium.launch(); const ap = await passe(browser, NEW, 8973, 'apres'); await browser.close();
  const a = ap.acc, b = av.acc;
  R('n° 88 · voix (' + a.voix + ' positions) : « 👤 MAN » bandeau ' + b.manBan + ' → ' + a.manBan + ', briques ' + b.manBrq + ' → ' + a.manBrq + ', barres ' + b.manBar + ' → ' + a.manBar + ' ; « 📈 Tendance » ' + a.tendBan + ' / ' + a.tendBrq + ' ; « ' + a.titre + ' »',
    a.voix > 0 && b.manBan === a.voix && a.manBan === 0 && a.manBrq === 0 && a.manBar === 0 && a.tendBan === a.voix && a.tendBrq === a.voix && a.titre.includes(a.voix + ' de la voix tendance'), { av: b, ap: a });
  R('n° 86 · prix : entrées « ' + b.entrees.slice(0, 3).join(' | ') + ' » → « ' + a.entrees.slice(0, 3).join(' | ') + ' » ; carte DOT « ' + b.dot + ' » → « ' + a.dot + ' » ; brique DOT « ' + b.brqDot + ' » → « ' + a.brqDot + ' »',
    a.entrees.length === a.voix && JSON.stringify(a.entrees) === JSON.stringify(a.attendu) && a.entrees.every(e => /^entrée \$\d/.test(e) && !/\./.test(e)) && /^\$0,7\d+/.test(a.dot) && /^\$0,7\d+/.test(a.brqDot) && /^\$0$/.test(b.dot), { av: b.entrees, ap: a.entrees });
  const okB = x => x.n === 2 && !x.sur.length && x.hors.every(v => v === 0) && !x.doigt.length;
  R('n° 89 · 🔇 et bouclier : sur un bouton ' + JSON.stringify(av.bt0.sur) + ' → ' + JSON.stringify(ap.bt0.sur) + ', au-dessus de la barre ' + JSON.stringify(av.bt0.hors) + ' → ' + JSON.stringify(ap.bt0.hors) + ' px ; boutons hors d\'atteinte ' + JSON.stringify(av.bt0.doigt) + ' → ' + JSON.stringify(ap.bt0.doigt) + ' (accueil et Fiscal)',
    okB(ap.bt0) && okB(ap.bt5) && (av.bt0.sur.length || av.bt0.hors.some(v => v > 0)), { av: [av.bt0, av.bt5], ap: [ap.bt0, ap.bt5] });
  R('n° 89 · ils répondent au doigt : 🔇 « ' + ap.son + ' » → « ' + ap.son2 + ' », bouclier ouvre Guardian : ' + ap.gdnOuvert, ap.son !== ap.son2 && ap.gdnOuvert === true, ap);
  R('n° 91 · fiche mémoire (' + (ap.mem && ap.mem.agent) + ', ' + (ap.mem && ap.mem.n) + ' souvenirs) : textes < 11 px ' + av.memPetits + ' → ' + ap.memPetits + ' ; « ' + (ap.mem && ap.mem.haut.slice(2, 4).join(' | ')) + ' » ; ✕ ' + (av.mem && av.mem.ferme) + ' → ' + (ap.mem && ap.mem.ferme),
    ap.mem && av.memPetits > 0 && ap.memPetits === 0 && ap.mem.haut[2].includes('✓ ' + ap.mem.justes + ' votes justes') && /\d\d\/\d\d · \d\d:\d\d/.test(ap.mem.haut[3]) && ap.mem.ferme[0] >= 44 && ap.mem.ferme[1] >= 44, { av: av.mem, ap: ap.mem });
  R('n° 92 · analyse fondamentale : « ' + av.fond.titre + ' » ' + av.fond.lignes + ' lignes → « ' + ap.fond.titre + ' » ' + ap.fond.lignes + ' lignes, ' + ap.fond.poids + ' poids ; « ' + ap.fond.score + ' » ; textes < 11 px ' + ap.fondPetits,
    ap.fond.lignes === 13 && ap.fond.poids === 11 && /11 FACTEURS/i.test(ap.fond.titre) && /11 facteurs/.test(ap.fond.score) && ap.fondPetits === 0, { av: av.fond, ap: ap.fond });
  const dh = [0, 2, 3, 4, 5].filter(i => Math.abs(av.h[i] - ap.h[i]) > 2);
  R('autres écrans à la même hauteur (accueil, Marché, DAO, Chain, Fiscal ; Agents grandit avec l\'école) : ' + JSON.stringify(ap.h) + (dh.length ? ' · écarts ' + JSON.stringify(dh.map(i => [i, av.h[i], ap.h[i]])) : ''),
    !dh.filter(i => i !== 2).length && (!dh.includes(2) || Math.abs(av.h[2] - ap.h[2]) < 600), { av: av.h, ap: ap.h });
  R('téléphone 390 × 844 : débordement ' + ap.tel.deborde + ' px, sur un bouton ' + JSON.stringify(ap.tel.sur) + ', boutons hors d\'atteinte ' + JSON.stringify(ap.tel.doigt), ap.tel.deborde <= 0 && !ap.tel.sur.length && !ap.tel.doigt.length && ap.tel.hors.every(v => v === 0), ap.tel);
  R('0 erreur de page (avant ' + av.err.length + ' + ' + av.telErr.length + ', après ' + ap.err.length + ' + ' + ap.telErr.length + ')', !ap.err.length && !ap.telErr.length, { av: av.err, ap: ap.err.concat(ap.telErr) });
  if (OUT) fs.writeFileSync(path.join(OUT, 'sonde_css_finitions.json'), JSON.stringify({ av, ap, res }, null, 1));
  const ko = res.filter(x => !x.ok).length; console.log('\n' + (ko ? '❌ ' : '✅ ') + (res.length - ko) + '/' + res.length + ' étapes');
  process.exit(ko ? 1 : 0);
})();
