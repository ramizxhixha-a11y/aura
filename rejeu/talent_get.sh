#!/bin/sh
# [TALENT · 03/10/2026] Télécharge les VRAIES données de marché pour rejeu/talent.js — archives publiques Binance (data.binance.vision,
# joignable depuis le bac à sable ; api.binance.com / fapi.binance.com y répondent 451) + Fear & Greed (api.alternative.me).
# 12 paires d'AURA, 24 mois (10/2024 → 09/2026) : bougies spot 15 min et 5 min (vrai volume, volume pris à l'achat), financement
# mensuel, métriques futures quotidiennes (intérêt ouvert, ratio long/short des comptes). Le mois en cours de publication manque en
# mensuel : complété par les archives quotidiennes. ~245 Mo, ~3 min. Rien de ceci n'entre dans le dépôt.
# usage : sh rejeu/talent_get.sh <dossier données> [premier mois AAAA-MM] [dernier mois AAAA-MM]
set -e
D=${1:?dossier}; FROM=${2:-2024-10}; TO=${3:-2026-09}
mkdir -p "$D/k15" "$D/k5" "$D/fund" "$D/metrics"; cd "$D"; rm -f urls.txt miss.txt
PAIRS="BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE EUR"
python3 - "$FROM" "$TO" <<'EOF' > urls.txt
import sys, datetime, calendar
f, t = [tuple(map(int, a.split('-'))) for a in sys.argv[1:3]]
pairs = "BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE EUR".split()
B = "https://data.binance.vision/data"
y, m = f
while (y, m) <= t:
    mo = f"{y}-{m:02d}"
    for p in pairs:
        fp = ('1000PEPE' if p == 'PEPE' else p) + 'USDT'
        for tf, d in (('15m', 'k15'), ('5m', 'k5')):
            print(f"{B}/spot/monthly/klines/{p}USDT/{tf}/{p}USDT-{tf}-{mo}.zip {d}")
        if p != 'EUR':
            print(f"{B}/futures/um/monthly/fundingRate/{fp}/{fp}-fundingRate-{mo}.zip fund")
            for day in range(1, calendar.monthrange(y, m)[1] + 1):
                print(f"{B}/futures/um/daily/metrics/{fp}/{fp}-metrics-{y}-{m:02d}-{day:02d}.zip metrics")
    m += 1
    if m > 12: y, m = y + 1, 1
EOF
xargs -P 24 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0 $1" >> miss.txt' < urls.txt
# mois mensuel pas encore publié → archives quotidiennes
if [ -s miss.txt ]; then
  grep '/spot/monthly/klines/' miss.txt | python3 -c "
import sys, calendar, re
for l in sys.stdin:
    u, d = l.split(); y, m = map(int, re.search(r'-(\d{4})-(\d{2})\.zip$', u).groups())
    for day in range(1, calendar.monthrange(y, m)[1] + 1):
        print(u.replace('/monthly/', '/daily/').replace(f'-{y}-{m:02d}.zip', f'-{y}-{m:02d}-{day:02d}.zip'), d)
" > urls2.txt
  rm -f miss2.txt; xargs -P 24 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0" >> miss2.txt' < urls2.txt
  echo "quotidiennes manquantes : $(cat miss2.txt 2>/dev/null | wc -l) (jours à venir)"
fi
curl -sf "https://api.alternative.me/fng/?limit=0&format=json" -o fng.json
echo "k15 $(ls k15 | wc -l) · k5 $(ls k5 | wc -l) · financement $(ls fund | wc -l) · métriques $(ls metrics | wc -l) · fng $(python3 -c "import json;print(len(json.load(open('fng.json'))['data']))")"
