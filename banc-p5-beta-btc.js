// banc-p5-beta-btc.js — [P5 · 06/09/2026] BRIQUE 5 DU PONT : bêta BTC.
// Charge les modules LIVRÉS 10e (pour _getPairReturns) et 10e5 en vm avec une horloge, une timeframe
// et un S pilotés (bougies synthétiques puis bougies Binance réelles de aura_live.json), puis rejoue
// le texte LIVRÉ de 09c (veto BETA dans l'entonnoir + mise ×0.5 avant l'anti-négatif), vérifie la
// source vivante (02), le HTML (76 ressources) et l'intégrité de 10f.
// Lancer à la racine du dépôt : node banc-p5-beta-btc.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let ok = 0, ko = 0;
function T(name, fn) { try { fn(); ok++; console.log('  ✅ ' + name); } catch (e) { ko++; console.log('  ❌ ' + name + '\n     ' + (e && e.message)); } }
const MIN = 60000;

console.log('── A · 10e5 livré : _betaOf / _betaVerdict / _btcRecentMovePct / _betaBtcForPair ──');
let _fakeNow = new Date(2026, 8, 12, 14, 0).getTime();
let _tf = '15m';
const S = { tradingMode: 'sim', pairStates: {}, realCandles: {}, chainLog: [], brainLog: [], adaptiveState: {} };
const ctx = { window: {}, S, PAIRS: { 'BTC/USDT': {}, 'ETH/USDT': {}, 'SOL/USDT': {} }, _getActiveRealTimeframe: () => _tf, console,
  Date: class extends Date { constructor(...a) { super(a.length ? a[0] : _fakeNow); } static now() { return _fakeNow; } }, Number, Math, String, Array, Object, Infinity, isFinite, setInterval: () => 0, setTimeout: () => 0, document: { getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/10e-helpers-adaptatifs.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('js/10e5-beta-btc.js', 'utf8'), ctx);
const B = ctx._betaOf, V = ctx._betaVerdict;
// série de bougies à partir d'une liste de clôtures
const cnd = closes => closes.map((c, i) => ({ ts: i, o: c, h: c, l: c, c: c, n: 1 }));
// 30 clôtures BTC avec des retours alternés ±1 % (variance non nulle), paire = BTC × k en retours
const btcCloses = []; let p = 100; for (let i = 0; i < 30; i++) { p = p * (1 + (i % 2 ? 0.01 : -0.01)); btcCloses.push(p); }
const scaled = k => { const out = []; let q = 10; out.push(q); for (let i = 1; i < 30; i++) { q = q * Math.pow(btcCloses[i] / btcCloses[i - 1], k); out.push(q); } return out; };
const rets = closes => { const r = []; for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1])); return r; };

T('_betaOf : paire = 2× les retours BTC → β 2.000', () => { assert.strictEqual(B(rets(scaled(2)), rets(btcCloses)), 2); });
T('_betaOf : paire inverse (−1.5×) → β −1.500', () => { assert.strictEqual(B(rets(scaled(-1.5)), rets(btcCloses)), -1.5); });
T('_betaOf : < 10 retours → null ; BTC constant (variance 0) → null ; tableaux absents → null', () => {
  assert.strictEqual(B(rets(scaled(2)).slice(0, 9), rets(btcCloses).slice(0, 9)), null);
  assert.strictEqual(B(rets(scaled(2)), new Array(29).fill(0)), null);
  assert.strictEqual(B(null, rets(btcCloses)), null);
});
T('_betaVerdict : β null → neutre', () => { const o = V(null, -2, 'long', '15m'); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeFactor, 1); });
T('_betaVerdict : BTC −1.00 % · β 0.8 · LONG → veto, raison complète', () => {
  const o = V(0.8, -1, 'long', '15m'); assert.strictEqual(o.veto, true);
  assert.strictEqual(o.reason, 'BTC en chute · -1.00 % sur 5 bougies 15m · β 0.80 > 0.50 (la paire suit BTC) → LONG refusé');
});
T('_betaVerdict : BTC −0.99 % → pas de veto', () => { assert.strictEqual(V(0.8, -0.99, 'long', '15m').veto, false); });
T('_betaVerdict : BTC −3 % · β 0.5 (pas > 0.5) → pas de veto ; β 0.51 → veto', () => { assert.strictEqual(V(0.5, -3, 'long', '15m').veto, false); assert.strictEqual(V(0.51, -3, 'long', '15m').veto, true); });
T('_betaVerdict : BTC −3 % · β 2 · SHORT → pas de veto (on suit la chute)', () => { assert.strictEqual(V(2, -3, 'short', '15m').veto, false); });
T('_betaVerdict : BTC −3 % · β −2 (inverse) · LONG → pas de veto', () => { assert.strictEqual(V(-2, -3, 'long', '15m').veto, false); });
T('_betaVerdict : BTC inconnu (null) · β 4 · LONG → pas de veto, mise ×0.5', () => { const o = V(4, null, 'long', '15m'); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeFactor, 0.5); assert.strictEqual(o.stakeReason, 'β 4.00 (|β| > 3, très sensible à BTC) → mise ×0.5'); });
T('_betaVerdict : β 3 exactement → mise libre ; β −3.2 → ×0.5 ; β 1.2 → libre', () => { assert.strictEqual(V(3, 0, 'long', '15m').stakeFactor, 1); assert.strictEqual(V(-3.2, 0, 'long', '15m').stakeFactor, 0.5); assert.strictEqual(V(1.2, 0, 'long', '15m').stakeFactor, 1); });
T('_betaVerdict : veto prime sur la mise (β 4, BTC −2 %, LONG → veto, stakeFactor 1)', () => { const o = V(4, -2, 'long', '15m'); assert.strictEqual(o.veto, true); assert.strictEqual(o.stakeFactor, 1); });

S.realCandles = { 'BTC/USDT': { '15m': cnd(btcCloses) }, 'ETH/USDT': { '15m': cnd(scaled(1.2)) }, 'SOL/USDT': { '15m': cnd(scaled(3.5)) } };
// _getPairReturns (10e) exige que la paire existe dans S.pairStates (toujours vrai dans l'app : PAIRS init 02)
S.pairStates = { 'BTC/USDT': { candles: [] }, 'ETH/USDT': { candles: [] }, 'SOL/USDT': { candles: [] } };
T('_btcRecentMovePct : 6 dernières clôtures BTC réelles → % arrondi au centième', () => {
  const c = btcCloses; const exp = Math.round((c[29] / c[24] - 1) * 10000) / 100;
  assert.strictEqual(ctx._btcRecentMovePct('15m'), exp);
});
T('_btcRecentMovePct : timeframe sans bougies réelles ni ps.candles → null', () => { assert.strictEqual(ctx._btcRecentMovePct('1h'), null); });
T('_btcRecentMovePct : repli sur ps.candles de BTC si bougies réelles absentes', () => {
  const keep = S.pairStates; S.pairStates = { 'BTC/USDT': { candles: cnd([100, 100, 100, 100, 100, 100, 98]) } };
  assert.strictEqual(ctx._btcRecentMovePct('1h'), -2); S.pairStates = keep;
});
T('_betaBtcForPair : BTC/USDT → 1 ; ETH ≈ 1.2 ; SOL ≈ 3.5 (bougies réelles 15m)', () => {
  assert.strictEqual(ctx._betaBtcForPair('BTC/USDT', '15m', _fakeNow), 1);
  assert.strictEqual(ctx._betaBtcForPair('ETH/USDT', '15m', _fakeNow), 1.2);
  assert.strictEqual(ctx._betaBtcForPair('SOL/USDT', '15m', _fakeNow), 3.5);
});
T('cache RAM 5 min par paire/timeframe : valeur figée, puis recalcul après 5 min ou changement de tf', () => {
  S.realCandles['ETH/USDT']['15m'] = cnd(scaled(2));
  assert.strictEqual(ctx._betaBtcForPair('ETH/USDT', '15m', _fakeNow + 4 * MIN), 1.2);
  assert.strictEqual(ctx._betaBtcForPair('ETH/USDT', '15m', _fakeNow + 5 * MIN), 2);
  S.realCandles['ETH/USDT']['1h'] = cnd(scaled(0.7)); S.realCandles['BTC/USDT']['1h'] = cnd(btcCloses);
  _tf = '1h';   // _getPairReturns (10e) lit la timeframe active : la clé de cache et la donnée suivent la même horloge
  assert.strictEqual(ctx._betaBtcForPair('ETH/USDT', '1h', _fakeNow + 5 * MIN), 0.7); _tf = '15m';
});
T('_betaGateForOpen : SOL LONG, BTC stable → mise ×0.5 ; BTC −2 % → veto ; SHORT → mise ×0.5', () => {
  _fakeNow += 10 * MIN;
  let g = ctx._betaGateForOpen('SOL/USDT', 'long'); assert.strictEqual(g.veto, false); assert.strictEqual(g.stakeFactor, 0.5); assert.strictEqual(g.tf, '15m');
  const drop = btcCloses.slice(); drop[29] = drop[24] * 0.98; S.realCandles['BTC/USDT']['15m'] = cnd(drop);
  g = ctx._betaGateForOpen('SOL/USDT', 'long'); assert.strictEqual(g.veto, true); assert.ok(/BTC en chute · -2\.00 % sur 5 bougies 15m · β 3\.50/.test(g.reason), g.reason);
  g = ctx._betaGateForOpen('SOL/USDT', 'short'); assert.strictEqual(g.veto, false); assert.strictEqual(g.stakeFactor, 0.5);
  g = ctx._betaGateForOpen('BTC/USDT', 'long'); assert.strictEqual(g.veto, true); assert.strictEqual(g.beta, 1);
  S.realCandles['BTC/USDT']['15m'] = cnd(btcCloses);
});
T('_betaGateForOpen : paire inconnue → neutre sans exception ; realCandles absent → neutre', () => {
  assert.strictEqual(ctx._betaGateForOpen('XXX/USDT', 'long').veto, false);
  const rc = S.realCandles; S.realCandles = null; const g = ctx._betaGateForOpen('ETH/USDT', 'long'); assert.strictEqual(g.veto, false); assert.strictEqual(g.stakeFactor, 1); S.realCandles = rc;
});
T('bougies Binance RÉELLES (aura_live.json, 15m) : β mesurable pour toutes les paires, BTC = 1, |β| plausible (< 3)', () => {
  const live = JSON.parse(fs.readFileSync('aura_live.json', 'utf8')).aura;
  S.realCandles = live.realCandles; S.pairStates = live.pairStates; _fakeNow += 10 * MIN;
  const betas = {};
  Object.keys(live.realCandles).forEach(pr => { betas[pr] = ctx._betaBtcForPair(pr, '15m', _fakeNow); });
  assert.strictEqual(betas['BTC/USDT'], 1);
  Object.entries(betas).forEach(([pr, b]) => { assert.ok(typeof b === 'number' && isFinite(b), pr + ' β ' + b); assert.ok(Math.abs(b) < 3, pr + ' β ' + b); });
  assert.ok(typeof ctx._btcRecentMovePct('15m') === 'number');
  console.log('     β 15m réels : ' + Object.entries(betas).map(([k, v]) => k.replace('/USDT', '') + ' ' + v.toFixed(2)).join(' · ') + ' · BTC 5 bougies ' + ctx._btcRecentMovePct('15m') + ' %');
});

console.log('\n── B · 09c livré : veto BETA dans l’entonnoir + mise ×0.5 (texte réel) ──');
const src09c = fs.readFileSync('js/09c-auto-open.js', 'utf8');
T('veto BETA placé APRÈS le veto BEHAV et AVANT le Smart Sizer ; mise ×0.5 APRÈS le plafond comportemental et AVANT l’anti-négatif', () => {
  const iB = src09c.indexOf('_bg = _behavGateForOpen(pair);'), iT = src09c.indexOf('_bt = _betaGateForOpen(pair, side);'), iSizer = src09c.indexOf('// Smart Sizer applique le multiplicateur Kelly');
  const iCap = src09c.indexOf('if (_bg && _bg.stakeCap > 0 && baseStake > _bg.stakeCap)'), iRed = src09c.indexOf('if (_bt && _bt.stakeFactor < 1)'), iNeg = src09c.indexOf('// VALIDATION ANTI-NÉGATIF');
  assert.ok(iB > 0 && iT > iB && iSizer > iT); assert.ok(iCap > iSizer && iRed > iCap && iNeg > iRed);
  assert.strictEqual((src09c.match(/_betaGateForOpen\(/g) || []).length, 1);
  assert.strictEqual((src09c.match(/_behavGateForOpen\(/g) || []).length, 1); assert.strictEqual((src09c.match(/_ecoGateForOpen\(/g) || []).length, 1); assert.strictEqual((src09c.match(/_corrGateForOpen\(/g) || []).length, 1);
  assert.ok(src09c.includes('const _betaVetoLogTs = {};'));
});
const vetoTxt = src09c.slice(src09c.indexOf('  let _bt = null;'), src09c.indexOf('  // Smart Sizer applique'));
const redTxt  = src09c.slice(src09c.indexOf('  if (_bt && _bt.stakeFactor < 1)'), src09c.indexOf('  // ──────────────────────────────────────────────────────────────\n  // VALIDATION ANTI-NÉGATIF'));
let _gate = { veto: false, reason: null, stakeFactor: 1, stakeReason: null };
const c09 = { S, _betaGateForOpen: () => _gate, rndHash: () => 'h', nowStr: () => 't', window: {}, _toasts: [], Date: ctx.Date, String, Math, Number,
  _stakeFloor: () => 2, _stakeRound: x => Math.round(x * 10) / 10 };
c09.showToast = m => c09._toasts.push(m);
vm.createContext(c09);
vm.runInContext('const _betaVetoLogTs = {};\nfunction _open(pair, side, baseStake){' + vetoTxt + redTxt + '\nreturn baseStake;}', c09);
T('veto → EVAL reçoit BETA, journal ₿ + toast, return', () => {
  S.brainLog = []; S.chainLog = []; c09._toasts = []; _gate = { veto: true, reason: 'BTC en chute · -2.00 % sur 5 bougies 15m · β 3.50 > 0.50 (la paire suit BTC) → LONG refusé', stakeFactor: 1, stakeReason: null };
  const r = c09._open('SOL/USDT', 'long', 20);
  assert.strictEqual(r, undefined); assert.strictEqual(S.brainLog[0].event, 'BETA'); assert.strictEqual(S.brainLog[0].pair, 'SOL/USDT'); assert.strictEqual(S.brainLog[0].reason, _gate.reason);
  assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(S.chainLog[0].icon, '₿'); assert.ok(S.chainLog[0].desc.startsWith('Bêta BTC · SOL/USDT LONG refusé · BTC en chute'), S.chainLog[0].desc);
  assert.strictEqual(c09._toasts.length, 1); assert.ok(c09._toasts[0].startsWith('₿ SOL/USDT LONG refusé'));
});
T('2e refus dans les 5 min : EVAL à nouveau, journal/toast silencieux (anti-flood)', () => { c09._open('SOL/USDT', 'long', 20); assert.strictEqual(S.brainLog.length, 2); assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(c09._toasts.length, 1); });
T('autre paire → journal + toast (anti-flood PAR paire)', () => { c09._open('ETH/USDT', 'long', 20); assert.strictEqual(S.chainLog.length, 2); assert.strictEqual(c09._toasts.length, 2); });
T('après 5 min : journal + toast à nouveau', () => { _fakeNow += 5 * MIN + 1000; c09._open('SOL/USDT', 'long', 20); assert.strictEqual(S.chainLog.length, 3); });
T('pas de veto, stakeFactor 0.5, mise 20 → 10, journal ₿ « mise $20 → $10 (β …) »', () => {
  S.chainLog = []; _gate = { veto: false, reason: null, stakeFactor: 0.5, stakeReason: 'β 3.50 (|β| > 3, très sensible à BTC) → mise ×0.5' };
  const r = c09._open('SOL/USDT', 'long', 20); assert.strictEqual(r, 10);
  assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(S.chainLog[0].desc, 'Bêta BTC · SOL/USDT · mise $20 → $10 (β 3.50 (|β| > 3, très sensible à BTC) → mise ×0.5)');
});
T('mise 3 × 0.5 = 1.5 sous le plancher (2) → mise = plancher 2, pas moins', () => { S.chainLog = []; assert.strictEqual(c09._open('SOL/USDT', 'long', 3), 2); assert.strictEqual(S.chainLog.length, 1); });
T('mise 2 = plancher → inchangée, pas de journal', () => { S.chainLog = []; assert.strictEqual(c09._open('SOL/USDT', 'long', 2), 2); assert.strictEqual(S.chainLog.length, 0); });
T('stakeFactor 1 → mise libre, pas de journal', () => { S.chainLog = []; _gate = { veto: false, stakeFactor: 1, stakeReason: null }; assert.strictEqual(c09._open('ETH/USDT', 'long', 30), 30); assert.strictEqual(S.chainLog.length, 0); });
T('porte qui crashe → ouverture continue sans réduction (try/catch, _bt null)', () => { c09._betaGateForOpen = () => { throw new Error('boom'); }; assert.strictEqual(c09._open('SOL/USDT', 'long', 30), 30); c09._betaGateForOpen = () => _gate; });

console.log('\n── C · source vivante, HTML, intégrité ──');
const src02 = fs.readFileSync('js/02-state-init.js', 'utf8');
T('02 : _aggregateRealPrice alimente S.realCandles pour TOUTES les paires (appelé au sync des prix) ; realCandles NON multiplexé ; persisté', () => {
  assert.ok((src02.match(/_aggregateRealPrice\(pair, realPrice\)/g) || []).length >= 2);
  const f = src02.slice(src02.indexOf('var _WALLET_ACCESSOR_FIELDS = ['), src02.indexOf('];', src02.indexOf('var _WALLET_ACCESSOR_FIELDS = [')));
  assert.ok(!f.includes("'realCandles'"));
  assert.ok(fs.readFileSync('js/09b1-build-snapshot.js', 'utf8').includes('realCandles:'));
});
T('10e5 : module ≤ 500 lignes, lit uniquement S.realCandles / S.pairStates', () => {
  const src = fs.readFileSync('js/10e5-beta-btc.js', 'utf8');
  assert.ok(src.split('\n').length <= 500);
  assert.deepStrictEqual([...new Set(src.match(/\bS\.[a-zA-Z_]+/g))].sort(), ['S.pairStates', 'S.realCandles']);
});
T('10f NON touché : aucune référence bêta', () => { assert.ok(!fs.readFileSync('js/10f-resolveur-cycle.js', 'utf8').includes('_beta')); });
const html = fs.readFileSync('AURA8_v118.html', 'utf8');
T('HTML : 10e5 chargé juste après 10e4 et avant 10f, même token que DOC_V sur 76 ressources, anciens tokens absents', () => {
  const tok = (html.match(/DOC_V = '([0-9a-z]+)'/) || [])[1]; assert.ok(tok);
  const i4 = html.indexOf('js/10e4-gardes-comportementales.js?v=' + tok), i5 = html.indexOf('js/10e5-beta-btc.js?v=' + tok), iF = html.indexOf('js/10f-resolveur-cycle.js?v=' + tok);
  assert.ok(i4 > 0 && i5 > i4 && iF > i5);
  assert.strictEqual((html.match(new RegExp('\\?v=' + tok, 'g')) || []).length, 76);
  assert.ok(!html.includes('20260906c') && !html.includes('20260906b') && !html.includes('20260906a'));
});
T('versions en tête : 10e5 et 09c = token DOC_V', () => {
  const tok = (html.match(/DOC_V = '([0-9a-z]+)'/) || [])[1];
  assert.ok(fs.readFileSync('js/10e5-beta-btc.js', 'utf8').startsWith('// ▓▓▓ VERSION ' + tok + ' ▓▓▓'));
  assert.ok(src09c.startsWith('// ▓▓▓ VERSION ' + tok + ' ▓▓▓'));
});

console.log('\n' + ok + '/' + (ok + ko) + ' tests passés' + (ko ? ' · ' + ko + ' ÉCHEC(S)' : ''));
process.exit(ko ? 1 : 0);
