#!/bin/sh
# [PORTAGE · 04/10/2026] Archives publiques Binance (data.binance.vision) pour rejeu/portage_ana.py : financement mensuel des 11 contrats
# USDT-M de l'app, bougies 1 h spot (11 cryptos + EUR, pour le cours EUR/USDT) et futures. 01/2020 → 09/2026 (mois absents avant la
# cotation = 404, normal). Mois mensuel pas encore publié → archives quotidiennes (bougies). ~60 Mo, ~2 min. Rien de ceci n'entre dans le dépôt.
# usage : sh rejeu/portage_get.sh <dossier données> [premier mois AAAA-MM] [dernier mois AAAA-MM]
set -e
D=${1:?dossier}; FROM=${2:-2020-01}; TO=${3:-2026-09}
mkdir -p "$D/fund" "$D/spot1h" "$D/perp1h"; cd "$D"; rm -f urls.txt miss.txt urls2.txt
python3 - "$FROM" "$TO" <<'PY' > urls.txt
import sys
f, t = [tuple(map(int, a.split('-'))) for a in sys.argv[1:3]]
pairs = "BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE EUR".split()
B = "https://data.binance.vision/data"
y, m = f
while (y, m) <= t:
    mo = f"{y}-{m:02d}"
    for p in pairs:
        print(f"{B}/spot/monthly/klines/{p}USDT/1h/{p}USDT-1h-{mo}.zip spot1h")
        if p != 'EUR':
            fp = ('1000PEPE' if p == 'PEPE' else p) + 'USDT'
            print(f"{B}/futures/um/monthly/fundingRate/{fp}/{fp}-fundingRate-{mo}.zip fund")
            print(f"{B}/futures/um/monthly/klines/{fp}/1h/{fp}-1h-{mo}.zip perp1h")
    m += 1
    if m > 12: y, m = y + 1, 1
PY
xargs -P 16 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0 $1" >> miss.txt' < urls.txt
# bougies du dernier mois pas encore publiées en mensuel → quotidiennes (le financement n'existe qu'en mensuel)
if [ -s miss.txt ]; then
  grep '/klines/' miss.txt | python3 -c "
import sys, calendar, re
last = '$TO'
for l in sys.stdin:
    u, d = l.split(); y, m = map(int, re.search(r'-(\d{4})-(\d{2})\.zip$', u).groups())
    if f'{y}-{m:02d}' != last: continue
    for day in range(1, calendar.monthrange(y, m)[1] + 1):
        print(u.replace('/monthly/', '/daily/').replace(f'-{y}-{m:02d}.zip', f'-{y}-{m:02d}-{day:02d}.zip'), d)
" > urls2.txt
  [ -s urls2.txt ] && xargs -P 16 -n 2 sh -c 'f="$1/$(basename "$0")"; [ -s "$f" ] || curl -sf --retry 3 -o "$f" "$0" || echo "$0 $1" >> miss2.txt' < urls2.txt || true
fi
echo "fichiers : fund $(ls fund | wc -l) · spot1h $(ls spot1h | wc -l) · perp1h $(ls perp1h | wc -l) · absents (avant cotation ou non publiés) $(cat miss.txt 2>/dev/null | wc -l)"
