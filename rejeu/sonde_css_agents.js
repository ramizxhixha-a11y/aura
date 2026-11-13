// rejeu/sonde_css_agents.js — [GO CSS · écran 2 · 14/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280) : l'écran Agents, AVANT / APRÈS.
// Usage : node rejeu/sonde_css_agents.js --root . --avant <copie du code d'avant> --backup <backup.json> [--out <dossier>]
//   (un seul navigateur, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes (APRÈS) : une carte par agent (avant : éclaireurs et conseil sans carte) · groupes dans l'ordre (bots d'abord) · rien de perdu (chaque id
// visible avant l'est après, tout révélé) · textes < 11 px TOUT révélé (cartes ouvertes, matrice, onglets Apprentissage et Évolution) → 0 ·
// défilement plus court · autres écrans inchangés · En bref juste (recalculé ici depuis S) · familles : nombres justes, filtre au doigt (titres compris) ·
// appui sur une carte : ouverte sur toute la largeur, courbe visible, 2e appui referme, le bandeau mémoire garde son appui · stable : rien ne se
// reconstruit au battement, une reconstruction garde cartes ouvertes et filtre · matrice : volet fermé par défaut, cases nommées, mémorisé à la relance ·
// onglets collants · 390 × 844 et 1 280 × 800 sans débordement · 0 erreur.
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

// mesure commune aux deux versions : TOUT révélé — chaque carte ouverte (classe ag-open : sans effet sur l'ancien code, où tout est déjà montré),
// matrice ouverte (volet s'il existe), puis les onglets Apprentissage et Évolution ; ids visibles et textes < 11 px
const MESURE = async () => {
  const vis = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const pg = document.getElementById('page1'); const ids = new Set(); let petits = 0; const g = {};
  const scan = (root, ou) => { if (!root) return; root.querySelectorAll('[id]').forEach(e => { if (vis(e)) ids.add(e.id); });
    root.querySelectorAll('*').forEach(e => { if (!vis(e) || ![...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
      const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11) { petits++; const k = ou + ' · ' + ((typeof e.className === 'string' && e.className) ? '.' + e.className.split(' ')[0] : e.tagName) + ' ' + f + 'px'; g[k] = (g[k] || 0) + 1; } }); };
  const cartes = [...document.querySelectorAll('#mobileAgentList .agent-card')]; cartes.forEach(c => c.classList.add('ag-open'));
  const fold = document.querySelector('#page1 .ag-fold'); if (fold) fold.classList.add('open');
  scan(pg, 'agents');
  for (const t of ['learn', 'evo']) { switchAgentTab(t, document.getElementById('tab-' + t)); await new Promise(r => setTimeout(r, 1200)); scan(document.getElementById('agentPanel-' + t), t); }
  switchAgentTab('agents', document.getElementById('tab-agents'));
  cartes.forEach(c => c.classList.remove('ag-open')); if (fold) fold.classList.remove('open');
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
    await page.evaluate(() => { window.showToast = function () {}; goPage(1, null, document.getElementById('nav1')); document.getElementById('page1').scrollTop = 0; }); await page.waitForTimeout(3000);
  };
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pret();
  const close = async () => { await ctx.close(); server.close(); };
  return { page, perr, pret, close, ev: (fn, a) => page.evaluate(fn, a) };
}
const hauteurs = ev => ev(async () => { const h = {}; for (const i of [0, 2, 3, 4, 5, 1]) { goPage(i, null, document.getElementById('nav' + i)); await new Promise(r => setTimeout(r, 1500)); h[i] = document.getElementById('page' + i).scrollHeight; } return h; });
// le toast « Connexion perdue » (réseau coupé du banc) n'est pas de l'écran : caché pour les captures
const capture = async (o, f) => { if (!OUT) return; await o.ev(() => { [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && /Connexion perdue/.test(e.textContent) && e.textContent.length < 120).forEach(e => e.style.display = 'none'); });
  await o.page.waitForTimeout(600); await o.page.screenshot({ path: path.join(OUT, f) }); };

(async () => {
  const browser = await chromium.launch();
  // ───── AVANT ─────
  const av = await ouvrir(browser, OLD, 8975);
  const cAv = await av.ev(() => ({ cartes: document.querySelectorAll('#mobileAgentList .agent-card').length, agents: S.agents.length }));
  const mAv = await av.ev(MESURE); const hAv = await hauteurs(av.ev);
  await av.ev(() => { document.getElementById('page1').scrollTop = 0; }); await capture(av, 'avant-agents.png');
  console.log('AVANT : ' + cAv.cartes + ' cartes / ' + cAv.agents + ' agents · ' + mAv.ids.length + ' id visibles · ' + mAv.petits + ' textes < 11 px · défilement ' + hAv[1] + ' px · erreurs ' + av.perr.length);
  await av.close();

  // ───── APRÈS ─────
  const ap = await ouvrir(browser, NEW, 8976); const ev = ap.ev, page = ap.page;
  R('départ · page prête, mode à l\'écran ' + await ev(() => S.tradingMode), await ev(() => S.tradingMode === 'paperReal'));
  const c = await ev(() => { const roles = {}; S.agents.forEach(a => { const r = a.role || 'fundamental'; roles[r] = (roles[r] || 0) + 1; });
    const ids = [...document.querySelectorAll('#mobileAgentList .agent-card')].map(e => e.id.replace('agcard_', ''));
    return { n: ids.length, agents: S.agents.length, manque: S.agents.filter(a => !ids.includes(a.id)).map(a => a.id), roles }; });
  R('une carte par agent : ' + cAv.cartes + ' avant → ' + c.n + ' / ' + c.agents + ' (éclaireurs ' + (c.roles.scout || 0) + ', conseil ' + (c.roles.council || 0) + ')', c.n === c.agents && !c.manque.length && cAv.cartes < cAv.agents, c);
  const ordre = await ev(() => [...document.querySelectorAll('#mobileAgentList .ag-grp-h')].map(h => h.dataset.grp));
  const attendu = ['execution', 'meta', 'council', 'scout', 'fundamental', 'technical', 'context', 'sentiment'];
  R('groupes dans l\'ordre : ' + ordre.join(' · '), JSON.stringify(ordre) === JSON.stringify(attendu), ordre);
  const grp = await ev(() => { const out = []; let cur = null; document.querySelectorAll('#mobileAgentList > *').forEach(e => { if (e.classList.contains('ag-grp-h')) cur = e.dataset.grp; else if (e.classList.contains('agent-card')) out.push([cur, e.dataset.agentRole]); }); return out.filter(x => x[0] !== x[1]); });
  R('chaque carte sous le titre de sa famille', grp.length === 0, grp);

  const mAp = await ev(MESURE); const hAp = await hauteurs(ev);
  const perdus = mAv.ids.filter(i => !mAp.ids.includes(i));
  R('rien de perdu : ' + mAv.ids.length + ' id visibles avant (tout révélé), tous visibles après (' + mAp.ids.length + ')', perdus.length === 0, perdus.slice(0, 30));
  R('textes < 11 px, tout révélé (cartes ouvertes, matrice, Apprentissage, Évolution) : ' + mAv.petits + ' avant → ' + mAp.petits, mAp.petits === 0 && mAv.petits > 100, mAp.ex.slice(0, 40));
  R('défilement de l\'écran Agents (cartes et volet fermés) : ' + hAv[1] + ' → ' + hAp[1] + ' px', hAp[1] < hAv[1] * 0.8, { hAv, hAp });
  const autres = [0, 2, 3, 4, 5].filter(i => Math.abs(hAp[i] - hAv[i]) > Math.max(20, hAv[i] * 0.01));
  R('autres écrans inchangés (hauteurs ' + [0, 2, 3, 4, 5].map(i => hAv[i] + '→' + hAp[i]).join(' · ') + ')', autres.length === 0, { autres, hAv, hAp });

  await ev(() => { goPage(1, null, document.getElementById('nav1')); document.getElementById('page1').scrollTop = 0; }); await page.waitForTimeout(1500);
  await capture(ap, 'apres-agents.png');
  // En bref : recalculé ici, indépendamment de 09i
  const bref = await ev(() => { const fit = a => Math.round(Number(a.fitness) || 0), b = S.agents.filter(a => a.role === 'execution'), n = S.agents.filter(a => a.role !== 'execution');
    const top = arr => arr.slice().sort((x, y) => fit(y) - fit(x))[0];
    const att = [String(b.length), '1er : ' + top(b).name, fit(top(b)) + ' T$ · moy. ' + Math.round(b.reduce((s, a) => s + fit(a), 0) / b.length),
      String(n.length), '1er : ' + top(n).name, fit(top(n)) + ' T$ · moy. ' + Math.round(n.reduce((s, a) => s + fit(a), 0) / n.length)];
    const vu = ['agBrefBots', 'agBrefBotsBest', 'agBrefBotsSub', 'agBrefAna', 'agBrefAnaBest', 'agBrefAnaSub'].map(i => document.getElementById(i).textContent);
    return { att, vu, pool: document.getElementById('memPoolCount').textContent, vrai: String(S.globalMemoryPool.length) }; });
  R('En bref : ' + bref.vu.join(' | ') + ' · mémoire ' + bref.pool, JSON.stringify(bref.att) === JSON.stringify(bref.vu) && bref.pool === bref.vrai, bref);
  const z = await ev(() => { const r = id => Math.round(document.getElementById(id).getBoundingClientRect().bottom), vue = innerHeight - document.getElementById('nav').offsetHeight;
    const premiere = document.querySelector('#mobileAgentList .agent-card'); return { bref: r('agBref'), carte1: Math.round(premiere.getBoundingClientRect().top), role1: premiere.dataset.agentRole, vue }; });
  R('1er écran sans défiler : En bref, familles et le début des bots', z.bref < z.vue && z.carte1 < z.vue && z.role1 === 'execution', z);

  // familles : nombres, puis filtre au doigt
  const fam = await ev(() => { const n = {}; S.agents.forEach(a => { const r = a.role || 'fundamental'; n[r] = (n[r] || 0) + 1; });
    return [...document.querySelectorAll('#agentFilterRow .agent-filter-btn')].map(b => [b.dataset.role, b.querySelector('i').textContent, getComputedStyle(b).display !== 'none', b.dataset.role === 'all' ? S.agents.length : (n[b.dataset.role] || 0)]); });
  R('familles : chaque bouton porte son nombre, famille vide cachée (' + fam.filter(f => f[2]).map(f => f[0] + ' ' + f[1]).join(', ') + ')', fam.every(f => f[1] === String(f[3]) && f[2] === (f[3] > 0)), fam);
  await page.locator('#agentFilterRow [data-role="execution"]').click(); await page.waitForTimeout(500);
  const fb = await ev(() => ({ cartes: [...document.querySelectorAll('#mobileAgentList .agent-card')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.dataset.agentRole),
    titres: [...document.querySelectorAll('#mobileAgentList .ag-grp-h')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.dataset.grp) }));
  R('filtre « Bots » au doigt : ' + fb.cartes.length + ' cartes, titres ' + fb.titres.join(','), fb.cartes.length === 9 && fb.cartes.every(r => r === 'execution') && JSON.stringify(fb.titres) === '["execution"]', fb);
  await capture(ap, 'apres-filtre-bots.png');
  // reconstruction de la liste (une évolution) pendant le filtre : filtre gardé, titres compris
  const reb = await ev(() => { _agCardsSig = ''; buildAgentCards(); patchAgentCards();
    return { cartes: [...document.querySelectorAll('#mobileAgentList .agent-card')].filter(e => getComputedStyle(e).display !== 'none').length,
      titres: [...document.querySelectorAll('#mobileAgentList .ag-grp-h')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.dataset.grp) }; });
  R('reconstruction pendant le filtre : 9 cartes et le seul titre des bots restent', reb.cartes === 9 && JSON.stringify(reb.titres) === '["execution"]', reb);
  await page.locator('#agentFilterRow [data-role="all"]').click(); await page.waitForTimeout(500);
  const tous = await ev(() => [...document.querySelectorAll('#mobileAgentList > *')].filter(e => getComputedStyle(e).display !== 'none').length);
  R('« Tous » : les 31 cartes et 8 titres reviennent (' + tous + ')', tous === 31 + 8, tous);

  // appui sur une carte
  await ev(() => { const c = document.getElementById('agcard_arb_bot_v1'), pg = document.getElementById('page1'); pg.scrollTop = c.offsetTop - 200; }); await page.waitForTimeout(400);
  const ferme = await ev(() => { const c = document.getElementById('agcard_arb_bot_v1'), s = document.getElementById('aspk_arb_bot_v1'); return { w: Math.round(c.getBoundingClientRect().width), courbe: getComputedStyle(s).display, mem: getComputedStyle(document.getElementById('amstrip_arb_bot_v1')).display }; });
  await page.locator('#agcard_arb_bot_v1 .agent-name').click(); await page.waitForTimeout(600);
  const ouv = await ev(() => { const c = document.getElementById('agcard_arb_bot_v1'), s = document.getElementById('aspk_arb_bot_v1'), l = document.getElementById('mobileAgentList');
    return { open: c.classList.contains('ag-open'), w: Math.round(c.getBoundingClientRect().width), lw: Math.round(l.clientWidth), courbe: getComputedStyle(s).display, mem: getComputedStyle(document.getElementById('amstrip_arb_bot_v1')).display }; });
  R('appui sur Bot Arbitrage : carte compacte (' + ferme.w + ' px, courbe ' + ferme.courbe + ') → ouverte sur toute la largeur (' + ouv.w + ' px), courbe et mémoire visibles', ferme.courbe === 'none' && ferme.mem === 'none' && ouv.open && ouv.w > ferme.w * 1.8 && ouv.courbe !== 'none' && ouv.mem !== 'none', { ferme, ouv });
  await capture(ap, 'apres-carte-ouverte.png');
  await page.waitForTimeout(6500);   // un battement de renderAgents (toutes les 5 s) passe
  const stable = await ev(() => { const c = document.getElementById('agcard_arb_bot_v1'); return { open: c.classList.contains('ag-open'), meme: c === window.__agNode }; });
  await ev(() => { window.__agNode = document.getElementById('agcard_arb_bot_v1'); }); await page.waitForTimeout(6500);
  const stable2 = await ev(() => ({ open: document.getElementById('agcard_arb_bot_v1').classList.contains('ag-open'), meme: document.getElementById('agcard_arb_bot_v1') === window.__agNode, bref: document.getElementById('agBrefBots').textContent }));
  R('stable : au battement rien n\'est reconstruit, la carte reste ouverte', stable.open && stable2.open && stable2.meme, { stable, stable2 });
  const reb2 = await ev(() => { _agCardsSig = ''; buildAgentCards(); patchAgentCards(); const c = document.getElementById('agcard_arb_bot_v1'); return { neuf: c !== window.__agNode, open: c.classList.contains('ag-open') }; });
  R('reconstruction (évolution) : la carte ouverte le reste', reb2.neuf && reb2.open, reb2);
  // bandeau mémoire : un analyste qui a des épisodes (un bot n'en a pas : 03 showMemoryOverlay montre alors un toast) — carte ouverte au doigt,
  // appui sur son bandeau → la fiche mémoire de 03 s'ouvre et la carte reste ouverte
  const am = await ev(() => { const a = S.agents.find(x => x.role !== 'execution' && x.memory && x.memory.length); const c = document.getElementById('agcard_' + a.id), pg = document.getElementById('page1'); pg.scrollTop = c.offsetTop - 200; return a.id; });
  await page.waitForTimeout(400); await page.locator('#agcard_' + am + ' .agent-name').click(); await page.waitForTimeout(500);
  await page.locator('#amstrip_' + am).click(); await page.waitForTimeout(800);
  const mem = await ev(id => { const o = document.getElementById('memoryOverlay'); return { open: document.getElementById('agcard_' + id).classList.contains('ag-open'), overlay: !!(o && getComputedStyle(o).display !== 'none' && o.getBoundingClientRect().height > 200) }; }, am);
  R('appui sur le bandeau mémoire de ' + am + ' : la fiche mémoire s\'ouvre, la carte reste ouverte', mem.open && mem.overlay, mem);
  await ev(() => { const o = document.getElementById('memoryOverlay'); if (o) o.remove(); }); await page.locator('#agcard_' + am + ' .agent-name').click(); await page.waitForTimeout(300);
  await page.locator('#agcard_arb_bot_v1 .agent-name').click(); await page.waitForTimeout(400);
  R('2e appui : la carte se referme', !(await ev(() => document.getElementById('agcard_arb_bot_v1').classList.contains('ag-open'))));

  // matrice : volet fermé par défaut, cases nommées, mémorisé à la relance
  const m0 = await ev(() => ({ open: document.querySelector('#page1 .ag-fold').classList.contains('open'), h: Math.round(document.getElementById('agentHeatmapGrid').getBoundingClientRect().height) }));
  await ev(() => { const pg = document.getElementById('page1'); pg.scrollTop = pg.scrollHeight; }); await page.waitForTimeout(400);
  await page.locator('#page1 .ag-fold-h').click(); await page.waitForTimeout(800);
  const m1 = await ev(() => { const an = S.agents.filter(a => !a.isBot); const cells = [...document.querySelectorAll('#agentHeatmapGrid .heatmap-cell')];
    return { open: document.querySelector('#page1 .ag-fold').classList.contains('open'), n: cells.length, an: an.length, noms: cells.filter(c => { const a = S.agents.find(x => 'hc_' + x.id === c.id); return a && c.querySelector('.hc-lbl') && c.querySelector('.hc-lbl').textContent === (a.type || a.name); }).length,
      h: Math.round(document.getElementById('agentHeatmapGrid').getBoundingClientRect().height), mem: localStorage.getItem('aura_agents_volets'), sous: document.getElementById('agMatriceSub').textContent }; });
  R('matrice : fermée par défaut (' + m0.h + ' px), ouverte au doigt : ' + m1.n + ' cases sur ' + m1.an + ', toutes nommées (' + m1.noms + '), ' + m1.h + ' px · ' + m1.sous, !m0.open && m0.h === 0 && m1.open && m1.n === m1.an && m1.noms === m1.n && m1.h > 0 && m1.h < 400 && m1.mem === '{"matrice":1}', { m0, m1 });
  await ev(() => { const pg = document.getElementById('page1'); pg.scrollTop = pg.scrollHeight; }); await capture(ap, 'apres-matrice.png');
  await page.reload({ waitUntil: 'domcontentloaded' }); await ap.pret();
  const m2 = await ev(() => document.querySelector('#page1 .ag-fold').classList.contains('open'));
  R('volet de la matrice mémorisé à la relance', m2, m2);
  await ev(() => _agFold('matrice')); await page.waitForTimeout(300);

  // onglets collants
  const coll = await ev(async () => { const pg = document.getElementById('page1'); pg.scrollTop = 2000; await new Promise(r => setTimeout(r, 400));
    const t = document.querySelector('#page1 .agent-tabs').getBoundingClientRect().top, p = pg.getBoundingClientRect().top; pg.scrollTop = 0; return { t: Math.round(t), p: Math.round(p) }; });
  R('onglets collants : après 2 000 px de défilement ils restent en haut de l\'écran (' + coll.t + ' / ' + coll.p + ' px)', Math.abs(coll.t - coll.p) <= 2, coll);
  const tab = await ev(async () => { switchAgentTab('evo', document.getElementById('tab-evo')); await new Promise(r => setTimeout(r, 800)); const e = document.getElementById('agentPanel-evo').getBoundingClientRect().height;
    switchAgentTab('agents', document.getElementById('tab-agents')); return Math.round(e); });
  R('onglet Évolution toujours servi (' + tab + ' px)', tab > 200, tab);

  for (const [w, h] of [[390, 844], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(1500);
    const lar = await ev(() => { const pg = document.getElementById('page1'); const cs = [...document.querySelectorAll('#mobileAgentList .agent-card')]; cs.forEach(c => c.classList.add('ag-open')); document.querySelector('#page1 .ag-fold').classList.add('open');
      const r = { scroll: pg.scrollWidth, client: pg.clientWidth }; cs.forEach(c => c.classList.remove('ag-open')); document.querySelector('#page1 .ag-fold').classList.remove('open'); return r; });
    R(w + ' × ' + h + ' : rien ne sort de l\'écran en largeur (' + lar.scroll + ' / ' + lar.client + ' px)', lar.scroll <= lar.client + 1, lar);
    await ev(() => { document.getElementById('page1').scrollTop = 0; }); await capture(ap, 'apres-' + w + '.png');
  }
  await page.setViewportSize({ width: 800, height: 1280 }); await page.waitForTimeout(800);
  R('aucune erreur de page (avant ' + av.perr.length + ', après ' + ap.perr.length + ')', ap.perr.length === 0, ap.perr);
  await ap.close(); await browser.close();
  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌ ' + ko + ' étape(s) en échec sur ' + res.length : '✅ ' + res.length + '/' + res.length + ' étapes'));
  if (OUT) fs.writeFileSync(path.join(OUT, 'sonde_css_agents.json'), JSON.stringify({ res, avant: { cartes: cAv.cartes, petits: mAv.petits, hauteurs: hAv, ids: mAv.ids.length }, apres: { petits: mAp.petits, hauteurs: hAp, ids: mAp.ids.length } }, null, 1));
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
