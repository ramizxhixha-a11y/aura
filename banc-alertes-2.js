// banc-alertes-2.js — [GO ALERTES 2 · 14/11/2026] VERSION 20261114g
// « Les alertes, les exports et les chiffres de l'écran disent vrai » — registre ETAT-AURA8.md n° 66, 67, 68, 69, 34b, 76, 77, 78, 81, 96.
// Chaque essai fait tourner le VRAI texte de l'app en vm (fonctions entières de 02, 04, 05, 06, 07, 08, 09b1, 09b2, 09d1, 09h, 10g, 10h) ou relit le code
// chargé par le HTML, et ÉCHOUE sur le code d'avant :   BANC_ROOT=<copie du commit ab5be43> node banc-alertes-2.js
//   P  n° 66  alertes P&L : un mode EV / RE en play derrière l'écran a les siennes (08 _bgModeWatch), étiquetées, sans bandeau ; l'AA derrière : rien ;
//             le mode à l'écran au battement, hors du rendu de l'accueil
//   Q  n° 67  « jour » en $ depuis minuit (plus S.pnl24h, un %), « session » depuis le lancement de l'app (une injection n'est pas un gain), baisse depuis
//             le plus haut du jour, série de clôtures gagnantes du mode (plus ps.streak, jamais écrit) ; drapeaux du jour réarmés au changement de jour
//   R  n° 68  exports : écriture native dans l'app Android, le message dit le résultat réel ; plus aucun lien blob sur un chemin d'export
//   S  n° 69  calculateur : R/R jugé APRÈS frais
//   T  n° 34b Twin : un par mode, sauvé et relu, hystérésis de l'alerte, avance derrière l'écran sans peindre l'accueil
//   U  n° 76  injection (EUR et USD) : jour, semaine, mois décalés
//   V  n° 77  « Portefeuille Total » sans la réserve frais (cumul des frais payés)
//   W  n° 78  base ≤ 0 : le $ est donné, le % « — », plus de repli sur la mesure qui compte l'emprunt
//   X  n° 81  écrans de résultats : toutes les fermetures (voix, urgence) ; lecteurs de la décision : « position » seul, inchangés
//   Y  n° 96  net des rapports = net de l'écran Fiscal (funding compris)
//   G  garde : la décision n'a pas bougé (fonctions et fichiers identiques au commit ab5be43)
// Relecture adverse du 14/11 (agent séparé) : Q5 (plus de remise à zéro « 24 h après », fonds propres remis à 0), Q6 (bases « session » des 3 modes au 1er
// contrôle), T5 (bot mesuré depuis l'activation du Twin), W2 (base du jour sauvée aujourd'hui gardée au chargement), T4 (Twin à chaque passage derrière l'écran).
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
const has = (src, name) => new RegExp('(^|\\n)(async )?function ' + name + '\\s*\\(').test(src);
const fnSi = (src, name) => (has(src, name) ? fnSrc(src, name) + '\n' : '');
const code = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const bloc = (src, a, b) => { const i = src.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 50)); const j = src.indexOf(b, i); assert.ok(j > i, 'fin : ' + b.slice(0, 50)); return src.slice(i, j + b.length); };
const h16 = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const J = o => JSON.stringify(o);
const F = { s02: 'js/02-state-init.js', s03: 'js/03-per-pair-position-buttons-controls-buid.js', s04: 'js/04-v8-0-livraison-35-mode-max-permissif-v.js',
  s05: 'js/05-v37-19-indicateur-de-fatigue-bot.js', s06: 'js/06-v63-patterns-chartistes.js', s07: 'js/07-v90-mode-bunker-sos.js', s08: 'js/08-learning-history-render.js',
  s9b1: 'js/09b1-build-snapshot.js', s9b2: 'js/09b2-save-load.js', s9d1: 'js/09d1-paper-real-core.js', s9h: 'js/09h-exports.js', s10g: 'js/10g-resolveur-ev-csv.js',
  s10h: 'js/10h-pont-fullpower-bricks.js', s16b: 'js/16b-fiscal-ecran.js', s9g: 'js/09g-modals.js', s9f3: 'js/09f3-bricks-pair.js' };
const C = {}; Object.keys(F).forEach(k => { C[k] = rd(F[k]); });
const html = rd('AURA8_v118.html');

// contexte : S à 3 portefeuilles (accesseurs vers le mode traité, comme 02 _installWalletAccessors), stubs recensés
function app(o) {
  o = o || {};
  const rec = { toasts: [], milestones: [], tg: [], notifs: [], calls: [], fs: [], blobs: 0 };
  const W = () => ({ openPositions: [], pairStates: {}, fees: { byPair: {} }, portfolio: 1000, totalTrades: 0, winTrades: 0, ownFundsInjected: 0, pnlPeriod: { history: [] } });
  const ws = { sim: W(), paperReal: W(), real: W() };
  const S = { tradingMode: o.mode || 'paperReal', walletStore: ws, chainLog: [], agents: [], currentPage: 1 };
  ['openPositions', 'pairStates', 'fees', 'portfolio', 'totalTrades', 'winTrades', 'ownFundsInjected', 'pnlPeriod', 'cashAccount', 'tradingAccount', '_startPortfolio', 'fiscalReserveAccount'].forEach(k =>
    Object.defineProperty(S, k, { configurable: true, enumerable: true, get() { return ws[this.tradingMode][k]; }, set(v) { ws[this.tradingMode][k] = v; } }));
  const ctx = { console, Math, Object, JSON, Array, Number, String, Date, isFinite, parseFloat, parseInt, Promise, RegExp, Error,
    setTimeout: (f) => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    S, PAIRS: { 'BTC/USDT': { dec: 2, color: '#f7931a' }, 'ETH/USDT': { dec: 2, color: '#627eea' } },
    showToast: (t) => rec.toasts.push(String(t)), showMilestone: (i, t) => rec.milestones.push(i + ' ' + t),
    sendNotif: (t, b) => rec.notifs.push(String(b)), notifDrawdown: (d) => rec.notifs.push('dd ' + d), tgOnPnlGoal: (t) => rec.tg.push(String(t)),
    _walletKey: m => (m === 'paperReal' || m === 'real') ? m : 'sim', _modeLab: m => (m === 'paperReal' ? 'EV' : (m === 'real' ? 'RE' : 'AA')),
    Blob: function () { rec.blobs++; }, URL: { createObjectURL: () => { rec.blobs++; return 'blob:x'; }, revokeObjectURL() {} },
    document: { els: {}, getElementById(id) { return this.els[id] || null; }, createElement: () => ({ click() {}, style: {} }), body: { appendChild() {}, removeChild() {} }, querySelector: () => null } };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  return { ctx, S, ws, rec };
}
const ALERTS = fnSrc(C.s04, '_initAlerts') + '\n' + fnSi(C.s04, '_alertModeLab') + fnSi(C.s04, '_alertMode') + fnSi(C.s04, '_alertFired') + fnSi(C.s04, '_alertFire') + fnSi(C.s04, '_alertWinStreak') + fnSrc(C.s04, 'checkPnlAlerts') + '\n';
const tr = (o) => Object.assign({ type: 'position', side: 'buy', pnl: 1, stakeUsdt: 20, pnlUsdt: 0.2, entryPrice: 99, ts: 1760000600000, time: 't' }, o);

(async () => {
  console.log('▶ banc-alertes-2 · code ' + ROOT);

  console.log('▶ P. alertes P&L de chaque mode en play — n° 66');
  await T('P1 · 08 _bgModeWatch RÉEL : un mode en play derrière l\'écran vérifie SES alertes P&L (checkPnlAlerts appelé dans sa bascule) — avant : jamais', () => {
    const a = app(); const vus = [];
    a.ctx.checkPnlAlerts = () => vus.push(a.S.tradingMode);
    ['_posMark', '_leverageMarginCheck', 'learnFromOpenPositions', 'estimateStakes', '_manConsignesWatchdog', 'applyFundingFees', 'applyLeverageBorrowFees', 'tickTwinLive'].forEach(f => { a.ctx[f] = () => {}; });
    a.ctx._computePortfolio = () => 1000;
    vm.runInContext(fnSrc(C.s08, '_bgModeWatch'), a.ctx);
    a.S.tradingMode = 'real'; a.ctx._bgModeWatch(3);
    assert.deepStrictEqual(vus, ['real'], 'alertes du mode traité : ' + J(vus));
  });
  await T('P2 · 04 checkPnlAlerts RÉEL derrière l\'écran : EV derrière l\'AA → message étiqueté (toast « [EV] » de 08) et Telegram « EV · … », AUCUN bandeau (il est à l\'écran) ; l\'AA derrière l\'EV → rien', () => {
    const a = app({ mode: 'paperReal' });
    a.ctx._modeBehind = () => true; a.ctx._pnlBasis = () => 1000;
    a.ctx._computePnlByPeriod = () => ({ today: { hasData: true, usd: 55 } });
    vm.runInContext(ALERTS, a.ctx);
    a.ctx.checkPnlAlerts();
    assert.strictEqual(a.rec.milestones.length, 0, 'bandeau de l\'écran pour un mode derrière : ' + J(a.rec.milestones));
    assert.ok(a.rec.toasts.some(t => /aujourd'hui/.test(t)), 'message : ' + J(a.rec.toasts));
    assert.ok(a.rec.tg.some(t => /^EV · Gain du jour ≥ \$50 : \+\$55\.00 depuis minuit/.test(t)), 'Telegram : ' + J(a.rec.tg));
    const b = app({ mode: 'sim' }); b.ctx._modeBehind = () => true; b.ctx._pnlBasis = () => 1000;
    b.ctx._computePnlByPeriod = () => ({ today: { hasData: true, usd: 999 } });
    vm.runInContext(ALERTS, b.ctx); b.ctx.checkPnlAlerts();
    assert.strictEqual(b.rec.toasts.length + b.rec.milestones.length + b.rec.tg.length, 0, 'AA derrière l\'écran : ' + J(b.rec));
  });
  await T('P3 · 08 simTick : checkPnlAlerts du mode à l\'écran au battement, hors du rendu de l\'accueil (quelle que soit la page, écran éteint compris)', () => {
    const st = code(fnSrc(C.s08, 'simTick'));
    const i = st.indexOf("try { if (typeof checkPnlAlerts === 'function') checkPnlAlerts(); } catch(e) {}");
    const r = st.indexOf("if(S.currentPage === 0 && !(typeof document !== 'undefined' && document.hidden)) {");
    const b = st.indexOf("_phEnd('bougies + briques + portfolio');");
    assert.ok(i > b && i < r && b > 0 && r > 0, 'appel au battement hors du rendu : ' + [b, i, r]);
  });

  console.log('▶ Q. ce que mesure chaque alerte — n° 67');
  const qApp = (o) => {
    const a = app(o); let basis = 1000, day = 0;
    a.ctx._pnlBasis = () => basis; a.ctx._computePnlByPeriod = () => ({ today: { hasData: true, usd: day } });
    vm.runInContext(ALERTS, a.ctx);
    return { a, set: (b, d) => { if (b !== undefined) basis = b; if (d !== undefined) day = d; a.ctx.checkPnlAlerts(); } };
  };
  await T('Q1 · « Gain du jour » en $ depuis minuit (today.usd), plus S.pnl24h (un % depuis la relance, 60 ici) : +12 $ → rien ; +55 $ → « +$55.00 aujourd\'hui » et Telegram', () => {
    const { a, set } = qApp(); a.S.pnl24h = 60; a.S.perf = { maxDrawdown: 0 };
    set(1000, 12);
    assert.ok(!a.rec.milestones.some(m => /aujourd'hui/.test(m)), 'un % comparé à des $ : ' + J(a.rec.milestones));
    set(1000, 55);
    assert.ok(a.rec.milestones.some(m => /\+\$55\.00 aujourd'hui/.test(m)), J(a.rec.milestones));
    assert.ok(a.rec.tg.some(t => /Gain du jour ≥ \$50 : \+\$55\.00 depuis minuit/.test(t)), J(a.rec.tg));
  });
  await T('Q2 · « session » = depuis le lancement de l\'app, sur ton argent : une injection (ownFundsInjected) n\'est pas un gain ; +12,50 $ gagnés → « Objectif session » ; −6 $ → « perte session »', () => {
    const { a, set } = qApp(); a.S.perf = {};
    set(1000, 0);                                       // 1er contrôle : base de la session
    a.S.ownFundsInjected = 30; set(1030, 0);            // injection de 30 $ : rien
    assert.strictEqual(a.rec.milestones.length, 0, 'injection comptée comme un gain : ' + J(a.rec.milestones));
    set(1042.5, 0);
    assert.ok(a.rec.milestones.some(m => /Objectif session atteint ! \+\$12\.50 depuis le lancement/.test(m)), J(a.rec.milestones));
    const b = qApp(); b.a.S.perf = {}; b.set(1000, 0); b.set(994, 0);
    assert.ok(b.a.rec.milestones.some(m => /perte session : −\$6\.00/.test(m)), J(b.a.rec.milestones));
  });
  await T('Q3 · « Baisse (%) » = depuis le plus haut du jour (au moins la base de minuit) : 100 → 110 → 104 = 5,5 % ≥ 5 → alerte ; avant : S.perf.maxDrawdown, que rien n\'écrit (jamais)', () => {
    const { a, set } = qApp(); a.S.pnlPeriod = { todayDate: '2026-11-14', todayStartPortfolio: 100, history: [] };
    set(100, 0); set(110, 10); assert.ok(!a.rec.milestones.some(m => /Baisse/.test(m)), 'trop tôt');
    set(104, 4);
    assert.ok(a.rec.milestones.some(m => /Baisse de 5,5 % depuis le plus haut du jour/.test(m)), J(a.rec.milestones));
    // jour suivant : drapeaux du jour réarmés pour ce mode
    a.S.pnlPeriod = { todayDate: '2026-11-15', todayStartPortfolio: 104, history: [] }; set(104, 0); set(98, -6);
    assert.strictEqual(a.rec.milestones.filter(m => /Baisse/.test(m)).length, 2, 'réarmement du jour : ' + J(a.rec.milestones));
  });
  await T('Q4 · « Série gagnante » = clôtures gagnantes d\'affilée du MODE (voix et urgence comprises) ; le jalon « Série de 5 » la lit ; avant : ps.streak, jamais écrit', () => {
    const { a, set } = qApp();
    a.ws.paperReal.pairStates = { 'BTC/USDT': { trades: [tr({ pnlUsdt: -1, ts: 1 }), tr({ pnlUsdt: 2, ts: 3 }), tr({ type: 'tendance', pnlUsdt: 5, ts: 5 })] },
      'ETH/USDT': { trades: [tr({ pnlUsdt: 1, ts: 2 }), tr({ pnlUsdt: 1, ts: 4 }), tr({ type: 'urgence', pnlUsdt: 0.5, ts: 6 }), tr({ type: 'buy', pnlUsdt: -9, ts: 7 })] } };
    a.ctx.S.pnlAlerts = null; vm.runInContext('_initAlerts(); S.pnlAlerts.winStreak.value = 5;', a.ctx);
    set(1000, 0);
    assert.ok(a.rec.milestones.some(m => /Série de 5 clôtures gagnantes/.test(m)), J(a.rec.milestones));
    vm.runInContext(fnSrc(C.s04, '_getGoals'), a.ctx);
    const g = vm.runInContext('_getGoals()', a.ctx).find(x => x.name === 'Série de 5');
    assert.ok(g && g.done === true && g.current === 5, J(g));
  });

  await T('Q5 · (relecture adverse) plus de remise à zéro « 24 h après » : le jour ne repart qu\'au changement de jour ; une remise à zéro des fonds propres (ownFundsInjected → 0, aucun argent ne bouge) n\'est pas un « objectif session »', () => {
    const { a, set } = qApp(); a.S.pnlPeriod = { todayDate: 'J1', todayStartPortfolio: 1000, history: [] };
    set(1000, 60); a.S._lastAlertReset = Date.now() - 2 * 86400000; set(1000, 61); set(1000, 62);
    assert.strictEqual(a.rec.milestones.filter(m => /aujourd'hui/.test(m)).length, 1, 'jour réarmé sans changement de jour : ' + J(a.rec.milestones));
    const b = qApp(); b.a.S.ownFundsInjected = 500; b.set(1500, 0); b.a.S.ownFundsInjected = 0; b.set(1500, 0); b.set(1500, 0);
    assert.ok(!b.a.rec.milestones.some(m => /session/.test(m)), 'remise à zéro des fonds propres comptée : ' + J(b.a.rec.milestones));
  });
  await T('Q6 · (relecture adverse) la base « session » des TROIS modes est prise au premier contrôle : le RE, contrôlé plus tard après −100 $, dit sa perte', () => {
    const a = app({ mode: 'paperReal' }); const B = { sim: 50, paperReal: 1000, real: 1145 };
    a.ctx._pnlBasis = w => (w ? B[Object.keys(a.ws).find(k => a.ws[k] === w)] : B[a.S.tradingMode]); a.ctx._computePnlByPeriod = () => ({ today: { hasData: true, usd: 0 } });
    vm.runInContext(ALERTS, a.ctx); a.ctx.checkPnlAlerts();
    B.real = 1045; a.S.tradingMode = 'real'; a.ctx.checkPnlAlerts();
    assert.ok(a.rec.milestones.some(m => /perte session : −\$100\.00/.test(m)), J(a.rec.milestones));
  });

  console.log('▶ R. exports — n° 68');
  const expApp = (fsOk) => {
    const a = app(); a.ctx.Capacitor = { Plugins: {} };
    a.ctx._fsWriteBackup = async (t, n) => { a.rec.fs.push(n); if (fsOk) { a.ctx._fsLastDir = 'EXTERNAL_STORAGE'; return 'fs-written'; } a.ctx._fsLastDiag = 'Ecriture refusee partout'; return null; };
    vm.runInContext(fnSi(C.s05, '_outilsIsNative') + fnSi(C.s05, '_outilsSaveText') + fnSi(C.s05, '_exportFile') + fnSrc(C.s10g, 'downloadFile') + '\n' + fnSrc(C.s9h, 'exportFeesCSV') + '\n' + fnSrc(C.s9h, 'exportSummaryCSV'), a.ctx);
    a.ctx.buildFeeLogCSV = () => 'a;b'; a.ctx.buildSummaryCSV = () => 'x;y';
    return a;
  };
  await T('R1 · app Android, écriture refusée : « ❌ Journal des frais non écrit », aucun lien blob, aucun « exporté » ; réussie : « 📥 … écrit : Download/AURA/nexus_fees_… » — avant : lien blob et « 📥 Frais exportés » toujours', async () => {
    const a = expApp(false); await a.ctx.exportFeesCSV(); await new Promise(r => setImmediate(r));
    assert.strictEqual(a.rec.blobs, 0, 'lien blob dans l\'app Android');
    assert.ok(a.rec.toasts.some(t => /^❌ Journal des frais non écrit : Ecriture refusee/.test(t)) && !a.rec.toasts.some(t => /export/i.test(t)), J(a.rec.toasts));
    const b = expApp(true); await b.ctx.exportSummaryCSV(); await new Promise(r => setImmediate(r));
    assert.ok(b.rec.toasts.some(t => /^📥 Résumé fiscal écrit : Download\/AURA\/nexus_resume_fiscal_/.test(t)), J(b.rec.toasts));
  });
  await T('R2 · aucun chemin d\'export ne garde un lien blob ou un « téléchargé / exporté » inconditionnel : 09h (4), registre fiscal, 4 CSV Google Sheets, dashboard, widget, script, API, backup .json / .txt, « Export pour Claude » (app Android)', () => {
    const fns = [[C.s9h, ['exportFeesCSV', 'exportTradesCSV', 'exportSummaryCSV', 'exportFullJSON']], [C.s16b, ['_fiscExportCsv']], [C.s10g, ['downloadFile']],
      [C.s05, ['_downloadCSV', 'exportGsTrades', 'exportGsPaires', 'exportGsAgents', 'exportGsResume', 'shareDashboard', 'downloadWidget', 'downloadAppsScript', 'downloadApiEndpoint']],
      [C.s03, ['exportBackup']]];
    // 16b _fiscExportCsv porte une expression régulière avec un guillemet (/[",;\n]/) : extraite jusqu'à sa fin de fonction, à la main
    const fnX = (src, n) => n === '_fiscExportCsv' ? (i => src.slice(i, src.indexOf('\n}\n', i) + 2))(src.indexOf('function _fiscExportCsv()')) : fnSrc(src, n);
    fns.forEach(([src, L]) => L.forEach(n => {
      const c = code(fnX(src, n));
      assert.ok(!/createObjectURL|new Blob/.test(c), n + ' : lien blob');
      assert.ok(!/showToast\([^)]*(téléchargé|exporté)/.test(c), n + ' : succès annoncé sans résultat');
      assert.ok(/_exportFile\(|downloadFile\(|_downloadCSV\(/.test(c), n + ' : hors du chemin vérifié');
    }));
    // « Export pour Claude » : dans l'app Android, par _exportFile (le repli blob de _shareOrDownloadJSON ne sert plus qu'au navigateur)
    const efc = code(fnSrc(C.s10h, 'exportForClaude'));
    assert.ok(/if \(\(window\.Capacitor \|\| window\.cordova\) && typeof _exportFile === 'function'\) \{\s*return _exportFile\(/.test(efc), 'exportForClaude');
    // les seuls liens blob restants : replis du NAVIGATEUR (05 _outilsSaveText, 09b3 _shareOrDownloadJSON / autoDlDownload) et le manifeste PWA (07)
    const reste = [];
    fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).forEach(f => rd('js/' + f).split('\n').forEach((l, i) => { if (/createObjectURL/.test(l) && !/^\s*\/\//.test(l)) reste.push(f.slice(0, 4)); }));
    assert.deepStrictEqual(reste.sort(), ['05-v', '07-v', '09b3', '09b3'], 'liens blob : ' + J(reste));
  });

  console.log('▶ S. calculateur — n° 69');
  await T('S1 · 06 renderCalcSection RÉEL aux réglages d\'usine (TP 3 %, SL 1,5 %, frais 0,1 % par côté) : « R/R après frais » jugé, plus « 2.00 ✅ » avant frais', () => {
    const a = app(); a.ctx.document.els.calcSection = { innerHTML: '' }; a.S.totalTrades = 0; a.S.tradingAccount = 1000;
    vm.runInContext(bloc(C.s06, '// ═══ v74 · CALCULATEUR DE POSITION ═══', 'window.renderCalcSection = renderCalcSection;'), a.ctx);
    vm.runInContext('renderCalcSection()', a.ctx);
    const h = a.ctx.document.els.calcSection.innerHTML, r = vm.runInContext('_runCalc()', a.ctx);
    assert.ok(Math.abs(r.rr - 2) < 1e-9 && r.rrNet < 2 && r.rrNet > 1, 'R/R ' + r.rr + ' / net ' + r.rrNet);
    assert.ok(!/2\.00 ✅/.test(h), '« 2.00 ✅ » avant frais');
    assert.ok(h.includes('R/R après frais') && h.includes(r.rrNet.toFixed(2) + ' ⚠️'), 'R/R après frais : ' + r.rrNet.toFixed(2));
  });

  console.log('▶ T. Twin — n° 34b');
  const TWIN = () => fnSrc(C.s07, '_initTwin') + '\n' + fnSi(C.s07, '_twinFresh') + fnSi(C.s07, '_twinSane') + fnSi(C.s07, '_twinBotPnl') + fnSrc(C.s07, 'tickTwinLive') + '\n' + fnSrc(C.s07, '_twinVerdict') + '\n' + fnSrc(C.s07, 'toggleTwinLive') + '\n';
  await T('T1 · un Twin PAR MODE : une position virtuelle ouverte sur les prix de l\'AA n\'est ni vue ni fermée par le Twin de l\'EV (avant : un seul S.twin, ouvert sur l\'AA, fermé sur l\'EV)', () => {
    const a = app({ mode: 'sim' }); const notes = [];
    a.ctx.notifTwinAlert = m => notes.push(m); a.ctx.renderTwinLive = () => notes.push('rendu'); a.ctx.lmsrP = () => 0.9; a.ctx._modeBehind = () => false;
    a.ws.sim.pairStates = { 'BTC/USDT': { price: 100, stake: 10, cycleMax: 120 } }; a.ws.paperReal.pairStates = { 'BTC/USDT': { price: 103, stake: 10, cycleMax: 120 } };
    vm.runInContext(TWIN(), a.ctx);
    vm.runInContext('_initTwin(); S.twin.active = true;', a.ctx); a.ctx.tickTwinLive();
    assert.ok(a.S.twinByMode && a.S.twinByMode.sim.openPos['BTC/USDT'] && a.S.twinByMode.sim.openPos['BTC/USDT'].entryPrice === 100, 'ouverture AA');
    a.S.tradingMode = 'paperReal'; a.ctx.tickTwinLive();   // le Twin de l'EV est inactif : rien
    assert.ok(a.S.twinByMode.sim.openPos['BTC/USDT'], 'position AA fermée par un tick de l\'EV');
    assert.strictEqual(a.S.twin, a.S.twinByMode.paperReal, 'S.twin = Twin du mode traité');
    assert.strictEqual(a.S.twinByMode.paperReal.trades.length, 0);
  });
  await T('T2 · sauvé et relu : 09b1 écrit twinByMode ; 09b2 le relit par 07 _twinSane (champs connus, 50 trades, paires connues) ; manifeste et _LIGHT_KEYS — avant : jamais sauvé, inactif à chaque relance', () => {
    assert.ok(/twinByMode: \(S\.twinByMode && typeof S\.twinByMode === 'object'\) \? S\.twinByMode : null/.test(C.s9b1), '09b1');
    // 09b2 : la ligne de relecture, exécutée telle quelle (dans loadState / applySnap) avec un fichier qui porte un Twin
    const ligne = C.s9b2.split('\n').find(l => /snap\.twinByMode/.test(l) && !/^\s*\/\//.test(l));
    assert.ok(ligne && /(^|\n)(async )?function loadState/.test(C.s9b2) && fnSrc(C.s9b2, 'loadState').includes(ligne.trim()), '09b2 : aucune relecture du Twin dans loadState');
    const r = app(); r.ctx._twinSane = x => ({ relu: x }); r.ctx.snap = { twinByMode: { paperReal: { active: true } } };
    vm.runInContext(ligne, r.ctx); assert.deepStrictEqual(JSON.parse(J(r.S.twinByMode)), { relu: { paperReal: { active: true } } }, '09b2 : Twin non relu');
    assert.ok(/'twinByMode'/.test(C.s9b2.match(/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/)[1]), 'manifeste');
    assert.ok(/'twinByMode'\s*\n\];/.test(C.s9b2.slice(C.s9b2.indexOf('const _LIGHT_KEYS = ['))), '_LIGHT_KEYS');
    const a = app(); vm.runInContext(TWIN(), a.ctx);
    const out = a.ctx._twinSane({ paperReal: { active: true, virtualPnl: 4.5, wins: 3, losses: 1, trades: Array.from({ length: 70 }, (_, i) => ({ ts: i, pair: 'BTC/USDT', side: 'short', virtualPnl: 1, stake: 6, pnlPct: 1 })).concat([{ pair: 3 }]),
      openPos: { 'BTC/USDT': { side: 'long', entryPrice: 100, stake: 6, ts: 9 }, 'XXX/USDT': { side: 'long', entryPrice: 1 }, 'ETH/USDT': { entryPrice: 'x' } }, _devant: true, evil: 1 }, bad: { active: true } });
    assert.deepStrictEqual(Object.keys(out), ['paperReal']);
    const t = out.paperReal;
    assert.ok(t.active === true && t.virtualPnl === 4.5 && t.trades.length === 50 && Object.keys(t.openPos).join() === 'BTC/USDT' && t._devant === true && !('evil' in t), J(t).slice(0, 200));
    // relecture adverse du 14/11 : un Twin copié brut (import « MAX permissif ») est relu par _initTwin — avant, chaque tick levait sur S.twin.openPos
    vm.runInContext("S.twinByMode = { paperReal: { active: true } }; _initTwin();", a.ctx);
    assert.ok(a.S.twin.active === true && Array.isArray(a.S.twin.trades) && typeof a.S.twin.openPos === 'object', 'Twin mal formé non relu : ' + J(a.S.twin));
  });
  await T('T3 · hystérésis : « Twin devant » notifié une fois ; « égal » ne réarme pas ; réarmé seulement quand le BOT repasse devant ; le message dit le mode', () => {
    const a = app(); const got = [];
    a.ctx.notifTwinAlert = m => got.push(m); a.ctx.renderTwinLive = () => {}; a.ctx._modeBehind = () => false;
    a.S.portfolio = 105; a.S._startPortfolio = 100;
    vm.runInContext(TWIN(), a.ctx);
    vm.runInContext("_initTwin(); Object.assign(S.twin, { active: true, virtualPnl: 7.5, trades: [{}, {}, {}], botBase: 100, botInj: 0 });", a.ctx);
    a.ctx.tickTwinLive(); a.S.twin.virtualPnl = 5.5; a.ctx.tickTwinLive(); a.S.twin.virtualPnl = 7.5; a.ctx.tickTwinLive();
    assert.strictEqual(got.length, 1, 'oscillation autour de 1 $ : ' + J(got));
    assert.ok(/^EV · Twin \+\$2\.50 devant le bot sur 3 trades/.test(got[0]), got[0]);
    a.S.twin.virtualPnl = 1; a.ctx.tickTwinLive(); a.S.twin.virtualPnl = 9; a.ctx.tickTwinLive();
    assert.strictEqual(got.length, 2);
  });
  await T('T4 · derrière l\'écran : 08 _bgModeWatch fait avancer le Twin du mode traité (à chaque passage, 3 s) ; 07 tickTwinLive ne peint pas l\'accueil pour un mode derrière l\'écran', () => {
    const a = app(); const vus = [];
    ['_posMark', '_leverageMarginCheck', 'learnFromOpenPositions', 'estimateStakes', '_manConsignesWatchdog', 'applyFundingFees', 'applyLeverageBorrowFees', 'checkPnlAlerts'].forEach(f => { a.ctx[f] = () => {}; });
    a.ctx._computePortfolio = () => 1000; a.ctx.tickTwinLive = () => vus.push(a.S.tradingMode);
    vm.runInContext(fnSrc(C.s08, '_bgModeWatch'), a.ctx);
    a.S.tradingMode = 'real'; [3, 6, 9].forEach(k => a.ctx._bgModeWatch(k));
    assert.deepStrictEqual(vus, ['real', 'real', 'real'], 'cadence : ' + J(vus));   // à chaque passage (3 s) — relecture adverse : 1 sur 4 = 12 s
    const b = app(); const peint = []; b.ctx.renderTwinLive = () => peint.push(1); b.ctx.notifTwinAlert = () => {}; b.ctx._modeBehind = () => true; b.S.currentPage = 0;
    vm.runInContext(TWIN(), b.ctx); vm.runInContext('_initTwin(); S.twin.active = true;', b.ctx); b.ctx.tickTwinLive();
    assert.strictEqual(peint.length, 0, 'accueil peint par un mode derrière l\'écran');
  });

  await T('T5 · (relecture adverse) le bot comparé au Twin se mesure depuis l\'ACTIVATION (base sauvée avec le Twin) : après une relance (_startPortfolio recalé), « Twin devant » ne naît pas d\'un bot remis à 0 ; une activation repart d\'une observation neuve', () => {
    const a = app(); const got = [];
    a.ctx.notifTwinAlert = m => got.push(m); a.ctx.renderTwinLive = () => {}; a.ctx._modeBehind = () => false; a.ctx.showToast = () => {};
    a.S.portfolio = 120; a.S._startPortfolio = 120;   // relance : _startPortfolio recalé sur le portefeuille
    vm.runInContext(TWIN(), a.ctx);
    a.ctx._twinSane; vm.runInContext("S.twinByMode = _twinSane({ paperReal: { active: true, virtualPnl: 18, wins: 4, losses: 2, trades: [1,2,3,4,5,6].map(i => ({ ts: i, pair: 'BTC/USDT', side: 'long', virtualPnl: 3 })), botBase: 100, botInj: 0 } });", a.ctx);
    a.ctx.tickTwinLive();
    assert.strictEqual(got.length, 0, 'Twin devant un bot remis à 0 : ' + J(got));
    assert.strictEqual(vm.runInContext('_twinVerdict().mainPnl', a.ctx), 20);
    a.S.twin.active = false; a.ctx.toggleTwinLive();
    assert.ok(a.S.twin.active && a.S.twin.virtualPnl === 0 && a.S.twin.trades.length === 0 && a.S.twin.botBase === 120, 'activation : ' + J(a.S.twin));
  });

  console.log('▶ U. injection — n° 76');
  await T('U1 · injection en devises ET en USD : les bases jour, semaine ET mois montent du montant net (02 injectFundsFromFiat, confirmFiatInject RÉELS) — avant : le jour seulement (EUR), rien du tout (USD)', () => {
    const run = (usd) => {
      const a = app(); a.S.cashAccount = 100; a.S.fiatRates = { EUR: 0.5 }; a.S.fiatConvFeePct = 0; a.S.ownFundsLog = [];
      a.S.pnlPeriod = { todayStartPortfolio: 1000, weekStartPortfolio: 900, monthStartPortfolio: 800, history: [] };
      Object.assign(a.ctx, { _computePortfolio: () => 1, computePortfolioTotal() {}, syncLeverageReserve() {}, nowStr: () => 't', rndHash: () => 'h', renderHomePrices() {}, renderHome() {}, closeFiatInjectModal() {} });
      a.ctx.document.els = { fiatInjSelect: { value: usd ? 'USD' : 'EUR' }, fiatInjAmount: { value: usd ? '20' : '10' } };
      vm.runInContext(fnSi(C.s02, '_injShiftPeriods') + fnSrc(C.s02, 'previewFiatToUSDT') + '\n' + fnSrc(C.s02, 'injectFundsFromFiat') + '\n' + fnSrc(C.s02, 'confirmFiatInject'), a.ctx);
      a.ctx.confirmFiatInject();
      return [a.S.pnlPeriod.todayStartPortfolio, a.S.pnlPeriod.weekStartPortfolio, a.S.pnlPeriod.monthStartPortfolio].map(v => Math.round(v * 100) / 100);
    };
    // frais de conversion par défaut 0,2 % (02 : S.fiatConvFeePct || 0.002) : 20 $ bruts → 19,96 $ nets
    assert.deepStrictEqual(run(false), [1019.96, 919.96, 819.96], 'EUR (10 € à 0,5 = 20 $ bruts)');
    assert.deepStrictEqual(run(true), [1019.96, 919.96, 819.96], 'USD (20 $ bruts)');
  });

  console.log('▶ V. Portefeuille Total — n° 77');
  await T('V1 · 02 computePortfolioTotal RÉEL : la « réserve frais » (cumul des frais déjà payés) n\'est plus comptée — AA du 27/10 : 1 006,47 $ en trop ; la tuile la dit « hors total »', () => {
    const a = app(); a.S.fees = { feeReserveAccount: 1006.47 }; a.S.fiscalReserveAccount = 10; a.S.antiNegTaxPart = 2;
    a.ctx._computePortfolio = () => 7000;
    vm.runInContext(fnSrc(C.s02, 'computePortfolioTotal'), a.ctx);
    assert.strictEqual(a.ctx.computePortfolioTotal(), 7012);
    assert.ok(/'Frais payés \(info\)',[^\n]*hors total/.test(C.s07), 'tuile');
  });
  await T('V2 · « Portefeuille Total » n\'a aucun lecteur dans la décision : S.portfolioTotal écrit par 02, lu par l\'accueil (07) et la sauvegarde (09b2) seulement', () => {
    const vus = new Set();
    fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).forEach(f => { if (code(rd('js/' + f)).split('\n').some(l => /portfolioTotal\b|computePortfolioTotal\(/.test(l))) vus.add(f.slice(0, 4)); });
    assert.deepStrictEqual([...vus].sort(), ['02-s', '07-v', '09b2'], J([...vus]));   // 09k lit le DOM (#portfolioTotalVal), pas S.portfolioTotal
  });

  console.log('▶ W. base ≤ 0 — n° 78');
  await T('W1 · 09d1 _computePnlByPeriod RÉEL, base du jour −20 $ (ton argent sous zéro sous levier à minuit), maintenant 5 $ : +25 $ donnés, % « — » ; l\'accueil (07 renderHome) écrit « — % (+$25.00) » sans retomber sur portefeuille − _startPortfolio', () => {
    const a = app(); a.ctx._checkAndRotatePeriods = () => {}; a.ctx._pnlBasis = () => 5;
    a.S.pnlPeriod = { todayStartPortfolio: -20, weekStartPortfolio: 0, monthStartPortfolio: null };
    vm.runInContext(fnSrc(C.s9d1, '_computePnlByPeriod'), a.ctx);
    const p = a.ctx._computePnlByPeriod();
    assert.deepStrictEqual(JSON.parse(J(p)), { today: { usd: 25, pct: null, hasData: true }, week: { usd: 5, pct: null, hasData: true }, month: { usd: 0, pct: 0, hasData: false } });
    const rh = code(fnSrc(C.s07, 'renderHome')), rp = code(fnSrc(C.s07, 'renderHomePrices'));
    [rh, rp].forEach((c, k) => {
      const i = c.indexOf('_computePnlByPeriod()'), j = c.indexOf("getElementById('heroPnlBadge')", i);
      assert.ok(i > 0 && j > i && !/_startPortfolio/.test(c.slice(i, j)), (k ? 'renderHomePrices' : 'renderHome') + ' : repli sur _startPortfolio');
      assert.ok(/'— %'/.test(c.slice(j, j + 800)), 'pct null non écrit');
    });
  });

  await T('W2 · (relecture adverse) au chargement, la base du JOUR sauvée aujourd\'hui est gardée (celle de minuit) ; une base d\'un autre jour est recalée comme avant ; _startPortfolio (Rescue Bot) toujours recalé', () => {
    const i0 = C.s9b2.indexOf("['sim','paperReal','real'].forEach(function(_mk){"), i = C.s9b2.lastIndexOf("if (S.walletStore && typeof S.walletStore === 'object') {", i0), j = C.s9b2.indexOf("} catch(e) { dbg.push('startPf-recal:err'); }", i0);
    assert.ok(i > 0 && j > i, 'boucle de recalage introuvable');
    const ws = { sim: { portfolio: 50, _startPortfolio: 40, pnlPeriod: { todayDate: 'AUJ', todayStartPortfolio: 45 } }, paperReal: { portfolio: 2171, _startPortfolio: 2100, pnlPeriod: { todayDate: 'HIER', todayStartPortfolio: 1062 } }, real: { portfolio: 1145, _startPortfolio: 1145, pnlPeriod: { todayDate: 'AUJ', todayStartPortfolio: 'x' } } };
    const ctx = { S: { walletStore: ws }, _computePortfolio: w => w.portfolio, _pnlBasis: w => w.portfolio, _getTodayKey: () => 'AUJ', Math, Number, isFinite };
    vm.createContext(ctx); vm.runInContext(C.s9b2.slice(i, j), ctx);
    assert.deepStrictEqual([ws.sim.pnlPeriod.todayStartPortfolio, ws.paperReal.pnlPeriod.todayStartPortfolio, ws.real.pnlPeriod.todayStartPortfolio], [45, 2171, 1145]);
    assert.deepStrictEqual([ws.sim._startPortfolio, ws.paperReal._startPortfolio, ws.real._startPortfolio], [50, 2171, 1145]);
  });

  console.log('▶ X. écrans de résultats — n° 81');
  const AFFICHAGE = [[C.s03, 'computeAdvancedMetrics'], [C.s03, 'computeWhatIfScenarios'], [C.s04, 'renderDrawdownSection'], [C.s04, 'initWhatIfSection'], [C.s04, 'updateWhatIf'],
    [C.s04, '_buildReplayEvents'], [C.s05, '_fmCalcStats'], [C.s05, 'exportGsTrades'], [C.s05, '_generateAppsScript'], [C.s05, '_apiResponse'], [C.s05, 'renderFeeAnalysisSection'],
    [C.s9g, 'openDiagnostic'], [C.s10h, 'openManDetail'], [C.s9f3, 'ac2UpdateXInd'],
    // relecture adverse du 14/11 : mêmes encarts que les métriques (Coach, anomalies, risque) et autres lecteurs d'affichage
    [C.s04, 'generateCoachTips'], [C.s04, 'detectAnomalies'], [C.s06, 'computeRiskScore'], [C.s06, '_fxAnalyze'], [C.s06, '_acAnalyze'],
    [C.s05, '_computeCorrelationMatrix'], [C.s05, '_perfectDay'], [C.s05, '_nightTrades'], [C.s07, '_citContextual']];
  await T('X1 · 23 écrans / exports de résultats comptent TOUTES les fermetures (02 _isCloseRow : position, urgence, tendance) — avant : « position » seule, la voix (tout l\'argent de l\'EV depuis le 12/11) n\'y était pas', () => {
    AFFICHAGE.forEach(([src, n]) => { const c = code(fnSrc(src, n)); assert.ok(/_isCloseRow\(t\)/.test(c) && !/type\s*===?\s*'position'/.test(c), n); });
    const a = app(); vm.runInContext(fnSi(C.s02, '_isCloseRow') + fnSrc(C.s03, 'computeAdvancedMetrics'), a.ctx);
    a.ws.paperReal.pairStates = { 'BTC/USDT': { trades: [tr({ pnlUsdt: 1, pnl: 1 }), tr({ type: 'tendance', pnlUsdt: 30, pnl: 15 }), tr({ type: 'buy', pnlUsdt: 99 })] } };
    const m = a.ctx.computeAdvancedMetrics();
    assert.ok(m && Math.abs(m.totalPnl - 31) < 1e-9, 'métriques : ' + J(m && m.totalPnl));
  });
  await T('X2 · les lecteurs de la DÉCISION gardent « position » seul et n\'ont pas changé d\'un octet (gardes, mises, refroidissements, espérance, fatigue des bots)', () => {
    const P = { guardianCheck: [C.s03, '09a759da6045c358'], botSmartSizer: [C.s03, '70fe2adfc10a2b4e'], computeBotFatigue: [C.s05, '641699647aec6ea8'],
      _rvConsecLosses: [C.s06, '1e9994ec0432271d'], triggerAntiRevenge: [C.s06, '95322757bd315d51'], _buildAdnSignature: [C.s06, 'ce61fb9e553f3c08'],
      _evaluatePairPerformance: [rd('js/09e-guards.js'), 'd76439cbc0e850c8'], _behavLastClose: [rd('js/10e4-gardes-comportementales.js'), 'a57d4d67ce87c83f'],
      _lastCloses: [rd('js/10e6-frais-slippage.js'), '1d32bc0c0d812881'] };
    Object.entries(P).forEach(([n, [src, h]]) => assert.strictEqual(h16(fnSrc(src, n)), h, n + ' a changé'));
  });

  console.log('▶ Y. net des rapports — n° 96');
  await T('Y1 · 02 _feesNetTotal RÉEL = net de l\'écran Fiscal (brut − tous les frais − impôt du registre) ; CSV résumé (10g), rapport, Excel, calculateur, indice de confiance le lisent — avant : totalPnlNet, sans le funding (EV : −79,85 $ contre −80,20 $)', () => {
    const a = app(); a.S.fees = { totalPnlGross: -21.0247, totalGross: 59.1755, totalTradingFees: 47.5, totalSlippage: 11.3255, totalFunding: 0.35, totalPnlNet: -79.85, tradeCount: 375,
      byPair: { 'BTC/USDT': { trades: 9, pnlGross: -3, gross: 4.2, tradingFees: 3, slippage: 1, tax: 0, pnlNet: -7 } } };
    a.ctx.calcTaxProvision = () => 0;
    vm.runInContext(fnSrc(C.s02, '_feesNetTotal') + '\n' + fnSrc(C.s02, '_feesNetPair'), a.ctx);
    assert.ok(Math.abs(a.ctx._feesNetTotal() - (-80.2002)) < 1e-9, String(a.ctx._feesNetTotal()));
    assert.ok(Math.abs(a.ctx._feesNetPair(a.S.fees.byPair['BTC/USDT']) - (-7.2)) < 1e-9, 'paire : funding 0,20 $ déduit');
    a.S.taxConfig = { region: 'BE', regions: { BE: { label: 'Belgique', method: 'm', rate: 0.33, inclusion: 1 } } }; a.S.fiscalReserveAccount = 0;
    vm.runInContext(fnSrc(C.s10g, 'buildSummaryCSV'), a.ctx);
    const csv = a.ctx.buildSummaryCSV();
    assert.ok(/P&L Net,-80\.20\$/.test(csv) && /BTC\/USDT,9,-3\.00\$,-\$4\.2000,-\$0\.0000,-7\.20\$/.test(csv), csv.split('\n').filter(l => /Net|BTC/.test(l)).join(' / '));
    assert.ok(/Hors paires \(intérêts du levier, impôt de l'année\),,,,,-73\.00\$/.test(csv), 'ligne « Hors paires » : total − Σ paires');   // relecture adverse du 14/11
    [[C.s05, '_buildReportHTML'], [C.s05, 'renderPdfReportSection'], [C.s05, 'buildExcelData'], [C.s05, 'renderFeeAnalysisSection'], [C.s06, '_runCalc'], [C.s07, 'computeTrustScore']].forEach(([s, n]) => {
      const c = code(fnSrc(s, n)); assert.ok(/_feesNetTotal\(\)/.test(c) && !/totalPnlNet\)\s*\|\|\s*0;?$/m.test(c.split('_feesNetTotal')[0].slice(-200)), n);
    });
  });

  console.log('▶ G. garde : la décision n\'a pas bougé');
  await T('G1 · fonctions de la décision et de l\'argent identiques au commit ab5be43 (ouverture, fermeture, frais, funding, mises, portefeuille canonique, argent à Rams, rotation des périodes, résolveur) ; fichiers de la décision identiques', () => {
    const P = { openPosition: [C.s02, '4253a25008eb23a3'], closePosition: [C.s02, 'f306ef7b27f64ac3'], recordFees: [C.s02, 'f2b897580fc692af'], applyFundingFees: [C.s02, '9f9d15892dd2757c'],
      applyLeverageBorrowFees: [C.s02, 'e364c8a77e5c72ad'], estimateStakes: [C.s02, '191de2e4cf018d53'], _computePortfolio: [C.s02, '257f2a1047dbc64b'], _pnlBasis: [C.s02, 'd03c58239bff81bd'],
      calcTaxProvision: [C.s02, 'a53f25980c254185'], botRescue: [C.s03, 'd5ab2721c75c37af'], learnFromOutcome: [C.s03, '1d0bef339fad49fa'],
      _checkAndRotatePeriods: [rd('js/10c-profil-ab-contexte.js'), 'e97c74c187cb8e10'], _resolvePairCycleCore: [rd('js/10f-resolveur-cycle.js'), 'a3b9d1df45a293d9'] };
    Object.entries(P).forEach(([n, [src, h]]) => assert.strictEqual(h16(fnSrc(src, n)), h, n + ' a changé'));
    const H = {"js/09c-auto-open.js":"cb981dcbb9806d73","js/10f-resolveur-cycle.js":"2c7f1bbbb66741a0","js/15-voix-tendance.js":"9757929e4b295254","js/15b-tendance-reelle.js":"08582a20cd8f495a",
      "js/16-fiscal.js":"45259077a3003f56","js/10d-protections-indicateurs.js":"5df7acbcb09379ca","js/12-bots-disciples.js":"22be243cac985f66","js/10a-base-analyse.js":"31a4ecb469243d0a"};
    Object.keys(H).forEach(f => assert.strictEqual(h16(rd(f)), H[f], f + ' a changé'));
  });

  console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} tests passés`);
  process.exit(fail ? 1 : 0);
})();
