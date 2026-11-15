// banc-n63.js — [GO N° 63 · 15/11/2026] le journal anti-négatif (walletStore[mode].antiNegReserveLog) garde ses 50 lignes les plus RÉCENTES
// (ETAT-AURA8.md, registre G1 n° 63). Ses écrivains (02 holdTradeReserve, releaseTradeReserve, _dispatchSessionTaxes) écrivent en TÊTE (unshift) ;
// la purge de 09b2 (_auraRotatePurge, toutes les 2 min) gardait la QUEUE (cutEnd, 1c-LITE 15/09) = les 50 plus VIEILLES, et effaçait chaque
// ligne neuve au plus 2 min après son écriture. Backup du pont du 15/11 10:39 : AA figé au 13/09, EV au 15/09, alors que l'AA a fait des
// centaines de trades depuis.
// Chaque essai fait tourner le VRAI texte de l'app en vm : 02 (_walletKey, _walletFor, _activeWallet, _installWalletAccessors,
// _WALLET_ACCESSOR_FIELDS, holdTradeReserve, releaseTradeReserve, _dispatchSessionTaxes) et 09b2 (_auraRotatePurge).
// ÉCHOUE sur le code d'avant      BANC_ROOT=<copie du commit c730c1b> node banc-n63.js       (N1 à N4, G et F : tous)
//   N1  120 trades ouverts / fermés dans l'EV (240 lignes), purge toutes les 2 min : après chaque purge, le journal = les 50 lignes les plus
//       récentes, la plus récente en tête (avant : les 50 plus vieilles)
//   N2  journal figé comme au backup (50 lignes du 15/09) + une fermeture le 15/11 + purge : la ligne du 15/11 est en tête et y reste ;
//       50 lignes plus tard, plus aucune ligne du 15/09 (avant : la ligne du 15/11 disparaît, le 15/09 reste)
//   N3  les 3 modes : chaque portefeuille garde SES 50 plus récentes ; S.antiNegReserveLog (accesseur) lit celui du mode à l'écran
//   N4  propriété, 2 000 scénarios tirés (écritures hold / release / dispatch de minuit dans les 3 modes, purges intercalées) : à tout instant,
//       chaque journal est le DÉBUT de la suite de ses écritures, de la plus récente à la plus vieille ; après une purge, il en garde
//       exactement min(50, n). Témoin : l'ancienne purge, sur les MÊMES scénarios, viole la propriété (compté, > 0)
//   G   garde : la purge nouvelle = l'ancienne sur tout le reste de l'état (bougies, historiques, trades par paire, fiscalReserveLog, souvenirs) ;
//       antiNegReserveLog n'a aucun lecteur dans l'app (seuls ses écrivains de 02, tous en tête, et la purge) ; les fichiers que lit la décision,
//       08, 09b1 et 16 au texte de c730c1b (02 hors go n° 103, lu par banc-fixtures/sans-n103.js)
//   F   garde : l'ancienne purge, reconstruite par ce banc, est celle du commit c730c1b au caractère près (empreinte de 09b2) : rien d'autre de 09b2
//       n'a bougé, et c'est contre ELLE que G compare la purge nouvelle
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
function between(s, a, b, what) { const i = s.indexOf(a); assert.ok(i >= 0, what + ' : début introuvable'); const j = s.indexOf(b, i); assert.ok(j > i, what + ' : fin introuvable'); return s.slice(i, j); }
function fnSrc(src, name) {   // le texte d'une fonction de haut niveau (accolades équilibrées, chaînes et commentaires sautés)
  const re = new RegExp('(^|\\n)function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, name + ' introuvable');
  const start = m.index + m[1].length; let d = 0;
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1];
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (!d) return src.slice(start, i + 1); }
  }
  throw new Error(name + ' : fin introuvable');
}

const html = rd('AURA8_v118.html'), s02 = rd('js/02-state-init.js'), s9b2 = require('./banc-fixtures/sans-n105.js')(require('./banc-fixtures/sans-n106.js')(rd('js/09b2-save-load.js'), 'js/09b2-save-load.js'), 'js/09b2-save-load.js');   // [GO N° 105 · 15/11/2026] hors go n° 105 (08, 09b2 : bornes de l'école, banc-n105.js)   // [GO N° 106 · 15/11/2026] hors go n° 106 (08, 09b2 : amplitude de l'école, banc-n106.js)
console.log('▶ banc-n63 · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

// ── l'ancienne purge (c730c1b) : la retouche de go n° 63 remplacée par la ligne d'avant ──
const NEUF = "      // [GO N° 63 · 15/11/2026] (ETAT n° 63) le journal anti-négatif est écrit en TÊTE (02 holdTradeReserve, releaseTradeReserve, _dispatchSessionTaxes :\n"
  + "      // unshift, le plus récent d'abord) : on garde la TÊTE, comme fiscalReserveLog ci-dessus. Avant : cutEnd (1c-LITE) gardait les 50 plus VIEUX et\n"
  + "      // effaçait toute ligne neuve 2 min au plus après son écriture — journal figé au 13/09 (AA) et au 15/09 (EV) dans le backup du 15/11 10:39.\n"
  + "      if (Array.isArray(w.antiNegReserveLog) && w.antiNegReserveLog.length > 50) w.antiNegReserveLog = w.antiNegReserveLog.slice(0, 50);";
const VIEUX = "      w.antiNegReserveLog = cutEnd(w.antiNegReserveLog, 50);   // [1c-LITE]";
const sansN63 = s => s.split(NEUF).length === 2 ? s.replace(NEUF, () => VIEUX) : s;

// ── un « monde » vm : le vrai texte de 02 et de 09b2, une horloge pilotée ──
const PURGE_FIN = '\nsetInterval(_auraRotatePurge, 120000);';
function monde(src9b2) {
  const fields = s02.match(/var _WALLET_ACCESSOR_FIELDS = \[[\s\S]*?\];/); assert.ok(fields, '_WALLET_ACCESSOR_FIELDS');
  const code = [fields[0], '_walletKey', '_walletFor', '_activeWallet', '_installWalletAccessors', 'holdTradeReserve', 'releaseTradeReserve', '_dispatchSessionTaxes']
    .map(x => x.startsWith('var ') ? x : fnSrc(s02, x)).join('\n')
    + '\n' + between(src9b2, 'var _TRADES_GARDES_PAR_PAIRE', PURGE_FIN, 'purge');
  const horloge = { t: Date.UTC(2026, 8, 15, 12) };
  class D extends Date { constructor(...a) { if (a.length) super(...a); else super(horloge.t); } static now() { return horloge.t; } }
  const ctx = { Array, Object, Math, JSON, Number, String, console, Date: D, window: {}, nowStr: () => new D().toISOString().slice(11, 19) };
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis._fns = { holdTradeReserve, releaseTradeReserve, _dispatchSessionTaxes, _auraRotatePurge, _installWalletAccessors };', ctx);
  const wal = () => ({ tradingAccount: 1000, antiNegReserve: 0, antiNegReserveLog: [], fiscalReserveAccount: 0, fiscalReserveLog: [], pairStates: {}, dreamJournal: [], pnlHistory: [] });
  vm.runInContext('var S = { tradingMode: "paperReal", walletStore: { sim: null, paperReal: null, real: null }, realCandles: {}, learningHistory: [], globalMemoryPool: [], dreamJournal: [], agents: [], agentMemories: {} };', ctx);
  ['sim', 'paperReal', 'real'].forEach(m => { ctx.S.walletStore[m] = wal(); });
  ctx._fns._installWalletAccessors();
  return { ctx, S: ctx.S, f: ctx._fns, horloge };
}
const NOUV = () => monde(s9b2), ANC = () => monde(sansN63(s9b2));
const DEUX_MIN = 120000;

// une fermeture « vécue » : la réserve tenue à l'ouverture, rendue à la fermeture (les vrais écrivains de 02)
function trade(W, pair, minutes) {
  W.f.holdTradeReserve(0.5, pair); W.horloge.t += minutes * 30000;
  W.f.releaseTradeReserve(0.5, 0.2, pair); W.horloge.t += minutes * 30000;
}

T('N1 · 120 trades EV, purge toutes les 2 min : après chaque purge, les 50 lignes les plus RÉCENTES, la plus récente en tête', () => {
  const W = NOUV(); W.S.tradingMode = 'paperReal';
  const ecrits = []; let derniere = 0;
  for (let i = 0; i < 120; i++) {
    trade(W, 'P' + i, 1);
    if (W.horloge.t - derniere >= DEUX_MIN) { W.f._auraRotatePurge(); derniere = W.horloge.t;
      const L = W.S.walletStore.paperReal.antiNegReserveLog;
      assert.ok(L.length <= 50, 'taille ' + L.length);
      assert.strictEqual(L[0].pair, 'P' + i, 'tête = la dernière fermeture (' + L[0].pair + ')');
      for (let k = 1; k < L.length; k++) assert.ok(L[k].ts <= L[k - 1].ts, 'ordre : plus récent d\'abord'); }
  }
  W.f._auraRotatePurge();
  const L = W.S.walletStore.paperReal.antiNegReserveLog;
  assert.strictEqual(L.length, 50);
  assert.deepStrictEqual(L.slice(0, 4).map(e => e.source + ' ' + e.pair), ['release P119', 'hold P119', 'release P118', 'hold P118']);
  assert.strictEqual(L[49].pair, 'P95', 'la 50e = le hold de P95');
});

T('N2 · journal figé comme au backup (50 lignes du 15/09) + une fermeture du 15/11 + purge : la ligne du 15/11 reste en tête ; 50 lignes plus tard, plus rien du 15/09', () => {
  const W = NOUV(); W.S.tradingMode = 'paperReal';
  const t0 = Date.UTC(2026, 8, 15, 17, 55);   // la tête du journal EV au backup du 15/11 10:39
  W.S.walletStore.paperReal.antiNegReserveLog = Array.from({ length: 50 }, (_, k) => ({ amount: k % 2 ? 0.03 : -0.03, source: k % 2 ? 'hold' : 'release', pair: 'SOL/USDT', ts: t0 - k * 300000 }));
  W.horloge.t = Date.UTC(2026, 10, 15, 9, 40);
  W.f.releaseTradeReserve(0, 0.21, 'BTC/USDT');   // une position de la voix fermée : rien de réservé, la ligne est écrite quand même
  W.horloge.t += DEUX_MIN; W.f._auraRotatePurge();
  let L = W.S.walletStore.paperReal.antiNegReserveLog;
  assert.strictEqual(L.length, 50); assert.strictEqual(L[0].pair, 'BTC/USDT', 'la ligne du 15/11 survit à la purge'); assert.strictEqual(L[0].ts, Date.UTC(2026, 10, 15, 9, 40));
  for (let i = 0; i < 25; i++) { trade(W, 'X' + i, 4); W.f._auraRotatePurge(); }
  L = W.S.walletStore.paperReal.antiNegReserveLog;
  assert.strictEqual(L.filter(e => e.ts <= t0).length, 0, 'lignes du 15/09 restantes : ' + L.filter(e => e.ts <= t0).length);
  assert.strictEqual(L[0].pair, 'X24');
});

T('N3 · les 3 modes : chaque portefeuille garde SES 50 plus récentes ; S.antiNegReserveLog lit celui du mode à l\'écran', () => {
  const W = NOUV();
  for (let i = 0; i < 90; i++) { ['sim', 'paperReal', 'real'].forEach((m, j) => { if (i % (j + 1)) return; W.S.tradingMode = m; trade(W, m + i, 1); }); if (i % 2) W.f._auraRotatePurge(); }
  W.f._auraRotatePurge();
  const tete = { sim: 'sim89', paperReal: 'paperReal88', real: 'real87' };
  ['sim', 'paperReal', 'real'].forEach(m => {
    const L = W.S.walletStore[m].antiNegReserveLog;
    assert.strictEqual(L.length, 50, m); assert.strictEqual(L[0].pair, tete[m], m + ' : tête ' + L[0].pair);
    assert.ok(L.every(e => e.pair.startsWith(m)), m + ' : une ligne d\'un autre mode');
    W.S.tradingMode = m; assert.strictEqual(W.S.antiNegReserveLog, L, m + ' : accesseur');
  });
});

// ── N4 : propriété sur des scénarios tirés ──
function tirage(graine) { let x = graine >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function scenario(W, r, verifie) {
  const modele = { sim: [], paperReal: [], real: [] }, modes = ['sim', 'paperReal', 'real'];
  W.S.antiNegTaxPart = 0; W.S._taxDispatchDay = new Date(W.horloge.t).toDateString();
  const pre = Math.floor(r() * 3);   // un journal déjà plein (vieilles lignes, la plus récente en tête) dans un mode sur trois
  if (pre === 0) { const m = modes[Math.floor(r() * 3)], n = 30 + Math.floor(r() * 60);
    W.S.walletStore[m].antiNegReserveLog = Array.from({ length: n }, (_, k) => ({ amount: 0.01, source: 'hold', pair: 'OLD', ts: W.horloge.t - (k + 1) * 60000 }));
    modele[m] = W.S.walletStore[m].antiNegReserveLog.slice(); }
  const pas = 20 + Math.floor(r() * 300);
  for (let i = 0; i < pas; i++) {
    const m = modes[Math.floor(r() * 3)]; W.S.tradingMode = m;
    const a = r(); W.horloge.t += 1000 + Math.floor(r() * 90000);
    const avant0 = (W.S.walletStore[m].antiNegReserveLog || [])[0];   // la tête AVANT l'écriture (l'écrivain modifie le tableau en place)
    if (a < 0.42) { W.S.tradingAccount = 1000; W.f.holdTradeReserve(0.01 + r(), 'H' + i); }
    else if (a < 0.86) W.f.releaseTradeReserve(r() < 0.3 ? 0 : r(), r(), 'R' + i);
    else if (a < 0.9) { W.S.antiNegReserve = 1 + r(); W.S.antiNegTaxPart = 0.5; W.horloge.t += 86400000; W.f._dispatchSessionTaxes(); W.S.antiNegTaxPart = 0; }
    else { W.f._auraRotatePurge(); verifie(modele, true); continue; }
    const L = W.S.walletStore[m].antiNegReserveLog;
    if (L && L[0] && L[0] !== avant0) modele[m].unshift(L[0]);
    verifie(modele, false);
  }
  W.f._auraRotatePurge(); verifie(modele, true);
}
function propriete(W, modele, apresPurge) {   // à tout instant : journal = DÉBUT de la suite des écritures (plus récente d'abord)
  for (const m of ['sim', 'paperReal', 'real']) {
    const L = W.S.walletStore[m].antiNegReserveLog || [], M = modele[m];
    for (let k = 0; k < L.length; k++) if (L[k] !== M[k]) return m + ' : ligne ' + k + ' n\'est pas la ' + (k + 1) + 'e plus récente';
    if (apresPurge && L.length !== Math.min(50, M.length)) return m + ' : ' + L.length + ' lignes après purge, ' + Math.min(50, M.length) + ' attendues';
  }
  return null;
}
T('N4 · propriété, 2 000 scénarios (hold / release / dispatch dans les 3 modes, purges intercalées) : journal = début de ses écritures ; après purge min(50, n). Témoin : l\'ancienne purge la viole', () => {
  let viole = null, vus = 0, ecritures = 0, purges = 0;
  for (let s = 0; s < 2000 && !viole; s++) {
    const W = NOUV(), r = tirage(6300 + s);
    scenario(W, r, (modele, ap) => { if (ap) purges++; if (!viole) { const e = propriete(W, modele, ap); if (e) viole = 'scénario ' + s + ' · ' + e; } });
    vus++; ecritures += ['sim', 'paperReal', 'real'].reduce((a, m) => a + W.S.walletStore[m].antiNegReserveLog.length, 0);
  }
  assert.strictEqual(viole, null, viole);
  assert.strictEqual(vus, 2000); assert.ok(purges > 4000, 'purges : ' + purges);
  if (!process.env.BANC_ROOT) {   // témoin : la porte VOIT le défaut
    let n = 0;
    for (let s = 0; s < 2000; s++) { const W = ANC(), r = tirage(6300 + s); let bad = false;
      scenario(W, r, (modele, ap) => { if (!bad && propriete(W, modele, ap)) bad = true; }); if (bad) n++; }
    console.log('     témoin : l\'ancienne purge viole la propriété dans ' + n + ' scénarios sur 2 000');
    assert.ok(n > 500, 'témoin aveugle : ' + n);
  }
});

T('G · garde : purge nouvelle = ancienne hors antiNegReserveLog ; aucun lecteur du journal hors écrivains (tous en tête) et purge ; décision, 08, 09b1, 16 au texte de c730c1b', () => {
  // (1) même effet que l'ancienne purge sur tout le reste de l'état
  for (let s = 0; s < 200; s++) {
    const etat = () => { const R = tirage(9000 + s), arr = (n, f) => Array.from({ length: Math.floor(R() * n) }, (_, i) => f(i));
      const w = () => ({ antiNegReserveLog: arr(140, i => ({ ts: i })), fiscalReserveLog: arr(120, i => ({ ts: i })), dreamJournal: arr(90, i => ({ n: i })), pnlHistory: arr(260, i => i),
        pairStates: { 'BTC/USDT': { trades: arr(160, i => ({ id: i })) }, 'ETH/USDT': { trades: arr(30, i => ({ id: i })) } } });
      return { realCandles: { 'BTC/USDT': { '15m': arr(150, i => ({ c: i })), '1h': arr(40, i => ({ c: i })) } }, learningHistory: arr(300, i => ({ cycle: i })), globalMemoryPool: arr(90, i => ({ n: i })),
        dreamJournal: arr(90, i => ({ n: i })), agents: [{ memory: arr(12, i => ({ metaphor: 'x'.repeat(40 + i * 7) })) }], agentMemories: { a: arr(12, i => ({ metaphor: 'y'.repeat(50 + i * 5) })) },
        walletStore: { sim: w(), paperReal: w(), real: w() } }; };
    const run = src => { const S = etat(), ctx = { S, Array, Object, Math, console, window: {} }; vm.createContext(ctx);
      vm.runInContext(between(src, 'var _TRADES_GARDES_PAR_PAIRE', PURGE_FIN, 'purge') + '\n_auraRotatePurge();', ctx);
      const anl = ['sim', 'paperReal', 'real'].map(m => S.walletStore[m].antiNegReserveLog); ['sim', 'paperReal', 'real'].forEach(m => { delete S.walletStore[m].antiNegReserveLog; }); return [JSON.stringify(S), anl]; };
    const [a, an] = run(s9b2), [b] = run(sansN63(s9b2));
    assert.strictEqual(a, b, 'scénario ' + s + ' : la purge a changé autre chose que le journal anti-négatif');
    an.forEach(L => { assert.ok(L.length <= 50); for (let k = 0; k < L.length; k++) assert.strictEqual(L[k].ts, k, 'la tête est gardée'); });
  }
  // (2) le journal n'a pas de lecteur : chaque mention, dans tout ce que l'app charge, est un écrivain EN TÊTE, une déclaration ou la purge
  const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
  ['js/native-bridge.js', 'guardian-core.js', 'guardian-embed.js', 'aura-guardian.html'].forEach(f => { if (fs.existsSync(path.join(ROOT, f)) && !files.includes(f)) files.push(f); });
  const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const vus = {};
  files.map(f => [f, rd(f)]).concat([['HTML (en ligne)', inline]]).forEach(([f, s]) => s.split('\n').forEach(l => {
    if (!l.includes('antiNegReserveLog') || /^\s*\/\//.test(l)) return;
    const k = f + ' · ' + l.trim().replace(/\s+/g, ' ').slice(0, 200); vus[k] = (vus[k] || 0) + 1;
  }));
  const permis = [
    /^js\/02-state-init\.js · antiNegReserveLog: \[\], \/\/ historique/, /^js\/02-state-init\.js · antiNegReserve:0, antiNegReserveLog:\[\],/,
    /^js\/02-state-init\.js · 'cashLog','fiscalReserveLog','ownFundsLog','antiNegReserveLog',/,
    /^js\/02-state-init\.js · (if ?\(!S\.antiNegReserveLog\) ?S\.antiNegReserveLog = \[\];)$/,
    /^js\/02-state-init\.js · S\.antiNegReserveLog\.unshift\(\{/,
    /^js\/02-state-init\.js · if ?\(S\.antiNegReserveLog\.length > (200\) S\.antiNegReserveLog\.pop\(\);|50\) S\.antiNegReserveLog\.length = 50;)$/,
    /^js\/09b2-save-load\.js · if \(Array\.isArray\(w\.antiNegReserveLog\) && w\.antiNegReserveLog\.length > 50\) w\.antiNegReserveLog = w\.antiNegReserveLog\.slice\(0, 50\);/
  ];
  const autres = Object.keys(vus).filter(k => !permis.some(re => re.test(k)));
  assert.deepStrictEqual(autres, [], 'mention hors écrivains en tête / purge : ' + autres.join(' | '));
  assert.strictEqual(Object.keys(vus).filter(k => /unshift/.test(k)).reduce((a, k) => a + vus[k], 0), 3, 'trois écrivains en tête (hold, release, dispatch)');
  // (3) rien d'autre de l'app n'a bougé
  const H = { 'js/02-state-init.js': '5b82fc4d014f1cb4', 'js/03-per-pair-position-buttons-controls-buid.js': '117f962efbeb4f37', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js': '56365f1615101466',
    'js/08-learning-history-render.js': 'e5b53d1146fba1b1', 'js/09c-auto-open.js': 'cb981dcbb9806d73', 'js/09j-helpers.js': '469be1c86f4a9337', 'js/10f-resolveur-cycle.js': '9935b3138d2a97b0', 'js/15-voix-tendance.js': '9757929e4b295254',
    'js/15b-tendance-reelle.js': '08582a20cd8f495a', 'js/16-fiscal.js': '18d61b55137bc8f3', 'js/09b1-build-snapshot.js': '393c4df7cf1df426' };
  Object.keys(H).forEach(f => assert.strictEqual(h16(require('./banc-fixtures/sans-n103.js')(require('./banc-fixtures/sans-n86d.js')(require('./banc-fixtures/sans-n105.js')(require('./banc-fixtures/sans-n106.js')(require('./banc-fixtures/sans-n80.js')(rd(f), f), f), f), f), f)), H[f], f + ' a changé'));   // [GO N° 105 · 15/11/2026] hors go n° 105 (08, 09b2 : bornes de l'école, banc-n105.js)   // [GO N° 86D · 15/11/2026] hors go n° 86d (03, 08 : champs de saisie TP / SL, banc-n86d.js)   // hors go n° 103 (02, toast arrondi : banc-n103.js, livré pendant go n° 63)   // [GO N° 106 · 15/11/2026] hors go n° 106 (08, 09b2 : amplitude de l'école, banc-n106.js)   // [GO N° 80 · 15/11/2026] hors go n° 80 (15b : liquidation de la poche au prix de la liquidation, banc-n80.js)
});

T('F · garde : l\'ancienne purge reconstruite par ce banc = 09b2 du commit c730c1b au caractère près', () => {
  assert.notStrictEqual(h16(s9b2), '7f258dbbee099bca', '09b2 : la retouche manque');
  assert.strictEqual(h16(sansN63(s9b2)), '7f258dbbee099bca', '09b2 : autre chose a bougé');
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
