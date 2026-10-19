// banc-nettoyage-promesses.js — [GO NETTOYAGE · 18/10/2026] groupe « promesses »
// « Les promesses à l'écran sont tenues » — registre ETAT-AURA8.md § 3, G2 n° 34 à 39. Chaque essai fait tourner le VRAI texte de l'app en vm (blocs
// entiers ou fonctions de 02, 04, 05, 06, 07, 08, 09b1, 09b2, 09b3) ou relit le code chargé par le HTML, et ÉCHOUE sur le code d'avant :
//   BANC_ROOT=<copie du commit 6ee5844> node banc-nettoyage-promesses.js
//   A  n° 34  Twin Live : avance au BATTEMENT (08 simTick, 1 tick sur 4), quelle que soit la page ; l'accueil ne fait plus que l'afficher ; n'écrit
//             que S.twin (ni argent, ni positions, ni décision) ; « Twin devant » notifié une fois
//   B  n° 35  Alertes P&L : « déjà déclenchée » PAR MODE (EV n'éteint plus RE ni AA) ; un ancien drapeau (booléen) relu sans casse ; « ✅ Déclenchée »
//             du mode affiché ; sauvegarde inchangée (09b1 n'écrit, 09b2 ne relit que « activée » et la valeur ; aucune clé nouvelle)
//   C  n° 36  notifConfig.lastNotifTs : plus écrit ; un vieux réglage qui le porte est relu sans casse
//   D  n° 37  Telegram « résumé de la semaine » : dit le VRAI nombre de lignes gardées par paire, lu de la même source que la coupe (09b2)
//   E  n° 38  Réglages › « Exporter backup » dans l'app Android : écriture native, toast selon le résultat réel (plus de « exportée » sur un lien blob)
//   F  n° 39  Outils : fermetures d'urgence comptées (et marquées) dans le rapport, l'Excel, le résumé hebdo (écran, PDF) comme dans Telegram ;
//             Kelly du calculateur : « ✅ » seulement sur un résultat APRÈS frais, « non calculable » sinon
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
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
const bloc = (src, a, b) => { const i = src.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 60)); const j = src.indexOf(b, i); assert.ok(j > i, 'fin : ' + b.slice(0, 60)); return src.slice(i, j + b.length); };
const blocSi = (src, a, b) => (src.indexOf(a) >= 0 ? bloc(src, a, b) : '');
const J = o => JSON.stringify(o);
const tick = () => new Promise(r => setImmediate(r));
const html = rd('AURA8_v118.html');
const s02 = rd('js/02-state-init.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js'),
      s06 = rd('js/06-v63-patterns-chartistes.js'), s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'),
      s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'), s9b3 = rd('js/09b3-import-export.js');
// tous les scripts chargés par le HTML (+ ses scripts en ligne), commentaires retirés — pour les « rien ne fait X » (CLAUDE.md règle 7)
const LOADED = [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
const INLINE = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const ALLCODE = LOADED.map(f => ({ f, c: code(rd(f)) })).concat([{ f: 'HTML (en ligne + onclick)', c: code(INLINE) + '\n' + html.match(/on[a-z]+="[^"]*"/g).join('\n') }]);

const NOTIF = bloc(s07, '// Config notifications (persistée dans S)', 'window.renderNotifSettings = renderNotifSettings;');
const TWIN = bloc(s07, 'function _initTwin() {', 'window.renderTwinLive = renderTwinLive;');
const TG = bloc(s06, '// ═══ v77 · WEBHOOK TELEGRAM ═══', '\n// ═══ v78 · SONS PERSONNALISÉS');
const AIDES = blocSi(s05, '// ═══ [GO OUTILS · 18/10/2026] ETAT n° 33 · aides communes', 'window._outilsPrintable = _outilsPrintable;');
const REPORT = bloc(s05, '// ═══ v43 · #13 EXPORT RAPPORT PDF MENSUEL ═══', 'window.renderPdfReportSection = renderPdfReportSection;');
const EXCEL = bloc(s05, '// ═══ v44 · #42 EXPORT EXCEL MULTI-ONGLETS ═══', 'window.renderXlExportSection = renderXlExportSection;');
const HEBDO = bloc(s05, '// ═══ v45 · #6 RÉSUMÉ HEBDOMADAIRE AUTO ═══', 'window.renderHebdoSection = renderHebdoSection;') + '\n' + fnSrc(s07, 'exportHebdoPdf');
const CALC = bloc(s06, '// ═══ v74 · CALCULATEUR DE POSITION ═══', 'window.renderCalcSection = renderCalcSection;');
const BASE = fnSrc(s02, '_walletKey') + '\n' + fnSrc(s02, '_modeLab') + '\n';
const ALERTS = fnSrc(s04, '_initAlerts') + '\n' + fnSi(s04, '_alertModeLab') + fnSi(s04, '_alertMode') + fnSi(s04, '_alertFired') + fnSi(s04, '_alertFire') + fnSrc(s04, 'checkPnlAlerts') + '\n';
const GARDE = (s9b2.match(/^var _TRADES_GARDES_PAR_PAIRE = [^\n]*;/m) || [''])[0];   // la constante de la coupe (absente du code d'avant)

function storage(o) { o = o || {}; return { getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; } }; }
function el(id) { return { id, innerHTML: '', textContent: '', value: '', style: {}, className: '', classList: { add() {}, remove() {} }, appendChild() {}, removeChild() {}, click() {} }; }
function fakeDoc() { const els = {}; return { els, getElementById: id => (els[id] || (els[id] = el(id))), createElement: t => el(t), querySelector: () => null, querySelectorAll: () => [], body: el('body') }; }
const tr = (o) => Object.assign({ type: 'position', side: 'buy', amount: '1', price: 100, pnl: 1, stakeUsdt: 20, pnlUsdt: 0.2, entryPrice: 99, entryTs: 1760000000000, ts: 1760000600000, time: 't' }, o);
// contexte « app » : S à 3 portefeuilles (accesseurs vers le mode affiché, comme 02 _installWalletAccessors), appels recensés
function app(o) {
  o = o || {};
  const rec = { toasts: [], notifs: [], goals: [], fsWrites: [], blobs: [], opened: [] };
  const W = () => ({ openPositions: [], pairStates: {}, fees: { totalGross: 0, totalPnlNet: 0, byPair: {}, feeLog: [] }, tradingAccount: 1000, portfolio: 1000, totalTrades: 0, winTrades: 0, running: true });
  const ws = { sim: W(), paperReal: W(), real: W() };
  if (o.ws) Object.keys(o.ws).forEach(m => Object.assign(ws[m], o.ws[m]));
  const S = { tradingMode: o.mode || 'paperReal', walletStore: ws, chainLog: [], agents: o.agents || [], botAutoMode: true, dreamJournal: [], currentPage: 0 };
  ['openPositions', 'pairStates', 'fees', 'tradingAccount', 'portfolio', 'totalTrades', 'winTrades'].forEach(k =>
    Object.defineProperty(S, k, { configurable: true, enumerable: true, get() { return ws[_wk(this.tradingMode)][k]; }, set(v) { ws[_wk(this.tradingMode)][k] = v; } }));
  function _wk(m) { return (m === 'paperReal' || m === 'real') ? m : 'sim'; }
  const ctx = { console, Math, Object, JSON, Array, Number, String, Date, isFinite, parseFloat, parseInt, Promise, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    S, PAIRS: o.PAIRS || { 'BTC/USDT': { dec: 2, color: '#f7931a' }, 'ETH/USDT': { dec: 2, color: '#627eea' } }, document: fakeDoc(), navigator: {}, localStorage: storage(),
    AbortSignal: { timeout: () => null }, showToast: (t) => rec.toasts.push(String(t)), showMilestone() {}, playSound() {},
    tgOnPnlGoal: (t) => rec.goals.push(String(t)),
    _fsWriteBackup: async (text, name) => { rec.fsWrites.push({ name, text }); if (o.fsOk === false) { ctx._fsLastDiag = 'Ecriture refusee partout :\n- EXTERNAL_STORAGE : refuse'; return null; } ctx._fsLastDir = o.fsDir || 'EXTERNAL_STORAGE'; return 'fs-written'; },
    Blob: function (parts, opt) { rec.blobs.push(opt && opt.type); }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    fetch: async () => ({ json: async () => ({ ok: true }) }) };
  ctx.window = ctx; ctx.self = ctx;
  if (o.native) ctx.Capacitor = { Plugins: {} };
  ctx.window.open = (...a) => { rec.opened.push(a); return { document: { write() {}, close() {} }, focus() {}, print() {} }; };
  vm.createContext(ctx);
  vm.runInContext(BASE, ctx);
  return { ctx, S, ws, rec };
}

(async () => {
  console.log('▶ banc-nettoyage-promesses · code ' + ROOT);

  console.log('▶ A. Twin Live — n° 34');
  await T('A1 · le battement RÉEL (08 simTick, bloc des alertes) fait avancer le Twin sur une autre page que l\'accueil (page DAO) : positions virtuelles ouvertes et fermées, « Twin devant » notifié UNE fois — et rien d\'autre ne bouge (portefeuilles, positions, AUTO / MANU, agents, propositions)', () => {
    const frag = bloc(s08, "_phEnd('bougies + briques + portfolio');", '// ── Render active page (throttled)');
    const a = app({ PAIRS: { 'BTC/USDT': { dec: 2 } } });
    a.ws.paperReal.pairStates['BTC/USDT'] = { price: 100, stake: 100, cycleMax: 120, qYes: 70, qNo: 30, trades: [] };
    a.ws.paperReal.openPositions.push({ id: 'p1', pair: 'BTC/USDT', side: 'long', stakeUsdt: 50 });
    Object.assign(a.S, { currentPage: 3, _startPortfolio: 1000, agents: [{ id: 'g1', fitness: 400 }], pendingActions: [] });
    a.S.notifConfig = { enabled: true, twinAlert: true, lastNotifTs: 0 };
    vm.runInContext(fnSrc(s02, 'lmsrP') + '\n' + NOTIF + '\n' + TWIN + '\nvar tick = 0; function _phEnd() {}\nfunction __battement() { tick++;\n' + frag + '\n}', a.ctx);
    a.ctx.sendNotif = (t, b) => a.rec.notifs.push(b);
    vm.runInContext('_initTwin(); S.twin.active = true;', a.ctx);
    const etat = () => J({ ws: a.S.walletStore, auto: a.S.botAutoMode, ag: a.S.agents, pa: a.S.pendingActions, cash: a.S.tradingAccount });
    for (let i = 0; i < 40; i++) {
      const op = a.S.twin.openPos['BTC/USDT'], ps = a.ws.paperReal.pairStates['BTC/USDT'];
      if (op) ps.price = op.entryPrice * 1.03;                     // le marché bouge entre deux battements
      const avant = etat(); a.ctx.__battement(); assert.strictEqual(etat(), avant, 'le Twin a écrit hors de S.twin au battement ' + (i + 1));
    }
    assert.ok(a.S.twin.trades.length >= 3, 'le Twin n\'a pas avancé au battement : ' + a.S.twin.trades.length + ' trade(s) virtuel(s)');
    assert.strictEqual(a.rec.notifs.length, 1, 'notifications « Twin devant » : ' + J(a.rec.notifs));
    assert.ok(/Twin \+\$\d+\.\d\d devant le bot sur \d+ trades/.test(a.rec.notifs[0]), a.rec.notifs[0]);
  });
  await T('A2 · un seul appelant de tickTwinLive dans tout ce que charge le HTML (scripts, en ligne, onclick) : le battement 08 ; l\'accueil (02 goPage) l\'affiche seulement ; l\'écran ne dit plus « il n\'avance qu\'à l\'ouverture de l\'accueil »', () => {
    const calls = []; ALLCODE.forEach(({ f, c }) => { const n = (c.match(/(?<!function\s)\btickTwinLive\s*\(/g) || []).length; if (n) calls.push(f + ' ×' + n); });
    assert.deepStrictEqual(calls, ['js/08-learning-history-render.js ×1'], 'appelants : ' + calls.join(', '));
    const gp = code(fnSrc(s02, 'goPage'));
    assert.ok(!/tickTwinLive\s*\(/.test(gp) && /renderTwinLive\(\)/.test(gp), '02 goPage');
    assert.ok(/if \(tick % 4 === 0\) \{ try \{ if \(typeof tickTwinLive === 'function'\) tickTwinLive\(\); \} catch\(e\) \{\} \}/.test(code(fnSrc(s08, 'simTick'))), '08 simTick');
    assert.ok(!/n'avance qu\\'à l\\'ouverture de l\\'accueil/.test(fnSrc(s07, 'renderNotifSettings')), 'l\'écran promet encore l\'ancien défaut');
  });

  console.log('▶ B. Alertes P&L par mode — n° 35');
  const alertsApp = () => {
    const a = app(); const per = { sim: 0, paperReal: 0, real: 0 };
    Object.assign(a.ctx, { sendNotif() {}, notifDrawdown() {}, _computePnlByPeriod: () => ({ today: { hasData: true, usd: per[a.S.tradingMode] } }) });
    a.S.pnl24h = 0; a.S.perf = { maxDrawdown: 0 };
    vm.runInContext(ALERTS + fnSrc(s04, 'toggleAlert') + '\nfunction renderAlertsSection() {}', a.ctx);
    return { a, per, run: (m, v) => { a.S.tradingMode = m; per[m] = v; a.ctx.checkPnlAlerts(); } };
  };
  await T('B1 · checkPnlAlerts RÉEL : « Gain session » atteint en EV puis en RE puis en AA → trois alertes (avant : la 1re consommait les deux autres) ; EV de nouveau → rien ; remise à zéro de 24 h → les trois réarmées', () => {
    const { a, run } = alertsApp();
    run('paperReal', 12); run('real', 15); run('paperReal', 13); run('sim', 11);
    assert.deepStrictEqual(a.rec.goals.map(g => g.slice(0, 2)), ['EV', 'RE', 'AA'], 'alertes : ' + J(a.rec.goals));
    a.S._lastAlertReset = Date.now() - 86400001; run('paperReal', 12);   // ce passage fait la remise à zéro (en fin de fonction)
    run('paperReal', 12); run('real', 15);
    assert.deepStrictEqual(a.rec.goals.map(g => g.slice(0, 2)), ['EV', 'RE', 'AA', 'EV', 'RE'], 'après 24 h : ' + J(a.rec.goals));
  });
  await T('B2 · ancien drapeau relu sans casse : « déjà déclenchée » = true (mode inconnu) vaut pour les 3 modes ; l\'interrupteur le réarme ; « ✅ Déclenchée » à l\'écran pour le mode AFFICHÉ seulement', () => {
    const { a, run } = alertsApp();
    vm.runInContext('_initAlerts(); S.pnlAlerts.sessionGain.triggered = true;', a.ctx);
    run('paperReal', 20); run('real', 20); assert.strictEqual(a.rec.goals.length, 0, 'un ancien drapeau ne vaut plus : ' + J(a.rec.goals));
    a.ctx.toggleAlert('sessionGain'); a.ctx.toggleAlert('sessionGain'); run('paperReal', 20);
    assert.deepStrictEqual(a.rec.goals.map(g => g.slice(0, 2)), ['EV'], 'interrupteur');
    const b = app(); b.ctx.document = { els: {}, getElementById(id) { return id === 'alertsSection2' ? (this.els[id] = this.els[id] || el(id)) : null; } };
    Object.assign(b.S, { portfolio: 0, perf: {}, twin: null });
    vm.runInContext(ALERTS + fnSrc(s04, '_getGoals') + '\n' + fnSrc(s04, 'renderAlertsSection') + '\n_initAlerts(); S.pnlAlerts.sessionGain.triggered = { paperReal: true };', b.ctx);
    const vu = m => { b.S.tradingMode = m; b.ctx.renderAlertsSection(); return (b.ctx.document.els.alertsSection2.innerHTML.match(/✅ Déclenchée/g) || []).length; };
    assert.deepStrictEqual([vu('paperReal'), vu('real'), vu('sim')], [1, 0, 0], 'déclenchée affichée pour un mode qui ne l\'a pas déclenchée');
  });
  await T('B3 · sauvegarde inchangée (09b1 · 09b2 lus en entier sur ce point) : le snapshot n\'écrit de chaque seuil que « activée » et la valeur, même avec des drapeaux par mode ; la relecture (09b2 _reglagesRelus RÉEL) ne ressuscite aucun drapeau ; aucune clé nouvelle — pnlAlerts reste dans applySnap et _APPLYSNAP_MANIFEST', () => {
    const expr = s9b1.match(/pnlAlerts:\s+(\(S\.pnlAlerts[\s\S]*?\}, \{\}\) : null),/)[1];
    const c1 = { S: { pnlAlerts: { sessionGain: { enabled: true, value: 25, triggered: { paperReal: true, real: true } }, dailyLoss: { enabled: false, value: -20, triggered: true } } }, Object, Number };
    vm.createContext(c1); assert.deepStrictEqual(JSON.parse(J(vm.runInContext(expr, c1))), { sessionGain: { enabled: true, value: 25 }, dailyLoss: { enabled: false, value: -20 } });
    const a = app(); vm.runInContext(fnSrc(s04, '_initAlerts') + '\n' + fnSrc(s9b2, '_reglageMerge') + '\n' + fnSrc(s9b2, '_reglagesRelus'), a.ctx);
    ['_rvGet', '_bkGet', '_vacGet', '_sndGet', '_initNotifConfig'].forEach(f => { a.ctx[f] = () => {}; });
    a.ctx._reglagesRelus({ pnlAlerts: { sessionGain: { enabled: false, value: 30, triggered: true }, dailyGain: { enabled: true, value: 60, triggered: { real: true } } } });
    assert.deepStrictEqual(JSON.parse(J([a.S.pnlAlerts.sessionGain, a.S.pnlAlerts.dailyGain])), [{ enabled: false, value: 30, triggered: false }, { enabled: true, value: 60, triggered: false }]);
    const man = s9b2.match(/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/)[1];
    assert.ok(/'pnlAlerts'/.test(man) && /_reglagesRelus\(snap\)/.test(code(fnSrc(s9b2, 'loadState'))), 'manifeste / applySnap');
    assert.ok(!/triggered/.test(code(expr)), '09b1 écrit « déjà déclenchée »');
  });

  console.log('▶ C. notifConfig.lastNotifTs — n° 36');
  await T('C1 · sendNotif RÉEL (07) : la notification part, lastNotifTs n\'est plus écrit (un vieux réglage garde sa valeur, intacte) ; plus aucune écriture de lastNotifTs dans ce que charge le HTML', () => {
    const a = app(); a.ctx.Notification = function (t) { a.rec.notifs.push(t); this.close = function () {}; }; a.ctx.Notification.permission = 'granted';
    vm.runInContext(NOTIF, a.ctx);
    a.S.notifConfig = { enabled: true, tradeClose: true, lastNotifTs: 1760000000000 };
    a.ctx.sendNotif('t', 'b', '🔔', 'test');
    assert.strictEqual(a.rec.notifs.length, 1, 'notification non partie');
    assert.strictEqual(a.S.notifConfig.lastNotifTs, 1760000000000, 'lastNotifTs écrit');
    const w = []; ALLCODE.forEach(({ f, c }) => { if (/lastNotifTs\s*=(?!=)/.test(c)) w.push(f); });
    assert.deepStrictEqual(w, [], 'écrit par : ' + w.join(', '));
  });
  await T('C2 · un vieux backup qui porte lastNotifTs (et le backup réel du 18/10 : lastNotifTs 0) est relu sans casse par 09b2 _reglagesRelus RÉEL : réglages repris, forme du réglage gardée', () => {
    const a = app(); vm.runInContext(fnSrc(s07, '_initNotifConfig') + '\n' + fnSrc(s9b2, '_reglageMerge') + '\n' + fnSrc(s9b2, '_reglagesRelus'), a.ctx);
    ['_rvGet', '_bkGet', '_vacGet', '_sndGet', '_initAlerts'].forEach(f => { a.ctx[f] = () => {}; });
    a.ctx._reglagesRelus({ notifConfig: { enabled: false, tradeOpen: true, tradeClose: false, tpSl: true, drawdownAlert: true, twinAlert: true, regimeChange: false, lastNotifTs: 1760000000000 } });
    const c = JSON.parse(J(a.S.notifConfig));
    assert.deepStrictEqual([c.tradeClose, c.twinAlert, c.lastNotifTs], [false, true, 1760000000000]);
    assert.ok('lastNotifTs' in c, 'forme du réglage changée');
  });

  console.log('▶ D. résumé Telegram de la semaine — n° 37');
  await T('D1 · _tgHebdoText RÉEL (06) dit le nombre de lignes que la coupe RÉELLE (09b2 _auraRotatePurge) garde par paire — avant : « 100 dernières lignes » pour 40 gardées', () => {
    const p = app(); p.S.walletStore.paperReal.pairStates['BTC/USDT'] = { trades: Array.from({ length: 90 }, (_, i) => tr({ ts: 1760000000000 + i })) };
    Object.assign(p.S, { learningHistory: [], globalMemoryPool: [], dreamJournal: [], realCandles: {} });
    vm.runInContext(GARDE + '\n' + bloc(s9b2, 'function _auraRotatePurge() {', '\nsetInterval(_auraRotatePurge, 120000);').replace(/\nsetInterval\(_auraRotatePurge, 120000\);$/, '') + '\n_auraRotatePurge();', p.ctx);
    const garde = p.S.walletStore.paperReal.pairStates['BTC/USDT'].trades.length;
    const a = app(); vm.runInContext(GARDE + '\n' + TG, a.ctx);
    const t = a.ctx._tgHebdoText();
    assert.ok(t.includes(garde + ' dernières lignes par paire') && !/100 dernières/.test(t), 'coupe ' + garde + ' / texte : ' + t.split('\n').pop());
  });
  await T('D2 · le nombre vient de la source de la coupe (09b2 _TRADES_GARDES_PAR_PAIRE, lue aussi par la purge), pas d\'un nombre recopié dans 06', () => {
    assert.ok(GARDE, 'constante de la coupe absente de 09b2');
    assert.ok(/cutEnd\(pst\[pp\]\.trades, _TRADES_GARDES_PAR_PAIRE\)/.test(code(fnSrc(s9b2, '_auraRotatePurge'))), 'la purge ne lit pas la constante');
    const a = app(); vm.runInContext(GARDE + '\n' + TG + '\n_TRADES_GARDES_PAR_PAIRE = 37;', a.ctx);
    assert.ok(a.ctx._tgHebdoText().includes('37 dernières lignes par paire'), 'texte figé');
    assert.ok(!/\b40\b/.test(code(fnSrc(s06, '_tgHebdoText'))), '40 recopié dans 06');
  });

  console.log('▶ E. Réglages › Exporter backup — n° 38');
  const exportApp = (o) => {
    const a = app(o); Object.assign(a.S, { vMajor: 8, vMinor: 1, cycle: 5 });
    a.ctx.buildSnapshot = () => ({ cycle: 5, savedAt: 'x' });
    vm.runInContext(fnSrc(s9b3, '_shareOrDownloadJSON') + '\n' + fnSrc(s9b3, 'exportState') + '\n' + fnSi(s05, '_outilsIsNative') + fnSi(s05, '_outilsSaveText'), a.ctx);
    return a;
  };
  await T('E1 · app Android, écriture native REFUSÉE : « ❌ Sauvegarde non écrite », aucun lien blob — avant : repli blob (n\'écrit rien) et « 💾 Sauvegarde exportée »', async () => {
    const a = exportApp({ native: true, fsOk: false });
    assert.strictEqual(a.ctx.exportState(), true); await tick(); await tick(); await tick();
    assert.strictEqual(a.rec.fsWrites.length, 1, 'chemin natif non pris');
    assert.strictEqual(a.rec.blobs.length, 0, 'lien blob dans l\'app Android');
    assert.ok(a.rec.toasts.some(t => t.startsWith('❌ Sauvegarde non écrite')) && !a.rec.toasts.some(t => /exportée|Sauvegardé/.test(t)), J(a.rec.toasts));
  });
  await T('E2 · app Android, écriture native réussie : le toast dit le VRAI dossier (Download/AURA/… ; Documents/AURA_Backups/… seulement si c\'est là) — avant : « Documents/AURA_Backups » toujours ; navigateur : inchangé (téléchargement, « exportée »)', async () => {
    for (const [dir, where] of [['EXTERNAL_STORAGE', 'Download/AURA/nexus_save_'], ['DOCUMENTS', 'Documents/AURA_Backups/nexus_save_']]) {
      const a = exportApp({ native: true, fsDir: dir }); a.ctx.exportState(); await tick(); await tick(); await tick();
      assert.ok(a.rec.toasts.some(t => t.startsWith('💾 Sauvegarde écrite : ' + where)), dir + ' → ' + J(a.rec.toasts));
    }
    const b = exportApp({ fsOk: false }); b.ctx.exportState(); await tick(); await tick(); await tick();
    assert.ok(b.rec.blobs.length === 1 && b.rec.toasts.some(t => t.startsWith('💾 Sauvegarde exportée : nexus_save_')), 'navigateur : ' + J(b.rec.toasts));
  });

  console.log('▶ F. Outils : urgences et Kelly — n° 39');
  const outilsApp = (o) => {
    const a = app(Object.assign({ mode: 'real', agents: [{ name: 'macro', fitness: 100 }] }, o || {}));
    const d = new Date(), lun = new Date(d); lun.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); lun.setHours(0, 0, 0, 0); const L0 = lun.getTime();
    a.ws.real.pairStates = { 'BTC/USDT': { totalTrades: 1, winTrades: 0, totalPnlUsd: -2, trades: [tr({ type: 'open', pnlUsdt: null, ts: L0 + 30e3 }), tr({ pnlUsdt: -2, pnl: -1, ts: L0 + 60e3 }), tr({ type: 'urgence', pnlUsdt: 3, pnl: 1.5, ts: L0 + 120e3 })] } };
    vm.runInContext(AIDES + '\n' + REPORT + '\n' + EXCEL + '\n' + HEBDO + '\n' + TG, a.ctx);
    return a;
  };
  await T('F1 · une fermeture d\'urgence (ligne « urgence » de 02 closePosition) entre dans le rapport, l\'Excel et le résumé hebdo (écran, PDF) comme dans le résumé Telegram — même compte partout, marquée comme telle', async () => {
    const a = outilsApp({ native: true });
    const tg = a.ctx._tgHebdoText().match(/<b>RE<\/b>[^\n]*\n\s+(\d+) trade\(s\) fermé\(s\)/);
    assert.ok(tg && tg[1] === '2', 'Telegram : ' + (tg && tg[1]));
    const w = vm.runInContext('_getWeekTrades(0)', a.ctx), st = vm.runInContext('(w)=>_analyzeWeek(w.trades,w.monday,w.sunday)', a.ctx)(w);
    assert.strictEqual(st.n, 2, 'hebdo : ' + st.n + ' trade(s) (Telegram : 2)'); assert.ok(st.insights.some(i => /urgence/.test(i)), 'urgence non dite : ' + J(st.insights));
    vm.runInContext('renderHebdoSection()', a.ctx); assert.ok(/urgence/.test(a.ctx.document.els.hebdoSection.innerHTML), 'écran hebdo');
    const h = vm.runInContext('_buildReportHTML()', a.ctx);
    assert.ok(h.includes('P&L brut des 2 trades gardés') && /dont 1 fermeture\(s\) d'urgence/.test(h) && h.includes('+$1.00'), 'rapport');
    const x = vm.runInContext('buildExcelData()', a.ctx);
    assert.ok(/URGENCE/.test(x.sheetTrades) && x.sheetTrades.split('\n').length === 3 && /dont 1 fermeture\(s\) d'urgence/.test(x.sheetResume), 'Excel');
    await vm.runInContext('exportHebdoPdf(0)', a.ctx); await tick();
    const f = a.rec.fsWrites.find(z => /^AURA_hebdo_RE_/.test(z.name)); assert.ok(f && /URGENCE/.test(f.text), 'PDF hebdo');
  });
  await T('F2 · Kelly RÉEL (06 _runCalc / renderCalcSection) : WR AVANT frais 50 %, net du mode ≥ 0, mais 5 clôtures gagnantes sur 20 APRÈS frais → pas de « ✅ », « ne PAS prendre » (avant : « ✅ … WR avant frais ») ; 3 clôtures → « non calculable », pas de ✅ ; 15 sur 20 → « ✅ … APRÈS frais »', () => {
    const fl = (n, k) => Array.from({ length: n }, (_, i) => ({ pnlNet: i < k ? 0.5 : -0.4 }));
    const vu = (log) => { const a = app({ ws: { paperReal: { totalTrades: 100, winTrades: 50, fees: { totalPnlNet: 5, byPair: {}, feeLog: log } } } });
      vm.runInContext(CALC, a.ctx); vm.runInContext('renderCalcSection()', a.ctx); return a.ctx.document.els.calcSection.innerHTML; };
    const h1 = vu(fl(20, 5)), h2 = vu(fl(3, 3)), h3 = vu(fl(20, 15));
    // [GO NETTOYAGE · 19/10/2026] (relecture du 19/10) le ✅ compare la perte RÉELLE au SL (frais compris) au Kelly après frais — texte « ✅ Ta perte réelle au SL »
    assert.ok(!/✅ Ta perte réelle/.test(h1) && /APRÈS frais/.test(h1) && /ne PAS prendre/.test(h1), 'après frais perdant présenté sûr');
    assert.ok(!/✅ Ta perte réelle/.test(h2) && /non calculable/.test(h2), 'non calculable');
    assert.ok(/✅ Ta perte réelle au SL \([\d.]+%, frais compris\) est sous la part Kelly APRÈS frais/.test(h3), 'après frais gagnant');
    // le cas de la relecture : Kelly net juste au-dessus du risque saisi, mais sous la perte réelle au SL → pas de ✅
    const r3 = (() => { const a = app({ ws: { paperReal: { totalTrades: 100, winTrades: 50, fees: { totalPnlNet: 5, byPair: {}, feeLog: fl(20, 15) } } } }); vm.runInContext(CALC, a.ctx); return vm.runInContext('_runCalc()', a.ctx); })();
    assert.ok(Math.abs(r3.riskNetPct - Math.abs(r3.netSL) / r3.cap * 100) < 1e-9 && r3.netSL < 0, 'perte réelle au SL en % du capital : ' + r3.riskNetPct);
    assert.ok(/r\.riskNetPct > r\.kellyNet \?/.test(rd('js/06-v63-patterns-chartistes.js')), 'le ✅ compare la perte réelle au SL');
  });

  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass}/${pass + fail} tests passés`);
  process.exit(fail ? 1 : 0);
})();
