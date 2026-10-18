// banc-alertes.js — [GO ALERTES · 15/10/2026] VERSION 20261018a
// « Les interrupteurs d'alerte font ce qu'ils disent, les alertes survivent à une relance, la clé CoinStats ne part plus dans les backups »
// — registre ETAT-AURA8.md, G2 n° 30, 31, 32 (audit du 13/10). Chaque essai fait tourner le VRAI texte de l'app en vm (blocs entiers de 04, 06, 07,
// 10e7, 10f) ou relit le code chargé par le HTML, et ÉCHOUE sur le code d'avant :
//   BANC_ROOT=<copie du commit e7d6fe9> node banc-alertes.js
//   A  n° 30  Telegram « Chaque trade » (EV / RE, sens juste, raison), « Alertes prix », « Objectif P&L », « Résumé de la semaine » (automatique) ; file
//             d'envoi ; notifications « TP / SL atteint » (raison passée par closePosition et _closeCompleted), « Régime », « Twin » ; alertes prix
//             vérifiées au battement (08), sur le prix RÉEL ; app Android sans notifications du système : rien ne plante, l'écran renvoie à Telegram
//   B  n° 31  alertes prix et seuils P&L sauvegardés (09b1), relus (09b2 → 06 _prSane, 04 _initAlerts), gardés par un état choisi sans eux ;
//             ids uniques après relance ; rien de stocké n'entre tel quel dans la page ; la section P&L se re-rend dans Outils › Alertes
//   C  n° 32  S.newsApiKey absente de JSON.stringify(S) (non énumérable), lue comme avant ; RESTAURER et les imports ne l'écrivent jamais
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
const code = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');
const bloc = (src, a, b) => { const i = src.indexOf(a); assert.ok(i >= 0, 'ancre : ' + a.slice(0, 50)); const j = src.indexOf(b, i); assert.ok(j > i, 'fin : ' + b.slice(0, 50)); return src.slice(i, j + b.length); };
const J = o => JSON.parse(JSON.stringify(o));
const s02 = rd('js/02-state-init.js'), s04 = rd('js/04-v8-0-livraison-35-mode-max-permissif-v.js'), s06 = rd('js/06-v63-patterns-chartistes.js'),
      s07 = rd('js/07-v90-mode-bunker-sos.js'), s08 = rd('js/08-learning-history-render.js'), s9b1 = rd('js/09b1-build-snapshot.js'), s9b2 = rd('js/09b2-save-load.js'),
      s10e7 = rd('js/10e7-news-nlp.js'), s10f = rd('js/10f-resolveur-cycle.js'), s09e = rd('js/09e-guards.js'), s05 = rd('js/05-v37-19-indicateur-de-fatigue-bot.js');
const PRIX = bloc(s06, '// ═══ v69 · ALERTES PRIX TEMPS RÉEL ═══', 'window.renderPriceAlertSection = renderPriceAlertSection;');
const TG = bloc(s06, '// ═══ v77 · WEBHOOK TELEGRAM ═══', '\n// ═══ v78 · SONS PERSONNALISÉS');
const NOTIF = bloc(s07, '// Config notifications (persistée dans S)', 'window.renderNotifSettings = renderNotifSettings;');
const TWIN = bloc(s07, 'function _initTwin() {', 'window.renderTwinLive = renderTwinLive;');
function storage(o) { o = o || {}; return { _o: o, getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; } }; }
function fakeDoc(ids) { const els = {}; (ids || []).forEach(id => { els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {} }, style: { setProperty() {} } }; }); return { els, getElementById: id => els[id] || null, querySelector: () => null, querySelectorAll: () => [] }; }
// contexte « app » : S à 3 portefeuilles, prix réels pilotés par le banc, Telegram et notifications enregistrés
function app(o) {
  o = o || {};
  const sent = [], notifs = [], toasts = [], sons = [], tgAlert = [], tgGoal = [], minuteurs = [];
  const ws = { sim: { openPositions: [], pairStates: {}, running: true }, paperReal: { openPositions: [], pairStates: {}, running: true }, real: { openPositions: [], pairStates: {}, running: false } };
  const S = Object.assign({ tradingMode: 'paperReal', walletStore: ws, chainLog: [], priceAlerts: [] }, o.S || {});
  Object.defineProperty(S, 'openPositions', { configurable: true, get() { return ws[this.tradingMode].openPositions; } });
  Object.defineProperty(S, 'pairStates', { configurable: true, get() { return ws[this.tradingMode].pairStates; } });
  const real = {}, now = o.now || Date.now();
  // setInterval RECENSÉ, jamais planifié : les minuteurs posés au chargement d'un bloc (veilleuse des alertes) sont rejoués par le banc quand il le décide
  const ctx = { console, Math, Object, JSON, Array, Number, String, Date, isFinite, parseFloat, Promise, setTimeout: o.setTimeout || setTimeout, clearTimeout,
    setInterval: (fn, ms) => { minuteurs.push({ fn, ms }); return minuteurs.length; }, clearInterval: () => {},
    S, PAIRS: o.PAIRS || { 'BTC/USDT': { dec: 2, color: '#f7931a' }, 'ETH/USDT': { dec: 2, color: '#627eea' } },
    document: o.document || fakeDoc(['priceAlertSection', 'prToast', 'prToastText', 'prToastIcon', 'telegramSection', 'notifSettingsSection']),
    navigator: { vibrate() {} }, localStorage: o.ls || storage(), AbortSignal: { timeout: () => null },
    showToast: (t) => toasts.push(t), playSound: e => sons.push(e), showMilestone() {},
    _rcLastPrice: p => (real[p] ? real[p].px : 0), _rcPriceAge: p => (real[p] ? Date.now() - real[p].ts : Infinity),
    _computePortfolio: w => Number(w.portfolio) || 0,
    fetch: async (url, opt) => { sent.push({ url, t: Date.now(), body: JSON.parse(opt.body) }); return { json: async () => ({ ok: true }) }; } };
  if (o.Notification) ctx.Notification = o.Notification;
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  return { ctx, S, ws, real, sent, notifs, toasts, sons, tgAlert, tgGoal, minuteurs, now };
}
const tgOn = (ls, extra) => ls.setItem('aura_tg_cfg', JSON.stringify(Object.assign({ botToken: '123:abc', chatId: '42', enabled: true, onTrade: true, onAlert: true, onHebdo: false, onUrgence: true, onPnlGoal: true }, extra || {})));
const pause = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('▶ banc-alertes · code ' + ROOT);

  console.log('▶ A. interrupteurs — n° 30');
  await T('A1 · Telegram « 📊 Chaque trade » (06 tgOnTrade RÉEL) : EV et RE envoyés — mode, bot / manuel, sens juste (une position dit « long » : avant, lu sur « buy », tout LONG partait SHORT), $ et %, raison ; AA jamais ; interrupteur coupé → rien', async () => {
    const a = app(); tgOn(a.ctx.localStorage);
    vm.runInContext(PRIX + '\n' + TG, a.ctx);
    a.ctx.tgOnTrade({ pair: 'BTC/USDT', side: 'long', pnlUsd: 1.234, pnlPct: 0.62, mode: 'paperReal', auto: true, urgence: false, sortie: { k: 'tp', why: 'TP 67000.0000' } });
    a.ctx.tgOnTrade({ pair: 'ETH/USDT', side: 'short', pnlUsd: -0.5, pnlPct: -0.25, mode: 'real', auto: false, urgence: false, sortie: null });
    a.ctx.tgOnTrade({ pair: 'ETH/USDT', side: 'long', pnlUsd: 3, pnlPct: 1, mode: 'sim', auto: true, urgence: false, sortie: null });
    await pause(1300);
    assert.strictEqual(a.sent.length, 2, 'AA envoyé ou EV/RE manquant : ' + a.sent.length);
    const m1 = a.sent[0].body.text, m2 = a.sent[1].body.text;
    assert.ok(/WIN — BTC\/USDT<\/b> · EV · 🤖 bot/.test(m1) && /↑ LONG/.test(m1) && /\+\$1\.23/.test(m1) && /\+0\.62 %/.test(m1) && /🎯 TP 67000/.test(m1), m1);
    assert.ok(/LOSS — ETH\/USDT<\/b> · RE · 👤 manuel/.test(m2) && /↓ SHORT/.test(m2) && /−\$0\.50/.test(m2), m2);
    assert.strictEqual(a.sent[0].body.disable_notification, true, 'message de trade silencieux');
    tgOn(a.ctx.localStorage, { onTrade: false }); vm.runInContext('S.telegramCfg = null; delete S.telegramCfg;', a.ctx);
    a.ctx.tgOnTrade({ pair: 'BTC/USDT', side: 'long', pnlUsd: 1, pnlPct: 1, mode: 'paperReal', auto: true });
    await pause(50); assert.strictEqual(a.sent.length, 2, 'interrupteur coupé');
  });
  await T('A2 · 02 closePosition appelle tgOnTrade (mode du trade, auto, urgence, raison) et notifTradeClose avec la raison et le mode — pour TOUTE fermeture, urgence comprise', () => {
    const cp = code(fnSrc(s02, 'closePosition'));
    assert.ok(/tgOnTrade\(\{ pair: pos\.pair, side: pos\.side, pnlUsd: realisedUsd, pnlPct: realisedPct, mode: S\.tradingMode, auto: pos\.auto === true, urgence: _urg, sortie: _sortie \}\)/.test(cp), 'tgOnTrade');
    assert.ok(/notifTradeClose\(pos\.pair, pos\.side, realisedUsd, realisedPct, _sortie, S\.tradingMode\)/.test(cp), 'notifTradeClose');
    assert.ok(/const _sortie = \(arguments\[2\] && arguments\[2\]\.sortie && \(arguments\[2\]\.sortie\.k === 'tp' \|\| arguments\[2\]\.sortie\.k === 'sl'\)\)/.test(cp), '3e argument sortie');
    // la raison n'est lue que par ces deux appels (aucune règle d'argent ni de décision)
    assert.strictEqual((cp.match(/_sortie/g) || []).length, 3, 'la raison lue ailleurs dans closePosition');
  });
  await T('A3 · raisons « objectif / stop » : _closeCompleted RÉEL (10f) les lit sur ses étiquettes (ATR, repli, gain / stop appris, coupure, perte max ; horizon : aucune) ; 07 TP / SL / trailing / −90 %, 05 trailing, 09e perte max de tes consignes les passent', () => {
    const cc = fnSrc(s10f, '_closeCompleted');
    const calls = [], ctx = { S: { openPositions: [], chainLog: [] }, Date, String, closePosition: (id, b, o) => calls.push(o), window: {} };
    vm.createContext(ctx); vm.runInContext(cc, ctx);
    const cas = [['bot TP 67000.0000', 'tp'], ['bot SL 1.2345 (breakeven)', 'sl'], ['bot TP +1.2%', 'tp'], ['bot SL −0.6%', 'sl'], ['bot Gain appris · pic +1,2 %', 'tp'],
                 ['bot Stop appris −1 % (12 chemins)', 'sl'], ['bot stop exchange simulé (coupure)', 'sl'], ['perte max 1.5%', 'sl'], ['bot horizon appris 4 h', null], ['bot Horizon appris 30 min', null]];
    cas.forEach(([lab]) => ctx._closeCompleted({ id: 'p', pair: 'BTC/USDT', auto: true }, lab));
    cas.forEach(([lab, k], i) => assert.strictEqual(calls[i] && calls[i].sortie ? calls[i].sortie.k : null, k, lab));
    assert.ok(/closePosition\(pos\.id, false, \{ sortie: \{ k: 'tp', why: 'TP' \} \}\)/.test(s07) && /closePosition\(pos\.id, false, \{ sortie: \{ k: 'sl', why: 'SL' \} \}\)/.test(s07), '07 TP / SL manuels');
    assert.ok(/closePosition\(pos\.id, pos\.auto === true, \{ sortie: \{ k: 'sl', why: 'trailing stop' \} \}\)/.test(s07) && /garde-fou −90 %/.test(s07), '07 trailing / −90 %');
    assert.ok(/closePosition\(pos\.id, pos\.auto===true, \{ sortie: \{ k: 'sl', why: 'trailing stop' \} \}\)/.test(s05), '05 trailing');
    assert.ok(/k: 'sl', why: 'perte max \(consigne\)'/.test(s09e) && /closePosition\(pos\.id, false, _sortie\)/.test(s09e), '09e consignes');
  });
  await T('A4 · notifTradeClose RÉEL (07) : « TP / SL atteint » remplace « Trade fermé » pour un objectif ou un stop ; coupé → « Trade clôturé » ; le mode est dit ; signe du % juste', () => {
    const a = app(), got = [];
    vm.runInContext(NOTIF, a.ctx);
    a.ctx.sendNotif = (t, b) => got.push(t + ' | ' + b);
    a.S.notifConfig = { enabled: true, tradeOpen: true, tradeClose: true, tpSl: true, drawdownAlert: true, twinAlert: false, regimeChange: false, lastNotifTs: 0 };
    a.ctx.notifTradeClose('BTC/USDT', 'long', 2, 1.1, { k: 'tp', why: 'TP' }, 'paperReal');
    a.ctx.notifTradeClose('ETH/USDT', 'long', -1, -0.5, { k: 'sl', why: 'stop appris' }, 'real');
    a.S.notifConfig.tpSl = false;
    a.ctx.notifTradeClose('BTC/USDT', 'long', -1, -0.5, { k: 'sl', why: 'SL' }, 'paperReal');
    a.ctx.notifTradeClose('BTC/USDT', 'long', -1, -0.5, { k: 'sl', why: 'SL' }, 'sim');       // AA : rien (relecture adverse du 18/10, 2e passage)
    a.S.tradingMode = 'sim'; a.ctx.notifTradeOpen('BTC/USDT', 'long', 10); a.S.tradingMode = 'paperReal';
    assert.ok(/Objectif atteint \| BTC\/USDT · EV · TP · \+\$2\.00 \(\+1\.10 %\)/.test(got[0]), got[0]);
    assert.ok(/Stop atteint \| ETH\/USDT · RE · stop appris · −\$1\.00 \(−0\.50 %\)|Stop atteint \| ETH\/USDT · RE · stop appris · −\$1\.00 \(-0\.50 %\)/.test(got[1]), got[1]);
    assert.ok(/Trade clôturé \| BTC\/USDT · EV · −\$1\.00/.test(got[2]), got[2]);
    assert.strictEqual(got.length, 3, 'l\'AA a notifié : ' + got.slice(3).join(' / '));
  });
  await T('A5 · « Changement de régime » (07 _notifRegimeWatch RÉEL) : le premier régime vu ne notifie pas ; un régime qui TIENT → « EV · ⚪ CALM → 🔴 BEAR », une seule fois ; un régime qui frôle sa borne (bascule à chaque battement) → RIEN ; changer de mode à l\'écran n\'en est pas un ; coupé → rien ; 08 le nourrit du régime du badge', () => {
    assert.ok(has(s07, '_notifRegimeWatch'), '_notifRegimeWatch absent');
    const a = app(), got = [];
    vm.runInContext(NOTIF, a.ctx); a.ctx.sendNotif = (t, b) => got.push(b);
    a.S.notifConfig = { enabled: true, regimeChange: true, lastNotifTs: 0 };
    const bat = (r, n) => { for (let i = 0; i < (n || 1); i++) a.ctx._notifRegimeWatch(r); };   // le battement appelle une fois par seconde
    bat('calm', 2); assert.strictEqual(got.length, 0);
    bat('bear'); assert.strictEqual(got.length, 0, 'annoncé sans avoir tenu');
    bat('bear', 120); assert.deepStrictEqual(got, ['EV · ⚪ CALM → 🔴 BEAR'], 'annoncé une seule fois');
    // frôlement d'une borne : calm / bull une seconde sur deux pendant une heure → aucune annonce
    for (let i = 0; i < 1800; i++) { bat(i % 2 ? 'bull' : 'bear'); }
    assert.strictEqual(got.length, 1, 'frôlement annoncé ' + (got.length - 1) + ' fois');
    a.S.tradingMode = 'sim'; bat('volatile', 120); assert.strictEqual(got.length, 1, 'changement de mode compté');
    bat('volatile_bull', 120); assert.strictEqual(got.length, 2);
    a.S.notifConfig.regimeChange = false; bat('calm', 120); assert.strictEqual(got.length, 2, 'coupé');
    assert.ok(/const _r = detectMarketRegime\(\);\s*\n\s*try \{ if \(typeof _notifRegimeWatch === 'function'\) _notifRegimeWatch\(_r\); \}/.test(s08), '08 badge → veille');
  });
  await T('A5b · anti-spam PAR GENRE (07 sendNotif RÉEL) : une notification de régime n\'avale plus celle du trade qui suit ; une OUVERTURE n\'avale pas la FERMETURE qui suit (genres séparés) ; une salve de fermetures (urgence, Bunker) ne vibre qu\'une fois ; deux du même genre à 5 s d\'écart → une seule ; Notification absent (app Android) → aucune exception', () => {
    const a = app({ Notification: function (t, o) { a.notifs.push(t + ' | ' + ((o && o.body) || '')); this.close = function () {}; } });
    a.ctx.Notification.permission = 'granted';
    vm.runInContext(NOTIF, a.ctx);
    a.S.notifConfig = { enabled: true, tradeClose: true, tpSl: true, drawdownAlert: true, regimeChange: true, twinAlert: true, lastNotifTs: 0 };
    a.S.notifConfig.tradeOpen = true;
    a.ctx.notifRegimeChange('bear', 'calm');
    a.ctx.notifTradeOpen('BTC/USDT', 'long', 10);                                           // genre « trade:ouverture »
    a.ctx.notifTradeClose('BTC/USDT', 'long', 2, 1, { k: 'tp', why: 'TP' }, 'paperReal');   // passe : ni le régime ni l'ouverture ne l'avalent
    a.ctx.notifTradeClose('ETH/USDT', 'long', 1, 0.5, null, 'paperReal');                   // même salve (< 3 s) : une seule vibration pour onze fermetures
    a.ctx.notifDrawdown(12); a.ctx.notifDrawdown(13);
    a.ctx.notifRegimeChange('bull', 'bear');
    assert.deepStrictEqual(J(a.notifs.map(x => x.split(' | ')[0])), ['📊 AURA — Régime marché changé', '🤖 AURA — Position ouverte', '🎯 AURA — Objectif atteint', '⚠️ AURA — Drawdown critique'], a.notifs.join(' / '));
    // app Android : pas de Notification du tout
    const b = app(); vm.runInContext(NOTIF, b.ctx);
    b.S.notifConfig = { enabled: true, tradeClose: true, lastNotifTs: 0 };
    b.ctx.notifTradeClose('BTC/USDT', 'long', 1, 1, null, 'paperReal');   // ne doit pas lever
    b.ctx.sendNotif('t', 'b', '🔔', 'test');
  });
  await T('A6 · « Twin Live alerte » (07 tickTwinLive RÉEL) : une notification quand le verdict de l\'encart DEVIENT « Twin devant », pas à chaque tick ; de nouveau après un passage du bot devant', () => {
    assert.ok(has(s07, '_twinVerdict'), '_twinVerdict absent');
    const a = app({ PAIRS: {} }), got = [];
    vm.runInContext(NOTIF + '\n' + TWIN, a.ctx); a.ctx.sendNotif = (t, b) => got.push(b);
    a.S.notifConfig = { enabled: true, twinAlert: true, lastNotifTs: 0 };
    a.S.portfolio = 105; a.S._startPortfolio = 100; a.S.currentPage = 1;
    a.ctx._initTwin(); Object.assign(a.S.twin, { active: true, virtualPnl: 4, trades: [{}, {}, {}] });
    a.ctx.tickTwinLive(); assert.strictEqual(got.length, 0, 'bot devant');
    a.S.twin.virtualPnl = 7.5; a.ctx.tickTwinLive(); a.ctx.tickTwinLive();
    assert.strictEqual(got.length, 1, 'notifié ' + got.length + ' fois'); assert.ok(/Twin \+\$2\.50 devant le bot sur 3 trades/.test(got[0]), got[0]);
    a.S.twin.virtualPnl = 1; a.ctx.tickTwinLive(); a.S.twin.virtualPnl = 9; a.ctx.tickTwinLive(); assert.strictEqual(got.length, 2);
  });
  await T('A7 · alertes prix (06 checkPriceAlerts RÉEL) : sur le prix RÉEL frais seulement (jamais le prix de bougies fabriquées de l\'AA, jamais un prix de plus de 2 min) ; une fois ; toast, son, Telegram (texte échappé) ; P&L sur la position du mode de création', async () => {
    const a = app(); tgOn(a.ctx.localStorage);
    a.S.tradingMode = 'sim'; a.ws.sim.pairStates['BTC/USDT'] = { price: 99999 };   // AA à l'écran : prix fabriqué au-dessus du seuil
    vm.runInContext(PRIX + '\n' + TG, a.ctx);
    a.S.priceAlerts = [{ id: 1, pair: 'BTC/USDT', type: 'above', value: 70000, createdAt: 1, triggered: false }];
    a.ctx.checkPriceAlerts(); assert.strictEqual(a.S.priceAlerts[0].triggered, false, 'déclenchée sans prix réel (prix AA fabriqué)');
    a.real['BTC/USDT'] = { px: 71000, ts: Date.now() - 180000 }; a.ctx.checkPriceAlerts(); assert.strictEqual(a.S.priceAlerts[0].triggered, false, 'prix réel de 3 min');
    a.real['BTC/USDT'] = { px: 69000, ts: Date.now() }; a.ctx.checkPriceAlerts(); assert.strictEqual(a.S.priceAlerts[0].triggered, false, 'sous le seuil');
    a.real['BTC/USDT'] = { px: 70100, ts: Date.now() }; a.ctx.checkPriceAlerts(); a.ctx.checkPriceAlerts();
    assert.strictEqual(a.S.priceAlerts[0].triggered, true); assert.strictEqual(a.S.priceAlerts[0].triggeredPrice, 70100);
    assert.deepStrictEqual(a.sons, ['alert'], 'son'); assert.strictEqual(a.ctx.document.els.prToastText.textContent, 'BTC/USDT ≥ 70000.00 · prix 70100.00');
    // P&L : position EV (mode de création), pas celle du mode à l'écran ; « ≤ » et « < » échappés pour Telegram
    a.ws.paperReal.openPositions.push({ id: 'p', pair: 'ETH/USDT', side: 'short', entryPrice: 2000, stakeUsdt: 50, totalExposure: 50 });
    a.ws.paperReal.pairStates['ETH/USDT'] = { price: 2060 };
    a.S.priceAlerts.push({ id: 2, pair: 'ETH/USDT', type: 'pnl_neg', value: 1, mode: 'paperReal', createdAt: 1, triggered: false });
    a.S.priceAlerts.push({ id: 3, pair: 'ETH/USDT', type: 'below', value: 2100, createdAt: 1, triggered: false });
    a.real['ETH/USDT'] = { px: 2050, ts: Date.now() };
    a.ctx.checkPriceAlerts();
    // P&L sur le PRIX RÉEL de la paire (2050), pas sur ps.price (2060, qui peut être figé) : short 50 $ entré à 2000 → −1,25 $
    assert.strictEqual(a.S.priceAlerts[1].triggered, true, 'P&L EV'); assert.ok(Math.abs(a.S.priceAlerts[1].triggeredPnl + 1.25) < 1e-9, String(a.S.priceAlerts[1].triggeredPnl));
    await pause(2600);
    assert.strictEqual(a.sent.length, 3, 'Telegram : ' + a.sent.length);
    assert.ok(a.sent.every(s => !/<(?!\/?(b|i|code)>)/.test(s.body.text)), 'balise non échappée : ' + a.sent.map(s => s.body.text).join(' / '));
    assert.ok(/Position ETH\/USDT EV · P&amp;L ≤ −\$1 · P&amp;L −\$1\.25/.test(a.sent[1].body.text), a.sent[1].body.text);
  });
  await T('A8 · « +/−% » mesuré depuis la création (le prix réel du moment de la création), plus « en 1h » ; sans prix réel à la création → au premier prix réel', () => {
    const a = app(); vm.runInContext(PRIX, a.ctx);
    a.real['BTC/USDT'] = { px: 100, ts: Date.now() };
    a.ctx.document.els.prPairSel = { value: 'BTC/USDT' }; a.ctx.document.els.prTypeSel = { value: 'pct_up' }; a.ctx.document.els.prValueInp = { value: '2' };
    a.ctx.addPriceAlert();
    assert.strictEqual(a.S.priceAlerts[0].priceAtCreation, 100);
    a.real['BTC/USDT'] = { px: 101.9, ts: Date.now() }; a.ctx.checkPriceAlerts(); assert.strictEqual(a.S.priceAlerts[0].triggered, false);
    a.real['BTC/USDT'] = { px: 102, ts: Date.now() }; a.ctx.checkPriceAlerts(); assert.strictEqual(a.S.priceAlerts[0].triggered, true);
    assert.ok(!/en 1h/.test(code(PRIX)) && /depuis la création/.test(code(PRIX)), 'libellé');
  });
  await T('A9 · 08 vérifie les alertes prix et le résumé de la semaine à CHAQUE battement, hors du rendu de l\'accueil (avant : renderHome, accueil affiché et écran allumé) ; renderHome ne le fait plus', () => {
    const i = s08.indexOf("try { if (typeof checkPriceAlerts === 'function') checkPriceAlerts(); } catch(e) {}");
    const r = s08.indexOf("if(S.currentPage === 0 && !(typeof document !== 'undefined' && document.hidden)) {");
    const b = s08.indexOf("_phEnd('bougies + briques + portfolio');");
    assert.ok(i > b && i < r, 'appel hors du rendu, après les modes d\'arrière-plan'); assert.ok(/_tgHebdoTick\(\)/.test(s08.slice(b, r)), 'résumé');
    assert.ok(!/checkPriceAlerts\(\)/.test(code(fnSrc(s07, 'renderHome'))), 'renderHome');
  });
  await T('A10 · « 💰 Objectif P&L » (04 checkPnlAlerts RÉEL) : « Gain session » et « Gain journalier » déclenchés → Telegram ; une fois par période comme l\'écran ; pertes → rien sur cet interrupteur', () => {
    const a = app(), goals = [];
    a.ctx.tgOnPnlGoal = t => goals.push(t); a.ctx.sendNotif = () => {}; a.ctx.notifDrawdown = () => {};
    a.ctx._computePnlByPeriod = () => ({ today: { hasData: true, usd: 12.5 } });
    a.S.pnl24h = 60; a.S.perf = { maxDrawdown: 0 }; a.S.totalTrades = 3;
    vm.runInContext(fnSrc(s04, '_initAlerts') + '\n' + (has(s04, '_alertModeLab') ? fnSrc(s04, '_alertModeLab') : '') + '\n' + fnSrc(s04, 'checkPnlAlerts'), a.ctx);
    a.ctx.checkPnlAlerts(); a.ctx.checkPnlAlerts();
    assert.strictEqual(goals.length, 2, 'objectifs : ' + goals.length);
    assert.ok(/^EV · Gain session ≥ \$10 : \+\$12\.50/.test(goals[0]) && /^EV · Gain journalier ≥ \$50 : \+\$60\.00/.test(goals[1]), goals.join(' / '));
  });
  await T('A11 · « 📅 Résumé de la semaine » (06 RÉEL) : part SEUL tous les 7 jours (premier envoi 7 jours après la mise en route), pas avant ; trades fermés et P&L brut des 7 jours d\'EV / RE / AA ; échec réseau → nouvel essai dans 1 h', async () => {
    const a = app(); const ls = a.ctx.localStorage; const J7 = 7 * 86400000;
    tgOn(ls, { onHebdo: true, lastHebdoAt: Date.now() - J7 - 1000 });
    a.ws.paperReal.portfolio = 1082.27; a.ws.paperReal.pairStates['BTC/USDT'] = { trades: [
      { type: 'position', ts: Date.now() - 3600000, pnlUsdt: 2, pnl: 0.5 }, { type: 'position', ts: Date.now() - 2 * 86400000, pnlUsdt: -0.5, pnl: -0.1 },
      { type: 'position', ts: Date.now() - 9 * 86400000, pnlUsdt: 100, pnl: 9 }, { type: 'buy', ts: Date.now(), pnlUsdt: 0 }] };
    vm.runInContext(PRIX + '\n' + TG, a.ctx);
    assert.ok(typeof a.ctx._tgHebdoTick === 'function', '_tgHebdoTick absent');
    a.ctx._tgHebdoTick(); a.ctx._tgHebdoTick(); await pause(1300);
    assert.strictEqual(a.sent.length, 1, 'envois : ' + a.sent.length);
    const t = a.sent[0].body.text;
    assert.ok(/<b>EV<\/b> ▶ · portefeuille <code>\$1082\.27<\/code>\n   2 trade\(s\) fermé\(s\) · 1 gagnant\(s\) · P&L brut <code>\+\$1\.50<\/code>/.test(t), t);
    assert.ok(/<b>RE<\/b> ⏸/.test(t) && /<b>AA<\/b>/.test(t));
    assert.ok(Date.now() - JSON.parse(ls.getItem('aura_tg_cfg')).lastHebdoAt < 5000, 'date d\'envoi gardée');
    a.ctx._tgHebdoTick(); await pause(50); assert.strictEqual(a.sent.length, 1, 'renvoyé avant 7 jours');
    // échec réseau
    const b = app(); tgOn(b.ctx.localStorage, { onHebdo: true, lastHebdoAt: Date.now() - J7 - 1000 });
    b.ctx.fetch = async () => { throw new Error('Failed to fetch'); };
    vm.runInContext(PRIX + '\n' + TG, b.ctx); b.ctx._tgHebdoTick(); await pause(100);
    const nx = JSON.parse(b.ctx.localStorage.getItem('aura_tg_cfg')).lastHebdoAt + J7 - Date.now();
    assert.ok(nx > 3500000 && nx <= 3600000, 'prochain essai dans ' + nx + ' ms');
  });
  await T('A12 · file Telegram : un message à la fois, au moins 1,1 s entre deux (Telegram refuse au-delà d\'un par seconde) ; le résultat de chaque envoi revient à son appelant', async () => {
    const a = app(); tgOn(a.ctx.localStorage); vm.runInContext(PRIX + '\n' + TG, a.ctx);
    const r = await Promise.all([a.ctx.sendTelegram('a'), a.ctx.sendTelegram('b'), a.ctx.sendTelegram('c')]);
    assert.deepStrictEqual(r, [true, true, true]);
    assert.ok(a.sent[1].t - a.sent[0].t >= 1050 && a.sent[2].t - a.sent[1].t >= 1050, 'écarts ' + (a.sent[1].t - a.sent[0].t) + ' / ' + (a.sent[2].t - a.sent[1].t));
  });
  await T('A13 · app Android (WebView, pas de Notification) : alertes prix et réglages des notifications sans exception ; pas de bouton « Activer » qui plante ; l\'écran renvoie à Telegram ; chaque interrupteur Telegram dit ce qu\'il fait', () => {
    const a = app(); vm.runInContext(PRIX + '\n' + TG + '\n' + NOTIF, a.ctx);
    a.ctx.renderPriceAlertSection(); a.ctx.requestNotifPerm(); a.ctx.renderNotifSettings();
    assert.ok(/Pas de notifications du système dans l'app Android/.test(a.ctx.document.els.priceAlertSection.innerHTML), 'alertes prix');
    const ns = a.ctx.document.els.notifSettingsSection.innerHTML;
    assert.ok(!/requestNotifPermission\(\)/.test(ns) && /Telegram/.test(ns), 'réglages notifications');
    a.ctx.renderTelegramSection(); const tg = a.ctx.document.els.telegramSection.innerHTML;
    ['Chaque trade EV / RE', 'l\'AA (bougies fabriquées) n\'envoie rien', 'Bunker déclenché', 'Automatique tous les 7 jours', 'Gain journalier'].forEach(x => assert.ok(tg.includes(x), x));
  });

  await T('A14 · bot en pause : le battement (08) s\'arrête quand les TROIS modes sont en pause (01 stopSim) — une veilleuse de 30 s (06) vérifie alors les alertes et le résumé ; elle ne double rien quand le battement vient de passer', async () => {
    const a = app(); tgOn(a.ctx.localStorage, { onHebdo: true, lastHebdoAt: Date.now() - 8 * 86400000 });
    vm.runInContext(PRIX + '\n' + TG, a.ctx);
    const v = a.minuteurs.filter(m => m.ms === 30000);
    assert.strictEqual(v.length, 1, 'veilleuse de 30 s absente (' + a.minuteurs.map(m => m.ms).join(',') + ')');
    a.ws.paperReal.running = false; a.ws.real.running = false; a.ws.sim.running = false;   // les 3 modes en pause : plus de battement
    a.S.priceAlerts = [{ id: 1, pair: 'BTC/USDT', type: 'above', value: 70000, createdAt: 1, triggered: false }];
    a.real['BTC/USDT'] = { px: 70500, ts: Date.now() };
    v[0].fn();
    assert.strictEqual(a.S.priceAlerts[0].triggered, true, 'alerte non vérifiée sans battement');
    await pause(1300); assert.ok(a.sent.some(m => /7 derniers jours/.test(m.body.text)), 'résumé non envoyé sans battement');
    // le battement vient de passer : la veilleuse ne refait rien
    a.S.priceAlerts.push({ id: 2, pair: 'BTC/USDT', type: 'above', value: 70100, createdAt: 1, triggered: false });
    a.ctx.checkPriceAlerts(); a.S.priceAlerts[1].triggered = false; v[0].fn();
    assert.strictEqual(a.S.priceAlerts[1].triggered, false, 'veilleuse jouée alors que le battement venait de passer');
  });
  await T('A15 · le formulaire ne propose que les paires dont le flux Binance est ouvert — lues à la source (02 _bgModesNeeded RÉEL : modes EV / RE en marche OU à l\'écran), repli d\'une seule paire comme 02 _startBgCollector ; une alerte gardée sur une autre paire dit qu\'elle attend', () => {
    const a = app({ PAIRS: { 'BTC/USDT': { dec: 2 }, 'ETH/USDT': { dec: 2 }, 'PEPE/USDT': { dec: 8 } } });
    vm.runInContext(fnSrc(s02, '_bgModesNeeded') + '\n' + PRIX, a.ctx);
    a.S.paperRealActivePairs = { 'BTC/USDT': true, 'ETH/USDT': false }; a.S.realActivePairs = { 'PEPE/USDT': true };
    a.S.tradingMode = 'sim'; a.ws.paperReal.running = true; a.ws.real.running = false;
    assert.deepStrictEqual(J(a.ctx._prPairsSuivies()), ['BTC/USDT'], 'EV en marche seul (écran AA)');
    a.S.tradingMode = 'real';   // écran RE, RE en pause : 02 ouvre quand même son flux
    assert.deepStrictEqual(J(a.ctx._prPairsSuivies()).sort(), ['BTC/USDT', 'PEPE/USDT'], 'mode affiché compté');
    a.S.tradingMode = 'sim'; a.ws.paperReal.running = false;
    assert.deepStrictEqual(J(a.ctx._prPairsSuivies()), ['BTC/USDT'], 'aucun mode à prix réels : repli d\'une seule paire, comme 02');
    a.ws.paperReal.running = true;
    a.ctx.renderPriceAlertSection(); const h = a.ctx.document.els.priceAlertSection.innerHTML;
    assert.ok(/value="BTC\/USDT"/.test(h) && !/value="PEPE\/USDT"/.test(h), 'menu des paires');
    a.S.priceAlerts = [{ id: 1, pair: 'PEPE/USDT', type: 'above', value: 1, createdAt: 1, triggered: false }];
    a.ctx.renderPriceAlertSection();
    assert.ok(/Prix réel indisponible — l&#39;alerte attend/.test(a.ctx.document.els.priceAlertSection.innerHTML), 'alerte gardée sur une paire non suivie (apostrophe échappée : rien de ce qui est stocké n\'entre tel quel)');
  });
  await T('A18 · régime : la tenue se compte par FAMILLE — un passage à la hausse dont le sous-type papillonne (bull / volatile_bull, borne de volatilité sèche) EST annoncé ; le sous-type seul ne déclenche rien', () => {
    const a = app(), got = [];
    vm.runInContext(NOTIF, a.ctx); a.ctx.sendNotif = (t, b) => got.push(b);
    a.S.notifConfig = { enabled: true, regimeChange: true, lastNotifTs: 0 };
    const bat = (r, n) => { for (let i = 0; i < (n || 1); i++) a.ctx._notifRegimeWatch(r); };
    bat('calm', 3);
    for (let i = 0; i < 120; i++) bat(i % 2 ? 'bull' : 'volatile_bull');   // même famille « hausse », sous-type papillonnant
    assert.strictEqual(got.length, 1, 'annoncé ' + got.length + ' fois'); assert.ok(/⚪ CALM → /.test(got[0]), got[0]);
    for (let i = 0; i < 300; i++) bat(i % 2 ? 'bull' : 'volatile_bull');   // toujours la même famille : plus rien
    assert.strictEqual(got.length, 1, 'ré-annoncé dans la même famille');
    bat('bear', 120); assert.strictEqual(got.length, 2, 'changement de famille non annoncé');
  });
  await T('A19 · veilleuse : rien pendant le démarrage (_stateReady === false) ni pendant l\'écriture d\'un état choisi (RESTAURER / import) ; son exception ne passe pas par _decErr (compteurs de la décision, lus par le Guardian)', () => {
    const a = app(); vm.runInContext(PRIX + '\n' + TG, a.ctx);
    const v = a.minuteurs.filter(m => m.ms === 30000)[0];
    a.ws.paperReal.running = false; a.ws.real.running = false; a.ws.sim.running = false;
    a.S.priceAlerts = [{ id: 1, pair: 'BTC/USDT', type: 'above', value: 70000, createdAt: 1, triggered: false }];
    a.real['BTC/USDT'] = { px: 70500, ts: Date.now() };
    a.ctx._stateReady = false; v.fn(); assert.strictEqual(a.S.priceAlerts[0].triggered, false, 'jouée pendant le démarrage');
    a.ctx._stateReady = true; a.ctx._auraChosenStateWriting = true; v.fn(); assert.strictEqual(a.S.priceAlerts[0].triggered, false, 'jouée pendant un RESTAURER');
    a.ctx._auraChosenStateWriting = false; v.fn(); assert.strictEqual(a.S.priceAlerts[0].triggered, true);
    let decErr = 0; a.ctx._decErr = () => decErr++;
    a.S.priceAlerts = { length: 1 };   // pas un tableau : checkPriceAlerts sort proprement ; une exception éventuelle ne doit pas aller à _decErr
    a.ctx.checkPriceAlerts = () => { throw new Error('essai'); };
    v.fn(); assert.strictEqual(decErr, 0, '_decErr appelé par la veilleuse');
  });
  await T('A20 · id d\'alerte = le plus petit libre : un fichier portant un id à la borne (1e9) ne fait plus sortir le suivant de la borne (il serait réattribué à chaque relance)', () => {
    const a = app(); vm.runInContext(PRIX, a.ctx);
    a.S.priceAlerts = a.ctx._prSane([{ id: 1e9, pair: 'BTC/USDT', type: 'above', value: 1 }]);
    assert.deepStrictEqual(J(a.S.priceAlerts.map(x => x.id)), [1e9]);
    a.ctx.document.els.prPairSel = { value: 'BTC/USDT' }; a.ctx.document.els.prTypeSel = { value: 'above' }; a.ctx.document.els.prValueInp = { value: '2' };
    a.ctx.addPriceAlert();
    const ids = J(a.S.priceAlerts.map(x => x.id));
    assert.deepStrictEqual(ids, [1e9, 1], ids.join(','));
    assert.deepStrictEqual(J(a.ctx._prSane(a.S.priceAlerts).map(x => x.id)), ids, 'ids changés par une relance');
  });
  await T('A16 · alerte P&L : en EV / RE elle attend un prix réel frais (sans réseau, ps.price est figé et le P&L serait faux) ; en AA le prix fabriqué suffit ; TOUTES les positions de la paire comptent', () => {
    const a = app(); vm.runInContext(PRIX, a.ctx);
    a.ws.paperReal.pairStates['ETH/USDT'] = { price: 2000 };
    a.ws.paperReal.openPositions.push({ id: 'p1', pair: 'ETH/USDT', side: 'long', entryPrice: 1900, stakeUsdt: 50, totalExposure: 50 },
                                       { id: 'p2', pair: 'ETH/USDT', side: 'long', entryPrice: 1950, stakeUsdt: 50, totalExposure: 50 });
    const ev = { id: 1, pair: 'ETH/USDT', type: 'pnl_pos', value: 1, mode: 'paperReal', createdAt: 1, triggered: false };
    assert.strictEqual(a.ctx._prPosPnl(ev), null, 'EV sans prix réel frais');
    a.real['ETH/USDT'] = { px: 2000, ts: Date.now() - 300000 }; assert.strictEqual(a.ctx._prPosPnl(ev), null, 'prix réel de 5 min');
    a.real['ETH/USDT'] = { px: 2000, ts: Date.now() };
    assert.ok(Math.abs(a.ctx._prPosPnl(ev) - (50 * (100 / 1900) + 50 * (50 / 1950))) < 1e-9, String(a.ctx._prPosPnl(ev)));
    a.ws.sim.pairStates['ETH/USDT'] = { price: 2100 };
    a.ws.sim.openPositions.push({ id: 'p3', pair: 'ETH/USDT', side: 'long', entryPrice: 2000, stakeUsdt: 10, totalExposure: 10 });
    assert.ok(Math.abs(a.ctx._prPosPnl({ pair: 'ETH/USDT', type: 'pnl_pos', value: 1, mode: 'sim' }) - 0.5) < 1e-9, 'AA sur son prix fabriqué');
  });
  await T('A17 · id d\'alerte BORNÉ : un fichier portant un id démesuré (2^53) ne bloque plus le compteur — avant, toutes les alertes prenaient le même id et « 🗑 » les supprimait ensemble', () => {
    const a = app(); vm.runInContext(PRIX, a.ctx);
    const l = a.ctx._prSane([{ id: Math.pow(2, 53), pair: 'BTC/USDT', type: 'above', value: 1 }, { id: 0, pair: 'ETH/USDT', type: 'above', value: 2 }, { pair: 'BTC/USDT', type: 'below', value: 3 }]);
    const ids = l.map(x => x.id);
    assert.strictEqual(new Set(ids).size, 3, 'ids répétés : ' + ids.join(','));
    a.S.priceAlerts = l;
    a.ctx.document.els.prPairSel = { value: 'BTC/USDT' }; a.ctx.document.els.prTypeSel = { value: 'above' }; a.ctx.document.els.prValueInp = { value: '9' };
    a.ctx.addPriceAlert();
    assert.strictEqual(new Set(a.S.priceAlerts.map(x => x.id)).size, 4, 'nouvelle alerte avec un id déjà pris');
  });

  console.log('▶ B. sauvegarde — n° 31');
  await T('B1 · 09b1 écrit priceAlerts et pnlAlerts (de chaque seuil : activée + valeur, jamais « déjà déclenchée ») ; 09b2 les relit et les nomme dans _APPLYSNAP_MANIFEST ; un état choisi qui ne les porte pas garde ceux de l\'app', () => {
    assert.ok(/^\s+priceAlerts:\s+Array\.isArray\(S\.priceAlerts\)/m.test(s9b1) && /^\s+pnlAlerts:\s+\(S\.pnlAlerts/m.test(s9b1), '09b1');
    const expr = s9b1.match(/pnlAlerts:\s+(\(S\.pnlAlerts[\s\S]*?\}, \{\}\) : null),/)[1];
    const ctx = { S: { pnlAlerts: { sessionGain: { enabled: true, value: 25, triggered: true }, tradeCount: { enabled: false, value: 100, triggered: false } } }, Object, Number };
    vm.createContext(ctx); assert.deepStrictEqual(J(vm.runInContext(expr, ctx)), { sessionGain: { enabled: true, value: 25 }, tradeCount: { enabled: false, value: 100 } });
    const man = s9b2.match(/window\._APPLYSNAP_MANIFEST = \[([^\]]*)\]/)[1];
    assert.ok(/'priceAlerts'/.test(man) && /'pnlAlerts'/.test(man), 'manifeste');
    assert.ok(/\['antiRevengeCfg', 'bunkerCfg', 'vacancesCfg', 'soundCfg', 'notifConfig', 'toastVerbose', 'priceAlerts', 'pnlAlerts'\]\.forEach/.test(fnSrc(s9b2, '_writeChosenState')), '_writeChosenState');
  });
  await T('B2 · relecture RÉELLE (09b2 _reglagesRelus → 06 _prSane, 04 _initAlerts) : alertes prix gardées champ par champ, entrée douteuse écartée (paire « <img…> », type inconnu, valeur ≤ 0), ids rendus uniques ; seuils P&L repris, « déjà déclenchée » non', () => {
    const a = app(); vm.runInContext(PRIX + '\n' + fnSrc(s04, '_initAlerts') + '\n' + fnSrc(s9b2, '_reglageMerge') + '\n' + fnSrc(s9b2, '_reglagesRelus'), a.ctx);
    ['_rvGet', '_bkGet', '_vacGet', '_sndGet', '_initNotifConfig'].forEach(f => { a.ctx[f] = () => {}; });
    a.ctx._reglagesRelus({
      priceAlerts: [{ id: 4, pair: 'BTC/USDT', type: 'below', value: 60000, createdAt: 5, triggered: false, note: '<script>x</script>' },
                    { id: 4, pair: 'ETH/USDT', type: 'pnl_pos', value: 3, mode: 'real', triggered: true, triggeredAt: 9, triggeredPnl: 3.2 },
                    { id: 7, pair: '<img src=x onerror=alert(1)>', type: 'above', value: 1 }, { id: 8, pair: 'BTC/USDT', type: 'hack', value: 1 }, { id: 9, pair: 'BTC/USDT', type: 'above', value: -1 }],
      pnlAlerts: { sessionGain: { enabled: false, value: 25, triggered: true }, inconnu: { enabled: true, value: 1 } } });
    const p = J(a.S.priceAlerts);
    assert.strictEqual(p.length, 2, JSON.stringify(p)); assert.deepStrictEqual(p.map(x => x.id), [4, 5], 'ids'); assert.ok(!('note' in p[0]), 'texte stocké repris');
    assert.deepStrictEqual([p[1].mode, p[1].triggered, p[1].triggeredPnl], ['real', true, 3.2]);
    assert.deepStrictEqual(J(a.S.pnlAlerts.sessionGain), { enabled: false, value: 25, triggered: false }); assert.ok(!a.S.pnlAlerts.inconnu);
  });
  await T('B3 · après relance, la prochaine alerte prend l\'id suivant (avant : compteur remis à 1 → deux alertes de même id, « 🗑 » supprimait les deux)', () => {
    const a = app(); vm.runInContext(PRIX, a.ctx);
    a.S.priceAlerts = [{ id: 1, pair: 'BTC/USDT', type: 'above', value: 1, createdAt: 1, triggered: false }, { id: 2, pair: 'BTC/USDT', type: 'above', value: 2, createdAt: 1, triggered: false }];
    a.ctx.document.els.prPairSel = { value: 'ETH/USDT' }; a.ctx.document.els.prTypeSel = { value: 'above' }; a.ctx.document.els.prValueInp = { value: '3000' };
    a.ctx.addPriceAlert(); assert.strictEqual(a.S.priceAlerts[2].id, 3);
    a.ctx.deletePriceAlert(1); assert.deepStrictEqual(a.S.priceAlerts.map(x => x.id), [2, 3]);
  });
  await T('B4 · rien de stocké n\'entre tel quel dans la page : une alerte importée avec un texte ou une paire piégés s\'affiche sans balise', () => {
    const a = app(); vm.runInContext(PRIX, a.ctx);
    a.S.priceAlerts = [{ id: 1, pair: 'BTC/USDT', type: 'above', value: 1, note: '<img src=x onerror=alert(1)>', col: 'red;background:url(x)', createdAt: 1, triggered: false },
                       { id: 2, pair: '<b>X</b>', type: 'above', value: 1, triggered: false }];
    a.ctx.renderPriceAlertSection(); const h = a.ctx.document.els.priceAlertSection.innerHTML;
    assert.ok(!/<img|onerror|<b>X/.test(h), h.slice(0, 200)); assert.ok(/BTC\/USDT ≥ 1\.00/.test(h));
  });
  await T('B5 · Outils › 🔔 Alertes : un clic sur un seuil P&L re-rend la section VISIBLE (alertsSection2) — avant, le rendu allait au conteneur caché de l\'accueil et l\'interrupteur semblait mort', () => {
    const a = app({ document: fakeDoc(['alertsSection', 'alertsSection2']) });
    a.S.portfolio = 0; a.S.totalTrades = 0; a.S.perf = {};
    vm.runInContext(fnSrc(s04, '_initAlerts') + '\n' + fnSrc(s04, '_getGoals') + '\n' + fnSrc(s04, 'renderAlertsSection') + '\n' + fnSrc(s04, 'toggleAlert'), a.ctx);
    a.ctx.toggleAlert('tradeCount');
    assert.ok(a.ctx.document.els.alertsSection2.innerHTML.length > 100, 'section visible non re-rendue');
  });

  console.log('▶ C. clé CoinStats — n° 32');
  await T('C1 · 10e7 RÉEL : la clé est lue (S.newsApiKey, _newsHasKey) et ABSENTE de JSON.stringify(S) — _buildFullBackup, exports, backup d\'urgence, coffre, Guardian ; changée à l\'écran : idem ; réécrite énumérable par un vieux chemin : recachée', () => {
    const KEY = 'cle-banc-0123456789abcdef0123';
    const ls = storage({ aura_news_key: KEY }), ctx = { S: { cycle: 1 }, localStorage: ls, String, JSON, Object, Number };
    const m = s10e7.match(/const NEWS_KEY_LS\s*=[^\n]*/)[0];
    vm.createContext(ctx);
    vm.runInContext(m + '\n' + (has(s10e7, '_newsKeyHide') ? fnSrc(s10e7, '_newsKeyHide') : '') + '\n' + fnSrc(s10e7, '_newsKeyStore') + '\n' + fnSrc(s10e7, '_newsKeyLoad') + '\n' + fnSrc(s10e7, '_newsHasKey') + '\n_newsKeyLoad();', ctx);
    assert.strictEqual(ctx.S.newsApiKey, KEY); assert.strictEqual(vm.runInContext('_newsHasKey()', ctx), true);
    assert.ok(!JSON.stringify(ctx.S).includes(KEY), 'clé dans JSON.stringify(S)'); assert.ok(!JSON.parse(JSON.stringify(ctx.S)).newsApiKey, 'clone');
    assert.ok(Object.getOwnPropertyNames(ctx.S).includes('newsApiKey'), 'invisible pour le pont (17 masque par getOwnPropertyNames)');
    Object.defineProperty(ctx.S, 'newsApiKey', { value: KEY, writable: true, configurable: true, enumerable: true });
    vm.runInContext('_newsHasKey()', ctx); assert.ok(!JSON.stringify(ctx.S).includes(KEY), 'recachée');
    const up = s10e7.match(/function updateNewsApiKey\(val\) \{[\s\S]*?_newsKeyStore\(v\);/)[0];
    assert.ok(/_newsKeyHide\(v\)/.test(up) && !/S\.newsApiKey = v;/.test(up), 'updateNewsApiKey');
  });
  await T('C2 · « RESTAURER » (04 restoreBackup) et les imports n\'écrivent jamais newsApiKey (un vieux backup la porte encore)', () => {
    assert.ok(/if \(key === 'telegramCfg' \|\| key === 'newsApiKey'\) return;/.test(fnSrc(s04, 'restoreBackup')), 'restoreBackup');
    const nev = s04.match(/const AURA_IMPORT_NEVER_FIELDS = \[([\s\S]*?)\];/)[1]; assert.ok(/'newsApiKey'/.test(nev), 'imports');
  });

  console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + '/' + (pass + fail) + ' tests passés' + (fail ? ' — ' + fail + ' ÉCHEC(S)' : ''));
  process.exit(fail ? 1 : 0);
})();
