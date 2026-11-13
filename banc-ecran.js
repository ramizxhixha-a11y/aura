// banc-ecran.js — [GO ÉCRAN · 13/11/2026] les défauts d'écran n° 82, 83, 84, 85 (ETAT-AURA8.md), affichage seul : rien de ce que lit la décision ne change.
// Fait tourner le VRAI texte des fonctions de l'app en vm. Sur le code d'avant (BANC_ROOT=<copie du commit f6c3920>) : E1 à E6 et C ÉCHOUENT (C : _mcPxText n'existe pas) ; G PASSE
// (garde : ce qui n'a pas le droit de bouger n'a pas bougé).
//   E1 (82) 03 _mcPxText : le prix d'une mini-carte avec les décimales de la paire (DOT 0,83 $ → « $0,83 », avant « $0 » ; XRP sans « $ » avant)
//   E2 (82) 11 pousseur 3×/s : il écrit dans mc_px_DOT_USDT, l'id réel de la carte (avant : mc_px_DOT/USDT, rien d'écrit depuis le 16/08), le même texte que la carte
//   E3 (82) 03 drawMiniCharts écrit le prix par _mcPxText (plus d'arrondi Math.floor)
//   E4 (83) 07 carte capital de l'accueil : LIBRE = caisse + trading (backup du 13/11 19:22 : 1 115,52 $, avant 59,63 $ — mises retranchées deux fois)
//   E5 (85) 07 ENGAGÉ au même format que LIBRE / MAX (fmt$2) ; --t4 et --mag définies ; aucune var(--x) sans repli qui ne soit définie nulle part
//   E6 (84) 06 btcImpactTick : prix plat → aucune alerte « BTC chute » (avant : une toutes les 10 min) ; vraie chute > 3 % → une seule, puis rien pendant 10 min
//   G  09j getCapitalSummary (lue par 02 applyBotSuggestion et 03 suggestStake : mises) et 02 applyBotSuggestion identiques au commit f6c3920
//   C  aucun lecteur de capFree / _mcPxText hors de l'écran (grep de tous les scripts du HTML, du HTML, native-bridge, Guardian)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.message || e).split('\n').slice(0, 3).join('\n     ')); } }
// extrait le texte d'une fonction à partir de son en-tête (accolades équilibrées ; chaînes, gabarits, commentaires sautés)
function fnFrom(src, head) {
  const start = src.indexOf(head); if (start < 0) return null; const st = [];
  for (let i = src.indexOf('{', src.indexOf(')', start)); i < src.length; i++) {
    const c = src[i], n2 = src[i + 1], top = st[st.length - 1];
    if (top === 't') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n2 === '{') { st.push('x'); i++; } continue; }
    if (c === '/' && n2 === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && n2 === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } continue; }
    if (c === '`') { st.push('t'); continue; }
    if (c === '{') { st.push('b'); continue; }
    if (c === '}') { st.pop(); if (!st.length) return src.slice(start, i + 1); }
  }
  throw new Error('fin introuvable : ' + head);
}
const fnSrc = (src, name) => { const m = new RegExp('(^|\\n)function ' + name.replace(/\$/g, '\\$') + '\\s*\\(').exec(src); return m ? fnFrom(src.slice(m.index + m[1].length), 'function ' + name) : null; };
const h16 = s => crypto.createHash('sha256').update(s || '').digest('hex').slice(0, 16);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s06 = rd('js/06-v63-patterns-chartistes.js'),
      s07 = rd('js/07-v90-mode-bunker-sos.js'), s09j = rd('js/09j-helpers.js'), s11 = rd('js/11-gestion-paires.js'), css01 = rd('css/01-base.css'), html = rd('AURA8_v118.html');
const fmt2 = fnSrc(s02, 'fmt$2');
// les paires du backup du 13/11 19:22 (décimales de 02 et de 11 gestion des paires)
const PAIRS = { 'BTC/USDT': { dec: 0 }, 'XRP/USDT': { dec: 4 }, 'AVAX/USDT': { dec: 2 }, 'DOT/USDT': { dec: 2 }, 'EUR/USDT': { dec: 3 } };
const PX = { 'BTC/USDT': 68890.41, 'XRP/USDT': 1.0253, 'AVAX/USDT': 8.396, 'DOT/USDT': 0.83, 'EUR/USDT': 1.1036 };
const NB = '\u202f';   // espace fine insécable des milliers (fr-FR)

console.log('▶ banc-ecran — go écran (n° 82–85), affichage seul');
T('E1 (82) · _mcPxText : DOT « $0,83 », AVAX « $8,40 », XRP « $1,0253 », BTC « $68 890 », EUR « $1,104 » ; dec corrompu sans erreur', () => {
  const f = fnSrc(s03, '_mcPxText'); assert.ok(f, '_mcPxText absente de 03');
  const c = { PAIRS: Object.assign({}, PAIRS, { 'BAD/USDT': { dec: 'abc' }, 'BIG/USDT': { dec: 500 } }), Number, Math, Intl }; vm.createContext(c);
  vm.runInContext(s03.slice(s03.indexOf('const _mcPxFmt'), s03.indexOf('const _mcPxFmt') + 40).split('\n')[0] + '\n' + f, c);
  assert.strictEqual(c._mcPxText('BAD/USDT', 1.5), '$1,5000', 'dec corrompu'); assert.strictEqual(c._mcPxText('BIG/USDT', 1.5), '$1,50000000', 'dec > 8 borné');
  assert.strictEqual(c._mcPxText('DOT/USDT', 0.83), '$0,83'); assert.strictEqual(c._mcPxText('AVAX/USDT', 8.396), '$8,40');
  assert.strictEqual(c._mcPxText('XRP/USDT', 1.0253), '$1,0253'); assert.strictEqual(c._mcPxText('BTC/USDT', 68890.41), '$68' + NB + '890');
  assert.strictEqual(c._mcPxText('EUR/USDT', 1.1036), '$1,104');
});
T('E2 (82) · pousseur 3×/s de 11 : écrit dans mc_px_DOT_USDT, le même texte que la carte', () => {
  const f = fnFrom(s11, 'function _tickPricePush'); assert.ok(f, 'pousseur introuvable');
  const el = {}; Object.keys(PAIRS).forEach(p => { el['mc_px_' + p.replace('/', '_')] = { textContent: '$0' }; });
  const c = { PAIRS, Number, Object, S: { pairStates: Object.fromEntries(Object.entries(PX).map(([p, v]) => [p, { price: v }])) },
    document: { hidden: false, getElementById: id => el[id] || null } };
  c.Math = Math; c.Intl = Intl; vm.createContext(c); const g = fnSrc(s03, '_mcPxText'); if (g) vm.runInContext('const _mcPxFmt = {};\n' + g, c);
  vm.runInContext('(' + f + ')()', c);
  assert.strictEqual(el.mc_px_DOT_USDT.textContent, '$0,83', 'DOT : ' + el.mc_px_DOT_USDT.textContent);
  Object.keys(PAIRS).forEach(p => assert.strictEqual(el['mc_px_' + p.replace('/', '_')].textContent, c._mcPxText(p, PX[p]), p));
});
T('E3 (82) · drawMiniCharts écrit le prix par _mcPxText, plus par Math.floor', () => {
  const f = fnSrc(s03, 'drawMiniCharts'); assert.ok(/_mcPxText\(pair, ps\.price\)/.test(f), 'drawMiniCharts n\'appelle pas _mcPxText');
  assert.ok(!/pxEl\.textContent = cfg\.dec>=4/.test(f), 'ancien arrondi encore présent');
});
// la carte capital de l'accueil (07) : le bloc qui calcule cap, rejoué sur l'état du backup du 13/11 19:22
const capBlock = (() => { const i = s07.indexOf('  const _capEng  = '), j = s07.indexOf('  const capFill = document.getElementById(\'capBarFill\');', i); return i > 0 && j > i ? s07.slice(i, j) : null; })();
function capOf(S) { const c = { S, Math, Number }; vm.createContext(c); vm.runInContext(capBlock + '\nthis.__cap = cap;', c); return c.__cap; }
T('E4 (83) · LIBRE = caisse + trading : 1 115,52 $ (11 positions, 1 055,89 $ engagés, déjà débités du trading)', () => {
  assert.ok(capBlock, 'bloc capital introuvable dans 07');
  const S = { cashAccount: 0, tradingAccount: 1115.5240136560124, leverageBorrowed: 0, _autoLevBorrowed: 0, openPositions: Array.from({ length: 11 }, () => ({ stakeUsdt: 95.99 })) };
  const cap = capOf(S); assert.ok(Math.abs(cap.free - 1115.5240136560124) < 1e-9, 'LIBRE = ' + cap.free);
  const S2 = { cashAccount: 40, tradingAccount: 60, leverageBorrowed: 0, openPositions: [] }; assert.strictEqual(capOf(S2).free, 100, 'sans position : caisse + trading');
});
T('E5 (85) · ENGAGÉ en fmt$2 ; --t4 et --mag définies ; aucune var(--x) sans repli indéfinie', () => {
  assert.ok(/const _capStakedStr = fmt\$2\(cap\.staked\)/.test(s07), 'ENGAGÉ pas en fmt$2');
  const r0 = css01.search(/:root\s*\{/), root = css01.slice(r0, css01.indexOf('}', r0)); assert.ok(r0 >= 0, ':root introuvable');
  assert.ok(/--t4\s*:\s*#/.test(root) && /--mag\s*:\s*#/.test(root), '--t4 / --mag absentes de :root (01-base.css)');
  const cssAll = fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css')).map(f => rd('css/' + f)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const jsAll = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && !/sentry-sdk/.test(f)).map(f => rd('js/' + f)).join('\n').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const defined = new Set([...(cssAll + html + jsAll).matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map(m => m[1]).concat([...jsAll.matchAll(/setProperty\(\s*['"](--[A-Za-z0-9_-]+)/g)].map(m => m[1])));
  const und = [...new Set([...(cssAll + html + jsAll).matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)].map(m => m[1]).filter(v => !defined.has(v)))];
  assert.deepStrictEqual(und, [], 'variables sans repli jamais définies : ' + und.join(', '));
});
T('E6 (84) · btcImpactTick : prix plat → 0 alerte ; chute > 3 % → 1 ; la chute continue < 10 min → 0 ; après 10 min → 1', () => {
  const f = fnSrc(s06, 'btcImpactTick'); assert.ok(f);
  let t = 1e12; const toasts = [];
  const c = { S: { pairStates: { 'BTC/USDT': { price: 68890 } } }, PAIRS: {}, Object, _BTC_PAIR: 'BTC/USDT', Date: { now: () => t }, showToast: m => toasts.push(m), window: {} };
  vm.createContext(c); vm.runInContext('let _btcHistory = [], _btcPairHist = {}; ' + f + '\nlet _btcLastAlertTs = 0;', c);
  for (let i = 0; i < 30; i++) { t += 60000; vm.runInContext('btcImpactTick()', c); }
  assert.strictEqual(toasts.length, 0, 'prix plat 30 min : ' + JSON.stringify(toasts));
  for (let i = 0; i < 5; i++) { t += 1000; c.S.pairStates['BTC/USDT'].price *= 0.99; vm.runInContext('btcImpactTick()', c); }
  assert.strictEqual(toasts.length, 1, 'vraie chute : ' + JSON.stringify(toasts)); assert.ok(/BTC chute de -\d/.test(toasts[0]), toasts[0]);
  for (let i = 0; i < 5; i++) { t += 1000; c.S.pairStates['BTC/USDT'].price *= 0.99; vm.runInContext('btcImpactTick()', c); }
  assert.strictEqual(toasts.length, 1, 'une seule alerte par 10 min');
  t += 601000; for (let i = 0; i < 5; i++) { t += 1000; c.S.pairStates['BTC/USDT'].price *= 0.99; vm.runInContext('btcImpactTick()', c); }
  assert.strictEqual(toasts.length, 2, 'nouvelle chute après 10 min');
});
T('G · getCapitalSummary (09j) et applyBotSuggestion (02), lues pour des mises, identiques au commit f6c3920', () => {
  assert.strictEqual(h16(fnSrc(s09j, 'getCapitalSummary')), '113562fbebdc6a31', 'getCapitalSummary a changé');
  assert.strictEqual(h16(fnSrc(s02, 'applyBotSuggestion')), '3fb037063c1325e2', 'applyBotSuggestion a changé');
});
T('C · capFree et _mcPxText ne sont lus que par l\'écran (07 carte capital, 03 mini-cartes, 11 pousseur)', () => {
  const files = [...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
  ['js/native-bridge.js', 'guardian-core.js', 'guardian-embed.js'].forEach(f => { if (fs.existsSync(path.join(ROOT, f)) && !files.includes(f)) files.push(f); });
  const who = re => files.filter(f => re.test(rd(f))).sort();
  assert.deepStrictEqual(who(/['"]capFree['"]/), ['js/07-v90-mode-bunker-sos.js'], 'capFree : ' + who(/['"]capFree['"]/));
  assert.deepStrictEqual(who(/_mcPxText/), ['js/03-per-pair-position-buttons-controls-buid.js', 'js/11-gestion-paires.js'], '_mcPxText : ' + who(/_mcPxText/));
  assert.ok(!/capFree|_mcPxText/.test(html.replace(/id="capFree"/g, '')), 'le HTML ne les lit pas');
});
console.log('\n' + (fail ? '❌ ' + fail + ' échec(s)' : '✅ ' + pass + '/' + pass + ' tests passés'));
process.exit(fail ? 1 : 0);
