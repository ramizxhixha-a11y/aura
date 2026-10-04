// [CARNET · 04/10/2026] rejeu/carnet_flux.c — « go carnet » (Rams 04/10). Rejoue TOUS les trades spot d'une archive Binance
// (data/spot/*/trades : id,prix,quantité,notionnel,heure,acheteurEstMaker,meilleurPrix — le contenu du flux @trade de l'app) dans la
// logique de _recordTrade (js/02-state-init.js), traduite ligne à ligne :
//   seau = Math.floor(T / 60 000) × 60 000 ; trade invalide (prix ou quantité ≤ 0) ou en retard (seau antérieur au seau courant) : ignoré ;
//   preneur vendeur ⇔ acheteurEstMaker ; usd = prix × quantité ; gros trade si moyenne connue ET usd > 8 × moyenne ET usd ≥ 500 ;
//   moyenne ← usd au 1er trade, puis moyenne + (usd − moyenne) × 0,02 (après le test).
// Deux vues, écrites côte à côte : « v » = tous les trades (la vérité de l'archive) ; « a » = ceux que l'app garde (anti-flood de 02 :
// un message au plus par 250 ms et par paire — heure du trade prise pour heure d'arrivée).
// Entrée : CSV sur stdin (unzip -p). État (moyennes, dernier message gardé) dans <état> entre deux fichiers (mois puis jours, dans l'ordre).
// Sortie : seaux complets ajoutés à <préfixe>.v.bin et <préfixe>.a.bin — enregistrements de 8 × 8 octets :
//   t (int64, ms) · buyQ · sellQ · n · bigBuy · bigSell · bigBuyUsd · bigSellUsd (double)
// usage : unzip -p fichier.zip | ./carnet_flux <préfixe> <état>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>

typedef struct { int64_t t; double buyQ, sellQ, n, bigBuy, bigSell, bigBuyUsd, bigSellUsd; } Bucket;
typedef struct { Bucket b; int has; double ema; int hasEma; FILE *out; long long written; } View;

// Lecture rapide d'un décimal « 123.45600000 » : mantisse entière exacte (< 2^53) divisée par 10^k exact (k ≤ 22) — une seule division IEEE
// d'opérandes exacts, donc arrondie au plus près : le même double que strtod (et que parseFloat de l'app). Hors de ce cas : strtod.
static const double P10[23] = {1e0,1e1,1e2,1e3,1e4,1e5,1e6,1e7,1e8,1e9,1e10,1e11,1e12,1e13,1e14,1e15,1e16,1e17,1e18,1e19,1e20,1e21,1e22};
static double dec(const char *s) {
  const char *p = s; uint64_t m = 0; int k = 0, frac = 0, nd = 0;
  for (;; p++) {
    if (*p >= '0' && *p <= '9') { if (nd >= 18) return strtod(s, NULL); m = m * 10 + (uint64_t)(*p - '0'); if (m || frac) nd++; if (frac) k++; }
    else if (*p == '.' && !frac) frac = 1;
    else break;
  }
  if ((*p != ',' && *p != 0 && *p != '\n' && *p != '\r') || k > 22 || m >= (1ULL << 53) || p == s) return strtod(s, NULL);
  return (double)m / P10[k];
}

static void flush(View *v) { if (v->has) { if (fwrite(&v->b, sizeof(Bucket), 1, v->out) != 1) { fprintf(stderr, "écriture impossible\n"); exit(5); } v->written++; v->has = 0; } }

static void record(View *v, double price, double qty, int sell, int64_t ts) {
  if (!isfinite(price) || !isfinite(qty) || price <= 0 || qty <= 0) return;
  int64_t t0 = (int64_t)floor((double)ts / 60000.0) * 60000;
  if (!v->has || v->b.t != t0) {
    if (v->has && t0 < v->b.t) return;                       // trade en retard : ignoré (avant la moyenne, comme 02)
    flush(v);
    memset(&v->b, 0, sizeof(Bucket)); v->b.t = t0; v->has = 1;
  }
  double usd = price * qty;
  if (sell) v->b.sellQ += qty; else v->b.buyQ += qty;
  v->b.n += 1;
  if (v->hasEma && v->ema != 0 && usd > 8 * v->ema && usd >= 500) {
    if (sell) { v->b.bigSell += 1; v->b.bigSellUsd += usd; } else { v->b.bigBuy += 1; v->b.bigBuyUsd += usd; }
  }
  if (v->hasEma && v->ema != 0) v->ema = v->ema + (usd - v->ema) * 0.02; else { v->ema = usd; v->hasEma = 1; }
}

int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage : carnet_flux <préfixe> <état>\n"); return 2; }
  char pv[4096], pa[4096]; snprintf(pv, sizeof pv, "%s.v.bin", argv[1]); snprintf(pa, sizeof pa, "%s.a.bin", argv[1]);
  View V = {0}, A = {0}; int64_t lastA = 0; int64_t lastT = 0;
  FILE *st = fopen(argv[2], "r");
  if (st) {
    if (fscanf(st, "%la %d %la %d %lld %lld", &V.ema, &V.hasEma, &A.ema, &A.hasEma, (long long *)&lastA, (long long *)&lastT) != 6) { fprintf(stderr, "état illisible\n"); return 3; }
    fclose(st);
  }
  V.out = fopen(pv, "ab"); A.out = fopen(pa, "ab");
  if (!V.out || !A.out) { fprintf(stderr, "sortie impossible\n"); return 4; }
  static char line[1024]; long long nl = 0, nbad = 0, nback = 0;
  while (fgets(line, sizeof line, stdin)) {
    if (line[0] < '0' || line[0] > '9') continue;             // en-tête éventuel
    char *f[8]; int k = 0; char *s = line;
    f[k++] = s;
    while (*s && k < 8) { if (*s == ',') { *s = 0; f[k++] = s + 1; } s++; }
    if (k < 6) { nbad++; continue; }
    double price = dec(f[1]), qty = dec(f[2]);
    long long T = strtoll(f[4], NULL, 10);
    if (T > 100000000000000LL) T /= 1000;                      // archives spot depuis 01/2025 : microsecondes
    int sell = (f[5][0] == 'T' || f[5][0] == 't');
    if (T < lastT) nback++;
    lastT = T; nl++;
    record(&V, price, qty, sell, T);
    if (!(lastA && (T - lastA) < 250)) { lastA = T; record(&A, price, qty, sell, T); }
  }
  flush(&V); flush(&A);                                        // un fichier Binance finit à minuit UTC : le dernier seau est complet
  if (ferror(stdin) || fclose(V.out) != 0 || fclose(A.out) != 0) { fprintf(stderr, "lecture ou écriture incomplète\n"); return 5; }   // relecture 04/10 : disque plein = arrêt, jamais un seau perdu en silence
  st = fopen(argv[2], "w");
  if (!st || fprintf(st, "%a %d %a %d %lld %lld\n", V.ema, V.hasEma, A.ema, A.hasEma, (long long)lastA, (long long)lastT) < 0 || fclose(st) != 0) { fprintf(stderr, "état non écrit\n"); return 6; }
  fprintf(stderr, "%s : %lld trades, %lld seaux (vue app %lld), illisibles %lld, heures en recul %lld\n", argv[1], nl, V.written, A.written, nbad, nback);
  return 0;
}
