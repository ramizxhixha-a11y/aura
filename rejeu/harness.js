// [OUTILS · 02/10/2026] VERSION 20261002a · outil de REJEU avant livraison (principe de Rams : chaque organe de décision est rejoué sur la mémoire du système avant d'être
// livré) — version à jour (EV + RE ensemble, journaux des voix, du seuil appris, du marché, de l'évolution), sauvée du bac à sable de la session :
// la copie du dépôt datait du 27/09. Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
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
const SEED = Number(args.seed || 1), WUP = Number(args.wup || 4), OBS = args.observe === '1';
const MODES = String(args.modes || 'ev');   // [HORLOGE PAR MODE] 'ev' (défaut, comme avant) ou 'evre' : EV + RE en marche ensemble, comme l'app de Rams
const THF = (args.thforce !== undefined) ? Number(args.thforce) : -1;   // essai mécanique : horizon d'indice THF « prouvé » par des trades virtuels fabriqués (jamais pour mesurer)   // graine du hasard de la page ; bougies de rodage (moteur en marche, non comptées)
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
  const setup = await page.evaluate(({ pairs, hist, t0, MODES }) => {
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
    // [HORLOGE PAR MODE] RE en marche aussi (arrière-plan), mêmes paires, 15 min — la configuration réelle de Rams (backup 29/09)
    if (MODES === 'evre') { try { _setModeRunning('real', true); S.realActivePairs = {}; pairs.forEach(p => { S.realActivePairs[p] = true; }); S.realTimeframe = '15m'; S.realKillSwitch = {};
      const WR = S.walletStore.real; WR.openPositions = []; pairs.forEach(p => { const a = S.realCandles[p]['15m'], px = a[a.length - 1].c; if (WR.pairStates && WR.pairStates[p]) WR.pairStates[p].price = px; }); out.re = true; } catch (e) { out.reErr = String(e); } }
    // [HORLOGE PAR MODE] chaque cycle de paire (mode, paire, bougie close de l'horloge lue à l'instant) et chaque jugement à la bougie suivante (learnFromOutcome 'cycle', mouvement non nul)
    try { const _rc = window._resolvePairCycleCore; window._resolvePairCycleCore = function (pair, ps) { try { (window.__cyc = window.__cyc || []).push([S.tradingMode === 'real' ? 'R' : S.tradingMode === 'paperReal' ? 'E' : 'A', pair, (S.realPairCycle && S.realPairCycle[pair]) || 0, Date.now(), window.__thNoteOnly ? 1 : 0]); } catch (e) {} return _rc(pair, ps); }; } catch (e) { out.wrapErr = String(e); }
    try { const _lf = window.learnFromOutcome; window.learnFromOutcome = function (src, pnl, pair) { try { if (src === 'cycle' && Math.abs(Number(pnl)) > 0) (window.__lfo = window.__lfo || []).push([S.tradingMode === 'real' ? 'R' : 'E', pair, Date.now(), Math.round(Number(pnl) * 10000) / 10000]); } catch (e) {} return _lf.apply(this, arguments); }; } catch (e) { out.wrapErr2 = String(e); }
    // [HORLOGE PAR MODE] une sauvegarde de cette version porte l'horloge de chaque mode et la marque des bougies jugées : on rejoue de vieilles bougies → effacées
    try { ['paperReal', 'real'].forEach(m => { if (S.walletStore && S.walletStore[m]) S.walletStore[m].realPairCycle = {}; }); if (S.dcThreshold) S.dcThreshold.fwdK = {}; } catch (e) { out.clrErr = String(e); }
    try { _projectRealCandles(); } catch (e) { out.projErr = String(e); }
    // pas d'écriture disque pendant le rejeu (lente, et hors sujet)
    ['saveState', 'saveStateNow', '_saveStateDebounced', 'scheduleSave'].forEach(n => { if (typeof window[n] === 'function') window[n] = function () {}; });
    const f = W.fees || {};
    out.start = { portfolio: W.portfolio, trading: W.tradingAccount, cash: W.cashAccount, pnlNet: f.totalPnlNet || 0, pnlGross: f.totalPnlGross || 0, tradingFees: f.totalTradingFees || 0, slip: f.totalSlippage || 0, count: f.tradeCount || 0, totalTrades: W.totalTrades || 0 };
    out.pairs = Object.keys(W.pairStates).filter(p => pairs.includes(p));
    out.timers = window.__timerCount();
    return out;
  }, { pairs, hist, t0, MODES });
  await page.evaluate(({ t0, THF }) => {
    window.__advanceTo(t0);
    const W = S.walletStore.paperReal; W.openPositions = []; S.pendingActions = []; S._botPredictions = [];
    if (THF >= 0) { try { const _cp = window.closePosition; window.closePosition = function (id, bc) { try { const p = (S.openPositions || []).find(x => x.id === id); if (p && p._thX) (window.__thCloses = window.__thCloses || []).push({ pair: p.pair, t: window.__now(), thX: p._thX, early: window.__now() < p._thX, stack: String(new Error().stack).split('\n').slice(2, 7).map(l => l.trim().slice(0, 140)).join(' | ') }); } catch (e) {} return _cp.apply(this, arguments); }; } catch (e) {} }
    if (THF >= 0) { const rec = []; for (let i = 0; i < 480; i++) { const n = [false, false, false, false, false]; n[THF] = 1 + (i % 2 ? 0.05 : -0.05); rec.push([Math.round((i % 40) / 40 * 0.6 * 1000) / 1000, Math.round((t0 - 30 * 3600000 + i * 225000) / 1000), 15].concat(n)); } S.dcThreshold = { rec, pend: [], rules: {} }; }
    // [BILAN AUX HORIZONS] journal des cycles des voix : chaque entrée poussée dans pendV par _vjNote (mutée ensuite par _vjJudge)
    // [FITNESS AUX HORIZONS] l'évolution au moment même (avant _judgments = [] / _vjReset) : cible, plus faible par fitness vivante, sièges que chaque définition retirerait
    try { if (typeof window.triggerEvolution === 'function') { const _te = window.triggerEvolution; window.triggerEvolution = function (weak, opts) { let snap = null; try { const before = S._lastEvolutionAt; const seats = (S.agents || []).filter(a => a && !a.isBot && !a.isMeta); const wk = seats.slice().sort((a, b) => a.fitness - b.fitness)[0]; snap = { t: Date.now(), before: before, src: (function () { try { return (new Error().stack.split('\n').slice(2, 4).map(l => l.trim().replace(/^at /, '').split(' ')[0]).join('<')); } catch (e) { return ''; } })(), id: weak && weak.id, name: weak && weak.name, fitness: weak && weak.fitness, fb: (weak && typeof _fitOf === 'function' && typeof _fitWindow === 'function') ? _fitOf(weak._judgments || [], _fitWindow()) : null, fh: (weak && typeof _fitHz === 'function') ? _fitHz(weak) : null, nj: weak ? (weak._judgments || []).length : null, score: weak && weak.score, weakest: wk ? { id: wk.id, fitness: wk.fitness } : null, picks: (typeof _fitPicks === 'function') ? _fitPicks() : null, manual: !!(opts && opts.manual), req: (typeof _evoOpPick === 'function' && weak) ? _evoOpPick(weak.id) : null }; } catch (e) {} const r = _te(weak, opts); try { if (snap && S._lastEvolutionAt !== snap.before) { const tr = (S.evoTrials && weak) ? S.evoTrials[weak.id] : null; snap.op = (tr && tr.t >= snap.t) ? (tr.op || 'R') : null; const gl = (S.chainLog || []).slice().reverse().find(c => c && typeof c.desc === 'string' && weak && c.desc.indexOf('G\u00e9nome ' + weak.id + ' :') === 0); snap.gline = gl ? gl.desc : null; (window.__evoHook = window.__evoHook || []).push(snap); } } catch (e) {} return r; }; } } catch (e) {}
    try { if (typeof window._vjNote === 'function') { const _vn = window._vjNote; window._vjNote = function (pair, a, b) { const r = _vn(pair, a, b); try { if (r) { const T = S.dcThreshold, q = T.pendV[T.pendV.length - 1]; if (q && q.p === pair) (window.__vjLog = window.__vjLog || []).push(q); } } catch (e) {} return r; }; } } catch (e) {}
    // [MARCHÉ RÉPARÉ] échantillons des T$ des sièges (toutes les 30 min simulées, au cycle d'une paire) et compte des cycles de marché
    try { if (typeof window._mktCycle === 'function') { const _mc = window._mktCycle; let _lastS = 0; window._mktCycle = function (pair, ps) { const r = _mc(pair, ps); try { window.__mktCyc = (window.__mktCyc || 0) + 1; if (r > 0) window.__mktOpen = (window.__mktOpen || 0) + 1; const now = Date.now(); if (now - _lastS >= 1800000) { _lastS = now; (window.__mktSamples = window.__mktSamples || []).push({ t: now, w: (S.agents || []).filter(a => a && !a.isBot && !a.isMeta && typeof a.mktWallet === 'number').map(a => [a.id, Math.round(a.mktWallet * 100) / 100, Math.round((a.mktGain || 0) * 100) / 100, a.mktN || 0, Math.round(a.fitness || 0)]) }); } } catch (e) {} return r; }; } } catch (e) {}
    // battement réel du système, comme le bouton ▶ — à t0 exactement
    window._auraSimState = window._auraSimState || {};
    window._auraSimState.interval = setInterval(function () { try { simTick(); } catch (e) { const L = (window.__terr = window.__terr || []); if (L.length < 400) L.push('simTick: ' + String(e && e.message || e).slice(0, 150)); } }, 1000);
    window._auraSimState.running = true;
    try { new Function('try{_simRunning=true;_simEverStarted=true;_simInterval=window._auraSimState.interval}catch(e){}')(); } catch (e) {}
    // qui arrête le moteur ? (trace, pour le rapport)
    try { let _r = true; Object.defineProperty(window._auraSimState, 'running', { get() { return _r; }, set(v) { if (!v && _r) { const L = (window.__stopStacks = window.__stopStacks || []); if (L.length < 12) L.push(String(new Error().stack).split('\n').slice(2, 7).join(' | ').slice(0, 500)); } _r = v; }, configurable: true }); } catch (e) {}
    const f = W.fees || {};
    return { portfolio: W.portfolio, pnlNet: f.totalPnlNet || 0 };
  }, { t0, THF });
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
        if ((t - tA) % 30000 === 0) { try { const SE = (window.__chSeen = window.__chSeen || {}), K = (window.__chKeep = window.__chKeep || []); (S.chainLog || []).forEach(c => { if (c && c.hash && !SE[c.hash] && /🎚|🟢|🔴|⏳|⏱|🎯|🔄|⛔|🔌|🛑|🔒|🧬|⚖️|⚰/u.test(c.icon || '')) { SE[c.hash] = 1; if (K.length < 3000) K.push(new Date(window.__now()).toISOString().slice(11, 19) + ' ' + c.icon + ' ' + String(c.desc || '').slice(0, 220)); } }); } catch (e) {} }
        window.__advanceTo(t + 1000);
      }
      return { open: (W.openPositions || []).length };
    }, { series, t0, j, CANDLE, WUPc: WUP });
    if (j % 8 === 7) process.stderr.write(TAG + ' bougie ' + (j + 1) + '/' + nC + ' · positions ' + res.open + ' · ' + Math.round((Date.now() - T0) / 1000) + ' s\n');
    await page.waitForTimeout(1);
  }

  // ── bilan ──
  const result = await page.evaluate(({ t0: _t0, tM, tEnd, series, MODES }) => { const t0 = tM;
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
      terr: (window.__terr || []).slice(0, 60), terrN: (window.__terr || []).length, simNow: window.__now(), obs: window.__obs || null, obsMerit: window.__obsMerit || null, obsAgents: window.__obsAgents || null, obsErr: window.__obsErr || null, engineStops: window.__engineStops || 0, netPausedSec: window.__netPaused || 0, stopStacks: window.__stopStacks || [],
      thr: S.dcThreshold ? { rule: S.dcThreshold.rule || null, obs: S.dcThreshold.obs || [], rec: S.dcThreshold.rec || [], pend: (S.dcThreshold.pend || []).map(q => ({ c: q.c, t: q.t, p: q.p, r: q.r, f: q.f, n: q.n })), rules: S.dcThreshold.rules || null, recC: S.dcThreshold.recC || [], pendC: (S.dcThreshold.pendC || []).map(q => ({ c: q.c, t: q.t, p: q.p, f: q.f, d: q.d, cap: q.cap, n: q.n })), rulesC: S.dcThreshold.rulesC || null, ctSince: S.dcThreshold.ctSince || null, vIds: S.dcThreshold.vIds || [], vHz: S.dcThreshold.vHz || null, vCmp: S.dcThreshold.vCmp || null, vRule: S.dcThreshold.vRule || null, vMode: S.dcThreshold.vMode || null, vRules: S.dcThreshold.vRules || null, vModes: S.dcThreshold.vModes || null, vDirtyF: S.dcThreshold.vDirtyF || null, fCmp: S.dcThreshold.fCmp || null, fRules: S.dcThreshold.fRules || null, fModes: S.dcThreshold.fModes || null, vSince: S.dcThreshold.vSince || null, pendVn: (S.dcThreshold.pendV || []).length } : null,
      cycle: S.cycle || 0, seats: (S.agents || []).filter(a => a && !a.isBot && !a.isMeta).map(a => ({ id: a.id, name: a.name, fitness: a.fitness, lmsrSpent: a.lmsrSpent || 0, score: a.score, fb: (typeof _fitOf === 'function' && typeof _fitWindow === 'function') ? _fitOf(a._judgments || [], _fitWindow()) : null, fh: (typeof _fitHz === 'function') ? _fitHz(a) : null, born: a._bornCycle || 0, nj: (a._judgments || []).length })),
      evo: { gen: S._genCount || 0, log: (S.evoLog || []).length, lastAt: S._lastEvolutionAt || 0 },
      vjLog: (window.__vjLog || []).map(q => ({ p: q.p, t: q.t, f: q.f, v: q.v, dO: q.dO, dH: q.dH, a: q.a, wB: q.wB, wH: q.wH, qB: q.qB, qH: q.qH, L: { cap: q.L.cap, n: q.L.n, hit: q.L.hit }, S: { cap: q.S.cap, n: q.S.n, hit: q.S.hit } })),
      pos: (W.openPositions || []).concat([]).map(q => ({ pair: q.pair, thL: q._thL, dcC: q._dcC, thH: q._thH, thX: q._thX, openedAt: q.openedAt })),
      chainAll: (S.chainLog || []).map(c => (c.icon || '') + ' ' + (c.desc || '')), chainKeep: window.__chKeep || [], thCloses: window.__thCloses || [], evoHook: window.__evoHook || [], evoRule: S.evoRule || null, evoMerit: S.evoMerit || null, cyc: window.__cyc || [], lfo: window.__lfo || [], realJudgments: S._realJudgments || 0, modes: MODES,
      rePos: ((S.walletStore.real || {}).openPositions || []).length, reTrades: Object.values((S.walletStore.real || {}).pairStates || {}).reduce((a, ps) => a + ((ps.trades || []).filter(t => t && t.ts >= t0).length), 0),
      mkt: (function () { try { const WS = S.walletStore || {}, pairs = {}; ['paperReal', 'real'].forEach(m => { const P = (WS[m] && WS[m].pairStates) || {}; Object.keys(P).forEach(p => { const R = P[p] && P[p].mkt; if (R) pairs[m + '|' + p] = { open: !!R.open, n: R.n, P: R.open ? ((typeof _mktPrice === 'function') ? _mktPrice(P[p].qYes, P[p].qNo) : null) : R.P, out: R.out, t: R.t, vol: R.vol }; }); });
        const v = S.dcVoices && S.dcVoices.marche; return { cyc: window.__mktCyc || 0, opened: window.__mktOpen || 0, log: S.mktLog || [], stats: S.mktStats || null, pairs: pairs, voice: v ? { nj: (v._judgments || []).length, js: (v._judgments || []).slice(-240), merit: (typeof _dcMerit === 'function') ? _dcMerit(v) : null, meritHz: (typeof _dcMeritHz === 'function') ? _dcMeritHz('marche') : null } : null,
          wallets: (S.agents || []).filter(a => a && !a.isBot && !a.isMeta).map(a => ({ id: a.id, f: a.fitness, w: a.mktWallet, g: a.mktGain || 0, n: a.mktN || 0, born: a.mktBorn || 0 })), samples: window.__mktSamples || [] }; } catch (e) { return { err: String(e) }; } })() };
  }, { t0, tM, tEnd, series, MODES });
  const out = { tag: TAG, seed: SEED, tM, prev: path.basename(PREV), cur: path.basename(CUR), t0, tEnd, hours: (tEnd - tM) / 3600000, pairs: setup.pairs, setup, result, pageErrors: perr, wallSec: Math.round((Date.now() - T0) / 1000) };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const s = setup.start, e = result.end;
  console.log(TAG, path.basename(CUR).slice(19, 32), (out.hours).toFixed(1) + ' h', '| trades', e.count - s.count, '| net', (e.pnlNet - s.pnlNet).toFixed(2), '| brut', (e.pnlGross - s.pnlGross).toFixed(2), '| frais', (e.tradingFees - s.tradingFees + e.slip - s.slip).toFixed(2), '| ouvertes', result.open.length, '| erreurs', result.terrN, '| arrêts moteur', result.engineStops, '| pause réseau s', result.netPausedSec, '| ' + out.wallSec + ' s');
  await browser.close(); server.close();
})().then(() => process.exit(0)).catch(async e => { console.error('ERR', e && e.stack || e); try { if (global.__br) await global.__br.close(); } catch (_) {} try { server.close(); } catch (_) {} process.exit(1); });
