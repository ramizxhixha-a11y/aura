# [PORTE FIBONACCI · 21/11/2026] « Go Fibonacci » (Rams, 21/11 08:01) : « un bot qui lit les bougies avec l'indicateur de Fibonacci sur 5, 15,
# 30 min, 1 h, 4 h, 1 jour ». Il ne vote dans la décision de l'EV que s'il passe CETTE porte (ETAT § 2). Règles écrites AVANT tout téléchargement
# ou calcul (empreinte SHA-256 des lignes 1 à la ligne « fin des règles » incluse, heure UTC dans la passation ; fichier commité sur la branche
# travail/fibonacci avant les données). Rien ne sera retouché pour « faire passer ».
#  DÉJÀ VU (dit pour qu'on sache) : Fibonacci est déjà l'indicateur n° 7 de 08 getTechSignals (50 bougies du mode, « niveau le plus proche à
#    moins de 1 % »), mêlé à 9 autres dans atScore, sans talent sur 24 mois (porte figures 2, z ≤ 1,5). Fibonacci SEUL, par unité, jamais mesuré.
#    Toutes les voix testées de 5 min à 4 h perdent après frais (TALENT, TENDANCE, SESSIONS) ; seule la tendance 28 j (semaines) est entrée.
#  DONNÉES : bougies spot 5 min Binance (archives publiques, rejeu/sessions_get.sh), 11 cryptos de l'app (BTC ETH XRP SOL DOGE DOT ADA AVAX
#    LINK BNB PEPE), 07/2018 → 09/2026 ; une paire vit dès son premier mois complet d'archive ; horodatages µs (2025+) ramenés en ms.
#  UNITÉS : 5 min, 15 min, 30 min, 1 h, 4 h, 1 j, bâties des 5 min, alignées sur l'heure UTC (4 h : 00, 04, 08 … ; 1 j : 00:00 UTC). Une bougie
#    d'unité existe dès qu'une de ses bougies 5 min existe : ouverture = 1re présente, plus haut / plus bas = extrêmes, clôture = dernière présente.
#  SIGNAL (unité U, recul N ∈ {21, 55, 144} bougies de U), à la clôture de la bougie i, si les N bougies [i−N+1, i] existent toutes :
#    H, L = plus haut et plus bas de la fenêtre ; tH, tL = leurs positions (égalité : la plus récente) ; R = H − L > 0.
#    Impulsion HAUSSIÈRE si tL < tH, BAISSIÈRE si tH < tL.
#    LONG si haussière, tH < i et H − 0,618 R ≤ C_i ≤ H − 0,382 R ; stop = H − 0,786 R ; objectif = H.
#    SHORT si baissière, tL < i et L + 0,382 R ≤ C_i ≤ L + 0,618 R ; stop = L + 0,786 R ; objectif = L.
#    Une seule entrée par vague (clé (tH, tL)) par paire et par variante ; une position à la fois par paire et par variante (signal ignoré si
#    occupée, la vague n'est alors pas consommée).
#  ENTRÉE : lecture 1 = clôture de la bougie i. Lecture 2 = clôture de la bougie présente suivante, mêmes niveaux, seulement si cette clôture est
#    strictement entre stop et objectif (sinon pas de trade, vague consommée).
#  SORTIE (bougies présentes j après l'entrée, dans l'ordre) : ouverture déjà au-delà du stop → sortie à l'ouverture ; ouverture déjà au-delà de
#    l'objectif → à l'ouverture ; plus bas (LONG) / plus haut (SHORT) touche le stop → au stop (stop d'abord si les deux dans la même bougie) ;
#    l'autre extrême touche l'objectif → à l'objectif ; sinon, si j − i_entrée ≥ N (en positions de bougies de U, absentes comptées) → à la
#    clôture de j. Fin des données : clôture de la dernière bougie présente.
#  COÛT : 0,13 % par côté (barème de l'EV : taker 0,10 % + glissement 0,03 %) ; net d'un trade = s × (sortie / entrée − 1) − 0,26 % (s = +1 LONG,
#    −1 SHORT) ; mise = une part de paire, ni levier ni financement.
#  VARIANTES (33) : SIMPLE = 6 unités × 3 reculs (18). CONFLUENCE = unités d'entrée 5 min, 15 min, 30 min, 1 h, 4 h × 3 reculs (15) : le signal
#    simple de U n'est pris que si CHAQUE unité plus longue de la liste, lue sur sa dernière bougie CLOSE à la clôture de i (même recul N, fenêtre
#    complète), a une impulsion du même sens (haussière pour LONG, baissière pour SHORT) ; une unité plus longue illisible → pas de trade.
#    « Close à la clôture de i » = sa fin ≤ la fin de la bougie i (une bougie 1 h qui finit avec la bougie 5 min i compte).
#  SÉRIE (par variante et lecture) : r_d = Σ (net des trades ENTRÉS le jour UTC d, toutes paires) / nombre de paires vivantes ce jour-là ; un jour
#    sans entrée vaut 0 (capital réparti à parts égales entre paires, non composé). Instant d'une entrée = dernière milliseconde de la bougie
#    d'entrée (son jour UTC et sa période en découlent).
#  PÉRIODES : JUGEMENT = entrées du 01/10/2018 au 30/09/2024 (6 années 10→09) ; CONTRÔLE = entrées du 01/10/2024 au 30/09/2026 (jamais vu pour
#    Fibonacci) : condition nécessaire.
#  TEST A — gagne-t-il, la chance comptée ? z = Σ blocs / (√nb × écart-type (n − 1) des blocs), blocs NON chevauchants de 20 jours du
#    jugement (le reste en fin écarté). Seuil S = max(1,645 ; quantile 95 % du z maximal des 33 variantes sous l'hypothèse nulle) : 2 000 tirages
#    (graine 21112026) avec remise des blocs des séries CENTRÉES (moyenne de chaque variante retirée), mêmes blocs pour toutes les variantes ;
#    S calculé dans chaque lecture. Passe si z ≥ S.
#  TEST B — le moment choisi sait-il quelque chose (pas la seule dérive) ? Pour chaque variante qui passe A dans les deux lectures : les MÊMES
#    trades (sens, distances stop et objectif en % de l'entrée, durée max N bougies de U) rejoués avec l'entrée décalée de k jours,
#    k = 60 + 10 m (m = 1 … 100), même bougie de l'unité, décalage circulaire dans la partie vivante du jugement de la paire (bougie absente :
#    la suivante présente), entrée à sa clôture, sorties par les mêmes règles sur les données qui suivent ; brut moyen par trade réel contre les
#    100 décalés : z_B = (réel − moyenne) / écart-type (n − 1). Passe si z_B ≥ 1,645.
#  TEST C — années : net > 0 sur au moins 4 des 6 années du jugement.
#  VERDICT : ENTRE si au moins une variante passe A, B, C ET contrôle net > 0, dans les DEUX lectures. Plusieurs : celle au plus grand z A
#    (lecture 1) — le bot joue exactement sa règle, deux sens (l'EV est LONG + SHORT ; LONG seul rapporté pour le comptant). Sinon N'ENTRE PAS :
#    le bot n'a pas de vote ; ses niveaux par unité restent une LECTURE affichée (fiche de la paire), sans effet sur aucune décision.
#  TÉMOINS (avant tout verdict ; un témoin raté = porte fausse, aucun verdict) :
#    T1 sensibilité : variante 1 h / 55 simple, lecture 1, gardant seulement ses trades à brut > 0 (le futur lu exprès) → doit passer A et B.
#    T2 spécificité : les trades de 1 h / 55 simple, lecture 1 (sens, distances, durée), placés à des bougies 1 h tirées au hasard (graine
#       21112026) dans la partie vivante du jugement de chaque paire → doit RATER B (z_B < 1,645).
#  INFORMATIF (hors verdict) : par variante, trades, % gagnants, gain et perte moyens, brut et net par trade, LONG seul, SHORT seul, net par année.
#  usage : sh rejeu/sessions_get.sh <d5m> 2018-07 2026-09 ; python3 -I rejeu/porte_fibonacci.py <d5m> [--tirages 2000]
#          (écrit <d5m>/porte_fibonacci.json)
# ---- fin des règles ----
import sys, os, json, zipfile, math, hashlib, datetime, time
import numpy as np
import pandas as pd
from numba import njit
ARGS = sys.argv[1:]
POS = [a for i, a in enumerate(ARGS) if not a.startswith('--') and (i == 0 or not ARGS[i - 1].startswith('--'))]
D5 = POS[0] if POS else None
NT = int(ARGS[ARGS.index('--tirages') + 1]) if '--tirages' in ARGS else 2000
SYNTH = '--synthetique' in ARGS                      # essai du code seulement (marche aléatoire), jamais un verdict
_lines = open(os.path.abspath(__file__), encoding='utf-8').readlines()
_K = next(i for i, l in enumerate(_lines) if l.startswith('# ---- fin des règles ----')) + 1
print(f"empreinte des règles (lignes 1–{_K}) :", hashlib.sha256(''.join(_lines[:_K]).encode('utf-8')).hexdigest())
t_start = time.time()

PAIRS = 'BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE'.split(); NP = len(PAIRS)
M5, DAY = 300000, 86400000
COST = 0.0026
UNITS = [('5 min', 1), ('15 min', 3), ('30 min', 6), ('1 h', 12), ('4 h', 48), ('1 j', 288)]
NS_ = [21, 55, 144]
def T(s): return int(datetime.datetime.strptime(s, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
def iso(ms): return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%d/%m/%Y')
J0, J1, C0, C1 = T('2018-10-01'), T('2024-10-01'), T('2024-10-01'), T('2026-10-01')
ANS = [(T(f'{y}-10-01'), T(f'{y + 1}-10-01')) for y in range(2018, 2024)]
BASE, END = T('2018-07-01'), T('2026-10-01')
NS = (END - BASE) // M5
assert NS % 288 == 0
SEED = 21112026

# ── données 5 min ──
O = np.full((NP, NS), np.nan); Hh = np.full((NP, NS), np.nan); Lw = np.full((NP, NS), np.nan); Cc = np.full((NP, NS), np.nan)
LIVE = np.full(NP, np.inf)
if SYNTH:
    rs = np.random.default_rng(1)
    for j in range(NP):
        st = int((T('2019-01-01') - BASE) // M5) if j == 3 else 0
        r = rs.standard_t(4, NS - st) * 0.002
        c = 100 * np.exp(np.cumsum(r)); o = np.r_[100, c[:-1]]
        w = np.abs(rs.normal(0, 0.0015, NS - st))
        Cc[j, st:] = c; O[j, st:] = o; Hh[j, st:] = np.maximum(o, c) * (1 + w); Lw[j, st:] = np.minimum(o, c) * (1 - w)
        holes = rs.integers(st, NS, 2000); O[j, holes] = Hh[j, holes] = Lw[j, holes] = Cc[j, holes] = np.nan
        LIVE[j] = BASE + st * M5
else:
    for j, p in enumerate(PAIRS):
        files = sorted(f for f in os.listdir(os.path.join(D5, 'spot5m')) if f.startswith(p + 'USDT-5m-'))
        first = None
        for f in files:
            with zipfile.ZipFile(os.path.join(D5, 'spot5m', f)) as z:
                for name in z.namelist():
                    df = pd.read_csv(z.open(name), header=None, usecols=[0, 1, 2, 3, 4], dtype=str)
                    df = df.apply(pd.to_numeric, errors='coerce').dropna()
                    if not len(df): continue
                    t = df[0].to_numpy(np.float64).astype(np.int64)
                    t = np.where(t > 1e14, t // 1000, t)
                    k = (t - BASE) // M5
                    ok = (k >= 0) & (k < NS) & ((t - BASE) % M5 == 0)
                    k = k[ok]
                    O[j, k] = df[1].to_numpy(np.float64)[ok]; Hh[j, k] = df[2].to_numpy(np.float64)[ok]
                    Lw[j, k] = df[3].to_numpy(np.float64)[ok]; Cc[j, k] = df[4].to_numpy(np.float64)[ok]
                    if len(t[ok]): first = t[ok].min() if first is None else min(first, t[ok].min())
        if first is None: continue
        fm = datetime.datetime.fromtimestamp(first / 1000, datetime.timezone.utc)
        ms = T(f'{fm.year}-{fm.month:02d}-01')
        LIVE[j] = ms if first == ms else T(f'{fm.year + (fm.month == 12)}-{fm.month % 12 + 1:02d}-01')
for j in range(NP):
    if np.isfinite(LIVE[j]):
        cut = max(0, int((LIVE[j] - BASE) // M5)); O[j, :cut] = Hh[j, :cut] = Lw[j, :cut] = Cc[j, :cut] = np.nan
    print(f"  {PAIRS[j]:5s} vivante dès {iso(LIVE[j]) if np.isfinite(LIVE[j]) else '—'} · {np.isfinite(Cc[j]).sum()} bougies 5 min")
print(f"  chargement {time.time() - t_start:.0f} s")

# ── unités ──
def agg(k):
    if k == 1: return O, Hh, Lw, Cc
    n = NS // k
    o5 = O.reshape(NP, n, k); h5 = Hh.reshape(NP, n, k); l5 = Lw.reshape(NP, n, k); c5 = Cc.reshape(NP, n, k)
    pres = np.isfinite(c5)
    anyp = pres.any(2)
    fi = pres.argmax(2); la = k - 1 - pres[:, :, ::-1].argmax(2)
    oo = np.take_along_axis(o5, fi[:, :, None], 2)[:, :, 0]; cc = np.take_along_axis(c5, la[:, :, None], 2)[:, :, 0]
    with np.errstate(all='ignore'):
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            hh = np.nanmax(h5, 2); ll = np.nanmin(l5, 2)
    for a in (oo, hh, ll, cc): a[~anyp] = np.nan
    return oo, hh, ll, cc

@njit(cache=True)
def extremes(H, L, N):
    n = H.shape[0]; tH = np.full(n, -1, np.int64); tL = np.full(n, -1, np.int64)
    dqh = np.empty(n, np.int64); dql = np.empty(n, np.int64); hh = 0; th = 0; hl = 0; tl = 0
    lastmiss = -1
    for i in range(n):
        pres = not (np.isnan(H[i]) or np.isnan(L[i]))
        if pres:
            while th > hh and H[dqh[th - 1]] <= H[i]: th -= 1
            dqh[th] = i; th += 1
            while tl > hl and L[dql[tl - 1]] >= L[i]: tl -= 1
            dql[tl] = i; tl += 1
        else:
            lastmiss = i
        while th > hh and dqh[hh] <= i - N: hh += 1
        while tl > hl and dql[hl] <= i - N: hl += 1
        if pres and i - lastmiss >= N and i - N + 1 >= 0:
            tH[i] = dqh[hh]; tL[i] = dql[hl]
    return tH, tL

@njit(cache=True)
def run_exit(O, H, L, C, e, side, stop, tgt, N):
    n = C.shape[0]; j = e + 1
    while j < n:
        if np.isnan(C[j]): j += 1; continue
        o = O[j]; h = H[j]; l = L[j]
        if side == 1:
            if o <= stop: return j, o
            if o >= tgt: return j, o
            if l <= stop: return j, stop
            if h >= tgt: return j, tgt
        else:
            if o >= stop: return j, o
            if o <= tgt: return j, o
            if h >= stop: return j, stop
            if l <= tgt: return j, tgt
        if j - e >= N: return j, C[j]
        j += 1
    k = n - 1
    while k > e and np.isnan(C[k]): k -= 1
    return k, C[k]

@njit(cache=True)
def simulate(O, H, L, C, tH, tL, N, conf, use_conf, lect):
    n = C.shape[0]
    E = np.empty(n, np.int64); S = np.empty(n, np.int8); P0 = np.empty(n); P1 = np.empty(n); X = np.empty(n, np.int64)
    SD = np.empty(n); TD = np.empty(n); m = 0
    ckh = -2; ckl = -2; busy = -1
    for i in range(n):
        if tH[i] < 0 or np.isnan(C[i]): continue
        a = tH[i]; b = tL[i]; Hm = H[a]; Lm = L[b]; R = Hm - Lm
        if R <= 0: continue
        side = 0; c = C[i]
        if b < a and a < i and Hm - 0.618 * R <= c and c <= Hm - 0.382 * R:
            side = 1; stop = Hm - 0.786 * R; tgt = Hm
        elif a < b and b < i and Lm + 0.382 * R <= c and c <= Lm + 0.618 * R:
            side = -1; stop = Lm + 0.786 * R; tgt = Lm
        if side == 0: continue
        if a == ckh and b == ckl: continue
        if i < busy: continue
        if use_conf and conf[i] != side: continue
        ckh = a; ckl = b
        e = i
        if lect == 2:
            e = i + 1
            while e < n and np.isnan(C[e]): e += 1
            if e >= n: continue
            ce = C[e]
            if side == 1 and not (stop < ce and ce < tgt): continue
            if side == -1 and not (tgt < ce and ce < stop): continue
        pe = C[e]
        x, px = run_exit(O, H, L, C, e, side, stop, tgt, N)
        E[m] = e; S[m] = side; P0[m] = pe; P1[m] = px; X[m] = x
        SD[m] = abs(stop / pe - 1.0); TD[m] = abs(tgt / pe - 1.0); m += 1
        busy = x
    return E[:m], S[:m], P0[:m], P1[:m], X[:m], SD[:m], TD[:m]

@njit(cache=True)
def replay(O, H, L, C, N, E, S, SD, TD, a, b, shift):
    n = C.shape[0]; g = np.full(E.shape[0], np.nan)
    for t in range(E.shape[0]):
        e = a + ((E[t] - a + shift) % (b - a))
        while e < n and np.isnan(C[e]): e += 1
        if e >= n - 1: continue
        side = S[t]; pe = C[e]
        stop = pe * (1.0 - side * SD[t]); tgt = pe * (1.0 + side * TD[t])
        x, px = run_exit(O, H, L, C, e, side, stop, tgt, N)
        g[t] = side * (px / pe - 1.0)
    return g

# ── variantes : signaux et trades ──
D0 = BASE // DAY; NDAY = (END - BASE) // DAY
day_ms = (np.arange(NDAY) + D0) * DAY
NLIVE = np.array([(LIVE <= d).sum() for d in day_ms], np.float64)
JD = np.arange((J0 - BASE) // DAY, (J1 - BASE) // DAY)
CD = np.arange((C0 - BASE) // DAY, (C1 - BASE) // DAY)
NB = len(JD) // 20

UD = {}                                                # unité → (O, H, L, C) [NP, n]
EXT = {}                                               # (unité, N) → (tH, tL) par paire
for name, k in UNITS:
    UD[name] = agg(k)
    for N in NS_:
        EXT[(name, N)] = [extremes(UD[name][1][j], UD[name][2][j], N) for j in range(NP)]
print(f"  unités et extrêmes {time.time() - t_start:.0f} s")

def impulse(name, N, j):
    tH, tL = EXT[(name, N)][j]
    d = np.zeros(tH.shape[0], np.int8); ok = tH >= 0
    d[ok & (tL < tH)] = 1; d[ok & (tH < tL)] = -1
    return d

def conf_array(ui, N, j):
    name, k = UNITS[ui]; n = NS // k
    i = np.arange(n); out = None
    for name2, k2 in UNITS[ui + 1:]:
        b = ((i + 1) * k) // k2 - 1
        d2 = impulse(name2, N, j)
        v = np.where(b >= 0, d2[np.clip(b, 0, None)], 0).astype(np.int8)
        out = v if out is None else np.where(out == v, out, 0).astype(np.int8)
    return out

VARS = [(ui, N, 'simple') for ui in range(len(UNITS)) for N in NS_] + [(ui, N, 'confluence') for ui in range(len(UNITS) - 1) for N in NS_]
def vname(v): return f"{UNITS[v[0]][0]} / {v[1]} {v[2]}"

def trades_of(v, lect):
    ui, N, kind = v; name, k = UNITS[ui]; o, h, l, c = UD[name]; out = []
    for j in range(NP):
        tH, tL = EXT[(name, N)][j]
        cf = conf_array(ui, N, j) if kind == 'confluence' else np.zeros(1, np.int8)
        E, S, P0, P1, X, SD, TD = simulate(o[j], h[j], l[j], c[j], tH, tL, N, cf, kind == 'confluence', lect)
        out.append(dict(E=E, S=S, g=S * (P1 / P0 - 1.0), X=X, SD=SD, TD=TD,
                        day=((BASE + (E + 1) * k * M5 - 1) // DAY - D0).astype(np.int64)))
    return out

def series(tr, keep=None):
    r = np.zeros(NDAY)
    for j, t in enumerate(tr):
        msk = np.ones(len(t['E']), bool) if keep is None else keep(t)
        np.add.at(r, t['day'][msk], t['g'][msk] - COST)
    return r / np.maximum(NLIVE, 1)

def zblocks(r):
    b = r[JD[:NB * 20]].reshape(NB, 20).sum(1)
    sd = b.std(ddof=1)
    return (b.sum() / (math.sqrt(NB) * sd)) if sd > 0 else -np.inf, b

def span(ui, j):
    k = UNITS[ui][1]
    a = max(int(math.ceil((LIVE[j] - BASE) / (k * M5))) if np.isfinite(LIVE[j]) else 10 ** 12, (J0 - BASE) // (k * M5))
    return a, (J1 - BASE) // (k * M5)

def in_jug(t): return (t['day'] >= JD[0]) & (t['day'] <= JD[-1])

def test_b(v, tr):
    ui, N, _ = v; name, k = UNITS[ui]; o, h, l, c = UD[name]
    real = np.concatenate([t['g'][in_jug(t)] for t in tr]); real = real[np.isfinite(real)]
    if not len(real): return -np.inf, np.nan, []
    means = []
    for m in range(1, 101):
        sh = (60 + 10 * m) * (288 // k); gs = []
        for j, t in enumerate(tr):
            msk = in_jug(t)
            if not msk.any(): continue
            a, b = span(ui, j)
            if b <= a: continue
            gs.append(replay(o[j], h[j], l[j], c[j], N, t['E'][msk], t['S'][msk], t['SD'][msk], t['TD'][msk], a, b, sh))
        g = np.concatenate(gs); means.append(np.nanmean(g))
    means = np.array(means)
    return (real.mean() - means.mean()) / means.std(ddof=1), real.mean(), means

def stats(tr, r):
    sel = [in_jug(t) for t in tr]
    g = np.concatenate([t['g'][s] for t, s in zip(tr, sel)]); sd = np.concatenate([t['S'][s] for t, s in zip(tr, sel)])
    net = g - COST
    yrs = [float(r[(day_ms >= a) & (day_ms < b)].sum()) for a, b in ANS]
    return dict(n=int(len(g)), gagnants=float((net > 0).mean()) if len(g) else np.nan,
                gain_moy=float(net[net > 0].mean()) if (net > 0).any() else np.nan, perte_moy=float(net[net <= 0].mean()) if (net <= 0).any() else np.nan,
                brut=float(g.mean()) if len(g) else np.nan, net=float(net.mean()) if len(g) else np.nan,
                n_long=int((sd == 1).sum()), net_long=float(net[sd == 1].mean()) if (sd == 1).any() else np.nan,
                n_short=int((sd == -1).sum()), net_short=float(net[sd == -1].mean()) if (sd == -1).any() else np.nan,
                annees=yrs, total_jug=float(r[JD].sum()), controle=float(r[CD].sum()),
                n_ctrl=int(sum(((t['day'] >= CD[0]) & (t['day'] <= CD[-1])).sum() for t in tr)))

def threshold(Z, BL, rng):
    ok = [i for i, z in enumerate(Z) if np.isfinite(z)]
    if not ok: return 1.645, np.nan
    B = np.stack([BL[i] - BL[i].mean() for i in ok])
    idx = rng.integers(0, NB, (NT, NB))
    zs = np.empty((NT, len(ok)))
    for q in range(len(ok)):
        x = B[q][idx]; sd = x.std(1, ddof=1)
        zs[:, q] = np.where(sd > 0, x.sum(1) / (math.sqrt(NB) * np.where(sd > 0, sd, 1)), -np.inf)
    q95 = float(np.quantile(zs.max(1), 0.95))
    return max(1.645, q95), q95

# ── passage ──
RES = {1: {}, 2: {}}; TR = {1: {}, 2: {}}; SEUIL = {}
for lect in (1, 2):
    Z, BL = [], []
    for v in VARS:
        tr = trades_of(v, lect); r = series(tr); z, b = zblocks(r)
        rl = series(tr, keep=lambda t: t['S'] == 1); zl, _ = zblocks(rl)
        st = stats(tr, r); st.update(zA=float(z), long_seul=dict(zA=float(zl), total_jug=float(rl[JD].sum()), controle=float(rl[CD].sum()),
                                                             annees=[float(rl[(day_ms >= a) & (day_ms < bb)].sum()) for a, bb in ANS]))
        RES[lect][v] = st; TR[lect][v] = tr; Z.append(z); BL.append(b)
    S_, q95 = threshold(Z, BL, np.random.default_rng(SEED)); SEUIL[lect] = dict(S=S_, q95=q95)
    print(f"  lecture {lect} : 33 variantes, seuil A = {S_:.2f} (q95 du z max sous le hasard {q95:.2f}) · {time.time() - t_start:.0f} s")

# ── témoins ──
v0 = (3, 55, 'simple'); tr0 = TR[1][v0]
orc = [dict(t, **{k: t[k][t['g'] > 0] for k in ('E', 'S', 'g', 'X', 'SD', 'TD', 'day')}) for t in tr0]
zo, _ = zblocks(series(orc)); zbo, _, _ = test_b(v0, orc)
T1 = bool(zo >= SEUIL[1]['S'] and zbo >= 1.645)
rng = np.random.default_rng(SEED); o1, h1, l1, c1 = UD['1 h']; rnd = []
for j, t in enumerate(tr0):
    msk = in_jug(t); a, b = span(3, j)
    if not msk.any() or b <= a: rnd.append(dict(E=np.zeros(0, np.int64), S=np.zeros(0, np.int8), g=np.zeros(0), X=np.zeros(0, np.int64), SD=np.zeros(0), TD=np.zeros(0), day=np.zeros(0, np.int64))); continue
    E = rng.integers(a, b, int(msk.sum())).astype(np.int64)
    g = replay(o1[j], h1[j], l1[j], c1[j], 55, E, t['S'][msk], t['SD'][msk], t['TD'][msk], a, b, 0)
    E2 = E.copy()
    for q in range(len(E2)):
        while E2[q] < len(c1[j]) and np.isnan(c1[j][E2[q]]): E2[q] += 1
    keep = np.isfinite(g)
    rnd.append(dict(E=E2[keep], S=t['S'][msk][keep], g=g[keep], X=E2[keep], SD=t['SD'][msk][keep], TD=t['TD'][msk][keep],
                    day=((BASE + (E2[keep] + 1) * 12 * M5 - 1) // DAY - D0).astype(np.int64)))
zbr, _, _ = test_b(v0, rnd)
T2 = bool(zbr < 1.645)
print(f"  T1 sensibilité (1 h / 55, trades gagnants seuls) : z A {zo:.2f} (seuil {SEUIL[1]['S']:.2f}), z B {zbo:.2f} → {'✓' if T1 else '✗'}")
print(f"  T2 spécificité (mêmes trades placés au hasard) : z B {zbr:.2f} (doit rester < 1,645) → {'✓' if T2 else '✗'}")

# ── tests B, C, contrôle, verdict ──
BRES = {}
for v in VARS:
    a_ok = all(RES[l][v]['zA'] >= SEUIL[l]['S'] for l in (1, 2))
    if not a_ok: continue
    BRES[v] = {}
    for l in (1, 2):
        zb, m, _ = test_b(v, TR[l][v]); BRES[v][l] = float(zb); RES[l][v]['zB'] = float(zb)
PASS = []
for v in VARS:
    ok = True
    for l in (1, 2):
        st = RES[l][v]
        ok &= st['zA'] >= SEUIL[l]['S'] and st.get('zB', -np.inf) >= 1.645 and sum(x > 0 for x in st['annees']) >= 4 and st['controle'] > 0
    if ok: PASS.append(v)
temoins = T1 and T2 and not SYNTH
if not (T1 and T2): verdict = 'PORTE FAUSSE (témoin raté) : aucun verdict'
elif SYNTH: verdict = 'ESSAI SYNTHÉTIQUE : aucun verdict'
elif PASS:
    best = max(PASS, key=lambda v: RES[1][v]['zA']); verdict = f'ENTRE : {vname(best)}'
else: verdict = "N'ENTRE PAS"

# ── rapport ──
pc = lambda x: f"{100 * x:+.3f} %" if np.isfinite(x) else '—'
print(f"\n{'variante':26s} lect  trades  gagn.   brut/trade   net/trade    z A    années+  jugement   contrôle   z B")
for v in VARS:
    for l in (1, 2):
        st = RES[l][v]
        print(f"{vname(v):26s}  {l}  {st['n']:7d}  {100 * st['gagnants'] if st['n'] else 0:4.0f} %  {pc(st['brut']):>11s}  {pc(st['net']):>10s}  {st['zA']:6.2f}   {sum(x > 0 for x in st['annees'])}/6   {100 * st['total_jug']:+8.1f} %  {100 * st['controle']:+7.1f} %  {st.get('zB', float('nan')):5.2f}")
print(f"\nseuils A : lecture 1 {SEUIL[1]['S']:.2f}, lecture 2 {SEUIL[2]['S']:.2f}")
print(f"VERDICT : {verdict}  · {time.time() - t_start:.0f} s")
if D5:
    def clean(o):
        if isinstance(o, dict): return {str(k): clean(x) for k, x in o.items()}
        if isinstance(o, (list, tuple)): return [clean(x) for x in o]
        if isinstance(o, (np.floating, float)): return None if not np.isfinite(o) else float(o)
        if isinstance(o, (np.integer,)): return int(o)
        return o
    json.dump(clean(dict(verdict=verdict, T1=dict(ok=T1, zA=zo, zB=zbo), T2=dict(ok=T2, zB=zbr), seuils=SEUIL, passent=[vname(v) for v in PASS],
                         variantes={vname(v): {f'lecture {l}': RES[l][v] for l in (1, 2)} for v in VARS})),
              open(os.path.join(D5, 'porte_fibonacci.json' if not SYNTH else 'porte_fibonacci_synth.json'), 'w'), indent=1)
