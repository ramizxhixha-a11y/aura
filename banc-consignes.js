// banc-consignes.js — [CONSIGNES · 06/10/2026] VERSION 20261006b
// Go Rams « Go consignes » : TOUTE ouverture manuelle (« ✓ Appliquer », panneau par paire, « ↓ Inverser », ouverture rapide, fiche MAN) reçoit
// tes consignes de la paire (perte max, durée — ou 2 % / 60 min) et un TP / SL du BON côté pour le sens ouvert ; Inverser garde mise, levier,
// distances de TP / SL et consignes ; les consignes par paire survivent à la relance. Rien ne change pour les bots (ils n'ouvrent jamais par
// openPosition). Testé sur le CODE RÉEL : openPosition, _manConsigneOf, _manOpenWarnings, applyBotSuggestion (02), _openProposedPosition (03),
// _calcBotTpSl, manuInvert (07), _manConsignesWatchdog (09e), _manPlan (10h), extraits et exécutés en vm ; le reste de l'app est simulé.
// Preuve d'origine : sonde du 06/10 (vraie app, backup du 06/10 19:46) — Inverser : mise 80 $ → 30 $, TP 1,5 % → 1,05 %, consignes perdues ;
// Appliquer / panneau : aucune consigne, aucun trade fermé par le garde-fou à 95 min ; panneau : SHORT sur proposition LONG → TP et SL du
// mauvais côté, fermé au passage suivant ; consignes de la paire absentes du snapshot.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
// Extrait « function name(...) { ... } » (niveau 0) en sautant chaînes, gabarits ${…} et commentaires (même outil que banc-zombie / banc-manu).
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); assert.ok(m, 'fonction absente : ' + name);
  const start = m.index + m[1].length;
  const st = [];
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
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s07 = rd('js/07-v90-mode-bunker-sos.js');
const s09e = rd('js/09e-guards.js'), s10h = rd('js/10h-pont-fullpower-bricks.js'), s09b1 = rd('js/09b1-build-snapshot.js'), s09b2 = rd('js/09b2-save-load.js');
const MIN = 60000;
const PRICES = { 'BTC/USDT': 85584.01, 'ETH/USDT': 2701.6, 'SOL/USDT': 120.19, 'DOGE/USDT': 0.0948 };
const DEC = { 'BTC/USDT': 0, 'ETH/USDT': 0, 'SOL/USDT': 2, 'DOGE/USDT': 4 };   // comme PAIRS (02)

function mkCtx(over) {
  const toasts = [], els = {};
  const S = Object.assign({
    tradingMode: 'paperReal', botAutoMode: false, tradingAccount: 1000, cashAccount: 0, leverage: 0, portfolio: 1000,
    chainLog: [], agents: [], openPositions: [], currentPage: 0, _manConsignes: undefined,
    pairStates: Object.fromEntries(Object.entries(PRICES).map(([p, px]) => [p, { price: px, stake: 30, pairLeverage: 1, trades: [], _dc: { C: 0.12, n: 10, ts: Date.now() } }]))
  }, over || {});
  const ctx = { S, Math, Number, Object, Array, String, JSON, Date, isFinite, parseFloat, parseInt, console, Error,
    PAIRS: Object.fromEntries(Object.keys(PRICES).map(p => [p, { dec: DEC[p] }])),
    rndHash: () => 'h', nowStr: () => '00:00', showToast: (m) => toasts.push(m), lmsrP: () => 0.5,
    detectMarketRegime: () => 'calm', fmt$: (x) => '$' + x, fmt$2: (x) => '$' + x,
    validateTotalExposure: () => ({ ok: true, available: 1e9 }), borrowLeverage: () => 0, repayLeverage: () => 0,
    ensureLeverageCoverForTrade: () => ({ ok: true, borrowed: 0 }), syncLeverageReserve: () => {}, getCapitalSummary: () => ({ free: 1000 }),
    updatePairBtnStates: () => {}, renderPositions: () => {}, renderChain: () => {}, renderActionsGrid: () => {},
    navigator: {}, setTimeout: (f) => f(),
    document: { getElementById: (id) => els[id] || null, activeElement: null },
    closePosition: (id, botClose) => {   // comme 02 closePosition : mise + P&L rendus au compte, position retirée ; garde absolue du bot
      const i = S.openPositions.findIndex(p => p.id === id); if (i < 0) return;
      if (botClose && S.openPositions[i].auto !== true) return;
      S.tradingAccount += Number(S.openPositions[i].stakeUsdt) || 0;
      S.openPositions = S.openPositions.filter(p => p.id !== id);
    } };
  ctx._computePortfolio = () => S.cashAccount + S.tradingAccount;
  ctx.window = ctx; ctx.toasts = toasts; ctx.els = els;
  vm.createContext(ctx);
  vm.runInContext([
    fnSrc(s02, '_livePairs'),   // [PAIRES VIVANTES · 10/10/2026] 10h _manPlan compte les emplacements sur les paires vivantes (02)
    fnSrc(s02, '_manOpenWarnings'), fnSrc(s02, '_manConsigneOf'), fnSrc(s02, 'openPosition'), fnSrc(s02, 'applyBotSuggestion'), fnSrc(s02, 'quickOpen'),
    fnSrc(s03, '_openProposedPosition'), fnSrc(s07, '_calcBotTpSl'), fnSrc(s07, 'manuInvert'), fnSrc(s09e, '_manConsignesWatchdog'), fnSrc(s10h, '_manPlan')
  ].join('\n'), ctx);
  // ids uniques même dans la même milliseconde
  let n = 0; const DN = Date.now; ctx.Date = { now: () => DN() + (n++) };
  return ctx;
}
const run = (c, code) => vm.runInContext(code, c);
const pct = (x, e) => Math.abs(x / e - 1) * 100;
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, m + ' : ' + a + ' ≠ ' + b);
function sides(p) {
  const e = p.entryPrice;
  if (p.side === 'long') { assert.ok(p.tp > e, 'TP LONG au-dessus de l\'entrée'); assert.ok(p.sl < e, 'SL LONG en dessous'); }
  else { assert.ok(p.tp < e, 'TP SHORT en dessous de l\'entrée'); assert.ok(p.sl > e, 'SL SHORT au-dessus'); }
}

console.log('▶ banc-consignes');

T('K1 · ouverture sans fiche (Appliquer / panneau / rapide → openPosition) : consignes de la paire, sinon 2 % / 60 min, heure d\'ouverture posée', () => {
  const c = mkCtx({ _manConsignes: { 'ETH/USDT': { maxLossPct: 3, timeoutMin: 90 } } });
  const a = run(c, "openPosition('BTC/USDT', 'long')"), b = run(c, "openPosition('ETH/USDT', 'short')");
  assert.ok(a && b, 'positions ouvertes');
  assert.strictEqual(a._manMaxLossPct, 2); assert.strictEqual(a._manTimeoutMin, 60);
  assert.strictEqual(b._manMaxLossPct, 3); assert.strictEqual(b._manTimeoutMin, 90);
  assert.ok(a._manOpenedAt > 0 && b._manOpenedAt > 0);
  assert.strictEqual(a.auto, false); assert.strictEqual(b.auto, false);
});

T('K2 · TP / SL par défaut = la règle des bots que la fiche affiche (10h _manPlan), du bon côté en LONG comme en SHORT', () => {
  const c = mkCtx();
  const L = run(c, "_manPlan('SOL/USDT').lv"), e = PRICES['SOL/USDT'];
  const a = run(c, "openPosition('SOL/USDT', 'long')"); sides(a); near(pct(a.tp, e), L.long.tp, 'TP LONG'); near(pct(a.sl, e), L.long.sl, 'SL LONG');
  const b = run(c, "openPosition('SOL/USDT', 'short')"); sides(b); near(pct(b.tp, e), L.short.tp, 'TP SHORT'); near(pct(b.sl, e), L.short.sl, 'SL SHORT');
});

T('K3 · paire sous 1 $ (DOGE) : TP / SL du bon côté aux distances de la règle des bots, en LONG comme en SHORT', () => {
  const c = mkCtx(), e = PRICES['DOGE/USDT'];
  const L = run(c, "_manPlan('DOGE/USDT').lv");
  const p = run(c, "openPosition('DOGE/USDT', 'short')"); sides(p); near(pct(p.tp, e), L.short.tp, 'TP SHORT'); near(pct(p.sl, e), L.short.sl, 'SL SHORT');
  const r = run(c, "_calcBotTpSl('DOGE/USDT', 'long')"); assert.ok(r.tp > e && r.sl < e && r.src === 'bots', JSON.stringify(r));
});

T('K4 · « ↓ Inverser » : mise, levier, distances de TP / SL et consignes gardés, posés du bon côté ; mise de la paire rendue', () => {
  const c = mkCtx();
  run(c, "var _p0 = openPosition('ETH/USDT', 'long', { tpPct: 1.5, slPct: 0.7, maxLossPct: 3, timeoutMin: 90 })");
  // la fiche MAN prête sa mise (80 $) le temps de l'ouverture : on la pose sur la position comme 10e
  run(c, "_p0.stakeUsdt = 80; _p0.totalExposure = 80");
  run(c, "manuInvert('ETH/USDT')");
  const ps = c.S.openPositions.filter(p => p.pair === 'ETH/USDT');
  assert.strictEqual(ps.length, 1, 'une seule position sur la paire');
  const p = ps[0], e = p.entryPrice;
  assert.strictEqual(p.side, 'short'); sides(p);
  assert.strictEqual(p.stakeUsdt, 80, 'mise gardée (était 30 $ = mise par défaut de la paire)');
  near(pct(p.tp, e), 1.5, 'TP 1,5 %'); near(pct(p.sl, e), 0.7, 'SL 0,7 %');
  assert.strictEqual(p._manMaxLossPct, 3); assert.strictEqual(p._manTimeoutMin, 90);
  assert.strictEqual(c.S.pairStates['ETH/USDT'].stake, 30, 'ps.stake rendu');
  assert.ok(c.toasts.some(t => /inversé → SHORT/.test(t)));
});

T('K5 · « ↓ Inverser » qui ne rouvre pas : dit « non rouvert », jamais « inversé »', () => {
  const c = mkCtx();
  run(c, "openPosition('BTC/USDT', 'long')");
  c.validateTotalExposure = () => ({ ok: false, available: 0 });
  run(c, "manuInvert('BTC/USDT')");
  assert.ok(!c.toasts.some(t => /inversé/.test(t)), 'pas de « inversé »');
  assert.ok(c.toasts.some(t => /non rouvert/.test(t)));
});

T('K6 · panneau par paire (03) : SHORT cliqué sur une proposition LONG → mêmes distances, du bon côté, posées tout de suite, avec consignes', () => {
  const c = mkCtx(), e = PRICES['SOL/USDT'];
  const el = (v, ds) => ({ value: String(v), dataset: ds || {} });
  Object.assign(c.els, { pinput_stake_SOL_USDT: el(40), pinput_lev_SOL_USDT: el('', { val: '1' }), pinput_tp_SOL_USDT: el(e * 1.01), pinput_sl_SOL_USDT: el(e * 0.995) });
  run(c, "_openProposedPosition('SOL/USDT', 'short')");
  const p = c.S.openPositions.find(x => x.pair === 'SOL/USDT');
  assert.ok(p, 'ouverte'); sides(p);
  near(pct(p.tp, e), 1, 'TP 1 %'); near(pct(p.sl, e), 0.5, 'SL 0,5 %');
  assert.strictEqual(p._manTimeoutMin, 60); assert.strictEqual(p.stakeUsdt, 40);
  assert.strictEqual(c.S.pairStates['SOL/USDT'].stake, 30, 'ps.stake rendu');
});

T('K7 · garde-fou (09e) : une ouverture hors fiche est fermée à sa durée (60 min), celle à 90 min tient à 61 min', () => {
  const c = mkCtx({ _manConsignes: { 'ETH/USDT': { maxLossPct: 3, timeoutMin: 90 } } });
  run(c, "openPosition('BTC/USDT', 'long'); openPosition('ETH/USDT', 'long')");
  c.S.openPositions.forEach(p => { p._manOpenedAt -= 61 * MIN; });
  run(c, '_manConsignesWatchdog()');
  assert.deepStrictEqual(c.S.openPositions.map(p => p.pair), ['ETH/USDT']);
  assert.ok(c.S.chainLog.some(l => /Garde-fou MAN · BTC\/USDT LONG fermé · Timeout atteint \(61min ≥ 60min\)/.test(l.desc)));
});

T('K8 · « ✓ Appliquer » : « appliquée » seulement si la position existe ; consignes posées', () => {
  const c = mkCtx();
  run(c, "applyBotSuggestion('SOL/USDT', 'short', 50)");
  const p = c.S.openPositions.find(x => x.pair === 'SOL/USDT'); assert.ok(p); sides(p); assert.strictEqual(p._manTimeoutMin, 60);
  assert.ok(c.toasts.some(t => /Suggestion appliquée/.test(t)));
  const c2 = mkCtx(); c2.validateTotalExposure = () => ({ ok: false, available: 0 });
  run(c2, "applyBotSuggestion('SOL/USDT', 'short', 50)");
  assert.ok(!c2.toasts.some(t => /Suggestion appliquée/.test(t)), 'pas de « appliquée » sans position');
});

T('K9 · consignes par paire dans le snapshot : écrites (09b1), relues (09b2 applySnap), au manifeste', () => {
  assert.ok(/_manConsignes: S\._manConsignes \|\| \{\}/.test(s09b1), '09b1 écrit _manConsignes');
  assert.ok(/if \(snap\._manConsignes && typeof snap\._manConsignes === 'object'\)\s+S\._manConsignes\s+= snap\._manConsignes;/.test(s09b2), '09b2 relit _manConsignes');
  assert.ok(/_APPLYSNAP_MANIFEST = \[[^\]]*'_manConsignes'/.test(s09b2), 'manifeste');
});

T('K10 · rien pour les bots : openPosition n\'est appelée que par les ouvertures manuelles', () => {
  const allowed = new Set(['quickOpen', 'applyBotSuggestion', '_openProposedPosition', 'manuInvert', '_openManTrade']);
  const html = rd('AURA8_v118.html'), files = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map(m => m[1]);
  const seen = [];
  files.forEach(f => {
    const src = rd(f), lines = src.split('\n'); let cur = null;
    lines.forEach(l => {
      const m = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/.exec(l); if (m) cur = m[1];
      const code = l.replace(/\/\/.*$/, '');
      if (/(^|[^A-Za-z0-9_$.])openPosition\s*\(/.test(code) && !/function\s+openPosition/.test(code)) seen.push(f + ':' + cur);
    });
  });
  assert.ok(seen.length >= 5, 'appelants trouvés : ' + seen.join(', '));
  seen.forEach(s => assert.ok(allowed.has(s.split(':')[1]), 'appelant inattendu : ' + s));
});

console.log((fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
