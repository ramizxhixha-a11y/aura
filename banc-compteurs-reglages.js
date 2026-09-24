// banc-compteurs-reglages.js — [COMPTEURS RÉGLAGES · 24/09/2026] VERSION 20260924a
// La page Réglages dit vrai : jugements réels depuis le 17/09 (comptés à la source, EV/RE seulement), frais réels,
// « P&L attribué », le Shadow nommé pour ce qu'il est (miroir). Métriques RÉELLES de RESET_DOMAINS en vm.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const DOMAINS = between(s03, 'const RESET_DOMAINS = [', '\n];\n', true);
function metrics(S) { const c = { S, Math, Number, Object, JSON, isFinite, String }; vm.createContext(c); vm.runInContext(DOMAINS, c); return Object.fromEntries(JSON.parse(vm.runInContext('JSON.stringify(RESET_DOMAINS.map(d => [d.id, d.metric()]))', c))); }
console.log('▶ banc-compteurs-reglages');
T('1 · Agents : jugements réels depuis le 17/09, plus la somme de learningEvents (41 M)', () => {
  const m = metrics({ agents: [{ learningEvents: 20000000 }, { learningEvents: 21000000 }], _realJudgments: 137 });
  assert.strictEqual(m.agents, '2 agents · 137 jugements réels depuis le 17/09');
  assert.strictEqual(metrics({ agents: [] }).agents, '0 agents · 0 jugements réels depuis le 17/09');
});
T('2 · le compteur est incrémenté à la source, dans learnFromOutcome, APRÈS la garde « école » (jamais en AA), persisté + manifest', () => {
  const lfo = codeStrict(s03).slice(codeStrict(s03).indexOf('function learnFromOutcome('));
  const iGuard = lfo.indexOf("if (S.tradingMode === 'sim')"), iInc = lfo.indexOf('S._realJudgments = (S._realJudgments || 0) + 1;');
  assert.ok(iGuard > 0 && iInc > iGuard && iInc - iGuard < 400, 'incrément juste après la garde école');
  assert.ok(codeStrict(rd('js/09b1-build-snapshot.js')).includes('_realJudgments: S._realJudgments || 0,') && codeStrict(rd('js/09b2-save-load.js')).includes("S._realJudgments = Number(snap._realJudgments) || 0;") && codeStrict(rd('js/09b2-save-load.js')).includes("'_realJudgments'"));
});
T('3 · Compteurs fiscaux : frais + slippage lus sur les clés RÉELLES (plus « frais $0 »)', () => {
  const m = metrics({ fees: { totalPnlGross: -11.88, totalTradingFees: 12.42, totalSlippage: 3.73 } });
  assert.strictEqual(m.fiscal, 'P&L brut $-11.88 · frais + slippage $16.15');
});
T('4 · Flotte : « P&L attribué » ; Miroir : nommé pour ce qu\'il est', () => {
  const m = metrics({ botFleet: { a: { contributions: 1326, pnlContrib: -3.19 }, b: { contributions: 10, pnlContrib: -87.71 } }, shadow: { virtualTrades: new Array(50), virtualPnl: 734.55 } });
  assert.strictEqual(m.fleet, '1336 contribs · $-90.90 de P&L attribué');
  assert.strictEqual(m.shadow, "l'inverse de chaque trade : 50 trades · +$734.55 si tu avais fait le contraire");
  assert.ok(DOMAINS.includes("name: 'Miroir',") && !DOMAINS.includes("name: 'Shadow Bot',"));
});
T('5 · les 5 autres compteurs (trading, rêves, cascade, résonance, heatmap) inchangés et vivants', () => {
  const m = metrics({ totalTrades: 192, winTrades: 97, dreamJournal: new Array(30), decisionCascade: new Array(15), resonanceHistory: [], heatmap: { byHour: { 1: 1, 2: 1 }, byWeekday: { 1: 1 } } });
  assert.strictEqual(m.trading, '192 trades · 97 gagnants'); assert.strictEqual(m.dreams, '30 réflexions'); assert.strictEqual(m.cascade, '15 décisions tracées'); assert.strictEqual(m.resonance, '0 alignements détectés'); assert.strictEqual(m.heatmap, '2 heures · 1 jours analysés');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
