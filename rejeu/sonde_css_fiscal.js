// rejeu/sonde_css_fiscal.js — [GO CSS · écran 6 · 14/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280) : l'écran Fiscal, AVANT / APRÈS.
// Usage : node rejeu/sonde_css_fiscal.js --root . --avant <copie du code d'avant> --backup <backup.json> [--out <dossier>]
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes (APRÈS) : tuiles dans l'ordre, ⚖ Impôt ouvert · tuiles justes (recomptées depuis S) · appui sur chaque tuile = son panneau (🧰 = Export puis Réglages) ·
// textes < 11 px (tout révélé : volets ouverts, « Tout voir ») → 0 · contenu plus court · résultat brut signé et UN seul résultat net (avant : « $21.02 » pour −21,02,
// et −80,20 / −79,85 sur le même écran) · total de 💱 = 💸 · plus de reconstruction sans changement · un champ de ⚙ garde le doigt pendant le battement de 08 ·
// volets fermés à l'ouverture, mémorisés à la relance · autres écrans inchangés · 390 / 1 280 sans débordement · 0 erreur.
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

// textes < 11 px et longueur du contenu de #page5 pour ce qui est montré
const MESURE = () => { const vis = e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const pg = document.getElementById('page5'); let petits = 0; const g = {};
  pg.querySelectorAll('*').forEach(e => { if (!vis(e) || ![...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
    const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11) { petits++; const k = ((typeof e.className === 'string' && e.className) ? '.' + e.className.split(' ')[0] : e.tagName) + ' ' + f + 'px'; g[k] = (g[k] || 0) + 1; } });
  const top = pg.getBoundingClientRect().top - pg.scrollTop; let bas = 0; pg.querySelectorAll('*').forEach(e => { if (vis(e)) bas = Math.max(bas, e.getBoundingClientRect().bottom - top); });
  return { petits, ex: Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 6), contenu: Math.round(bas) }; };
const ONGLETS = ev => ev(() => [...document.querySelectorAll('#page5 [id^="ftab-"]')].map(b => b.id));
const MONTRE = async (o, id, tout) => { await o.ev(i => { document.getElementById(i).click(); document.getElementById('page5').scrollTop = 0; }, id); await o.page.waitForTimeout(900);
  const court = await o.ev(MESURE);
  if (!tout) return court;
  // tout révéler : volets ouverts, « Tout voir » (sans relancer l'écran par un rendu forcé)
  await o.ev(() => { document.querySelectorAll('#page5 details').forEach(d => { d.open = true; });
    const b = [...document.querySelectorAll('#page5 button')].find(x => /Tout voir/.test(x.textContent) && x.getBoundingClientRect().height > 0); if (b) b.click(); });
  await o.page.waitForTimeout(700); const t = await o.ev(MESURE); return Object.assign(court, { petitsTout: t.petits, exTout: t.ex });
};
// écritures dans #page5 sur 5 passages de renderFiscal(onglet) sans rien changer
const REBATIT = t => new Promise(res => { const pg = document.getElementById('page5'); let k = 0; const mo = new MutationObserver(() => {});
  mo.observe(pg, { childList: true, subtree: true }); for (let i = 0; i < 5; i++) { renderFiscal(t); k += mo.takeRecords().length ? 1 : 0; } setTimeout(() => { mo.disconnect(); res(k); }, 50); });

async function ouvrir(browser, ROOT, PORT, vp, ctxIn) {
  const server = await serve(ROOT, PORT);
  const ctx = ctxIn || await browser.newContext({ viewport: vp || { width: 800, height: 1280 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  if (!ctxIn) { await ctx.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT) ? r.continue() : r.abort())); await ctx.addInitScript(init); }
  const page = await ctx.newPage(); const perr = [];
  page.on('pageerror', e => { if (perr.length < 20) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  const charger = async () => {
    await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
    for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) break; await page.waitForTimeout(200); }
    await page.waitForTimeout(7000);
    await page.evaluate(() => { window.showToast = function () {}; goPage(5, null, document.getElementById('nav5')); document.getElementById('page5').scrollTop = 0; }); await page.waitForTimeout(3000);
  };
  await charger();
  const close = async () => { await ctx.close(); server.close(); };
  return { page, perr, close, charger, ev: (fn, a) => page.evaluate(fn, a) };
}
const hauteurs = ev => ev(async () => { const h = {}; for (const i of [0, 1, 2, 3, 4, 5]) { goPage(i, null, document.getElementById('nav' + i)); await new Promise(r => setTimeout(r, 1500)); h[i] = document.getElementById('page' + i).scrollHeight; } goPage(5, null, document.getElementById('nav5')); return h; });
const capture = async (o, f) => { if (!OUT) return; await o.ev(() => { [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && /Connexion perdue/.test(e.textContent) && e.textContent.length < 120).forEach(e => e.style.display = 'none'); });
  await o.page.waitForTimeout(600); await o.page.screenshot({ path: path.join(OUT, f) }); };
const TXT = id => (document.getElementById(id) || {}).innerText || '';

(async () => {
  // ───── AVANT ─────
  let browser = await chromium.launch();
  const av = await ouvrir(browser, OLD, 8981);
  const ongAv = await ONGLETS(av.ev), mAv = {}, rAv = {};
  await capture(av, 'avant-fiscal.png');
  for (const id of ongAv) { mAv[id] = await MONTRE(av, id, true); rAv[id] = await av.ev(REBATIT, id.replace('ftab-', '')); }
  const chiffresAv = await av.ev(() => { document.getElementById('ftab-global').click(); const g = document.getElementById('fpanel-global').innerText;
    document.getElementById('ftab-export').click(); const e = document.getElementById('fpanel-export').innerText; return { g, e }; });
  // champ de ⚙ : le battement de 08 (toutes les 3 s) garde-t-il le doigt ?
  const focusAv = await av.ev(async () => { document.getElementById('ftab-settings').click(); await new Promise(r => setTimeout(r, 400)); const i = document.getElementById('fee_makerRate'); i.focus();
    await new Promise(r => setTimeout(r, 4500)); const a = document.activeElement; return { meme: a === i, actif: a && (a.id || a.tagName) }; });
  const hAv = await hauteurs(av.ev);
  await av.close(); await browser.close();

  // ───── APRÈS ─────
  browser = await chromium.launch();
  const ap = await ouvrir(browser, NEW, 8982); const ev = ap.ev, page = ap.page;
  const z = await ev(() => { const pos = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top : -1; };
    return { tiles: [...document.querySelectorAll('#fiscBref .fz-tile')].map(b => b.id), actif: [...document.querySelectorAll('#page5 .active')].map(e => e.id),
      vis: ['tax', 'global', 'pairs', 'export', 'settings'].filter(t => getComputedStyle(document.getElementById('fpanel-' + t)).display !== 'none'), bref: pos('fiscBref'), tax: pos('fpanel-tax') }; });
  R('tuiles dans l\'ordre (⚖ · 💸 · 💱 · 🧰), l\'écran s\'ouvre sur ⚖ Impôt, seul son panneau est montré', z.tiles.join() === 'ftab-tax,ftab-global,ftab-pairs,ftab-outils' && z.actif.join() === 'ftab-tax'
    && z.vis.join() === 'tax' && z.bref >= 0 && z.bref < z.tax, z);
  const tu = await ev(() => { const f = S.fees, r = _fiscRegimeNow(), t = id => document.getElementById(id).innerText.replace(/\s+/g, ' ').trim();
    return { v: ['tax', 'global', 'pairs', 'outils'].map(k => t('fzV_' + k)), s: ['tax', 'global', 'pairs', 'outils'].map(k => t('fzS_' + k)),
      due: _fiscEur(r.d.due), frais: _fiscUsd(-f.totalGross), np: Object.keys(f.byPair || {}).filter(p => f.byPair[p].trades > 0).length,
      net: _fiscUsd(f.totalPnlGross - f.totalGross - calcTaxProvision(), true), pct: r.pct }; });
  const nz = x => String(x || '').replace(/[\s\u202f\u00a0]/g, '');
  R('tuiles recomptées depuis S : « ' + tu.v.join(' · ') + ' » ; « ' + tu.s[1] + ' »', nz(tu.v[0]) === nz(tu.due) && tu.v[1] === tu.frais && +tu.v[2] === tu.np && tu.v[3] === '5 exports'
    && nz(tu.s[1]).includes(nz(tu.net)) && nz(tu.s[0]).includes(nz(tu.pct)), tu);
  const ongAp = await ONGLETS(ev), mAp = {}, rAp = {};
  for (const id of ongAp) { mAp[id] = await MONTRE(ap, id, true); mAp[id].vis = await ev(() => ['tax', 'global', 'pairs', 'export', 'settings'].filter(t => getComputedStyle(document.getElementById('fpanel-' + t)).display !== 'none').join());
    rAp[id] = await ev(REBATIT, id.replace('ftab-', '')); }
  R('appui sur chaque tuile : son panneau (' + ongAp.map(i => i.replace('ftab-', '') + ' → ' + mAp[i].vis).join(' · ') + ') ; 🧰 = Export puis Réglages',
    mAp['ftab-tax'].vis === 'tax' && mAp['ftab-global'].vis === 'global' && mAp['ftab-pairs'].vis === 'pairs' && mAp['ftab-outils'].vis === 'export,settings'
    && await ev(() => document.getElementById('fpanel-export').compareDocumentPosition(document.getElementById('fpanel-settings')) & Node.DOCUMENT_POSITION_FOLLOWING), Object.fromEntries(ongAp.map(i => [i, mAp[i].vis])));
  const petitsAv = Object.values(mAv).reduce((a, m) => a + m.petitsTout, 0), petitsAp = Object.values(mAp).reduce((a, m) => a + m.petitsTout, 0);
  R('textes < 11 px, tout révélé (volets ouverts, « Tout voir ») : ' + petitsAv + ' avant → ' + petitsAp, petitsAp === 0 && petitsAv > 200, { ap: Object.fromEntries(ongAp.map(i => [i, mAp[i].exTout])) });
  R('contenu : Impôt ' + mAv['ftab-tax'].contenu + ' → ' + mAp['ftab-tax'].contenu + ' px · Frais ' + mAv['ftab-global'].contenu + ' → ' + mAp['ftab-global'].contenu + ' · Paires ' + mAv['ftab-pairs'].contenu + ' → '
    + mAp['ftab-pairs'].contenu + ' · Export ' + mAv['ftab-export'].contenu + ' + ⚙ ' + mAv['ftab-settings'].contenu + ' → Outils ' + mAp['ftab-outils'].contenu,
    mAp['ftab-tax'].contenu < mAv['ftab-tax'].contenu && mAp['ftab-global'].contenu < mAv['ftab-global'].contenu && mAp['ftab-pairs'].contenu < mAv['ftab-pairs'].contenu * 0.4
    && mAp['ftab-outils'].contenu < mAv['ftab-export'].contenu + mAv['ftab-settings'].contenu, { mAv, mAp });
  const ch = await ev(() => { document.getElementById('ftab-global').click(); const g = document.getElementById('fpanel-global').innerText;
    const k = [...document.querySelectorAll('#fiscalSummary .fz-k > b')].map(x => x.textContent.trim()); document.getElementById('ftab-pairs').click();
    const p = [...document.querySelectorAll('#fpanel-pairs .fz-ptot > span')].map(x => x.textContent).join(' '); document.getElementById('ftab-outils').click(); const o = document.getElementById('fpanel-export').innerText; return { g, p, o, k }; });
  const brutAv = (chiffresAv.g.match(/P&L Brut\s*\n\s*(\S+)/i) || [])[1], netsAv = [(chiffresAv.g.match(/P&L Net\s*\n\s*(\S+)/i) || [])[1], (chiffresAv.e.match(/P&L Net\s*\n\s*(\S+)/i) || [])[1]];
  const [brutAp, fraisAp, , netAp] = ch.k;   // les 4 chiffres de 💸 Frais : brut, frais, impôt, net
  R('résultat brut signé (« ' + brutAv + ' » → « ' + brutAp + ' ») ; un seul résultat net (avant : ' + netsAv.join(' et ') + ' ; après : ' + netAp + ', Export n\'en montre plus)',
    /^−\$/.test(brutAp || '') && !/^[−-]/.test(brutAv || '') && netsAv[0] !== netsAv[1] && !/P&L Net|Résultat net/i.test(ch.o), { brutAv, netsAv, brutAp, netAp });
  const tot = ch.p;
  R('total de 💱 Paires = 💸 Frais (« ' + tot.replace(/\s+/g, ' ') + ' » ; frais ' + fraisAp + ', net ' + netAp + ')', fraisAp && tot.includes(fraisAp) && tot.trim().endsWith(netAp), { tot, fraisAp, netAp });
  // AA (backup : GBP/USDT retirée de PAIRS garde ses frais) : le total de 💱 doit aussi donner 💸 (relecture du 14/11 : avant correction −$1 132,64 contre −$1 144,12)
  const aa = await ev(async () => { const m0 = S.tradingMode; S.tradingMode = 'sim'; _fzKeys.global = _fzKeys.pairs = '';
    renderFiscalGlobal(); renderFiscalPairs(); const k = [...document.querySelectorAll('#fiscalSummary .fz-k > b')].map(x => x.textContent.trim());
    const tot = [...document.querySelectorAll('#fpanel-pairs .fz-ptot > span')].map(x => x.textContent.trim()), rows = [...document.querySelectorAll('#fpanel-pairs .fz-pt > span:first-child')].map(x => x.textContent.trim());
    S.tradingMode = m0; _fzKeys.global = _fzKeys.pairs = ''; renderFiscal(); return { k, tot, rows }; });
  R('AA : total de 💱 Paires = 💸 Frais (frais ' + aa.k[1] + ', net ' + aa.k[3] + ' ; total « ' + aa.tot.join(' ') + ' »), paire retirée gardée (' + (aa.rows.find(r => /retirée/.test(r)) || 'aucune') + ')',
    aa.tot[aa.tot.length - 1] === aa.k[3] && aa.rows.some(r => /retirée/.test(r)), aa);
  R('reconstructions sur 5 passages sans changement : avant ' + ongAv.map(i => i.replace('ftab-', '') + ' ' + rAv[i]).join(' · ') + ' → après ' + ongAp.map(i => i.replace('ftab-', '') + ' ' + rAp[i]).join(' · '),
    rAv['ftab-global'] === 5 && rAv['ftab-pairs'] === 5 && rAv['ftab-settings'] === 5 && rAp['ftab-global'] === 0 && rAp['ftab-pairs'] === 0 && rAp['ftab-outils'] === 0 && rAp['ftab-tax'] <= 1, { rAv, rAp });
  const focusAp = await ev(async () => { document.getElementById('ftab-outils').click(); await new Promise(r => setTimeout(r, 400)); const i = document.getElementById('fee_makerRate'); i.focus();
    await new Promise(r => setTimeout(r, 4500)); const a = document.activeElement; const out = { meme: a === i, actif: a && (a.id || a.tagName) }; i.blur(); return out; });
  R('un champ de ⚙ pendant le battement de 08 (4,5 s) : avant ' + (focusAv.meme ? 'gardé' : 'perdu') + ', après ' + (focusAp.meme ? 'gardé' : 'perdu'), !focusAv.meme && focusAp.meme, { focusAv, focusAp });
  const hAp = await hauteurs(ev);
  const autres = [0, 1, 2, 3, 4].filter(i => Math.abs(hAp[i] - hAv[i]) > Math.max(20, hAv[i] * 0.01));
  R('autres écrans inchangés (hauteurs ' + [0, 1, 2, 3, 4].map(i => hAv[i] + '→' + hAp[i]).join(' · ') + ')', autres.length === 0, { autres, hAv, hAp });
  await ev(() => { document.getElementById('ftab-tax').click(); document.getElementById('page5').scrollTop = 0; }); await page.waitForTimeout(1200);
  await capture(ap, 'apres-fiscal.png');
  const vue = await ev(() => { const v = innerHeight - document.getElementById('nav').offsetHeight, b = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().bottom) : 9e9; };
    return { v, hero: b('#taxPanel .fz-hero'), bot: [...document.querySelectorAll('#taxPanel .fx-ins')].filter(r => r.getBoundingClientRect().bottom < v).length }; });
  R('1er écran sans défiler : les tuiles, impôt dû / dépôt / régime et ' + vue.bot + ' lignes du bot fiscal', vue.hero < vue.v && vue.bot >= 5, vue);
  // volets en dernier : la relance de la page repart d'un état vide sur ce banc local (artefact noté le 13/11), les clés d'affichage restent
  // volets : fermés à l'ouverture, mémorisés à la relance
  const v0 = await ev(async () => { document.getElementById('ftab-tax').click(); localStorage.removeItem('aura_fiscal_volets'); _fiscUi.open = {}; _fiscUi.sig = ''; renderFiscal('tax');
    await new Promise(r => setTimeout(r, 300)); const d = [...document.querySelectorAll('#taxPanel details')]; const ferme = d.every(x => !x.open);
    const loi = d.find(x => x.dataset.fold === 'loi'); loi.open = true; await new Promise(r => setTimeout(r, 300)); return { n: d.length, ferme, ls: localStorage.getItem('aura_fiscal_volets') }; });
  await ap.charger();
  const v1 = await ev(async () => { document.getElementById('ftab-tax').click(); await new Promise(r => setTimeout(r, 600)); return [...document.querySelectorAll('#taxPanel details')].map(x => x.dataset.fold + (x.open ? ':ouvert' : '')); });
  R('volets (dépôt, années, la loi) fermés à l\'ouverture ; « la loi » ouverte reste ouverte après la relance (' + v1.join(' ') + ')', v0.n === 3 && v0.ferme && /"loi":true/.test(v0.ls || '') && v1.includes('loi:ouvert') && v1.filter(x => /ouvert/.test(x)).length === 1, { v0, v1 });
  R('aucune erreur de page (après : ' + ap.perr.length + ', avant : ' + av.perr.length + ')', ap.perr.length === 0, ap.perr);
  await ap.close(); await browser.close();

  // ───── formats ─────
  for (const [vp, nom] of [[{ width: 390, height: 844 }, 'téléphone 390 × 844'], [{ width: 1280, height: 800 }, 'paysage 1 280 × 800']]) {
    browser = await chromium.launch();
    const o = await ouvrir(browser, NEW, 8983, vp);
    const d = await o.ev(async () => { const w = document.documentElement.clientWidth, pg = document.getElementById('page5'), out = {};
      for (const t of ['tax', 'global', 'pairs', 'outils']) { document.getElementById('ftab-' + t).click(); await new Promise(r => setTimeout(r, 500));
        document.querySelectorAll('#page5 details').forEach(x => { x.open = true; });
        out[t] = [...pg.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1; }).map(e => e.id || e.className).slice(0, 6); }
      return { w, out, cols: getComputedStyle(document.getElementById('fiscBref')).gridTemplateColumns.split(' ').length }; });
    R(nom + ' : rien ne déborde (' + Object.entries(d.out).map(([k, v]) => k + ' ' + v.length).join(' · ') + '), ' + d.cols + ' colonnes de tuiles', Object.values(d.out).every(v => !v.length) && d.cols === (vp.width < 520 ? 2 : 4), d);
    await o.close(); await browser.close();
  }
  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌ ' : '✅ ') + (res.length - ko) + '/' + res.length + ' étapes');
  if (OUT) fs.writeFileSync(path.join(OUT, 'sonde_css_fiscal.json'), JSON.stringify({ res, mAv, mAp }, null, 1));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
