#!/bin/sh
# [SOURCE · 03/10/2026] Télécharge les VRAIES données des 13 sources de rejeu/source_ana.py (« go source », Rams 03/10 02:06).
# Binance (data.binance.vision, archives publiques ; api.binance.com / fapi.binance.com répondent 451 au bac à sable) : bougies spot et
# futures 1 h, prime de l'indice futures 1 h, métriques futures 5 min (intérêt ouvert, ratios long / short, volume preneur) ;
# Deribit (DVOL BTC 1 h) ; Coinbase (BTC-USD et USDT-USD 1 h) ; DefiLlama (offre des stablecoins) ; FRED (S&P 500, VIX).
# 05/2024 → 09/2026 (5 mois de chauffe avant le 01/10/2024 : fenêtres de 28 j + 90 j), + 1er et 2 octobre 2026 (bougies spot) pour les
# sorties des dernières décisions. Le mois pas encore publié en mensuel est complété par les archives quotidiennes. Rien de ceci n'entre
# dans le dépôt.
# usage : sh rejeu/source_get.sh <dossier données>
set -e
D=${1:?dossier}; mkdir -p "$D/spot" "$D/fut" "$D/prem" "$D/metrics" "$D/ext"; cd "$D"; rm -f urls.txt miss.txt miss2.txt
python3 - <<'EOF' > urls.txt
import calendar
pairs = "BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE".split()
B = "https://data.binance.vision/data"
months = [(y, m) for y in (2024, 2025, 2026) for m in range(1, 13) if (2024, 5) <= (y, m) <= (2026, 9)]
for p in pairs:
    fp = ('1000PEPE' if p == 'PEPE' else p) + 'USDT'
    for y, m in months:
        mo = f"{y}-{m:02d}"
        print(f"{B}/spot/monthly/klines/{p}USDT/1h/{p}USDT-1h-{mo}.zip spot")
        print(f"{B}/futures/um/monthly/klines/{fp}/1h/{fp}-1h-{mo}.zip fut")
        print(f"{B}/futures/um/monthly/premiumIndexKlines/{fp}/1h/{fp}-1h-{mo}.zip prem")
        for day in range(1, calendar.monthrange(y, m)[1] + 1):
            print(f"{B}/futures/um/daily/metrics/{fp}/{fp}-metrics-{y}-{m:02d}-{day:02d}.zip metrics")
    for day in (1, 2):
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
python3 - <<'EOF'
import json, time, urllib.request, datetime
def get(u):
    for k in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'aura-rejeu'}), timeout=60))
        except Exception as e: err = e; time.sleep(2 + 3 * k)
    raise err
T0, T1 = 1714521600000, 1790985600000          # 01/05/2024 → 03/10/2026 00:00 UTC
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
curl -sf "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500&cosd=2024-01-01" -o ext/sp500.csv
curl -sf "https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS&cosd=2024-01-01" -o ext/vix.csv
echo "spot $(ls spot | wc -l) · futures $(ls fut | wc -l) · prime $(ls prem | wc -l) · métriques $(ls metrics | wc -l) · quotidiens absents des archives : $(grep -c "/daily/" miss.txt 2>/dev/null || true) au 1er passage + $(cat miss2.txt 2>/dev/null | wc -l) au 2e (jours non publiés : la source se tait)"
