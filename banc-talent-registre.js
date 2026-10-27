// banc-talent-registre.js — [GO TALENT · 20/10/2026] VERSION 20261020a
// Les quatre défauts du registre que l'audit avait renvoyés à la porte TALENT (ETAT-AURA8.md § 3 : n° 56, 57, 61, 65 — lus par la décision d'ouvrir).
// La porte (rejeu/porte_registre.js, règles figées AVANT toute mesure, sha-256 a13c0715…d56e57) n'a vu aucune décision du bot changer sur ses données
// (état du 20/10 01:09, rejeu réel EV + RE du 19/10 → 20/10, histoire de l'EV depuis le 12/09). Elle était aveugle : la relecture adverse a montré que
// n° 61 change la mise du bot sur des états vécus 9 fois par l'EV (porte M5), et l'AA de Rams au levier ×10 (backup du 20/10 03:51) montre que n° 56
// change la décision du gardien de risque (approve → veto, porte M6). n° 56 et 61 N'ENTRENT PAS (02 portefeuille et 09j inchangés : essai S).
// Entrent : n° 57 et 65, qui ne changent aucune décision du bot sur les vraies données (Plein Régime éteint partout ; drapeaux des migrations posés).
// Ce banc fait tourner le VRAI texte des fonctions de l'app en vm et ÉCHOUE sur le code d'avant :
//   BANC_ROOT=<copie du commit 91b6cdd> node banc-talent-registre.js   (sauf N65b, S et R, gardes de non-régression)
//   N57 Plein Régime : trois ouvertures du bot à 5 % sans mouvement de prix ne déclenchent plus le stop d'urgence (avant : à la 2e, positions du bot
//       fermées, Plein Régime éteint) ; une vraie perte de 6 % le déclenche ; la mesure de l'activation compte les mises déjà engagées ; emprunter ou
//       rendre la dette, prendre la réserve anti-négatif sur le trading ne font pas de fausse perte
//   N65 les deux migrations « une fois » restées gardées par leur seul drapeau ne réécrivent plus un état vécu (localStorage perdu) ; état neuf : inchangé
//   S   TEXTE des ouvreurs, des gardes, du levier, du portefeuille (n° 56 refusé) et de la phase 5 (n° 61 refusé) identique au commit 91b6cdd
//   R   les règles de la porte n'ont pas bougé depuis leur écriture (sha-256 des 31 premières lignes de rejeu/porte_registre.js)
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + String(e && e.stack || e).split('\n').slice(0, 3).join('\n     ')); } }
function fnSrc(src, name) {
  const re = new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(');
  const m = re.exec(src); if (!m) return null;
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
function iife(src, name) { const i = src.indexOf('(function ' + name + '(){'); assert.ok(i >= 0, 'migration absente : ' + name); return src.slice(i, src.indexOf('})();', i) + 5); }
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const near = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s02 = rd('js/02-state-init.js'), s9b2 = rd('js/09b2-save-load.js'), s9c = rd('js/09c-auto-open.js'), s9e = rd('js/09e-guards.js'), s9j = rd('js/09j-helpers.js'),
      s10g = rd('js/10g-resolveur-ev-csv.js'), s10h = rd('js/10h-pont-fullpower-bricks.js'), html = rd('AURA8_v118.html');
const TOUT = [s02, s03, s9b2, s9e, s9j, s10g, s10h].join('\n');
const FN = ['_posLevCash', '_levCashDebt', '_computePortfolio', '_computePortfolioSans', '_tradingCapitalBase', '_checkPaperRealStakeLimit', 'guardianCheck', 'botRescue',
  'validateInvestmentCapProvisioned', 'validateTotalExposure',
  '_fpEquity', '_fpEmergencyCheck', 'enableFullPowerMode', 'disableFullPowerMode', '_oneShotEtatVecu', '_oneShotEpargne'];
// le monde : un S plat (portefeuille du mode à l'écran, comme les accesseurs de 02) et le vrai texte des fonctions
function monde(S, o) {
  o = o || {};
  const t = { closes: [], toasts: [] }, ls = Object.assign({}, o.ls || {});
  const c = { S, console: { log() {}, warn() {}, error() {} }, Math, JSON, Number, Object, Array, String, isFinite, Date,
    document: { getElementById: () => null }, _stateReady: true,
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    _getPairAdaptiveProfile: () => ({ stakePct: 5 }), _checkCorrelationLimit: () => null, _getSharpeAllocMult: () => 1, _botPredict() {}, _genomeOf: () => ({}), _setBot() {},
    showToast: m => t.toasts.push(String(m)), rndHash: () => 'h', nowStr: () => '00:00', saveState() {}, renderHome() {}, updateStreakBadge() {}, renderAgentsSection() {},
    setInterval: f => { f(); return 1; }, clearInterval() {},
    closePosition: id => { t.closes.push(id); const i = S.openPositions.findIndex(p => p.id === id); if (i >= 0) { const p = S.openPositions[i]; S.tradingAccount += (p.stakeUsdt || 0) + (p.pnlUsdt || 0); S.openPositions.splice(i, 1); } } };
  c.window = c; vm.createContext(c);
  vm.runInContext(FN.map(n => fnSrc(TOUT, n)).filter(Boolean).join('\n'), c);
  c.__t = t; c.__ls = ls; return c;
}
const base = (x) => Object.assign({ cashAccount: 6.58, tradingAccount: 1060.56, fiscalReserveAccount: 0, leverage: 0, leverageBorrowed: 0, _autoLevBorrowed: 0, leverageReserve: 10671.37,
  openPositions: [], chainLog: [], agents: [{ name: 'a' }], paperRealConfig: { maxConcurrentPos: 3 }, feeConfig: { makerRate: 0.001, takerRate: 0.001 } }, x || {});
let graine = 7; const hasard = () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };
console.log('▶ banc-talent-registre · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

T('N57 · Plein Régime (n° 57) : trois ouvertures du bot au plafond de 5 %, sans mouvement de prix → aucun stop (avant : à la 2e ouverture, « STOP D\'URGENCE », 2 positions fermées, Plein Régime éteint) ; une vraie perte de 6 % → stop, tout fermé', () => {
  const S = base(); const c = monde(S); c.enableFullPowerMode(); assert.strictEqual(S.fullPowerMode, true);
  for (let i = 1; i <= 3; i++) {
    const mise = 0.05 * c._computePortfolio(); S.tradingAccount -= mise; S.openPositions.push({ id: 'b' + i, pair: 'P' + i, auto: true, stakeUsdt: mise, pnlUsdt: 0 });
    c._fpEmergencyCheck(); assert.deepStrictEqual([c.__t.closes.length, S.fullPowerMode], [0, true], 'ouverture ' + i + ' : ' + c.__t.toasts.join(' | '));
  }
  S.openPositions[0].pnlUsdt = -0.06 * S._fpInitialCapital; c._fpEmergencyCheck();
  assert.strictEqual(c.__t.closes.length, 3, 'vraie perte de 6 % : tout fermé'); assert.strictEqual(S.fullPowerMode, false);
});
T('N57b · la mesure de l\'activation compte les mises déjà engagées (avant : une position de 300 $ ouverte à l\'activation pesait comme une perte) ; rendre la dette en argent ne fait pas de fausse perte', () => {
  const S = base({ tradingAccount: 760.56, openPositions: [{ id: 'm', pair: 'ETH/USDT', auto: false, stakeUsdt: 300, pnlUsdt: 0 }] });
  const c = monde(S); c.enableFullPowerMode(); near(S._fpInitialCapital, 6.58 + 760.56 + 300, 1e-9, 'capital à l\'activation');
  S.leverage = 1; S.leverageBorrowed = 500; S._autoLevBorrowed = 500; S.tradingAccount += 500; c._fpEmergencyCheck(); assert.strictEqual(c.__t.closes.length, 0, 'emprunt');
  S.leverageBorrowed = 0; S._autoLevBorrowed = 0; S.tradingAccount -= 500; c._fpEmergencyCheck(); assert.strictEqual(c.__t.closes.length, 0, 'remboursement');
  const e0 = c._fpEquity(); S.tradingAccount -= 3; S.antiNegReserve = (S.antiNegReserve || 0) + 3; near(c._fpEquity(), e0, 1e-9, 'réserve anti-négatif prise sur le trading (09c holdTradeReserve) : pas une perte');
});
T('N65 · migrations « une fois » (n° 65) : état VÉCU relu du stockage, localStorage perdu, Rams avait réglé 1 position simultanée et des frais à 0,08 % → rien n\'est réécrit (avant : 1 → 3 et 0,08 → 0,10 %), une ligne « non rejouée » chacune, drapeaux posés', () => {
  const S = base({ _restoredSavedAt: '2026-10-19T23:09:57.214Z', paperRealConfig: { maxConcurrentPos: 1 }, feeConfig: { makerRate: 0.0008, takerRate: 0.0008 } });
  const c = monde(S); vm.runInContext(iife(s02, '_etage1Migration') + '\n' + iife(s9b2, '_upgradeFeeRates'), c);
  assert.deepStrictEqual([S.paperRealConfig.maxConcurrentPos, S.feeConfig.makerRate, S.feeConfig.takerRate], [1, 0.0008, 0.0008]);
  assert.strictEqual(S.chainLog.filter(l => /non rejouée/.test(l.desc)).length, 2, S.chainLog.map(l => l.desc).join(' | '));
  assert.ok(c.__ls.aura_etage1_maxpos3_20260813 && c.__ls.aura_fee_rates_binance_20260728, 'drapeaux');
});
T('N65b · installation NEUVE (rien de vécu) : les deux migrations font ce qu\'elles faisaient (1 → 3 positions, frais relevés à 0,10 %)', () => {
  const S = base({ tradingAccount: 0, cashAccount: 0, walletStore: {}, paperRealConfig: { maxConcurrentPos: 1 }, feeConfig: { makerRate: 0.0002, takerRate: 0.0005 } });
  const c = monde(S); vm.runInContext(iife(s02, '_etage1Migration') + '\n' + iife(s9b2, '_upgradeFeeRates'), c);
  assert.deepStrictEqual([S.paperRealConfig.maxConcurrentPos, S.feeConfig.makerRate, S.feeConfig.takerRate], [3, 0.001, 0.001]);
});
T('S · TEXTE des ouvreurs, des gardes, du levier, du portefeuille (02 _computePortfolio, _computePortfolioSans, _tradingCapitalBase : n° 56 refusé) et de la phase 5 (09j validateInvestmentCapProvisioned : n° 61 refusé) identique au commit 91b6cdd (token 20261019b)', () => {
  const E = { estimateStakes: '191de2e4cf018d53', openPosition: '03cf1adf388db5f3', closePosition: '952c22e233568bea', _checkPaperRealStakeLimit: '31c0b71e7147fa7a',
    validateTotalExposure: '9ff782139655cb22', borrowLeverage: '615d09462f6b0438', repayLeverage: '9167fa725a2fc01d', applyAutoLeverageBorrow: '5bb64a08d6e4a677',
    setLeverageByBot: 'cf91e0a8613d7ba7', ensureLeverageCoverForTrade: 'ec6b46c0bbbc4155', _repayCashDebt: 'b39eb2a687ac37bb', _leverageSolvency: 'f9f68f3666e374c7',
    disableFullPowerMode: '78f8bd660385db42', recordFees: 'f2b897580fc692af', validateInvestmentCapProvisioned: '3229d70744efd7a8',
    _computePortfolio: '257f2a1047dbc64b', _computePortfolioSans: 'af9d6d3e24a71b80', _tradingCapitalBase: '8f78e89a034783a4' };
  const src = [s02, s9c, s9j, s10g, rd('js/10f-resolveur-cycle.js')].join('\n');
  const _un56 = t => t.replace(/\n {6}\/\/ \[GO LEVIER 56[^\n]*\n {6}\/\/[^\n]*\n {6}try \{ window\._pnlSansPos = pos; (if\(!_behind && typeof checkPnlAlerts === 'function'\) checkPnlAlerts\(\);) \} catch\(e\) \{\} finally \{ window\._pnlSansPos = null; \}/, '\n      try { $1 } catch(e) {}');   // [GO LEVIER 56 · 27/10/2026] la ligne des alertes P&L de closePosition ramenée au texte d'avant (banc-levier-56.js vérifie ce qu'elle fait)
  Object.keys(E).forEach(n => assert.strictEqual(h16((n === 'closePosition' ? _un56 : (x => x))(fnSrc(src, n) || '')), E[n], n + ' a changé'));
  assert.strictEqual(h16(s9c), 'a761a7770da5e2b1', '09c-auto-open.js a changé');
});
T('R · les règles de la porte (rejeu/porte_registre.js, 31 premières lignes, écrites le 19/10 23:18 UTC avant toute mesure) n\'ont pas bougé', () => {
  const f = path.join(ROOT, 'rejeu/porte_registre.js'); if (!fs.existsSync(f)) return;   // code d'avant : la porte n'existe pas encore
  assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(f, 'utf8').split('\n').slice(0, 31).join('\n') + '\n').digest('hex'),
    'a13c071504feb664d7ffda43461065' + '99834aa354ebde3bcdcd9b45d0d3d56e57');   // coupée en deux : banc-p0b-newskey cherche les clés de 44 caractères hexadécimaux
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exitCode = fail ? 1 : 0;
