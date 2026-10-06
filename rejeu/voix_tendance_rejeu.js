// [VOIX TENDANCE LONGUE · 07/10/2026] REJEU de js/15-voix-tendance.js sur 8 ans de VRAIES bougies 1 h Binance (11 paires, 10/2018 → 09/2026).
// Le module tourne tel quel dans une vm, battement CHAQUE HEURE (hh:00:30 UTC), fetch remplacé par les archives : klines 1 h
// (startTime / endTime / limit 1, bougie de repli incluse), plus hauts des heures CLOSES pour la liquidation, prix du moment = ouverture
// de l'heure en cours (le « dernier prix réel » de l'app), sinon clôture de la dernière heure (le ticker). Une paire n'existe qu'à
// partir de son premier mois complet d'archive (règle de la porte) ; avant, le symbole est inconnu (HTTP 400, comme Binance). Compare à la référence indépendante (rejeu/voix_tendance_ref.py) :
// décision de chaque lundi pour chaque paire, chaque trade fermé (sens, lundi d'entrée, prix d'entrée et de sortie, net), positions
// tenues à la fin. Seul écart admis : l'heure d'une liquidation (± 2 h : le module la voit au battement, la référence à la bougie).
// usage : python3 -I rejeu/voix_tendance_ref.py <données>  puis  node rejeu/voix_tendance_rejeu.js <données>
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const D = process.argv[2]; if (!D) { console.log('usage : node rejeu/voix_tendance_rejeu.js <données>'); process.exit(2); }
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js/15-voix-tendance.js'), 'utf8');
const REF = JSON.parse(fs.readFileSync(path.join(D, 'voix_tendance_ref.json'), 'utf8'));
const H = 3600000, DAY = 86400000;
const PAIRS = REF.pairs;
// ── archives ──
const K = {};
for (const p of PAIRS) {
  const files = fs.readdirSync(path.join(D, 'spot1h')).filter(f => f.startsWith(p + 'USDT-1h-')).sort();
  const rows = [];
  for (const f of files) {
    const txt = cp.execFileSync('unzip', ['-p', path.join(D, 'spot1h', f)], { maxBuffer: 1 << 28 }).toString();
    for (const line of txt.split('\n')) { const c = line.split(','); if (!/^\d/.test(c[0] || '')) continue; let t = Number(c[0]); if (t > 1e14) t = Math.floor(t / 1000); rows.push([t, +c[1], +c[2], +c[4]]); }
  }
  rows.sort((a, b) => a[0] - b[0]);
  const f0 = new Date(rows[0][0]), m0 = Date.UTC(f0.getUTCFullYear(), f0.getUTCMonth(), 1);
  const live = rows[0][0] === m0 ? m0 : Date.UTC(f0.getUTCFullYear(), f0.getUTCMonth() + 1, 1);
  const r = rows.filter(x => x[0] >= live);
  K[p + 'USDT'] = { t: Float64Array.from(r.map(x => x[0])), o: Float64Array.from(r.map(x => x[1])), h: Float64Array.from(r.map(x => x[2])), c: Float64Array.from(r.map(x => x[3])) };
}
const lb = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; };   // 1er indice ≥ x
// ── vm ──
const sb = { console, __clock: { t: 0 } };
sb.window = sb; sb.setInterval = () => 0; sb.clearInterval = () => {}; sb.setTimeout = () => 0;
const resp = (body, st) => Promise.resolve({ ok: (st || 200) < 400, status: st || 200, json: () => Promise.resolve(body) });
sb.fetch = (url) => {
  const q = Object.fromEntries(new URL(url).searchParams), A = K[q.symbol], now = sb.__clock.t;
  if (!A || !(A.t.length && A.t[0] <= now)) return resp({ code: -1121, msg: 'Invalid symbol.' }, 400);   // paire pas encore cotée à cette date : Binance répond 400
  if (url.includes('ticker/price')) { const i = lb(A.t, now + 1) - 1; return i >= 0 ? resp({ price: String(A.t[i] + H <= now ? A.c[i] : A.o[i]) }) : resp({}, 400); }
  const row = (i) => [A.t[i], String(A.o[i]), String(A.h[i]), '0', String(A.c[i])];
  if (q.limit === '1' && q.startTime) { const i = lb(A.t, Number(q.startTime)); return resp(i < A.t.length && A.t[i] <= now ? [row(i)] : []); }
  if (q.limit === '1' && q.endTime) { const i = lb(A.t, Number(q.endTime) + 1) - 1; return resp(i >= 0 ? [row(i)] : []); }
  if (q.limit === '1000') { const out = []; for (let i = lb(A.t, Number(q.startTime)); i < A.t.length && out.length < 1000 && A.t[i] + H <= now; i++) out.push(row(i)); return resp(out); }
  return resp([], 400);
};
sb._isModeRunning = (m) => m === 'paperReal';
const cur = (p) => { const A = K[p.replace('/', '')]; const i = lb(A.t, Math.floor(sb.__clock.t / H) * H); return (i < A.t.length && A.t[i] === Math.floor(sb.__clock.t / H) * H) ? A.o[i] : 0; };
sb._rcPriceAge = (p) => cur(p) > 0 ? 30000 : Infinity;
sb._rcLastPrice = (p) => cur(p);
sb.rndHash = () => 'h'; sb.nowStr = () => '';
vm.createContext(sb);
const act = {}; PAIRS.forEach(p => { act[p + '/USDT'] = true; }); act['EUR/USDT'] = true;
vm.runInContext('Date.now = function () { return __clock.t; }; const CG_FIAT = { EUR: "eur", GBP: "gbp" };' +
  'const S = { feeConfig: { makerRate: 0.001, takerRate: 0.001, fundingRate: 0.00005, slippage: 0.0003 }, paperRealActivePairs: ' + JSON.stringify(act) + ', chainLog: [] };' +
  'window._stateReady = true;', sb);
vm.runInContext(SRC, sb, { filename: 'js/15-voix-tendance.js' });
(async () => {
  const mons = PAIRS.length && REF.signals[PAIRS[0]].map(x => x[0]);
  const t0 = mons[0], tEnd = mons[mons.length - 1];
  let sigOK = 0, sigN = 0, sigBad = [];
  const tStart = Date.now();
  for (let h = t0; h <= tEnd; h += H) {
    sb.__clock.t = h + 30000;
    await vm.runInContext('window._tl.tick()', sb);
    if (h % (7 * DAY) === (t0 % (7 * DAY))) {
      const k = mons.indexOf(h);
      if (k >= 0) for (const p of PAIRS) {
        const want = REF.signals[p][k][3], d = vm.runInContext('S.tendance.dec["' + p + '/USDT"]', sb);
        const got = d && d.w === h ? d.s : undefined; sigN++;
        if (got === want || (want === null && got === null)) sigOK++; else if (sigBad.length < 5) sigBad.push(p + ' ' + new Date(h).toISOString().slice(0, 10) + ' porte ' + want + ' app ' + got);
      }
    }
  }
  const T = vm.runInContext('S.tendance', sb);
  const ref = new Map(REF.trades.map(x => [x.p + '/USDT|' + x.w0, x]));
  let tOK = 0, tBad = [], liqT = 0;
  for (const x of T.hist) {
    const e = ref.get(x.p + '|' + x.w0);
    const dt = e ? x.t1 - e.t1 : NaN;
    const same = e && x.s === e.s && x.x0 === e.x0 && Math.abs(x.net - e.net) < 1e-12 && (e.why === 'liquidation' ? Math.abs(dt) <= 2 * H : (x.x1 === e.x1 && dt >= 0 && dt <= 60000));
    if (same) { tOK++; if (e.why === 'liquidation') liqT++; } else if (tBad.length < 5) tBad.push(JSON.stringify({ app: x, ref: e || null }));
  }
  const openApp = Object.keys(T.pos).sort().map(p => p + ':' + T.pos[p].side + '@' + T.pos[p].x0).join(' ');
  const openRef = Object.keys(REF.open).sort().map(p => p + '/USDT:' + (REF.open[p][0] > 0 ? 'long' : 'short') + '@' + REF.open[p][1]).join(' ');
  const sum = T.hist.reduce((a, x) => a + x.net, 0) / PAIRS.length, sumR = REF.trades.reduce((a, x) => a + x.net, 0) / PAIRS.length;
  console.log(`REJEU voix tendance longue — ${PAIRS.length} paires · ${(tEnd - t0) / H + 1} battements horaires · ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
  console.log(`  décisions du lundi identiques à la porte : ${sigOK}/${sigN}` + (sigBad.length ? ' · ex. ' + sigBad.join(' ; ') : ''));
  console.log(`  trades fermés identiques à la référence : ${tOK}/${T.hist.length} (référence ${REF.trades.length}, dont ${liqT} liquidations à ± 2 h)` + (tBad.length ? '\n    ' + tBad.join('\n    ') : ''));
  console.log(`  positions tenues à la fin : ${openApp === openRef ? 'identiques' : 'DIFFÈRENT\n    app ' + openApp + '\n    réf ' + openRef}`);
  console.log(`  cumul de la poche (mise 1/11) : app ${(T.tot.net * 100).toFixed(4)} % · Σ nets/11 ${(sum * 100).toFixed(4)} % · référence ${(sumR * 100).toFixed(4)} %`);
  const ok = sigOK === sigN && tOK === T.hist.length && T.hist.length === REF.trades.length && openApp === openRef && Math.abs(sum - sumR) < 1e-9 && Math.abs(T.tot.net - sum) < 1e-9;
  console.log(ok ? 'VERDICT : IDENTIQUE' : 'VERDICT : ÉCART');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('exception', e && e.stack || e); process.exit(1); });
