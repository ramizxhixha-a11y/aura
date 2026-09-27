// [DÉCISION COMMUNE · 27/09/2026] VERSION 20260927g · outil de REJEU avant livraison (principe de Rams : chaque organe de décision est rejoué sur la
// mémoire du système avant d'être livré). Lancer : node rejeu/run_variant.js <nom> <dossier du code à rejouer> [graine] [fenêtres 1-9] — les
// chemins des backups (run_variant.js : /mnt/user-data/uploads + le backup du 27/09) sont ceux de la session du 27/09 : à adapter. Sorties :
// rejeu/out/*.json ; bilan : python3 rejeu/compare.py <nom>_s<graine> ; voix (avec OBSERVE=1) : python3 rejeu/analyse_voix.py <nom>_s<graine>.
// harness.js — REJEU DU SYSTÈME RÉEL sur une fenêtre de bougies réelles, sous horloge simulée.
// Le code servi (--root) est l'app telle quelle (AURA8_v118.html + js/). État de départ = backup k−1 (--prev), bougies = celles du
// backup k (--cur) : aucune donnée du futur dans l'état de départ. L'horloge (Date) et les minuteries (setTimeout/setInterval) de
// la page sont simulées : le battement réel (simTick, 1 s) et toutes les minuteries de l'app tournent au rythme simulé.
// Prix : chaque seconde, chemin o → bas → haut → c (bougie montante) ou o → haut → bas → c (descendante), injecté par la voie
// réelle de l'app (_aggregateRealPrice) + prix de la paire EV.
// usage : node harness.js --root DIR --prev FILE --cur FILE --out FILE [--warm 20] [--hours H] [--port P] [--tag NOM]
'use strict';
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const args = {}; for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const ROOT = args.root, PREV = args.prev, CUR = args.cur, OUT = args.out;
const WARM = Number(args.warm || 20), PORT = Number(args.port || 8801), TAG = args.tag || path.basename(ROOT);
const HOURS = args.hours ? Number(args.hours) : null;
const SEED = Number(args.seed || 1), WUP = Number(args.wup || 4), OBS = args.observe === '1';   // graine du hasard de la page ; bougies de rodage (moteur en marche, non comptées)
const CANDLE = 900000;
if (!ROOT || !PREV || !CUR || !OUT) { console.error('args'); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'AURA8_v118.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});

const FLAGS = ['aura_assainissement_v1', 'aura_delev_20260818_v2', 'aura_etage1_maxpos3_20260813', 'aura_fee_rates_binance_20260728', 'aura_fitness_restore_20260805',
  'aura_fleet_truth_reset_20260809', 'aura_lev_realign_20260815', 'aura_orphan_debt_cleared_20260727', 'aura_permode_reset_v2', 'aura_purgejournal_20260823',
  'aura_rebase_20260823', 'aura_resetfees_20260823', 'aura_seed_20260823_v4', 'aura_startpf_recal_v3', 'aura_walletsep_reset_v2'];

(async () => {
  const prev = JSON.parse(fs.readFileSync(PREV, 'utf8')).aura;
  const cur = JSON.parse(fs.readFileSync(CUR, 'utf8')).aura;
  // ── fenêtre : bougies 15 m réelles du backup k (realCandles, avec ts) ; paires présentes dans l'EV de l'état de départ ──
  const rcCur = cur.realCandles || {};
  const evPrev = (prev.walletStore && prev.walletStore.paperReal && prev.walletStore.paperReal.pairStates) || {};
  // grille de référence : BTC/USDT ; une paire entre si sa série 15 m couvre toute la grille (une paire retirée garde une vieille série figée)
  const ref = (rcCur['BTC/USDT'] && rcCur['BTC/USDT']['15m']) || [];
  const grid = ref.map(c => c.ts).sort((a, b) => a - b);
  const pairs = Object.keys(evPrev).filter(p => rcCur[p] && Array.isArray(rcCur[p]['15m']) && !(prev.removedPairs || []).includes(p) && (() => { const S1 = new Set(rcCur[p]['15m'].map(c => c.ts)); return grid.every(ts => S1.has(ts)); })());
  const t0 = grid[WARM];                       // début du rejeu (rodage) = ouverture de la bougie WARM
  const tM = grid[WARM + WUP];                 // début de la MESURE, après WUP bougies de rodage (moteur en marche)
  let tEnd = grid[grid.length - 1] + CANDLE;   // fin = clôture de la dernière bougie
  if (HOURS) tEnd = Math.min(tEnd, tM + HOURS * 3600000);
  const hist = {}, series = {};
  pairs.forEach(p => {
    hist[p] = {};
    Object.entries(rcCur[p]).forEach(([tf, arr]) => { if (Array.isArray(arr)) hist[p][tf] = arr.filter(c => c && c.ts + ({ '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1j': 86400000 }[tf] || 0) <= t0).map(c => ({ ts: c.ts, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v || 0, n: c.n || 1 })); });
    series[p] = rcCur[p]['15m'].filter(c => c.ts >= t0 && c.ts < tEnd).map(c => ({ ts: c.ts, o: c.o, h: c.h, l: c.l, c: c.c }));
    // Historique 15 m à 60 bougies comme dans l'app : la porte EV (10g) exige ≥ 30 bougies et les indicateurs lisent 60. Le backup n'en a
    // que WARM avant t0 : les plus anciennes sont reconstruites depuis les bougies 1 h RÉELLES du même backup (chaque heure → 4 quarts :
    // o → extrême 1 → milieu → extrême 2 → c ; les vrais haut et bas de l'heure sont conservés). Marquées _synth ; jamais tradées.
    const real15 = hist[p]['15m'] || [], need = 60 - real15.length;
    if (need > 0) {
      const first = real15.length ? real15[0].ts : t0;
      const h1 = ((rcCur[p]['1h'] || []).filter(k => k && k.ts + 3600000 <= first)).slice(-Math.ceil(need / 4));
      const syn = [];
      h1.forEach(k => { const up = k.c >= k.o, a = up ? k.l : k.h, b = up ? k.h : k.l, pts = [k.o, a, (a + b) / 2, b, k.c];
        for (let i = 0; i < 4; i++) { const o = pts[i], c = pts[i + 1]; syn.push({ ts: k.ts + i * 900000, o, h: Math.max(o, c), l: Math.min(o, c), c, v: (k.v || 0) / 4, n: 1, _synth: true }); } });
      hist[p]['15m'] = syn.filter(k => k.ts < first).slice(-need).concat(real15);
    }
  });
  // ── état de départ : backup k−1, mode EV affiché ──
  prev.tradingMode = 'paperReal';
  const stateStr = JSON.stringify(prev);
  const tBoot = t0 - 180000;
  const init = `(() => {
    const RealDate = Date; let simNow = ${tBoot};
    function SimDate(...a) { if (!new.target) return new RealDate(simNow).toString(); return a.length ? new RealDate(...a) : new RealDate(simNow); }
    Object.setPrototypeOf(SimDate, RealDate); SimDate.prototype = RealDate.prototype;
    SimDate.now = () => simNow; SimDate.UTC = RealDate.UTC; SimDate.parse = RealDate.parse;
    window.Date = SimDate;
    let _sd = ${SEED} >>> 0; Math.random = function () { _sd = (_sd + 0x6D2B79F5) >>> 0; let t = _sd; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
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
        try { if (typeof t.fn === 'function') t.fn(...t.a); } catch (e) { const L = (window.__terr = window.__terr || []); if (L.length < 400) L.push(String(e && e.message || e).slice(0, 160)); }
        if (++fired > 500000) break;
      }
      if (toT > simNow) simNow = toT; return fired;
    };
    // réseau simulé : le ping Binance répond tout de suite (promesse déjà résolue : le délai d'abandon simulé ne peut plus l'annuler) ;
    // toute autre requête externe échoue tout de suite ; le serveur local passe
    const _fetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const u = String((input && input.url) || input || '');
      if (u.indexOf('/api/v3/ping') >= 0) return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if ((u.indexOf('http://') === 0 || u.indexOf('https://') === 0) && u.indexOf('http://127.0.0.1') !== 0) return Promise.reject(new TypeError('Failed to fetch'));
      return _fetch(input, init);
    };
    window.__now = () => simNow; window.__timerCount = () => T.size;
    window.__dropTimers = function (pred) { let n = 0; for (const [id, t] of T) { if (pred(t)) { T.delete(id); n++; } } return n; };
    window.__timerList = () => [...T.values()].map(t => ({ ms: t.ms, every: t.every, src: String(t.fn).slice(0, 80) }));
    try {
      if (!sessionStorage.getItem('__rejeu')) {
        localStorage.clear();
        localStorage.setItem('nexus_state_v2', ${JSON.stringify(stateStr)});
        localStorage.setItem('aura_highwater_cycle', '${Number(prev.cycle) || 0}');
        localStorage.setItem('aura_current_trade_mode', 'paperReal');
        ${JSON.stringify(FLAGS)}.forEach(k => localStorage.setItem(k, '1'));
        sessionStorage.setItem('__rejeu', '1');
      }
    } catch (e) { window.__initErr = String(e); }
  })();`;

  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch(); global.__br = browser;
  const ctx = await browser.newContext();
  // réseau : le ping Binance répond (sinon le garde réseau arrête le moteur, comme sur le tablet sans Internet) ; le reste est coupé
  // (klines, prix, news : l'app garde ses données — les bougies viennent du rejeu)
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith('http://127.0.0.1:' + PORT)) return route.continue(); if (/\/api\/v3\/ping/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); return route.abort(); });
  await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const perr = [];
  page.on('pageerror', e => { if (perr.length < 50) perr.push(String(e && e.message || e).slice(0, 200)); });
  const T0 = Date.now();
  await page.goto('http://127.0.0.1:' + PORT + '/AURA8_v118.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  // ── démarrage : avancer l'horloge simulée par pas de 100 ms jusqu'à l'état restauré, puis 150 s pour les migrations ──
  let ready = false;
  for (let i = 0; i < 1200 && !ready; i++) {
    ready = await page.evaluate(() => { window.__advanceTo(window.__now() + 100); return !!(window._stateReady && typeof S !== 'undefined' && S.agents && S.agents.length > 0); });
    if (i % 10 === 0) await page.waitForTimeout(3);
  }
  if (!ready) { console.error(TAG, 'état non restauré'); await browser.close(); server.close(); process.exit(3); }
  await page.evaluate(() => { try { S.pendingActions = []; S._botPredictions = []; ['sim', 'paperReal', 'real'].forEach(m => { if (S.walletStore && S.walletStore[m]) S.walletStore[m].openPositions = []; }); } catch (e) {} });
  for (let i = 0; i < 150; i++) { await page.evaluate(() => window.__advanceTo(window.__now() + 1000)); if (i % 10 === 0) await page.waitForTimeout(3); }
  // ── préparation de la fenêtre ──
  const setup = await page.evaluate(({ pairs, hist, t0 }) => {
    const out = { dropped: 0 };
    window.__dropTimers(t => t.every && t.every < 1000);   // minuteries d'interface < 1 s (appui long…)
    try { S.tradingMode = 'paperReal'; } catch (e) {}
    try { window.AuraChrono && window.AuraChrono.setMode('paperReal'); } catch (e) {}
    try { window.AuraChrono.state.netStatus = 'online'; } catch (e) {}
    ['sim', 'real'].forEach(m => { try { _setModeRunning(m, false); } catch (e) {} });
    try { _setModeRunning('paperReal', true); } catch (e) {}
    S.botAutoMode = true; S.currentPage = 99;
    const W = S.walletStore.paperReal;
    W.openPositions = []; S.pendingActions = []; S._botPredictions = [];
    pairs.forEach(p => {
      if (!S.realCandles) S.realCandles = {};
      S.realCandles[p] = S.realCandles[p] || {};
      Object.keys(hist[p]).forEach(tf => { S.realCandles[p][tf] = hist[p][tf].map(c => Object.assign({}, c)); });
      const a = S.realCandles[p]['15m'], px = a[a.length - 1].c;
      try { window._aggregateRealPrice(p, px, t0); } catch (e) {}
      if (W.pairStates[p]) W.pairStates[p].price = px;
    });
    try { _projectRealCandles(); } catch (e) { out.projErr = String(e); }
    // pas d'écriture disque pendant le rejeu (lente, et hors sujet)
    ['saveState', 'saveStateNow', '_saveStateDebounced', 'scheduleSave'].forEach(n => { if (typeof window[n] === 'function') window[n] = function () {}; });
    const f = W.fees || {};
    out.start = { portfolio: W.portfolio, trading: W.tradingAccount, cash: W.cashAccount, pnlNet: f.totalPnlNet || 0, pnlGross: f.totalPnlGross || 0, tradingFees: f.totalTradingFees || 0, slip: f.totalSlippage || 0, count: f.tradeCount || 0, totalTrades: W.totalTrades || 0 };
    out.pairs = Object.keys(W.pairStates).filter(p => pairs.includes(p));
    out.timers = window.__timerCount();
    return out;
  }, { pairs, hist, t0 });
  await page.evaluate(({ t0 }) => {
    window.__advanceTo(t0);
    const W = S.walletStore.paperReal; W.openPositions = []; S.pendingActions = []; S._botPredictions = [];
    // battement réel du système, comme le bouton ▶ — à t0 exactement
    window._auraSimState = window._auraSimState || {};
    window._auraSimState.interval = setInterval(function () { try { simTick(); } catch (e) { const L = (window.__terr = window.__terr || []); if (L.length < 400) L.push('simTick: ' + String(e && e.message || e).slice(0, 150)); } }, 1000);
    window._auraSimState.running = true;
    try { new Function('try{_simRunning=true;_simEverStarted=true;_simInterval=window._auraSimState.interval}catch(e){}')(); } catch (e) {}
    // qui arrête le moteur ? (trace, pour le rapport)
    try { let _r = true; Object.defineProperty(window._auraSimState, 'running', { get() { return _r; }, set(v) { if (!v && _r) { const L = (window.__stopStacks = window.__stopStacks || []); if (L.length < 12) L.push(String(new Error().stack).split('\n').slice(2, 7).join(' | ').slice(0, 500)); } _r = v; }, configurable: true }); } catch (e) {}
    const f = W.fees || {};
    return { portfolio: W.portfolio, pnlNet: f.totalPnlNet || 0 };
  }, { t0 });
  if (OBS) await page.evaluate(() => {
    // OBSERVATEUR (lecture seule) : chaque minute simulée, pour chaque paire, toutes les voix et leur bilan mesuré
    const AG = S.agents.filter(a => a && !a.isBot && !a.isMeta).map(a => a.id), BOTS = ['scalper_bot_v1', 'arb_bot_v1', 'dca_bot_v1'];
    window.__obsAgents = AG; window.__obs = []; window.__obsMerit = [];
    const E = id => { const a = S.agents.find(x => x && x.id === id); const W = (typeof _fitWindow === 'function') ? _fitWindow() : 60; const js = ((a && a._judgments) || []).slice(-W);
      let sw = 0, se = 0; js.forEach(j => { const w = Math.max(0.01, Number(j && j.w) || 0); sw += w; se += ((j && j.s) >= 0 ? 1 : -1) * w; }); return [sw > 0 ? Math.round(se / sw * 1000) / 1000 : 0, js.length, Math.round((a && a.fitness) || 0)]; };
    const perf = p => { try { const r = _getPairReturns(p); return (r && r.length >= 10) ? r.slice(-20).reduce((s, x) => s + x, 0) : null; } catch (e) { return null; } };
    window.__dcObserve = function (t) {
      const W = S.walletStore.paperReal; const pairs = Object.keys(W.pairStates).filter(p => W.pairStates[p] && W.pairStates[p].price > 0 && Array.isArray(W.pairStates[p].candles) && W.pairStates[p].candles.length >= 15 && p !== 'GBP/USDT');
      window.__obsMerit.push({ t, ag: AG.map(E), bots: BOTS.map(E) });
      const perfs = {}; pairs.forEach(p => { perfs[p] = perf(p); });
      pairs.forEach(p => {
        const ps = W.pairStates[p]; const c = ps.candles; let tr = 0, n = 0;
        for (let i = Math.max(1, c.length - 14); i < c.length; i++) { tr += Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c)); n++; }
        const atr = n ? tr / n / ps.price : 0;
        let tech = null, fund = null; try { tech = getTechSignals(p); } catch (e) {} try { fund = getFundamentalSignals(p); } catch (e) {}
        const P = (ps.qYes > 0 && ps.qNo > 0) ? ps.qYes / (ps.qYes + ps.qNo) : 0.5, cv = (tech && tech.raw && tech.raw.stddev && tech.raw.stddev.cv) || 0, adx = (tech && tech.raw && tech.raw.adx && tech.raw.adx.adx) || 20;
        const sc = (Math.abs(P - 0.5) > 0.12 && cv > 0.0008) ? (P > 0.5 ? 1 : -1) : 0;
        let ar = 0; if (perfs[p] !== null) { for (const q of pairs) { if (q === p || perfs[q] === null) continue; let cr = null; try { cr = _getPairCorrelation(p, q); } catch (e) {} if (typeof cr === 'number' && cr > 0.65 && perfs[q] - perfs[p] > 0.025) { ar = 1; break; } } }
        let dc = 0; if (cv < 0.0012 && adx < 20 && c.length >= 20) { const cl = c.slice(-20).map(k => k.c), lo = Math.min(...cl), hi = Math.max(...cl); if (hi > lo && (ps.price - lo) / (hi - lo) <= 0.15) dc = 1; }
        const mod = (b, d) => { if (!d) return 0; try { return Math.round(window._consultDisciples(b, p, d > 0 ? 'long' : 'short').mod * 1000) / 1000; } catch (e) { return 1; } };
        const votes = (ps.roster && ps.roster.votes) || {};
        window.__obs.push({ t, p, px: ps.price, atr: Math.round(atr * 1e6) / 1e6, P: Math.round(P * 1000) / 1000, at: tech ? Math.round((tech.atScore || 0) * 1000) / 1000 : 0, af: fund ? Math.round((fund.fundScore || 0) * 1000) / 1000 : 0,
          b: [sc, ar, dc], bm: [mod('scalper_bot_v1', sc), mod('arb_bot_v1', ar), mod('dca_bot_v1', dc)], v: AG.map(id => typeof votes[id] === 'number' ? Math.round(votes[id] * 1000) / 1000 : 0), la: ps.lastAction || '', rts: (ps.roster && ps.roster.ts) || 0 });
      });
    };
  });
  { const f0 = await page.evaluate(() => { const W = S.walletStore.paperReal, f = W.fees || {}; return { portfolio: W.portfolio, trading: W.tradingAccount, cash: W.cashAccount, pnlNet: f.totalPnlNet || 0, pnlGross: f.totalPnlGross || 0, tradingFees: f.totalTradingFees || 0, slip: f.totalSlippage || 0, count: f.tradeCount || 0, totalTrades: W.totalTrades || 0 }; }); setup.start = f0; }

  // ── rejeu : une bougie (900 s simulées) par appel ──
  const nC = Math.round((tEnd - t0) / CANDLE);
  for (let j = 0; j < nC; j++) {
    if (j === WUP) {   // fin du rodage : on repart à plat, la mesure commence
      setup.start = await page.evaluate(() => { const W = S.walletStore.paperReal, f = W.fees || {}; W.openPositions = [];
        return { portfolio: W.portfolio, trading: W.tradingAccount, cash: W.cashAccount, pnlNet: f.totalPnlNet || 0, pnlGross: f.totalPnlGross || 0, tradingFees: f.totalTradingFees || 0, slip: f.totalSlippage || 0, count: f.tradeCount || 0, totalTrades: W.totalTrades || 0 }; });
    }
    const res = await page.evaluate(({ series, t0, j, CANDLE, WUPc }) => {
      const W = S.walletStore.paperReal; const tA = t0 + j * CANDLE, tB = tA + CANDLE;
      for (let t = tA; t < tB; t += 1000) {
        for (const p in series) {
          const k = series[p][j]; if (!k || k.ts !== tA) continue;
          const f = (t - tA) / CANDLE, up = k.c >= k.o, a = up ? k.l : k.h, b = up ? k.h : k.l;
          const px = f < 1 / 3 ? k.o + (a - k.o) * f * 3 : f < 2 / 3 ? a + (b - a) * (f - 1 / 3) * 3 : b + (k.c - b) * (f - 2 / 3) * 3;
          try { window._aggregateRealPrice(p, px, t); } catch (e) {}
          const ps = W.pairStates[p]; if (ps) ps.price = px;
        }
        if (S.tradingMode !== 'paperReal') S.tradingMode = 'paperReal';
        if (!(window._auraSimState && window._auraSimState.running)) {   // moteur arrêté (garde réseau…) : noté, relancé
          window.__engineStops = (window.__engineStops || 0) + 1;
          window._auraSimState.interval = setInterval(function () { try { simTick(); } catch (e) {} }, 1000); window._auraSimState.running = true;
          try { new Function('try{_simRunning=true;_simInterval=window._auraSimState.interval}catch(e){}')(); } catch (e) {}
        }
        if (S._netPaused) { window.__netPaused = (window.__netPaused || 0) + 1; }
        if (window.__dcObserve && (t - tA) % 60000 === 0 && j >= WUPc) { try { window.__dcObserve(t); } catch (e) { window.__obsErr = String(e).slice(0, 200); } }
        window.__advanceTo(t + 1000);
      }
      return { open: (W.openPositions || []).length };
    }, { series, t0, j, CANDLE, WUPc: WUP });
    if (j % 8 === 7) process.stderr.write(TAG + ' bougie ' + (j + 1) + '/' + nC + ' · positions ' + res.open + ' · ' + Math.round((Date.now() - T0) / 1000) + ' s\n');
    await page.waitForTimeout(1);
  }

  // ── bilan ──
  const result = await page.evaluate(({ t0: _t0, tM, tEnd, series }) => { const t0 = tM;
    const W = S.walletStore.paperReal, f = W.fees || {};
    const trades = [];
    Object.entries(W.pairStates).forEach(([p, ps]) => (ps.trades || []).forEach(t => { if (t && typeof t.ts === 'number' && t.ts >= t0) trades.push(Object.assign({ pair: p }, t)); }));
    trades.sort((a, b) => a.ts - b.ts);
    const open = (W.openPositions || []).map(q => { const ps = W.pairStates[q.pair]; const px = ps ? ps.price : q.entryPrice; const pct = (q.side === 'long' ? (px - q.entryPrice) : (q.entryPrice - px)) / q.entryPrice * 100; return { pair: q.pair, side: q.side, stake: q.stakeUsdt, pct, bot: q._bot || null, openedAt: q.openedAt }; });
    const feeLog = (f.feeLog || []).filter(x => x.ts >= t0).map(x => ({ pair: x.pair, ts: x.ts, gross: x.pnlGross, net: x.pnlNet, fee: x.totalFee }));
    const bots = {}; Object.entries(S.botFleet || {}).forEach(([id, b]) => { bots[id] = { pnl: b.pnlContrib, contrib: b.contributions, last: b.lastAction }; });
    const merit = {}; (S.agents || []).forEach(a => { merit[a.id] = { fit: Math.round(a.fitness || 0), n: (a._judgments || []).length }; });
    const cl = (S.chainLog || []).slice(-40).map(c => (c.icon || '') + ' ' + (c.desc || ''));
    return { end: { portfolio: W.portfolio, trading: W.tradingAccount, cash: W.cashAccount, pnlNet: f.totalPnlNet || 0, pnlGross: f.totalPnlGross || 0, tradingFees: f.totalTradingFees || 0, slip: f.totalSlippage || 0, count: f.tradeCount || 0, totalTrades: W.totalTrades || 0 },
      trades, open, feeLog, bots, merit, chain: cl, lmsr: Object.fromEntries(Object.entries(W.pairStates).map(([p, ps]) => [p, ps.qYes && ps.qNo ? Math.round(ps.qYes / (ps.qYes + ps.qNo) * 100) / 100 : null])),
      terr: (window.__terr || []).slice(0, 60), terrN: (window.__terr || []).length, simNow: window.__now(), obs: window.__obs || null, obsMerit: window.__obsMerit || null, obsAgents: window.__obsAgents || null, obsErr: window.__obsErr || null, engineStops: window.__engineStops || 0, netPausedSec: window.__netPaused || 0, stopStacks: window.__stopStacks || [] };
  }, { t0, tM, tEnd, series });
  const out = { tag: TAG, seed: SEED, tM, prev: path.basename(PREV), cur: path.basename(CUR), t0, tEnd, hours: (tEnd - tM) / 3600000, pairs: setup.pairs, setup, result, pageErrors: perr, wallSec: Math.round((Date.now() - T0) / 1000) };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const s = setup.start, e = result.end;
  console.log(TAG, path.basename(CUR).slice(19, 32), (out.hours).toFixed(1) + ' h', '| trades', e.count - s.count, '| net', (e.pnlNet - s.pnlNet).toFixed(2), '| brut', (e.pnlGross - s.pnlGross).toFixed(2), '| frais', (e.tradingFees - s.tradingFees + e.slip - s.slip).toFixed(2), '| ouvertes', result.open.length, '| erreurs', result.terrN, '| arrêts moteur', result.engineStops, '| pause réseau s', result.netPausedSec, '| ' + out.wallSec + ' s');
  await browser.close(); server.close();
})().then(() => process.exit(0)).catch(async e => { console.error('ERR', e && e.stack || e); try { if (global.__br) await global.__br.close(); } catch (_) {} try { server.close(); } catch (_) {} process.exit(1); });
