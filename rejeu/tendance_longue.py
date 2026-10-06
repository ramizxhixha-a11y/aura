# [TENDANCE LONGUE · 06/10/2026] Porte TENDANCE LONGUE — « Go tendances longue » (Rams 06/10 23:19) : UNE hypothèse pré-enregistrée, l'idée
# de Rams « tenir une position le temps qu'il faut », sous sa forme étudiée : la tendance propre sur 4 semaines, positions tenues des semaines.
# Règles fixées AVANT d'avoir téléchargé ou lu la moindre bougie de la période de jugement (écrites ici, non modifiées après ; empreinte SHA-256
# des lignes 1 à 58 et heure UTC notées dans la passation). Rien ne sera retouché pour « faire passer ».
#  D'OÙ VIENT L'HYPOTHÈSE (dit pour qu'on sache ce qui a déjà été vu) : (1) Liu & Tsyvinski, « Risks and Returns of Cryptocurrency » (NBER
#    w24877, données jusqu'en 2018) : le rendement récent du bitcoin prédit celui des semaines suivantes (« momentum » dans le temps).
#    (2) Déjà vu par nous, SUR 10/2024 → 09/2026 seulement : porte TALENT 02/10 hors protocole « tendance 28 j tenue 7 j » +86 puis +15 pb
#    par semaine (t +1,3 / +0,3) ; porte SOURCE 03/10 `tsmom28` z +1,4 (3 j) / +1,7 (7 j), brut 7 j +151 / +49 pb, test 2 à seuil appris −115 pb.
#    (3) Sur 10/2021 → 09/2024 : jamais cette règle ; la porte TENDANCE 06/10 y a vu des CASSURES 672 h avec stop 3 % / objectif 9 % (z 0,37),
#    la RÉPLIQUE 04/10 une combinaison de 13 sources où tsmom28 pèse −0,008. (4) 10/2018 → 09/2021 : jamais lue dans le sens du prix par
#    aucune porte (PORTAGE a lu 2020-21 pour le financement seulement).
#  PAIRES   : les 11 cryptos de l'app (BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE), bougies spot 1 h Binance (archives publiques) ; une
#             paire vit à partir de son premier mois complet d'archive ; EUR/USDT exclue.
#  PRIX DU JOUR P_d : ouverture de la bougie 1 h de d 00:00 UTC ; absente → clôture de la dernière bougie ouverte dans les 24 h avant ;
#             sinon P_d n'existe pas (la paire-semaine qui en a besoin est sautée). Horodatages en µs (archives 2025+) ramenés en ms.
#  DÉCISION : chaque LUNDI 00:00 UTC (w). Signal s_w = signe(P_w / P_(w−28 j) − 1) : +1 → LONG, −1 → SHORT, 0 → rien. Rien du futur : P_w
#             est le prix de l'instant de la décision. La position est TENUE tant que le signe ne change pas ; quand il change, on ferme et on
#             retourne (c'est la seule sortie : pas de stop, pas d'objectif, pas de limite de temps ; le retournement coupe les perdants et
#             laisse courir les gagnants). Une mise = 1 par paire, pas de levier ; résultat en % de la mise.
#  LECTURES : lecture 1 = exécution à P_w, semaine tenue de P_w à P_(w+7 j) : g = s_w × (P_(w+7)/P_w − 1). Lecture 2 = même signal exécuté
#             1 JOUR plus tard (P_(w+1) → P_(w+8)) : la tablette s'arrête 12 à 13 h par jour. L'hypothèse n'entre que si elle passe dans LES DEUX.
#  PÉRIODES : JUGEMENT = décisions des lundis du 01/10/2018 au 30/09/2024 (6 années : A1 10/2018–09/2019 … A6 10/2023–09/2024 ; une
#             paire-semaine appartient à l'année de son lundi ; la dernière semaine sort sur les prix de début 10/2024). CONTRÔLE =
#             01/10/2024 → 30/09/2026 (déjà vu, voir (2)) : condition nécessaire, pas verdict.
#  TEST 1 (sait-elle quelque chose ?) : G = moyenne de g (brut) sur toutes les paires-semaines du jugement. Témoins = le signal de chaque
#             paire décalé de k semaines (même k pour les 11), k de 9 à N − 9 (N = lundis du jugement), rotation modulo N : même part de LONG,
#             même persistance, instant faux ; une paire-semaine sans signal source ou sans rendement est sautée. z = (G − moyenne des témoins)
#             / écart-type des témoins. Ce test sépare le TIMING de la DÉRIVE (en hausse, être souvent LONG rapporte quel que soit l'instant).
#             TALENT = z ≥ seuil ET brut moyen > 0 dans au moins 4 des 6 années, dans les deux lectures (z de la lecture 2 avec ses rendements).
#  SEUIL z  : quantile 95 % du z (lecture 1, jugement) sur 500 MONDES TÉMOINS, jamais sous 1,645. Monde témoin = les vrais prix du jour dont
#             le SIGNE du rendement de chaque jour UTC est tiré à pile ou face (même pièce pour les 11 paires, graine 20261007) : volatilité,
#             grappes et corrélation entre paires gardées, persistance de direction — ce que la tendance prétend lire — détruite. On rapporte
#             aussi la part des mondes qui passeraient TOUTE la porte (TALENT + test 2 A, lecture 1) : le vrai taux de fausse admission.
#  TEST 2 (gagne-t-elle de l'argent ?) : capital K/11 par paire, résultats non composés (un capital de paire pas encore cotée dort).
#             Coût d'une paire-semaine = côté × |s_w − s_(w−1)| (s = 0 avant la première semaine d'une paire ou après un trou ; un retournement
#             = 2 côtés), plus côté × |s| à la dernière semaine de la période (position fermée). (A) barème de l'app (02) : taker 0,10 % +
#             glissement 0,03 % = 0,13 % par côté, sans financement — ce que l'EV mesure. (B) futures USDT-M : 0,05 % + 0,03 % = 0,08 % par côté,
#             PLUS le financement réellement versé pendant la semaine (calc_time dans ]entrée, sortie] ; LONG paie r, SHORT reçoit r ; archives
#             fundingRate, 1000PEPEUSDT pour PEPE) ; une paire-semaine n'entre en (B) que si son contrat existait déjà à l'entrée.
#             Passe en (A) si net_A total > 0 sur le jugement avec ≥ 30 trades (trade = suite de semaines de même signe) ET net_A > 0 dans
#             au moins 4 des 6 années, dans les deux lectures. Passe en (B) si net_B total > 0 ET net_B > 0 dans au moins les deux tiers
#             (arrondi au-dessus) des années où (B) a des paires-semaines, dans les deux lectures.
#  VERDICT  : ENTRE = TALENT ET test 2 (A) ET net_A > 0 sur le contrôle (lecture 1). ENTRE SUR FUTURES SEULEMENT = idem avec (B) quand (A)
#             échoue → aucune voix dans la décision sans décision de Rams sur le barème de l'EV. Sinon N'ENTRE PAS. ENTRER = devenir candidate
#             à une voix de l'app en EV (mission à part, « go »), PAS trader en RE : il faudra encore l'EV en direct.
#  RAPPORTÉ (informatif, hors verdict) : par année et par paire ; LONG / SHORT ; trades (nombre, durée médiane / max, part gagnante, gain
#             moyen d'un gagnant / perte moyenne d'un perdant — « perdre peu, gagner gros ») ; pire baisse du capital (somme des semaines
#             nettes du portefeuille) ; « toujours LONG » (achat-conservation) au même barème ; carte de robustesse : recul {7, 14, 21, 28,
#             56, 91} j revu chaque lundi, 28 j revu chaque jour, 28 j « LONG ou rien » (ce que le comptant permet sans vente à découvert) —
#             un vrai effet a des voisins lisses, un coup de chance est un pic.
#  PUISSANCE (dite avant) : ~300 lundis × 3 à 11 paires corrélées ; un effet de l'ordre de la littérature (ratio de Sharpe ~1 par an)
#             donnerait z ≈ 2,5 sur 6 ans ; un petit effet ne peut pas être prouvé — dans ce cas la porte dit « non prouvé », pas « faux ».
#  NON MODÉLISÉ (dit au rapport) : montants minimaux d'ordre, exécution partielle, frais maker, risque de plateforme, fiscalité, levier,
#             appel de marge, coût d'emprunt d'une vente à découvert au comptant (l'app ne vend pas à découvert au comptant), le coût de
#             sortie calculé sur la mise et non sur la valeur de sortie.
#  AUCUN CODE DE L'APP N'EST TOUCHÉ dans cette mission (mesure seule).
# usage : sh rejeu/portage_get.sh <données> 2018-08 2026-09   (bougies 1 h spot + financement, archives Binance, hors dépôt)
#         python3 -I rejeu/tendance_longue.py <données> [--mondes 500] [--graine 20261007] > rapport.txt   (écrit <données>/tendance_longue.json)
# ---------------------------------------------------------------------------------------------------------------------------------------------
import sys, os, io, json, zipfile, math, datetime, time
import numpy as np

ARGS = sys.argv[1:]
D = next((a for a in ARGS if not a.startswith('--')), 'donnees')
def opt(k, d):
    return ARGS[ARGS.index(k) + 1] if k in ARGS else d
N_MONDES = int(opt('--mondes', 500)); GRAINE = int(opt('--graine', 20261007))
PAIRS = 'BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE'.split()
NP = len(PAIRS); DAY = 86400000
SIDE_A, SIDE_B = 0.0013, 0.0008
def T(s): return int(datetime.datetime.strptime(s, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
def iso(ms): return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%d/%m/%Y')
J0, J1 = T('2018-10-01'), T('2024-10-01')          # jugement : lundis dans [J0, J1)
C0, C1 = T('2024-10-01'), T('2026-10-01')          # contrôle
ANS = [(T(f'{y}-10-01'), T(f'{y + 1}-10-01')) for y in range(2018, 2024)]
ANS_C = [(T(f'{y}-10-01'), T(f'{y + 1}-10-01')) for y in range(2024, 2026)]

def rows(path):
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            for line in io.TextIOWrapper(z.open(name), encoding='utf-8'):
                c = line.strip().split(',')
                if c and c[0][:1].isdigit(): yield c

# ---- prix du jour P_d (règle de l'en-tête) ----
t_load = time.time()
DAY0 = T('2018-08-01'); NDAYS = (T('2026-10-12') - DAY0) // DAY
P = np.full((NDAYS, NP), np.nan); LIVE = np.full(NP, np.nan)
for j, p in enumerate(PAIRS):
    files = sorted(f for f in os.listdir(os.path.join(D, 'spot1h')) if f.startswith(p + 'USDT-1h-'))
    o, c = {}, {}
    for f in files:
        for r in rows(os.path.join(D, 'spot1h', f)):
            t = int(r[0]); t = t // 1000 if t > 1e14 else t
            o[t] = float(r[1]); c[t] = float(r[4])
    first = min(o); fm = datetime.datetime.fromtimestamp(first / 1000, datetime.timezone.utc)
    mstart = T(f'{fm.year}-{fm.month:02d}-01')
    LIVE[j] = mstart if first == mstart else T(f'{fm.year + (fm.month == 12)}-{fm.month % 12 + 1:02d}-01')
    ts = np.array(sorted(o)); cl = np.array([c[t] for t in ts])
    for d in range(NDAYS):
        td = DAY0 + d * DAY
        if td < LIVE[j]: continue
        if td in o: P[d, j] = o[td]; continue
        k = np.searchsorted(ts, td) - 1                 # dernière bougie ouverte avant td
        if k >= 0 and ts[k] >= td - DAY: P[d, j] = cl[k]
FUND = {}
for p in PAIRS:
    sym = ('1000PEPE' if p == 'PEPE' else p) + 'USDT'; L = []
    for f in sorted(x for x in os.listdir(os.path.join(D, 'fund')) if x.startswith(sym + '-')):
        for r in rows(os.path.join(D, 'fund', f)):
            t = int(r[0]); t = t // 1000 if t > 1e14 else t; L.append((t, float(r[2])))
    L.sort(); FUND[p] = (np.array([x[0] for x in L]), np.cumsum([x[1] for x in L]))
def fund_sum(p, t0, t1):                                 # somme des taux, calc_time dans ]t0, t1]
    ft, cs = FUND[p]
    if len(ft) == 0 or ft[0] > t0: return np.nan
    a, b = np.searchsorted(ft, t0, 'right'), np.searchsorted(ft, t1, 'right')
    return (cs[b - 1] if b else 0.0) - (cs[a - 1] if a else 0.0)
MON = [d for d in range(NDAYS) if datetime.datetime.fromtimestamp((DAY0 + d * DAY) / 1000, datetime.timezone.utc).weekday() == 0]

# ---- moteur : signaux, rendements, coûts ----
def at(Px, d):
    return Px[d] if 0 <= d < len(Px) else np.full(NP, np.nan)
def build(Px, look=28, step=7, days=None, longonly=False):
    """rend dict : jours de décision, S signal, R1/R2 rendements bruts non signés (lecture 1 / 2), t entrée/sortie"""
    days = days if days is not None else [d for d in range(NDAYS)] if step == 1 else MON
    S, R1, R2 = [], [], []
    for d in days:
        p0, pl = at(Px, d), at(Px, d - look)
        s = np.sign(p0 / pl - 1)
        if longonly: s = np.where(s > 0, 1.0, np.where(np.isnan(s), np.nan, 0.0))
        S.append(s)
        R1.append(at(Px, d + step) / p0 - 1); R2.append(at(Px, d + step + 1) / at(Px, d + 1) - 1)
    return dict(days=np.array(days), S=np.array(S), R1=np.array(R1), R2=np.array(R2), step=step)
def sel(B, t0, t1):
    tt = DAY0 + B['days'] * DAY; m = (tt >= t0) & (tt < t1)
    return {k: (v[m] if isinstance(v, np.ndarray) else v) for k, v in B.items()}
def costs(S, valid, side):
    """coût par case : |s_w − s_(w−1)| sur la suite (0 hors validité, 0 aux deux bouts), chaque transition imputée à la case adjacente valide"""
    n, m = S.shape; s = np.where(valid, S, 0.0); C = np.zeros((n, m))
    prev = np.vstack([np.zeros((1, m)), s[:-1]]); nxt = np.vstack([s[1:], np.zeros((1, m))])
    vprev = np.vstack([np.zeros((1, m), bool), valid[:-1]])
    C += np.where(valid, side * np.abs(s - prev), 0.0)                              # entrée / retournement
    C += np.where(valid & ~np.vstack([valid[1:], np.zeros((1, m), bool)]), side * np.abs(s), 0.0)  # fermeture avant un trou / à la fin
    return C
def trades(S, valid):
    out = []                                             # (paire, i0, i1, signe)
    for j in range(S.shape[1]):
        i = 0
        while i < S.shape[0]:
            if valid[i, j] and S[i, j] != 0:
                k = i
                while k + 1 < S.shape[0] and valid[k + 1, j] and S[k + 1, j] == S[i, j]: k += 1
                out.append((j, i, k, S[i, j])); i = k + 1
            else: i += 1
    return out
def evaluate(B, lect, years, funding=False, kmin=9):
    S, R = B['S'], B['R1' if lect == 1 else 'R2']
    valid = np.isfinite(S) & np.isfinite(R) & (S != 0) if not B.get('lo') else np.isfinite(S) & np.isfinite(R)
    g = np.where(valid, S * R, np.nan)
    G = np.nanmean(g)
    N = S.shape[0]; rot = []
    for k in range(kmin, N - kmin + 1):
        Sk = np.roll(S, k, axis=0); gk = Sk * R; m = np.isfinite(gk) & ((Sk != 0) | bool(B.get('lo')))
        rot.append(gk[m].mean() if m.any() else np.nan)
    rot = np.array(rot); z = (G - np.nanmean(rot)) / np.nanstd(rot)
    tt = DAY0 + B['days'] * DAY
    netA = np.where(valid, g - costs(S, valid, SIDE_A), 0.0)
    res = dict(G=G, z=z, rot_mu=float(np.nanmean(rot)), rot_sd=float(np.nanstd(rot)), n=int(valid.sum()),
               netA=float(netA.sum() / NP), weekA=netA.sum(1) / NP)
    res['brut_an'] = [float(np.nanmean(g[(tt >= a) & (tt < b)])) if ((tt >= a) & (tt < b)).any() else float('nan') for a, b in years]
    res['netA_an'] = [float(netA[(tt >= a) & (tt < b)].sum() / NP) for a, b in years]
    tr = trades(S, valid); res['trades'] = len(tr)
    if funding:
        d_in = B['days'] + (0 if lect == 1 else 1); st = B['step']
        F = np.full(S.shape, np.nan)
        for i, d in enumerate(d_in):
            for j, p in enumerate(PAIRS):
                if valid[i, j]: F[i, j] = fund_sum(p, DAY0 + d * DAY, DAY0 + (d + st) * DAY)
        vB = valid & np.isfinite(F)
        netB = np.where(vB, g - costs(S, vB, SIDE_B) - np.where(vB, S * F, 0.0), 0.0)
        res['netB'] = float(netB.sum() / NP); res['nB'] = int(vB.sum()); res['weekB'] = netB.sum(1) / NP
        res['netB_an'] = [float(netB[(tt >= a) & (tt < b)].sum() / NP) if vB[(tt >= a) & (tt < b)].any() else None for a, b in years]
        res['finB'] = float(-np.nansum(np.where(vB, S * F, 0.0)) / NP)
    return res, g, valid, tr
def ddown(w):
    c = np.cumsum(w); return float((np.maximum.accumulate(np.concatenate([[0], c]))[1:] - c).max()) if len(c) else 0.0
def passes(res, years_req=4):
    return sum(x > 0 for x in res['brut_an']) >= years_req
def test2A(res): return res['netA'] > 0 and res['trades'] >= 30 and sum(x > 0 for x in res['netA_an']) >= 4
def test2B(res):
    yrs = [x for x in res['netB_an'] if x is not None]
    return res['netB'] > 0 and sum(x > 0 for x in yrs) >= math.ceil(len(yrs) * 2 / 3)
pc = lambda x, d=2: f"{x * 100:+.{d}f} %"
print(f"PORTE TENDANCE LONGUE — tendance 28 j revue chaque lundi, tenue jusqu'au retournement — {NP} paires · chargement {time.time() - t_load:.0f} s")
for j, p in enumerate(PAIRS): print(f"  {p:5s} vivante dès {iso(LIVE[j])} · financement dès {iso(FUND[p][0][0]) if len(FUND[p][0]) else '—'}")

# ---- 1. l'hypothèse sur le jugement, deux lectures ----
t_run = time.time()
BASE = build(P)
BJ, BC = sel(BASE, J0, J1), sel(BASE, C0, C1)
R = {}
for L in (1, 2):
    R[L], gJ, vJ, trJ = evaluate(BJ, L, ANS, funding=True)
    R[L]['ddA'] = ddown(R[L]['weekA']); R[L]['ddB'] = ddown(R[L]['weekB'])
    if L == 1: G1, V1, TR1 = gJ, vJ, trJ
RC, gC, vC, trC = evaluate(BC, 1, ANS_C, funding=True)
print(f"\nJUGEMENT {iso(J0)} → 30/09/2024 · {len(BJ['days'])} lundis · contrôle {len(BC['days'])} lundis · calcul {time.time() - t_run:.0f} s")
for L in (1, 2):
    r = R[L]
    print(f"  lecture {L} : {r['n']} paires-semaines · brut {pc(r['G'], 3)}/semaine · témoins {pc(r['rot_mu'], 3)} ± {pc(r['rot_sd'], 3)} → z = {r['z']:.2f}")
    print(f"     brut par année {' · '.join(pc(x, 2) for x in r['brut_an'])}")
    print(f"     (A) net {pc(r['netA'], 1)} du capital en 6 ans · par année {' · '.join(pc(x, 1) for x in r['netA_an'])} · {r['trades']} trades · pire baisse {pc(r['ddA'], 1)}")
    print(f"     (B) net {pc(r['netB'], 1)} ({r['nB']} paires-semaines, financement {pc(r['finB'], 1)}) · par année {' · '.join('—' if x is None else pc(x, 1) for x in r['netB_an'])} · pire baisse {pc(r['ddB'], 1)}")
print(f"  CONTRÔLE (déjà vu) lecture 1 : brut {pc(RC['G'], 3)}/semaine · z {RC['z']:.2f} · (A) net {pc(RC['netA'], 1)} ({' · '.join(pc(x, 1) for x in RC['netA_an'])}) · (B) net {pc(RC['netB'], 1)}")

# ---- 2. mondes témoins → seuil z, taux de fausse admission ----
rng = np.random.default_rng(GRAINE); ZW, OKW = [], []
LP = np.log(P); first = [int(np.argmax(np.isfinite(P[:, j]))) for j in range(NP)]
r_d = np.nan_to_num(np.diff(LP, axis=0), nan=0.0)
t_m = time.time()
for w in range(N_MONDES):
    c = rng.choice([-1.0, 1.0], size=NDAYS - 1)
    cum = np.vstack([np.zeros((1, NP)), np.cumsum(c[:, None] * r_d, axis=0)])
    Pw = np.where(np.isfinite(P), np.exp(LP[first, range(NP)] + cum - cum[first, range(NP)]), np.nan)
    rw, _, _, _ = evaluate(sel(build(Pw), J0, J1), 1, ANS)
    ZW.append(rw['z']); OKW.append((rw, ))
    if (w + 1) % 100 == 0: print(f"  mondes {w + 1}/{N_MONDES} · {time.time() - t_m:.0f} s", file=sys.stderr)
ZW = np.array(ZW)
SEUIL = max(1.645, float(np.quantile(ZW, 0.95))) if N_MONDES else 1.645
faux = sum(1 for (rw,) in OKW if rw['z'] >= SEUIL and passes(rw) and test2A(rw)) if N_MONDES else 0
print(f"\nMONDES TÉMOINS ({N_MONDES}, graine {GRAINE}) : z moyen {ZW.mean():+.2f} ± {ZW.std():.2f} · quantile 95 % {np.quantile(ZW, 0.95):.2f} · max {ZW.max():.2f}" if N_MONDES else "\nMONDES TÉMOINS : non lancés")
print(f"  seuil z = {SEUIL:.3f} · z réel au {100 * (ZW < R[1]['z']).mean():.0f}e centile des témoins · {faux}/{N_MONDES} mondes passeraient toute la porte")

# ---- 3. verdict ----
tal = {L: R[L]['z'] >= SEUIL and passes(R[L]) for L in (1, 2)}
tA = {L: test2A(R[L]) for L in (1, 2)}; tB = {L: test2B(R[L]) for L in (1, 2)}
TALENT = tal[1] and tal[2]; A_OK = tA[1] and tA[2]; B_OK = tB[1] and tB[2]
if TALENT and A_OK and RC['netA'] > 0: V = 'ENTRE'
elif TALENT and B_OK and RC['netB'] > 0: V = 'ENTRE SUR FUTURES SEULEMENT'
else: V = "N'ENTRE PAS"
print(f"\nVERDICT : {V}")
print(f"  TALENT {tal} · test 2 (A) {tA} · test 2 (B) {tB} · contrôle net A > 0 : {RC['netA'] > 0}")

# ---- 4. rapporté (informatif) ----
print("\nDÉTAIL (lecture 1, jugement)")
tt = DAY0 + BJ['days'] * DAY
for j, p in enumerate(PAIRS):
    m = V1[:, j]
    if m.any():
        nl = int((BJ['S'][:, j][m] > 0).sum())
        print(f"  {p:5s} {int(m.sum()):3d} semaines · LONG {nl:3d} · brut {pc(np.nanmean(G1[:, j]), 2)}/sem · net A {pc(np.nansum(np.where(m, G1[:, j], 0)) - costs(BJ['S'], V1, SIDE_A)[:, j].sum(), 0)} de sa mise")
SL = BJ['S']
for lab, sg in (('LONG', 1), ('SHORT', -1)):
    m = V1 & (SL == sg); print(f"  {lab:5s} : {int(m.sum())} paires-semaines · brut {pc(np.nanmean(np.where(m, G1, np.nan)), 3)}/semaine")
true_tr = []
for (j, i0, i1, sg) in TR1:
    d0, d1 = BJ['days'][i0], BJ['days'][i1] + 7
    true_tr.append((sg * (P[d1, j] / P[d0, j] - 1), (d1 - d0) / 7))
tr_r = np.array([x[0] for x in true_tr]); tr_d = np.array([x[1] for x in true_tr])
win = tr_r > 0
print(f"  trades {len(tr_r)} · durée médiane {np.median(tr_d):.0f} sem · 90 % ≤ {np.quantile(tr_d, 0.9):.0f} · max {tr_d.max():.0f} · gagnants {100 * win.mean():.0f} % · gain moyen {pc(tr_r[win].mean(), 1)} · perte moyenne {pc(tr_r[~win].mean(), 1)} · meilleur {pc(tr_r.max(), 0)} · pire {pc(tr_r.min(), 0)}")
BH = dict(BJ); BH['S'] = np.where(np.isfinite(BJ['S']), 1.0, np.nan)
rbh, _, _, _ = evaluate(BH, 1, ANS)
print(f"  « toujours LONG » (achat-conservation, même barème A) : brut {pc(rbh['G'], 3)}/semaine · net A {pc(rbh['netA'], 1)} · par année {' · '.join(pc(x, 0) for x in rbh['netA_an'])} · pire baisse {pc(ddown(rbh['weekA']), 0)}")
print("\nCARTE DE ROBUSTESSE (jugement ; z, brut/semaine, net A total, années net A > 0)")
CARTE = {}
for look in (7, 14, 21, 28, 56, 91):
    for L in (1, 2):
        rv, _, _, _ = evaluate(sel(build(P, look=look), J0, J1), L, ANS)
        CARTE[f'{look}j_l{L}'] = rv
    a, b = CARTE[f'{look}j_l1'], CARTE[f'{look}j_l2']
    print(f"  recul {look:2d} j, lundi : z {a['z']:+.2f} / {b['z']:+.2f} · brut {pc(a['G'], 3)} · net A {pc(a['netA'], 0)} / {pc(b['netA'], 0)} · années + {sum(x > 0 for x in a['netA_an'])}/6")
BD = sel(build(P, look=28, step=1), J0, J1)
for L in (1, 2): CARTE[f'28j_jour_l{L}'], _, _, _ = evaluate(BD, L, ANS, kmin=60)
a, b = CARTE['28j_jour_l1'], CARTE['28j_jour_l2']
print(f"  recul 28 j, chaque jour : z {a['z']:+.2f} / {b['z']:+.2f} · brut {pc(a['G'], 3)}/jour · net A {pc(a['netA'], 0)} / {pc(b['netA'], 0)} · années + {sum(x > 0 for x in a['netA_an'])}/6 · {a['trades']} trades")
BLO = sel(build(P, longonly=True), J0, J1); BLO['lo'] = True
for L in (1, 2): CARTE[f'28j_long_l{L}'], _, _, _ = evaluate(BLO, L, ANS)
a, b = CARTE['28j_long_l1'], CARTE['28j_long_l2']
print(f"  recul 28 j, LONG ou rien : z {a['z']:+.2f} / {b['z']:+.2f} · brut {pc(a['G'], 3)}/semaine · net A {pc(a['netA'], 0)} / {pc(b['netA'], 0)} · années + {sum(x > 0 for x in a['netA_an'])}/6 · pire baisse {pc(ddown(a['weekA']), 0)}")
clean = lambda r: {k: v for k, v in r.items() if not isinstance(v, np.ndarray)}
json.dump(dict(verdict=V, seuil=SEUIL, mondes=dict(z=ZW.tolist(), faux=faux), lecture1=clean(R[1]), lecture2=clean(R[2]), controle=clean(RC),
               achat_conservation=clean(rbh), carte={k: clean(v) for k, v in CARTE.items()},
               trades=[[PAIRS[j], iso(DAY0 + BJ['days'][i0] * DAY), iso(DAY0 + (BJ['days'][i1] + 7) * DAY), int(sg), float(x[0])] for (j, i0, i1, sg), x in zip(TR1, true_tr)]),
          open(os.path.join(D, 'tendance_longue.json'), 'w'), ensure_ascii=False, default=float)
print(f"\ndurée {time.time() - t_load:.0f} s · {os.path.join(D, 'tendance_longue.json')}")
