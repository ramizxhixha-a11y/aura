// [TALENT · 03/10/2026] rejeu/talent.js — « go talent » (Rams 02/10 23:39). Chaque voix de l'app, SEULE, sur 24 mois de VRAIES bougies Binance.
// Question : une voix a-t-elle un talent — prévoit-elle le mouvement mieux que le hasard, après frais ? Les 81 h des backups ne peuvent pas le dire.
// Le code qui vote est celui de l'app, tel qu'il est livré : scoutAnalysis, councilVote, getTechSignals, detectHarmonicResonance, _ctxHorizonRead,
// _btcRho / matrice de corrélation, _flowSummary, génomes — extraits des fichiers js/ par ancres (comme les bancs) et exécutés en vm. Rien n'est
// réécrit. Ce que le harnais fournit, à la CLÔTURE de chaque bougie 15 min (instant de la décision), et rien du futur :
//   ps.candles / S.realCandles['15m'] = les 60 dernières bougies closes (vrai volume) ; prix = la dernière clôture
//   S.realCandles['1h' / '4h'] = 60 bougies agrégées des 15 min (la dernière, en cours, partielle — comme le flux de l'app)
//   S.flowStats = le flux preneur des 5 dernières minutes (bougie 5 min Binance) ; aucun gros trade, aucun carnet, aucune liquidation (pas d'archive)
//   S.positioning = dernier financement réglé, intérêt ouvert sur 2 h, ratio long/short des comptes (métriques Binance)
//   S.macroFeed = Fear & Greed du jour (la capitalisation 24 h n'a pas d'archive : absente, macro_v1 ne lit que la peur / l'avidité)
//   news : aucune archive → nlp_v1 se tait ; marché LMSR : il agrège les autres voix, il n'est pas une source → lmsrP = 0,5 (scalper_v2 n'a que ses conseillers)
// Génomes : ceux du départ (GENOME_DEFAULTS, PAIR_GENOME_DEFAULTS) ; --genome <backup> lit S.genome / S.pairGenome d'un backup Guardian.
// Sortie : votes Float32 [bougie × paire × voix] (valeur publiée dans ps.roster.votes : score du scout ; conseil ±|score| ou 0 si « hold »).
// --encours 1 : comme l'app vivante, la dernière bougie lue est celle qui vient de s'ouvrir (o = h = l = c = la clôture, volume 0) : 59 closes + elle ;
//   même chose pour la bougie 1 h / 4 h qui s'ouvre à cet instant. Sans : 60 bougies closes (lecture « propre » de la logique de la voix).
// --carnet DIR (porte CARNET, 04/10/2026) : S.flowStats = les VRAIS seaux d'une minute rejoués trade par trade (rejeu/carnet_prep.py, vue « v »,
//   seaux complets avant la clôture) et S.orderBook = la dernière photo du carnet des futures avant la clôture (imb ±1 %, sans murs) — les
//   conseils qui écoutent whale_v1 / flow_v1 (scalper_v2, trend_v2, momentum_v1) les entendent alors. Sans l'option : rien ne change.
// usage : node rejeu/talent.js --data DIR --out FICHIER [--from i --to j] [--genome backup.json] [--encours 1] [--carnet DIR]
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const ROOT = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PAIRS = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'PEPE', 'EUR'].map(s => s + '/USDT');
const M15 = 900000, H1 = 3600000, H4 = 14400000, WIN = 60;

// ── code de l'app, par ancres (une ancre absente ou non unique arrête tout : le rejeu ne tourne jamais sur un code qu'il ne lit pas) ──
function between(s, a, b, incl) {
  const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error('ancre : ' + a.slice(0, 60));
  const j = s.indexOf(b, i + a.length); if (j < 0) throw new Error('ancre fin : ' + b.slice(0, 60));
  return s.slice(i, incl ? j + b.length : j);
}
const fnAt = (s, a) => between(s, a, '\n}\n', true);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), s06 = rd('js/06-v63-patterns-chartistes.js');
const s08 = rd('js/08-learning-history-render.js'), s10e = rd('js/10e-helpers-adaptatifs.js'), html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const CODE = [
  between(s02, 'const REAL_CANDLE_INTERVALS = {', '\n};', true),
  between(s02, 'var RC_HOLE_WIN = ', 'window._realCandlesStale = _realCandlesStale;', false),
  fnAt(s02, 'function _getActiveRealTimeframe() {'),
  between(s02, 'const FLOW_BUCKET_MS = ', ';', true), fnAt(s02, 'function _flowSummary(pair, minutes) {'),
  fnAt(s02, 'function _ctxEmaSeries(vals, n) {'), fnAt(s02, 'function _ctxHorizonRead(pair, tf, G, now) {'),
  between(s03, 'const GENOME_DEFAULTS = {', '// Archive la version courante (fitness de pointe atteinte)', false),
  between(s03, 'const PAIR_GENOME_DEFAULTS = {', '// Archive la version courante avec le P&L net', false),
  between(s03, 'function _techRsi(tech) {', 'window._techRsi = _techRsi;', false),
  fnAt(s03, 'function detectHarmonicResonance(pair) {'),
  between(s03, 'const ROSTER_TIERS = {', '\n};', true), between(s03, 'const COUNCIL_ADVISORS = {', '\n};', true),
  between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false),
  between(s03, 'function councilVote(councilId, pair, scoutResults) {', '\n// ── GUARDIAN CHECKS', false),
  fnAt(s06, 'function _detectPatterns(prices) {'),
  between(s08, 'function _closes(candles){', '\nconst _fundCache = {};', false),
  between(s10e, 'const CORR_CACHE_TTL_MS = ', 'window._refreshCorrelationMatrix = _refreshCorrelationMatrix;', false),
  fnAt(s10e, 'function _getPairCorrelation(pairA, pairB) {'), fnAt(s10e, 'function _getPairReturns(pair) {'), fnAt(s10e, 'function _pearsonCorrelation(returnsA, returnsB) {')
].join('\n;\n');

// ── données ──
const DATA = A.data; if (!DATA || !A.out) { console.error('usage : --data DIR --out FICHIER'); process.exit(2); }
const P = PAIRS.map(p => JSON.parse(fs.readFileSync(path.join(DATA, p.split('/')[0] + '.json'), 'utf8')));
const N = P[0].k.length; P.forEach((d, j) => { if (d.k.length !== N || d.k[N - 1][0] !== P[0].k[N - 1][0]) throw new Error('grilles différentes : ' + PAIRS[j]); });
const FNG = JSON.parse(fs.readFileSync(path.join(DATA, 'fng.json'), 'utf8'));
const ENC = A.encours === '1';
const FROM = Math.max(WIN * 16 + 1, Number(A.from || 0)), TO = Math.min(N, Number(A.to || N));   // 16 × 60 bougies : 60 bougies 4 h pleines dès le départ

// ── le bac à sable de l'app ──
let NOW = 0;
class FDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
const S = { pairStates: {}, realCandles: {}, tradingMode: 'paperReal', paperRealTimeframe: '15m', genome: {}, pairGenome: null, positioning: {}, flowStats: {},
  adaptiveState: {}, agents: [], mutedAgents: [], resonanceHistory: [], activePair: 'BTC/USDT' };
if (A.genome) { const b = JSON.parse(fs.readFileSync(A.genome, 'utf8')); const a = b.aura || b; const st = a.state || a; if (st.genome) S.genome = st.genome; if (st.pairGenome) S.pairGenome = st.pairGenome; }
const ctx = { S, window: {}, Date: FDate, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, parseInt, console,
  PAIRS: Object.fromEntries(PAIRS.map(p => [p, {}])), lmsrP: () => 0.5, getFundamentalSignals: () => null };
vm.createContext(ctx);
vm.runInContext(CODE, ctx, { filename: 'app-extraits.js' });
// getTechSignals : son cache ne touche jamais (clé rangée ≠ clé cherchée) — le harnais le mémorise par bougie et par paire, sans changer ce qu'il rend
vm.runInContext('var __gts = getTechSignals, __gtsMemo = {}; getTechSignals = function (p) { var k = p + "@" + Date.now(); if (!(k in __gtsMemo)) { __gtsMemo = (__gtsMemo.__t === Date.now()) ? __gtsMemo : { __t: Date.now() }; __gtsMemo[k] = __gts(p); } return __gtsMemo[k]; };', ctx);
const VOICES = [...vm.runInContext('ROSTER_TIERS.scouts', ctx), ...vm.runInContext('ROSTER_TIERS.council', ctx)];
const scoutAnalysis = vm.runInContext('scoutAnalysis', ctx), councilVote = vm.runInContext('councilVote', ctx);

const kObj = r => ({ ts: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] });
function agg(K, i, tf) {   // 60 bougies tf finissant à la bougie 15 min i (la dernière : en cours, partielle — rien après i)
  const out = [], tEnd = K[i][0] + M15;
  let start = Math.floor(K[i][0] / tf) * tf;
  for (let b = 0; b < WIN; b++, start -= tf) {
    let o = null, h = -Infinity, l = Infinity, c = null, v = 0;
    for (let t = start; t < start + tf && t < tEnd; t += M15) {
      const r = K[i - (K[i][0] - t) / M15]; if (!r || r[0] !== t) throw new Error('grille 15 min trouée');
      if (o === null) o = r[1]; h = Math.max(h, r[2]); l = Math.min(l, r[3]); c = r[4]; v += r[5];
    }
    out.unshift({ ts: start, o, h, l, c, v });
  }
  return out;
}
// ── porte CARNET : vrais seaux de trades et carnet (option --carnet), mêmes lectures que rejeu/carnet.js lecture 1 ──
let CFL = null, COB = null; const cpf = PAIRS.map(() => 0), cpo = PAIRS.map(() => 0);
if (A.carnet) {
  const readBin = f => { const b = fs.readFileSync(f), ab = new ArrayBuffer(b.length); new Uint8Array(ab).set(b); const n = b.length / 64, t = new BigInt64Array(ab), T = new Float64Array(n); for (let i = 0; i < n; i++) T[i] = Number(t[i * 8]); return { n, T, d: new Float64Array(ab) }; };
  const readNpy = f => { const b = fs.readFileSync(f), hl = b.readUInt16LE(8), hdr = b.toString('latin1', 10, 10 + hl); if (!/'descr': '<f8'/.test(hdr)) throw new Error('npy'); const sh = hdr.match(/'shape': \((\d+), (\d+)\)/).slice(1).map(Number); const ab = new ArrayBuffer(sh[0] * sh[1] * 8); new Uint8Array(ab).set(b.subarray(10 + hl, 10 + hl + ab.byteLength)); return { n: sh[0], w: sh[1], d: new Float64Array(ab) }; };
  CFL = PAIRS.map(p => readBin(path.join(A.carnet, p.split('/')[0] + '.v.bin')));
  COB = PAIRS.map(p => { const f = path.join(A.carnet, p.split('/')[0] + '.ob.npy'); return fs.existsSync(f) ? readNpy(f) : null; });
}
let fi = 0;
const nV = VOICES.length, nP = PAIRS.length, rows = TO - FROM;
const buf = new Float32Array(rows * nP * nV);
const t0 = Date.now();
for (let i = FROM; i < TO; i++) {
  NOW = P[0].k[i][0] + M15 + 1000;                        // une seconde après la clôture
  while (fi + 1 < FNG.length && FNG[fi + 1][0] <= NOW) fi++;
  S.macroFeed = (FNG[fi] && FNG[fi][0] <= NOW) ? { fng: FNG[fi][1], fngLabel: '', t: NOW, tFng: NOW } : null;
  S.adaptiveState = {};                                   // matrice de corrélation recalculée à chaque bougie (TTL 5 min < 15 min, comme dans l'app)
  PAIRS.forEach((p, j) => {
    const K = P[j].k, x = P[j].x[i];
    const c15 = K.slice(i - WIN + 1 + (ENC ? 1 : 0), i + 1).map(kObj);
    const tc = K[i][0] + M15, px = K[i][4], flat = () => ({ ts: tc, o: px, h: px, l: px, c: px, v: 0 });
    const a1 = agg(K, i, H1), a4 = agg(K, i, H4);
    if (ENC) { c15.push(flat()); [[a1, H1], [a4, H4]].forEach(([a, tf]) => { if (tc % tf === 0) { a.shift(); a.push(flat()); } }); }
    S.realCandles[p] = { '15m': c15, '1h': a1, '4h': a4 };
    const cs = c15.map(c => Object.assign({}, c)); cs._real = true; cs._srcTs = c15[c15.length - 1].ts;
    S.pairStates[p] = { candles: cs, price: K[i][4], qYes: 50, qNo: 50 };
    const fb = Math.floor(NOW / 60000) * 60000;
    S.flowStats[p] = (x.flow !== undefined) ? [1, 2, 3, 4].map(m => ({ t: fb - m * 60000, n: x.fn / 4, buyQ: (1 + x.flow) / 8, sellQ: (1 - x.flow) / 8, bigBuy: 0, bigSell: 0, bigBuyUsd: 0, bigSellUsd: 0 })) : [];   // 5 min en 4 seaux d'une minute : même déséquilibre, même nombre de trades
    if (CFL) {                                             // porte CARNET : seaux réels complets avant la clôture, dernière photo du carnet avant la clôture
      const F = CFL[j], arr = []; while (cpf[j] < F.n && F.T[cpf[j]] < tc) cpf[j]++;
      for (let k = Math.max(0, cpf[j] - 10); k < cpf[j]; k++) { const o = k * 8; arr.push({ t: F.T[k], buyQ: F.d[o + 1], sellQ: F.d[o + 2], n: F.d[o + 3], bigBuy: F.d[o + 4], bigSell: F.d[o + 5], bigBuyUsd: F.d[o + 6], bigSellUsd: F.d[o + 7] }); }
      S.flowStats[p] = arr; S.orderBook = S.orderBook || {}; delete S.orderBook[p];
      const O = COB[j]; if (O) { while (cpo[j] < O.n && O.d[cpo[j] * O.w] < tc) cpo[j]++; if (cpo[j] > 0) { const o = (cpo[j] - 1) * O.w, bq1 = O.d[o + 1], aq1 = O.d[o + 2]; S.orderBook[p] = { t: O.d[o], imb: (bq1 + aq1) > 0 ? (bq1 - aq1) / (bq1 + aq1) : 0, bidQ: bq1, askQ: aq1, bidWall: null, askWall: null, spreadPct: null }; } }
    }
    S.positioning[p] = (x.fund !== undefined || x.oi2h !== undefined || x.ls !== undefined) ? { funding: x.fund ?? null, oiChg2h: x.oi2h ?? null, lsRatio: x.ls ?? null, t: NOW } : undefined;
  });
  PAIRS.forEach((p, j) => {
    const sr = {}, base = ((i - FROM) * nP + j) * nV;
    vm.runInContext('ROSTER_TIERS.scouts', ctx).forEach(id => { sr[id] = scoutAnalysis(id, p); });
    VOICES.forEach((id, v) => {
      let val;
      if (id in sr) val = (sr[id] && typeof sr[id].score === 'number') ? sr[id].score : 0;
      else { const r = councilVote(id, p, sr); const mag = Math.abs(r.score || 0.3); val = r.vote === 'long' ? mag : r.vote === 'short' ? -mag : 0; }   // comme runRosterAnalysis
      buf[base + v] = isFinite(val) ? val : 0;
    });
  });
  if ((i - FROM) % 5000 === 0) process.stderr.write(`  ${new Date(NOW).toISOString().slice(0, 10)} · ${i - FROM}/${rows} · ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
}
fs.writeFileSync(A.out, Buffer.from(buf.buffer));
fs.writeFileSync(A.out + '.json', JSON.stringify({ token: TOK, from: FROM, to: TO, pairs: PAIRS, voices: VOICES, ts0: P[0].k[FROM][0], genome: A.genome ? path.basename(A.genome) : 'départ', encours: ENC, carnet: !!A.carnet }));
console.log(`talent · ${TOK} · ${rows} bougies × ${nP} paires × ${nV} voix · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
