// banc-zombie.js — [ZOMBIE · 06/10/2026] VERSION 20261006a
// Go Rams « Go zombie » : sur une position MANUELLE, ce sont SES consignes qui décident (TP / SL de la fiche, perte max et durée de 09e) ;
// le minuteur anti-zombie de 07 (30 min, |P&L| < 0,3 %) ne ferme plus que les positions des bots. Testé sur le CODE RÉEL : learnFromOpenPositions
// et _trailStopHit (07), _manConsignesWatchdog (09e) extraits et exécutés en vm ; closePosition simulée (retire la position, garde botClose).
// Preuve d'origine : backup 06/10 19:46 — 15 des 28 trades manuels du 05/10 fermés « 30min flat » avant leur durée de 60 min.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
// Extrait « function name(...) { ... } » (niveau 0) en sautant chaînes, gabarits ${…} et commentaires (même outil que banc-manu / banc-cartes).
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
const s07 = rd('js/07-v90-mode-bunker-sos.js'), s09e = rd('js/09e-guards.js'), s10h = rd('js/10h-pont-fullpower-bricks.js');
const MIN = 60000;

function mkCtx(positions, prices, over) {
  const closed = [], toasts = [];
  const S = Object.assign({
    tradingMode: 'paperReal', tradingAccount: 1079, gainRules: {}, chainLog: [],
    openPositions: positions,
    pairStates: Object.fromEntries(Object.entries(prices).map(([p, px]) => [p, { price: px, _dc: { C: 0, n: 10, ts: 0 } }]))
  }, over || {});
  const ctx = { S, Math, Number, Object, Array, String, JSON, Date, isFinite, console,
    rndHash: () => 'h', nowStr: () => '00:00', showToast: (m) => toasts.push(m), lmsrP: () => 0.5,
    closePosition: (id, botClose) => {
      const i = S.openPositions.findIndex(p => p.id === id); if (i < 0) return;
      if (botClose && S.openPositions[i].auto !== true) return;   // garde absolue de 02 (le bot ne ferme pas une manuelle)
      closed.push({ id, botClose, pair: S.openPositions[i].pair }); S.openPositions = S.openPositions.filter(p => p.id !== id);   // comme 02 closePosition
    } };
  ctx.window = ctx; ctx.closed = closed; ctx.toasts = toasts;
  vm.createContext(ctx);
  vm.runInContext([fnSrc(s07, '_trailStopHit'), fnSrc(s07, 'learnFromOpenPositions'), fnSrc(s09e, '_manConsignesWatchdog')].join('\n'), ctx);
  return ctx;
}
const run = (c, code) => vm.runInContext(code, c);
// Position MANUELLE telle que la fiche MAN la pose (10e _openManTrade) : TP / SL en prix du sens cliqué, consignes 2 % / 60 min.
function manPos(id, pair, side, entry, ageMin, extra) {
  const d = side === 'long' ? 1 : -1, t = Date.now() - ageMin * MIN;
  return Object.assign({ id, pair, side, entryPrice: entry, stakeUsdt: 80, totalExposure: 80, auto: false, tp: entry * (1 + d * 0.0077), sl: entry * (1 - d * 0.0045),
    openedAt: t, entryTs: t, _manOpenedAt: t, _manMaxLossPct: 2, _manTimeoutMin: 60 }, extra || {});
}
function botPos(id, pair, side, entry, ageMin, extra) {
  const t = Date.now() - ageMin * MIN;
  return Object.assign({ id, pair, side, entryPrice: entry, stakeUsdt: 50, totalExposure: 50, auto: true, tp: null, sl: null, openedAt: t, entryTs: t }, extra || {});
}

console.log('▶ banc-zombie');

T('Z1 · manuelle à plat 31 min (fiche, consigne 60 min) : le moteur de sortie 07 ne la ferme plus', () => {
  const c = mkCtx([manPos('m1', 'ETH/USDT', 'long', 2701.6, 31), manPos('m2', 'DOGE/USDT', 'short', 0.0948, 31)], { 'ETH/USDT': 2701.6, 'DOGE/USDT': 0.0948 });
  run(c, 'learnFromOpenPositions()');
  assert.deepStrictEqual(c.closed, [], 'aucune fermeture : ' + JSON.stringify(c.closed));
  assert.strictEqual(c.S.openPositions.length, 2);
  assert.ok(!c.S.chainLog.some(l => /anti-zombie/.test(l.desc)), 'aucune ligne « Timer anti-zombie »');
});

T('Z2 · manuelle sans consigne (ouverte hors fiche), à plat 10 h : 07 ne la ferme pas non plus (c\'est ton trade)', () => {
  const p = manPos('m3', 'BTC/USDT', 'short', 86500, 600, { tp: null, sl: null, _manMaxLossPct: undefined, _manTimeoutMin: undefined, _manOpenedAt: undefined });
  const c = mkCtx([p], { 'BTC/USDT': 86480 });
  run(c, 'learnFromOpenPositions(); _manConsignesWatchdog()');
  assert.deepStrictEqual(c.closed, []);
});

T('Z3 · bot à plat 31 min, sans règle de gain : l\'anti-zombie le ferme TOUJOURS, sortie marquée « zombie » (rien ne change pour les bots)', () => {
  const b = botPos('b1', 'SOL/USDT', 'long', 121.7, 31);
  const c = mkCtx([b], { 'SOL/USDT': 121.75 });
  run(c, 'learnFromOpenPositions()');
  assert.deepStrictEqual(c.closed, [{ id: 'b1', botClose: true, pair: 'SOL/USDT' }]);
  assert.strictEqual(b._ruleExit && b._ruleExit.kind, 'zombie');
  assert.ok(c.S.chainLog.some(l => /Timer anti-zombie · SOL\/USDT · 31min flat/.test(l.desc)));
});

T('Z4 · bot à plat 31 min AVEC règle de gain armée : épargné, comme avant (25/09)', () => {
  const c = mkCtx([botPos('b2', 'SOL/USDT', 'long', 121.7, 31)], { 'SOL/USDT': 121.7 }, { gainRules: { 'SOL/USDT': { k: 1 } } });
  run(c, 'learnFromOpenPositions()');
  assert.deepStrictEqual(c.closed, []);
});

T('Z5 · manuelle à 61 min : 07 ne la ferme pas, TA consigne de durée la ferme (09e, closePosition(id, false)) et le dit', () => {
  const c = mkCtx([manPos('m4', 'XRP/USDT', 'long', 1.5186, 61)], { 'XRP/USDT': 1.5190 });
  run(c, 'learnFromOpenPositions()');
  assert.deepStrictEqual(c.closed, [], '07 seul : ouverte');
  run(c, '_manConsignesWatchdog()');
  assert.deepStrictEqual(c.closed, [{ id: 'm4', botClose: false, pair: 'XRP/USDT' }]);
  assert.ok(c.S.chainLog.some(l => /Garde-fou MAN · XRP\/USDT LONG fermé · Timeout atteint \(61min ≥ 60min\)/.test(l.desc)), JSON.stringify(c.S.chainLog));
});

T('Z6 · manuelle : le trailing reste (armé à 60 % du chemin vers TON TP, fermeture « utilisateur »)', () => {
  const p = manPos('m5', 'ADA/USDT', 'short', 0.2650, 40);   // TP short = 0.2650 × (1 − 0,0077) ≈ 0.26296
  const c = mkCtx([p], { 'ADA/USDT': 0.2650 - 0.8 * (0.2650 - p.tp) });   // 80 % du chemin
  run(c, 'learnFromOpenPositions()');
  assert.deepStrictEqual(c.closed, [], 'au pic : on tient');
  run(c, 'S.pairStates["ADA/USDT"].price = ' + (0.2650 - 0.45 * (0.2650 - p.tp)) + '; learnFromOpenPositions()');   // retombé à 45 % < plancher 50 %
  assert.deepStrictEqual(c.closed, [{ id: 'm5', botClose: false, pair: 'ADA/USDT' }]);
  assert.ok(c.S.chainLog.some(l => /Trailing stop · ADA\/USDT SHORT/.test(l.desc)));
});

T('Z7 · manuelle : TON TP et TON SL ferment toujours (07)', () => {
  const a = manPos('m6', 'LINK/USDT', 'long', 14.2, 5), b = manPos('m7', 'AVAX/USDT', 'short', 11.0, 5);
  const c = mkCtx([a, b], { 'LINK/USDT': a.tp * 1.0001, 'AVAX/USDT': b.sl * 1.0001 });
  run(c, 'learnFromOpenPositions()');
  assert.deepStrictEqual(c.closed.map(x => x.id).sort(), ['m6', 'm7']);
  assert.ok(c.closed.every(x => x.botClose === false));
  assert.ok(c.S.chainLog.some(l => /TP atteint LINK\/USDT LONG/.test(l.desc)) && c.S.chainLog.some(l => /SL déclenché AVAX\/USDT SHORT/.test(l.desc)));
});

T('Z8 · fiche MAN (10h) : ne promet plus « après 30 min à plat », dit que la position tient jusqu\'au timeout', () => {
  assert.ok(!/après 30 min à plat/.test(s10h), 'ancienne promesse retirée');
  assert.ok(s10h.includes("Sinon elle reste ouverte jusqu'à ton timeout"), 'nouvelle ligne présente');
  assert.ok(s10h.includes('par le trailing (armé à 60 % du chemin vers ton TP)'));
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés');
process.exit(fail ? 1 : 0);
