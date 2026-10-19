// banc-levier.js — [GO LEVIER · 18/10/2026] VERSION 20261018c
// Les trois défauts du levier du registre (ETAT-AURA8.md, audit du 13/10), à fermer AVANT toute utilisation du levier, et ce que la relecture adverse
// du 18/10 a trouvé sur le même chemin. Chaque essai fait tourner le VRAI texte des fonctions de l'app en vm (02, 05, 07, 08, 09c, 09j, 10f, 16)
// et ÉCHOUE sur le code d'avant (BANC_ROOT=<copie du commit a82841b> node banc-levier.js) — sauf L5 et M6, gardes de non-régression.
//   L  n° 25  l'emprunt versé en ARGENT (« juste à temps » au trading, mise du bot prise à la réserve, index du levier) est rendu au prêteur SUR le trading :
//             à la fermeture, à la restitution du transfert vers la caisse (vérifiée et confirmée AVANT), à la clôture de solvabilité ; ce que le trading ne
//             couvre pas reste dû (jamais effacé, jamais pris sur la caisse — arbitrage laissé à Rams) ; la clôture de solvabilité ne tourne plus à vide.
//             Une mise plus grande que le trading n'est plus ouverte (02 et 09c). Fonds propres éprouvés sur 360 suites tirées au hasard (caisse comprise).
//   M  n° 26  la fiche ✏️ : la mise ajoutée est retirée du trading et achète au prix du moment ; réduire, toucher au prix d'entrée : refusés et dits ;
//             champs pré-remplis à la valeur exacte ; « Convertir » ferme vraiment puis rouvre.
//   N  n° 29  une seule mesure d'une position ouverte (02 _posLatent / _posCloseFees / _posMark) = ce que closePosition et recordFees réalisent, au bit près,
//             pour tous les écrivains du P&L latent et les estimations ; solvabilité, « net en poche », Bunker, mode vacances sur les fonds propres (dette
//             en argent retranchée) ; sans levier, mêmes nombres (le P&L latent au bit près).
//   S  la décision d'ouvrir n'est pas touchée (texte des ouvreurs et des gardes du levier identique, hors les lignes d'argent de GO LEVIER).
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
async function T(name, fn) { try { await fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join('\n     ')); } }
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
const has = (src, name) => new RegExp('(^|\\n)(async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(').test(src);
const between = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 50)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'fin : ' + b.slice(0, 50)); return s.slice(i, j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const near = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'), s06 = rd('js/06-v63-patterns-chartistes.js'),
      s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'), s9c = rd('js/09c-auto-open.js'), s9f1 = rd('js/09f1-bricks-action.js'),
      s9g = rd('js/09g-modals.js'), s9j = rd('js/09j-helpers.js'), s10f = rd('js/10f-resolveur-cycle.js'), s16 = rd('js/16-fiscal.js'), html = rd('AURA8_v118.html');

// empreintes (sha-256, 16 car.) du texte au commit a82841b (token 20261018b), juste avant GO LEVIER
const EMPREINTES_AVANT = { estimateStakes: '191de2e4cf018d53', borrowLeverage: 'f4ddc794f667473e', ensureLeverageCoverForTrade: 'a6f142883b38357d', applyAutoLeverageBorrow: '1ede99649e526761',
  setLeverageByBot: 'cf91e0a8613d7ba7', validateAntiNegative: '2aa7c47155f4d4e3', estimateTradeReserve: '401d7c60b6941022' };
const EMPREINTE_09C_AVANT = '246bff0cee30b335', EMPREINTE_OPEN_AVANT = '0edd3f867c63426c';

// [GO NETTOYAGE · 19/10/2026] (ETAT n° 58) les seules retouches voulues du levier, rendues au texte d'avant pour les empreintes : capacité « juste à temps »
// = base × index (02 ensureLeverageCoverForTrade), baisser l'index n'emprunte plus (02 applyAutoLeverageBorrow), S.portfolio écrit après l'ajout de la
// position (02 openPosition). Morceaux EXACTS (avant / après, au caractère près, calculés contre le commit 6ee5844) : tout autre écart reste un échec
// (relecture du 19/10 : une première version à motifs larges laissait passer du code inséré dans ces zones).
const NE58 = [
  ["ensureLeverageCoverForTrade", "  const base = _tradingCapitalBase();\n  // [GO NETTOYAGE · 19/10/2026] (ETAT n° 58, règle Rams du 15/08 : « ×N = emprunt de N× le capital propre ») la capacité est base × index — le ×10 caché\n  // que le 15/08 avait retiré de l'index (applyAutoLeverageBorrow) et le 18/08 de la réserve (syncLeverageReserve) restait ICI : à ×1, une mise pouvait\n  // emprunter 10× le capital (AA, 18/10 : mises de 30 000 $ sur ~1 000 $ à soi). L'emprunt de l'index (déjà au trading) est compté dans la dette retranchée.\n  // Le bot n'arrive pas ici dans les faits (09c borne sa mise au trading avant d'appeler — code relu) : c'est l'ouverture MANUELLE (02 openPosition).\n  const maxBorrow = base * Math.min(index, S.leverageMaxMult || 10) - (S.leverageBorrowed || 0);", "  const base = _tradingCapitalBase();\n  const maxBorrow = base * (S.leverageMaxMult || 10) * index - (S.leverageBorrowed || 0);"],
  ["applyAutoLeverageBorrow", "  const targetBorrow = base * Math.min(newIndex, mult);   // [fix levier 15/08] N× le capital, plus ×10 caché\n  let delta = targetBorrow - (S._autoLevBorrowed || 0);\n  // [GO NETTOYAGE · 19/10/2026] (ETAT n° 58) BAISSER l'index n'emprunte jamais : la dette suivie a pu baisser (remboursements) ou la base monter depuis\n  // l'activation, et « ×3 → ×2 » versait alors de l'argent emprunté au trading. Avant : delta > 0 → emprunt, quel que soit le sens.\n  if (newIndex < prevIndex && delta > 0) delta = 0;", "  const targetBorrow = base * Math.min(newIndex, mult);   // [fix levier 15/08] N× le capital, plus ×10 caché\n  const delta = targetBorrow - (S._autoLevBorrowed || 0);"],
  ["openPosition", "  // Déduire la mise propre du compte trading\n  // [GO NETTOYAGE · 19/10/2026] (ETAT n° 58) S.portfolio n'est plus écrit ICI, entre le débit de la mise et l'ajout de la position (la mise n'était comptée\n  // nulle part : portefeuille trop bas d'une mise jusqu'au calcul suivant) — il l'est juste après l'ajout, plus bas.", "  // Déduire la mise propre du compte trading"],
  ["openPosition", "  S.tradingAccount = Math.max(0, S.tradingAccount - stakeUsdt);", "  S.tradingAccount = Math.max(0, S.tradingAccount - stakeUsdt);\n  S.portfolio      = _computePortfolio();   // [23/08] canonique"],
  ["openPosition", "  });\n  S.portfolio = _computePortfolio();   // [23/08] canonique · [GO NETTOYAGE · 19/10/2026] (n° 58) après l'ajout de la position : sa mise y est comptée", "  });"],
];
function sansNettoyage(t, name) {
  if (!/GO NETTOYAGE · 19\/10\/2026/.test(t)) return t;
  NE58.filter(x => x[0] === name).forEach(([, nw, od]) => { assert.strictEqual(t.split(nw).length, 2, 'GO NETTOYAGE : morceau attendu absent de ' + name); t = t.split(nw).join(od); });   // split / join : « $$ » du texte n'est pas un motif
  assert.ok(!/GO NETTOYAGE · 19\/10\/2026/.test(t), 'GO NETTOYAGE : retouche non répertoriée dans ' + name);
  return t;
}

// ─── Le monde : comptes d'un mode à plat (EV), VRAIES fonctions d'argent et de levier ───
// Ce qui juge (agents, bots, fiscal 16) est remplacé par des témoins : ce banc regarde l'ARGENT. Taux réels de l'app (pont, 18/10 : maker = taker = 0,10 %).
// Le contrôle de capital de l'ouverture manuelle est le VRAI (09j) — o.capOk le remplace par « toujours ok » pour éprouver le refus de 02 seul.
// L'horloge avance d'une milliseconde à chaque lecture : l'identifiant d'une position est 'p' + Date.now() (registre G4 n° 26).
const FEE = { takerRate: 0.001, makerRate: 0.001, slippage: 0.0003, fundingRate: 0 };
let TICK = Date.UTC(2026, 9, 18, 9, 0, 0);
class HORLOGE extends Date { constructor(...a) { super(...(a.length ? a : [TICK])); } static now() { return ++TICK; } }
const F02 = ['_computePortfolio', '_computePortfolioSans', '_tradingCapitalBase', 'syncLeverageReserve', 'applyAutoLeverageBorrow', 'ensureLeverageCoverForTrade', 'borrowLeverage',
  'repayLeverage', 'restoreLeverageAtCashout', 'applyLeverageBorrowFees', 'recordFees', 'releaseTradeReserve', '_manOpenWarnings', '_manConsigneOf', 'openPosition', 'closePosition',
  '_addToPosition', 'changeLeverage', 'confirmTransfer', '_leverageSolvency', '_forceCloseAllForSolvency', 'renderPositions', 'renderClosePositionsList', 'fmt$', 'fmt$2', 'fmtDT'];
const F02NEW = ['_posLatent', '_posCloseFees', '_posMark', '_posLevCash', '_repayCashDebt', '_levFreeDebt', '_levCashDebt', '_levNormAuto', '_feesDueOf'];   // GO LEVIER · [GO NETTOYAGE · 19/10/2026] + _feesDueOf (n° 54)
function world(o) {
  o = o || {};
  const seen = { toasts: [], confirms: [], learn: 0 };
  const els = {};
  const el = id => els[id] || (els[id] = { value: '', textContent: '', innerHTML: '', readOnly: false, style: {}, classList: { add() {}, remove() {} }, querySelector: () => null });
  const S = { tradingMode: 'paperReal', cashAccount: o.cash != null ? o.cash : 0, tradingAccount: o.trading != null ? o.trading : 100, openPositions: [], pnlHistory: [100], chainLog: [], cashLog: [],
    totalTrades: 0, winTrades: 0, leverage: o.leverage || 0, leverageReserve: 0, leverageBorrowed: 0, leverageMaxMult: 10, leverageBorrowRate: 0, _autoLevBorrowed: 0, _autoLevBase: 0,
    antiNegReserve: 0, antiNegReserveLog: [], fiscalReserveAccount: 0, fiscalReserveLog: [], profitSplitCaissePct: o.split != null ? o.split : 0, feeConfig: Object.assign({}, FEE),
    taxConfig: { region: 'XX', regions: { XX: { inclusion: 1, rate: 0 } } }, paperRealStats: {}, agents: [], botFleet: {}, botAutoMode: o.auto === true, currentPage: 1,
    fees: { totalTradingFees: 0, totalFunding: 0, totalSlippage: 0, totalGross: 0, totalTaxProvision: 0, totalPnlGross: 0, totalPnlNet: 0, tradeCount: 0, feeReserveAccount: 0, feeLog: [], byPair: {} },
    pairStates: {}, _manConsignes: {} };
  ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOT/USDT'].forEach(p => { S.pairStates[p] = { price: 100, stake: 30, pairLeverage: 1, trades: [], totalPnlPct: 0, totalPnlUsd: 0, totalTrades: 0, winTrades: 0 }; });
  const c = { S, PAIRS: { 'BTC/USDT': { dec: 0 }, 'ETH/USDT': { dec: 2 }, 'SOL/USDT': { dec: 2 }, 'DOT/USDT': { dec: 2 } }, Math, Number, Object, Array, String, JSON, Date: HORLOGE, isFinite, isNaN, parseFloat, Error,
    console: { log() {}, warn() {}, error() {} }, showToast: (m, d, lvl) => seen.toasts.push([String(m), lvl || 'info']), rndHash: () => 'h', nowStr: () => '11:00:00',
    confirm: (q) => { seen.confirms.push(String(q)); return o.confirm !== false; },
    document: { getElementById: el }, els,
    recordTradeForHeatmap() {}, learnFromOutcome: () => { seen.learn++; }, emitVictoryParticles() {}, emitLossParticles() {}, showMilestone() {}, checkPnlAlerts() {}, checkBadges() {},
    _updateCloseAllBadge() {}, updatePairBtnStates() {}, renderChain() {}, renderHome() {}, renderAll() {}, saveState() {}, _renderWalletCards() {}, closeTransfer() {}, renderActionsGrid() {}, renderOpenPosSummary() {},
    saveFeeRecord() {}, addAnnualNetRealised() {}, _fiscOnClose: () => ({ movedUsd: 0, regime: 'spec', gainEur: 0 }), renderSortiePartiSection() {}, renderPyramideSection() {},
    detectMarketRegime: () => 'calm', _calcBotTpSl: () => null, lmsrP: () => 0.5, notifTradeOpen() {}, notifTradeClose() {}, tgOnTrade() {}, disableFullPowerMode() { S.fullPowerMode = false; },
    _modeBehind: () => false, _schoolBehind: () => false, _walletKey: m => m || 'paperReal', updateStreakBadge() {}, renderAgentsSection() {},
    _p5PreActionSave() {}, _autoSnapshotBeforeLeverage() {} };
  c.window = c; vm.createContext(c);
  const src = F02.map(n => fnSrc(s02, n)).concat(F02NEW.filter(n => has(s02, n)).map(n => fnSrc(s02, n)));
  src.push('var _leverageMarginCheck = ' + between(s02, 'window._leverageMarginCheck = function _leverageMarginCheck() {', '\n};\n').replace('window._leverageMarginCheck = ', '') + '\n};');
  src.push(o.capOk ? 'function validateTotalExposure() { return { ok: true, available: 1e9 }; }' : fnSrc(s9j, 'validateTotalExposure'), fnSrc(s9j, 'validateInvestmentCapProvisioned'));
  src.push('var _editModal = null;', fnSrc(s08, 'applyPosEdit'), fnSrc(s08, 'openPosEdit'), fnSrc(s08, 'flipPosition'), 'function closePosEditModal() { _editModal = null; }');
  src.push(fnSrc(s07, 'manuInvert'), fnSrc(s07, '_bkCapital'), fnSrc(s07, '_computeNetUsdParts'));
  src.push(has(s05, '_spRemainingFactor') ? fnSrc(s05, '_spRemainingFactor') : '', (s05.match(/const _SP_PALIERS_DEF = \[[\s\S]*?\];/) || [''])[0], fnSrc(s05, 'closePartial'));   // [GO NETTOYAGE · 19/10/2026] (n° 55) _spRemainingFactor retirée de 05 : lue seulement sur le code d'avant
  vm.runInContext(src.join('\n') + '\nvar S = this.S;', c);
  return { c, S, seen, els, run: code => vm.runInContext(code, c) };
}
const pos = o => Object.assign({ id: 'pA', pair: 'BTC/USDT', side: 'long', entryPrice: 100, stakeUsdt: 30, totalExposure: 30, levBorrowed: 0, auto: false, openedAt: 1, entryTs: 1 }, o);
// une position posée à la main, comptes tenus comme l'ouvreur les tient (mise retirée du trading, dette au compteur ; argent versé : au trading d'abord)
function poser(W, p, o) {
  o = o || {};
  if (o.cash > 0) { W.S.tradingAccount += o.cash; W.S.leverageBorrowed += o.cash; W.S._autoLevBorrowed += o.cash; }       // JIT / index : argent versé au trading
  if (o.fromReserve > 0) { W.S.leverageBorrowed += o.fromReserve; W.S._autoLevBorrowed += o.fromReserve; }                 // 09c : la mise vient de la réserve
  const bonus = Math.max(0, (p.totalExposure || p.stakeUsdt) - p.stakeUsdt);
  if (bonus > 0) W.S.leverageBorrowed += bonus;                                                                            // part « exposition » (borrowLeverage)
  if (!(o.fromReserve > 0)) W.S.tradingAccount -= p.stakeUsdt;
  W.S.openPositions.push(p); return p;
}
// fonds propres : caisse + trading + mises engagées + réserve anti-négatif − la dette versée en ARGENT (la part « exposition » est rendue par la position)
function dettes(S) {
  const expo = S.openPositions.reduce((a, p) => { const tot = Number(p.levBorrowed) || 0, cash = (p._levCash != null) ? Math.min(tot, Number(p._levCash)) : Math.max(0, tot - Math.max(0, (Number(p.totalExposure) || 0) - (Number(p.stakeUsdt) || 0))); return a + Math.max(0, tot - cash); }, 0);
  return S.leverageBorrowed - expo;
}
function fonds(S) {   // peut être négatif : une dette que le trading ne couvre pas reste due
  const stakes = S.openPositions.reduce((a, p) => a + (Number(p.stakeUsdt) || 0), 0), d = dettes(S);
  assert.ok(d >= -1e-9, 'dette en argent négative : ' + d);
  return S.cashAccount + S.tradingAccount + stakes + (S.antiNegReserve || 0) - d;
}
const lastTrade = (W, pair) => { const t = W.S.pairStates[pair || 'BTC/USDT'].trades; return t[t.length - 1]; };
const indexX = (W, n) => { for (let i = 0; i < n; i++) W.run('changeLeverage(1)'); };
const transfert = (W, montant) => { W.run("transferDir = 'trade2cash';"); W.els.transferInput = { value: String(montant) }; W.run('confirmTransfer()'); };

(async () => {
console.log('▶ banc-levier · token ' + ((html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1]) + (process.env.BANC_ROOT ? ' · BANC_ROOT=' + ROOT : ''));

console.log('▶ L. n° 25 — l\'emprunt versé en argent est rendu au prêteur, sur le trading');
await T('L1 · VRAIS changeLeverage ×3 (300 $ d\'index au trading) puis openPosition d\'une mise = trading + 30 $ : 30 $ « juste à temps » (_levCash 30) ; fermée au prix d\'entrée → fonds propres = avant − frais, l\'index reste dû (avant : +30 $ venus de nulle part)', () => {
  const W = world({ trading: 100 }); const f00 = fonds(W.S); indexX(W, 3);
  near(W.S.tradingAccount, 400, 1e-9, 'index'); near(fonds(W.S), f00, 1e-9, 'index neutre');
  W.S.tradingAccount += 40; /* [GO NETTOYAGE · 19/10/2026] (n° 58) capacité « juste à temps » = base × index − dette (règle du 15/08) : après l'index ×3, 40 $ GAGNÉS (argent à soi) ouvrent 120 $ de marge — avant : 10 × base × index */ const f0 = fonds(W.S);
  W.S.pairStates['ETH/USDT'].stake = 470; W.run("openPosition('ETH/USDT', 'long')"); const p = W.S.openPositions[0];
  assert.ok(p, 'position ouverte : ' + JSON.stringify(W.seen.toasts.slice(-1))); near(p.levBorrowed, 30, 1e-9); assert.strictEqual(p._levCash, 30, '_levCash posé'); near(fonds(W.S), f0, 1e-9, 'ouverture neutre');
  W.run("closePosition('" + p.id + "')"); const fee = W.S.fees.feeLog[0].totalFee;
  near(fonds(W.S), f0 - fee, 1e-9, 'fonds propres'); near(W.S.leverageBorrowed, 300, 1e-9, 'index dû'); near(W.S._autoLevBorrowed, 300, 1e-9, 'suivi = index');
  assert.ok(W.S.chainLog.some(l => /\$30,00 empruntés pour la mise rendus au prêteur/.test(l.desc)), 'dit au journal');
});
await T('L2 · même ouverture, perte −80 % : l\'emprunt « juste à temps » rendu sur ce qui reste au trading ; fonds propres = avant + résultat − frais ; rien d\'effacé (le trading couvre)', () => {
  const W = world({ trading: 100 }); indexX(W, 3); W.S.tradingAccount += 40; /* [GO NETTOYAGE · 19/10/2026] (n° 58) capacité « juste à temps » = base × index − dette (règle du 15/08) : après l'index ×3, 40 $ GAGNÉS (argent à soi) ouvrent 120 $ de marge — avant : 10 × base × index */ const f0 = fonds(W.S); W.S.pairStates['ETH/USDT'].stake = 470; W.run("openPosition('ETH/USDT', 'long')"); const p = W.S.openPositions[0];
  W.S.pairStates['ETH/USDT'].price = 20; W.run("closePosition('" + p.id + "')"); const fee = W.S.fees.feeLog[0].totalFee, r = lastTrade(W, 'ETH/USDT').pnlUsdt;
  near(r, -376, 1e-9, 'résultat'); near(fonds(W.S), f0 + r - fee, 1e-9, 'fonds propres'); near(W.S.leverageBorrowed, 300, 1e-9);
});
await T('L3 · le trading ne couvre plus (mise du bot prise à la réserve, compte vide, −90 %) : il rend tout ce qu\'il a, le reste RESTE DÛ (compteurs, journal ; jamais effacé, jamais pris sur la caisse) ; fonds propres = avant + résultat − frais ; puis une dette sans position : 50 contrôles de solvabilité ne font RIEN (avant : une « clôture » vide, toast et sauvegarde, à chaque prix)', () => {
  const W = world({ trading: 0, cash: 500, leverage: 1 }); poser(W, pos({ stakeUsdt: 25, totalExposure: 25, levBorrowed: 25, _levCash: 25, auto: true }), { fromReserve: 25 }); const f0 = fonds(W.S);
  W.S.pairStates['BTC/USDT'].price = 10; W.run("closePosition('pA')"); const fee = W.S.fees.feeLog[0].totalFee, r = lastTrade(W).pnlUsdt;
  near(W.S.tradingAccount, 0, 1e-12); near(W.S.leverageBorrowed, 25 - (25 + r - fee), 1e-9, 'reste dû'); near(W.S.cashAccount, 500, 0, 'caisse intacte'); near(fonds(W.S), f0 + r - fee, 1e-9, 'fonds propres');
  assert.ok(W.S.chainLog.some(l => /rendus au prêteur \(pris au trading\) · reste dû/.test(l.desc)), 'dit au journal');
  const n0 = W.S.chainLog.length, t0 = W.seen.toasts.length; for (let i = 0; i < 50; i++) W.run('_leverageMarginCheck()');
  assert.strictEqual(W.S.chainLog.length, n0, 'aucune ligne'); assert.strictEqual(W.seen.toasts.length, t0, 'aucun toast'); assert.ok(W.S.leverageBorrowed > 0);
});
await T('L4 · position du bot dont la mise vient de la réserve (09c, compte presque vide : mise 25 $, _levCash 25) fermée à +2 % : 5 $ + 0,50 $ − frais au trading, dette 0 (avant : 30,50 $ − frais)', () => {
  const W = world({ trading: 5, leverage: 1 }); poser(W, pos({ stakeUsdt: 25, totalExposure: 25, levBorrowed: 25, _levCash: 25, auto: true }), { fromReserve: 25 });
  W.S.pairStates['BTC/USDT'].price = 102; W.run("closePosition('pA')"); const fee = W.S.fees.feeLog[0].totalFee;
  near(W.S.tradingAccount, 5 + 0.5 - fee, 1e-9, 'trading'); near(W.S.leverageBorrowed, 0, 1e-12, 'dette');
});
await T('L5 · part « exposition » seule (levier ×3 : mise 30, exposition 90, 60 $ jamais versés au trading) : comme avant — la position rend son exposition, le compte reçoit mise + résultat', () => {
  const W = world({ trading: 100, leverage: 1 }); poser(W, pos({ totalExposure: 90, levBorrowed: 60 }));
  W.S.pairStates['BTC/USDT'].price = 102; const t0 = W.S.tradingAccount; W.run("closePosition('pA')"); const fee = W.S.fees.feeLog[0].totalFee;
  near(W.S.tradingAccount - t0, 30 + 1.8 - fee, 1e-9, 'trading'); near(W.S.leverageBorrowed, 0, 1e-12, 'dette');
});
await T('L6 · position ouverte AVANT le 18/10 (pas de _levCash) avec 30 $ de JIT : la part en argent est retrouvée (emprunt − ce que l\'exposition ajoute à la mise) et rendue', () => {
  const W = world({ trading: 20, leverage: 1 }); poser(W, pos({ stakeUsdt: 50, totalExposure: 50, levBorrowed: 30 }), { cash: 30 });
  W.run("closePosition('pA')"); const fee = W.S.fees.feeLog[0].totalFee; near(W.S.tradingAccount, 20 - fee, 1e-9, 'trading'); near(W.S.leverageBorrowed, 0, 1e-12, 'dette');
});
await T('L7 · VRAIS changeLeverage ×1 puis confirmTransfer de 50 $ vers la caisse : la question dit ce qui change (100 $ rendus, levier ×0) ; acceptée → 50 $ trading, 50 $ caisse, dette 0 (avant : 150 + 50, +100 $) ; refusée → RIEN n\'a changé', () => {
  const W = world({ trading: 100 }); indexX(W, 1); transfert(W, 50);
  assert.ok(W.seen.confirms.length === 1 && /rend d'abord au prêteur \$100,00/.test(W.seen.confirms[0]) && /×0 \(il est à ×1\)/.test(W.seen.confirms[0]), JSON.stringify(W.seen.confirms));
  near(W.S.cashAccount, 50, 1e-9, 'caisse'); near(W.S.tradingAccount, 50, 1e-9, 'trading'); near(W.S.leverageBorrowed, 0, 1e-12, 'dette'); assert.strictEqual(W.S.leverage, 0, 'index ×0');
  assert.ok(W.seen.toasts.some(([m]) => /Levier rendu au prêteur/.test(m) && /index ×0/.test(m)), 'le toast le dit');
  const V = world({ trading: 100, confirm: false }); indexX(V, 1); const av = JSON.stringify([V.S.cashAccount, V.S.tradingAccount, V.S.leverageBorrowed, V.S.leverage]); transfert(V, 50);
  assert.strictEqual(JSON.stringify([V.S.cashAccount, V.S.tradingAccount, V.S.leverageBorrowed, V.S.leverage]), av, 'refusée : rien ne change');
});
await T('L8 · transfert impossible après remboursement (150 $ demandés, 200 $ au trading dont 100 $ dus) : refusé AVANT de toucher à rien, sans question (avant : levier remboursé et remis à ×0, puis transfert refusé)', () => {
  const W = world({ trading: 100 }); indexX(W, 1); const av = JSON.stringify([W.S.cashAccount, W.S.tradingAccount, W.S.leverageBorrowed, W.S.leverage]); transfert(W, 150);
  assert.strictEqual(JSON.stringify([W.S.cashAccount, W.S.tradingAccount, W.S.leverageBorrowed, W.S.leverage]), av, 'rien ne change'); assert.strictEqual(W.seen.confirms.length, 0);
  assert.ok(W.seen.toasts.some(([m]) => /Transfert non fait/.test(m) && /resterait \$100,00/.test(m)), JSON.stringify(W.seen.toasts));
});
await T('L9 · transfert vers la caisse SANS levier : aucune question, le toast ne parle plus de levier (avant : « Levier restitué, index reset ×1 » à chaque transfert)', () => {
  const W = world({ trading: 100 }); transfert(W, 10);
  near(W.S.cashAccount, 10, 1e-9); assert.strictEqual(W.seen.confirms.length, 0); assert.ok(W.seen.toasts.length && W.seen.toasts.every(([m]) => !/[Ll]evier/.test(m)), JSON.stringify(W.seen.toasts));
});
await T('L10 · VRAIE clôture de solvabilité (index ×3 + position « juste à temps » à −90 %) : fermée par closePosition, la dette rendue sur le trading, le reste dû et dit ; fonds propres = avant + résultat − frais ; ensuite plus rien ne se déclenche', () => {
  const W = world({ trading: 100 }); indexX(W, 3); W.S.tradingAccount += 40; /* [GO NETTOYAGE · 19/10/2026] (n° 58) capacité « juste à temps » = base × index − dette (règle du 15/08) : après l'index ×3, 40 $ GAGNÉS (argent à soi) ouvrent 120 $ de marge — avant : 10 × base × index */ const f0 = fonds(W.S); W.S.pairStates['ETH/USDT'].stake = 470; W.run("openPosition('ETH/USDT', 'long')");
  assert.strictEqual(W.S.openPositions.length, 1, JSON.stringify(W.seen.toasts.slice(-1)));
  W.S.pairStates['ETH/USDT'].price = 10; W.run("_forceCloseAllForSolvency('banc')"); const fee = W.S.fees.feeLog[0].totalFee, r = lastTrade(W, 'ETH/USDT').pnlUsdt;
  assert.strictEqual(W.S.openPositions.length, 0); near(fonds(W.S), f0 + r - fee, 1e-9, 'fonds propres'); near(W.S.tradingAccount, 0, 1e-12); assert.ok(W.S.leverageBorrowed > 0); assert.strictEqual(W.S.leverage, 0);
  assert.ok(W.S.chainLog.some(l => /Clôture de solvabilité · banc — 1 position\(s\) soldée\(s\)/.test(l.desc) && /reste dû/.test(l.desc)), W.S.chainLog.slice(-3).map(l => l.desc).join(' | '));
  const n0 = W.S.chainLog.length; for (let i = 0; i < 20; i++) W.run('_leverageMarginCheck()'); assert.strictEqual(W.S.chainLog.length, n0);
});
await T('L11 · P2 (index à ×0, dette orpheline) ne paie que la dette LIBRE : une autre position à levier encore ouverte garde la sienne (avant : payée sur le trading puis rendue encore par la position)', () => {
  const W = world({ trading: 100, leverage: 0 }); poser(W, pos({ id: 'pX', pair: 'ETH/USDT', totalExposure: 90, levBorrowed: 60 })); poser(W, pos({ id: 'pY' }));
  W.S._autoLevBorrowed = 60;   // un suivi d'avant le 18/10, où la part « exposition » était comptée
  const f0 = fonds(W.S); W.run("closePosition('pY')"); const f1 = W.S.fees.feeLog[0].totalFee; near(fonds(W.S), f0 - f1, 1e-9, 'après pY'); near(W.S._autoLevBorrowed, 0, 1e-12, 'suivi ramené à la dette en argent');
  W.run("closePosition('pX')"); const f2 = W.S.fees.feeLog[0].totalFee; near(fonds(W.S), f0 - f1 - f2, 1e-9, 'après pX'); near(W.S.leverageBorrowed, 0, 1e-12);
});
await T('L12 · VRAI openPosition, mise 124 $ avec 73 $ au trading, levier ×0 (le contrôle de capital laisse passer jusqu\'au double) : refusé et dit, rien ne bouge (avant : 124 $ ouverts, 51 $ créés) ; contrôle de capital neutralisé + emprunt plafonné : le refus de 02 rend l\'emprunt', () => {
  const W = world({ trading: 73 }); W.S.pairStates['BTC/USDT'].stake = 124; const f0 = fonds(W.S);
  assert.strictEqual(W.run("openPosition('BTC/USDT', 'long')"), null); assert.strictEqual(W.S.openPositions.length, 0); near(fonds(W.S), f0, 1e-12);
  assert.ok(W.seen.toasts.some(([m, l]) => /rien ouvert/.test(m) && l === 'critical'), JSON.stringify(W.seen.toasts));
  const V = world({ trading: 2, leverage: 1, capOk: true }); V.S.pairStates['BTC/USDT'].stake = 50; const g0 = fonds(V.S);
  assert.strictEqual(V.run("openPosition('BTC/USDT', 'long')"), null); assert.strictEqual(V.S.openPositions.length, 0);
  near(V.S.tradingAccount, 2, 1e-12, 'trading'); near(V.S.leverageBorrowed, 0, 1e-12, 'emprunt rendu'); near(V.S._autoLevBorrowed, 0, 1e-12); near(fonds(V.S), g0, 1e-12);
});
await T('L13 · VRAI texte de 09c (déduction des comptes) : emprunt « juste à temps » refusé (capacité épuisée) → ouverture annulée, rien débité, dit (avant : 100 $ ouverts sur 60 $, +40 $) ; emprunt qui couvre → ouverture poursuivie, _jitBorrowed = l\'emprunt', () => {
  const blk = between(s9c, '  let _jitBorrowed = 0;\n', '  // ──────────────────────────────────────────────────────────────\n  // RÉSERVE ANTI-NÉGATIF');
  const run = (W, stake, lev) => W.run('(function (baseStake, levBorrowed, _useLeverageForStake, pair, side) {\n' + blk + '\n  return { suite: true, _jitBorrowed: _jitBorrowed };\n})(' + stake + ', ' + lev + ', false, "BTC/USDT", "long")');
  const W = world({ trading: 60, leverage: 1 }); W.S.leverageBorrowed = 570; W.S._autoLevBorrowed = 570; const t0 = W.S.tradingAccount;
  const r = run(W, 100, 0); assert.strictEqual(r, undefined, 'annulée'); near(W.S.tradingAccount, t0, 1e-12, 'rien débité'); near(W.S.leverageBorrowed, 570, 1e-12);
  assert.ok(W.S.chainLog.some(l => /annulée · mise \$100 > trading \$60\.00/.test(l.desc)), W.S.chainLog.map(l => l.desc).join(' | '));
  const V = world({ trading: 60, leverage: 1 }); const r2 = run(V, 100, 0); assert.ok(r2 && r2.suite, 'poursuivie'); near(r2._jitBorrowed, 40, 1e-9); near(V.S.tradingAccount, 0, 1e-12); near(V.S.leverageBorrowed, 40, 1e-12);
});
await T('L14 · intérêts du levier sur un trading presque vide (1 $ pour 10 $ dus) : 1 $ payé, 9 $ ajoutés à la dette — rien de créé (avant : trading à 0, réserve +10 $)', () => {
  const W = world({ trading: 1, leverage: 1 }); W.S.leverageBorrowed = 1000; W.S._autoLevBorrowed = 1000; W.S.leverageBorrowRate = 0.01; const v0 = fonds(W.S) + W.S.fiscalReserveAccount;
  W.run('applyLeverageBorrowFees()'); near(W.S.tradingAccount, 0, 1e-12); near(W.S.fiscalReserveAccount, 1, 1e-12, 'réserve = payé'); near(W.S.leverageBorrowed, 1009, 1e-9, 'dette + impayé');
  near(fonds(W.S) + W.S.fiscalReserveAccount, v0 - 9, 1e-9, 'rien de créé');
});
await T('L15 · 360 suites tirées au hasard (12 graines × 30 : caisse 0–300 $, index ×0–×3, « juste à temps », mise de la réserve, exposition ×2, ajouts par la fiche, gains / pertes, transferts, solvabilité ; contrôle de capital réel) : fonds propres = avant + résultat − frais, exactement ; la dette en argent n\'est jamais négative', () => {
  for (const graine of [4242, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]) {
    let seed = graine; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let k = 0; k < 30; k++) {
      const W = world({ trading: 50 + Math.round(rnd() * 150), cash: Math.round(rnd() * 300), split: Math.round(rnd() * 30) });
      let f = fonds(W.S), n = 0;
      for (let step = 0; step < 14; step++) {
        const r = rnd(), pairs = Object.keys(W.S.pairStates), pair = pairs[Math.floor(rnd() * 3)], ps = W.S.pairStates[pair];
        const nFees = W.S.fees.feeLog.length, rows = pairs.map(p => W.S.pairStates[p].trades.length);
        if (r < 0.15) W.run('changeLeverage(' + (rnd() < 0.6 ? 1 : -1) + ')');
        else if (r < 0.42 && !W.S.openPositions.some(p => p.pair === pair)) {
          ps.stake = Math.round(W.S.tradingAccount * (0.2 + rnd() * 1.1)) + 1; ps.pairLeverage = rnd() < 0.3 ? 2 : 1; ps.price = 100;
          W.run("openPosition('" + pair + "', '" + (rnd() < 0.5 ? 'long' : 'short') + "')");
        } else if (r < 0.5 && !W.S.openPositions.some(p => p.pair === pair) && (W.S.leverage || 0) >= 1) {
          const st = 10 + Math.round(rnd() * 30); ps.price = 100; poser(W, pos({ id: 'b' + (n++), pair, stakeUsdt: st, totalExposure: st, levBorrowed: st, _levCash: st, auto: true }), { fromReserve: st });
        } else if (r < 0.56 && W.S.openPositions.length) {
          const p = W.S.openPositions[Math.floor(rnd() * W.S.openPositions.length)]; W.S.pairStates[p.pair].price = 100 * (0.9 + rnd() * 0.2);
          W.run("_editModal = { posId: '" + p.id + "', cfg: { dec: 2 }, ps: S.pairStates['" + p.pair + "'] };");
          ['peEntryInput', 'peTpInput', 'peSlInput'].forEach(id => { W.els[id] = { value: '' }; }); W.els.peStakeInput = { value: String(p.stakeUsdt + 1 + Math.round(rnd() * 20)) }; W.run('applyPosEdit()');
        } else if (r < 0.8 && W.S.openPositions.length) {
          const p = W.S.openPositions[Math.floor(rnd() * W.S.openPositions.length)]; W.S.pairStates[p.pair].price = 100 * (0.5 + rnd() * 0.7); W.run("closePosition('" + p.id + "')");
        } else if (r < 0.9 && W.S.tradingAccount > 5) transfert(W, Math.floor(W.S.tradingAccount * rnd() * 0.5));
        else if (W.S.openPositions.length) { W.S.openPositions.forEach(p => { W.S.pairStates[p.pair].price = 100 * (0.5 + rnd() * 0.7); }); W.run("_forceCloseAllForSolvency('banc')"); }
        const got = pairs.reduce((a, p, i) => a + W.S.pairStates[p].trades.slice(rows[i]).filter(t => t.type === 'position').reduce((x, t) => x + t.pnlUsdt, 0), 0);
        const paid = W.S.fees.feeLog.slice(0, W.S.fees.feeLog.length - nFees).reduce((x, e) => x + e.totalFee, 0);
        const f2 = fonds(W.S); near(f2, f + got - paid, 1e-7, 'graine ' + graine + ' suite ' + k + ' pas ' + step); f = f2;
      }
    }
  }
});

console.log('▶ M. n° 26 — la fiche ✏️ ne crée plus d\'argent');
const edit = (W, id, fields) => { W.run("_editModal = { posId: '" + id + "', cfg: { dec: 2 }, ps: S.pairStates['BTC/USDT'] };"); ['peEntryInput', 'peTpInput', 'peSlInput', 'peStakeInput'].forEach(k => { W.els[k] = { value: fields[k] != null ? String(fields[k]) : '' }; }); W.run('applyPosEdit()'); };
await T('M1 · VRAI applyPosEdit, mise 30 → 40 $ au prix d\'entrée : 10 $ retirés du trading ; fermée au même prix → le compte n\'a perdu que les frais (avant : +10 $ créés)', () => {
  const W = world({ trading: 100 }); poser(W, pos()); const f0 = fonds(W.S), t0 = W.S.tradingAccount;
  edit(W, 'pA', { peEntryInput: 100, peStakeInput: 40 }); const p = W.S.openPositions[0];
  near(W.S.tradingAccount, t0 - 10, 1e-9, 'débit'); assert.strictEqual(p.stakeUsdt, 40); assert.strictEqual(p.totalExposure, 40); near(fonds(W.S), f0, 1e-9, 'achat neutre');
  W.run("closePosition('pA')"); near(fonds(W.S), f0 - W.S.fees.feeLog[0].totalFee, 1e-9, 'fonds propres');
  assert.ok(W.seen.toasts.some(([m, l]) => /achetés au prix du moment/.test(m) && l === 'user'), 'l\'achat se voit : ' + JSON.stringify(W.seen.toasts));
});
await T('M2 · prix monté à 110 avant l\'ajout (30 → 40 $) : les 10 $ achètent à 110 ; fermée à 110 → résultat 3 $, fonds propres = avant + 3 $ − frais (avant : 10 $ créés)', () => {
  const W = world({ trading: 100 }); poser(W, pos()); W.S.pairStates['BTC/USDT'].price = 110; const f0 = fonds(W.S);
  edit(W, 'pA', { peEntryInput: 100, peStakeInput: 40 }); W.run("closePosition('pA')"); near(lastTrade(W).pnlUsdt, 3, 1e-9, 'résultat');
  near(fonds(W.S), f0 + 3 - W.S.fees.feeLog[0].totalFee, 1e-9, 'fonds propres');
});
await T('M3 · réduire la mise (40 → 30 $) est refusé et DIT pourquoi ; rien ne bouge (avant : 10 $ détruits à la fermeture)', () => {
  const W = world({ trading: 100 }); poser(W, pos({ stakeUsdt: 40, totalExposure: 40 })); const t0 = W.S.tradingAccount;
  edit(W, 'pA', { peEntryInput: 100, peTpInput: 105, peSlInput: 95, peStakeInput: 30 });
  assert.strictEqual(W.S.openPositions[0].stakeUsdt, 40); assert.strictEqual(W.S.tradingAccount, t0); assert.ok(W.seen.toasts.some(([m, l]) => /non réduite/.test(m) && l === 'warn'), JSON.stringify(W.seen.toasts));
});
await T('M4 · trading insuffisant (5 $ pour un ajout de 10 $) : refusé et dit ; mise, trading et prix d\'entrée intacts', () => {
  const W = world({ trading: 35 }); poser(W, pos()); edit(W, 'pA', { peEntryInput: 100, peStakeInput: 40 });
  assert.strictEqual(W.S.openPositions[0].stakeUsdt, 30); near(W.S.tradingAccount, 5, 1e-12); assert.ok(W.seen.toasts.some(([m, l]) => /il faut/.test(m) && l === 'warn'));
});
await T('M5 · position à levier (mise 30, exposition 90) : +10 $ → mise 40, exposition 100, emprunt inchangé ; fermée à +1 % → 100 × 1 % au compte', () => {
  const W = world({ trading: 100, leverage: 1 }); poser(W, pos({ totalExposure: 90, levBorrowed: 60 })); edit(W, 'pA', { peEntryInput: 100, peStakeInput: 40 });
  const p = W.S.openPositions[0]; assert.strictEqual(p.totalExposure, 100); assert.strictEqual(p.levBorrowed, 60);
  W.S.pairStates['BTC/USDT'].price = 101; W.run("closePosition('pA')"); near(lastTrade(W).pnlUsdt, 1, 1e-9);
});
await T('M6 · TP / SL seuls (entrée exacte) : aucun argent ne bouge', () => {
  const W = world({ trading: 100 }); poser(W, pos()); const t0 = W.S.tradingAccount; edit(W, 'pA', { peEntryInput: 100, peTpInput: 104, peSlInput: 97, peStakeInput: 30 });
  assert.strictEqual(W.S.tradingAccount, t0); assert.strictEqual(W.S.openPositions[0].stakeUsdt, 30); assert.strictEqual(W.S.openPositions[0].tp, 104);
});
await T('M7 · VRAIE fiche (openPosEdit puis applyPosEdit) sur une paire à 2 décimales, DOT LONG à 6,80 $ : on change SEULEMENT le TP → prix d\'entrée intact (champ en lecture seule, valeur exacte) ; fermée au même prix → fonds propres = avant − frais (avant : entrée tronquée à 6, +4 $)', () => {
  const W = world({ trading: 100 }); W.S.pairStates['DOT/USDT'].price = 6.8; poser(W, pos({ pair: 'DOT/USDT', entryPrice: 6.8 })); const f0 = fonds(W.S);
  W.run("openPosEdit('pA')"); assert.strictEqual(W.els.peEntryInput.value, '6.8', 'pré-rempli exact'); assert.strictEqual(W.els.peEntryInput.readOnly, true, 'lecture seule');
  W.els.peTpInput.value = '7.1'; W.run('applyPosEdit()');
  assert.strictEqual(W.S.openPositions[0].entryPrice, 6.8); assert.strictEqual(W.S.openPositions[0].tp, 7.1);
  W.run("closePosition('pA')"); near(fonds(W.S), f0 - W.S.fees.feeLog[0].totalFee, 1e-9, 'fonds propres');
});
await T('M8 · un prix d\'entrée changé dans la fiche (100 → 50 en LONG) est refusé et dit ; la position garde son entrée (avant : +100 % fabriqués)', () => {
  const W = world({ trading: 100 }); poser(W, pos()); edit(W, 'pA', { peEntryInput: 50, peStakeInput: 30 });
  assert.strictEqual(W.S.openPositions[0].entryPrice, 100); assert.ok(W.seen.toasts.some(([m, l]) => /Prix d'entrée non modifié/.test(m) && l === 'warn'), JSON.stringify(W.seen.toasts));
});
await T('M9 · VRAI « ↓ Convertir » (flipPosition → 07 manuInvert) : la position est FERMÉE (résultat à l\'historique, frais) puis rouverte en SHORT, même mise ; fonds propres = avant + résultat − frais (avant : la perte latente effacée sans être réalisée)', () => {
  const W = world({ trading: 200 }); poser(W, pos({ stakeUsdt: 30, totalExposure: 30 })); const f0 = fonds(W.S); W.S.pairStates['BTC/USDT'].price = 70;
  W.run("_editModal = { posId: 'pA' }; flipPosition('pA')");
  const r = W.S.pairStates['BTC/USDT'].trades.filter(t => t.type === 'position'); assert.strictEqual(r.length, 1, 'fermeture écrite'); near(r[0].pnlUsdt, -9, 1e-9);
  const np = W.S.openPositions[0]; assert.ok(np && np.side === 'short' && np.stakeUsdt === 30 && np.entryPrice === 70, JSON.stringify(np));
  near(fonds(W.S), f0 - 9 - W.S.fees.feeLog[0].totalFee, 1e-9, 'fonds propres');
});

console.log('▶ N. n° 29 — une seule mesure d\'une position ouverte');
await T('N1 · _posLatent = ce que closePosition écrit à l\'historique, _posCloseFees = ce que recordFees prend — AU BIT PRÈS, 600 positions tirées au hasard (levier ×1–×10, LONG / SHORT, bot / main, pertes au-delà de la mise, prix 0)', () => {
  let seed = 777; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < 600; k++) {
    const W = world({ trading: 1000 }); const st = 5 + rnd() * 100, lev = 1 + Math.floor(rnd() * 10), side = rnd() < 0.5 ? 'long' : 'short', e = 50 + rnd() * 100;
    const p = poser(W, pos({ side, auto: rnd() < 0.5, entryPrice: e, stakeUsdt: st, totalExposure: st * lev, levBorrowed: st * (lev - 1) }));
    const px = k % 50 === 0 ? 0 : e * (rnd() < 0.1 ? (side === 'long' ? 0.05 : 2.5) : (0.7 + rnd() * 0.6)); W.S.pairStates['BTC/USDT'].price = px;
    const lt = W.run('_posLatent(S.openPositions[0], ' + px + ')'), cf = W.run('_posCloseFees(S.openPositions[0], ' + lt.pct + ')');
    W.run("closePosition('pA')");
    assert.strictEqual(lt.usd, lastTrade(W).pnlUsdt, 'résultat ' + k); assert.strictEqual(cf.total, W.S.fees.feeLog[0].totalFee, 'frais ' + k); assert.strictEqual(lt.val, p.stakeUsdt + lt.usd);
  }
});
await T('N2 · solvabilité, levier ×3 (mise 30, exposition 90, compte trading vide) au prix d\'entrée : RIEN n\'est soldé (avant : reste net < 0 dès l\'ouverture → tout fermé)', () => {
  const W = world({ trading: 30, leverage: 1 }); poser(W, pos({ totalExposure: 90, levBorrowed: 60 })); W.run('_leverageMarginCheck()');
  assert.strictEqual(W.S.openPositions.length, 1, 'position gardée'); const sv = W.run('_leverageSolvency()'); near(sv.debt, 0, 1e-12, 'dette en argent'); near(sv.debtTotal, 60, 1e-12);
});
await T('N3 · solvabilité, vraie limite : 100 $ d\'index dépensés dans une mise de 100 $ — au prix d\'entrée rien ne bouge ; à −97 % tout est soldé, la dette rendue sur ce qui reste, le reste dû', () => {
  const W = world({ trading: 5, leverage: 1 }); W.S.leverageBorrowed = 100; W.S._autoLevBorrowed = 100; W.S.tradingAccount += 100; poser(W, pos({ stakeUsdt: 100, totalExposure: 100 }));
  W.run('_leverageMarginCheck()'); assert.strictEqual(W.S.openPositions.length, 1);
  W.S.pairStates['BTC/USDT'].price = 3; W.run('_leverageMarginCheck()'); assert.strictEqual(W.S.openPositions.length, 0, 'soldé'); near(W.S.tradingAccount, 0, 1e-12);
  assert.ok(W.S.leverageBorrowed > 90, 'reste dû : ' + W.S.leverageBorrowed);
});
await T('N4 · le P&L latent écrit sur la position (renderPositions 02, _bgModeWatch 08, _botExitSweep 10f) = ce que closePosition réaliserait : SHORT ×5 perdant au-delà de sa mise → −30 $, valeur 0 (avant : −52,50 $ et « valeur » 97,50 $)', () => {
  const mk = () => { const W = world({ trading: 100, leverage: 1, auto: true }); poser(W, pos({ side: 'short', totalExposure: 150, levBorrowed: 120, auto: true, tp: 1, sl: 1e9 })); W.S.pairStates['BTC/USDT'].price = 135; return W; };
  const W1 = mk(); W1.run('renderPositions()');
  const W2 = mk(); W2.run(fnSrc(s08, '_bgModeWatch')); W2.c.learnFromOpenPositions = () => {}; W2.c.estimateStakes = () => {}; W2.c._decErr = e => { throw e; }; W2.run('_bgModeWatch(1)');
  const W3 = mk(); W3.c._rcPriceAge = () => 0; W3.c._closeCompleted = () => {}; W3.run(between(s10f, 'window._botExitSweep = function _botExitSweep() {', '\nwindow._lossCapSweep = function')); W3.run('window._botExitSweep()');
  [W1, W2, W3].forEach((W, i) => { const p = W.S.openPositions[0]; near(p.pnl, -35, 1e-9, 'pct ' + i); assert.strictEqual(p.pnlUsdt, -30, 'usd ' + i); assert.strictEqual(p.currentVal, 0, 'valeur ' + i); });
});
await T('N5 · SANS levier, le P&L latent et la valeur sont les MÊMES qu\'avant, au bit près (2 000 positions de −99 % à +400 %, et un prix à 0) ; seul change un SHORT qui perd plus que sa mise (borné comme à la fermeture)', () => {
  let seed = 31; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const W = world();
  for (let k = 0; k < 2001; k++) {
    const st = 1 + rnd() * 300, e = 0.001 + rnd() * 1000, side = rnd() < 0.5 ? 'long' : 'short', mv = side === 'long' ? (0.01 + rnd() * 4.9) : (0.2 + rnd() * 1.79), px = k === 2000 ? 0 : e * mv;
    const p = pos({ side, entryPrice: e, stakeUsdt: st, totalExposure: st }); const lt = W.run('_posLatent(' + JSON.stringify(p) + ', ' + px + ')');
    // les formules d'avant : renderPositions (02) / _bgModeWatch (08) / 07 (exposition × %), _botExitSweep et _resolvePairCycleCore (10f) (mise × %)
    const pnl = side === 'long' ? ((px - e) / e) * 100 : ((e - px) / e) * 100, usdA = st * (pnl / 100);
    assert.strictEqual(lt.pct, pnl, 'pct ' + k); assert.strictEqual(lt.usd, usdA, 'usd ' + k); assert.strictEqual(lt.val, st + usdA, 'valeur ' + k);
  }
  const lt = W.run('_posLatent(' + JSON.stringify(pos({ side: 'short', entryPrice: 100, stakeUsdt: 30 })) + ', 250)'); assert.strictEqual(lt.usd, -30); assert.strictEqual(lt.val, 0);
});
await T('N6 · estimations branchées sur la mesure unique : 02 solvabilité, renderPositions, fenêtre ⊗ ; 03 suggestion MANU et « et si » ; 06 impact BTC ; 07 carte (frais, net, valeur, TP / SL en $), positions, « net en poche » ; 08 fond d\'écran ; 09f1 cartes ; 09g « Pourquoi ? » ; 10f ; 16 — plus aucun P&L d\'une position ouverte sur sa seule mise', () => {
  const C = s => codeStrict(s);
  const sv = C(fnSrc(s02, '_leverageSolvency')); assert.ok(sv.includes('_posLatent(pos, px > 0 ? px : NaN)') && sv.includes('_posCloseFees(pos, lt.pct).total') && sv.includes('_levCashDebt(S, null)'), '02 solvabilité');
  assert.ok(C(fnSrc(s02, 'renderPositions')).includes('_posMark(pos, ps.price);'), '02 renderPositions');
  assert.strictEqual((C(s02).match(/_posLatent\(pos, cur\)\.usd/g) || []).length, 3, '02 fenêtre ⊗');
  const m03 = C(fnSrc(s03, 'updateManualSuggestion')); assert.ok(m03.includes('_posLatent(pos, ps.price)') && m03.includes('_posCloseFees(pos, pnlPct).total'), '03 suggestion');
  assert.ok(C(s03).includes("const _lt = _posLatent(pos, priceAt);"), '03 et si');
  assert.ok(C(fnSrc(s06, 'simulateBtcMove')).includes('_posLatent(pos, newPrice).usd - _posLatent(pos, cur).usd'), '06');
  const c07 = C(s07); assert.ok(c07.includes('Math.abs(_posLatent(p, tpPrice).usd)') && c07.includes('Math.abs(_posLatent(p, slPrice).usd)'), '07 TP / SL');
  assert.ok(c07.includes('_posCloseFees(pos, pnlPct).total + fundCost') && c07.includes('const curVal     = _lt.val;') && (c07.match(/_posMark\(pos, ps\.price\)/g) || []).length === 2, '07 carte et positions');
  const np = C(fnSrc(s07, '_computeNetUsdParts')); assert.ok(np.includes('posVal += lt.val;') && np.includes('closeFees += _posCloseFees(p, lt.pct).total;') && np.includes('-levDebt'), '07 net en poche');
  assert.ok(C(fnSrc(s08, '_bgModeWatch')).includes('_posMark(pos, ps.price);'), '08');
  assert.ok(C(fnSrc(s9f1, '_abPosPnl')).includes('_posLatent(pos, px)'), '09f1'); assert.ok(C(s9g).includes('_posLatent(pos, curPrice).usd'), '09g');
  assert.strictEqual((C(s10f).match(/_posMark\((botPos|pos), (ps\.price|px)\)/g) || []).length, 2, '10f');
  assert.strictEqual((C(s16).match(/_posCloseFees\(p, pct \* 100\)/g) || []).length, 2, '16');
  // plus aucune ligne de code chargée qui écrit un P&L latent sur la mise, une valeur « exposition + P&L », ou un P&L d'exposition sans borne
  const loaded = [...html.matchAll(/<script[^>]*\bsrc="(js\/[^"?]+)/g)].map(m => m[1]);
  const bad = []; loaded.forEach(f => C(rd(f)).split('\n').forEach(l => { if (/pnlUsdt\s*=\s*[^;]*stakeUsdt\s*\*|currentVal\s*=\s*exp\s*\+|pnlUsd\s*=\s*[A-Za-z_.]*stakeUsdt\s*\*\s*\(?pnlPct|\(pos\.totalExposure \|\| pos\.stakeUsdt\) \* \(pnlPct/.test(l)) bad.push(f + ': ' + l.trim().slice(0, 90)); }));
  assert.deepStrictEqual(bad, [], 'P&L sur la mise ou sans borne encore écrit');
});
await T('N7 · 16 impôt latent : avec levier ×3 (mise 30, exposition 90), les frais passés au registre sont ceux de l\'exposition (ceux que recordFees passera), pas de la mise', () => {
  const ctx = { console, Math, Number, Object, Array, String, JSON, isFinite, Intl, window: {}, setInterval: () => 0, clearInterval() {}, Date: HORLOGE };
  vm.createContext(ctx);
  vm.runInContext('var S = { tradingMode: "paperReal", usdEurRate: 1, _usdEurLastFetch: 1, taxConfig: { region: "BE" }, feeConfig: ' + JSON.stringify(FEE) + ', chainLog: [], pairStates: {},'
    + ' walletStore: { paperReal: { tradingAccount: 0, fiscalReserveAccount: 0, fiscalReserveLog: [], openPositions: [], pairStates: { "BTC/USDT": { price: 110 } } } } };'
    + ' function _walletKey(m) { return m || S.tradingMode; } function _walletFor(m) { return S.walletStore[_walletKey(m)]; }', ctx);
  if (has(s02, '_posCloseFees')) vm.runInContext(fnSrc(s02, '_posCloseFees'), ctx);
  vm.runInContext(s16, ctx);
  const seen = []; const real = ctx._fiscGainEur; ctx._fiscGainEur = function (side, N, pnl, sf, a, b) { seen.push(sf); return real(side, N, pnl, sf, a, b); };
  vm.runInContext('S.walletStore.paperReal.openPositions.push(' + JSON.stringify(pos({ totalExposure: 90, levBorrowed: 60, _levCash: 0 })) + '); _fiscLatentTaxUsd("paperReal");', ctx);
  assert.ok(seen.length === 1, 'appelé'); near(seen[0], 90 * FEE.slippage * 2, 1e-12, 'glissement sur l\'exposition');
});
await T('N8 · « net en poche » (07 _computeNetUsdParts) avec levier (index ×3, une position « juste à temps » à +10 %, une position ×3 à −4 %) = ce que le compte tient VRAIMENT après tout fermer et rendre la dette (avant : dette ignorée, frais de sortie seuls sur la mise)', () => {
  const W = world({ trading: 100 }); indexX(W, 3); W.S.tradingAccount += 40; /* [GO NETTOYAGE · 19/10/2026] (n° 58) capacité « juste à temps » = base × index − dette (règle du 15/08) : après l'index ×3, 40 $ GAGNÉS (argent à soi) ouvrent 120 $ de marge — avant : 10 × base × index */ 
  W.S.pairStates['SOL/USDT'].stake = 10; W.S.pairStates['SOL/USDT'].pairLeverage = 3; W.run("openPosition('SOL/USDT', 'short')");
  W.S.pairStates['ETH/USDT'].stake = Math.round(W.S.tradingAccount + 30); W.run("openPosition('ETH/USDT', 'long')");
  assert.strictEqual(W.S.openPositions.length, 2, JSON.stringify(W.seen.toasts.slice(-2)));
  W.S.pairStates['ETH/USDT'].price = 110; W.S.pairStates['SOL/USDT'].price = 104;
  const net = W.run('_computeNetUsdParts()').net;
  W.S.openPositions.slice().forEach(p => W.run("closePosition('" + p.id + "')")); W.run('_repayCashDebt(_levFreeDebt())');
  near(net, W.S.cashAccount + W.S.tradingAccount + W.S.antiNegReserve - W.S.leverageBorrowed, 1e-9, 'net en poche');
});
await T('N9 · capital du Bunker (07 _bkCapital) : l\'index ×3 et une ouverture « juste à temps » ne le font pas bouger ; la fermeture au prix d\'entrée ne lui retire que les frais (avant le correctif : le remboursement le faisait chuter, Bunker à −60 %) ; le portefeuille canonique (lu par la décision) est inchangé', () => {
  const W = world({ trading: 100 }); const b0 = W.run('_bkCapital()');
  indexX(W, 3); near(W.run('_bkCapital()'), b0, 1e-9, 'Bunker après l\'index'); W.S.tradingAccount += 40; /* [GO NETTOYAGE · 19/10/2026] (n° 58) capacité « juste à temps » = base × index − dette (règle du 15/08) : après l'index ×3, 40 $ GAGNÉS (argent à soi) ouvrent 120 $ de marge — avant : 10 × base × index */ const b1 = W.run('_bkCapital()'); near(b1, b0 + 40, 1e-9, 'le gain compte');
  W.S.pairStates['ETH/USDT'].stake = 470; W.run("openPosition('ETH/USDT', 'long')"); W.run('renderPositions()');
  assert.ok(W.S.openPositions[0] && W.S.openPositions[0]._levCash === 30, 'ouverture « juste à temps »');
  near(W.run('_bkCapital()'), b1, 1e-9, 'Bunker');
  W.run("closePosition('" + W.S.openPositions[0].id + "')"); const fee = W.S.fees.feeLog[0].totalFee;
  near(W.run('_bkCapital()'), b1 - fee, 1e-9, 'Bunker');
  assert.ok(/return \(o\.cashAccount \|\| 0\) \+ \(o\.tradingAccount \|\| 0\) \+ eng;\n\}/.test(fnSrc(s02, '_computePortfolio')), 'portefeuille canonique inchangé');
});
await T('N10 · fenêtre ⊗ « Fermer » (02 renderClosePositionsList) : SHORT ×5 perdant au-delà de sa mise → affiche −$30.00, ce que la fermeture réalisera (avant : −$52.50)', () => {
  const W = world({ trading: 100, leverage: 1 }); poser(W, pos({ side: 'short', totalExposure: 150, levBorrowed: 120 })); W.S.pairStates['BTC/USDT'].price = 135;
  W.run('renderClosePositionsList()'); assert.ok(/−\$30\.00/.test(W.els.closePositionsList.innerHTML) && !/52\.50/.test(W.els.closePositionsList.innerHTML), W.els.closePositionsList.innerHTML.slice(0, 600));
});
await T('N11 · sortie partielle (05 closePartial) d\'une position à levier : refusée et dite, rien ne bouge (avant : résultat sur la mise, levier du reste effacé ; −59,72 $ avec une position d\'avant le 18/10)', () => {
  const W = world({ trading: 100, leverage: 1 }); poser(W, pos({ totalExposure: 90, levBorrowed: 60 })); W.S.pairStates['BTC/USDT'].price = 101; const t0 = W.S.tradingAccount, f0 = fonds(W.S);
  W.run("closePartial('pA', 0)"); assert.strictEqual(W.S.openPositions[0].totalExposure, 90); assert.strictEqual(W.S.tradingAccount, t0); near(fonds(W.S), f0, 1e-12);
  assert.ok(W.seen.toasts.some(([m, l]) => /sortie partielle indisponible/.test(m) && l === 'warn'), JSON.stringify(W.seen.toasts));
});

console.log('▶ S. La décision d\'ouvrir n\'est pas touchée');
await T('S1 · ouvreurs et gardes du levier au texte d\'avant (empreintes du commit a82841b) : estimateStakes, ensureLeverageCoverForTrade, applyAutoLeverageBorrow, setLeverageByBot, validateAntiNegative, estimateTradeReserve ; borrowLeverage hors son suivi _autoLevBorrowed ; 09c entier et openPosition hors leurs lignes d\'argent GO LEVIER', () => {
  const got = {}; Object.keys(EMPREINTES_AVANT).forEach(n => {
    let t = fnSrc(s02, n);
    if (n === 'borrowLeverage') t = t.replace(/  \/\/ \[GO LEVIER · 18\/10\/2026\] la part « exposition » n'entre plus dans _autoLevBorrowed[\s\S]*?n'ont aucun appelant\.\n/,
      '  // v7.12 · P10 · Tracker aussi dans _autoLevBorrowed pour que P4/P5 le voient\n  S._autoLevBorrowed = (S._autoLevBorrowed || 0) + available;\n');
    got[n] = h16(sansNettoyage(t, n));
  });
  assert.deepStrictEqual(got, EMPREINTES_AVANT, 'fonctions de 02 modifiées');
  const c9 = s9c.replace(/    \/\/ \[GO LEVIER · 18\/10\/2026\] \(ETAT n° 25\) la mise ne dépasse jamais ce que le trading tient[\s\S]*?\n      return;\n    \}\n/, '')
    .replace(/\n    currentVal:    baseStake, [^\n]*/, '\n    currentVal:    stakeUsdt,').split('\n').filter(l => !/^\s*_levCash:\s+_jitBorrowed,/.test(l)).join('\n');
  assert.strictEqual(h16(c9), EMPREINTE_09C_AVANT, '09c modifié hors GO LEVIER');
  assert.ok(/\n    _levCash:      _jitBorrowed, /.test(s9c), '09c pose _levCash');
  const op = sansNettoyage(fnSrc(s02, 'openPosition'), 'openPosition').replace(/\n  \/\/ \[GO LEVIER · 18\/10\/2026\] \(ETAT n° 25\) la mise ne dépasse jamais[\s\S]*?\n    return null;\n  \}/, '')
    .replace(/\n    currentVal:   stakeUsdt, [^\n]*/, '\n    currentVal:   totalExposure,').split('\n').filter(l => !/^\s*_levCash:\s+_jitBorrowedManual,/.test(l)).join('\n');
  assert.strictEqual(h16(op), EMPREINTE_OPEN_AVANT, 'openPosition modifiée hors GO LEVIER');
});

console.log('\n' + (fail ? '❌' : '✅') + ' ' + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
})();
