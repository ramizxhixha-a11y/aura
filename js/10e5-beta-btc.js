// ▓▓▓ VERSION 20260906d ▓▓▓
// 10e5-beta-btc.js — Bêta BTC des paires : mise ×0.5 si |β| > 3, veto LONG si BTC chute
// de plus de 1 % sur les 5 dernières bougies et que la paire suit BTC (β > 0.5) — décision 09c.
// [P5 · 06/09/2026] BRIQUE 5 DU PONT ANALYTICS→DÉCISION. Module dédié (10f = 590 l., non touché).
// Ordre de chargement OBLIGATOIRE : juste après 10e4, avant 10f (dans le HTML) ; dépend de
// _getPairReturns (10e, chargé avant).
// Source VIVANTE : les bougies RÉELLES Binance S.realCandles[pair][tf] (agrégées pour TOUTES les
// paires à chaque prix reçu par _aggregateRealPrice, 02 ; persistées au snapshot ; NON multiplexées :
// le marché est le même dans les 3 modes), sur la timeframe active (_getActiveRealTimeframe, 02 :
// 15m en AA, timeframe EV/RE sinon) — la même matière que la corrélation P1 (_getPairReturns, 10e :
// log-retours des 30 dernières bougies, repli sur ps.candles). Le bêta « existant » de 06
// (_calcBeta) est un affichage : nourri par le rendu (un point par passage de renderAll, prix quasi
// identiques d'un passage à l'autre, RAM seule, perdu à chaque relance) et replié sur des constantes
// théoriques (_theoreticalBeta) — il ne décide pas. Ici : β = Cov(retours paire, retours BTC) / Var(retours BTC)
// sur les mêmes 30 bougies, cache RAM 5 min par paire et par timeframe.
//   MISE  : |β| > 3          → mise ×0.5 (stakeFactor), très sensible aux mouvements BTC
//   VETO  : BTC ≤ −1 % entre la clôture d'il y a 5 bougies et le prix courant (dernière bougie en
//           cours) ET side LONG ET β > 0.5 → veto (la paire va suivre la chute)
// BTC/USDT lui-même : β = 1 par définition → soumis au veto LONG en chute, jamais à la mise ×0.5.
// Paire sans bêta mesurable (< 10 retours alignés, variance BTC nulle) = neutre. Le veto prime.
const BETA_HIGH_ABS       = 3;
const BETA_STAKE_FACTOR   = 0.5;
const BETA_DROP_PCT       = -1;
const BETA_DROP_TICKS     = 5;
const BETA_DROP_SENSITIVE = 0.5;
const BETA_CACHE_TTL_MS   = 5 * 60 * 1000;
const _BETA_BTC_PAIR      = 'BTC/USDT';
const _betaCache          = {};   // RAM : pair → { beta, ts, tf }

// Bêta pur : Cov(pair, btc) / Var(btc) sur les retours alignés par index (null si non mesurable).
function _betaOf(pairRets, btcRets) {
  if (!Array.isArray(pairRets) || !Array.isArray(btcRets)) return null;
  const n = Math.min(pairRets.length, btcRets.length);
  if (n < 10) return null;
  const a = pairRets.slice(-n), b = btcRets.slice(-n);
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += b[i]; my += a[i]; }
  mx /= n; my /= n;
  let cov = 0, varX = 0;
  for (let i = 0; i < n; i++) { cov += (b[i] - mx) * (a[i] - my); varX += (b[i] - mx) * (b[i] - mx); }
  if (!(varX > 0)) return null;
  const beta = cov / varX;
  return isFinite(beta) ? Math.round(beta * 1000) / 1000 : null;
}

// Clôtures de la paire sur la timeframe active : bougies réelles Binance, sinon bougies de la paire.
function _betaCloses(pair, tf, min) {
  let candles = null;
  if (S.realCandles && S.realCandles[pair] && S.realCandles[pair][tf] && S.realCandles[pair][tf].length >= min) {
    candles = S.realCandles[pair][tf];
  } else {
    const ps = S.pairStates && S.pairStates[pair];
    if (ps && Array.isArray(ps.candles) && ps.candles.length >= min) candles = ps.candles;
  }
  if (!candles) return null;
  const closes = candles.slice(-min).map(c => c && c.c).filter(c => isFinite(c) && c > 0);
  return closes.length >= min ? closes : null;
}

// Variation BTC (%) entre la clôture d'il y a BETA_DROP_TICKS bougies et la dernière (en cours) ; null si inconnue.
function _btcRecentMovePct(tf) {
  const closes = _betaCloses(_BETA_BTC_PAIR, tf, BETA_DROP_TICKS + 1);
  if (!closes) return null;
  const from = closes[closes.length - 1 - BETA_DROP_TICKS], to = closes[closes.length - 1];
  return Math.round((to / from - 1) * 100 * 100) / 100;
}

// Bêta de la paire vs BTC sur la timeframe active, cache RAM 5 min (null si non mesurable).
function _betaBtcForPair(pair, tf, now) {
  if (pair === _BETA_BTC_PAIR) return 1;
  const c = _betaCache[pair];
  if (c && c.tf === tf && (now - c.ts) < BETA_CACHE_TTL_MS) return c.beta;
  let beta = null;
  if (typeof _getPairReturns === 'function') {
    beta = _betaOf(_getPairReturns(pair), _getPairReturns(_BETA_BTC_PAIR));
  }
  _betaCache[pair] = { beta: beta, ts: now, tf: tf };
  return beta;
}

// Verdict pur : {veto, reason, beta, btcMovePct, stakeFactor, stakeReason, tf}.
function _betaVerdict(beta, btcMovePct, side, tf) {
  const out = { veto: false, reason: null, beta: beta, btcMovePct: btcMovePct, stakeFactor: 1, stakeReason: null, tf: tf };
  if (typeof beta !== 'number' || !isFinite(beta)) return out;
  if (typeof btcMovePct === 'number' && btcMovePct <= BETA_DROP_PCT && side === 'long' && beta > BETA_DROP_SENSITIVE) {
    out.veto = true;
    out.reason = 'BTC en chute · ' + btcMovePct.toFixed(2) + ' % sur ' + BETA_DROP_TICKS + ' bougies ' + tf + ' · β ' + beta.toFixed(2) + ' > ' + BETA_DROP_SENSITIVE.toFixed(2) + ' (la paire suit BTC) → LONG refusé';
    return out;
  }
  if (Math.abs(beta) > BETA_HIGH_ABS) {
    out.stakeFactor = BETA_STAKE_FACTOR;
    out.stakeReason = 'β ' + beta.toFixed(2) + ' (|β| > ' + BETA_HIGH_ABS + ', très sensible à BTC) → mise ×' + BETA_STAKE_FACTOR;
  }
  return out;
}

// Porte d'ouverture (consommateur unique : 09c, après le veto BEHAV ; mise ×0.5 avant l'anti-négatif).
function _betaGateForOpen(pair, side) {
  const tf = (typeof _getActiveRealTimeframe === 'function') ? _getActiveRealTimeframe() : '15m';
  const now = Date.now();
  return _betaVerdict(_betaBtcForPair(pair, tf, now), _btcRecentMovePct(tf), side, tf);
}
window._betaOf = _betaOf;
window._betaVerdict = _betaVerdict;
window._betaBtcForPair = _betaBtcForPair;
window._btcRecentMovePct = _btcRecentMovePct;
window._betaGateForOpen = _betaGateForOpen;
