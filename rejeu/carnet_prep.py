# [CARNET · 04/10/2026] Préparation des données de la porte CARNET (rejeu/carnet_ana.py) — « go carnet » (Rams 04/10).
#  trades : les seaux d'une minute rejoués par carnet_flux.c (rejeu/carnet_get.sh, un fichier par archive) mis bout à bout dans l'ordre du temps →
#           <sortie>/<P>.v.bin (tous les trades) et <P>.a.bin (vue app) ; contrôle : heures strictement croissantes, aucune archive manquante.
#  carnet : chaque photo bookDepth (futures USDT-M) → <sortie>/<P>.ob.npy = [heure (ms, UTC), profondeur bid −1 %, ask +1 %, bid −5 %, ask +5 %]
#           (en pièces ; le pourcentage « -1 » ou « -1.00 » selon l'époque de l'archive est lu comme nombre) ; heures strictement croissantes.
#           PHOTOS ABÎMÉES REJETÉES (relecture indépendante du 04/10 : l'archive contient des jours entiers de profondeur figée ou d'un côté vide,
#           ex. 10–15/10/2025 et 03–11/09/2026 sur les 11 contrats, ETH 30/10–01/12/2025 — 0,24 % des photos en année 1, 3,6 % en année 2) :
#           une photo est retirée si la profondeur cumulée ne croît pas de ±1 % à ±5 % sur un côté (bid1 ≥ bid5 ou ask1 ≥ ask5), ou si un côté
#           vaut moins de 5 % de l'autre à ±1 % ou à ±5 %. Retirée = absente : l'instant suivant lit la dernière photo saine si elle a < 180 s.
# usage : python3 rejeu/carnet_prep.py <dossier données carnet_get.sh> <sortie> [flux|carnet]   (sans 3e argument : les deux)
import sys, os, glob, zipfile, io, csv, calendar, datetime
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
QUOI = sys.argv[3] if len(sys.argv) > 3 else 'flux carnet'
os.makedirs(OUT, exist_ok=True)
PAIRS = ['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'PEPE', 'EUR']
REC = np.dtype([('t', '<i8'), ('buyQ', '<f8'), ('sellQ', '<f8'), ('n', '<f8'), ('bigBuy', '<f8'), ('bigSell', '<f8'), ('bigBuyUsd', '<f8'), ('bigSellUsd', '<f8')])

def names(p):
    y, m, out = 2024, 10, []
    while (y, m) <= (2026, 8):
        out.append(f'{p}USDT-trades-{y}-{m:02d}'); m += 1
        if m > 12: y, m = y + 1, 1
    return out + [f'{p}USDT-trades-2026-09-{d:02d}' for d in range(1, 31)]

for p in PAIRS:
    for view in ('va' if 'flux' in QUOI else ''):
        parts = []
        for nm in names(p):
            if not os.path.exists(os.path.join(SRC, 'fl', p, nm + '.ok')): raise SystemExit(f'{p} : {nm} pas rejoué')
            parts.append(np.fromfile(os.path.join(SRC, 'fl', p, f'{nm}.{view}.bin'), dtype=REC))
        a = np.concatenate(parts)
        assert np.all(np.diff(a['t']) > 0), f'{p} {view} : heures non croissantes'
        a.tofile(os.path.join(OUT, f'{p}.{view}.bin'))
        if view == 'v':
            span = (a['t'][-1] - a['t'][0]) // 60000 + 1
            print(f"{p} trades : {len(a)} minutes avec trades sur {span} ({len(a)/span*100:.2f} %) · {int(a['n'].sum())} trades · gros {int(a['bigBuy'].sum() + a['bigSell'].sum())}", flush=True)
    if p == 'EUR' or 'carnet' not in QUOI: continue
    sym = ('1000PEPE' if p == 'PEPE' else p) + 'USDT'
    rows = []
    for f in sorted(glob.glob(os.path.join(SRC, 'bd', f'{sym}-bookDepth-*.zip'))):
        with zipfile.ZipFile(f) as z:
            for name in z.namelist():
                cur, snap = None, {}
                for r in csv.reader(io.TextIOWrapper(z.open(name), 'utf-8')):
                    if not r or not r[0][:1].isdigit(): continue
                    if r[0] != cur:
                        if cur is not None and all(k in snap for k in (-1.0, 1.0, -5.0, 5.0)): rows.append((tms, snap[-1.0], snap[1.0], snap[-5.0], snap[5.0]))
                        cur, snap = r[0], {}
                        tms = calendar.timegm(datetime.datetime.strptime(cur, '%Y-%m-%d %H:%M:%S').timetuple()) * 1000
                    snap[float(r[1])] = float(r[2])
                if cur is not None and all(k in snap for k in (-1.0, 1.0, -5.0, 5.0)): rows.append((tms, snap[-1.0], snap[1.0], snap[-5.0], snap[5.0]))
    ob = np.array(rows, dtype=np.float64)
    o = np.argsort(ob[:, 0], kind='stable'); ob = ob[o]
    b1, a1, b5, a5 = ob[:, 1], ob[:, 2], ob[:, 3], ob[:, 4]
    bad = (b1 >= b5) | (a1 >= a5) | (np.minimum(b1, a1) < 0.05 * np.maximum(b1, a1)) | (np.minimum(b5, a5) < 0.05 * np.maximum(b5, a5))
    y2 = ob[:, 0] >= 1759276800000
    print(f"{p} carnet : photos abîmées retirées {int(bad.sum())} ({bad.mean()*100:.2f} %) · année 1 {bad[~y2].mean()*100:.2f} % · année 2 {bad[y2].mean()*100:.2f} %", flush=True)
    ob = ob[~bad]
    dup = int((np.diff(ob[:, 0]) == 0).sum())
    if dup: ob = ob[np.concatenate([np.diff(ob[:, 0]) > 0, [True]])]          # même seconde deux fois : la dernière photo
    np.save(os.path.join(OUT, f'{p}.ob.npy'), ob)
    gaps = np.diff(ob[:, 0])
    print(f"{p} carnet : {len(ob)} photos · écart médian {np.median(gaps)/1000:.0f} s · trous > 180 s : {int((gaps > 180000).sum())} ({gaps[gaps > 180000].sum()/3600000:.0f} h) · doublons {dup}", flush=True)
