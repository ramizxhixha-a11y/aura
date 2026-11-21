#!/bin/sh
# [SESSIONS · 21/11/2026] Archives publiques Binance (data.binance.vision) pour rejeu/porte_sessions.py : bougies spot 5 min des 11 cryptos
# de l'app. Mois absents avant la cotation = 404, normal. Mois mensuel pas encore publié → archives quotidiennes. ~300 Mo. Hors dépôt.
# usage : sh rejeu/sessions_get.sh <dossier données> [premier mois AAAA-MM] [dernier mois AAAA-MM]
set -e
D=${1:?dossier}; FROM=${2:-2018-07}; TO=${3:-2026-09}
mkdir -p "$D/spot5m"; cd "$D"; rm -f urls.txt miss.txt urls2.txt miss2.txt
python3 - "$FROM" "$TO" <<'PY' > urls.txt
import sys
f, t = [tuple(map(int, a.split('-'))) for a in sys.argv[1:3]]
B = "https://data.binance.vision/data"
y, m = f
while (y, m) <= t:
    mo = f"{y}-{m:02d}"
    for p in "BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE".split():
        print(f"{B}/spot/monthly/klines/{p}USDT/5m/{p}USDT-5m-{mo}.zip spot5m")
    m += 1
    if m > 12: y, m = y + 1, 1
PY
xargs -P 16 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0 $1" >> miss.txt' < urls.txt
if [ -s miss.txt ]; then
  python3 -c "
import sys, calendar, re
last = '$TO'
for l in open('miss.txt'):
    u, d = l.split(); y, m = map(int, re.search(r'-(\d{4})-(\d{2})\.zip$', u).groups())
    if f'{y}-{m:02d}' != last: continue
    for day in range(1, calendar.monthrange(y, m)[1] + 1):
        print(u.replace('/monthly/', '/daily/').replace(f'-{y}-{m:02d}.zip', f'-{y}-{m:02d}-{day:02d}.zip'), d)
" > urls2.txt
  [ -s urls2.txt ] && xargs -P 16 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0 $1" >> miss2.txt' < urls2.txt || true
fi
echo "fichiers : spot5m $(ls spot5m | wc -l) · absents (avant cotation ou non publiés) $(cat miss.txt 2>/dev/null | wc -l)"
