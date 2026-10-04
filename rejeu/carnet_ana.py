# [CARNET · 04/10/2026] Porte TALENT pour le CARNET D'ORDRES et le FLUX DE TRADES RÉELS — « go carnet » (Rams 04/10 13:22).
# Règles fixées AVANT de calculer le moindre vote (écrites ici, non modifiées après ; empreinte SHA-256 de ce bloc notée dans la passation) :
#  GRILLE   : celle de la porte TALENT (rejeu/talent_prep.py) — bougies spot Binance 15 min, 12 paires, 10/2024 → 09/2026 ; décision à la clôture
#             de la bougie i, entrée à ce prix, sortie à la clôture de i+h ; horizons 15 min / 1 h / 4 h / 24 h ; année 1 = décision close avant le
#             01/10/2025 00:00 UTC ; coût aller-retour 0,26 % ; une voix parle si |vote| ≥ 0,03 ; sens = signe du vote.
#  FLUX     : TOUS les trades spot Binance (archives data/spot/*/trades = le contenu du flux @trade de l'app : prix, quantité, côté preneur, heure),
#             rejoués trade par trade dans la logique de _recordTrade (02) par rejeu/carnet_flux.c — seaux d'une minute à l'heure du trade, gros
#             trade = notionnel > 8 × moyenne mobile du notionnel (α 0,02, mise à jour après le test) et ≥ 500 $. Traduction vérifiée contre la
#             fonction RÉELLE de 02 exécutée en vm sur des journées complètes de trades (seaux identiques exigés, sinon rien n'est calculé).
#             Vue « app » (informative) : la même chose sur les seuls trades que l'app garde (anti-flood de 02 : un message au plus par 250 ms et
#             par paire, heure du trade prise pour heure d'arrivée).
#  CARNET   : profondeur cumulée des futures USDT-M (archives data/futures/um/daily/bookDepth, une photo ~toutes les 30 s), bandes ±1 % et ±5 %
#             (les seules présentes sur toute la période ; ±0,2 % n'existe qu'à partir de 2025-2026). Déséquilibre = (profondeur bid − profondeur
#             ask) / (somme), en pièces. Photo plus vieille que 180 s (règle de l'app) ou absente → pas de carnet. EUR/USDT : pas de contrat.
#  VOIX TESTÉES (4 voix × 4 horizons = 16 essais) :
#    whale_v1  code RÉEL (scoutAnalysis de 03, génome de départ) sur S.flowStats = seaux réels ; sans murs (l'archive n'a pas les niveaux) ni
#              liquidations (aucune archive USDT-M) : ses deux autres apports se taisent
#    flow_v1   code RÉEL : flux preneur réel 5 min (70 %) + S.orderBook.imb = déséquilibre ±1 % (30 %) — l'app lit 20 niveaux du carnet SPOT ;
#              la bande ±1 % futures est l'approximation disponible la plus proche (écart dit au rapport)
#    carnet_1  vote = déséquilibre ±1 %            carnet_5  vote = déséquilibre ±5 %            (définitions nouvelles, hors app)
#  LECTURES : lecture 1 = données jusqu'à la clôture (seaux de minute complets avant la clôture, photo ≤ clôture) ; lecture 2 = données d'une
#             minute plus vieilles (seaux avant clôture − 1 min, photo ≤ clôture − 60 s ; Date.now() de l'app reculé d'autant) — un signal qui ne
#             vit que dans la dernière minute ne serait pas jouable par l'app. Entrée à la clôture dans les deux.
#  TEST 1, TEST 2 : ceux de rejeu/talent_ana.py, fonctions recopiées à l'identique (rotation d'un nombre entier de jours, ≥ 7 j de chaque côté ;
#             seuil de force appris sur l'année 1, joué tel quel sur l'année 2, une position à la fois par paire, ≥ 30 trades).
#  SEUIL z  : APPRIS sur placebos (calibrage exigé au point 9 de la passation avant toute admission par la porte à 15 min), avant de juger :
#             pour chaque voix et chaque horizon, 1 000 placebos AR(1) indépendants par paire au pas de 15 min, persistance φ = médiane sur les
#             paires de l'autocorrélation à 1 pas du vote de la voix (lecture 1), parlant au même taux que la voix sur chaque paire (graine
#             20261004) ; loi de Student ajustée aux z des placebos (centre 0), risque 5 % / 16 d'un seul côté → seuil ; jamais sous 3,2.
#  ENTRÉE   : TALENT (z ≥ seuil appris ET brut > 0 les deux années) ET rentable (net > 0 sur l'année 2, ≥ 30 trades), dans LES DEUX lectures.
#             Sinon la voix reste muette dans la décision (rien n'est retiré de l'app). À contresens (z ≤ −seuil) : rapporté, n'admet rien.
#  TEST 3   : combinaison linéaire des voix (fonction de talent_ana.py, apprise sur l'année 1, jouée sur l'année 2) — informatif, comme dans TALENT :
#             les 20 voix de la porte TALENT (rejeu talent.js, bougies closes) SANS les nouvelles données, puis les mêmes où whale_v1 / flow_v1
#             lisent le flux réel et le carnet, + carnet_1 / carnet_5.
# usage : python3 rejeu/carnet_ana.py <paires talent_prep> <votes carnet.js lecture 1> <lecture 2> [<votes talent.js a> <b>] > rapport.txt
# RELECTURE INDÉPENDANTE (agent séparé, 04/10, après le 1er passage — verdict du 1er passage : aucune voix n'entre ; aucune règle de preuve
# assouplie). Écarts trouvés et corrigés (2e passage, publié) :
#   (a) DONNÉES — l'archive bookDepth contient des photos abîmées (profondeur figée ou un côté vide des journées entières, 0,24 % des photos en
#       année 1 contre 3,6 % en année 2 : le défaut tombait sur l'année de test) → règle de rejet écrite dans rejeu/carnet_prep.py (profondeur
#       qui ne croît pas de ±1 à ±5 %, ou un côté < 5 % de l'autre) ; règle de VALIDITÉ des données ajoutée après lecture du 1er passage :
#       les deux passages sont rapportés, le verdict ne change pas ;
#   (b) les règles disent « photo ≤ clôture » : le code lit strictement AVANT la clôture (plus prudent) ; la minute en cours est exclue, d'où
#       des fenêtres effectives de 8 min (whale_v1) et 4 min (flow_v1) au lieu de 9 et 5 ;
#   (c) informatif, ajouté : ENTRÉE DÉCALÉE d'une bougie (entrée à la clôture de i+1) — la clôture est le dernier trade imprimé, le rebond
#       acheteur / vendeur peut créer un faux savoir à 15 min sur des signaux de microstructure (la relecture : carnet_5 z 3,7 → 1,95) ;
#   (d) limite dite : le placebo AR(1) n'a pas la mémoire longue de carnet_5 (autocorrélation à 1 jour 0,59 contre 0,03) ; le plancher 3,2 a
#       décidé partout (seuils appris 2,7–2,9) ; contrôle sans modèle de la relecture (rotations du vrai signal) : p 0,0028 pour carnet_5 à
#       15 min contre 0,05/16 = 0,0031 — à la limite.
# (usage réel, options nommées : python3 rejeu/carnet_ana.py <paires> <carnet_v1> <carnet_v2> [--app <carnet_a1>] [--talent <talent_a> <talent_b>
#  --talent-carnet <talentc_a> <talentc_b>] — talent.js sans puis avec --carnet : au test 3, les conseils qui écoutent whale_v1 / flow_v1
#  (scalper_v2, trend_v2, momentum_v1) sont recalculés avec eux, et rapportés seuls à titre d'information)
import sys, json, os
import numpy as np
from scipy import stats as sst
from scipy.signal import lfilter

DATA, B1, B2 = sys.argv[1], sys.argv[2], sys.argv[3]
OPT = sys.argv[4:]
BA = OPT[OPT.index('--app') + 1] if '--app' in OPT else None                                     # vue app (informative), facultative
TAL = OPT[OPT.index('--talent') + 1: OPT.index('--talent') + 3] if '--talent' in OPT else []    # votes talent.js a, b (test 3), facultatifs
TALC = OPT[OPT.index('--talent-carnet') + 1: OPT.index('--talent-carnet') + 3] if '--talent-carnet' in OPT else []   # talent.js --carnet a, b
def load(b):
    m = json.load(open(b + '.json')); return m, np.fromfile(b, dtype=np.float32).reshape(-1, len(m['pairs']), len(m['voices'])).astype(np.float64)
m1, V1 = load(B1); m2, V2 = load(B2)
assert m1['lecture'] == 1 and m2['lecture'] == 2 and m1['vue'] == 'v' and m2['vue'] == 'v', 'lectures / vues inattendues'
assert m1['from'] == m2['from'] and m1['to'] == m2['to'] and m1['voices'] == m2['voices'] == ['whale_v1', 'flow_v1', 'carnet_1', 'carnet_5']
PAIRS, VOICES = m1['pairs'], m1['voices']; nP, nV = len(PAIRS), len(VOICES)
FROM = m1['from']; T = V1.shape[0]

# ── grille, rendements, années : copie à l'identique de rejeu/talent_ana.py ──
C, TS = [], None
for p in PAIRS:
    d = json.load(open(os.path.join(DATA, p.split('/')[0] + '.json')))
    k = np.array(d['k'], dtype=np.float64)
    C.append(k[:, 4]); TS = k[:, 0] if TS is None else TS
C = np.stack(C, 1)
N = C.shape[0]
H = [1, 4, 16, 96]; HN = {1: '15 min', 4: '1 h', 16: '4 h', 96: '24 h'}
COST = 0.0026; THR = 0.03; ZMIN = 3.2
YCUT = 1759276800000                               # 01/10/2025 00:00 UTC
idx = np.arange(FROM, FROM + T)
ts = TS[idx]; y1 = ts + 900000 < YCUT; y2 = ~y1
assert int(ts[0]) == m1['ts0'], 'grille décalée'
R = {}
for h in H:
    r = np.full((T, nP), np.nan)
    ok = idx + h < N
    r[ok] = C[idx[ok] + h] / C[idx[ok]] - 1
    R[h] = r

def rot_z(s, r, h):
    """gain brut du signal s contre r, comparé aux rotations d'un nombre entier de jours (≥ 7 j de chaque côté)."""
    r0 = np.nan_to_num(r); n = len(r0)
    L = 1 << int(np.ceil(np.log2(2 * n)))
    tot = None
    for j in range(s.shape[1]):
        fs = np.fft.rfft(s[:, j], L); fr = np.fft.rfft(r0[:, j], L)
        cc = np.fft.irfft(np.conj(fs) * fr, L)        # cc[k] = Σ_t s[t]·r[t+k]  (k ≥ 0) ; cc[L−k] : k < 0
        # rotation circulaire exacte : Σ_t s[(t−k) mod n]·r[t] = cc_lin[k] + cc_lin[k−n]
        lin = np.concatenate([cc[L - (n - 1):], cc[:n]])  # lags −(n−1) … n−1
        rot = lin[n - 1:] + np.concatenate([[0], lin[:n - 1]])   # lag k ∈ [0, n) : k et k−n
        tot = rot if tot is None else tot + rot
    actual = tot[0]
    days = np.arange(96 * 7, n - 96 * 7, 96)
    null = tot[days]
    return actual, null.mean(), null.std(), len(days)

def stats(s, r, mask):
    m = mask[:, None] & (s != 0) & np.isfinite(r)
    g = (s * r)[m]
    return dict(n=int(m.sum()), brut_pb=float(g.mean() * 1e4) if g.size else 0.0, juste=float((g > 0).mean()) if g.size else 0.0)

def trade(sig, r, h, mask, thr_abs, v):
    """une position à la fois par paire, tenue h bougies, après frais ; ne prend que |v| ≥ thr_abs."""
    pnl = []
    for j in range(nP):
        ev = np.where(mask & (np.abs(v[:, j]) >= max(THR, thr_abs)) & np.isfinite(r[:, j]))[0]
        last = -10**9
        for e in ev:
            if e >= last + h:
                pnl.append(np.sign(v[e, j]) * r[e, j] - COST); last = e
    pnl = np.array(pnl)
    return dict(n=int(pnl.size), net_pb=float(pnl.mean() * 1e4) if pnl.size else 0.0, total_100=float(pnl.sum() * 100) if pnl.size else 0.0,
                gagnants=float((pnl > 0).mean()) if pnl.size else 0.0)

def walk(v, h):
    """seuil de force appris sur l'année 1 → joué sur l'année 2."""
    r = R[h]; best = None
    a = np.abs(v[y1]); a = a[a >= THR]
    if a.size == 0: return None, None, None
    for q in (0.0, 0.5, 0.8, 0.9, 0.95, 0.99):
        th = float(np.quantile(a, q)) if q > 0 else THR
        t1 = trade(None, r, h, y1, th, v)
        if t1['n'] >= 30 and (best is None or t1['net_pb'] > best[1]['net_pb']): best = (th, t1, q)
    if best is None or best[1]['net_pb'] <= 0: return None, (best[1] if best else None), (best[2] if best else None)
    return trade(None, r, h, y2, best[0], v), best[1], best[2]
# ── fin de la copie ──

def sgn(v): return np.where(np.abs(v) >= THR, np.sign(v), 0.0)

# ── SEUIL z appris sur placebos (règle « SEUIL z ») ──
L = 1 << int(np.ceil(np.log2(2 * T))); DAYS = np.arange(96 * 7, T - 96 * 7, 96)
FR = {h: np.fft.rfft(np.nan_to_num(R[h]), L, axis=0) for h in H}            # [L/2+1, P]
def z_batch(S3):
    """z de rot_z pour un lot de signaux S3 [T, lot, P], tous horizons — même calcul que rot_z (sommé sur les paires en fréquence)."""
    FS = np.conj(np.fft.rfft(S3, L, axis=0))
    out = {}
    for h in H:
        cc = np.fft.irfft((FS * FR[h][:, None, :]).sum(2), L, axis=0)
        lin = np.concatenate([cc[L - (T - 1):], cc[:T]]); rot = lin[T - 1:] + np.concatenate([np.zeros((1, cc.shape[1])), lin[:T - 1]])
        null = rot[DAYS]; out[h] = (rot[0] - null.mean(0)) / null.std(0)
    return out
for k in range(nV):                                                           # contrôle : z_batch = rot_z sur la vraie voix
    s = sgn(V1[:, :, k]); zb = z_batch(s[:, None, :])
    for h in H:
        a, mu, sd, _ = rot_z(s, R[h], h); zr = (a - mu) / sd if sd > 0 else 0.0
        assert abs(zb[h][0] - zr) < 1e-6 * max(1, abs(zr)), f'z_batch ≠ rot_z ({VOICES[k]}, {h})'
rng = np.random.default_rng(20261004)
ALPHA = 0.05 / 16; NPLAC = 1000; LOT = 20
PLAC = {}
for k, vid in enumerate(VOICES):
    v = V1[:, :, k]
    ac = [np.corrcoef(v[:-1, j], v[1:, j])[0, 1] for j in range(nP) if v[:, j].std() > 0]
    phi = float(np.median(ac)); rho = (np.abs(v) >= THR).mean(0)            # persistance (médiane des paires), taux de parole par paire
    zs = {h: [] for h in H}
    for _ in range(NPLAC // LOT):
        e = rng.standard_normal((T, LOT, nP))
        x = lfilter([np.sqrt(1 - phi ** 2)], [1, -phi], e, axis=0)
        q = np.stack([np.quantile(np.abs(x[:, :, j]), 1 - rho[j], axis=0) for j in range(nP)], 1)   # [LOT, P] : même taux de parole que la voix
        s3 = np.where((np.abs(x) >= q[None]) & (rho[None, None, :] > 0), np.sign(x), 0.0)
        for h, z in z_batch(s3).items(): zs[h].append(z)
    PLAC[vid] = dict(phi=phi, taux=[float(a) for a in rho], h={})
    for h in H:
        zz = np.concatenate(zs[h]); df, loc, sc = sst.t.fit(zz, floc=0)
        PLAC[vid]['h'][h] = dict(seuil=max(ZMIN, float(sc * sst.t.ppf(1 - ALPHA, df))), seuil_brut=float(sc * sst.t.ppf(1 - ALPHA, df)),
                                 ecart_type=float(zz.std()), au_dela_3_2=float((zz >= 3.2).mean()), max=float(zz.max()), df=float(df))

def judge(V, k, h):
    v = V[:, :, k]; s = sgn(v)
    act, mu, sd, nd = rot_z(s, R[h], h)
    z = (act - mu) / sd if sd > 0 else 0.0
    a1, a2 = stats(s, R[h], y1), stats(s, R[h], y2)
    w2, w1, q = walk(v, h)
    zth = PLAC[VOICES[k]]['h'][h]['seuil']
    return dict(z=float(z), an1=a1, an2=a2, appris_an1=w1, quantile=q, joue_an2=w2,
                talent=bool(z >= zth and a1['brut_pb'] > 0 and a2['brut_pb'] > 0), rentable=bool(w2 and w2['n'] >= 30 and w2['net_pb'] > 0),
                contresens=bool(z <= -zth))

RD = {}                                                                      # (c) entrée décalée d'une bougie, informatif
for h in H:
    r = np.full((T, nP), np.nan); ok = idx + 1 + h < N
    r[ok] = C[idx[ok] + 1 + h] / C[idx[ok] + 1] - 1; RD[h] = r
def z_decale(V, k, h):
    s = sgn(V[:, :, k]); act, mu, sd, _ = rot_z(s, RD[h], h); return float((act - mu) / sd) if sd > 0 else 0.0

out = dict(token=m1['token'], pairs=PAIRS, periode=[int(ts[0]), int(ts[-1])], placebos=PLAC, voix={}, vue_app={}, commune={},
           couverture={'lecture1': m1['couverture'], 'lecture2': m2['couverture']})
for k, vid in enumerate(VOICES):
    rec = dict(parle=float((np.abs(V1[:, :, k]) >= THR).mean()), parle_l2=float((np.abs(V2[:, :, k]) >= THR).mean()), l1={}, l2={})
    for h in H:
        rec['l1'][h] = judge(V1, k, h); rec['l2'][h] = judge(V2, k, h)
        rec.setdefault('z_entree_decalee', {})[h] = [z_decale(V1, k, h), z_decale(V2, k, h)]
        rec.setdefault('entre', {})[h] = bool(rec['l1'][h]['talent'] and rec['l1'][h]['rentable'] and rec['l2'][h]['talent'] and rec['l2'][h]['rentable'])
    out['voix'][vid] = rec
if BA:
    ma, VA = load(BA); assert ma['vue'] == 'a' and ma['lecture'] == 1 and ma['from'] == FROM and ma['to'] == m1['to']
    for k, vid in enumerate(VOICES[:2]):
        out['vue_app'][vid] = dict(parle=float((np.abs(VA[:, :, k]) >= THR).mean()), h={h: judge(VA, k, h) for h in H})

# TEST 3 — combinaison linéaire (copie de talent_ana.py), informative
def commune(Vc, names):
    nVc = Vc.shape[2]; res = {}
    for h in H:
        r = R[h]
        X1 = Vc[y1].reshape(-1, nVc).astype(np.float64); Y1 = r[y1].reshape(-1)
        ok = np.isfinite(Y1); X1, Y1 = X1[ok], Y1[ok]
        mu_x, sd_x = X1.mean(0), X1.std(0); sd_x[sd_x == 0] = 1
        Z1 = np.hstack([(X1 - mu_x) / sd_x, np.ones((len(X1), 1))])
        lam = 1e-3 * len(Y1); I = np.eye(nVc + 1); I[-1, -1] = 0
        w = np.linalg.solve(Z1.T @ Z1 + lam * I, Z1.T @ Y1)
        Z = np.hstack([(Vc.reshape(-1, nVc).astype(np.float64) - mu_x) / sd_x, np.ones((T * nP, 1))])
        pred = (Z @ w).reshape(T, nP)
        pred = pred - np.mean(pred[y1])
        pz = pred / (np.std(pred[y1]) or 1) * 0.1
        s = np.where(np.abs(pz) >= THR, np.sign(pz), 0.0)
        act, mu, sd, nd = rot_z(np.where(y2[:, None], s, 0.0), np.where(y2[:, None], r, np.nan), h)
        w2, w1, q = walk(pz, h)
        res[h] = dict(poids={names[i]: float(w[i]) for i in range(nVc)}, constante=float(w[-1]), z_an2=float((act - mu) / sd) if sd > 0 else 0.0,
                      an2=stats(s, r, y2), appris_an1=w1, quantile=q, joue_an2=w2)
    return res
def load_tal(bins, carnet):
    mt = [json.load(open(b + '.json')) for b in bins]
    assert mt[0]['to'] == mt[1]['from'] and mt[0]['from'] == FROM and mt[1]['to'] == m1['to'] and not mt[0].get('encours') and mt[0]['pairs'] == PAIRS
    assert all(bool(m.get('carnet')) == carnet for m in mt), 'talent.js : option --carnet inattendue'
    VT = np.concatenate([np.fromfile(b, dtype=np.float32).reshape(-1, nP, len(mt[0]['voices'])) for b in bins]).astype(np.float64)
    assert VT.shape[0] == T
    return VT, list(mt[0]['voices'])
if len(TAL) == 2 and len(TALC) == 2:
    VT, names = load_tal(TAL, False); VC, namesc = load_tal(TALC, True); assert names == namesc
    for k, vid in enumerate(('whale_v1', 'flow_v1')):                     # cohérence : talent.js --carnet = carnet.js lecture 1, au flottant près
        d = np.abs(VC[:, :, names.index(vid)] - V1[:, :, k]).max(); assert d == 0, f'talent.js --carnet ≠ carnet.js pour {vid} ({d})'
    same = [n for n in names if np.array_equal(VT[:, :, names.index(n)], VC[:, :, names.index(n)])]
    out['commune']['inchangees'] = same
    out['commune']['sans'] = commune(VT, names)
    out['commune']['avec'] = commune(np.concatenate([VC, V1[:, :, 2:4]], 2), names + ['carnet_1', 'carnet_5'])
    out['conseils_flux'] = {}
    for vid in [n for n in names if n not in same and n not in ('whale_v1', 'flow_v1')]:
        k = names.index(vid); Vc = VC[:, :, k:k + 1]; Vs = VT[:, :, k:k + 1]
        out['conseils_flux'][vid] = dict(parle=float((np.abs(Vc) >= THR).mean()), avec={}, sans={})
        for h in H:
            for lab, VV in (('avec', Vc), ('sans', Vs)):
                v = VV[:, :, 0]; sg = sgn(v); act, mu, sd, _ = rot_z(sg, R[h], h); w2, w1, q = walk(v, h)
                out['conseils_flux'][vid][lab][h] = dict(z=float((act - mu) / sd) if sd > 0 else 0.0, an1=stats(sg, R[h], y1), an2=stats(sg, R[h], y2), joue_an2=w2)

json.dump(out, open(B1 + '.ana.json', 'w'), indent=1)

def f(x, d=1): return ('+' if x > 0 else '') + f'{x:.{d}f}'
print(f"CARNET · code {m1['token']} · {T} bougies 15 min × {nP} paires · du {np.datetime64(int(ts[0]), 'ms')} au {np.datetime64(int(ts[-1]), 'ms')}")
print(f"coût aller-retour {COST*100:.2f} % · une voix parle si |vote| ≥ {THR} · entrée : TALENT (z ≥ seuil appris, brut > 0 les deux années) ET net an 2 > 0, dans les deux lectures")
print('\nSEUILS z APPRIS (1 000 placebos AR(1) par voix, risque 5 %/16 d\'un côté, jamais sous 3,2)')
for vid, p in PLAC.items():
    print(f"  {vid:9s} φ {p['phi']:.3f} | " + ' | '.join(f"{HN[h]:>6s} seuil {x['seuil']:.2f} (brut {x['seuil_brut']:.2f}, σ {x['ecart_type']:.2f}, ≥ 3,2 : {x['au_dela_3_2']*100:.2f} %)" for h, x in p['h'].items()))
print('\nTEST 1 et 2 — chaque voix seule (brut an 1 / an 2 et net an 2 en points de base par trade)')
for vid, rec in out['voix'].items():
    for lec in ('l1', 'l2'):
        line = f"  {vid:9s} {'lect. 1' if lec == 'l1' else 'lect. 2'} parle {rec['parle' if lec == 'l1' else 'parle_l2']*100:5.1f} %"
        for h, x in rec[lec].items():
            w2 = x['joue_an2']
            line += f" | {HN[h]:>6s} z {f(x['z'])} brut {f(x['an1']['brut_pb'])}/{f(x['an2']['brut_pb'])}" + (' TALENT' if x['talent'] else '') + (' CONTRESENS' if x['contresens'] else '') + \
                    (f" → an2 {w2['n']} tr. net {f(w2['net_pb'])} pb" if w2 else ' → aucun seuil rentable en an1')
        print(line)
    print(f"  {'':9s} entrée décalée d'une bougie (informatif) : " + ' | '.join(f"{HN[h]} z {f(z[0])} / {f(z[1])}" for h, z in rec['z_entree_decalee'].items()))
    print(f"  {'':9s} ENTRE : " + ', '.join(f"{HN[h]} {'OUI' if e else 'non'}" for h, e in rec['entre'].items()))
if out['vue_app']:
    print('\nVUE APP (informative : les seuls trades que garde l\'anti-flood de l\'app, lecture 1)')
    for vid, rec in out['vue_app'].items():
        print(f"  {vid:9s} parle {rec['parle']*100:5.1f} % " + ' '.join(f"| {HN[h]:>6s} z {f(x['z'])} brut {f(x['an1']['brut_pb'])}/{f(x['an2']['brut_pb'])}" + (f" → an2 net {f(x['joue_an2']['net_pb'])} pb" if x['joue_an2'] else ' → aucun seuil rentable en an1') for h, x in rec['h'].items()))
if out.get('conseils_flux'):
    print('\nCONSEILS QUI ÉCOUTENT whale_v1 / flow_v1 (informatif, lecture 1 : sans → avec le flux réel et le carnet)')
    for vid, rec in out['conseils_flux'].items():
        print(f"  {vid:13s} parle {rec['parle']*100:5.1f} % " + ' '.join(f"| {HN[h]:>6s} z {f(rec['sans'][h]['z'])} → {f(rec['avec'][h]['z'])} brut an2 {f(rec['sans'][h]['an2']['brut_pb'])} → {f(rec['avec'][h]['an2']['brut_pb'])}" + (f" net an2 {f(rec['avec'][h]['joue_an2']['net_pb'])}" if rec['avec'][h]['joue_an2'] else ' aucun seuil an1') for h in H))
if out['commune']:
    print('\nTEST 3 — décision commune apprise sur l\'année 1, jouée sur l\'année 2 (sans → avec le flux réel et le carnet)')
    for h in H:
        a, b = out['commune']['sans'][h], out['commune']['avec'][h]
        g = lambda x: (f"an2 {x['joue_an2']['n']} trades, net {f(x['joue_an2']['net_pb'])} pb" if x['joue_an2'] else 'aucun seuil rentable en an1')
        print(f"  {HN[h]:>6s} : sans z an2 {f(a['z_an2'])} brut {f(a['an2']['brut_pb'])} → {g(a)}  ||  avec z an2 {f(b['z_an2'])} brut {f(b['an2']['brut_pb'])} → {g(b)}")
