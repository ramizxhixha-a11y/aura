#!/bin/sh
# [SOURCE · 03/10/2026] Télécharge les VRAIES données des 13 sources de rejeu/source_ana.py (« go source », Rams 03/10 02:06).
# Binance (data.binance.vision, archives publiques ; api.binance.com / fapi.binance.com répondent 451 au bac à sable) : bougies spot et
# futures 1 h, prime de l'indice futures 1 h, métriques futures 5 min (intérêt ouvert, ratios long / short, volume preneur) ;
# Deribit (DVOL BTC 1 h) ; Coinbase (BTC-USD et USDT-USD 1 h) ; DefiLlama (offre des stablecoins) ; FRED (S&P 500, VIX).
# 05/2024 → 09/2026 (5 mois de chauffe avant le 01/10/2024 : fenêtres de 28 j + 90 j), + 1er et 2 octobre 2026 (bougies spot) pour les
# sorties des dernières décisions. Le mois pas encore publié en mensuel est complété par les archives quotidiennes. Rien de ceci n'entre
# dans le dépôt.
# usage : sh rejeu/source_get.sh <dossier données> [replique]
# [RÉPLIQUE · 04/10/2026] 2e argument « replique » : même téléchargement pour la période de réplique pré-enregistrée (rejeu/source_fige.json) —
# 05/2021 → 10/2024 (5 mois de chauffe avant le 01/10/2021, octobre 2024 pour les sorties des dernières décisions) ; sans argument :
# même période qu'avant (le dernier passage ci-dessous s'applique aux deux).
set -e
D=${1:?dossier}; PER=${2:-decouverte}; export PER; mkdir -p "$D/spot" "$D/fut" "$D/prem" "$D/metrics" "$D/ext"; cd "$D"; rm -f urls.txt miss.txt miss2.txt absents.txt echecs.txt
python3 - <<'EOF' > urls.txt
import calendar, os
REP = os.environ.get('PER') == 'replique'
pairs = "BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE".split()
B = "https://data.binance.vision/data"
months = ([(y, m) for y in range(2021, 2025) for m in range(1, 13) if (2021, 5) <= (y, m) <= (2024, 10)] if REP else
          [(y, m) for y in (2024, 2025, 2026) for m in range(1, 13) if (2024, 5) <= (y, m) <= (2026, 9)])
for p in pairs:
    fp = ('1000PEPE' if p == 'PEPE' else p) + 'USDT'
    for y, m in months:
        mo = f"{y}-{m:02d}"
        print(f"{B}/spot/monthly/klines/{p}USDT/1h/{p}USDT-1h-{mo}.zip spot")
        print(f"{B}/futures/um/monthly/klines/{fp}/1h/{fp}-1h-{mo}.zip fut")
        print(f"{B}/futures/um/monthly/premiumIndexKlines/{fp}/1h/{fp}-1h-{mo}.zip prem")
        for day in range(1, calendar.monthrange(y, m)[1] + 1):
            print(f"{B}/futures/um/daily/metrics/{fp}/{fp}-metrics-{y}-{m:02d}-{day:02d}.zip metrics")
    for day in (() if REP else (1, 2)):
        print(f"{B}/spot/daily/klines/{p}USDT/1h/{p}USDT-1h-2026-10-{day:02d}.zip spot")
EOF
xargs -P 24 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0 $1" >> miss.txt' < urls.txt
if [ -s miss.txt ]; then
  grep '/monthly/' miss.txt | python3 -c "
import sys, calendar, re
for l in sys.stdin:
    u, d = l.split(); y, m = map(int, re.search(r'-(\d{4})-(\d{2})\.zip$', u).groups())
    for day in range(1, calendar.monthrange(y, m)[1] + 1):
        print(u.replace('/monthly/', '/daily/').replace(f'-{y}-{m:02d}.zip', f'-{y}-{m:02d}-{day:02d}.zip'), d)
" > urls2.txt
  xargs -P 24 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0" >> miss2.txt' < urls2.txt
fi
# [RÉPLIQUE · 04/10/2026] dernier passage : un fichier n'est déclaré absent que si l'archive répond 404. Sous 24 téléchargements parallèles,
# des échecs passagers étaient comptés « absents » (04/10 : 3 jours de métriques ratés au 1er passage, tous présents en archive ; le 03/10,
# DOGE 2 j, AVAX 1 j et LINK 1 j déclarés absents — le 04/10 aucun jour de métriques 10/2024–09/2026 ne répond 404 : échecs passagers probables).
python3 - <<'EOF'
import os, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
dest = lambda u: 'metrics' if '/metrics/' in u else 'prem' if 'premiumIndexKlines' in u else 'spot' if '/spot/' in u else 'fut'
urls = set()
if os.path.exists('miss.txt'): urls |= {l.split()[0] for l in open('miss.txt') if '/daily/' in l}   # mensuels : remplacés par leurs quotidiens
if os.path.exists('miss2.txt'): urls |= {l.split()[0] for l in open('miss2.txt')}
def fetch(u):
    f = os.path.join(dest(u), os.path.basename(u))
    if os.path.exists(f) and os.path.getsize(f) > 0: return 'ok'
    for k in range(6):
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'aura-rejeu'}), timeout=60).read()
            open(f, 'wb').write(data); return 'ok'
        except urllib.error.HTTPError as e:
            if e.code == 404: return 'absent'
        except Exception: pass
        time.sleep(2 + 2 * k)
    return 'echec'
with ThreadPoolExecutor(12) as ex: res = dict(zip(sorted(urls), ex.map(fetch, sorted(urls))))
open('absents.txt', 'w').write(''.join(u + '\n' for u, r in res.items() if r == 'absent'))
open('echecs.txt', 'w').write(''.join(u + '\n' for u, r in res.items() if r == 'echec'))
print(f"dernier passage : {sum(r == 'ok' for r in res.values())} récupérés · {sum(r == 'absent' for r in res.values())} absents (404) · {sum(r == 'echec' for r in res.values())} encore en échec")
EOF
python3 - <<'EOF'
import json, time, urllib.request, datetime, os
def get(u):
    for k in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'aura-rejeu'}), timeout=60))
        except Exception as e: err = e; time.sleep(2 + 3 * k)
    raise err
T0, T1 = 1714521600000, 1790985600000          # 01/05/2024 → 03/10/2026 00:00 UTC
if os.environ.get('PER') == 'replique': T0, T1 = 1619827200000, 1730419200000   # 01/05/2021 → 01/11/2024 00:00 UTC
# Deribit DVOL BTC 1 h (bougie [début, o, h, l, c]) — pages de 1 000 en remontant le temps
dv, end = {}, T1
while end > T0:
    r = get(f"https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&start_timestamp={T0}&end_timestamp={end}&resolution=3600")['result']
    for x in r['data']: dv[x[0]] = x[4]
    if not r.get('continuation') or r['continuation'] >= end: break
    end = r['continuation']; time.sleep(0.2)
json.dump(sorted(dv.items()), open('ext/dvol_btc.json', 'w'))
# Coinbase BTC-USD et USDT-USD 1 h ([début s, bas, haut, ouverture, clôture, volume]) — 300 bougies par page
for prod in ('BTC-USD', 'USDT-USD'):
    cb, t = {}, T0 // 1000
    while t < T1 // 1000:
        e = min(t + 300 * 3600, T1 // 1000)
        iso = lambda s: datetime.datetime.utcfromtimestamp(s).strftime('%Y-%m-%dT%H:%M:%SZ')
        for x in get(f"https://api.exchange.coinbase.com/products/{prod}/candles?granularity=3600&start={iso(t)}&end={iso(e - 3600)}"):
            cb[int(x[0]) * 1000] = x[4]
        t = e; time.sleep(0.15)
    json.dump(sorted(cb.items()), open(f'ext/cb_{prod}.json', 'w'))
# DefiLlama : offre totale des stablecoins (somme de totalCirculatingUSD sur tous les ancrages), point quotidien daté 00:00 UTC
s = get("https://stablecoins.llama.fi/stablecoincharts/all")
json.dump([[int(x['date']) * 1000, sum(x['totalCirculatingUSD'].values())] for x in s], open('ext/stables.json', 'w'))
print(f"dvol {len(dv)} · cb BTC/USDT ok · stables {len(s)}")
EOF
COSD=2024-01-01; [ "$PER" = replique ] && COSD=2021-01-01
curl -sf "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500&cosd=$COSD" -o ext/sp500.csv
curl -sf "https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS&cosd=$COSD" -o ext/vix.csv
echo "spot $(ls spot | wc -l) · futures $(ls fut | wc -l) · prime $(ls prem | wc -l) · métriques $(ls metrics | wc -l) · quotidiens absents des archives (404) : $(cat absents.txt | wc -l), dont métriques hors PEPE : $(grep '/metrics/' absents.txt | grep -vc PEPE) · encore en échec : $(cat echecs.txt | wc -l) (absent ou en échec : la source se tait)"
