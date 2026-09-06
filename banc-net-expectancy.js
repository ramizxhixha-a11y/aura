// banc-net-expectancy.js — [NET · 06/09/2026] EXPECTANCY NETTE : source unique 10e6 pour les 4 lecteurs de 10f.
// Charge le module LIVRÉ 10e6 en vm avec un S isolé PAR TEST, prouve la non-régression de _netExpectancyPct
// (JSON identique à l'implémentation de référence), teste _lastCloses / _ownStakeCostPct / _pairNetExpectancy /
// _learnedNetUsd, rejoue les 4 sites du TEXTE LIVRÉ de 10f (extraits exacts évalués en vm), mesure sur les
// trades RÉELS de aura_live.json (byPair de recordFees vs ps.totalPnlUsd), vérifie le HTML (77 ressources).
// Lancer à la racine du dépôt : node banc-net-expectancy.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let ok = 0, ko = 0;
function T(name, fn) { try { fn(); ok++; console.log('  ✅ ' + name); } catch (e) { ko++; console.log('  ❌ ' + name + '\n     ' + (e && e.message)); } }
const TOK_10E6 = '20260906f';   // 10e6 NON relivré en P7
const TOK = '20260906g';   // [P7 06/09/2026] token courant (10f relivré avec la porte news)
const FC = { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 };
const SRC = fs.readFileSync('js/10e6-frais-slippage.js', 'utf8');
function mk(over) {
  const S = Object.assign({ tradingMode: 'sim', pairStates: {}, feeConfig: Object.assign({}, FC), leverageBorrowRate: 0.0002, walletStore: {}, chainLog: [], brainLog: [] }, over || {});
  const ctx = { window: {}, S, console, Math, Number, Array, isFinite, lmsrP: ps => ps._p == null ? 0.5 : ps._p, getTechSignals: () => ({ raw: { stddev: { cv: 0.015 } } }) };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx;
}
const J = o => JSON.parse(JSON.stringify(o));
const closes = (n, pnlPct, stake) => { const t = []; for (let i = 0; i < n; i++) t.push({ type: 'position', stakeUsdt: stake, pnlUsdt: stake * pnlPct / 100, ts: i }); return t; };
// Implémentation de RÉFÉRENCE (texte 10e6 P6, avant refactor) pour la non-régression.
function refNet(trades, costPct) {
  if (!Array.isArray(trades)) return null;
  const c = [];
  for (let i = trades.length - 1; i >= 0 && c.length < 20; i--) { const t = trades[i]; if (t && t.type === 'position' && isFinite(t.pnlUsdt) && isFinite(t.stakeUsdt) && t.stakeUsdt > 0) c.push(t); }
  if (c.length < 10) return null;
  let g = 0; for (const t of c) g += (t.pnlUsdt / t.stakeUsdt) * 100; g /= c.length;
  return { n: c.length, grossPct: Math.round(g * 1000) / 1000, netPct: Math.round((g - costPct) * 1000) / 1000 };
}
const live = JSON.parse(fs.readFileSync('aura_live.json', 'utf8')).aura;
const COST_LIVE = 0.175;   // barème du backup (taker 0.0005), levier 0

console.log('━━ A · 10e6 livré : module et non-régression ━━');
T('10e6 : version ' + TOK_10E6 + ', ≤ 500 lignes, exports window des 3 nouvelles fonctions + _lastCloses interne', () => {
  assert.ok(SRC.startsWith('// ▓▓▓ VERSION ' + TOK_10E6 + ' ▓▓▓'));
  assert.ok(SRC.split('\n').length <= 500);
  const c = mk();
  ['_ownStakeCostPct', '_pairNetExpectancy', '_learnedNetUsd', '_netExpectancyPct', '_costGateForOpen'].forEach(f => assert.strictEqual(typeof c.window[f], 'function', f));
  assert.strictEqual(typeof c._lastCloses, 'function');
});
T('_netExpectancyPct : JSON identique à la référence P6 sur 6 jeux (vide, < 10, mixte, > 20, pnl non fini, mise 0)', () => {
  const c = mk();
  const mix = closes(25, 1, 10).concat([{ type: 'x' }, { type: 'position', stakeUsdt: 0, pnlUsdt: 1 }, { type: 'position', stakeUsdt: 10, pnlUsdt: NaN }], closes(3, -5, 4));
  for (const t of [[], closes(9, 1, 5), mix, closes(40, 0.5, 20), null, closes(12, -2, 3)])
    for (const cp of [0, 0.175, 0.275]) assert.deepStrictEqual(J(c._netExpectancyPct(t, cp)), J(refNet(t, cp)));
});
T('_lastCloses : 20 max, plus récent en premier, filtre type/mise/pnl, tableau vide si non-tableau', () => {
  const c = mk();
  assert.deepStrictEqual(J(c._lastCloses(undefined)), []);
  const t = closes(30, 1, 5); const l = c._lastCloses(t);
  assert.strictEqual(l.length, 20); assert.strictEqual(l[0].ts, 29); assert.strictEqual(l[19].ts, 10);
  assert.strictEqual(c._lastCloses([{ type: 'position', stakeUsdt: 0, pnlUsdt: 1 }, { type: 'order', stakeUsdt: 5, pnlUsdt: 1 }]).length, 0);
});
T('_ownStakeCostPct = _roundTripCostPct(S.feeConfig, 0, S.leverageBorrowRate) : 0.275 (barème plancher), 0.175 (barème backup), levier ignoré', () => {
  const c = mk(); assert.strictEqual(c._ownStakeCostPct(), 0.275);
  const d = mk({ feeConfig: live.feeConfig, leverageBorrowRate: 0.5 }); assert.strictEqual(d._ownStakeCostPct(), COST_LIVE);
  assert.strictEqual(d._ownStakeCostPct(), d._roundTripCostPct(live.feeConfig, 0, 0.5));
});
T('_pairNetExpectancy(ps) : lit ps.trades du mode courant, null si ps absent / < 10 clôtures, net = brut − 0.275', () => {
  const c = mk();
  assert.strictEqual(c._pairNetExpectancy(null), null);
  assert.strictEqual(c._pairNetExpectancy({ trades: closes(9, 3, 5) }), null);
  assert.deepStrictEqual(J(c._pairNetExpectancy({ trades: closes(15, 0.1, 5) })), { n: 15, grossPct: 0.1, netPct: -0.175 });
  assert.deepStrictEqual(J(c._pairNetExpectancy({ trades: closes(15, 1, 5) })), { n: 15, grossPct: 1, netPct: 0.725 });
});
console.log('━━ B · _learnedNetUsd (bases solides RÉEL) ━━');
T('somme AA + EV des 20 dernières clôtures chacune, net = brut − mise × coût ; mode real IGNORÉ', () => {
  const ws = { sim: { pairStates: { 'X/USDT': { trades: closes(20, 1, 10) } } }, paperReal: { pairStates: { 'X/USDT': { trades: closes(5, -2, 10) } } }, real: { pairStates: { 'X/USDT': { trades: closes(20, 50, 10) } } } };
  const c = mk({ walletStore: ws, tradingMode: 'real' });
  const r = J(c._learnedNetUsd('X/USDT'));
  // brut = 20×0.10 + 5×(−0.20) = 1.0 ; coût = 25 × 10 × 0.275 % = 0.6875 → net 0.3125
  assert.deepStrictEqual(r, { n: 25, grossUsd: 1, netUsd: 0.313 });
});
T('brut > 0 mais net < 0 → netUsd négatif (le cas AVAX du backup) ; null si < 10 clôtures apprises au total ; walletStore absent → null', () => {
  const c = mk({ walletStore: { sim: { pairStates: { 'A/USDT': { trades: closes(12, 0.1, 10) } } } } });
  const r = J(c._learnedNetUsd('A/USDT')); assert.strictEqual(r.n, 12); assert.ok(r.grossUsd > 0 && r.netUsd < 0, JSON.stringify(r));
  const d = mk({ walletStore: { sim: { pairStates: { 'A/USDT': { trades: closes(5, 9, 10) } } }, paperReal: { pairStates: { 'A/USDT': { trades: closes(4, 9, 10) } } } } });
  assert.strictEqual(d._learnedNetUsd('A/USDT'), null);
  assert.strictEqual(mk({ walletStore: undefined })._learnedNetUsd('A/USDT'), null);
});
T('50 clôtures par mode → seulement les 20 dernières de chaque mode comptent (n = 40)', () => {
  const c = mk({ walletStore: { sim: { pairStates: { 'B/USDT': { trades: closes(50, 1, 10) } } }, paperReal: { pairStates: { 'B/USDT': { trades: closes(50, 1, 10) } } } } });
  assert.strictEqual(c._learnedNetUsd('B/USDT').n, 40);
});
console.log('━━ C · texte LIVRÉ de 10f : 4 sites alignés, plus aucune lecture brute ━━');
const F = fs.readFileSync('js/10f-resolveur-cycle.js', 'utf8');
const codeLines = F.split('\n').filter(l => !/^\s*\/\//.test(l));
T('10f : version ' + TOK + ', ≤ 500 lignes de code hors commentaires ? non — 601 lignes totales (module hérité, non redécoupé ici ; [P7] +18 : 10 de code, 8 de commentaires), 0 lecture de totalPnlPct / totalPnlUsd / _recentNet / _learned hors commentaires', () => {
  assert.ok(F.startsWith('// ▓▓▓ VERSION ' + TOK + ' ▓▓▓'));
  assert.strictEqual(F.split('\n').length, 601);
  const code = codeLines.join('\n');
  ['totalPnlPct', 'totalPnlUsd', '_recentNet', '_recentCloses', '_learned ', '_learned +=', 'ps.totalTrades || 0) >= 20', '_pt >= 15'].forEach(k => assert.strictEqual(code.split(k).length - 1, 0, k));
});
T('10f : _netExp déclaré UNE fois (avant ses 3 usages), _pairNetExpectancy et _learnedNetUsd appelés UNE fois chacun', () => {
  const code = codeLines.join('\n');
  assert.strictEqual(code.split('const _netExp     = _pairNetExpectancy(ps);').length - 1, 1);
  assert.strictEqual(code.split('_learnedNetUsd(pair)').length - 1, 1);
  const iDecl = code.indexOf('const _netExp     =');
  ['(_netExp && _netExp.netPct < 0) ? 0.10 : 0', 'if (_netExp) {\n    _pairExp   = _netExp.netPct;', 'if (_netExp) _perfMult = Math.max(0.35, Math.min(1.0, 1 + _netExp.netPct * 0.5));']
    .forEach(k => { assert.strictEqual(code.split(k).length - 1, 1, k); assert.ok(code.indexOf(k) > iDecl, 'ordre ' + k); });
  assert.strictEqual(code.split('_reSolid = !!(_learnedNet && _learnedNet.netUsd > 0);').length - 1, 1);
});
// Rejeu des expressions EXACTES du texte livré.
function site(k) { const l = codeLines.find(x => x.includes(k)); assert.ok(l, 'site ' + k); return l.trim(); }
function evalSite(lines, env) { const ctx = Object.assign({ Math }, env); vm.createContext(ctx); vm.runInContext(lines.join('\n'), ctx); return ctx; }
T('site A (porte S3) : net < 0 → +0.10 ; net ≥ 0 → 0 ; null (< 10 clôtures) → 0', () => {
  const a = site('const _expPenalty =').replace('const ', 'var ');
  assert.strictEqual(evalSite([a], { _netExp: { netPct: -0.01 } })._expPenalty, 0.10);
  assert.strictEqual(evalSite([a], { _netExp: { netPct: 0 } })._expPenalty, 0);
  assert.strictEqual(evalSite([a], { _netExp: null })._expPenalty, 0);
});
T('site C (disjoncteur) : net −0.16 → watch ; +0.04 → good ; −0.10 → ni l\'un ni l\'autre ; null → neutre', () => {
  const i = codeLines.findIndex(x => x.includes('var _pairExp = 0, _pairWatch = false, _pairGood = false;'));
  const block = codeLines.slice(i, i + 6);
  assert.ok(block[1].includes('if (_netExp) {') && block[5].trim() === '}', block.join('|'));
  const r = (n) => { const c = evalSite(block, { _netExp: n }); return [c._pairWatch, c._pairGood, c._pairExp]; };
  assert.deepStrictEqual(r({ netPct: -0.16 }), [true, false, -0.16]);
  assert.deepStrictEqual(r({ netPct: 0.04 }), [false, true, 0.04]);
  assert.deepStrictEqual(r({ netPct: -0.10 }), [false, false, -0.10]);
  assert.deepStrictEqual(r(null), [false, false, 0]);
});
T('site D (_perfMult) : −0.61 → 0.695 ; −1.19 → 0.405 ; −2 → 0.35 (plancher) ; +3 → 1.0 (plafond) ; null → 1.0', () => {
  const d = [site('let _perfMult = 1.0;').replace('let ', 'var '), site('if (_netExp) _perfMult =')];
  const r = (n) => Math.round(evalSite(d, { _netExp: n })._perfMult * 1000) / 1000;
  assert.strictEqual(r({ netPct: -0.61 }), 0.695); assert.strictEqual(r({ netPct: -1.19 }), 0.405);
  assert.strictEqual(r({ netPct: -2 }), 0.35); assert.strictEqual(r({ netPct: 3 }), 1.0); assert.strictEqual(r(null), 1.0);
});
T('site B (bases solides RE) : netUsd > 0 → solide ; ≤ 0 ou null → refus', () => {
  const b = site('_reSolid = !!(_learnedNet');
  const r = (v) => evalSite(['var _reSolid = false;', b], { _learnedNet: v })._reSolid;
  assert.strictEqual(r({ netUsd: 0.01 }), true); assert.strictEqual(r({ netUsd: 0 }), false); assert.strictEqual(r({ netUsd: -3 }), false); assert.strictEqual(r(null), false);
});
T('10f : _costGate toujours absent (le veto/demi-mise restent dans 09c) ; 09c NON touché (version 20260906e conservée)', () => {
  assert.ok(!F.includes('_costGate'));
  assert.ok(fs.readFileSync('js/09c-auto-open.js', 'utf8').startsWith('// ▓▓▓ VERSION 20260906e ▓▓▓'));
});
console.log('━━ D · trades RÉELS du backup ━━');
T('comptabilité : fees.byPair[p].pnlGross === ps.totalPnlUsd et trades === totalTrades sur 8/8 paires → le brut appris = brut AVANT frais', () => {
  const bp = live.fees.byPair; let n = 0;
  for (const p of Object.keys(bp)) { n++; assert.ok(Math.abs(bp[p].pnlGross - live.pairStates[p].totalPnlUsd) < 1e-6, p); assert.strictEqual(bp[p].trades, live.pairStates[p].totalTrades, p); }
  assert.strictEqual(n, 8);
});
T('ancien vs nouveau sur le backup : brut à vie vs net 20 clôtures — AVAX/BTC/DOGE/LINK/XRP nets < 0 (mise ×0.5 + porte +0.10), ADA/ETH/SOL > 0', () => {
  const c = mk({ feeConfig: live.feeConfig, leverageBorrowRate: 0 });
  const neg = [], pos = [];
  for (const p of Object.keys(live.pairStates)) {
    const ps = live.pairStates[p]; const e = c._pairNetExpectancy(ps);
    assert.ok(e && e.n === 15, p);
    const brutVie = ps.totalPnlPct / ps.totalTrades;
    console.log('     ' + p.padEnd(10) + ' brut/vie ' + brutVie.toFixed(3).padStart(7) + ' %/tr · 20 clôt. brut ' + e.grossPct.toFixed(3).padStart(7) + ' → NET ' + e.netPct.toFixed(3).padStart(7) + ' %/tr · _perfMult ' + Math.max(0.35, Math.min(1, 1 + e.netPct * 0.5)).toFixed(3) + (e.netPct < -0.15 ? ' · ×0.25 +0.12' : e.netPct > 0.03 ? ' · ×1.8' : ''));
    (e.netPct < 0 ? neg : pos).push(p.split('/')[0]);
  }
  assert.deepStrictEqual(neg.sort(), ['AVAX', 'BTC', 'DOGE', 'LINK', 'XRP']); assert.deepStrictEqual(pos.sort(), ['ADA', 'ETH', 'SOL']);
});
T('bases solides RE sur le backup (AA = backup, EV vide) : AVAX brut +273 $ à vie → REFUSÉ net (n=15 < 0) ; ETH net > 0 → solide', () => {
  const c = mk({ walletStore: { sim: { pairStates: live.pairStates }, paperReal: { pairStates: {} } }, feeConfig: live.feeConfig, leverageBorrowRate: 0, tradingMode: 'real' });
  const av = c._learnedNetUsd('AVAX/USDT'), eth = c._learnedNetUsd('ETH/USDT');
  assert.ok(live.pairStates['AVAX/USDT'].totalPnlUsd > 0);
  assert.ok(av && av.n === 15 && av.netUsd < 0, JSON.stringify(av));
  assert.ok(eth && eth.netUsd > 0, JSON.stringify(eth));
});
console.log('━━ E · HTML ━━');
const html = fs.readFileSync('AURA8_v118.html', 'utf8');
T('HTML : 78 × v=' + TOK + ' ([P7] +10e7), DOC_V = ' + TOK + ', 0 × 20260906f, 10e6 chargé UNE fois entre 10e5 et 10f', () => {
  assert.strictEqual(html.split('v=' + TOK).length - 1, 78); assert.strictEqual(html.split('20260906f').length - 1, 0);
  assert.ok(html.includes("var DOC_V = '" + TOK + "';"));
  const a = html.indexOf('js/10e5-beta-btc.js'), b = html.indexOf('js/10e6-frais-slippage.js'), d = html.indexOf('js/10f-resolveur-cycle.js');
  assert.ok(a > 0 && b > a && d > b); assert.strictEqual(html.split('js/10e6-frais-slippage.js').length - 1, 1);
});
console.log('\n' + ok + '/' + (ok + ko) + ' tests OK' + (ko ? ' — ' + ko + ' ÉCHEC(S)' : ''));
process.exit(ko ? 1 : 0);
