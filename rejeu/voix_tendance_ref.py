# [VOIX TENDANCE LONGUE · 07/10/2026] RÉFÉRENCE INDÉPENDANTE de la poche de js/15-voix-tendance.js, écrite depuis la règle, sans lire le module.
# Prix du lundi : chargeur de la porte (rejeu/tendance_longue.py, partie au-dessus de « # ---- 1. ») — la même table P que le verdict.
# Plus hauts horaires : lus ici dans les mêmes archives (colonne 3), pour la liquidation d'un SHORT (plus haut ≥ 2 × entrée, heures closes
# à partir de l'heure qui suit l'entrée).
# Forme TENUE (celle de l'app) : une position par paire, entrée au prix du lundi 00:00 UTC, tenue jusqu'au retournement, coût
# 0,13 % par côté, mise 1/11 non composée ; un SHORT liquidé (une heure close dont le plus haut double l'entrée) perd toute sa mise
# et n'est rouvert qu'au lundi suivant si le signal le dit.
# usage : python3 -I rejeu/voix_tendance_ref.py <données de portage_get.sh 2018-08 2026-09> [--fixture banc-fixtures/voix-tendance-btc-eth.json]
#   écrit <données>/voix_tendance_ref.json (signaux de la porte par lundi et par paire + trades attendus + totaux)
import sys, os, io, json, zipfile, datetime
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
D = sys.argv[1]
FIX = sys.argv[sys.argv.index('--fixture') + 1] if '--fixture' in sys.argv else None
src = open(os.path.join(HERE, 'tendance_longue.py'), encoding='utf-8').read()
sys.argv = ['x', D]
exec(src.split('# ---- 1. ')[0])          # P, PAIRS, NP, DAY0, DAY, NDAYS, MON, J0, J1, C0, C1, T, iso, rows, SIDE_A
H = 3600000
HI = {}
for j, p in enumerate(PAIRS):
    hs = {}
    for f in sorted(x for x in os.listdir(os.path.join(D, 'spot1h')) if x.startswith(p + 'USDT-1h-')):
        for r in rows(os.path.join(D, 'spot1h', f)):
            t = int(r[0]); t = t // 1000 if t > 1e14 else t
            hs[t] = float(r[2])
    ts = np.array(sorted(hs)); HI[j] = (ts, np.array([hs[t] for t in ts]))
def first_liq(j, t_from, t_to, x0):
    """première heure CLOSE (ouverte dans [t_from, t_to − 1 h]) dont le plus haut ≥ 2 × x0, sinon None"""
    ts, hi = HI[j]
    a, b = np.searchsorted(ts, t_from, 'left'), np.searchsorted(ts, t_to - H, 'right')
    k = np.nonzero(hi[a:b] >= 2 * x0)[0]
    return int(ts[a + k[0]]) if len(k) else None
SIDE = SIDE_A
mons = [d for d in MON if J0 <= DAY0 + d * DAY < C1]
sig = {p: [] for p in PAIRS}
trades = []; pos = {}
def close(j, t1, x1, why, liq=False):
    s, x0, t0, w0 = pos.pop(j)
    r = -1.0 if liq else max(-1.0, s * (x1 / x0 - 1))
    c = 0.0 if liq else 2 * SIDE
    trades.append(dict(p=PAIRS[j], s=int(s), w0=w0, t0=t0, x0=x0, t1=t1, x1=x1, net=max(-1.0, r - c), why=why))
for d in mons:
    w = DAY0 + d * DAY
    for j in range(NP):
        if j in pos and pos[j][0] < 0:                     # liquidation pendant la semaine écoulée (heures closes avant w)
            tl = first_liq(j, pos[j][2] // H * H + H, w, pos[j][1])   # l'heure d'entrée n'est pas relue (le module la couvre au prix en direct)
            if tl is not None: close(j, max(tl, pos[j][2]), 2 * pos[j][1], 'liquidation', True)
        pw, pl = P[d, j], (P[d - 28, j] if d >= 28 else np.nan)
        s = float(np.sign(pw / pl - 1)) if np.isfinite(pw) and np.isfinite(pl) else None
        sig[PAIRS[j]].append([w, None if not np.isfinite(pw) else float(pw), None if not np.isfinite(pl) else float(pl), s])
        if s is None: continue
        cur = pos.get(j)
        if cur and cur[0] == s: continue
        if cur: close(j, w, pw, 'retournement' if s != 0 else 'signal nul')
        if s != 0: pos[j] = (s, pw, w, w)
def tot(t0, t1):
    sel = [x for x in trades if t0 <= x['t1'] < t1]
    return sum(x['net'] for x in sel) / NP, len(sel)
out = dict(regle='forme tenue, lundi 00:00 UTC, 28 j, coût 0,13 %/côté, liquidation SHORT à 2×, mise 1/11',
           pairs=PAIRS, mondays=len(mons), signals=sig, trades=trades, open={PAIRS[j]: list(v) for j, v in pos.items()},
           jugement=tot(J0, J1), controle=tot(C0, C1), tout=tot(J0, C1))
json.dump(out, open(os.path.join(D, 'voix_tendance_ref.json'), 'w'), ensure_ascii=False)
liq = [x for x in trades if x['why'] == 'liquidation']
print(f"référence : {len(mons)} lundis · {len(trades)} trades fermés · jugement net {out['jugement'][0]*100:+.1f} % ({out['jugement'][1]} trades) · "
      f"contrôle {out['controle'][0]*100:+.1f} % · liquidations {len(liq)} : " + ', '.join(f"{x['p']} {iso(x['t0'])}→{iso(x['t1'])}" for x in liq))
if FIX:   # fixture du banc : BTC et ETH, lundis 10/2018 → 09/2026, prix du lundi et de 28 j avant, trades attendus (hors liquidation : aucune)
    keep = ['BTC', 'ETH']
    fx = dict(source='rejeu/voix_tendance_ref.py sur les archives Binance 1 h (porte TENDANCE LONGUE)', side=SIDE,
              prices={p: {str(int(w)): v for (w, pw, pl, s) in sig[p] for (w, v) in ((w, pw), (w - 28 * DAY, pl)) if v is not None} for p in keep},
              mondays=[int(x[0]) for x in sig['BTC']],
              signals={p: [x[3] for x in sig[p]] for p in keep},
              trades=[x for x in trades if x['p'] in keep], open={p: list(pos[PAIRS.index(p)]) for p in keep if PAIRS.index(p) in pos})
    assert not any(x['why'] == 'liquidation' for x in fx['trades'])
    json.dump(fx, open(FIX, 'w'), separators=(',', ':'))
    print('fixture', FIX, os.path.getsize(FIX), 'octets')
