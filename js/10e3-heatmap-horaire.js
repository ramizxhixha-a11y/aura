// ▓▓▓ VERSION 20260906b ▓▓▓
// 10e3-heatmap-horaire.js — Heatmap horaire : porte de conviction par créneau (décision 10f)
// [P3 · 06/09/2026] BRIQUE 3 DU PONT ANALYTICS→DÉCISION. Module dédié (10e = 464 l., 10f = 558 l.).
// Ordre de chargement OBLIGATOIRE : juste après 10e2, avant 10f (dans le HTML).
// Source VIVANTE : S.heatmap.byHour[h] = {count, pnl, wins}, écrit à CHAQUE clôture de position par
// recordTradeForHeatmap (03, appelée une seule fois depuis closePosition 02) avec l'heure LOCALE
// (new Date().getHours()). La lecture ici utilise la même horloge locale : un seul référentiel.
// Jusqu'ici cette heatmap n'était qu'affichée (renderHeatmapPanel 03, renderHeatmapSection 04,
// computeTimingScore 05) : aucun effet sur l'ouverture. Désormais elle module la conviction requise.
//   créneau FROID : WR < 40 % sur ≥ 20 trades          → conviction requise +0.08
//   créneau D'OR  : WR ≥ 60 % sur ≥ 20 trades ET pnl > 0 → conviction requise −0.03
//   sinon (échantillon insuffisant ou créneau moyen)   → neutre
// Le seuil d'échantillon (20) rend le bruit inoffensif : un créneau se qualifie par l'expérience.
// LIMITE DÉCLARÉE : S.heatmap n'est pas multiplexé par mode (absent de _WALLET_ACCESSOR_FIELDS, 02)
// → un seul compteur AA+EV+RE confondus ; l'AA, plus nombreux, pèse le plus.
// Cache RAM 60 s, invalidé au changement d'heure (10f appelle à chaque cycle de chaque paire).
const HEAT_MIN_TRADES = 20;
const HEAT_COLD_WR    = 0.40;
const HEAT_COLD_MALUS = 0.08;
const HEAT_GOLD_WR    = 0.60;
const HEAT_GOLD_BONUS = 0.03;
const HEAT_CACHE_TTL_MS = 60 * 1000;
const _heatCache = { ts: 0, hour: -1, out: null };

// Lecture pure d'un créneau : {delta, hour, wr, count, tag}. tag = 'froid' | 'or' | null.
function _heatSlotVerdict(byHour, hour) {
  const out = { delta: 0, hour: hour, wr: null, count: 0, tag: null };
  const slot = byHour && byHour[hour];
  if (!slot) return out;
  const count = Number(slot.count) || 0;
  out.count = count;
  if (count < HEAT_MIN_TRADES) return out;
  const wr = (Number(slot.wins) || 0) / count;
  out.wr = wr;
  if (wr < HEAT_COLD_WR) { out.delta = HEAT_COLD_MALUS; out.tag = 'froid'; return out; }
  if (wr >= HEAT_GOLD_WR && (Number(slot.pnl) || 0) > 0) { out.delta = -HEAT_GOLD_BONUS; out.tag = 'or'; return out; }
  return out;
}

// Porte d'ouverture heatmap pour l'heure locale courante (consommateur : 10f, porte par régime
// ET plancher 0.30, même pattern que _ecoMalus / _corrBonus).
function _heatGateForOpen() {
  const now = Date.now();
  const hour = new Date(now).getHours();
  if (_heatCache.out && _heatCache.hour === hour && (now - _heatCache.ts) < HEAT_CACHE_TTL_MS) return _heatCache.out;
  const byHour = (typeof S !== 'undefined' && S && S.heatmap && S.heatmap.byHour) ? S.heatmap.byHour : null;
  const out = _heatSlotVerdict(byHour, hour);
  _heatCache.ts = now; _heatCache.hour = hour; _heatCache.out = out;
  return out;
}
window._heatSlotVerdict = _heatSlotVerdict;
window._heatGateForOpen = _heatGateForOpen;
