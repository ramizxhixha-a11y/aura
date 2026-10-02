# [TALENT · 03/10/2026] Préparation des VRAIES données Binance pour rejeu/talent.js (« go talent », Rams 02/10 23:39).
# Archives publiques data.binance.vision (téléchargées par rejeu/talent_get.sh) → un JSON par paire, aligné sur la grille 15 min :
#   k : bougies spot 15 min [ts, o, h, l, c, v (monnaie de base, le vrai volume), n (nombre de trades), tb (volume pris à l'achat)]
#   x : à la CLÔTURE de chaque bougie (instant de la décision), ce que l'app pouvait lire à cet instant, rien du futur :
#       flow  = déséquilibre preneur des 5 dernières minutes (bougie 5 min close à la clôture) : (achat − vente) / total, et son nombre de trades
#       fund  = dernier financement RÉGLÉ (%/période), connu à la clôture (l'app lit le taux annoncé de la période en cours : écart noté au rapport)
#       oi2h  = variation de l'intérêt ouvert sur 2 h (%), comme 02 (openInterestHist 15 min, 9 points) ; ls = ratio long/short des comptes — dernière ligne
#               de métriques CLOSE à la décision (datée ≤ clôture − 5 min : la ligne datée T couvre [T, T+5 min), vérifié contre le flux spot)
#   fng : Fear & Greed quotidien (alternative.me), valeur du jour connue à 00:00 UTC
# usage : python3 rejeu/talent_prep.py <dossier données> <dossier sortie>
import sys, os, glob, zipfile, io, json, csv, bisect

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
PAIRS = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'PEPE', 'EUR']
M15, M5 = 900000, 300000

def ms(v):
    v = int(float(v))
    return v // 1000 if v > 10**14 else v          # archives spot depuis 01/2025 : microsecondes

def rows(path):
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            for r in csv.reader(io.TextIOWrapper(z.open(name), 'utf-8')):
                if not r or not r[0][:1].isdigit():
                    continue                       # en-tête éventuel
                yield r

def klines(pat):
    d = {}
    for f in sorted(glob.glob(pat)):
        for r in rows(f):
            d[ms(r[0])] = r
    return d

fng = sorted((int(e['timestamp']) * 1000, int(e['value'])) for e in json.load(open(os.path.join(SRC, 'fng.json')))['data'])
json.dump(fng, open(os.path.join(OUT, 'fng.json'), 'w'))

for p in PAIRS:
    k15 = klines(os.path.join(SRC, 'k15', f'{p}USDT-15m-*.zip'))
    k5 = klines(os.path.join(SRC, 'k5', f'{p}USDT-5m-*.zip'))
    fund = []
    for f in sorted(glob.glob(os.path.join(SRC, 'fund', f'*{p}USDT-fundingRate-*.zip'))):
        for r in rows(f):
            fund.append((ms(r[0]), float(r[2]) * 100))          # calc_time, last_funding_rate → %
    fund.sort(); fts = [a for a, _ in fund]
    met = []
    for f in sorted(glob.glob(os.path.join(SRC, 'metrics', f'*{p}USDT-metrics-*.zip'))):
        with zipfile.ZipFile(f) as z:
            for name in z.namelist():
                rd = csv.DictReader(io.TextIOWrapper(z.open(name), 'utf-8'))
                for r in rd:
                    try:
                        from datetime import datetime, timezone
                        t = int(datetime.strptime(r['create_time'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc).timestamp() * 1000)
                        oi = float(r['sum_open_interest']) if r.get('sum_open_interest') else None
                        ls = float(r['count_long_short_ratio']) if r.get('count_long_short_ratio') else None
                        met.append((t, oi, ls))
                    except Exception:
                        pass
    met.sort(); mts = [a for a, _, _ in met]
    ts = sorted(k15)
    K, X = [], []
    for t0 in ts:
        r = k15[t0]
        K.append([t0, float(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[5]), int(float(r[8])), float(r[9])])
        tc = t0 + M15                                            # clôture = instant de la décision
        x = {}
        r5 = k5.get(tc - M5)
        if r5:
            v, tb = float(r5[5]), float(r5[9])
            x['flow'] = round((2 * tb - v) / v, 5) if v > 0 else 0
            x['fn'] = int(float(r5[8]))
        i = bisect.bisect_right(fts, tc) - 1
        if i >= 0 and tc - fts[i] <= 9 * 3600000:
            x['fund'] = round(fund[i][1], 6)
        j = bisect.bisect_right(mts, tc - 300000) - 1             # une ligne de métriques datée T décrit [T, T+5 min) (relecture du 03/10) : dernière ligne close à la décision
        if j >= 0 and tc - mts[j] <= 30 * 60000:
            jt = bisect.bisect_right(mts, mts[j] - 2 * 3600000) - 1
            if met[j][1] and jt >= 0 and met[jt][1] and abs((mts[j] - mts[jt]) - 2 * 3600000) <= 10 * 60000:
                x['oi2h'] = round((met[j][1] - met[jt][1]) / met[jt][1] * 100, 3)
            if met[j][2]:
                x['ls'] = round(met[j][2], 4)
        X.append(x)
    json.dump({'pair': p + '/USDT', 'k': K, 'x': X}, open(os.path.join(OUT, p + '.json'), 'w'))
    gaps = sum(1 for a, b in zip(ts, ts[1:]) if b - a != M15)
    print(p, 'bougies', len(K), 'du', ts[0], 'au', ts[-1], 'trous', gaps, '· flux', sum('flow' in x for x in X), '· fin.', sum('fund' in x for x in X), '· oi', sum('oi2h' in x for x in X), '· ls', sum('ls' in x for x in X))
