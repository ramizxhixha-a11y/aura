// banc-paires-vivantes.js — [PAIRES VIVANTES · 10/10/2026] VERSION 20261010b
// Une paire RETIRÉE (11 removePair : sortie de PAIRS, pairState gardé pour sa mémoire) ne compte plus dans le MARCHÉ ni dans la DÉCISION. Backup de Rams du
// 10/10 18:38 : GBP/USDT, retirée le 22/09, gardait en EV une variation figée à +21,53 — la moyenne du régime de marché passait à 3,38 (« bull ») au lieu de
// 1,87 (« calm ») ; elle comptait pour un emplacement dans le partage de la mise (13 au lieu de 12 : 81,3 $ au lieu de 88,1 $ sur la fiche MAN) ; ses cycles
// tournaient encore (sonde navigateur, 1 h : 50 passages en AA, 30 en EV). Règle de 02 : le marché et la décision lisent les paires VIVANTES (_livePairs /
// _livePairEntries / _livePairStates : dans PAIRS ET dans le portefeuille du mode traité) ; l'histoire du portefeuille (totaux, P&L réalisé, rapports, exports,
// sauvegarde, remises à zéro) lit S.pairStates en entier. Testé sur le CODE RÉEL en vm. Le dernier test tient l'INVENTAIRE des boucles brutes qui restent
// (fichier, fonction, nombre) : une boucle nouvelle sur S.pairStates doit être classée ici — vivantes (convertie) ou histoire (ajoutée à la liste) —, sinon il bloque.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 60)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 60)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 60)); return s.slice(i, incl ? j + b.length : j); };
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length, st = [];
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
  throw new Error('fin introuvable : ' + name);
}
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js');
const s09g = rd('js/09g-modals.js'), s10f = rd('js/10f-resolveur-cycle.js'), s10h = rd('js/10h-pont-fullpower-bricks.js'), html = rd('AURA8_v118.html');
const LIVE = between(s02, 'function _livePairs() {', 'window._livePairs = _livePairs;', false);
// l'état du backup de Rams du 10/10 18:38 : variations (pnl24h) de l'EV, GBP/USDT retirée figée à +21,53 ; 12 paires dans PAIRS
const EV24 = { 'BTC/USDT': 0.427661, 'ETH/USDT': 0.451932, 'XRP/USDT': -0.16327, 'SOL/USDT': 0.227355, 'DOGE/USDT': 1.647651, 'ADA/USDT': 7.621114, 'AVAX/USDT': 1.08539, 'LINK/USDT': 2.069253, 'DOT/USDT': 4.785638, 'PEPE/USDT': 3.599407, 'EUR/USDT': 0.117084, 'GBP/USDT': 21.52641, 'BNB/USDT': 0.595317 };
const ORDER = Object.keys(EV24), LIVEP = ORDER.filter(p => p !== 'GBP/USDT');
const flat = px => Array.from({ length: 20 }, (_, i) => ({ o: px, h: px, l: px, c: px * (1 + 0.0001 * (i % 3)), v: 1 }));   // dispersion ≈ 0 : régime non « volatile »
function world(opts) {
  opts = opts || {};
  const S = { tradingMode: opts.mode || 'paperReal', pairStates: {}, openPositions: opts.open || [], tradingAccount: opts.trading === undefined ? 1079.2318497361086 : opts.trading, leverageReserve: 0, leverageBorrowed: 0, leverage: 0, agents: [] };
  ORDER.forEach(p => { S.pairStates[p] = { price: 100, pnl24h: EV24[p], candles: flat(100), qYes: 130, qNo: 130, stake: 0, cycleTimer: 1, cycleMax: 6, totalTrades: 0 }; });
  const PAIRS = {}; LIVEP.forEach(p => { PAIRS[p] = { sym: p.split('/')[0] }; });
  const c = { S, PAIRS, Math, Number, Object, Array, JSON, isFinite, isNaN, window: {}, lmsrP: ps => ps.qYes / (ps.qYes + ps.qNo), validateInvestmentCapProvisioned: () => ({ ok: true }), rndHash: () => 'h', nowStr: () => 'x', console };
  c.window = c; vm.createContext(c); vm.runInContext(LIVE, c);
  return { c, S, PAIRS, run: code => vm.runInContext(code, c) };
}

console.log('▶ banc-paires-vivantes');
T('V1 · _livePairs / _livePairEntries / _livePairStates RÉELS : dans PAIRS ET dans le portefeuille, états nuls sautés, ordre de S.pairStates ; sans portefeuille : vide', () => {
  const w = world();
  assert.deepStrictEqual(w.run('_livePairs()'), LIVEP); assert.deepStrictEqual(w.run('_livePairEntries().map(e => e[0])'), LIVEP);
  assert.strictEqual(w.run('_livePairStates()').length, 12); assert.strictEqual(w.run('_livePairEntries()[0][1]'), w.S.pairStates['BTC/USDT']);
  w.S.pairStates['ETH/USDT'] = null; assert.deepStrictEqual(w.run('_livePairs()'), LIVEP.filter(p => p !== 'ETH/USDT'), 'état nul sauté');
  w.PAIRS['NEW/USDT'] = {}; assert.ok(!w.run('_livePairs()').includes('NEW/USDT'), 'dans PAIRS mais pas encore dans le portefeuille : pas vivante ici');
  w.S.pairStates = null; assert.deepStrictEqual(w.run('_livePairs()'), []);
});
T('V2 · detectMarketRegime RÉEL sur les variations du backup : « calm » (moyenne 1,87 sur 12 vivantes) — avec la paire retirée comptée (ancienne lecture) ce serait « bull » (3,38 sur 13) ; en AA la lecture ne change pas ; aucune paire vivante → calm', () => {
  const w = world(); w.run(fnSrc(s02, 'detectMarketRegime'));
  assert.strictEqual(w.run('detectMarketRegime()'), 'calm');
  const all = ORDER.reduce((a, p) => a + EV24[p], 0) / 13, live = LIVEP.reduce((a, p) => a + EV24[p], 0) / 12;
  assert.ok(all > 2 && live < 2, 'les moyennes du backup : ' + all.toFixed(3) + ' / ' + live.toFixed(3));
  w.PAIRS['GBP/USDT'] = {}; assert.strictEqual(w.run('detectMarketRegime()'), 'bull', 'la même paire remise dans PAIRS : elle compte de nouveau');
  delete w.PAIRS['GBP/USDT']; w.S.pairStates['ADA/USDT'].pnl24h = -50; assert.strictEqual(w.run('detectMarketRegime()'), 'bear', 'moyenne −2,93');
  w.S._regimeOverride = 'volatile'; assert.strictEqual(w.run('detectMarketRegime()'), 'volatile'); delete w.S._regimeOverride;
  Object.keys(w.PAIRS).forEach(k => delete w.PAIRS[k]); assert.strictEqual(w.run('detectMarketRegime()'), 'calm');
});
T('V3 · estimateStakes RÉEL : la conviction d\'une paire retirée ne pèse plus dans le partage du budget ; sa mise n\'est pas touchée ; les mises des vivantes = poids sur les vivantes seules', () => {
  const w = world(); w.run(fnSrc(s02, 'estimateStakes'));
  w.S.pairStates['GBP/USDT'].qYes = 1000; w.S.pairStates['GBP/USDT'].qNo = 100; w.S.pairStates['GBP/USDT'].stake = 777;   // conviction 0,82 : hors de PAIRS, elle ne compte pas
  w.S.pairStates['BTC/USDT'].qYes = 200; w.S.pairStates['BTC/USDT'].qNo = 100;   // conviction 0,33 : engagée
  w.run('estimateStakes()');
  assert.strictEqual(w.S.pairStates['GBP/USDT'].stake, 777, 'paire retirée touchée');
  const conv = p => Math.abs(w.S.pairStates[p].qYes / (w.S.pairStates[p].qYes + w.S.pairStates[p].qNo) - 0.5) * 2;
  const tot = LIVEP.reduce((a, p) => a + Math.max(0.1, conv(p)), 0), want = Math.max(10, Math.round(Math.min(0.30 * w.S.tradingAccount, Math.max(10, 0.80 * w.S.tradingAccount * Math.max(0.1, conv('BTC/USDT')) / tot)) / 10) * 10);
  assert.strictEqual(w.S.pairStates['BTC/USDT'].stake, want, 'mise BTC = part sur les vivantes seules'); assert.strictEqual(w.S.pairStates['ETH/USDT'].stake, 0, 'conviction nulle : 0');
});
T('V4 · la boucle des cycles RÉELLE (multiplexeur de 08) : la paire retirée n\'a ni compte à rebours, ni cycle, ni S.cycle ; les 12 vivantes en ont', () => {
  const loop = between(s08, '      _livePairEntries().forEach(([pair, ps]) => {\n        ps.cycleTimer -= _step;', '      });', true);
  const w = world(); w.S.cycle = 0; const got = []; w.c.resolvePairCycle = p => got.push(p);
  w.run('var _step = 1;\n' + loop);
  assert.deepStrictEqual(got, LIVEP); assert.strictEqual(w.S.cycle, 12); assert.strictEqual(w.S.pairStates['GBP/USDT'].cycleTimer, 1, 'paire retirée : compte à rebours touché'); assert.strictEqual(w.S.pairStates['BTC/USDT'].cycleTimer, 6);
});
T('V5 · emplacements RÉELS (10f _stkBase, 10h _manPlan) : 13 états, 12 vivantes, 1 tenue → 11 ; la part du capital libre = libre / 11 (avant : / 12 avec la paire retirée)', () => {
  const blk = s10f.slice(s10f.indexOf('    var _acc   = S.tradingAccount || 0;'), s10f.indexOf('    _stkBase = Math.max(_floor, _share);') + '    _stkBase = Math.max(_floor, _share);'.length);
  const w = world({ open: [{ pair: 'SOL/USDT', stakeUsdt: 100 }] });
  const acc = w.S.tradingAccount, capT = Math.max(0, acc - Math.max(1, acc * 0.02)), free = Math.max(0, capT - 100);
  const ref = w.run('var ps = S.pairStates["BTC/USDT"]; var _stkBase;\n' + blk + ';\n_stkBase');
  assert.ok(Math.abs(ref - free / 11) < 1e-9, '10f : ' + ref + ' contre ' + free / 11);
  assert.ok(blk.includes('var _slots = _livePairs().filter(') && s10h.includes('const slots = _livePairs().filter(k => !held[k]).length;'), 'les deux textes');
  // la fiche MAN : même part, bornée au libre, arrondie au dixième
  const w2 = world({ open: [{ pair: 'SOL/USDT', stakeUsdt: 100 }] }); w2.c.getTechSignals = () => null; w2.c._thLevel = () => Infinity; w2.c.Date = Date;
  w2.run(fnSrc(s10h, '_manPlan')); const pl = w2.run('_manPlan("BTC/USDT", true)');
  assert.strictEqual(pl.stake, Math.floor(Math.min(free, free / 11) * 10) / 10);
});
T('V6 · affichages du marché RÉELS : humeur du marché (03 updateMarketMood) et comptes BUY / SELL / HOLD de l\'accueil (07) sans la paire retirée ; textes des autres sites convertis', () => {
  const w = world(); const els = {}; w.c.document = { getElementById: id => els[id] || (els[id] = { style: {}, textContent: '', className: '' }) };
  w.run(fnSrc(s03, 'updateMarketMood'));
  w.S.pairStates['GBP/USDT'].qYes = 1000; w.S.pairStates['GBP/USDT'].qNo = 1; w.S.pairStates['GBP/USDT'].totalTrades = 59;   // retirée : probabilité 1, poids 60 — sans elle, 50 % partout
  w.run('updateMarketMood()');
  assert.strictEqual(els.moodIndicatorFill.style.left, '50%', 'l\'humeur comptait la paire retirée');
  const hp = fnSrc(s07, 'renderHomePrices'); assert.ok(hp.includes('_livePairStates().forEach(psx => {'), '07 renderHomePrices');
  [[s07, 'const _lvH = _livePairStates();'], [s07, 'const _lvQ = _livePairStates();'], [s08, 'const pairs   = _livePairs();'], [s08, '_livePairs().some(pair => {'], [s08, '_livePairEntries().forEach(([pair, ps]) => {'], [s08, '_livePairs().forEach(pair => {'],
   [s03, 'const pairs = _livePairs();'], [s02, '_livePairs().forEach(pair => {'], [s02, 'const pairs   = _livePairs();'], [s09g, "const _nLive = (typeof _livePairs === 'function') ? _livePairs().length : Object.keys(pairStates).length;"]].forEach(([s, k]) => assert.ok(s.includes(k), 'texte absent : ' + k));
  assert.ok(!codeStrict(fnSrc(s07, 'renderHome')).includes('/ Object.keys(PAIRS).length'), '07 renderHome : plus de somme sur toutes les paires divisée par les vivantes');
});
T('V7 · INVENTAIRE des boucles brutes sur S.pairStates / walletStore[m].pairStates qui restent (histoire, sauvegarde, rapports, remises à zéro, générateur gardé par cfg) : aucune nouvelle sans classement — les alias locaux (04 detectAnomalies, 05 computeBotFatigue, 08 renderChain : histoire / affichage, relus à la main le 10/10) ne sont pas vus par cet inventaire', () => {
  const ALLOW = {   // fichier + fonction englobante → nombre de boucles brutes tolérées (inventaire du 10/10/2026 soir, après conversion des sites du marché / de la décision)
    '02-state-init.js _simulationTickAll': 1, '02-state-init.js fetchLivePrices': 1, '02-state-init.js blendRealPrices': 1, '02-state-init.js closePosition': 2,
    '03-per-pair-position-buttons-controls-buid.js updateAllPairCtrlLabels': 1, '03-per-pair-position-buttons-controls-buid.js computeAdvancedMetrics': 1, '03-per-pair-position-buttons-controls-buid.js computeWhatIfScenarios': 1, '03-per-pair-position-buttons-controls-buid.js renderResonancePanel': 1, '03-per-pair-position-buttons-controls-buid.js guardianCheck': 1, '03-per-pair-position-buttons-controls-buid.js runRosterAnalysis': 1, '03-per-pair-position-buttons-controls-buid.js renderDebatePanel': 1, '03-per-pair-position-buttons-controls-buid.js renderSwarmPanel': 1, '03-per-pair-position-buttons-controls-buid.js botSmartSizer': 1, '03-per-pair-position-buttons-controls-buid.js renderFleetPanel': 2,
    '04-v8-0-livraison-35-mode-max-permissif-v.js forceTrade': 1, '04-v8-0-livraison-35-mode-max-permissif-v.js checkPnlAlerts': 1, '04-v8-0-livraison-35-mode-max-permissif-v.js _getGoals': 2, '04-v8-0-livraison-35-mode-max-permissif-v.js renderDrawdownSection': 1, '04-v8-0-livraison-35-mode-max-permissif-v.js initWhatIfSection': 2, '04-v8-0-livraison-35-mode-max-permissif-v.js updateWhatIf': 1, '04-v8-0-livraison-35-mode-max-permissif-v.js _buildReplayEvents': 1, '04-v8-0-livraison-35-mode-max-permissif-v.js generateCoachTips': 2,
    '05-v37-19-indicateur-de-fatigue-bot.js _buildReportHTML': 2, '05-v37-19-indicateur-de-fatigue-bot.js renderPdfReportSection': 1, '05-v37-19-indicateur-de-fatigue-bot.js buildExcelData': 2, '05-v37-19-indicateur-de-fatigue-bot.js renderXlExportSection': 2, '05-v37-19-indicateur-de-fatigue-bot.js _getWeekTrades': 1, '05-v37-19-indicateur-de-fatigue-bot.js _updateZen': 1, '05-v37-19-indicateur-de-fatigue-bot.js renderZenSection': 4, '05-v37-19-indicateur-de-fatigue-bot.js _netPnl': 1, '05-v37-19-indicateur-de-fatigue-bot.js _perfectDay': 1, '05-v37-19-indicateur-de-fatigue-bot.js _nightTrades': 1, '05-v37-19-indicateur-de-fatigue-bot.js switchAccount': 1, '05-v37-19-indicateur-de-fatigue-bot.js enterDemoMode': 1, '05-v37-19-indicateur-de-fatigue-bot.js generateDashboardHTML': 2, '05-v37-19-indicateur-de-fatigue-bot.js _fmCalcStats': 1, '05-v37-19-indicateur-de-fatigue-bot.js _updateAod': 1, '05-v37-19-indicateur-de-fatigue-bot.js exportGsTrades': 1, '05-v37-19-indicateur-de-fatigue-bot.js exportGsPaires': 1, '05-v37-19-indicateur-de-fatigue-bot.js exportGsResume': 1, '05-v37-19-indicateur-de-fatigue-bot.js _generateAppsScript': 2, '05-v37-19-indicateur-de-fatigue-bot.js _apiResponse': 3, '05-v37-19-indicateur-de-fatigue-bot.js renderFeeAnalysisSection': 1,
    '06-v63-patterns-chartistes.js _fxAnalyze': 1, '06-v63-patterns-chartistes.js computeRiskScore': 1, '06-v63-patterns-chartistes.js sendHebdoTelegram': 1, '06-v63-patterns-chartistes.js _updateCompactWidget': 1, '06-v63-patterns-chartistes.js renderCompactWidgetSection': 1, '06-v63-patterns-chartistes.js _lbMyStats': 2, '06-v63-patterns-chartistes.js _acAnalyze': 1, '06-v63-patterns-chartistes.js _grGetData': 2, '06-v63-patterns-chartistes.js _rvConsecLosses': 1, '06-v63-patterns-chartistes.js triggerAntiRevenge': 1, '06-v63-patterns-chartistes.js _adnAnnotateTrades': 1, '06-v63-patterns-chartistes.js renderAdnSection': 1, '06-v63-patterns-chartistes.js _memAutoGenerate': 1, '06-v63-patterns-chartistes.js _wxCompute': 1, '06-v63-patterns-chartistes.js renderWeatherSection': 1, '06-v63-patterns-chartistes.js _cinUpdate': 3,
    '07-v90-mode-bunker-sos.js _avComputeRank': 1, '07-v90-mode-bunker-sos.js renderAvatarSection': 1, '07-v90-mode-bunker-sos.js _citContextual': 1, '07-v90-mode-bunker-sos.js runDreamScenario': 2, '07-v90-mode-bunker-sos.js evaluatePairDiversity': 1, '07-v90-mode-bunker-sos.js _confirmFullCoherentReset': 1, '07-v90-mode-bunker-sos.js resetPairPnl': 1, '07-v90-mode-bunker-sos.js renderHome': 2,
    '08-learning-history-render.js _simCandleStep': 1, '08-learning-history-render.js _phEnd': 1,
    '09b1-build-snapshot.js buildSnapshot': 2,
    '09b3-import-export.js _buildDiag': 1,
    '09g-modals.js openDiagnostic': 3,
    '10e4-gardes-comportementales.js _behavDayOpens': 1,
    '10f-resolveur-cycle.js _resolvePairCycleCore': 4,
    '10i-intel-bus.js _horizonRefresh': 1, '10i-intel-bus.js _gainRefresh': 1, '10i-intel-bus.js _stopRefresh': 1,
  };
  const files = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(f => f.startsWith('js/'));
  const RE = /Object\.(values|keys|entries)\(\s*[^()]*pairStates[^()]*\)|\bin\s+[A-Za-z_$.\[\]'"]*pairStates\b/;
  const found = {};
  for (const f of files) {
    const L = rd(f).split('\n');
    for (let i = 0; i < L.length; i++) {
      if (/^\s*\/\//.test(L[i])) continue;
      const code = L[i].replace(/\s\/\/ .*$/, '');
      if (!RE.test(code)) continue;
      let fn = '?';
      for (let k = i; k >= 0; k--) {
        const m = L[k].match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/) || L[k].match(/^(?:window\.)?([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?function/) || L[k].match(/^\s{0,2}(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/) || L[k].match(/^(?:var|let|const)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function|\()/);
        if (m) { fn = m[1]; break; }
      }
      const key = f.replace('js/', '') + ' ' + fn; found[key] = (found[key] || 0) + 1;
    }
  }
  const nouvelles = Object.keys(found).filter(k => !(k in ALLOW) || found[k] > ALLOW[k]);
  assert.deepStrictEqual(nouvelles, [], 'boucle(s) brute(s) sur S.pairStates à CLASSER (marché / décision → _livePairs… ; histoire → ajouter à la liste) : ' + nouvelles.map(k => k + ' ×' + found[k]).join(' ; '));
  const total = Object.values(found).reduce((a, b) => a + b, 0); assert.ok(total <= 104, 'total ' + total);
  ['02-state-init.js detectMarketRegime', '02-state-init.js estimateStakes', '08-learning-history-render.js simTick', '10f-resolveur-cycle.js _resolvePairCycleCore'].forEach(k => assert.ok(!(k in found) || k === '10f-resolveur-cycle.js _resolvePairCycleCore', 'converti puis revenu : ' + k));
  assert.strictEqual(found['10f-resolveur-cycle.js _resolvePairCycleCore'], 4, '10f : les 4 totaux d\'histoire (totalTrades / winTrades), plus les emplacements');
  console.log('       ' + total + ' boucles brutes dans ' + Object.keys(found).length + ' fonctions, toutes classées');
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
