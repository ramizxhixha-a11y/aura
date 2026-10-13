// banc-demo-retire.js — [GO DÉMO · 12/10/2026] VERSION 20261012a
// « go démo » (Rams, 12/10 22:51 : « on l'enlève complètement, le mode démo ne sert à rien » ; 23:05 : « oui » pour le Multi-compte).
// Le 11/10 à 18:33, la carte « Gestion de Crise » du Mode Démo (05, v51) a remplacé le compte EV de Rams (1 085,46 $, 342 trades) par 880,20 $ et
// 47 trades : elle écrivait dans le vrai état, et la sauvegarde de sortie (09b2) n'avait pas la garde de la sauvegarde périodique. Sonde du 12/10 : le
// bouton « + Nouveau compte » du Multi-compte (05, v50) remettait de même le compte affiché à 1 000 $, sans confirmation ni retour.
// Ce banc tient deux choses :
//   R · le RETRAIT : plus aucun texte du Mode Démo ni du Multi-compte dans ce que la page charge ; le panneau Outils n'appelle que des rendus qui existent ;
//       plus de régime forcé, plus de garde de sauvegarde à contourner.
//   D · la RÉPARATION (js/18-reparation-demo.js) : l'accident est REFAIT avec le VRAI texte du Mode Démo gardé en témoin
//       (banc-fixtures/mode-demo-retire-20261012.js), sur un état d'essai à trois portefeuilles, avec les VRAIS accesseurs de 02, le VRAI recalage de
//       relance de 09b2, la VRAIE rotation jour / semaine de 10c et la VRAIE réserve de levier de 02 ; puis le compte réparé est comparé, champ par
//       champ, à un monde TÉMOIN qui a vécu la même suite sans l'accident. Les refus (mauvais fichier, backup trop ancien, empreinte partielle…) y sont.
// La réparation sur les VRAIS backups de Rams (compte abîmé du 12/10 22:09 + backup du 11/10 15:41 → 1 082,2744 $, 354 trades) est rejouée dans le
// navigateur par rejeu/sonde_demo.js : un backup n'entre jamais dans le dépôt.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ROOT = process.env.BANC_ROOT || __dirname, rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function T(name, fn) { try { fn(); pass++; console.log('  ✅ ' + name); } catch (e) { fail++; console.log('  ❌ ' + name + '\n     ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join('\n     ')); } }
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
const html = rd('AURA8_v118.html'), TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const scripts = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]), csss = [...html.matchAll(/<link[^>]*\bhref="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(m => m[1]);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s10c = rd('js/10c-profil-ab-contexte.js');
const F18 = 'js/18-reparation-demo.js', s18 = rd(F18), TEMOIN = rd('banc-fixtures/mode-demo-retire-20261012.js');
const J = o => JSON.parse(JSON.stringify(o));
const proche = (a, b, tol, quoi) => assert.ok(typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= (tol || 1e-9), (quoi || 'valeur') + ' : ' + a + ' ≠ ' + b);

// ─────────────── le monde d'essai : trois portefeuilles, les VRAIS accesseurs de 02 ───────────────
const ACC = between(s02, 'var _WALLET_ACCESSOR_FIELDS = [', '];', true) + '\n' + ['_walletKey', '_walletFor', '_activeWallet', '_installWalletAccessors', '_computePortfolio', '_tradingCapitalBase', 'syncLeverageReserve'].map(n => fnSrc(s02, n)).join('\n');
const BUNKER = ['_bkState', '_bkCapital', '_bkInitCapRef'].map(n => fnSrc(s07, n)).join('\n');
const RECAL = between(s9b2, '      var _pfFirst = false;', "      if (_pfFirst) { try { localStorage.setItem('aura_startpf_recal_v3', String(Date.now())); } catch(e) {} }", false);   // le recalage de relance, tel quel
const ROTATION = fnSrc(s10c, '_checkAndRotatePeriods');
// le VRAI jugement des sièges (03) : fenêtre, échelle, _fitOf, _fitJudge (n'écrit RIEN sans preuve), _fitCurrent, _fjMode. Le monde d'essai n'a pas de record aux horizons : la preuve y est faite de jugements (≥ 5).
const FIT = between(s03, 'const FIT_WINDOW = 60, FIT_MIN_N = 5;', '\n', true) + between(s03, 'const FIT_KEEP = 240;', '\n', true) + ['_fitWindow', '_fitScale', '_fitOf', '_fitJudge', '_fitCurrent', '_fjMode'].map(n => fnSrc(s03, n)).join('\n') + '\nfunction _fitHz() { return null; }';
// la VRAIE règle de relance des sièges sans preuve (09b2) : sous 350 sans preuve → 350 (et son portefeuille de marché)
const RELANCE_SIEGES = between(s9b2, "      S.agents.forEach(a => { if (!a || a.isBot || a.isMeta || a.id === 'composite') return; if (Number(a.fitness) < 350 && _fitCurrent(a) === null", '\n', false);
assert.ok(RELANCE_SIEGES.includes('a.fitness = 350; a.lmsrWallet = 350; nR++; } });'), 'règle de relance des sièges : texte attendu');
// le VRAI journal durable (02) : chaque ligne poussée dans S.chainLog est classée, marquée de son mode et gardée dans S.eventLog — et la VRAIE fermeture d'urgence (06), qui n'écrit que là
const s06 = rd('js/06-v63-patterns-chartistes.js');
const JOURNAL = between(s02, 'const EVENT_KINDS = [', '\n];', true) + '\n' + between(s02, 'const EVENT_KEEP = 400, EVENT_SAVE = 250, EVENT_DAYS = 7;', '\n', true) + between(s02, 'const EVENT_MODE_KINDS = {', '};', true) + '\n'
  + ['_chainStamp', '_eventKind', '_eventNote', '_installChainTap', '_modeBehind'].map(n => fnSrc(s02, n)).join('\n') + '\n' + fnSrc(s06, 'urgenceCloseAll');
const fitCtx = { S: {}, Math, Number, Array, Object }; vm.createContext(fitCtx); vm.runInContext(FIT, fitCtx); const PREUVE = a => vm.runInContext('_fitCurrent', fitCtx)(a);   // le _fitCurrent de la page, pour le module
const T0 = Date.UTC(2026, 9, 11, 14, 55, 46, 403);   // le lancement de la session de l'accident (11/10 16:55:46 à Bruxelles)
const PAIRES = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'GBP/USDT'];
const vrai = (p, k, gain, t) => [   // une ouverture puis sa fermeture, comme 02 les écrit dans l'historique de la paire
  { side: 'buy', type: 'open', amount: '1.5', price: 100 + k, pnl: 0, stakeUsdt: 50 + k, levBorrowed: 0, totalExposure: 50 + k, pnlUsdt: null, ts: t, time: '10:00:0' + (k % 10) },
  { side: 'buy', type: 'position', amount: '1.5', price: 101 + k, pnl: gain / (50 + k) * 100, stakeUsdt: 50 + k, pnlUsdt: gain, entryPrice: 100 + k, entryTs: t, entryTime: '10:00:0' + (k % 10), ts: t + 3600000, time: '11:00:0' + (k % 10) }];
function portefeuille(caisse, trading, hist) {   // hist : { paire: [gains…] }
  const pairStates = {}; let tt = 0, tw = 0;
  PAIRES.forEach((p, i) => {
    const gains = hist[p] || [], trades = []; let u = 0, w = 0;
    gains.forEach((g, k) => { vrai(p, i * 10 + k, g, T0 - 86400000 * (30 - k)).forEach(x => trades.push(x)); u += g; if (g > 0) w++; });
    pairStates[p] = { price: 100 + i, candles: [], trades, totalTrades: gains.length, winTrades: w, totalPnlUsd: u, totalPnlPct: u / 5, streak: 0, qYes: 100, qNo: 100 };
    tt += gains.length; tw += w;
  });
  const pf = caisse + trading;
  return { cashAccount: caisse, tradingAccount: trading, portfolio: pf, fiscalReserveAccount: 0, ownFundsInjected: 1149.814168034879, _ownFundsLegacyEUR: 0, _startPortfolio: pf - 0.75, _totalCompounded: -146.35384499358426,
    leverage: 0, leverageReserve: pf * 10 - 70, leverageBorrowed: 0, leverageTotalFees: 0, _autoLevBase: 0, _autoLevBorrowed: 0, antiNegReserve: 0, totalTrades: tt, winTrades: tw,
    cashLog: [{ amount: 0, source: 'profit_split', ts: T0 - 3600000, time: '15:55:46' }, { amount: -11, source: 'transfer_out', ts: T0 - 86400000, time: '16:55:46' }],   // du plus récent au plus ancien (02) ; un vieux transfert, déjà dans le backup
    fiscalReserveLog: [], ownFundsLog: [{ amount: 1033.25, ts: 1 }, { amount: 116.56, ts: 2 }], antiNegReserveLog: [], pairStates,
    fees: { totalTradingFees: 29.28, tradeCount: tt, feeLog: [], byPair: {} }, dreamJournal: [], openPositions: [], pnlHistory: Array.from({ length: 80 }, (_, i) => pf - (79 - i) * 0.01), pnl24h: 0,   // courbe PLEINE, points tous différents : elle glisse à chaque nouveau point
    pnlPeriod: { day: 0, week: 0, month: 0, history: [{ date: '2026-10-09', start: 1085.81, end: 1085.81, pnlUsd: 0, pnlPct: 0 }, { date: '2026-10-10', start: a2(pf), end: a2(pf), pnlUsd: 0, pnlPct: 0 }],
      todayDate: '2026-10-11', todayStartPortfolio: pf - 2.5, weekStart: '2026-W42', weekStartPortfolio: pf + 1.1, monthStart: '2026-10', monthStartPortfolio: 1089.0029534649968 },
    bunker: { active: false, capRef: trading + 3, startCapital: 90.06, triggerTs: 0, pausedByBunker: false }, realPairCycle: {}, fiscal: { v: 1, hist: [{ t: 5, p: 'ETH/USDT' }] } };
}
function a2(v) { return Math.round(v * 100) / 100; }
function depart(proche) {   // proche : 1 → un compte EV à 1,25 $ du compte fictif de « Débutant » ; 2 → à 0,4 centime
  const pr = proche === 2 ? [1.602, 521.802] : [2.10, 522.55];   // le compte EV de Rams d'avant l'accident, au cent près ; AA et RE à côté — proche : un compte EV à 1,25 $ du compte fictif de la carte « Débutant »
  return { tradingMode: 'paperReal', cycle: 1266481, chainLog: [], eventLog: [],
    walletStore: { sim: portefeuille(47.39090326806493, 1007.94, { 'BTC/USDT': [1, -2], 'SOL/USDT': [3] }),
      paperReal: portefeuille(proche ? pr[0] : 6.577371035449079, proche ? pr[1] : 1078.880967867839, { 'BTC/USDT': [2.5, -1.25, 0.75], 'ETH/USDT': [-0.5, 1.5], 'XRP/USDT': [0.25], 'SOL/USDT': [], 'GBP/USDT': [-0.1, 0.2] }),
      real: portefeuille(0, 1145.42, {}) },
    // sièges : avec preuve (≥ 5 jugements : leur fitness est celle du VRAI _fitOf, posée par monde()), sans preuve (nouveau-nés, bots)
    agents: [{ id: 'momentum_v1', name: 'Hybrid Gen-95372', _bornCycle: 1227377, fitness: null, _judgments: jug(8, 1) },             // preuve ; jugé depuis l'accident : recalculé seul
      { id: 'scalper_v2', name: 'Hybrid Gen-95454', _bornCycle: 1240000, fitness: null, _judgments: jug(6, -1) },                    // preuve ; PAS jugé depuis : porte encore la valeur de la carte
      { id: 'risk_bot_v1', name: 'Bot Gestion Risque', isBot: true, fitness: 350, _judgments: [] },
      { id: 'exec_bot_v1', name: 'Bot Exécution', isBot: true, fitness: 231.21192883333492, _judgments: [{ s: 1, w: 0.01, k: 3 }] },
      { id: 'trend_v2', name: 'Hybrid Gen-95449', _bornCycle: 1263684, fitness: 430, _judgments: [{ s: 1, w: 0.2, k: 12 }] },       // nouveau-né sans preuve, fitness de naissance 430 (07)
      { id: 'security_v1', name: 'Hybrid Gen-95362', _bornCycle: 1250000, fitness: 350, _judgments: [] },
      { id: 'rescue_bot_v1', name: 'Bot Sauvetage', isBot: true, fitness: 350, _judgments: [] }] };
}
function jug(n, sens) { return Array.from({ length: n }, (_, i) => ({ s: (i % 3 === 2) ? -sens : sens, w: 0.1 + 0.05 * (i % 4), k: 100 + i })); }
let H = T0;   // l'heure du monde (les deux mondes vivent la même suite d'heures)
function monde(plain, cles) {
  const cle = Object.assign({ jour: '2026-10-11', semaine: '2026-W42', mois: '2026-10' }, cles || {});
  const c = { S: plain, Math: Object.create(Math), Number, Object, Array, JSON, String, isFinite, isNaN, console, Date: Object.assign(function () { return new Date(H); }, { now: () => H }), document: { getElementById: () => null }, _urgAppendLog() {},
    showToast() {}, renderHome() {}, closeOutils() {}, localStorage: { getItem: () => '1', setItem() {}, removeItem() {} }, _freshWallet: () => ({}), _freshWalletStore: () => ({}),
    _getTodayKey: () => cle.jour, _getWeekKey: () => cle.semaine, _getMonthKey: () => cle.mois };
  c.window = c; vm.createContext(c); vm.runInContext(ACC + '\n' + BUNKER + '\n' + ROTATION + '\n' + FIT + '\n' + JOURNAL + '\n_installWalletAccessors(); _installChainTap(); (S.agents || []).forEach(function (a) { if (a.fitness === null) a.fitness = _fitCurrent(a); });', c);
  return { c, S: c.S, cle, run: code => vm.runInContext(code, c), plain: () => J({ tradingMode: c.S.tradingMode, cycle: c.S.cycle, chainLog: c.S.chainLog, eventLog: c.S.eventLog, walletStore: c.S.walletStore, agents: c.S.agents }) };
}
// l'accident : le VRAI texte du Mode Démo, hasard semé
function accident(X, carte, graine) {
  let a = graine >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  X.c.Math.random = rnd; X.c.Date = Object.assign(function () { return new Date(H); }, { now: () => H });
  X.run(TEMOIN + '\nenterDemoMode(' + JSON.stringify(carte) + ');');
}
// la relance : la sauvegarde de sortie écrit l'état tel quel, la relance le relit (ce qui ne vit qu'en mémoire — _demoMode, _regimeOverride — ne revient pas), puis le VRAI recalage de 09b2, la référence du bunker (07), la VRAIE règle des sièges sans preuve (09b2) et la réserve de levier reposée (09k)
function relancer(X) {
  const Y = monde(X.plain(), X.cle);
  Y.run('(function(){ var dbg = [];\n' + RECAL + '\n})(); _bkInitCapRef(); (function(){ let nR = 0;\n' + RELANCE_SIEGES + '\n})(); syncLeverageReserve();');   // 09k (init) : la réserve de levier du mode à l'écran est reposée
  return Y;
}
// une ouverture, puis sa fermeture, sur le mode à l'écran — dans l'ORDRE où 02 les écrit :
//   openPosition  : mise sortie du trading → portefeuille → réserve de levier (la position n'est PAS encore dans la liste : la réserve est posée sans sa mise) → position → ligne « open » ;
//   closePosition : mise rendue, gain, frais (compteur des frais) → ligne « position », compteurs de la paire → part du gain versée en caisse, écrite au journal même à 0 →
//                   portefeuille sans la position → réserve de levier (la position est ENCORE dans la liste) → point de courbe → totaux → la position sort de la liste.
function ouvrir(X, p, k) {
  const S = X.S, ps = S.pairStates[p], rec = vrai(p, k, 0, H)[0];
  S.tradingAccount -= rec.stakeUsdt; S.portfolio = X.run('_computePortfolio()'); X.run('syncLeverageReserve()');
  S.openPositions.push({ id: 'p' + k, pair: p, side: 'long', stakeUsdt: rec.stakeUsdt, entryPrice: rec.price, entryTs: H, auto: false }); ps.trades.push(rec);
  battue(X);
}
function fermer(X, p, k, gain, frais, versCaisse) {
  const S = X.S, ps = S.pairStates[p], pos = S.openPositions.find(q => q.id === 'p' + k), rec = vrai(p, k, gain, pos.entryTs)[1]; rec.ts = H;
  S.tradingAccount += pos.stakeUsdt + gain - frais; S.fees.tradeCount++; S.fees.totalTradingFees += frais;
  ps.trades.push(rec); ps.totalPnlPct += rec.pnl; ps.totalPnlUsd += gain; ps.totalTrades++; if (rec.pnl > 0) ps.winTrades++;
  if (gain > 0) { const v = versCaisse || 0; S.cashAccount += v; S.tradingAccount -= v; S.cashLog.unshift({ amount: v, source: 'profit_split', ts: H, time: '11:00:00' }); }
  S.portfolio = S.cashAccount + S.tradingAccount + S.openPositions.reduce((t, q) => t + (q === pos ? 0 : q.stakeUsdt), 0);   // 02 _computePortfolioSans(pos)
  X.run('syncLeverageReserve()'); S.pnlHistory.push(S.portfolio); if (S.pnlHistory.length > 80) S.pnlHistory.shift();
  S.totalTrades = Object.values(S.pairStates).reduce((t, q) => t + q.totalTrades, 0); S.winTrades = Object.values(S.pairStates).reduce((t, q) => t + q.winTrades, 0);
  S.openPositions = S.openPositions.filter(q => q.id !== pos.id);
}
function battue(X) { X.S.portfolio = X.run('_computePortfolio()'); }   // 08, toutes les 5 battues : le portefeuille du mode à l'écran est recalculé
function trade(X, p, k, gain, frais, laisserOuverte, versCaisse) { ouvrir(X, p, k); if (laisserOuverte) return; H += 3600000; fermer(X, p, k, gain, frais, versCaisse); }
function juger(X, id, sens, poids) { return X.run('_fitJudge(S.agents.find(function (a) { return a.id === ' + JSON.stringify(id) + '; }), ' + Number(sens) + ', ' + Number(poids) + ')'); }   // le VRAI _fitJudge de 03
// la même vie pour les deux mondes ; avecAccident : la carte, entre le backup et la première relance
function vie(avecAccident, opts) {
  opts = opts || {}; H = T0;
  let X = monde(depart(opts.compteProche)); const F = X.plain(); F.savedAt = new Date(H).toISOString();   // le backup d'AVANT, avec son heure (09b1)
  const point = () => { battue(X); X.S.pnlHistory.push(X.S.portfolio); if (X.S.pnlHistory.length > 80) X.S.pnlHistory.shift(); };   // un point de courbe, comme 08 en pose toutes les 5 battues
  H += 5000; point();                             // un point posé ENTRE le backup et l'accident
  if (opts.jourAvant) { H += 1800000; X.cle.jour = '2026-10-12'; X.run('_checkAndRotatePeriods()'); }   // le jour tourne ENTRE le backup et l'accident : sa ligne est toute d'avant
  if (opts.relanceAvant) { H += 900000; X = relancer(X); }                                              // une relance ENTRE le backup et l'accident : elle repose départ de session, du jour, référence du bunker
  H = T0 + 5850000;                               // 18:33
  if (avecAccident) accident(X, opts.carte || 'crise', opts.graine || 7);
  point();
  if (!opts.sansRelance1) X = relancer(X);        // 18:33:44
  H += 3600000; trade(X, 'BTC/USDT', 71, 0.4, 0.26, false, 0.03); trade(X, 'ETH/USDT', 72, -1.1, 0.24); juger(X, 'momentum_v1', -1, 0.3);
  if (opts.jugeSansPreuve) { juger(X, 'exec_bot_v1', 1, 0.02); juger(X, 'trend_v2', -1, 0.2); }   // jugés depuis l'accident SANS preuve (2 jugements) : le VRAI _fitJudge n'écrit rien
  if (opts.paireNee) { X.S.pairStates['ADA/USDT'] = { price: 1, candles: [], trades: [], totalTrades: 0, winTrades: 0, totalPnlUsd: 0, totalPnlPct: 0, streak: 0, qYes: 100, qNo: 100 }; trade(X, 'ADA/USDT', 75, 0.3, 0.1, false, 0.01); }   // une paire née APRÈS l'accident, et son premier trade
  H += 86400000; X.cle.jour = opts.jourAvant ? '2026-10-13' : '2026-10-12'; if (opts.semaineNeuve !== false) X.cle.semaine = '2026-W43'; if (opts.moisNeuf) X.cle.mois = '2026-11'; X.run('_checkAndRotatePeriods()');   // le jour (et la semaine, le mois) tournent : VRAIE rotation de 10c
  X = relancer(X);
  H += 600000; trade(X, 'SOL/USDT', 73, 2.2, 0.31, false, 0.05); if (opts.ouverte) trade(X, 'XRP/USDT', 74, 0, 0, true);
  return { X, F };
}
// la réparation, dans un contexte à part (comme la page : window, minuteries), sur l'état vivant du monde
function charger18(extra) {
  const timers = [], tard = []; const w = Object.assign({ setInterval: (fn, ms) => { timers.push({ fn, ms, on: true }); return timers.length; }, clearInterval: id => { if (timers[id - 1]) timers[id - 1].on = false; }, setTimeout: (fn, ms) => { tard.push({ fn, ms }); return tard.length; },
    Object, JSON, Math, Date, Number, String, Array, isFinite, isNaN, console, _fitCurrent: PREUVE }, extra || {}); w.window = w; vm.createContext(w); vm.runInContext(s18, w); w.__timers = timers; w.__tard = tard; return w;
}
const R = charger18()._demoReparation;
const comparer = (a, b, quoi) => {   // deux portefeuilles : l'argent au milliardième, les lignes d'historique au centime (elles sont écrites arrondies), le reste à l'identique
  ['cashAccount', 'tradingAccount', 'portfolio', '_startPortfolio', '_totalCompounded', 'leverageReserve'].forEach(k => proche(a[k], b[k], 1e-9, quoi + ' ' + k));
  proche(a.bunker.capRef, b.bunker.capRef, 1e-9, quoi + ' bunker.capRef');
  assert.strictEqual(a.totalTrades, b.totalTrades, quoi + ' totalTrades'); assert.strictEqual(a.winTrades, b.winTrades, quoi + ' winTrades');
  assert.strictEqual(a.pnlHistory.length, b.pnlHistory.length); a.pnlHistory.forEach((v, i) => proche(v, b.pnlHistory[i], 1e-9, quoi + ' pnlHistory[' + i + ']'));
  ['todayStartPortfolio', 'weekStartPortfolio', 'monthStartPortfolio'].forEach(k => proche(a.pnlPeriod[k], b.pnlPeriod[k], 1e-9, quoi + ' pnlPeriod.' + k));
  ['todayDate', 'weekStart', 'monthStart'].forEach(k => assert.strictEqual(a.pnlPeriod[k], b.pnlPeriod[k]));
  assert.strictEqual(a.pnlPeriod.history.length, b.pnlPeriod.history.length);
  a.pnlPeriod.history.forEach((h, i) => { const g = b.pnlPeriod.history[i]; assert.strictEqual(h.date, g.date); proche(h.start, g.start, 0.0101, quoi + ' ligne ' + h.date + ' start'); proche(h.end, g.end, 0.0101, quoi + ' ligne ' + h.date + ' end'); proche(h.pnlUsd, g.pnlUsd, 0.0101, 'pnlUsd'); proche(h.pnlPct, g.pnlPct, 0.011, 'pnlPct'); proche(h.pnlUsd, a2(h.end - h.start), 1e-9, 'ligne cohérente'); });
  assert.deepStrictEqual(Object.keys(a.pairStates), Object.keys(b.pairStates));
  Object.keys(a.pairStates).forEach(p => { const x = a.pairStates[p], y = b.pairStates[p]; assert.deepStrictEqual(J(x.trades), J(y.trades), quoi + ' historique ' + p); assert.strictEqual(x.totalTrades, y.totalTrades, p); assert.strictEqual(x.winTrades, y.winTrades, p); proche(x.totalPnlUsd, y.totalPnlUsd, 1e-9, p + ' totalPnlUsd'); proche(x.totalPnlPct, y.totalPnlPct, 1e-9, p + ' totalPnlPct'); });
  assert.deepStrictEqual(J(a.fees), J(b.fees), quoi + ' frais'); assert.deepStrictEqual(J(a.fiscal), J(b.fiscal), quoi + ' fiscal'); assert.deepStrictEqual(J(a.openPositions), J(b.openPositions), quoi + ' positions'); assert.deepStrictEqual(J(a.ownFundsLog), J(b.ownFundsLog)); assert.deepStrictEqual(J(a.cashLog), J(b.cashLog), quoi + ' journal de caisse');
};

// un faux document, juste ce que le module touche (createElement, appendChild, remove, textContent, onclick)
const dom = () => { const mk = tag => ({ tag, style: {}, children: [], textContent: '', appendChild(e) { this.children.push(e); e.parent = this; return e; }, removeChild(e) { this.children = this.children.filter(x => x !== e); }, remove() { if (this.parent) this.parent.removeChild(this); }, get firstChild() { return this.children[0] || null; }, click() { if (this.onclick) this.onclick(); } });
  const body = mk('body'), crees = []; return { body, crees, createElement: t => { const e = mk(t); crees.push(e); return e; } }; };
// la page d'essai : le module chargé sur l'état vivant d'un monde, un lecteur de fichier simulé, et les trois appels de l'app qu'il fait (sauvegarde, rendu, message)
function page(S, o) {   // o.sauve : ce que rend la sauvegarde simulée (défaut : rien) ; un fichier marqué __attend n'est lu que quand le test appelle lecteurs[n]()
  o = o || {}; const d = dom(), appels = { save: [], render: 0, toast: [] }, lecteurs = [];
  function FileReader() {} FileReader.prototype.readAsText = function (fl) { const go = () => { if (fl.__illisible) { this.onerror(); return; } this.result = fl.__texte; this.onload(); }; if (fl.__attend) lecteurs.push(go); else go(); };
  const extra = { S, document: d, _stateReady: true, FileReader, saveState: f => { appels.save.push(f); return typeof o.sauve === 'function' ? o.sauve() : o.sauve; }, renderAll: () => { appels.render++; }, showToast: m => { appels.toast.push(m); } };
  if (o.sansSauvegarde) delete extra.saveState;
  const w = charger18(extra); w.__timers[0].fn();
  const bandeau = () => d.body.children.find(e => e.id === 'demoReparationBandeau') || null;
  const textes = () => { const t = []; if (bandeau()) (function lire(e) { if (e.textContent) t.push(e.textContent); e.children.forEach(lire); })(bandeau()); return t.join(' | '); };
  const bouton = n => bandeau().children.filter(e => e.tag === 'button')[n];
  const choisir = (fichier, n) => { bouton(n || 0).click(); const inp = d.body.children.find(e => e.tag === 'input'); assert.ok(inp && inp.type === 'file' && inp.accept === '.json,application/json', 'un champ de fichier'); assert.strictEqual(d.body.children.filter(e => e.tag === 'input').length, 1, 'un seul champ de fichier'); inp.files = [fichier]; inp.onchange(); assert.ok(!d.body.children.includes(inp), 'champ de fichier ôté'); };
  return { d, w, appels, bandeau, textes, bouton, choisir, lecteurs, st: w._demoReparationStatus };
}
const enFichier = (etat, brut) => ({ size: 3500000, __texte: JSON.stringify(brut ? etat : { _type: 'aura_guardian_full', v: 3, savedAt: '2026-10-11T13:41:44.373Z', aura: etat }) });
const sieges = X => J(X.S.agents).map(a => { delete a.lmsrWallet; return a; });   // les agents d'un monde, sans leur portefeuille de marché (jamais du ressort de la réparation)
console.log('▶ banc-demo-retire · token ' + TOK);
// ═══════════════ R · le retrait ═══════════════
T('R1 · plus AUCUN texte du Mode Démo ni du Multi-compte dans ce que la page charge (' + scripts.length + ' scripts, ' + csss.length + ' css, le HTML) — commentaires à part ; le témoin du banc n\'est pas chargé', () => {
  const MOTS = ['enterDemoMode', 'exitDemoMode', '_DEMO_PRESETS', 'renderDemoSection', '_demoMode', '_demoActive', '_demoBackup', '_demoSaveWarned', '_regimeOverride', 'demoBanner', 'demoSection', 'demo-preset', 'demoShimmer',
    'switchAccount', 'createAccount', 'renameAccount', 'deleteAccount', '_mcSaveCurrent', '_mcLoadSlots', '_mcSaveSlots', '_mcStripHeavy', '_MC_KEY', '_MC_EMOJIS', '_MC_LIGHT_FIELDS', 'renderMultiCompteSection', 'multiCompteSection', '_mcActiveSlot', 'aura_mc_slots', 'mc-add-btn', 'mc-account', 'mc-chip'];
  assert.ok(scripts.length >= 58 && csss.length >= 29);
  scripts.forEach(f => { const c = codeStrict(rd(f)); MOTS.forEach(m => assert.ok(!c.includes(m), f + ' : reste « ' + m + ' »')); });
  csss.forEach(f => { const c = rd(f).replace(/\/\*[\s\S]*?\*\//g, ''); MOTS.concat(['.mc-', '.demo-', '#demoBanner']).forEach(m => assert.ok(!c.includes(m), f + ' : reste « ' + m + ' »')); });
  MOTS.forEach(m => assert.ok(!html.includes(m), 'HTML : reste « ' + m + ' »'));
  assert.ok(!scripts.some(f => f.includes('banc-fixtures')) && TEMOIN.includes('function enterDemoMode(presetKey) {') && TEMOIN.includes('crise: {'), 'le témoin garde le texte, hors de la page');
});
T('R2 · panneau Outils (07 _OUTILS_TABS RÉEL) : l\'onglet UI n\'a plus ni « Mode Démo » ni « Multi-compte » (16 sections) ; dans TOUS les onglets, chaque section appelle un rendu qui existe dans un script chargé', () => {
  const tabs = vm.runInNewContext('(' + between(s07, 'const _OUTILS_TABS = ', '\n};', false).replace('const _OUTILS_TABS = ', '') + '\n})');
  const ui = J(tabs.ui.sections.map(s => s.id));
  assert.deepStrictEqual(ui, ['nightModeSection', 'zenSection', 'badgesSection', 'avatarSection', 'cinemaSection', 'vacancesSection', 'compactWidgetSection', 'soundSection', 'citationSection', 'dashPublicSection', 'fundManagerSection', 'widgetSection', 'pipSection', 'aodSection', 'gsSection', 'apiSection']);
  const tout = scripts.map(f => rd(f)).join('\n'); let n = 0;
  const existe = f => new RegExp('(^|\\n)\\s*(async )?function ' + f + '\\s*\\(').test(tout) || tout.includes('window.' + f + ' = ');
  const absents = [];
  Object.keys(tabs).forEach(k => tabs[k].sections.forEach(s => { n++; [s.render, s.init].forEach(f => { if (f && !existe(f)) absents.push(k + ' · ' + s.id + ' → ' + f); }); assert.ok(s.render || s.init, 'section sans rendu ni init : ' + s.id); }));
  assert.deepStrictEqual(absents, [], 'section(s) du panneau Outils qui appellent une fonction absente : ' + absents.join(' ; '));
  assert.ok(n >= 60, n + ' sections');
});
T('R3 · detectMarketRegime RÉEL (02) : plus de régime forcé — S._regimeOverride posé ne change rien ; la fonction ne lit plus que le marché', () => {
  const src = fnSrc(s02, 'detectMarketRegime'); assert.ok(!codeStrict(src).includes('_regimeOverride'));
  const mk = v => ({ price: 100, pnl24h: v, candles: Array.from({ length: 20 }, (_, i) => ({ o: 100, h: 100, l: 100, c: 100 * (1 + 0.0001 * (i % 3)), v: 1 })) });
  const S = { pairStates: { A: mk(0.2), B: mk(0.3) } }, c = { S, Math, Object, Number, isFinite, isNaN, _livePairStates: () => Object.values(S.pairStates) }; vm.createContext(c); vm.runInContext(src, c);
  const r0 = vm.runInContext('detectMarketRegime()', c); assert.strictEqual(r0, 'calm');
  ['bear', 'bull', 'volatile'].forEach(f => { S._regimeOverride = f; assert.strictEqual(vm.runInContext('detectMarketRegime()', c), 'calm', 'forcé « ' + f + ' » : ignoré'); });
  delete S._regimeOverride; S.pairStates.A.pnl24h = -9; S.pairStates.B.pnl24h = -9; assert.strictEqual(vm.runInContext('detectMarketRegime()', c), 'bear', 'le marché, lui, se lit toujours');
});
T('R4 · sauvegarde (09b2) : saveState n\'a plus de garde de démo à contourner, _flushSyncOnExit non plus (plus rien à suspendre) ; _LIGHT_KEYS sans « _mcActiveSlot » ; 09b1 n\'écrit ni l\'un ni l\'autre', () => {
  const sv = codeStrict(fnSrc(s9b2, 'saveState')), fl = codeStrict(fnSrc(s9b2, '_flushSyncOnExit'));
  [sv, fl, codeStrict(s9b1)].forEach(c => ['_demoMode', 'Démo', 'démo', '_mcActiveSlot'].forEach(m => assert.ok(!c.includes(m), 'reste « ' + m + ' »')));
  assert.ok(sv.includes("if (typeof window !== 'undefined' && window._stateReady === false) {") && sv.includes('snap = buildSnapshot();') && fl.includes('const snap = buildSnapshot();'));
  const lk = between(s9b2, 'const _LIGHT_KEYS = [', '];', true); assert.ok(lk.includes("'tradingMode','botAutoMode',") && !codeStrict(lk).includes('_mc'));
  assert.strictEqual((lk.match(/\]/g) || []).length, 1, 'aucun crochet DANS la liste, même en commentaire : banc-p0b-newskey la lit jusqu\'au premier « ] » (revue du 13/10)');
});
// ═══════════════ D · la réparation ═══════════════
T('D1 · faux trade : les neuf des trois cartes sont reconnus tels que le témoin les écrit ; un VRAI trade (prix, mise) au même gain ne l\'est pas ; ni une autre heure dite, ni une ouverture', () => {
  const c = { Date: { now: () => T0 } }; vm.createContext(c); const P = vm.runInContext(between(TEMOIN, 'const _DEMO_PRESETS = {', '\n};', true) + '\n_DEMO_PRESETS;', c);
  let n = 0; Object.keys(P).forEach(k => { assert.strictEqual(R.CARTES[k].portfolio, P[k].portfolio); assert.strictEqual(R.CARTES[k].tradingAccount, P[k].tradingAccount); assert.strictEqual(R.CARTES[k].cashAccount, P[k].cashAccount); assert.strictEqual(R.CARTES[k].fit, P[k].agentFitness);
    P[k].trades.forEach((t, i) => { const f = R.faux(J(t)); n++; assert.ok(f && f.carte === k && f.i === i && f.pnlUsdt === t.pnlUsdt, k + ' ' + i); assert.strictEqual(t.ts + f.age, T0, 'âge du faux trade → heure du lancement'); }); });
  assert.strictEqual(n, 9); assert.deepStrictEqual(Object.keys(R.CARTES), Object.keys(P).slice());
  const t = J(P.crise.trades[0]);
  assert.strictEqual(R.faux(Object.assign({}, t, { price: 83000 })), null); assert.strictEqual(R.faux(Object.assign({}, t, { stakeUsdt: 50 })), null); assert.strictEqual(R.faux(Object.assign({}, t, { time: '18:33:17' })), null);
  assert.strictEqual(R.faux(Object.assign({}, t, { type: 'open' })), null); assert.strictEqual(R.faux(Object.assign({}, t, { pnlUsdt: -28.41 })), null); assert.strictEqual(R.faux(null), null); assert.strictEqual(R.faux(vrai('BTC/USDT', 1, -28.4, T0)[1]), null);
  [{ pair: 'ETH/USDT' }, { side: 'sell' }, { pnl: -0.58 }, { entryPrice: 84000 }, { amount: '0.001' }].forEach(d => assert.strictEqual(R.faux(Object.assign({}, t, d)), null, 'pas un faux trade : ' + JSON.stringify(d))); assert.ok(R.faux(Object.assign({}, t, { ts: 5, note: 'x' })), 'un champ de plus, hors prix / mise / quantité : toujours le faux trade');
});
T('D2 · l\'ACCIDENT REFAIT (vrai texte du Mode Démo, carte « Crise ») : le compte EV devient 880,20 / 875,00 / 5,20, 47 trades, un faux trade par paire, fitness au hasard ; AA et RE intacts ; après la relance (VRAI recalage de 09b2) le cumul a pris l\'écart comme une perte', () => {
  H = T0; let X = monde(depart()); const F = X.plain(); H += 5850000; accident(X, 'crise', 7);
  const w = X.S.walletStore.paperReal; assert.strictEqual(w.portfolio, 880.20); assert.strictEqual(w.tradingAccount, 875); assert.strictEqual(w.cashAccount, 5.20); assert.strictEqual(w.totalTrades, 47); assert.strictEqual(w.winTrades, 21);
  PAIRES.forEach(p => { assert.strictEqual(w.pairStates[p].trades.length, 1); assert.strictEqual(w.pairStates[p].totalTrades, 1); assert.ok(R.faux(w.pairStates[p].trades[0])); });
  assert.strictEqual(X.S._demoMode, 'crise'); assert.strictEqual(X.S._regimeOverride, 'bear'); X.S.agents.forEach(a => assert.ok(a.fitness !== Math.round(a.fitness) && a.fitness >= 220 && a.fitness <= 420, a.id + ' ' + a.fitness));
  assert.deepStrictEqual(J(X.S.walletStore.sim), F.walletStore.sim); assert.deepStrictEqual(J(X.S.walletStore.real), F.walletStore.real);
  const tr = R.trace(w); assert.strictEqual(tr.n, 5); assert.deepStrictEqual(J(tr.cartes), ['crise']); assert.strictEqual(tr.lance, T0 + 5850000, 'heure du lancement lue sur les faux trades');
  X = relancer(X); const w2 = X.S.walletStore.paperReal;
  assert.strictEqual(X.S._demoMode, undefined); assert.strictEqual(w2._startPortfolio, 880.20); proche(w2._totalCompounded, F.walletStore.paperReal._totalCompounded + (880.20 - F.walletStore.paperReal._startPortfolio), 1e-9, 'cumul'); assert.strictEqual(w2.bunker.capRef, 875); assert.strictEqual(w2.pnlPeriod.todayStartPortfolio, 880.20);
});
T('D3 · LA RÉPARATION REND LE COMPTE : accident + relance + 3 trades + jour et semaine qui tournent + 2e relance, puis réparation avec le backup d\'avant → le portefeuille EV égale, champ par champ, celui du monde TÉMOIN qui a vécu la même suite sans accident (argent, repères, cumul, courbe, bunker, levier, historique et compteurs des 5 paires, frais, fiscal) ; AA, RE et le reste de l\'état intacts', () => {
  const A = vie(true), B = vie(false);
  const avant = A.X.plain(), pl = R.plan(A.X.S, A.F, 'paperReal');
  assert.ok(pl.ok, pl.msg); assert.deepStrictEqual(A.X.plain(), avant, 'le plan ne modifie RIEN');
  assert.strictEqual(pl.carte, 'crise'); assert.strictEqual(pl.fermeturesDepuis, 3); assert.strictEqual(pl.pairesRendues, 5); assert.strictEqual(pl.relance, true);
  proche(pl.ecart.portfolio, 1085.458338903288 - 880.20, 1e-9); proche(pl.ecart.tradingAccount, 1078.880967867839 - 875, 1e-9); proche(pl.ecart.cashAccount, 6.577371035449079 - 5.20, 1e-9);
  proche(pl.avant.portfolio, 880.20 + 0.4 - 0.26 - 1.1 - 0.24 + 2.2 - 0.31, 1e-9, 'compte fictif + la vie'); proche(pl.apres.portfolio, 1085.458338903288 + 0.4 - 0.26 - 1.1 - 0.24 + 2.2 - 0.31, 1e-9, 'vrai compte + la vie');
  const r = R.appliquer(A.X.S, A.F, 'paperReal'); assert.ok(r.ok && r.applique);
  comparer(A.X.S.walletStore.paperReal, B.X.S.walletStore.paperReal, 'EV');
  const wa = A.X.S.walletStore.paperReal; assert.strictEqual(wa.totalTrades, 8 + 3); assert.strictEqual(wa.totalTrades, wa.fees.tradeCount, 'compteur de trades = compteur des frais, comme avant l\'accident'); assert.strictEqual(R.trace(wa).n, 0);
  assert.strictEqual(wa.pnlPeriod.weekStart, '2026-W43'); proche(wa.pnlPeriod.weekStartPortfolio, B.X.S.walletStore.paperReal.pnlPeriod.weekStartPortfolio, 1e-9, 'repère de semaine posé APRÈS l\'accident : remonté'); proche(wa.pnlPeriod.monthStartPortfolio, 1089.0029534649968, 0, 'repère du mois posé AVANT : pas touché');
  assert.deepStrictEqual(J(A.X.S.walletStore.sim), J(B.X.S.walletStore.sim)); assert.deepStrictEqual(J(A.X.S.walletStore.real), J(B.X.S.walletStore.real));
  assert.deepStrictEqual(sieges(A.X), sieges(B.X), 'agents : ceux qui portaient encore la valeur de la carte (ou le 350 de la relance) retrouvent la leur, celui qui a été jugé depuis avec preuve garde la sienne');
  assert.deepStrictEqual(J(r.agents).map(x => x.id).sort(), ['exec_bot_v1', 'rescue_bot_v1', 'risk_bot_v1', 'scalper_v2', 'trend_v2']); assert.strictEqual(r.agents.find(x => x.id === 'trend_v2').de, 350, 'tiré sous 350 puis reposé à 350 par la relance (09b2) : rendu à sa fitness de naissance');
  proche(wa.cashAccount, 6.577371035449079 + 0.03 + 0.05, 1e-9, 'caisse : celle du backup + les parts de gain versées depuis'); assert.strictEqual(wa.cashLog.length, 4); { const fh = A.F.walletStore.paperReal.pnlHistory, m = fh.indexOf(wa.pnlHistory[0]); assert.strictEqual(wa.pnlHistory.length, 80); assert.strictEqual(m, 5, 'la courbe a glissé de 5 points depuis le backup'); assert.deepStrictEqual(J(wa.pnlHistory.slice(0, 80 - m)), fh.slice(m), 'courbe : les points encore communs avec le backup ne sont pas touchés'); } assert.strictEqual(A.X.S.tradingMode, 'paperReal'); assert.strictEqual(A.X.S.cycle, avant.cycle);
  assert.strictEqual(R.plan(A.X.S, A.F, 'paperReal').code, 'sain', 'une seconde réparation n\'a plus rien à faire');
});
T('D4 · mêmes preuves : une position encore OUVERTE au moment de réparer (sa mise reste engagée) ; la semaine qui ne tourne pas (repère d\'avant gardé) ; les deux autres cartes (« Débutant », « Trader Pro ») ; trois hasards ; le jour de l\'accident fini SANS relance (sa ligne part d\'un repère d\'avant) ; l\'écran sur AA pendant qu\'on répare l\'EV ; le jour qui tourne, ou une relance, ENTRE le backup et l\'accident ; un vrai compte à 1,25 $, puis à 0,4 centime, du compte fictif de la carte ; le mois qui tourne ; une paire née après l\'accident ; des sièges jugés depuis sans preuve', () => {
  [{ ouverte: true }, { semaineNeuve: false }, { carte: 'debutant', graine: 11 }, { carte: 'pro', graine: 12, ouverte: true }, { graine: 99 }, { graine: 12345, semaineNeuve: false, ouverte: true },
    { sansRelance1: true }, { sansRelance1: true, semaineNeuve: false, carte: 'pro', graine: 4, ouverte: true }, { ecranAA: true }, { ecranAA: true, carte: 'debutant', ouverte: true, sansRelance1: true },
    { jourAvant: true }, { jourAvant: true, sansRelance1: true, carte: 'pro', graine: 31 }, { relanceAvant: true }, { relanceAvant: true, sansRelance1: true, semaineNeuve: false }, { relanceAvant: true, jourAvant: true, sansRelance1: true, ouverte: true, carte: 'debutant', graine: 8 },
    { carte: 'debutant', graine: 5, compteProche: 1 }, { carte: 'debutant', graine: 6, compteProche: 1, sansRelance1: true, ouverte: true, semaineNeuve: false }, { carte: 'debutant', graine: 9, compteProche: 2, ouverte: true },
    { moisNeuf: true }, { moisNeuf: true, sansRelance1: true, carte: 'pro', graine: 44 }, { paireNee: true }, { paireNee: true, ouverte: true, sansRelance1: true, graine: 77 }, { jugeSansPreuve: true }, { jugeSansPreuve: true, graine: 3, relanceAvant: true },
    { jugeSansPreuve: true, carte: 'debutant', graine: 2 }].forEach((o, i) => {
    const A = vie(true, o), B = vie(false, o); if (o.ecranAA) { A.X.S.tradingMode = 'sim'; B.X.S.tradingMode = 'sim'; }   // l'écran montre AA : l'EV se répare quand même, AA n'est pas touché
    const simAvant = J(A.X.S.walletStore.sim), r = R.appliquer(A.X.S, A.F, 'paperReal'); assert.ok(r.ok, 'cas ' + i + ' : ' + r.msg); assert.strictEqual(r.carte, o.carte || 'crise'); assert.deepStrictEqual(J(A.X.S.walletStore.sim), simAvant, 'cas ' + i + ' : AA intact');
    if (o.compteProche) proche(r.ecart.portfolio, o.compteProche === 2 ? 0.004 : 1.25, 1e-9, 'vrai compte tout près du compte fictif');
    if (o.moisNeuf) { assert.strictEqual(A.X.S.walletStore.paperReal.pnlPeriod.monthStart, '2026-11'); assert.notStrictEqual(A.X.S.walletStore.paperReal.pnlPeriod.monthStartPortfolio, 1089.0029534649968, 'repère du mois posé APRÈS l\'accident : remonté'); }
    if (o.paireNee) { const ada = A.X.S.walletStore.paperReal.pairStates['ADA/USDT']; assert.strictEqual(ada.totalTrades, 1); assert.strictEqual(ada.trades.length, 2); assert.strictEqual(r.fermeturesDepuis, 4, 'la fermeture de la paire née après l\'accident est comptée'); assert.strictEqual(r.pairesRendues, 5); }
    if (o.jugeSansPreuve) assert.ok(r.agents.some(x => x.id === 'exec_bot_v1') && r.agents.some(x => x.id === 'trend_v2'), 'jugés depuis sans preuve : rendus quand même');
    if (o.jourAvant) { const l0 = A.X.S.walletStore.paperReal.pnlPeriod.history.find(h => h.date === '2026-10-11'); assert.deepStrictEqual(J(l0), { date: '2026-10-11', start: 1082.96, end: 1085.46, pnlUsd: 2.5, pnlPct: 0.23 }, 'cas ' + i + ' : ligne écrite entre le backup et l\'accident — toute d\'avant, pas touchée'); }
    if (o.sansRelance1 && !o.jourAvant && !o.relanceAvant && !o.compteProche && !o.paireNee) { const l = A.X.S.walletStore.paperReal.pnlPeriod.history.find(h => h.date === '2026-10-11'); assert.strictEqual(l.start, 1082.96, 'jour de l\'accident fini sans relance : sa ligne part du repère du jour d\'AVANT (1 085,46 − 2,50), pas touché'); proche(l.pnlUsd, a2(l.end - l.start), 1e-9, 'gain de la ligne recalculé'); proche(l.pnlUsd, 2.5 + 0.4 - 0.26 - 1.1 - 0.24, 0.0101, 'gain du jour = 2,50 d\'avant le backup + les deux trades du jour'); }
    comparer(A.X.S.walletStore.paperReal, B.X.S.walletStore.paperReal, 'cas ' + i); assert.deepStrictEqual(sieges(A.X), sieges(B.X), 'cas ' + i + ' agents');
    if (o.ouverte) { assert.strictEqual(A.X.S.walletStore.paperReal.openPositions.length, 1); proche(A.X.S.walletStore.paperReal.portfolio, A.X.S.walletStore.paperReal.cashAccount + A.X.S.walletStore.paperReal.tradingAccount + 124, 1e-9, 'mise engagée comptée'); }
    if (o.semaineNeuve === false) assert.strictEqual(A.X.S.walletStore.paperReal.pnlPeriod.weekStartPortfolio, A.F.walletStore.paperReal.pnlPeriod.weekStartPortfolio, 'repère de semaine d\'avant : identique, pas touché');
  });
});
T('D5 · sans relance depuis l\'accident (jamais le cas sur la tablette, le code de la démo n\'y est plus) : départ de session et cumul n\'avaient pas bougé — la réparation ne les touche pas ; l\'accident arrivé en AA se répare en AA, l\'EV intact', () => {
  H = T0; let X = monde(depart()); const F = X.plain(); H += 5850000; accident(X, 'crise', 3);
  const r = R.appliquer(X.S, F, 'paperReal'); assert.ok(r.ok, r.msg); assert.strictEqual(r.relance, false); comparer(X.S.walletStore.paperReal, F.walletStore.paperReal, 'réparé tout de suite : le portefeuille redevient celui du backup');
  assert.strictEqual(X.S.walletStore.paperReal._startPortfolio, F.walletStore.paperReal._startPortfolio); assert.strictEqual(X.S.walletStore.paperReal._totalCompounded, F.walletStore.paperReal._totalCompounded);   // (le « pnl24h » du compte, récrit par 08 à chaque battement, n'est pas un repère : pas comparé)
  H = T0; const d = depart(); d.tradingMode = 'sim'; X = monde(d); const F2 = X.plain(); H += 5850000; accident(X, 'pro', 5); X = relancer(X);
  assert.strictEqual(R.plan(X.S, F2, 'paperReal').code, 'sain'); const r2 = R.appliquer(X.S, F2, 'sim'); assert.ok(r2.ok, r2.msg); assert.strictEqual(r2.carte, 'pro');
  const Y = relancer(monde(J(F2))); comparer(X.S.walletStore.sim, Y.S.walletStore.sim, 'AA'); assert.deepStrictEqual(J(X.S.walletStore.paperReal), J(Y.S.walletStore.paperReal));
  // une relance ENTRE le backup et l'accident, aucune depuis : ce qu'elle a reposé (départ de session et du jour = portefeuille du backup, référence du bunker = trading du backup) est d'AVANT — pas touché
  H = T0; X = monde(depart()); const F3 = X.plain(); H += 1000000; X = relancer(X); const T3 = X.plain(); H += 4850000; accident(X, 'debutant', 21);
  assert.strictEqual(T3.walletStore.paperReal.bunker.capRef, F3.walletStore.paperReal.tradingAccount); assert.notStrictEqual(T3.walletStore.paperReal.bunker.capRef, F3.walletStore.paperReal.bunker.capRef);
  const r3 = R.appliquer(X.S, F3, 'paperReal'); assert.ok(r3.ok, r3.msg); assert.strictEqual(r3.relance, false); comparer(X.S.walletStore.paperReal, T3.walletStore.paperReal, 'relance avant l\'accident');
});
T('D6 · REFUS, sans rien écrire : backup d\'APRÈS l\'accident ; backup trop ancien (une fermeture de plus entre lui et l\'accident : « il manque 1 trade ») ; compte sain ; fichier qui n\'est pas un backup ; backup plus récent que l\'app ; positions ouvertes dans le backup ; apport depuis le backup ; dépôt fiscal qui a bougé ; faux trade disparu d\'une paire ; deux cartes mêlées ; compteur des frais absent ; portefeuille inconnu ; transfert caisse ↔ trading depuis le backup ; levier en service ; position ouverte à l\'instant de l\'accident (fermée depuis, ou encore en cours) ; compteurs faux, deux faux trades ; backup incomplet ; compte rendu négatif ; fermeture d\'urgence depuis le backup ; état de l\'app absent', () => {
  const cas = (nom, code, prep) => { const A = vie(true); let F = A.F; const o = prep ? prep(A, F) : null; if (o && 'F' in o) F = o.F; const mode = (o && o.mode) || 'paperReal'; const av = A.X.plain();
    const r = R.appliquer(A.X.S, F, mode); assert.strictEqual(r.ok, false, nom + ' : devait être refusé'); assert.strictEqual(r.code, code, nom + ' → ' + r.code + ' · ' + r.msg); assert.ok(typeof r.msg === 'string' && r.msg.length > 15); assert.deepStrictEqual(A.X.plain(), av, nom + ' : rien n\'est écrit'); return r; };
  cas('backup d\'après', 'fichier-faux', A => ({ F: A.X.plain() }));
  cas('backup pris juste après l\'accident (47 trades affichés, 5 dans les paires : il est aussi « incomplet », mais c\'est « d\'après » qu\'il faut dire)', 'fichier-faux', () => { const h0 = H; H = T0; const X = monde(depart()); H += 5850000; accident(X, 'crise', 7); const G = X.plain(); H = h0; assert.strictEqual(G.walletStore.paperReal.totalTrades, 47); return { F: G }; });
  const r = cas('trop ancien', 'pas-le-dernier', (A, F) => { const G = J(F), w = G.walletStore.paperReal; w.fees.tradeCount -= 1; w.pairStates['BTC/USDT'].totalTrades -= 1; w.totalTrades -= 1; return { F: G }; }); assert.strictEqual(r.manque, 1); assert.ok(/il manque 1 trade /.test(r.msg), r.msg);
  cas('pas ce compte', 'pas-le-dernier', (A, F) => { const G = J(F); G.walletStore.paperReal.fees.tradeCount += 2; return { F: G }; });
  { const B = vie(false), av = B.X.plain(), r0 = R.appliquer(B.X.S, B.F, 'paperReal'); assert.strictEqual(r0.code, 'sain'); assert.deepStrictEqual(B.X.plain(), av); }
  cas('pas un backup', 'fichier', () => ({ F: { savedAt: 'x', rec: [] } })); cas('pas un backup (tableau)', 'fichier', () => ({ F: [] })); cas('fichier nul', 'fichier', () => ({ F: null }));
  cas('plus récent que l\'app', 'futur', (A, F) => { const G = J(F); G.cycle = A.X.S.cycle + 1; return { F: G }; });
  cas('positions dans le backup', 'positions-avant', (A, F) => { const G = J(F); G.walletStore.paperReal.openPositions = [{ id: 'x', stakeUsdt: 10 }]; return { F: G }; });
  cas('apport depuis', 'apports', A => { A.X.S.walletStore.paperReal.ownFundsInjected += 100; });
  cas('apport depuis (journal)', 'apports', A => { A.X.S.walletStore.paperReal.ownFundsLog.unshift({ amount: 0, ts: 9 }); });
  cas('dépôt fiscal', 'fiscal', A => { A.X.S.walletStore.paperReal.fiscalReserveAccount = 1.5; });
  cas('empreinte partielle', 'empreinte-partielle', A => { const ps = A.X.S.walletStore.paperReal.pairStates['XRP/USDT']; ps.trades = ps.trades.filter(t => !R.faux(t)); });
  cas('deux cartes', 'empreinte', A => { A.X.S.walletStore.paperReal.pairStates['GBP/USDT'].trades[0] = { pair: 'BTC/USDT', side: 'buy', pnlUsdt: 4.20, pnl: 0.84, ts: 1, time: 'Il y a 2h', type: 'position' }; });
  cas('compteur des frais absent', 'frais', (A, F) => { const G = J(F); delete G.walletStore.paperReal.fees.tradeCount; return { F: G }; });
  cas('compte illisible', 'chiffres', (A, F) => { const G = J(F); G.walletStore.paperReal.tradingAccount = null; return { F: G }; });
  cas('backup incohérent', 'backup-incoherent', (A, F) => { const G = J(F); G.walletStore.paperReal.portfolio += 5; return { F: G }; });
  cas('portefeuille inconnu', 'mode', () => ({ mode: 'demo' })); cas('AA sain', 'sain', () => ({ mode: 'sim' }));
  cas('transfert depuis le backup', 'caisse', A => { A.X.S.walletStore.paperReal.cashLog.unshift({ amount: -5, source: 'transfer_out', ts: H, time: '12:00:00' }); });
  cas('journal de caisse plein', 'caisse', A => { const L = A.X.S.walletStore.paperReal.cashLog; for (let i = 0; i < 200; i++) L.unshift({ amount: 0, source: 'profit_split', ts: H + i, time: '12:00:00' }); L.length = 200; });
  cas('levier en service', 'levier', A => { A.X.S.walletStore.paperReal.leverage = 2; }); cas('emprunt en cours', 'levier', A => { A.X.S.walletStore.paperReal.leverageBorrowed = 12.5; });
  cas('emprunt dans le backup', 'levier', (A, F) => { const G = J(F); G.walletStore.paperReal.leverageBorrowed = 10; return { F: G }; }); cas('levier dans le backup', 'levier', (A, F) => { const G = J(F); G.walletStore.paperReal.leverage = 1; return { F: G }; });
  cas('apport de 0,50 $', 'apports', A => { A.X.S.walletStore.paperReal.ownFundsInjected += 0.5; }); cas('dépôt fiscal de 0,50 $', 'fiscal', A => { A.X.S.walletStore.paperReal.fiscalReserveAccount = 0.5; });
  cas('backup incohérent de 1 $', 'backup-incoherent', (A, F) => { const G = J(F); G.walletStore.paperReal.portfolio += 1; return { F: G }; });
  cas('trading négatif dans le backup', 'chiffres', (A, F) => { const G = J(F); G.walletStore.paperReal.tradingAccount = -500; G.walletStore.paperReal.portfolio = G.walletStore.paperReal.cashAccount - 500; return { F: G }; });
  cas('compteurs d\'une paire faux (plus de gagnants que de trades)', 'compteurs', A => { A.X.S.walletStore.paperReal.pairStates['GBP/USDT'].winTrades = 5; });
  cas('compteur d\'une paire à zéro malgré son faux trade', 'compteurs', A => { A.X.S.walletStore.paperReal.pairStates['GBP/USDT'].totalTrades = 0; });
  cas('deux faux trades dans une paire', 'empreinte', A => { const t = A.X.S.walletStore.paperReal.pairStates['GBP/USDT'].trades; t.push(J(t.find(x => R.faux(x)))); });
  // le backup n'est pas complet : il rendrait un compte amputé sans le dire
  const partiel = (nom, f) => cas(nom, 'fichier-partiel', (A, F) => { const G = J(F); f(G.walletStore.paperReal, G); return { F: G }; });
  partiel('historique d\'une paire absent', w => { delete w.pairStates['BTC/USDT'].trades; }); partiel('une ligne d\'historique qui n\'est pas un objet', w => { w.pairStates['BTC/USDT'].trades = ['x']; });
  partiel('compteur en texte', w => { w.pairStates['BTC/USDT'].totalTrades = '3'; }); partiel('compteurs des paires ≠ total', w => { w.pairStates['BTC/USDT'].totalTrades += 1; });
  partiel('gagnants des paires ≠ total', w => { w.winTrades += 1; }); partiel('compteur non entier (le total suit)', w => { w.pairStates['BTC/USDT'].totalTrades += 0.5; w.totalTrades += 0.5; }); partiel('compteur négatif (le total suit)', w => { w.pairStates['SOL/USDT'].totalTrades = -1; w.totalTrades -= 1; }); partiel('paires vidées', w => { w.pairStates = {}; }); partiel('agents absents', (w, G) => { delete G.agents; }); partiel('agents vides', (w, G) => { G.agents = []; }); partiel('un agent à la fitness illisible', (w, G) => { G.agents[3].fitness = '231'; }); partiel('un agent sans identité', (w, G) => { delete G.agents[2].id; }); partiel('repères absents', w => { delete w.pnlPeriod; });
  partiel('gain cumulé d\'une paire illisible', w => { w.pairStates['ETH/USDT'].totalPnlUsd = null; });
  // le compte rendu serait négatif (carte « Trader Pro » : 8 400 $ fictifs, dont il ne reste que 5 000)
  { const A = vie(true, { carte: 'pro', graine: 12 }); A.X.S.walletStore.paperReal.tradingAccount = 5000; const av = A.X.plain(), r0 = R.appliquer(A.X.S, A.F, 'paperReal'); assert.strictEqual(r0.code, 'resultat', r0.code + ' · ' + r0.msg); assert.deepStrictEqual(A.X.plain(), av); }
  cas('backup à 1e308 $ : la réserve de levier rendue ne serait pas un nombre fini', 'resultat', (A, F) => { const G = J(F), w = G.walletStore.paperReal; w.tradingAccount = 1e308; w.cashAccount = 0; w.portfolio = 1e308; return { F: G }; });
  // fermeture d'urgence « tout fermer » (06) depuis le backup : sa ligne au journal durable est la seule trace
  const ctxK = {}; vm.createContext(ctxK); vm.runInContext(between(s02, 'const EVENT_KINDS = [', '\n];', true) + '\n' + fnSrc(s02, '_eventKind') + '\nthis._eventKind = _eventKind;', ctxK);
  assert.ok(s06.includes('desc:`URGENCE: ${pos.pair} ${pos.side} fermé manuellement') && between(s02, 'const EVENT_MODE_KINDS = {', '};', true).includes('fermeture: 1'), 'la ligne d\'urgence de 06, gardée au journal durable avec son mode');
  assert.strictEqual(ctxK._eventKind({ desc: 'URGENCE: ETH/USDT long fermé manuellement · +$1.10' }), 'fermeture');
  const urg = (t, m) => ({ t, k: 'fermeture', i: '🚨', d: 'URGENCE: ETH/USDT long fermé manuellement · +$1.10', m });
  cas('fermeture d\'urgence depuis le backup', 'urgence', A => { A.X.S.eventLog.push(urg(H, 'paperReal')); }); cas('fermeture d\'urgence, mode non dit', 'urgence', A => { A.X.S.eventLog.push(urg(H, undefined)); });
  cas('fermeture d\'urgence, backup sans heure', 'urgence', (A, F) => { A.X.S.eventLog.push(urg(T0 - 99999999, 'paperReal')); const G = J(F); delete G.savedAt; return { F: G }; });
  { const A = vie(true), B = vie(false); [A, B].forEach(V => { V.X.S.eventLog.push(urg(T0 - 5000, 'paperReal'), urg(H, 'sim'), { t: H, k: 'fermeture', d: 'Fermé ETH/USDT · urgence passée', m: 'paperReal' }); });   // une urgence d'AVANT le backup, une d'un AUTRE mode, une ligne qui n'en est pas une : acceptées
    const r1 = R.appliquer(A.X.S, A.F, 'paperReal'); assert.ok(r1.ok, r1.msg); comparer(A.X.S.walletStore.paperReal, B.X.S.walletStore.paperReal, 'urgences sans rapport'); }
  // la VRAIE fermeture d'urgence (06 urgenceCloseAll) et le VRAI relais du journal (02) : les deux cas trouvés par la revue du 13/10 — une position ouverte après le backup et fermée
  // en urgence AVANT l'accident (écart : son résultat) ; une position ouverte à l'accident et fermée en urgence APRÈS (écart : toute sa mise). Ni ligne d'historique, ni frais : le journal seul le dit.
  ['avant', 'apres'].forEach(quand => {
    H = T0; let X = monde(depart()); const F = X.plain(); F.savedAt = new Date(H).toISOString(); H += 600000; ouvrir(X, 'ETH/USDT', 60); X.S.pairStates['ETH/USDT'].price = 158.4;   // mise 110 $, entrée 160 → −1 %
    if (quand === 'avant') X.run('urgenceCloseAll()'); H = T0 + 5850000; accident(X, 'crise', 7); X = relancer(X); if (quand === 'apres') { H += 60000; X.run('urgenceCloseAll()'); }
    H += 3600000; trade(X, 'BTC/USDT', 71, 0.4, 0.26, false, 0.03); X = relancer(X);
    const l = X.S.eventLog.filter(e => /^URGENCE: ETH\/USDT long fermé manuellement · \$-1\.10$/.test(e.d)); assert.strictEqual(l.length, 1, 'la ligne d\'urgence est au journal durable : ' + JSON.stringify(X.S.eventLog)); assert.strictEqual(l[0].k, 'fermeture'); assert.strictEqual(l[0].m, 'paperReal'); assert.ok(l[0].t > Date.parse(F.savedAt));
    assert.strictEqual(X.S.walletStore.paperReal.openPositions.length, 0); assert.strictEqual(X.S.walletStore.paperReal.pairStates['ETH/USDT'].trades.filter(t => t.type === 'position' && !R.faux(t)).length, 0, 'aucune ligne de fermeture dans l\'historique');
    const av = X.plain(), r0 = R.appliquer(X.S, F, 'paperReal'); assert.strictEqual(r0.code, 'urgence', 'urgence ' + quand + ' l\'accident → ' + r0.code + ' · ' + r0.msg); assert.deepStrictEqual(X.plain(), av);
  });
  // l'état de l'app absent ou sans portefeuilles : refus, pas d'exception
  assert.strictEqual(R.plan(null, vie(true).F, 'paperReal').code, 'etat'); assert.strictEqual(R.plan({ walletStore: {} }, vie(true).F, 'paperReal').code, 'etat'); assert.strictEqual(R.appliquer(undefined, null, 'paperReal').code, 'etat');
  // une position ouverte ENTRE le backup et l'accident : sa mise était déjà sortie du vrai compte quand la carte a écrit le sien, et la carte a effacé son ouverture de l'historique.
  // Fermée depuis (le compteur des frais tombe juste : 1 fermeture) ou encore en cours : l'écart n'est plus celui du backup → refus, rien n'est écrit.
  [true, false].forEach(fermee => {
    H = T0; let X = monde(depart()); const F = X.plain(); H += 600000; ouvrir(X, 'ETH/USDT', 60); H += 5250000; accident(X, 'crise', 7); X = relancer(X); H += 60000; if (fermee) fermer(X, 'ETH/USDT', 60, 1.5, 0.2);
    const av = X.plain(), r0 = R.appliquer(X.S, F, 'paperReal'); assert.strictEqual(r0.ok, false); assert.strictEqual(r0.code, 'position-accident', (fermee ? 'fermée depuis' : 'encore ouverte') + ' → ' + r0.code + ' · ' + r0.msg); assert.ok(r0.msg.includes('ETH/USDT')); assert.deepStrictEqual(X.plain(), av);
  });
});
T('D7 · agents (VRAI _fitJudge de 03, VRAIE règle de relance de 09b2) : un siège reprend sa fitness du backup s\'il est le MÊME qu\'au backup, porte encore la valeur de la carte (ou le 350 de la relance) et n\'a pas été réécrit — pas jugé depuis, ou jugé SANS preuve ; né depuis, remplacé par un nouveau-né, jugé avec preuve, valeur entière ou hors bande : pas touchés ; preuve inconnue : seuls les sièges non jugés', () => {
  const A = vie(true), S = A.X.S, ag = id => S.agents.find(a => a.id === id);
  S.agents.push({ id: 'ne_apres', name: 'Hybrid Gen-95600', _bornCycle: 1266400, fitness: 333.3, _judgments: [] });                 // absent du backup
  assert.strictEqual(ag('trend_v2').fitness, 350); Object.assign(ag('trend_v2'), { name: 'Hybrid Gen-95700', _bornCycle: 1266481, _judgments: [], fitness: 350 });   // siège remplacé par un nouveau-né (07) : 350 est SA fitness de naissance, pas le 350 de la relance
  ag('security_v1').fitness = 320;                                                                                                    // entière, pas 350 : écrite par le code, pas par la carte
  ag('rescue_bot_v1').fitness = 950.5;                                                                                                // hors de la bande 220–420 de « Crise »
  const sc = ag('scalper_v2'), fSc = sc.fitness; assert.ok(fSc !== Math.round(fSc) && PREUVE(sc) !== null); sc._judgments.push({ s: 1, w: 0.2, k: 50 });   // siège AVEC preuve, jugé depuis le backup : son prochain jugement le recalcule — pas touché
  const fEx = ag('exec_bot_v1').fitness; assert.strictEqual(juger(A.X, 'exec_bot_v1', 1, 0.02), fEx, 'VRAI _fitJudge : 2 jugements, pas de preuve → il n\'écrit rien'); assert.strictEqual(ag('exec_bot_v1')._judgments.length, 2);   // jugé depuis SANS preuve : porte toujours la valeur de la carte → rendu
  const pl = R.plan(S, A.F, 'paperReal'); assert.ok(pl.ok, pl.msg); assert.deepStrictEqual(J(pl.agents).map(x => x.id).sort(), ['exec_bot_v1', 'risk_bot_v1']);
  assert.strictEqual(pl.agents.find(x => x.id === 'exec_bot_v1').a, 231.21192883333492); assert.strictEqual(pl.agents.find(x => x.id === 'risk_bot_v1').a, 350);
  const f0 = ag('momentum_v1').fitness; assert.strictEqual(f0, Math.round(f0), 'jugé depuis avec preuve : sa fitness est celle du jugement'); assert.notStrictEqual(f0, A.F.agents[0].fitness);
  R.appliquer(S, A.F, 'paperReal'); assert.strictEqual(ag('momentum_v1').fitness, f0); assert.strictEqual(ag('ne_apres').fitness, 333.3); assert.strictEqual(ag('security_v1').fitness, 320); assert.strictEqual(ag('trend_v2').fitness, 350); assert.strictEqual(ag('rescue_bot_v1').fitness, 950.5); assert.strictEqual(sc.fitness, fSc);
  assert.strictEqual(ag('exec_bot_v1').fitness, 231.21192883333492); assert.strictEqual(ag('risk_bot_v1').fitness, 350); assert.ok(!codeStrict(s18).includes('lmsrWallet'), 'le portefeuille de marché d\'un siège n\'est jamais écrit');
  // un siège déjà à sa valeur du backup (231,21… : non entière, dans la bande) n'est pas listé ; un siège sans nom au backup comme à l'écran reste le même siège
  const A2 = vie(true); A2.X.S.agents.find(a => a.id === 'exec_bot_v1').fitness = 231.21192883333492; assert.ok(!R.plan(A2.X.S, A2.F, 'paperReal').agents.some(x => x.id === 'exec_bot_v1'));
  // l'identité d'un siège : son nom ET son cycle de naissance — un seul des deux qui change suffit à ne pas le toucher
  [{ name: 'Hybrid Gen-95701' }, { _bornCycle: 1266482 }].forEach(d => { const V = vie(true), t = V.X.S.agents.find(a => a.id === 'trend_v2'); assert.strictEqual(t.fitness, 350); Object.assign(t, d); assert.ok(!R.plan(V.X.S, V.F, 'paperReal').agents.some(x => x.id === 'trend_v2'), JSON.stringify(d)); });
  // l'app ne dit pas la preuve (pas de _fitCurrent) : prudence — seuls les sièges NON jugés depuis le backup qui portent encore la valeur tirée
  const A3 = vie(true), R3 = charger18({ _fitCurrent: undefined })._demoReparation; juger(A3.X, 'exec_bot_v1', 1, 0.02);
  const ids3 = J(R3.plan(A3.X.S, A3.F, 'paperReal').agents).map(x => x.id).sort(); assert.deepStrictEqual(ids3, ['rescue_bot_v1', 'risk_bot_v1', 'scalper_v2'], 'preuve inconnue : ni le siège jugé depuis, ni celui reposé à 350');
});
T('D8 · l\'écran : sans empreinte le module est INERTE (un seul contrôle quand l\'état est prêt, puis plus aucune minuterie, aucun élément créé) ; avec empreinte : UN bandeau, texte posé par textContent (jamais innerHTML), le nom du compte et l\'heure du lancement ; « Plus tard » l\'ôte', () => {
  const B = vie(false), d1 = dom(), w1 = charger18({ S: B.X.S, document: d1, _stateReady: false });
  assert.strictEqual(w1.__timers.length, 1); assert.strictEqual(w1.__timers[0].ms, 1000); w1.__timers[0].fn(); assert.strictEqual(w1._demoReparationStatus.vu, false, 'état pas prêt : il attend'); assert.ok(w1.__timers[0].on);
  w1._stateReady = true; w1.__timers[0].fn(); assert.strictEqual(w1._demoReparationStatus.vu, true); assert.strictEqual(w1.__timers[0].on, false, 'minuterie arrêtée'); assert.strictEqual(d1.crees.length, 0, 'compte sain : rien à l\'écran'); assert.deepStrictEqual(J(w1._demoReparationStatus.modes), []); assert.strictEqual(w1._demoReparationStatus.err, null, 'compte sain : aucune erreur');
  const A = vie(true), d2 = dom(), w2 = charger18({ S: A.X.S, document: d2, _stateReady: true }); w2.__timers[0].fn();
  assert.deepStrictEqual(J(w2._demoReparationStatus.modes), ['paperReal']); assert.strictEqual(d2.body.children.length, 1); const b = d2.body.children[0]; assert.strictEqual(b.id, 'demoReparationBandeau');
  const textes = []; (function lire(e) { if (e.textContent) textes.push(e.textContent); e.children.forEach(lire); })(b); const tout = textes.join(' | ');
  assert.ok(tout.includes('Compte EV : ce sont encore les faux chiffres du Mode Démo') && tout.includes('dernier backup d\'AVANT l\'accident (le Mode Démo a été lancé dans la session ouverte le ') && tout.includes('Choisir le backup') && tout.includes('Plus tard'), tout);
  const boutons = b.children.filter(e => e.tag === 'button'); assert.strictEqual(boutons.length, 2); boutons[1].click(); assert.strictEqual(d2.body.children.length, 0, '« Plus tard » ôte le bandeau');
  const c = codeStrict(s18); ['innerHTML', 'insertAdjacentHTML', 'document.write', 'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB', 'WebSocket', 'new Function', 'importScripts'].forEach(m => assert.ok(!c.includes(m), '18 : « ' + m + ' »'));
  assert.strictEqual((c.match(/setInterval\(/g) || []).length, 1); assert.strictEqual((c.match(/\beval\)\('S'\)/g) || []).length, 1, 'une seule lecture de S, comme 09b2'); assert.ok(c.includes('clearInterval(iv);'));
});
T('D9 · textes : 18 déclaré dans le HTML après 17b, au jeton ; en-tête et version ; ≤ 350 lignes ; la ligne de journal de la réparation est classée « bunker » par le VRAI classement de 02 (gardée dans le journal durable) ; 05 dit le retrait en 2e ligne, sa 1re reste celle des bancs', () => {
  assert.ok(html.includes('<script src="js/17b-pont-direct.js?v=' + TOK + '"></script>\n<script src="' + F18 + '?v=' + TOK + '"></script>\n')); assert.strictEqual(scripts.indexOf(F18), scripts.indexOf('js/17b-pont-direct.js') + 1);
  assert.ok(s18.startsWith('// ═══ [GO DÉMO · 12/10/2026] VERSION 20261012a · « go démo »') && s18.includes("var V = '20261012a';") && s18.split('\n').length <= 350, s18.split('\n').length + ' lignes');
  const c = { }; vm.createContext(c); vm.runInContext(between(s02, 'const EVENT_KINDS = [', '\n];', true) + '\n' + fnSrc(s02, '_eventKind') + '\nthis._eventKind = _eventKind;', c);
  assert.ok(codeStrict(s18).includes("' rendu · faux chiffres du Mode démo effacés · '"));
  ['Compte EV rendu · faux chiffres du Mode démo effacés · 1 082,27 $ · 354 trades · historique de 13 paires · 7 agents', 'Compte AA rendu · faux chiffres du Mode démo effacés · 523,40 $ · 15 trades · historique de 5 paires'].forEach(l => assert.strictEqual(c._eventKind({ desc: l }), 'bunker', l));
  const l05 = s05.split('\n'); assert.strictEqual(l05[0], '// ▓▓▓ VERSION 20260906g ▓▓▓'); assert.ok(l05[1].startsWith('// [GO DÉMO · 12/10/2026] VERSION 20261012a · Mode Démo (v51) et Multi-compte (v50) RETIRÉS en entier'));
  assert.ok(TEMOIN.startsWith('// banc-fixtures/mode-demo-retire-20261012.js — TÉMOIN, jamais chargé par l\'app.'));
});
T('D10 · LE PARCOURS À L\'ÉCRAN, de bout en bout (lecteur de fichier simulé) : mauvais fichiers refusés avec leur raison, rien d\'écrit ni de sauvegardé ; bon backup (enveloppe Guardian ou état brut) reconnu, RIEN d\'écrit avant « Rendre mon vrai compte » ; « Annuler » revient à l\'avertissement ; la confirmation refait le plan sur l\'état du moment (un trade fermé entre-temps est gardé), écrit, sauvegarde en forcé UNE fois, rend l\'écran, écrit la ligne de journal (classée « bunker » par 02) ; « Fermer » : plus rien à l\'écran', () => {
  const A = vie(true, { ouverte: true }), B = vie(false, { ouverte: true }), P = page(A.X.S), avant = A.X.plain(), bon = Object.assign({ savedAt: '2026-10-11T13:41:44.373Z' }, A.F);
  assert.ok(P.textes().includes('Compte EV : ce sont encore les faux chiffres du Mode Démo'));
  P.choisir({ size: 12, __texte: '{pas du json' }); assert.ok(P.textes().includes('Ce fichier ne convient pas') && P.textes().includes('JSON illisible'), P.textes());
  P.choisir({ size: 60000001, __texte: '{}' }); assert.ok(P.textes().includes('Fichier trop gros'), P.textes());
  P.choisir({ size: 12, __illisible: true }); assert.ok(P.textes().includes('n\'a pas pu être lu'), P.textes());
  P.choisir(enFichier({ rec: [1, 2, 3] })); assert.ok(P.textes().includes('n\'est pas un backup d\'AURA'), P.textes());
  P.choisir(enFichier(A.X.plain())); assert.ok(P.textes().includes('porte lui aussi les faux chiffres du Mode Démo'), P.textes()); assert.strictEqual(P.bandeau().children.filter(e => e.tag === 'button').length, 2);
  assert.deepStrictEqual(A.X.plain(), avant, 'cinq refus : rien d\'écrit'); assert.deepStrictEqual(P.appels, { save: [], render: 0, toast: [] }, 'ni sauvegarde, ni rendu, ni message');
  P.choisir(enFichier(bon, true)); assert.ok(P.textes().includes('reconnu') && P.textes().includes('Rendre mon vrai compte'), 'état brut (sans enveloppe) reconnu aussi : ' + P.textes());
  P.bouton(1).click(); assert.ok(P.textes().includes('ce sont encore les faux chiffres du Mode Démo') && !P.textes().includes('Rendre mon vrai compte'), '« Annuler » revient à l\'avertissement');
  P.choisir(enFichier(bon)); const t = P.textes();
  assert.ok(/✅ Backup du \d\d\/\d\d à \d\d:\d\d reconnu/.test(t) && /Compte EV : 88\d,\d\d\u00a0\$ → 1\u202f08\d,\d\d\u00a0\$ · 8 trades → 11 · historique de 5 paires rendu · 5 agents remis à leur valeur\./.test(t), t);
  assert.deepStrictEqual(A.X.plain(), avant, 'backup reconnu : toujours RIEN d\'écrit'); assert.strictEqual(P.appels.save.length, 0);
  H += 60000; fermer(A.X, 'XRP/USDT', 74, 0.9, 0.2, 0.01); fermer(B.X, 'XRP/USDT', 74, 0.9, 0.2, 0.01);   // la position ouverte se ferme entre le choix du fichier et la confirmation
  const rendre = P.bouton(0); rendre.click(); rendre.click();   // un second appui sur le bouton (déjà sorti de l'écran) ne refait rien
  comparer(A.X.S.walletStore.paperReal, B.X.S.walletStore.paperReal, 'après confirmation'); assert.strictEqual(A.X.S.walletStore.paperReal.totalTrades, 12); assert.deepStrictEqual(sieges(A.X), sieges(B.X));
  assert.deepStrictEqual(P.appels.save, [true], 'UNE sauvegarde, forcée'); assert.strictEqual(P.appels.render, 1); assert.strictEqual(P.appels.toast.length, 1); assert.ok(/^✅ Compte EV rendu : 1\u202f08\d,\d\d\u00a0\$$/.test(P.appels.toast[0]), P.appels.toast[0]);
  const log = A.X.S.chainLog; assert.strictEqual(log.length, 1); assert.ok(/^Compte EV rendu · faux chiffres du Mode démo effacés · 1\u202f08\d,\d\d\u00a0\$ · 12 trades · historique de 5 paires · 5 agents$/.test(log[0].desc), log[0].desc); assert.strictEqual(log[0].icon, '✅');
  const c = {}; vm.createContext(c); vm.runInContext(between(s02, 'const EVENT_KINDS = [', '\n];', true) + '\n' + fnSrc(s02, '_eventKind') + '\nthis._eventKind = _eventKind;', c); assert.strictEqual(c._eventKind({ desc: log[0].desc }), 'bunker', 'la ligne écrite reste dans le journal durable');
  { const ev = A.X.S.eventLog.filter(e => e.k === 'bunker'); assert.strictEqual(ev.length, 1, 'VRAI relais de 02 : la ligne est entrée au journal durable'); assert.strictEqual(ev[0].d, log[0].desc.slice(0, 160)); assert.strictEqual(ev[0].m, undefined, 'une ligne « bunker » ne porte pas de mode'); }
  assert.strictEqual(P.st.fait.mode, 'paperReal'); assert.strictEqual(P.st.fait.totalTrades, 12); assert.strictEqual(P.st.err, null);
  assert.ok(P.textes().includes('✅ Compte EV rendu') && P.textes().includes('12 trades'), P.textes()); assert.strictEqual(P.w.__tard.length, 1); assert.strictEqual(P.w.__tard[0].ms, 12000); P.bouton(0).click(); assert.strictEqual(P.bandeau(), null, '« Fermer » : plus rien à l\'écran'); assert.strictEqual(P.d.body.children.length, 0);
  P.w.__tard[0].fn(); assert.strictEqual(P.bandeau(), null); assert.strictEqual(P.st.err, null); assert.strictEqual(P.st.sauve, null, 'sauvegarde simulée muette : ni oui ni non');
  // l'état devient irréparable ENTRE le choix du fichier et la confirmation (un transfert de caisse) : la confirmation refuse, n'écrit rien, ne sauvegarde pas
  const A2 = vie(true), P2 = page(A2.X.S); P2.choisir(enFichier(Object.assign({ savedAt: '2026-10-11T13:41:44.373Z' }, A2.F))); assert.ok(P2.textes().includes('Rendre mon vrai compte'));
  A2.X.S.walletStore.paperReal.cashLog.unshift({ amount: -5, source: 'transfer_out', ts: H, time: '12:00:00' }); const av2 = A2.X.plain(), rendre2 = P2.bouton(0); rendre2.click();
  assert.ok(P2.textes().includes('Ce fichier ne convient pas') && P2.textes().includes('mouvement de caisse'), P2.textes()); assert.deepStrictEqual(A2.X.plain(), av2); assert.deepStrictEqual(P2.appels, { save: [], render: 0, toast: [] }); assert.strictEqual(P2.st.fait, null);
  A2.X.S.walletStore.paperReal.cashLog.shift(); const av3 = A2.X.plain(); rendre2.click(); assert.deepStrictEqual(A2.X.plain(), av3, 'après un refus, le fichier choisi n\'est plus gardé : l\'ancien bouton ne fait plus rien'); assert.strictEqual(P2.appels.save.length, 0);
});
T('D11 · règles fines : historique d\'une paire plafonné aux 100 DERNIÈRES lignes ; une ligne d\'un autre jour dont le départ tombe, au centime, sur le repère du jour du backup est quand même remontée (elle est d\'après) ; départ de session à 0 sans relance : ni départ ni cumul touchés ; cumul absent : il le reste', () => {
  { const A = vie(true), G = J(A.F), ft = G.walletStore.paperReal.pairStates['BTC/USDT'].trades; while (ft.length < 99) ft.unshift({ side: 'buy', type: 'position', amount: '1', price: 90 + ft.length, pnl: 0.1, stakeUsdt: 10, pnlUsdt: 0.01, entryPrice: 90, ts: T0 - 9e9 - ft.length, time: '09:00:00' });
    const r = R.appliquer(A.X.S, G, 'paperReal'); assert.ok(r.ok, r.msg); const t = A.X.S.walletStore.paperReal.pairStates['BTC/USDT'].trades;   // 99 lignes au backup + 2 depuis = 101 → les 100 dernières
    assert.strictEqual(t.length, 100); assert.deepStrictEqual(J(t[0]), ft[1], 'la plus vieille ligne du backup sort'); assert.strictEqual(t[99].stakeUsdt, 121); assert.strictEqual(t[98].type, 'open'); assert.strictEqual(r.paires['BTC/USDT'].rendus, 99); }
  { const A = vie(true), B = vie(false), dP = 1085.458338903288 - 880.20, ligne = { date: '2026-10-13', start: 1082.96, end: 1083.5, pnlUsd: 0.54, pnlPct: 0.05 };   // 1 082,96 = le repère du jour du backup, au centime
    assert.strictEqual(a2(A.F.walletStore.paperReal.pnlPeriod.todayStartPortfolio), 1082.96); A.X.S.walletStore.paperReal.pnlPeriod.history.push(ligne); B.X.S.walletStore.paperReal.pnlPeriod.history.push({ date: '2026-10-13', start: a2(1082.96 + dP), end: a2(1083.5 + dP), pnlUsd: 0.54, pnlPct: a2(0.54 / a2(1082.96 + dP) * 100) });
    const r = R.appliquer(A.X.S, A.F, 'paperReal'); assert.ok(r.ok, r.msg); comparer(A.X.S.walletStore.paperReal, B.X.S.walletStore.paperReal, 'ligne d\'un autre jour'); assert.strictEqual(A.X.S.walletStore.paperReal.pnlPeriod.history.slice(-1)[0].start, 1288.22); }
  { H = T0; const d = depart(); delete d.walletStore.paperReal._totalCompounded; const X = monde(d), F = X.plain(); H += 5850000; accident(X, 'crise', 7); X.S.walletStore.paperReal._startPortfolio = 0;   // départ de session à 0 (08 le reposera à la battue suivante) : ce n'est PAS le signe d'une relance
    const r = R.appliquer(X.S, F, 'paperReal'); assert.ok(r.ok, r.msg); assert.strictEqual(r.relance, false); const w = X.S.walletStore.paperReal; assert.strictEqual(w._startPortfolio, 0); assert.ok(!('_totalCompounded' in w), 'cumul absent : pas créé'); proche(w.portfolio, F.walletStore.paperReal.portfolio, 1e-9, 'portefeuille'); }
  { const A = vie(true); delete A.X.S.walletStore.paperReal._totalCompounded; const r = R.appliquer(A.X.S, A.F, 'paperReal'); assert.ok(r.ok && r.relance); assert.ok(!('_totalCompounded' in A.X.S.walletStore.paperReal), 'cumul absent après relance : ni créé ni NaN'); }
});
T('D12 · l\'écran, cas de bord : DEUX comptes atteints (AA puis EV) rendus l\'un après l\'autre — « Fermer » propose le suivant, la minuterie de fin du premier ne ferme pas le choix en cours du second ; « Plus tard » appuyé pendant la lecture du fichier : le bandeau ne revient pas ; l\'enregistrement qui répond non, qui échoue, ou qui manque : dit à l\'écran, le compte reste rendu', () => {
  const deux = avec => { H = T0; const d = depart(); d.tradingMode = 'sim'; let X = monde(d); const F = X.plain(); F.savedAt = new Date(H).toISOString(); H += 3000000; if (avec) accident(X, 'debutant', 5); X = relancer(X); X.S.tradingMode = 'paperReal'; H += 2850000; if (avec) accident(X, 'crise', 7); X = relancer(X); H += 600000; trade(X, 'SOL/USDT', 73, 2.2, 0.31, false, 0.05); return { X, F }; };
  const A = deux(true), B = deux(false), P = page(A.X.S); assert.deepStrictEqual(J(P.st.modes), ['sim', 'paperReal']); assert.ok(P.textes().includes('Compte AA : ce sont encore les faux chiffres'), P.textes());
  P.choisir(enFichier(A.F)); assert.ok(/Compte AA : 52\d,\d\d\u00a0\$ → 1\u202f05\d,\d\d\u00a0\$/.test(P.textes()), P.textes()); P.bouton(0).click(); assert.ok(P.textes().includes('✅ Compte AA rendu'), P.textes()); comparer(A.X.S.walletStore.sim, B.X.S.walletStore.sim, 'AA');
  assert.strictEqual(R.trace(A.X.S.walletStore.paperReal).n, 5, 'l\'EV porte toujours ses faux trades'); P.bouton(0).click();   // « Fermer » → le compte suivant
  assert.ok(P.textes().includes('Compte EV : ce sont encore les faux chiffres'), '« Fermer » propose le compte suivant : ' + P.textes()); assert.deepStrictEqual(J(P.st.modes), ['paperReal']);
  P.choisir(enFichier(A.F)); assert.ok(P.textes().includes('Rendre mon vrai compte')); assert.strictEqual(P.w.__tard.length, 1); P.w.__tard[0].fn();   // la minuterie de fin du PREMIER compte sonne pendant le choix du second
  assert.ok(P.textes().includes('Rendre mon vrai compte'), 'le choix en cours n\'est pas fermé par la minuterie : ' + P.textes()); P.bouton(0).click();
  comparer(A.X.S.walletStore.paperReal, B.X.S.walletStore.paperReal, 'EV'); comparer(A.X.S.walletStore.sim, B.X.S.walletStore.sim, 'AA, après l\'EV'); assert.deepStrictEqual(sieges(A.X), sieges(B.X)); assert.deepStrictEqual(P.appels.save, [true, true]);
  P.w.__tard[1].fn(); assert.strictEqual(P.bandeau(), null, 'minuterie de fin : plus rien à l\'écran, plus aucun compte atteint'); assert.deepStrictEqual(J(P.st.modes), []); assert.strictEqual(P.st.err, null);
  // « Plus tard » pendant la lecture
  const A2 = vie(true), P2 = page(A2.X.S), av2 = A2.X.plain(); P2.choisir(Object.assign(enFichier(A2.F), { __attend: true })); assert.strictEqual(P2.lecteurs.length, 1); P2.bouton(1).click(); assert.strictEqual(P2.bandeau(), null);
  P2.lecteurs[0](); assert.strictEqual(P2.bandeau(), null, 'le fichier finit d\'être lu après « Plus tard » : le bandeau ne revient pas'); assert.deepStrictEqual(A2.X.plain(), av2);
  const A2b = vie(true), P2b = page(A2b.X.S); P2b.choisir({ size: 5, __attend: true, __illisible: true }); P2b.bouton(1).click(); P2b.lecteurs[0](); assert.strictEqual(P2b.bandeau(), null);
  // deux fichiers choisis coup sur coup (le premier, plus lent, finit APRÈS le second) : seule la dernière lecture demandée compte
  const A5 = vie(true), P5 = page(A5.X.S); P5.choisir(Object.assign(enFichier(A5.X.plain()), { __attend: true })); P5.choisir(Object.assign(enFichier(A5.F), { __attend: true })); assert.strictEqual(P5.lecteurs.length, 2);
  P5.lecteurs[1](); assert.ok(P5.textes().includes('Rendre mon vrai compte'), P5.textes()); P5.lecteurs[0](); assert.ok(P5.textes().includes('Rendre mon vrai compte') && !P5.textes().includes('ne convient pas'), 'la première lecture, finie après, ne remplace pas le bandeau : ' + P5.textes());
  const A6 = vie(true), P6 = page(A6.X.S); P6.choisir({ size: 5, __attend: true, __illisible: true }); P6.choisir(Object.assign(enFichier(A6.F), { __attend: true })); P6.lecteurs[1](); P6.lecteurs[0](); assert.ok(P6.textes().includes('Rendre mon vrai compte'), 'une lecture en échec, finie après, non plus');
  // l'enregistrement
  const rendu = o => { const V = vie(true), Q = page(V.X.S, o); Q.choisir(enFichier(V.F)); Q.bouton(0).click(); assert.strictEqual(R.trace(V.X.S.walletStore.paperReal).n, 0, 'le compte est rendu dans tous les cas'); return Q; };
  let Q = rendu({ sauve: () => ({ then(ok) { ok(true); } }) }); assert.strictEqual(Q.st.sauve, true); assert.ok(Q.textes().includes('✅ Compte EV rendu') && !Q.textes().includes('pas encore enregistré'), Q.textes());
  Q = rendu({ sauve: () => ({ then(ok) { ok(false); } }) }); assert.strictEqual(Q.st.sauve, false); assert.ok(Q.textes().includes('rendu — pas encore enregistré') && Q.textes().includes('elle enregistre seule'), Q.textes());
  Q.w.__tard[0].fn(); assert.ok(Q.textes().includes('pas encore enregistré'), 'la minuterie de fin ne ferme pas cet avertissement'); Q.bouton(0).click(); assert.strictEqual(Q.bandeau(), null);
  Q = rendu({ sauve: () => ({ then(ok, ko) { ko(new Error('quota')); } }) }); assert.strictEqual(Q.st.sauve, false); assert.ok(Q.textes().includes('pas encore enregistré'));
  Q = rendu({ sauve: () => { throw new Error('plante'); } }); assert.strictEqual(Q.st.sauve, false); assert.ok(Q.textes().includes('pas encore enregistré')); assert.strictEqual(Q.appels.render, 1, 'le rendu se fait quand même');
  Q = rendu({ sansSauvegarde: true }); assert.strictEqual(Q.st.sauve, false); assert.ok(Q.textes().includes('pas encore enregistré'));
});
console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
process.exit(fail ? 1 : 0);
