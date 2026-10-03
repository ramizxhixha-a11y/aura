# [SOURCE · 03/10/2026] Porte TALENT pour les SOURCES NOUVELLES à horizon de plusieurs jours — « go source » (Rams 03/10 02:06).
# Même porte que rejeu/talent_ana.py (mêmes tests, mêmes frais, même seuil z, même partage en deux années), adaptée aux horizons longs.
# Règles fixées AVANT de calculer le moindre vote (écrites ici, non modifiées après) :
#   instants  : décision à la clôture de chaque bougie spot Binance 1 h, du 01/10/2024 00:00 au 30/09/2026 23:00 UTC ; 11 cryptos d'AURA
#               (EUR/USDT exclue : aucune de ces sources ne la concerne) ; entrée à la clôture de la décision, sortie à la clôture de i+h
#   horizons  : 24 h, 3 j, 7 j (24, 72, 168 bougies 1 h) — à 15 min et 1 h les frais dépassent ou égalent le mouvement (rapport TALENT)
#   années    : année 1 = décisions dont la SORTIE tombe avant le 01/10/2025 00:00 UTC (aucun rendement de l'année 2 dans ce qui est appris),
#               année 2 = décisions à partir du 01/10/2025 00:00 UTC
#   lecture 2 : entrée une bougie plus tard (1 h de retard d'exécution). Une source n'entre que si elle passe dans LES DEUX lectures.
#   vote      : une voix « parle » quand |vote| ≥ 0,03 ; sens = signe du vote. Les DEUX sens sont testés (le sens + suit la définition, le sens −
#               la contredit) : 13 sources × 3 horizons × 2 sens = 78 essais ≤ 80 → seuil inchangé z ≥ 3,2 (≈ 1 sur 1 400, 5 % au total)
#   coût      : aller-retour 0,26 % (barème de l'app : taker 0,10 % + glissement 0,03 % par côté), sans levier ni financement
#   TEST 1 — sait-elle quelque chose ? gain brut moyen contre le même signal décalé d'un nombre entier de jours, rotations à 60 jours au moins
#            de chaque côté (fenêtres de 28 j et horizons de 7 j hors de la zone exclue) ; TALENT = |z| ≥ 3,2 ET brut > 0 les deux années dans le
#            sens du z
#   TEST 2 — gagne-t-elle de l'argent ? une position à la fois par paire, tenue h ; seuil de force = quantile 0/50/80/90/95/99 % de |vote|
#            (|vote| ≥ 0,03) APPRIS sur l'année 1 (≥ 30 trades, meilleur net, aucun si aucun n'est positif), joué tel quel sur l'année 2 ;
#            rentable = net > 0 sur l'année 2 avec ≥ 30 trades, dans le sens du z
#   TEST 3 — la combinaison LINÉAIRE des 13 sources (moindres carrés régularisés, sources centrées-réduites) apprise sur l'année 1, jouée sur
#            l'année 2 (même protocole qu'au test 2)
#   ENTRÉE   : TALENT (test 1) ET rentable (test 2), même sens, dans les deux lectures. Sinon la source n'entre pas dans la décision.
#   CALIBRAGE : 50 placebos (bruit persistant AR(1) quotidien φ = 0,95, graine 20261003 : 25 communs aux 11 paires, 25 propres à chaque paire)
#               passent le test 1 dans la lecture 1 (150 essais). Plus de 2 placebos à |z| ≥ 3,2 → porte déclarée NON CALIBRÉE, aucune source admise.
#   SOURCES (construites par rejeu/source_prep.py, rien du futur, délais de publication respectés ; « niveau » = z-score sur les 90 jours
#            précédents, 2 160 bougies 1 h, l'instant compris, vote = clip(z/2, −1, 1) ; « rendement » = r_w / (σ × √w), σ = écart-type des
#            rendements sur 24 h des 90 jours précédents, vote = clip(·/2, −1, 1)) :
#    1 basis7   prime de l'indice futures (premiumIndexKlines 1 h, Binance), moyenne des 168 dernières bougies closes      — niveau, par paire
#    2 oi7      intérêt ouvert en pièces (metrics 5 min, ligne datée T lue à T + 10 min), log-variation sur 7 jours       — niveau, par paire
#    3 smart    log(ratio L/S des POSITIONS des gros comptes) − log(ratio L/S de tous les comptes), moyenne 72 h (metrics) — niveau, par paire
#    4 takerfut log(ratio volume preneur achat / vente des futures), moyenne 72 h (metrics)                                   — niveau, par paire
#    5 futspot  log(volume futures / volume spot en USDT), sommes des 168 dernières bougies 1 h                               — niveau, par paire
#    6 dvol     DVOL BTC (Deribit, volatilité implicite 30 j) − volatilité réalisée BTC 30 j, bougie close                    — niveau, commun
#    7 cbprem   prime Coinbase : BTC-USD Coinbase / (BTCUSDT Binance × USDT-USD Coinbase) − 1, moyenne 24 h                  — niveau, commun
#    8 stables  offre totale des stablecoins (DefiLlama), point du jour J lu à J+1 00:00 UTC, log-variation sur 7 jours        — niveau, commun
#    9 spx5     S&P 500 (FRED SP500), clôture du jour J lue à J+1 00:00 UTC, rendement sur 5 séances, σ des séances           — rendement, commun
#   10 vix      log(VIX) (FRED VIXCLS), clôture du jour J lue à J+1 00:00 UTC                                                 — niveau, commun
#   11 tsmom28  rendement propre de la paire sur 28 jours                                                                     — rendement, par paire
#   12 tsmom7   rendement propre de la paire sur 7 jours                                                                      — rendement, par paire
#   13 xsmom28  rendement 28 j de la paire moins la moyenne des 11, divisé par leur écart-type (vote = clip(·/2, −1, 1))      — par paire
#   Donnée manquante ou trop vieille (sources horaires > 6 h, quotidiennes > 4 jours) → vote 0 (la voix se tait).
#   RELECTURE INDÉPENDANTE (agent séparé, 03/10, après le 1er passage — verdict du 1er passage : aucune source ; aucune règle assouplie) :
#     (a) métriques : la ligne datée T (photo à T + 5 min) n'est publiée que 2 à 3 min plus tard (mesuré en direct) → lue à T + 10 min ;
#     (b) test 2 : sens joué sur l'année 2 = sens du brut de l'année 1 (avant : sens du z, calculé sur les deux années ; l'admission, qui
#         exigeait déjà un brut > 0 en année 1 dans le sens du z, n'en dépend pas) ;
#     (c) seuil z APPRIS par horizon sur 2 000 placebos (1 000 communs aux 11 paires, 1 000 propres à chaque paire ; loi de Student ajustée
#         à chaque famille, risque 5 % / 39 des deux côtés), jamais sous 3,2 : les 610 rotations se chevauchent et épaississent les queues
#         (0,42 % au-delà de 3,2 au lieu de 0,14 %), ce que 50 placebos ne pouvaient pas voir ;
#     (d) test 2 : ≥ 30 JOURS d'entrée distincts (une source commune ouvre les 11 paires le même jour : 11 trades pour un seul pari) ;
#     (e) test 3 : rotation sur l'année 2 seule.
# usage : python3 rejeu/source_ana.py <dossier votes (source_prep.py)> > rapport.txt   (écrit aussi <dossier>/source_ana.json)
import sys, json, os
import numpy as np

D = sys.argv[1]
meta = json.load(open(os.path.join(D, 'meta.json')))
TS = np.load(os.path.join(D, 'ts.npy'))                     # ouverture de chaque bougie 1 h (ms)
C = np.load(os.path.join(D, 'close.npy')).astype(np.float64)  # [N, P] clôtures spot
V = np.load(os.path.join(D, 'votes.npy')).astype(np.float64)  # [N, P, S] votes (0 = se tait)
PAIRS, SRC = meta['pairs'], meta['sources']; nP, nS = len(PAIRS), len(SRC)
N = len(TS); HOUR = 3600000; DAY = 24
H = [24, 72, 168]; HN = {24: '24 h', 72: '3 j', 168: '7 j'}
COST = 0.0026; THR = 0.03; ZMIN = 3.2; EXCL_D = 60
START, YCUT, END = 1727740800000, 1759276800000, 1790812800000   # 01/10/2024, 01/10/2025, 01/10/2026 00:00 UTC
td = TS + HOUR                                                  # instant de décision = clôture de la bougie
I = np.where((td >= START) & (td < END))[0]; T = len(I)
assert np.all(np.diff(TS) == HOUR), 'grille 1 h non continue'
V = np.nan_to_num(V[I])                                         # [T, P, S]
TDI = td[I]

def returns(h, lag):
    r = np.full((T, nP), np.nan)
    a, b = I + lag, I + lag + h
    ok = b < N
    r[ok] = C[b[ok]] / C[a[ok]] - 1
    return r

R = {(h, lag): returns(h, lag) for h in H for lag in (0, 1)}
def years(h, lag):
    exit_t = td[I] + (h + lag) * HOUR
    return exit_t <= YCUT, td[I] >= YCUT
Y = {(h, lag): years(h, lag) for h in H for lag in (0, 1)}

def rot_z(s, r):
    """gain brut du signal s contre r, comparé aux rotations d'un nombre entier de jours (≥ EXCL_D jours de chaque côté)."""
    r0 = np.nan_to_num(r); n = len(r0)
    L = 1 << int(np.ceil(np.log2(2 * n)))
    tot = None
    for j in range(s.shape[1]):
        fs = np.fft.rfft(s[:, j], L); fr = np.fft.rfft(r0[:, j], L)
        cc = np.fft.irfft(np.conj(fs) * fr, L)
        lin = np.concatenate([cc[L - (n - 1):], cc[:n]])
        rot = lin[n - 1:] + np.concatenate([[0], lin[:n - 1]])
        tot = rot if tot is None else tot + rot
    days = np.arange(DAY * EXCL_D, n - DAY * EXCL_D, DAY)
    null = tot[days]
    sd = null.std()
    return float((tot[0] - null.mean()) / sd) if sd > 0 else 0.0

def stats(s, r, mask):
    m = mask[:, None] & (s != 0) & np.isfinite(r)
    g = (s * r)[m]
    return dict(n=int(m.sum()), brut_pb=float(g.mean() * 1e4) if g.size else 0.0, juste=float((g > 0).mean()) if g.size else 0.0)

def trade(v, r, h, mask, thr_abs):
    """une position à la fois par paire, tenue h bougies, après frais ; ne prend que |v| ≥ thr_abs (et ≥ 0,03)."""
    pnl, days = [], set()
    for j in range(nP):
        ev = np.where(mask & (np.abs(v[:, j]) >= max(THR, thr_abs)) & np.isfinite(r[:, j]))[0]
        k = 0
        while k < len(ev):
            e = ev[k]; pnl.append(np.sign(v[e, j]) * r[e, j] - COST); days.add(int(TDI[e] // 86400000))
            k = int(np.searchsorted(ev, e + h, side='left'))
    pnl = np.array(pnl)
    return dict(n=int(pnl.size), jours=len(days), net_pb=float(pnl.mean() * 1e4) if pnl.size else 0.0,
                total_100=float(pnl.sum() * 100) if pnl.size else 0.0, gagnants=float((pnl > 0).mean()) if pnl.size else 0.0)

def walk(v, h, lag):
    """seuil de force appris sur l'année 1 → joué tel quel sur l'année 2."""
    r = R[(h, lag)]; y1, y2 = Y[(h, lag)]; best = None
    a = np.abs(v[y1]); a = a[a >= THR]
    if a.size == 0: return None, None, None
    for q in (0.0, 0.5, 0.8, 0.9, 0.95, 0.99):
        th = float(np.quantile(a, q)) if q > 0 else THR
        t1 = trade(v, r, h, y1, th)
        if t1['jours'] >= 30 and (best is None or t1['net_pb'] > best[1]['net_pb']): best = (th, t1, q)
    if best is None or best[1]['net_pb'] <= 0: return None, (best[1] if best else None), (best[2] if best else None)
    best[1]['seuil_abs'] = best[0]                                     # seuil figé (réplique)
    return trade(v, r, h, y2, best[0]), best[1], best[2]

def judge(v, h, lag):
    """tests 1 et 2 pour un vote v [T, P] : sens = signe du z ; renvoie le dossier complet."""
    r = R[(h, lag)]; y1, y2 = Y[(h, lag)]
    s = np.where(np.abs(v) >= THR, np.sign(v), 0.0)
    z = rot_z(s, r)
    d = 1.0 if z > 0 else -1.0
    a1, a2 = stats(d * s, r, y1), stats(d * s, r, y2)
    d1 = 1.0 if stats(s, r, y1)['brut_pb'] > 0 else -1.0          # (b) sens appris sur l'année 1 seule
    w2, w1, q = walk(d1 * v, h, lag)
    return dict(z=z, sens='+' if d > 0 else '−', sens_an1='+' if d1 > 0 else '−', an1=a1, an2=a2, appris_an1=w1, quantile=q, joue_an2=w2,
                talent=bool(abs(z) >= ZTH[h] and a1['brut_pb'] > 0 and a2['brut_pb'] > 0),
                rentable=bool(w2 is not None and w2['jours'] >= 30 and w2['net_pb'] > 0 and d1 == d))

MOVE = {h: float(np.nanmedian(np.abs(R[(h, 0)]))) for h in H}
out = dict(token=meta.get('token'), pairs=PAIRS, sources=SRC, periode=[int(td[I][0]), int(td[I][-1])], mouvement_median=MOVE,
           sources_res={}, commune={}, placebos={})

# CALIBRAGE (c) — 2 000 placebos par horizon (lecture 1, test 1) → seuil z appris, jamais sous 3,2
from scipy import stats as sst
rng = np.random.default_rng(20261003)
nd = int(np.ceil(T / DAY)) + 1; LF = 1 << int(np.ceil(np.log2(2 * T))); DAYS = np.arange(DAY * EXCL_D, T - DAY * EXCL_D, DAY)
def ar1(k):
    x = np.empty((nd, k)); x[0] = rng.standard_normal(k)
    for t in range(1, nd): x[t] = 0.95 * x[t - 1] + np.sqrt(1 - 0.95 ** 2) * rng.standard_normal(k)
    return np.repeat(x, DAY, 0)[:T]
def z_of(prod):
    cc = np.fft.irfft(prod, LF, axis=0)
    lin = np.concatenate([cc[LF - (T - 1):], cc[:T]]); rot = lin[T - 1:] + np.concatenate([np.zeros((1,) + lin.shape[1:]), lin[:T - 1]])
    null = rot[DAYS]; return (rot[0] - null.mean(0)) / null.std(0)
def sgn(x): x = np.clip(x / 2, -1, 1); return np.where(np.abs(x) >= THR, np.sign(x), 0.0)
ALPHA = 0.05 / 39; ZTH = {}; PZ = {}
for h in H:
    FR = np.fft.rfft(np.nan_to_num(R[(h, 0)]), LF, axis=0); FRS = FR.sum(1)
    zc = np.concatenate([z_of(np.conj(np.fft.rfft(sgn(ar1(100)), LF, axis=0)) * FRS[:, None]) for _ in range(10)])
    zp = []
    for _ in range(40):
        S = sgn(ar1(25 * nP)).reshape(T, 25, nP)
        zp.append(z_of((np.conj(np.fft.rfft(S, LF, axis=0)) * FR[:, None, :]).sum(2)))
    zp = np.concatenate(zp); thr = []
    for zz in (zc, zp):
        df, loc, sc = sst.t.fit(zz, floc=0); thr.append(float(sc * sst.t.ppf(1 - ALPHA / 2, df)))
    ZTH[h] = max(ZMIN, *thr); PZ[h] = dict(communs=dict(au_dela_3_2=float((np.abs(zc) >= 3.2).mean()), seuil=thr[0], ecart_type=float(zc.std())),
                                           par_paire=dict(au_dela_3_2=float((np.abs(zp) >= 3.2).mean()), seuil=thr[1], ecart_type=float(zp.std())),
                                           seuil_retenu=ZTH[h])
out['placebos'] = PZ

for k, sid in enumerate(SRC):
    v = V[:, :, k]
    rec = dict(parle=float((np.abs(v) >= THR).mean()), h={})
    for h in H:
        l1, l2 = judge(v, h, 0), judge(v, h, 1)
        rec['h'][h] = dict(lecture1=l1, lecture2=l2,
                           entre=bool(l1['talent'] and l1['rentable'] and l2['talent'] and l2['rentable'] and l1['sens'] == l2['sens']))
    out['sources_res'][sid] = rec

# TEST 3 — combinaison linéaire apprise sur l'année 1, jouée sur l'année 2 (lecture 1)
for h in H:
    r = R[(h, 0)]; y1, y2 = Y[(h, 0)]
    X1 = V[y1].reshape(-1, nS); Y1 = r[y1].reshape(-1)
    ok = np.isfinite(Y1); X1, Y1 = X1[ok], Y1[ok]
    mu_x, sd_x = X1.mean(0), X1.std(0); sd_x[sd_x == 0] = 1
    Z1 = np.hstack([(X1 - mu_x) / sd_x, np.ones((len(X1), 1))])
    lam = 1e-3 * len(Y1); Id = np.eye(nS + 1); Id[-1, -1] = 0
    w = np.linalg.solve(Z1.T @ Z1 + lam * Id, Z1.T @ Y1)
    pred = (np.hstack([(V.reshape(-1, nS) - mu_x) / sd_x, np.ones((T * nP, 1))]) @ w).reshape(T, nP)
    pm = float(np.mean(pred[y1])); pred = pred - pm
    ps = float(np.std(pred[y1]) or 1); pzv = pred / ps * 0.1
    s = np.where(np.abs(pzv) >= THR, np.sign(pzv), 0.0)
    z2 = rot_z(s[y2], r[y2])                                          # (e) année 2 seule
    w2, w1, q = walk(pzv, h, 0)
    out['commune'][h] = dict(poids={SRC[i]: float(w[i]) for i in range(nS)}, fige=dict(mu=mu_x.tolist(), sd=sd_x.tolist(), w=w.tolist(), pm=pm, ps=ps), z_an2=z2, an2=stats(s, r, y2), appris_an1=w1, quantile=q, joue_an2=w2)

json.dump(out, open(os.path.join(D, 'source_ana.json'), 'w'), indent=1, default=str)

def f(x, d=1): return ('+' if x > 0 else '') + f'{x:.{d}f}'
print(f"SOURCE · {T} bougies 1 h × {nP} cryptos · décisions du {np.datetime64(int(td[I][0]), 'ms')} au {np.datetime64(int(td[I][-1]), 'ms')} UTC")
print(f"coût aller-retour {COST*100:.2f} % · parle si |vote| ≥ {THR} · talent : |z| ≥ seuil appris (≥ {ZMIN}) et brut > 0 les deux années · deux sens, deux lectures")
print('mouvement médian : ' + ' · '.join(f"{HN[h]} {MOVE[h]*100:.2f} % (frais = {COST/MOVE[h]*100:.0f} %)" for h in H))
for h in H:
    p = PZ[h]
    print(f"CALIBRAGE {HN[h]:>4s} : 2 000 placebos · au-delà de |z| 3,2 : communs {p['communs']['au_dela_3_2']*100:.2f} %, par paire {p['par_paire']['au_dela_3_2']*100:.2f} % "
          f"(0,14 % attendu) · seuil appris {p['communs']['seuil']:.2f} / {p['par_paire']['seuil']:.2f} → retenu |z| ≥ {p['seuil_retenu']:.2f}")
print("\nTESTS 1 et 2 — chaque source seule (z signé, brut dans le sens du z ; test 2 dans le sens appris sur l'année 1 ; pb par trade ; total = année 2, 100 $ par trade)")
for sid, rec in out['sources_res'].items():
    line = f"  {sid:9s} parle {rec['parle']*100:5.1f} %"
    for h, x in rec['h'].items():
        for nm, l in (('L1', x['lecture1']), ('L2', x['lecture2'])):
            w2 = l['joue_an2']
            line += (f"\n      {HN[h]:>5s} {nm} z {f(l['z'])} brut {f(l['an1']['brut_pb'])}/{f(l['an2']['brut_pb'])}" + (' TALENT' if l['talent'] else '')
                     + (f" → sens {l['sens_an1']} an2 {w2['n']} tr. / {w2['jours']} j net {f(w2['net_pb'])} pb ({f(w2['total_100'],0)} $)" if w2 else ' → aucun seuil rentable en an1'))
        if x['entre']: line += f"\n      {HN[h]:>5s} ⇒ ENTRE (sens {x['lecture1']['sens']})"
    print(line)
print("\nTEST 3 — combinaison linéaire des 13 sources apprise sur l'année 1, jouée sur l'année 2 (lecture 1)")
for h, x in out['commune'].items():
    w2 = x['joue_an2']
    print(f"  {HN[h]:>5s} : z an2 {f(x['z_an2'])} · brut an2 {f(x['an2']['brut_pb'])} pb ({x['an2']['juste']*100:.1f} % justes)"
          + (f" → an2 {w2['n']} trades / {w2['jours']} j, net {f(w2['net_pb'])} pb/trade ({f(w2['total_100'],0)} $)" if w2 else " → aucun seuil rentable sur l'année 1"))
adm = [f"{s} ({HN[h]}, sens {x['lecture1']['sens']})" for s, rec in out['sources_res'].items() for h, x in rec['h'].items() if x['entre']]
print('\nVERDICT : ' + ('ENTRENT — ' + ', '.join(adm) if adm else 'aucune source n\'entre dans la décision'))
