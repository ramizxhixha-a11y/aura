// banc-portefeuille-juste.js — [PORTEFEUILLE JUSTE · 10/10/2026] VERSION 20261010b
// closePosition (02) rend la mise au trading, règle les frais, partage le gain, et ne retire la position de S.openPositions qu'à la toute fin : entre-temps
// _computePortfolio() comptait la mise DEUX fois (rendue au trading ET encore engagée). Ce portefeuille gonflé d'une mise était écrit dans S.portfolio, poussé
// sur la courbe (pnlHistory), lu par les alertes (sonde du 10/10, vraie app : « 🎯 Objectif session atteint ! +$50.17 » pour un trade à −0,7 %, 4 fermetures sur
// 4 gonflées de la mise) et laissé tel quel dans le portefeuille d'un mode qui n'est pas à l'écran (AA au backup du 10/10 15:38 : 1 113,19 $ écrits pour 1 062,40 $).
// Correction : _computePortfolioSans(pos) — le portefeuille canonique SANS la position qu'on ferme, reconnue par identité — aux deux écritures de closePosition et
// dans recordFees ; 10e (remboursement de la dette orpheline) revient à la formule canonique. Testé sur le CODE RÉEL de closePosition en vm (ses crochets remplacés
// par des témoins) : le portefeuille écrit, le point de la courbe et la valeur lue par les alertes sont le vrai portefeuille, pendant et après la fermeture.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n     ')); } }
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
const s02 = rd('js/02-state-init.js'), s10e = rd('js/10e-helpers-adaptatifs.js'), html = rd('AURA8_v118.html');

// Le monde : les comptes d'un mode, deux positions ouvertes, les crochets de closePosition remplacés par des témoins ; recordFees sans frais ni impôt (le vrai
// est éprouvé par banc-fiscal : 49 scénarios contre une référence indépendante)
function world(o) {
  o = o || {};
  const seen = { alerts: [], badges: [], toasts: [], ms: [], heat: [], learn: [], renders: 0, closeAll: 0 };
  const A = { id: 'pA', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 30, totalExposure: 30, auto: false, openedAt: 1, entryTs: 1 };
  const B = { id: 'pB', pair: 'ETH/USDT', side: 'short', entryPrice: 10, stakeUsdt: 50, totalExposure: 50, auto: true, openedAt: 1, entryTs: 1 };
  const S = { tradingMode: o.mode || 'paperReal', cashAccount: 100, tradingAccount: 820, openPositions: [A, B], pnlHistory: [1000], chainLog: [], totalTrades: 0, winTrades: 0, leverage: 0, leverageBorrowed: 0, _autoLevBorrowed: 0, currentPage: 4, botAutoMode: true,
    pairStates: { 'BTC/USDT': { price: o.btc === undefined ? 110 : o.btc, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }, 'ETH/USDT': { price: 10, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 } },
    paperRealStats: {}, agents: [], profitSplitCaissePct: 0, cashLog: [] };
  const PAIRS = { 'BTC/USDT': { dec: 0 }, 'ETH/USDT': { dec: 0 } };
  const c = { S, PAIRS, Math, Number, Object, Array, String, JSON, Date, isFinite, console, window: {},
    showToast: m => seen.toasts.push(String(m)), rndHash: () => 'h', nowStr: () => 'x',
    repayLeverage: () => {}, syncLeverageReserve: () => {},
    recordFees: () => ({ totalFee: 0, taxAmount: 0, pnlNet: 0 }),
    recordTradeForHeatmap: (usd, pair) => seen.heat.push([usd, pair]), learnFromOutcome: (src, pct, pair) => seen.learn.push([src, pct, pair]),
    emitVictoryParticles: () => seen.ms.push('fx+'), emitLossParticles: () => seen.ms.push('fx-'), showMilestone: (i, t) => seen.ms.push('jalon ' + t),
    checkPnlAlerts: () => seen.alerts.push(S.portfolio), checkBadges: () => seen.badges.push(S.portfolio), _updateCloseAllBadge: () => { seen.closeAll++; },
    updatePairBtnStates: () => { seen.renders++; }, renderPositions: () => { seen.renders++; }, renderChain: () => { seen.renders++; },
    _bgResolve: !!o.behind, _bgFrom: o.behind ? 'sim' : undefined };
  c.window = c; vm.createContext(c);
  // sur un code qui n'a pas encore _computePortfolioSans / _modeBehind (avant le 10/10), on les laisse absents : J1 et J4 tombent, et J2/J3 montrent le vrai défaut
  const opt = n => { try { return fnSrc(s02, n); } catch (e) { return '/* ' + n + ' absent */'; } };
  vm.runInContext([fnSrc(s02, '_computePortfolio'), opt('_computePortfolioSans'), opt('_modeBehind'), fnSrc(s02, '_walletKey'), fnSrc(s02, 'closePosition')].join('\n'), c);
  return { c, S, A, B, seen, run: code => vm.runInContext(code, c) };
}
const truth = S => (S.cashAccount || 0) + (S.tradingAccount || 0) + S.openPositions.reduce((a, p) => a + p.stakeUsdt, 0);

console.log('▶ banc-portefeuille-juste');
T('J1 · _computePortfolioSans RÉEL : le portefeuille canonique sans UNE position, reconnue par identité (pas par son nom) ; sans position à exclure = _computePortfolio ; portefeuille d\'un autre mode (w)', () => {
  const w = world();
  assert.strictEqual(w.run('_computePortfolio()'), 1000); assert.strictEqual(w.run('_computePortfolioSans(S.openPositions[0])'), 970); assert.strictEqual(w.run('_computePortfolioSans(S.openPositions[1])'), 950);
  assert.strictEqual(w.run('_computePortfolioSans({ id: "pA", stakeUsdt: 30 })'), 1000, 'un autre objet du même nom n\'est pas exclu'); assert.strictEqual(w.run('_computePortfolioSans(null)'), 1000);
  assert.strictEqual(w.run('_computePortfolioSans(S.openPositions[0], { cashAccount: 1, tradingAccount: 2, openPositions: [S.openPositions[0], { stakeUsdt: 7 }] })'), 10);
});
T('J2 · closePosition RÉEL, gain de +10 % sur une position de 30 $ (une autre de 50 $ reste ouverte) : le portefeuille écrit, le point de la courbe et la valeur lue par les alertes sont le VRAI portefeuille (1 003 $), jamais gonflé de la mise (1 033 $)', () => {
  const w = world({ btc: 110 });
  assert.strictEqual(truth(w.S), 1000);
  w.run('closePosition("pA")');
  assert.deepStrictEqual(w.S.openPositions.map(p => p.id), ['pB']); assert.strictEqual(w.S.tradingAccount, 853, 'mise rendue + gain');
  assert.strictEqual(truth(w.S), 1003); assert.strictEqual(w.S.portfolio, 1003, 'portefeuille écrit');
  assert.deepStrictEqual(w.S.pnlHistory, [1000, 1003], 'courbe'); assert.deepStrictEqual(w.seen.alerts, [1003], 'alertes : valeur lue'); assert.deepStrictEqual(w.seen.badges, [1003]);
  assert.deepStrictEqual(w.seen.learn, [['position', 10, 'BTC/USDT']]); assert.deepStrictEqual(w.seen.heat, [[3, 'BTC/USDT']]); assert.ok(w.seen.ms.includes('jalon VICTOIRE · BTC/USDT +10.0% · +$3.0')); assert.strictEqual(w.seen.renders, 3, 'boutons + positions + chaîne (page 4)'); assert.strictEqual(w.seen.closeAll, 1);
});
T('J3 · perte de −20 % sur la position de 50 $ (bot) : vrai portefeuille 990 $ écrit et poussé ; la fermeture de la dernière position : 990 $, rien d\'engagé', () => {
  const w = world({ btc: 100 }); w.S.pairStates['ETH/USDT'].price = 12;   // short ETH 10 → 12 : −20 %
  w.run('closePosition("pB", true)');
  assert.strictEqual(truth(w.S), 990); assert.strictEqual(w.S.portfolio, 990); assert.strictEqual(w.S.pnlHistory[1], 990); assert.deepStrictEqual(w.seen.alerts, [990]);
  w.run('closePosition("pA")');
  assert.strictEqual(w.S.openPositions.length, 0); assert.strictEqual(truth(w.S), 990); assert.strictEqual(w.S.portfolio, 990); assert.strictEqual(w.S.pnlHistory[2], 990);
});
T('J4 · [MODES SÉPARÉS] la même fermeture pour un mode DERRIÈRE l\'écran : portefeuille juste, mais ni alertes, ni badges, ni jalon, ni rendu, ni badge ⊗ ; le toast « Fermé » et la ligne du journal restent', () => {
  const w = world({ btc: 110, behind: true });
  w.run('closePosition("pA")');
  assert.strictEqual(w.S.portfolio, 1003); assert.deepStrictEqual(w.S.pnlHistory, [1000, 1003]);
  assert.deepStrictEqual(w.seen.alerts, []); assert.deepStrictEqual(w.seen.badges, []); assert.deepStrictEqual(w.seen.ms, []); assert.strictEqual(w.seen.renders, 0); assert.strictEqual(w.seen.closeAll, 0);
  assert.ok(w.seen.toasts.some(t => t.startsWith('Fermé BTC/USDT'))); assert.ok(w.S.chainLog.some(l => l.desc.startsWith('Fermé BTC/USDT LONG | +10.00%')));
});
T('J5 · textes : les deux écritures de closePosition et celle de recordFees lisent _computePortfolioSans(pos) ; 10e (dette orpheline) lit la formule canonique ; plus aucune écriture « caisse + trading » nue dans le code chargé', () => {
  const cp = codeStrict(fnSrc(s02, 'closePosition')), rf = codeStrict(fnSrc(s02, 'recordFees'));
  assert.strictEqual(cp.split('_computePortfolioSans(pos)').length - 1, 2, 'closePosition : deux écritures'); assert.strictEqual(cp.split('_computePortfolio()').length - 1, 0, 'closePosition : plus d\'écriture avec la position comptée deux fois');
  assert.ok(rf.includes('S.portfolio = pos ? _computePortfolioSans(pos) : _computePortfolio();'), 'recordFees');
  assert.strictEqual((codeStrict(s10e).match(/S\.portfolio\s*=\s*\(typeof _computePortfolio === 'function'\) \? _computePortfolio\(\)/g) || []).length, 2, '10e : deux sites canoniques');
  const files = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(f => f.startsWith('js/'));
  const nus = []; files.forEach(f => { codeStrict(rd(f)).split('\n').forEach(l => { if (/S\.portfolio\s*=\s*\(S\.cashAccount \|\| 0\) \+ \(S\.tradingAccount \|\| 0\);/.test(l)) nus.push(f); }); });
  assert.deepStrictEqual(nus, [], 'écritures nues : ' + nus.join(', '));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
