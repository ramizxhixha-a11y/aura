// [TENDANCE · 06/10/2026] Porte TENDANCE — « Go tendance » (Rams 06/10 22:29) : UNE hypothèse pré-enregistrée, née de l'idée de Rams
// (« anticiper, perdre peu, gagner gros, sur plusieurs jours »), jugée sur une période JAMAIS regardée (10/2021 → 09/2024).
// Règles fixées AVANT d'avoir téléchargé ou lu la moindre bougie de cette période (écrites ici, non modifiées après ; empreinte SHA-256
// des lignes 1 à 60 et heure UTC notées dans la passation). Rien ne sera retouché pour « faire passer ».
//  D'OÙ VIENT L'HYPOTHÈSE (dit pour qu'on sache ce qui a déjà été vu) : sonde du 06/10 au chat, 10 paires, bougies 1 h 01/10/2024 → 06/10/2026,
//    9 combinaisons essayées (entrées : pile ou face, cassure 24 h, cassure 7 j × sorties : stop 1 % / objectif 3 %, 2 % / 6 %, stop 2 % + suiveur).
//    Seule « cassure 7 j + stop 2 % / objectif 6 % » a un brut > 0 les deux années (+0,28 % puis +0,10 % par trade) ; NET au barème de l'app
//    +0,016 % puis −0,157 %. Antécédents défavorables : la porte SOURCE (03/10) a jugé la tendance 7 j tenue 7 j (vote continu) PERDANTE
//    (−84 / −208 pb), et la passation du 04/10 déclarait finie la recherche de signal sur données publiques. Cette porte rouvre UNE fois,
//    pour UNE hypothèse ; si elle n'entre pas, la fin est confirmée.
//  PAIRES   : les 11 cryptos de l'app (BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE), bougies spot 1 h Binance (archives publiques) ;
//             une paire entre au premier mois complet d'archive (PEPE : cotée en 05/2023) ; EUR/USDT exclue.
//  PÉRIODE  : RÉPLIQUE = décisions du 01/10/2021 00:00 au 30/09/2024 23:00 UTC (3 années : R1 10/2021–09/2022, R2 10/2022–09/2023,
//             R3 10/2023–09/2024) — JAMAIS utilisée par la sonde. DÉCOUVERTE = 01/10/2024 → 30/09/2026 (déjà vue) : contrôle, pas verdict.
//             Un trade appartient à l'année de sa DÉCISION ; un trade encore ouvert à la fin d'une période est fermé à la dernière clôture (dit).
//  ENTRÉE   : à la clôture de la bougie i, si clôture > plus haut des 168 bougies PRÉCÉDENTES (i−168 … i−1) → LONG ; si clôture < plus bas
//             de ces 168 bougies → SHORT. Rien du futur : la bougie i n'est pas dans la fenêtre. Prix d'entrée = ouverture de la bougie i+1
//             (lecture 1) ; lecture 2 = ouverture de i+2 (1 h de retard d'exécution). L'hypothèse n'entre que si elle passe dans LES DEUX.
//  SORTIE   : stop à −2 % et objectif à +6 % du prix d'entrée (SHORT : symétrique), vérifiés sur le plus bas / plus haut de chaque bougie à
//             partir de la bougie d'entrée ; les deux touchés dans la même bougie → le STOP (prudent) ; exécution AU niveau (le glissement est
//             dans les frais) ; pas de limite de temps ; pas de levier ; une mise = 1 (le résultat est en % de la mise).
//  TEST 2 (gagne-t-elle de l'argent ?) : UNE position à la fois par paire (une cassure pendant une position est ignorée), capital K/11 par
//             paire, résultats non composés. Deux lectures de coûts : (A) barème de l'app (02) : taker 0,10 % + glissement 0,03 % par côté =
//             0,26 % l'aller-retour, sans financement — c'est ce que l'EV mesure ; (B) futures USDT-M : taker 0,05 % + glissement 0,03 % par
//             côté = 0,16 %, PLUS le financement réellement versé aux heures de calcul pendant la position (LONG paie r, SHORT reçoit r ;
//             archives fundingRate du contrat, 1000PEPEUSDT pour PEPE). Passe en (A) si net_A > 0 sur toute la réplique avec ≥ 30 trades ET
//             net_A > 0 dans au moins 2 des 3 années ; idem pour (B).
//  TEST 1 (sait-elle quelque chose ?) : univers = TOUTES les cassures (chevauchements permis), résultat BRUT de la fourchette par cassure.
//             Témoins = les mêmes cassures (instant, sens) décalées de k jours entiers, k de 60 à (jours de la période − 60), rotation modulo
//             la période (comme talent_ana / source_ana). z = (brut réel − moyenne des témoins) / écart-type des témoins.
//             TALENT = z ≥ seuil ET brut réel > 0 dans CHACUNE des 3 années de réplique.
//  SEUIL z  : UNE hypothèse, risque 5 % d'un seul côté → seuil = quantile 95 % du z (lecture 1, réplique entière) sur 500 MONDES TÉMOINS,
//             jamais sous 1,645 (quantile normal). Monde témoin = les vraies bougies dont le SIGNE des rendements est tiré à pile ou face
//             par jour UTC (même pièce pour les 11 paires le même jour, graine 20261006) : chaque bougie d'un jour retourné est le miroir de
//             la vraie autour de son ouverture (en log) ; la volatilité, ses grappes et la corrélation entre paires sont gardées, la
//             persistance de direction d'un jour à l'autre — ce que la cassure prétend lire — est détruite. On rapporte aussi la part des
//             mondes témoins qui passeraient TOUTE la porte (TALENT + test 2 A) : c'est le vrai taux de fausse admission de la procédure.
//  VERDICT  : ENTRE = TALENT (test 1) ET test 2 (A), dans les deux lectures, sur la réplique, ET net_A > 0 sur toute la découverte (condition
//             nécessaire : données déjà vues). ENTRE SUR FUTURES SEULEMENT = idem avec (B) à la place de (A) quand (A) échoue → pas de voix
//             dans la décision sans décision de Rams sur le barème de l'EV. Sinon N'ENTRE PAS, et la fin de la recherche de signal sur
//             données publiques (passation 04/10) est confirmée. ENTRER ne veut pas dire trader en RE : il faudrait encore l'EV en direct.
//  RAPPORTÉ (informatif, hors verdict) : par année et par paire ; LONG seul / SHORT seul ; durées (médiane, 90 %, max) ; positions ouvertes
//             en même temps ; pire baisse du capital (somme des trades fermés) ; part des trades fermés de force ; financement total (B) ;
//             carte de robustesse : fenêtres {72, 168, 336, 672} bougies × fourchettes {1/3, 2/6, 3/9, 2/4, 2/2} % (un vrai effet a des
//             voisins lisses, un coup de chance est un pic) ; contrôle = les mêmes règles sur la découverte doivent redonner la sonde du 06/10
//             (10 paires sans PEPE, à ±0,02 point par trade près, données api vs archives).
//  NON MODÉLISÉ (dit au rapport) : montants minimaux d'ordre, exécution partielle, frais maker, risque de plateforme, fiscalité, levier,
//             appel de marge, le fait que l'app (02) ne vend pas à découvert au comptant.
//  AUCUN CODE DE L'APP N'EST TOUCHÉ dans cette mission (mesure seule).
// usage : sh rejeu/portage_get.sh <données> 2021-09 2026-09   (bougies 1 h spot + financement, archives Binance, hors dépôt)
//         node rejeu/tendance.js <données> [--mondes 500] [--graine 20261006] [--sans-mondes] > rapport.txt   (écrit <données>/tendance.json)
// ---------------------------------------------------------------------------------------------------------------------------------------------
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ARGS = process.argv.slice(2);
const D = ARGS.find(a => !a.startsWith('--')) || 'donnees';
const opt = (k, d) => { const i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; };
const N_MONDES = ARGS.includes('--sans-mondes') ? 0 : +opt('--mondes', 500);
const GRAINE = +opt('--graine', 20261006);
const PAIRS = 'BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE'.split(' ');
const FSYM = p => (p === 'PEPE' ? '1000PEPE' : p) + 'USDT';
const H = 3600000, DAY = 86400000;
const T = s => Date.parse(s + 'T00:00:00Z');
const R_START = T('2021-10-01'), R_END = T('2024-10-01'), D_START = T('2024-10-01'), D_END = T('2026-10-01');
const YEARS_R = [['R1 10/2021–09/2022', T('2021-10-01'), T('2022-10-01')], ['R2 10/2022–09/2023', T('2022-10-01'), T('2023-10-01')], ['R3 10/2023–09/2024', T('2023-10-01'), T('2024-10-01')]];
const YEARS_D = [['D1 10/2024–09/2025', T('2024-10-01'), T('2025-10-01')], ['D2 10/2025–09/2026', T('2025-10-01'), T('2026-10-01')]];
let REENTREE_SORTIE = false;
const LOOKBACK = 168, STOP = 0.02, TP = 0.06, COST_A = 0.0026, COST_B = 0.0016, K_MIN = 60, MIN_TRADES = 30, Z_FLOOR = 1.645;
const pct = x => (100 * x).toFixed(3) + ' %', pct2 = x => (100 * x).toFixed(2) + ' %';
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const sd = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const quant = (a, q) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };
const tstat = a => a.length > 2 ? mean(a) / (sd(a) / Math.sqrt(a.length)) : NaN;

// ---------- données : bougies 1 h spot (archives mensuelles + quotidiennes), financement ----------
function readZipCsv(f) { try { return cp.execSync(`unzip -p "${f}"`, { maxBuffer: 1 << 28 }).toString().split('\n'); } catch (e) { return []; } }
function loadPair(p) {
  const files = fs.readdirSync(path.join(D, 'spot1h')).filter(f => f.startsWith(p + 'USDT-1h-')).sort();
  const rows = [];
  for (const f of files) for (const line of readZipCsv(path.join(D, 'spot1h', f))) {
    if (!line || line.startsWith('open_time')) continue;
    const c = line.split(','); let t = +c[0]; if (t > 1e14) t = Math.floor(t / 1000);
    rows.push([t, +c[1], +c[2], +c[3], +c[4]]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  const out = { t: [], o: [], h: [], l: [], c: [] }; let last = -1;
  for (const r of rows) { if (r[0] === last) continue; last = r[0]; out.t.push(r[0]); out.o.push(r[1]); out.h.push(r[2]); out.l.push(r[3]); out.c.push(r[4]); }
  // financement du contrat perp (calc_time, intervalle, taux) → listes triées
  const ff = fs.readdirSync(path.join(D, 'fund')).filter(f => f.startsWith(FSYM(p) + '-fundingRate-')).sort();
  const fund = [];
  for (const f of ff) for (const line of readZipCsv(path.join(D, 'fund', f))) {
    if (!line || line.startsWith('calc_time')) continue; const c = line.split(','); if (c.length < 3) continue; fund.push([+c[0], +c[2]]);
  }
  fund.sort((a, b) => a[0] - b[0]);
  out.fundT = fund.map(x => x[0]); out.fundCum = []; let s = 0; for (const x of fund) { s += x[1]; out.fundCum.push(s); }
  return out;
}
// somme des taux de financement versés sur ]t0, t1]
function fundingSum(P, t0, t1) {
  const bs = (arr, x) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) lo = m + 1; else hi = m; } return lo; }; // nb ≤ x
  const a = bs(P.fundT, t0), b = bs(P.fundT, t1);
  return (b ? P.fundCum[b - 1] : 0) - (a ? P.fundCum[a - 1] : 0);
}
// ---------- table des sorties : entrée à l'ouverture de e, fourchette (stop, tp), côté s (+1 LONG / −1 SHORT) ----------
// retourne {exitIdx: Int32Array, exitPx: Float64Array}
function buildTable(P, side, stop, tp) {
  const n = P.t.length, exitIdx = new Int32Array(n), exitPx = new Float64Array(n);
  const { o, h, l, c } = P;
  for (let e = 0; e < n; e++) {
    const E = o[e]; let j = e, ex = -1, px = 0;
    if (side > 0) { const S = E * (1 - stop), Tt = E * (1 + tp); for (; j < n; j++) { if (l[j] <= S) { ex = j; px = S; break; } if (h[j] >= Tt) { ex = j; px = Tt; break; } } }
    else { const S = E * (1 + stop), Tt = E * (1 - tp); for (; j < n; j++) { if (h[j] >= S) { ex = j; px = S; break; } if (l[j] <= Tt) { ex = j; px = Tt; break; } } }
    if (ex < 0) { ex = n - 1; px = c[n - 1]; }
    exitIdx[e] = ex; exitPx[e] = px;
  }
  return { exitIdx, exitPx };
}
// résultat brut d'une entrée e, plafonné à l'indice cap (fermeture forcée à la clôture de cap)
function outcome(P, tab, side, e, cap) {
  const E = P.o[e]; let ex = tab.exitIdx[e], px = tab.exitPx[e], forced = false;
  if (ex > cap) { ex = cap; px = P.c[cap]; forced = true; }
  return { pnl: side * (px / E - 1), exit: ex, forced };
}
// ---------- cassures : décision à la clôture de i, fenêtre = i−L … i−1 ----------
function breakouts(P, L, i0, i1) {
  const ev = []; const { h, l, c } = P;
  // déque monotone pour max(h) / min(l) glissants sur la fenêtre précédente
  const n = P.t.length; let dqH = [], dqL = []; // indices
  for (let i = 0; i < n; i++) {
    if (i >= L && i >= i0 && i <= i1) {
      const hi = h[dqH[0]], lo = l[dqL[0]];
      if (c[i] > hi) ev.push({ i, side: 1 }); else if (c[i] < lo) ev.push({ i, side: -1 });
    }
    while (dqH.length && h[dqH[dqH.length - 1]] <= h[i]) dqH.pop(); dqH.push(i);
    while (dqL.length && l[dqL[dqL.length - 1]] >= l[i]) dqL.pop(); dqL.push(i);
    while (dqH[0] <= i - L) dqH.shift(); while (dqL[0] <= i - L) dqL.shift();
  }
  return ev;
}
const idxAtOrAfter = (P, t) => { let lo = 0, hi = P.t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (P.t[m] < t) lo = m + 1; else hi = m; } return lo; };
const idxLastBefore = (P, t) => idxAtOrAfter(P, t) - 1; // dernière bougie ouverte avant t
const yearOf = (years, t) => { for (const y of years) if (t >= y[1] && t < y[2]) return y[0]; return null; };

// ---------- TEST 1 : brut de toutes les cassures contre rotations ----------
function test1(DATA, L, stop, tp, lecture, pStart, pEnd, tables) {
  const days = Math.round((pEnd - pStart) / DAY); const reals = [], byYear = {};
  const evAll = []; // {p, side, tEntry}
  for (const p of PAIRS) {
    const P = DATA[p]; if (!P || !P.t.length) continue;
    const i0 = idxAtOrAfter(P, pStart), i1 = idxLastBefore(P, pEnd), cap = i1;
    if (i1 - i0 < 24 * 60) continue;
    for (const ev of breakouts(P, L, i0, i1)) {
      const e = ev.i + lecture; if (e > i1) continue;
      const tab = tables[p][ev.side > 0 ? 'L' : 'S'];
      const r = outcome(P, tab, ev.side, e, cap); reals.push(r.pnl);
      evAll.push({ p, side: ev.side, tEntry: P.t[e] });
      const y = yearOf(YEARS_R.concat(YEARS_D), P.t[ev.i]); if (y) (byYear[y] = byYear[y] || []).push(r.pnl);
    }
  }
  const real = mean(reals), plac = [];
  const capBy = {}; for (const p of PAIRS) if (DATA[p] && DATA[p].t.length) capBy[p] = idxLastBefore(DATA[p], pEnd);
  for (let k = K_MIN; k <= days - K_MIN; k++) {
    let s = 0, n = 0;
    for (const ev of evAll) {
      let t2 = ev.tEntry + k * DAY; if (t2 >= pEnd) t2 -= (pEnd - pStart);
      const P = DATA[ev.p]; const e2 = idxAtOrAfter(P, t2); const cap = capBy[ev.p];
      if (e2 > cap || e2 < 0) continue;
      s += outcome(P, tables[ev.p][ev.side > 0 ? 'L' : 'S'], ev.side, e2, cap).pnl; n++;
    }
    plac.push(s / n);
  }
  const z = (real - mean(plac)) / sd(plac);
  const out = { n: reals.length, brut: real, z, temoins_moy: mean(plac), temoins_sd: sd(plac), rotations: plac.length, par_annee: {} };
  for (const y in byYear) out.par_annee[y] = { n: byYear[y].length, brut: mean(byYear[y]) };
  return out;
}
// ---------- TEST 2 : une position à la fois par paire, net A / B ----------
function test2(DATA, L, stop, tp, lecture, pStart, pEnd, tables, years) {
  const trades = [];
  for (const p of PAIRS) {
    const P = DATA[p]; if (!P || !P.t.length) continue;
    const i0 = idxAtOrAfter(P, pStart), i1 = idxLastBefore(P, pEnd), cap = i1; if (i1 - i0 < 24 * 60) continue;
    let busyUntil = -1;
    for (const ev of breakouts(P, L, i0, i1)) {
      if (ev.i < busyUntil) continue; // en position : cassure ignorée
      const e = ev.i + lecture; if (e > i1) continue;
      const tab = tables[p][ev.side > 0 ? 'L' : 'S'];
      const r = outcome(P, tab, ev.side, e, cap);
      const fund = fundingSum(P, P.t[e], P.t[r.exit] + H - 1); // versements pendant ]ouverture entrée, clôture sortie]
      const netB = r.pnl - COST_B - ev.side * fund;
      trades.push({ p, side: ev.side, tDec: P.t[ev.i], tEntry: P.t[e], tExit: P.t[r.exit] + H, dur: r.exit - e + 1, brut: r.pnl, netA: r.pnl - COST_A, netB, fund: -ev.side * fund, forced: r.forced, year: yearOf(years, P.t[ev.i]) });
      busyUntil = r.exit + (REENTREE_SORTIE ? 0 : 1); // comme la sonde du 06/10 : aucune décision à la clôture de la bougie de sortie (variante REENTREE_SORTIE : informative)
    }
  }
  trades.sort((a, b) => a.tEntry - b.tEntry);
  const agg = tr => tr.length ? { n: tr.length, brut: mean(tr.map(t => t.brut)), netA: mean(tr.map(t => t.netA)), netB: mean(tr.map(t => t.netB)), tA: tstat(tr.map(t => t.netA)),
    gagnants: tr.filter(t => t.brut > 0).length / tr.length, forces: tr.filter(t => t.forced).length, totalA: tr.reduce((s, t) => s + t.netA, 0) / PAIRS.length, totalB: tr.reduce((s, t) => s + t.netB, 0) / PAIRS.length } : { n: 0 };
  const out = { tout: agg(trades), par_annee: {}, par_paire: {}, long: agg(trades.filter(t => t.side > 0)), short: agg(trades.filter(t => t.side < 0)) };
  for (const y of years) out.par_annee[y[0]] = agg(trades.filter(t => t.year === y[0]));
  for (const p of PAIRS) out.par_paire[p] = agg(trades.filter(t => t.p === p));
  const durs = trades.map(t => t.dur / 24);
  out.durees_j = trades.length ? { mediane: quant(durs, .5), q90: quant(durs, .9), max: Math.max(...durs) } : null;
  // positions ouvertes en même temps, pire baisse du capital (somme des netA fermés, capital = 1 réparti K/11)
  const evs = []; for (const t of trades) evs.push([t.tEntry, 1], [t.tExit, -1]); evs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, mx = 0; for (const e of evs) { cur += e[1]; if (cur > mx) mx = cur; }
  const byExit = trades.slice().sort((a, b) => a.tExit - b.tExit); let eq = 0, peak = 0, dd = 0, ddB = 0, eqB = 0, peakB = 0;
  for (const t of byExit) { eq += t.netA / PAIRS.length; if (eq > peak) peak = eq; if (peak - eq > dd) dd = peak - eq; eqB += t.netB / PAIRS.length; if (eqB > peakB) peakB = eqB; if (peakB - eqB > ddB) ddB = peakB - eqB; }
  out.simultanees_max = mx; out.pire_baisse_A = dd; out.pire_baisse_B = ddB; out.financement_total_B = trades.reduce((s, t) => s + t.fund, 0) / PAIRS.length;
  out.trades = trades;
  return out;
}
function tablesFor(DATA, stop, tp) { const T2 = {}; for (const p of PAIRS) if (DATA[p] && DATA[p].t.length) T2[p] = { L: buildTable(DATA[p], 1, stop, tp), S: buildTable(DATA[p], -1, stop, tp) }; return T2; }
const passes2 = (t2, key, years) => t2.tout.n >= MIN_TRADES && t2.tout[key] > 0 && years.filter(y => (t2.par_annee[y[0]].n || 0) > 0 && t2.par_annee[y[0]][key] > 0).length >= 2;

// ---------- mondes témoins : signe des rendements tiré par jour UTC (même pièce pour toutes les paires), miroir autour de l'ouverture ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mondeTemoin(DATA, rnd, pStart, pEnd) {
  const flips = new Map(); const W = {};
  for (const p of PAIRS) {
    const P = DATA[p]; if (!P || !P.t.length) continue;
    const i0 = idxAtOrAfter(P, pStart - LOOKBACK * H), i1 = idxLastBefore(P, pEnd); if (i1 - i0 < 24 * 60) continue;
    const n = i1 - i0 + 1, Q = { t: new Array(n), o: new Float64Array(n), h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), fundT: P.fundT, fundCum: P.fundCum };
    let prevC = Math.log(P.o[i0]);
    for (let k = 0; k < n; k++) {
      const i = i0 + k, day = Math.floor(P.t[i] / DAY); let f = flips.get(day); if (f === undefined) { f = rnd() < 0.5 ? 1 : -1; flips.set(day, f); }
      const lo = Math.log(P.o[i]), dh = Math.log(P.h[i]) - lo, dl = Math.log(P.l[i]) - lo, dc = Math.log(P.c[i]) - lo;
      const o2 = prevC; const h2 = f > 0 ? o2 + dh : o2 - dl, l2 = f > 0 ? o2 + dl : o2 - dh, c2 = f > 0 ? o2 + dc : o2 - dc;
      Q.t[k] = P.t[i]; Q.o[k] = Math.exp(o2); Q.h[k] = Math.exp(h2); Q.l[k] = Math.exp(l2); Q.c[k] = Math.exp(c2); prevC = c2;
    }
    W[p] = Q;
  }
  return W;
}

// =================================================================== PRINCIPAL ===================================================================
const t0 = Date.now();
const DATA = {}; for (const p of PAIRS) { DATA[p] = loadPair(p); }
const out = { regles: 'rejeu/tendance.js lignes 1–52 (SHA-256 dans la passation)', paires: {}, replique: {}, decouverte: {}, controle: {}, mondes: null, robustesse: [], verdict: null };
for (const p of PAIRS) out.paires[p] = { bougies: DATA[p].t.length, de: DATA[p].t.length ? new Date(DATA[p].t[0]).toISOString().slice(0, 10) : null, a: DATA[p].t.length ? new Date(DATA[p].t[DATA[p].t.length - 1]).toISOString().slice(0, 10) : null, financements: DATA[p].fundT.length };
console.log(`PORTE TENDANCE — cassure ${LOOKBACK} h, stop ${pct2(STOP)} / objectif ${pct2(TP)} — ${PAIRS.length} paires · chargement ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const p of PAIRS) console.log(`  ${p.padEnd(5)} ${String(out.paires[p].bougies).padStart(6)} bougies 1 h  ${out.paires[p].de} → ${out.paires[p].a} · ${out.paires[p].financements} versements`);
const TAB = tablesFor(DATA, STOP, TP);
for (const [nom, pS, pE, years] of [['replique', R_START, R_END, YEARS_R], ['decouverte', D_START, D_END, YEARS_D]]) {
  for (const lecture of [1, 2]) {
    const t1 = test1(DATA, LOOKBACK, STOP, TP, lecture, pS, pE, TAB), t2 = test2(DATA, LOOKBACK, STOP, TP, lecture, pS, pE, TAB, years);
    const trades = t2.trades; delete t2.trades;
    out[nom]['lecture' + lecture] = { test1: t1, test2: t2 };
    if (nom === 'replique' && lecture === 1) out.replique.trades_l1 = trades.map(t => ({ p: t.p, s: t.side, dec: new Date(t.tDec).toISOString(), brut: +t.brut.toFixed(5), netA: +t.netA.toFixed(5), netB: +t.netB.toFixed(5), dur_h: t.dur, forced: t.forced }));
  }
}
// contrôle : découverte, 10 paires sans PEPE (la sonde du 06/10)
{
  const DATA10 = Object.assign({}, DATA); DATA10.PEPE = { t: [], fundT: [], fundCum: [] };
  const t2 = test2(DATA10, LOOKBACK, STOP, TP, 1, D_START, D_END, TAB, YEARS_D); delete t2.trades;
  out.controle = { note: 'sonde 06/10 (api, 10 paires, jusqu’au 06/10) : 1763 trades, net A an1 +0,016 %, an2 −0,157 %', n: t2.tout.n, netA_D1: t2.par_annee['D1 10/2024–09/2025'].netA, netA_D2: t2.par_annee['D2 10/2025–09/2026'].netA };
}
// robustesse (informatif) : fenêtres × fourchettes, réplique, lecture 1
for (const L of [72, 168, 336, 672]) for (const [s, tp] of [[0.01, 0.03], [0.02, 0.06], [0.03, 0.09], [0.02, 0.04], [0.02, 0.02]]) {
  const tab = (s === STOP && tp === TP) ? TAB : tablesFor(DATA, s, tp);
  const t1 = test1(DATA, L, s, tp, 1, R_START, R_END, tab), t2 = test2(DATA, L, s, tp, 1, R_START, R_END, tab, YEARS_R);
  const t2d = test2(DATA, L, s, tp, 1, D_START, D_END, tab, YEARS_D);
  out.robustesse.push({ L, stop: s, tp, n: t2.tout.n, brut_ev: t1.brut, z: t1.z, netA: t2.tout.netA, netB: t2.tout.netB, netA_decouverte: t2d.tout.netA, n_decouverte: t2d.tout.n });
}
// variante informative : décision permise à la clôture de la bougie de sortie (ce que faisait la 1re version de ce fichier)
{
  REENTREE_SORTIE = true;
  const r = test2(DATA, LOOKBACK, STOP, TP, 1, R_START, R_END, TAB, YEARS_R), d = test2(DATA, LOOKBACK, STOP, TP, 1, D_START, D_END, TAB, YEARS_D);
  out.variante_reentree = { replique: { n: r.tout.n, netA: r.tout.netA, netB: r.tout.netB }, decouverte: { n: d.tout.n, netA: d.tout.netA, netB: d.tout.netB } };
  REENTREE_SORTIE = false;
}
// mondes témoins
let seuil = Z_FLOOR;
if (N_MONDES > 0) {
  const rnd = mulberry32(GRAINE), zs = [], full = []; const tm = Date.now();
  for (let w = 0; w < N_MONDES; w++) {
    const W = mondeTemoin(DATA, rnd, R_START, R_END); const tab = tablesFor(W, STOP, TP);
    const t1 = test1(W, LOOKBACK, STOP, TP, 1, R_START, R_END, tab); zs.push(t1.z);
    const t2 = test2(W, LOOKBACK, STOP, TP, 1, R_START, R_END, tab, YEARS_R);
    const talent = t1.z >= Z_FLOOR && YEARS_R.every(y => (t1.par_annee[y[0]] || { brut: 0 }).brut > 0);
    full.push({ z: t1.z, talent_1645: talent, test2A: passes2(t2, 'netA', YEARS_R), netA: t2.tout.netA, brut: t1.brut, n: t2.tout.n });
    if ((w + 1) % 50 === 0) console.error(`  mondes ${w + 1}/${N_MONDES} · ${((Date.now() - tm) / 1000).toFixed(0)} s`);
  }
  const q95 = quant(zs, 0.95); seuil = Math.max(Z_FLOOR, q95);
  out.mondes = { n: N_MONDES, graine: GRAINE, z_q95: q95, z_q99: quant(zs, 0.99), z_max: Math.max(...zs), z_moy: mean(zs), z_sd: sd(zs), seuil,
    part_talent_au_seuil: full.filter(f => f.z >= seuil && f.talent_1645).length / N_MONDES, part_test2A: full.filter(f => f.test2A).length / N_MONDES,
    part_porte_entiere: full.filter(f => f.z >= seuil && f.talent_1645 && f.test2A).length / N_MONDES, brut_moy: mean(full.map(f => f.brut)), netA_moy: mean(full.map(f => f.netA)), n_moy: mean(full.map(f => f.n)) };
}
// verdict
const R1 = out.replique.lecture1, R2 = out.replique.lecture2, D1 = out.decouverte.lecture1, D2 = out.decouverte.lecture2;
const talentOK = l => l.test1.z >= seuil && YEARS_R.every(y => (l.test1.par_annee[y[0]] || { brut: -1 }).brut > 0);
const vA = [R1, R2].every(l => talentOK(l) && passes2(l.test2, 'netA', YEARS_R)) && [D1, D2].every(l => l.test2.tout.netA > 0);
const vB = [R1, R2].every(l => talentOK(l) && passes2(l.test2, 'netB', YEARS_R)) && [D1, D2].every(l => l.test2.tout.netB > 0);
out.verdict = vA ? 'ENTRE' : vB ? 'ENTRE SUR FUTURES SEULEMENT' : "N'ENTRE PAS";
out.seuil_z = seuil;
fs.writeFileSync(path.join(D, 'tendance.json'), JSON.stringify(out, null, 1));

// ---------- rapport ----------
const F = (x, d = 3) => (x === undefined || x === null || Number.isNaN(x)) ? '   —   ' : (100 * x >= 0 ? '+' : '') + (100 * x).toFixed(d) + ' %';
function bloc(nom, L1, L2, years) {
  console.log(`\n═══ ${nom} ═══`);
  for (const [lab, l] of [['lecture 1 (entrée à l’ouverture suivante)', L1], ['lecture 2 (1 h plus tard)', L2]]) {
    const t1 = l.test1, t2 = l.test2;
    console.log(`— ${lab}`);
    console.log(`  TEST 1 : ${t1.n} cassures · brut ${F(t1.brut)} par cassure · témoins ${F(t1.temoins_moy)} ± ${F(t1.temoins_sd)} (${t1.rotations} rotations) · z = ${t1.z.toFixed(2)}`);
    for (const y of years) { const a = t1.par_annee[y[0]]; if (a) console.log(`           ${y[0]} : ${a.n} cassures, brut ${F(a.brut)}`); }
    console.log(`  TEST 2 : ${t2.tout.n} trades (une position par paire) · gagnants ${(100 * t2.tout.gagnants).toFixed(1)} % · brut ${F(t2.tout.brut)} · NET A ${F(t2.tout.netA)} (t ${t2.tout.tA.toFixed(1)}) · NET B ${F(t2.tout.netB)} · forcés ${t2.tout.forces}`);
    console.log(`           total sur le capital : A ${F(t2.tout.totalA, 2)} · B ${F(t2.tout.totalB, 2)} · financement B ${F(t2.financement_total_B, 2)} · pire baisse A ${F(t2.pire_baisse_A, 2)} · B ${F(t2.pire_baisse_B, 2)}`);
    for (const y of years) { const a = t2.par_annee[y[0]]; if (a && a.n) console.log(`           ${y[0]} : ${a.n} trades, brut ${F(a.brut)}, net A ${F(a.netA)}, net B ${F(a.netB)}, total A ${F(a.totalA, 2)}`); }
    console.log(`           LONG ${t2.long.n} : brut ${F(t2.long.brut)} net A ${F(t2.long.netA)} · SHORT ${t2.short.n} : brut ${F(t2.short.brut)} net A ${F(t2.short.netA)}`);
    if (t2.durees_j) console.log(`           durée (jours) : médiane ${t2.durees_j.mediane.toFixed(2)} · 90 % ${t2.durees_j.q90.toFixed(1)} · max ${t2.durees_j.max.toFixed(0)} · positions simultanées max ${t2.simultanees_max}`);
    console.log('           par paire : ' + PAIRS.map(p => t2.par_paire[p].n ? `${p} ${t2.par_paire[p].n}/${F(t2.par_paire[p].netA, 2)}` : `${p} —`).join(' · '));
  }
}
bloc('RÉPLIQUE 10/2021 → 09/2024 (jamais vue) — c’est elle qui juge', R1, R2, YEARS_R);
bloc('DÉCOUVERTE 10/2024 → 09/2026 (déjà vue) — contrôle', D1, D2, YEARS_D);
console.log(`\nCONTRÔLE sonde 06/10 (10 paires sans PEPE, lecture 1) : ${out.controle.n} trades · net A D1 ${F(out.controle.netA_D1)} · D2 ${F(out.controle.netA_D2)} — ${out.controle.note}`);
console.log(`VARIANTE ré-entrée à la clôture de la bougie de sortie (informatif) : réplique ${out.variante_reentree.replique.n} trades, net A ${F(out.variante_reentree.replique.netA)}, net B ${F(out.variante_reentree.replique.netB)} · découverte ${out.variante_reentree.decouverte.n} trades, net A ${F(out.variante_reentree.decouverte.netA)}, net B ${F(out.variante_reentree.decouverte.netB)}`);
if (out.mondes) { const m = out.mondes; console.log(`\nMONDES TÉMOINS (${m.n}, graine ${m.graine}, réplique, lecture 1) : z moyen ${m.z_moy.toFixed(2)} ± ${m.z_sd.toFixed(2)} · quantile 95 % ${m.z_q95.toFixed(2)} · 99 % ${m.z_q99.toFixed(2)} · max ${m.z_max.toFixed(2)} → SEUIL z = ${m.seuil.toFixed(2)}`);
  console.log(`  brut moyen des témoins ${F(m.brut_moy)} par cassure · net A moyen ${F(m.netA_moy)} · ${m.n_moy.toFixed(0)} trades · passent TALENT au seuil ${(100 * m.part_talent_au_seuil).toFixed(1)} % · passent test 2 A ${(100 * m.part_test2A).toFixed(1)} % · passent TOUTE la porte ${(100 * m.part_porte_entiere).toFixed(1)} %`); }
console.log(`\nROBUSTESSE (réplique, lecture 1, informatif) — fenêtre × stop/objectif : trades · brut/cassure · z · net A · net B · [découverte : net A, trades]`);
for (const r of out.robustesse) console.log(`  ${String(r.L).padStart(3)} h  ${(100 * r.stop).toFixed(0)}/${(100 * r.tp).toFixed(0)} %  ${String(r.n).padStart(5)} · ${F(r.brut_ev)} · z ${r.z.toFixed(2).padStart(6)} · ${F(r.netA)} · ${F(r.netB)} · [${F(r.netA_decouverte)}, ${r.n_decouverte}]`);
console.log(`\nVERDICT : ${out.verdict}  (seuil z ${seuil.toFixed(2)} ; réplique L1 z ${R1.test1.z.toFixed(2)} L2 z ${R2.test1.z.toFixed(2)} ; net A réplique L1 ${F(R1.test2.tout.netA)} L2 ${F(R2.test2.tout.netA)} ; net B L1 ${F(R1.test2.tout.netB)} L2 ${F(R2.test2.tout.netB)} ; découverte net A L1 ${F(D1.test2.tout.netA)} L2 ${F(D2.test2.tout.netA)})`);
console.log(`durée ${((Date.now() - t0) / 1000).toFixed(0)} s · ${path.join(D, 'tendance.json')}`);
