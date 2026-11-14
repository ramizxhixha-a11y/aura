// rejeu/sonde_css_dao.js — [GO CSS · écran 4 · 14/11/2026] vraie page, backup du jour, taille tablette (800 × 1 280) : l'écran DAO, AVANT / APRÈS.
// Usage : node rejeu/sonde_css_dao.js --root . --avant <copie du code d'avant> --backup <backup.json> [--out <dossier>]
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes (APRÈS) : zones dans l'ordre (En bref · Propositions · Classement) · deux groupes (bots = rôle 'execution', puis analystes), triés, rang sur tous ·
// En bref juste · analyste lu par sa spécialité, son nom dessous · série seulement si elle existe (avant : « 0 gains d'affilée ») · rien de perdu ·
// textes < 11 px (propositions simulées comprises) → 0 · défilement plus court · autres écrans inchangés · 1er écran = En bref + bots ·
// propositions : zone cachée sans proposition, montrée avec, la proposition de paire UNE fois (avant : deux) · plus de reconstruction à chaque
// renderDAO quand il n'y a rien (avant : à chaque passage) · patch sans changement = mêmes nœuds ; l'ordre change = rebâti · 390 / 1 280 sans débordement · 0 erreur.
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

// ids visibles et textes < 11 px de #page3 (zone Propositions révélée si elle existe)
const MESURE = async () => {
  const vis = e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  const pg = document.getElementById('page3'), z = document.getElementById('daoPropZone'), had = z && z.classList.contains('on');
  if (z) z.classList.add('on'); await new Promise(r => setTimeout(r, 300));
  const ids = new Set(); let petits = 0; const g = {};
  pg.querySelectorAll('[id]').forEach(e => { if (vis(e)) ids.add(e.id); });
  pg.querySelectorAll('*').forEach(e => { if (!vis(e) || ![...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
    const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11) { petits++; const k = ((typeof e.className === 'string' && e.className) ? '.' + e.className.split(' ')[0] : e.tagName) + ' ' + f + 'px'; g[k] = (g[k] || 0) + 1; } });
  if (z && !had) z.classList.remove('on');
  return { ids: [...ids], petits, ex: Object.entries(g).sort((a, b) => b[1] - a[1]) };
};
// des propositions simulées (bac à sable) : une ordinaire, une de paire (comme 07 proposeDynamicPair)
const SIMULE = () => { window.__prop0 = S.proposals.slice(); const c = S.pairCandidates[0] || { sym: 'ZZZ', name: 'Test', emoji: '🌐', corr: 'LOW', rationale: 'test' };
  S.proposals.push({ id: 901, desc: 'Proposition simulée par la sonde', forVotes: 300, againstVotes: 100, status: 'active', userVoted: false });
  S.proposals.unshift({ id: 902, desc: 'Ajouter ' + c.sym + '/USDT au portefeuille actif', forVotes: 2000, againstVotes: 500, status: 'active', userVoted: false, isPairProposal: true, pairSym: c.sym, pairCfg: c, rationale: c.rationale, autoPassAt: S.cycle + 30 });
  renderDAO(); return c.sym; };
const RETIRE = () => { S.proposals = window.__prop0; renderDAO(); };

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
  await page.evaluate(() => { window.showToast = function () {}; goPage(3, null, document.getElementById('nav3')); document.getElementById('page3').scrollTop = 0; }); await page.waitForTimeout(4000);
  const close = async () => { await ctx.close(); server.close(); };
  return { page, perr, close, ev: (fn, a) => page.evaluate(fn, a) };
}
const hauteurs = ev => ev(async () => { const h = {}; for (const i of [0, 1, 2, 4, 5, 3]) { goPage(i, null, document.getElementById('nav' + i)); await new Promise(r => setTimeout(r, 1500)); h[i] = document.getElementById('page' + i).scrollHeight; } return h; });
const capture = async (o, f) => { if (!OUT) return; await o.ev(() => { [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && /Connexion perdue/.test(e.textContent) && e.textContent.length < 120).forEach(e => e.style.display = 'none'); });
  await o.page.waitForTimeout(600); await o.page.screenshot({ path: path.join(OUT, f) }); };
// combien de fois renderDAO rebâtit tout quand rien ne change (5 passages)
const REBATIT = () => { const f = window.buildGovCards; let n = 0; window.buildGovCards = function () { n++; return f.apply(this, arguments); };
  for (let i = 0; i < 5; i++) renderDAO(); window.buildGovCards = f; return n; };
const PAIRE = sym => [...document.querySelectorAll('#page3 .gov-card, #page3 .pair-proposal-card')].filter(e => e.textContent.includes(sym + '/USDT')).length;

(async () => {
  // ───── AVANT ─────
  let browser = await chromium.launch();
  const av = await ouvrir(browser, OLD, 8987);
  const mAv = await av.ev(MESURE); const rAv = await av.ev(REBATIT);
  const zero = await av.ev(() => [...document.querySelectorAll('#mobileWallets span')].filter(e => /^🔥 0 gains/.test(e.textContent.trim())).length);
  const symAv = await av.ev(SIMULE); await av.page.waitForTimeout(400); const pAv = await av.ev(PAIRE, symAv); const mAvP = await av.ev(MESURE); await av.ev(RETIRE);
  const hAv = await hauteurs(av.ev);
  await av.ev(() => { goPage(3, null, document.getElementById('nav3')); document.getElementById('page3').scrollTop = 0; }); await av.page.waitForTimeout(1500); await capture(av, 'avant-dao.png');
  console.log('AVANT : ' + mAv.ids.length + ' id visibles · ' + mAv.petits + ' textes < 11 px (' + mAvP.petits + ' avec propositions) · défilement ' + hAv[3] + ' px · « 🔥 0 gains » ' + zero +
    ' · proposition de paire montrée ' + pAv + ' fois · renderDAO rebâtit ' + rAv + '/5 · erreurs ' + av.perr.length);
  await av.close(); await browser.close();

  // ───── APRÈS ─────
  browser = await chromium.launch();
  const ap = await ouvrir(browser, NEW, 8988); const ev = ap.ev, page = ap.page;
  R('départ · page prête, mode à l\'écran ' + await ev(() => S.tradingMode), await ev(() => S.tradingMode === 'paperReal'));
  const ordre = await ev(() => { const pg = document.getElementById('page3'), y = e => e ? Math.round(e.getBoundingClientRect().top - pg.getBoundingClientRect().top + pg.scrollTop) : -1;
    const zh = [...pg.querySelectorAll(':scope > .dao-zone-h')];
    return { y: [y(document.getElementById('daoBref')), y(zh[0]), y(document.getElementById('mobileWallets'))], prop: getComputedStyle(document.getElementById('daoPropZone')).display,
      t: zh.map(e => e.textContent.replace(/\s+/g, ' ').trim()), vieux: pg.querySelectorAll(':scope > .sec-header').length }; });
  R('zones dans l\'ordre : En bref · Classement T$ (' + ordre.y.join(' < ') + ') ; zone Propositions cachée sans proposition (' + ordre.prop + ') ; plus d\'en-têtes décoratifs',
    ordre.y.every((v, i) => v >= 0 && (!i || v > ordre.y[i - 1])) && ordre.prop === 'none' && ordre.vieux === 0 && /Classement T\$/.test(ordre.t[0]), ordre);

  const g = await ev(() => { const bot = a => (a.role || 'fundamental') === 'execution';
    const sorted = [...S.agents].sort((a, b) => b.fitness - a.fitness), rank = new Map(sorted.map((a, i) => [a.id, i + 1]));
    const grp = [...document.querySelectorAll('#mobileWallets .dao-grp')].map(gr => [...gr.querySelectorAll('.dao-row')].map(r => r.id.slice(5)));
    const ag = id => S.agents.find(a => a.id === id);
    const rkOk = grp.flat().every(id => { const t = document.querySelector('#wrow_' + CSS.escape(id) + ' .dao-rk').textContent.trim(), r = rank.get(id); return r <= 3 ? t === ['🥇', '🥈', '🥉'][r - 1] : t === String(r); });
    const trie = arr => arr.every((id, i) => !i || ag(arr[i - 1]).fitness >= ag(id).fitness);
    const lib = grp.flat().every(id => { const a = ag(id), nm = document.querySelector('#wrow_' + CSS.escape(id) + ' .dao-nm').textContent, wn = document.getElementById('wn_' + id).textContent;
      return wn === a.name && (bot(a) ? nm === a.name : nm === (a.type || a.name)); });
    // deux colonnes réellement remplies (tablette) : deux abscisses de lignes par groupe, la 1re moitié à gauche
    const cols = [...document.querySelectorAll('#mobileWallets .dao-grp')].map(gr => new Set([...gr.querySelectorAll('.dao-row')].map(r => Math.round(r.getBoundingClientRect().left))).size);
    return { cols, n: S.agents.length, g0: grp[0] && grp[0].length, g1: grp[1] && grp[1].length, bots: S.agents.filter(bot).length,
      g0bots: (grp[0] || []).every(id => bot(ag(id))), g1ana: (grp[1] || []).every(id => !bot(ag(id))), trie: grp.every(trie), rkOk, lib,
      titres: [...document.querySelectorAll('#mobileWallets .dao-grp-h')].map(e => e.textContent.replace(/\s+/g, ' ').trim()) }; });
  R('classement : ' + g.g0 + ' bots (rôle execution) puis ' + g.g1 + ' analystes = ' + g.n + ' agents, chaque groupe trié au T$ sur ' + g.cols.join(' et ') + ' colonnes, rang sur tous (' + g.titres.join(' / ') + ')',
    g.g0 === g.bots && g.g0 + g.g1 === g.n && g.g0bots && g.g1ana && g.trie && g.rkOk && g.cols.every(c => c === 2), g);
  R('libellés : un bot par son nom, un analyste par sa spécialité (a.type), son nom dessous (wn_ = nom, comme patchGovCards)', g.lib, g);

  const b = await ev(() => { const bot = a => (a.role || 'fundamental') === 'execution', T = a => Math.floor(Number(a.fitness) || 0);
    const sorted = [...S.agents].sort((a, b) => b.fitness - a.fitness), rank = new Map(sorted.map((a, i) => [a.id, i + 1]));
    const bots = sorted.filter(bot), ana = sorted.filter(a => !bot(a)), r1 = rank.get(bots[0].id), dev = ana.filter(a => rank.get(a.id) < r1).length;
    const t = id => document.getElementById(id).textContent;
    const att = { daoBrefBots: String(bots.length), daoBrefBotsBest: '1er : ' + bots[0].name, daoBrefBotsSub: T(bots[0]) + ' T$ · rang ' + r1 + ' sur ' + sorted.length,
      daoBrefAna: String(ana.length), daoBrefAnaBest: '1er : ' + (ana[0].type || ana[0].name), daoBrefAnaSub: T(ana[0]) + ' T$ · ' + dev + ' devant le 1er bot',
      daoBrefProp: String(S.proposals.filter(p => p.status === 'active').length), daoClsSub: 'marché interne · rang sur ' + sorted.length };
    const faux = Object.keys(att).filter(k => t(k) !== att[k]).map(k => k + ' : « ' + t(k) + ' » ≠ « ' + att[k] + ' »');
    return { faux, vu: Object.keys(att).map(k => t(k)).join(' | ') }; });
  R('En bref recalculé juste (' + b.vu + ')', b.faux.length === 0, b);

  const s = await ev(() => { const txt = [...document.querySelectorAll('#mobileWallets .dao-stk')].map(e => e.textContent.trim());
    const att = S.agents.filter(a => Math.trunc(Number(a.streak) || 0) !== 0).length;
    return { n: txt.length, att, zero: txt.filter(t => /\b0 (gain|perte)/.test(t)).length, accord: txt.filter(t => /\b1 (gains|pertes)\b/.test(t)).length, ex: txt.slice(0, 6) }; });
  R('série seulement si elle existe : « 🔥 0 gains d\'affilée » ' + zero + ' avant → 0 ; ' + s.n + ' séries pour ' + s.att + ' agents qui en ont une, « 1 gain » au singulier', s.zero === 0 && s.n === s.att && s.accord === 0 && zero > 10, s);

  const mAp = await ev(MESURE);
  const perdus = mAv.ids.filter(i => !mAp.ids.includes(i) && i !== 'mobileGovList');
  R('rien de perdu : ' + mAv.ids.length + ' id visibles avant, tous visibles après (' + mAp.ids.length + ') — sauf mobileGovList vide (la tuile « Propositions » dit « aucune active »)', perdus.length === 0, perdus.slice(0, 30));

  // propositions simulées : zone, une seule carte par proposition de paire, plancher 11 px
  const sym = await ev(SIMULE); await page.waitForTimeout(400);
  const pr = await ev(s0 => ({ zone: getComputedStyle(document.getElementById('daoPropZone')).display, gov: document.querySelectorAll('#mobileGovList .gov-card').length,
    paire: [...document.querySelectorAll('#page3 .gov-card, #page3 .pair-proposal-card')].filter(e => e.textContent.includes(s0 + '/USDT')).length,
    dans: !!document.querySelector('#daoPropZone #daoNewPairCard'), tuile: document.getElementById('daoBrefProp').textContent, sous: document.getElementById('daoBrefPropBest').textContent,
    y: [document.getElementById('daoBref'), document.getElementById('daoPropZone'), document.getElementById('mobileWallets')].map(e => Math.round(e.getBoundingClientRect().top)) }), sym);
  const mApP = await ev(MESURE);
  await ev(() => { document.getElementById('page3').scrollTop = 0; }); await capture(ap, 'apres-dao-propositions-simulees.png');
  R('propositions (simulées) : zone montrée sous En bref (' + pr.y.join(' < ') + '), 1 carte ordinaire, la proposition de paire ' + pAv + ' fois avant → ' + pr.paire + ', tuile ' + pr.tuile + ' « ' + pr.sous + ' »',
    pr.zone !== 'none' && pr.gov === 1 && pr.paire === 1 && pAv === 2 && pr.dans && pr.tuile === '2' && pr.sous === '2 en vote' && pr.y[0] < pr.y[1] && pr.y[1] < pr.y[2], pr);
  await ev(RETIRE); await page.waitForTimeout(300);
  const pr2 = await ev(() => ({ zone: getComputedStyle(document.getElementById('daoPropZone')).display, carte: !!document.getElementById('daoNewPairCard'), gov: document.querySelectorAll('#mobileGovList > *').length, tuile: document.getElementById('daoBrefPropBest').textContent }));
  R('propositions retirées : zone cachée, plus de carte, tuile « aucune active »', pr2.zone === 'none' && !pr2.carte && pr2.gov === 0 && pr2.tuile === 'aucune active', pr2);

  R('textes < 11 px : ' + mAv.petits + ' avant → ' + mAp.petits + ' ; propositions simulées montrées : ' + mAvP.petits + ' → ' + mApP.petits, mAp.petits === 0 && mApP.petits === 0 && mAv.petits > 50, { ap: mAp.ex, apP: mApP.ex });

  const rAp = await ev(REBATIT);
  R('rien à montrer : renderDAO rebâtissait tout à chaque passage (' + rAv + '/5) → ' + rAp + '/5', rAv === 5 && rAp === 0, { rAv, rAp });
  const stable = await ev(() => { const n0 = document.getElementById('wrow_' + S.agents[0].id); for (let i = 0; i < 5; i++) patchGovCards();
    return n0 === document.getElementById('wrow_' + S.agents[0].id); });
  const re = await ev(() => { const bot = a => (a.role || 'fundamental') === 'execution'; const b = [...S.agents].filter(bot).sort((x, y) => x.fitness - y.fitness)[0], f0 = b.fitness;
    b.fitness = Math.max(...S.agents.map(a => a.fitness)) + 50; patchGovCards();
    const out = { rk: document.querySelector('#wrow_' + CSS.escape(b.id) + ' .dao-rk').textContent.trim(), first: document.querySelector('#mobileWallets .dao-row').id, id: 'wrow_' + b.id,
      sub: document.getElementById('daoBrefBotsSub').textContent, wv: document.getElementById('wv_' + b.id).textContent };
    b.fitness = f0; patchGovCards(); out.back = document.querySelector('#wrow_' + CSS.escape(b.id) + ' .dao-rk').textContent.trim(); return out; });
  R('patch sans changement : mêmes lignes (écran stable) ; un bot qui passe 1er : rebâti au patch suivant (🥇, 1re ligne, En bref « ' + re.sub + ' »), puis remis', stable && re.rk === '🥇' && re.first === re.id && /rang 1 sur/.test(re.sub) && re.back !== '🥇', { stable, re });

  const hAp = await hauteurs(ev);
  R('défilement de l\'écran DAO : ' + hAv[3] + ' → ' + hAp[3] + ' px', hAp[3] < hAv[3] * 0.7, { hAv, hAp });
  const autres = [0, 1, 2, 4, 5].filter(i => Math.abs(hAp[i] - hAv[i]) > Math.max(20, hAv[i] * 0.01));
  R('autres écrans inchangés (hauteurs ' + [0, 1, 2, 4, 5].map(i => hAv[i] + '→' + hAp[i]).join(' · ') + ')', autres.length === 0, { autres, hAv, hAp });

  await ev(() => { goPage(3, null, document.getElementById('nav3')); document.getElementById('page3').scrollTop = 0; }); await page.waitForTimeout(1500);
  await capture(ap, 'apres-dao.png');
  const z = await ev(() => { const vue = innerHeight - document.getElementById('nav').offsetHeight, gr = document.querySelector('#mobileWallets .dao-grp');
    return { bref: Math.round(document.getElementById('daoBref').getBoundingClientRect().bottom), bots: Math.round(gr.getBoundingClientRect().bottom), vue }; });
  R('1er écran sans défiler : En bref et tout le groupe des bots', z.bref < z.vue && z.bots < z.vue, z);
  R('aucune erreur de page (après : ' + ap.perr.length + ', avant : ' + av.perr.length + ')', ap.perr.length === 0, ap.perr);
  await ap.close(); await browser.close();

  // ───── formats ─────
  for (const [vp, nom] of [[{ width: 390, height: 844 }, 'téléphone 390 × 844'], [{ width: 1280, height: 800 }, 'paysage 1 280 × 800']]) {
    browser = await chromium.launch();
    const o = await ouvrir(browser, NEW, 8989, vp);
    const d = await o.ev(() => { const w = document.documentElement.clientWidth; const pg = document.getElementById('page3');
      const sortent = [...pg.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1; }).map(e => e.id || e.className).slice(0, 8);
      return { w, sortent, cols: getComputedStyle(document.querySelector('#mobileWallets .dao-rows')).gridTemplateColumns.split(' ').length }; });
    R(nom + ' : rien ne déborde, ' + d.cols + ' colonne(s)', d.sortent.length === 0 && (vp.width < 520 ? d.cols === 1 : d.cols === 2), d);
    if (OUT && vp.width < 520) { await capture(o, 'apres-dao-390.png'); }
    await o.close(); await browser.close();
  }

  const ko = res.filter(r => !r.ok).length;
  console.log('\n' + (ko ? '❌' : '✅') + ' sonde_css_dao : ' + (res.length - ko) + '/' + res.length);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
