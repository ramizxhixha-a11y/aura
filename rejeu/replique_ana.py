# [RÉPLIQUE · 04/10/2026] Joue les 5 hypothèses PRÉ-ENREGISTRÉES de rejeu/source_fige.json (« go source », 03/10) sur la période de réplique
# 01/10/2021 → 30/09/2024 (décisions), jamais utilisée par la découverte — « go réplique » (Rams 04/10 01:21).
# Règles = celles écrites dans source_fige.json le 03/10, AVANT toute donnée de la période (rien n'est réappris ici) :
#   mêmes définitions (rejeu/source_prep.py --replique), mêmes frais 0,26 %, lecture 1 (entrée à la clôture de la décision) et lecture 2
#   (entrée 1 h plus tard) ; chaque hypothèse garde son sens, son horizon et son seuil de force figés ; la combinaison garde ses poids et sa
#   normalisation (mu, sd, w, pm, ps) ; risque 5 % / 5 d'un seul côté par hypothèse → seuil z appris sur 2 000 placebos de la période de
#   réplique (même fabrique que rejeu/source_ana.py : 1 000 communs aux 11 paires, 1 000 propres à chaque paire, AR(1) quotidien φ = 0,95,
#   graine 20261003, loi de Student ajustée à chaque famille, la plus sévère des deux retenue), jamais sous 2,33 ;
#   RÉPLIQUÉE = z ≥ seuil (dans le sens figé) ET brut > 0 ET net > 0 avec ≥ 30 jours d'entrée distincts, dans LES DEUX lectures.
#   Tests et fonctions (rotations ≥ 60 j, gain brut, une position à la fois par paire) copiés tels quels de rejeu/source_ana.py.
#   Les découpes par année (10/2021–09/2022, 10/2022–09/2023, 10/2023–09/2024) et « toujours acheteur » sont INFORMATIVES (hors verdict).
# Contrôle d'application (--verif) : les mêmes paramètres figés, appliqués aux votes de la découverte (source_prep.py sans --replique),
#   doivent redonner les chiffres « decouverte » inscrits dans source_fige.json. Bloquant : le chemin joué (net et jours d'entrée de
#   l'année 2), qui utilise TOUS les paramètres figés (sens, seuil, normalisation et poids) — s'il diffère, le verdict n'est pas affiché.
#   z et brut sont affichés avec leur écart : ils dépendent aussi du millésime des données (archives publiées après le 03/10).
#   --coupe <ms> : clôtures retirées à partir de cet instant (l'archive spot du 02/10/2026 n'a été publiée que le 03/10 à 02:18 UTC,
#   après le téléchargement de la découverte : --coupe 1790899200000).
# usage : python3 rejeu/replique_ana.py <votes réplique> [--verif <votes découverte> [--coupe <ms>]]   (écrit <votes réplique>/replique_ana.json)
import sys, json, os
import numpy as np
from scipy import stats as sst

FIGE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'source_fige.json')))
HOUR = 3600000; DAY = 24; COST = 0.0026; THR = 0.03; EXCL_D = 60
ZMIN_R, ALPHA_R = 2.33, 0.05 / 5
R_START, R_END = 1633046400000, 1727740800000                     # décisions du 01/10/2021 00:00 au 30/09/2024 23:00 UTC
D_START, D_YCUT, D_END = 1727740800000, 1759276800000, 1790812800000
YEARS = [('10/2021–09/2022', 1633046400000, 1664582400000), ('10/2022–09/2023', 1664582400000, 1696118400000),
         ('10/2023–09/2024', 1696118400000, 1727740800000)]
HN = {24: '24 h', 72: '3 j', 168: '7 j'}

def load(D, start, end):
    meta = json.load(open(os.path.join(D, 'meta.json')))
    TS = np.load(os.path.join(D, 'ts.npy')); C = np.load(os.path.join(D, 'close.npy')).astype(np.float64)
    V = np.load(os.path.join(D, 'votes.npy')).astype(np.float64)
    assert np.all(np.diff(TS) == HOUR), 'grille 1 h non continue'
    td = TS + HOUR; I = np.where((td >= start) & (td < end))[0]
    return dict(meta=meta, C=C, V=np.nan_to_num(V[I]), I=I, td=td, TDI=td[I], N=len(TS), T=len(I), nP=C.shape[1], R={})

def returns(x, h, lag):                                           # = source_ana.returns
    if (h, lag) not in x['R']:
        I, C, N = x['I'], x['C'], x['N']; r = np.full((x['T'], x['nP']), np.nan)
        a, b = I + lag, I + lag + h; ok = b < N
        r[ok] = C[b[ok]] / C[a[ok]] - 1; x['R'][(h, lag)] = r
    return x['R'][(h, lag)]

def rot_z(s, r):                                                  # = source_ana.rot_z
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

def stats(s, r, mask):                                            # = source_ana.stats
    m = mask[:, None] & (s != 0) & np.isfinite(r)
    g = (s * r)[m]
    return dict(n=int(m.sum()), brut_pb=float(g.mean() * 1e4) if g.size else 0.0, juste=float((g > 0).mean()) if g.size else 0.0)

def trade(v, r, h, mask, thr_abs, TDI):                           # = source_ana.trade
    pnl, days = [], set()
    for j in range(v.shape[1]):
        ev = np.where(mask & (np.abs(v[:, j]) >= max(THR, thr_abs)) & np.isfinite(r[:, j]))[0]
        k = 0
        while k < len(ev):
            e = ev[k]; pnl.append(np.sign(v[e, j]) * r[e, j] - COST); days.add(int(TDI[e] // 86400000))
            k = int(np.searchsorted(ev, e + h, side='left'))
    pnl = np.array(pnl)
    return dict(n=int(pnl.size), jours=len(days), net_pb=float(pnl.mean() * 1e4) if pnl.size else 0.0,
                total_100=float(pnl.sum() * 100) if pnl.size else 0.0, gagnants=float((pnl > 0).mean()) if pnl.size else 0.0)

def vote(x, hy):
    """vote figé de l'hypothèse [T, P], dans le sens figé (+ : la définition ; − : son contraire)."""
    src = x['meta']['sources']
    if 'sources' in hy:                                           # combinaison : normalisation et poids de l'année 1 de la découverte
        assert hy['sources'] == src, 'ordre des sources différent de la découverte'
        f = hy['fige']; T, nP, nS = x['T'], x['nP'], len(src)
        mu, sd, w = np.array(f['mu']), np.array(f['sd']), np.array(f['w'])
        pred = (np.hstack([(x['V'].reshape(-1, nS) - mu) / sd, np.ones((T * nP, 1))]) @ w).reshape(T, nP)
        v = (pred - f['pm']) / f['ps'] * 0.1
    else:
        v = x['V'][:, :, src.index(hy['source'])]
    return v if hy['sens'] == '+' else -v

def sig(v): return np.where(np.abs(v) >= THR, np.sign(v), 0.0)
def nom(hy): return f"{hy['source']} {HN[hy['horizon_h']]}"
def f1(v, d=1): return ('+' if v > 0 else '') + f'{v:.{d}f}'

# ── CONTRÔLE D'APPLICATION : les paramètres figés redonnent-ils la découverte ? ──
VERIF = None
if '--verif' in sys.argv:
    xd = load(sys.argv[sys.argv.index('--verif') + 1], D_START, D_END); VERIF = []
    if '--coupe' in sys.argv:
        ts_ = xd['td'] - HOUR; xd['C'][ts_ >= int(sys.argv[sys.argv.index('--coupe') + 1])] = np.nan
    for hy in FIGE['hypotheses']:
        h = hy['horizon_h']; r = returns(xd, h, 0); v = vote(xd, hy); s = sig(v)
        y1 = xd['TDI'] + h * HOUR <= D_YCUT; y2 = xd['TDI'] >= D_YCUT
        t2 = trade(v, r, h, y2, hy['seuil_abs'], xd['TDI'])
        if 'sources' in hy:
            got = dict(z_an2=rot_z(s[y2], r[y2]), brut_an2=stats(s, r, y2)['brut_pb'], net_an2=t2['net_pb'], jours_an2=t2['jours'])
        else:
            got = dict(z=rot_z(s, r), brut_an1=stats(s, r, y1)['brut_pb'], brut_an2=stats(s, r, y2)['brut_pb'], net_an2=t2['net_pb'], jours_an2=t2['jours'])
        ecart = {k: abs(got[k] - hy['decouverte'][k]) for k in got}
        same = {k: e <= 1e-6 * max(1.0, abs(hy['decouverte'][k])) for k, e in ecart.items()}
        VERIF.append(dict(hypothese=nom(hy), recalcule=got, fige=hy['decouverte'], ecart_max=max(ecart.values()),
                          identique=all(same.values()), chemin_joue=bool(same['net_an2'] and same['jours_an2'])))

# ── RÉPLIQUE ──
x = load(sys.argv[1], R_START, R_END)
assert x['meta'].get('periode') == 'replique', 'votes de la réplique attendus (source_prep.py --replique)'
T, nP, TDI = x['T'], x['nP'], x['TDI']; ALL = np.ones(T, bool)
HS = sorted({hy['horizon_h'] for hy in FIGE['hypotheses']})

rng = np.random.default_rng(20261003)                             # fabrique de placebos de source_ana.py, période de réplique
nd = int(np.ceil(T / DAY)) + 1; LF = 1 << int(np.ceil(np.log2(2 * T))); DAYS = np.arange(DAY * EXCL_D, T - DAY * EXCL_D, DAY)
def ar1(k):
    a = np.empty((nd, k)); a[0] = rng.standard_normal(k)
    for t in range(1, nd): a[t] = 0.95 * a[t - 1] + np.sqrt(1 - 0.95 ** 2) * rng.standard_normal(k)
    return np.repeat(a, DAY, 0)[:T]
def z_of(prod):
    cc = np.fft.irfft(prod, LF, axis=0)
    lin = np.concatenate([cc[LF - (T - 1):], cc[:T]]); rot = lin[T - 1:] + np.concatenate([np.zeros((1,) + lin.shape[1:]), lin[:T - 1]])
    null = rot[DAYS]; return (rot[0] - null.mean(0)) / null.std(0)
def sgnp(a): a = np.clip(a / 2, -1, 1); return np.where(np.abs(a) >= THR, np.sign(a), 0.0)
ZTH, PZ = {}, {}
for h in HS:
    FR = np.fft.rfft(np.nan_to_num(returns(x, h, 0)), LF, axis=0); FRS = FR.sum(1)
    zc = np.concatenate([z_of(np.conj(np.fft.rfft(sgnp(ar1(100)), LF, axis=0)) * FRS[:, None]) for _ in range(10)])
    zp = []
    for _ in range(40):
        S = sgnp(ar1(25 * nP)).reshape(T, 25, nP)
        zp.append(z_of((np.conj(np.fft.rfft(S, LF, axis=0)) * FR[:, None, :]).sum(2)))
    zp = np.concatenate(zp); thr = []
    for zz in (zc, zp):
        df, loc, sc = sst.t.fit(zz, floc=0); thr.append(float(sc * sst.t.ppf(1 - ALPHA_R, df)))
    ZTH[h] = max(ZMIN_R, *thr)
    PZ[h] = dict(communs=dict(au_dela_2_33=float((zc >= 2.33).mean()), seuil=thr[0]), par_paire=dict(au_dela_2_33=float((zp >= 2.33).mean()), seuil=thr[1]),
                 seuil_retenu=ZTH[h])

MOVE = {h: float(np.nanmedian(np.abs(returns(x, h, 0)))) for h in HS}
LONG = {h: float(np.nanmean(returns(x, h, 0)) * 1e4) for h in HS}  # « toujours acheteur » : gain brut moyen par pari (informatif)
res = []
for hy in FIGE['hypotheses']:
    h = hy['horizon_h']; v = vote(x, hy); s = sig(v); rec = dict(hypothese=nom(hy), sens=hy['sens'], seuil_abs=hy['seuil_abs'],
                                                                   parle=float((s != 0).mean()), lectures={}, annees={})
    for lag, nm in ((0, 'lecture1'), (1, 'lecture2')):
        r = returns(x, h, lag); z = rot_z(s, r); b = stats(s, r, ALL); t = trade(v, r, h, ALL, hy['seuil_abs'], TDI)
        rec['lectures'][nm] = dict(z=z, brut=b, joue=t, ok=bool(z >= ZTH[h] and b['brut_pb'] > 0 and t['net_pb'] > 0 and t['jours'] >= 30))
    r = returns(x, h, 0)
    for an, a, b_ in YEARS:
        m = (TDI >= a) & (TDI < b_)
        rec['annees'][an] = dict(brut=stats(s, r, m), joue=trade(v, r, h, m, hy['seuil_abs'], TDI),
                                 toujours_acheteur_pb=float(np.nanmean(r[m]) * 1e4))
    rec['repliquee'] = bool(rec['lectures']['lecture1']['ok'] and rec['lectures']['lecture2']['ok'])
    res.append(rec)

out = dict(token=x['meta'].get('token'), periode=[int(TDI[0]), int(TDI[-1])], fige=FIGE['date'], placebos=PZ, seuil_z=ZTH,
           mouvement_median=MOVE, toujours_acheteur_pb=LONG, verif=VERIF, hypotheses=res)
json.dump(out, open(os.path.join(sys.argv[1], 'replique_ana.json'), 'w'), indent=1, default=str)

print(f"RÉPLIQUE · {T} bougies 1 h × {nP} cryptos · décisions du {np.datetime64(int(TDI[0]), 'ms')} au {np.datetime64(int(TDI[-1]), 'ms')} UTC · règles figées le {FIGE['date']}")
if VERIF is not None:
    ok = all(v_['chemin_joue'] for v_ in VERIF)
    print(f"CONTRÔLE D'APPLICATION (paramètres figés rejoués sur la découverte) : chemin joué {'IDENTIQUE' if ok else 'ÉCART'} · "
          f"{sum(v_['identique'] for v_ in VERIF)}/{len(VERIF)} hypothèses identiques sur tous les chiffres")
    for v_ in VERIF:
        print(f"  {v_['hypothese']:13s} " + ' · '.join(f"{k} {v_['recalcule'][k]:.4f} (figé {v_['fige'][k]:.4f})" for k in v_['recalcule']))
    if not ok: print('→ verdict non affiché : l\'application des paramètres figés ne redonne pas la découverte'); sys.exit(1)
for h in HS:
    p = PZ[h]
    print(f"CALIBRAGE {HN[h]:>4s} : 2 000 placebos · z ≥ 2,33 : communs {p['communs']['au_dela_2_33']*100:.2f} %, par paire {p['par_paire']['au_dela_2_33']*100:.2f} % "
          f"(1 % attendu) · seuil appris {p['communs']['seuil']:.2f} / {p['par_paire']['seuil']:.2f} → retenu z ≥ {ZTH[h]:.2f}"
          f" · mouvement médian {MOVE[h]*100:.2f} % · toujours acheteur {f1(LONG[h])} pb brut par pari")
print("\nHYPOTHÈSES FIGÉES (z dans le sens figé · brut = tous les instants où la voix parle · joué = seuil figé, une position à la fois, après frais)")
for rec in res:
    print(f"  {rec['hypothese']:13s} parle {rec['parle']*100:5.1f} %")
    for nm, l in rec['lectures'].items():
        t = l['joue']
        print(f"      {'L1' if nm == 'lecture1' else 'L2'} z {f1(l['z'], 2)} · brut {f1(l['brut']['brut_pb'])} pb ({l['brut']['juste']*100:.1f} % justes) · "
              f"joué {t['n']} tr. / {t['jours']} j, net {f1(t['net_pb'])} pb/trade ({f1(t['total_100'], 0)} $ à 100 $ par trade)" + (' ✓' if l['ok'] else ''))
    print('      par année (L1, informatif) : ' + ' · '.join(f"{an} brut {f1(a['brut']['brut_pb'])} / net {f1(a['joue']['net_pb'])} pb ({a['joue']['n']} tr.), "
                                                     f"acheteur {f1(a['toujours_acheteur_pb'])}" for an, a in rec['annees'].items()))
    print(f"      ⇒ {'RÉPLIQUÉE' if rec['repliquee'] else 'non répliquée'}")
rep_ = [r_['hypothese'] for r_ in res if r_['repliquee']]
print('\nVERDICT : ' + ('RÉPLIQUÉE(S) — ' + ', '.join(rep_) + ' → mission d\'intégration comme voix de l\'app (puis rejeu/talent.js)' if rep_
                     else 'aucune hypothèse répliquée → fin de la recherche de sources publiques à plusieurs jours'))
