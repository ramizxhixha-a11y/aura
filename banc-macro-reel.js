// banc-macro-reel.js — [MACRO RÉEL · 26/09/2026] VERSION 20260926b
// La tuile Macro (vide depuis le 12/09) lit un flux réel (Fear & Greed, dominance BTC, cap 24 h) ; la tuile News lit l'agent
// news ; chaque tuile « fondamentale » dit ce qu'elle lit. Scout RÉEL de 03 en vm ; épingles 07 / 08.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique'); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin'); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js');
const ENGINE = between(s03, 'const GENOME_DEFAULTS = {', 'window.GENOME_DEFAULTS = GENOME_DEFAULTS;', false);
const SCOUT = between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false);
function ctx(feed) { const c = { S: { pairStates: { 'BTC/USDT': { candles: [], price: 1 } }, macroFeed: feed, agents: [] }, Math, Number, Object, Date, isFinite, String, window: {}, getTechSignals: () => ({ atScore: 0, raw: {} }), getFundamentalSignals: () => ({ fundScore: 0 }), detectHarmonicResonance: () => null, lmsrP: () => 0.5 }; vm.createContext(c); vm.runInContext(ENGINE + '\n' + SCOUT, c); return c; }
const sc = feed => JSON.parse(JSON.stringify(vm.runInContext("scoutAnalysis('macro_v1', 'BTC/USDT')", ctx(feed))));
console.log('▶ banc-macro-reel');
T('D1 · macro_v1 RÉEL : sans flux → 0 (« En attente ») ; flux vieux de plus de 30 min → 0 ; peur extrême → biais acheteur ; avidité extrême → biais vendeur ; zone neutre → seul l\'élan de la cap compte', () => {
  assert.strictEqual(sc(null).score, 0); assert.ok(sc(null).reasoning.startsWith('En attente du flux macro'));
  assert.strictEqual(sc({ fng: 10, t: Date.now() - 3600000 }).score, 0, 'flux périmé');
  const fear = sc({ fng: 10, fngLabel: 'Extreme Fear', cap24h: 0, btcDominance: 55, t: Date.now() });
  assert.ok(fear.score > 0.3, 'peur → achat : ' + fear.score); assert.ok(fear.reasoning.includes('Fear & Greed 10 (Extreme Fear)') && fear.reasoning.includes('dominance BTC 55.0 %'), fear.reasoning);
  const greed = sc({ fng: 90, cap24h: 0, t: Date.now() }); assert.ok(greed.score < -0.3, 'avidité → vente : ' + greed.score);
  const neutral = sc({ fng: 50, cap24h: 2.5, t: Date.now() }); assert.ok(Math.abs(neutral.score - 0.2) < 1e-9, 'zone neutre : 2,5 % / 5 × 0,4 = 0,20 → ' + neutral.score);
  const both = sc({ fng: 10, cap24h: -10, t: Date.now() }); assert.ok(Math.abs(both.score - (0.6 * 0.6 - 0.4)) < 1e-9, 'peur (+0,36) et chute de cap (−0,40) : ' + both.score);
});
T('D2 · le génome du siège macro_v1 : 5 gènes, bornes (fngLow 5..45, fngHigh 55..95)', () => {
  const c = ctx(null);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(vm.runInContext("_genomeOf('macro_v1')", c))), { fngLow: 25, fngHigh: 75, capScale: 5, wFng: 0.6, wCap: 0.4 });
  c.S.genome = { macro_v1: { fngLow: 60, fngHigh: 40, capScale: 100, wFng: 5, wCap: -1 } };
  const g = JSON.parse(JSON.stringify(vm.runInContext("_genomeOf('macro_v1')", c)));
  assert.deepStrictEqual(g, { fngLow: 45, fngHigh: 55, capScale: 20, wFng: 1, wCap: 0 });
});
T('S1 · 07 : flux macro permanent (20 s après le boot, puis toutes les 10 min, jamais hors ligne) écrit S.macroFeed ; 08 : la tuile News lit nlp_v1, les étiquettes disent ce qu\'elles lisent ; fundamental_v1 reste neutralisé', () => {
  const c7 = codeStrict(rd('js/07-v90-mode-bunker-sos.js')), c8 = codeStrict(rd('js/08-learning-history-render.js')), c3 = codeStrict(s03);
  assert.ok(c7.includes('async function _macroFeedRefresh() {') && c7.includes('if (window._auraNetOffline) return null;') && c7.includes('setInterval(_macroFeedRefresh, 10 * 60 * 1000);') && c7.includes('feed.t = Date.now(); S.macroFeed = feed;'));
  assert.ok(c8.includes('const nlpScore  = nlp.score;'), 'la tuile News lit nlp_v1');
  ["label:'Macro'", "label:'Volatilité (sécurité)'", "label:'News'", "label:'Élan (RSI)'", "label:'Contexte 1 h / 4 h'" /* [26/09 lot 4] ex « Régime de volatilité » */, "label:'Corps de bougies'", "label:'Sécurité (volatilité)'", "label:'Volume réel'"].forEach(l => assert.ok(c8.includes(l), l));
  ['Twitter/Reddit', 'Analytics blockchain', 'Ratio endettement', 'news & earnings', 'Taux/CPI/NFP'].forEach(l => assert.strictEqual(c8.includes(l), false, 'étiquette mensongère restante : ' + l));
  assert.ok(c3.includes("case 'fundamental_v1': {") && c3.includes('En attente du flux positionnement'), '[26/09 lot 2] fundamental_v1 lit le positionnement');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
