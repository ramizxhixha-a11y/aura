// rejeu/sonde_affichage_3.js — [GO AFFICHAGE 3 · 15/11/2026] vraie page, backup du pont (EV à l'écran, MANU, 11 positions de la voix), tablette 800 × 1 280 :
// les restes d'affichage n° 86b, 86c, 88b, 67b, 68b, 77b, 93 — AVANT / APRÈS (n° 64 : aucune sortie par paliers dans les historiques réels — banc-affichage-3 R1).
// Usage : node rejeu/sonde_affichage_3.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes, avec les VRAIES fonctions de la page (les mêmes gestes dans les deux passes) :
//   1. ✕ sur la position de la voix DOT/USDT (07 manuClose, ton geste) → historique de l'onglet ⚖ Impôt (16b, vrai rendu) : la puce de la ligne DOT (n° 88b)
//   2. « ✓ Appliquer » 20 $ LONG sur DOT/USDT (02 applyBotSuggestion → openPosition) : la ligne « Position LONG DOT/USDT | $20 @… » du journal (n° 86b)
//   3. « Pourquoi » de cette position (09g openWhyModal, vrai #whyBody) : le prix d'entrée (n° 86c)
//   4. une alerte de prix sur DOT/USDT à +10 % (06 _prNote, le texte de la liste et de Telegram) (n° 86c)
//   5. badges (05 checkBadges sur l'historique EV du backup ; oracle : la plus longue suite de fermetures gagnantes, calculée ICI depuis le backup) (n° 67b)
//   6. Marché › volet Agents : la matrice de corrélation (08 renderCorrMatrix) — chaque texte écrit sur le canvas, en pixels du canvas (n° 93) ; capture
//   7. intérêts du levier : la sonde pose UN emprunt de 500 $ au taux 0,04 %/cycle (sans emprunt réel — EV à l'index ×0 — l'écart ne se voit pas), un passage du
//      VRAI 02 applyLeverageBorrowFees, puis la tuile « Funding payé (info) » du détail du total (07 _toggleHeroBk) (n° 77b)
//   8. sauvegarde auto « dans l'app Android » (window.Capacitor posé, sans plugin d'écriture : l'écriture native échoue comme sur une tablette qui la refuse) :
//      lien blob ? sauvegarde notée ? échec dit ? (n° 68b)
//   9. 20 s de vrai battement sans erreur de page
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
if (!A.backup || !A.avant) { console.error('--backup <fichier> et --avant <dossier> requis'); process.exit(2); }
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
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 900))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
// oracle des badges, depuis le backup : la plus longue suite de fermetures gagnantes de l'EV (toutes les paires, dans l'ordre du temps)
const ORACLE = (() => { const all = []; Object.values((st.walletStore.paperReal || {}).pairStates || {}).forEach(ps => (ps.trades || []).forEach(t => {
  if (t && ['position', 'urgence', 'tendance'].includes(t.type) && isFinite(+t.pnlUsdt) && +t.ts > 0) all.push(t); }));
  all.sort((a, b) => a.ts - b.ts); let best = 0, n = 0; all.forEach(t => { if (+t.pnlUsdt > 0) { n++; best = Math.max(best, n); } else n = 0; }); return { n: all.length, run: best }; })();
const init = `(() => { try { if (!sessionStorage.getItem('__c')) { localStorage.clear(); localStorage.setItem('nexus_state_v2', ${JSON.stringify(JSON.stringify(st))});
  localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}'); localStorage.setItem('aura_current_trade_mode', 'paperReal');
  ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1')); sessionStorage.setItem('__c', '1'); } } catch (e) {} })();`;
const PRET = async (page) => { for (let i = 0; i < 900; i++) { if (await page.evaluate(() => !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length && S.walletStore)).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };

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
  await ev(() => { window.__toasts = []; const t = window.showToast; window.showToast = function (m, d, l) { try { window.__toasts.push([String(m), l || 'info']); } catch (e) {} return t.apply(this, arguments); }; });
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  r.depart = await ev(() => ({ mode: S.tradingMode, auto: S.botAutoMode, voix: S.openPositions.filter(p => p._voix === 'tendance').length, dot: S.pairStates['DOT/USDT'].price,
    dotVoix: !!S.openPositions.find(p => p.pair === 'DOT/USDT' && p._voix === 'tendance') }));
  // 1. ✕ sur la voix DOT/USDT → historique fiscal
  await ev(() => { manuClose('DOT/USDT'); });
  await page.waitForTimeout(400);
  r.fiscal = await ev(() => { const el = document.getElementById('taxPanel'); try { _fiscUi.sig = ''; _fiscUi.all = true; } catch (e) {} _fiscRenderPage(el);
    const rows = el.innerHTML.split('<div class="fz-tr">').slice(1).filter(x => /<b>DOT\/USDT<\/b>/.test(x));
    const L = _fiscLedger('paperReal', false), h = L && L.hist && L.hist[0];
    return { ferme: !S.openPositions.find(p => p.pair === 'DOT/USDT'), puce: rows.length ? (rows[0].match(/<span class="fx-chip">([^<]*)<\/span>/) || [])[1] : null, ligne: h ? { p: h.p, a: h.a, v: h.v, r: h.r } : null,
      raison: h ? _fiscWhy(h) : null }; });
  // 2. « ✓ Appliquer » 20 $ LONG DOT/USDT → journal
  await ev(() => { S.chainLog.length = 0; window.__toasts = []; applyBotSuggestion('DOT/USDT', 'long', 20); });
  await page.waitForTimeout(400);
  r.journal = await ev(() => ({ lignes: S.chainLog.map(l => l.desc).filter(d => /^Position LONG DOT\/USDT/.test(d)), pos: (S.openPositions.find(p => p.pair === 'DOT/USDT') || {}).entryPrice || null }));
  // 3. « Pourquoi » de cette position
  r.pourquoi = await ev(() => { const p = S.openPositions.find(x => x.pair === 'DOT/USDT'); if (!p) return null; openWhyModal(p.id);
    const b = document.getElementById('whyBody'); const vals = b ? [...b.querySelectorAll('.why-metric-val')].map(e => e.textContent.trim()) : [];
    try { closeWhyModal(); } catch (e) {} return { vals }; });
  // 4. alerte de prix DOT +10 %
  r.alerte = await ev(() => { const v = Math.round(S.pairStates['DOT/USDT'].price * 1.1 * 1e4) / 1e4; return { valeur: v, texte: _prNote({ id: 1, pair: 'DOT/USDT', type: 'above', value: v }) }; });
  // 5. badges
  r.badges = await ev(() => { S.unlockedBadges = []; const sh = window._showBadgeToast; try { checkBadges(); } catch (e) { return { err: String(e) }; } return { debloques: S.unlockedBadges.slice() }; });
  // 6. matrice de corrélation (Marché › Agents)
  await ev(() => { goPage(2); });
  await page.waitForTimeout(1200);
  r.matrice = await ev(() => { const cv = document.getElementById('corrMatrixCanvas'); if (!cv) return null; const f = cv.closest('.mk-fold'); if (f) f.classList.add('open');
    const log = [], o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { if (this.canvas === cv) { const m = this.getTransform(); log.push({ t: String(t), x: m.a * x + m.e, y: m.d * y + m.f }); } return o.apply(this, arguments); };
    try { _corrLastTick = -1000; renderCorrMatrix(); } finally { CanvasRenderingContext2D.prototype.fillText = o; }
    return { w: cv.width, h: cv.height, cssW: cv.offsetWidth, cssH: cv.offsetHeight, textes: log, dehors: log.filter(e => e.x < 0 || e.x > cv.width || e.y < 0 || e.y > cv.height).map(e => e.t) }; });
  try { const cv = await page.$('#corrMatrixCanvas'); if (cv) { await cv.scrollIntoViewIfNeeded(); await cv.screenshot({ path: path.join(OUT, 'sonde_affichage_3_' + nom + '_matrice.png') }); } } catch (e) { r.capture = String(e).slice(0, 120); }
  // 7. intérêts du levier → tuile « Funding payé (info) »
  await ev(() => { goPage(0); });
  await page.waitForTimeout(800);
  r.funding = await ev(() => { const f0 = S.fees.totalFunding, l0 = S.leverageTotalFees || 0, b0 = S.leverageBorrowed, r0 = S.leverageBorrowRate;
    S.leverageBorrowed = 500; S.leverageBorrowRate = 0.0004; applyLeverageBorrowFees(); S.leverageBorrowed = b0; S.leverageBorrowRate = r0;
    const g = document.getElementById('heroBkTotal'); g.style.display = 'none'; _toggleHeroBk('total');
    const tiles = [...g.children].map(e => e.textContent.replace(/\s+/g, ' ').trim()), t = tiles.find(x => /Funding payé \(info\)/.test(x));
    return { totalFundingAvant: f0, totalFunding: S.fees.totalFunding, interets: (S.leverageTotalFees || 0) - l0, tuile: t || null }; });
  // 8. sauvegarde auto dans l'app Android, écriture native refusée
  r.sauvegarde = await ev(async () => { let blobs = 0; const cu = URL.createObjectURL; URL.createObjectURL = function () { blobs++; return cu.apply(this, arguments); };
    window.__toasts = []; const n0 = S.chainLog.length; window.Capacitor = { Plugins: {} };
    localStorage.setItem('aura_autodl_meta', JSON.stringify({ enabled: true, everyMin: 180, last: 0 }));
    try { window.autoDownload.tick(); await new Promise(r => setTimeout(r, 1500)); } finally { delete window.Capacitor; URL.createObjectURL = cu; }
    const m = JSON.parse(localStorage.getItem('aura_autodl_meta') || '{}');
    return { blobs, last: m.last || 0, fail: m.fail || 0, pourquoi: m.failWhy || null, toasts: window.__toasts.filter(t => /auvegarde/.test(t[0])), journal: S.chainLog.slice(n0).map(l => l.desc).filter(d => /auvegarde/.test(d)) }; });
  await page.waitForTimeout(20000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8961, 'avant'), ap = await passe(browser, NEW, 8962, 'apres');
  await browser.close();
  console.log('SONDE AFFICHAGE 3 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  console.log('  départ (EV) : ' + JSON.stringify(ap.depart) + ' · oracle des badges (backup, EV) : ' + JSON.stringify(ORACLE));
  R('témoin réel : EV à l\'écran, MANU, 11 positions de la voix dont DOT/USDT — les deux versions',
    av.depart.mode === 'paperReal' && ap.depart.mode === 'paperReal' && ap.depart.auto === false && ap.depart.voix === 11 && av.depart.voix === 11 && ap.depart.dotVoix, [av.depart, ap.depart]);
  R('n° 88b · ✕ sur la voix DOT : historique ⚖ Impôt — avant « 👤 MAN », après « 📈 Tendance », raison « voix tendance longue », ligne marquée v:1',
    av.fiscal.ferme && ap.fiscal.ferme && av.fiscal.puce === '👤 MAN' && ap.fiscal.puce === '📈 Tendance' && ap.fiscal.ligne && ap.fiscal.ligne.v === 1 && /voix tendance longue/.test(ap.fiscal.raison || ''),
    { avant: av.fiscal, apres: ap.fiscal });
  const px = String(ap.journal.pos || '');
  R('n° 86b · journal « Position LONG DOT/USDT | $20 @… » : avant « @$0 » (entier tronqué), après le prix de l\'écran « @$0,7… »',
    av.journal.lignes.some(d => / @\$0$/.test(d)) && ap.journal.lignes.some(d => / @\$0,7\d+$/.test(d)), { avant: av.journal, apres: ap.journal });
  R('n° 86c · « Pourquoi » : prix d\'entrée — avant « 0.7x » à l\'anglaise sans $, après « $0,7… »',
    av.pourquoi && ap.pourquoi && av.pourquoi.vals.some(v => /^0\.7\d$/.test(v)) && ap.pourquoi.vals.some(v => /^\$0,7\d+$/.test(v)), { avant: av.pourquoi, apres: ap.pourquoi });
  R('n° 86c · alerte de prix DOT +10 % : avant « DOT/USDT ≥ 0.79 » (2 décimales), après « DOT/USDT ≥ $0,79… » (prix de l\'écran)',
    /^DOT\/USDT ≥ 0\.\d\d$/.test(av.alerte.texte) && /^DOT\/USDT ≥ \$0,\d{3,}$/.test(ap.alerte.texte), { avant: av.alerte, apres: ap.alerte });
  const att = ['win_streak_3', 'win_streak_5', 'win_streak_10'].filter((b, i) => ORACLE.run >= [3, 5, 10][i]);
  R('n° 67b · badges de série sur l\'historique EV (plus longue suite gagnante : ' + ORACLE.run + ') : avant aucun, après ' + (att.join(', ') || 'aucun') + ' — rien d\'autre ne change',
    av.badges.debloques && ap.badges.debloques && !av.badges.debloques.some(b => /^win_streak/.test(b)) && JSON.stringify(ap.badges.debloques.filter(b => /^win_streak/.test(b)).sort()) === JSON.stringify(att.sort())
      && JSON.stringify(av.badges.debloques.filter(b => !/^win_streak/.test(b)).sort()) === JSON.stringify(ap.badges.debloques.filter(b => !/^win_streak/.test(b)).sort()), { avant: av.badges, apres: ap.badges });
  R('n° 93 · matrice de corrélation : avant du texte hors du canvas et 🧬 sur la diagonale ; après tout DANS le canvas, lignes « 1 <spécialité> »…, diagonale 1…8, titre',
    av.matrice && ap.matrice && av.matrice.dehors.length > 0 && av.matrice.textes.some(e => e.t === '🧬') && ap.matrice.dehors.length === 0 && !ap.matrice.textes.some(e => e.t === '🧬')
      && ap.matrice.textes.filter(e => /^\d \S/.test(e.t)).length === 8 && [1, 2, 3, 4, 5, 6, 7, 8].every(i => ap.matrice.textes.some(e => e.t === String(i))) && ap.matrice.textes.some(e => e.t === 'ACCORD INTER-AGENTS'),
    { avant: av.matrice && { dehors: av.matrice.dehors, n: av.matrice.textes.length, taille: [av.matrice.w, av.matrice.h] }, apres: ap.matrice && { dehors: ap.matrice.dehors, lignes: ap.matrice.textes.filter(e => /^\d \S/.test(e.t)).map(e => e.t), taille: [ap.matrice.w, ap.matrice.h] } });
  const num = s => { const m = String(s || '').match(/\$([\d\s\u202f,]+)/); return m ? parseFloat(m[1].replace(/[\s\u202f]/g, '').replace(',', '.')) : NaN; };   // montant fr-FR (fmt$2)
  R('n° 77b · un passage d\'intérêts du levier (0,20 $) : la tuile « Funding payé (info) » — avant funding + intérêts comptés deux fois, après = le compteur funding (intérêts compris une fois)',
    Math.abs(ap.funding.interets - 0.2) < 1e-9 && Math.abs(num(ap.funding.tuile) - ap.funding.totalFunding) < 0.006 && Math.abs(num(av.funding.tuile) - (av.funding.totalFunding + av.funding.interets)) < 0.006,
    { avant: av.funding, apres: ap.funding });
  R('n° 68b · sauvegarde auto dans l\'app Android, écriture refusée : avant lien blob et sauvegarde notée sans fichier ; après aucun lien, rien de noté, échec noté et dit (message + journal)',
    av.sauvegarde.blobs > 0 && av.sauvegarde.last > 0 && ap.sauvegarde.blobs === 0 && ap.sauvegarde.last === 0 && ap.sauvegarde.fail > 0 && /Plugin Filesystem indisponible/.test(ap.sauvegarde.pourquoi || '')
      && ap.sauvegarde.toasts.some(t => /^❌ Sauvegarde auto non écrite/.test(t[0]) && t[1] === 'warn') && ap.sauvegarde.journal.length === 1, { avant: av.sauvegarde, apres: ap.sauvegarde });
  R('page prête et sans erreur (avant et après), 20 s de battement', av.pret && ap.pret && !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.writeFileSync(path.join(OUT, 'sonde_affichage_3.json'), JSON.stringify({ avant: av, apres: ap, oracle: ORACLE, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
