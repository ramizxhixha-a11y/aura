# [TALENT · 03/10/2026] Analyse du rejeu des voix (rejeu/talent.js) — « go talent » (Rams 02/10).
# Règles fixées AVANT de lire les résultats (écrites ici, non modifiées après) :
#   instant : décision à la clôture de la bougie i, entrée à ce prix, sortie à la clôture de i+h ; horizons h = 1, 4, 16, 96 bougies (15 min, 1 h, 4 h, 24 h)
#   une voix « parle » quand |vote| ≥ 0,03 (seuil de la décision commune) ; sens = signe du vote
#   coût aller-retour = 0,26 % : barème de l'app (02 : taker 0,10 % + glissement 0,03 % par côté, 10e6 _roundTripCostPct, sans levier ni financement)
#   TEST 1 — le signal sait-il quelque chose ? gain brut moyen par signal, comparé au même signal décalé d'un nombre entier de jours (rotation :
#            même proportion d'achats / ventes, même rythme, mais plus en phase avec le marché — la dérive du marché ne compte pas pour un talent).
#            z = écart au hasard en écarts-types ; seuil de talent z ≥ 3,2 (≈ 1 sur 1 400 : 20 voix × 4 horizons = 80 essais, 5 % au total)
#            ET brut > 0 les DEUX années (10/2024–09/2025 et 10/2025–09/2026).
#   TEST 2 — gagne-t-il de l'argent ? une position à la fois par paire et par voix, tenue h bougies, après frais ; le seuil de force (quantile de
#            |vote|) est APPRIS sur l'année 1 (le meilleur net de l'année 1, aucun si aucun n'est positif) puis appliqué tel quel à l'année 2.
#            Talent rentable = net > 0 sur l'année 2 (jamais vue au réglage).
#   TEST 3 — la décision commune la mieux apprise : combinaison linéaire des 20 voix (moindres carrés régularisés) réglée sur l'année 1,
#            jouée sur l'année 2 avec le même protocole. Si elle ne gagne pas, aucune pesée LINÉAIRE de ces voix ne crée de talent (relecture 03/10 :
#            le test ne couvre pas les combinaisons non linéaires).
# usage : python3 rejeu/talent_ana.py <dossier données> <votes1.bin> [votes2.bin …] > rapport.txt   (écrit aussi <votes1>.ana.json)
import sys, json, os
import numpy as np

DATA, BINS = sys.argv[1], sys.argv[2:]
metas = [json.load(open(b + '.json')) for b in BINS]
m0 = metas[0]; PAIRS, VOICES = m0['pairs'], m0['voices']; nP, nV = len(PAIRS), len(VOICES)
V = np.concatenate([np.fromfile(b, dtype=np.float32).reshape(-1, nP, nV) for b in BINS])
FROM = m0['from']; T = V.shape[0]
for a, b in zip(metas, metas[1:]): assert a['to'] == b['from'], 'tranches non contiguës'
C, TS = [], None
for p in PAIRS:
    d = json.load(open(os.path.join(DATA, p.split('/')[0] + '.json')))
    k = np.array(d['k'], dtype=np.float64)
    C.append(k[:, 4]); TS = k[:, 0] if TS is None else TS
C = np.stack(C, 1)                                  # [N, P] clôtures
N = C.shape[0]
H = [1, 4, 16, 96]; HN = {1: '15 min', 4: '1 h', 16: '4 h', 96: '24 h'}
COST = 0.0026; THR = 0.03; ZMIN = 3.2
YCUT = 1759276800000                               # 01/10/2025 00:00 UTC
idx = np.arange(FROM, FROM + T)
ts = TS[idx]; y1 = ts + 900000 < YCUT; y2 = ~y1
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

MOVE = {h: float(np.nanmedian(np.abs(R[h][:, [j for j, p in enumerate(PAIRS) if p != 'EUR/USDT']]))) for h in H}
out = {'mouvement_median_11_cryptos': MOVE, 'token': m0['token'], 'pairs': PAIRS, 'periode': [int(ts[0]), int(ts[-1])], 'voix': {}, 'commune': {}}
print(f"TALENT · code {m0['token']} · {T} bougies 15 min × {nP} paires · du {np.datetime64(int(ts[0]), 'ms')} au {np.datetime64(int(ts[-1]), 'ms')} · génomes : {m0.get('genome')}")
print(f"coût aller-retour {COST*100:.2f} % · une voix parle si |vote| ≥ {THR} · talent : z ≥ {ZMIN} et brut > 0 les deux années")
print('mouvement médian (11 cryptos, sans EUR) : ' + ' · '.join(f"{HN[h]} {MOVE[h]*100:.2f} % (frais = {COST/MOVE[h]*100:.0f} %)" for h in H) + (' · bougie en cours lue' if m0.get('encours') else ' · bougies closes'))
for k, vid in enumerate(VOICES):
    v = V[:, :, k].astype(np.float64)
    s = np.where(np.abs(v) >= THR, np.sign(v), 0.0)
    parle = float((s != 0).mean())
    rec = {'parle': parle, 'h': {}}
    for h in H:
        if parle == 0: break
        act, mu, sd, nd = rot_z(s, R[h], h)
        z = (act - mu) / sd if sd > 0 else 0.0
        a1, a2 = stats(s, R[h], y1), stats(s, R[h], y2)
        w2, w1, q = walk(v, h)
        rec['h'][h] = dict(z=float(z), an1=a1, an2=a2, appris_an1=w1, quantile=q, joue_an2=w2,
                           talent=bool(z >= ZMIN and a1['brut_pb'] > 0 and a2['brut_pb'] > 0), rentable=bool(w2 and w2['n'] >= 30 and w2['net_pb'] > 0))
    out['voix'][vid] = rec

# TEST 3 — décision commune apprise (moindres carrés régularisés sur l'année 1, poids par horizon), jouée sur l'année 2
for h in H:
    r = R[h]
    X1 = V[y1].reshape(-1, nV).astype(np.float64); Y1 = r[y1].reshape(-1)
    ok = np.isfinite(Y1); X1, Y1 = X1[ok], Y1[ok]
    mu_x, sd_x = X1.mean(0), X1.std(0); sd_x[sd_x == 0] = 1          # voix centrées-réduites sur l'année 1, constante comprise
    Z1 = np.hstack([(X1 - mu_x) / sd_x, np.ones((len(X1), 1))])
    lam = 1e-3 * len(Y1); I = np.eye(nV + 1); I[-1, -1] = 0
    w = np.linalg.solve(Z1.T @ Z1 + lam * I, Z1.T @ Y1)
    Z = np.hstack([(V.reshape(-1, nV).astype(np.float64) - mu_x) / sd_x, np.ones((T * nP, 1))])
    pred = (Z @ w).reshape(T, nP)
    pred = pred - np.mean(pred[y1])                                    # le sens vient de l'écart à la moyenne de l'année 1
    pz = pred / (np.std(pred[y1]) or 1) * 0.1        # échelle : écart-type de l'année 1 = 0,1 (le seuil 0,03 garde ~75 % des instants)
    s = np.where(np.abs(pz) >= THR, np.sign(pz), 0.0)
    act, mu, sd, nd = rot_z(np.where(y2[:, None], s, 0.0), np.where(y2[:, None], r, np.nan), h)
    w2, w1, q = walk(pz, h)
    out['commune'][h] = dict(poids={VOICES[i]: float(w[i]) for i in range(nV)}, constante=float(w[-1]), z_an2=float((act - mu) / sd) if sd > 0 else 0.0,
                             an2=stats(s, r, y2), appris_an1=w1, quantile=q, joue_an2=w2)

json.dump(out, open(BINS[0] + '.ana.json', 'w'), indent=1)

def f(x, d=1): return ('+' if x > 0 else '') + f'{x:.{d}f}'
print('\nTEST 1 et 2 — chaque voix seule (brut et net en points de base par trade ; total = gain cumulé de l\'année 2 avec 100 $ par trade, après frais)')
for vid, rec in out['voix'].items():
    if rec['parle'] == 0:
        print(f"  {vid:15s} ne parle jamais sur ces données"); continue
    line = f"  {vid:15s} parle {rec['parle']*100:5.1f} %"
    for h, x in rec['h'].items():
        w2 = x['joue_an2']
        line += f" | {HN[h]:>6s} z {f(x['z'])} brut {f(x['an1']['brut_pb'])}/{f(x['an2']['brut_pb'])}" + (' TALENT' if x['talent'] else '') + \
                (f" → an2 {w2['n']} tr. net {f(w2['net_pb'])} pb ({f(w2['total_100'],0)} $)" if w2 else ' → aucun seuil rentable en an1')
    print(line)
print('\nTEST 3 — décision commune apprise sur l\'année 1, jouée sur l\'année 2')
for h, x in out['commune'].items():
    w2 = x['joue_an2']
    print(f"  {HN[h]:>6s} : z an2 {f(x['z_an2'])} · brut an2 {f(x['an2']['brut_pb'])} pb ({x['an2']['juste']*100:.1f} % justes)" +
          (f" → an2 {w2['n']} trades, net {f(w2['net_pb'])} pb/trade ({f(w2['total_100'],0)} $)" if w2 else ' → aucun seuil rentable sur l\'année 1'))
