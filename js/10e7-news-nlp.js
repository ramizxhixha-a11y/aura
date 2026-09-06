// ▓▓▓ VERSION 20260906g ▓▓▓
// 10e7-news-nlp.js — News NLP : source unique (fetch, magasin 24 h, scores global + paire, porte 10f)
// [P7 · 06/09/2026] BRIQUE 7 DU PONT ANALYTICS→DÉCISION. Module dédié (≤ 500 l.).
// Ordre de chargement OBLIGATOIRE : juste après 10e6, avant 10f (dans le HTML).
//
// CONSTAT (vérifié 06/09/2026) : les deux fetchs news du système (04 `refreshSentimentNews`, 05
// `refreshNewsScores`) frappaient CryptoCompare, qui exige une clé depuis 2026 (HTTP 401), et n'étaient
// appelés que par des boutons. `S.veilleData.newsSentimentScore` / `newsByPair` n'étaient JAMAIS écrits.
// L'agent `nlp_v1` (S3) lisait ce néant. Ces deux fetchs + leurs NLP locaux sont SUPPRIMÉS de 04/05.
//
// SOURCE VIVANTE : CoinStats `GET /news` (openapiv1.coinstats.app, header X-API-KEY, 5 crédits/appel,
// CORS `*` vérifié). Clé gratuite (20 000 crédits/mois, 2 req/s) saisie dans la section Sentiment News
// (04) → `S.newsApiKey` (persistée : 09b1 snapshot, 09b2 restauration + _LIGHT_KEYS).
// Réponse : { result:[ { id, title, description (vide en pratique), source, feedDate (ms),
// relatedCoins:['bitcoin','ripple',…], searchKeyWords:[…] } ] }. Paire ↔ coin via relatedCoins (identifiants
// CoinStats), plus de matching par mots-clés (`elon`/`musk` → DOGE).
//
// BUDGET : au premier fetch d'une session, NEWS_BOOT_PAGES × NEWS_PAGE_LIMIT (≈ 24 h d'articles, 25 crédits),
// puis 1 page toutes les NEWS_TTL_MS (15 min ⇒ ≈ 14 400 crédits/mois, marge ≈ 5 000).
//
// MAGASIN : RAM uniquement, 24 h glissantes, dédoublonné par id, NON persisté (rebâti au premier fetch).
// SCORE : lexique anglais (union 04 + 05) sur le TITRE, mots ENTIERS (\b) — l'ancien `includes` comptait
// `sec` dans `second`, `ban` dans `bank`, `gain` dans `against`. Article sans mot du lexique = NON scoré
// (40 % des titres ne sont pas en anglais : DiarioBitcoin, Cointurk… → ils ne biaisent pas).
// Pondération par récence : demi-vie NEWS_HALF_LIFE_MS (6 h). Score 0–100 = moyenne pondérée (−1..+1)
// projetée. Signal paire seulement si ≥ NEWS_MIN_SCORED articles scorés sur 24 h, sinon null (DÉCLARÉ).
//
// PORTE 10f (`_newsGateForOpen(pair, side)`), symétrique au sens du pari, sur la porte par régime ET le
// plancher 0.30 (même pattern que _heatDelta) :
//   long  : news ≤ 25 → +0.08 · ≤ 35 → +0.05 · ≥ 70 → −0.02
//   short : miroir (100 − score)
// LIMITE DÉCLARÉE (mesurée sur le payload réel) : ≈ 450 articles/jour ; BTC ≈ 95, XRP ≈ 40, ETH ≈ 22,
// SOL ≈ 9, ADA/DOGE ≈ 5, AVAX/LINK ≈ 0–2 sur 24 h. Après filtrage lexical, la porte n'agit en pratique
// que sur BTC / ETH / XRP ; les autres restent neutres faute de volume.
const NEWS_API_BASE     = 'https://openapiv1.coinstats.app/news';
const NEWS_TTL_MS       = 15 * 60 * 1000;
const NEWS_WINDOW_MS    = 24 * 3600 * 1000;
const NEWS_HALF_LIFE_MS = 6 * 3600 * 1000;
const NEWS_MIN_SCORED   = 5;
const NEWS_BOOT_PAGES   = 5;
const NEWS_PAGE_LIMIT   = 100;
const NEWS_PAGE_GAP_MS  = 700;          // 2 req/s max côté API
const NEWS_FETCH_TIMEOUT_MS = 12000;
const NEWS_BACKOFF_MS   = 30 * 60 * 1000; // après 401/429 : pas de nouvel appel avant 30 min
const NEWS_VBEAR_MALUS  = 0.08;
const NEWS_BEAR_MALUS   = 0.05;
const NEWS_BULL_BONUS   = 0.02;
const NEWS_VBEAR_MAX    = 25;
const NEWS_BEAR_MAX     = 35;
const NEWS_BULL_MIN     = 70;
const NEWS_GATE_CACHE_MS = 60 * 1000;
const NEWS_COIN_IDS = {
  'BTC/USDT':'bitcoin', 'ETH/USDT':'ethereum', 'XRP/USDT':'ripple', 'SOL/USDT':'solana',
  'DOGE/USDT':'dogecoin', 'ADA/USDT':'cardano', 'AVAX/USDT':'avalanche', 'LINK/USDT':'chainlink'
};
const NEWS_LEX_BULL = ['bull','bullish','surge','rally','pump','gain','gains','rise','rises','ath','record','adoption',
  'approval','approved','launch','launches','partnership','growth','positive','buy','long','moon','breakout','recovery',
  'support','accumulate','accumulation','upgrade','listing','soar','soars','jump','jumps','rebound','inflow','inflows'];
const NEWS_LEX_BEAR = ['bear','bearish','crash','crashes','dump','drop','drops','fall','falls','decline','declines','hack',
  'hacked','scam','fraud','ban','bans','regulatory','sec','lawsuit','fear','sell','selloff','sell-off','short','panic',
  'correction','resistance','liquidation','liquidations','exploit','vulnerability','delisting','penalty','fine','plunge',
  'plunges','outflow','outflows','seizure','seizures'];
const _NEWS_RE_BULL = new RegExp('\\b(' + NEWS_LEX_BULL.map(w => w.replace(/[-]/g, '\\-')).join('|') + ')\\b', 'g');
const _NEWS_RE_BEAR = new RegExp('\\b(' + NEWS_LEX_BEAR.map(w => w.replace(/[-]/g, '\\-')).join('|') + ')\\b', 'g');

// Magasin RAM (session). byId[id] = { id, title, source, ts, coins, s (−1..+1 ou null), bull, bear, words }
const _newsStore = { byId: {}, count: 0, lastFetch: 0, lastTry: 0, isFetching: false, lastError: null, lastHttp: 0, booted: false, calls: 0 };
const _newsGateCache = {};   // pair|side → { ts, out }
const _newsAggCache  = { ts: 0, fetch: 0, global: null, pairs: null };
const _newsLogTs     = {};

// ─ Lecture pure : score lexical d'un titre ─
function _newsTokenScore(title) {
  const t = String(title || '').toLowerCase();
  const bullHits = t.match(_NEWS_RE_BULL) || [];
  const bearHits = t.match(_NEWS_RE_BEAR) || [];
  const bull = bullHits.length, bear = bearHits.length, total = bull + bear;
  const words = bullHits.slice(0, 3).map(w => ({ w, type: 'bull' })).concat(bearHits.slice(0, 3).map(w => ({ w, type: 'bear' })));
  return { s: total === 0 ? null : (bull - bear) / total, bull, bear, words };
}

// ─ Ingestion pure d'un lot d'articles dans un magasin ; retourne le nombre d'articles NOUVEAUX ─
function _newsIngest(store, articles, now) {
  if (!Array.isArray(articles)) return 0;
  let added = 0;
  for (const a of articles) {
    if (!a || typeof a !== 'object') continue;
    const id = String(a.id || '');
    const ts = Number(a.feedDate) || 0;
    if (!id || !ts || (now - ts) > NEWS_WINDOW_MS || ts > now + 3600 * 1000) continue;
    if (store.byId[id]) continue;
    const sc = _newsTokenScore(a.title);
    store.byId[id] = { id, title: String(a.title || '').slice(0, 120), source: String(a.source || '').slice(0, 40), ts,
      coins: Array.isArray(a.relatedCoins) ? a.relatedCoins.map(String) : [], s: sc.s, bull: sc.bull, bear: sc.bear, words: sc.words };
    added++;
  }
  _newsPrune(store, now);
  return added;
}

function _newsPrune(store, now) {
  let n = 0;
  for (const id in store.byId) {
    if ((now - store.byId[id].ts) > NEWS_WINDOW_MS) delete store.byId[id]; else n++;
  }
  store.count = n;
  return n;
}

function _newsWeight(ts, now) { return Math.pow(0.5, Math.max(0, now - ts) / NEWS_HALF_LIFE_MS); }

function _newsLabel(score) {
  return score >= 70 ? 'HAUSSIER' : score >= 55 ? 'POSITIF' : score >= 45 ? 'NEUTRE' : score >= 35 ? 'NÉGATIF' : 'BAISSIER';
}

// ─ Agrégat pur : { n, nScored, score (0–100), raw (−1..+1), bull, bear } ─
function _newsAggregate(items, now) {
  let n = 0, nScored = 0, wSum = 0, sSum = 0, bull = 0, bear = 0;
  for (const it of items) {
    n++;
    if (it.s === null || it.s === undefined) continue;
    const w = _newsWeight(it.ts, now);
    nScored++; wSum += w; sSum += w * it.s; bull += it.bull; bear += it.bear;
  }
  const raw = wSum > 0 ? sSum / wSum : 0;
  return { n, nScored, raw, score: Math.round((raw + 1) / 2 * 100), bull, bear };
}

function _newsItems(store) { return Object.values(store.byId); }

// Agrégats global + par paire, recalculés au plus une fois par minute et à chaque fetch.
function _newsAggregates(now) {
  now = now || Date.now();
  if (_newsAggCache.pairs && _newsAggCache.fetch === _newsStore.lastFetch && (now - _newsAggCache.ts) < NEWS_GATE_CACHE_MS) return _newsAggCache;
  const items = _newsItems(_newsStore);
  const global = _newsAggregate(items, now);
  global.label = _newsLabel(global.score);
  const pairs = {};
  for (const pair in NEWS_COIN_IDS) {
    const cid = NEWS_COIN_IDS[pair];
    const sub = items.filter(it => it.coins.indexOf(cid) !== -1);
    const agg = _newsAggregate(sub, now);
    agg.label = _newsLabel(agg.score);
    agg.coinId = cid;
    agg.top = sub.filter(it => it.s !== null).sort((a, b) => b.ts - a.ts).slice(0, 3)
      .map(it => ({ title: it.title.slice(0, 60), s: it.s, source: it.source, ts: it.ts }));
    pairs[pair] = agg;
  }
  _newsAggCache.ts = now; _newsAggCache.fetch = _newsStore.lastFetch; _newsAggCache.global = global; _newsAggCache.pairs = pairs;
  return _newsAggCache;
}

// ─ État de la source ─
function _newsHasKey() { return !!(typeof S !== 'undefined' && S && typeof S.newsApiKey === 'string' && S.newsApiKey.trim().length >= 16); }
function _newsSourceAlive() {
  return _newsHasKey() && _newsStore.lastFetch > 0 && (Date.now() - _newsStore.lastFetch) < 3 * NEWS_TTL_MS && _newsStore.count > 0;
}

// ─ Lectures pour les consommateurs (03 nlp_v1, 10f, rendus 04/05) ─
function _newsGlobal() {
  if (!_newsSourceAlive()) return null;
  const g = _newsAggregates().global;
  return g.nScored >= NEWS_MIN_SCORED ? g : null;
}
function _newsPairSignal(pair) {
  if (!_newsSourceAlive()) return null;
  const p = _newsAggregates().pairs[pair];
  if (!p || p.nScored < NEWS_MIN_SCORED) return null;
  return { score: p.score, nScored: p.nScored, n: p.n, label: p.label, raw: p.raw };
}

// Verdict pur : { delta, tag, eff } pour un score 0–100 et un sens. tag = 'tres_baissier' | 'baissier' | 'haussier' | null.
function _newsVerdict(score, side) {
  const eff = side === 'short' ? 100 - score : score;   // score "dans le sens du pari"
  if (eff <= NEWS_VBEAR_MAX) return { delta: NEWS_VBEAR_MALUS, tag: 'tres_baissier', eff };
  if (eff <= NEWS_BEAR_MAX)  return { delta: NEWS_BEAR_MALUS,  tag: 'baissier',      eff };
  if (eff >= NEWS_BULL_MIN)  return { delta: -NEWS_BULL_BONUS, tag: 'haussier',      eff };
  return { delta: 0, tag: null, eff };
}

// Porte d'ouverture news (consommateur : 10f, porte par régime ET plancher 0.30, même pattern que _heatDelta).
function _newsGateForOpen(pair, side) {
  const now = Date.now();
  const k = pair + '|' + side;
  const c = _newsGateCache[k];
  if (c && c.fetch === _newsStore.lastFetch && (now - c.ts) < NEWS_GATE_CACHE_MS) return c.out;
  const sig = _newsPairSignal(pair);
  const out = sig
    ? Object.assign({ pair, side, score: sig.score, nScored: sig.nScored, label: sig.label }, _newsVerdict(sig.score, side))
    : { pair, side, delta: 0, tag: null, eff: null, score: null, nScored: 0, label: null };
  _newsGateCache[k] = { ts: now, fetch: _newsStore.lastFetch, out };
  return out;
}

// Trace journal (≤ 1 fois/5 min/paire, RAM) quand le delta news a été décisif (retenu ou ouvert grâce à lui).
function _newsTrace(pair, ng, opened) {
  const now = Date.now();
  if ((now - (_newsLogTs[pair] || 0)) < 5 * 60 * 1000) return;
  _newsLogTs[pair] = now;
  const what = 'news 24 h ' + ng.score + '/100 (' + ng.nScored + ' art.)';
  const desc = opened
    ? `News · ${pair} ${String(ng.side).toUpperCase()} ouvert grâce aux ${what} → conviction requise −${NEWS_BULL_BONUS.toFixed(2)}`
    : `News · ${pair} ${String(ng.side).toUpperCase()} retenu · ${what} contre le pari → conviction requise +${ng.delta.toFixed(2)}`;
  S.chainLog.push({ icon: '📰', desc, hash: rndHash(), time: nowStr() });
  if (S.chainLog.length > 100) S.chainLog.splice(0, S.chainLog.length - 100);
}

// ─ Écriture dans S.veilleData (compact, RAM) ─
function _newsPublish(now) {
  if (typeof S === 'undefined' || !S) return;
  if (!S.veilleData) S.veilleData = {};
  const agg = _newsAggregates(now);
  S.veilleData.newsSentimentScore = agg.global.score;
  S.veilleData.newsSentimentLabel = agg.global.label;
  S.veilleData.newsSentimentTs    = now;
  const byPair = {};
  for (const pair in agg.pairs) {
    const p = agg.pairs[pair];
    byPair[pair] = { score: p.score, n: p.n, nScored: p.nScored, label: p.label };
  }
  S.veilleData.newsByPair   = byPair;
  S.veilleData.newsByPairTs = now;
}

// ─ Fetch d'une page ─
async function _newsFetchPage(key, page) {
  const url = NEWS_API_BASE + '?limit=' + NEWS_PAGE_LIMIT + '&page=' + page;
  const res = await fetch(url, { headers: { 'X-API-KEY': key }, signal: AbortSignal.timeout(NEWS_FETCH_TIMEOUT_MS) });
  _newsStore.calls++;
  _newsStore.lastHttp = res.status;
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return Array.isArray(data && data.result) ? data.result : [];
}

function _newsRender() {
  try { if (typeof renderSentimentNewsSection === 'function') renderSentimentNewsSection(); } catch(e) {}
  try { if (typeof renderNewsScoreSection === 'function') renderNewsScoreSection(); } catch(e) {}
}

// ─ Rafraîchissement (auto toutes les 60 s via TTL, ou bouton force) ─
async function refreshNews(force) {
  const now = Date.now();
  if (!_newsHasKey()) { _newsStore.lastError = 'no_key'; _newsRender(); return false; }
  if (_newsStore.isFetching) return false;
  if (!force && _newsStore.lastFetch > 0 && (now - _newsStore.lastFetch) < NEWS_TTL_MS) return false;
  if (!force && (_newsStore.lastHttp === 401 || _newsStore.lastHttp === 429) && (now - _newsStore.lastTry) < NEWS_BACKOFF_MS) return false;
  _newsStore.isFetching = true;
  _newsStore.lastTry = now;
  const key = S.newsApiKey.trim();
  const pages = _newsStore.booted ? 1 : NEWS_BOOT_PAGES;
  let added = 0, okPages = 0;
  try {
    for (let p = 1; p <= pages; p++) {
      if (p > 1) await new Promise(r => setTimeout(r, NEWS_PAGE_GAP_MS));
      const arts = await _newsFetchPage(key, p);
      okPages++;
      const n = _newsIngest(_newsStore, arts, Date.now());
      added += n;
      if (arts.length < NEWS_PAGE_LIMIT || (p > 1 && n === 0)) break;   // fin du flux ou hors fenêtre 24 h
    }
    _newsStore.lastFetch = Date.now();
    _newsStore.lastError = null;
    _newsStore.booted = true;
    _newsPublish(_newsStore.lastFetch);
  } catch(e) {
    _newsStore.lastError = (e && e.message) || 'fetch';
    if (okPages > 0) { _newsStore.lastFetch = Date.now(); _newsStore.booted = true; _newsPublish(_newsStore.lastFetch); }
  } finally {
    _newsStore.isFetching = false;
  }
  _newsRender();
  return added;
}

function updateNewsApiKey(val) {
  if (typeof S === 'undefined' || !S) return;
  const v = String(val || '').trim();
  const changed = v !== (S.newsApiKey || '');
  S.newsApiKey = v;
  if (changed) {
    _newsStore.byId = {}; _newsStore.count = 0; _newsStore.lastFetch = 0; _newsStore.lastHttp = 0;
    _newsStore.lastError = null; _newsStore.booted = false;
    for (const k in _newsGateCache) delete _newsGateCache[k];
    _newsAggCache.pairs = null;
  }
  if (v) refreshNews(true); else _newsRender();
}

// ─ Vue pour les rendus (04 / 05) ─
function _newsView() {
  const now = Date.now();
  const agg = _newsAggregates(now);
  const items = _newsItems(_newsStore);
  const recent = items.filter(it => it.s !== null).sort((a, b) => b.ts - a.ts).slice(0, 40)
    .sort((a, b) => Math.abs(b.s) - Math.abs(a.s) || b.ts - a.ts).slice(0, 15);
  return {
    hasKey: _newsHasKey(), alive: _newsSourceAlive(), error: _newsStore.lastError, http: _newsStore.lastHttp,
    lastFetch: _newsStore.lastFetch, ageMin: _newsStore.lastFetch > 0 ? Math.floor((now - _newsStore.lastFetch) / 60000) : null,
    isFetching: _newsStore.isFetching, calls: _newsStore.calls, count: _newsStore.count, minScored: NEWS_MIN_SCORED,
    global: agg.global, pairs: agg.pairs, recent
  };
}

// ─ Planificateur : vérifie chaque minute (TTL 15 min), attend l'état restauré (clé lue depuis l'IDB) ─
if (typeof setInterval === 'function' && typeof window !== 'undefined') {
  setInterval(function () {
    try { if (window._stateReady && _newsHasKey()) refreshNews(false); } catch(e) {}
  }, 60 * 1000);
}

window._newsTokenScore   = _newsTokenScore;
window._newsIngest       = _newsIngest;
window._newsAggregate    = _newsAggregate;
window._newsVerdict      = _newsVerdict;
window._newsSourceAlive  = _newsSourceAlive;
window._newsGlobal       = _newsGlobal;
window._newsPairSignal   = _newsPairSignal;
window._newsGateForOpen  = _newsGateForOpen;
window._newsTrace        = _newsTrace;
window._newsView         = _newsView;
window.refreshNews       = refreshNews;
window.updateNewsApiKey  = updateNewsApiKey;
