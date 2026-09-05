// banc-p4-comportement.js — [P4 · 06/09/2026] BRIQUE 4 DU PONT : gardes comportementales.
// Charge le module LIVRÉ 10e4 en vm avec une horloge, un régime et un S pilotés, puis rejoue le texte
// LIVRÉ de 09c (veto BEHAV dans l'entonnoir + plafond de mise avant l'anti-négatif), vérifie l'écrivain
// 02 (ps.trades), le multiplexage par mode, le HTML (75 ressources) et l'intégrité de 10f.
// Lancer à la racine du dépôt : node banc-p4-comportement.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let ok = 0, ko = 0;
function T(name, fn) { try { fn(); ok++; console.log('  ✅ ' + name); } catch (e) { ko++; console.log('  ❌ ' + name + '\n     ' + (e && e.message)); } }
const MIN = 60000;

console.log('── A · 10e4 livré : _behavVerdict / _behavGateForOpen ──');
let _fakeNow = new Date(2026, 8, 12, 14, 0).getTime();   // horloge pilotée, heure LOCALE
let _regime = 'calm';
const S = { pairStates: {}, chainLog: [], brainLog: [] };
const ctx = { window: {}, S, detectMarketRegime: () => _regime, Date: class extends Date { constructor(...a) { super(a.length ? a[0] : _fakeNow); } static now() { return _fakeNow; } }, Number, Math, String, Array, Object, Infinity };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/10e4-gardes-comportementales.js', 'utf8'), ctx);
const V = ctx._behavVerdict;
const close = (ago, pnl, stake) => ({ type: 'position', pnlUsdt: pnl, stakeUsdt: stake, ts: _fakeNow - ago });
const open  = (ago, stake) => ({ type: 'open', stakeUsdt: stake, ts: _fakeNow - ago });

T('paire sans trade → neutre', () => { const o = V({ 'BTC/USDT': { trades: [] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeCap, 0); assert.strictEqual(o.dayCount, 0); assert.strictEqual(o.dayCap, 40); });
T('perte −$3 il y a 5 min → veto cooldown, reste 10 min, stakeCap = mise perdante', () => {
  const o = V({ 'BTC/USDT': { trades: [close(5 * MIN, -3, 12.5)] } }, 'BTC/USDT', 'calm', _fakeNow);
  assert.strictEqual(o.veto, true); assert.strictEqual(o.coolLeftMin, 10); assert.strictEqual(o.stakeCap, 12.5);
  assert.ok(/Cooldown après perte · dernière clôture −\$3\.00 il y a 5 min \(15 min requis, reste 10 min\)/.test(o.reason), o.reason);
});
T('perte il y a 14 min 59 s → encore veto (reste 1 min)', () => { const o = V({ 'BTC/USDT': { trades: [close(15 * MIN - 1000, -1, 10)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, true); assert.strictEqual(o.coolLeftMin, 1); });
T('perte il y a 15 min exactement → plus de veto, stakeCap conservé', () => { const o = V({ 'BTC/USDT': { trades: [close(15 * MIN, -1, 10)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeCap, 10); assert.strictEqual(o.lastLossUsd, -1); });
T('gain il y a 2 min → ni veto ni plafond de mise', () => { const o = V({ 'BTC/USDT': { trades: [close(2 * MIN, 0.8, 10)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeCap, 0); });
T('perte puis gain : la DERNIÈRE clôture décide (gain → libre)', () => { const o = V({ 'BTC/USDT': { trades: [close(30 * MIN, -5, 10), close(3 * MIN, 1, 10)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeCap, 0); });
T('gain puis perte : la dernière est une perte → veto', () => { const o = V({ 'BTC/USDT': { trades: [close(30 * MIN, 5, 10), close(3 * MIN, -1, 8)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, true); assert.strictEqual(o.stakeCap, 8); });
T('entrée « open » après la perte n’efface pas le cooldown (seule une clôture compte)', () => { const o = V({ 'BTC/USDT': { trades: [close(3 * MIN, -1, 8), open(1 * MIN, 8)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, true); });
T('trade neutre (pnl 0) → pas une perte', () => { const o = V({ 'BTC/USDT': { trades: [close(1 * MIN, 0, 10)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeCap, 0); });
T('perte sans stakeUsdt numérique → cooldown mais pas de stakeCap', () => { const o = V({ 'BTC/USDT': { trades: [{ type: 'position', pnlUsdt: -1, ts: _fakeNow - MIN }] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, true); assert.strictEqual(o.stakeCap, 0); });
T('clôture sans ts (ancienne entrée) ignorée', () => { const o = V({ 'BTC/USDT': { trades: [{ type: 'position', pnlUsdt: -1, stakeUsdt: 10 }] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeCap, 0); });
T('la perte d’une AUTRE paire ne bloque pas celle-ci', () => { const o = V({ 'ETH/USDT': { trades: [close(MIN, -9, 10)] }, 'BTC/USDT': { trades: [] } }, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); });
const opens = (n, ago) => Array.from({ length: n }, () => open(ago || 2 * 3600000, 5));
T('CALM · 39 ouvertures aujourd’hui (2 paires) → libre, dayCount 39', () => { const o = V({ 'BTC/USDT': { trades: opens(20) }, 'ETH/USDT': { trades: opens(19) } }, 'SOL/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); assert.strictEqual(o.dayCount, 39); });
T('CALM · 40 ouvertures → veto plafond', () => { const o = V({ 'BTC/USDT': { trades: opens(40) } }, 'SOL/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, true); assert.ok(/Plafond journalier · 40 ouverture\(s\) aujourd’hui \(régime CALM, max 40\)/.test(o.reason), o.reason); });
T('bull · 40 → libre ; 80 → veto', () => { assert.strictEqual(V({ 'BTC/USDT': { trades: opens(40) } }, 'SOL/USDT', 'bull', _fakeNow).veto, false); assert.strictEqual(V({ 'BTC/USDT': { trades: opens(80) } }, 'SOL/USDT', 'bull', _fakeNow).veto, true); });
T('bear · 80 → veto (max 80)', () => { const o = V({ 'BTC/USDT': { trades: opens(80) } }, 'SOL/USDT', 'bear', _fakeNow); assert.strictEqual(o.veto, true); assert.strictEqual(o.dayCap, 80); });
T('volatile / volatile_bull / volatile_bear · 200 → libre', () => { ['volatile', 'volatile_bull', 'volatile_bear'].forEach(r => { const o = V({ 'BTC/USDT': { trades: opens(200) } }, 'SOL/USDT', r, _fakeNow); assert.strictEqual(o.veto, false, r); assert.strictEqual(o.dayCap, Infinity); }); });
T('ouvertures d’HIER (jour local) non comptées', () => { const o = V({ 'BTC/USDT': { trades: opens(60, 15 * 3600000) } }, 'SOL/USDT', 'calm', _fakeNow); assert.strictEqual(o.dayCount, 0); });
T('clôtures et entrées sans ts ne comptent pas comme ouvertures', () => { const o = V({ 'BTC/USDT': { trades: [close(MIN, 1, 5), { type: 'open', stakeUsdt: 5 }] } }, 'SOL/USDT', 'calm', _fakeNow); assert.strictEqual(o.dayCount, 0); });
T('cooldown prioritaire sur le plafond (raison = cooldown)', () => { const o = V({ 'BTC/USDT': { trades: [...opens(40), close(MIN, -1, 5)] } }, 'BTC/USDT', 'calm', _fakeNow); assert.ok(/Cooldown/.test(o.reason)); });
T('_behavGateForOpen lit S.pairStates + detectMarketRegime + horloge courante', () => {
  S.pairStates = { 'BTC/USDT': { trades: [close(4 * MIN, -2, 7)] } }; _regime = 'bull';
  const g = ctx._behavGateForOpen('BTC/USDT'); assert.strictEqual(g.veto, true); assert.strictEqual(g.regime, 'bull'); assert.strictEqual(g.coolLeftMin, 11);
  _fakeNow += 12 * MIN; const g2 = ctx._behavGateForOpen('BTC/USDT'); assert.strictEqual(g2.veto, false); assert.strictEqual(g2.stakeCap, 7);
});
T('pairStates absent → neutre sans exception', () => { const o = V(null, 'BTC/USDT', 'calm', _fakeNow); assert.strictEqual(o.veto, false); });

console.log('\n── B · 09c livré : veto BEHAV dans l’entonnoir (texte réel) ──');
const src09c = fs.readFileSync('js/09c-auto-open.js', 'utf8');
T('veto BEHAV placé APRÈS le veto ECO et AVANT le Smart Sizer ; plafond de mise AVANT l’anti-négatif et APRÈS le bornage capital', () => {
  const iEco = src09c.indexOf('const _eg = _ecoGateForOpen();'), iB = src09c.indexOf('_bg = _behavGateForOpen(pair);'), iSizer = src09c.indexOf('// Smart Sizer applique le multiplicateur Kelly');
  const iCapSlots = src09c.indexOf('const _slotsFree ='), iCap = src09c.indexOf('if (_bg && _bg.stakeCap > 0 && baseStake > _bg.stakeCap)'), iNeg = src09c.indexOf('// VALIDATION ANTI-NÉGATIF');
  assert.ok(iEco > 0 && iB > iEco && iSizer > iB); assert.ok(iCapSlots > iSizer && iCap > iCapSlots && iNeg > iCap);
  assert.strictEqual((src09c.match(/_behavGateForOpen\(/g) || []).length, 1);
  assert.strictEqual((src09c.match(/_ecoGateForOpen\(/g) || []).length, 1); assert.strictEqual((src09c.match(/_corrGateForOpen\(/g) || []).length, 1);
  assert.ok(src09c.includes('const _behavVetoLogTs = {};'));
});
const vetoTxt = src09c.slice(src09c.indexOf('  let _bg = null;'), src09c.indexOf('  // Smart Sizer applique'));
const capTxt  = src09c.slice(src09c.indexOf('  if (_bg && _bg.stakeCap > 0'), src09c.indexOf('  // ──────────────────────────────────────────────────────────────\n  // VALIDATION ANTI-NÉGATIF'));
const declTxt = 'const _behavVetoLogTs = {};';
let _gate = { veto: false, reason: null, stakeCap: 0, lastLossUsd: 0 };
const c09 = { S, _behavGateForOpen: () => _gate, rndHash: () => 'h', nowStr: () => 't', window: {}, _toasts: [], Date: ctx.Date, String, Math, Number,
  _stakeFloor: () => 2, _stakeRound: x => Math.round(x * 10) / 10 };
c09.showToast = m => c09._toasts.push(m);
vm.createContext(c09);
vm.runInContext(declTxt + '\nfunction _open(pair, side, baseStake){' + vetoTxt + capTxt + '\nreturn baseStake;}', c09);
T('veto cooldown → EVAL reçoit BEHAV, journal 🧊 + toast, return', () => {
  S.brainLog = []; S.chainLog = []; c09._toasts = []; _gate = { veto: true, reason: 'Cooldown après perte · dernière clôture −$3.00 il y a 5 min (15 min requis, reste 10 min)', stakeCap: 12.5, lastLossUsd: -3 };
  const r = c09._open('BTC/USDT', 'long', 20);
  assert.strictEqual(r, undefined); assert.strictEqual(S.brainLog[0].event, 'BEHAV'); assert.strictEqual(S.brainLog[0].pair, 'BTC/USDT'); assert.strictEqual(S.brainLog[0].reason, _gate.reason);
  assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(S.chainLog[0].icon, '🧊'); assert.ok(S.chainLog[0].desc.startsWith('Garde comportementale · BTC/USDT LONG refusé · Cooldown'));
  assert.strictEqual(c09._toasts.length, 1); assert.ok(c09._toasts[0].startsWith('🧊 BTC/USDT LONG refusé'));
});
T('2e refus dans les 5 min : EVAL à nouveau, journal/toast silencieux (anti-flood)', () => { c09._open('BTC/USDT', 'long', 20); assert.strictEqual(S.brainLog.length, 2); assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(c09._toasts.length, 1); });
T('autre paire → journal + toast (anti-flood PAR paire)', () => { c09._open('ETH/USDT', 'short', 20); assert.strictEqual(S.chainLog.length, 2); assert.strictEqual(c09._toasts.length, 2); });
T('après 5 min : journal + toast à nouveau', () => { _fakeNow += 5 * MIN + 1000; c09._open('BTC/USDT', 'long', 20); assert.strictEqual(S.chainLog.length, 3); });
T('pas de veto, stakeCap 12.5, mise 20 → mise 12.5, journal 🧊 « mise $20 → $12.5 »', () => {
  S.chainLog = []; _gate = { veto: false, reason: null, stakeCap: 12.5, lastLossUsd: -3 };
  const r = c09._open('BTC/USDT', 'long', 20); assert.strictEqual(r, 12.5);
  assert.strictEqual(S.chainLog.length, 1); assert.ok(S.chainLog[0].desc.includes('mise $20 → $12.5 (≤ mise précédente après perte −$3.00)'), S.chainLog[0].desc);
});
T('mise 10 ≤ stakeCap 12.5 → inchangée, pas de journal', () => { S.chainLog = []; assert.strictEqual(c09._open('BTC/USDT', 'long', 10), 10); assert.strictEqual(S.chainLog.length, 0); });
T('stakeCap 1.2 sous le plancher (2) → mise = plancher 2, pas moins', () => { _gate = { veto: false, stakeCap: 1.2, lastLossUsd: -0.5 }; assert.strictEqual(c09._open('BTC/USDT', 'long', 6), 2); });
T('stakeCap 0 (dernière clôture gagnante) → mise libre', () => { S.chainLog = []; _gate = { veto: false, stakeCap: 0, lastLossUsd: 0 }; assert.strictEqual(c09._open('BTC/USDT', 'long', 30), 30); assert.strictEqual(S.chainLog.length, 0); });
T('porte qui crashe → ouverture continue sans plafond (try/catch, _bg null)', () => { c09._behavGateForOpen = () => { throw new Error('boom'); }; assert.strictEqual(c09._open('BTC/USDT', 'long', 30), 30); c09._behavGateForOpen = () => _gate; });

console.log('\n── C · source vivante, mode, HTML, intégrité ──');
const src02 = fs.readFileSync('js/02-state-init.js', 'utf8');
T('02 : closePosition écrit dans ps.trades {type:position, stakeUsdt, pnlUsdt, ts} ; ouvertures {type:open, ts}', () => {
  const blk = src02.slice(src02.indexOf("      type:      'position',"), src02.indexOf("      type:      'position',") + 600);
  assert.ok(blk.includes('stakeUsdt: pos.stakeUsdt') && blk.includes('pnlUsdt:   realisedUsd') && blk.includes('ts:        Date.now()'));
  assert.ok(src02.includes("type:          'open',") && src09c.includes("type:          'open',"));
});
T('02 : pairStates est multiplexé par mode (_WALLET_ACCESSOR_FIELDS) → gardes PAR MODE', () => {
  const f = src02.slice(src02.indexOf('var _WALLET_ACCESSOR_FIELDS = ['), src02.indexOf('];', src02.indexOf('var _WALLET_ACCESSOR_FIELDS = [')));
  assert.ok(f.includes("'pairStates'"));
});
T('10e4 : module ≤ 500 lignes, lit uniquement S.pairStates, une seule horloge (locale)', () => {
  const src = fs.readFileSync('js/10e4-gardes-comportementales.js', 'utf8');
  assert.ok(src.split('\n').length <= 500);
  assert.deepStrictEqual([...new Set(src.match(/\bS\.[a-zA-Z_]+/g))], ['S.pairStates']);
  assert.ok(!src.includes('getUTC'));
});
T('10f NON touché : aucune référence BEHAV', () => { assert.ok(!fs.readFileSync('js/10f-resolveur-cycle.js', 'utf8').includes('_behav')); });
const html = fs.readFileSync('AURA8_v118.html', 'utf8');
T('HTML : 10e4 chargé juste après 10e3 et avant 10f, token 20260906c sur 75 ressources + DOC_V, anciens tokens absents', () => {
  const i3 = html.indexOf('js/10e3-heatmap-horaire.js?v=20260906c'), i4 = html.indexOf('js/10e4-gardes-comportementales.js?v=20260906c'), i5 = html.indexOf('js/10f-resolveur-cycle.js?v=20260906c');
  assert.ok(i3 > 0 && i4 > i3 && i5 > i4);
  assert.strictEqual((html.match(/\?v=20260906c/g) || []).length, 75);
  assert.ok(html.includes("DOC_V = '20260906c'")); assert.ok(!html.includes('20260906b') && !html.includes('20260906a'));
});
T('versions en tête : 10e4 et 09c = 20260906c', () => {
  assert.ok(fs.readFileSync('js/10e4-gardes-comportementales.js', 'utf8').startsWith('// ▓▓▓ VERSION 20260906c ▓▓▓'));
  assert.ok(src09c.startsWith('// ▓▓▓ VERSION 20260906c ▓▓▓'));
});

console.log('\n' + ok + '/' + (ok + ko) + ' tests passés' + (ko ? ' · ' + ko + ' ÉCHEC(S)' : ''));
process.exit(ko ? 1 : 0);
