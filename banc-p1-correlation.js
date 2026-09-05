// ▓▓▓ BANC D'ESSAI P1 · CORRÉLATION ANTI-DOUBLON (05/09/2026) ▓▓▓
// [P4 · 06/09/2026] idem pour _behavGateForOpen (brique 4, bloc rejoué dans le texte 09c) : stubbée NEUTRE.
// [P3 · 06/09/2026] idem pour _heatGateForOpen (brique 3) : stubbée NEUTRE.
// [P2 · 06/09/2026] les textes rejoués de 10f et 09c appellent désormais _ecoGateForOpen (brique 2) : stubbée NEUTRE ici
// (ce banc teste P1 seul, indépendamment de la date de lancement) ; la porte éco est testée par banc-p2-calendrier.js.
// À lancer à la RACINE du dépôt (node banc-p1-correlation.js). Charge le VRAI fichier 10e livré dans un contexte node avec les stubs minimaux,
// nourri par les bougies Binance réelles du snapshot aura_live.json,
// puis rejoue le texte LIVRÉ des portes 10f et du veto 09c.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const live = JSON.parse(fs.readFileSync('aura_live.json','utf8')).aura;
let pass = 0, fail = 0;
function T(name, fn){ try { fn(); pass++; console.log('  ✅', name); } catch(e){ fail++; console.log('  ❌', name, '→', e.message); } }

// ── contexte partagé ──────────────────────────────────────────────
const PAIRS = {}; Object.keys(live.pairStates).forEach(p => PAIRS[p] = { dec: 2 });
const S = { tradingMode: 'sim', pairStates: live.pairStates, realCandles: live.realCandles,
            openPositions: [], adaptiveState: {}, chainLog: [], brainLog: [], paperRealTimeframe: '1h' };
const ctx = { S, PAIRS, window: {}, navigator: {}, document: { getElementById: () => null },
  console, Date, Math, Object, String, Number, Array, JSON, isFinite, Promise, setTimeout, clearTimeout,
  _getActiveRealTimeframe: () => (S.tradingMode === 'paperReal' ? (S.paperRealTimeframe || '15m') : '15m'),
  rndHash: () => 'h', nowStr: () => 't', showToast: (m) => { ctx._toasts.push(m); }, _toasts: [],
  _currentDetailPair: null, closePairDetail(){}, openPairDetail(){}, _lastRealPriceTs: 0, _netwatchState:'online',
  _netOfflineSinceTs:0,_freshPricesInRow:0,_simRunning:false,_netwatchPausedBot:false,_net10sSaveTriggered:false,
  _updateNetIndicator(){}, _settingsPulseTimer:null };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/10e-helpers-adaptatifs.js','utf8'), ctx, { filename: '10e' });

console.log('\n── A · 10e livré : matrice, cache, accès ──');
T('matrice construite sur les retours réels (BTC|ETH ≈ 0.86, DOGE|AVAX ≈ 0.97)', () => {
  const m = ctx._refreshCorrelationMatrix();
  assert.ok(Math.abs(m['BTC/USDT|ETH/USDT'] - 0.86) < 0.02, 'BTC|ETH=' + m['BTC/USDT|ETH/USDT']);
  assert.ok(Math.abs(m['AVAX/USDT|DOGE/USDT'] - 0.97) < 0.02, 'AVAX|DOGE=' + m['AVAX/USDT|DOGE/USDT']);
  assert.strictEqual(Object.keys(m).length, 28, '8 paires → 28 couples');
  assert.strictEqual(S.adaptiveState.correlationMatrixTf, '15m');
});
T('cache 5 min : même objet tant que TTL/TF inchangés', () => {
  const m1 = ctx._refreshCorrelationMatrix(), ts1 = S.adaptiveState.correlationMatrixTs;
  const m2 = ctx._refreshCorrelationMatrix();
  assert.strictEqual(m1, m2); assert.strictEqual(S.adaptiveState.correlationMatrixTs, ts1);
});
T('cache invalidé par changement de timeframe (EV 1h → recalcul, Tf mémorisé)', () => {
  S.tradingMode = 'paperReal';
  const m = ctx._refreshCorrelationMatrix();
  assert.strictEqual(S.adaptiveState.correlationMatrixTf, '1h');
  assert.ok(Object.keys(m).length >= 20, 'couples 1h=' + Object.keys(m).length);
  S.tradingMode = 'sim'; ctx._refreshCorrelationMatrix();
  assert.strictEqual(S.adaptiveState.correlationMatrixTf, '15m');
});
T('cache invalidé par expiration TTL', () => {
  S.adaptiveState.correlationMatrixTs = Date.now() - 6 * 60 * 1000;
  const before = S.adaptiveState.correlationMatrix;
  const m = ctx._refreshCorrelationMatrix();
  assert.notStrictEqual(m, before); assert.ok(Date.now() - S.adaptiveState.correlationMatrixTs < 1000);
});
T('_getPairCorrelation : symétrique, même paire = 1, inconnue = null (contrat des 3 consommateurs)', () => {
  const ab = ctx._getPairCorrelation('BTC/USDT','ETH/USDT'), ba = ctx._getPairCorrelation('ETH/USDT','BTC/USDT');
  assert.strictEqual(ab, ba); assert.ok(typeof ab === 'number');
  assert.strictEqual(ctx._getPairCorrelation('BTC/USDT','BTC/USDT'), 1.0);
  assert.strictEqual(ctx._getPairCorrelation('BTC/USDT','PEPE/USDT'), null);
});
T('paire sans bougies suffisantes → absente de la matrice → null (neutre)', () => {
  PAIRS['NEW/USDT'] = { dec: 4 }; S.pairStates['NEW/USDT'] = { candles: [], trades: [], price: 1 };
  S.adaptiveState.correlationMatrixTs = 0; ctx._refreshCorrelationMatrix();
  assert.strictEqual(ctx._getPairCorrelation('NEW/USDT','BTC/USDT'), null);
  delete PAIRS['NEW/USDT']; delete S.pairStates['NEW/USDT']; S.adaptiveState.correlationMatrixTs = 0;
});

console.log('\n── B · _corrGateForOpen : veto / bonus / neutre ──');
T('aucune position → neutre', () => {
  S.openPositions = [];
  const g = ctx._corrGateForOpen('BTC/USDT','long'); assert.deepStrictEqual([g.veto, g.bonus], [false, 0]);
});
T('ETH LONG ouvert → BTC LONG = même pari (0.86) → VETO', () => {
  S.openPositions = [{ pair:'ETH/USDT', side:'long', auto:true }];
  const g = ctx._corrGateForOpen('BTC/USDT','long');
  assert.strictEqual(g.veto, true); assert.strictEqual(g.withPair, 'ETH/USDT'); assert.ok(g.eff > 0.80);
});
T('ETH LONG ouvert → BTC SHORT = pari inverse (eff −0.86) → BONUS 0.03', () => {
  const g = ctx._corrGateForOpen('BTC/USDT','short');
  assert.strictEqual(g.veto, false); assert.strictEqual(g.bonus, 0.03); assert.ok(g.eff < -0.80);
});
T('AVAX SHORT (manuel, side "sell") → DOGE SHORT = même pari (0.97) → VETO', () => {
  S.openPositions = [{ pair:'AVAX/USDT', side:'sell', auto:false }];
  assert.strictEqual(ctx._corrGateForOpen('DOGE/USDT','short').veto, true);
  assert.strictEqual(ctx._corrGateForOpen('DOGE/USDT','long').bonus, 0.03);
});
T('LINK LONG ouvert → BTC LONG (corr 0.03) → neutre', () => {
  S.openPositions = [{ pair:'LINK/USDT', side:'long' }];
  const g = ctx._corrGateForOpen('BTC/USDT','long'); assert.deepStrictEqual([g.veto, g.bonus], [false, 0]);
});
T('position sur la paire elle-même ignorée', () => {
  S.openPositions = [{ pair:'BTC/USDT', side:'long' }];
  const g = ctx._corrGateForOpen('BTC/USDT','long'); assert.deepStrictEqual([g.veto, g.bonus], [false, 0]);
});
T('veto prime sur bonus (ETH LONG + AVAX LONG ouverts, candidat BTC LONG)', () => {
  S.openPositions = [{ pair:'AVAX/USDT', side:'long' }, { pair:'ETH/USDT', side:'long' }];
  const g = ctx._corrGateForOpen('BTC/USDT','long'); assert.strictEqual(g.veto, true); assert.strictEqual(g.bonus, 0);
});
T('seuil strict : eff = 0.80 exactement → pas de veto', () => {
  S.adaptiveState.correlationMatrix['BTC/USDT|ETH/USDT'] = 0.80; S.adaptiveState.correlationMatrixTs = Date.now();
  S.openPositions = [{ pair:'ETH/USDT', side:'long' }];
  assert.strictEqual(ctx._corrGateForOpen('BTC/USDT','long').veto, false);
  S.adaptiveState.correlationMatrixTs = 0;
});

console.log('\n── C · 10f livré : portes avec bonus (texte réel) ──');
const src10f = fs.readFileSync('js/10f-resolveur-cycle.js','utf8');
const gateTxt = src10f.slice(src10f.indexOf("  const _mktReg ="), src10f.indexOf("  const dirGate"));
const floorTxt = src10f.slice(src10f.indexOf("  const _convFloor ="), src10f.indexOf("  if(_gainNet < _minNetGain"));
function runGates(o){
  const c = Object.assign(Object.create(ctx), o);
  const code = 'var out={};(function(){' + gateTxt + floorTxt + 'out.convGate=convGate;out.req=_gates.conv+_expPenalty-_corrBonus;out.floor=_convFloor;out.dec=_corrDecisive;out.bonus=_corrBonus;})();out';
  return vm.runInNewContext(code, { S: c.S, PAIRS, detectMarketRegime: () => c.regime, _corrGateForOpen: ctx._corrGateForOpen, _ecoGateForOpen: () => ({ veto:false, malus:0, event:null, minutes:null }), _heatGateForOpen: () => ({ delta:0, hour:0, wr:null, count:0, tag:null }),
    ps: c.ps, pair: c.pair, effectiveConviction: c.conv, finalSignalWithMem: c.sig, _pairWatch: false, Math, Number });
}
T('CALM 0.35 · conv 0.33 · BTC SHORT vs ETH LONG (anti-corrélé) → porte 0.32 passe, DÉCISIF', () => {
  S.openPositions = [{ pair:'ETH/USDT', side:'long' }];
  const r = runGates({ S, regime:'calm', ps:{ trades:[] }, pair:'BTC/USDT', conv:0.33, sig:-0.5 });
  assert.strictEqual(r.bonus, 0.03); assert.ok(Math.abs(r.req - 0.32) < 1e-9); assert.strictEqual(r.convGate, true); assert.strictEqual(r.dec, true);
});
T('CALM 0.35 · conv 0.33 · BTC LONG vs ETH LONG (doublon) → pas de bonus en 10f, porte 0.35 ferme (le veto est en 09c)', () => {
  const r = runGates({ S, regime:'calm', ps:{ trades:[] }, pair:'BTC/USDT', conv:0.33, sig:0.5 });
  assert.strictEqual(r.bonus, 0); assert.strictEqual(r.convGate, false); assert.strictEqual(r.dec, false);
});
T('bull 0.25 · conv 0.28 · anti-corrélé → plancher 0.30→0.27 passe, DÉCISIF (par le plancher)', () => {
  const r = runGates({ S, regime:'bull', ps:{ trades:[] }, pair:'BTC/USDT', conv:0.28, sig:-0.5 });
  assert.strictEqual(r.convGate, true); assert.ok(Math.abs(r.floor - 0.27) < 1e-9); assert.strictEqual(r.dec, true);
});
T('anti-corrélé mais conviction 0.40 → bonus présent, NON décisif', () => {
  const r = runGates({ S, regime:'bull', ps:{ trades:[] }, pair:'BTC/USDT', conv:0.40, sig:-0.5 });
  assert.strictEqual(r.bonus, 0.03); assert.strictEqual(r.dec, false);
});
T('paire ayant déjà une position → brique non évaluée (gestion, pas ouverture)', () => {
  S.openPositions = [{ pair:'ETH/USDT', side:'long' }, { pair:'BTC/USDT', side:'long' }];
  const r = runGates({ S, regime:'calm', ps:{ trades:[] }, pair:'BTC/USDT', conv:0.33, sig:-0.5 });
  assert.strictEqual(r.bonus, 0);
});
T('pénalité d’expectancy et bonus se cumulent (0.35 + 0.10 − 0.03 = 0.42)', () => {
  S.openPositions = [{ pair:'ETH/USDT', side:'long' }];
  const trades = Array.from({length:10}, () => ({ type:'position', pnlUsdt:-0.2 }));
  const r = runGates({ S, regime:'calm', ps:{ trades }, pair:'BTC/USDT', conv:0.41, sig:-0.5 });
  assert.ok(Math.abs(r.req - 0.42) < 1e-9); assert.strictEqual(r.convGate, false);
});

console.log('\n── D · 09c livré : veto dans l’entonnoir (texte réel) ──');
const src09c = fs.readFileSync('js/09c-auto-open.js','utf8');
const vetoTxt = src09c.slice(src09c.indexOf("  try {\n    const _cg = _corrGateForOpen(pair, side);"), src09c.indexOf("  // Smart Sizer applique"));
const declTxt = src09c.slice(src09c.indexOf("const _corrVetoLogTs = {};"), src09c.indexOf("const _corrVetoLogTs = {};") + "const _corrVetoLogTs = {};".length);
const c09 = { S, _corrGateForOpen: ctx._corrGateForOpen, _ecoGateForOpen: () => ({ veto:false, malus:0, event:null, minutes:null }), _ecoVetoLogTs: {}, _behavVetoLogTs: {}, _behavGateForOpen: () => ({ veto:false, reason:null, coolLeftMin:0, stakeCap:0, lastLossUsd:0, dayCount:0, dayCap:Infinity }), rndHash: () => 'h', nowStr: () => 't', window: ctx, showToast: ctx.showToast, Date, String, Math };
vm.createContext(c09);
vm.runInContext(declTxt + '\nfunction _open(pair, side){' + vetoTxt + '\nreturn "OUVERT";}', c09);
T('ETH LONG ouvert → autoOpen BTC LONG refusé : EVAL reçoit CORR, journal 🔗 + toast', () => {
  S.openPositions = [{ pair:'ETH/USDT', side:'long' }]; S.brainLog = []; S.chainLog = []; ctx._toasts = [];
  const r = c09._open('BTC/USDT','long');
  assert.strictEqual(r, undefined); assert.strictEqual(S.brainLog[0].event, 'CORR'); assert.strictEqual(S.brainLog[0].pair, 'BTC/USDT');
  assert.ok(/Doublon refusé · corr \+0\.8\d avec ETH\/USDT LONG/.test(S.brainLog[0].reason), S.brainLog[0].reason);
  assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(S.chainLog[0].icon, '🔗'); assert.strictEqual(ctx._toasts.length, 1);
});
T('2e refus dans les 5 min : EVAL à nouveau, journal/toast silencieux (anti-flood)', () => {
  c09._open('BTC/USDT','long');
  assert.strictEqual(S.brainLog.length, 2); assert.strictEqual(S.chainLog.length, 1); assert.strictEqual(ctx._toasts.length, 1);
});
T('BTC SHORT (anti-corrélé) traverse le veto → OUVERT', () => {
  assert.strictEqual(c09._open('BTC/USDT','short'), 'OUVERT');
});
T('sans position ouverte → OUVERT', () => { S.openPositions = []; assert.strictEqual(c09._open('BTC/USDT','long'), 'OUVERT'); });

console.log('\n── E · ancien contrat des consommateurs existants ──');
T('09d1 _checkCorrelationLimit (texte réel) revit : ETH LONG + BTC LONG (0.86 > 0.7) → mise ×0.5', () => {
  const src = fs.readFileSync('js/09d1-paper-real-core.js','utf8');
  const fn = src.slice(src.indexOf('function _checkCorrelationLimit'), src.indexOf('window._checkCorrelationLimit'));
  S.paperRealConfig = { correlationLimitEnabled: true, correlationThreshold: 0.7, correlationDecimateFactor: 0.5 };
  S.openPositions = [{ pair:'ETH/USDT', side:'long', auto:true }];
  const r = vm.runInNewContext(fn + '\n_checkCorrelationLimit("BTC/USDT","long")', { S, _getPairCorrelation: ctx._getPairCorrelation, Date });
  assert.strictEqual(r.decimate, 0.5); assert.strictEqual(r.correlatedWith, 'ETH/USDT');
});
T('03 botArb (contrat) : corr>0.65 ET retours ≥10 disponibles pour BTC/ETH', () => {
  assert.ok(ctx._getPairCorrelation('BTC/USDT','ETH/USDT') > 0.65);
  assert.ok(ctx._getPairReturns('BTC/USDT').length >= 10);
});

console.log(`\nRÉSULTAT : ${pass} ✅ · ${fail} ❌`);
process.exit(fail ? 1 : 0);
