# [PORTE SESSIONS · 21/11/2026] « … puis go le reste des sessions continental » (Rams, 21/11 07:01) = « go sessions », proposé le 21/11
# (conversation « Stratégie de rentabilité ») : l'ouverture des séances de Tokyo, Londres et New York porte-t-elle un gain NET à prendre ?
# Règles écrites AVANT tout téléchargement ou calcul de cette porte (empreinte SHA-256 des lignes 1 à 65 et heure UTC dans la passation ;
# fichier commité sur la branche travail/sessions avant les données). Rien ne sera retouché pour « faire passer ».
#  DÉJÀ VU (dit pour qu'on sache) : le 06/10 (passation, GO TENDANCE), sur ~2 ans de bougies 1 h / 15 min (≈ 10/2024 → 09/2026) : agitation
#    à l'ouverture de New York ×1,9, à la fin de l'Europe ×1,3 ; le SENS ne se prévoyait pas (≤ 0,1 % brut par trade, signe changeant d'une
#    année à l'autre). JAMAIS vu : 10/2018 → 09/2024 à ces heures ; aucune des 4 familles ci-dessous n'a jamais été calculée.
#  DONNÉES : bougies spot 5 min Binance (archives publiques, rejeu/sessions_get.sh), 11 cryptos de l'app (BTC ETH XRP SOL DOGE DOT ADA AVAX
#    LINK BNB PEPE), 07/2018 → 09/2026 ; une paire vit dès son premier mois complet d'archive ; horodatages µs (2025+) ramenés en ms ; une
#    bougie absente = pas de trade ce jour pour cette paire. Bougie 15 min = 3 bougies 5 min (ouverture, plus haut, plus bas, clôture).
#  SÉANCES (jours ouvrés lundi–vendredi en heure UTC de t_o ; jours fériés non retirés) : Tokyo 09:00 Asia/Tokyo (= 00:00 UTC), Londres
#    08:00 Europe/London, New York 09:30 America/New_York, heures d'été par zoneinfo ; t_o = cet instant en UTC.
#  COÛT : 0,13 % par côté sur la mise (barème de l'EV : taker 0,10 % + glissement 0,03 %), 0,26 % l'aller-retour ; ni levier ni financement.
#  FAMILLE 1 — CASSURE DE L'OUVERTURE : zone = plus haut / plus bas des bougies 5 min de [t_o, t_o + R[ ; finesse f (5 ou 15 min, bougies
#    f alignées sur t_o) : la première bougie f après la zone dont la CLÔTURE sort de la zone → LONG au-dessus, SHORT en dessous, entrée à
#    cette clôture ; une seule par séance et par paire, cherchée jusqu'à la sortie (entrée à la sortie même = pas de trade). Sortie à la
#    clôture de la bougie 5 min qui finit à t_o + S ; variante « stop » : sortie au bord opposé de la zone dès qu'une bougie 5 min APRÈS
#    l'entrée le touche (au bord, ou à l'ouverture de cette bougie si elle s'ouvre déjà au-delà). Variantes : 3 séances × (f 5 min : R ∈
#    {5, 15, 30, 60} min ; f 15 min : R ∈ {15, 30, 60}) × S ∈ {2, 4, 8} h × {sans stop, stop} = 126.
#  FAMILLE 2 — RETOUR APRÈS L'EXCÈS D'OUVERTURE : m = clôture(t_o + R) / ouverture(t_o) − 1 ; EXCÈS si |m| > quantile q des |m| des 60
#    jours ouvrés précédents de la même séance et paire (appris sur le passé seul ; moins de 60 valeurs : pas de trade) ; trade CONTRE m,
#    entrée à la clôture de t_o + R, sortie à la clôture D plus tard. Variantes : 3 séances × R ∈ {5, 15, 30, 60} min × q ∈ {80 %, 95 %}
#    × D ∈ {1, 4} h = 48.
#  FAMILLE 3 — HEURE FIXE (fiche de recherche citée le 21/11 : BTC acheté à 22:00 UTC, gardé 2 h) : LONG à l'ouverture de la bougie 5 min
#    de 22:00 UTC, sortie à l'ouverture de celle de 00:00 UTC. Variantes : {BTC seul, 11 paires} × {tous les jours, jours ouvrés} = 4.
#  FAMILLE 4 — L'HEURE D'EXÉCUTION DE LA VOIX TENDANCE : décision du lundi 00:00 UTC (moteur de rejeu/porte_poids.py, E « égal », appelé)
#    exécutée — entrées ET sorties — à l'ouverture de Londres ou de New York de ce lundi (ouverture de la bougie 5 min) au lieu de 00:00
#    (= Tokyo) ; valeur du portefeuille relevée à cette heure ; liquidation SHORT vérifiée dès l'heure qui suit l'entrée réelle. Variantes :
#    2. Série : r_t (log, hebdomadaire) de la variante − r_t de la base 00:00, mêmes lundis.
#  SÉRIES (familles 1–3) : r_j = net du jour j (jour UTC de t_o ; famille 3 : de 22:00) = moyenne, sur les paires vivantes ce jour (BTC
#    seul : BTC), du net de chaque trade (0 sans trade) — un capital réparti à parts égales, non composé. Familles 1–2 : jours ouvrés ;
#    famille 3 : tous les jours (0 les jours où la variante ne trade pas).
#  STATISTIQUE : z = Σ blocs / (√nb × écart-type des blocs), blocs NON chevauchants de 20 valeurs consécutives de la série (familles 1–3)
#    ou de 4 semaines (famille 4) ; le reste en fin de série est écarté.
#  LA CHANCE COMPTE (plusieurs variantes) : par famille, z_max = plus grand z des variantes sur le jugement (lecture 1). Seuil = quantile
#    (1 − 0,05 / 4) = 98,75 % de z_max sous l'hypothèse nulle : 2 000 tirages (graine 20261121) avec remise des blocs des séries CENTRÉES
#    (moyenne de chaque variante retirée), mêmes blocs tirés pour toutes les variantes d'une famille (leur corrélation est gardée) ; jamais
#    sous 2,24 (1,25 % unilatéral). Le « / 4 » : quatre familles regardées en même temps.
#  PÉRIODES : JUGEMENT = t_o (famille 4 : lundis) du 01/10/2018 au 30/09/2024 (6 années 10→09) ; CONTRÔLE = 01/10/2024 → 30/09/2026 (déjà
#    vu en partie) : condition nécessaire, pas verdict.
#  LECTURES : 1 = comme écrit. 2 = entrée ET sortie une bougie de finesse plus tard (familles 2–3 : 5 min ; famille 1 : f ; le stop est
#    cherché après l'entrée retardée) ; famille 4 : une heure plus tard.
#  VERDICT PAR FAMILLE — OUI si la variante v* au z_max (jugement, lecture 1) a : (a) z_max ≥ seuil ; (b) net > 0 dans au moins 4 des 6
#    années du jugement ; (c) en lecture 2 : z ≥ 1,645 et net total > 0 ; (d) net total > 0 sur le contrôle (lecture 1). Sinon NON. Un
#    OUI = candidate à une voix (mission à part, « go »), jamais une ouverture de l'app ; un NON ne veut pas dire « faux » : non prouvé.
#  TÉMOINS (avant tout verdict) : (T1) données — l'ouverture de chaque bougie 5 min de HH:00 égale celle de la bougie 1 h Binance (archives
#    spot 1 h de la porte TENDANCE LONGUE) sur tous les points communs (écart relatif ≤ 1e-9) ; heures d'été : Londres 07:00 et New York
#    13:30 UTC le 01/07/2024, 08:00 et 14:30 le 02/01/2024 ; sinon « PORTE FAUSSE », pas de verdict. (T2) la porte VOIT un gain NET de la
#    taille des frais : pour chaque famille, la série de v* au jugement CENTRÉE (sa moyenne retirée, son bruit et ses jours de trade gardés)
#    plus +0,26 % net par trade (famille 4 : par semaine), passée à la même procédure (seuil tiré à nouveau avec elle), doit dire OUI à (a)
#    et (b) ; sinon « PORTE AVEUGLE » pour cette famille, pas de verdict.
#  CORRIGÉ AVANT LES DONNÉES (21/11, essai du code sur des données SYNTHÉTIQUES — marche au hasard — seulement, aucune vraie bougie lue) :
#    la 1re version de T2 (règles du commit précédent) ajoutait +0,26 % au NET de v*, ce qui ne fait que rembourser ses frais : une porte
#    juste y voit un net nul et se déclare aveugle. T2 centre maintenant la série. Rien d'autre n'a changé.
#  RAPPORTÉ (informatif, hors verdict) : pour v* — brut et net par trade, par année, contrôle, trades, part gagnante, gain moyen / perte
#    moyenne ; le z des 5 meilleures variantes ; v* au barème futures (0,08 % par côté, sans financement) ; l'agitation de chaque séance
#    (amplitude de la 1re heure après t_o / amplitude moyenne d'une heure, même paire, même période).
#  PUISSANCE (dite avant) : ~1 560 jours ouvrés au jugement ; un net de 0,05 % par jour du capital pour un écart-type de 1 % donne z ≈ 2 :
#    seul un effet net et régulier passe. Le mur : 0,26 % de frais par trade. Prévision (supposée) : NON partout.
#  NON MODÉLISÉ : la tablette endormie ou sans réseau aux heures des séances (01:00, 08:00–09:00, 14:30–15:30 à Bruxelles l'hiver), montants
#    minimaux d'ordre, exécution partielle, impôt, frais sur la mise et non sur la valeur de sortie.
#  AUCUN CODE DE L'APP N'EST TOUCHÉ (mesure seule).
# usage : sh rejeu/portage_get.sh <d1h> 2018-08 2026-09 ; sh rejeu/sessions_get.sh <d5m> 2018-07 2026-09 ;
#         python3 -I rejeu/porte_sessions.py <d1h> <d5m> [--tirages 2000]   (écrit <d5m>/porte_sessions.json)
# ---------------------------------------------------------------------------------------------------------------------------------------------
import sys, os, io, json, zipfile, math, hashlib, datetime, time
import numpy as np
import pandas as pd
from zoneinfo import ZoneInfo
HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[1:]
POS = [a for i, a in enumerate(ARGS) if not a.startswith('--') and (i == 0 or not ARGS[i - 1].startswith('--'))]
D1, D5 = POS[0], POS[1]
NT = int(ARGS[ARGS.index('--tirages') + 1]) if '--tirages' in ARGS else 2000
_hdr = ''.join(open(os.path.abspath(__file__), encoding='utf-8').readlines()[:65])
print('empreinte des règles (lignes 1–65) :', hashlib.sha256(_hdr.encode('utf-8')).hexdigest())
t_start = time.time()

PAIRS = 'BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE'.split(); NP = len(PAIRS)
M5, HOUR, DAY = 300000, 3600000, 86400000
SIDE, SIDE_F = 0.0013, 0.0008
def T(s): return int(datetime.datetime.strptime(s, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
def iso(ms): return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%d/%m/%Y %H:%M')
J0, J1, C0, C1 = T('2018-10-01'), T('2024-10-01'), T('2024-10-01'), T('2026-10-01')
ANS = [(T(f'{y}-10-01'), T(f'{y + 1}-10-01')) for y in range(2018, 2024)]
BASE, END = T('2018-07-01'), T('2026-10-12')
NS = (END - BASE) // M5

# ── données 5 min ──
O = np.full((NP, NS), np.nan); Hh = np.full((NP, NS), np.nan); Lw = np.full((NP, NS), np.nan); Cc = np.full((NP, NS), np.nan)
LIVE = np.full(NP, np.inf)
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
    O[j, :max(0, int((LIVE[j] - BASE) // M5))] = np.nan
    print(f"  {p:5s} 5 min vivante dès {iso(LIVE[j])[:10]} · {np.isfinite(O[j]).sum()} bougies")
print(f"  chargement {time.time() - t_start:.0f} s")
def slot(t): return int((t - BASE) // M5)

# ── T1 : données et heures d'été ──
mism, common = 0, 0
for j, p in enumerate(PAIRS):
    for f in sorted(x for x in os.listdir(os.path.join(D1, 'spot1h')) if x.startswith(p + 'USDT-1h-')):
        with zipfile.ZipFile(os.path.join(D1, 'spot1h', f)) as z:
            for name in z.namelist():
                df = pd.read_csv(z.open(name), header=None, usecols=[0, 1], dtype=str).apply(pd.to_numeric, errors='coerce').dropna()
                t = df[0].to_numpy(np.float64).astype(np.int64); t = np.where(t > 1e14, t // 1000, t)
                k = (t - BASE) // M5; ok = (k >= 0) & (k < NS)
                a = O[j, k[ok]]; b = df[1].to_numpy(np.float64)[ok]; fin = np.isfinite(a) & np.isfinite(b)
                common += int(fin.sum()); mism += int((np.abs(a[fin] - b[fin]) > 1e-9 * np.abs(b[fin])).sum())
def t_open(date, tz, hh, mm):
    return int(datetime.datetime(date.year, date.month, date.day, hh, mm, tzinfo=ZoneInfo(tz)).astimezone(datetime.timezone.utc).timestamp() * 1000)
SESS = {'Tokyo': ('Asia/Tokyo', 9, 0), 'Londres': ('Europe/London', 8, 0), 'New York': ('America/New_York', 9, 30)}
hm = lambda ms: datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%H:%M')
dst = [hm(t_open(datetime.date(2024, 7, 1), *SESS['Londres'])), hm(t_open(datetime.date(2024, 7, 1), *SESS['New York'])),
       hm(t_open(datetime.date(2024, 1, 2), *SESS['Londres'])), hm(t_open(datetime.date(2024, 1, 2), *SESS['New York']))]
T1 = mism == 0 and common > 0 and dst == ['07:00', '13:30', '08:00', '14:30']
print(f"  T1 données : {common} ouvertures 1 h comparées, {mism} écarts · heures d'été {dst} → {'✓' if T1 else '✗'}")

# ── jours et fenêtres ──
NW = 8 * 12 + 6                                   # 8 h de bougies 5 min + marge des lectures 2
dates = [datetime.date(2018, 7, 1) + datetime.timedelta(days=i) for i in range((END - BASE) // DAY - 1)]
SDAYS = {}
for s, (tz, hh, mm) in SESS.items():
    L = [(d, t_open(d, tz, hh, mm)) for d in dates if d.weekday() < 5]
    L = [(d, t) for d, t in L if slot(t) + NW < NS]
    SDAYS[s] = (np.array([t for _, t in L], dtype=np.int64), np.array([slot(t) for _, t in L]))
def window(j, ks):
    idx = ks[:, None] + np.arange(NW)[None, :]
    return O[j, idx], Hh[j, idx], Lw[j, idx], Cc[j, idx]
WIN = {(s, j): window(j, SDAYS[s][1]) for s in SESS for j in range(NP)}

def fam1(s, j, f, R, S, stop, lect):
    o, h, l, c = WIN[(s, j)]
    nR, nS = R // 5, S * 12
    hi, lo = h[:, :nR].max(1), l[:, :nR].min(1)                     # NaN si une bougie manque
    if f == 5:
        eidx = np.arange(nR, nS - 1)                                  # entrée possible jusqu'à la bougie nS − 2
    else:
        eidx = np.array([3 * k + 2 for k in range(nR // 3, (nS - 2) // 3 + 1) if 3 * k + 2 <= nS - 2])
    cand = c[:, eidx]
    up, dn = cand > hi[:, None], cand < lo[:, None]
    any_ = (up | dn).any(1) & np.isfinite(hi) & np.isfinite(lo)
    first = np.argmax(up | dn, axis=1)
    e = eidx[first]; side = np.where(up[np.arange(len(e)), first], 1.0, -1.0)
    sh = 0 if lect == 1 else (1 if f == 5 else 3)
    e2, x2 = e + sh, nS - 1 + sh
    rows = np.arange(len(e))
    ep = c[rows, e2]; xp = c[:, x2].copy()
    if stop:
        jj = np.arange(NW)[None, :]
        after = (jj > e2[:, None]) & (jj <= x2)
        hitL = after & (l <= lo[:, None]); hitS = after & (h >= hi[:, None])
        hit = np.where(side[:, None] > 0, hitL, hitS)
        has = hit.any(1); fi = np.argmax(hit, axis=1)
        fill = np.where(side > 0, np.minimum(o[rows, fi], lo), np.maximum(o[rows, fi], hi))
        xp = np.where(has, fill, xp)
    g = side * (xp / ep - 1)
    ok = any_ & np.isfinite(g)
    return ok, g, side

THR = {}
def fam2(s, j, R, q, Dh, lect):
    o, h, l, c = WIN[(s, j)]
    nR = R // 5
    m = c[:, nR - 1] / o[:, 0] - 1
    am = np.abs(m); n = len(m)
    if (s, j, R, q) not in THR:
        thr = np.full(n, np.nan)
        for i in range(60, n):
            w = am[i - 60:i]
            if np.all(np.isfinite(w)): thr[i] = np.quantile(w, q)
        THR[(s, j, R, q)] = thr
    thr = THR[(s, j, R, q)]
    exc = np.isfinite(thr) & np.isfinite(m) & (am > thr)
    sh = 0 if lect == 1 else 1
    e, x = nR - 1 + sh, nR - 1 + Dh * 12 + sh
    side = -np.sign(m)
    g = side * (c[:, x] / c[:, e] - 1)
    ok = exc & np.isfinite(g) & (side != 0)
    return ok, g, side

# famille 3 : 22:00 UTC chaque jour
F3D = np.array([BASE + i * DAY for i in range((END - BASE) // DAY - 2)], dtype=np.int64)
def fam3(j, lect):
    sh = 0 if lect == 1 else 1
    k0 = ((F3D + 22 * HOUR - BASE) // M5).astype(int) + sh
    k1 = ((F3D + 24 * HOUR - BASE) // M5).astype(int) + sh
    g = O[j, k1] / O[j, k0] - 1
    return np.isfinite(g), g, np.ones(len(g))

def series(per_pair, tos, pairs, mask_days=None):
    """per_pair[j] = (ok, g, side) ; rend r_j (net, moyenne sur les paires vivantes), r brut, trades (liste)"""
    n = len(tos); num = np.zeros(n); numg = np.zeros(n); numf = np.zeros(n); den = np.zeros(n); trades = []
    for j in pairs:
        live = tos >= LIVE[j]
        ok, g, side = per_pair[j]
        ok = ok & live
        if mask_days is not None: ok = ok & mask_days
        den += live
        num += np.where(ok, g - 2 * SIDE, 0.0); numg += np.where(ok, g, 0.0); numf += np.where(ok, g - 2 * SIDE_F, 0.0)
        trades.append((j, ok, g))
    den = np.where(den > 0, den, 1)
    return num / den, numg / den, numf / den, trades

def zblocks(x, bl):
    nb = len(x) // bl
    if nb < 2: return float('nan')
    B = x[:nb * bl].reshape(nb, bl).sum(1); sd = B.std(ddof=1)
    return float(B.sum() / (math.sqrt(nb) * sd)) if sd > 0 else float('nan')

rng = np.random.default_rng(20261121)
def threshold(Z, bl):
    """Z : (variantes × jours) du jugement ; quantile 98,75 % du z_max sous l'hypothèse nulle (blocs centrés, mêmes tirages), plancher 2,24"""
    nb = Z.shape[1] // bl
    Zc = Z[:, :nb * bl] - Z[:, :nb * bl].mean(1, keepdims=True)
    B = Zc.reshape(Z.shape[0], nb, bl).sum(2)
    mx = np.empty(NT)
    r2 = np.random.default_rng(20261121)
    for i in range(NT):
        idx = r2.integers(0, nb, nb); S = B[:, idx]
        sd = S.std(1, ddof=1)
        z = np.where(sd > 0, S.sum(1) / (math.sqrt(nb) * np.where(sd > 0, sd, 1)), -np.inf)
        mx[i] = z.max()
    return max(float(np.quantile(mx, 1 - 0.05 / 4)), 2.24), mx

pct = lambda x, d=3: f"{x * 100:+.{d}f} %"
RESULT = {}

def judge(name, V, bl, unit='jour'):
    """V : liste de variantes {nom, tos, r1, r2, trades1, rg1, rf1} ; tos = horodatage de chaque valeur de la série"""
    inJ = lambda tos: (tos >= J0) & (tos < J1)
    inC = lambda tos: (tos >= C0) & (tos < C1)
    lens = {int(inJ(v['tos']).sum()) for v in V}
    assert len(lens) == 1, f"séries de longueurs différentes : {lens}"
    Z = np.array([v['r1'][inJ(v['tos'])] for v in V])
    zs = np.array([zblocks(z, bl) for z in Z])
    thr, _ = threshold(Z, bl)
    b = int(np.nanargmax(zs)); v = V[b]; tJ = inJ(v['tos'])
    yrs = [float(v['r1'][(v['tos'] >= a) & (v['tos'] < c)].sum()) for a, c in ANS]
    z2 = zblocks(v['r2'][tJ], bl); n2 = float(v['r2'][tJ].sum())
    ctl = float(v['r1'][inC(v['tos'])].sum())
    A = zs[b] >= thr; Bc = sum(y > 0 for y in yrs) >= 4; Cc_ = (z2 >= 1.645) and n2 > 0; Dc = ctl > 0
    # T2 : v* + 0,26 % par trade (par semaine en famille 4), seuil tiré à nouveau
    wit = v['r1'][tJ] - v['r1'][tJ].mean() + v['boost'][tJ]          # T2 : série centrée + 0,26 % net par trade
    Zb = Z.copy(); Zb[b] = wit
    thrb, _ = threshold(Zb, bl); zb = zblocks(wit, bl)
    tw = v['tos'][tJ]
    yb = [float(wit[(tw >= a) & (tw < c)].sum()) for a, c in ANS]
    T2 = (zb >= thrb) and sum(y > 0 for y in yb) >= 4
    top = sorted(range(len(V)), key=lambda i: -np.nan_to_num(zs[i], nan=-9))[:5]
    print(f"\n{name} — {len(V)} variantes · seuil {thr:.2f} (98,75 % du z_max sous le hasard, plancher 2,24)")
    print(f"  T2 la porte voit +0,26 % par {('trade' if unit == 'jour' else 'semaine')} sur v* : z {zb:+.2f} / seuil {thrb:.2f}, années + {sum(y > 0 for y in yb)}/6 → {'✓' if T2 else '✗'}")
    print(f"  v* = {v['nom']} : z {zs[b]:+.2f} ({'✓' if A else '✗'} a) · net par année " + ' / '.join(pct(y, 1) for y in yrs) + f" ({'✓' if Bc else '✗'} b)")
    print(f"       lecture 2 : z {z2:+.2f}, net {pct(n2, 1)} ({'✓' if Cc_ else '✗'} c) · contrôle net {pct(ctl, 1)} ({'✓' if Dc else '✗'} d)")
    info = {}
    if 'trades1' in v and v['trades1']:
        gs = np.concatenate([g[ok & tJ] for _, ok, g in v['trades1']]) if v['trades1'] else np.array([])
        if len(gs):
            net = gs - 2 * SIDE; w = net[net > 0]; lo_ = net[net <= 0]
            info = dict(trades=int(len(gs)), brut=float(gs.mean()), net=float(net.mean()), gagnants=float((net > 0).mean()),
                        gain_moy=float(w.mean()) if len(w) else 0.0, perte_moy=float(lo_.mean()) if len(lo_) else 0.0,
                        net_futures=float((gs - 2 * SIDE_F).mean()))
            print(f"       (informatif) {info['trades']} trades au jugement · brut {pct(info['brut'])} / net {pct(info['net'])} par trade · "
                  f"gagnants {info['gagnants'] * 100:.0f} % · gain moyen {pct(info['gain_moy'], 2)} / perte moyenne {pct(info['perte_moy'], 2)} · "
                  f"futures {pct(info['net_futures'])} par trade")
    print('       (informatif) 5 meilleurs z : ' + ' · '.join(f"{V[i]['nom']} {zs[i]:+.2f}" for i in top))
    if not T1: verdict = 'PORTE FAUSSE'
    elif not T2: verdict = 'PORTE AVEUGLE'
    else: verdict = 'OUI' if (A and Bc and Cc_ and Dc) else 'NON'
    print(f"  → {name} : {verdict}")
    RESULT[name] = dict(verdict=verdict, seuil=thr, vstar=v['nom'], z=float(zs[b]), annees=yrs, z2=z2, net2=n2, controle=ctl,
                        a=bool(A), b=bool(Bc), c=bool(Cc_), d=bool(Dc), T2=bool(T2), z_boost=zb, seuil_boost=thrb, info=info,
                        top=[(V[i]['nom'], float(zs[i])) for i in top])

def boost_of(trades, tos):
    n = len(tos); num = np.zeros(n); den = np.zeros(n)
    for j, ok, g in trades:
        num += np.where(ok, 0.0026, 0.0); den += tos >= LIVE[j]
    return num / np.where(den > 0, den, 1)

# ── famille 1 ──
t1 = time.time(); V1 = []
for s in SESS:
    tos = SDAYS[s][0]
    for f, Rs in ((5, (5, 15, 30, 60)), (15, (15, 30, 60))):
        for R in Rs:
            for S in (2, 4, 8):
                for stop in (False, True):
                    pp1 = {j: fam1(s, j, f, R, S, stop, 1) for j in range(NP)}
                    pp2 = {j: fam1(s, j, f, R, S, stop, 2) for j in range(NP)}
                    r1, rg, rf, tr = series(pp1, tos, range(NP)); r2, _, _, _ = series(pp2, tos, range(NP))
                    V1.append(dict(nom=f"{s} f{f} R{R} S{S}h {'stop' if stop else 'sans stop'}", tos=tos, r1=r1, r2=r2, trades1=tr, boost=boost_of(tr, tos)))
print(f"\n  famille 1 calculée en {time.time() - t1:.0f} s")
judge('FAMILLE 1 — cassure de l\'ouverture', V1, 20)
del V1

# ── famille 2 ──
t1 = time.time(); V2 = []
for s in SESS:
    tos = SDAYS[s][0]
    for R in (5, 15, 30, 60):
        for q in (0.8, 0.95):
            for Dh in (1, 4):
                pp1 = {j: fam2(s, j, R, q, Dh, 1) for j in range(NP)}
                pp2 = {j: fam2(s, j, R, q, Dh, 2) for j in range(NP)}
                r1, rg, rf, tr = series(pp1, tos, range(NP)); r2, _, _, _ = series(pp2, tos, range(NP))
                V2.append(dict(nom=f"{s} R{R} q{int(q * 100)} D{Dh}h", tos=tos, r1=r1, r2=r2, trades1=tr, boost=boost_of(tr, tos)))
print(f"\n  famille 2 calculée en {time.time() - t1:.0f} s")
judge('FAMILLE 2 — retour après l\'excès d\'ouverture', V2, 20)
del V2

# ── famille 3 ──
V3 = []
wd = np.array([datetime.datetime.fromtimestamp(t / 1000, datetime.timezone.utc).weekday() < 5 for t in F3D])
for pairs, pn in (([0], 'BTC seul'), (list(range(NP)), '11 paires')):
    for md, mn in ((None, 'tous les jours'), (wd, 'jours ouvrés')):
        pp1 = {j: fam3(j, 1) for j in pairs}; pp2 = {j: fam3(j, 2) for j in pairs}
        r1, rg, rf, tr = series(pp1, F3D, pairs, md); r2, _, _, _ = series(pp2, F3D, pairs, md)
        V3.append(dict(nom=f"22:00 UTC {pn} {mn}", tos=F3D, r1=r1, r2=r2, trades1=tr, boost=boost_of(tr, F3D)))
judge('FAMILLE 3 — heure fixe 22:00 UTC', V3, 20)
del V3

# ── famille 4 : l'heure d'exécution de la voix tendance (moteur de porte_poids.py) ──
_pp = open(os.path.join(HERE, 'porte_poids.py'), encoding='utf-8').read()
G = {'__name__': 'porte_poids_moteur', '__file__': os.path.join(HERE, 'porte_poids.py')}
_argv = sys.argv; sys.argv = ['porte_poids.py', D1]
exec('import sys, os, json, math, hashlib, datetime' + _pp.split('import sys, os, json, math, hashlib, datetime', 1)[1].split("pct = lambda")[0], G)
sys.argv = _argv
P, MON, DAY0, NDAYS, Hp, first_liq, run_E = G['P'], G['MON'], G['DAY0'], G['NDAYS'], G['H'], G['first_liq'], G['run']
def px_at(d, j, tz_sess, extra):
    w = DAY0 + d * DAY
    if tz_sess is None and extra == 0: return P[d, j] if 0 <= d < NDAYS else np.nan
    date = datetime.datetime.fromtimestamp(w / 1000, datetime.timezone.utc).date()
    t = (t_open(date, *SESS[tz_sess]) if tz_sess else w) + extra
    k = slot(t)
    return O[j, k] if 0 <= k < NS else np.nan
def run4(t0, t1_, sess, extra):
    mons = [d for d in MON if t0 <= DAY0 + d * DAY < t1_ and d >= 28]
    cash, pos, weekly = 1.0, {}, []
    def offs(d):
        w = DAY0 + d * DAY
        date = datetime.datetime.fromtimestamp(w / 1000, datetime.timezone.utc).date()
        return ((t_open(date, *SESS[sess]) if sess else w) + extra) - w
    def val(j, x):
        s_, m, x0, _ = pos[j]
        return m * x / x0 if s_ > 0 else m * max(0.0, 2 - x / x0)
    def equity(d):
        e = cash
        for j in pos:
            x = px_at(d, j, sess, extra)
            e += val(j, x) if np.isfinite(x) else pos[j][1]
        return e
    prevE = None
    for d in mons:
        w = DAY0 + d * DAY; wx = w + offs(d)
        for j in list(pos):
            if pos[j][0] < 0:
                tl = first_liq(j, pos[j][3] // Hp * Hp + Hp, wx, pos[j][2])
                if tl is not None: pos.pop(j)
        E0 = equity(d)
        if prevE is not None and prevE > 0 and E0 > 0: weekly.append((w, math.log(E0 / prevE)))
        sig = {}
        for j in range(NP):
            pw, pl = P[d, j], P[d - 28, j]
            if np.isfinite(pw) and np.isfinite(pl) and np.isfinite(px_at(d, j, sess, extra)): sig[j] = float(np.sign(pw / pl - 1))
        for j in list(pos):
            if j in sig and sig[j] != pos[j][0]:
                x = px_at(d, j, sess, extra); v = val(j, x); cash += v - SIDE * pos[j][1]; pos.pop(j)
        act = [j for j in sig if sig[j] != 0]
        if act:
            E = equity(d)
            for j in [j for j in act if j not in pos]:
                m = min(cash, E / len(act))
                if m > 1e-12:
                    cash -= m + SIDE * m
                    if cash < 0: m += cash / (1 + SIDE); cash = 0.0
                    pos[j] = [sig[j], m, px_at(d, j, sess, extra), wx]
        prevE = equity(d)
    dend = next((d for d in range(NDAYS) if DAY0 + d * DAY >= t1_), NDAYS - 1)
    for j in list(pos):
        x = px_at(dend, j, sess, extra)
        if not np.isfinite(x): x = pos[j][2]
        cash += val(j, x) - SIDE * pos[j][1]; pos.pop(j)
    if prevE and cash > 0: weekly.append((DAY0 + dend * DAY, math.log(cash / prevE)))
    return weekly
base = {k: run4(a, b, None, 0) for k, (a, b) in {'J': (J0, J1), 'C': (C0, C1)}.items()}
refE = run_E('E', J0, J1, 1)['weekly']
fid4 = len(refE) == len(base['J']) and all(a[0] == b[0] and abs(a[1] - b[1]) < 1e-12 for a, b in zip(refE, base['J']))
print(f"\n  famille 4 : base 00:00 = E de porte_poids.py ({len(refE)} semaines) → {'✓' if fid4 else '✗'}")
T1 = T1 and fid4
V4 = []
for sess in ('Londres', 'New York'):
    dd = {}
    for k, (a, b) in {'J': (J0, J1), 'C': (C0, C1)}.items():
        for lect, extra in ((1, 0), (2, HOUR)):
            if k == 'C' and lect == 2: continue
            wk = dict(run4(a, b, sess, extra)); bk = dict(base[k])
            ks = sorted(t for t in bk if t in wk and a <= t < b)         # la clôture finale (clé = fin de période) est écartée
            dd[(k, lect)] = dict((t, wk[t] - bk[t]) for t in ks)
    kJ = sorted(dd[('J', 1)]); kC = sorted(dd[('C', 1)])
    assert kJ == sorted(dd[('J', 2)]), 'lecture 2 : semaines différentes'
    tos = np.array(kJ + kC, dtype=np.int64)
    r1 = np.array([dd[('J', 1)][t] for t in kJ] + [dd[('C', 1)][t] for t in kC])
    r2 = np.array([dd[('J', 2)][t] for t in kJ] + [0.0] * len(kC))
    V4.append(dict(nom=f"exécution à l'ouverture de {sess}", tos=tos, r1=r1, r2=r2, boost=np.full(len(tos), 0.0026)))
judge('FAMILLE 4 — heure d\'exécution de la voix tendance', V4, 4, unit='semaine')

# ── informatif : agitation des séances ──
print('\nAGITATION (informatif, jugement) — amplitude de la 1re heure après l\'ouverture / amplitude moyenne d\'une heure, moyenne des paires :')
agit = {}
hk = np.arange(slot(J0), slot(J1) - 12, 12)
for s in SESS:
    tos, ks = SDAYS[s]; sel = (tos >= J0) & (tos < J1); rat = []
    for j in range(NP):
        o, h, l, c = WIN[(s, j)]
        fh = (h[sel, :12].max(1) - l[sel, :12].min(1)) / o[sel, 0]
        idx = hk[:, None] + np.arange(12)[None, :]
        allh = (Hh[j, idx].max(1) - Lw[j, idx].min(1)) / O[j, hk]
        if np.isfinite(fh).sum() > 100 and np.isfinite(allh).sum() > 1000: rat.append(np.nanmean(fh) / np.nanmean(allh))
    agit[s] = float(np.mean(rat)) if rat else float('nan')
    print(f"  {s} : ×{agit[s]:.2f} ({len(rat)} paires)")

print('\nVERDICTS : ' + ' · '.join(f"{k.split(' — ')[0].title()} {v['verdict']}" for k, v in RESULT.items()) + f" · durée {time.time() - t_start:.0f} s")
json.dump(dict(T1=bool(T1), resultats=RESULT, agitation=agit), open(os.path.join(D5, 'porte_sessions.json'), 'w'), default=float, indent=1)
