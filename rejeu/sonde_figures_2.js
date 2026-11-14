// rejeu/sonde_figures_2.js — [GO FIGURES 2 · 14/11/2026] vraie page, backup du jour, tablette 800 × 1 280 : la décision lit-elle une figure ? AVANT / APRÈS.
// Usage : node rejeu/sonde_figures_2.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : pour chaque mode (AA, EV, RE) et chaque paire, getTechSignals(paire) sur les bougies du backup → paires où signals.pattern est posé, et sa figure ;
// la même série lue par _detectPatterns (témoin : la figure d'avant parle-t-elle aujourd'hui ?) ; écran « Patterns chartistes » : la note sur la décision ;
// 20 s de vrai battement sans erreur de page.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const A = {}; process.argv.slice(2).forEach((a, i, v) => { if (a.startsWith('--')) A[a.slice(2)] = v[i + 1]; });
if (!A.backup || !A.avant) { console.error('--backup <fichier> et --avant <dossier> requis'); process.exit(2); }
const NEW = path.resolve(A.root || '.'), OLD = path.resolve(A.avant);
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
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  // chaque mode : ses bougies, getTechSignals de l'app. S.pairStates est un ACCESSEUR du portefeuille du mode (02 _WALLET_ACCESSOR_FIELDS) : on ne
  // l'assigne jamais (ce serait écrire dans le portefeuille du mode à l'écran) — on bascule S.tradingMode le temps de la lecture, puis on le remet.
  r.modes = await ev(() => {
    const out = {}, keepMode = S.tradingMode;
    try {
      ['sim', 'paperReal', 'real'].forEach(m => {
        const w = S.walletStore && S.walletStore[m]; if (!w || !w.pairStates) return;
        S.tradingMode = m;
        if (S.pairStates !== w.pairStates) { out[m] = { erreur: 'accesseur : S.pairStates n\'est pas celui du mode ' + m }; return; }
        const o = { paires: 0, avecFigure: [], figureAvantParle: [], par: {} };
        Object.keys(w.pairStates).forEach(p => {
          const ps = w.pairStates[p]; if (!ps || !Array.isArray(ps.candles) || ps.candles.length < 30) return;
          o.paires++;
          const t = getTechSignals(p);
          if (t && t.signals && t.signals.pattern) o.avecFigure.push(p.replace('/USDT', '') + ' ' + t.signals.pattern.label);
          o.par[p] = { n: t ? Object.keys(t.signals || {}).length : -1, fig: !!(t && t.signals && t.signals.pattern), at: t ? t.atScore : null };
          const v = (typeof _detectPatterns === 'function') ? _detectPatterns(_closes(ps.candles)) : null;
          if (v && v.length && v[0].signal !== 'neu') o.figureAvantParle.push(p.replace('/USDT', '') + ' ' + v[0].name);
        });
        out[m] = o;
      });
    } finally { S.tradingMode = keepMode; }
    return out;
  });
  // l'écran « Patterns chartistes » : la note sur la décision
  r.note = await ev(() => { if (!document.getElementById('patternSection')) { const d = document.createElement('div'); d.id = 'patternSection'; document.body.appendChild(d); }
    try { renderPatternSection(); } catch (e) { return 'ERREUR ' + e.message; } const el = document.getElementById('patternSection'); return el ? (el.innerText || '').split('\n').filter(l => /décision du bot/.test(l)).join(' | ') : 'absent'; });
  await page.waitForTimeout(20000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8931, 'avant'), ap = await passe(browser, NEW, 8932, 'après');
  await browser.close();
  console.log('SONDE FIGURES 2 · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  for (const m of ['sim', 'paperReal', 'real']) {
    const a = av.modes[m], b = ap.modes[m]; if (!a || !b) { R(m + ' : mode lu', false, { a: !!a, b: !!b }); continue; }
    console.log(`  ${m} : ${a.paires} paires · figure d'avant qui parle (témoin) ${a.figureAvantParle.length} : ${a.figureAvantParle.join(', ')}`);
    console.log(`     avant : figure dans la décision sur ${a.avecFigure.length} paire(s) : ${a.avecFigure.join(', ') || '—'} · après : ${b.avecFigure.length}`);
    R(m + ' : avant, la décision lisait la figure d\'avant partout où elle parle (témoin)', a.avecFigure.length === a.figureAvantParle.length && a.paires > 0, a);
    R(m + ' : après, aucune figure dans la décision', b.avecFigure.length === 0 && b.paires === a.paires, b);
    const diff = Object.keys(a.par).filter(p => !b.par[p] || b.par[p].n !== a.par[p].n - (a.par[p].fig ? 1 : 0));
    R(m + ' : après, les autres signaux sont tous là (un de moins seulement où la figure parlait)', !diff.length, diff.map(p => [p, a.par[p], b.par[p]]));
    const bouge = Object.keys(a.par).filter(p => a.par[p].fig && b.par[p] && b.par[p].at !== a.par[p].at).length;
    console.log(`     atScore changé sur ${bouge} paire(s) sur ${a.avecFigure.length} où la figure parlait`);
  }
  R('écran : la note dit que la décision ne lit aucune de ces figures', /ne lit aucune de ces figures/.test(ap.note) && /lit encore/.test(av.note), { avant: av.note, apres: ap.note });
  R('page prête et sans erreur (avant et après)', av.pret && ap.pret && !ap.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.mkdirSync(path.join(NEW, 'rejeu/out'), { recursive: true });
  fs.writeFileSync(path.join(NEW, 'rejeu/out/sonde_figures_2.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
