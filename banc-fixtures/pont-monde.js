// banc-fixtures/pont-monde.js — [PONT DIRECT · 11/10/2026] le « monde » où le pont est exécuté tel quel pour ses bancs : une vm avec
// horloge et minuteries simulées, un faux GitHub en mémoire (faux-github.js), un faux écran, un état S type avec les VRAIS portefeuilles
// et accesseurs de 02 (chaque accesseur compté, plus un piège), le VRAI habillage de fetch de 00 (celui qui pose window._auraLastOp),
// un localStorage journalisé. Tout ce que le pont lit (S, RT, _recStatus…) est créé DANS la vm, comme dans la page : même « royaume »
// que le code, donc mêmes prototypes. Utilisé par banc-pont-direct.js.
//   const M = require('./banc-fixtures/pont-monde.js')({ pont: <chemin de 17b>, lect: <chemin de 17> });   // défaut : js/
//   const X = M.monde({ ls: { … }, readyState: 'loading', sansGzip: true, … }) ; await X.activer(M.PAT_OK) ; await X.avancer(60000) ; …
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fauxGitHub = require('./faux-github.js');
const F17 = 'js/17-pont-lecture.js', F17B = 'js/17b-pont-direct.js';
module.exports = function (choix) {
choix = choix || {};
const PONT = choix.pont ? fs.readFileSync(path.resolve(choix.pont), 'utf8') : rd(F17B);
const LECT = choix.lect ? fs.readFileSync(path.resolve(choix.lect), 'utf8') : rd(F17);
const HTML = rd('AURA8_v118.html'), s02 = rd('js/02-state-init.js'), s10h = rd('js/10h-pont-fullpower-bricks.js'), s00 = rd('js/00-backup-state.js');
const TOK = (HTML.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const between = (s, a, b, incl) => { const i = s.indexOf(a); assert.ok(i >= 0, 'ancre début : ' + a.slice(0, 40)); assert.strictEqual(s.indexOf(a, i + 1), -1, 'ancre non unique : ' + a.slice(0, 40)); const j = s.indexOf(b, i + a.length); assert.ok(j > i, 'ancre fin : ' + b.slice(0, 40)); return s.slice(i, incl ? j + b.length : j); };
const codeStrict = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const PORTEFEUILLES = between(s02, 'function _freshWallet() {', 'try { _installWalletAccessors(); } catch(e){}', true);   // 02 RÉEL : portefeuilles par mode + accesseurs
const EXPORT_10H = between(s10h, 'function exportForClaude() {', 'window.exportForClaude = exportForClaude;', false);       // 10h RÉEL : l'enveloppe de référence
const FETCH_00 = between(s00, 'var _oFetch = window.fetch;', "if (typeof WebSocket !== 'undefined' && WebSocket.prototype) {", false);   // 00 RÉEL : l'habillage de fetch et son marqueur
const O = 'https://api.github.com/repos/ramizxhixha-a11y/', DEPOT = O + 'aura-pont', SONDE = O + 'aura/contents/' + F17B;
const T0 = Date.UTC(2026, 9, 11, 9, 45, 12), MIN = 60000, H = 3600000;
// Jetons d'essai fabriqués à l'exécution : le source ne porte aucun texte qui ressemble à un vrai jeton GitHub.
const G = ['github', 'pat', ''].join('_'), jeton = (c, fin) => G + c.repeat(22) + '_' + (fin + 'x'.repeat(59)).slice(0, 59);
const PAT_OK = jeton('A', 'BonPourAuraPontSeul'), PAT_LARGE = jeton('B', 'EcritAussiDansLeCode'), PAT_RO = jeton('C', 'LectureSeule'), PAT_AUTRE = jeton('D', 'AutreCompte'), PAT_MORT = jeton('E', 'ExpireOuRevoque');
const PAT_CLASSIQUE = ['ghp', 'ClassiqueTousLesDepots0123456789abcd'].join('_');
const JETONS = () => ({ [PAT_OK]: { pont: 'rw', code: null }, [PAT_LARGE]: { pont: 'rw', code: 'rw' }, [PAT_RO]: { pont: 'r', code: null }, [PAT_AUTRE]: { pont: null, code: null } });
const J = v => JSON.parse(JSON.stringify(v));
const reel = ms => new Promise(r => setTimeout(r, ms));
const horo = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return '' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + '-' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()); };   // la date (UTC) que porte le nom d'une demande

function etatType(t) {
  return { cycle: 1253765, cycleMax: 30, tradingMode: 'paperReal',
    agents: [{ id: 'whale_v1', name: 'Whale', fitness: 1200, score: 0.3 }, { id: 'flow_v1', name: 'Flow', fitness: 900, score: -0.1 }],
    chainLog: Array.from({ length: 50 }, (_, i) => ({ icon: '⏱', desc: 'ligne ' + i, hash: '0x' + i, time: '09:39:51', m: 'sim' })),
    perfLog: { gels: [{ t: t - 9e6, time: 'x', gap: 3.2, tickMs: 44, op: 'guardianDownload', loaf: { dur: 1442, scripts: [{ dur: 1389, src: '00-backup-state.js' }] } }],
      lent: [{ t: t - 8e6, time: 'x', name: 'timer setInterval@09b3-import-export.js:474', dur: 1408, phase: null }], heap: [{ t: t - 3e5, heap: 21, limit: 954, dom: 6750, cycle: 1253571, page: 3 }],
      boots: [{ t: t - 3.6e7, time: 'x', restored: true, cycle: 1235415, heap: 30, limit: 954, doc: null, prevSavedAt: '2026-10-10T21:34:39.021Z' }], loaf: [], net: [{ t: t - 4e4, ok: false, kind: 'error', status: 0, ms: 21, err: 'Failed to fetch' }] },
    tendance: { v: '20261007a', depuis: t - 4e8, pos: { 'BTC/USDT': { side: 'long', w: 1, x0: 60000 } }, dec: {}, hist: [], tot: { net: 0.0123, netL: 0.01, n: 3, win: 2, liq: 0 } },
    newsApiKey: 'CLE-COINSTATS-SECRETE-123', telegramCfg: { botToken: '123456:ABC-SECRET-TG', chatId: '42', enabled: false },
    _errStats: { 'x is not defined': 3 }, fiscalCfg: { commune: 7 } };
}
// Ce que l'app tient hors de S, créé dans la vm (mêmes champs que 01, 09a, 14, 15, 00 ; _tlStatus.tick est une DATE, 15:234).
const autour = t => ({
  RT: { SAVE_KEY: 'nexus_state_v2', _lastRealPriceTs: t - 12000 },
  _auraSimState: { interval: 7, running: true },
  AuraChrono: { state: { chronoSeconds: { sim: 100, paperReal: 200, real: 0 }, currentMode: 'paperReal', running: true, netStatus: 'online' } },
  _recStatus: { v: '20261004a', started: t - H, lines: 4200, flushes: 60, lastFlush: t - 30000, lost: 0, liqAttach: 1, files: ['EXTERNAL_STORAGE:Download/AURA/aura_guardian_full_rec-20261010.json'], dropped: [], err: null, warn: null },
  _tlStatus: { v: '20261007a', started: t - H, tick: t - 20000, running: true, err: null, errAt: 0, net: 0 },
  _auraSlowTimers: [{ name: 'timer setInterval@09b3-import-export.js:474', dur: 1408, at: t - 500000 }] });
const REMPLIR = `(function () {
  var w = S.walletStore.paperReal, T = Date.now();
  w.running = true; w.portfolio = 1085.46; w.tradingAccount = 900.5; w.cashAccount = 184.96; w.totalTrades = 342; w.winTrades = 180; w.pnl24h = -0.4;
  w.openPositions = [{ id: 'p1abc', pair: 'BTC/USDT', side: 'long', entryPrice: 61234.5678, openedAt: T - 120000, amount: 0.001, stakeUsdt: 50, pnl: 0.4217, pnlUsdt: 0.2108, auto: true, tp: 62000, sl: 60000, _openReason: 'x' },
    { id: 'p2', pair: 'PEPE/USDT', side: 'short', entryPrice: 0.00001234, openedAt: T - 60000, stakeUsdt: 25, pnl: -1.2, pnlUsdt: -0.3, auto: false }];
  w.pairStates = { 'BTC/USDT': { price: 61500, candles: [1, 2, 3], totalTrades: 12 } };
  S.walletStore.sim.running = true; S.walletStore.sim.portfolio = 1055.33; S.walletStore.sim.totalTrades = 1914;
  S.walletStore.real.portfolio = 1145.42;
})();`;
// Empreinte de S par ses DESCRIPTEURS (aucun accesseur appelé) : toute écriture, tout ajout, toute suppression la change.
function empreinte(o) {
  const vus = new Map(); let n = 0;
  const f = v => {
    if (v === null || typeof v !== 'object') return typeof v === 'function' ? 'fn' : (typeof v === 'number' ? String(v) : (JSON.stringify(v) || 'undefined'));
    if (vus.has(v)) return '#' + vus.get(v);
    vus.set(v, n++);
    const out = [];
    for (const k of Reflect.ownKeys(v)) { const d = Object.getOwnPropertyDescriptor(v, k); out.push(String(k) + (d.enumerable ? '' : '~') + ':' + ('value' in d ? f(d.value) : 'ACC')); }
    return (Array.isArray(v) ? '[' : '{') + out.join(',') + (Array.isArray(v) ? ']' : '}');
  };
  return f(o);
}

function monde(o) {
  o = o || {};
  const clock = { t: o.t0 || T0 }, timers = new Map(), stats = { intervals: [], alea: 0, toast: 0, decErr: 0, ops: [], acc: { get: 0, set: 0 } };
  let seq = 0;
  const ls = o.lsMap || new Map(Object.entries(o.ls || {})), lsJ = [];   // lsMap : un stockage PARTAGÉ (deux onglets de la même page)
  const localStorage = {
    getItem(k) { lsJ.push(['get', k]); if (o.lsMuet) throw new Error('SecurityError'); return ls.has(k) ? ls.get(k) : null; },
    setItem(k, v) { if (o.lsRefuse && (o.lsRefuse === true || o.lsRefuse === k)) throw new Error('QuotaExceededError'); lsJ.push(['set', k]); ls.set(k, String(v)); },
    removeItem(k) { lsJ.push(['del', k]); ls.delete(k); }
  };
  const gh = o.gh || fauxGitHub({ jetons: JETONS(), prive: o.prive });
  if (!o.gh) { gh.poser('LISEZMOI.md', '# aura-pont'); ['demandes', 'reponses', 'backups'].forEach(d => gh.poser(d + '/.gitkeep', '')); }
  const els = {}, docL = [], winL = [], sorties = [], appels = [];
  const mkEl = tag => ({ tag, id: '', style: {}, value: '', textContent: '', _html: '',
    set innerHTML(h) { this._html = h; for (const m of h.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) { const e = mkEl(m[1]); e.id = m[2]; const ds = /style="[^"]*display:(\w+)/.exec(m[0]); if (ds) e.style.display = ds[1]; els[m[2]] = e; } },
    get innerHTML() { return this._html; },
    insertAdjacentElement(pos, e) { this._apres = e; e._avant = this; e._pos = pos; if (e.id) els[e.id] = e; } });
  const tabs = o.sansOnglets ? null : mkEl('div');
  if (o.barre10h) { els.claudeExportBar = mkEl('div'); els.claudeExportBar.id = 'claudeExportBar'; }
  const document = { readyState: o.readyState || 'complete', visibilityState: 'visible', currentScript: null,
    scripts: [{ src: 'https://h/aura/js/02-state-init.js?v=' + TOK }, { src: 'https://h/aura/js/17b-pont-direct.js?v=' + TOK }, { src: '' }],
    addEventListener(t, f, opt) { docL.push([t, f, opt]); }, getElementById: id => els[id] || null,
    querySelector: sel => (sel === '#outilsPanel .outils-tabs' ? tabs : null), createElement: mkEl };
  const c = { __clock: clock, __stats: stats,
    console: { log: (...a) => sorties.push(a.map(String).join(' ')), warn: (...a) => sorties.push(a.map(String).join(' ')), error: (...a) => sorties.push(a.map(String).join(' ')) },
    localStorage, document, navigator: { onLine: true, userAgent: 'banc/1.0', language: 'fr-BE', storage: { estimate: () => Promise.resolve({ usage: 1234, quota: 5678 }) }, connection: { type: 'wifi', effectiveType: '4g', rtt: 50, downlink: 9.5, saveData: false } },
    TextEncoder, TextDecoder, btoa, atob, AbortController, Blob, Response, Storage: class Storage {}, Node: class Node {},
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fn, due: clock.t + Math.max(0, Number(ms) || 0), every: 0 }); return id; },
    setInterval: (fn, ms) => { const id = ++seq, p = Math.max(1, Number(ms) || 1); timers.set(id, { fn, due: clock.t + p, every: p }); stats.intervals.push(p); return id; },
    clearTimeout: id => { timers.delete(id); }, clearInterval: id => { timers.delete(id); },
    fetch: (u, i) => { appels.push({ t: clock.t, m: (i && i.method) || 'GET', url: String(u) }); return gh.fetch(u, i); },
    addEventListener: (t, f) => { winL.push([t, f]); }, removeEventListener: (t, f) => { const k = winL.findIndex(x => x[0] === t && x[1] === f); if (k >= 0) winL.splice(k, 1); },
    performance: { memory: { usedJSHeapSize: 21 * 1048576, totalJSHeapSize: 30 * 1048576, jsHeapSizeLimit: 954 * 1048576 } }, innerWidth: 800, innerHeight: 1280, devicePixelRatio: 2,
    _stateReady: true, _auraNetOffline: false,
    showToast: () => { stats.toast++; }, _decErr: () => { stats.decErr++; } };
  if (!o.sansGzip) c.CompressionStream = CompressionStream;
  if (o.natif !== false) c.Capacitor = { Plugins: {} };
  c.window = c;
  vm.createContext(c);
  // localStorage bâti DANS la vm (objet simple de ce royaume, comme… aucun objet de l'app) : seule la garde par identité de 17 (interdit) l'empêche d'être ouvert
  c.__ls = localStorage; vm.runInContext('(function (L) { window.localStorage = { getItem: function (k) { return L.getItem(k); }, setItem: function (k, v) { return L.setItem(k, v); }, removeItem: function (k) { return L.removeItem(k); } }; })(__ls); delete window.__ls;', c);
  vm.runInContext('(function () { const C = __clock, RD = Date; class FD extends RD { constructor(...a) { if (!a.length) super(C.t); else super(...a); } static now() { return C.t; } } globalThis.Date = FD; Math.random = function () { __stats.alea++; return 0.5; }; })();', c);
  vm.runInContext('Object.assign(window, ' + JSON.stringify(autour(clock.t)) + ');\nlet _wakeLockEnabled = true, _wakeLockSentinel = null;\n'
    + 'window._perfOp = function (name) { __stats.ops.push(String(name)); window._auraLastOp = { name: String(name), at: Date.now() }; };', c);   // _perfOp : celui de 08 (il pose le marqueur), compté
  if (!o.sans00) vm.runInContext('(function () { var _now = function () { return Date.now(); };\n' + FETCH_00 + '\n})();', c, { filename: 'js/00-backup-state.js#fetch' });
  if (o.S !== null) {
    vm.runInContext('const S = ' + JSON.stringify(o.S || etatType(clock.t)) + ';\nconst PAIRS = {};', c);
    vm.runInContext(PORTEFEUILLES, c, { filename: 'js/02-state-init.js#portefeuilles' });
    vm.runInContext(REMPLIR, c);
    // chaque accesseur réel de 02 est compté ; un piège de plus : un accesseur qui marquerait S s'il était lu
    vm.runInContext("_WALLET_ACCESSOR_FIELDS.forEach(function (f) { var d = Object.getOwnPropertyDescriptor(S, f); Object.defineProperty(S, f, { configurable: true, enumerable: true, get: function () { __stats.acc.get++; return d.get.call(S); }, set: function (v) { __stats.acc.set++; d.set.call(S, v); } }); });" +
      "Object.defineProperty(S, 'piege', { configurable: true, enumerable: true, get: function () { __stats.acc.get++; S._piegeTouche = true; return 1; } });", c);
    // buildSnapshot : un BOUCHON (la vraie, 09b1, lit les accesseurs de 02 comme le fait la sauvegarde automatique : elle n'est pas rejouée ici)
    vm.runInContext("function buildSnapshot() { return { key: RT.SAVE_KEY, savedAt: new Date().toISOString(), version: 2, cycle: S.cycle, walletStore: S.walletStore, agents: S.agents, chainLog: S.chainLog, tendance: S.tendance }; } window.buildSnapshot = buildSnapshot;", c);
    stats.acc.get = stats.acc.set = 0;
  }
  const charger = () => {
    document.currentScript = { src: 'https://ramizxhixha-a11y.github.io/aura/' + F17 + '?v=' + TOK };
    if (!o.sansLecture) vm.runInContext(o.lect || LECT, c, { filename: F17 });
    document.currentScript = { src: 'https://ramizxhixha-a11y.github.io/aura/' + F17B + '?v=' + TOK };
    vm.runInContext(o.src || PONT, c, { filename: F17B });
    document.currentScript = null;
  };
  const vider = async () => { for (let i = 0; i < 14; i++) await new Promise(r => setImmediate(r)); };
  const avancer = async ms => {
    const fin = clock.t + ms;
    for (;;) {
      await vider();
      let nid = 0, nt = Infinity;
      for (const [id, t] of timers) if (t.due <= fin && t.due < nt) { nt = t.due; nid = id; }
      if (!nid) break;
      const t = timers.get(nid); if (t.due > clock.t) clock.t = t.due;
      if (t.every) t.due += t.every; else timers.delete(nid);
      t.fn();
    }
    clock.t = fin; await vider();
  };
  const X = { c, gh, clock, timers, stats, ls, lsJ, els, tabs, docL, winL, sorties, appels, vider, avancer, run: s => vm.runInContext(s, c) };
  X.st = () => c._pontStatus;
  X.activer = async (pat, ms) => { els.pontDirectPat.value = pat; c.pontDirectActiver(); await vider(); await avancer(ms === undefined ? 2000 : ms); };   // 2 s : l'écart entre la sonde (une écriture refusée) et etat.json
  X.jusqua = async (pred, pas, max) => { for (let i = 0; i < (max || 400) && !pred(); i++) { await avancer(pas || 1000); await reel(1); } assert.ok(pred(), 'attendu non atteint en ' + (max || 400) + ' pas'); };
  // Une demande : son NOM porte la date du dépôt (défaut : l'horloge simulée), son corps la date t (défaut : la même horloge).
  X.nom = (n, quand) => horo(quand === undefined ? clock.t : quand) + '-t' + String(1000 + n).slice(1);
  X.demande = (n, cmd, args, extra, quand) => { const id = X.nom(n, quand); gh.poser('demandes/' + id + '.json', JSON.stringify(Object.assign({ id, cmd, t: clock.t, args }, extra || {}))); return id; };
  X.rep = id => { const t = gh.texte('reponses/' + id + '.json'); return t === null ? null : JSON.parse(t); };
  X.puts = re => gh.journal.filter(r => r.m === 'PUT' && (!re || re.test(r.url)));
  X.lusDem = () => gh.journal.filter(r => r.m === 'GET' && /contents\/demandes\/.+/.test(r.url)).length;   // demandes LUES (une par une)
  if (!o.sansCharger) charger(); else X.charger = charger;
  return X;
}
return { monde, empreinte, etatType, fauxGitHub, between, codeStrict, rd, J, reel, horo, ROOT, F17, F17B, PONT, LECT, HTML, TOK, O, DEPOT, SONDE, T0, MIN, H, EXPORT_10H,
  PAT_OK, PAT_LARGE, PAT_RO, PAT_AUTRE, PAT_MORT, PAT_CLASSIQUE, JETONS };
};
