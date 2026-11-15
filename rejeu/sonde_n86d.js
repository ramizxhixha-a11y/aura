// rejeu/sonde_n86d.js — [GO N° 86D · 15/11/2026] vraie page, backup du pont (MANU), tablette 800 × 1 280 : la fiche ✏️ de modification (08 openPosEdit / setTpSl /
// applyPosEdit) et le panneau de la paire (03, masqué dans l'app) AVANT / APRÈS. Les boutons « +1 % », « −1 % »… et « ✓ Appliquer » de la fiche sont CLIQUÉS.
// Usage : node rejeu/sonde_n86d.js --root . --avant <copie du code d'avant> --backup <backup.json>
//   (un seul navigateur à la fois, les deux versions l'une après l'autre — CLAUDE.md règle 8 ; rien n'est écrit sur la tablette : page locale, réseau coupé)
// Étapes : (1) AA (prix de l'école, frais : la sortie TP / SL de 07 learnFromOpenPositions y tourne ; 3 000 $ posés par la sonde) : PEPE LONG 50 $ à la main,
// fiche ✏️, « +1 % » (TP) et « −1 % » (SL) cliqués → champs ; « ✓ Appliquer » → pos.tp / pos.sl ; 10 s de vrai battement → avant : TP = SL = 0.000004, fermée
// au passage suivant par le TP ou le SL ; après : TP au-dessus, toujours ouverte. (2) RE (aucun ordre réel, page locale) : DOT SHORT 100 $ à la main (dans l'EV, DOT porte la voix), « +2 % » / « −5 % » → champs et niveaux posés (avant : 0.72 / 0.77).
// (3) EV : EUR LONG 100 $ (seule paire de l'EV sans la voix), « +1 % » / « −1 % » (avant : 1.11 / 1.09). (4) panneau de la paire (03, #pairPosButtons masqué) : vide dans la page.
// (5) 20 s de vrai battement sans erreur de page.
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
const res = []; const R = (nom, ok, det) => { res.push({ nom, ok: !!ok, det }); console.log((ok ? '  OK ' : '  !! ') + nom + (ok ? '' : '  → ' + JSON.stringify(det).slice(0, 1400))); };
const BK = JSON.parse(fs.readFileSync(A.backup, 'utf8')); const st = typeof BK.aura === 'string' ? JSON.parse(BK.aura) : BK.aura;
st.botAutoMode = false;   // MANU, comme la tablette au 15/11 : seul Rams ouvre
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
  await ev(() => {
    window.__toasts = []; const t = window.showToast; window.showToast = function (m) { try { window.__toasts.push(String(m)); } catch (e) {} return t.apply(this, arguments); };
    window.__fermes = []; const k0 = window.closePosition; window.closePosition = function (id, auto, o) { try { const p = S.openPositions.find(x => x.id === id);
      window.__fermes.push({ id, pair: p && p.pair, tp: p && p.tp, sl: p && p.sl, prix: p && S.pairStates[p.pair] && S.pairStates[p.pair].price, sortie: o && o.sortie ? o.sortie.k : null, mode: S.tradingMode }); } catch (e) {}
      return k0.apply(this, arguments); };
    window.__mode = (m) => { if (typeof cycleTradeMode === 'function') { for (let i = 0; i < 3 && S.tradingMode !== m; i++) cycleTradeMode(); } return S.tradingMode; };
    window.__ouvrir = (pair, side, stake) => { const ps = S.pairStates[pair], s0 = ps.stake, l0 = ps.pairLeverage; ps.stake = stake; ps.pairLeverage = 1;
      try { const p = openPosition(pair, side); return p ? p.id : null; } finally { ps.stake = s0; ps.pairLeverage = l0; } };
    window.__clics = []; const st0 = window.setTpSl; window.setTpSl = function (id, type, pct) { try { const p = S.openPositions.find(x => x.id === (_editModal && _editModal.posId)); window.__clics.push({ type, pct, prix: p ? S.pairStates[p.pair].price : null }); } catch (e) {} return st0.apply(this, arguments); };
    window.__pos = (id) => { const p = S.openPositions.find(x => x.id === id); return p ? { tp: p.tp, sl: p.sl, side: p.side, prix: S.pairStates[p.pair].price } : null; };
  });
  // la fiche ✏️ : ouverte par openPosEdit (comme le bouton ✏️ de la ligne), les boutons de la fiche CLIQUÉS
  const fiche = async (id, tp, sl, cliche) => {
    await ev((i) => openPosEdit(i), id); await page.waitForTimeout(300);
    const o = {};
    o.visible = await page.isVisible('#posEditModal.show');
    await page.click(`#posEditModal button[onclick="setTpSl(null,'tp',${tp})"]`); await page.click(`#posEditModal button[onclick="setTpSl(null,'sl',${sl})"]`);
    o.champs = await ev(() => [document.getElementById('peTpInput').value, document.getElementById('peSlInput').value]);
    o.clics = await ev(() => window.__clics.splice(0));
    if (cliche) await page.screenshot({ path: cliche, clip: await page.locator('#posEditModal .modal-sheet, #posEditModal > div').first().boundingBox().catch(() => null) || undefined }).catch(() => {});
    await page.click('#posEditModal button[onclick="applyPosEdit()"]'); await page.waitForTimeout(200);
    o.pos = await ev((i) => window.__pos(i), id);
    o.toast = await ev(() => window.__toasts.slice(-1)[0] || null);
    return o;
  };
  r.doc = await ev(() => { const x = document.querySelector('script[src*="?v="]'); return x ? (x.getAttribute('src').match(/\?v=(\w+)/) || [])[1] : null; });
  r.depart = await ev(() => ({ mode: S.tradingMode, auto: S.botAutoMode, voix: S.openPositions.filter(p => p._voix === 'tendance').length }));
  // (1) AA : PEPE LONG 50 $, TP +1 %, SL −1 %
  r.aa = await ev(() => { const m = window.__mode('sim'); S.tradingAccount = 3000; return m; });
  r.pepeId = await ev(() => window.__ouvrir('PEPE/USDT', 'long', 50));
  r.pepe = r.pepeId ? await fiche(r.pepeId, 1, 1) : null;
  await ev(() => { window.__fermes = []; }); await page.waitForTimeout(10000);
  r.pepeApres = await ev((i) => ({ ouverte: !!S.openPositions.find(x => x.id === i), prix: S.pairStates['PEPE/USDT'].price, fermes: window.__fermes.filter(f => f.id === i) }), r.pepeId);
  // (2) RE (aucun ordre réel ; page locale) : DOT SHORT — dans l'EV, DOT porte une position de la voix (une seule position par paire) ; dans l'AA hors ligne,
  // le prix de DOT est celui de l'école (générateur) : on prend le prix du RE (celui du backup, 0,734)
  r.re = await ev(() => window.__mode('real'));
  r.dotId = await ev(() => window.__ouvrir('DOT/USDT', 'short', 100));
  r.dot = r.dotId ? await fiche(r.dotId, 2, 5, path.join(process.env.SONDE_OUT || '/tmp', 'n86d-fiche-dot-' + nom + '.png')) : null;
  // (3) EV : EUR LONG (la seule paire de l'EV sans position de la voix)
  r.ev = await ev(() => window.__mode('paperReal'));
  r.eurId = await ev(() => window.__ouvrir('EUR/USDT', 'long', 100));
  r.eur = r.eurId ? await fiche(r.eurId, 1, 1) : null;
  // (4) le panneau de la paire (03) : masqué dans l'app ; ses champs, s'ils existent, remplis par _adjPropPct
  r.panneau = await ev(() => { const w = document.getElementById('pairPosButtons'), o = { masque: w ? getComputedStyle(w).display : null, champs: {} };
    ['PEPE/USDT', 'DOT/USDT'].forEach(p => { const k = p.replace('/', '_'), e = document.getElementById('pinput_tp_' + k);
      if (e) { try { _adjPropPct(p, 'tp', 1); } catch (x) { o.err = String(x); } o.champs[p] = { tp: e.value, prix: S.pairStates[p].price }; } else o.champs[p] = null; });
    return o; });
  await page.waitForTimeout(20000);
  r.erreurs = perr.slice();
  await ctx.close(); server.close();
  return r;
}
const pres = (v, x) => Math.abs(v - x) <= Math.max(Math.abs(x) * 5e-5, 0.5e-8) + 1e-15;
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const av = await passe(browser, OLD, 8971, 'avant'), ap = await passe(browser, NEW, 8972, 'apres');
  await browser.close();
  console.log('SONDE N° 86D · backup ' + path.basename(A.backup) + ' · avant ' + av.doc + ' · après ' + ap.doc);
  console.log('  départ : ' + JSON.stringify(ap.depart) + ' · PEPE avant ' + JSON.stringify(av.pepe) + ' · après ' + JSON.stringify(ap.pepe));
  R('départ : EV à l\'écran, MANU, 11 positions de la voix (les deux versions)', [av, ap].every(x => x.depart.mode === 'paperReal' && x.depart.auto === false && x.depart.voix === 11), [av.depart, ap.depart]);
  const C0 = (x, t) => { const c = x && x.clics && x.clics.find(k => k.type === t); return c ? c.prix : NaN; };   // le prix au moment du clic
  const pa = ap.pepe && ap.pepe.pos, pv = av.pepe && av.pepe.pos, Pt = C0(ap.pepe, 'tp'), Ps = C0(ap.pepe, 'sl');
  R('(1) AA, PEPE LONG, fiche ✏️ « +1 % » / « −1 % » cliqués puis « ✓ Appliquer » : après, TP = prix du clic + 1 % (au pas 1e-8, au-dessus), SL = −1 % (en dessous) ; avant, TP = SL = 0.000004',
    av.aa === 'sim' && ap.aa === 'sim' && ap.pepe.visible && pa && pres(pa.tp, Pt * 1.01) && pa.tp > Pt && pres(pa.sl, Ps * 0.99) && pa.sl < Ps && ap.pepe.champs[0] === String(pa.tp)
      && pv && pv.tp === 0.000004 && pv.sl === 0.000004 && av.pepe.champs[0] === '0.000004' && av.pepe.champs[1] === '0.000004', { avant: av.pepe, apres: ap.pepe });
  R('(1b) AA, 10 s de vrai battement : avant, la position est FERMÉE au passage suivant par la sortie TP / SL de 07 (TP = SL = 0.000004 : l\'un des deux est toujours touché) ; après, toujours ouverte, rien de fermé',
    av.pepeApres.fermes.some(f => f.sortie === 'tp' || f.sortie === 'sl') && !av.pepeApres.ouverte && ap.pepeApres.ouverte && !ap.pepeApres.fermes.length, { avant: av.pepeApres, apres: ap.pepeApres });
  const D = C0(ap.dot, 'tp'), Dv = C0(av.dot, 'tp'), E = C0(ap.eur, 'tp');
  R('(2) RE, DOT SHORT, « +2 % » / « −5 % » : après, champs ' + JSON.stringify(ap.dot && ap.dot.champs) + ' = niveaux posés, justes ; avant ' + JSON.stringify(av.dot && av.dot.champs),
    ap.re === 'real' && ap.dot && ap.dot.pos && pres(ap.dot.pos.tp, D * 0.98) && pres(ap.dot.pos.sl, C0(ap.dot, 'sl') * 1.05) && ap.dot.champs[0] === String(ap.dot.pos.tp) && av.dot && av.dot.champs[0] === (Dv * 0.98).toFixed(2) && !pres(av.dot.pos.tp, Dv * 0.98),
    { avant: av.dot, apres: ap.dot, D, Dv });
  R('(3) EV, EUR LONG, « +1 % » / « −1 % » : après, champs ' + JSON.stringify(ap.eur && ap.eur.champs) + ' justes ; avant ' + JSON.stringify(av.eur && av.eur.champs),
    ap.eur && ap.eur.pos && pres(ap.eur.pos.tp, E * 1.01) && pres(ap.eur.pos.sl, C0(ap.eur, 'sl') * 0.99) && av.eur && !pres(av.eur.pos.tp, C0(av.eur, 'tp') * 1.01), { avant: av.eur, apres: ap.eur, E });
  const pn = ap.panneau, pnv = av.panneau;
  R('(4) panneau de la paire (03) : masqué (#pairPosButtons display:none) et VIDE dans la page — ses champs n\'y existent pas (avant et après) : la partie 03 n\'est prouvée qu\'en vm (banc-n86d P1, P2)',
    pn.masque === 'none' && pnv.masque === 'none' && !pn.err && Object.keys(pn.champs).every(p => pn.champs[p] === null) && Object.keys(pnv.champs).every(p => pnv.champs[p] === null),
    { avant: pnv, apres: pn });
  R('page prête et sans erreur (avant et après), 20 s de battement', av.pret && ap.pret && !ap.erreurs.length && !av.erreurs.length, { avant: av.erreurs, apres: ap.erreurs });
  const ok = res.filter(x => x.ok).length;
  console.log(`\n${ok === res.length ? '✅' : '❌'} ${ok}/${res.length} étapes`);
  fs.mkdirSync(path.join(NEW, 'rejeu/out'), { recursive: true });
  fs.writeFileSync(path.join(NEW, 'rejeu/out/sonde_n86d.json'), JSON.stringify({ avant: av, apres: ap, res }, null, 1));
  process.exit(ok === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
