// [GO SENTRY · 12/11/2026] VERSION 20261112b · rejeu/sonde_sentry.js — Sentry joué par la VRAIE page (Chromium), sans rien envoyer à Sentry.
//   node rejeu/sonde_sentry.js --root <dossier du code> [--port 8977] [--secondes 90] [--out <f.json>]
// Deux passages de la vraie app, servie depuis --root sur 127.0.0.1, réseau extérieur coupé (comme les autres sondes) :
//   1. FORCÉ (window.__auraSentryForce = true avant le chargement) : chaque requête vers *.ingest.de.sentry.io est INTERCEPTÉE (réponse 200
//      simulée, rien ne sort) et son corps est gardé. Faux secrets posés dans localStorage (PAT du pont, clé CoinStats, Telegram). On laisse
//      tourner l'app, puis on provoque un vrai plantage (setTimeout qui lance une erreur portant un montant et le PAT) et une promesse rejetée.
//      Vérifié : les erreurs avalées par l'app pendant ce temps partent (une fois chacune), le plantage part, le « Sentry branché » part à 20 s,
//      AUCUN corps ne contient un faux secret ni un montant des portefeuilles, Error.stackTraceLimit = 10, setTimeout / fetch = ceux de 00.
//   2. NORMAL (127.0.0.1, pas de drapeau) : AUCUNE requête vers Sentry, alors que l'app avale des erreurs (témoin : S._errStats non vide).
// --out garde aussi les corps exacts du passage 1 : les rejouer vers Sentry (curl, une fois) prouve qu'il les accepte (environnement « sonde »).
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); } catch (e2) {} }
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!chromium || !args.root) { console.error('usage : node rejeu/sonde_sentry.js --root <code> [--port 8977] [--secondes 90] [--out f.json]'); process.exit(3); }
const ROOT = path.resolve(args.root), PORT = Number(args.port || 8977), SEC = Number(args.secondes || 90);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const PAT = 'github_pat_11SONDEfakeFAKEfake_sondeSONDE0123456789abcdefXYZ';
const NEWS = 'SondeFakeCoinStatsKey0123456789abcdefABCDEF==';
const TG = { botToken: '7799999999:AAHsondeFakeTelegramToken_abcdefghij', chatId: '123454321' };
const res = [], R = (nom, ok, detail) => { res.push({ nom, ok: !!ok, detail }); console.log((ok ? '  OK  ' : '  !!  ') + nom + (detail !== undefined ? ' · ' + JSON.stringify(detail).slice(0, 700) : '')); };

async function passage(browser, force) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const envois = [], autres = [];
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue();
    if (/^https:\/\/[^/]*ingest\.de\.sentry\.io\//.test(u)) { envois.push({ url: u, corps: route.request().postData() || '' }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    autres.push(u.replace(/\?.*$/, '').slice(0, 80)); return route.abort();
  });
  await ctx.addInitScript(`(() => { ${force ? 'window.__auraSentryForce = true;' : ''}
    try { localStorage.setItem('aura_pont_pat', ${JSON.stringify(PAT)}); localStorage.setItem('aura_news_key', ${JSON.stringify(NEWS)}); localStorage.setItem('aura_tg_cfg', ${JSON.stringify(JSON.stringify(TG))}); } catch (e) {} })();`);
  const page = await ctx.newPage(), perr = [];
  page.on('pageerror', e => { if (perr.length < 30) perr.push(String(e && e.message || e).slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  const ev = (fn, a) => page.evaluate(fn, a);
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  for (let i = 0; i < 600; i++) { if (await ev(() => !!(window._stateReady && typeof S !== 'undefined' && S.walletStore)).catch(() => false)) break; await page.waitForTimeout(200); }
  const pret = Date.now() - t0;
  return { ctx, page, ev, envois, autres, perr, pret };
}
const evts = (envois) => envois.map(e => { const L = e.corps.split('\n'); try { return JSON.parse(L[2]); } catch (x) { return { brut: e.corps.slice(0, 200) }; } });

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    /* ───── 1. FORCÉ ───── */
    const A = await passage(browser, true);
    const st0 = await A.ev(() => ({ etat: window._auraSentry && window._auraSentry.etat(), limite: Error.stackTraceLimit, to: String(window.setTimeout).includes('_wrapFn'), fe: String(window.fetch).includes('_oFetch'), tok: (document.querySelector('script[src*="00s-sentry.js"]').src.match(/[?&]v=([0-9a-z]+)/) || [])[1] || null }));
    R('chargement · état prêt en ' + (A.pret / 1000).toFixed(1) + ' s ; Sentry actif (environnement « sonde ») ; Error.stackTraceLimit = ' + st0.limite + ' ; setTimeout et fetch = ceux de 00',
      st0.etat && st0.etat.actif === true && st0.limite === 10 && st0.to && st0.fe, st0.etat);
    await A.page.waitForTimeout(Math.max(25, SEC) * 1000);
    const errStats = await A.ev(() => Object.assign({}, S._errStats || {}));
    const montants = await A.ev(() => { const out = []; for (const m of ['sim', 'paperReal', 'real']) { const w = S.walletStore[m] || {}; ['portfolio', 'tradingAccount', 'cashAccount', '_startPortfolio'].forEach(k => { if (typeof w[k] === 'number' && Math.abs(w[k]) >= 10) out.push(w[k]); }); } return out; });
    // un vrai plantage : rappel de minuterie (passe par l'enveloppe chrono de 00) qui lance une erreur avec un montant et le PAT dans son texte
    await A.ev(() => { setTimeout(function sonde_plantage() { const w = S.walletStore.paperReal; throw new Error('sonde plantage ' + w.portfolio + ' $ · mise 1062.4937 · ' + localStorage.getItem('aura_pont_pat')); }, 0); Promise.reject(new Error('sonde promesse rejetée')); });
    await A.page.waitForTimeout(3000);
    const E = evts(A.envois), etat = await A.ev(() => window._auraSentry.etat());
    const avalees = E.filter(e => e.tags && e.tags.avalee === 'oui'), branche = E.filter(e => /^AURA8 · Sentry branché · /.test(e.message || ''));
    const plantage = E.find(e => e.exception && /sonde plantage/.test(e.exception.values.slice(-1)[0].value));
    const rejet = E.find(e => e.exception && /sonde promesse rejetée/.test(e.exception.values.slice(-1)[0].value));
    const nomsAvales = Object.keys(errStats);
    R(A.envois.length + ' envoi(s) vers l\'ingest Sentry intercepté(s), aucun autre trafic que les sondes habituelles', A.envois.length >= 2, { autres: [...new Set(A.autres)].slice(0, 8) });
    R('erreurs avalées par l\'app pendant ' + SEC + ' s : ' + nomsAvales.length + ' message(s) distinct(s) dans S._errStats → ' + avalees.length + ' envoi(s) avalee=oui (une fois chacun au plus)',
      avalees.length <= nomsAvales.length && (nomsAvales.length === 0 || avalees.length >= 1), { errStats, envoyes: avalees.map(e => (e.exception ? e.exception.values.slice(-1)[0].value : e.message)) });
    const fp = plantage && plantage.exception.values.slice(-1)[0];
    R('plantage réel (minuterie) : envoyé non géré, avalee=non, pile jusqu\'à sonde_plantage, montant et PAT masqués', !!fp && fp.mechanism && fp.mechanism.handled === false && plantage.tags.avalee === 'non'
      && fp.stacktrace.frames.some(f => f['function'] === 'sonde_plantage') && !fp.value.includes('github_pat_11SONDE'), fp && { value: fp.value, haut: fp.stacktrace.frames.slice(-2), tags: plantage.tags });
    R('promesse rejetée : envoyée', !!rejet, rejet && rejet.exception.values.slice(-1)[0].value);
    R('« Sentry branché » : envoyé une fois à 20 s, token ' + st0.tok + ', marqué dans aura_sentry_v', branche.length === 1 && branche[0].message.endsWith(st0.tok) && await A.ev(() => localStorage.getItem('aura_sentry_v')) === st0.tok, branche.map(e => e.message));
    const tout = A.envois.map(e => e.corps).join('\n');
    const fuites = [PAT, NEWS, TG.botToken, TG.chatId, '11SONDE'].filter(s => tout.includes(s))
      .concat(montants.concat([1062.4937]).map(x => String(x)).filter(s => s.length >= 4 && tout.includes(s)))
      .concat(montants.map(x => x.toFixed(2)).filter(s => tout.includes(s)))
      .concat(['walletStore', 'ip_address', '"user"', 'cookie', 'breadcrumbs', 'nexus_state'].filter(s => tout.includes(s)));
    R('rien de privé dans les ' + A.envois.length + ' corps : ni faux secret, ni montant (1062.4937 mis dans le plantage + ' + montants.length + ' valeur(s) des 3 portefeuilles ≥ 10), ni état, IP, cookie, fil d\'Ariane', fuites.length === 0, { fuites });
    R('compteurs · envoyés ' + etat.envoyes + ', doublons écartés ' + etat.refuses.doublon + ', plafond ' + etat.refuses.plafond + ', dernier statut ' + etat.dernierStatut, etat.envoyes === A.envois.length && etat.dernierStatut === 200, etat);
    R('aucune erreur de page venant de Sentry', !A.perr.some(m => /sentry|__auraSentry/i.test(m)), A.perr.slice(0, 6));
    const envoisForces = A.envois.slice();
    const resume1 = { envois: E.map(e => ({ niveau: e.level, avalee: e.tags && e.tags.avalee, mode: e.tags && e.tags.mode, texte: e.exception ? e.exception.values.slice(-1)[0].type + ': ' + e.exception.values.slice(-1)[0].value : e.message, haut: e.exception ? (f => f && (String(f.filename).replace(/^.*\//, '') + ':' + f.lineno))(e.exception.values.slice(-1)[0].stacktrace && e.exception.values.slice(-1)[0].stacktrace.frames.slice(-1)[0]) : null })) };
    await A.ctx.close();

    /* ───── 2. NORMAL (127.0.0.1, pas de drapeau) ───── */
    const B = await passage(browser, false);
    await B.page.waitForTimeout(Math.max(25, Math.min(SEC, 40)) * 1000);
    const b = await B.ev(() => ({ etat: window._auraSentry && window._auraSentry.etat(), err: Object.keys(S._errStats || {}).length }));
    await B.ev(() => { setTimeout(function () { throw new Error('témoin muet'); }, 0); });
    await B.page.waitForTimeout(1500);
    R('hors de la page publiée : Sentry inactif (« ' + (b.etat && b.etat.raison) + ' »), ' + B.envois.length + ' requête vers Sentry, alors que l\'app a avalé ' + b.err + ' message(s) et planté une fois',
      b.etat && b.etat.actif === false && B.envois.length === 0, b);
    await B.ctx.close();

    const ok = res.every(r => r.ok);
    if (args.out) fs.writeFileSync(args.out, JSON.stringify({ res, resume1, envois: envoisForces }, null, 1));   // envois : url + corps EXACTS (faux secrets déjà masqués) — `--out` permet de les rejouer vers Sentry pour vérifier qu'il les accepte
    console.log('\nENVOIS DU PASSAGE FORCÉ :'); resume1.envois.forEach(e => console.log('  · ' + [e.niveau, 'avalee=' + e.avalee, e.mode, e.haut, e.texte].join(' · ').slice(0, 220)));
    console.log((ok ? '✅ ' : '❌ ') + res.filter(r => r.ok).length + '/' + res.length + ' étapes');
    process.exitCode = ok ? 0 : 1;
  } finally { await browser.close(); server.close(); }
})();
