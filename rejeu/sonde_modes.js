// [OUTILS · 10/10/2026] VERSION 20261010a · sonde_modes.js — SONDE NAVIGATEUR DES MODES : l'app RÉELLE (AURA8_v118.html + js/) sous horloge simulée, état de
// départ = un backup Guardian TEL QUEL (mode à l'écran et modes en play du backup, ou --screen). Écrite pour la mission ÉCOLE VIVANTE (backup du 10/10 : que
// fait l'AA quand elle tourne derrière l'EV ?) puis durcie par la relecture adverse. Cousine de rejeu/harness.js (qui rejoue des bougies réelles, EV / RE) :
// ici rien n'est rejoué, on regarde ce que font les modes entre eux. Lecture seule : aucune écriture disque dans la page (saveState neutralisé).
//   node rejeu/sonde_modes.js --root <dossier du code> --backup <aura_guardian_full_….json> --out <fichier.json> [--hours 2] [--port 8911] [--seed 1]
//     [--screen paperReal|sim|real]   mode mis à l'écran (défaut : paperReal)
//     [--flush 1]                     les suites asynchrones (réponse CoinGecko) sont traitées à chaque seconde simulée : le prix arrive toutes les ~15 s comme dans
//                                     l'app (sans : une fois par minute simulée, sonde plus calme que la réalité)
//     [--cgchg backup|<%>]            variation 24 h de la réponse CoinGecko simulée : celle du backup par paire, ou un nombre (02 en tire l'amplitude du hasard de l'AA)
//     [--jump "min:pct,…"]            saut du marché réel (prix reçu + flux réel) à la minute donnée
//     [--force PAIRE:long|short]      ouvre UNE position AUTO dans l'AA par l'entonnoir réel (09c autoOpenPosition), l'AA restant où elle est
//     [--evtest "min,…"]              à ces minutes, essai d'ouverture EV par l'entonnoir réel (BTC long) : passe-t-il les gardes communes ?
//     [--switch "min:mode,…"]         bascule d'écran par le vrai bouton (cycleTradeMode) à la minute donnée (ex. "4:paperReal,8:sim")
//     [--pausesim 1]                  AA mise en pause avant la mesure (témoin)   [--split 1] deux suites de hasard (contexte sim / autres)
//     [--dump <fichier>]              état complet (hors portefeuille AA) pour comparer deux versions du code
// Mesure : trades et prix de l'AA (dont fermetures au prix d'entrée exact), portefeuille EV, cycles par mode, temps de calcul du battement, exceptions qui
// interrompent le battement, déclenchements de l'anti-revenge et secondes bloquées, relectures du cache des signaux fondamentaux par un AUTRE mode (par identité de
// l'objet rendu), toasts et jalons par contexte. Réseau : le ping Binance répond, CoinGecko est simulé (prix EV du backup), tout le reste échoue tout de suite.
// Exemple (la preuve du 10/10) : avant → « prix AA 0,000 % sur 13 paires, 7 223 cycles en 8 h » ; --force PEPE/USDT:short --jump 2:3 --evtest 1,6,10 → l'AA perd
// 2,3 %, l'anti-revenge ne doit PAS s'armer et l'essai EV de la minute 6 doit passer.
'use strict';
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { for (const p of ['/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/usr/local/lib/node_modules_global/playwright']) { try { ({ chromium } = require(p)); break; } catch (_) {} } }
if (!chromium) { console.error('playwright introuvable (installé globalement dans l\'image : ne pas lancer playwright install)'); process.exit(2); }
const http = require('http'), fs = require('fs'), path = require('path');
const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const ROOT = path.resolve(args.root), BACKUP = args.backup, OUT = args.out;
const HOURS = Number(args.hours || 2), PORT = Number(args.port || 8911), SEED = Number(args.seed || 1), SCREEN = args.screen || 'paperReal';
const FORCE = args.force || '', CGCHG = args.cgchg || '0.5', FLUSH = args.flush === '1', SPLIT = args.split === '1', DUMP = args.dump || '';
const JUMPS = (args.jump || '').split(',').filter(Boolean).map(s => { const [m, p] = s.split(':'); return { min: Number(m), pct: Number(p) }; });
const PAUSE_SIM = args.pausesim === '1';
const EVTEST = (args.evtest || '').split(',').filter(Boolean).map(Number);   // minutes où l'on tente une ouverture EV par l'entonnoir réel (09c autoOpenPosition)   // met l'AA en pause avant la mesure (témoin)
const SWITCH = (args['switch'] || '').split(',').filter(Boolean).map(x => { const [m, md] = x.split(':'); return { min: Number(m), mode: md }; });   // bascule d'écran par le vrai bouton (cycleTradeMode) à la minute donnée
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];
const CG = { BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana', DOGE: 'dogecoin', DOT: 'polkadot', ADA: 'cardano', AVAX: 'avalanche-2', LINK: 'chainlink', BNB: 'binancecoin', PEPE: 'pepe' };

(async () => {
  const env = JSON.parse(fs.readFileSync(BACKUP, 'utf8')), st = env.aura;
  const tBoot = Date.parse(env.savedAt);
  const evPS = st.walletStore.paperReal.pairStates;
  const cg = {}; Object.keys(CG).forEach(b => { const ps = evPS[b + '/USDT']; if (ps && ps.price > 0) cg[CG[b]] = { usd: ps.price, usd_24h_change: CGCHG === 'backup' ? Number(ps.pnl24h) || 0 : Number(CGCHG) }; });
  const eur = evPS['EUR/USDT'] && evPS['EUR/USDT'].price; cg.tether = { usd: 1, usd_24h_change: 0, eur: eur > 0 ? 1 / eur : 0.89, eur_24h_change: CGCHG === 'backup' ? -(Number(evPS['EUR/USDT'].pnl24h) || 0) : 0, gbp: 0.75, gbp_24h_change: 0 };
  st.tradingMode = SCREEN;
  const stateStr = JSON.stringify(st);
  const init = `(() => {
    const RealDate = Date; let simNow = ${tBoot};
    const __realST = window.setTimeout.bind(window);
    window.__yield = () => new Promise(r => __realST(r, 0));
    function SimDate(...a) { if (!new.target) return new RealDate(simNow).toString(); return a.length ? new RealDate(...a) : new RealDate(simNow); }
    Object.setPrototypeOf(SimDate, RealDate); SimDate.prototype = RealDate.prototype;
    SimDate.now = () => simNow; SimDate.UTC = RealDate.UTC; SimDate.parse = RealDate.parse;
    window.Date = SimDate;
    function mk(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    const rB = mk(${SEED}), rA = mk(${SEED} * 7919 + 13), SPLIT = ${SPLIT ? 'true' : 'false'};
    window.__rng = { a: 0, b: 0 };
    Math.random = function () { if (SPLIT) { let sim = false; try { sim = (S && S.tradingMode === 'sim'); } catch (e) {} if (sim) { window.__rng.a++; return rA(); } } window.__rng.b++; return rB(); };
    let seq = 1; const T = new Map();
    window.setTimeout = function (fn, ms, ...a) { const id = seq++; T.set(id, { fn, a, due: simNow + Math.max(0, Number(ms) || 0), every: 0, ms: Number(ms) || 0 }); return id; };
    window.setInterval = function (fn, ms, ...a) { const id = seq++; const p = Math.max(1, Number(ms) || 1); T.set(id, { fn, a, due: simNow + p, every: p, ms: p }); return id; };
    window.clearTimeout = window.clearInterval = function (id) { T.delete(id); };
    window.__advanceTo = function (toT) {
      let fired = 0;
      for (;;) {
        let nid = 0, nt = Infinity;
        for (const [id, t] of T) { if (t.due <= toT && t.due < nt) { nt = t.due; nid = id; } }
        if (!nid) break;
        const t = T.get(nid); if (t.due > simNow) simNow = t.due;
        if (t.every) t.due += t.every; else T.delete(nid);
        try { if (typeof t.fn === 'function') t.fn(...t.a); } catch (e) { const L = (window.__terr = window.__terr || []); if (L.length < 400) L.push(String(e && e.message || e).slice(0, 200) + ' @ ' + String(e && e.stack || '').split('\\n').slice(1, 3).join(' | ').slice(0, 200)); }
        if (++fired > 500000) break;
      }
      if (toT > simNow) simNow = toT; return fired;
    };
    const CG0 = ${JSON.stringify(cg)}, JUMPS = ${JSON.stringify(JUMPS)};
    window.__tStart = 0;
    window.__mk = function (t) { let k = 1; if (window.__tStart) JUMPS.forEach(j => { if (t - window.__tStart >= j.min * 60000) k *= (1 + j.pct / 100); }); return k; };
    const _fetch = window.fetch.bind(window);
    window.__cgCalls = 0; window.__cgDone = 0;
    window.fetch = function (input, init) {
      const u = String((input && input.url) || input || '');
      if (u.indexOf('/api/v3/ping') >= 0) return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if (u.indexOf('api.coingecko.com/api/v3/simple/price') >= 0) {
        window.__cgCalls++;
        const k = window.__mk(simNow), d = {};
        Object.keys(CG0).forEach(id => { const o = Object.assign({}, CG0[id]); if (id !== 'tether') o.usd = o.usd * k; d[id] = o; });
        return Promise.resolve(new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if ((u.indexOf('http://') === 0 || u.indexOf('https://') === 0) && u.indexOf('http://127.0.0.1') !== 0) return Promise.reject(new TypeError('Failed to fetch'));
      return _fetch(input, init);
    };
    window.__now = () => simNow; window.__timerCount = () => T.size;
    window.__dropTimers = function (pred) { let n = 0; for (const [id, t] of T) { if (pred(t)) { T.delete(id); n++; } } return n; };
    try {
      if (!sessionStorage.getItem('__sonde')) {
        localStorage.clear();
        localStorage.setItem('nexus_state_v2', ${JSON.stringify(stateStr)});
        localStorage.setItem('aura_highwater_cycle', '${Number(st.cycle) || 0}');
        localStorage.setItem('aura_current_trade_mode', '${SCREEN}');
        ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1'));
        sessionStorage.setItem('__sonde', '1');
      }
    } catch (e) { window.__initErr = String(e); }
  })();`;
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch(); global.__br = browser;
  const ctx = await browser.newContext({ viewport: { width: 600, height: 960 } });
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue(); return route.abort(); });
  await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const perr = [], cerr = [];
  page.on('pageerror', e => { if (perr.length < 60) perr.push(String(e && e.message || e).slice(0, 240)); });
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && cerr.length < 60) { if (!/net::ERR_FAILED|Failed to load resource|ERR_BLOCKED|WebSocket/.test(t)) cerr.push(t.slice(0, 240)); } });
  const W0 = Date.now();
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  let ready = false;
  for (let i = 0; i < 1500 && !ready; i++) {
    ready = await page.evaluate(() => { window.__advanceTo(window.__now() + 100); return !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length > 0); });
    if (i % 10 === 0) await page.waitForTimeout(3);
  }
  if (!ready) { console.error('état non restauré', await page.evaluate(() => window.__initErr || null)); await browser.close(); server.close(); process.exit(3); }
  for (let i = 0; i < 150; i++) { await page.evaluate(() => window.__advanceTo(window.__now() + 1000)); if (i % 10 === 0) await page.waitForTimeout(3); }
  const setup = await page.evaluate(({ SCREEN, FORCE, PAUSE_SIM }) => {
    const out = {};
    window.__dropTimers(t => t.every && t.every < 1000);
    out.mode0 = S.tradingMode;
    try { out.docV = (document.documentElement.innerHTML.match(/DOC_V = '([0-9a-z]+)'/) || [])[1]; } catch (e) {}
    try { window.AuraChrono && window.AuraChrono.setMode(SCREEN); } catch (e) { out.chronoErr = String(e); }
    try { window.AuraChrono.state.netStatus = 'online'; } catch (e) {}
    if (PAUSE_SIM) { try { _setModeRunning('sim', false); } catch (e) {} }
    out.running = { sim: _isModeRunning('sim'), paperReal: _isModeRunning('paperReal'), real: _isModeRunning('real') };
    out.pairsKeys = Object.keys(PAIRS);
    S.currentPage = 0;
    ['saveState', 'saveStateNow', '_saveStateDebounced', 'scheduleSave'].forEach(n => { if (typeof window[n] === 'function') window[n] = function () {}; });
    window.__ms = { tick: 0, n: 0, cyc: {}, max: 0 };
    // ── instrumentation ──
    const I = window.__I = { rvTrig: [], ao: {}, rvSec: 0, secs: 0, fc: { hit: 0, miss: 0, x: {}, xCore: [], }, evDec: [], closes: [], revengeDom: null, toasts: { sim: 0, other: 0 }, milestones: [] };
    const rvState = new Function('try{return [_rvActive,_rvEndTime]}catch(e){return [null,0]}'); window.__rvState = rvState;
    const getFC = new Function('try{return _fundCache}catch(e){return null}');
    try { const _tr = window.triggerAntiRevenge; window.triggerAntiRevenge = function (pnlUsd, pct, pair, n) { I.rvTrig.push({ t: window.__now(), mode: S.tradingMode, bg: window._bgResolve === true, pnlUsd: pnlUsd, pct: pct, pair: pair, streak: n }); return _tr.apply(this, arguments); }; } catch (e) { out.eTrig = String(e); }
    try { const _ao = window.autoOpenPosition; window.autoOpenPosition = function (pair, side, stv) { const rs = rvState(), blk = !!(rs[0] && Date.now() < rs[1]); const k = S.tradingMode + (blk ? ':bloqué' : ':libre'); I.ao[k] = (I.ao[k] || 0) + 1; return _ao.apply(this, arguments); }; } catch (e) { out.eAo = String(e); }
    try { const _cp = window.closePosition; window.closePosition = function (id, bc) { const pos = (S.openPositions || []).find(p => p.id === id); const m = S.tradingMode, bg = window._bgResolve === true; const n0 = (S.openPositions || []).length; const r = _cp.apply(this, arguments); if (pos && (S.openPositions || []).length < n0) { const ps = S.pairStates[pos.pair], tr = ps && ps.trades && ps.trades[ps.trades.length - 1]; I.closes.push({ t: window.__now(), mode: m, bg: bg, pair: pos.pair, side: pos.side, pnl: tr ? tr.pnl : null, usd: tr ? tr.pnlUsdt : null, stake: pos.stakeUsdt }); } return r; }; } catch (e) { out.eCp = String(e); }
    try { const _st = window.showToast; if (typeof _st === 'function') window.showToast = function () { if (S.tradingMode === 'sim') I.toasts.sim++; else I.toasts.other++; return _st.apply(this, arguments); }; } catch (e) {}
    try { const _sm = window.showMilestone; if (typeof _sm === 'function') window.showMilestone = function (ic, tx) { if (I.milestones.length < 50) I.milestones.push({ t: window.__now(), mode: S.tradingMode, bg: window._bgResolve === true, tx: String(tx).slice(0, 80) }); return _sm.apply(this, arguments); }; } catch (e) {}
    // générateur et mélange : appels par seconde simulée, par contexte (mode traité / mode à l'écran)
    I.gen = { calls: {}, maxPerSec: 0, secs: {}, pushes: {}, anchors: {} };
    const _disp = () => { try { return window.AuraChrono.getCurrentMode(); } catch (e) { return '?'; } };
    try { const _g = window._simCandleStep; if (typeof _g === 'function') window._simCandleStep = function () { const k = 'traité ' + S.tradingMode + ' / écran ' + _disp(); I.gen.calls[k] = (I.gen.calls[k] || 0) + 1; const sec = Math.round(window.__now() / 1000); I.gen.secs[sec] = (I.gen.secs[sec] || 0) + 1; if (I.gen.secs[sec] > I.gen.maxPerSec) I.gen.maxPerSec = I.gen.secs[sec]; const ks = Object.keys(I.gen.secs); if (ks.length > 50) delete I.gen.secs[ks[0]]; return _g.apply(this, arguments); }; } catch (e) {}
    try { const _b = window.blendRealPrices; window.blendRealPrices = function () { const k = 'mélange : traité ' + S.tradingMode + ' / écran ' + _disp(); I.gen.calls[k] = (I.gen.calls[k] || 0) + 1; return _b.apply(this, arguments); }; } catch (e) {}
    try { const _a = window._schoolBgAnchor; if (typeof _a === 'function') window._schoolBgAnchor = function () { const r = _a.apply(this, arguments); const k = (r ? 'posé' : 'rien') + ' : S.tradingMode ' + S.tradingMode + ' / écran ' + _disp() + ' / AA en play ' + _isModeRunning('sim'); I.gen.anchors[k] = (I.gen.anchors[k] || 0) + 1; return r; }; } catch (e) {}
    // cache fondamental : qui a calculé l'entrée (mode), qui la relit
    const fcBy = {};
    window.__inCore = null;
    // (mesure par IDENTITÉ de l'objet rendu : « servi par le cache » = la fonction rend l'objet qui était en cache avant l'appel — valable avant et après la clé par mode)
    try { const _gf = window.getFundamentalSignals; window.getFundamentalSignals = function (pair) {
      const fc = getFC(), before = (fc && fc[pair]) ? fc[pair].val : null;
      const r = _gf.apply(this, arguments);
      const served = !!(before && r === before);
      if (!served) { if (r) fcBy[pair] = { mode: S.tradingMode }; I.fc.miss++; return r; }
      I.fc.hit++;
      const w = fcBy[pair] ? fcBy[pair].mode : '?', rd = S.tradingMode;
      if (w === '?') { I.fc.pre = (I.fc.pre || 0) + 1; return r; }   // entrée calculée avant la pose de la mesure (premières secondes) : auteur inconnu, comptée à part
      if (w !== rd) { const k = w + '→' + rd + (window.__inCore ? ':cycle' : ':autre'); I.fc.x[k] = (I.fc.x[k] || 0) + 1;
        if (window.__inCore && rd !== 'sim') { const saved = fc[pair]; let fresh = null; try { delete fc[pair]; fresh = _gf.call(this, pair); } catch (e) {} fc[pair] = saved; if (I.fc.xCore.length < 5000) I.fc.xCore.push({ t: window.__now(), pair: pair, w: w, rd: rd, cached: saved.val.fundScore, fresh: fresh ? fresh.fundScore : null }); } }
      return r; }; } catch (e) { out.eGf = String(e); }
    try { const _rc = window._resolvePairCycleCore; if (typeof _rc === 'function') window._resolvePairCycleCore = function (pair, ps) { const k = S.tradingMode; (window.__cyc = window.__cyc || {})[k] = ((window.__cyc || {})[k] || 0) + 1; const prev = window.__inCore; window.__inCore = k; const t0 = performance.now(); try { return _rc.apply(this, arguments); } finally { window.__inCore = prev; window.__ms.cyc[k] = (window.__ms.cyc[k] || 0) + (performance.now() - t0);
        if (k !== 'sim' && I.evDec.length < 20000) I.evDec.push([window.__now(), k, pair, ps && ps._voteSnap ? ps._voteSnap.comp : null, ps && ps._dc ? ps._dc.C : null, ps ? ps.lastAction : null, S.cycle]); } }; } catch (e) {}
    try { if (window._auraSimState && window._auraSimState.interval) { clearInterval(window._auraSimState.interval); window._auraSimState.running = false; } } catch (e) {}
    window.__tickFn = function () { const t0 = performance.now(); try { simTick(); } catch (e) { window.__tickErr = (window.__tickErr || 0) + 1; const L = (window.__terr = window.__terr || []); if (L.length < 400) L.push('simTick: ' + String(e && e.message || e).slice(0, 200) + ' @ ' + String(e && e.stack || '').split('\n').slice(1, 3).join(' | ').slice(0, 240)); } const d = performance.now() - t0; window.__ms.tick += d; window.__ms.n++; if (d > window.__ms.max) window.__ms.max = d; };
    window._auraSimState = window._auraSimState || {};
    if (!window._auraSimState.running) {
      window._auraSimState.interval = setInterval(window.__tickFn, 1000);
      window._auraSimState.running = true;
      try { new Function('try{_simRunning=true;_simEverStarted=true;_simInterval=window._auraSimState.interval}catch(e){}')(); } catch (e) {}
      out.engine = 'démarré par la sonde';
    } else out.engine = 'déjà en marche';
    const snap = m => { const W = S.walletStore[m], f = W.fees || {}; return { cash: W.cashAccount, trading: W.tradingAccount, portfolioField: W.portfolio, computed: _computePortfolio(W), open: (W.openPositions || []).length, count: f.tradeCount || 0, pnlNet: f.totalPnlNet || 0, pnlGross: f.totalPnlGross || 0, fees: (f.totalTradingFees || 0) + (f.totalSlippage || 0), totalTrades: W.totalTrades || 0 }; };
    out.start = { sim: snap('sim'), paperReal: snap('paperReal') };
    window.__snap = snap;
    window.__px0 = {}; Object.keys(S.walletStore.sim.pairStates).forEach(p => { window.__px0[p] = S.walletStore.sim.pairStates[p].price; });
    window.__fip = new Function('try{return _fetchInProgress}catch(e){return false}');
    out.t = window.__now(); window.__tStart = out.t;
    out.cycle0 = S.cycle; out.rv0 = rvState();
    out.revengeDom = !!document.getElementById('revengeBlock');
    if (FORCE) {
      const [fp, fs_] = FORCE.split(':'), disp = S.tradingMode;
      try {
        S.tradingMode = 'sim'; window._bgResolve = (disp !== 'sim');
        autoOpenPosition(fp, fs_);
        const q = (S.openPositions || []).find(x => x.pair === fp);
        out.force = q ? { pair: q.pair, side: q.side, auto: q.auto, entry: q.entryPrice, stake: q.stakeUsdt, tp: q.tp, sl: q.sl } : { refused: true, chain: (S.chainLog || []).slice(-3).map(c => c.desc) };
      } catch (e) { out.force = { err: String(e && e.message || e) }; }
      S.tradingMode = disp; window._bgResolve = false;
    }
    return out;
  }, { SCREEN, FORCE, PAUSE_SIM });
  const tStart = setup.t, nMin = Math.round(HOURS * 60);
  const EVP = Object.fromEntries(Object.keys(evPS).filter(p => p !== 'GBP/USDT').map(p => [p, evPS[p].price]));
  for (let m = 0; m < nMin; m++) {
    await page.evaluate(async ({ EVP, FLUSH }) => {
      const t0 = window.__now(), I = window.__I;
      for (let s = 0; s < 60; s++) {
        const k = window.__mk(t0 + s * 1000);
        for (const p in EVP) { try { window._aggregateRealPrice(p, p === 'EUR/USDT' ? EVP[p] : EVP[p] * k, t0 + s * 1000); } catch (e) {} }
        if (!(window._auraSimState && window._auraSimState.running)) {
          window.__engineStops = (window.__engineStops || 0) + 1;
          window._auraSimState.interval = setInterval(window.__tickFn, 1000); window._auraSimState.running = true;
          try { new Function('try{_simRunning=true;_simInterval=window._auraSimState.interval}catch(e){}')(); } catch (e) {}
        }
        window.__advanceTo(t0 + (s + 1) * 1000);
        if (FLUSH) { for (let i = 0; i < 12; i++) { await window.__yield(); if (!window.__fip()) break; } }
        const rs = window.__rvState(); I.secs++; if (rs[0] && window.__now() < rs[1]) I.rvSec++;
      }
    }, { EVP, FLUSH });
    for (const sw of SWITCH) if (sw.min === m + 1) {
      const r = await page.evaluate((target) => { const out = { de: S.tradingMode }; let n = 0; while (window.AuraChrono.getCurrentMode() !== target && n++ < 4) window.cycleTradeMode(); out.a = S.tradingMode; out.chrono = window.AuraChrono.getCurrentMode(); out.run = { sim: _isModeRunning('sim'), paperReal: _isModeRunning('paperReal') }; out.engine = !!(window._auraSimState && window._auraSimState.running); out.nc = {}; ['BTC/USDT', 'BNB/USDT'].forEach(p => { out.nc[p] = S.walletStore.sim.pairStates[p].candles.length; }); out.min = Math.round((window.__now() - window.__tStart) / 60000); return out; }, sw.mode);
      (global.__switches = global.__switches || []).push(r);
    }
    if (EVTEST.indexOf(m + 1) >= 0) {
      const r = await page.evaluate((pairT) => {
        const out = { min: Math.round((window.__now() - window.__tStart) / 60000), mode: S.tradingMode, rv: window.__rvState().slice(), now: window.__now() };
        out.rvActive = !!(out.rv[0] && out.now < out.rv[1]);
        let reached = 0; const _pp = window._isPairPaused; window._isPairPaused = function () { reached++; return _pp.apply(this, arguments); };
        const n0 = (S.openPositions || []).length, auto = S.botAutoMode, net = S._netPaused;
        let ret; try { ret = autoOpenPosition(pairT, 'long'); } catch (e) { out.err = String(e && e.message || e); }
        window._isPairPaused = _pp;
        out.botAutoMode = auto; out.netPaused = net; out.reachedPairGate = reached > 0; out.opened = (S.openPositions || []).length - n0;
        out.lastChain = (S.chainLog || []).slice(-2).map(c => c.desc);
        // on referme tout de suite une éventuelle position ouverte par l'essai (pour ne pas changer la suite)
        return out;
      }, 'BTC/USDT');
      (global.__evtests = global.__evtests || []).push(r);
    }
    if (m % 30 === 29) process.stderr.write('  ' + (m + 1) + '/' + nMin + ' min simulées · ' + Math.round((Date.now() - W0) / 1000) + ' s\n');
    await page.waitForTimeout(1);
  }
  const result = await page.evaluate(({ tStart, wantDump }) => {
    const out = {};
    out.mode = S.tradingMode;
    out.end = { sim: window.__snap('sim'), paperReal: window.__snap('paperReal') };
    const WS = S.walletStore.sim, WE = S.walletStore.paperReal;
    const tr = [];
    Object.entries(WS.pairStates).forEach(([p, ps]) => (ps.trades || []).forEach(t => { if (t && t.ts >= tStart && t.type === 'position') tr.push({ pair: p, side: t.side, ts: t.ts, entry: t.entryPrice, exit: t.price, pnl: t.pnl, pnlUsdt: t.pnlUsdt, hold: t.entryTs ? Math.round((t.ts - t.entryTs) / 60000) : null }); }));
    tr.sort((a, b) => a.ts - b.ts); out.simTrades = tr;
    out.simMoved = {}; Object.keys(WS.pairStates).forEach(p => { const a = window.__px0[p], b = WS.pairStates[p].price; out.simMoved[p] = { de: a, a: b, pct: a > 0 ? (b / a - 1) * 100 : null, nc: (WS.pairStates[p].candles || []).length }; });
    out.evTrades = Object.values(WE.pairStates).reduce((n, ps) => n + (ps.trades || []).filter(t => t && t.ts >= tStart).length, 0);
    out.cyc = window.__cyc || {}; out.cgCalls = window.__cgCalls; out.engineStops = window.__engineStops || 0; out.ms = window.__ms; out.tickErr = window.__tickErr || 0;
    out.terr = (window.__terr || []).slice(0, 40); out.terrN = (window.__terr || []).length;
    out.chain = (S.chainLog || []).slice(-80).map(c => (c.time || '') + ' ' + (c.icon || '') + ' ' + (c.desc || ''));
    out.events = (S.eventLog || []).filter(e => e.t >= tStart && e.k !== 'evolution').map(e => new Date(e.t).toISOString().slice(11, 19) + ' ' + e.k + ' ' + e.d);
    out.I = window.__I; out.rng = window.__rng; out.cycle = S.cycle; out.errStats = S._errStats || null; out.simLearnSkipped = S._simLearnSkipped || 0; out.realJudgments = S._realJudgments || 0;
    out.rvEnd = window.__rvState(); out.antiRevengeCfg = S.antiRevengeCfg || null;
    if (wantDump) {
      const acc = (window._WALLET_ACCESSOR_FIELDS || []).reduce((o, k) => (o[k] = 1, o), {});
      const skip = { walletStore: 1, perf: 1, perfLog: 1 };
      const d = { keys: {}, ev: null, re: null, sim: null };
      const seen = new WeakSet();
      const js = v => { try { return JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : (typeof x === 'number' && !isFinite(x) ? String(x) : x))); } catch (e) { return '"<non sérialisable : ' + String(e && e.message).slice(0, 60) + '>"'; } };
      Object.keys(S).forEach(k => { if (skip[k] || acc[k]) return; d.keys[k] = js(S[k]); });
      d.ev = js(S.walletStore.paperReal); d.re = js(S.walletStore.real); d.sim = js(S.walletStore.sim);
      out.dump = d;
    }
    return out;
  }, { tStart, wantDump: !!DUMP });
  if (DUMP) { fs.writeFileSync(DUMP, JSON.stringify(result.dump)); delete result.dump; }
  const o = { root: ROOT, screen: SCREEN, seed: SEED, hours: HOURS, args, setup, result, evtests: global.__evtests || [], pageErrors: perr, consoleErrors: cerr, wallSec: Math.round((Date.now() - W0) / 1000) };
  fs.writeFileSync(OUT, JSON.stringify(o));
  const s = setup.start, e = result.end, I = result.I;
  console.log('écran', result.mode, '| doc', setup.docV, '| en play', JSON.stringify(setup.running), '| cgchg', CGCHG, '| flush', FLUSH, '| split', SPLIT, '| sauts', JSON.stringify(JUMPS));
  console.log('AA  : trades', e.sim.count - s.sim.count, '| brut', (e.sim.pnlGross - s.sim.pnlGross).toFixed(3), '| frais', (e.sim.fees - s.sim.fees).toFixed(3), '| ouvertes', e.sim.open, '| fermetures', result.simTrades.length, 'dont au prix d\'entrée exact', result.simTrades.filter(t => t.entry === t.exit).length, 'dont perte ≤ −1 %', result.simTrades.filter(t => t.pnl <= -1).length);
  console.log('EV  : trades', e.paperReal.count - s.paperReal.count, '| cash+trading', (e.paperReal.cash + e.paperReal.trading).toFixed(4), 'avant', (s.paperReal.cash + s.paperReal.trading).toFixed(4), '| ouvertes', e.paperReal.open);
  console.log('cycles', JSON.stringify(result.cyc), '| S.cycle', setup.cycle0, '→', result.cycle, '| appels CoinGecko', result.cgCalls, '(' + (result.cgCalls / HOURS).toFixed(0) + '/h) | hasard A/B', JSON.stringify(result.rng));
  console.log('ANTI-REVENGE : déclenchements', I.rvTrig.length, JSON.stringify(I.rvTrig.slice(0, 6).map(x => ({ mode: x.mode, bg: x.bg, pair: x.pair, pct: Math.round(x.pct * 100) / 100, usd: Math.round(x.pnlUsd * 100) / 100, min: Math.round((x.t - tStart) / 60000) }))), '| secondes bloquées', I.rvSec, 'sur', I.secs, '| autoOpenPosition', JSON.stringify(I.ao), '| #revengeBlock dans le DOM', setup.revengeDom);
  console.log('CACHE FONDAMENTAL : calculs', I.fc.miss, 'relectures', I.fc.hit, '| relectures d\'un AUTRE mode', JSON.stringify(I.fc.x), '| dans un cycle EV/RE', I.fc.xCore.length, '| relectures d\'entrées d\'avant la mesure', I.fc.pre || 0);
  if (I.fc.xCore.length) { const dl = I.fc.xCore.filter(x => x.fresh !== null).map(x => Math.abs(x.cached - x.fresh)); dl.sort((a, b) => a - b); console.log('   écart |fundScore lu − fundScore du mode| : médiane', (dl[Math.floor(dl.length / 2)] || 0).toFixed(4), 'max', (dl[dl.length - 1] || 0).toFixed(4), 'non nuls', dl.filter(x => x > 1e-12).length, '/', dl.length); }
  if (FORCE) console.log('position AA forcée :', JSON.stringify(setup.force), '→ fermetures AA :', JSON.stringify(I.closes.filter(c => c.mode === 'sim').map(c => ({ pair: c.pair, bg: c.bg, pnl: c.pnl && Math.round(c.pnl * 100) / 100, usd: c.usd && Math.round(c.usd * 100) / 100, min: Math.round((c.t - tStart) / 60000) }))));
  (global.__evtests || []).forEach(r => console.log('ESSAI D\'OUVERTURE EV (09c autoOpenPosition BTC long, contexte', r.mode + ') à la minute', r.min, ': anti-revenge actif =', r.rvActive, '| l\'entonnoir a atteint les portes de la paire =', r.reachedPairGate, '| AUTO', r.botAutoMode, '| réseau coupé', r.netPaused, '| ouverte', r.opened, r.err ? '| err ' + r.err : ''));
  console.log('GÉNÉRATEUR : appels', JSON.stringify(I.gen.calls), '| max dans la même seconde', I.gen.maxPerSec, '| ancrages AA', JSON.stringify(I.gen.anchors));
  (global.__switches || []).forEach(r => console.log('BASCULE D\'ÉCRAN minute', r.min, ':', r.de, '→', r.a, '| chrono', r.chrono, '| en play', JSON.stringify(r.run), '| moteur', r.engine, '| bougies AA', JSON.stringify(r.nc)));
  console.log('décisions EV notées', I.evDec.length, '| toasts ctx sim / autres', JSON.stringify(I.toasts), '| jalons', JSON.stringify(I.milestones.slice(0, 5)));
  console.log('erreurs minuteries', result.terrN, '| erreurs page', perr.length, '| console', cerr.length, '| simTick interrompu', result.tickErr, 'sur', result.ms.n, '| errStats', JSON.stringify(result.errStats), '|', o.wallSec, 's');
  if (result.terrN) console.log(result.terr.slice(0, 4).join('\n'));
  await browser.close(); server.close();
})().then(() => process.exit(0)).catch(async e => { console.error('ERR', e && e.stack || e); try { if (global.__br) await global.__br.close(); } catch (_) {} try { server.close(); } catch (_) {} process.exit(1); });
