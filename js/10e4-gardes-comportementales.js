// ▓▓▓ VERSION 20260906c ▓▓▓
// 10e4-gardes-comportementales.js — Gardes comportementales : cooldown par paire après perte,
// mise ≤ précédente après perte, plafond d'ouvertures par jour selon le régime (décision 09c)
// [P4 · 06/09/2026] BRIQUE 4 DU PONT ANALYTICS→DÉCISION. Module dédié (10f = 590 l., non touché).
// Ordre de chargement OBLIGATOIRE : juste après 10e3, avant 10f (dans le HTML).
// Source VIVANTE : ps.trades de S.pairStates (multiplexé PAR MODE via _activeWallet, 02) —
//   entrée {type:'open', stakeUsdt, ts} écrite à chaque ouverture (09c et ouverture manuelle 02),
//   entrée {type:'position', stakeUsdt, pnlUsdt, ts} écrite à chaque clôture (closePosition 02).
// Jusqu'ici le revenge trading et l'overtrading étaient DÉTECTÉS (06 : « 16× revenge, 69 trades/j »)
// sans effet sur l'ouverture. L'anti-revenge v84 (06) reste actif : il est GLOBAL (toutes paires)
// et ne se déclenche que sur grosse perte ou série ; ces gardes sont PAR PAIRE et systématiques.
//   COOLDOWN   : dernière clôture de la paire perdante depuis < 15 min      → veto
//   MISE       : dernière clôture de la paire perdante                      → mise ≤ sa mise (stakeCap)
//   PLAFOND/J  : ouvertures du jour LOCAL (toutes paires du wallet actif) ≥ plafond du régime → veto
//                CALM 40 · bull/bear 80 · volatile* libre
// Le jour local est le même référentiel que la heatmap (10e3, getHours) : une seule horloge.
// Pas de cache : appelé uniquement quand une ouverture est tentée (pas à chaque cycle).
const BEHAV_COOLDOWN_MS  = 15 * 60 * 1000;
const BEHAV_DAY_CAP_CALM = 40;
const BEHAV_DAY_CAP_NORM = 80;

// Plafond d'ouvertures par jour selon le régime (Infinity = libre).
function _behavRegimeCap(regime) {
  if (regime === 'calm') return BEHAV_DAY_CAP_CALM;
  if (regime === 'bull' || regime === 'bear') return BEHAV_DAY_CAP_NORM;
  return Infinity;
}

// Dernière clôture horodatée d'une liste de trades (ou null).
function _behavLastClose(trades) {
  if (!Array.isArray(trades)) return null;
  for (let i = trades.length - 1; i >= 0; i--) {
    const t = trades[i];
    if (t && t.type === 'position' && typeof t.ts === 'number' && t.ts > 0) return t;
  }
  return null;
}

// Nombre d'ouvertures du jour local courant, toutes paires du wallet passé.
function _behavDayOpens(pairStates, now) {
  const d = new Date(now);
  const y = d.getFullYear(), m = d.getMonth(), j = d.getDate();
  let n = 0;
  Object.keys(pairStates || {}).forEach(function (k) {
    const tr = pairStates[k] && pairStates[k].trades;
    if (!Array.isArray(tr)) return;
    for (let i = tr.length - 1; i >= 0; i--) {
      const t = tr[i];
      if (!t || t.type !== 'open' || typeof t.ts !== 'number') continue;
      const td = new Date(t.ts);
      if (td.getFullYear() === y && td.getMonth() === m && td.getDate() === j) n++;
    }
  });
  return n;
}

// Verdict pur : {veto, reason, coolLeftMin, stakeCap, lastLossUsd, dayCount, dayCap, regime}.
function _behavVerdict(pairStates, pair, regime, now) {
  const out = { veto: false, reason: null, coolLeftMin: 0, stakeCap: 0, lastLossUsd: 0, dayCount: 0, dayCap: Infinity, regime: regime };
  const ps = pairStates && pairStates[pair];
  const last = _behavLastClose(ps && ps.trades);
  if (last && (Number(last.pnlUsdt) || 0) < 0) {
    out.lastLossUsd = Number(last.pnlUsdt) || 0;
    if ((Number(last.stakeUsdt) || 0) > 0) out.stakeCap = Number(last.stakeUsdt);
    const since = now - last.ts;
    if (since >= 0 && since < BEHAV_COOLDOWN_MS) {
      out.coolLeftMin = Math.ceil((BEHAV_COOLDOWN_MS - since) / 60000);
      out.veto = true;
      out.reason = 'Cooldown après perte · dernière clôture −$' + Math.abs(out.lastLossUsd).toFixed(2) + ' il y a ' + Math.floor(since / 60000) + ' min (15 min requis, reste ' + out.coolLeftMin + ' min)';
      return out;
    }
  }
  out.dayCap = _behavRegimeCap(regime);
  out.dayCount = _behavDayOpens(pairStates, now);
  if (out.dayCount >= out.dayCap) {
    out.veto = true;
    out.reason = 'Plafond journalier · ' + out.dayCount + ' ouverture(s) aujourd\u2019hui (régime ' + String(regime).toUpperCase() + ', max ' + out.dayCap + ')';
  }
  return out;
}

// Porte d'ouverture (consommateur unique : 09c, après le veto ECO ; plafond de mise avant l'anti-négatif).
function _behavGateForOpen(pair) {
  const regime = (typeof detectMarketRegime === 'function') ? detectMarketRegime() : 'calm';
  const pairStates = (typeof S !== 'undefined' && S && S.pairStates) ? S.pairStates : null;
  return _behavVerdict(pairStates, pair, regime, Date.now());
}
window._behavVerdict = _behavVerdict;
window._behavGateForOpen = _behavGateForOpen;
