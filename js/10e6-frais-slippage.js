// ▓▓▓ VERSION 20260906e ▓▓▓
// 10e6-frais-slippage.js — Coût aller-retour (frais taker + slippage + funding + intérêts levier)
// → gain attendu NET et expectancy NETTE de la paire → décision 09c.
// [P6 · 06/09/2026] BRIQUE 6 DU PONT ANALYTICS→DÉCISION. Module dédié (10f = 590 l., non touché).
// Ordre de chargement OBLIGATOIRE : juste après 10e5, avant 10f (dans le HTML).
// Sources VIVANTES :
//   · S.feeConfig (02, persisté au snapshot, plancher 0,10 % appliqué au chargement par 09b2) — le MÊME
//     barème que recordFees (02) facture à la clôture : taker à l'entrée, maker/taker à la sortie,
//     slippage des deux côtés. Ici : taker des deux côtés (prudent, comme estimateTradeReserve),
//     + fundingRate × 3 cycles (comme la porte 10f), + intérêts levier S.leverageBorrowRate × 3.
//   · ps.trades de S.pairStates (multiplexé PAR MODE via _activeWallet, 02) : entrées
//     {type:'position', stakeUsdt, pnlUsdt} écrites par closePosition (02) — pnlUsdt est BRUT
//     (realisedUsd avant recordFees) : l'expectancy « apprise » du système (totalPnlPct, _perfMult 10f,
//     bases solides RE) est brute de frais. Ici : expectancy NETTE = brute − coût aller-retour.
//   · Gain attendu = TP visé, MÊME formule que 10f (tpPctE) : max(0.6, conviction × 3.2 × (1 + volCV × 9)),
//     conviction = |lmsrP(ps) − 0.5| × 2 (composante LMSR seule = estimation BASSE : 09c ne connaît pas
//     effectiveConviction de 10f, la porte est donc prudente), volCV = getTechSignals(pair).raw.stddev.cv.
//   VETO  : gain attendu − coût < COST_MIN_NET_PCT (0,15 % : même exigence que 10f _minNetGain)
//   VETO  : mode RÉEL seulement, ≥ 10 clôtures RE sur la paire et expectancy nette ≤ −2 × coût
//   MISE  : ≥ 10 clôtures (du mode courant) et expectancy nette < 0 → mise ×0.5 (stakeFactor)
// Paire sans historique (< 10 clôtures) = neutre pour l'expectancy. Le veto prime sur la mise.
const COST_MIN_NET_PCT    = 0.15;
const COST_FUNDING_CYCLES = 3;
const COST_LEV_CYCLES     = 3;
const COST_EXP_TRADES     = 20;
const COST_EXP_MIN_TRADES = 10;
const COST_STAKE_FACTOR   = 0.5;
const COST_RE_VETO_MULT   = 2;
// Coût aller-retour en % de la mise propre (pure : reçoit le barème et le ratio levier/mise).
function _roundTripCostPct(fc, levRatio, levRate) {
  const f = fc || {};
  const taker = Number(f.takerRate) || 0, slip = Number(f.slippage) || 0, fund = Number(f.fundingRate) || 0;
  const lev = Math.max(0, Number(levRatio) || 0) * (Number(levRate) || 0) * COST_LEV_CYCLES;
  const pct = ((taker + slip) * 2 + fund * COST_FUNDING_CYCLES + lev) * 100;
  return Math.round(pct * 10000) / 10000;
}
// Gain attendu (%) = TP visé, formule 10f tpPctE.
function _expectedGainPct(conviction, volCV) {
  const c = Math.max(0, Math.min(1, Number(conviction) || 0));
  const v = isFinite(volCV) && volCV > 0 ? volCV : 0.015;
  return Math.round(Math.max(0.6, c * 3.2 * (1 + v * 9)) * 1000) / 1000;
}
// Expectancy NETTE (% de la mise par trade) sur les COST_EXP_TRADES dernières clôtures ; null si < COST_EXP_MIN_TRADES.
function _netExpectancyPct(trades, costPct) {
  if (!Array.isArray(trades)) return null;
  const closes = [];
  for (let i = trades.length - 1; i >= 0 && closes.length < COST_EXP_TRADES; i--) {
    const t = trades[i];
    if (t && t.type === 'position' && isFinite(t.pnlUsdt) && isFinite(t.stakeUsdt) && t.stakeUsdt > 0) closes.push(t);
  }
  if (closes.length < COST_EXP_MIN_TRADES) return null;
  let gross = 0;
  for (const t of closes) gross += (t.pnlUsdt / t.stakeUsdt) * 100;
  gross /= closes.length;
  return { n: closes.length, grossPct: Math.round(gross * 1000) / 1000, netPct: Math.round((gross - costPct) * 1000) / 1000 };
}
// Verdict pur : {veto, reason, costPct, gainPct, netGainPct, exp, stakeFactor, stakeReason}.
function _costVerdict(costPct, gainPct, exp, mode) {
  const netGain = Math.round((gainPct - costPct) * 1000) / 1000;
  const out = { veto: false, reason: null, costPct: costPct, gainPct: gainPct, netGainPct: netGain, exp: exp, stakeFactor: 1, stakeReason: null };
  if (netGain < COST_MIN_NET_PCT) {
    out.veto = true;
    out.reason = 'gain attendu ' + gainPct.toFixed(2) + ' % − coût aller-retour ' + costPct.toFixed(3) + ' % = ' + netGain.toFixed(2) + ' % net < ' + COST_MIN_NET_PCT.toFixed(2) + ' % (les frais mangent le trade)';
    return out;
  }
  if (exp && typeof exp.netPct === 'number') {
    if (mode === 'real' && exp.netPct <= -COST_RE_VETO_MULT * costPct) {
      out.veto = true;
      out.reason = 'expectancy nette RE ' + exp.netPct.toFixed(2) + ' %/trade sur ' + exp.n + ' clôtures ≤ −' + COST_RE_VETO_MULT + '× le coût ' + costPct.toFixed(3) + ' % (paire perdante nette en Réel)';
      return out;
    }
    if (exp.netPct < 0) {
      out.stakeFactor = COST_STAKE_FACTOR;
      out.stakeReason = 'expectancy nette ' + exp.netPct.toFixed(2) + ' %/trade (brute ' + (exp.grossPct >= 0 ? '+' : '') + exp.grossPct.toFixed(2) + ' % − coût ' + costPct.toFixed(3) + ' %, ' + exp.n + ' clôtures) → mise ×' + COST_STAKE_FACTOR;
    }
  }
  return out;
}
// Porte d'ouverture (consommateur unique : 09c, après le veto BETA ; mise ×0.5 avant l'anti-négatif).
// stakeUsdt = mise propre envisagée ; levBorrowed = levier envisagé (ps._leverageBonus au moment de la porte).
function _costGateForOpen(pair, stakeUsdt, levBorrowed) {
  const ps = S.pairStates && S.pairStates[pair];
  const stake = Math.max(0, Number(stakeUsdt) || 0);
  const levRatio = stake > 0 ? Math.max(0, Number(levBorrowed) || 0) / stake : 0;
  const costPct = _roundTripCostPct(S.feeConfig, levRatio, S.leverageBorrowRate);
  let volCV = null;
  try { const t = (typeof getTechSignals === 'function') ? getTechSignals(pair) : null; volCV = t && t.raw && t.raw.stddev ? t.raw.stddev.cv : null; } catch (e) { volCV = null; }
  const conviction = (ps && typeof lmsrP === 'function') ? Math.abs(lmsrP(ps) - 0.5) * 2 : 0;
  const gainPct = _expectedGainPct(conviction, volCV);
  const exp = _netExpectancyPct(ps && ps.trades, costPct);
  return _costVerdict(costPct, gainPct, exp, S.tradingMode);
}
window._roundTripCostPct = _roundTripCostPct;
window._expectedGainPct = _expectedGainPct;
window._netExpectancyPct = _netExpectancyPct;
window._costVerdict = _costVerdict;
window._costGateForOpen = _costGateForOpen;
