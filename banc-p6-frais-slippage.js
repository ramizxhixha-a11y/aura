// banc-p6-frais-slippage.js — [P6 · 06/09/2026] BRIQUE 6 DU PONT : frais + slippage.
// Charge le module LIVRÉ 10e6 en vm avec un S isolé PAR TEST, vérifie la cohérence du coût avec le
// barème réellement facturé par recordFees (02, texte réel rejoué) et avec estimateTradeReserve (02),
// mesure l'expectancy nette sur les trades RÉELS de aura_live.json, rejoue le texte LIVRÉ de 09c
// (veto COST après BETA + mise ×0.5 après le bêta, avant l'anti-négatif), le HTML (77 ressources) et l'intégrité de 10f.
// Lancer à la racine du dépôt : node banc-p6-frais-slippage.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let ok = 0, ko = 0;
function T(name, fn) { try { fn(); ok++; console.log('  ✓ ' + name); } catch (e) { ko++; console.log('  ✗ ' + name + '\n     ' + (e && e.message)); } }
const FC = { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 };
function mk(over) {
  const S = Object.assign({ tradingMode: 'sim', pairStates: {}, feeConfig: Object.assign({}, FC), leverageBorrowRate: 0.0002, chainLog: [], brainLog: [] }, over || {});
  const ctx = { window: {}, S, console, Math, Number, Array, isFinite, lmsrP: ps => ps._p == null ? 0.5 : ps._p, getTechSignals: () => ({ raw: { stddev: { cv: 0.015 } } }) };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('js/10e6-frais-slippage.js', 'utf8'), ctx);
  return ctx;
}
const closes = (n, pnlPct, stake) => { const t = []; for (let i = 0; i < n; i++) t.push({ type: 'position', stakeUsdt: stake, pnlUsdt: stake * pnlPct / 100, ts: i }); return t; };

console.log('━━ A · 10e6 livré : coût aller-retour ━━');
const A = mk();
T('_roundTripCostPct : barème Binance VIP 0 (0,10 % + 0,03 %) ×2 + funding ×3 → 0.2750 %', () => { assert.strictEqual(A._roundTripCostPct(FC, 0, 0.0002), 0.275); });
T('_roundTripCostPct : barème absent → 0 ; levier 1× à 0,02 %/cycle ×3 → +0.06 %', () => {
  assert.strictEqual(A._roundTripCostPct(null, 0, 0), 0);
  assert.strictEqual(A._roundTripCostPct(FC, 1, 0.0002), 0.335);
});
T('cohérence recordFees (02, texte réel) : frais taker/taker + slippage ×2 sur une mise de 100 $ = 0.26 $ = la part frais du coût', () => {
  const src = fs.readFileSync('js/02-state-init.js', 'utf8');
  const m = src.match(/const entryFee\s*=\s*notionalUsdt \* fc\.takerRate;[\s\S]*?const totalFee\s*=\s*tradingFee \+ slipFee;/);
  assert.ok(m, 'bloc frais de recordFees introuvable');
  const c = { fc: FC, notionalUsdt: 100, tradeType: 'taker' }; vm.createContext(c);
  vm.runInContext(m[0] + '; this.totalFee = totalFee;', c);
  assert.strictEqual(Math.round(c.totalFee * 10000) / 10000, 0.26);
  assert.strictEqual(Math.round((A._roundTripCostPct(FC, 0, 0) - FC.fundingRate * 3 * 100) * 100), 26);
});
T('cohérence estimateTradeReserve (02, fonction réelle) : total sans levier = part frais du coût', () => {
  const src = fs.readFileSync('js/02-state-init.js', 'utf8');
  const m = src.match(/function estimateTradeReserve\(notionalUsdt, levBorrowed\) \{[\s\S]*?\n\}/);
  assert.ok(m); const c = { S: { feeConfig: FC, leverageBorrowRate: 0 }, Math }; vm.createContext(c); vm.runInContext(m[0] + '; this.r = estimateTradeReserve(100, 0);', c);
  assert.strictEqual(Math.round(c.r.total * 10000) / 10000, 0.26);
});
console.log('━━ B · gain attendu et expectancy nette ━━');
T('_expectedGainPct : plancher 0.6 % (conviction 0) ; conviction 0.5, cv 0.015 → 1.816 ; cv invalide → 0.015', () => {
  assert.strictEqual(A._expectedGainPct(0, 0.015), 0.6);
  assert.strictEqual(A._expectedGainPct(0.5, 0.015), 1.816);
  assert.strictEqual(A._expectedGainPct(0.5, null), 1.816);
});
T('_netExpectancyPct : < 10 clôtures → null ; 20 clôtures à +0.1 % brut, coût 0.275 → net −0.175', () => {
  assert.strictEqual(A._netExpectancyPct(closes(9, 1, 10), 0.275), null);
  const e = A._netExpectancyPct(closes(20, 0.1, 10), 0.275);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(e)), { n: 20, grossPct: 0.1, netPct: -0.175 });
});
T('_netExpectancyPct : ne lit que les 20 DERNIÈRES clôtures, ignore les entrées open / invalides', () => {
  const t = closes(30, -5, 10).concat(closes(20, 2, 10)); t.push({ type: 'open', stakeUsdt: 10 }); t.push({ type: 'position', stakeUsdt: 0, pnlUsdt: 3 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(A._netExpectancyPct(t, 0.275))), { n: 20, grossPct: 2, netPct: 1.725 });
});
console.log('━━ C · verdict pur ━━');
T('gain 0.6 − coût 0.275 = 0.325 ≥ 0.15 → pas de veto ; gain 0.4 → veto, raison complète', () => {
  assert.strictEqual(A._costVerdict(0.275, 0.6, null, 'sim').veto, false);
  const o = A._costVerdict(0.275, 0.4, null, 'sim'); assert.strictEqual(o.veto, true);
  assert.strictEqual(o.reason, 'gain attendu 0.40 % − coût aller-retour 0.275 % = 0.13 % net < 0.15 % (les frais mangent le trade)');
});
T('gain 0.425 exactement → net 0.15 → pas de veto (limite)', () => { assert.strictEqual(A._costVerdict(0.275, 0.425, null, 'sim').veto, false); });
T('expectancy nette < 0 → mise ×0.5 (sim, paperReal, real) ; ≥ 0 → mise libre', () => {
  for (const m of ['sim', 'paperReal', 'real']) { const o = A._costVerdict(0.275, 1, { n: 12, grossPct: 0.1, netPct: -0.175 }, m); assert.strictEqual(o.veto, false, m); assert.strictEqual(o.stakeFactor, 0.5, m); }
  assert.strictEqual(A._costVerdict(0.275, 1, { n: 12, grossPct: 0.3, netPct: 0.025 }, 'sim').stakeFactor, 1);
  assert.strictEqual(A._costVerdict(0.275, 1, { n: 12, grossPct: 0.1, netPct: -0.175 }, 'sim').stakeReason, 'expectancy nette ' + (-0.175).toFixed(2) + ' %/trade (brute +0.10 % − coût 0.275 %, 12 clôtures) → mise ×0.5');
});
T('Réel : expectancy nette ≤ −0.55 (−2× coût) → veto ; sim/paperReal même valeur → mise ×0.5 seulement', () => {
  const e = { n: 10, grossPct: -0.3, netPct: -0.575 };
  const r = A._costVerdict(0.275, 1, e, 'real'); assert.strictEqual(r.veto, true); assert.ok(r.reason.startsWith('expectancy nette RE -0.57 %/trade sur 10 clôtures'));
  assert.strictEqual(A._costVerdict(0.275, 1, e, 'sim').veto, false); assert.strictEqual(A._costVerdict(0.275, 1, e, 'paperReal').stakeFactor, 0.5);
  assert.strictEqual(A._costVerdict(0.275, 1, { n: 10, grossPct: -0.2, netPct: -0.475 }, 'real').veto, false);
});
T('le veto gain prime : gain 0.3 + expectancy nette négative → veto raison gain, stakeFactor 1', () => { const o = A._costVerdict(0.275, 0.3, { n: 12, grossPct: 0, netPct: -0.275 }, 'sim'); assert.strictEqual(o.veto, true); assert.strictEqual(o.stakeFactor, 1); assert.ok(o.reason.startsWith('gain attendu')); });
console.log('━━ D · porte 09c (S isolé) ━━');
T('_costGateForOpen : paire sans historique, LMSR neutre → coût 0.275, gain plancher 0.6, neutre', () => {
  const c = mk({ pairStates: { 'ETH/USDT': { trades: [], _p: 0.5 } } }); const o = c._costGateForOpen('ETH/USDT', 10, 0);
  assert.strictEqual(o.costPct, 0.275); assert.strictEqual(o.gainPct, 0.6); assert.strictEqual(o.exp, null); assert.strictEqual(o.veto, false); assert.strictEqual(o.stakeFactor, 1);
});
T('_costGateForOpen : LMSR 0.8 → conviction 0.6 → gain 2.179 % ; levier envisagé = mise → coût 0.335', () => {
  const c = mk({ pairStates: { 'ETH/USDT': { trades: [], _p: 0.8 } } }); const o = c._costGateForOpen('ETH/USDT', 10, 10);
  assert.strictEqual(o.gainPct, 2.179); assert.strictEqual(o.costPct, 0.335);
});
T('_costGateForOpen : frais réglés à 0,30 % par côté (08, plafond 5 %) → coût 0.675, gain plancher 0.6 → VETO', () => {
  const c = mk({ feeConfig: Object.assign({}, FC, { takerRate: 0.003 }), pairStates: { 'ETH/USDT': { trades: [], _p: 0.5 } } });
  const o = c._costGateForOpen('ETH/USDT', 10, 0); assert.strictEqual(o.costPct, 0.675); assert.strictEqual(o.veto, true);
});
T('_costGateForOpen : 12 clôtures nettes négatives en sim → mise ×0.5 ; les mêmes en real (≤ −2× coût) → veto', () => {
  const t = closes(12, -0.4, 10);
  assert.strictEqual(mk({ pairStates: { 'X/USDT': { trades: t, _p: 0.5 } } })._costGateForOpen('X/USDT', 10, 0).stakeFactor, 0.5);
  assert.strictEqual(mk({ tradingMode: 'real', pairStates: { 'X/USDT': { trades: t, _p: 0.5 } } })._costGateForOpen('X/USDT', 10, 0).veto, true);
});
T('_costGateForOpen : getTechSignals qui lève / lmsrP absent → porte neutre (jamais d\'exception)', () => {
  const c = mk({ pairStates: { 'X/USDT': { trades: [] } } }); c.getTechSignals = () => { throw new Error('boom'); }; delete c.lmsrP;
  const o = c._costGateForOpen('X/USDT', 10, 0); assert.strictEqual(o.veto, false); assert.strictEqual(o.gainPct, 0.6);
});
console.log('━━ E · trades RÉELS du backup (aura_live.json) ━━');
T('backup : 8 paires × 15 clôtures, expectancy nette mesurable ; BTC/XRP/DOGE/LINK/AVAX nettes < 0 (mise ×0.5), ETH/SOL/ADA > 0', () => {
  const live = JSON.parse(fs.readFileSync('aura_live.json', 'utf8')).aura;
  const c = mk({ pairStates: live.pairStates });
  const neg = [], pos = [];
  for (const p of Object.keys(live.pairStates)) { const e = c._netExpectancyPct(live.pairStates[p].trades, 0.275); assert.ok(e && e.n === 15, p); (e.netPct < 0 ? neg : pos).push(p.split('/')[0]); }
  assert.deepStrictEqual(neg.sort(), ['AVAX', 'BTC', 'DOGE', 'LINK', 'XRP']); assert.deepStrictEqual(pos.sort(), ['ADA', 'ETH', 'SOL']);
  console.log('     nettes < 0 : ' + neg.join(', ') + ' · nettes > 0 : ' + pos.join(', '));
});
T('backup : feeConfig persisté à taker 0,05 % (antérieur au plancher 09b2) — le module lit le barème tel quel, coût 0.175 (à surveiller au Guardian : S.feeConfig.takerRate doit valoir 0.001)', () => {
  const live = JSON.parse(fs.readFileSync('aura_live.json', 'utf8')).aura;
  assert.strictEqual(A._roundTripCostPct(live.feeConfig, 0, 0), 0.175);
});
console.log('━━ F · texte LIVRÉ de 09c ━━');
const c9 = fs.readFileSync('js/09c-auto-open.js', 'utf8');
T('09c : version 20260906e, anti-flood _costVetoLogTs déclaré une fois', () => { assert.ok(c9.startsWith('// ▓▓▓ VERSION 20260906e ▓▓▓')); assert.strictEqual(c9.split('const _costVetoLogTs = {};').length - 1, 1); });
T('09c : veto COST après le veto BETA et avant runBotFleet (Smart Sizer), appel unique _costGateForOpen(pair, baseStake, ps._leverageBonus || 0)', () => {
  const iBeta = c9.indexOf("event: 'BETA'"), iCost = c9.indexOf("event: 'COST'"), iFleet = c9.indexOf("runBotFleet('pre_trade'");
  assert.ok(iBeta > 0 && iCost > iBeta && iFleet > iCost);
  assert.strictEqual(c9.split("_ct = _costGateForOpen(pair, baseStake, ps._leverageBonus || 0);").length - 1, 1);
  assert.strictEqual(c9.split("event: 'COST'").length - 1, 1);
  assert.ok(c9.includes("if (_ct.veto) {") && c9.slice(iCost, iCost + 900).includes('      return;'));
});
T('09c : journal 💸 anti-flood 5 min + toast dans le veto', () => { const b = c9.slice(c9.indexOf("event: 'COST'"), c9.indexOf("event: 'COST'") + 900); assert.ok(b.includes("(_costVetoLogTs[pair] || 0)) > 5 * 60 * 1000") && b.includes("icon: '💸'") && b.includes("showToast('💸 '")); });
T('09c : mise ×0.5 après le bloc bêta, avant VALIDATION ANTI-NÉGATIF, plancher _stakeFloor()', () => {
  const iB = c9.indexOf('baseStake = _red;'), iC = c9.indexOf('if (_ct && _ct.stakeFactor < 1) {'), iAN = c9.indexOf('VALIDATION ANTI-NÉGATIF');
  assert.ok(iB > 0 && iC > iB && iAN > iC); assert.strictEqual(c9.split('const _redC = Math.max(_stakeFloor(), _stakeRound(baseStake * _ct.stakeFactor));').length - 1, 1); assert.ok(c9.includes('baseStake = _redC;'));
});
T('09c : node --check (syntaxe)', () => { new vm.Script(c9, { filename: '09c' }); });
T('09c : diff limité au bloc P6 (aucune autre fonction touchée : 1017 lignes, 984 identiques à la version 20260906d)', () => { assert.strictEqual(c9.split('\n').length, 1018); assert.strictEqual(c9.split('_betaGateForOpen(pair, side)').length - 1, 1); });
console.log('━━ G · HTML et intégrité ━━');
const html = fs.readFileSync('AURA8_v118.html', 'utf8');
T('HTML : 78 ressources au token 20260906h ([P7b]), aucune au token précédent, DOC_V = 20260906h', () => { assert.strictEqual((html.match(/\?v=20260906h/g) || []).length, 78); assert.ok(!html.includes('20260906g')); assert.ok(html.includes("var DOC_V = '20260906h';")); });
T('HTML : 10e6 chargé UNE fois, entre 10e5 et 10f', () => { const a = html.indexOf('js/10e5-beta-btc.js'), b = html.indexOf('js/10e6-frais-slippage.js'), c = html.indexOf('js/10f-resolveur-cycle.js'); assert.ok(a > 0 && b > a && c > b); assert.strictEqual(html.split('js/10e6-frais-slippage.js').length - 1, 1); });
T('10f : aucune reference _costGate (veto/demi-mise restent en 09c) ; [NET 06/09] 10f lit _pairNetExpectancy / _learnedNetUsd de 10e6 ; module 10e6 <= 500 lignes', () => { const f = fs.readFileSync('js/10f-resolveur-cycle.js', 'utf8'); assert.ok(!f.includes('_costGate')); assert.ok(f.includes('_pairNetExpectancy(ps)') && f.includes('_learnedNetUsd(pair)')); assert.ok(fs.readFileSync('js/10e6-frais-slippage.js', 'utf8').split('\n').length <= 500); });
T('10e6 : node --check ; 5 exports window ; aucun s.replace / S.portfolio / botAutoMode / tradingMode écrit', () => { const m = fs.readFileSync('js/10e6-frais-slippage.js', 'utf8'); new vm.Script(m); assert.strictEqual((m.match(/^window\._\w+ = _\w+;$/gm) || []).length, 8); assert.ok(!/S\.(portfolio|botAutoMode|tradingMode)\s*=/.test(m)); });
console.log('\n' + ok + '/' + (ok + ko) + ' tests OK' + (ko ? ' — ' + ko + ' ÉCHEC(S)' : ''));
process.exit(ko ? 1 : 0);
