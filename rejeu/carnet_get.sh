#!/bin/sh
# [CARNET · 04/10/2026] Télécharge et rejoue les données de la porte CARNET (rejeu/carnet_ana.py) — « go carnet » (Rams 04/10).
#  1. carnet des futures USDT-M : data/futures/um/daily/bookDepth, 11 contrats (EUR/USDT n'en a pas ; PEPE = 1000PEPEUSDT), un fichier par
#     jour du 30/09/2024 au 30/09/2026 → <données>/bd (~3 Go) ; un dernier passage ne déclare absent que ce qui répond 404.
#  2. TOUS les trades spot des 12 paires : data/spot/monthly/trades 10/2024 → 08/2026 puis data/spot/daily/trades pour 09/2026 (le mois
#     n'est pas encore publié en mensuel), ~91 Go compressés : chaque archive est rejouée dès son arrivée par carnet_flux.c (seaux d'une
#     minute de _recordTrade, deux vues) puis effacée — rien de gros ne reste sur le disque. Paire par paire dans l'ordre du temps (la
#     moyenne mobile du notionnel continue d'un fichier au suivant), 3 paires à la fois, l'archive suivante téléchargée pendant le rejeu.
#     Reprise : un fichier rejoué laisse <données>/fl/<P>/<nom>.ok et l'état qui le suit ; relancer reprend après le dernier .ok.
#  Durée mesurée le 04/10 : ~2 h sur les 2 cœurs du bac à sable (BTC et ETH : 100 à 190 millions de trades par mois) — décompression ISA-L
#  (rejeu/carnet_unzip.py, CRC vérifié) et lecture exacte des décimaux : 2,2 × plus rapide que unzip + strtod, seaux identiques à l'octet.
#  Rien de ceci n'entre dans le dépôt.
# usage : sh rejeu/carnet_get.sh <dossier données>
set -e
D=${1:?dossier}; HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$D/bd" "$D/fl"; D=$(cd "$D" && pwd)
gcc -O2 -o "$D/carnet_flux" "$HERE/carnet_flux.c" -lm
cp "$HERE/carnet_unzip.py" "$D/"
python3 -c "import isal" 2>/dev/null || pip install --break-system-packages -q isal 2>/dev/null || echo "isal absent : décompression zlib, ~2 × plus lente"
B=https://data.binance.vision/data
# ── 1. carnet ──
python3 - > "$D/bd/urls.txt" <<'EOF'
import datetime
B = "https://data.binance.vision/data/futures/um/daily/bookDepth"
d = datetime.date(2024, 9, 30)
while d <= datetime.date(2026, 9, 30):
    for p in "BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE".split():
        s = ('1000PEPE' if p == 'PEPE' else p) + 'USDT'
        print(f"{B}/{s}/{s}-bookDepth-{d.isoformat()}.zip")
    d += datetime.timedelta(days=1)
EOF
cd "$D/bd"
xargs -P 24 -n 1 sh -c 'f=$(basename "$0"); [ -s "$f" ] || { curl -sf --retry 3 -o "$f.part" "$0" && mv "$f.part" "$f"; } || true' < urls.txt
for f in *.zip; do unzip -tq "$f" > /dev/null 2>&1 || { echo "archive abîmée, re-téléchargée : $f"; rm -f "$f"; }; done   # 04/10 : deux fichiers coupés en route (33 Ko)
rm -f absents.txt *.part
while read u; do f=$(basename "$u"); [ -s "$f" ] && continue; c=$(curl -s -o "$f" -w '%{http_code}' --retry 3 "$u"); { [ "$c" = 200 ] && unzip -tq "$f" > /dev/null 2>&1; } || { rm -f "$f"; echo "$u $c" >> absents.txt; }; done < urls.txt
echo "carnet : $(ls *.zip | wc -l) jours×contrats · absents $(cat absents.txt 2>/dev/null | wc -l) (404 : $(grep -c ' 404$' absents.txt 2>/dev/null || echo 0))"
# ── 2. trades ──
cd "$D/fl"
cat > un_actif.sh <<'EOF'
#!/bin/bash
set -o pipefail
# rejoue, dans l'ordre, toutes les archives de trades d'une paire (argument : BTC, ETH, …)
P=$1; D=$(pwd); mkdir -p "$P"; B=https://data.binance.vision/data/spot
L=$(python3 -c "
y, m = 2024, 10
while (y, m) <= (2026, 8):
    print(f'monthly/trades/${P}USDT/${P}USDT-trades-{y}-{m:02d}.zip'); m += 1
    if m > 12: y, m = y + 1, 1
for d in range(1, 31): print(f'daily/trades/${P}USDT/${P}USDT-trades-2026-09-{d:02d}.zip')
")
prev=""
fetch() { f="$P/$(basename "$1")"; [ -s "$f" ] && return 0; curl -sf --retry 5 -o "$f.part" "$B/$1" && mv "$f.part" "$f"; }
set -- $L; n=$#; i=0
for u in $L; do
  i=$((i + 1)); nm=$(basename "$u" .zip)
  if [ -f "$P/$nm.ok" ]; then prev=$nm; continue; fi
  fetch "$u" || { echo "$P : $u ÉCHEC du téléchargement" >&2; exit 1; }
  nxt=$(echo "$L" | sed -n "$((i + 1))p"); [ -n "$nxt" ] && { fetch "$nxt" & }
  [ -n "$prev" ] && cp "$P/$prev.st" "$P/cur.st" || rm -f "$P/cur.st"
  rm -f "$P/$nm.v.bin" "$P/$nm.a.bin"
  python3 "$D/../carnet_unzip.py" "$P/$(basename "$u")" | "$D/../carnet_flux" "$P/$nm" "$P/cur.st" 2>> "$P/journal.txt" || { echo "$P : $nm ÉCHEC du rejeu" >&2; exit 1; }
  mv "$P/cur.st" "$P/$nm.st"; touch "$P/$nm.ok"; rm -f "$P/$(basename "$u")"
  wait; prev=$nm
done
echo "$P : $(ls $P/*.ok | wc -l) / $n archives rejouées"
EOF
echo "BTC ETH XRP SOL DOGE BNB PEPE ADA DOT AVAX LINK EUR" | tr ' ' '\n' | xargs -P 3 -n 1 bash un_actif.sh
for P in BTC ETH XRP SOL DOGE DOT ADA AVAX LINK BNB PEPE EUR; do [ "$(ls $P/*.ok | wc -l)" = 53 ] || { echo "$P incomplet"; exit 1; }; done
echo "trades : 12 paires × 53 archives rejouées"
