// [CARNET · 04/10/2026] rejeu/carnet.js — « go carnet » (Rams 04/10). Les voix du FLUX DE TRADES et du CARNET sur 24 mois de vraies données.
// whale_v1 et flow_v1 sont calculées par le CODE RÉEL de l'app (scoutAnalysis de 03 et _flowSummary de 02, extraits par ancres comme dans
// rejeu/talent.js, génomes de départ), sur :
//   S.flowStats[paire] = les seaux d'une minute rejoués trade par trade par carnet_flux.c (vérifié identique à _recordTrade), complets avant
//                        l'instant de lecture — vue « v » (tous les trades) ou « a » (ceux que garde l'anti-flood de l'app)
//   S.orderBook[paire] = la dernière photo du carnet des futures STRICTEMENT avant l'instant de lecture : imb = déséquilibre ±1 %, sans murs
//                        (l'archive n'a pas les niveaux) ; l'app juge elle-même la fraîcheur (< 180 s)
// carnet_1 / carnet_5 (définitions nouvelles, hors app) : déséquilibre ±1 % / ±5 % de la même photo si elle a moins de 180 s, sinon 0.
// Instant de lecture : lecture 1 = la clôture de la bougie 15 min ; lecture 2 = une minute plus tôt (Date.now() de l'app reculé d'autant).
// Sortie : votes Float32 [bougie × paire × voix] dans l'ordre whale_v1, flow_v1, carnet_1, carnet_5 (+ .json : méta, taux de couverture).
// usage : node rejeu/carnet.js --data <paires talent_prep> --carnet <sortie carnet_prep> --vue v|a --lecture 1|2 --out FICHIER [--from i --to j]
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const ROOT = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PAIRS = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'PEPE', 'EUR'].map(s => s + '/USDT');
const M15 = 900000, WIN = 60, KEEP = 10, STALE = 180000;
function between(s, a, b, incl) {
  const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error('ancre : ' + a.slice(0, 60));
  const j = s.indexOf(b, i + a.length); if (j < 0) throw new Error('ancre fin : ' + b.slice(0, 60));
  return s.slice(i, incl ? j + b.length : j);
}
const fnAt = (s, a) => between(s, a, '\n}\n', true);
const s02 = rd('js/02-state-init.js'), s03 = rd('js/03-per-pair-position-buttons-controls-buid.js'), html = rd('AURA8_v118.html');
const TOK = (html.match(/DOC_V = '(\d{8}[a-z])'/) || [])[1];
const CODE = [   // mêmes ancres que rejeu/talent.js, sans les indicateurs techniques (whale_v1 et flow_v1 ne les lisent pas)
  between(s02, 'const FLOW_BUCKET_MS = ', ';', true), fnAt(s02, 'function _flowSummary(pair, minutes) {'),
  between(s03, 'const GENOME_DEFAULTS = {', '// Archive la version courante (fitness de pointe atteinte)', false),
  between(s03, 'const PAIR_GENOME_DEFAULTS = {', '// Archive la version courante avec le P&L net', false),
  between(s03, 'const ROSTER_TIERS = {', '\n};', true),
  between(s03, 'function scoutAnalysis(agentId, pair) {', '\n// ── COUNCIL ANALYZERS', false)
].join('\n;\n');

const VUE = A.vue || 'v', LEC = Number(A.lecture || 1);
if (!A.data || !A.carnet || !A.out || !'va'.includes(VUE) || ![1, 2].includes(LEC)) { console.error('usage : --data DIR --carnet DIR --vue v|a --lecture 1|2 --out FICHIER'); process.exit(2); }
const K = PAIRS.map(p => JSON.parse(fs.readFileSync(path.join(A.data, p.split('/')[0] + '.json'), 'utf8')).k);
const N = K[0].length; K.forEach((k, j) => { if (k.length !== N || k[N - 1][0] !== K[0][N - 1][0]) throw new Error('grilles différentes : ' + PAIRS[j]); });
const FROM = Math.max(WIN * 16 + 1, Number(A.from || 0)), TO = Math.min(N, Number(A.to || N));   // mêmes bornes que talent.js

function readBin(f) {   // seaux de carnet_flux.c : t (int64) + 7 doubles
  const b = fs.readFileSync(f), ab = new ArrayBuffer(b.length); new Uint8Array(ab).set(b);
  const n = b.length / 64, t = new BigInt64Array(ab), d = new Float64Array(ab), T = new Float64Array(n);
  for (let i = 0; i < n; i++) T[i] = Number(t[i * 8]);
  return { n, T, d };
}
function readNpy(f) {
  const b = fs.readFileSync(f); if (b.toString('latin1', 1, 6) !== 'NUMPY') throw new Error('npy : ' + f);
  const hl = b.readUInt16LE(8), hdr = b.toString('latin1', 10, 10 + hl);
  if (!/'descr': '<f8'/.test(hdr) || /'fortran_order': True/.test(hdr)) throw new Error('npy inattendu : ' + hdr);
  const shape = hdr.match(/'shape': \((\d+), (\d+)\)/).slice(1).map(Number);
  const ab = new ArrayBuffer(shape[0] * shape[1] * 8); new Uint8Array(ab).set(b.subarray(10 + hl, 10 + hl + ab.byteLength));
  return { n: shape[0], w: shape[1], d: new Float64Array(ab) };
}
const FL = PAIRS.map(p => readBin(path.join(A.carnet, p.split('/')[0] + '.' + VUE + '.bin')));
const OB = PAIRS.map(p => { const f = path.join(A.carnet, p.split('/')[0] + '.ob.npy'); return fs.existsSync(f) ? readNpy(f) : null; });

let NOW = 0;
class FDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
const S = { pairStates: {}, flowStats: {}, orderBook: {}, genome: {}, pairGenome: null, adaptiveState: {}, agents: [], mutedAgents: [] };
const ctx = { S, window: {}, Date: FDate, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, parseInt, console };
vm.createContext(ctx);
vm.runInContext(CODE, ctx, { filename: 'app-extraits.js' });
const scoutAnalysis = vm.runInContext('scoutAnalysis', ctx);
const VOICES = ['whale_v1', 'flow_v1', 'carnet_1', 'carnet_5'];
const nP = PAIRS.length, nV = VOICES.length, rows = TO - FROM, buf = new Float32Array(rows * nP * nV);
const pf = new Array(nP).fill(0), po = new Array(nP).fill(0), CV = PAIRS.map(() => [0, 0]);
const cov = PAIRS.map(() => ({ flux: 0, frais: 0, parle: [0, 0, 0, 0] }));
const t0 = Date.now();
for (let i = FROM; i < TO; i++) {
  const tc = K[0][i][0] + M15, end = LEC === 2 ? tc - 60000 : tc;
  NOW = end + 1000;                                         // comme talent.js : une seconde après l'instant de lecture
  PAIRS.forEach((p, j) => {
    const F = FL[j];
    while (pf[j] < F.n && F.T[pf[j]] < end) pf[j]++;        // pf = premier seau à ou après l'instant de lecture (jamais lu)
    const arr = [];
    for (let k = Math.max(0, pf[j] - KEEP); k < pf[j]; k++) {
      const o = k * 8; arr.push({ t: F.T[k], buyQ: F.d[o + 1], sellQ: F.d[o + 2], n: F.d[o + 3], bigBuy: F.d[o + 4], bigSell: F.d[o + 5], bigBuyUsd: F.d[o + 6], bigSellUsd: F.d[o + 7] });
    }
    S.flowStats[p] = arr;
    if (arr.length && arr[arr.length - 1].t >= end - 60000) cov[j].flux++;
    let c1 = 0, c5 = 0;
    const O = OB[j]; delete S.orderBook[p];
    if (O) {
      while (po[j] < O.n && O.d[po[j] * O.w] < end) po[j]++;  // po = première photo à ou après l'instant de lecture (jamais lue)
      if (po[j] > 0) {
        const o = (po[j] - 1) * O.w, ts = O.d[o], b1 = O.d[o + 1], a1 = O.d[o + 2], b5 = O.d[o + 3], a5 = O.d[o + 4];
        const imb1 = (b1 + a1) > 0 ? (b1 - a1) / (b1 + a1) : 0, imb5 = (b5 + a5) > 0 ? (b5 - a5) / (b5 + a5) : 0;
        S.orderBook[p] = { t: ts, imb: imb1, bidQ: b1, askQ: a1, bidWall: null, askWall: null, spreadPct: null };
        if (NOW - ts < STALE) { c1 = imb1; c5 = imb5; cov[j].frais++; }
      }
    }
    S.pairStates[p] = { candles: [], price: K[j][i][4] };
    CV[j] = [c1, c5];
  });
  PAIRS.forEach((p, j) => {
    const base = ((i - FROM) * nP + j) * nV;
    const w = scoutAnalysis('whale_v1', p), f = scoutAnalysis('flow_v1', p);
    const vals = [w && isFinite(w.score) ? w.score : 0, f && isFinite(f.score) ? f.score : 0, CV[j][0], CV[j][1]];
    vals.forEach((v, k) => { buf[base + k] = v; if (Math.abs(v) >= 0.03) cov[j].parle[k]++; });
  });
  if ((i - FROM) % 10000 === 0) process.stderr.write(`  ${new Date(NOW).toISOString().slice(0, 10)} · ${i - FROM}/${rows} · ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
}
fs.writeFileSync(A.out, Buffer.from(buf.buffer));
const couverture = Object.fromEntries(PAIRS.map((p, j) => [p, { flux_derniere_minute: cov[j].flux / rows, carnet_frais: cov[j].frais / rows, parle: Object.fromEntries(VOICES.map((v, k) => [v, cov[j].parle[k] / rows])) }]));
fs.writeFileSync(A.out + '.json', JSON.stringify({ token: TOK, from: FROM, to: TO, pairs: PAIRS, voices: VOICES, ts0: K[0][FROM][0], vue: VUE, lecture: LEC, couverture }, null, 1));
console.log(`carnet · ${TOK} · vue ${VUE} · lecture ${LEC} · ${rows} bougies × ${nP} paires × ${nV} voix · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
