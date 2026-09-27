# analyse_voix.py — les voix du système valent-elles quelque chose, seules et ensemble ?
# Entrée : sorties du rejeu observé (out/<variante>_s<graine>_w<k>.json, result.obs / obsMerit).
# Pour chaque observation (paire, minute), le futur vient du MÊME chemin de prix que le rejeu (bougies 15 m réelles du backup k,
# chemin o → bas → haut → c ou o → haut → bas → c, seconde par seconde) : premier franchissement de ±1 ATR, et rendement à 60 min.
# Coût d'un aller-retour : 0,26 % (taker 0,1 % ×2 + glissement 0,03 % ×2, barème de l'app).
import json, sys, glob, math, collections, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
pat = sys.argv[1] if len(sys.argv) > 1 else 'f_s1'
COST = 0.0026
files = sorted(glob.glob(os.path.join(OUT, pat + '_w*.json')))
CUR = {1: '20260915-180411', 2: '20260917-001039', 3: '20260919-122220', 4: '20260920-213058', 5: '20260921-212447', 6: '20260922-155605', 7: '20260923-123512', 8: '20260925-194758', 9: 'cbc5da64'}

def load_candles(k):
    f = glob.glob('/mnt/user-data/uploads/aura_guardian_full_%s.json' % CUR[k]) or glob.glob('/root/.claude/uploads/81cc7bc3-c277-5d7b-a23b-a43db24c04a8/%s*.json' % CUR[k])
    a = json.load(open(f[0]))['aura']
    return {p: {c['ts']: c for c in v.get('15m', [])} for p, v in (a.get('realCandles') or {}).items()}

def price_at(cs, t):
    ts = t - t % 900000; k = cs.get(ts)
    if not k: return None
    f = (t - ts) / 900000.0; up = k['c'] >= k['o']; a = k['l'] if up else k['h']; b = k['h'] if up else k['l']
    if f < 1/3: return k['o'] + (a - k['o']) * f * 3
    if f < 2/3: return a + (b - a) * (f - 1/3) * 3
    return b + (k['c'] - b) * (f - 2/3) * 3

rows = []   # (k, t, pair, feats..., outcome)
for fp in files:
    k = int(fp.rsplit('_w', 1)[1].split('.')[0])
    d = json.load(open(fp)); r = d['result']
    if not r.get('obs'): continue
    C = load_candles(k); tEnd = d['tEnd']
    AG = r['obsAgents']; mer = r['obsMerit']; mi = 0
    for o in r['obs']:
        while mi + 1 < len(mer) and mer[mi + 1]['t'] <= o['t']: mi += 1
        m = mer[mi]
        cs = C.get(o['p']);
        if not cs: continue
        px = o['px']; a = o['atr']
        if not (a > 0): continue
        up, dn = px * (1 + a), px * (1 - a); fp_ = 0; t = o['t'] + 1000
        while t < tEnd:
            q = price_at(cs, t)
            if q is None: break
            if q >= up: fp_ = 1; break
            if q <= dn: fp_ = -1; break
            t += 1000
        q60 = price_at(cs, o['t'] + 3600000) if o['t'] + 3600000 < tEnd else None
        r60 = (q60 / px - 1) if q60 else None
        rows.append(dict(k=k, t=o['t'], p=o['p'], atr=a, P=o['P'], comp=o['at'] * 0.6 + o['af'] * 0.4, b=o['b'], bm=o['bm'], v=o['v'], la=o['la'],
                         agE=[x[0] for x in m['ag']], agN=[x[1] for x in m['ag']], agF=[x[2] for x in m['ag']], bE=[x[0] for x in m['bots']], bN=[x[1] for x in m['bots']], fp=fp_, r60=r60, AG=AG))
print('observations', len(rows), 'fenêtres', sorted(set(x['k'] for x in rows)))

def evalsig(name, fn, bins=(0, 0.05, 0.1, 0.2, 0.3, 0.5, 1.01), sub15=False):
    B = collections.OrderedDict((b, [0, 0, 0, 0.0, 0]) for b in bins[:-1])   # n, hit, miss, sum dir*r60, n60
    for x in rows:
        if sub15 and (x['t'] % 900000) != 0: continue
        s = fn(x)
        if s is None or s == 0: continue
        d = 1 if s > 0 else -1; st = abs(s)
        for i in range(len(bins) - 1):
            if bins[i] <= st < bins[i + 1]:
                c = B[bins[i]]; c[0] += 1
                if x['fp'] == d: c[1] += 1
                elif x['fp'] == -d: c[2] += 1
                if x['r60'] is not None: c[3] += d * x['r60']; c[4] += 1
                break
    out = []
    for b, c in B.items():
        if c[0] == 0: continue
        hr = c[1] / max(1, c[1] + c[2]); m60 = c[3] / c[4] if c[4] else float('nan')
        out.append('|s|≥%.2f n=%d juste %.0f%% r60 %+.3f%% net %+.3f%%' % (b, c[0], hr * 100, m60 * 100, (m60 - COST) * 100))
    print('\n' + name + (' (1/15 min)' if sub15 else '')); [print('   ' + l) for l in out]

def cons(x, mode):
    num = den = 0.0
    for i, v in enumerate(x['v']):
        if x['agN'][i] < 5: continue
        E = x['agE'][i]
        w = max(0.0, E) if mode == 'merit' else (x['agF'][i] / 350.0 if mode == 'fit' else 1.0)
        num += w * v; den += w
    if mode in ('merit', 'merit+bots'):
        pass
    return num / den if den > 0 else 0.0

def cons_bots(x):
    num = den = 0.0
    for i, v in enumerate(x['v']):
        if x['agN'][i] < 5: continue
        w = max(0.0, x['agE'][i]); num += w * v; den += w
    for j in range(3):
        if x['bN'][j] < 5: continue
        w = max(0.0, x['bE'][j]) * (x['bm'][j] or 1.0); num += w * x['b'][j]; den += max(0.0, x['bE'][j])
    return num / den if den > 0 else 0.0

evalsig('LMSR (P − 0,5)×2 — signal du Scalper', lambda x: (x['P'] - 0.5) * 2)
evalsig('Composite (technique 60 % + fondamental 40 %)', lambda x: x['comp'])
evalsig('Agents, poids = fitness (comme aujourd\'hui)', lambda x: cons(x, 'fit'))
evalsig('Agents, poids = bilan positif seulement (E+)', lambda x: cons(x, 'merit'))
evalsig('Décision commune : agents + bots, poids = bilan (E+) × hybrides', cons_bots)
evalsig('Brain actuel (0,3 composite + 0,5 agents + 0,2 LMSR)', lambda x: 0.3 * x['comp'] + 0.5 * cons(x, 'fit') + 0.2 * (x['P'] - 0.5) * 2)
evalsig('Dernière action du cerveau (buy/sell)', lambda x: 1 if x['la'] == 'buy' else (-1 if x['la'] == 'sell' else 0), bins=(0, 1.01))
for j, n in enumerate(['Scalper', 'Arbitrage', 'DCA']): evalsig('Bot ' + n, lambda x, j=j: x['b'][j], bins=(0, 1.01))
evalsig('Décision commune (1 obs / 15 min)', cons_bots, sub15=True)
# chaque agent seul
AG = rows[0]['AG'] if rows else []
print('\nAgents seuls (vote ≠ 0) : juste % au premier franchissement ±1 ATR')
for i, a in enumerate(AG):
    h = m = n = 0
    for x in rows:
        v = x['v'][i]
        if abs(v) < 0.05: continue
        d = 1 if v > 0 else -1; n += 1
        if x['fp'] == d: h += 1
        elif x['fp'] == -d: m += 1
    if n: print('   %-16s n=%5d juste %.0f%%' % (a, n, 100 * h / max(1, h + m)))

# ── Le bilan des agents mesure-t-il la PRÉVISION ou le RÉTROVISEUR ? ──
# rétroviseur : sens du vote = sens du mouvement des 15 DERNIÈRES minutes (déjà vu) ; prévision : premier franchissement ±1 ATR APRÈS.
print('\nAgents : rétroviseur (mouvement déjà vu, 15 min) vs prévision (±1 ATR après) — et leur bilan affiché (E moyen)')
cache = {}
def cand(k):
    if k not in cache: cache[k] = load_candles(k)
    return cache[k]
tot_h = tot_hn = tot_f = tot_fn = 0
agrow = []
for i, a in enumerate(AG):
    hh = hn = fh = fn = 0; Es = []
    for x in rows:
        v = x['v'][i]
        if abs(v) < 0.05: continue
        d = 1 if v > 0 else -1
        cs = cand(x['k']).get(x['p']); q0 = price_at(cs, x['t'] - 900000) if cs else None; q1 = price_at(cs, x['t']) if cs else None
        if q0 and q1 and abs(q1 / q0 - 1) > 0.0005:
            hn += 1; hh += 1 if (q1 > q0) == (d > 0) else 0
        if x['fp'] != 0:
            fn += 1; fh += 1 if x['fp'] == d else 0
        if x['agN'][i] >= 5: Es.append(x['agE'][i])
    if hn and fn:
        agrow.append((a, 100 * hh / hn, 100 * fh / fn, sum(Es) / len(Es) if Es else float('nan'), fn))
        tot_h += hh; tot_hn += hn; tot_f += fh; tot_fn += fn
for a, h, f, e, n in sorted(agrow, key=lambda r: -r[3] if r[3] == r[3] else 9):
    print('   %-16s rétroviseur %3.0f%%  prévision %3.0f%%  bilan affiché E %+.2f  (n %d)' % (a, h, f, e, n))
if tot_hn: print('   TOUS : rétroviseur %.1f%%  prévision %.1f%%' % (100 * tot_h / tot_hn, 100 * tot_f / tot_fn))
# corrélation bilan affiché ↔ prévision
xs = [r[3] for r in agrow if r[3] == r[3]]; ys = [r[2] for r in agrow if r[3] == r[3]]
if len(xs) > 3:
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    cov = sum((a - mx) * (b - my) for a, b in zip(xs, ys)); vx = sum((a - mx) ** 2 for a in xs); vy = sum((b - my) ** 2 for b in ys)
    print('   corrélation (bilan affiché E, taux de prévision) entre agents : %.2f' % (cov / math.sqrt(vx * vy) if vx > 0 and vy > 0 else float('nan')))
