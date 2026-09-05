// ▓▓▓ VERSION 20260906a ▓▓▓
// 10e2-calendrier-eco.js — Calendrier économique : source unique (affichage 05 + décision 09c/10f)
// [P2 · 06/09/2026] BRIQUE 2 DU PONT ANALYTICS→DÉCISION. Module dédié (10e dépassait 500 lignes
// avec ce bloc). Ordre de chargement OBLIGATOIRE : juste après 10e, avant 10f (dans le HTML).
// Aucune dépendance à S : fonctions pures du temps. Deux consommateurs décisionnels : 09c (veto)
// et 10f (malus) ; un consommateur d'affichage : renderCalSection (05).

// ══════════════════════════════════════════════════════════════════════════
// [P2 · 06/09/2026] BRIQUE 2 DU PONT — CALENDRIER ÉCONOMIQUE, SOURCE UNIQUE
// L'ancienne _getRecurringEvents (05, affichage v60) datait le FOMC à 00:00 UTC du jour J
// (décision réelle 14:00 ET) et le faisait disparaître dès minuit (filtre d > now) ; le CPI
// était posé « 2e mercredi 14:30 heure locale » (réel : jour variable, 08:30 ET — pour
// septembre 2026 ça donnait le 9 au lieu du 11). Inutilisable pour décider : la fenêtre
// « 30 min avant » ne se serait jamais ouverte au bon moment.
// Désormais : dates OFFICIELLES 2026 (Fed : federalreserve.gov ; BLS : bls.gov), heure ET
// convertie en UTC selon l'heure d'été américaine (2e dimanche de mars → 1er dimanche de
// novembre), Deribit 08:00 UTC, OpEx clôture US 16:00 ET, funding 00/08/16 UTC. Un événement
// reste visible jusqu'à ECO_VISIBLE_AFTER_MS après son heure (la fenêtre de prudence « autour »).
// Cache RAM 60 s (appelée à chaque cycle par 10f et à chaque ouverture par 09c).
// Le rendu 05 (renderCalSection) lit cette même fonction : un seul calendrier, affiché et décidé.
// ══════════════════════════════════════════════════════════════════════════
const ECO_VETO_BEFORE_MS    = 30 * 60 * 1000;
const ECO_CAUTION_WINDOW_MS = 2 * 60 * 60 * 1000;
const ECO_CAUTION_MALUS     = 0.10;
const ECO_VISIBLE_AFTER_MS  = ECO_CAUTION_WINDOW_MS;
const ECO_HORIZON_MS        = 90 * 86400000;
const ECO_CACHE_TTL_MS      = 60 * 1000;
// Décision FOMC : 14:00 ET le 2e jour de réunion (calendrier officiel 2026).
const ECO_FOMC_2026 = ['2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-10-28','2026-12-09'];
// Publication CPI : 08:30 ET (calendrier officiel BLS 2026 — février décalé au 13).
const ECO_CPI_2026  = ['2026-01-13','2026-02-13','2026-03-11','2026-04-10','2026-05-12','2026-06-10','2026-07-14','2026-08-12','2026-09-11','2026-10-14','2026-11-10','2026-12-10'];
const _ecoCache = { ts: 0, events: null };

function _ecoNthSunday(year, month, n) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (7 - first.getUTCDay()) % 7;
  return 1 + offset + (n - 1) * 7;
}

function _ecoEtOffsetHours(year, month, day) {
  const dstStart = Date.UTC(year, 2, _ecoNthSunday(year, 2, 2));
  const dstEnd   = Date.UTC(year, 10, _ecoNthSunday(year, 10, 1));
  const t = Date.UTC(year, month, day);
  return (t >= dstStart && t < dstEnd) ? 4 : 5;
}

function _ecoEtToUtc(ymd, hour, minute) {
  const parts = ymd.split('-').map(Number);
  const y = parts[0], m = parts[1] - 1, d = parts[2];
  return Date.UTC(y, m, d, hour + _ecoEtOffsetHours(y, m, d), minute, 0, 0);
}

function _ecoLastFridayUtc(year, month, hour) {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const back = (last.getUTCDay() + 2) % 7;
  return Date.UTC(year, month, last.getUTCDate() - back, hour, 0, 0, 0);
}

function _ecoThirdFridayUtc(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const fri = (12 - first.getUTCDay()) % 7;
  const day = fri + 1 + 14;
  return _ecoEtToUtc(year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0'), 16, 0);
}

function _getRecurringEvents() {
  const now = Date.now();
  if (_ecoCache.events && (now - _ecoCache.ts) < ECO_CACHE_TTL_MS) return _ecoCache.events;
  const minTs = now - ECO_VISIBLE_AFTER_MS;
  const maxTs = now + ECO_HORIZON_MS;
  const keep = ts => ts >= minTs && ts <= maxTs;
  const events = [];
  const cur = new Date(now);
  const y = cur.getUTCFullYear(), m = cur.getUTCMonth();

  ECO_FOMC_2026.forEach(ymd => {
    const ts = _ecoEtToUtc(ymd, 14, 0);
    if (keep(ts)) events.push({ ts, date: new Date(ts), name: 'Décision taux Fed (FOMC)', impact: 'high', category: 'macro',
      desc: 'Impact majeur. Hausse des taux = baissier crypto. Baisse = haussier.', icon: '🏦' });
  });
  ECO_CPI_2026.forEach(ymd => {
    const ts = _ecoEtToUtc(ymd, 8, 30);
    if (keep(ts)) events.push({ ts, date: new Date(ts), name: 'CPI USA (Inflation)', impact: 'high', category: 'macro',
      desc: 'Impact fort sur BTC/ETH. Inflation plus haute = pression baissière crypto.', icon: '🇺🇸' });
  });
  for (let k = 0; k < 4; k++) {
    const mm = m + k, yy = y + Math.floor(mm / 12), mo = mm % 12;
    const lf = _ecoLastFridayUtc(yy, mo, 8);
    if (keep(lf)) events.push({ ts: lf, date: new Date(lf), name: 'Expiration Options BTC/ETH (Deribit)', impact: 'high', category: 'crypto',
      desc: 'Fortes variations possibles. Les market makers couvrent leurs positions.', icon: '⚠️' });
    const tf = _ecoThirdFridayUtc(yy, mo);
    if (keep(tf)) events.push({ ts: tf, date: new Date(tf), name: 'OpEx ETF Bitcoin (3e vendredi)', impact: 'med', category: 'crypto',
      desc: 'Expiration des options ETF spot BTC. Souvent volatile 24-48h avant.', icon: '📊' });
  }
  const slot = 8 * 3600000;
  const nf = Math.floor(now / slot) * slot + slot;
  events.push({ ts: nf, date: new Date(nf), name: 'Funding Rate Binance', impact: 'low', category: 'crypto',
    desc: 'Rééquilibrage des positions futures. Impact mineur sauf taux extrêmes.', icon: '💸' });
  const halving = Date.UTC(2028, 3, 15);
  events.push({ ts: halving, date: new Date(halving), name: 'Halving Bitcoin (dans ' + Math.round((halving - now) / 86400000) + ' jours)',
    impact: 'high', category: 'crypto', desc: 'Réduction de 50% des récompenses mineurs. Historiquement très haussier.', icon: '₿', special: true });

  events.sort((a, b) => a.ts - b.ts);
  _ecoCache.ts = now; _ecoCache.events = events;
  return events;
}
window._getRecurringEvents = _getRecurringEvents;

// Porte d'ouverture calendrier : impact FORT (hors halving, informatif) le plus proche dans ±2 h.
//   0 → 30 min avant l'annonce : veto (appliqué dans l'entonnoir 09c).
//   sinon dans la fenêtre ±2 h  : conviction requise +0.10 (portes par régime ET plancher, 10f).
// Hors fenêtre : neutre. minutes > 0 = annonce à venir, < 0 = annonce passée.
function _ecoGateForOpen() {
  const out = { veto: false, malus: 0, event: null, minutes: null };
  const now = Date.now();
  let best = null, bestAbs = Infinity;
  _getRecurringEvents().forEach(e => {
    if (e.impact !== 'high' || e.special) return;
    const d = e.ts - now;
    if (d > ECO_CAUTION_WINDOW_MS || d < -ECO_CAUTION_WINDOW_MS) return;
    if (Math.abs(d) < bestAbs) { bestAbs = Math.abs(d); best = e; }
  });
  if (!best) return out;
  const d = best.ts - now;
  out.event = best;
  out.minutes = Math.round(d / 60000);
  if (d >= 0 && d <= ECO_VETO_BEFORE_MS) out.veto = true;
  else out.malus = ECO_CAUTION_MALUS;
  return out;
}
window._ecoGateForOpen = _ecoGateForOpen;
