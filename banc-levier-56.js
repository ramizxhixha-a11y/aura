// banc-levier-56.js — [GO LEVIER 56 · 27/10/2026] l'argent emprunté par le levier, dit à l'écran ; le P&L mesuré sur l'argent de Rams (ETAT n° 56).
// Règle de Rams (27/10 18:05, « Mon argent plus l'emprunt ») : avec le levier, les mises du bot se calculent sur son argent + l'emprunt — c'est ce que fait
// déjà la décision (02 _computePortfolio, _tradingCapitalBase, gardien de risque, plafond 5 %, Rescue Bot) : RIEN de ce qu'elle lit ne change.
// Ce qui change, l'écran : (1) le P&L jour / semaine / mois (09d1 _computePnlByPeriod, bases de S.pnlPeriod) comptait un emprunt comme un GAIN — AA du
// 27/10 18:01 (backup Drive) : levier ×10, 6 282,96 $ empruntés, semaine « +5 694 $ », mois « +522 % » ; (2) « Portefeuille Total » compte l'emprunt sans le
// dire (2 % de ce total était à Rams).
// Ce banc fait tourner le VRAI texte des fonctions de l'app en vm. Sur le code d'avant (BANC_ROOT=<copie du commit 6f4cd12>) : L1, L2, L3, L5 et G
// ÉCHOUENT (L1 : « jour +4 142,30 $ » après l'emprunt) ; L4 et D PASSENT — ce sont les gardes (rien ne change sans dette ; la décision n'a pas bougé) :
//   L1 emprunter puis rendre le levier (02 applyAutoLeverageBorrow) : P&L jour / semaine / mois à 0 (avant : + puis − l'emprunt)
//   L2 les intérêts du levier (02 applyLeverageBorrowFees) et une vraie perte restent des pertes, au centime
//   L3 une fermeture sous levier, la position encore dans la liste (02 closePosition l'y laisse pendant les alertes) : aucun faux gain
//   L4 sans dette (EV, RE) : la base du P&L EST le portefeuille d'avant — rien ne change, au centime
//   L5 l'écran : « dont 6 282,96 $ empruntés (levier) », tuiles « Dont emprunté » et « À toi » ; rien sans dette
//   D  la DÉCISION n'a pas bougé : 19 fonctions qu'elle lit identiques au commit 6f4cd12 ; closePosition ne change que par la ligne des alertes P&L
//   G  aucun lecteur du P&L des périodes ni de _pnlBasis hors de l'écran et des alertes (grep de tous les scripts du HTML, du HTML, native-bridge, Guardian)
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
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const near = (a, b, quoi, tol) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-6), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const s02 = rd('js/02-state-init.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s09d1 = rd('js/09d1-paper-real-core.js'), s10c = rd('js/10c-profil-ab-contexte.js'),
      s10e = rd('js/10e-helpers-adaptatifs.js'), html = rd('AURA8_v118.html');
const toggle = (() => { const i = s07.indexOf('window._toggleHeroBk = function(which){'); return i < 0 ? '' : s07.slice(i, s07.indexOf('\n};', i) + 3); })();

// le monde : un S plat (le portefeuille du mode à l'écran, comme les accesseurs de 02) et le vrai texte des fonctions
const FN02 = ['_computePortfolio', '_computePortfolioSans', '_levCashDebt', '_posLevCash', '_feesDueOf', '_pnlBasis', '_tradingCapitalBase', 'applyAutoLeverageBorrow',
  'repayLeverage', '_repayCashDebt', 'applyLeverageBorrowFees', 'computePortfolioTotal', 'fmt$2'];
function monde(S) {
  const el = {};
  const c = { S, Math, JSON, Number, Object, Array, String, isFinite, isNaN, Date, console: { log() {}, warn() {}, error() {} },
    document: { getElementById: id => (el[id] = el[id] || { id, textContent: '', innerHTML: '', style: {} }) },
    rndHash: () => 'h', nowStr: () => '00:00', _decErr() {}, _activeWallet: () => S, _posLatent: () => ({ val: 0, usd: 0, pct: 0 }), _posCloseFees: () => ({ total: 0 }) };
  c.window = c; vm.createContext(c);
  const code = FN02.map(n => fnSrc(s02, n)).filter(Boolean)
    .concat(['_getTodayKey', '_getWeekKey', '_getMonthKey'].map(n => fnSrc(s10e, n)), fnSrc(s10c, '_checkAndRotatePeriods'), fnSrc(s09d1, '_computePnlByPeriod'))
    .concat(['_tile', '_computeNetUsdParts', '_heroDebtParts', '_heroDebtNote'].map(n => fnSrc(s07, n)).filter(Boolean)).join('\n') + '\n' + toggle;
  vm.runInContext(code, c);
  c.__el = el; return c;
}
// un portefeuille AA comme celui du backup du 27/10 18:01 (Drive, aura_guardian_full_20261027-180158.json) AVANT le levier : 414,23 $ à Rams
function aaNu() {
  const S = { cashAccount: 47.39, tradingAccount: 366.84, fiscalReserveAccount: 0, antiNegTaxPart: 0, antiNegReserve: 0, fees: { feeReserveAccount: 0, totalFunding: 0 },
    openPositions: [], leverage: 0, leverageMaxMult: 10, leverageBorrowed: 0, _autoLevBorrowed: 0, leverageReserve: 0, leverageBorrowRate: 0, leverageTotalFees: 0, chainLog: [] };
  S.portfolio = S.cashAccount + S.tradingAccount;
  return S;
}
function periodes(c) { const S = c.S; S.portfolio = c._computePortfolio(); const p = c._computePnlByPeriod(); return p; }
function demarrer(c) {   // les bases de la journée, de la semaine et du mois posées « maintenant », comme la rotation de 10c
  const S = c.S; S.portfolio = c._computePortfolio(); S.pnlPeriod = { history: [] }; c._checkAndRotatePeriods();
}

T('L1 emprunter puis rendre le levier : P&L jour / semaine / mois à 0', () => {
  const c = monde(aaNu()), S = c.S;
  demarrer(c);
  ['today', 'week', 'month'].forEach(k => near(periodes(c)[k].usd, 0, k + ' avant'));
  S.leverage = 10; c.applyAutoLeverageBorrow(10, 0);   // ×10 : 4 142,30 $ empruntés, versés au trading
  near(S.leverageBorrowed, 4142.3, 'emprunt', 1e-6);
  const p = periodes(c);
  ['today', 'week', 'month'].forEach(k => near(p[k].usd, 0, k + ' après l\'emprunt (avant : +' + S.leverageBorrowed.toFixed(2) + ' $)'));
  S.leverage = 0; c.applyAutoLeverageBorrow(0, 10);    // rendu sur le trading
  near(S.leverageBorrowed, 0, 'dette rendue');
  ['today', 'week', 'month'].forEach(k => near(periodes(c)[k].usd, 0, k + ' après le remboursement'));
});

T('L2 les intérêts du levier et une vraie perte restent des pertes, au centime', () => {
  const c = monde(aaNu()), S = c.S;
  demarrer(c);
  S.leverage = 10; c.applyAutoLeverageBorrow(10, 0);
  S.leverageBorrowRate = 0.0005; c.applyLeverageBorrowFees();   // 4 142,30 × 0,05 % = 2,07 $ pris au trading
  near(periodes(c).today.usd, -4142.3 * 0.0005, 'intérêts', 1e-9);
  S.tradingAccount -= 25;                                          // une perte de 25 $
  near(periodes(c).today.usd, -4142.3 * 0.0005 - 25, 'perte', 1e-9);
  // le pourcentage se lit sur l'argent de Rams (414,23 $), pas sur 4 556 $
  near(periodes(c).today.pct, (-4142.3 * 0.0005 - 25) / 414.23 * 100, '% du jour', 1e-9);
});

T('L3 une fermeture sous levier, la position encore dans la liste : aucun faux gain', () => {
  const c = monde(aaNu()), S = c.S;
  S.leverage = 10; c.applyAutoLeverageBorrow(10, 0);
  // une position du bot : mise 300 $ prise à la réserve (argent emprunté), exposition 3 000 $ (2 700 $ d'emprunt « exposition »)
  const pos = { id: 'p1', pair: 'BTC/USDT', stakeUsdt: 300, totalExposure: 3000, levBorrowed: 3000, _levCash: 300 };
  S.leverageBorrowed += 3000; S.openPositions.push(pos);
  demarrer(c);
  near(periodes(c).today.usd, 0, 'ouverte');
  // closePosition, fermée au prix d'entrée, sans frais : la mise revient au trading, l'exposition et la mise empruntée sont rendues, la position est
  // encore dans la liste quand les alertes P&L tournent (02 : checkPnlAlerts avant le filtre de S.openPositions)
  S.tradingAccount += 300; c.repayLeverage(2700); c._repayCashDebt(300);
  S.portfolio = c._computePortfolioSans(pos);
  c._pnlSansPos = null;
  near(c._computePnlByPeriod().today.usd, 2700, 'témoin : sans le marqueur, la part « exposition » de la position qui ferme serait un faux gain');
  c._pnlSansPos = pos;
  near(c._computePnlByPeriod().today.usd, 0, 'pendant la fermeture');
  c._pnlSansPos = null;
  S.openPositions = []; S.portfolio = c._computePortfolio();
  near(c._computePnlByPeriod().today.usd, 0, 'après la fermeture');
  // closePosition nomme bien la position le temps des alertes, et la libère
  const cp = fnSrc(s02, 'closePosition');
  assert.ok(/window\._pnlSansPos = pos; if\(!_behind && typeof checkPnlAlerts === 'function'\) checkPnlAlerts\(\); \} catch\(e\) \{\} finally \{ window\._pnlSansPos = null; \}/.test(cp), 'marqueur absent de closePosition');
});

T('L4 sans dette (EV, RE) : la base du P&L est le portefeuille d\'avant, au centime', () => {
  // EV et RE du backup du 27/10 18:01 : aucune dette, aucune position
  [[6.58, 1055.91], [0, 1145.42]].forEach(([cash, trad]) => {
    const S = aaNu(); S.cashAccount = cash; S.tradingAccount = trad; S.portfolio = cash + trad;
    const c = monde(S);
    if (typeof c._pnlBasis === 'function') assert.strictEqual(c._pnlBasis(), S.portfolio, 'base ≠ portefeuille sans dette');
    S.pnlPeriod = { history: [], todayDate: c._getTodayKey(), todayStartPortfolio: S.portfolio - 4.65, weekStart: c._getWeekKey(), weekStartPortfolio: S.portfolio + 3,
      monthStart: c._getMonthKey(), monthStartPortfolio: S.portfolio + 26.51 };
    const p = c._computePnlByPeriod();
    assert.strictEqual(p.today.usd, S.portfolio - (S.portfolio - 4.65)); assert.strictEqual(p.week.usd, S.portfolio - (S.portfolio + 3)); assert.strictEqual(p.month.usd, S.portfolio - (S.portfolio + 26.51));
  });
  // avec une position ouverte sans levier : la mise compte, comme avant
  const S = aaNu(); S.openPositions = [{ id: 'q', stakeUsdt: 50 }]; S.tradingAccount -= 50; S.portfolio = S.cashAccount + S.tradingAccount + 50;
  const c2 = monde(S); if (typeof c2._pnlBasis === 'function') assert.strictEqual(c2._pnlBasis(), S.portfolio);
  near(c2._computePnlByPeriod().today.usd, 0, 'jour, position sans levier');
});

T('L5 l\'écran : « dont X $ empruntés », tuiles « Dont emprunté » et « À toi » ; rien sans dette', () => {
  assert.ok(/<div id="heroDebtNote"/.test(html), 'heroDebtNote absent du HTML');
  const S = aaNu(); S.leverageBorrowed = 6282.96; S._autoLevBorrowed = 6282.96; S.tradingAccount += 6282.96; S.leverage = 10;   // l'AA du 27/10 18:01
  const c = monde(S);
  assert.ok(typeof c._heroDebtNote === 'function', '_heroDebtNote absente');
  c._heroDebtNote();
  assert.strictEqual(c.__el.heroDebtNote.textContent, 'dont ' + c.fmt$2(6282.96) + ' empruntés (levier)');
  c.__el.heroBkTotal = { innerHTML: '', style: { display: 'none' } }; c.__el.heroBkUsd = { innerHTML: '', style: { display: 'none' } };
  c._toggleHeroBk('total');
  const t = c.__el.heroBkTotal.innerHTML;
  assert.ok(t.includes('Dont emprunté') && t.includes(c.fmt$2(6282.96)), 'tuile « Dont emprunté » absente');
  assert.ok(t.includes('À toi') && t.includes(c.fmt$2(c.computePortfolioTotal() - 6282.96)), 'tuile « À toi » absente ou fausse');
  // EV sans dette : rien
  const E = aaNu(); E.cashAccount = 6.58; E.tradingAccount = 1055.91; const e = monde(E);
  e._heroDebtNote(); assert.strictEqual(e.__el.heroDebtNote.style.display, 'none');
  e.__el.heroBkTotal = { innerHTML: '', style: { display: 'none' } }; e.__el.heroBkUsd = { innerHTML: '', style: { display: 'none' } };
  e._toggleHeroBk('total'); assert.ok(!e.__el.heroBkTotal.innerHTML.includes('Dont emprunté'));
});

T('D la DÉCISION n\'a pas bougé : 19 fonctions identiques au commit 6f4cd12 ; closePosition ne change que par la ligne des alertes P&L', () => {
  const TOUT = ['js/02-state-init.js', 'js/03-per-pair-position-buttons-controls-buid.js', 'js/09j-helpers.js', 'js/09c-auto-open.js', 'js/09e-guards.js',
    'js/10f-resolveur-cycle.js', 'js/10h-pont-fullpower-bricks.js', 'js/08-learning-history-render.js'].map(rd).join('\n');
  const AV = { _computePortfolio: '257f2a1047dbc64b', _computePortfolioSans: 'af9d6d3e24a71b80', _tradingCapitalBase: '8f78e89a034783a4', _levCashDebt: '6c289b7680c5651a',
    _posLevCash: '2a29ce45dce38032', _feesDueOf: '06f247aa7097ee98', estimateStakes: '191de2e4cf018d53', _checkPaperRealStakeLimit: '31c0b71e7147fa7a',
    guardianCheck: '09a759da6045c358', botRescue: 'd41aca153b4299f8', validateInvestmentCapProvisioned: '3229d70744efd7a8', validateTotalExposure: '9ff782139655cb22',
    applyAutoLeverageBorrow: '5bb64a08d6e4a677', borrowLeverage: '615d09462f6b0438', repayLeverage: '9167fa725a2fc01d', _repayCashDebt: 'b39eb2a687ac37bb',
    applyLeverageBorrowFees: 'e364c8a77e5c72ad', syncLeverageReserve: '77805e0810c80b7b', getTechSignals: '0c8a8a273d52421d' };
  Object.entries(AV).forEach(([n, h]) => assert.strictEqual(h16(fnSrc(TOUT, n) || ''), h, n + ' a changé'));
  // computePortfolioTotal : seul son commentaire change (la valeur, lue par l'écran, reste la même)
  const strip = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  assert.strictEqual(h16(strip(fnSrc(s02, 'computePortfolioTotal'))), '57dd0dacad455aed', 'computePortfolioTotal : le code a changé');
  // closePosition : le texte d'avant, où la ligne des alertes P&L est remplacée par la nouvelle (et son commentaire), est le texte d'après
  const cp = fnSrc(s02, 'closePosition');
  const neu = cp.replace(/\n {6}\/\/ \[GO LEVIER 56[^\n]*\n {6}\/\/[^\n]*\n {6}try \{ window\._pnlSansPos = pos; if\(!_behind && typeof checkPnlAlerts === 'function'\) checkPnlAlerts\(\); \} catch\(e\) \{\} finally \{ window\._pnlSansPos = null; \}/,
    "\n      try { if(!_behind && typeof checkPnlAlerts === 'function') checkPnlAlerts(); } catch(e) {}");
  assert.strictEqual(h16(neu), '952c22e233568bea', 'closePosition a changé ailleurs que sur la ligne des alertes P&L');
});

T('G aucun lecteur du P&L des périodes ni de _pnlBasis hors de l\'écran et des alertes', () => {
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f).concat(['AURA8_v118.html', 'aura-guardian.html', 'guardian-core.js', 'guardian-embed.js', 'guardian-config.js']);
  const permis = { _computePnlByPeriod: ['js/09d1-paper-real-core.js', 'js/04-v8-0-livraison-35-mode-max-permissif-v.js', 'js/07-v90-mode-bunker-sos.js'],
    _pnlBasis: ['js/02-state-init.js', 'js/09d1-paper-real-core.js', 'js/10c-profil-ab-contexte.js', 'js/09b2-save-load.js', 'js/09j-helpers.js', 'js/07-v90-mode-bunker-sos.js'],
    _pnlSansPos: ['js/02-state-init.js'] };
  Object.entries(permis).forEach(([n, ok]) => {
    const vus = files.filter(f => fs.existsSync(path.join(ROOT, f)) && rd(f).split('\n').some(l => l.includes(n) && !/^\s*\/\//.test(l)));
    vus.forEach(f => assert.ok(ok.includes(f), n + ' lu par ' + f));
    if (n === '_pnlBasis') assert.ok(vus.length >= 5, '_pnlBasis : ' + vus.length + ' fichier(s)');
  });
});

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} tests passés`);
process.exit(fail ? 1 : 0);
