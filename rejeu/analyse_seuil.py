# [OUTILS · 02/10/2026] VERSION 20261002a · sauvé du bac à sable de la session. Mode d'emploi : PASSATION-AURA8.md, « Démarrage de session », point 8.
# analyse_seuil.py VARIANTE[,VARIANTE] — trades virtuels du seuil appris : par fenêtre, cumulés, par niveau, par régime ; règle rejouée sur le cumul
import json, glob, os, sys, math, collections
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
MIN_N, MIN_B = 30, 10
def ev(obs):
    a = sorted([o for o in obs if o.get('c') is not None and o.get('n') is not None], key=lambda o: -o['c'])
    blk = {}; n = s = A = B = Q = nb = 0; best = near = None
    for i, o in enumerate(a):
        x = o['n']; key = o['b']
        e = blk.get(key)
        if e is None: e = blk[key] = [0.0, 0]; nb += 1
        A += 2 * e[0] * x + x * x; B += e[0] + x * e[1] + x; Q += 2 * e[1] + 1
        e[0] += x; e[1] += 1; n += 1; s += x
        if i + 1 < len(a) and a[i + 1]['c'] == o['c']: continue
        if n < MIN_N or nb < MIN_B: continue
        m = s / n; se = math.sqrt(max(0, A - 2 * m * B + m * m * Q) / (n * n) * (nb / (nb - 1)))
        t = dict(level=o['c'], n=n, blocks=nb, mean=m, se=se, total=s)
        if near is None or m - se > near['mean'] - near['se']: near = t
        if m - se > 0 and (best is None or s > best['total']): best = t
    return best, near
for V in sys.argv[1].split(','):
    allobs = []; print('\n== ' + V)
    for fp in sorted(glob.glob(os.path.join(OUT, V + '_w*.json')), key=lambda f: int(f.rsplit('_w', 1)[1].split('.')[0])):
        w = fp.rsplit('_w', 1)[1].split('.')[0]
        d = json.load(open(fp)); thr = d['result'].get('thr') or {}; obs = thr.get('obs') or []; ru = thr.get('rule') or {}
        for o in obs: o['b'] = 'w%s_%s' % (w, o['b'])   # créneaux distincts d'une fenêtre à l'autre
        allobs += obs
        nb = len(set(o['b'] for o in obs)); m = sum(o['n'] for o in obs) / len(obs) if obs else 0
        hit = sum(1 for o in obs if o['n'] + ru.get('cost', 0.275) > 0) / len(obs) * 100 if obs else 0
        nr = ru.get('near') or {}
        print('w%s  horizon %s bougie(s) | %4d virtuels, %2d créneaux | net moyen %+.3f %% | bon sens %2.0f %% | état %s | le plus proche : ≥%s %+.3f %% ± %.3f (n %s)' % (
            w, ru.get('h'), len(obs), nb, m, hit, 'OUVERT %.2f' % ru['level'] if ru.get('open') else 'fermé', nr.get('level'), nr.get('mean', 0), nr.get('se', 0), nr.get('n')))
    n = len(allobs); m = sum(o['n'] for o in allobs) / n
    print('CUMUL %d trades virtuels, %d créneaux, net moyen %+.3f %%/trade' % (n, len(set(o['b'] for o in allobs)), m))
    for lo, hi in [(0, .05), (.05, .1), (.1, .2), (.2, .3), (.3, .4), (.4, .5), (.5, 2)]:
        q = [o for o in allobs if lo <= o['c'] < hi]
        if q: print('   conviction %.2f-%.2f : %4d, net moyen %+.3f %%, bon sens %2.0f %%' % (lo, min(hi, 1), len(q), sum(o['n'] for o in q) / len(q), sum(1 for o in q if o['n'] + 0.275 > 0) / len(q) * 100))
    for r, lab in (('c', 'calme'), ('o', 'haussier/baissier'), ('v', 'volatil')):
        q = [o for o in allobs if o.get('r') == r]
        if q: print('   %s : %d, net moyen %+.3f %%' % (lab, len(q), sum(o['n'] for o in q) / len(q)))
    best, near = ev(allobs)
    print('   règle rejouée sur le CUMUL : ' + ('OUVERT à %.3f (%+.3f %% ± %.3f, n %d, %d créneaux)' % (best['level'], best['mean'], best['se'], best['n'], best['blocks']) if best else 'fermé') + ((' | le plus proche : ≥%.3f %+.3f %% ± %.3f (n %d, %d créneaux)' % (near['level'], near['mean'], near['se'], near['n'], near['blocks'])) if near else ' | aucun niveau jugeable'))
    # queue haute : les niveaux les plus forts
    for lv in (0.2, 0.3, 0.4, 0.5):
        q = [o for o in allobs if o['c'] >= lv]
        if q: print('   conviction ≥ %.1f : %d virtuels, net moyen %+.3f %%' % (lv, len(q), sum(o['n'] for o in q) / len(q)))
