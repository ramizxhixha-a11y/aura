// banc-p7-news.js — [P7 · 06/09/2026] BRIQUE 7 DU PONT : news NLP (CoinStats) → portes de conviction.
// Charge le module LIVRÉ 10e7 en vm (horloge et S pilotés, fetch simulé sur le PAYLOAD RÉEL enregistré
// banc-p7-news-payload.json : 100 articles CoinStats du 06/09/2026), puis rejoue le texte LIVRÉ des portes
// 10f, l'agent nlp_v1 (03, texte livré), les rendus 04/05, la persistance 09b1/09b2 et le HTML.
// Lancer à la racine du dépôt : node banc-p7-news.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let ok = 0, ko = 0;
function T(name, fn) { try { const r = fn(); if (r && typeof r.then === 'function') return r.then(() => { ok++; console.log('  ✓ ' + name); }, e => { ko++; console.log('  ✗ ' + name + '\n     ' + (e && e.message)); }); ok++; console.log('  ✓ ' + name); } catch (e) { ko++; console.log('  ✗ ' + name + '\n     ' + (e && e.message)); } return Promise.resolve(); }
const TOK = '20260906g';
const PAYLOAD = JSON.parse(fs.readFileSync('banc-p7-news-payload.json', 'utf8'));
const ART = PAYLOAD.result;
const T0 = Math.max.apply(null, ART.map(a => a.feedDate)) + 60 * 1000;   // « maintenant » = 1 min après l'article le plus récent
let _fakeNow = T0;
const SRC = fs.readFileSync('js/10e7-news-nlp.js', 'utf8');

function mkCtx(opts) {
  opts = opts || {};
  const S = { newsApiKey: opts.key === undefined ? 'b952ecc80cac426ea2c8b6625efc0fb5cc05cb22cdcf' : opts.key, chainLog: [] };
  const fetchLog = [];
  const ctx = {
    S, window: { _stateReady: true }, console, Math, Number, String, Object, Array, JSON, Promise, RegExp, Error,
    setInterval: () => 0, setTimeout: (fn) => { fn(); return 0; }, AbortSignal: { timeout: () => null },
    rndHash: () => 'h', nowStr: () => 't',
    Date: class extends Date { constructor(...a) { super(a.length ? a[0] : _fakeNow); } static now() { return _fakeNow; } },
    fetch: async (url, init) => {
      fetchLog.push({ url, key: init && init.headers && init.headers['X-API-KEY'] });
      if (opts.http && opts.http !== 200) return { ok: false, status: opts.http, json: async () => ({}) };
      const page = Number((url.match(/page=(\d+)/) || [])[1] || 1);
      const arts = page === 1 ? ART : (opts.page2 || []);
      return { ok: true, status: 200, json: async () => ({ result: arts }) };
    },
  };
  ctx.window.fetchLog = fetchLog;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx;
}

console.log('═ A · 10e7 livré : module, lexique, ingestion ═');
T('10e7 : version ' + TOK + ', ≤ 500 lignes, 12 exports window', () => {
  assert.ok(SRC.startsWith('// ▓▓▓ VERSION ' + TOK + ' ▓▓▓'));
  assert.ok(SRC.split('\n').length <= 501);
  assert.strictEqual((SRC.match(/^window\._?[A-Za-z]+\s*=/gm) || []).length, 12);
});
T('_newsTokenScore : mots ENTIERS — « second » ≠ sec, « bank » ≠ ban, « against » ≠ gain ; « SEC lawsuit » = 2 bear', () => {
  const c = mkCtx();
  assert.strictEqual(c._newsTokenScore('Bitcoin hits second bank milestone against odds').s, null);
  const r = c._newsTokenScore('SEC lawsuit against Ripple: XRP drops');
  assert.strictEqual(r.bear, 3); assert.strictEqual(r.bull, 0); assert.strictEqual(r.s, -1);
  const b = c._newsTokenScore('ETH ETF approval sparks rally, inflows surge');
  assert.strictEqual(b.bull, 4); assert.strictEqual(b.s, 1);
  assert.strictEqual(c._newsTokenScore('Bitcoin rally fades as fear returns').s, 0);
  assert.strictEqual(c._newsTokenScore('').s, null);
});
T('_newsIngest : payload réel 100 articles → 100 ingérés, dédoublonnage par id, hors fenêtre 24 h ignoré', () => {
  const c = mkCtx();
  const store = { byId: {}, count: 0 };
  assert.strictEqual(c._newsIngest(store, ART, T0), 100);
  assert.strictEqual(c._newsIngest(store, ART, T0), 0);
  assert.strictEqual(store.count, 100);
  const old = [{ id: 'old1', title: 'bull', feedDate: T0 - 25 * 3600 * 1000, relatedCoins: [] }, { id: 'fut', title: 'bull', feedDate: T0 + 2 * 3600 * 1000 }, null, { id: '', title: 'x', feedDate: T0 }];
  assert.strictEqual(c._newsIngest(store, old, T0), 0);
  assert.strictEqual(c._newsIngest(store, 'pas un tableau', T0), 0);
});
T('_newsIngest : élagage 24 h glissantes (un article de 23 h 59 reste, 24 h 01 part)', () => {
  const c = mkCtx();
  const store = { byId: {}, count: 0 };
  c._newsIngest(store, [{ id: 'a', title: 'x', feedDate: T0 - (24 * 60 - 1) * 60000 }, { id: 'b', title: 'x', feedDate: T0 - 10000 }], T0);
  assert.strictEqual(store.count, 2);
  c._newsIngest(store, [], T0 + 2 * 60000);
  assert.strictEqual(store.count, 1); assert.ok(store.byId.b && !store.byId.a);
});
T('_newsAggregate : demi-vie 6 h (un article de 6 h pèse 0.5), score 0–100 = (moy+1)/2, non-scorés comptés dans n seulement', () => {
  const c = mkCtx();
  const items = [{ s: 1, ts: T0, bull: 1, bear: 0 }, { s: -1, ts: T0 - 6 * 3600 * 1000, bull: 0, bear: 1 }, { s: null, ts: T0, bull: 0, bear: 0 }];
  const a = c._newsAggregate(items, T0);
  assert.strictEqual(a.n, 3); assert.strictEqual(a.nScored, 2);
  assert.ok(Math.abs(a.raw - (1 - 0.5) / 1.5) < 1e-12);
  assert.strictEqual(a.score, Math.round((a.raw + 1) / 2 * 100));
  const e = c._newsAggregate([], T0); assert.strictEqual(e.score, 50); assert.strictEqual(e.nScored, 0);
});

console.log('\n═ B · refreshNews sur le payload réel (fetch simulé) ═');
const REAL = mkCtx();
let addedReal = null;
(async () => {
await T('sans clé : aucun fetch, lastError = no_key, source inactive, signaux null', () => {
  const c = mkCtx({ key: '' });
  return c.refreshNews(true).then(r => {
    assert.strictEqual(r, false); assert.strictEqual(c.window.fetchLog.length, 0);
    assert.strictEqual(c._newsSourceAlive(), false); assert.strictEqual(c._newsPairSignal('BTC/USDT'), null);
    assert.strictEqual(c._newsGateForOpen('BTC/USDT', 'long').delta, 0);
  });
});
})().then(() => (async () => {
  // premier fetch = boot : pages 1..5 avec la clé en header, arrêt dès qu'une page n'apporte rien
  const added = await REAL.refreshNews(true);
  addedReal = added;
  T('boot : header X-API-KEY = S.newsApiKey, page 1 ingère 100, page 2 (identique) n\'apporte rien → arrêt (2 appels, pas 5)', () => {
    assert.strictEqual(added, 100);
    assert.strictEqual(REAL.window.fetchLog.length, 2);
    assert.strictEqual(REAL.window.fetchLog[0].key, 'b952ecc80cac426ea2c8b6625efc0fb5cc05cb22cdcf');
    assert.ok(REAL.window.fetchLog[0].url.startsWith('https://openapiv1.coinstats.app/news?limit=100&page=1'));
  });
  await T('TTL 15 min : un second refresh non forcé dans les 15 min ne fetch pas ; à 15 min il fetch UNE page', async () => {
    _fakeNow = T0 + 5 * 60000;
    assert.strictEqual(await REAL.refreshNews(false), false);
    assert.strictEqual(REAL.window.fetchLog.length, 2);
    _fakeNow = T0 + 15 * 60000 + 1;
    await REAL.refreshNews(false);
    assert.strictEqual(REAL.window.fetchLog.length, 3);
    _fakeNow = T0;
  });
  const v = REAL._newsView();
  T('source VIVANTE, S.veilleData écrit (newsSentimentScore 0–100, label, newsByPair 8 paires compactes, Ts)', () => {
    assert.strictEqual(REAL._newsSourceAlive(), true);
    const vd = REAL.S.veilleData;
    assert.ok(vd.newsSentimentScore >= 0 && vd.newsSentimentScore <= 100);
    assert.strictEqual(typeof vd.newsSentimentLabel, 'string');
    assert.strictEqual(Object.keys(vd.newsByPair).length, 8);
    assert.deepStrictEqual(Object.keys(vd.newsByPair['BTC/USDT']).sort(), ['label', 'n', 'nScored', 'score']);
    assert.ok(vd.newsByPairTs > 0 && vd.newsSentimentTs > 0);
  });
  T('mesure réelle : BTC ≥ 15 articles (relatedCoins), AVAX et LINK = 0 → neutres DÉCLARÉS ; global scoré ≥ 20', () => {
    assert.ok(v.pairs['BTC/USDT'].n >= 15, 'BTC n=' + v.pairs['BTC/USDT'].n);
    assert.strictEqual(v.pairs['AVAX/USDT'].n, 0); assert.strictEqual(v.pairs['LINK/USDT'].n, 0);
    assert.strictEqual(REAL._newsPairSignal('AVAX/USDT'), null);
    assert.ok(v.global.nScored >= 20, 'global nScored=' + v.global.nScored);
    console.log('     global ' + v.global.score + '/100 ' + v.global.label + ' (' + v.global.nScored + ' scorés / ' + v.global.n + ')');
    Object.keys(v.pairs).forEach(p => { const d = v.pairs[p]; console.log('     ' + p.padEnd(10) + ' n=' + String(d.n).padStart(3) + ' scorés=' + String(d.nScored).padStart(2) + ' score=' + d.score + ' ' + d.label + (d.nScored >= 5 ? '  → signal' : '  → neutre (n < 5)')); });
  });
  T('signal paire = null sous 5 scorés, objet {score,nScored,n,label,raw} au-dessus ; cohérent avec newsByPair', () => {
    Object.keys(v.pairs).forEach(p => {
      const sig = REAL._newsPairSignal(p);
      if (v.pairs[p].nScored < 5) assert.strictEqual(sig, null);
      else { assert.strictEqual(sig.score, REAL.S.veilleData.newsByPair[p].score); assert.strictEqual(sig.nScored, v.pairs[p].nScored); }
    });
  });
  T('_newsView : recent = titres scorés triés par |s| (≤ 15), pairs[].top ≤ 3 avec s non null', () => {
    assert.ok(v.recent.length <= 15 && v.recent.every(r => r.s !== null));
    for (let i = 1; i < v.recent.length; i++) assert.ok(Math.abs(v.recent[i - 1].s) >= Math.abs(v.recent[i].s));
    Object.values(v.pairs).forEach(d => { assert.ok(d.top.length <= 3); d.top.forEach(t => assert.ok(t.s !== null)); });
  });
  T('cache agrégats 60 s : même objet dans la minute, recalcul après (sans nouveau fetch)', () => {
    const lf = REAL._newsView().lastFetch; _fakeNow = lf + 1000;
    const a1 = REAL._newsView().global; const a2 = REAL._newsView().global; assert.strictEqual(a1, a2);
    _fakeNow = lf + 62 * 1000; const a3 = REAL._newsView().global; assert.notStrictEqual(a1, a3); _fakeNow = T0;
  });
  T('source jugée MORTE 45 min après le dernier fetch (3 × TTL) : signaux null, delta 0', () => {
    const lf = REAL._newsView().lastFetch;
    _fakeNow = lf + 44 * 60000; assert.strictEqual(REAL._newsSourceAlive(), true);
    _fakeNow = lf + 46 * 60000;
    assert.strictEqual(REAL._newsSourceAlive(), false); assert.strictEqual(REAL._newsPairSignal('BTC/USDT'), null);
    assert.strictEqual(REAL._newsGateForOpen('BTC/USDT', 'long').delta, 0);
    _fakeNow = T0;
  });
  await T('HTTP 401 : lastHttp 401, lastError, pas de fetch avant 30 min (backoff) sauf bouton force', async () => {
    const c = mkCtx({ http: 401 });
    await c.refreshNews(true);
    assert.strictEqual(c._newsView().http, 401); assert.ok(c._newsView().error);
    assert.strictEqual(c._newsSourceAlive(), false);
    _fakeNow = T0 + 10 * 60000; assert.strictEqual(await c.refreshNews(false), false); assert.strictEqual(c.window.fetchLog.length, 1);
    await c.refreshNews(true); assert.strictEqual(c.window.fetchLog.length, 2);
    _fakeNow = T0;
  });
  await T('updateNewsApiKey : trim, changement de clé = magasin vidé + refetch ; clé vide = rien', async () => {
    const c = mkCtx();
    await c.refreshNews(true); assert.strictEqual(c._newsView().count, 100);
    c.updateNewsApiKey('  nouvelle-cle-0123456789abcdef  ');
    assert.strictEqual(c.S.newsApiKey, 'nouvelle-cle-0123456789abcdef');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(c.window.fetchLog[c.window.fetchLog.length - 1].key, 'nouvelle-cle-0123456789abcdef');
    c.updateNewsApiKey(''); assert.strictEqual(c._newsSourceAlive(), false);
  });

  console.log('\n═ C · verdict pur et porte symétrique ═');
  T('_newsVerdict long : 25 → +0.08 ; 26/35 → +0.05 ; 36/69 → 0 ; 70 → −0.02', () => {
    const c = REAL;
    assert.strictEqual(c._newsVerdict(25, 'long').delta, 0.08); assert.strictEqual(c._newsVerdict(25, 'long').tag, 'tres_baissier');
    assert.strictEqual(c._newsVerdict(26, 'long').delta, 0.05); assert.strictEqual(c._newsVerdict(35, 'long').delta, 0.05);
    assert.strictEqual(c._newsVerdict(36, 'long').delta, 0); assert.strictEqual(c._newsVerdict(69, 'long').delta, 0);
    assert.strictEqual(c._newsVerdict(70, 'long').delta, -0.02); assert.strictEqual(c._newsVerdict(70, 'long').tag, 'haussier');
  });
  T('_newsVerdict short = miroir : 75 → +0.08 ; 70 → +0.05 ; 30 → −0.02 ; 50 → 0 des deux côtés', () => {
    const c = REAL;
    assert.strictEqual(c._newsVerdict(75, 'short').delta, 0.08); assert.strictEqual(c._newsVerdict(70, 'short').delta, 0.05);
    assert.strictEqual(c._newsVerdict(30, 'short').delta, -0.02); assert.strictEqual(c._newsVerdict(50, 'short').delta, 0);
    assert.strictEqual(c._newsVerdict(50, 'long').delta, 0);
  });
  await T('_newsGateForOpen : cache 60 s par paire|sens, invalidé par un nouveau fetch', async () => {
    const c = REAL; _fakeNow = c._newsView().lastFetch + 47 * 60000; await c.refreshNews(true);   // repart d'un fetch frais (l'horloge du banc ne recule jamais ensuite)
    const lf = c._newsView().lastFetch; _fakeNow = lf + 1000;
    const g1 = c._newsGateForOpen('BTC/USDT', 'long'); const g2 = c._newsGateForOpen('BTC/USDT', 'long');
    assert.strictEqual(g1, g2); assert.strictEqual(g1.nScored, 5); assert.strictEqual(g1.score, 58); assert.strictEqual(g1.delta, 0);
    const gs = c._newsGateForOpen('BTC/USDT', 'short'); assert.notStrictEqual(g1, gs); assert.strictEqual(gs.side, 'short');
    _fakeNow = lf + 16 * 60000; await c.refreshNews(false); assert.ok(c._newsView().lastFetch > lf);
    const g3 = c._newsGateForOpen('BTC/USDT', 'long'); assert.notStrictEqual(g1, g3); _fakeNow = T0;
  });
  T('_newsTrace : ≤ 1/5 min/paire, icône 📰, retenu +delta / ouvert −0.02, journal borné à 100', () => {
    const c = REAL; c.S.chainLog = []; _fakeNow = T0 + 24 * 3600 * 1000;   // horloge bien après toute trace précédente
    const ng = { pair: 'BTC/USDT', side: 'long', delta: 0.05, score: 31, nScored: 12 };
    c._newsTrace('BTC/USDT', ng, false); c._newsTrace('BTC/USDT', ng, false);
    c._newsTrace('ETH/USDT', { pair: 'ETH/USDT', side: 'short', delta: -0.02, score: 22, nScored: 7 }, true);
    assert.strictEqual(c.S.chainLog.length, 2);
    assert.strictEqual(c.S.chainLog[0].icon, '📰'); assert.ok(c.S.chainLog[0].desc.includes('retenu') && c.S.chainLog[0].desc.includes('+0.05') && c.S.chainLog[0].desc.includes('31/100'));
    assert.ok(c.S.chainLog[1].desc.includes('ETH/USDT SHORT ouvert') && c.S.chainLog[1].desc.includes('−0.02'));
    for (let i = 0; i < 120; i++) { c.S.chainLog.push({}); }
    _fakeNow += 6 * 60000; c._newsTrace('BTC/USDT', ng, false);
    assert.strictEqual(c.S.chainLog.length, 100); assert.ok(c.S.chainLog[99].desc && c.S.chainLog[99].desc.includes('retenu')); _fakeNow = T0;
  });

  console.log('\n═ D · 10f livré : portes avec delta news (texte réel) ═');
  const _c10e6 = { S: { feeConfig: { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 }, leverageBorrowRate: 0.0002 }, window: {}, Math, Number, Array, Object, JSON };
  vm.createContext(_c10e6); vm.runInContext(fs.readFileSync('js/10e6-frais-slippage.js', 'utf8'), _c10e6);
  const src10f = fs.readFileSync('js/10f-resolveur-cycle.js', 'utf8');
  const gateTxt = src10f.slice(src10f.indexOf('  const _mktReg ='), src10f.indexOf('  const dirGate'));
  const floorTxt = src10f.slice(src10f.indexOf('  const _convFloor ='), src10f.indexOf('  if(_gainNet < _minNetGain'));
  function gates(conv, regime, newsDelta, sig, corr) {
    const calls = [];
    const c = { S: { _convBoost: 0, openPositions: [] }, effectiveConviction: conv, ps: { trades: [] }, pair: 'BTC/USDT',
      detectMarketRegime: () => regime, _corrGateForOpen: () => ({ bonus: corr || 0, corr: null }), _ecoGateForOpen: () => ({ malus: 0, veto: false }),
      _heatGateForOpen: () => ({ delta: 0 }), _pairNetExpectancy: _c10e6._pairNetExpectancy,
      _newsGateForOpen: (p, side) => { calls.push([p, side]); return { delta: newsDelta || 0, tag: null, score: 30, nScored: 9, side }; },
      finalSignalWithMem: sig === undefined ? 0.5 : sig, _pairWatch: false, Math };
    vm.createContext(c);
    vm.runInContext(gateTxt + 'var __cg = convGate;', c);
    vm.runInContext(floorTxt.replace(/const /g, 'var '), c);
    return { convGate: c.__cg, floor: c._convFloor, newsDecisive: c._newsDecisive, heatDecisive: c._heatDecisive, corrDecisive: c._corrDecisive, calls };
  }
  T('10f : version ' + TOK + ', UN appel _newsGateForOpen, sens dérivé de finalSignalWithMem (long si > 0, short sinon)', () => {
    assert.ok(src10f.startsWith('// ▓▓▓ VERSION ' + TOK + ' ▓▓▓'));
    assert.strictEqual((src10f.match(/_newsGateForOpen\(/g) || []).length, 1);
    assert.deepStrictEqual(gates(0.4, 'calm', 0, 0.5).calls, [['BTC/USDT', 'long']]);
    assert.deepStrictEqual(gates(0.4, 'calm', 0, -0.5).calls, [['BTC/USDT', 'short']]);
  });
  T('CALM 0.35 · conv 0.40 · neutre → porte ouverte, plancher 0.30', () => { const g = gates(0.40, 'calm', 0); assert.strictEqual(g.convGate, true); assert.ok(Math.abs(g.floor - 0.30) < 1e-9); });
  T('CALM · conv 0.40 · news contre +0.05 → porte 0.40 passe (≥), plancher 0.35 ; +0.08 → porte 0.43 FERME, plancher 0.38', () => {
    const a = gates(0.40, 'calm', 0.05); assert.strictEqual(a.convGate, true); assert.ok(Math.abs(a.floor - 0.35) < 1e-9);
    const b = gates(0.40, 'calm', 0.08); assert.strictEqual(b.convGate, false); assert.ok(Math.abs(b.floor - 0.38) < 1e-9);
  });
  T('normal 0.25 · conv 0.30 · news contre +0.05 → porte 0.30 passe, plancher 0.35 le retiendra', () => {
    const g = gates(0.30, 'bull', 0.05); assert.strictEqual(g.convGate, true); assert.ok(Math.abs(g.floor - 0.35) < 1e-9);
  });
  T('CALM · conv 0.34 · news pour −0.02 → porte 0.33 passe, plancher 0.28, DÉCISIF (0.34 < 0.35 sans)', () => {
    const g = gates(0.34, 'calm', -0.02); assert.strictEqual(g.convGate, true); assert.ok(Math.abs(g.floor - 0.28) < 1e-9); assert.strictEqual(g.newsDecisive, true);
  });
  T('CALM · conv 0.40 · news pour −0.02 → non décisif (passait déjà)', () => { assert.strictEqual(gates(0.40, 'calm', -0.02).newsDecisive, false); });
  T('news + bonus corr −0.03 se cumulent : CALM +0.05 −0.03 → porte 0.37, plancher 0.32 ; P1/P3 décisifs intacts', () => {
    const g = gates(0.38, 'calm', 0.05, 0.5, 0.03); assert.strictEqual(g.convGate, true); assert.ok(Math.abs(g.floor - 0.32) < 1e-9);
    assert.strictEqual(g.corrDecisive, true); assert.strictEqual(g.heatDecisive, false);
  });
  T('10f : _newsDelta présent dans convGate, _convFloor, les 2 « décisifs » P1/P3 et les traces eco/heat du hold (12 usages)', () => {
    assert.strictEqual((src10f.match(/_newsDelta/g) || []).length, 12);
    assert.ok(src10f.includes('_heatDelta + _newsDelta - _corrBonus - (S._convBoost || 0));'));
    assert.ok(src10f.includes('+ _ecoMalus + _heatDelta + _newsDelta;'));
    assert.ok(src10f.includes('_newsTrace(pair, _newsG, false)') && src10f.includes('_newsTrace(pair, _newsG, true)'));
    assert.strictEqual((src10f.match(/_newsTrace\(/g) || []).length, 3);
    assert.ok(!src10f.includes('function _newsTrace'), 'la trace vit en 10e7, pas en 10f');
  });

  console.log('\n═ E · consommateurs livrés : 03 nlp_v1, 04, 05, 09b1/09b2 ═');
  const src03 = fs.readFileSync('js/03-per-pair-position-buttons-controls-buid.js', 'utf8');
  function nlp(sig, alive) {
    const i = src03.indexOf("    case 'nlp_v1': {"); const j = src03.indexOf("    case 'sentiment_v2': {", i);
    const body = src03.slice(i, j).replace("case 'nlp_v1': {", '').replace(/\}\s*$/, '');
    const c = { pair: 'BTC/USDT', Math, _newsPairSignal: () => sig, _newsSourceAlive: () => alive };
    vm.createContext(c);
    return vm.runInContext('(function(){' + body + '})()', c);
  }
  T('03 nlp_v1 : sans source → 0/0 « source inactive » ; source vive sans volume → 0/0 « moins de 5 » ; macro/fundamental restent neutralisés', () => {
    const a = nlp(null, false); assert.strictEqual(a.score, 0); assert.strictEqual(a.conf, 0); assert.ok(a.reasoning.includes('source inactive'));
    const b = nlp(null, true); assert.strictEqual(b.conf, 0); assert.ok(b.reasoning.includes('moins de 5'));
    assert.ok(src03.includes("    case 'macro_v1':\n    case 'fundamental_v1':\n      return { score: 0, conf: 0"));
    assert.strictEqual((src03.match(/case 'nlp_v1'/g) || []).length, 1);
  });
  T('03 nlp_v1 : score 30/100 → −0.4 ; 80 → +0.6 ; conf 0.3 + 0.04/art. plafonnée 0.7 (5 art. → 0.5, 12 → 0.7)', () => {
    const a = nlp({ score: 30, nScored: 5, label: 'NÉGATIF' }, true); assert.ok(Math.abs(a.score + 0.4) < 1e-9); assert.ok(Math.abs(a.conf - 0.5) < 1e-9); assert.ok(a.reasoning.includes('30/100'));
    const b = nlp({ score: 80, nScored: 12, label: 'HAUSSIER' }, true); assert.ok(Math.abs(b.score - 0.6) < 1e-9); assert.ok(Math.abs(b.conf - 0.7) < 1e-9);
  });
  const src04 = fs.readFileSync('js/04-v8-0-livraison-35-mode-max-permissif-v.js', 'utf8');
  const src05 = fs.readFileSync('js/05-v37-19-indicateur-de-fatigue-bot.js', 'utf8');
  T('04 : fetch CryptoCompare + NLP local SUPPRIMÉS (0 _SN_CACHE/_nlpScore/_fetchCryptoNews/refreshSentimentNews hors commentaires), rendu lit _newsView, champ clé → updateNewsApiKey', () => {
    const code = src04.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    ['_SN_CACHE', '_nlpScore', '_fetchCryptoNews', '_computeNewsScore', 'refreshSentimentNews', 'cryptocompare'].forEach(n => assert.ok(!code.includes(n), n));
    assert.ok(code.includes('_newsView()') && code.includes('updateNewsApiKey(this.value)') && code.includes('refreshNews(true)'));
    assert.strictEqual((src04.match(/function renderSentimentNewsSection/g) || []).length, 1);
  });
  T('05 : fetch + _nsScore + _NS_KEYWORDS SUPPRIMÉS, rendu lit _newsView().pairs, 8 paires (les neutres restent affichées)', () => {
    const code = src05.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    ['_NS_CACHE', '_nsScore', '_NS_KEYWORDS', 'refreshNewsScores', 'cryptocompare'].forEach(n => assert.ok(!code.includes(n), n));
    assert.ok(code.includes('_newsView()') && code.includes("'neutre (n < '"));
    assert.strictEqual((src05.match(/function renderNewsScoreSection/g) || []).length, 1);
  });
  T('04/05 rendus : exécutables sur la vue réelle (DOM simulé), sans exception, clé masquée (type=password)', () => {
    const el = { innerHTML: '' };
    const c = { document: { getElementById: () => el }, S: REAL.S, PAIRS: { 'BTC/USDT': { color: '#f7931a' } }, _newsView: REAL._newsView, Date: REAL.Date, Math, String, Object };
    vm.createContext(c);
    const b04 = src04.slice(src04.indexOf('function renderSentimentNewsSection'), src04.indexOf('window.renderSentimentNewsSection'));
    vm.runInContext(b04 + '\nrenderSentimentNewsSection();', c);
    assert.ok(el.innerHTML.includes('type="password"') && el.innerHTML.includes('Sentiment News') && el.innerHTML.includes('BTC'));
    const b05 = src05.slice(src05.indexOf('function renderNewsScoreSection'), src05.indexOf('window.renderNewsScoreSection'));
    vm.runInContext(b05 + '\nrenderNewsScoreSection();', c);
    assert.ok(el.innerHTML.includes('Scoring News') && el.innerHTML.includes('AVAX') && el.innerHTML.includes('neutre (n &lt; 5)') || el.innerHTML.includes('neutre (n < 5)'));
  });
  T('09b1 : newsApiKey dans buildSnapshot ; 09b2 : restauration + _LIGHT_KEYS', () => {
    const b1 = fs.readFileSync('js/09b1-build-snapshot.js', 'utf8'), b2 = fs.readFileSync('js/09b2-save-load.js', 'utf8');
    assert.ok(b1.includes("newsApiKey:                (typeof S.newsApiKey === 'string') ? S.newsApiKey : ''"));
    assert.ok(b2.includes("if (typeof snap.newsApiKey       === 'string') S.newsApiKey       = snap.newsApiKey;"));
    assert.ok(/'realTimeframe',\s*'newsApiKey'/.test(b2));
    assert.ok(!b1.includes('telegramCfg'), 'constat : telegramCfg non persisté (hors périmètre, documenté)');
  });

  console.log('\n═ F · HTML ═');
  const html = fs.readFileSync('AURA8_v118.html', 'utf8');
  T('HTML : 78 × v=' + TOK + ' (77 + 10e7), 0 × 20260906f, DOC_V = ' + TOK + ', 10e7 chargé UNE fois entre 10e6 et 10f', () => {
    assert.strictEqual(html.split('v=' + TOK).length - 1, 78); assert.strictEqual(html.split('20260906f').length - 1, 0);
    assert.ok(html.includes("var DOC_V = '" + TOK + "';"));
    assert.strictEqual((html.match(/js\/10e7-news-nlp\.js/g) || []).length, 1);
    const a = html.indexOf('js/10e6-frais-slippage.js'), b = html.indexOf('js/10e7-news-nlp.js'), d = html.indexOf('js/10f-resolveur-cycle.js');
    assert.ok(a < b && b < d);
  });
  T('ordre de chargement : 03, 04, 05 avant 10e7 (leurs rendus appellent _newsView au runtime seulement)', () => {
    const p = n => html.indexOf('js/' + n);
    assert.ok(p('03-per-pair') < p('10e7-news-nlp') && p('04-v8-0') < p('10e7-news-nlp') && p('05-v37-19') < p('10e7-news-nlp'));
    assert.ok(p('09b1-build-snapshot') < p('10e7-news-nlp'));
  });

  console.log('\n' + (ok + ko) + ' tests · ' + ok + ' OK · ' + ko + ' ÉCHEC(S)');
  process.exitCode = ko ? 1 : 0;
})());
