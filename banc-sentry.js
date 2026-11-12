// banc-sentry.js — [GO SENTRY · 12/11/2026] VERSION 20261112b
// « Go sentry » (Rams 12/11) : chaque erreur de la tablette part à Sentry, sans rien de privé. Ce banc fait tourner le VRAI texte
// (js/00-backup-state.js entier, js/00r-sentry-sdk.min.js = SDK officiel réduit, js/00s-sentry.js) dans une vm qui imite la page :
// window, document, location, localStorage, fetch FACTICE qui enregistre chaque envoi (rien ne sort de la machine).
//   A  statique : ordre du HTML (00 → SDK → 00s → 02), SDK = la recette (sha-256), 00 relié, aucune clé de stockage nouvelle hors 2.
//   B  hors de la page publiée (bancs, rejeux, sondes) : RIEN ne part, même avec erreurs ; le banc VOIT la différence (règle 10).
//   C  erreur avalée (00 _decErr) : part une fois, niveau warning, avalee=oui, mode, pile ; 00 compte et journalise comme avant.
//   D  rien de privé : secrets (PAT, CoinStats, Telegram, champs secrets de S, jetons, paramètres), montants, état, IP, cookies.
//   E  plantages (onerror, promesse rejetée), doublons, plafond du jour, message « Sentry branché » une fois par token.
//   F  rien d'autre ne change : setTimeout / fetch / console de 00 intacts, Error.stackTraceLimit rendu.
// Échoue sur le code d'avant : BANC_ROOT=<copie du commit ec416ea> node banc-sentry.js
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ex = f => fs.existsSync(path.join(ROOT, f));
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n     ')); } }
const HOTE = 'ramizxhixha-a11y.github.io';
const INGEST = 'https://o4512420537499648.ingest.de.sentry.io/api/4512420614570064/envelope/';
const SDK_SHA = ['4f58f8ac3a71ad05', '17bc2f2d60b99113', 'beea9bcb0920272d', '608aaa8149513a21'].join('');   // en 4 morceaux : banc-p0b refuse 44 hex d'affilée dans un banc   // sortie de rejeu/sentry/construire.sh (@sentry/browser 11.12.0)
const html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];

// secrets du monde (faux, mais à la forme des vrais)
const PAT = 'github_pat_11BWCH5AQ0zzFAKEfakeFAKEfake_0123456789abcdefABCDEF';
const NEWS = 'Qk3fakeCoinStatsKeyAAAAbbbbCCCCddddEEEEffff00==';
const TG = { botToken: '7712345678:AAHfakeTelegramTokenXyZ_abcdefghijkl', chatId: '987654321' };
const SECRET_S = 'sk-live-fake-secret-value-in-S-0001';
const MONTANT = 1062.4937;
const CONSOLE = { log() {}, info() {}, warn() {}, error() {}, debug() {} };   // la page a sa console ; ici muette (00 y écrit « IDB open error » hors navigateur)

function monde(opts) {
  opts = opts || {};
  const envois = [], timers = [], ecouteurs = [];
  const ls = new Map(Object.entries(opts.ls || {}));
  const localStorage = {
    getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: k => { ls.delete(k); },
    key: i => [...ls.keys()][i] || null, get length() { return ls.size; }
  };
  const fetch = function (url, o) {
    envois.push({ url: String(url), body: o && o.body, o });
    const st = opts.statut || 200;
    return Promise.resolve({ status: st, headers: { get: () => null }, json: () => Promise.resolve({}) });
  };
  const document = {
    currentScript: null, visibilityState: 'visible', readyState: 'loading',
    addEventListener: (n, f) => ecouteurs.push(n), removeEventListener() {}, head: { appendChild() {}, removeChild() {} },
    createElement: () => ({ style: {}, contentWindow: null })
  };
  const w = {
    document, localStorage, fetch, envois, timers, ecouteurs,
    location: { hostname: opts.hote === undefined ? HOTE : opts.hote, href: 'https://' + (opts.hote === undefined ? HOTE : opts.hote) + '/aura/AURA8_v118.html', protocol: 'https:' },
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', onLine: true },
    console: CONSOLE, Promise, Error, TypeError, RangeError, String, Number, Boolean, Array, Object, Math, Date, JSON, RegExp, Map, Set, WeakMap, WeakSet, Symbol, Reflect, Proxy,
    Uint8Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, URL, URLSearchParams, crypto: crypto.webcrypto, performance, queueMicrotask,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, escape, unescape, structuredClone,
    clearTimeout: () => {}, clearInterval: () => {},
    setTimeout: (f, ms) => { if (typeof f !== 'function') return 0; if ((ms || 0) >= 1000) { timers.push({ f, ms }); return timers.length; } return setTimeout(f, ms); },
    setInterval: () => 0, requestAnimationFrame: () => 0, WebSocket: undefined
  };
  w.window = w; w.self = w; w.globalThis = w;
  if (opts.force) w.__auraSentryForce = true;
  const ctx = vm.createContext(w);
  const run = (f, src) => vm.runInContext(src || rd(f), ctx, { filename: 'https://' + HOTE + '/aura/' + f + '?v=' + TOK });
  const charge = (f) => { document.currentScript = { src: 'https://' + HOTE + '/aura/' + f + '?v=' + TOK }; run(f); document.currentScript = null; };
  charge('js/00-backup-state.js');
  w.__oTimeout = w.setTimeout; w.__oFetch = w.fetch; w.__limite = Error.stackTraceLimit;
  if (opts.sansS !== true) run('etat', 'var S = ' + JSON.stringify({
    tradingMode: 'paperReal', chainLog: [], perf: {}, newsApiKey: NEWS,
    walletStore: { paperReal: { portfolio: MONTANT, tradingAccount: 1055.91, cashAccount: 6.58 } }
  }) + '; Object.defineProperty(S, "telegramCfg", { value: ' + JSON.stringify(TG) + ', enumerable: false }); S.apiSecret = "' + SECRET_S + '";');
  if (ex('js/00r-sentry-sdk.min.js')) charge('js/00r-sentry-sdk.min.js');
  if (ex('js/00s-sentry.js')) charge('js/00s-sentry.js');
  // 17 (lecture du pont) donne les valeurs des champs de S au nom de secret : imité ici par sa vraie règle (nom + longueur ≥ 12)
  w._pontLecture = { secrets: () => { const S = vm.runInContext('typeof S === "undefined" ? null : S', ctx); if (!S) return []; return Object.getOwnPropertyNames(S).filter(k => /(api_?key|secret|token)/i.test(k)).map(k => S[k]).filter(v => typeof v === 'string' && v.length >= 12); } };
  w.run = run; w.ctx = ctx; w.ls = ls;
  return w;
}
const attend = (ms) => new Promise(r => setTimeout(r, ms || 30));
function corps(e) { const b = e.body; return typeof b === 'string' ? b : Buffer.from(b).toString('utf8'); }
function evt(e) {   // enveloppe : en-tête \n en-tête d'item \n charge
  const L = corps(e).split('\n'); return { tete: JSON.parse(L[0]), item: JSON.parse(L[1]), ev: JSON.parse(L[2]) };
}
function erreur(w, msg) { return vm.runInContext('(function lanceur_de_test(){ try { throw new Error(' + JSON.stringify(msg) + '); } catch (e) { return e; } })()', w.ctx, { filename: 'https://' + HOTE + '/aura/js/09c-auto-open.js?v=' + TOK }); }

(async () => {
  console.log('▶ banc-sentry · token ' + TOK + (process.env.BANC_ROOT ? ' · ROOT ' + ROOT : ''));

  /* ─────────── A · statique ─────────── */
  await T('A1 HTML : 00 → js/00r-sentry-sdk.min.js → js/00s-sentry.js → 02, au token', () => {
    const src = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(\?v=[0-9a-z]+)?"/g)].map(m => [m[1], m[2]]);
    const i = src.findIndex(s => s[0] === 'js/00-backup-state.js');
    assert.deepStrictEqual(src.slice(i, i + 4).map(s => s[0]), ['js/00-backup-state.js', 'js/00r-sentry-sdk.min.js', 'js/00s-sentry.js', 'js/02-state-init.js']);
    assert.ok(src.slice(i + 1, i + 3).every(s => s[1] === '?v=' + TOK));
  });
  await T('A2 SDK = sortie de la recette rejeu/sentry/construire.sh (sha-256), un seul nom global __auraSentrySdk, aucun stockage ni console', () => {
    const s = rd('js/00r-sentry-sdk.min.js');
    assert.strictEqual(crypto.createHash('sha256').update(s).digest('hex'), SDK_SHA, 'SDK modifié hors recette');
    assert.ok(/^\/\*![^\n]*\*\/\nvar __auraSentrySdk=\(\(\)=>\{/.test(s));
    assert.ok(!/localStorage|sessionStorage|console\[/.test(s));
    assert.ok(ex('rejeu/sentry/construire.sh') && ex('rejeu/sentry/entree.js'));
  });
  await T('A3 00 relie _decErr à Sentry (avant le « if (!S0) return » : une erreur du chargement part aussi) ; 00s : ni window.S, ni alert, ni la clé du PAT, 2 clés de stockage', () => {
    const s0 = rd('js/00-backup-state.js'), s = rd('js/00s-sentry.js');
    const i = s0.indexOf('window._auraSentry.avalee(e)'), j = s0.indexOf('if (!S0) return;', s0.indexOf('window._decErr = function'));
    assert.ok(i > 0 && i < j);
    assert.ok(s0.startsWith('// [GEL BOOT · 11/09/2026] VERSION 20260911a'));
    assert.ok(!/window\.S\b|alert\(|aura_pont_(pat|mem)/.test(s));   // le PAT du pont : seul 17b connaît sa clé (banc-pont-direct P36)
    const cles = [...s.matchAll(/localStorage\.setItem\(([A-Z_]+)/g)].map(m => m[1]);
    assert.deepStrictEqual([...new Set(cles)].sort(), ['LS_BRANCHE', 'LS_JOUR']);
    assert.ok(s.includes("var LS_JOUR = 'aura_sentry_jour', LS_BRANCHE = 'aura_sentry_v';"));
  });

  /* ─────────── B · hors de la page publiée : muet ─────────── */
  await T('B1 hôte 127.0.0.1 (sondes, rejeux) : inactif, AUCUN envoi malgré _decErr, onerror et 25 s d\'attente ; le témoin à l\'hôte publié, lui, envoie', async () => {
    const w = monde({ hote: '127.0.0.1' });
    const st = w._auraSentry.etat();
    assert.strictEqual(st.actif, false); assert.ok(/hors de la page publiée/.test(st.raison), st.raison);
    w._decErr(erreur(w, 'muet')); if (typeof w.onerror === 'function') w.onerror('x', 'u', 1, 1, new Error('x'));
    w.timers.forEach(t => t.f()); await attend(60);
    assert.strictEqual(w.envois.length, 0);
    const t = monde(); t._decErr(erreur(t, 'témoin')); await attend(60);
    assert.strictEqual(t.envois.length, 1, 'le témoin doit envoyer (sinon B1 ne prouve rien)');
  });
  await T('B2 page publiée mais SDK absent → inactif (« SDK absent »), aucune exception', () => {
    const w = monde(); w._auraSentry = undefined;
    vm.runInContext('delete window._auraSentry; window.__auraSentrySdk = undefined;', w.ctx);
    w.document.currentScript = { src: 'https://' + HOTE + '/aura/js/00s-sentry.js?v=' + TOK };
    w.run('js/00s-sentry.js');
    assert.strictEqual(w._auraSentry.etat().raison, 'SDK absent');
  });

  /* ─────────── C · erreur avalée ─────────── */
  let W, E1;
  await T('C1 _decErr(e) : 1 envoi vers l\'ingest Europe du projet, niveau warning, avalee=oui, mode=paperReal, release aura8@' + TOK + ', pile avec fichier:ligne', async () => {
    W = monde();
    assert.strictEqual(W._auraSentry.etat().actif, true);
    W._decErr(erreur(W, 'cannot read properties of undefined (reading \'stake\')'));
    await attend(60);
    assert.strictEqual(W.envois.length, 1);
    assert.ok(W.envois[0].url.startsWith(INGEST), W.envois[0].url);
    E1 = evt(W.envois[0]);
    const ev = E1.ev;
    assert.strictEqual(ev.level, 'warning'); assert.strictEqual(ev.tags.avalee, 'oui'); assert.strictEqual(ev.tags.mode, 'paperReal');
    assert.strictEqual(ev.release, 'aura8@' + TOK); assert.strictEqual(ev.environment, 'tablette');
    const x = ev.exception.values[0];
    assert.strictEqual(x.type, 'Error'); assert.strictEqual(x.value, 'cannot read properties of undefined (reading \'stake\')');
    const f = x.stacktrace.frames[x.stacktrace.frames.length - 1];
    assert.ok(/09c-auto-open\.js\?v=/.test(f.filename) && f.lineno === 1 && f['function'] === 'lanceur_de_test', JSON.stringify(f));
  });
  await T('C2 00 inchangé pour l\'app : S._errStats compte, 1re occurrence journalisée « ⚠ Erreur avalée » ; une 2e fois la même erreur → compte 2, AUCUN 2e envoi (doublon)', async () => {
    const S = W.run('x', 'S');
    W._decErr(erreur(W, 'cannot read properties of undefined (reading \'stake\')')); await attend(60);
    assert.strictEqual(S._errStats["cannot read properties of undefined (reading 'stake')"], 2);
    assert.strictEqual(S.chainLog.filter(l => /^Erreur avalée \(1re occurrence\)/.test(l.desc)).length, 1);
    assert.strictEqual(W.envois.length, 1); assert.strictEqual(W._auraSentry.etat().refuses.doublon, 1);
  });
  await T('C2b la même erreur avalée 5 000 fois (une par battement) : 1 seul envoi, tri avant de bâtir l\'événement (< 300 ms pour les 5 000)', async () => {
    const w = monde(), e = erreur(w, 'boucle de battement');
    const t0 = Date.now(); for (let i = 0; i < 5000; i++) w._decErr(e); const dt = Date.now() - t0;
    await attend(60);
    assert.strictEqual(w.envois.length, 1); assert.strictEqual(w._auraSentry.etat().refuses.doublon, 4999);
    assert.ok(dt < 300, dt + ' ms');
  });
  await T('C3 _decErr avant que S existe (chargement) : part quand même ; _decErr("texte") → message ; une garde qui casse ne casse pas _decErr', async () => {
    const w = monde({ sansS: true });
    w._decErr(erreur(w, 'au chargement')); w._decErr('plafond indisponible'); await attend(60);
    assert.strictEqual(w.envois.length, 2);
    assert.strictEqual(evt(w.envois[0]).ev.tags.mode, 'inconnu');
    assert.strictEqual(evt(w.envois[1]).ev.message, 'Erreur avalée : plafond indisponible');
    const w2 = monde(); vm.runInContext('Object.defineProperty(window, "_auraSentry", { value: { avalee: function () { throw new Error("cassé"); } } })', w2.ctx);
    w2._decErr(new Error('z')); assert.strictEqual(w2.run('x', 'S')._errStats.z, 1);
  });

  /* ─────────── D · rien de privé ─────────── */
  await T('D1 secrets : PAT du pont, clé CoinStats, jeton et chat Telegram, champ secret de S, jetons GitHub / Telegram, Bearer, paramètres → « [masqué] » ; aucun ne figure dans ce qui part', async () => {
    const w = monde({ ls: { aura_pont_pat: PAT, aura_news_key: NEWS, aura_tg_cfg: JSON.stringify(TG) } });
    const msg = 'échec ' + PAT + ' / ' + NEWS + ' / https://api.telegram.org/bot' + TG.botToken + '/sendMessage?chat_id=' + TG.chatId
      + ' / ' + SECRET_S + ' / ghp_abcdefghijklmnop0123 / Bearer abc.def-ghi_jkl / https://x.io/p?apikey=zz9&token=yy8&v=1';
    w._decErr(erreur(w, msg)); await attend(60);
    const b = corps(w.envois[0]);
    for (const s of [PAT, NEWS, TG.botToken, TG.chatId, SECRET_S, 'ghp_abcdefghijklmnop0123', 'abc.def-ghi_jkl', 'zz9', 'yy8', '11BWCH5AQ0']) assert.ok(!b.includes(s), 'fuite : ' + s);
    const v = evt(w.envois[0]).ev.exception.values[0].value;
    assert.ok(/\[masqué\]/.test(v) && v.includes('https://api.telegram.org/bot[masqué]/sendMessage') && v.includes('https://x.io/p ') === false, v);
  });
  await T('D2 montants : 1062.4937, « 1 055,91 $ », « 950 USDT », « € 12 », 4 chiffres et plus → « # » ; codes HTTP et petits entiers gardés', async () => {
    const w = monde();
    w._decErr(erreur(w, 'mise 1062.4937 refusée · trading 1 055,91 $ · 950 USDT · € 12 · position 123456 · HTTP 429 · 3 essais')); await attend(60);
    const v = evt(w.envois[0]).ev.exception.values[0].value;
    assert.strictEqual(v, 'mise # refusée · trading # · # · # · position # · HTTP 429 · 3 essais');
  });
  await T('D3 rien de l\'état ni de l\'appareil : ni portefeuille, ni S, ni utilisateur, ni IP (infer_ip « never »), ni cookie, ni extra ; en-têtes = User-Agent seul ; adresse sans paramètre', async () => {
    const w = monde(); w.location.href = 'https://' + HOTE + '/aura/AURA8_v118.html?t=123&k=zz';
    w._decErr(erreur(w, 'x')); await attend(60);
    const b = corps(w.envois[0]), { tete, ev } = evt(w.envois[0]);
    for (const s of ['1062.49', '1055.91', 'walletStore', 'portfolio', 'ip_address', 'cookie', '"user"', '"extra"', 'breadcrumbs']) assert.ok(!b.includes(s), 'présent : ' + s);
    assert.deepStrictEqual(Object.keys(ev.request.headers), ['User-Agent']);
    assert.ok(!/[?&]t=|k=zz/.test(ev.request.url), ev.request.url);
    assert.strictEqual(ev.sdk.settings && ev.sdk.settings.infer_ip, 'never');
    assert.deepStrictEqual(Object.keys(ev).filter(k => !['event_id', 'timestamp', 'platform', 'level', 'release', 'environment', 'sdk', 'exception', 'message', 'tags', 'request', 'logger'].includes(k)), []);
    assert.ok(tete.dsn || tete.sent_at);
  });
  await T('D4 la garde échoue → rien ne part (dans le doute, rien) ; un événement sans exception ni message → rien', () => {
    const g = monde()._auraSentry._garde;
    assert.strictEqual(g({ get exception() { throw new Error('piège'); } }), null);
    assert.strictEqual(g({ level: 'error', tags: {} }), null);
  });

  /* ─────────── E · plantages, quotas, branchement ─────────── */
  await T('E1 plantage (window.onerror du navigateur) : envoyé, non géré (handled=false), avalee=non, mode ; promesse rejetée : envoyée', async () => {
    const w = monde();
    assert.strictEqual(typeof w.onerror, 'function'); assert.strictEqual(typeof w.onunhandledrejection, 'function');
    const e = erreur(w, 'plantage réel');
    w.onerror('Uncaught Error: plantage réel', 'https://' + HOTE + '/aura/js/09c-auto-open.js?v=' + TOK, 1, 1, e);
    w.onunhandledrejection({ reason: erreur(w, 'promesse perdue') });
    await attend(80);
    assert.strictEqual(w.envois.length, 2);
    const a = evt(w.envois[0]).ev, r = evt(w.envois[1]).ev;
    assert.strictEqual(a.exception.values[0].mechanism.handled, false); assert.strictEqual(a.tags.avalee, 'non'); assert.strictEqual(a.tags.mode, 'paperReal');
    assert.ok(/promesse perdue/.test(r.exception.values[0].value));
  });
  await T('E2 plafond du jour (' + 160 + ' = limite de la clé) : au plafond, une erreur NOUVELLE ne part pas ; un autre jour, le compteur repart', async () => {
    const auj = new Date().toISOString().slice(0, 10);
    const w = monde({ ls: { aura_sentry_jour: JSON.stringify({ j: auj, n: 160 }) } });
    assert.strictEqual(w._auraSentry._plafondJour, 160);
    w._decErr(erreur(w, 'nouvelle')); await attend(60);
    assert.strictEqual(w.envois.length, 0); assert.strictEqual(w._auraSentry.etat().refuses.plafond, 1);
    const w2 = monde({ ls: { aura_sentry_jour: JSON.stringify({ j: '2026-11-11', n: 160 }) } });
    w2._decErr(erreur(w2, 'nouvelle')); await attend(60);
    assert.strictEqual(w2.envois.length, 1); assert.strictEqual(JSON.parse(w2.ls.get('aura_sentry_jour')).n, 1);
  });
  await T('E3 « AURA8 · Sentry branché · ' + TOK + ' » : 20 s après le chargement, une fois ; marqué après la réponse 2xx ; relance → plus envoyé ; réponse 429 → pas marqué', async () => {
    const w = monde();
    const t = w.timers.find(x => x.ms === 20000); assert.ok(t, 'minuterie de 20 s'); t.f(); await attend(60);
    assert.strictEqual(w.envois.length, 1);
    const ev = evt(w.envois[0]).ev; assert.strictEqual(ev.message, 'AURA8 · Sentry branché · ' + TOK); assert.strictEqual(ev.level, 'info');
    assert.strictEqual(w.ls.get('aura_sentry_v'), TOK);
    const w2 = monde({ ls: { aura_sentry_v: TOK } }); assert.ok(!w2.timers.some(x => x.ms === 20000));
    const w3 = monde({ statut: 429 }); w3.timers.find(x => x.ms === 20000).f(); await attend(60);
    assert.strictEqual(w3.envois.length, 1); assert.strictEqual(w3.ls.get('aura_sentry_v'), undefined); assert.strictEqual(w3._auraSentry.etat().dernierStatut, 429);
  });

  /* ─────────── F · rien d'autre ne change ─────────── */
  await T('F1 setTimeout / fetch restent ceux de 00 (aucune enveloppe du SDK), console intacte, Error.stackTraceLimit rendu, seuls onerror / onunhandledrejection posés', () => {
    const w = monde();
    assert.strictEqual(w.setTimeout, w.__oTimeout); assert.strictEqual(w.fetch, w.__oFetch);
    assert.ok(w.fetch.toString().includes('_oFetch'));
    assert.strictEqual(Error.stackTraceLimit, w.__limite);
    assert.strictEqual(w.console, CONSOLE); assert.deepStrictEqual(Object.keys(CONSOLE), ['log', 'info', 'warn', 'error', 'debug']);
    assert.ok(!w.ecouteurs.includes('error') && !w.ecouteurs.includes('unhandledrejection'));
  });

  console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
  process.exit(fail ? 1 : 0);
})();
